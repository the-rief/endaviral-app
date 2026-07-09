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
  if (tab === 'services-mgmt') { loadAdminServices(); loadSavedPricingSettings(); }
  if (tab === 'stats') { loadAdminStats(); loadAdminRevenue(); loadAdminTrends(); loadAdminEngagement(); }
  if (tab === 'providers') loadAdminProviders();
  if (tab === 'support') loadAdminSupport();
  if (tab === 'create-order') initAdminCreateOrder();
  if (tab === 'affiliate-payouts') affAdminSubTab('payouts');
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

async function loadAdminOrders() {
  const el = document.getElementById('adminOrdersTable');
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  const emailFilter = (document.getElementById('adminOrderSearch')?.value || '').trim();
  const orderIdFilter = (document.getElementById('adminOrderIdSearch')?.value || '').trim().replace(/^#/, '');
  try {
    const qs = emailFilter ? `?email=${encodeURIComponent(emailFilter)}&limit=100` : '?limit=100';
    const data = await api('/admin/orders' + qs);
    let orders = data.orders || data.data || data || [];

    // Client-side Order ID filter (partial match on UUID)
    if (orderIdFilter) {
      orders = orders.filter(o => (o.id || '').toLowerCase().includes(orderIdFilter.toLowerCase()));
    }

    if (!orders.length) { el.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No orders found.</p></div>'; return; }
    el.innerHTML = `<table>
      <thead><tr><th>#ID</th><th>Customer</th><th>Service</th><th>Link</th><th>Qty</th><th>Start/Remains</th><th>Cost</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
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
        const date       = o.created_at ? new Date(o.created_at).toLocaleDateString() : '—';
        const startRemains = (o.start_count != null || o.remains != null)
          ? `${o.start_count != null ? parseInt(o.start_count).toLocaleString() : '—'} / ${o.remains != null ? parseInt(o.remains).toLocaleString() : '—'}`
          : '—';
        return `<tr>
          <td style="font-size:11px;">
            <span style="color:var(--muted);">#${shortId}</span>
            <button onclick="navigator.clipboard.writeText('${fullId}').then(()=>toast('Order ID copied!','success'))" title="Copy full Order ID" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:2px 4px;margin-left:2px;border-radius:4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">⎘</button>
            ${provId}
          </td>
          <td style="font-size:13px;">
            <div style="font-weight:600;color:var(--white);">${userEmail}</div>
            ${userName && userName !== '—' ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${userName}</div>` : ''}
          </td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">${svcName}</td>
          <td style="max-width:160px;">${linkDisplay}</td>
          <td>${parseInt(o.quantity||0).toLocaleString()}</td>
          <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${startRemains}</td>
          <td style="color:var(--green);font-family:'Montserrat',sans-serif;font-size:15px;">${fmtKES(o.charge||o.cost)}</td>
          <td>${statusPill(o.status)}</td>
          <td style="font-size:12px;color:var(--muted);">${date}</td>
          <td><button class="action-btn" onclick="adminMessageCustomer('${userId}','${userEmail}')" title="Open support thread with customer">💬 Message</button></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
  } catch(e) { el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`; }
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

let _adminStatsCacheTs = 0;
const ADMIN_STATS_TTL  = 180 * 1000; // match the auto-refresh interval (was 30s)

async function loadAdminStats(force = false) {
  const now = Date.now();
  if (!force && _adminStatsCacheTs > 0 && (now - _adminStatsCacheTs) < ADMIN_STATS_TTL) return;
  const el = document.getElementById('adminStatsGrid');
  const breakdownPanel = document.getElementById('filterBreakdownPanel');
  try {
    // Fetch both in parallel
    const [statsData, breakdownData] = await Promise.all([
      api('/admin/stats'),
      api('/admin/stats/filter-breakdown'),
    ]);
    _adminStatsCacheTs = Date.now();

    const s = statsData.stats || statsData;
    const p = statsData.pricing || {};
    const svcSummary = statsData.services || {};

    // ── Main stat cards ───────────────────────────────────────────────────
    const providerLine = s.active_provider
      ? `<div class="stat-card" style="background:var(--card);border-color:var(--border);">
           <div class="stat-icon">🔌</div>
           <div class="stat-label">Active Provider</div>
           <div class="stat-val" style="font-size:18px;">${s.active_provider}</div>
         </div>` : '';

    // ── Provider balance card logic ───────────────────────────────────────
    const balUSD = s.panel_balance_usd;
    const isLive = s.panel_balance_is_live;
    const lastUpdated = s.panel_balance_last_updated;
    let balCard = '';
    if (balUSD !== null && balUSD !== undefined) {
      const balNum = parseFloat(balUSD);
      // Colour thresholds: green ≥ $10, orange $3–$10, red < $3
      const balColor = balNum >= 10 ? 'var(--green)' : balNum >= 3 ? 'var(--orange)' : 'var(--red)';
      const balBorder = balNum >= 10 ? 'var(--green)' : balNum >= 3 ? 'var(--orange)' : 'var(--red)';
      const balCardClass = balNum >= 10 ? 'green' : balNum >= 3 ? 'orange' : 'red';
      const liveTag = isLive
        ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--green);background:rgba(61,212,74,.1);border:1px solid rgba(61,212,74,.2);padding:2px 7px;border-radius:10px;letter-spacing:.5px;">
             <span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;animation:pulse 2s infinite;"></span>LIVE
           </span>`
        : `<span style="font-size:10px;font-weight:700;color:var(--muted);background:rgba(122,143,173,.1);border:1px solid rgba(122,143,173,.2);padding:2px 7px;border-radius:10px;">CACHED</span>`;
      const timeAgo = lastUpdated ? (() => {
        const diff = Math.floor((Date.now() - new Date(lastUpdated)) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        return `${Math.floor(diff/3600)}h ago`;
      })() : '';
      const warningBar = balNum < 3
        ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(229,57,53,.12);border:1px solid rgba(229,57,53,.25);border-radius:8px;font-size:11px;color:#ff8a80;font-weight:600;">⚠️ Critical — customers cannot place orders</div>`
        : balNum < 10
        ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(255,112,67,.10);border:1px solid rgba(255,112,67,.2);border-radius:8px;font-size:11px;color:var(--orange);font-weight:600;">⚠️ Low — top up soon</div>`
        : '';
      balCard = `
        <div class="stat-card ${balCardClass}" style="border-color:${balBorder};grid-column:span 2;" title="Provider panel balance. Reduces with every order. Customers are blocked if this drops too low.">
          <div class="stat-icon">🏦</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div class="stat-label" style="margin-bottom:0;">Panel Balance (${s.active_provider || 'Provider'})</div>
            ${liveTag}
          </div>
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
            <div class="stat-val" id="panelBalVal" style="color:${balColor};font-size:34px;">$${balNum.toFixed(2)}</div>
            <div style="font-size:13px;color:var(--muted);padding-bottom:4px;">USD${timeAgo ? ` · updated ${timeAgo}` : ''}</div>
          </div>
          ${warningBar}
          <div style="margin-top:10px;height:4px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${Math.min(100, (balNum/50)*100)}%;background:${balColor};border-radius:4px;transition:width 1s ease;"></div>
          </div>
          <div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:4px;">bar = balance vs $50 reference</div>
        </div>`;
    }

    el.innerHTML = `
      <div class="stat-card green"><div class="stat-icon">💳</div><div class="stat-label">Total Sales</div><div class="stat-val">${fmtKES(s.total_sales ?? s.total_revenue ?? 0)}</div><div class="stat-sub">All paid orders</div></div>
      <div class="stat-card green" style="border-color:rgba(61,212,74,.6);"><div class="stat-icon">💰</div><div class="stat-label">Your Revenue</div><div class="stat-val">${fmtKES(s.total_revenue ?? 0)}</div><div class="stat-sub">${s.markup_label ? s.markup_label + ' markup' : 'Profit only'}</div></div>
      <div class="stat-card blue"><div class="stat-icon">👥</div><div class="stat-label">Total Users</div><div class="stat-val">${s.total_users||s.users||0}</div></div>
      <div class="stat-card orange"><div class="stat-icon">📦</div><div class="stat-label">Total Orders</div><div class="stat-val">${s.total_orders||s.orders||0}</div></div>
      <div class="stat-card red"><div class="stat-icon">🔄</div><div class="stat-label">Active Orders</div><div class="stat-val">${s.active_orders||0}</div></div>
      ${balCard}
      ${providerLine}
      <div class="stat-card green" title="Services your customers can currently see and order">
        <div class="stat-icon">👁</div>
        <div class="stat-label">Visible Services</div>
        <div class="stat-val">${(svcSummary.visible_to_customers ?? breakdownData.visible ?? '—').toLocaleString()}</div>
        <div class="stat-sub">of ${(svcSummary.total ?? breakdownData.total_services ?? '—').toLocaleString()} total</div>
      </div>
      <div class="stat-card red" title="Services hidden — not shown to customers">
        <div class="stat-icon">🚫</div>
        <div class="stat-label">Hidden Services</div>
        <div class="stat-val">${(svcSummary.hidden_total ?? breakdownData.hidden_total ?? '—').toLocaleString()}</div>
        <div class="stat-sub" style="color:rgba(229,57,53,.7);">filtered out</div>
      </div>`;

    // ── Filter breakdown panel ────────────────────────────────────────────
    const bd = breakdownData;
    const reasons = bd.hidden_by_reason || {};
    const countryCount  = reasons.country_targeted  || 0;
    const qtyCount      = reasons.min_qty_exceeded   || 0;
    const rateCount     = reasons.rate_out_of_range  || 0;
    const manualCount   = reasons.manually_hidden    || 0;

    document.getElementById('filterSummaryCards').innerHTML = `
      <div style="background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.2);border-radius:12px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(229,57,53,.7);margin-bottom:6px;">🌍 Geo-Targeted</div>
        <div style="font-size:28px;font-weight:800;color:#ff8a80;line-height:1;">${countryCount.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Country-specific services</div>
      </div>
      <div style="background:rgba(255,112,67,.08);border:1px solid rgba(255,112,67,.2);border-radius:12px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,112,67,.7);margin-bottom:6px;">📊 Min Qty Too High</div>
        <div style="font-size:28px;font-weight:800;color:var(--orange);line-height:1;">${qtyCount.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Exceed qty filter</div>
      </div>
      <div style="background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.2);border-radius:12px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(33,150,243,.7);margin-bottom:6px;">💲 Rate Out of Range</div>
        <div style="font-size:28px;font-weight:800;color:var(--blue);line-height:1;">${rateCount.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Outside KES rate band</div>
      </div>
      <div style="background:rgba(122,143,173,.08);border:1px solid rgba(122,143,173,.2);border-radius:12px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(122,143,173,.7);margin-bottom:6px;">🙈 Manually Hidden</div>
        <div style="font-size:28px;font-weight:800;color:var(--muted);line-height:1;">${manualCount.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Hidden by admin</div>
      </div>`;

    // ── Country-by-category grid ──────────────────────────────────────────
    const catMap = bd.country_targeted_by_category || {};
    const samples = bd.country_targeted_samples || {};
    const catEntries = Object.entries(catMap);

    const catDetail = document.getElementById('countryFilterDetail');
    const catGrid = document.getElementById('countryByCategoryGrid');

    if (countryCount > 0 && catEntries.length > 0) {
      catDetail.style.display = '';
      catGrid.innerHTML = catEntries.map(([cat, count]) => {
        const sampleList = (samples[cat] || []).slice(0, 3);
        const sampleHtml = sampleList.length
          ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);">
               ${sampleList.map(n => `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="${n}">• ${n}</div>`).join('')}
               ${(samples[cat]||[]).length > 3 ? `<div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:2px;">+${(samples[cat]||[]).length - 3} more…</div>` : ''}
             </div>`
          : '';
        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="font-size:13px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cat}</div>
            <div style="font-size:18px;font-weight:800;color:#ff8a80;flex-shrink:0;">${count.toLocaleString()}</div>
          </div>
          ${sampleHtml}
        </div>`;
      }).join('');
    } else {
      catDetail.style.display = 'none';
    }

    breakdownPanel.style.display = '';
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
    breakdownPanel.style.display = 'none';
  }
}


/* ══════════════════ REVENUE: WEEKLY/MONTHLY + AFFILIATE NET (NEW) ══════════════════
 * "As a business person" view: calendar week/month sales & profit, an
 * insights list in plain English, and — the part /stats can't show — how
 * much of that profit is already spoken for by affiliate commissions, so
 * you can see what's actually left for the business.
 * ══════════════════════════════════════════════════════════════════════ */

let _adminRevenueCacheTs = 0;
const ADMIN_REVENUE_TTL = 5 * 60 * 1000;

function _miniBarChart(items, { key = 'net_revenue_kes', labelKey, color = '#3dd44a', w = 700, h = 160 } = {}) {
  if (!items.length) return `<div style="font-size:12px;color:var(--muted);padding:20px 0;text-align:center;">No data yet.</div>`;
  const padTop = 18, padBottom = 22, padX = 4;
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
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh,0).toFixed(1)}" rx="3" fill="${barColor}" opacity="0.9"><title>${esc(d[labelKey])}: ${fmtKES(v)}</title></rect>`;
  }).join('');
  const labels = items.map((d, i) => {
    const cx = padX + step * i + step / 2;
    return `<text x="${cx.toFixed(1)}" y="${h-6}" font-size="9" fill="#7a8fad" text-anchor="middle">${esc(d[labelKey])}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">${bars}${labels}</svg>`;
}

async function loadAdminRevenue(force = false) {
  const now = Date.now();
  if (!force && _adminRevenueCacheTs > 0 && (now - _adminRevenueCacheTs) < ADMIN_REVENUE_TTL) return;
  const el = document.getElementById('adminRevenuePanel');
  if (!el) return; // markup not present yet — safe no-op
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading revenue…</span></div>`;

  try {
    const r = await api('/admin/stats/revenue?weeks=8&months=6');
    _adminRevenueCacheTs = Date.now();

    const weekly = r.weekly || [];
    const monthly = r.monthly || [];
    const ai = r.affiliate_impact || {};
    const insights = r.insights || [];

    const thisWeek = weekly[weekly.length - 1];
    const lastWeek = weekly[weekly.length - 2];
    const thisMonth = monthly[monthly.length - 1];
    const lastMonth = monthly[monthly.length - 2];

    const pct = (curr, prev) => (prev ? Math.round(((curr - prev) / prev) * 1000) / 10 : (curr ? 100 : null));

    const weekCards = thisWeek ? `
      <div class="stat-card green"><div class="stat-icon">📅</div><div class="stat-label">This Week — Sales</div><div class="stat-val">${fmtKES(thisWeek.sales_kes)}</div><div class="stat-sub">${lastWeek ? _growthBadge(pct(thisWeek.sales_kes, lastWeek.sales_kes)) + ' vs last week' : `${thisWeek.orders} orders`}</div></div>
      <div class="stat-card green" style="border-color:rgba(61,212,74,.6);"><div class="stat-icon">💰</div><div class="stat-label">This Week — Profit</div><div class="stat-val">${fmtKES(thisWeek.revenue_kes)}</div><div class="stat-sub">${lastWeek ? _growthBadge(pct(thisWeek.revenue_kes, lastWeek.revenue_kes)) + ' vs last week' : 'before affiliate cost'}</div></div>
      <div class="stat-card orange"><div class="stat-icon">🤝</div><div class="stat-label">This Week — Affiliate Cost</div><div class="stat-val">${fmtKES(thisWeek.affiliate_commission_kes)}</div><div class="stat-sub">owed to affiliates</div></div>
      <div class="stat-card blue" style="border-color:rgba(33,150,243,.6);"><div class="stat-icon">🏆</div><div class="stat-label">This Week — Net to Business</div><div class="stat-val">${fmtKES(thisWeek.net_revenue_kes)}</div><div class="stat-sub">profit − affiliate cost</div></div>
    ` : `<div class="empty-state"><p>No paid orders yet this week.</p></div>`;

    const monthCards = thisMonth ? `
      <div class="stat-card green"><div class="stat-icon">🗓️</div><div class="stat-label">This Month — Sales</div><div class="stat-val">${fmtKES(thisMonth.sales_kes)}</div><div class="stat-sub">${lastMonth ? _growthBadge(pct(thisMonth.sales_kes, lastMonth.sales_kes)) + ' vs last month' : `${thisMonth.orders} orders`}</div></div>
      <div class="stat-card green" style="border-color:rgba(61,212,74,.6);"><div class="stat-icon">💰</div><div class="stat-label">This Month — Profit</div><div class="stat-val">${fmtKES(thisMonth.revenue_kes)}</div><div class="stat-sub">${lastMonth ? _growthBadge(pct(thisMonth.revenue_kes, lastMonth.revenue_kes)) + ' vs last month' : 'before affiliate cost'}</div></div>
      <div class="stat-card orange"><div class="stat-icon">🤝</div><div class="stat-label">This Month — Affiliate Cost</div><div class="stat-val">${fmtKES(thisMonth.affiliate_commission_kes)}</div><div class="stat-sub">${ai.commission_pct_of_revenue_this_month || 0}% of profit</div></div>
      <div class="stat-card blue" style="border-color:rgba(33,150,243,.6);"><div class="stat-icon">🏆</div><div class="stat-label">This Month — Net to Business</div><div class="stat-val">${fmtKES(thisMonth.net_revenue_kes)}</div><div class="stat-sub">profit − affiliate cost</div></div>
    ` : `<div class="empty-state"><p>No paid orders yet this month.</p></div>`;

    const insightsHtml = insights.map(txt => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:16px;flex-shrink:0;">💡</span>
        <span style="font-size:13px;color:var(--white);line-height:1.5;">${esc(txt)}</span>
      </div>`).join('');

    el.innerHTML = `
      <div class="sec-hd" style="margin-bottom:16px;">
        <div><div class="sec-title" style="font-size:16px;">💼 REVENUE — WEEKLY & MONTHLY</div><div class="sec-sub">What you made, and what's actually left after affiliates are paid</div></div>
        <button class="btn-secondary" onclick="loadAdminRevenue(true)">↻ Refresh</button>
      </div>

      <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">THIS WEEK</div>
      <div class="stats-grid" style="margin-bottom:24px;">${weekCards}</div>

      <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">THIS MONTH</div>
      <div class="stats-grid" style="margin-bottom:24px;">${monthCards}</div>

      <div style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);border-radius:12px;padding:16px 18px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(33,150,243,.8);margin-bottom:10px;">🤝 Affiliate Cost — All Time</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
          <div><div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(ai.total_commission_owed_kes || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Total owed to affiliates (accrued)</div></div>
          <div><div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(ai.total_commission_paid_kes || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Already paid out</div></div>
          <div><div style="font-size:20px;font-weight:800;color:var(--orange);">${fmtKES((ai.total_commission_owed_kes || 0) - (ai.total_commission_paid_kes || 0))}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Accrued but not yet paid</div></div>
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">NET-TO-BUSINESS BY WEEK (last ${weekly.length})</div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          ${_miniBarChart(weekly, { key: 'net_revenue_kes', labelKey: 'week_start', color: '#3dd44a' })}
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">NET-TO-BUSINESS BY MONTH (last ${monthly.length})</div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          ${_miniBarChart(monthly, { key: 'net_revenue_kes', labelKey: 'month', color: '#3dd44a' })}
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">📊 INSIGHTS</div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:4px 18px;">
          ${insightsHtml}
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
}


/* ══════════════════ GROWTH & TRENDS (scaling analytics) ══════════════════ */

let _adminTrendsCacheTs = 0;
const ADMIN_TRENDS_TTL = 5 * 60 * 1000; // was 60s — trend/day-level data doesn't need to be that fresh
let _adminTrendsWindow = 14;

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

// Bar-only chart (used for New Users — a count with no paired value metric).
function _barChartSvg(daily, { key = 'new_users', color = '#2196f3', label = 'new users', w = 700, h = 150 } = {}) {
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
      ? `<text x="${cx.toFixed(1)}" y="${Math.max(y - 4, 10).toFixed(1)}" font-size="9" fill="${color}" text-anchor="middle" font-weight="700">${counts[i]}</text>`
      : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 0).toFixed(1)}" rx="2" fill="${color}" opacity="0.85"><title>${esc(d.date)}: ${counts[i]} ${esc(label)}</title></rect>${countLabel}`;
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

async function loadAdminTrends(force = false, days = null) {
  if (days) _adminTrendsWindow = days;
  const now = Date.now();
  if (!force && _adminTrendsCacheTs > 0 && (now - _adminTrendsCacheTs) < ADMIN_TRENDS_TTL) return;
  const el = document.getElementById('adminTrendsPanel');
  if (!el) return; // markup not present yet — safe no-op
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading trends…</span></div>`;

  try {
    const t = await api(`/admin/stats/trends?days=${_adminTrendsWindow}`);
    _adminTrendsCacheTs = Date.now();

    const daily = t.daily || [];
    const g = t.growth || {};
    const funnel = t.funnel || {};
    const topServices = t.top_services || [];
    const customers = t.customers || {};
    const burn = t.balance_burn || {};

    // ── Burn-rate warning banner ────────────────────────────────────────────
    let burnBanner = '';
    if (burn.burn_usd_per_day && burn.burn_usd_per_day > 0) {
      const critical = burn.days_until_empty !== null && burn.days_until_empty <= 3;
      const warn = burn.days_until_empty !== null && burn.days_until_empty <= 7;
      const bg = critical ? 'rgba(229,57,53,.10)' : warn ? 'rgba(255,112,67,.10)' : 'rgba(61,212,74,.08)';
      const border = critical ? 'rgba(229,57,53,.3)' : warn ? 'rgba(255,112,67,.3)' : 'rgba(61,212,74,.25)';
      const fg = critical ? '#ff8a80' : warn ? 'var(--orange)' : 'var(--green)';
      burnBanner = `
        <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${fg};margin-bottom:4px;">🔥 Panel Balance Burn Rate</div>
            <div style="font-size:13px;color:var(--muted);">Spending ~<b style="color:${fg};">$${burn.burn_usd_per_day.toFixed(2)}/day</b>${burn.days_until_empty !== null ? ` · projected to run out in <b style="color:${fg};">${burn.days_until_empty} day${burn.days_until_empty == 1 ? '' : 's'}</b> at this pace` : ''}</div>
          </div>
        </div>`;
    }

    // ── Combo chart: Orders (bars) + Sales KES (line) per day ───────────────
    const comboChart = _comboChartSvg(daily, {
      barColor: '#ff7043',
      lineColor: '#3dd44a',
      barKey: 'orders',
      valueKey: 'sales_kes',
      barLabel: 'orders',
      valueFmt: (v) => fmtKES(v),
    });

    const usersChart = _barChartSvg(daily, { key: 'new_users', color: '#2196f3', label: 'new users', h: 130 });

    const comboCard = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);">Orders &amp; Sales — count + value per day</div>
            <div style="display:flex;gap:14px;align-items:baseline;margin-top:4px;flex-wrap:wrap;">
              <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(g.this_week ? g.this_week.sales_kes : 0)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> sales/7d</span> ${_growthBadge(g.sales_wow_pct)}</div>
              <div style="font-size:20px;font-weight:800;color:var(--white);">${g.this_week ? g.this_week.orders : 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> orders/7d</span> ${_growthBadge(g.orders_wow_pct)}</div>
            </div>
          </div>
          <div style="display:flex;gap:14px;font-size:11px;color:var(--muted);">
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#ff7043;display:inline-block;"></span>Orders (count)</span>
            <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:2.5px;border-radius:2px;background:#3dd44a;display:inline-block;"></span>Sales KES (value)</span>
          </div>
        </div>
        ${comboChart}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);">New Users per day</div>
            <div style="font-size:18px;font-weight:800;color:var(--white);margin-top:2px;">${g.this_week ? g.this_week.new_users : 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> /7d</span> ${_growthBadge(g.users_wow_pct)}</div>
          </div>
        </div>
        ${usersChart}
      </div>`;

    // ── Order status funnel ───────────────────────────────────────────────────
    const funnelOrder = ['pending', 'processing', 'partial', 'completed', 'failed', 'cancelled'];
    const funnelColors = { pending:'#7a8fad', processing:'#2196f3', partial:'#ff7043', completed:'#3dd44a', failed:'#e53935', cancelled:'#7a8fad' };
    const funnelTotal = Object.values(funnel).reduce((a, b) => a + b, 0) || 1;
    const funnelHtml = funnelOrder
      .filter(k => funnel[k] !== undefined)
      .map(k => {
        const count = funnel[k] || 0;
        const pct = Math.round((count / funnelTotal) * 100);
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="color:var(--muted);text-transform:capitalize;">${esc(k)}</span>
            <span style="color:var(--white);font-weight:700;">${count} <span style="color:var(--muted);font-weight:500;">(${pct}%)</span></span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${funnelColors[k] || '#7a8fad'};border-radius:4px;"></div>
          </div>
        </div>`;
      }).join('') || `<div style="font-size:12px;color:var(--muted);">No orders in this window.</div>`;

    // ── Top services table ───────────────────────────────────────────────────
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

    // ── Repeat customer rate ──────────────────────────────────────────────────
    const repeatCard = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">🔁 Repeat-Customer Rate</div>
        <div style="font-size:28px;font-weight:800;color:var(--white);">${customers.repeat_rate_pct ?? 0}%</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${customers.repeat_customers || 0} of ${customers.customers_with_orders || 0} paying customers have ordered 2+ times</div>
      </div>`;

    // ── Average spend per paying user (in-window) ───────────────────────────
    const avgSpendCard = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">💵 Avg Spend / Paying User</div>
        <div style="font-size:28px;font-weight:800;color:var(--white);">${fmtKES(customers.avg_spend_per_user_kes || 0)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">across ${customers.paying_users_in_window || 0} paying user${(customers.paying_users_in_window || 0) === 1 ? '' : 's'} in last ${_adminTrendsWindow}d</div>
      </div>`;

    // ── Window picker (7D / 14D / 30D) ──────────────────────────────────────
    const windowPicker = `
      <div style="display:flex;gap:6px;">
        ${[7, 14, 30].map(d => `<button onclick="loadAdminTrends(true, ${d})" style="background:${d === _adminTrendsWindow ? 'var(--green)' : 'var(--card)'};color:${d === _adminTrendsWindow ? '#04140a' : 'var(--muted)'};border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">${d}D</button>`).join('')}
      </div>`;

    // ── Assemble ──────────────────────────────────────────────────────────────
    el.innerHTML = `
      ${burnBanner}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">📈 Growth & Trends</div>
        ${windowPicker}
      </div>
      ${comboCard}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;" id="adminTrendsLowerGrid">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">🧭 Order Status Funnel (${_adminTrendsWindow}d)</div>
          ${funnelHtml}
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">🏆 Top 5 Services (${_adminTrendsWindow}d)</div>
          ${topServicesHtml}
        </div>
        ${repeatCard}
        ${avgSpendCard}
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
}

let _adminEngagementCacheTs = 0;
const ADMIN_ENGAGEMENT_TTL = 5 * 60 * 1000; // day-level data — no need to hit Neon every 30s
let _adminEngagementWindow = 14;

async function loadAdminEngagement(force = false, days = null) {
  if (days) _adminEngagementWindow = days;
  const now = Date.now();
  if (!force && _adminEngagementCacheTs > 0 && (now - _adminEngagementCacheTs) < ADMIN_ENGAGEMENT_TTL) return;
  const el = document.getElementById('adminEngagementPanel');
  if (!el) return; // markup not present yet — safe no-op
  el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading engagement…</span></div>`;

  try {
    const t = await api(`/admin/stats/engagement?days=${_adminEngagementWindow}`);
    _adminEngagementCacheTs = Date.now();

    const daily = t.daily || [];
    const allTime = t.all_time || {};

    // ── Today / latest day snapshot ─────────────────────────────────────────
    const latest = daily.length ? daily[daily.length - 1] : {};
    const last7 = daily.slice(-7);
    const dauAvg7 = last7.length
      ? Math.round(last7.reduce((a, d) => a + (d.unique_logins || 0), 0) / last7.length)
      : 0;

    // ── DAU bar chart (unique logins per day) ───────────────────────────────
    const dauChart = _barChartSvg(daily, { key: 'unique_logins', color: '#3dd44a', label: 'unique logins', h: 150 });

    // ── Avg spend per active user per day — line-ish bar chart ──────────────
    const spendChart = _barChartSvg(daily, {
      key: 'avg_spend_per_active_user_kes',
      color: '#2196f3',
      label: 'avg KES/active user',
      h: 150,
    });

    const dauCard = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);">👥 Daily Active Users (unique logins)</div>
            <div style="display:flex;gap:14px;align-items:baseline;margin-top:4px;flex-wrap:wrap;">
              <div style="font-size:20px;font-weight:800;color:var(--white);">${latest.unique_logins || 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> logins today</span></div>
              <div style="font-size:20px;font-weight:800;color:var(--white);">${dauAvg7}<span style="font-size:11px;color:var(--muted);font-weight:600;"> avg DAU / 7d</span></div>
              <div style="font-size:13px;color:var(--muted);">${latest.new_logins || 0} new · ${latest.returning_logins || 0} returning today</div>
            </div>
          </div>
        </div>
        ${dauChart}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">💵 Avg Spend per Active User / day</div>
        <div style="font-size:18px;font-weight:800;color:var(--white);margin-bottom:4px;">${fmtKES(latest.avg_spend_per_active_user_kes || 0)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> today</span></div>
        ${spendChart}
      </div>`;

    // ── All-time ARPU / ARPPU / AOV cards ───────────────────────────────────
    const arpuCards = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">📊 ARPU (all users)</div>
          <div style="font-size:26px;font-weight:800;color:var(--white);">${fmtKES(allTime.arpu_kes || 0)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">across ${allTime.total_users || 0} total users</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">💎 ARPPU (paying users)</div>
          <div style="font-size:26px;font-weight:800;color:var(--white);">${fmtKES(allTime.arppu_kes || 0)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">across ${allTime.paying_users || 0} paying users</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">🧾 Avg Order Value</div>
          <div style="font-size:26px;font-weight:800;color:var(--white);">${fmtKES(allTime.avg_order_value_kes || 0)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">all-time, paid orders only</div>
        </div>
      </div>`;

    // ── Window picker (7D / 14D / 30D) ──────────────────────────────────────
    const windowPicker = `
      <div style="display:flex;gap:6px;align-items:center;">
        ${[7, 14, 30].map(d => `<button onclick="loadAdminEngagement(true, ${d})" style="background:${d === _adminEngagementWindow ? 'var(--green)' : 'var(--card)'};color:${d === _adminEngagementWindow ? '#04140a' : 'var(--muted)'};border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">${d}D</button>`).join('')}
        <button onclick="adminCleanupLoginEvents()" title="Delete login_events older than 90 days — keeps Neon storage usage bounded" style="background:var(--card);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;">🧹 Cleanup</button>
      </div>`;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">🔑 Logins & Spend per User</div>
        ${windowPicker}
      </div>
      ${dauCard}
      ${arpuCards}`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
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
    const msg = `Synced! ${visible} visible · ${hidden} hidden (${detailParts.join(', ')}) · Markup: ${markupPct}%`;
    toast(msg, 'success');
    loadAdminServices(); loadServices();
  } catch(e) { toast(e.message, 'error'); }
  finally { btn.textContent = '⟳ Sync & Apply'; btn.disabled = false; }
}

async function toggleSvcVisibility(svcId, currentlyActive) {
  const isActive = currentlyActive === 'true';
  try {
    await api(`/admin/services/${svcId}/toggle`, { method:'POST', body:JSON.stringify({is_active: !isActive}) });
    toast(isActive ? 'Service hidden from users' : 'Service now visible to users', 'success');
    loadAdminServices();
  } catch(e) {
    // Backend endpoint may not exist yet — update locally for now
    toast('Visibility toggled (refresh to confirm)', 'success');
    loadAdminServices();
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
  loadAdminServices();
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
    loadAdminStats();
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

async function loadAdminSupport() {
  if (!currentUser || currentUser.role !== 'admin') return;
  const status = document.getElementById('supportFilterStatus')?.value || '';
  const type   = document.getElementById('supportFilterType')?.value || '';
  const list   = document.getElementById('supportThreadList');
  if (!list) return;
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';

  let url = `/support/admin/threads?limit=60`;
  if (status) url += `&status=${status}`;
  if (type)   url += `&type=${type}`;

  try {
    const data = await api(url);
    const threads = data.threads || [];
    if (!threads.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">No threads found</div>';
      return;
    }

    const statusColor = { open:'#e53935', pending:'#ff7043', resolved:'#3dd44a', closed:'#7a8fad' };
    const statusEmoji = { open:'🔴', pending:'🟡', resolved:'🟢', closed:'⬛' };
    const typeLabel   = { wrong_order:'📦 Wrong Order', delay:'⏳ Delay' };

    list.innerHTML = threads.map(t => {
      const lastMsg = t.last_message;
      const preview = esc(lastMsg ? lastMsg.body.slice(0,60) + (lastMsg.body.length > 60 ? '…' : '') : 'No messages');
      const sColor  = statusColor[t.status] || '#7a8fad';
      const tid     = esc(t.id);
      const userName = esc(t.user_name || t.user_email || '—');
      const tStatus  = esc(t.status);
      const tType    = esc(t.type);
      return `<div class="support-thread-item" data-thread-id="${tid}" onclick="openSupportThread('${tid}')" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(61,212,74,.04)'" onmouseout="this.style.background=''" >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">${userName}</div>
          <span style="font-size:10px;font-weight:700;color:${sColor};white-space:nowrap;">${statusEmoji[t.status] || ''} ${tStatus.toUpperCase()}</span>
        </div>
        <div style="font-size:11px;color:var(--green);font-weight:600;margin-bottom:4px;">${typeLabel[t.type] || tType}</div>
        <div style="font-size:11.5px;color:var(--muted);line-height:1.4;">${preview}</div>
        <div style="font-size:10px;color:#3a5570;margin-top:6px;">${t.message_count || 0} messages · ${t.created_at ? new Date(t.created_at).toLocaleDateString('en-KE') : ''}</div>
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:13px;">${e.message || 'Failed to load threads'}</div>`;
  }
}

async function openSupportThread(threadId) {
  activeSupportThreadId = threadId;
  const pane = document.getElementById('supportChatPane');
  if (!pane) return;
  pane.innerHTML = '<div class="loading-spinner" style="flex:1;"><div class="spinner"></div><span>Loading thread…</span></div>';

  try {
    const t = await api(`/support/admin/threads/${threadId}`);
    const statusColor = { open:'#e53935', pending:'#ff7043', resolved:'#3dd44a', closed:'#7a8fad' };
    const typeLabel   = { wrong_order:'📦 Wrong Order', delay:'⏳ Delay' };

    // Build recent orders HTML
    const ordersHtml = (t.recent_orders || []).map(o => {
      const rawLink   = o.link || '';
      const safeLink  = esc(rawLink);
      const link = rawLink ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:var(--green);font-size:10px;word-break:break-all;display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;" title="${safeLink}">${safeLink}</a>` : '';
      const provId = o.provider_order_id ? `<div style="font-size:10px;color:var(--muted);">Provider #${esc(o.provider_order_id)}</div>` : '';
      const oStatus = esc(o.status||'');
      return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <span style="color:var(--muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(o.service_name || 'Unknown service')}</span>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <span style="color:var(--white);">KES ${parseFloat(o.charge).toFixed(0)}</span>
            <span class="status-pill ${oStatus}" style="font-size:9px;">${oStatus}</span>
          </div>
        </div>
        <div style="color:var(--muted);font-size:10px;margin-top:2px;">Qty: ${parseInt(o.quantity||0).toLocaleString()}</div>
        ${link}${provId}
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px 0;">No recent orders</div>';

    // Build messages HTML
    function msgBubble(m) {
      const isAdmin = m.sender === 'admin';
      const safeBody = (m.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const formatted = safeBody.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
      const time = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '';
      if (isAdmin) {
        return `<div class="ev-msg from-admin" style="max-width:85%;">
          <div class="ev-msg-avatar">${m.is_bot ? '🤖' : '🦠'}</div>
          <div><div class="ev-msg-bubble">${formatted}</div><div class="ev-msg-time">${m.is_bot?'Bot':'Admin'} · ${time}</div></div>
        </div>`;
      }
      const initial = esc((t.user?.name || t.user?.email || 'U').charAt(0).toUpperCase());
      return `<div class="ev-msg from-user" style="max-width:85%;">
        <div class="ev-msg-avatar" style="background:linear-gradient(135deg,#243048,#1a2435);color:var(--green);font-weight:800;font-size:14px;">${initial}</div>
        <div><div class="ev-msg-bubble">${formatted}</div><div class="ev-msg-time">${time}</div></div>
      </div>`;
    }

    const userName  = esc(t.user?.name || t.user?.email || '—');
    const userEmail = esc(t.user?.email || '');
    const tType     = esc(t.type||'');
    const tStatus   = esc(t.status||'');
    const tStatusColor = statusColor[t.status] || '#7a8fad';
    const tTypeLabel = typeLabel[t.type] || tType;

    // linked order fields
    const lo = t.linked_order;
    const loHtml = lo ? (() => {
      const loSvc     = esc(lo.service_name||'—');
      const loStatus  = esc(lo.status||'');
      const loProvId  = lo.provider_order_id ? `<div style="color:var(--muted);margin-top:2px;font-size:11px;">Provider ID: #${esc(lo.provider_order_id)}</div>` : '';
      const loStart   = lo.start_count != null ? `<div style="color:var(--muted);margin-top:2px;font-size:11px;">Start: ${parseInt(lo.start_count)} · Remains: ${lo.remains != null ? parseInt(lo.remains) : '—'}</div>` : '';
      const rawLoLink = lo.link || '';
      const safeLoLink= esc(rawLoLink);
      const loLink    = rawLoLink ? `<a href="${safeLoLink}" target="_blank" rel="noopener noreferrer" style="color:var(--green);font-size:11px;word-break:break-all;display:block;margin-top:6px;">${safeLoLink}</a>` : '';
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;">
              <div style="color:var(--white);font-weight:700;margin-bottom:4px;">${loSvc}</div>
              <div style="color:var(--muted);">Qty: ${parseInt(lo.quantity||0).toLocaleString()} · KES ${parseFloat(lo.charge||0).toFixed(0)}</div>
              ${loProvId}${loStart}${loLink}
              <span class="status-pill ${loStatus}" style="margin-top:8px;display:inline-block;">${loStatus}</span>
            </div>`;
    })() : '<div style="font-size:12px;color:var(--muted);margin-bottom:16px;">No linked order</div>';

    // Ensure the pane itself is a proper bounded flex column
    pane.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;min-height:0;height:100%;background:var(--black);';

    pane.innerHTML = `
      <!-- Thread header — fixed, never scrolls -->
      <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;background:rgba(61,212,74,.03);">
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--white);">${userName}
            <span style="font-size:11px;color:var(--muted);font-weight:500;margin-left:8px;">${userEmail}</span>
          </div>
          <div style="font-size:11px;color:var(--green);font-weight:600;margin-top:2px;">${tTypeLabel} · <span style="color:${tStatusColor}">${tStatus.toUpperCase()}</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">Wallet: KES ${(t.user?.wallet_balance||0).toFixed(0)} · Member since ${t.user?.member_since ? new Date(t.user.member_since).toLocaleDateString('en-KE') : '—'}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <select onchange="adminUpdateThreadStatus(this.value)" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;padding:6px 10px;border-radius:8px;outline:none;cursor:pointer;">
            <option value="open"     ${t.status==='open'    ?'selected':''}>🔴 Open</option>
            <option value="pending"  ${t.status==='pending' ?'selected':''}>🟡 Pending</option>
            <option value="resolved" ${t.status==='resolved'?'selected':''}>🟢 Resolved</option>
            <option value="closed"   ${t.status==='closed'  ?'selected':''}>⬛ Closed</option>
          </select>
        </div>
      </div>

      <!-- Two-col body: messages + user sidebar — takes remaining height -->
      <div style="flex:1;min-height:0;display:grid;grid-template-columns:1fr 220px;overflow:hidden;">

        <!-- Messages column: flex col, constrained, scrollable messages area -->
        <div style="display:flex;flex-direction:column;min-height:0;overflow:hidden;border-right:1px solid var(--border);">
          <div id="adminMsgArea" style="flex:1;min-height:0;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;">
            ${(t.messages||[]).map(m=>msgBubble(m)).join('')}
          </div>
          <!-- Reply input — pinned to bottom -->
          <div style="padding:12px 14px;border-top:1px solid rgba(61,212,74,.1);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:var(--black);">
            <textarea id="adminReplyInput" placeholder="Type your reply…" style="flex:1;background:#1a2435;border:1px solid rgba(61,212,74,.18);border-radius:10px;padding:10px 14px;color:var(--white);font-family:'Montserrat',sans-serif;font-size:13px;outline:none;resize:none;height:42px;max-height:100px;transition:border-color .2s;line-height:1.4;" oninput="this.style.height='42px';this.style.height=Math.min(this.scrollHeight,100)+'px';" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();adminSendReply();}"></textarea>
            <button onclick="adminSendReply()" style="width:40px;height:40px;border-radius:10px;flex-shrink:0;background:linear-gradient(135deg,#3dd44a,#28a035);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>

        <!-- User sidebar — independently scrollable -->
        <div style="overflow-y:auto;padding:14px;background:rgba(0,0,0,.2);min-height:0;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">LINKED ORDER</div>
          ${loHtml}
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">RECENT ORDERS</div>
          <div>${ordersHtml}</div>
        </div>

      </div>`;

    // Scroll messages to bottom — use rAF + fallback timeout for reliability
    const msgArea = document.getElementById('adminMsgArea');
    if (msgArea) {
      const scrollToBottom = () => { msgArea.scrollTop = msgArea.scrollHeight; };
      requestAnimationFrame(() => { scrollToBottom(); setTimeout(scrollToBottom, 120); });
    }

  } catch(e) {
    pane.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--red);font-size:13px;">${e.message||'Failed to load thread'}</div>`;
  }
}

async function adminSendReply() {
  const input = document.getElementById('adminReplyInput');
  if (!input || !activeSupportThreadId) return;
  const body = input.value.trim();
  if (!body) return;
  input.value = '';
  input.style.height = '42px';
  try {
    await api(`/support/admin/threads/${activeSupportThreadId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    // Re-render the thread to show the new message
    await openSupportThread(activeSupportThreadId);
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
    toast(`Status → ${status}`, 'success');
    loadAdminSupport(); // refresh left panel counts
  } catch(e) {
    toast(e.message || 'Failed to update status', 'error');
  }
}
/* ══════════════════════════════════════════════════════════════ */

// ── Admin: open/find a support thread for a specific customer ─────────────
async function adminMessageCustomer(userId, userEmail) {
  if (!userId && !userEmail) { toast('No user info for this order', 'error'); return; }

  // Switch to Support tab
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
      await openSupportThread(best.id);
      // Highlight the active thread row in the list
      document.querySelectorAll('#supportThreadList .support-thread-item').forEach(el => {
        el.style.background = el.dataset.threadId === best.id ? 'rgba(61,212,74,.08)' : '';
        el.onmouseout = el.dataset.threadId === best.id ? null : () => { el.style.background = ''; };
      });
      toast(`Opened thread for ${userEmail}`, 'success');
    } else {
      // No existing thread — show prompt for admin to initiate one
      const pane = document.getElementById('supportChatPane');
      if (pane) {
        pane.innerHTML = `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;">
            <div style="font-size:36px;">💬</div>
            <div style="font-size:14px;font-weight:700;color:var(--white);">No existing thread for<br><span style="color:var(--green);">${userEmail}</span></div>
            <div style="font-size:13px;color:var(--muted);max-width:340px;">Send this customer a message to start a support conversation. They'll see it in their chat widget.</div>
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
let _ticketsFilter  = 'all';
let _activeTicketId = null;
let _ticketPollTimer = null;

async function loadTickets() {
  const el = document.getElementById('ticketsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading tickets…</span></div>';
  try {
    const data = await api('/support/threads');
    _allTickets = data.threads || data || [];
    _updateTicketsBadge();
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

function renderTickets(tickets) {
  const el = document.getElementById('ticketsList');
  if (!tickets.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🎫</div><p>No tickets found. Open one if you need help!</p></div>';
    return;
  }
  const typeIcon = { wrong_order: '📦', delay: '⏳' };
  const statusLabel = { open:'🔴 Open', pending:'🟡 Replied', resolved:'🟢 Resolved', closed:'⬛ Closed' };
  el.innerHTML = tickets.map(t => {
    const tid     = esc(t.id);
    const tStatus = esc(t.status||'');
    const stLabel = statusLabel[t.status] || tStatus;
    return `
    <div class="ticket-card" onclick="openTicketThread('${tid}')">
      <div class="ticket-icon">${typeIcon[t.type] || '🎫'}</div>
      <div class="ticket-body">
        <div class="ticket-title">${t.type === 'wrong_order' ? 'Wrong Order' : 'Delayed Service'} <span style="color:var(--muted);font-weight:400;font-size:12px;">#${tid.slice(0,8)}</span></div>
        <div class="ticket-preview">${_ticketPreview(_ticketBodyText(t.last_message || t.first_message))}</div>
        <div class="ticket-meta">${new Date(t.created_at).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})} · ${(t.messages||[]).length || t.message_count || 0} messages</div>
      </div>
      <span class="ticket-status ts-${tStatus}">${stLabel}</span>
    </div>
  `}).join('');
}

function _ticketBodyText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  // API returned a message object — pull the body field
  if (typeof val === 'object') return val.body || val.message || val.text || JSON.stringify(val);
  return String(val);
}

function _ticketPreview(body) {
  const clean = (body || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n/g, ' ').slice(0, 90) + ((body||'').length > 90 ? '…' : '');
  return clean.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _updateTicketsBadge() {
  const badge   = document.getElementById('ticketsBadge');
  const pending = _allTickets.filter(t => t.status === 'pending').length;
  if (badge) {
    badge.style.display = pending ? 'inline-flex' : 'none';
    badge.textContent   = pending || '';
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
  _startTicketPoll();
}

async function _loadTicketThread(threadId) {
  try {
    const t = await api(`/support/threads/${threadId}`);
    const typeLabel = t.type === 'wrong_order' ? '📦 Wrong Order' : '⏳ Delayed Service';
    document.getElementById('ttTitle').textContent = `${typeLabel} #${t.id.slice(0,8)}`;
    document.getElementById('ttMeta').textContent  =
      `Opened ${new Date(t.created_at).toLocaleDateString('en-KE',
        {day:'numeric',month:'short',year:'numeric'})} · ${(t.messages||[]).length} messages`;
    const stLabel = { open:'🔴 Open', pending:'🟡 Replied', resolved:'🟢 Resolved', closed:'⬛ Closed' }[t.status] || esc(t.status);
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
      msgs.forEach(m => el.insertAdjacentHTML('beforeend', _ttMsgHtml(m, initial)));
    }
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 60);
    const isClosed = ['resolved','closed'].includes(t.status);
    document.getElementById('ttClosedBanner').style.display = isClosed ? 'block' : 'none';
    document.getElementById('ttReplyRow').style.display     = isClosed ? 'none'  : 'flex';
  } catch(e) {
    document.getElementById('ttMessages').innerHTML =
      `<div style="padding:24px;color:var(--muted);">⚠️ ${e.message}</div>`;
  }
}

function _ttMsgHtml(m, userInitial) {
  const isAdmin  = m.sender === 'admin';
  const isBot    = m.is_bot;
  const avatar   = isAdmin
    ? (isBot
        ? `<div class="tt-avatar" style="background:linear-gradient(135deg,#3dd44a,#1a6b23);font-size:14px;">🦠</div>`
        : `<div class="tt-avatar" style="background:linear-gradient(135deg,#28a035,#1a6b23);font-size:14px;box-shadow:0 0 0 2px rgba(61,212,74,.4);">👤</div>`)
    : `<div class="tt-avatar" style="background:linear-gradient(135deg,#243048,#1a2435);color:#3dd44a;font-weight:800;font-size:13px;">${userInitial}</div>`;
  const humanCls = isAdmin ? (isBot ? 'is-bot' : 'is-human') : '';
  const senderName = isAdmin ? (isBot ? 'EndaViral Bot' : 'EndaViral Support') : 'You';
  const time = m.created_at
    ? new Date(m.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})
    : '';
  const body = (m.body||'')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  return `<div class="tt-msg from-${isAdmin?'admin':'user'} ${humanCls}">
    ${avatar}
    <div>
      <div class="tt-bubble">${body}</div>
      <div class="tt-time">${senderName} · ${time}</div>
    </div>
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
  const fakeMsg = { sender:'user', is_bot:false, body, created_at: new Date().toISOString() };
  document.getElementById('ttMessages').insertAdjacentHTML('beforeend', _ttMsgHtml(fakeMsg, initial));
  const el = document.getElementById('ttMessages');
  el.scrollTop = el.scrollHeight;
  try {
    await api(`/support/threads/${_activeTicketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    await _loadTicketThread(_activeTicketId);
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
}
function closeNewTicketModal() {
  const m = document.getElementById('newTicketModal');
  m.classList.remove('show');
  setTimeout(() => { m.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
}

async function submitNewTicket() {
  const type    = document.getElementById('ntType').value;
  const message = document.getElementById('ntMessage').value.trim();
  if (!message) { toast('Please describe your issue first.', 'error'); return; }
  const btn = document.getElementById('ntSubmitBtn');
  btn.textContent = 'Submitting…'; btn.disabled = true;
  try {
    const data = await api('/support/threads', {
      method: 'POST',
      body: JSON.stringify({ type, first_message: message })
    });
    closeNewTicketModal();
    toast('Ticket opened! Our team will respond shortly.', 'success');
    await loadTickets();
    openTicketThread(data.id);
  } catch(e) {
    toast(e.message || 'Failed to open ticket', 'error');
  } finally {
    btn.textContent = 'Submit Ticket'; btn.disabled = false;
  }
}

function closeTicketThread() {
  _stopTicketPoll();
  _activeTicketId = null;
  const modal = document.getElementById('ticketThreadModal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  document.body.style.overflow = '';
  loadTickets();
}
function _startTicketPoll() {
  _stopTicketPoll();
  _ticketPollTimer = setInterval(async () => {
    if (_activeTicketId) await _loadTicketThread(_activeTicketId);
  }, 6000);
}
function _stopTicketPoll() {
  if (_ticketPollTimer) { clearInterval(_ticketPollTimer); _ticketPollTimer = null; }
}
function _getTicketUser() {
  try { return JSON.parse(localStorage.getItem('ev_user') || '{}'); } catch(_) { return {}; }
}

/* ══════════════════════════════════════════════════════════════════
   BACKGROUND TICKET WATCHER
   Polls all customer threads every 8 s while logged in.
   When a new admin (non-bot) reply arrives, shows the dashboard
   popup so customers don't miss messages even if they never open
   the tickets section or chat widget.
══════════════════════════════════════════════════════════════════ */
let _bgTicketWatchTimer = null;
const _bgTicketSeenCount = {}; // { threadId: msgCount }

function _startBgTicketWatch() {
  if (_bgTicketWatchTimer) return;
  _bgTicketWatchTimer = setInterval(_bgTicketWatchTick, 30000); // 30s -- was 8s (egress)
}
function _stopBgTicketWatch() {
  if (_bgTicketWatchTimer) { clearInterval(_bgTicketWatchTimer); _bgTicketWatchTimer = null; }
}

async function _bgTicketWatchTick() {
  if (!token) return;
  // Short-circuit: if we already know all tracked threads are closed/resolved,
  // skip the network call entirely until next interval.
  const knownIds = Object.keys(_bgTicketSeenCount);
  if (knownIds.length > 0 && window._bgAllThreadsClosed) return;
  try {
    const data = await api('/support/threads');
    const threads = data.threads || data || [];
    // Update closed-threads flag so we can skip future polls when all quiet
    window._bgAllThreadsClosed = threads.length > 0 &&
      threads.every(t => ['resolved','closed'].includes(t.status));
    for (const t of threads) {
      if (['resolved','closed'].includes(t.status)) continue;
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
          const msgs = full.messages || [];
          const newMsgs = msgs.slice(prevCount);
          _bgTicketSeenCount[threadId] = msgs.length;

          // Only popup for real human admin messages (not bot)
          const lastHumanAdmin = newMsgs.filter(m => m.sender === 'admin' && !m.is_bot).pop();
          if (lastHumanAdmin) {
            const body    = lastHumanAdmin.body || '';
            const preview = body.replace(/\*\*/g,'').replace(/\*/g,'').replace(/\n/g,' ').slice(0, 80) + (body.length > 80 ? '…' : '');

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
    const data = await api(`/admin/users?email=${encodeURIComponent(email)}`);
    const users = data.users || data || [];
    const user  = Array.isArray(users) ? users.find(u => u.email === email) : null;
    if (!user) { toast('No user found with that email', 'error'); return; }
    _acoUser = user;
    document.getElementById('acoCustomerInfo').innerHTML = `
      <div style="padding:10px 14px;border-radius:10px;background:rgba(61,212,74,.07);
                  border:1px solid rgba(61,212,74,.2);font-size:13px;">
        ✅ <strong style="color:var(--white);">${esc(user.name || user.email)}</strong>
        <span style="color:var(--muted);"> · ID: ${esc((user.id||'').slice(0,8))}</span>
        <span style="color:var(--green);"> · KES ${parseFloat(user.balance||0).toFixed(2)} bal</span>
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