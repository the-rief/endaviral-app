/* ════════════════════════════════════════════════════════════════════════
 * academy-pages.mjs — publishes the FREE Creator Academy lessons as public,
 * crawlable, shareable pages (called by build-pages.mjs, which also adds
 * them to sitemap.xml):
 *
 *   /learn                       learn.html                 hub: every course
 *   /learn/<course>              learn/<course>.html        course page
 *   /learn/<course>/<lesson>     learn/<course>/<lesson>.html
 *
 * Source of truth is ACADEMY_MODULES in academy.js — edit lessons there and
 * re-run `node scripts/build-pages.mjs`. Premium modules are listed on the hub
 * (title + blurb + price only) but their lesson text is never published.
 *
 * Lesson URLs are built from lesson titles. Renaming a lesson changes its URL,
 * so add a 301 to _redirects if you rename one that's already indexed.
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const COURSE_SLUG = {
  basics: 'endaviral-basics', ig: 'instagram', tiktok: 'tiktok', yt: 'youtube',
  other: 'facebook-x-telegram', safety: 'account-safety', rules: 'platform-rules',
  rescue: 'account-rescue', fundamentals: 'marketing-fundamentals', business: 'business',
  shorts: 'short-form-video', ai_content: 'ai-content', capcut: 'capcut', canva: 'canva',
  branding: 'personal-branding',
};
// Hub display order: most searched / most shareable first.
const ORDER = ['tiktok', 'ig', 'yt', 'rescue', 'rules', 'business', 'other', 'shorts', 'fundamentals',
  'branding', 'ai_content', 'capcut', 'canva', 'safety', 'basics'];
const SERVICE_PAGE = {
  tiktok: '/buy-tiktok-followers-kenya', instagram: '/buy-instagram-followers-kenya',
  youtube: '/buy-youtube-watch-hours-kenya', telegram: '/telegram-members-kenya',
  facebook: '/buy-facebook-page-likes-kenya',
};
const PUBLISHED = '2026-11-01';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plain = s => String(s ?? '').replace(/\*\*/g, '');
const slugify = s => plain(s).toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .split('-').reduce((acc, w) => (acc && (acc + '-' + w).length > 72 ? acc : (acc ? acc + '-' + w : w)), '');
const clip = (s, n) => { s = plain(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };

function findMatching(s, i) {
  const stack = [s[i]];
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') {
      for (j++; s[j] !== c; j++) if (s[j] === '\\') j++;
    } else if (s.startsWith('//', j)) j = s.indexOf('\n', j);
    else if (s.startsWith('/*', j)) j = s.indexOf('*/', j) + 1;
    else if (c === '[' || c === '{') stack.push(c);
    else if (c === ']' || c === '}') { stack.pop(); if (!stack.length) return j; }
  }
  throw new Error('unbalanced ACADEMY_MODULES');
}

function loadModules(root) {
  const src = fs.readFileSync(path.join(root, 'academy.js'), 'utf8');
  const start = src.indexOf('[', src.indexOf('const ACADEMY_MODULES = ['));
  const arr = src.slice(start, findMatching(src, start) + 1);
  const ctx = vm.createContext({ ACADEMY_PREMIUM_PRICE_KES: 50, ACADEMY_BUSINESS_PRO_PRICE_KES: 150, ACADEMY_BRAND_PRICING_PRO_PRICE_KES: 200 });
  return vm.runInContext('(' + arr + ')', ctx);
}

/* ─── Block → static HTML ───────────────────────────────────────────── */
function renderBlocks(body, ctx) {
  let qi = 0, ti = 0;
  return body.map(b => {
    switch (b.type) {
      case 'p': return `<p>${inline(b.text)}</p>`;
      case 'h3': return `<h2>${inline(b.text)}</h2>`;
      case 'hook': return `<p class="l-hook">${inline(b.text)}</p>`;
      case 'ul': return `<ul>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
      case 'ol': return `<ol>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`;
      case 'callout': return `<div class="l-box l-callout">${b.label ? `<div class="l-lb">${esc(b.label)}</div>` : ''}<p>${inline(b.text)}</p></div>`;
      case 'insight': return `<div class="l-box l-insight"><div class="l-lb">💡 ${esc(b.label || 'What most creators miss')}</div><p>${inline(b.text)}</p></div>`;
      case 'stat': return `<div class="l-stat"><div class="l-stat-v">${esc(b.value)}</div><div class="l-stat-l">${inline(b.label)}</div></div>`;
      case 'myth': return `<div class="l-myth"><div class="l-myth-r bad"><span>✗ MYTH</span><p>${inline(b.myth)}</p></div><div class="l-myth-r good"><span>✓ REALITY</span><p>${inline(b.truth)}</p></div></div>`;
      case 'table': return `<div class="l-tbl"><table><thead><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      case 'template': { const id = `tpl${ti++}`; return `<div class="l-tpl"><div class="l-tpl-hd"><span>📋 ${esc(b.label || 'Template')}</span><button type="button" data-copy="${id}">Copy</button></div><pre id="${id}">${esc(b.text)}</pre></div>`; }
      case 'action': return `<div class="l-box l-action"><div class="l-lb">✅ ${esc(b.label || 'Do this today')}</div>${b.items.map(i => `<label><input type="checkbox"><span>${inline(i)}</span></label>`).join('')}</div>`;
      case 'takeaways': return `<div class="l-box l-take"><div class="l-lb">🧠 Key takeaways</div><ol>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ol></div>`;
      case 'quiz': { const id = `q${qi++}`; return `<div class="l-quiz" id="${id}" data-answer="${b.answer}"><div class="l-lb">⚡ Quick check</div><p class="l-quiz-q">${inline(b.q)}</p>${b.options.map((o, i) => `<button type="button" data-q="${id}" data-i="${i}"><b>${'ABCD'[i]}</b><span>${inline(o)}</span></button>`).join('')}<p class="l-quiz-ex" hidden>${inline(b.explain)}</p></div>`; }
      case 'sources': return `<div class="l-src"><div class="l-lb">📚 Sources</div><ul>${b.items.filter(x => /^https?:\/\//.test(x.url)).map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${esc(x.title)}</a></li>`).join('')}</ul></div>`;
      case 'service': {
        const href = SERVICE_PAGE[b.platform] || '/';
        return `<div class="l-box l-svc"><div class="l-lb">🚀 EndaViral growth</div><p><strong>${esc(b.label)}</strong></p><p>${inline(b.text)}</p><a class="l-btn" href="${href}">${esc(b.cta || 'See options')} →</a><p class="l-small">Works best as social proof on content you're proud of. Bought numbers don't count toward monetisation, so keep them out of brand pitches.</p></div>`;
      }
      case 'locked': {
        const pm = ctx.modules.find(m => m.id === b.module);
        if (!pm) return '';
        return `<div class="l-locked"><div class="l-lb">💎 Go deeper — premium course</div><p class="l-locked-t">${esc(pm.icon)} ${esc(pm.title)}</p><p>${inline(b.text)}</p><ul>${b.items.map(i => `<li>🔒 ${inline(i)}</li>`).join('')}</ul><a class="l-btn gold" href="/?go=academy&amp;m=${esc(pm.id)}">Read lesson 1 free in the app →</a><p class="l-small">Full course from KSh ${pm.priceKes || 50}, paid once via M-Pesa or with your loyalty points.</p></div>`;
      }
      default: return '';
    }
  }).join('\n');
}

/* ─── Page shell ────────────────────────────────────────────────────── */
const CSS = `
:root{--black:#0d1117;--navy:#131b27;--card:#1a2435;--border:#243048;--green:#3dd44a;--green2:#28a035;--white:#f0f4ff;--muted:#8a9dba;--gold:#ffd700;--purple:#9b6bff;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--black);color:var(--white);font-family:'Montserrat',system-ui,sans-serif;line-height:1.7;overflow-x:hidden;}
a{color:var(--green);}
.top{background:linear-gradient(90deg,#0d3b1a,#1a5c2a,#0d3b1a);text-align:center;padding:9px 5%;font-size:12.5px;font-weight:600;color:#a8f0b4;}
.top a{color:#3dd44a;margin-left:6px;}
nav.n{position:sticky;top:0;z-index:50;background:rgba(13,17,23,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(61,212,74,.12);padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:62px;gap:12px;}
.n-logo{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--white);font-weight:800;}
.n-logo img{height:32px;} .n-logo em{color:var(--green);font-style:normal;}
.n-links{display:flex;gap:4px;} .n-links a{padding:7px 13px;color:var(--muted);font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;}
.n-links a.on,.n-links a:hover{color:var(--white);background:rgba(61,212,74,.1);}
.n-cta{padding:9px 18px;background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;white-space:nowrap;}
.hero{background:linear-gradient(135deg,#0a1628 0%,#0f2040 40%,#091a10 75%,#0d2b18 100%);padding:44px 5% 40px;}
.hero-in{max-width:1100px;margin:0 auto;}
.bc{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:16px;display:flex;flex-wrap:wrap;gap:6px;}
.bc a{color:var(--muted);text-decoration:none;} .bc a:hover{color:var(--green);}
.tag{display:inline-block;background:rgba(61,212,74,.12);border:1px solid rgba(61,212,74,.25);color:#6efb7a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:30px;margin-bottom:14px;}
h1{font-size:clamp(26px,4.2vw,44px);font-weight:900;line-height:1.15;letter-spacing:-1px;color:#fff;margin-bottom:12px;}
.meta{font-size:13px;color:var(--muted);font-weight:600;}
.share{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;align-items:center;}
.share span{font-size:12px;color:var(--muted);font-weight:700;margin-right:2px;}
.share a,.share button{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:9px;text-decoration:none;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--white);cursor:pointer;}
.share .wa{background:#1f8f4e;border-color:#1f8f4e;color:#fff;}
.wrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:44px;max-width:1100px;margin:0 auto;padding:40px 5% 30px;}
article{font-size:16px;color:rgba(240,244,255,.88);min-width:0;}
article h2{font-size:clamp(19px,2.4vw,24px);font-weight:800;color:#fff;margin:36px 0 12px;padding-left:13px;border-left:3px solid var(--green);line-height:1.3;}
article p{margin-bottom:16px;} article ul,article ol{padding-left:22px;margin-bottom:18px;} article li{margin-bottom:8px;}
article strong{color:#fff;}
.l-hook{font-size:19px;font-weight:800;line-height:1.5;color:#fff;border-left:4px solid var(--purple);padding-left:16px;}
.l-box{border-radius:14px;padding:16px 18px;margin:22px 0;border:1px solid var(--border);background:var(--card);}
.l-box p:last-child{margin-bottom:0;}
.l-lb{font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;margin-bottom:8px;color:var(--green);}
.l-insight{background:linear-gradient(135deg,rgba(155,107,255,.16),rgba(155,107,255,.04));border-color:rgba(155,107,255,.4);} .l-insight .l-lb{color:#c4a8ff;}
.l-callout{border-left:3px solid var(--green);}
.l-stat{display:flex;gap:16px;align-items:center;margin:22px 0;padding:16px 18px;border-radius:14px;background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.3);}
.l-stat-v{font-size:30px;font-weight:900;color:var(--gold);line-height:1.1;flex-shrink:0;max-width:45%;}
.l-stat-l{font-size:14px;color:#e6dcc0;line-height:1.55;}
.l-myth{margin:22px 0;border:1px solid var(--border);border-radius:14px;overflow:hidden;}
.l-myth-r{display:flex;gap:12px;padding:13px 16px;align-items:flex-start;} .l-myth-r p{margin:0;font-size:15px;}
.l-myth-r span{flex-shrink:0;font-size:10.5px;font-weight:900;letter-spacing:.6px;padding:3px 8px;border-radius:6px;margin-top:3px;}
.l-myth-r.bad{background:rgba(255,92,92,.08);} .l-myth-r.bad span{background:rgba(255,92,92,.2);color:#ff8a8a;}
.l-myth-r.good{background:rgba(61,212,74,.07);border-top:1px solid var(--border);} .l-myth-r.good span{background:rgba(61,212,74,.2);color:var(--green);}
.l-tbl{overflow-x:auto;margin:22px 0;border:1px solid var(--border);border-radius:12px;}
.l-tbl table{width:100%;border-collapse:collapse;min-width:480px;font-size:14px;}
.l-tbl th{text-align:left;padding:10px 12px;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);}
.l-tbl td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5;}
.l-tbl tr:last-child td{border-bottom:none;}
.l-tpl{margin:22px 0;border:1px solid rgba(155,107,255,.35);border-radius:12px;overflow:hidden;background:rgba(155,107,255,.06);}
.l-tpl-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 13px;border-bottom:1px solid rgba(155,107,255,.25);font-size:12.5px;font-weight:800;color:#c4a8ff;}
.l-tpl-hd button{background:var(--purple);color:#fff;border:none;border-radius:8px;padding:6px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}
.l-tpl pre{padding:13px;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;line-height:1.6;color:var(--white);}
.l-action{background:rgba(61,212,74,.06);border-color:rgba(61,212,74,.3);}
.l-action label{display:flex;gap:10px;align-items:flex-start;padding:5px 0;font-size:15px;cursor:pointer;}
.l-action input{margin-top:6px;accent-color:#3dd44a;width:16px;height:16px;flex-shrink:0;}
.l-action input:checked+span{color:var(--muted);text-decoration:line-through;}
.l-take ol{margin:0;}
.l-quiz{margin:26px 0;padding:18px;border-radius:14px;background:rgba(0,180,255,.06);border:1px solid rgba(0,180,255,.32);}
.l-quiz .l-lb{color:#5cc8ff;} .l-quiz-q{font-weight:800;color:#fff;font-size:16.5px;}
.l-quiz button{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;color:var(--white);font:inherit;font-size:14.5px;line-height:1.5;cursor:pointer;}
.l-quiz button b{flex-shrink:0;width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.08);font-size:11.5px;display:flex;align-items:center;justify-content:center;}
.l-quiz button.ok{border-color:var(--green);background:rgba(61,212,74,.12);} .l-quiz button.bad{border-color:#ff7a7a;background:rgba(255,92,92,.1);}
.l-quiz-ex{margin-top:8px;font-size:14.5px;}
.l-src{margin:30px 0 10px;font-size:13.5px;} .l-src .l-lb{color:var(--muted);} .l-src a{color:#7fb8ff;word-break:break-word;}
.l-locked{margin:28px 0;padding:20px;border-radius:16px;background:linear-gradient(140deg,rgba(255,215,0,.13),rgba(155,107,255,.08));border:1px solid rgba(255,215,0,.45);}
.l-locked .l-lb{color:var(--gold);} .l-locked-t{font-size:18px;font-weight:900;color:#fff;margin-bottom:6px;}
.l-locked ul{list-style:none;padding:0;} .l-locked li{margin-bottom:6px;}
.l-svc{background:linear-gradient(135deg,rgba(61,212,74,.12),rgba(61,212,74,.03));border-color:rgba(61,212,74,.4);}
.l-btn{display:inline-block;margin-top:6px;background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;font-weight:800;font-size:14.5px;padding:12px 20px;border-radius:10px;text-decoration:none;}
.l-btn.gold{background:var(--gold);color:#000;}
.l-small{font-size:12px;color:var(--muted);margin-top:8px;}
.pn{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:34px 0 10px;}
.pn a{display:block;padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:var(--card);text-decoration:none;color:var(--white);font-size:14px;font-weight:700;line-height:1.4;}
.pn a small{display:block;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.pn a.next{text-align:right;border-color:rgba(61,212,74,.4);}
.app-cta{margin:30px 0;padding:22px;border-radius:16px;text-align:center;background:linear-gradient(135deg,#0a1628,#0d2b18);border:1px solid rgba(61,212,74,.3);}
.app-cta h3{font-size:20px;font-weight:900;color:#fff;margin-bottom:6px;} .app-cta p{color:var(--muted);font-size:14.5px;margin-bottom:12px;}
aside .card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:20px;}
aside h4{font-size:11.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1.3px;margin-bottom:12px;}
aside .ls a{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);text-decoration:none;color:var(--white);font-size:13.5px;line-height:1.4;}
aside .ls a:last-child{border-bottom:none;} aside .ls a b{flex-shrink:0;width:22px;height:22px;border-radius:7px;background:var(--navy);color:var(--muted);font-size:11px;display:flex;align-items:center;justify-content:center;}
aside .ls a.cur{color:var(--green);} aside .ls a.cur b{background:rgba(61,212,74,.18);color:var(--green);}
aside .cta{background:linear-gradient(135deg,#0a2010,#0d3b1a);border-color:rgba(61,212,74,.3);}
aside .cta p{font-size:13.5px;color:var(--muted);margin-bottom:12px;} aside .cta strong{color:#fff;font-size:16px;display:block;margin-bottom:4px;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;max-width:1100px;margin:0 auto;padding:36px 5%;}
.cc{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;text-decoration:none;color:var(--white);display:flex;flex-direction:column;}
.cc:hover{border-color:rgba(61,212,74,.4);}
.cc .ic{font-size:30px;margin-bottom:8px;} .cc h2,.cc h3{font-size:18px;font-weight:800;color:#fff;margin-bottom:6px;line-height:1.3;}
.cc p{font-size:13.5px;color:var(--muted);margin-bottom:12px;flex:1;} .cc .go{font-size:13px;font-weight:800;color:var(--green);}
.cc.prem{border-color:rgba(255,215,0,.35);} .cc.prem .go{color:var(--gold);}
.sec-h{max-width:1100px;margin:10px auto 0;padding:0 5%;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}
.lesson-list{max-width:820px;margin:0 auto;padding:30px 5%;}
.lesson-list a{display:flex;gap:14px;padding:16px;margin-bottom:12px;border:1px solid var(--border);border-radius:14px;background:var(--card);text-decoration:none;color:var(--white);}
.lesson-list a b{flex-shrink:0;width:30px;height:30px;border-radius:9px;background:rgba(61,212,74,.14);color:var(--green);display:flex;align-items:center;justify-content:center;font-size:13px;}
.lesson-list a strong{display:block;font-size:15.5px;line-height:1.35;} .lesson-list a span{font-size:13px;color:var(--muted);}
footer{background:var(--navy);border-top:1px solid var(--border);padding:32px 5%;text-align:center;font-size:13px;color:var(--muted);margin-top:40px;}
footer a{color:var(--green);text-decoration:none;}
@media(max-width:900px){.wrap{grid-template-columns:1fr;gap:10px;}.n-links{display:none;}}
@media(max-width:560px){.pn{grid-template-columns:1fr;}.l-stat{flex-direction:column;align-items:flex-start;gap:6px;}.l-stat-v{max-width:none;font-size:26px;}article{font-size:15.5px;}.l-hook{font-size:17px;}.hero{padding:30px 5%;}.n-cta{padding:8px 12px;font-size:12px;}}
`;

const JS = `
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-q]');
  if(b){var box=document.getElementById(b.dataset.q);if(!box||box.dataset.done)return;box.dataset.done=1;
    var a=+box.dataset.answer,i=+b.dataset.i;box.querySelectorAll('button').forEach(function(x,k){x.disabled=true;if(k===a)x.classList.add('ok');else if(k===i)x.classList.add('bad');});
    var ex=box.querySelector('.l-quiz-ex');ex.hidden=false;ex.insertAdjacentHTML('afterbegin','<strong style="color:'+(i===a?'#3dd44a':'#ffb347')+'">'+(i===a?'✓ Spot on. ':'✗ Not quite. ')+'</strong>');return;}
  var c=e.target.closest('[data-copy]');
  if(c){var t=document.getElementById(c.dataset.copy).innerText;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){c.textContent='Copied ✓';setTimeout(function(){c.textContent='Copy'},1800)},function(){});return;}
  var s=e.target.closest('[data-share]');
  if(s){var u=location.href.split('#')[0],ti=document.title;
    if(s.dataset.share==='native'&&navigator.share){navigator.share({title:ti,url:u}).catch(function(){});}
    else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){s.textContent='Link copied ✓'});}}
});
if(!navigator.share){document.querySelectorAll('[data-share="native"]').forEach(function(x){x.style.display='none'});}
`;

function shareBar(url, text) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  return `<div class="share"><span>Share:</span>
    <a class="wa" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://x.com/intent/post?text=${t}&amp;url=${u}" target="_blank" rel="noopener">X</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a>
    <a href="https://t.me/share/url?url=${u}&amp;text=${t}" target="_blank" rel="noopener">Telegram</a>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener">LinkedIn</a>
    <button type="button" data-share="native">Share…</button>
    <button type="button" data-share="copy">Copy link</button></div>`;
}

function page({ title, desc, url, keywords, schemas, body, ogType = 'article' }) {
  return `<!DOCTYPE html>
<!-- GENERATED by scripts/build-pages.mjs (academy-pages.mjs) from academy.js — edit lessons there, not this file -->
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="keywords" content="${esc(keywords)}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<meta name="author" content="EndaViral"/>
<meta name="theme-color" content="#3dd44a"/>
<meta name="geo.region" content="KE"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="${ogType}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="https://endaviral.co.ke/og-image.jpg"/>
<meta property="og:locale" content="en_KE"/>
<meta property="og:site_name" content="EndaViral"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="https://endaviral.co.ke/og-image.jpg"/>
<link rel="icon" type="image/png" href="/EndaViral_logo_transparent.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
${schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n')}
<style>${CSS}</style>
</head>
<body>
<div class="top">🎓 Free Creator Academy — learn, earn points &amp; get certificates<a href="/?go=academy">Start free →</a></div>
<nav class="n">
  <a href="/" class="n-logo"><img src="/EndaViral_logo_transparent.png" alt="EndaViral"/><span>Enda<em>Viral</em></span></a>
  <div class="n-links"><a href="/">Home</a><a href="/learn" class="on">Free Academy</a><a href="/blog">Blog</a><a href="/#services">Services</a><a href="/#hire-endaviral">Hire Us</a></div>
  <a href="/?go=academy" class="n-cta">Join free →</a>
</nav>
${body}
<footer><p>© 2026 <a href="/">EndaViral</a> — Kenya's creator growth platform · <a href="/learn">Free Academy</a> · <a href="/blog">Blog</a></p></footer>
<script>${JS}</script>
</body>
</html>`;
}

/* ─── Build ─────────────────────────────────────────────────────────── */
export function buildAcademyPages({ root, site, write }) {
  const modules = loadModules(root);
  const free = ORDER.map(id => modules.find(m => m.id === id && !m.premium)).filter(Boolean);
  const missing = modules.filter(m => !m.premium && !COURSE_SLUG[m.id]);
  if (missing.length) throw new Error('academy-pages: add a COURSE_SLUG for ' + missing.map(m => m.id).join(', '));
  const premium = modules.filter(m => m.premium);
  const out = [];
  const totalLessons = free.reduce((n, m) => n + m.lessons.length, 0);
  const org = { '@type': 'Organization', name: 'EndaViral', url: site, logo: `${site}/EndaViral_logo_transparent.png` };

  const lessonUrl = (m, l) => `${site}/learn/${COURSE_SLUG[m.id]}/${slugify(l.title)}`;
  const courseUrl = m => `${site}/learn/${COURSE_SLUG[m.id]}`;
  const firstText = l => (l.body.find(b => b.type === 'hook') || l.body.find(b => b.type === 'p') || {}).text || l.title;

  // uniqueness check for lesson slugs
  const seen = new Set();
  for (const m of free) for (const l of m.lessons) {
    const u = lessonUrl(m, l);
    if (seen.has(u)) throw new Error('duplicate lesson URL ' + u);
    seen.add(u);
  }

  /* Lessons */
  for (const m of free) {
    m.lessons.forEach((l, i) => {
      const url = lessonUrl(m, l);
      const hook = firstText(l);
      const title = `${plain(l.title)} | ${m.title} — Free EndaViral Academy`;
      const desc = clip(hook, 158);
      const prev = m.lessons[i - 1], next = m.lessons[i + 1];
      const nextCourse = !next ? free[(free.indexOf(m) + 1) % free.length] : null;
      const quizzes = l.body.filter(b => b.type === 'quiz');
      const sources = (l.body.find(b => b.type === 'sources') || {}).items || [];
      const shareText = `${plain(l.title)} — free lesson for Kenyan creators 👇`;
      const body = `
<header class="hero"><div class="hero-in" style="max-width:820px;">
  <div class="bc"><a href="/">Home</a>›<a href="/learn">Free Academy</a>›<a href="${courseUrl(m)}">${esc(m.title)}</a>›<span>Lesson ${i + 1}</span></div>
  <div class="tag">${esc(m.icon)} ${esc(m.title)} · Lesson ${i + 1} of ${m.lessons.length}</div>
  <h1>${esc(plain(l.title))}</h1>
  <div class="meta">${l.minutes} min read · Updated November 2026 · Free · Written for Kenya</div>
  ${shareBar(url, shareText)}
</div></header>
<div class="wrap">
  <article>
${renderBlocks(l.body, { modules })}
    <div class="app-cta"><h3>Get points, a certificate &amp; answers to your questions</h3><p>Do this lesson inside the free EndaViral app to track your progress, keep a learning streak, earn reward points and ask our team questions in the lesson's discussion.</p><a class="l-btn" href="/?go=academy&amp;m=${m.id}&amp;l=${l.id}">Continue in the app — free →</a></div>
    <p style="font-size:14px;color:var(--muted);">Found this useful? Send it to one creator or business owner who needs it.</p>
    ${shareBar(url, shareText)}
    <div class="pn">
      ${prev ? `<a href="${lessonUrl(m, prev)}"><small>← Previous lesson</small>${esc(plain(prev.title))}</a>` : `<a href="${courseUrl(m)}"><small>← Course overview</small>${esc(m.title)}</a>`}
      ${next ? `<a class="next" href="${lessonUrl(m, next)}"><small>Next lesson →</small>${esc(plain(next.title))}</a>` : `<a class="next" href="${courseUrl(nextCourse)}"><small>Next course →</small>${esc(nextCourse.icon)} ${esc(nextCourse.title)}</a>`}
    </div>
  </article>
  <aside>
    <div class="card"><h4>${esc(m.icon)} ${esc(m.title)}</h4><div class="ls">${m.lessons.map((x, k) => `<a href="${lessonUrl(m, x)}"${x === l ? ' class="cur" aria-current="page"' : ''}><b>${k + 1}</b><span>${esc(plain(x.title))}</span></a>`).join('')}</div></div>
    <div class="card cta"><strong>🎓 ${totalLessons} free lessons</strong><p>Track progress, earn points you can spend on premium courses, and get a shareable certificate for every course you finish.</p><a class="l-btn" href="/?go=academy">Join the Academy free →</a></div>
    <div class="card"><h4>More free courses</h4><div class="ls">${free.filter(x => x !== m).slice(0, 6).map(x => `<a href="${courseUrl(x)}"><b>${esc(x.icon)}</b><span>${esc(x.title)}</span></a>`).join('')}</div></div>
  </aside>
</div>`;
      const schemas = [
        { '@context': 'https://schema.org', '@type': 'Article', headline: clip(plain(l.title), 110), description: desc, datePublished: PUBLISHED, dateModified: PUBLISHED,
          image: `${site}/og-image.jpg`, author: org, publisher: org, mainEntityOfPage: url, inLanguage: 'en-KE', isAccessibleForFree: true,
          isPartOf: { '@type': 'Course', name: m.title, url: courseUrl(m) },
          citation: sources.map(s => s.url) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: site },
          { '@type': 'ListItem', position: 2, name: 'Free Academy', item: `${site}/learn` },
          { '@type': 'ListItem', position: 3, name: m.title, item: courseUrl(m) },
          { '@type': 'ListItem', position: 4, name: plain(l.title), item: url }] },
      ];
      if (quizzes.length) schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: quizzes.map(q => ({
        '@type': 'Question', name: plain(q.q), acceptedAnswer: { '@type': 'Answer', text: `${plain(q.options[q.answer])}. ${plain(q.explain)}` } })) });
      const file = `learn/${COURSE_SLUG[m.id]}/${slugify(l.title)}.html`;
      write(file, page({ title, desc, url, keywords: `${m.title.toLowerCase()} kenya, ${plain(l.title).toLowerCase()}, social media growth kenya, free creator course kenya`, schemas, body }));
      out.push({ file, loc: url, kind: 'lesson' });
    });

    /* Course page */
    const url = courseUrl(m);
    const desc = clip(`Free ${m.lessons.length}-lesson course: ${m.blurb}. Written for Kenyan creators and businesses, updated November 2026.`, 158);
    const pm = premium.find(p => p.id === ({ basics: 'money', ig: 'ig_reels_pro', tiktok: 'tiktok_pro', yt: 'yt_seo', other: 'fb_monetize', safety: 'money', business: 'business_pro', shorts: 'shorts_pro', ai_content: 'ai_content_pro', capcut: 'capcut_pro', canva: 'canva_pro', branding: 'branding_pro', rules: 'ig_reels_pro', rescue: 'money', fundamentals: 'business_pro' })[m.id]);
    const body = `
<header class="hero"><div class="hero-in" style="max-width:820px;">
  <div class="bc"><a href="/">Home</a>›<a href="/learn">Free Academy</a>›<span>${esc(m.title)}</span></div>
  <div class="tag">${esc(m.icon)} Free course · ${m.lessons.length} lessons · ~${m.lessons.reduce((n, l) => n + l.minutes, 0)} min</div>
  <h1>${esc(m.title)}</h1>
  <p style="color:var(--muted);font-size:17px;">${esc(m.blurb)}</p>
  ${shareBar(url, `${m.title} — a free course for Kenyan creators 👇`)}
</div></header>
<div class="lesson-list">
  ${m.lessons.map((l, i) => `<a href="${lessonUrl(m, l)}"><b>${i + 1}</b><div><strong>${esc(plain(l.title))}</strong><span>${esc(clip(firstText(l), 150))} · ${l.minutes} min</span></div></a>`).join('\n  ')}
  <a href="${lessonUrl(m, m.lessons[0])}" class="l-btn" style="display:inline-flex;width:auto;border:none;background:linear-gradient(135deg,#3dd44a,#28a035);">Start lesson 1 →</a>
  ${pm ? `<div class="l-locked" style="margin-top:28px;"><div class="l-lb">💎 When you're ready to go deeper</div><p class="l-locked-t">${esc(pm.icon)} ${esc(pm.title)}</p><p>${esc(pm.blurb)} · ${pm.lessons.length} lessons</p><ul>${pm.lessons.map(x => `<li>🔒 ${esc(x.title)}</li>`).join('')}</ul><a class="l-btn gold" href="/?go=academy&amp;m=${pm.id}">Read lesson 1 free in the app →</a><p class="l-small">From KSh ${pm.priceKes || 50}, one-time M-Pesa payment.</p></div>` : ''}
</div>`;
    write(`learn/${COURSE_SLUG[m.id]}.html`, page({
      title: `${m.title} — Free Course for Kenyan Creators | EndaViral Academy`, desc, url,
      keywords: `${m.title.toLowerCase()} course kenya, free ${m.title.toLowerCase()} lessons, endaviral academy`,
      ogType: 'website', body,
      schemas: [
        { '@context': 'https://schema.org', '@type': 'Course', name: m.title, description: m.blurb, url, provider: org, inLanguage: 'en-KE',
          isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'KES', category: 'Free' },
          hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: `PT${m.lessons.reduce((n, l) => n + l.minutes, 0)}M` },
          hasPart: m.lessons.map(l => ({ '@type': 'LearningResource', name: plain(l.title), url: lessonUrl(m, l) })) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: site },
          { '@type': 'ListItem', position: 2, name: 'Free Academy', item: `${site}/learn` },
          { '@type': 'ListItem', position: 3, name: m.title, item: url }] },
      ],
    }));
    out.push({ file: `learn/${COURSE_SLUG[m.id]}.html`, loc: url, kind: 'course' });
  }

  /* Hub */
  const hubUrl = `${site}/learn`;
  const hubBody = `
<header class="hero"><div class="hero-in" style="text-align:center;max-width:820px;">
  <div class="tag">🇰🇪 Free · Updated November 2026</div>
  <h1>The Free Creator Academy for <span style="color:var(--green);">Kenya</span></h1>
  <p style="color:var(--muted);font-size:17px;max-width:620px;margin:0 auto;">${totalLessons} free lessons across ${free.length} courses on TikTok, Instagram, YouTube, Facebook, X, Telegram, WhatsApp Business, branding and getting paid. Every lesson is researched, sourced and written for Kenyan creators and small businesses.</p>
  <div style="display:flex;justify-content:center;">${shareBar(hubUrl, 'Free social media courses for Kenyan creators 👇')}</div>
</div></header>
<div class="sec-h" style="margin-top:30px;">Free courses</div>
<div class="grid">
${free.map(m => `<a class="cc" href="${courseUrl(m)}"><div class="ic">${esc(m.icon)}</div><h2>${esc(m.title)}</h2><p>${esc(m.blurb)}</p><span class="go">${m.lessons.length} free lessons →</span></a>`).join('\n')}
</div>
<div class="sec-h">Premium deep-dives — in the app, from KSh 50</div>
<div class="grid">
${premium.map(p => `<a class="cc prem" href="/?go=academy&amp;m=${p.id}"><div class="ic">${esc(p.icon)}</div><h3>${esc(p.title)}</h3><p>${esc(p.blurb)} · ${p.lessons.length} lessons</p><span class="go">Read lesson 1 free → KSh ${p.priceKes || 50}</span></a>`).join('\n')}
</div>`;
  write('learn.html', page({
    title: 'Free Social Media Courses for Kenyan Creators (2026) | EndaViral Academy',
    desc: clip(`${totalLessons} free lessons on growing TikTok, Instagram, YouTube and Facebook in Kenya, fixing hacked or banned accounts, and getting paid. Researched and updated November 2026.`, 158),
    url: hubUrl, keywords: 'free social media course kenya, tiktok course kenya, instagram growth course kenya, creator academy kenya, digital marketing course kenya free',
    ogType: 'website', body: hubBody,
    schemas: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'EndaViral Free Creator Academy',
      itemListElement: free.map((m, i) => ({ '@type': 'ListItem', position: i + 1, url: courseUrl(m), name: m.title })) }],
  }));
  out.unshift({ file: 'learn.html', loc: hubUrl, kind: 'hub' });
  return out;
}
