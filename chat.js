/* ═══════════════════ ENDAVIRAL CHAT WIDGET (DB-backed) ═══════════════════
   No scripted chatbot. Two things happen in here:
   1) Instant Answers — canned, local-only replies triggered ONLY by tapping
      a shortcut button. Nothing about these ever touches the server.
   2) Tickets — a customer ticks either/both issue-type checkboxes and/or
      types their issue, hits Submit, and it goes straight into a thread
      with a human admin. No bot ever replies inside a ticket thread.
═══════════════════════════════════════════════════════════════════════ */
(function(){
  const ADMIN_NAME   = 'EndaViral Support';
  const ADMIN_AVATAR = '👤';
  const SUPPORT_API  = API + '/support';

  /* ═══════════════════════════════════════════════════════════════
     WIDGET STATE
  ═══════════════════════════════════════════════════════════════ */
  const state = {
    open:           false,
    view:           'home',      // 'home' | 'new' | 'thread'
    threads:        [],          // summaries from GET /threads
    activeThreadId: null,
    unread:         0,
  };

  // message_count last rendered/seen per thread id — polling cursor
  const lastSeenCount = {};

  let pollHandle = null;
  let _booted    = false;

  /* ═══════════════════════════════════════════════════════════════
     INSTANT ANSWERS — shown as shortcuts. Tapping one renders the
     canned Q/A locally only. Never posted to the server.
  ═══════════════════════════════════════════════════════════════ */
  const _shortcuts = [
    {
      label: 'How ordering works 🛒',
      question: 'How does ordering work on this platform?',
      answer:
        `🛒 **Ordering SMM services is simple:**\n\n` +
        `1. Click **New Order** in the left menu and pick a category (Instagram, TikTok, YouTube, etc.)\n` +
        `2. Choose the exact service you want — pricing is shown **per 1,000**\n` +
        `3. Paste your **profile or post link** and enter the **quantity**\n` +
        `4. Confirm and pay via **M-Pesa STK push**\n\n` +
        `Once payment is confirmed, your order is sent to processing automatically — no manual approval needed. ` +
        `You can track progress any time from **My Orders**. Delivery start times vary by service, usually within a few hours.`
    },
    {
      label: 'How to get my link 🔗',
      question: 'How do I get my profile or post link?',
      answer:
        `🔗 **How to get your link:**\n\n` +
        `• **TikTok profile:** Open TikTok → tap your profile → tap the share icon → *Copy link*\n` +
        `• **TikTok video:** Open the video → tap Share → *Copy link*\n` +
        `• **Instagram:** Go to your profile/post → tap ··· → *Copy link*\n` +
        `• **YouTube:** Open your video → tap Share → *Copy link*\n` +
        `• **Facebook/Twitter:** Open post → tap Share → *Copy link*\n\n` +
        `Paste the copied link directly — make sure the account is set to **Public**!`
    },
    {
      label: 'Delivery start times ⏱️',
      question: 'How long does delivery take to start?',
      answer:
        `⏱️ **Delivery start times** vary by service:\n\n` +
        `• **TikTok / Instagram / YouTube** — typically starts within **1–3 hours**\n` +
        `• **Twitter / Facebook** — usually within **30 minutes to 2 hours**\n` +
        `• **Slower growth packages** — may take up to **24 hours** to begin\n\n` +
        `If your order hasn't started after **24 hours**, open a ticket and tick **Delayed Service** — our team will investigate.`
    },
    {
      label: 'Refund & cancellation 💰',
      question: 'What is your refund and cancellation policy?',
      answer:
        `💰 **Refund & cancellation policy:**\n\n` +
        `Once an order is **placed and payment confirmed**, it goes straight to processing and **cannot be refunded or cancelled** — so please double-check your **link, quantity, and service** before confirming.\n\n` +
        `That said, if an order **stalls, delays, or delivers partially**, our team will **complete it or re-queue it** at no extra cost. Open a ticket with your **Order ID** and we'll sort it out.`
    },
    {
      label: 'Why did my count drop 📉',
      question: 'Why did my follower/like count drop after delivery?',
      answer:
        `📉 **Noticed your count going down?** Here's why it happens:\n\n` +
        `Platforms like TikTok and Instagram regularly run cleanup sweeps that remove inactive or low-activity accounts. Sources more likely to get flagged in these sweeps will naturally lose more over time.\n\n` +
        `That's why we grade services by tier:\n\n` +
        `🟡 **Basic** — cheapest, pulled from sources platforms flag most often, so drops are more likely.\n` +
        `🟢 **Medium** — a balanced option with better stability than Basic.\n` +
        `🔵 **Elite** — highest quality sources, built for long-term retention.\n\n` +
        `If you're seeing drops on a **Basic** order, that's expected, not a fault. For lasting results, consider **Medium** or **Elite** next time. If you'd like us to look at a specific order, open a ticket with the **Order ID**.`
    },
    {
      label: 'What services you offer 📦',
      question: 'What services do you offer?',
      answer:
        `📦 **Our services include:**\n\n` +
        `• 📸 Instagram — Followers, Likes, Views, Story Views\n` +
        `• 🎵 TikTok — Followers, Likes, Views, Shares\n` +
        `• ▶️ YouTube — Views, Likes, Subscribers, Watch Time\n` +
        `• 🐦 Twitter/X — Followers, Likes, Retweets\n` +
        `• 📘 Facebook — Likes, Followers, Views\n\n` +
        `Click **New Order** to browse all available packages and pricing!`
    },
  ];

  function _renderShortcuts() {
    const grid = document.getElementById('ev-shortcuts-grid');
    if (!grid) return;
    grid.innerHTML = _shortcuts.map((s, i) =>
      `<button class="ev-shortcut-btn" onclick="evShowInstantAnswer(${i})">${s.label}</button>`
    ).join('');
  }

  // Tapping a shortcut — local-only, never touches the server.
  window.evShowInstantAnswer = function(i) {
    const s = _shortcuts[i];
    if (!s) return;
    const panel = document.getElementById('ev-instant-answer-panel');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.innerHTML = '';

    const user     = _getUser();
    const initial  = (user.name || 'U').charAt(0).toUpperCase();
    _appendLocal(panel, _userBubbleHtml(s.question, initial, evNow()));
    _appendLocal(panel, _typingHtml('ev-instant-typing'));
    panel.scrollTop = panel.scrollHeight;

    setTimeout(() => {
      const t = document.getElementById('ev-instant-typing');
      if (t) t.remove();
      _appendLocal(panel, _adminBubbleHtml(s.answer, evNow(), true));
      panel.scrollTop = panel.scrollHeight;
    }, 500);
  };

  window.evCloseInstantAnswer = function() {
    const panel = document.getElementById('ev-instant-answer-panel');
    if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
  };

  /* ═══════════════════════════════════════════════════════════════
     BOOT — load ticket list for the logged-in user
  ═══════════════════════════════════════════════════════════════ */
  async function evBootWidget() {
    _renderShortcuts();
    if (!token) { _renderHome(); return; }
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { _renderHome(); return; }
      const threads = await res.json();
      state.threads = (threads || []).slice().sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      state.threads.forEach(t => { lastSeenCount[t.id] = t.message_count || 0; });
      _renderHome();
      evStartPolling();
    } catch (_) { _renderHome(); }
  }

  async function _fetchThread(threadId) {
    try {
      const res = await fetch(`${SUPPORT_API}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  /* ═══════════════════════════════════════════════════════════════
     HOME VIEW — shortcuts (already in DOM) + ticket list
  ═══════════════════════════════════════════════════════════════ */
  function _renderHome() {
    const listEl = document.getElementById('ev-tickets-list');
    const loginPrompt = document.getElementById('ev-login-prompt');
    const newBtn = document.getElementById('ev-new-ticket-btn');
    if (!listEl) return;

    if (!token) {
      if (loginPrompt) loginPrompt.style.display = 'flex';
      listEl.innerHTML = '';
      if (newBtn) newBtn.style.display = 'none';
      return;
    }
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (newBtn) newBtn.style.display = 'block';

    if (!state.threads.length) {
      listEl.innerHTML = `<div class="ev-tickets-empty">No tickets yet. Tap <strong>New Ticket</strong> below if you need help with an order.</div>`;
      return;
    }

    listEl.innerHTML = state.threads.map(t => {
      const statusClass = t.status;
      const preview = t.last_message ? _stripMd(t.last_message.body).slice(0, 60) : '';
      return `
        <button class="ev-ticket-card" onclick="evOpenThreadView('${t.id}')">
          <div class="ev-ticket-card-top">
            <span class="ev-ticket-subject">${_escape(t.subject || 'Support ticket')}</span>
            <span class="ev-ticket-status ev-ticket-status-${statusClass}">${_statusLabel(t.status)}</span>
          </div>
          <div class="ev-ticket-preview">${_escape(preview)}${preview.length >= 60 ? '…' : ''}</div>
        </button>`;
    }).join('');
  }

  function _statusLabel(s) {
    return { open: '🔴 Open', pending: '🟡 Pending', resolved: '🟢 Resolved', closed: '⬛ Closed' }[s] || s;
  }

  function _stripMd(t) {
    return String(t || '').replace(/\*\*/g,'').replace(/\*/g,'').replace(/\n/g,' ');
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW SWITCHING
  ═══════════════════════════════════════════════════════════════ */
  function _showView(view) {
    state.view = view;
    ['home','new','thread'].forEach(v => {
      const el = document.getElementById('ev-view-' + v);
      if (el) el.style.display = (v === view) ? 'flex' : 'none';
    });
  }

  window.evGoHome = function() {
    state.activeThreadId = null;
    evCloseInstantAnswer();
    _showView('home');
    evBootWidget();
  };

  window.evOpenNewTicketForm = function() {
    if (!token) { _scrollToLogin(); return; }
    const cbWrong = document.getElementById('ev-nt-cb-wrong');
    const cbDelay = document.getElementById('ev-nt-cb-delay');
    const desc    = document.getElementById('ev-nt-desc');
    if (cbWrong) cbWrong.checked = false;
    if (cbDelay) cbDelay.checked = false;
    if (desc) desc.value = '';
    _showView('new');
  };

  function _scrollToLogin() {
    const loginBox = document.getElementById('loginBox');
    if (loginBox) {
      loginBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const emailInput = document.getElementById('loginEmail');
      if (emailInput) emailInput.focus();
    }
  }
  window.evScrollToLogin = _scrollToLogin;

  /* ═══════════════════════════════════════════════════════════════
     SUBMIT NEW TICKET — checkboxes and/or typed text, straight to admin
  ═══════════════════════════════════════════════════════════════ */
  window.evSubmitTicket = async function() {
    const cbWrong = document.getElementById('ev-nt-cb-wrong');
    const cbDelay = document.getElementById('ev-nt-cb-delay');
    const desc    = document.getElementById('ev-nt-desc');
    const btn     = document.getElementById('ev-nt-submit');

    const issue_types = [];
    if (cbWrong && cbWrong.checked) issue_types.push('wrong_order');
    if (cbDelay && cbDelay.checked) issue_types.push('delay');
    const text = (desc && desc.value || '').trim();

    if (!text) {
      if (desc) { desc.focus(); desc.placeholder = 'Please describe your issue…'; }
      return;
    }
    if (!token) { _scrollToLogin(); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_types, first_message: text })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Drop it into our local list + open it
      state.threads.unshift(data);
      lastSeenCount[data.id] = (data.messages || []).length;
      evOpenThreadView(data.id, data);
      evStartPolling();
    } catch (_) {
      if (desc) desc.placeholder = '❌ Could not submit. Please try again.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Ticket'; }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     THREAD VIEW — a single ticket's conversation with admin
  ═══════════════════════════════════════════════════════════════ */
  window.evOpenThreadView = async function(threadId, preloaded) {
    state.activeThreadId = threadId;
    _showView('thread');

    const msgsEl = document.getElementById('ev-thread-msgs');
    if (msgsEl) msgsEl.innerHTML = '';

    const detail = preloaded || await _fetchThread(threadId);
    if (!detail) { evGoHome(); return; }

    document.getElementById('ev-thread-subject').textContent = detail.subject || 'Support ticket';
    _renderThreadMessages(detail.messages || []);
    lastSeenCount[threadId] = (detail.messages || []).length;
    _updateThreadBanner(detail.status);
    _syncThreadInput(detail.status);

    // Keep local list summary in sync
    const idx = state.threads.findIndex(t => t.id === threadId);
    if (idx >= 0) state.threads[idx].status = detail.status;
  };

  function _renderThreadMessages(messages) {
    const user = _getUser();
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const msgsEl = document.getElementById('ev-thread-msgs');
    if (!msgsEl) return;
    for (const m of messages) {
      if (m.sender === 'admin') {
        _appendLocal(msgsEl, _adminBubbleHtml(m.body, _fmtTime(m.created_at)));
      } else {
        _appendLocal(msgsEl, _userBubbleHtml(m.body, initial, _fmtTime(m.created_at)));
      }
    }
    evScrollThreadBottom();
  }

  function evScrollThreadBottom() {
    const el = document.getElementById('ev-thread-msgs');
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
  }

  window.evThreadKeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); evSendThreadReply(); }
  };

  window.evSendThreadReply = async function() {
    const input = document.getElementById('ev-thread-input');
    if (!input || input.disabled) return;
    const text = input.value.trim();
    if (!text || !state.activeThreadId) return;

    const user = _getUser();
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const msgsEl = document.getElementById('ev-thread-msgs');
    _appendLocal(msgsEl, _userBubbleHtml(text, initial, evNow()));
    evScrollThreadBottom();
    input.value = '';
    evAutoResize(input);
    lastSeenCount[state.activeThreadId] = (lastSeenCount[state.activeThreadId] || 0) + 1;

    try {
      await fetch(`${SUPPORT_API}/threads/${state.activeThreadId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text })
      });
    } catch (_) {}
  };

  window.evMarkResolved = async function() {
    if (!state.activeThreadId) return;
    try {
      await fetch(`${SUPPORT_API}/threads/${state.activeThreadId}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      _updateThreadBanner('resolved');
      _syncThreadInput('resolved');
    } catch (_) {}
  };

  function _updateThreadBanner(status) {
    const banner = document.getElementById('ev-thread-banner');
    if (!banner) return;
    if (['resolved','closed'].includes(status)) {
      const label = status === 'resolved' ? '✅ This ticket has been resolved' : '🔒 This ticket is closed';
      banner.style.display = 'block';
      banner.innerHTML = `
        <div>${label}</div>
        <button class="ev-new-ticket-btn" onclick="evOpenNewTicketForm()">＋ Open New Ticket</button>`;
    } else {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }
  }

  function _syncThreadInput(status) {
    const isClosed = ['resolved','closed'].includes(status);
    const input = document.getElementById('ev-thread-input');
    const btn   = document.getElementById('ev-thread-send');
    if (input) {
      input.disabled = isClosed;
      input.placeholder = isClosed
        ? 'This ticket is closed. Open a new one if you need more help.'
        : 'Type your message…';
      input.style.opacity = isClosed ? '0.5' : '1';
    }
    if (btn) btn.disabled = isClosed;
  }

  /* ═══════════════════════════════════════════════════════════════
     POLLING — every 15s while widget is open
  ═══════════════════════════════════════════════════════════════ */
  function evStartPolling() {
    if (pollHandle || !token) return;
    pollHandle = setInterval(_pollThreads, 15000);
  }
  function evStopPolling() {
    if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
  }

  async function _pollThreads() {
    if (!token) return;
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const threads = await res.json();
      state.threads = (threads || []).slice().sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      let newAdminCount = 0;

      for (const t of state.threads) {
        const known = lastSeenCount[t.id] ?? 0;
        const count = t.message_count || 0;
        if (count > known) {
          if (t.id === state.activeThreadId && state.view === 'thread') {
            // Fetch full detail and append only the new messages
            const detail = await _fetchThread(t.id);
            if (detail) {
              const allMsgs = detail.messages || [];
              const freshMsgs = allMsgs.slice(known);
              const adminMsgs = freshMsgs.filter(m => m.sender === 'admin');
              _renderThreadMessages(freshMsgs);
              lastSeenCount[t.id] = allMsgs.length;
              if (detail.status !== t.status) {
                _updateThreadBanner(detail.status);
                _syncThreadInput(detail.status);
              }
              newAdminCount += adminMsgs.length;
            }
          } else {
            // Not currently viewing this thread — just bump the cursor + badge
            if (t.last_message && t.last_message.sender === 'admin') newAdminCount++;
            lastSeenCount[t.id] = count;
          }
        }
      }

      if (state.view === 'home') _renderHome();

      if (newAdminCount > 0) {
        if (!state.open) {
          state.unread += newAdminCount;
          const badge = document.getElementById('ev-chat-badge');
          badge.textContent = state.unread;
          badge.classList.add('show');
        }
        const lastAdmin = state.threads
          .filter(t => t.last_message && t.last_message.sender === 'admin')
          .sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
        if (lastAdmin) {
          const body = lastAdmin.last_message.body || '';
          const preview = _stripMd(body).slice(0, 80) + (body.length > 80 ? '…' : '');
          evShowDashboardPopup(ADMIN_NAME, preview, () => {
            if (!state.open) window.evChatToggle();
            evOpenThreadView(lastAdmin.id);
          });
        }
      }
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════
     DASHBOARD MESSAGE POPUP
     Shows a floating banner on the dashboard when admin sends a
     message and the customer is not looking at the chat/tickets.
  ═══════════════════════════════════════════════════════════════ */
  function _isDashboardActive() {
    const sec = document.getElementById('sec-dashboard');
    return sec && (sec.classList.contains('active') || sec.style.display !== 'none');
  }
  function _isChatOpen() { return state.open; }
  function _isTicketsActive() {
    const sec = document.getElementById('sec-tickets');
    return sec && (sec.classList.contains('active') || sec.style.display !== 'none');
  }

  let _dashPopupHandle = null;

  function evShowDashboardPopup(senderName, preview, onViewClick) {
    if (!_isDashboardActive()) return;
    if (_isChatOpen() || _isTicketsActive()) return;

    const existing = document.getElementById('ev-dash-popup');
    if (existing) existing.remove();
    if (_dashPopupHandle) { clearTimeout(_dashPopupHandle); _dashPopupHandle = null; }

    const safeSender  = _escape(senderName);
    const safePreview = _escape(preview);
    const popup = document.createElement('div');
    popup.id = 'ev-dash-popup';
    popup.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#28a035,#1a6b23);
                    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;
                    box-shadow:0 0 0 3px rgba(61,212,74,.3);">👤</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:#3dd44a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;">
            ${safeSender} sent you a message
          </div>
          <div style="font-size:13px;color:#d0e8e0;line-height:1.45;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;">
            ${safePreview}
          </div>
        </div>
        <button id="ev-dash-popup-close"
                style="background:none;border:none;color:#7a8fad;cursor:pointer;font-size:18px;
                       line-height:1;padding:0 2px;flex-shrink:0;transition:color .2s;"
                title="Dismiss">×</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="ev-dash-popup-view"
                style="flex:1;background:linear-gradient(135deg,#3dd44a,#28a035);
                       border:none;border-radius:8px;padding:9px 14px;color:#000;
                       font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;
                       cursor:pointer;letter-spacing:.3px;transition:opacity .2s;">
          💬 View Message
        </button>
        <button id="ev-dash-popup-dismiss"
                style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
                       border-radius:8px;padding:9px 14px;color:#7a8fad;
                       font-family:'Montserrat',sans-serif;font-size:12px;font-weight:600;
                       cursor:pointer;transition:all .2s;">
          Dismiss
        </button>
      </div>
    `;

    if (!document.getElementById('ev-dash-popup-styles')) {
      const s = document.createElement('style');
      s.id = 'ev-dash-popup-styles';
      s.textContent = `
        #ev-dash-popup {
          position: fixed; bottom: 100px; right: 24px; z-index: 9999; width: 340px;
          background: #152b1e; border: 1px solid rgba(61,212,74,.45); border-radius: 16px;
          padding: 16px 18px; box-shadow: 0 8px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(61,212,74,.1);
          font-family: 'Montserrat', sans-serif; animation: ev-popup-in .35s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ev-popup-in { from { opacity:0; transform: translateY(20px) scale(.96); } to { opacity:1; transform: translateY(0) scale(1); } }
        #ev-dash-popup.ev-popup-out { animation: ev-popup-out .25s ease forwards; }
        @keyframes ev-popup-out { to { opacity:0; transform: translateY(12px) scale(.95); } }
        #ev-dash-popup-view:hover  { opacity: .85; }
        #ev-dash-popup-dismiss:hover { color: #d0dff0; border-color: rgba(255,255,255,.25); }
        #ev-dash-popup-close:hover { color: #d0dff0; }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(popup);

    function _dismiss() {
      popup.classList.add('ev-popup-out');
      setTimeout(() => popup.remove(), 260);
      if (_dashPopupHandle) { clearTimeout(_dashPopupHandle); _dashPopupHandle = null; }
    }

    document.getElementById('ev-dash-popup-close').onclick    = _dismiss;
    document.getElementById('ev-dash-popup-dismiss').onclick  = _dismiss;
    document.getElementById('ev-dash-popup-view').onclick     = () => {
      _dismiss();
      if (typeof onViewClick === 'function') onViewClick();
    };

    _dashPopupHandle = setTimeout(_dismiss, 12000);
  }

  /* ═══════════════════════════════════════════════════════════════
     TOGGLE OPEN/CLOSE + BOOT
  ═══════════════════════════════════════════════════════════════ */
  window.evChatToggle = function() {
    state.open = !state.open;
    const win   = document.getElementById('ev-chat-window');
    const fab   = document.getElementById('ev-chat-fab');
    const badge = document.getElementById('ev-chat-badge');
    if (state.open) {
      win.classList.add('open');
      fab.classList.add('open');
      state.unread = 0;
      badge.classList.remove('show');
      if (!_booted) {
        _booted = true;
        _renderShortcuts();
        _showView('home');
        evBootWidget();
      } else {
        evStartPolling();
      }
    } else {
      win.classList.remove('open');
      fab.classList.remove('open');
      evStopPolling();
    }
  };

  // Render the shortcuts row immediately so it's visible even before the
  // widget is first opened / before login state is known.
  document.addEventListener('DOMContentLoaded', () => { try { _renderShortcuts(); } catch(_){} });
  setTimeout(() => { try { _renderShortcuts(); } catch(_){} }, 300);

  window.evAutoResize = function(el) {
    el.style.height = '42px';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    el.style.overflowY = el.scrollHeight > 100 ? 'auto' : 'hidden';
  };

  /* ═══════════════════════════════════════════════════════════════
     BUBBLE RENDERERS (thread view + instant answer panel share these)
  ═══════════════════════════════════════════════════════════════ */
  function _adminBubbleHtml(text, time, isInstant) {
    const formatted = _fmt(text);
    return `
      <div class="ev-msg from-admin">
        <div class="ev-msg-avatar" title="${ADMIN_NAME}">${ADMIN_AVATAR}</div>
        <div>
          <div class="ev-msg-bubble">${formatted}</div>
          <div class="ev-msg-time">${isInstant ? 'Instant answer' : ADMIN_NAME} · ${time}</div>
        </div>
      </div>`;
  }

  function _userBubbleHtml(text, initial, time) {
    const safeText = _escape(text).replace(/\n/g,'<br>');
    return `
      <div class="ev-msg from-user">
        <div class="ev-msg-avatar ev-user-avatar">${initial}</div>
        <div>
          <div class="ev-msg-bubble">${safeText}</div>
          <div class="ev-msg-time">${time}</div>
        </div>
      </div>`;
  }

  function _typingHtml(id) {
    return `
      <div class="ev-msg from-admin" id="${id}">
        <div class="ev-msg-avatar">${ADMIN_AVATAR}</div>
        <div class="ev-msg-bubble" style="padding:10px 14px;">
          <div class="ev-typing"><span></span><span></span><span></span></div>
        </div>
      </div>`;
  }

  function _appendLocal(container, html) {
    if (!container) return;
    container.insertAdjacentHTML('beforeend', html);
  }

  /* ── Utilities ── */
  function _escape(text) {
    return String(text||'')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _fmt(text) {
    const safe = _escape(text);
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]*)\)/g,
        '<a href="$2" target="_blank" rel="noopener" style="color:#4ade80;text-decoration:underline;">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function _fmtTime(iso) {
    if (!iso) return evNow();
    try {
      return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    } catch(_) { return evNow(); }
  }

  function evNow() {
    return new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }

  function _getUser() {
    try { return JSON.parse(localStorage.getItem('ev_user') || '{}'); } catch(_) { return {}; }
  }

  /* ═══════════════════════════════════════════════════════════════
     EXTRA CSS injected at runtime
  ═══════════════════════════════════════════════════════════════ */
  (function _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Views */
      #ev-view-home, #ev-view-new, #ev-view-thread {
        display:none; flex-direction:column; flex:1; min-height:0; overflow:hidden;
      }

      /* Shortcuts */
      .ev-shortcuts-wrap { padding:12px 14px 4px; flex-shrink:0; }
      .ev-shortcuts-label { font-size:11px; font-weight:800; color:#3dd44a; letter-spacing:.4px; text-transform:uppercase; margin-bottom:8px; }
      .ev-shortcuts-grid { display:flex; flex-wrap:wrap; gap:7px; }
      .ev-shortcut-btn {
        padding:7px 12px; border-radius:20px; font-size:11.5px; font-weight:600;
        background:rgba(61,212,74,.1); border:1px solid rgba(61,212,74,.25);
        color:#3dd44a; cursor:pointer; font-family:'Montserrat',sans-serif;
        transition:all .2s; white-space:nowrap;
      }
      .ev-shortcut-btn:hover { background:rgba(61,212,74,.2); border-color:rgba(61,212,74,.5); }

      #ev-instant-answer-panel {
        display:none; flex-direction:column; gap:10px; margin:10px 14px;
        padding:12px; max-height:220px; overflow-y:auto;
        background:#111820; border:1px solid rgba(61,212,74,.15); border-radius:12px;
        position:relative;
      }

      /* Ticket list */
      .ev-tickets-wrap { flex:1; min-height:0; overflow-y:auto; padding:4px 14px 8px; display:flex; flex-direction:column; gap:8px; }
      .ev-tickets-label { font-size:11px; font-weight:800; color:#7a8fad; letter-spacing:.4px; text-transform:uppercase; margin:10px 0 6px; }
      .ev-tickets-empty { font-size:12.5px; color:#5a7290; line-height:1.6; padding:8px 2px; }
      .ev-ticket-card {
        display:block; width:100%; text-align:left; background:#1a2435;
        border:1px solid rgba(61,212,74,.12); border-radius:10px; padding:10px 12px;
        cursor:pointer; font-family:'Montserrat',sans-serif; transition:border-color .2s;
      }
      .ev-ticket-card:hover { border-color:rgba(61,212,74,.4); }
      .ev-ticket-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; }
      .ev-ticket-subject { font-size:12.5px; font-weight:700; color:#f0f4ff; }
      .ev-ticket-status { font-size:10px; font-weight:700; white-space:nowrap; }
      .ev-ticket-status-open { color:#ff6b6b; }
      .ev-ticket-status-pending { color:#fbbf24; }
      .ev-ticket-status-resolved { color:#3dd44a; }
      .ev-ticket-status-closed { color:#7a8fad; }
      .ev-ticket-preview { font-size:11.5px; color:#6a8aaa; line-height:1.4; }

      /* New ticket button (home) */
      .ev-new-ticket-cta {
        margin:8px 14px 14px; padding:11px; border-radius:10px; border:none;
        background:linear-gradient(135deg,#3dd44a,#28a035); color:#000;
        font-family:'Montserrat',sans-serif; font-size:13px; font-weight:800;
        cursor:pointer; letter-spacing:.2px; flex-shrink:0;
      }

      /* Login prompt */
      #ev-login-prompt {
        display:none; flex-direction:column; align-items:center; text-align:center;
        gap:10px; padding:28px 20px; color:#7a8fad; font-size:12.5px; line-height:1.6;
      }
      #ev-login-prompt button {
        padding:9px 18px; border-radius:8px; border:none;
        background:linear-gradient(135deg,#3dd44a,#28a035); color:#000;
        font-family:'Montserrat',sans-serif; font-size:12.5px; font-weight:800; cursor:pointer;
      }

      /* New ticket form */
      .ev-nt-form { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:14px; }
      .ev-nt-hd { display:flex; align-items:center; gap:8px; }
      .ev-nt-back { background:none; border:none; color:#7a8fad; font-size:18px; cursor:pointer; padding:2px 4px; }
      .ev-nt-title { font-size:14px; font-weight:800; color:#f0f4ff; }
      .ev-nt-sub { font-size:12px; color:#6a8aaa; line-height:1.5; }
      .ev-nt-checkboxes { display:flex; flex-direction:column; gap:8px; }
      .ev-nt-cb-row {
        display:flex; align-items:center; gap:9px; padding:10px 12px;
        background:#1a2435; border:1px solid rgba(61,212,74,.15); border-radius:10px;
        cursor:pointer; font-size:12.5px; color:#d0dff0;
      }
      .ev-nt-cb-row input { width:16px; height:16px; accent-color:#3dd44a; cursor:pointer; }
      .ev-nt-hint { font-size:11px; color:#5a7290; }
      .ev-nt-textarea {
        width:100%; min-height:90px; background:#1a2435; border:1px solid rgba(61,212,74,.18);
        border-radius:10px; padding:10px 12px; color:#f0f4ff; font-family:'Montserrat',sans-serif;
        font-size:13px; outline:none; resize:vertical; line-height:1.5;
      }
      .ev-nt-textarea:focus { border-color:rgba(61,212,74,.45); }
      .ev-nt-submit {
        padding:12px; border-radius:10px; border:none;
        background:linear-gradient(135deg,#3dd44a,#28a035); color:#000;
        font-family:'Montserrat',sans-serif; font-size:13.5px; font-weight:800; cursor:pointer;
      }
      .ev-nt-submit:disabled { opacity:.6; cursor:default; }

      /* Thread view header */
      .ev-thread-hd { display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid rgba(61,212,74,.1); flex-shrink:0; }
      .ev-thread-subject { flex:1; font-size:13px; font-weight:800; color:#f0f4ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

      /* Message bubbles (shared: thread + instant answer panel) */
      .ev-msg{display:flex;gap:8px;align-items:flex-end;max-width:88%;}
      .ev-msg.from-admin{align-self:flex-start;}
      .ev-msg.from-user{align-self:flex-end;flex-direction:row-reverse;}
      .ev-msg-avatar{
        width:28px;height:28px;border-radius:50%;flex-shrink:0;
        background:linear-gradient(135deg,#3dd44a,#1a6b23);
        display:flex;align-items:center;justify-content:center;font-size:12px;
      }
      .ev-msg-bubble{
        padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.55;
        max-width:230px;word-break:break-word;position:relative;
        background:#1a2435;border:1px solid rgba(61,212,74,.15);color:#d0dff0;
      }
      .from-admin .ev-msg-bubble{ border-radius:4px 14px 14px 14px; }
      .from-user .ev-msg-bubble{
        background:linear-gradient(135deg,#3dd44a,#28a035);
        color:#fff;border-radius:14px 4px 14px 14px; border:none;
      }
      .ev-msg-time{font-size:10px;color:#3a5570;margin-top:4px;text-align:right;}
      .from-admin .ev-msg-time{text-align:left;}
      .ev-user-avatar{
        background:linear-gradient(135deg,#243048,#1a2435);
        color:#3dd44a;font-weight:800;font-size:14px;
      }

      /* Typing indicator */
      .ev-typing{display:flex;gap:4px;align-items:center;padding:2px 4px;}
      .ev-typing span{ width:6px;height:6px;border-radius:50%;background:#3dd44a;opacity:.6; animation:ev-bounce .9s infinite; }
      .ev-typing span:nth-child(2){animation-delay:.15s;}
      .ev-typing span:nth-child(3){animation-delay:.3s;}
      @keyframes ev-bounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-6px);}}

      /* Resolved / closed banner */
      #ev-thread-banner {
        display:none; margin:8px 14px; padding:10px 13px 12px; border-radius:10px;
        font-size:11.5px; font-weight:700; text-align:center; letter-spacing:.3px; flex-shrink:0;
        background:rgba(61,212,74,.07); border:1px solid rgba(61,212,74,.2); color:#3dd44a;
      }
      .ev-new-ticket-btn {
        display:inline-block; margin-top:9px; padding:7px 18px;
        background:linear-gradient(135deg,#3dd44a,#28a035); border:none; border-radius:8px;
        color:#000; font-family:'Montserrat',sans-serif; font-size:11.5px; font-weight:800;
        letter-spacing:.4px; cursor:pointer; transition:opacity .2s, transform .15s;
      }
      .ev-new-ticket-btn:hover { opacity:.85; transform:translateY(-1px); }

      /* Thread input row (reuse layout) */
      .ev-chat-input:disabled { cursor:not-allowed; background:#111820 !important; }
    `;
    document.head.appendChild(style);
  })();

})();