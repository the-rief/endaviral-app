/* ════════════════════ ADMIN — BUSINESS HEALTH COMMAND CENTER ════════════════════
 * One screen that answers "is the business growing, flat, or dying?" by
 * consolidating the five analytics endpoints that already exist but live in
 * separate tabs:
 *   /admin/stats/snapshot            — SMM: gross profit, margin, CLV, CAC
 *   /admin/stats/revenue             — SMM: weekly/monthly + affiliate impact
 *   /connect/admin/stats             — Connect: campaigns, disputes, visibility
 *   /connect/admin/stats/revenue     — Connect: commission + fees earned
 *   /academy/admin/stats             — Academy: learners, activation
 *   /academy/admin/stats/revenue     — Academy: premium module revenue
 *   /admin/ccr/agents                — CCR: commission cost (all-time)
 *   /admin/ccr/commissions           — CCR: commission cost (this month)
 *
 * This file makes NO backend changes and NO assumptions about DB schema —
 * every number here is a re-aggregation of numbers those endpoints already
 * compute and already trust. That means it's safe to ship immediately, and
 * if any one module's endpoint is unreachable, this tab degrades gracefully
 * (shows what it has, flags what it couldn't reach) instead of breaking.
 *
 * Depends on: api(), toast(), fmtKES(), esc() — globals from index.html / admin.js
 * Entry point: adminTab('business-health', el) calls bhAdminInit()
 * ════════════════════════════════════════════════════════════════════════════ */

let _bhCache = null;

async function bhAdminInit() {
  await loadBusinessHealth();
}

async function _bhSafeFetch(path, label, warnings) {
  try { return await api(path); }
  catch (e) { warnings.push(`${label}: ${e.message || 'unreachable'}`); return null; }
}

function _bhWarnBanner(warnings) {
  if (!warnings.length) return '';
  return `<div style="background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:10px;padding:10px 16px;margin-bottom:20px;font-size:12px;color:#ff6b6b;">
    <strong>⚠️ Partial data — some modules didn't respond:</strong> ${warnings.map(esc).join(' · ')}
    <br><span style="color:var(--muted);">Numbers below only include what loaded successfully. <button onclick="loadBusinessHealth()" style="background:none;border:none;color:#ff9a3c;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;padding:0;">Retry</button></span>
  </div>`;
}

async function loadBusinessHealth() {
  const el = document.getElementById('businessHealthRoot');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Consolidating all revenue lines…</span></div>';

  const warnings = [];
  const [snapshot, smmRevenue, connectStats, connectRevenue, academyStats, academyRevenue, ccrAgents, ccrCommissions] =
    await Promise.all([
      _bhSafeFetch('/admin/stats/snapshot', 'SMM snapshot', warnings),
      _bhSafeFetch('/admin/stats/revenue?weeks=8&months=6', 'SMM revenue', warnings),
      _bhSafeFetch('/connect/admin/stats', 'Connect overview', warnings),
      _bhSafeFetch('/connect/admin/stats/revenue?weeks=8&months=6', 'Connect revenue', warnings),
      _bhSafeFetch('/academy/admin/stats', 'Academy overview', warnings),
      _bhSafeFetch('/academy/admin/stats/revenue?weeks=8&months=6', 'Academy revenue', warnings),
      _bhSafeFetch('/admin/ccr/agents', 'CCR agents', warnings),
      _bhSafeFetch('/admin/ccr/commissions?limit=500', 'CCR commissions', warnings),
    ]);

  _bhCache = { snapshot, smmRevenue, connectStats, connectRevenue, academyStats, academyRevenue, ccrAgents, ccrCommissions };

  // ── Revenue mix (all-time, KES) — the three things that actually make money ──
  const smmAllTime      = snapshot?.gross_profit_kes || 0;
  const connectAllTime  = connectRevenue?.total_platform_revenue_kes || 0;
  const academyAllTime  = academyRevenue?.total_revenue_kes || 0;
  const totalRevenue    = smmAllTime + connectAllTime + academyAllTime;

  const mix = [
    { label: 'SMM Orders',   value: smmAllTime,     color: '#3dd44a' },
    { label: 'Connect (fees + commission)', value: connectAllTime, color: '#4ea8ff' },
    { label: 'Academy',      value: academyAllTime, color: '#ffd700' },
  ].map(m => ({ ...m, pct: totalRevenue ? round1((m.value / totalRevenue) * 100) : 0 }));

  // ── Cost structure (all-time) — what it actually costs to make that revenue ──
  const providerCost   = snapshot?.provider_cost_kes || 0;
  const affiliateCost  = smmRevenue?.affiliate_impact?.total_commission_owed_kes || 0;
  const ccrCost        = (ccrAgents || []).reduce((s, a) => s + (a.total_earned_kes || 0), 0);
  const totalCost       = providerCost + affiliateCost + ccrCost;
  const netProfit        = totalRevenue - affiliateCost - ccrCost; // providerCost is already netted out of smmAllTime (gross_profit = sales - provider cost), so don't double-subtract
  const netMarginPct     = totalRevenue ? round1((netProfit / totalRevenue) * 100) : 0;

  // ── This-month vs last-month growth (SMM + Academy have comparable monthly[] with `month` + `revenue_kes`; Connect's monthly series tracks escrow funding volume, not commission, so it's reported separately as a liquidity signal, not blended into growth%) ──
  const smmMonthly = smmRevenue?.monthly || [];
  const acMonthly  = academyRevenue?.monthly || [];
  const thisMonthKey = smmMonthly.length ? smmMonthly[smmMonthly.length - 1].month : (acMonthly.length ? acMonthly[acMonthly.length - 1].month : null);
  const lastMonthKey = smmMonthly.length >= 2 ? smmMonthly[smmMonthly.length - 2].month : null;

  const findMonth = (arr, key) => arr.find(m => m.month === key);
  const smmThis = thisMonthKey ? (findMonth(smmMonthly, thisMonthKey)?.revenue_kes || 0) : 0;
  const smmLast = lastMonthKey ? (findMonth(smmMonthly, lastMonthKey)?.revenue_kes || 0) : 0;
  const acThis  = thisMonthKey ? (findMonth(acMonthly, thisMonthKey)?.revenue_kes || 0) : 0;
  const acLast  = lastMonthKey ? (findMonth(acMonthly, lastMonthKey)?.revenue_kes || 0) : 0;

  const consolidatedThisMonth = smmThis + acThis;
  const consolidatedLastMonth = smmLast + acLast;
  const momGrowthPct = consolidatedLastMonth
    ? round1(((consolidatedThisMonth - consolidatedLastMonth) / consolidatedLastMonth) * 100)
    : (consolidatedThisMonth ? 100 : null);

  // ── CCR cost this month (from the commission ledger's period_key) ──
  const nowMonthKey = new Date().toISOString().slice(0, 7);
  const ccrCostThisMonth = (ccrCommissions || [])
    .filter(c => (c.period_key || '').slice(0, 7) === nowMonthKey)
    .reduce((s, c) => s + (c.commission_amount_kes || 0), 0);

  // ── Health verdict ──
  let verdict = { label: 'Not enough data yet', emoji: '⚪', color: 'var(--muted)' };
  if (momGrowthPct !== null) {
    if (momGrowthPct >= 5)       verdict = { label: 'Growing', emoji: '🟢', color: '#3dd44a' };
    else if (momGrowthPct >= -5) verdict = { label: 'Stable', emoji: '🟡', color: '#ffd700' };
    else                         verdict = { label: 'Declining', emoji: '🔴', color: '#ff5050' };
  }

  // ── LTV:CAC — the single number that tells you if growth is sustainable ──
  const clv = snapshot?.clv_kes || 0;
  const cac = snapshot?.cac_kes;
  const ltvCacRatio = (cac && cac > 0) ? round1(clv / cac) : null;

  // ── Alerts feed: merge every module's own insights + a few cross-cutting checks ──
  const alerts = [];
  (smmRevenue?.insights || []).forEach(i => alerts.push({ source: 'SMM', text: i }));
  (connectRevenue?.insights || []).forEach(i => alerts.push({ source: 'Connect', text: i }));
  (academyRevenue?.insights || []).forEach(i => alerts.push({ source: 'Academy', text: i }));

  if (totalRevenue > 0) {
    const affPct = round1((affiliateCost / totalRevenue) * 100);
    const ccrPct = round1((ccrCost / totalRevenue) * 100);
    if (affPct >= 25) alerts.push({ source: 'Cost', text: `Affiliate commissions are ${affPct}% of total revenue — high for a payout channel, worth reviewing top-earner rates.` });
    if (ccrPct >= 15) alerts.push({ source: 'Cost', text: `CCR agent commissions are ${ccrPct}% of total revenue.` });
  }
  if (connectStats?.open_disputes > 0) alerts.push({ source: 'Connect', text: `${connectStats.open_disputes} open dispute(s) need admin resolution.` });
  if (connectStats?.frozen_campaigns > 0) alerts.push({ source: 'Connect', text: `${connectStats.frozen_campaigns} campaign(s) currently frozen.` });
  if (academyStats && academyStats.learners_started > 0) {
    const activation30 = round1((academyStats.active_learners_30d / academyStats.learners_started) * 100);
    if (activation30 < 20) alerts.push({ source: 'Academy', text: `Only ${activation30}% of learners who ever started are still active in the last 30 days — retention/re-engagement worth a look.` });
  }
  if (ltvCacRatio !== null && ltvCacRatio < 3) alerts.push({ source: 'Unit Economics', text: `LTV:CAC is ${ltvCacRatio}:1 — under the 3:1 industry rule of thumb for a healthy acquisition channel.` });
  if (!alerts.length) alerts.push({ source: 'System', text: 'No flags right now — check back as more order history accumulates.' });

  // ══════════════════════════════════════════════════════════════ RENDER ══
  el.innerHTML = `
    ${_bhWarnBanner(warnings)}

    <!-- Hero verdict -->
    <div style="background:linear-gradient(135deg, rgba(61,212,74,.06), var(--card));border:1px solid var(--border);border-radius:16px;padding:24px 28px;margin-bottom:24px;display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Global Overview — This Month vs Last</div>
        <div style="display:flex;align-items:baseline;gap:12px;">
          <span style="font-size:32px;">${verdict.emoji}</span>
          <span style="font-size:28px;font-weight:900;color:${verdict.color};">${verdict.label}</span>
          ${momGrowthPct !== null ? `<span style="font-size:15px;font-weight:700;color:${momGrowthPct >= 0 ? '#3dd44a' : '#ff5050'};">${momGrowthPct >= 0 ? '▲' : '▼'} ${Math.abs(momGrowthPct)}% MoM</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px;">SMM + Academy consolidated revenue: ${fmtKES(consolidatedThisMonth)} this month vs ${fmtKES(consolidatedLastMonth)} last month${thisMonthKey ? ` (${esc(thisMonthKey)})` : ''}</div>
      </div>
      <button class="btn-secondary" onclick="loadBusinessHealth()">↻ Refresh All</button>
    </div>

    <!-- Headline KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-bottom:28px;">
      ${_bhCard('💰', 'Total Revenue (all-time)', fmtKES(totalRevenue), 'SMM + Connect + Academy', '#3dd44a')}
      ${_bhCard('🏦', 'Net Profit (all-time)', fmtKES(netProfit), 'after affiliate + CCR payouts', '#3dd44a')}
      ${_bhCard('📊', 'Net Margin', netMarginPct + '%', 'of total consolidated revenue', netMarginPct >= 20 ? '#3dd44a' : '#ff9a3c')}
      ${_bhCard('🔁', 'Repeat Rate', (snapshot?.repeat_rate_pct ?? 0) + '%', 'customers with 2+ orders', '#4ea8ff')}
      ${_bhCard('💵', 'LTV : CAC', ltvCacRatio !== null ? `${ltvCacRatio} : 1` : 'N/A', ltvCacRatio !== null ? (ltvCacRatio >= 3 ? 'healthy (≥3:1)' : 'below 3:1 benchmark') : 'no new payers this month', ltvCacRatio !== null && ltvCacRatio >= 3 ? '#3dd44a' : '#ff9a3c')}
      ${_bhCard('🧾', 'Avg Order Value', fmtKES(snapshot?.avg_order_value_kes || 0), 'SMM orders, all-time', '#ffd700')}
    </div>

    <!-- Revenue mix + cost structure side by side -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:28px;">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Revenue Mix — Where the money comes from</div>
        ${mix.map(m => _bhBarRow(`${m.label} — ${m.pct}%`, m.value, totalRevenue || 1, m.color)).join('')}
        ${!totalRevenue ? `<div style="color:var(--muted);font-size:12px;">No revenue recorded yet across any line.</div>` : ''}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">Cost Structure — Who gets paid out of that revenue</div>
        ${_bhBarRow(`Provider cost (SMM COGS) — ${totalRevenue ? round1((providerCost/(smmAllTime+providerCost||1))*100) : 0}% of SMM sales`, providerCost, Math.max(providerCost, affiliateCost, ccrCost, 1), '#ff9a3c')}
        ${_bhBarRow(`Affiliate commissions (owed, all-time)`, affiliateCost, Math.max(providerCost, affiliateCost, ccrCost, 1), '#9b6bff')}
        ${_bhBarRow(`CCR agent commissions (all-time)`, ccrCost, Math.max(providerCost, affiliateCost, ccrCost, 1), '#ff6bcb')}
        <div style="font-size:11px;color:var(--muted);margin-top:10px;">CCR this month: <strong style="color:var(--white);">${fmtKES(ccrCostThisMonth)}</strong> · Connect creator payouts (pass-through, not a platform cost): <strong style="color:var(--white);">${fmtKES(connectRevenue?.total_creator_paid_kes || 0)}</strong></div>
      </div>
    </div>

    <!-- Per-vertical scorecards -->
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">Per-Vertical Scorecard</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:28px;">
        ${_bhVerticalCard('📣 SMM Panel', [
          ['Gross profit (all-time)', fmtKES(smmAllTime)],
          ['Today\\'s revenue', fmtKES(snapshot?.today_revenue_kes || 0)],
          ['CAC (this month)', snapshot?.cac_kes != null ? fmtKES(snapshot.cac_kes) : 'no new payers'],
        ])}
        ${_bhVerticalCard('🤝 Connect', [
          ['Platform revenue (all-time)', fmtKES(connectAllTime)],
          ['Campaigns total', connectStats?.total_campaigns ?? 0],
          ['Open disputes', connectStats?.open_disputes ?? 0],
        ])}
        ${_bhVerticalCard('🎓 Academy', [
          ['Revenue (all-time)', fmtKES(academyAllTime)],
          ['Learners started', academyStats?.learners_started ?? 0],
          ['Active (30d)', academyStats?.active_learners_30d ?? 0],
        ])}
        ${_bhVerticalCard('🎧 CCR Agents', [
          ['Commission cost (all-time)', fmtKES(ccrCost)],
          ['Commission cost (this month)', fmtKES(ccrCostThisMonth)],
          ['Active agents', (ccrAgents || []).filter(a => a.status === 'active').length],
        ])}
      </div>
    </div>

    <!-- Unified alerts feed -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">🚨 Alerts — merged from every module</div>
      ${alerts.map(a => `<div style="font-size:13px;color:var(--white);padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;">
        <span style="font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);white-space:nowrap;padding-top:2px;">${esc(a.source)}</span>
        <span>${esc(a.text)}</span>
      </div>`).join('')}
    </div>
  `;
}

function round1(n) { return Math.round(n * 10) / 10; }

function _bhCard(icon, label, value, sub, color) {
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
    <div style="font-size:20px;margin-bottom:6px;">${icon}</div>
    <div style="font-size:20px;font-weight:900;color:${color};line-height:1.1;">${value}</div>
    <div style="font-size:11px;font-weight:700;color:var(--white);margin-top:5px;">${label}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:2px;">${esc(sub)}</div>
  </div>`;
}

function _bhBarRow(label, value, maxValue, color) {
  const pct = maxValue > 0 ? Math.max(2, Math.round((value / maxValue) * 100)) : 0;
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
      <span style="color:var(--white);">${label}</span>
      <span style="color:${color};font-weight:700;">${fmtKES(value)}</span>
    </div>
    <div style="background:var(--navy);border-radius:6px;height:8px;overflow:hidden;">
      <div style="background:${color};height:100%;width:${pct}%;border-radius:6px;"></div>
    </div>
  </div>`;
}

function _bhVerticalCard(title, rows) {
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
    <div style="font-size:13px;font-weight:800;color:var(--white);margin-bottom:10px;">${title}</div>
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--muted);">${esc(k)}</span><span style="color:var(--white);font-weight:700;">${esc(String(v))}</span>
    </div>`).join('')}
  </div>`;
}