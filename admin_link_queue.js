/* ═══════════════ ADMIN → QUEUED ORDERS ═══════════════
 * Paid orders the panel couldn't start yet because their link already had a
 * running order. Each one starts automatically 5 min after the earlier order
 * on that link is seen to finish — the panel is checked every 30 min, sooner
 * when a status refresh already shows it finished (backend services/link_queue.py).
 *
 * Shows, per order: who paid, the link, which order it's waiting for and that
 * order's live panel status, what happens next and when, and how long it has
 * waited. Actions: Start now (try the panel immediately), Give up (order
 * FAILED + ticket → Reorder Queue), Message customer.
 *
 * Data: GET /admin/link-queue/?view=… and /admin/link-queue/summary (admin
 * only). Loaded only when the tab is opened or Refresh is pressed — no timers,
 * so it never keeps Neon awake.
 * Depends on globals: api(), toast(), esc(), fmtKES(), currentUser,
 * openOrderDetailModal(), adminMessageCustomer().
 * ════════════════════════════════════════════════════ */

let _lqView = 'open';
let _lqSum = {};
const LQ_VIEWS = [
  { id: 'open',     label: '⏳ Waiting',  hint: 'Paid and waiting for an earlier order on the same link. They start on their own — act only if one looks stuck.' },
  { id: 'started',  label: '✅ Started',  hint: 'Queued orders that have since been sent to the panel.' },
  { id: 'problems', label: '⚠ Problems', hint: 'Could not start, waited too long, or were taken out of the queue. These are FAILED orders — they appear in Support → Reorders after midnight.' },
  { id: 'all',      label: 'All',        hint: 'Everything that has ever been queued (newest activity first).' },
];
const LQ_STATUS = {
  waiting:   ['WAITING',   '#ffb347'],
  starting:  ['STARTING',  '#2196f3'],
  started:   ['STARTED',   '#3dd44a'],
  failed:    ['FAILED',    '#ff5252'],
  expired:   ['EXPIRED',   '#ff5252'],
  cancelled: ['REMOVED',   '#9aa4b2'],
};

const _lqCard = 'background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;';
const _lqLabel = 'font-size:10.5px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;';

function _lqDur(min) {
  if (min == null) return '—';
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60);
  if (h < 48) return h + 'h ' + (min % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}
function _lqRel(iso) {
  if (!iso) return '';
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const at = new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff > 0) return `in ${_lqDur(diff)} <span style="color:var(--muted);">(${at})</span>`;
  if (diff > -2) return `now <span style="color:var(--muted);">(${at})</span>`;
  return `due ${_lqDur(-diff)} ago <span style="color:var(--muted);">(${at})</span>`;
}
function _lqStat(label, value, color, title) {
  return `<div style="${_lqCard}" ${title ? `title="${esc(title)}"` : ''}><div style="${_lqLabel}">${esc(label)}</div><div style="font-size:24px;font-weight:800;${color ? 'color:' + color + ';' : ''}">${value}</div></div>`;
}

/* Tab badge: number of orders waiting. Called when the admin page opens. */
async function lqRefreshBadge() {
  if (!currentUser || currentUser.role !== 'admin') return;
  try {
    _lqSum = await api('/admin/link-queue/summary');
    // Badge sits inside the nav button (admin_shell.css styles .at-badge);
    // admin_shell.js mirrors it onto the mobile section switcher.
    const tab = document.getElementById('lqTabBtn');
    if (tab) {
      let b = document.getElementById('lqTabBadge');
      if (!b) { b = document.createElement('span'); b.id = 'lqTabBadge'; b.className = 'at-badge'; tab.appendChild(b); }
      b.textContent = _lqSum.open ? String(_lqSum.open) : '';
    }
  } catch (_) { /* badge is optional */ }
}

function lqSetView(v) { _lqView = v; loadAdminLinkQueue(); }

async function loadAdminLinkQueue() {
  const root = document.getElementById('linkQueueRoot');
  if (!root) return;
  if (!currentUser || currentUser.role !== 'admin') { root.innerHTML = '<div class="empty-state"><p>Admins only.</p></div>'; return; }
  root.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading queued orders…</span></div>';
  try {
    const [sum, data] = await Promise.all([
      api('/admin/link-queue/summary'),
      api('/admin/link-queue/?view=' + encodeURIComponent(_lqView)),
    ]);
    _lqSum = sum;
    lqRefreshBadge();
    root.innerHTML = _lqRender(sum, data);
  } catch (e) {
    root.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
}

function _lqRender(sum, data) {
  const view = LQ_VIEWS.find(v => v.id === _lqView) || LQ_VIEWS[0];
  const oldest = sum.oldest_waiting_minutes;
  let html = `<div class="sec-hd">
      <div><div class="sec-title">QUEUED ORDERS</div>
      <div class="sec-sub">Paid orders waiting for an earlier order on the same link to finish — they start automatically 5 min after it's seen to complete (panel checked every 30 min)</div></div>
      <button class="btn-secondary" onclick="loadAdminLinkQueue()">↻ Refresh</button>
    </div>`;

  if (data.worker && !data.worker.running) {
    html += `<div style="${_lqCard}border-color:#ff5252;color:#ff5252;font-weight:700;margin-bottom:12px;">⚠ The queue worker is not running on the server — queued orders won't start until it restarts. Check the server logs.</div>`;
  }

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;">
      ${_lqStat('Waiting now', sum.open || 0, sum.open ? '#ffb347' : null)}
      ${_lqStat('Longest wait', oldest == null ? '—' : _lqDur(oldest), oldest != null && oldest > 24 * 60 ? '#ff5252' : null, 'How long the oldest waiting order has been queued')}
      ${_lqStat('Started (24h)', sum.started_24h || 0, sum.started_24h ? '#3dd44a' : null)}
      ${_lqStat('Problems (7d)', sum.problems_7d || 0, sum.problems_7d ? '#ff5252' : null, 'Failed, expired or removed in the last 7 days')}
    </div>`;

  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">${LQ_VIEWS.map(v =>
      `<button class="sb-chip ${v.id === _lqView ? 'on' : ''}" onclick="lqSetView('${v.id}')" style="background:var(--card);border:1px solid ${v.id === _lqView ? 'var(--green)' : 'var(--border)'};border-radius:20px;padding:6px 13px;color:${v.id === _lqView ? 'var(--green)' : 'var(--muted)'};font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">${v.label}</button>`
    ).join('')}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">${esc(view.hint)}</div>`;

  if (data.live_status_ok === false) {
    html += `<div style="font-size:12px;color:#ffb347;margin-bottom:10px;">Couldn't reach the panel for live status just now — showing the last known status.</div>`;
  }

  const items = data.items || [];
  if (!items.length) {
    return html + `<div class="empty-state"><div class="icon">✅</div><p>${_lqView === 'open' ? 'No orders are waiting.' : 'Nothing here.'}</p></div>`;
  }

  html += `<div class="tbl-wrap" style="overflow-x:auto;"><table>
    <thead><tr><th>Order</th><th>Customer</th><th>Link</th><th>Waiting for</th><th>Next</th><th>Waited</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${items.map(_lqRow).join('')}</tbody></table></div>`;
  return html;
}

function _lqRow(it) {
  const oid = esc(it.order_id || '');
  const short = esc((it.order_id || '').slice(0, 8));
  const [stLabel, stColor] = LQ_STATUS[it.status] || [String(it.status || '').toUpperCase(), '#9aa4b2'];
  const link = it.link ? `<a href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);font-size:11px;word-break:break-all;max-width:180px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(it.link)}">${esc(it.link)}</a>` : '—';
  const pos = it.position && it.position > 1 ? `<div style="font-size:10.5px;color:#ffb347;margin-top:3px;">#${it.position} in line on this link</div>` : '';

  const b = it.blocker;
  let waitingFor;
  if (b) {
    const live = b.live_status || b.db_status || 'unknown';
    const rem = (b.remains != null && b.remains !== '') ? ` · ${Number(b.remains).toLocaleString()} left` : '';
    waitingFor = `<div style="font-size:12px;"><a href="#" onclick="event.preventDefault();openOrderDetailModal('${esc(b.order_id)}')" style="color:var(--white);font-weight:700;">#${esc(b.order_id.slice(0, 8))}</a>
        ${b.provider_order_id ? `<span style="color:var(--muted);font-size:10.5px;">panel #${esc(b.provider_order_id)}</span>` : ''}</div>
      <div style="font-size:11px;color:var(--muted);">${esc(b.service_name || '')}${b.quantity ? ' · ' + Number(b.quantity).toLocaleString() : ''}</div>
      <div style="font-size:11px;margin-top:2px;"><span style="font-weight:700;color:${b.finished_at ? '#3dd44a' : '#ffb347'};">${esc(b.finished_at ? 'finished' : live)}</span>${b.finished_at ? '' : esc(rem)}</div>`;
  } else if (['waiting', 'starting'].includes(it.status)) {
    waitingFor = `<div style="font-size:11.5px;color:var(--muted);" title="The order running on this link isn't in our system (or its status can't be read), so we retry the panel periodically.">Unknown order<br/>(not ours)</div>`;
  } else {
    waitingFor = '<span style="color:var(--muted);font-size:11px;">—</span>';
  }

  const next = `<div style="font-size:11.5px;line-height:1.45;max-width:260px;">${esc(it.next_step || '')}</div>
    ${it.next_at ? `<div style="font-size:11.5px;margin-top:3px;font-weight:700;">${_lqRel(it.next_at)}</div>` : ''}
    ${it.attempts > 1 ? `<div style="font-size:10.5px;color:var(--muted);margin-top:2px;">panel said "busy" ${it.attempts}×</div>` : ''}`;

  const waited = it.waited_minutes != null
    ? `<span style="font-weight:700;color:${it.waited_minutes > 24 * 60 ? '#ff5252' : it.waited_minutes > 6 * 60 ? '#ffb347' : 'var(--white)'};">${_lqDur(it.waited_minutes)}</span>`
    : `<span style="font-size:11px;color:var(--muted);">${it.started_at ? 'started ' + new Date(it.started_at).toLocaleString() : (it.updated_at ? new Date(it.updated_at).toLocaleString() : '—')}</span>`;

  const uid = esc(it.user_id || ''), email = esc(it.user_email || '—');
  const actions = [
    it.can_start_now ? `<button class="action-btn" onclick="lqStartNow('${esc(it.id)}')" title="Try the panel now instead of waiting. If the link is still busy it just goes back to waiting.">▶ Start now</button>` : '',
    it.can_give_up ? `<button class="action-btn" onclick="lqGiveUp('${esc(it.id)}')" title="Take it out of the queue: order becomes FAILED with a ticket and goes to the Reorder Queue" style="color:#ff5252;">✕ Give up</button>` : '',
    uid ? `<button class="action-btn" onclick="adminMessageCustomer('${uid}','${email}')" title="Open support thread with customer">💬 Message</button>` : '',
  ].join('');

  const errTip = it.last_error ? ` title="Last panel reply: ${esc(it.last_error)}"` : '';
  return `<tr>
    <td style="font-size:12px;">
      <a href="#" onclick="event.preventDefault();openOrderDetailModal('${oid}')" style="color:var(--white);font-weight:700;">#${short}</a>
      <div style="font-size:11px;color:var(--muted);max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(it.service_name || '')}">${esc(it.service_name || '—')}</div>
      <div style="font-size:11px;color:var(--muted);">${it.quantity ? Number(it.quantity).toLocaleString() : '—'} · <span style="color:var(--green);">${fmtKES(it.charge)}</span></div>
      ${it.provider_order_id ? `<div style="font-size:10px;color:var(--muted);">panel #${esc(it.provider_order_id)}</div>` : ''}
    </td>
    <td style="font-size:12px;"><div style="font-weight:600;">${email}</div>${it.user_name ? `<div style="font-size:11px;color:var(--muted);">${esc(it.user_name)}</div>` : ''}${it.phone ? `<div style="font-size:11px;color:var(--muted);">📞 ${esc(it.phone)}</div>` : ''}</td>
    <td style="max-width:180px;">${link}${pos}</td>
    <td>${waitingFor}</td>
    <td>${next}</td>
    <td style="white-space:nowrap;">${waited}<div style="font-size:10.5px;color:var(--muted);">${it.queued_at ? 'queued ' + new Date(it.queued_at).toLocaleString() : ''}</div></td>
    <td><span${errTip} style="font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;border:1px solid ${stColor};color:${stColor};white-space:nowrap;">${stLabel}</span></td>
    <td style="white-space:nowrap;">${actions}</td>
  </tr>`;
}

async function lqStartNow(id) {
  if (!confirm('Try to start this order on the panel now?\n\nIf the earlier order on this link is still running, the panel will refuse and the order simply goes back to waiting.')) return;
  try {
    const r = await api(`/admin/link-queue/${encodeURIComponent(id)}/start-now`, { method: 'POST' });
    toast(r.message || 'Starting…', 'success');
    setTimeout(loadAdminLinkQueue, 6000);   // the worker picks it up within a few seconds
  } catch (e) { toast(e.message || 'Could not start', 'error'); }
}

async function lqGiveUp(id) {
  if (!confirm('Take this order out of the queue?\n\nIt will be marked FAILED, the customer gets the usual "we\'re sorting it out" ticket, and it shows in Support → Reorders after midnight. It will NOT start automatically any more.')) return;
  try {
    const r = await api(`/admin/link-queue/${encodeURIComponent(id)}/give-up`, { method: 'POST' });
    toast(r.message || 'Removed', 'success');
    loadAdminLinkQueue();
  } catch (e) { toast(e.message || 'Could not remove', 'error'); }
}
