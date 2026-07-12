/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN CONNECT MARKETPLACE VISIBILITY & ANALYTICS  v1.1
 *
 * Sub-tabs: Overview | Funnel | Revenue | Leaderboard | Payouts
 *
 * Depends on: api(), toast(), fmtKES(), esc()  — globals from index.html /
 * admin.js (same dependencies as admin_academy_stats.js — this file is
 * self-contained and does NOT depend on admin_academy_stats.js being
 * loaded, even though the two panels look similar on purpose).
 *
 * Backend: app/routers/connect.py
 *   GET  /connect/admin/stats             — overview: campaign counts,
 *                                            money in flight, moderation
 *                                            queues, and a marketplace
 *                                            VISIBILITY snapshot (exactly
 *                                            what's discoverable right now
 *                                            on /discover and /creators)
 *   GET  /connect/admin/stats/funnel      — lifecycle funnel + per-platform
 *                                            drop-off (tiktok/ig/fb/yt)
 *   GET  /connect/admin/stats/revenue     — M-Pesa escrow funding rollups,
 *                                            commission earned, escrow held,
 *                                            payout-request queue health
 *   GET  /connect/admin/stats/leaderboard — top creators (by earnings) &
 *                                            top businesses (by campaigns)
 *   GET  /connect/admin/payout-requests   — payout queue (approve/reject
 *                                            here is the "pay the creator"
 *                                            step, once escrow was already
 *                                            released to their wallet)
 *   POST /connect/admin/payout-requests/{id}/mark-paid
 *   POST /connect/admin/payout-requests/{id}/reject
 *   GET  /connect/campaigns/{id}/message-threads  — creators who've
 *                                            messaged a business about a
 *                                            campaign (admin can view any)
 *   GET  /connect/campaigns/{id}/messages?creator_user_id=  — the actual
 *                                            conversation for one thread
 *   POST /connect/admin/messages/{id}/hide  — moderate a single message
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
 *  3. Conversation modal — paste ★MODAL once, anywhere near the other
 *     `<div class="modal-overlay" id="...">` blocks.
 *
 *  4. Script tag — add near the other admin scripts, AFTER admin.js:
 *       <script src="admin_connect_stats.js"></script>
 *
 *  5. admin.js — add this line inside adminTab(), alongside the existing
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
 *     <button id="cnSubTab-payouts"     onclick="cnAdminSubTab('payouts')"     style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">💸 Payouts</button>
 *   </div>
 *   <div id="cnAdminPane-overview"><div id="adminConnectOverview"></div></div>
 *   <div id="cnAdminPane-funnel" style="display:none;"><div id="adminConnectFunnel"></div></div>
 *   <div id="cnAdminPane-revenue" style="display:none;"><div id="adminConnectRevenue"></div></div>
 *   <div id="cnAdminPane-leaderboard" style="display:none;"><div id="adminConnectLeaderboard"></div></div>
 *   <div id="cnAdminPane-payouts" style="display:none;"><div id="adminConnectPayouts"></div></div>
 * </div>
 *
 * ★MODAL
 * <div class="modal-overlay" id="cnConversationModal" style="display:none;" onclick="if(event.target===this)cnCloseConversation()">
 *   <div class="modal" style="max-width:560px;height:80vh;display:flex;flex-direction:column;padding:0;overflow:hidden;">
 *     <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-shrink:0;background:linear-gradient(135deg,rgba(61,212,74,.06),rgba(61,212,74,.02));">
 *       <div style="flex:1;min-width:0;">
 *         <div id="cnConvTitle" style="font-size:15px;font-weight:800;color:var(--white);"></div>
 *         <div id="cnConvMeta"  style="font-size:11px;color:var(--muted);margin-top:3px;"></div>
 *       </div>
 *       <button onclick="cnCloseConversation()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1;padding:4px;border-radius:6px;">✕</button>
 *     </div>
 *     <div id="cnConvMessages" style="flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;"></div>
 *   </div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── Per-tab cache ─────────────────────────────────────────────────────────
let _cnAdminCurrentSubTab = 'overview';

// ─── Sub-tab switcher ───────────────────────────────────────────────────────
function cnAdminSubTab(tab) {
  _cnAdminCurrentSubTab = tab;

  ['overview', 'funnel', 'revenue', 'leaderboard', 'payouts'].forEach(t => {
    const el = document.getElementById('cnSubTab-' + t);
    if (!el) return;
    el.style.borderBottomColor = t === tab ? 'var(--green)' : 'transparent';
    el.style.color             = t === tab ? 'var(--green)' : 'var(--muted)';
    el.style.fontWeight        = t === tab ? '800' : '700';
  });

  ['overview', 'funnel', 'revenue', 'leaderboard', 'payouts'].forEach(t => {
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
    payouts:     { title: '💸 CREATOR PAYOUTS',      sub: 'Approve or reject M-Pesa payout tickets, view conversations', fn: () => adminLoadConnectPayouts('pending') },
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

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: PAYOUTS — approve/reject the "pay the creator" step, and jump
// straight into the business↔creator conversation for that campaign.
// ══════════════════════════════════════════════════════════════════════════════

let _cnPayoutFilter = 'pending';

const _CN_PAYOUT_STATUS_COLORS = { pending: '#ff9a3c', paid: '#3dd44a', rejected: '#ff6b6b' };

async function adminLoadConnectPayouts(status) {
  if (status) _cnPayoutFilter = status;
  const container = document.getElementById('adminConnectPayouts');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading payout requests…</span></div>`;

  const warnings = [];
  const rows = await _cnSafeFetch(`/connect/admin/payout-requests?status=${encodeURIComponent(_cnPayoutFilter)}`, 'Connect payout requests', warnings) || [];

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_cnWarnBanner(warnings, "() => adminLoadConnectPayouts('" + _cnPayoutFilter + "')"));

  const el = document.createElement('div');

  const filters = ['pending', 'paid', 'rejected', 'all'];
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
      ${filters.map(f => `
        <button onclick="adminLoadConnectPayouts('${f}')" style="background:${f === _cnPayoutFilter ? 'var(--green)' : 'var(--navy)'};color:${f === _cnPayoutFilter ? '#000' : 'var(--muted)'};border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;text-transform:capitalize;">${f}</button>
      `).join('')}
    </div>
  `;

  if (!rows.length) {
    el.innerHTML += `<div class="empty-state"><div class="icon">💸</div><p>No ${_cnPayoutFilter === 'all' ? '' : _cnPayoutFilter} payout requests.</p></div>`;
    container.appendChild(el);
    return;
  }

  el.innerHTML += `<div class="tbl-wrap"><table>
    <thead><tr>
      <th>Creator</th><th>Campaign</th><th>Business</th><th>Amount</th><th>Phone</th>
      <th>Content</th><th>Requested</th><th>Status</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(r => `
      <tr>
        <td><strong>${esc(r.creator_name)}</strong></td>
        <td>${esc(r.campaign_title)}</td>
        <td>${esc(r.business_name)}</td>
        <td style="color:var(--green);font-weight:800;">${fmtKES(r.amount_kes)}</td>
        <td>${esc(r.phone)}</td>
        <td><a href="${esc(r.content_url)}" target="_blank" rel="noopener" style="color:#4aa8ff;">🔗 View</a></td>
        <td style="color:var(--muted);font-size:11px;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
        <td><span style="color:${_CN_PAYOUT_STATUS_COLORS[r.status] || 'var(--muted)'};font-weight:800;text-transform:capitalize;">${esc(r.status)}</span>
          ${r.mpesa_receipt ? `<br><span style="font-size:10px;color:var(--muted);">${esc(r.mpesa_receipt)}</span>` : ''}
          ${r.admin_note ? `<br><span style="font-size:10px;color:var(--muted);">${esc(r.admin_note)}</span>` : ''}
        </td>
        <td style="white-space:nowrap;">
          ${r.status === 'pending' ? `
            <button class="action-btn" onclick="cnMarkPayoutPaid('${r.id}')" title="Confirm M-Pesa sent">✅ Mark Paid</button>
            <button class="action-btn" onclick="cnRejectPayout('${r.id}')" title="e.g. bad phone number">❌ Reject</button>
          ` : ''}
          <button class="action-btn" onclick="cnViewConversation('${r.campaign_id}','${r.creator_user_id}','${esc(r.creator_name)}','${esc(r.campaign_title)}')" title="View the business ↔ creator conversation">💬 Conversation</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
  container.appendChild(el);
}

async function cnMarkPayoutPaid(payoutId) {
  const receipt = prompt('M-Pesa receipt code (e.g. QGH7XXXXX) — confirm the payment was actually sent before entering this:');
  if (receipt === null) return;
  if (!receipt.trim()) { if (typeof toast === 'function') toast('Receipt code is required', 'error'); return; }
  try {
    await api(`/connect/admin/payout-requests/${payoutId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ mpesa_receipt: receipt.trim() }),
    });
    if (typeof toast === 'function') toast('Payout marked as paid', 'success');
    adminLoadConnectPayouts(_cnPayoutFilter);
  } catch (e) {
    if (typeof toast === 'function') toast(e.message || 'Failed to mark payout paid', 'error');
  }
}

async function cnRejectPayout(payoutId) {
  const reason = prompt('Reason for rejecting this payout (e.g. bad phone number) — the creator will see this and can re-raise the ticket:');
  if (reason === null) return;
  if (!reason.trim()) { if (typeof toast === 'function') toast('A reason is required', 'error'); return; }
  try {
    await api(`/connect/admin/payout-requests/${payoutId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ admin_note: reason.trim() }),
    });
    if (typeof toast === 'function') toast('Payout rejected', 'success');
    adminLoadConnectPayouts(_cnPayoutFilter);
  } catch (e) {
    if (typeof toast === 'function') toast(e.message || 'Failed to reject payout', 'error');
  }
}

// ── Conversation viewer (business ↔ creator, for one campaign) ─────────────
let _cnConvCampaignId = null;
let _cnConvCreatorId  = null;

async function cnViewConversation(campaignId, creatorUserId, creatorName, campaignTitle) {
  _cnConvCampaignId = campaignId;
  _cnConvCreatorId  = creatorUserId;

  const modal = document.getElementById('cnConversationModal');
  const titleEl = document.getElementById('cnConvTitle');
  const metaEl  = document.getElementById('cnConvMeta');
  const msgsEl  = document.getElementById('cnConvMessages');
  if (!modal || !msgsEl) { if (typeof toast === 'function') toast('Conversation viewer not available on this page', 'error'); return; }

  if (titleEl) titleEl.textContent = `💬 ${creatorName}`;
  if (metaEl)  metaEl.textContent  = campaignTitle || '';
  msgsEl.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading conversation…</span></div>`;
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));

  await cnRefreshConversation();
}

async function cnRefreshConversation() {
  const msgsEl = document.getElementById('cnConvMessages');
  if (!msgsEl || !_cnConvCampaignId || !_cnConvCreatorId) return;

  const warnings = [];
  const messages = await _cnSafeFetch(
    `/connect/campaigns/${_cnConvCampaignId}/messages?creator_user_id=${encodeURIComponent(_cnConvCreatorId)}`,
    'Conversation', warnings,
  ) || [];

  if (warnings.length) {
    msgsEl.innerHTML = `<div style="color:#ff6b6b;font-size:12px;text-align:center;padding:20px;">Could not load conversation: ${esc(warnings[0])}</div>`;
    return;
  }
  if (!messages.length) {
    msgsEl.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px;">No messages yet in this thread.</div>`;
    return;
  }

  msgsEl.innerHTML = messages.map(m => {
    const isCreator = m.sender_user_id === _cnConvCreatorId;
    const when = m.created_at ? new Date(m.created_at).toLocaleString() : '';
    return `<div style="align-self:${isCreator ? 'flex-start' : 'flex-end'};max-width:80%;">
      <div style="font-size:10px;color:var(--muted);margin-bottom:3px;${isCreator ? '' : 'text-align:right;'}">${isCreator ? '🎨 Creator' : '🏢 Business'} · ${esc(when)}</div>
      <div style="background:${isCreator ? 'var(--navy)' : 'rgba(61,212,74,.12)'};border-radius:12px;padding:10px 14px;font-size:13px;color:var(--white);line-height:1.4;">
        ${esc(m.body || '')}
        ${m.attachment_url ? `<br><a href="${esc(m.attachment_url)}" target="_blank" rel="noopener" style="color:#4aa8ff;font-size:12px;">📎 Attachment</a>` : ''}
      </div>
      <div style="${isCreator ? '' : 'text-align:right;'}margin-top:3px;">
        <button onclick="cnHideMessage('${m.id}')" style="background:none;border:none;color:var(--muted);font-size:10px;cursor:pointer;padding:0;">🚫 Hide</button>
      </div>
    </div>`;
  }).join('');
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

async function cnHideMessage(messageId) {
  try {
    await api(`/connect/admin/messages/${messageId}/hide`, { method: 'POST' });
    if (typeof toast === 'function') toast('Message hidden', 'success');
    cnRefreshConversation();
  } catch (e) {
    if (typeof toast === 'function') toast(e.message || 'Failed to hide message', 'error');
  }
}

function cnCloseConversation() {
  const modal = document.getElementById('cnConversationModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
  _cnConvCampaignId = null;
  _cnConvCreatorId  = null;
}