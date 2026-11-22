/* EndaViral service worker.
   - Pages, scripts and styles: network first, so every deploy shows straight away; the saved copy is only used offline.
   - Images: saved copy first, refreshed in the background.
   - Nothing from the API (another address) is ever saved: orders, wallet and payments always come live.
   - Staff notifications (admins and Customer Care Reps), like WhatsApp. */
const VERSION = "ev-v2";
const CORE = ["/", "/favicon-192.png?v=2", "/favicon-512.png?v=2", "/apple-touch-icon.png?v=2"];

self.addEventListener("install", (e) => {
  // one missing file must never stop the worker from starting (notifications depend on it)
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const isStatic = (p) => /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(p);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // API, fonts, analytics: straight to the network
  if (url.pathname === "/sw.js") return;
  if (isStatic(url.pathname)) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(fetch(req).then((r) => {
    if (r.ok && r.type === "basic") { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  }).catch(async () => (await caches.match(req, { ignoreSearch: req.mode === "navigate" })) || (req.mode === "navigate" ? caches.match("/") : Response.error())));
});

/* Staff notifications: arrive encrypted from EndaViral's server through Apple / Google, even when the app is closed. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "EndaViral", body: e.data ? e.data.text() : "" }; }
  const opts = { body: d.body || "", icon: "/favicon-192.png?v=2", badge: "/favicon-96.png?v=2", tag: d.tag || undefined,
    renotify: !!d.tag, data: { url: d.url || "/", go: d.go || null, tab: d.tab || null }, timestamp: Date.now() };
  const badge = self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : Promise.resolve();
  e.waitUntil(Promise.all([self.registration.showNotification(d.title || "EndaViral", opts), badge]));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const target = new URL(d.url || "/", location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(location.origin));
    if (open) { open.postMessage({ type: "ev-open", go: d.go, tab: d.tab }); return open.focus(); }  // the app is open: jump there without reloading
    return self.clients.openWindow(target);
  }));
});

self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => list.forEach((c) => c.postMessage({ type: "ev-push-resubscribe" }))));
});
