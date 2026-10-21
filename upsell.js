/* ════════════════════ NEXT STEP (upsell) ════════════════════
 * After an order is delivered, quietly suggest the natural follow-up for
 * that account (followers → likes, views → likes, …).
 *
 * One compact card per suggestion on the dashboard (#dashNextSteps, max 2), and
 * a prominent offer card on the "order placed" screen (#omUpsell), which
 * becomes that screen's main button. The customer stays in control:
 *   • "Order"  → opens the normal order form with the suggested service and
 *                quantity. The link is left empty for them to enter, except
 *                when the offer is for the same post/video they just paid
 *                for (e.g. views → likes), where it's pre-filled (editable).
 *   • "Other services" → opens the catalog filtered to that platform + type
 *                (e.g. Instagram → Views) so they can pick any service.
 * Payment is the usual M-Pesa flow; nothing is charged here.
 * Every suggestion is 10% off (UPSELL_DISCOUNT_PCT in the backend's
 * services/pricing.py). The order form shows the discounted price while the
 * customer is acting on a suggestion (upsellPriceFor); the backend re-checks
 * the offer and charges the real amount, which the payment step displays.
 * Backend: GET /upsell/next-steps[?order_id=…]  (app/services/upsell.py)
 * Depends on: api(), esc(), fmtKES(), openOrderModal(), calcOrderCost(),
 *             navTo(), loadServices(), selectPlatform(), selectSubcat(),
 *             allServices, token
 * ═══════════════════════════════════════════════════════════════ */

let _upSuggestions = [];
let _upAfterOrder = null;
// Which suggestion the customer is acting on, so the order can be tagged
// for admin stats. Set by upsellStart()/upsellBrowse(); read by
// upsellTagFor() when the order is placed; expires after 30 min.
let _upCtx = null;
const _UP_CTX_TTL = 30 * 60 * 1000;
const _UP_MAX_DASH = 2;

const _UP_ICON = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', facebook: '👍', twitter: '𝕏', telegram: '✈️',
  spotify: '🎧', snapchat: '👻', linkedin: '💼', threads: '🧵', discord: '💬', twitch: '🎮',
};
const _UP_DISMISS_KEY = 'ev_upsell_dismissed';

function _upDismissed() {
  try { return JSON.parse(localStorage.getItem(_UP_DISMISS_KEY) || '[]'); } catch (_) { return []; }
}
function _upDismiss(key) {
  try {
    const d = _upDismissed().filter(k => k !== key);
    d.push(key);
    localStorage.setItem(_UP_DISMISS_KEY, JSON.stringify(d.slice(-50)));
  } catch (_) { /* storage blocked — hidden for this visit only */ }
}

// Each dashboard offer retires after it has been shown on this many
// different days without being acted on — an offer, not a fixture.
// Per browser, like the ✕ dismissals above.
const _UP_MAX_SEEN_DAYS = 5;
const _UP_SEEN_KEY = 'ev_upsell_seen_days';
function _upSeen() {
  try { return JSON.parse(localStorage.getItem(_UP_SEEN_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function _upMarkSeen(keys) {
  try {
    const seen = _upSeen();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    keys.forEach(k => {
      const days = seen[k] || [];
      if (!days.includes(today)) days.push(today);
      seen[k] = days.slice(-_UP_MAX_SEEN_DAYS);
    });
    // Keep the store small: newest 100 offers only.
    const entries = Object.entries(seen).slice(-100);
    localStorage.setItem(_UP_SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (_) { /* storage blocked — no cap this visit */ }
}
function _upRetired(key) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  const days = _upSeen()[key] || [];
  // Retired once seen on the max number of days and today isn't one of them.
  return days.length >= _UP_MAX_SEEN_DAYS && !days.includes(today);
}

// Suggestions are only ever Medium (green) or Elite (blue) — same colours
// as the catalog's "What do the service tiers mean?" legend.
const _UP_TIER = { medium: ['Medium', '#22c55e'], elite: ['Elite', '#3b82f6'] };
function _upTierHTML(tier) {
  const t = _UP_TIER[tier];
  return t ? `<span class="up-tier" style="color:${t[1]}"><span class="up-dot" style="background:${t[1]}"></span>${t[0]}</span> ` : '';
}

// Discount shown on suggestions — the backend sends discount_pct with each one.
const UPSELL_DISCOUNT_PCT = 10;
function _upPct(s) { return Number((s && s.discount_pct) || 0); }
function _upWasHTML(s) {
  return _upPct(s) && s.original_price_kes > s.price_kes
    ? `<s class="up-was">${fmtKES(s.original_price_kes)}</s> ` : '';
}
function _upOffHTML(s) {
  return _upPct(s) ? `<span class="up-off">${_upPct(s)}% OFF</span>` : '';
}

function _upDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
function _upTyp(s) { return _UP_TYPE_LABEL[s.to_type] || s.to_type; }
function _upSaveHTML(s) {
  const save = Number(s.save_kes || 0);
  if (!_upPct(s)) return '';
  return `<span class="up-off">${save >= 10 ? `SAVE ${fmtKES(save)}` : `${_upPct(s)}% OFF`}</span>`;
}

function _upRowHTML(s, idx) {
  const qty = Number(s.quantity || 0).toLocaleString('en-KE');
  return `
    <div class="up-row" data-key="${esc(s.key)}">
      <button class="up-x" title="Hide" aria-label="Hide suggestion" onclick="upsellDismiss(event,'${esc(s.key)}')">✕</button>
      <div class="up-top">
        <span class="up-ic">${_UP_ICON[s.platform] || '🚀'}</span>
        <div class="up-main-txt">
          <div class="up-head">${esc(s.headline || s.title)}</div>
          <div class="up-sub">${esc(s.pitch || '')}</div>
        </div>
      </div>
      <div class="up-foot">
        <span class="up-price">${_upWasHTML(s)}<strong class="up-now">${fmtKES(s.price_kes)}</strong> ${_upSaveHTML(s)}</span>
        <span class="up-acts">
          <button class="up-link" onclick="upsellBrowse('dash', ${idx})">Others</button>
          <button class="up-btn" onclick="upsellStart('dash', ${idx})">Add ${qty} ${esc(_upTyp(s))}</button>
        </span>
      </div>
    </div>`;
}

async function upsellRefreshCard() {
  const box = document.getElementById('dashNextSteps');
  if (!box) return;
  if (typeof token === 'undefined' || !token) { box.style.display = 'none'; return; }
  let data;
  try { data = await api('/upsell/next-steps'); } catch (_) { box.style.display = 'none'; return; }
  const hidden = _upDismissed();
  _upSuggestions = (data.suggestions || [])
    .filter(s => !hidden.includes(s.key) && !_upRetired(s.key))
    .slice(0, _UP_MAX_DASH);
  if (!_upSuggestions.length) { box.style.display = 'none'; return; }
  _upMarkSeen(_upSuggestions.map(s => s.key));
  document.getElementById('dashNextStepsList').innerHTML = _upSuggestions.map(_upRowHTML).join('');
  box.style.display = '';
}

function upsellDismiss(ev, key) {
  if (ev) ev.stopPropagation();
  _upDismiss(key);
  _upSuggestions = _upSuggestions.filter(s => s.key !== key);
  const row = document.querySelector(`#dashNextStepsList .up-row[data-key="${CSS.escape(key)}"]`);
  if (row) row.remove();
  if (!_upSuggestions.length) document.getElementById('dashNextSteps').style.display = 'none';
}

function _upPick(where, idx) { return where === 'after' ? _upAfterOrder : _upSuggestions[idx]; }

function _upSetCtx(where, s) {
  _upCtx = {
    source: where === 'after' ? 'after_order' : 'dashboard',
    key: s.key, from_order_id: s.for_order_id,
    suggested_service_id: s.service && s.service.service,
    platform: s.platform, to_type: s.to_type, at: Date.now(),
    discount_pct: _upPct(s),
    max_qty: Number(s.quantity || 0),   // backend: no discount above the offered quantity
  };
}

/** Tag to send with POST /orders, or null. Counts the suggested service
 *  itself, or any service of the same platform + type the customer picked
 *  via "Other services". Analytics only. */
function upsellTagFor(svc) {
  const c = _upCtx;
  if (!c || !svc || Date.now() - c.at > _UP_CTX_TTL) return null;
  const sameSvc = String(svc.service) === String(c.suggested_service_id);
  const sameKind = svc._platKey === c.platform && svc._subcatKey === c.to_type;
  if (!sameSvc && !sameKind) return null;
  return { source: c.source, key: c.key, from_order_id: c.from_order_id, suggested_service_id: c.suggested_service_id };
}

function upsellClearCtx() { _upCtx = null; }

/** Discounted price for the order form, mirroring the backend
 *  (services/pricing.py → upsell_amount_kes): price minus the discount,
 *  then the usual round-up to KES 5 (min KES 20). Returns null when this
 *  order isn't from a suggestion. The backend has the final say (it also
 *  never goes below cost); the payment step shows what it charged. */
// Quality tier from a service name — same rule as the backend's tier_of().
function _upTierOfName(name) {
  const n = String(name || ''), low = n.toLowerCase();
  const has = (w, dot) => n.includes(dot) || new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(low);
  if (has('basic', '\u{1F7E1}')) return 'basic';
  if (has('elite', '\u{1F535}')) return 'elite';
  if (has('medium', '\u{1F7E2}')) return 'medium';
  return null;
}

function upsellPriceFor(svc, qty) {
  const tag = upsellTagFor(svc);
  const pct = _upCtx && _upCtx.discount_pct;
  if (!tag || !pct || !(qty > 0)) return null;
  // Mirrors upsell_discount_applies(): up to the offered quantity, and an
  // alternative service must be Medium/Elite like the suggestion.
  if (_upCtx.max_qty && qty > _upCtx.max_qty) return null;
  if (String(svc.service) !== String(_upCtx.suggested_service_id) &&
      !['medium', 'elite'].includes(_upTierOfName(svc.name))) return null;
  const rate = parseFloat(svc.rate || svc.price_per_1000 || svc.price || 0);
  const raw = Math.round((qty / 1000) * rate * 10000) / 10000;
  const disc = Math.round(raw * (100 - pct) / 100 * 10000) / 10000;
  const final = Math.max(20, Math.ceil(disc / 5 - 1e-9) * 5);
  const original = typeof orderFinalKes === 'function' ? orderFinalKes(qty, rate) : final;
  return { final: Math.min(final, original), original, pct };
}

async function _upEnsureServices() {
  if ((!allServices || !allServices.length) && typeof loadServices === 'function') {
    try { await loadServices(); } catch (_) {}
  }
}

/** Open the order form with the suggested service + quantity. The link is
 *  left empty on purpose — the customer enters which post/account. */
async function upsellStart(where, idx) {
  const s = _upPick(where, idx);
  if (!s) return;
  _upSetCtx(where, s);
  // The M-Pesa number they just paid with (still shown on the payment step).
  const lastPhone = where === 'after' ? (document.getElementById('omPayPhone')?.textContent || '').trim() : '';
  if (where === 'after' && typeof closeOrderModal === 'function') closeOrderModal();
  await _upEnsureServices();
  const svc = (allServices || []).find(x => String(x.service) === String(s.service.service)) || s.service;
  openOrderModal(svc);
  document.getElementById('omQty').value = s.quantity;
  calcOrderCost();
  // Same post/video as the original order → re-use its link (editable).
  // The discount only applies to that post, so pre-fill it from anywhere.
  const same = _upSameLink(s);
  const linkEl = document.getElementById('omLink');
  if (same && linkEl) linkEl.value = s.link;
  const phoneEl = document.getElementById('omPhone');
  if (lastPhone && phoneEl && !phoneEl.value) phoneEl.value = lastPhone;
  const note = document.getElementById('omUpsellNote');
  if (note) {
    note.innerHTML = (_upPct(s) ? `<span class="up-off">${_upPct(s)}% OFF</span> ` : '') +
      (same ? 'Same link · ' : '') +
      `<a href="#" onclick="upsellBrowse('${where}', ${idx});return false;">choose a different one</a>`;
    note.style.display = '';
  }
  // Nothing left to type? Point them at the pay button; else at the empty field.
  setTimeout(() => {
    const target = !linkEl?.value ? linkEl : (!phoneEl?.value ? phoneEl : document.getElementById('placeOrderBtn'));
    target?.focus();
  }, 50);
}

/** Show the catalog filtered to the suggestion's platform + type, so the
 *  customer can pick whichever service they prefer. */
async function upsellBrowse(where, idx) {
  const s = _upPick(where, idx);
  if (!s) return;
  _upSetCtx(where, s);
  if (typeof closeOrderModal === 'function') closeOrderModal();
  navTo('services');
  if (_upPct(s) && typeof toast === 'function') {
    const typ = _UP_TYPE_LABEL[s.to_type] || s.to_type;
    toast(`${_upPct(s)}% off any ${s.platform_label || ''} ${typ} package you pick — applied at checkout`, 'success');
  }
  await _upEnsureServices();
  if (typeof selectPlatform === 'function') selectPlatform(s.platform);
  if (typeof selectSubcat === 'function' &&
      document.querySelector(`.subcat-tile[data-subcat="${CSS.escape(s.to_type)}"]`)) {
    selectSubcat(s.to_type);
  }
  document.getElementById('subcatBar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Types that apply to one post/video. If the customer just bought one of
 * these and the suggestion is another, it's for the SAME post, so the link
 * they already entered can be re-used (no need to paste it again). A
 * follower order's link is a profile, so likes/views still need a post link. */
const _UP_POST_TYPES = ['likes', 'views', 'comments', 'shares', 'saves'];
function _upSameLink(s) {
  return !!(s && s.link && _UP_POST_TYPES.includes(s.from_type) && _UP_POST_TYPES.includes(s.to_type));
}
const _UP_TYPE_LABEL = { live: 'live viewers' };

function _upAfterCardHTML(s) {
  const typ = _upTyp(s);
  const qty = Number(s.quantity || 0).toLocaleString('en-KE');
  const price = fmtKES(s.price_kes);
  return `
  <div class="upa-card" role="region" aria-label="Recommended next step">
    <div class="upa-kicker">⚡ ONE MORE STEP</div>
    <div class="upa-head">
      <div class="upa-ic">${_UP_ICON[s.platform] || '🚀'}</div>
      <div class="upa-body">
        <div class="upa-title">${esc(s.headline || s.title)}</div>
        ${s.pitch ? `<div class="upa-meta">${esc(s.pitch)}</div>` : ''}
      </div>
    </div>
    ${s.social_proof ? `<div class="upa-proof"><span>👥</span><span>${esc(s.social_proof)}</span></div>` : ''}
    <button class="upa-cta" onclick="upsellStart('after', 0)">Add ${qty} ${esc(typ)} · ${_upWasHTML(s)}${price}</button>
    <div class="upa-alt">
      ${_upSaveHTML(s)}
      <a href="#" onclick="upsellBrowse('after', 0);return false;">Other packages</a>
      <a href="#" onclick="upsellHideAfter();return false;">No thanks</a>
    </div>
  </div>`;
}

function _upSetAfterMode(on) {
  document.getElementById('omStep3')?.classList.toggle('om-has-upsell', !!on);
}

function upsellHideAfter() {
  // "No thanks" is remembered like the dashboard ✕, so the same offer
  // doesn't come back on the dashboard later.
  if (_upAfterOrder && _upAfterOrder.key) _upDismiss(_upAfterOrder.key);
  const el = document.getElementById('omUpsell');
  if (el) el.innerHTML = '';
  _upSetAfterMode(false);
}

/** "Order placed" screen: the recommended follow-up for the order just
 *  paid for, shown as the main call to action. */
async function upsellShowAfterOrder(orderId) {
  const el = document.getElementById('omUpsell');
  if (!el) return;
  el.innerHTML = '';
  _upSetAfterMode(false);
  _upAfterOrder = null;
  if (!orderId) return;
  try {
    const data = await api('/upsell/next-steps?order_id=' + encodeURIComponent(orderId));
    const s = (data.suggestions || [])[0];
    if (!s) return;
    // The modal may have been closed (or another order opened) while loading.
    if (document.getElementById('omStep3')?.style.display === 'none') return;
    _upAfterOrder = s;
    el.innerHTML = _upAfterCardHTML(s);
    _upSetAfterMode(true);
  } catch (_) { /* optional — the order itself already succeeded */ }
}

/* ════════════════════ CHECKOUT ADD-ON ════════════════════
 * A tick box on the order form ("+ Add 100 likes · KES 45"), shown BEFORE
 * paying, so the add-on rides on the same M-Pesa prompt: one PIN, two
 * orders. Unticked by default. The offer comes from
 * GET /upsell/checkout-offer and is re-fetched when the service or quantity
 * changes; POST /orders re-checks it and prices it server-side (`addon`).
 * Hooks in index.html: openOrderModal → addonReset(), calcOrderCost →
 * addonOnQty() + addonKes(), placeOrder → addonPayload().
 * ═══════════════════════════════════════════════════════════ */
let _addon = null;        // current offer, or null
let _addonKey = '';       // service:qty the offer was fetched for
let _addonTimer = null;
let _addonSeq = 0;
let _addonOff = false;    // the server said it's unavailable: hide it for this order

/** Clear the add-on. `suppress` (after a 410) keeps it hidden until the
 *  order form is opened again. */
function addonReset(suppress) {
  _addon = null; _addonKey = ''; clearTimeout(_addonTimer); _addonSeq++;
  _addonOff = !!suppress;
  const el = document.getElementById('omAddon');
  if (el) el.innerHTML = '';
}

function _addonChecked() { return !!(_addon && document.getElementById('omAddonChk')?.checked); }

/** True if an add-on was shown on the form (ticked or not). Used to skip
 *  the "order placed" offer when the customer already said no to one —
 *  we ask once per purchase, not twice. */
function addonWasOffered() { return !!_addon; }

/** Extra KES the add-on adds to the total (0 when not ticked). */
function addonKes() { return _addonChecked() ? Number(_addon.price_kes || 0) : 0; }

/** `addon` field for POST /orders, or null. Throws a friendly message if a
 *  needed link is missing. */
function addonPayload() {
  if (!_addonChecked()) return null;
  const out = { service_id: _addon.service.service, quantity: _addon.quantity };
  if (_addon.needs_link) {
    const link = (document.getElementById('omAddonLink')?.value || '').trim();
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link)) {
      document.getElementById('omAddonLink')?.focus();
      throw new Error(link ? `That add-on link doesn't look right — paste the full post link (https://…), or untick the add-on.`
                           : `Paste the link for your ${_addon.type_label}, or untick the add-on.`);
    }
    out.link = link;
  }
  return out;
}

/** Short summary for the payment / result screens, e.g. "100 likes". */
function addonSummary() {
  return _addonChecked() ? `${Number(_addon.quantity).toLocaleString('en-KE')} ${_addon.type_label}` : '';
}

/** Called from calcOrderCost(): re-fetch the offer when service/qty change. */
function addonOnQty() {
  if (_addonOff || typeof token === 'undefined' || !token || !currentSvc) return;
  const qty = parseInt(document.getElementById('omQty')?.value) || 0;
  const sid = currentSvc.service || currentSvc.id;
  const key = `${sid}:${qty}`;
  if (key === _addonKey) return;
  _addonKey = key;
  clearTimeout(_addonTimer);
  if (!(qty > 0)) { _addonRender(null); return; }
  _addonTimer = setTimeout(() => addonFetch(sid, qty), 350);
}

async function addonFetch(sid, qty) {
  const seq = ++_addonSeq;
  let offer = null;
  try {
    const data = await api(`/upsell/checkout-offer?service_id=${encodeURIComponent(sid)}&quantity=${qty}`);
    offer = data && data.offer;
  } catch (_) { offer = null; }
  if (seq !== _addonSeq) return;   // a newer request is on its way
  _addonRender(offer);
}

function _addonRender(offer) {
  const el = document.getElementById('omAddon');
  if (!el) return;
  const wasChecked = _addonChecked();
  const prevType = _addon && _addon.to_type;
  const prevQty = _addon && _addon.quantity;
  const prevPrice = _addon && _addon.price_kes;
  const prevLink = document.getElementById('omAddonLink')?.value || '';
  _addon = offer || null;
  if (!_addon) { el.innerHTML = ''; calcOrderCost(); return; }
  const a = _addon;
  const qty = Number(a.quantity).toLocaleString('en-KE');
  // Keep their tick only if the add-on is exactly the same; any change in
  // what or how much they'd pay is shown unticked, and we say so.
  const keep = wasChecked && prevType === a.to_type && prevQty === a.quantity && prevPrice === a.price_kes;
  if (wasChecked && !keep && typeof toast === 'function') {
    toast(`The add-on is now ${Number(a.quantity).toLocaleString('en-KE')} ${a.type_label} for ${fmtKES(a.price_kes)} — tick it again to add it.`, 'info');
  }
  el.innerHTML = `
    <label class="oa-box${keep ? ' on' : ''}">
      <input type="checkbox" id="omAddonChk" ${keep ? 'checked' : ''} onchange="addonToggle()">
      <span class="oa-tick" aria-hidden="true"></span>
      <span class="oa-body">
        <span class="oa-title">Add ${qty} ${esc(a.type_label)} ${_upTierHTML(a.tier)}</span>
        <span class="oa-why">${esc(a.why || '')}</span>
      </span>
      <span class="oa-price">${a.original_price_kes > a.price_kes ? `<s>${fmtKES(a.original_price_kes)}</s>` : ''}<strong>+${fmtKES(a.price_kes)}</strong></span>
    </label>
    ${a.needs_link ? `<div class="oa-link modal-field" id="omAddonLinkWrap" style="display:${keep ? '' : 'none'}">
      <input type="url" id="omAddonLink" placeholder="Paste the post/video link for your ${esc(a.type_label)}" value="${esc(prevLink)}"/>
    </div>` : ''}
    <div class="oa-note">Paid in the same M-Pesa prompt — one PIN.</div>`;
  calcOrderCost();
}

function addonToggle() {
  const on = _addonChecked();
  document.querySelector('#omAddon .oa-box')?.classList.toggle('on', on);
  const wrap = document.getElementById('omAddonLinkWrap');
  if (wrap) { wrap.style.display = on ? '' : 'none'; if (on) document.getElementById('omAddonLink')?.focus(); }
  calcOrderCost();
}

/** POST /orders said the offer changed (409): fetch the current one. */
function addonRefetch() {
  _addonKey = '';
  addonOnQty();
}

// The dashboard can finish loading before this file does (it's near the end
// of the page), in which case loadDashboard() skipped the refresh. Catch up
// once — api() shares in-flight GETs, so a duplicate call costs nothing.
if (typeof token !== 'undefined' && token) setTimeout(() => upsellRefreshCard(), 0);
