/* ═══════════════ CCR / ADMIN SUPPORT — QUICK REPLIES ═══════════════
 * Adds a "Quick Replies" chip bar above the reply box inside the support
 * thread pane (#supportChatPane → #adminReplyInput), for both full admins
 * and CCR agents (they share the same openSupportThread() code path from
 * admin.js — CCR_ALLOWED_ADMIN_TABS in ccr_agent.js already grants CCR
 * agents the 'support' tab).
 *
 * How it hooks in: this file does NOT modify admin.js. It wraps the
 * global window.openSupportThread(threadId) function — after the real
 * function finishes rebuilding the pane, this injects the quick-reply bar
 * just above the reply textarea. No changes to index.html needed beyond
 * adding a <script src="ccr_support.js"></script> tag after admin.js.
 *
 * Variables: chips can use {name} {service} {status} {link} {quantity}
 * {remains} {start}, filled in from the thread's user + linked order at
 * insert time (fetched once per thread open via the same GET
 * /support/admin/threads/:id endpoint admin.js already uses).
 *
 * Facts baked into the copy below are pulled straight from the live
 * product (so replies never contradict what the customer already saw):
 *   - Landing page FAQ (#faq) + Order Modal "BEFORE YOU PAY" notice —
 *     once payment is confirmed an order CANNOT be refunded or cancelled;
 *     a wrong link submitted by the customer is NOT refundable either.
 *     What we DO promise: a stalled/delayed/partially-delivered order
 *     gets completed or re-queued at no extra cost, and admins can issue
 *     a discretionary wallet CREDIT (not a "refund") via the Users tab
 *     when the mistake was on our/provider's side.
 *   - Order Modal "BEFORE YOU PAY" — profile/post must be set to Public;
 *     link/username must not change while an order is running.
 *   - Chat widget instant answers (chat.js) — delivery start times:
 *     TikTok/Instagram/YouTube ~1–3h, Twitter-X/Facebook ~30min–2h, slower
 *     packages up to 24h; escalate if nothing's moved after 24h. Count
 *     drops are explained by service tier (Basic/Medium/Elite), not
 *     automatically a fault. Refill is only available for orders where
 *     service_refill is true, via the ♻️ Refill action on completed/
 *     partial orders (re-checks delivery, tops up any drop).
 *   - Ticket source: issue_types on a customer-submitted ticket are only
 *     ever 'wrong_order' and/or 'delay' (see chat.js evSubmitTicket).
 *
 * Storage: default replies are hardcoded below. Custom replies an agent
 * adds are saved to localStorage, namespaced per logged-in user id, since
 * there's no backend table for this yet — everything here is additive
 * and safe to delete without touching any other file.
 *
 * Depends on: api(), toast(), esc(), currentUser, activeSupportThreadId,
 * window.openSupportThread — all globals from index.html / admin.js.
 * ══════════════════════════════════════════════════════════════════════ */

// ─── Default quick replies ──────────────────────────────────────────────────

const CCR_QR_DEFAULTS = [
  // ── Greeting ──────────────────────────────────────────────────────────
  { id: 'd_greeting',      category: 'Greeting',    label: 'Hi, how can I help',
    text: 'Hi {name}! Thanks for reaching out — how can I help you today? 😊' },
  { id: 'd_ask_link',      category: 'Greeting',    label: 'Ask for order link',
    text: 'Hi {name}, could you share the link or order ID for the order you\'re asking about so I can take a look?' },

  // ── Order Status ──────────────────────────────────────────────────────
  { id: 'd_checking',      category: 'Order Status', label: 'Checking on it',
    text: 'Let me check that for you right now, {name} — one moment please.' },
  { id: 'd_order_status',  category: 'Order Status', label: 'Current status',
    text: 'Your order for {service} is currently showing as "{status}". Quantity: {quantity}.' },
  { id: 'd_order_progress',category: 'Order Status', label: 'Progress (start/remains)',
    text: 'Here\'s the latest: {service} started at {start} and has {remains} left to deliver out of {quantity} ordered. Status: "{status}".' },
  { id: 'd_link_check',    category: 'Order Status', label: 'Verifying link/quantity',
    text: 'I\'m verifying the link and quantity on the order — this usually clears up within a few minutes.' },

  // ── Delivery Time (matches the in-app FAQ shortcuts exactly) ───────────
  { id: 'd_delivery_time', category: 'Delivery Time', label: 'How long delivery takes',
    text: 'Delivery start times vary by platform: TikTok, Instagram and YouTube usually begin within 1–3 hours, Twitter/X and Facebook within 30 minutes to 2 hours, and some slower growth packages can take up to 24 hours to begin. If it\'s been longer than 24 hours with no movement, we escalate it — happy to do that for you now.' },
  { id: 'd_count_drop',    category: 'Delivery Time', label: 'Why count dropped',
    text: 'Platforms periodically clean up inactive/low-activity accounts, and Basic-tier sources get flagged in these sweeps more often — that\'s expected, not a fault. Medium and Elite tiers are built for better long-term retention. Want me to check if this order is eligible for a refill?' },

  // ── Delay ────────────────────────────────────────────────────────────
  { id: 'd_delay_normal',  category: 'Delay',       label: 'Normal processing delay',
    text: 'Sorry for the wait, {name} — some orders take a little longer depending on provider load and service type; up to 24 hours for slower packages is normal. Your order is still in the queue and moving, no action needed on your end for now.' },
  { id: 'd_delay_provider',category: 'Delay',       label: 'Provider-side delay',
    text: 'This one is delayed on the provider\'s side, not ours — we\'re monitoring it and it will resume automatically. Thanks for your patience!' },
  { id: 'd_delay_escalate',category: 'Delay',       label: 'Escalating delay',
    text: 'I\'ve flagged this order to our team for a closer look since it\'s been delayed longer than usual. I\'ll update you here as soon as I hear back.' },

  // ── Wrong Order / Account ───────────────────────────────────────────────
  { id: 'd_wrong_order',   category: 'Wrong Order', label: 'Apology + looking into it',
    text: 'I\'m sorry about that, {name} — let me look into exactly what happened with this order now.' },
  { id: 'd_wrong_link',    category: 'Wrong Order', label: 'Confirm correct link',
    text: 'Could you confirm the exact link/username you intended for this order? I want to check it against what was actually submitted at checkout.' },
  { id: 'd_private_account',category: 'Wrong Order', label: 'Account is private',
    text: 'For an order to deliver, the profile or post needs to be set to Public — private accounts can\'t receive engagement. Could you switch it to public and let me know once it\'s done? I\'ll get the order moving from there.' },
  { id: 'd_our_error_fix', category: 'Wrong Order', label: 'Our error — fixing free',
    text: 'Good news — I\'ve confirmed this mix-up was on our side, not yours. I\'m re-running the order against the correct details now at no extra cost, and I\'ll confirm here once it\'s done.' },
  { id: 'd_customer_link_error', category: 'Wrong Order', label: 'Link was correct on our end',
    text: 'I\'ve checked, and this order went out to the link/details exactly as submitted at checkout, so it processed correctly on our side. Since payment is confirmed and the link was correct on our end, it isn\'t eligible for a refund under our policy — but I\'m happy to walk you through double-checking links before future orders so this doesn\'t happen again.' },

  // ── Refill / Guarantee ───────────────────────────────────────────────
  { id: 'd_refill',        category: 'Refill',      label: 'Refill/guarantee info',
    text: 'If this service includes a refill guarantee, a refill can be requested from My Orders using the ♻️ Refill button — the provider re-checks delivery and tops up any drop at no extra cost. Let me confirm whether this particular order qualifies.' },

  // ── Payment ──────────────────────────────────────────────────────────
  { id: 'd_payment_delay', category: 'Payment',      label: 'M-Pesa confirmation delay',
    text: 'M-Pesa confirmations can take a couple of minutes to reflect. If it\'s been more than 10 minutes, please share the M-Pesa message/code and I\'ll verify it manually.' },
  { id: 'd_stk_not_received',category: 'Payment',    label: 'STK push not received',
    text: 'Sorry about that — please double-check the M-Pesa number entered has no other pending STK prompt, then try placing the order again so a fresh prompt goes out. Let me know if it still doesn\'t arrive and I\'ll check on our end.' },
  { id: 'd_payment_verify',category: 'Payment',      label: 'Verifying payment',
    text: 'I can see your payment attempt — give me a moment to verify it and I\'ll confirm here.' },

  // ── Refund Policy / Compensation ────────────────────────────────────
  { id: 'd_no_refund_policy',category: 'Refund Policy', label: 'Explain no-refund policy',
    text: 'Just to explain how this works: once an order is placed and payment is confirmed, it goes straight to processing and can\'t be refunded or cancelled — that\'s why we always recommend double-checking the link, quantity and service before paying. That said, if an order stalls, delays, or delivers only partially, we\'ll complete it or re-queue it for you at no extra cost.' },
  { id: 'd_goodwill_credit', category: 'Refund Policy', label: 'Wallet credit (our error)',
    text: 'Since this was an error on our side, I can credit the affected amount straight to your EndaViral wallet as compensation — would that work for you?' },
  { id: 'd_credit_done',   category: 'Refund Policy', label: 'Wallet credit confirmed',
    text: 'Done ✅ — I\'ve credited your wallet with the compensation amount. You can check it any time under Wallet.' },

  // ── Closing ──────────────────────────────────────────────────────────
  { id: 'd_anything_else', category: 'Closing',     label: 'Anything else?',
    text: 'Glad that\'s sorted, {name}! Is there anything else I can help you with today?' },
  { id: 'd_closing',       category: 'Closing',     label: 'Closing ticket',
    text: 'I\'ll go ahead and mark this ticket as resolved for now — feel free to reply here anytime if it comes up again. Thanks for your patience, {name}! 🙏' },
];

// ─── Custom (per-agent) quick replies — localStorage-backed ───────────────

function ccrqrStorageKey() {
  const uid = (typeof currentUser !== 'undefined' && currentUser && (currentUser.id || currentUser._id)) || 'anon';
  return `ccrQuickReplies_${uid}`;
}

function ccrqrGetCustom() {
  try {
    const raw = localStorage.getItem(ccrqrStorageKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function ccrqrSaveCustom(arr) {
  try {
    localStorage.setItem(ccrqrStorageKey(), JSON.stringify(arr));
    return true;
  } catch (e) {
    toast('Could not save — storage may be full or unavailable', 'error');
    return false;
  }
}

function ccrqrAllReplies() {
  const custom = ccrqrGetCustom().map(r => ({ ...r, isCustom: true }));
  return [...CCR_QR_DEFAULTS, ...custom];
}

function ccrqrCategories() {
  const set = new Set(ccrqrAllReplies().map(r => r.category || 'Other'));
  return Array.from(set);
}

// ─── Variable fill ──────────────────────────────────────────────────────────

let _ccrqrThreadDataByThread = {}; // { threadId: { name, service, status, link, quantity, remains, start } }

function ccrqrFillTemplate(text, data) {
  data = data || {};
  return (text || '')
    .replace(/\{name\}/g, data.name || 'there')
    .replace(/\{service\}/g, data.service || 'your order')
    .replace(/\{status\}/g, data.status || 'processing')
    .replace(/\{link\}/g, data.link || '')
    .replace(/\{quantity\}/g, (data.quantity != null && data.quantity !== '') ? data.quantity : '')
    .replace(/\{remains\}/g, (data.remains != null && data.remains !== '') ? data.remains : '—')
    .replace(/\{start\}/g, (data.start != null && data.start !== '') ? data.start : '—');
}

async function ccrqrFetchThreadData(threadId) {
  try {
    const t = await api(`/support/admin/threads/${threadId}`);
    const lo = t.linked_order || {};
    const fullName = (t.user && (t.user.name || t.user.email)) || '';
    _ccrqrThreadDataByThread[threadId] = {
      name: (fullName || '').split(' ')[0] || fullName,
      service: lo.service_name || '',
      status: lo.status || '',
      link: lo.link || '',
      quantity: lo.quantity != null ? lo.quantity : '',
      remains: lo.remains != null ? lo.remains : '',
      start: lo.start_count != null ? lo.start_count : '',
    };
  } catch (e) {
    _ccrqrThreadDataByThread[threadId] = {};
  }
}

// ─── Bar rendering ──────────────────────────────────────────────────────────

let _ccrqrCategoryFilter = '';
let _ccrqrSearch = '';

function ccrqrRenderBar(threadId) {
  const input = document.getElementById('adminReplyInput');
  if (!input) return; // empty-state pane (no thread selected) — nothing to attach to

  // Avoid stacking duplicate bars if something re-triggers rendering
  const existing = document.getElementById('ccrQuickReplyBar');
  if (existing) existing.remove();

  const replyRow = input.closest('div'); // the flex row wrapping textarea + send button
  if (!replyRow || !replyRow.parentNode) return;

  const bar = document.createElement('div');
  bar.id = 'ccrQuickReplyBar';
  bar.dataset.threadId = threadId;
  bar.style.cssText = 'padding:8px 14px 8px;border-top:1px solid rgba(61,212,74,.08);background:rgba(0,0,0,.15);flex-shrink:0;';

  const categoryOptions = ['All', ...ccrqrCategories()].map(c =>
    `<option value="${c === 'All' ? '' : esc(c)}">${esc(c)}</option>`
  ).join('');

  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <span style="font-size:11px;color:var(--muted);white-space:nowrap;">⚡ Quick replies</span>
      <select id="ccrqrCategoryFilter" onchange="ccrqrOnFilterChange()" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:10.5px;padding:4px 6px;border-radius:6px;outline:none;cursor:pointer;">
        ${categoryOptions}
      </select>
      <input id="ccrqrSearchInput" placeholder="Search…" oninput="ccrqrOnSearchInput()" style="flex:1;min-width:60px;background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:10.5px;padding:4px 8px;border-radius:6px;outline:none;" />
      <button onclick="ccrqrOpenManage()" title="Add / edit your own quick replies" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10.5px;padding:4px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;">⚙️ Manage</button>
    </div>
    <div id="ccrqrChipRow" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;"></div>
  `;

  replyRow.parentNode.insertBefore(bar, replyRow);

  const catSelect = bar.querySelector('#ccrqrCategoryFilter');
  if (catSelect) catSelect.value = _ccrqrCategoryFilter;
  const searchInput = bar.querySelector('#ccrqrSearchInput');
  if (searchInput) searchInput.value = _ccrqrSearch;

  ccrqrRenderChips();

  // Fetch variable data for this thread in the background (chips render
  // immediately; fill-in just uses whatever's cached by the time a chip
  // is clicked, with sane fallbacks otherwise).
  if (!_ccrqrThreadDataByThread[threadId]) {
    ccrqrFetchThreadData(threadId);
  }
}

function ccrqrOnFilterChange() {
  const sel = document.getElementById('ccrqrCategoryFilter');
  _ccrqrCategoryFilter = sel ? sel.value : '';
  ccrqrRenderChips();
}

function ccrqrOnSearchInput() {
  const inp = document.getElementById('ccrqrSearchInput');
  _ccrqrSearch = inp ? inp.value.trim().toLowerCase() : '';
  ccrqrRenderChips();
}

function ccrqrRenderChips() {
  const row = document.getElementById('ccrqrChipRow');
  if (!row) return;
  let replies = ccrqrAllReplies();
  if (_ccrqrCategoryFilter) replies = replies.filter(r => r.category === _ccrqrCategoryFilter);
  if (_ccrqrSearch) {
    replies = replies.filter(r =>
      (r.label || '').toLowerCase().includes(_ccrqrSearch) ||
      (r.text || '').toLowerCase().includes(_ccrqrSearch)
    );
  }
  if (!replies.length) {
    row.innerHTML = `<span style="font-size:11px;color:var(--muted);padding:4px 0;">No quick replies match.</span>`;
    return;
  }
  row.innerHTML = replies.map(r => `
    <button onclick="ccrqrInsert('${esc(r.id)}')" title="${esc(r.text)}"
      style="flex-shrink:0;white-space:nowrap;background:rgba(61,212,74,.08);border:1px solid rgba(61,212,74,.2);color:var(--green);font-size:11px;font-weight:600;padding:6px 10px;border-radius:14px;cursor:pointer;transition:background .15s;"
      onmouseover="this.style.background='rgba(61,212,74,.18)'" onmouseout="this.style.background='rgba(61,212,74,.08)'">
      ${r.isCustom ? '⭐ ' : ''}${esc(r.label)}
    </button>
  `).join('');
}

// ─── Insert into reply box ──────────────────────────────────────────────────

function ccrqrInsert(replyId) {
  const reply = ccrqrAllReplies().find(r => r.id === replyId);
  const input = document.getElementById('adminReplyInput');
  if (!reply || !input) return;

  const bar = document.getElementById('ccrQuickReplyBar');
  const threadId = (bar && bar.dataset.threadId) || (typeof activeSupportThreadId !== 'undefined' ? activeSupportThreadId : null);
  const data = (threadId && _ccrqrThreadDataByThread[threadId]) || {};
  const filled = ccrqrFillTemplate(reply.text, data);

  const existing = input.value;
  input.value = existing ? (existing.replace(/\s+$/, '') + '\n' + filled) : filled;

  // Let admin.js's own oninput handler resize the textarea, matching its
  // normal typing behavior instead of duplicating that logic here.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  input.selectionStart = input.selectionEnd = input.value.length;
}

// ─── Manage modal (add / edit / delete custom replies) ─────────────────────

function ccrqrEnsureModal() {
  if (document.getElementById('ccrqrManageModal')) return;
  const modal = document.createElement('div');
  modal.id = 'ccrqrManageModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--black);border:1px solid var(--border);border-radius:14px;max-width:520px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="font-weight:800;font-size:14px;color:var(--white);">⚡ Manage Quick Replies</div>
        <button onclick="ccrqrCloseManage()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;line-height:1;">×</button>
      </div>
      <div style="padding:16px 18px;overflow-y:auto;flex:1;min-height:0;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Your custom replies (saved on this device only). Defaults can't be edited, but you can add your own for anything you type often.</div>
        <div id="ccrqrCustomList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;"></div>
        <div style="border-top:1px solid var(--border);padding-top:14px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">Add new</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <input id="ccrqrNewLabel" placeholder="Short label (e.g. 'Ask for screenshot')" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:12.5px;padding:8px 10px;border-radius:8px;outline:none;" />
            <input id="ccrqrNewCategory" placeholder="Category (e.g. Delay, Refund, Greeting)" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:12.5px;padding:8px 10px;border-radius:8px;outline:none;" />
            <textarea id="ccrqrNewText" placeholder="Reply text — you can use {name} {service} {status} {link} {quantity} {remains} {start}" style="background:var(--card);border:1px solid var(--border);color:var(--white);font-family:'Montserrat',sans-serif;font-size:12.5px;padding:8px 10px;border-radius:8px;outline:none;resize:vertical;min-height:70px;"></textarea>
            <button class="btn-primary" style="margin-top:0;" onclick="ccrqrAddCustom()">+ Add Quick Reply</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) ccrqrCloseManage(); });
}

function ccrqrOpenManage() {
  ccrqrEnsureModal();
  document.getElementById('ccrqrManageModal').style.display = 'flex';
  ccrqrRenderCustomList();
}

function ccrqrCloseManage() {
  const modal = document.getElementById('ccrqrManageModal');
  if (modal) modal.style.display = 'none';
}

function ccrqrRenderCustomList() {
  const list = document.getElementById('ccrqrCustomList');
  if (!list) return;
  const custom = ccrqrGetCustom();
  if (!custom.length) {
    list.innerHTML = `<div style="font-size:12px;color:var(--muted);">You haven't added any custom quick replies yet.</div>`;
    return;
  }
  list.innerHTML = custom.map((r, i) => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">
        <div>
          <div style="font-size:12.5px;font-weight:700;color:var(--white);">${esc(r.label)}</div>
          <div style="font-size:10px;color:var(--green);">${esc(r.category || 'Other')}</div>
        </div>
        <button onclick="ccrqrDeleteCustom(${i})" title="Delete" style="background:none;border:none;color:#ff5050;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0;">🗑</button>
      </div>
      <div style="font-size:11.5px;color:var(--muted);line-height:1.4;">${esc(r.text)}</div>
    </div>
  `).join('');
}

function ccrqrAddCustom() {
  const labelInput = document.getElementById('ccrqrNewLabel');
  const catInput = document.getElementById('ccrqrNewCategory');
  const textInput = document.getElementById('ccrqrNewText');
  const label = labelInput.value.trim();
  const category = catInput.value.trim() || 'Other';
  const text = textInput.value.trim();
  if (!label || !text) { toast('Add a label and reply text', 'error'); return; }

  const custom = ccrqrGetCustom();
  custom.push({ id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, category, label, text });
  if (!ccrqrSaveCustom(custom)) return;

  labelInput.value = '';
  catInput.value = '';
  textInput.value = '';
  toast('Quick reply added', 'success');
  ccrqrRenderCustomList();
  ccrqrRenderChips();
}

function ccrqrDeleteCustom(index) {
  const custom = ccrqrGetCustom();
  if (index < 0 || index >= custom.length) return;
  if (!confirm(`Delete "${custom[index].label}"?`)) return;
  custom.splice(index, 1);
  if (!ccrqrSaveCustom(custom)) return;
  ccrqrRenderCustomList();
  ccrqrRenderChips();
}

// ─── Hook into openSupportThread() without touching admin.js ──────────────

function ccrqrHookThreadOpen() {
  if (typeof window.openSupportThread !== 'function' || window.openSupportThread.__ccrqrWrapped) return false;
  const original = window.openSupportThread;
  const wrapped = async function (threadId) {
    const result = await original(threadId);
    ccrqrRenderBar(threadId);
    return result;
  };
  wrapped.__ccrqrWrapped = true;
  window.openSupportThread = wrapped;
  return true;
}

// admin.js loads before this file, but guard with a short poll anyway in
// case script order ever changes — avoids silently doing nothing.
(function ccrqrInit() {
  if (ccrqrHookThreadOpen()) return;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (ccrqrHookThreadOpen() || attempts > 20) clearInterval(timer);
  }, 150);
})();