// ═══════════════════════════════════════════════════════════════════════════
// EndaViral Store — lightweight frontend state manager (vanilla JS, no deps)
// ═══════════════════════════════════════════════════════════════════════════
//
// WHY THIS EXISTS
// Every page/module (index.html, connect.js, bids.js, academy.js, admin.js)
// was independently tracking its own "have I fetched this yet / is it stale"
// state via ad-hoc globals (allOrders, _servicesCacheTs, _cnUnreadByCampaign,
// _adminStatsCacheTs, ...). That works, but it means:
//   - the SAME data (e.g. orders) gets fetched separately by whichever page
//     happens to need it, with no shared cache between them
//   - "is this stale" logic is copy-pasted and slightly different every time
//   - nothing tells page B that page A just changed something, so page B
//     either re-fetches blindly or shows stale data until its own poll ticks
//
// This module formalizes that pattern into one place: a small in-memory
// store with (a) a get/set for shared state, (b) subscribe() so any part of
// the UI can react when a slice changes, and (c) ensure()/invalidate() so
// "fetch it once, share it everywhere, refetch only when actually stale or
// explicitly told to" becomes one line instead of a bespoke cache per file.
//
// This is intentionally NOT Redux/Zustand/etc. No middleware, no reducers,
// no framework. ~120 lines, does one job, works with plain <script> tags.
//
// USAGE
//   // Read (fetches once, shares the cached result on every subsequent call
//   // within the TTL window, dedupes concurrent callers):
//   const orders = await Store.ensure('orders', () => api('/orders?limit=50'));
//
//   // React to changes anywhere (e.g. a badge that should update the moment
//   // orders change, without polling itself):
//   Store.subscribe('orders', (orders) => renderOrderCount(orders.length));
//
//   // After a mutation, tell the store that slice is stale so the NEXT
//   // ensure() call re-fetches instead of serving the old cached value:
//   await api('/orders', { method: 'POST', body: ... });
//   Store.invalidate('orders');
//
//   // Force a synchronous read of whatever's cached right now (no fetch):
//   const cached = Store.get('orders'); // null if never fetched
// ═══════════════════════════════════════════════════════════════════════════

const Store = (() => {
  // Known top-level slices. Not enforced (any key works), just documents the
  // shape the rest of the app expects to find here as the migration lands.
  const state = {
    profile: null,
    dashboard: null,
    orders: null,
    campaigns: null,
    notifications: null,
    academy: null,
    services: null,
  };

  const staleAt   = {};              // key -> timestamp after which cached value is considered stale
  const inFlight  = {};              // key -> Promise, dedupes concurrent ensure() calls for the same key
  const listeners = new Map();       // key -> Set<callback>

  const DEFAULT_TTL = 15000;         // 15s — deliberately short; this is about deduping bursts of reads, not being a long-lived cache

  function get(key) {
    return state[key];
  }

  function set(key, value, { ttl = DEFAULT_TTL, notify = true } = {}) {
    state[key] = value;
    staleAt[key] = Date.now() + ttl;
    if (notify) _emit(key, value);
    return value;
  }

  // Marks a slice stale so the next ensure() call re-fetches, and optionally
  // clears the value immediately (useful when you know the old value is
  // actively wrong, e.g. after a delete, vs. just "might be outdated").
  function invalidate(key, { clear = false } = {}) {
    staleAt[key] = 0;
    if (clear) {
      state[key] = null;
      _emit(key, null);
    }
  }

  function invalidateAll() {
    Object.keys(staleAt).forEach(k => { staleAt[k] = 0; });
  }

  // The core primitive: "give me this slice — fetch it if we don't have a
  // fresh copy, otherwise hand back what's cached, and if ten callers ask
  // at the same instant only fire one network request."
  async function ensure(key, fetcher, { ttl = DEFAULT_TTL, force = false } = {}) {
    const fresh = !force && state[key] != null && staleAt[key] > Date.now();
    if (fresh) return state[key];

    if (inFlight[key]) return inFlight[key];

    const p = Promise.resolve(fetcher())
      .then(data => {
        set(key, data, { ttl });
        return data;
      })
      .finally(() => { delete inFlight[key]; });

    inFlight[key] = p;
    return p;
  }

  function subscribe(key, cb) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(cb);
    return () => listeners.get(key)?.delete(cb); // returns an unsubscribe fn
  }

  function _emit(key, value) {
    listeners.get(key)?.forEach(cb => {
      try { cb(value); } catch (e) { console.error(`[Store] listener for "${key}" threw`, e); }
    });
  }

  // Wipe everything — call on logout so the next session never sees a
  // previous user's cached data on a shared device.
  function reset() {
    Object.keys(state).forEach(k => { state[k] = null; });
    Object.keys(staleAt).forEach(k => { delete staleAt[k]; });
    Object.keys(inFlight).forEach(k => { delete inFlight[k]; });
    listeners.forEach((set, key) => _emit(key, null));
  }

  return { get, set, ensure, invalidate, invalidateAll, subscribe, reset };
})();