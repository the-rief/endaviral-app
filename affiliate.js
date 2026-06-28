/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — AFFILIATE SYSTEM  (affiliate.js)  v2.0
 * Depends on: api(), toast(), fmtKES(), esc(), currentUser, token (globals)
 *
 * COMMISSION: 15% of markup on every order placed by referred users.
 * PAYOUT: User creates a ticket → admin disburses via M-Pesa within 24h.
 * OPT-IN: Anyone can join from the dashboard page.
 *
 * INTEGRATION CHECKLIST (index.html):
 *   1. Sidebar nav item — paste ★NAVITEM below
 *   2. Page section     — paste ★SECTION below
 *   3. Payout modal     — paste ★MODAL below (before </body>)
 *   4. navTo() case     — add case 'affiliate': initAffiliatePage(); break;
 *   5. _startBgTicketWatch() — call _updateAffiliateBadge() inside it
 *   6. register endpoint  — pass ?ref= code if present in URL to backend
 *   7. orders submit      — backend already calls accrue_commission()
 * ════════════════════════════════════════════════════════════════════

★NAVITEM — paste inside sidebar nav:
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

★SECTION — paste inside .page-content:
<div class="page-section" id="sec-affiliate"></div>

★MODAL — paste before </body>:
<div id="affPayoutModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:32px;width:100%;max-width:420px;margin:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:800;">💸 Request Payout</div>
      <button onclick="affClosePayoutModal()" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1;">×</button>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.15);border-radius:10px;padding:12px 14px;">
      ✅ Payouts are processed within <strong style="color:var(--green);">24 hours</strong> via M-Pesa.<br>Minimum withdrawal: <strong style="color:var(--white);">KES 100</strong>.
    </div>
    <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;letter-spacing:1px;">AMOUNT (KES)</label>
    <input id="affPayoutAmount" type="number" min="100" step="1" placeholder="e.g. 1000"
      style="width:100%;box-sizing:border-box;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:15px;color:var(--white);margin-bottom:16px;">
    <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;letter-spacing:1px;">M-PESA NUMBER</label>
    <input id="affPayoutPhone" type="tel" placeholder="07XX XXX XXX or 01XX XXX XXX"
      style="width:100%;box-sizing:border-box;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:15px;color:var(--white);margin-bottom:16px;">
    <div id="affPayoutErr" style="display:none;background:rgba(255,69,69,.1);border:1px solid rgba(255,69,69,.3);border-radius:8px;padding:10px 12px;font-size:13px;color:#ff6b6b;margin-bottom:16px;"></div>
    <button onclick="affSubmitPayout()" style="width:100%;background:var(--green);color:#000;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;">
      Submit Payout Request
    </button>
  </div>
</div>
*/

// ─── Commission config (mirrors backend) ──────────────────────────────────────
const AFF_COMMISSION_RATE = 0.15;   // 15% of markup
const AFF_MIN_PAYOUT      = 100;    // KES

// ─── Tier thresholds (based on cumulative referral spend) ─────────────────────
// Each tier has REAL, delivered benefits — not just a badge.
//
// BACKEND NOTE: When a user's referral_spend_kes crosses a threshold, your
// backend should:
//   Silver → credit AFF_SILVER_CREDITS_KES to their service wallet monthly
//   Gold   → credit AFF_GOLD_CREDITS_KES + add homepage_featured flag
//   Diamond→ credit AFF_DIAMOND_CREDITS_KES + send admin WhatsApp alert
//
const TIER_THRESHOLDS = [
  {
    name: 'Starter', min: 0, badge: '🌱', color: '#7a8fad',
    benefits: [
      '15% commission on every order',
      'M-Pesa payouts from KES 100',
      'Real-time earnings dashboard',
    ],
    credits_kes: 0,
    featured: false,
  },
  {
    name: 'Bronze', min: 5000, badge: '🥉', color: '#cd7f32',
    benefits: [
      'Everything in Starter',
      'Priority payout processing (12h)',
      'Monthly leaderboard eligibility',
    ],
    credits_kes: 0,
    featured: false,
  },
  {
    name: 'Silver', min: 25000, badge: '🥈', color: '#a8adb4',
    benefits: [
      'Everything in Bronze',
      'KES 500 free service credits / month',
      'Silver badge on your profile',
    ],
    credits_kes: 500,
    featured: false,
  },
  {
    name: 'Gold', min: 100000, badge: '🥇', color: '#ffd700',
    benefits: [
      'Everything in Silver',
      'KES 2,000 free service credits / month',
      'Featured on EndaViral homepage',
      'Dedicated WhatsApp support line',
    ],
    credits_kes: 2000,
    featured: true,
  },
  {
    name: 'Diamond', min: 500000, badge: '💎', color: '#3dd44a',
    benefits: [
      'Everything in Gold',
      'KES 5,000 free service credits / month',
      'Co-promotion — we post about you',
      'Monthly bonus for #1 leaderboard',
      'Direct line to founder',
    ],
    credits_kes: 5000,
    featured: true,
  },
];

const AFF_SILVER_CREDITS_KES  = 500;
const AFF_GOLD_CREDITS_KES    = 2000;
const AFF_DIAMOND_CREDITS_KES = 5000;

function _affTier(spend) {
  let t = TIER_THRESHOLDS[0];
  for (const tier of TIER_THRESHOLDS) { if (spend >= tier.min) t = tier; }
  return t;
}

// ─── URL ref code capture (call once on page load) ────────────────────────────
function affCaptureRefCode() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem('ev_ref_code', ref);
    // Clean URL without reload
    const clean = window.location.pathname + (window.location.hash || '');
    window.history.replaceState({}, '', clean);
  }
}
affCaptureRefCode();

// ─── Main entry point ─────────────────────────────────────────────────────────
let _affCacheTs = 0;
const AFF_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function initAffiliatePage(force = false) {
  const sec = document.getElementById('sec-affiliate');
  if (!sec) return;
  // Skip re-fetch if cache is warm (5-min TTL); force=true used after payout request
  const now = Date.now();
  if (!force && _affCacheTs > 0 && (now - _affCacheTs) < AFF_CACHE_TTL) return;
  sec.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Loading affiliate data…</span></div>`;

  let data = null;
  let notYetOptin = false;

  try {
    data = await api('/affiliate/dashboard');
    _affCacheTs = Date.now();
  } catch (e) {
    // 404 = not opted in — show the join screen
    if (e.status === 404) {
      notYetOptin = true;
    } else {
      // Network/server error — show join screen rather than broken dashboard
      notYetOptin = true;
    }
  }

  if (notYetOptin || !data) {
    _renderOptIn(sec);
    return;
  }

  _renderDashboard(sec, data);
}

// ─── Opt-In Screen ─────────────────────────────────────────────────────────────
function _renderOptIn(sec) {
  sec.innerHTML = `
  <div class="sec-hd" style="margin-bottom:24px;">
    <div>
      <div class="sec-title">REFER &amp; EARN</div>
      <div class="sec-sub">Turn your audience into income — earn 15% on every order your referrals place</div>
    </div>
  </div>

  <div style="max-width:560px;margin:0 auto;text-align:center;padding:40px 0;">
    <div style="font-size:64px;margin-bottom:16px;">🤝</div>
    <div style="font-size:26px;font-weight:900;color:var(--white);margin-bottom:10px;">Join the Affiliate Programme</div>
    <div style="font-size:14px;color:var(--muted);line-height:1.8;margin-bottom:32px;max-width:420px;margin-left:auto;margin-right:auto;">
      Share your personal link. When friends sign up and order, you earn
      <strong style="color:var(--green);">15% of every order value</strong> straight to your M-Pesa.
      No limits. No expiry. Withdraw anytime from KES 100.
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:36px;text-align:left;">
      ${[
        ['💸','Earn 15%','On every referral order, forever'],
        ['📲','M-Pesa Payouts','Withdraw to any Safaricom number'],
        ['⚡','24h Disbursement','Get paid fast — no long waits'],
        ['🎯','Real-time Stats','Track clicks, signups & earnings'],
      ].map(([icon, title, desc]) => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
          <div style="font-size:24px;margin-bottom:8px;">${icon}</div>
          <div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:4px;">${title}</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.5;">${desc}</div>
        </div>
      `).join('')}
    </div>

    <button id="affJoinBtn" onclick="affDoOptin()" style="background:var(--green);color:#000;border:none;border-radius:14px;padding:16px 48px;font-size:16px;font-weight:900;cursor:pointer;letter-spacing:.3px;">
      ✅ Join Now — It's Free
    </button>
    <div style="font-size:11px;color:var(--muted);margin-top:12px;">Instant activation. No approval needed.</div>
  </div>`;
}

async function affDoOptin() {
  const btn = document.getElementById('affJoinBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }
  try {
    await api('/affiliate/optin', { method: 'POST' });
    toast('Welcome to the affiliate programme! 🎉', 'success');
    _affCacheTs = 0; // bust cache so dashboard re-fetches fresh data
    initAffiliatePage(true);
  } catch (e) {
    toast(e.message || 'Could not opt in. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = "✅ Join Now — It's Free"; }
  }
}

// ─── Full dashboard render ─────────────────────────────────────────────────────
function _renderDashboard(sec, data) {
  const spend      = data.referral_spend_kes || 0;
  const tier       = _affTier(spend);
  const tierIdx    = TIER_THRESHOLDS.indexOf(tier);
  const nextTier   = TIER_THRESHOLDS[tierIdx + 1] || null;
  const progress   = nextTier
    ? Math.min(100, Math.round((spend - tier.min) / (nextTier.min - tier.min) * 100))
    : 100;

  const safeLink = esc(data.referral_link || '');
  const safeCode = esc(data.referral_code || '');
  const pending  = data.pending_kes || 0;
  const canPay   = pending >= AFF_MIN_PAYOUT;
  const hasPendingPayout = (data.pending_payout_count || 0) > 0;
  const freeCredits      = data.free_credits_kes || 0;
  const monthlyRank      = data.monthly_rank || null;
  // Use per-affiliate rate from backend (admin may have set a custom rate)
  const commissionRate   = data.commission_rate || AFF_COMMISSION_RATE;
  const commissionPct    = Math.round(commissionRate * 100);

  sec.innerHTML = `
  <!-- ══ HEADER ══ -->
  <div class="sec-hd" style="flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <div class="sec-title">REFER &amp; EARN</div>
      <div class="sec-sub">Earn ${commissionPct}% on every order your referrals place</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      ${hasPendingPayout
        ? `<div style="background:rgba(255,165,0,.12);border:1px solid rgba(255,165,0,.25);border-radius:8px;padding:8px 14px;font-size:12px;color:#ffa500;">⏳ Payout pending</div>`
        : canPay
          ? `<button class="btn-primary" onclick="affRequestPayout()">💸 Withdraw ${fmtKES(pending)}</button>`
          : `<div style="font-size:12px;color:var(--muted);">Min. payout: ${fmtKES(AFF_MIN_PAYOUT)} (you have ${fmtKES(pending)})</div>`
      }
      <button class="btn-secondary" onclick="initAffiliatePage(true)">↻</button>
    </div>
  </div>

  <!-- ══ TIER CARD ══ -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin-bottom:20px;">
    <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">

      <!-- Badge + name + progress -->
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:220px;">
        <div style="font-size:52px;line-height:1;">${tier.badge}</div>
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">YOUR TIER</div>
          <div style="font-size:22px;font-weight:900;color:${tier.color};">${tier.name}</div>
          ${nextTier ? `
          <div style="margin-top:10px;max-width:240px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px;">
              <span>→ ${nextTier.badge} ${nextTier.name}</span><span>${progress}%</span>
            </div>
            <div style="background:var(--border);border-radius:4px;height:5px;overflow:hidden;">
              <div style="height:100%;background:${tier.color};width:${progress}%;transition:width .6s;border-radius:4px;"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:4px;">${fmtKES(nextTier.min - spend)} more referral spend to unlock</div>
          </div>` : `<div style="font-size:11px;color:var(--green);margin-top:6px;">🎉 Max tier — you're elite!</div>`}
        </div>
      </div>

      <!-- Current benefits list -->
      <div style="flex:1;min-width:200px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">YOUR BENEFITS NOW</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${tier.benefits.map(b => `
            <div style="display:flex;gap:8px;align-items:center;font-size:12px;color:var(--white);">
              <span style="color:var(--green);font-size:10px;">✓</span> ${b}
            </div>`).join('')}
          ${tier.credits_kes > 0
            ? `<div style="margin-top:8px;background:rgba(61,212,74,.08);border:1px solid rgba(61,212,74,.2);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--green);">
                🎁 <strong>${fmtKES(tier.credits_kes)}</strong> in free credits credited to your wallet this month
               </div>`
            : nextTier && nextTier.credits_kes > 0
              ? `<div style="margin-top:8px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--muted);">
                  🔒 Reach ${nextTier.badge} ${nextTier.name} to unlock ${fmtKES(nextTier.credits_kes)}/month in free credits
                 </div>`
              : ''}
        </div>
      </div>

      <!-- Commission rate + monthly rank -->
      <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-end;">
        <div style="text-align:center;padding:14px 18px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.15);border-radius:12px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">Rate</div>
          <div style="font-size:32px;font-weight:900;color:var(--green);">${commissionPct}%</div>
          <div style="font-size:10px;color:var(--muted);">per order</div>
          <button onclick="affCopyLink()" style="margin-top:10px;width:100%;background:var(--green);color:#000;border:none;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;">📋 Copy Link</button>
        </div>
        ${monthlyRank ? `
        <div style="text-align:center;padding:10px 18px;background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);border-radius:12px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">This Month</div>
          <div style="font-size:28px;font-weight:900;color:#ffd700;">#${monthlyRank}</div>
          <div style="font-size:10px;color:var(--muted);">Leaderboard</div>
        </div>` : ''}
      </div>
    </div>

    <!-- All tiers roadmap strip -->
    <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border);">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">ALL TIERS</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${TIER_THRESHOLDS.map((t, i) => {
          const isActive  = i === tierIdx;
          const isPast    = i < tierIdx;
          return `
          <div style="flex:1;min-width:100px;background:${isActive ? `rgba(61,212,74,.08)` : 'rgba(255,255,255,.02)'};border:1px solid ${isActive ? `rgba(61,212,74,.3)` : 'var(--border)'};border-radius:10px;padding:10px 12px;opacity:${isPast || isActive ? '1' : '0.45'};">
            <div style="font-size:18px;margin-bottom:4px;">${t.badge}</div>
            <div style="font-size:11px;font-weight:700;color:${isActive ? 'var(--green)' : t.color};">${t.name} ${isActive ? '← you' : ''}</div>
            <div style="font-size:10px;color:var(--muted);">${t.min === 0 ? 'Free to join' : fmtKES(t.min) + ' spend'}</div>
            ${t.credits_kes > 0 ? `<div style="font-size:10px;color:var(--green);margin-top:3px;">🎁 ${fmtKES(t.credits_kes)}/mo</div>` : ''}
            ${t.featured ? `<div style="font-size:10px;color:#ffd700;margin-top:2px;">⭐ Featured</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- ══ STATS GRID ══ -->
  <div class="stats-grid" style="margin-bottom:20px;">
    <div class="stat-card green">
      <div class="stat-icon">💰</div>
      <div class="stat-label">Total Earned</div>
      <div class="stat-val" style="font-size:20px;">${fmtKES(data.total_earned_kes || 0)}</div>
      <div class="stat-sub">All time</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon">⏳</div>
      <div class="stat-label">Available</div>
      <div class="stat-val" style="font-size:20px;">${fmtKES(pending)}</div>
      <div class="stat-sub">Ready to withdraw</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon">👥</div>
      <div class="stat-label">Referrals</div>
      <div class="stat-val" style="font-size:20px;">${data.total_referrals || 0}</div>
      <div class="stat-sub">Via your link</div>
    </div>
    <div class="stat-card ${freeCredits > 0 ? 'green' : 'red'}">
      <div class="stat-icon">${freeCredits > 0 ? '🎁' : '✅'}</div>
      <div class="stat-label">${freeCredits > 0 ? 'Free Credits' : 'Paid Out'}</div>
      <div class="stat-val" style="font-size:20px;">${freeCredits > 0 ? fmtKES(freeCredits) : fmtKES(data.paid_kes || 0)}</div>
      <div class="stat-sub">${freeCredits > 0 ? 'This month' : 'Sent to M-Pesa'}</div>
    </div>
  </div>

  <!-- ══ REFERRAL LINK ══ -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 24px;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;">YOUR REFERRAL LINK</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <input id="affLinkInput" value="${safeLink}" readonly
        style="flex:1;min-width:200px;background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:11px 14px;font-size:13px;color:var(--green);font-family:monospace;">
      <button onclick="affCopyLink()" class="btn-secondary" style="white-space:nowrap;">📋 Copy</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="affShareWhatsApp()" style="flex:1;background:#25d366;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;min-width:120px;">
        📱 WhatsApp
      </button>
      <button onclick="affShareTikTok()" style="flex:1;background:#010101;color:#fff;border:1px solid #333;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;min-width:120px;">
        🎵 TikTok Bio
      </button>
      <button onclick="affCopyCode()" style="flex:1;background:var(--navy);color:var(--white);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;min-width:120px;">
        🔑 Code: <strong style="color:var(--green);">${safeCode}</strong>
      </button>
    </div>
  </div>

  <!-- ══ TABS ══ -->
  <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
    ${[
      ['commissions', '💰 Commissions'],
      ['referrals',   '👥 Referrals'],
      ['payouts',     '💳 Payouts'],
      ['leaderboard', '🏆 Leaderboard'],
    ].map(([tab, label]) =>
      `<button id="affTab-${tab}" class="btn-secondary${tab === 'commissions' ? ' active' : ''}"
        onclick="affSwitchTab('${tab}')" style="font-size:12px;padding:8px 16px;">${label}</button>`
    ).join('')}
  </div>

  <div id="affPane-commissions">${_affCommissionsPane(data.commissions || [])}</div>
  <div id="affPane-referrals" style="display:none;">${_affReferralsPane(data.referrals || [])}</div>
  <div id="affPane-payouts" style="display:none;"><div class="loading-spinner"><div class="spinner"></div><span>Loading payouts…</span></div></div>
  <div id="affPane-leaderboard" style="display:none;"><div class="loading-spinner"><div class="spinner"></div><span>Loading leaderboard…</span></div></div>
  `;

  // Load payouts pane async on tab click
}

// ─── Pane renderers ────────────────────────────────────────────────────────────

function _affCommissionsPane(commissions) {
  if (!commissions.length) return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted);">
      <div style="font-size:40px;margin-bottom:12px;">💸</div>
      <div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:6px;">No commissions yet</div>
      <div style="font-size:13px;">Share your link — earnings appear here once referrals order.</div>
    </div>`;

  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Date</th><th>From</th><th>Order Value</th><th>Commission</th><th>Status</th></tr></thead>
    <tbody>${commissions.map(c => {
      const st = c.status || 'pending';
      const cls = st === 'paid' ? 'completed' : st === 'pending' ? 'pending' : 'processing';
      return `<tr>
        <td style="font-size:12px;color:var(--muted);">${c.created_at ? new Date(c.created_at).toLocaleDateString('en-KE') : '—'}</td>
        <td>${esc(c.referral_name || '—')}</td>
        <td>${fmtKES(c.order_amount || 0)}</td>
        <td style="color:var(--green);font-weight:700;">+${fmtKES(c.commission_amount || 0)}</td>
        <td><span class="status-pill ${cls}">${st}</span></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function _affReferralsPane(referrals) {
  if (!referrals.length) return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted);">
      <div style="font-size:40px;margin-bottom:12px;">👥</div>
      <div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:6px;">No referrals yet</div>
      <div style="font-size:13px;">Share your link to start building your network.</div>
    </div>`;

  return `<div class="tbl-wrap"><table>
    <thead><tr><th>User</th><th>Orders</th><th>Total Spend</th><th>Joined</th></tr></thead>
    <tbody>${referrals.map(r => `<tr>
      <td>${esc(r.name || '—')} <span style="color:var(--muted);font-size:11px;">${esc(r.email || '')}</span></td>
      <td>${r.order_count || 0}</td>
      <td>${fmtKES(r.total_spend_kes || 0)}</td>
      <td style="font-size:12px;color:var(--muted);">${r.joined_at ? new Date(r.joined_at).toLocaleDateString('en-KE') : '—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function _loadPayoutsPane() {
  const pane = document.getElementById('affPane-payouts');
  if (!pane) return;
  try {
    const payouts = await api('/affiliate/payouts');
    if (!payouts.length) {
      pane.innerHTML = `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted);">
          <div style="font-size:40px;margin-bottom:12px;">💳</div>
          <div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:6px;">No payouts yet</div>
          <div style="font-size:13px;">Once you request a withdrawal, it appears here.</div>
        </div>`;
      return;
    }
    pane.innerHTML = `<div class="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Amount</th><th>M-Pesa</th><th>Status</th><th>Receipt</th></tr></thead>
      <tbody>${payouts.map(p => {
        const st = p.status || 'pending';
        const cls = st === 'paid' ? 'completed' : st === 'rejected' ? 'failed' : 'pending';
        return `<tr>
          <td style="font-size:12px;color:var(--muted);">${p.requested_at ? new Date(p.requested_at).toLocaleDateString('en-KE') : '—'}</td>
          <td style="font-weight:700;">${fmtKES(p.amount_kes)}</td>
          <td style="font-family:monospace;">${esc(p.mpesa_phone || '—')}</td>
          <td><span class="status-pill ${cls}">${st}</span></td>
          <td style="font-size:12px;color:var(--muted);">${p.mpesa_receipt ? esc(p.mpesa_receipt) : (p.admin_note ? `<span style="color:#ff9a3c;">${esc(p.admin_note)}</span>` : '—')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  } catch (e) {
    pane.innerHTML = `<div style="color:var(--muted);padding:20px;text-align:center;">Could not load payouts.</div>`;
  }
}

// ─── Tab switching ─────────────────────────────────────────────────────────────
function affSwitchTab(tab) {
  ['commissions', 'referrals', 'payouts', 'leaderboard'].forEach(t => {
    const btn  = document.getElementById('affTab-' + t);
    const pane = document.getElementById('affPane-' + t);
    if (btn)  btn.classList.toggle('active', t === tab);
    if (pane) pane.style.display = t === tab ? '' : 'none';
  });
  if (tab === 'payouts') _loadPayoutsPane();
  if (tab === 'leaderboard') _loadLeaderboardPane();
}

// ─── Copy / Share helpers ──────────────────────────────────────────────────────
function affCopyLink() {
  const val = document.getElementById('affLinkInput')?.value;
  if (val) navigator.clipboard.writeText(val).then(() => toast('Link copied!', 'success'));
}

function affCopyCode() {
  const input = document.getElementById('affLinkInput');
  if (!input) return;
  const url = input.value;
  const code = new URL(url).searchParams.get('ref') || '';
  if (code) navigator.clipboard.writeText(code).then(() => toast('Code copied: ' + code, 'success'));
}

function affShareWhatsApp() {
  const link = document.getElementById('affLinkInput')?.value || '';
  const msg  = encodeURIComponent(
    `🚀 I use EndaViral to grow my social media in Kenya!\n\n` +
    `Buy TikTok followers, Instagram likes, YouTube views & more — pay with M-Pesa.\n\n` +
    `Sign up here and we both benefit:\n${link}`
  );
  window.open('https://wa.me/?text=' + msg, '_blank');
}

function affShareTikTok() {
  const link = document.getElementById('affLinkInput')?.value || '';
  const text = `🇰🇪 Kenya's #1 SMM Panel — endaviral.co.ke\nBuy TikTok & IG growth via M-Pesa 📲\n${link}`;
  navigator.clipboard.writeText(text).then(() =>
    toast('TikTok bio text copied! Paste it into your TikTok bio.', 'success')
  );
}

// ─── Payout flow ──────────────────────────────────────────────────────────────
function affRequestPayout() {
  const modal = document.getElementById('affPayoutModal');
  if (!modal) { toast('Payout modal not found — check integration', 'error'); return; }
  document.getElementById('affPayoutAmount').value = '';
  document.getElementById('affPayoutPhone').value  = '';
  document.getElementById('affPayoutErr').style.display = 'none';
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

  if (isNaN(amount) || amount < AFF_MIN_PAYOUT) {
    errEl.textContent = `Minimum payout is KES ${AFF_MIN_PAYOUT}.`;
    errEl.style.display = 'block';
    return;
  }
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g,'');
  if (!cleaned || !/^(\+?254|0)[17]\d{8}$/.test(cleaned)) {
    errEl.textContent = 'Please enter a valid Safaricom number (07xx or 01xx).';
    errEl.style.display = 'block';
    return;
  }

  try {
    const resp = await api('/affiliate/payout', {
      method: 'POST',
      body: JSON.stringify({ amount, phone: cleaned }),
    });
    affClosePayoutModal();
    toast(`Payout of ${fmtKES(amount)} requested! You'll receive M-Pesa within 24h. 💸`, 'success');
    initAffiliatePage();
  } catch (e) {
    errEl.textContent = e.message || 'Payout request failed. Please try again.';
    errEl.style.display = 'block';
  }
}

// ─── Sidebar badge (pending balance ≥ KES 100) ────────────────────────────────
async function _updateAffiliateBadge() {
  if (!token || !currentUser) return;
  const badge = document.getElementById('affiliateBadge');
  if (!badge) return;
  try {
    _affCacheTs = 0; // bust cache after payout -- balances changed
    const d = await api('/affiliate/dashboard');
    _affCacheTs = Date.now();
    const p = d.pending_kes || 0;
    if (p >= 100) {
      badge.textContent   = fmtKES(p);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  } catch (_) {
    badge.style.display = 'none';
  }
}

// ─── Fallback data (API not yet deployed) ─────────────────────────────────────
function _affFallback() {
  const slug = (currentUser?.name || 'user').toLowerCase().replace(/\s+/g,'');
  const code = slug + Math.floor(Math.random() * 900 + 100);
  return {
    referral_code: code,
    referral_link: `https://endaviral.co.ke?ref=${code}`,
    total_referrals: 0,
    total_earned_kes: 0,
    pending_kes: 0,
    paid_kes: 0,
    referral_spend_kes: 0,
    pending_payout_count: 0,
    commissions: [],
    referrals: [],
  };
}
// ─── Leaderboard pane ──────────────────────────────────────────────────────────
// GET /affiliate/leaderboard → { leaderboard: [{rank, name, referrals, earned_kes, tier_name, tier_badge, is_me}], month_label, your_rank }
async function _loadLeaderboardPane() {
  const pane = document.getElementById('affPane-leaderboard');
  if (!pane) return;
  try {
    const resp = await api('/affiliate/leaderboard');
    const rows = resp.leaderboard || [];
    const monthLabel = resp.month_label || '';

    if (!rows.length) {
      pane.innerHTML = `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;text-align:center;color:var(--muted);">
          <div style="font-size:40px;margin-bottom:12px;">🏆</div>
          <div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:6px;">Leaderboard coming soon</div>
          <div style="font-size:13px;">Rankings reset on the 1st of each month. Be the first on the board!</div>
        </div>`;
      return;
    }

    const medal = ['🥇','🥈','🥉'];

    pane.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">
          🏆 TOP AFFILIATES ${monthLabel ? '— ' + monthLabel.toUpperCase() : 'THIS MONTH'}
        </div>
        ${resp.your_rank ? `<div style="font-size:12px;color:#ffd700;">Your rank this month: <strong>#${resp.your_rank}</strong></div>` : ''}
      </div>

      <!-- Top 3 podium -->
      <div style="display:flex;gap:12px;margin-bottom:20px;justify-content:center;flex-wrap:wrap;">
        ${rows.slice(0,3).map((r, i) => `
          <div style="flex:1;min-width:110px;max-width:160px;background:${r.is_me ? 'rgba(61,212,74,.1)' : 'var(--card)'};border:1px solid ${r.is_me ? 'rgba(61,212,74,.35)' : 'var(--border)'};border-radius:14px;padding:18px 12px;text-align:center;${i === 0 ? 'transform:translateY(-6px);' : ''}">
            <div style="font-size:28px;margin-bottom:4px;">${medal[i] || '#' + (i+1)}</div>
            <div style="font-size:13px;font-weight:800;color:var(--white);margin-bottom:2px;">${esc(r.name || 'Anonymous')}</div>
            <div style="font-size:11px;color:var(--muted);">${r.tier_badge || ''} ${esc(r.tier_name || '')}</div>
            <div style="font-size:16px;font-weight:900;color:var(--green);margin-top:8px;">${fmtKES(r.earned_kes || 0)}</div>
            <div style="font-size:10px;color:var(--muted);">${r.referrals || 0} referrals</div>
            ${r.is_me ? `<div style="font-size:10px;color:var(--green);margin-top:4px;font-weight:700;">← you</div>` : ''}
          </div>`).join('')}
      </div>

      <!-- Full table -->
      ${rows.length > 3 ? `
      <div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>Affiliate</th><th>Tier</th><th>Referrals</th><th>Earned (KES)</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr style="${r.is_me ? 'background:rgba(61,212,74,.06);' : ''}">
              <td style="font-weight:800;color:${r.rank <= 3 ? '#ffd700' : 'var(--muted)'};">
                ${r.rank <= 3 ? medal[r.rank-1] : '#' + r.rank}
              </td>
              <td>
                ${esc(r.name || 'Anonymous')}
                ${r.is_me ? `<span style="font-size:10px;color:var(--green);margin-left:6px;">you</span>` : ''}
              </td>
              <td style="font-size:12px;">${r.tier_badge || ''} ${esc(r.tier_name || '')}</td>
              <td style="font-size:13px;">${r.referrals || 0}</td>
              <td style="font-weight:700;color:var(--green);">${fmtKES(r.earned_kes || 0)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>` : ''}

      <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:16px;padding:12px;background:rgba(255,215,0,.05);border:1px solid rgba(255,215,0,.1);border-radius:10px;">
        🏅 #1 this month gets a <strong style="color:#ffd700;">bonus payout</strong> from EndaViral. Rankings reset on the 1st.
      </div>`;
  } catch (e) {
    pane.innerHTML = `<div style="color:var(--muted);padding:20px;text-align:center;">Could not load leaderboard.</div>`;
  }
}