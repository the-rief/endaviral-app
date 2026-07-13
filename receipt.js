// receipt.js
// ════════════════════════════════════════════════════════════════════════
// EndaViral Connect — payment receipt UI + download.
//
// Split out of connect.js (same reasoning as auth.js / admin.js / chat.js /
// account.js): receipts are a self-contained concern touched by both the
// business side (Campaign Funding Receipt) and the creator side (Creator
// Payout Receipt), so they get their own file instead of living inside the
// much bigger connect.js.
//
// Depends on globals already defined by connect.js / the page shell: api(),
// API, token, toast(), esc(), fmtKES(). Load this file AFTER connect.js.
//
// Backend PDF generation requires `reportlab` to be installed on the
// server (see app/services/connect_service.py). If downloads fail with
// "Receipt generation is temporarily unavailable" (HTTP 503), that's the
// server missing the reportlab dependency — add it to requirements.txt
// and redeploy; nothing on the frontend can fix that.
// ════════════════════════════════════════════════════════════════════════

// ─── Shared download helper ─────────────────────────────────────────────────
async function _cnFetchReceiptBlob(url) {
  const headers = {};
  if (typeof token !== 'undefined' && token) headers['Authorization'] = 'Bearer ' + token;
  let resp;
  try {
    resp = await fetch(url, { headers });
  } catch (e) {
    toast('Cannot reach the server. Please try again.', 'error');
    return null;
  }
  if (!resp.ok) {
    let msg = 'Could not download receipt';
    try { const data = await resp.json(); msg = data.detail || msg; } catch (_) {}
    toast(msg, 'error');
    return null;
  }
  return resp;
}

function _cnSaveBlobAsFile(blob, disposition, fallbackName) {
  const match = (disposition || '').match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Payment receipts (business) ────────────────────────────────────────────
async function _cnLoadReceipts(campaignId) {
  const el = document.getElementById('cnReceiptsArea');
  if (!el) return;
  let rows;
  try {
    rows = await api(`/connect/campaigns/${campaignId}/fundings`);
  } catch (e) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;">Could not load payment history.</div>`;
    return;
  }
  const successful = (rows || []).filter(r => r.status === 'success');
  if (!successful.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px;">No completed payments yet.</div>`;
    return;
  }
  el.innerHTML = successful.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;">
      <div>
        <div style="font-size:12.5px;font-weight:700;color:var(--white);">${fmtKES(r.total_charge_kes)} paid</div>
        <div style="font-size:11px;color:var(--muted);">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}${r.mpesa_receipt ? ' · ' + esc(r.mpesa_receipt) : ''}</div>
      </div>
      <button class="btn-secondary" style="padding:6px 12px;font-size:11.5px;" onclick="_cnDownloadReceipt('${campaignId}','${r.checkout_request_id}')">⬇️ Receipt</button>
    </div>
  `).join('');
}

async function _cnDownloadReceipt(campaignId, checkoutRequestId) {
  const url = `${API}/connect/campaigns/${campaignId}/funding/${encodeURIComponent(checkoutRequestId)}/receipt`;
  const resp = await _cnFetchReceiptBlob(url);
  if (!resp) return;
  const blob = await resp.blob();
  _cnSaveBlobAsFile(blob, resp.headers.get('Content-Disposition'), 'EndaViral-Receipt.pdf');
}

// ─── Payout receipt (creator) ───────────────────────────────────────────────
async function _cnDownloadPayoutReceipt(campaignId) {
  const url = `${API}/connect/campaigns/${campaignId}/payout/receipt`;
  const resp = await _cnFetchReceiptBlob(url);
  if (!resp) return;
  const blob = await resp.blob();
  _cnSaveBlobAsFile(blob, resp.headers.get('Content-Disposition'), 'EndaViral-Payout-Receipt.pdf');
}