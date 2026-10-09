/* ═══════════════ SUPPORT → REORDER QUEUE ═══════════════
 * Every midnight the backend flags each FAILED / PARTIAL / CANCELLED order that
 * has a provider order id or a successful M-Pesa payment (services/reorder_queue.py).
 * Next morning an admin or CCR agent works this list:
 *   1. "Message client"  – asks them (in a support thread) to resend their link
 *   2. "Reorder"         – once they reply, paste the new link → the order is
 *                          re-placed at no charge straight to the provider
 *   3. "Dismiss"         – nothing to redo
 * Lives inside the Support tab (#ap-support) so CCR agents get it too.
 * Depends on globals: api(), toast(), esc(), currentUser, openSupportThread().
 * ════════════════════════════════════════════════════════════════ */

let _rqTasks = [];
let _rqView = 'threads';

const RQ_REASON = {
  failed:    { label: 'FAILED',    color: '#ff5252' },
  partial:   { label: 'PARTIAL',   color: '#ffb347' },
  cancelled: { label: 'CANCELLED', color: '#9aa4b2' },
};
const RQ_STATUS = {
  pending:    { label: 'Needs contact', color: '#ff5252' },
  contacted:  { label: 'Contacted',     color: '#ffb347' },
  reordering: { label: 'Reordering…',   color: '#4da3ff' },
  reordered:  { label: 'Reordered ✓',   color: '#3dd44a' },
  dismissed:  { label: 'Dismissed',     color: '#9aa4b2' },
};

function rqShowView(view) {
  _rqView = view;
  const threads = document.getElementById('supportThreadsView');
  const queue = document.getElementById('reorderQueuePane');
  if (!threads || !queue) return;
  threads.style.display = view === 'threads' ? '' : 'none';
  queue.style.display = view === 'queue' ? '' : 'none';
  const on = 'border-color:var(--green);color:var(--green);', off = '';
  const t = document.getElementById('rqTabThreads'), q = document.getElementById('rqTabQueue');
  if (t) t.style.cssText = view === 'threads' ? on : off;
  if (q) q.style.cssText = view === 'queue' ? on : off;
  if (view === 'queue') rqLoad();
}

async function rqRefreshBadge() {
  try {
    const s = await api('/reorders/summary');
    const b = document.getElementById('rqBadge');
    if (!b) return;
    b.textContent = s.open || 0;
    b.style.display = (s.open || 0) > 0 ? 'inline-block' : 'none';
  } catch (_) {}
}

async function rqLoad() {
  const pane = document.getElementById('reorderQueuePane');
  if (!pane) return;
  const status = document.getElementById('rqFilterStatus')?.value || 'open';
  const q = document.getElementById('rqSearch')?.value || '';
  if (!document.getElementById('rqList')) {
    pane.innerHTML = `
      <div class="sec-hd">
        <div>
          <div class="sec-title">REORDER QUEUE</div>
          <div class="sec-sub">Failed, partial & cancelled orders that were paid via M-Pesa or reached the provider — flagged every midnight. Ask the client for a fresh link, then reorder for them.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="rqSearch" placeholder="Search name, email, phone, order, receipt" onkeydown="if(event.key==='Enter')rqLoad()" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--white);font-size:12px;min-width:230px;outline:none;"/>
          <select id="rqFilterStatus" onchange="rqLoad()" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--white);font-size:12px;font-weight:600;outline:none;">
            <option value="open">Open (needs action)</option>
            <option value="pending">Needs contact</option>
            <option value="contacted">Contacted</option>
            <option value="reordered">Reordered</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
          <button class="btn-secondary" onclick="rqLoad()">↻ Refresh</button>
          <button class="btn-secondary" onclick="rqFlagNow()" title="Flag new failed/partial/cancelled orders now instead of waiting for midnight">⚑ Flag now</button>
          <button class="btn-primary" onclick="rqMessageAll()">✉ Message all unsent</button>
        </div>
      </div>
      <div id="rqList"></div>`;
  }
  const list = document.getElementById('rqList');
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const data = await api(`/reorders/?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`);
    _rqTasks = data.tasks || [];
    list.innerHTML = _rqTasks.length ? _rqTasks.map(rqCard).join('')
      : `<div style="text-align:center;padding:50px 20px;color:var(--muted);"><div style="font-size:38px;margin-bottom:10px;">🎉</div><div style="font-size:14px;font-weight:600;">Nothing to redo</div><div style="font-size:12px;margin-top:6px;">New failed, partial or cancelled orders are flagged every midnight.</div></div>`;
  } catch (e) {
    list.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
  rqRefreshBadge();
}

function rqCard(t) {
  const r = RQ_REASON[t.reason] || { label: (t.reason || '').toUpperCase(), color: '#9aa4b2' };
  const s = RQ_STATUS[t.status] || { label: t.status, color: '#9aa4b2' };
  const open = t.status === 'pending' || t.status === 'contacted';
  const pay = t.mpesa_receipt ? `M-Pesa <b>${esc(t.mpesa_receipt)}</b>`
    : t.paid_via_mpesa ? 'M-Pesa paid (receipt pending)' : 'No M-Pesa payment on order';
  const qtyTxt = t.reason === 'partial' && t.remains ? `${Number(t.remains).toLocaleString()} left of ${Number(t.quantity).toLocaleString()}` : Number(t.quantity || 0).toLocaleString();
  const badge = (txt, c) => `<span style="font-size:10px;font-weight:800;letter-spacing:.5px;padding:3px 9px;border-radius:20px;border:1px solid ${c};color:${c};">${txt}</span>`;
  return `<div style="border:1px solid var(--border);border-left:3px solid ${r.color};border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--card);">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
      <div style="font-weight:700;font-size:14px;">${esc(t.service_name || 'Order')} <span style="color:var(--muted);font-weight:500;font-size:12px;">· #${esc(t.order_id.slice(0, 8))} · ${esc(qtyTxt)}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">${badge(r.label, r.color)}${badge(s.label, s.color)}</div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7;">
      👤 <b style="color:var(--white);">${esc(t.user.name || '—')}</b> · ${esc(t.user.email || '')} ${t.phone ? '· 📞 ' + esc(t.phone) : ''}<br>
      💳 ${pay}${t.provider_order_id ? ' · Provider order <b>' + esc(t.provider_order_id) + '</b>' : ''} · KES ${Number(t.charge || 0).toLocaleString()}<br>
      🔗 <a href="${esc(t.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(t.link)}</a><br>
      ⚑ Flagged ${esc(t.flagged_on)}${t.contacted_at ? ' · ✉ contacted ' + esc(new Date(t.contacted_at).toLocaleString()) : ''}${t.new_order_id ? ' · 🔁 new order #' + esc(t.new_order_id.slice(0, 8)) + ' (' + Number(t.new_quantity || 0).toLocaleString() + ') on ' + esc(t.new_link || '') : ''}${t.note ? '<br>📝 ' + esc(t.note) : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      ${open ? `<button class="btn-secondary" onclick="rqMessage('${t.id}')">✉ ${t.status === 'pending' ? 'Message client' : 'Message again'}</button>` : ''}
      ${t.thread_id ? `<button class="btn-secondary" onclick="rqOpenChat('${t.thread_id}')">💬 Open chat</button>` : ''}
      ${open ? `<button class="btn-primary" onclick="rqReorder('${t.id}')">🔁 Reorder for client</button>
      <button class="btn-secondary" onclick="rqDismiss('${t.id}')">✕ Dismiss</button>` : ''}
    </div>
  </div>`;
}

/* ── small modal helper ─────────────────────────────────────────── */
function rqModal(title, bodyHtml, confirmLabel, onConfirm) {
  document.getElementById('rqModal')?.remove();
  const el = document.createElement('div');
  el.id = 'rqModal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  el.innerHTML = `<div style="background:var(--navy);border:1px solid var(--border);border-radius:14px;max-width:560px;width:100%;padding:22px;max-height:90vh;overflow:auto;">
    <div style="font-weight:800;font-size:15px;margin-bottom:14px;">${esc(title)}</div>
    ${bodyHtml}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
      <button class="btn-secondary" id="rqModalCancel">Cancel</button>
      <button class="btn-primary" id="rqModalOk">${esc(confirmLabel)}</button>
    </div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.getElementById('rqModalCancel').onclick = () => el.remove();
  const ok = document.getElementById('rqModalOk');
  ok.onclick = async () => {
    ok.disabled = true; const old = ok.textContent; ok.textContent = 'Working…';
    try { await onConfirm(); el.remove(); }
    catch (e) { toast(e.message || 'Failed', 'error'); ok.disabled = false; ok.textContent = old; }
  };
  return el;
}
const _rqField = 'width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--white);font-family:inherit;font-size:13px;outline:none;box-sizing:border-box;';

async function rqMessage(id) {
  let body = '';
  try { body = (await api(`/reorders/${id}/preview-message`)).body; } catch (e) { toast(e.message, 'error'); return; }
  rqModal('Message client — ask for a fresh link',
    `<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Sent in a support thread; they get it in their chat.</div>
     <textarea id="rqMsgBody" rows="8" style="${_rqField}resize:vertical;">${esc(body)}</textarea>`,
    '✉ Send',
    async () => {
      await api(`/reorders/${id}/message`, { method: 'POST', body: JSON.stringify({ body: document.getElementById('rqMsgBody').value }) });
      toast('Message sent', 'success'); rqLoad();
    });
}

function rqReorder(id) {
  const t = _rqTasks.find(x => x.id === id); if (!t) return;
  rqModal('Reorder for client',
    `<div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6;">Re-places <b style="color:var(--white);">${esc(t.service_name)}</b> straight to the provider at <b>no charge</b> (the client already paid). Paste the new link the client sent you.</div>
     <label style="font-size:11px;font-weight:700;color:var(--muted);">NEW LINK</label>
     <input id="rqNewLink" placeholder="https://…" style="${_rqField}margin:6px 0 12px;"/>
     <label style="font-size:11px;font-weight:700;color:var(--muted);">QUANTITY (max ${Number(t.quantity).toLocaleString()})</label>
     <input id="rqNewQty" type="number" min="1" max="${t.quantity}" value="${t.suggested_quantity}" style="${_rqField}margin-top:6px;"/>`,
    '🔁 Place reorder',
    async () => {
      const link = document.getElementById('rqNewLink').value.trim();
      const quantity = parseInt(document.getElementById('rqNewQty').value, 10);
      if (!/^https?:\/\//i.test(link)) throw new Error('Enter a valid http(s) link');
      if (!quantity || quantity < 1) throw new Error('Enter a valid quantity');
      const res = await api(`/reorders/${id}/reorder`, { method: 'POST', body: JSON.stringify({ link, quantity }) });
      toast(`Reorder placed (#${res.new_order_id.slice(0, 8)})`, 'success'); rqLoad();
    });
}

function rqDismiss(id) {
  rqModal('Dismiss — nothing to redo',
    `<label style="font-size:11px;font-weight:700;color:var(--muted);">NOTE (optional)</label>
     <input id="rqNote" placeholder="e.g. client declined / already fixed" style="${_rqField}margin-top:6px;"/>`,
    'Dismiss',
    async () => {
      await api(`/reorders/${id}/dismiss`, { method: 'POST', body: JSON.stringify({ note: document.getElementById('rqNote').value }) });
      rqLoad();
    });
}

async function rqMessageAll() {
  const pending = _rqTasks.filter(t => t.status === 'pending').length;
  if (!confirm(`Send the default "please resend your link" message to ALL clients not yet contacted${pending ? ` (${pending} shown)` : ''}?`)) return;
  try {
    const r = await api('/reorders/message-pending', { method: 'POST' });
    toast(`Messaged ${r.sent} client(s)${r.failed ? `, ${r.failed} failed` : ''}`, r.failed ? 'error' : 'success');
    rqLoad();
  } catch (e) { toast(e.message, 'error'); }
}

async function rqFlagNow() {
  try {
    const r = await api('/reorders/flag-now', { method: 'POST' });
    toast(`Flagged ${r.new} new order(s); ${r.open_total} open`, 'success');
    rqLoad();
  } catch (e) { toast(e.message, 'error'); }
}

function rqOpenChat(threadId) {
  rqShowView('threads');
  if (typeof loadAdminSupport === 'function') loadAdminSupport();
  setTimeout(() => { if (typeof openSupportThread === 'function') openSupportThread(threadId); }, 400);
}

// Refresh the badge whenever the Support tab opens (admin.js calls this on tab click).
(function () {
  const orig = window.openAdminSupportTab;
  if (typeof orig === 'function') {
    window.openAdminSupportTab = async function () {
      const r = await orig.apply(this, arguments);
      rqShowView(_rqView); rqRefreshBadge();
      return r;
    };
  }
})();
