/* ═══════════════ ENDAVIRAL WALLET (order credit) — customer side ═══════════════
 * When a paid order fails, is only partly delivered, is cancelled or gets stuck,
 * the nightly job puts what the customer paid (for the undelivered part) into
 * their EndaViral Wallet and messages them. They then reorder ANY service
 * themselves and choose at checkout:
 *     💳 Pay with Wallet      — wallet covers it all, no M-Pesa prompt
 *     💳+📱 Wallet + M-Pesa   — whole wallet balance, M-Pesa prompt for the rest
 *     📱 M-Pesa only
 * Wallet credit can't be withdrawn — it only pays for orders.
 *
 * Backend: GET /wallet/credit, POST /orders { pay_method } (services/credit_wallet.py).
 * Hooks called from index.html: walletOnOpenOrder(), walletOnCost(cost),
 * walletPayInfo(cost), walletPayBtnLabel(), walletRenderPage(), walletRefreshCard(),
 * walletAfterOrder(resp); auth.js calls walletOnPush(evt) for "wallet_credit".
 * Depends on globals: api/_apiRequest, token, toast, fmtKES, navTo, esc (admin.js).
 * ═══════════════════════════════════════════════════════════════════════════════ */

(function () {
  let _wc = null;          // last GET /wallet/credit
  let _wcAt = 0;
  let _wcLoading = null;
  let _cost = 0;           // current order total in the order modal
  let _choice = null;      // customer's explicit pick in this modal (null = auto)

  const _e = (v) => (typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c])));
  const _kes = (n) => (typeof fmtKES === 'function' ? fmtKES(n) : 'KES ' + Number(n || 0).toLocaleString());

  const CSS = `
  .wp-box{margin:-4px 0 14px;padding:12px;border-radius:12px;background:rgba(61,212,74,.06);border:1px solid rgba(61,212,74,.28);}
  .wp-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;color:var(--green);letter-spacing:.3px;margin-bottom:9px;}
  .wp-head b{margin-left:auto;color:var(--white);font-size:13px;}
  .wp-opt{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;padding:10px 11px;margin-top:6px;border-radius:10px;border:1px solid var(--border);background:var(--navy);color:var(--white);font-family:inherit;cursor:pointer;}
  .wp-opt:hover{border-color:rgba(61,212,74,.5);}
  .wp-opt.on{border-color:var(--green);background:rgba(61,212,74,.1);}
  .wp-opt[disabled]{opacity:.5;cursor:not-allowed;}
  .wp-dot{flex-shrink:0;width:16px;height:16px;border-radius:50%;border:2px solid var(--muted);margin-top:1px;}
  .wp-opt.on .wp-dot{border-color:var(--green);background:radial-gradient(circle,var(--green) 45%,transparent 50%);}
  .wp-t{font-size:13px;font-weight:700;line-height:1.3;} .wp-s{font-size:11.5px;color:var(--muted);line-height:1.4;margin-top:2px;}
  .wp-note{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.45;}
  .wl-card{background:linear-gradient(135deg,rgba(61,212,74,.14),rgba(61,212,74,.04));border:1px solid rgba(61,212,74,.35);border-radius:14px;padding:16px 18px;margin-bottom:22px;}
  .wl-top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
  .wl-bal{font-family:'Montserrat',sans-serif;font-size:30px;font-weight:800;color:var(--green);letter-spacing:-.5px;line-height:1.1;}
  .wl-lbl{font-size:11px;font-weight:800;letter-spacing:1.3px;color:var(--muted);text-transform:uppercase;}
  .wl-txt{font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:10px;}
  .wl-hist{margin-top:14px;border-top:1px solid var(--border);padding-top:10px;}
  .wl-row{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);}
  .wl-row:last-child{border-bottom:none;}
  .wl-ic{flex-shrink:0;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--navy);}
  .wl-n{flex:1;min-width:0;font-size:12.5px;color:var(--white);line-height:1.4;word-break:break-word;}
  .wl-d{font-size:11px;color:var(--muted);}
  .wl-a{font-family:'Montserrat',sans-serif;font-weight:800;font-size:14px;white-space:nowrap;}
  .wl-a.in{color:var(--green);} .wl-a.out{color:#ff8a65;}
  .wd-card{display:flex;align-items:center;gap:12px;background:rgba(61,212,74,.09);border:1px solid rgba(61,212,74,.4);border-radius:12px;padding:12px 14px;margin-bottom:14px;}
  .wd-card .wd-ic{font-size:22px;flex-shrink:0;}
  .wd-card .wd-t{font-size:13px;font-weight:800;color:var(--white);line-height:1.35;}
  .wd-card .wd-s{font-size:11.5px;color:var(--muted);line-height:1.4;margin-top:2px;}
  .wd-card button{flex-shrink:0;background:linear-gradient(135deg,#3dd44a,#28a035);color:#000;border:none;border-radius:9px;padding:9px 13px;font-family:'Montserrat',sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap;}
  .od-wallet{margin-top:4px;font-weight:700;color:var(--green);}
  @media(max-width:520px){ .wd-card{flex-wrap:wrap;} .wd-card button{width:100%;} .wl-bal{font-size:26px;} }
  `;
  function _css() {
    if (document.getElementById('walletCss')) return;
    const s = document.createElement('style'); s.id = 'walletCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  async function walletFetch(force) {
    if (typeof token === 'undefined' || !token) return null;
    if (!force && _wc && Date.now() - _wcAt < 30000) return _wc;
    if (_wcLoading) return _wcLoading;
    const req = typeof _apiRequest === 'function' ? _apiRequest : api;   // bypass api()'s GET cache
    _wcLoading = req('/wallet/credit?limit=30')
      .then(d => { _wc = d; _wcAt = Date.now(); return d; })
      .catch(() => _wc)
      .finally(() => { _wcLoading = null; });
    return _wcLoading;
  }
  window.walletFetch = walletFetch;
  const _bal = () => Number((_wc && _wc.balance) || 0);
  const _enabled = () => !!(_wc && _wc.checkout_enabled !== false && _bal() > 0);
  const _minStk = () => Number((_wc && _wc.min_mpesa_kes) || 10);

  /* Mirrors credit_wallet.split_payment() on the backend. */
  function _split(cost, method) {
    const bal = _bal();
    cost = Number(cost || 0);
    if (method === 'mpesa' || !_enabled() || cost <= 0) return { method: 'mpesa', wallet: 0, mpesa: cost, ok: true };
    if (bal >= cost) return { method: method, wallet: cost, mpesa: 0, ok: true };
    if (method === 'wallet') return { method, wallet: 0, mpesa: cost, ok: false, why: `${_kes(cost - bal)} short` };
    let mpesa = Math.max(Math.ceil(cost - bal - 1e-9), _minStk());
    if (mpesa >= cost) return { method, wallet: 0, mpesa: cost, ok: false, why: 'balance too small to combine' };
    return { method, wallet: Math.round((cost - mpesa) * 100) / 100, mpesa, ok: true };
  }
  function _auto(cost) {
    if (!_enabled()) return 'mpesa';
    if (_bal() >= cost) return 'wallet';
    return _split(cost, 'wallet_mpesa').ok ? 'wallet_mpesa' : 'mpesa';
  }
  function _method(cost) {
    const m = _choice || _auto(cost);
    return _split(cost, m).ok ? m : _auto(cost);
  }

  /* What placeOrder() sends + needs: {method, wallet, mpesa} */
  window.walletPayInfo = function (cost) {
    const c = cost != null ? cost : _cost;
    return _split(c, _method(c));
  };

  window.walletPayBtnLabel = function () {
    const btn = document.getElementById('placeOrderBtn');
    if (!btn || btn.classList.contains('loading')) return;
    const p = window.walletPayInfo();
    if (p.method !== 'mpesa' && p.mpesa === 0 && _cost > 0) btn.textContent = '💳 PAY WITH WALLET';
    else if (p.method === 'wallet_mpesa') btn.textContent = `📱 PAY ${_kes(p.mpesa)} & ORDER`;
    else btn.textContent = '📱 PAY & ORDER';
  };

  window.walletPick = function (m) { _choice = m; _render(); };

  function _render() {
    _css();
    const box = document.getElementById('omWalletPay');
    if (!box) return;
    const phoneRow = document.getElementById('omPhone')?.closest('.modal-field');
    if (!_enabled() || _cost <= 0) {
      box.innerHTML = '';
      if (phoneRow) phoneRow.style.display = '';
      window.walletPayBtnLabel();
      return;
    }
    const bal = _bal(), cost = _cost, cur = _method(cost);
    const w = _split(cost, 'wallet'), wm = _split(cost, 'wallet_mpesa');
    const opt = (id, title, sub, ok) => `<button type="button" class="wp-opt ${cur === id ? 'on' : ''}" ${ok ? '' : 'disabled'} onclick="walletPick('${id}')">
        <span class="wp-dot"></span><span><div class="wp-t">${title}</div><div class="wp-s">${sub}</div></span></button>`;
    let html = `<div class="wp-box"><div class="wp-head">💳 ENDAVIRAL WALLET <b>${_kes(bal)} available</b></div>`;
    html += opt('wallet', '💳 Pay with Wallet',
      w.ok ? `Your wallet covers the full ${_kes(cost)} — no M-Pesa prompt.` : `Not enough for this order (${_e(w.why)}). Lower the quantity or use Wallet + M-Pesa.`, w.ok);
    if (bal < cost) {
      html += opt('wallet_mpesa', '💳 + 📱 Wallet + M-Pesa',
        wm.ok ? `${_kes(wm.wallet)} from your wallet + ${_kes(wm.mpesa)} by M-Pesa.` : `Wallet balance is too small to combine here — pay with M-Pesa.`, wm.ok);
    }
    html += opt('mpesa', '📱 M-Pesa only', `Pay the full ${_kes(cost)} by M-Pesa and keep your wallet credit for later.`, true);
    html += `<div class="wp-note">Wallet credit is a refund for an order that didn't go through. Use it on any service — it can't be withdrawn to M-Pesa.</div></div>`;
    box.innerHTML = html;
    const p = _split(cost, cur);
    if (phoneRow) phoneRow.style.display = (p.method !== 'mpesa' && p.mpesa === 0) ? 'none' : '';
    window.walletPayBtnLabel();
  }

  window.walletOnOpenOrder = function () {
    _choice = null;
    const box = document.getElementById('omWalletPay');
    if (box) box.innerHTML = '';
    walletFetch(true).then(_render);
  };
  window.walletOnCost = function (cost) { _cost = Number(cost || 0); _render(); };

  /* After POST /orders. Paid fully by wallet → no M-Pesa step. */
  window.walletAfterOrder = function (resp) {
    if (resp && typeof resp.wallet_balance === 'number' && _wc) { _wc.balance = resp.wallet_balance; _wcAt = Date.now(); }
    else walletFetch(true);
    window.walletRefreshCard();
  };
  window.walletRefresh = function () { walletFetch(true).then(() => { window.walletRefreshCard(); if (document.getElementById('walletCreditCard')) window.walletRenderPage(true); }); };

  /* ── Dashboard card: "You have KES X to reorder with" ── */
  window.walletRefreshCard = async function () {
    const el = document.getElementById('dashWalletCard');
    if (!el) return;
    await walletFetch();
    _css();
    const bal = _bal();
    if (!(bal > 0)) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = `<div class="wd-card">
        <div class="wd-ic">💳</div>
        <div style="flex:1;min-width:0;">
          <div class="wd-t">${_kes(bal)} in your EndaViral Wallet</div>
          <div class="wd-s">Refunded from an order that didn't go through. Reorder any service and choose “Pay with Wallet” at checkout.</div>
        </div>
        <button type="button" onclick="navTo('services')">Reorder now →</button>
      </div>`;
  };

  /* ── Wallet page: balance + history ── */
  const KIND = {
    refund:  ['↩️', 'Refund'],
    spend:   ['🛒', 'Order paid'],
    release: ['↩️', 'Returned'],
    adjust:  ['🛠️', 'Adjustment'],
  };
  window.walletRenderPage = async function (useCache) {
    _css();
    const el = document.getElementById('walletCreditCard');
    if (!el) return;
    if (!useCache || !_wc) el.innerHTML = '<div class="wl-card"><div class="loading-spinner"><div class="spinner"></div><span>Loading wallet…</span></div></div>';
    const d = await walletFetch(!useCache);
    if (!d) { el.innerHTML = ''; return; }
    const rows = (d.entries || []).map(x => {
      const [ic, label] = KIND[x.kind] || ['•', x.kind];
      const inflow = Number(x.amount) > 0;
      return `<div class="wl-row"><div class="wl-ic">${ic}</div>
        <div class="wl-n">${_e(x.note || label)}<div class="wl-d">${x.created_at ? new Date(x.created_at).toLocaleString() : ''} · balance ${_kes(x.balance_after)}</div></div>
        <div class="wl-a ${inflow ? 'in' : 'out'}">${inflow ? '+' : '−'}${_kes(Math.abs(x.amount))}</div></div>`;
    }).join('');
    el.innerHTML = `<div class="wl-card">
      <div class="wl-top">
        <div style="flex:1;min-width:200px;">
          <div class="wl-lbl">💳 EndaViral Wallet · order credit</div>
          <div class="wl-bal">${_kes(d.balance)}</div>
        </div>
        ${Number(d.balance) > 0 ? `<button class="btn-primary" style="width:auto;padding:10px 18px;margin:0;" onclick="navTo('services')">REORDER NOW</button>` : ''}
      </div>
      <div class="wl-txt">When a paid order fails, is only partly delivered or is cancelled, what you paid for the undelivered part comes back here automatically — and we message you. Use it to order <b style="color:var(--white);">any</b> service: at checkout pick <b style="color:var(--white);">Pay with Wallet</b>, or <b style="color:var(--white);">Wallet + M-Pesa</b> for a bigger order. Wallet credit can't be withdrawn to M-Pesa.</div>
      ${rows ? `<div class="wl-hist"><div class="wl-lbl" style="margin-bottom:4px;">History</div>${rows}</div>` : ''}
    </div>`;
  };

  /* ── Live push from the backend when a refund lands ── */
  window.walletOnPush = function (evt) {
    if (_wc && evt && typeof evt.balance === 'number') { _wc.balance = evt.balance; _wcAt = 0; }
    window.walletRefresh();
    if (evt && typeof evt.balance === 'number') toast(`💳 Refund received — your wallet now has ${_kes(evt.balance)}`, 'success');
  };

  /* ── My Orders: "refunded to wallet" / "paid from wallet" tags ── */
  function _wrapTag() {
    const orig = window.orderReplacedTag;
    if (typeof orig !== 'function' || orig._wallet) return;
    const wrapped = function (o, big) {
      let html = orig.apply(this, arguments);
      const fs = big ? '12.5px' : '10.5px';
      if (o && o.wallet_refund) html += `<div class="od-wallet" style="font-size:${fs};" title="Use it for any new order">💳 ${_kes(o.wallet_refund.amount)} refunded to your wallet</div>`;
      else if (o && Number(o.wallet_paid) > 0) html += `<div class="od-wallet" style="font-size:${fs};color:var(--muted);font-weight:600;">💳 ${_kes(o.wallet_paid)} paid from wallet</div>`;
      return html;
    };
    wrapped._wallet = true;
    window.orderReplacedTag = wrapped;
  }
  _wrapTag();
  window.addEventListener('load', _wrapTag);
})();
