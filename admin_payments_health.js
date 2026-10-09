/* ═══════════════ ADMIN → PAYMENTS HEALTH ═══════════════
 * One screen for everything the payment hardening added:
 *   - policy switches (wallet top-ups off, receipt required, nightly sweep, provider)
 *   - payment pipeline (last 24h) and anything stuck pending
 *   - M-Pesa receipt coverage on paid orders (7d) + paid orders missing a receipt
 *   - orders delivered with NO successful payment (7d)
 *   - Reorder Queue counts (links to Support → Reorder Queue)
 *   - the last full (midnight) reconciliation report, with "Run now"
 * Data: GET /admin/payments-health (admin only). Loaded only when the tab is
 * opened or Refresh is pressed — no timers, so it never keeps Neon awake.
 * Depends on globals: api(), toast(), esc(), fmtKES().
 * ════════════════════════════════════════════════════ */

const _phCard = 'background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;';
const _phLabel = 'font-size:10.5px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;';

function _phPill(ok, yes, no) {
  const c = ok ? '#3dd44a' : '#ff5252';
  return `<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;border:1px solid ${c};color:${c};">${esc(ok ? yes : no)}</span>`;
}
function _phStat(label, value, color) {
  return `<div style="${_phCard}"><div style="${_phLabel}">${esc(label)}</div><div style="font-size:26px;font-weight:800;${color ? 'color:' + color + ';' : ''}">${value}</div></div>`;
}
function _phWhen(iso) { return iso ? new Date(iso).toLocaleString() : '—'; }
function _phTable(cols, rows) {
  if (!rows.length) return '';
  return `<div style="overflow-x:auto;margin-top:10px;"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td style="font-size:12px;">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const _phShort = id => `<span style="font-family:monospace;">#${esc(String(id || '').slice(0, 8))}</span>`;

async function loadPaymentsHealth() {
  const root = document.getElementById('paymentsHealthRoot');
  if (!root) return;
  if (!currentUser || currentUser.role !== 'admin') { root.innerHTML = '<div class="empty-state"><p>Admins only.</p></div>'; return; }
  root.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const d = await api('/admin/payments-health/');
    root.innerHTML = _phRender(d);
  } catch (e) {
    root.innerHTML = `<div style="padding:30px;color:#ff5252;">Failed to load: ${esc(e.message || e)}</div>`;
  }
}

function _phRender(d) {
  const p = d.policy, pl = d.pipeline_24h, rc = d.receipts_7d, un = d.delivered_without_payment_7d, rq = d.reorder_queue, lr = d.last_reconciliation;
  const st = pl.by_status || {};
  const covColor = rc.coverage_pct == null ? '' : rc.coverage_pct >= 99.9 ? '#3dd44a' : '#ffb347';

  const header = `<div class="sec-hd"><div><div class="sec-title">PAYMENTS HEALTH</div>
    <div class="sec-sub">Every order paid by its own M-Pesa STK push · every payment traceable to its M-Pesa reference · reconciled every midnight (EAT). Updated ${esc(_phWhen(d.generated_at))}</div></div>
    <div style="display:flex;gap:8px;"><button class="btn-secondary" onclick="loadPaymentsHealth()">↻ Refresh</button></div></div>`;

  const policy = `<div style="${_phCard}margin-bottom:16px;display:flex;gap:18px 28px;flex-wrap:wrap;align-items:center;">
    <div><div style="${_phLabel}">Payment provider</div><b style="text-transform:capitalize;">${esc(p.payment_provider)}</b></div>
    <div><div style="${_phLabel}">Wallet top-ups</div>${_phPill(!p.wallet_topup_enabled, 'OFF (pay per order)', 'ON')}</div>
    <div><div style="${_phLabel}">M-Pesa receipt required</div>${_phPill(p.require_mpesa_receipt, 'YES', 'NO')}</div>
    <div><div style="${_phLabel}">Midnight reconciliation</div>${_phPill(p.nightly_reconciliation_enabled, 'ON', 'OFF')}</div>
    <div style="font-size:11px;color:var(--muted);max-width:360px;">Switches are Render environment variables: WALLET_TOPUP_ENABLED, REQUIRE_MPESA_RECEIPT, NIGHTLY_RECONCILIATION_ENABLED.</div></div>`;

  const stats = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px;">
    ${_phStat('Paid (24h)', st.success || 0, '#3dd44a')}
    ${_phStat('Pending (24h)', st.pending || 0)}
    ${_phStat('Failed / cancelled (24h)', (st.failed || 0) + (st.cancelled || 0) + (st.timeout || 0))}
    ${_phStat('Stuck pending > 10 min', pl.stuck_pending_over_10min, pl.stuck_pending_over_10min ? '#ff5252' : '')}
    ${_phStat('Receipt coverage (7d)', rc.coverage_pct == null ? '—' : rc.coverage_pct + '%', covColor)}
    ${_phStat('Delivered without payment (7d)', un.count, un.count ? '#ff5252' : '#3dd44a')}
  </div>`;

  const missing = rc.missing_receipt
    ? `<div style="${_phCard}margin-bottom:16px;border-left:3px solid #ffb347;"><div style="${_phLabel}">Paid orders missing an M-Pesa reference (${rc.missing_receipt})</div>
       <div style="font-size:12px;color:var(--muted);">Marked paid but the provider gave no receipt. The nightly run re-checks these with the provider; if one stays here, look it up in your Paywave dashboard.</div>
       ${_phTable(['Order', 'Amount', 'Phone', 'Paid at'], rc.missing_list.map(r => [_phShort(r.order_id), fmtKES(r.amount), esc(r.phone || ''), esc(_phWhen(r.created_at))]))}</div>` : '';

  const unpaid = un.count
    ? `<div style="${_phCard}margin-bottom:16px;border-left:3px solid #ff5252;"><div style="${_phLabel}">Orders sent to the provider with NO successful payment (${un.count})</div>
       <div style="font-size:12px;color:var(--muted);">Needs a human look — typically orders from before the payment check was added, or an admin-submitted order.</div>
       ${_phTable(['Order', 'Service', 'Charge', 'Phone', 'Status', 'Created'], un.list.map(r => [_phShort(r.order_id), esc(r.service_name || ''), fmtKES(r.charge), esc(r.phone || ''), esc(r.status), esc(_phWhen(r.created_at))]))}</div>` : '';

  const queue = `<div style="${_phCard}margin-bottom:16px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
    <div><div style="${_phLabel}">Reorder queue (failed / partial / cancelled, flagged at midnight)</div>
      <div style="font-size:13px;">🔴 Needs contact <b>${rq.pending || 0}</b> · 🟡 Contacted <b>${rq.contacted || 0}</b> · 🟢 Reordered <b>${rq.reordered || 0}</b> · ⚪ Dismissed <b>${rq.dismissed || 0}</b></div></div>
    <button class="btn-primary" onclick="phOpenReorderQueue()">Open Reorder Queue${rq.open ? ' (' + rq.open + ')' : ''}</button></div>`;

  let recon = `<div style="${_phCard}"><div style="${_phLabel}">Last full reconciliation</div><div style="font-size:13px;color:var(--muted);">No report yet — the first one is created right after midnight (EAT), or press “Run now”.</div></div>`;
  if (lr) {
    const pr = lr.problems || {};
    const probLabels = {
      delivered_without_payment: 'Delivered without payment', underpaid: 'Underpaid', paid_no_receipt: 'Paid, no receipt',
      paid_but_not_delivered: 'Paid but not delivered', duplicate_receipt: 'Duplicate receipt', still_pending_over_1h: 'Still pending > 1h',
    };
    const probs = Object.keys(probLabels).filter(k => (pr[k] || []).length);
    recon = `<div style="${_phCard}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
      <div><div style="${_phLabel}">Last full reconciliation</div>
        <div style="font-size:13px;">Day <b>${esc(lr.day)}</b> · ran ${esc(_phWhen(lr.ran_at_eat))} · ${esc(lr.seconds)}s ${_phPill(!!lr.ok, 'ALL CLEAR', (lr.problem_count || 0) + ' PROBLEM(S)')}</div></div>
      <button class="btn-secondary" id="phRunBtn" onclick="phRunReconciliation()">▶ Run now</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px;font-size:12px;color:var(--muted);">
        <div>Provider checks<br><b style="color:var(--white);font-size:18px;">${lr.polled || 0}</b></div>
        <div>Late payments recovered<br><b style="color:var(--white);font-size:18px;">${(lr.recovered_late_payments || []).length}</b></div>
        <div>Receipts back-filled<br><b style="color:var(--white);font-size:18px;">${(lr.receipts_backfilled || []).length}</b></div>
        <div>Paid orders submitted<br><b style="color:var(--white);font-size:18px;">${(lr.paid_orders_submitted || []).length}</b></div>
        <div>Orders checked<br><b style="color:var(--white);font-size:18px;">${lr.orders_checked || 0}</b></div>
        <div>New reorder flags<br><b style="color:var(--white);font-size:18px;">${(lr.reorder_queue || {}).new ?? 0}</b></div></div>
      ${lr.truncated ? '<div style="margin-top:10px;font-size:12px;color:#ffb347;">⚠ Hit the provider-check limit; some rows were not re-checked. Raise NIGHTLY_RECONCILIATION_MAX_POLLS if this repeats.</div>' : ''}
      ${(lr.errors || []).length ? `<div style="margin-top:10px;font-size:12px;color:#ff5252;">Errors: ${(lr.errors).slice(0, 5).map(esc).join(' · ')}</div>` : ''}
      ${probs.map(k => `<div style="margin-top:14px;"><div style="${_phLabel}color:#ff5252;">${probLabels[k]} (${pr[k].length})</div>
        ${_phTable(['Order / checkout', 'Details'], pr[k].slice(0, 20).map(r => [_phShort(r.order_id || r.checkout_request_id || r.receipt), esc([r.service_name, r.status, r.charge != null ? 'KES ' + r.charge : '', r.phone, r.receipt, r.payments ? r.payments + ' payments' : ''].filter(Boolean).join(' · '))]))}</div>`).join('')}
      ${(lr.recovered_late_payments || []).length ? `<div style="margin-top:14px;"><div style="${_phLabel}color:#3dd44a;">Late payments recovered</div>
        ${_phTable(['Checkout', 'Stream', 'Change'], lr.recovered_late_payments.slice(0, 20).map(r => [esc(String(r.checkout_request_id).slice(0, 14)), esc(r.stream), esc(r.from + ' → ' + r.to)]))}</div>` : ''}
    </div>`;
  }
  return header + policy + stats + missing + unpaid + queue + recon;
}

async function phRunReconciliation() {
  if (!confirm('Run the full reconciliation now? It re-checks yesterday and today with Paywave and can take a minute or two.')) return;
  const b = document.getElementById('phRunBtn');
  if (b) { b.disabled = true; b.textContent = 'Running…'; }
  try {
    const r = await api('/admin/payments-health/run-reconciliation', { method: 'POST' });
    toast(r.skipped ? r.skipped : `Done — ${r.problem_count || 0} problem(s), ${(r.recovered_late_payments || []).length} recovered`, r.problem_count ? 'error' : 'success');
  } catch (e) { toast(e.message || 'Failed', 'error'); }
  loadPaymentsHealth();
}

function phOpenReorderQueue() {
  const btn = document.querySelector('.admin-tab[onclick*="support"]');
  if (btn) btn.click();
  setTimeout(() => { if (typeof rqShowView === 'function') rqShowView('queue'); }, 300);
}
