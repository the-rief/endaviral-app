/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN CONNECT MARKETPLACE VISIBILITY & ANALYTICS  v1.0
 *
 * Sub-tabs: Overview | Funnel | Revenue | Leaderboard
 *
 * Depends on: api(), toast(), fmtKES(), esc()  — globals from index.html /
 * admin.js (same dependencies as admin_academy_stats.js — this file is
 * self-contained and does NOT depend on admin_academy_stats.js being
 * loaded, even though the two panels look similar on purpose).
 *
 * Backend: app/routers/connect.py
 *   GET /connect/admin/stats             — overview: campaign counts,
 *                                           money in flight, moderation
 *                                           queues, and a marketplace
 *                                           VISIBILITY snapshot (exactly
 *                                           what's discoverable right now
 *                                           on /discover and /creators)
 *   GET /connect/admin/stats/funnel      — lifecycle funnel + per-platform
 *                                           drop-off (tiktok/ig/fb/yt)
 *   GET /connect/admin/stats/revenue     — M-Pesa escrow funding rollups,
 *                                           commission earned, escrow held,
 *                                           payout-request queue health
 *   GET /connect/admin/stats/leaderboard — top creators (by earnings) &
 *                                           top businesses (by campaigns)
 *
 * Entry point: cnAdminSubTab(tab) — call from adminTab() in admin.js, e.g.:
 *   if (tab === 'connect') cnAdminSubTab('overview');
 *
 * ════════════════════════════════════════════════════════════════════
 * INTEGRATION CHECKLIST (index.html):
 *
 *  1. Admin tab bar button — paste ★TABBTN alongside the other
 *     `<div class="admin-tab" onclick="adminTab('...', this)">` buttons.
 *
 *  2. Admin panel — paste ★PANEL alongside the other
 *     `<div class="admin-panel" id="ap-...">` sections.
 *
 *  3. Script tag — add near the other admin scripts, AFTER admin.js:
 *       <script src="admin_connect_stats.js"></script>
 *
 *  4. admin.js — add this line inside adminTab(), alongside the existing
 *     `if (tab === 'academy') acAdminSubTab('overview');`:
 *       if (tab === 'connect') cnAdminSubTab('overview');
 *
 * ★TABBTN
 * <div class="admin-tab" onclick="adminTab('connect', this)">🤝 Connect</div>
 *
 * ★PANEL
 * <div class="admin-panel" id="ap-connect">
 *   <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
 *     <div>
 *       <div style="font-size:16px;font-weight:900;color:var(--white);" id="cnAdminPanelTitle">📊 CONNECT OVERVIEW</div>
 *       <div style="font-size:12px;color:var(--muted);margin-top:2px;" id="cnAdminPanelSub">Marketplace visibility, campaign lifecycle, revenue &amp; top performers</div>
 *     </div>
 *     <button class="btn-secondary" id="cnAdminRefreshBtn" style="font-size:12px;padding:8px 16px;">↻ Refresh</button>
 *   </div>
 *   <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
 *     <button id="cnSubTab-overview"    onclick="cnAdminSubTab('overview')"    style="background:none;border:none;border-bottom:2px solid var(--green);color:var(--green);font-weight:800;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Overview</button>
 *     <button id="cnSubTab-funnel"      onclick="cnAdminSubTab('funnel')"      style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Funnel</button>
 *     <button id="cnSubTab-revenue"     onclick="cnAdminSubTab('revenue')"     style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Revenue</button>
 *     <button id="cnSubTab-leaderboard" onclick="cnAdminSubTab('leaderboard')" style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Leaderboard</button>
 *   </div>
 *   <div id="cnAdminPane-overview"><div id="adminConnectOverview"></div></div>
 *   <div id="cnAdminPane-funnel" style="display:none;"><div id="adminConnectFunnel"></div></div>
 *   <div id="cnAdminPane-revenue" style="display:none;"><div id="adminConnectRevenue"></div></div>
 *   <div id="cnAdminPane-leaderboard" style="display:none;"><div id="adminConnectLeaderboard"></div></div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── Per-tab cache ─────────────────────────────────────────────────────────
let _cnAdminCurrentSubTab = 'overview';

// ─── Sub-tab switcher ───────────────────────────────────────────────────────
function cnAdminSubTab(tab) {
  _cnAdminCurrentSubTab = tab;

  ['overview', 'funnel', 'revenue', 'leaderboard'].forEach(t => {
    const el = document.getElementById('cnSubTab-' + t);
    if (!el) return;
    el.style.borderBottomColor = t === tab ? 'var(--green)' : 'transparent';
    el.style.color             = t === tab ? 'var(--green)' : 'var(--muted)';
    el.style.fontWeight        = t === tab ? '800' : '700';
  });

  ['overview', 'funnel', 'revenue', 'leaderboard'].forEach(t => {
    const p = document.getElementById('cnAdminPane-' + t);
    if (p) p.style.display = t === tab ? '' : 'none';
  });

  const titleEl    = document.getElementById('cnAdminPanelTitle');
  const subEl      = document.getElementById('cnAdminPanelSub');
  const refreshBtn = document.getElementById('cnAdminRefreshBtn');

  const meta = {
    overview:    { title: '📊 CONNECT OVERVIEW',    sub: 'Campaign counts, money in flight & marketplace visibility', fn: adminLoadConnectOverview },
    funnel:      { title: '🔻 CONNECT FUNNEL',       sub: 'Where campaigns drop off, stage by stage',                  fn: adminLoadConnectFunnel },
    revenue:     { title: '💰 CONNECT REVENUE',      sub: 'Escrow funding, commission earned & payout queue',          fn: adminLoadConnectRevenue },
    leaderboard: { title: '🏆 CONNECT LEADERBOARD',  sub: 'Top creators & top businesses',                             fn: adminLoadConnectLeaderboard },
  }[tab];

  if (titleEl) titleEl.textContent = meta.title;
  if (subEl)   subEl.textContent   = meta.sub;
  if (refreshBtn) { refreshBtn.onclick = () => meta.fn(); refreshBtn.textContent = '↻ Refresh'; }
  meta.fn();
}

// ─── Shared helpers ─────────────────────────────────────────────────────────
async function _cnSafeFetch(path, label, warnings) {
  try { return await api(path); }
  catch (e) { warnings.push(`${label}: ${e.message || 'failed'}`); return null; }
}

function _cnWarnBanner(warnings, retryFn) {
  const banner = document.createElement('div');
  banner.style.cssText = 'background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#ff6b6b;display:flex;align-items:center;gap:10px;';
  banner.innerHTML = `<span style="font-size:16px;">⚠️</span><span><strong>Could not reach backend:</strong> ${warnings.map(esc).join(' · ')}<br><span style="color:var(--muted);">Showing zeros. <button onclick="${retryFn}()" style="background:none;border:none;color:#ff9a3c;font-size:12px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;padding:0;">Retry</button></span></span>`;
  return banner;
}

function _cnStatCard(icon, label, value, sub, color) {
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
    <div style="font-size:20px;margin-bottom:6px;">${icon}</div>
    <div style="font-size:${typeof value === 'number' ? '24px' : '18px'};font-weight:900;color:${color};line-height:1.1;">
      ${typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--white);margin-top:5px;">${label}</div>
    ${sub ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">${sub}</div>` : ''}
  </div>`;
}

// Horizontal bar row used for distributions (status spread, per-platform
// breakdown) — value is rendered as a proportional bar against maxValue so
// the biggest bucket is always full-width.
function _cnBarRow(label, value, maxValue, color) {
  const pct = maxValue > 0 ? Math.max(2, Math.round((value / maxValue) * 100)) : 0;
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
      <span style="color:var(--white);font-weight:600;">${esc(label)}</span>
      <span style="color:var(--muted);font-weight:700;">${value.toLocaleString()}</span>
    </div>
    <div style="background:var(--navy);border-radius:6px;height:8px;overflow:hidden;">
      <div style="background:${color};height:100%;width:${pct}%;border-radius:6px;"></div>
    </div>
  </div>`;
}

const _CN_STATUS_LABELS = {
  draft: 'Draft', published: 'Published (visible)', awaiting_fund: 'Awaiting Fund',
  funded: 'Funded', submitted: 'Submitted', under_review: 'Under Review',
  disputed: 'Disputed', completed: 'Completed', cancelled: 'Cancelled', archived: 'Archived',
};
const _CN_STATUS_COLORS = {
  draft: '#7a8fad', published: '#3dd44a', awaiting_fund: '#ff9a3c',
  funded: '#9b6bff', submitted: '#4aa8ff', under_review: '#4aa8ff',
  disputed: '#ff6b6b', completed: '#ffd700', cancelled: '#7a8fad', archived: '#7a8fad',
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadConnectOverview() {
  const container = document.getElementById('adminConnectOverview');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading Connect stats…</span></div>`;

  const warnings = [];
  const stats = await _cnSafeFetch('/connect/admin/stats', 'Connect stats', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_cnWarnBanner(warnings, 'adminLoadConnectOverview'));
  if (!stats) return;

  const vis = stats.visibility || {};

  const cards = [
    { icon: '📣', label: 'Campaigns Total',   value: stats.total_campaigns || 0, sub: `${vis.visible_campaigns || 0} visible on /discover`, color: '#3dd44a' },
    { icon: '💰', label: 'Gross Completed',   value: fmtKES(stats.gross_completed_kes || 0), sub: `≈${fmtKES(stats.platform_fee_kes_est || 0)} commission`, color: '#ffd700' },
    { icon: '⚖️', label: 'Open Disputes',     value: stats.open_disputes || 0, sub: `${stats.frozen_campaigns || 0} frozen campaigns`, color: '#ff6b6b' },
    { icon: '✉️', label: 'Pending Invites',   value: stats.pending_invites || 0, sub: 'awaiting creator response', color: '#9b6bff' },
  ];

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:28px;">
      ${cards.map(c => _cnStatCard(c.icon, c.label, c.value, c.sub, c.color)).join('')}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">🔎 Marketplace Visibility — What's Discoverable Right Now</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;">
        ${_cnVisibilityCard('Published Campaigns', vis.visible_campaigns || 0, 'live on /discover', '#3dd44a')}
        ${_cnVisibilityCard('Visible Creators', vis.visible_creators || 0, `of ${vis.total_creator_profiles || 0} profiles (${vis.creator_visibility_pct || 0}%)`, '#4aa8ff')}
        ${_cnVisibilityCard('Verified & Visible', vis.visible_verified_creators || 0, 'verified creators live on /creators', '#ffd700')}
        ${_cnVisibilityCard('Active Businesses', vis.active_businesses || 0, `of ${vis.total_business_profiles || 0} profiles`, '#9b6bff')}
        ${_cnVisibilityCard('Stale Listings', vis.stale_published_no_applicants || 0, 'published, zero applicants yet', '#ff9a3c')}
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Campaigns by Status</div>
      ${_cnStatusDistributionHtml(stats.by_status || {})}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
      ${_cnStatCard('🚫', 'Suspended Creators', stats.suspended_creators || 0, '', '#ff6b6b')}
      ${_cnStatCard('🚫', 'Suspended Businesses', stats.suspended_businesses || 0, '', '#ff6b6b')}
      ${_cnStatCard('✅', 'Verified Creators', stats.verified_creators || 0, '', '#3dd44a')}
      ${_cnStatCard('%', 'Commission Rate', `${((stats.commission_rate || 0) * 100).toFixed(0)}%`, 'EndaViral cut on release', '#ffd700')}
    </div>
  `;
  container.appendChild(el);
}

function _cnVisibilityCard(label, value, sub, color) {
  return `<div style="background:var(--navy);border-radius:10px;padding:14px 16px;">
    <div style="font-size:22px;font-weight:900;color:${color};">${(value || 0).toLocaleString()}</div>
    <div style="font-size:12px;font-weight:700;color:var(--white);margin-top:4px;">${esc(label)}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:2px;">${esc(sub)}</div>
  </div>`;
}

function _cnStatusDistributionHtml(byStatus) {
  const entries = Object.entries(byStatus);
  if (!entries.length) return `<div style="color:var(--muted);font-size:12px;">No campaigns yet.</div>`;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([status, count]) =>
    _cnBarRow(_CN_STATUS_LABELS[status] || status, count, max, _CN_STATUS_COLORS[status] || '#3dd44a')
  ).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: FUNNEL
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadConnectFunnel() {
  const container = document.getElementById('adminConnectFunnel');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading funnel…</span></div>`;

  const warnings = [];
  const data = await _cnSafeFetch('/connect/admin/stats/funnel', 'Connect funnel', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_cnWarnBanner(warnings, 'adminLoadConnectFunnel'));
  if (!data) return;

  const stages = data.funnel || [];
  const perPlatform = data.per_platform || [];
  const first = stages[0]?.count || 1;

  const stageLabels = {
    campaign_created: '📝 Campaign Created',
    published_visible: '👀 Published (Visible)',
    matched_with_creator: '🤝 Matched with Creator',
    escrow_funded: '💳 Escrow Funded',
    work_delivered: '📦 Work Delivered',
    completed_paid_out: '✅ Completed & Paid Out',
  };

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;">Platform Funnel</div>
      ${stages.map(s => {
        const pct = first > 0 ? Math.round((s.count / first) * 100) : 0;
        return `<div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
            <span style="color:var(--white);font-weight:700;">${stageLabels[s.stage] || esc(s.stage)}</span>
            <span style="color:var(--green);font-weight:800;">${s.count.toLocaleString()} <span style="color:var(--muted);font-weight:500;">(${pct}%)</span></span>
          </div>
          <div style="background:var(--navy);border-radius:6px;height:10px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#3dd44a,#9b6bff);height:100%;width:${Math.max(2,pct)}%;border-radius:6px;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Per-Platform Performance</div>
    ${perPlatform.length
      ? `<div class="tbl-wrap"><table>
          <thead><tr><th>Platform</th><th>Campaigns</th><th>Published</th><th>Completed</th><th>Completion Rate</th></tr></thead>
          <tbody>${perPlatform.map(p => `
            <tr>
              <td><strong>${esc(p.platform)}</strong></td>
              <td>${p.campaigns}</td>
              <td>${p.published}</td>
              <td>${p.completed}</td>
              <td style="color:${p.completion_rate_pct >= 50 ? 'var(--green)' : '#ff9a3c'};font-weight:700;">${p.completion_rate_pct}%</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`
      : `<div style="color:var(--muted);font-size:12px;">No campaigns yet.</div>`}
  `;
  container.appendChild(el);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: REVENUE
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadConnectRevenue() {
  const container = document.getElementById('adminConnectRevenue');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading revenue…</span></div>`;

  const warnings = [];
  const data = await _cnSafeFetch('/connect/admin/stats/revenue?weeks=8&months=6', 'Connect revenue', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_cnWarnBanner(warnings, 'adminLoadConnectRevenue'));
  if (!data) return;

  const pq = data.payout_queue || {};
  const cards = [
    { icon: '💰', label: 'Commission Earned',   value: fmtKES(data.total_commission_kes || 0), sub: 'from completed campaigns', color: '#3dd44a' },
    { icon: '🏦', label: 'Escrow Held',         value: fmtKES(data.escrow_held_kes || 0), sub: 'in active campaigns', color: '#9b6bff' },
    { icon: '📤', label: 'Paid to Creators',    value: fmtKES(data.total_creator_paid_kes || 0), sub: 'lifetime, completed campaigns', color: '#ffd700' },
    { icon: '⏳', label: 'Pending Payouts',     value: fmtKES(pq.pending_amount_kes || 0), sub: `${pq.pending_count || 0} ticket${pq.pending_count === 1 ? '' : 's'} waiting`, color: '#ff9a3c' },
  ];

  const monthly = data.monthly || [];
  const maxMonthly = Math.max(...monthly.map(m => m.funded_kes), 1);

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:28px;">
      ${cards.map(c => _cnStatCard(c.icon, c.label, c.value, c.sub, c.color)).join('')}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Monthly Escrow Funding</div>
      ${monthly.length
        ? monthly.map(m => _cnBarRow(`${m.month}  ·  ${m.fundings} funding${m.fundings === 1 ? '' : 's'}`, m.funded_kes, maxMonthly, '#3dd44a')).join('')
        : `<div style="color:var(--muted);font-size:12px;">No escrow fundings yet.</div>`}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Payout Queue</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
        ${_cnVisibilityCard('Pending', pq.pending_count || 0, fmtKES(pq.pending_amount_kes || 0) + ' owed to creators', '#ff9a3c')}
        ${_cnVisibilityCard('Paid', pq.paid_count || 0, fmtKES(pq.paid_amount_kes || 0) + ' sent to date', '#3dd44a')}
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">Insights</div>
      ${(data.insights || []).map(i => `<div style="font-size:13px;color:var(--white);padding:6px 0;border-bottom:1px solid var(--border);">💡 ${esc(i)}</div>`).join('')}
    </div>
  `;
  container.appendChild(el);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadConnectLeaderboard() {
  const container = document.getElementById('adminConnectLeaderboard');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading leaderboard…</span></div>`;

  const warnings = [];
  const data = await _cnSafeFetch('/connect/admin/stats/leaderboard?limit=50', 'Connect leaderboard', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_cnWarnBanner(warnings, 'adminLoadConnectLeaderboard'));
  if (!data) return;

  const creators = data.top_creators || [];
  const businesses = data.top_businesses || [];
  const el = document.createElement('div');

  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Top Creators — by Earnings</div>
    ${creators.length
      ? `<div class="tbl-wrap" style="margin-bottom:28px;"><table>
          <thead><tr><th>#</th><th>Creator</th><th>Earned</th><th>Completed</th><th>Rating</th><th>Followers</th><th>Verified</th></tr></thead>
          <tbody>${creators.map((c, i) => `
            <tr>
              <td style="color:var(--muted);font-weight:700;">${i + 1}</td>
              <td><strong>${esc(c.display_name)}</strong></td>
              <td style="color:var(--green);font-weight:800;">${fmtKES(c.earned_kes)}</td>
              <td>${c.completed_campaigns}</td>
              <td>${c.rating_avg > 0 ? `⭐ ${c.rating_avg}` : '—'}</td>
              <td>${(c.followers_count || 0).toLocaleString()}</td>
              <td>${c.is_verified ? '✅' : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`
      : `<div class="empty-state" style="margin-bottom:28px;"><div class="icon">🤝</div><p>No completed campaigns yet.</p></div>`}

    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Top Businesses — by Campaigns Posted</div>
    ${businesses.length
      ? `<div class="tbl-wrap"><table>
          <thead><tr><th>#</th><th>Business</th><th>Posted</th><th>Completed</th><th>Total Budget</th><th>Rating</th></tr></thead>
          <tbody>${businesses.map((b, i) => `
            <tr>
              <td style="color:var(--muted);font-weight:700;">${i + 1}</td>
              <td><strong>${esc(b.company_name)}</strong></td>
              <td>${b.campaigns_posted}</td>
              <td>${b.campaigns_completed}</td>
              <td style="color:var(--green);font-weight:800;">${fmtKES(b.total_budget_kes)}</td>
              <td>${b.rating_avg > 0 ? `⭐ ${b.rating_avg}` : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`
      : `<div class="empty-state"><div class="icon">🏢</div><p>No businesses have posted campaigns yet.</p></div>`}
  `;
  container.appendChild(el);
}