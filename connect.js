/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL CONNECT — Brand × Creator Marketplace  (connect.js)  v1.0
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
let _cnUnreadPollTimer = null;
let _cnTab  = 'discover';         // active sub-tab
let _cnCampaigns = [];            // last-loaded list for the active tab
let _cnCurrentCampaign = null;    // full detail of the open modal's campaign
let _cnCurrentApplications = [];  // applications for the open campaign (business view)
let _cnCreatorProfile = null;
let _cnBusinessProfile = null;
let _cnFundPollTimer = null;
let _cnMsgThreadCreatorId = null;  // which creator's thread is open in the campaign modal (business side, when unassigned)
let _cnActiveNegotiationApp = null; // the CampaignApplication behind the currently open thread, if any (drives the negotiation banner/propose/fund controls)
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

const CN_STATUS_LABELS = {
  draft: 'Draft', published: 'Published', awaiting_fund: 'Awaiting Funding',
  funded: 'Funded', submitted: 'Submitted', under_review: 'Under Review',
  disputed: 'Disputed', completed: 'Completed', cancelled: 'Cancelled', archived: 'Archived',
  // CampaignApplication statuses — shares this pill/map since applications
  // render right alongside campaigns in several places.
  pending: 'Pending', accepted: 'Negotiating', rejected: 'Declined',
  withdrawn: 'Withdrawn', hired: 'Hired!', not_selected: 'Not Selected',
};
const CN_STATUS_COLORS = {
  draft: '#7a8fad', published: '#2196f3', awaiting_fund: '#ff7043', funded: '#3dd44a',
  submitted: '#2196f3', under_review: '#2196f3', disputed: '#e53935', completed: '#3dd44a',
  cancelled: '#e53935', archived: '#7a8fad',
  pending: '#7a8fad', accepted: '#ff7043', rejected: '#e53935',
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
    .cn-tab{padding:9px 15px;border-radius:24px;background:var(--card);border:1px solid var(--border);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;}
    .cn-tab:hover:not(.active){border-color:rgba(255,255,255,.22);color:var(--white);}
    .cn-tab.active{background:var(--cn-accent-soft);border-color:var(--cn-accent);color:var(--white);}

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
    .cn-join-check,.cn-confirm-row{display:flex;gap:11px;align-items:center;font-size:12px;color:var(--white);margin-bottom:11px;cursor:pointer;line-height:1.5;padding:11px 14px;border-radius:12px;background:var(--navy);border:1px solid var(--border);transition:all .15s;}
    .cn-join-check:hover,.cn-confirm-row:hover{border-color:rgba(255,255,255,.25);}
    .cn-join-check.checked,.cn-confirm-row.checked{background:var(--cn-accent-soft);border-color:var(--cn-accent);}
    .cn-join-check input,.cn-confirm-row input{position:absolute;opacity:0;width:0;height:0;}
    .cn-join-check a{color:var(--cn-accent);text-decoration:underline;}
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
    title: 'Turn your following into income',
    sub: 'Apply to paid brand campaigns, message businesses directly, and get paid via M-Pesa the moment your work is approved. EndaViral holds the money safe until then.',
  } : {
    eyebrow: '🏢 For Businesses',
    title: 'Get real creators making content for your brand',
    sub: 'Post a campaign or invite creators directly. Your budget sits safely in EndaViral until you approve the finished work — you only pay when you\'re happy.',
  };
}

function _cnJourneySteps(role) {
  return role === 'creator' ? [
    { title: 'Join & accept terms', desc: 'Tap Join, accept the marketplace terms — takes under a minute.' },
    { title: 'Complete your profile', desc: 'Add your email and M-Pesa number — that\'s how EndaViral pays you.' },
    { title: 'Apply or get invited', desc: 'Browse open campaigns, message a business, or wait for a direct invite.' },
    { title: 'Deliver & get paid', desc: 'Post the work link, the business approves, you raise a payout ticket — money lands on your phone.' },
  ] : [
    { title: 'Join & accept terms', desc: 'Tap Join, accept the marketplace terms — takes under a minute.' },
    { title: 'Set up your profile', desc: 'Tell us who you are so creators know your brand is legit.' },
    { title: 'Post a campaign', desc: 'Set a budget and deliverables, then invite creators or wait for applications.' },
    { title: 'Fund, review & pay', desc: 'Fund the campaign once you pick a creator. Approve the finished work and EndaViral releases the payment.' },
  ];
}

function _cnGuideCollapsed() {
  try { return localStorage.getItem('cnGuideCollapsed') === '1'; } catch (_) { return false; }
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
      <div class="cn-landing-sub"><strong style="color:var(--white);">Businesses hire. Creators deliver. Everyone gets paid securely.</strong><br>Businesses securely fund campaigns — payments are only released once the work is approved.</div>
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
        <div class="cn-choice-sub">Apply for paid campaigns from Kenyan businesses.</div>
        <ul class="cn-choice-list">
          <li>Apply for campaigns</li>
          <li>Negotiate directly with businesses</li>
          <li>Get paid by M-Pesa</li>
        </ul>
        <button class="cn-choice-cta" onclick="event.stopPropagation();_cnPickRole('creator')">🎥 Start as Creator</button>
      </div>
      <div class="cn-choice-card cn-choice-card--business" onclick="_cnPickRole('business')">
        <div class="cn-choice-icon">🏢</div>
        <div class="cn-choice-eyebrow">For Businesses</div>
        <div class="cn-choice-title">Hire creators that fit your brand</div>
        <div class="cn-choice-sub">Post a campaign or invite creators directly — pay only once you approve the work.</div>
        <ul class="cn-choice-list">
          <li>Post a campaign</li>
          <li>Receive creator applications</li>
          <li>Approve work before payment</li>
        </ul>
        <button class="cn-choice-cta" onclick="event.stopPropagation();_cnPickRole('business')">🏢 Hire Creators</button>
      </div>
    </div>

    <div class="cn-trust-row">
      <span class="cn-trust-item"><b>✔</b> Payments processed securely</span>
      <span class="cn-trust-item"><b>✔</b> M-Pesa payouts</span>
      <span class="cn-trust-item"><b>✔</b> Marketplace support</span>
      <span class="cn-trust-item"><b>✔</b> Dispute resolution</span>
    </div>

    <div class="cn-landing-foot" style="margin-bottom:24px;">Not sure where to start? Explore both experiences before joining — switch anytime.</div>

    <div class="cn-landing-section-lbl">How It Works</div>
    <div class="cn-timeline">
      <div class="cn-timeline-step" data-who="business"><div class="cn-timeline-dot">🏢</div><div class="cn-timeline-label">Business posts campaign</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="creator"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">🎬</div><div class="cn-timeline-label">Creators apply</div><div class="cn-timeline-who">Creator</div></div>
      <div class="cn-timeline-step" data-who="business"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">✅</div><div class="cn-timeline-label">Business selects creator</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="business"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">💰</div><div class="cn-timeline-label">Business funds campaign</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="creator"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">📦</div><div class="cn-timeline-label">Creator delivers work</div><div class="cn-timeline-who">Creator</div></div>
      <div class="cn-timeline-step" data-who="business"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">👍</div><div class="cn-timeline-label">Business approves</div><div class="cn-timeline-who">Business</div></div>
      <div class="cn-timeline-step" data-who="system"><span class="cn-timeline-arrow">→</span><div class="cn-timeline-dot">📲</div><div class="cn-timeline-label">Creator gets paid</div><div class="cn-timeline-who">M-Pesa</div></div>
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
  try { stats = await api('/connect/marketplace-stats'); } catch (_) { stats = null; }
  if (!stats || typeof stats !== 'object') return;
  const items = [
    stats.total_paid_kes != null ? { num: `KES ${Number(stats.total_paid_kes).toLocaleString()}`, label: 'Paid to Creators' } : null,
    stats.businesses_count != null ? { num: String(stats.businesses_count), label: 'Businesses' } : null,
    stats.campaigns_completed != null ? { num: String(stats.campaigns_completed), label: 'Campaigns Completed' } : null,
    stats.avg_approval_hours != null ? { num: `${stats.avg_approval_hours}h`, label: 'Avg Approval Time' } : null,
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
  _cnStartUnreadPolling();
}

// ─── Unread message/prompt badges (nav item + per-card) ────────────────────
// Polled on a light interval so a business/creator sees "someone messaged
// you" or "a payment is waiting on your action" without needing to open
// every campaign. Self-clearing: the interval checks whether the Connect
// section is still on-screen and stops itself once the user navigates away,
// same pattern as the admin panel's balance-refresh timer in index.html.
function _cnStartUnreadPolling() {
  if (_cnUnreadPollTimer) clearInterval(_cnUnreadPollTimer);
  _cnUnreadPollTimer = setInterval(() => {
    const sec = document.getElementById('sec-connect');
    if (!sec || !sec.classList.contains('active')) {
      clearInterval(_cnUnreadPollTimer);
      _cnUnreadPollTimer = null;
      return;
    }
    _cnPollUnread();
  }, 25000);
}

async function _cnPollUnread() {
  try {
    const data = await api(`/connect/notifications/unread-count?role=${_cnRole}`);
    _cnUnreadByCampaign = {};
    (data.campaigns || []).forEach(c => { _cnUnreadByCampaign[c.campaign_id] = c.unread_count; });

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
    // whoever's mid-action every 25s.
    if ((_cnTab === 'campaigns' || _cnTab === 'work') && !_cnCurrentCampaign) {
      const target = document.getElementById('cnTabContent');
      if (target) await _cnLoadActiveTab();
    }
  } catch (e) {
    // Silent — background convenience poll, not user-initiated.
  }
}

function _cnRenderShell(sec) {
  if (_cnShowingLanding()) { _cnRenderLanding(sec); return; }
  sec.dataset.cnRole = _cnRole;
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
      <div class="cn-hero-eyebrow">${hero.eyebrow} · EndaViral Marketplace</div>
      <div class="cn-hero-title">${esc(hero.title)}</div>
      <div class="cn-hero-sub">${esc(hero.sub)}</div>
      <div class="cn-hero-badges">
        <span class="cn-hero-badge">🔒 Payments protected</span>
        <span class="cn-hero-badge">💸 M-Pesa payouts</span>
        <span class="cn-hero-badge">✅ 15% fee — only on completed work</span>
        <span class="cn-hero-badge">⭐ Rated by both sides</span>
      </div>
    </div>
    ${showToggle ? `
    <div class="cn-role-toggle">
      <button class="cn-role-btn ${_cnRole === 'creator' ? 'active' : ''}" data-role="creator" onclick="_cnSetRole('creator')">🎬 I'm a Creator</button>
      <button class="cn-role-btn ${_cnRole === 'business' ? 'active' : ''}" data-role="business" onclick="_cnSetRole('business')">🏢 I'm a Business</button>
    </div>` : identityRowHtml}
    <div class="cn-guide-head">
      <span class="cn-guide-title">How EndaViral Connect works</span>
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
    ? [['discover', '🔍 Discover'], ['applications', '📨 My Applications'], ['invites', '✉️ Invites'], ['work', '🛠 Active Work'], ['profile', '👤 My Profile']]
    : [['campaigns', '📋 My Campaigns'], ['create', '➕ New Campaign'], ['find', '🔎 Find Creators'], ['profile', '🏢 Business Profile']];
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
    ? !!(profile && profile.has_payment_details)
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
        ${isCreator ? 'One step from your first paid campaign' : 'One step from your first campaign'}
      </div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px;line-height:1.6;">
        ${isCreator
          ? 'Get discovered by brands, apply to paid campaigns, and get paid via M-Pesa once your work is approved.'
          : 'Post paid campaigns, discover creators, and pay securely through EndaViral.'}
      </div>

      <div class="cn-section-lbl" style="margin-top:0;">Before you join</div>
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
        <span>I have read and agree to the <a href="#" onclick="return _cnOpenTos()">EndaViral Connect Marketplace Terms of Service</a>, and confirm I am at least 18 years old or have legal authority to enter into this agreement.</span>
      </label>

      <button class="btn-primary" id="cnJoinBtn" style="margin-top:6px;" onclick="_cnSubmitJoin('${role}')" disabled>Accept & Join the Marketplace</button>
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
  btn.disabled = !(boxes.length && Array.from(boxes).every(b => b.checked));
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
    toast('Welcome to EndaViral Connect!', 'success');
    _cnJoinedRoles[role] = true;
    if (_cnJoinedRoles.creator && _cnJoinedRoles.business) _cnSetLastRole(role);
    const sec = document.getElementById('sec-connect');
    if (sec) _cnRenderShell(sec); // toggle/add-role pill needs to reflect the new state immediately
    _cnSetTab('profile');
  } catch (e) {
    toast(e.message || 'Could not join', 'error');
    btn.disabled = false; btn.textContent = 'Accept & Join the Marketplace';
  }
}

function _cnRenderIncompleteProfileScreen(target, role) {
  const isCreator = role === 'creator';
  target.innerHTML = `
    <div class="cn-gate">
      <div class="cn-gate-icon">${isCreator ? '💳' : '🏢'}</div>
      <div class="cn-gate-title">${isCreator ? 'Almost there — add your payment details' : 'Finish setting up your business profile'}</div>
      <div class="cn-gate-sub">${isCreator
        ? "Add your email and M-Pesa number to your Creator profile — that's how EndaViral pays you — before browsing campaigns."
        : "Add your company name before posting a campaign or inviting creators."}</div>
      <button class="cn-gate-btn" onclick="_cnSetTab('profile')">Go to My Profile →</button>
    </div>
  `;
}

// ─── Discover (creator) ──────────────────────────────────────────────────────
async function _cnRenderDiscover(target) {
  const data = await api('/connect/discover');
  _cnCampaigns = data || [];
  if (!_cnCampaigns.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">🔍</span><div class="cn-empty-title">No open campaigns right now</div>Check back soon — new campaigns get posted regularly.</div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${_cnCampaigns.map(_cnCardHtml).join('')}</div>`;
}

function _cnCardHtml(c) {
  const plat = _cnPlatformDefs(c.platform)[0];   // first platform — used for the title-row emoji
  const unread = _cnUnreadByCampaign[c.id] || 0;
  return `
  <div class="cn-card" data-campaign-id="${c.id}" style="position:relative;" onclick="_cnOpenCampaign('${c.id}')">
    ${unread > 0 ? `<span class="cn-unread-dot" style="position:absolute;top:12px;right:12px;background:var(--green);color:#000;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:800;">💬 ${unread > 9 ? '9+' : unread}</span>` : ''}
    <div class="cn-card-top">
      <div class="cn-card-title">${plat.emoji} ${esc(c.title)}</div>
      <div class="cn-card-budget">${fmtKES(c.budget_kes)}</div>
    </div>
    <div class="cn-card-desc">${esc(c.description)}</div>
    <div class="cn-card-meta">
      ${_cnPlatformTagsHtml(c.platform, 'cn-tag')}
      ${c.min_followers ? `<span class="cn-tag">${c.min_followers.toLocaleString()}+ followers</span>` : ''}
      ${_cnNicheTagsHtml(c.required_niche, 'cn-tag')}
      ${_cnStatusPill(c.status)}
    </div>
  </div>`;
}

// ─── My Applications (creator) ───────────────────────────────────────────────
async function _cnRenderMyApplications(target) {
  const apps = await api('/connect/applications/mine');
  if (!apps.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">📨</span><div class="cn-empty-title">No applications yet</div>Find a campaign you like and apply — your bid and delivery time show up here.<br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('discover')">Browse campaigns →</button></div>`;
    return;
  }
  target.innerHTML = apps.map(a => `
    <div class="cn-app-row" style="cursor:pointer;" onclick="_cnOpenCampaign('${a.campaign_id}')">
      <div class="cn-app-top">
        <span class="cn-app-bid">${fmtKES(a.bid_amount_kes)}</span>
        ${_cnStatusPill(a.status)}
      </div>
      <div style="font-size:11.5px;color:var(--muted);">Delivery in ${a.delivery_days} day${a.delivery_days == 1 ? '' : 's'} · Applied ${a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</div>
      ${a.proposal ? `<div style="font-size:12px;color:var(--white);margin-top:6px;">${esc(a.proposal)}</div>` : ''}
    </div>
  `).join('');
}

// ─── Active Work (creator) ────────────────────────────────────────────────────
async function _cnRenderMyWork(target) {
  const campaigns = await api('/connect/campaigns/mine?role=creator');
  const active = campaigns.filter(c => c.status !== 'draft');
  if (!active.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">🛠</span><div class="cn-empty-title">Nothing in progress yet</div>Once a business accepts your application or you accept an invite, the job shows up here.</div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${active.map(_cnCardHtml).join('')}</div>`;
}

// ─── My Campaigns (business) ─────────────────────────────────────────────────
async function _cnRenderMyCampaigns(target) {
  const campaigns = await api('/connect/campaigns/mine?role=business');
  if (!campaigns.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">📋</span><div class="cn-empty-title">No campaigns posted yet</div>Set a budget and deliverables, and creators can start applying within minutes.<br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('create')">Post your first campaign →</button></div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${campaigns.map(_cnCardHtml).join('')}</div>`;
}

// ─── Create campaign (business) ──────────────────────────────────────────────
function _cnRenderCreateForm(target) {
  target.innerHTML = `
    <div class="cn-tip">💡 Once you publish, this goes live to every creator on EndaViral — you can invite someone directly from here too, right after it's posted.</div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📋</div>
        <div><div class="cn-form-card-title">Campaign Basics</div></div>
      </div>
      <div class="cn-field">
        <label>Campaign Title</label>
        <input type="text" id="cnNewTitle" placeholder="e.g. TikTok Reel for Our New Product Launch" maxlength="200">
      </div>
      <div class="cn-field">
        <label>Description</label>
        <textarea id="cnNewDesc" placeholder="What's the campaign about? What should the creator know?"></textarea>
      </div>
      <div class="cn-field">
        <label>Platform</label>
        ${_cnMultiSelectHtml('cnNewPlatforms', CONNECT_PLATFORMS, ['tiktok'])}
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">💰</div>
        <div><div class="cn-form-card-title">Budget & Deliverables</div></div>
      </div>
      <div class="cn-field">
        <label>Budget (KES) — this funds the campaign once a creator is accepted</label>
        <input type="number" id="cnNewBudget" min="1" placeholder="e.g. 3000">
      </div>
      <div class="cn-field">
        <label>Deliverables</label>
        <input type="text" id="cnNewDeliverables" placeholder="e.g. 1 Reel, 2 TikToks">
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🎯</div>
        <div><div class="cn-form-card-title">Targeting (optional)</div></div>
      </div>
      <div class="cn-field">
        <label>Minimum Followers</label>
        <input type="number" id="cnNewMinFollowers" min="0" placeholder="e.g. 5000">
      </div>
      <div class="cn-field">
        <label>Required Niche</label>
        ${_cnMultiSelectHtml('cnNewNiches', CONNECT_NICHES, [])}
        <div style="font-size:12px;color:var(--muted);margin-top:6px;">Leave blank to accept creators of any niche. Pick more than one if several fit.</div>
      </div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📝</div>
        <div><div class="cn-form-card-title">Content Guidelines (optional)</div></div>
      </div>
      <div class="cn-field">
        <textarea id="cnNewGuidelines" placeholder="Tone, must-mention points, hashtags, etc."></textarea>
      </div>
    </div>

    <button class="btn-primary" id="cnNewSubmitBtn" onclick="_cnSubmitCreateCampaign()">Create Campaign (Draft)</button>
  `;
}

async function _cnSubmitCreateCampaign() {
  const title = document.getElementById('cnNewTitle').value.trim();
  const description = document.getElementById('cnNewDesc').value.trim();
  const platform = _cnMultiSelectValue('cnNewPlatforms');
  const budget_kes = parseFloat(document.getElementById('cnNewBudget').value);
  const deliverables = document.getElementById('cnNewDeliverables').value.trim();
  const min_followers = parseInt(document.getElementById('cnNewMinFollowers').value) || 0;
  const required_niche = _cnMultiSelectValue('cnNewNiches') || null;
  const content_guidelines = document.getElementById('cnNewGuidelines').value.trim() || null;

  if (!title || title.length < 3) { toast('Give your campaign a title', 'error'); return; }
  if (!description || description.length < 10) { toast('Add a bit more description', 'error'); return; }
  if (!platform) { toast('Pick at least one platform', 'error'); return; }
  if (!budget_kes || budget_kes <= 0) { toast('Enter a valid budget', 'error'); return; }
  if (!deliverables) { toast('List what the creator should deliver', 'error'); return; }

  const btn = document.getElementById('cnNewSubmitBtn');
  btn.disabled = true; btn.textContent = 'Creating…';

  let campaign;
  try {
    campaign = await api('/connect/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title, description, platform, budget_kes, deliverables,
        min_followers, required_niche, content_guidelines,
      }),
    });
  } catch (e) {
    toast(e.message || 'Could not create campaign', 'error');
    btn.disabled = false; btn.textContent = 'Create Campaign (Draft)';
    return;
  }

  try {
    await api(`/connect/campaigns/${campaign.id}/publish`, { method: 'POST' });
    toast('🎉 Campaign published! Creators can now apply.', 'success');
  } catch (e) {
    toast('Campaign saved as draft — you can publish it from My Campaigns.', 'info');
  }

  _cnSetTab('campaigns');
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
async function _cnRenderCreatorProfileForm(target) {
  let profile = null;
  try { profile = await api('/connect/profile/creator/me'); } catch (_) { /* not created yet */ }
  _cnCreatorProfile = profile;

  // Seed the per-platform follower values from whatever the server has on
  // file, so re-opening the form doesn't wipe out numbers already entered.
  _cnCpFollowerValues = { ...(profile?.platform_followers || {}) };

  target.innerHTML = `
    ${profile?.joined_at ? `<div class="cn-hero-badge" style="display:inline-flex;margin-bottom:14px;">✅ Joined EndaViral Connect on ${new Date(profile.joined_at).toLocaleDateString()}</div>` : ''}

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">🎬</div>
        <div><div class="cn-form-card-title">Your Creator Profile</div><div class="cn-form-card-sub">How businesses see you in the marketplace</div></div>
      </div>
      <div class="cn-field"><label>Display Name</label><input type="text" id="cnCpName" value="${esc(profile?.display_name || '')}"></div>
      <div class="cn-field"><label>Bio</label><textarea id="cnCpBio">${esc(profile?.bio || '')}</textarea></div>
      <div class="cn-field"><label>Location</label><input type="text" id="cnCpLocation" value="${esc(profile?.location || '')}" placeholder="e.g. Nairobi, Kenya"></div>
      <div class="cn-field"><label>Niches</label>${_cnMultiSelectHtml('cnCpNiches', CONNECT_NICHES, (profile?.niches || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))}</div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">📱</div>
        <div><div class="cn-form-card-title">Platforms & Audience</div><div class="cn-form-card-sub">Only platforms you select below ask for a follower count</div></div>
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
        <div><div class="cn-form-card-title">Payment Details</div><div class="cn-form-card-sub">Required before you can apply to campaigns</div></div>
      </div>
      <div class="cn-tip">🔒 Your phone number is only ever visible to EndaViral — businesses never see it — and it's what your payout tickets pay out to.</div>
      <div class="cn-field"><label>Email</label><input type="email" id="cnCpEmail" value="${esc(profile?.email || '')}" placeholder="you@example.com"></div>
      <div class="cn-field"><label>M-Pesa Phone Number</label><input type="text" id="cnCpPhone" value="${esc(profile?.phone || '')}" placeholder="07XXXXXXXX"></div>
    </div>

    <div class="cn-form-card">
      <div class="cn-form-card-head">
        <div class="cn-form-card-icon">💰</div>
        <div><div class="cn-form-card-title">Pricing (optional)</div><div class="cn-form-card-sub">Suggested starting rates — you can always negotiate per campaign</div></div>
      </div>
      <div class="cn-field"><label>Short Video</label><input type="number" id="cnCpPriceVideo" value="${profile?.prices_kes?.short_video || ''}" min="0"></div>
      <div class="cn-field"><label>Instagram Reel</label><input type="number" id="cnCpPriceReel" value="${profile?.prices_kes?.ig_reel || ''}" min="0"></div>
      <div class="cn-field"><label>TikTok</label><input type="number" id="cnCpPriceTiktok" value="${profile?.prices_kes?.tiktok || ''}" min="0"></div>
    </div>

    <button class="btn-primary" id="cnCpSaveBtn" onclick="_cnSaveCreatorProfile()">Save Profile</button>

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

function _cnRenderFollowerInputs() {
  const wrap = document.getElementById('cnCpFollowersWrap');
  if (!wrap) return;
  const selected = _cnMultiState['cnCpPlatforms'] || [];

  if (!selected.length) {
    wrap.innerHTML = `<div class="cn-tip">👆 Pick at least one platform above — we'll show a follower/subscriber field for each one you select.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="cn-field">
      <label>Followers / Subscribers</label>
      <div class="cn-cp-followers-grid">
        ${selected.map(key => {
          const p = _cnPlatformDef(key);
          const val = _cnCpFollowerValues[key] ?? '';
          return `
            <div class="cn-cp-follower-row">
              <span class="cn-cp-follower-label">${p.emoji} ${esc(p.label)}</span>
              <input type="number" min="0" placeholder="0"
                id="cnCpFollowers-${key}"
                value="${esc(String(val))}"
                oninput="_cnCpFollowerValues['${key}'] = this.value === '' ? '' : parseInt(this.value) || 0;">
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function _cnSaveCreatorProfile() {
  const btn = document.getElementById('cnCpSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const selectedPlatforms = _cnMultiState['cnCpPlatforms'] || [];
  // Only send counts for platforms currently ticked — a stray leftover
  // value for a platform someone unticked shouldn't be submitted (the
  // server rejects follower keys outside the selected platform list).
  const platform_followers = {};
  selectedPlatforms.forEach(key => {
    const v = _cnCpFollowerValues[key];
    platform_followers[key] = (v === '' || v === undefined || v === null) ? 0 : v;
  });

  const payload = {
    display_name: document.getElementById('cnCpName').value.trim() || null,
    bio: document.getElementById('cnCpBio').value.trim() || null,
    location: document.getElementById('cnCpLocation').value.trim() || null,
    niches: _cnMultiSelectValue('cnCpNiches') || null,
    platforms: _cnMultiSelectValue('cnCpPlatforms') || null,
    platform_followers,
    email: document.getElementById('cnCpEmail').value.trim() || null,
    phone: document.getElementById('cnCpPhone').value.trim() || null,
    price_short_video_kes: parseFloat(document.getElementById('cnCpPriceVideo').value) || null,
    price_ig_reel_kes: parseFloat(document.getElementById('cnCpPriceReel').value) || null,
    price_tiktok_kes: parseFloat(document.getElementById('cnCpPriceTiktok').value) || null,
  };
  try {
    await api('/connect/profile/creator', { method: 'POST', body: JSON.stringify(payload) });
    toast('Profile saved!', 'success');
    // Send the creator straight into Discover so they can start applying.
    _cnSetTab('discover');
    return;
  } catch (e) {
    toast(e.message || 'Could not save profile', 'error');
  }
  btn.disabled = false; btn.textContent = 'Save Profile';
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
        <div><div class="cn-form-card-title">Your Business Profile</div><div class="cn-form-card-sub">How creators see you when they apply or get invited</div></div>
      </div>
      <div class="cn-field"><label>Company Name</label><input type="text" id="cnBpName" value="${esc(profile?.company_name || '')}"></div>
      <div class="cn-field"><label>Industry</label><input type="text" id="cnBpIndustry" value="${esc(profile?.industry || '')}" placeholder="e.g. E-commerce, Restaurant, Fintech"></div>
      <div class="cn-field"><label>Website</label><input type="text" id="cnBpWebsite" value="${esc(profile?.website || '')}" placeholder="https://..."></div>
    </div>

    <button class="btn-primary" id="cnBpSaveBtn" onclick="_cnSaveBusinessProfile()">Save Profile</button>

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
  if (!name || name.length < 2) { toast('Enter a company name', 'error'); return; }
  const btn = document.getElementById('cnBpSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const payload = {
    company_name: name,
    industry: document.getElementById('cnBpIndustry').value.trim() || null,
    website: document.getElementById('cnBpWebsite').value.trim() || null,
  };
  try {
    await api('/connect/profile/business', { method: 'POST', body: JSON.stringify(payload) });
    toast('Business profile saved!', 'success');
    // Send the business straight into campaign creation next.
    _cnSetTab('create');
    return;
  } catch (e) {
    toast(e.message || 'Could not save profile', 'error');
  }
  btn.disabled = false; btn.textContent = 'Save Profile';
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

  // Business viewing their own still-open campaign also needs applications
  // — a campaign can have several PENDING bids and several ACCEPTED
  // (parallel-negotiating) applications at once, all shown here.
  const isBusinessOwner = currentUser && currentUser.id === campaign.business_user_id;
  if (isBusinessOwner && campaign.status === 'published') {
    try { _cnCurrentApplications = await api(`/connect/campaigns/${campaignId}/applications`); }
    catch (_) { _cnCurrentApplications = []; }
  } else {
    _cnCurrentApplications = [];
  }
  _cnActiveNegotiationApp = null;

  _cnRenderCampaignModal();
}

function _cnCloseCampaign() {
  document.getElementById('cnCampaignModal').classList.remove('show');
  if (_cnFundPollTimer) { clearInterval(_cnFundPollTimer); _cnFundPollTimer = null; }
}

function _cnRenderCampaignModal() {
  const c = _cnCurrentCampaign;
  const body = document.getElementById('cnCampaignModalBody');
  const plats = _cnPlatformDefs(c.platform);
  const isBusinessOwner = currentUser && currentUser.id === c.business_user_id;
  const isAssignedCreator = currentUser && currentUser.id === c.creator_user_id;

  let html = `
    <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#2196f3;margin-bottom:6px;">${plats.map(p => `${p.emoji} ${esc(p.label).toUpperCase()}`).join(' · ')}</div>
    <div class="modal-title" style="margin-bottom:4px;">${esc(c.title)}</div>
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">${_cnStatusPill(c.status)}${c.is_frozen ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e5393520;color:#ff8a80;border:1px solid #e5393540;">🧊 Frozen by admin</span>` : ''}</div>
    ${c.is_frozen ? `<div style="font-size:12px;color:#ff8a80;background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);border-radius:10px;padding:10px 12px;margin-bottom:14px;">This campaign is frozen${c.frozen_reason ? ': ' + esc(c.frozen_reason) : ''}. No actions can be taken until an admin unfreezes it.</div>` : ''}
    <div class="cn-summary-card">
      <div style="font-size:13px;color:var(--white);line-height:1.6;margin-bottom:${c.content_guidelines ? '12px' : '0'};">${esc(c.description)}</div>
      ${c.content_guidelines ? `<div style="font-size:11.5px;color:var(--muted);line-height:1.5;"><span style="font-weight:800;color:var(--white);">Guidelines:</span> ${esc(c.content_guidelines)}</div>` : ''}
      <div class="cn-chip-row">
        <span class="cn-chip cn-chip-money">${fmtKES(c.budget_kes)}</span>
        <span class="cn-chip">📦 ${esc(c.deliverables)}</span>
        ${c.min_followers ? `<span class="cn-chip">👥 ${c.min_followers.toLocaleString()}+ followers</span>` : ''}
        ${_cnNicheTagsHtml(c.required_niche, 'cn-chip')}
        ${c.escrow_kes > 0 ? `<span class="cn-chip cn-chip-money">🔒 ${fmtKES(c.escrow_kes)} held</span>` : ''}
      </div>
    </div>
  `;

  // Payment Receipts — business owner only, once at least one funding
  // attempt could exist (i.e. past the draft/published stage). Lets a
  // receipt be re-downloaded any time, not only right after paying.
  const _cnShowReceipts = isBusinessOwner && !['draft', 'published'].includes(c.status);
  if (_cnShowReceipts) {
    html += `<div class="cn-section-lbl">🧾 Payment Receipts</div><div id="cnReceiptsArea" style="margin-bottom:14px;"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>`;
  }

  // ── Role/status-specific action area ──────────────────────────────────
  // These used to render as a separate block above the chat. They now
  // collect into actionHtml and get slotted INTO the chat panel itself
  // (between the message timeline and the input row) further down, so
  // "Fund Now" / "Submit for Review" / "Approve" / "Request Payout" are
  // buttons the business and creator see right where they're already
  // talking, not on a separate part of the page.
  let actionHtml = '';
  if (!c.is_frozen) {
  if (!isBusinessOwner && c.status === 'published' && _cnRole === 'creator') {
    html += _cnApplyFormHtml();
  }

  if (isBusinessOwner && c.status === 'draft') {
    html += `<button class="btn-primary" onclick="_cnPublishFromModal('${c.id}')">Publish Campaign</button>`;
  }

  if (isBusinessOwner && c.status === 'published') {
    // A campaign can have several bids AND several parallel accepted
    // negotiations at once — the campaign stays on Discover throughout and
    // ONLY comes off once one of these is actually funded. Group them so
    // it reads like a business inbox: active talks first, fresh bids below.
    const _cnActiveApps = _cnCurrentApplications.filter(a => a.status === 'accepted');
    const _cnPendingApps = _cnCurrentApplications.filter(a => a.status === 'pending');
    html += `<div class="cn-card-header"><span>📥 Applications</span><span class="cn-card-header-count">${_cnCurrentApplications.length}</span></div>`;
    html += `<div class="cn-apps-card">`;
    if (!_cnCurrentApplications.length) {
      html += `<div style="font-size:12px;color:var(--muted);text-align:center;padding:6px 0;">No applications yet — check back soon, or invite a creator directly.</div>`;
    } else {
      if (_cnActiveApps.length) {
        html += `<div class="cn-apps-subhead cn-apps-subhead-active">In Negotiation · ${_cnActiveApps.length}</div>`;
        html += _cnActiveApps.map(a => `
          <div class="cn-neg-row" onclick="_cnOpenNegotiationThread('${c.id}','${a.id}')">
            <div>
              <div class="cn-neg-row-name">${esc(a.creator_display_name || 'Creator')}</div>
              <div class="cn-neg-row-sub">💬 Tap to open the conversation</div>
            </div>
            <div class="cn-neg-row-amt">${fmtKES(a.fund_amount_kes)}</div>
          </div>
        `).join('');
      }
      if (_cnPendingApps.length) {
        html += `<div class="cn-apps-subhead" style="margin-top:${_cnActiveApps.length ? '12px' : '0'};">New Bids · ${_cnPendingApps.length}</div>`;
        html += _cnPendingApps.map(a => `
          <div class="cn-app-row">
            <div class="cn-app-top"><span class="cn-app-bid">${fmtKES(a.bid_amount_kes)}</span>${_cnStatusPill(a.status)}</div>
            <div style="font-size:11.5px;color:var(--muted);">${esc(a.creator_display_name || 'Creator')} · delivery in ${a.delivery_days} day${a.delivery_days == 1 ? '' : 's'}</div>
            ${a.proposal ? `<div style="font-size:12px;color:var(--white);margin-top:6px;">${esc(a.proposal)}</div>` : ''}
            <div class="cn-app-actions">
              <button class="cn-btn-sm cn-btn-accept" onclick="_cnAcceptApplication('${c.id}','${a.id}')">Accept</button>
              <button class="cn-btn-sm cn-btn-reject" onclick="_cnRejectApplication('${c.id}','${a.id}')">Reject</button>
            </div>
          </div>
        `).join('');
      }
    }
    html += `<button class="btn-secondary" style="width:100%;margin-top:${_cnCurrentApplications.length ? '10px' : '0'};" onclick="_cnOpenInviteModal(null,null,'${c.id}')">✉️ Invite a Creator Directly</button>`;
    html += `</div>`;
  }

  // Negotiate Price — lives inline in the chat panel below (a sticky
  // banner + the 💰 toggle by the message box), never a separate box that
  // duplicates what the chat already shows. The BUSINESS side of this is
  // resolved dynamically once a specific creator's thread is opened — see
  // _cnRenderActionCard/_cnOpenNegotiationThread further down, because a
  // business can have several parallel negotiations open and only knows
  // which one it's looking at once a thread is picked. A creator only ever
  // has one (unambiguous) application/thread, so it's handled here directly.
  if (!isBusinessOwner && c.status === 'published' && c.my_application_status === 'accepted') {
    actionHtml += _cnNegotiationBannerHtml({ fundAmount: c.fund_amount_kes, bidAmount: c.accepted_bid_kes, agreedAmount: c.agreed_amount_kes });
  }
  if (!isBusinessOwner && c.my_application_status === 'not_selected') {
    actionHtml += `<div class="cn-lost-banner">😔 This campaign was funded to another creator. Check Discover for other open campaigns.</div>`;
  }
  if (!isBusinessOwner && c.my_application_status === 'rejected') {
    actionHtml += `<div class="cn-lost-banner">This negotiation was declined by the business.</div>`;
  }

  // Submit for Review — the creator's N-video batch + self-check, in-chat.
  if (isAssignedCreator && c.status === 'funded') {
    actionHtml += _cnDeliverableFormHtml();
  }

  // Approve/Reject the submitted round — in-chat, with the 48h countdown.
  if (isBusinessOwner && c.status === 'submitted') {
    actionHtml += `<div class="cn-section-lbl">Review Submission ${_cnReviewCountdownHtml(c)}</div><div id="cnDeliverableReview">Loading…</div>`;
  }
  if (isAssignedCreator && c.status === 'submitted') {
    actionHtml += `<div class="cn-section-lbl">Awaiting Business Review ${_cnReviewCountdownHtml(c)}</div><div style="font-size:12px;color:var(--muted);">The business has ${CN_REVIEW_WINDOW_HOURS}h to approve or explain a rejection. If they go quiet, EndaViral admin will follow up.</div>`;
  }

  if ((isBusinessOwner || isAssignedCreator) && ['funded', 'submitted', 'under_review'].includes(c.status)) {
    actionHtml += `<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="_cnOpenDisputeForm()">⚠️ Open a Dispute</button><div id="cnDisputeForm"></div>`;
  }

  if ((isBusinessOwner || isAssignedCreator) && c.status === 'completed') {
    actionHtml += `<div id="cnReviewArea">${_cnReviewFormHtml()}</div>`;
  }

  // Request Payout — in-chat, once the business has approved.
  if (isAssignedCreator && c.status === 'completed') {
    actionHtml += `<div class="cn-section-lbl">💰 Payout</div><div id="cnPayoutArea"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>`;
  }

  if (isBusinessOwner && ['completed', 'cancelled'].includes(c.status)) {
    html += `<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="_cnArchiveCampaign('${c.id}')">🗄 Archive Campaign</button>`;
  }
  } // end !c.is_frozen

  // A creator can message the business about any published campaign they're
  // interested in — this is BEFORE an application is accepted, per the
  // journey, not gated on it. Once accepted, they keep messaging as before.
  const creatorCanMessage = _cnRole === 'creator' && !isBusinessOwner
    && (isAssignedCreator || c.status === 'published');

  _cnMsgThreadCreatorId = null;
  if (isBusinessOwner || creatorCanMessage) {
    if (isBusinessOwner && !c.creator_user_id) {
      // No creator assigned yet — the business may be hearing from several
      // interested creators, so show a thread picker first. Picking one
      // (or clicking a row in "In Negotiation" above) opens that specific
      // conversation, with its own negotiate/fund controls.
      html += `<div class="cn-chat-card">
        <div class="cn-chat-card-head" id="cnChatCardHead">💬 Conversations</div>
        <div id="cnMsgThreads"><div style="color:var(--muted);font-size:12px;padding:14px 0;text-align:center;">Loading conversations…</div></div>
        <div id="cnMsgBackLink" style="display:none;margin-bottom:8px;"><a href="#" style="font-size:11.5px;color:var(--cn-accent);text-decoration:none;font-weight:700;" onclick="event.preventDefault();_cnShowMsgThreadPicker('${c.id}')">← All conversations</a></div>
        <div class="cn-msgs" id="cnMsgList" style="display:none;"></div>
        <div id="cnMsgActionCard"></div>
        <div id="cnMsgInputRow" style="display:none;"></div>
      </div>`;
    } else {
      _cnMsgThreadCreatorId = isBusinessOwner ? c.creator_user_id : currentUser.id;
      const chatHeadName = isBusinessOwner ? esc(c.creator_display_name || 'Creator') : 'Business';
      html += `<div class="cn-chat-card">
        <div class="cn-chat-card-head">💬 Conversation with ${chatHeadName}</div>
        <div class="cn-msgs" id="cnMsgList"><div style="color:var(--muted);font-size:12px;padding:14px 0;text-align:center;">Loading…</div></div>
        <div id="cnMsgActionCard">${actionHtml}</div>
        <div id="cnMsgInputRow"></div>
      </div>`;
    }
  } else if (actionHtml) {
    // No chat access for this viewer (shouldn't normally happen for the
    // two parties) — fall back to showing the action card standalone so
    // nothing is ever unreachable.
    html += `<div id="cnMsgActionCard">${actionHtml}</div>`;
  }

  body.innerHTML = html;

  if (isBusinessOwner && !c.creator_user_id) {
    _cnLoadMessageThreads(c.id);
  } else if (isBusinessOwner || creatorCanMessage) {
    _cnRenderMsgInputRow(c.id);
    _cnLoadMessages(c.id, _cnMsgThreadCreatorId);
  }
  if (isBusinessOwner && c.status === 'submitted') _cnLoadDeliverableForReview(c.id);
  if (isAssignedCreator && c.status === 'completed') _cnLoadPayoutArea(c);
  if (_cnShowReceipts) _cnLoadReceipts(c.id);
}

// 48h business-review countdown badge, shown next to the review section
// both in the business's "approve/reject" card and the creator's "awaiting
// review" note — same numbers, same source (server-computed, never
// re-derived client-side).
function _cnReviewCountdownHtml(c) {
  if (!c.review_hours_remaining && c.review_hours_remaining !== 0) return '';
  const overdue = c.review_hours_remaining <= 0;
  const label = overdue
    ? `Review window passed — EndaViral admin can step in`
    : `${c.review_hours_remaining}h left to review`;
  return `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px;${overdue ? 'background:#e5393520;color:#ff8a80;' : 'background:#2196f320;color:#64b5f6;'}">${label}</span>`;
}
const CN_REVIEW_WINDOW_HOURS = 48;

// ─── Apply (creator) ──────────────────────────────────────────────────────────
function _cnApplyFormHtml() {
  return `
    <div class="cn-section-lbl">Apply to this Campaign</div>
    <div class="cn-field"><label>Your Bid (KES)</label><input type="number" id="cnApplyBid" min="1" placeholder="e.g. 2500"></div>
    <div class="cn-field"><label>Delivery Time (days)</label><input type="number" id="cnApplyDays" min="1" placeholder="e.g. 3"></div>
    <div class="cn-field"><label>Proposal (optional)</label><textarea id="cnApplyProposal" placeholder="Why are you a good fit for this campaign?"></textarea></div>
    <button class="btn-primary" id="cnApplyBtn" onclick="_cnSubmitApplication('${_cnCurrentCampaign.id}')">Submit Application</button>
  `;
}

async function _cnSubmitApplication(campaignId) {
  const bid_amount_kes = parseFloat(document.getElementById('cnApplyBid').value);
  const delivery_days = parseInt(document.getElementById('cnApplyDays').value);
  const proposal = document.getElementById('cnApplyProposal').value.trim() || null;

  if (!bid_amount_kes || bid_amount_kes <= 0) { toast('Enter a valid bid amount', 'error'); return; }
  if (!delivery_days || delivery_days <= 0) { toast('Enter a valid delivery time', 'error'); return; }

  const btn = document.getElementById('cnApplyBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ bid_amount_kes, delivery_days, proposal }),
    });
    toast('Application submitted!', 'success');
    _cnCloseCampaign();
    if (_cnTab === 'discover' || _cnTab === 'applications') _cnLoadActiveTab();
  } catch (e) {
    toast(e.message || 'Could not submit application', 'error');
    btn.disabled = false; btn.textContent = 'Submit Application';
  }
}

// ─── Accept / reject application (business) ──────────────────────────────────
async function _cnAcceptApplication(campaignId, applicationId) {
  try {
    await api(`/connect/campaigns/${campaignId}/applications/${applicationId}/accept`, { method: 'POST' });
    toast('Application accepted — fund campaign next to get started!', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not accept application', 'error');
  }
}

async function _cnRejectApplication(campaignId, applicationId) {
  try {
    await api(`/connect/campaigns/${campaignId}/applications/${applicationId}/reject`, { method: 'POST' });
    toast('Application rejected', 'info');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not reject application', 'error');
  }
}

// ─── Negotiate price (either party, post-accept) — lives INLINE in the chat:
// a sticky banner shows the current agreed number, and a 💰 toggle by the
// message box reveals a one-line "propose an amount" row so making an offer
// feels like sending a chat message, not filling out a separate form.
function _cnNegotiationBannerHtml(ctx) {
  const changed = ctx.agreedAmount != null && ctx.bidAmount != null && Number(ctx.agreedAmount) !== Number(ctx.bidAmount);
  return `
    <div class="cn-neg-banner">
      <div class="cn-neg-banner-who">🤝 In talks<span class="sub">Agree a price in chat, then fund when ready</span></div>
      <div style="text-align:right;">
        <div class="cn-neg-banner-amt">${fmtKES(ctx.fundAmount)}</div>
        ${changed ? `<div class="cn-neg-banner-orig">was ${fmtKES(ctx.bidAmount)}</div>` : ''}
      </div>
    </div>
  `;
}

// Whether the CURRENT viewer, in whatever thread is currently open, is
// allowed to propose a price right now — business resolves this against
// whichever accepted application's thread it has open (_cnActiveNegotiationApp);
// a creator only ever has their own single application to check.
function _cnCanNegotiateNow() {
  const c = _cnCurrentCampaign;
  if (!c || c.status !== 'published') return false;
  const isBusinessOwner = currentUser && currentUser.id === c.business_user_id;
  if (isBusinessOwner) return !!(_cnActiveNegotiationApp && _cnActiveNegotiationApp.status === 'accepted');
  return c.my_application_status === 'accepted';
}

// (Re)builds the message input row — plain text box + Send, plus (only when
// this viewer can actually negotiate right now) a 💰 toggle that reveals an
// inline "propose an amount" row above it. Called whenever the open thread
// changes, since that changes whether negotiating is currently possible.
function _cnRenderMsgInputRow(campaignId) {
  const row = document.getElementById('cnMsgInputRow');
  if (!row) return;
  const canNegotiate = _cnCanNegotiateNow();
  row.innerHTML = `
    ${canNegotiate ? `
    <div class="cn-propose-row" id="cnProposeRow">
      <input type="number" min="1" id="cnNegotiateAmount" placeholder="Propose an amount (KES)">
      <button class="btn-secondary" id="cnNegotiateBtn" onclick="_cnProposePrice('${campaignId}')">Send Offer</button>
    </div>` : ''}
    <div class="cn-msg-input-row">
      ${canNegotiate ? `<button class="cn-propose-toggle" id="cnProposeToggle" title="Propose a price" onclick="_cnToggleProposeRow()">💰</button>` : ''}
      <input type="text" id="cnMsgInput" placeholder="Type a message…" onkeydown="if(event.key==='Enter')_cnSendMessage('${campaignId}')">
      <button class="btn-secondary" onclick="_cnSendMessage('${campaignId}')">Send</button>
    </div>
  `;
  row.style.display = '';
}

function _cnToggleProposeRow() {
  const el = document.getElementById('cnProposeRow');
  const btn = document.getElementById('cnProposeToggle');
  if (!el) return;
  el.classList.toggle('open');
  if (btn) btn.classList.toggle('active');
  if (el.classList.contains('open')) document.getElementById('cnNegotiateAmount')?.focus();
}

async function _cnProposePrice(campaignId) {
  const input = document.getElementById('cnNegotiateAmount');
  const amount_kes = parseFloat(input.value);
  if (!amount_kes || amount_kes <= 0) { toast('Enter a valid amount', 'error'); return; }

  const btn = document.getElementById('cnNegotiateBtn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const body = { amount_kes };
    if (_cnActiveNegotiationApp) body.application_id = _cnActiveNegotiationApp.id;
    await api(`/connect/campaigns/${campaignId}/negotiate/offer`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    input.value = '';
    _cnToggleProposeRow();
    toast('Offer sent', 'success');
    _cnLoadMessages(campaignId, _cnMsgThreadCreatorId);
  } catch (e) {
    toast(e.message || 'Could not send offer', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Send Offer';
  }
}

async function _cnAcceptOffer(campaignId) {
  try {
    const body = {};
    if (_cnActiveNegotiationApp) body.application_id = _cnActiveNegotiationApp.id;
    await api(`/connect/campaigns/${campaignId}/negotiate/accept`, { method: 'POST', body: JSON.stringify(body) });
    toast('Price agreed!', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not accept that offer', 'error');
  }
}

// ─── Fund escrow (business, STK push) — always tied to a specific
// accepted application, since a campaign may have several parallel
// negotiations and only ONE of them is the one being funded. ─────────────
// Mirrors connect_service.PLATFORM_PROCESSING_FEE_TIERS exactly, for
// DISPLAY ONLY — the actual charge is always computed server-side at
// /fund time (see connect_service.platform_processing_fee); this just lets
// the breakdown render before the STK push goes out, without a round trip.
function _cnPlatformProcessingFee(amountKes) {
  if (amountKes < 1000) return 30;
  if (amountKes < 5000) return 50;
  if (amountKes < 10000) return 75;
  return 100;
}

function _cnFundFormHtml(applicationId, fundAmount) {
  const phone = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) ? currentUser.phone : '';
  const fee = _cnPlatformProcessingFee(fundAmount);
  const total = fundAmount + fee;
  return `
    <div class="cn-fund-breakdown" style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);padding:2px 0;">
        <span>Campaign Budget</span><span>${fmtKES(fundAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);padding:2px 0;">
        <span>Platform Processing Fee</span><span>${fmtKES(fee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;color:var(--white);padding:6px 0 4px;margin-top:4px;border-top:1px solid var(--border);">
        <span>Total to Pay</span><span>${fmtKES(total)}</span>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:6px;line-height:1.5;">
        The Platform Processing Fee covers payment processing, M-Pesa transaction costs, fraud protection, and secure creator payouts.<br>
        ✓ Secure payment &nbsp; ✓ Creator paid after approval &nbsp; ✓ M-Pesa receipt provided
      </div>
    </div>
    <div id="cnFundForm" class="cn-fund-row">
      <input type="text" id="cnFundPhone" class="cn-fund-phone" value="${esc(phone)}" placeholder="07XXXXXXXX">
      <button class="cn-fund-btn" id="cnFundBtn" onclick="_cnSubmitFund('${_cnCurrentCampaign.id}','${applicationId}')">📱 Pay ${fmtKES(total)}</button>
    </div>
    <div id="cnFundStatus" style="display:none;text-align:center;padding:16px 0 6px;">
      <div style="font-size:30px;margin-bottom:6px;" id="cnFundIcon">📱</div>
      <div style="font-weight:800;color:var(--white);margin-bottom:4px;font-size:13px;" id="cnFundTitle">WAITING FOR PAYMENT</div>
      <div style="font-size:11.5px;color:var(--muted);" id="cnFundDesc">Enter your M-Pesa PIN to pay ${fmtKES(total)}.</div>
    </div>
  `;
}

async function _cnSubmitFund(campaignId, applicationId) {
  const phone = document.getElementById('cnFundPhone').value.trim();
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }

  const btn = document.getElementById('cnFundBtn');
  btn.disabled = true; btn.textContent = 'Sending…';

  let data;
  try {
    data = await api(`/connect/campaigns/${campaignId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ phone, application_id: applicationId }),
    });
  } catch (e) {
    toast(e.message || 'Could not start payment', 'error');
    btn.disabled = false; btn.textContent = '📱 Send STK Push';
    return;
  }

  document.getElementById('cnFundForm').style.display = 'none';
  document.getElementById('cnFundStatus').style.display = '';
  _cnPollFunding(campaignId, data.checkoutRequestId);
}

function _cnPollFunding(campaignId, checkoutRequestId) {
  let attempts = 0;
  const maxAttempts = 30; // ~90s at 3s interval, mirrors Academy's purchase poller
  if (_cnFundPollTimer) clearInterval(_cnFundPollTimer);

  _cnFundPollTimer = setInterval(async () => {
    attempts++;
    let data;
    try {
      data = await api(`/connect/campaigns/${campaignId}/funding-status/${encodeURIComponent(checkoutRequestId)}`);
    } catch (e) { return; }

    const icon = document.getElementById('cnFundIcon');
    const title = document.getElementById('cnFundTitle');
    const desc = document.getElementById('cnFundDesc');

    if (data.status === 'success') {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      if (icon) icon.textContent = '✅';
      if (title) title.textContent = 'CAMPAIGN FUNDED';
      if (desc) {
        const feeNote = data.platform_processing_fee_kes
          ? ` (incl. ${fmtKES(data.platform_processing_fee_kes)} processing fee)`
          : '';
        desc.textContent = `Paid ${fmtKES(data.total_charge_kes || data.amount_kes)}${feeNote}. The creator can now start work.`;
      }
      const statusEl = document.getElementById('cnFundStatus');
      if (statusEl && !document.getElementById('cnFundReceiptBtn')) {
        const btn = document.createElement('button');
        btn.id = 'cnFundReceiptBtn';
        btn.className = 'btn-secondary';
        btn.style.cssText = 'margin-top:12px;';
        btn.textContent = '⬇️ Download Receipt';
        btn.onclick = () => _cnDownloadReceipt(campaignId, checkoutRequestId);
        statusEl.appendChild(btn);
      }
      toast('🎉 Campaign funded!', 'success');
      setTimeout(() => _cnOpenCampaign(campaignId), 2400);
    } else if (data.status === 'failed' || data.status === 'cancelled') {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      if (icon) icon.textContent = '❌';
      if (title) title.textContent = data.status === 'cancelled' ? 'PAYMENT CANCELLED' : 'PAYMENT FAILED';
      if (desc) desc.textContent = 'You can try again.';
      setTimeout(() => _cnOpenCampaign(campaignId), 1800);
    } else if (attempts >= maxAttempts) {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      if (desc) desc.textContent = 'Still waiting — check your phone, or close and try again.';
    }
  }, 3000);
}

// ─── Payment receipts (business) ───────────────────────────────────────────
async function _cnLoadReceipts(campaignId) {
  const el = document.getElementById('cnReceiptsArea');
  if (!el) return;
  let rows;
  try {
    rows = await api(`/connect/campaigns/${campaignId}/fundings`);
  } catch (e) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;">Could not load payment history.</div>`;
    return;
  }
  const successful = (rows || []).filter(r => r.status === 'success');
  if (!successful.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;">No completed payments yet.</div>`;
    return;
  }
  el.innerHTML = successful.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;">
      <div>
        <div style="font-size:12.5px;font-weight:700;color:var(--white);">${fmtKES(r.total_charge_kes)} paid</div>
        <div style="font-size:11px;color:var(--muted);">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}${r.mpesa_receipt ? ' · ' + esc(r.mpesa_receipt) : ''}</div>
      </div>
      <button class="btn-secondary" style="padding:6px 12px;font-size:11.5px;" onclick="_cnDownloadReceipt('${campaignId}','${r.checkout_request_id}')">⬇️ Receipt</button>
    </div>
  `).join('');
}

async function _cnDownloadReceipt(campaignId, checkoutRequestId) {
  const headers = {};
  if (typeof token !== 'undefined' && token) headers['Authorization'] = 'Bearer ' + token;
  let resp;
  try {
    resp = await fetch(`${API}/connect/campaigns/${campaignId}/funding/${encodeURIComponent(checkoutRequestId)}/receipt`, { headers });
  } catch (e) {
    toast('Cannot reach the server. Please try again.', 'error');
    return;
  }
  if (!resp.ok) {
    let msg = 'Could not download receipt';
    try { const data = await resp.json(); msg = data.detail || msg; } catch (_) {}
    toast(msg, 'error');
    return;
  }
  const blob = await resp.blob();
  const disposition = resp.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'EndaViral-Receipt.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Submit deliverable (creator) ─────────────────────────────────────────────
function _cnDeliverableFormHtml() {
  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const rows = Array.from({ length: n }, (_, i) => i + 1).map(i => `
    <div class="cn-field" style="border-left:2px solid var(--border);padding-left:10px;margin-bottom:10px;">
      <label>Video ${i} of ${n} — Link</label>
      <input type="text" id="cnDelivUrl${i}" placeholder="https://...">
      <label style="margin-top:6px;">Platform</label>
      <select id="cnDelivPlatform${i}" class="cn-select">
        <option value="tiktok">TikTok</option>
        <option value="instagram">Instagram</option>
        <option value="facebook">Facebook</option>
        <option value="youtube">YouTube</option>
      </select>
    </div>
  `).join('');

  return `
    <div class="cn-section-lbl">Submit Your Work (${n} video${n === 1 ? '' : 's'} required)</div>
    ${rows}
    <div class="cn-field"><label>Note (optional)</label><textarea id="cnDelivNote" placeholder="Anything the business should know"></textarea></div>
    <label class="cn-confirm-row" style="margin:10px 0;">
      <input type="checkbox" id="cnDelivConfirm" onchange="_cnSyncCheckRow(this)">
      <span class="cn-join-tick">✓</span>
      <span>I confirm this work was completed and is genuinely posted live on my socials at the link(s) above.</span>
    </label>
    <button class="btn-primary" id="cnDelivBtn" onclick="_cnSubmitDeliverable('${_cnCurrentCampaign.id}')">Submit for Review</button>
  `;
}

async function _cnSubmitDeliverable(campaignId) {
  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const items = [];
  for (let i = 1; i <= n; i++) {
    const url = document.getElementById(`cnDelivUrl${i}`).value.trim();
    if (!url) { toast(`Add the link for video ${i} of ${n}`, 'error'); return; }
    items.push({ content_url: url, platform_posted_to: document.getElementById(`cnDelivPlatform${i}`).value });
  }
  const confirmed_posted = document.getElementById('cnDelivConfirm').checked;
  if (!confirmed_posted) { toast('Please confirm the work was completed and posted before submitting.', 'error'); return; }
  const confirmation_note = document.getElementById('cnDelivNote').value.trim() || null;

  const btn = document.getElementById('cnDelivBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify({ items, confirmed_posted, confirmation_note }),
    });
    toast('Submitted for review!', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not submit', 'error');
    btn.disabled = false; btn.textContent = 'Submit for Review';
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
    ${rows.map(d => `
      <div class="cn-row" style="align-items:flex-start;">
        <span class="k">Video ${d.sequence_no}${d.platform_posted_to ? ` (${esc(d.platform_posted_to)})` : ''}</span>
        <span class="v"><a href="${esc(d.content_url)}" target="_blank" rel="noopener" style="color:#2196f3;">${esc(d.content_url)}</a></span>
      </div>
      ${d.note ? `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 8px;">${esc(d.note)}</div>` : ''}
    `).join('')}
    <div style="font-size:11px;color:var(--muted);margin:6px 0 10px;">Creator confirmed all ${rows.length} video(s) are posted and live.</div>
    <div style="font-size:12px;color:var(--muted);margin:10px 0;">Check the content, then approve to release payment (85% to creator, 15% platform fee) or reject to request changes.</div>
    <div class="cn-field"><label>Review Note ${'(required if rejecting)'}</label><textarea id="cnReviewNote" placeholder="Feedback for the creator"></textarea></div>
    <div style="display:flex;gap:10px;">
      <button class="btn-secondary" style="flex:1;" onclick="_cnReviewDeliverable('${campaignId}','reject')">Request Changes</button>
      <button class="btn-primary" style="flex:1;margin-top:0;" onclick="_cnReviewDeliverable('${campaignId}','approve')">✅ Approve & Pay</button>
    </div>
  `;
}

async function _cnReviewDeliverable(campaignId, decision) {
  const review_note = document.getElementById('cnReviewNote')?.value.trim() || null;
  if (decision === 'reject' && !review_note) {
    toast('Please describe why the work is being rejected', 'error');
    return;
  }

  try {
    await api(`/connect/campaigns/${campaignId}/deliverables/${decision}`, {
      method: 'POST',
      body: JSON.stringify({ review_note }),
    });
    toast(decision === 'approve' ? '🎉 Approved — payment released!' : 'Sent back to creator for changes', 'success');
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
    <div class="cn-field" style="margin-top:12px;"><label>What happened?</label><textarea id="cnDisputeReason" placeholder="Explain the issue — our team will review and resolve it."></textarea></div>
    <div class="cn-field">
      <label>Evidence link${evidenceRequired ? ' (required)' : ' (optional)'}</label>
      <input type="text" id="cnDisputeEvidence" placeholder="Link to a screenshot, or the posted video if it's not already on the campaign">
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">${evidenceRequired
        ? 'No work has been submitted on the platform for this campaign yet, so this is the only record admin will have — attach a link to a screenshot or the delivered work.'
        : 'If the work was submitted through the normal flow, the posted video link is already on file — our team will see it. Add this if you agreed to send the work directly (e.g. not posted publicly) — a screenshot proving delivery is stronger evidence than a link in that case.'}</div>
    </div>
    <button class="btn-secondary" style="width:100%;background:rgba(229,57,53,.14);border-color:rgba(229,57,53,.3);color:#ff8a80;" onclick="_cnSubmitDispute('${_cnCurrentCampaign.id}')">Submit Dispute</button>
  `;
}

async function _cnSubmitDispute(campaignId) {
  const reason = document.getElementById('cnDisputeReason').value.trim();
  const evidence_url = document.getElementById('cnDisputeEvidence')?.value.trim() || null;
  if (!reason || reason.length < 10) { toast('Explain what happened in a bit more detail', 'error'); return; }
  const evidenceRequired = _cnCurrentCampaign && _cnCurrentCampaign.status === 'funded';
  if (evidenceRequired && !evidence_url) { toast('Add a link to a screenshot or the delivered work — no work is on file for this campaign yet', 'error'); return; }
  try {
    await api(`/connect/campaigns/${campaignId}/dispute`, { method: 'POST', body: JSON.stringify({ reason, evidence_url }) });
    toast('Dispute submitted — our team will review it shortly.', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not submit dispute', 'error');
  }
}

// ─── Reviews ───────────────────────────────────────────────────────────────────
let _cnReviewRating = 0;

function _cnReviewFormHtml() {
  return `
    <div class="cn-section-lbl">Rate Your Experience</div>
    <div class="cn-stars" id="cnStars">
      ${[1, 2, 3, 4, 5].map(n => `<span class="cn-star" data-n="${n}" onclick="_cnSetStars(${n})">★</span>`).join('')}
    </div>
    <div class="cn-field"><label>Comment (optional)</label><textarea id="cnReviewComment" placeholder="How did it go?"></textarea></div>
    <button class="btn-primary" id="cnReviewSubmitBtn" onclick="_cnSubmitReview('${_cnCurrentCampaign.id}')">Submit Review</button>
  `;
}

function _cnSetStars(n) {
  _cnReviewRating = n;
  document.querySelectorAll('#cnStars .cn-star').forEach(el => {
    el.classList.toggle('on', parseInt(el.dataset.n) <= n);
  });
}

async function _cnSubmitReview(campaignId) {
  if (!_cnReviewRating) { toast('Pick a star rating', 'error'); return; }
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
    btn.disabled = false; btn.textContent = 'Submit Review';
  }
}

// ─── Payout request (creator, last step of the journey) ────────────────────
async function _cnLoadPayoutArea(c) {
  const el = document.getElementById('cnPayoutArea');
  if (!el) return;

  let existing = null;
  try {
    const mine = await api('/connect/payout-requests/mine');
    existing = (mine || []).find(t => t.campaign_id === c.id) || null;
  } catch (_) { /* no ticket yet, or couldn't load — fall through to the request form */ }

  const payout = c.creator_payout_kes;
  const fee = c.platform_fee_kes;
  const breakdown = (payout != null && fee != null) ? `
    <div class="cn-row"><span class="k">Amount Paid to You</span><span class="v" style="color:var(--green);">${fmtKES(payout)}</span></div>
    <div class="cn-row"><span class="k">EndaViral Service Fee (15%)</span><span class="v">${fmtKES(fee)}</span></div>
  ` : '';

  if (existing && existing.status !== 'rejected') {
    const statusLabel = existing.status === 'paid'
      ? `✅ Paid${existing.mpesa_receipt ? ` — M-Pesa ref ${esc(existing.mpesa_receipt)}` : ''}`
      : '⏳ Pending — EndaViral is sending your money via M-Pesa';
    el.innerHTML = `${breakdown}<div style="font-size:12px;color:var(--muted);margin-top:8px;">Payout ticket: ${statusLabel}</div>`;
    return;
  }

  const phone = (_cnCreatorProfile && _cnCreatorProfile.phone) || '';
  const rejectedNote = existing && existing.status === 'rejected'
    ? `<div style="font-size:12px;color:#ff8a80;margin-bottom:8px;">Your last payout request was rejected${existing.admin_note ? `: ${esc(existing.admin_note)}` : ''}. Fix the details below and re-request.</div>`
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
        <label>Video ${seq} of ${n} — Link${match ? '' : ' (confirm/edit)'}</label>
        <input type="text" id="cnPayoutUrl${seq}" value="${esc((match && match.content_url) || '')}" placeholder="https://...">
      </div>
    `;
  }).join('');

  el.innerHTML = `
    ${breakdown}
    ${rejectedNote}
    <div class="cn-field"><label>M-Pesa Phone Number</label><input type="text" id="cnPayoutPhone" value="${esc(phone)}" placeholder="07XXXXXXXX"></div>
    ${rowsHtml}
    <button class="btn-primary" id="cnPayoutBtn" onclick="_cnRequestPayout('${c.id}')">Request Payout</button>
  `;
}

async function _cnRequestPayout(campaignId) {
  const phone = document.getElementById('cnPayoutPhone').value.trim();
  if (!phone) { toast('Enter your M-Pesa phone number', 'error'); return; }

  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const items = [];
  for (let seq = 1; seq <= n; seq++) {
    const el = document.getElementById(`cnPayoutUrl${seq}`);
    const url = el ? el.value.trim() : '';
    if (!url) { toast(`Add the link for video ${seq} of ${n}`, 'error'); return; }
    items.push({ sequence_no: seq, content_url: url });
  }

  const btn = document.getElementById('cnPayoutBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/payout-request`, {
      method: 'POST',
      body: JSON.stringify({ phone, items }),
    });
    toast('Payout requested — EndaViral will send your money via M-Pesa.', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not request payout', 'error');
    btn.disabled = false; btn.textContent = 'Request Payout';
  }
}

// ─── Messages ──────────────────────────────────────────────────────────────────
async function _cnLoadMessageThreads(campaignId) {
  const wrap = document.getElementById('cnMsgThreads');
  if (!wrap) return;
  let threads;
  try { threads = await api(`/connect/campaigns/${campaignId}/message-threads`); }
  catch (e) { wrap.innerHTML = `<div style="color:var(--muted);font-size:12px;">Couldn't load conversations.</div>`; return; }

  if (!threads.length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:12px;">No creators have messaged about this campaign yet.</div>`;
    return;
  }
  wrap.innerHTML = threads.map(t => {
    const app = _cnCurrentApplications.find(a => a.creator_user_id === t.creator_user_id);
    const negTag = app && app.status === 'accepted' ? `<span style="color:var(--green);font-weight:800;margin-left:6px;">· Negotiating</span>` : '';
    return `
    <div class="cn-thread-row" onclick="_cnOpenMsgThread('${campaignId}','${t.creator_user_id}')" style="cursor:pointer;padding:9px 12px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:12.5px;color:var(--white);font-weight:700;">${esc(t.display_name || 'Creator')}${negTag}</div>
        <div style="font-size:11px;color:var(--muted);">${esc(t.last_message || '')}</div>
      </div>
      ${t.unread_count ? `<span style="background:#2196f3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10.5px;font-weight:700;">${t.unread_count}</span>` : ''}
    </div>`;
  }).join('');
}

// Opens a thread from a plain click in the picker list — resolves whether
// this creator currently has an ACCEPTED (in-negotiation) application so the
// banner/propose-toggle/fund-form know whether to appear.
function _cnOpenMsgThread(campaignId, creatorUserId) {
  _cnActiveNegotiationApp = _cnCurrentApplications.find(a => a.creator_user_id === creatorUserId && a.status === 'accepted') || null;
  _cnOpenMsgThreadInternal(campaignId, creatorUserId);
}

// Opens a thread from clicking a specific row in the "In Negotiation" list
// above — we already know exactly which application this is.
function _cnOpenNegotiationThread(campaignId, applicationId) {
  const app = _cnCurrentApplications.find(a => a.id === applicationId);
  if (!app) return;
  _cnActiveNegotiationApp = app;
  _cnOpenMsgThreadInternal(campaignId, app.creator_user_id);
}

function _cnOpenMsgThreadInternal(campaignId, creatorUserId) {
  _cnMsgThreadCreatorId = creatorUserId;
  const threadsEl = document.getElementById('cnMsgThreads');
  const listEl = document.getElementById('cnMsgList');
  const backEl = document.getElementById('cnMsgBackLink');
  if (threadsEl) threadsEl.style.display = 'none';
  if (listEl) listEl.style.display = 'block';
  if (backEl) backEl.style.display = 'block';
  _cnRenderActionCard();
  _cnRenderMsgInputRow(campaignId);
  _cnLoadMessages(campaignId, creatorUserId);
}

// Back out of a specific conversation to the "who's messaged" picker —
// businesses juggling several parallel negotiations need this to switch.
function _cnShowMsgThreadPicker(campaignId) {
  _cnActiveNegotiationApp = null;
  _cnMsgThreadCreatorId = null;
  const threadsEl = document.getElementById('cnMsgThreads');
  const listEl = document.getElementById('cnMsgList');
  const backEl = document.getElementById('cnMsgBackLink');
  const actionEl = document.getElementById('cnMsgActionCard');
  const inputRow = document.getElementById('cnMsgInputRow');
  if (threadsEl) threadsEl.style.display = 'block';
  if (listEl) listEl.style.display = 'none';
  if (backEl) backEl.style.display = 'none';
  if (actionEl) actionEl.innerHTML = '';
  if (inputRow) { inputRow.innerHTML = ''; inputRow.style.display = 'none'; }
  _cnLoadMessageThreads(campaignId);
}

// Builds the business-side action card (negotiation banner + fund form) for
// whichever thread is currently open. Only meaningful pre-funding, while the
// campaign is still 'published' and the open thread's application is still
// 'accepted' — once funded/rejected/not_selected there's nothing to show
// here (the chat's system messages already tell that story).
function _cnRenderActionCard() {
  const el = document.getElementById('cnMsgActionCard');
  if (!el) return;
  const c = _cnCurrentCampaign;
  const app = _cnActiveNegotiationApp;
  let html = '';
  if (app && app.status === 'accepted' && c.status === 'published') {
    html += `<div class="cn-deal-panel">`
      + _cnNegotiationBannerHtml({ fundAmount: app.fund_amount_kes, bidAmount: app.bid_amount_kes, agreedAmount: app.agreed_amount_kes })
      + _cnFundFormHtml(app.id, app.fund_amount_kes)
      + `</div>`;
  }
  el.innerHTML = html;
}

async function _cnLoadMessages(campaignId, threadCreatorId) {
  const list = document.getElementById('cnMsgList');
  if (!list) return;
  let messages;
  try {
    const qs = threadCreatorId ? `?creator_user_id=${encodeURIComponent(threadCreatorId)}` : '';
    messages = await api(`/connect/campaigns/${campaignId}/messages${qs}`);
  } catch (e) { list.innerHTML = `<div style="color:var(--muted);font-size:12px;">Could not load messages.</div>`; return; }

  if (!messages.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:12px;">No messages yet — say hello!</div>`;
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

    if (m.kind === 'price_offer') {
      const amt = m.action_payload && m.action_payload.amount_kes;
      const mine = currentUser && m.sender_user_id === currentUser.id;
      const proposerLabel = m.sender_user_id === _cnCurrentCampaign.business_user_id ? 'Business' : 'Creator';
      const canAccept = m === lastMsg && !mine && _cnCurrentCampaign.status === 'published' && appStillActive;
      return dayDivider + `<div class="cn-msg-card cn-msg-card-offer">
        <div class="cn-msg-card-title">💬 ${mine ? 'You' : proposerLabel} proposed <span>${fmtKES(amt)}</span></div>
        ${canAccept ? `<button class="cn-btn-sm cn-btn-accept" onclick="_cnAcceptOffer('${campaignId}')">✓ Accept ${fmtKES(amt)}</button>` : `<div class="cn-msg-card-waiting">${mine ? 'Waiting for a reply…' : ''}</div>`}
      </div>`;
    }
    if (m.kind === 'fund_prompt') {
      const amt = m.action_payload && m.action_payload.amount_kes;
      const canFund = isBusinessOwner && appStillActive;
      return dayDivider + `<div class="cn-msg-card cn-msg-card-fund">
        <div class="cn-msg-card-title">✅ Agreed on <span>${fmtKES(amt)}</span></div>
        ${canFund ? `<button class="cn-btn-sm cn-btn-accept" onclick="document.getElementById('cnFundPhone')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('cnFundPhone')?.focus();">📱 Fund Now</button>` : `<div class="cn-msg-card-waiting">Ready to fund whenever you are.</div>`}
      </div>`;
    }
    if (m.kind === 'not_selected') {
      return dayDivider + `<div class="cn-msg-card cn-msg-card-lost">${esc(m.body)}</div>`;
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
        ${!mine ? `<div class="who">${senderIsBusiness ? 'Business' : 'Creator'}</div>` : ''}
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
    await api(`/connect/campaigns/${campaignId}/messages`, { method: 'POST', body: JSON.stringify(payload) });
    _cnLoadMessages(campaignId, _cnMsgThreadCreatorId);
  } catch (e) {
    toast(e.message || 'Could not send message', 'error');
  }
}

// ─── Publish shortcut from inside the detail modal ────────────────────────────
async function _cnPublishFromModal(campaignId) {
  try {
    await api(`/connect/campaigns/${campaignId}/publish`, { method: 'POST' });
    toast('Campaign published!', 'success');
    _cnOpenCampaign(campaignId);
  } catch (e) {
    toast(e.message || 'Could not publish', 'error');
  }
}

// ─── Archive (business, completed/cancelled campaigns) ────────────────────────
async function _cnArchiveCampaign(campaignId) {
  try {
    await api(`/connect/campaigns/${campaignId}/archive`, { method: 'POST' });
    toast('Campaign archived', 'success');
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
  const invites = await api('/connect/invites/mine');
  if (!invites.length) {
    target.innerHTML = `<div class="cn-empty"><span class="cn-empty-icon">✉️</span><div class="cn-empty-title">No invites yet</div>Businesses can invite you directly once you have a creator profile.</div>`;
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
        ${platLabel} · ${c.budget_kes != null ? fmtKES(c.budget_kes) : ''} ·
        Invited ${i.created_at ? new Date(i.created_at).toLocaleDateString() : ''}
      </div>
      ${i.message ? `<div style="font-size:12px;color:var(--white);margin-bottom:8px;">"${esc(i.message)}"</div>` : ''}
      ${i.status === 'pending' ? `
      <div class="cn-app-actions">
        <button class="cn-btn-sm cn-btn-accept" onclick="_cnAcceptInvite('${i.id}')">Accept</button>
        <button class="cn-btn-sm cn-btn-reject" onclick="_cnDeclineInvite('${i.id}')">Decline</button>
      </div>` : ''}
      ${c.id ? `<button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="_cnOpenCampaign('${c.id}')">View Campaign</button>` : ''}
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

async function _cnAcceptInvite(inviteId) {
  try {
    await api(`/connect/invites/${inviteId}/accept`, { method: 'POST' });
    toast('Invite accepted — fund it once the business pays.', 'success');
    _cnRenderInvites(document.getElementById('cnTabContent'));
  } catch (e) {
    toast(e.message || 'Could not accept invite', 'error');
  }
}

async function _cnDeclineInvite(inviteId) {
  try {
    await api(`/connect/invites/${inviteId}/decline`, { method: 'POST' });
    toast('Invite declined', 'success');
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
    <div class="cn-tip">🔎 Search by niche, platform or follower count — or skip the filters and invite anyone straight from their profile card.</div>
    <div class="cn-field" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
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
      <select id="cnFcSort" class="cn-fc-input">
        <option value="rating" ${_cnCreatorFilters.sort === 'rating' ? 'selected' : ''}>Sort: Top Rated</option>
        <option value="followers" ${_cnCreatorFilters.sort === 'followers' ? 'selected' : ''}>Sort: Most Followers</option>
        <option value="jobs_completed" ${_cnCreatorFilters.sort === 'jobs_completed' ? 'selected' : ''}>Sort: Most Jobs Done</option>
      </select>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);margin-bottom:12px;cursor:pointer;">
      <input type="checkbox" id="cnFcVerified" ${_cnCreatorFilters.verified_only ? 'checked' : ''}> Verified creators only
    </label>
    <button class="btn-secondary" style="margin-bottom:16px;" onclick="_cnSearchCreators()">🔎 Search</button>
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
    const creators = await api(`/connect/creators?${params.toString()}`);
    if (!creators.length) {
      resultsEl.innerHTML = `<div class="cn-empty">No creators match those filters.</div>`;
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
      ${platforms.map(pl => `<span class="cn-tag">${_cnPlatformDef(pl).emoji} ${esc(_cnPlatformDef(pl).label)}</span>`).join('')}
      ${niches.map(n => `<span class="cn-tag">${esc(n)}</span>`).join('')}
      ${p.followers_count ? `<span class="cn-tag">${p.followers_count.toLocaleString()} followers</span>` : ''}
      ${p.jobs_completed != null ? `<span class="cn-tag">${p.jobs_completed} jobs done</span>` : ''}
    </div>
    <button class="btn-secondary" style="width:100%;" onclick="_cnOpenInviteModal('${p.user_id}','${esc(name).replace(/'/g, "\\'")}',null)">✉️ Invite to a Campaign</button>
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
      const campaigns = await api('/connect/campaigns/mine?role=business');
      const open = campaigns.filter(c => c.status === 'published');
      if (!open.length) {
        body.innerHTML = `<div class="cn-empty">You don't have any published campaigns to invite a creator to yet.<br><button class="btn-secondary" style="margin-top:12px;" onclick="_cnCloseInviteModal();_cnSetTab('create')">Post a campaign →</button></div>`;
        return;
      }
      campaignOptionsHtml = open.map(c => `<option value="${c.id}">${esc(c.title)} · ${fmtKES(c.budget_kes)}</option>`).join('');
    } catch (e) {
      body.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load your campaigns.")}</div>`;
      return;
    }
  }

  let creatorOptionsHtml = '';
  if (!creatorUserId) {
    try {
      const creators = await api('/connect/creators?sort=rating&limit=50');
      if (!creators.length) {
        body.innerHTML = `<div class="cn-empty">No creators in the directory yet.</div>`;
        return;
      }
      creatorOptionsHtml = creators.map(p => `<option value="${p.user_id}">${esc(p.display_name || p.user_id)}${p.is_verified ? ' ✔️' : ''} — ★${p.rating_avg || 0}</option>`).join('');
    } catch (e) {
      body.innerHTML = `<div class="cn-empty">${esc(e.message || "Couldn't load creators.")}</div>`;
      return;
    }
  }

  body.innerHTML = `
    <div class="modal-title" style="margin-bottom:14px;">✉️ Invite ${creatorLabel ? esc(creatorLabel) : 'a Creator'}</div>
    ${!campaignId ? `
    <div class="cn-field"><label>Campaign</label>
      <select id="cnInviteCampaignSelect">${campaignOptionsHtml}</select>
    </div>` : ''}
    ${!creatorUserId ? `
    <div class="cn-field"><label>Creator</label>
      <select id="cnInviteCreatorSelect">${creatorOptionsHtml}</select>
    </div>` : ''}
    <div class="cn-field"><label>Message (optional)</label>
      <textarea id="cnInviteMessage" placeholder="Tell them why you'd love to work with them…"></textarea>
    </div>
    <button class="btn-primary" id="cnInviteSendBtn" onclick="_cnSubmitInvite()">Send Invite</button>
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
    toast('Invite sent!', 'success');
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
  await Promise.all([_cnLoadAdminStats(), _cnLoadAdminPayouts('pending'), _cnLoadAdminDisputes(), _cnLoadAdminFrozen(), _cnLoadAdminOverdue()]);
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