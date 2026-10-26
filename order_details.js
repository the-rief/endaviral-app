// order_details.js
// ════════════════════════════════════════════════════════════════════════
// Customer order details — tap any order (Dashboard "Recent Orders" or the
// My Orders page) to open a details sheet.
//
//   • Phones: slides up from the bottom (bottom sheet), Android/iOS Back
//     button closes it instead of leaving the app.
//   • Desktop: centred dialog.
//
// It renders instantly from the order data already on screen, then calls
// GET /orders/{id} — which re-checks the provider for live status, start
// count and remains — and refreshes the sheet in place.
//
// Also provides orderCardsHTML(): the mobile card list that replaces the
// wide orders tables on small screens (the tables hid Cost / Status /
// M-Pesa ref / Actions behind a sideways scroll most customers never found).
//
// Depends on page-shell globals: api(), toast(), fmtKES(), statusPill(),
// allOrders, navTo(), requestOrderRefill(). Load AFTER index.html's main
// script and chat.js.
// ════════════════════════════════════════════════════════════════════════

(function () {
  const _odById = new Map();   // id -> latest order object we've seen
  let _odOpenId = null;
  let _odPushedHistory = false;

  function _e(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }
  // IDs are UUIDs; strip anything else before they go into onclick="".
  function _safeId(id) { return String(id || '').replace(/[^A-Za-z0-9_-]/g, ''); }
  function _num(n) { return (n == null || n === '' || isNaN(n)) ? null : parseInt(n, 10); }
  function _fmtInt(n) { const v = _num(n); return v == null ? '—' : v.toLocaleString(); }
  function _fmtDate(iso, withTime) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return withTime
      ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function _remember(list) {
    (list || []).forEach(o => { const id = o && (o.id || o._id); if (id) _odById.set(String(id), o); });
  }

  // ─── 🔁 Re-placed indicator (client) ─────────────────────────────────────
  // replaced_by: free replacement(s) we placed for this failed order;
  // replacement_for: on a replacement, the order it replaces (backend orders.py).
  window.orderReplacedTag = function (o, big) {
    const by = (o && o.replaced_by) || [];
    const fs = big ? '12.5px' : '10.5px';
    if (by.length) {
      const r = by[by.length - 1];
      const id = _safeId(r.order_id);
      return `<div class="od-replaced" style="margin-top:4px;font-size:${fs};font-weight:700;color:#ff8a65;">🔁 Re-placed for free → <a href="javascript:void(0)" onclick="event.stopPropagation();openOrderDetail('${id}')" style="color:#ffab91;">#${_e(id.slice(0, 8))}</a></div>`;
    }
    if (o && o.replacement_for) {
      const id = _safeId(o.replacement_for);
      return `<div class="od-replaced" style="margin-top:4px;font-size:${fs};color:var(--muted);">🔁 Free replacement for <a href="javascript:void(0)" onclick="event.stopPropagation();openOrderDetail('${id}')" style="color:var(--muted);text-decoration:underline;">#${_e(id.slice(0, 8))}</a></div>`;
    }
    return '';
  };

  // ─── Mobile card list (shared by Dashboard + My Orders) ──────────────────
  window.orderCardsHTML = function (list) {
    _remember(list);
    return `<div class="od-cards">${(list || []).map(o => {
      const id = _safeId(o.id || o._id);
      const name = o.service_name || o.serviceName || o.service || '—';
      const qty = _num(o.quantity || o.qty);
      return `<button type="button" class="od-card" onclick="openOrderDetail('${id}')" aria-label="View order details">
        <div class="od-card-main">
          <div class="od-card-name">${_e(name)}</div>
          <div class="od-card-meta">#${_e(id.slice(0, 8))} · ${_fmtDate(o.created_at)}${qty != null ? ` · ${qty.toLocaleString()} qty` : ''}</div>
          <div class="od-card-foot">
            <span class="od-card-cost">${fmtKES(o.charge || o.cost || o.amount)}</span>
            ${statusPill(o.status)}
          </div>
          ${orderReplacedTag(o)}
        </div>
        <span class="od-card-chev" aria-hidden="true">›</span>
      </button>`;
    }).join('')}</div>`;
  };
  window.orderRememberList = _remember;

  // ─── Sheet ───────────────────────────────────────────────────────────────
  function _ensureSheet() {
    let ov = document.getElementById('odOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'odOverlay';
    ov.className = 'od-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-labelledby', 'odTitle');
    ov.innerHTML = `<div class="od-sheet" id="odSheet"><div class="od-grip" aria-hidden="true"></div><div id="odBody"></div></div>`;
    ov.addEventListener('click', e => { if (e.target === ov) closeOrderDetail(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && _odOpenId) closeOrderDetail(); });
    window.addEventListener('popstate', () => {
      if (_odOpenId) { _odPushedHistory = false; closeOrderDetail(); }
    });
    return ov;
  }

  const STATUS_TEXT = {
    pending:    'Payment received — your order is queued and will start shortly.',
    processing: 'Delivery is in progress.',
    inprogress: 'Delivery is in progress.',
    completed:  'Delivered in full. Thank you for ordering!',
    partial:    'Only part of this order could be delivered. The undelivered portion is handled by our team — tap "Get help" if you have questions.',
    failed:     'This order could not be completed. If you were charged, tap "Get help" and our team will sort it out.',
    cancelled:  'This order was cancelled.',
  };

  function _progress(o) {
    const st = (o.status || '').toLowerCase();
    const qty = _num(o.quantity || o.qty);
    const rem = _num(o.remains);
    if (!qty) return '';
    let delivered = null;
    if (st === 'completed') delivered = qty;
    else if (rem != null) delivered = Math.max(0, Math.min(qty, qty - rem));
    if (delivered == null) {
      if (st === 'failed' || st === 'cancelled') return '';
      return `<div class="od-progress"><div class="od-progress-top"><span>Delivery</span><span class="od-muted">Waiting to start</span></div>
        <div class="od-bar"><div class="od-bar-fill od-bar-idle" style="width:0%"></div></div></div>`;
    }
    const pct = Math.round((delivered / qty) * 100);
    return `<div class="od-progress"><div class="od-progress-top"><span>Delivered</span><span><strong>${delivered.toLocaleString()}</strong> / ${qty.toLocaleString()} · ${pct}%</span></div>
      <div class="od-bar"><div class="od-bar-fill" style="width:${pct}%"></div></div></div>`;
  }

  function _copyBtn(value, label) {
    const v = String(value).replace(/[^A-Za-z0-9_-]/g, '');
    return `<button type="button" class="od-copy" onclick="_odCopy('${v}','${label}')" aria-label="Copy ${label}">Copy</button>`;
  }
  window._odCopy = function (v, label) {
    const done = () => toast(`${label} copied!`, 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(done, () => toast('Could not copy', 'error'));
    } else {
      const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (_) { toast('Could not copy', 'error'); }
      t.remove();
    }
  };

  function _render(o, refreshing) {
    const body = document.getElementById('odBody');
    if (!body) return;
    const id = _safeId(o.id || o._id);
    const st = (o.status || 'pending').toLowerCase();
    const name = o.service_name || o.serviceName || o.service || 'Order';
    const link = o.link || '';
    // The API truncates long links with "***" — only make it tappable when
    // we have the whole thing.
    const linkHTML = !link ? '—'
      : (/^https?:\/\//i.test(link) && !/\*\*\*$/.test(link))
        ? `<a href="${_e(link)}" target="_blank" rel="noopener noreferrer">${_e(link)}</a>`
        : _e(link);
    const mpesa = String(o.mpesa_receipt || '').replace(/[^A-Za-z0-9]/g, '');
    const charge = parseFloat(o.charge || o.cost || o.amount || 0);
    const canRefill = o.provider_order_id && ['completed', 'partial'].includes(st) && o.service_refill;

    const rows = [
      // Short ID on screen (same as the list); Copy gives the full ID.
      ['Order ID', `<span class="od-mono" title="${_e(id)}">#${_e(id.slice(0, 8))}</span>${_copyBtn(id, 'Order ID')}`],
      ['Quantity', _fmtInt(o.quantity || o.qty)],
      ['Start count', _fmtInt(o.start_count)],
      ['Remaining', _fmtInt(o.remains)],
      ['Amount paid', charge === 0 ? `${fmtKES(0)} <span class="od-muted">· free order</span>` : fmtKES(charge)],
      ['M-Pesa ref', mpesa ? `<span class="od-mono od-green">${mpesa}</span>${_copyBtn(mpesa, 'M-Pesa ref')}` : '<span class="od-muted">—</span>'],
      ['Link', `<span class="od-link">${linkHTML}</span>`],
      ['Placed', _fmtDate(o.created_at, true)],
    ];
    if (o.updated_at) rows.push(['Last update', _fmtDate(o.updated_at, true)]);

    // Auto-refill every 2 days (backend: services/auto_refill.py) — shown while
    // the order is still inside its refill guarantee.
    const arUntil = o.auto_refill_until ? new Date(o.auto_refill_until) : null;
    const arActive = arUntil && !isNaN(arUntil) && arUntil > new Date() && ['completed', 'partial'].includes(st);
    const autoRefillHTML = arActive
      ? `<div class="od-autorefill">♻️ <span><b>Auto-refill is on.</b> Every 2 days we check this order and top up any drop for free, until ${_fmtDate(o.auto_refill_until, false)} ${new Date(o.auto_refill_until).getFullYear()}.</span></div>`
      : '';

    body.innerHTML = `
      <div class="od-head">
        <div class="od-head-text">
          <div class="od-eyebrow">ORDER DETAILS${refreshing ? ' <span class="od-live">· checking live status…</span>' : ''}</div>
          <div class="od-title" id="odTitle">${_e(name)}</div>
        </div>
        <button type="button" class="od-close" onclick="closeOrderDetail()" aria-label="Close">✕</button>
      </div>
      <div class="od-status-row">${statusPill(o.status)}<span class="od-amount">${fmtKES(charge)}</span></div>
      <p class="od-status-text">${STATUS_TEXT[st] || ''}</p>
      ${(o.replaced_by || []).length ? `<p class="od-status-text" style="color:#ffab91;">We've already re-placed this order for you at no extra cost — follow the new order below.</p>` : ''}
      ${orderReplacedTag(o, true)}
      ${_progress(o)}
      ${autoRefillHTML}
      <dl class="od-rows">${rows.map(([k, v]) => `<div class="od-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="od-actions">
        ${canRefill ? `<button type="button" class="btn-secondary od-btn" onclick="_odRefill('${id}')">♻️ Request refill</button>` : ''}
        <button type="button" class="btn-secondary od-btn" onclick="_odHelp('${id}')">💬 Get help with this order</button>
      </div>`;
  }

  window.openOrderDetail = function (id) {
    id = _safeId(id);
    if (!id) return;
    const ov = _ensureSheet();
    const fromList = (typeof allOrders !== 'undefined' && Array.isArray(allOrders))
      ? allOrders.find(o => String(o.id || o._id) === id) : null;
    const known = _odById.get(id) || fromList || { id };
    _odOpenId = id;
    _render(known, true);
    document.body.classList.add('od-lock');
    ov.classList.add('show');
    document.getElementById('odSheet').scrollTop = 0;
    if (!_odPushedHistory) {
      try { history.pushState({ evOrderSheet: id }, ''); _odPushedHistory = true; } catch (_) {}
    }

    api(`/orders/${encodeURIComponent(id)}`)
      .then(fresh => {
        if (!fresh || typeof fresh !== 'object' || !(fresh.id || fresh._id)) throw new Error('bad');
        // Update the on-screen list objects in place so the row reflects
        // the live status too once the sheet closes.
        [known, fromList].forEach(t => { if (t && t !== fresh) Object.assign(t, fresh); });
        _odById.set(id, known);
        if (_odOpenId === id) _render(known, false);
        _rerenderVisibleList();
      })
      .catch(() => { if (_odOpenId === id) _render(known, false); });
  };

  window.closeOrderDetail = function () {
    const ov = document.getElementById('odOverlay');
    if (ov) ov.classList.remove('show');
    document.body.classList.remove('od-lock');
    _odOpenId = null;
    if (_odPushedHistory) {
      _odPushedHistory = false;
      try { if (history.state && history.state.evOrderSheet) history.back(); } catch (_) {}
    }
  };

  function _rerenderVisibleList() {
    const ordersSec = document.getElementById('sec-orders');
    if (ordersSec && ordersSec.classList.contains('active') && typeof renderOrders === 'function') renderOrders();
  }

  window._odRefill = async function (id) {
    if (typeof requestOrderRefill !== 'function') return;
    closeOrderDetail();
    await requestOrderRefill(id);
  };

  window._odHelp = function (id) {
    closeOrderDetail();
    const prefill = () => {
      if (typeof window.evOpenNewTicketForm === 'function') window.evOpenNewTicketForm();
      const desc = document.getElementById('ev-nt-desc');
      if (desc) { desc.value = `Order #${id}\n\n`; desc.focus(); }
    };
    const win = document.getElementById('ev-chat-window');
    if (typeof window.evChatToggle === 'function' && win && !win.classList.contains('open')) {
      window.evChatToggle();
      setTimeout(prefill, 150);
    } else if (typeof window.evChatToggle === 'function') {
      prefill();
    } else if (typeof navTo === 'function') {
      navTo('tickets');
    }
  };

  // ─── Styles ──────────────────────────────────────────────────────────────
  const css = `
  /* Tables become tappable rows */
  tr.od-tr{cursor:pointer;transition:background .15s;}
  tr.od-tr:hover td{background:rgba(61,212,74,.04);}
  tr.od-tr:focus-visible{outline:2px solid var(--green);outline-offset:-2px;}

  /* Mobile card list (hidden on desktop) */
  .od-cards{display:none;}
  @media(max-width:768px){
    .tbl-wrap.od-has-cards > table{display:none;}
    .tbl-wrap.od-has-cards{overflow:hidden;}
    .od-cards{display:flex;flex-direction:column;}
  }
  .od-card{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:14px 14px 14px 16px;
    border-bottom:1px solid var(--border);cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit;color:var(--white);}
  .od-card:last-child{border-bottom:none;}
  .od-card:active{background:rgba(255,255,255,.04);}
  .od-card:focus-visible{outline:2px solid var(--green);outline-offset:-2px;}
  .od-card-main{flex:1;min-width:0;}
  .od-card-name{font-size:14px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}
  .od-card-meta{font-size:12px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .od-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;}
  .od-card-cost{color:var(--green);font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px;}
  .od-card-chev{font-size:24px;color:var(--muted);line-height:1;flex-shrink:0;}

  /* Sheet */
  body.od-lock{overflow:hidden;}
  body.od-lock #ev-chat-fab, body.od-lock .ev-chat-fab{display:none !important;}
  .od-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);
    display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s;}
  .od-overlay.show{opacity:1;pointer-events:auto;}
  .od-sheet{position:relative;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;overscroll-behavior:contain;
    background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px 22px 20px;
    transform:translateY(16px);transition:transform .25s ease;color:var(--white);}
  .od-overlay.show .od-sheet{transform:none;}
  .od-grip{display:none;}
  .od-head{display:flex;align-items:flex-start;gap:12px;}
  .od-head-text{flex:1;min-width:0;}
  .od-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--muted);margin-bottom:4px;}
  .od-live{color:var(--green);letter-spacing:.3px;font-weight:600;text-transform:none;}
  .od-title{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:800;line-height:1.3;word-break:break-word;}
  .od-close{flex-shrink:0;width:36px;height:36px;border-radius:50%;border:none;background:var(--navy);color:var(--muted);font-size:15px;cursor:pointer;}
  .od-close:hover{color:var(--white);}
  .od-status-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;}
  .od-amount{font-family:'Montserrat',sans-serif;font-weight:800;font-size:20px;color:var(--green);}
  .od-status-text{font-size:13px;color:var(--muted);line-height:1.5;margin:10px 0 0;}
  .od-progress{margin-top:14px;background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px 14px;}
  .od-progress-top{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin-bottom:8px;}
  .od-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;}
  .od-bar-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#28a035,#3dd44a);transition:width .4s;}
  .od-rows{margin:14px 0 0;padding:0;}
  .od-autorefill{display:flex;gap:8px;align-items:flex-start;margin-top:12px;padding:10px 12px;border-radius:12px;
    background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.25);font-size:12.5px;line-height:1.5;color:var(--white);}
  .od-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--border);font-size:13.5px;}
  .od-row:last-child{border-bottom:none;}
  .od-row dt{color:var(--muted);flex-shrink:0;}
  .od-row dd{margin:0;text-align:right;min-width:0;display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:6px;}
  .od-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;word-break:break-all;}
  .od-green{color:var(--green);}
  .od-muted{color:var(--muted);}
  .od-link{word-break:break-all;font-size:12.5px;}
  .od-link a{color:var(--green);}
  .od-copy{border:1px solid var(--border);background:var(--navy);color:var(--muted);font-size:11px;font-weight:600;border-radius:6px;padding:4px 8px;cursor:pointer;}
  .od-copy:hover{color:var(--green);border-color:var(--green);}
  .od-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px;}
  .od-btn{width:100%;padding:13px 16px;}

  @media(max-width:768px){
    .od-overlay{align-items:flex-end;padding:0;}
    .od-sheet{max-width:none;max-height:90vh;border-radius:20px 20px 0 0;border-bottom:none;
      padding:8px 18px calc(18px + env(safe-area-inset-bottom));transform:translateY(100%);}
    .od-grip{display:block;width:40px;height:4px;border-radius:4px;background:var(--border);margin:4px auto 12px;}
  }`;
  const style = document.createElement('style');
  style.id = 'od-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();
