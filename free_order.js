/* ════════════════════ FREE BONUS ORDER ════════════════════
 * Every 5 completed paid orders = 1 free order (value = average of those 5).
 * Client: dashboard promo card (#dashFreeOrderCard) + modal (#freeOrderModal).
 * Staff (admin + CCR support): tab 'free-orders' -> #freeOrdersList.
 * Depends on: api(), toast(), esc(), fmtKES()
 * ════════════════════════════════════════════════════════ */

let _foState = null;

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
    const left = Math.max(0, _foState.required - _foState.progress);
    body.innerHTML = `
      <div style="text-align:center;margin:10px 0 16px;">${dots}</div>
      <p style="font-size:15px;text-align:center;margin-bottom:8px;">You've completed <b>${_foState.progress} of ${_foState.required}</b> orders.</p>
      <p style="color:var(--muted);font-size:14px;text-align:center;line-height:1.6;">Complete <b style="color:var(--white)">${left} more</b> to unlock <b style="color:#3dd44a">1 free order</b>. Its value is the average of your ${_foState.required} orders, and only completed orders count.</p>
      <button class="btn-primary" style="margin-top:14px;" onclick="freeOrderClose();navTo('services')">Place an order</button>`;
  } else if (r.status === 'pending' || r.status === 'approving') {
    body.innerHTML = `
      <div style="text-align:center;margin:6px 0 14px;"><div style="font-size:40px;">✅</div>
        <p style="font-size:16px;font-weight:700;margin:6px 0 4px;">Free order received!</p>
        <p style="font-size:13.5px;color:var(--muted);line-height:1.6;">Our team is reviewing it now. Once approved it starts automatically and shows up in your orders as <b style="color:var(--white)">🎁 Free</b>. No payment needed.</p></div>
      <div style="font-size:13px;color:var(--muted);line-height:1.8;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04);">
        Service: <b style="color:var(--white)">${esc(r.service_name || '')}</b><br>
        Quantity: <b style="color:var(--white)">${(r.quantity || 0).toLocaleString()}</b><br>
        Link: <b style="color:var(--white);word-break:break-all;">${esc(r.link || '')}</b></div>`;
  } else if (r.status === 'available') {
    const list = _foState.allowed_services || [];
    const single = list.length === 1 && list[0].usable;
    _foFlow = { step: single ? 'details' : 'service', svc: single ? list[0] : null, reward: r, single };
    _foRender();
  } else {
    body.innerHTML = '<p>Your free order was approved and is on its way ✅</p>';
  }
  m.classList.add('show');
}

function freeOrderClose() { document.getElementById('freeOrderModal')?.classList.remove('show'); }

/* ───────────── Pick flow: one of the services from their last 5 orders → link ───────────── */
let _foFlow = null;

function _foHeader(r) {
  return `${r.reject_reason ? `<div style="background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.3);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:10px;">Last request was rejected: ${esc(r.reject_reason)}</div>` : ''}
    <p style="font-size:14px;margin-bottom:12px;">🎁 You have a <b>free order</b> worth up to <b style="color:#3dd44a">${fmtKES(r.allowance_kes)}</b> (average of your last ${_foState.required} orders). No payment needed.</p>`;
}

function _foGo(step) { _foFlow.svc = null; _foFlow.step = step; _foRender(); }

function _foRender() {
  const body = document.getElementById('freeOrderBody');
  const f = _foFlow, r = f.reward;
  let html = _foHeader(r);

  if (f.step === 'service') {
    const list = _foState.allowed_services || [];
    html += `<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Pick one of your recent services</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${list.map(s => s.usable ? `
        <div onclick="_foPickService(${s.service})" style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>
          ${s.replaces ? `<div style="font-size:11.5px;color:#ffc107;margin-bottom:4px;">Closest match to "${esc(s.replaces)}" (unavailable)</div>` : ''}
          <div style="font-size:12px;color:var(--muted);">You get <b style="color:#3dd44a">${s.quantity.toLocaleString()}</b> free</div>
        </div>` : `
        <div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);opacity:.55;">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>
          <div style="font-size:12px;color:var(--muted);">Currently unavailable</div>
        </div>`).join('') || '<p style="color:var(--muted)">No eligible services found. Please contact support.</p>'}</div>`;

  } else if (f.step === 'details') {
    const s = f.svc;
    html += (f.single ? '' : `<div onclick="_foGo('service')" style="cursor:pointer;color:var(--muted);font-size:13px;margin-bottom:10px;">← Back</div>`) + `
      <div style="padding:12px 14px;border-radius:12px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.25);margin-bottom:12px;">
        <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>
        ${s.replaces ? `<div style="font-size:11.5px;color:#ffc107;margin-bottom:4px;">Closest match to "${esc(s.replaces)}" (unavailable)</div>` : ''}
        <div style="font-size:12px;color:var(--muted);">Quantity: <b style="color:#3dd44a">${s.quantity.toLocaleString()}</b> (set automatically)</div>
      </div>
      <div class="field"><label>Profile or post link</label><input type="url" id="foLink" placeholder="https://…"/></div>
      <button class="btn-primary" id="foSubmitBtn" onclick="freeOrderSubmit()">Send for approval</button>`;
  }
  body.innerHTML = html;
}

function _foPickService(id) {
  _foFlow.svc = (_foState.allowed_services || []).find(s => s.service === id);
  _foFlow.step = 'details';
  _foRender();
}

async function freeOrderSubmit() {
  const btn = document.getElementById('foSubmitBtn');
  const service_id = _foFlow.svc?.service;
  const link = document.getElementById('foLink').value.trim();
  if (!service_id || !link) { toast('Paste your profile or post link', 'error'); return; }
  btn.disabled = true;
  try {
    const res = await api('/free-order/request', { method: 'POST', body: JSON.stringify({ service_id, link }) });
    toast('Free order received! We\'ll start it once approved.', 'success');
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
  loadFreeOrderStats();
  try {
    const rows = await api(`/free-order/staff/requests?status=${status}`);
    if (!rows.length) { el.innerHTML = '<div class="empty-state"><div class="icon">🎁</div><p>No free-order requests.</p></div>'; return; }
    el.innerHTML = `<table><thead><tr><th>Client</th><th>Service</th><th>Link</th><th>Qty</th><th>Value</th><th>Status</th><th>Delivery</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `
      <tr>
        <td><strong>${esc(r.user?.name || '—')}</strong><div style="font-size:12px;color:var(--muted)">${esc(r.user?.phone || r.user?.email || '')}</div></td>
        <td>${esc(r.service_name || '')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;"><a href="${esc(r.link || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--green)">${esc(r.link || '')}</a></td>
        <td>${r.quantity ?? ''}</td>
        <td>${fmtKES(r.value_kes || 0)}<div style="font-size:11px;color:var(--muted)">cap ${fmtKES(r.allowance_kes)}</div></td>
        <td>${esc(r.status)}</td>
        <td>${esc(r.order_status || '—')}</td>
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


async function loadFreeOrderStats() {
  const el = document.getElementById('freeOrdersStats');
  if (!el) return;
  try {
    const d = await api('/free-order/staff/stats');
    const card = (label, val, color) => `<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:${color || 'var(--white)'};">${val}</div>
      <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${label}</div></div>`;
    const dl = d.delivery || {};
    el.innerHTML =
      card('Earned', d.earned) + card('Unclaimed', d.unclaimed) + card('Awaiting approval', d.pending, '#ffc107') +
      card('Approved', d.approved, '#3dd44a') + card('Completed', dl.completed || 0, '#3dd44a') +
      card('In progress', (dl.processing || 0) + (dl.pending || 0) + (dl.inprogress || 0)) +
      card('Failed / cancelled', (dl.failed || 0) + (dl.cancelled || 0) + (dl.partial || 0), '#ff6b6b') +
      card('Completion rate', d.completion_rate == null ? '—' : d.completion_rate + '%') +
      card('Value given', fmtKES(d.value_given_kes)) +
      card('Avg approval', d.avg_approval_minutes == null ? '—' : d.avg_approval_minutes + ' min');
  } catch (_) { el.innerHTML = ''; }
}
