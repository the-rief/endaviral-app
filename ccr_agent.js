/* ═══════════════ CCR AGENT — "MY EARNINGS" (self-service) ═══════════════
 * What a Customer Care Rep sees, on top of the full normal-user platform
 * they already have (New Order, Orders, Wallet, Academy, Marketplace,
 * Refer & Earn — all unrestricted): a "My Earnings" nav item and page for
 * their commission, plus admin-panel access to the Support ticket queue,
 * Create Order for Customer, and All Orders (granted server-side by
 * get_support_staff in auth.py, not by anything in this file — the
 * CCR_ALLOWED_ADMIN_TABS list below only controls which tab *buttons*
 * are visible; the backend is the real gate).
 *
 * Depends on: api(), toast(), fmtKES(), esc(), currentUser (globals from
 * index.html / auth.js)
 * ══════════════════════════════════════════════════════════════════════ */

let _ccrDashboardCache = null;
let _ccrCalendarMonth = null;   // "YYYY-MM" currently displayed
let _ccrCalendarCache = null;   // { month, commissions, days_worked, month_total_kes }

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
// to see: the ticket queue (support_chat.py, gated by get_support_staff),
// "Create Order for Customer" (orders.py's target_user_id path), and
// "All Orders" (admin.py's GET /admin/orders — same get_support_staff
// gate) so an agent can look up any customer's order status/history while
// working a ticket without needing a full admin to do it for them.
// Everything else in the admin panel — Users, Services, Providers, Stats,
// Payouts, Academy, Connect, CCR Agents itself — stays admin-only.
const CCR_ALLOWED_ADMIN_TABS = ['support', 'create-order', 'allorders'];

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
    // Calendar defaults back to the current month every time the page
    // (re)loads — matches "Refresh" resetting to today rather than
    // leaving the agent stranded on whatever month they last paged to.
    loadCCRCalendar(new Date().toISOString().slice(0, 7));
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
        <div class="sec-title" style="font-size:14px;margin-bottom:14px;">EARNINGS CALENDAR</div>
        <div id="ccrCalendarWrap"><div class="loading-spinner"><div class="spinner"></div><span>Loading calendar…</span></div></div>
      </div>
    </div>
  `;
}

function renderCCROwnCommissions(commissions) {
  if (!commissions || !commissions.length) {
    return `<div class="empty-state" style="padding:20px;"><div class="icon">🧾</div><p>No commissions generated yet.</p></div>`;
  }
  return `<table>
    <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
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

// ─── Earnings calendar ──────────────────────────────────────────────────────
// "My Earnings" no longer just lists commission rows chronologically — it
// shows a real month grid so an agent can see at a glance which days they
// worked (and what they made) vs which days have a gap. Backed by
// GET /ccr/commissions?month=YYYY-MM (app/routers/ccr.py), which returns
// only that agent's own rows for one calendar month.

async function loadCCRCalendar(monthKey) {
  const el = document.getElementById('ccrCalendarWrap');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading calendar…</span></div>';
  try {
    const data = await api(`/ccr/commissions?month=${encodeURIComponent(monthKey)}`);
    _ccrCalendarMonth = data.month;
    _ccrCalendarCache = data;
    renderCCRCalendar();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function ccrCalendarShiftMonth(delta) {
  if (!_ccrCalendarMonth) return;
  const [y, m] = _ccrCalendarMonth.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const nextKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  loadCCRCalendar(nextKey);
}

function renderCCRCalendar() {
  const el = document.getElementById('ccrCalendarWrap');
  if (!el || !_ccrCalendarCache) return;

  const monthKey = _ccrCalendarMonth;
  const [y, m] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // ISO 8601: weeks start on Monday, everywhere except the US and a
  // handful of others — JS's getUTCDay() is Sun=0..Sat=6, so shift it
  // to Mon=0..Sun=6.
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLabel = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const byDay = {};
  (_ccrCalendarCache.commissions || []).forEach(c => { byDay[c.period_key] = c; });

  let cells = '';
  for (let i = 0; i < startWeekday; i++) cells += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = `${monthKey}-${String(d).padStart(2, '0')}`;
    const c = byDay[dayKey];
    const isToday = dayKey === todayKey;
    const isFuture = dayKey > todayKey;
    if (c) {
      const paid = c.status === 'paid';
      cells += `
        <div style="border:1px solid ${isToday ? 'var(--green)' : 'var(--border)'};border-radius:8px;padding:6px 4px;min-height:56px;background:${paid ? 'rgba(61,212,74,.14)' : 'rgba(61,212,74,.06)'};">
          <div style="font-size:11px;color:var(--muted);">${d}</div>
          <div style="font-size:12px;font-weight:700;color:var(--green);margin-top:4px;">${fmtKES(c.commission_amount_kes)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">${paid ? '✓ paid' : 'pending'}</div>
        </div>`;
    } else {
      cells += `
        <div style="border:1px solid var(--border);border-radius:8px;padding:6px 4px;min-height:56px;opacity:${isFuture ? '0.35' : '0.55'};">
          <div style="font-size:11px;color:var(--muted);">${d}</div>
          ${isFuture ? '' : '<div style="font-size:9px;color:var(--muted);margin-top:8px;">not worked</div>'}
        </div>`;
    }
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <button class="btn-secondary" style="padding:4px 12px;" onclick="ccrCalendarShiftMonth(-1)">‹</button>
      <div style="font-weight:800;font-size:14px;">${monthLabel}</div>
      <button class="btn-secondary" style="padding:4px 12px;" onclick="ccrCalendarShiftMonth(1)">›</button>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${_ccrCalendarCache.days_worked} day(s) worked — <strong style="color:var(--green);">${fmtKES(_ccrCalendarCache.month_total_kes)}</strong> this month</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;font-size:10px;color:var(--muted);text-align:center;margin-bottom:4px;">
      <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:18px;">${cells}</div>
    <div class="tbl-wrap">${renderCCROwnCommissions(_ccrCalendarCache.commissions)}</div>
  `;
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