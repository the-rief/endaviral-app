/* ════════════════════ HIRE ENDAVIRAL: TIERED BOOKING ════════════════════
 * Four packages, one modal:
 *   Smart Growth Call KES 300 → Creator Plan KES 1,000 → Business Plan KES 2,500
 *   → We Run It KES 5,000/month SERVICE FEE (growth services paid separately)
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

// Copy rules (customers found the old cards wordy and couldn't see why to
// pay even KES 500): one "for you if…" line so people self-select in a
// second, one plain promise, max 3–4 short bullets, one line on why the
// price is worth it. Deliverables are unchanged — only the wording is.
const CONSULT_TIERS = [
  {
    key: 'smart_growth', name: 'Smart Growth Call', price: 300, per: '',
    who: 'You want every shilling you spend on growth to count',
    outcome: 'Learn how to use EndaViral services for the best, longest-lasting growth.',
    bullets: [
      '30-min call with an EndaViral growth expert',
      'Which services fit your goal — and how to pick the right package',
      'When and how to order so your post keeps growing on its own',
      'A simple plan for your budget, sent to your WhatsApp',
    ],
    value: 'The right service at the right time grows your page further — and keeps it growing.',
    cta: 'Book for KES 300',
    eta: 'within 48 hours',
  },
  {
    key: 'creator_plan', name: 'Creator Plan', price: 1000, per: '', popular: true,
    who: 'You\'re a creator who wants to grow and land brand deals',
    outcome: 'A clear 30-day plan to grow — and know what to charge brands.',
    bullets: [
      '45-min call — we study your page first',
      'Bio & profile rewritten so visitors follow',
      '30-day plan: what to post, when, and what to boost',
      'Your rate card: what to charge brands',
      '7 days of WhatsApp help',
    ],
    value: 'About KES 33 a day — and one brand deal pays it back.',
    cta: 'Get my creator plan',
    eta: 'within 48 hours',
  },
  {
    key: 'business_plan', name: 'Business Plan', price: 2500, per: '',
    who: 'You run a business and want more customers from social media',
    outcome: 'Turn your page into a place that brings in customers.',
    bullets: [
      '60-min call, up to 2 accounts',
      'Your page set up so visitors become customers',
      '30-day content & boost plan for your business',
      'A chat script that turns DMs into M-Pesa sales',
      '14 days of WhatsApp help + a check-in call',
    ],
    value: 'A few extra sales pay for it.',
    cta: 'Get my business plan',
    eta: 'within 24 hours',
  },
  {
    key: 'management', name: 'We Run It', price: 5000, per: '/month', monthly: true,
    who: 'You\'re too busy to manage your page',
    outcome: 'We run your page. You run your business.',
    bullets: [
      '12 posts a month, edited & captioned for you',
      'Monthly content calendar, planned for you',
      'We pick and order the right EndaViral services for your page',
      'Monthly results report on WhatsApp',
      'No contract — stop any month',
    ],
    note: 'KES 5,000 is our monthly service fee. EndaViral growth services (followers, views, boosts) are paid separately at normal prices — you approve each one.',
    value: 'Like having a social media manager, without a full salary.',
    cta: 'Start this month',
    eta: 'within 24 hours',
  },
];

const CONSULT_GOALS = [
  ['sales', '🛒 More customers'],
  ['brand_deals', '🤝 Brand deals'],
  ['grow_audience', '📈 More followers'],
  ['engagement', '❤️ More likes & comments'],
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
        <span class="hv-tier-price">${_kes(t.price)}<small>${t.per}${t.monthly ? ' service fee' : ''}</small></span>
      </div>
      <div class="hv-tier-who">For you if: ${t.who}</div>
      <div class="hv-tier-outcome">${t.outcome}</div>
      <ul class="hv-tier-list">${t.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      ${t.note ? `<div class="hv-tier-note">ℹ️ ${t.note}</div>` : ''}
      ${t.value ? `<div class="hv-tier-value">${t.value}</div>` : ''}
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
      <div class="hv-price-row"><span>We Run It service fee, month 1</span><span>${_kes(t.price)}</span></div>
      <div class="hv-price-row hv-credit"><span>Your consult fee, credited</span><span>− ${_kes(_consultCredit)}</span></div>` : ''}
    <div class="hv-price-row hv-total"><span>${t.monthly ? 'Pay today' : 'Total'}</span><span>${_kes(due)}</span></div>
    <div class="hv-price-note">${t.monthly
      ? 'This is our service fee only. Growth services we order for your page are paid separately — we ask you first. No contract.'
      : 'Upgrade to We Run It within 30 days and we take this fee off.'}</div>`;
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

  if (!social_handle) { toast('Add your page name or link so we can check it', 'error'); return; }
  if (!_consultGoal) { toast('Tap what you want most', 'error'); return; }
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
    statusEl.textContent = `📲 Check your phone and enter your M-Pesa PIN to pay ${_kes(res.amount_kes)}.`;
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
      <div><b>1</b><span>We're checking <strong>${String(social_handle).replace(/[<>&"]/g, '')}</strong> now.</span></div>
      <div><b>2</b><span>We'll call <strong>${String(phone).replace(/[<>&"]/g, '')}</strong> ${t.eta} to ${t.monthly ? 'get started' : 'pick a time that suits you'}.</span></div>
      <div><b>3</b><span>${t.monthly ? 'Your first posts go out in week one.' : 'After the call, your fixes come to your WhatsApp.'}</span></div>
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
      statusEl.textContent = 'Still waiting for M-Pesa. If you entered your PIN, you\'re booked — we\'ll call you. Please don\'t pay again.';
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