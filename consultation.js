/* ════════════════════ HIRE ENDAVIRAL: TIERED BOOKING ════════════════════
 * Four packages, one modal:
 *   Quick Fix KES 500 → Growth Plan KES 1,000 → Money Plan KES 1,500
 *   → Account Management & Growth KES 5,000/month
 *
 * Step 1 — pick a package (skipped when a CTA passes a tier key)
 * Step 2 — account handle + goal (so the team reviews BEFORE the call),
 *          contact details, then M-Pesa STK push
 * Step 3 — paid confirmation that says exactly what happens next
 *
 * Prices here are DISPLAY ONLY. The server prices every booking from
 * CONSULTATION_TIERS in consultation_models.py and only receives the tier
 * key — keep the two in sync if you change a price.
 *
 * consultOpenBooking(tierKey?) is shared by the dashboard tile and the
 * landing page CTAs. Without a session it sends the person to log in.
 *
 * Depends on: api(), toast(), token, currentUser — globals from index.html
 * HTML this expects: #consultBookModal and the ids referenced below.
 * ════════════════════════════════════════════════════════════════════════ */

const CONSULT_TIERS = [
  // outcome = the promise · bullets = what they get + why it matters
  // value = the "cheap for what it is" line · cta = button text
  {
    key: 'quick_fix', name: 'Quick Fix', price: 500, per: '',
    outcome: 'Stop guessing. Find the 3 things killing your reach.',
    bullets: [
      '20-min call: a strategist goes through 1 account with you',
      'Your top 3 fixes in writing on WhatsApp, yours to keep',
      'Talk within 3 days, not weeks',
    ],
    value: 'One fix you would never spot alone can beat months of posting blind.',
    cta: 'Get my 3 fixes',
    eta: 'within 3 days',
  },
  {
    key: 'growth_plan', name: 'Growth Plan', price: 1000, per: '', popular: true,
    outcome: 'Never wonder what to post again. Your next 30 days, planned.',
    bullets: [
      '45-min call. We study your account <b>before</b> we ring',
      'Bio, highlights &amp; pinned posts rewritten to turn visitors into followers',
      '30-day content + boost plan: what to post, when, and what to boost',
      '7 days of WhatsApp follow-up. Stuck? Just message us',
    ],
    value: 'About KES 33 a day for a full month of direction.',
    cta: 'Get my 30-day plan',
    eta: 'within 48 hours',
  },
  {
    key: 'money_plan', name: 'Money Plan', price: 1500, per: '',
    outcome: 'Your followers are worth money. Start charging for them.',
    bullets: [
      'Everything in Growth Plan, plus:',
      '60-min call · up to 2 accounts',
      'Your own rate card so you know what to charge brands, <b>or</b> a DM-to-sale script that turns chats into M-Pesa payments',
      '14 days of follow-up + a check-in call to keep you on track',
    ],
    value: 'Only KES 500 more than Growth. One brand deal or a few sales covers it.',
    cta: 'Start earning from my page',
    eta: 'within 24 hours',
  },
  {
    key: 'management', name: 'Account Management', price: 5000, per: '/month', monthly: true,
    outcome: 'Stop doing it all yourself. We run your page, you run your business.',
    bullets: [
      '12 posts a month, edited &amp; captioned. Your page never goes quiet',
      'Monthly content calendar, planned ahead for you',
      'KES 1,000 of boosts included every month at no extra cost',
      'Monthly results report on WhatsApp so you see exactly what you got',
    ],
    value: 'Boosts included, so each done-for-you post works out to about KES 333. Month to month, no contract.',
    cta: 'Hand it over this month',
    eta: 'within 24 hours',
  },
];

const CONSULT_GOALS = [
  ['sales', 'Get more customers'],
  ['brand_deals', 'Land brand deals'],
  ['grow_audience', 'Grow my audience'],
  ['engagement', 'More likes & comments'],
];

let _consultPollTimer = null;
let _consultTier = null;
let _consultGoal = '';
let _consultCredit = 0;

const _kes = n => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const _tierByKey = k => CONSULT_TIERS.find(t => t.key === k);

function _consultStep(n) {
  ['consultStepTiers', 'consultStepDetails', 'consultStepDone'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (i + 1 === n) ? '' : 'none';
  });
}

function consultOpenBooking(tierKey) {
  const modal = document.getElementById('consultBookModal');
  if (!modal) return;
  if (!token) {
    toast('Please log in or create a free account to book', 'error');
    const loginBox = document.getElementById('loginBox');
    if (loginBox) loginBox.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  document.getElementById('consultName').value = currentUser?.display_name || '';
  document.getElementById('consultPhone').value = currentUser?.phone || '';
  document.getElementById('consultEmail').value = currentUser?.email || '';
  document.getElementById('consultBusiness').value = '';
  document.getElementById('consultHandle').value = '';
  document.getElementById('consultNotes').value = '';
  document.getElementById('consultBookStatus').textContent = '';
  _consultGoal = '';
  _renderConsultGoals();
  _renderConsultTiers();
  modal.classList.add('show');
  if (tierKey && _tierByKey(tierKey)) consultSelectTier(tierKey);
  else _consultStep(1);
}

function _tierCardsHTML(onclickFn) {
  return CONSULT_TIERS.map(t => `
    <button type="button" class="hv-tier${t.popular ? ' hv-tier-pop' : ''}${t.monthly ? ' hv-tier-monthly' : ''}" onclick="${onclickFn}('${t.key}')">
      ${t.popular ? '<span class="hv-tier-badge">Most popular</span>' : ''}
      <div class="hv-tier-head">
        <span class="hv-tier-name">${t.name}</span>
        <span class="hv-tier-price">${_kes(t.price)}<small>${t.per}</small></span>
      </div>
      <div class="hv-tier-outcome">${t.outcome}</div>
      <ul class="hv-tier-list">${t.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      ${t.value ? `<div class="hv-tier-value">💡 ${t.value}</div>` : ''}
      <span class="hv-tier-go">${t.cta || (t.monthly ? 'Start this month' : 'Choose ' + t.name)} →</span>
    </button>
  `).join('');
}

function _renderConsultTiers() {
  const el = document.getElementById('consultTierList');
  if (el) el.innerHTML = _tierCardsHTML('consultSelectTier');
}

// Landing page ladder — public; consultOpenBooking() handles the login gate
function renderLandingTiers() {
  const el = document.getElementById('lpTierGrid');
  if (el) el.innerHTML = _tierCardsHTML('consultOpenBooking');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderLandingTiers);
else renderLandingTiers();

function _renderConsultGoals() {
  const el = document.getElementById('consultGoalChips');
  if (!el) return;
  el.innerHTML = CONSULT_GOALS.map(([k, label]) =>
    `<button type="button" class="hv-chip${_consultGoal === k ? ' on' : ''}" onclick="consultPickGoal('${k}')">${label}</button>`
  ).join('');
}

function consultPickGoal(k) {
  _consultGoal = k;
  _renderConsultGoals();
}

async function consultSelectTier(key) {
  const t = _tierByKey(key);
  if (!t) return;
  _consultTier = t;
  _consultCredit = 0;
  _renderConsultSummary();
  _consultStep(2);
  if (t.monthly) {
    try {
      const c = await api('/consultations/credit');
      _consultCredit = c?.credit_kes || 0;
    } catch (e) { _consultCredit = 0; }
    if (_consultTier === t) _renderConsultSummary();
  }
}

function consultBackToTiers() { _consultStep(1); }

function _renderConsultSummary() {
  const t = _consultTier;
  if (!t) return;
  const due = t.price - (t.monthly ? _consultCredit : 0);
  document.getElementById('consultTierSummary').innerHTML = `
    <div class="hv-sum-name">${t.name}</div>
    <div class="hv-sum-outcome">${t.outcome}</div>`;
  document.getElementById('consultPriceBox').innerHTML = `
    ${t.monthly && _consultCredit ? `
      <div class="hv-price-row"><span>Account Management, month 1</span><span>${_kes(t.price)}</span></div>
      <div class="hv-price-row hv-credit"><span>Your consult fee, credited</span><span>− ${_kes(_consultCredit)}</span></div>` : ''}
    <div class="hv-price-row hv-total"><span>${t.monthly ? 'Pay today' : 'Total'}</span><span>${_kes(due)}</span></div>
    <div class="hv-price-note">${t.monthly
      ? 'Month to month, no contract. We onboard you within 24 hours.'
      : 'Going monthly later? This fee comes off your first month of Account Management.'}</div>`;
  document.getElementById('consultPayBtn').textContent = `Pay ${_kes(due)} with M-Pesa`;
}

async function consultConfirmBooking() {
  const t = _consultTier;
  if (!t) { _consultStep(1); return; }
  const name = document.getElementById('consultName').value.trim();
  const phone = document.getElementById('consultPhone').value.trim();
  const email = document.getElementById('consultEmail').value.trim();
  const business_name = document.getElementById('consultBusiness').value.trim();
  const social_handle = document.getElementById('consultHandle').value.trim();
  const notes = document.getElementById('consultNotes').value.trim();
  const statusEl = document.getElementById('consultBookStatus');

  if (!social_handle) { toast('Add the account you want us to look at', 'error'); return; }
  if (!_consultGoal) { toast('Pick your main goal', 'error'); return; }
  if (!name) { toast('Enter your name', 'error'); return; }
  if (!/^0[71]\d{8}$|^254[71]\d{8}$/.test(phone)) {
    toast('Enter a valid M-Pesa phone number', 'error');
    return;
  }

  statusEl.textContent = 'Sending M-Pesa prompt…';
  try {
    const res = await api('/consultations/book', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, business_name, notes, social_handle, goal: _consultGoal, tier: t.key }),
    });
    statusEl.textContent = `Check your phone and enter your M-Pesa PIN (${_kes(res.amount_kes)})…`;
    _pollConsultPayment(res.checkout_request_id, { phone, social_handle });
  } catch (e) {
    statusEl.textContent = '';
    toast(e.message, 'error');
  }
}

function _showConsultDone({ phone, social_handle }) {
  const t = _consultTier;
  document.getElementById('consultDoneBody').innerHTML = `
    <div class="hv-done-tick">✓</div>
    <div class="hv-done-title">You're booked: ${t.name}</div>
    <div class="hv-done-steps">
      <div><b>1</b><span>We're reviewing <strong>${String(social_handle).replace(/[<>&"]/g, '')}</strong> now, before we talk.</span></div>
      <div><b>2</b><span>We'll call <strong>${String(phone).replace(/[<>&"]/g, '')}</strong> ${t.eta} to ${t.monthly ? 'onboard you' : 'set your call time'}.</span></div>
      <div><b>3</b><span>${t.monthly ? 'Your first posts go out in week one.' : 'You get your plan in writing on WhatsApp after the call.'}</span></div>
    </div>`;
  _consultStep(3);
}

function consultCloseBooking() {
  const modal = document.getElementById('consultBookModal');
  if (modal) modal.classList.remove('show');
  if (_consultPollTimer) { clearInterval(_consultPollTimer); _consultPollTimer = null; }
}

function _pollConsultPayment(checkoutId, ctx) {
  if (_consultPollTimer) clearInterval(_consultPollTimer);
  const statusEl = document.getElementById('consultBookStatus');
  let attempts = 0;
  _consultPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 30) { // ~90s at 3s interval
      clearInterval(_consultPollTimer);
      statusEl.textContent = 'Still waiting. If your M-Pesa PIN went through, we\'ll be in touch shortly regardless.';
      return;
    }
    try {
      const res = await api(`/consultations/status/${checkoutId}`);
      if (res.status === 'success') {
        clearInterval(_consultPollTimer);
        _consultPollTimer = null;
        statusEl.textContent = '';
        toast('Payment confirmed!', 'success');
        _showConsultDone(ctx);
      } else if (res.status === 'failed' || res.status === 'cancelled') {
        clearInterval(_consultPollTimer);
        statusEl.textContent = '';
        toast('Payment was not completed. You can try again.', 'error');
      }
    } catch (e) {
      // transient poll error — keep trying until attempts run out
    }
  }, 3000);
}