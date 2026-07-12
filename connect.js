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
let _cnTab  = 'discover';         // active sub-tab
let _cnCampaigns = [];            // last-loaded list for the active tab
let _cnCurrentCampaign = null;    // full detail of the open modal's campaign
let _cnCurrentApplications = [];  // applications for the open campaign (business view)
let _cnCreatorProfile = null;
let _cnBusinessProfile = null;
let _cnFundPollTimer = null;
let _cnMsgThreadCreatorId = null;  // which creator's thread is open in the campaign modal (business side, when unassigned)

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

// ─── Terms of Service ───────────────────────────────────────────────────────
// The ToS text, checkbox definitions (CONNECT_CREATOR_TOS_CHECKS /
// CONNECT_BUSINESS_TOS_CHECKS) and rendered HTML (CONNECT_TOS_HTML) now
// live in connect-tos.js, which must be loaded before this file. See
// _cnOpenTos() and _cnRenderJoinScreen() below for where they're used.

const CN_STATUS_LABELS = {
  draft: 'Draft', published: 'Published', awaiting_fund: 'Awaiting Funding',
  funded: 'Funded', submitted: 'Submitted', under_review: 'Under Review',
  disputed: 'Disputed', completed: 'Completed', cancelled: 'Cancelled', archived: 'Archived',
};
const CN_STATUS_COLORS = {
  draft: '#7a8fad', published: '#2196f3', awaiting_fund: '#ff7043', funded: '#3dd44a',
  submitted: '#2196f3', under_review: '#2196f3', disputed: '#e53935', completed: '#3dd44a',
  cancelled: '#e53935', archived: '#7a8fad',
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
    .cn-hero{position:relative;overflow:hidden;border-radius:20px;padding:26px 26px 22px;margin-bottom:16px;background:linear-gradient(135deg,#0f1f2e 0%,#13253a 55%,#0d1a26 100%);border:1px solid var(--border);}
    .cn-hero::after{content:'';position:absolute;top:-70px;right:-70px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,var(--cn-accent) 0%,transparent 70%);opacity:.14;pointer-events:none;transition:background .25s;}
    .cn-hero-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--cn-accent);margin-bottom:10px;position:relative;}
    .cn-hero-title{font-size:21px;font-weight:900;color:var(--white);margin-bottom:8px;letter-spacing:-.4px;line-height:1.25;max-width:540px;position:relative;}
    .cn-hero-sub{font-size:12.5px;color:#a9bccd;line-height:1.6;max-width:560px;margin-bottom:16px;position:relative;}
    .cn-hero-badges{display:flex;gap:8px;flex-wrap:wrap;position:relative;}
    .cn-hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.045);border:1px solid var(--border);border-radius:20px;padding:6px 12px;font-size:10.5px;font-weight:700;color:#c3d3e0;}

    /* ── Role toggle (segmented control) ─────────────────────────────────*/
    .cn-role-toggle{display:flex;gap:4px;margin:16px 0 16px;background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:4px;}
    .cn-role-btn{flex:1;padding:12px;border-radius:10px;background:transparent;border:none;color:var(--muted);font-family:'Montserrat',sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;transition:all .18s;text-align:center;}
    .cn-role-btn:hover:not(.active){color:var(--white);}
    .cn-role-btn.active[data-role="creator"]{background:linear-gradient(135deg,#2196f3,#1670c2);color:#fff;box-shadow:0 4px 14px rgba(33,150,243,.3);}
    .cn-role-btn.active[data-role="business"]{background:linear-gradient(135deg,#ff7043,#e0562b);color:#fff;box-shadow:0 4px 14px rgba(255,112,67,.3);}

    /* ── "How it works" journey guide — short, literal step-by-step ─────*/
    .cn-guide-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
    .cn-guide-title{font-size:10.5px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted);}
    .cn-guide-toggle-btn{background:none;border:none;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 2px;}
    .cn-guide-toggle-btn:hover{color:var(--white);}
    .cn-journey{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
    .cn-journey-step{position:relative;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;}
    .cn-journey-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;margin-bottom:9px;color:#fff;background:var(--cn-accent);}
    .cn-journey-step-title{font-size:12px;font-weight:800;color:var(--white);margin-bottom:4px;line-height:1.3;}
    .cn-journey-step-desc{font-size:11px;color:var(--muted);line-height:1.5;}
    @media (max-width:900px){ .cn-journey{grid-template-columns:repeat(2,1fr);} }
    @media (max-width:520px){ .cn-journey{grid-template-columns:1fr;} }

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
    .cn-msgs{max-height:260px;overflow-y:auto;background:var(--navy);border-radius:12px;padding:12px;margin-bottom:10px;}
    .cn-msg{margin-bottom:10px;max-width:80%;}
    .cn-msg .bubble{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:8px 12px;font-size:12.5px;color:var(--white);}
    .cn-msg.mine{margin-left:auto;text-align:right;}
    .cn-msg.mine .bubble{background:var(--cn-accent-soft);border-color:var(--cn-accent);}
    .cn-msg .who{font-size:10px;color:var(--muted);margin-bottom:3px;}
    .cn-stars{display:flex;gap:6px;font-size:24px;margin-bottom:10px;}
    .cn-star{cursor:pointer;opacity:.3;transition:opacity .1s;}
    .cn-star.on{opacity:1;}

    /* ── Join / onboarding screen ─────────────────────────────────────── */
    .cn-join-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px;}
    .cn-join-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--cn-accent);margin-bottom:10px;}
    .cn-join-check{display:flex;gap:10px;align-items:flex-start;font-size:12px;color:var(--white);margin-bottom:11px;cursor:pointer;line-height:1.5;}
    .cn-join-check input{margin-top:3px;flex-shrink:0;width:15px;height:15px;cursor:pointer;accent-color:var(--cn-accent);}
    .cn-join-check a{color:var(--cn-accent);text-decoration:underline;}
    .cn-join-item{display:flex;gap:11px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--navy);margin-bottom:8px;cursor:pointer;transition:border-color .15s;border:1px solid transparent;}
    .cn-join-item:hover{border-color:var(--border);}
    .cn-join-item input{margin-top:3px;flex-shrink:0;width:16px;height:16px;cursor:pointer;accent-color:var(--cn-accent);}
    .cn-join-item span{font-size:12px;color:var(--white);line-height:1.5;}
    .cn-join-icon{font-size:14px;line-height:1.4;margin-top:1px;flex-shrink:0;}
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

// ─── Page init ───────────────────────────────────────────────────────────────
async function initConnectPage() {
  _cnInjectStyles();
  const sec = document.getElementById('sec-connect');
  if (!sec) return;
  _cnRenderShell(sec);
  await _cnLoadActiveTab();
}

function _cnRenderShell(sec) {
  sec.dataset.cnRole = _cnRole;
  const hero = _cnHeroCopy(_cnRole);
  const steps = _cnJourneySteps(_cnRole);
  const collapsed = _cnGuideCollapsed();
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
    <div class="cn-role-toggle">
      <button class="cn-role-btn ${_cnRole === 'creator' ? 'active' : ''}" data-role="creator" onclick="_cnSetRole('creator')">🎬 I'm a Creator</button>
      <button class="cn-role-btn ${_cnRole === 'business' ? 'active' : ''}" data-role="business" onclick="_cnSetRole('business')">🏢 I'm a Business</button>
    </div>
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
            <input type="checkbox" class="cn-join-check-box cn-join-role-check" data-key="${c.key}" onchange="_cnUpdateJoinBtn()">
            <span class="cn-join-icon">${iconFor(c.key)}</span>
            <span>${esc(c.text)}</span>
          </label>
        `).join('')}
      </div>

      <label class="cn-join-check" style="margin-top:6px;">
        <input type="checkbox" class="cn-join-check-box" id="cnJoinTos" onchange="_cnUpdateJoinBtn()">
        <span>I have read and agree to the <a href="#" onclick="return _cnOpenTos()">EndaViral Connect Marketplace Terms of Service</a>, and confirm I am at least 18 years old or have legal authority to enter into this agreement.</span>
      </label>

      <button class="btn-primary" id="cnJoinBtn" style="margin-top:6px;" onclick="_cnSubmitJoin('${role}')" disabled>Accept & Join the Marketplace</button>
    </div>
  `;
}

// Enables the Join button only once every ToS + role-specific checkbox on
// the join screen is ticked.
function _cnUpdateJoinBtn() {
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
    _cnSetTab('profile');
  } catch (e) {
    toast(e.message || 'Could not join', 'error');
    btn.disabled = false; btn.textContent = 'Accept & Join the Marketplace';
  }
}

function _cnRenderIncompleteProfileScreen(target, role) {
  const isCreator = role === 'creator';
  target.innerHTML = `
    <div class="cn-empty">
      <span class="cn-empty-icon">${isCreator ? '💳' : '🏢'}</span>
      <div class="cn-empty-title">${isCreator ? 'Almost there — add your payment details' : 'Finish setting up your business profile'}</div>
      ${isCreator
        ? "Add your email and M-Pesa number to your Creator profile — that's how EndaViral pays you — before browsing campaigns."
        : "Add your company name before posting a campaign or inviting creators."}
      <br><button class="btn-secondary" style="margin-top:14px;" onclick="_cnSetTab('profile')">Go to My Profile →</button>
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
  const plat = _cnPlatformDef(c.platform);
  return `
  <div class="cn-card" onclick="_cnOpenCampaign('${c.id}')">
    <div class="cn-card-top">
      <div class="cn-card-title">${plat.emoji} ${esc(c.title)}</div>
      <div class="cn-card-budget">${fmtKES(c.budget_kes)}</div>
    </div>
    <div class="cn-card-desc">${esc(c.description)}</div>
    <div class="cn-card-meta">
      <span class="cn-tag">${plat.emoji} ${esc(plat.label)}</span>
      ${c.min_followers ? `<span class="cn-tag">${c.min_followers.toLocaleString()}+ followers</span>` : ''}
      ${c.required_niche ? `<span class="cn-tag">${esc(c.required_niche)}</span>` : ''}
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
      <select id="cnNewPlatform">
        ${CONNECT_PLATFORMS.map(p => `<option value="${p.key}">${p.emoji} ${p.label}</option>`).join('')}
      </select>
    </div>
    <div class="cn-field">
      <label>Budget (KES) — this funds the campaign once a creator is accepted</label>
      <input type="number" id="cnNewBudget" min="1" placeholder="e.g. 3000">
    </div>
    <div class="cn-field">
      <label>Deliverables</label>
      <input type="text" id="cnNewDeliverables" placeholder="e.g. 1 Reel, 2 TikToks">
    </div>
    <div class="cn-field">
      <label>Minimum Followers (optional)</label>
      <input type="number" id="cnNewMinFollowers" min="0" placeholder="e.g. 5000">
    </div>
    <div class="cn-field">
      <label>Required Niche (optional)</label>
      <input type="text" id="cnNewNiche" placeholder="e.g. fashion, comedy, tech">
    </div>
    <div class="cn-field">
      <label>Content Guidelines (optional)</label>
      <textarea id="cnNewGuidelines" placeholder="Tone, must-mention points, hashtags, etc."></textarea>
    </div>
    <button class="btn-primary" id="cnNewSubmitBtn" onclick="_cnSubmitCreateCampaign()">Create Campaign (Draft)</button>
  `;
}

async function _cnSubmitCreateCampaign() {
  const title = document.getElementById('cnNewTitle').value.trim();
  const description = document.getElementById('cnNewDesc').value.trim();
  const platform = document.getElementById('cnNewPlatform').value;
  const budget_kes = parseFloat(document.getElementById('cnNewBudget').value);
  const deliverables = document.getElementById('cnNewDeliverables').value.trim();
  const min_followers = parseInt(document.getElementById('cnNewMinFollowers').value) || 0;
  const required_niche = document.getElementById('cnNewNiche').value.trim() || null;
  const content_guidelines = document.getElementById('cnNewGuidelines').value.trim() || null;

  if (!title || title.length < 3) { toast('Give your campaign a title', 'error'); return; }
  if (!description || description.length < 10) { toast('Add a bit more description', 'error'); return; }
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

  target.innerHTML = `
    ${profile?.joined_at ? `<div class="cn-hero-badge" style="display:inline-flex;margin-bottom:14px;">✅ Joined EndaViral Connect on ${new Date(profile.joined_at).toLocaleDateString()}</div>` : ''}
    <div class="cn-field"><label>Display Name</label><input type="text" id="cnCpName" value="${esc(profile?.display_name || '')}"></div>
    <div class="cn-field"><label>Profile Photo URL</label><input type="text" id="cnCpAvatar" value="${esc(profile?.avatar_url || '')}" placeholder="https://..."></div>
    <div class="cn-field"><label>Bio</label><textarea id="cnCpBio">${esc(profile?.bio || '')}</textarea></div>
    <div class="cn-field"><label>Location</label><input type="text" id="cnCpLocation" value="${esc(profile?.location || '')}" placeholder="e.g. Nairobi, Kenya"></div>
    <div class="cn-field"><label>Niches (comma-separated)</label><input type="text" id="cnCpNiches" value="${esc(profile?.niches || '')}" placeholder="e.g. comedy, fashion"></div>
    <div class="cn-field"><label>Platforms (comma-separated)</label><input type="text" id="cnCpPlatforms" value="${esc(profile?.platforms || '')}" placeholder="e.g. tiktok, instagram"></div>
    <div class="cn-field"><label>Follower Count</label><input type="number" id="cnCpFollowers" value="${profile?.followers_count || 0}" min="0"></div>
    <div class="cn-section-lbl">Payment Details</div>
    <div class="cn-tip">🔒 Required before you can apply to campaigns. Your phone number is only ever visible to EndaViral — businesses never see it — and it's what your payout tickets pay out to.</div>
    <div class="cn-field"><label>Email</label><input type="email" id="cnCpEmail" value="${esc(profile?.email || '')}" placeholder="you@example.com"></div>
    <div class="cn-field"><label>M-Pesa Phone Number</label><input type="text" id="cnCpPhone" value="${esc(profile?.phone || '')}" placeholder="07XXXXXXXX"></div>
    <div class="cn-section-lbl">Pricing (KES, optional)</div>
    <div class="cn-field"><label>Short Video</label><input type="number" id="cnCpPriceVideo" value="${profile?.prices_kes?.short_video || ''}" min="0"></div>
    <div class="cn-field"><label>Instagram Reel</label><input type="number" id="cnCpPriceReel" value="${profile?.prices_kes?.ig_reel || ''}" min="0"></div>
    <div class="cn-field"><label>TikTok</label><input type="number" id="cnCpPriceTiktok" value="${profile?.prices_kes?.tiktok || ''}" min="0"></div>
    <button class="btn-primary" id="cnCpSaveBtn" onclick="_cnSaveCreatorProfile()">Save Profile</button>
    ${profile ? `
    <div style="margin-top:16px;display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:var(--muted);">
      ${profile.is_verified ? `<span style="color:#3dd44a;">✓ Verified</span>` : ''}
      ${profile.is_suspended ? `<span style="color:#e53935;">⛔ Suspended${profile.suspend_reason ? ': ' + esc(profile.suspend_reason) : ''}</span>` : ''}
      <span>⭐ ${profile.rating_avg || 0} (${profile.rating_count || 0})</span>
      <span>✅ ${profile.jobs_completed || 0} jobs completed</span>
      <span>📈 ${profile.success_rate_pct || 0}% success rate</span>
      ${profile.response_time_hours != null ? `<span>⏱ ~${profile.response_time_hours}h response time</span>` : ''}
    </div>
    ${profile.academy ? `<div style="margin-top:10px;font-size:12px;color:var(--muted);">🎓 Creator Academy: ${profile.academy.modules_completed || 0} modules completed</div>` : ''}
    ${profile.portfolio && profile.portfolio.length ? `
    <div class="cn-section-lbl">Portfolio — Past Campaigns</div>
    ${profile.portfolio.map(pf => `
      <div class="cn-row"><span class="k">${esc(pf.title)} · ${esc(pf.business_name)}</span><span class="v" style="font-weight:400;">${pf.completed_at ? new Date(pf.completed_at).toLocaleDateString() : ''}</span></div>
    `).join('')}` : ''}
    ` : ''}
  `;
}

async function _cnSaveCreatorProfile() {
  const btn = document.getElementById('cnCpSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const payload = {
    display_name: document.getElementById('cnCpName').value.trim() || null,
    avatar_url: document.getElementById('cnCpAvatar').value.trim() || null,
    bio: document.getElementById('cnCpBio').value.trim() || null,
    location: document.getElementById('cnCpLocation').value.trim() || null,
    niches: document.getElementById('cnCpNiches').value.trim() || null,
    platforms: document.getElementById('cnCpPlatforms').value.trim() || null,
    followers_count: parseInt(document.getElementById('cnCpFollowers').value) || 0,
    email: document.getElementById('cnCpEmail').value.trim() || null,
    phone: document.getElementById('cnCpPhone').value.trim() || null,
    price_short_video_kes: parseFloat(document.getElementById('cnCpPriceVideo').value) || null,
    price_ig_reel_kes: parseFloat(document.getElementById('cnCpPriceReel').value) || null,
    price_tiktok_kes: parseFloat(document.getElementById('cnCpPriceTiktok').value) || null,
  };
  try {
    await api('/connect/profile/creator', { method: 'POST', body: JSON.stringify(payload) });
    toast('Profile saved!', 'success');
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
    <div class="cn-field"><label>Company Name</label><input type="text" id="cnBpName" value="${esc(profile?.company_name || '')}"></div>
    <div class="cn-field"><label>Industry</label><input type="text" id="cnBpIndustry" value="${esc(profile?.industry || '')}" placeholder="e.g. E-commerce, Restaurant, Fintech"></div>
    <div class="cn-field"><label>Website</label><input type="text" id="cnBpWebsite" value="${esc(profile?.website || '')}" placeholder="https://..."></div>
    <button class="btn-primary" id="cnBpSaveBtn" onclick="_cnSaveBusinessProfile()">Save Profile</button>
    ${profile ? `<div style="margin-top:16px;display:flex;gap:20px;font-size:12px;color:var(--muted);">
      <span>⭐ ${profile.rating_avg || 0} (${profile.rating_count || 0})</span>
      <span>📋 ${profile.campaigns_posted || 0} posted</span>
      <span>✅ ${profile.campaigns_completed || 0} completed</span>
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

  // Business viewing their own published campaign also needs applications
  const isBusinessOwner = currentUser && currentUser.id === campaign.business_user_id;
  if (isBusinessOwner && campaign.status === 'published') {
    try { _cnCurrentApplications = await api(`/connect/campaigns/${campaignId}/applications`); }
    catch (_) { _cnCurrentApplications = []; }
  } else {
    _cnCurrentApplications = [];
  }

  _cnRenderCampaignModal();
}

function _cnCloseCampaign() {
  document.getElementById('cnCampaignModal').classList.remove('show');
  if (_cnFundPollTimer) { clearInterval(_cnFundPollTimer); _cnFundPollTimer = null; }
}

function _cnRenderCampaignModal() {
  const c = _cnCurrentCampaign;
  const body = document.getElementById('cnCampaignModalBody');
  const plat = _cnPlatformDef(c.platform);
  const isBusinessOwner = currentUser && currentUser.id === c.business_user_id;
  const isAssignedCreator = currentUser && currentUser.id === c.creator_user_id;

  let html = `
    <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#2196f3;margin-bottom:6px;">${plat.emoji} ${esc(plat.label).toUpperCase()}</div>
    <div class="modal-title" style="margin-bottom:4px;">${esc(c.title)}</div>
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">${_cnStatusPill(c.status)}${c.is_frozen ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e5393520;color:#ff8a80;border:1px solid #e5393540;">🧊 Frozen by admin</span>` : ''}</div>
    ${c.is_frozen ? `<div style="font-size:12px;color:#ff8a80;background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);border-radius:10px;padding:10px 12px;margin-bottom:14px;">This campaign is frozen${c.frozen_reason ? ': ' + esc(c.frozen_reason) : ''}. No actions can be taken until an admin unfreezes it.</div>` : ''}
    <div style="font-size:13px;color:var(--white);line-height:1.6;margin-bottom:14px;">${esc(c.description)}</div>
    <div class="cn-row"><span class="k">Budget</span><span class="v" style="color:var(--green);">${fmtKES(c.budget_kes)}</span></div>
    <div class="cn-row"><span class="k">Deliverables</span><span class="v">${esc(c.deliverables)}</span></div>
    ${c.min_followers ? `<div class="cn-row"><span class="k">Min. Followers</span><span class="v">${c.min_followers.toLocaleString()}</span></div>` : ''}
    ${c.required_niche ? `<div class="cn-row"><span class="k">Niche</span><span class="v">${esc(c.required_niche)}</span></div>` : ''}
    ${c.content_guidelines ? `<div class="cn-row"><span class="k">Guidelines</span><span class="v">${esc(c.content_guidelines)}</span></div>` : ''}
    ${c.escrow_kes > 0 ? `<div class="cn-row"><span class="k">Payments Held</span><span class="v" style="color:var(--green);">${fmtKES(c.escrow_kes)}</span></div>` : ''}
  `;

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
    html += `<div class="cn-section-lbl">Applications (${_cnCurrentApplications.length})</div>`;
    if (!_cnCurrentApplications.length) {
      html += `<div style="font-size:12px;color:var(--muted);">No applications yet — check back soon.</div>`;
    } else {
      html += _cnCurrentApplications.map(a => `
        <div class="cn-app-row">
          <div class="cn-app-top"><span class="cn-app-bid">${fmtKES(a.bid_amount_kes)}</span>${_cnStatusPill(a.status)}</div>
          <div style="font-size:11.5px;color:var(--muted);">Delivery in ${a.delivery_days} day${a.delivery_days == 1 ? '' : 's'}</div>
          ${a.proposal ? `<div style="font-size:12px;color:var(--white);margin-top:6px;">${esc(a.proposal)}</div>` : ''}
          ${a.status === 'pending' ? `
          <div class="cn-app-actions">
            <button class="cn-btn-sm cn-btn-accept" onclick="_cnAcceptApplication('${c.id}','${a.id}')">Accept</button>
            <button class="cn-btn-sm cn-btn-reject" onclick="_cnRejectApplication('${c.id}','${a.id}')">Reject</button>
          </div>` : ''}
        </div>
      `).join('');
    }
    html += `<button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="_cnOpenInviteModal(null,null,'${c.id}')">✉️ Invite a Creator Directly</button>`;
  }

  // Pay Now — lives in the chat panel below, right where the business
  // and creator agreed the work would happen.
  if (isBusinessOwner && c.status === 'awaiting_fund') {
    actionHtml += _cnFundFormHtml();
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
    html += `<div class="cn-section-lbl">Messages</div>`;
    if (isBusinessOwner && !c.creator_user_id) {
      // No creator assigned yet — the business may be hearing from several
      // interested creators, so show a thread picker first.
      html += `<div id="cnMsgThreads"><div style="color:var(--muted);font-size:12px;">Loading conversations…</div></div>`;
      html += `<div class="cn-msgs" id="cnMsgList" style="display:none;"></div>
        <div id="cnMsgActionCard"></div>
        <div id="cnMsgInputRow" style="display:none;gap:8px;">
          <input type="text" id="cnMsgInput" placeholder="Type a message…" style="flex:1;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;" onkeydown="if(event.key==='Enter')_cnSendMessage('${c.id}')">
          <button class="btn-secondary" onclick="_cnSendMessage('${c.id}')">Send</button>
        </div>`;
    } else {
      _cnMsgThreadCreatorId = isBusinessOwner ? c.creator_user_id : currentUser.id;
      html += `
        <div class="cn-msgs" id="cnMsgList"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>
        <div id="cnMsgActionCard">${actionHtml}</div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="cnMsgInput" placeholder="Type a message…" style="flex:1;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;" onkeydown="if(event.key==='Enter')_cnSendMessage('${c.id}')">
          <button class="btn-secondary" onclick="_cnSendMessage('${c.id}')">Send</button>
        </div>
      `;
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
    _cnLoadMessages(c.id, _cnMsgThreadCreatorId);
  }
  if (isBusinessOwner && c.status === 'submitted') _cnLoadDeliverableForReview(c.id);
  if (isAssignedCreator && c.status === 'completed') _cnLoadPayoutArea(c);
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

// ─── Fund escrow (business, STK push) ─────────────────────────────────────────
function _cnFundFormHtml() {
  const phone = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) ? currentUser.phone : '';
  return `
    <div class="cn-section-lbl">Fund Campaign to Start</div>
    <div id="cnFundForm">
      <div class="cn-field"><label>M-Pesa Phone Number</label><input type="text" id="cnFundPhone" value="${esc(phone)}" placeholder="07XXXXXXXX"></div>
      <button class="btn-primary" id="cnFundBtn" onclick="_cnSubmitFund('${_cnCurrentCampaign.id}')">📱 Send STK Push</button>
    </div>
    <div id="cnFundStatus" style="display:none;text-align:center;padding:20px 0;">
      <div style="font-size:32px;margin-bottom:8px;" id="cnFundIcon">📱</div>
      <div style="font-weight:800;color:var(--white);margin-bottom:4px;" id="cnFundTitle">WAITING FOR PAYMENT</div>
      <div style="font-size:12px;color:var(--muted);" id="cnFundDesc">Enter your M-Pesa PIN to fund the campaign.</div>
    </div>
  `;
}

async function _cnSubmitFund(campaignId) {
  const phone = document.getElementById('cnFundPhone').value.trim();
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }

  const btn = document.getElementById('cnFundBtn');
  btn.disabled = true; btn.textContent = 'Sending…';

  let data;
  try {
    data = await api(`/connect/campaigns/${campaignId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
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
      if (desc) desc.textContent = 'The creator can now start work.';
      toast('🎉 Campaign funded!', 'success');
      setTimeout(() => _cnOpenCampaign(campaignId), 1200);
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

// ─── Submit deliverable (creator) ─────────────────────────────────────────────
function _cnDeliverableFormHtml() {
  const n = (_cnCurrentCampaign && _cnCurrentCampaign.required_deliverable_count) || 1;
  const rows = Array.from({ length: n }, (_, i) => i + 1).map(i => `
    <div class="cn-field" style="border-left:2px solid var(--border);padding-left:10px;margin-bottom:10px;">
      <label>Video ${i} of ${n} — Link</label>
      <input type="text" id="cnDelivUrl${i}" placeholder="https://...">
      <label style="margin-top:6px;">Platform</label>
      <select id="cnDelivPlatform${i}" style="background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--white);width:100%;">
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
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--white);margin:10px 0;cursor:pointer;">
      <input type="checkbox" id="cnDelivConfirm" style="margin-top:2px;">
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
  el.innerHTML = `
    <div class="cn-field" style="margin-top:12px;"><label>What happened?</label><textarea id="cnDisputeReason" placeholder="Explain the issue — our team will review and resolve it."></textarea></div>
    <button class="btn-secondary" style="width:100%;background:rgba(229,57,53,.14);border-color:rgba(229,57,53,.3);color:#ff8a80;" onclick="_cnSubmitDispute('${_cnCurrentCampaign.id}')">Submit Dispute</button>
  `;
}

async function _cnSubmitDispute(campaignId) {
  const reason = document.getElementById('cnDisputeReason').value.trim();
  if (!reason || reason.length < 10) { toast('Explain what happened in a bit more detail', 'error'); return; }
  try {
    await api(`/connect/campaigns/${campaignId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) });
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
  wrap.innerHTML = threads.map(t => `
    <div class="cn-thread-row" onclick="_cnOpenMsgThread('${campaignId}','${t.creator_user_id}')" style="cursor:pointer;padding:9px 12px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:12.5px;color:var(--white);font-weight:700;">${esc(t.display_name || 'Creator')}</div>
        <div style="font-size:11px;color:var(--muted);">${esc(t.last_message || '')}</div>
      </div>
      ${t.unread_count ? `<span style="background:#2196f3;color:#fff;border-radius:20px;padding:2px 8px;font-size:10.5px;font-weight:700;">${t.unread_count}</span>` : ''}
    </div>
  `).join('');
}

function _cnOpenMsgThread(campaignId, creatorUserId) {
  _cnMsgThreadCreatorId = creatorUserId;
  const threadsEl = document.getElementById('cnMsgThreads');
  const listEl = document.getElementById('cnMsgList');
  const inputRow = document.getElementById('cnMsgInputRow');
  if (threadsEl) threadsEl.style.display = 'none';
  if (listEl) listEl.style.display = 'block';
  if (inputRow) inputRow.style.display = 'flex';
  _cnLoadMessages(campaignId, creatorUserId);
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
  list.innerHTML = messages.map(m => {
    if (m.is_system) {
      // Shared timeline entry — funded / submitted / approved / payout /
      // outreach events both parties see, rendered centered and distinct
      // from a normal chat bubble so it reads as "what happened" rather
      // than "what someone said".
      return `<div class="cn-msg-system" style="text-align:center;margin:10px 0;">
        <div style="display:inline-block;background:rgba(33,150,243,.1);border:1px solid rgba(33,150,243,.25);border-radius:10px;padding:8px 14px;font-size:11.5px;color:var(--white);max-width:90%;">${esc(m.body)}</div>
      </div>`;
    }
    const mine = currentUser && m.sender_user_id === currentUser.id;
    return `<div class="cn-msg ${mine ? 'mine' : ''}">
      ${!mine ? `<div class="who">${m.sender_user_id === _cnCurrentCampaign.business_user_id ? 'Business' : 'Creator'}</div>` : ''}
      <div class="bubble">${esc(m.body)}</div>
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
    target.innerHTML = `<div class="cn-empty">No invites yet — businesses can invite you directly once you have a creator profile.</div>`;
    return;
  }
  target.innerHTML = invites.map(i => {
    const c = i.campaign || {};
    const plat = _cnPlatformDef(c.platform);
    return `
    <div class="cn-app-row">
      <div class="cn-app-top">
        <span style="font-size:13px;font-weight:800;color:var(--white);">${esc(c.title || 'Campaign')}</span>
        ${_cnStatusPillGeneric(i.status)}
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;">
        ${plat.emoji} ${esc(plat.label)} · ${c.budget_kes != null ? fmtKES(c.budget_kes) : ''} ·
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
      <input type="text" id="cnFcNiche" placeholder="Niche (e.g. fashion)" class="cn-fc-input" value="${esc(_cnCreatorFilters.niche)}">
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
    <div class="cn-section-lbl">Marketplace Stats</div>
    <div id="cnAdminStats" class="cn-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-bottom:6px;"><div class="cn-empty">Loading…</div></div>

    <div class="cn-section-lbl">Payout Requests</div>
    <div style="display:flex;gap:6px;margin-bottom:10px;">
      ${['pending', 'paid', 'rejected', 'all'].map(s => `<button class="cn-tab ${s === 'pending' ? 'active' : ''}" id="cnPayoutFilter-${s}" onclick="_cnLoadAdminPayouts('${s}')" style="padding:6px 12px;font-size:11.5px;">${s[0].toUpperCase()}${s.slice(1)}</button>`).join('')}
    </div>
    <div id="cnAdminPayouts"><div class="cn-empty">Loading…</div></div>

    <div class="cn-section-lbl">Business Not Responding (48h Review Window)</div>
    <div id="cnAdminOverdue"><div class="cn-empty">Loading…</div></div>

    <div class="cn-section-lbl">Open Disputes</div>
    <div id="cnAdminDisputes"><div class="cn-empty">Loading…</div></div>

    <div class="cn-section-lbl">Frozen Campaigns</div>
    <div id="cnAdminFrozen"><div class="cn-empty">Loading…</div></div>
    <div class="cn-field" style="display:flex;gap:8px;align-items:flex-end;margin-top:10px;">
      <div style="flex:2;"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">Campaign ID to freeze</label>
        <input type="text" id="cnAdminFreezeId" placeholder="campaign id" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;"></div>
      <div style="flex:2;"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">Reason</label>
        <input type="text" id="cnAdminFreezeReason" placeholder="reason (optional)" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;"></div>
      <button class="btn-secondary" onclick="_cnAdminFreeze()">🧊 Freeze</button>
    </div>

    <div class="cn-section-lbl">Verify / Suspend a User</div>
    <div class="cn-field" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
      <div style="flex:2;min-width:160px;"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">User ID</label>
        <input type="text" id="cnAdminUserId" placeholder="user id" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;"></div>
      <div style="flex:1;min-width:120px;"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">Role</label>
        <select id="cnAdminUserRole" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;">
          <option value="creator">Creator</option>
          <option value="business">Business</option>
        </select></div>
      <div style="flex:2;min-width:160px;"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;">Reason (for suspend)</label>
        <input type="text" id="cnAdminSuspendReason" placeholder="reason (optional)" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="cn-btn-sm cn-btn-accept" style="flex:none;padding:9px 14px;" onclick="_cnAdminVerify(true)">✔️ Verify Creator</button>
      <button class="btn-secondary" onclick="_cnAdminVerify(false)">Unverify Creator</button>
      <button class="cn-btn-sm cn-btn-reject" style="flex:none;padding:9px 14px;" onclick="_cnAdminSuspend(true)">🚫 Suspend</button>
      <button class="btn-secondary" onclick="_cnAdminSuspend(false)">Unsuspend</button>
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
        <select id="cnOutreachChannel-${c.id}" style="background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--white);font-size:11.5px;">
          <option value="phone">Phone</option><option value="sms">SMS</option><option value="email">Email</option>
        </select>
        <select id="cnOutreachOutcome-${c.id}" style="background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--white);font-size:11.5px;">
          <option value="no_answer">No answer</option><option value="answered">Answered</option><option value="unreachable">Unreachable</option>
        </select>
        <input type="text" id="cnOutreachNote-${c.id}" placeholder="note (optional)" style="flex:1;min-width:120px;background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--white);font-size:11.5px;">
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
          <input type="text" id="cnPayoutReceipt-${t.id}" placeholder="M-Pesa receipt code (optional)" style="width:100%;margin:8px 0 6px;background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:11.5px;">
          <input type="text" id="cnPayoutNote-${t.id}" placeholder="Note (optional, e.g. reason for rejection)" style="width:100%;margin-bottom:8px;background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:11.5px;">
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
          <span style="font-size:12.5px;font-weight:800;color:var(--white);">Campaign ${esc(d.campaign_id.slice(0, 8))}…</span>
          ${_cnStatusPillGeneric(d.status)}
        </div>
        <div style="font-size:12px;color:var(--white);margin-bottom:8px;">${esc(d.reason)}</div>
        <input type="text" id="cnDisputeNote-${d.id}" placeholder="Resolution note (optional)" style="width:100%;margin-bottom:8px;background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:11.5px;">
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