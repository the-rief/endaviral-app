// ═══════════════════════════════════════════════════════════════════════════
// PaymentEvents — real-time payment status via SSE
// ═══════════════════════════════════════════════════════════════════════════
//
// Wraps the ticket-based stream from app/routers/events.py:
//   1. POST /connect/events/ticket   – normal authenticated request, mints
//      a one-time 60s ticket (EventSource can't send an Authorization header)
//   2. GET  /connect/events?ticket=… – long-lived EventSource connection
//
// This does NOT replace the existing poll loops in index.html
// (startPaymentPoll / startDepPoll) — the backend's recommended pattern is
// poll + push together, poll as the reliability fallback, push for instant
// updates. This module just wakes a listener up the moment the backend
// (Nexus's webhook, or the background reconciler) resolves a payment,
// instead of it waiting for its next scheduled poll tick. Each listener's
// callback re-checks /payments/status itself — this is a "check now"
// nudge, not a second source of truth for the payment result.
//
// USAGE:
//   PaymentEvents.onPaymentStatus(checkoutRequestId, (evt) => { ... });
//   PaymentEvents.off(checkoutRequestId);   // call when you stop polling
//
// Requires `api`, `token`, and `API` to already be defined globally (see
// the inline <script> block in index.html) — safe because this module only
// *calls* them lazily, inside functions triggered by user actions, never
// at parse time.
// ═══════════════════════════════════════════════════════════════════════════

const PaymentEvents = (() => {
  let source = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;          // starts at 1s, backs off to MAX below
  const MAX_RECONNECT_DELAY = 15000;
  let closed = true;                  // true until the first listener registers

  const listeners = new Map();        // checkoutRequestId -> callback

  async function _mintTicket() {
    const res = await api('/connect/events/ticket', { method: 'POST' });
    return res.ticket;
  }

  async function _connect() {
    if (closed) return;
    if (typeof token === 'undefined' || !token) return; // not logged in — nothing to stream
    if (source) return; // already connected

    let ticket;
    try {
      ticket = await _mintTicket();
    } catch (_) {
      _scheduleReconnect();
      return;
    }

    const url = API + '/connect/events?ticket=' + encodeURIComponent(ticket);
    source = new EventSource(url);

    source.onopen = () => { reconnectDelay = 1000; };

    source.onmessage = (msg) => {
      let evt;
      try { evt = JSON.parse(msg.data); } catch (_) { return; }
      if (!evt || evt.type !== 'payment_status' || !evt.checkoutRequestId) return;
      const cb = listeners.get(evt.checkoutRequestId);
      if (cb) cb(evt);
    };

    source.onerror = () => {
      if (source) { source.close(); source = null; }
      if (!closed) _scheduleReconnect();
    };
  }

  function _scheduleReconnect() {
    if (reconnectTimer || closed) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      _connect();
    }, reconnectDelay);
  }

  function onPaymentStatus(checkoutRequestId, cb) {
    if (!checkoutRequestId) return;
    listeners.set(checkoutRequestId, cb);
    if (closed) {
      closed = false;
      reconnectDelay = 1000;
      _connect();
    }
  }

  function off(checkoutRequestId) {
    if (!checkoutRequestId) return;
    listeners.delete(checkoutRequestId);
    // Connection stays open even at zero listeners — cheap to hold and
    // avoids a mint-ticket round trip every time a new payment starts.
    // disconnect() below is for logout, where we actually want it gone.
  }

  function disconnect() {
    closed = true;
    listeners.clear();
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (source) { source.close(); source = null; }
  }

  return { onPaymentStatus, off, disconnect };
})();