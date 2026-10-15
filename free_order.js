/* ════════════════════ FREE BONUS ORDER ════════════════════
 * Every 5 completed paid orders = 1 free order (value = average of those 5).
 * Client: dashboard promo card (#dashFreeOrderCard) + modal (#freeOrderModal).
 * Staff (admin + CCR support): tab 'free-orders' -> #freeOrdersList.
 * Depends on: api(), toast(), esc(), fmtKES()
 * ════════════════════════════════════════════════════════ */

let _foState = null;
let _foTimer = null;

const _FO_STATUS = {
  pending:   ['Delivering', '#ffc107'],
  processing:['Delivering', '#ffc107'],
  completed: ['Delivered ✅', '#3dd44a'],
  partial:   ['Partially delivered', '#ff9800'],
  failed:    ['Failed — support is fixing it', '#ff6b6b'],
  cancelled: ['Cancelled — support is fixing it', '#ff6b6b'],
};
const _foPlural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function _foDots(done, total) {
  return Array.from({ length: total }, (_, i) =>
    `<span style="width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin:0 3px;${i < done ? 'background:#3dd44a;color:#06210a;' : 'background:rgba(255,255,255,.08);color:var(--muted);'}">${i < done ? '✓' : i + 1}</span>`).join('');
}

async function freeOrderRefreshCard() {
  const card = document.getElementById('dashFreeOrderCard');
  if (!card) return;
  // Signed out: never call the API. (Previously this kept polling after
  // logout, got a 401 every minute and popped "Your session has expired"
  // on the login screen.)
  if (typeof token === 'undefined' || !token) return;
  try {
    _foState = await api('/free-order/status');
  } catch (_) { return; }
  // No timer: each status check runs several database queries, and a
  // 60-second poll kept the (Neon) database awake for as long as anyone
  // had the dashboard open. The card refreshes on login, whenever the Free
  // Order card is opened, and the moment a free-order update arrives over
  // the live connection (auth.js → ticket_reply).

  const desc = document.getElementById('dashFreeOrderDesc');
  const arrow = document.getElementById('dashFreeOrderArrow');
  const s = _foState, r = s.reward, act = s.active;
  const more = _foPlural(s.remaining, 'more order');
  card.classList.remove('fo-ready');
  if (r && r.status === 'available') {
    desc.textContent = r.reject_reason ? 'Request rejected — tap to fix & resend' : 'You earned a FREE order! Tap to claim';
    arrow.textContent = 'Claim →';
    card.classList.add('fo-ready');
  } else if (r && (r.status === 'pending' || r.status === 'approving')) {
    desc.textContent = 'Free order awaiting approval';
    arrow.textContent = 'View →';
  } else if (act) {
    desc.textContent = 'Your free order is being delivered';
    arrow.textContent = 'Track →';
  } else if (s.received_count > 0) {
    desc.textContent = `${_foPlural(s.received_count, 'free order')} received · next in ${more}`;
    arrow.textContent = 'Open →';
  } else {
    desc.textContent = `${s.progress}/${s.required} completed — ${more} to your first free order`;
    arrow.textContent = 'Open →';
  }
}

function _foProgressBlock(s) {
  const nextWord = s.received_count > 0 ? 'next' : 'first';
  const afterThis = s.reward ? ' after this one' : '';
  return `
    <div style="text-align:center;margin:10px 0 12px;">${_foDots(s.progress, s.required)}</div>
    <p style="font-size:15px;text-align:center;margin-bottom:6px;">You've completed <b>${s.progress} of ${s.required}</b> orders${s.reward ? ' toward your next free order' : ''}.</p>
    <p style="color:var(--muted);font-size:13.5px;text-align:center;line-height:1.6;">Complete <b style="color:var(--white)">${_foPlural(s.remaining, 'more order')}</b>${afterThis} to unlock your ${nextWord} <b style="color:#3dd44a">free order</b>. Its value is the average of those ${s.required} orders, and only completed orders count.</p>`;
}

function _foHistoryBlock(s) {
  const hist = s.history || [];
  if (!hist.length) return '';
  const rows = hist.slice(0, 5).map(h => {
    const [label, color] = _FO_STATUS[h.order_status] || ['Approved', 'var(--muted)'];
    const d = h.approved_at ? new Date(h.approved_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);font-size:12.5px;">
      <div style="min-width:0;"><div style="font-weight:600;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(h.service_name || '')}</div>
        <div style="color:var(--muted);">${(h.quantity || 0).toLocaleString()} · ${d}</div></div>
      <div style="color:${color};font-weight:700;white-space:nowrap;">${label}</div></div>`;
  }).join('');
  return `<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);">
    <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Your free orders · ${s.received_count} received</div>${rows}</div>`;
}

function _foActiveBlock(a) {
  const [label, color] = _FO_STATUS[a.order_status] || ['Delivering', '#ffc107'];
  return `<div style="padding:12px 14px;border-radius:12px;background:rgba(255,193,7,.07);border:1px solid rgba(255,193,7,.3);margin-bottom:6px;">
    <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:4px;">🎁 FREE ORDER · ${label}</div>
    <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(a.service_name || '')}</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.6;">Quantity: <b style="color:var(--white)">${(a.quantity || 0).toLocaleString()}</b><br>Track it in <b style="color:var(--white)">My Orders</b>. Keep your account public and active while it delivers.</div></div>`;
}

async function freeOrderOpen() {
  await freeOrderRefreshCard();          // always show fresh numbers
  const m = document.getElementById('freeOrderModal');
  const body = document.getElementById('freeOrderBody');
  if (!m || !body || !_foState) return;
  const s = _foState, r = s.reward;

  if (!r) {
    body.innerHTML = (s.active ? _foActiveBlock(s.active) : '') + _foProgressBlock(s)
      + `<button class="btn-primary" style="margin-top:14px;" onclick="freeOrderClose();navTo('services')">Place an order</button>`
      + _foHistoryBlock(s);
  } else if (r.status === 'pending' || r.status === 'approving') {
    body.innerHTML = `
      <div style="text-align:center;margin:6px 0 14px;"><div style="font-size:40px;">✅</div>
        <p style="font-size:16px;font-weight:700;margin:6px 0 4px;">Free order received!</p>
        <p style="font-size:13.5px;color:var(--muted);line-height:1.6;">Our team is reviewing it now. Once approved it starts automatically and shows up in your orders as <b style="color:var(--white)">🎁 Free</b>. No payment needed.</p></div>
      <div style="font-size:13px;color:var(--muted);line-height:1.8;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04);">
        Service: <b style="color:var(--white)">${esc(r.service_name || '')}</b><br>
        Quantity: <b style="color:var(--white)">${(r.quantity || 0).toLocaleString()}</b><br>
        Link: <b style="color:var(--white);word-break:break-all;">${esc(r.link || '')}</b></div>`
      + _foProgressBlock(s) + _foHistoryBlock(s);
  } else {
    const list = s.allowed_services || [];
    const single = list.length === 1 && list[0].usable && !(list[0].alternatives || []).length;
    _foFlow = { step: single ? 'details' : 'service', svc: single ? list[0] : null, reward: r, single };
    _foRender();
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
    const card = 'padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;';
    const usableCount = list.filter(x => x.usable).length + list.reduce((n, x) => n + (x.alternatives || []).length, 0);
    html += `<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Pick one of your recent services</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${list.map((s, i) => s.usable ? `
        <div role="button" tabindex="0" onclick="_foPickService(${s.service}, -1)" style="${card}">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>
          <div style="font-size:12px;color:var(--muted);">You get <b style="color:#3dd44a">${s.quantity.toLocaleString()}</b> free</div>
        </div>` : `
        <div style="padding:12px 14px;border-radius:12px;background:rgba(255,193,7,.05);border:1px dashed rgba(255,193,7,.35);">
          <div style="font-size:13.5px;font-weight:600;margin-bottom:2px;text-decoration:line-through;opacity:.7;">${esc(s.name)}</div>
          ${(s.alternatives || []).length ? `
            <div style="font-size:12px;color:#ffc107;margin-bottom:8px;">No longer available — choose a similar service instead:</div>
            <div style="display:flex;flex-direction:column;gap:6px;">${s.alternatives.map(a => `
              <div role="button" tabindex="0" onclick="_foPickService(${a.service}, ${i})" style="${card}padding:10px 12px;">
                <div style="font-size:13px;font-weight:600;margin-bottom:3px;">${esc(a.name)}</div>
                <div style="font-size:12px;color:var(--muted);">You get <b style="color:#3dd44a">${a.quantity.toLocaleString()}</b> free${a.match === 'same_type' ? ' · <span style="color:#3dd44a;">same kind</span>' : ''}</div>
              </div>`).join('')}</div>` : `
            <div style="font-size:12px;color:var(--muted);margin:2px 0 8px;">No longer available, and there's no similar service right now.</div>
            <button class="btn-secondary" style="padding:8px 12px;font-size:12.5px;" onclick="_foAskSupport(${i})">💬 Ask support to choose one</button>`}
        </div>`).join('') || '<p style="color:var(--muted)">No eligible services found. Please contact support.</p>'}</div>
      ${list.length && !usableCount ? '<p style="color:var(--muted);font-size:13px;margin-top:10px;">None of these services can be used right now. Ask support and we\'ll sort it out — your free order stays saved.</p>' : ''}`;

  } else if (f.step === 'details') {
    const s = f.svc;
    html += (f.single ? '' : `<div onclick="_foGo('service')" style="cursor:pointer;color:var(--muted);font-size:13px;margin-bottom:10px;">← Back</div>`) + `
      <div style="padding:12px 14px;border-radius:12px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.25);margin-bottom:12px;">
        <div style="font-size:13.5px;font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>
        ${s.replaces ? `<div style="font-size:11.5px;color:#ffc107;margin-bottom:4px;">Instead of "${esc(s.replaces)}" (no longer available)</div>` : ''}
        <div style="font-size:12px;color:var(--muted);">Quantity: <b style="color:#3dd44a">${s.quantity.toLocaleString()}</b> (set automatically)</div>
      </div>
      <div class="field"><label>Profile or post link</label><input type="url" id="foLink" placeholder="https://…"/></div>
      <button class="btn-primary" id="foSubmitBtn" onclick="freeOrderSubmit()">Send for approval</button>`;
  }
  body.innerHTML = html;
}

// fromIdx = -1 → one of their own services; otherwise the index of the
// unavailable service this alternative replaces.
function _foPickService(id, fromIdx) {
  const list = _foState.allowed_services || [];
  let svc = null;
  if (fromIdx >= 0 && list[fromIdx]) {
    const a = (list[fromIdx].alternatives || []).find(x => x.service === id);
    if (a) svc = { ...a, replaces: list[fromIdx].name };
  } else {
    svc = list.find(s => s.usable && s.service === id) || null;
  }
  if (!svc) return;
  _foFlow.svc = svc;
  _foFlow.step = 'details';
  _foRender();
}

function _foAskSupport(idx) {
  const gone = ((_foState.allowed_services || [])[idx] || {}).name || 'my service';
  freeOrderClose();
  const prefill = () => {
    if (typeof window.evOpenNewTicketForm === 'function') window.evOpenNewTicketForm();
    const desc = document.getElementById('ev-nt-desc');
    if (desc) { desc.value = `Free order: "${gone}" is no longer available and there's no similar service to pick. Please help me choose one.`; desc.focus(); }
  };
  const win = document.getElementById('ev-chat-window');
  if (typeof window.evChatToggle === 'function' && win && !win.classList.contains('open')) { window.evChatToggle(); setTimeout(prefill, 150); }
  else prefill();
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
    if (!rows.length) { el.classList.remove('fo-has-cards'); el.innerHTML = '<div class="empty-state"><div class="icon">🎁</div><p>No free-order requests.</p></div>'; return; }
    el.classList.add('fo-has-cards');
    el.innerHTML = `<table><thead><tr><th>Client</th><th>Service</th><th>Link</th><th>Qty</th><th>Value</th><th>Status</th><th>Delivery</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `
      <tr>
        <td><strong>${esc(r.user?.name || '—')}</strong><div style="font-size:12px;color:var(--muted)">${esc(r.user?.phone || r.user?.email || '')}</div></td>
        <td>${esc(r.service_name || '')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;"><a href="${esc(r.link || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--green)">${esc(r.link || '')}</a></td>
        <td>${r.quantity ?? ''}</td>
        <td>${fmtKES(r.value_kes || 0)}<div style="font-size:11px;color:var(--muted)">cap ${fmtKES(r.allowance_kes)}</div></td>
        <td>${_foStatusLabel(r)}</td>
        <td>${esc(r.order_status || '—')}</td>
        <td style="white-space:nowrap;">${_foStaffActions(r)}</td>
      </tr>`).join('')}</tbody></table>
    <div class="fo-cards">${rows.map(r => `
      <div class="fo-card">
        <div class="fo-card-top">
          <div style="min-width:0;"><strong>${esc(r.user?.name || '—')}</strong>
            <div class="fo-muted">${esc(r.user?.phone || r.user?.email || '')}</div></div>
          <div class="fo-status">${_foStatusLabel(r)}</div>
        </div>
        <div class="fo-card-svc">${esc(r.service_name || '')}</div>
        <div class="fo-muted">${(r.quantity ?? 0).toLocaleString()} qty · ${fmtKES(r.value_kes || 0)} <span>(cap ${fmtKES(r.allowance_kes)})</span>${r.order_status ? ` · delivery: <b>${esc(r.order_status)}</b>` : ''}</div>
        ${r.link ? `<a class="fo-card-link" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">${esc(r.link)}</a>` : ''}
        <div class="fo-card-actions">${_foStaffActions(r)}</div>
      </div>`).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

// A request is "stuck" when approval started but never finished (server
// restart mid-approval, or the provider never answered). Matches
// STUCK_AFTER in app/services/free_order.py.
const _FO_STUCK_MS = 90 * 1000;
function _foIsStuck(r) {
  return r.status === 'approving' && r.reviewed_at && (Date.now() - new Date(r.reviewed_at).getTime()) > _FO_STUCK_MS;
}
function _foIsOwn(r) {
  return currentUser && r.user && r.user.id === currentUser.id && currentUser.role !== 'admin';
}
function _foStatusLabel(r) {
  if (r.status === 'approving') return _foIsStuck(r)
    ? '<span style="color:#ff6b6b;font-weight:700;">⚠️ Needs checking</span>'
    : '<span style="color:#ffc107;">Approving…</span>';
  return esc(r.status);
}
function _foStaffActions(r) {
  const b = (label, fn) => `<button class="btn-secondary fo-act" onclick="${fn}">${label}</button>`;
  if (_foIsOwn(r)) return '<span class="fo-muted">Your own — another team member must handle it</span>';
  if (r.status === 'pending') return b('Approve', `adminFreeOrderApprove('${r.id}',this)`) + b('Reject', `adminFreeOrderReject('${r.id}')`);
  if (_foIsStuck(r)) return b('Resolve', `adminFreeOrderResolve('${r.id}',this)`);
  if (r.status === 'approving') return '<span class="fo-muted">Sending to provider… refresh in a minute</span>';
  if (r.status === 'approved' && ['failed','cancelled','partial'].includes(r.order_status)) return b('Restore', `adminFreeOrderRegrant('${r.id}',this)`);
  return r.bonus_order_id ? `<span class="fo-muted">#${esc(r.bonus_order_id.slice(0,8))}</span>` : '';
}

async function adminFreeOrderResolve(id, btn) {
  const v = prompt(
    'This free order was sent to the provider but we never got a clear answer.\n\n' +
    'Check the provider panel for this link:\n' +
    '• If the order IS there, enter the provider\'s order ID.\n' +
    '• If it is NOT there, leave this empty and press OK — it goes back to Pending so you can approve again.');
  if (v === null) return;                       // cancelled
  const providerId = v.trim();
  if (providerId && !/^\d+$/.test(providerId)) { toast('Provider order ID must be a number', 'error'); return; }
  if (!providerId && !confirm('Confirm: the order is NOT in the provider panel. Put it back to Pending?')) return;
  if (btn) btn.disabled = true;
  try {
    const res = await api(`/free-order/staff/${id}/resolve`, { method: 'POST', body: JSON.stringify({ provider_order_id: providerId || null }) });
    toast(res.message || 'Resolved', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loadAdminFreeOrders();
}

async function adminFreeOrderApprove(id, btn) {
  if (!confirm('Approve and send this free order to the provider?')) return;
  btn.disabled = true;
  try {
    await api(`/free-order/staff/${id}/approve`, { method: 'POST' });
    toast('Approved — sent to provider', 'success');
  } catch (e) {
    // "Couldn't confirm with the provider" must be read, not missed in a 4s toast.
    if (/Resolve/.test(e.message || '')) alert(e.message); else toast(e.message, 'error');
  }
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


async function adminFreeOrderRegrant(id, btn) {
  if (!confirm('Give this client their free order back? Use it when the free order failed, was cancelled or only partly delivered.')) return;
  btn.disabled = true;
  try {
    await api(`/free-order/staff/${id}/regrant`, { method: 'POST' });
    toast('Free order restored — client notified', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loadAdminFreeOrders();
}

/* Staff list: cards on phones (the 8-column table hid Approve/Reject off-screen). */
(function () {
  const css = `
  .fo-cards{display:none;}
  @media(max-width:768px){
    .tbl-wrap.fo-has-cards > table{display:none;}
    .tbl-wrap.fo-has-cards{overflow:hidden;}
    .fo-cards{display:flex;flex-direction:column;}
  }
  .fo-card{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:6px;font-size:13.5px;}
  .fo-card:last-child{border-bottom:none;}
  .fo-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}
  .fo-status{font-size:12px;white-space:nowrap;text-transform:capitalize;}
  .fo-card-svc{font-weight:600;line-height:1.35;word-break:break-word;}
  .fo-muted{color:var(--muted);font-size:12px;}
  .fo-card-link{color:var(--green);font-size:12.5px;word-break:break-all;}
  .fo-card-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
  .fo-card-actions .fo-act{flex:1;min-width:110px;padding:10px 12px;}
  .fo-act{padding:6px 12px;font-size:12px;margin:2px 4px 2px 0;}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

// The dashboard can finish loading before this file does (it's near the end
// of the page), in which case loadDashboard() skipped the card refresh.
// Catch up once. Duplicate calls are free: api() shares in-flight GETs.
if (typeof token !== 'undefined' && token) setTimeout(() => freeOrderRefreshCard(), 0);
