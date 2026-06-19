/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN AFFILIATE PANEL  (paste into admin.js)
 *
 * Renders three sections inside #adminAffiliatePayouts:
 *   1. Summary stat cards  (totals across all affiliates)
 *   2. Affiliate leaderboard table  (all profiles, sortable)
 *   3. Payout queue  (filterable by status, approve / reject)
 *
 * Entry point: adminLoadAffiliatePayouts()
 * Call it inside your admin page init (navTo 'admin' handler).
 *
 * HTML required in your admin section:
 * ─────────────────────────────────────
 * <div style="margin-top:32px;">
 *   <div style="font-size:11px;font-weight:700;letter-spacing:2px;
 *        text-transform:uppercase;color:var(--muted);margin-bottom:16px;">
 *     🤝 AFFILIATE PROGRAMME
 *   </div>
 *   <div id="adminAffiliatePayouts"></div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── Tier helper (mirrors affiliate.js) ──────────────────────────────────────
const _ADMIN_AFF_TIERS = [
  { name:'Starter', min:0,      badge:'🌱', color:'#7a8fad' },
  { name:'Bronze',  min:5000,   badge:'🥉', color:'#cd7f32' },
  { name:'Silver',  min:25000,  badge:'🥈', color:'#a8adb4' },
  { name:'Gold',    min:100000, badge:'🥇', color:'#ffd700' },
  { name:'Diamond', min:500000, badge:'💎', color:'#3dd44a' },
];
function _adminAffTier(spend) {
  let t = _ADMIN_AFF_TIERS[0];
  for (const tier of _ADMIN_AFF_TIERS) { if ((spend || 0) >= tier.min) t = tier; }
  return t;
}

// ─── State ────────────────────────────────────────────────────────────────────
let _affPayoutFilter    = 'pending';
let _affLeaderSort      = 'earned';   // 'earned' | 'referrals' | 'spend' | 'pending'
let _affLeaderDir       = -1;         // -1 = desc, 1 = asc
let _affLeaderData      = [];
let _affPayoutData      = [];
let _affStatsData       = null;

// ─── Main entry point ─────────────────────────────────────────────────────────
async function adminLoadAffiliatePayouts(statusFilter) {
  if (statusFilter !== undefined) _affPayoutFilter = statusFilter;
  const wrap = document.getElementById('adminAffiliatePayouts');
  if (!wrap) return;

  wrap.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading affiliate data…</span></div>`;

  // Fetch all three data sources in parallel
  try {
    const [affiliatesResp, payoutsResp] = await Promise.all([
      api('/affiliate/admin/affiliates?limit=200'),
      api(`/affiliate/admin/payouts?status=all&limit=500`),
    ]);

    _affLeaderData = affiliatesResp.affiliates || [];
    _affPayoutData = (payoutsResp.payouts || []);

    // Derive summary stats from the data we already have
    _affStatsData = _deriveAffStats(_affLeaderData, _affPayoutData);

    wrap.innerHTML = '';
    wrap.appendChild(_buildStatsCards(_affStatsData));
    wrap.appendChild(_buildLeaderboard());
    wrap.appendChild(_buildPayoutQueue());
  } catch (e) {
    wrap.innerHTML = `<div style="color:#ff6b6b;padding:20px;">${esc(e.message || 'Failed to load affiliate data')}</div>`;
  }
}

// ─── Derive summary numbers ───────────────────────────────────────────────────
function _deriveAffStats(affiliates, payouts) {
  const totalAffiliates   = affiliates.length;
  const activeAffiliates  = affiliates.filter(a => (a.total_referrals || 0) > 0).length;
  const totalReferrals    = affiliates.reduce((s, a) => s + (a.total_referrals || 0), 0);
  const totalEarned       = affiliates.reduce((s, a) => s + (a.total_earned_kes || 0), 0);
  const totalPending      = affiliates.reduce((s, a) => s + (a.pending_kes || 0), 0);
  const totalPaid         = affiliates.reduce((s, a) => s + (a.paid_kes || 0), 0);
  const totalSpend        = affiliates.reduce((s, a) => s + (a.referral_spend_kes || 0), 0);

  const pendingPayouts    = payouts.filter(p => p.status === 'pending');
  const pendingPayoutKes  = pendingPayouts.reduce((s, p) => s + (p.amount_kes || 0), 0);
  const pendingCount      = pendingPayouts.length;

  // Tier distribution
  const tierCounts = {};
  for (const a of affiliates) {
    const t = _adminAffTier(a.referral_spend_kes || 0);
    tierCounts[t.name] = (tierCounts[t.name] || 0) + 1;
  }

  return {
    totalAffiliates, activeAffiliates, totalReferrals,
    totalEarned, totalPending, totalPaid, totalSpend,
    pendingCount, pendingPayoutKes, tierCounts,
  };
}

// ─── Section 1: Summary stat cards ───────────────────────────────────────────
function _buildStatsCards(s) {
  const cards = [
    { label:'Total Affiliates',    value: s.totalAffiliates,              sub: `${s.activeAffiliates} with referrals`,         icon:'🤝', color:'#3dd44a' },
    { label:'Total Referrals',     value: s.totalReferrals,               sub: 'users signed up via links',                    icon:'👥', color:'#3dd44a' },
    { label:'Referral Spend',      value: fmtKES(s.totalSpend),           sub: 'total spend by referred users',                icon:'🛒', color:'#ffd700' },
    { label:'Total Commissions',   value: fmtKES(s.totalEarned),          sub: '15% of referral spend',                       icon:'💰', color:'#ffd700' },
    { label:'Pending Balance',     value: fmtKES(s.totalPending),         sub: 'across all affiliates',                        icon:'⏳', color:'#ff9a3c' },
    { label:'Total Paid Out',      value: fmtKES(s.totalPaid),            sub: 'M-Pesa disbursements',                         icon:'✅', color:'#3dd44a' },
    { label:'Pending Requests',    value: s.pendingCount,                  sub: fmtKES(s.pendingPayoutKes) + ' awaiting',       icon:'📬', color: s.pendingCount > 0 ? '#ff6b6b' : '#3dd44a' },
  ];

  const tierHtml = _ADMIN_AFF_TIERS.map(t =>
    `<div style="display:flex;align-items:center;gap:6px;">
       <span style="font-size:14px;">${t.badge}</span>
       <span style="font-size:12px;color:${t.color};font-weight:700;">${t.name}</span>
       <span style="font-size:12px;color:var(--white);font-weight:800;margin-left:auto;">${s.tierCounts[t.name] || 0}</span>
     </div>`
  ).join('');

  const el = document.createElement('div');
  el.innerHTML = `
    <!-- Stat cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:24px;">
      ${cards.map(c => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:22px;margin-bottom:6px;">${c.icon}</div>
          <div style="font-size:20px;font-weight:900;color:${c.color};line-height:1;">${typeof c.value === 'number' && !isNaN(c.value) && !String(c.value).startsWith('KES') ? c.value.toLocaleString() : c.value}</div>
          <div style="font-size:11px;font-weight:700;color:var(--white);margin-top:4px;">${c.label}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${c.sub}</div>
        </div>`).join('')}

      <!-- Tier breakdown card -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:22px;margin-bottom:8px;">🏅</div>
        <div style="font-size:11px;font-weight:700;color:var(--white);margin-bottom:10px;">TIER BREAKDOWN</div>
        <div style="display:flex;flex-direction:column;gap:5px;">${tierHtml}</div>
      </div>
    </div>`;
  return el;
}

// ─── Section 2: Affiliate leaderboard ────────────────────────────────────────
function _buildLeaderboard() {
  const el = document.createElement('div');
  el.id = 'affAdminLeaderWrap';
  el.style.marginBottom = '28px';
  _renderLeaderboard(el);
  return el;
}

function _renderLeaderboard(container) {
  const sortKey = _affLeaderSort;
  const dir     = _affLeaderDir;

  const sorted = [..._affLeaderData].sort((a, b) => {
    const map = {
      earned:    [a.total_earned_kes,    b.total_earned_kes],
      referrals: [a.total_referrals,     b.total_referrals],
      spend:     [a.referral_spend_kes,  b.referral_spend_kes],
      pending:   [a.pending_kes,         b.pending_kes],
    };
    const [av, bv] = map[sortKey] || [0, 0];
    return dir * ((bv || 0) - (av || 0));
  });

  const sortBtn = (key, label) => {
    const active = sortKey === key;
    return `<button onclick="_affAdminSort('${key}')"
      style="background:${active ? 'rgba(61,212,74,.15)' : 'var(--card2)'};
             border:1px solid ${active ? 'rgba(61,212,74,.4)' : 'var(--border)'};
             color:${active ? 'var(--green)' : 'var(--muted)'};
             border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;
             cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;">
      ${label}${active ? (dir === -1 ? ' ↓' : ' ↑') : ''}
    </button>`;
  };

  container.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">
      📊 ALL AFFILIATES (${sorted.length})
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
      <span style="font-size:11px;color:var(--muted);margin-right:4px;">Sort:</span>
      ${sortBtn('earned',    '💰 Earned')}
      ${sortBtn('referrals', '👥 Referrals')}
      ${sortBtn('spend',     '🛒 Spend')}
      ${sortBtn('pending',   '⏳ Pending')}
    </div>

    ${!sorted.length ? `
      <div style="padding:32px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:14px;">
        No affiliates yet.
      </div>` : `
    <div class="tbl-wrap"><table>
      <thead>
        <tr>
          <th>#</th>
          <th>Affiliate</th>
          <th>Tier</th>
          <th>Ref. Code</th>
          <th>Referrals</th>
          <th>Ref. Spend</th>
          <th>Total Earned</th>
          <th>Pending</th>
          <th>Paid Out</th>
          <th>Rate</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((a, i) => {
          const tier   = _adminAffTier(a.referral_spend_kes || 0);
          const earned = a.total_earned_kes || 0;
          const pend   = a.pending_kes || 0;
          const paid   = a.paid_kes || 0;
          const refs   = a.total_referrals || 0;
          const spend  = a.referral_spend_kes || 0;
          const rate   = ((a.commission_rate || 0.15) * 100).toFixed(0);
          const joined = a.created_at ? new Date(a.created_at).toLocaleDateString('en-KE') : '—';
          const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
          return `<tr>
            <td style="font-weight:800;color:${i < 3 ? '#ffd700' : 'var(--muted)'};">${medal}</td>
            <td>
              <div style="font-weight:700;">${esc(a.user_name || '—')}</div>
              <div style="font-size:10px;color:var(--muted);">${esc(a.user_email || '—')}</div>
            </td>
            <td>
              <span style="font-size:13px;">${tier.badge}</span>
              <span style="font-size:11px;color:${tier.color};font-weight:700;margin-left:4px;">${tier.name}</span>
            </td>
            <td style="font-family:monospace;font-size:12px;color:var(--muted);">${esc(a.referral_code || '—')}</td>
            <td style="font-weight:700;text-align:center;">${refs}</td>
            <td style="color:var(--muted);font-size:13px;">${fmtKES(spend)}</td>
            <td style="font-weight:800;color:var(--green);">${fmtKES(earned)}</td>
            <td style="font-weight:700;color:${pend > 0 ? '#ff9a3c' : 'var(--muted)'};">${fmtKES(pend)}</td>
            <td style="color:var(--muted);font-size:13px;">${fmtKES(paid)}</td>
            <td style="font-size:12px;color:var(--muted);">${rate}%</td>
            <td style="font-size:11px;color:var(--muted);">${joined}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`}`;
}

function _affAdminSort(key) {
  if (_affLeaderSort === key) {
    _affLeaderDir *= -1;
  } else {
    _affLeaderSort = key;
    _affLeaderDir  = -1;
  }
  const wrap = document.getElementById('affAdminLeaderWrap');
  if (wrap) _renderLeaderboard(wrap);
}

// ─── Section 3: Payout queue ──────────────────────────────────────────────────
function _buildPayoutQueue() {
  const el = document.createElement('div');
  el.id = 'affAdminPayoutWrap';
  _renderPayoutQueue(el);
  return el;
}

function _renderPayoutQueue(container) {
  const filter  = _affPayoutFilter;
  const all     = _affPayoutData;
  const payouts = filter === 'all' ? all : all.filter(p => p.status === filter);

  const countFor = s => all.filter(p => p.status === s).length;
  const badges = { pending: countFor('pending'), paid: countFor('paid'), rejected: countFor('rejected') };

  const filterBtns = ['pending','paid','rejected','all'].map(s => {
    const active = s === filter;
    const count  = s === 'all' ? all.length : countFor(s);
    return `<button onclick="_affPayoutSetFilter('${s}')"
      class="btn-secondary${active ? ' active' : ''}"
      style="font-size:12px;padding:7px 14px;position:relative;">
      ${s.charAt(0).toUpperCase()+s.slice(1)}
      ${count > 0 ? `<span style="
        background:${s==='pending'&&count>0?'#ff6b6b':'var(--border)'};
        color:${s==='pending'&&count>0?'#fff':'var(--muted)'};
        border-radius:10px;font-size:10px;font-weight:800;
        padding:1px 6px;margin-left:5px;">${count}</span>` : ''}
    </button>`;
  }).join('');

  container.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">
      💸 PAYOUT QUEUE
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      ${filterBtns}
      <button onclick="adminLoadAffiliatePayouts()"
        style="margin-left:auto;background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:5px 12px;font-size:11px;cursor:pointer;font-family:'Montserrat',sans-serif;">
        🔄 Refresh
      </button>
    </div>

    ${!payouts.length ? `
      <div style="padding:40px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:14px;">
        <div style="font-size:36px;margin-bottom:10px;">${filter==='pending'?'✅':'📭'}</div>
        <div style="font-size:14px;">No ${filter} payouts</div>
      </div>` : `
    <div class="tbl-wrap"><table>
      <thead>
        <tr>
          <th>Affiliate</th>
          <th>Requested</th>
          <th>Actual Sent</th>
          <th>M-Pesa #</th>
          <th>Requested At</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${payouts.map(p => {
          const st  = p.status || 'pending';
          const cls = st === 'paid' ? 'completed' : st === 'rejected' ? 'failed' : 'pending';

          // Look up this affiliate's full stats from leaderboard data
          const aff = _affLeaderData.find(a => a.user_email === p.user_email) || {};
          const tier = _adminAffTier(aff.referral_spend_kes || 0);

          return `<tr>
            <td>
              <div style="font-weight:700;">${esc(p.user_name || '—')}</div>
              <div style="font-size:10px;color:var(--muted);">${esc(p.user_email || '—')}</div>
              <div style="margin-top:3px;">
                <span style="font-size:11px;">${tier.badge}</span>
                <span style="font-size:10px;color:${tier.color};font-weight:700;">${tier.name}</span>
                ${aff.total_referrals ? `<span style="font-size:10px;color:var(--muted);margin-left:6px;">· ${aff.total_referrals} refs</span>` : ''}
              </div>
            </td>
            <td style="font-weight:800;color:var(--green);white-space:nowrap;">${fmtKES(p.amount_kes)}</td>
            <td style="font-size:13px;color:var(--muted);white-space:nowrap;">
              ${p.amount_sent_kes != null ? `<span style="color:var(--white);font-weight:700;">${fmtKES(p.amount_sent_kes)}</span>` : '—'}
            </td>
            <td style="font-family:monospace;font-size:13px;">${esc(p.mpesa_phone || '—')}</td>
            <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${p.requested_at ? new Date(p.requested_at).toLocaleString('en-KE') : '—'}</td>
            <td>
              <span class="status-pill ${cls}">${st}</span>
              ${p.mpesa_receipt ? `<div style="font-size:10px;color:var(--muted);margin-top:3px;">Rcpt: ${esc(p.mpesa_receipt)}</div>` : ''}
              ${p.admin_note    ? `<div style="font-size:10px;color:#ff9a3c;margin-top:3px;">${esc(p.admin_note)}</div>` : ''}
              ${p.processed_at  ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">${new Date(p.processed_at).toLocaleDateString('en-KE')}</div>` : ''}
            </td>
            <td>
              ${st === 'pending' ? `
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button onclick="adminApproveAffPayout('${esc(p.id)}','${esc(p.mpesa_phone)}',${p.amount_kes})"
                    style="background:var(--green);color:#000;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
                    ✅ Approve
                  </button>
                  <button onclick="adminRejectAffPayout('${esc(p.id)}')"
                    style="background:rgba(255,69,69,.15);color:#ff6b6b;border:1px solid rgba(255,69,69,.3);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">
                    ✗ Reject
                  </button>
                </div>` : `<span style="color:var(--muted);font-size:12px;">—</span>`}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`}`;
}

function _affPayoutSetFilter(f) {
  _affPayoutFilter = f;
  const wrap = document.getElementById('affAdminPayoutWrap');
  if (wrap) _renderPayoutQueue(wrap);
}

// ─── Approve flow ─────────────────────────────────────────────────────────────
function adminApproveAffPayout(payoutId, phone, amount) {
  const amountSentStr = prompt(
    `Approving payout to ${phone}\n\nRequested: ${fmtKES(amount)}\n\nEnter ACTUAL amount sent via M-Pesa (KES):`,
    amount
  );
  if (amountSentStr === null) return;

  const amountSent = parseFloat(amountSentStr);
  if (isNaN(amountSent) || amountSent <= 0) {
    toast('Invalid amount. Approval cancelled.', 'error');
    return;
  }

  const receipt = prompt('Enter M-Pesa receipt number (or leave blank):', '');
  if (receipt === null) return;

  _doApproveAffPayout(payoutId, amountSent, receipt.trim());
}

async function _doApproveAffPayout(payoutId, amountSent, receipt) {
  try {
    await api(`/affiliate/admin/payouts/${payoutId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ amount_sent: amountSent, mpesa_receipt: receipt || null }),
    });
    toast('Payout approved and marked as paid ✅', 'success');
    adminLoadAffiliatePayouts();   // full refresh — updates stats + table + queue
  } catch (e) {
    toast(e.message || 'Approval failed', 'error');
  }
}

// ─── Reject flow ──────────────────────────────────────────────────────────────
function adminRejectAffPayout(payoutId) {
  const reason = prompt('Reason for rejection (required):');
  if (!reason || !reason.trim()) {
    toast('Rejection reason is required.', 'error');
    return;
  }
  _doRejectAffPayout(payoutId, reason.trim());
}

async function _doRejectAffPayout(payoutId, reason) {
  try {
    await api(`/affiliate/admin/payouts/${payoutId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    toast('Payout rejected', 'success');
    adminLoadAffiliatePayouts();   // full refresh
  } catch (e) {
    toast(e.message || 'Rejection failed', 'error');
  }
}