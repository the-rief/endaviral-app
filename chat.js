/* ═══════════════════ ENDAVIRAL CHAT WIDGET (DB-backed) ═══════════════════ */
(function(){
  const ADMIN_NAME   = 'EndaViral Support';
  const ADMIN_AVATAR = '🦠';
  const SUPPORT_API  = API + '/support';

  const threadIds = { order: null, delay: null };
  let pollHandle = null;

  async function evBootWidget() {
    if (!token) return;
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) return;
      const threads = await res.json();
      for (const t of threads) {
        const tabKey = t.type === 'wrong_order' ? 'order' : 'delay';
        if (!threadIds[tabKey] && ['open','pending'].includes(t.status)) {
          threadIds[tabKey] = t.id;
          if (t.messages?.length) _renderMessages(tabKey, t.messages);
        }
      }
    } catch (_) {}
  }

  async function evOpenThread(tabKey, firstMessage) {
    if (!token) {
      evUserMsgLocal(tabKey, firstMessage);
      evAdminMsgLocal(tabKey, '⚠️ Please log in to save your conversation and get a real response.');
      return;
    }
    const type = tabKey === 'order' ? 'wrong_order' : 'delay';
    try {
      const res = await fetch(`${SUPPORT_API}/threads`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ type, first_message: firstMessage })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      threadIds[tabKey] = data.id;
      _renderMessages(tabKey, data.messages || []);
      evStartPolling();
    } catch (_) {
      evAdminMsgLocal(tabKey, '❌ Could not reach support. Please try again in a moment.');
    }
  }

  async function evPostMessage(tabKey, body) {
    if (!token || !threadIds[tabKey]) return;
    try {
      await fetch(`${SUPPORT_API}/threads/${threadIds[tabKey]}/messages`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ body })
      });
    } catch (_) {}
  }

  function evStartPolling() {
    if (pollHandle) return;
    pollHandle = setInterval(evPollReplies, 8000);
  }
  function evStopPolling() { if (pollHandle) { clearInterval(pollHandle); pollHandle = null; } }

  async function evPollReplies() {
    if (!state.open) return;
    const tabKey = state.activeTab;
    const tid = threadIds[tabKey];
    if (!tid || !token) return;
    try {
      const res = await fetch(`${SUPPORT_API}/threads/${tid}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const container = document.getElementById('ev-msgs-' + tabKey);
      const existingCount = container.querySelectorAll('.ev-msg').length;
      const msgs = data.messages || [];
      if (msgs.length > existingCount) {
        const newMsgs = msgs.slice(existingCount);
        for (const m of newMsgs) {
          if (m.sender === 'admin') evAdminMsgLocal(tabKey, m.body);
        }
        if (!state.open) {
          state.unread += newMsgs.filter(m=>m.sender==='admin').length;
          const badge = document.getElementById('ev-chat-badge');
          badge.textContent = state.unread;
          badge.classList.add('show');
        }
      }
    } catch (_) {}
  }

  function _renderMessages(tabKey, messages) {
    const user = (() => { try { return JSON.parse(localStorage.getItem('ev_user')||'{}'); } catch(_){ return {}; } })();
    const initial = (user.name||'U').charAt(0).toUpperCase();
    const container = document.getElementById('ev-msgs-' + tabKey);
    container.innerHTML = '';
    for (const m of messages) {
      if (m.sender === 'admin') evAdminMsgLocal(tabKey, m.body);
      else evUserMsgLocal(tabKey, m.body, initial);
    }
  }

  const state = { order:{step:0}, delay:{step:0}, unread:0, open:false, activeTab:'order' };

  // Boot greeting — fires once when widget loads
  setTimeout(() => {
    evAdminMsg('order',
      "👋 Hi there! I'm the EndaViral support team.\n\nIf you placed a **wrong order** (wrong link, wrong quantity, wrong service), I can help fix it!\n\nJust tell me what happened and I'll walk you through it step by step."
    );
    evAdminMsg('delay',
      "⏳ Hi! Experiencing a service delay?\n\nShare your **Order ID** (found in My Orders) and I'll check on it right away. Delays are usually resolved within a few hours."
    );
    if (!state.open) {
      state.unread = 1;
      const badge = document.getElementById('ev-chat-badge');
      badge.textContent = '1';
      badge.classList.add('show');
    }
  }, 1800);

  let _booted = false;
  window.evChatToggle = function() {
    state.open = !state.open;
    const win = document.getElementById('ev-chat-window');
    const fab = document.getElementById('ev-chat-fab');
    const badge = document.getElementById('ev-chat-badge');
    if (state.open) {
      win.classList.add('open');
      fab.classList.add('open');
      state.unread = 0;
      badge.classList.remove('show');
      evScrollBottom(state.activeTab);
      evStartPolling();
      if (!_booted) { _booted = true; evBootWidget(); }
    } else {
      win.classList.remove('open');
      fab.classList.remove('open');
      evStopPolling();
    }
  };

  window.evSwitchTab = function(tab) {
    state.activeTab = tab;
    ['order','delay'].forEach(t => {
      document.getElementById('ev-tab-'+t).classList.toggle('active', t === tab);
      const pane = document.getElementById('ev-pane-'+t);
      pane.style.display = t === tab ? 'flex' : 'none';
    });
    evScrollBottom(tab);
  };

  window.evChip = function(text) {
    const tab = state.activeTab;
    const input = document.getElementById('ev-input-'+tab);
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

  window.evSend = function(tab) {
    const input = document.getElementById('ev-input-'+tab);
    const text = input.value.trim();
    if (!text) return;

    // Get user info
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('ev_user') || '{}'); } catch(_){ return {}; }
    })();
    const userName = user.name || 'You';
    const userInitial = userName.charAt(0).toUpperCase();

    evUserMsg(tab, text, userInitial);
    input.value = '';
    evAutoResize(input);

    // Disable send while "typing"
    const btn = document.getElementById('ev-send-'+tab);
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 2000);

    // If no thread yet, open one (API). Otherwise post to existing thread.
    if (!threadIds[tab]) {
      evOpenThread(tab, text);
    } else {
      evPostMessage(tab, text);
      if (tab === 'order') evHandleOrderFlow(text, user);
      else evHandleDelayFlow(text, user);
    }
  };

  // ── Order correction flow ─────────────────────────────────────────────────
  function evHandleOrderFlow(text, user) {
    const s = state.order;
    const helper = document.getElementById('ev-link-helper');

    // Detect if user pasted a link
    const isLink = /https?:\/\/[^\s]+/.test(text);

    if (s.step === 0) {
      // First message received — ask for Order ID
      s.step = 1;
      evTypingThen('order', 1400, () => {
        evAdminMsg('order',
          `Got it! I'll help fix your order right away. 🔧\n\nFirst, please share your **Order ID** — you can find it in the **My Orders** section.`
        );
      });

    } else if (s.step === 1) {
      // Received Order ID — ask which service was wrong
      s.step = 2;
      s.orderId = text;
      evTypingThen('order', 1200, () => {
        evAdminMsg('order',
          `Thanks! Now, which **service** did you intend to order?\n\nFor example: *"Instagram Followers"*, *"YouTube Views"*, *"TikTok Likes"*, etc.\n\nJust type the service name.`
        );
      });

    } else if (s.step === 2) {
      // Received service name — ask for correct quantity
      s.step = 3;
      s.serviceName = text;
      evTypingThen('order', 1100, () => {
        evAdminMsg('order',
          `Got it — **${text}**. 👍\n\nWhat **quantity** did you want? (e.g. *1000*, *5000*, *10000*)` 
        );
      });

    } else if (s.step === 3) {
      // Received quantity — ask for the correct link
      s.step = 4;
      s.quantity = text;
      if (helper) helper.style.display = 'block';
      evTypingThen('order', 1200, () => {
        evAdminMsg('order',
          `Perfect — **${text}** units. Almost done!\n\nFinally, paste the **correct link** for this order (your profile URL, post URL, etc.) 👇`
        );
      });

    } else if (s.step === 4) {
      // Received link (or any text at this step)
      s.step = 5;
      s.correctLink = text;
      if (helper) helper.style.display = 'none';

      // Build a clean summary for admin
      const summary = [
        `🔁 Wrong Order Correction Request`,
        `📋 Order ID: ${s.orderId || 'not provided'}`,
        `📦 Intended Service: ${s.serviceName || 'not provided'}`,
        `🔢 Quantity: ${s.quantity || 'not provided'}`,
        `🔗 Correct Link: ${s.correctLink || text}`,
        `👤 User: ${user.name || user.email || 'unknown'}`,
      ].join('\n');

      evPostMessage('order', summary);

      evTypingThen('order', 1600, () => {
        evAdminMsg('order',
          `✅ Perfect! Here's what I've captured:\n\n📋 **Order ID:** ${s.orderId||'—'}\n📦 **Service:** ${s.serviceName||'—'}\n🔢 **Quantity:** ${s.quantity||'—'}\n🔗 **Link:** ${s.correctLink||text}\n\nOur team has been notified and will process your correction within **15–30 minutes**. We'll update you here!`
        );
      });

    } else {
      // Follow-up messages after full collection
      evTypingThen('order', 1000, () => {
        evAdminMsg('order',
          `Your correction request has already been submitted! Our team is working on it. If you haven't heard back within 30 minutes, please let us know here. 🙏`
        );
      });
    }
  }

  // ── Delay reporting flow ──────────────────────────────────────────────────
  function evHandleDelayFlow(text, user) {
    const s = state.delay;
    const lower = text.toLowerCase();
    const notice = document.getElementById('ev-delay-notice');

    if (s.step === 0) {
      s.step = 1;
      evTypingThen('delay', 1300, () => {
        evAdminMsg('delay',
          `I'm sorry to hear that! 😔 Service delays can happen due to high demand or provider issues.\n\nCould you share your **Order ID**? You can find it in the "My Orders" section.`
        );
      });
    } else if (s.step === 1) {
      s.step = 2;
      notice.style.display = 'flex';
      evTypingThen('delay', 1500, () => {
        evAdminMsg('delay',
          `Thanks! I've escalated this to our admin team with your details. ✅\n\nMost delays are resolved within **2–6 hours**. If it's been over 24 hours, we'll issue a refund or re-queue your order.\n\nWe'll update you here shortly.`
        );
        evNotifyAdmin('delay', user, text);
      });
    } else {
      evTypingThen('delay', 1000, () => {
        evAdminMsg('delay',
          `Your case is already with our team! We appreciate your patience. If there's no update in 6 hours, please reach out again and we'll prioritize it. 🙏`
        );
      });
    }
  }

  // ── evNotifyAdmin: no longer needed — API handles persistence ──────────────
  function evNotifyAdmin(type, user, message) { /* handled by evPostMessage */ }

  // ── Message helpers ───────────────────────────────────────────────────────

  // Public-facing wrappers (called from evSend, boot greeting, and flow handlers)
  function evAdminMsg(tab, text) {
    evAdminMsgLocal(tab, text);
  }

  function evUserMsg(tab, text, initial) {
    evUserMsgLocal(tab, text, initial);
  }

  function evAdminMsgLocal(tab, text) {
    const time = evNow();
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    const html = `
      <div class="ev-msg from-admin">
        <div class="ev-msg-avatar">${ADMIN_AVATAR}</div>
        <div>
          <div class="ev-msg-bubble">${formatted}</div>
          <div class="ev-msg-time">${ADMIN_NAME} · ${time}</div>
        </div>
      </div>`;
    evAppendMsg(tab, html);
    if (!state.open) {
      state.unread++;
      const badge = document.getElementById('ev-chat-badge');
      badge.textContent = state.unread;
      badge.classList.add('show');
    }
  }

  function evUserMsgLocal(tab, text, initial) {
    const time = evNow();
    const safeText = text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    const html = `
      <div class="ev-msg from-user">
        <div class="ev-msg-avatar" style="background:linear-gradient(135deg,#243048,#1a2435);color:#3dd44a;font-weight:800;font-size:14px;">${initial}</div>
        <div>
          <div class="ev-msg-bubble">${safeText}</div>
          <div class="ev-msg-time">${time}</div>
        </div>
      </div>`;
    evAppendMsg(tab, html);
  }

  function evTypingThen(tab, delay, cb) {
    const typingHtml = `<div class="ev-msg from-admin" id="ev-typing-${tab}">
      <div class="ev-msg-avatar">${ADMIN_AVATAR}</div>
      <div class="ev-msg-bubble" style="padding:10px 14px;">
        <div class="ev-typing"><span></span><span></span><span></span></div>
      </div>
    </div>`;
    evAppendMsg(tab, typingHtml);
    setTimeout(() => {
      const el = document.getElementById('ev-typing-'+tab);
      if (el) el.remove();
      cb();
    }, delay);
  }

  function evAppendMsg(tab, html) {
    const container = document.getElementById('ev-msgs-'+tab);
    container.insertAdjacentHTML('beforeend', html);
    evScrollBottom(tab);
  }

  function evScrollBottom(tab) {
    const el = document.getElementById('ev-msgs-'+tab);
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
  }

  function evNow() {
    return new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
  }
})();