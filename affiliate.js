/* ══════════════════════════════════════════════════════════════════
 * ENDAVIRAL — AFFILIATE SYSTEM  (affiliate.js)
 * Depends on: api(), toast(), fmtKES(), esc(), currentUser (globals)
 *
 * THREE TIERS:
 *   Refer & Earn   — standard users refer friends, earn 8% commission
 *   Reseller       — bulk buyers get discounted pricing (15% off)
 *   Agent Account  — manage sub-users, higher 12% commission
 *
 * INTEGRATION CHECKLIST (index.html):
 *   1. Add <script src="affiliate.js"></script> after admin.js (needs esc())
 *   2. Add nav item + page section (paste blocks below marked ★)
 *   3. Call initAffiliatePage() inside navTo() for 'affiliate'
 *   4. Optionally call _updateAffiliateBadge() in _startBgTicketWatch()
 * ══════════════════════════════════════════════════════════════════ */

/* ── Nav item to paste into sidebar nav (★ PASTE IN index.html) ───
<div class="nav-item" onclick="navTo('affiliate')" id="affiliateNavItem">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
  Refer &amp; Earn
  <span class="nav-badge" id="affiliateBadge" style="display:none;background:var(--green);color:#000;"></span>
</div>

── Page section to paste in .page-content (★ PASTE IN index.html) ──
<div class="page-section" id="sec-affiliate"></div>
─────────────────────────────────────────────────────────────────── */

// ─── Commission rates ──────────────────────────────────────────────────────
const AFF_COMMISSION = {
  refer:    0.08,   // 8%  — standard referral
  agent:    0.12,   // 12% — agent account
  reseller: 0.00,   // resellers get pricing discount instead
};
const RESELLER_DISCOUNT = 0.15;   // 15% off all orders

// ─── Tier thresholds (cumulative referral spend of referrals, KES) ─────────
const TIER_THRESHOLDS = [
  { name: 'Starter',  min: 0,       badge: '🌱', color: '#7a8fad' },
  { name: 'Bronze',   min: 5000,    badge: '🥉', color: '#cd7f32' },
  { name: 'Silver',   min: 25000,   badge: '🥈', color: '#a8adb4' },
  { name: 'Gold',     min: 100000,  badge: '🥇', color: '#ffd700' },
  { name: 'Diamond',  min: 500000,  badge: '💎', color: '#3dd44a' },
];

function _affTier(totalReferralSpend) {
  let t = TIER_THRESHOLDS[0];
  for (const tier of TIER_THRESHOLDS) {
    if (totalReferralSpend >= tier.min) t = tier;
  }
  return t;
}

// ─── Fallback data when API not yet built ─────────────────────────────────
function _affFallbackData() {
  const slug = (currentUser?.name || 'user').toLowerCase().replace(/\s+/g, '');
  const code = slug + Math.floor(Math.random() * 900 + 100);
  return {
    referral_code:      code,
    referral_link:      `https://endaviral.co.ke?ref=${code}`,
    tier:               'Starter',
    total_referrals:    0,
    total_earned_kes:   0,
    pending_kes:        0,
    paid_kes:           0,
    referral_spend_kes: 0,
    account_type:       currentUser?.account_type || 'standard',
    referrals:          [],
    commissions:        [],
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────
async function initAffiliatePage() {
  const sec = document.getElementById('sec-affiliate');
  if (!sec) return;
  sec.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading affiliate data…</span></div>`;

  let data = {};
  try {
    data = await api('/affiliate/dashboard');
  } catch (_) {
    // Graceful degradation: show UI with zeros if endpoint not yet built
    data = _affFallbackData();
  }

  const spend       = data.referral_spend_kes || 0;
  const tier        = _affTier(spend);
  const tierIdx     = TIER_THRESHOLDS.indexOf(tier);
  const nextTier    = TIER_THRESHOLDS[tierIdx + 1] || null;
  const progressPct = nextTier
    ? Math.min(100, Math.round(Math.max(0, spend - tier.min) / (nextTier.min - tier.min) * 100))
    : 100;

  const isReseller = data.account_type === 'reseller';
  const isAgent    = data.account_type === 'agent';
  const commRate   = isAgent ? AFF_COMMISSION.agent : AFF_COMMISSION.refer;

  // Safe-escape the referral link for use in an input value attribute
  const safeLink = esc(data.referral_link || '');
  const safeCode = esc(data.referral_code || '');

  sec.innerHTML = `
  <!-- ══ HEADER ══ -->
  <div class="sec-hd" style="flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <div class="sec-title">REFER &amp; EARN</div>
      <div class="sec-sub">Share EndaViral — earn ${Math.round(commRate * 100)}% on every order your referrals place</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-secondary" onclick="affRequestPayout()">💸 Request Payout</button>
      <button class="btn-secondary" onclick="initAffiliatePage()">↻ Refresh</button>
    </div>
  </div>

  <!-- ══ TIER BADGE ══ -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin-bottom:20px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
    <div style="font-size:52px;line-height:1;">${tier.badge}</div>
    <div style="flex:1;min-width:200px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">YOUR TIER</div>
      <div style="font-size:24px;font-weight:900;color:${tier.color};letter-spacing:-.5px;">${tier.name}</div>
      ${nextTier ? `
      <div style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px;">
          <span>Progress to ${nextTier.name}</span>
          <span>${progressPct}%</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden;">
          <div style="height:100%;background:${tier.color};width:${progressPct}%;transition:width .6s;border-radius:4px;"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${fmtKES(nextTier.min - spend)} more in referral orders to unlock ${nextTier.badge} ${nextTier.name}</div>
      </div>` : `<div style="font-size:12px;color:var(--green);margin-top:6px;">🎉 Maximum tier achieved!</div>`}
    </div>
    <div style="text-align:right;min-width:130px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">Commission Rate</div>
      <div style="font-size:32px;font-weight:900;color:var(--green);">${Math.round(commRate * 100)}%</div>
      <div style="font-size:11px;color:var(--muted);">per referral order</div>
    </div>
  </div>

  <!-- ══ STATS GRID ══ -->
  <div class="stats-grid" style="margin-bottom:20px;">
    <div class="stat-card green">
      <div class="stat-icon">💰</div>
      <div class="stat-label">Total Earned</div>
      <div class="stat-val" style="font-size:22px;">${fmtKES(data.total_earned_kes || 0)}</div>
      <div class="stat-sub">All time commissions</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon">⏳</div>
      <div class="stat-label">Pending</div>
      <div class="stat-val" style="font-size:22px;">${fmtKES(data.pending_kes || 0)}</div>
      <div class="stat-sub">Awaiting clearance</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon">👥</div>
      <div class="stat-label">Total Referrals</div>
      <div class="stat-val" style="font-size:22px;">${data.total_referrals || 0}</div>
      <div class="stat-sub">Registered via your link</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon">✅</div>
      <div class="stat-label">Paid Out</div>
      <div class="stat-val" style="font-size:22px;">${fmtKES(data.paid_kes || 0)}</div>
      <div class="stat-sub">Sent to M-Pesa</div>
    </div>
  </div>

  <!-- ══ REFERRAL LINK ══ -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">YOUR REFERRAL LINK</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      <input id="affLinkInput" value="${safeLink}" readonly
        style="flex:1;min-width:200px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--green);font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;outline:none;"/>
      <button class="btn-primary" style="margin-top:0;padding:11px 20px;font-size:13px;" onclick="affCopyLink()">📋 Copy</button>
      <button class="btn-secondary" style="padding:11px 20px;font-size:13px;" onclick="affShareWhatsApp()">🟢 WhatsApp</button>
      <button class="btn-secondary" style="padding:11px 20px;font-size:13px;" onclick="affShareTikTok()">🎵 TikTok Bio</button>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <div style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;">
        Your Code: <span style="color:var(--green);font-size:14px;letter-spacing:1px;">${safeCode}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);">Share on TikTok, Instagram bio, WhatsApp status, or Twitter/X</div>
    </div>
  </div>

  <!-- ══ ACCOUNT TYPE UPGRADE ══ -->
  ${_affAccountTypeCards(data)}

  <!-- ══ HOW IT WORKS ══ -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:18px;">HOW IT WORKS</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
      ${[
        { n:'1', title:'Share your link', icon:'🔗', desc:'Post it on TikTok bio, WhatsApp status, Instagram story or Twitter/X' },
        { n:'2', title:'Friends sign up',  icon:'👤', desc:'Anyone who registers via your link is permanently linked to your account' },
        { n:'3', title:'They place orders',icon:'📦', desc:'Every time your referral buys a service on EndaViral you earn commission' },
        { n:'4', title:'You get paid',     icon:'💸', desc:'Request payout any time. We send directly to your M-Pesa number' },
      ].map(s => `
      <div style="background:var(--navy);border-radius:12px;padding:16px;">
        <div style="font-size:28px;margin-bottom:8px;">${s.icon}</div>
        <div style="font-size:12px;font-weight:800;color:var(--white);margin-bottom:6px;">Step ${s.n}: ${s.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;">${s.desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ══ TABS: Referrals / Commissions ══ -->
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
    <button class="cat-btn active" id="affTab-referrals"   onclick="affSwitchTab('referrals')">👥 My Referrals (${data.total_referrals || 0})</button>
    <button class="cat-btn"        id="affTab-commissions" onclick="affSwitchTab('commissions')">💰 Commission History</button>
    ${isReseller || isAgent ? `<button class="cat-btn" id="affTab-reseller" onclick="affSwitchTab('reseller')">🏪 ${isAgent ? 'Agent Dashboard' : 'Reseller Pricing'}</button>` : ''}
  </div>

  <div id="affPane-referrals">${_affReferralsTable(data.referrals || [])}</div>
  <div id="affPane-commissions" style="display:none;">${_affCommissionsTable(data.commissions || [])}</div>
  ${isReseller || isAgent ? `<div id="affPane-reseller" style="display:none;">${_affResellerPane(data, isAgent)}</div>` : ''}

  <!-- ══ PAYOUT MODAL ══
       NOTE: Initial display is 'none' here; affRequestPayout() sets it to 'flex'.
       Do NOT add a second style="display:none" attribute — that silently wins. -->
  <div id="affPayoutModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;max-width:400px;width:100%;position:relative;">
      <button onclick="affClosePayoutModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;">✕</button>
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;">Request Payout</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">Minimum payout: <strong style="color:var(--white);">KES 500</strong> · Processed via M-Pesa within 24h</div>
      <div style="margin-bottom:14px;">
        <label style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">Amount (KES)</label>
        <input id="affPayoutAmount" type="number" min="500" placeholder="500"
          style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--white);font-family:'Montserrat',sans-serif;font-size:14px;outline:none;"/>
      </div>
      <div style="margin-bottom:20px;">
        <label style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">M-Pesa Number</label>
        <div style="display:flex;align-items:center;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
          <span style="padding:0 14px;font-size:18px;">🇰🇪</span>
          <input id="affPayoutPhone" type="tel" placeholder="07XX XXX XXX"
            style="flex:1;background:none;border:none;padding:11px 14px 11px 0;color:var(--white);font-family:'Montserrat',sans-serif;font-size:14px;outline:none;"/>
        </div>
      </div>
      <div id="affPayoutErr" style="display:none;color:var(--red);font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(229,57,53,.08);border-radius:8px;border:1px solid rgba(229,57,53,.2);"></div>
      <button class="btn-primary" onclick="affSubmitPayout()" style="width:100%;margin-top:0;">💸 Request M-Pesa Payout</button>
    </div>
  </div>
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function _affAccountTypeCards(data) {
  const type = data.account_type || 'standard';
  if (type !== 'standard') return '';   // already upgraded — no upsell
  return `
  <div style="background:linear-gradient(135deg,var(--card),var(--navy));border:1px solid rgba(61,212,74,.2);border-radius:16px;padding:22px 24px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--green);margin-bottom:16px;">UNLOCK MORE EARNING POWER</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">

      <div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:18px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#cd7f32,#f5a623);"></div>
        <div style="font-size:22px;margin-bottom:8px;">🏪</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:6px;">Reseller Account</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px;">
          Get <strong style="color:var(--white);">15% off</strong> every order you place. Ideal if you are managing social media for multiple clients or agencies.
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:12px;">✅ Discount on all services &nbsp;·&nbsp; ✅ White-label ordering</div>
        <button class="btn-secondary" style="width:100%;font-size:12px;padding:9px;" onclick="affUpgradeRequest('reseller')">Apply for Reseller</button>
      </div>

      <div style="background:var(--navy);border:1px solid rgba(61,212,74,.2);border-radius:12px;padding:18px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3dd44a,#28a035);"></div>
        <div style="font-size:22px;margin-bottom:8px;">🤝</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:6px;">Agent Account</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px;">
          Earn <strong style="color:var(--green);">12% commission</strong> instead of 8%. Manage sub-users and view their orders. Perfect for TikTokers with large audiences.
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:12px;">✅ Higher commission &nbsp;·&nbsp; ✅ Sub-user dashboard</div>
        <button class="btn-primary" style="width:100%;font-size:12px;padding:9px;margin-top:0;" onclick="affUpgradeRequest('agent')">Apply for Agent</button>
      </div>

    </div>
  </div>`;
}

function _affReferralsTable(referrals) {
  if (!referrals.length) return `
    <div class="tbl-wrap"><div style="text-align:center;padding:48px 24px;color:var(--muted);">
      <div style="font-size:40px;margin-bottom:12px;">👥</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">No referrals yet</div>
      <div style="font-size:13px;">Share your link and start earning!</div>
    </div></div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Their Spend</th><th>Your Earned</th></tr></thead>
    <tbody>${referrals.map(r => `
      <tr>
        <td><strong>${esc(r.name || '—')}</strong></td>
        <td style="font-size:12px;color:var(--muted);">${esc(r.email || '—')}</td>
        <td style="font-size:12px;color:var(--muted);">${r.joined_at ? new Date(r.joined_at).toLocaleDateString() : '—'}</td>
        <td>${parseInt(r.orders || 0)}</td>
        <td style="color:var(--white);">${fmtKES(r.total_spend || 0)}</td>
        <td style="color:var(--green);font-weight:700;">${fmtKES(r.commission_earned || 0)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _affCommissionsTable(commissions) {
  if (!commissions.length) return `
    <div class="tbl-wrap"><div style="text-align:center;padding:48px 24px;color:var(--muted);">
      <div style="font-size:40px;margin-bottom:12px;">💰</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">No commissions yet</div>
      <div style="font-size:13px;">Your earnings will appear here once referrals start ordering.</div>
    </div></div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Date</th><th>From</th><th>Order Value</th><th>Commission</th><th>Status</th></tr></thead>
    <tbody>${commissions.map(c => {
      const status  = c.status || 'pending';
      const pillCls = status === 'paid' ? 'completed' : status === 'pending' ? 'pending' : 'processing';
      return `<tr>
        <td style="font-size:12px;color:var(--muted);">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
        <td>${esc(c.referral_name || '—')}</td>
        <td>${fmtKES(c.order_amount || 0)}</td>
        <td style="color:var(--green);font-weight:700;">${fmtKES(c.commission_amount || 0)}</td>
        <td><span class="status-pill ${pillCls}">${status}</span></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
}

function _affResellerPane(data, isAgent) {
  return `
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;">
      ${isAgent ? 'AGENT DASHBOARD' : 'RESELLER DASHBOARD'}
    </div>
    ${isAgent ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;">
      <div style="background:var(--navy);border-radius:12px;padding:16px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Sub-Users</div>
        <div style="font-size:26px;font-weight:800;color:var(--green);">${data.sub_users || 0}</div>
      </div>
      <div style="background:var(--navy);border-radius:12px;padding:16px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Sub-User Orders</div>
        <div style="font-size:26px;font-weight:800;color:var(--blue);">${data.sub_orders || 0}</div>
      </div>
      <div style="background:var(--navy);border-radius:12px;padding:16px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Total Commission (12%)</div>
        <div style="font-size:22px;font-weight:800;color:var(--orange);">${fmtKES(data.total_earned_kes || 0)}</div>
      </div>
    </div>` : ''}
    <div style="background:rgba(61,212,74,.05);border:1px solid rgba(61,212,74,.15);border-radius:10px;padding:14px 16px;">
      <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:6px;">
        ${isAgent ? '✅ Agent Benefits Active' : '✅ Reseller Discount Active'}
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.7;">
        ${isAgent
          ? `You earn <strong style="color:var(--white);">12%</strong> on every referral order. Your referral link is active. Manage sub-users via the admin panel or contact support to grant sub-user access.`
          : `You receive a <strong style="color:var(--white);">15% discount</strong> on all services automatically applied at checkout. No coupon needed.`}
      </div>
    </div>
  </div>`;
}

// ── Tab switching ──────────────────────────────────────────────────────────
function affSwitchTab(tab) {
  ['referrals', 'commissions', 'reseller'].forEach(t => {
    const btn  = document.getElementById('affTab-' + t);
    const pane = document.getElementById('affPane-' + t);
    if (btn)  btn.classList.toggle('active', t === tab);
    if (pane) pane.style.display = t === tab ? '' : 'none';
  });
}

// ── Copy / Share ───────────────────────────────────────────────────────────
function affCopyLink() {
  const val = document.getElementById('affLinkInput')?.value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => toast('Link copied to clipboard!', 'success'));
}

function affShareWhatsApp() {
  const link = document.getElementById('affLinkInput')?.value || '';
  const msg  = encodeURIComponent(
    `🚀 I'm using EndaViral to grow my social media in Kenya!\n\nBuy TikTok followers, Instagram likes, YouTube views & more — pay with M-Pesa.\n\nSign up with my link and get started:\n${link}`
  );
  window.open('https://wa.me/?text=' + msg, '_blank');
}

function affShareTikTok() {
  const link = document.getElementById('affLinkInput')?.value || '';
  const text = `endaviral.co.ke — Kenya's #1 SMM Panel 🇰🇪\nBuy TikTok & IG growth via M-Pesa\n${link}`;
  navigator.clipboard.writeText(text).then(() =>
    toast('TikTok bio text copied — paste it into your TikTok bio!', 'success')
  );
}

// ── Payout flow ────────────────────────────────────────────────────────────
function affRequestPayout() {
  const modal = document.getElementById('affPayoutModal');
  if (!modal) return;
  // Clear previous values
  const amtEl = document.getElementById('affPayoutAmount');
  const phEl  = document.getElementById('affPayoutPhone');
  const errEl = document.getElementById('affPayoutErr');
  if (amtEl) amtEl.value = '';
  if (phEl)  phEl.value  = '';
  if (errEl) errEl.style.display = 'none';
  modal.style.display = 'flex';
}

function affClosePayoutModal() {
  const modal = document.getElementById('affPayoutModal');
  if (modal) modal.style.display = 'none';
}

async function affSubmitPayout() {
  const amount = parseFloat(document.getElementById('affPayoutAmount')?.value || 0);
  const phone  = (document.getElementById('affPayoutPhone')?.value || '').trim();
  const errEl  = document.getElementById('affPayoutErr');
  errEl.style.display = 'none';

  if (isNaN(amount) || amount < 500) {
    errEl.textContent  = 'Minimum payout is KES 500.';
    errEl.style.display = 'block';
    return;
  }
  // Accept 07xxxxxxxx, 01xxxxxxxx, 2547xxxxxxxx, +2547xxxxxxxx
  const cleaned = phone.replace(/\s+/g, '');
  if (!cleaned || !/^(\+?254|0)[17]\d{8}$/.test(cleaned)) {
    errEl.textContent  = 'Please enter a valid Safaricom M-Pesa number (07xx or 01xx).';
    errEl.style.display = 'block';
    return;
  }

  try {
    await api('/affiliate/payout', {
      method: 'POST',
      body:   JSON.stringify({ amount, phone: cleaned }),
    });
    affClosePayoutModal();
    toast('Payout requested! You will receive M-Pesa within 24h.', 'success');
    initAffiliatePage();
  } catch (e) {
    errEl.textContent  = e.message || 'Payout request failed. Please try again.';
    errEl.style.display = 'block';
  }
}

// ── Upgrade request ────────────────────────────────────────────────────────
async function affUpgradeRequest(type) {
  try {
    await api('/affiliate/upgrade-request', {
      method: 'POST',
      body:   JSON.stringify({ requested_type: type }),
    });
    toast(`${type === 'agent' ? 'Agent' : 'Reseller'} application submitted! Our team will review within 24h.`, 'success');
  } catch (e) {
    toast(e.message || 'Request failed. Please try again.', 'error');
  }
}

// ── Sidebar badge — shows pending balance when ≥ KES 100 ─────────────────
// Called from _startBgTicketWatch() or on page load; uses the same
// /affiliate/dashboard endpoint but only reads pending_kes to avoid
// a separate lightweight endpoint that doesn't exist yet.
async function _updateAffiliateBadge() {
  if (!token || !currentUser) return;
  const badge = document.getElementById('affiliateBadge');
  if (!badge) return;
  try {
    const d       = await api('/affiliate/dashboard');
    const pending = d.pending_kes || 0;
    if (pending >= 100) {
      badge.textContent    = fmtKES(pending);
      badge.style.display  = '';
    } else {
      badge.style.display  = 'none';
    }
  } catch (_) {
    badge.style.display = 'none';
  }
}