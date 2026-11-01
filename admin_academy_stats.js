/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN CREATOR ACADEMY ANALYTICS  v1.0
 *
 * Sub-tabs: Overview | Funnel | Revenue | Leaderboard | Feedback
 *
 * Depends on: api(), toast(), fmtKES(), esc()  — globals from index.html /
 * admin.js (same dependencies as admin_affiliate_payouts.js — this file is
 * self-contained and does NOT depend on admin_affiliate_payouts.js being
 * loaded, even though the two panels look similar on purpose).
 *
 * Backend: app/routers/academy.py
 *   GET /academy/admin/stats             — overview (learners, level/streak
 *                                           spread, premium ownership)
 *   GET /academy/admin/stats/funnel      — platform funnel + per-lesson
 *                                           drop-off inside each module
 *   GET /academy/admin/stats/revenue     — M-Pesa premium-module revenue
 *                                           rollups + loyalty points economy
 *   GET /academy/admin/stats/leaderboard — top learners by XP
 *   GET /academy/admin/feedback          — learner comments left after
 *                                           finishing a module, newest
 *                                           first, filterable by module
 *                                           and star rating
 *
 * Entry point: acAdminSubTab(tab) — call from adminTab() in admin.js, e.g.:
 *   if (tab === 'academy') acAdminSubTab('overview');
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
 *       <script src="admin_academy_stats.js"></script>
 *
 *  4. admin.js — add this line inside adminTab(), alongside the existing
 *     `if (tab === 'affiliate-payouts') affAdminSubTab('payouts');`:
 *       if (tab === 'academy') acAdminSubTab('overview');
 *
 * ★TABBTN
 * <div class="admin-tab" onclick="adminTab('academy', this)">🎓 Academy</div>
 *
 * ★PANEL
 * <div class="admin-panel" id="ap-academy">
 *   <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
 *     <div>
 *       <div style="font-size:16px;font-weight:900;color:var(--white);" id="acAdminPanelTitle">📊 ACADEMY OVERVIEW</div>
 *       <div style="font-size:12px;color:var(--muted);margin-top:2px;" id="acAdminPanelSub">Learner activity, drop-off, revenue &amp; top performers</div>
 *     </div>
 *     <button class="btn-secondary" id="acAdminRefreshBtn" style="font-size:12px;padding:8px 16px;">↻ Refresh</button>
 *   </div>
 *   <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
 *     <button id="acSubTab-overview"    onclick="acAdminSubTab('overview')"    style="background:none;border:none;border-bottom:2px solid var(--green);color:var(--green);font-weight:800;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Overview</button>
 *     <button id="acSubTab-funnel"      onclick="acAdminSubTab('funnel')"      style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Funnel</button>
 *     <button id="acSubTab-revenue"     onclick="acAdminSubTab('revenue')"     style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Revenue</button>
 *     <button id="acSubTab-leaderboard" onclick="acAdminSubTab('leaderboard')" style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Leaderboard</button>
 *     <button id="acSubTab-feedback"    onclick="acAdminSubTab('feedback')"    style="background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-weight:700;font-size:13px;padding:8px 4px;cursor:pointer;font-family:'Montserrat',sans-serif;">Feedback</button>
 *   </div>
 *   <div id="acAdminPane-overview"><div id="adminAcademyOverview"></div></div>
 *   <div id="acAdminPane-funnel" style="display:none;"><div id="adminAcademyFunnel"></div></div>
 *   <div id="acAdminPane-revenue" style="display:none;"><div id="adminAcademyRevenue"></div></div>
 *   <div id="acAdminPane-leaderboard" style="display:none;"><div id="adminAcademyLeaderboard"></div></div>
 *   <div id="acAdminPane-feedback" style="display:none;"><div id="adminAcademyFeedback"></div></div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── Per-tab cache ─────────────────────────────────────────────────────────
let _acAdminCurrentSubTab = 'overview';

// ─── Sub-tab switcher ───────────────────────────────────────────────────────
function acAdminSubTab(tab) {
  _acAdminCurrentSubTab = tab;

  ['overview', 'funnel', 'revenue', 'leaderboard', 'comments', 'insights', 'feedback'].forEach(t => {
    const el = document.getElementById('acSubTab-' + t);
    if (!el) return;
    el.style.borderBottomColor = t === tab ? 'var(--green)' : 'transparent';
    el.style.color             = t === tab ? 'var(--green)' : 'var(--muted)';
    el.style.fontWeight        = t === tab ? '800' : '700';
  });

  ['overview', 'funnel', 'revenue', 'leaderboard', 'comments', 'insights', 'feedback'].forEach(t => {
    const p = document.getElementById('acAdminPane-' + t);
    if (p) p.style.display = t === tab ? '' : 'none';
  });

  const titleEl    = document.getElementById('acAdminPanelTitle');
  const subEl      = document.getElementById('acAdminPanelSub');
  const refreshBtn = document.getElementById('acAdminRefreshBtn');

  const meta = {
    overview:    { title: '📊 ACADEMY OVERVIEW',    sub: 'Learners, levels, streaks & premium ownership', fn: adminLoadAcademyOverview },
    funnel:      { title: '🔻 ACADEMY FUNNEL',       sub: 'Where learners drop off, lesson by lesson',     fn: adminLoadAcademyFunnel },
    revenue:     { title: '💰 ACADEMY REVENUE',      sub: 'Premium module sales + loyalty points economy', fn: adminLoadAcademyRevenue },
    leaderboard: { title: '🏆 ACADEMY LEADERBOARD',  sub: 'Top learners ranked by XP',                     fn: adminLoadAcademyLeaderboard },
    comments:    { title: '💬 LESSON COMMENTS',      sub: 'Questions & comments left on individual lessons — reply, hide or follow up', fn: () => adminLoadAcademyComments(true) },
    insights:    { title: '🔥 LESSON INSIGHTS',      sub: 'Which lessons land, which flop, and which free previews sell', fn: adminLoadAcademyInsights },
    feedback:    { title: '⭐ MODULE FEEDBACK',      sub: 'Ratings learners left after finishing a whole module', fn: () => adminLoadAcademyFeedback(true) },
  }[tab];

  if (titleEl) titleEl.textContent = meta.title;
  if (subEl)   subEl.textContent   = meta.sub;
  if (refreshBtn) { refreshBtn.onclick = () => meta.fn(); refreshBtn.textContent = '↻ Refresh'; }
  meta.fn();
}

// ─── Shared helpers ─────────────────────────────────────────────────────────
async function _acSafeFetch(path, label, warnings) {
  try { return await api(path); }
  catch (e) { warnings.push(`${label}: ${e.message || 'failed'}`); return null; }
}

function _acWarnBanner(warnings, retryFn) {
  const banner = document.createElement('div');
  banner.style.cssText = 'background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#ff6b6b;display:flex;align-items:center;gap:10px;';
  banner.innerHTML = `<span style="font-size:16px;">⚠️</span><span><strong>Could not reach backend:</strong> ${warnings.map(esc).join(' · ')}<br><span style="color:var(--muted);">Showing zeros. <button onclick="${retryFn}()" style="background:none;border:none;color:#ff9a3c;font-size:12px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;padding:0;">Retry</button></span></span>`;
  return banner;
}

function _acStatCard(icon, label, value, sub, color) {
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
    <div style="font-size:20px;margin-bottom:6px;">${icon}</div>
    <div style="font-size:${typeof value === 'number' ? '24px' : '18px'};font-weight:900;color:${color};line-height:1.1;">
      ${typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--white);margin-top:5px;">${label}</div>
    ${sub ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">${sub}</div>` : ''}
  </div>`;
}

// Horizontal bar row used for distributions (level spread, streak spread,
// per-module lesson completions) — value is rendered as a proportional bar
// against maxValue so the biggest bucket is always full-width.
function _acBarRow(label, value, maxValue, color) {
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

const _AC_LEVEL_COLORS = {
  'New Creator': '#7a8fad', 'Rising Creator': '#3dd44a', 'Growth Pro': '#9b6bff',
  'Growth Strategist': '#ff9a3c', 'Viral Master': '#ffd700',
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAcademyOverview() {
  const container = document.getElementById('adminAcademyOverview');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading Academy stats…</span></div>`;

  const warnings = [];
  const stats = await _acSafeFetch('/academy/admin/stats', 'Academy stats', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyOverview'));
  if (!stats) return;

  const cards = [
    { icon: '🎓', label: 'Learners Started', value: stats.learners_started || 0, sub: `of ${stats.curriculum_size?.lessons || 0} total lessons`, color: '#3dd44a' },
    { icon: '🔥', label: 'Active (7 days)',  value: stats.active_learners_7d || 0, sub: `${stats.active_learners_30d || 0} active in 30 days`, color: '#ff9a3c' },
    { icon: '🏁', label: 'Graduated',        value: stats.graduates || 0, sub: 'completed every module', color: '#ffd700' },
    { icon: '✅', label: 'Lessons Completed', value: stats.lessons_completed_total || 0, sub: 'across all learners', color: '#3dd44a' },
  ];

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:28px;">
      ${cards.map(c => _acStatCard(c.icon, c.label, c.value, c.sub, c.color)).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:28px;">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Level Distribution</div>
        ${_acLevelDistributionHtml(stats.level_distribution || {})}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Streak Distribution (days)</div>
        ${_acStreakDistributionHtml(stats.streak_distribution || {})}
      </div>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Lessons Completed by Module</div>
      ${_acModuleCompletionsHtml(stats.lesson_completions_by_module || {}, stats.badges_by_module || {})}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Premium Module Ownership</div>
      ${_acPremiumOwnershipHtml(stats.premium_ownership || {})}
    </div>
  `;
  container.appendChild(el);
}

function _acLevelDistributionHtml(dist) {
  const entries = Object.entries(dist);
  if (!entries.length) return `<div style="color:var(--muted);font-size:12px;">No learners yet.</div>`;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([name, count]) => _acBarRow(name, count, max, _AC_LEVEL_COLORS[name] || '#3dd44a')).join('');
}

function _acStreakDistributionHtml(dist) {
  const order = ['0', '1-2', '3-6', '7-13', '14+'];
  const entries = order.filter(k => k in dist).map(k => [k, dist[k]]);
  if (!entries.length) return `<div style="color:var(--muted);font-size:12px;">No streak data yet.</div>`;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([label, count]) => _acBarRow(label + ' day streak', count, max, '#9b6bff')).join('');
}

function _acModuleCompletionsHtml(byModule, badgesByModule) {
  const entries = Object.entries(byModule);
  if (!entries.length) return `<div style="color:var(--muted);font-size:12px;">No completions yet.</div>`;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([moduleId, count]) =>
    _acBarRow(`${moduleId}  ·  ${badgesByModule[moduleId] || 0} finished whole module`, count, max, '#3dd44a')
  ).join('');
}

function _acPremiumOwnershipHtml(ownership) {
  const entries = Object.entries(ownership);
  if (!entries.length) return `<div style="color:var(--muted);font-size:12px;">No premium modules configured.</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;">
    ${entries.map(([moduleId, d]) => `
      <div style="background:var(--navy);border-radius:10px;padding:14px 16px;">
        <div style="font-size:13px;font-weight:800;color:var(--white);margin-bottom:4px;">${esc(moduleId)}</div>
        <div style="font-size:22px;font-weight:900;color:var(--green);">${(d.owners || 0).toLocaleString()}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">owners · KES ${d.price_kes || 0} · ${d.conversion_pct || 0}% of learners</div>
      </div>`).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: FUNNEL
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAcademyFunnel() {
  const container = document.getElementById('adminAcademyFunnel');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading funnel…</span></div>`;

  const warnings = [];
  const data = await _acSafeFetch('/academy/admin/stats/funnel', 'Academy funnel', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyFunnel'));
  if (!data) return;

  const stages = data.funnel || [];
  const perModule = data.per_module || [];
  const first = stages[0]?.count || 1;

  const stageLabels = {
    visited_academy: '👀 Visited Academy',
    completed_a_lesson: '📖 Completed a Lesson',
    finished_a_module: '🏅 Finished a Whole Module',
    unlocked_a_premium_module: '💎 Unlocked a Premium Module',
    graduated: '🎓 Graduated',
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

    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Lesson-by-Lesson Drop-off</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      ${perModule.map(mod => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:800;color:var(--white);">${esc(mod.module_id)}${mod.premium ? ' 💎' : ''}</span>
            <span style="font-size:11px;color:var(--muted);">${mod.module_completed_count || 0} finished module</span>
          </div>
          ${mod.lessons.map(l => `
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
              <span style="color:var(--white);">${esc(l.lesson_id)}</span>
              <span style="color:var(--muted);">${l.completions.toLocaleString()}${l.drop_off_pct_vs_first_lesson > 0 ? ` <span style="color:#ff6b6b;">(-${l.drop_off_pct_vs_first_lesson}%)</span>` : ''}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>
  `;
  container.appendChild(el);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: REVENUE
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAcademyRevenue() {
  const container = document.getElementById('adminAcademyRevenue');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading revenue…</span></div>`;

  const warnings = [];
  const data = await _acSafeFetch('/academy/admin/stats/revenue?weeks=8&months=6', 'Academy revenue', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyRevenue'));
  if (!data) return;

  const pe = data.points_economy || {};
  const cards = [
    { icon: '💰', label: 'Total M-Pesa Revenue', value: fmtKES(data.total_revenue_kes || 0), sub: 'from premium module purchases', color: '#3dd44a' },
    { icon: '⭐', label: 'Points Redeemed',       value: pe.total_points_redeemed || 0, sub: `≈ ${fmtKES(pe.redemption_value_kes || 0)} equivalent`, color: '#ffd700' },
    { icon: '🎁', label: 'Outstanding Points',    value: pe.outstanding_points_balance || 0, sub: 'held by users, not yet redeemed', color: '#9b6bff' },
    { icon: '🧾', label: 'Points Redemptions',    value: pe.redemptions_count || 0, sub: 'module unlocks paid with points', color: '#ff9a3c' },
  ];

  const monthly = data.monthly || [];
  const maxMonthly = Math.max(...monthly.map(m => m.revenue_kes), 1);

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:28px;">
      ${cards.map(c => _acStatCard(c.icon, c.label, c.value, c.sub, c.color)).join('')}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Monthly Premium Revenue</div>
      ${monthly.length
        ? monthly.map(m => _acBarRow(`${m.month}  ·  ${m.purchases} purchase${m.purchases === 1 ? '' : 's'}`, m.revenue_kes, maxMonthly, '#3dd44a')).join('')
        : `<div style="color:var(--muted);font-size:12px;">No premium purchases yet.</div>`}
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Revenue by Module</div>
      ${(data.per_module || []).length
        ? `<div class="tbl-wrap"><table>
            <thead><tr><th>Module</th><th>Purchases</th><th>M-Pesa Buyers</th><th>Revenue</th><th>Conversion</th></tr></thead>
            <tbody>${data.per_module.map(m => `
              <tr>
                <td><strong>${esc(m.module_id)}</strong></td>
                <td>${m.purchases}</td>
                <td>${m.mpesa_owners}</td>
                <td style="color:var(--green);font-weight:700;">${fmtKES(m.revenue_kes)}</td>
                <td style="color:var(--muted);">${m.conversion_pct}%</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`
        : `<div style="color:var(--muted);font-size:12px;">No premium modules configured.</div>`}
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

async function adminLoadAcademyLeaderboard() {
  const container = document.getElementById('adminAcademyLeaderboard');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading leaderboard…</span></div>`;

  const warnings = [];
  const data = await _acSafeFetch('/academy/admin/stats/leaderboard?limit=50', 'Academy leaderboard', warnings);

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyLeaderboard'));
  if (!data) return;

  const rows = data.leaderboard || [];
  const el = document.createElement('div');

  if (!rows.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🎓</div><p>No learners yet.</p></div>`;
    container.appendChild(el);
    return;
  }

  el.innerHTML = `<div class="tbl-wrap"><table>
    <thead><tr>
      <th>#</th><th>Learner</th><th>Level</th><th>XP</th><th>Lessons</th>
      <th>Modules</th><th>Streak</th><th>Premium Owned</th><th>Points Balance</th>
    </tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr>
        <td style="color:var(--muted);font-weight:700;">${i + 1}</td>
        <td><strong>${esc(r.name)}</strong><br><span style="font-size:11px;color:var(--muted);">${esc(r.email)}</span></td>
        <td>${r.level.icon} ${esc(r.level.name)}</td>
        <td style="color:var(--green);font-weight:800;">${r.xp.toLocaleString()}</td>
        <td>${r.lessons_done}</td>
        <td>${r.badges_earned}</td>
        <td>${r.streak > 0 ? `🔥 ${r.streak}` : '—'}</td>
        <td>${r.premium_modules_owned > 0 ? `💎 ${r.premium_modules_owned}` : '—'}</td>
        <td style="color:var(--muted);">${r.points_balance.toLocaleString()}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
  container.appendChild(el);
}

// ─── Feedback tab: learner comments left after finishing a module ───────────
const _AC_FEEDBACK_PAGE_SIZE = 20;
let _acFeedbackModuleFilter = '';
let _acFeedbackRatingFilter = '';
let _acFeedbackItems = [];
let _acFeedbackOffset = 0;
let _acFeedbackTotal = 0;

function _acFeedbackQuery() {
  const params = new URLSearchParams();
  if (_acFeedbackModuleFilter) params.set('module_id', _acFeedbackModuleFilter);
  if (_acFeedbackRatingFilter) params.set('rating', _acFeedbackRatingFilter);
  params.set('limit', _AC_FEEDBACK_PAGE_SIZE);
  params.set('offset', _acFeedbackOffset);
  return params.toString();
}

function _acFeedbackStarsHtml(rating) {
  if (!rating) return '<span style="color:var(--muted);font-size:12px;">No rating</span>';
  return `<span style="color:#ffd700;letter-spacing:1px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>`;
}

// reset=true clears pagination and reloads from offset 0 (used on tab-open
// and whenever a filter changes); reset=false appends the next page
// ("Load more") onto what's already rendered.
async function adminLoadAcademyFeedback(reset) {
  const container = document.getElementById('adminAcademyFeedback');
  if (!container) return;

  if (reset) {
    _acFeedbackOffset = 0;
    _acFeedbackItems = [];
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading feedback…</span></div>`;
  }

  const warnings = [];
  const data = await _acSafeFetch(`/academy/admin/feedback?${_acFeedbackQuery()}`, 'Academy feedback', warnings);

  if (warnings.length) {
    container.innerHTML = '';
    container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyFeedback'));
    return;
  }
  if (!data) return;

  _acFeedbackTotal = data.total || 0;
  _acFeedbackItems = _acFeedbackItems.concat(data.items || []);
  _acFeedbackOffset += (data.items || []).length;

  const moduleOptions = (typeof ACADEMY_MODULES !== 'undefined' ? ACADEMY_MODULES : [])
    .map(m => `<option value="${esc(m.id)}" ${m.id === _acFeedbackModuleFilter ? 'selected' : ''}>${esc(m.icon || '')} ${esc(m.title)}</option>`)
    .join('');

  const filterBarHtml = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
      <select id="acFeedbackModuleFilter" onchange="_acFeedbackModuleFilter=this.value;adminLoadAcademyFeedback(true)" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:12px;font-family:'Montserrat',sans-serif;">
        <option value="">All modules</option>
        ${moduleOptions}
      </select>
      <select id="acFeedbackRatingFilter" onchange="_acFeedbackRatingFilter=this.value;adminLoadAcademyFeedback(true)" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:12px;font-family:'Montserrat',sans-serif;">
        <option value="">All ratings</option>
        ${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${String(n) === _acFeedbackRatingFilter ? 'selected' : ''}>${'★'.repeat(n)} only</option>`).join('')}
      </select>
      ${data.avg_rating != null ? `<span style="margin-left:auto;font-size:12px;color:var(--muted);">Avg rating: <strong style="color:#ffd700;">★ ${data.avg_rating}</strong></span>` : ''}
    </div>`;

  container.innerHTML = '';
  const el = document.createElement('div');

  if (!_acFeedbackItems.length) {
    el.innerHTML = filterBarHtml + `<div class="empty-state"><div class="icon">💬</div><p>No feedback yet.</p></div>`;
    container.appendChild(el);
    return;
  }

  const cardsHtml = _acFeedbackItems.map(f => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
        <div>
          <strong style="color:var(--white);font-size:13px;">${esc(f.learner)}</strong>
          <span style="color:var(--muted);font-size:12px;"> · ${esc(f.module_icon || '')} ${esc(f.module_title)}</span>
        </div>
        <div style="text-align:right;">
          ${_acFeedbackStarsHtml(f.rating)}
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${f.submitted_at ? new Date(f.submitted_at).toLocaleDateString() : ''}</div>
        </div>
      </div>
      <div style="color:var(--white);font-size:13.5px;line-height:1.55;">${esc(f.comment)}</div>
    </div>`).join('');

  const loadMoreHtml = _acFeedbackOffset < _acFeedbackTotal
    ? `<button class="btn-secondary" style="width:100%;margin-top:6px;" onclick="adminLoadAcademyFeedback(false)">Load more (${_acFeedbackTotal - _acFeedbackOffset} more)</button>`
    : '';

  el.innerHTML = filterBarHtml + cardsHtml + loadMoreHtml;
  container.appendChild(el);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: LESSON COMMENTS  (GET /academy/admin/comments …, academy_community.py)
// ══════════════════════════════════════════════════════════════════════════════
let _acCmStatus = 'unreplied';
let _acCmModule = '';
let _acCmQuery = '';
let _acCmItems = [];
let _acCmOffset = 0;
let _acCmTotal = 0;
const _AC_CM_PAGE = 40;

function _acLessonTitle(moduleId, lessonId) {
  const mods = typeof ACADEMY_MODULES !== 'undefined' ? ACADEMY_MODULES : [];
  const m = mods.find(x => x.id === moduleId);
  const l = m && m.lessons.find(x => x.id === lessonId);
  const idx = m ? m.lessons.findIndex(x => x.id === lessonId) : -1;
  return l ? `${idx + 1}. ${l.title}` : lessonId;
}

function _acCmContact(u) {
  const bits = [];
  if (u.phone) {
    const wa = String(u.phone).replace(/\D/g, '').replace(/^0/, '254');
    bits.push(`<a href="tel:${esc(u.phone)}" style="color:#7fb8ff;text-decoration:none;">📞 ${esc(u.phone)}</a>`);
    bits.push(`<a href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener" style="color:var(--green);text-decoration:none;">WhatsApp</a>`);
  }
  if (u.email) bits.push(`<a href="mailto:${esc(u.email)}" style="color:#7fb8ff;text-decoration:none;">✉ ${esc(u.email)}</a>`);
  return bits.join(' · ');
}

function _acCmCard(c) {
  const u = c.learner || {};
  return `<div id="acAdmCm-${esc(c.id)}" style="background:var(--card);border:1px solid ${c.admin_reply ? 'var(--border)' : 'rgba(255,154,60,.45)'};border-radius:12px;padding:14px 16px;margin-bottom:10px;${c.hidden ? 'opacity:.6;' : ''}">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
      <div style="min-width:0;">
        <strong style="color:var(--white);font-size:13px;">${esc(u.name || u.public_name || 'Learner')}</strong>
        ${c.premium ? '<span style="font-size:10px;font-weight:800;background:rgba(255,215,0,.15);color:#ffd700;padding:2px 6px;border-radius:6px;margin-left:6px;">PREMIUM</span>' : ''}
        ${c.hidden ? '<span style="font-size:10px;font-weight:800;background:rgba(255,69,69,.15);color:#ff6b6b;padding:2px 6px;border-radius:6px;margin-left:6px;">HIDDEN</span>' : ''}
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${esc(c.module_icon || '')} ${esc(c.module_title)} → <span style="color:var(--white);">${esc(_acLessonTitle(c.module_id, c.lesson_id))}</span></div>
        <div style="font-size:11.5px;margin-top:3px;">${_acCmContact(u)}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);white-space:nowrap;">${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
    </div>
    <div style="color:var(--white);font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;margin:8px 0;">${esc(c.comment)}</div>
    ${c.admin_reply ? `<div style="padding:9px 11px;border-radius:9px;background:rgba(61,212,74,.08);border-left:3px solid var(--green);font-size:13px;color:var(--white);white-space:pre-wrap;margin-bottom:8px;"><div style="font-size:11px;font-weight:800;color:var(--green);margin-bottom:3px;">Your reply · ${c.admin_replied_at ? new Date(c.admin_replied_at).toLocaleString() : ''} · ${c.reply_seen ? '👀 seen by learner' : 'not seen yet'}</div>${esc(c.admin_reply)}</div>` : ''}
    <textarea id="acAdmReply-${esc(c.id)}" rows="2" maxlength="1500" placeholder="${c.admin_reply ? 'Edit your reply…' : 'Write a reply — the learner sees it under their comment and gets a notice in the Academy'}" style="width:100%;box-sizing:border-box;background:var(--navy);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--white);font-size:12.5px;font-family:'Montserrat',sans-serif;resize:vertical;"></textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      <button class="btn-primary" style="font-size:12px;padding:7px 14px;" onclick="_acCmReply('${esc(c.id)}')">${c.admin_reply ? 'Update reply' : 'Reply'}</button>
      <button class="btn-secondary" style="font-size:12px;padding:7px 14px;" onclick="_acCmHide('${esc(c.id)}', ${c.hidden ? 'false' : 'true'})">${c.hidden ? 'Unhide' : 'Hide'}</button>
      <button class="btn-secondary" style="font-size:12px;padding:7px 14px;color:#ff6b6b;" onclick="_acCmDelete('${esc(c.id)}')">Delete</button>
    </div>
  </div>`;
}

async function adminLoadAcademyComments(reset) {
  const container = document.getElementById('adminAcademyComments');
  if (!container) return;
  if (reset) {
    _acCmOffset = 0; _acCmItems = [];
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading comments…</span></div>`;
  }
  const params = new URLSearchParams({ status: _acCmStatus, limit: _AC_CM_PAGE, offset: _acCmOffset });
  if (_acCmModule) params.set('module_id', _acCmModule);
  if (_acCmQuery) params.set('q', _acCmQuery);
  const warnings = [];
  const data = await _acSafeFetch(`/academy/admin/comments?${params}`, 'Lesson comments', warnings);
  if (warnings.length) { container.innerHTML = ''; container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyComments')); return; }
  if (!data) return;

  _acCmTotal = data.total || 0;
  _acCmItems = _acCmItems.concat(data.items || []);
  _acCmOffset += (data.items || []).length;
  _acCmUpdateTabCount((data.counts || {}).unreplied || 0);

  const mods = typeof ACADEMY_MODULES !== 'undefined' ? ACADEMY_MODULES : [];
  const sel = 'background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--white);font-size:12px;font-family:\'Montserrat\',sans-serif;';
  const statusBtn = (k, label) => `<button onclick="_acCmStatus='${k}';adminLoadAcademyComments(true)" style="${sel}cursor:pointer;${_acCmStatus === k ? 'border-color:var(--green);color:var(--green);font-weight:800;' : ''}">${label}</button>`;
  const bar = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
      ${statusBtn('unreplied', `⏳ Needs reply (${(data.counts || {}).unreplied || 0})`)}
      ${statusBtn('replied', '✔ Replied')}
      ${statusBtn('hidden', '🙈 Hidden')}
      ${statusBtn('all', `All (${(data.counts || {}).all || 0})`)}
      <select onchange="_acCmModule=this.value;adminLoadAcademyComments(true)" style="${sel}">
        <option value="">All modules</option>
        ${mods.map(m => `<option value="${esc(m.id)}" ${m.id === _acCmModule ? 'selected' : ''}>${esc(m.icon || '')} ${esc(m.title)}</option>`).join('')}
      </select>
      <input type="search" placeholder="Search text…" value="${esc(_acCmQuery)}" onkeydown="if(event.key==='Enter'){_acCmQuery=this.value.trim();adminLoadAcademyComments(true)}" style="${sel}min-width:150px;">
    </div>`;

  container.innerHTML = bar + (_acCmItems.length
    ? _acCmItems.map(_acCmCard).join('') + (_acCmOffset < _acCmTotal ? `<button class="btn-secondary" style="width:100%;margin-top:6px;" onclick="adminLoadAcademyComments(false)">Load more (${_acCmTotal - _acCmOffset} more)</button>` : '')
    : `<div class="empty-state"><div class="icon">💬</div><p>${_acCmStatus === 'unreplied' ? 'All caught up — no comments waiting for a reply.' : 'No comments here yet.'}</p></div>`);
}

function _acCmUpdateTabCount(n) {
  const b = document.getElementById('acSubTab-comments');
  if (!b) return;
  b.innerHTML = 'Comments' + (n ? ` <span style="background:#ff9a3c;color:#000;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:900;margin-left:3px;">${n}</span>` : '');
}

async function _acCmReply(id) {
  const ta = document.getElementById('acAdmReply-' + id);
  const reply = ta ? ta.value.trim() : '';
  if (!reply) { toast('Write a reply first', 'error'); return; }
  try {
    await api(`/academy/admin/comments/${encodeURIComponent(id)}/reply`, { method: 'POST', body: JSON.stringify({ reply }) });
    toast('Reply sent ✓', 'success');
    adminLoadAcademyComments(true);
  } catch (e) { toast(e.message || 'Could not send reply', 'error'); }
}

async function _acCmHide(id, hidden) {
  try {
    await api(`/academy/admin/comments/${encodeURIComponent(id)}/hide`, { method: 'POST', body: JSON.stringify({ hidden }) });
    adminLoadAcademyComments(true);
  } catch (e) { toast(e.message || 'Could not update', 'error'); }
}

async function _acCmDelete(id) {
  const el = document.getElementById('acAdmCm-' + id);
  if (el && !el.dataset.confirm) {
    el.dataset.confirm = '1';
    toast('Tap Delete again to permanently remove this comment', 'info');
    setTimeout(() => { if (el) delete el.dataset.confirm; }, 4000);
    return;
  }
  try {
    await api(`/academy/admin/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
    adminLoadAcademyComments(true);
  } catch (e) { toast(e.message || 'Could not delete', 'error'); }
}

// Pre-load the "needs reply" count onto the tab button when the Academy admin
// panel first opens, so new comments are visible without clicking in.
async function _acCmPrefetchCount() {
  try {
    const d = await api('/academy/admin/comments?status=unreplied&limit=1');
    _acCmUpdateTabCount((d.counts || {}).unreplied || 0);
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: LESSON INSIGHTS  (GET /academy/admin/lesson-insights)
// ══════════════════════════════════════════════════════════════════════════════
async function adminLoadAcademyInsights() {
  const container = document.getElementById('adminAcademyInsights');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading insights…</span></div>`;
  const warnings = [];
  const data = await _acSafeFetch('/academy/admin/lesson-insights', 'Lesson insights', warnings);
  if (warnings.length) { container.innerHTML = ''; container.appendChild(_acWarnBanner(warnings, 'adminLoadAcademyInsights')); return; }
  if (!data) return;

  const mods = typeof ACADEMY_MODULES !== 'undefined' ? ACADEMY_MODULES : [];
  const title = (m, l) => { const mod = mods.find(x => x.id === m); return `${mod ? mod.icon + ' ' : ''}${_acLessonTitle(m, l)}`; };
  const lessons = data.lessons || [];
  const scored = lessons.filter(r => r.up + r.down >= 1).map(r => ({ ...r, score: (r.up + 1) / (r.up + r.down + 2) }));
  const best = [...scored].sort((a, b) => b.score - a.score || b.up - a.up).slice(0, 8);
  const worst = [...scored].filter(r => r.down > 0).sort((a, b) => a.score - b.score || b.down - a.down).slice(0, 8);
  const talked = [...lessons].filter(r => r.comments > 0).sort((a, b) => b.comments - a.comments).slice(0, 8);

  const row = (r, right) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border);font-size:12.5px;"><span style="color:var(--white);min-width:0;">${esc(title(r.module_id, r.lesson_id))}</span><span style="white-space:nowrap;color:var(--muted);font-weight:700;">${right}</span></div>`;
  const card = (hd, body) => `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;"><div style="font-size:11px;font-weight:800;letter-spacing:1.2px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">${hd}</div>${body || '<div style="font-size:12px;color:var(--muted);">No data yet — votes appear as learners react to lessons.</div>'}</div>`;

  const previews = (data.previews || []).map(p => {
    const conv = p.views ? Math.round(p.bought_after_preview / p.views * 1000) / 10 : 0;
    return `<tr><td style="padding:8px 10px;color:var(--white);">${esc(p.icon)} ${esc(p.module_title)}</td><td style="padding:8px 10px;text-align:right;">${p.views}</td><td style="padding:8px 10px;text-align:right;">${p.bought_after_preview}</td><td style="padding:8px 10px;text-align:right;color:${conv >= 5 ? 'var(--green)' : 'var(--muted)'};">${conv}%</td></tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:14px;">
      ${card('🔥 Most useful lessons', best.map(r => row(r, `🔥 ${r.up} · 😐 ${r.down}`)).join(''))}
      ${card('😐 Lessons to improve', worst.map(r => row(r, `😐 ${r.down} · 🔥 ${r.up}`)).join(''))}
      ${card('💬 Most discussed', talked.map(r => row(r, `${r.comments} comments`)).join(''))}
    </div>
    ${card('🎁 Free preview → purchase', `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12.5px;color:var(--muted);"><thead><tr><th style="text-align:left;padding:8px 10px;">Premium course</th><th style="text-align:right;padding:8px 10px;">Read free lesson</th><th style="text-align:right;padding:8px 10px;">Then bought</th><th style="text-align:right;padding:8px 10px;">Conversion</th></tr></thead><tbody>${previews}</tbody></table></div>`)}
  `;
}
