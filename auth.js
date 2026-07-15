// ── Referral code capture ─────────────────────────────────────────────────────
// If the page was opened with ?ref=CODE, store it in sessionStorage so it
// survives the registration form interaction without showing in the URL.
(function () {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem('ev_ref_code', ref.trim());
    // Clean the ref param from the URL bar without a page reload
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', clean);
  }
})();

// ── JWT helpers ───────────────────────────────────────────────────────────────
function isTokenExpired(t) {
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch(_) { return true; }
}

// Load persisted session — clear immediately if the JWT has already expired.
let token = localStorage.getItem('ev_token') || null;
let currentUser = JSON.parse(localStorage.getItem('ev_user') || 'null');
if (token && isTokenExpired(token)) {
  localStorage.removeItem('ev_token');
  localStorage.removeItem('ev_user');
  token = null;
  currentUser = null;
}

function showLogin() {
  document.getElementById('loginBox').style.display = '';
  document.getElementById('regBox').style.display = 'none';
  document.getElementById('forgotBox').style.display = 'none';
  document.getElementById('loginBox').scrollIntoView({behavior:'smooth',block:'center'});
}
function showReg() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('regBox').style.display = '';
  document.getElementById('forgotBox').style.display = 'none';
  document.getElementById('regBox').scrollIntoView({behavior:'smooth',block:'center'});
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginErr');
  err.classList.remove('show');

  // ── Client-side validation ────────────────────────────────────────────────
  if (!email) {
    err.textContent = 'Please enter your email address.';
    err.classList.add('show');
    document.getElementById('loginEmail').focus();
    return;
  }
  if (!pass) {
    err.textContent = 'Please enter your password.';
    err.classList.add('show');
    document.getElementById('loginPass').focus();
    return;
  }

  // ── API call ──────────────────────────────────────────────────────────────
  try {
    const data = await api('/auth/login', { method:'POST', body:JSON.stringify({email, password:pass}) });
    token = data.token || data.access_token;
    currentUser = data.user || data;
    localStorage.setItem('ev_token', token);
    localStorage.setItem('ev_user', JSON.stringify(currentUser));
    initApp();
  } catch(e) {
    err.textContent = e.message || 'Login failed. Please try again.';
    err.classList.add('show');
  }
}

async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const err   = document.getElementById('regErr');
  err.classList.remove('show');

  // ── T&C check ─────────────────────────────────────────────────────────────
  if (!document.getElementById('tncCheck').checked) {
    document.getElementById('tncErr').classList.add('show');
    return;
  }
  document.getElementById('tncErr').classList.remove('show');

  // ── Client-side validation ────────────────────────────────────────────────
  if (!name || name.length < 2) {
    err.textContent = 'Please enter your full name (at least 2 characters).';
    err.classList.add('show');
    document.getElementById('regName').focus();
    return;
  }
  if (!email) {
    err.textContent = 'Please enter your email address.';
    err.classList.add('show');
    document.getElementById('regEmail').focus();
    return;
  }
  if (!email.toLowerCase().endsWith('@gmail.com')) {
    err.textContent = 'Only Gmail addresses (@gmail.com) are accepted.';
    err.classList.add('show');
    document.getElementById('regEmail').focus();
    return;
  }
  if (!pass || pass.length < 8) {
    err.textContent = 'Password must be at least 8 characters long.';
    err.classList.add('show');
    document.getElementById('regPass').focus();
    return;
  }

  // ── API call ──────────────────────────────────────────────────────────────
  try {
    const refCode = sessionStorage.getItem('ev_ref_code') || undefined;
    const data = await api('/auth/register', { method:'POST', body:JSON.stringify({name, email, password:pass, ref_code: refCode}) });
    token = data.token || data.access_token;
    currentUser = data.user || data;
    localStorage.setItem('ev_token', token);
    localStorage.setItem('ev_user', JSON.stringify(currentUser));
    sessionStorage.removeItem('ev_ref_code');  // clear after successful registration
    initApp();
    toast('Account created! Welcome to EndaViral 🚀', 'success');
  } catch(e) {
    err.textContent = e.message || 'Registration failed. Please try again.';
    err.classList.add('show');
  }
}

function doLogout() {
  idleStop();
  _stopBgTicketWatch();
  token = null; currentUser = null;
  localStorage.removeItem('ev_token');
  localStorage.removeItem('ev_user');
  // Compute-hour work also introduced two caches (the Store module and the
  // api() GET cache in index.html) that sit in front of the DB. Neither
  // knows "the user changed" on its own — without this, a second person
  // logging in on the same device/browser could briefly see the previous
  // user's cached orders/campaigns/stats until each cache's own TTL expired.
  if (typeof Store !== 'undefined') Store.reset();
  if (typeof _apiGetCache !== 'undefined') _apiGetCache.clear();
  document.getElementById('appWrap').classList.remove('show');
  document.getElementById('appWrap').style.display = 'none';
  document.getElementById('authWrap').style.display = '';
  showLogin();
}

// Dashboard fetch throttling is now handled by Store's TTL on the
// 'dashboardOrders' slice (see index.html). This used to be a pair of
// module-level vars (DASH_CACHE_TTL / _dashLastFetched) intended to skip
// re-fetching within 60s, but _dashLastFetched was never actually set or
// checked anywhere, so it never did anything — removed rather than fixed,
// since Store now covers the same intent properly.

function initApp() {
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('appWrap').style.display = 'flex';
  document.getElementById('appWrap').classList.add('show');
  const u = currentUser || {};
  const name = u.name || u.username || u.email || 'User';
  document.getElementById('sbUsername').textContent = name;
  document.getElementById('sbAvatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('sbRole').textContent = u.role === 'admin' ? '👑 Admin' : 'User';
  if (u.role === 'admin') {
    document.getElementById('adminNavSection').style.display = '';
    document.getElementById('adminNavItem').style.display = '';
  } else {
    // Belt-and-suspenders: ensure admin nav and page are completely hidden for non-admins
    document.getElementById('adminNavSection').style.display = 'none';
    document.getElementById('adminNavItem').style.display = 'none';
    document.getElementById('sec-admin').style.display = 'none';
  }
  loadDashboard();
  // loadServices is cache-aware (15-min TTL in index.html) -- will skip
  // the network fetch if the catalog is already warm. Safe to call here.
  loadServices();
  idleStart();
  _startBgTicketWatch();
  if (typeof _updateAffiliateBadge === 'function') _updateAffiliateBadge();
  // Boot chat widget now that token is available — loads existing support threads
  if (typeof evBootWidget === 'function') evBootWidget();
}


// ── Inactivity auto-logout ────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS  = 5 * 60 * 1000;   // 5 min until warning appears
const IDLE_WARNING_SEC = 60;               // 60s countdown before forced logout

let idleTimer       = null;
let idleCountTimer  = null;
let idleSecsLeft    = IDLE_WARNING_SEC;
let idleWarningUp   = false;
let idgeBadgeTimer  = null;

const IDLE_EVENTS = ['mousemove','mousedown','keydown','touchstart','scroll','click'];

function idleReset() {
  if (!token) return;             // not logged in — do nothing
  clearTimeout(idleTimer);
  clearInterval(idleCountTimer);
  if (idleWarningUp) idleHideWarning();
  idleTimer = setTimeout(idleShowWarning, IDLE_TIMEOUT_MS);
  idleFlashBadge();
}

function idleStart() {
  IDLE_EVENTS.forEach(e => document.addEventListener(e, idleReset, { passive: true }));
  idleReset();
}

function idleStop() {
  IDLE_EVENTS.forEach(e => document.removeEventListener(e, idleReset));
  clearTimeout(idleTimer);
  clearInterval(idleCountTimer);
}

function idleShowWarning() {
  if (!token) return;
  idleWarningUp = true;
  idleSecsLeft  = IDLE_WARNING_SEC;
  document.getElementById('idleCountdown').textContent  = idleSecsLeft;
  document.getElementById('idleCountdown').classList.remove('urgent');
  document.getElementById('idleProgressBar').style.width = '100%';
  document.getElementById('idleProgressBar').style.transition = 'none';
  document.getElementById('idleOverlay').classList.add('show');

  // force reflow so transition kicks in on next tick
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('idleProgressBar').style.transition = `width ${IDLE_WARNING_SEC}s linear`;
      document.getElementById('idleProgressBar').style.width = '0%';
    });
  });

  idleCountTimer = setInterval(() => {
    idleSecsLeft--;
    const el = document.getElementById('idleCountdown');
    el.textContent = idleSecsLeft;
    if (idleSecsLeft <= 10) el.classList.add('urgent');
    if (idleSecsLeft <= 0) {
      clearInterval(idleCountTimer);
      idleHideWarning();
      doLogout();
      toast('You were signed out due to inactivity.', 'error');
    }
  }, 1000);
}

function idleHideWarning() {
  idleWarningUp = false;
  clearInterval(idleCountTimer);
  document.getElementById('idleOverlay').classList.remove('show');
}

function idleStay() {
  idleHideWarning();
  idleReset();
}

function idleAdjust() {
  toast('Timeout is set to 5 minutes of inactivity.', 'success');
}

function idleFlashBadge() {
  const badge = document.getElementById('idleBadge');
  const text  = document.getElementById('idleBadgeText');
  if (!badge || !text) return;
  const mins  = Math.floor(IDLE_TIMEOUT_MS / 60000);
  text.textContent = `Auto-logout in ${mins}m`;
  badge.classList.add('show');
  clearTimeout(idgeBadgeTimer);
  idgeBadgeTimer = setTimeout(() => badge.classList.remove('show'), 2000);
}

function showForgot() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('regBox').style.display = 'none';
  document.getElementById('forgotBox').style.display = 'block';
  resetForgotForm();
  document.getElementById('forgotBox').scrollIntoView({behavior:'smooth',block:'center'});
}

function resetForgotForm() {
  document.getElementById('forgotStep1').style.display = '';
  document.getElementById('forgotStep2').style.display = 'none';
  document.getElementById('forgotErr').style.display = 'none';
  document.getElementById('forgotErr').textContent = '';
  document.getElementById('forgotEmail').value = '';
  document.getElementById('forgotSub').textContent = 'Enter your email to get a temporary password';
  const btn = document.getElementById('forgotBtn');
  btn.disabled = false;
  btn.textContent = 'Get Temporary Password →';
}

async function doForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  const errEl = document.getElementById('forgotErr');
  errEl.style.display = 'none';
  errEl.textContent = '';

  if (!email) {
    errEl.textContent = 'Please enter your email address.';
    errEl.style.display = 'block';
    document.getElementById('forgotEmail').focus();
    return;
  }

  const btn = document.getElementById('forgotBtn');
  btn.disabled = true;
  btn.textContent = 'Please wait…';

  try {
    const data = await api('/auth/forgot-password', { method:'POST', body:JSON.stringify({email}) });

    if (data.found && data.temp_password) {
      // Show the password on-screen
      document.getElementById('forgotTempPass').textContent = data.temp_password;
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = '';
      document.getElementById('forgotSub').textContent = 'Copy your temporary password below';
    } else {
      // Email not registered — generic message, no enumeration leak
      errEl.textContent = 'No account found with that email address.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Get Temporary Password →';
    }
  } catch(e) {
    errEl.textContent = e.message || 'Something went wrong. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Get Temporary Password →';
  }
}

function copyTempPassword() {
  const pass = document.getElementById('forgotTempPass').textContent;
  if (!pass) return;
  navigator.clipboard.writeText(pass).then(() => {
    const btn = document.getElementById('forgotCopyBtn');
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = '📋'; }, 2000);
  }).catch(() => {
    // Fallback for older browsers / http
    const el = document.getElementById('forgotTempPass');
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
}

if (token && currentUser) { initApp(); }
else { document.getElementById('authWrap').style.display = 'block'; document.getElementById('appWrap').style.display = 'none'; }