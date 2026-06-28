/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — ADMIN AFFILIATE PANEL  v2.0
 *
 * Sub-tabs: Payout Queue | Leaderboard | Referrals
 *
 * Depends on: api(), toast(), fmtKES(), esc()  — globals from index.html / admin.js
 * Entry point: affAdminSubTab(tab)  — called from adminTab() in admin.js
 *
 * BUGS FIXED vs v1.0:
 *  1. affAdminOpenDisburse() passed name/phone via inline onclick string — quotes
 *     in names broke the HTML attribute. Fixed: uses data-* attributes.
 *  2. affCommissionOpen() same issue with email/name containing quotes.
 *     Fixed: uses data-* attributes set before showing modal.
 *  3. _affAdminBuildQueue() matched affiliate context by `user_email` which
 *     is not guaranteed unique when admin lists payouts — wrong affiliate shown.
 *     Fixed: match by affiliate_id field returned from the payouts API.
 *  4. adminLoadAffiliateLeaderboard() fetched from /affiliate/admin/affiliates
 *     but also wrote _affAdminLeaderCache, clobbering the payouts-tab cache.
 *     Fixed: leaderboard tab uses its own cache variable.
 *  5. affAdminConfirmReject() silently accepted empty reason if user cleared
 *     the field after initial validation — added second guard.
 *  6. Filter buttons called _affAdminSetQueueFilter with string arg but also
 *     re-rendered the entire queue section on each click. Fixed: only re-renders
 *     the table, not the stats cards.
 *  7. Search box in referrals tab fired on Enter key but onkeydown triggered
 *     before the keyup that commits the character — switched to keyup.
 *  8. Edit% button in leaderboard tab called affCommissionOpen with positional
 *     string args that broke on special chars in name/email (XSS risk).
 *     Fixed: data-* attribute approach throughout.
 *  9. adminLoadAffiliatePayouts fetched both affiliates and payouts in parallel
 *     but rendered stats from _affAdminLeaderCache (affiliates) which could be
 *     stale from a prior leaderboard load. Fixed: each tab has its own cache.
 * 10. affAdminConfirmDisburse sent `amount_sent` as a number but backend
 *     Pydantic schema required Decimal — now sends as string to preserve
 *     precision on large amounts.
 * ════════════════════════════════════════════════════════════════════ */

// ─── Per-tab cache variables ──────────────────────────────────────────────────
// FIX: Separated caches so leaderboard loads don't corrupt payouts tab state
let _affPayoutsAffiliateCache = [];   // affiliates fetched for payouts tab
let _affAdminPayoutCache      = [];   // payouts list
let _affAdminLeaderCache      = [];   // affiliates fetched for leaderboard tab
let _affAdminPayoutFilter     = 'pending';
let _affAdminLeaderSort       = 'earned';
let _affAdminLeaderDir        = -1;
let _affAdminLeaderSearch     = '';
let _affAdminCurrentSubTab    = 'payouts';

// Disburse / reject state
let _affPayoutDisburseId = null;

// ─── Tier helper ──────────────────────────────────────────────────────────────
const _ADMIN_AFF_TIERS = [
  { name:'Starter', min:0,      badge:'🌱', color:'#7a8fad' },
  { name:'Bronze',  min:5000,   badge:'🥉', color:'#cd7f32' },
  { name:'Silver',  min:25000,  badge:'🥈', color:'#a8adb4' },
  { name:'Gold',    min:100000, badge:'🥇', color:'#ffd700' },
  { name:'Diamond', min:500000, badge:'💎', color:'#3dd44a' },
];
function _adminAffTier(spend) {
  let t = _ADMIN_AFF_TIERS[0];
  for (const tier of _ADMIN_AFF_TIERS) { if ((spend||0) >= tier.min) t = tier; }
  return t;
}

// ─── Sub-tab switcher ─────────────────────────────────────────────────────────
function affAdminSubTab(tab) {
  _affAdminCurrentSubTab = tab;

  ['payouts','leaderboard','referrals'].forEach(t => {
    const el = document.getElementById('affSubTab-' + t);
    if (!el) return;
    el.style.borderBottomColor = t === tab ? 'var(--green)' : 'transparent';
    el.style.color             = t === tab ? 'var(--green)' : 'var(--muted)';
  });

  ['payouts','leaderboard','referrals'].forEach(t => {
    const p = document.getElementById('affAdminPane-' + t);
    if (p) p.style.display = t === tab ? '' : 'none';
  });

  const titleEl    = document.getElementById('affAdminPanelTitle');
  const subEl      = document.getElementById('affAdminPanelSub');
  const refreshBtn = document.getElementById('affAdminRefreshBtn');

  if (tab === 'payouts') {
    if (titleEl)    titleEl.textContent = '💸 AFFILIATE PAYOUTS';
    if (subEl)      subEl.textContent   = 'Record M-Pesa disbursements — balance updates automatically';
    if (refreshBtn) { refreshBtn.onclick = () => adminLoadAffiliatePayouts(); refreshBtn.textContent = '↻ Refresh'; }
    adminLoadAffiliatePayouts();
  } else if (tab === 'leaderboard') {
    if (titleEl)    titleEl.textContent = '🏆 AFFILIATE LEADERBOARD';
    if (subEl)      subEl.textContent   = 'All affiliates ranked by earnings';
    if (refreshBtn) { refreshBtn.onclick = () => adminLoadAffiliateLeaderboard(); refreshBtn.textContent = '↻ Refresh'; }
    adminLoadAffiliateLeaderboard();
  } else {
    if (titleEl)    titleEl.textContent = '👥 AFFILIATE REFERRALS';
    if (subEl)      subEl.textContent   = 'Users who signed up via an affiliate link';
    if (refreshBtn) { refreshBtn.onclick = () => adminLoadAffiliateReferrals(); refreshBtn.textContent = '↻ Refresh'; }
    adminLoadAffiliateReferrals();
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function _affSafeFetch(path, label, warnings) {
  try { return await api(path); }
  catch (e) { warnings.push(`${label}: ${e.message || 'failed'}`); return null; }
}

function _affWarnBanner(warnings, retryFn) {
  const banner = document.createElement('div');
  banner.style.cssText = 'background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:10px;padding:10px 16px;margin-bottom:16px;font-size:12px;color:#ff6b6b;display:flex;align-items:center;gap:10px;';
  banner.innerHTML = `<span style="font-size:16px;">⚠️</span><span><strong>Could not reach backend:</strong> ${warnings.map(esc).join(' · ')}<br><span style="color:var(--muted);">Showing zeros. <button onclick="${retryFn}()" style="background:none;border:none;color:#ff9a3c;font-size:12px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;padding:0;">Retry</button></span></span>`;
  return banner;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: PAYOUT QUEUE
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAffiliatePayouts() {
  const container = document.getElementById('adminAffiliatePayouts');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading payout data…</span></div>`;

  const warnings = [];
  // FIX: Use separate cache for payouts tab
  const [affResp, payResp] = await Promise.all([
    _affSafeFetch('/affiliate/admin/affiliates?limit=500', 'Affiliates', warnings),
    _affSafeFetch('/affiliate/admin/payouts?status=all&limit=500', 'Payouts', warnings),
  ]);

  _affPayoutsAffiliateCache = affResp?.affiliates || [];
  _affAdminPayoutCache      = payResp?.payouts    || [];

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_affWarnBanner(warnings, 'adminLoadAffiliatePayouts'));

  try {
    container.appendChild(_affAdminBuildStats());
    container.appendChild(_affAdminBuildQueue());
  } catch (renderErr) {
    console.error('[adminLoadAffiliatePayouts] render error:', renderErr);
    const d = document.createElement('div');
    d.style.cssText = 'color:#ff6b6b;padding:20px;background:rgba(255,69,69,.08);border:1px solid rgba(255,69,69,.25);border-radius:10px;margin-top:12px;font-size:13px;';
    d.innerHTML = `<strong>Render error:</strong> ${esc(renderErr.message)}`;
    container.appendChild(d);
  }
}

// ── Stats cards ───────────────────────────────────────────────────────────────
function _affAdminBuildStats() {
  // FIX: Use payouts-tab affiliate cache, not leaderboard cache
  const af = _affPayoutsAffiliateCache;
  const py = _affAdminPayoutCache;

  const totalAff     = af.length;
  const activeAff    = af.filter(a => (a.total_referrals||0) > 0).length;
  const totalRefs    = af.reduce((s,a) => s+(a.total_referrals||0), 0);
  const totalEarned  = af.reduce((s,a) => s+(a.total_earned_kes||0), 0);
  const totalPending = af.reduce((s,a) => s+(a.pending_kes||0), 0);
  const totalPaid    = af.reduce((s,a) => s+(a.paid_kes||0), 0);
  const totalSpend   = af.reduce((s,a) => s+(a.referral_spend_kes||0), 0);
  const pendingPay   = py.filter(p => p.status==='pending');
  const pendingCount = pendingPay.length;
  const pendingKes   = pendingPay.reduce((s,p) => s+(p.amount_kes||0), 0);

  const tierCounts = {};
  for (const a of af) {
    const t = _adminAffTier(a.referral_spend_kes||0);
    tierCounts[t.name] = (tierCounts[t.name]||0) + 1;
  }

  const cards = [
    { icon:'🤝', label:'Total Affiliates',  value: totalAff,            sub:`${activeAff} with referrals`,        color:'#3dd44a' },
    { icon:'👥', label:'Total Referrals',   value: totalRefs,           sub:'signed up via affiliate links',      color:'#3dd44a' },
    { icon:'🛒', label:'Referral Spend',    value: fmtKES(totalSpend),  sub:'spend by referred users',            color:'#ffd700' },
    { icon:'💰', label:'Total Commissions', value: fmtKES(totalEarned), sub:'15% of all referral spend',          color:'#ffd700' },
    { icon:'⏳', label:'Pending Balance',   value: fmtKES(totalPending),sub:'awaiting withdrawal requests',       color:'#ff9a3c' },
    { icon:'✅', label:'Total Paid Out',    value: fmtKES(totalPaid),   sub:'M-Pesa disbursements made',          color:'#3dd44a' },
    { icon:'📬', label:'Pending Requests',  value: pendingCount,         sub:`${fmtKES(pendingKes)} to disburse`, color: pendingCount > 0 ? '#ff6b6b' : '#3dd44a' },
  ];

  const tierHtml = _ADMIN_AFF_TIERS.map(t =>
    `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
       <span style="font-size:13px;">${t.badge}</span>
       <span style="font-size:11px;color:${t.color};font-weight:700;flex:1;">${t.name}</span>
       <span style="font-size:13px;font-weight:800;color:var(--white);">${tierCounts[t.name]||0}</span>
     </div>`
  ).join('');

  const el = document.createElement('div');
  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">📊 PROGRAMME OVERVIEW</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:28px;">
      ${cards.map(c => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
          <div style="font-size:20px;margin-bottom:6px;">${c.icon}</div>
          <div style="font-size:${typeof c.value==='number'?'24px':'18px'};font-weight:900;color:${c.color};line-height:1.1;">
            ${typeof c.value==='number' ? c.value.toLocaleString() : c.value}
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--white);margin-top:5px;">${c.label}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${c.sub}</div>
        </div>`).join('')}
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;">
        <div style="font-size:20px;margin-bottom:8px;">🏅</div>
        <div style="font-size:11px;font-weight:700;color:var(--white);margin-bottom:8px;letter-spacing:.5px;">TIER BREAKDOWN</div>
        ${tierHtml}
      </div>
    </div>`;
  return el;
}

// ── Payout queue ──────────────────────────────────────────────────────────────
function _affAdminBuildQueue() {
  const el = document.createElement('div');
  el.id = '_affAdminQueueWrap';
  _affAdminRenderQueue(el);
  return el;
}

function _affAdminRenderQueue(wrap) {
  const filter  = _affAdminPayoutFilter;
  const all     = _affAdminPayoutCache;
  const payouts = filter === 'all' ? all : all.filter(p => p.status === filter);
  const countOf = s => all.filter(p => p.status === s).length;
  const pendingCount = countOf('pending');

  const filterBtns = ['pending','paid','rejected','all'].map(s => {
    const active = s === filter;
    const count  = s === 'all' ? all.length : countOf(s);
    return `<button onclick="_affAdminSetQueueFilter('${s}')"
      style="font-size:12px;padding:7px 16px;border-radius:8px;border:1px solid var(--border);
             background:${active?'var(--green)':'var(--navy)'};
             color:${active?'#000':'var(--muted)'};
             font-weight:${active?'800':'500'};cursor:pointer;position:relative;font-family:'Montserrat',sans-serif;">
      ${s.charAt(0).toUpperCase()+s.slice(1)}
      ${count>0&&s!=='all'?`<span style="background:${s==='pending'?'rgba(255,69,69,.9)':'rgba(122,143,173,.3)'};color:${s==='pending'?'#fff':'var(--muted)'};border-radius:10px;font-size:10px;font-weight:800;padding:1px 5px;margin-left:5px;">${count}</span>`:''}
    </button>`;
  }).join('');

  // FIX: Build affiliate lookup map by affiliate_id (not user_email which is not unique)
  const affById = {};
  for (const a of _affPayoutsAffiliateCache) {
    affById[String(a.id)] = a;
  }

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">💸 PAYOUT QUEUE</div>
      ${pendingCount > 0 ? `<span style="background:rgba(255,69,69,.12);border:1px solid rgba(255,69,69,.3);color:#ff6b6b;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">${pendingCount} pending</span>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">${filterBtns}</div>
    ${!payouts.length
      ? `<div style="padding:40px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:14px;">
           <div style="font-size:36px;margin-bottom:10px;">${filter==='pending'?'✅':'📭'}</div>
           <div style="font-size:14px;">No ${filter} payout requests</div>
         </div>`
      : `<div class="tbl-wrap"><table>
          <thead><tr>
            <th>Affiliate</th><th>Requested</th><th>Sent</th>
            <th>M-Pesa #</th><th>Requested At</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${payouts.map(p => {
              const st  = p.status||'pending';
              const cls = st==='paid'?'completed':st==='rejected'?'failed':'pending';
              // FIX: Match by affiliate_id, not user_email
              const aff  = affById[String(p.affiliate_id)] || {};
              const tier = _adminAffTier(aff.referral_spend_kes||0);
              // FIX: Use data-* attributes for safe name/phone passing
              const safeId    = esc(p.id||'');
              const safeName  = esc(p.user_name||'');
              const safePhone = esc(p.mpesa_phone||'');
              const safeAmt   = Number(p.amount_kes||0);
              return `<tr>
                <td>
                  <div style="font-weight:700;">${esc(p.user_name||'—')}</div>
                  <div style="font-size:10px;color:var(--muted);">${esc(p.user_email||'—')}</div>
                  <div style="margin-top:3px;">
                    <span style="font-size:11px;">${tier.badge}</span>
                    <span style="font-size:10px;color:${tier.color};font-weight:700;">${tier.name}</span>
                    ${aff.total_referrals ? `<span style="font-size:10px;color:var(--muted);margin-left:5px;">· ${aff.total_referrals} refs</span>` : ''}
                    ${aff.total_earned_kes ? `<span style="font-size:10px;color:var(--green);margin-left:5px;">· ${fmtKES(aff.total_earned_kes)} earned</span>` : ''}
                  </div>
                </td>
                <td style="font-weight:800;color:var(--green);white-space:nowrap;">${fmtKES(p.amount_kes)}</td>
                <td style="white-space:nowrap;">
                  ${p.amount_sent_kes!=null ? `<span style="color:var(--white);font-weight:700;">${fmtKES(p.amount_sent_kes)}</span>` : `<span style="color:var(--muted);font-size:12px;">—</span>`}
                </td>
                <td style="font-family:monospace;font-size:13px;">${esc(p.mpesa_phone||'—')}</td>
                <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${p.requested_at?new Date(p.requested_at).toLocaleString('en-KE'):'—'}</td>
                <td>
                  <span class="status-pill ${cls}">${st}</span>
                  ${p.mpesa_receipt?`<div style="font-size:10px;color:var(--muted);margin-top:2px;">Rcpt: ${esc(p.mpesa_receipt)}</div>`:''}
                  ${p.admin_note?`<div style="font-size:10px;color:#ff9a3c;margin-top:2px;">${esc(p.admin_note)}</div>`:''}
                  ${p.processed_at?`<div style="font-size:10px;color:var(--muted);margin-top:2px;">${new Date(p.processed_at).toLocaleDateString('en-KE')}</div>`:''}
                </td>
                <td>
                  ${st==='pending'
                    ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button
                          data-pid="${safeId}"
                          data-name="${safeName}"
                          data-phone="${safePhone}"
                          data-amt="${safeAmt}"
                          onclick="affAdminOpenDisburse(this)"
                          style="background:var(--green);color:#000;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;">
                          💸 Disburse
                        </button>
                        <button
                          data-pid="${safeId}"
                          onclick="affAdminReject(this)"
                          style="background:rgba(255,69,69,.12);color:#ff6b6b;border:1px solid rgba(255,69,69,.3);border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;">
                          ✗ Reject
                        </button>
                      </div>`
                    : `<span style="color:var(--muted);font-size:12px;">—</span>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`
    }`;
}

function _affAdminSetQueueFilter(f) {
  _affAdminPayoutFilter = f;
  const wrap = document.getElementById('_affAdminQueueWrap');
  if (wrap) _affAdminRenderQueue(wrap);
}

// ── Disburse modal ─────────────────────────────────────────────────────────────
// FIX: Was passing name/phone as inline onclick string args — broke on quotes.
// Now reads from data-* attributes on the button element.
function affAdminOpenDisburse(btn) {
  const id   = btn.dataset.pid;
  const name = btn.dataset.name;
  const phone = btn.dataset.phone;
  const amt  = parseFloat(btn.dataset.amt || 0);

  _affPayoutDisburseId = id;

  document.getElementById('affDisburseAffiliateName').textContent = name  || '—';
  document.getElementById('affDisbursePhone').textContent         = phone || '—';
  document.getElementById('affDisburseRequested').textContent     = `KES ${Number(amt).toLocaleString()}`;
  document.getElementById('affDisburseSentAmount').value          = amt;
  document.getElementById('affDisburseReceipt').value             = '';
  document.getElementById('affDisburseNote').value                = '';
  document.getElementById('affDisburseErr').style.display         = 'none';

  const saveBtn = document.getElementById('affDisburseSaveBtn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Confirm & Save'; }

  document.getElementById('affAdminDisburseModal').style.display = 'flex';
}

function affAdminCloseDisburse() {
  document.getElementById('affAdminDisburseModal').style.display = 'none';
  _affPayoutDisburseId = null;
}

async function affAdminConfirmDisburse() {
  if (!_affPayoutDisburseId) return;
  const amountSent = parseFloat(document.getElementById('affDisburseSentAmount').value);
  const receipt    = document.getElementById('affDisburseReceipt').value.trim();
  const note       = document.getElementById('affDisburseNote').value.trim();
  const errEl      = document.getElementById('affDisburseErr');
  errEl.style.display = 'none';

  if (!amountSent || amountSent <= 0) {
    errEl.textContent = 'Enter the amount you actually sent.'; errEl.style.display = 'block'; return;
  }

  const btn = document.getElementById('affDisburseSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    // FIX: Send amount_sent as string to preserve precision for Pydantic Decimal parsing
    await api(`/affiliate/admin/payouts/${_affPayoutDisburseId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        amount_sent:   String(amountSent.toFixed(2)),
        mpesa_receipt: receipt || null,
        note:          note    || null,
      }),
    });
    affAdminCloseDisburse();
    toast(`Payout recorded — KES ${amountSent.toLocaleString()} sent ✅`, 'success');
    adminLoadAffiliatePayouts();
  } catch (e) {
    errEl.textContent = e.message || 'Failed to save disbursement.'; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Confirm & Save';
  }
}

// ── Reject modal ───────────────────────────────────────────────────────────────
// FIX: Was passing payoutId as positional string arg — could collide with quotes.
// Now reads from button's data-pid attribute.
function affAdminReject(btn) {
  _affPayoutDisburseId = btn.dataset.pid;
  document.getElementById('affAdminRejectReason').value        = '';
  document.getElementById('affAdminRejectErr').style.display   = 'none';
  const rejectBtn = document.getElementById('affAdminRejectBtn');
  if (rejectBtn) { rejectBtn.disabled = false; rejectBtn.textContent = 'Confirm Reject'; }
  document.getElementById('affAdminRejectModal').style.display = 'flex';
}

function affAdminCloseReject() {
  document.getElementById('affAdminRejectModal').style.display = 'none';
  _affPayoutDisburseId = null;
}

async function affAdminConfirmReject() {
  const reason = document.getElementById('affAdminRejectReason').value.trim();
  const errEl  = document.getElementById('affAdminRejectErr');
  errEl.style.display = 'none';

  if (!reason || reason.length < 5) {
    errEl.textContent = 'Please enter a reason (at least 5 characters).'; errEl.style.display = 'block'; return;
  }
  if (!_affPayoutDisburseId) {
    errEl.textContent = 'No payout selected. Please close and try again.'; errEl.style.display = 'block'; return;
  }

  const btn = document.getElementById('affAdminRejectBtn');
  btn.disabled = true; btn.textContent = 'Rejecting…';

  try {
    await api(`/affiliate/admin/payouts/${_affPayoutDisburseId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    affAdminCloseReject();
    toast('Payout request rejected.', 'success');
    adminLoadAffiliatePayouts();
  } catch (e) {
    errEl.textContent = e.message || 'Rejection failed.'; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Confirm Reject';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAffiliateLeaderboard() {
  const container = document.getElementById('adminAffiliateLeaderboard');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading leaderboard…</span></div>`;

  const warnings = [];
  // FIX: Separate cache — doesn't clobber payouts tab's affiliate cache
  const resp = await _affSafeFetch('/affiliate/admin/affiliates?limit=500', 'Affiliates', warnings);
  _affAdminLeaderCache = resp?.affiliates || [];

  container.innerHTML = '';
  if (warnings.length) container.appendChild(_affWarnBanner(warnings, 'adminLoadAffiliateLeaderboard'));

  try {
    const wrap = document.createElement('div');
    wrap.id = '_affAdminLeaderWrap';
    _affAdminRenderLeaderboard(wrap);
    container.appendChild(wrap);
  } catch (e) {
    container.innerHTML = `<div style="color:#ff6b6b;padding:20px;">${esc(e.message)}</div>`;
  }
}

function _affAdminRenderLeaderboard(wrap) {
  const key      = _affAdminLeaderSort;
  const dir      = _affAdminLeaderDir;
  const q        = (_affAdminLeaderSearch || '').toLowerCase().trim();

  const filtered = q
    ? _affAdminLeaderCache.filter(a =>
        (a.user_email    || '').toLowerCase().includes(q) ||
        (a.user_name     || '').toLowerCase().includes(q) ||
        (a.referral_code || '').toLowerCase().includes(q))
    : _affAdminLeaderCache;

  const sorted = [...filtered].sort((a, b) => {
    const vals = {
      earned:    [a.total_earned_kes,   b.total_earned_kes],
      referrals: [a.total_referrals,    b.total_referrals],
      spend:     [a.referral_spend_kes, b.referral_spend_kes],
      pending:   [a.pending_kes,        b.pending_kes],
    };
    const [av, bv] = vals[key] || [0,0];
    return dir * ((bv||0) - (av||0));
  });

  const sBtn = (k, label) => {
    const active = key === k;
    return `<button onclick="_affAdminSortLeader('${k}')"
      style="background:${active?'rgba(61,212,74,.15)':'var(--navy)'};
             border:1px solid ${active?'rgba(61,212,74,.4)':'var(--border)'};
             color:${active?'var(--green)':'var(--muted)'};
             border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;
             cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;">
      ${label}${active?(dir===-1?' ↓':' ↑'):''}
    </button>`;
  };

  const medal = i => i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;

  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">
      🏆 ALL AFFILIATES (${filtered.length}${q ? ' of '+_affAdminLeaderCache.length : ''})
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">
      <input id="affLeaderSearch" type="text" value="${esc(q)}" placeholder="Search by email, name or code…"
        oninput="_affAdminLeaderSearchInput(this.value)"
        style="flex:1;min-width:200px;max-width:320px;background:var(--navy);border:1px solid var(--border);
               border-radius:8px;padding:7px 12px;font-size:12px;color:var(--white);font-family:'Montserrat',sans-serif;outline:none;">
      <span style="font-size:11px;color:var(--muted);margin-left:4px;">Sort:</span>
      ${sBtn('earned','💰 Earned')} ${sBtn('referrals','👥 Referrals')} ${sBtn('spend','🛒 Spend')} ${sBtn('pending','⏳ Pending')}
    </div>
    ${!sorted.length
      ? `<div style="padding:32px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:14px;">
           ${q ? `No affiliates matching <strong style="color:var(--white);">"${esc(q)}"</strong>` : 'No affiliates yet.'}
         </div>`
      : `<div class="tbl-wrap"><table>
          <thead><tr>
            <th>#</th><th>Affiliate</th><th>Tier</th><th>Code</th>
            <th>Referrals</th><th>Ref. Spend</th><th>Total Earned</th>
            <th>Pending</th><th>Paid Out</th><th>Rate</th><th>Joined</th><th></th>
          </tr></thead>
          <tbody>
            ${sorted.map((a,i) => {
              const tier     = _adminAffTier(a.referral_spend_kes||0);
              const pend     = a.pending_kes||0;
              const joined   = a.created_at ? new Date(a.created_at).toLocaleDateString('en-KE') : '—';
              const rate     = a.commission_rate || 0.15;
              const isCustom = Math.abs(rate - 0.15) > 0.0001;
              // FIX: Use data-* attributes for safe passing to affCommissionOpen
              return `<tr>
                <td style="font-weight:800;color:${i<3?'#ffd700':'var(--muted)'};">${medal(i)}</td>
                <td>
                  <div style="font-weight:700;">${esc(a.user_name||'—')}</div>
                  <div style="font-size:10px;color:var(--muted);">${esc(a.user_email||'—')}</div>
                </td>
                <td>
                  <span style="font-size:13px;">${tier.badge}</span>
                  <span style="font-size:11px;color:${tier.color};font-weight:700;margin-left:4px;">${tier.name}</span>
                </td>
                <td style="font-family:monospace;font-size:11px;color:var(--muted);">${esc(a.referral_code||'—')}</td>
                <td style="font-weight:700;text-align:center;">${(a.total_referrals||0).toLocaleString()}</td>
                <td style="color:var(--muted);font-size:13px;">${fmtKES(a.referral_spend_kes||0)}</td>
                <td style="font-weight:800;color:var(--green);">${fmtKES(a.total_earned_kes||0)}</td>
                <td style="font-weight:700;color:${pend>0?'#ff9a3c':'var(--muted)'};">${fmtKES(pend)}</td>
                <td style="color:var(--muted);font-size:13px;">${fmtKES(a.paid_kes||0)}</td>
                <td>
                  <span style="font-size:12px;color:${isCustom?'#ffd700':'var(--muted)'};font-weight:${isCustom?'800':'400'};">
                    ${(rate*100).toFixed(0)}%${isCustom?' ★':''}
                  </span>
                </td>
                <td style="font-size:11px;color:var(--muted);">${joined}</td>
                <td>
                  <button
                    data-profile-id="${esc(a.id||'')}"
                    data-name="${esc(a.user_name||'')}"
                    data-email="${esc(a.user_email||'')}"
                    data-rate="${rate}"
                    onclick="affCommissionOpen(this)"
                    style="background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.25);color:#ffd700;
                           border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;
                           cursor:pointer;white-space:nowrap;font-family:'Montserrat',sans-serif;">
                    ✏️ Edit %
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`
    }`;
}

function _affAdminSortLeader(key) {
  if (_affAdminLeaderSort === key) { _affAdminLeaderDir *= -1; }
  else { _affAdminLeaderSort = key; _affAdminLeaderDir = -1; }
  const wrap = document.getElementById('_affAdminLeaderWrap');
  if (wrap) _affAdminRenderLeaderboard(wrap);
}

function _affAdminLeaderSearchInput(val) {
  _affAdminLeaderSearch = val;
  const wrap = document.getElementById('_affAdminLeaderWrap');
  if (wrap) _affAdminRenderLeaderboard(wrap);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: REFERRALS
// ══════════════════════════════════════════════════════════════════════════════

async function adminLoadAffiliateReferrals(search = '') {
  const container = document.getElementById('adminAffiliateReferrals');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading referrals…</span></div>`;

  try {
    const qs   = search ? `?search=${encodeURIComponent(search)}&limit=200` : '?limit=200';
    const resp = await api('/affiliate/admin/referrals' + qs);

    const referrals = resp.referrals || [];
    const total     = resp.total     || referrals.length;

    const totalSpend      = referrals.reduce((s, r) => s + (r.total_spend_kes || 0), 0);
    const totalCommission = referrals.reduce((s, r) => s + (r.commission_earned_kes || 0), 0);
    const totalOrders     = referrals.reduce((s, r) => s + (r.order_count || 0), 0);

    const summaryHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px;">TOTAL REFERRED</div>
          <div style="font-size:26px;font-weight:900;color:var(--white);">${total}</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px;">TOTAL SPEND</div>
          <div style="font-size:22px;font-weight:900;color:var(--green);">${fmtKES(totalSpend)}</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px;">COMMISSIONS EARNED</div>
          <div style="font-size:22px;font-weight:900;color:#ffd700;">${fmtKES(totalCommission)}</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px;">ORDERS PLACED</div>
          <div style="font-size:26px;font-weight:900;color:var(--white);">${totalOrders.toLocaleString()}</div>
        </div>
      </div>`;

    // FIX: search fires on keyup (not keydown) so the character is committed
    const searchBar = `
      <div style="margin-bottom:16px;display:flex;gap:10px;align-items:center;">
        <input id="affReferralsSearch" type="text" placeholder="Search by name, email or affiliate code…"
          value="${esc(search)}"
          onkeyup="if(event.key==='Enter')adminLoadAffiliateReferrals(this.value.trim())"
          style="flex:1;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:9px 14px;font-size:13px;color:var(--white);outline:none;">
        <button onclick="adminLoadAffiliateReferrals(document.getElementById('affReferralsSearch').value.trim())"
          class="btn-secondary" style="font-size:12px;padding:9px 16px;">🔍 Search</button>
        ${search ? `<button onclick="adminLoadAffiliateReferrals('')" class="btn-secondary" style="font-size:12px;padding:9px 14px;">✕ Clear</button>` : ''}
      </div>`;

    if (!referrals.length) {
      container.innerHTML = summaryHtml + searchBar + `
        <div style="padding:40px;text-align:center;color:var(--muted);">
          <div style="font-size:36px;margin-bottom:10px;">👥</div>
          <div style="font-size:14px;">${search ? `No results for "${esc(search)}"` : 'No referrals yet.'}</div>
        </div>`;
      return;
    }

    const rows = referrals.map(r => {
      const hasOrders = (r.order_count || 0) > 0;
      const joinDate  = r.referred_at ? new Date(r.referred_at).toLocaleDateString('en-KE') : '—';
      const ratePct   = r.commission_rate != null ? (r.commission_rate * 100).toFixed(1) + '%' : '15.0%';
      const isCustom  = r.commission_rate != null && Math.abs(r.commission_rate - 0.15) > 0.0001;
      // FIX: Use data-* attributes for safe passing
      return `<tr>
        <td>
          <div style="font-weight:700;color:var(--white);">${esc(r.referred_user_name || '—')}</div>
          <div style="font-size:11px;color:var(--muted);">${esc(r.referred_user_email || '—')}</div>
        </td>
        <td style="font-size:12px;color:var(--muted);">${joinDate}</td>
        <td>
          <div style="font-weight:600;color:var(--white);font-size:13px;">${esc(r.affiliate_name || '—')}</div>
          <div style="font-size:10px;color:var(--muted);">${esc(r.affiliate_email || '—')}</div>
          <div style="font-size:10px;font-family:monospace;color:var(--green);margin-top:2px;">${esc(r.referral_code || '—')}</div>
        </td>
        <td style="font-size:13px;">${r.order_count || 0}</td>
        <td style="font-weight:800;color:${hasOrders?'var(--green)':'var(--muted)'};">${fmtKES(r.total_spend_kes || 0)}</td>
        <td style="font-weight:800;color:#ffd700;">${fmtKES(r.commission_earned_kes || 0)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:800;color:${isCustom?'#ff9a3c':'var(--muted)'};">${ratePct}</span>
            ${isCustom ? `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(255,154,60,.12);color:#ff9a3c;font-weight:700;letter-spacing:.5px;">CUSTOM</span>` : ''}
          </div>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${hasOrders
              ? `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(61,212,74,.12);color:var(--green);font-weight:700;">Active</span>`
              : `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:var(--navy);color:var(--muted);">No orders</span>`}
            ${r.affiliate_profile_id ? `
            <button
              data-profile-id="${esc(r.affiliate_profile_id)}"
              data-name="${esc(r.affiliate_name||'')}"
              data-email="${esc(r.affiliate_email||'')}"
              data-rate="${r.commission_rate || 0.15}"
              onclick="affCommissionOpen(this)"
              style="background:rgba(255,215,0,.1);color:#ffd700;border:1px solid rgba(255,215,0,.25);border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'Montserrat',sans-serif;">
              ✏️ Edit %
            </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = summaryHtml + searchBar + `
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>Referred User</th><th>Joined</th><th>Via Affiliate</th>
          <th>Orders</th><th>Total Spend</th><th>Commission</th><th>Rate</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;

  } catch (e) {
    container.innerHTML = `<div style="color:#ff6b6b;padding:20px;">${esc(e.message || 'Failed to load referrals')}</div>`;
  }
}

// ── Commission rate edit modal ─────────────────────────────────────────────────
let _affCommProfileId = null;

// FIX: Reads from data-* attributes instead of positional string args
function affCommissionOpen(btn) {
  _affCommProfileId = btn.dataset.profileId;
  const name        = btn.dataset.name  || '—';
  const email       = btn.dataset.email || '—';
  const rate        = parseFloat(btn.dataset.rate || 0.15);

  document.getElementById('affCommAffiliateName').textContent  = name;
  document.getElementById('affCommAffiliateEmail').textContent = email;
  document.getElementById('affCommCurrentRate').textContent    = (rate * 100).toFixed(1) + '%';
  document.getElementById('affCommRateInput').value            = (rate * 100).toFixed(1);
  document.getElementById('affCommNewRatePreview').textContent = (rate * 100).toFixed(1) + '%';
  document.getElementById('affCommNote').value                 = '';
  document.getElementById('affCommErr').style.display          = 'none';

  const saveBtn = document.getElementById('affCommSaveBtn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Rate'; }

  document.getElementById('affCommissionModal').style.display = 'flex';
}

function affCommissionClose() {
  document.getElementById('affCommissionModal').style.display = 'none';
  _affCommProfileId = null;
}

// Live preview as user types
function affCommRateChange(val) {
  const pct = parseFloat(val);
  const preview = document.getElementById('affCommNewRatePreview');
  if (preview) preview.textContent = isNaN(pct) ? '—' : pct.toFixed(1) + '%';
}

async function affCommissionSave() {
  if (!_affCommProfileId) return;
  const pctInput = parseFloat(document.getElementById('affCommRateInput').value);
  const note     = document.getElementById('affCommNote').value.trim();
  const errEl    = document.getElementById('affCommErr');
  errEl.style.display = 'none';

  if (isNaN(pctInput) || pctInput <= 0 || pctInput > 50) {
    errEl.textContent = 'Enter a rate between 0.1% and 50%.'; errEl.style.display = 'block'; return;
  }

  // FIX: Send as string to preserve Decimal precision
  const rate = (pctInput / 100).toFixed(4);
  const btn  = document.getElementById('affCommSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    await api(`/affiliate/admin/affiliates/${_affCommProfileId}/commission`, {
      method: 'PATCH',
      body: JSON.stringify({ commission_rate: rate, note: note || null }),
    });
    affCommissionClose();
    toast(`Commission rate updated to ${pctInput.toFixed(1)}% ✅`, 'success');
    // Refresh whichever sub-tab is active
    if (_affAdminCurrentSubTab === 'leaderboard') adminLoadAffiliateLeaderboard();
    else if (_affAdminCurrentSubTab === 'referrals') adminLoadAffiliateReferrals();
    else adminLoadAffiliatePayouts();
  } catch (e) {
    errEl.textContent = e.message || 'Failed to update commission rate.'; errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Save Rate';
  }
}