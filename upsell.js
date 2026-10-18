/* ════════════════════ NEXT STEP (upsell) ════════════════════
 * After an order is delivered, quietly suggest the natural follow-up for
 * that account (followers → likes, views → likes, …).
 *
 * One slim row per suggestion on the dashboard (#dashNextSteps, max 2), and
 * a prominent offer card on the "order placed" screen (#omUpsell), which
 * becomes that screen's main button. The customer stays in control:
 *   • "Order"  → opens the normal order form with the suggested service and
 *                quantity. The link is left empty for them to enter, except
 *                when the offer is for the same post/video they just paid
 *                for (e.g. views → likes), where it's pre-filled (editable).
 *   • "Other services" → opens the catalog filtered to that platform + type
 *                (e.g. Instagram → Views) so they can pick any service.
 * Payment is the usual M-Pesa flow; nothing is charged here.
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

// Suggestions are only ever Medium (green) or Elite (blue) — same colours
// as the catalog's "What do the service tiers mean?" legend.
const _UP_TIER = { medium: ['Medium', '#22c55e'], elite: ['Elite', '#3b82f6'] };
function _upTierHTML(tier) {
  const t = _UP_TIER[tier];
  return t ? `<span class="up-tier" style="color:${t[1]}"><span class="up-dot" style="background:${t[1]}"></span>${t[0]}</span> ` : '';
}

function _upRowHTML(s, idx) {
  const tip = esc([s.pitch, s.social_proof].filter(Boolean).join(' · '));
  return `
    <div class="up-row" data-key="${esc(s.key)}" title="${tip}">
      <span class="up-ic">${_UP_ICON[s.platform] || '🚀'}</span>
      <span class="up-txt">${esc(s.title)} ${_upTierHTML(s.tier)}<span class="up-price">· from ${fmtKES(s.price_kes)}</span></span>
      <span class="up-acts">
        <button class="up-link up-main" onclick="upsellStart('dash', ${idx})">Order</button>
        <button class="up-link" onclick="upsellBrowse('dash', ${idx})">Other services</button>
        <button class="up-x" title="Hide" aria-label="Hide suggestion" onclick="upsellDismiss(event,'${esc(s.key)}')">✕</button>
      </span>
    </div>`;
}

async function upsellRefreshCard() {
  const box = document.getElementById('dashNextSteps');
  if (!box) return;
  if (typeof token === 'undefined' || !token) { box.style.display = 'none'; return; }
  let data;
  try { data = await api('/upsell/next-steps'); } catch (_) { box.style.display = 'none'; return; }
  const hidden = _upDismissed();
  _upSuggestions = (data.suggestions || []).filter(s => !hidden.includes(s.key)).slice(0, _UP_MAX_DASH);
  if (!_upSuggestions.length) { box.style.display = 'none'; return; }
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
  // Same post/video as the order just placed → re-use its link (editable).
  const same = where === 'after' && _upSameLink(s);
  const linkEl = document.getElementById('omLink');
  if (same && linkEl) linkEl.value = s.link;
  const phoneEl = document.getElementById('omPhone');
  if (lastPhone && phoneEl && !phoneEl.value) phoneEl.value = lastPhone;
  const note = document.getElementById('omUpsellNote');
  if (note) {
    note.innerHTML = (same ? 'Same link as your last order · ' : 'Suggested service · ') +
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
  const typ = _UP_TYPE_LABEL[s.to_type] || s.to_type;
  const qty = Number(s.quantity || 0).toLocaleString('en-KE');
  const price = fmtKES(s.price_kes);
  const tierWord = s.tier === 'elite' ? 'Elite quality' : 'Medium quality';
  const tierCol = s.tier === 'elite' ? '#3b82f6' : '#22c55e';
  return `
  <div class="upa-card" role="region" aria-label="Recommended next step">
    <div class="upa-kicker">⚡ COMPLETE YOUR BOOST</div>
    <div class="upa-head">
      <div class="upa-ic">${_UP_ICON[s.platform] || '🚀'}</div>
      <div class="upa-body">
        <div class="upa-title">Add ${qty} ${esc(typ)} to ${esc(s.link_label || 'your account')}</div>
        <div class="upa-meta"><span class="up-tier" style="color:${tierCol}"><span class="up-dot" style="background:${tierCol}"></span>${tierWord}</span> · only <strong style="color:var(--white)">${price}</strong></div>
      </div>
    </div>
    ${s.pitch ? `<div class="upa-pitch">${esc(s.pitch)}</div>` : ''}
    ${s.social_proof ? `<div class="upa-proof"><span>👥</span><span>${esc(s.social_proof)}</span></div>` : ''}
    <button class="upa-cta" onclick="upsellStart('after', 0)">Add ${qty} ${esc(typ)} · ${price} →</button>
    <div class="upa-alt">
      <a href="#" onclick="upsellBrowse('after', 0);return false;">Other packages</a>
      <a href="#" onclick="upsellHideAfter();return false;">No thanks</a>
    </div>
  </div>`;
}

function _upSetAfterMode(on) {
  document.getElementById('omStep3')?.classList.toggle('om-has-upsell', !!on);
}

function upsellHideAfter() {
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

// The dashboard can finish loading before this file does (it's near the end
// of the page), in which case loadDashboard() skipped the refresh. Catch up
// once — api() shares in-flight GETs, so a duplicate call costs nothing.
if (typeof token !== 'undefined' && token) setTimeout(() => upsellRefreshCard(), 0);
