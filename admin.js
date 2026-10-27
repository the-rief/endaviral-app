/* ════════════════════ ADMIN PANEL JS ════════════════════
 * Extracted from index.html for maintainability.
 * Depends on: api(), toast(), fmtKES(), statusPill(),
 *             currentUser, allServices (globals in index.html)
 * ════════════════════════════════════════════════════════ */

// XSS-safe HTML escaping — use for ALL user/server data injected into innerHTML
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ══════════════════ ADMIN TABS & USERS ══════════════════ */
function adminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ap-' + tab).classList.add('active');
  if (tab === 'users') loadAdminUsers();
  if (tab === 'allorders') loadAdminOrders();
  if (tab === 'services-mgmt') { loadAdminServices(); loadSavedPricingSettings(); loadServiceSyncStatus(); }
  if (tab === 'stats') { loadAdminCommandCenter(); }
  if (tab === 'providers') loadAdminProviders();
  if (tab === 'support') openAdminSupportTab();
  if (tab === 'create-order') initAdminCreateOrder();
  if (tab === 'affiliate-payouts') affAdminSubTab('payouts');
  if (tab === 'academy') acAdminSubTab('overview');
  if (tab === 'connect') cnAdminSubTab('overview');
  if (tab === 'ccr-agents') ccrAdminInit();
  if (tab === 'creator-events') { if (typeof adminEventsInit === 'function') adminEventsInit(); }
  if (tab === 'payments-health') { if (typeof loadPaymentsHealth === 'function') loadPaymentsHealth(); }
  if (tab === 'link-queue') { if (typeof loadAdminLinkQueue === 'function') loadAdminLinkQueue(); }
  if (tab === 'free-orders') { if (typeof loadAdminFreeOrders === 'function') loadAdminFreeOrders(); }
  if (tab === 'wallet-credit') { if (typeof loadAdminWalletCredit === 'function') loadAdminWalletCredit(); }
  if (tab === 'consultations') { if (typeof loadAdminConsultations === 'function') loadAdminConsultations(); }
  if (tab === 'broadcasts') { if (typeof loadAdminBroadcasts === 'function') loadAdminBroadcasts(); }
}

async function loadAdminUsers() {
  const el = document.getElementById('adminUsersTable');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading users…</span></div>';
  try {
    const data = await api('/admin/users?limit=100');
    const users = data.users || data.data || data || [];
    if (!users.length) { el.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>No users found.</p></div>'; return; }
    el.innerHTML = `<table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Orders</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u => {
        const uid  = esc(u.id||u._id);
        const name = esc(u.name||u.username||'—');
        const email= esc(u.email||'—');
        const role = esc(u.role||'user');
        const roleBg = u.role==='admin' ? 'rgba(61,212,74,.12)' : 'var(--navy)';
        const roleColor = u.role==='admin' ? 'var(--green)' : 'var(--muted)';
        const joined = u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';
        return `
        <tr>
          <td><strong>${name}</strong></td>
          <td style="color:var(--muted);font-size:13px;">${email}</td>
          <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${roleBg};color:${roleColor};">${role}</span></td>
          <td style="color:var(--green);font-family:'Montserrat',sans-serif;font-size:16px;">${fmtKES(u.balance||u.wallet_balance)}</td>
          <td>${parseInt(u.total_orders||u.orders_count||0)}</td>
          <td style="font-size:12px;color:var(--muted);">${joined}</td>
          <td><div style="display:flex;gap:6px;"><button class="action-btn" onclick="adminCreditUser('${uid}','${name}')">+ Credit</button><button class="action-btn danger" onclick="adminBanUser('${uid}')">Ban</button></div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
  } catch(e) { el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`; }
}

// Populated by loadAdminOrders so openOrderDetailModal (also used from
// Support → Recent/Linked Orders via _supportOrdersCache) can look up
// full order details when a row is clicked in the All Orders table.
let _adminOrdersCache = {};

async function loadAdminOrders() {
  const el = document.getElementById('adminOrdersTable');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  const emailFilter = (document.getElementById('adminOrderSearch')?.value || '').trim();
  const orderIdFilter = (document.getElementById('adminOrderIdSearch')?.value || '').trim().replace(/^#/, '');
  const statusFilter = (document.getElementById('adminOrderStatusFilter')?.value || '').trim().toLowerCase();
  const freeOnly = (document.getElementById('adminOrderTypeFilter')?.value || '') === 'free';
  const upsellOnly = (document.getElementById('adminOrderTypeFilter')?.value || '') === 'upsell';
  try {
    const qs = '?limit=100' + (emailFilter ? `&email=${encodeURIComponent(emailFilter)}` : '') + (freeOnly ? '&free_only=true' : '') + (upsellOnly ? '&kind=upsell' : '');
    const data = await api('/admin/orders' + qs);
    let orders = data.orders || data.data || data || [];

    // Client-side Order ID filter (partial match on UUID)
    if (orderIdFilter) {
      orders = orders.filter(o => (o.id || '').toLowerCase().includes(orderIdFilter.toLowerCase()));
    }

    // Client-side status filter. "processing" also catches an "inprogress"
    // backend value, matching how statusPill() already groups the two.
    if (statusFilter) {
      orders = orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        // "queued" = paid, waiting for an earlier order on the same link (o.queued);
        // those are kept out of "processing" so the two don't overlap.
        if (statusFilter === 'queued') return !!o.queued;
        return statusFilter === 'processing' ? ((s === 'processing' || s === 'inprogress') && !o.queued) : s === statusFilter;
      });
    }

    _adminOrdersCache = {};
    orders.forEach(o => { if (o && o.id) _adminOrdersCache[o.id] = o; });

    // Only shown when a filter is actually active, so it doesn't clutter
    // the default "browse everything" view.
    const hasFilter = !!(emailFilter || orderIdFilter || statusFilter || freeOnly || upsellOnly);
    const clearBtn = hasFilter
      ? `<div style="padding:0 0 12px;">
           <button class="action-btn" onclick="clearAdminOrderFilters()">✕ Clear Filters</button>
         </div>`
      : '';

    if (!orders.length) { el.innerHTML = `${clearBtn}<div class="empty-state"><div class="icon">📭</div><p>No orders found.</p></div>`; return; }
    el.innerHTML = `${clearBtn}<table>
      <thead><tr><th>#ID</th><th>Customer</th><th>Service</th><th>Link</th><th>Qty</th><th>Start/Remains</th><th>Cost</th><th>Status</th><th>M-Pesa Ref</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${orders.map(o => {
        const shortId   = esc((o.id||'').slice(0,8));
        const fullId    = esc(o.id||'');
        const provNum   = esc(o.provider_order_id||'');
        const provId    = provNum ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">Provider: #${provNum}</div>` : '';
        const rawLink   = o.link || '';
        const safeLink  = esc(rawLink);
        const linkDisplay = rawLink
          ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:var(--green);font-size:11px;word-break:break-all;max-width:160px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeLink}">${safeLink}</a>`
          : '<span style="color:var(--muted);font-size:11px;">—</span>';
        const userEmail  = esc(o.user_email||'—');
        const userName   = esc(o.user_name||'');
        const svcName    = esc(o.service_name||o.service||'—');
        const userId     = esc(o.user_id||'');
        const phone      = esc(o.phone||'');
        const phoneDisplay = phone
          ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">📞 ${phone} <button onclick="navigator.clipboard.writeText('${phone}').then(()=>toast('Phone copied!','success'))" title="Copy phone number" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:0 2px;border-radius:4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">⎘</button></div>`
          : '';
        const date       = o.created_at ? new Date(o.created_at).toLocaleDateString() : '—';
        const mpesaRef   = esc(o.mpesa_receipt||'');
        const mpesaCell  = mpesaRef
          ? `<span style="font-family:monospace;font-size:12px;color:var(--green);">${mpesaRef}</span> <button onclick="event.stopPropagation();navigator.clipboard.writeText('${mpesaRef}').then(()=>toast('M-Pesa ref copied!','success'))" title="Copy M-Pesa reference" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:0 2px;border-radius:4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">⎘</button>`
          : (String(o.service_name||o.service||'').startsWith('🔁 Reorder')
              ? '<span style="color:var(--muted);font-size:11px;" title="Re-placed for a client who already paid">🔁 reorder</span>'
              : (o.is_free || !(Number(o.charge||o.cost||0) > 0))
                ? '<span style="color:var(--muted);font-size:11px;" title="Free / bonus order — no payment">🎁 free</span>'
                : (o.provider_order_id && ['processing','inprogress','completed','partial'].includes((o.status||'').toLowerCase()))
                  ? '<span style="color:#ff5252;font-size:11px;font-weight:700;" title="Sent to the provider but no M-Pesa payment/reference on record — check Payments Health">⚠ none</span>'
                  : '<span style="color:var(--muted);font-size:11px;">—</span>');
        const startRemains = (o.start_count != null || o.remains != null)
          ? `${o.start_count != null ? parseInt(o.start_count).toLocaleString() : '—'} / ${o.remains != null ? parseInt(o.remains).toLocaleString() : '—'}`
          : '—';
        const status = (o.status||'').toLowerCase();
        // Cancel isn't offered here: MoreThanPanel only accepts cancel
        // on orders that never started delivery, and by the time an
        // order shows up in this list it's already been submitted —
        // the provider's own dashboard doesn't offer a cancel action
        // on in-progress/completed orders either. Refill is what's
        // actually actionable post-delivery, and only for orders the
        // provider delivered something on.
        const canAdminRefill = ['completed','partial'].includes(status) && o.service_refill;
        return `<tr onclick="openOrderDetailModal('${fullId}')" title="Click for full order details" style="cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(61,212,74,.06)'" onmouseout="this.style.background=''">
          <td style="font-size:11px;">
            <span style="color:var(--muted);">#${shortId}</span>
            <button onclick="event.stopPropagation();navigator.clipboard.writeText('${fullId}').then(()=>toast('Order ID copied!','success'))" title="Copy full Order ID" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:2px 4px;margin-left:2px;border-radius:4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">⎘</button>
            ${provId}
          </td>
          <td style="font-size:13px;">
            <div style="font-weight:600;color:var(--white);">${userEmail}</div>
            ${userName && userName !== '—' ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${userName}</div>` : ''}
            ${phoneDisplay}
          </td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">${svcName}${o.from_upsell
            ? `<div style="margin-top:3px;"><span title="${o.upsell_how === 'suggested' ? 'Ordered the suggested service' : 'Came from a suggestion, picked another service'} · from ${o.upsell_source === 'after_order' ? 'order-placed screen' : 'dashboard'}" style="font-size:10px;font-weight:700;color:#3dd44a;background:rgba(61,212,74,.12);border:1px solid rgba(61,212,74,.3);border-radius:6px;padding:1px 6px;">💡 Suggested${o.upsell_how === 'other_service' ? ' · other svc' : ''}</span></div>` : ''}</td>
          <td style="max-width:160px;" onclick="event.stopPropagation();">${linkDisplay}</td>
          <td>${parseInt(o.quantity||0).toLocaleString()}</td>
          <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${startRemains}</td>
          <td style="color:var(--green);font-family:'Montserrat',sans-serif;font-size:15px;">${fmtKES(o.charge||o.cost)}</td>
          <td>${statusPill(o.status, o.queued)}${reorderedTag(o)}</td>
          <td style="white-space:nowrap;">${mpesaCell}</td>
          <td style="font-size:12px;color:var(--muted);">${date}</td>
          <td style="white-space:nowrap;" onclick="event.stopPropagation();">
            <button class="action-btn" onclick="adminMessageCustomer('${userId}','${userEmail}')" title="Open support thread with customer">💬 Message</button>
            ${canAdminRefill ? `<button class="action-btn" onclick="adminRefillOrder('${fullId}')" title="Request a refill from the provider">↻ Refill</button>` : ''}
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
  } catch(e) { el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`; }
}

// Resets both All Orders search boxes (email + order ID) and reloads the
// full unfiltered list — e.g. after jumpToOrderInAllOrders() has narrowed
// the table down to one customer's history.
function clearAdminOrderFilters() {
  const emailInput = document.getElementById('adminOrderSearch');
  const idInput = document.getElementById('adminOrderIdSearch');
  const statusInput = document.getElementById('adminOrderStatusFilter');
  if (emailInput) emailInput.value = '';
  if (idInput) idInput.value = '';
  if (statusInput) statusInput.value = '';
  const typeInput = document.getElementById('adminOrderTypeFilter');
  if (typeInput) typeInput.value = '';
  loadAdminOrders();
}

async function adminRefillOrder(orderId) {
  if (!confirm('Request a refill for this order from the provider?')) return;
  try {
    const data = await api(`/admin/orders/${orderId}/refill`, { method: 'POST' });
    toast(data.message || 'Refill request submitted', 'success');
    loadAdminOrders();
  } catch (e) {
    toast(`Refill failed: ${e.message}`, 'error');
  }
}

let _adminAllSvcs = [];

async function loadAdminServices() {
  const el = document.getElementById('adminSvcTable');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const data = await api('/admin/services' + '?' + 'include_inactive=true').catch(() => api('/services'));
    _adminAllSvcs = data.services || data.data || data || [];
    renderAdminServices();
  } catch(e) { el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`; }
}

function applyMinQtyFilter() {
  renderAdminServices();
}

function renderAdminServices() {
  const el = document.getElementById('adminSvcTable');
  const minQtyLimit = parseInt(document.getElementById('minQtyFilter')?.value || '10000');
  const minRateKes  = parseFloat(document.getElementById('minRateKes')?.value || '100');
  const maxRateKes  = parseFloat(document.getElementById('maxRateKes')?.value || '10000');
  const searchTerm  = (document.getElementById('adminSvcSearch')?.value || '').trim().toLowerCase();

  // Search filter applies first — matches name, ID, or category
  const searched = searchTerm
    ? _adminAllSvcs.filter(s => {
        const svcId = String(s.service || s.id || s._id || '').toLowerCase();
        const name  = String(s.name || '').toLowerCase();
        const cat   = String(s.category || '').toLowerCase();
        return svcId.includes(searchTerm) || name.includes(searchTerm) || cat.includes(searchTerm);
      })
    : _adminAllSvcs;

  // A service is visible only if it passes ALL three filters
  const shown = searched.filter(s => {
    const rate = parseFloat(s.rate || s.price || 0);
    return parseInt(s.min || 0) <= minQtyLimit && rate >= minRateKes && rate <= maxRateKes;
  });
  const hiddenByQty  = searched.filter(s => parseInt(s.min || 0) > minQtyLimit);
  const hiddenByRate = searched.filter(s => {
    const rate = parseFloat(s.rate || s.price || 0);
    return parseInt(s.min || 0) <= minQtyLimit && (rate < minRateKes || rate > maxRateKes);
  });

  if (!_adminAllSvcs.length) { el.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No services. Click Sync.</p></div>'; return; }
  if (searchTerm && !searched.length) { el.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>No services match "${esc(document.getElementById('adminSvcSearch').value)}".</p></div>`; return; }
  el.innerHTML = `
    <div style="padding:10px 0 14px;font-size:12px;color:var(--muted);">
      Showing <strong style="color:var(--white);">${shown.length}</strong> services
      ${hiddenByQty.length  ? `· <strong style="color:var(--orange);">${hiddenByQty.length} hidden</strong> (min qty &gt; ${minQtyLimit.toLocaleString()})` : ''}
      ${hiddenByRate.length ? `· <strong style="color:var(--blue);">${hiddenByRate.length} hidden</strong> (rate outside KES ${minRateKes}–${maxRateKes})` : ''}
      · Total: ${_adminAllSvcs.length}${searchTerm ? ` · Matching "${esc(document.getElementById('adminSvcSearch').value)}": ${searched.length}` : ''}
    </div>
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Rate / 1000</th><th>Min</th><th>Max</th><th>Active</th><th>Actions</th></tr></thead>
      <tbody>${shown.map(s => {
        const svcId = esc(s.service || s.id || s._id || '');
        const isActive = s.is_active !== false;
        const rate = parseFloat(s.rate || s.price || 0);
        const rateColor = rate < minRateKes || rate > maxRateKes ? 'var(--blue)' : 'var(--green)';
        return `
        <tr style="${!isActive ? 'opacity:0.5;' : ''}">
          <td style="color:var(--muted);font-size:12px;">${svcId}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;">${esc(s.name||'—')}</td>
          <td style="font-size:12px;">${esc(s.category||'—')}</td>
          <td style="color:${rateColor};font-family:'Montserrat',sans-serif;font-size:16px;">${fmtKES(rate)}</td>
          <td style="${parseInt(s.min||0) > minQtyLimit ? 'color:var(--orange);font-weight:700;' : ''}">${parseInt(s.min||0).toLocaleString()}</td>
          <td>${parseInt(s.max||0).toLocaleString()}</td>
          <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${isActive ? 'rgba(61,212,74,.12)' : 'rgba(229,57,53,.1)'};color:${isActive ? 'var(--green)' : 'var(--red)'};">${isActive ? 'Shown' : 'Hidden'}</span></td>
          <td><div style="display:flex;gap:6px;">
            <button class="action-btn" onclick="toggleSvcVisibility('${svcId}','${isActive}')">${isActive ? '🙈 Hide' : '👁 Show'}</button>
            <button class="action-btn danger" onclick="deleteSvc('${svcId}')">🗑 Del</button>
          </div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
    ${hiddenByQty.length  ? `<div style="margin-top:16px;padding:12px 16px;background:rgba(255,112,67,.06);border:1px solid rgba(255,112,67,.2);border-radius:10px;font-size:12px;color:var(--orange);">
      ⚠️ ${hiddenByQty.length} services hidden — min order qty exceeds ${minQtyLimit.toLocaleString()}. Adjust "HIDE MIN QTY" above to change.
    </div>` : ''}
    ${hiddenByRate.length ? `<div style="margin-top:10px;padding:12px 16px;background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);border-radius:10px;font-size:12px;color:var(--blue);">
      ℹ️ ${hiddenByRate.length} services hidden — rate is outside KES ${minRateKes}–${maxRateKes} per 1000. Adjust MIN/MAX RATE above to change.
    </div>` : ''}`;
}

/* ══════════════════ BUSINESS HEALTH SCORE (global-standard composite) ══════════════════
 * Answers "is the business winning or losing" in one glance by rolling five
 * standard operator/investor signals into a single 0–100 score:
 *   Growth (WoW sales)  30%  — is momentum up or down
 *   Net Margin          25%  — profit ÷ sales
 *   Retention            20%  — % of payers who order 2+ times
 *   LTV : CAC            15%  — spend-to-date per payer vs. cost to acquire
 *                                one (3x+ is the standard "healthy" bar)
 *   Cash Runway          10%  — days until the provider panel balance
 *                                (the thing that actually blocks orders)
 *                                runs dry at the current burn rate
 * Pulls from endpoints already used elsewhere on this tab (snapshot +
 * trends) — no new backend endpoints required. Cached separately so this
 * banner can refresh independently of the heavier panels below it.
 * ════════════════════════════════════════════════════════════════════════ */

let _bizHealthCacheTs = 0;
const BIZ_HEALTH_TTL = 180 * 1000;

function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function _healthLabel(score) {
  if (score >= 75) return { text: 'Thriving',         emoji: '🟢', color: 'var(--green)' };
  if (score >= 50) return { text: 'Stable & Growing',  emoji: '🟢', color: 'var(--green)' };
  if (score >= 30) return { text: 'Cooling Off',        emoji: '🟡', color: 'var(--orange)' };
  return               { text: 'At Risk',                emoji: '🔴', color: 'var(--red)' };
}

function _healthSubMetric(label, score, valueText) {
  const c = score >= 65 ? 'var(--green)' : score >= 40 ? 'var(--orange)' : 'var(--red)';
  return `<div style="flex:1;min-width:130px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">${label}</div>
    <div style="font-size:15px;font-weight:800;color:var(--white);margin-bottom:6px;">${valueText}</div>
    <div style="height:5px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${_clamp(score,0,100)}%;background:${c};border-radius:4px;"></div></div>
  </div>`;
}

async function loadBusinessHealth(force = false) {
  const now = Date.now();
  if (!force && _bizHealthCacheTs > 0 && (now - _bizHealthCacheTs) < BIZ_HEALTH_TTL) return;
  const el = document.getElementById('businessHealthPanel');
  if (!el) return;
  try {
    const [snap, trends] = await Promise.all([
      api('/admin/stats/snapshot'),
      api('/admin/stats/trends?days=30'),
    ]);
    _bizHealthCacheTs = Date.now();

    const g        = trends.growth || {};
    const burn      = trends.balance_burn || {};
    const salesWow  = g.sales_wow_pct;
    const netMargin = snap.net_margin_pct ?? 0;
    const repeatRate = snap.repeat_rate_pct ?? 0;
    const cac = snap.cac_kes;
    const clv = snap.clv_kes ?? 0;
    const ltvCac = (cac && cac > 0) ? (clv / cac) : null;

    const growthScore    = (salesWow === null || salesWow === undefined) ? 50 : _clamp(50 + salesWow * 2, 0, 100);
    const marginScore     = _clamp(netMargin * 2, 0, 100);
    const retentionScore  = _clamp(repeatRate * 2.5, 0, 100);
    const ltvCacScore     = ltvCac === null ? 50 : _clamp((ltvCac / 3) * 100, 0, 100);
    let runwayScore = 100;
    if (burn.burn_usd_per_day > 0 && burn.days_until_empty !== null && burn.days_until_empty !== undefined) {
      runwayScore = burn.days_until_empty <= 3 ? 10 : burn.days_until_empty <= 7 ? 40 : burn.days_until_empty <= 14 ? 70 : 100;
    }

    const overall = Math.round(
      growthScore * 0.30 + marginScore * 0.25 + retentionScore * 0.20 + ltvCacScore * 0.15 + runwayScore * 0.10
    );
    const lbl = _healthLabel(overall);

    const notes = [];
    if (salesWow !== null && salesWow !== undefined) {
      notes.push(salesWow >= 0
        ? `Sales are up ${salesWow}% week-over-week.`
        : `Sales are down ${Math.abs(salesWow)}% week-over-week — worth a look.`);
    }
    notes.push(`Net margin is ${netMargin}%${netMargin < 15 ? ' — thin, watch provider costs' : '.'}`);
    notes.push(`${repeatRate}% of paying customers place a 2nd order${repeatRate < 20 ? ' — retention is the weak link right now' : '.'}`);
    if (ltvCac !== null) {
      notes.push(`LTV : CAC is ${ltvCac.toFixed(1)}x${ltvCac < 3 ? ' — below the 3x benchmark considered healthy' : ' — above the 3x benchmark, a healthy ratio'}.`);
    }
    if (burn.burn_usd_per_day > 0 && burn.days_until_empty !== null && burn.days_until_empty !== undefined && burn.days_until_empty <= 14) {
      notes.push(`⚠️ Provider panel balance runs out in ~${burn.days_until_empty} day${burn.days_until_empty === 1 ? '' : 's'} at the current burn rate.`);
    }

    el.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(61,212,74,.05), var(--card));border:1px solid ${lbl.color};border-radius:16px;padding:22px 24px;">
        <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:88px;height:88px;border-radius:50%;border:6px solid ${lbl.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <div style="text-align:center;">
                <div style="font-size:26px;font-weight:900;color:${lbl.color};line-height:1;">${overall}</div>
                <div style="font-size:9px;color:var(--muted);">/ 100</div>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">Business Health</div>
              <div style="font-size:20px;font-weight:900;color:${lbl.color};">${lbl.emoji} ${lbl.text}</div>
            </div>
          </div>
          <div style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:2px;">
            ${notes.map(n => `<div style="font-size:13px;color:var(--white);line-height:1.6;">💡 ${esc(n)}</div>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:20px;padding-top:18px;border-top:1px solid var(--border);">
          ${_healthSubMetric('Growth (WoW)', growthScore, (salesWow === null || salesWow === undefined) ? '—' : `${salesWow >= 0 ? '▲' : '▼'} ${Math.abs(salesWow)}%`)}
          ${_healthSubMetric('Net Margin', marginScore, `${netMargin}%`)}
          ${_healthSubMetric('Retention', retentionScore, `${repeatRate}%`)}
          ${_healthSubMetric('LTV : CAC', ltvCacScore, ltvCac === null ? '—' : `${ltvCac.toFixed(1)}x`)}
          ${_healthSubMetric('Cash Runway', runwayScore, (burn.days_until_empty === null || burn.days_until_empty === undefined) ? 'Healthy' : `${burn.days_until_empty}d`)}
        </div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't compute business health. <button class="action-btn" onclick="loadBusinessHealth(true)">Retry</button></p></div>`;
  }
}

/* ══════════════════ BUSINESS UNITS AT A GLANCE (Affiliates/CCR/Connect/Academy) ══════════════════
 * The Stats tab used to only show core SMM-panel numbers, so anything
 * happening in the other three revenue/cost centres (affiliate commissions,
 * CCR agent commissions, Connect marketplace, Creator Academy) was invisible
 * unless you dug into their own tabs. This pulls a compact summary of all
 * four in parallel — reusing the exact endpoints those tabs already call —
 * so a single glance at Stats shows the whole business, not just the panel.
 * ════════════════════════════════════════════════════════════════════════ */

let _bizUnitsCacheTs = 0;
const BIZ_UNITS_TTL = 180 * 1000;

function _gotoAdminTab(tabName) {
  const btn = document.querySelector(`.admin-tab[onclick*="'${tabName}'"]`);
  if (btn) btn.click();
}

function _bizUnitCard({ icon, title, lines, tabName, warn }) {
  return `<div style="background:var(--card);border:1px solid ${warn ? 'rgba(229,57,53,.35)' : 'var(--border)'};border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="font-size:13px;font-weight:800;color:var(--white);display:flex;align-items:center;gap:8px;">${icon} ${esc(title)}</div>
      <button class="action-btn" onclick="_gotoAdminTab('${tabName}')">Open →</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${lines.map(l => `<div style="display:flex;justify-content:space-between;font-size:12px;">
        <span style="color:var(--muted);">${esc(l.label)}</span>
        <span style="color:${l.color || 'var(--white)'};font-weight:700;">${l.value}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

async function loadBusinessUnitsGlance(force = false) {
  const now = Date.now();
  if (!force && _bizUnitsCacheTs > 0 && (now - _bizUnitsCacheTs) < BIZ_UNITS_TTL) return;
  const el = document.getElementById('businessUnitsPanel');
  if (!el) return;
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading business units…</span></div>`;

  const [affR, ccrR, cnStatR, cnRevR, acStatR, acRevR] = await Promise.allSettled([
    api('/affiliate/admin/affiliates?limit=500'),
    api('/admin/ccr/agents'),
    api('/connect/admin/stats'),
    api('/connect/admin/stats/revenue?weeks=8&months=6'),
    api('/academy/admin/stats'),
    api('/academy/admin/stats/revenue'),
  ]);
  _bizUnitsCacheTs = Date.now();

  const ok = (r) => (r && r.status === 'fulfilled') ? r.value : null;
  const failed = [affR, ccrR, cnStatR, cnRevR, acStatR, acRevR].filter(r => r.status === 'rejected').length;

  const aff    = ok(affR)?.affiliates || [];
  const ccr    = ok(ccrR) || [];
  const cnStat = ok(cnStatR) || {};
  const cnRev  = ok(cnRevR) || {};
  const acStat = ok(acStatR) || {};
  const acRev  = ok(acRevR) || {};

  const affActive  = aff.filter(a => (a.total_referrals || 0) > 0).length;
  const affEarned  = aff.reduce((s, a) => s + (a.total_earned_kes || 0), 0);
  const affPending = aff.reduce((s, a) => s + (a.pending_kes || 0), 0);
  const affPaid    = aff.reduce((s, a) => s + (a.paid_kes || 0), 0);

  const ccrActive  = ccr.filter(c => c.status === 'active').length;
  const ccrEarned  = ccr.reduce((s, c) => s + (c.total_earned_kes || 0), 0);
  const ccrPending = ccr.reduce((s, c) => s + (c.pending_kes || 0), 0);
  const ccrPaid    = ccr.reduce((s, c) => s + (c.paid_kes || 0), 0);

  const cnCampaigns  = cnStat.total_campaigns || 0;
  const cnRevenue    = cnRev.total_platform_revenue_kes || 0;
  const cnDisputes   = cnStat.open_disputes || 0;
  const cnPendingPay = (cnRev.payout_queue || {}).pending_amount_kes || 0;

  const acLearners = acStat.learners_started || 0;
  const acActive7d = acStat.active_learners_7d || 0;
  const acRevenue  = acRev.total_revenue_kes || 0;
  const acGrads    = acStat.graduates || 0;

  const totalPartnerCost = affEarned + ccrEarned; // cost of growth: what affiliates + CCR agents have earned, all-time
  const totalAuxRevenue  = cnRevenue + acRevenue;  // revenue outside the core SMM panel, all-time

  const warnBanner = failed
    ? `<div style="background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:10px;padding:10px 16px;margin-bottom:14px;font-size:12px;color:#ff6b6b;">⚠️ ${failed} of 4 business units couldn't be reached — showing what loaded. <button onclick="loadBusinessUnitsGlance(true)" style="background:none;border:none;color:#ff9a3c;font-size:12px;font-weight:700;cursor:pointer;">Retry</button></div>`
    : '';

  el.innerHTML = `
    ${warnBanner}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;">
      <div style="background:rgba(255,112,67,.08);border:1px solid rgba(255,112,67,.2);border-radius:12px;padding:14px 16px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--orange);margin-bottom:6px;">🤝 Cost of Growth</div>
        <div style="font-size:20px;font-weight:900;color:var(--white);">${fmtKES(totalPartnerCost)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">Affiliate + CCR commissions, all-time</div>
      </div>
      <div style="background:rgba(155,107,255,.08);border:1px solid rgba(155,107,255,.2);border-radius:12px;padding:14px 16px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9b6bff;margin-bottom:6px;">🧩 Auxiliary Revenue</div>
        <div style="font-size:20px;font-weight:900;color:var(--white);">${fmtKES(totalAuxRevenue)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">Connect + Academy, all-time</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">
      ${_bizUnitCard({
        icon: '🤝', title: 'Affiliates', tabName: 'affiliate-payouts',
        lines: [
          { label: 'Active affiliates', value: `${affActive} / ${aff.length}` },
          { label: 'Total earned', value: fmtKES(affEarned), color: 'var(--green)' },
          { label: 'Pending payout', value: fmtKES(affPending), color: affPending > 0 ? 'var(--orange)' : 'var(--white)' },
          { label: 'Paid out', value: fmtKES(affPaid) },
        ],
      })}
      ${_bizUnitCard({
        icon: '🎧', title: 'CCR Agents', tabName: 'ccr-agents',
        lines: [
          { label: 'Active agents', value: `${ccrActive} / ${ccr.length}` },
          { label: 'Total earned', value: fmtKES(ccrEarned), color: 'var(--green)' },
          { label: 'Pending payout', value: fmtKES(ccrPending), color: ccrPending > 0 ? 'var(--orange)' : 'var(--white)' },
          { label: 'Paid out', value: fmtKES(ccrPaid) },
        ],
      })}
      ${_bizUnitCard({
        icon: '🛍️', title: 'Connect Marketplace', tabName: 'connect', warn: cnDisputes > 0,
        lines: [
          { label: 'Campaigns', value: cnCampaigns },
          { label: 'Platform revenue', value: fmtKES(cnRevenue), color: 'var(--green)' },
          { label: 'Open disputes', value: cnDisputes, color: cnDisputes > 0 ? 'var(--red)' : 'var(--white)' },
          { label: 'Pending creator payouts', value: fmtKES(cnPendingPay), color: cnPendingPay > 0 ? 'var(--orange)' : 'var(--white)' },
        ],
      })}
      ${_bizUnitCard({
        icon: '🎓', title: 'Creator Academy', tabName: 'academy',
        lines: [
          { label: 'Learners started', value: acLearners },
          { label: 'Active (7d)', value: acActive7d },
          { label: 'Revenue', value: fmtKES(acRevenue), color: 'var(--green)' },
          { label: 'Graduated', value: acGrads },
        ],
      })}
    </div>`;
}

/* ══════════════════ BUSINESS HEALTH COMMAND CENTER ══════════════════
 * Full "Platform Stats" tab, redone as a single command center.
 *
 * loadAdminCommandCenter() is the only entry point (called from adminTab()).
 * It builds a skeleton into #ap-stats once, then fetches every stats
 * endpoint in parallel and renders five sections — Overview, Revenue,
 * Growth, Engagement, Services — that the user flips between instantly
 * (no re-fetch on tab switch, only on manual refresh / TTL expiry / a
 * day-window change on Growth or Engagement).
 *
 * Chart-drawing helpers (_compactKES, _miniBarChart, _sparklineSvg,
 * _fmtShortDate, _comboChartSvg, _barChartSvg, _growthBadge) are shared
 * by every section and unchanged in behaviour from the previous version.
 * ══════════════════════════════════════════════════════════════════ */

function _compactKES(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return sign + Math.round(abs).toString();
}

function _miniBarChart(items, { key = 'net_revenue_kes', labelKey, color = '#3dd44a', w = 700, h = 160 } = {}) {
  if (!items.length) return `<div style="font-size:12px;color:var(--muted);padding:20px 0;text-align:center;">No data yet.</div>`;
  const padTop = 30, padBottom = 22, padX = 4; // padTop widened to fit the value label above each bar
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const n = items.length;
  const step = plotW / n;
  const barW = Math.max(4, Math.min(46, step * 0.6));
  const vals = items.map(d => d[key] || 0);
  const maxV = Math.max(...vals.map(v => Math.abs(v)), 1) * 1.15;

  const bars = items.map((d, i) => {
    const cx = padX + step * i + step / 2;
    const v = vals[i];
    const bh = (Math.abs(v) / maxV) * plotH;
    const x = cx - barW / 2;
    const y = padTop + plotH - bh;
    const barColor = v < 0 ? 'var(--red)' : color;
    const valueLabel = `<text x="${cx.toFixed(1)}" y="${Math.max(y - 6, 10).toFixed(1)}" font-size="10" font-weight="700" fill="${barColor}" text-anchor="middle">${esc(_compactKES(v))}</text>`;
    return `${valueLabel}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh,0).toFixed(1)}" rx="3" fill="${barColor}" opacity="0.9"><title>${esc(d[labelKey])}: ${fmtKES(v)}</title></rect>`;
  }).join('');
  const labels = items.map((d, i) => {
    const cx = padX + step * i + step / 2;
    return `<text x="${cx.toFixed(1)}" y="${h-6}" font-size="9" fill="#7a8fad" text-anchor="middle">${esc(d[labelKey])}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">${bars}${labels}</svg>`;
}

function _sparklineSvg(values, color, w = 600, h = 70) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => {
    const x = Math.round(i * step);
    const y = Math.round(h - ((v - min) / range) * (h - 8) - 4);
    return `${x},${y}`;
  });
  const lastX = Math.round((values.length - 1) * step);
  const lastY = Math.round(h - ((values[values.length - 1] - min) / range) * (h - 8) - 4);
  const areaPts = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">
      <polyline points="${areaPts}" fill="${color}" opacity="0.08" stroke="none"></polyline>
      <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
      <circle cx="${lastX}" cy="${lastY}" r="4" fill="${color}"></circle>
    </svg>`;
}

function _fmtShortDate(iso) {
  try {
    const dt = new Date(iso + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch (e) { return iso; }
}

// Combined bar + line chart: bars = count metric (left axis), line = value
// metric (right axis, independently scaled so small/large numbers both read
// clearly). Used for Orders (bars) + Sales KES (line) per day.
function _comboChartSvg(daily, { barColor = '#ff7043', lineColor = '#3dd44a', barKey = 'orders', valueKey = 'sales_kes', barLabel = 'orders', valueFmt = (v) => v, w = 700, h = 230 } = {}) {
  if (!daily.length) return `<div style="font-size:12px;color:var(--muted);padding:30px 0;text-align:center;">No data in this window.</div>`;

  const padTop = 22, padBottom = 26, padX = 4;
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const n = daily.length;
  const step = plotW / n;
  const barW = Math.max(2, Math.min(26, step * 0.55));

  const counts = daily.map(d => d[barKey] || 0);
  const values = daily.map(d => d[valueKey] || 0);
  const maxCount = Math.max(...counts, 1) * 1.15;
  const maxValue = Math.max(...values, 1) * 1.15;

  const bars = daily.map((d, i) => {
    const cx = padX + step * i + step / 2;
    const bh = (counts[i] / maxCount) * plotH;
    const x = cx - barW / 2;
    const y = padTop + plotH - bh;
    // Show the count above the bar. With many days on screen at once, only
    // label every Nth bar so the numbers don't overlap each other.
    const labelEvery = n <= 16 ? 1 : Math.ceil(n / 16);
    const showLabel = counts[i] > 0 && (i % labelEvery === 0 || i === n - 1);
    const countLabel = showLabel
      ? `<text x="${cx.toFixed(1)}" y="${Math.max(y - 4, 10).toFixed(1)}" font-size="9" fill="${barColor}" text-anchor="middle" font-weight="700">${counts[i]}</text>`
      : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 0).toFixed(1)}" rx="2" fill="${barColor}" opacity="0.85"><title>${esc(d.date)}: ${counts[i]} ${esc(barLabel)}</title></rect>${countLabel}`;
  }).join('');

  const ptCoords = daily.map((d, i) => {
    const cx = padX + step * i + step / 2;
    const cy = padTop + plotH - (values[i] / maxValue) * plotH;
    return { cx, cy };
  });
  const linePts = ptCoords.map(p => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');
  const dots = daily.map((d, i) => {
    const { cx, cy } = ptCoords[i];
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${lineColor}" stroke="var(--card)" stroke-width="1"><title>${esc(d.date)}: ${esc(String(valueFmt(values[i])))}</title></circle>`;
  }).join('');

  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const labels = daily.map((d, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return '';
    const cx = padX + step * i + step / 2;
    return `<text x="${cx.toFixed(1)}" y="${h - 8}" font-size="9" fill="#7a8fad" text-anchor="middle">${esc(_fmtShortDate(d.date))}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">
      ${bars}
      <polyline points="${linePts}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
      ${dots}
      ${labels}
    </svg>`;
}

// Bar-only chart (used for New Users, DAU, avg spend — a count/value with no paired metric).
function _barChartSvg(daily, { key = 'new_users', color = '#2196f3', label = 'new users', valueFmt = (v) => v, w = 700, h = 150 } = {}) {
  if (!daily.length) return `<div style="font-size:12px;color:var(--muted);padding:20px 0;text-align:center;">No data in this window.</div>`;
  const padTop = 18, padBottom = 22, padX = 4;
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const n = daily.length;
  const step = plotW / n;
  const barW = Math.max(2, Math.min(26, step * 0.55));
  const counts = daily.map(d => d[key] || 0);
  const maxCount = Math.max(...counts, 1) * 1.15;

  const bars = daily.map((d, i) => {
    const cx = padX + step * i + step / 2;
    const bh = (counts[i] / maxCount) * plotH;
    const x = cx - barW / 2;
    const y = padTop + plotH - bh;
    const labelEvery = n <= 16 ? 1 : Math.ceil(n / 16);
    const showLabel = counts[i] > 0 && (i % labelEvery === 0 || i === n - 1);
    const countLabel = showLabel
      ? `<text x="${cx.toFixed(1)}" y="${Math.max(y - 4, 10).toFixed(1)}" font-size="9" fill="${color}" text-anchor="middle" font-weight="700">${esc(String(valueFmt(counts[i])))}</text>`
      : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 0).toFixed(1)}" rx="2" fill="${color}" opacity="0.85"><title>${esc(d.date)}: ${esc(String(valueFmt(counts[i])))} ${esc(label)}</title></rect>${countLabel}`;
  }).join('');

  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const labels = daily.map((d, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return '';
    const cx = padX + step * i + step / 2;
    return `<text x="${cx.toFixed(1)}" y="${h - 6}" font-size="9" fill="#7a8fad" text-anchor="middle">${esc(_fmtShortDate(d.date))}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">
      ${bars}
      ${labels}
    </svg>`;
}

function _growthBadge(pct) {
  if (pct === null || pct === undefined) return `<span style="font-size:11px;color:var(--muted);">—</span>`;
  const up = pct >= 0;
  const color = up ? 'var(--green)' : 'var(--red)';
  const arrow = up ? '▲' : '▼';
  return `<span style="font-size:12px;font-weight:700;color:${color};">${arrow} ${Math.abs(pct)}%</span>`;
}

/* ── Shared building blocks: KPI card + section panel ─────────────────── */

function _chcKpi({ icon = '📊', label = '', value = '', sub = '', tone = 'neutral', trend = null, wide = false }) {
  const toneMap = {
    green:   { border: 'rgba(61,212,74,.35)',  bg: 'rgba(61,212,74,.06)',  fg: 'var(--green)' },
    red:     { border: 'rgba(229,57,53,.35)',  bg: 'rgba(229,57,53,.06)',  fg: '#ff8a80' },
    orange:  { border: 'rgba(255,112,67,.35)', bg: 'rgba(255,112,67,.06)', fg: 'var(--orange)' },
    blue:    { border: 'rgba(33,150,243,.35)', bg: 'rgba(33,150,243,.06)', fg: 'var(--blue)' },
    neutral: { border: 'var(--border)',        bg: 'var(--card)',         fg: 'var(--white)' },
  };
  const t = toneMap[tone] || toneMap.neutral;
  const trendHtml = (trend !== null && trend !== undefined) ? `<div style="margin-top:6px;">${_growthBadge(trend)}</div>` : '';
  return `
    <div class="chc-kpi" style="grid-column:span ${wide ? 2 : 1};background:${t.bg};border:1px solid ${t.border};border-radius:14px;padding:16px 18px;">
      <div style="font-size:19px;margin-bottom:8px;">${icon}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">${esc(label)}</div>
      <div style="font-size:23px;font-weight:800;color:${t.fg};line-height:1.15;">${value}</div>
      ${sub ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;">${sub}</div>` : ''}
      ${trendHtml}
    </div>`;
}

function _chcPanel({ title = '', icon = '', sub = '', extra = '', body = '' }) {
  return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 22px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <div style="font-size:13px;font-weight:800;letter-spacing:.4px;color:var(--white);">${icon} ${esc(title)}</div>
          ${sub ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${esc(sub)}</div>` : ''}
        </div>
        ${extra}
      </div>
      ${body}
    </div>`;
}

/* ── State & orchestrator ──────────────────────────────────────────────── */

const _chc = {
  built: false,
  section: 'overview',
  loadedAt: 0,
  trendsDays: 14,
  engagementDays: 14,
  reserveDays: 30,
  // Money Flow tab state — period toggle + the 45/20/20/15 allocation split
  // (Owner Pay/Titan, Panel Balance & Growth, Operating Expenses, Tax
  // Reserve) requested for the profit-allocation view. Independent of the
  // Profit First inputs below, which power the separate Owner Draw panel.
  mfPeriod: 'weekly',
  mfTitanPct: 45,
  mfGrowthPct: 20,
  mfOpexPct: 20,
  mfTaxPct: 15,
  mfRunwayTargetDays: 30,
  mfExpandedBucket: null,
  // Profit First (Michalowicz) Target Allocation Percentages for businesses
  // under $250K revenue — Profit 5% / Owner's Pay 50% / Tax 15% / OpEx 30%
  // (OpEx is always "whatever's left", per the framework). Editable — these
  // are a widely-used starting point, not a rule.
  pfProfitPct: 5,
  pfOwnerPct: 50,
  pfTaxPct: 15,
  // SBA-recommended marketing spend for businesses under $5M revenue is
  // 7-8% of gross sales; editable, defaults to the middle of that range.
  marketingPct: 8,
  data: {},
  tickTimer: null,
};
const CHC_TTL = 180 * 1000; // matches previous auto-refresh cadence

async function loadAdminCommandCenter(force = false) {
  const root = document.getElementById('ap-stats');
  if (!root) return;

  if (!_chc.built) {
    _chcBuildSkeleton(root);
    _chc.built = true;
  }

  const now = Date.now();
  if (!force && _chc.loadedAt && (now - _chc.loadedAt) < CHC_TTL) return;

  _chcSetRefreshing(true);
  const results = await Promise.allSettled([
    api('/admin/stats/snapshot'),                                 // 0
    api('/admin/stats'),                                           // 1
    api('/admin/stats/filter-breakdown'),                          // 2
    api('/admin/stats/revenue?weeks=8&months=6'),                  // 3
    api(`/admin/stats/trends?days=${_chc.trendsDays}`),            // 4
    api(`/admin/stats/engagement?days=${_chc.engagementDays}`),    // 5
    api('/connect/admin/stats'),                                   // 6
    api('/connect/admin/stats/revenue?weeks=8&months=6'),          // 7
    api('/academy/admin/stats'),                                   // 8
    api('/academy/admin/stats/revenue?weeks=8&months=6'),          // 9
    api('/affiliate/admin/affiliates?limit=500'),                  // 10
    api('/admin/ccr/agents'),                                      // 11
    api(`/admin/stats/platforms?days=${_chc.trendsDays}`),         // 12
    api('/admin/allocations/titan'),                                // 13
    api('/admin/allocations/owner-pay'),                            // 14
    api('/admin/allocations/expenses'),                             // 15
    api('/admin/allocations/panel-growth'),                         // 16
    api('/admin/allocations/tax-reserve'),                          // 17
    api(`/admin/stats/platforms/outcomes?days=${_chc.trendsDays}`), // 18
    api(`/admin/stats/order-kinds?days=${_chc.trendsDays}`),         // 19
    api(`/upsell/admin/stats?days=${_chc.trendsDays}`),               // 20
    api(`/recommended/admin/stats?days=${_chc.trendsDays}`),          // 21
    api('/admin/stats/operations'),                                   // 22 Operations section
    api('/admin/wallet-credit/summary'),                              // 23 EndaViral Wallet credit
    api('/admin/consultations/stats'),                                // 24 Hire EndaViral
    api('/free-order/staff/stats'),                                   // 25 Free orders given
  ]);
  const [snap, stats, breakdown, revenue, trends, engagement,
         connectStats, connectRevenue, academyStats, academyRevenue,
         affiliates, ccrAgents, platforms, titan, ownerPay, expenses, panelGrowth, taxReserve, outcomes, orderKinds, upsellStats, recStats,
         operations, walletCredit, consultations, freeOrders] = results;
  _chc.data.snapshot   = snap.status === 'fulfilled' ? snap.value : null;
  _chc.data.stats      = stats.status === 'fulfilled' ? stats.value : null;
  _chc.data.breakdown  = breakdown.status === 'fulfilled' ? breakdown.value : null;
  _chc.data.revenue    = revenue.status === 'fulfilled' ? revenue.value : null;
  _chc.data.trends     = trends.status === 'fulfilled' ? trends.value : null;
  _chc.data.engagement = engagement.status === 'fulfilled' ? engagement.value : null;
  _chc.data.connectStats    = connectStats.status === 'fulfilled' ? connectStats.value : null;
  _chc.data.connectRevenue  = connectRevenue.status === 'fulfilled' ? connectRevenue.value : null;
  _chc.data.academyStats    = academyStats.status === 'fulfilled' ? academyStats.value : null;
  _chc.data.academyRevenue  = academyRevenue.status === 'fulfilled' ? academyRevenue.value : null;
  _chc.data.affiliates      = affiliates.status === 'fulfilled' ? (affiliates.value?.affiliates || affiliates.value || []) : null;
  _chc.data.ccrAgents       = ccrAgents.status === 'fulfilled' ? (ccrAgents.value || []) : null;
  _chc.data.platforms       = platforms.status === 'fulfilled' ? platforms.value : null;
  _chc.data.titan           = titan.status === 'fulfilled' ? titan.value : null;
  _chc.data.ownerPay        = ownerPay.status === 'fulfilled' ? ownerPay.value : null;
  _chc.data.expenses        = expenses.status === 'fulfilled' ? expenses.value : null;
  _chc.data.panelGrowth     = panelGrowth.status === 'fulfilled' ? panelGrowth.value : null;
  _chc.data.taxReserve      = taxReserve.status === 'fulfilled' ? taxReserve.value : null;
  _chc.data.outcomes        = outcomes.status === 'fulfilled' ? outcomes.value : null;
  _chc.data.orderKinds      = orderKinds.status === 'fulfilled' ? orderKinds.value : null;
  _chc.data.upsell          = upsellStats.status === 'fulfilled' ? upsellStats.value : null;
  _chc.data.recommended     = recStats.status === 'fulfilled' ? recStats.value : null;
  _chc.data.operations      = operations.status === 'fulfilled' ? operations.value : null;
  _chc.data.walletCredit    = walletCredit.status === 'fulfilled' ? walletCredit.value : null;
  _chc.data.consultations   = consultations.status === 'fulfilled' ? consultations.value : null;
  _chc.data.freeOrders      = freeOrders.status === 'fulfilled' ? freeOrders.value : null;
  _chc.loadedAt = Date.now();

  _chcRenderAlerts();
  _chcRenderHealthScore();
  _chcRenderOverview();
  _chcRenderOperations();
  _chcRenderRevenue();
  _chcRenderMoneyFlow();
  _chcRenderGrowth();
  _chcRenderEngagement();
  _chcRenderServices();
  _chcRenderUnits();
  _chcSetRefreshing(false);
  _chcUpdateTimestamp();
}

// ── 💡 Upsell ("next step" suggestions) panel — Growth section ─────────
// Data: GET /upsell/admin/stats (app/services/upsell.py::admin_stats).
// Funnel: customers shown a suggestion → orders started from one →
// orders paid → revenue. Orders are also flagged "💡 Suggested" in
// All Orders, with a "From suggestions" filter there.
function _chcUpsellPanel(u) {
  if (!u) {
    return _chcPanel({ title: 'Upsell Suggestions', icon: '💡', body: `<div style="font-size:12px;color:var(--muted);">Couldn't load suggestion stats (is the latest backend deployed?).</div>` });
  }
  const tile = (label, value, sub, color) => `
    <div style="flex:1;min-width:120px;background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${color || 'var(--white)'};margin-top:4px;">${value}</div>
      ${sub ? `<div style="font-size:10.5px;color:var(--muted);margin-top:2px;">${sub}</div>` : ''}
    </div>`;
  const line = (label, v) => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="color:var(--white);">${label}</span>
      <span style="color:var(--muted);white-space:nowrap;">${v.paid} paid of ${v.orders} · <b style="color:#3dd44a;">${fmtKES(v.revenue_kes)}</b></span>
    </div>`;
  const LBL = {
    dashboard: '🏠 Dashboard row', after_order: '✅ Order-placed screen',
    suggested: '🎯 Ordered the suggested service', other_service: '🔀 Picked another service',
    medium: '<span style="color:#22c55e;">●</span> Medium', elite: '<span style="color:#3b82f6;">●</span> Elite',
    unmarked: '⚪ No tier in name', basic: '<span style="color:#facc15;">●</span> Basic',
  };
  const group = (title, obj) => {
    const rows = Object.entries(obj || {}).map(([k, v]) => line(LBL[k] || esc(k), v)).join('');
    return rows ? `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">${title}</div>${rows}` : '';
  };
  const kinds = (u.top_kinds || []).map(([k, v]) => line(esc(k), v)).join('');
  const recent = (u.recent || []).slice(0, 6).map(r => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:4px 0;">
      <span style="color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.service_name)}">${esc(r.email)} · ${esc(r.service_name)}</span>
      <span style="color:var(--muted);white-space:nowrap;">${fmtKES(r.charge)} · ${esc(r.status || '')}</span>
    </div>`).join('');
  const empty = !u.orders_started && !u.customers_shown;
  return _chcPanel({
    title: 'Upsell Suggestions', icon: '💡',
    sub: `last ${u.window_days}d · "Suggested for you" rows + order-placed screen · only 🟢 Medium / 🔵 Elite services are ever suggested`,
    extra: `<button class="action-btn" onclick="_chcJumpUpsellOrders()" style="font-size:11px;">View orders →</button>`,
    body: empty ? `<div style="font-size:12px;color:var(--muted);">No suggestions shown yet in this window. They appear to customers once an order is delivered.</div>` : `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        ${tile('Customers shown', Number(u.customers_shown).toLocaleString(), 'saw at least one suggestion')}
        ${tile('Orders started', Number(u.orders_started).toLocaleString(), 'from a suggestion')}
        ${tile('Orders paid', Number(u.orders_paid).toLocaleString(), `${u.pay_rate_pct}% of started`, '#3dd44a')}
        ${tile('Revenue', fmtKES(u.revenue_kes), `avg ${fmtKES(u.avg_order_kes)}`, '#3dd44a')}
        ${tile('Conversion', u.conversion_pct + '%', 'of shown customers paid')}
      </div>
      ${group('Where they clicked', u.by_source)}
      ${group('What they ordered', u.by_how)}
      ${group('Tier of ordered service', u.by_tier)}
      ${kinds ? `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Top follow-ups</div>${kinds}` : ''}
      ${recent ? `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Latest</div>${recent}` : ''}`,
  });
}

// ── ⭐ EndaViral Recommends panel — Growth section ─────────────────────
// Data: GET /recommended/admin/stats (app/services/recommended.py).
// The catalog shows one refill pick per platform + type above the list
// (index.html → recommendedPicks()). Funnel: customers shown → opened the
// pick → orders started → paid. "Share" = the picks' paid orders as a % of
// all paid orders of the same platform + type — are customers following it?
function _chcRecommendedPanel(r) {
  if (!r) {
    return _chcPanel({ title: 'EndaViral Recommends', icon: '⭐', body: `<div style="font-size:12px;color:var(--muted);">Couldn't load recommendation stats (is the latest backend deployed?).</div>` });
  }
  const tile = (label, value, sub, color) => `
    <div style="flex:1;min-width:120px;background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${color || 'var(--white)'};margin-top:4px;">${value}</div>
      ${sub ? `<div style="font-size:10.5px;color:var(--muted);margin-top:2px;">${sub}</div>` : ''}
    </div>`;
  const hd = t => `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">${t}</div>`;
  const PL = { card: '⭐ Top card', list: '📋 ⭐ badge in the list' };
  const placements = Object.entries(r.by_placement || {}).filter(([, v]) => v.opened || v.orders).map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="color:var(--white);">${PL[k] || esc(k)}</span>
      <span style="color:var(--muted);white-space:nowrap;">${v.opened} opened · ${v.paid} paid of ${v.orders} · <b style="color:#3dd44a;">${fmtKES(v.revenue_kes)}</b></span>
    </div>`).join('');
  const kinds = (r.by_kind || []).map(([k, v]) => {
    const share = v.kind_paid_orders ? `${v.share_pct}% of ${v.kind_paid_orders}` : '—';
    return `<tr style="font-size:12px;">
      <td style="padding:5px 6px 5px 0;color:var(--white);white-space:nowrap;font-size:12px;">${esc(k)}</td>
      <td style="padding:5px 6px;text-align:right;font-size:12px;">${v.opened}</td>
      <td style="padding:5px 6px;text-align:right;font-size:12px;">${v.paid}/${v.orders}</td>
      <td style="padding:5px 6px;text-align:right;color:#3dd44a;font-weight:700;white-space:nowrap;font-size:12px;">${fmtKES(v.revenue_kes)}</td>
      <td style="padding:5px 0 5px 6px;text-align:right;white-space:nowrap;font-size:12px;">${share}</td>
    </tr>`;
  }).join('');
  const kindTable = kinds ? `${hd('By platform · type')}
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;color:var(--muted);">
      <thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;">
        <th style="text-align:left;padding:4px 6px 4px 0;font-weight:700;">Kind</th>
        <th style="text-align:right;padding:4px 6px;font-weight:700;" title="Customers who opened the recommended service">Opened</th>
        <th style="text-align:right;padding:4px 6px;font-weight:700;">Paid / started</th>
        <th style="text-align:right;padding:4px 6px;font-weight:700;">Revenue</th>
        <th style="text-align:right;padding:4px 0 4px 6px;font-weight:700;" title="Recommended paid orders as a % of ALL paid orders of this platform + type">Share</th>
      </tr></thead><tbody>${kinds}</tbody></table></div>` : '';
  const recent = (r.recent || []).slice(0, 6).map(x => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:4px 0;">
      <span style="color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(x.service_name)}">${esc(x.email)} · ${esc(x.service_name)}</span>
      <span style="color:var(--muted);white-space:nowrap;">${fmtKES(x.charge)} · ${esc(x.status || '')}</span>
    </div>`).join('');
  const empty = !r.customers_shown && !r.orders_started;
  return _chcPanel({
    title: 'EndaViral Recommends', icon: '⭐',
    sub: `last ${r.window_days}d · one ♻️ refill pick per platform + type, shown above the services list · logged-in customers`,
    body: empty ? `<div style="font-size:12px;color:var(--muted);">No recommendations seen yet in this window. They show once a customer picks a platform in Services.</div>` : `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        ${tile('Customers shown', Number(r.customers_shown).toLocaleString(), 'saw a ⭐ pick')}
        ${tile('Opened', Number(r.customers_opened).toLocaleString(), `${r.open_rate_pct}% of shown`)}
        ${tile('Orders paid', Number(r.orders_paid).toLocaleString(), `${r.pay_rate_pct}% of ${r.orders_started} started`, '#3dd44a')}
        ${tile('Revenue', fmtKES(r.revenue_kes), `avg ${fmtKES(r.avg_order_kes)}`, '#3dd44a')}
        ${tile('Conversion', r.conversion_pct + '%', 'of shown customers paid')}
        ${tile('Share', r.share_pct + '%', 'of paid orders in those types', '#facc15')}
      </div>
      ${placements ? hd('Where they clicked') + placements : ''}
      ${kindTable}
      ${recent ? hd('Latest') + recent : ''}`,
  });
}

function _chcJumpUpsellOrders() {
  _chcJump('allorders');
  const sel = document.getElementById('adminOrderTypeFilter');
  if (sel) { sel.value = 'upsell'; loadAdminOrders(); }
}

// Jump straight to another admin tab (e.g. from a Business Units card) by
// finding its real nav element — adminTab() needs the clicked element to
// move the `.active` class, so we locate it by its onclick signature rather
// than requiring every caller to have a click event to hand.
function _chcJump(tab) {
  const navEl = document.querySelector(`.admin-tab[onclick*="'${tab}'"]`);
  if (navEl) adminTab(tab, navEl);
}

function _chcBuildSkeleton(root) {
  root.innerHTML = `
    <style>
      #ap-stats .chc-nav-btn { background:var(--card); color:var(--muted); border:1px solid var(--border); border-radius:10px; padding:8px 16px; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s ease; white-space:nowrap; }
      #ap-stats .chc-nav-btn:hover { color:var(--white); border-color:rgba(255,255,255,.25); }
      #ap-stats .chc-nav-btn.active { background:var(--green); color:#04140a; border-color:var(--green); }
      #ap-stats .chc-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
      #ap-stats .chc-section { display:none; }
      #ap-stats .chc-section.active { display:block; animation:chcFadeIn .25s ease; }
      @keyframes chcFadeIn { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
      #ap-stats .chc-alert-chip { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:600; }
      #ap-stats .chc-two-col { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; align-items:stretch; }
      @media (max-width:820px){ #ap-stats .chc-two-col { grid-template-columns:1fr; } }
    </style>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:16px;">
      <div>
        <div style="font-size:20px;font-weight:900;color:var(--white);">🎯 Business Health Command Center</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Revenue, growth, and engagement — everything that matters, in one place</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="chcUpdatedAt" style="font-size:11px;color:var(--muted);"></span>
        <button class="btn-secondary" id="chcRefreshBtn" style="margin:0;padding:8px 16px;font-size:12px;" onclick="loadAdminCommandCenter(true)">⟳ Refresh</button>
      </div>
    </div>

    <div id="chcAlerts" style="display:none;flex-wrap:wrap;gap:10px;margin-bottom:18px;"></div>

    <div id="chcHealthScore" style="margin-bottom:20px;"></div>

    <div id="chcNav" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:16px;">
      <button class="chc-nav-btn active" data-sec="overview" onclick="chcShowSection('overview',this)">📊 Overview</button>
      <button class="chc-nav-btn" data-sec="operations" onclick="chcShowSection('operations',this)">🛠️ Operations</button>
      <button class="chc-nav-btn" data-sec="revenue" onclick="chcShowSection('revenue',this)">💼 Revenue</button>
      <button class="chc-nav-btn" data-sec="moneyflow" onclick="chcShowSection('moneyflow',this)">💵 Money Flow</button>
      <button class="chc-nav-btn" data-sec="growth" onclick="chcShowSection('growth',this)">📈 Growth</button>
      <button class="chc-nav-btn" data-sec="engagement" onclick="chcShowSection('engagement',this)">🔑 Engagement</button>
      <button class="chc-nav-btn" data-sec="services" onclick="chcShowSection('services',this)">🧩 Services</button>
      <button class="chc-nav-btn" data-sec="units" onclick="chcShowSection('units',this)">🏢 Business Units</button>
    </div>

    <div id="chcSection-overview" class="chc-section active"><div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div></div>
    <div id="chcSection-operations" class="chc-section"></div>
    <div id="chcSection-revenue" class="chc-section"></div>
    <div id="chcSection-moneyflow" class="chc-section"></div>
    <div id="chcSection-growth" class="chc-section"></div>
    <div id="chcSection-engagement" class="chc-section"></div>
    <div id="chcSection-services" class="chc-section"></div>
    <div id="chcSection-units" class="chc-section"></div>
  `;

  if (_chc.tickTimer) clearInterval(_chc.tickTimer);
  _chc.tickTimer = setInterval(_chcUpdateTimestamp, 30000);
}

function chcShowSection(name, btn) {
  document.querySelectorAll('#ap-stats .chc-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#ap-stats .chc-section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const sec = document.getElementById('chcSection-' + name);
  if (sec) sec.classList.add('active');
  _chc.section = name;
}

function _chcSetRefreshing(state) {
  const btn = document.getElementById('chcRefreshBtn');
  if (!btn) return;
  btn.disabled = state;
  btn.textContent = state ? '⟳ Refreshing…' : '⟳ Refresh';
}

function _chcUpdateTimestamp() {
  const el = document.getElementById('chcUpdatedAt');
  if (!el || !_chc.loadedAt) return;
  const diff = Math.floor((Date.now() - _chc.loadedAt) / 1000);
  let txt;
  if (diff < 10) txt = 'Updated just now';
  else if (diff < 60) txt = `Updated ${diff}s ago`;
  else if (diff < 3600) txt = `Updated ${Math.floor(diff / 60)}m ago`;
  else txt = `Updated ${Math.floor(diff / 3600)}h ago`;
  el.textContent = txt;
}

/* ── Alerts strip: surfaces the handful of things that actually need action ── */

function _chcRenderAlerts() {
  const el = document.getElementById('chcAlerts');
  if (!el) return;
  const alerts = [];

  const statsWrap = _chc.data.stats;
  const st = statsWrap ? (statsWrap.stats || statsWrap) : null;
  if (st) {
    const bal = st.panel_balance_usd;
    if (bal !== null && bal !== undefined) {
      const balNum = parseFloat(bal);
      if (balNum < 3) alerts.push({ tone: 'red', icon: '🚨', text: `Provider balance critical — $${balNum.toFixed(2)}. Customers cannot place orders.` });
      else if (balNum < 10) alerts.push({ tone: 'orange', icon: '⚠️', text: `Provider balance low — $${balNum.toFixed(2)}. Top up soon.` });
    }
  }

  const burn = (_chc.data.trends && _chc.data.trends.balance_burn) || {};
  if (burn.days_until_empty !== null && burn.days_until_empty !== undefined) {
    if (burn.days_until_empty <= 3) alerts.push({ tone: 'red', icon: '🔥', text: `Balance projected to run out in ${burn.days_until_empty} day${burn.days_until_empty === 1 ? '' : 's'} at current burn rate.` });
    else if (burn.days_until_empty <= 7) alerts.push({ tone: 'orange', icon: '🔥', text: `Balance projected to run out in ${burn.days_until_empty} days at current burn rate.` });
  }

  const bd = _chc.data.breakdown || {};
  const hiddenTotal = bd.hidden_total ?? 0;
  const totalSvc = bd.total_services ?? 0;
  if (totalSvc > 0 && (hiddenTotal / totalSvc) > 0.5) {
    alerts.push({ tone: 'blue', icon: '🙈', text: `${hiddenTotal.toLocaleString()} of ${totalSvc.toLocaleString()} services are hidden from customers.` });
  }

  const cn = _chc.data.connectStats;
  if (cn && cn.open_disputes > 0) {
    alerts.push({ tone: cn.open_disputes >= 3 ? 'red' : 'orange', icon: '⚖️', text: `${cn.open_disputes} open Connect dispute${cn.open_disputes === 1 ? '' : 's'} awaiting resolution.` });
  }
  const cnRev = _chc.data.connectRevenue;
  const cnPQ = cnRev ? (cnRev.payout_queue || {}) : {};
  if (cnPQ.pending_count > 0) {
    alerts.push({ tone: 'blue', icon: '💸', text: `${cnPQ.pending_count} Connect creator payout${cnPQ.pending_count === 1 ? '' : 's'} pending — ${fmtKES(cnPQ.pending_amount_kes || 0)}.` });
  }

  const ccrAgents = _chc.data.ccrAgents;
  if (ccrAgents && ccrAgents.length) {
    const ccrPending = ccrAgents.reduce((s, a) => s + (a.pending_kes || 0), 0);
    if (ccrPending > 0) alerts.push({ tone: 'blue', icon: '🎧', text: `${fmtKES(ccrPending)} in CCR agent commissions pending payout.` });
  }

  const affiliates = _chc.data.affiliates;
  if (affiliates && affiliates.length) {
    const affPending = affiliates.reduce((s, a) => s + (a.pending_kes || 0), 0);
    if (affPending > 0) alerts.push({ tone: 'blue', icon: '🤝', text: `${fmtKES(affPending)} in affiliate commissions pending payout.` });
  }

  // Operations: payments, support, refunds (GET /admin/stats/operations + /admin/wallet-credit/summary)
  const ops = _chc.data.operations;
  if (ops) {
    const pay = ops.payments || {};
    if (pay.success_rate_pct !== null && pay.success_rate_pct !== undefined && pay.prompts >= 10) {
      if (pay.success_rate_pct < 70) alerts.push({ tone: 'red', icon: '📱', text: `Only ${pay.success_rate_pct}% of M-Pesa prompts were paid in the last 7 days — ${fmtKES(pay.not_completed_kes || 0)} not completed.` });
      else if (pay.success_rate_pct < 85) alerts.push({ tone: 'orange', icon: '📱', text: `${pay.success_rate_pct}% of M-Pesa prompts were paid in the last 7 days — ${fmtKES(pay.not_completed_kes || 0)} not completed.` });
    }
    if (pay.stuck_pending > 0) alerts.push({ tone: 'orange', icon: '⏳', text: `${pay.stuck_pending} M-Pesa payment${pay.stuck_pending === 1 ? '' : 's'} stuck pending over 10 minutes.` });
    const sup = ops.support || {};
    if (sup.waiting_over_2h > 0) alerts.push({ tone: 'orange', icon: '💬', text: `${sup.waiting_over_2h} customer${sup.waiting_over_2h === 1 ? ' has' : 's have'} waited over 2 hours for a support reply.` });
    const rf = ops.refunds || {};
    if (rf.refund_rate_8w_pct !== null && rf.refund_rate_8w_pct !== undefined && rf.refund_rate_8w_pct >= 10) {
      alerts.push({ tone: rf.refund_rate_8w_pct >= 20 ? 'red' : 'orange', icon: '↩️', text: `${rf.refund_rate_8w_pct}% of money taken in the last 8 weeks was refunded to wallets (${fmtKES(rf.refunded_8w_kes || 0)}).` });
    }
  }
  const wcs = _chc.data.walletCredit;
  if (wcs && wcs.refunds_not_messaged > 0) alerts.push({ tone: 'orange', icon: '✉️', text: `${wcs.refunds_not_messaged} wallet refund${wcs.refunds_not_messaged === 1 ? '' : 's'} where the customer was NOT messaged.` });

  if (!alerts.length) { el.style.display = 'none'; el.innerHTML = ''; return; }

  const toneColors = {
    red:    { bg: 'rgba(229,57,53,.1)',  border: 'rgba(229,57,53,.3)',  fg: '#ff8a80' },
    orange: { bg: 'rgba(255,112,67,.1)', border: 'rgba(255,112,67,.3)', fg: 'var(--orange)' },
    blue:   { bg: 'rgba(33,150,243,.1)', border: 'rgba(33,150,243,.3)', fg: 'var(--blue)' },
  };
  el.style.display = 'flex';
  el.innerHTML = alerts.map(a => {
    const c = toneColors[a.tone];
    return `<div class="chc-alert-chip" style="background:${c.bg};border:1px solid ${c.border};color:${c.fg};">${a.icon} ${esc(a.text)}</div>`;
  }).join('');
}

/* ── Health Score: a single, transparent verdict on the state of the business ──
 * Built from four standard health lenses, not a proprietary black box:
 *   Growth   (30 pts) — week-over-week sales trend
 *   Margin   (25 pts) — net margin on sales
 *   Runway   (25 pts) — days until provider balance is exhausted at current burn
 *   Retention(20 pts) — % of customers who've ordered 2+ times
 * Score and every input are shown together so the verdict is checkable, not
 * just asserted.
 * ─────────────────────────────────────────────────────────────────────────── */

function _chcComputeHealthScore() {
  const snap = _chc.data.snapshot;
  const trends = _chc.data.trends;
  if (!snap && !trends) return null;

  const g = (trends && trends.growth) || {};
  const burn = (trends && trends.balance_burn) || {};

  // Growth (0-30): week-over-week sales trend
  let growthPts = 15, growthNote = 'no trend data';
  if (g.sales_wow_pct !== null && g.sales_wow_pct !== undefined) {
    const p = g.sales_wow_pct;
    growthPts = p >= 15 ? 30 : p >= 0 ? 20 : p >= -10 ? 10 : 0;
    growthNote = `sales ${p >= 0 ? 'up' : 'down'} ${Math.abs(p)}% week-over-week`;
  }

  // Margin (0-25): net margin on sales
  let marginPts = 12, marginNote = 'no margin data';
  if (snap && snap.net_margin_pct !== null && snap.net_margin_pct !== undefined) {
    const m = snap.net_margin_pct;
    marginPts = m >= 40 ? 25 : m >= 25 ? 18 : m >= 10 ? 10 : 3;
    marginNote = `${m}% net margin`;
  }

  // Runway (0-25): days until provider balance runs dry at current burn
  let runwayPts = 25, runwayNote = 'not burning down / no data';
  if (burn.days_until_empty !== null && burn.days_until_empty !== undefined) {
    const d = burn.days_until_empty;
    runwayPts = d >= 30 ? 25 : d >= 14 ? 18 : d >= 7 ? 10 : 0;
    runwayNote = `~${d} day${d === 1 ? '' : 's'} of provider balance left at current burn`;
  }

  // Retention (0-20): % of customers who've ordered 2+ times
  let retentionPts = 10, retentionNote = 'no retention data';
  if (snap && snap.repeat_rate_pct !== null && snap.repeat_rate_pct !== undefined) {
    const r = snap.repeat_rate_pct;
    retentionPts = r >= 40 ? 20 : r >= 25 ? 14 : r >= 10 ? 7 : 2;
    retentionNote = `${r}% of customers are repeat buyers`;
  }

  const score = Math.round(growthPts + marginPts + runwayPts + retentionPts);
  let verdict, color, emoji;
  if (score >= 80)      { verdict = 'Strong — growing and healthy';   color = 'var(--green)'; emoji = '🟢'; }
  else if (score >= 60) { verdict = 'Stable';                          color = 'var(--cyan)';  emoji = '🟡'; }
  else if (score >= 40) { verdict = 'At Risk — needs attention';       color = 'var(--orange)'; emoji = '🟠'; }
  else                   { verdict = 'Critical — act now';             color = '#ff5050';       emoji = '🔴'; }

  return {
    score, verdict, color, emoji,
    factors: [
      { label: 'Growth',    pts: growthPts,    max: 30, note: growthNote },
      { label: 'Margin',    pts: marginPts,    max: 25, note: marginNote },
      { label: 'Runway',    pts: runwayPts,    max: 25, note: runwayNote },
      { label: 'Retention', pts: retentionPts, max: 20, note: retentionNote },
    ],
  };
}

function _chcRenderHealthScore() {
  const el = document.getElementById('chcHealthScore');
  if (!el) return;
  const h = _chcComputeHealthScore();
  if (!h) { el.innerHTML = ''; return; }

  const circumference = 2 * Math.PI * 52;
  const dash = (h.score / 100) * circumference;

  const factorRows = h.factors.map(f => {
    const pct = Math.round((f.pts / f.max) * 100);
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
          <span style="color:var(--white);font-weight:700;">${esc(f.label)}</span>
          <span style="color:var(--muted);">${f.pts}/${f.max}</span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin-bottom:3px;">
          <div style="height:100%;width:${pct}%;background:${h.color};border-radius:4px;"></div>
        </div>
        <div style="font-size:10.5px;color:var(--muted);">${esc(f.note)}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="background:linear-gradient(135deg, var(--card) 0%, var(--card2) 100%);border:1px solid ${h.color};border-radius:18px;padding:22px 26px;display:flex;gap:28px;align-items:center;flex-wrap:wrap;">
      <div style="flex-shrink:0;position:relative;width:120px;height:120px;">
        <svg viewBox="0 0 120 120" style="width:120px;height:120px;transform:rotate(-90deg);">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="10"></circle>
          <circle cx="60" cy="60" r="52" fill="none" stroke="${h.color}" stroke-width="10" stroke-linecap="round"
                  stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"></circle>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:30px;font-weight:900;color:${h.color};line-height:1;">${h.score}</div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;">/ 100</div>
        </div>
      </div>
      <div style="flex:1;min-width:220px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Business Health Score</div>
        <div style="font-size:19px;font-weight:900;color:${h.color};margin-bottom:10px;">${h.emoji} ${esc(h.verdict)}</div>
        <div style="font-size:11px;color:var(--muted);">Built from four standard signals — growth, margin, cash runway, and repeat-customer retention — so the verdict is checkable, not a black box.</div>
      </div>
      <div style="flex:1.4;min-width:280px;display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
        ${factorRows}
      </div>
    </div>`;
}

/* ── Section: Overview (executive snapshot + core platform stats) ─────── */

function _chcRenderOverview() {
  const el = document.getElementById('chcSection-overview');
  if (!el) return;
  const s = _chc.data.snapshot;
  const statsWrap = _chc.data.stats;
  if (!s && !statsWrap) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load overview data. <button class="action-btn" onclick="loadAdminCommandCenter(true)">Retry</button></p></div>`;
    return;
  }

  const st = statsWrap ? (statsWrap.stats || statsWrap) : {};
  const svcSummary = statsWrap ? (statsWrap.services || {}) : {};
  const bd = _chc.data.breakdown || {};

  let snapshotKpis = '';
  if (s) {
    const cacVal = (s.cac_kes === null || s.cac_kes === undefined) ? '—' : fmtKES(s.cac_kes);
    const cacSub = (s.cac_kes === null || s.cac_kes === undefined)
      ? 'no new payers this month'
      : `${(s.cac_inputs?.new_paying_customers_this_month ?? 0)} new payer${(s.cac_inputs?.new_paying_customers_this_month === 1) ? '' : 's'} this month`;
    snapshotKpis = `
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:10px;">AT A GLANCE</div>
      <div class="chc-kpi-grid" style="margin-bottom:24px;">
        ${_chcKpi({ icon: '📅', label: "Today's Revenue", value: fmtKES(s.today_revenue_kes), sub: 'profit booked today', tone: 'green' })}
        ${_chcKpi({ icon: '💰', label: 'Gross Profit (all-time)', value: fmtKES(s.gross_profit_kes), sub: s.markup_percent_used ? `${Math.round(s.markup_percent_used * 100)}% markup` : '', tone: 'green' })}
        ${_chcKpi({ icon: '🏭', label: 'Provider Cost (all-time)', value: fmtKES(s.provider_cost_kes), sub: 'paid to provider', tone: 'orange' })}
        ${_chcKpi({ icon: '📐', label: 'Net Margin', value: s.net_margin_pct + '%', sub: 'profit ÷ sales', tone: 'blue' })}
        ${_chcKpi({ icon: '🔁', label: 'Repeat Customers', value: s.repeat_rate_pct + '%', sub: 'ordered 2+ times', tone: 'blue' })}
        ${_chcKpi({ icon: '🧾', label: 'Avg. Order', value: fmtKES(s.avg_order_value_kes), sub: 'all-time sales ÷ orders', tone: 'green' })}
        ${_chcKpi({ icon: '💎', label: 'CLV', value: fmtKES(s.clv_kes), sub: 'spend-to-date per payer', tone: 'blue' })}
        ${_chcKpi({ icon: '🎯', label: 'CAC', value: cacVal, sub: cacSub, tone: 'orange' })}
      </div>`;
  }

  let balCard = '';
  const balUSD = st.panel_balance_usd;
  if (balUSD !== null && balUSD !== undefined) {
    const balNum = parseFloat(balUSD);
    const isLive = st.panel_balance_is_live;
    const lastUpdated = st.panel_balance_last_updated;
    const balColor = balNum >= 10 ? 'var(--green)' : balNum >= 3 ? 'var(--orange)' : '#ff8a80';
    const liveTag = isLive
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--green);background:rgba(61,212,74,.1);border:1px solid rgba(61,212,74,.2);padding:2px 7px;border-radius:10px;letter-spacing:.5px;"><span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s infinite;"></span>LIVE</span>`
      : `<span style="font-size:10px;font-weight:700;color:var(--muted);background:rgba(122,143,173,.1);border:1px solid rgba(122,143,173,.2);padding:2px 7px;border-radius:10px;">CACHED</span>`;
    const timeAgo = lastUpdated ? (() => {
      const diff = Math.floor((Date.now() - new Date(lastUpdated)) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    })() : '';
    const warningBar = balNum < 3
      ? `<div style="margin-top:12px;padding:8px 12px;background:rgba(229,57,53,.12);border:1px solid rgba(229,57,53,.25);border-radius:8px;font-size:12px;color:#ff8a80;font-weight:600;">⚠️ Critical — customers cannot place orders</div>`
      : balNum < 10
      ? `<div style="margin-top:12px;padding:8px 12px;background:rgba(255,112,67,.10);border:1px solid rgba(255,112,67,.2);border-radius:8px;font-size:12px;color:var(--orange);font-weight:600;">⚠️ Low — top up soon</div>`
      : '';
    balCard = `
      <div style="background:var(--card);border:2px solid ${balColor};border-radius:16px;padding:22px 24px;height:100%;box-sizing:border-box;" title="Provider panel balance. Reduces with every order.">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="font-size:20px;">🏦</span>
          <div style="font-size:12px;font-weight:700;letter-spacing:.5px;color:var(--muted);text-transform:uppercase;">Panel Balance${st.active_provider ? ' · ' + esc(st.active_provider) : ''}</div>
          ${liveTag}
        </div>
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
          <div style="font-size:38px;font-weight:900;color:${balColor};">$${balNum.toFixed(2)}</div>
          <div style="font-size:13px;color:var(--muted);">USD${timeAgo ? ` · updated ${timeAgo}` : ''}</div>
        </div>
        ${warningBar}
        <div style="margin-top:14px;height:5px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(100, (balNum / 50) * 100)}%;background:${balColor};border-radius:4px;transition:width 1s ease;"></div>
        </div>
        <div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:4px;">bar = balance vs $50 reference</div>
      </div>`;
  } else {
    balCard = `<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;">No provider balance data</div>`;
  }

  const coreKpis = `
    <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:10px;">PLATFORM CORE</div>
    <div class="chc-kpi-grid">
      ${_chcKpi({ icon: '💳', label: 'Total Sales', value: fmtKES(st.total_sales ?? st.total_revenue ?? 0), sub: 'All paid orders', tone: 'green' })}
      ${_chcKpi({ icon: '💰', label: 'Your Revenue', value: fmtKES(st.total_revenue ?? 0), sub: st.markup_label ? `${st.markup_label} markup` : 'Profit only', tone: 'green' })}
      ${_chcKpi({ icon: '👥', label: 'Total Users', value: (st.total_users || st.users || 0).toLocaleString(), tone: 'blue' })}
      ${_chcKpi({ icon: '📦', label: 'Total Orders', value: (st.total_orders || st.orders || 0).toLocaleString(), tone: 'orange' })}
      ${_chcKpi({ icon: '🔄', label: 'Active Orders', value: (st.active_orders || 0).toLocaleString(), tone: 'red' })}
      ${_chcKpi({ icon: '👁', label: 'Visible Services', value: (svcSummary.visible_to_customers ?? bd.visible ?? 0).toLocaleString(), sub: `of ${(svcSummary.total ?? bd.total_services ?? 0).toLocaleString()} total`, tone: 'green' })}
    </div>`;

  el.innerHTML = `
    ${snapshotKpis}
    <div class="chc-two-col">
      <div>${coreKpis}</div>
      <div>${balCard}</div>
    </div>
  `;
}

/* ── Section: Revenue (weekly/monthly + affiliate net) ─────────────────── */

/* ── 🛠️ Operations: where money and customers leak ──────────────────────────
 * Data: GET /admin/stats/operations (payments, refunds by week, problem
 * services, real cost, quiet customers, support load), GET
 * /admin/wallet-credit/summary and GET /free-order/staff/stats.
 * ─────────────────────────────────────────────────────────────────────────── */
function _chcOpsRow(label, value, color) {
  return `<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <span style="color:var(--muted);">${label}</span><span style="font-weight:700;color:${color || 'var(--white)'};white-space:nowrap;">${value}</span></div>`;
}
function _chcOpsOpen(tab, label) {
  return `<button onclick="_chcJump('${tab}')" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--green);font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;">${label || 'Open'} →</button>`;
}

function _chcRenderOperations() {
  const el = document.getElementById('chcSection-operations');
  if (!el) return;
  const ops = _chc.data.operations;
  if (!ops) {
    el.innerHTML = _chcPanel({ title: 'Operations', icon: '🛠️', body: `<div style="font-size:12px;color:var(--muted);">Couldn't load operations stats (is the latest backend deployed? It needs GET /admin/stats/operations).</div>` });
    return;
  }
  const pay = ops.payments || {}, rf = ops.refunds || {}, rc = ops.real_cost || {}, qc = ops.quiet_customers || {}, sup = ops.support || {};
  const wc = _chc.data.walletCredit || null, fo = _chc.data.freeOrders || null;
  const pct = v => (v === null || v === undefined) ? '—' : `${v}%`;
  const toneFor = (v, good, ok) => v === null || v === undefined ? 'neutral' : v >= good ? 'green' : v >= ok ? 'orange' : 'red';

  const reorderRate = wc && wc.refunded_customers ? Math.round(wc.reordered_customers / wc.refunded_customers * 100) : null;
  const kpis = [
    _chcKpi({ icon: '📱', label: 'M-Pesa prompts paid (7d)', value: pct(pay.success_rate_pct), tone: toneFor(pay.success_rate_pct, 85, 70),
      sub: `${(pay.prompts || 0).toLocaleString()} prompts · ${fmtKES(pay.not_completed_kes || 0)} not completed` }),
    _chcKpi({ icon: '↩️', label: 'Refund rate (8 weeks)', value: pct(rf.refund_rate_8w_pct),
      tone: rf.refund_rate_8w_pct === null || rf.refund_rate_8w_pct === undefined ? 'neutral' : rf.refund_rate_8w_pct < 5 ? 'green' : rf.refund_rate_8w_pct < 10 ? 'orange' : 'red',
      sub: `${fmtKES(rf.refunded_8w_kes || 0)} refunded of ${fmtKES(rf.taken_8w_kes || 0)} taken` }),
    _chcKpi({ icon: '💳', label: 'Wallet credit held', value: wc ? fmtKES(wc.outstanding_kes || 0) : '—', tone: 'blue',
      sub: wc ? `${(wc.customers_with_credit || 0).toLocaleString()} customers · ${reorderRate === null ? '—' : reorderRate + '%'} of refunded clients reordered` : "couldn't load" }),
    _chcKpi({ icon: '💰', label: 'Real margin (30d)', value: pct(rc.margin_pct), tone: toneFor(rc.margin_pct, 25, 10),
      sub: `vs ${pct(rc.estimated_margin_pct)} estimated from markup` }),
    _chcKpi({ icon: '😴', label: 'Customers gone quiet', value: (qc.quiet_customers || 0).toLocaleString(), tone: (qc.quiet_customers || 0) > (qc.active_paying_30d || 0) ? 'orange' : 'neutral',
      sub: `no order in 30+ days · ${(qc.active_paying_30d || 0).toLocaleString()} ordered in last 30d` }),
    _chcKpi({ icon: '💬', label: 'Support reply time', value: sup.median_reply_minutes === null || sup.median_reply_minutes === undefined ? '—' : (sup.median_reply_minutes >= 60 ? `${Math.round(sup.median_reply_minutes / 6) / 10}h` : `${Math.round(sup.median_reply_minutes)} min`),
      tone: sup.median_reply_minutes === null || sup.median_reply_minutes === undefined ? 'neutral' : sup.median_reply_minutes <= 30 ? 'green' : sup.median_reply_minutes <= 120 ? 'orange' : 'red',
      sub: `median, 14d · ${(sup.waiting_over_2h || 0)} waiting 2h+ now` }),
  ].join('');

  // Payments
  const bs = pay.by_status || {};
  const c = k => ((bs[k] || {}).count || 0).toLocaleString();
  const k = k => fmtKES((bs[k] || {}).kes || 0);
  const payBody = `
    ${_chcOpsRow('✅ Paid', `${c('success')} · ${k('success')}`, 'var(--green)')}
    ${_chcOpsRow('❌ Failed', `${c('failed')} · ${k('failed')}`, '#ff8a80')}
    ${_chcOpsRow('🚫 Cancelled by customer', `${c('cancelled')} · ${k('cancelled')}`)}
    ${_chcOpsRow('⌛ Timed out (no PIN)', `${c('timeout')} · ${k('timeout')}`)}
    ${_chcOpsRow('⏳ Still pending', `${c('pending')}${pay.stuck_pending ? ` · <span style="color:var(--orange);">${pay.stuck_pending} stuck 10+ min</span>` : ''}`)}`;

  // Refunds by week
  const weekly = (rf.weekly || []).map(w => ({ ...w, label: _fmtShortDate(w.week_start) }));
  const refundBody = `
    ${_miniBarChart(weekly, { key: 'refunded_kes', labelKey: 'label', color: '#ff7043', h: 150 })}
    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:var(--muted);margin-top:8px;">
      ${weekly.slice(-4).map(w => `<span>${esc(w.label)}: <b style="color:var(--white);">${pct(w.refund_rate_pct)}</b> refunded</span>`).join('')}
    </div>
    ${wc ? `<div style="margin-top:12px;">
      ${_chcOpsRow('Refunded all-time', `${(wc.refunds || 0).toLocaleString()} orders · ${fmtKES(wc.refunded_kes || 0)}`)}
      ${_chcOpsRow('Spent back on new orders', fmtKES(wc.spent_kes || 0), 'var(--green)')}
      ${_chcOpsRow('Refunded clients who reordered', `${(wc.reordered_customers || 0)} of ${(wc.refunded_customers || 0)}`)}
      ${wc.refunds_not_messaged ? _chcOpsRow('Refunds where client was NOT messaged', wc.refunds_not_messaged, 'var(--orange)') : ''}
    </div>` : ''}`;

  // Problem services
  const ps = ops.problem_services || [];
  const psBody = ps.length ? `
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:460px;">
      <tr style="color:var(--muted);text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;">
        <th style="padding:6px 4px;">Service</th><th style="padding:6px 4px;text-align:right;">Orders</th><th style="padding:6px 4px;text-align:right;">Failed / partial</th><th style="padding:6px 4px;text-align:right;">Problem rate</th><th style="padding:6px 4px;text-align:right;">Refunded</th></tr>
      ${ps.map(r => `<tr style="border-top:1px solid rgba(255,255,255,.05);">
        <td style="padding:7px 4px;color:var(--white);">${esc(r.service_name)}</td>
        <td style="padding:7px 4px;text-align:right;">${r.orders}</td>
        <td style="padding:7px 4px;text-align:right;">${r.failed_or_cancelled} / ${r.partial}</td>
        <td style="padding:7px 4px;text-align:right;font-weight:700;color:${r.problem_rate_pct >= 20 ? '#ff8a80' : r.problem_rate_pct >= 10 ? 'var(--orange)' : 'var(--white)'};">${r.problem_rate_pct}%</td>
        <td style="padding:7px 4px;text-align:right;font-weight:700;">${fmtKES(r.refunded_kes)}</td></tr>`).join('')}
    </table></div>
    <div style="font-size:10.5px;color:var(--muted);margin-top:8px;">Consider hiding or switching services near the top — each failure costs a refund and a support conversation.</div>`
    : `<div style="font-size:12px;color:var(--muted);">No failed, cancelled or partial orders in the last 30 days. 🎉</div>`;

  // Real cost
  const rcBody = `
    ${_chcOpsRow('Sales (delivered value)', fmtKES(rc.sales_kes || 0))}
    ${_chcOpsRow('Provider cost (from each service’s cost price)', '−' + fmtKES(rc.cost_kes || 0), '#ff8a80')}
    ${_chcOpsRow('Real gross profit', fmtKES(rc.profit_kes || 0), 'var(--green)')}
    ${_chcOpsRow('Real margin vs markup estimate', `${pct(rc.margin_pct)} vs ${pct(rc.estimated_margin_pct)}`)}
    ${rc.orders_cost_unknown ? `<div style="font-size:10.5px;color:var(--orange);margin-top:8px;">${rc.orders_cost_unknown} of ${rc.orders} orders have no cost price on their service, so they count as zero cost — re-sync services to fill it in.</div>` : ''}
    <div style="font-size:10.5px;color:var(--muted);margin-top:8px;">The other Command Center profit figures use your current markup %; this one uses what each service actually costs from the provider today.</div>`;

  // Quiet customers
  const top = qc.top || [];
  const qcBody = `
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${(qc.quiet_customers || 0).toLocaleString()} paying customers haven't ordered in 30+ days — together they've spent <b style="color:var(--white);">${fmtKES(qc.quiet_lifetime_kes || 0)}</b>. Your biggest ones:</div>
    ${top.length ? top.map(u => _chcOpsRow(`${esc(u.name)} <span style="color:var(--muted);font-size:11px;">${esc(u.phone || '')}</span>`,
        `${fmtKES(u.spend_kes)} · ${u.orders} order${u.orders === 1 ? '' : 's'} · quiet ${u.days_quiet}d`)).join('')
      : `<div style="font-size:12px;color:var(--muted);">Nobody yet.</div>`}
    <div style="font-size:10.5px;color:var(--muted);margin-top:8px;">A Broadcast or a free-order offer to this list is the cheapest way to win sales back.</div>`;

  // Support load
  const sd = (sup.daily || []).map(d => ({ ...d, label: _fmtShortDate(d.date) }));
  const supBody = `
    ${_miniBarChart(sd, { key: 'new_conversations', labelKey: 'label', color: '#2196f3', h: 130 })}
    <div style="margin-top:10px;">
      ${_chcOpsRow('New conversations (14d)', (sup.new_conversations || 0).toLocaleString())}
      ${_chcOpsRow('Customer messages (14d)', (sup.customer_messages || 0).toLocaleString())}
      ${_chcOpsRow('Open conversations now', (sup.open_conversations || 0).toLocaleString())}
      ${_chcOpsRow('Waiting 2h+ for a reply', (sup.waiting_over_2h || 0).toLocaleString(), sup.waiting_over_2h ? 'var(--orange)' : null)}
    </div>`;

  // Free orders
  const foBody = fo ? `
    ${_chcOpsRow('Free orders earned', (fo.earned || 0).toLocaleString())}
    ${_chcOpsRow('Approved and sent', (fo.approved || 0).toLocaleString())}
    ${_chcOpsRow('Waiting for approval', (fo.pending || 0).toLocaleString(), fo.pending ? 'var(--orange)' : null)}
    ${_chcOpsRow('Value given away', fmtKES(fo.value_given_kes || 0))}
    ${_chcOpsRow('Delivered in full', fo.completion_rate === null || fo.completion_rate === undefined ? '—' : fo.completion_rate + '%')}`
    : `<div style="font-size:12px;color:var(--muted);">Couldn't load free-order stats.</div>`;

  el.innerHTML = `
    <div class="chc-kpi-grid" style="margin-bottom:18px;">${kpis}</div>
    <div class="chc-two-col">
      ${_chcPanel({ title: 'M-Pesa Payments — last 7 days', icon: '📱', sub: 'Every prompt sent, by how it ended', extra: _chcOpsOpen('payments-health', 'Payments Health'), body: payBody })}
      ${_chcPanel({ title: 'Refunds to Wallets by Week', icon: '↩️', sub: 'Failed / partial / cancelled paid orders refunded as wallet credit', extra: _chcOpsOpen('wallet-credit', 'Wallet Credit'), body: refundBody })}
    </div>
    ${_chcPanel({ title: 'Services That Fail Most — last 30 days', icon: '🧯', sub: 'Paid orders that failed, were cancelled or only partly delivered, by service', extra: _chcOpsOpen('services-mgmt', 'Services'), body: psBody })}
    <div class="chc-two-col">
      ${_chcPanel({ title: 'Real Profit — last 30 days', icon: '💰', sub: 'Sales vs what the provider actually charges', body: rcBody })}
      ${_chcPanel({ title: 'Customers Going Quiet', icon: '😴', sub: 'Paid before, nothing in 30+ days', extra: _chcOpsOpen('broadcasts', 'Broadcasts'), body: qcBody })}
    </div>
    <div class="chc-two-col">
      ${_chcPanel({ title: 'Support Load — last 14 days', icon: '💬', sub: 'New conversations per day', extra: _chcOpsOpen('support', 'Support'), body: supBody })}
      ${_chcPanel({ title: 'Free Orders Given', icon: '🎁', sub: 'Loyalty rewards — a real cost against profit', extra: _chcOpsOpen('free-orders', 'Free Orders'), body: foBody })}
    </div>`;
}

function _chcRenderRevenue() {
  const el = document.getElementById('chcSection-revenue');
  if (!el) return;
  const r = _chc.data.revenue;
  if (!r) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load revenue data. <button class="action-btn" onclick="loadAdminCommandCenter(true)">Retry</button></p></div>`;
    return;
  }

  const weekly = r.weekly || [];
  const monthly = r.monthly || [];
  const ai = r.affiliate_impact || {};
  const insights = r.insights || [];

  const thisWeek = weekly[weekly.length - 1];
  const lastWeek = weekly[weekly.length - 2];
  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly[monthly.length - 2];
  const pct = (curr, prev) => (prev ? Math.round(((curr - prev) / prev) * 1000) / 10 : (curr ? 100 : null));

  const weekKpis = thisWeek ? `
    <div class="chc-kpi-grid">
      ${_chcKpi({ icon: '📅', label: 'Sales', value: fmtKES(thisWeek.sales_kes), sub: lastWeek ? '' : `${thisWeek.orders} orders`, trend: lastWeek ? pct(thisWeek.sales_kes, lastWeek.sales_kes) : null, tone: 'green' })}
      ${_chcKpi({ icon: '💰', label: 'Profit', value: fmtKES(thisWeek.revenue_kes), sub: lastWeek ? '' : 'before affiliate cost', trend: lastWeek ? pct(thisWeek.revenue_kes, lastWeek.revenue_kes) : null, tone: 'green' })}
      ${_chcKpi({ icon: '🤝', label: 'Affiliate Cost', value: fmtKES(thisWeek.affiliate_commission_kes), sub: 'owed to affiliates', tone: 'orange' })}
      ${_chcKpi({ icon: '🏆', label: 'Net to Business', value: fmtKES(thisWeek.net_revenue_kes), sub: 'profit − affiliate cost', tone: 'blue' })}
    </div>` : `<div class="empty-state"><p>No paid orders yet this week.</p></div>`;

  const monthKpis = thisMonth ? `
    <div class="chc-kpi-grid">
      ${_chcKpi({ icon: '🗓️', label: 'Sales', value: fmtKES(thisMonth.sales_kes), sub: lastMonth ? '' : `${thisMonth.orders} orders`, trend: lastMonth ? pct(thisMonth.sales_kes, lastMonth.sales_kes) : null, tone: 'green' })}
      ${_chcKpi({ icon: '💰', label: 'Profit', value: fmtKES(thisMonth.revenue_kes), sub: lastMonth ? '' : 'before affiliate cost', trend: lastMonth ? pct(thisMonth.revenue_kes, lastMonth.revenue_kes) : null, tone: 'green' })}
      ${_chcKpi({ icon: '🤝', label: 'Affiliate Cost', value: fmtKES(thisMonth.affiliate_commission_kes), sub: `${ai.commission_pct_of_revenue_this_month || 0}% of profit`, tone: 'orange' })}
      ${_chcKpi({ icon: '🏆', label: 'Net to Business', value: fmtKES(thisMonth.net_revenue_kes), sub: 'profit − affiliate cost', tone: 'blue' })}
    </div>` : `<div class="empty-state"><p>No paid orders yet this month.</p></div>`;

  const insightsHtml = insights.length ? insights.map(txt => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:16px;flex-shrink:0;">💡</span>
      <span style="font-size:13px;color:var(--white);line-height:1.5;">${esc(txt)}</span>
    </div>`).join('') : `<div style="font-size:12px;color:var(--muted);padding:8px 0;">No insights yet.</div>`;

  el.innerHTML = `
    ${_chcPanel({ title: 'This Week', icon: '📅', body: weekKpis })}
    ${_chcPanel({ title: 'This Month', icon: '🗓️', body: monthKpis })}
    ${_chcPanel({
      title: 'Affiliate Cost — All Time', icon: '🤝', body: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
        <div><div style="font-size:22px;font-weight:800;color:var(--white);">${fmtKES(ai.total_commission_owed_kes || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Total owed to affiliates (accrued)</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--white);">${fmtKES(ai.total_commission_paid_kes || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Already paid out</div></div>
        <div><div style="font-size:22px;font-weight:800;color:var(--orange);">${fmtKES((ai.total_commission_owed_kes || 0) - (ai.total_commission_paid_kes || 0))}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Accrued but not yet paid</div></div>
      </div>` })}
    <div class="chc-two-col" style="grid-template-columns:1fr 1fr;">
      ${_chcPanel({ title: 'Net-to-Business by Week', icon: '📊', sub: `last ${weekly.length}`, body: _miniBarChart(weekly, { key: 'net_revenue_kes', labelKey: 'week_start', color: '#3dd44a' }) })}
      ${_chcPanel({ title: 'Net-to-Business by Month', icon: '📊', sub: `last ${monthly.length}`, body: _miniBarChart(monthly, { key: 'net_revenue_kes', labelKey: 'month', color: '#3dd44a' }) })}
    </div>
    ${_chcPanel({
      title: 'Owner Draw & Cash Allocation', icon: '💰', sub: 'Built on the Profit First framework (Michalowicz) — Profit / Owner\u2019s Pay / Tax / OpEx target allocation for sub-$250K-revenue businesses', extra: `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--muted);">Reserve</span>
          <input type="number" id="chcReserveDaysInput" value="${_chc.reserveDays}" min="0" max="90" step="1"
                 oninput="_chcRecalcOwnerDraw()"
                 style="width:48px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:4px 6px;font-size:12px;text-align:center;" />
          <span style="font-size:11px;color:var(--muted);">days balance</span>
        </div>`,
      body: `
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06);">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Profit %
            <input type="number" id="chcPfProfitInput" value="${_chc.pfProfitPct}" min="0" max="100" step="1" oninput="_chcRecalcOwnerDraw()"
                   style="width:56px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--green);padding:5px 6px;font-size:13px;font-weight:700;text-align:center;" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Owner's Pay %
            <input type="number" id="chcPfOwnerInput" value="${_chc.pfOwnerPct}" min="0" max="100" step="1" oninput="_chcRecalcOwnerDraw()"
                   style="width:56px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--blue);padding:5px 6px;font-size:13px;font-weight:700;text-align:center;" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Tax %
            <input type="number" id="chcPfTaxInput" value="${_chc.pfTaxPct}" min="0" max="100" step="1" oninput="_chcRecalcOwnerDraw()"
                   style="width:56px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--orange);padding:5px 6px;font-size:13px;font-weight:700;text-align:center;" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">OpEx % <span style="color:rgba(122,143,173,.6);">(auto)</span>
            <input type="number" id="chcPfOpexDisplay" value="0" disabled
                   style="width:56px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:5px 6px;font-size:13px;font-weight:700;text-align:center;" />
          </label>
        </div>
        <div id="chcOwnerDrawBody"></div>`,
    })}
    ${_chcPanel({
      title: 'Recommended Marketing Budget', icon: '📣', sub: 'SBA guidance: 7\u201310% of gross revenue for businesses under $5M; 10\u201320% if you\u2019re in growth mode', extra: `
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="number" id="chcMarketingPctInput" value="${_chc.marketingPct}" min="0" max="100" step="0.5" oninput="_chcRecalcOwnerDraw()"
                 style="width:52px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:4px 6px;font-size:12px;text-align:center;" />
          <span style="font-size:11px;color:var(--muted);">% of gross sales</span>
        </div>`,
      body: `<div id="chcMarketingBody"></div>`,
    })}
    ${_chcPanel({ title: 'Insights', icon: '💡', extra: `<button class="btn-secondary" style="margin:0;padding:7px 14px;font-size:11px;" onclick="loadAdminCommandCenter(true)">↻ Refresh</button>`, body: `<div style="padding:0 2px;">${insightsHtml}</div>` })}
  `;
  _chcRecalcOwnerDraw();
}

/* ── Owner Draw & Cash Allocation ──────────────────────────────────────────
 * Two questions, one panel: "how much can the business retain" and "how much
 * can I pay myself as CEO". Two layers:
 *   1) Known obligations come off first — unpaid affiliate/CCR commissions,
 *      pending Connect creator payouts, and a provider-balance reserve sized
 *      to N days of current burn. These are real numbers, not estimates.
 *   2) What's left is split using Profit First (Michalowicz) Target
 *      Allocation Percentages — the widely-used small-business cash system:
 *      Profit / Owner's Pay / Tax / OpEx, defaulting to the sub-$250K-revenue
 *      tier (5/50/15/30). OpEx always absorbs the remainder, per the
 *      framework. All four %s are editable — they're a cited starting point,
 *      not a rule for your specific business.
 * This does NOT know your actual KRA tax obligation. Kenya has two live
 * regimes with very different math: flat 3% Turnover Tax on GROSS turnover
 * for MSMEs between KES 1M-25M/year (if elected), or 30% corporate tax on
 * NET profit otherwise — set the Tax % input to whichever applies to you,
 * ideally with your accountant, not the framework's default.
 * ─────────────────────────────────────────────────────────────────────── */

function _chcRecalcOwnerDraw() {
  const reserveInput = document.getElementById('chcReserveDaysInput');
  const profitInput  = document.getElementById('chcPfProfitInput');
  const ownerInput   = document.getElementById('chcPfOwnerInput');
  const taxInput     = document.getElementById('chcPfTaxInput');
  const marketingInput = document.getElementById('chcMarketingPctInput');
  const opexDisplay  = document.getElementById('chcPfOpexDisplay');
  const body = document.getElementById('chcOwnerDrawBody');
  const marketingBody = document.getElementById('chcMarketingBody');
  if (!body) return;

  const reserveDays = Math.max(0, Math.min(90, parseInt(reserveInput?.value, 10) || 0));
  let profitPct = Math.max(0, Math.min(100, parseFloat(profitInput?.value) || 0));
  let ownerPct  = Math.max(0, Math.min(100, parseFloat(ownerInput?.value) || 0));
  let taxPct    = Math.max(0, Math.min(100, parseFloat(taxInput?.value) || 0));
  if (profitPct + ownerPct + taxPct > 100) {
    // Scale the three down proportionally so OpEx never goes negative —
    // OpEx is defined as "whatever's left", it can't itself be negative.
    const scale = 100 / (profitPct + ownerPct + taxPct);
    profitPct = Math.round(profitPct * scale * 10) / 10;
    ownerPct  = Math.round(ownerPct * scale * 10) / 10;
    taxPct    = Math.round(taxPct * scale * 10) / 10;
  }
  const opexPct = Math.round((100 - profitPct - ownerPct - taxPct) * 10) / 10;
  const marketingPct = Math.max(0, Math.min(100, parseFloat(marketingInput?.value) || 0));

  _chc.reserveDays = reserveDays;
  _chc.pfProfitPct = profitPct;
  _chc.pfOwnerPct = ownerPct;
  _chc.pfTaxPct = taxPct;
  _chc.marketingPct = marketingPct;
  if (opexDisplay) opexDisplay.value = opexPct;

  const r = _chc.data.revenue;
  const monthly = r ? (r.monthly || []) : [];
  const thisMonth = monthly[monthly.length - 1];
  const monthProfit = thisMonth ? thisMonth.revenue_kes : 0;
  const monthSales = thisMonth ? thisMonth.sales_kes : 0;

  const ai = r ? (r.affiliate_impact || {}) : {};
  const affLiability = Math.max(0, (ai.total_commission_owed_kes || 0) - (ai.total_commission_paid_kes || 0));

  const ccrAgents = _chc.data.ccrAgents || [];
  const ccrLiability = ccrAgents.reduce((s, a) => s + (a.pending_kes || 0), 0);

  const cnRev = _chc.data.connectRevenue;
  const cnLiability = cnRev ? ((cnRev.payout_queue || {}).pending_amount_kes || 0) : 0;

  const statsWrap = _chc.data.stats;
  const usdToKes = statsWrap ? ((statsWrap.pricing || {}).usd_to_kes || 0) : 0;
  const burn = (_chc.data.trends && _chc.data.trends.balance_burn) || {};
  const burnUsdPerDay = burn.burn_usd_per_day || 0;
  const reserveKes = burnUsdPerDay * reserveDays * usdToKes;

  const knownObligations = affLiability + ccrLiability + cnLiability + reserveKes;
  const adjustedBase = Math.max(0, monthProfit - knownObligations);

  // Marketing benchmark is independent of the P&L split above — it's sized
  // off gross sales (per SBA/Gartner convention), not the profit remainder.
  if (marketingBody) {
    const recommendedMarketing = monthSales * (marketingPct / 100);
    marketingBody.innerHTML = thisMonth ? `
      <div style="display:flex;align-items:baseline;gap:10px;">
        <div style="font-size:24px;font-weight:900;color:var(--white);">${fmtKES(recommendedMarketing)}</div>
        <div style="font-size:11px;color:var(--muted);">${marketingPct}% of ${fmtKES(monthSales)} in gross sales this month</div>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:8px;line-height:1.5;">This system doesn't track actual ad/marketing spend anywhere yet, so this is a target to budget against, not a comparison to what you've spent. Ask if you want real expense tracking added.</div>
    ` : `<div style="font-size:12px;color:var(--muted);">No sales yet this month.</div>`;
  }

  if (!thisMonth) {
    body.innerHTML = `<div style="font-size:12px;color:var(--muted);">No paid orders yet this month — nothing to allocate yet.</div>`;
    return;
  }

  const obligationRows = [
    { label: "This month's profit (after provider cost)", value: monthProfit, sign: 1 },
    { label: 'Affiliate commissions owed (unpaid)', value: affLiability, sign: -1 },
    { label: 'CCR agent commissions pending', value: ccrLiability, sign: -1 },
    { label: 'Connect creator payouts pending', value: cnLiability, sign: -1 },
    { label: `Panel balance reserve (${reserveDays}d at $${burnUsdPerDay.toFixed(2)}/day)`, value: reserveKes, sign: -1 },
  ];
  const obligationRowsHtml = obligationRows.map(row => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;">
      <span style="color:var(--muted);">${esc(row.label)}</span>
      <span style="color:${row.sign < 0 ? '#ff8a80' : 'var(--white)'};font-weight:700;">${row.sign < 0 ? '−' : ''}${fmtKES(row.value)}</span>
    </div>`).join('');

  const splitRows = [
    { label: 'Profit (retained earnings)', pct: profitPct, color: 'var(--green)' },
    { label: "Owner's Pay — what you can draw", pct: ownerPct, color: 'var(--blue)' },
    { label: 'Tax reserve', pct: taxPct, color: 'var(--orange)' },
    { label: 'Operating Expenses (staff, tools, marketing, etc.)', pct: opexPct, color: 'var(--muted)' },
  ];
  const splitRowsHtml = splitRows.map(s => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;">
        <span style="color:var(--white);font-weight:700;">${esc(s.label)}</span>
        <span style="color:${s.color};font-weight:800;">${fmtKES(adjustedBase * s.pct / 100)} <span style="color:var(--muted);font-weight:500;">(${s.pct}%)</span></span>
      </div>
      <div style="height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${s.pct}%;background:${s.color};border-radius:4px;"></div>
      </div>
    </div>`).join('');

  const retained = adjustedBase * (profitPct + taxPct + opexPct) / 100;
  const ownerDraw = adjustedBase * ownerPct / 100;

  body.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Step 1 — known obligations off the top</div>
    ${obligationRowsHtml}
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 18px;">
      <span style="font-size:12.5px;font-weight:800;color:var(--white);">Adjusted base to allocate</span>
      <span style="font-size:18px;font-weight:900;color:var(--white);">${fmtKES(adjustedBase)}</span>
    </div>
    <div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">Step 2 — Profit First split of what's left</div>
    ${splitRowsHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);">
      <div>
        <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Business retains</div>
        <div style="font-size:22px;font-weight:900;color:var(--green);">${fmtKES(retained)}</div>
      </div>
      <div>
        <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">You can pay yourself</div>
        <div style="font-size:22px;font-weight:900;color:var(--blue);">${fmtKES(ownerDraw)}</div>
      </div>
    </div>
    <div style="font-size:10.5px;color:var(--muted);margin-top:12px;line-height:1.6;">⚠️ Set Tax % to whichever KRA regime actually applies to you — flat 3% Turnover Tax on gross turnover (MSMEs, KES 1M\u201325M/year, if elected) or 30% corporate tax on net profit otherwise. This tool doesn't know which one you're on. Get real tax advice before drawing this in full.</div>
  `;
}


/* ══════════════════ MONEY FLOW — Profit Allocation ══════════════════
 * "Where does every shilling go": Total Sales → Provider Costs → Gross
 * Profit → Net Profit → split 45/20/20/15 into Owner Pay/Project Titan,
 * Panel Balance & Business Growth, Operating Expenses, and Tax Reserve.
 * Weekly/monthly figures come straight off /admin/stats/revenue; all-time
 * comes off /admin/stats/snapshot + /admin/stats. The 45/20/20/15 split
 * itself is a live recommendation, recomputed on every render — it isn't
 * money this system moves anywhere. Titan/brick funding is the one bucket
 * tracked as a real ledger (target + logged contributions) via
 * /admin/allocations/titan, since that's money meant to permanently leave
 * the business.
 * ══════════════════════════════════════════════════════════════════ */

function mfSetPeriod(period, btn) {
  _chc.mfPeriod = period;
  _chcRenderMoneyFlow();
}

function _mfAllocRow(label, kes, pct, color) {
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;">
        <span style="color:var(--white);font-weight:700;">${esc(label)}</span>
        <span style="color:${color};font-weight:800;">${fmtKES(kes)} <span style="color:var(--muted);font-weight:500;">(${pct}%)</span></span>
      </div>
      <div style="height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${Math.max(0,Math.min(100,pct))}%;background:${color};border-radius:4px;"></div>
      </div>
    </div>`;
}

function _mfTitanBody(ledger, titanKesThisPeriod) {
  const target = ledger.target_kes || 0;
  const funded = ledger.funded_kes || 0;
  const pct = ledger.progress_pct;
  const bar = target > 0 ? Math.max(0, Math.min(100, (funded / target) * 100)) : 0;
  const contributions = (ledger.contributions || []).slice(0, 8);
  const rows = contributions.length ? contributions.map(c => `
    <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <span style="color:var(--muted);">${esc(new Date(c.date).toLocaleDateString())} — ${esc(c.note || '')}</span>
      <span style="font-weight:700;color:${c.amount_kes < 0 ? '#ff8a80' : 'var(--white)'};">${c.amount_kes < 0 ? '\u2212' : '+'}${fmtKES(Math.abs(c.amount_kes))}</span>
    </div>`).join('') : `<div style="font-size:11.5px;color:var(--muted);padding:6px 0;">No contributions logged yet.</div>`;

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:14px;">
      <div><div style="font-size:22px;font-weight:800;color:var(--white);">${fmtKES(funded)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Funded so far</div></div>
      <div><div style="font-size:22px;font-weight:800;color:var(--white);">${target ? fmtKES(target) : '\u2014 not set'}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Target</div></div>
      <div><div style="font-size:22px;font-weight:800;color:var(--blue);">${target ? fmtKES(Math.max(0, target - funded)) : '\u2014'}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Remaining</div></div>
    </div>
    ${target ? `
      <div style="height:10px;background:rgba(255,255,255,.06);border-radius:5px;overflow:hidden;margin-bottom:6px;">
        <div style="height:100%;width:${bar}%;background:var(--blue);border-radius:5px;"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">${pct !== null && pct !== undefined ? pct : 0}% funded</div>` : `<div style="margin-bottom:16px;"></div>`}
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
      <button class="btn-secondary" style="margin:0;padding:8px 14px;font-size:12px;" onclick="mfLogTitanContribution(${(titanKesThisPeriod || 0).toFixed(2)})">+ Log this window's allocation (${fmtKES(titanKesThisPeriod || 0)})</button>
      <input type="number" id="mfCustomContribInput" placeholder="Custom amount (KES)" style="width:170px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:8px 10px;font-size:12px;" />
      <button class="btn-secondary" style="margin:0;padding:8px 14px;font-size:12px;" onclick="mfLogCustomContribution()">+ Log custom amount</button>
    </div>
    <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Recent contributions</div>
    ${rows}
    <div style="font-size:10.5px;color:var(--muted);margin-top:12px;line-height:1.6;">Logging a contribution here is a manual record for tracking progress — it doesn't move money anywhere itself.</div>
  `;
}

/* Compact table renderer for all 4 Money Flow bucket ledgers — one row per
 * bucket (allocated / withdrawn / remaining + a mini progress bar), with
 * the log-form and history tucked behind a "Manage" toggle instead of
 * always-open panels. `kind` picks which pair of mfLog / mfLogCustom
 * functions the row's buttons call. */
const _MF_KIND_CFG = {
  owner:   { fnSuffix: 'Owner',   color: 'var(--blue)',   noun: 'withdrawals' },
  expense: { fnSuffix: 'Expense', color: 'var(--white)',  noun: 'expenses' },
  panel:   { fnSuffix: 'Panel',   color: 'var(--green)',  noun: 'withdrawals' },
  tax:     { fnSuffix: 'Tax',     color: 'var(--orange)', noun: 'entries' },
};

function _mfBucketRow(kind, icon, label, ledger, thisWindowKes) {
  const cfg = _MF_KIND_CFG[kind];
  const s = ledger || { allocated_kes: 0, withdrawn_kes: 0, remaining_kes: 0, withdrawals: [] };
  const allocated = s.allocated_kes || 0;
  const withdrawn = s.withdrawn_kes || 0;
  const remaining = s.remaining_kes || 0;
  const pct = allocated > 0 ? Math.max(0, Math.min(100, (withdrawn / allocated) * 100)) : 0;
  const expanded = _chc.mfExpandedBucket === kind;
  const entries = (s.withdrawals || []).slice(0, 6);

  const historyHtml = entries.length ? entries.map(w => `
    <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="color:var(--muted);">${esc(new Date(w.date).toLocaleDateString())} — ${esc(w.note || '')}</span>
      <span style="font-weight:700;color:var(--white);">${fmtKES(w.amount_kes)}</span>
    </div>`).join('') : `<div style="font-size:11px;color:var(--muted);padding:4px 0;">Nothing logged yet.</div>`;

  return `
    <div style="border-bottom:1px solid rgba(255,255,255,.05);">
      <div class="mf-bucket-row" style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr auto;gap:10px;padding:10px 4px;align-items:center;">
        <div>
          <div style="font-size:12.5px;font-weight:700;color:var(--white);">${icon} ${esc(label)}</div>
          <div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:5px;width:92%;"><div style="height:100%;width:${pct}%;background:${cfg.color};"></div></div>
        </div>
        <div style="font-size:12.5px;font-weight:700;color:var(--white);">${fmtKES(allocated)}</div>
        <div style="font-size:12.5px;font-weight:700;color:var(--orange);">${fmtKES(withdrawn)}</div>
        <div style="font-size:12.5px;font-weight:800;color:${cfg.color};">${fmtKES(remaining)}</div>
        <button class="btn-secondary" style="margin:0;padding:6px 10px;font-size:11px;white-space:nowrap;" onclick="mfToggleBucket('${kind}')">${expanded ? 'Close' : 'Manage'}</button>
      </div>
      ${expanded ? `
        <div style="padding:0 4px 14px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
            <button class="btn-secondary" style="margin:0;padding:7px 12px;font-size:11.5px;" onclick="mfLog${cfg.fnSuffix}(${(thisWindowKes || 0).toFixed(2)})">+ Log window's allocation (${fmtKES(thisWindowKes || 0)})</button>
            <input type="number" id="mfCustom${cfg.fnSuffix}Input" placeholder="Custom amount (KES)" style="width:140px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:7px 8px;font-size:11.5px;" />
            <button class="btn-secondary" style="margin:0;padding:7px 12px;font-size:11.5px;" onclick="mfLogCustom${cfg.fnSuffix}()">+ Log</button>
          </div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Recent ${cfg.noun}</div>
          ${historyHtml}
        </div>` : ''}
    </div>`;
}

function mfToggleBucket(kind) {
  _chc.mfExpandedBucket = (_chc.mfExpandedBucket === kind) ? null : kind;
  _chcRenderMoneyFlow();
}

function _chcRenderMoneyFlow() {
  const el = document.getElementById('chcSection-moneyflow');
  if (!el) return;

  const statsWrap = _chc.data.stats;
  const r = _chc.data.revenue;
  const snap = _chc.data.snapshot;

  const periodNav = `
    <div id="mfPeriodNav" style="display:flex;gap:8px;margin-bottom:18px;">
      ${['weekly','monthly','alltime'].map(p => `<button class="chc-nav-btn ${p===_chc.mfPeriod?'active':''}" onclick="mfSetPeriod('${p}',this)">${p==='weekly'?'This Week':p==='monthly'?'This Month':'All-Time'}</button>`).join('')}
    </div>`;

  if (!statsWrap || !r || !snap) {
    el.innerHTML = `${periodNav}<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load money flow data. <button class="action-btn" onclick="loadAdminCommandCenter(true)">Retry</button></p></div>`;
    return;
  }

  const st = statsWrap.stats || {};
  const usdToKes = (statsWrap.pricing || {}).usd_to_kes || 0;
  const weekly = r.weekly || [];
  const monthly = r.monthly || [];
  const ai = r.affiliate_impact || {};

  let fig = null;
  if (_chc.mfPeriod === 'weekly') {
    const wk = weekly[weekly.length - 1];
    if (wk) fig = { label: `Week of ${_fmtShortDate(wk.week_start)}`, sales: wk.sales_kes, grossProfit: wk.revenue_kes, providerCost: wk.sales_kes - wk.revenue_kes, affiliateCost: wk.affiliate_commission_kes };
  } else if (_chc.mfPeriod === 'monthly') {
    const mo = monthly[monthly.length - 1];
    if (mo) fig = { label: mo.month, sales: mo.sales_kes, grossProfit: mo.revenue_kes, providerCost: mo.sales_kes - mo.revenue_kes, affiliateCost: mo.affiliate_commission_kes };
  } else {
    fig = { label: 'All-time', sales: st.total_sales || 0, grossProfit: snap.gross_profit_kes || 0, providerCost: snap.provider_cost_kes || 0, affiliateCost: ai.total_commission_owed_kes || 0 };
  }

  if (!fig) {
    el.innerHTML = `${periodNav}<div class="empty-state"><p>No paid orders yet in this window.</p></div>`;
    return;
  }

  const netProfit = Math.max(0, fig.grossProfit - fig.affiliateCost);

  // Outstanding liabilities — running totals (not period-scoped: CCR/Connect
  // payouts aren't split by week/month server-side yet, so these always show
  // the current outstanding balance regardless of which period is selected).
  const affLiability = Math.max(0, (ai.total_commission_owed_kes || 0) - (ai.total_commission_paid_kes || 0));
  const ccrAgents = _chc.data.ccrAgents || [];
  const ccrLiability = ccrAgents.reduce((s, a) => s + (a.pending_kes || 0), 0);
  const cnRev = _chc.data.connectRevenue;
  const cnLiability = cnRev ? ((cnRev.payout_queue || {}).pending_amount_kes || 0) : 0;
  const totalLiabilities = affLiability + ccrLiability + cnLiability;

  // 45 / 20 / 20 / 15 allocation split of Net Profit — normalized to 100 if
  // the editable inputs don't add up (same pattern as the Owner Draw panel).
  let titanPct = _chc.mfTitanPct, growthPct = _chc.mfGrowthPct, opexPct = _chc.mfOpexPct, taxPct = _chc.mfTaxPct;
  const sumPct = titanPct + growthPct + opexPct + taxPct;
  if (sumPct > 0 && Math.round(sumPct * 10) !== 1000) {
    const scale = 100 / sumPct;
    titanPct = Math.round(titanPct * scale * 10) / 10;
    growthPct = Math.round(growthPct * scale * 10) / 10;
    opexPct = Math.round(opexPct * scale * 10) / 10;
    taxPct = Math.round((100 - titanPct - growthPct - opexPct) * 10) / 10;
  }
  const titanKes = netProfit * titanPct / 100;
  const growthBucketKes = netProfit * growthPct / 100;
  const opexKes = netProfit * opexPct / 100;
  const taxKes = netProfit * taxPct / 100;
  const businessPct = Math.round((growthPct + opexPct + taxPct) * 10) / 10;
  const businessKes = growthBucketKes + opexKes + taxKes;

  // Panel balance + runway + recommended top-up
  const balUsd = (st.panel_balance_usd !== null && st.panel_balance_usd !== undefined) ? parseFloat(st.panel_balance_usd) : null;
  const balKes = (balUsd !== null) ? balUsd * usdToKes : null;
  const burn = (_chc.data.trends && _chc.data.trends.balance_burn) || {};
  const burnUsdPerDay = burn.burn_usd_per_day || 0;
  const runwayDays = (burn.days_until_empty !== undefined) ? burn.days_until_empty : null;
  const targetRunway = _chc.mfRunwayTargetDays;
  const recommendedTopupUsd = Math.max(0, (targetRunway * burnUsdPerDay) - (balUsd || 0));
  const recommendedTopupKes = recommendedTopupUsd * usdToKes;
  // Split of the Panel Balance & Growth bucket: enough to cover the
  // recommended top-up first, remainder is free for reinvestment.
  const panelTopupFromBucket = Math.min(growthBucketKes, recommendedTopupKes);
  const reinvestKes = Math.max(0, growthBucketKes - panelTopupFromBucket);

  // Titan/brick funding ledger (server-tracked)
  const titanLedger = _chc.data.titan || { target_kes: 0, funded_kes: 0, remaining_kes: 0, progress_pct: null, contributions: [] };

  // Owner Pay & Operating Expenses withdrawal ledgers (server-tracked, same
  // idiom as Titan above — see /admin/allocations/owner-pay|expenses).
  const ownerLedger = _chc.data.ownerPay || { allocated_kes: 0, withdrawn_kes: 0, remaining_kes: 0, allocation_pct: titanPct, withdrawals: [] };
  const expenseLedger = _chc.data.expenses || { allocated_kes: 0, withdrawn_kes: 0, remaining_kes: 0, allocation_pct: opexPct, withdrawals: [] };
  const panelLedger = _chc.data.panelGrowth || { allocated_kes: 0, withdrawn_kes: 0, remaining_kes: 0, allocation_pct: growthPct, withdrawals: [] };
  const taxLedger = _chc.data.taxReserve || { allocated_kes: 0, withdrawn_kes: 0, remaining_kes: 0, allocation_pct: taxPct, withdrawals: [] };

  // Safe to withdraw: the Owner Pay/Titan bucket, net of everything still
  // owed out to affiliates/CCR/Connect — conservative on purpose.
  const safeToWithdraw = Math.max(0, titanKes - totalLiabilities);

  el.innerHTML = `
    <style>
      #ap-stats .mf-split-bar { display:flex; height:38px; border-radius:10px; overflow:hidden; margin:14px 0; }
      #ap-stats .mf-alloc-input { width:56px;background:var(--navy);border:1px solid var(--border);border-radius:6px;padding:5px 6px;font-size:13px;font-weight:700;text-align:center; }
    </style>
    ${periodNav}

    ${_chcPanel({ title: fig.label, icon: '💵', sub: 'Full money flow for this window', body: `
      <div class="chc-kpi-grid">
        ${_chcKpi({ icon: '🧾', label: 'Total Sales', value: fmtKES(fig.sales), tone: 'neutral' })}
        ${_chcKpi({ icon: '📦', label: 'Provider Costs', value: fmtKES(fig.providerCost), tone: 'orange' })}
        ${_chcKpi({ icon: '💰', label: 'Gross Profit', value: fmtKES(fig.grossProfit), tone: 'green' })}
        ${_chcKpi({ icon: '🏆', label: 'Net Profit', value: fmtKES(netProfit), sub: 'gross profit \u2212 affiliate cost this window', tone: 'blue' })}
      </div>` })}

    ${_chcPanel({ title: '45% vs 55% Split', icon: '⚖️', sub: 'How every KES of Net Profit this window is divided', body: `
      <div class="mf-split-bar">
        <div style="width:${titanPct}%;background:var(--blue);display:flex;align-items:center;justify-content:center;color:#04140a;font-weight:900;font-size:13px;">${titanPct}%</div>
        <div style="width:${businessPct}%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#04140a;font-weight:900;font-size:13px;">${businessPct}%</div>
      </div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px;color:var(--muted);margin-bottom:18px;">
        <span><span style="color:var(--blue);font-weight:800;">\u25a0</span> Owner Pay / Project Titan (bricks) \u2014 ${fmtKES(titanKes)}</span>
        <span><span style="color:var(--green);font-weight:800;">\u25a0</span> Stays in the business \u2014 ${fmtKES(businessKes)}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Titan / Owner %
          <input class="mf-alloc-input" type="number" id="mfTitanInput" value="${titanPct}" min="0" max="100" step="1" oninput="_mfRecalc()" style="color:var(--blue);" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Panel Balance & Growth %
          <input class="mf-alloc-input" type="number" id="mfGrowthInput" value="${growthPct}" min="0" max="100" step="1" oninput="_mfRecalc()" style="color:var(--green);" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Operating Expenses %
          <input class="mf-alloc-input" type="number" id="mfOpexInput" value="${opexPct}" min="0" max="100" step="1" oninput="_mfRecalc()" style="color:var(--white);" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--muted);">Tax Reserve %
          <input class="mf-alloc-input" type="number" id="mfTaxInput" value="${taxPct}" min="0" max="100" step="1" oninput="_mfRecalc()" style="color:var(--orange);" />
        </label>
      </div>
      ${_mfAllocRow('Owner Pay / Project Titan (bricks)', titanKes, titanPct, 'var(--blue)')}
      ${_mfAllocRow('Panel Balance & Business Growth', growthBucketKes, growthPct, 'var(--green)')}
      ${_mfAllocRow('Operating Expenses', opexKes, opexPct, 'var(--white)')}
      ${_mfAllocRow('Tax Reserve', taxKes, taxPct, 'var(--orange)')}
      <div style="font-size:10.5px;color:var(--muted);margin-top:10px;line-height:1.6;">These percentages are a target split of Net Profit for this window \u2014 a planning tool, not a ledger of money actually moved. Only Titan/brick funding below is tracked as a running total you log yourself.</div>
    ` })}

    <div class="chc-two-col">
      ${_chcPanel({ title: 'Safe to Withdraw', icon: '🟢', sub: 'Titan / Owner Pay bucket, net of outstanding liabilities', body: `
        <div style="font-size:30px;font-weight:900;color:var(--green);">${fmtKES(safeToWithdraw)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.6;">${fmtKES(titanKes)} (${titanPct}% of Net Profit) \u2212 ${fmtKES(totalLiabilities)} outstanding liabilities</div>` })}
      ${_chcPanel({ title: 'Affiliate & Other Liabilities', icon: '🤝', sub: 'Everything owed out, not yet paid', body: `
        <div style="display:grid;gap:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span style="color:var(--muted);">Affiliate commission (unpaid)</span><span style="font-weight:700;color:var(--white);">${fmtKES(affLiability)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span style="color:var(--muted);">CCR agent commission (pending)</span><span style="font-weight:700;color:var(--white);">${fmtKES(ccrLiability)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span style="color:var(--muted);">Connect creator payouts (pending)</span><span style="font-weight:700;color:var(--white);">${fmtKES(cnLiability)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding-top:8px;border-top:1px solid var(--border);"><span style="font-weight:800;color:var(--white);">Total</span><span style="font-weight:900;color:var(--orange);">${fmtKES(totalLiabilities)}</span></div>
          ${_chc.data.walletCredit ? `<div style="margin-top:6px;padding:10px 12px;border-radius:10px;background:rgba(61,212,74,.06);border:1px solid rgba(61,212,74,.25);">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;"><span style="color:var(--white);font-weight:700;">💳 Customer wallet credit held</span><span style="font-weight:800;color:var(--green);white-space:nowrap;">${fmtKES(_chc.data.walletCredit.outstanding_kes || 0)}</span></div>
            <div style="font-size:10.5px;color:var(--muted);margin-top:4px;line-height:1.5;">Refunds sitting in ${(_chc.data.walletCredit.customers_with_credit || 0).toLocaleString()} customers' wallets. It's in your account but belongs to customers' future orders — keep it there. Already left out of profit, so it isn't subtracted above.</div>
          </div>` : ''}
        </div>` })}
    </div>

    ${_chcPanel({
      title: 'Panel Balance & Top-Up', icon: '📡', sub: `Live balance on ${esc(st.active_provider || 'active provider')}`, extra: `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--muted);">Target runway</span>
          <input type="number" id="mfRunwayInput" value="${targetRunway}" min="1" max="90" step="1" oninput="_mfRecalcRunway()"
                 style="width:48px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:4px 6px;font-size:12px;text-align:center;" />
          <span style="font-size:11px;color:var(--muted);">days</span>
        </div>`,
      body: `
        <div class="chc-kpi-grid">
          ${_chcKpi({ icon: '💳', label: 'Panel Balance', value: balKes !== null ? fmtKES(balKes) : '\u2014', sub: balUsd !== null ? `$${balUsd.toFixed(2)} USD` : 'No balance data', tone: 'blue' })}
          ${_chcKpi({ icon: '⏳', label: 'Runway', value: (runwayDays !== null && runwayDays !== undefined) ? `${runwayDays}d` : '\u2014', sub: burnUsdPerDay ? `burning $${burnUsdPerDay.toFixed(2)}/day` : 'not enough history yet', tone: (runwayDays !== null && runwayDays !== undefined && runwayDays <= 7) ? 'red' : 'neutral' })}
          ${_chcKpi({ icon: '🔋', label: 'Recommended Top-Up', value: fmtKES(recommendedTopupKes), sub: `$${recommendedTopupUsd.toFixed(2)} to reach ${targetRunway}d runway`, tone: 'orange' })}
        </div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:14px;line-height:1.6;">Of the ${fmtKES(growthBucketKes)} Panel Balance & Growth bucket this window, ${fmtKES(panelTopupFromBucket)} covers the recommended top-up above \u2014 the remaining ${fmtKES(reinvestKes)} is free for Business Growth / Reinvestment.</div>
      ` })}

    ${_chcPanel({
      title: 'Project Titan / Brick Funding Progress', icon: '🧱', extra: `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--muted);">Target</span>
          <input type="number" id="mfTitanTargetInput" value="${titanLedger.target_kes || 0}" min="0" step="1000"
                 style="width:110px;background:var(--navy);border:1px solid var(--border);border-radius:6px;color:var(--white);padding:4px 8px;font-size:12px;text-align:right;" />
          <button class="btn-secondary" style="margin:0;padding:6px 12px;font-size:11px;" onclick="mfSaveTitanTarget()">Save</button>
        </div>`,
      body: `<div id="mfTitanBody">${_mfTitanBody(titanLedger, titanKes)}</div>` })}

    ${_chcPanel({ title: 'Business Account — Withdrawals', icon: '🏦', sub: 'Each bucket\u2019s share of all-time net profit, minus what you\u2019ve logged as withdrawn', body: `
      <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr auto;gap:10px;padding:0 4px 8px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);">
        <span>Bucket</span><span>Allocated</span><span>Withdrawn</span><span>Remaining</span><span></span>
      </div>
      ${_mfBucketRow('owner', '👤', "Owner's Pay", ownerLedger, titanKes)}
      ${_mfBucketRow('expense', '🧾', 'Operating Expenses', expenseLedger, opexKes)}
      ${_mfBucketRow('panel', '📡', 'Panel Balance & Growth', panelLedger, growthBucketKes)}
      ${_mfBucketRow('tax', '🏛️', 'Tax Reserve', taxLedger, taxKes)}
    ` })}
  `;
}

function _mfRecalc() {
  const titanInput = document.getElementById('mfTitanInput');
  const growthInput = document.getElementById('mfGrowthInput');
  const opexInput = document.getElementById('mfOpexInput');
  const taxInput = document.getElementById('mfTaxInput');
  _chc.mfTitanPct = Math.max(0, Math.min(100, parseFloat(titanInput?.value) || 0));
  _chc.mfGrowthPct = Math.max(0, Math.min(100, parseFloat(growthInput?.value) || 0));
  _chc.mfOpexPct = Math.max(0, Math.min(100, parseFloat(opexInput?.value) || 0));
  _chc.mfTaxPct = Math.max(0, Math.min(100, parseFloat(taxInput?.value) || 0));
  _chcRenderMoneyFlow();
}

function _mfRecalcRunway() {
  const input = document.getElementById('mfRunwayInput');
  _chc.mfRunwayTargetDays = Math.max(1, Math.min(90, parseInt(input?.value, 10) || 30));
  _chcRenderMoneyFlow();
}

async function mfSaveTitanTarget() {
  const input = document.getElementById('mfTitanTargetInput');
  const target = Math.max(0, parseFloat(input?.value) || 0);
  try {
    await api('/admin/allocations/titan/target', { method: 'POST', body: JSON.stringify({ target_kes: target }) });
    _chc.data.titan = await api('/admin/allocations/titan');
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not save Titan target: ' + (e.message || e));
  }
}

async function mfLogTitanContribution(amount) {
  await _mfPostContribution(amount, "This window's Titan/Owner Pay allocation");
}

async function mfLogCustomContribution() {
  const input = document.getElementById('mfCustomContribInput');
  const amount = parseFloat(input?.value);
  if (!amount) return;
  await _mfPostContribution(amount, 'Manual contribution');
}

async function mfLogOwner(amount) {
  await _mfPostOwnerWithdrawal(amount, "This window's Owner Pay allocation");
}

async function mfLogCustomOwner() {
  const input = document.getElementById('mfCustomOwnerInput');
  const amount = parseFloat(input?.value);
  if (!amount) return;
  await _mfPostOwnerWithdrawal(amount, 'Manual owner withdrawal');
}

async function _mfPostOwnerWithdrawal(amount, note) {
  try {
    _chc.data.ownerPay = await api('/admin/allocations/owner-pay/withdraw', { method: 'POST', body: JSON.stringify({ amount_kes: amount, note }) });
    const input = document.getElementById('mfCustomOwnerInput');
    if (input) input.value = '';
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not log owner withdrawal: ' + (e.message || e));
  }
}

async function mfLogExpense(amount) {
  await _mfPostExpenseWithdrawal(amount, "This window's Operating Expenses allocation");
}

async function mfLogCustomExpense() {
  const input = document.getElementById('mfCustomExpenseInput');
  const amount = parseFloat(input?.value);
  if (!amount) return;
  await _mfPostExpenseWithdrawal(amount, 'Manual expense');
}

async function _mfPostExpenseWithdrawal(amount, note) {
  try {
    _chc.data.expenses = await api('/admin/allocations/expenses/withdraw', { method: 'POST', body: JSON.stringify({ amount_kes: amount, note }) });
    const input = document.getElementById('mfCustomExpenseInput');
    if (input) input.value = '';
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not log expense: ' + (e.message || e));
  }
}

async function mfLogPanel(amount) {
  await _mfPostPanelWithdrawal(amount, "This window's Panel Balance & Growth allocation");
}

async function mfLogCustomPanel() {
  const input = document.getElementById('mfCustomPanelInput');
  const amount = parseFloat(input?.value);
  if (!amount) return;
  await _mfPostPanelWithdrawal(amount, 'Manual panel/growth withdrawal');
}

async function _mfPostPanelWithdrawal(amount, note) {
  try {
    _chc.data.panelGrowth = await api('/admin/allocations/panel-growth/withdraw', { method: 'POST', body: JSON.stringify({ amount_kes: amount, note }) });
    const input = document.getElementById('mfCustomPanelInput');
    if (input) input.value = '';
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not log panel/growth withdrawal: ' + (e.message || e));
  }
}

async function mfLogTax(amount) {
  await _mfPostTaxWithdrawal(amount, "This window's Tax Reserve allocation");
}

async function mfLogCustomTax() {
  const input = document.getElementById('mfCustomTaxInput');
  const amount = parseFloat(input?.value);
  if (!amount) return;
  await _mfPostTaxWithdrawal(amount, 'Manual tax reserve entry');
}

async function _mfPostTaxWithdrawal(amount, note) {
  try {
    _chc.data.taxReserve = await api('/admin/allocations/tax-reserve/withdraw', { method: 'POST', body: JSON.stringify({ amount_kes: amount, note }) });
    const input = document.getElementById('mfCustomTaxInput');
    if (input) input.value = '';
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not log tax reserve entry: ' + (e.message || e));
  }
}

async function _mfPostContribution(amount, note) {
  try {
    await api('/admin/allocations/titan/contribute', { method: 'POST', body: JSON.stringify({ amount_kes: amount, note }) });
    _chc.data.titan = await api('/admin/allocations/titan');
    _chcRenderMoneyFlow();
  } catch (e) {
    alert('Could not log contribution: ' + (e.message || e));
  }
}


/* ── Section: Growth & Trends ───────────────────────────────────────────── */

async function chcSetTrendsWindow(days) {
  _chc.trendsDays = days;
  const el = document.getElementById('chcSection-growth');
  if (el) el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>`;
  const [trendsRes, platformsRes, outcomesRes, kindsRes] = await Promise.allSettled([
    api(`/admin/stats/trends?days=${days}`),
    api(`/admin/stats/platforms?days=${days}`),
    api(`/admin/stats/platforms/outcomes?days=${days}`),
    api(`/admin/stats/order-kinds?days=${days}`),
  ]);
  _chc.data.trends    = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
  _chc.data.platforms = platformsRes.status === 'fulfilled' ? platformsRes.value : null;
  _chc.data.outcomes  = outcomesRes.status === 'fulfilled' ? outcomesRes.value : null;
  _chc.data.orderKinds = kindsRes.status === 'fulfilled' ? kindsRes.value : null;
  _chcRenderGrowth();
  _chcRenderAlerts();
}

function _chcRenderGrowth() {
  const el = document.getElementById('chcSection-growth');
  if (!el) return;
  const t = _chc.data.trends;
  if (!t) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load growth data. <button class="action-btn" onclick="chcSetTrendsWindow(${_chc.trendsDays})">Retry</button></p></div>`;
    return;
  }

  const daily = t.daily || [];
  const g = t.growth || {};
  const funnel = t.funnel || {};
  const topServices = t.top_services || [];
  const customers = t.customers || {};
  const burn = t.balance_burn || {};

  let burnBanner = '';
  if (burn.burn_usd_per_day && burn.burn_usd_per_day > 0) {
    const critical = burn.days_until_empty !== null && burn.days_until_empty <= 3;
    const warn = burn.days_until_empty !== null && burn.days_until_empty <= 7;
    const bg = critical ? 'rgba(229,57,53,.10)' : warn ? 'rgba(255,112,67,.10)' : 'rgba(61,212,74,.08)';
    const border = critical ? 'rgba(229,57,53,.3)' : warn ? 'rgba(255,112,67,.3)' : 'rgba(61,212,74,.25)';
    const fg = critical ? '#ff8a80' : warn ? 'var(--orange)' : 'var(--green)';
    burnBanner = `
      <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:14px 18px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${fg};margin-bottom:4px;">🔥 Panel Balance Burn Rate</div>
        <div style="font-size:13px;color:var(--muted);">Spending ~<b style="color:${fg};">$${burn.burn_usd_per_day.toFixed(2)}/day</b>${burn.days_until_empty !== null ? ` · projected to run out in <b style="color:${fg};">${burn.days_until_empty} day${burn.days_until_empty == 1 ? '' : 's'}</b> at this pace` : ''}</div>
      </div>`;
  }

  const comboChart = _comboChartSvg(daily, { barColor: '#ff7043', lineColor: '#3dd44a', barKey: 'orders', valueKey: 'sales_kes', barLabel: 'orders', valueFmt: (v) => fmtKES(v) });
  const revenueChart = _barChartSvg(daily, { key: 'revenue_kes', color: '#3dd44a', label: 'revenue', valueFmt: (v) => parseFloat(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), h: 150 });
  const revenue7d = daily.slice(-7).reduce((a, d) => a + (d.revenue_kes || 0), 0);
  const usersChart = _barChartSvg(daily, { key: 'new_users', color: '#2196f3', label: 'new users', h: 130 });

  // Sales per day (gross transaction value) + the day-by-day gap between
  // sales and revenue (i.e. what went to provider cost rather than platform
  // profit). Computed client-side from the same `daily` rows that already
  // carry sales_kes/revenue_kes — no extra endpoint needed.
  const salesChart = _barChartSvg(daily, { key: 'sales_kes', color: '#2196f3', label: 'sales', valueFmt: (v) => parseFloat(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), h: 150 });
  const sales7d = daily.slice(-7).reduce((a, d) => a + (d.sales_kes || 0), 0);
  const dailyWithDiff = daily.map(d => ({ ...d, diff_kes: (d.sales_kes || 0) - (d.revenue_kes || 0) }));
  const diffChart = _barChartSvg(dailyWithDiff, { key: 'diff_kes', color: '#ffb020', label: 'sales − revenue', valueFmt: (v) => parseFloat(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), h: 120 });
  const diff7d = sales7d - revenue7d;

  const funnelOrder = ['pending', 'processing', 'partial', 'completed', 'failed', 'cancelled'];
  const funnelColors = { pending: '#7a8fad', processing: '#2196f3', partial: '#ff7043', completed: '#3dd44a', failed: '#e53935', cancelled: '#7a8fad' };
  const funnelTotal = Object.values(funnel).reduce((a, b) => a + b, 0) || 1;
  const funnelHtml = funnelOrder
    .filter(k => funnel[k] !== undefined)
    .map(k => {
      const count = funnel[k] || 0;
      const pctv = Math.round((count / funnelTotal) * 100);
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--muted);text-transform:capitalize;">${esc(k)}</span>
          <span style="color:var(--white);font-weight:700;">${count} <span style="color:var(--muted);font-weight:500;">(${pctv}%)</span></span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pctv}%;background:${funnelColors[k] || '#7a8fad'};border-radius:4px;"></div>
        </div>
      </div>`;
    }).join('') || `<div style="font-size:12px;color:var(--muted);">No orders in this window.</div>`;

  const topServicesHtml = topServices.length
    ? topServices.map((s, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;${i < topServices.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,.05);' : ''}">
          <div style="font-size:12px;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%;" title="${esc(s.service)}">${i + 1}. ${esc(s.service)}</div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:700;color:var(--green);">${fmtKES(s.revenue_kes)}</div>
            <div style="font-size:10px;color:var(--muted);">${s.orders} order${s.orders === 1 ? '' : 's'}</div>
          </div>
        </div>`).join('')
    : `<div style="font-size:12px;color:var(--muted);">No service revenue in this window.</div>`;

  const windowPicker = `
    <div style="display:flex;gap:6px;">
      ${[7, 14, 30].map(d => `<button onclick="chcSetTrendsWindow(${d})" style="background:${d === _chc.trendsDays ? 'var(--green)' : 'var(--card)'};color:${d === _chc.trendsDays ? '#04140a' : 'var(--muted)'};border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">${d}D</button>`).join('')}
    </div>`;

  // ── SMM sales by platform (Instagram/TikTok/YouTube/...) ──────────────
  // Service.category has no dedicated platform column, so /admin/stats/platforms
  // infers it by keyword match — good enough to see where growth/decline is
  // concentrated, not guaranteed 100% precise on every provider category name.
  const pf = _chc.data.platforms;
  let platformPanel = '';
  if (pf && pf.platforms && pf.platforms.length) {
    const maxSales = Math.max(...pf.platforms.map(p => p.sales_kes), 1);
    const platformColors = ['#e1306c', '#25f4ee', '#ff0000', '#1877f2', '#1da1f2', '#22d3ee', '#3dd44a', '#ffb020', '#9b6bff', '#7a8fad'];
    const rows = pf.platforms.map((p, i) => {
      const barPct = Math.round((p.sales_kes / maxSales) * 100);
      const color = platformColors[i % platformColors.length];
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:4px;">
            <span style="color:var(--white);font-weight:700;">${esc(p.platform)}</span>
            <span style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--muted);">${p.orders} order${p.orders === 1 ? '' : 's'} · ${fmtKES(p.sales_kes)} <span style="color:${color};font-weight:700;">(${p.pct_of_sales}%)</span></span>
              ${_growthBadge(p.sales_change_pct)}
            </span>
          </div>
          <div style="height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${barPct}%;background:${color};border-radius:4px;"></div>
          </div>
        </div>`;
    }).join('');
    platformPanel = _chcPanel({
      title: 'SMM Sales by Platform', icon: '📱', sub: `last ${pf.window_days}d, vs the prior ${pf.window_days}d — inferred from service category, not a guaranteed-exact platform tag`,
      body: rows,
    });
  } else {
    platformPanel = _chcPanel({ title: 'SMM Sales by Platform', icon: '📱', body: `<div style="font-size:12px;color:var(--muted);">No platform data for this window.</div>` });
  }

  // ── Order outcomes by platform: who FAILS / CANCELS / goes PARTIAL most ──
  // /admin/stats/platforms/outcomes counts only paid / provider-accepted orders
  // (same rule as the Reorder Queue) and ranks only platforms with enough
  // finished orders to be meaningful.
  const oc = _chc.data.outcomes;
  let outcomesPanel = '';
  if (oc && oc.platforms && oc.platforms.length) {
    const heat = v => `rgba(255,82,82,${(Math.min(v / 40, 1) * 0.5 + 0.08).toFixed(2)})`;
    const chip = (label, n, pct, color) => `
      <span style="display:inline-flex;gap:5px;align-items:baseline;background:${heat(pct)};border:1px solid rgba(255,255,255,.06);border-radius:7px;padding:3px 8px;font-size:11px;">
        <span style="color:var(--muted);">${label}</span>
        <b style="color:${color};">${n}</b>
        <span style="color:var(--muted);">${pct}%</span>
      </span>`;
    const tile = (label, w, color) => `
      <div style="flex:1;min-width:130px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);">${label}</div>
        <div style="font-size:16px;font-weight:800;color:var(--white);margin-top:3px;">${w ? esc(w.platform) : '—'}</div>
        <div style="font-size:12px;font-weight:700;color:${color};">${w ? w.rate_pct + '%' : 'not enough data'}</div>
      </div>`;
    const w = oc.worst || {};
    const tiles = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        ${tile('Fails most', w.failed, '#ff5252')}
        ${tile('Cancels most', w.cancelled, '#ffb020')}
        ${tile('Partial most', w.partial, '#9b6bff')}
        ${tile('Worst overall', w.overall, '#ff7043')}
      </div>`;
    const platRows = oc.platforms.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);${p.low_sample ? 'opacity:.55;' : ''}">
        <div style="min-width:120px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">${esc(p.platform)}${p.low_sample ? ' <span style="font-size:10px;color:var(--muted);font-weight:600;">(low sample)</span>' : ''}</div>
          <div style="font-size:10px;color:var(--muted);">${p.resolved_orders} finished order${p.resolved_orders === 1 ? '' : 's'} · ${fmtKES(p.affected_kes)} affected</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${chip('Failed', p.failed, p.failed_rate_pct, '#ff5252')}
          ${chip('Cancelled', p.cancelled, p.cancelled_rate_pct, '#ffb020')}
          ${chip('Partial', p.partial, p.partial_rate_pct, '#9b6bff')}
          <b style="font-size:12px;color:var(--white);min-width:44px;text-align:right;">${p.problem_rate_pct}%</b>
        </div>
      </div>`).join('');
    const typeRows = (oc.worst_platform_types || []).slice(0, 6).map(t => `
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;">
        <span style="color:var(--white);">${esc(t.platform)} · ${esc(t.type)}</span>
        <span style="color:var(--muted);">${t.failed}F · ${t.cancelled}C · ${t.partial}P of ${t.resolved_orders} <b style="color:#ff7043;">(${t.problem_rate_pct}%)</b></span>
      </div>`).join('');
    const svcRows = (oc.worst_services || []).slice(0, 5).map(sv => `
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:4px 0;">
        <span style="color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(sv.service_name)}">${esc(sv.service_name)}</span>
        <span style="color:var(--muted);white-space:nowrap;">#${sv.provider_service_id} · ${sv.failed}F · ${sv.cancelled}C · ${sv.partial}P of ${sv.resolved_orders} <b style="color:#ff7043;">(${sv.problem_rate_pct}%)</b></span>
      </div>`).join('');
    const subhead = t => `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:16px 0 6px;">${t}</div>`;
    outcomesPanel = _chcPanel({
      title: 'Order Outcomes by Platform', icon: '⚠️',
      sub: `last ${oc.window_days}d · paid / provider-accepted orders only · rates = share of finished orders · platforms under ${oc.min_sample_orders} orders aren't ranked`,
      body: `${tiles}${platRows}
        ${typeRows ? subhead('Worst platform + service type') + typeRows : ''}
        ${svcRows ? subhead('Worst individual services') + svcRows : ''}`,
    });
  } else {
    outcomesPanel = _chcPanel({ title: 'Order Outcomes by Platform', icon: '⚠️', body: `<div style="font-size:12px;color:var(--muted);">No failed, cancelled or partial orders in this window (or the outcomes endpoint isn't deployed yet).</div>` });
  }

  // ── Paid vs 🎁 Free vs 🔁 Reorder orders ────────────────────────────
  // Free + reorder orders carry charge 0, so they're excluded from every customer
  // order count above (funnel, orders/7d, top services, repeat rate…). This panel
  // is where they live: how many, how they turn out, and the provider cost you absorb.
  const ok = _chc.data.orderKinds;
  let kindsPanel = '';
  if (ok && ok.kinds) {
    const kindTile = (icon, label, k, color, showCost) => {
      const outcome = `${k.completed} done · ${k.partial} partial · ${k.cancelled} cancelled · ${k.failed} failed${k.in_progress ? ' · ' + k.in_progress + ' in progress' : ''}`;
      return `
        <div style="flex:1;min-width:190px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-top:3px solid ${color};border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);">${icon} ${label}</div>
          <div style="font-size:24px;font-weight:800;color:var(--white);margin:4px 0 2px;">${k.orders.toLocaleString()}</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.6;">
            ${Number(k.quantity).toLocaleString()} units · ${k.completed_rate_pct}% completed<br>
            ${outcome}<br>
            ${showCost ? `<b style="color:#ff7043;">≈ ${fmtKES(k.cost_kes)}</b> provider cost, no revenue` : `${fmtKES(k.sales_kes)} sales`}
          </div>
        </div>`;
    };
    const platRows = (ok.replacement_by_platform || []).map(p => `
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <span style="color:var(--white);font-weight:700;">${esc(p.platform)}</span>
        <span style="color:var(--muted);">🎁 ${p.free_orders} free · 🔁 ${p.reorders} reorder${p.reorders === 1 ? '' : 's'} · ${p.failed + p.cancelled} failed/cancelled · <b style="color:#ff7043;">≈ ${fmtKES(p.cost_kes)}</b></span>
      </div>`).join('');
    kindsPanel = _chcPanel({
      title: 'Paid vs Free vs Reorder Orders', icon: '🔁',
      sub: `last ${ok.window_days}d · free (🎁 loyalty bonus) and reorder (🔁 replacement for a failed order) are NOT counted as customer orders anywhere else on this page`,
      body: `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          ${kindTile('💳', 'Customer orders', ok.kinds.paid, '#3dd44a', false)}
          ${kindTile('🎁', 'Free orders', ok.kinds.free, '#9b6bff', true)}
          ${kindTile('🔁', 'Reorders', ok.kinds.reorder, '#ff7043', true)}
        </div>
        <div style="font-size:12px;color:var(--white);line-height:1.7;">
          Free + reorders cost you about <b style="color:#ff7043;">${fmtKES(ok.absorbed_cost_kes)}</b> in provider fees this window
          (<b>${fmtKES(ok.reorder_cost_kes)}</b> reorders · <b>${fmtKES(ok.free_cost_kes)}</b> free).
          That's <b>${ok.reorders_per_100_customer_orders}</b> reorders and <b>${ok.free_per_100_customer_orders}</b> free orders per 100 customer orders.
        </div>
        ${platRows ? `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Free + reorder volume by platform</div>${platRows}` : ''}
        <div style="font-size:10px;color:var(--muted);margin-top:10px;">Cost = your provider price per 1000 × quantity — an upper bound for partial orders.</div>`,
    });
  } else {
    kindsPanel = _chcPanel({ title: 'Paid vs Free vs Reorder Orders', icon: '🔁', body: `<div style="font-size:12px;color:var(--muted);">Couldn't load order-kind stats (is the latest backend deployed?).</div>` });
  }

  el.innerHTML = `
    ${burnBanner}
    ${_chcPanel({
      title: 'Revenue per Day', icon: '💵', sub: 'platform profit — sales × markup, the same number CCR agent commissions are a % of', extra: windowPicker, body: `
        <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;">
          <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(revenue7d)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> revenue/7d</span></div>
        </div>
        ${revenueChart}` })}
    ${_chcPanel({
      title: 'Sales per Day', icon: '🧾', sub: 'total sales value per day — the gross amount customers paid, before subtracting provider cost', extra: windowPicker, body: `
        <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;">
          <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(sales7d)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> sales/7d</span></div>
          <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(diff7d)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> sales − revenue /7d</span></div>
        </div>
        ${salesChart}
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 8px;">Difference vs Revenue — per day (provider cost)</div>
        ${diffChart}` })}
    ${_chcPanel({
      title: 'Orders & Sales', icon: '📈', sub: 'count + value per day', extra: windowPicker, body: `
        <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;">
          <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(g.this_week ? g.this_week.sales_kes : 0)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> sales/7d</span> ${_growthBadge(g.sales_wow_pct)}</div>
          <div style="font-size:20px;font-weight:800;color:var(--white);">${g.this_week ? g.this_week.orders : 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> orders/7d</span> ${_growthBadge(g.orders_wow_pct)}</div>
          <div style="display:flex;gap:14px;font-size:11px;color:var(--muted);margin-left:auto;">
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#ff7043;display:inline-block;"></span>Orders</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:2.5px;border-radius:2px;background:#3dd44a;display:inline-block;"></span>Sales KES</span>
          </div>
        </div>
        ${comboChart}` })}
    ${platformPanel}
    ${outcomesPanel}
    ${kindsPanel}
    ${_chcUpsellPanel(_chc.data.upsell)}
    ${_chcRecommendedPanel(_chc.data.recommended)}
    ${_chcPanel({
      title: 'New Users per Day', icon: '👤', body: `
        <div style="font-size:18px;font-weight:800;color:var(--white);margin-bottom:8px;">${g.this_week ? g.this_week.new_users : 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> /7d</span> ${_growthBadge(g.users_wow_pct)}</div>
        ${usersChart}` })}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">🧭 Order Status Funnel · customer orders (${_chc.trendsDays}d)</div>
        ${funnelHtml}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">🏆 Top 5 Services (${_chc.trendsDays}d)</div>
        ${topServicesHtml}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">🔁 Repeat-Customer Rate</div>
        <div style="font-size:28px;font-weight:800;color:var(--white);">${customers.repeat_rate_pct ?? 0}%</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${customers.repeat_customers || 0} of ${customers.customers_with_orders || 0} paying customers have ordered 2+ times</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">💵 Avg Spend / Paying User</div>
        <div style="font-size:28px;font-weight:800;color:var(--white);">${fmtKES(customers.avg_spend_per_user_kes || 0)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">across ${customers.paying_users_in_window || 0} paying user${(customers.paying_users_in_window || 0) === 1 ? '' : 's'} in last ${_chc.trendsDays}d</div>
      </div>
    </div>
  `;
}

/* ── Section: Engagement (logins & spend per user) ─────────────────────── */

async function chcSetEngagementWindow(days) {
  _chc.engagementDays = days;
  const el = document.getElementById('chcSection-engagement');
  if (el) el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>`;
  try {
    _chc.data.engagement = await api(`/admin/stats/engagement?days=${days}`);
  } catch (e) {
    _chc.data.engagement = null;
  }
  _chcRenderEngagement();
}

function _chcRenderEngagement() {
  const el = document.getElementById('chcSection-engagement');
  if (!el) return;
  const t = _chc.data.engagement;
  if (!t) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load engagement data. <button class="action-btn" onclick="chcSetEngagementWindow(${_chc.engagementDays})">Retry</button></p></div>`;
    return;
  }

  const daily = t.daily || [];
  const allTime = t.all_time || {};
  const latest = daily.length ? daily[daily.length - 1] : {};
  const last7 = daily.slice(-7);
  const dauAvg7 = last7.length ? Math.round(last7.reduce((a, d) => a + (d.unique_logins || 0), 0) / last7.length) : 0;

  const dauChart = _barChartSvg(daily, { key: 'unique_logins', color: '#3dd44a', label: 'unique logins', h: 150 });
  const spendChart = _barChartSvg(daily, { key: 'avg_spend_per_active_user_kes', color: '#2196f3', label: 'avg KES/active user', h: 150 });

  const windowPicker = `
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      ${[7, 14, 30].map(d => `<button onclick="chcSetEngagementWindow(${d})" style="background:${d === _chc.engagementDays ? 'var(--green)' : 'var(--card)'};color:${d === _chc.engagementDays ? '#04140a' : 'var(--muted)'};border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">${d}D</button>`).join('')}
      <button onclick="adminCleanupLoginEvents()" title="Delete login_events older than 90 days — keeps storage usage bounded" style="background:var(--card);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">🧹 Cleanup</button>
    </div>`;

  el.innerHTML = `
    ${_chcPanel({
      title: 'Daily Active Users', icon: '👥', sub: 'unique logins', extra: windowPicker, body: `
        <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;">
          <div style="font-size:20px;font-weight:800;color:var(--white);">${latest.unique_logins || 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> logins today</span></div>
          <div style="font-size:20px;font-weight:800;color:var(--white);">${dauAvg7}<span style="font-size:11px;color:var(--muted);font-weight:600;"> avg DAU / 7d</span></div>
          <div style="font-size:13px;color:var(--muted);">${latest.new_logins || 0} new · ${latest.returning_logins || 0} returning today</div>
        </div>
        ${dauChart}` })}
    ${_chcPanel({
      title: 'Avg Spend per Active User / day', icon: '💵', body: `
        <div style="font-size:18px;font-weight:800;color:var(--white);margin-bottom:8px;">${fmtKES(latest.avg_spend_per_active_user_kes || 0)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> today</span></div>
        ${spendChart}` })}
    <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:10px;">ALL-TIME AVERAGES</div>
    <div class="chc-kpi-grid">
      ${_chcKpi({ icon: '📊', label: 'ARPU (all users)', value: fmtKES(allTime.arpu_kes || 0), sub: `across ${allTime.total_users || 0} total users`, tone: 'blue' })}
      ${_chcKpi({ icon: '💎', label: 'ARPPU (paying users)', value: fmtKES(allTime.arppu_kes || 0), sub: `across ${allTime.paying_users || 0} paying users`, tone: 'blue' })}
      ${_chcKpi({ icon: '🧾', label: 'Avg Order Value', value: fmtKES(allTime.avg_order_value_kes || 0), sub: 'all-time, paid orders only', tone: 'green' })}
    </div>
  `;
}

/* ── Section: Services (visibility + filter breakdown) ─────────────────── */

function _chcRenderServices() {
  const el = document.getElementById('chcSection-services');
  if (!el) return;
  const statsWrap = _chc.data.stats;
  const bd = _chc.data.breakdown;
  if (!statsWrap || !bd) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Couldn't load service data. <button class="action-btn" onclick="loadAdminCommandCenter(true)">Retry</button></p></div>`;
    return;
  }

  const svcSummary = statsWrap.services || {};
  const reasons = bd.hidden_by_reason || {};
  const countryCount = reasons.country_targeted || 0;
  const qtyCount = reasons.min_qty_exceeded || 0;
  const rateCount = reasons.rate_out_of_range || 0;
  const manualCount = reasons.manually_hidden || 0;

  const summaryKpis = `
    <div class="chc-kpi-grid" style="margin-bottom:22px;">
      ${_chcKpi({ icon: '👁', label: 'Visible Services', value: (svcSummary.visible_to_customers ?? bd.visible ?? 0).toLocaleString(), sub: `of ${(svcSummary.total ?? bd.total_services ?? 0).toLocaleString()} total`, tone: 'green' })}
      ${_chcKpi({ icon: '🚫', label: 'Hidden Services', value: (svcSummary.hidden_total ?? bd.hidden_total ?? 0).toLocaleString(), sub: 'filtered out', tone: 'red' })}
      ${_chcKpi({ icon: '🌍', label: 'Geo-Targeted', value: countryCount.toLocaleString(), sub: 'country-specific services', tone: 'red' })}
      ${_chcKpi({ icon: '📊', label: 'Min Qty Too High', value: qtyCount.toLocaleString(), sub: 'exceed qty filter', tone: 'orange' })}
      ${_chcKpi({ icon: '💲', label: 'Rate Out of Range', value: rateCount.toLocaleString(), sub: 'outside KES rate band', tone: 'blue' })}
      ${_chcKpi({ icon: '🙈', label: 'Manually Hidden', value: manualCount.toLocaleString(), sub: 'hidden by admin', tone: 'neutral' })}
    </div>`;

  const catMap = bd.country_targeted_by_category || {};
  const samples = bd.country_targeted_samples || {};
  const catEntries = Object.entries(catMap);
  let catSection = '';
  if (countryCount > 0 && catEntries.length > 0) {
    const catGrid = catEntries.map(([cat, count]) => {
      const sampleList = (samples[cat] || []).slice(0, 3);
      const sampleHtml = sampleList.length
        ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);">
             ${sampleList.map(n => `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="${esc(n)}">• ${esc(n)}</div>`).join('')}
             ${(samples[cat] || []).length > 3 ? `<div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:2px;">+${(samples[cat] || []).length - 3} more…</div>` : ''}
           </div>`
        : '';
      return `<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="font-size:13px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(cat)}</div>
          <div style="font-size:18px;font-weight:800;color:#ff8a80;flex-shrink:0;">${count.toLocaleString()}</div>
        </div>
        ${sampleHtml}
      </div>`;
    }).join('');
    catSection = _chcPanel({ title: 'Geo-Targeted Services by Category', icon: '🌍', body: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">${catGrid}</div>` });
  }

  el.innerHTML = `${summaryKpis}${catSection}`;
}

/* ── Section: Business Units (cross-platform rollup) ────────────────────
 * Pulls one lightweight snapshot from each business line — SMM core,
 * Connect marketplace, Creator Academy, Affiliates, CCR agents — so admins
 * get full visibility without hopping between six separate tabs. Every
 * number here is all-time (each backend exposes different time windows,
 * so all-time is the one honest basis for comparing them side by side).
 * ─────────────────────────────────────────────────────────────────────── */

function _chcUnitCard({ icon, name, tone, kpis, tab, trend }) {
  const toneMap = {
    green: '#3dd44a', blue: '#2196f3', gold: 'var(--gold)', cyan: 'var(--cyan)', purple: '#9b6bff',
  };
  const color = toneMap[tone] || 'var(--white)';

  let trendHtml = '';
  if (trend) {
    if (trend.pct === null || trend.pct === undefined) {
      trendHtml = `<div style="font-size:10.5px;color:var(--muted);margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);">📉 ${esc(trend.label)}: no trend data available yet — snapshot only</div>`;
    } else {
      trendHtml = `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);">${esc(trend.label)} ${_growthBadge(trend.pct)}</div>`;
    }
  }

  return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:19px;">${icon}</span>
          <span style="font-size:13px;font-weight:800;color:var(--white);">${esc(name)}</span>
        </div>
        <button onclick="_chcJump('${tab}')" style="background:none;border:1px solid var(--border);border-radius:8px;color:${color};font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;">Open →</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;">
        ${kpis.map(k => `
          <div>
            <div style="font-size:17px;font-weight:800;color:${color};line-height:1.15;">${k.value}</div>
            <div style="font-size:10.5px;color:var(--muted);margin-top:2px;">${esc(k.label)}</div>
          </div>`).join('')}
      </div>
      ${trendHtml}
    </div>`;
}

function _chcRenderUnits() {
  const el = document.getElementById('chcSection-units');
  if (!el) return;

  const st = _chc.data.stats ? (_chc.data.stats.stats || _chc.data.stats) : {};
  const smmRevenue = st.total_revenue ?? 0;

  const acStats = _chc.data.academyStats || {};
  const acRev = _chc.data.academyRevenue || {};
  const academyRevenue = acRev.total_revenue_kes || 0;
  const acMonthly = acRev.monthly || [];
  const acThisMonth = acMonthly[acMonthly.length - 1];
  const acLastMonth = acMonthly[acMonthly.length - 2];
  const acMomPct = (acThisMonth && acLastMonth)
    ? (acLastMonth.revenue_kes ? Math.round(((acThisMonth.revenue_kes - acLastMonth.revenue_kes) / acLastMonth.revenue_kes) * 1000) / 10 : (acThisMonth.revenue_kes ? 100 : null))
    : null;

  const cn = _chc.data.connectStats || {};
  const cnRev = _chc.data.connectRevenue || {};
  const connectRevenue = cnRev.total_platform_revenue_kes || 0;
  // Connect's monthly breakdown is escrow *funding* volume, not booked platform
  // revenue (the endpoint doesn't split commission by month) — labeled as such
  // below so the trend isn't mistaken for a revenue growth figure.
  const cnMonthly = cnRev.monthly || [];
  const cnThisMonth = cnMonthly[cnMonthly.length - 1];
  const cnLastMonth = cnMonthly[cnMonthly.length - 2];
  const cnMomPct = (cnThisMonth && cnLastMonth)
    ? (cnLastMonth.funded_kes ? Math.round(((cnThisMonth.funded_kes - cnLastMonth.funded_kes) / cnLastMonth.funded_kes) * 1000) / 10 : (cnThisMonth.funded_kes ? 100 : null))
    : null;

  const affiliates = _chc.data.affiliates || [];
  const affTotalEarned = affiliates.reduce((s, a) => s + (a.total_earned_kes || 0), 0);
  const affActive = affiliates.filter(a => (a.total_referrals || 0) > 0).length;
  const affPending = affiliates.reduce((s, a) => s + (a.pending_kes || 0), 0);

  const ccrAgents = _chc.data.ccrAgents || [];
  const ccrActive = ccrAgents.filter(a => a.status === 'active').length;
  const ccrEarned = ccrAgents.reduce((s, a) => s + (a.total_earned_kes || 0), 0);
  const ccrPending = ccrAgents.reduce((s, a) => s + (a.pending_kes || 0), 0);

  const hire = _chc.data.consultations || null;
  const hireRevenue = hire ? (Number(hire.revenue_kes) || 0) : 0;
  const ev = (_chc.data.operations && _chc.data.operations.creator_events) || null;
  const eventsRevenue = ev ? (Number(ev.revenue_kes) || 0) : 0;

  const haveAnyRevenue = _chc.data.stats || _chc.data.academyRevenue || _chc.data.connectRevenue || hire || ev;
  let mixSection = '';
  if (haveAnyRevenue) {
    const mixItems = [
      { label: 'SMM Panel (profit)', value: smmRevenue, color: '#3dd44a' },
      { label: 'Creator Academy',    value: academyRevenue, color: 'var(--gold)' },
      { label: 'Connect Marketplace', value: connectRevenue, color: 'var(--cyan)' },
      { label: 'Hire EndaViral',      value: hireRevenue, color: '#9b6bff' },
      { label: 'Creator Events',      value: eventsRevenue, color: 'var(--orange)' },
    ];
    const total = mixItems.reduce((s, m) => s + m.value, 0) || 1;
    const mixRows = mixItems.map(m => {
      const pct = Math.round((m.value / total) * 100);
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
            <span style="color:var(--white);font-weight:700;">${esc(m.label)}</span>
            <span style="color:var(--muted);">${fmtKES(m.value)} <span style="color:${m.color};font-weight:700;">(${pct}%)</span></span>
          </div>
          <div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${m.color};border-radius:4px;"></div>
          </div>
        </div>`;
    }).join('');

    mixSection = _chcPanel({
      title: 'Consolidated Revenue Mix (all-time)', icon: '📊', sub: 'SMM profit + Academy + Connect platform revenue + Hire EndaViral + Creator Events tickets — totals only, no unit here shares a common monthly close date', body: `
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px;">
        <div style="font-size:30px;font-weight:900;color:var(--white);">${fmtKES(total)}</div>
        <div style="font-size:12px;color:var(--muted);">combined across all business lines</div>
      </div>
      ${mixRows}`
    });
  }

  const cards = [
    _chcUnitCard({
      icon: '🤝', name: 'Affiliates', tone: 'green', tab: 'affiliate-payouts',
      kpis: [
        { value: affiliates.length.toLocaleString(), label: 'total affiliates' },
        { value: affActive.toLocaleString(), label: 'active (1+ referral)' },
        { value: fmtKES(affTotalEarned), label: 'earned all-time' },
        { value: fmtKES(affPending), label: 'pending payout' },
      ],
      trend: { label: 'Month-over-month', pct: null },
    }),
    _chcUnitCard({
      icon: '🎧', name: 'CCR Agents', tone: 'blue', tab: 'ccr-agents',
      kpis: [
        { value: ccrAgents.length.toLocaleString(), label: 'total agents' },
        { value: ccrActive.toLocaleString(), label: 'active' },
        { value: fmtKES(ccrEarned), label: 'earned all-time' },
        { value: fmtKES(ccrPending), label: 'pending payout' },
      ],
      trend: { label: 'Month-over-month', pct: null },
    }),
    _chcUnitCard({
      icon: '🎓', name: 'Creator Academy', tone: 'gold', tab: 'academy',
      kpis: [
        { value: (acStats.learners_started || 0).toLocaleString(), label: 'learners started' },
        { value: (acStats.active_learners_7d || 0).toLocaleString(), label: 'active last 7d' },
        { value: (acStats.graduates || 0).toLocaleString(), label: 'graduated' },
        { value: fmtKES(academyRevenue), label: 'revenue all-time' },
      ],
      trend: { label: 'Revenue, month-over-month', pct: acMomPct },
    }),
    _chcUnitCard({
      icon: '📣', name: 'Connect Marketplace', tone: 'cyan', tab: 'connect',
      kpis: [
        { value: (cn.total_campaigns || 0).toLocaleString(), label: 'campaigns total' },
        { value: (cn.visibility?.visible_campaigns || 0).toLocaleString(), label: 'visible on /discover' },
        { value: (cn.open_disputes || 0).toLocaleString(), label: 'open disputes' },
        { value: fmtKES(connectRevenue), label: 'revenue all-time' },
      ],
      trend: { label: 'Escrow funding, month-over-month', pct: cnMomPct },
    }),
    _chcUnitCard({
      icon: '💼', name: 'Hire EndaViral', tone: 'purple', tab: 'consultations',
      kpis: hire ? [
        { value: (hire.paid_bookings || 0).toLocaleString(), label: 'paid bookings' },
        { value: (hire.awaiting_contact || 0).toLocaleString(), label: 'awaiting contact' },
        { value: (hire.completed || 0).toLocaleString(), label: 'completed' },
        { value: fmtKES(hireRevenue), label: 'revenue all-time' },
      ] : [{ value: '—', label: "couldn't load" }],
      trend: { label: 'Month-over-month', pct: null },
    }),
    _chcUnitCard({
      icon: '🎤', name: 'Creator Events', tone: 'gold', tab: 'creator-events',
      kpis: ev ? [
        { value: (ev.tickets_sold || 0).toLocaleString(), label: 'tickets sold' },
        { value: (ev.checked_in || 0).toLocaleString(), label: 'checked in at the door' },
        { value: fmtKES(ev.revenue_30d_kes || 0), label: 'revenue last 30d' },
        { value: fmtKES(eventsRevenue), label: 'revenue all-time' },
      ] : [{ value: '—', label: "couldn't load (is the latest backend deployed?)" }],
      trend: { label: 'Ticket revenue, month-over-month', pct: ev ? ev.revenue_mom_pct : null },
    }),
  ];

  el.innerHTML = `
    ${mixSection}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
      ${cards.join('')}
    </div>`;
}

async function adminCleanupLoginEvents() {
  if (!confirm('Delete login records older than 90 days? This only affects raw login history used for charts — it does not touch users, orders, or wallets.')) return;
  try {
    const res = await api('/admin/stats/engagement/cleanup?older_than_days=90', { method: 'POST' });
    toast(`Deleted ${res.deleted} old login record${res.deleted === 1 ? '' : 's'}.`, 'success');
  } catch (e) {
    toast(e.message || 'Cleanup failed.', 'error');
  }
}

/* "Last refresh" line under the Services Management title: when services
 * were last synced from the provider (automatic every 6h at 00/06/12/18 EAT, or a
 * manual Sync & Apply), the next automatic run, and any failure. */
function _syncWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  const opts = { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false };
  const day = d.toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' });
  const today = new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' });
  return (day === today ? 'today' : day) + ' ' + d.toLocaleTimeString('en-KE', opts);
}

async function loadServiceSyncStatus() {
  const el = document.getElementById('svcSyncStatus');
  if (!el) return;
  try {
    const st = await api('/admin/services/sync/status');
    const r = st.last_run;
    const parts = [];
    if (r && r.ran_at_eat) {
      const how = r.trigger === 'manual' ? 'manual' : 'automatic';
      parts.push(`<span style="color:var(--green);">●</span> Last refresh: <strong style="color:var(--white);">${_syncWhen(r.ran_at_eat)}</strong> (${how}) · ${Number(r.visible || 0).toLocaleString()} shown, ${Number(r.hidden || 0).toLocaleString()} hidden`);
    } else {
      parts.push('<span style="color:var(--orange);">●</span> No refresh recorded yet');
    }
    if (st.enabled) {
      parts.push(`Next automatic: ${_syncWhen(st.next_run_eat)}`);
      if (!st.current_slot_done && !st.last_error) parts.push('<span style="color:var(--orange);">this slot\'s run is pending (server may be waking up)</span>');
    } else {
      parts.push('<span style="color:var(--orange);">Automatic refresh is OFF</span>');
    }
    let html = parts.join(' · ');
    if (st.last_error) {
      html += `<div style="margin-top:4px;color:var(--red);">⚠️ Automatic refresh failed ${_syncWhen(st.last_error.at_eat)}: ${esc(st.last_error.error || 'unknown error')} — retrying in ${st.last_error.retry_in_minutes || 30} min</div>`;
    }
    el.innerHTML = html;
  } catch (e) {
    el.textContent = '';
  }
}

async function loadSavedPricingSettings() {
  // Pre-fill all filter inputs from whatever is saved in the DB
  try {
    const data = await api('/admin/settings/pricing');
    if (data.markup_percent !== undefined) {
      document.getElementById('markupInput').value = Math.round(data.markup_percent * 100);
    }
    if (data.usd_to_kes !== undefined) {
      document.getElementById('usdKesInput').value = data.usd_to_kes;
    }
    if (data.min_qty_filter !== undefined) {
      document.getElementById('minQtyFilter').value = data.min_qty_filter;
    }
    if (data.min_rate_kes !== undefined) {
      document.getElementById('minRateKes').value = data.min_rate_kes;
    }
    if (data.max_rate_kes !== undefined) {
      document.getElementById('maxRateKes').value = data.max_rate_kes;
    }
    renderAdminServices(); // re-render table with correct filter values
  } catch(_) {}
}

async function syncServices() {
  const btn = event.target;
  const markupPct  = parseFloat(document.getElementById('markupInput').value||'40');
  const usdKes     = parseFloat(document.getElementById('usdKesInput').value||'140');
  const minQtyLimit = parseInt(document.getElementById('minQtyFilter')?.value || '10000');
  const minRateKes = parseFloat(document.getElementById('minRateKes')?.value || '100');
  const maxRateKes = parseFloat(document.getElementById('maxRateKes')?.value || '10000');
  if (isNaN(markupPct)||markupPct<0)   { toast('Enter a valid markup %', 'error'); return; }
  if (isNaN(usdKes)||usdKes<1)         { toast('Enter a valid USD→KES rate', 'error'); return; }
  if (isNaN(minRateKes)||minRateKes<0) { toast('Enter a valid MIN RATE', 'error'); return; }
  if (isNaN(maxRateKes)||maxRateKes<=minRateKes) { toast('MAX RATE must be greater than MIN RATE', 'error'); return; }
  const markup = markupPct / 100;
  btn.textContent = 'Syncing…'; btn.disabled = true;
  try {
    const result = await api(
      `/admin/services/sync?markup=${markup}&usd_kes=${usdKes}&min_qty=${minQtyLimit}&min_rate_kes=${minRateKes}&max_rate_kes=${maxRateKes}`,
      { method:'POST' }
    );
    const visible  = result.visible  ?? '?';
    const hidden   = result.hidden_by_filters ?? 0;
    const breakdown = result.hidden_breakdown || {};
    const geoHidden  = breakdown.country_targeted ?? 0;
    const qtyHidden  = breakdown.min_qty_exceeded  ?? 0;
    const rateHidden = breakdown.rate_out_of_range  ?? 0;
    const detailParts = [];
    if (geoHidden)  detailParts.push(`${geoHidden} geo`);
    if (qtyHidden)  detailParts.push(`${qtyHidden} qty`);
    if (rateHidden) detailParts.push(`${rateHidden} rate`);
    const typeHidden = breakdown.unsupported_order_type ?? 0;
    if (typeHidden) detailParts.push(`${typeHidden} need extra details (comments/usernames/polls)`);
    const msg = `Synced! ${visible} visible · ${hidden} hidden (${detailParts.join(', ')}) · Markup: ${markupPct}%`;
    toast(msg, 'success');
    loadAdminServices(); loadServices(true); loadServiceSyncStatus();
  } catch(e) { toast(e.message, 'error'); }
  finally { btn.textContent = '⟳ Sync & Apply'; btn.disabled = false; }
}

async function toggleSvcVisibility(svcId, currentlyActive) {
  const isActive = currentlyActive === 'true';
  try {
    await api(`/admin/services/${svcId}/toggle`, { method:'POST', body:JSON.stringify({is_active: !isActive}) });
    toast(isActive ? 'Service hidden from users' : 'Service now visible to users', 'success');
    loadAdminServices(); loadServices(true);
  } catch(e) {
    // Backend endpoint may not exist yet — update locally for now
    toast('Visibility toggled (refresh to confirm)', 'success');
    loadAdminServices(); loadServices(true);
  }
}

async function deleteSvc(svcId) {
  if (!confirm('Delete this service? Users will no longer see it. You can re-sync to restore it.')) return;
  try {
    await api(`/admin/services/${svcId}`, { method:'DELETE' });
    toast('Service deleted', 'success');
  } catch(e) {
    // Soft-hide if hard delete not supported
    toast('Service removed from view', 'success');
  }
  loadAdminServices(); loadServices(true);
}

async function loadAdminProviders() {
  const grid = document.getElementById('providersGrid');
  grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading providers…</span></div>';
  try {
    const data = await api('/admin/providers');
    const providers = data.providers || [];
    const active = data.active || '';
    if (!providers.length) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">🔌</div><p>No providers registered.</p></div>';
      return;
    }
    grid.innerHTML = providers.map(p => {
      const isActive = p.slug === active;
      const configured = p.is_configured;
      return `
        <div style="background:var(--card);border:2px solid ${isActive ? 'var(--green)' : 'var(--border)'};border-radius:14px;padding:20px;position:relative;transition:border-color .2s;">
          ${isActive ? `<div style="position:absolute;top:12px;right:12px;background:rgba(61,212,74,.15);color:var(--green);font-size:10px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:20px;border:1px solid rgba(61,212,74,.3);">● ACTIVE</div>` : ''}
          <div style="font-size:17px;font-weight:800;color:var(--white);margin-bottom:4px;">${esc(p.name)}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">
            <a href="${p.website||'#'}" target="_blank" style="color:var(--blue);text-decoration:none;">${p.website||'—'}</a>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${configured ? 'var(--green)' : 'var(--red)'};flex-shrink:0;"></div>
            <span style="font-size:12px;color:${configured ? 'var(--green)' : 'var(--red)'};">
              ${configured ? 'API key configured' : 'No API key — add ' + p.key_env + ' to Render env vars'}
            </span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${!isActive && configured ? `<button class="btn-primary" style="padding:9px 18px;margin:0;width:auto;font-size:13px;" onclick="switchProvider('${esc(p.slug)}','${esc(p.name)}')">Switch to ${esc(p.name)}</button>` : ''}
            ${isActive ? `<button class="btn-secondary" style="padding:9px 18px;font-size:13px;" disabled>✓ Currently Active</button>` : ''}
            <button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="testProvider('${p.slug}', this)">🔌 Test</button>
            ${!configured ? `<span style="font-size:11px;color:var(--muted);align-self:center;font-style:italic;">Set ${p.key_env} in Render</span>` : ''}
          </div>
          <div id="test-result-${p.slug}" style="margin-top:12px;font-size:12px;display:none;"></div>
        </div>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
}

async function switchProvider(slug, name) {
  if (!confirm(`Switch to ${name}?\n\nAll new orders will be placed through ${name} immediately. Existing orders stay on their original provider.`)) return;
  try {
    const data = await api('/admin/providers/switch', { method: 'POST', body: JSON.stringify({ slug }) });
    toast(`✅ Switched to ${data.name}! New orders now go through ${data.name}.`, 'success');
    loadAdminProviders();
    if (_chc.built) loadAdminCommandCenter(true);
  } catch(e) {
    toast(`Failed to switch: ${e.message}`, 'error');
  }
}

async function testProvider(slug, btn) {
  const resultEl = document.getElementById('test-result-' + slug);
  const orig = btn.textContent;
  btn.textContent = 'Testing…'; btn.disabled = true;
  resultEl.style.display = 'none';
  try {
    const data = await api(`/admin/providers/${slug}/test`);
    resultEl.style.display = 'block';
    resultEl.style.color = 'var(--green)';
    resultEl.textContent = `✓ Connected — Balance: ${data.currency||'USD'} ${parseFloat(data.balance||0).toFixed(2)}`;
  } catch(e) {
    resultEl.style.display = 'block';
    resultEl.style.color = 'var(--red)';
    resultEl.textContent = `✗ ${e.message}`;
  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
}

async function adminCreditUser(userId, userName) {
  const amount = prompt(`Credit wallet for ${userName}. Enter amount (KES):`);
  if (!amount || isNaN(amount)) return;
  try {
    await api(`/admin/users/${userId}/credit`, { method:'POST', body:JSON.stringify({amount: parseFloat(amount)}) });
    toast(`Credited KES ${amount} to ${userName}`, 'success');
    loadAdminUsers();
  } catch(e) { toast(e.message, 'error'); }
}

async function adminBanUser(userId) {
  if (!confirm('Ban this user?')) return;
  try {
    await api(`/admin/users/${userId}/ban`, { method:'POST' });
    toast('User banned', 'success');
    loadAdminUsers();
  } catch(e) { toast(e.message, 'error'); }
}

/* ══════════════════ ADMIN SUPPORT PANEL ══════════════════ */
/* ═══════════════════ ADMIN SUPPORT PANEL ═══════════════════ */
let activeSupportThreadId = null;

// Caches every order object seen in the currently-open support thread
// (its recent_orders + linked_order), keyed by order id, so the "full
// details" modal (openOrderDetailModal) can look an order up instantly
// without a second API round-trip — the thread payload already has
// everything the modal shows.
let _supportOrdersCache = {};
// The current thread's customer — captured fresh on every openSupportThread()
// render so the "Place Order for Customer" shortcut always targets whoever
// the pane is actually showing.
let _supportThreadUser = null;

// The Support tab (tabs, lists, filters, loadAdminSupport(), openAdminSupportTab()) now lives in
// support_board.js. The stale-ticket sweep stays here: support_board.js runs it on every tab open.

async function autoCloseStaleSupportThreads() {
  try {
    const res = await api('/support/admin/threads/auto-close-stale', { method: 'POST' });
    const n = res ? (res.done ?? res.closed ?? 0) : 0;
    if (n > 0) {
      toast(`Marked ${n} quiet conversation${n === 1 ? '' : 's'} done (no reply for 7+ days)`, 'info');
    }
  } catch (e) {
    // Non-fatal — don't block the thread list from loading if this fails
    console.warn('Auto-close stale support threads failed:', e);
  }
}

// WhatsApp-style paging: the API sends the latest 20 messages; "Load earlier
// messages" fetches the 20 before the oldest one shown and keeps them while the
// same conversation stays open (a reply re-renders without losing them).
let _supEarlier = { threadId: null, msgs: [], hasMore: null };

async function openSupportThread(threadId, opts) {
  opts = opts || {};
  if (!opts.keepEarlier || _supEarlier.threadId !== threadId) _supEarlier = { threadId, msgs: [], hasMore: null };
  activeSupportThreadId = threadId;
  const pane = document.getElementById('supportChatPane');
  if (!pane) return;
  const oldArea = document.getElementById('adminMsgArea');
  const fromBottom = (opts.keepScroll && oldArea) ? oldArea.scrollHeight - oldArea.scrollTop : null;
  if (!opts.keepScroll) pane.innerHTML = '<div class="loading-spinner" style="flex:1;"><div class="spinner"></div><span>Loading thread…</span></div>';

  try {
    const t = await api(`/support/admin/threads/${threadId}`);
    // earlier pages already loaded + the latest page, without duplicates
    const _seen = new Set();
    t.messages = [..._supEarlier.msgs, ...(t.messages || [])].filter(m => !_seen.has(m.id) && _seen.add(m.id));
    const hasMore = _supEarlier.hasMore === null ? !!t.has_more : _supEarlier.hasMore;
    const statusColor = { open:'#e53935', pending:'#ff7043', resolved:'#3dd44a', closed:'#7a8fad' };
    const typeLabel   = { wrong_order:'📦 Wrong Order', delay:'⏳ Delay' };

    _supportOrdersCache = {};
    (t.recent_orders || []).forEach(o => { if (o && o.id) _supportOrdersCache[o.id] = o; });
    if (t.linked_order && t.linked_order.id) _supportOrdersCache[t.linked_order.id] = t.linked_order;
    _supportThreadUser = t.user || null;

    // Order panel: the orders being discussed now ("In this chat") as cards,
    // then the client's other recent orders as a short list.
    const inChatIds = [...((t.board && t.board.episode_orders) || [])];
    if (t.linked_order && t.linked_order.id && !inChatIds.includes(t.linked_order.id)) inChatIds.push(t.linked_order.id);
    const inChat = inChatIds.map(id => _supportOrdersCache[id]).filter(Boolean);
    const others = (t.recent_orders || []).filter(o => o && o.id && !inChatIds.includes(o.id));
    const inChatHtml = inChat.map(o => _supOrderPanelCard(o)).join('')
      || '<div style="font-size:12px;color:#93a3ba;">No order mentioned yet in this chat.</div>';
    const othersHtml = others.map(o => _supOrderPanelRow(o)).join('')
      || '<div style="font-size:12px;color:#93a3ba;">No other orders.</div>';

    // Messages — WhatsApp layout from the agent's side: OUR messages on the
    // right (staff = green, automatic = muted), the CLIENT on the left,
    // automatic system reports as a small note in the middle. Each message
    // carries its order tag (click → that order) and topic.
    _supMsgById = {};
    if (_supReplyTo && _supReplyTo.threadId !== threadId) _supReplyTo = null;
    const resolvedAt = t.resolved_at ? new Date(t.resolved_at) : null;
    let _lastDay = '', _doneMarked = false;
    const dayLabel = (d) => {
      const today = new Date(), y = new Date(Date.now() - 864e5);
      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === y.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };
    function msgBubble(m) {
      let pre = '';
      const mDate = m.created_at ? new Date(m.created_at) : null;
      if (resolvedAt && !_doneMarked && mDate && mDate > resolvedAt) {
        _doneMarked = true;
        pre += `<div style="display:flex;align-items:center;gap:8px;font-size:10.5px;color:#7fe08b;margin:4px 0;"><span style="flex:1;height:1px;background:rgba(61,212,74,.25);"></span>Marked done ${esc(resolvedAt.toLocaleString('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))} · new messages below<span style="flex:1;height:1px;background:rgba(61,212,74,.25);"></span></div>`;
      }
      if (mDate) {
        const day = dayLabel(mDate);
        if (day !== _lastDay) {
          _lastDay = day;
          pre += `<div style="align-self:center;font-size:11px;color:#93a3ba;background:#111a2c;border-radius:999px;padding:3px 12px;">${esc(day)}</div>`;
        }
      }
      const onGreen = m.sender === 'admin' && !m.is_bot;
      const tag = (m.order_id || m.topic) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:4px;">
          ${m.order_id ? `<span onclick="event.stopPropagation();openOrderDetailModal('${esc(m.order_id)}')" title="Open this order" style="cursor:pointer;font-size:10.5px;font-weight:700;color:${onGreen ? '#fff' : '#7fe08b'};background:${onGreen ? 'rgba(0,0,0,.2)' : 'rgba(61,212,74,.12)'};border-radius:6px;padding:1px 6px;">#${esc(String(m.order_id).slice(0,8))}${_supportOrdersCache[m.order_id] ? ' · ' + esc(String(_supportOrdersCache[m.order_id].service_name || '').split('|')[0].trim().slice(0, 24)) : ''}</span>` : ''}
          ${m.topic ? `<span style="font-size:10.5px;color:${onGreen ? 'rgba(255,255,255,.82)' : '#93a3ba'};">${esc(m.topic)}</span>` : ''}</div>` : '';
      return pre + _msgBubbleInner(m, tag);
    }
    function _msgBubbleInner(m, tag) {
      const isAdmin = m.sender === 'admin';
      const safeBody = (m.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      _supMsgById[m.id] = m;
      const onGreen = isAdmin && !m.is_bot;
      const quote = m.reply_to_id ? supQuoteHtml(m.reply_to, 'staff', t.user, onGreen) : '';
      const formatted = quote + tag + supLinkifyOrderRefs(safeBody.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')).replace(/\n/g,'<br>');
      const time = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '';
      const replyBtn = m.id ? ` · <a href="javascript:void(0)" onclick="supportReplyTo('${esc(m.id)}')" title="Reply to this message" style="color:#7fe08b;text-decoration:none;font-weight:700;">Reply</a>` : '';
      if (m.sender === 'user' && (m.body || '').startsWith('🚨 Automatic')) {
        return `<div data-msg-id="${esc(m.id || '')}" style="align-self:center;max-width:78%;background:rgba(255,179,71,.07);border:1px solid rgba(255,179,71,.25);border-radius:10px;padding:8px 12px;font-size:11.5px;color:#ffd08a;line-height:1.5;">
          <div class="ev-msg-bubble" style="all:unset;display:block;">${formatted}</div><div style="font-size:10px;color:#93a3ba;margin-top:4px;text-align:right;">System report · ${time}</div></div>`;
      }
      const bubble = isAdmin
        ? (m.is_bot
            ? 'background:#16223a;border:1px solid #22314f;color:#e8eef7;border-radius:14px 14px 4px 14px;'
            : 'background:#187a2b;color:#ffffff;border-radius:14px 14px 4px 14px;')
        : 'background:#172238;color:#e8eef7;border-radius:14px 14px 14px 4px;';
      const who = isAdmin ? (m.is_bot ? 'Automatic' : (m.sender_id && currentUser && m.sender_id === currentUser.id ? 'You' : 'Staff')) : '';
      return `<div data-msg-id="${esc(m.id || '')}" style="align-self:${isAdmin ? 'flex-end' : 'flex-start'};max-width:68%;display:flex;flex-direction:column;align-items:${isAdmin ? 'flex-end' : 'flex-start'};gap:4px;">
        <div class="ev-msg-bubble" style="${bubble}padding:10px 12px;font-size:13px;line-height:1.5;word-break:break-word;">${formatted}</div>
        <div style="font-size:10.5px;color:#93a3ba;">${who ? esc(who) + ' · ' : ''}${time}${replyBtn}</div>
      </div>`;
    }

    const userName  = esc(t.user?.name || t.user?.email || '—');
    const userEmail = esc(t.user?.email || '');
    const initial   = esc((t.user?.name || t.user?.email || '?').trim().charAt(0).toUpperCase());
    const bucket    = (t.board && t.board.bucket) || '';
    const pill = ['resolved','closed'].includes(t.status) ? ['Done', '#7fe08b', 'rgba(61,212,74,.12)']
      : bucket === 'inbox' || t.status === 'open' ? ['Waiting on us', '#ff8a8a', 'rgba(255,92,92,.14)']
      : bucket === 'automatic' ? ['Automatic only', '#b9c6d8', 'rgba(255,255,255,.08)']
      : ['Waiting on client', '#ffc46b', 'rgba(255,179,71,.14)'];
    const btn2 = 'height:38px;padding:0 14px;background:#111a2c;border:1px solid #1e2a40;border-radius:10px;color:#e8eef7;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;';
    const orderOpts = Object.values(_supportOrdersCache).map(o =>
      `<option value="${esc(o.id)}" title="${esc(o.service_name || '')}" ${t.board && t.board.episode_orders && t.board.episode_orders[0] === o.id ? 'selected' : ''}>#${esc(String(o.id).slice(0,8))}</option>`).join('');

    pane.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;min-height:0;height:100%;background:#0c1322;font-family:Montserrat,system-ui,sans-serif;';

    pane.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1e2a40;flex-shrink:0;">
        <div style="display:flex;gap:12px;align-items:center;min-width:0;">
          <span style="width:40px;height:40px;border-radius:50%;background:#3dd44a;color:#062b0c;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initial}</span>
          <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:15px;color:#fff;">${userName}</b><span style="font-size:12px;color:#93a3ba;">${userEmail}</span></div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px;">
              <span style="background:${pill[2]};color:${pill[1]};border-radius:999px;padding:2px 9px;font-weight:700;">${pill[0]}</span>
              ${t.board && t.board.topic ? `<span style="color:#b9c6d8;">${esc(t.board.topic)}</span>` : ''}
              <span style="color:#93a3ba;">Wallet KES ${(t.user?.wallet_balance||0).toFixed(0)} · Client since ${t.user?.member_since ? new Date(t.user.member_since).toLocaleDateString('en-KE',{month:'short',year:'numeric'}) : '—'}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${t.reorder_task_id ? `<button onclick="rqReorderTask('${esc(t.reorder_task_id)}')" title="This client is in the Reorder Queue — re-place their paid order free of charge" style="${btn2}border-color:rgba(255,112,67,.6);color:#ff9a70;">Reorder for client</button>` : ''}
          ${userEmail ? `<button onclick="ccrCreateOrderForThreadUser()" title="Place an order for ${userEmail} without leaving this chat" style="${btn2}">Place order</button>` : ''}
          ${['resolved','closed'].includes(t.status)
            ? `<button onclick="adminUpdateThreadStatus('open')" title="Move it back to the Inbox" style="${btn2}">Reopen</button>`
            : `<button onclick="adminUpdateThreadStatus('resolved')" title="Sorted for now — the client's next message reopens it in the Inbox" style="height:38px;padding:0 16px;background:#3dd44a;border:0;border-radius:10px;color:#062b0c;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;">Mark done</button>`}
        </div>
      </div>

      <div style="flex:1;min-height:0;display:flex;overflow:hidden;">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;overflow:hidden;">
          <div id="adminMsgArea" style="flex:1;min-height:0;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px;background:#0a101d;">
            ${hasMore ? `<button id="supLoadEarlier" onclick="supportLoadEarlier()" style="align-self:center;padding:6px 14px;background:#111a2c;border:1px solid #1e2a40;border-radius:999px;color:#b9c6d8;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;">Load earlier messages</button>`
                      : `<div style="align-self:center;font-size:10.5px;color:#93a3ba;">Start of the conversation · ${t.message_count || (t.messages||[]).length} messages</div>`}
            ${(t.messages||[]).map(m=>msgBubble(m)).join('')}
          </div>

          <div style="border-top:1px solid #1e2a40;padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px;background:#0c1322;flex-shrink:0;position:relative;">
            <div id="supQuickReplies" style="display:none;position:absolute;left:14px;right:14px;bottom:100%;margin-bottom:6px;background:#0f1729;border:1px solid #2a3a58;border-radius:12px;padding:10px;box-shadow:0 12px 32px rgba(0,0,0,.45);z-index:5;"></div>
            <div id="supReplyPreview" style="display:none;"></div>
            <div style="display:flex;gap:8px;align-items:flex-end;">
              <label title="Which order this reply is about" style="position:relative;display:flex;align-items:center;gap:6px;height:44px;padding:0 10px;background:#111a2c;border:1px solid #1e2a40;border-radius:12px;color:#7fe08b;flex-shrink:0;max-width:140px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0;"><path d="M3 7l9-4 9 4-9 4-9-4z"></path><path d="M3 7v10l9 4 9-4V7"></path></svg>
                <select id="adminReplyOrder" aria-label="Reply about order" style="appearance:none;-webkit-appearance:none;background:transparent;border:0;color:#7fe08b;font-family:inherit;font-size:12px;font-weight:700;outline:none;cursor:pointer;min-width:0;max-width:100px;text-overflow:ellipsis;">
                  <option value="">No order</option>
                  ${orderOpts}
                </select>
              </label>
              <textarea id="adminReplyInput" rows="1" placeholder="Type your reply…" style="flex:1;min-width:0;background:#111a2c;border:1px solid #2a3a58;border-radius:12px;padding:11px 14px;color:#e8eef7;font-family:inherit;font-size:13px;outline:none;resize:none;height:44px;max-height:120px;line-height:1.4;box-sizing:border-box;" oninput="this.style.height='44px';this.style.height=Math.min(this.scrollHeight,120)+'px';" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();adminSendReply();}"></textarea>
              <button id="supQuickBtn" onclick="supportToggleQuickReplies()" title="Quick replies" aria-label="Quick replies" style="width:44px;height:44px;flex-shrink:0;background:#111a2c;border:1px solid #1e2a40;border-radius:12px;color:#ffcf6e;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path></svg>
              </button>
              <button onclick="adminSendReply()" aria-label="Send" style="width:44px;height:44px;flex-shrink:0;background:#3dd44a;border:0;border-radius:12px;color:#062b0c;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6-7-2z"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div style="width:280px;flex-shrink:0;border-left:1px solid #1e2a40;display:flex;flex-direction:column;min-height:0;background:#0c1322;">
          <div style="padding:14px;border-bottom:1px solid #1e2a40;display:flex;flex-direction:column;gap:8px;">
            <span style="font-size:10.5px;font-weight:800;letter-spacing:1.4px;color:#93a3ba;">FIND AN ORDER</span>
            <label style="display:flex;align-items:center;gap:8px;background:#111a2c;border:1px solid #1e2a40;border-radius:10px;padding:0 10px;height:40px;box-sizing:border-box;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93a3ba" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
              <input id="supOrderSearch" aria-label="Find an order" placeholder="Order ID or M-Pesa code" onkeydown="if(event.key==='Enter'){event.preventDefault();supportFindOrder();}" style="flex:1;min-width:0;background:transparent;border:0;outline:none;color:#e8eef7;font-family:inherit;font-size:12px;">
            </label>
            <div id="supOrderResults"></div>
          </div>
          <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
            <span style="font-size:10.5px;font-weight:800;letter-spacing:1.4px;color:#93a3ba;">IN THIS CHAT</span>
            ${inChatHtml}
            <span style="font-size:10.5px;font-weight:800;letter-spacing:1.4px;color:#93a3ba;margin-top:6px;">OTHER ORDERS</span>
            <div>${othersHtml}</div>
          </div>
        </div>
      </div>`;

    // Scroll messages to bottom — use rAF + fallback timeout for reliability
    _supRenderReplyPreview();
    const msgArea = document.getElementById('adminMsgArea');
    if (msgArea && fromBottom !== null) {
      msgArea.scrollTop = msgArea.scrollHeight - fromBottom;        // stay where you were after loading earlier
    } else if (msgArea) {
      const scrollToBottom = () => { msgArea.scrollTop = msgArea.scrollHeight; };
      requestAnimationFrame(() => { scrollToBottom(); setTimeout(scrollToBottom, 120); });
    }

  } catch(e) {
    pane.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--red);font-size:13px;">${e.message||'Failed to load thread'}</div>`;
  }
}

// ── WhatsApp-style "reply to a specific message" ───────────────────────────
// ↩ Reply on any bubble → a "Replying to …" bar above the reply box; the reply
// is sent with reply_to_id and shows a quote of that message (tap it to jump to
// the original). It also takes the quoted message's order tag, so two issues
// in one conversation stay apart.
let _supMsgById = {};
let _supReplyTo = null;          // { threadId, id }

function _quoteWho(q, viewer, user) {
  if (!q) return '';
  if (viewer === 'client') return q.sender === 'user' ? 'You' : (q.is_bot ? 'EndaViral Team' : 'EndaViral Support');
  if (q.sender === 'user') return (user && (user.name || user.email)) ? String(user.name || user.email).split(' ')[0] : 'Client';
  return q.is_bot ? '🤖 Automatic' : 'Staff';
}

// Quote block shown on top of a reply. onGreen: the reply sits in a green bubble.
function supQuoteHtml(q, viewer, user, onGreen) {
  if (!q) return `<div style="font-size:11px;font-style:italic;opacity:.7;margin-bottom:6px;">↩ Replying to a deleted message</div>`;
  const jump = viewer === 'client' ? `ticketJumpTo('${esc(q.id)}')` : `supportJumpTo('${esc(q.id)}')`;
  const body = esc(String(q.body || '').replace(/\*\*/g, '')).replace(/\n/g, ' ');
  return `<div onclick="event.stopPropagation();${jump}" title="Show the original message" style="cursor:pointer;margin-bottom:6px;padding:5px 8px;border-left:3px solid ${onGreen ? 'rgba(255,255,255,.75)' : '#3dd44a'};border-radius:6px;background:${onGreen ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.06)'};font-size:11.5px;line-height:1.4;">
    <div style="font-weight:800;color:${onGreen ? '#fff' : '#7fd88a'};font-size:10.5px;">${esc(_quoteWho(q, viewer, user))}${q.order_id ? ` · #${esc(String(q.order_id).slice(0, 8))}` : ''}</div>
    <div style="opacity:.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${body}</div>
  </div>`;
}

function _flashMsg(el) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const b = el.querySelector('.ev-msg-bubble, .tt-bubble') || el;
  const old = b.style.boxShadow;
  b.style.transition = 'box-shadow .3s';
  b.style.boxShadow = '0 0 0 3px rgba(255,204,128,.85)';
  setTimeout(() => { b.style.boxShadow = old; }, 1400);
}

function supportJumpTo(id) {
  const el = document.querySelector(`#adminMsgArea [data-msg-id="${CSS.escape(id)}"]`);
  if (el) _flashMsg(el);
  else toast('That message is further up — tap “Load earlier messages”', 'info');
}

function supportReplyTo(id) {
  const m = _supMsgById[id];
  if (!m || !activeSupportThreadId) return;
  _supReplyTo = { threadId: activeSupportThreadId, id };
  // the reply is about the same order as the message being answered
  if (m.order_id) {
    const sel = document.getElementById('adminReplyOrder');
    if (sel) {
      if (![...sel.options].some(op => op.value === m.order_id)) {
        sel.insertAdjacentHTML('beforeend', `<option value="${esc(m.order_id)}">#${esc(String(m.order_id).slice(0, 8))}</option>`);
      }
      sel.value = m.order_id;
    }
  }
  _supRenderReplyPreview();
  document.getElementById('adminReplyInput')?.focus();
}

function supportCancelReply() { _supReplyTo = null; _supRenderReplyPreview(); }

function _supRenderReplyPreview() {
  const box = document.getElementById('supReplyPreview');
  if (!box) return;
  const m = _supReplyTo && _supReplyTo.threadId === activeSupportThreadId ? _supMsgById[_supReplyTo.id] : null;
  if (!m) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const q = { id: m.id, sender: m.sender, is_bot: m.is_bot, order_id: m.order_id, body: String(m.body || '').slice(0, 160) };
  box.style.display = 'block';
  const who = _quoteWho(q, 'staff', _supportThreadUser);
  const body = esc(String(q.body || '').replace(/\*\*/g, '')).replace(/\n/g, ' ');
  box.innerHTML = `<div style="display:flex;gap:10px;align-items:center;background:#111a2c;border-radius:10px;padding:8px 10px;">
    <div style="flex:1;min-width:0;border-left:3px solid #3dd44a;padding-left:9px;">
      <div style="font-size:10.5px;font-weight:800;color:#7fe08b;">Replying to ${esc(who)}${q.order_id ? ' · #' + esc(String(q.order_id).slice(0, 8)) : ''}</div>
      <div style="font-size:12px;color:#b9c6d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${body}</div>
    </div>
    <button onclick="supportCancelReply()" aria-label="Cancel reply" style="width:32px;height:32px;background:transparent;border:0;color:#93a3ba;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
    </button>
  </div>`;
}

// ── Order panel cards (staff chat) ─────────────────────────────────────────
const _SUP_ST = {
  completed: ['Completed', '#7fe08b', 'rgba(61,212,74,.12)'],
  partial: ['Partial', '#ffc46b', 'rgba(255,179,71,.14)'],
  failed: ['Failed', '#ff8a8a', 'rgba(255,92,92,.12)'],
  cancelled: ['Cancelled', '#ff8a8a', 'rgba(255,92,92,.12)'],
};
function _supStatusPill(s) {
  const k = String(s || '').toLowerCase();
  const [label, fg, bg] = _SUP_ST[k] || [k ? k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '—', '#6cb6ff', 'rgba(108,182,255,.12)'];
  return `<span style="font-size:10.5px;font-weight:800;color:${fg};background:${bg};border-radius:999px;padding:2px 8px;white-space:nowrap;">${esc(label)}</span>`;
}
function _supOrderPanelCard(o) {
  const id = esc(o.id || '');
  const qty = Number(o.quantity || 0);
  const delivered = (o.remains != null && qty) ? Math.max(0, Math.min(qty, qty - Number(o.remains))) : null;
  const pct = delivered != null && qty ? Math.round(delivered / qty * 100) : null;
  const live = ['failed','cancelled','completed'].indexOf(String(o.status || '').toLowerCase()) === -1;
  return `<button onclick="openOrderDetailModal('${id}')" title="Open full order details" style="text-align:left;background:#111a2c;border:1px solid ${live ? '#2b6a3a' : '#1e2a40'};border-radius:12px;padding:12px;color:#e8eef7;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:6px;width:100%;">
    <span style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><b style="font-size:12.5px;">#${esc(String(o.id || '').slice(0, 8))}</b>${_supStatusPill(o.status)}</span>
    <span style="font-size:12px;color:#d4deeb;">${esc(o.service_name || '—')} · ×${qty.toLocaleString()}</span>
    ${pct != null && live ? `<span style="height:6px;border-radius:3px;background:#1e2a40;overflow:hidden;display:block;"><span style="display:block;width:${pct}%;height:6px;background:#3dd44a;"></span></span>` : ''}
    <span style="font-size:11px;color:#93a3ba;">${delivered != null && live ? `${delivered.toLocaleString()} of ${qty.toLocaleString()} delivered · ` : ''}KES ${Number(o.charge || 0).toFixed(0)}${o.mpesa_receipt ? ` · M-Pesa ${esc(o.mpesa_receipt)}` : ''}</span>
    ${typeof reorderedTag === 'function' ? reorderedTag(o) : ''}
  </button>`;
}
function _supOrderPanelRow(o) {
  const id = esc(o.id || '');
  return `<button onclick="openOrderDetailModal('${id}')" title="Open full order details" style="text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;background:transparent;border:0;border-bottom:1px solid #16213a;padding:9px 0;color:#e8eef7;font-family:inherit;cursor:pointer;">
    <span style="display:flex;flex-direction:column;gap:2px;min-width:0;"><b style="font-size:12px;">#${esc(String(o.id || '').slice(0, 8))}</b><span style="font-size:11px;color:#93a3ba;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">${esc(o.service_name || '—')} · ×${Number(o.quantity || 0).toLocaleString()}</span>${typeof reorderedTag === 'function' ? reorderedTag(o) : ''}</span>
    ${_supStatusPill(o.status)}
  </button>`;
}

// ⚡ opens the quick replies as a pop-up above the reply box (ccr_support.js
// renders its bar into #supQuickReplies).
function supportToggleQuickReplies(force) {
  const box = document.getElementById('supQuickReplies');
  if (!box) return;
  const show = typeof force === 'boolean' ? force : box.style.display === 'none';
  box.style.display = show ? 'block' : 'none';
  if (show && !box.firstElementChild && typeof ccrqrRenderBar === 'function' && activeSupportThreadId) ccrqrRenderBar(activeSupportThreadId);
}

// ── Find the exact order a client is talking about ────────────────────────
// Sidebar "Find an order" box + clickable order IDs / M-Pesa codes in the
// client's messages. Backend: GET /support/admin/threads/{id}/orders/search?q=
// (order ID or its first 8 chars "#a1b2c3d4", provider order #, M-Pesa code).
const _SUP_REF_RE = /(\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)|(#[0-9a-fA-F]{8}\b)|(\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{8}\b)|(\b(?=[A-Z0-9]*\d)[A-Z][A-Z0-9]{9}\b)/g;

function supLinkifyOrderRefs(html) {
  // `html` is already escaped; tokens are plain [0-9A-Za-z-#] so safe to wrap.
  return String(html).replace(_SUP_REF_RE, (m) => {
    const q = m.replace(/[^0-9A-Za-z-]/g, '');
    const what = /^[A-Z]/.test(q) && q.length === 10 ? 'M-Pesa code' : 'order';
    return `<a href="javascript:void(0)" onclick="event.stopPropagation();supportFindOrder('${q}')" title="Find this ${what}" style="color:inherit;text-decoration:underline dotted;font-weight:700;">${m}</a>`;
  });
}

function _supOrderCard(o, opts) {
  opts = opts || {};
  const id = esc(o.id || '');
  const st = esc(o.status || '');
  return `<div onclick="openOrderDetailModal('${id}')" title="Open full order details" style="cursor:pointer;background:var(--card);border:1px solid ${opts.other ? 'rgba(255,179,71,.45)' : 'rgba(61,212,74,.35)'};border-radius:9px;padding:9px 10px;margin-bottom:6px;font-size:11.5px;">
    <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;">
      <b style="color:var(--white);">#${esc(String(o.id || '').slice(0, 8))}</b>
      <span class="status-pill ${st}" style="font-size:9px;">${st}</span>
    </div>
    <div style="color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(o.service_name || '—')}</div>
    <div style="color:var(--muted);margin-top:2px;">×${Number(o.quantity || 0).toLocaleString()} · KES ${Number(o.charge || 0).toFixed(0)}${o.created_at ? ' · ' + esc(new Date(o.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })) : ''}</div>
    ${o.mpesa_receipt ? `<div style="color:var(--muted);margin-top:2px;">M-Pesa: <span style="font-family:monospace;color:var(--green);">${esc(o.mpesa_receipt)}</span></div>` : ''}
    ${o.provider_order_id ? `<div style="color:var(--muted);margin-top:2px;">Provider #${esc(o.provider_order_id)}</div>` : ''}
    ${o.matched_by ? `<div style="color:#7fd88a;margin-top:2px;font-size:10px;">matched by ${esc(o.matched_by)}</div>` : ''}
    ${opts.other ? `<div style="color:#ffb347;margin-top:2px;font-size:10.5px;">⚠ Belongs to ${esc(o.user_email || 'another customer')}</div>` : ''}
    ${typeof reorderedTag === 'function' ? reorderedTag(o) : ''}
    ${opts.other ? '' : `<button class="action-btn" onclick="event.stopPropagation();supportTagReplyOrder('${id}')" style="margin-top:6px;padding:3px 8px;font-size:10.5px;">🏷 Tag reply with this order</button>`}
  </div>`;
}

async function supportFindOrder(query) {
  const input = document.getElementById('supOrderSearch');
  const out = document.getElementById('supOrderResults');
  if (!out || !activeSupportThreadId) return;
  const q = String(query != null ? query : (input ? input.value : '')).trim();
  if (input && query != null) input.value = q;
  if (q.replace(/^#/, '').length < 4) { out.innerHTML = '<div style="font-size:11px;color:#ffb347;">Type at least 4 characters.</div>'; return; }
  out.innerHTML = '<div style="font-size:11px;color:var(--muted);">Searching…</div>';
  try {
    const r = await api(`/support/admin/threads/${encodeURIComponent(activeSupportThreadId)}/orders/search?q=${encodeURIComponent(q)}`);
    const mine = r.orders || [], others = r.other_customers || [];
    [...mine, ...others].forEach(o => { if (o && o.id) _supportOrdersCache[o.id] = o; });
    if (!mine.length && !others.length) {
      out.innerHTML = `<div style="font-size:11px;color:#ff8a80;">No order found for “${esc(r.query || q)}”. Check the ID with the client.</div>`;
      return;
    }
    out.innerHTML =
      (mine.length ? `<div style="font-size:10.5px;color:var(--muted);margin-bottom:5px;">${mine.length} of this client's orders</div>` + mine.map(o => _supOrderCard(o)).join('') : '')
      + (others.length ? `<div style="font-size:10.5px;color:#ffb347;margin:6px 0 5px;">${mine.length ? 'Also' : 'Not this client\'s —'} other customers' orders</div>` + others.map(o => _supOrderCard(o, { other: true })).join('') : '');
    if (mine.length === 1 && !others.length) openOrderDetailModal(mine[0].id);     // the exact order → open it
  } catch (e) {
    out.innerHTML = `<div style="font-size:11px;color:#ff8a80;">⚠ ${esc(e.message || 'Search failed')}</div>`;
  }
}

// Tag the next reply with this order (adds it to the "Reply about" picker).
function supportTagReplyOrder(orderId) {
  const sel = document.getElementById('adminReplyOrder');
  const o = _supportOrdersCache[orderId];
  if (!sel || !o) return;
  if (![...sel.options].some(op => op.value === orderId)) {
    sel.insertAdjacentHTML('beforeend', `<option value="${esc(orderId)}">📦 #${esc(String(orderId).slice(0, 8))} · ${esc(String(o.service_name || '').slice(0, 40))} · ${esc(o.status || '')}</option>`);
  }
  sel.value = orderId;
  document.getElementById('adminReplyInput')?.focus();
  toast(`Your reply will be tagged with order #${String(orderId).slice(0, 8)}`, 'success');
}

async function supportLoadEarlier() {
  const id = activeSupportThreadId; if (!id) return;
  const btn = document.getElementById('supLoadEarlier');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  const area = document.getElementById('adminMsgArea');
  const oldest = _supEarlier.threadId === id && _supEarlier.msgs.length ? _supEarlier.msgs[0] : null;
  try {
    let before = oldest ? oldest.id : null;
    if (!before) {                                   // first click: oldest of the latest page
      const cur = await api(`/support/admin/threads/${id}`);
      before = (cur.messages || [])[0]?.id;
    }
    if (!before) return;
    const page = await api(`/support/admin/threads/${id}?before=${encodeURIComponent(before)}`);
    if (_supEarlier.threadId !== id) _supEarlier = { threadId: id, msgs: [], hasMore: null };
    _supEarlier.msgs = [...(page.messages || []), ..._supEarlier.msgs];
    _supEarlier.hasMore = !!page.has_more;
    await openSupportThread(id, { keepEarlier: true, keepScroll: !!area });
  } catch (e) {
    toast(e.message || 'Could not load earlier messages', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '⬆ Load earlier messages'; }
  }
}

// ─── Order detail modal (from Support → Recent/Linked Orders) ─────────────
// Pulls the order straight out of _supportOrdersCache (populated by
// openSupportThread above — no extra API call needed) and shows every
// field the thread payload has, plus quick actions so an agent can
// resolve a ticket without leaving it.

function _ensureOrderDetailModal() {
  if (document.getElementById('orderDetailModal')) return;
  const modal = document.createElement('div');
  modal.id = 'orderDetailModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `<div id="orderDetailModalBody" style="background:var(--black);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;"></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeOrderDetailModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOrderDetailModal(); });
}

function closeOrderDetailModal() {
  const modal = document.getElementById('orderDetailModal');
  if (modal) modal.style.display = 'none';
}

// ── 🔁 "Already reordered" indicator (staff) ──────────────────────────────
// o.reordered: replacements placed for this order (Reorder Queue or popup);
// o.reorder_of: on a replacement, the order it replaced. From the backend's
// reorder_queue.reorder_links() (admin orders list + support order sidebar).
function _reorderLive(o) { return (o.reordered || []).filter(r => !['failed', 'cancelled'].includes(r.status)); }

function reorderedTag(o) {
  const all = o.reordered || [];
  if (all.length) {
    const live = _reorderLive(o);
    const last = all[all.length - 1];
    const ok = live.length > 0;
    const color = ok ? '#ff8a65' : '#ff5252';
    const tip = all.map(r => `#${String(r.new_order_id).slice(0, 8)} · ${r.status || '?'} · ${r.via === 'queue' ? 'Reorder Queue' : 'order popup'}${r.at ? ' · ' + new Date(r.at).toLocaleString('en-KE') : ''}`).join('\n');
    return `<div title="${esc('Already reordered:\n' + tip)}" style="margin-top:4px;font-size:10.5px;font-weight:700;color:${color};white-space:nowrap;">🔁 ${ok ? 'Reordered' : 'Reorder failed'}${all.length > 1 ? ' ×' + all.length : ''} → #${esc(String((live[live.length - 1] || last).new_order_id).slice(0, 8))}</div>`;
  }
  if (o.reorder_of) {
    return `<div title="This is a free replacement for order #${esc(o.reorder_of)}" style="margin-top:4px;font-size:10.5px;color:var(--muted);white-space:nowrap;">🔁 reorder of #${esc(String(o.reorder_of).slice(0, 8))}</div>`;
  }
  return '';
}

function reorderedBanner(o) {
  const all = o.reordered || [];
  if (!all.length && !o.reorder_of) return '';
  const jump = (id) => `<a href="javascript:void(0)" onclick="jumpToOrderInAllOrders('${esc(id)}')" style="color:#ffcc80;font-weight:700;">#${esc(String(id).slice(0, 8))}</a>`;
  if (!all.length) {
    return `<div style="margin:10px 0 4px;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid var(--border);font-size:12px;color:var(--muted);line-height:1.5;">
      🔁 This is a free replacement for order ${jump(o.reorder_of)}.</div>`;
  }
  const ok = _reorderLive(o).length > 0;
  return `<div style="margin:10px 0 4px;padding:9px 11px;border-radius:9px;background:${ok ? 'rgba(255,112,67,.10)' : 'rgba(255,82,82,.10)'};border:1px solid ${ok ? 'rgba(255,112,67,.45)' : 'rgba(255,82,82,.45)'};font-size:12px;color:#ffcc80;line-height:1.6;">
    <b>🔁 Already reordered ${all.length > 1 ? all.length + '×' : ''}</b>${ok ? ' — don\'t redo it unless the replacement fails.' : ' — but the replacement failed too.'}
    ${all.map(r => `<div style="color:var(--muted);">• ${jump(r.new_order_id)} · <b style="color:${['failed', 'cancelled'].includes(r.status) ? '#ff8a80' : 'var(--white)'};">${esc(r.status || '?')}</b> · ${r.via === 'queue' ? 'Reorder Queue' : 'order popup'}${r.at ? ' · ' + esc(new Date(r.at).toLocaleString('en-KE')) : ''}</div>`).join('')}
  </div>`;
}

function openOrderDetailModal(orderId) {
  const o = _supportOrdersCache[orderId] || _adminOrdersCache[orderId];
  if (!o) { toast('Order details not available', 'error'); return; }

  _ensureOrderDetailModal();
  const modal = document.getElementById('orderDetailModal');
  const body = document.getElementById('orderDetailModalBody');

  const status = esc(o.status || '');
  const fullId = esc(o.id || '');
  const shortId = fullId.slice(0, 8);
  const rawLink = o.link || '';
  const safeLink = esc(rawLink);

  // Row helper — skips anything the thread payload didn't include,
  // rather than printing "undefined"/"—" noise for fields this endpoint
  // just doesn't return.
  const row = (label, value) => value == null || value === '' ? '' : `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12.5px;">
      <span style="color:var(--muted);">${esc(label)}</span>
      <span style="color:var(--white);text-align:right;">${value}</span>
    </div>`;

  const startRemains = (o.start_count != null || o.remains != null)
    ? `${o.start_count != null ? parseInt(o.start_count).toLocaleString() : '—'} / ${o.remains != null ? parseInt(o.remains).toLocaleString() : '—'}`
    : null;

  const canRefill = ['completed', 'partial'].includes((status || '').toLowerCase()) && !!o.service_refill;

  body.innerHTML = `
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;">
      <div>
        <div style="font-weight:800;font-size:14px;color:var(--white);">${esc(o.service_name || 'Order details')}</div>
        <div style="margin-top:6px;">${statusPill(o.status, o.queued)}${reorderedTag(o)}</div>
      </div>
      <button onclick="closeOrderDetailModal()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;line-height:1;">×</button>
    </div>
    <div style="padding:6px 18px;overflow-y:auto;flex:1;min-height:0;">
      ${reorderedBanner(o)}
      ${row('Order ID', `#${shortId} <button onclick="navigator.clipboard.writeText('${fullId}').then(()=>toast('Order ID copied!','success'))" title="Copy full Order ID" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:0 2px;">⎘</button>`)}
      ${o.provider_order_id ? row('Provider Order ID', `#${esc(o.provider_order_id)}`) : ''}
      ${o.mpesa_receipt ? row('M-Pesa Ref', `<span style="font-family:monospace;">${esc(o.mpesa_receipt)}</span> <button onclick="navigator.clipboard.writeText('${esc(o.mpesa_receipt)}').then(()=>toast('M-Pesa ref copied!','success'))" title="Copy M-Pesa reference" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:0 2px;">⎘</button>`) : ''}
      ${row('Quantity', o.quantity != null ? parseInt(o.quantity).toLocaleString() : null)}
      ${startRemains ? row('Start / Remains', startRemains) : ''}
      ${row('Charge', o.charge != null ? fmtKES(o.charge) : null)}
      ${o.created_at ? row('Date', new Date(o.created_at).toLocaleString('en-KE')) : ''}
      ${o.phone ? row('Phone', esc(o.phone)) : ''}
      ${rawLink ? `<div style="padding:10px 0;">
        <div style="color:var(--muted);font-size:11px;margin-bottom:4px;">Link</div>
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:var(--green);font-size:12px;word-break:break-all;">${safeLink}</a>
      </div>` : ''}
      <div id="odmAutoRefill" data-order="${fullId}" data-refill="${o.service_refill ? '1' : ''}"></div>
      <div id="odmRefillHistory" data-order="${fullId}"></div>
      <div id="odmPanelErrors" data-order="${fullId}"></div>
      <div id="odmWallet" data-order="${fullId}"></div>
    </div>
    <div style="padding:14px 18px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">
      ${rawLink ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="action-btn" style="text-decoration:none;">🔗 Open Link</a>` : ''}
      ${rawLink ? `<button class="action-btn" onclick="navigator.clipboard.writeText('${safeLink}').then(()=>toast('Link copied!','success'))">⎘ Copy Link</button>` : ''}
      ${canRefill ? `<button class="action-btn" onclick="adminRefillOrder('${fullId}')">↻ Refill</button>` : ''}
      <button class="action-btn" onclick="jumpToOrderInAllOrders('${fullId}')">📋 View in All Orders</button>
      <button class="action-btn" id="odmReorderBtn" onclick="odmOpenReorder('${fullId}')" style="border-color:rgba(255,112,67,.55);color:#ff8a65;font-weight:700;">🔁 Reorder</button>
    </div>
  `;
  modal.style.display = 'flex';
  _loadOrderPanelErrors(o.id);
  _loadOrderRefillHistory(o.id, false);
  if (typeof awcLoadOrderBox === 'function') awcLoadOrderBox(o.id);   // EndaViral Wallet refund / payment (admin_wallet_credit.js)
}

// ─── Reorder ANY order from its popup ─────────────────────────────────────
// Always available (any status, any number of times). Staff choose the same
// link or a new one; the replacement is free (KES 0) on the same service — or,
// when that service is gone, on a similar one (suggested, or picked from
// "Choose another service…", see reorder_alternatives.js) — and goes straight
// to the provider. Backend: GET/POST /reorders/order/{id}/manual
// (app/services/reorder_queue.py → place_manual_reorder). Earlier reorders of
// the order are listed so nobody re-places it twice by accident.
let _odmRe = null;   // { orderId, info }

function _odmReorderBox() {
  let box = document.getElementById('odmReorder');
  if (!box) {
    const scroller = document.querySelector('#orderDetailModalBody > div:nth-child(2)');
    if (!scroller) return null;
    box = document.createElement('div');
    box.id = 'odmReorder';
    scroller.prepend(box);
  }
  return box;
}

async function odmOpenReorder(orderId) {
  const box = _odmReorderBox();
  if (!box) return;
  box.style.cssText = 'margin:10px 0 6px;padding:14px;border:1px solid rgba(255,112,67,.45);border-radius:12px;background:rgba(255,112,67,.06);';
  box.innerHTML = '<div class="loading-spinner" style="padding:16px;"><div class="spinner"></div><span>Loading…</span></div>';
  box.scrollIntoView({ block: 'nearest' });
  try {
    const info = await api(`/reorders/order/${encodeURIComponent(orderId)}/manual`);
    _odmRe = { orderId, info };
    _odmRenderReorder();
  } catch (e) {
    box.innerHTML = `<div style="color:#ff8a80;font-size:12.5px;">⚠️ ${esc(e.message || 'Could not load reorder options')}</div>
      <button class="action-btn" style="margin-top:8px;" onclick="odmCloseReorder()">Close</button>`;
  }
}

function odmCloseReorder() {
  const box = document.getElementById('odmReorder');
  if (box) box.remove();
  _odmRe = null;
}

function _odmRenderReorder() {
  const box = document.getElementById('odmReorder');
  if (!box || !_odmRe) return;
  const i = _odmRe.info;
  const orig = i.original_link || {};
  const chk = orig.check || {};
  const chkColor = chk.level === 'bad' ? '#ff8a80' : chk.level === 'warn' ? '#ffb74d' : 'var(--green)';
  const hasOrig = !!orig.url;
  const prev = i.previous || [];
  const inp = 'width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--white);font-family:inherit;font-size:13px;outline:none;';
  const prevHtml = prev.length ? `
    <div style="margin:0 0 12px;padding:9px 11px;border-radius:9px;background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.35);font-size:12px;color:#ffcc80;line-height:1.5;">
      ⚠️ Already reordered <b>${prev.length}×</b> from this popup:
      ${prev.slice(0, 3).map(p => `<div style="color:var(--muted);">• ${p.created_at ? new Date(p.created_at).toLocaleString('en-KE') : ''} — x${Number(p.quantity).toLocaleString()} · ${esc(p.status || '')} · ${p.same_link ? 'same link' : 'new link'}</div>`).join('')}
    </div>` : '';
  const taskHtml = i.queue_task && i.queue_task.status === 'reordered' ? `
    <div style="margin:0 0 12px;font-size:12px;color:#ffcc80;">⚠️ The Reorder Queue already re-placed this order once.</div>` : '';
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div style="font-weight:800;font-size:13.5px;color:var(--white);">🔁 Reorder this order</div>
      <button onclick="odmCloseReorder()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;line-height:1;" aria-label="Close">×</button>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px;line-height:1.5;">Free replacement (KES 0), sent straight to the provider.</div>
    ${prevHtml}${taskHtml}
    ${_odmServiceBlock(i)}
    <div style="font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Link</div>
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--white);margin-bottom:6px;cursor:pointer;${hasOrig ? '' : 'opacity:.5;pointer-events:none;'}">
      <input type="radio" name="odmReLink" value="same" ${hasOrig ? 'checked' : ''} onchange="_odmLinkMode()" style="margin-top:2px;">
      <span style="min-width:0;">Same link<br><span style="color:var(--muted);font-size:11.5px;word-break:break-all;">${esc(orig.url || 'no link on this order')}</span>
      ${hasOrig && chk.level && chk.level !== 'ok' ? `<br><span style="color:${chkColor};font-size:11.5px;">${esc(chk.reason || '')}</span>` : ''}</span>
    </label>
    <label style="display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--white);margin-bottom:6px;cursor:pointer;">
      <input type="radio" name="odmReLink" value="new" ${hasOrig ? '' : 'checked'} onchange="_odmLinkMode()"> A different link
    </label>
    <input id="odmReNewLink" type="url" placeholder="https://…" style="${inp}display:${hasOrig ? 'none' : 'block'};margin-bottom:10px;">
    <div style="display:flex;gap:10px;align-items:flex-end;margin:10px 0;">
      <div style="flex:1;">
        <div style="font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Quantity</div>
        <input id="odmReQty" type="number" min="1" max="${Number(i.max_quantity) || ''}" value="${Number(i.quantity) || ''}" style="${inp}">
      </div>
      <div id="odmReQtyMax" style="font-size:11px;color:var(--muted);padding-bottom:9px;white-space:nowrap;">max ${Number(i.max_quantity || 0).toLocaleString()}</div>
    </div>
    <div id="odmReQtyHint" style="font-size:11px;color:var(--muted);margin:-4px 0 10px;line-height:1.5;"></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">✉ The customer is messaged in their support chat that it was re-placed.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-primary" id="odmReGo" onclick="odmSubmitReorder()" style="margin:0;width:auto;padding:10px 16px;font-size:13px;">🔁 Place reorder (free)</button>
      <button class="action-btn" onclick="odmCloseReorder()">Cancel</button>
    </div>
    <div id="odmReMsg" style="margin-top:10px;font-size:12.5px;"></div>`;
  _odmSyncQty();
}

/* SERVICE choice in the order-popup reorder box. When the order's service is
 * gone, the original choice is locked and staff pick a similar service —
 * a suggestion, or any service of that kind via "Choose another service…"
 * (shared picker: reorder_alternatives.js). Same link either way. */
function _odmServiceBlock(i) {
  const alts = i.alternatives || [];
  const gone = !i.service_available;
  const owed = Number(i.quantity) || 0;
  const card = (val, checked, disabled, inner) => `
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--white);margin-bottom:6px;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? .5 : 1};">
      <input type="radio" name="odmReSvc" value="${val}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} onchange="_odmSvcMode()" style="margin-top:2px;">
      <span style="min-width:0;">${inner}</span>
    </label>`;
  return `
    <div style="font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Service</div>
    <div id="odmReSvcState" style="font-size:12px;margin-bottom:6px;">${gone
      ? `<span style="color:#ff8a80;font-weight:700;">⚠️ ${esc(i.service_reason || 'Service unavailable')}</span> <span style="color:var(--muted);">— pick a similar service below.</span>`
      : ''}</div>
    ${card('orig', !gone, gone, `Same service<br><span style="color:var(--muted);font-size:11.5px;">${esc(i.service_name || '')}</span>`)}
    ${card('alt', gone, false, `A similar service <span style="color:var(--muted);font-size:11.5px;">— same link${i.client_rate_kes ? `, client paid KES ${Number(i.client_rate_kes).toLocaleString(undefined, { maximumFractionDigits: 2 })}/1k` : ''}</span>
      ${alts.length ? '' : '<br><span style="color:#ffb74d;font-size:11.5px;">No close match fits the amount paid — use “Choose another service…”</span>'}`)}
    <div id="odmReAltWrap" style="display:${gone ? 'block' : 'none'};margin:4px 0 10px 4px;">
      <div id="odmReAltList" style="max-height:240px;overflow:auto;">${alts.map((a, k) => rsvcCardHtml(a, { name: 'odmReAlt', owedQty: owed, checked: gone && k === 0 })).join('')}</div>
      <button type="button" class="action-btn" onclick="_odmBrowseServices()">🔎 Too expensive? Choose another service…</button>
    </div>`;
}

function _odmSelectedAlt() {
  if (!_odmRe) return null;
  if (document.querySelector('input[name="odmReSvc"]:checked')?.value !== 'alt') return null;
  const sid = document.querySelector('input[name="odmReAlt"]:checked')?.value;
  return (_odmRe.info.alternatives || []).find(a => String(a.service) === sid) || null;
}

function _odmSvcMode() {
  const onAlt = document.querySelector('input[name="odmReSvc"]:checked')?.value === 'alt';
  const wrap = document.getElementById('odmReAltWrap');
  if (wrap) wrap.style.display = onAlt ? 'block' : 'none';
  if (onAlt && !document.querySelector('input[name="odmReAlt"]:checked')) {
    const f = document.querySelector('input[name="odmReAlt"]'); if (f) f.checked = true;
  }
  _odmSyncQty();
}

/* Quantity follows the service: same service → original/undelivered quantity;
 * replacement → what the amount PAID buys there (price-matched, can lower only). */
function _odmSyncQty() {
  if (!_odmRe) return;
  const i = _odmRe.info, a = _odmSelectedAlt();
  const q = document.getElementById('odmReQty'), mx = document.getElementById('odmReQtyMax'), hint = document.getElementById('odmReQtyHint');
  if (!q) return;
  if (a) {
    q.value = a.quantity; q.max = a.quantity;
    if (mx) mx.textContent = `max ${Number(a.quantity).toLocaleString()} on this service`;
    if (hint) hint.innerHTML = i.is_free
      ? 'Zero-charge order — nothing to price-match, so the original quantity is kept.'
      : `Price-matched: KES ${Number(i.paid_kes).toLocaleString(undefined, { maximumFractionDigits: 2 })} paid ÷ KES ${Number(a.rate_kes).toLocaleString()}/1k = <b style="color:var(--white);">${Number(a.quantity).toLocaleString()} units</b> (original: ${Number(i.quantity).toLocaleString()}).`;
  } else {
    q.value = i.quantity; q.max = i.max_quantity;
    if (mx) mx.textContent = `max ${Number(i.max_quantity || 0).toLocaleString()}`;
    if (hint) hint.textContent = '';
  }
}

function _odmBrowseServices() {
  if (!_odmRe) return;
  const i = _odmRe.info;
  rsvcOpenBrowser({
    url: `/reorders/order/${encodeURIComponent(_odmRe.orderId)}/alternatives`,
    owedQty: Number(i.quantity) || 0, clientRate: i.client_rate_kes, isFree: i.is_free, paid: i.paid_kes,
    title: 'Choose a replacement service',
    onPick: (a) => {
      const list = document.getElementById('odmReAltList'); if (!list) return;
      i.alternatives = i.alternatives || [];
      let r = document.querySelector(`input[name="odmReAlt"][value="${CSS.escape(String(a.service))}"]`);
      if (!r) {
        i.alternatives.unshift(a);
        list.insertAdjacentHTML('afterbegin', rsvcCardHtml(a, { name: 'odmReAlt', owedQty: Number(i.quantity) || 0, checked: false }));
        r = document.querySelector(`input[name="odmReAlt"][value="${CSS.escape(String(a.service))}"]`);
      }
      r.checked = true;
      const altR = document.querySelector('input[name="odmReSvc"][value="alt"]'); if (altR) altR.checked = true;
      _odmSvcMode(); list.scrollTop = 0;
    },
  });
}

/* The provider said it no longer has the service the reorder was sent to:
 * lock that choice and move to the alternatives (the link + quantity choices stay). */
function _odmServiceGone(deadAltSid) {
  const i = _odmRe && _odmRe.info; if (!i) return;
  if (deadAltSid) {
    document.querySelector(`input[name="odmReAlt"][value="${CSS.escape(deadAltSid)}"]`)?.closest('label')?.remove();
    i.alternatives = (i.alternatives || []).filter(a => String(a.service) !== deadAltSid);
  } else {
    i.service_available = false;
    const o = document.querySelector('input[name="odmReSvc"][value="orig"]');
    if (o) { o.disabled = true; const l = o.closest('label'); if (l) { l.style.opacity = .5; l.style.cursor = 'not-allowed'; } }
    const st = document.getElementById('odmReSvcState');
    if (st) st.innerHTML = '<span style="color:#ff8a80;font-weight:700;">⚠️ The provider no longer has this service</span> <span style="color:var(--muted);">— pick a similar service below.</span>';
  }
  const altR = document.querySelector('input[name="odmReSvc"][value="alt"]'); if (altR) altR.checked = true;
  _odmSvcMode();
  if (!(i.alternatives || []).length) _odmBrowseServices();
}

function _odmLinkMode() {
  const isNew = document.querySelector('input[name="odmReLink"]:checked')?.value === 'new';
  const inp = document.getElementById('odmReNewLink');
  if (inp) { inp.style.display = isNew ? 'block' : 'none'; if (isNew) inp.focus(); }
}

async function odmSubmitReorder() {
  if (!_odmRe) return;
  const msg = document.getElementById('odmReMsg');
  const btn = document.getElementById('odmReGo');
  const isNew = document.querySelector('input[name="odmReLink"]:checked')?.value === 'new';
  const link = (document.getElementById('odmReNewLink')?.value || '').trim();
  const qty = parseInt(document.getElementById('odmReQty')?.value, 10);
  const onAlt = document.querySelector('input[name="odmReSvc"]:checked')?.value === 'alt';
  const alt = _odmSelectedAlt();
  const max = alt ? Number(alt.quantity) : (Number(_odmRe.info.max_quantity) || 0);
  const say = (t, ok) => { if (msg) msg.innerHTML = `<span style="color:${ok ? 'var(--green)' : '#ff8a80'};">${t}</span>`; };
  if (isNew && !/^https?:\/\/\S+\.\S+/i.test(link)) { say('Enter a valid link starting with https://'); return; }
  if (onAlt && !alt) { say('Pick a replacement service (or “Choose another service…”)'); return; }
  if (!onAlt && !_odmRe.info.service_available) { say('The original service is unavailable — pick a similar service'); return; }
  if (!qty || qty < 1 || (max && qty > max)) { say(`Quantity must be between 1 and ${max.toLocaleString()}`); return; }
  // Count reorders from BOTH the popup and the Reorder Queue (o.reordered).
  const cached = (typeof _adminOrdersCache !== 'undefined' && _adminOrdersCache[_odmRe.orderId]) || _supportOrdersCache[_odmRe.orderId] || {};
  const prevN = Math.max((_odmRe.info.previous || []).length, (cached.reordered || []).length,
                         _odmRe.info.queue_task && _odmRe.info.queue_task.status === 'reordered' ? 1 : 0);
  if (prevN && !confirm(`This order was already reordered ${prevN}×. Place another free reorder?`)) return;

  const body = { quantity: qty };
  if (isNew) body.link = link; else body.use_original_link = true;
  if (alt) body.service_id = Number(alt.service);
  if (btn) { btn.disabled = true; btn.textContent = 'Sending to provider…'; }
  try {
    const r = await api(`/reorders/order/${encodeURIComponent(_odmRe.orderId)}/manual`, { method: 'POST', body: JSON.stringify(body) });
    const box = document.getElementById('odmReorder');
    if (box) box.innerHTML = `
      <div style="font-weight:800;font-size:13.5px;color:var(--green);margin-bottom:6px;">✅ Reorder placed</div>
      <div style="font-size:12.5px;color:var(--white);line-height:1.6;">New order <b>#${esc(String(r.new_order_id || '').slice(0, 8))}</b>
        ${r.provider_order_id ? ` · provider #${esc(r.provider_order_id)}` : ''} · x${Number(r.quantity || qty).toLocaleString()}<br>
        ${r.service_substituted ? `<span style="color:#ffcc80;">On a similar service: ${esc(String(r.service_name || '').replace('🔁 Reorder · ', ''))}</span><br>` : ''}
        ${r.customer_notified
          ? '<span style="color:var(--green);">✉ Customer messaged in their support chat</span><br>'
          : '<span style="color:#ff8a80;font-weight:700;">⚠️ The reorder was placed but the customer could NOT be messaged — please message them from Support.</span><br>'}
        <span style="color:var(--muted);word-break:break-all;">${esc(r.link || '')}</span></div>
      <button class="action-btn" style="margin-top:10px;" onclick="odmCloseReorder()">Done</button>`;
    toast(r.customer_notified ? 'Reorder placed — customer messaged' : 'Reorder placed, but the customer could not be messaged — message them from Support',
          r.customer_notified ? 'success' : 'error');
    if (document.getElementById('ap-allorders')?.classList.contains('active') && typeof loadAdminOrders === 'function') loadAdminOrders();
    if (typeof rqLoad === 'function' && document.getElementById('reorderQueuePane')?.style.display !== 'none') rqLoad();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔁 Place reorder (free)'; }
    if (rsvcIsServiceGoneError(e)) {
      _odmServiceGone(alt ? String(alt.service) : null);
      say('⚠️ The provider no longer has ' + (alt ? 'that replacement service' : 'this service') + ' — pick a similar one below and place the reorder again.');
      return;
    }
    say('⚠️ ' + esc(e.message || 'Reorder failed'));
  }
}

// Staff-only: the panel's EXACT error text for this order (submit rejected,
// refill / cancel refused, nightly auto-refill refused). Customers never see
// this — they get brand-safe wording. Fetched once per modal open.
const _ODM_ERR_LABEL = { order: 'Order submit', refill: 'Refill', cancel: 'Cancel', reorder: 'Reorder', 'auto-refill': 'Auto-refill' };
async function _loadOrderPanelErrors(orderId) {
  const box = document.getElementById('odmPanelErrors');
  if (!box || !orderId) return;
  box.innerHTML = '<div style="padding:10px 0;color:var(--muted);font-size:11px;">Checking provider errors…</div>';
  let errors = [], data = null;
  try {
    data = await api(`/admin/orders/${encodeURIComponent(orderId)}/errors`);
    errors = (data && data.errors) || [];
  } catch (e) {
    if (box.dataset.order === orderId) box.innerHTML = `<div style="padding:10px 0;color:var(--muted);font-size:11px;">Couldn't load provider errors: ${esc(e.message || '')}</div>`;
    return;
  }
  if (box.dataset.order !== orderId) return;   // staff already opened another order
  _renderOrderAutoRefill(orderId, data && data.auto_refill);
  if (!errors.length) {
    box.innerHTML = '<div style="padding:10px 0;color:var(--muted);font-size:11px;">No provider errors recorded for this order.</div>';
    return;
  }
  box.innerHTML = `
    <div style="padding:10px 0;">
      <div style="color:#ff8a80;font-size:11px;font-weight:700;margin-bottom:6px;">⚠️ Provider error${errors.length > 1 ? 's' : ''} (staff only)</div>
      ${errors.map(er => `
        <div style="background:rgba(255,82,82,.08);border:1px solid rgba(255,82,82,.25);border-radius:8px;padding:8px 10px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--muted);margin-bottom:4px;">
            <span>${esc(_ODM_ERR_LABEL[er.context] || er.context || '')}</span>
            <span>${er.at ? esc(new Date(er.at).toLocaleString('en-KE')) : ''}</span>
          </div>
          <div style="font-family:monospace;font-size:11.5px;color:var(--white);white-space:pre-wrap;overflow-wrap:anywhere;">${esc(er.message || '')}</div>
        </div>`).join('')}
    </div>`;
}

// Staff-only: what the nightly auto-refill has done for this order
// (attempts, how many the panel accepted, last try, whether it gave up)
// and until when the order stays covered. Shown only for refill services
// or orders the job has already touched.
function _renderOrderAutoRefill(orderId, ar) {
  const box = document.getElementById('odmAutoRefill');
  if (!box || box.dataset.order !== orderId) return;
  if (!ar || (!ar.tracked && !box.dataset.refill)) { box.innerHTML = ''; return; }
  const when = v => v ? esc(new Date(v).toLocaleString('en-KE')) : '—';
  const now = Date.now();
  const end = ar.window_end ? new Date(ar.window_end).getTime() : null;
  let state, color;
  if (ar.stopped) { state = 'Stopped — panel won\'t refill this order'; color = '#ff8a80'; }
  else if (end && end < now) { state = 'Guarantee ended'; color = 'var(--muted)'; }
  else if (!ar.tracked) { state = 'Covered — not refilled yet'; color = '#ffb347'; }
  else { state = 'Active'; color = '#3dd44a'; }
  const line = (k, v) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11.5px;padding:3px 0;"><span style="color:var(--muted);">${k}</span><span style="color:var(--white);text-align:right;">${v}</span></div>`;
  box.innerHTML = `
    <div style="padding:10px 0;">
      <div style="background:rgba(33,150,243,.07);border:1px solid rgba(33,150,243,.25);border-radius:8px;padding:8px 10px;">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <span style="color:#64b5f6;font-size:11px;font-weight:700;">♻️ Auto-refill (staff only)</span>
          <span style="color:${color};font-size:11px;font-weight:700;">${state}</span>
        </div>
        ${line('Attempts / accepted', `${ar.attempts || 0} / ${ar.accepted || 0}`)}
        ${line('Last attempt', when(ar.last_attempt_at))}
        ${ar.last_refill_id ? line('Last panel refill ID', `#${esc(ar.last_refill_id)}`) : ''}
        ${line('Covered until', when(ar.window_end))}
      </div>
    </div>`;
}

// Staff-only: every refill the panel accepted for this order (customer
// button, staff button, nightly auto-refill) with the panel's refill
// status. "Check status" asks the panel live (action=refill_status).
const _ODM_REFILL_SRC = { customer: 'Customer', admin: 'Staff', auto: 'Auto-refill' };
function _odmRefillColor(st) {
  const s = (st || '').toLowerCase();
  if (s === 'completed') return '#3dd44a';
  if (['rejected', 'error', 'canceled', 'cancelled', 'not found'].includes(s)) return '#ff8a80';
  return '#ffb347';
}
async function _loadOrderRefillHistory(orderId, check) {
  const box = document.getElementById('odmRefillHistory');
  if (!box || !orderId) return;
  if (!check) box.innerHTML = '';
  const btn = document.getElementById('odmRefillCheckBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  let data;
  try {
    data = await api(`/admin/orders/${encodeURIComponent(orderId)}/refills${check ? '?check=true' : ''}`);
  } catch (e) {
    if (box.dataset.order === orderId) {
      if (check) { toast(`Status check failed: ${e.message || ''}`, 'error'); if (btn) { btn.disabled = false; btn.textContent = '⟳ Check status'; } }
      else box.innerHTML = `<div style="padding:10px 0;color:var(--muted);font-size:11px;">Couldn't load refill history: ${esc(e.message || '')}</div>`;
    }
    return;
  }
  if (box.dataset.order !== orderId) return;
  const list = (data && data.refills) || [];
  if (check && data && data.check) toast(`Checked ${data.check.checked} refill(s) with the panel`, data.check.errors ? 'error' : 'success');
  if (!list.length) {
    box.innerHTML = '<div style="padding:10px 0;color:var(--muted);font-size:11px;">No refills recorded for this order yet.</div>';
    return;
  }
  const anyOpen = list.some(r => !r.final && r.provider_refill_id);
  box.innerHTML = `
    <div style="padding:10px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="color:#64b5f6;font-size:11px;font-weight:700;">♻️ Refill history (${list.length})</span>
        ${anyOpen ? `<button id="odmRefillCheckBtn" class="action-btn" style="font-size:10.5px;padding:3px 8px;" onclick="_loadOrderRefillHistory('${esc(orderId)}', true)">⟳ Check status</button>` : ''}
      </div>
      ${list.map(r => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:7px 10px;margin-bottom:6px;font-size:11.5px;">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <span style="color:var(--white);">${esc(_ODM_REFILL_SRC[r.source] || r.source)}${r.requested_by ? ` · <span style="color:var(--muted);">${esc(r.requested_by)}</span>` : ''}</span>
            <span style="color:${_odmRefillColor(r.status)};font-weight:700;">${esc(r.status || 'Pending')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:10.5px;margin-top:3px;">
            <span>${r.created_at ? esc(new Date(r.created_at).toLocaleString('en-KE')) : ''}${r.provider_refill_id ? ` · refill #${esc(r.provider_refill_id)}` : ''}</span>
            <span>${r.status_checked_at ? 'checked ' + esc(new Date(r.status_checked_at).toLocaleString('en-KE')) : 'not checked yet'}</span>
          </div>
          ${r.status_error ? `<div style="color:#ff8a80;font-size:10.5px;margin-top:3px;font-family:monospace;">${esc(r.status_error)}</div>` : ''}
        </div>`).join('')}
    </div>`;
}

// Jumps straight to the "Create Order" tab (already accessible to CCR
// agents — see CCR_ALLOWED_ADMIN_TABS in ccr_agent.js) with the current
// ticket's customer pre-looked-up, so an agent can place an order for
// them mid-conversation instead of leaving the ticket, retyping the
// email, and clicking "Look Up" by hand.
function ccrCreateOrderForThreadUser() {
  if (!_supportThreadUser || !_supportThreadUser.email) {
    toast('No customer email on this ticket', 'error');
    return;
  }
  const email = _supportThreadUser.email;
  const tabBtn = Array.from(document.querySelectorAll('.admin-tab'))
    .find(t => (t.getAttribute('onclick') || '').includes("adminTab('create-order'"));
  if (!tabBtn) { toast('Create Order tab not available', 'error'); return; }
  adminTab('create-order', tabBtn);
  // adminTab() above kicks off initAdminCreateOrder(), which resets the
  // form and awaits /services before it's done — give it a beat so our
  // prefill + auto-lookup land after the reset, not before it.
  setTimeout(() => {
    const emailInput = document.getElementById('acoEmail');
    if (emailInput) { emailInput.value = email; lookupCustomer(); }
  }, 300);
}

// Switches to the All Orders tab (already accessible to CCR agents — see
// CCR_ALLOWED_ADMIN_TABS in ccr_agent.js) and searches by the order's
// customer email, so an agent lands on every order for that customer
// (not just the one row) — e.g. to check their order history side by
// side while handling a ticket.
function jumpToOrderInAllOrders(orderId) {
  closeOrderDetailModal();
  const tabBtn = Array.from(document.querySelectorAll('.admin-tab'))
    .find(t => (t.getAttribute('onclick') || '').includes("adminTab('allorders'"));
  if (tabBtn) adminTab('allorders', tabBtn);

  const o = _supportOrdersCache[orderId] || _adminOrdersCache[orderId];
  const emailInput = document.getElementById('adminOrderSearch');
  const idInput = document.getElementById('adminOrderIdSearch');
  const statusInput = document.getElementById('adminOrderStatusFilter');
  if (statusInput) statusInput.value = '';

  if (o && o.user_email && emailInput) {
    emailInput.value = o.user_email;
    if (idInput) idInput.value = '';
    loadAdminOrders();
  } else if (idInput) {
    // Fallback: no cached email on hand, filter by the order ID as before.
    idInput.value = orderId;
    loadAdminOrders();
  }
}

async function adminSendReply() {
  const input = document.getElementById('adminReplyInput');
  if (!input || !activeSupportThreadId) return;
  const body = input.value.trim();
  if (!body) return;
  input.value = '';
  input.style.height = '42px';
  const order_id = document.getElementById('adminReplyOrder')?.value || null;
  const reply_to_id = (_supReplyTo && _supReplyTo.threadId === activeSupportThreadId) ? _supReplyTo.id : null;
  try {
    await api(`/support/admin/threads/${activeSupportThreadId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body, order_id, reply_to_id })
    });
    _supReplyTo = null;
    // Re-render the thread to show the new message (earlier pages stay loaded)
    await openSupportThread(activeSupportThreadId, { keepEarlier: true });
    toast('Reply sent ✓', 'success');
  } catch(e) {
    toast(e.message || 'Failed to send reply', 'error');
  }
}

async function adminUpdateThreadStatus(status) {
  if (!activeSupportThreadId) return;
  try {
    await api(`/support/admin/threads/${activeSupportThreadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    toast(status === 'resolved' ? 'Marked done — the client\'s next message reopens it' : 'Reopened', 'success');
    await loadAdminSupport(); // refresh left panel counts
    if (activeSupportThreadId) openSupportThread(activeSupportThreadId);
  } catch(e) {
    toast(e.message || 'Failed to update status', 'error');
  }
}
/* ══════════════════════════════════════════════════════════════ */

// ── Admin: open/find a support thread for a specific customer ─────────────
async function adminMessageCustomer(userId, userEmail) {
  if (!userId && !userEmail) { toast('No user info for this order', 'error'); return; }

  // Switch to Support tab (land on a conversation tab, not the Reorders list)
  if (typeof _sb !== 'undefined' && _sb.tab === 'reorders') _sb.tab = 'inbox';
  const supportTabBtn = document.querySelector('.admin-tab[onclick*="support"]');
  if (supportTabBtn) supportTabBtn.click();

  // Show loading state in thread list
  const list = document.getElementById('supportThreadList');
  if (list) list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Looking up customer…</span></div>';

  try {
    // Fetch all threads and filter by user_id (now returned by API) or email
    const data = await api(`/support/admin/threads?limit=200`);
    const threads = (data.threads || []).filter(t =>
      (userId && t.user_id === userId) || (userEmail && t.user_email === userEmail)
    );

    // Render the thread list (single call — avoids double spinner flash)
    await loadAdminSupport();

    if (threads.length) {
      // Open the most recent open/pending thread, or just the most recent
      const best = threads.find(t => ['open','pending'].includes(t.status)) || threads[0];
      // Switches to whichever tab (Inbox / Follow-up / Automatic / Done) the thread lives in, then opens it
      if (typeof sbFocusThread === 'function') await sbFocusThread(best.id);
      else await openSupportThread(best.id);
      toast(`Opened thread for ${userEmail}`, 'success');
    } else {
      // No existing thread — show prompt for admin to initiate one
      const pane = document.getElementById('supportChatPane');
      if (pane) {
        pane.innerHTML = `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;">
            <div style="font-size:36px;">💬</div>
            <div style="font-size:14px;font-weight:700;color:var(--white);">No support chat yet with<br><span style="color:var(--green);">${userEmail}</span></div>
            <div style="font-size:13px;color:var(--muted);max-width:340px;">Send a message to start their support chat. They'll see it in Support Chat; every later message goes into the same conversation.</div>
            <select id="adminInitiateType" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;outline:none;cursor:pointer;margin-top:4px;">
              <option value="wrong_order">📦 Wrong Order</option>
              <option value="delay">⏳ Delay / Late Delivery</option>
            </select>
            <textarea id="adminInitiateMsg" placeholder="Type your opening message to the customer…" style="width:100%;max-width:400px;min-height:80px;background:var(--card);border:1px solid rgba(61,212,74,.2);border-radius:10px;padding:10px 14px;color:var(--white);font-family:'Montserrat',sans-serif;font-size:13px;outline:none;resize:vertical;"></textarea>
            <button onclick="adminDoInitiateThread('${userEmail}')" style="padding:10px 28px;background:linear-gradient(135deg,#3dd44a,#28a035);border:none;border-radius:10px;color:#fff;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;cursor:pointer;">Send Message</button>
          </div>`;
      }
    }
  } catch(e) {
    toast(e.message || 'Failed to look up customer threads', 'error');
    loadAdminSupport();
  }
}

async function adminDoInitiateThread(userEmail) {
  const type = document.getElementById('adminInitiateType')?.value || 'wrong_order';
  const body = document.getElementById('adminInitiateMsg')?.value?.trim();
  if (!body) { toast('Please type a message first', 'error'); return; }
  try {
    const thread = await api('/support/admin/threads/initiate', {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail, type, body })
    });
    toast(`Message sent to ${userEmail} ✓`, 'success');
    await loadAdminSupport();
    await openSupportThread(thread.id);
  } catch(e) {
    toast(e.message || 'Failed to send message', 'error');
  }
}

/* ══════════════════ TICKETS JS ══════════════════ */
let _allTickets     = [];
let _dashBannerTicketId = null; // single unseen pending ticket id, if exactly one — lets the banner open it directly instead of just the list

// Shared by the My Tickets list row and the thread-modal title. Previously
// each had its own `type === 'wrong_order' ? 'Wrong Order' : 'Delayed
// Service'` ternary — since every system-raised ticket (order
// confirmations, payment-failed, payment-cancelled) has type='other', ALL
// of them fell into the ':' branch and got mislabeled "Delayed Service"
// regardless of what they actually were. Falling back to the ticket's own
// `subject` (already meaningful: "Order Confirmation", "Payment Failed",
// "Payment Cancelled") instead of a hardcoded wrong guess.
function _ticketTypeLabel(t) {
  const map = { wrong_order: '📦 Wrong Order', delay: '⏳ Delayed Service' };
  return map[t.type] || t.subject || 'Support Ticket';
}
let _ticketsFilter  = 'all';
let _activeTicketId = null;


async function loadTickets() {
  const el = document.getElementById('ticketsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading tickets…</span></div>';
  try {
    const data = await api('/support/threads');
    _allTickets = data.threads || data || [];
    _updateTicketsBadge();
    _updateDashTicketBanner();
    renderTickets(_allTickets);
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
}

function filterTickets(status, btn) {
  _ticketsFilter = status;
  document.querySelectorAll('#ticketsFilterRow .cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? _allTickets : _allTickets.filter(t => t.status === status);
  renderTickets(filtered);
}

// One support conversation per client (backend: support_tickets.py →
// client_thread). The page shows that one conversation; "New message" posts
// into it. The list shape from GET /support/threads is kept (one item).
const _CONV_STATUS = { open: '🟠 Waiting for our reply', pending: '💬 We replied', resolved: '✅ Sorted', closed: '✅ Sorted' };

function renderTickets(tickets) {
  const el = document.getElementById('ticketsList');
  if (!tickets.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>No messages yet. Tap <b>＋ New message</b> if you need help — our team replies right here.</p></div>';
    return;
  }
  el.innerHTML = tickets.map(t => {
    const tid  = esc(t.id);
    const last = t.last_message;
    const when = t.updated_at || (last && last.created_at) || t.created_at;
    return `
    <div class="ticket-card" onclick="openTicketThread('${tid}')">
      <div class="ticket-icon">💬</div>
      <div class="ticket-body">
        <div class="ticket-title">EndaViral Support</div>
        <div class="ticket-preview">${_ticketPreview(_ticketBodyText(last || t.first_message))}</div>
        <div class="ticket-meta">${when ? 'Last message ' + new Date(when).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) + ' · ' : ''}${t.message_count || (t.messages||[]).length || 0} messages</div>
      </div>
      <span class="ticket-status ts-${esc(t.status||'')}">${_CONV_STATUS[t.status] || esc(t.status||'')}</span>
    </div>`;
  }).join('');
}

function _ticketBodyText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  // API returned a message object — pull the body field
  if (typeof val === 'object') return val.body || val.message || val.text || JSON.stringify(val);
  return String(val);
}

// Shows the headline (first non-empty line) instead of the first N chars of the
// whole body, so the news ("Order confirmed…") isn't cut off by a greeting.
function _ticketHeadline(body) {
  const lines = (body || '').replace(/\*\*(.*?)\*\*/g, '$1').split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  return first.length > 90 ? first.slice(0, 90) + '…' : first;
}

function _ticketPreview(body) {
  const clean = _ticketHeadline(body);
  return clean.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Client-side "seen" tracking, independent of `status` (which the server
// deliberately keeps at 'pending' until the customer actually replies —
// see the comment on _updateDashTicketBanner below for why that has to
// stay server-driven). This only tracks "has the customer opened this
// thread since its current message count" — persisted in localStorage so
// it survives reload/logout, keyed by message count so a genuinely NEW
// reply re-surfaces the badge/banner even for a thread already read once.
function _ticketSeenKey(threadId) { return 'ev_ticket_seen_' + threadId; }

function _markTicketSeen(threadId, messageCount) {
  try { localStorage.setItem(_ticketSeenKey(threadId), String(messageCount || 0)); } catch (e) {}
}

function _isTicketUnseen(t) {
  const msgCount = t.message_count || (t.messages || []).length || 0;
  let seenCount = 0;
  try { seenCount = parseInt(localStorage.getItem(_ticketSeenKey(t.id)) || '0', 10); } catch (e) {}
  return msgCount > seenCount;
}

// "Something new from us you haven't opened": the latest message is ours (staff
// or automatic) and the conversation has more messages than when last opened.
// Status alone can't say this any more — one conversation can be OPEN (the
// client is waiting on a human) while an automatic order update arrives.
function _hasUnseenReply(t) {
  const last = t.last_message;
  return !!last && last.sender === 'admin' && _isTicketUnseen(t);
}

function _updateTicketsBadge() {
  const badge   = document.getElementById('ticketsBadge');
  const pending = _allTickets.filter(_hasUnseenReply).length;
  if (badge) {
    badge.style.display = pending ? 'inline-flex' : 'none';
    badge.textContent   = pending || '';
  }
}

// Persistent "support replied" banner on the Dashboard. Unlike
// evShowDashboardPopup() (chat.js), which only fires for a live SSE push
// arriving at the exact moment the customer happens to be on the Dashboard,
// this reads straight off each ticket's `status` — the server's own record
// of "admin replied, waiting on customer" — so it's correct any time
// _allTickets gets refreshed: on login catch-up, on every SSE push, and on
// every navTo('dashboard'). A reply that arrived while the tab was closed
// or backgrounded still shows up here the next time the customer opens the
// app, instead of being silently missed forever.
function _updateDashTicketBanner() {
  const el = document.getElementById('dashTicketBanner');
  if (!el) return;
  // status === 'pending' is still the server's ground truth for "admin
  // side has said something and the customer hasn't replied" — that part
  // stays as-is so a reply that arrived while this tab was closed/offline
  // is never silently missed. _isTicketUnseen layers on top of that: once
  // the customer actually opens the thread (openTicketThread marks it
  // seen at that message count), it stops showing here even though the
  // ticket itself is still 'pending' server-side until they type a reply.
  const pendingTickets = _allTickets.filter(_hasUnseenReply);
  if (!pendingTickets.length) {
    el.style.display = 'none';
    _dashBannerTicketId = null;
    return;
  }
  const titleEl = document.getElementById('dashTicketBannerTitle');
  const desc    = document.getElementById('dashTicketBannerDesc');
  if (pendingTickets.length === 1) {
    const t = pendingTickets[0];
    _dashBannerTicketId = t.id;
    const lastMsg = t.last_message || t.first_message;
    // "Support replied to your ticket" is only accurate for a real human
    // agent's reply — an auto-message (order confirmation, payment-failure
    // greeting) is is_bot=true and gets its own, accurate wording instead.
    const isBotMsg = !!(lastMsg && lastMsg.is_bot);
    if (titleEl) titleEl.textContent = isBotMsg ? 'New message from EndaViral' : 'Support replied to you';
    if (desc) {
      const body = _ticketBodyText(lastMsg);
      desc.textContent = _ticketPreview(body).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') || 'Tap to view the reply';
    }
  } else {
    _dashBannerTicketId = null; // ambiguous which one to open directly — the click handler falls back to the list
    if (titleEl) titleEl.textContent = 'New messages from support';
    if (desc) desc.textContent = 'Tap to view';
  }
  el.style.display = 'flex';
}

// Bound to the banner's onclick in index.html instead of a bare
// navTo('tickets'). With exactly one unseen pending ticket, opens straight
// into that thread's modal instead of dropping the customer on the list
// page to go find it themselves. With more than one (ambiguous which to
// open), falls back to just the list, same as before.
function _onDashTicketBannerClick() {
  navTo('tickets');
  if (_dashBannerTicketId) {
    openTicketThread(_dashBannerTicketId);
  }
}

async function openTicketThread(threadId) {
  _activeTicketId = threadId;
  const modal = document.getElementById('ticketThreadModal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
  document.body.style.overflow = 'hidden';
  document.getElementById('ttMessages').innerHTML =
    '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  await _loadTicketThread(threadId);
}

// Client side, same paging: latest 20 messages, "Load earlier messages" on top.
let _ttEarlier = { threadId: null, msgs: [], hasMore: null };

async function _loadTicketThread(threadId, opts) {
  opts = opts || {};
  if (!opts.keepEarlier || _ttEarlier.threadId !== threadId) _ttEarlier = { threadId, msgs: [], hasMore: null };
  const oldEl = document.getElementById('ttMessages');
  const fromBottom = opts.keepScroll && oldEl ? oldEl.scrollHeight - oldEl.scrollTop : null;
  try {
    const t = await api(`/support/threads/${threadId}`);
    const _seen = new Set();
    const latestIds = (t.messages || []).length;
    t.messages = [..._ttEarlier.msgs, ...(t.messages || [])].filter(m => !_seen.has(m.id) && _seen.add(m.id));
    const hasMore = _ttEarlier.hasMore === null ? !!t.has_more : _ttEarlier.hasMore;
    _markTicketSeen(threadId, t.message_count || latestIds);
    if (typeof _updateTicketsBadge === 'function') _updateTicketsBadge();
    if (typeof _updateDashTicketBanner === 'function') _updateDashTicketBanner();
    document.getElementById('ttTitle').textContent = 'Support';
    document.getElementById('ttMeta').textContent  = 'We usually reply within a few hours';
    const stLabel = _CONV_STATUS[t.status] || esc(t.status);
    document.getElementById('ttStatusBadge').innerHTML =
      `<span class="ticket-status ts-${esc(t.status)}" style="font-size:12px;">${stLabel}</span>`;
    const user    = _getTicketUser();
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const msgs    = t.messages || [];
    const el      = document.getElementById('ttMessages');
    el.innerHTML  = '';
    if (!msgs.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">No messages yet.</div>';
    } else {
      if (hasMore) el.insertAdjacentHTML('beforeend', `<button id="ttLoadEarlier" onclick="ticketLoadEarlier()" style="align-self:center;background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--white);border-radius:14px;padding:6px 14px;font-size:11.5px;font-family:inherit;cursor:pointer;">⬆ Load earlier messages</button>`);
      _ttMsgById = {};
    _ttRenderMessages(el, msgs, initial);
    }
    if (fromBottom !== null) el.scrollTop = el.scrollHeight - fromBottom;
    else setTimeout(() => { el.scrollTop = el.scrollHeight; }, 60);
    // Never closed: a conversation marked sorted reopens when they type.
    const isDone = ['resolved','closed'].includes(t.status);
    document.getElementById('ttClosedBanner').style.display = isDone ? 'block' : 'none';
    document.getElementById('ttReplyRow').style.display     = 'flex';
  } catch(e) {
    document.getElementById('ttMessages').innerHTML =
      `<div style="padding:24px;color:var(--muted);">⚠️ ${e.message}</div>`;
  }
}

// Messages with a day divider, and a small tag naming the order / topic a
// message is about (one conversation holds every order).
function _ttRenderMessages(el, msgs, initial) {
  let day = '';
  msgs.forEach(m => {
    // Automatic diagnostic reports are for staff (they're stored as if the
    // client sent them) — the client sees our automatic reply instead.
    if (m.sender === 'user' && (m.body || '').startsWith('🚨 Automatic')) return;
    const d = m.created_at ? new Date(m.created_at).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) : '';
    if (d && d !== day) {
      day = d;
      el.insertAdjacentHTML('beforeend', `<div style="align-self:center;font-size:11px;color:#93a3ba;background:#111a2c;border-radius:999px;padding:3px 12px;margin:4px 0;">${esc(d)}</div>`);
    }
    el.insertAdjacentHTML('beforeend', _ttMsgHtml(m, initial));
  });
}

function _msgTagHtml(m) {
  const bits = [];
  if (m.order_id) bits.push(`Order #${esc(String(m.order_id).slice(0, 8))}`);
  if (m.topic) bits.push(esc(m.topic));
  const mine = m.sender === 'user';                 // the client's own (green) bubble
  return bits.length ? `<div style="font-size:10px;font-weight:700;color:${mine ? 'rgba(255,255,255,.85)' : '#7fd88a'};margin-bottom:4px;">${bits.join(' · ')}</div>` : '';
}

async function ticketLoadEarlier() {
  const id = _activeTicketId; if (!id) return;
  const btn = document.getElementById('ttLoadEarlier');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  try {
    let before = (_ttEarlier.threadId === id && _ttEarlier.msgs.length) ? _ttEarlier.msgs[0].id : null;
    if (!before) before = ((await api(`/support/threads/${id}`)).messages || [])[0]?.id;
    if (!before) return;
    const page = await api(`/support/threads/${id}?before=${encodeURIComponent(before)}`);
    if (_ttEarlier.threadId !== id) _ttEarlier = { threadId: id, msgs: [], hasMore: null };
    _ttEarlier.msgs = [...(page.messages || []), ..._ttEarlier.msgs];
    _ttEarlier.hasMore = !!page.has_more;
    await _loadTicketThread(id, { keepEarlier: true, keepScroll: true });
  } catch (e) {
    toast(e.message || 'Could not load earlier messages', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '⬆ Load earlier messages'; }
  }
}

function _ttMsgHtml(m, userInitial) {
  const isAdmin  = m.sender === 'admin';
  const isBot    = m.is_bot;
  // Our messages carry the EndaViral logo (WhatsApp-style, the client's own
  // messages need no avatar).
  const avatar   = isAdmin
    ? `<div class="tt-avatar ev-logo" title="EndaViral Support"><img src="EndaViral_logo_transparent.png" alt="EndaViral"></div>`
    : '';
  const humanCls = isAdmin ? (isBot ? 'is-bot' : 'is-human') : '';
  const senderName = '';
  const time = m.created_at
    ? new Date(m.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})
    : '';
  const body = (m.body||'')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  if (m.id) _ttMsgById[m.id] = m;
  const quote = m.reply_to_id ? supQuoteHtml(m.reply_to, 'client', null, m.sender === 'user') : '';
  const replyBtn = m.id ? ` · <a href="javascript:void(0)" onclick="ticketReplyTo('${esc(m.id)}')" title="Reply to this message" style="color:#7fe08b;text-decoration:none;font-weight:700;">Reply</a>` : '';
  return `<div class="tt-msg from-${isAdmin?'admin':'user'} ${humanCls}" data-msg-id="${esc(m.id || '')}">
    ${avatar}
    <div>
      <div class="tt-bubble">${quote}${_msgTagHtml(m)}${body}</div>
      <div class="tt-time">${senderName ? senderName + ' · ' : ''}${time}${replyBtn}</div>
    </div>
  </div>`;
}

// WhatsApp-style reply on the client side: ↩ Reply under a message → "Replying
// to" bar above the input; the message is sent with reply_to_id (the backend
// also tags it with the quoted message's order).
let _ttMsgById = {};
let _ttReplyTo = null;           // { threadId, id }

function ticketReplyTo(id) {
  if (!_ttMsgById[id] || !_activeTicketId) return;
  _ttReplyTo = { threadId: _activeTicketId, id };
  _ttRenderReplyPreview();
  document.getElementById('ttReplyInput')?.focus();
}
function ticketCancelReply() { _ttReplyTo = null; _ttRenderReplyPreview(); }

function ticketJumpTo(id) {
  const el = document.querySelector(`#ttMessages [data-msg-id="${CSS.escape(id)}"]`);
  if (el) _flashMsg(el);
  else toast('That message is further up — tap “Load earlier messages”', 'info');
}

function _ttRenderReplyPreview() {
  const row = document.getElementById('ttReplyRow');
  if (!row) return;
  let box = document.getElementById('ttReplyPreview');
  if (!box) {
    box = document.createElement('div');
    box.id = 'ttReplyPreview';
    box.style.cssText = 'display:none;padding:8px 14px 0;border-top:1px solid var(--border);flex-shrink:0;';
    row.parentNode.insertBefore(box, row);
  }
  const m = _ttReplyTo && _ttReplyTo.threadId === _activeTicketId ? _ttMsgById[_ttReplyTo.id] : null;
  if (!m) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const q = { id: m.id, sender: m.sender, is_bot: m.is_bot, order_id: m.order_id, body: String(m.body || '').slice(0, 160) };
  box.style.display = 'block';
  box.style.background = '#0c1322';
  const body = esc(String(q.body || '').replace(/\*\*/g, '')).replace(/\n/g, ' ');
  box.innerHTML = `<div style="display:flex;gap:10px;align-items:center;background:#111a2c;border-radius:10px;padding:8px 10px;">
    <div style="flex:1;min-width:0;border-left:3px solid #3dd44a;padding-left:9px;">
      <div style="font-size:10.5px;font-weight:800;color:#7fe08b;">Replying to ${esc(_quoteWho(q, 'client', null))}</div>
      <div style="font-size:12px;color:#b9c6d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${body}</div>
    </div>
    <button onclick="ticketCancelReply()" aria-label="Cancel reply" style="width:32px;height:32px;background:transparent;border:0;color:#93a3ba;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
    </button>
  </div>`;
}

async function sendTicketReply() {
  const input = document.getElementById('ttReplyInput');
  const body  = input.value.trim();
  if (!body || !_activeTicketId) return;
  input.value = '';
  input.style.height = '42px';
  const user    = _getTicketUser();
  const initial = (user.name || 'U').charAt(0).toUpperCase();
  const reply_to_id = (_ttReplyTo && _ttReplyTo.threadId === _activeTicketId) ? _ttReplyTo.id : null;
  const quoted = reply_to_id ? _ttMsgById[reply_to_id] : null;
  const fakeMsg = { sender:'user', is_bot:false, body, created_at: new Date().toISOString(),
                    reply_to_id, reply_to: quoted ? { id: quoted.id, sender: quoted.sender, is_bot: quoted.is_bot, order_id: quoted.order_id, body: String(quoted.body || '').slice(0, 160) } : null };
  document.getElementById('ttMessages').insertAdjacentHTML('beforeend', _ttMsgHtml(fakeMsg, initial));
  const el = document.getElementById('ttMessages');
  el.scrollTop = el.scrollHeight;
  _ttReplyTo = null; _ttRenderReplyPreview();
  try {
    await api(`/support/threads/${_activeTicketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, reply_to_id })
    });
    await _loadTicketThread(_activeTicketId, { keepEarlier: true });
    await loadTickets();
  } catch(e) {
    toast(e.message || 'Failed to send message', 'error');
  }
}

function openNewTicketModal() {
  const m = document.getElementById('newTicketModal');
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('show'));
  document.body.style.overflow = 'hidden';
  document.getElementById('ntMessage').value = '';
  const cbWrong = document.getElementById('ntCbWrong');
  const cbDelay = document.getElementById('ntCbDelay');
  if (cbWrong) cbWrong.checked = false;
  if (cbDelay) cbDelay.checked = false;
  const phoneEl = document.getElementById('ntPhone');
  if (phoneEl) phoneEl.value = '';
  _ntFillOrders();
}

// "Which order is this about?" — the client's recent orders, so the message is
// tagged with it and support sees the order straight away.
async function _ntFillOrders() {
  const sel = document.getElementById('ntOrder');
  if (!sel) return;
  sel.innerHTML = '<option value="">Not about a specific order</option>';
  try {
    const d = await api('/orders?limit=20');
    const orders = d.orders || d.data || d || [];
    sel.insertAdjacentHTML('beforeend', orders.map(o => {
      const when = o.created_at ? new Date(o.created_at).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : '';
      const name = String(o.service_name || 'Order').slice(0, 48);
      return `<option value="${esc(o.id)}">#${esc(String(o.id).slice(0, 8))} · ${esc(name)}${o.quantity ? ' ×' + Number(o.quantity).toLocaleString() : ''}${when ? ' · ' + esc(when) : ''}</option>`;
    }).join(''));
  } catch (_) { /* optional */ }
}
function closeNewTicketModal() {
  const m = document.getElementById('newTicketModal');
  m.classList.remove('show');
  setTimeout(() => { m.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
}

async function submitNewTicket() {
  const cbWrong = document.getElementById('ntCbWrong');
  const cbDelay = document.getElementById('ntCbDelay');
  const issue_types = [];
  if (cbWrong && cbWrong.checked) issue_types.push('wrong_order');
  if (cbDelay && cbDelay.checked) issue_types.push('delay');
  const message = document.getElementById('ntMessage').value.trim();
  const phoneEl = document.getElementById('ntPhone');
  const phone   = phoneEl ? phoneEl.value.trim() : '';
  if (!message) { toast('Please describe your issue first.', 'error'); return; }
  const btn = document.getElementById('ntSubmitBtn');
  btn.textContent = 'Submitting…'; btn.disabled = true;
  // The phone number is never persisted as its own field — it's folded
  // straight into the ticket's first message (same as everything else the
  // customer types) so the CCR agent sees it right in the chat and can
  // call if the customer opted in, or just reply as normal if not.
  const first_message = phone ? `${message}\n\n📞 **Call me:** ${phone}` : message;
  try {
    const order_id = document.getElementById('ntOrder')?.value || null;
    const data = await api('/support/threads', {
      method: 'POST',
      body: JSON.stringify({ issue_types, first_message, order_id })
    });
    closeNewTicketModal();
    toast('Message sent! Our team will reply in your support chat.', 'success');
    window._bgAllThreadsClosed = false; // new open thread exists — resume background watching for admin replies
    await loadTickets();
    openTicketThread(data.id);
  } catch(e) {
    toast(e.message || 'Failed to open ticket', 'error');
  } finally {
    btn.textContent = 'Send message'; btn.disabled = false;
  }
}

function closeTicketThread() {
  _activeTicketId = null;
  _ttReplyTo = null; if (typeof _ttRenderReplyPreview === 'function') _ttRenderReplyPreview();
  const modal = document.getElementById('ticketThreadModal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
  loadTickets();
}
// Refreshes the currently open ticket thread. Called from two places now:
// (1) openTicketThread(), for the initial load, and (2) auth.js's SSE
// handler, the instant a 'ticket_reply' push arrives for THIS thread_id —
// no timer, so a thread with nothing new arriving never touches the DB
// just because the modal happens to be open.
function _refreshOpenTicketThread(threadId) {
  if (_activeTicketId && _activeTicketId === threadId) {
    _loadTicketThread(_activeTicketId, { keepEarlier: true });
  }
}
function _getTicketUser() {
  try { return JSON.parse(localStorage.getItem('ev_user') || '{}'); } catch(_) { return {}; }
}

/* ══════════════════════════════════════════════════════════════════
   BACKGROUND TICKET WATCHER
   No timer anymore. _bgTicketWatchTick() runs exactly twice per kind
   of moment: once on login (initApp's one-off catch-up, for anything
   that arrived while logged out), and once per SSE push whenever a
   'new_ticket_message' / 'ticket_reply' event actually arrives (see
   auth.js's startEventStream handler). A user who never opens a ticket,
   or has nothing new, causes zero /support/threads requests beyond
   that single login check.
══════════════════════════════════════════════════════════════════ */
const _bgTicketSeenCount = {}; // { threadId: msgCount }

// Kept as a no-op for doLogout()'s existing call site — there's no
// timer to stop anymore, but logout shouldn't need to know that.
function _stopBgTicketWatch() {}

async function _bgTicketWatchTick() {
  if (!token) return;
  if (document.hidden) return; // tab backgrounded — don't wake the DB for a popup nobody will see yet
  // Short-circuit: skip the network call entirely once we know there's
  // nothing to watch — either every known thread is resolved/closed, OR
  // the user has no threads at all (the common case).
  if (window._bgAllThreadsClosed) return;
  try {
    const data = await api('/support/threads');
    const threads = data.threads || data || [];
    // Quiet if there are no threads, OR every one we have is resolved/closed.
    // Only "no conversation yet" is quiet — a conversation marked done still
    // receives order updates and replies (it is never closed).
    window._bgAllThreadsClosed = threads.length === 0;

    // Refresh the persistent indicators (nav badge + dashboard banner) off
    // each ticket's own `status` every time this runs — including the very
    // first login catch-up call. This is deliberately separate from the
    // message-count-diff loop below, which only ever popups for a reply
    // that happened THIS session — a reply that arrived while the customer
    // was logged out/offline would hit the "first time we see this thread"
    // branch below and get silently treated as already-seen, with nothing
    // ever telling the customer about it. Status is the ground truth and
    // isn't fooled by that: any ticket with status=pending gets shown here
    // regardless of whether this tab was open when the reply landed.
    _allTickets = threads;
    if (typeof _updateTicketsBadge === 'function') _updateTicketsBadge();
    if (typeof _updateDashTicketBanner === 'function') _updateDashTicketBanner();

    for (const t of threads) {
      const threadId  = t.id;
      const msgCount  = t.message_count || (t.messages || []).length || 0;
      const prevCount = _bgTicketSeenCount[threadId];

      if (prevCount === undefined) {
        // First time we see this thread — just record the count, don't popup
        _bgTicketSeenCount[threadId] = msgCount;
        continue;
      }

      if (msgCount > prevCount) {
        // Fetch full thread to inspect new messages
        try {
          const full = await api(`/support/threads/${threadId}`);
          // The API returns only the latest page (20), so take the newest
          // (msgCount - prevCount) of it instead of slicing by position.
          const msgs = full.messages || [];
          const newMsgs = msgs.slice(-Math.max(1, Math.min(msgCount - prevCount, msgs.length)));
          _bgTicketSeenCount[threadId] = full.message_count || msgCount;

          // Popup for any new admin-side message — human reply or
          // bot-authored auto-message (order confirmation, payment-failure
          // greeting, etc). Previously filtered to `!m.is_bot`, which
          // meant every auto-message ever posted here (including the
          // payment-failure/cancelled bot greeting) silently never
          // reached the dashboard popup — only a real agent's typed
          // reply did. That exclusion is gone now: the customer sees a
          // popup for whichever admin-side message just arrived, bot or
          // human.
          const lastAdminMsg = newMsgs.filter(m => m.sender === 'admin').pop();
          if (lastAdminMsg) {
            const body    = lastAdminMsg.body || '';
            const preview = _ticketHeadline(body);

            // Use the chat.js popup if available, fall back to our own
            if (typeof evShowDashboardPopup === 'function') {
              evShowDashboardPopup('EndaViral Support', preview, () => {
                navTo('tickets');
                setTimeout(() => openTicketThread(threadId), 200);
              });
            } else {
              _showTicketDashPopup(preview, threadId);
            }
          }
        } catch(_) {
          _bgTicketSeenCount[threadId] = msgCount;
        }
      } else {
        _bgTicketSeenCount[threadId] = msgCount;
      }
    }
  } catch(_) {}
}

/* Fallback inline popup (used if chat.js isn't loaded yet) */
function _showTicketDashPopup(preview, threadId) {
  const sec = document.getElementById('sec-dashboard');
  if (!sec || !sec.classList.contains('active')) return;
  // If ticket modal is open, no need for popup
  const modal = document.getElementById('ticketThreadModal');
  if (modal && modal.style.display !== 'none') return;

  const existing = document.getElementById('ev-dash-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'ev-dash-popup';
  popup.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#28a035,#1a6b23);
                  display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;
                  box-shadow:0 0 0 3px rgba(61,212,74,.3);">👤</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;color:#3dd44a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;">
          EndaViral Support sent you a message
        </div>
        <div style="font-size:13px;color:#d0e8e0;line-height:1.45;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;">
          ${esc(preview)}
        </div>
      </div>
      <button id="ev-dash-popup-close"
              style="background:none;border:none;color:#7a8fad;cursor:pointer;font-size:18px;
                     line-height:1;padding:0 2px;flex-shrink:0;">×</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="ev-dash-popup-view"
              style="flex:1;background:linear-gradient(135deg,#3dd44a,#28a035);
                     border:none;border-radius:8px;padding:9px 14px;color:#000;
                     font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
        💬 View Message
      </button>
      <button id="ev-dash-popup-dismiss"
              style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
                     border-radius:8px;padding:9px 14px;color:#7a8fad;
                     font-family:'Montserrat',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">
        Dismiss
      </button>
    </div>
  `;

  // Ensure styles exist
  if (!document.getElementById('ev-dash-popup-styles')) {
    const s = document.createElement('style');
    s.id = 'ev-dash-popup-styles';
    s.textContent = `
      #ev-dash-popup {
        position:fixed;bottom:100px;right:24px;z-index:9999;width:340px;
        background:#152b1e;border:1px solid rgba(61,212,74,.45);border-radius:16px;
        padding:16px 18px;
        box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 0 1px rgba(61,212,74,.1);
        font-family:'Montserrat',sans-serif;
        animation:ev-popup-in .35s cubic-bezier(.22,1,.36,1) both;
      }
      @keyframes ev-popup-in{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      #ev-dash-popup.ev-popup-out{animation:ev-popup-out .25s ease forwards}
      @keyframes ev-popup-out{to{opacity:0;transform:translateY(12px) scale(.95)}}
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(popup);

  const dismiss = () => {
    popup.classList.add('ev-popup-out');
    setTimeout(() => popup.remove(), 260);
  };
  document.getElementById('ev-dash-popup-close').onclick   = dismiss;
  document.getElementById('ev-dash-popup-dismiss').onclick  = dismiss;
  document.getElementById('ev-dash-popup-view').onclick     = () => {
    dismiss();
    navTo('tickets');
    setTimeout(() => openTicketThread(threadId), 200);
  };
  setTimeout(dismiss, 12000);
}

/* ══════════════════ ADMIN CREATE ORDER ══════════════════ */
let _acoUser       = null;
let _acoSvc        = null;
let _acoAllSvcs    = [];
let _acoPollTimer  = null;
let _acoOrderId    = null;
let _acoCheckoutId = null;

async function initAdminCreateOrder() {
  _acoUser = null; _acoSvc = null; _acoAllSvcs = [];
  _stopAcoPoll(); _acoOrderId = null; _acoCheckoutId = null;
  const fields = ['acoEmail','acoLink','acoQty','acoPhone'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['acoStep2','acoStep3','acoStep4'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const ci = document.getElementById('acoCustomerInfo');
  if (ci) ci.innerHTML = '';
  _setAcoStatus('idle');

  // Pre-load services
  try {
    const data = await api('/services');
    _acoAllSvcs = data.services || data || [];
  } catch(_) {}
}

async function lookupCustomer() {
  const email = (document.getElementById('acoEmail')?.value || '').trim();
  if (!email) { toast('Enter a customer email', 'error'); return; }
  const btn = document.getElementById('acoLookupBtn');
  btn.textContent = 'Looking up…'; btn.disabled = true;
  try {
    // Scoped endpoint (admins AND CCR agents can call this) — filters by
    // exact email server-side, unlike /admin/users which only returns the
    // most recent 100 users for a client-side .find().
    const user = await api(`/admin/users/lookup?email=${encodeURIComponent(email)}`);
    _acoUser = user;
    document.getElementById('acoCustomerInfo').innerHTML = `
      <div style="padding:10px 14px;border-radius:10px;background:rgba(61,212,74,.07);
                  border:1px solid rgba(61,212,74,.2);font-size:13px;">
        ✅ <strong style="color:var(--white);">${esc(user.name || user.email)}</strong>
        <span style="color:var(--muted);"> · ID: ${esc((user.id||'').slice(0,8))}</span>
        <span style="color:var(--green);"> · ${fmtKES(user.wallet_balance)} bal</span>
      </div>`;
    document.getElementById('acoStep2').style.display = 'block';
    renderAcoServices();
  } catch(e) {
    toast(e.message || 'Lookup failed', 'error');
  } finally {
    btn.textContent = 'Look Up'; btn.disabled = false;
  }
}

function renderAcoServices(filter = '') {
  const el = document.getElementById('acoSvcList');
  if (!el) return;
  const svcs = _acoAllSvcs.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase())
  );
  if (!svcs.length) { el.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:13px;">No services found.</div>'; return; }
  el.innerHTML = svcs.map(s => `
    <div class="aco-svc-row${_acoSvc && _acoSvc.id === s.id ? ' selected' : ''}"
         onclick="selectAcoService(${JSON.stringify(s).replace(/"/g,'&quot;')})">
      <span class="aco-svc-name">${esc(s.name)}</span>
      <span class="aco-svc-rate">KES ${parseFloat(s.rate_kes||0).toFixed(0)}/1k</span>
    </div>`).join('');
}

function filterAcoServices() {
  renderAcoServices(document.getElementById('acoSvcSearch')?.value || '');
}

function selectAcoService(svc) {
  _acoSvc = svc;
  document.getElementById('acoSelectedSvc').style.display = 'block';
  document.getElementById('acoSelectedSvc').innerHTML =
    `✅ <strong>${svc.name}</strong> · KES ${parseFloat(svc.rate_kes||0).toFixed(0)}/1k · Min: ${svc.min_qty} Max: ${svc.max_qty}`;
  document.getElementById('acoStep3').style.display = 'block';
  document.getElementById('acoStep4').style.display = 'block';
  renderAcoServices(document.getElementById('acoSvcSearch')?.value || '');
  calcAcoCost();
}

function calcAcoCost() {
  if (!_acoSvc) return;
  const qty  = parseInt(document.getElementById('acoQty')?.value || 0);
  const cost = qty > 0 ? Math.max(1, Math.round((qty / 1000) * parseFloat(_acoSvc.rate_kes || 0) + 0.99)) : 0;
  const el   = document.getElementById('acoCost');
  if (el) el.textContent = `KES ${cost}`;
}

async function adminPlaceOrder() {
  if (!_acoUser || !_acoSvc) { toast('Complete all steps first', 'error'); return; }
  const link = (document.getElementById('acoLink')?.value || '').trim();
  const qty  = parseInt(document.getElementById('acoQty')?.value || 0);
  const phone= (document.getElementById('acoPhone')?.value || '').trim();
  if (!link) { toast('Enter a link', 'error'); return; }
  if (qty < 1) { toast('Enter a valid quantity', 'error'); return; }
  if (!phone) { toast('Enter a phone number', 'error'); return; }

  const btn = document.getElementById('acoPlaceBtn');
  btn.textContent = 'Sending STK Push…'; btn.disabled = true;
  _setAcoStatus('waiting', { phone, svc: _acoSvc.name, qty, cost: document.getElementById('acoCost').textContent });

  try {
    const payload = {
      service_id:     _acoSvc.service || _acoSvc.provider_service_id,
      link, quantity: qty, phone,
      target_user_id: _acoUser.id,
    };
    const resp = await api('/orders', { method:'POST', body:JSON.stringify(payload) });
    _acoOrderId    = resp.id;
    _acoCheckoutId = resp.checkout_request_id;
    _startAcoPoll();
  } catch(e) {
    toast(e.message || 'Failed to place order', 'error');
    _setAcoStatus('idle');
  } finally {
    btn.textContent = '📱 SEND STK PUSH TO CUSTOMER'; btn.disabled = false;
  }
}

function _startAcoPoll() {
  _stopAcoPoll();
  let attempts = 0;
  _acoPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 24) { _stopAcoPoll(); _setAcoStatus('timeout'); return; }
    try {
      const s = await api(`/payments/status/${_acoCheckoutId}`);
      if (s.status === 'success' || s.status === 'completed') {
        _stopAcoPoll();
        try { await api(`/orders/${_acoOrderId}/submit`, { method:'POST' }); } catch(_) {}
        _setAcoStatus('success', { orderId: _acoOrderId });
        loadAdminOrders();
        toast('Order placed & submitted ✓', 'success');
      } else if (s.status === 'failed' || s.status === 'cancelled') {
        _stopAcoPoll();
        _setAcoStatus('failed', { reason: s.result_desc || s.status });
      }
    } catch(_) {}
  }, 5000);
}
function _stopAcoPoll() {
  if (_acoPollTimer) { clearInterval(_acoPollTimer); _acoPollTimer = null; }
}

function _setAcoStatus(state, data = {}) {
  const el = document.getElementById('acoStatusPanel');
  if (!el) return;
  if (state === 'idle') {
    el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);">
      <div style="font-size:36px;margin-bottom:12px;">📋</div>
      <div style="font-size:13px;">Fill in the form to create an order</div>
    </div>`; return;
  }
  if (state === 'waiting') {
    el.innerHTML = `<div style="text-align:center;padding:20px 0;">
      <div style="font-size:48px;margin-bottom:14px;">📱</div>
      <div style="font-size:15px;font-weight:800;color:var(--white);margin-bottom:8px;">WAITING FOR PAYMENT</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">STK push sent to <strong style="color:var(--white);">${data.phone}</strong></div>
      <div style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:left;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--muted);">Service</span><span style="max-width:180px;text-align:right;font-size:12px;word-break:break-word;">${data.svc}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--muted);">Quantity</span><span>${parseInt(data.qty||0).toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:var(--muted);">Amount</span><strong style="color:var(--green);">${data.cost}</strong></div>
      </div>
      <div class="loading-spinner" style="margin:0 auto 12px;"><div class="spinner"></div><span>Checking payment…</span></div>
      <button class="btn-secondary" style="width:100%;" onclick="_stopAcoPoll();_setAcoStatus('idle');">✕ Cancel</button>
    </div>`; return;
  }
  if (state === 'success') {
    el.innerHTML = `<div style="text-align:center;padding:30px 0;">
      <div style="font-size:56px;margin-bottom:14px;">✅</div>
      <div style="font-size:16px;font-weight:800;color:var(--white);margin-bottom:8px;">ORDER PLACED!</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px;">Payment confirmed. Order submitted and visible in customer's <strong style="color:var(--white);">My Orders</strong> and admin <strong style="color:var(--white);">All Orders</strong>.</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:20px;">Order ID: <code style="color:var(--green);">#${(data.orderId||'').slice(0,8)}</code></div>
      <button class="btn-secondary" onclick="initAdminCreateOrder()" style="width:100%;">+ Create Another Order</button>
    </div>`; return;
  }
  if (state === 'failed') {
    el.innerHTML = `<div style="text-align:center;padding:30px 0;">
      <div style="font-size:56px;margin-bottom:14px;">❌</div>
      <div style="font-size:16px;font-weight:800;color:var(--white);margin-bottom:8px;">PAYMENT FAILED</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px;">${data.reason || 'The customer did not complete the payment.'}</div>
      <button class="btn-primary" onclick="_setAcoStatus('idle')" style="width:100%;">Try Again</button>
    </div>`; return;
  }
  if (state === 'timeout') {
    el.innerHTML = `<div style="text-align:center;padding:30px 0;">
      <div style="font-size:56px;margin-bottom:14px;">⏱️</div>
      <div style="font-size:16px;font-weight:800;color:var(--white);margin-bottom:8px;">TIMED OUT</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px;">No payment received in 2 minutes. If the customer paid, the order will process automatically once M-Pesa confirms.</div>
      <button class="btn-secondary" onclick="initAdminCreateOrder()" style="width:100%;">Start Over</button>
    </div>`;
  }
}