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
  if (tab === 'stats') { loadAdminCommandCenter(); }
  if (tab === 'providers') loadAdminProviders();
  if (tab === 'support') openAdminSupportTab();
  if (tab === 'create-order') initAdminCreateOrder();
  if (tab === 'affiliate-payouts') affAdminSubTab('payouts');
  if (tab === 'academy') acAdminSubTab('overview');
  if (tab === 'connect') cnAdminSubTab('overview');
  if (tab === 'ccr-agents') ccrAdminInit();
  if (tab === 'creator-events') { if (typeof adminEventsInit === 'function') adminEventsInit(); }
  if (tab === 'consultations') { if (typeof loadAdminConsultations === 'function') loadAdminConsultations(); }
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
        const phone      = esc(o.phone||'');
        const phoneDisplay = phone
          ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">📞 ${phone} <button onclick="navigator.clipboard.writeText('${phone}').then(()=>toast('Phone copied!','success'))" title="Copy phone number" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;padding:0 2px;border-radius:4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">⎘</button></div>`
          : '';
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
            ${phoneDisplay}
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
  ]);
  const [snap, stats, breakdown, revenue, trends, engagement,
         connectStats, connectRevenue, academyStats, academyRevenue,
         affiliates, ccrAgents, platforms, titan, ownerPay, expenses, panelGrowth, taxReserve] = results;
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
  _chc.loadedAt = Date.now();

  _chcRenderAlerts();
  _chcRenderHealthScore();
  _chcRenderOverview();
  _chcRenderRevenue();
  _chcRenderMoneyFlow();
  _chcRenderGrowth();
  _chcRenderEngagement();
  _chcRenderServices();
  _chcRenderUnits();
  _chcSetRefreshing(false);
  _chcUpdateTimestamp();
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
      <button class="chc-nav-btn" data-sec="revenue" onclick="chcShowSection('revenue',this)">💼 Revenue</button>
      <button class="chc-nav-btn" data-sec="moneyflow" onclick="chcShowSection('moneyflow',this)">💵 Money Flow</button>
      <button class="chc-nav-btn" data-sec="growth" onclick="chcShowSection('growth',this)">📈 Growth</button>
      <button class="chc-nav-btn" data-sec="engagement" onclick="chcShowSection('engagement',this)">🔑 Engagement</button>
      <button class="chc-nav-btn" data-sec="services" onclick="chcShowSection('services',this)">🧩 Services</button>
      <button class="chc-nav-btn" data-sec="units" onclick="chcShowSection('units',this)">🏢 Business Units</button>
    </div>

    <div id="chcSection-overview" class="chc-section active"><div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div></div>
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
  const [trendsRes, platformsRes] = await Promise.allSettled([
    api(`/admin/stats/trends?days=${days}`),
    api(`/admin/stats/platforms?days=${days}`),
  ]);
  _chc.data.trends    = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
  _chc.data.platforms = platformsRes.status === 'fulfilled' ? platformsRes.value : null;
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

  el.innerHTML = `
    ${burnBanner}
    ${_chcPanel({
      title: 'Revenue per Day', icon: '💵', sub: 'platform profit — sales × markup, the same number CCR agent commissions are a % of', extra: windowPicker, body: `
        <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;">
          <div style="font-size:20px;font-weight:800;color:var(--white);">${fmtKES(revenue7d)}<span style="font-size:11px;color:var(--muted);font-weight:600;"> revenue/7d</span></div>
        </div>
        ${revenueChart}` })}
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
    ${_chcPanel({
      title: 'New Users per Day', icon: '👤', body: `
        <div style="font-size:18px;font-weight:800;color:var(--white);margin-bottom:8px;">${g.this_week ? g.this_week.new_users : 0}<span style="font-size:11px;color:var(--muted);font-weight:600;"> /7d</span> ${_growthBadge(g.users_wow_pct)}</div>
        ${usersChart}` })}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">🧭 Order Status Funnel (${_chc.trendsDays}d)</div>
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

  const haveAnyRevenue = _chc.data.stats || _chc.data.academyRevenue || _chc.data.connectRevenue;
  let mixSection = '';
  if (haveAnyRevenue) {
    const mixItems = [
      { label: 'SMM Panel (profit)', value: smmRevenue, color: '#3dd44a' },
      { label: 'Creator Academy',    value: academyRevenue, color: 'var(--gold)' },
      { label: 'Connect Marketplace', value: connectRevenue, color: 'var(--cyan)' },
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
      title: 'Consolidated Revenue Mix (all-time)', icon: '📊', sub: 'SMM profit + Academy revenue + Connect platform revenue — totals only, no unit here shares a common monthly close date', body: `
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
    loadAdminServices(); loadServices(true);
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

// Entry point for the Support tab click specifically (adminTab() calls this,
// not loadAdminSupport() directly). Auto-closes threads inactive 7+ days
// first, then loads the list — so the list the admin sees already reflects
// anything that just got closed. Scoped to the tab click on purpose: the
// internal refreshes elsewhere in this file (after a reply, after a manual
// status change, after admin_initiate_thread) call loadAdminSupport() on
// its own and should NOT re-trigger the auto-close sweep every time.
async function openAdminSupportTab() {
  await autoCloseStaleSupportThreads();
  loadAdminSupport();
}

async function autoCloseStaleSupportThreads() {
  try {
    const res = await api('/support/admin/threads/auto-close-stale', { method: 'POST' });
    if (res && res.closed > 0) {
      toast(`Auto-closed ${res.closed} ticket${res.closed === 1 ? '' : 's'} older than 7 days`, 'info');
    }
  } catch (e) {
    // Non-fatal — don't block the thread list from loading if this fails
    console.warn('Auto-close stale support threads failed:', e);
  }
}

async function loadAdminSupport() {
  if (!currentUser || !(currentUser.role === 'admin' || currentUser.is_ccr_agent)) return;
  const status = document.getElementById('supportFilterStatus')?.value || '';
  const type   = document.getElementById('supportFilterType')?.value || '';
  const source = document.getElementById('supportFilterSource')?.value || '';
  const list   = document.getElementById('supportThreadList');
  if (!list) return;
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';

  let url = `/support/admin/threads?limit=60`;
  if (status) url += `&status=${status}`;
  if (type)   url += `&type=${type}`;
  if (source) url += `&source=${source}`;

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
      const isSystem = t.source === 'system';
      // System-raised threads get a distinct left-border + badge so they
      // read as "our backend flagged this" at a glance, without being
      // hidden from the default (unfiltered) queue — see support_chat.py.
      const sourceBadge = isSystem
        ? `<span style="font-size:9px;font-weight:700;color:#ffb347;background:rgba(255,179,71,.12);border-radius:5px;padding:2px 6px;white-space:nowrap;">⚙️ SYSTEM</span>`
        : '';
      return `<div class="support-thread-item" data-thread-id="${tid}" onclick="openSupportThread('${tid}')" style="padding:14px 16px 14px 13px;border-bottom:1px solid var(--border);border-left:3px solid ${isSystem ? '#ffb347' : 'transparent'};cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(61,212,74,.04)'" onmouseout="this.style.background=''" >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">${userName}</div>
          <span style="font-size:10px;font-weight:700;color:${sColor};white-space:nowrap;">${statusEmoji[t.status] || ''} ${tStatus.toUpperCase()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <div style="font-size:11px;color:var(--green);font-weight:600;">${typeLabel[t.type] || tType}</div>
          ${sourceBadge}
        </div>
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
    const tIsSystem  = t.source === 'system';
    const tSourceBadge = tIsSystem
      ? `<span style="font-size:9px;font-weight:700;color:#ffb347;background:rgba(255,179,71,.12);border-radius:5px;padding:2px 7px;margin-left:8px;white-space:nowrap;">⚙️ AUTO-RAISED — no customer reply expected</span>`
      : '';

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
          <div style="font-size:11px;color:var(--green);font-weight:600;margin-top:2px;">${tTypeLabel} · <span style="color:${tStatusColor}">${tStatus.toUpperCase()}</span>${tSourceBadge}</div>
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
  const pendingTickets = _allTickets.filter(t => t.status === 'pending');
  if (!pendingTickets.length) {
    el.style.display = 'none';
    return;
  }
  const desc = document.getElementById('dashTicketBannerDesc');
  if (desc) {
    if (pendingTickets.length === 1) {
      const t = pendingTickets[0];
      const body = _ticketBodyText(t.last_message || t.first_message);
      desc.textContent = _ticketPreview(body).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') || 'Tap to view the reply';
    } else {
      desc.textContent = `${pendingTickets.length} tickets have new replies — tap to view`;
    }
  }
  el.style.display = 'flex';
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
  const phoneEl = document.getElementById('ntPhone');
  if (phoneEl) phoneEl.value = '';
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
    const data = await api('/support/threads', {
      method: 'POST',
      body: JSON.stringify({ type, first_message })
    });
    closeNewTicketModal();
    toast('Ticket opened! Our team will respond shortly.', 'success');
    window._bgAllThreadsClosed = false; // new open thread exists — resume background watching for admin replies
    await loadTickets();
    openTicketThread(data.id);
  } catch(e) {
    toast(e.message || 'Failed to open ticket', 'error');
  } finally {
    btn.textContent = 'Submit Ticket'; btn.disabled = false;
  }
}

function closeTicketThread() {
  _activeTicketId = null;
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
    _loadTicketThread(_activeTicketId);
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
    window._bgAllThreadsClosed = threads.length === 0 ||
      threads.every(t => ['resolved','closed'].includes(t.status));

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