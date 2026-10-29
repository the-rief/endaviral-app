/* ════════════════════ ADMIN SHELL ════════════════════
 * Section navigation + mobile behaviour for the admin panel.
 * Load AFTER admin.js (it wraps adminTab and openSupportThread).
 *
 *  - adminTab() is wrapped so every section change (clicks, jumps from
 *    other scripts, navTo) keeps the switch bar label, group visibility
 *    and the mobile sheet in sync. It also tolerates a missing `el`.
 *  - adminNavOpen()/adminNavClose(): bottom-sheet section picker (<1100px).
 *  - Tables rendered inside admin panels get data-label attributes so
 *    admin_shell.css can lay them out as cards on phones.
 *  - Support centre on phones: list → chat → back, instead of a split view.
 *
 * Styling lives in admin_shell.css.
 * ════════════════════════════════════════════════════ */

(function () {
  const MOBILE_NAV_MQ = window.matchMedia('(max-width: 1099.98px)');
  const PHONE_MQ      = window.matchMedia('(max-width: 768px)');
  const COMPACT_MAX_TABS = 6;   // at or below this many visible sections, use top tabs

  const tabKey = el => {
    const m = (el?.getAttribute('onclick') || '').match(/adminTab\('([^']+)'/);
    return m ? m[1] : null;
  };
  const findTab = key => document.querySelector(`.admin-tab[onclick*="'${key}'"]`);

  /* ── Sticky offset under the topbar ─────────────────────────────── */
  function syncTopOffset() {
    const sec = document.getElementById('sec-admin');
    const bar = document.querySelector('.topbar');
    if (sec && bar) sec.style.setProperty('--adm-top', bar.offsetHeight + 'px');
  }

  /* ── Switch bar + group visibility ──────────────────────────────── */
  function adminNavSync() {
    const nav = document.getElementById('adminNav');
    if (!nav) return;

    // Hide a group heading when every tab in it is hidden (CCR agents).
    nav.querySelectorAll('.an-group').forEach(g => {
      const visible = [...g.querySelectorAll('.admin-tab')].some(t => t.style.display !== 'none');
      g.hidden = !visible;
    });

    // Few sections (e.g. CCR agents: Support, All Orders, Create Order, Free
    // Orders) → plain tab row across the top instead of the grouped menu.
    const visibleTabs = [...nav.querySelectorAll('.admin-tab')].filter(t => t.style.display !== 'none').length;
    const compact = visibleTabs > 0 && visibleTabs <= COMPACT_MAX_TABS;
    document.getElementById('sec-admin')?.classList.toggle('adm-compact', compact);
    if (compact) adminNavClose();

    const active = nav.querySelector('.admin-tab.active');
    nav.querySelectorAll('.admin-tab').forEach(t => {
      if (t === active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (active) {
      const ic  = active.querySelector('.at-ic')?.textContent || '';
      const lbl = active.querySelector('.at-lbl')?.textContent || active.textContent.trim();
      const grp = active.closest('.an-group')?.querySelector('.an-title')?.textContent || 'Admin';
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('adminSwitchIcon', ic); set('adminSwitchLabel', lbl); set('adminSwitchGroup', grp);
    }

    // Surface queued-order count on the switch bar when that tab isn't open.
    const badgeSrc = document.getElementById('lqTabBadge');
    const sBadge = document.getElementById('adminSwitchBadge');
    if (sBadge) {
      const n = badgeSrc?.textContent?.trim();
      const onQueue = tabKey(active) === 'link-queue';
      sBadge.hidden = !n || onQueue;
      sBadge.textContent = n ? `⏳ ${n}` : '';
      sBadge.title = n ? `${n} queued order(s) waiting` : '';
    }
  }
  window.adminNavSync = adminNavSync;

  /* ── Bottom sheet ───────────────────────────────────────────────── */
  let _lastFocus = null;
  window.adminNavOpen = function () {
    if (!MOBILE_NAV_MQ.matches || document.getElementById('sec-admin')?.classList.contains('adm-compact')) return;
    _lastFocus = document.activeElement;
    document.body.classList.add('adm-nav-open');
    const nav = document.getElementById('adminNav');
    nav?.setAttribute('role', 'dialog');
    nav?.setAttribute('aria-modal', 'true');
    document.getElementById('adminSwitch')?.setAttribute('aria-expanded', 'true');
    const active = nav?.querySelector('.admin-tab.active');
    setTimeout(() => { (active || nav?.querySelector('.admin-tab'))?.focus({ preventScroll: true }); active?.scrollIntoView({ block: 'nearest' }); }, 60);
  };
  window.adminNavClose = function () {
    if (!document.body.classList.contains('adm-nav-open')) return;
    document.body.classList.remove('adm-nav-open');
    const nav = document.getElementById('adminNav');
    nav?.removeAttribute('role'); nav?.removeAttribute('aria-modal');
    document.getElementById('adminSwitch')?.setAttribute('aria-expanded', 'false');
    if (_lastFocus && document.contains(_lastFocus)) _lastFocus.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') adminNavClose(); });
  MOBILE_NAV_MQ.addEventListener?.('change', () => adminNavClose());

  /* ── Wrap adminTab ──────────────────────────────────────────────── */
  const _origAdminTab = window.adminTab;
  if (typeof _origAdminTab === 'function') {
    window.adminTab = function (tab, el) {
      // Callers sometimes pass a stale element (e.g. navTo() redirecting a
      // CCR agent from a hidden tab to Support) — always highlight the
      // button that matches the section actually being opened.
      if (!el || !el.classList || tabKey(el) !== tab) el = findTab(tab) || el;
      if (!el) return;
      const prev = tabKey(document.querySelector('.admin-tab.active'));
      const r = _origAdminTab.call(this, tab, el);
      adminNavSync();
      adminNavClose();
      if (tab !== 'support') adminSupportBack(true);
      // On small screens, bring the newly opened section into view.
      if (MOBILE_NAV_MQ.matches && prev && prev !== tab) {
        const sec = document.getElementById('sec-admin');
        if (sec && sec.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + sec.getBoundingClientRect().top - 8, behavior: 'auto' });
      }
      return r;
    };
  }

  /* ── Support centre: master/detail on phones ────────────────────── */
  // ≤768px (CCR agents mostly reply from their phones): opening a
  // conversation takes the whole screen like WhatsApp (body.sup-chat-full),
  // the orders panel is a bottom sheet (#supportChatPane.sup-orders-open),
  // and the phone's own Back button closes the sheet, then the chat.
  let _listScrollY = 0;
  const chatPane = () => document.getElementById('supportChatPane');
  function setChatOpen(open) {
    document.getElementById('supportInboxWrap')?.classList.toggle('sb-chat-open', open);
    document.getElementById('supportThreadsView')?.classList.toggle('sb-chat-open-wrap', open);
    const full = open && PHONE_MQ.matches;
    if (full && !document.body.classList.contains('sup-chat-full')) _listScrollY = window.scrollY;
    const wasFull = document.body.classList.contains('sup-chat-full');
    document.body.classList.toggle('sup-chat-full', full);
    if (!open) setOrdersOpen(false);
    if (wasFull && !full) requestAnimationFrame(() => window.scrollTo(0, _listScrollY));
  }
  function setOrdersOpen(open) {
    chatPane()?.classList.toggle('sup-orders-open', !!open);
  }
  const pushState = (key) => { try { history.pushState({ [key]: 1 }, ''); } catch (_) {} };

  window.adminSupportBack = function (silent) {
    setChatOpen(false);
    if (!silent && PHONE_MQ.matches) {
      const list = document.getElementById('supportThreadList');
      list?.scrollIntoView({ block: 'start' });
    }
  };
  // Leave the full-screen chat: back to Reorders if it was opened from there,
  // otherwise back to the conversation list.
  function closeChat() {
    if (typeof _sb !== 'undefined' && _sb.chatOnly && typeof sbBackFromChat === 'function') sbBackFromChat();
    setChatOpen(false);
    if (typeof sbMarkActive === 'function') sbMarkActive();
  }
  // ← in the chat header. Goes through history so Back and ← behave the same.
  window.supMobileBack = function () {
    if (history.state && (history.state.supChat || history.state.supOrders)) { history.back(); return; }
    closeChat();
  };
  window.supToggleOrders = function (force) {
    const open = force === undefined ? !chatPane()?.classList.contains('sup-orders-open') : !!force;
    if (open) {
      setOrdersOpen(true);
      if (PHONE_MQ.matches) pushState('supOrders');
    } else if (history.state && history.state.supOrders) {
      history.back();                       // popstate closes it
    } else {
      setOrdersOpen(false);
    }
  };
  window.addEventListener('popstate', () => {
    const pane = chatPane();
    if (pane?.classList.contains('sup-orders-open')) { setOrdersOpen(false); return; }
    if (document.body.classList.contains('sup-chat-full')) closeChat();
  });
  PHONE_MQ.addEventListener?.('change', () => {
    const open = document.getElementById('supportInboxWrap')?.classList.contains('sb-chat-open');
    setChatOpen(!!open);
  });

  const _origOpenThread = window.openSupportThread;
  if (typeof _origOpenThread === 'function') {
    window.openSupportThread = function (id, opts) {
      const alreadyFull = document.body.classList.contains('sup-chat-full');
      setChatOpen(true);
      if (PHONE_MQ.matches) {
        // One history entry per open chat (re-renders after a reply don't add more).
        if (!alreadyFull && !(history.state && history.state.supChat)) pushState('supChat');
        if (!(opts && opts.keepScroll)) setOrdersOpen(false);
      }
      return _origOpenThread.apply(this, arguments);
    };
  }
  // Switching support sub-tabs (Inbox / Follow-up / …) returns to the list.
  // Tagging an order from the sheet closes the sheet so the reply box is in view.
  const _wrapLater = () => {
    const orig = window.sbSetTab;
    if (typeof orig === 'function' && !orig._admWrapped) {
      window.sbSetTab = function () { setChatOpen(false); return orig.apply(this, arguments); };
      window.sbSetTab._admWrapped = true;
    }
    const tag = window.supportTagReplyOrder;
    if (typeof tag === 'function' && !tag._admWrapped) {
      window.supportTagReplyOrder = function () {
        const r = tag.apply(this, arguments);
        if (PHONE_MQ.matches && chatPane()?.classList.contains('sup-orders-open')) {
          supToggleOrders(false);
          setTimeout(() => document.getElementById('adminReplyInput')?.focus(), 250);
        }
        return r;
      };
      window.supportTagReplyOrder._admWrapped = true;
    }
  };

  /* ── Tables → labelled cells for the phone card layout ──────────── */
  const ACTION_RE = /^(actions?|manage|options|)$/i;
  function labelTable(table) {
    const head = table.tHead?.rows?.[0];
    if (!head) return;
    const labels = [];
    [...head.cells].forEach(th => {
      const span = th.colSpan || 1;
      const txt = th.textContent.replace(/\s+/g, ' ').trim();
      for (let i = 0; i < span; i++) labels.push(txt);
    });
    if (labels.length < 3) return; // tiny tables scroll fine as-is
    table.classList.add('adm-stack');
    [...table.tBodies].forEach(tb => [...tb.rows].forEach(tr => {
      if (tr.dataset.admLabelled === String(labels.length)) return;
      let col = 0, first = true;
      [...tr.cells].forEach(td => {
        const lbl = labels[col] || '';
        td.setAttribute('data-label', lbl);
        td.classList.toggle('adm-first', first && (td.colSpan || 1) === 1);
        td.classList.toggle('adm-act', !first && ACTION_RE.test(lbl) && col === labels.length - 1);
        first = false;
        col += td.colSpan || 1;
      });
      tr.dataset.admLabelled = String(labels.length);
    }));
  }
  let _labelQueued = false;
  function labelAll() {
    _labelQueued = false;
    document.querySelectorAll('#sec-admin .admin-main table').forEach(labelTable);
  }
  function queueLabel() {
    if (_labelQueued) return;
    _labelQueued = true;
    requestAnimationFrame(labelAll);
  }

  /* ── Boot ───────────────────────────────────────────────────────── */
  function boot() {
    syncTopOffset();
    adminNavSync();
    _wrapLater();
    const main = document.querySelector('#sec-admin .admin-main');
    if (main && 'MutationObserver' in window) {
      new MutationObserver(queueLabel).observe(main, { childList: true, subtree: true });
    }
    queueLabel();
    // Keep the switch bar's badge in step with the queued-orders tab badge.
    const lq = document.getElementById('lqTabBtn');
    if (lq && 'MutationObserver' in window) {
      new MutationObserver(adminNavSync).observe(lq, { childList: true, subtree: true, characterData: true });
    }
  }
  window.addEventListener('resize', syncTopOffset, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', () => { _wrapLater(); syncTopOffset(); });
})();
