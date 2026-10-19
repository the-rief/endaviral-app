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
    if (!MOBILE_NAV_MQ.matches) return;
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
  function setChatOpen(open) {
    document.getElementById('supportInboxWrap')?.classList.toggle('sb-chat-open', open);
    document.getElementById('supportThreadsView')?.classList.toggle('sb-chat-open-wrap', open);
  }
  window.adminSupportBack = function (silent) {
    setChatOpen(false);
    if (!silent && PHONE_MQ.matches) {
      const list = document.getElementById('supportThreadList');
      list?.scrollIntoView({ block: 'start' });
    }
  };
  const _origOpenThread = window.openSupportThread;
  if (typeof _origOpenThread === 'function') {
    window.openSupportThread = function () {
      setChatOpen(true);
      if (PHONE_MQ.matches) {
        const wrap = document.getElementById('supportThreadsView');
        if (wrap && wrap.getBoundingClientRect().top < 0) wrap.scrollIntoView({ block: 'start' });
      }
      return _origOpenThread.apply(this, arguments);
    };
  }
  // Switching support sub-tabs (Inbox / Follow-up / …) returns to the list.
  const _wrapLater = () => {
    const orig = window.sbSetTab;
    if (typeof orig === 'function' && !orig._admWrapped) {
      window.sbSetTab = function () { setChatOpen(false); return orig.apply(this, arguments); };
      window.sbSetTab._admWrapped = true;
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
