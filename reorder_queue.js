/* ═══════════════ SUPPORT → REORDER QUEUE ═══════════════
 * Every midnight the backend flags each FAILED / PARTIAL / CANCELLED order that
 * has a provider order id or a successful M-Pesa payment (services/reorder_queue.py).
 * Next morning an admin or CCR agent works this list:
 *   1. "Message client"  – asks them (in a support thread) to resend their link
 *   2. "Reorder"         – re-use the original link (if valid), pick a link the customer
 *                          sent in chat, or paste a new one; quantity auto-fills; if the
 *                          service is unavailable choose a similar one. Re-placed at no
 *                          charge straight to the provider
 *   3. "Dismiss"         – nothing to redo
 *   4. "Reorder ALL"     – one press: re-places every open task on the link the
 *                          customer ORIGINALLY used, free of charge, and messages each
 *                          customer that it's a replacement for the earlier failed order
 * Lives inside the Support tab (#ap-support) so CCR agents get it too.
 * Depends on globals: api(), toast(), esc(), currentUser, openSupportThread().
 * ════════════════════════════════════════════════════════════════ */

let _rqTasks = [];             // everything loaded for the current sub-tab (search is applied server-side)
let _rqSub = 'needs';          // needs | followup | reordered | dismissed
let _rqFollow = 'all';         // follow-up chips: all | replied | waiting | overdue
let _rqSum = {};
let _rqF = { reason: '', pay: '', link: false };     // list filters
let _rqSort = 'newest';
const _rqSel = new Set();      // selected task ids (bulk actions)
const _rqOpen = new Set();     // expanded rows

const RQ_REASON = {
  failed:    { label: 'FAILED',    color: '#ff5252' },
  partial:   { label: 'PARTIAL',   color: '#ffb347' },
  cancelled: { label: 'CANCELLED', color: '#9aa4b2' },
};
// A client moves Needs contact → Follow-up the moment they are messaged.
const RQ_SUBS = [
  { id: 'needs',     status: 'pending',   icon: '📨', label: 'Needs contact', sub: 'Nobody has messaged these clients yet. Ask for a fresh link — or re-place on the original link in one press.' },
  { id: 'followup',  status: 'contacted', icon: '⏳', label: 'Follow-up',     sub: 'Clients we already messaged. Replied ones are on top — reorder with their new link. Quiet ones can be nudged, or re-placed on the original link once they have been silent long enough.' },
  { id: 'reordered', status: 'reordered', icon: '✅', label: 'Reordered',     sub: 'Replacement orders already placed.' },
  { id: 'dismissed', status: 'dismissed', icon: '✕',  label: 'Dismissed',     sub: 'Marked as nothing to redo.' },
];
const _rqAge = (h) => h == null ? '' : (typeof sbAge === 'function' ? sbAge(h) : Math.round(h) + 'h');
const _rqKes = (n, d) => 'KES ' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d == null ? 0 : d });

// kept so older callers still work — tabs now live in support_board.js
function rqShowView(view) { if (typeof sbSetTab === 'function') sbSetTab(view === 'queue' ? 'reorders' : 'inbox'); }

async function rqRefreshBadge() {
  try {
    _rqSum = await api('/reorders/summary');
    if (typeof _sb !== 'undefined') { _sb.rq = _rqSum; if (typeof sbRenderTabs === 'function') sbRenderTabs(); }
    rqRenderSubtabs();
  } catch (_) {}
}

function rqRenderSubtabs() {
  const el = document.getElementById('rqSubTabs'); if (!el) return;
  const n = { needs: _rqSum.pending, followup: _rqSum.contacted, reordered: _rqSum.reordered, dismissed: _rqSum.dismissed };
  el.innerHTML = RQ_SUBS.map(t => {
    const c = n[t.id] || 0;
    let badge = c ? `<span class="sb-badge ${t.id === 'needs' ? 'red' : t.id === 'followup' ? 'amber' : ''}">${c}</span>` : '';
    if (t.id === 'followup' && _rqSum.replied) badge += `<span class="sb-badge green" title="Customers who replied">💬 ${_rqSum.replied}</span>`;
    return `<button class="sb-tab ${t.id === _rqSub ? 'on' : ''}" onclick="rqSetSub('${t.id}')">${t.icon} ${t.label} ${badge}</button>`;
  }).join('');
}

function rqSetSub(id) { _rqSub = id; _rqFollow = 'all'; _rqF = { reason: '', pay: '', link: false }; _rqSel.clear(); _rqOpen.clear(); rqLoad(); }
function rqSetFollow(f) { _rqFollow = f; rqRenderBar(); rqRenderList(); }
function rqSetFilter(k, v) { _rqF[k] = (_rqF[k] === v ? (typeof v === 'boolean' ? false : '') : v); rqRenderList(); }
function rqSetSort(v) { _rqSort = v; rqRenderList(); }

function rqRenderBar() {
  const el = document.getElementById('rqSubBar'); if (!el) return;
  const sub = RQ_SUBS.find(x => x.id === _rqSub);
  const chip = (id, label) => `<button class="sb-chip ${_rqFollow === id ? 'on' : ''}" onclick="rqSetFollow('${id}')">${label}</button>`;
  const btn = 'style="width:auto;padding:9px 16px;"', warn = 'style="width:auto;padding:9px 16px;background:#ff7043;border-color:#ff7043;"';
  let html = `<div class="sb-hint">${esc(sub.sub)}</div>`;
  if (_rqSub === 'needs') {
    html += `<button class="btn-secondary" onclick="rqFlagNow()" title="Flag new failed/partial/cancelled orders now instead of waiting for midnight">⚑ Flag now</button>
      <button class="btn-primary" ${btn} onclick="rqMessageAll()">✉ Message all unsent</button>
      <button class="btn-primary" ${warn} onclick="rqReorderAll()" title="Re-place every open order on its original link and tell each customer">🔁 Reorder ALL on original links</button>`;
  } else if (_rqSub === 'followup') {
    html += chip('all', 'All') + chip('replied', `💬 Replied${_rqSum.replied ? ' (' + _rqSum.replied + ')' : ''}`)
      + chip('waiting', `⏳ Waiting${_rqSum.waiting ? ' (' + _rqSum.waiting + ')' : ''}`) + chip('overdue', `⚠ Overdue${_rqSum.stale ? ' (' + _rqSum.stale + ')' : ''}`)
      + `<button class="btn-primary" ${btn} onclick="rqNudgeStale()" title="Send a follow-up message to everyone who hasn't replied in 24h+">👋 Nudge overdue</button>
         <button class="btn-primary" ${warn} onclick="rqReorderOverdue()" title="Give up waiting: re-place silent clients on their original link">🔁 Reorder silent ones…</button>`;
  }
  el.innerHTML = html;
}

const RQ_CSS = `
  .rq-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px;}
  .rq-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 14px;}
  .rq-stat b{display:block;font-size:20px;color:var(--white);line-height:1.3;} .rq-stat span{font-size:10px;color:var(--muted);font-weight:800;letter-spacing:.7px;text-transform:uppercase;}
  .rq-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}
  .rq-wrap{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--card);}
  .rq-head,.rq-row{display:grid;grid-template-columns:30px minmax(0,2.3fr) minmax(0,1.4fr) minmax(0,1.7fr) 92px 118px auto;gap:12px;align-items:center;}
  .rq-head{padding:9px 14px;font-size:10px;font-weight:800;letter-spacing:1px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);background:rgba(255,255,255,.02);}
  .rq-row{padding:10px 14px;border-bottom:1px solid var(--border);border-left:3px solid transparent;}
  .rq-row:hover{background:rgba(61,212,74,.035);} .rq-row.sel{background:rgba(61,212,74,.08);}
  .rq-c1{font-size:12.5px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rq-c2{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
  .rq-tag{font-size:9px;font-weight:800;letter-spacing:.4px;padding:1px 6px;border-radius:5px;border:1px solid currentColor;margin-right:5px;}
  .rq-ib{width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:14px;border-radius:8px;}
  .rq-act{display:flex;gap:6px;align-items:center;justify-content:flex-end;}
  .rq-detail{padding:12px 18px 14px 56px;background:rgba(0,0,0,.2);border-bottom:1px solid var(--border);font-size:12px;line-height:1.85;color:var(--muted);display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2px 28px;}
  .rq-detail b{color:var(--white);font-weight:600;}
  .rq-bulk{position:sticky;bottom:14px;z-index:5;margin-top:12px;display:none;align-items:center;gap:10px;flex-wrap:wrap;background:var(--navy);border:1px solid var(--green);border-radius:12px;padding:10px 14px;box-shadow:0 8px 28px rgba(0,0,0,.5);}
  @media(max-width:1100px){ .rq-head{display:none;} .rq-row{grid-template-columns:30px 1fr;row-gap:6px;} .rq-row>*:nth-child(n+3){grid-column:2;} .rq-act{justify-content:flex-start;} }
`;

async function rqLoad() {
  const pane = document.getElementById('reorderQueuePane');
  if (!pane) return;
  if (!document.getElementById('rqList')) {
    pane.innerHTML = `<style>${RQ_CSS}</style>
      <div class="sec-hd">
        <div>
          <div class="sec-title">REORDER QUEUE</div>
          <div class="sec-sub">Failed, partial & cancelled orders that were paid via M-Pesa or reached the provider — flagged every midnight. Message a client and they move to Follow-up.</div>
        </div>
      </div>
      <div class="sb-tabs" id="rqSubTabs"></div>
      <div class="sb-bar" id="rqSubBar"></div>
      <div id="rqList"></div>
      <div class="rq-bulk" id="rqBulk"></div>`;
  }
  rqRenderSubtabs(); rqRenderBar();
  const sub = RQ_SUBS.find(x => x.id === _rqSub);
  const q = document.getElementById('sbSearch')?.value || '';   // one search box for the whole Support Centre
  const list = document.getElementById('rqList');
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const data = await api(`/reorders/?status=${sub.status}&q=${encodeURIComponent(q)}&limit=300`);
    _rqTasks = data.tasks || [];
    const ids = new Set(_rqTasks.map(t => t.id));
    [..._rqSel].forEach(id => { if (!ids.has(id)) _rqSel.delete(id); });
    rqRenderList();
  } catch (e) {
    list.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
  rqRefreshBadge();
}

/* ── filtering / sorting ───────────────────────────────── */
function rqView() {
  let v = _rqTasks.slice();
  if (_rqSub === 'followup') {
    if (_rqFollow === 'replied') v = v.filter(t => t.customer_replied);
    else if (_rqFollow === 'waiting') v = v.filter(t => !t.customer_replied);
    else if (_rqFollow === 'overdue') v = v.filter(t => t.stale);
  }
  if (_rqF.reason) v = v.filter(t => t.reason === _rqF.reason);
  if (_rqF.pay === 'paid') v = v.filter(t => !t.is_free);
  if (_rqF.pay === 'free') v = v.filter(t => t.is_free);
  if (_rqF.link) v = v.filter(t => (t.link_check || {}).level !== 'ok');
  const by = {
    newest: (a, b) => new Date(b.flagged_at || 0) - new Date(a.flagged_at || 0),
    value:  (a, b) => (b.owed_kes || 0) - (a.owed_kes || 0),
    customer: (a, b) => String(a.user.name || '').localeCompare(String(b.user.name || '')),
    service:  (a, b) => String(a.service_name || '').localeCompare(String(b.service_name || '')),
  }[_rqSort] || (() => 0);
  v.sort(by);
  if (_rqSub === 'followup') {      // replied first (newest reply on top), then the longest silence
    v.sort((a, b) => (b.customer_replied - a.customer_replied)
      || (a.customer_replied ? new Date(b.replied_at) - new Date(a.replied_at) : (b.waiting_hours || 0) - (a.waiting_hours || 0)));
  }
  return v;
}

/* ── list ──────────────────────────────────────────────── */
function rqRenderList() {
  const list = document.getElementById('rqList'); if (!list) return;
  const all = _rqTasks, view = rqView();
  const n = (fn) => all.filter(fn).length;
  const owed = all.reduce((a, t) => a + (t.owed_kes || 0), 0);
  const stat = (v, l) => `<div class="rq-stat"><b>${v}</b><span>${l}</span></div>`;
  let stats = stat(all.length, 'Orders') + stat(_rqKes(owed), 'Paid, still owed');
  if (_rqSub === 'followup') stats += stat(n(t => t.customer_replied), '💬 Replied') + stat(n(t => t.stale), '⚠ Overdue (24h+)');
  else stats += stat(n(t => t.is_free), '🎁 Free orders') + stat(n(t => (t.link_check || {}).level !== 'ok'), '⚠ Link issues');

  const chip = (on, label, js) => `<button class="sb-chip ${on ? 'on' : ''}" onclick="${js}">${label}</button>`;
  const reasons = ['failed', 'partial', 'cancelled'].map(r => {
    const c = n(t => t.reason === r);
    return c ? chip(_rqF.reason === r, `${RQ_REASON[r].label[0] + RQ_REASON[r].label.slice(1).toLowerCase()} ${c}`, `rqSetFilter('reason','${r}')`) : '';
  }).join('');
  const filters = `<div class="rq-filters">
      ${reasons}
      ${chip(_rqF.pay === 'paid', `💳 Paid ${n(t => !t.is_free)}`, `rqSetFilter('pay','paid')`)}
      ${n(t => t.is_free) ? chip(_rqF.pay === 'free', `🎁 Free ${n(t => t.is_free)}`, `rqSetFilter('pay','free')`) : ''}
      ${n(t => (t.link_check || {}).level !== 'ok') ? chip(_rqF.link, `⚠ Link issues ${n(t => (t.link_check || {}).level !== 'ok')}`, `rqSetFilter('link',true)`) : ''}
      <span style="margin-left:auto;font-size:11px;color:var(--muted);">Sort</span>
      <select class="sb-sel" onchange="rqSetSort(this.value)">
        ${[['newest', 'Newest flagged'], ['value', 'Highest value'], ['customer', 'Customer A–Z'], ['service', 'Service A–Z']]
          .map(([v, l]) => `<option value="${v}" ${_rqSort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <span style="font-size:11px;color:var(--muted);">${view.length} shown</span>
    </div>`;

  let body;
  if (!view.length) {
    body = `<div style="text-align:center;padding:46px 20px;color:var(--muted);"><div style="font-size:36px;margin-bottom:8px;">🎉</div>
      <div style="font-size:14px;font-weight:600;color:var(--white);">${all.length ? 'Nothing matches these filters' : (_rqSub === 'followup' ? 'Nobody to follow up' : 'Nothing here')}</div>
      <div style="font-size:12px;margin-top:6px;">New failed, partial or cancelled orders are flagged every midnight.</div></div>`;
  } else {
    const selectable = _rqSub === 'needs' || _rqSub === 'followup';
    body = `<div class="rq-head"><div>${selectable ? `<input type="checkbox" id="rqAll" onchange="rqSelectAll(this.checked)"/>` : ''}</div>
        <div>Order</div><div>Customer</div><div>Link</div><div>Paid</div><div>Status</div><div></div></div>`
      + view.map(rqRow).join('');
  }
  list.innerHTML = `<div class="rq-stats">${stats}</div>${filters}<div class="rq-wrap">${body}</div>`;
  rqRenderBulk();
}

const _rqPlat = (u) => {
  const h = (() => { try { return new URL(u).hostname.toLowerCase(); } catch (_) { return ''; } })();
  return /tiktok|tt\.site/.test(h) ? '🎵' : /instagram|instagr/.test(h) ? '📸' : /youtu/.test(h) ? '▶️' : /facebook|fb\./.test(h) ? '📘'
    : /twitter|x\.com|t\.co/.test(h) ? '𝕏' : /t\.me|telegram/.test(h) ? '✈️' : /spotify/.test(h) ? '🎧' : '🔗';
};
const _rqShort = (u) => {
  try { const x = new URL(u); const t = x.hostname.replace(/^www\./, '') + (x.pathname + x.search).replace(/\/$/, ''); return t.length > 40 ? t.slice(0, 38) + '…' : t; }
  catch (_) { return String(u || '—').slice(0, 40); }
};
const _rqCheck = { ok: ['✓', '#3dd44a'], warn: ['⚠', '#ffb347'], bad: ['✕', '#ff5252'] };

function rqRow(t) {
  const r = RQ_REASON[t.reason] || { label: (t.reason || '').toUpperCase(), color: '#9aa4b2' };
  const pending = t.status === 'pending', contacted = t.status === 'contacted', open = pending || contacted;
  const lc = t.link_check || { level: 'ok', reason: '' }, [ci, cc] = _rqCheck[lc.level] || _rqCheck.ok;
  const qty = t.reason === 'partial' && t.remains ? `${Number(t.remains).toLocaleString()} of ${Number(t.quantity).toLocaleString()} left` : `${Number(t.quantity || 0).toLocaleString()} units`;
  const badge = (txt, c) => `<span class="rq-tag" style="color:${c};">${txt}</span>`;

  let status, sub2 = '';
  if (pending) { status = badge('NEEDS CONTACT', '#ff5252'); sub2 = 'flagged ' + esc(t.flagged_on); }
  else if (contacted && t.customer_replied) { status = badge('💬 REPLIED', '#3dd44a'); sub2 = t.replied_at ? esc(new Date(t.replied_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })) : ''; }
  else if (contacted && t.stale) { status = badge('⚠ NO REPLY', '#ff5252'); sub2 = _rqAge(t.waiting_hours) + ' silent'; }
  else if (contacted) { status = badge('⏳ WAITING', '#ffb347'); sub2 = _rqAge(t.waiting_hours) + ' so far'; }
  else if (t.status === 'reordered') { status = badge('REORDERED', '#3dd44a'); sub2 = t.reordered_at ? esc(new Date(t.reordered_at).toLocaleDateString()) : ''; }
  else { status = badge('DISMISSED', '#9aa4b2'); }

  let primary = '';
  if (pending) primary = `<button class="btn-primary" style="width:auto;padding:7px 12px;font-size:12px;" onclick="rqMessage('${t.id}')">✉ Message</button>`;
  else if (contacted && t.customer_replied) primary = `<button class="btn-primary" style="width:auto;padding:7px 12px;font-size:12px;" onclick="rqReorder('${t.id}')">🔁 Reorder</button>`;
  else if (contacted) primary = `<button class="btn-primary" style="width:auto;padding:7px 12px;font-size:12px;" onclick="rqMessage('${t.id}','followup')">👋 Nudge</button>`;
  const ib = (title, js, ico) => `<button class="btn-secondary rq-ib" title="${title}" onclick="${js}">${ico}</button>`;
  let actions = primary;
  if (pending || (contacted && !t.customer_replied)) actions += ib('Reorder for client (choose link / service)', `rqReorder('${t.id}')`, '🔁');
  if (t.thread_id) actions += ib('Open chat', `rqOpenChat('${t.thread_id}')`, '💬');
  if (open) actions += ib('Dismiss — nothing to redo', `rqDismiss('${t.id}')`, '✕');

  const selectable = pending || contacted;
  const leftColor = contacted && t.customer_replied ? '#3dd44a' : (t.stale ? '#ff5252' : r.color);
  const isOpen = _rqOpen.has(t.id);
  const row = `<div class="rq-row ${_rqSel.has(t.id) ? 'sel' : ''}" data-id="${t.id}" style="border-left-color:${leftColor};">
    <div>${selectable ? `<input type="checkbox" ${_rqSel.has(t.id) ? 'checked' : ''} onchange="rqToggleSel('${t.id}', this.checked)"/>` : ''}</div>
    <div style="min-width:0;cursor:pointer;" onclick="rqToggleOpen('${t.id}')" title="${esc(t.service_name || '')}">
      <div class="rq-c1">${isOpen ? '▾' : '▸'} ${esc(t.service_name || 'Order')}</div>
      <div class="rq-c2">${badge(r.label, r.color)}#${esc(t.order_id.slice(0, 8))} · ${esc(qty)}</div>
    </div>
    <div style="min-width:0;">
      <div class="rq-c1">${esc(t.user.name || '—')}</div>
      <div class="rq-c2" title="${esc(t.user.email || '')}">${esc(t.phone || t.user.email || '')}</div>
    </div>
    <div style="min-width:0;">
      <div class="rq-c1" style="font-weight:600;"><a href="${esc(t.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);" title="${esc(t.link)}">${_rqPlat(t.link)} ${esc(_rqShort(t.link))}</a></div>
      <div class="rq-c2" style="color:${cc};" title="${esc(lc.reason)}">${ci} ${esc(lc.reason)}</div>
    </div>
    <div>
      <div class="rq-c1">${t.is_free ? '🎁 Free' : _rqKes(t.owed_kes, 2)}</div>
      <div class="rq-c2">${t.is_free ? 'no payment' : (t.mpesa_receipt ? esc(t.mpesa_receipt) : 'paid')}</div>
    </div>
    <div><div>${status}</div><div class="rq-c2">${sub2}</div></div>
    <div class="rq-act">${actions}</div>
  </div>`;
  return row + (isOpen ? rqDetail(t) : '');
}

function rqDetail(t) {
  const kv = (k, v) => v ? `<div>${k}: <b>${v}</b></div>` : '';
  const contact = t.contacted_at
    ? `${esc(new Date(t.contacted_at).toLocaleString())}${t.contacted_by_name ? ' by ' + esc(String(t.contacted_by_name).split('@')[0]) : ''}${t.follow_ups_sent ? ' · ' + t.follow_ups_sent + ' follow-up' + (t.follow_ups_sent > 1 ? 's' : '') + ' sent' : ''}` : '';
  const reply = t.customer_replied
    ? `${t.replied_at ? esc(new Date(t.replied_at).toLocaleString()) : ''}${t.reply_count > 1 ? ' (' + t.reply_count + ' messages)' : ''}${t.reply_links.length ? '<br>' + t.reply_links.map(u => `🔗 <a href="${esc(u)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(u)}</a>`).join('<br>') : '<br><span>No link in their reply — open the chat to read it.</span>'}` : '';
  return `<div class="rq-detail">
    ${kv('Customer', esc(t.user.name || '—') + ' · ' + esc(t.user.email || ''))}
    ${kv('Phone', esc(t.phone || ''))}
    ${kv('Amount paid', t.is_free ? '🎁 Free order' : _rqKes(t.charge, 2) + (t.reason === 'partial' ? ` (owed: ${_rqKes(t.owed_kes, 2)})` : ''))}
    ${kv('M-Pesa', t.mpesa_receipt ? esc(t.mpesa_receipt) : (t.paid_via_mpesa ? 'paid (receipt pending)' : 'no payment on order'))}
    ${kv('Provider order', esc(t.provider_order_id || ''))}
    ${kv('Order status', esc(t.order_status || ''))}
    ${kv('Flagged', esc(t.flagged_on))}
    ${kv('Contacted', contact)}
    ${t.link ? `<div style="grid-column:1/-1;">Link: <a href="${esc(t.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(t.link)}</a></div>` : ''}
    ${reply ? `<div style="grid-column:1/-1;border:1px solid rgba(61,212,74,.35);background:rgba(61,212,74,.07);border-radius:8px;padding:6px 10px;">💬 <b>Customer replied</b> ${reply}</div>` : ''}
    ${t.new_order_id ? `<div style="grid-column:1/-1;">🔁 New order #${esc(t.new_order_id.slice(0, 8))} (${Number(t.new_quantity || 0).toLocaleString()}) on ${esc(t.new_link || '')}</div>` : ''}
    ${t.note ? `<div style="grid-column:1/-1;">📝 ${esc(t.note)}</div>` : ''}
  </div>`;
}

function rqToggleOpen(id) { if (_rqOpen.has(id)) _rqOpen.delete(id); else _rqOpen.add(id); rqRenderList(); }

/* ── selection + bulk actions ──────────────────────────── */
function rqToggleSel(id, on) {
  if (on) _rqSel.add(id); else _rqSel.delete(id);
  document.querySelector(`.rq-row[data-id="${CSS.escape(id)}"]`)?.classList.toggle('sel', on);
  rqRenderBulk();
}
function rqSelectAll(on) {
  rqView().filter(t => t.status === 'pending' || t.status === 'contacted').forEach(t => on ? _rqSel.add(t.id) : _rqSel.delete(t.id));
  rqRenderList();
}
function rqClearSel() { _rqSel.clear(); rqRenderList(); }

function rqRenderBulk() {
  const el = document.getElementById('rqBulk'); if (!el) return;
  const sel = [..._rqSel].map(id => _rqTasks.find(t => t.id === id)).filter(Boolean);
  const all = document.getElementById('rqAll');
  if (all) { const vis = rqView().filter(t => t.status === 'pending' || t.status === 'contacted'); all.checked = vis.length > 0 && vis.every(t => _rqSel.has(t.id)); }
  if (!sel.length) { el.style.display = 'none'; return; }
  const value = sel.reduce((a, t) => a + (t.owed_kes || 0), 0);
  const b = 'style="width:auto;padding:8px 14px;"';
  el.style.display = 'flex';
  el.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--white);">${sel.length} selected <span style="color:var(--muted);font-weight:500;">· ${_rqKes(value)} owed</span></div>
    <span id="rqBulkMsg" style="font-size:12px;color:var(--muted);"></span>
    <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-primary" ${b} onclick="rqBulk('message')">✉ Message</button>
      <button class="btn-primary" style="width:auto;padding:8px 14px;background:#ff7043;border-color:#ff7043;" onclick="rqBulk('reorder')" title="Re-place on each order's original link">🔁 Reorder on original links</button>
      <button class="btn-secondary" onclick="rqBulk('dismiss')">✕ Dismiss</button>
      <button class="btn-secondary" onclick="rqClearSel()">Clear</button>
    </div>`;
}

async function rqBulk(kind) {
  const tasks = [..._rqSel].map(id => _rqTasks.find(t => t.id === id)).filter(Boolean).slice(0, 100);
  const replied = (t) => t.status === 'contacted' && t.customer_replied;
  let targets, skipNote, verb;
  if (kind === 'message') {
    targets = tasks.filter(t => !replied(t)); verb = 'Message';
    skipNote = 'Clients who already replied are skipped — reorder them with their new link.';
  } else if (kind === 'reorder') {
    targets = tasks.filter(t => !replied(t) && (t.link_check || {}).level !== 'bad'); verb = 'Reorder';
    skipNote = 'Skipped: clients who replied (use their new link) and orders whose original link is invalid.';
  } else {
    targets = tasks; verb = 'Dismiss'; skipNote = '';
  }
  if (!targets.length) { toast('Nothing in the selection can do that', 'info'); return; }
  const note = kind === 'dismiss' ? (prompt(`Dismiss ${targets.length} order(s) — note (optional):`, '') ?? null) : '';
  if (note === null) return;
  const skipped = tasks.length - targets.length;
  if (kind !== 'dismiss' && !confirm(`${verb} ${targets.length} order(s)?${skipped ? `\n${skipped} will be skipped. ${skipNote}` : ''}`)) return;

  const msg = document.getElementById('rqBulkMsg'), failed = [];
  let done = 0;
  for (const t of targets) {
    if (msg) msg.textContent = `Working… ${done}/${targets.length}`;
    try {
      if (kind === 'message') await api(`/reorders/${t.id}/message`, { method: 'POST', body: JSON.stringify({ followup: t.status === 'contacted' }) });
      else if (kind === 'reorder') await api(`/reorders/${t.id}/reorder`, { method: 'POST', body: JSON.stringify({ use_original_link: true }) });
      else await api(`/reorders/${t.id}/dismiss`, { method: 'POST', body: JSON.stringify({ note }) });
      done++;
    } catch (e) { failed.push({ t, err: e.message || 'failed' }); }
  }
  _rqSel.clear();
  await rqLoad();
  toast(`${verb}: ${done} done${failed.length ? `, ${failed.length} failed` : ''}${skipped ? `, ${skipped} skipped` : ''}`, failed.length ? 'error' : 'success');
  if (failed.length) {
    rqModal(`${failed.length} could not be processed`,
      `<div style="font-size:12px;line-height:1.7;max-height:300px;overflow:auto;">${failed.map(f =>
        `<div style="padding:6px 0;border-bottom:1px solid var(--border);"><b style="color:var(--white);">${esc(f.t.user.name || '—')}</b> · ${esc((f.t.service_name || '').slice(0, 50))}<br><span style="color:#ff5252;">${esc(f.err)}</span></div>`).join('')}</div>
       <div style="font-size:11px;color:var(--muted);margin-top:8px;">Use 🔁 on each one to pick a different link or a similar service.</div>`,
      'OK', async () => {});
  }
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

async function rqMessage(id, kind) {
  const followup = kind === 'followup';
  let body = '';
  try { body = (await api(`/reorders/${id}/preview-message${followup ? '?kind=followup' : ''}`)).body; } catch (e) { toast(e.message, 'error'); return; }
  rqModal(followup ? 'Nudge client — still need their link' : 'Message client — ask for a fresh link',
    `<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Sent in a support thread; they get it in their chat.${followup ? '' : ' They then move to the Follow-up tab.'}</div>
     <textarea id="rqMsgBody" rows="8" style="${_rqField}resize:vertical;">${esc(body)}</textarea>`,
    followup ? '👋 Send nudge' : '✉ Send',
    async () => {
      await api(`/reorders/${id}/message`, { method: 'POST', body: JSON.stringify({ body: document.getElementById('rqMsgBody').value, followup }) });
      toast(followup ? 'Nudge sent' : 'Message sent — moved to Follow-up', 'success'); rqLoad();
    });
}

/* ── REORDER FOR CLIENT ─────────────────────────────────────────────
 * One dialog, three decisions (all pre-filled so the common case is one click):
 *   LINK     – re-use the original link (if it looks valid), pick a link the customer
 *              sent back in the support chat, or type a new one.
 *   SERVICE  – keep the original service, or — if it's unavailable — pick a similar one.
 *   QUANTITY – auto-filled with what's still undelivered (still editable).
 * Data comes from GET /reorders/{id}/options. NB: the link check is format-level
 * only; it can't confirm a post is still live or public.                          */
const _rqBadge = (check) => {
  const c = { ok: '#3dd44a', warn: '#ffb347', bad: '#ff5252' }[check.level] || '#9aa4b2';
  const i = { ok: '✓', warn: '⚠', bad: '✕' }[check.level] || '•';
  return `<span style="font-size:10px;font-weight:700;color:${c};">${i} ${esc(check.reason)}</span>`;
};
const _rqOptCard = (name, value, checked, disabled, inner) => `
  <label style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? .55 : 1};background:var(--card);">
    <input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} style="margin-top:3px;"/>
    <div style="min-width:0;flex:1;font-size:12px;line-height:1.6;">${inner}</div>
  </label>`;
const _rqLbl = (t) => `<div style="font-size:11px;font-weight:700;color:var(--muted);margin:14px 0 6px;">${t}</div>`;

async function rqReorder(id) {
  const t = _rqTasks.find(x => x.id === id); if (!t) return;
  let o;
  try { o = await api(`/reorders/${id}/options`); } catch (e) { toast(e.message || 'Could not load reorder options', 'error'); return; }

  const origOk = o.original_link.check.level !== 'bad';       // usable (ok or warn)
  // Default link choice: newest valid link the customer sent back > original link if it looks fine > type a new one.
  const goodCust = (o.customer_links || []).findIndex(c => c.check.level === 'ok');
  const defLink = goodCust >= 0 ? 'cust:' + goodCust : (o.original_link.check.level === 'ok' ? 'orig' : 'new');
  const svcUnavailable = !o.service.available;
  const alts = o.alternatives || [];
  const custLinks = o.customer_links || [];
  const defaultQty = o.quantity;

  // ── LINK block ──
  const linkHtml =
    _rqOptCard('rqLink', 'orig', defLink === 'orig', !origOk,
      `<b style="color:var(--white);">Original link</b> ${_rqBadge(o.original_link.check)}<br>
       <a href="${esc(o.original_link.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(o.original_link.url || '—')}</a>
       ${o.original_status === 'cancelled' && origOk ? '<br><span style="color:var(--muted);">Order was cancelled — if the link was private/invalid it can fail again, so open it to check.</span>' : ''}`)
    + custLinks.map((c, i) => _rqOptCard('rqLink', 'cust:' + i, defLink === 'cust:' + i, c.check.level === 'bad',
      `<b style="color:var(--white);">Sent by customer in chat</b> ${_rqBadge(c.check)}<br>
       <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(c.url)}</a>`)).join('')
    + _rqOptCard('rqLink', 'new', defLink === 'new', false,
      `<b style="color:var(--white);">Enter a new link</b>
       <input id="rqNewLink" placeholder="https://…" style="${_rqField}margin-top:6px;"/>
       <div id="rqNewLinkHint" style="margin-top:4px;"></div>`);

  // ── SERVICE block ──
  const paid = o.paid_kes, origRate = o.service.detail ? Number(o.service.detail.rate_kes) : null;
  const delta = (a) => a.more_units ? `<span style="color:#3dd44a;">+${(a.quantity - defaultQty).toLocaleString()} vs original</span>`
    : a.fewer_units ? `<span style="color:#ffb347;">${(a.quantity - defaultQty).toLocaleString()} vs original</span>` : 'same as original';
  const altRows = alts.map((a, i) => _rqOptCard('rqAlt', String(a.service), i === 0 && svcUnavailable, false,
    `<b style="color:var(--white);">${esc(a.name)}</b><br>
     <span style="color:var(--white);font-weight:700;">→ ${Number(a.quantity).toLocaleString()} units</span>
     <span style="color:var(--muted);">(${o.is_free ? 'free order — original quantity kept' : 'what the KES ' + Number(paid).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' paid buys'} · ${delta(a)}${a.capped ? ' · <span style="color:#ffb347;">capped at this service\'s max</span>' : ''})</span><br>
     <span style="color:var(--muted);">KES ${Number(a.rate_kes).toLocaleString()}/1k · limits ${Number(a.min).toLocaleString()}–${Number(a.max).toLocaleString()}
       ${a.refill ? ' · ♻ refill' : ''} · costs you ~KES ${Number(a.est_cost_kes).toLocaleString()}
       ${a.cheaper ? ' · <span style="color:#3dd44a;">cheaper than original</span>' : a.pricier ? ' · <span style="color:#ffb347;">pricier than original</span>' : ''}
       · ${Math.round(a.similarity * 100)}% match</span>`)).join('');
  const svcHtml =
    `<div style="font-size:12px;margin-bottom:8px;">${svcUnavailable
        ? `<span style="color:#ff5252;font-weight:700;">⚠ Original service unavailable</span> <span style="color:var(--muted);">— ${esc(o.service.reason)}</span>`
        : `<span style="color:#3dd44a;font-weight:700;">✓ Original service available</span>`}</div>`
    + _rqOptCard('rqSvc', 'orig', !svcUnavailable, false,
        `<b style="color:var(--white);">Keep original service</b><br><span style="color:var(--muted);">${esc(o.service.name)}</span>`)
    + _rqOptCard('rqSvc', 'alt', svcUnavailable && alts.length > 0, !alts.length,
        `<b style="color:var(--white);">Use a similar service</b> ${alts.length ? '' : '<span style="color:#ff5252;">(none found that fits this quantity)</span>'}`)
    + `<div id="rqAltList" style="display:${svcUnavailable && alts.length ? 'block' : 'none'};max-height:230px;overflow:auto;margin-left:6px;">${altRows}</div>`;

  const el = rqModal('Reorder for client',
    `<div style="font-size:12px;color:var(--muted);line-height:1.6;">Re-places the order straight to the provider at <b style="color:var(--white);">no charge</b> (the client already paid).</div>
     ${_rqLbl('LINK')}${linkHtml}
     ${_rqLbl('SERVICE')}${svcHtml}
     ${_rqLbl(`<span id="rqQtyLbl">QUANTITY (max ${Number(o.max_quantity).toLocaleString()})</span>`)}
     <input id="rqNewQty" type="number" min="1" max="${o.max_quantity}" value="${defaultQty}" style="${_rqField}"/>
     <div id="rqQtyHint" style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.5;"></div>`,
    '🔁 Place reorder',
    async () => {
      const sel = (n) => el.querySelector(`input[name="${n}"]:checked`)?.value;
      const quantity = parseInt(document.getElementById('rqNewQty').value, 10);
      if (!quantity || quantity < 1) throw new Error('Enter a valid quantity');
      const body = { quantity };

      const ls = sel('rqLink');
      if (ls === 'orig') body.use_original_link = true;
      else if (ls && ls.startsWith('cust:')) body.link = custLinks[parseInt(ls.slice(5), 10)].url;
      else {
        const link = document.getElementById('rqNewLink').value.trim();
        if (!/^https?:\/\//i.test(link)) throw new Error('Enter a valid http(s) link');
        body.link = link;
      }
      if (sel('rqSvc') === 'alt') {
        const sid = parseInt(sel('rqAlt'), 10);
        if (!sid) throw new Error('Pick a replacement service');
        body.service_id = sid;
      }
      try {
        const res = await api(`/reorders/${id}/reorder`, { method: 'POST', body: JSON.stringify(body) });
        toast(`Reorder placed (#${res.new_order_id.slice(0, 8)})${res.service_substituted ? ' on a similar service' : ''}`, 'success');
        rqLoad();
      } catch (e) {
        // Provider refused it — most often a dead service. Open the alternatives so the next click can fix it.
        if (alts.length && sel('rqSvc') === 'orig' && /provider|service/i.test(e.message || '')) {
          const alt = el.querySelector('input[name="rqSvc"][value="alt"]'); if (alt) { alt.checked = true; alt.dispatchEvent(new Event('change', { bubbles: true })); }
          syncQty();
          const first = el.querySelector('input[name="rqAlt"]'); if (first && !el.querySelector('input[name="rqAlt"]:checked')) first.checked = true;
          e.message = (e.message || 'Provider error') + ' — try a similar service below.';
        }
        throw e;
      }
    });

  // ── interactions ──
  const altList = el.querySelector('#rqAltList');
  const qtyEl = el.querySelector('#rqNewQty'), qtyHint = el.querySelector('#rqQtyHint'), qtyLbl = el.querySelector('#rqQtyLbl');
  // The quantity follows the service: original service → original/undelivered quantity;
  // replacement service → what the amount PAID buys at that service's price.
  const syncQty = () => {
    const onAlt = el.querySelector('input[name="rqSvc"]:checked')?.value === 'alt';
    const a = onAlt ? alts.find(x => String(x.service) === el.querySelector('input[name="rqAlt"]:checked')?.value) : null;
    if (a) {
      qtyEl.value = a.quantity; qtyEl.max = a.quantity;
      qtyLbl.textContent = `QUANTITY (max ${Number(a.quantity).toLocaleString()} on this service)`;
      qtyHint.innerHTML = o.is_free
        ? 'Free order — nothing to price-match, so the original quantity is kept.'
        : `Price-matched: <b style="color:var(--white);">KES ${Number(paid).toLocaleString(undefined, { maximumFractionDigits: 2 })}</b> paid ÷ KES ${Number(a.rate_kes).toLocaleString()}/1k = <b style="color:var(--white);">${Number(a.quantity).toLocaleString()} units</b>`
          + (origRate ? ` (original service: ${Number(defaultQty).toLocaleString()} at KES ${origRate.toLocaleString()}/1k)` : '') + '. You can lower it, not raise it.';
    } else {
      qtyEl.value = defaultQty; qtyEl.max = o.max_quantity;
      qtyLbl.textContent = `QUANTITY (max ${Number(o.max_quantity).toLocaleString()})`;
      qtyHint.textContent = `Auto-filled with ${t.reason === 'partial' ? 'the undelivered amount' : 'the original quantity'}. You can still change it.`;
    }
  };
  el.addEventListener('change', (ev) => {
    if (ev.target.name === 'rqSvc') {
      altList.style.display = ev.target.value === 'alt' ? 'block' : 'none';
      if (ev.target.value === 'alt' && !el.querySelector('input[name="rqAlt"]:checked')) {
        const f = el.querySelector('input[name="rqAlt"]'); if (f) f.checked = true;
      }
    }
    if (ev.target.name === 'rqSvc' || ev.target.name === 'rqAlt') syncQty();
  });
  syncQty();
  const newLink = el.querySelector('#rqNewLink'), hint = el.querySelector('#rqNewLinkHint');
  newLink.addEventListener('focus', () => { const r = el.querySelector('input[name="rqLink"][value="new"]'); if (r) r.checked = true; });
  newLink.addEventListener('input', () => {   // light client-side check while typing
    const v = newLink.value.trim();
    if (!v) { hint.innerHTML = ''; return; }
    if (!/^https?:\/\//i.test(v)) hint.innerHTML = _rqBadge({ level: 'bad', reason: 'Must start with http:// or https://' });
    else if (/\s|%20/i.test(v)) hint.innerHTML = _rqBadge({ level: 'bad', reason: 'Contains pasted text — not a clean link' });
    else hint.innerHTML = _rqBadge({ level: 'ok', reason: 'Format OK' });
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

/* ── ONE-PRESS BULK REORDER ─────────────────────────────────────────
 * Re-places every open task on the customer's ORIGINAL link (qty = what was
 * undelivered) at no charge and sends each customer an explanatory message.
 * Runs in small batches (backend caps each call) so no request times out, and
 * remembers failed/skipped ids so a bad task is never retried in a loop.
 * Tasks already "Contacted" are left out unless ticked — those customers may
 * have replied with a NEW link, and reordering on the old one would be wrong.   */
async function rqReorderAll() {
  let s;
  try { s = await api('/reorders/summary'); } catch (e) { toast(e.message, 'error'); return; }
  const pending = s.pending || 0, contacted = s.contacted || 0;
  if (!pending && !contacted) { toast('Nothing open to reorder', 'success'); return; }

  rqModal('Reorder ALL on the original links',
    `<div style="font-size:12px;color:var(--muted);line-height:1.7;">
       Every <b style="color:var(--white);">Needs contact</b> order (<b style="color:var(--white);">${pending}</b>) will be re-placed straight to the provider on the
       <b style="color:var(--white);">same link the customer originally used</b>, at <b>no charge</b> (they already paid) — for partial orders only the undelivered part.<br><br>
       Each customer then gets a message in their support chat explaining that this is a <b style="color:var(--white);">free replacement for their earlier failed order</b>, with the link it was placed on and how to ask for a different one.
     </div>
     ${contacted ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:12px;color:var(--muted);cursor:pointer;">
       <input type="checkbox" id="rqIncContacted" style="margin-top:2px;"/>
       <span>Also include the <b style="color:var(--white);">${contacted}</b> already-contacted order(s). Untick unless you're sure no customer replied with a new link.</span></label>` : ''}
     <div style="margin-top:14px;padding:10px 12px;border:1px solid #ffb347;border-radius:8px;font-size:11px;color:#ffb347;line-height:1.6;">
       ⚠ If an order was cancelled because its link was private or invalid, it can fail again. Quickly scan the list first. Orders with no usable link are skipped and shown in the summary.
     </div>
     <div id="rqBulkProgress" style="margin-top:14px;font-size:12px;color:var(--white);"></div>`,
    '🔁 Reorder all now',
    async () => {
      const includeContacted = !!document.getElementById('rqIncContacted')?.checked;
      const prog = document.getElementById('rqBulkProgress');
      const total = pending + (includeContacted ? contacted : 0);
      const placed = [], failed = [], skipped = [];
      const skipIds = [];
      let remaining = total;
      while (remaining > 0) {
        prog.innerHTML = `Working… ${placed.length} placed · ${failed.length} failed · ${skipped.length} skipped · ${remaining} left`;
        const r = await api('/reorders/reorder-all', { method: 'POST', body: JSON.stringify({ limit: 10, include_contacted: includeContacted, skip_ids: skipIds }) });
        placed.push(...r.placed); failed.push(...r.failed); skipped.push(...r.skipped);
        [...r.failed, ...r.skipped].forEach(x => skipIds.push(x.task_id));
        if (!r.placed.length && !r.failed.length && !r.skipped.length) break;   // nothing processed — avoid looping
        remaining = r.remaining;
      }
      rqLoad();
      const problems = [...failed.map(x => ['Failed', x]), ...skipped.map(x => ['Skipped', x])];
      rqModal('Bulk reorder finished',
        `<div style="font-size:13px;line-height:1.8;">
           ✅ <b>${placed.length}</b> reordered and customers messaged<br>
           ${failed.length ? `❌ <b>${failed.length}</b> failed (still open — retry later)<br>` : ''}
           ${skipped.length ? `⏭ <b>${skipped.length}</b> skipped (no usable link)<br>` : ''}
         </div>
         ${problems.length ? `<div style="margin-top:10px;max-height:220px;overflow:auto;font-size:11px;color:var(--muted);line-height:1.6;">
           ${problems.map(([k, x]) => `<div>• ${k} #${esc(x.order_id)} ${esc(x.service_name || '')} — ${esc(x.reason)}</div>`).join('')}
         </div>` : ''}`,
        'Close', async () => {});
      document.getElementById('rqModalCancel')?.remove();
    });
}


async function rqNudgeStale() {
  const n = _rqSum.stale || 0;
  if (!n) { toast('No overdue follow-ups', 'success'); return; }
  if (!confirm(`Send the follow-up message to the ${n} client(s) who haven't replied in ${_rqSum.stale_after_hours || 24}h+?\nClients who have replied are not messaged.`)) return;
  try {
    const r = await api('/reorders/nudge-stale', { method: 'POST', body: JSON.stringify({ hours: _rqSum.stale_after_hours || 24 }) });
    toast(`Nudged ${r.sent} client(s)${r.failed ? `, ${r.failed} failed` : ''}`, r.failed ? 'error' : 'success');
    rqLoad();
  } catch (e) { toast(e.message, 'error'); }
}

/* Give up waiting: re-place every contacted-but-silent client on their ORIGINAL link.
 * Clients who replied are always skipped by the backend (they sent a new link). */
function rqReorderOverdue() {
  rqModal('Reorder silent clients on their original link',
    `<div style="font-size:12px;color:var(--muted);line-height:1.7;">
       Re-places every contacted client who has <b style="color:var(--white);">not replied</b> for at least
       <input id="rqSilentHrs" type="number" min="1" max="720" value="48" style="${_rqField}width:80px;display:inline-block;margin:0 6px;padding:6px 8px;"/> hours, on the link they originally used, at <b>no charge</b>.
       Each customer is told in their chat. Clients who replied are skipped.
     </div>
     <div id="rqSilentProg" style="margin-top:12px;font-size:12px;"></div>`,
    '🔁 Reorder now',
    async () => {
      const hrs = parseInt(document.getElementById('rqSilentHrs').value, 10) || 48;
      const prog = document.getElementById('rqSilentProg');
      const placed = [], failed = [], skipped = [], skipIds = [];
      for (let guard = 0; guard < 100; guard++) {
        prog.textContent = `Working… ${placed.length} placed · ${failed.length} failed · ${skipped.length} skipped`;
        const r = await api('/reorders/reorder-all', { method: 'POST', body: JSON.stringify({ limit: 10, only_contacted: true, min_waiting_hours: hrs, skip_ids: skipIds }) });
        placed.push(...r.placed); failed.push(...r.failed); skipped.push(...r.skipped);
        [...r.failed, ...r.skipped].forEach(x => skipIds.push(x.task_id));
        if ((!r.placed.length && !r.failed.length && !r.skipped.length) || !r.remaining) break;
      }
      rqLoad();
      toast(`${placed.length} reordered${failed.length ? `, ${failed.length} failed` : ''}${skipped.length ? `, ${skipped.length} skipped` : ''}`, failed.length ? 'error' : 'success');
    });
}

async function rqFlagNow() {
  try {
    const r = await api('/reorders/flag-now', { method: 'POST' });
    toast(`Flagged ${r.new} new order(s); ${r.open_total} open`, 'success');
    rqLoad();
  } catch (e) { toast(e.message, 'error'); }
}

// Open the customer's support thread (chat only, with a "Back to Reorders" button).
function rqOpenChat(threadId) {
  if (typeof sbFocusThread === 'function') sbFocusThread(threadId, { fromReorders: true });
  else if (typeof openSupportThread === 'function') openSupportThread(threadId);
}
