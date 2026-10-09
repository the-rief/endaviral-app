/* ═══════════════ SUPPORT CENTRE — TABBED BOARD ═══════════════
 * Replaces the old single mixed inbox. Every conversation is sorted by the backend
 * (GET /support/admin/threads/board) into exactly ONE bucket, so nothing shows up twice
 * and each tab answers one question:
 *
 *   📥 Inbox       the customer spoke last            → a human must reply
 *   ⏳ Follow-up   an agent messaged, customer silent → chase it (overdue = 24h+)
 *   🔁 Reorders    failed/partial/cancelled orders    → reorder_queue.js (own sub-tabs)
 *   ⚙️ Automatic   system alerts & auto notices       → nobody is waiting; if the customer
 *                  replies, the thread jumps to Inbox on its own
 *   ✅ Done        resolved / closed
 *
 * A reply moves a thread Inbox → Follow-up; a customer reply moves it back. The chat pane
 * itself is still admin.js's openSupportThread() (+ ccr_support.js quick replies).
 * Loaded AFTER admin.js and reorder_queue.js. Globals used: api, toast, esc, currentUser,
 * activeSupportThreadId, openSupportThread, rqModal, rqLoad, rqRefreshBadge.
 * ═══════════════════════════════════════════════════════════ */

const SB_TABS = [
  { id: 'inbox',     icon: '📥', label: 'Inbox',     sub: 'Customers waiting on a reply from us — longest wait first.' },
  { id: 'followup',  icon: '⏳', label: 'Follow-up', sub: 'We messaged them and they haven\'t answered yet. Overdue (24h+) ones are flagged — nudge them or close them out.' },
  { id: 'reorders',  icon: '🔁', label: 'Reorders',  sub: '' },
  { id: 'automatic', icon: '⚙️', label: 'Automatic', sub: 'System-raised alerts and automatic notices. Nobody is waiting on these — if the customer replies, the thread moves to Inbox by itself.' },
  { id: 'done',      icon: '✅', label: 'Done',      sub: 'Resolved and closed conversations.' },
];

const _sb = {
  tab: 'inbox', data: null, rq: null, loading: false, chatOnly: false,
  f: { type: '', origin: '', agent: '', overdue: false, closed: '' },
};
try { const t = sessionStorage.getItem('sbTab'); if (SB_TABS.some(x => x.id === t)) _sb.tab = t; } catch (_) {}

const SB_TYPE = { wrong_order: '📦 Wrong order', delay: '⏳ Delay', other: '💬 Other' };
const SB_STATUS = { open: ['#e53935', '🔴'], pending: ['#ff7043', '🟡'], resolved: ['#3dd44a', '🟢'], closed: ['#7a8fad', '⬛'] };

function sbAge(h) {
  if (h == null) return '';
  if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm';
  if (h < 48) return Math.round(h) + 'h';
  return Math.floor(h / 24) + 'd';
}
const sbIsStaff = () => !!currentUser && (currentUser.role === 'admin' || currentUser.is_ccr_agent);

/* ── loading ───────────────────────────────────────────── */
async function sbLoad(quiet) {
  if (!sbIsStaff()) return;
  const list = document.getElementById('supportThreadList');
  if (list && !quiet && !_sb.data) list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading conversations…</span></div>';
  _sb.loading = true;
  try {
    _sb.data = await api('/support/admin/threads/board?days=30&limit=600');
  } catch (e) {
    _sb.loading = false;
    if (list && !_sb.data) list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:13px;">${esc(e.message || 'Failed to load conversations')}</div>`;
    return;
  }
  _sb.loading = false;
  try { _sb.rq = await api('/reorders/summary'); } catch (_) { /* reorder badge is optional */ }
  sbRenderTabs(); sbRenderToolbar(); sbRender();
}

async function sbRefresh() {
  await sbLoad(false);
  if (_sb.tab === 'reorders' && typeof rqLoad === 'function') rqLoad();
}

// Called by admin.js for every refresh after a reply / status change, and by the Support tab click.
async function loadAdminSupport() { return sbLoad(true); }

async function openAdminSupportTab() {
  await autoCloseStaleSupportThreads();
  await sbLoad(false);
  sbSetTab(_sb.tab, true);
}

// live push (auth.js SSE handler): refresh quietly if the Support tab is on screen
let _sbPushTimer = null;
function sbOnTicketEvent() {
  if (!sbIsStaff() || !document.getElementById('ap-support')?.classList.contains('active')) return;
  clearTimeout(_sbPushTimer);
  _sbPushTimer = setTimeout(() => sbLoad(true), 600);
}

/* ── tabs ──────────────────────────────────────────────── */
function sbCounts() {
  const c = _sb.data?.counts || {}, r = _sb.rq || {};
  return {
    inbox: c.inbox || 0, followup: c.followup || 0, automatic: c.automatic || 0,
    stale: c.stale_followups || 0,
    reorders: (r.pending || 0) + (r.replied || 0), replied: r.replied || 0,
  };
}

function sbRenderTabs() {
  const el = document.getElementById('sbTabs'); if (!el) return;
  const c = sbCounts();
  const badge = (n, cls) => n > 0 ? `<span class="sb-badge ${cls}">${n}</span>` : '';
  const extra = {
    inbox: badge(c.inbox, 'red'),
    followup: badge(c.followup, 'amber') + (c.stale ? `<span title="${c.stale} overdue (24h+)" style="font-size:11px;">⚠${c.stale}</span>` : ''),
    reorders: badge(c.reorders, c.replied ? 'green' : 'red'),
    automatic: badge(c.automatic, ''),
    done: '',
  };
  el.innerHTML = SB_TABS.map(t =>
    `<button class="sb-tab ${t.id === _sb.tab ? 'on' : ''}" onclick="sbSetTab('${t.id}')">${t.icon} ${t.label} ${extra[t.id] || ''}</button>`).join('');
}

function sbSetTab(id, force) {
  if (!force && id === _sb.tab && !_sb.chatOnly) { sbRender(); return; }
  _sb.tab = id; _sb.chatOnly = false;
  _sb.f = { type: '', origin: '', agent: '', overdue: false, closed: '' };
  try { sessionStorage.setItem('sbTab', id); } catch (_) {}
  sbApplyLayout();
  sbRenderTabs(); sbRenderToolbar();
  if (id === 'reorders') { if (typeof rqLoad === 'function') rqLoad(); }
  else sbRender();
}

function sbApplyLayout() {
  const rq = document.getElementById('reorderQueuePane'), tv = document.getElementById('supportThreadsView');
  const list = document.getElementById('supportThreadList'), wrap = document.getElementById('supportInboxWrap');
  const back = document.getElementById('sbBackBar'), tools = document.getElementById('sbToolbar');
  const isRq = _sb.tab === 'reorders';
  if (rq) rq.style.display = isRq && !_sb.chatOnly ? '' : 'none';
  if (tv) tv.style.display = (!isRq || _sb.chatOnly) ? '' : 'none';
  if (tools) tools.style.display = isRq ? 'none' : '';
  if (back) back.style.display = _sb.chatOnly ? '' : 'none';
  if (list) list.style.display = _sb.chatOnly ? 'none' : '';
  if (wrap) wrap.style.gridTemplateColumns = _sb.chatOnly ? '1fr' : '340px 1fr';
}

function sbBackFromChat() { _sb.chatOnly = false; sbApplyLayout(); if (typeof rqLoad === 'function') rqLoad(); }

/* ── toolbar (hint + filters + tab-specific actions) ───── */
function sbSetFilter(key, val) { _sb.f[key] = val; sbRenderToolbar(); sbRender(); }

function sbRenderToolbar() {
  const el = document.getElementById('sbToolbar'); if (!el) return;
  const tab = SB_TABS.find(t => t.id === _sb.tab); if (!tab || _sb.tab === 'reorders') { el.innerHTML = ''; return; }
  const f = _sb.f, d = _sb.data || {};
  const sel = (key, opts) => `<select class="sb-sel" onchange="sbSetFilter('${key}', this.value)">${
    opts.map(([v, l]) => `<option value="${esc(v)}" ${f[key] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const chip = (on, label, js) => `<button class="sb-chip ${on ? 'on' : ''}" onclick="${js}">${label}</button>`;
  let html = `<div class="sb-hint">${esc(tab.sub)}</div>`;

  if (_sb.tab === 'inbox') {
    html += sel('type', [['', 'All types'], ['wrong_order', '📦 Wrong order'], ['delay', '⏳ Delay'], ['other', '💬 Other']]);
    html += sel('origin', [['', 'Any origin'], ['customer', '🧑 Customer-started'], ['agent', '👤 Agent-started'], ['automatic', '⚙️ From a system alert']]);
  } else if (_sb.tab === 'followup') {
    const stale = d.counts?.stale_followups || 0;
    html += chip(!f.overdue, 'All', `sbSetFilter('overdue', false)`) + chip(f.overdue, `⚠ Overdue ${stale ? '(' + stale + ')' : ''}`, `sbSetFilter('overdue', true)`);
    const agents = d.agents || [];
    html += sel('agent', [['', 'All agents'], ['mine', 'Mine'], ...agents.map(a => [a.id, `${a.name} (${a.count})`])]);
    html += sel('type', [['', 'All types'], ['wrong_order', '📦 Wrong order'], ['delay', '⏳ Delay'], ['other', '💬 Other']]);
  } else if (_sb.tab === 'automatic') {
    html += sel('closed', [['', 'Open only'], ['all', 'Include resolved']]);
    html += `<button class="btn-secondary" onclick="sbResolveAllAutomatic()" title="Mark every open automatic alert shown here as resolved">✓ Resolve all shown</button>`;
  } else if (_sb.tab === 'done') {
    html += sel('closed', [['', 'Resolved + closed'], ['resolved', '🟢 Resolved'], ['closed', '⬛ Closed']]);
  }
  el.innerHTML = html;
}

/* ── list ──────────────────────────────────────────────── */
function sbThreads() {
  const all = _sb.data?.threads || [], f = _sb.f;
  const q = (document.getElementById('sbSearch')?.value || '').trim().toLowerCase();
  let rows = all.filter(t => t.bucket === _sb.tab);
  if (q) rows = rows.filter(t => `${t.user_name} ${t.user_email} ${t.subject || ''} ${t.last_message?.body || ''}`.toLowerCase().includes(q));
  if (f.type) rows = rows.filter(t => t.type === f.type);
  if (_sb.tab === 'inbox' && f.origin) rows = rows.filter(t => t.origin === f.origin);
  if (_sb.tab === 'followup') {
    if (f.overdue) rows = rows.filter(t => t.waiting_hours >= (_sb.data?.stale_after_hours || 24));
    if (f.agent === 'mine') rows = rows.filter(t => t.last_staff_id && t.last_staff_id === currentUser?.id);
    else if (f.agent) rows = rows.filter(t => t.last_staff_id === f.agent);
  }
  if (_sb.tab === 'automatic' && f.closed !== 'all') rows = rows.filter(t => ['open', 'pending'].includes(t.status));
  if (_sb.tab === 'done' && f.closed) rows = rows.filter(t => t.status === f.closed);
  // inbox/followup: longest wait first (that's the urgent end); automatic/done: newest first
  const longestWaitFirst = _sb.tab === 'inbox' || _sb.tab === 'followup';
  rows.sort((a, b) => longestWaitFirst ? (b.waiting_hours - a.waiting_hours) : (new Date(b.last_activity_at) - new Date(a.last_activity_at)));
  return rows;
}

const SB_EMPTY = {
  inbox: ['🎉', 'Inbox zero', 'No customer is waiting on a reply.'],
  followup: ['👌', 'Nothing to chase', 'Everyone we messaged has either replied or been resolved.'],
  automatic: ['⚙️', 'No automatic alerts', 'System-raised tickets and auto notices will appear here.'],
  done: ['🗂', 'Nothing here yet', 'Resolved and closed conversations show up here.'],
};

let _sbSearchTimer = null;
function sbRender() {
  if (_sb.tab === 'reorders') {          // the shared search box also filters the reorder list
    clearTimeout(_sbSearchTimer);
    _sbSearchTimer = setTimeout(() => { if (typeof rqLoad === 'function') rqLoad(); }, 350);
    return;
  }
  const list = document.getElementById('supportThreadList'); if (!list) return;
  if (!_sb.data) return;
  const rows = sbThreads();
  if (!rows.length) {
    const [ic, h, sub] = SB_EMPTY[_sb.tab] || ['💬', 'Nothing here', ''];
    list.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--muted);"><div style="font-size:34px;margin-bottom:8px;">${ic}</div><div style="font-size:13px;font-weight:700;color:var(--white);">${h}</div><div style="font-size:12px;margin-top:4px;line-height:1.5;">${sub}</div></div>`;
    return;
  }
  list.innerHTML = rows.map(sbItem).join('');
  sbMarkActive();
}

function sbWaitChip(t) {
  const h = t.waiting_hours || 0, a = sbAge(h);
  let color, bg, label;
  if (_sb.tab === 'inbox')         { [color, bg] = h >= 24 ? ['#ff5252', 'rgba(255,82,82,.14)'] : h >= 4 ? ['#ffb347', 'rgba(255,179,71,.14)'] : ['#3dd44a', 'rgba(61,212,74,.12)']; label = `waiting ${a}`; }
  else if (_sb.tab === 'followup') { [color, bg] = h >= 48 ? ['#ff5252', 'rgba(255,82,82,.14)'] : h >= 24 ? ['#ffb347', 'rgba(255,179,71,.14)'] : ['#9aa4b2', 'rgba(255,255,255,.07)']; label = `no reply ${a}`; }
  else                             { [color, bg] = ['#9aa4b2', 'rgba(255,255,255,.07)']; label = `${a} ago`; }
  return `<span class="sb-wait" style="color:${color};background:${bg};">${label}</span>`;
}

function sbItem(t) {
  const tid = esc(t.id);
  const [sc, se] = SB_STATUS[t.status] || ['#7a8fad', ''];
  const origin = {
    customer:  ['🧑 Customer', '#9aa4b2'],
    agent:     ['👤 Agent-started', '#4da3ff'],
    automatic: ['⚙️ System', '#ffb347'],
  }[t.origin] || ['', ''];
  const last = t.last_message;
  const who = t.last_sender === 'customer' ? 'Customer' : t.last_sender === 'system' ? '⚙️ Report' : t.last_sender === 'bot' ? '🤖 Auto' : (t.last_staff_name ? t.last_staff_name.split('@')[0] : 'Agent');
  const preview = last ? `<span style="color:#6f8aa8;">${esc(who)}:</span> ${esc(last.body.slice(0, 70))}${last.body.length > 70 ? '…' : ''}` : 'No messages';
  const leftColor = _sb.tab === 'followup' && t.waiting_hours >= 24 ? '#ffb347' : t.origin === 'automatic' ? '#ffb347' : 'transparent';
  return `<div class="sb-item support-thread-item" data-thread-id="${tid}" onclick="openSupportThread('${tid}')" style="border-left-color:${leftColor};">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:5px;">
      <div style="font-size:12.5px;font-weight:700;color:var(--white);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.user_name || t.user_email || '—')}</div>
      ${sbWaitChip(t)}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
      <span style="font-size:11px;color:var(--green);font-weight:600;">${esc(SB_TYPE[t.type] || t.type)}</span>
      ${origin[0] ? `<span class="sb-tag" style="color:${origin[1]};background:rgba(255,255,255,.06);">${origin[0]}</span>` : ''}
      ${t.reorder_task_id ? `<span class="sb-tag" style="color:#ff7043;background:rgba(255,112,67,.12);">🔁 Reorder</span>` : ''}
      <span style="font-size:10px;font-weight:700;color:${sc};margin-left:auto;">${se} ${esc(t.status.toUpperCase())}</span>
    </div>
    <div style="font-size:11.5px;color:var(--muted);line-height:1.45;">${preview}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
      <span style="font-size:10px;color:#3a5570;">${t.message_count || 0} msgs · ${t.agent_msgs || 0} from agents${t.auto_msgs ? ' · ' + t.auto_msgs + ' auto' : ''}</span>
      ${_sb.tab === 'followup' ? `<button class="btn-secondary" style="padding:3px 10px;font-size:10.5px;" onclick="event.stopPropagation();sbNudge('${tid}')">👋 Nudge</button>` : ''}
    </div>
  </div>`;
}

function sbMarkActive() {
  document.querySelectorAll('#supportThreadList .support-thread-item').forEach(el => {
    el.classList.toggle('active', el.dataset.threadId === activeSupportThreadId);
  });
}

/* keep the highlight in step with whatever thread is open (also wraps ccr_support.js's wrapper) */
(function () {
  const orig = window.openSupportThread;
  if (typeof orig === 'function') {
    window.openSupportThread = async function (id) {
      const r = await orig.apply(this, arguments);
      sbMarkActive();
      return r;
    };
  }
  // After a reply the thread changes bucket (Inbox → Follow-up): refresh the lists, keep the chat open.
  const origSend = window.adminSendReply;
  if (typeof origSend === 'function') {
    window.adminSendReply = async function () {
      const id = activeSupportThreadId, before = (_sb.data?.threads || []).find(t => t.id === id)?.bucket;
      const r = await origSend.apply(this, arguments);
      await sbLoad(true);
      const after = (_sb.data?.threads || []).find(t => t.id === id)?.bucket;
      if (before && after && before !== after) {
        const where = SB_TABS.find(t => t.id === after);
        if (where) toast(`Moved to ${where.icon} ${where.label}`, 'info');
      }
      return r;
    };
  }
})();

/* ── jump to a specific thread (used by "Message customer", reorder cards, etc.) ── */
async function sbFocusThread(threadId, opts) {
  opts = opts || {};
  if (!_sb.data || !(_sb.data.threads || []).some(t => t.id === threadId)) await sbLoad(true);
  const t = (_sb.data?.threads || []).find(x => x.id === threadId);
  if (opts.fromReorders || (t && t.bucket === 'reorder')) {
    _sb.tab = 'reorders'; _sb.chatOnly = true;
    sbApplyLayout(); sbRenderTabs();
  } else {
    sbSetTab(t ? t.bucket : _sb.tab, true);
  }
  await openSupportThread(threadId);
  sbMarkActive();
  const row = document.querySelector(`#supportThreadList [data-thread-id="${CSS.escape(threadId)}"]`);
  if (row) row.scrollIntoView({ block: 'nearest' });
}

/* ── nudge a quiet customer ────────────────────────────── */
function sbNudge(threadId) {
  const t = (_sb.data?.threads || []).find(x => x.id === threadId); if (!t) return;
  const first = String(t.user_name || t.user_email || 'there').split('@')[0].split(' ')[0];
  const text = `Hi ${first}, just checking in — did you get a chance to see our last message? ` +
    `Let us know if you still need help with this and we'll sort it out right away.`;
  rqModal(`Nudge ${t.user_name || t.user_email}`,
    `<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Sent as a normal reply; the conversation stays in Follow-up until they answer.</div>
     <textarea id="sbNudgeBody" rows="5" style="${_rqField}resize:vertical;">${esc(text)}</textarea>`,
    '👋 Send nudge',
    async () => {
      const body = document.getElementById('sbNudgeBody').value.trim();
      if (!body) throw new Error('Write a message first');
      await api(`/support/admin/threads/${threadId}/reply`, { method: 'POST', body: JSON.stringify({ body }) });
      toast('Nudge sent', 'success');
      sbLoad(true);
    });
}

/* ── bulk: resolve open automatic alerts ───────────────── */
async function sbResolveAllAutomatic() {
  const rows = sbThreads().filter(t => ['open', 'pending'].includes(t.status)).slice(0, 100);
  if (!rows.length) { toast('Nothing to resolve', 'info'); return; }
  if (!confirm(`Mark ${rows.length} automatic alert(s) as resolved?\nA customer reply would still reopen the conversation in Inbox.`)) return;
  let ok = 0, bad = 0;
  for (const t of rows) {
    try { await api(`/support/admin/threads/${t.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) }); ok++; }
    catch (_) { bad++; }
  }
  toast(`Resolved ${ok}${bad ? `, ${bad} failed` : ''}`, bad ? 'error' : 'success');
  sbLoad(true);
}

// first paint of the (still hidden) tab bar so it is never empty
document.addEventListener('DOMContentLoaded', () => { sbRenderTabs(); sbApplyLayout(); });
