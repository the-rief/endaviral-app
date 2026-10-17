#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════
 * build-pages.mjs — turns the two JS-rendered templates into one real,
 * crawlable HTML file per URL, and rewrites sitemap.xml.
 *
 *   node scripts/build-pages.mjs          (run from the endaviral-app folder)
 *
 * WHY: Google's first pass, WhatsApp/Facebook/X link previews and most
 * other crawlers do NOT run JavaScript. Before this, every buy page was
 * the same file whose raw <title>/canonical said "Buy TikTok Views", and
 * every article shared as "EndaViral Blog". Now each URL ships its own
 * title, description, canonical, Open Graph tags, JSON-LD and body text.
 *
 * HOW: runs the template's own render script against a tiny fake DOM
 * (no dependencies, no browser), then writes whatever it set back into
 * the HTML. The render script stays in the page and re-runs harmlessly
 * in the browser, so interactivity is unchanged.
 *
 * Edit content in templates/, then re-run this and commit the output.
 *   templates/seo-landing.html  → <slug>.html for every PAGE_VARIANTS key
 *   templates/blog.html         → blog.html + <slug>.html for every ARTICLE
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://endaviral.co.ke';
const VOID = new Set(['meta', 'link', 'img', 'input', 'br', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'title', 'textarea']);

/* ─── Locating elements in raw HTML ──────────────────────────────────── */

function locate(html, openRe) {
  openRe.lastIndex = 0;
  const m = openRe.exec(html);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const openStart = m.index;
  const openEnd = m.index + m[0].length;
  if (VOID.has(tag)) return { tag, openStart, openEnd, innerStart: openEnd, innerEnd: openEnd, isVoid: true };
  if (RAW_TEXT.has(tag)) {
    const close = html.toLowerCase().indexOf(`</${tag}`, openEnd);
    if (close < 0) throw new Error(`Unclosed <${tag}>`);
    return { tag, openStart, openEnd, innerStart: openEnd, innerEnd: close };
  }
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tagRe.lastIndex = openEnd;
  let depth = 1, t;
  while ((t = tagRe.exec(html))) {
    if (t[1]) depth--; else if (!t[0].endsWith('/>')) depth++;
    if (depth === 0) return { tag, openStart, openEnd, innerStart: openEnd, innerEnd: t.index };
  }
  throw new Error(`Unclosed <${tag}> at ${openStart}`);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function setAttrInTag(openTag, name, value) {
  const re = new RegExp(`(\\s${reEsc(name)}\\s*=\\s*)("[^"]*"|'[^']*')`, 'i');
  if (re.test(openTag)) return openTag.replace(re, `$1"${escAttr(value)}"`);
  return openTag.replace(/\s*(\/?)>$/, ` ${name}="${escAttr(value)}"$1>`);
}

function setStyleProp(openTag, prop, value) {
  const m = openTag.match(/\sstyle\s*=\s*"([^"]*)"/i);
  const decls = (m ? m[1] : '').split(';').map(d => d.trim()).filter(Boolean)
    .filter(d => d.split(':')[0].trim().toLowerCase() !== prop);
  if (value !== '' && value != null) decls.unshift(`${prop}:${value}`);
  return setAttrInTag(openTag, 'style', decls.join(';') + (decls.length ? ';' : ''));
}

/* ─── Fake DOM: records what the render script sets ──────────────────── */

class FakeEl {
  constructor(html, loc) {
    this._html = html; this._loc = loc;
    this._inner = undefined; this._attrs = {}; this._styles = {};
    const self = this;
    this.style = new Proxy({}, {
      get: (_, k) => self._styles[k] ?? '',
      set: (_, k, v) => { self._styles[k] = String(v); return true; },
    });
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    this.dataset = {};
  }
  get _original() { return this._html.slice(this._loc.innerStart, this._loc.innerEnd); }
  get innerHTML() { return this._inner ?? this._original; }
  set innerHTML(v) { this._inner = String(v); }
  get textContent() { return this._inner ?? this._original; }
  set textContent(v) {
    v = String(v);
    this._inner = this._loc.tag === 'script' ? v.replace(/<\/script/gi, '<\\/script') : esc(v);
  }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) {
    if (k in this._attrs) return this._attrs[k];
    const m = this._html.slice(this._loc.openStart, this._loc.openEnd).match(new RegExp(`\\s${reEsc(k)}\\s*=\\s*"([^"]*)"`, 'i'));
    return m ? m[1] : null;
  }
  set href(v) { this.setAttribute('href', v); }
  get href() { return this.getAttribute('href'); }
  set content(v) { this.setAttribute('content', v); }
  get content() { return this.getAttribute('content'); }
  addEventListener() {}
  appendChild() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  scrollIntoView() {}

  edits() {
    const out = [];
    const L = this._loc;
    if (Object.keys(this._attrs).length || Object.keys(this._styles).length) {
      let open = this._html.slice(L.openStart, L.openEnd);
      for (const [k, v] of Object.entries(this._attrs)) open = setAttrInTag(open, k, v);
      for (const [k, v] of Object.entries(this._styles)) open = setStyleProp(open, k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), v);
      out.push({ start: L.openStart, end: L.openEnd, text: open });
    }
    if (this._inner !== undefined && !L.isVoid) out.push({ start: L.innerStart, end: L.innerEnd, text: this._inner });
    return out;
  }
}

function makeDocument(html) {
  const byKey = new Map();
  const get = (key, re) => {
    if (byKey.has(key)) return byKey.get(key);
    const loc = locate(html, re);
    const el = loc ? new FakeEl(html, loc) : null;
    byKey.set(key, el);
    return el;
  };
  const doc = {
    referrer: '',
    readyState: 'complete',
    body: new FakeEl(html, { tag: 'body', openStart: 0, openEnd: 0, innerStart: 0, innerEnd: 0, isVoid: true }),
    getElementById: id => get('#' + id, new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\sid=["']${reEsc(id)}["'][^>]*>`, 'g')),
    querySelector(sel) {
      const m = sel.match(/^([a-z0-9]+)\[([a-z-]+)=["']([^"']+)["']\]$/i);
      if (!m) return null;
      return get(sel, new RegExp(`<(${m[1]})\\b[^>]*\\s${reEsc(m[2])}=["']${reEsc(m[3])}["'][^>]*>`, 'gi'));
    },
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => new FakeEl('', { tag: 'div', openStart: 0, openEnd: 0, innerStart: 0, innerEnd: 0, isVoid: true }),
  };
  Object.defineProperty(doc, 'title', {
    get: () => get('<title>', /<(title)\b[^>]*>/gi)?.textContent ?? '',
    set: v => { get('<title>', /<(title)\b[^>]*>/gi).textContent = v; },
  });
  return { doc, all: () => [...byKey.values()].filter(Boolean) };
}

/* ─── Render one URL ─────────────────────────────────────────────────── */

function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\ssrc=/.test(m[1]) || /application\/ld\+json/.test(m[1])) continue;
    out.push(m[2]);
  }
  return out;
}

function render(templateHtml, pathname, extract) {
  const { doc, all } = makeDocument(templateHtml);
  let redirectedTo = null;
  const location = {
    pathname, search: '', hash: '', origin: SITE,
    get href() { return SITE + pathname; },
    set href(v) { redirectedTo = v; },
  };
  const sandbox = {
    document: doc, location, console,
    URLSearchParams, URL, JSON, Date, Math, Object, Array, String, Number,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'build-pages' },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const code of inlineScripts(templateHtml)) {
    try { vm.runInContext(code, ctx, { filename: pathname }); }
    catch (e) { throw new Error(`Render script failed for ${pathname}: ${e.message}`); }
  }
  if (redirectedTo) throw new Error(`${pathname} redirected to ${redirectedTo} (unknown slug?)`);
  const extracted = extract ? vm.runInContext(extract, ctx) : null;

  const edits = all().flatMap(el => el.edits()).sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++) {
    if (edits[i].end > edits[i - 1].start) throw new Error(`Overlapping edits while rendering ${pathname}`);
  }
  let html = templateHtml;
  for (const e of edits) html = html.slice(0, e.start) + e.text + html.slice(e.end);
  // Drop alternate views the render left hidden (e.g. the blog index markup
  // on an article page) so each file has one H1 and no dead template text.
  for (;;) {
    const loc = locate(html, /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\sdata-build-drop-if-hidden\b[^>]*>/g);
    if (!loc) break;
    const open = html.slice(loc.openStart, loc.openEnd);
    const hidden = /display\s*:\s*none/i.test(open);
    html = hidden
      ? html.slice(0, loc.openStart) + html.slice(html.indexOf('>', loc.innerEnd) + 1)
      : html.slice(0, loc.openStart) + open.replace(/\sdata-build-drop-if-hidden\b/, '') + html.slice(loc.openEnd);
  }
  html = html.replace(/<!DOCTYPE html>/i, '<!DOCTYPE html>\n<!-- GENERATED by scripts/build-pages.mjs from templates/ — edit the template, not this file -->');
  return { html, extracted };
}

/* ─── Build ──────────────────────────────────────────────────────────── */

const written = [];
function write(file, html) {
  const p = path.join(ROOT, file);
  const before = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  fs.writeFileSync(p, html);
  written.push({ file, changed: before !== html });
}

const seoTpl = fs.readFileSync(path.join(ROOT, 'templates/seo-landing.html'), 'utf8');
const { extracted: seoSlugs } = render(seoTpl, '/buy-tiktok-views-kenya', 'Object.keys(PAGE_VARIANTS)');
for (const slug of seoSlugs) write(`${slug}.html`, render(seoTpl, '/' + slug).html);

const blogTpl = fs.readFileSync(path.join(ROOT, 'templates/blog.html'), 'utf8');
const { html: blogIndex, extracted: articles } = render(blogTpl, '/blog',
  'ARTICLES.map(a => ({ slug: a.slug, updated: a.updated || a.published || null }))');
write('blog.html', blogIndex);
for (const a of articles) write(`${a.slug}.html`, render(blogTpl, '/' + a.slug).html);

/* ─── sitemap.xml — keeps the old lastmod for pages whose HTML didn't change ── */

const sitemapPath = path.join(ROOT, 'sitemap.xml');
const prevLastmod = {};
if (fs.existsSync(sitemapPath)) {
  for (const m of fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) prevLastmod[m[1]] = m[2];
}
const today = new Date().toISOString().slice(0, 10);
const changed = Object.fromEntries(written.map(w => [w.file, w.changed]));
const lastmodFor = (loc, file, fallback) => (changed[file] || !prevLastmod[loc]) ? (fallback || today) : prevLastmod[loc];
const entry = (loc, lastmod, freq, prio) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;

const homeLoc = `${SITE}/`;
const urls = [
  '  <!-- ── Core ── -->',
  entry(homeLoc, prevLastmod[homeLoc] || today, 'weekly', '1.0'),
  '  <!-- ── Service + Hire EndaViral pages ── -->',
  ...seoSlugs.map(s => entry(`${SITE}/${s}`, lastmodFor(`${SITE}/${s}`, `${s}.html`), 'weekly', '0.9')),
  '  <!-- ── Blog ── -->',
  entry(`${SITE}/blog`, lastmodFor(`${SITE}/blog`, 'blog.html'), 'weekly', '0.8'),
  ...articles.map(a => entry(`${SITE}/${a.slug}`, lastmodFor(`${SITE}/${a.slug}`, `${a.slug}.html`, changed[`${a.slug}.html`] ? (a.updated && a.updated > (prevLastmod[`${SITE}/${a.slug}`] || '') ? a.updated : today) : null), 'monthly', '0.8')),
];
fs.writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<!-- GENERATED by scripts/build-pages.mjs -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${urls.join('\n')}\n\n</urlset>\n`);

const nChanged = written.filter(w => w.changed).length;
console.log(`Built ${written.length} pages (${nChanged} changed) + sitemap.xml`);
for (const w of written) console.log(`  ${w.changed ? '✎' : '·'} ${w.file}`);
