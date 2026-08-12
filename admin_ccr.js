/* ════════════════════ ADMIN — CCR AGENTS PANEL ════════════════════
 * Customer Care Rep staff commissions: assign the role, edit each
 * agent's %, generate monthly commissions from platform profit, pay them.
 *
 * Depends on: api(), toast(), fmtKES(), esc() — globals from index.html / admin.js
 * Entry point: adminTab('ccr-agents', el) calls ccrAdminInit()
 * ════════════════════════════════════════════════════════════════════ */

let _ccrAgentsCache = [];
let _ccrCommissionsCache = [];
let _ccrPayoutRequestsCache = [];
let _ccrUsersCache = []; // for the "assign role" user picker

function ccrAdminInit() {
  const periodInput = document.getElementById('ccrPeriodInput');
  // Default the date picker to today so "Generate for Day" is a one-click
  // action for the common case (running it manually rather than via cron).
  if (periodInput && !periodInput.value) {
    periodInput.value = new Date().toISOString().slice(0, 10);
  }
  loadCCRAgents();
  loadCCRCommissions();
  loadCCRPayoutRequests();
}

// ─── Agents list ────────────────────────────────────────────────────────────

async function loadCCRAgents() {
  const el = document.getElementById('ccrAgentsTable');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading CCR agents…</span></div>';
  try {
    const agents = await api('/admin/ccr/agents');
    _ccrAgentsCache = agents || [];
    renderCCRAgents();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderCCRAgents() {
  const el = document.getElementById('ccrAgentsTable');
  if (!el) return;
  if (!_ccrAgentsCache.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🎧</div><p>No CCR agents yet — assign the role to a user below.</p></div>';
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Agent</th><th>Rate</th><th>Status</th><th>Total Earned</th><th>Pending</th><th>Paid</th><th>Actions</th></tr></thead>
    <tbody>${_ccrAgentsCache.map(a => {
      const active = a.status === 'active';
      return `
      <tr>
        <td><strong>${esc(a.name || '—')}</strong><div style="font-size:12px;color:var(--muted);">${esc(a.email || '')}</div></td>
        <td>
          <input type="number" id="ccrRate-${esc(a.id)}" value="${(a.commission_rate * 100).toFixed(2)}"
                 step="0.5" min="0" max="100" style="width:70px;padding:4px 6px;" /> %
        </td>
        <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${active ? 'rgba(61,212,74,.12)' : 'rgba(255,80,80,.12)'};color:${active ? 'var(--green)' : '#ff5050'};">${active ? 'Active' : 'Suspended'}</span></td>
        <td style="color:var(--green);">${fmtKES(a.total_earned_kes)}</td>
        <td>${fmtKES(a.pending_kes)}</td>
        <td>${fmtKES(a.paid_kes)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="action-btn" onclick="ccrUpdateRate('${esc(a.id)}')">Save %</button>
            ${active
              ? `<button class="action-btn danger" onclick="ccrRevoke('${esc(a.id)}')">Revoke</button>`
              : `<button class="action-btn" onclick="ccrReactivate('${esc(a.id)}')">Reactivate</button>`}
          </div>
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

async function ccrUpdateRate(profileId) {
  const input = document.getElementById('ccrRate-' + profileId);
  const pct = parseFloat(input.value);
  if (isNaN(pct) || pct < 0 || pct > 100) { toast('Enter a rate between 0 and 100', 'error'); return; }
  try {
    const res = await api(`/admin/ccr/agents/${profileId}/commission`, {
      method: 'PATCH',
      body: JSON.stringify({ commission_rate: pct / 100 }),
    });
    toast(res.message || 'Commission rate updated', 'success');
    loadCCRAgents();
  } catch (e) { toast(e.message, 'error'); }
}

async function ccrRevoke(profileId) {
  if (!confirm('Revoke this agent\'s CCR role? They will stop earning commission going forward.')) return;
  try {
    await api(`/admin/ccr/agents/${profileId}/revoke`, { method: 'POST' });
    toast('Agent revoked', 'success');
    loadCCRAgents();
  } catch (e) { toast(e.message, 'error'); }
}

async function ccrReactivate(profileId) {
  try {
    await api(`/admin/ccr/agents/${profileId}/reactivate`, { method: 'POST' });
    toast('Agent reactivated', 'success');
    loadCCRAgents();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Assign role ────────────────────────────────────────────────────────────

async function ccrOpenAssign() {
  const modal = document.getElementById('ccrAssignModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const select = document.getElementById('ccrAssignUserSelect');
  select.innerHTML = '<option>Loading users…</option>';
  try {
    if (!_ccrUsersCache.length) {
      const data = await api('/admin/users?limit=500');
      _ccrUsersCache = data.users || data.data || data || [];
    }
    select.innerHTML = _ccrUsersCache.map(u =>
      `<option value="${esc(u.id || u._id)}">${esc(u.name || u.email)} — ${esc(u.email || '')}</option>`
    ).join('');
  } catch (e) {
    select.innerHTML = `<option>Failed to load users</option>`;
    toast(e.message, 'error');
  }
}

function ccrCloseAssign() {
  const modal = document.getElementById('ccrAssignModal');
  if (modal) modal.style.display = 'none';
}

async function ccrConfirmAssign() {
  const userId = document.getElementById('ccrAssignUserSelect').value;
  const rateInput = document.getElementById('ccrAssignRate');
  const pct = parseFloat(rateInput.value || '10');
  if (!userId) { toast('Select a user', 'error'); return; }
  if (isNaN(pct) || pct < 0 || pct > 100) { toast('Enter a rate between 0 and 100', 'error'); return; }
  try {
    await api(`/admin/ccr/agents/${userId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ commission_rate: pct / 100 }),
    });
    toast('CCR role assigned', 'success');
    ccrCloseAssign();
    loadCCRAgents();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Monthly commission generation ─────────────────────────────────────────

async function ccrGenerateCommissions() {
  const input = document.getElementById('ccrPeriodInput');
  const periodKey = input && input.value ? input.value : null; // "YYYY-MM" from <input type=month>
  try {
    const res = await api('/admin/ccr/agents/generate-commissions', {
      method: 'POST',
      body: JSON.stringify({ period_key: periodKey }),
    });
    toast(
      `${res.period_key}: daily profit ${fmtKES(res.platform_profit_kes)} — ${res.generated} agent(s) paid, ${res.skipped} already accrued, ${res.skipped_no_login || 0} didn't log in`,
      'success'
    );
    loadCCRAgents();
    loadCCRCommissions();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Commission ledger ──────────────────────────────────────────────────────

async function loadCCRCommissions() {
  const el = document.getElementById('ccrCommissionsTable');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading commissions…</span></div>';
  try {
    const rows = await api('/admin/ccr/commissions?limit=200');
    _ccrCommissionsCache = rows || [];
    renderCCRCommissions();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderCCRCommissions() {
  const el = document.getElementById('ccrCommissionsTable');
  if (!el) return;
  if (!_ccrCommissionsCache.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🧾</div><p>No commissions generated yet.</p></div>';
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Agent</th><th>Date</th><th>Profit</th><th>Rate</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${_ccrCommissionsCache.map(c => {
      const paid = c.status === 'paid';
      return `
      <tr>
        <td>${esc(c.agent_name || '—')}</td>
        <td>${esc(c.period_key)}</td>
        <td>${fmtKES(c.platform_profit_kes)}</td>
        <td>${(c.commission_rate * 100).toFixed(2)}%</td>
        <td style="color:var(--green);">${fmtKES(c.commission_amount_kes)}</td>
        <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${paid ? 'rgba(61,212,74,.12)' : 'var(--navy)'};color:${paid ? 'var(--green)' : 'var(--muted)'};">${esc(c.status)}</span></td>
        <td>${paid ? '—' : `<button class="action-btn" onclick="ccrPayCommission('${esc(c.id)}')">Mark Paid</button>`}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

async function ccrPayCommission(commissionId) {
  if (!confirm('Credit this amount to the agent\'s wallet and mark it paid?')) return;
  try {
    const res = await api(`/admin/ccr/commissions/${commissionId}/pay`, { method: 'POST' });
    toast(`Paid — new wallet balance ${fmtKES(res.new_wallet_balance)}`, 'success');
    loadCCRAgents();
    loadCCRCommissions();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Payout requests (agent-initiated, weekly) ─────────────────────────────

async function loadCCRPayoutRequests() {
  const el = document.getElementById('ccrPayoutRequestsTable');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading payout requests…</span></div>';
  try {
    const rows = await api('/admin/ccr/payout-requests?limit=200');
    _ccrPayoutRequestsCache = rows || [];
    renderCCRPayoutRequests();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderCCRPayoutRequests() {
  const el = document.getElementById('ccrPayoutRequestsTable');
  if (!el) return;
  if (!_ccrPayoutRequestsCache.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">💸</div><p>No payout requests yet.</p></div>';
    return;
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
  el.innerHTML = `<table>
    <thead><tr><th>Agent</th><th>Amount</th><th>M-Pesa Phone</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${_ccrPayoutRequestsCache.map(r => `
      <tr>
        <td><strong>${esc(r.agent_name || '—')}</strong><div style="font-size:12px;color:var(--muted);">${esc(r.agent_email || '')}</div></td>
        <td style="color:var(--green);">${fmtKES(r.amount_kes)}</td>
        <td>${esc(r.mpesa_phone || '—')}</td>
        <td style="font-size:12px;color:var(--muted);">${r.requested_at ? new Date(r.requested_at).toLocaleString() : '—'}</td>
        <td>${badge(r.status)}</td>
        <td>
          ${r.status === 'pending' ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="action-btn" onclick="ccrApprovePayoutRequest('${esc(r.id)}')">Approve</button>
              <button class="action-btn danger" onclick="ccrRejectPayoutRequest('${esc(r.id)}')">Reject</button>
            </div>` : (r.admin_note ? `<span style="font-size:12px;color:var(--muted);">${esc(r.admin_note)}</span>` : '—')}
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function ccrApprovePayoutRequest(requestId) {
  if (!confirm('Approve this payout? This credits the agent\'s wallet immediately and cannot be undone.')) return;
  try {
    const res = await api(`/admin/ccr/payout-requests/${requestId}/approve`, { method: 'POST' });
    toast(`Paid ${fmtKES(res.amount_paid_kes)} — new wallet balance ${fmtKES(res.new_wallet_balance)}`, 'success');
    loadCCRAgents();
    loadCCRCommissions();
    loadCCRPayoutRequests();
  } catch (e) { toast(e.message, 'error'); }
}

async function ccrRejectPayoutRequest(requestId) {
  const note = prompt('Reason for rejecting this payout request:');
  if (note === null) return;
  if (!note.trim()) { toast('A reason is required', 'error'); return; }
  try {
    await api(`/admin/ccr/payout-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note: note.trim() }),
    });
    toast('Payout request rejected', 'success');
    loadCCRPayoutRequests();
  } catch (e) { toast(e.message, 'error'); }
}