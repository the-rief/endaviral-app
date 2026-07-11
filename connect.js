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
 *  6. Script tag — add near the other page scripts:
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
    .cn-hero{position:relative;overflow:hidden;border-radius:18px;padding:22px 22px 20px;margin-bottom:18px;background:linear-gradient(120deg,#0f1f2e 0%,#132433 45%,#0d1a26 100%);border:1px solid rgba(33,150,243,.25);}
    .cn-hero-title{font-size:17px;font-weight:900;color:var(--white);margin-bottom:4px;}
    .cn-hero-sub{font-size:12.5px;color:#8faab8;line-height:1.5;}
    .cn-role-toggle{display:flex;gap:8px;margin:16px 0 18px;}
    .cn-role-btn{flex:1;padding:11px;border-radius:12px;background:var(--card);border:1px solid var(--border);color:var(--muted);font-family:'Montserrat',sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;transition:all .15s;text-align:center;}
    .cn-role-btn.active{background:rgba(33,150,243,.12);border-color:rgba(33,150,243,.5);color:var(--white);}
    .cn-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:10px;}
    .cn-tab{padding:8px 14px;border-radius:20px;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;}
    .cn-tab.active{background:var(--card2);border-color:rgba(33,150,243,.5);color:var(--white);}
    .cn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;}
    .cn-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;cursor:pointer;transition:transform .14s ease,border-color .14s ease;}
    .cn-card:hover{transform:translateY(-2px);border-color:rgba(33,150,243,.5);}
    .cn-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px;}
    .cn-card-title{font-size:14px;font-weight:800;color:var(--white);line-height:1.35;}
    .cn-card-budget{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:800;color:var(--green);white-space:nowrap;}
    .cn-card-desc{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .cn-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted);}
    .cn-tag{background:var(--navy);border:1px solid var(--border);border-radius:20px;padding:3px 9px;font-size:10.5px;font-weight:700;}
    .cn-empty{padding:50px 20px;text-align:center;color:var(--muted);font-size:13px;}
    .cn-section-lbl{font-size:10.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:18px 0 8px;}
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
    .cn-field input,.cn-field textarea,.cn-field select{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--white);font-size:13px;font-family:inherit;}
    .cn-field textarea{resize:vertical;min-height:70px;}
    .cn-msgs{max-height:260px;overflow-y:auto;background:var(--navy);border-radius:12px;padding:12px;margin-bottom:10px;}
    .cn-msg{margin-bottom:10px;max-width:80%;}
    .cn-msg .bubble{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:8px 12px;font-size:12.5px;color:var(--white);}
    .cn-msg.mine{margin-left:auto;text-align:right;}
    .cn-msg.mine .bubble{background:rgba(33,150,243,.16);border-color:rgba(33,150,243,.35);}
    .cn-msg .who{font-size:10px;color:var(--muted);margin-bottom:3px;}
    .cn-stars{display:flex;gap:6px;font-size:24px;margin-bottom:10px;}
    .cn-star{cursor:pointer;opacity:.3;transition:opacity .1s;}
    .cn-star.on{opacity:1;}
  `;
  document.head.appendChild(style);
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
  sec.innerHTML = `
    <div class="cn-hero">
      <div class="cn-hero-title">🤝 EndaViral Marketplace</div>
      <div class="cn-hero-sub">EndaViral Marketplace connects independent creators with businesses. EndaViral charges a marketplace service fee that covers secure payments, 
      campaign management, creator discovery, messaging, and dispute resolutionBusinesses fund campaigns, 
      Endaviral keeps the funds as creator does the job, after completion Creators get paid the moment work is approved · EndaViral takes a 15% fee only when a deal completes.</div>
    </div>
    <div class="cn-role-toggle">
      <button class="cn-role-btn ${_cnRole === 'creator' ? 'active' : ''}" onclick="_cnSetRole('creator')">🎬 I'm a Creator</button>
      <button class="cn-role-btn ${_cnRole === 'business' ? 'active' : ''}" onclick="_cnSetRole('business')">🏢 I'm a Business</button>
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

// ─── Discover (creator) ──────────────────────────────────────────────────────
async function _cnRenderDiscover(target) {
  const data = await api('/connect/discover');
  _cnCampaigns = data || [];
  if (!_cnCampaigns.length) {
    target.innerHTML = `<div class="cn-empty">No open campaigns right now — check back soon!</div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${_cnCampaigns.map(_cnCardHtml).join('')}</div>`;
}

function _cnCardHtml(c) {
  const plat = _cnPlatformDef(c.platform);
  return `
  <div class="cn-card" onclick="_cnOpenCampaign('${c.id}')">
    <div class="cn-card-top">
      <div class="cn-card-title">${esc(c.title)}</div>
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
    target.innerHTML = `<div class="cn-empty">You haven't applied to any campaigns yet.<br><button class="btn-secondary" style="margin-top:12px;" onclick="_cnSetTab('discover')">Browse campaigns →</button></div>`;
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
    target.innerHTML = `<div class="cn-empty">Once a business accepts one of your applications, it'll show up here.</div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${active.map(_cnCardHtml).join('')}</div>`;
}

// ─── My Campaigns (business) ─────────────────────────────────────────────────
async function _cnRenderMyCampaigns(target) {
  const campaigns = await api('/connect/campaigns/mine?role=business');
  if (!campaigns.length) {
    target.innerHTML = `<div class="cn-empty">You haven't posted a campaign yet.<br><button class="btn-secondary" style="margin-top:12px;" onclick="_cnSetTab('create')">Post your first campaign →</button></div>`;
    return;
  }
  target.innerHTML = `<div class="cn-grid">${campaigns.map(_cnCardHtml).join('')}</div>`;
}

// ─── Create campaign (business) ──────────────────────────────────────────────
function _cnRenderCreateForm(target) {
  target.innerHTML = `
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
      <label>Budget (KES) — this funds escrow once a creator is accepted</label>
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
  try { profile = await api(`/connect/profile/creator/${currentUser.id}`); } catch (_) { /* not created yet */ }
  _cnCreatorProfile = profile;

  target.innerHTML = `
    <div class="cn-field"><label>Display Name</label><input type="text" id="cnCpName" value="${esc(profile?.display_name || '')}"></div>
    <div class="cn-field"><label>Profile Photo URL</label><input type="text" id="cnCpAvatar" value="${esc(profile?.avatar_url || '')}" placeholder="https://..."></div>
    <div class="cn-field"><label>Bio</label><textarea id="cnCpBio">${esc(profile?.bio || '')}</textarea></div>
    <div class="cn-field"><label>Location</label><input type="text" id="cnCpLocation" value="${esc(profile?.location || '')}" placeholder="e.g. Nairobi, Kenya"></div>
    <div class="cn-field"><label>Niches (comma-separated)</label><input type="text" id="cnCpNiches" value="${esc(profile?.niches || '')}" placeholder="e.g. comedy, fashion"></div>
    <div class="cn-field"><label>Platforms (comma-separated)</label><input type="text" id="cnCpPlatforms" value="${esc(profile?.platforms || '')}" placeholder="e.g. tiktok, instagram"></div>
    <div class="cn-field"><label>Follower Count</label><input type="number" id="cnCpFollowers" value="${profile?.followers_count || 0}" min="0"></div>
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
    ${c.escrow_kes > 0 ? `<div class="cn-row"><span class="k">Escrow Held</span><span class="v" style="color:var(--green);">${fmtKES(c.escrow_kes)}</span></div>` : ''}
  `;

  // ── Role/status-specific action area ──────────────────────────────────
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
    html += `<button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="_cnOpenInviteModal(null,'${c.id}')">✉️ Invite a Creator Directly</button>`;
  }

  if (isBusinessOwner && c.status === 'awaiting_fund') {
    html += _cnFundFormHtml();
  }

  if (isAssignedCreator && c.status === 'funded') {
    html += _cnDeliverableFormHtml();
  }

  if (isBusinessOwner && c.status === 'submitted') {
    html += `<div class="cn-section-lbl">Review Submission</div><div id="cnDeliverableReview">Loading…</div>`;
    _cnLoadDeliverableForReview(c.id);
  }

  if ((isBusinessOwner || isAssignedCreator) && ['funded', 'submitted', 'under_review'].includes(c.status)) {
    html += `<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="_cnOpenDisputeForm()">⚠️ Open a Dispute</button><div id="cnDisputeForm"></div>`;
  }

  if ((isBusinessOwner || isAssignedCreator) && c.status === 'completed') {
    html += `<div id="cnReviewArea">${_cnReviewFormHtml()}</div>`;
  }

  if (isBusinessOwner && ['completed', 'cancelled'].includes(c.status)) {
    html += `<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="_cnArchiveCampaign('${c.id}')">🗄 Archive Campaign</button>`;
  }
  } // end !c.is_frozen

  if (isBusinessOwner || isAssignedCreator) {
    html += `
      <div class="cn-section-lbl">Messages</div>
      <div class="cn-msgs" id="cnMsgList"><div style="color:var(--muted);font-size:12px;">Loading…</div></div>
      <div style="display:flex;gap:8px;">
        <input type="text" id="cnMsgInput" placeholder="Type a message…" style="flex:1;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:12.5px;" onkeydown="if(event.key==='Enter')_cnSendMessage('${c.id}')">
        <button class="btn-secondary" onclick="_cnSendMessage('${c.id}')">Send</button>
      </div>
    `;
  }

  body.innerHTML = html;

  if (isBusinessOwner || isAssignedCreator) _cnLoadMessages(c.id);
}

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
    toast('Application accepted — fund escrow next to get started!', 'success');
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
    <div class="cn-section-lbl">Fund Escrow to Start</div>
    <div id="cnFundForm">
      <div class="cn-field"><label>M-Pesa Phone Number</label><input type="text" id="cnFundPhone" value="${esc(phone)}" placeholder="07XXXXXXXX"></div>
      <button class="btn-primary" id="cnFundBtn" onclick="_cnSubmitFund('${_cnCurrentCampaign.id}')">📱 Send STK Push</button>
    </div>
    <div id="cnFundStatus" style="display:none;text-align:center;padding:20px 0;">
      <div style="font-size:32px;margin-bottom:8px;" id="cnFundIcon">📱</div>
      <div style="font-weight:800;color:var(--white);margin-bottom:4px;" id="cnFundTitle">WAITING FOR PAYMENT</div>
      <div style="font-size:12px;color:var(--muted);" id="cnFundDesc">Enter your M-Pesa PIN to fund escrow.</div>
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
      if (title) title.textContent = 'ESCROW FUNDED';
      if (desc) desc.textContent = 'The creator can now start work.';
      toast('🎉 Escrow funded!', 'success');
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
  return `
    <div class="cn-section-lbl">Submit Your Work</div>
    <div class="cn-field"><label>Content URL</label><input type="text" id="cnDelivUrl" placeholder="https://..."></div>
    <div class="cn-field"><label>Note (optional)</label><textarea id="cnDelivNote" placeholder="Anything the business should know"></textarea></div>
    <button class="btn-primary" id="cnDelivBtn" onclick="_cnSubmitDeliverable('${_cnCurrentCampaign.id}')">Submit for Review</button>
  `;
}

async function _cnSubmitDeliverable(campaignId) {
  const content_url = document.getElementById('cnDelivUrl').value.trim();
  const note = document.getElementById('cnDelivNote').value.trim() || null;
  if (!content_url) { toast('Add a link to your content', 'error'); return; }

  const btn = document.getElementById('cnDelivBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await api(`/connect/campaigns/${campaignId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify({ content_url, note }),
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
  // The API doesn't expose a "latest deliverable" endpoint directly, so we
  // reuse the campaign detail's messages/escrow context and ask the creator's
  // submission via the campaign object isn't returned — instead we prompt
  // review inline using the approve/reject endpoints, which look up the
  // right deliverable server-side by campaign+status.
  const el = document.getElementById('cnDeliverableReview');
  if (!el) return;
  el.innerHTML = `
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">The creator has submitted work for review. Check the content, then approve to release payment (85% to creator, 15% platform fee) or reject to request changes.</div>
    <div class="cn-field"><label>Review Note (optional)</label><textarea id="cnReviewNote" placeholder="Feedback for the creator"></textarea></div>
    <div style="display:flex;gap:10px;">
      <button class="btn-secondary" style="flex:1;" onclick="_cnReviewDeliverable('${campaignId}','reject')">Request Changes</button>
      <button class="btn-primary" style="flex:1;margin-top:0;" onclick="_cnReviewDeliverable('${campaignId}','approve')">✅ Approve & Pay</button>
    </div>
  `;
}

async function _cnReviewDeliverable(campaignId, decision) {
  const review_note = document.getElementById('cnReviewNote')?.value.trim() || null;
  // Fetch the campaign's pending deliverable id via the messages/applications
  // we already have isn't available — call a lightweight lookup instead.
  let deliverableId;
  try {
    const list = await api(`/connect/campaigns/${campaignId}`); // ensures campaign still submitted
    if (list.status !== 'submitted') { toast('This deliverable was already reviewed.', 'info'); _cnOpenCampaign(campaignId); return; }
    deliverableId = _cnCurrentDeliverableId;
  } catch (e) { /* fall through — deliverableId may still be cached */ }

  if (!deliverableId) {
    toast('Could not find the submission to review — refresh and try again.', 'error');
    return;
  }

  try {
    await api(`/connect/campaigns/${campaignId}/deliverables/${deliverableId}/${decision}`, {
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

// ─── Messages ──────────────────────────────────────────────────────────────────
async function _cnLoadMessages(campaignId) {
  const list = document.getElementById('cnMsgList');
  if (!list) return;
  let messages;
  try { messages = await api(`/connect/campaigns/${campaignId}/messages`); }
  catch (e) { list.innerHTML = `<div style="color:var(--muted);font-size:12px;">Could not load messages.</div>`; return; }

  if (!messages.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:12px;">No messages yet — say hello!</div>`;
    return;
  }
  list.innerHTML = messages.map(m => {
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
    await api(`/connect/campaigns/${campaignId}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
    _cnLoadMessages(campaignId);
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