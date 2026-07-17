// ═══════════════════════════════════════════════════════════════════════════
// PaymentEvents — real-time payment status via SSE
// ═══════════════════════════════════════════════════════════════════════════
//
// FIX: this module used to open its OWN EventSource connection (with its
// own /connect/events/ticket mint + its own reconnect loop), completely
// separate from the one auth.js opens for new_message/ticket events. Every
// payment flow (checkout, deposit, escrow funding, academy purchase) was
// therefore running TWO parallel long-lived connections per tab, each
// independently minting tickets and reconnecting on its own schedule —
// doubling ticket-mint traffic (and whatever DB cost that carries) for the
// whole duration of the payment flow, on top of the reconnect-storm issue
// events.py's heartbeat fix addresses separately.
//
// There is exactly one /connect/events stream per logged-in tab now, owned
// by auth.js's startEventStream(). payment_status events arrive on that
// same stream alongside new_message/ticket events, and auth.js forwards
// them here via PaymentEvents._dispatch(evt). This module no longer touches
// EventSource, ticket minting, or reconnection at all — it's just the
// checkoutRequestId -> callback registry that the rest of the app already
// calls into.
//
// PUBLIC API IS UNCHANGED — no call sites in academy.js, bids.js, or
// index.html need to change:
//   PaymentEvents.onPaymentStatus(checkoutRequestId, (evt) => { ... });
//   PaymentEvents.off(checkoutRequestId);   // call when you stop polling
//
// Each listener's callback re-checks /payments/status itself — this is a
// "check now" nudge, not a second source of truth for the payment result,
// same as before.
//
// Requires auth.js to be loaded (for the shared stream) — safe regardless
// of <script> tag order since nothing here runs at parse time, only inside
// functions called later, same as before.
// ═══════════════════════════════════════════════════════════════════════════

const PaymentEvents = (() => {
  const listeners = new Map(); // checkoutRequestId -> callback

  function onPaymentStatus(checkoutRequestId, cb) {
    if (!checkoutRequestId) return;
    listeners.set(checkoutRequestId, cb);
    // Make sure the shared stream is actually up. Normally it's already
    // running (initApp() starts it on login, well before any payment flow
    // can begin), but this is a harmless no-op if so — startEventStream()
    // returns immediately when _evtSource is already set.
    if (typeof startEventStream === 'function') startEventStream();
  }

  function off(checkoutRequestId) {
    if (!checkoutRequestId) return;
    listeners.delete(checkoutRequestId);
    // No connection to tear down here anymore — the shared stream stays
    // open/closed based on login state, managed entirely by auth.js.
  }

  // Called by auth.js's onmessage handler when a payment_status event
  // arrives on the shared stream. Not part of the public API other modules
  // should call directly.
  function _dispatch(evt) {
    if (!evt || !evt.checkoutRequestId) return;
    const cb = listeners.get(evt.checkoutRequestId);
    if (cb) cb(evt);
  }

  // Called by auth.js's stopEventStream() on logout — drops any listeners
  // left over from an in-flight payment flow so a stale callback can't fire
  // for the next user on a shared device.
  function _clear() {
    listeners.clear();
  }

  // Kept for backwards compatibility with any stray call site expecting
  // the old explicit-disconnect API — the shared stream's lifecycle is
  // owned by auth.js now, so this just clears listeners same as _clear().
  function disconnect() {
    _clear();
  }

  return { onPaymentStatus, off, disconnect, _dispatch, _clear };
})();