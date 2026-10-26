/* ═══════════════════════════════════════════════════════════════════════
 * reorder_alternatives.js — the "replacement service" picker shared by both
 * reorder dialogs:
 *   • Support → Reorder Queue → "Reorder for client"   (reorder_queue.js)
 *   • any order's popup → "🔁 Reorder"                  (admin.js → odmOpenReorder)
 *
 * When the original service is gone (not in the catalogue, switched off, or
 * the provider answers "service not found / disabled") staff get:
 *   1. SUGGESTIONS — the closest services of the same kind (same platform,
 *      same thing delivered, same kind of link so the ORIGINAL LINK still
 *      works), from the dialog's options call;
 *   2. "Choose another service…" — a searchable list of every service of that
 *      kind, cheapest first, for when the suggestions cost more than the
 *      client paid. Backend: GET /reorders/{task}/services  or
 *      GET /reorders/order/{id}/alternatives  (?q=&sort=&same_kind=).
 *
 * Prices are compared with what the CLIENT paid per 1,000 (client_rate_kes).
 * Quantities are price-matched by the backend: what the amount paid buys on
 * that service — a pricier service gives the client fewer units, a cheaper one
 * gives more. Services the payment can't cover at their minimum are listed but
 * can't be picked.
 * ═══════════════════════════════════════════════════════════════════════ */

const _RSVC_GONE_RE = /no longer has this service/i;

function rsvcIsServiceGoneError(e) {
  return _RSVC_GONE_RE.test((e && e.message) || String(e || ''));
}

/* "18% cheaper than the client paid" / "35% pricier …" / "same price". */
function rsvcPriceTag(a) {
  const p = a.price_diff_pct;
  if (p === null || p === undefined) return '';
  if (Math.abs(p) < 0.5) return '<span style="color:var(--muted);">≈ same price the client paid</span>';
  return p < 0
    ? `<span style="color:#3dd44a;font-weight:700;">${Math.abs(p).toFixed(0)}% cheaper</span> <span style="color:var(--muted);">than the client paid</span>`
    : `<span style="color:#ffb347;font-weight:700;">${p.toFixed(0)}% pricier</span> <span style="color:var(--muted);">than the client paid</span>`;
}

/* Units line: "→ 1,000 units (same as original)" / "+250" / "−400". */
function rsvcUnitsTag(a, owedQty) {
  const d = Number(a.quantity) - Number(owedQty);
  const delta = d > 0 ? `<span style="color:#3dd44a;">+${d.toLocaleString()} vs original</span>`
    : d < 0 ? `<span style="color:#ffb347;">${d.toLocaleString()} vs original</span>` : 'same as original';
  return `<span style="color:var(--white);font-weight:700;">→ ${Number(a.quantity).toLocaleString()} units</span> <span style="color:var(--muted);">(${delta}${a.capped ? ' · capped at this service\'s max' : ''})</span>`;
}

/* One radio card for a replacement service. */
function rsvcCardHtml(a, { name, owedQty, checked }) {
  return `
  <label style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer;background:var(--card);">
    <input type="radio" name="${name}" value="${esc(String(a.service))}" ${checked ? 'checked' : ''} style="margin-top:3px;"/>
    <div style="min-width:0;flex:1;font-size:12px;line-height:1.6;">
      <b style="color:var(--white);">${esc(a.name)}</b> <span style="color:var(--muted);">#${esc(String(a.service))}</span><br>
      ${rsvcUnitsTag(a, owedQty)}<br>
      <span style="color:var(--muted);">KES ${Number(a.rate_kes).toLocaleString()}/1k</span> · ${rsvcPriceTag(a)}<br>
      <span style="color:var(--muted);">limits ${Number(a.min).toLocaleString()}–${Number(a.max).toLocaleString()}${a.refill ? ' · ♻ refill' : ''}
        · costs you ~KES ${Number(a.est_cost_kes).toLocaleString()}${a.similarity !== undefined ? ` · ${Math.round(a.similarity * 100)}% match` : ''}</span>
    </div>
  </label>`;
}

/* Searchable browser of every similar service. onPick(row) is called with the
 * chosen row (same shape as a suggestion). */
function rsvcOpenBrowser({ url, owedQty, clientRate, isFree, paid, title, onPick }) {
  document.getElementById('rsvcBrowser')?.remove();
  const el = document.createElement('div');
  el.id = 'rsvcBrowser';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;';
  const fld = 'background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 11px;color:var(--white);font-family:inherit;font-size:13px;outline:none;box-sizing:border-box;';
  el.innerHTML = `<div style="background:var(--navy);border:1px solid var(--border);border-radius:14px;max-width:640px;width:100%;padding:20px;max-height:90vh;display:flex;flex-direction:column;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-weight:800;font-size:15px;">${esc(title || 'Choose a replacement service')}</div>
      <button id="rsvcClose" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;line-height:1;" aria-label="Close">×</button>
    </div>
    <div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:10px;">
      ${clientRate ? `The client paid <b style="color:var(--white);">KES ${Number(clientRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}/1k</b>${isFree ? '' : ` (KES ${Number(paid).toLocaleString(undefined, { maximumFractionDigits: 2 })} for ${Number(owedQty).toLocaleString()} units)`}. ` : ''}
      ${isFree ? 'Free order — the original quantity is kept on any service.' : 'Units are price-matched: what that amount buys on each service.'}
      The re-order uses the same link.
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <input id="rsvcQ" placeholder="Search name, category or service #" style="${fld}flex:1;min-width:180px;"/>
      <select id="rsvcSort" style="${fld}">
        <option value="cheapest">Cheapest first</option>
        <option value="match">Best match first</option>
      </select>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer;">
        <input id="rsvcSame" type="checkbox" checked/> Same kind only
      </label>
    </div>
    <div id="rsvcInfo" style="font-size:11px;color:var(--muted);margin-bottom:6px;"></div>
    <div id="rsvcList" style="overflow:auto;flex:1;min-height:120px;"></div>
  </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#rsvcClose').onclick = close;

  const qEl = el.querySelector('#rsvcQ'), sortEl = el.querySelector('#rsvcSort'), sameEl = el.querySelector('#rsvcSame');
  const list = el.querySelector('#rsvcList'), info = el.querySelector('#rsvcInfo');
  let rows = [], seq = 0, timer = null;

  const render = () => {
    if (!rows.length) {
      list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12.5px;">No services found.${sameEl.checked ? ' Untick “Same kind only” to see every service on this platform.' : ''}</div>`;
      return;
    }
    list.innerHTML = rows.map((a, i) => `
      <div style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--card);opacity:${a.affordable ? 1 : .55};">
        <div style="min-width:0;flex:1;font-size:12px;line-height:1.6;">
          <b style="color:var(--white);">${esc(a.name)}</b> <span style="color:var(--muted);">#${esc(String(a.service))}</span><br>
          ${a.affordable ? rsvcUnitsTag(a, owedQty) : `<span style="color:#ff8a80;">✕ ${esc(a.unaffordable_reason || 'Not affordable')}</span>`}<br>
          <span style="color:var(--muted);">KES ${Number(a.rate_kes).toLocaleString()}/1k</span> · ${rsvcPriceTag(a)}<br>
          <span style="color:var(--muted);">${esc(a.category || '')} · limits ${Number(a.min).toLocaleString()}–${Number(a.max).toLocaleString()}${a.refill ? ' · ♻ refill' : ''}${a.affordable ? ` · costs you ~KES ${Number(a.est_cost_kes).toLocaleString()}` : ''}</span>
        </div>
        <button class="action-btn" data-i="${i}" ${a.affordable ? '' : 'disabled'} style="white-space:nowrap;${a.affordable ? 'border-color:var(--green);color:var(--green);font-weight:700;' : ''}">Use this</button>
      </div>`).join('');
  };

  const load = async () => {
    const my = ++seq;
    list.innerHTML = '<div class="loading-spinner" style="padding:16px;"><div class="spinner"></div><span>Loading…</span></div>';
    const qs = new URLSearchParams({ sort: sortEl.value, same_kind: sameEl.checked ? 'true' : 'false', limit: '80' });
    if (qEl.value.trim()) qs.set('q', qEl.value.trim());
    try {
      const r = await api(`${url}?${qs}`);
      if (my !== seq) return;
      rows = r.items || [];
      const ok = rows.filter(x => x.affordable).length;
      info.textContent = `${r.total.toLocaleString()} service${r.total === 1 ? '' : 's'}${r.platform ? ' on ' + r.platform : ''}${sameEl.checked && r.kind ? ' · ' + r.kind + 's' : ''}`
        + (r.total > rows.length ? ` · showing first ${rows.length}` : '') + ` · ${ok} can be used`;
      render();
    } catch (e) {
      if (my !== seq) return;
      list.innerHTML = `<div style="color:#ff8a80;font-size:12.5px;padding:12px;">⚠️ ${esc(e.message || 'Could not load services')}</div>`;
    }
  };

  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b || b.disabled) return;
    const a = rows[Number(b.dataset.i)]; if (!a) return;
    close(); onPick(a);
  });
  qEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  sortEl.addEventListener('change', load);
  sameEl.addEventListener('change', load);
  load();
  setTimeout(() => qEl.focus(), 50);
}
