/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN AFFILIATE PAYOUTS  (paste into admin.js)
 * Manages withdrawal tickets from affiliates.
 * ════════════════════════════════════════════════════════════════════ */

// ─── Load & render payout queue ───────────────────────────────────────────────
async function adminLoadAffiliatePayouts(statusFilter = 'pending') {
  const container = document.getElementById('adminAffiliatePayouts');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading payouts…</span></div>`;

  try {
    const resp = await api(`/affiliate/admin/payouts?status=${statusFilter}&limit=100`);
    const payouts = resp.payouts || [];

    if (!payouts.length) {
      container.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--muted);">
          <div style="font-size:36px;margin-bottom:10px;">✅</div>
          <div style="font-size:14px;">No ${statusFilter} payouts</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        ${['pending','paid','rejected','all'].map(s =>
          `<button onclick="adminLoadAffiliatePayouts('${s}')"
            class="btn-secondary${s === statusFilter ? ' active' : ''}"
            style="font-size:12px;padding:7px 14px;">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`
        ).join('')}
      </div>
      <div class="tbl-wrap"><table>
        <thead>
          <tr>
            <th>User</th>
            <th>Amount</th>
            <th>M-Pesa #</th>
            <th>Requested</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${payouts.map(p => {
            const st  = p.status || 'pending';
            const cls = st === 'paid' ? 'completed' : st === 'rejected' ? 'failed' : 'pending';
            return `<tr>
              <td>
                <div style="font-weight:600;">${esc(p.user_name || '—')}</div>
                <div style="font-size:11px;color:var(--muted);">${esc(p.user_email || '—')}</div>
              </td>
              <td style="font-weight:800;color:var(--green);">${fmtKES(p.amount_kes)}</td>
              <td style="font-family:monospace;font-size:13px;">${esc(p.mpesa_phone || '—')}</td>
              <td style="font-size:12px;color:var(--muted);">${p.requested_at ? new Date(p.requested_at).toLocaleString('en-KE') : '—'}</td>
              <td><span class="status-pill ${cls}">${st}</span>
                ${p.mpesa_receipt ? `<div style="font-size:10px;color:var(--muted);">Rcpt: ${esc(p.mpesa_receipt)}</div>` : ''}
                ${p.admin_note    ? `<div style="font-size:10px;color:#ff9a3c;">${esc(p.admin_note)}</div>` : ''}
              </td>
              <td>
                ${st === 'pending' ? `
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button onclick="adminApproveAffPayout('${esc(p.id)}', '${esc(p.mpesa_phone)}', ${p.amount_kes})"
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
      </table></div>`;
  } catch (e) {
    container.innerHTML = `<div style="color:#ff6b6b;padding:20px;">${esc(e.message || 'Failed to load payouts')}</div>`;
  }
}

// ─── Approve flow ─────────────────────────────────────────────────────────────
function adminApproveAffPayout(payoutId, phone, amount) {
  const receipt = prompt(
    `Approving payout of ${fmtKES(amount)} to ${phone}\n\nEnter M-Pesa receipt number (or leave blank):`,
    ''
  );
  if (receipt === null) return; // cancelled

  _doApproveAffPayout(payoutId, receipt.trim());
}

async function _doApproveAffPayout(payoutId, receipt) {
  try {
    await api(`/affiliate/admin/payouts/${payoutId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ mpesa_receipt: receipt || null }),
    });
    toast('Payout approved and marked as paid ✅', 'success');
    adminLoadAffiliatePayouts('pending');
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
    adminLoadAffiliatePayouts('pending');
  } catch (e) {
    toast(e.message || 'Rejection failed', 'error');
  }
}

/* ════════════════════════════════════════════════════════════════════
 * ADD TO ADMIN PAGE HTML — paste inside your admin section:
 *
 * <div style="margin-top:32px;">
 *   <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;">
 *     💸 AFFILIATE PAYOUT QUEUE
 *   </div>
 *   <div id="adminAffiliatePayouts"></div>
 * </div>
 *
 * And call adminLoadAffiliatePayouts() inside your admin page init.
 * ════════════════════════════════════════════════════════════════════ */