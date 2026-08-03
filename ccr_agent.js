/* ═══════════════ CCR AGENT — "MY EARNINGS" (self-service) ═══════════════
 * What a Customer Care Rep sees, on top of the full normal-user platform
 * they already have (New Order, Orders, Wallet, Academy, Marketplace,
 * Refer & Earn — all unrestricted): a "My Earnings" nav item and page for
 * their commission, plus admin-panel access to the Support ticket queue
 * (granted server-side by get_support_staff in auth.py, not by anything
 * in this file).
 *
 * Depends on: api(), toast(), fmtKES(), esc(), currentUser (globals from
 * index.html / auth.js)
 * ══════════════════════════════════════════════════════════════════════ */

let _ccrDashboardCache = null;

/**
 * Called from auth.js's initApp() the moment a session is established
 * (login, register, or a page reload with a saved token), and again from
 * navTo() on every navigation as a backup.
 *
 * CCR agents get the FULL normal-user platform (New Order, Wallet, Academy,
 * Marketplace, Refer & Earn, everything) — the CCR role is additive, not
 * restrictive. All this does is show/hide the "My Earnings" nav item.
 * Ticket-panel access is a backend permission (get_support_staff in
 * auth.py), not a frontend nav toggle, so it needs no handling here either.
 */
function applyCCRNavVisibility() {
  if (!currentUser) return;
  const ccrNav = document.getElementById('ccrNavItem');
  if (ccrNav) ccrNav.style.display = currentUser.is_ccr_agent ? 'flex' : 'none';
}

// Admin-panel sub-tabs a CCR-only agent (not also a full admin) is allowed
// to see: the ticket queue (support_chat.py, gated by get_support_staff)
// and "Create Order for Customer" (orders.py's target_user_id path, now
// also gated to admin OR active CCR agent). Everything else in the admin
// panel — Users, All Orders, Services, Providers, Stats, Payouts, Academy,
// Connect, CCR Agents itself — stays admin-only.
const CCR_ALLOWED_ADMIN_TABS = ['support', 'create-order'];

/**
 * Called from navTo() every time the admin page is opened. Admins are
 * untouched (early return); for a CCR-only agent, hides every admin-tab
 * button except the ones in CCR_ALLOWED_ADMIN_TABS.
 */
function applyCCRAdminTabRestrictions() {
  if (!currentUser) return;
  const isAdmin = currentUser.role === 'admin';
  if (isAdmin) {
    document.querySelectorAll('.admin-tab').forEach(tab => { tab.style.display = ''; });
    return;
  }
  const isCCR = !!currentUser.is_ccr_agent;
  document.querySelectorAll('.admin-tab').forEach(tab => {
    const match = (tab.getAttribute('onclick') || '').match(/adminTab\('([^']+)'/);
    const tabName = match ? match[1] : null;
    tab.style.display = (isCCR && CCR_ALLOWED_ADMIN_TABS.includes(tabName)) ? '' : 'none';
  });
}

async function initCCRAgentPage() {
  const el = document.getElementById('sec-ccr-agent');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading your earnings…</span></div>';
  try {
    const data = await api('/ccr/dashboard');
    _ccrDashboardCache = data;
    renderCCRAgentPage();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderCCRAgentPage() {
  const el = document.getElementById('sec-ccr-agent');
  if (!el || !_ccrDashboardCache) return;
  const d = _ccrDashboardCache;
  const a = d.agent;

  const statusBadge = a.status === 'active'
    ? `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(61,212,74,.12);color:var(--green);">Active</span>`
    : `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(255,80,80,.12);color:#ff5050;">Suspended</span>`;

  let payoutAction;
  if (a.status !== 'active') {
    payoutAction = `<div class="empty-state" style="padding:20px;"><p>Your CCR access is currently suspended — contact an admin.</p></div>`;
  } else if (a.pending_kes <= 0) {
    payoutAction = `<div class="empty-state" style="padding:20px;"><div class="icon">💤</div><p>Nothing pending yet — check back after the next commission run.</p></div>`;
  } else if (!d.can_request_payout) {
    const nextDate = d.next_eligible_payout_at ? new Date(d.next_eligible_payout_at).toLocaleDateString() : '—';
    payoutAction = `<div class="empty-state" style="padding:20px;"><div class="icon">⏳</div><p>You can request a payout once every 7 days.<br>Next eligible: <strong>${esc(nextDate)}</strong></p></div>`;
  } else {
    payoutAction = `
      <div style="display:flex;flex-direction:column;gap:10px;max-width:360px;">
        <div class="modal-field" style="margin:0;"><label>M-Pesa Phone (optional)</label><input type="tel" id="ccrPayoutPhone" placeholder="07XX XXX XXX"/></div>
        <button class="btn-primary" style="margin-top:0;" onclick="ccrRequestPayout()">💸 Request Payout — ${fmtKES(a.pending_kes)}</button>
      </div>`;
  }

  el.innerHTML = `
    <div class="sec-hd" style="flex-wrap:wrap;gap:12px;">
      <div><div class="sec-title">🎧 MY EARNINGS</div><div class="sec-sub">Your commission as a Customer Care Rep — ${(a.commission_rate * 100).toFixed(2)}% of total platform profit ${statusBadge}</div></div>
      <button class="btn-secondary" onclick="initCCRAgentPage()">↻ Refresh</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
      <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-label">Total Earned</div><div class="stat-val">${fmtKES(a.total_earned_kes)}</div><div class="stat-sub">All time</div></div>
      <div class="stat-card blue"><div class="stat-icon">⏳</div><div class="stat-label">Pending</div><div class="stat-val">${fmtKES(a.pending_kes)}</div><div class="stat-sub">Available to request</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Paid Out</div><div class="stat-val">${fmtKES(a.paid_kes)}</div><div class="stat-sub">Already in your wallet</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;" class="wallet-main-grid">
      <div>
        <div class="sec-title" style="font-size:14px;margin-bottom:14px;">REQUEST PAYOUT</div>
        ${payoutAction}

        <div class="sec-title" style="font-size:14px;margin:28px 0 14px;">PAYOUT HISTORY</div>
        <div class="tbl-wrap">${renderCCRPayoutHistory(d.payout_requests)}</div>
      </div>
      <div>
        <div class="sec-title" style="font-size:14px;margin-bottom:14px;">COMMISSION HISTORY</div>
        <div class="tbl-wrap">${renderCCROwnCommissions(d.commissions)}</div>
      </div>
    </div>
  `;
}

function renderCCROwnCommissions(commissions) {
  if (!commissions || !commissions.length) {
    return `<div class="empty-state" style="padding:20px;"><div class="icon">🧾</div><p>No commissions generated yet.</p></div>`;
  }
  return `<table>
    <thead><tr><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${commissions.map(c => {
      const paid = c.status === 'paid';
      return `
      <tr>
        <td>${esc(c.period_key)}</td>
        <td style="color:var(--green);">${fmtKES(c.commission_amount_kes)}</td>
        <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${paid ? 'rgba(61,212,74,.12)' : 'var(--navy)'};color:${paid ? 'var(--green)' : 'var(--muted)'};">${esc(c.status)}</span></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

function renderCCRPayoutHistory(requests) {
  if (!requests || !requests.length) {
    return `<div class="empty-state" style="padding:20px;"><div class="icon">💸</div><p>No payout requests yet.</p></div>`;
  }
  const badge = (status) => {
    const map = {
      pending:  ['var(--navy)', 'var(--muted)'],
      paid:     ['rgba(61,212,74,.12)', 'var(--green)'],
      rejected: ['rgba(255,80,80,.12)', '#ff5050'],
    };
    const [bg, fg] = map[status] || map.pending;
    return `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${bg};color:${fg};">${esc(status)}</span>`;
  };
  return `<table>
    <thead><tr><th>Requested</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${requests.map(r => `
      <tr>
        <td style="font-size:12px;color:var(--muted);">${r.requested_at ? new Date(r.requested_at).toLocaleDateString() : '—'}</td>
        <td>${fmtKES(r.amount_kes)}</td>
        <td>${badge(r.status)}${r.status === 'rejected' && r.admin_note ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">${esc(r.admin_note)}</div>` : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function ccrRequestPayout() {
  const phoneInput = document.getElementById('ccrPayoutPhone');
  const phone = phoneInput ? phoneInput.value.trim() : '';
  try {
    await api('/ccr/payout-request', {
      method: 'POST',
      body: JSON.stringify({ mpesa_phone: phone || null }),
    });
    toast('Payout requested — an admin will review it shortly', 'success');
    initCCRAgentPage();
  } catch (e) { toast(e.message, 'error'); }
}