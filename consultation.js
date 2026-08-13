/* ════════════════════ HIRE ENDAVIRAL: CONSULTATION BOOKING ════════════════════
 * Public, no-login KES 500 consult booking. Pays via M-Pesa STK push, polls
 * for confirmation, then just tells the person the team will call them to
 * set up the Google Meet — no in-app scheduling here at all.
 *
 * Depends on: api(), toast() — globals from index.html
 * HTML this expects: #consultBookModal + the field ids referenced below
 * (see the modal markup added next to the Creator Events buy modal).
 * ════════════════════════════════════════════════════════════════════════ */

let _consultPollTimer = null;

function consultOpenBooking() {
  const modal = document.getElementById('consultBookModal');
  if (!modal) return;
  document.getElementById('consultName').value = '';
  document.getElementById('consultPhone').value = '';
  document.getElementById('consultEmail').value = '';
  document.getElementById('consultBusiness').value = '';
  document.getElementById('consultNotes').value = '';
  document.getElementById('consultBookStatus').textContent = '';
  modal.style.display = 'flex';
}

function consultCloseBooking() {
  const modal = document.getElementById('consultBookModal');
  if (modal) modal.style.display = 'none';
  if (_consultPollTimer) { clearInterval(_consultPollTimer); _consultPollTimer = null; }
}

async function consultConfirmBooking() {
  const name = document.getElementById('consultName').value.trim();
  const phone = document.getElementById('consultPhone').value.trim();
  const email = document.getElementById('consultEmail').value.trim();
  const business_name = document.getElementById('consultBusiness').value.trim();
  const notes = document.getElementById('consultNotes').value.trim();
  const statusEl = document.getElementById('consultBookStatus');

  if (!name) { toast('Enter your name', 'error'); return; }
  if (!/^0[71]\d{8}$|^254[71]\d{8}$/.test(phone)) {
    toast('Enter a valid M-Pesa phone number', 'error');
    return;
  }

  statusEl.textContent = 'Sending M-Pesa prompt…';
  try {
    const res = await api('/consultations/book', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, business_name, notes }),
    });
    statusEl.textContent = 'Check your phone and enter your M-Pesa PIN…';
    _pollConsultPayment(res.checkout_request_id);
  } catch (e) {
    statusEl.textContent = '';
    toast(e.message, 'error');
  }
}

function _pollConsultPayment(checkoutId) {
  if (_consultPollTimer) clearInterval(_consultPollTimer);
  const statusEl = document.getElementById('consultBookStatus');
  let attempts = 0;
  _consultPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 30) { // ~90s at 3s interval
      clearInterval(_consultPollTimer);
      statusEl.textContent = 'Still waiting — if your M-Pesa PIN went through, we\'ll be in touch shortly regardless.';
      return;
    }
    try {
      const res = await api(`/consultations/status/${checkoutId}`);
      if (res.status === 'success') {
        clearInterval(_consultPollTimer);
        statusEl.textContent = '';
        toast('Payment confirmed! We\'ll call you shortly to set up your Google Meet.', 'success');
        consultCloseBooking();
      } else if (res.status === 'failed' || res.status === 'cancelled') {
        clearInterval(_consultPollTimer);
        statusEl.textContent = '';
        toast('Payment was not completed. You can try again.', 'error');
      }
      // else still pending — keep polling
    } catch (e) {
      // transient poll error — keep trying silently until attempts run out
    }
  }, 3000);
}