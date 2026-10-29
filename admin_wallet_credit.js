/* ═══════════════ ADMIN → WALLET CREDIT ═══════════════
 * The EndaViral Wallet (non-withdrawable order credit). Every midnight the
 * backend refunds each PAID failed / partial / cancelled / stuck order into
 * the customer's wallet and messages them; the customer reorders themselves
 * and pays with Wallet, M-Pesa, or Wallet + M-Pesa. Staff no longer re-place
 * these orders.
 *
 * This page shows: totals (credit outstanding, refunded, spent, how many
 * refunded customers already reordered, last night's run), every refund (with
 * "reordered since?" and "not messaged" flags), every order paid with the
 * wallet, customers holding credit, and a customer's full ledger. Admins can
 * add / remove credit with a reason; staff can refund one order on demand.
 * Also renders the wallet box inside any order's popup (awcLoadOrderBox).
 *
 * Backend: /admin/wallet-credit/* (app/routers/admin_wallet_credit.py).
 * Loaded only when the tab is opened or Refresh is pressed — no timers.
 * Depends on globals: api(), toast(), esc(), fmtKES(), currentUser,
 * openOrderDetailModal(), adminMessageCustomer(), sbFocusThread().
 * ════════════════════════════════════════════════════ */

let _awcView = 'refunds';
let _awcQ = '';
let _awcFilter = { reason: '', used: '' };

const AWC_VIEWS = [
  { id: 'refunds',   label: '↩️ Refunds',          hint: 'Every order refunded into a customer\'s wallet — by the midnight job, instantly (wallet order the panel rejected), or by staff. "Reordered" means the customer has since paid for a new order with their wallet.' },
  { id: 'payments',  label: '🛒 Paid with wallet', hint: 'Orders customers paid for with wallet credit — fully, or wallet + M-Pesa. "Released" = the M-Pesa part failed, so the wallet part went back to the wallet.' },
  { id: 'customers', label: '👥 Holding credit',  hint: 'Customers with credit still to spend, highest first. Open one to see their full wallet history.' },
];
const AWC_REASON = {
  failed:    ['FAILED', '#ff5252'],
  partial:   ['PARTIAL', '#ffb347'],
  cancelled: ['CANCELLED', '#9aa4b2'],
  stuck:     ['STUCK', '#2196f3'],
  stopped:   ['STOPPED 24h+', '#4fc3f7'],
};
const AWC_KIND = { refund: ['↩️ Refund', '#3dd44a'], spend: ['🛒 Order', '#ff8a65'], release: ['↩️ Returned', '#3dd44a'], adjust: ['🛠️ Adjust', '#2196f3'] };

const _awcCard = 'background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;';
const _awcLbl = 'font-size:10.5px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;';
const _awcIsAdmin = () => !!(typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin');
const _awcDate = (iso) => iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const _awcTag = (txt, c) => `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;border:1px solid ${c};color:${c};white-space:nowrap;">${txt}</span>`;

function _awcStat(label, value, sub, color, title) {
  return `<div style="${_awcCard}" ${title ? `title="${esc(title)}"` : ''}>
    <div style="${_awcLbl}">${esc(label)}</div>
    <div style="font-size:22px;font-weight:800;${color ? 'color:' + color + ';' : ''}">${value}</div>
    ${sub ? `<div style="font-size:11px;color:var(--muted);margin-top:3px;">${sub}</div>` : ''}
  </div>`;
}

function awcSetView(v) { _awcView = v; _awcFilter = { reason: '', used: '' }; loadAdminWalletCredit(); }
function awcSetFilter(k, v) { _awcFilter[k] = _awcFilter[k] === v ? '' : v; loadAdminWalletCredit(true); }
let _awcSearchT = null;
function awcSearch(v) { _awcQ = v; clearTimeout(_awcSearchT); _awcSearchT = setTimeout(() => loadAdminWalletCredit(true), 350); }

async function loadAdminWalletCredit(listOnly) {
  const root = document.getElementById('walletCreditRoot');
  if (!root) return;
  if (!listOnly || !document.getElementById('awcList')) {
    root.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading wallet credit…</span></div>';
  } else {
    document.getElementById('awcList').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  }
  try {
    const q = encodeURIComponent(_awcQ || '');
    let url = `/admin/wallet-credit/${_awcView}?limit=200&q=${q}`;
    if (_awcView === 'refunds') url += `&reason=${encodeURIComponent(_awcFilter.reason)}&used=${encodeURIComponent(_awcFilter.used)}`;
    const [sum, data] = await Promise.all([
      (listOnly && window._awcSum) ? Promise.resolve(window._awcSum) : api('/admin/wallet-credit/summary'),
      api(url),
    ]);
    window._awcSum = sum;
    if (listOnly && document.getElementById('awcList')) {
      document.getElementById('awcList').innerHTML = _awcList(data);
    } else {
      root.innerHTML = _awcRender(sum) + `<div id="awcList">${_awcList(data)}</div>`;
      const inp = document.getElementById('awcSearch');
      if (inp) inp.value = _awcQ;
    }
  } catch (e) {
    root.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
}

function _awcRender(s) {
  const view = AWC_VIEWS.find(v => v.id === _awcView) || AWC_VIEWS[0];
  const st = s.settings || {};
  const lr = s.last_run;
  const conv = s.refunded_customers ? Math.round(100 * s.reordered_customers / s.refunded_customers) : 0;
  let html = `<div class="sec-hd">
      <div><div class="sec-title">WALLET CREDIT</div>
      <div class="sec-sub">Paid orders that fail are refunded to the customer's EndaViral Wallet every midnight, and the customer is messaged to reorder — no manual reorders needed. Credit can be spent on any order but never withdrawn.</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">
        ${_awcIsAdmin() ? `<button class="btn-secondary" style="width:auto;white-space:nowrap;" onclick="awcAdjust()">± Adjust credit</button>` : ''}
        <button class="btn-secondary" style="width:auto;white-space:nowrap;" onclick="window._awcSum=null;loadAdminWalletCredit()">↻ Refresh</button>
      </div>
    </div>`;

  if (!st.refunds_enabled) {
    html += `<div style="${_awcCard}border-color:#ffb347;color:#ffb347;font-weight:700;margin-bottom:12px;">⚠ Automatic wallet refunds are OFF (WALLET_REFUNDS_ENABLED=false) — failed paid orders go to Support → Reorders for staff instead.</div>`;
  }
  if (s.refunds_not_messaged) {
    html += `<div style="${_awcCard}border-color:#ff5252;color:#ff8a80;margin-bottom:12px;font-size:12.5px;">✉ <b>${s.refunds_not_messaged}</b> refunded customer(s) could not be messaged automatically — filter the list by “Not messaged” and message them from Support.</div>`;
  }

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px;">
      ${_awcStat('Credit outstanding', fmtKES(s.outstanding_kes), `${s.customers_with_credit} customer(s) holding credit`, s.outstanding_kes ? '#3dd44a' : null, 'Total unspent credit across all customer wallets')}
      ${_awcStat('Refunded (all time)', fmtKES(s.refunded_kes), `${s.refunds} order(s)`, null)}
      ${_awcStat('Refunded (7 days)', fmtKES(s.refunded_7d_kes), `${s.refunds_7d} order(s) · ${s.refunds_24h} in 24h`, null)}
      ${_awcStat('Spent on reorders', fmtKES(s.spent_kes), `${s.orders_paid_with_wallet} order(s) · ${s.orders_wallet_only} wallet-only`, '#ff8a65')}
      ${_awcStat('Customers who reordered', `${s.reordered_customers} / ${s.refunded_customers}`, `${conv}% of refunded customers`, conv >= 50 ? '#3dd44a' : null, 'Refunded customers who have since paid for an order with their wallet')}
      ${_awcStat('Old queue still open', s.legacy_queue_open, 'Support → Reorders (unpaid / unrefundable)', s.legacy_queue_open ? '#ffb347' : null)}
    </div>`;

  if (lr) {
    html += `<div style="${_awcCard}margin-bottom:14px;font-size:12px;color:var(--muted);line-height:1.6;">
      🌙 <b style="color:var(--white);">Last midnight run</b> ${lr.ran_at_eat ? esc(new Date(lr.ran_at_eat).toLocaleString()) : ''}:
      refunded <b style="color:#3dd44a;">${Number(lr.refunded || 0)}</b> order(s) (${fmtKES(lr.refunded_kes || 0)})
      · queued for staff <b style="color:var(--white);">${Number(lr.new || 0)}</b>
      ${lr.refund_errors ? `· <b style="color:#ff5252;">${lr.refund_errors} error(s)</b> (those went to the queue)` : ''}
      ${lr.stuck_stopped && lr.stuck_stopped.stopped ? `· stopped <b style="color:#4fc3f7;">${Number(lr.stuck_stopped.stopped)}</b> order(s) stuck ${Number(lr.stuck_stopped.hours || 24)}h+ (${fmtKES(lr.stuck_stopped.stopped_kes || 0)})` : ''}
      · stuck-pending after ${Number(st.stuck_pending_hours || 6)}h · pending/processing stopped after ${Number(st.stuck_stop_hours || 24)}h · min M-Pesa part KES ${Number(st.min_mpesa_kes || 10)}
    </div>`;
  }

  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">${AWC_VIEWS.map(v =>
      `<button class="sb-chip ${v.id === _awcView ? 'on' : ''}" onclick="awcSetView('${v.id}')" style="background:var(--card);border:1px solid ${v.id === _awcView ? 'var(--green)' : 'var(--border)'};border-radius:20px;padding:6px 13px;color:${v.id === _awcView ? 'var(--green)' : 'var(--muted)'};font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">${v.label}</button>`
    ).join('')}
      <input id="awcSearch" placeholder="Search customer, email, phone, order #…" oninput="awcSearch(this.value)" style="margin-left:auto;min-width:220px;flex:1;max-width:340px;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:8px 12px;color:var(--white);font-size:12.5px;font-family:inherit;"/>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5;">${esc(view.hint)}</div>`;
  return html;
}

function _awcList(data) {
  const items = data.items || [];
  if (_awcView === 'payments') return _awcPayments(items, data.total);
  if (_awcView === 'customers') return _awcCustomers(items);
  return _awcRefunds(items, data.total);
}

function _awcUserCell(u) {
  return `<div style="font-weight:600;font-size:12px;">${esc(u.name || u.email || '—')}</div>
    ${u.email && u.name !== u.email ? `<div style="font-size:11px;color:var(--muted);">${esc(u.email)}</div>` : ''}
    ${u.phone ? `<div style="font-size:11px;color:var(--muted);white-space:nowrap;">📞 ${esc(u.phone)}</div>` : ''}`;
}
function _awcOrderLink(id) {
  return `<a href="#" onclick="event.preventDefault();openOrderDetailModal('${esc(id)}')" style="color:var(--white);font-weight:700;">#${esc(String(id).slice(0, 8))}</a>`;
}

function _awcRefunds(items, total) {
  const chip = (k, v, label) => `<button class="sb-chip ${_awcFilter[k] === v ? 'on' : ''}" onclick="awcSetFilter('${k}','${v}')" style="background:var(--card);border:1px solid ${_awcFilter[k] === v ? 'var(--green)' : 'var(--border)'};border-radius:20px;padding:4px 11px;color:${_awcFilter[k] === v ? 'var(--green)' : 'var(--muted)'};font-size:11px;font-weight:700;cursor:pointer;">${label}</button>`;
  let html = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${Object.entries(AWC_REASON).map(([k, [l]]) => chip('reason', k, l[0] + l.slice(1).toLowerCase())).join('')}
      ${chip('used', 'yes', '✅ Reordered')}${chip('used', 'no', '⏳ Not reordered yet')}
      <span style="margin-left:auto;font-size:11px;color:var(--muted);">${items.length} shown${total > items.length ? ` of ${total}` : ''}</span>
    </div>`;
  if (!items.length) return html + `<div class="empty-state"><div class="icon">💳</div><p>No refunds here yet. They appear after the midnight run.</p></div>`;
  html += `<div class="tbl-wrap" style="overflow-x:auto;"><table>
    <thead><tr><th>Order</th><th>Customer</th><th>Why</th><th>Refunded</th><th>Reordered?</th><th>Actions</th></tr></thead>
    <tbody>${items.map(r => {
      const [rl, rc] = AWC_REASON[r.reason] || [String(r.reason || '').toUpperCase(), '#9aa4b2'];
      const uid = esc(r.user.id || ''), email = esc(r.user.email || '');
      const recovered = r.recovered_after_refund ? `<div style="margin-top:4px;">${_awcTag('⚠ ORDER NOW ' + esc(String(r.order_status_now).toUpperCase()), '#ffb347')}</div>` : '';
      return `<tr>
        <td style="font-size:12px;">${_awcOrderLink(r.order_id)}
          <div style="font-size:11px;color:var(--muted);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.service_name || '')}">${esc(r.service_name || '—')}</div>
          <div style="font-size:11px;color:var(--muted);">${r.quantity ? Number(r.quantity).toLocaleString() + ' undelivered' : ''}</div></td>
        <td>${_awcUserCell(r.user)}<div style="font-size:11px;margin-top:2px;">wallet now <a href="#" onclick="event.preventDefault();awcOpenUser('${uid}')" style="color:var(--green);font-weight:700;">${fmtKES(r.balance_now)}</a></div></td>
        <td>${_awcTag(rl, rc)}${recovered}
          <div style="font-size:10.5px;color:var(--muted);margin-top:4px;">${r.source === 'staff' ? '👤 by ' + esc(String(r.by || 'staff').split('@')[0]) : r.source === 'instant' ? '⚡ instantly' : '🌙 midnight'}</div></td>
        <td style="white-space:nowrap;"><b style="color:#3dd44a;font-size:14px;">${fmtKES(r.amount)}</b><div style="font-size:10.5px;color:var(--muted);">${esc(_awcDate(r.created_at))}</div>
          <div style="margin-top:4px;">${r.notified ? _awcTag('✉ MESSAGED', '#3dd44a') : _awcTag('✕ NOT MESSAGED', '#ff5252')}</div></td>
        <td>${(r.reorder_order_id || r.reordered) ? `${_awcTag('✅ REORDERED', '#3dd44a')}<div style="font-size:11px;margin-top:4px;">${_awcOrderLink(r.reorder_order_id || r.reordered.order_id)}</div>` : _awcTag('⏳ NOT YET', '#ffb347')}</td>
        <td style="white-space:nowrap;">
          ${r.thread_id ? `<button class="action-btn" onclick="awcOpenChat('${esc(r.thread_id)}')" title="Open the customer's chat (the refund message is there)">💬 Chat</button>` : (uid ? `<button class="action-btn" onclick="adminMessageCustomer('${uid}','${email}')">💬 Message</button>` : '')}
          <button class="action-btn" onclick="awcOpenUser('${uid}')" title="Wallet history">📒</button>
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  return html;
}

function _awcPayments(items, total) {
  if (!items.length) return `<div class="empty-state"><div class="icon">🛒</div><p>No orders paid with wallet credit yet.</p></div>`;
  return `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;text-align:right;">${items.length} shown${total > items.length ? ` of ${total}` : ''}</div>
    <div class="tbl-wrap" style="overflow-x:auto;"><table>
    <thead><tr><th>Order</th><th>Customer</th><th>Paid with</th><th>Wallet</th><th>M-Pesa</th><th>Order status</th><th>Date</th></tr></thead>
    <tbody>${items.map(p => {
      const o = p.order || {};
      const released = p.status === 'released';
      return `<tr>
        <td style="font-size:12px;">${_awcOrderLink(p.order_id)}
          <div style="font-size:11px;color:var(--muted);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(o.service_name || '')}">${esc(o.service_name || '—')}</div>
          <div style="font-size:11px;color:var(--muted);">${o.quantity ? Number(o.quantity).toLocaleString() : ''} · ${fmtKES(o.charge)}</div></td>
        <td>${_awcUserCell(p.user)}</td>
        <td>${p.method === 'wallet' ? _awcTag('💳 WALLET', '#3dd44a') : _awcTag('💳 + 📱 WALLET + M-PESA', '#2196f3')}
          ${released ? `<div style="margin-top:4px;">${_awcTag('↩ RELEASED', '#9aa4b2')}</div>` : ''}</td>
        <td style="white-space:nowrap;font-weight:700;color:${released ? 'var(--muted)' : '#ff8a65'};${released ? 'text-decoration:line-through;' : ''}">${fmtKES(p.wallet_kes)}</td>
        <td style="white-space:nowrap;">${p.mpesa_kes ? fmtKES(p.mpesa_kes) : '—'}</td>
        <td>${typeof statusPill === 'function' ? statusPill(o.status) : esc(o.status || '')}</td>
        <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${esc(_awcDate(p.created_at))}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function _awcCustomers(items) {
  if (!items.length) return `<div class="empty-state"><div class="icon">👥</div><p>No customer is holding wallet credit.</p></div>`;
  return `<div class="tbl-wrap" style="overflow-x:auto;"><table>
    <thead><tr><th>Customer</th><th>Phone</th><th>Balance</th><th>Last change</th><th>Actions</th></tr></thead>
    <tbody>${items.map(c => {
      const uid = esc(c.user.id || ''), email = esc(c.user.email || '');
      return `<tr>
        <td>${_awcUserCell({ ...c.user, phone: null })}</td>
        <td style="font-size:12px;color:var(--muted);">${esc(c.user.phone || '—')}</td>
        <td style="white-space:nowrap;"><b style="color:#3dd44a;font-size:15px;">${fmtKES(c.balance)}</b></td>
        <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${esc(_awcDate(c.updated_at))}</td>
        <td style="white-space:nowrap;">
          <button class="action-btn" onclick="awcOpenUser('${uid}')">📒 History</button>
          ${uid ? `<button class="action-btn" onclick="adminMessageCustomer('${uid}','${email}')">💬 Message</button>` : ''}
          ${_awcIsAdmin() ? `<button class="action-btn" onclick="awcAdjust('${uid}','${esc(c.user.name || c.user.email || '')}')">±</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

/* ── Modal (self-contained) ─────────────────────────────── */
function _awcModal(title, body, actions) {
  let m = document.getElementById('awcModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'awcModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;';
    m.addEventListener('click', e => { if (e.target === m) awcCloseModal(); });
    document.body.appendChild(m);
  }
  m.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border);">
        <div style="font-weight:800;font-size:15px;flex:1;">${title}</div>
        <button onclick="awcCloseModal()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;" aria-label="Close">✕</button>
      </div>
      <div style="padding:14px 18px;overflow:auto;">${body}</div>
      ${actions ? `<div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">${actions}</div>` : ''}
    </div>`;
  m.style.display = 'flex';
}
function awcCloseModal() { const m = document.getElementById('awcModal'); if (m) m.style.display = 'none'; }

async function awcOpenUser(userId) {
  if (!userId) return;
  _awcModal('Wallet history', '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>');
  try {
    const d = await api('/admin/wallet-credit/user/' + encodeURIComponent(userId));
    const rows = (d.entries || []).map(e => {
      const [kl, kc] = AWC_KIND[e.kind] || [e.kind, '#9aa4b2'];
      const pos = Number(e.amount) > 0;
      return `<tr>
        <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${esc(_awcDate(e.created_at))}</td>
        <td>${_awcTag(kl, kc)}</td>
        <td style="font-size:12px;">${esc(e.note || '')}${e.order_id ? ` · ${_awcOrderLink(e.order_id)}` : ''}${e.by ? `<div style="font-size:10.5px;color:var(--muted);">by ${esc(String(e.by).split('@')[0])}</div>` : ''}</td>
        <td style="white-space:nowrap;font-weight:800;color:${pos ? '#3dd44a' : '#ff8a65'};">${pos ? '+' : '−'}${fmtKES(Math.abs(e.amount))}</td>
        <td style="white-space:nowrap;font-size:12px;">${fmtKES(e.balance_after)}</td>
      </tr>`;
    }).join('');
    const name = d.user.name || d.user.email || 'Customer';
    _awcModal(`💳 ${esc(name)} — ${fmtKES(d.balance)}`,
      `<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${esc(d.user.email || '')}${d.user.phone ? ' · 📞 ' + esc(d.user.phone) : ''}</div>
       ${rows ? `<div class="tbl-wrap" style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table></div>`
              : '<div class="empty-state"><p>No wallet activity.</p></div>'}`,
      `${_awcIsAdmin() ? `<button class="btn-secondary" style="width:auto;" onclick="awcAdjust('${esc(userId)}','${esc(name)}')">± Adjust credit</button>` : ''}
       <button class="btn-primary" style="width:auto;margin:0;" onclick="awcCloseModal()">Close</button>`);
  } catch (e) {
    _awcModal('Wallet history', `<div style="color:#ff5252;">${esc(e.message || e)}</div>`);
  }
}

function awcAdjust(userId, name) {
  if (!_awcIsAdmin()) return;
  const field = 'width:100%;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--white);font-size:13px;font-family:inherit;margin:6px 0 12px;box-sizing:border-box;';
  _awcModal('± Adjust wallet credit',
    `${userId ? `<div style="font-size:13px;margin-bottom:10px;">Customer: <b>${esc(name || userId)}</b></div><input type="hidden" id="awcAdjUser" value="${esc(userId)}"/>`
              : `<label style="font-size:11px;font-weight:700;color:var(--muted);">CUSTOMER USER ID</label><input id="awcAdjUser" placeholder="user id (from Users / an order)" style="${field}"/>`}
     <label style="font-size:11px;font-weight:700;color:var(--muted);">AMOUNT (KES) — negative removes credit</label>
     <input id="awcAdjAmt" type="number" step="0.01" placeholder="e.g. 150 or -50" style="${field}"/>
     <label style="font-size:11px;font-weight:700;color:var(--muted);">REASON (shown in the customer's wallet history)</label>
     <input id="awcAdjReason" maxlength="300" placeholder="e.g. Goodwill credit for delayed order #ab12cd34" style="${field}"/>
     <div style="font-size:11px;color:var(--muted);line-height:1.5;">Credit can only be spent on orders — it is never paid out to M-Pesa. Every adjustment is logged with your name.</div>
     <div id="awcAdjMsg" style="margin-top:8px;font-size:12px;"></div>`,
    `<button class="btn-secondary" style="width:auto;" onclick="awcCloseModal()">Cancel</button>
     <button class="btn-primary" style="width:auto;margin:0;" id="awcAdjGo" onclick="awcAdjustGo()">Save</button>`);
}

async function awcAdjustGo() {
  const user_id = (document.getElementById('awcAdjUser')?.value || '').trim();
  const amount = parseFloat(document.getElementById('awcAdjAmt')?.value);
  const reason = (document.getElementById('awcAdjReason')?.value || '').trim();
  const msg = document.getElementById('awcAdjMsg');
  if (!user_id || !amount || reason.length < 3) { msg.innerHTML = '<span style="color:#ff5252;">Customer, a non-zero amount and a reason are required.</span>'; return; }
  const btn = document.getElementById('awcAdjGo'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const r = await api('/admin/wallet-credit/adjust', { method: 'POST', body: JSON.stringify({ user_id, amount, reason }) });
    toast(`Saved — balance is now ${fmtKES(r.balance)}`, 'success');
    awcCloseModal();
    window._awcSum = null;
    if (document.getElementById('walletCreditRoot')?.offsetParent) loadAdminWalletCredit();
  } catch (e) {
    msg.innerHTML = `<span style="color:#ff5252;">${esc(e.message || e)}</span>`;
    btn.disabled = false; btn.textContent = 'Save';
  }
}

function awcOpenChat(threadId) {
  awcCloseModal();
  const supportTabBtn = document.querySelector('.admin-tab[onclick*="\'support\'"]');
  if (supportTabBtn) supportTabBtn.click();
  setTimeout(() => {
    if (typeof sbFocusThread === 'function') sbFocusThread(threadId);
    else if (typeof openSupportThread === 'function') openSupportThread(threadId);
  }, 250);
}

/* ── Wallet box inside any order's popup (admin.js → openOrderDetailModal) ── */
async function awcLoadOrderBox(orderId) {
  const box = document.getElementById('odmWallet');
  if (!box || box.dataset.order !== orderId) return;
  try {
    const d = await api('/admin/wallet-credit/order/' + encodeURIComponent(orderId));
    if (box.dataset.order !== orderId) return;
    const lines = [];
    if (d.wallet_payment) {
      const p = d.wallet_payment;
      lines.push(`💳 Paid ${fmtKES(p.wallet_kes)} from wallet${p.mpesa_kes ? ` + ${fmtKES(p.mpesa_kes)} M-Pesa` : ''}${p.status === 'released' ? ' — <b>released</b> (M-Pesa part failed, credit returned)' : ''}`);
    }
    if (d.refund) {
      lines.push(`↩️ <b style="color:#3dd44a;">${fmtKES(d.refund.amount)} refunded to the customer's wallet</b> ${esc(_awcDate(d.refund.at))} (${esc(d.refund.reason)}${d.refund.source === 'staff' ? ', by staff' : ''})${d.refund.notified ? '' : ' — <span style="color:#ff5252;">customer NOT messaged</span>'}`);
    }
    let btn = '';
    if (d.can_refund) {
      btn = `<button class="action-btn" onclick="awcRefundOrder('${esc(orderId)}', ${Number(d.refundable_kes)})" style="margin-top:8px;border-color:rgba(61,212,74,.55);color:#3dd44a;font-weight:700;">💳 Refund ${fmtKES(d.refundable_kes)} to wallet</button>
        <div style="font-size:10.5px;color:var(--muted);margin-top:4px;">The customer is messaged and reorders themselves. (The midnight job does this automatically.)</div>`;
    }
    if (!lines.length && !btn) { box.innerHTML = ''; return; }
    box.innerHTML = `<div style="margin:8px 0;padding:10px 12px;border:1px solid rgba(61,212,74,.35);border-radius:10px;background:rgba(61,212,74,.06);font-size:12px;line-height:1.6;">
        <div style="font-size:10.5px;font-weight:800;letter-spacing:1px;color:var(--muted);margin-bottom:4px;">ENDAVIRAL WALLET · customer balance ${fmtKES(d.customer_balance)}</div>
        ${lines.map(l => `<div>${l}</div>`).join('')}${btn}</div>`;
  } catch (_) { box.innerHTML = ''; }
}

async function awcRefundOrder(orderId, amount) {
  if (!confirm(`Refund ${fmtKES(amount)} to this customer's EndaViral Wallet?\n\nThey get a message saying the order didn't go through and that they can reorder with their wallet. This order can then no longer be re-placed for free.`)) return;
  try {
    const r = await api('/admin/wallet-credit/refund-order/' + encodeURIComponent(orderId), { method: 'POST' });
    toast(`Refunded ${fmtKES(r.amount)} to wallet${r.customer_notified ? ' — customer messaged' : ' — message FAILED, contact them from Support'}`, r.customer_notified ? 'success' : 'error');
    awcLoadOrderBox(orderId);
    window._awcSum = null;
    if (typeof rqLoad === 'function' && document.getElementById('rqList')) rqLoad();
  } catch (e) { toast(e.message || 'Refund failed', 'error'); }
}
