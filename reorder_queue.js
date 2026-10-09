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

let _rqTasks = [];
let _rqSub = 'needs';          // needs | followup | reordered | dismissed
let _rqFollow = 'all';         // follow-up filter: all | replied | waiting | overdue
let _rqSum = {};

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

function rqSetSub(id) { _rqSub = id; _rqFollow = 'all'; rqLoad(); }
function rqSetFollow(f) { _rqFollow = f; rqLoad(); }

function rqRenderBar() {
  const el = document.getElementById('rqSubBar'); if (!el) return;
  const sub = RQ_SUBS.find(x => x.id === _rqSub);
  const chip = (id, label) => `<button class="sb-chip ${_rqFollow === id ? 'on' : ''}" onclick="rqSetFollow('${id}')">${label}</button>`;
  let html = `<div class="sb-hint">${esc(sub.sub)}</div>`;
  if (_rqSub === 'needs') {
    html += `<button class="btn-secondary" onclick="rqFlagNow()" title="Flag new failed/partial/cancelled orders now instead of waiting for midnight">⚑ Flag now</button>
      <button class="btn-primary" style="width:auto;padding:9px 16px;" onclick="rqMessageAll()">✉ Message all unsent</button>
      <button class="btn-primary" onclick="rqReorderAll()" title="Re-place every open order on its original link and tell each customer" style="width:auto;padding:9px 16px;background:#ff7043;border-color:#ff7043;">🔁 Reorder ALL on original links</button>`;
  } else if (_rqSub === 'followup') {
    html += chip('all', 'All') + chip('replied', `💬 Replied${_rqSum.replied ? ' (' + _rqSum.replied + ')' : ''}`)
      + chip('waiting', `⏳ Waiting${_rqSum.waiting ? ' (' + _rqSum.waiting + ')' : ''}`) + chip('overdue', `⚠ Overdue${_rqSum.stale ? ' (' + _rqSum.stale + ')' : ''}`)
      + `<button class="btn-primary" style="width:auto;padding:9px 16px;" onclick="rqNudgeStale()" title="Send a follow-up message to everyone who hasn't replied in 24h+">👋 Nudge overdue</button>
         <button class="btn-primary" onclick="rqReorderOverdue()" title="Give up waiting: re-place silent clients on their original link" style="width:auto;padding:9px 16px;background:#ff7043;border-color:#ff7043;">🔁 Reorder silent ones…</button>`;
  }
  el.innerHTML = html;
}

async function rqLoad() {
  const pane = document.getElementById('reorderQueuePane');
  if (!pane) return;
  if (!document.getElementById('rqList')) {
    pane.innerHTML = `
      <div class="sec-hd">
        <div>
          <div class="sec-title">REORDER QUEUE</div>
          <div class="sec-sub">Failed, partial & cancelled orders that were paid via M-Pesa or reached the provider — flagged every midnight. Message a client and they move to Follow-up.</div>
        </div>
      </div>
      <div class="sb-tabs" id="rqSubTabs"></div>
      <div class="sb-bar" id="rqSubBar"></div>
      <div id="rqList"></div>`;
  }
  rqRenderSubtabs(); rqRenderBar();
  const sub = RQ_SUBS.find(x => x.id === _rqSub);
  const q = document.getElementById('sbSearch')?.value || '';   // one search box for the whole Support Centre
  const list = document.getElementById('rqList');
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const data = await api(`/reorders/?status=${sub.status}&q=${encodeURIComponent(q)}&limit=300`);
    let tasks = data.tasks || [];
    if (_rqSub === 'followup') {
      if (_rqFollow === 'replied') tasks = tasks.filter(t => t.customer_replied);
      else if (_rqFollow === 'waiting') tasks = tasks.filter(t => !t.customer_replied);
      else if (_rqFollow === 'overdue') tasks = tasks.filter(t => t.stale);
      // replied first (newest reply on top), then the longest silence
      tasks.sort((a, b) => (b.customer_replied - a.customer_replied)
        || (a.customer_replied ? new Date(b.replied_at) - new Date(a.replied_at) : (b.waiting_hours || 0) - (a.waiting_hours || 0)));
    }
    _rqTasks = tasks;
    list.innerHTML = tasks.length ? tasks.map(rqCard).join('')
      : `<div style="text-align:center;padding:50px 20px;color:var(--muted);"><div style="font-size:38px;margin-bottom:10px;">🎉</div><div style="font-size:14px;font-weight:600;">${_rqSub === 'followup' ? 'Nobody to follow up' : 'Nothing here'}</div><div style="font-size:12px;margin-top:6px;">New failed, partial or cancelled orders are flagged every midnight.</div></div>`;
  } catch (e) {
    list.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
  rqRefreshBadge();
}

function rqCard(t) {
  const r = RQ_REASON[t.reason] || { label: (t.reason || '').toUpperCase(), color: '#9aa4b2' };
  const pending = t.status === 'pending', contacted = t.status === 'contacted', open = pending || contacted;
  const pay = t.mpesa_receipt ? `M-Pesa <b>${esc(t.mpesa_receipt)}</b>`
    : t.paid_via_mpesa ? 'M-Pesa paid (receipt pending)' : 'No M-Pesa payment on order';
  const qtyTxt = t.reason === 'partial' && t.remains ? `${Number(t.remains).toLocaleString()} left of ${Number(t.quantity).toLocaleString()}` : Number(t.quantity || 0).toLocaleString();
  const badge = (txt, c) => `<span style="font-size:10px;font-weight:800;letter-spacing:.5px;padding:3px 9px;border-radius:20px;border:1px solid ${c};color:${c};">${txt}</span>`;

  let stateBadge = '';
  if (pending) stateBadge = badge('Needs contact', '#ff5252');
  else if (contacted && t.customer_replied) stateBadge = badge('💬 CUSTOMER REPLIED', '#3dd44a');
  else if (contacted && t.stale) stateBadge = badge(`⚠ No reply · ${_rqAge(t.waiting_hours)}`, '#ff5252');
  else if (contacted) stateBadge = badge(`⏳ Waiting · ${_rqAge(t.waiting_hours)}`, '#ffb347');
  else if (t.status === 'reordered') stateBadge = badge('Reordered ✓', '#3dd44a');
  else stateBadge = badge('Dismissed', '#9aa4b2');

  const contactLine = t.contacted_at
    ? ` · ✉ contacted ${esc(new Date(t.contacted_at).toLocaleString())}${t.contacted_by_name ? ' by ' + esc(String(t.contacted_by_name).split('@')[0]) : ''}${t.follow_ups_sent ? ' · ' + t.follow_ups_sent + ' follow-up' + (t.follow_ups_sent > 1 ? 's' : '') + ' sent' : ''}`
    : '';
  const replyBox = contacted && t.customer_replied
    ? `<div style="margin-top:8px;padding:8px 10px;border:1px solid rgba(61,212,74,.35);background:rgba(61,212,74,.07);border-radius:8px;font-size:12px;line-height:1.6;">
         💬 Replied ${t.replied_at ? esc(new Date(t.replied_at).toLocaleString()) : ''}${t.reply_count > 1 ? ' (' + t.reply_count + ' messages)' : ''}<br>
         ${t.reply_links.length ? t.reply_links.map(u => `🔗 <a href="${esc(u)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(u)}</a>`).join('<br>') : '<span style="color:var(--muted);">No link in their reply — open the chat to read it.</span>'}
       </div>` : '';

  let actions = '';
  if (pending) {
    actions = `<button class="btn-secondary" onclick="rqMessage('${t.id}')">✉ Message client</button>`;
  } else if (contacted && t.customer_replied) {
    actions = `<button class="btn-primary" onclick="rqReorder('${t.id}')">🔁 Reorder with their link</button>`;
  } else if (contacted) {
    actions = `<button class="btn-secondary" onclick="rqMessage('${t.id}','followup')">👋 Nudge</button>`;
  }
  if (t.thread_id) actions += `<button class="btn-secondary" onclick="rqOpenChat('${t.thread_id}')">💬 Open chat</button>`;
  if (pending || (contacted && !t.customer_replied)) actions += `<button class="btn-secondary" onclick="rqReorder('${t.id}')">🔁 Reorder for client</button>`;
  if (open) actions += `<button class="btn-secondary" onclick="rqDismiss('${t.id}')">✕ Dismiss</button>`;

  return `<div style="border:1px solid var(--border);border-left:3px solid ${contacted && t.customer_replied ? '#3dd44a' : r.color};border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--card);">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
      <div style="font-weight:700;font-size:14px;">${esc(t.service_name || 'Order')} <span style="color:var(--muted);font-weight:500;font-size:12px;">· #${esc(t.order_id.slice(0, 8))} · ${esc(qtyTxt)}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">${badge(r.label, r.color)}${stateBadge}</div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7;">
      👤 <b style="color:var(--white);">${esc(t.user.name || '—')}</b> · ${esc(t.user.email || '')} ${t.phone ? '· 📞 ' + esc(t.phone) : ''}<br>
      💳 ${pay}${t.provider_order_id ? ' · Provider order <b>' + esc(t.provider_order_id) + '</b>' : ''} · KES ${Number(t.charge || 0).toLocaleString()}<br>
      🔗 <a href="${esc(t.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--green);word-break:break-all;">${esc(t.link)}</a><br>
      ⚑ Flagged ${esc(t.flagged_on)}${contactLine}${t.new_order_id ? ' · 🔁 new order #' + esc(t.new_order_id.slice(0, 8)) + ' (' + Number(t.new_quantity || 0).toLocaleString() + ') on ' + esc(t.new_link || '') : ''}${t.note ? '<br>📝 ' + esc(t.note) : ''}
    </div>
    ${replyBox}
    ${actions ? `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">${actions}</div>` : ''}
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
  const altRows = alts.map((a, i) => _rqOptCard('rqAlt', String(a.service), i === 0 && svcUnavailable, false,
    `<b style="color:var(--white);">${esc(a.name)}</b><br>
     <span style="color:var(--muted);">KES ${Number(a.rate_kes).toLocaleString()}/1k · limits ${Number(a.min).toLocaleString()}–${Number(a.max).toLocaleString()}
       ${a.refill ? ' · ♻ refill' : ''} · ~KES ${Number(a.est_cost_kes).toLocaleString()} to you for this order
       ${a.cheaper ? ' · <span style="color:#3dd44a;">cheaper than original</span>' : a.pricier ? ' · <span style="color:#ffb347;">costs more than original</span>' : ''}
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
     ${_rqLbl(`QUANTITY (max ${Number(o.max_quantity).toLocaleString()})`)}
     <input id="rqNewQty" type="number" min="1" max="${o.max_quantity}" value="${defaultQty}" style="${_rqField}"/>
     <div style="font-size:11px;color:var(--muted);margin-top:4px;">Auto-filled with ${t.reason === 'partial' ? 'the undelivered amount' : 'the original quantity'}. You can still change it.</div>`,
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
          const first = el.querySelector('input[name="rqAlt"]'); if (first && !el.querySelector('input[name="rqAlt"]:checked')) first.checked = true;
          e.message = (e.message || 'Provider error') + ' — try a similar service below.';
        }
        throw e;
      }
    });

  // ── interactions ──
  const altList = el.querySelector('#rqAltList');
  el.addEventListener('change', (ev) => {
    if (ev.target.name === 'rqSvc') {
      altList.style.display = ev.target.value === 'alt' ? 'block' : 'none';
      if (ev.target.value === 'alt' && !el.querySelector('input[name="rqAlt"]:checked')) {
        const f = el.querySelector('input[name="rqAlt"]'); if (f) f.checked = true;
      }
    }
  });
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
