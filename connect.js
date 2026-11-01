/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL CONNECT — Brand × Creator Marketplace  (connect.js)  v2.0
 *
 * v2 JOURNEY — pay up front, fixed price, account proof:
 *   Business: write the brief + price → pay once (M-Pesa or EndaViral
 *   balance) → job goes live → review each creator's accounts (bids.js) →
 *   hire in one tap. Unused money returns to the EndaViral balance.
 *   Creator: every job on Find Jobs is already paid for → Accept with
 *   account links + screenshots → if hired, post, send links, get paid.
 *   Chat is for the work (deliverables, timing, the brief) — no haggling.
 * Depends on: esc(), toast(), navTo(), fmtKES(), currentUser, api() (globals)
 * All money (escrow amounts, the 15% commission split, ratings) is decided
 * server-side (see app/routers/connect.py + app/services/connect_service.py).
 * The client only ever renders what the server hands back.
 * ════════════════════════════════════════════════════════════════════
 * INTEGRATION CHECKLIST (index.html):
 *
 *  1. Sidebar nav item — paste ★NAVITEM inside <nav>, e.g. right after
 *     the Creator Academy nav-item.
 *
 *  2. Page section — paste ★SECTION inside .page-content.
 *
 *  3. Modals — paste ★MODALS just before </body>.
 *
 *  4. pageTitles — add:  connect:'ENDAVIRAL CONNECT'
 *
 *  5. navTo() — add this line where the other `if (page === '...')`
 *     hooks live:
 *       if (page === 'connect') { if (typeof initConnectPage === 'function') initConnectPage(); }
 *
 *  6. Script tags — add near the other page scripts, connect-tos.js FIRST:
 *       <script src="connect-tos.js"></script>
 *       <script src="connect.js"></script>
 *
 * ★NAVITEM
 * <div class="nav-item" onclick="navTo('connect')" id="connectNavItem">
 *   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *     <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
 *     <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
 *   </svg>
 *   Connect
 *   <span class="nav-badge" id="connectBadge" style="display:none;background:var(--green);color:#000;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:800;margin-left:auto;"></span>
 * </div>
 *
 * ★SECTION
 * <div class="page-section" id="sec-connect"></div>
 *
 * ★MODALS
 * <div class="modal-overlay" id="cnCampaignModal">
 *   <div class="modal" style="max-width:640px;">
 *     <button class="modal-close" onclick="_cnCloseCampaign()">✕</button>
 *     <div id="cnCampaignModalBody"></div>
 *   </div>
 * </div>
 * <div class="modal-overlay" id="cnCreateModal">
 *   <div class="modal" style="max-width:560px;">
 *     <button class="modal-close" onclick="_cnCloseCreate()">✕</button>
 *     <div id="cnCreateModalBody"></div>
 *   </div>
 * </div>
 * <div class="modal-overlay" id="cnTosModal">
 *   <div class="modal" style="max-width:640px;">
 *     <button class="modal-close" onclick="_cnCloseTos()">✕</button>
 *     <div id="cnTosModalBody"></div>
 *   </div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────────────────
let _cnRole = 'creator';          // 'creator' | 'business'
let _cnLandingPicked = false;     // true once a first-time visitor has picked a side this session
let _cnUnreadByCampaign = {};     // campaign_id -> unread_count, refreshed by _cnPollUnread
let _cnLastUnreadSnapshot = null; // JSON snapshot of the last poll's unread data — lets _cnPollUnread skip re-rendering when nothing actually changed
let _cnTab  = 'discover';         // active sub-tab
let _cnCampaigns = [];            // last-loaded list for the active tab
let _cnCurrentCampaign = null;    // full detail of the open modal's campaign
let _cnCurrentApplications = [];  // applications for the open campaign (business view)
let _cnCreatorProfile = null;
let _cnBusinessProfile = null;
let _cnFundPollTimer = null;
let _cnLastFundCheckoutId = null; // most recent checkoutRequestId this session tried to fund with — prefilled into the "payment not reflecting" report so admin has somewhere to start looking
let _cnMsgThreadCreatorId = null;  // which creator's thread is open in the campaign modal (business side, when unassigned)
let _cnActiveNegotiationApp = null; // the CampaignApplication behind the currently open thread, if any (drives the negotiation banner/propose/fund controls)
let _cnBidCounts = {};             // cached applications/counts for the "N bids received" summary card on a business's own campaign — connect.js's own copy, fetched via bids.js's shared _bwFetchCampaignSummaryCounts(). bids.js keeps its own separate copy (_bwCounts) for the open workspace; the two are never shared or overwritten across files.

let _cnJoinedRoles = { creator: false, business: false };  // which side(s) this user has actually joined — drives whether the role toggle shows at all
let _cnRolesResolved = false;      // becomes true once _cnDetectJoinedRoles() has checked the server

const CONNECT_COMMISSION_RATE = 0.15;   // display-only — server (connect_service.py) is the source of truth
const CONNECT_PLATFORMS = [
  { key: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'facebook',  label: 'Facebook',  emoji: '👥' },
  { key: 'youtube',   label: 'YouTube',   emoji: '▶️' },
];

function _cnPlatformDef(key) {
  return CONNECT_PLATFORMS.find(p => p.key === key) || { key, label: key || '—', emoji: '📱' };
}

// Niches a creator (or a business, when describing who they're after) can
// fall into — a creator/business can tick more than one.
const CONNECT_NICHES = [
  { key: 'comedy',      label: 'Comedy',       emoji: '😂' },
  { key: 'fashion',     label: 'Fashion',      emoji: '👗' },
  { key: 'beauty',      label: 'Beauty',       emoji: '💄' },
  { key: 'fitness',     label: 'Fitness',      emoji: '💪' },
  { key: 'food',        label: 'Food',         emoji: '🍲' },
  { key: 'travel',      label: 'Travel',       emoji: '✈️' },
  { key: 'tech',        label: 'Tech',         emoji: '💻' },
  { key: 'gaming',      label: 'Gaming',       emoji: '🎮' },
  { key: 'music',       label: 'Music',        emoji: '🎶' },
  { key: 'lifestyle',   label: 'Lifestyle',    emoji: '🌿' },
  { key: 'business',    label: 'Business/Finance', emoji: '💼' },
  { key: 'education',   label: 'Education',    emoji: '📚' },
  { key: 'parenting',   label: 'Parenting/Family', emoji: '👨‍👩‍👧' },
  { key: 'sports',      label: 'Sports',       emoji: '⚽' },
  { key: 'beauty_hair', label: 'Hair & Skincare', emoji: '💇' },
  { key: 'art',         label: 'Art & Design', emoji: '🎨' },
];

function _cnNicheDef(key) {
  return CONNECT_NICHES.find(n => n.key === key) || { key, label: key || '—', emoji: '🏷️' };
}

// ─── Multi-value campaign fields ────────────────────────────────────────────
// Campaign.platform / Campaign.required_niche are comma-separated (a
// campaign can target more than one platform/niche) — these turn that raw
// string into the def objects / tag markup used across the card, detail,
// and admin views.
function _cnPlatformDefs(commaStr) {
  const keys = (commaStr || '').split(',').map(s => s.trim()).filter(Boolean);
  return (keys.length ? keys : ['']).map(_cnPlatformDef);
}
function _cnNicheDefs(commaStr) {
  return (commaStr || '').split(',').map(s => s.trim()).filter(Boolean).map(_cnNicheDef);
}
function _cnPlatformTagsHtml(commaStr, tagClass) {
  return _cnPlatformDefs(commaStr).map(p => `<span class="${tagClass}">${p.emoji} ${esc(p.label)}</span>`).join('');
}
function _cnNicheTagsHtml(commaStr, tagClass) {
  return _cnNicheDefs(commaStr).map(n => `<span class="${tagClass}">${n.emoji} ${esc(n.label)}</span>`).join('');
}

// ─── Generic multi-select-with-ticks dropdown ──────────────────────────────
// Used for Niches / Platforms on the creator profile: a small button that
// opens a checkbox list so a creator (or business) can tick every category
// they fall into, instead of typing a fragile comma-separated string.
let _cnMultiState = {};   // dropdownId -> array of selected keys (source of truth while form is open)

function _cnMultiSelectHtml(id, options, selected) {
  _cnMultiState[id] = Array.isArray(selected) ? [...selected] : [];
  return `
    <div class="cn-msdrop" id="${id}">
      <button type="button" class="cn-msdrop-trigger" onclick="_cnMsToggleOpen('${id}')">
        <span class="cn-msdrop-label" id="${id}-label">${esc(_cnMsLabel(id, options))}</span>
        <span class="cn-msdrop-caret">▾</span>
      </button>
      <div class="cn-msdrop-panel" id="${id}-panel">
        ${options.map(o => `
          <label class="cn-msdrop-opt">
            <input type="checkbox" value="${esc(o.key)}" ${_cnMultiState[id].includes(o.key) ? 'checked' : ''} onchange="_cnMsOptionChange('${id}', '${o.key}', this.checked)">
            <span class="cn-msdrop-tick">✓</span>
            <span>${o.emoji ? o.emoji + ' ' : ''}${esc(o.label)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function _cnMsLabel(id, options) {
  const sel = _cnMultiState[id] || [];
  if (!sel.length) return 'Select…';
  if (sel.length <= 2) return sel.map(k => (options.find(o => o.key === k) || {}).label || k).join(', ');
  return `${sel.length} selected`;
}

function _cnMsOptionChange(id, key, checked) {
  const sel = _cnMultiState[id] || (_cnMultiState[id] = []);
  const i = sel.indexOf(key);
  if (checked && i === -1) sel.push(key);
  if (!checked && i !== -1) sel.splice(i, 1);
  const labelEl = document.getElementById(`${id}-label`);
  if (labelEl) {
    const options = id.includes('Niches') ? CONNECT_NICHES : CONNECT_PLATFORMS;
    labelEl.textContent = _cnMsLabel(id, options);
  }
  // The creator profile form needs to know the moment platforms are
  // ticked/unticked, so it can show a follower-count input only for
  // platforms actually selected. See _cnRenderFollowerInputs().
  if (id === 'cnCpPlatforms' && typeof _cnRenderFollowerInputs === 'function') {
    _cnRenderFollowerInputs();
  }
}

function _cnMsToggleOpen(id) {
  const panel = document.getElementById(`${id}-panel`);
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  // Close every other open dropdown first.
  document.querySelectorAll('.cn-msdrop-panel.open').forEach(p => p.classList.remove('open'));
  if (willOpen) panel.classList.add('open');
}

function _cnMultiSelectValue(id) {
  return (_cnMultiState[id] || []).join(',');
}

// Close any open multi-select dropdown when clicking elsewhere on the page.
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('.cn-msdrop')) return;
  document.querySelectorAll('.cn-msdrop-panel.open').forEach(p => p.classList.remove('open'));
});

// ─── Terms of Service ───────────────────────────────────────────────────────
// The ToS text, checkbox definitions (CONNECT_CREATOR_TOS_CHECKS /
// CONNECT_BUSINESS_TOS_CHECKS) and rendered HTML (CONNECT_TOS_HTML) now
// live in connect-tos.js, which must be loaded before this file. See
// _cnOpenTos() and _cnRenderJoinScreen() below for where they're used.

// Plain everyday words — most users are first-timers on a phone, so a
// status should say what is happening, not use marketplace jargon.
const CN_STATUS_LABELS = {
  draft: 'Not live — budget not paid', published: 'Live · budget secured', awaiting_fund: 'Waiting for payment',
  funded: 'Hired · work in progress', submitted: 'Waiting for approval', under_review: 'Waiting for approval',
  disputed: 'EndaViral is reviewing', completed: 'Done', cancelled: 'Closed · refunded', expired: 'Expired · refunded', archived: 'Archived',
  // CampaignApplication statuses — shares this pill/map since applications
  // render right alongside campaigns in several places.
  pending: 'Sent · waiting', accepted: 'Shortlisted ⭐', rejected: 'Not chosen',
  withdrawn: 'Withdrawn', hired: 'Hired ✓', not_selected: 'Someone else got it',
};
const CN_STATUS_COLORS = {
  draft: '#7a8fad', published: '#2196f3', awaiting_fund: '#ff7043', funded: '#3dd44a',
  submitted: '#2196f3', under_review: '#2196f3', disputed: '#e53935', completed: '#3dd44a',
  cancelled: '#7a8fad', expired: '#7a8fad', archived: '#7a8fad',
  pending: '#7a8fad', accepted: '#ffb020', rejected: '#e53935',
  withdrawn: '#7a8fad', hired: '#3dd44a', not_selected: '#e53935',
};

function _cnStatusPill(status) {
  const color = CN_STATUS_COLORS[status] || '#7a8fad';
  const label = CN_STATUS_LABELS[status] || status;
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px;background:${color}1f;color:${color};border:1px solid ${color}40;"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;"></span>${esc(label)}</span>`;
}

// ─── One-time scoped styles ────────────────────────────────────────────────
function _cnInjectStyles() {
  if (document.getElementById('cnStyles')) return;
  const style = document.createElement('style');
  style.id = 'cnStyles';
  style.textContent = `
    /* Role-based accent — set on #sec-connect via data-cn-role, everything
       downstream (tabs, cards, journey guide, role toggle) reads these two
       variables instead of hardcoding blue/orange in a dozen places. */
    #sec-connect{--cn-accent:#2196f3;--cn-accent-dark:#1670c2;--cn-accent-soft:rgba(33,150,243,.14);}
    #sec-connect[data-cn-role="business"]{--cn-accent:#ff7043;--cn-accent-dark:#e0562b;--cn-accent-soft:rgba(255,112,67,.14);}

    /* ── Hero ─────────────────────────────────────────────────────────── */
    .cn-hero{position:relative;overflow:hidden;border-radius:20px;padding:30px 30px 26px;margin-bottom:16px;background:
        radial-gradient(circle at 15px 15px, rgba(255,255,255,.05) 1.5px, transparent 1.5px),
        linear-gradient(135deg,#0f1f2e 0%,#13253a 55%,#0d1a26 100%);
      background-size:26px 26px, 100% 100%;border:1px solid var(--border);box-shadow:0 18px 40px -22px rgba(0,0,0,.6);}
    .cn-hero::after{content:'';position:absolute;top:-90px;right:-90px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,var(--cn-accent) 0%,transparent 70%);opacity:.16;pointer-events:none;transition:background .25s;}
    .cn-hero::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--cn-accent),transparent);}
    .cn-hero-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--cn-accent);margin-bottom:12px;position:relative;background:var(--cn-accent-soft);border:1px solid var(--cn-accent);border-radius:20px;padding:5px 12px;}
    .cn-hero-title{font-size:23px;font-weight:900;color:var(--white);margin-bottom:9px;letter-spacing:-.5px;line-height:1.22;max-width:560px;position:relative;font-family:var(--font-display);}
    .cn-hero-sub{font-size:12.5px;color:#a9bccd;line-height:1.65;max-width:560px;margin-bottom:18px;position:relative;}
    .cn-hero-badges{display:flex;gap:8px;flex-wrap:wrap;position:relative;}
    .cn-hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:20px;padding:7px 13px;font-size:10.5px;font-weight:700;color:#c3d3e0;transition:border-color .15s,background .15s;}
    .cn-hero-badge:hover{border-color:var(--cn-accent);background:var(--cn-accent-soft);}

    /* ── Role toggle (segmented control) — only shown once both sides are
       joined, or before either is chosen ────────────────────────────────*/
    .cn-role-toggle{display:flex;gap:4px;margin:16px 0 16px;background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:4px;}
    .cn-role-btn{flex:1;padding:12px;border-radius:10px;background:transparent;border:none;color:var(--muted);font-family:'Montserrat',sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;transition:all .18s;text-align:center;}
    .cn-role-btn:hover:not(.active){color:var(--white);}
    .cn-role-btn.active[data-role="creator"]{background:linear-gradient(135deg,#2196f3,#1670c2);color:#fff;box-shadow:0 4px 14px rgba(33,150,243,.3);}
    .cn-role-btn.active[data-role="business"]{background:linear-gradient(135deg,#ff7043,#e0562b);color:#fff;box-shadow:0 4px 14px rgba(255,112,67,.3);}

    /* ── Single-role identity row — replaces the toggle once a user has
       joined exactly one side, so they only ever see their own profile
       plus a quiet, explicit opt-in for the other side ──────────────────*/
    .cn-addrole-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 16px;padding:10px 14px;background:var(--navy);border:1px solid var(--border);border-radius:14px;}
    .cn-addrole-current{font-size:12px;font-weight:800;color:var(--white);}
    .cn-addrole-btn{background:transparent;border:1px solid var(--cn-accent);color:var(--cn-accent);border-radius:10px;padding:8px 14px;font-size:11.5px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;white-space:nowrap;}
    .cn-addrole-btn:hover{background:var(--cn-accent-soft);}

    /* ── "How it works" journey guide — short, literal step-by-step ─────*/
    .cn-guide-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
    .cn-guide-title{font-size:10.5px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted);}
    .cn-guide-toggle-btn{background:none;border:none;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 2px;}
    .cn-guide-toggle-btn:hover{color:var(--white);}
    .cn-journey{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;position:relative;}
    .cn-journey-step{position:relative;background:linear-gradient(180deg,var(--card),var(--navy));border:1px solid var(--border);border-radius:14px;padding:16px 14px;transition:transform .15s,border-color .15s;}
    .cn-journey-step:hover{transform:translateY(-2px);border-color:var(--cn-accent);}
    .cn-journey-num{width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;margin-bottom:10px;color:#fff;background:linear-gradient(135deg,var(--cn-accent),var(--cn-accent-dark));box-shadow:0 4px 10px -2px var(--cn-accent-soft);}
    .cn-journey-step-title{font-size:12px;font-weight:800;color:var(--white);margin-bottom:4px;line-height:1.3;}
    .cn-journey-step-desc{font-size:11px;color:var(--muted);line-height:1.5;}
    @media (max-width:900px){ .cn-journey{grid-template-columns:repeat(2,1fr);} }
    @media (max-width:520px){ .cn-journey{grid-template-columns:1fr;} }

    /* ── Landing chooser — the neutral, role-agnostic first screen shown
       to a brand-new visitor before they pick Creator or Business. Not
       tinted to either accent colour; uses the brand gold instead ─────*/
    .cn-landing-hero{position:relative;overflow:hidden;border-radius:22px;padding:40px 32px 34px;margin-bottom:22px;text-align:center;background:
        radial-gradient(circle at 20% 20%, rgba(34,211,238,.10), transparent 45%),
        radial-gradient(circle at 80% 30%, rgba(255,176,32,.10), transparent 45%),
        linear-gradient(160deg,#0d1826 0%,#101f30 60%,#0c1622 100%);
      border:1px solid var(--border);box-shadow:0 22px 50px -26px rgba(0,0,0,.65);}
    .cn-landing-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);background:rgba(255,176,32,.12);border:1px solid rgba(255,176,32,.35);border-radius:20px;padding:7px 16px;margin-bottom:16px;}
    .cn-landing-title{font-size:27px;font-weight:900;color:var(--white);letter-spacing:-.6px;line-height:1.2;max-width:640px;margin:0 auto 12px;font-family:var(--font-display);}
    .cn-landing-title span{background:linear-gradient(135deg,var(--cyan),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent;}
    .cn-landing-sub{font-size:13px;color:#a9bccd;line-height:1.7;max-width:520px;margin:0 auto 20px;}
    .cn-landing-badges{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;}
    .cn-landing-badges .cn-hero-badge{background:rgba(255,255,255,.045);}

    .cn-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;}
    @media (max-width:760px){ .cn-choice-grid{grid-template-columns:1fr;} }
    .cn-choice-card{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:26px 24px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;display:flex;flex-direction:column;}
    .cn-choice-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px -20px rgba(0,0,0,.55);}
    .cn-choice-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
    .cn-choice-card--creator::before{background:linear-gradient(90deg,#2196f3,#1670c2);}
    .cn-choice-card--business::before{background:linear-gradient(90deg,#ff7043,#e0562b);}
    .cn-choice-card--creator:hover{border-color:#2196f3;}
    .cn-choice-card--business:hover{border-color:#ff7043;}
    .cn-choice-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}
    .cn-choice-card--creator .cn-choice-icon{background:linear-gradient(135deg,rgba(33,150,243,.18),rgba(22,112,194,.1));border:1px solid rgba(33,150,243,.35);}
    .cn-choice-card--business .cn-choice-icon{background:linear-gradient(135deg,rgba(255,112,67,.18),rgba(224,86,43,.1));border:1px solid rgba(255,112,67,.35);}
    .cn-choice-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px;}
    .cn-choice-card--creator .cn-choice-eyebrow{color:#4fa8f5;}
    .cn-choice-card--business .cn-choice-eyebrow{color:#ff8a63;}
    .cn-choice-title{font-size:18px;font-weight:900;color:var(--white);margin-bottom:6px;letter-spacing:-.3px;}
    .cn-choice-sub{font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:16px;}
    .cn-choice-list{list-style:none;padding:0;margin:0 0 20px;display:flex;flex-direction:column;gap:9px;flex:1;}
    .cn-choice-list li{display:flex;align-items:flex-start;gap:9px;font-size:12px;color:#c3d3e0;line-height:1.5;}
    .cn-choice-list li::before{content:'✓';flex-shrink:0;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;margin-top:1px;}
    .cn-choice-card--creator .cn-choice-list li::before{background:rgba(33,150,243,.18);color:#4fa8f5;}
    .cn-choice-card--business .cn-choice-list li::before{background:rgba(255,112,67,.18);color:#ff8a63;}
    .cn-choice-cta{border:none;border-radius:12px;padding:13px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;font-family:'Montserrat',sans-serif;transition:filter .15s;width:100%;}
    .cn-choice-cta:hover{filter:brightness(1.1);}
    .cn-choice-card--creator .cn-choice-cta{background:linear-gradient(135deg,#2196f3,#1670c2);box-shadow:0 8px 20px -8px rgba(33,150,243,.5);}
    .cn-choice-card--business .cn-choice-cta{background:linear-gradient(135deg,#ff7043,#e0562b);box-shadow:0 8px 20px -8px rgba(255,112,67,.5);}
    .cn-landing-foot{display:flex;align-items:center;justify-content:center;gap:8px;font-size:11.5px;color:var(--muted);text-align:center;}

    /* ── Landing stats strip — quietly hidden if no data is available;
       never shows fabricated numbers ────────────────────────────────*/
    .cn-landing-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
    .cn-landing-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 14px;text-align:center;}
    .cn-landing-stat-num{font-family:var(--font-display);font-size:19px;font-weight:900;color:var(--gold);letter-spacing:-.3px;margin-bottom:3px;}
    .cn-landing-stat-label{font-size:10.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
    @media (max-width:760px){ .cn-landing-stats{grid-template-columns:repeat(2,1fr);} }

    /* ── How it works — one shared timeline covering both sides ─────────*/
    .cn-landing-section-lbl{font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);text-align:center;margin-bottom:16px;}
    .cn-timeline{display:flex;align-items:stretch;gap:0;margin-bottom:26px;overflow-x:auto;padding-bottom:4px;}
    .cn-timeline-step{flex:1;min-width:118px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 6px;position:relative;}
    .cn-timeline-dot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--card);border:1px solid var(--border);margin-bottom:9px;flex-shrink:0;}
    .cn-timeline-step[data-who="business"] .cn-timeline-dot{border-color:rgba(255,112,67,.4);background:rgba(255,112,67,.1);}
    .cn-timeline-step[data-who="creator"] .cn-timeline-dot{border-color:rgba(33,150,243,.4);background:rgba(33,150,243,.1);}
    .cn-timeline-step[data-who="system"] .cn-timeline-dot{border-color:rgba(255,176,32,.4);background:rgba(255,176,32,.1);}
    .cn-timeline-arrow{position:absolute;top:17px;left:-6px;color:var(--border);font-size:14px;}
    .cn-timeline-step:first-child .cn-timeline-arrow{display:none;}
    .cn-timeline-label{font-size:11px;font-weight:800;color:var(--white);margin-bottom:2px;line-height:1.3;}
    .cn-timeline-who{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);}
    @media (max-width:760px){ .cn-timeline{flex-direction:column;align-items:flex-start;overflow-x:visible;}
      .cn-timeline-step{flex-direction:row;align-items:center;text-align:left;width:100%;padding:8px 0;gap:12px;}
      .cn-timeline-arrow{display:none !important;}
      .cn-timeline-dot{margin-bottom:0;}
    }

    /* ── Trust row — plain reassurance line beneath the choice cards ────*/
    .cn-trust-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:8px;}
    .cn-trust-item{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#c3d3e0;font-weight:600;}
    .cn-trust-item b{color:var(--green);font-weight:700;}

    /* ── Tab nav (pills) ──────────────────────────────────────────────── */
    .cn-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
    .cn-tab{padding:9px 15px;border-radius:24px;background:var(--card);border:1px solid var(--border);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0;}
    .cn-tab:hover:not(.active){border-color:rgba(255,255,255,.22);color:var(--white);}
    .cn-tab.active{background:var(--cn-accent-soft);border-color:var(--cn-accent);color:var(--white);}
    /* Phones: every tab visible at once in a tidy grid. The old sideways-
       scrolling strip hid "Profile" off-screen (people never found it) and
       its negative margin pushed the whole page 4px wider than the screen,
       so the page wobbled sideways when scrolled. */
    @media(max-width:768px){
      .cn-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
      .cn-tab{white-space:normal;text-align:center;padding:10px 6px;font-size:12px;line-height:1.25;min-height:44px;display:flex;align-items:center;justify-content:center;}
    }

    /* ── Cards ────────────────────────────────────────────────────────── */
    .cn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;}
    .cn-card{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px 16px 16px 19px;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}
    .cn-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cn-accent);opacity:.75;}
    .cn-card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.2);box-shadow:0 12px 28px rgba(0,0,0,.35);}
    .cn-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px;}
    .cn-card-title{font-size:14px;font-weight:800;color:var(--white);line-height:1.35;}
    .cn-card-budget{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:900;color:var(--green);white-space:nowrap;background:rgba(61,212,74,.12);padding:3px 10px;border-radius:20px;}
    .cn-card-desc{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .cn-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted);}
    .cn-tag{background:var(--navy);border:1px solid var(--border);border-radius:20px;padding:3px 9px;font-size:10.5px;font-weight:700;}
    .cn-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--cn-accent),var(--cn-accent-dark));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0;}
    .cn-card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}

    /* ── Empty states — an invitation to act, not a dead end ────────────*/
    .cn-empty{padding:44px 22px;text-align:center;color:var(--muted);font-size:12.5px;background:var(--card);border:1px dashed var(--border);border-radius:16px;line-height:1.6;}
    .cn-empty-icon{font-size:28px;display:block;margin-bottom:10px;}
    .cn-empty-title{font-size:13.5px;font-weight:800;color:var(--white);margin-bottom:5px;}

    /* ── Gate screen — a blocking "finish this before you continue" step
       (e.g. incomplete profile). Distinct from cn-empty's plain "nothing
       here" treatment: it's an action prompt, not an absence, so it gets
       the same accent-lit, top-border-glow language as the hero cards ──*/
    .cn-gate{position:relative;overflow:hidden;text-align:center;padding:42px 26px;border-radius:18px;background:linear-gradient(180deg,var(--card),var(--navy));border:1px solid var(--border);box-shadow:0 18px 40px -26px rgba(0,0,0,.6);}
    .cn-gate::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cn-accent),var(--cn-accent-dark));}
    .cn-gate-icon{width:58px;height:58px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 18px;background:var(--cn-accent-soft);border:1px solid var(--cn-accent);}
    .cn-gate-title{font-size:16px;font-weight:900;color:var(--white);margin-bottom:9px;letter-spacing:-.2px;}
    .cn-gate-sub{font-size:12.5px;color:var(--muted);line-height:1.65;max-width:440px;margin:0 auto 22px;}
    .cn-gate-btn{border:none;border-radius:12px;padding:13px 26px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;font-family:'Montserrat',sans-serif;background:linear-gradient(135deg,var(--cn-accent),var(--cn-accent-dark));box-shadow:0 8px 20px -8px var(--cn-accent-soft);transition:filter .15s,transform .15s;}
    .cn-gate-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}

    .cn-section-lbl{font-size:10.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:18px 0 8px;}
    .cn-tip{display:flex;gap:8px;align-items:flex-start;background:var(--cn-accent-soft);border:1px solid var(--border);border-radius:12px;padding:10px 12px;font-size:11.5px;color:#c3d3e0;line-height:1.5;margin-bottom:14px;}
    .cn-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .cn-row:last-child{border-bottom:none;}
    .cn-row .k{color:var(--muted);}
    .cn-row .v{color:var(--white);font-weight:700;text-align:right;}
    .cn-app-row{background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px;}
    .cn-app-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .cn-app-bid{font-family:'Montserrat',sans-serif;font-weight:800;color:var(--green);font-size:14px;}
    .cn-app-actions{display:flex;gap:8px;margin-top:10px;}
    .cn-btn-sm{flex:1;padding:8px;border-radius:8px;border:none;font-size:11.5px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;}
    .cn-btn-accept{background:var(--green);color:#000;}
    .cn-btn-reject{background:rgba(229,57,53,.14);color:#ff8a80;border:1px solid rgba(229,57,53,.3) !important;}
    .cn-field{margin-bottom:14px;}
    .cn-field label{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;}
    .cn-field input,.cn-field textarea,.cn-field select{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--white);font-size:13px;font-family:inherit;transition:border-color .15s;}
    .cn-field input:focus,.cn-field textarea:focus,.cn-field select:focus{outline:none;border-color:var(--cn-accent);}
    .cn-field textarea{resize:vertical;min-height:70px;}

    /* ── Per-platform follower/subscriber inputs (creator profile) ──────── */
    .cn-cp-followers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
    .cn-cp-follower-row{background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:8px 10px;}
    .cn-cp-follower-label{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:5px;}
    .cn-cp-follower-row input{width:100%;background:transparent;border:none;padding:0;color:var(--white);font-size:14px;font-family:inherit;}
    .cn-cp-follower-row input:focus{outline:none;}

    /* ── Multi-select-with-ticks dropdown (Niches / Platforms) ─────────*/
    .cn-msdrop{position:relative;}
    .cn-msdrop-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--white);font-size:13px;font-family:inherit;cursor:pointer;text-align:left;}
    .cn-msdrop-trigger:hover{border-color:rgba(255,255,255,.3);}
    .cn-msdrop-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--white);}
    .cn-msdrop-caret{color:var(--muted);flex-shrink:0;}
    .cn-msdrop-panel{display:none;position:absolute;z-index:40;top:calc(100% + 6px);left:0;right:0;max-height:240px;overflow-y:auto;background:var(--card2,var(--card));border:1px solid var(--border);border-radius:12px;padding:6px;box-shadow:0 14px 30px rgba(0,0,0,.4);}
    .cn-msdrop-panel.open{display:block;}
    .cn-msdrop-opt{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:8px;font-size:12.5px;color:var(--white);cursor:pointer;}
    .cn-msdrop-opt:hover{background:rgba(255,255,255,.05);}
    .cn-msdrop-opt input{position:absolute;opacity:0;width:0;height:0;}
    .cn-msdrop-tick{width:16px;height:16px;flex-shrink:0;border-radius:4px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10.5px;color:transparent;background:var(--navy);}
    .cn-msdrop-opt input:checked ~ .cn-msdrop-tick{background:var(--cn-accent);border-color:var(--cn-accent);color:#fff;}
    /* ── Campaign summary — description + scannable chip row, replaces the
       old stack of individual key/value rows (budget / deliverables / min
       followers / niche / guidelines each on their own line) which read
       like a spec sheet instead of a campaign brief ─────────────────────*/
    .cn-summary-card{background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:16px;}
    .cn-chip-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
    .cn-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:20px;padding:5px 11px;font-size:11.5px;font-weight:700;color:var(--white);white-space:nowrap;}
    .cn-chip-money{background:rgba(61,212,74,.12);border-color:rgba(61,212,74,.3);color:var(--green);}

    /* ── Section headers used above the Applications & Chat cards ───────*/
    .cn-card-header{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin:18px 2px 8px;}
    .cn-card-header-count{background:var(--cn-accent-soft);color:var(--cn-accent);border-radius:10px;padding:1px 8px;font-size:10.5px;}

    /* ── Applications inbox — its own bordered card, separate from both
       the campaign summary above and the chat below ────────────────────*/
    .cn-apps-card{background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:4px;}
    .cn-apps-subhead{font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;}
    .cn-apps-subhead-active{color:var(--green);}
    .cn-app-row:last-child, .cn-neg-row:last-child{margin-bottom:0;}

    /* ── Applications list rows — pending bids + active (accepted)
       negotiations shown as distinct, clickable rows ────────────────────*/
    .cn-neg-row{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 14px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;transition:border-color .15s;}
    .cn-neg-row:hover{border-color:var(--cn-accent);}
    .cn-neg-row-name{font-size:12.5px;font-weight:800;color:var(--white);}
    .cn-neg-row-sub{font-size:11px;color:var(--muted);margin-top:2px;}
    .cn-neg-row-amt{font-family:'Montserrat',sans-serif;font-weight:800;color:var(--green);font-size:13.5px;white-space:nowrap;}
    .cn-app-row{background:var(--card);}

    /* ── Chat card — the whole conversation (thread picker / messages /
       deal panel / composer) lives inside ONE bordered container with its
       own header, so it reads as a single self-contained panel instead of
       bleeding into the applications list above it ─────────────────────*/
    .cn-chat-card{background:var(--navy);border:1px solid var(--border);border-radius:16px;padding:14px;margin-top:16px;}
    .cn-chat-card-head{font-size:12px;font-weight:800;color:var(--white);margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);}

    .cn-msgs{max-height:360px;overflow-y:auto;padding:4px 2px;margin-bottom:12px;}
    .cn-msg-daydiv{text-align:center;margin:14px 0 10px;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);}
    .cn-msg{display:flex;align-items:flex-end;gap:8px;margin-bottom:12px;max-width:82%;}
    .cn-msg-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
    .cn-msg-body .who{font-size:10px;font-weight:700;color:var(--muted);margin-bottom:3px;}
    .cn-msg .bubble{background:var(--card);border:1px solid var(--border);border-radius:14px;border-bottom-left-radius:4px;padding:9px 13px;font-size:12.5px;color:var(--white);line-height:1.45;}
    .cn-msg.mine{margin-left:auto;flex-direction:row-reverse;}
    .cn-msg.mine .bubble{background:var(--cn-accent-soft);border-color:var(--cn-accent);border-bottom-left-radius:14px;border-bottom-right-radius:4px;}

    /* ── System-style cards (price offers, fund prompts, timeline events,
       not-selected notices) — visually distinct from normal chat bubbles
       and from each other, so "what happened" never looks like "what
       someone typed" ─────────────────────────────────────────────────*/
    .cn-msg-card{text-align:center;margin:4px auto 14px;max-width:92%;border-radius:12px;padding:10px 14px;font-size:11.5px;color:var(--white);line-height:1.5;}
    .cn-msg-card-title{font-weight:700;margin-bottom:8px;}
    .cn-msg-card-title span{color:var(--green);font-weight:900;}
    .cn-msg-card-waiting{font-size:10.5px;color:var(--muted);font-style:italic;}
    .cn-msg-card .cn-btn-sm{width:auto;padding:7px 16px;flex:none;}
    .cn-msg-card-offer{background:rgba(255,193,7,.08);border:1px solid rgba(255,193,7,.3);}
    .cn-msg-card-offer .cn-msg-card-title span{color:#ffca28;}
    .cn-msg-card-fund{background:rgba(76,175,80,.08);border:1px solid rgba(76,175,80,.3);}
    .cn-msg-card-timeline{background:rgba(33,150,243,.1);border:1px solid rgba(33,150,243,.25);}
    .cn-msg-card-lost{background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);color:#ff8a80;}

    /* ── Deal panel — negotiation banner + fund bar fused into one card,
       replaces the old separate "NEGOTIATE PRICE" / "FUND CAMPAIGN TO
       START" boxes duplicating info the chat bubbles already show ──────*/
    .cn-deal-panel{border:1px solid rgba(76,175,80,.3);border-radius:12px;overflow:hidden;margin-bottom:10px;}
    .cn-neg-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(76,175,80,.1);padding:11px 14px;}
    .cn-neg-banner-who{font-size:12px;font-weight:800;color:var(--white);}
    .cn-neg-banner-who .sub{display:block;font-size:10.5px;font-weight:600;color:var(--muted);margin-top:1px;}
    .cn-neg-banner-amt{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:900;color:var(--green);white-space:nowrap;}
    .cn-neg-banner-orig{font-size:10.5px;color:var(--muted);font-weight:600;}
    .cn-fund-row{display:flex;gap:8px;padding:10px 12px;background:rgba(76,175,80,.04);border-top:1px dashed rgba(76,175,80,.25);}
    .cn-fund-phone{flex:1;background:var(--navy);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--white);font-size:12.5px;font-family:inherit;}
    .cn-fund-phone:focus{outline:none;border-color:var(--green);}
    .cn-fund-btn{flex-shrink:0;background:linear-gradient(135deg,#3dd44a,#28a035);color:#fff;border:none;border-radius:9px;padding:0 16px;font-size:12px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;}

    /* Standalone banner not inside a deal panel (e.g. creator side, which
       never sees the fund bar) still gets rounded corners + a border. */
    .cn-neg-banner:only-child{border-radius:12px;border:1px solid rgba(76,175,80,.3);margin-bottom:10px;}

    /* ── Not-selected / declined banner (outside the chat, e.g. as a
       standalone action-card notice) ─────────────────────────────────*/
    .cn-lost-banner{display:flex;align-items:center;gap:9px;background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);border-radius:12px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#ff8a80;}

    /* ── Message input row w/ inline price-offer toggle ─────────────────*/
    .cn-msg-input-row{display:flex;gap:8px;align-items:flex-end;}
    .cn-msg-input-row input[type=text]{flex:1;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:10px 16px;color:var(--white);font-size:12.5px;font-family:inherit;}
    .cn-msg-input-row input[type=text]:focus{outline:none;border-color:var(--cn-accent);}
    .cn-msg-input-row .btn-secondary{border-radius:20px;padding:10px 18px;}
    .cn-propose-toggle{background:var(--card);border:1px solid var(--border);border-radius:50%;width:38px;height:38px;flex-shrink:0;font-size:15px;cursor:pointer;color:var(--muted);transition:all .15s;}
    .cn-propose-toggle:hover,.cn-propose-toggle.active{border-color:var(--green);color:var(--green);background:rgba(76,175,80,.08);}
    .cn-propose-row{display:none;gap:8px;margin-bottom:8px;}
    .cn-propose-row.open{display:flex;}
    .cn-propose-row input{flex:1;background:var(--card);border:1px solid var(--green);border-radius:10px;padding:9px 12px;color:var(--white);font-size:12.5px;font-family:inherit;}

    .cn-stars{display:flex;gap:6px;font-size:24px;margin-bottom:10px;}
    .cn-star{cursor:pointer;opacity:.3;transition:opacity .1s;}
    .cn-star.on{opacity:1;}

    /* ── Join / onboarding screen ─────────────────────────────────────── */
    .cn-join-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px;}
    .cn-join-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--cn-accent);margin-bottom:10px;}
    /* position:relative was missing here, so the input below (position:
       absolute) had no scoped ancestor to anchor to and escaped to
       whichever container up the tree WAS positioned — landing well
       outside this row. Also swapped the input from a 0×0 phantom (click
       target relies entirely on browser label pass-through, which is
       fragile with an absolutely-positioned-and-mislocated control) to a
       real input stretched over the FULL row, so the whole thing — icon,
       text, padding — is one large, reliable, natively-tappable target. */
    .cn-join-check,.cn-confirm-row{position:relative;display:flex;gap:11px;align-items:center;font-size:12px;color:var(--white);margin-bottom:11px;cursor:pointer;line-height:1.5;padding:11px 14px;border-radius:12px;background:var(--navy);border:1px solid var(--border);transition:all .15s;}
    .cn-join-check:hover,.cn-confirm-row:hover{border-color:rgba(255,255,255,.25);}
    .cn-join-check.checked,.cn-confirm-row.checked{background:var(--cn-accent-soft);border-color:var(--cn-accent);}
    .cn-join-check input,.cn-confirm-row input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;}
    .cn-join-check a{color:var(--cn-accent);text-decoration:underline;position:relative;z-index:1;pointer-events:none;}
    .cn-select{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--white);font-size:13px;font-family:inherit;transition:border-color .15s;}
    .cn-select:focus{outline:none;border-color:var(--cn-accent);}

    /* ── Form cards — groups related fields (profile forms, campaign
       create form) into distinct, bordered sections with an icon+title
       head, instead of one long undifferentiated stack of .cn-field
       rows ─────────────────────────────────────────────────────────── */
    .cn-form-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 22px;margin-bottom:16px;}
    .cn-form-card-head{display:flex;align-items:center;gap:11px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border);}
    .cn-form-card-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--cn-accent-soft);border:1px solid var(--cn-accent);flex-shrink:0;}
    .cn-form-card-title{font-size:13.5px;font-weight:800;color:var(--white);}
    .cn-form-card-sub{font-size:11px;color:var(--muted);margin-top:1px;}
    .cn-form-card .cn-field:last-child{margin-bottom:0;}

    .cn-profile-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;}
    .cn-profile-stat{background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px 10px;text-align:center;}
    .cn-profile-stat-val{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:900;color:var(--white);}
    .cn-profile-stat-lbl{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-top:3px;}

    /* ── Compact inputs — dense inline rows in admin tools (outreach log,
       payout receipt entry, dispute notes) where a full-size .cn-field
       would be too tall, but still needs a real focus state + consistent
       radius instead of raw one-off inline CSS ──────────────────────── */
    .cn-input-compact{background:var(--navy);border:1px solid var(--border);border-radius:9px;padding:8px 10px;color:var(--white);font-size:11.5px;font-family:inherit;transition:border-color .15s;}
    .cn-input-compact:focus{outline:none;border-color:var(--cn-accent);}
    select.cn-input-compact{cursor:pointer;}
    .cn-join-item{position:relative;display:flex;gap:12px;align-items:center;padding:13px 14px;border-radius:12px;background:var(--navy);margin-bottom:8px;cursor:pointer;transition:all .15s;border:1px solid var(--border);}
    .cn-join-item:hover{border-color:rgba(255,255,255,.25);}
    .cn-join-item.checked{background:var(--cn-accent-soft);border-color:var(--cn-accent);}
    .cn-join-item input{position:absolute;opacity:0;width:0;height:0;}
    .cn-join-tick{width:19px;height:19px;flex-shrink:0;border-radius:6px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:transparent;background:var(--card);transition:all .15s;}
    .cn-join-item.checked .cn-join-tick,.cn-join-check.checked .cn-join-tick{background:var(--cn-accent);border-color:var(--cn-accent);color:#fff;}
    .cn-join-icon-badge{width:30px;height:30px;flex-shrink:0;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;background:rgba(255,255,255,.05);border:1px solid var(--border);transition:all .15s;}
    .cn-join-item.checked .cn-join-icon-badge{background:rgba(255,255,255,.1);border-color:var(--cn-accent);}
    .cn-join-text{font-size:12px;color:var(--white);line-height:1.5;}
    .cn-tos-body{font-size:12px;line-height:1.7;color:var(--muted);max-height:56vh;overflow-y:auto;padding-right:8px;margin-bottom:16px;}
    .cn-tos-body h4{color:var(--white);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:18px 0 6px;}
    .cn-tos-body h4:first-child{margin-top:0;}
    .cn-tos-body h5{color:var(--white);font-size:12px;font-weight:700;margin:10px 0 4px;}
    .cn-tos-body p{margin:0 0 8px;}
    .cn-tos-body ul{margin:0 0 8px;padding-left:18px;}
    .cn-tos-body li{margin-bottom:3px;}
    .cn-tos-updated{font-size:10.5px;color:var(--muted);margin-bottom:10px;}
    .cn-tos-example{background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:11.5px;}
    .cn-tos-check-summary{background:transparent;border:none;padding:0;margin-top:4px;}

    /* ── Bids inbox (business, published campaign) — full workspace ────
       Three panes that all stay mounted at once (rail | list | detail):
       triaging bid #900 never costs more clicks than triaging bid #9,
       because nothing here is a modal-over-a-modal — selecting a row
       just repaints the detail pane beside it. Below 768px the rail
       and detail pane slide in over the list, toggled by data-view so
       the underlying DOM never changes shape between breakpoints. ────*/
    #cnBidsModalBody{flex:1;min-height:0;display:flex;flex-direction:column;}

    /* ── Bid chat header + pay button — still rendered by bids.js's
       _cnOpenBidChat/_cnRenderBidChatActionCard into the reparented
       #cnBidsModalBody above. Everything else that used to style the old
       list/rail/toolbar-in-a-modal UI now lives in bids.js's own
       .bw-* styles instead. ──────────────────────────────────────────*/
    .cn-bidchat-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;}
    .cn-bidchat-back{background:var(--navy);border:1px solid var(--border);color:var(--muted);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0;display:none;align-items:center;justify-content:center;}
    .cn-bidchat-back:hover{color:var(--white);border-color:var(--cn-accent);}
    .cn-bidchat-title{font-size:14px;font-weight:800;color:var(--white);}
    .cn-bidchat-sub{font-size:11px;color:var(--muted);margin-top:1px;}
    .cn-bidchat-scroll{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 0;}
    .cn-pay-btn{width:100%;background:linear-gradient(135deg,#3dd44a,#28a035);color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;margin-bottom:10px;}

    @media(max-width:768px){
      .cn-bidchat-back{display:flex;}
    }

    /* ── Pay sheet (final confirm step, opened only on Pay tap) ───────── */
    .cn-paysheet-amt{text-align:center;padding:6px 0 18px;}
    .cn-paysheet-amt-val{font-family:'Montserrat',sans-serif;font-size:30px;font-weight:900;color:var(--green);}
    .cn-paysheet-amt-lbl{font-size:11.5px;color:var(--muted);margin-top:4px;}
    .cn-paysheet-amt-input{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:9px;
      padding:10px 12px;color:var(--green);font-family:'Montserrat',sans-serif;font-size:18px;font-weight:800;}
    .cn-paysheet-amt-input:focus{outline:none;border-color:var(--green);}
    .cn-paysheet-amt-hint{font-size:11px;color:var(--muted);line-height:1.5;margin-top:6px;}
    .cn-paysheet-field{margin-bottom:14px;}
    .cn-paysheet-field label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;}

    /* ── Small helpers added in the mobile/plain-language pass ─────────── */
    .cn-bids-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:14px 16px;}
    .cn-bids-summary .btn-primary{width:auto;margin-top:0;padding:12px 16px;}
    .cn-bids-summary-count{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:900;color:var(--white);line-height:1;}
    .cn-bids-summary-lbl{font-size:12px;color:var(--muted);margin-top:4px;}
    .cn-unread-pill{display:inline-flex;align-items:center;gap:4px;background:var(--green);color:#000;border-radius:20px;padding:3px 9px;font-size:11px;font-weight:800;}
    .cn-earn-hint{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5;}
    .cn-earn-hint b{color:var(--green);}
    .cn-safe-note{display:flex;gap:9px;align-items:flex-start;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.25);border-radius:12px;padding:11px 13px;font-size:12.5px;color:#c3d3e0;line-height:1.5;margin:10px 0 14px;}
    .cn-link-wrap{word-break:break-all;overflow-wrap:anywhere;}
    .cn-deliv-row{display:block;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .cn-deliv-row .k{display:block;color:var(--muted);font-size:11.5px;margin-bottom:3px;}
    .cn-fc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}
    .cn-fc-grid .cn-fc-input{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 10px;color:var(--white);font-size:13px;font-family:inherit;}
    .cn-step-hint{font-size:12.5px;color:#c3d3e0;line-height:1.55;background:var(--cn-accent-soft);border:1px solid var(--border);border-radius:12px;padding:11px 13px;margin-bottom:12px;}
    .cn-step-hint b{color:var(--white);}
    .cn-danger-link{display:block;width:100%;background:none;border:none;color:var(--muted);font-size:12.5px;text-decoration:underline;padding:12px 0 2px;cursor:pointer;font-family:inherit;}

    /* ── Phone layout pass (≤600px) — most customers are on phones ──────── */
    @media(max-width:600px){
      #sec-connect{padding-bottom:96px;}            /* room above the floating chat button */
      .cn-hero{padding:18px 16px 16px;border-radius:16px;}
      .cn-hero-title{font-size:19px;}
      .cn-hero-sub{font-size:13px;margin-bottom:0;}
      .cn-hero-eyebrow{font-size:10px;padding:4px 10px;margin-bottom:9px;}
      #sec-connect[data-cn-joined="1"] .cn-hero-sub{display:none;}
      .cn-landing-hero{padding:24px 16px 20px;}
      .cn-landing-title{font-size:22px;}
      .cn-choice-card{padding:20px 18px;}
      .cn-addrole-row{padding:10px 12px;}
      .cn-addrole-btn{padding:8px 10px;font-size:11.5px;}
      .cn-card{padding:14px 14px 14px 17px;}
      .cn-card-top{flex-wrap:wrap;}
      .cn-card-desc,.cn-app-row,.cn-row{font-size:13px;}
      .cn-form-card{padding:16px 14px;}
      .cn-field label{font-size:11.5px;}
      .cn-field input,.cn-field textarea,.cn-field select{font-size:16px;}   /* 16px stops iPhone auto-zoom on focus */
      .cn-msg-input-row input[type=text],.cn-fund-phone,.cn-propose-row input,.cn-paysheet-amt-input{font-size:16px;}
      .cn-msg{max-width:92%;}
      .cn-msg .bubble{font-size:14px;}
      .cn-msg-card{max-width:100%;font-size:12.5px;}
      .cn-msgs{max-height:55vh;}
      .cn-chat-card{padding:12px 10px;}
      .cn-fund-row{flex-direction:column;}
      .cn-fund-btn{padding:14px 16px;font-size:14px;}
      .cn-neg-banner-amt{font-size:15px;}
      .cn-bids-summary{flex-direction:column;align-items:stretch;text-align:center;}
      .cn-bids-summary .btn-primary{width:100%;}
      .cn-profile-stats{grid-template-columns:repeat(2,1fr);}
      .cn-tip,.cn-step-hint{font-size:12.5px;}
    }

    /* ════ v2 — pay up front · fixed price · account proof ═══════════════ */

    /* The vault: the one bold element. Shows money that is REALLY held —
       a lock seal, the amount in big tabular figures, and a fuse-like bar
       that burns down to the hire-by time. Everything else stays quiet. */
    .cn-vault{position:relative;overflow:hidden;border-radius:18px;padding:18px 18px 16px;margin-bottom:16px;
      background:linear-gradient(160deg,#0c2418 0%,#0f1d2b 70%);border:1px solid rgba(61,212,74,.35);}
    .cn-vault::after{content:'';position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(115deg,rgba(61,212,74,.035) 0 2px,transparent 2px 14px);}
    .cn-vault.is-open{background:linear-gradient(160deg,#241a0c 0%,#0f1d2b 70%);border-color:rgba(255,176,32,.4);}
    .cn-vault.is-open::after{background:repeating-linear-gradient(115deg,rgba(255,176,32,.04) 0 2px,transparent 2px 14px);}
    .cn-vault.is-done{background:var(--navy);border-color:var(--border);}
    .cn-vault-top{display:flex;align-items:center;gap:12px;position:relative;z-index:1;}
    .cn-vault-seal{width:46px;height:46px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;
      background:radial-gradient(circle at 35% 30%,#3dd44a,#1f7a2a);box-shadow:0 0 0 4px rgba(61,212,74,.15),0 8px 18px -6px rgba(61,212,74,.6);}
    .cn-vault.is-open .cn-vault-seal{background:radial-gradient(circle at 35% 30%,#ffc04d,#b9770b);box-shadow:0 0 0 4px rgba(255,176,32,.15);}
    .cn-vault.is-done .cn-vault-seal{background:var(--card);box-shadow:none;}
    .cn-vault-amt{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:900;color:var(--white);letter-spacing:-.6px;line-height:1;font-variant-numeric:tabular-nums;}
    .cn-vault-cap{font-size:12px;color:#b9cbbd;margin-top:5px;line-height:1.45;}
    .cn-vault.is-open .cn-vault-cap{color:#d9c9a6;}
    .cn-vault-fuse{position:relative;z-index:1;margin-top:14px;height:6px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden;}
    .cn-vault-fuse span{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#3dd44a,#c6f36b);}
    .cn-vault-fuse.low span{background:linear-gradient(90deg,#ff7043,#ffb020);}
    .cn-vault-meta{position:relative;z-index:1;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);margin-top:7px;}
    .cn-vault-actions{position:relative;z-index:1;display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
    .cn-vault-actions .btn-primary{width:auto;margin:0;flex:1 1 180px;}
    .cn-vault-actions .btn-secondary{flex:0 1 auto;}
    .cn-vault-breakdown{position:relative;z-index:1;margin-top:12px;font-size:12.5px;}
    .cn-vault-breakdown div{display:flex;justify-content:space-between;padding:3px 0;color:var(--muted);}
    .cn-vault-breakdown div b{color:var(--white);font-variant-numeric:tabular-nums;}
    .cn-vault-breakdown .tot{border-top:1px solid rgba(255,255,255,.1);margin-top:4px;padding-top:7px;color:var(--white);font-weight:800;}

    /* Discover cards */
    .cn-card-secured{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:var(--green);
      background:rgba(61,212,74,.1);border:1px solid rgba(61,212,74,.28);border-radius:20px;padding:3px 9px;}
    .cn-card-takehome{font-size:11.5px;color:var(--muted);margin:-4px 0 10px;}
    .cn-card-takehome b{color:var(--white);font-variant-numeric:tabular-nums;}
    .cn-card-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);}
    .cn-discover-bar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px;}
    .cn-discover-bar select{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:9px 10px;color:var(--white);font-family:inherit;font-size:12.5px;}

    /* Accept sheet (creator) */
    .cn-accept-hero{text-align:center;padding:6px 0 16px;}
    .cn-accept-hero .lbl{font-size:12px;color:var(--muted);}
    .cn-accept-hero .amt{font-family:'Montserrat',sans-serif;font-size:34px;font-weight:900;color:var(--green);letter-spacing:-1px;font-variant-numeric:tabular-nums;line-height:1.1;}
    .cn-accept-hero .sub{font-size:11.5px;color:var(--muted);margin-top:4px;}
    .cn-acc-row{display:grid;grid-template-columns:118px 1fr 92px 34px;gap:6px;align-items:center;margin-bottom:8px;}
    .cn-acc-row select,.cn-acc-row input{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 9px;color:var(--white);font-size:13px;font-family:inherit;}
    .cn-acc-row input:focus,.cn-acc-row select:focus{outline:none;border-color:var(--cn-accent);}
    .cn-acc-row input.bad{border-color:#e53935;}
    .cn-acc-x{background:none;border:1px solid var(--border);border-radius:10px;height:38px;color:var(--muted);cursor:pointer;}
    .cn-acc-hint{font-size:11px;color:var(--muted);margin:-3px 0 8px 2px;}
    .cn-link-btn{background:none;border:none;color:var(--cn-accent);font-weight:800;font-size:12.5px;cursor:pointer;padding:4px 0;font-family:inherit;}
    .cn-shots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
    .cn-shot{position:relative;aspect-ratio:9/14;border-radius:12px;overflow:hidden;background:var(--navy);border:1px dashed var(--border);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--muted);font-size:11px;cursor:pointer;text-align:center;padding:6px;}
    .cn-shot:hover{border-color:var(--cn-accent);color:var(--white);}
    .cn-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .cn-shot-kind{position:absolute;left:5px;right:5px;bottom:5px;z-index:2;font-size:10.5px;background:rgba(5,10,20,.82);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:3px 4px;font-family:inherit;}
    .cn-shot-del{position:absolute;top:5px;right:5px;z-index:2;width:22px;height:22px;border-radius:50%;border:none;background:rgba(5,10,20,.8);color:#fff;cursor:pointer;font-size:11px;}
    .cn-strength{display:flex;align-items:center;gap:10px;margin:14px 0 4px;}
    .cn-strength-bar{flex:1;height:8px;border-radius:8px;background:var(--navy);border:1px solid var(--border);overflow:hidden;}
    .cn-strength-bar span{display:block;height:100%;border-radius:8px;transition:width .35s ease,background .35s;}
    .cn-strength-lbl{font-size:12px;font-weight:800;min-width:64px;text-align:right;}
    .cn-strength-tip{font-size:11.5px;color:var(--muted);min-height:16px;}
    @media(max-width:600px){
      .cn-acc-row{grid-template-columns:1fr 1fr 34px;}
      .cn-acc-row .cn-acc-url{grid-column:1/-1;grid-row:1;}
      .cn-acc-row select,.cn-acc-row input{font-size:16px;}
      .cn-shots{grid-template-columns:repeat(2,1fr);}
      .cn-accept-hero .amt{font-size:30px;}
    }

    /* Creator profile: one row per platform — link + followers */
    .cn-cp-acct{background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:10px;}
    .cn-cp-acct-h{font-size:12px;font-weight:800;color:var(--white);margin-bottom:7px;}
    .cn-cp-acct-row{display:grid;grid-template-columns:1fr 120px;gap:8px;}
    .cn-cp-acct-row input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:9px;padding:10px;color:var(--white);font-size:13px;font-family:inherit;}
    .cn-cp-acct-row input:focus{outline:none;border-color:var(--cn-accent);}
    .cn-cp-acct .cn-acc-hint{margin:6px 0 0 2px;}
    @media(max-width:600px){ .cn-cp-acct-row{grid-template-columns:1fr 104px;} .cn-cp-acct-row input{font-size:16px;} }

    /* My application (creator) */
    .cn-myapp{background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px;}
    .cn-myapp-accts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
    .cn-acct-chip{display:inline-flex;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:5px 10px;font-size:11.5px;color:var(--white);text-decoration:none;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    a.cn-acct-chip:hover{border-color:var(--cn-accent);}
    .cn-seen{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#64b5f6;margin-top:8px;}

    /* Brief card + quick chips — keeps the chat about the work */
    .cn-brief{border:1px solid rgba(255,176,32,.35);background:rgba(255,176,32,.06);border-radius:14px;padding:12px 14px;margin:4px 0 14px;text-align:left;}
    .cn-brief-h{font-weight:800;color:var(--white);font-size:12.5px;margin-bottom:6px;}
    .cn-brief dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:12px;}
    .cn-brief dt{color:var(--muted);}
    .cn-brief dd{margin:0;color:var(--white);}
    .cn-msg-card-hired{background:rgba(61,212,74,.1);border:1px solid rgba(61,212,74,.35);}
    .cn-msg-card-star{background:rgba(255,176,32,.08);border:1px solid rgba(255,176,32,.3);}
    .cn-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:2px;scrollbar-width:none;}
    .cn-chips::-webkit-scrollbar{display:none;}
    .cn-chip-btn{flex-shrink:0;background:var(--card);border:1px solid var(--border);color:#c3d3e0;border-radius:20px;padding:6px 11px;font-size:11.5px;cursor:pointer;font-family:inherit;white-space:nowrap;}
    .cn-chip-btn:hover{border-color:var(--cn-accent);color:var(--white);}

    /* Balance strip (business) */
    .cn-balance{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px;}
    .cn-balance-amt{font-family:'Montserrat',sans-serif;font-weight:900;font-size:18px;color:var(--white);font-variant-numeric:tabular-nums;}
    .cn-balance-sub{font-size:11.5px;color:var(--muted);margin-top:2px;}
    .cn-balance-hist{margin-top:10px;font-size:12px;}
    .cn-balance-hist div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);color:var(--muted);}
    .cn-balance-hist b{font-variant-numeric:tabular-nums;}

    /* Pay sheet (secure budget / raise pay) */
    .cn-paychoice{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 12px;}
    .cn-paychoice label{position:relative;display:block;background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:11px 12px;cursor:pointer;font-size:12px;color:var(--muted);}
    .cn-paychoice label b{display:block;color:var(--white);font-size:13px;margin-bottom:2px;}
    .cn-paychoice input{position:absolute;opacity:0;}
    .cn-paychoice label.on{border-color:var(--green);background:rgba(61,212,74,.07);}
    .cn-paychoice label.off{opacity:.45;cursor:not-allowed;}

    /* Live preview (create form) */
    .cn-create-wrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start;}
    .cn-preview{position:sticky;top:12px;}
    .cn-preview-lbl{font-size:11.5px;color:var(--muted);margin:0 0 8px 2px;}
    @media(max-width:900px){ .cn-create-wrap{grid-template-columns:1fr;} .cn-preview{position:static;} }

    /* Lightbox */
    .cn-lightbox{position:fixed;inset:0;z-index:2000;background:rgba(3,7,14,.94);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:16px;}
    .cn-lightbox img{max-width:100%;max-height:80vh;border-radius:12px;}
    .cn-lightbox-cap{color:#c3d3e0;font-size:12.5px;}
    .cn-lightbox-nav{display:flex;gap:10px;}
    .cn-lightbox button{background:var(--card);border:1px solid var(--border);color:var(--white);border-radius:20px;padding:9px 16px;cursor:pointer;font-family:inherit;}
    @media (prefers-reduced-motion:reduce){ .cn-strength-bar span{transition:none;} }
  `;
  document.head.appendChild(style);
}

// ─── Hero copy + "how it works" guide content — role-aware ────────────────
// Short, literal, and specific to what each side actually does next; this
// doubles as the "short guidelines" a new user needs before they touch
// anything. Steps are a real sequence, so numbering them is meaningful here.
function _cnHeroCopy(role) {
  return role === 'creator' ? {
    eyebrow: '🎬 For Creators',
    title: 'Get paid to post for brands',
    sub: 'Every job here is already paid for — the money is held by EndaViral before you see it. Accept the price, show your accounts, post the video, get paid on M-Pesa.',
  } : {
    eyebrow: '🏢 For Businesses',
    title: 'Hire creators to promote your business',
    sub: 'Set the price, pay it once, and your job goes live. Creators accept and show you their accounts — hire in one tap. EndaViral only pays the creator after you approve the work.',
  };
}

function _cnJourneySteps(role) {
  return role === 'creator' ? [
    { title: 'Join (1 minute)', desc: 'Tick the boxes and join. It is free.' },
    { title: 'Add your M-Pesa number', desc: 'This is where we send your money. Businesses never see it.' },
    { title: 'Accept a job', desc: 'The price is fixed and already paid. Tap Accept and add your account links and screenshots.' },
    { title: 'Get hired, post, get paid', desc: 'If the business hires you, post the video, send the link, and tap “Send my money”.' },
  ] : [
    { title: 'Join (1 minute)', desc: 'Tick the boxes and join. Posting a job is free.' },
    { title: 'Add your business name', desc: 'So creators know who they are working with.' },
    { title: 'Post & pay the price', desc: 'Describe the video and set the pay per creator. Pay once with M-Pesa — your job goes live.' },
    { title: 'Check accounts, hire, approve', desc: 'Tap a creator to see their accounts. Hire in one tap. The creator is paid only after you approve.' },
  ];
}

function _cnGuideCollapsed() {
  try {
    const stored = localStorage.getItem('cnGuideCollapsed');
    if (stored !== null) return stored === '1';
  } catch (_) { /* fall through to default below */ }
  // No explicit preference set yet: keep the guide open for a first-time
  // joiner (they need the steps) but default it collapsed for someone
  // who's already joined this role — they already know how it works, and
  // showing it fresh every visit was pure repeat-visit noise.
  return !!_cnJoinedRoles[_cnRole];
}

function _cnToggleGuide() {
  const collapsed = !_cnGuideCollapsed();
  try { localStorage.setItem('cnGuideCollapsed', collapsed ? '1' : '0'); } catch (_) { /* ignore */ }
  const rail = document.getElementById('cnJourney');
  const btn = document.getElementById('cnGuideToggleBtn');
  if (rail) rail.style.display = collapsed ? 'none' : 'grid';
  if (btn) btn.textContent = collapsed ? 'Show guide ▾' : 'Hide guide ▴';
}

// ─── Which side(s) has this user actually joined? ──────────────────────────
// Drives the whole "one identity by default" journey: a brand-new visitor
// still gets the full creator/business toggle to make their first choice,
// but the moment they've joined exactly one side, that toggle disappears —
// they just see their own dashboard, with a small opt-in link if they ever
// want the other side too. Only once they've joined *both* does the toggle
// come back, now genuinely switching between two live profiles.
async function _cnDetectJoinedRoles() {
  const [creatorProfile, businessProfile] = await Promise.all([
    api('/connect/profile/creator/me').catch(() => null),
    api(`/connect/profile/business/${currentUser.id}`).catch(() => null),
  ]);
  if (creatorProfile) _cnCreatorProfile = creatorProfile;
  if (businessProfile) _cnBusinessProfile = businessProfile;
  _cnJoinedRoles = {
    creator: !!(creatorProfile && creatorProfile.joined_at),
    business: !!(businessProfile && businessProfile.joined_at),
  };
  _cnRolesResolved = true;
}

function _cnGetLastRole() {
  try { return localStorage.getItem('cnLastRole'); } catch (_) { return null; }
}
function _cnSetLastRole(role) {
  try { localStorage.setItem('cnLastRole', role); } catch (_) { /* ignore */ }
}

// ─── Landing chooser gate ───────────────────────────────────────────────────
// A brand-new visitor (joined neither side) should land on a neutral,
// role-agnostic marketplace intro and explicitly choose Creator or Business
// before seeing anything tinted toward one side. Once they've joined at
// least one side, or picked one this session, this stops applying and the
// normal role-aware shell (hero/journey/tabs) takes over as before.
function _cnShowingLanding() {
  const joinedCount = (_cnJoinedRoles.creator ? 1 : 0) + (_cnJoinedRoles.business ? 1 : 0);
  return joinedCount === 0 && !_cnLandingPicked;
}

function _cnPickRole(role) {
  _cnLandingPicked = true;
  _cnRole = role;
  _cnTab = role === 'creator' ? 'discover' : 'campaigns';
  _cnSetLastRole(role);
  const sec = document.getElementById('sec-connect');
  _cnRenderShell(sec);
  _cnLoadActiveTab();
}

function _cnRenderLanding(sec) {
  sec.dataset.cnRole = ''; // neutral — don't let either accent colour leak in here
  sec.innerHTML = `
    <div class="cn-landing-hero">
      <div class="cn-landing-badge">🚀 EndaViral Marketplace</div>
      <div class="cn-landing-title">Kenya's Creator Marketplace</div>
      <div class="cn-landing-sub"><strong style="color:var(--white);">Every job is paid for before it goes live.</strong><br>Businesses set a fixed price and pay it up front. Creators accept, show their accounts, and get paid after the work is approved.</div>
      <div class="cn-landing-badges">
        <span class="cn-hero-badge">🔒 Secure Payments</span>
        <span class="cn-hero-badge">📲 M-Pesa Payouts</span>
        <span class="cn-hero-badge">⭐ Rated by Both Sides</span>
        <span class="cn-hero-badge">🛡️ Trusted Marketplace</span>
      </div>
    </div>

    <div class="cn-landing-stats" id="cnLandingStats" style="display:none;"></div>

    <div class="cn-choice-grid">
      <div class="cn-choice-card cn-choice-card--creator" onclick="_cnPickRole('creator')">
        <div class="cn-choice-icon">🎬</div>
        <div class="cn-choice-eyebrow">For Creators</div>
        <div class="cn-choice-title">Earn from your content</div>
        <div class="cn-choice-sub">Get paid by Kenyan businesses to post videos about them.</div>
        <ul class="cn-choice-list">
          <li>Every job's money is already held</li>
          <li>No haggling — accept the price you see</li>
          <li>Get paid on M-Pesa</li>
        </ul>
        <button class="cn-choice-cta" onclick="event.stopPropagation();_cnPickRole('creator')">🎥 I want to earn</button>
      </div>
      <div class="cn-choice-card cn-choice-card--business" onclick="_cnPickRole('business')">
        <div class="cn-choice-icon">🏢</div>
        <div class="cn-choice-eyebrow">For Businesses</div>
        <div class="cn-choice-title">Hire creators that fit your brand</div>
        <div class="cn-choice-sub">Get creators to make videos about your business. The creator is only paid after you approve.</div>
        <ul class="cn-choice-list">
          <li>Set one price, pay it once</li>
          <li>Check each creator's accounts in one tap</li>
          <li>Unused money comes straight back to you</li>
        </ul>
        <button class="cn-choice-cta" onclick="event.stopPropagation();_cnPickRole('business')">🏢 I want to hire</button>
      </div>
    </div>

    <div class="cn-trust-row">
      <span class="cn-trust-item"><b>✔</b> Payments processed securely</span>
      <span class="cn-trust-item"><b>✔</b> M-Pesa payouts</span>
      <span class="cn-trust-item"><b>✔</b> Marketplace support</span>
      <span class="cn-trust-item"><b>✔</b> Dispute resolution</span>
    </div>

    <div class="cn-landing-foot" style="margin-bottom:24px;">You can do both later — one account works for both.</div>

    <div class="cn-landing-section-lbl">How It Works</div>
    <div class="cn-timeline">
      <div class="cn-timeline-step" data-who="business"><div class="cn-timeline-dot">💰</div><div class="cn-timeline-label">Business posts & pays the price</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="creator"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">🙋</div><div class="cn-timeline-label">Creators accept & show accounts</div><div class="cn-timeline-who">Creator</div></div>
      <div class="cn-timeline-step" data-who="business"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">✅</div><div class="cn-timeline-label">Business hires one</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="creator"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">📦</div><div class="cn-timeline-label">Creator posts the video</div><div class="cn-timeline-who">Creator</div></div>
      <div class="cn-timeline-step" data-who="business"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">👍</div><div class="cn-timeline-label">Business approves it</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="system"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">📲</div><div class="cn-timeline-label">Creator gets the money</div><div class="cn-timeline-who">M-Pesa</div></div>
    </div>
  `;
  _cnLoadLandingStats();
}

// Optional stat strip (total paid out, businesses, campaigns completed, avg
// approval time). Deliberately fetched from a real endpoint rather than
// hardcoded — a marketplace landing page showing fabricated numbers is
// worse than showing none. Strip stays hidden if the endpoint isn't wired
// up yet or returns nothing.
async function _cnLoadLandingStats() {
  const el = document.getElementById('cnLandingStats');
  if (!el) return;
  let stats = null;
  try { stats = await Store.ensure('connectLandingStats', () => api('/connect/marketplace-stats'), { ttl: 180000 }); } catch (_) { stats = null; }
  if (!stats || typeof stats !== 'object') return;
  const items = [
    stats.total_paid_kes != null ? { num: `KES ${Number(stats.total_paid_kes).toLocaleString()}`, label: 'Paid to Creators' } : null,
    stats.businesses_count != null ? { num: String(stats.businesses_count), label: 'Businesses' } : null,
    stats.campaigns_completed != null ? { num: String(stats.campaigns_completed), label: 'Jobs Done' } : null,
    stats.open_campaigns != null ? { num: String(stats.open_campaigns), label: 'Open Jobs Now' } : null,
  ].filter(Boolean);
  if (!items.length) return;
  el.innerHTML = items.map(i => `
    <div class="cn-landing-stat">
      <div class="cn-landing-stat-num">${esc(i.num)}</div>
      <div class="cn-landing-stat-label">${esc(i.label)}</div>
    </div>`).join('');
  el.style.display = 'grid';
}

// ─── Page init ───────────────────────────────────────────────────────────────
async function initConnectPage() {
  _cnInjectStyles();
  const sec = document.getElementById('sec-connect');
  if (!sec) return;
  await _cnDetectJoinedRoles();

  // Land the user on the side they actually belong to. Only when they've
  // joined both (or neither, i.e. haven't chosen yet) do we fall back to
  // whichever they last used / the default.
  if (_cnJoinedRoles.creator && !_cnJoinedRoles.business) {
    _cnRole = 'creator';
  } else if (_cnJoinedRoles.business && !_cnJoinedRoles.creator) {
    _cnRole = 'business';
  } else {
    const last = _cnGetLastRole();
    _cnRole = (last === 'creator' || last === 'business') ? last : 'creator';
  }
  _cnTab = _cnRole === 'creator' ? 'discover' : 'campaigns';

  _cnRenderShell(sec);
  await _cnPollUnread();
  if (!_cnShowingLanding()) await _cnLoadActiveTab();
}

// ─── Unread message/prompt badges (nav item + per-card) ────────────────────
// Fetched once when the Connect section is opened (see call site above),
// then kept current purely by the SSE 'new_message' push (auth.js ->
// _cnPollUnread()) — no timer. This is a genuine event-triggered refresh:
// it only runs because a message actually arrived, not because the tab
// happens to be sitting open.
//
// KNOWN GAP: the SSE push from connect.py only fires for
// type:"new_message" (chat messages). If a "payment/funding action
// needed" state can change WITHOUT a chat message being sent alongside it
// (e.g. connect_service.apply_nexus_status_to_funding flips something
// server-side with no matching sse.push), that badge won't update until
// the next time the user re-opens or re-navigates into Connect. Worth
// confirming connect_service.py pushes an SSE event on funding-status
// changes too — if it doesn't yet, that's the one to add rather than
// bringing back a timer here.

async function _cnPollUnread() {
  try {
    const data = await api(`/connect/notifications/unread-count?role=${_cnRole}`);
    _cnUnreadByCampaign = {};
    (data.campaigns || []).forEach(c => { _cnUnreadByCampaign[c.campaign_id] = c.unread_count; });
    Store.set('notifications', data); // shared with anything that subscribes, instead of needing its own poll

    const badge = document.getElementById('connectBadge');
    if (badge) {
      if (data.total_unread > 0) {
        badge.textContent = data.total_unread > 99 ? '99+' : String(data.total_unread);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Only re-render the card grid if we're actually looking at one and no
    // modal is open — avoids yanking a form or open chat out from under
    // whoever's mid-action every 25s. On top of that, only re-render when
    // the unread snapshot actually changed since the last poll — most
    // 25s ticks find nothing new, and re-painting the whole grid anyway
    // was what made the page feel like it kept refreshing itself while
    // someone was just reading or about to click something on it.
    const snapshot = JSON.stringify(_cnUnreadByCampaign);
    const changed = snapshot !== _cnLastUnreadSnapshot;
    _cnLastUnreadSnapshot = snapshot;
    if (changed && (_cnTab === 'campaigns' || _cnTab === 'work') && !_cnCurrentCampaign) {
      const target = document.getElementById('cnTabContent');
      if (target) {
        const scrollY = window.scrollY;
        Store.invalidate(_cnTab === 'campaigns' ? 'connectCampaigns' : 'connectWork');
        await _cnLoadActiveTab();
        window.scrollTo(0, scrollY);
      }
    }
  } catch (e) {
    // Silent — background convenience poll, not user-initiated.
  }
}

function _cnRenderShell(sec) {
  if (_cnShowingLanding()) { _cnRenderLanding(sec); return; }
  sec.dataset.cnRole = _cnRole;
  sec.dataset.cnJoined = _cnJoinedRoles[_cnRole] ? '1' : '0';
  const hero = _cnHeroCopy(_cnRole);
  const steps = _cnJourneySteps(_cnRole);
  const collapsed = _cnGuideCollapsed();
  // Show the full switcher only when there's genuinely something to switch
  // between (both sides joined) or nothing chosen yet (first-time visitor
  // picking a side). Someone who's only ever joined as a Creator should not
  // see a "I'm a Business" tab at all — just their own profile, plus a
  // one-tap way to add the other side if they want it later.
  const joinedCount = (_cnJoinedRoles.creator ? 1 : 0) + (_cnJoinedRoles.business ? 1 : 0);
  const dual = joinedCount === 2;
  const neither = joinedCount === 0;
  const singleJoinedRole = _cnJoinedRoles.creator ? 'creator' : (_cnJoinedRoles.business ? 'business' : null);
  const showToggle = dual || neither;
  // True while a single-role user is mid-flow adding their second role
  // (clicked "+ Also set up a Business profile" but hasn't joined it yet).
  const onboardingSecondRole = !showToggle && singleJoinedRole && _cnRole !== singleJoinedRole;
  const roleLabel = (r) => r === 'creator' ? '🎬 Creator' : '🏢 Business';
  const otherRole = _cnRole === 'creator' ? 'business' : 'creator';
  let identityRowHtml = '';
  if (!showToggle) {
    identityRowHtml = onboardingSecondRole ? `
    <div class="cn-addrole-row">
      <span class="cn-addrole-current">Setting up your ${roleLabel(_cnRole)} profile…</span>
      <button class="cn-addrole-btn" onclick="_cnAddOtherRole('${singleJoinedRole}')">← Back to my ${roleLabel(singleJoinedRole)} account</button>
    </div>` : `
    <div class="cn-addrole-row">
      <span class="cn-addrole-current">${roleLabel(singleJoinedRole)} account</span>
      <button class="cn-addrole-btn" onclick="_cnAddOtherRole('${otherRole}')">+ Also ${otherRole === 'creator' ? 'become a Creator' : 'set up a Business profile'}</button>
    </div>`;
  }
  sec.innerHTML = `
    <div class="cn-hero">
      <div class="cn-hero-eyebrow">${hero.eyebrow}</div>
      <div class="cn-hero-title">${esc(hero.title)}</div>
      <div class="cn-hero-sub">${esc(hero.sub)}</div>
    </div>
    ${showToggle ? `
    <div class="cn-role-toggle">
      <button class="cn-role-btn ${_cnRole === 'creator' ? 'active' : ''}" data-role="creator" onclick="_cnSetRole('creator')">🎬 I'm a Creator</button>
      <button class="cn-role-btn ${_cnRole === 'business' ? 'active' : ''}" data-role="business" onclick="_cnSetRole('business')">🏢 I'm a Business</button>
    </div>` : identityRowHtml}
    <div class="cn-guide-head">
      <span class="cn-guide-title">How it works</span>
      <button class="cn-guide-toggle-btn" id="cnGuideToggleBtn" onclick="_cnToggleGuide()">${collapsed ? 'Show guide ▾' : 'Hide guide ▴'}</button>
    </div>
    <div class="cn-journey" id="cnJourney" style="display:${collapsed ? 'none' : 'grid'};">
      ${steps.map((s, i) => `
        <div class="cn-journey-step">
          <div class="cn-journey-num">${i + 1}</div>
          <div class="cn-journey-step-title">${esc(s.title)}</div>
          <div class="cn-journey-step-desc">${esc(s.desc)}</div>
        </div>
      `).join('')}
    </div>
    <div class="cn-tabs" id="cnTabs"></div>
    <div id="cnTabContent"><div class="cn-empty">Loading…</div></div>
  `;
  _cnRenderTabs();
}

function _cnRenderTabs() {
  const wrap = document.getElementById('cnTabs');
  if (!wrap) return;
  const tabs = _cnRole === 'creator'
    ? [['discover', '🔍 Find Jobs'], ['applications', '📨 My Offers'], ['invites', '✉️ Invites'], ['work', '🛠 My Jobs'], ['profile', '👤 My Profile']]
    : [['campaigns', '📋 My Jobs'], ['create', '➕ Post a Job'], ['find', '🔎 Find Creators'], ['profile', '🏢 My Business']];
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.is_admin) {
    tabs.push(['admin', '🛡 Admin']);
  }
  wrap.innerHTML = tabs.map(([id, label]) =>
    `<button class="cn-tab ${_cnTab === id ? 'active' : ''}" onclick="_cnSetTab('${id}')">${label}</button>`
  ).join('');
}

function _cnSetRole(role) {
  if (_cnRole === role) return;
  _cnRole = role;
  _cnTab = role === 'creator' ? 'discover' : 'campaigns';
  // Only meaningful to "remember" once both sides are joined — that's the
  // only state where this toggle is even visible to switch back and forth.
  if (_cnJoinedRoles.creator && _cnJoinedRoles.business) _cnSetLastRole(role);
  const sec = document.getElementById('sec-connect');
  _cnRenderShell(sec);
  _cnLoadActiveTab();
}

// Opt-in entry point for a single-role user who wants the other side too —
// e.g. a Creator clicking "+ Also set up a Business profile". Just switches
// into that role; since they haven't joined it yet, the join gate takes
// over and shows the normal join screen for it.
function _cnAddOtherRole(role) {
  _cnRole = role;
  _cnTab = role === 'creator' ? 'discover' : 'campaigns';
  const sec = document.getElementById('sec-connect');
  _cnRenderShell(sec);
  _cnLoadActiveTab();
}

function _cnSetTab(tab) {
  _cnTab = tab;
  _cnRenderTabs();
  _cnLoadActiveTab();
}

async function _cnLoadActiveTab() {
  const target = document.getElementById('cnTabContent');
  if (!target) return;
  target.innerHTML = '<div class="cn-empty">Loading…</div>';
  try {
    const gated = await _cnApplyJoinGate(target);
    if (gated) return;
    if (_cnTab === 'discover')     return await _cnRenderDiscover(target);
    if (_cnTab === 'applications') return await _cnRenderMyApplications(target);
    if (_cnTab === 'invites')      return await _cnRenderInvites(target);
    if (_cnTab === 'work')         return await _cnRenderMyWork(target);
    if (_cnTab === 'campaigns')    return await _cnRenderMyCampaigns(target);
    if (_cnTab === 'create')       return _cnRenderCreateForm(target);
    if (_cnTab === 'find')         return await _cnRenderFindCreators(target);
    if (_cnTab === 'admin')        return await _cnRenderAdmin(target);
    if (_cnTab === 'profile')      return _cnRole === 'creator' ? await _cnRenderCreatorProfileForm(target) : await _cnRenderBusinessProfileForm(target);
  } catch (e) {
    target.innerHTML = `<div class="cn-empty">Couldn't load this — ${esc(e.message || 'please try again.')}<br><button class="btn-secondary" style="margin-top:12px;" onclick="_cnLoadActiveTab()">Retry</button></div>`;
  }
}

// ─── Terms of Service modal ─────────────────────────────────────────────────
function _cnOpenTos() {
  const modal = document.getElementById('cnTosModal');
  const body = document.getElementById('cnTosModalBody');
  if (modal && body) {
    body.innerHTML = CONNECT_TOS_HTML;
    modal.classList.add('show');
  }
  return false; // prevent the <a href="#"> from jumping the page
}

function _cnCloseTos() {
  document.getElementById('cnTosModal').classList.remove('show');
}

// ─── Join marketplace + profile-completeness gate ──────────────────────────
// Journey: click "Join" -> accept ToS -> update profile (creator: email +
// phone for payment; business: company profile) -> only then can a creator
// browse/apply to adverts or a business post a campaign / invite creators.
// Admin is exempt — an admin browsing Connect isn't joining as either side.
async function _cnApplyJoinGate(target) {
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.is_admin && _cnTab === 'admin') return false;

  const role = _cnRole;
  let profile = null;
  try {
    profile = role === 'creator'
      ? await api('/connect/profile/creator/me')
      : await api(`/connect/profile/business/${currentUser.id}`);
  } catch (_) {
    profile = null;
  }
  if (role === 'creator') _cnCreatorProfile = profile; else _cnBusinessProfile = profile;

  const joined = !!(profile && profile.joined_at);
  _cnJoinedRoles[role] = joined; // defensive — keeps toggle/pill state accurate even if init detection missed this
  if (!joined) {
    _cnRenderJoinScreen(target, role);
    return true;
  }

  // Once joined, always let them reach the profile editor so they can
  // actually complete it.
  if (_cnTab === 'profile') return false;

  const complete = role === 'creator'
    ? !!(profile && (profile.profile_complete ?? (profile.has_payment_details && profile.has_profile_links)))
    : !!(profile && profile.company_name && profile.company_name !== 'Unnamed Business');

  const needsComplete = role === 'creator'
    ? _cnTab === 'discover'
    : (_cnTab === 'create' || _cnTab === 'find');

  if (needsComplete && !complete) {
    _cnRenderIncompleteProfileScreen(target, role);
    return true;
  }
  return false;
}

function _cnRenderJoinScreen(target, role) {
  const isCreator = role === 'creator';
  const roleChecks = isCreator ? CONNECT_CREATOR_TOS_CHECKS : CONNECT_BUSINESS_TOS_CHECKS;
  // A tiny icon per checkbox just helps the eye scan a list of commitments —
  // purely decorative, keyed loosely off each check's subject.
  const iconFor = (key) => ({
    fee_deduction: '💸', payment_after_approval: '✅', independent_contractor: '🎬',
    escrow_hold: '🔒', marketplace_intermediary: '🤝',
    no_circumvention: '🚫', platform_transactions: '📋',
  }[key] || '•');
  target.innerHTML = `
    <div class="cn-join-card">
      <div class="cn-join-badge">${isCreator ? '🎬 Join as a Creator' : '🏢 Join as a Business'}</div>
      <div style="font-size:16px;font-weight:800;color:var(--white);margin-bottom:8px;">
        ${isCreator ? 'Join free and start earning' : 'Join free and post your first job'}
      </div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px;line-height:1.6;">
        ${isCreator
          ? 'Please read and tick each box. These are the simple rules that keep your money safe.'
          : 'Please read and tick each box. These are the simple rules that keep your money safe.'}
      </div>

      <div class="cn-section-lbl" style="margin-top:0;">Tick each box</div>
      <div class="cn-tos-check-summary">
        ${roleChecks.map(c => `
          <label class="cn-join-item">
            <input type="checkbox" class="cn-join-check-box cn-join-role-check" data-key="${c.key}" onchange="_cnUpdateJoinBtn(this)">
            <span class="cn-join-tick">✓</span>
            <span class="cn-join-icon-badge">${iconFor(c.key)}</span>
            <span class="cn-join-text">${esc(c.text)}</span>
          </label>
        `).join('')}
      </div>

      <label class="cn-join-check" style="margin-top:6px;">
        <input type="checkbox" class="cn-join-check-box" id="cnJoinTos" onchange="_cnUpdateJoinBtn(this)">
        <span class="cn-join-tick">✓</span>
        <span>I agree to the <a href="#" onclick="return _cnOpenTos()">Marketplace Terms</a> and I am 18 years or older.</span>
      </label>

      <div id="cnJoinLeft" style="font-size:12px;color:var(--muted);text-align:center;margin-top:8px;"></div>
      <button class="btn-primary" id="cnJoinBtn" style="margin-top:6px;" onclick="_cnSubmitJoin('${role}')" disabled>Join now — it's free</button>
    </div>
  `;
}

// Enables the Join button only once every ToS + role-specific checkbox on
// the join screen is ticked.
function _cnSyncCheckRow(input) {
  const row = input.closest('.cn-join-item, .cn-join-check, .cn-confirm-row');
  if (row) row.classList.toggle('checked', input.checked);
}

function _cnUpdateJoinBtn(changedInput) {
  if (changedInput) _cnSyncCheckRow(changedInput);
  const btn = document.getElementById('cnJoinBtn');
  if (!btn) return;
  const boxes = document.querySelectorAll('.cn-join-check-box');
  const left = Array.from(boxes).filter(b => !b.checked).length;
  btn.disabled = !(boxes.length && left === 0);
  const hint = document.getElementById('cnJoinLeft');
  if (hint) hint.textContent = left ? `Tick ${left} more box${left === 1 ? '' : 'es'} to continue` : '';
}

async function _cnSubmitJoin(role) {
  const boxes = document.querySelectorAll('.cn-join-check-box');
  if (!boxes.length || !Array.from(boxes).every(b => b.checked)) {
    toast('Please accept all the checkboxes to continue', 'error');
    return;
  }
  // The server independently re-verifies these keys against
  // CREATOR_TOS_ACK_KEYS / BUSINESS_TOS_ACK_KEYS in connect_service.py —
  // this is just what the person actually ticked on screen.
  const acknowledgements = Array.from(document.querySelectorAll('.cn-join-role-check'))
    .map(b => b.dataset.key);
  const btn = document.getElementById('cnJoinBtn');
  btn.disabled = true; btn.textContent = 'Joining…';
  try {
    await api(`/connect/join/${role}`, {
      method: 'POST',
      body: JSON.stringify({ tos_accepted: true, tos_acknowledgements: acknowledgements }),
    });
    toast('Welcome! Now add your details.', 'success');
    _cnJoinedRoles[role] = true;
    if (_cnJoinedRoles.creator && _cnJoinedRoles.business) _cnSetLastRole(role);
    const sec = document.getElementById('sec-connect');
    if (sec) _cnRenderShell(sec); // toggle/add-role pill needs to reflect the new state immediately
    _cnSetTab('profile');
  } catch (e) {
    toast(e.message || 'Could not join', 'error');
    btn.disabled = false; btn.textContent = "Join now — it's free";
  }
}

function _cnRenderIncompleteProfileScreen(target, role) {
  const isCreator = role === 'creator';
  target.innerHTML = `
    <div class="cn-gate">
      <div class="cn-gate-icon">${isCreator ? '💳' : '🏢'}</div>
      <div class="cn-gate-title">${isCreator ? 'One last step: your accounts and M-Pesa number' : 'One last step: add your business name'}</div>
      <div class="cn-gate-sub">${isCreator
        ? "Add the link to at least one of your social profiles — businesses open it when you accept a job — and the M-Pesa number we pay you on. Businesses never see your number."
        : "Creators see this name, so they know who they are working with."}</div>
      <button class="cn-gate-btn" onclick="_cnSetTab('profile')">Add it now →</button>
    </div>
  `;
}

// ─── Discover (creator) ──────────────────────────────────────────────────────
// Store-backed reads below use a short 20s TTL — long enough to absorb
// repeated tab switches and re-renders without a network round-trip each
// time, short enough that campaign data doesn't feel stale. Mutations that
// change what these lists show (apply, publish, accept invite, deliverable
// review, etc.) explicitly invalidate the relevant key rather than waiting
// out the TTL — see each mutation function below.
const CONNECT_CACHE_TTL = 20000;

let _cnDiscoverSort = 'newest';
function _cnInvalidateDiscover() {
  ['newest', 'pay_high', 'closing_soon'].forEach(k => Store.invalidate(`connectDiscover:${k}`));
}

async function _cnRenderDiscover(target) {
  const key = `connectDiscover:${_cnDiscoverSort}`;
  const data = await Store.ensure(key, () => api(`/connect/discover?sort=${_cnDiscoverSort}`), { ttl: CONNECT_CACHE_TTL });
  _cnCampaigns = data || [];
  if (!_cnCampaigns.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">🔍</span><div class="cn-empty-title">No open jobs right now</div>Every job here has its money held before it appears, so new ones arrive as businesses pay. Keep your profile strong — businesses can also invite you directly.<br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('profile')">Improve my profile</button></div>`;
    return;
  }
  target.innerHTML = `
    <div class="cn-discover-bar">
      <div class="cn-step-hint" style="margin:0;flex:1 1 260px;">🔒 <b>Every job below is already paid for.</b> Tap one, check what you'd take home, and accept.</div>
      <select aria-label="Sort jobs" onchange="_cnDiscoverSort=this.value;_cnLoadActiveTab()">
        <option value="newest" ${_cnDiscoverSort === 'newest' ? 'selected' : ''}>Newest</option>
        <option value="pay_high" ${_cnDiscoverSort === 'pay_high' ? 'selected' : ''}>Highest pay</option>
        <option value="closing_soon" ${_cnDiscoverSort === 'closing_soon' ? 'selected' : ''}>Closing soon</option>
      </select>
    </div>
    <div class="cn-grid">${_cnCampaigns.map(_cnCardHtml).join('')}</div>`;
}

function _cnDaysLeftLabel(days) {
  if (days == null) return '';
  if (days < 1) return 'Closes today';
  const d = Math.ceil(days);
  return `Closes in ${d} day${d === 1 ? '' : 's'}`;
}

function _cnCardHtml(c) {
  const plat = _cnPlatformDefs(c.platform)[0];   // first platform — used for the title-row emoji
  const unread = _cnUnreadByCampaign[c.id] || 0;
  const isDiscover = _cnTab === 'discover';
  const isOwner = currentUser && currentUser.id === c.business_user_id;
  const n = c.applicant_count || 0;
  let foot = '';
  if (isDiscover) {
    foot = `<div class="cn-card-foot"><span>${n ? `${n} creator${n === 1 ? '' : 's'} accepted` : 'Be the first to accept'}</span><span>${esc(_cnDaysLeftLabel(c.hire_days_left))}</span></div>`;
  } else if (isOwner && c.status === 'published') {
    foot = `<div class="cn-card-foot"><span>${n ? `<b style="color:var(--white);">${n}</b> creator${n === 1 ? '' : 's'} to review` : 'Waiting for creators'}</span><span>${esc(_cnDaysLeftLabel(c.hire_days_left))}</span></div>`;
  } else if (isOwner && c.status === 'draft') {
    foot = `<div class="cn-card-foot"><span style="color:#ffb020;">Pay ${fmtKES(c.amount_due_total_kes)} to go live</span><span>Tap to finish</span></div>`;
  }
  return `
  <div class="cn-card" data-campaign-id="${c.id}" onclick="_cnOpenCampaign('${c.id}')">
    ${unread > 0 ? `<div style="margin-bottom:8px;"><span class="cn-unread-pill">💬 ${unread > 9 ? '9+' : unread} new</span></div>` : ''}
    <div class="cn-card-top">
      <div class="cn-card-title">${plat.emoji} ${esc(c.title)}</div>
      <div class="cn-card-budget">${fmtKES(c.price_kes ?? c.budget_kes)}</div>
    </div>
    ${isDiscover ? `<div class="cn-card-takehome">You take home <b>${fmtKES(c.creator_take_home_kes)}</b>${c.business_name ? ` · ${esc(c.business_name)}` : ''}</div>` : ''}
    <div class="cn-card-desc">${esc(c.description)}</div>
    <div class="cn-card-meta">
      ${c.budget_secured && c.status === 'published' ? `<span class="cn-card-secured">🔒 Budget secured</span>` : ''}
      ${_cnPlatformTagsHtml(c.platform, 'cn-tag')}
      ${c.min_followers ? `<span class="cn-tag">${c.min_followers.toLocaleString()}+ followers</span>` : ''}
      ${_cnNicheTagsHtml(c.required_niche, 'cn-tag')}
      ${(isDiscover && c.status === 'published') ? '' : _cnStatusPill(c.status)}
    </div>
    ${foot}
  </div>`;
}

// ─── My Applications (creator) ───────────────────────────────────────────────
function _cnAccountChipsHtml(accounts, asLinks) {
  return (accounts || []).map(a => {
    const p = _cnPlatformDef(a.platform);
    const label = `${p.emoji} ${esc(a.handle || p.label)}${a.followers ? ` · ${Number(a.followers).toLocaleString()}` : ''}`;
    const safe = /^https?:\/\//i.test(a.url || '') ? esc(a.url) : '#';
    return asLinks
      ? `<a class="cn-acct-chip" href="${safe}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${label} ↗</a>`
      : `<span class="cn-acct-chip">${label}</span>`;
  }).join('');
}

async function _cnRenderMyApplications(target) {
  const apps = await Store.ensure('connectApplications', () => api('/connect/applications/mine'), { ttl: CONNECT_CACHE_TTL });
  if (!apps.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">🙋</span><div class="cn-empty-title">You haven't accepted a job yet</div>Find a job, check what you'd take home, and accept it with your account links. It will show here.<br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('discover')">Find jobs</button></div>`;
    return;
  }
  target.innerHTML = apps.map(a => `
    <div class="cn-app-row" style="cursor:pointer;" onclick="_cnOpenCampaign('${a.campaign_id}')">
      <div class="cn-app-top">
        <span class="cn-app-bid">${fmtKES(a.fund_amount_kes)}</span>
        ${_cnStatusPill(a.status)}
      </div>
      <div style="font-size:12px;color:var(--muted);">Accepted ${a.created_at ? new Date(a.created_at).toLocaleDateString() : ''} · ${a.proof_count || 0} screenshot${a.proof_count === 1 ? '' : 's'}</div>
      ${(a.accounts || []).length ? `<div class="cn-myapp-accts">${_cnAccountChipsHtml(a.accounts, false)}</div>` : ''}
      ${a.proof_viewed_at && ['pending', 'accepted'].includes(a.status) ? `<div class="cn-seen">👀 The business looked at your accounts</div>` : ''}
    </div>
  `).join('');
}

// ─── Active Work (creator) ────────────────────────────────────────────────────
async function _cnRenderMyWork(target) {
  const campaigns = await Store.ensure('connectWork', () => api('/connect/campaigns/mine?role=creator'), { ttl: CONNECT_CACHE_TTL });
  const active = campaigns.filter(c => c.status !== 'draft');
  if (!active.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">🛠</span><div class="cn-empty-title">No jobs yet</div>When a business hires you, the job shows here — the money is already held, so you can start straight away.</div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${active.map(_cnCardHtml).join('')}</div>`;
}

// ─── My Campaigns (business) ─────────────────────────────────────────────────
async function _cnRenderMyCampaigns(target) {
  const [campaigns, balance] = await Promise.all([
    Store.ensure('connectCampaigns', () => api('/connect/campaigns/mine?role=business'), { ttl: CONNECT_CACHE_TTL }),
    api('/connect/balance').catch(() => null),
  ]);
  _cnBalance = balance;
  const balanceHtml = _cnBalanceStripHtml(balance);
  if (!campaigns.length) {
    target.innerHTML = `${balanceHtml}<div class="cn-empty"><span class="cn-empty-icon">📋</span><div class="cn-empty-title">You haven't posted a job yet</div>Set a price per creator and pay it once — your job goes live and creators start accepting.<br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('create')">Post your first job</button></div>`;
    return;
  }
  target.innerHTML = `${balanceHtml}<div class="cn-grid">${campaigns.map(_cnCardHtml).join('')}</div>`;
}

// ─── EndaViral balance (business) ───────────────────────────────────────────
let _cnBalance = null;
const CN_BALANCE_KIND = {
  refund: 'Returned', fee_refund: 'Fee returned', late_payment: 'Extra payment', spend: 'Used for a job',
  withdraw: 'Cash-out', withdraw_reversal: 'Cash-out returned', adjust: 'Adjustment',
};

function _cnBalanceStripHtml(b) {
  if (!b) return '';
  const amt = Number(b.balance_kes || 0);
  const pending = (b.pending_withdrawals || [])[0];
  if (amt <= 0 && !pending && !(b.entries || []).length) return '';
  return `
    <div class="cn-balance" id="cnBalanceStrip">
      <div>
        <div class="cn-balance-amt">${fmtKES(amt)}</div>
        <div class="cn-balance-sub">EndaViral balance — money back from closed or expired jobs. Use it on your next job with no fee.</div>
        ${pending ? `<div class="cn-balance-sub" style="color:#64b5f6;">⏳ ${fmtKES(pending.amount_kes)} on its way to ${esc(pending.phone)}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${(b.entries || []).length ? `<button class="btn-secondary" onclick="_cnToggleBalanceHistory()">History</button>` : ''}
        ${amt >= (b.min_withdraw_kes || 100) && !pending ? `<button class="btn-secondary" onclick="_cnOpenWithdraw()">Cash out to M-Pesa</button>` : ''}
      </div>
      <div id="cnBalanceHist" class="cn-balance-hist" style="display:none;width:100%;">
        ${(b.entries || []).map(e => `<div><span>${esc(CN_BALANCE_KIND[e.kind] || e.kind)}${e.note ? ` — ${esc(e.note)}` : ''}<br><small>${e.created_at ? new Date(e.created_at).toLocaleString() : ''}</small></span><b style="color:${e.amount_kes >= 0 ? 'var(--green)' : 'var(--white)'};">${e.amount_kes >= 0 ? '+' : '−'}${fmtKES(Math.abs(e.amount_kes))}</b></div>`).join('')}
      </div>
      <div id="cnWithdrawForm" style="display:none;width:100%;"></div>
    </div>`;
}

function _cnToggleBalanceHistory() {
  const el = document.getElementById('cnBalanceHist');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function _cnOpenWithdraw() {
  const el = document.getElementById('cnWithdrawForm');
  if (!el || !_cnBalance) return;
  const phone = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) || '';
  el.style.display = 'block';
  el.innerHTML = `
    <div class="cn-fc-grid" style="margin-top:12px;">
      <input type="number" id="cnWdAmount" class="cn-fc-input" inputmode="numeric" min="${_cnBalance.min_withdraw_kes || 100}" max="${Math.floor(_cnBalance.balance_kes)}" value="${Math.floor(_cnBalance.balance_kes)}" aria-label="Amount to cash out">
      <input type="tel" id="cnWdPhone" class="cn-fc-input" inputmode="tel" value="${esc(phone)}" placeholder="07XXXXXXXX" aria-label="M-Pesa number">
    </div>
    <button class="btn-primary" id="cnWdBtn" onclick="_cnSubmitWithdraw()">Send to my M-Pesa</button>
    <div style="font-size:11.5px;color:var(--muted);margin-top:6px;">EndaViral sends it within one working day. You'll see it here once it's sent.</div>`;
}

async function _cnSubmitWithdraw() {
  const amount_kes = parseInt(document.getElementById('cnWdAmount').value, 10);
  const phone = document.getElementById('cnWdPhone').value.trim();
  if (!amount_kes || amount_kes <= 0) { toast('Enter how much to cash out', 'error'); return; }
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }
  const btn = document.getElementById('cnWdBtn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await api('/connect/balance/withdraw', { method: 'POST', body: JSON.stringify({ amount_kes, phone }) });
    toast(`Cash-out requested — ${fmtKES(amount_kes)} is on its way`, 'success');
    Store.invalidate('connectCampaigns');
    _cnLoadActiveTab();
  } catch (e) {
    toast(e.message || 'Could not request the cash-out', 'error');
    btn.disabled = false; btn.textContent = 'Send to my M-Pesa';
  }
}

// ─── Create campaign (business) ──────────────────────────────────────────────
const CN_MIN_KES = 200;       // mirrors connect_service.CONNECT_MIN_AMOUNT_KES
const CN_MAX_KES = 249000;    // mirrors connect_service.CONNECT_MAX_AMOUNT_KES (M-Pesa limit)

// Same rule the server applies — checked here first so people get a clear
// message before anything is sent.
function _cnAmountError(v, label) {
  if (!v || isNaN(v)) return `Enter ${label.toLowerCase()} in shillings`;
  if (Math.round(v) !== v) return `${label}: use whole shillings (no cents)`;
  if (v < CN_MIN_KES) return `${label} must be at least KES ${CN_MIN_KES.toLocaleString()}`;
  if (v > CN_MAX_KES) return `${label} can't be more than KES ${CN_MAX_KES.toLocaleString()}`;
  return null;
}

function _cnRenderCreateForm(target) {
  target.innerHTML = `
    <div class="cn-create-wrap">
    <div>
    <div class="cn-safe-note">🔒 <span><b style="color:var(--white);">You pay the price once, when you post.</b> That's what makes creators trust your job. If you close it before hiring — or nobody is hired in 14 days — the money comes straight back to your EndaViral balance.</span></div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📋</div>
        <div><div class="cn-form-card-title">What do you need?</div></div>
      </div>
      <div class="cn-field">
        <label for="cnNewTitle">Job title</label>
        <input type="text" id="cnNewTitle" placeholder="e.g. TikTok video for my new shoes" maxlength="200" oninput="_cnCreatePreview()">
      </div>
      <div class="cn-field">
        <label for="cnNewDesc">Describe the job</label>
        <textarea id="cnNewDesc" placeholder="What should the video show? What should the creator say about your business?" oninput="_cnCreatePreview()"></textarea>
      </div>
      <div class="cn-field">
        <label>Where should it be posted?</label>
        ${_cnMultiSelectHtml('cnNewPlatforms', CONNECT_PLATFORMS, ['tiktok'])}
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">💰</div>
        <div><div class="cn-form-card-title">Price & videos</div><div class="cn-form-card-sub">One fixed price — creators accept it as it is</div></div>
      </div>
      <div class="cn-field">
        <label for="cnNewBudget">Pay for the creator (KES)</label>
        <input type="number" id="cnNewBudget" min="${CN_MIN_KES}" step="1" inputmode="numeric" placeholder="e.g. 3000" oninput="_cnCreateFeePreview();_cnCreatePreview()">
        <div class="cn-earn-hint" id="cnNewFeeHint">Minimum KES ${CN_MIN_KES}. A fair price brings better creators — you can raise it later.</div>
      </div>
      <div class="cn-field">
        <label for="cnNewCount">How many videos?</label>
        <input type="number" id="cnNewCount" min="1" max="20" step="1" inputmode="numeric" value="1" oninput="_cnCreatePreview()">
      </div>
      <div class="cn-field">
        <label for="cnNewDeliverables">Short summary of the videos</label>
        <input type="text" id="cnNewDeliverables" placeholder="e.g. 1 TikTok video, 30 seconds" oninput="_cnCreatePreview()">
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🎯</div>
        <div><div class="cn-form-card-title">Who are you looking for? (optional)</div><div class="cn-form-card-sub">Shown next to each creator as a simple ✓ / ✗ — never blocks anyone</div></div>
      </div>
      <div class="cn-field">
        <label for="cnNewMinFollowers">Minimum followers</label>
        <input type="number" id="cnNewMinFollowers" min="0" inputmode="numeric" placeholder="e.g. 5000" oninput="_cnCreatePreview()">
      </div>
      <div class="cn-field">
        <label>Type of creator</label>
        ${_cnMultiSelectHtml('cnNewNiches', CONNECT_NICHES, [])}
      </div>
      <div class="cn-field">
        <label for="cnNewGuidelines">Rules for the video</label>
        <textarea id="cnNewGuidelines" placeholder="e.g. Show our logo, mention our shop in Westlands, use #OurBrand"></textarea>
      </div>
    </div>

    <div class="cn-tip">⚠️ Phone numbers and emails are hidden automatically. Keep chats and payments on EndaViral so your money stays protected.</div>
    <button class="btn-primary" id="cnNewSubmitBtn" onclick="_cnSubmitCreateCampaign()">Continue to payment</button>
    </div>
    <aside class="cn-preview" aria-label="Preview">
      <div class="cn-preview-lbl">How creators will see it</div>
      <div id="cnCreatePreview"></div>
    </aside>
    </div>
  `;
  _cnCreatePreview();
}

function _cnCreatePreview() {
  const el = document.getElementById('cnCreatePreview');
  if (!el) return;
  const price = parseFloat(document.getElementById('cnNewBudget')?.value) || 0;
  const minF = parseInt(document.getElementById('cnNewMinFollowers')?.value) || 0;
  const fake = {
    id: 'preview', title: document.getElementById('cnNewTitle')?.value.trim() || 'Your job title',
    description: document.getElementById('cnNewDesc')?.value.trim() || 'Your description shows here.',
    platform: _cnMultiSelectValue('cnNewPlatforms') || 'tiktok', price_kes: price, budget_kes: price,
    creator_take_home_kes: Math.round(price * (1 - CONNECT_COMMISSION_RATE) * 100) / 100,
    min_followers: minF, required_niche: _cnMultiSelectValue('cnNewNiches'), status: 'published',
    budget_secured: true, applicant_count: 0, hire_days_left: 14,
    business_name: (_cnBusinessProfile && _cnBusinessProfile.company_name) || '',
  };
  const prevTab = _cnTab; _cnTab = 'discover';
  el.innerHTML = _cnCardHtml(fake).replace(/onclick="_cnOpenCampaign\('preview'\)"/, 'style="cursor:default;"');
  _cnTab = prevTab;
}

function _cnCreateFeePreview() {
  const v = parseFloat(document.getElementById('cnNewBudget').value);
  const el = document.getElementById('cnNewFeeHint');
  if (!el) return;
  if (!v || v < CN_MIN_KES) { el.textContent = `Minimum KES ${CN_MIN_KES}. A fair price brings better creators — you can raise it later.`; return; }
  const fee = _cnPlatformProcessingFee(v);
  el.innerHTML = `You'll pay <b>${fmtKES(v + fee)}</b> now (KES ${v.toLocaleString()} held for the creator + KES ${fee} M-Pesa &amp; safety fee). The creator takes home ${fmtKES(Math.round(v * (1 - CONNECT_COMMISSION_RATE)))}.`;
}

async function _cnSubmitCreateCampaign() {
  const title = document.getElementById('cnNewTitle').value.trim();
  const description = document.getElementById('cnNewDesc').value.trim();
  const platform = _cnMultiSelectValue('cnNewPlatforms');
  const budget_kes = parseFloat(document.getElementById('cnNewBudget').value);
  const required_deliverable_count = parseInt(document.getElementById('cnNewCount').value) || 1;
  const deliverables = document.getElementById('cnNewDeliverables').value.trim()
    || `${required_deliverable_count} video${required_deliverable_count === 1 ? '' : 's'}`;
  const min_followers = parseInt(document.getElementById('cnNewMinFollowers').value) || 0;
  const required_niche = _cnMultiSelectValue('cnNewNiches') || null;
  const content_guidelines = document.getElementById('cnNewGuidelines').value.trim() || null;

  if (!title || title.length < 3) { toast('Give your job a short title', 'error'); return; }
  if (!description || description.length < 10) { toast('Describe the job in a few more words', 'error'); return; }
  if (!platform) { toast('Pick where the video should be posted', 'error'); return; }
  const amtErr = _cnAmountError(budget_kes, 'Pay');
  if (amtErr) { toast(amtErr, 'error'); return; }
  if (required_deliverable_count < 1 || required_deliverable_count > 20) { toast('Number of videos must be between 1 and 20', 'error'); return; }

  const btn = document.getElementById('cnNewSubmitBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  let campaign;
  try {
    campaign = await api('/connect/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title, description, platform, budget_kes, deliverables, required_deliverable_count,
        min_followers, required_niche, content_guidelines,
      }),
    });
  } catch (e) {
    toast(e.message || 'Could not save the job', 'error');
    btn.disabled = false; btn.textContent = 'Continue to payment';
    return;
  }
  Store.invalidate('connectCampaigns');
  toast('Saved — one step left: pay to go live', 'success');
  // Straight into the job, where the vault card's Pay button is waiting.
  await _cnOpenCampaign(campaign.id);
  _cnOpenPaySheetV2(campaign.id, 'budget');
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
async function _cnRenderCreatorProfileForm(target) {
  let profile = null;
  try { profile = await api('/connect/profile/creator/me'); } catch (_) { /* not created yet */ }
  _cnCreatorProfile = profile;

  // Seed the per-platform follower values from whatever the server has on
  // file, so re-opening the form doesn't wipe out numbers already entered.
  _cnCpFollowerValues = { ...(profile?.platform_followers || {}) };
  _cnCpLinkValues = { ...(profile?.platform_links || {}) };

  target.innerHTML = `
    ${profile?.joined_at ? `<div class="cn-hero-badge" style="display:inline-flex;margin-bottom:14px;">✅ Joined EndaViral Connect on ${new Date(profile.joined_at).toLocaleDateString()}</div>` : ''}

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🎬</div>
        <div><div class="cn-form-card-title">About you</div><div class="cn-form-card-sub">Businesses see this when choosing a creator</div></div>
      </div>
      <div class="cn-field"><label>Your creator name</label><input type="text" id="cnCpName" maxlength="60" value="${esc(profile?.display_name || '')}" placeholder="e.g. Amina Creates"></div>
      <div class="cn-field"><label>Short bio</label><textarea id="cnCpBio" maxlength="1000" placeholder="What kind of videos do you make? Who watches you?">${esc(profile?.bio || '')}</textarea></div>
      <div class="cn-field"><label>Location</label><input type="text" id="cnCpLocation" value="${esc(profile?.location || '')}" placeholder="e.g. Nairobi, Kenya"></div>
      <div class="cn-field"><label>What do you post about?</label>${_cnMultiSelectHtml('cnCpNiches', CONNECT_NICHES, (profile?.niches || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))}</div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📱</div>
        <div><div class="cn-form-card-title">Your accounts</div><div class="cn-form-card-sub">Required: a profile link for at least one platform</div></div>
      </div>
      <div class="cn-field">
        <label>Which platforms are you on?</label>
        ${_cnMultiSelectHtml('cnCpPlatforms', CONNECT_PLATFORMS, (profile?.platforms || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))}
      </div>
      <div id="cnCpFollowersWrap"></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🔒</div>
        <div><div class="cn-form-card-title">Where we pay you</div><div class="cn-form-card-sub">Needed before you can send prices</div></div>
      </div>
      <div class="cn-tip">🔒 Private: only EndaViral sees this. Businesses never see your number. Your earnings are sent here.</div>
      <div class="cn-field"><label>Email</label><input type="email" id="cnCpEmail" value="${esc(profile?.email || '')}" placeholder="you@example.com"></div>
      <div class="cn-field"><label>M-Pesa phone number</label><input type="tel" inputmode="tel" id="cnCpPhone" value="${esc(profile?.phone || '')}" placeholder="07XXXXXXXX"></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">💰</div>
        <div><div class="cn-form-card-title">Your usual prices (optional)</div><div class="cn-form-card-sub">Just a guide — you can agree a different price for each job</div></div>
      </div>
      <div class="cn-field"><label>Short Video</label><input type="number" id="cnCpPriceVideo" value="${profile?.prices_kes?.short_video || ''}" min="0"></div>
      <div class="cn-field"><label>Instagram Reel</label><input type="number" id="cnCpPriceReel" value="${profile?.prices_kes?.ig_reel || ''}" min="0"></div>
      <div class="cn-field"><label>TikTok</label><input type="number" id="cnCpPriceTiktok" value="${profile?.prices_kes?.tiktok || ''}" min="0"></div>
    </div>

    <button class="btn-primary" id="cnCpSaveBtn" onclick="_cnSaveCreatorProfile()">Save</button>

    ${profile ? `
    <div class="cn-form-card" style="margin-top:16px;">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📊</div>
        <div><div class="cn-form-card-title">Your Track Record</div></div>
      </div>
      <div class="cn-profile-stats">
        ${profile.is_verified ? `<div class="cn-profile-stat"><div class="cn-profile-stat-val" style="color:#3dd44a;">✓</div><div class="cn-profile-stat-lbl">Verified</div></div>` : ''}
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">⭐ ${profile.rating_avg || 0}</div><div class="cn-profile-stat-lbl">${profile.rating_count || 0} ratings</div></div>
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">${profile.jobs_completed || 0}</div><div class="cn-profile-stat-lbl">Jobs done</div></div>
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">${profile.success_rate_pct || 0}%</div><div class="cn-profile-stat-lbl">Success rate</div></div>
        ${profile.response_time_hours != null ? `<div class="cn-profile-stat"><div class="cn-profile-stat-val">~${profile.response_time_hours}h</div><div class="cn-profile-stat-lbl">Response time</div></div>` : ''}
        ${profile.academy ? `<div class="cn-profile-stat"><div class="cn-profile-stat-val">🎓 ${profile.academy.modules_completed || 0}</div><div class="cn-profile-stat-lbl">Academy modules</div></div>` : ''}
      </div>
      ${profile.is_suspended ? `<div class="cn-lost-banner" style="margin-top:12px;margin-bottom:0;">⛔ Suspended${profile.suspend_reason ? ': ' + esc(profile.suspend_reason) : ''}</div>` : ''}
    </div>
    ${profile.portfolio && profile.portfolio.length ? `
    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🏆</div>
        <div><div class="cn-form-card-title">Portfolio — Past Campaigns</div></div>
      </div>
      ${profile.portfolio.map(pf => `
        <div class="cn-row"><span class="k">${esc(pf.title)} · ${esc(pf.business_name)}</span><span class="v" style="font-weight:400;">${pf.completed_at ? new Date(pf.completed_at).toLocaleDateString() : ''}</span></div>
      `).join('')}
    </div>` : ''}
    ` : ''}
  `;

  _cnRenderFollowerInputs();
}

// ─── Per-platform follower/subscriber counts ───────────────────────────────
// A creator only has an input for a platform once they've ticked it under
// "Platforms you're active on" — someone only on TikTok and Instagram never
// sees Facebook/YouTube fields. Values persist in _cnCpFollowerValues while
// the form is open (across platform ticks/unticks) and get sent as
// platform_followers on save; the server derives the visible total from
// this, so there's no separate "Follower Count" field anymore.
let _cnCpFollowerValues = {};
let _cnCpLinkValues = {};      // platform -> profile link (or @handle while typing)

function _cnRenderFollowerInputs() {
  const wrap = document.getElementById('cnCpFollowersWrap');
  if (!wrap) return;
  const selected = _cnMultiState['cnCpPlatforms'] || [];

  if (!selected.length) {
    wrap.innerHTML = `<div class="cn-tip">👆 Pick at least one platform above, then paste your profile link. You need at least one to accept jobs.</div>`;
    return;
  }

  wrap.innerHTML = selected.map(key => {
    const p = _cnPlatformDef(key);
    const val = _cnCpFollowerValues[key] ?? '';
    const link = _cnCpLinkValues[key] ?? '';
    return `
      <div class="cn-cp-acct">
        <div class="cn-cp-acct-h">${p.emoji} ${esc(p.label)}</div>
        <div class="cn-cp-acct-row">
          <input type="text" inputmode="url" autocapitalize="off" spellcheck="false" id="cnCpLink-${key}"
            placeholder="@yourhandle or ${esc(p.label)} profile link" value="${esc(link)}" aria-label="${esc(p.label)} profile link"
            oninput="_cnCpLinkValues['${key}'] = this.value; _cnCpLinkHint('${key}')" onblur="_cnCpLinkNormalize('${key}')">
          <input type="number" min="0" inputmode="numeric" placeholder="Followers" id="cnCpFollowers-${key}" value="${esc(String(val))}" aria-label="${esc(p.label)} followers"
            oninput="_cnCpFollowerValues['${key}'] = this.value === '' ? '' : parseInt(this.value) || 0;">
        </div>
        <div class="cn-acc-hint" id="cnCpLinkHint-${key}"></div>
      </div>`;
  }).join('') + `<div style="font-size:11.5px;color:var(--muted);">At least one link is required. Every job you accept shows these to the business automatically, so they can open your real accounts.</div>`;
  selected.forEach(_cnCpLinkHint);
}

function _cnCpLinkHint(key) {
  const el = document.getElementById(`cnCpLinkHint-${key}`);
  if (!el) return;
  const a = { platform: key, url: _cnCpLinkValues[key] || '' };
  const url = _cnAccUrlFor(a);
  el.innerHTML = !url ? '' : (_cnAccValid(a)
    ? `Opens <span class="cn-link-wrap">${esc(url)}</span>`
    : `⚠️ That isn't a ${esc(_cnPlatformDef(key).label)} link`);
}

// Turn "@amina" into the full link once they leave the box, so they see
// exactly what businesses will open.
function _cnCpLinkNormalize(key) {
  const a = { platform: key, url: _cnCpLinkValues[key] || '' };
  if (a.url && _cnAccValid(a)) {
    _cnCpLinkValues[key] = _cnAccUrlFor(a);
    const input = document.getElementById(`cnCpLink-${key}`);
    if (input) input.value = _cnCpLinkValues[key];
  }
  _cnCpLinkHint(key);
}

async function _cnSaveCreatorProfile() {
  const btn = document.getElementById('cnCpSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const selectedPlatforms = _cnMultiState['cnCpPlatforms'] || [];
  // Only send counts for platforms currently ticked — a stray leftover
  // value for a platform someone unticked shouldn't be submitted (the
  // server rejects follower keys outside the selected platform list).
  const platform_followers = {};
  const platform_links = {};
  for (const key of selectedPlatforms) {
    const v = _cnCpFollowerValues[key];
    platform_followers[key] = (v === '' || v === undefined || v === null) ? 0 : v;
    const raw = (_cnCpLinkValues[key] || '').trim();
    if (raw) {
      const a = { platform: key, url: raw };
      if (!_cnAccValid(a)) {
        toast(`Check your ${_cnPlatformDef(key).label} link`, 'error');
        document.getElementById(`cnCpLink-${key}`)?.focus();
        btn.disabled = false; btn.textContent = 'Save';
        return;
      }
      platform_links[key] = _cnAccUrlFor(a);
    }
  }

  if (!Object.keys(platform_links).length) {
    toast('Add the link to at least one of your social profiles', 'error');
    const first = selectedPlatforms[0];
    if (first) document.getElementById(`cnCpLink-${first}`)?.focus();
    else _cnMsToggleOpen('cnCpPlatforms');
    btn.disabled = false; btn.textContent = 'Save';
    return;
  }
  const cpPhone = document.getElementById('cnCpPhone').value.trim();
  const cpEmail = document.getElementById('cnCpEmail').value.trim();
  if (!cpPhone) { toast('Add your M-Pesa number so we can pay you', 'error'); btn.disabled = false; btn.textContent = 'Save'; return; }
  if (!cpEmail) { toast('Add your email address', 'error'); btn.disabled = false; btn.textContent = 'Save'; return; }
  const payload = {
    display_name: document.getElementById('cnCpName').value.trim() || null,
    bio: document.getElementById('cnCpBio').value.trim() || null,
    location: document.getElementById('cnCpLocation').value.trim() || null,
    niches: _cnMultiSelectValue('cnCpNiches') || null,
    platforms: _cnMultiSelectValue('cnCpPlatforms') || null,
    platform_followers,
    platform_links,
    email: document.getElementById('cnCpEmail').value.trim() || null,
    phone: document.getElementById('cnCpPhone').value.trim() || null,
    price_short_video_kes: parseFloat(document.getElementById('cnCpPriceVideo').value) || null,
    price_ig_reel_kes: parseFloat(document.getElementById('cnCpPriceReel').value) || null,
    price_tiktok_kes: parseFloat(document.getElementById('cnCpPriceTiktok').value) || null,
  };
  try {
    await api('/connect/profile/creator', { method: 'POST', body: JSON.stringify(payload) });
    toast('Saved! Now pick a job.', 'success');
    // Send the creator straight into Discover so they can start applying.
    _cnSetTab('discover');
    return;
  } catch (e) {
    toast(e.message || 'Could not save profile', 'error');
  }
  btn.disabled = false; btn.textContent = 'Save';
}

async function _cnRenderBusinessProfileForm(target) {
  let profile = null;
  try { profile = await api(`/connect/profile/business/${currentUser.id}`); } catch (_) { /* not created yet */ }
  _cnBusinessProfile = profile;

  target.innerHTML = `
    ${profile?.joined_at ? `<div class="cn-hero-badge" style="display:inline-flex;margin-bottom:14px;">✅ Joined EndaViral Connect on ${new Date(profile.joined_at).toLocaleDateString()}</div>` : ''}

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🏢</div>
        <div><div class="cn-form-card-title">Your business</div><div class="cn-form-card-sub">Creators see this name on your jobs</div></div>
      </div>
      <div class="cn-field"><label>Business name</label><input type="text" id="cnBpName" value="${esc(profile?.company_name || '')}"></div>
      <div class="cn-field"><label>What does your business do?</label><input type="text" id="cnBpIndustry" value="${esc(profile?.industry || '')}" placeholder="e.g. Shoe shop, Restaurant, Salon"></div>
      <div class="cn-field"><label>Website (optional)</label><input type="url" inputmode="url" id="cnBpWebsite" value="${esc(profile?.website || '')}" placeholder="www.yourshop.co.ke"></div>
    </div>

    <button class="btn-primary" id="cnBpSaveBtn" onclick="_cnSaveBusinessProfile()">Save</button>

    ${profile ? `
    <div class="cn-form-card" style="margin-top:16px;">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📊</div>
        <div><div class="cn-form-card-title">Your Track Record</div></div>
      </div>
      <div class="cn-profile-stats">
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">⭐ ${profile.rating_avg || 0}</div><div class="cn-profile-stat-lbl">${profile.rating_count || 0} ratings</div></div>
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">${profile.campaigns_posted || 0}</div><div class="cn-profile-stat-lbl">Posted</div></div>
        <div class="cn-profile-stat"><div class="cn-profile-stat-val">${profile.campaigns_completed || 0}</div><div class="cn-profile-stat-lbl">Completed</div></div>
      </div>
    </div>` : ''}
  `;
}

async function _cnSaveBusinessProfile() {
  const name = document.getElementById('cnBpName').value.trim();
  if (!name || name.length < 2) { toast('Enter your business name', 'error'); return; }
  const btn = document.getElementById('cnBpSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const payload = {
    company_name: name,
    industry: document.getElementById('cnBpIndustry').value.trim() || null,
    website: document.getElementById('cnBpWebsite').value.trim() || null,
  };
  try {
    await api('/connect/profile/business', { method: 'POST', body: JSON.stringify(payload) });
    toast('Saved! Now post your first job.', 'success');
    // Send the business straight into campaign creation next.
    _cnSetTab('create');
    return;
  } catch (e) {
    toast(e.message || 'Could not save profile', 'error');
  }
  btn.disabled = false; btn.textContent = 'Save';
}

// ─── Campaign detail modal ─────────────────────────────────────────────────
async function _cnOpenCampaign(campaignId) {
  const modal = document.getElementById('cnCampaignModal');
  const body = document.getElementById('cnCampaignModalBody');
  if (!modal || !body) return;
  body.innerHTML = `<div class="cn-empty">Loading…</div>`;
  modal.classList.add('show');

  let campaign;
  try {
    campaign = await api(`/connect/campaigns/${campaignId}`);
  } catch (e) {
    body.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load this campaign.")}</div>`;
    return;
  }
  _cnCurrentCampaign = campaign;

  // Business viewing their own still-open campaign only needs the COUNTS
  // here — a campaign can have hundreds or thousands of bids, so the full
  // list is loaded lazily, a page at a time, only once the business opens
  // the Bids Inbox screen (see _cnOpenBidsInbox).
  _cnBidCounts = {};
  _cnCurrentApplications = [];
  _cnActiveNegotiationApp = null;

  _cnRenderCampaignModal();
}

function _cnCloseCampaign() {
  document.getElementById('cnCampaignModal').classList.remove('show');
  if (_cnFundPollTimer) { clearInterval(_cnFundPollTimer); _cnFundPollTimer = null; }
  if (typeof PaymentEvents !== 'undefined' && _cnLastFundCheckoutId) {
    PaymentEvents.off(_cnLastFundCheckoutId);
  }
}

function _cnRenderCampaignModal() {
  const c = _cnCurrentCampaign;
  const body = document.getElementById('cnCampaignModalBody');
  const plats = _cnPlatformDefs(c.platform);
  const isBusinessOwner = currentUser && currentUser.id === c.business_user_id;
  const isAssignedCreator = currentUser && currentUser.id === c.creator_user_id;

  let html = `
    <div style="font-size:11.5px;font-weight:800;color:#2196f3;margin-bottom:6px;">${plats.map(p => `${p.emoji} ${esc(p.label)}`).join(' + ')}</div>
    <div class="modal-title" style="margin-bottom:4px;">${esc(c.title)}</div>
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">${_cnStatusPill(c.status)}${c.is_frozen ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e5393520;color:#ff8a80;border:1px solid #e5393540;">🧊 Frozen by admin</span>` : ''}</div>
    ${c.is_frozen ? `<div style="font-size:12px;color:#ff8a80;background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);border-radius:10px;padding:10px 12px;margin-bottom:14px;">This campaign is frozen${c.frozen_reason ? ': ' + esc(c.frozen_reason) : ''}. No actions can be taken until an admin unfreezes it.</div>` : ''}
  `;

  // The vault — business always; creator sees a calmer "money held" version.
  if (isBusinessOwner) html += _cnVaultHtml(c);
  else if (c.status === 'published' && c.budget_secured) html += _cnCreatorVaultHtml(c);

  html += `
    <div class="cn-summary-card">
      <div style="font-size:13px;color:var(--white);line-height:1.6;margin-bottom:${c.content_guidelines ? '12px' : '0'};">${esc(c.description)}</div>
      ${c.content_guidelines ? `<div style="font-size:12.5px;color:var(--muted);line-height:1.5;"><span style="font-weight:800;color:var(--white);">Video rules:</span> ${esc(c.content_guidelines)}</div>` : ''}
      <div class="cn-chip-row" style="white-space:normal;">
        <span class="cn-chip cn-chip-money">Pay ${fmtKES(c.price_kes ?? c.budget_kes)}</span>
        <span class="cn-chip" style="white-space:normal;">📦 ${esc(c.deliverables)}${c.required_deliverable_count > 1 ? ` (${c.required_deliverable_count} videos)` : ''}</span>
        ${c.min_followers ? `<span class="cn-chip">👥 ${c.min_followers.toLocaleString()}+ followers</span>` : ''}
        ${_cnNicheTagsHtml(c.required_niche, 'cn-chip')}
        ${c.business_name && !isBusinessOwner ? `<span class="cn-chip">🏢 ${esc(c.business_name)}</span>` : ''}
      </div>
    </div>
  `;

  const _cnShowReceipts = isBusinessOwner && c.status !== 'draft';
  if (_cnShowReceipts) {
    html += `<details style="margin-bottom:14px;"><summary style="font-size:12.5px;color:var(--muted);cursor:pointer;">🧾 Payments & receipts</summary><div id="cnReceiptsArea" style="margin-top:10px;"><div style="color:var(--muted);font-size:12px;">Loading…</div></div></details>`;
  }

  // Role/status-specific actions slot into the chat panel (see below) so
  // "Submit / Approve / Send my money" sit right where both sides talk.
  let actionHtml = '';
  if (!c.is_frozen) {
  if (!isBusinessOwner && _cnRole === 'creator' && (c.my_application_status || c.status === 'published')) {
    html += c.my_application_status ? _cnMyApplicationSummaryHtml(c) : _cnAcceptCtaHtml(c);
  }

  if (isBusinessOwner && c.status === 'published') {
    const n = c.applicant_count || 0;
    html += `<div class="cn-bids-summary">
      <div>
        <div class="cn-bids-summary-count">${n}</div>
        <div class="cn-bids-summary-lbl">${n === 1 ? 'creator accepted' : 'creators accepted'} · tap to check their accounts</div>
      </div>
      <button class="btn-primary" onclick="_cnOpenBidsInbox('${c.id}')">Review creators</button>
    </div>
    <button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="_cnOpenInviteModal(null,null,'${c.id}')">✉️ Invite a creator</button>`;
  }

  if (!isBusinessOwner && c.my_application_status === 'not_selected') {
    actionHtml += `<div class="cn-lost-banner">😔 ${c.status === 'expired' || c.status === 'cancelled' ? 'This job closed without a hire.' : 'The business hired another creator.'} More jobs are waiting in Find Jobs.</div>`;
  }
  if (!isBusinessOwner && c.my_application_status === 'rejected') {
    actionHtml += `<div class="cn-lost-banner">The business didn't pick you this time.</div>`;
  }

  if (isAssignedCreator && c.status === 'funded') actionHtml += _cnDeliverableFormHtml();
  if (isBusinessOwner && c.status === 'submitted') {
    actionHtml += `<div class="cn-section-lbl">Check the videos ${_cnReviewCountdownHtml(c)}</div><div id="cnDeliverableReview">Loading…</div>`;
  }
  if (isAssignedCreator && c.status === 'submitted') {
    actionHtml += `<div class="cn-section-lbl">Waiting for the business ${_cnReviewCountdownHtml(c)}</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;">The business has ${CN_REVIEW_WINDOW_HOURS} hours to approve or ask for changes. If they don't reply, EndaViral will step in so you still get paid.</div>`;
  }
  if ((isBusinessOwner || isAssignedCreator) && ['funded', 'submitted', 'under_review'].includes(c.status)) {
    actionHtml += `<button class="cn-danger-link" onclick="_cnOpenDisputeForm()">⚠️ Something wrong? Ask EndaViral to help</button><div id="cnDisputeForm"></div>`;
  }
  if (isAssignedCreator && c.status === 'completed') {
    actionHtml += `<div class="cn-section-lbl">💰 Your money</div><div id="cnPayoutArea"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>`;
  }
  if ((isBusinessOwner || isAssignedCreator) && c.status === 'completed') {
    actionHtml += `<div id="cnReviewArea"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>`;
  }
  if (isBusinessOwner && ['completed', 'cancelled', 'expired'].includes(c.status)) {
    html += `<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="_cnArchiveCampaign('${c.id}')">🗄 Move to archive</button>`;
  }
  } // end !c.is_frozen

  // A creator can ask the business questions about an open job before
  // accepting, and keeps the same thread after accepting / being hired.
  const creatorCanMessage = _cnRole === 'creator' && !isBusinessOwner
    && (isAssignedCreator || c.status === 'published' || !!c.my_application_status);
  const showsSingleThreadHere = (isBusinessOwner && !!c.creator_user_id) || (!isBusinessOwner && creatorCanMessage);

  _cnMsgThreadCreatorId = null;
  if (showsSingleThreadHere) {
    _cnMsgThreadCreatorId = isBusinessOwner ? c.creator_user_id : currentUser.id;
    const other = isBusinessOwner ? (c.creator_display_name || 'Creator') : (c.business_name || 'Business');
    const sub = c.creator_user_id
      ? 'Work chat — questions about the videos, timing and the brief'
      : (c.my_application_status ? _cnStatusPill(c.my_application_status) : 'Questions about the job before you accept');
    html += `<div class="cn-chat-card" style="padding:0;">
      <div class="cn-bidchat-head">
        <div>
          <div class="cn-bidchat-title">💬 ${esc(other)}</div>
          <div class="cn-bidchat-sub">${sub}</div>
        </div>
      </div>
      <div style="padding:14px 16px 0;">
        <div class="cn-msgs" id="cnMsgList"><div style="color:var(--muted);font-size:12px;padding:14px 0;text-align:center;">Loading…</div></div>
        <div id="cnMsgActionCard">${actionHtml}</div>
      </div>
      <div id="cnMsgInputRow" style="padding:0 16px 14px;"></div>
    </div>`;
  } else if (actionHtml) {
    html += `<div id="cnMsgActionCard">${actionHtml}</div>`;
  }

  body.innerHTML = html;

  if (showsSingleThreadHere) {
    _cnRenderMsgInputRow(c.id);
    _cnLoadMessages(c.id, _cnMsgThreadCreatorId);
  }
  if (isBusinessOwner && c.status === 'submitted') _cnLoadDeliverableForReview(c.id);
  if ((isBusinessOwner || isAssignedCreator) && c.status === 'completed') _cnLoadReviewArea(c);
  if (isAssignedCreator && c.status === 'completed') _cnLoadPayoutArea(c);
  if (_cnShowReceipts) _cnLoadReceipts(c.id);
}

// ─── The vault (business) ─────────────────────────────────────────────────
// One card that always answers "where is my money and what happens to it
// next?" — not paid yet / held & live (with the hire-by fuse) / working /
// returned to balance.
function _cnVaultHtml(c) {
  const held = Number(c.escrow_kes || 0);
  const price = Number(c.price_kes ?? c.budget_kes);
  if (c.status === 'draft' || (c.status === 'published' && !c.budget_secured)) {
    const due = Number(c.amount_due_kes || price), fee = Number(c.amount_due_fee_kes || 0);
    return `<div class="cn-vault is-open">
      <div class="cn-vault-top">
        <div class="cn-vault-seal">🔓</div>
        <div><div class="cn-vault-amt">${fmtKES(due)}</div>
        <div class="cn-vault-cap">Not live yet. Pay the creator's price once and your job appears on Find Jobs with a 🔒 Budget secured badge.</div></div>
      </div>
      <div class="cn-vault-breakdown">
        <div><span>Held for the creator</span><b>${fmtKES(due)}</b></div>
        <div><span>M-Pesa & safety fee</span><b>${fmtKES(fee)}</b></div>
        <div class="tot"><span>You pay</span><b>${fmtKES(due + fee)}</b></div>
      </div>
      <div class="cn-vault-actions">
        <button class="btn-primary" onclick="_cnOpenPaySheetV2('${c.id}','budget')">🔒 Pay & go live</button>
        ${c.status === 'draft' ? `<button class="btn-secondary" onclick="_cnOpenPaySheetV2('${c.id}','price')">Change price</button>` : ''}
      </div>
      ${!c.is_frozen ? `<button class="cn-danger-link" onclick="_cnCancelCampaign('${c.id}', false)">Delete this draft</button>` : ''}
    </div>`;
  }
  if (c.status === 'published') {
    const days = c.hire_days_left;
    const pct = days == null ? 100 : Math.max(4, Math.min(100, (days / 14) * 100));
    return `<div class="cn-vault">
      <div class="cn-vault-top">
        <div class="cn-vault-seal">🔒</div>
        <div><div class="cn-vault-amt">${fmtKES(held)}</div>
        <div class="cn-vault-cap">Held by EndaViral. Hire a creator and it goes to work; the creator is only paid after you approve the video.</div></div>
      </div>
      <div class="cn-vault-fuse ${days != null && days < 3 ? 'low' : ''}"><span style="width:${pct}%;"></span></div>
      <div class="cn-vault-meta">
        <span>${days == null ? 'No hire deadline' : (days < 1 ? 'Hire today' : `Hire within ${Math.ceil(days)} day${Math.ceil(days) === 1 ? '' : 's'}`)}</span>
        <span>Not hired by then? It all comes back to your balance.</span>
      </div>
      <div class="cn-vault-actions">
        <button class="btn-secondary" onclick="_cnOpenPaySheetV2('${c.id}','topup')">📈 Raise the pay</button>
        <button class="btn-secondary" onclick="_cnCancelCampaign('${c.id}', true)">Close & refund to balance</button>
      </div>
    </div>`;
  }
  if (['funded', 'submitted', 'under_review', 'disputed'].includes(c.status)) {
    return `<div class="cn-vault">
      <div class="cn-vault-top">
        <div class="cn-vault-seal">🔒</div>
        <div><div class="cn-vault-amt">${fmtKES(held)}</div>
        <div class="cn-vault-cap">${c.status === 'disputed' ? 'Frozen while EndaViral reviews the dispute.' : `Working — ${esc(c.creator_display_name || 'your creator')} is on it. Released only when you approve.`}</div></div>
      </div>
    </div>`;
  }
  if (['cancelled', 'expired'].includes(c.status) && Number(c.refunded_kes) > 0) {
    return `<div class="cn-vault is-done">
      <div class="cn-vault-top">
        <div class="cn-vault-seal">↩️</div>
        <div><div class="cn-vault-amt">${fmtKES(c.refunded_kes)}</div>
        <div class="cn-vault-cap">Returned to your EndaViral balance${c.status === 'expired' ? ' because nobody was hired in time' : ''}. Use it on your next job with no fee, or cash it out in My Jobs.</div></div>
      </div>
    </div>`;
  }
  return '';
}

function _cnCreatorVaultHtml(c) {
  return `<div class="cn-vault">
    <div class="cn-vault-top">
      <div class="cn-vault-seal">🔒</div>
      <div><div class="cn-vault-amt">${fmtKES(c.creator_take_home_kes)}</div>
      <div class="cn-vault-cap">What you take home if you're hired and the business approves your work. The full ${fmtKES(c.price_kes)} is already held by EndaViral — no haggling, no chasing payment.</div></div>
    </div>
    ${c.hire_days_left != null ? `<div class="cn-vault-meta" style="margin-top:10px;"><span>${esc(_cnDaysLeftLabel(c.hire_days_left))}</span><span>${c.applicant_count || 0} accepted so far</span></div>` : ''}
  </div>`;
}

// 48h business-review countdown badge.
function _cnReviewCountdownHtml(c) {
  if (!c.review_hours_remaining && c.review_hours_remaining !== 0) return '';
  const overdue = c.review_hours_remaining <= 0;
  const label = overdue
    ? `Time is up — EndaViral will step in`
    : `${Math.max(1, Math.round(c.review_hours_remaining))} hours left`;
  return `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px;${overdue ? 'background:#e5393520;color:#ff8a80;' : 'background:#2196f320;color:#64b5f6;'}">${label}</span>`;
}
const CN_REVIEW_WINDOW_HOURS = 48;

// ─── Accept (creator) — fixed price + account proof ───────────────────────
function _cnAcceptCtaHtml(c) {
  return `
    <div class="cn-step-hint">✅ <b>No bidding.</b> Accept the price and show the business your accounts — links plus a screenshot or two. Businesses hire the creators they can check.</div>
    <button class="btn-primary" onclick="_cnOpenAcceptSheet()">Accept this job — ${fmtKES(c.price_kes)}</button>
  `;
}

const CN_PLATFORM_URL = {
  tiktok: h => `https://www.tiktok.com/@${h}`,
  instagram: h => `https://www.instagram.com/${h}`,
  facebook: h => `https://www.facebook.com/${h}`,
  youtube: h => `https://www.youtube.com/@${h}`,
};
const CN_PLATFORM_HOSTS = {
  tiktok: ['tiktok.com'], instagram: ['instagram.com', 'instagr.am'],
  facebook: ['facebook.com', 'fb.com', 'fb.me'], youtube: ['youtube.com', 'youtu.be'],
};
const CN_SHOT_KINDS = [
  { key: 'profile', label: 'Profile page' },
  { key: 'insights', label: 'Insights / analytics' },
  { key: 'audience', label: 'Audience (where followers are)' },
  { key: 'other', label: 'Other' },
];
let _cnAccept = { accounts: [], shots: [] };

function _cnOpenAcceptSheet() {
  const c = _cnCurrentCampaign;
  const prof = _cnCreatorProfile || {};
  // Profile links travel with every acceptance automatically (the server
  // attaches them too); rows below are only for EXTRA accounts.
  _cnAccept = { accounts: [], shots: [] };
  const body = document.getElementById('cnCampaignModalBody');
  body.innerHTML = `
    <button class="cn-bidchat-back" style="display:flex;margin-bottom:10px;" onclick="_cnRenderCampaignModal()" aria-label="Back to the job">←</button>
    <div class="modal-title" style="margin-bottom:2px;">Accept “${esc(c.title)}”</div>
    <div class="cn-accept-hero">
      <div class="lbl">You take home</div>
      <div class="amt">${fmtKES(c.creator_take_home_kes)}</div>
      <div class="sub">${fmtKES(c.price_kes)} job price, minus EndaViral's 15% fee · already held</div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head"><div class="cn-form-card-icon">🔗</div>
        <div><div class="cn-form-card-title">Your accounts</div><div class="cn-form-card-sub">Sent automatically from your profile — the business taps them to see the real accounts</div></div></div>
      <div class="cn-myapp-accts" style="margin:0 0 6px;">${_cnAccountChipsHtml(_cnProfileAccounts(), true)}</div>
      ${_cnProfileAccounts().some(a => (c.platform || '').includes(a.platform)) ? '' : `<div class="cn-acc-hint" style="color:#ffb020;margin-top:6px;">This job is for ${esc(_cnPlatformDefs(c.platform).map(p => p.label).join(' / '))} — add that account below if you have it.</div>`}
      <button class="cn-link-btn" onclick="_cnCloseCampaign();_cnSetTab('profile')">Edit in My Profile</button>
      <div id="cnAccRows" style="margin-top:8px;"></div>
      <button class="cn-link-btn" id="cnAccAdd" onclick="_cnAccAdd()">+ Add an account that isn't on your profile</button>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head"><div class="cn-form-card-icon">📸</div>
        <div><div class="cn-form-card-title">Screenshots</div><div class="cn-form-card-sub">Your profile page, and your insights if you can — they're the strongest proof</div></div></div>
      <div class="cn-shots" id="cnShots"></div>
      <input type="file" id="cnShotInput" accept="image/png,image/jpeg,image/webp" multiple style="display:none" onchange="_cnShotsPicked(this)">
      <div style="font-size:11.5px;color:var(--muted);margin-top:8px;">Up to 4. Images are shrunk on your phone before sending, and deleted once the job is decided.</div>
    </div>

    <div class="cn-field"><label for="cnAcceptPitch">Your idea for the video (optional)</label>
      <input type="text" id="cnAcceptPitch" maxlength="500" placeholder="e.g. A get-ready-with-me in your shop, ending on the new shoes"></div>

    <div class="cn-strength" aria-live="polite">
      <div class="cn-strength-bar"><span id="cnStrengthFill" style="width:0"></span></div>
      <div class="cn-strength-lbl" id="cnStrengthLbl">—</div>
    </div>
    <div class="cn-strength-tip" id="cnStrengthTip"></div>

    <label class="cn-confirm-row" style="margin:12px 0;">
      <input type="checkbox" id="cnAcceptOwner" onchange="_cnSyncCheckRow(this)">
      <span class="cn-join-tick">✓</span>
      <span>These accounts are mine, and the screenshots are real.</span>
    </label>
    <button class="btn-primary" id="cnAcceptBtn" onclick="_cnSubmitAccept('${c.id}')">Accept & send to ${esc(c.business_name || 'the business')}</button>
  `;
  _cnRenderAccRows();
  _cnRenderShots();
}

// The creator's saved profile links, shaped like application accounts.
function _cnProfileAccounts() {
  const prof = _cnCreatorProfile || {};
  return Object.entries(prof.platform_links || {}).filter(([, u]) => u).map(([platform, url]) => {
    const m = url.match(/@([^/?#]+)/) || url.match(/\.com\/([^/?#]+)/);
    return { platform, url, handle: m ? m[1] : null, followers: (prof.platform_followers || {})[platform] || null };
  });
}

function _cnAccUrlFor(a) {
  const v = (a.url || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(v)) return 'https://' + v;   // pasted without https://
  const h = v.replace(/^@/, '').replace(/\s+/g, '');
  return h ? (CN_PLATFORM_URL[a.platform] || CN_PLATFORM_URL.tiktok)(h) : '';
}

function _cnAccValid(a) {
  const url = _cnAccUrlFor(a);
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (CN_PLATFORM_HOSTS[a.platform] || []).some(h => host === h || host.endsWith('.' + h));
  } catch (_) { return false; }
}

function _cnRenderAccRows() {
  const wrap = document.getElementById('cnAccRows');
  if (!wrap) return;
  wrap.innerHTML = _cnAccept.accounts.map((a, i) => {
    const url = _cnAccUrlFor(a);
    const bad = a.url && !_cnAccValid(a);
    return `
    <div class="cn-acc-row">
      <select aria-label="Platform" onchange="_cnAccSetPlatform(${i}, this.value)">
        ${CONNECT_PLATFORMS.map(p => `<option value="${p.key}" ${a.platform === p.key ? 'selected' : ''}>${p.emoji} ${esc(p.label)}</option>`).join('')}
      </select>
      <input class="cn-acc-url ${bad ? 'bad' : ''}" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="@yourhandle or profile link" value="${esc(a.url)}" aria-label="Account link or handle"
        oninput="_cnAccept.accounts[${i}].url=this.value;_cnAccHint(${i});_cnUpdateStrength()" onblur="_cnRenderAccRows()">
      <input type="number" min="0" inputmode="numeric" placeholder="Followers" value="${esc(String(a.followers || ''))}" aria-label="Followers"
        oninput="_cnAccept.accounts[${i}].followers=this.value;_cnUpdateStrength()">
      <button class="cn-acc-x" aria-label="Remove account" onclick="_cnAccRemove(${i})">✕</button>
    </div>
    <div class="cn-acc-hint" id="cnAccHint${i}">${url ? (bad ? `⚠️ That isn't a ${esc(_cnPlatformDef(a.platform).label)} link` : `Will open <span class="cn-link-wrap">${esc(url)}</span>`) : ''}</div>`;
  }).join('');
  const add = document.getElementById('cnAccAdd');
  if (add) add.style.display = _cnAccept.accounts.length >= 4 ? 'none' : '';
  _cnUpdateStrength();
}

function _cnAccHint(i) {
  const a = _cnAccept.accounts[i];
  const el = document.getElementById(`cnAccHint${i}`);
  if (!el) return;
  const url = _cnAccUrlFor(a);
  el.innerHTML = url ? (_cnAccValid(a) ? `Will open <span class="cn-link-wrap">${esc(url)}</span>` : `⚠️ That isn't a ${esc(_cnPlatformDef(a.platform).label)} link`) : '';
}

// Switching a row's platform swaps in the saved profile link for it.
function _cnAccSetPlatform(i, platform) {
  const prof = _cnCreatorProfile || {};
  const a = _cnAccept.accounts[i];
  a.platform = platform;
  if (!a.followers) a.followers = (prof.platform_followers || {})[platform] || '';
  _cnRenderAccRows();
}

function _cnAccAdd() {
  if (_cnAccept.accounts.length >= 4) return;
  const used = _cnAccept.accounts.map(a => a.platform).concat(_cnProfileAccounts().map(a => a.platform));
  const next = CONNECT_PLATFORMS.find(p => !used.includes(p.key)) || CONNECT_PLATFORMS[0];
  const prof = _cnCreatorProfile || {};
  _cnAccept.accounts.push({ platform: next.key, url: '', followers: (prof.platform_followers || {})[next.key] || '' });
  _cnRenderAccRows();
}

function _cnAccRemove(i) {
  _cnAccept.accounts.splice(i, 1);
  _cnRenderAccRows();
}

function _cnRenderShots() {
  const wrap = document.getElementById('cnShots');
  if (!wrap) return;
  const tiles = _cnAccept.shots.map((s, i) => `
    <div class="cn-shot" style="cursor:default;border-style:solid;">
      <img src="${s.image_data}" alt="Screenshot ${i + 1}">
      <button class="cn-shot-del" aria-label="Remove screenshot" onclick="_cnAccept.shots.splice(${i},1);_cnRenderShots()">✕</button>
      <select class="cn-shot-kind" aria-label="What this screenshot shows" onchange="_cnAccept.shots[${i}].kind=this.value;_cnUpdateStrength()">
        ${CN_SHOT_KINDS.map(k => `<option value="${k.key}" ${s.kind === k.key ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}
      </select>
    </div>`);
  if (_cnAccept.shots.length < 4) {
    tiles.push(`<button type="button" class="cn-shot" onclick="document.getElementById('cnShotInput').click()"><span style="font-size:22px;">＋</span><span>${_cnAccept.shots.length ? 'Add another' : 'Add a screenshot'}</span></button>`);
  }
  wrap.innerHTML = tiles.join('');
  _cnUpdateStrength();
}

// Shrink on the phone before upload: max 1280px, JPEG ~0.82. A 4MB phone
// screenshot becomes ~200-400KB — faster on mobile data, lighter to store.
function _cnCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image we can read'));
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function _cnShotsPicked(input) {
  const files = Array.from(input.files || []).slice(0, 4 - _cnAccept.shots.length);
  input.value = '';
  for (const f of files) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) { toast('Use a PNG, JPEG or WEBP screenshot', 'error'); continue; }
    if (f.size > 15 * 1024 * 1024) { toast('That image is too big — take a normal screenshot instead', 'error'); continue; }
    try {
      const data = await _cnCompressImage(f);
      const kind = _cnAccept.shots.some(s => s.kind === 'profile') ? 'insights' : 'profile';
      _cnAccept.shots.push({ image_data: data, kind, platform: (_cnAccept.accounts[0] || {}).platform || null });
    } catch (e) { toast(e.message, 'error'); }
  }
  _cnRenderShots();
}

// Mirrors connect_service.proof_strength exactly, so what the creator sees
// here is what the business sees next to their name.
function _cnProofStrength(links, kinds, verified) {
  let score = Math.min(links, 2) * 20 + Math.min(kinds.length, 3) * 10;
  if (kinds.includes('insights') || kinds.includes('audience')) score += 20;
  if (verified) score += 10;
  score = Math.min(score, 100);
  return { score, label: score >= 70 ? 'Strong' : (score >= 40 ? 'Good' : 'Basic') };
}

function _cnUpdateStrength() {
  const fill = document.getElementById('cnStrengthFill');
  if (!fill) return;
  const links = _cnAccept.accounts.filter(_cnAccValid).length + _cnProfileAccounts().length;
  const kinds = _cnAccept.shots.map(s => s.kind);
  const verified = !!(_cnCreatorProfile && _cnCreatorProfile.is_verified);
  const st = _cnProofStrength(links, kinds, verified);
  const color = st.score >= 70 ? '#3dd44a' : (st.score >= 40 ? '#ffb020' : '#ff7043');
  fill.style.width = `${Math.max(st.score, 4)}%`;
  fill.style.background = color;
  const lbl = document.getElementById('cnStrengthLbl');
  lbl.textContent = `${st.label} proof`; lbl.style.color = color;
  let tip = '';
  if (!links) tip = 'Add a profile link in My Profile first.';
  else if (!kinds.length && !verified) tip = 'Add a screenshot of your profile — it is required.';
  else if (!kinds.includes('insights') && !kinds.includes('audience')) tip = 'Tip: an insights screenshot (views, reach, audience) makes businesses far more likely to hire you.';
  else if (links < 2) tip = 'Strong already. Another account helps if you post the same content elsewhere.';
  else tip = 'Great — this is the kind of proof that gets hired.';
  document.getElementById('cnStrengthTip').textContent = tip;
}

async function _cnSubmitAccept(campaignId) {
  const verified = !!(_cnCreatorProfile && _cnCreatorProfile.is_verified);
  const accounts = [];
  for (const a of _cnAccept.accounts) {
    if (!a.url || !a.url.trim()) continue;
    if (!_cnAccValid(a)) { toast(`Check your ${_cnPlatformDef(a.platform).label} link`, 'error'); return; }
    const url = _cnAccUrlFor(a);
    const m = url.match(/@([^/?#]+)/) || url.match(/(?:instagram|facebook)\.com\/([^/?#]+)/i);
    accounts.push({ platform: a.platform, url, handle: m ? m[1] : null, followers: parseInt(a.followers, 10) || null });
  }
  if (!accounts.length && !_cnProfileAccounts().length) { toast('Add a profile link in My Profile first', 'error'); return; }
  if (!_cnAccept.shots.length && !verified) { toast('Add at least one screenshot of your account', 'error'); return; }
  if (!document.getElementById('cnAcceptOwner').checked) { toast('Tick the box to confirm these accounts are yours', 'error'); return; }
  const pitch = document.getElementById('cnAcceptPitch').value.trim() || null;

  const btn = document.getElementById('cnAcceptBtn');
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await api(`/connect/campaigns/${campaignId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ accounts, screenshots: _cnAccept.shots, pitch, owner_confirmed: true }),
    });
    _cnAccept = { accounts: [], shots: [] };
    toast("Sent! You'll see here when the business looks at your accounts.", 'success');
    Store.invalidate('connectApplications');
    Store.invalidate('connectInvites');
    _cnInvalidateDiscover();
    _cnOpenCampaign(campaignId);
    if (_cnTab === 'discover' || _cnTab === 'applications' || _cnTab === 'invites') _cnLoadActiveTab();
  } catch (e) {
    toast(e.message || 'Could not send', 'error');
    btn.disabled = false; btn.textContent = label;
  }
}

// What the creator already sent, whatever its status.
function _cnMyApplicationSummaryHtml(c) {
  const open = ['pending', 'accepted'].includes(c.my_application_status);
  return `
    <div class="cn-myapp">
      <div class="cn-app-top"><span style="font-weight:800;color:var(--white);font-size:13px;">You accepted at ${fmtKES(c.accepted_bid_kes)}</span>${_cnStatusPill(c.my_application_status)}</div>
      <div style="font-size:12px;color:var(--muted);">${c.my_application_proof_count || 0} screenshot${c.my_application_proof_count === 1 ? '' : 's'} sent${c.my_application_proposal ? ` · “${esc(c.my_application_proposal)}”` : ''}</div>
      <div class="cn-myapp-accts">${_cnAccountChipsHtml(c.my_application_accounts, true)}</div>
      ${c.my_application_viewed_at && open ? `<div class="cn-seen">👀 The business looked at your accounts ${new Date(c.my_application_viewed_at).toLocaleDateString()}</div>` : (open ? `<div class="cn-seen" style="color:var(--muted);">Not opened by the business yet</div>` : '')}
      ${open && c.status === 'published' ? `<button class="cn-danger-link" style="padding-bottom:0;" onclick="_cnWithdrawApplication('${c.id}')">Withdraw from this job</button>` : ''}
    </div>
  `;
}

async function _cnWithdrawApplication(campaignId) {
  if (!confirm('Withdraw from this job? The business will no longer see your accounts.')) return;
  try {
    await api(`/connect/campaigns/${campaignId}/application/withdraw`, { method: 'POST' });
    toast('Withdrawn', 'success');
    Store.invalidate('connectApplications');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not withdraw', 'error');
  }
}

// ─── Chat input — no price offers any more; quick prompts keep the
// conversation on the work itself (deliverables, timing, the brief). ─────
function _cnQuickPrompts() {
  const c = _cnCurrentCampaign;
  if (!c) return [];
  const isBusinessOwner = currentUser && currentUser.id === c.business_user_id;
  if (!c.creator_user_id) {
    return isBusinessOwner
      ? ["What's your idea for the video?", 'Could you post by Friday?', 'Have you made videos for a business like ours?']
      : ['Can I post on another platform too?', 'Do you have a script or key message?', 'Can I visit your shop for filming?'];
  }
  return isBusinessOwner
    ? ['Please show our logo in the first 3 seconds', 'Can you share a draft before posting?', 'When will you post?', 'Please tag our account']
    : ['Here is my plan for the video:', 'Can you send your logo?', 'I will post on', 'Any words I must avoid?'];
}

function _cnRenderMsgInputRow(campaignId) {
  const row = document.getElementById('cnMsgInputRow');
  if (!row) return;
  const chips = _cnQuickPrompts();
  row.innerHTML = `
    ${chips.length ? `<div class="cn-chips">${chips.map(t => `<button type="button" class="cn-chip-btn" data-t="${esc(t)}" onclick="_cnUseChip(this.dataset.t)">${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="cn-msg-input-row">
      <input type="text" id="cnMsgInput" maxlength="4000" enterkeyhint="send" placeholder="Ask about the videos, timing or the brief…" onkeydown="if(event.key==='Enter')_cnSendMessage('${campaignId}')" aria-label="Message">
      <button class="btn-secondary" onclick="_cnSendMessage('${campaignId}')">Send</button>
    </div>
  `;
  row.style.display = '';
}

function _cnUseChip(text) {
  const input = document.getElementById('cnMsgInput');
  if (!input) return;
  input.value = text.endsWith(':') || text.endsWith(' on') ? text + ' ' : text;
  input.focus();
}

// ─── Payment receipts (business + creator) ─────────────────────────────────
// Moved to receipt.js — see _cnLoadReceipts / _cnDownloadReceipt (business)
// and _cnDownloadPayoutReceipt (creator). Load receipt.js after this file
// and before either function is called (index.html already does this).

// ─── Submit deliverable (creator) ─────────────────────────────────────────────
function _cnDeliverableFormHtml() {
  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const rows = Array.from({ length: n }, (_, i) => i + 1).map(i => `
    <div class="cn-field" style="border-left:2px solid var(--border);padding-left:10px;margin-bottom:10px;">
      <label>Video ${i}${n > 1 ? ` of ${n}` : ''} — paste the link</label>
      <input type="url" inputmode="url" id="cnDelivUrl${i}" placeholder="https://www.tiktok.com/@you/video/...">
      <label style="margin-top:6px;">Posted on</label>
      <select id="cnDelivPlatform${i}" class="cn-select">
        <option value="tiktok">TikTok</option>
        <option value="instagram">Instagram</option>
        <option value="facebook">Facebook</option>
        <option value="youtube">YouTube</option>
      </select>
      <label style="margin-top:6px;">Screenshot (optional)</label>
      <input type="file" id="cnDelivShot${i}" accept="image/png,image/jpeg,image/webp" onchange="_cnPreviewDelivShot(${i})">
      <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">A photo of the posted video helps if there's ever a problem. Max 4MB.</div>
      <img id="cnDelivShotPreview${i}" style="display:none;max-width:100%;max-height:140px;border-radius:8px;margin-top:6px;border:1px solid var(--border);">
    </div>
  `).join('');

  return `
    <div class="cn-section-lbl">Send your work (${n} video${n === 1 ? '' : 's'})</div>
    <div class="cn-step-hint">✅ The business has paid. <b>Post the video${n === 1 ? '' : 's'} on your account</b>, copy the link${n === 1 ? '' : 's'}, and paste ${n === 1 ? 'it' : 'them'} below.</div>
    ${rows}
    <div class="cn-field"><label>Message to the business (optional)</label><textarea id="cnDelivNote" placeholder="Anything they should know"></textarea></div>
    <label class="cn-confirm-row" style="margin:10px 0;">
      <input type="checkbox" id="cnDelivConfirm" onchange="_cnSyncCheckRow(this)">
      <span class="cn-join-tick">✓</span>
      <span>Yes, the video${n === 1 ? ' is' : 's are'} posted and live at ${n === 1 ? 'this link' : 'these links'}.</span>
    </label>
    <button class="btn-primary" id="cnDelivBtn" onclick="_cnSubmitDeliverable('${_cnCurrentCampaign.id}')">Send to business</button>
  `;
}

const _cnDelivShotData = {};

function _cnPreviewDelivShot(i) {
  const input = document.getElementById(`cnDelivShot${i}`);
  const preview = document.getElementById(`cnDelivShotPreview${i}`);
  const file = input.files && input.files[0];
  if (!file) { delete _cnDelivShotData[i]; if (preview) preview.style.display = 'none'; return; }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    toast('Use a PNG, JPEG, or WEBP image', 'error');
    input.value = '';
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    toast('That screenshot is over 4MB — please use a smaller image', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    _cnDelivShotData[i] = reader.result; // data:image/...;base64,....
    if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
  };
  reader.onerror = () => toast('Could not read that image — try another file', 'error');
  reader.readAsDataURL(file);
}

async function _cnSubmitDeliverable(campaignId) {
  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const items = [];
  for (let i = 1; i <= n; i++) {
    const url = document.getElementById(`cnDelivUrl${i}`).value.trim();
    if (!url) { toast(`Paste the link for video ${i}`, 'error'); return; }
    if (!/^https?:\/\//i.test(url)) { toast(`Video ${i}: paste the full link starting with https://`, 'error'); return; }
    const item = { content_url: url, platform_posted_to: document.getElementById(`cnDelivPlatform${i}`).value };
    if (_cnDelivShotData[i]) item.screenshot_data = _cnDelivShotData[i];
    items.push(item);
  }
  const confirmed_posted = document.getElementById('cnDelivConfirm').checked;
  if (!confirmed_posted) { toast('Tick the box to confirm the video is posted', 'error'); return; }
  const confirmation_note = document.getElementById('cnDelivNote').value.trim() || null;

  const btn = document.getElementById('cnDelivBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify({ items, confirmed_posted, confirmation_note }),
    });
    for (const k in _cnDelivShotData) delete _cnDelivShotData[k];
    toast('Sent! The business will check it.', 'success');
    Store.invalidate('connectWork');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not submit', 'error');
    btn.disabled = false; btn.textContent = 'Send to business';
  }
}

// ─── Review deliverable (business) ─────────────────────────────────────────────
async function _cnLoadDeliverableForReview(campaignId) {
  // The campaign detail response already carries the pending round
  // (id/content_url/platform/note per video) whenever status is
  // 'submitted' — the business reviews and approves/rejects all of them
  // together, never a single video out of the required set.
  const el = document.getElementById('cnDeliverableReview');
  if (!el) return;
  const rows = (_cnCurrentCampaign && _cnCurrentCampaign.pending_round) || [];
  if (!rows.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--muted);">Couldn't load the submission — refresh and try again.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="cn-step-hint">👀 <b>Open each link</b> and check the video. If it's good, approve it so the creator gets paid. If not, tell them what to change.</div>
    ${rows.map(d => `
      <div class="cn-deliv-row">
        <span class="k">Video ${d.sequence_no}${d.platform_posted_to ? ` · ${esc(_cnPlatformDef(d.platform_posted_to).label)}` : ''}</span>
        <a class="cn-link-wrap" href="${/^https?:\/\//i.test(d.content_url || '') ? esc(d.content_url) : '#'}" target="_blank" rel="noopener noreferrer" style="color:#2196f3;">${esc(d.content_url)}</a>
      </div>
      ${d.note ? `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 8px;">${esc(d.note)}</div>` : ''}
      ${d.has_screenshot ? `<button class="btn-secondary" style="padding:5px 10px;font-size:11px;margin:0 0 8px;" onclick="_cnViewDeliverableScreenshot('${campaignId}','${d.id}')">🖼️ View Screenshot</button>` : ''}
    `).join('')}
    <div style="font-size:12px;color:var(--muted);margin:10px 0;">The creator says ${rows.length === 1 ? 'this video is' : `all ${rows.length} videos are`} posted.</div>
    <button class="btn-primary" style="width:100%;" onclick="_cnReviewDeliverable('${campaignId}','approve')">✅ Approve — pay the creator</button>
    <div class="cn-field" style="margin-top:14px;"><label>Need changes? Tell the creator what to fix</label><textarea id="cnReviewNote" placeholder="e.g. Please mention our shop name at the start"></textarea></div>
    <button class="btn-secondary" style="width:100%;" onclick="_cnReviewDeliverable('${campaignId}','reject')">✏️ Ask for changes</button>
  `;
}

async function _cnViewDeliverableScreenshot(campaignId, deliverableId) {
  try {
    const data = await api(`/connect/campaigns/${campaignId}/deliverables/${deliverableId}/screenshot`);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<title>Screenshot</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${data.screenshot_data}" style="max-width:100%;max-height:100vh;"></body>`);
    }
  } catch (e) {
    toast(e.message || 'Could not load screenshot', 'error');
  }
}

async function _cnReviewDeliverable(campaignId, decision) {
  const review_note = document.getElementById('cnReviewNote')?.value.trim() || null;
  if (decision === 'reject' && !review_note) {
    toast('Write what the creator should change', 'error');
    document.getElementById('cnReviewNote')?.focus();
    return;
  }
  if (decision === 'approve' && !confirm('Approve the work? The money will be sent to the creator. This can\'t be undone.')) return;

  try {
    await api(`/connect/campaigns/${campaignId}/deliverables/${decision}`, {
      method: 'POST',
      body: JSON.stringify({ review_note }),
    });
    toast(decision === 'approve' ? '🎉 Approved — the creator is being paid.' : 'Sent back to the creator to fix', 'success');
    Store.invalidate('connectCampaigns');
    Store.invalidate('connectWork');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not submit review', 'error');
  }
}

// ─── Disputes ──────────────────────────────────────────────────────────────────
function _cnOpenDisputeForm() {
  const el = document.getElementById('cnDisputeForm');
  if (!el) return;
  // No deliverable round has ever been submitted on-platform yet (status
  // is still 'funded') -> there's nothing on file for admin to treat as
  // evidence, so the link/screenshot becomes required, not optional.
  const evidenceRequired = _cnCurrentCampaign && _cnCurrentCampaign.status === 'funded';
  el.innerHTML = `
    <div class="cn-tip" style="margin-top:12px;">The money stays safely held while EndaViral looks into it. We'll decide fairly after checking the chat and the videos.</div>
    <div class="cn-field"><label>What went wrong?</label><textarea id="cnDisputeReason" placeholder="e.g. The video was deleted after one day"></textarea></div>
    <div class="cn-field">
      <label>Link to proof${evidenceRequired ? '' : ' (optional)'}</label>
      <input type="url" inputmode="url" id="cnDisputeEvidence" placeholder="https://… (screenshot or video link)">
      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;">${evidenceRequired
        ? 'No video has been sent here yet, so please add a link that shows what happened.'
        : 'The video links already sent are saved — add more proof only if you have it.'}</div>
    </div>
    <button class="btn-secondary" style="width:100%;background:rgba(229,57,53,.14);border-color:rgba(229,57,53,.3);color:#ff8a80;" onclick="_cnSubmitDispute('${_cnCurrentCampaign.id}')">Send to EndaViral</button>
  `;
}

async function _cnSubmitDispute(campaignId) {
  const reason = document.getElementById('cnDisputeReason').value.trim();
  const evidence_url = document.getElementById('cnDisputeEvidence')?.value.trim() || null;
  if (!reason || reason.length < 10) { toast('Tell us a bit more about what went wrong', 'error'); return; }
  if (evidence_url && !/^https?:\/\//i.test(evidence_url)) { toast('The proof link must start with https://', 'error'); return; }
  const evidenceRequired = _cnCurrentCampaign && _cnCurrentCampaign.status === 'funded';
  if (evidenceRequired && !evidence_url) { toast('Add a link that shows what happened', 'error'); return; }
  try {
    await api(`/connect/campaigns/${campaignId}/dispute`, { method: 'POST', body: JSON.stringify({ reason, evidence_url }) });
    toast('Sent — EndaViral will look into it and reply in the chat.', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not submit dispute', 'error');
  }
}

// ─── Reviews ───────────────────────────────────────────────────────────────────
let _cnReviewRating = 0;

// Fetches this campaign's reviews and only shows the star form if the
// CURRENT viewer doesn't already have one on it — same "load, then decide"
// shape as _cnLoadPayoutArea/_cnLoadDeliverableForReview, just for reviews.
// Without this the form re-renders blank every time the modal is reopened
// (it only ever updated in-place for the rest of that one session), which
// let either side be prompted to review again after already doing so.
async function _cnLoadReviewArea(c) {
  const el = document.getElementById('cnReviewArea');
  if (!el) return;

  let mine = null;
  try {
    const list = await api(`/connect/campaigns/${c.id}/reviews`);
    mine = (list || []).find(r => {
      const reviewerId = r.reviewer_user_id ?? r.user_id ?? r.sender_user_id ?? r.author_user_id;
      return reviewerId === currentUser.id;
    }) || null;
  } catch (_) { /* couldn't load — fall through to showing the form */ }

  el.innerHTML = mine
    ? `<div style="font-size:12px;color:var(--muted);">✅ Review submitted${mine.rating ? ` — you rated this ${'★'.repeat(mine.rating)}${'☆'.repeat(5 - mine.rating)}` : ''}.</div>`
    : _cnReviewFormHtml();
}

function _cnReviewFormHtml() {
  return `
    <div class="cn-section-lbl">How did it go? Tap the stars</div>
    <div class="cn-stars" id="cnStars">
      ${[1, 2, 3, 4, 5].map(n => `<span class="cn-star" data-n="${n}" onclick="_cnSetStars(${n})">★</span>`).join('')}
    </div>
    <div class="cn-field"><label>Comment (optional)</label><textarea id="cnReviewComment" placeholder="How did it go?"></textarea></div>
    <button class="btn-primary" id="cnReviewSubmitBtn" onclick="_cnSubmitReview('${_cnCurrentCampaign.id}')">Send rating</button>
  `;
}

function _cnSetStars(n) {
  _cnReviewRating = n;
  document.querySelectorAll('#cnStars .cn-star').forEach(el => {
    el.classList.toggle('on', parseInt(el.dataset.n) <= n);
  });
}

async function _cnSubmitReview(campaignId) {
  if (!_cnReviewRating) { toast('Tap a star first', 'error'); return; }
  const comment = document.getElementById('cnReviewComment').value.trim() || null;
  const btn = document.getElementById('cnReviewSubmitBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating: _cnReviewRating, comment }),
    });
    toast('Thanks for your review!', 'success');
    document.getElementById('cnReviewArea').innerHTML = `<div style="font-size:12px;color:var(--muted);">✅ Review submitted.</div>`;
  } catch (e) {
    toast(e.message || 'Could not submit review', 'error');
    btn.disabled = false; btn.textContent = 'Send rating';
  }
}

// ─── Payout request (creator, last step of the journey) ────────────────────
async function _cnLoadPayoutArea(c) {
  const el = document.getElementById('cnPayoutArea');
  if (!el) return;

  let existing = null;
  try {
    const mine = await Store.ensure('connectPayoutRequests', () => api('/connect/payout-requests/mine'), { ttl: CONNECT_CACHE_TTL });
    existing = (mine || []).find(t => t.campaign_id === c.id) || null;
  } catch (_) { /* no ticket yet, or couldn't load — fall through to the request form */ }

  const payout = c.creator_payout_kes;
  const fee = c.platform_fee_kes;
  const budget = (payout != null && fee != null) ? (Number(payout) + Number(fee)) : null;
  const breakdown = (payout != null && fee != null) ? `
    <div class="cn-row"><span class="k">Job price</span><span class="v">${fmtKES(budget)}</span></div>
    <div class="cn-row"><span class="k">EndaViral fee (15%)</span><span class="v">− ${fmtKES(fee)}</span></div>
    <div class="cn-row"><span class="k">You get</span><span class="v" style="color:var(--green);">${fmtKES(payout)}</span></div>
  ` : '';

  if (existing && existing.status !== 'rejected') {
    const statusLabel = existing.status === 'paid'
      ? `✅ Sent to your M-Pesa${existing.mpesa_receipt ? ` — code ${esc(existing.mpesa_receipt)}` : ''}`
      : `⏳ We're sending it to ${esc(existing.phone || 'your M-Pesa')}. You'll see "Sent" here once it's done.`;
    const receiptBtn = existing.status === 'paid'
      ? `<button class="btn-secondary" style="padding:6px 12px;font-size:11.5px;margin-top:8px;" onclick="_cnDownloadPayoutReceipt('${c.id}')">⬇️ Receipt</button>`
      : '';
    el.innerHTML = `${breakdown}<div style="font-size:12.5px;color:var(--white);margin-top:10px;line-height:1.5;">${statusLabel}</div>${receiptBtn}`;
    return;
  }

  const phone = (_cnCreatorProfile && _cnCreatorProfile.phone) || '';
  const rejectedNote = existing && existing.status === 'rejected'
    ? `<div style="font-size:12.5px;color:#ff8a80;margin:8px 0;">We couldn't send your money${existing.admin_note ? `: ${esc(existing.admin_note)}` : ''}. Check your number below and try again.</div>`
    : '';

  // Default per-video links from the approved round (fetched via the
  // pending_round the last time it was submitted — for a completed
  // campaign we re-fetch the round rows so a reload still has them).
  let items = (existing && existing.items && existing.items.length) ? existing.items : null;
  if (!items) {
    try {
      items = await api(`/connect/campaigns/${c.id}/deliverables/approved-round`);
    } catch (_) { items = null; }
  }
  const n = c.required_deliverable_count || 1;
  const rowsHtml = Array.from({ length: n }, (_, i) => i + 1).map(seq => {
    const match = (items || []).find(it => it.sequence_no === seq);
    return `
      <div class="cn-field">
        <label>Video ${seq} link${match ? ' (still live?)' : ''}</label>
        <input type="url" inputmode="url" id="cnPayoutUrl${seq}" value="${esc((match && match.content_url) || '')}" placeholder="https://...">
      </div>
    `;
  }).join('');

  el.innerHTML = `
    ${breakdown}
    ${rejectedNote}
    <div class="cn-step-hint" style="margin-top:10px;">🎉 The business approved your work! Check your M-Pesa number and tap the button.</div>
    <div class="cn-field"><label>Send to this M-Pesa number</label><input type="tel" inputmode="tel" id="cnPayoutPhone" value="${esc(phone)}" placeholder="07XXXXXXXX"></div>
    ${rowsHtml}
    <button class="btn-primary" id="cnPayoutBtn" onclick="_cnRequestPayout('${c.id}')">📲 Send my money${payout != null ? ` (${fmtKES(payout)})` : ''}</button>
  `;
}

async function _cnRequestPayout(campaignId) {
  const phone = document.getElementById('cnPayoutPhone').value.trim();
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }

  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const items = [];
  for (let seq = 1; seq <= n; seq++) {
    const el = document.getElementById(`cnPayoutUrl${seq}`);
    const url = el ? el.value.trim() : '';
    if (!url) { toast(`Add the link for video ${seq}`, 'error'); return; }
    items.push({ sequence_no: seq, content_url: url });
  }

  const btn = document.getElementById('cnPayoutBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/payout-request`, {
      method: 'POST',
      body: JSON.stringify({ phone, items }),
    });
    toast('Done! We\'re sending your money to M-Pesa.', 'success');
    Store.invalidate('connectPayoutRequests');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not request payout', 'error');
    btn.disabled = false; btn.textContent = '📲 Send my money';
  }
}

// ─── Conversation thread (generic — shared by both surfaces) ──────────────
// Renders into whichever #cnMsgList/#cnMsgInputRow currently exists in the
// DOM: the single-thread chat card inside the campaign modal above, or the
// bid chat pane bids.js builds inside the Bids Workspace. Bid-specific
// logic (accept/reject, the pay sheet, funding) lives entirely in bids.js;
// this stays here because it's the same messaging code either way.
async function _cnLoadMessages(campaignId, threadCreatorId) {
  const list = document.getElementById('cnMsgList');
  if (!list) return;
  let messages;
  try {
    const qs = threadCreatorId ? `?creator_user_id=${encodeURIComponent(threadCreatorId)}` : '';
    messages = await api(`/connect/campaigns/${campaignId}/messages${qs}`);
  } catch (e) { list.innerHTML = `<div style="color:var(--muted);font-size:12px;">Could not load messages.</div>`; return; }

  if (!messages.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:12.5px;text-align:center;padding:10px 0;">No messages yet.<br><span style="font-size:11.5px;">The price is fixed — use this chat for the work itself: ideas, timing, the brief. Phone numbers are hidden to protect you.</span></div>`;
    return;
  }
  const isBusinessOwner = currentUser && currentUser.id === _cnCurrentCampaign.business_user_id;
  const appStillActive = isBusinessOwner
    ? !!(_cnActiveNegotiationApp && _cnActiveNegotiationApp.status === 'accepted')
    : _cnCurrentCampaign.my_application_status === 'accepted';
  const lastMsg = messages[messages.length - 1];
  let lastDay = null;
  list.innerHTML = messages.map(m => {
    // A thin date divider whenever the day changes, so a long negotiation
    // reads like a real conversation timeline instead of an undifferentiated
    // stack of bubbles.
    let dayDivider = '';
    if (m.created_at) {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) { dayDivider = `<div class="cn-msg-daydiv"><span>${day === new Date().toDateString() ? 'Today' : day}</span></div>`; lastDay = day; }
    }

    if (m.kind === 'price_offer' || m.kind === 'fund_prompt' || m.kind === 'negotiation_opened') {
      // History from before fixed prices — shown as a quiet record, never a button.
      return dayDivider + `<div class="cn-msg-card cn-msg-card-timeline" style="opacity:.75;">${esc(m.body)}</div>`;
    }
    if (m.kind === 'hired') {
      return dayDivider + `<div class="cn-msg-card cn-msg-card-hired">${esc(m.body)}</div>`;
    }
    if (m.kind === 'brief') {
      const b = m.action_payload || {};
      const plats = _cnPlatformDefs(b.platforms).map(p => `${p.emoji} ${esc(p.label)}`).join(', ');
      return dayDivider + `<div class="cn-brief">
        <div class="cn-brief-h">📌 The brief — keep the chat about this</div>
        <dl>
          <dt>Videos</dt><dd>${esc(b.deliverables || '')}${b.count > 1 ? ` (${b.count})` : ''}</dd>
          ${plats ? `<dt>Post on</dt><dd>${plats}</dd>` : ''}
          ${b.guidelines ? `<dt>Rules</dt><dd>${esc(b.guidelines)}</dd>` : ''}
          ${b.deadline ? `<dt>Deadline</dt><dd>${new Date(b.deadline).toLocaleDateString()}</dd>` : ''}
          ${b.usage_rights ? `<dt>Usage</dt><dd>${esc(b.usage_rights)}</dd>` : ''}
        </dl>
      </div>`;
    }
    if (m.kind === 'shortlisted') {
      return dayDivider + `<div class="cn-msg-card cn-msg-card-star">${esc(m.body)}</div>`;
    }
    if (m.kind === 'not_selected') {
      return dayDivider + `<div class="cn-msg-card cn-msg-card-lost">${esc(m.body)}</div>`;
    }
    if (m.kind === 'payment_issue') {
      // Business reported "payment not reflecting" — shown to both sides
      // so the creator understands why funding hasn't come through yet.
      // Resolution/dismissal shows up as its own plain timeline message
      // right after this one, not as a state change on this card.
      return dayDivider + `<div class="cn-msg-card" style="background:rgba(255,154,60,.12);border:1px solid rgba(255,154,60,.35);border-radius:10px;padding:10px 12px;">
        <div class="cn-msg-card-title" style="color:#ff9a3c;">🆘 Payment problem reported</div>
        <div style="font-size:12.5px;color:var(--white);margin-top:4px;">${esc(m.body)}</div>
      </div>`;
    }
    if (m.is_system) {
      // Shared timeline entry — funded / submitted / approved / payout /
      // outreach events both parties see, rendered centered and distinct
      // from a normal chat bubble so it reads as "what happened" rather
      // than "what someone said".
      return dayDivider + `<div class="cn-msg-card cn-msg-card-timeline">${esc(m.body)}</div>`;
    }
    const mine = currentUser && m.sender_user_id === currentUser.id;
    const senderIsBusiness = m.sender_user_id === _cnCurrentCampaign.business_user_id;
    const initial = senderIsBusiness ? '🏢' : '🎬';
    return dayDivider + `<div class="cn-msg ${mine ? 'mine' : ''}">
      ${!mine ? `<div class="cn-msg-avatar" style="background:${senderIsBusiness ? 'var(--orange)' : 'var(--blue)'}22;color:${senderIsBusiness ? 'var(--orange)' : 'var(--blue)'};">${initial}</div>` : ''}
      <div class="cn-msg-body">
        ${!mine ? `<div class="who">${esc(senderIsBusiness ? (_cnCurrentCampaign.business_name || 'Business') : (_cnCurrentCampaign.creator_display_name || (_cnActiveNegotiationApp && _cnActiveNegotiationApp.creator_display_name) || 'Creator'))}</div>` : ''}
        <div class="bubble">${esc(m.body)}</div>
      </div>
    </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

async function _cnSendMessage(campaignId) {
  const input = document.getElementById('cnMsgInput');
  const body = input.value.trim();
  if (!body) return;
  input.value = '';
  try {
    const payload = { body };
    if (_cnMsgThreadCreatorId) payload.creator_user_id = _cnMsgThreadCreatorId;
    const sent = await api(`/connect/campaigns/${campaignId}/messages`, { method: 'POST', body: JSON.stringify(payload) });
    if (sent && sent.contact_hidden) {
      toast('Phone numbers and emails are hidden. Keep chats & payments on EndaViral — that\'s what protects your money.', 'info');
    }
    _cnLoadMessages(campaignId, _cnMsgThreadCreatorId);
  } catch (e) {
    toast(e.message || 'Could not send message', 'error');
  }
}

// ─── Publish shortcut from inside the detail modal ────────────────────────────
async function _cnPublishFromModal(campaignId) {
  try {
    await api(`/connect/campaigns/${campaignId}/publish`, { method: 'POST' });
    toast('Your job is live!', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not publish', 'error');
  }
}

// ─── Close a job before hiring (business) — held money → balance ───────────
async function _cnCancelCampaign(campaignId, hasMoney) {
  const msg = hasMoney
    ? 'Close this job? Nobody has been hired, so the money held comes straight back to your EndaViral balance. Creators who accepted will be told.'
    : 'Delete this draft? Nothing has been paid.';
  if (!confirm(msg)) return;
  try {
    _cnSelfClosedAt = Date.now();   // our own close — don't double-toast the SSE echo
    const r = await api(`/connect/campaigns/${campaignId}/cancel`, { method: 'POST' });
    toast(r && r.returned_to_balance_kes > 0
      ? `Closed — ${fmtKES(r.returned_to_balance_kes)} is back on your EndaViral balance`
      : 'Draft deleted', 'success');
    Store.invalidate('connectCampaigns');
    _cnCloseCampaign();
    if (_cnTab === 'campaigns') _cnLoadActiveTab();
  } catch (e) {
    toast(e.message || 'Could not close this job', 'error');
  }
}

// ─── Archive (business, completed/cancelled campaigns) ────────────────────────
async function _cnArchiveCampaign(campaignId) {
  try {
    await api(`/connect/campaigns/${campaignId}/archive`, { method: 'POST' });
    toast('Moved to archive', 'success');
    _cnCloseCampaign();
    if (_cnTab === 'campaigns') _cnLoadActiveTab();
  } catch (e) {
    toast(e.message || 'Could not archive campaign', 'error');
  }
}

// ─── Create-modal close (referenced by index.html's ★MODALS markup) ──────────
function _cnCloseCreate() {
  const m = document.getElementById('cnCreateModal');
  if (m) m.classList.remove('show');
}

// ══════════════════════════════════════════════════════════════════════════
// Invites — creator's received invites tab
// ══════════════════════════════════════════════════════════════════════════
async function _cnRenderInvites(target) {
  const invites = await Store.ensure('connectInvites', () => api('/connect/invites/mine'), { ttl: CONNECT_CACHE_TTL });
  if (!invites.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">✉️</span><div class="cn-empty-title">No invites yet</div>Businesses can invite you straight to a job. A good bio and correct follower numbers help them find you.</div>`;
    return;
  }
  target.innerHTML = invites.map(i => {
    const c = i.campaign || {};
    const platLabel = _cnPlatformDefs(c.platform).map(p => `${p.emoji} ${p.label}`).join(', ');
    return `
    <div class="cn-app-row">
      <div class="cn-app-top">
        <span style="font-size:13px;font-weight:800;color:var(--white);">${esc(c.title || 'Campaign')}</span>
        ${_cnStatusPillGeneric(i.status)}
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;">
        ${platLabel} · ${c.budget_kes != null ? `${fmtKES(c.budget_kes)} (you take home ${fmtKES(c.creator_take_home_kes)})` : ''} ·
        Invited ${i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}
      </div>
      ${i.message ? `<div style="font-size:12px;color:var(--white);margin-bottom:8px;">"${esc(i.message)}"</div>` : ''}
      ${i.status === 'pending' ? `
      <div class="cn-app-actions">
        <button class="cn-btn-sm cn-btn-accept" onclick="_cnAcceptInvite('${c.id}')">Accept — show my accounts</button>
        <button class="cn-btn-sm cn-btn-reject" onclick="_cnDeclineInvite('${i.id}')">No thanks</button>
      </div>` : ''}
      ${c.id ? `<button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="_cnOpenCampaign('${c.id}')">See the job</button>` : ''}
    </div>
  `;
  }).join('');
}

function _cnStatusPillGeneric(status) {
  // Small helper for statuses (invite/application/payout ticket/dispute) that don't live in CN_STATUS_LABELS.
  const labels = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', rejected: 'Rejected', paid: 'Paid', open: 'Open', resolved: 'Resolved' };
  const colors = { pending: '#ff7043', accepted: '#3dd44a', declined: '#e53935', withdrawn: '#7a8fad', rejected: '#e53935', paid: '#3dd44a', open: '#ff7043', resolved: '#3dd44a' };
  const color = colors[status] || '#7a8fad';
  const label = labels[status] || status;
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${color}1f;color:${color};border:1px solid ${color}40;">${esc(label)}</span>`;
}

// Accepting an invite = accepting the job: open it and go straight to the
// Accept sheet. Sending the proof marks the invite accepted on the server.
async function _cnAcceptInvite(campaignId) {
  await _cnOpenCampaign(campaignId);
  const c = _cnCurrentCampaign;
  if (c && c.id === campaignId && c.status === 'published' && !c.my_application_status) _cnOpenAcceptSheet();
}

async function _cnDeclineInvite(inviteId) {
  try {
    await api(`/connect/invites/${inviteId}/decline`, { method: 'POST' });
    toast('Invite declined', 'success');
    Store.invalidate('connectInvites');
    _cnRenderInvites(document.getElementById('cnTabContent'));
  } catch (e) {
    toast(e.message || 'Could not decline invite', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Find Creators — business searches the creator directory
// ══════════════════════════════════════════════════════════════════════════
let _cnCreatorFilters = { niche: '', platform: '', location: '', min_followers: '', verified_only: false, sort: 'rating' };

async function _cnRenderFindCreators(target) {
  target.innerHTML = `
    <div class="cn-tip">🔎 Pick filters (optional), tap Search, then tap <b>Invite</b> on a creator you like.</div>
    <div class="cn-fc-grid">
      <select id="cnFcNiche" class="cn-fc-input">
        <option value="">Any niche</option>
        ${CONNECT_NICHES.map(n => `<option value="${n.key}" ${_cnCreatorFilters.niche === n.key ? 'selected' : ''}>${n.emoji} ${esc(n.label)}</option>`).join('')}
      </select>
      <select id="cnFcPlatform" class="cn-fc-input">
        <option value="">Any platform</option>
        ${CONNECT_PLATFORMS.map(p => `<option value="${p.key}" ${_cnCreatorFilters.platform === p.key ? 'selected' : ''}>${p.emoji} ${esc(p.label)}</option>`).join('')}
      </select>
      <input type="text" id="cnFcLocation" placeholder="Location" class="cn-fc-input" value="${esc(_cnCreatorFilters.location)}">
      <input type="number" id="cnFcMinFollowers" placeholder="Min. followers" min="0" class="cn-fc-input" value="${_cnCreatorFilters.min_followers}">
      <select id="cnFcSort" class="cn-fc-input" style="grid-column:1/-1;">
        <option value="rating" ${_cnCreatorFilters.sort === 'rating' ? 'selected' : ''}>Sort: Top Rated</option>
        <option value="followers" ${_cnCreatorFilters.sort === 'followers' ? 'selected' : ''}>Sort: Most Followers</option>
        <option value="jobs_completed" ${_cnCreatorFilters.sort === 'jobs_completed' ? 'selected' : ''}>Sort: Most Jobs Done</option>
      </select>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);margin-bottom:12px;cursor:pointer;">
      <input type="checkbox" id="cnFcVerified" ${_cnCreatorFilters.verified_only ? 'checked' : ''}> Verified creators only
    </label>
    <button class="btn-primary" style="margin-bottom:16px;" onclick="_cnSearchCreators()">🔎 Search</button>
    <div id="cnFcResults"><div class="cn-empty">Loading…</div></div>
  `;
  await _cnSearchCreators();
}

async function _cnSearchCreators() {
  const resultsEl = document.getElementById('cnFcResults');
  _cnCreatorFilters = {
    niche: document.getElementById('cnFcNiche').value.trim(),
    platform: document.getElementById('cnFcPlatform').value,
    location: document.getElementById('cnFcLocation').value.trim(),
    min_followers: document.getElementById('cnFcMinFollowers').value,
    verified_only: document.getElementById('cnFcVerified').checked,
    sort: document.getElementById('cnFcSort').value,
  };
  const params = new URLSearchParams();
  if (_cnCreatorFilters.niche) params.set('niche', _cnCreatorFilters.niche);
  if (_cnCreatorFilters.platform) params.set('platform', _cnCreatorFilters.platform);
  if (_cnCreatorFilters.location) params.set('location', _cnCreatorFilters.location);
  if (_cnCreatorFilters.min_followers) params.set('min_followers', _cnCreatorFilters.min_followers);
  if (_cnCreatorFilters.verified_only) params.set('verified_only', 'true');
  params.set('sort', _cnCreatorFilters.sort);

  resultsEl.innerHTML = `<div class="cn-empty">Loading…</div>`;
  try {
    const allCreators = await api(`/connect/creators?${params.toString()}`);
    const creators = allCreators.filter(p => p.display_name && p.display_name.trim());
    if (!creators.length) {
      resultsEl.innerHTML = `<div class="cn-empty">No creators match. Try removing a filter.</div>`;
      return;
    }
    resultsEl.innerHTML = `<div class="cn-grid">${creators.map(_cnCreatorCardHtml).join('')}</div>`;
  } catch (e) {
    resultsEl.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load creators.")}</div>`;
  }
}

function _cnCreatorCardHtml(p) {
  const name = p.display_name || 'Unnamed Creator';
  const niches = (p.niches || '').split(',').map(s => s.trim()).filter(Boolean);
  const platforms = (p.platforms || '').split(',').map(s => s.trim()).filter(Boolean);
  return `
  <div class="cn-card" style="cursor:default;">
    <div class="cn-card-top">
      <div class="cn-card-title">${esc(name)} ${p.is_verified ? '<span title="Verified" style="color:#2196f3;">✔️</span>' : ''}</div>
      <div style="font-size:12px;color:var(--muted);">★ ${p.rating_avg || 0} (${p.rating_count || 0})</div>
    </div>
    ${p.bio ? `<div class="cn-card-desc">${esc(p.bio)}</div>` : ''}
    <div class="cn-card-meta" style="margin-bottom:10px;">
      ${platforms.map(pl => {
        const link = (p.platform_links || {})[pl];
        const label = `${_cnPlatformDef(pl).emoji} ${esc(_cnPlatformDef(pl).label)}${link ? ' ↗' : ''}`;
        return link && /^https?:\/\//i.test(link)
          ? `<a class="cn-tag" style="text-decoration:none;color:var(--white);" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : `<span class="cn-tag">${label}</span>`;
      }).join('')}
      ${niches.map(n => `<span class="cn-tag">${esc(n)}</span>`).join('')}
      ${p.followers_count ? `<span class="cn-tag">${p.followers_count.toLocaleString()} followers</span>` : ''}
      ${p.jobs_completed != null ? `<span class="cn-tag">${p.jobs_completed} jobs done</span>` : ''}
    </div>
    <button class="btn-secondary" style="width:100%;" data-uid="${esc(p.user_id)}" data-name="${esc(name)}" onclick="_cnOpenInviteModal(this.dataset.uid, this.dataset.name, null)">✉️ Invite to a job</button>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// Invite modal — shared by "Find Creators" (creator known, pick campaign)
// and a campaign's detail view (campaign known, pick creator)
// ══════════════════════════════════════════════════════════════════════════
let _cnInviteCtx = { creatorUserId: null, creatorLabel: null, campaignId: null };

async function _cnOpenInviteModal(creatorUserId, creatorLabel, campaignId) {
  _cnInviteCtx = { creatorUserId, creatorLabel, campaignId };
  const modal = document.getElementById('cnInviteModal');
  const body = document.getElementById('cnInviteModalBody');
  if (!modal || !body) return;
  body.innerHTML = `<div class="cn-empty">Loading…</div>`;
  modal.classList.add('show');

  let campaignOptionsHtml = '';
  if (!campaignId) {
    try {
      const campaigns = await Store.ensure('connectCampaigns', () => api('/connect/campaigns/mine?role=business'), { ttl: CONNECT_CACHE_TTL });
      const open = campaigns.filter(c => c.status === 'published' && c.budget_secured);
      if (!open.length) {
        body.innerHTML = `<div class="cn-empty">Post and pay for a job first, then you can invite creators to it.<br><button class="btn-secondary" style="margin-top:12px;" onclick="_cnCloseInviteModal();_cnSetTab('create')">Post a job →</button></div>`;
        return;
      }
      campaignOptionsHtml = open.filter(c => c.budget_secured).map(c => `<option value="${c.id}">${esc(c.title)} · ${fmtKES(c.budget_kes)}</option>`).join('');
    } catch (e) {
      body.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load your campaigns.")}</div>`;
      return;
    }
  }

  let creatorOptionsHtml = '';
  if (!creatorUserId) {
    try {
      const allCreators = await api('/connect/creators?sort=rating&limit=50');
      const creators = allCreators.filter(p => p.display_name && p.display_name.trim());
      if (!creators.length) {
        body.innerHTML = `<div class="cn-empty">No creators in the directory yet.</div>`;
        return;
      }
      creatorOptionsHtml = creators.map(p => `<option value="${p.user_id}">${esc(p.display_name)}${p.is_verified ? ' ✔️' : ''} — ★${p.rating_avg || 0}</option>`).join('');
    } catch (e) {
      body.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load creators.")}</div>`;
      return;
    }
  }

  body.innerHTML = `
    <div class="modal-title" style="margin-bottom:14px;">✉️ Invite ${creatorLabel ? esc(creatorLabel) : 'a Creator'}</div>
    ${!campaignId ? `
    <div class="cn-field"><label>Which job?</label>
      <select id="cnInviteCampaignSelect">${campaignOptionsHtml}</select>
    </div>` : ''}
    ${!creatorUserId ? `
    <div class="cn-field"><label>Creator</label>
      <select id="cnInviteCreatorSelect">${creatorOptionsHtml}</select>
    </div>` : ''}
    <div class="cn-field"><label>Message (optional)</label>
      <textarea id="cnInviteMessage" placeholder="Tell them why you'd love to work with them…"></textarea>
    </div>
    <button class="btn-primary" id="cnInviteSendBtn" onclick="_cnSubmitInvite()">Send invite</button>
  `;
}

function _cnCloseInviteModal() {
  const m = document.getElementById('cnInviteModal');
  if (m) m.classList.remove('show');
}

async function _cnSubmitInvite() {
  const campaignId = _cnInviteCtx.campaignId || document.getElementById('cnInviteCampaignSelect')?.value;
  const creatorUserId = _cnInviteCtx.creatorUserId || document.getElementById('cnInviteCreatorSelect')?.value;
  const message = document.getElementById('cnInviteMessage')?.value.trim() || null;
  if (!campaignId) { toast('Choose a campaign to invite them to', 'error'); return; }
  if (!creatorUserId) { toast('No creator selected', 'error'); return; }

  const btn = document.getElementById('cnInviteSendBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    await api(`/connect/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ creator_user_id: creatorUserId, message }),
    });
    toast('Invite sent! You\'ll see their reply in the job.', 'success');
    _cnCloseInviteModal();
  } catch (e) {
    toast(e.message || 'Could not send invite', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Send Invite'; }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Admin — disputes, freeze/unfreeze, verify/suspend, stats
// ══════════════════════════════════════════════════════════════════════════
async function _cnRenderAdmin(target) {
  target.innerHTML = `
    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📊</div>
        <div><div class="cn-form-card-title">Marketplace Stats</div></div>
      </div>
      <div id="cnAdminStats" class="cn-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));"><div class="cn-empty">Loading…</div></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">💸</div>
        <div><div class="cn-form-card-title">Payout Requests</div></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        ${['pending', 'paid', 'rejected', 'all'].map(s => `<button class="cn-tab ${s === 'pending' ? 'active' : ''}" id="cnPayoutFilter-${s}" onclick="_cnLoadAdminPayouts('${s}')" style="padding:6px 12px;font-size:11.5px;">${s[0].toUpperCase()}${s.slice(1)}</button>`).join('')}
      </div>
      <div id="cnAdminPayouts"><div class="cn-empty">Loading…</div></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">↩️</div>
        <div><div class="cn-form-card-title">Business balance cash-outs</div><div class="cn-form-card-sub">Money returned from closed/expired jobs — send by M-Pesa, then mark paid</div></div>
      </div>
      <div id="cnAdminWithdrawals"><div class="cn-empty">Loading…</div></div>
      <button class="btn-secondary" style="margin-top:10px;" onclick="_cnAdminExpireNow()">Run hire-by expiry now</button>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">⏱️</div>
        <div><div class="cn-form-card-title">Business Not Responding</div><div class="cn-form-card-sub">48-hour review window</div></div>
      </div>
      <div id="cnAdminOverdue"><div class="cn-empty">Loading…</div></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">⚠️</div>
        <div><div class="cn-form-card-title">Open Disputes</div></div>
      </div>
      <div id="cnAdminDisputes"><div class="cn-empty">Loading…</div></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🧊</div>
        <div><div class="cn-form-card-title">Frozen Campaigns</div></div>
      </div>
      <div id="cnAdminFrozen"><div class="cn-empty">Loading…</div></div>
      <div style="display:flex;gap:10px;align-items:flex-end;margin-top:14px;flex-wrap:wrap;">
        <div class="cn-field" style="flex:2;min-width:160px;margin-bottom:0;"><label>Campaign ID to freeze</label>
          <input type="text" id="cnAdminFreezeId" placeholder="campaign id"></div>
        <div class="cn-field" style="flex:2;min-width:160px;margin-bottom:0;"><label>Reason</label>
          <input type="text" id="cnAdminFreezeReason" placeholder="reason (optional)"></div>
        <button class="btn-secondary" onclick="_cnAdminFreeze()">🧊 Freeze</button>
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🛡️</div>
        <div><div class="cn-form-card-title">Verify / Suspend a User</div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div class="cn-field" style="flex:2;min-width:160px;"><label>User ID</label>
          <input type="text" id="cnAdminUserId" placeholder="user id"></div>
        <div class="cn-field" style="flex:1;min-width:120px;"><label>Role</label>
          <select id="cnAdminUserRole">
            <option value="creator">Creator</option>
            <option value="business">Business</option>
          </select></div>
        <div class="cn-field" style="flex:2;min-width:160px;"><label>Reason (for suspend)</label>
          <input type="text" id="cnAdminSuspendReason" placeholder="reason (optional)"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="cn-btn-sm cn-btn-accept" style="flex:none;padding:9px 14px;" onclick="_cnAdminVerify(true)">✔️ Verify Creator</button>
        <button class="btn-secondary" onclick="_cnAdminVerify(false)">Unverify Creator</button>
        <button class="cn-btn-sm cn-btn-reject" style="flex:none;padding:9px 14px;" onclick="_cnAdminSuspend(true)">🚫 Suspend</button>
        <button class="btn-secondary" onclick="_cnAdminSuspend(false)">Unsuspend</button>
      </div>
    </div>
  `;
  await Promise.all([_cnLoadAdminStats(), _cnLoadAdminPayouts('pending'), _cnLoadAdminDisputes(), _cnLoadAdminFrozen(), _cnLoadAdminOverdue(), _cnLoadAdminWithdrawals()]);
}

// ─── Business balance cash-outs (v2) ────────────────────────────────────────
async function _cnLoadAdminWithdrawals() {
  const el = document.getElementById('cnAdminWithdrawals');
  if (!el) return;
  let rows;
  try { rows = await api('/connect/admin/balance-withdrawals?status=pending'); }
  catch (e) { el.innerHTML = `<div class="cn-empty">Could not load.</div>`; return; }
  if (!rows.length) { el.innerHTML = `<div class="cn-empty">No cash-outs waiting.</div>`; return; }
  el.innerHTML = rows.map(w => `
    <div class="cn-app-row">
      <div class="cn-app-top"><span class="cn-app-bid">${fmtKES(w.amount_kes)}</span><span style="font-size:12px;color:var(--muted);">${esc(w.business_name)} · ${w.created_at ? new Date(w.created_at).toLocaleString() : ''}</span></div>
      <div style="font-size:12.5px;color:var(--white);margin-bottom:8px;">Send to M-Pesa <b>${esc(w.phone)}</b></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input type="text" class="cn-input-compact" id="cnWdRcpt-${w.id}" placeholder="M-Pesa code" aria-label="M-Pesa code">
        <button class="cn-btn-sm cn-btn-accept" style="flex:none;padding:8px 14px;" onclick="_cnAdminResolveWithdrawal('${w.id}', true)">Mark sent</button>
        <button class="cn-btn-sm cn-btn-reject" style="flex:none;padding:8px 14px;" onclick="_cnAdminResolveWithdrawal('${w.id}', false)">Reject (back to balance)</button>
      </div>
    </div>`).join('');
}

async function _cnAdminResolveWithdrawal(id, paid) {
  const mpesa_receipt = document.getElementById(`cnWdRcpt-${id}`)?.value.trim() || null;
  if (paid && !mpesa_receipt && !confirm('Mark as sent without an M-Pesa code?')) return;
  const admin_note = paid ? null : (prompt('Why is this cash-out rejected? (the business sees this)') || null);
  try {
    await api(`/connect/admin/balance-withdrawals/${id}/${paid ? 'mark-paid' : 'reject'}`, {
      method: 'POST', body: JSON.stringify({ mpesa_receipt, admin_note }),
    });
    toast(paid ? 'Marked as sent' : 'Rejected — money is back on their balance', 'success');
    _cnLoadAdminWithdrawals();
  } catch (e) { toast(e.message || 'Could not update', 'error'); }
}

async function _cnAdminExpireNow() {
  try {
    const r = await api('/connect/admin/campaigns/expire-stale', { method: 'POST' });
    toast(`${r.expired} job${r.expired === 1 ? '' : 's'} expired and refunded to balances`, 'success');
  } catch (e) { toast(e.message || 'Could not run expiry', 'error'); }
}

// ─── 48h business non-response (submitted, review window elapsed) ─────────
async function _cnLoadAdminOverdue() {
  const el = document.getElementById('cnAdminOverdue');
  if (!el) return;
  let campaigns;
  try {
    campaigns = await api('/connect/admin/campaigns/awaiting-review');
  } catch (e) { el.innerHTML = `<div class="cn-empty">Could not load.</div>`; return; }

  if (!campaigns.length) { el.innerHTML = `<div class="cn-empty">Nothing awaiting review right now.</div>`; return; }

  el.innerHTML = campaigns.map(c => `
    <div class="cn-app-row" id="cnOverdueRow-${c.id}">
      <div class="cn-app-top">
        <span style="font-weight:700;">${esc(c.title)}</span>
        ${c.admin_can_force_release
          ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#e5393520;color:#ff8a80;">Overdue</span>`
          : `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#2196f320;color:#64b5f6;">${c.review_hours_remaining}h left</span>`}
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px;">Campaign ${c.id} — ${fmtKES(c.budget_kes)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <select id="cnOutreachChannel-${c.id}" class="cn-input-compact">
          <option value="phone">Phone</option><option value="sms">SMS</option><option value="email">Email</option>
        </select>
        <select id="cnOutreachOutcome-${c.id}" class="cn-input-compact">
          <option value="no_answer">No answer</option><option value="answered">Answered</option><option value="unreachable">Unreachable</option>
        </select>
        <input type="text" id="cnOutreachNote-${c.id}" placeholder="note (optional)" class="cn-input-compact" style="flex:1;min-width:120px;">
        <button class="btn-secondary" style="padding:6px 10px;font-size:11.5px;" onclick="_cnAdminLogOutreach('${c.id}')">📞 Log Attempt</button>
      </div>
      <button class="cn-btn-sm cn-btn-reject" style="width:100%;" ${c.admin_can_force_release ? '' : 'disabled'} onclick="_cnAdminForceRelease('${c.id}')">
        ${c.admin_can_force_release ? '⏱️ Force-Release Payment to Creator' : 'Force-release unlocks after 48h'}
      </button>
    </div>
  `).join('');
}

async function _cnAdminLogOutreach(campaignId) {
  const channel = document.getElementById(`cnOutreachChannel-${campaignId}`).value;
  const outcome = document.getElementById(`cnOutreachOutcome-${campaignId}`).value;
  const note = document.getElementById(`cnOutreachNote-${campaignId}`).value.trim() || null;
  try {
    await api(`/connect/admin/campaigns/${campaignId}/outreach-attempts`, {
      method: 'POST', body: JSON.stringify({ channel, outcome, note }),
    });
    toast('Outreach attempt logged.', 'success');
  } catch (e) {
    toast(e.message || 'Could not log outreach attempt', 'error');
  }
}

async function _cnAdminForceRelease(campaignId) {
  if (!confirm('Release escrow to the creator now? This is only for campaigns where the business has gone quiet past the 48h review window and outreach has been attempted.')) return;
  try {
    await api(`/connect/admin/campaigns/${campaignId}/force-release`, { method: 'POST', body: JSON.stringify({}) });
    toast('Released to creator.', 'success');
    _cnLoadAdminOverdue();
  } catch (e) {
    toast(e.message || 'Could not force-release', 'error');
  }
}

// ─── Payout requests (admin confirms the M-Pesa transfer went out) ─────────
async function _cnLoadAdminPayouts(status) {
  const el = document.getElementById('cnAdminPayouts');
  if (!el) return;
  ['pending', 'paid', 'rejected', 'all'].forEach(s => {
    const btn = document.getElementById(`cnPayoutFilter-${s}`);
    if (btn) btn.classList.toggle('active', s === status);
  });
  el.innerHTML = `<div class="cn-empty">Loading…</div>`;
  try {
    const tickets = await api(`/connect/admin/payout-requests?status=${status}`);
    if (!tickets.length) {
      el.innerHTML = `<div class="cn-empty">No ${status === 'all' ? '' : status + ' '}payout requests.</div>`;
      return;
    }
    el.innerHTML = tickets.map(t => `
      <div class="cn-app-row">
        <div class="cn-app-top">
          <span style="font-size:12.5px;font-weight:800;color:var(--white);">${fmtKES(t.amount_kes)}</span>
          ${_cnStatusPillGeneric(t.status)}
        </div>
        <div style="font-size:11.5px;color:var(--muted);">Campaign ${esc(t.campaign_id.slice(0, 8))}… · Creator ${esc(t.creator_user_id.slice(0, 8))}…</div>
        <div style="font-size:12px;color:var(--white);margin:6px 0;">📱 ${esc(t.phone)} · <a href="${esc(t.content_url)}" target="_blank" rel="noopener" style="color:#2196f3;">View posted work</a></div>
        ${t.status !== 'pending' ? `
          <div style="font-size:11.5px;color:var(--muted);">${t.mpesa_receipt ? `M-Pesa ref: ${esc(t.mpesa_receipt)}` : ''}${t.admin_note ? ` — ${esc(t.admin_note)}` : ''}</div>
        ` : `
          <input type="text" id="cnPayoutReceipt-${t.id}" placeholder="M-Pesa receipt code (optional)" class="cn-input-compact" style="width:100%;margin:8px 0 6px;">
          <input type="text" id="cnPayoutNote-${t.id}" placeholder="Note (optional, e.g. reason for rejection)" class="cn-input-compact" style="width:100%;margin-bottom:8px;">
          <div class="cn-app-actions">
            <button class="cn-btn-sm cn-btn-accept" onclick="_cnAdminResolvePayout('${t.id}', true)">✅ Mark Paid</button>
            <button class="cn-btn-sm cn-btn-reject" onclick="_cnAdminResolvePayout('${t.id}', false)">Reject</button>
          </div>
        `}
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load payout requests.")}</div>`;
  }
}

async function _cnAdminResolvePayout(payoutRequestId, approve) {
  const mpesa_receipt = document.getElementById(`cnPayoutReceipt-${payoutRequestId}`)?.value.trim() || null;
  const admin_note = document.getElementById(`cnPayoutNote-${payoutRequestId}`)?.value.trim() || null;
  try {
    await api(`/connect/admin/payout-requests/${payoutRequestId}/${approve ? 'mark-paid' : 'reject'}`, {
      method: 'POST',
      body: JSON.stringify({ mpesa_receipt, admin_note }),
    });
    toast(approve ? 'Marked as paid' : 'Payout request rejected', 'success');
    const activeFilter = ['pending', 'paid', 'rejected', 'all'].find(s => document.getElementById(`cnPayoutFilter-${s}`)?.classList.contains('active')) || 'pending';
    _cnLoadAdminPayouts(activeFilter);
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not update payout request', 'error');
  }
}

async function _cnLoadAdminStats() {
  const el = document.getElementById('cnAdminStats');
  try {
    const s = await api('/connect/admin/stats');
    const cards = [
      ['Total Campaigns', s.total_campaigns],
      ['Completed (Gross)', fmtKES(s.gross_completed_kes)],
      ['Platform Fee Earned', fmtKES(s.platform_fee_kes_est)],
      ['Open Disputes', s.open_disputes],
      ['Frozen Campaigns', s.frozen_campaigns],
      ['Verified Creators', s.verified_creators],
      ['Suspended Creators', s.suspended_creators],
      ['Suspended Businesses', s.suspended_businesses],
      ['Pending Invites', s.pending_invites],
    ];
    el.innerHTML = cards.map(([label, val]) => `
      <div class="cn-card" style="cursor:default;text-align:center;padding:14px 10px;">
        <div style="font-size:17px;font-weight:800;color:var(--white);">${val}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:4px;">${esc(label)}</div>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load stats.")}</div>`;
  }
}

async function _cnLoadAdminDisputes() {
  const el = document.getElementById('cnAdminDisputes');
  try {
    const disputes = await api('/connect/admin/disputes?status=open');
    if (!disputes.length) {
      el.innerHTML = `<div class="cn-empty">No open disputes 🎉</div>`;
      return;
    }
    el.innerHTML = disputes.map(d => `
      <div class="cn-app-row">
        <div class="cn-app-top">
          <span style="font-size:12.5px;font-weight:800;color:var(--white);">${esc(d.campaign_title || ('Campaign ' + d.campaign_id.slice(0, 8) + '…'))}</span>
          ${_cnStatusPillGeneric(d.status)}
        </div>
        <div style="font-size:12px;color:var(--white);margin-bottom:8px;">${esc(d.reason)}</div>
        ${d.deliverable_links && d.deliverable_links.length ? `
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;">Submitted work:
            ${d.deliverable_links.map(v => `<a href="${esc(v.content_url)}" target="_blank" rel="noopener" style="color:#2196f3;margin-right:8px;">🔗 ${esc(v.platform_posted_to || 'link')}${v.creator_confirmed_posted ? '' : ' ⚠️ not confirmed posted'}</a>`).join('')}
          </div>` : ''}
        ${d.evidence_url ? `<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px;">Evidence: <a href="${esc(d.evidence_url)}" target="_blank" rel="noopener" style="color:#2196f3;">🔗 View evidence</a></div>` : ''}
        <input type="text" id="cnDisputeNote-${d.id}" placeholder="Resolution note (optional)" class="cn-input-compact" style="width:100%;margin-bottom:8px;">
        <div class="cn-app-actions">
          <button class="cn-btn-sm cn-btn-accept" onclick="_cnAdminResolveDispute('${d.id}','release_to_creator')">Release to Creator</button>
          <button class="cn-btn-sm cn-btn-reject" onclick="_cnAdminResolveDispute('${d.id}','refund_to_business')">Refund Business</button>
        </div>
        <button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="_cnOpenCampaign('${d.campaign_id}')">View Campaign</button>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load disputes.")}</div>`;
  }
}

async function _cnAdminResolveDispute(disputeId, resolution) {
  const note = document.getElementById(`cnDisputeNote-${disputeId}`)?.value.trim() || null;
  try {
    await api(`/connect/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, resolution_note: note }),
    });
    toast('Dispute resolved', 'success');
    _cnLoadAdminDisputes();
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not resolve dispute', 'error');
  }
}

async function _cnLoadAdminFrozen() {
  const el = document.getElementById('cnAdminFrozen');
  try {
    const campaigns = await api('/connect/admin/campaigns?frozen_only=true');
    if (!campaigns.length) {
      el.innerHTML = `<div class="cn-empty">No frozen campaigns.</div>`;
      return;
    }
    el.innerHTML = campaigns.map(c => `
      <div class="cn-app-row">
        <div class="cn-app-top">
          <span style="font-size:12.5px;font-weight:800;color:var(--white);">${esc(c.title)}</span>
          ${_cnStatusPill(c.status)}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${c.frozen_reason ? esc(c.frozen_reason) : 'No reason given'}</div>
        <button class="cn-btn-sm cn-btn-accept" onclick="_cnAdminUnfreeze('${c.id}')">Unfreeze</button>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load frozen campaigns.")}</div>`;
  }
}

async function _cnAdminFreeze() {
  const id = document.getElementById('cnAdminFreezeId').value.trim();
  const reason = document.getElementById('cnAdminFreezeReason').value.trim() || null;
  if (!id) { toast('Enter a campaign ID', 'error'); return; }
  try {
    await api(`/connect/admin/campaigns/${id}/freeze`, { method: 'POST', body: JSON.stringify({ reason }) });
    toast('Campaign frozen', 'success');
    document.getElementById('cnAdminFreezeId').value = '';
    document.getElementById('cnAdminFreezeReason').value = '';
    _cnLoadAdminFrozen();
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not freeze campaign', 'error');
  }
}

async function _cnAdminUnfreeze(campaignId) {
  try {
    await api(`/connect/admin/campaigns/${campaignId}/unfreeze`, { method: 'POST' });
    toast('Campaign unfrozen', 'success');
    _cnLoadAdminFrozen();
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not unfreeze campaign', 'error');
  }
}

async function _cnAdminVerify(verify) {
  const userId = document.getElementById('cnAdminUserId').value.trim();
  if (!userId) { toast('Enter a user ID', 'error'); return; }
  try {
    await api(`/connect/admin/creators/${userId}/${verify ? 'verify' : 'unverify'}`, { method: 'POST' });
    toast(verify ? 'Creator verified' : 'Creator unverified', 'success');
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not update verification', 'error');
  }
}

async function _cnAdminSuspend(suspend) {
  const userId = document.getElementById('cnAdminUserId').value.trim();
  const role = document.getElementById('cnAdminUserRole').value;
  const reason = document.getElementById('cnAdminSuspendReason').value.trim() || null;
  if (!userId) { toast('Enter a user ID', 'error'); return; }
  try {
    const path = `/connect/admin/users/${userId}/${suspend ? 'suspend' : 'unsuspend'}?role=${role}`;
    await api(path, { method: 'POST', body: suspend ? JSON.stringify({ reason }) : undefined });
    toast(suspend ? 'User suspended' : 'User unsuspended', 'success');
    _cnLoadAdminStats();
  } catch (e) {
    toast(e.message || 'Could not update suspension', 'error');
  }
}
// ─── Live campaign events (SSE, forwarded by auth.js) ──────────────────────
// A budget can land after the business has closed the pay sheet (webhook /
// reconciler), and jobs can expire into the balance — keep My Jobs honest.
let _cnSelfClosedAt = 0;
function _cnOnCampaignEvent(evt) {
  Store.invalidate('connectCampaigns');
  _cnInvalidateDiscover();
  const sec = document.getElementById('sec-connect');
  const visible = sec && sec.offsetParent !== null;
  if (visible && _cnTab === 'campaigns' && !document.getElementById('cnCampaignModal')?.classList.contains('show')) {
    _cnLoadActiveTab();
  }
  if (evt.type === 'campaign_closed' && evt.refunded_kes > 0 && Date.now() - _cnSelfClosedAt > 8000) {
    toast(`${fmtKES(evt.refunded_kes)} is back on your EndaViral balance`, 'info');
  }
}
