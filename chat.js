/* ═══════════════════ ENDAVIRAL CHAT WIDGET (DB-backed) ═══════════════════ */
(function(){
  const BOT_NAME    = 'EndaViral Bot';
  const ADMIN_NAME  = 'EndaViral Support';
  const BOT_AVATAR  = '🦠';
  const ADMIN_AVATAR = '👤';
  const SUPPORT_API = API + '/support';

  // threadIds stores { id, status } per tab so we know if a thread is closed
  const threadMeta = { order: null, delay: null }; // { id, status }

  // Server-side message count cursor — never tied to DOM count
  const lastSeenCount = { order: 0, delay: 0 };

  let pollHandle = null;

  /* ═══════════════════════════════════════════════════════════════
     BOOT — load ALL threads for user (open, pending, resolved, closed)
     and render history + status banners
  ═══════════════════════════════════════════════════════════════ */
  async function evBootWidget() {
    if (!token) return;
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const threads = await res.json();

      // Sort newest-first so we pick the most recent thread per tab
      const sorted = (threads || []).slice().sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      for (const t of sorted) {
        const tabKey = t.type === 'wrong_order' ? 'order' : 'delay';
        if (!threadMeta[tabKey]) {
          // Fetch full thread with messages
          const detail = await _fetchThread(t.id);
          if (!detail) continue;
          threadMeta[tabKey] = { id: detail.id, status: detail.status };
          lastSeenCount[tabKey] = (detail.messages || []).length;

          // Clear any local greeting that was pre-rendered
          const container = document.getElementById('ev-msgs-' + tabKey);
          container.innerHTML = '';

          // Render full history
          _renderMessages(tabKey, detail.messages || [], false);

          // Show closed/resolved banner if needed
          _updateThreadBanner(tabKey, detail.status);

          // Hide chips if thread is closed
          _syncInputState(tabKey, detail.status);

          // Advance flow step past bot collection so further msgs don't re-trigger flows
          if (['resolved','closed'].includes(detail.status)) {
            state[tabKey === 'order' ? 'order' : 'delay'].step = 99;
          }
        }
      }

      evStartPolling();
    } catch (_) {}
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
     OPEN a new thread (first user message)
  ═══════════════════════════════════════════════════════════════ */
  async function evOpenThread(tabKey, firstMessage) {
    if (!token) {
      evTypingThen(tabKey, 800, () => {
        evBotMsgLocal(tabKey,
          `🔒 You need to be **logged in** to submit a support ticket so we can track your issue.\n\n` +
          `👉 [**Sign in or create a free account →**](#login)\n\n` +
          `Once logged in, come back here and I'll pick up right where we left off!`,
          true
        );
      });
      return;
    }
    const type = tabKey === 'order' ? 'wrong_order' : 'delay';
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, first_message: firstMessage })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      threadMeta[tabKey] = { id: data.id, status: data.status };

      // Clear local greeting, render server truth (includes bot greeting + user msg)
      const container = document.getElementById('ev-msgs-' + tabKey);
      container.innerHTML = '';
      _renderMessages(tabKey, data.messages || [], false);
      lastSeenCount[tabKey] = (data.messages || []).length;

      evStartPolling();
    } catch (_) {
      evBotMsgLocal(tabKey, '❌ Could not reach support. Please try again in a moment.', true);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     POST a user message to an existing thread
  ═══════════════════════════════════════════════════════════════ */
  async function evPostMessage(tabKey, body) {
    const meta = threadMeta[tabKey];
    if (!token || !meta) return;
    try {
      await fetch(`${SUPPORT_API}/threads/${meta.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════
     POST a bot message to the server so admin sees full conversation.
     Only fires when a thread exists. Pre-thread greetings = local only.
  ═══════════════════════════════════════════════════════════════ */
  async function evPostBotMessage(tabKey, body) {
    const meta = threadMeta[tabKey];
    if (!token || !meta) return;
    try {
      await fetch(`${SUPPORT_API}/threads/${meta.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, is_bot: true })
      });
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════
     POLLING — every 5 s while widget is open
     Uses lastSeenCount[tabKey] as cursor — never DOM count
  ═══════════════════════════════════════════════════════════════ */
  function evStartPolling() {
    if (pollHandle) return;
    pollHandle = setInterval(_pollAllTabs, 15000); // 15s -- was 5s (egress)
  }
  function evStopPolling() {
    if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
  }

  async function _pollAllTabs() {
    // Skip entirely if all known threads are resolved/closed (no new msgs possible)
    const hasOpenThread = ['order','delay'].some(k => {
      const m = threadMeta[k];
      return m && !['resolved','closed'].includes(m.status);
    });
    if (!hasOpenThread && (threadMeta.order || threadMeta.delay)) {
      evStopPolling(); // all threads closed -- stop until a new thread is opened
      return;
    }
    // Poll both tabs so background tab also picks up replies
    for (const tabKey of ['order', 'delay']) {
      const meta = threadMeta[tabKey];
      if (!meta || !token) continue;
      // Skip closed/resolved threads — no new messages expected
      if (['resolved','closed'].includes(meta.status)) continue;

      try {
        const res = await fetch(`${SUPPORT_API}/threads/${meta.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) continue;
        const data = await res.json();

        // Update local status if it changed
        if (data.status !== meta.status) {
          meta.status = data.status;
          _updateThreadBanner(tabKey, data.status);
          _syncInputState(tabKey, data.status);
        }

        const msgs = data.messages || [];
        const known = lastSeenCount[tabKey];

        if (msgs.length > known) {
          const newMsgs = msgs.slice(known);
          let newAdminCount = 0;

          for (const m of newMsgs) {
            if (m.sender === 'admin') {
              // Differentiate real admin from bot
              if (m.is_bot) {
                evBotMsgLocal(tabKey, m.body, false);
              } else {
                evRealAdminMsgLocal(tabKey, m.body, false);
              }
              newAdminCount++;
            }
            // User messages from other sessions (edge case) — skip, already in DOM
          }

          // Advance cursor
          lastSeenCount[tabKey] = msgs.length;

          // Unread badge only for the inactive tab or closed widget
          if (newAdminCount > 0 && (!state.open || state.activeTab !== tabKey)) {
            state.unread += newAdminCount;
            const badge = document.getElementById('ev-chat-badge');
            badge.textContent = state.unread;
            badge.classList.add('show');

            // Show dashboard popup so customers on the home page see the reply
            const lastAdminMsg = newMsgs.filter(m => m.sender === 'admin' && !m.is_bot).pop();
            if (lastAdminMsg) {
              const body = lastAdminMsg.body || '';
              const preview = body.replace(/\*\*/g,'').replace(/\*/g,'').replace(/\n/g,' ').slice(0, 80) + (body.length > 80 ? '…' : '');
              evShowDashboardPopup('EndaViral Support', preview, () => {
                // Open the chat widget to the right tab
                if (!state.open) window.evChatToggle();
                const orderTab = document.getElementById('ev-tab-order');
                const delayTab = document.getElementById('ev-tab-delay');
                if (tabKey === 'order' && orderTab) orderTab.click();
                if (tabKey === 'delay' && delayTab) delayTab.click();
              });
            }
          }
        }
      } catch (_) {}
    }
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

  function _isChatOpen() {
    return state.open;
  }

  function _isTicketsActive() {
    const sec = document.getElementById('sec-tickets');
    return sec && (sec.classList.contains('active') || sec.style.display !== 'none');
  }

  let _dashPopupHandle = null;

  function evShowDashboardPopup(senderName, preview, onViewClick) {
    // Only show when customer is on dashboard and chat/tickets aren't open
    if (!_isDashboardActive()) return;
    if (_isChatOpen() || _isTicketsActive()) return;

    // Remove any existing popup
    const existing = document.getElementById('ev-dash-popup');
    if (existing) existing.remove();
    if (_dashPopupHandle) { clearTimeout(_dashPopupHandle); _dashPopupHandle = null; }

    const safeSender  = String(senderName||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safePreview = String(preview||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

    // Styles injected once
    if (!document.getElementById('ev-dash-popup-styles')) {
      const s = document.createElement('style');
      s.id = 'ev-dash-popup-styles';
      s.textContent = `
        #ev-dash-popup {
          position: fixed;
          bottom: 100px;
          right: 24px;
          z-index: 9999;
          width: 340px;
          background: #152b1e;
          border: 1px solid rgba(61,212,74,.45);
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 8px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(61,212,74,.1);
          font-family: 'Montserrat', sans-serif;
          animation: ev-popup-in .35s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ev-popup-in {
          from { opacity:0; transform: translateY(20px) scale(.96); }
          to   { opacity:1; transform: translateY(0)    scale(1);   }
        }
        #ev-dash-popup.ev-popup-out {
          animation: ev-popup-out .25s ease forwards;
        }
        @keyframes ev-popup-out {
          to { opacity:0; transform: translateY(12px) scale(.95); }
        }
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

    document.getElementById('ev-dash-popup-close').onclick   = _dismiss;
    document.getElementById('ev-dash-popup-dismiss').onclick  = _dismiss;
    document.getElementById('ev-dash-popup-view').onclick     = () => {
      _dismiss();
      if (typeof onViewClick === 'function') onViewClick();
    };

    // Auto-dismiss after 12 seconds
    _dashPopupHandle = setTimeout(_dismiss, 12000);
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER history from server
     isBot flag comes from m.is_bot field
  ═══════════════════════════════════════════════════════════════ */
  function _renderMessages(tabKey, messages, updateCursor = true) {
    const user = _getUser();
    const initial = (user.name || 'U').charAt(0).toUpperCase();

    for (const m of messages) {
      if (m.sender === 'admin') {
        if (m.is_bot) {
          evBotMsgLocal(tabKey, m.body, false, _fmtTime(m.created_at));
        } else {
          evRealAdminMsgLocal(tabKey, m.body, false, _fmtTime(m.created_at));
        }
      } else {
        evUserMsgLocal(tabKey, m.body, initial, _fmtTime(m.created_at));
      }
    }

    if (updateCursor) {
      lastSeenCount[tabKey] = messages.length;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     THREAD STATUS BANNER  (closed / resolved)
  ═══════════════════════════════════════════════════════════════ */
  function _updateThreadBanner(tabKey, status) {
    const bannerId = 'ev-thread-banner-' + tabKey;
    let banner = document.getElementById(bannerId);

    if (['resolved','closed'].includes(status)) {
      const label = status === 'resolved'
        ? '✅ This ticket has been resolved'
        : '🔒 This ticket is closed';

      if (!banner) {
        const container = document.getElementById('ev-msgs-' + tabKey);
        const wrap = document.createElement('div');
        wrap.id = bannerId;
        wrap.style.cssText = `
          margin:8px 0;padding:10px 13px 12px;border-radius:10px;font-size:11.5px;
          font-weight:700;text-align:center;letter-spacing:.3px;flex-shrink:0;
          background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.2);
          color:#3dd44a;`;
        wrap.innerHTML = `
          <div class="ev-banner-label">${label}</div>
          <button class="ev-new-ticket-btn" onclick="evOpenNewTicket('${tabKey}')">
            ＋ Open New Ticket
          </button>`;
        container.parentNode.insertBefore(wrap, container.nextSibling);
      } else {
        const labelEl = banner.querySelector('.ev-banner-label');
        if (labelEl) labelEl.textContent = label;
      }
    } else {
      if (banner) banner.remove();
    }
  }

  /* ── Open a fresh ticket on the same tab ── */
  window.evOpenNewTicket = function(tabKey) {
    // Wipe thread state for this tab
    threadMeta[tabKey] = null;
    lastSeenCount[tabKey] = 0;
    state[tabKey].step = 0;

    // Clear message area
    const container = document.getElementById('ev-msgs-' + tabKey);
    if (container) container.innerHTML = '';

    // Remove status banner
    const banner = document.getElementById('ev-thread-banner-' + tabKey);
    if (banner) banner.remove();

    // Re-enable input
    _syncInputState(tabKey, 'open');

    // Show fresh bot greeting
    const greetings = {
      order: "👋 Starting a new ticket! I'm here to help fix your order.\n\nJust tell me what happened and I'll walk you through it step by step.",
      delay: "⏳ Starting a new ticket! Share your **Order ID** and I'll look into the delay for you right away."
    };
    evTypingThen(tabKey, 800, () => {
      evBotMsgLocal(tabKey, greetings[tabKey]);
    });
  };

  /* Lock / unlock input based on thread status */
  function _syncInputState(tabKey, status) {
    const isClosed = ['resolved','closed'].includes(status);
    const input = document.getElementById('ev-input-' + tabKey);
    const btn   = document.getElementById('ev-send-' + tabKey);
    const chips = document.getElementById('ev-chips-' + tabKey);
    if (input) {
      input.disabled = isClosed;
      input.placeholder = isClosed
        ? 'This ticket is closed. Open a new one if you need more help.'
        : (tabKey === 'order'
          ? 'Describe your issue or paste the correct link…'
          : 'Share your Order ID or describe the delay…');
      input.style.opacity = isClosed ? '0.5' : '1';
    }
    if (btn)   btn.disabled = isClosed;
    if (chips) chips.style.display = isClosed ? 'none' : 'flex';
  }

  /* ═══════════════════════════════════════════════════════════════
     WIDGET STATE
  ═══════════════════════════════════════════════════════════════ */
  const state = {
    order:     { step: 0 },
    delay:     { step: 0 },
    unread:    0,
    open:      false,
    activeTab: 'order',
  };

  /* ── Boot greeting (local only, shown before DB loads) ── */
  let _greetingRendered = false;
  setTimeout(() => {
    if (_greetingRendered) return;
    _greetingRendered = true;
    evBotMsgLocal('order',
      "👋 Hi there! I'm the EndaViral support bot.\n\nIf you placed a **wrong order** (wrong link, wrong quantity, wrong service), I can help fix it!\n\nJust tell me what happened and I'll walk you through it step by step.",
      true
    );
    evBotMsgLocal('delay',
      "⏳ Hi! Experiencing a service delay?\n\nShare your **Order ID** (found in My Orders) and I'll check on it right away. Delays are usually resolved within a few hours.",
      true
    );
    if (!state.open) {
      state.unread = 1;
      const badge = document.getElementById('ev-chat-badge');
      badge.textContent = '1';
      badge.classList.add('show');
    }
  }, 1200);

  /* ── Toggle open/close ── */
  let _booted = false;
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
      evScrollBottom(state.activeTab);
      evStartPolling();
      if (!_booted) {
        _booted = true;
        evBootWidget();
      }
    } else {
      win.classList.remove('open');
      fab.classList.remove('open');
      evStopPolling();
    }
  };

  /* ── Tab switching ── */
  window.evSwitchTab = function(tab) {
    state.activeTab = tab;
    ['order','delay'].forEach(t => {
      document.getElementById('ev-tab-' + t).classList.toggle('active', t === tab);
      const pane = document.getElementById('ev-pane-' + t);
      pane.style.display = t === tab ? 'flex' : 'none';
    });
    evScrollBottom(tab);
  };

  /* ── Quick-reply chips ── */
  window.evChip = function(text) {
    const tab   = state.activeTab;
    const input = document.getElementById('ev-input-' + tab);
    if (input.disabled) return;
    input.value = text;
    input.focus();
    evAutoResize(input);
  };

  window.evAutoResize = function(el) {
    el.style.height = '42px';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    el.style.overflowY = el.scrollHeight > 100 ? 'auto' : 'hidden';
  };

  window.evKeydown = function(e, tab) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); evSend(tab); }
  };

  /* ── Send ── */
  window.evSend = function(tab) {
    const input = document.getElementById('ev-input-' + tab);
    if (input.disabled) return;
    const text = input.value.trim();
    if (!text) return;

    const user        = _getUser();
    const userInitial = (user.name || 'U').charAt(0).toUpperCase();

    evUserMsgLocal(tab, text, userInitial);
    input.value = '';
    evAutoResize(input);

    const btn = document.getElementById('ev-send-' + tab);
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 2000);

    // Increment local cursor immediately so poll doesn't re-render this msg
    lastSeenCount[tab]++;

    if (!threadMeta[tab]) {
      // First message — open thread on server
      evOpenThread(tab, text);
    } else {
      // Post to existing thread
      evPostMessage(tab, text);
      if (tab === 'order') evHandleOrderFlow(text, user);
      else                 evHandleDelayFlow(text, user);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     FAQ DETECTOR — answers common questions before they hit admin
     Returns true if the message was handled as a FAQ.
  ═══════════════════════════════════════════════════════════════ */
  const _faqs = [
    {
      match: /how.long.*(start|begin|deliver|take)/i,
      answer: `⏱️ **Delivery start times** vary by service:\n\n• **TikTok / Instagram / YouTube** — typically starts within **1–3 hours**\n• **Twitter / Facebook** — usually within **30 minutes to 2 hours**\n• **Slower growth packages** — may take up to **24 hours** to begin\n\nIf your order hasn't started after **24 hours**, open a Delayed Service ticket and we'll investigate.`
    },
    {
      match: /how.*(place|make|create|submit).*(order)/i,
      answer: `🛒 **How to place an order:**\n\n1. Click **New Order** in the left menu\n2. Browse or search for the service you want\n3. Paste your **profile or post link** in the link field\n4. Enter the **quantity** and click **Place Order**\n5. Complete payment via **M-Pesa STK push**\n\nMake sure your link is public and correct before submitting!`
    },
    {
      match: /how.*(get|find|copy|share).*(link|url)/i,
      answer: `🔗 **How to get your link:**\n\n• **TikTok profile:** Open TikTok → tap your profile → tap the share icon → *Copy link*\n• **TikTok video:** Open the video → tap Share → *Copy link*\n• **Instagram:** Go to your profile/post → tap ··· → *Copy link*\n• **YouTube:** Open your video → tap Share → *Copy link*\n• **Facebook/Twitter:** Open post → tap Share → *Copy link*\n\nPaste the copied link directly — make sure the account is set to **Public**!`
    },
    {
      match: /refund|money back|cancel/i,
      answer: `💰 **Refund & cancellation policy:**\n\nIf your order **hasn't started** and you'd like to cancel, reply with your **Order ID** and we'll process a wallet refund within **1–2 hours**.\n\nIf an order **partially delivered** and stalled, our team will either complete it or refund the undelivered portion.`
    },
    {
      match: /payment.*(fail|not.work|error|declined)|m.?pesa.*(fail|not.work|error)/i,
      answer: `📱 **M-Pesa payment not working?**\n\nTry these steps:\n1. Make sure you have **sufficient M-Pesa balance**\n2. Check that your **phone number** on your account is correct\n3. The STK push expires in **60 seconds** — don't close the prompt\n4. If it keeps failing, try again in **5 minutes**\n\nStill stuck? Reply with your **phone number** (last 4 digits only for safety) and we'll look into it.`
    },
    {
      match: /what.*(service|offer|sell|available|provide)/i,
      answer: `📦 **Our services include:**\n\n• 📸 Instagram — Followers, Likes, Views, Story Views\n• 🎵 TikTok — Followers, Likes, Views, Shares\n• ▶️ YouTube — Views, Likes, Subscribers, Watch Time\n• 🐦 Twitter/X — Followers, Likes, Retweets\n• 📘 Facebook — Likes, Followers, Views\n\nClick **New Order** to browse all available packages and pricing!`
    },
    {
      match: /not.*(working|deliver|start|moving|progress)|stuck|no.*(change|update|result)/i,
      answer: `⚠️ **Order not progressing?**\n\nA few things to check:\n\n• Has it been **less than 24 hours**? Some services have a slow start — this is normal.\n• Is your profile/page still **public**? Private accounts block delivery.\n• Did the link change after ordering? Link changes stop delivery.\n\nIf it's been **over 24 hours** with no progress, please switch to the **⏳ Delayed Service** tab and share your Order ID — we'll escalate it right away.`
    },
  ];

  function _checkFaq(tab, text) {
    const lower = text.toLowerCase().trim();
    const s = tab === 'order' ? state.order : state.delay;
    const collectingData = (tab === 'order' && s.step >= 1 && s.step <= 4) ||
                           (tab === 'delay' && s.step === 1);
    if (collectingData) return false;
    for (const faq of _faqs) {
      if (faq.match.test(lower)) {
        evTypingThen(tab, 1000, () => { evBotMsgLocal(tab, faq.answer); });
        return true;
      }
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════
     FALLBACK — fires when the bot can't answer the question.
  ═══════════════════════════════════════════════════════════════ */
  function _botFallback(tab) {
    evTypingThen(tab, 1100, () => {
      evBotMsgLocal(tab,
        `🙋 I've passed your question to our support team — they'll get back to you within **12 hours**. We appreciate your patience!\n\n` +
        `💸 While you wait, did you know you can **earn with EndaViral's Affiliate Program?**\n` +
        `Share your referral link and earn a commission on every order your referrals place.\n\n` +
        `👉 [**Check out the Affiliate Program →**](/refer-and-earn)`
      );
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INPUT VALIDATORS
  ═══════════════════════════════════════════════════════════════ */
  function _looksLikeOrderId(text) {
    return /^\d{3,}$/.test(text.trim()) || /^[a-z0-9_-]{3,20}$/i.test(text.trim());
  }
  function _looksLikeQuantity(text) {
    return /^\d+[kK]?$/.test(text.trim());
  }
  function _looksLikeUrl(text) {
    return /^https?:\/\/.{5,}|^www\..{4,}|(instagram|tiktok|youtube|youtu\.be|facebook|twitter|x\.com|fb\.com)\..{2,}/i.test(text.trim());
  }

  /* ═══════════════════════════════════════════════════════════════
     ORDER CORRECTION FLOW (bot-guided, with validation + FAQ)
  ═══════════════════════════════════════════════════════════════ */
  function evHandleOrderFlow(text, user) {
    const s      = state.order;
    const helper = document.getElementById('ev-link-helper');

    if (_checkFaq('order', text)) return;

    if (s.step === 0) {
      s.step = 1;
      evTypingThen('order', 1400, () => {
        evBotMsgLocal('order',
          `Got it! I'll help fix your order right away. 🔧\n\nFirst, please share your **Order ID** — you can find it in the **My Orders** section.\n\n*(It's a number like* ***12345****)*`
        );
      });

    } else if (s.step === 1) {
      if (!_looksLikeOrderId(text)) {
        evTypingThen('order', 900, () => {
          evBotMsgLocal('order',
            `🤔 That doesn't look like an Order ID.\n\nYour **Order ID** is a number (e.g. *12345*) found in the **My Orders** section.\n\nPlease share the correct Order ID to continue.`
          );
        });
        return;
      }
      s.step = 2; s.orderId = text;
      evTypingThen('order', 1200, () => {
        evBotMsgLocal('order',
          `Thanks! Now, which **service** did you intend to order?\n\nFor example: *"Instagram Followers"*, *"YouTube Views"*, *"TikTok Likes"*, etc.\n\nJust type the service name.`
        );
      });

    } else if (s.step === 2) {
      s.step = 3; s.serviceName = text;
      evTypingThen('order', 1100, () => {
        evBotMsgLocal('order', `Got it — **${text}**. 👍\n\nWhat **quantity** did you want? (e.g. *1000*, *5000*, *10000*)`);
      });

    } else if (s.step === 3) {
      if (!_looksLikeQuantity(text)) {
        evTypingThen('order', 900, () => {
          evBotMsgLocal('order',
            `🤔 Please enter just the **quantity as a number** (e.g. *1000*, *5000*).\n\nHow many ${s.serviceName || 'units'} did you want?`
          );
        });
        return;
      }
      s.step = 4; s.quantity = text;
      if (helper) helper.style.display = 'block';
      evTypingThen('order', 1200, () => {
        evBotMsgLocal('order',
          `Perfect — **${text}** units. Almost done!\n\nFinally, paste the **correct link** for this order.\n\n💡 It should look like: *https://tiktok.com/@yourname* or *https://instagram.com/yourname*`
        );
      });

    } else if (s.step === 4) {
      if (!_looksLikeUrl(text)) {
        evTypingThen('order', 900, () => {
          evBotMsgLocal('order',
            `🔗 That doesn't look like a valid link.\n\nPlease paste the **full URL** of your profile or post.\n\nNeed help finding it? Type *"how to get the link"* and I'll guide you.`
          );
        });
        return;
      }
      s.step = 5; s.correctLink = text;
      if (helper) helper.style.display = 'none';

      const summary = [
        `🔁 Wrong Order Correction Request`,
        `📋 Order ID: ${s.orderId || 'not provided'}`,
        `📦 Intended Service: ${s.serviceName || 'not provided'}`,
        `🔢 Quantity: ${s.quantity || 'not provided'}`,
        `🔗 Correct Link: ${s.correctLink || text}`,
        `👤 User: ${user.name || user.email || 'unknown'}`,
      ].join('\n');
      evPostMessage('order', summary);
      lastSeenCount['order']++;

      evTypingThen('order', 1600, () => {
        evBotMsgLocal('order',
          `✅ Perfect! Here's what I've captured:\n\n` +
          `📋 **Order ID:** ${s.orderId||'—'}\n` +
          `📦 **Service:** ${s.serviceName||'—'}\n` +
          `🔢 **Quantity:** ${s.quantity||'—'}\n` +
          `🔗 **Link:** ${s.correctLink||text}\n\n` +
          `Our team has been notified and will process your correction within **15–30 minutes**. We'll update you here!`
        );
      });

    } else {
      if (!_checkFaq('order', text)) _botFallback('order');
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DELAY REPORTING FLOW (bot-guided, with FAQ)
  ═══════════════════════════════════════════════════════════════ */
  function evHandleDelayFlow(text, user) {
    const s      = state.delay;
    const notice = document.getElementById('ev-delay-notice');

    if (_checkFaq('delay', text)) return;

    if (s.step === 0) {
      s.step = 1;
      evTypingThen('delay', 1300, () => {
        evBotMsgLocal('delay',
          `I'm sorry to hear that! 😔 Service delays can happen due to high demand or provider issues.\n\nCould you share your **Order ID**? You can find it in the "My Orders" section.\n\n*(It's a number like* ***12345****)*`
        );
      });

    } else if (s.step === 1) {
      if (!_looksLikeOrderId(text)) {
        evTypingThen('delay', 900, () => {
          evBotMsgLocal('delay',
            `🤔 That doesn't look like an Order ID.\n\nYour **Order ID** is a number (e.g. *12345*) found in the **My Orders** section.\n\nPlease share the correct Order ID.`
          );
        });
        return;
      }
      s.step = 2; s.orderId = text;
      if (notice) notice.style.display = 'flex';
      evTypingThen('delay', 1500, () => {
        evBotMsgLocal('delay',
          `Thanks! I've escalated **Order #${text}** to our admin team. ✅\n\nMost delays are resolved within **2–6 hours**. If it's been over 24 hours, we'll issue a refund or re-queue your order.\n\nWe'll update you here shortly.`
        );
      });

    } else {
      if (!_checkFaq('delay', text)) _botFallback('delay');
    }
  }


  /* ═══════════════════════════════════════════════════════════════
     MESSAGE RENDERERS
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Bot message — automated / scripted (🦠 avatar, muted label)
   * @param {string} tab
   * @param {string} text
   * @param {boolean} [incrementCursor=true] — set false when rendering history
   * @param {string} [timeOverride]
   */
  function evBotMsgLocal(tab, text, incrementCursor = true, timeOverride) {
    const time      = timeOverride || evNow();
    const formatted = _fmt(text);
    const html = `
      <div class="ev-msg from-admin ev-msg-bot">
        <div class="ev-msg-avatar" title="EndaViral Bot">${BOT_AVATAR}</div>
        <div>
          <div class="ev-msg-bubble ev-bubble-bot">${formatted}</div>
          <div class="ev-msg-time">${BOT_NAME} · ${time}</div>
        </div>
      </div>`;
    evAppendMsg(tab, html);
    if (incrementCursor) lastSeenCount[tab]++;
    _maybeBadge();
    // Persist bot message to DB so admin sees full conversation
    // evPostBotMessage is a no-op if no thread exists yet (pre-thread greetings stay local)
    if (!timeOverride) evPostBotMessage(tab, text);
  }

  /**
   * Real human admin message — distinct styling (👤 avatar, green label)
   * @param {string} tab
   * @param {string} text
   * @param {boolean} [incrementCursor=true]
   * @param {string} [timeOverride]
   */
  function evRealAdminMsgLocal(tab, text, incrementCursor = true, timeOverride) {
    const time      = timeOverride || evNow();
    const formatted = _fmt(text);
    const html = `
      <div class="ev-msg from-admin ev-msg-human">
        <div class="ev-msg-avatar ev-admin-avatar" title="EndaViral Support">${ADMIN_AVATAR}</div>
        <div>
          <div class="ev-msg-bubble ev-bubble-human">${formatted}</div>
          <div class="ev-msg-time ev-time-human">${ADMIN_NAME} · ${time}</div>
        </div>
      </div>`;
    evAppendMsg(tab, html);
    if (incrementCursor) lastSeenCount[tab]++;
    _maybeBadge();
  }

  /**
   * User's own message
   */
  function evUserMsgLocal(tab, text, initial, timeOverride) {
    const time     = timeOverride || evNow();
    const safeText = text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    const html = `
      <div class="ev-msg from-user">
        <div class="ev-msg-avatar ev-user-avatar">${initial}</div>
        <div>
          <div class="ev-msg-bubble">${safeText}</div>
          <div class="ev-msg-time">${time}</div>
        </div>
      </div>`;
    evAppendMsg(tab, html);
  }

  function _maybeBadge() {
    if (!state.open) {
      state.unread++;
      const badge = document.getElementById('ev-chat-badge');
      badge.textContent = state.unread;
      badge.classList.add('show');
    }
  }

  /* ── Typing indicator ── */
  function evTypingThen(tab, delay, cb) {
    const typingHtml = `
      <div class="ev-msg from-admin ev-msg-bot" id="ev-typing-${tab}">
        <div class="ev-msg-avatar">${BOT_AVATAR}</div>
        <div class="ev-msg-bubble ev-bubble-bot" style="padding:10px 14px;">
          <div class="ev-typing"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    evAppendMsg(tab, typingHtml);
    setTimeout(() => {
      const el = document.getElementById('ev-typing-' + tab);
      if (el) el.remove();
      cb();
    }, delay);
  }

  /* ── DOM helpers ── */
  function evAppendMsg(tab, html) {
    const container = document.getElementById('ev-msgs-' + tab);
    if (!container) return;
    container.insertAdjacentHTML('beforeend', html);
    evScrollBottom(tab);
  }

  function evScrollBottom(tab) {
    const el = document.getElementById('ev-msgs-' + tab);
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
  }

  /* ── Utilities ── */
  function _fmt(text) {
    // Escape first, then apply safe markdown-like substitutions
    const safe = String(text||'')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
     — differentiates bot vs real admin bubbles
     — adds ticket history styling
  ═══════════════════════════════════════════════════════════════ */
  (function _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Bot bubble — same as before (muted card) */
      .ev-bubble-bot {
        background: #1a2435 !important;
        border: 1px solid rgba(61,212,74,.15) !important;
        color: #d0dff0 !important;
      }
      .ev-msg-bot .ev-msg-time {
        color: #3a5570;
      }

      /* Real admin bubble — slightly warmer, green-tinted border */
      .ev-bubble-human {
        background: #152b1e !important;
        border: 1px solid rgba(61,212,74,.45) !important;
        color: #e0f8e8 !important;
      }
      .ev-admin-avatar {
        background: linear-gradient(135deg,#28a035,#1a6b23) !important;
        font-size: 14px !important;
        box-shadow: 0 0 0 2px rgba(61,212,74,.4);
      }
      .ev-time-human {
        color: #3dd44a !important;
        font-weight: 700;
      }

      /* User avatar */
      .ev-user-avatar {
        background: linear-gradient(135deg,#243048,#1a2435);
        color: #3dd44a;
        font-weight: 800;
        font-size: 14px;
      }

      /* Resolved / closed banner */
      .ev-thread-status-banner {
        margin: 8px 14px;
        padding: 9px 13px;
        border-radius: 10px;
        font-size: 11.5px;
        font-weight: 700;
        text-align: center;
        letter-spacing: .3px;
        flex-shrink: 0;
      }
      .ev-thread-status-banner.resolved {
        background: rgba(61,212,74,.07);
        border: 1px solid rgba(61,212,74,.2);
        color: #3dd44a;
      }
      .ev-thread-status-banner.closed {
        background: rgba(122,143,173,.07);
        border: 1px solid rgba(122,143,173,.2);
        color: #7a8fad;
      }

      /* Disabled input styling */
      .ev-chat-input:disabled {
        cursor: not-allowed;
        background: #111820 !important;
      }

      /* New Ticket button inside closed/resolved banner */
      .ev-new-ticket-btn {
        display: inline-block;
        margin-top: 9px;
        padding: 7px 18px;
        background: linear-gradient(135deg, #3dd44a, #28a035);
        border: none;
        border-radius: 8px;
        color: #000;
        font-family: 'Montserrat', sans-serif;
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: .4px;
        cursor: pointer;
        transition: opacity .2s, transform .15s;
      }
      .ev-new-ticket-btn:hover {
        opacity: .85;
        transform: translateY(-1px);
      }
      .ev-new-ticket-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  })();

})();