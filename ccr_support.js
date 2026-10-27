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
 *     once payment is confirmed an order CANNOT be cancelled. A paid order
 *     that FAILS, can't start, or is only PARTLY delivered is refunded
 *     automatically ONLY in the nightly run (just after midnight EAT; a
 *     scheduled wake-up makes sure it runs every night) to the customer's EndaViral Wallet for the
 *     undelivered part, and the customer is messaged (services/credit_wallet.py).
 *     Wallet credit can't be withdrawn to M-Pesa. A wrong link or a private
 *     account submitted by the customer is NOT refundable. Admins can still
 *     give a goodwill wallet credit (Admin → Wallet Credit) for our mistakes
 *     on orders that were otherwise delivered.
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
    text: 'Hi {name}, welcome to EndaViral support. How can I help you?' },
  { id: 'd_ask_link',      category: 'Greeting',    label: 'Ask for order ID',
    text: 'Hi {name}, please send me your Order ID so I can check it. Go to My Orders on the left menu, find the order, and copy the Order ID next to it. Then paste it here.' },

  // ── How to use the platform (for customers who are lost) ───────────────
  { id: 'd_how_order',     category: 'How to use',  label: 'How to place an order',
    text: 'Here is how to place an order, {name}:\n1. Click "New Order" on the left menu.\n2. Pick the platform (Instagram, TikTok, etc) and the service you want.\n3. Paste your link in the "Link" box.\n4. Type how many you want in "Quantity".\n5. Type your M-Pesa number and click "Pay & Order".\n6. A message will pop up on your phone. Enter your M-Pesa PIN and the order will start.' },
  { id: 'd_how_link',      category: 'How to use',  label: 'Where to put my link',
    text: 'You put the link in the "Link" box on the New Order page. It is the first box. Open your Instagram, TikTok or YouTube, copy the link of your page (or of the post you want to grow), come back and paste it there. Make sure the account is not private.' },
  { id: 'd_how_get_link',  category: 'How to use',  label: 'How to copy my link',
    text: 'To copy your link: open the app, go to your profile (or the post), tap the Share button or the 3 dots, then tap "Copy link". After that, come to EndaViral and paste it in the Link box when placing your order.' },
  { id: 'd_which_link',    category: 'How to use',  label: 'Profile link or post link?',
    text: 'It depends on what you are buying. For followers, use your profile link. For likes, views or comments, use the link of the exact post or video. If you are not sure, tell me what you want to buy and I will tell you which link to use.' },
  { id: 'd_how_pay',       category: 'How to use',  label: 'How to pay',
    text: 'You pay with M-Pesa when you place the order. You do not need to add money to a wallet first. Type your M-Pesa number, click "Pay & Order", and a prompt will come to your phone. Enter your PIN to finish. Your order starts after the payment goes through.' },
  { id: 'd_how_track',     category: 'How to use',  label: 'How to track my order',
    text: 'To see your order, click "My Orders" on the left menu. You will see the status of each order there (Pending, In progress, Completed). If it says In progress, it is already being delivered.' },
  { id: 'd_walk_through',  category: 'How to use',  label: 'I will guide you step by step',
    text: 'No problem, {name}. I can guide you step by step. Tell me which platform you want to grow (Instagram, TikTok, YouTube...) and what you want (followers, likes, views). I will tell you exactly what to click.' },

  // ── Order Status ──────────────────────────────────────────────────────
  { id: 'd_checking',      category: 'Order Status', label: 'Checking now',
    text: 'Okay {name}, let me check this for you. Give me a minute.' },
  { id: 'd_order_status',  category: 'Order Status', label: 'Order status',
    text: 'Your order for {service} is now "{status}". You ordered {quantity}.' },
  { id: 'd_order_progress',category: 'Order Status', label: 'Order progress',
    text: 'Here is where your order is: it started at {start}, and {remains} is still left to deliver out of the {quantity} you ordered. Status: "{status}".' },
  { id: 'd_link_check',    category: 'Order Status', label: 'Checking link and quantity',
    text: 'I am checking the link and quantity on your order. This should take about 20 to 30 minutes. If it is still not sorted after that, I will follow it up myself. You do not need to remind me.' },

  // ── Delivery Time ──────────────────────────────────────────────────────
  { id: 'd_delivery_time', category: 'Delivery Time', label: 'How long it takes',
    text: 'Orders start at different times. TikTok, Instagram and YouTube usually start in 1 to 3 hours. Twitter/X and Facebook usually start in 30 minutes to 2 hours. Some slower services can take up to 24 hours to start. If 24 hours pass and nothing has moved, tell me and I will escalate it.' },
  { id: 'd_count_drop',    category: 'Delivery Time', label: 'Why my count dropped',
    text: `📉 Why might your followers drop? Here’s what to know.\n\nTikTok and Instagram regularly review accounts and may remove followers or adjust displayed numbers. Accounts that are not actively posting or engaging with their audience may also find it harder to maintain their growth over time.\n\n💡 How to get the most out of your growth:\n🟡 Basic – An affordable option for those looking for budget-friendly growth.\n🟢 Medium – An alternative for customers looking for a balance between price and quality.\n🔵 Elite – A premium option for customers who prefer to invest in higher-tier services.\n\n🚀 Our tip: Keep posting consistently, create content your audience enjoys, and engage with your followers. Growing your numbers is one step; keeping your audience active and interested is just as important.\n\n💚 Thank you for growing with EndaViral!` },

  // ── Delay ────────────────────────────────────────────────────────────
  { id: 'd_delay_normal',  category: 'Delay',       label: 'Please wait, it is normal',
    text: 'Sorry for the wait, {name}. Some orders take longer to start, up to 24 hours for slower services. Your order is still in line and will start. You do not need to do anything for now.' },
  { id: 'd_delay_provider',category: 'Delay',       label: 'Delay is on our side',
    text: 'Your order is moving slower than usual because of a delay on our side, not because of anything you did. It will continue on its own. If it is still stuck after a few hours, message me here and I will push it.' },
  { id: 'd_delay_escalate',category: 'Delay',       label: 'I have escalated it',
    text: 'Your order has taken longer than normal, so I have passed it to our team to look into. I will message you here as soon as I have an update.' },

  // ── Wrong Order / Account ───────────────────────────────────────────────
  { id: 'd_wrong_order',   category: 'Wrong Order', label: 'Sorry, checking what happened',
    text: 'Sorry about that, {name}. Let me check what went wrong with your order.' },
  { id: 'd_wrong_link',    category: 'Wrong Order', label: 'Send the correct link',
    text: 'Please send me the exact link you wanted the order to go to. Paste the full link, not just the username. I will compare it with the link you used when ordering.' },
  { id: 'd_private_account',category: 'Wrong Order', label: 'Account is private',
    text: 'Your account is set to private, so we cannot deliver to it. Please change it to Public in your app settings, then tell me here. I will restart the order once it is public.' },
  { id: 'd_our_error_fix', category: 'Wrong Order', label: 'Our mistake, fixing for free',
    text: 'I checked and this was our mistake, not yours. I am fixing the order now and you will not pay anything extra. I will tell you here when it is done.' },
  { id: 'd_customer_link_error', category: 'Wrong Order', label: 'Link was wrong, no refund',
    text: 'I checked your order. It went to the same link you entered when you paid, so it was delivered correctly. Because the payment was already confirmed, we cannot refund it. Next time, please check the link before you pay. I can guide you if you like.' },

  // ── Refill / Guarantee ───────────────────────────────────────────────
  { id: 'd_refill',        category: 'Refill',      label: 'About refill',
    text: 'If your service has a refill guarantee, go to My Orders and click the ♻️ Refill button on that order. We will top up whatever dropped, for free. Let me check if your order qualifies.' },

  // ── Payment ──────────────────────────────────────────────────────────
  { id: 'd_payment_failed',category: 'Payment',     label: 'Payment failed, try again',
    text: 'I can see your payment did not go through, {name}. This can happen if the M-Pesa prompt timed out or the wrong PIN was entered. Please go to New Order and try again. Make sure your phone has network and enough M-Pesa balance. If you need help, I am here.' },
  { id: 'd_payment_delay', category: 'Payment',      label: 'M-Pesa is slow to confirm',
    text: 'M-Pesa can take a few minutes to confirm. Please wait about 10 minutes. If it is still not showing, send me the M-Pesa message you received and I will check it by hand.' },
  { id: 'd_stk_not_received',category: 'Payment',    label: 'No prompt on my phone',
    text: 'Sorry about that. Please check that the M-Pesa number you typed is correct and that your phone has network. Then place the order again to get a new prompt. If it still does not come, tell me and I will check on our side.' },
  { id: 'd_payment_verify',category: 'Payment',      label: 'Checking my payment',
    text: 'I can see your payment attempt. Give me a minute to confirm it and I will tell you here.' },

  // ── Refund Policy / Compensation ────────────────────────────────────
  { id: 'd_no_refund_policy',category: 'Refund Policy', label: 'How refunds work',
    text: 'Let me explain how it works, {name}. After you pay, the order starts right away, so we cannot cancel it. That is why we ask you to check the link, quantity and service before paying. If an order fails or is only partly delivered, the money for the part you did not get goes back to your EndaViral Wallet automatically overnight, and we send you a message when it is there. You can use it on any order. Wallet money cannot be sent back to M-Pesa.' },
  { id: 'd_wallet_refund_where', category: 'Refund Policy', label: 'Where is my refund?',
    text: 'Your refund goes to your EndaViral Wallet, not to M-Pesa. You can see your balance at the top of the page and on your dashboard. When you place your next order, choose "Pay with Wallet" at checkout. If the order costs more than your balance, choose "Wallet + M-Pesa" and pay the rest by M-Pesa.' },
  { id: 'd_wallet_refund_tonight', category: 'Refund Policy', label: 'Refund comes overnight',
    text: 'Sorry about this, {name}. Your order did not go through fully, so the money for the part that was not delivered will be added to your EndaViral Wallet overnight. We will message you here when it is done, and you can use it on any order.' },
  { id: 'd_goodwill_credit', category: 'Refund Policy', label: 'Offer goodwill credit (our mistake)',
    text: 'Because this was our mistake, I can add credit to your EndaViral Wallet so you can use it on your next order. Is that okay with you?' },
  { id: 'd_credit_done',   category: 'Refund Policy', label: 'Wallet credit done',
    text: 'Done. I have added the money to your wallet. You can see it under Wallet.' },

  // ── Closing ──────────────────────────────────────────────────────────
  { id: 'd_anything_else', category: 'Closing',     label: 'Anything else?',
    text: 'Great, {name}. Is there anything else you need help with?' },
  { id: 'd_closing',       category: 'Closing',     label: 'Closing the ticket',
    text: 'I will close this ticket now. If you have any other problem, just message us here anytime. Thank you, {name}.' },

  // ── Common customer questions ──────────────────────────────────────────
  { id: 'd_only_link',     category: 'Common questions', label: 'They only sent a link',
    text: 'Hi {name}, I got your link. What would you like help with? For example, do you want to place an order, or is there a problem with an order you already made?' },
  { id: 'd_not_received',  category: 'Common questions', label: 'I have not received anything',
    text: 'Sorry about that, {name}. Please send me the Order ID from My Orders so I can check it. Some orders take 1 to 3 hours to start, and slower ones up to 24 hours. If it has been longer than that, I will look into it right away.' },
  { id: 'd_completed_nothing', category: 'Common questions', label: 'Says completed but I see nothing',
    text: 'Please refresh your profile or the app and check again, because the numbers can take a few minutes to show. If you still do not see them, send me your Order ID and the link you used, and I will check it.' },
  { id: 'd_paid_no_order', category: 'Common questions', label: 'I paid but no order',
    text: 'Sorry, {name}. Please send me the M-Pesa message you got after paying (the one with the code). I will match it to your payment and make sure your order starts.' },
  { id: 'd_one_at_a_time', category: 'Common questions', label: 'Do not order twice on same link',
    text: 'Please wait for your first order to finish before you place another one on the same link. Two orders at once can confuse the count and slow both of them down.' },
  { id: 'd_dont_change',   category: 'Common questions', label: 'Do not change username or delete post',
    text: 'While your order is running, please do not change your username, delete the post, or make the account private. If you do, the order cannot finish.' },
  { id: 'd_real_followers',category: 'Common questions', label: 'Are they real followers?',
    text: 'It depends on the service you choose. The cheaper services are faster but can drop later. The higher-priced ones hold better. We cannot promise exact results on how the platform will react, but we promise to deliver the service you paid for. I can recommend one if you tell me what you want.' },
  { id: 'd_is_safe',       category: 'Common questions', label: 'Is it safe for my account?',
    text: 'We never ask for your password. You only give us your link. To stay safe, order realistic amounts (for example, do not buy 50K if you have 100 followers) and let one order finish before starting another.' },
  { id: 'd_guarantee',     category: 'Common questions', label: 'Do you guarantee results?',
    text: 'We guarantee that we deliver the service you paid for, as described. We cannot guarantee things like going viral or getting monetized, because that depends on the platform.' },
  { id: 'd_min_qty',       category: 'Common questions', label: 'Minimum quantity',
    text: 'Each service has its own minimum quantity. When you pick a service on the New Order page, you will see the minimum. If you type less than that, it will ask you to add more.' },
  { id: 'd_which_service', category: 'Common questions', label: 'Which service should I pick?',
    text: 'Tell me the platform and what you want (followers, likes, views, comments). Cheaper services are faster but can drop, and higher-priced ones last longer. I will recommend one for you.' },
  { id: 'd_receipt',       category: 'Common questions', label: 'Where is my M-Pesa receipt',
    text: 'Your payment receipt shows the M-Pesa reference number. You also get the normal M-Pesa message on your phone. If you cannot find either, tell me the phone number you paid with and the time, and I will help.' },
  { id: 'd_other_features',category: 'Common questions', label: 'Academy, Marketplace, Refer & Earn',
    text: 'On the left menu you will also see Creator Academy (courses for creators), EndaViral Marketplace (brands hire creators and pay to your M-Pesa), and Refer & Earn (earn when people you invite use EndaViral). Tell me which one you want help with.' },

  // ── Kiswahili (for customers who write in Swahili) ─────────────────────
  { id: 'sw_greeting',     category: 'Kiswahili', label: 'Habari, nikusaidie?',
    text: 'Habari {name}, karibu EndaViral. Nikusaidie aje leo?' },
  { id: 'sw_how_order',    category: 'Kiswahili', label: 'Jinsi ya kuagiza',
    text: 'Hivi ndivyo unavyoweka order, {name}:\n1. Bonyeza "New Order" kwenye menu upande wa kushoto.\n2. Chagua platform (Instagram, TikTok n.k) na huduma unayotaka.\n3. Weka link yako kwenye sehemu ya "Link".\n4. Andika idadi unayotaka kwenye "Quantity".\n5. Weka namba yako ya M-Pesa kisha bonyeza "Pay & Order".\n6. Ujumbe utatokea kwenye simu yako. Weka PIN ya M-Pesa na order itaanza.' },
  { id: 'sw_wait',         category: 'Kiswahili', label: 'Subiri kidogo, naangalia',
    text: 'Sawa {name}, ngoja niangalie. Nipe dakika moja.' },
  { id: 'sw_delivery',     category: 'Kiswahili', label: 'Inachukua muda gani',
    text: 'Order huanza baada ya saa 1 hadi 3 kwa TikTok, Instagram na YouTube. Twitter/X na Facebook huanza baada ya dakika 30 hadi saa 2. Huduma zingine za polepole zinaweza kuchukua hadi saa 24 kuanza. Ikipita saa 24 bila mabadiliko, niambie nitaifuatilia.' },
  { id: 'sw_private',      category: 'Kiswahili', label: 'Account yako ni private',
    text: 'Account yako iko private, kwa hivyo hatuwezi kuwasilisha order. Tafadhali ibadilishe iwe Public kwenye settings za app, kisha uniambie hapa. Nitaanzisha order tena.' },
  { id: 'sw_payment_failed', category: 'Kiswahili', label: 'Malipo hayakufaulu',
    text: 'Naona malipo yako hayakukamilika, {name}. Hii inaweza kutokea kama ujumbe wa M-Pesa ulichelewa au PIN ilikosewa. Tafadhali rudi kwenye New Order ujaribu tena. Hakikisha simu ina network na una pesa za kutosha kwenye M-Pesa.' },
  { id: 'sw_no_refund',    category: 'Kiswahili', label: 'Jinsi refund inavyofanya kazi',
    text: 'Samahani {name}, baada ya malipo kuthibitishwa order huanza mara moja, kwa hivyo hatuwezi kuisimamisha. Ndio maana tunashauri uangalie link na idadi kabla ya kulipa. Lakini order ikishindikana au ikifika nusu, pesa ya sehemu ambayo haikufika inarudishwa kwenye EndaViral Wallet yako moja kwa moja usiku, na unaweza kuitumia kwa order yoyote. Pesa ya wallet haiwezi kutolewa kwenda M-Pesa.' },
  { id: 'sw_closing',      category: 'Kiswahili', label: 'Asante, kwaheri',
    text: 'Asante {name}. Ukiwa na shida nyingine, tuandikie hapa wakati wowote.' },
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

  // New chat layout: the bar lives in the ⚡ pop-up (#supQuickReplies, admin.js).
  const popup = document.getElementById('supQuickReplies');
  const replyRow = input.closest('div'); // older layout: the flex row wrapping textarea + send button
  if (!popup && (!replyRow || !replyRow.parentNode)) return;

  const bar = document.createElement('div');
  bar.id = 'ccrQuickReplyBar';
  bar.dataset.threadId = threadId;
  bar.style.cssText = popup ? '' : 'padding:8px 14px 8px;border-top:1px solid rgba(61,212,74,.08);background:rgba(0,0,0,.15);flex-shrink:0;';

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
    <div id="ccrqrChipRow" style="display:flex;gap:6px;${document.getElementById('supQuickReplies') ? 'flex-wrap:wrap;max-height:150px;overflow-y:auto;' : 'overflow-x:auto;padding-bottom:2px;'}"></div>
  `;

  if (popup) { popup.innerHTML = ''; popup.appendChild(bar); }
  else replyRow.parentNode.insertBefore(bar, replyRow);

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
  if (typeof supportToggleQuickReplies === 'function') supportToggleQuickReplies(false);   // close the ⚡ pop-up
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
  const wrapped = async function (threadId, opts) {
    const result = await original(threadId, opts);
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