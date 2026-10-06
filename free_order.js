/* ════════════════════ FREE BONUS ORDER ════════════════════
 * Every 5 completed paid orders = 1 free order (value = average of those 5).
 * Client: dashboard promo card (#dashFreeOrderCard) + modal (#freeOrderModal).
 * Staff (admin + CCR support): tab 'free-orders' -> #freeOrdersList.
 * Depends on: api(), toast(), esc(), fmtKES(), allServices, loadServices()
 * ════════════════════════════════════════════════════════ */

let _foState = null;
let _foMax = null;

async function freeOrderRefreshCard() {
  const card = document.getElementById('dashFreeOrderCard');
  if (!card) return;
  try {
    _foState = await api('/free-order/status');
  } catch (_) { return; }
  const desc = document.getElementById('dashFreeOrderDesc');
  const arrow = document.getElementById('dashFreeOrderArrow');
  const r = _foState.reward;
  const done = _foState.progress, need = _foState.required;
  if (r && r.status === 'available') {
    desc.textContent = r.reject_reason ? 'Request rejected — tap to fix & resend' : 'You earned a FREE order! Tap to claim';
    arrow.textContent = 'Claim →';
    card.classList.add('fo-ready');
  } else if (r && (r.status === 'pending' || r.status === 'approving')) {
    desc.textContent = 'Free order awaiting approval';
    arrow.textContent = 'View →';
    card.classList.remove('fo-ready');
  } else {
    desc.textContent = `${done}/${need} orders completed — order ${need} to get 1 free`;
    arrow.textContent = 'Open →';
    card.classList.remove('fo-ready');
  }
}

async function freeOrderOpen() {
  if (!_foState) await freeOrderRefreshCard();
  const m = document.getElementById('freeOrderModal');
  const body = document.getElementById('freeOrderBody');
  if (!m || !body || !_foState) return;
  const r = _foState.reward;
  const dots = Array.from({ length: _foState.required }, (_, i) =>
    `<span style="width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin:0 3px;${i < _foState.progress ? 'background:#3dd44a;color:#06210a;' : 'background:rgba(255,255,255,.08);color:var(--muted);'}">${i < _foState.progress ? '✓' : i + 1}</span>`).join('');

  if (!r) {
    body.innerHTML = `
      <div style="text-align:center;margin:10px 0 16px;">${dots}</div>
      <p style="color:var(--muted);font-size:14px;text-align:center;">Complete <b>${_foState.required}</b> paid orders and get <b>1 free order</b>. Its value is the average of your ${_foState.required} orders. You have <b>${_foState.progress}/${_foState.required}</b>.</p>
      <button class="btn-primary" onclick="freeOrderClose();navTo('services')">Place an order</button>`;
  } else if (r.status === 'pending' || r.status === 'approving') {
    body.innerHTML = `
      <p style="font-size:14px;margin-bottom:10px;">⏳ <b>Waiting for approval</b></p>
      <div style="font-size:13px;color:var(--muted);line-height:1.7;">
        Service: <b style="color:var(--white)">${esc(r.service_name || '')}</b><br>
        Quantity: <b style="color:var(--white)">${r.quantity}</b><br>
        Value: <b style="color:var(--white)">${fmtKES(r.value_kes || 0)}</b></div>`;
  } else if (r.status === 'available') {
    if (!allServices || !allServices.length) { try { await loadServices(); } catch (_) {} }
    const opts = (allServices || []).filter(s => s.is_active !== false)
      .map(s => `<option value="${s.service}">${esc(s.name)}</option>`).join('');
    body.innerHTML = `
      ${r.reject_reason ? `<div style="background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.3);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:10px;">Last request was rejected: ${esc(r.reject_reason)}</div>` : ''}
      <p style="font-size:14px;margin-bottom:12px;">🎁 You have a <b>free order</b> worth up to <b style="color:#3dd44a">${fmtKES(r.allowance_kes)}</b> (average of your last ${_foState.required} orders). No payment needed.</p>
      <div class="field"><label>Service</label>
        <select id="foService" onchange="freeOrderServiceChanged()" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px 16px;color:#fff;font-family:'Montserrat',sans-serif;font-size:14px;">
          <option value="">Select a service…</option>${opts}</select></div>
      <div class="field"><label>Profile or post link</label><input type="url" id="foLink" placeholder="https://…"/></div>
      <div class="field"><label>Quantity <span id="foRange" style="color:var(--muted);font-weight:400;"></span></label><input type="number" id="foQty" min="1" oninput="freeOrderCalc()"/></div>
      <div id="foCalc" style="font-size:13px;color:var(--muted);min-height:18px;margin:6px 0;"></div>
      <button class="btn-primary" id="foSubmitBtn" onclick="freeOrderSubmit()">Send for approval</button>`;
  } else {
    body.innerHTML = '<p>Your free order was approved and is on its way ✅</p>';
  }
  m.classList.add('show');
}

function freeOrderClose() { document.getElementById('freeOrderModal')?.classList.remove('show'); }

async function freeOrderServiceChanged() {
  const sid = document.getElementById('foService').value;
  _foMax = null;
  document.getElementById('foRange').textContent = '';
  document.getElementById('foCalc').textContent = '';
  if (!sid) return;
  try {
    _foMax = await api(`/free-order/max-quantity?service_id=${encodeURIComponent(sid)}`);
    document.getElementById('foRange').textContent = _foMax.usable ? `(${_foMax.min_quantity} – ${_foMax.max_quantity})` : '';
    if (!_foMax.usable) document.getElementById('foCalc').textContent = 'Your free order value is too low for this service — pick another.';
    else { const q = document.getElementById('foQty'); q.min = _foMax.min_quantity; q.max = _foMax.max_quantity; freeOrderCalc(); }
  } catch (e) { toast(e.message, 'error'); }
}

function freeOrderCalc() {
  const el = document.getElementById('foCalc');
  if (!_foMax || !_foMax.usable) return;
  const q = parseInt(document.getElementById('foQty').value, 10);
  if (!q) { el.textContent = ''; return; }
  const cost = (q / 1000) * _foMax.rate_kes;
  const bad = q < _foMax.min_quantity || q > _foMax.max_quantity;
  el.style.color = bad ? '#ff6b6b' : 'var(--muted)';
  el.textContent = bad ? `Quantity must be ${_foMax.min_quantity}–${_foMax.max_quantity}`
                       : `Value: ${fmtKES(cost)} of your ${fmtKES(_foMax.allowance_kes)} free allowance`;
}

async function freeOrderSubmit() {
  const btn = document.getElementById('foSubmitBtn');
  const service_id = parseInt(document.getElementById('foService').value, 10);
  const link = document.getElementById('foLink').value.trim();
  const quantity = parseInt(document.getElementById('foQty').value, 10);
  if (!service_id || !link || !quantity) { toast('Pick a service, paste the link and enter a quantity', 'error'); return; }
  btn.disabled = true;
  try {
    const res = await api('/free-order/request', { method: 'POST', body: JSON.stringify({ service_id, link, quantity }) });
    toast(res.message || 'Sent for approval', 'success');
    _foState = null;
    await freeOrderRefreshCard();
    await freeOrderOpen();
  } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
}

/* ───────────── Staff panel ───────────── */
async function loadAdminFreeOrders() {
  const el = document.getElementById('freeOrdersList');
  if (!el) return;
  const status = document.getElementById('freeOrdersFilter')?.value || 'pending';
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const rows = await api(`/free-order/staff/requests?status=${status}`);
    if (!rows.length) { el.innerHTML = '<div class="empty-state"><div class="icon">🎁</div><p>No free-order requests.</p></div>'; return; }
    el.innerHTML = `<table><thead><tr><th>Client</th><th>Service</th><th>Link</th><th>Qty</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `
      <tr>
        <td><strong>${esc(r.user?.name || '—')}</strong><div style="font-size:12px;color:var(--muted)">${esc(r.user?.phone || r.user?.email || '')}</div></td>
        <td>${esc(r.service_name || '')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;"><a href="${esc(r.link || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--green)">${esc(r.link || '')}</a></td>
        <td>${r.quantity ?? ''}</td>
        <td>${fmtKES(r.value_kes || 0)}<div style="font-size:11px;color:var(--muted)">cap ${fmtKES(r.allowance_kes)}</div></td>
        <td>${esc(r.status)}</td>
        <td>${r.status === 'pending' ? `
          <button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="adminFreeOrderApprove('${r.id}',this)">Approve</button>
          <button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="adminFreeOrderReject('${r.id}')">Reject</button>` : (r.bonus_order_id ? `#${esc(r.bonus_order_id.slice(0,8))}` : '')}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

async function adminFreeOrderApprove(id, btn) {
  if (!confirm('Approve and send this free order to the provider?')) return;
  btn.disabled = true;
  try {
    await api(`/free-order/staff/${id}/approve`, { method: 'POST' });
    toast('Approved — sent to provider', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loadAdminFreeOrders();
}

async function adminFreeOrderReject(id) {
  const reason = prompt('Reason for rejecting (shown to the client):');
  if (!reason || reason.trim().length < 3) return;
  try {
    await api(`/free-order/staff/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) });
    toast('Rejected — client can resubmit', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loadAdminFreeOrders();
}
