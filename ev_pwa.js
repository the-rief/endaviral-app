/* EndaViral as an app (PWA) + staff notifications.
 *
 * Everyone: "Get the EndaViral app" card on the dashboard. Android / desktop Chrome: one tap installs it.
 * iPhone Safari: a short "Share → Add to Home Screen" guide. Hidden once installed, or for 14 days after "Not now".
 *
 * Admins and Customer Care Reps: a bell in the top bar turns on WhatsApp-style notifications on this device
 * (admins: withdrawal requests + support messages; CCR: support messages). Load AFTER auth.js.
 */
(function () {
  const SW_OK = "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost");
  if (SW_OK) navigator.serviceWorker.register("/sw.js").catch(() => {});

  const ua = navigator.userAgent;
  const IOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IOS_SAFARI = IOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\//.test(ua);
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const LATER = "ev_app_later";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg class="ev-i" aria-hidden="true"><use href="#ev-${id}"></use></svg>`;
  const me = () => (typeof currentUser !== "undefined" && currentUser) || null;
  const say = (m, t) => { if (typeof toast === "function") toast(m, t); };
  let deferred = null;

  /* ───────────── install card on the dashboard ───────────── */
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; syncBanner(); });
  window.addEventListener("appinstalled", () => { deferred = null; syncBanner(); syncSide(); say("EndaViral is on your home screen", "success"); });

  function later() { try { return Date.now() < (+localStorage.getItem(LATER) || 0); } catch (_) { return false; } }
  function canOffer() { return !standalone() && (deferred || IOS) && !later(); }

  // Where the offer sits. "strip": one slim line at the top of the dashboard (default);
  // "pill": "Get app" button in the top bar next to the wallet; "icon": icon-only button in the top bar.
  const PLACE = () => window.EV_APP_PLACE || "strip";
  function syncBanner() {
    const place = PLACE(), on = canOffer();
    const bar = document.querySelector(".topbar-right"), dash = document.getElementById("sec-dashboard");
    const old = document.getElementById("evAppGo");
    if (!on) { document.getElementById("evAppTop")?.remove(); document.getElementById("evAppBanner")?.remove(); return; }
    if (old) return;
    if ((place === "pill" || place === "icon") && bar) {
      bar.insertAdjacentHTML("afterbegin", place === "pill"
        ? `<button type="button" class="ev-getapp" id="evAppTop"><span id="evAppGo" class="ev-getapp-in">${icon("download")}<span>Get app</span></span></button>`
        : `<button type="button" class="ev-getapp ev-getapp-ic" id="evAppTop" aria-label="Get the EndaViral app" title="Get the EndaViral app"><span id="evAppGo" class="ev-getapp-in">${icon("download")}</span><i></i></button>`);
      document.getElementById("evAppTop").onclick = install;
    } else if (place === "strip" && dash) {
      dash.insertAdjacentHTML("afterbegin", `
        <div class="ev-strip" id="evAppBanner"><img src="/favicon-192.png?v=2" alt="">
          <span><b>EndaViral app</b> · one tap from your home screen</span>
          <button type="button" class="ev-strip-go" id="evAppGo">Install</button>
          <button type="button" class="ev-strip-x" id="evAppX" aria-label="Not now">${icon("x")}</button></div>`);
      document.getElementById("evAppGo").onclick = install;
      document.getElementById("evAppX").onclick = () => { try { localStorage.setItem(LATER, String(Date.now() + 14 * 864e5)); } catch (_) {} syncBanner(); };
    }
  }

  async function install() {
    if (typeof closeSidebar === "function") closeSidebar();
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; if (r && r.outcome === "accepted") { syncBanner(); syncSide(); } return; }
    if (IOS) return iosSheet();
    otherSheet();
  }
  // Android / computer when the browser hasn't offered its own install button yet
  function otherSheet() {
    const and = /Android/.test(ua);
    sheet(`<div class="ev-sh-grab"></div>
      <div class="ev-sh-head"><img src="/apple-touch-icon.png?v=2" alt=""><div><b>Install the EndaViral app</b><span>Free. No Play Store needed.</span></div></div>
      <ol class="ev-steps">
        <li><i>1</i><span>Tap the browser menu <b>${and ? "⋮" : "⋮ or ⊕"}</b> ${and ? "at the top right" : "next to the address bar"}</span></li>
        <li><i>2</i><span>Tap <b>${and ? "Install app" : "Install EndaViral"}</b> or <b>Add to Home screen</b></span></li>
        <li><i>3</i><span>Tap <b>Install</b>. Done.</span></li></ol>
      <button type="button" class="ev-btn-g" data-close>Got it</button>`);
  }

  /* Always reachable: "Get the app" next to Log out in the side menu, even after the dashboard strip is closed. */
  function syncSide() {
    const foot = document.querySelector("#sidebar .sb-user") || document.querySelector(".sb-user");
    let row = document.getElementById("evSideApp");
    if (standalone() || !foot) { row?.remove(); return; }
    if (row) return;
    foot.insertAdjacentHTML("beforebegin", `<button type="button" class="ev-side-app" id="evSideApp">
      <img src="/favicon-192.png?v=2" alt=""><span><b>Get the app</b><small>Install EndaViral on this ${/iPhone|Android/.test(ua) ? "phone" : "device"}</small></span>${icon("download")}</button>`);
    document.getElementById("evSideApp").onclick = install;
  }

  function sheet(html) {
    close();
    document.body.insertAdjacentHTML("beforeend", `<div class="ev-sh-bd" id="evShBd"></div><div class="ev-sh" id="evSh" role="dialog">${html}</div>`);
    document.getElementById("evShBd").onclick = close;
    document.querySelectorAll("#evSh [data-close]").forEach((b) => b.onclick = close);
    return document.getElementById("evSh");
  }
  function close() { document.getElementById("evSh")?.remove(); document.getElementById("evShBd")?.remove(); }

  function iosSheet() {
    const share = `<svg viewBox="0 0 24 24" class="ev-ios-g"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    const plus = `<svg viewBox="0 0 24 24" class="ev-ios-g"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    sheet(`<div class="ev-sh-grab"></div>
      <div class="ev-sh-head"><img src="/apple-touch-icon.png?v=2" alt=""><div><b>Add EndaViral to your Home Screen</b><span>Two taps. No App Store needed.</span></div></div>
      ${IOS_SAFARI ? `<ol class="ev-steps">
        <li><i>1</i><span>Tap ${share} <b>Share</b> in Safari's toolbar</span></li>
        <li><i>2</i><span>Scroll and tap ${plus} <b>Add to Home Screen</b></span></li>
        <li><i>3</i><span>Tap <b>Add</b>. Done.</span></li></ol>`
      : `<ol class="ev-steps">
        <li><i>1</i><span>Tap ${share} <b>Share</b> ${/CriOS/.test(ua) ? "at the top, next to the address" : "in your browser's menu"}</span></li>
        <li><i>2</i><span>Tap ${plus} <b>Add to Home Screen</b> (scroll down if needed)</span></li>
        <li><i>3</i><span>Tap <b>Add</b>. Done.</span></li></ol>`}
      <button type="button" class="ev-btn-g" data-close>Got it</button>`);
  }

  /* ───────────── staff notifications (admins + CCR) ───────────── */
  const PUSH = {
    ok: () => SW_OK && "PushManager" in window && "Notification" in window,
    device() {
      const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (IOS && !/iPhone/.test(ua)) ? "iPad" : /Android/.test(ua) ? "Android phone" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : "device";
      const br = /EdgA?\//.test(ua) ? "Edge" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Safari/.test(ua) ? (standalone() ? "app" : "Safari") : "";
      return br ? `${os} · ${br}` : os;
    },
    key: (b64) => { const s = atob((b64 + "=".repeat((4 - b64.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); },
    within: (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]),
    async current() { if (!PUSH.ok()) return null; const r = await navigator.serviceWorker.getRegistration("/"); return r ? r.pushManager.getSubscription() : null; },
    async worker() {
      let reg = await PUSH.within(navigator.serviceWorker.register("/sw.js"), 10000, "The app couldn't start its background worker. Close EndaViral fully and open it again.");
      if (!reg.active) {
        const w = reg.installing || reg.waiting;
        if (w) await PUSH.within(new Promise((ok) => { const f = () => { if (w.state === "activated" || w.state === "redundant") ok(); }; w.addEventListener("statechange", f); f(); }),
          15000, "The app's background worker didn't start. Close EndaViral fully (swipe it away), open it again and retry.");
        reg = (await navigator.serviceWorker.getRegistration("/")) || reg;
      }
      if (!reg.active) throw new Error("The app's background worker isn't running. Close EndaViral fully, open it again and retry.");
      return reg;
    },
    async subscribe(publicKey, topics) {
      const reg = await PUSH.worker();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await PUSH.within(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: PUSH.key(publicKey) }), 20000, "Apple / Google didn't answer. Check your internet and try again.");
      await PUSH.within(api("/staff/push", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON(), topics, device: PUSH.device() }) }), 20000, "EndaViral's server didn't answer. Try again in a moment.");
      try { localStorage.setItem("ev_push_sync", String(Date.now())); } catch (_) {}
      return sub;
    },
  };
  const info = () => api("/staff/push?t=" + Date.now());
  const isStaff = () => { const u = me(); return !!u && (u.role === "admin" || u.is_admin || u.is_ccr_agent); };
  const isAdmin = () => { const u = me(); return !!u && (u.role === "admin" || u.is_admin); };

  async function syncBell() {
    const bar = document.querySelector(".topbar-right");
    let b = document.getElementById("evBell");
    if (!isStaff() || !bar) { b?.remove(); return; }
    if (!b) { bar.insertAdjacentHTML("afterbegin", `<button type="button" class="ev-bell" id="evBell" aria-label="Notifications">${icon("bell")}<i></i></button>`); b = document.getElementById("evBell"); b.onclick = panel; }
    const on = PUSH.ok() && Notification.permission === "granted" && !!(await PUSH.current().catch(() => null));
    b.classList.toggle("on", on); b.title = on ? "Notifications are on" : "Turn on notifications";
    if (on) {   // keep this device's subscription fresh, at most once a day
      let last = 0; try { last = +localStorage.getItem("ev_push_sync") || 0; } catch (_) {}
      if (Date.now() - last > 864e5) { const cur = await PUSH.current(); info().then((i) => PUSH.subscribe(i.public_key, (i.devices.find((x) => cur && x.endpoint === cur.endpoint) || {}).topics || Object.keys(i.topics))).catch(() => {}); }
    }
  }

  async function panel() {
    const box = sheet(`<div class="ev-sh-grab"></div><div class="ev-np-h"><b>Notifications</b><button type="button" class="ev-np-x" data-close aria-label="Close">${icon("x")}</button></div><div id="evNp"><p class="ev-np-load">Loading…</p></div>`);
    const body = box.querySelector("#evNp");
    const draw = async () => {
      let i; try { i = await info(); } catch (err) {
        const nf = /not found/i.test(err.message || "");
        body.innerHTML = `<p class="ev-np-err">${nf ? "Notifications aren't switched on at the server yet. Deploy the new backend on Render, wait for it to finish, then try again." : esc(err.message)}</p>`; return; }
      const sub = await PUSH.current().catch(() => null);
      const mine = sub && i.devices.find((x) => x.endpoint === sub.endpoint);
      const perm = PUSH.ok() ? Notification.permission : "unsupported";
      const topics = mine ? mine.topics : Object.keys(i.topics);
      const noun = PUSH.device().split(" ·")[0];
      const why = isAdmin() ? "Know the moment someone asks to withdraw or writes to support." : "Know the moment a customer writes to support, so you can reply fast.";
      let st;
      if (IOS && !standalone()) st = ["warn", "phone", "Open EndaViral from your home-screen icon", "On iPhone, notifications only work in the installed app. Add EndaViral to your Home Screen, open it from there, then turn them on."];
      else if (!PUSH.ok()) st = ["warn", "bell", "This browser can't show notifications", "Use the installed EndaViral app, or Chrome, Edge, Firefox or Safari."];
      else if (perm === "denied") st = ["warn", "bell", "Notifications are blocked for EndaViral", IOS ? "Open iPhone Settings → Notifications → EndaViral, allow them, then come back." : "Allow notifications for endaviral.co.ke in your browser's site settings, then come back."];
      else if (mine) st = ["on", "bell", `On for this ${noun}`, "You'll get a notification even when EndaViral is closed."];
      else st = ["off", "bell", `Get WhatsApp-style alerts on this ${noun}`, why];
      const ready = !(IOS && !standalone()) && PUSH.ok() && perm !== "denied";
      body.innerHTML = `<div class="ev-np-st ev-np-${st[0]}">${icon(st[1])}<div><b>${esc(st[2])}</b><span>${esc(st[3])}</span></div></div>
        ${ready ? `<div class="ev-np-tp">${Object.entries(i.topics).map(([k, l]) => `<label><span>${icon(k === "withdrawals" ? "banknote" : "message")}<b>${esc(l)}</b></span><input type="checkbox" data-t="${k}" ${topics.includes(k) ? "checked" : ""}><i></i></label>`).join("")}</div>
          ${mine ? `<div class="ev-np-acts"><button type="button" class="ev-btn-g" id="evNpTest">${icon("bell")} Send a test</button><button type="button" class="ev-btn-o" id="evNpOff">Turn off here</button></div>`
            : `<button type="button" class="ev-btn-g ev-btn-big" id="evNpOn">${icon("bell")} Turn on notifications</button>`}<div id="evNpErr"></div>` : `<button type="button" class="ev-btn-o" data-close>Close</button>`}
        ${i.devices.length ? `<div class="ev-np-devs"><h4>Your devices with notifications</h4>${i.devices.map((x) => `<div class="ev-np-dev">${icon(/iPhone|Android|iPad/.test(x.device || "") ? "phone" : "laptop")}<span><b>${esc(x.device || "Device")}${sub && x.endpoint === sub.endpoint ? ` <em>this one</em>` : ""}</b><small>${x.topics.map((t) => esc(i.topics[t] || t)).join(" · ") || "nothing selected"}</small></span>${sub && x.endpoint === sub.endpoint ? "" : `<button type="button" class="ev-np-rm" data-rm="${esc(x.endpoint)}">Remove</button>`}</div>`).join("")}</div>` : ""}`;
      body.querySelectorAll("[data-close]").forEach((b) => b.onclick = close);
      const chosen = () => [...body.querySelectorAll("[data-t]")].filter((c) => c.checked).map((c) => c.dataset.t);
      const busy = (b, on) => { b.disabled = on; b.classList.toggle("ev-busy", on); };
      body.querySelector("#evNpOn")?.addEventListener("click", async (e) => {
        const b = e.currentTarget, err = body.querySelector("#evNpErr");
        const asked = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission();  // straight from the tap (iPhone needs this)
        busy(b, true); err.innerHTML = "";
        try {
          const p = await PUSH.within(asked, 60000, "No answer to the notifications question. Try again.");
          if (p !== "granted") { err.innerHTML = `<p class="ev-np-err">Notifications weren't allowed. ${IOS ? "Open iPhone Settings → Notifications → EndaViral, allow them, then try again." : "Allow them for endaviral.co.ke in your browser's site settings, then try again."}</p>`; return; }
          await PUSH.subscribe(i.public_key, chosen());
          say("Notifications are on", "success"); api("/staff/push/test", { method: "POST" }).catch(() => {}); syncBell(); draw();
        } catch (ex) { err.innerHTML = `<p class="ev-np-err">${esc(ex.message || "Couldn't turn on notifications.")}</p>`; }
        finally { busy(b, false); }
      });
      body.querySelectorAll("[data-t]").forEach((c) => c.addEventListener("change", async () => {
        if (!mine) return;
        try { await api("/staff/push", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON(), topics: chosen(), device: PUSH.device() }) }); say("Saved", "success"); } catch (err) { say(err.message, "error"); }
      }));
      body.querySelector("#evNpTest")?.addEventListener("click", async (e) => { busy(e.currentTarget, true);
        try { await api("/staff/push/test", { method: "POST" }); say("Test sent. It should arrive in a few seconds.", "success"); } catch (err) { say(err.message, "error"); } finally { busy(e.currentTarget, false); } });
      body.querySelector("#evNpOff")?.addEventListener("click", async (e) => { busy(e.currentTarget, true);
        try { await api(`/staff/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" }); await sub.unsubscribe(); say("Notifications off on this device"); syncBell(); draw(); }
        catch (err) { say(err.message, "error"); busy(e.currentTarget, false); } });
      body.querySelectorAll("[data-rm]").forEach((b) => b.onclick = async () => { try { await api(`/staff/push?endpoint=${encodeURIComponent(b.dataset.rm)}`, { method: "DELETE" }); draw(); } catch (err) { say(err.message, "error"); } });
    };
    draw();
  }

  /* ───────────── opening a notification: jump to the right place ───────────── */
  function go(where, tab) {
    if (!where || typeof navTo !== "function") return;
    try {
      navTo(where);
      if (where === "admin" && tab && typeof adminTab === "function") adminTab(tab, document.querySelector(`.admin-tab[onclick*="'${tab}'"]`));
      if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    } catch (_) {}
  }
  function goFromUrl() {
    const q = new URLSearchParams(location.search), w = q.get("go");
    if (!w || !me()) return;
    go(w, q.get("tab"));
    q.delete("go"); q.delete("tab");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  }
  if (SW_OK) navigator.serviceWorker.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "ev-open") go(e.data.go, e.data.tab);
    if (e.data.type === "ev-push-resubscribe") { try { localStorage.removeItem("ev_push_sync"); } catch (_) {} syncBell(); }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && isStaff() && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); });

  /* ───────────── run after sign-in / sign-out ───────────── */
  function after() { syncBanner(); syncSide(); syncBell(); goFromUrl(); }
  if (typeof initApp === "function") { const o = initApp; window.initApp = function () { const r = o.apply(this, arguments); try { after(); } catch (_) {} return r; }; }
  if (typeof doLogout === "function") { const o = doLogout; window.doLogout = function () { const r = o.apply(this, arguments); try { document.getElementById("evBell")?.remove(); close(); } catch (_) {} return r; }; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", after); else after();
  // the dashboard's stat row can be re-rendered: put the card back if needed
  const dash = document.getElementById("sec-dashboard");
  if (dash) new MutationObserver(() => { if (canOffer() && !document.getElementById("evAppGo")) syncBanner(); }).observe(dash, { childList: true });

  window.EVApp = { install, syncBanner, syncBell, panel };
})();
