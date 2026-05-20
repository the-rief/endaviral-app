/* ═══════════════════ ENDAVIRAL ADMIN PANEL ═══════════════════
   Mirrors the structure of chat.js.
   Depends on globals defined in index.html before this script runs:
     - api(path, opts)          — authenticated fetch wrapper
     - token                    — JWT string
     - currentUser              — { role, name, email, … }
     - fmtKES(n)                — formats a number as "KES X,XXX"
     - statusPill(status)       — returns HTML badge string
     - toast(msg, type)         — shows a toast notification
     - navTo(page)              — navigates to a page section
   Include this file AFTER those globals are available:
     <script src="admin.js"></script>
═══════════════════════════════════════════════════════════════ */
(function () {

  /* ═══════════════════════════════════════════════════════════════
     TAB SWITCHING
  ═══════════════════════════════════════════════════════════════ */

  window.adminTab = function (tab, el) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('ap-' + tab).classList.add('active');
    if (tab === 'users')          loadAdminUsers();
    if (tab === 'allorders')      loadAdminOrders();
    if (tab === 'services-mgmt')  { loadAdminServices(); loadSavedPricingSettings(); }
    if (tab === 'stats')          loadAdminStats();
    if (tab === 'providers')      loadAdminProviders();
    if (tab === 'support')        loadAdminSupport();
    if (tab === 'create-order')   initAdminCreateOrder();
  };

  /* ═══════════════════════════════════════════════════════════════
     USERS
  ═══════════════════════════════════════════════════════════════ */

  async function loadAdminUsers() {
    const el = document.getElementById('adminUsersTable');
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading users…</span></div>';
    try {
      const data  = await api('/admin/users');
      const users = data.users || data.data || data || [];
      if (!users.length) {
        el.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>No users found.</p></div>';
        return;
      }
      el.innerHTML = `<table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Orders</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td><strong>${u.name || u.username || '—'}</strong></td>
            <td style="color:var(--muted);font-size:13px;">${u.email || '—'}</td>
            <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;
                background:${u.role === 'admin' ? 'rgba(61,212,74,.12)' : 'var(--navy)'};
                color:${u.role === 'admin' ? 'var(--green)' : 'var(--muted)'};">
              ${u.role || 'user'}</span></td>
            <td style="color:var(--green);font-family:'Montserrat',sans-serif;font-size:16px;">
              ${fmtKES(u.balance || u.wallet_balance)}</td>
            <td>${u.total_orders || u.orders_count || 0}</td>
            <td style="font-size:12px;color:var(--muted);">
              ${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
            <td><div style="display:flex;gap:6px;">
              <button class="action-btn" onclick="adminCreditUser('${u.id || u._id}','${u.name || u.email}')">+ Credit</button>
              <button class="action-btn danger" onclick="adminBanUser('${u.id || u._id}')">Ban</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  async function adminCreditUser(userId, userName) {
    const amount = prompt(`Credit wallet for ${userName}. Enter amount (KES):`);
    if (!amount || isNaN(amount)) return;
    try {
      await api(`/admin/users/${userId}/credit`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      toast(`Credited KES ${amount} to ${userName}`, 'success');
      loadAdminUsers();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function adminBanUser(userId) {
    if (!confirm('Ban this user?')) return;
    try {
      await api(`/admin/users/${userId}/ban`, { method: 'POST' });
      toast('User banned', 'success');
      loadAdminUsers();
    } catch (e) { toast(e.message, 'error'); }
  }

  // Expose user actions globally (called from rendered table HTML)
  window.adminCreditUser = adminCreditUser;
  window.adminBanUser    = adminBanUser;

  /* ═══════════════════════════════════════════════════════════════
     ALL ORDERS
  ═══════════════════════════════════════════════════════════════ */

  async function loadAdminOrders() {
    const el          = document.getElementById('adminOrdersTable');
    el.innerHTML      = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
    const emailFilter   = (document.getElementById('adminOrderSearch')?.value || '').trim();
    const orderIdFilter = (document.getElementById('adminOrderIdSearch')?.value || '').trim().replace(/^#/, '');
    try {
      const qs   = emailFilter ? `?email=${encodeURIComponent(emailFilter)}` : '';
      const data = await api('/admin/orders' + qs);
      let orders = data.orders || data.data || data || [];

      // Client-side Order ID filter (partial UUID match)
      if (orderIdFilter) {
        orders = orders.filter(o => (o.id || '').toLowerCase().includes(orderIdFilter.toLowerCase()));
      }

      if (!orders.length) {
        el.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No orders found.</p></div>';
        return;
      }
      el.innerHTML = `<table>
        <thead><tr><th>#ID</th><th>Customer</th><th>Service</th><th>Link</th><th>Qty</th><th>Cost</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
        <tbody>${orders.map(o => {
          const shortId = (o.id || '').slice(0, 8);
          const fullId  = o.id || '';
          const provId  = o.provider_order_id
            ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">Provider: #${o.provider_order_id}</div>`
            : '';
          const link        = o.link || '—';
          const linkDisplay = link !== '—'
            ? `<a href="${link}" target="_blank" rel="noopener"
                 style="color:var(--green);font-size:11px;word-break:break-all;
                        max-width:160px;display:block;overflow:hidden;
                        text-overflow:ellipsis;white-space:nowrap;" title="${link}">${link}</a>`
            : '<span style="color:var(--muted);font-size:11px;">—</span>';
          return `<tr>
            <td style="font-size:11px;">
              <span style="color:var(--muted);">#${shortId}</span>
              <button onclick="navigator.clipboard.writeText('${fullId}').then(()=>toast('Order ID copied!','success'))"
                      title="Copy full Order ID"
                      style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;
                             padding:2px 4px;margin-left:2px;border-radius:4px;"
                      onmouseover="this.style.color='var(--green)'"
                      onmouseout="this.style.color='var(--muted)'">⎘</button>
              ${provId}
            </td>
            <td style="font-size:13px;">
              <div style="font-weight:600;color:var(--white);">${o.user_email || '—'}</div>
              ${o.user_name && o.user_name !== '—'
                ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${o.user_name}</div>`
                : ''}
            </td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">
              ${o.service_name || o.service || '—'}</td>
            <td style="max-width:160px;">${linkDisplay}</td>
            <td>${parseInt(o.quantity || 0).toLocaleString()}</td>
            <td style="color:var(--green);font-family:'Montserrat',sans-serif;font-size:15px;">
              ${fmtKES(o.charge || o.cost)}</td>
            <td>${statusPill(o.status)}</td>
            <td style="font-size:12px;color:var(--muted);">
              ${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
            <td><button class="action-btn"
                  onclick="adminMessageCustomer('${o.user_id || ''}','${o.user_email || ''}')"
                  title="Open support thread with customer">💬 Message</button></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  window.loadAdminOrders = loadAdminOrders;

  /* ═══════════════════════════════════════════════════════════════
     SERVICES MANAGEMENT
  ═══════════════════════════════════════════════════════════════ */

  let _adminAllSvcs = [];

  async function loadAdminServices() {
    const el = document.getElementById('adminSvcTable');
    el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
    try {
      const data = await api('/admin/services?include_inactive=true').catch(() => api('/services'));
      _adminAllSvcs = data.services || data.data || data || [];
      renderAdminServices();
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  window.applyMinQtyFilter = function () { renderAdminServices(); };

  function renderAdminServices() {
    const el         = document.getElementById('adminSvcTable');
    const minQtyLimit = parseInt(document.getElementById('minQtyFilter')?.value || '10000');
    const minRateKes  = parseFloat(document.getElementById('minRateKes')?.value || '100');
    const maxRateKes  = parseFloat(document.getElementById('maxRateKes')?.value || '10000');

    const shown = _adminAllSvcs.filter(s => {
      const rate = parseFloat(s.rate || s.price || 0);
      return parseInt(s.min || 0) <= minQtyLimit && rate >= minRateKes && rate <= maxRateKes;
    });
    const hiddenByQty  = _adminAllSvcs.filter(s => parseInt(s.min || 0) > minQtyLimit);
    const hiddenByRate = _adminAllSvcs.filter(s => {
      const rate = parseFloat(s.rate || s.price || 0);
      return parseInt(s.min || 0) <= minQtyLimit && (rate < minRateKes || rate > maxRateKes);
    });

    if (!_adminAllSvcs.length) {
      el.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No services. Click Sync.</p></div>';
      return;
    }

    el.innerHTML = `
      <div style="padding:10px 0 14px;font-size:12px;color:var(--muted);">
        Showing <strong style="color:var(--white);">${shown.length}</strong> services
        ${hiddenByQty.length  ? `· <strong style="color:var(--orange);">${hiddenByQty.length} hidden</strong> (min qty &gt; ${minQtyLimit.toLocaleString()})` : ''}
        ${hiddenByRate.length ? `· <strong style="color:var(--blue);">${hiddenByRate.length} hidden</strong> (rate outside KES ${minRateKes}–${maxRateKes})` : ''}
        · Total: ${_adminAllSvcs.length}
      </div>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Rate / 1000</th><th>Min</th><th>Max</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>${shown.map(s => {
          const svcId    = s.service || s.id || s._id || '';
          const isActive = s.is_active !== false;
          const rate     = parseFloat(s.rate || s.price || 0);
          const rateColor = rate < minRateKes || rate > maxRateKes ? 'var(--blue)' : 'var(--green)';
          return `
          <tr style="${!isActive ? 'opacity:0.5;' : ''}">
            <td style="color:var(--muted);font-size:12px;">${svcId}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;">${s.name || '—'}</td>
            <td style="font-size:12px;">${s.category || '—'}</td>
            <td style="color:${rateColor};font-family:'Montserrat',sans-serif;font-size:16px;">${fmtKES(rate)}</td>
            <td style="${parseInt(s.min || 0) > minQtyLimit ? 'color:var(--orange);font-weight:700;' : ''}">${parseInt(s.min || 0).toLocaleString()}</td>
            <td>${parseInt(s.max || 0).toLocaleString()}</td>
            <td><span style="font-size:11px;padding:3px 8px;border-radius:6px;
                  background:${isActive ? 'rgba(61,212,74,.12)' : 'rgba(229,57,53,.1)'};
                  color:${isActive ? 'var(--green)' : 'var(--red)'};">${isActive ? 'Shown' : 'Hidden'}</span></td>
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

  async function loadSavedPricingSettings() {
    try {
      const data = await api('/admin/settings/pricing');
      if (data.markup_percent !== undefined)
        document.getElementById('markupInput').value = Math.round(data.markup_percent * 100);
      if (data.usd_to_kes !== undefined)
        document.getElementById('usdKesInput').value = data.usd_to_kes;
      if (data.min_qty_filter !== undefined)
        document.getElementById('minQtyFilter').value = data.min_qty_filter;
      if (data.min_rate_kes !== undefined)
        document.getElementById('minRateKes').value = data.min_rate_kes;
      if (data.max_rate_kes !== undefined)
        document.getElementById('maxRateKes').value = data.max_rate_kes;
      renderAdminServices();
    } catch (_) {}
  }

  window.syncServices = async function (evt) {
    const btn        = evt ? evt.target : event.target;
    const markupPct  = parseFloat(document.getElementById('markupInput').value || '40');
    const usdKes     = parseFloat(document.getElementById('usdKesInput').value || '140');
    const minQtyLimit= parseInt(document.getElementById('minQtyFilter')?.value || '10000');
    const minRateKes = parseFloat(document.getElementById('minRateKes')?.value || '100');
    const maxRateKes = parseFloat(document.getElementById('maxRateKes')?.value || '10000');
    if (isNaN(markupPct) || markupPct < 0)             { toast('Enter a valid markup %', 'error'); return; }
    if (isNaN(usdKes) || usdKes < 1)                   { toast('Enter a valid USD→KES rate', 'error'); return; }
    if (isNaN(minRateKes) || minRateKes < 0)           { toast('Enter a valid MIN RATE', 'error'); return; }
    if (isNaN(maxRateKes) || maxRateKes <= minRateKes) { toast('MAX RATE must be greater than MIN RATE', 'error'); return; }
    const markup = markupPct / 100;
    btn.textContent = 'Syncing…'; btn.disabled = true;
    try {
      const result = await api(
        `/admin/services/sync?markup=${markup}&usd_kes=${usdKes}&min_qty=${minQtyLimit}&min_rate_kes=${minRateKes}&max_rate_kes=${maxRateKes}`,
        { method: 'POST' }
      );
      const visible   = result.visible ?? '?';
      const hidden    = result.hidden_by_filters ?? 0;
      const breakdown = result.hidden_breakdown || {};
      const parts     = [];
      if (breakdown.country_targeted) parts.push(`${breakdown.country_targeted} geo`);
      if (breakdown.min_qty_exceeded)  parts.push(`${breakdown.min_qty_exceeded} qty`);
      if (breakdown.rate_out_of_range) parts.push(`${breakdown.rate_out_of_range} rate`);
      toast(`Synced! ${visible} visible · ${hidden} hidden (${parts.join(', ')}) · Markup: ${markupPct}%`, 'success');
      loadAdminServices();
      if (typeof loadServices === 'function') loadServices(); // refresh customer-facing list
    } catch (e) { toast(e.message, 'error'); }
    finally { btn.textContent = '⟳ Sync & Apply'; btn.disabled = false; }
  };

  window.toggleSvcVisibility = async function (svcId, currentlyActive) {
    const isActive = currentlyActive === 'true';
    try {
      await api(`/admin/services/${svcId}/toggle`, {
        method: 'POST', body: JSON.stringify({ is_active: !isActive })
      });
      toast(isActive ? 'Service hidden from users' : 'Service now visible to users', 'success');
    } catch (_) {
      toast('Visibility toggled (refresh to confirm)', 'success');
    }
    loadAdminServices();
  };

  window.deleteSvc = async function (svcId) {
    if (!confirm('Delete this service? Users will no longer see it. You can re-sync to restore it.')) return;
    try {
      await api(`/admin/services/${svcId}`, { method: 'DELETE' });
      toast('Service deleted', 'success');
    } catch (_) {
      toast('Service removed from view', 'success');
    }
    loadAdminServices();
  };

  /* ═══════════════════════════════════════════════════════════════
     STATS
  ═══════════════════════════════════════════════════════════════ */

  async function loadAdminStats() {
    const el             = document.getElementById('adminStatsGrid');
    const breakdownPanel = document.getElementById('filterBreakdownPanel');
    try {
      const [statsData, breakdownData] = await Promise.all([
        api('/admin/stats'),
        api('/admin/stats/filter-breakdown'),
      ]);

      const s          = statsData.stats || statsData;
      const svcSummary = statsData.services || {};

      // Provider balance card
      const balUSD      = s.panel_balance_usd;
      const isLive      = s.panel_balance_is_live;
      const lastUpdated = s.panel_balance_last_updated;
      let balCard = '';
      if (balUSD !== null && balUSD !== undefined) {
        const balNum    = parseFloat(balUSD);
        const balColor  = balNum >= 10 ? 'var(--green)' : balNum >= 3 ? 'var(--orange)' : 'var(--red)';
        const balBorder = balColor;
        const balClass  = balNum >= 10 ? 'green' : balNum >= 3 ? 'orange' : 'red';
        const liveTag   = isLive
          ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;
               color:var(--green);background:rgba(61,212,74,.1);border:1px solid rgba(61,212,74,.2);
               padding:2px 7px;border-radius:10px;letter-spacing:.5px;">
               <span style="width:5px;height:5px;border-radius:50%;background:var(--green);
                 display:inline-block;animation:pulse 2s infinite;"></span>LIVE
             </span>`
          : `<span style="font-size:10px;font-weight:700;color:var(--muted);
               background:rgba(122,143,173,.1);border:1px solid rgba(122,143,173,.2);
               padding:2px 7px;border-radius:10px;">CACHED</span>`;
        const timeAgo = lastUpdated ? (() => {
          const diff = Math.floor((Date.now() - new Date(lastUpdated)) / 1000);
          if (diff < 60) return `${diff}s ago`;
          if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
          return `${Math.floor(diff / 3600)}h ago`;
        })() : '';
        const warningBar = balNum < 3
          ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(229,57,53,.12);border:1px solid rgba(229,57,53,.25);border-radius:8px;font-size:11px;color:#ff8a80;font-weight:600;">⚠️ Critical — customers cannot place orders</div>`
          : balNum < 10
          ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(255,112,67,.10);border:1px solid rgba(255,112,67,.2);border-radius:8px;font-size:11px;color:var(--orange);font-weight:600;">⚠️ Low — top up soon</div>`
          : '';
        balCard = `
          <div class="stat-card ${balClass}" style="border-color:${balBorder};grid-column:span 2;">
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
              <div style="height:100%;width:${Math.min(100, (balNum / 50) * 100)}%;background:${balColor};border-radius:4px;transition:width 1s ease;"></div>
            </div>
            <div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:4px;">bar = balance vs $50 reference</div>
          </div>`;
      }

      const providerLine = s.active_provider
        ? `<div class="stat-card" style="background:var(--card);border-color:var(--border);">
             <div class="stat-icon">🔌</div>
             <div class="stat-label">Active Provider</div>
             <div class="stat-val" style="font-size:18px;">${s.active_provider}</div>
           </div>` : '';

      el.innerHTML = `
        <div class="stat-card green"><div class="stat-icon">💳</div><div class="stat-label">Total Sales</div><div class="stat-val">${fmtKES(s.total_sales ?? s.total_revenue ?? 0)}</div><div class="stat-sub">All paid orders</div></div>
        <div class="stat-card green" style="border-color:rgba(61,212,74,.6);"><div class="stat-icon">💰</div><div class="stat-label">Your Revenue</div><div class="stat-val">${fmtKES(s.total_revenue ?? 0)}</div><div class="stat-sub">${s.markup_label ? s.markup_label + ' markup' : 'Profit only'}</div></div>
        <div class="stat-card blue"><div class="stat-icon">👥</div><div class="stat-label">Total Users</div><div class="stat-val">${s.total_users || s.users || 0}</div></div>
        <div class="stat-card orange"><div class="stat-icon">📦</div><div class="stat-label">Total Orders</div><div class="stat-val">${s.total_orders || s.orders || 0}</div></div>
        <div class="stat-card red"><div class="stat-icon">🔄</div><div class="stat-label">Active Orders</div><div class="stat-val">${s.active_orders || 0}</div></div>
        ${balCard}
        ${providerLine}
        <div class="stat-card green">
          <div class="stat-icon">👁</div>
          <div class="stat-label">Visible Services</div>
          <div class="stat-val">${(svcSummary.visible_to_customers ?? breakdownData.visible ?? '—').toLocaleString()}</div>
          <div class="stat-sub">of ${(svcSummary.total ?? breakdownData.total_services ?? '—').toLocaleString()} total</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon">🚫</div>
          <div class="stat-label">Hidden Services</div>
          <div class="stat-val">${(svcSummary.hidden_total ?? breakdownData.hidden_total ?? '—').toLocaleString()}</div>
          <div class="stat-sub" style="color:rgba(229,57,53,.7);">filtered out</div>
        </div>`;

      // Filter breakdown panel
      const bd      = breakdownData;
      const reasons = bd.hidden_by_reason || {};
      document.getElementById('filterSummaryCards').innerHTML = `
        <div style="background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.2);border-radius:12px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(229,57,53,.7);margin-bottom:6px;">🌍 Geo-Targeted</div>
          <div style="font-size:28px;font-weight:800;color:#ff8a80;line-height:1;">${(reasons.country_targeted || 0).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Country-specific services</div>
        </div>
        <div style="background:rgba(255,112,67,.08);border:1px solid rgba(255,112,67,.2);border-radius:12px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,112,67,.7);margin-bottom:6px;">📊 Min Qty Too High</div>
          <div style="font-size:28px;font-weight:800;color:var(--orange);line-height:1;">${(reasons.min_qty_exceeded || 0).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Exceed qty filter</div>
        </div>
        <div style="background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.2);border-radius:12px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(33,150,243,.7);margin-bottom:6px;">💲 Rate Out of Range</div>
          <div style="font-size:28px;font-weight:800;color:var(--blue);line-height:1;">${(reasons.rate_out_of_range || 0).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Outside KES rate band</div>
        </div>
        <div style="background:rgba(122,143,173,.08);border:1px solid rgba(122,143,173,.2);border-radius:12px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(122,143,173,.7);margin-bottom:6px;">🙈 Manually Hidden</div>
          <div style="font-size:28px;font-weight:800;color:var(--muted);line-height:1;">${(reasons.manually_hidden || 0).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Hidden by admin</div>
        </div>`;

      // Country-by-category grid
      const catMap     = bd.country_targeted_by_category || {};
      const samples    = bd.country_targeted_samples || {};
      const catEntries = Object.entries(catMap);
      const catDetail  = document.getElementById('countryFilterDetail');
      const catGrid    = document.getElementById('countryByCategoryGrid');
      if ((reasons.country_targeted || 0) > 0 && catEntries.length > 0) {
        catDetail.style.display = '';
        catGrid.innerHTML = catEntries.map(([cat, count]) => {
          const sampleList = (samples[cat] || []).slice(0, 3);
          const sampleHtml = sampleList.length
            ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);">
                 ${sampleList.map(n => `<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="${n}">• ${n}</div>`).join('')}
                 ${(samples[cat] || []).length > 3 ? `<div style="font-size:10px;color:rgba(122,143,173,.5);margin-top:2px;">+${(samples[cat] || []).length - 3} more…</div>` : ''}
               </div>` : '';
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
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
      breakdownPanel.style.display = 'none';
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     PROVIDERS
  ═══════════════════════════════════════════════════════════════ */

  async function loadAdminProviders() {
    const grid = document.getElementById('providersGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading providers…</span></div>';
    try {
      const data      = await api('/admin/providers');
      const providers = data.providers || [];
      const active    = data.active || '';
      if (!providers.length) {
        grid.innerHTML = '<div class="empty-state"><div class="icon">🔌</div><p>No providers registered.</p></div>';
        return;
      }
      grid.innerHTML = providers.map(p => {
        const isActive   = p.slug === active;
        const configured = p.is_configured;
        return `
          <div style="background:var(--card);border:2px solid ${isActive ? 'var(--green)' : 'var(--border)'};border-radius:14px;padding:20px;position:relative;transition:border-color .2s;">
            ${isActive ? `<div style="position:absolute;top:12px;right:12px;background:rgba(61,212,74,.15);color:var(--green);font-size:10px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:20px;border:1px solid rgba(61,212,74,.3);">● ACTIVE</div>` : ''}
            <div style="font-size:17px;font-weight:800;color:var(--white);margin-bottom:4px;">${p.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">
              <a href="${p.website || '#'}" target="_blank" style="color:var(--blue);text-decoration:none;">${p.website || '—'}</a>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${configured ? 'var(--green)' : 'var(--red)'};flex-shrink:0;"></div>
              <span style="font-size:12px;color:${configured ? 'var(--green)' : 'var(--red)'};">
                ${configured ? 'API key configured' : 'No API key — add ' + p.key_env + ' to Render env vars'}
              </span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${!isActive && configured ? `<button class="btn-primary" style="padding:9px 18px;margin:0;width:auto;font-size:13px;" onclick="switchProvider('${p.slug}','${p.name}')">Switch to ${p.name}</button>` : ''}
              ${isActive ? `<button class="btn-secondary" style="padding:9px 18px;font-size:13px;" disabled>✓ Currently Active</button>` : ''}
              <button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="testProvider('${p.slug}', this)">🔌 Test</button>
              ${!configured ? `<span style="font-size:11px;color:var(--muted);align-self:center;font-style:italic;">Set ${p.key_env} in Render</span>` : ''}
            </div>
            <div id="test-result-${p.slug}" style="margin-top:12px;font-size:12px;display:none;"></div>
          </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
    }
  }

  window.switchProvider = async function (slug, name) {
    if (!confirm(`Switch to ${name}?\n\nAll new orders will be placed through ${name} immediately.`)) return;
    try {
      const data = await api('/admin/providers/switch', { method: 'POST', body: JSON.stringify({ slug }) });
      toast(`✅ Switched to ${data.name}! New orders now go through ${data.name}.`, 'success');
      loadAdminProviders();
      loadAdminStats();
    } catch (e) { toast(`Failed to switch: ${e.message}`, 'error'); }
  };

  window.testProvider = async function (slug, btn) {
    const resultEl = document.getElementById('test-result-' + slug);
    const orig     = btn.textContent;
    btn.textContent = 'Testing…'; btn.disabled = true;
    resultEl.style.display = 'none';
    try {
      const data = await api(`/admin/providers/${slug}/test`);
      resultEl.style.display = 'block';
      resultEl.style.color   = 'var(--green)';
      resultEl.textContent   = `✓ Connected — Balance: ${data.currency || 'USD'} ${parseFloat(data.balance || 0).toFixed(2)}`;
    } catch (e) {
      resultEl.style.display = 'block';
      resultEl.style.color   = 'var(--red)';
      resultEl.textContent   = `✗ ${e.message}`;
    } finally {
      btn.textContent = orig; btn.disabled = false;
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     SUPPORT INBOX
  ═══════════════════════════════════════════════════════════════ */

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
      const data    = await api(url);
      const threads = data.threads || [];
      if (!threads.length) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">No threads found</div>';
        return;
      }
      const statusColor = { open: '#e53935', pending: '#ff7043', resolved: '#3dd44a', closed: '#7a8fad' };
      const statusEmoji = { open: '🔴', pending: '🟡', resolved: '🟢', closed: '⬛' };
      const typeLabel   = { wrong_order: '📦 Wrong Order', delay: '⏳ Delay' };

      list.innerHTML = threads.map(t => {
        const lastMsg = t.last_message;
        const preview = lastMsg ? lastMsg.body.slice(0, 60) + (lastMsg.body.length > 60 ? '…' : '') : 'No messages';
        const sColor  = statusColor[t.status] || '#7a8fad';
        return `<div class="support-thread-item" data-thread-id="${t.id}" onclick="openSupportThread('${t.id}')"
            style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;"
            onmouseover="this.style.background='rgba(61,212,74,.04)'" onmouseout="this.style.background=''">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <div style="font-size:12px;font-weight:700;color:var(--white);">${t.user_name || t.user_email || '—'}</div>
            <span style="font-size:10px;font-weight:700;color:${sColor};white-space:nowrap;">${statusEmoji[t.status]} ${t.status.toUpperCase()}</span>
          </div>
          <div style="font-size:11px;color:var(--green);font-weight:600;margin-bottom:4px;">${typeLabel[t.type] || t.type}</div>
          <div style="font-size:11.5px;color:var(--muted);line-height:1.4;">${preview}</div>
          <div style="font-size:10px;color:#3a5570;margin-top:6px;">${t.message_count || 0} messages · ${t.created_at ? new Date(t.created_at).toLocaleDateString('en-KE') : ''}</div>
        </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:13px;">${e.message || 'Failed to load threads'}</div>`;
    }
  }

  window.openSupportThread = async function (threadId) {
    activeSupportThreadId = threadId;
    const pane = document.getElementById('supportChatPane');
    if (!pane) return;
    pane.innerHTML = '<div class="loading-spinner" style="flex:1;"><div class="spinner"></div><span>Loading thread…</span></div>';

    try {
      const t           = await api(`/support/admin/threads/${threadId}`);
      const statusColor = { open: '#e53935', pending: '#ff7043', resolved: '#3dd44a', closed: '#7a8fad' };
      const typeLabel   = { wrong_order: '📦 Wrong Order', delay: '⏳ Delay' };

      const ordersHtml = (t.recent_orders || []).map(o => {
        const link   = o.link ? `<a href="${o.link}" target="_blank" rel="noopener" style="color:var(--green);font-size:10px;word-break:break-all;display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;" title="${o.link}">${o.link}</a>` : '';
        const provId = o.provider_order_id ? `<div style="font-size:10px;color:var(--muted);">Provider #${o.provider_order_id}</div>` : '';
        return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <span style="color:var(--muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.service_name || 'Unknown service'}</span>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
              <span style="color:var(--white);">KES ${parseFloat(o.charge).toFixed(0)}</span>
              <span class="status-pill ${o.status}" style="font-size:9px;">${o.status}</span>
            </div>
          </div>
          <div style="color:var(--muted);font-size:10px;margin-top:2px;">Qty: ${o.quantity?.toLocaleString?.() || o.quantity}</div>
          ${link}${provId}
        </div>`;
      }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px 0;">No recent orders</div>';

      function msgBubble(m) {
        const isAdmin   = m.sender === 'admin';
        const formatted = m.body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        const time      = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '';
        if (isAdmin) {
          return `<div class="ev-msg from-admin" style="max-width:85%;">
            <div class="ev-msg-avatar">${m.is_bot ? '🤖' : '🦠'}</div>
            <div><div class="ev-msg-bubble">${formatted}</div><div class="ev-msg-time">${m.is_bot ? 'Bot' : 'Admin'} · ${time}</div></div>
          </div>`;
        }
        const initial = (t.user?.name || t.user?.email || 'U').charAt(0).toUpperCase();
        return `<div class="ev-msg from-user" style="max-width:85%;">
          <div class="ev-msg-avatar" style="background:linear-gradient(135deg,#243048,#1a2435);color:var(--green);font-weight:800;font-size:14px;">${initial}</div>
          <div><div class="ev-msg-bubble">${formatted}</div><div class="ev-msg-time">${time}</div></div>
        </div>`;
      }

      pane.innerHTML = `
        <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;background:rgba(61,212,74,.03);">
          <div>
            <div style="font-size:13px;font-weight:800;color:var(--white);">${t.user?.name || t.user?.email || '—'}
              <span style="font-size:11px;color:var(--muted);font-weight:500;margin-left:8px;">${t.user?.email || ''}</span>
            </div>
            <div style="font-size:11px;color:var(--green);font-weight:600;margin-top:2px;">${typeLabel[t.type] || t.type} · <span style="color:${statusColor[t.status]}">${t.status.toUpperCase()}</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">Wallet: KES ${(t.user?.wallet_balance || 0).toFixed(0)} · Member since ${t.user?.member_since ? new Date(t.user.member_since).toLocaleDateString('en-KE') : '—'}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <select onchange="adminUpdateThreadStatus(this.value)"
                    style="background:var(--card);border:1px solid var(--border);color:var(--white);
                           font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;
                           padding:6px 10px;border-radius:8px;outline:none;cursor:pointer;">
              <option value="open"     ${t.status === 'open'     ? 'selected' : ''}>🔴 Open</option>
              <option value="pending"  ${t.status === 'pending'  ? 'selected' : ''}>🟡 Pending</option>
              <option value="resolved" ${t.status === 'resolved' ? 'selected' : ''}>🟢 Resolved</option>
              <option value="closed"   ${t.status === 'closed'   ? 'selected' : ''}>⬛ Closed</option>
            </select>
          </div>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 220px;overflow:hidden;">
          <div style="display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden;">
            <div id="adminMsgArea" style="flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;">
              ${(t.messages || []).map(m => msgBubble(m)).join('')}
            </div>
            <div style="padding:12px 14px;border-top:1px solid rgba(61,212,74,.1);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;">
              <textarea id="adminReplyInput" placeholder="Type your reply…"
                style="flex:1;background:#1a2435;border:1px solid rgba(61,212,74,.18);border-radius:10px;
                       padding:10px 14px;color:var(--white);font-family:'Montserrat',sans-serif;
                       font-size:13px;outline:none;resize:none;height:42px;max-height:100px;
                       transition:border-color .2s;line-height:1.4;"
                oninput="this.style.height='42px';this.style.height=Math.min(this.scrollHeight,100)+'px';"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();adminSendReply();}"></textarea>
              <button onclick="adminSendReply()"
                      style="width:40px;height:40px;border-radius:10px;flex-shrink:0;
                             background:linear-gradient(135deg,#3dd44a,#28a035);border:none;cursor:pointer;
                             display:flex;align-items:center;justify-content:center;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
          <div style="overflow-y:auto;padding:14px;background:rgba(0,0,0,.2);">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">LINKED ORDER</div>
            ${t.linked_order ? `
              <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;">
                <div style="color:var(--white);font-weight:700;margin-bottom:4px;">${t.linked_order.service_name || '—'}</div>
                <div style="color:var(--muted);">Qty: ${t.linked_order.quantity} · KES ${parseFloat(t.linked_order.charge).toFixed(0)}</div>
                ${t.linked_order.provider_order_id ? `<div style="color:var(--muted);margin-top:2px;font-size:11px;">Provider ID: #${t.linked_order.provider_order_id}</div>` : ''}
                ${t.linked_order.start_count != null ? `<div style="color:var(--muted);margin-top:2px;font-size:11px;">Start: ${t.linked_order.start_count} · Remains: ${t.linked_order.remains ?? '—'}</div>` : ''}
                ${t.linked_order.link ? `<a href="${t.linked_order.link}" target="_blank" rel="noopener" style="color:var(--green);font-size:11px;word-break:break-all;display:block;margin-top:6px;">${t.linked_order.link}</a>` : ''}
                <span class="status-pill ${t.linked_order.status}" style="margin-top:8px;display:inline-block;">${t.linked_order.status}</span>
              </div>` : '<div style="font-size:12px;color:var(--muted);margin-bottom:16px;">No linked order</div>'}
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">RECENT ORDERS</div>
            <div>${ordersHtml}</div>
          </div>
        </div>`;

      const msgArea = document.getElementById('adminMsgArea');
      if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
    } catch (e) {
      pane.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--red);font-size:13px;">${e.message || 'Failed to load thread'}</div>`;
    }
  };

  window.adminSendReply = async function () {
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
      await window.openSupportThread(activeSupportThreadId);
      toast('Reply sent ✓', 'success');
    } catch (e) { toast(e.message || 'Failed to send reply', 'error'); }
  };

  window.adminUpdateThreadStatus = async function (status) {
    if (!activeSupportThreadId) return;
    try {
      await api(`/support/admin/threads/${activeSupportThreadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast(`Status → ${status}`, 'success');
      loadAdminSupport();
    } catch (e) { toast(e.message || 'Failed to update status', 'error'); }
  };

  window.adminMessageCustomer = async function (userId, userEmail) {
    if (!userId && !userEmail) { toast('No user info for this order', 'error'); return; }

    const supportTabBtn = document.querySelector('.admin-tab[onclick*="support"]');
    if (supportTabBtn) supportTabBtn.click();

    const list = document.getElementById('supportThreadList');
    if (list) list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Looking up customer…</span></div>';

    try {
      const data    = await api('/support/admin/threads?limit=200');
      const threads = (data.threads || []).filter(t =>
        (userId && t.user_id === userId) || (userEmail && t.user_email === userEmail)
      );
      await loadAdminSupport();

      if (threads.length) {
        const best = threads.find(t => ['open', 'pending'].includes(t.status)) || threads[0];
        await window.openSupportThread(best.id);
        document.querySelectorAll('#supportThreadList .support-thread-item').forEach(el => {
          el.style.background  = el.dataset.threadId === best.id ? 'rgba(61,212,74,.08)' : '';
          el.onmouseout = el.dataset.threadId === best.id ? null : () => { el.style.background = ''; };
        });
        toast(`Opened thread for ${userEmail}`, 'success');
      } else {
        const pane = document.getElementById('supportChatPane');
        if (pane) {
          pane.innerHTML = `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;">
              <div style="font-size:36px;">💬</div>
              <div style="font-size:14px;font-weight:700;color:var(--white);">No existing thread for<br><span style="color:var(--green);">${userEmail}</span></div>
              <div style="font-size:13px;color:var(--muted);max-width:340px;">Send this customer a message to start a support conversation.</div>
              <select id="adminInitiateType" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;outline:none;cursor:pointer;margin-top:4px;">
                <option value="wrong_order">📦 Wrong Order</option>
                <option value="delay">⏳ Delay / Late Delivery</option>
              </select>
              <textarea id="adminInitiateMsg" placeholder="Type your opening message to the customer…"
                style="width:100%;max-width:400px;min-height:80px;background:var(--card);border:1px solid rgba(61,212,74,.2);
                       border-radius:10px;padding:10px 14px;color:var(--white);font-family:'Montserrat',sans-serif;
                       font-size:13px;outline:none;resize:vertical;"></textarea>
              <button onclick="adminDoInitiateThread('${userEmail}')"
                      style="padding:10px 28px;background:linear-gradient(135deg,#3dd44a,#28a035);border:none;
                             border-radius:10px;color:#fff;font-family:'Montserrat',sans-serif;
                             font-size:13px;font-weight:700;cursor:pointer;">Send Message</button>
            </div>`;
        }
      }
    } catch (e) {
      toast(e.message || 'Failed to look up customer threads', 'error');
      loadAdminSupport();
    }
  };

  window.adminDoInitiateThread = async function (userEmail) {
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
      await window.openSupportThread(thread.id);
    } catch (e) { toast(e.message || 'Failed to send message', 'error'); }
  };

  /* ═══════════════════════════════════════════════════════════════
     CREATE ORDER (Admin places order on behalf of customer)
  ═══════════════════════════════════════════════════════════════ */

  let _acoUser       = null;
  let _acoSvc        = null;
  let _acoAllSvcs    = [];
  let _acoPollTimer  = null;
  let _acoOrderId    = null;
  let _acoCheckoutId = null;

  window.initAdminCreateOrder = async function () {
    _acoUser = null; _acoSvc = null; _acoAllSvcs = [];
    _stopAcoPoll(); _acoOrderId = null; _acoCheckoutId = null;
    ['acoEmail', 'acoLink', 'acoQty', 'acoPhone'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['acoStep2', 'acoStep3', 'acoStep4'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    const ci = document.getElementById('acoCustomerInfo');
    if (ci) ci.innerHTML = '';
    _setAcoStatus('idle');
    try {
      const data = await api('/services');
      _acoAllSvcs = data.services || data || [];
    } catch (_) {}
  };

  window.lookupCustomer = async function () {
    const email = (document.getElementById('acoEmail')?.value || '').trim();
    if (!email) { toast('Enter a customer email', 'error'); return; }
    const btn = document.getElementById('acoLookupBtn');
    btn.textContent = 'Looking up…'; btn.disabled = true;
    try {
      const data  = await api(`/admin/users?email=${encodeURIComponent(email)}`);
      const users = data.users || data || [];
      const user  = Array.isArray(users) ? users.find(u => u.email === email) : null;
      if (!user) { toast('No user found with that email', 'error'); return; }
      _acoUser = user;
      document.getElementById('acoCustomerInfo').innerHTML = `
        <div style="padding:10px 14px;border-radius:10px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.2);font-size:13px;">
          ✅ <strong style="color:var(--white);">${user.name || user.email}</strong>
          <span style="color:var(--muted);"> · ID: ${(user.id || '').slice(0, 8)}</span>
          <span style="color:var(--green);"> · KES ${parseFloat(user.balance || 0).toFixed(2)} bal</span>
        </div>`;
      document.getElementById('acoStep2').style.display = 'block';
      _renderAcoServices();
    } catch (e) { toast(e.message || 'Lookup failed', 'error'); }
    finally { btn.textContent = 'Look Up'; btn.disabled = false; }
  };

  function _renderAcoServices(filter = '') {
    const el   = document.getElementById('acoSvcList');
    if (!el) return;
    const svcs = _acoAllSvcs.filter(s =>
      !filter || s.name.toLowerCase().includes(filter.toLowerCase())
    );
    if (!svcs.length) {
      el.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:13px;">No services found.</div>';
      return;
    }
    el.innerHTML = svcs.map(s => `
      <div class="aco-svc-row${_acoSvc && _acoSvc.id === s.id ? ' selected' : ''}"
           onclick="selectAcoService(${JSON.stringify(s).replace(/"/g, '&quot;')})">
        <span class="aco-svc-name">${s.name}</span>
        <span class="aco-svc-rate">KES ${parseFloat(s.rate_kes || 0).toFixed(0)}/1k</span>
      </div>`).join('');
  }

  window.renderAcoServices  = _renderAcoServices;  // keep legacy name working in HTML
  window.filterAcoServices  = function () { _renderAcoServices(document.getElementById('acoSvcSearch')?.value || ''); };

  window.selectAcoService = function (svc) {
    _acoSvc = svc;
    const sel = document.getElementById('acoSelectedSvc');
    sel.style.display = 'block';
    sel.innerHTML = `✅ <strong>${svc.name}</strong> · KES ${parseFloat(svc.rate_kes || 0).toFixed(0)}/1k · Min: ${svc.min_qty} Max: ${svc.max_qty}`;
    document.getElementById('acoStep3').style.display = 'block';
    document.getElementById('acoStep4').style.display = 'block';
    _renderAcoServices(document.getElementById('acoSvcSearch')?.value || '');
    window.calcAcoCost();
  };

  window.calcAcoCost = function () {
    if (!_acoSvc) return;
    const qty  = parseInt(document.getElementById('acoQty')?.value || 0);
    const cost = qty > 0 ? Math.max(1, Math.round((qty / 1000) * parseFloat(_acoSvc.rate_kes || 0) + 0.99)) : 0;
    const el   = document.getElementById('acoCost');
    if (el) el.textContent = `KES ${cost}`;
  };

  window.adminPlaceOrder = async function () {
    if (!_acoUser || !_acoSvc) { toast('Complete all steps first', 'error'); return; }
    const link  = (document.getElementById('acoLink')?.value || '').trim();
    const qty   = parseInt(document.getElementById('acoQty')?.value || 0);
    const phone = (document.getElementById('acoPhone')?.value || '').trim();
    if (!link)  { toast('Enter a link', 'error'); return; }
    if (qty < 1){ toast('Enter a valid quantity', 'error'); return; }
    if (!phone) { toast('Enter a phone number', 'error'); return; }

    const btn = document.getElementById('acoPlaceBtn');
    btn.textContent = 'Sending STK Push…'; btn.disabled = true;
    _setAcoStatus('waiting', {
      phone, svc: _acoSvc.name, qty,
      cost: document.getElementById('acoCost').textContent
    });

    try {
      const payload = {
        service_id:     _acoSvc.service || _acoSvc.provider_service_id,
        link, quantity: qty, phone,
        target_user_id: _acoUser.id,
      };
      const resp     = await api('/orders', { method: 'POST', body: JSON.stringify(payload) });
      _acoOrderId    = resp.id;
      _acoCheckoutId = resp.checkout_request_id;
      _startAcoPoll();
    } catch (e) {
      toast(e.message || 'Failed to place order', 'error');
      _setAcoStatus('idle');
    } finally {
      btn.textContent = '📱 SEND STK PUSH TO CUSTOMER'; btn.disabled = false;
    }
  };

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
          try { await api(`/orders/${_acoOrderId}/submit`, { method: 'POST' }); } catch (_) {}
          _setAcoStatus('success', { orderId: _acoOrderId });
          loadAdminOrders();
          toast('Order placed & submitted ✓', 'success');
        } else if (s.status === 'failed' || s.status === 'cancelled') {
          _stopAcoPoll();
          _setAcoStatus('failed', { reason: s.result_desc || s.status });
        }
      } catch (_) {}
    }, 5000);
  }

  function _stopAcoPoll() {
    if (_acoPollTimer) { clearInterval(_acoPollTimer); _acoPollTimer = null; }
  }

  // Expose _stopAcoPoll for the cancel button in the status panel HTML
  window._stopAcoPoll = _stopAcoPoll;

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
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--muted);">Quantity</span><span>${parseInt(data.qty || 0).toLocaleString()}</span></div>
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
        <div style="font-size:13px;color:var(--muted);margin-bottom:24px;">Payment confirmed. Order visible in customer's <strong style="color:var(--white);">My Orders</strong> and admin <strong style="color:var(--white);">All Orders</strong>.</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:20px;">Order ID: <code style="color:var(--green);">#${(data.orderId || '').slice(0, 8)}</code></div>
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

  // Expose _setAcoStatus so cancel/retry buttons injected into the DOM can call it
  window._setAcoStatus = _setAcoStatus;

  /* ═══════════════════════════════════════════════════════════════
     BOOT — expose load functions called from navTo() and adminTab()
  ═══════════════════════════════════════════════════════════════ */
  window.loadAdminUsers             = loadAdminUsers;
  window.loadAdminServices          = loadAdminServices;
  window.loadAdminStats             = loadAdminStats;
  window.loadAdminProviders         = loadAdminProviders;
  window.loadAdminSupport           = loadAdminSupport;
  window.loadSavedPricingSettings   = loadSavedPricingSettings;
  window.renderAdminServices        = renderAdminServices;

})();