/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL — CREATOR ACADEMY  (academy.js)  v1.0
 * Depends on: esc(), toast(), navTo(), currentUser, api() (globals)
 * Progress, XP, streaks and badges are persisted server-side via
 * /api/v1/academy/* (see app/routers/academy.py) using the shared api()
 * helper already used by wallet/support/etc. The server is the source of
 * truth for XP amounts and completion state — the client only ever says
 * "I finished lesson X" and renders whatever the server hands back.
 *
 * GOAL: give users a reason to open the dashboard every day even when
 * they have no active order — teach them the platform + real growth
 * strategy per social network, gate it behind small daily wins (XP,
 * streaks, badges), and always point back at ordering + the affiliate
 * program so learning converts into revenue for both the user and us.
 *
 * ════════════════════════════════════════════════════════════════════
 * INTEGRATION CHECKLIST (index.html):
 *
 *  1. Sidebar nav item — paste ★NAVITEM inside <nav>, e.g. right after
 *     the "My Account" nav-item.
 *
 *  2. Page section — paste ★SECTION inside .page-content, anywhere
 *     alongside the other <div class="page-section" id="sec-...">.
 *
 *  3. Lesson modal — paste ★MODAL just before </body>.
 *
 *  4. pageTitles — add:  academy:'CREATOR ACADEMY'
 *
 *  5. navTo() — add this line where the other `if (page === '...')`
 *     hooks live:
 *       if (page === 'academy') { if (typeof initAcademyPage === 'function') initAcademyPage(); }
 *
 *  6. Dashboard promo banner (optional but recommended) — paste ★BANNER
 *     into sec-dashboard, e.g. right below the existing #dashAffBanner.
 *
 *  7. Script tag — add near the other page scripts:
 *       <script src="academy.js"></script>
 *
 *  8. On login / app boot, call `_acUpdateBadges()` once currentUser is
 *     known (same place you call _updateAffiliateBadge(), if present)
 *     so the sidebar badge + dashboard banner reflect saved progress
 *     immediately, even before the user opens the Academy page.
 *
 *  9. Certificate modal — paste CERT_MODAL (below, near ★MODAL) just
 *     before </body>, alongside the other Academy modals (already done in
 *     this project's index.html — see academyCertModal near
 *     academyLessonModal / academyPurchaseModal).
 *
 * 10. Feedback modal — paste ★FEEDBACK_MODAL just before </body>, alongside
 *     the other Academy modals. Backend: POST/GET /academy/modules/{id}/feedback
 *     (see app/routers/academy.py). Opens automatically right after a
 *     learner earns a module badge (see acMarkCurrentComplete()); can also
 *     be opened manually via openAcademyFeedback(moduleId) — e.g. an
 *     "Leave feedback" button on an already-completed module card.
 *
 * ★NAVITEM
 * <div class="nav-item" onclick="navTo('academy')" id="academyNavItem">
 *   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *     <path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>
 *   </svg>
 *   Creator Academy
 *   <span class="nav-badge" id="academyBadge" style="display:none;background:var(--green);color:#000;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:800;margin-left:auto;"></span>
 * </div>
 *
 * ★SECTION
 * <div class="page-section" id="sec-academy"></div>
 *
 * ★BANNER (paste inside sec-dashboard)
 * <div id="dashAcademyBanner" onclick="navTo('academy')" title="Creator Academy" style="position:relative;overflow:hidden;background:linear-gradient(120deg,#1a1330 0%,#241a42 50%,#150f26 100%);border:1px solid rgba(155,107,255,.28);border-radius:16px;padding:18px 20px;margin-bottom:20px;cursor:pointer;transition:border-color .2s;">
 *   <div style="position:relative;z-index:1;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
 *     <div style="flex-shrink:0;width:46px;height:46px;border-radius:12px;background:rgba(155,107,255,.16);border:1px solid rgba(155,107,255,.28);display:flex;align-items:center;justify-content:center;font-size:22px;">🎓</div>
 *     <div style="flex:1;min-width:180px;">
 *       <div style="font-size:13px;font-weight:900;color:var(--white);margin-bottom:3px;">Creator Academy</div>
 *       <div style="font-size:12px;color:#8faab8;line-height:1.5;" id="dashAcademyDesc">Learn how to grow on every platform — free lessons, XP &amp; badges</div>
 *     </div>
 *     <button style="flex-shrink:0;background:#9b6bff;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:900;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;" onclick="event.stopPropagation();navTo('academy')" id="dashAcademyBtn">Start Learning →</button>
 *   </div>
 * </div>
 *
 * ★MODAL
 * <div class="modal-overlay" id="academyLessonModal">
 *   <div class="modal" style="max-width:560px;">
 *     <button class="modal-close" onclick="closeAcademyLesson()">✕</button>
 *     <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#9b6bff;margin-bottom:6px;" id="acLessonEyebrow">MODULE</div>
 *     <div class="modal-title" id="acLessonTitle" style="margin-bottom:4px;">Lesson title</div>
 *     <div class="modal-sub" style="margin-bottom:18px;" id="acLessonMeta">3 min read</div>
 *     <div id="acLessonBody" style="font-size:13.5px;color:var(--white);line-height:1.75;"></div>
 *     <div style="display:flex;gap:10px;margin-top:26px;">
 *       <button class="btn-secondary" style="flex:1;" onclick="closeAcademyLesson()">Close</button>
 *       <button class="btn-primary" style="flex:2;" id="acLessonCompleteBtn" onclick="acMarkCurrentComplete()">Mark Complete +<span id="acLessonXp">25</span> XP</button>
 *     </div>
 *   </div>
 * </div>
 *
 * ★CERT_MODAL
 * <div class="modal-overlay" id="academyCertModal">
 *   <div class="modal" style="max-width:640px;">
 *     <button class="modal-close" onclick="closeAcademyCertificate()">✕</button>
 *     <div class="modal-title" style="margin-bottom:4px;">🎓 Your Certificate</div>
 *     <div class="modal-sub" style="margin-bottom:18px;">Download it or share it straight to your socials</div>
 *     <div style="width:100%;overflow:auto;border-radius:12px;border:1px solid var(--border);">
 *       <canvas id="acCertCanvas" width="1200" height="800" style="width:100%;height:auto;display:block;"></canvas>
 *     </div>
 *     <div style="display:flex;gap:10px;margin-top:20px;">
 *       <button class="btn-secondary" style="flex:1;" onclick="closeAcademyCertificate()">Close</button>
 *       <button class="btn-secondary" style="flex:1;" onclick="acDownloadCertificate()">⬇ Download</button>
 *       <button class="btn-primary" style="flex:2;background:#ffd700;color:#000;" onclick="acShareCertificate()">📤 Share</button>
 *     </div>
 *   </div>
 * </div>
 *
 * ★FEEDBACK_MODAL
 * <div class="modal-overlay" id="academyFeedbackModal">
 *   <div class="modal" style="max-width:480px;">
 *     <button class="modal-close" onclick="closeAcademyFeedback()">✕</button>
 *     <div class="modal-title" style="margin-bottom:4px;" id="acFeedbackTitle">🏅 Module complete!</div>
 *     <div class="modal-sub" style="margin-bottom:18px;" id="acFeedbackSub">How was it? Your feedback helps us improve the Academy.</div>
 *     <div style="display:flex;gap:8px;justify-content:center;margin-bottom:18px;" id="acFeedbackStars"></div>
 *     <textarea id="acFeedbackComment" maxlength="1000" rows="4" placeholder="Tell us what you liked, or what we could do better…" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--white);font-size:13.5px;font-family:'Montserrat',sans-serif;resize:vertical;"></textarea>
 *     <div style="display:flex;gap:10px;margin-top:18px;">
 *       <button class="btn-secondary" style="flex:1;" onclick="closeAcademyFeedback()">Skip</button>
 *       <button class="btn-primary" style="flex:2;" id="acFeedbackSubmitBtn" onclick="submitAcademyFeedback()">Send Feedback</button>
 *     </div>
 *   </div>
 * </div>
 * ════════════════════════════════════════════════════════════════════ */

// ─── Curriculum ──────────────────────────────────────────────────────────────
// Every lesson: { id, title, minutes, body:[ blocks ] }. Block types (rendered by
// _acRenderBlocks): p, h3, ul, ol, callout, table, template, service, action,
// hook (big opening line), stat {value,label}, myth {myth,truth}, insight,
// quiz {q,options,answer,explain}, takeaways {items}, sources {items:[{title,url}]},
// locked {module,text,items} (premium teaser). Text fields support **bold**.
const ACADEMY_XP_PER_LESSON  = 25;
const ACADEMY_XP_PER_MODULE  = 50;
// Display fallback only — the server (academy_curriculum.py) is the actual
// source of truth for price; /academy/progress returns the real price_kes
// per module and that's what purchase requests are billed at.
const ACADEMY_PREMIUM_PRICE_KES = 50;
// Display fallback for the business_pro module — real price still comes
// from the server the same way ACADEMY_PREMIUM_PRICE_KES does for money.
const ACADEMY_BUSINESS_PRO_PRICE_KES = 150;
// Display fallback for the brand_pricing_pro module — same pattern.
const ACADEMY_BRAND_PRICING_PRO_PRICE_KES = 200;

const ACADEMY_LEVELS = [
  { min: 0,   name: 'New Creator',       icon: '🌱' },
  { min: 120, name: 'Rising Creator',    icon: '🌿' },
  { min: 320, name: 'Growth Pro',        icon: '🚀' },
  { min: 600, name: 'Growth Strategist', icon: '🔥' },
  { min: 900, name: 'Viral Master',      icon: '👑' },
];

const ACADEMY_MODULES = [
  {
    id: 'basics', icon: '🧭', title: 'How EndaViral Works',
    blurb: "Start here: order, pay, track and get paid back, plus the details most buyers miss",
    // Plain-language "in a nutshell" box shown above the lesson list (see _acSummaryBox).
    summary: [
      { icon: '👆', text: '<b>Order:</b> pick a platform and a service, paste your link, choose how many, then pay.' },
      { icon: '📱', text: '<b>Pay:</b> an M-Pesa prompt pops up on your phone. Enter your PIN and the order starts by itself. Minimum is KES&nbsp;20.' },
      { icon: '🔓', text: '<b>Keep it public:</b> your account or post must be public, and the link must be correct. A wrong link can\'t be refunded.' },
      { icon: '⏳', text: '<b>Delivery:</b> some services arrive slowly over hours or days so growth looks natural. Track it in My Orders.' },
      { icon: '💬', text: '<b>Stuck?</b> Don\'t order again. Open a ticket with your order ID and we\'ll sort it out.' },
      { icon: '🎁', text: '<b>Rewards:</b> every 5 orders gets you 1 free order.' },
    ],
    lessons: [
      { id: "b1", title: "Your First Order: The 8 Seconds That Decide It", minutes: 5, body: [
        {"type": "hook", "text": "Most failed first orders don't fail because of the package someone picked. They fail in the eight seconds before payment, on a link that **looked** right."},
        {"type": "p", "text": "This lesson takes five minutes. By the end you'll know the exact path every order follows, the link formats that quietly break delivery, and why platforms notice some growth but shrug at other growth. Most people who order growth services anywhere never learn any of this."},
        {"type": "h3", "text": "The path every order follows"},
        {"type": "ol", "items": ["**Pick the platform and service.** The service name tells you the action (followers, likes, views), the quality tier and the speed. Lesson 2 shows you how to read it.", "**Paste the link.** A profile link for followers, a post or video link for likes, views and comments. This one step causes most problems.", "**Set the quantity and pay.** An M-Pesa prompt (STK push) pops up on your phone. Enter your PIN and the order starts by itself. The minimum is KES 20.", "**Track it in My Orders.** Pending means waiting to start, Processing means delivering, Completed means done. Some services drip-feed over hours or days on purpose."]},
        {"type": "h3", "text": "Link formats that fail (and the fix)"},
        {"type": "table", "headers": ["What you pasted", "What happens", "The fix"], "rows": [["A private account or post", "Nothing can be delivered to it, and a wrong or unusable link can't be refunded", "Switch to Public before paying and keep it public until Completed"], ["A Story link", "Stories vanish after 24 hours, so delivery can stall", "Use a feed post, Reel or profile link instead"], ["A profile link on a likes or views order", "The service can't tell which post you meant", "Open the exact post, tap Share, then Copy link"], ["Your old @username after you renamed", "The link points at nothing", "Rename first, order after. Never rename mid-delivery"], ["A post you later delete or archive", "Delivery stops halfway", "Leave the post up until the order completes"]]},
        {"type": "h3", "text": "How platforms spot an unnatural spike"},
        {"type": "p", "text": "Platforms don't judge a number on its own. They compare it with **your own normal pattern**. A page that gains 30 followers a week and then gets 3,000 in ten minutes looks nothing like itself, and that's what automated systems are built to notice."},
        {"type": "ul", "items": ["Instagram said back in 2018 that it uses machine-learning tools to find accounts using services that generate inauthentic likes, follows and comments, and it removes that activity.", "YouTube says subscriber numbers in Analytics can lag about 48 hours behind the public count so it has time for spam review. Traffic it judges artificial doesn't count as views at all.", "In May 2026 Instagram removed bots and long-inactive accounts in one large sweep. Kylie Jenner lost about 15 million followers. Adam Mosseri said those weren't real people and the loss **wouldn't reduce reach**."]},
        {"type": "insight", "label": "What most people miss", "text": "That May 2026 sweep tells you how the platforms see things: follower count is a shop window, but reach comes from real people watching. That's why drip-feed delivery exists. Growth spread over days looks more like your normal pattern, and why your content still has to do the real work."},
        {"type": "action", "label": "Do this today (under 10 minutes)", "items": ["Check that the account or post you want to boost is set to Public.", "Open the exact post, tap Share, then Copy link, and paste it into your notes. Open it once in a browser to confirm it lands on the right post.", "If you plan to change your @username, do it now, before any order.", "Try one small test order (from KES 20) and watch it move through My Orders."]},
        {"type": "service", "label": "Make a strong post look as good as it is", "text": "Got a post you're proud of that's sitting at 12 likes? A small, gradual boost helps the first strangers who see it take it seriously. Use a public post link and a drip-feed service.", "platform": "all", "subcat": "likes", "cta": "Boost a post I'm proud of"},
        {"type": "quiz", "q": "You order 1,000 TikTok followers, then change your @username an hour later to look more professional. What's the most likely result?", "options": ["Nothing changes, because followers attach to your account, not the name", "Delivery can stall, because the order link now points at a username that no longer exists", "TikTok automatically moves the order to your new name", "You get a refund for the whole order"], "answer": 1, "explain": "Orders are tied to the link you pasted. Rename first, order after, and keep the account public until the order shows Completed."},
        {"type": "takeaways", "items": ["Platform, then service, then link, then quantity, then M-Pesa PIN, then track it in My Orders.", "Wrong or private links are the number one reason an order can't be refunded. Copy links from the Share button.", "Platforms compare growth against your own normal pattern, so gradual beats sudden.", "Follower count is the shop window. Real reach still comes from real viewers."]},
        {"type": "locked", "module": "money", "text": "Once your page looks established, the next question is how it pays you. Turn Growth Into Income covers that:", "items": ["The cost-per-engagement division that shows whether a brand's offer is under market, with a worked KES example", "The audit brands run on your Insights before they pay, and the audience-location mismatch that kills local deals", "The referral math: what 5 active referrals add up to over 12 months", "The four-step funnel for selling your own product via M-Pesa without the 'send me a screenshot' step"]},
        {"type": "sources", "items": [{"title": "Instagram: Reducing inauthentic activity on Instagram (Nov 2018)", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}, {"title": "YouTube Help: Fake engagement policy", "url": "https://support.google.com/youtube/answer/3399767?hl=en"}, {"title": "Geo News: Mosseri explains why users are losing followers (May 2026)", "url": "https://www.geo.tv/latest/663568-adam-mosseri-instagram-lead-speaks-out-on-why-users-are-losing-followers"}]},
      ]},
      { id: "b2", title: "Reading Service Tiers Like a Pro", minutes: 5, body: [
        {"type": "hook", "text": "The cheapest service per 1,000 is often the most expensive per follower that **stays**. The listing tells you which one you're buying, if you know where to look."},
        {"type": "p", "text": "Every service name is a short spec sheet: platform, action, quality tier, refill cover and speed. Most buyers read only the price. This lesson shows you how to read the rest, so you buy the right thing for the job."},
        {"type": "h3", "text": "Anatomy of a service name"},
        {"type": "table", "headers": ["Part of the name", "Example", "What it really tells you"], "rows": [["Platform + action", "Instagram Followers / TikTok Views", "What you get, and what link to paste (profile or post)"], ["Quality tier", "Real Mix / High Quality", "How credible the accounts look to a human visitor: photos, posts, activity"], ["Refill cover", "No Refill / 30-Day Refill", "Whether drops inside that window get topped back up"], ["Speed", "Instant Start / gradual over 24-48h", "How fast it lands, and how much it looks like a spike"], ["Min / Max", "Min 20, Max 10,000", "The smallest test you can run and the most one order can take"]]},
        {"type": "h3", "text": "Why numbers drop, and why refills exist"},
        {"type": "p", "text": "Platforms clean house all the time. In May 2026 Instagram removed bots and long-inactive accounts in one big sweep, and even the biggest accounts lost millions of followers overnight. Any service, paid or not, can be hit by a sweep like that."},
        {"type": "p", "text": "A **refill** service covers that risk for a set window. If the count drops inside the window, it gets topped back up. If you see a drop on a refill order, open a ticket with the order ID. **No Refill** is cheaper because you carry that risk yourself."},
        {"type": "myth", "myth": "\"Refill\" means the numbers are permanent.", "truth": "Refill covers drops **inside the stated window** (say 30 days). After that, normal platform clean-ups can still remove accounts. Match the refill length to how long you need the number to hold, like a launch month or a campaign."},
        {"type": "h3", "text": "Match the tier to the job"},
        {"type": "table", "headers": ["What the order is for", "Tier to prefer", "Speed to prefer"], "rows": [["Testing a service for the first time", "Any, small quantity", "Whatever's listed. You're testing the flow"], ["A business page customers will judge", "High Quality / Real Mix", "Gradual over 1-3 days"], ["A time-sensitive post (launch, event)", "Mid or high tier", "Instant Start, modest quantity"], ["A big number on a page with little history", "High tier with refill", "Split across several days"]]},
        {"type": "insight", "label": "What most buyers miss", "text": "Do the math per **lasting** follower, not per 1,000. Here's an illustration, not a price quote: a KES 100 service that keeps 70% after a month costs about KES 0.14 per remaining follower. A KES 130 service with a refill that holds close to 100% costs about KES 0.13. The cheaper listing was the dearer one."},
        {"type": "template", "label": "Before-you-pay checklist (save in your notes)", "text": "1. Action matches link? (followers = profile link, likes/views = post link)\n2. Tier matches the job? (customers or brands will look = higher tier)\n3. Refill window covers how long I need it? (Y/N)\n4. Speed: gradual unless the post is time-sensitive\n5. Quantity looks believable next to my current numbers?\n6. Account/post public and username final?"},
        {"type": "quiz", "q": "Two follower services: A costs less and has No Refill; B costs a bit more with a 30-day refill. You need the page to look established for a month-long launch. Which is usually the better buy?", "options": ["A, because a lower price per 1,000 always wins", "B, because cost per follower that stays through the launch is what matters", "Neither. Buy views instead", "A, but order twice as many"], "answer": 1, "explain": "Platform clean-ups happen (Instagram ran a huge one in May 2026). For a launch you need numbers that hold for the whole month, so the refill window is part of the price."},
        {"type": "takeaways", "items": ["A service name packs platform, action, tier, refill and speed into one line. Read all five.", "Drops come from platform clean-ups. Refill covers them only inside its window.", "Compare cost per follower that lasts, not cost per 1,000.", "Higher tiers and gradual speed suit pages that customers or brands will judge."]},
        {"type": "locked", "module": "money", "text": "Brands look at your profile more closely than any visitor does. Turn Growth Into Income shows you what they check:", "items": ["Why brands now ask for a live screen-recording of your Insights instead of a screenshot", "The audience top-locations check: why a Nairobi page with a big international share loses local deals", "The 2026 Kenya fee bands for nano, micro and niche-authority creators, and what moves you up a band", "The base fee plus M-Pesa commission deal structure, and when to propose it yourself"]},
        {"type": "sources", "items": [{"title": "Geo News: Mosseri explains why users are losing followers (May 2026)", "url": "https://www.geo.tv/latest/663568-adam-mosseri-instagram-lead-speaks-out-on-why-users-are-losing-followers"}, {"title": "YouTube Help: Fake engagement policy", "url": "https://support.google.com/youtube/answer/3399767?hl=en"}, {"title": "Instagram: Reducing inauthentic activity on Instagram (Nov 2018)", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}]},
      ]},
      { id: "b3", title: "Payments, Refunds & the Rewards You're Already Earning", minutes: 5, body: [
        {"type": "hook", "text": "The most dangerous M-Pesa prompt is the one you **didn't** start. If a PIN request pops up and you didn't just tap Pay, cancel it."},
        {"type": "p", "text": "Paying on EndaViral is built to be quick: an STK push prompt lands on your phone, you enter your PIN, and the order starts by itself once M-Pesa confirms. A few rules about minimums, timeouts and refunds keep that money safe."},
        {"type": "h3", "text": "How the money moves"},
        {"type": "ul", "items": ["**Minimum KES 20** for deposits and orders. It's there so you can test any service cheaply before a bigger order.", "**STK push only.** You start the payment on EndaViral, and the prompt shows up on the phone number you entered. Check that number before you tap Pay.", "**Wallet refunds.** If an order fails or only partly delivers, the undelivered part goes back to your EndaViral Wallet, ready for your next order.", "**No refund for wrong links.** The service delivered, just to the wrong place. That's why Lesson 1 drills link-checking."]},
        {"type": "h3", "text": "What to do when something looks off"},
        {"type": "table", "headers": ["What you see", "What it usually means", "Your move"], "rows": [["Prompt never arrived", "Wrong number, phone offline, or SIM menu busy", "Check the number and signal, then retry once"], ["Prompt timed out before you entered your PIN", "No money left your account", "Start a fresh payment. No need to panic"], ["M-Pesa SMS says paid, order not showing", "Confirmation still syncing", "Wait a few minutes, check My Orders, then open a ticket with the M-Pesa code"], ["Order says Partial", "Some of it couldn't be delivered", "The missing part is refunded to your Wallet"], ["Order stuck for hours", "Delivery queue or a link issue", "Don't re-order. Open a ticket with the order ID"]]},
        {"type": "myth", "myth": "If it looks stuck, pay again. It'll go through faster.", "truth": "Paying twice means two orders aimed at the same link, which can stack into exactly the kind of sudden spike you want to avoid. One ticket with the order ID lets support trace the original order."},
        {"type": "callout", "label": "Scam check, M-Pesa edition", "text": "Safaricom says its staff will never ask for your M-Pesa PIN, and it only calls from 0722000000. Never dial a code a caller reads out to you. Forward suspicious SMS to 333. No EndaViral order ever needs your PIN typed anywhere except the official prompt on your own phone."},
        {"type": "h3", "text": "The rewards hiding in your order history"},
        {"type": "ul", "items": ["**Every 5 orders earns you 1 free order.** Five small orders count the same as five big ones, which is one more reason to test small first.", "**Loyalty points** build up from your orders and can unlock premium Academy lessons, so regular customers can learn the paid material without paying cash."]},
        {"type": "insight", "label": "The KES 20 habit", "text": "Before any order above a few hundred shillings, run a KES 20 test of the same service on the same link. You confirm the link works, see the real start time, and it counts toward your next free order. That's three wins for the price of a soda."},
        {"type": "action", "label": "Do this today", "items": ["Check that the M-Pesa number saved on your account is the phone you actually carry.", "Look at your Wallet balance. Refunds from partial orders may already be waiting there.", "Count your completed orders and work out how many more until your next free one.", "Dial *100*100# on Safaricom to restrict SIM swaps on the line that holds your M-Pesa."]},
        {"type": "quiz", "q": "Your order shows 'Partial': 700 of 1,000 delivered. What happens to the money for the missing 300?", "options": ["It's lost. Partial orders aren't refunded", "It's refunded to your EndaViral Wallet for your next order", "You have to pay again to finish the order", "It's refunded only if you order again within an hour"], "answer": 1, "explain": "Failed and partial orders refund the undelivered part to your Wallet. The only order type that can't be refunded is one sent to a wrong link."},
        {"type": "takeaways", "items": ["Only enter your PIN on a prompt you just started. The minimum is KES 20.", "Partial or failed orders go back to your Wallet. Wrong links don't.", "Never re-pay a stuck order. Open a ticket with the order ID.", "Every 5 orders earns a free one, and loyalty points can unlock premium lessons."]},
        {"type": "locked", "module": "money", "text": "Your order history earns rewards. Your referral link can do more than that. Turn Growth Into Income works out how much:", "items": ["The table of what a referral spending KES 1,000, KES 5,000, or five referrals at KES 2,000 a month pays you over 12 months", "Why recurring commission beats a one-time signup bonus", "Who actually converts on a referral link, and the placements that keep it visible instead of scrolling past", "The 'here's exactly how I grew mine' pairing that turns advice you already give into income"]},
        {"type": "sources", "items": [{"title": "Safaricom: Fraud awareness tips", "url": "https://safaricom.co.ke/fraud-awareness/tips-tricks"}, {"title": "Tech-ish: Kenyans lost KES 491.6 million to SIM swap fraud in 2025 (INTERPOL)", "url": "https://tech-ish.com/2026/08/10/kenyans-lost-kes-491-6-million-to-sim-swap-fraud-in-2025-interpol-report-says/"}]},
      ]},
      { id: "b4", title: "Getting Help Fast, and Getting Paid Back", minutes: 4, body: [
        {"type": "hook", "text": "A ticket that starts with your order ID gets traced in seconds. A ticket that says 'my followers didn't come' starts a back-and-forth that can eat a day."},
        {"type": "p", "text": "Support is faster when you hand it what it needs on the first message. This lesson covers where to look before you ask, the ticket format that skips the back-and-forth, and the rewards most customers forget they're earning, including one that pays you."},
        {"type": "h3", "text": "Check these three things before you ask"},
        {"type": "ol", "items": ["**My Orders.** Statuses update by themselves. Processing on a drip-feed service is normal, not stuck.", "**Your link.** Open it in a browser. Is the post still up, public, and under the same @username?", "**The chat widget.** It answers common questions about status, pricing and how services work straight away."]},
        {"type": "h3", "text": "The ticket that gets solved first time"},
        {"type": "template", "label": "Copy-paste ticket", "text": "Order ID: [from My Orders]\nService: [exact service name]\nLink used: [paste it]\nQuantity ordered: [ ]  Delivered so far: [ ]\nWhat I expected: [e.g. start within 1 hour]\nWhat happened: [e.g. still Pending after 6 hours]\nM-Pesa code (if a payment issue): [ ]\nScreenshot attached: [Y/N]"},
        {"type": "insight", "label": "What most people miss", "text": "**One order, one ticket.** If three orders have problems, list all three IDs in a single ticket. Opening several tickets, or re-ordering 'just in case', splits the trail support has to follow."},
        {"type": "callout", "label": "Real support never asks for these", "text": "No growth order needs your social media password, a login code, or your M-Pesa PIN. Only a public link. Anyone in your DMs claiming to be 'EndaViral support' who asks for those is a scammer. Instagram has said that third-party apps asking for your login are a sign of trouble, and it tells affected users to change their password."},
        {"type": "h3", "text": "Rewards you're already earning"},
        {"type": "table", "headers": ["Reward", "How it works", "Easy to miss because..."], "rows": [["Free orders", "Every 5 orders = 1 free order", "Small test orders count too"], ["Loyalty points", "Earned from orders, can unlock premium Academy lessons", "They sit quietly in your account until you use them"], ["Refer & Earn", "About 7.5% of what people you refer spend, credited when their orders complete", "It keeps paying every time they re-order"], ["Withdrawals", "Referral earnings go to M-Pesa from KES 100", "KES 100 is only about KES 1,330 of referral spend"]]},
        {"type": "p", "text": "The Refer & Earn rate is about 15% of each order's profit share, which works out to roughly 7.5% of what your referral spends. Your exact figures always show in the Refer & Earn section, and cancelled orders don't earn."},
        {"type": "action", "label": "Do this today", "items": ["Save the ticket template in your phone notes.", "Open Refer & Earn and copy your personal link.", "Check your loyalty points and see which premium lessons they could unlock.", "Share your link once in a WhatsApp Status with one real tip from this Academy, not a bare link."]},
        {"type": "quiz", "q": "Two of your orders look stuck. What gets them fixed fastest?", "options": ["Re-order both so at least one goes through", "Open one ticket listing both order IDs, links and what you expected", "Open a separate ticket every hour until someone replies", "DM anyone on Instagram who says they're EndaViral support"], "answer": 1, "explain": "Order IDs let support trace your exact orders. Re-ordering stacks deliveries, and repeat tickets split the trail. Real support never asks for passwords in DMs."},
        {"type": "takeaways", "items": ["Check My Orders, your link and the chat widget before you open a ticket.", "Lead every ticket with the order ID, and put several orders in one ticket.", "Nobody legitimate needs your password, login code or PIN.", "Refer & Earn pays about 7.5% of referral spend, withdrawable to M-Pesa from KES 100."]},
        {"type": "locked", "module": "affiliate_pro", "text": "Refer & Earn is one affiliate program. The Affiliate Marketing Guide shows how to build steady income from several:", "items": ["Why the cookie window can matter more than the headline commission rate, with a Kisumu phone-review example", "EPC and cost-per-effort: the two formulas that show which program deserves your next post", "The in-content mention script and pinned explainer post that turn a bare bio link into clicks", "A 12-month Kenyan affiliate calendar, from back-to-school to December upcountry travel"]},
        {"type": "sources", "items": [{"title": "Instagram: Reducing inauthentic activity on Instagram (Nov 2018)", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}, {"title": "Safaricom: Fraud awareness tips", "url": "https://safaricom.co.ke/fraud-awareness/tips-tricks"}]},
      ]},
      { id: "b5", title: "The Cold-Start Problem: What a Boost Can and Can't Do", minutes: 5, body: [
        {"type": "hook", "text": "On a brand-new page, the hardest follower to get is the **first stranger**. Nobody wants to be the only person in an empty room."},
        {"type": "p", "text": "A new account gives a platform almost nothing to work with: no watch history and no pattern of who engages. And every human visitor who lands on it makes a snap call before reading a word. This lesson is honest about what a starter boost does and what it doesn't do."},
        {"type": "h3", "text": "What a starter boost can and can't do"},
        {"type": "table", "headers": ["It CAN", "It CAN'T"], "rows": [["Remove the 'zero' a new visitor sees on day one", "Count toward YouTube Partner Program hours or subscribers. YouTube excludes traffic it judges artificial"], ["Make a good post look worth a stranger's tap", "Make a weak video hold viewers. Retention is earned"], ["Help a Nairobi salon or Eastleigh shop look open for business", "Be shown to brands as organic reach. That's misrepresentation"], ["Buy you time while your content finds its audience", "Protect you from platform rules on inauthentic engagement (see the Safety module)"]]},
        {"type": "myth", "myth": "Buy enough followers and the algorithm will start pushing you.", "truth": "Algorithms reward what real viewers do: watch time, shares, saves, replies. TikTok's own guidelines say it removes fake followers and likes it finds and treats manipulated content as ineligible for the For You feed. A boost helps **people** trust you. Only the content earns reach."},
        {"type": "h3", "text": "Why owned income matters more in Kenya"},
        {"type": "p", "text": "Platform payouts are uneven here. Capital FM reported in June 2025 that TikTok's creator payout programmes still weren't open to African users, Kenya included. Where payouts do exist, Meta has taken 5% withholding tax from Kenyan creators' payouts since January 2026, and Google told YouTube creators to submit their KRA PINs by 1 October 2026 or face payment freezes."},
        {"type": "p", "text": "So the creators who earn steadily usually don't wait for an ad cheque. They use the page as a shopfront for brand deals, referrals and their own products. A Kisumu baker's page doesn't need 100K followers. It needs 40 locals who trust it enough to order a cake on M-Pesa."},
        {"type": "insight", "label": "What most creators miss", "text": "Social proof matters most when you have the least of it. The jump from 0 to 50 visible likes changes a stranger's first impression far more than the jump from 5,000 to 5,050. If you use a boost at all, it does the most good early and small, on your best post."},
        {"type": "template", "label": "Launch-week plan for a new page", "text": "Day 1: Post your 3 strongest pieces (a pinned 'who this page is for' + 2 best examples)\nDay 2: Share to WhatsApp Status and 2 relevant groups. Ask 5 real customers or friends for an honest comment\nDay 3: Small gradual boost on your single best post only (optional)\nDay 4-6: Post daily. Reply to every comment within the hour\nDay 7: Check which post got the most saves or shares, and make two more like it"},
        {"type": "service", "label": "Give your best post a fair first impression", "text": "A small, gradual boost on one post you're genuinely proud of helps the first real visitors take it seriously. Keep it modest next to your current numbers, and let the content do the rest.", "platform": "all", "subcat": "packages", "cta": "See starter packages"},
        {"type": "action", "label": "Do this today", "items": ["Pin one post that says in one line who your page is for.", "Pick your single best post and note its saves and shares. That's your benchmark.", "Message five real customers or friends and ask for an honest comment, not just a like.", "Write down one way the page could earn this month without ad payouts: a deal, a referral, or a product."]},
        {"type": "quiz", "q": "What does a small starter boost genuinely help with?", "options": ["Qualifying for YouTube monetisation faster", "Making the algorithm push your videos regardless of quality", "A stranger's first impression of whether your page is worth a follow", "Proving organic reach to a brand"], "answer": 2, "explain": "Bought numbers are social proof for humans. Platforms exclude artificial traffic from monetisation and reward real viewer behaviour, and brands must never be shown boosted numbers as organic."},
        {"type": "takeaways", "items": ["A new page's biggest hurdle is the first stranger's trust. Proof matters most when there's least of it.", "A boost helps people's first impression. It doesn't qualify you for monetisation or fix weak content.", "In Kenya, owned income (deals, referrals, products) is often more reliable than platform payouts.", "Never present boosted numbers to brands as organic."]},
        {"type": "locked", "module": "money", "text": "Once people trust the page, the next step is getting them to buy. Turn Growth Into Income walks through the funnel:", "items": ["The three digital-product categories Kenyan creators sell well, and why there's no stock risk", "Selar vs Payhip vs a direct M-Pesa Till: how buyers pay and what each one takes", "The four-step funnel, and the single fix that removes 'forward me a screenshot' from your sales", "Why your first customers are already in your comments, and what to say to them before you launch"]},
        {"type": "sources", "items": [{"title": "TikTok Community Guidelines: Integrity and Authenticity", "url": "https://www.tiktok.com/community-guidelines/en/integrity-authenticity/"}, {"title": "YouTube Help: Fake engagement policy", "url": "https://support.google.com/youtube/answer/3399767?hl=en"}, {"title": "Capital FM: Tackling monetisation barriers in Kenya's creator economy (June 2025)", "url": "https://www.capitalfm.co.ke/news/2025/06/tackling-monetization-barriers-in-kenyas-creator-economy"}, {"title": "The Star: What awaits creators after Meta's 5% tax takes effect", "url": "https://www.the-star.co.ke/news/2025-11-21-explainer-what-awaits-creators-after-metas-5-tax-takes-effect"}]},
      ]},
    ],
  },
  {
    id: 'ig', icon: '📸', title: 'Instagram Growth Guide',
    blurb: "How Instagram really ranks you in 2026 — and what changed",
    lessons: [
      { id: "ig1", title: "How Instagram Actually Ranks You in 2026", minutes: 5, body: [
        {"type": "hook", "text": "That viral \"one DM share = 10–15 likes\" rule? Instagram never said it. What Instagram's boss actually said is more specific — and it changes what you should post for followers versus strangers."},
        {"type": "p", "text": "Instagram doesn't run one algorithm. Feed, Stories, Reels and Explore each have their own ranking system, because people use each one differently. Stories are mostly people you already know. Reels and Explore are mostly strangers."},
        {"type": "p", "text": "In January 2025, Instagram head Adam Mosseri named the **three signals that matter most for ranking: watch time, likes and sends** (a send is when someone forwards your post by DM). He told creators to watch average watch time, likes per reach and sends per reach."},
        {"type": "stat", "value": "3", "label": "Signals Mosseri named as most important for ranking: watch time, likes, sends (Mosseri, Jan 2025, via Social Media Today)"},
        {"type": "h3", "text": "The detail almost everyone skipped"},
        {"type": "p", "text": "Mosseri added one sentence most blogs ignored: likes are **slightly more important for followers**, and sends are **slightly more important for non-followers**. So the same post is judged a bit differently depending on who is watching."},
        {"type": "table", "headers": ["Who sees it", "Surface", "What helps most"], "rows": [["Your followers", "Feed, Stories", "Likes, comments, Story replies, DMs with you"], ["Strangers", "Reels tab, Explore", "Watch time and sends (DM shares)"], ["Everyone", "All surfaces", "Watching to the end instead of scrolling past"]]},
        {"type": "myth", "myth": "One DM share is worth 10–15 likes, and saves are the second-strongest signal.", "truth": "No official source gives any likes-to-sends ratio — those numbers come from marketers guessing. Mosseri's public list is watch time, likes and sends, with sends \"slightly\" more important for reaching non-followers. Saves still help, but Instagram hasn't named them as a top-three signal."},
        {"type": "p", "text": "Instagram compares **rates, not totals**. Ten sends from 300 people reached is a strong signal. Ten sends from 30,000 is weak. That's good news for small accounts: a Nairobi nail tech with 400 followers can beat a big page on rate, even with smaller numbers."},
        {"type": "insight", "label": "What most creators miss", "text": "Since late 2025 Instagram shows **skip rate** in Reel Insights — the share of viewers who left within the first 3 seconds. It's the clearest number you have for whether your opening worked. Most people never scroll down far enough to see it."},
        {"type": "template", "label": "Your 3-number scorecard (copy into Notes)", "text": "Reel: [title]\nAccounts reached: [ ]\nAvg watch time: [ ] sec  |  Skip rate: [ ]%\nLikes per 1,000 reached = likes ÷ reach × 1,000 = [ ]\nSends per 1,000 reached = shares ÷ reach × 1,000 = [ ]\nWho was it for? [followers / strangers]"},
        {"type": "action", "label": "Do this today", "items": ["Open Insights on your last 3 Reels and write down reach, average watch time, skip rate, likes and shares.", "Work out likes and sends per 1,000 reached for each using the scorecard.", "Mark which Reel reached mostly non-followers — check if it also had your best send rate.", "Reply to every unanswered comment and DM from this week: that's the follower-side signal."]},
        {"type": "quiz", "q": "Your Reel was shown mostly to people who don't follow you. Which signal did Mosseri say matters slightly more in that case?", "options": ["Saves", "Likes", "Sends (DM shares)", "Number of hashtags"], "answer": 2, "explain": "Mosseri said likes matter slightly more for followers and sends slightly more for non-followers. For Reels aimed at strangers, design for the forward."},
        {"type": "takeaways", "items": ["Each surface has its own ranking; Reels and Explore are judged mostly on strangers.", "Top three signals: watch time, likes, sends — measured per reach, not in totals.", "The \"1 send = 10–15 likes\" figure has no official source.", "Check skip rate first: it tells you if your opening failed."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "Knowing the signals is step one. The Reels Growth Engine shows you how to engineer them, Reel by Reel.", "items": ["The frame-by-frame plan for the first 3 seconds: what goes in frame 1, at 0.5–1.5s and at 1.5–3s", "The four \"sendable\" Reel formats, each with a Kenyan example, plus a send-first outline you can fill in", "How to calculate sends per 1,000 reached and use it to pick your winning format", "Six hook lines to adapt, tested with a salon's A/B example"]},
        {"type": "sources", "items": [{"title": "Social Media Today – Instagram chief shares top ranking signals (Jan 2025)", "url": "https://www.socialmediatoday.com/news/instagram-shares-algorithm-2025/738034/"}, {"title": "Social Samosa – Instagram adds Retention chart and Skip Rate", "url": "https://www.socialsamosa.com/news-2/instagram-retention-chart-skip-rate-new-performance-metrics-reels-9730992"}, {"title": "Lindsey Gamble – Instagram's focus on sends per reach: a timeline", "url": "https://www.lindseygamble.com/blog/unpacking-instagrams-focus-on-sends-per-reach-a-timeline-why-it-matters-and-tips-for-creators-brands"}]},
      ]},
      { id: "ig2", title: "Social Proof vs Algorithm Signals: Using Growth Services Wisely", minutes: 5, body: [
        {"type": "hook", "text": "Bought likes can make a stranger trust you. They can't make Instagram's Reels system trust you. Knowing the difference is what separates money well spent from money wasted."},
        {"type": "p", "text": "Every post faces two judges. The first is **human**: a stranger who lands on your page and decides in seconds whether you look worth following. The second is **the ranking system**, which watches how real viewers behave — how long they watch, whether they like it, whether they send it to a friend."},
        {"type": "p", "text": "Growth services speak to the first judge. They don't speak to the second. Mixing those two up is the most expensive mistake people make."},
        {"type": "table", "headers": ["What a boost can do", "What a boost can't do"], "rows": [["Remove the empty \"0 likes\" look from a new post", "Make strangers watch your Reel to the end"], ["Make a new business page look established", "Create DM sends from people in your niche"], ["Give a strong post social proof when real visitors arrive", "Fix a weak hook or a confusing topic"], ["Help a profile visit turn into a follow", "Count toward any monetisation programme"]]},
        {"type": "myth", "myth": "Buy likes in the first hour and Instagram is forced to push your Reel to more people.", "truth": "Reels are tested on real viewers, and Mosseri says watch time, likes and sends per reach are what count. Likes from accounts that never watched don't add watch time or sends. Instagram also says it removes inauthentic likes and follows from third-party apps. Treat a boost as a first impression for humans, not a lever on the algorithm."},
        {"type": "h3", "text": "The smart order"},
        {"type": "ol", "items": ["**Content first.** Only boost posts you'd be proud to show a customer — your best transformation, clearest tutorial or strongest product video.", "**Small and gradual.** A modest amount delivered over days looks like normal growth. A sudden jump with flat engagement looks odd to visitors and to Instagram.", "**Followers after proof.** Add followers once your grid has a few strong posts, so new visitors find something worth staying for.", "**Never show boosted numbers to brands as organic.** Brands check engagement rate and audience location. Getting caught costs more than the deal."]},
        {"type": "callout", "label": "Example: an Eastleigh fabric shop", "text": "A shop owner posts a Reel of new chiffon rolls. Before boosting, she checks: does it open on the fabric, not the shop sign? Is the price on screen? It passes, so she adds a small likes order for social proof. The order makes the post look alive; the hook and price are what get the DMs."},
        {"type": "service", "label": "Social proof for posts you're proud of", "text": "Put a modest, gradual likes order behind your strongest Reel so the first real visitors see a post that already looks trusted. It won't replace good content — it helps good content make a better first impression.", "platform": "instagram", "subcat": "likes", "cta": "Boost a post I'm proud of"},
        {"type": "insight", "label": "What most people miss", "text": "Instagram's Terms don't allow artificially boosting engagement, and Instagram has said it removes inauthentic likes and follows. So a boost is never \"risk-free\". Keep orders small, keep your content real, and the worst case is losing some numbers — not your account's reputation with customers."},
        {"type": "action", "label": "Do this today", "items": ["Pick your 3 best posts. Would you show each one to a paying customer? Only those qualify for a boost.", "Check each one's skip rate — if over half leave in 3 seconds, fix the opening before spending anything.", "Write down your current engagement rate (likes + comments ÷ followers) so you can track it honestly.", "Decide a monthly growth budget in KSh you'd spend on any normal marketing cost, and stick to it."]},
        {"type": "quiz", "q": "Which of these can a bought likes order realistically do?", "options": ["Raise your Reel's average watch time", "Make a new post look trusted to the first real visitors", "Count toward monetisation thresholds", "Generate DM sends from your target audience"], "answer": 1, "explain": "Bought engagement works on human first impressions. Watch time and sends only come from real viewers, and no platform counts bought numbers toward monetisation."},
        {"type": "takeaways", "items": ["Two judges: humans (first impressions) and the ranking system (real behaviour).", "Boosts help the first judge only — so only boost content that's already good.", "Small, gradual and never presented to brands as organic.", "Instagram's rules prohibit inauthentic engagement; size your risk accordingly."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "The ranking system only rewards what real viewers do. The premium module shows you how to earn those signals on purpose.", "items": ["How to design a Reel around one \"person-shaped problem\" so viewers forward it", "The 90-day posting rhythm that builds account-level momentum, with a weekly tracker", "When a modest boost actually helps during a restart — and when it doesn't", "The profile fixes that turn a visitor into a follow (with weak vs strong examples)"]},
        {"type": "sources", "items": [{"title": "Social Media Today – Instagram chief shares top ranking signals (Jan 2025)", "url": "https://www.socialmediatoday.com/news/instagram-shares-algorithm-2025/738034/"}, {"title": "Instagram – Reducing inauthentic activity on Instagram", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}, {"title": "Instagram for Creators – What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}]},
      ]},
      { id: "ig3", title: "Reels in 2026: The 3-Minute Line, Skip Rate & Cadence", minutes: 5, body: [
        {"type": "hook", "text": "Instagram now lets you post a Reel up to 20 minutes long. Post one longer than 3 minutes, though, and Instagram won't recommend it to a single new person."},
        {"type": "p", "text": "Reels are still Instagram's biggest way to reach strangers. But the rules on length, openings and watermarks changed several times in 2025 and 2026, and a lot of advice online is out of date."},
        {"type": "h3", "text": "Length: the 3-minute line"},
        {"type": "p", "text": "Reels went from 90 seconds to 3 minutes in January 2025. Instagram's Help Center now describes recording up to 20 minutes. But Instagram's own creator guidance says **Reels over 3 minutes can't be recommended** to non-followers. Longer Reels mostly reach people who already follow you."},
        {"type": "table", "headers": ["Length", "Who can see it", "Use it for"], "rows": [["Under 3 min", "Followers + strangers (Reels tab, Explore)", "Growth: tips, transformations, products"], ["3–20 min", "Mostly followers and profile visitors", "Deep tutorials, full events, loyal fans"]]},
        {"type": "h3", "text": "Your hook now has a score"},
        {"type": "p", "text": "In 2025 Instagram replaced \"view rate\" with **skip rate**: the share of viewers who left in the first 3 seconds. It also added a retention chart. Instagram's note on it: you'll always see a downward slope, but \"the flatter the line, the more engaged your audience is.\""},
        {"type": "insight", "label": "What most creators miss", "text": "Your own logo is fine. Mosseri said in October 2024 that putting your own logo on a Reel won't hurt reach. What Instagram avoids recommending is Reels carrying **another app's** watermark — like the TikTok logo that comes with a downloaded video."},
        {"type": "p", "text": "Mosseri's advice is to balance how often you post against the time and resources you actually have. He has also said scheduling a Reel doesn't hurt its reach. So a Kisumu baker who can make two good Reels a week should schedule two good Reels, not force five weak ones."},
        {"type": "callout", "label": "Free tool worth knowing", "text": "Instagram's Edits app (launched April 2025) is a free editor with a teleprompter, captions and an ideas folder. Because it's Instagram's own tool, you avoid the rival-app watermark problem below."},
        {"type": "template", "label": "Opening lines that cut skip rate", "text": "\"Don't buy [PRODUCT] in [TOWN] before you see this.\"\n\"KSh [AMOUNT] vs KSh [AMOUNT] — can you tell the difference?\"\n\"This is what [RESULT] looks like after [TIME].\"\n\"Every [TYPE OF PERSON] makes this mistake with [THING].\""},
        {"type": "action", "label": "Do this today", "items": ["Open your last 3 Reels' Insights and write down each skip rate.", "Check if any Reel is over 3 minutes and was meant for new people — re-cut it under 3.", "Search your camera roll for any video with a TikTok or CapCut logo and re-export it clean.", "Pick a weekly number of Reels you can keep up in your busiest month, and schedule the next one."]},
        {"type": "quiz", "q": "Which Reel is eligible to be recommended to people who don't follow you?", "options": ["A 4-minute tutorial with your own logo", "A 2-minute clip downloaded from TikTok with its watermark", "A 2:50 Reel with your own shop logo", "A 20-minute live recap"], "answer": 2, "explain": "Reels over 3 minutes can't be recommended, and other apps' watermarks are avoided. Your own logo is fine, per Mosseri."},
        {"type": "takeaways", "items": ["Keep growth Reels under 3 minutes — longer ones mostly reach followers.", "Skip rate = viewers gone in 3 seconds. Fix that number first.", "Your logo is fine; another app's watermark isn't.", "Post as often as you can do well — scheduling doesn't hurt reach."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "This lesson tells you what to measure. The premium module shows you exactly what to put in those first seconds.", "items": ["The second-by-second opening plan: thumb-stop frame, the promise, then the first proof", "On-screen text rules — word count and where to place it so it doesn't hide behind buttons", "How to read drop-off to tell a failed hook from a slow middle", "A 90-day cadence plan and tracker so posting gaps stop costing you reach"]},
        {"type": "sources", "items": [{"title": "Instagram for Creators – What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}, {"title": "Social Samosa – Instagram adds Retention chart and Skip Rate", "url": "https://www.socialsamosa.com/news-2/instagram-retention-chart-skip-rate-new-performance-metrics-reels-9730992"}, {"title": "Social Media Today – Mosseri: your own logo on a Reel is OK", "url": "https://www.socialmediatoday.com/news/instagram-clarifies-that-including-your-own-logo-on-a-reel-is-ok/730852/"}, {"title": "Indian Television – Instagram Edits marks one year with 130+ features", "url": "https://indiantelevision.com/iworld/instagram-edits-marks-one-year-with-130-plus-new-features/"}]},
      ]},
      { id: "ig4", title: "Keeping Your Account Healthy (and Recommendable)", minutes: 5, body: [
        {"type": "hook", "text": "There's a screen in your Instagram settings that tells you whether Instagram has stopped showing your posts to strangers. Most creators who complain about a \"shadowban\" have never opened it."},
        {"type": "p", "text": "It's called **Account Status** (Settings → Account → Account Status on professional accounts). It shows whether your content can be recommended to non-followers in Explore, Reels and Feed suggestions — and if not, which posts caused it."},
        {"type": "h3", "text": "What actually gets you hidden from strangers"},
        {"type": "ul", "items": ["Posts that break Instagram's Recommendation Guidelines — e.g. violence, vaping or tobacco promotion, sexually suggestive content. Followers can still see them; strangers can't.", "A profile photo or bio that breaks those guidelines — this can make your **whole account** ineligible for a while.", "Posts removed for Community Guidelines violations, especially recent or repeated ones.", "A private account — only public accounts get recommended.", "Mostly reposting other people's content. Since April 2026 this covers photos and carousels, not just Reels."]},
        {"type": "insight", "label": "What most people miss", "text": "If Account Status shows a problem, you can often fix it yourself: edit or delete the flagged post, then check again. If you think Instagram made a mistake, you can ask for a review from the same screen."},
        {"type": "h3", "text": "The plain truth about growth services"},
        {"type": "p", "text": "Instagram's Terms don't allow artificially boosting likes, follows or comments. Since 2018 Instagram has said it uses machine learning to find accounts that use third-party growth apps, removes the fake activity, and sends those accounts an in-app warning. Nobody can honestly promise you zero risk."},
        {"type": "p", "text": "If you choose to use a growth service anyway, these habits reduce the risk:"},
        {"type": "ol", "items": ["**Never give your password** to a liker app, \"auto-follower\" or anyone in your DMs. Instagram specifically targets apps that log in as you.", "**Turn on two-factor authentication** today.", "**Don't stack** a growth order with follow/unfollow bots or engagement-pod apps.", "**Keep orders small and gradual**, and keep your account public while they deliver.", "**Track engagement rate**, not just followers. If followers rise and engagement collapses, stop."]},
        {"type": "callout", "label": "Example: a Nakuru phone shop", "text": "A shop's Reels suddenly stopped reaching new people. Account Status showed one flagged post: a vape accessory they'd stocked briefly. They deleted it, checked again a few days later, and their Reels were eligible again. No \"shadowban\" — one post."},
        {"type": "template", "label": "Monthly account health check", "text": "Date: [ ]\nAccount Status: [Eligible / Not eligible — flagged post: ]\n2FA on? [Yes/No]\nAny third-party app with my password? [List — revoke them]\nFollowers: [ ]  Avg likes+comments per post: [ ]\nEngagement rate = (avg likes + comments) ÷ followers × 100 = [ ]%\nReposts of other people's content this month: [ ]"},
        {"type": "action", "label": "Do this today", "items": ["Open Account Status and screenshot what it says.", "Turn on two-factor authentication.", "Check Settings → Apps and websites and remove anything you don't recognise.", "Fill in the health check template above as your baseline."]},
        {"type": "quiz", "q": "Which is MOST likely to stop your whole account being recommended to new people?", "options": ["Posting at the 'wrong' time of day", "A bio that breaks Recommendation Guidelines", "Using only 3 hashtags", "Posting your own logo on Reels"], "answer": 1, "explain": "Instagram says a profile photo or bio that breaks Recommendation Guidelines can make your entire account ineligible for a period. Timing, hashtag count and your own logo don't."},
        {"type": "takeaways", "items": ["Account Status is the real \"shadowban checker\" — use it monthly.", "Flagged posts can usually be fixed or appealed.", "Inauthentic engagement breaks Instagram's rules; reduce risk, don't pretend it's zero.", "Never share your password; turn on 2FA."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "A healthy account is the floor. The premium module shows how to build the kind of account Instagram keeps showing.", "items": ["Why the last 2–3 months of your account shape today's reach — and how to restart after going quiet", "The Stories → Close Friends → Broadcast Channel ladder for building a loyal inner circle", "How to pick 3–5 content pillars so Instagram knows exactly who to show you to", "A 90-day consistency tracker you fill in once a week"]},
        {"type": "sources", "items": [{"title": "Instagram for Creators – What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}, {"title": "Instagram – Reducing inauthentic activity on Instagram", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}, {"title": "TechCrunch – Instagram restricts reach of content aggregators (Apr 2026)", "url": "https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/"}]},
      ]},
      { id: "ig5", title: "When Buying Growth Helps — and When It Wastes Your Money", minutes: 5, body: [
        {"type": "hook", "text": "The money you spend on followers works hardest in a place most people ignore: the five seconds a stranger spends on your profile after watching one Reel."},
        {"type": "p", "text": "A Reel can reach 20,000 people and still win you 12 followers. The reach happened in the Reels tab. The **follow decision happens on your profile** — name, bio, pinned posts, and yes, the numbers."},
        {"type": "p", "text": "That's where growth services honestly help: **first impressions**. A business page showing 38 followers makes a careful buyer in Nairobi hesitate before sending M-Pesa. The same page with an established count and active Reels looks like a shop people already trust."},
        {"type": "h3", "text": "When buying helps — and when it hurts"},
        {"type": "table", "headers": ["Situation", "Worth it?", "Why"], "rows": [["New business page with good products and a clear bio", "Often yes", "Removes the 'is this a scam?' doubt for first buyers"], ["Strong Reel already getting real shares", "Can help", "Social proof as more real visitors arrive"], ["Weak content, unclear bio", "No", "Visitors still leave; you've paid to look busy"], ["Pitching brands for paid deals", "Never as 'organic'", "Brands check engagement and audience location"], ["Trying to reach monetisation", "No", "Bought numbers don't count toward any programme"]]},
        {"type": "myth", "myth": "Buy enough followers and Instagram will treat you like a big creator.", "truth": "Instagram ranks posts on how real viewers behave — watch time, likes and sends per reach. A big follower count with low engagement actually lowers your engagement rate, which is the first number brands look at. Followers help human trust, not ranking."},
        {"type": "h3", "text": "Measure the thing that matters"},
        {"type": "p", "text": "Track **follows ÷ profile visits** in Insights each week. If 100 people visit and 3 follow, your profile is leaking. Fix the bio and pinned posts before spending on anything else — then any boost lands on a page that converts."},
        {"type": "callout", "label": "Example: a Kisumu home baker", "text": "A baker selling cakes from KSh 2,500 had a nice grid but only 60 followers, and new customers kept asking \"are you legit?\". She rewrote her bio to \"Custom cakes in Kisumu · order by M-Pesa · delivery same day\", pinned three customer-reaction Reels, then added a modest follower order. Questions about legitimacy dropped, and her follows-per-visit rate became her weekly number."},
        {"type": "service", "label": "First impressions for a page that's ready", "text": "Once your bio and pinned Reels are sorted, a modest follower order helps new visitors see a page that looks established. Use it as a startup cost for trust — and keep growing real engagement alongside it.", "platform": "instagram", "subcat": "followers", "cta": "Order Instagram followers"},
        {"type": "template", "label": "Honest line for your media kit", "text": "Instagram: [X] followers · Avg reach per Reel (last 30 days): [ ] · Avg sends per Reel: [ ] · Top audience city: [ ]\n(Brands care most about reach, sends and audience location — lead with those.)"},
        {"type": "action", "label": "Do this today", "items": ["Note this week's profile visits and follows from Insights; divide follows by visits.", "Ask a friend to look at your profile for 5 seconds and say who it's for.", "Pin your 3 strongest Reels.", "Only then decide whether a small boost makes sense for your page."]},
        {"type": "quiz", "q": "Where does a growth service give you the most honest value?", "options": ["Raising your Reels' watch time", "Unlocking monetisation faster", "Making a ready profile look trustworthy to first-time visitors", "Showing brands higher organic reach"], "answer": 2, "explain": "Bought numbers work on human first impressions. They don't add watch time, don't count for monetisation, and should never be shown to brands as organic."},
        {"type": "takeaways", "items": ["Reach happens in Reels; follows happen on your profile.", "Fix the profile first, then any boost works harder.", "Track follows ÷ profile visits weekly.", "Be honest with brands — they check."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "Your profile is the shop window. The premium module rebuilds it line by line.", "items": ["The 5-second profile test: three questions every visitor must be able to answer", "Weak vs strong examples for the name field, both bio lines and the call to action", "Which three Reels to pin — and the cover style that makes a grid look intentional", "A caption formula and bio template with M-Pesa/WhatsApp ordering built in"]},
        {"type": "sources", "items": [{"title": "Social Media Today – Instagram chief shares top ranking signals (Jan 2025)", "url": "https://www.socialmediatoday.com/news/instagram-shares-algorithm-2025/738034/"}, {"title": "Instagram for Creators – What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}, {"title": "Instagram – Reducing inauthentic activity on Instagram", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}]},
      ]},
      { id: "ig6", title: "Your Algorithm, 5 Hashtags & Originality: What Changed in 2025–2026", minutes: 5, body: [
        {"type": "hook", "text": "Since January 2026, anyone in Kenya using Instagram in English can open a menu and tell Instagram which topics to show them more — or less — of. If your Reels don't fit a clear topic, you're competing for a slot nobody chose."},
        {"type": "table", "headers": ["When", "What changed", "What it means for you"], "rows": [["Jan 2025", "Reels up to 3 min; profile grid becomes taller rectangles", "Check covers on the new grid crop"], ["Jan 2025", "Mosseri names watch time, likes, sends as top signals", "Design for watching and forwarding"], ["Apr 2025", "Edits app launches (free editor)", "Clean exports with no rival watermark"], ["2025", "Skip rate and retention chart in Reel Insights", "Your opening now has a score"], ["Dec 2025", "'Your Algorithm' launches in the US; hashtags capped at 5", "Topic clarity beats hashtag stuffing"], ["Jan 2026", "'Your Algorithm' opens to all English speakers worldwide", "Kenyan viewers can now pick topics"], ["Apr 2026", "Originality rules extend to photos and carousels", "Repost pages lose recommendations"], ["2026", "'Your Algorithm' extends beyond Reels; Reels can run up to 20 min", "Only under-3-min Reels reach strangers"]]},
        {"type": "h3", "text": "1. Viewers now choose topics"},
        {"type": "p", "text": "From the Reels tab, users tap the slider icon to see and edit the topics Instagram thinks they like. So say your topic early — out loud and on screen — and keep one clear theme. A Mombasa food page that suddenly posts politics is asking to be filed under the wrong topic."},
        {"type": "h3", "text": "2. Originality is enforced"},
        {"type": "p", "text": "Instagram says accounts that repeatedly post other people's content without meaningfully changing it won't be shown in recommendation surfaces. Adding a watermark or changing a video's speed doesn't count as changing it. Followers still see those posts; strangers don't."},
        {"type": "myth", "myth": "You're safe as long as you repost fewer than 10 things in 30 days.", "truth": "That number came from 2024 news coverage. Instagram's current creator guidance only says accounts that \"repeatedly\" post others' content lose recommendations, with no safe number. Don't count — create."},
        {"type": "h3", "text": "3. Hashtags are labels, not rockets"},
        {"type": "p", "text": "Since December 2025 you can use **five hashtags at most**. Mosseri has said hashtags don't increase reach; they help people understand what a post is about. Use five specific ones, not 30 generic ones."},
        {"type": "insight", "label": "What most creators miss", "text": "Mosseri's year-end memo argued that as AI makes polished content cheap, \"Rawness isn't just aesthetic preference anymore—it's proof.\" He also wrote that \"The primary way people share now is in DMs.\" Real faces, real places and a reason to forward are your edge."},
        {"type": "template", "label": "The 5-hashtag formula", "text": "#[YourTopic] #[YourTopic+City] #[YourSeriesName] #[ProductOrSkill] #[AudienceType]\nExample: #BudgetDecor #NairobiHomes #BedsitterMakeover #RentalFriendly #FirstApartment"},
        {"type": "action", "label": "Do this today", "items": ["Open your own Reels tab, tap the slider icon and look at your topics — that's what your viewers see.", "Write your niche in one line and check your last 9 posts fit it.", "Cut every caption to 5 specific hashtags.", "Delete or rework any post that's someone else's content with only a watermark added."]},
        {"type": "quiz", "q": "What did Mosseri say hashtags do on Instagram?", "options": ["Boost reach if you use the full 30", "Help people know what a post is about, but don't increase reach", "Decide whether a Reel goes viral", "Only matter on Stories"], "answer": 1, "explain": "Mosseri said hashtags don't increase reach but help describe and connect posts. Since December 2025 you can only use five anyway."},
        {"type": "takeaways", "items": ["Viewers can now choose topics — make yours obvious.", "Repeated reposting removes you from recommendations; there's no safe number.", "Five hashtags max; treat them as labels.", "Real, raw and sendable beats polished."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "These changes reward creators with a clear niche and a system. The premium module builds both.", "items": ["The 3–5 pillar split (with rough shares) that keeps one account on-topic without getting boring", "Four ways to make your topic obvious to Instagram's systems in the first seconds", "How to use Trial Reels to test a new pillar without confusing your followers", "The sends-per-1,000 formula for finding which format your audience forwards most"]},
        {"type": "sources", "items": [{"title": "Social Media Today – 'Your Algorithm' rolls out to all English-speaking users (Jan 2026)", "url": "https://www.socialmediatoday.com/news/instagram-rolls-out-algorithm-control-option-to-all-english-speaking-users/809524/"}, {"title": "Social Media Today – Instagram limits hashtags to five (Dec 2025)", "url": "https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/"}, {"title": "TechCrunch – Instagram restricts reach of content aggregators (Apr 2026)", "url": "https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/"}, {"title": "Om Malik – What Mosseri is really saying in his year-end memo", "url": "https://om.co/2026/01/01/what-is-instagrams-adam-mosseri-really-saying-in-his-year-end-memo/"}]},
      ]},
    ],
  },
  {
    id: 'tiktok', icon: '🎵', title: 'TikTok Growth Guide',
    blurb: "How the For You feed really works in 2026, and what pays Kenyan creators",
    lessons: [
      { id: "tt1", title: "Cracking the For You Page: What TikTok Actually Admits", minutes: 6, body: [
        {"type": "hook", "text": "TikTok has said in writing that your follower count is **not** a direct factor in what it recommends. A 300-follower account in Kisumu and a 300,000-follower celebrity start every video on the same rules."},
        {"type": "p", "text": "That line comes from TikTok's own explainer on how the For You feed works. It also says that having had **previous viral videos** is not a direct factor either. Big accounts get more views mainly because more people already engage with them, not because the system hands them a head start."},
        {"type": "p", "text": "So what does it actually look at? TikTok groups its signals into three buckets, and they are not weighted equally."},
        {"type": "table", "headers": ["Signal group", "Examples TikTok lists", "Weight"], "rows": [["How viewers interact", "Likes, shares, comments, follows, watching to the end, skipping, saying \"Not interested\"", "Highest: this is what you control"], ["Video information", "Captions, sounds, hashtags, the words people search", "Medium: helps TikTok know who to show it to"], ["Device and account settings", "Language, country, phone type", "Lower: TikTok says these get less weight because people don't choose them as preferences"]]},
        {"type": "h3", "text": "Strong signal vs weak signal"},
        {"type": "p", "text": "TikTok's example of a strong signal is whether someone **finishes watching a longer video** from beginning to end. Its example of a weak signal is whether the viewer and creator happen to be in the same country. A like is quick and cheap. Sitting through 70 seconds is a real vote."},
        {"type": "myth", "myth": "You need about 70% completion to go viral in 2026.", "truth": "TikTok has never published a completion target. Figures like 50% or 70% come from creator blogs and analysts guessing from their own accounts. The useful benchmark is **your own average**: if a video beats your usual 'watched full video' percentage, it is doing its job."},
        {"type": "insight", "label": "What most creators miss", "text": "TikTok deliberately mixes in videos from outside each person's usual interests so feeds don't become a bubble. That diversity is exactly why a stranger in Mombasa can see your Eldoret video with zero followers. But since June 2025, viewers can also use **Manage Topics** to turn whole topics down in their feed, and since November 2025 they can turn AI-generated content down. Your video has to win the people who haven't muted your category."},
        {"type": "h3", "text": "What this means for your next video"},
        {"type": "ul", "items": ["Open on the payoff. Your first second should show the result, the problem or the surprise, never a greeting or your shop sign.", "Cut every pause. Dead air is where people swipe, and a skip is a signal too.", "Earn the finish. If the last five seconds deliver the answer or the reveal, more people stay to the end.", "Say your topic out loud and put it on screen so the 'video information' bucket knows who the video is for."]},
        {"type": "action", "label": "Do this today", "items": ["Open your last 5 videos and write down the first thing a viewer sees in each.", "Find the one with the highest 'watched full video' figure. That number is your personal benchmark.", "Re-cut your weakest video so the very first frame shows the result.", "Check Settings > Content preferences on your own app to see the Manage Topics controls viewers now have."]},
        {"type": "quiz", "q": "According to TikTok itself, which of these is NOT a direct factor in For You recommendations?", "options": ["Whether viewers finish the video", "The account's follower count", "Shares and comments", "The sounds and captions used"], "answer": 1, "explain": "TikTok's own explainer says neither follower count nor past high-performing videos are direct factors. Viewer behaviour on this video, especially finishing it, matters far more."},
        {"type": "takeaways", "items": ["Follower count isn't a direct ranking factor; viewer behaviour on each video is.", "Finishing a longer video is one of the strongest signals TikTok names.", "There's no official 'viral completion rate'. Beat your own average.", "Viewers can now turn topics and AI content down, so you have to win real interest."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Knowing the signals is step one. The premium guide shows you how to read them on your own videos and engineer for them.", "items": ["The five numbers to check on every video, and the exact order that diagnoses a stalled post", "A copy-paste video log that turns ten posts into your own personal playbook", "Four loop techniques that earn genuine re-watches, with a 15–25 second script outline", "Why posting while your own followers sleep can sink a good video, and how to find your real posting window"]},
        {"type": "sources", "items": [{"title": "TikTok Newsroom: How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/"}, {"title": "TikTok Newsroom: More ways to discover new content (Manage Topics, June 2025)", "url": "https://newsroom.tiktok.com/more-ways-to-discover-new-content-and-creators-you-love?lang=en"}, {"title": "TechCrunch: TikTok lets you choose how much AI content you see (Nov 2025)", "url": "https://techcrunch.com/2025/11/18/tiktok-now-lets-you-choose-how-much-ai-generated-content-you-want-to-see/"}]},
      ]},
      { id: "tt2", title: "Views, Likes, Comments or Shares: Which Number Does What", minutes: 5, body: [
        {"type": "hook", "text": "Bought views can't raise your completion rate, because they don't watch your video. So before you spend a single shilling, know which number does which job."},
        {"type": "p", "text": "Views, likes, comments and shares are not interchangeable. Each one does two separate jobs: it tells **real people** something when they land on your video, and it tells **TikTok** something about how viewers reacted. Paid numbers only really help with the first job."},
        {"type": "table", "headers": ["Metric", "What a real viewer reads", "What TikTok says about it"], "rows": [["Views", "\"Other people found this worth watching\"", "View count is listed under video information, not as a strong interest signal"], ["Likes", "Quick approval, the cheapest signal", "An interaction signal, but quick to give"], ["Comments", "\"People are talking here\"", "An interaction signal; real replies also start conversations you can answer with video"], ["Shares", "\"Someone thought a friend needed this\"", "An interaction signal; TikTok has not published how much more it weighs"]]},
        {"type": "myth", "myth": "A share is worth exactly 3 likes (or 10, or 15) to the algorithm.", "truth": "TikTok confirms shares are one of the interactions it uses, but it has **never published weights** for any signal. Multipliers you see online are analysts' estimates from their own accounts. What is safe to say: a share is a stronger act of intent than a like, because someone put their name to it in front of a friend."},
        {"type": "h3", "text": "Comments: depth beats count"},
        {"type": "p", "text": "Twenty \"🔥🔥\" comments tell a visitor very little. Three comments asking \"Uko wapi?\" or \"How much for the medium size?\" tell them this account sells real things to real people. Those questions are also free content: reply to them with a video and you have your next post."},
        {"type": "insight", "label": "What most creators miss", "text": "TikTok's Creator Rewards Program, the one that pays per view in some countries, rewards 'audience engagement' and defines it as **likes, comments and shares**, alongside originality, play duration and search value. Notice what's missing: raw views on their own. Even TikTok's own payment formula treats views as the start, not the finish."},
        {"type": "h3", "text": "Where a boost fits honestly"},
        {"type": "ul", "items": ["Visible views and likes are **first impressions**. A new video sitting at 0 views looks untested; one with some activity looks worth a few seconds of a stranger's time.", "A boost cannot fix a weak hook. If people swipe in the first two seconds, more views just means more people swiping.", "TikTok's rules prohibit inauthentic engagement. Keep boosts small and gradual, put them only behind videos you're proud of, and never show bought numbers to a brand as organic results."]},
        {"type": "service", "label": "First impressions for your best video", "text": "If you have a video you're genuinely proud of, a small views or likes package gives the real people who find it a reason to stop and watch. Start small and pair it with a strong hook.", "platform": "tiktok", "subcat": "views", "cta": "See TikTok views packages"},
        {"type": "action", "label": "Do this today", "items": ["Pick your best video from the last month and read every comment. Note any that ask a question.", "Reply to the best question with a video reply.", "Pin one comment that answers your most common customer question (price, location, delivery).", "Write down which of your videos got shared most and what made it shareable."]},
        {"type": "quiz", "q": "Which of these has TikTok officially published?", "options": ["A share is worth 3x a like", "The exact weight of each engagement signal", "That likes, comments and shares count as 'audience engagement' in Creator Rewards", "A 70% completion target"], "answer": 2, "explain": "TikTok's Creator Rewards announcement names likes, comments and shares as audience engagement. It has never published signal weights or completion targets; those come from analysts."},
        {"type": "takeaways", "items": ["Each metric does two jobs: persuading humans and informing TikTok.", "Bought views help with first impressions, not completion or watch time.", "Signal 'multipliers' online are estimates, not TikTok figures.", "Turn real comment questions into your next videos."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Engagement follows retention. The premium guide shows you how to build videos people finish and replay.", "items": ["The seconds 0–5 rule: what to cut from your opening before anything else", "Why a 15-second video watched twice can beat a 60-second video watched halfway", "A loop script you can fill in for tips, recipes and before-and-afters", "How to compare each new video against your own baseline in 48 hours"]},
        {"type": "sources", "items": [{"title": "TikTok Newsroom: How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/"}, {"title": "TikTok Newsroom: Introducing the new Creator Rewards Program", "url": "https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program?lang=en"}]},
      ]},
      { id: "tt3", title: "Trends Bring Spikes, Search Brings Months", minutes: 5, body: [
        {"type": "hook", "text": "\"Search value\" isn't creator slang. It's TikTok's own term, and it's one of the four things TikTok's Creator Rewards Program uses to decide which videos are worth paying for."},
        {"type": "p", "text": "TikTok described search value as a metric based on **popular search terms**. In plain English: TikTok tracks whether your video answers things people actually type. That tells you where the platform is heading. Trends get you a spike; search gets you views for months."},
        {"type": "h3", "text": "Trends: borrow the format, keep your voice"},
        {"type": "p", "text": "The accounts that grow from trends don't copy them. They take the **format** (the sound, the transition, the joke structure) and fill it with their own niche. A trending \"things I'd never buy again\" sound becomes \"3 mitumba bales I'd never buy again\" for a Gikomba seller."},
        {"type": "table", "headers": ["Trend element", "Copy it?", "Make it yours by"], "rows": [["The sound or beat", "Yes, early in its life", "Speaking your own line over it, or using it under your own footage"], ["The joke or format", "Yes", "Swapping in a situation only your audience would get"], ["The exact script", "No", "Writing it for your niche: your prices, your area, your customers"], ["The look", "Partly", "Keeping your usual framing so viewers recognise you"]]},
        {"type": "h3", "text": "Search: the tool most creators never open"},
        {"type": "p", "text": "TikTok has a feature called **Creator Search Insights**. Type that phrase into the TikTok search bar (it's available in selected regions). It shows what people are searching for, and labels some topics **\"content gap\"**: things people search for often but that have relatively few videos answering them."},
        {"type": "insight", "label": "What most creators miss", "text": "A content gap is the closest thing TikTok gives you to a guaranteed audience. Someone is already typing the question; almost nobody has answered it. If Search Insights isn't available in your app, do the manual version: type your niche into the search bar and read the autocomplete suggestions. Each one is a real question from real people."},
        {"type": "myth", "myth": "Hashtags are how TikTok knows what your video is about.", "truth": "Hashtags help, but they are only one piece of 'video information'. Your caption, the words on screen and what you say out loud all help TikTok match the video to searches. A caption that says \"Sunday vibes\" tells search nothing. \"Pilau for 4 people under KES 600\" tells it everything."},
        {"type": "template", "label": "Search-first opener", "text": "Say in the first 2 seconds: \"[WHAT PEOPLE SEARCH] in [TOWN/AREA], here's [WHAT YOU'LL SHOW].\"\nOn-screen text: [WHAT PEOPLE SEARCH]\nCaption: [WHAT PEOPLE SEARCH] | [PRICE IN KES / TIME / RESULT]. [QUESTION FOR COMMENTS]?\nExample: \"Knotless braids price in Nairobi, here's what KES 3,500 gets you.\""},
        {"type": "ul", "items": ["Post a steady number of videos you can keep up for a month. Consistency you can sustain beats a burst of daily posts that burns you out.", "Keep one recognisable thing across videos: a catchphrase, a sign-off, a colour. Trends bring strangers; your signature makes them remember you."]},
        {"type": "action", "label": "Do this today", "items": ["Type \"Creator Search Insights\" into TikTok search and see if it opens for you.", "Type your niche plus your town into search and write down five autocomplete suggestions.", "Pick one current trend and write how you'd adapt it for your niche in one sentence.", "Rewrite your next caption using the search-first template."]},
        {"type": "quiz", "q": "In TikTok's Creator Search Insights, what does a \"content gap\" label mean?", "options": ["Your video has a gap in the audio", "A topic people search for often but few videos cover", "A trend that has already peaked", "A topic TikTok has banned"], "answer": 1, "explain": "TikTok defines content gap topics as ones searched often but answered by relatively few videos. That's demand waiting for supply, the easiest search traffic you'll ever get."},
        {"type": "takeaways", "items": ["'Search value' is an official TikTok metric in Creator Rewards.", "Copy a trend's format, never its script.", "Creator Search Insights flags 'content gap' topics with demand and few answers.", "Say, show and caption the exact phrase people search."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Search is the long tail of TikTok. The premium guide turns it into a weekly system.", "items": ["Three clever-vs-searchable caption rewrites for real Kenyan businesses", "A full week's content calendar and hook bank you can batch in one three-hour sitting", "How a home baker's traffic sources changed once she spoke her keyword in the first two seconds", "Why your own voice is a ranking asset even when you're using a trending sound"]},
        {"type": "sources", "items": [{"title": "TikTok Newsroom: Introducing the new Creator Rewards Program", "url": "https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program?lang=en"}, {"title": "TikTok Newsroom: Creator Search Insights", "url": "https://newsroom.tiktok.com/creator-search-insights?lang=en"}, {"title": "TikTok Newsroom: How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/"}]},
      ]},
      { id: "tt4", title: "What TikTok Really Pays Kenyans in 2026 (and Where a Boost Fits)", minutes: 6, body: [
        {"type": "hook", "text": "TikTok's Creator Rewards Program, the one that pays per view, is still **not open to Kenyan creators** as of late 2026. Yet Kenyan TikTokers earned over KES 45 million from brand deals in a single year. The money is real; it just comes from somewhere else."},
        {"type": "p", "text": "That changes the honest reason to grow a TikTok account in Kenya. You aren't chasing a per-view cheque. You're building an audience that brands, customers and LIVE viewers will pay attention to. Here's what actually pays Kenyan creators right now."},
        {"type": "table", "headers": ["Income route", "Open to Kenyan creators?", "Key rule"], "rows": [["LIVE Gifts", "Yes", "You must be 18+ to host a LIVE and 18+ to send gifts"], ["Video Gifts and subscriptions", "Yes, as reported in Sept 2026", "Eligibility set in-app; check Creator tools"], ["Brand deals", "Yes", "Brands check real engagement, not just follower count"], ["Creator Rewards (paid per view)", "No", "Elsewhere: 18+, 10,000 followers, 100,000 views in 30 days, videos over 1 minute"], ["TikTok Shop", "No", "Not launched in Kenya; sell via WhatsApp, M-Pesa Till, link in bio"]]},
        {"type": "stat", "value": "200+", "label": "Kenyan creators who earned over US$350,000 (about KES 45 million) from brand collaborations in TikTok for Business's first year in Kenya, to January 2026 (TikTok data via Business Daily)"},
        {"type": "h3", "text": "The tax bit nobody mentions"},
        {"type": "p", "text": "In September 2026, TikTok started asking Kenyan creators to fill in a tax form declaring whether they are Kenyan residents. Reported withholding rates are **5% for residents and 20% for non-residents**, in line with Kenya's withholding tax on digital content monetisation. A Nairobi creator who wrongly ticks non-resident could lose four times more. Start date and exactly which payouts are covered were still unclear at the time of reporting."},
        {"type": "myth", "myth": "Buying engagement gets you into TikTok's monetisation programmes faster.", "truth": "Creator Rewards isn't available in Kenya at all, and TikTok's rules prohibit inauthentic engagement. Bought numbers do nothing for eligibility and should **never** be presented to a brand as organic. What they can do is make a new video look worth a stranger's first few seconds."},
        {"type": "h3", "text": "Where a boost genuinely helps"},
        {"type": "ul", "items": ["**First impressions.** A brand-new video at zero looks untested. Some visible activity on a video you're proud of makes real viewers more willing to stop.", "**Profile credibility.** When a potential customer from WhatsApp clicks through to your TikTok, a profile with life on it reassures them you're active.", "**Not a replacement.** Brands increasingly ask for analytics screenshots. Your watch time and audience location can't be bought, so keep the real work going."]},
        {"type": "insight", "label": "What brands actually check", "text": "Brands paying Kenyan creators look at engagement rate and audience location in your analytics, not just your follower count. A creator with 8,000 followers who are mostly in Kenya and comment in Sheng can be worth more to a Nairobi brand than 80,000 followers spread around the world."},
        {"type": "service", "label": "Give a new video a credible start", "text": "For a video you're proud of, a small, gradual likes or views order gives real visitors social proof. Use it for first impressions only, keep it modest, and keep your organic numbers separate when you talk to brands.", "platform": "tiktok", "subcat": "likes", "cta": "See TikTok likes packages"},
        {"type": "action", "label": "Do this today", "items": ["Open Creator tools on your app and check which monetisation features show as available to you.", "If you've received TikTok's tax form, confirm you've ticked the correct residency status.", "Screenshot your audience location and engagement from Analytics; this is your brand-pitch evidence.", "List three local brands whose customers match your followers."]},
        {"type": "quiz", "q": "A Kenyan creator with 15,000 followers wants per-view pay from TikTok. What's true in late 2026?", "options": ["They qualify once they hit 100,000 views in 30 days", "Creator Rewards isn't open to Kenya-based creators, so income comes from LIVE gifts, brand deals and selling", "Buying views gets them in automatically", "They need a Business account to qualify"], "answer": 1, "explain": "Creator Rewards is limited to certain countries and Kenya isn't one of them. Kenyan creators earn through LIVE Gifts, Video Gifts, subscriptions, brand deals and selling their own products."},
        {"type": "takeaways", "items": ["Creator Rewards and TikTok Shop are not available in Kenya yet.", "Kenyan creators earned over KES 45 million from brand deals in one year.", "Tick the right residency on TikTok's tax form: 5% vs 20% withholding.", "Boosts are for first impressions, never for faking results to brands."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Brand deals and sales follow content that holds attention. The premium guide covers what comes next.", "items": ["A 90-second explainer structure for when longer videos earn their length", "How to sell from video in Kenya without TikTok Shop: price, proof and M-Pesa steps in a pinned comment", "Which content lengths to test for tips, tutorials, stories and product demos", "Why watermarked reposts from other apps get down-ranked, and how to repurpose safely"]},
        {"type": "sources", "items": [{"title": "Citizen Digital: Kenyan TikTokers face earning deductions (Sept 2026)", "url": "https://citizen.digital/article/kenyan-tiktokers-face-earning-deductions-as-pltaform-requests-tax-information-n390354"}, {"title": "Business Daily: Kenyan TikTok creators earn Sh45m in first year", "url": "https://www.businessdailyafrica.com/bd/corporate/technology/kenyan-tiktok-creators-earn-sh45m-in-first-year-of-monetisation-5347160"}, {"title": "TikTok Newsroom: Introducing the new Creator Rewards Program", "url": "https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program?lang=en"}, {"title": "TikTok Newsroom: Enhancing the LIVE community experience (18+ to host)", "url": "https://newsroom.tiktok.com/enhancing-the-live-community-experience?lang=en"}]},
      ]},
      { id: "tt5", title: "Your Video's First Hour: Facts, Estimates and Myths", minutes: 6, body: [
        {"type": "hook", "text": "The famous \"200-view jail\" is not a punishment, and TikTok has never published the numbers behind it. Most of the precise figures you've seen online are guesses."},
        {"type": "p", "text": "Here's what's actually known about your video's first hour, what's only estimated, and what you can do about each."},
        {"type": "table", "headers": ["Claim", "Status", "What to do with it"], "rows": [["New videos are shown to a small batch of viewers first, then widened if they respond well", "Widely observed by creators and analysts; consistent with how TikTok describes using viewer interactions", "Treat the first batch as your audition"], ["The first batch is \"200–500 people\"", "Analyst estimate, not published by TikTok", "Don't obsess over the exact number"], ["You need \"35% completion and 1.5% shares\" to move up", "Analyst estimate, not published by TikTok", "Beat your own baseline instead"], ["Your followers see it before strangers", "Creator observation, not confirmed by TikTok", "Post when your followers are online, just in case"], ["Follower count is a direct ranking factor", "False, per TikTok", "Small accounts can win on any video"]]},
        {"type": "h3", "text": "Why videos stall at a few hundred views"},
        {"type": "p", "text": "Usually one of three things: the first batch swiped away early, the video was flagged and limited, or it was posted when nobody who cares about that topic was online. Only one of those is about the algorithm \"not liking you\"."},
        {"type": "stat", "value": "96.3%", "label": "Share of guideline-breaking videos in Kenya that TikTok removed within 24 hours of posting in Q1 2026; 884,591 Kenyan videos were removed that quarter (TikTok data via Citizen Digital)"},
        {"type": "insight", "label": "The first-hour cause nobody checks", "text": "Moderation now happens mostly in the first hours, and almost all of it is automatic: 99.7% of Kenyan removals in Q1 2026 happened before anyone reported the video. TikTok also removed 48,739 suspected under-13 accounts in Kenya that quarter. If a video dies instantly, check your notifications and the video's status for a restriction before blaming your hook. Since September 2025, TikTok's guidelines also spell out that LIVE hosts are responsible for everything in their stream, including third-party tools."},
        {"type": "myth", "myth": "TikTok's US ownership change rewired the algorithm for everyone.", "truth": "In January 2026 a new US joint venture led by Oracle, Silver Lake and MGX took over TikTok's US operations, and the recommendation algorithm is being **retrained on US user data for US users**. Nothing announced changes how the For You feed works in Kenya. The practical effect: US trends may drift further from Kenyan ones, so trust your local Analytics over American 'algorithm update' videos."},
        {"type": "h3", "text": "Your first-hour checklist"},
        {"type": "ol", "items": ["Post when your Analytics show your followers are most active, not at a generic 'best time'.", "Stay on the app for the first 30 minutes and reply to early comments. Real replies keep conversations going.", "Share it to your WhatsApp status and one relevant group where people genuinely care about the topic.", "After 2 hours, check the video's status for any restriction notice.", "After 48 hours, compare 'watched full video' to your baseline and log what you learned."]},
        {"type": "action", "label": "Do this today", "items": ["Find your followers' most active hours in Analytics and write down your top two windows.", "Check your account status page for any warnings.", "Pick your next video and schedule it for your best window.", "Start a simple note: date, hook, 'watched full video' %, what you learned."]},
        {"type": "quiz", "q": "Your video stalls at 180 views within an hour. Based on Kenyan moderation data, what should you check FIRST?", "options": ["Buy more followers", "Whether the video has a restriction or violation notice", "Delete your account and start fresh", "Post the same video again immediately"], "answer": 1, "explain": "In Q1 2026, 96.3% of violating Kenyan videos were removed within 24 hours, almost all automatically. A fast stall can be a moderation limit, so check the video's status before re-editing or reposting."},
        {"type": "takeaways", "items": ["The test-batch idea is widely observed, but the exact numbers are estimates.", "Follower count isn't a direct ranking factor; viewer behaviour is.", "Fast stalls can be moderation: check video status first.", "The 2026 US algorithm retrain is for US users, not Kenya."]},
        {"type": "locked", "module": "tiktok_pro", "text": "This lesson explains the first hour. The premium guide teaches you to pass it consistently.", "items": ["The 'Diagnostic checklist' that tells you whether a stalled video failed on hook, pacing or timing", "How to find the exact second people leave on your retention graph and re-cut just that part", "The follower-first testing shift explained, and the posting-window method that follows from it", "A real Kisumu shop's three-video comparison: same topic, different first second"]},
        {"type": "sources", "items": [{"title": "TikTok Newsroom: How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/"}, {"title": "Citizen Digital: TikTok removes 884,591 videos in Kenya (Q1 2026)", "url": "https://citizen.digital/article/tiktok-removes-884591-videos-in-kenya-over-community-guideline-violations-n386956"}, {"title": "Times of Israel/AFP: TikTok finalises US entity, algorithm to be retrained", "url": "https://www.timesofisrael.com/tiktok-finalizes-deal-to-create-us-entity-and-retrain-algorithm-avoiding-ban/"}, {"title": "TechCrunch: TikTok's new Community Guidelines (effective 13 Sept 2025)", "url": "https://techcrunch.com/2025/08/15/tiktoks-new-guidelines-add-subtle-changes-for-live-creators-ai-content-and-more/"}]},
      ]},
    ],
  },
  {
    id: 'yt', icon: '▶️', title: 'YouTube Growth Guide',
    blurb: "Subscribers, satisfaction & monetisation: the 2026 rules",
    lessons: [
      { id: "yt1", title: "Your Subscribers Aren't Your Launch Pad (Here's What Is)", minutes: 6, body: [
        {"type": "hook", "text": "YouTube's own head of growth says that even on your best videos, about 90% of the time your subscribers are not choosing to watch. The \"get subs first, views will follow\" plan is backwards."},
        {"type": "p", "text": "In a September 2026 Creator Insider interview, Todd Beaupré, YouTube's senior director of growth and discovery, said a typical channel's subscribers click on **10% or less** of its uploads. He also said the subscribe action \"isn't as strong as a lot of people think\"."},
        {"type": "stat", "value": "≤10%", "label": "Typical click-through from subscribers on a new upload, according to YouTube's Todd Beaupré on Creator Insider (2026)"},
        {"type": "p", "text": "That changes how you should think about growth. A new upload isn't \"sent\" to your subscribers. Beaupré describes the system as **pulling** videos towards each viewer it thinks will enjoy them, not pushing your uploads out. Even in the first hour, \"it's not only your subscribers who will see it\"."},
        {"type": "myth", "myth": "If I get 5,000 subscribers, every upload will automatically get 5,000 views.", "truth": "Subscribers are people who once liked one video. Each new video still has to win them over again, one by one. YouTube says the number one place subscribers watch your videos is the watch page (the Up Next list beside other videos), not the subscriptions feed."},
        {"type": "h3", "text": "The right order: viewers, then videos that keep them, then subscribers"},
        {"type": "ol", "items": ["**Make videos for strangers.** Picture someone in Kisumu who has never heard of you. Would the title make sense to them? If it says \"Part 3\" or \"Vlog #12\", it won't.", "**Earn the second video.** A viewer who watches one video and then another of yours is worth more than a new subscriber who never comes back. End screens and playlists do this job.", "**Let subscribers follow.** People subscribe after two or three good experiences, not before. A subscriber count that grows with your views looks real to viewers and sponsors."]},
        {"type": "table", "headers": ["Where subscribers actually find you", "What to do about it"], "rows": [["Watch page (Up Next / suggested)", "Make videos on the same topics as your best ones so YouTube can place them side by side"], ["Home feed", "Strong title + thumbnail for people who don't know you yet"], ["Subscriptions feed", "Useful, but small; don't plan around it"], ["Search", "Use the exact words people type (the premium module shows how)"]]},
        {"type": "insight", "label": "What most creators miss", "text": "Beaupré also said one viewer had been recommended a creator's uploads **19 times** without ever noticing them. Being shown isn't the same as being chosen. Packaging (title + thumbnail) is what turns an impression into a view, which is why the next lesson matters so much."},
        {"type": "template", "label": "The stranger test (run before every upload)", "text": "Title: [YOUR TITLE]\n1. Would someone who has never seen my channel understand it? [YES/NO]\n2. Does it promise one clear result or story? [YES/NO]\n3. Which of my older videos would a viewer watch next? [VIDEO NAME]\n4. Is that video linked in the end screen? [YES/NO]"},
        {"type": "action", "label": "Do this today", "items": ["Open YouTube Studio > Analytics > Content and check how many views on your last video came from subscribers vs non-subscribers.", "Rename one old video whose title only makes sense to existing fans.", "Add an end screen to your top 3 videos pointing to the most related video you have.", "Run the stranger test on your next title before you upload."]},
        {"type": "quiz", "q": "According to YouTube's growth director, where do viewers most often watch videos from channels they're subscribed to?", "options": ["The subscriptions feed", "Notifications", "The watch page (Up Next / suggested)", "The channel's home page"], "answer": 2, "explain": "Beaupré said the number one place is the watch page. That's why making videos that sit naturally next to your best ones matters more than chasing notifications."},
        {"type": "takeaways", "items": ["Subscribers click on roughly 10% or less of uploads; each video has to earn its views.", "YouTube pulls videos to viewers who'll enjoy them; it doesn't push uploads to your subscriber list.", "Get viewers first, then a second view, then subscribers follow."]},
        {"type": "locked", "module": "yt_seo", "text": "YouTube SEO Mastery turns \"make it for strangers\" into a repeatable system.", "items": ["The free autocomplete trick (with one extra letter) that reveals the exact phrases Kenyans type", "Four title formulas matched to search intent, with Kenyan examples", "How a Kisumu garage re-packaged the same video to match a real search", "The \"bridge line\" script that sends viewers into your next video"]},
        {"type": "sources", "items": [{"title": "PPC Land: Subscribers skip 90% of uploads, YouTube director says (Creator Insider)", "url": "https://ppc.land/subscribers-skip-90-of-uploads-in-their-feed-youtube-director-says/"}, {"title": "Search Engine Journal: How YouTube's recommendation system works", "url": "https://www.searchenginejournal.com/how-youtubes-recommendation-system-works-in-2025/538379/"}]},
      ]},
      { id: "yt2", title: "Titles, Thumbnails & the Test That Doesn't Pick by Clicks", minutes: 6, body: [
        {"type": "hook", "text": "YouTube has a built-in A/B test for thumbnails and titles. Most creators assume it crowns the version with the most clicks. It doesn't. It picks the one with the most **watch time per impression**."},
        {"type": "p", "text": "The tool is called **Test & Compare** in YouTube Studio. You can upload up to three thumbnails (and, since December 2025, three titles or title + thumbnail pairs) on a long video. YouTube shows them to viewers at the same time for up to two weeks, then labels the result Winner, Performed Same, or Inconclusive."},
        {"type": "stat", "value": "3", "label": "Variants you can test at once on a long-form video, for up to 2 weeks (YouTube Studio Test & Compare, per PPC Land)"},
        {"type": "myth", "myth": "The best thumbnail is the one that gets the highest click-through rate (CTR).", "truth": "A thumbnail that gets lots of clicks but disappoints viewers loses to a calmer one that people actually watch. YouTube judges by watch time per impression: clicks multiplied by how long people stay."},
        {"type": "h3", "text": "Why YouTube measures it this way"},
        {"type": "p", "text": "YouTube says it tries to understand how viewers feel about a video, not just what they click. Beaupré lists \"likes, dislikes, these survey responses\" among the signals. Those little \"How was this video?\" surveys you sometimes see are part of it. A clickbait title fails that test even when it wins the click."},
        {"type": "h3", "text": "Packaging that wins the click and keeps the viewer"},
        {"type": "ul", "items": ["**The promise must show up fast.** Whatever the thumbnail shows (the finished cake, the KSh amount, the before/after), show it or name it in the first 30 seconds.", "**Title and thumbnail should do different jobs.** Title = what it's about. Thumbnail = why it's interesting. Don't repeat the title in the image.", "**Design for a small phone screen.** Most Kenyan viewers watch on mobile. One face or one object, big and clear.", "**Don't fake the emotion.** A shocked face over a calm tutorial is the kind of mismatch the satisfaction signals pick up."]},
        {"type": "callout", "label": "Example: a Gikomba furniture maker", "text": "Thumbnail A: a red arrow and \"SHOCKING PRICE!\". Thumbnail B: the finished sofa beside a sign reading \"KSh 28,000\". A might get more clicks from curious people. B attracts people who actually want a sofa, so they watch longer. Under Test & Compare, B can win even with fewer clicks."},
        {"type": "template", "label": "Three-variant test plan", "text": "Video: [TITLE]\nVariant 1 (result first): [THE FINISHED RESULT, BIG] + [2-3 WORDS]\nVariant 2 (face + emotion): [YOUR FACE, REAL REACTION] + [THE PROBLEM]\nVariant 3 (number/price): [A REAL NUMBER: KSh, DAYS, STEPS]\nWhat the first 30 seconds shows: [MUST MATCH ALL THREE]"},
        {"type": "action", "label": "Do this today", "items": ["In YouTube Studio, open your next long video's details and look for \"Test & Compare\" under the thumbnail.", "Make three genuinely different thumbnails using the plan above, not three colour versions of the same one.", "Check your best video's first 30 seconds: does it deliver what the thumbnail shows?", "Leave the test running for the full period; don't swap it after a day."]},
        {"type": "quiz", "q": "You run Test & Compare. Thumbnail A has the highest click-through rate. Which one does YouTube pick as the winner?", "options": ["Always A, because it got the most clicks", "The one with the highest watch time per impression", "The one with the most likes", "The one you uploaded first"], "answer": 1, "explain": "YouTube picks by watch time per impression. A high-CTR thumbnail that disappoints viewers can lose. The first upload only becomes the default if there's no clear winner."},
        {"type": "takeaways", "items": ["Test & Compare lets you try up to 3 thumbnails or titles and picks by watch time, not clicks.", "YouTube uses likes, dislikes and viewer surveys to judge satisfaction.", "Whatever the packaging promises must appear in the first 30 seconds."]},
        {"type": "locked", "module": "yt_seo", "text": "Lesson 1 of YouTube SEO Mastery is a full title and thumbnail workshop.", "items": ["The \"matchbox test\" for checking a thumbnail at real phone size", "Why your main search phrase belongs in the first 50–60 characters", "A fill-in title and thumbnail worksheet you can reuse for every upload", "How to read a retention graph \"like a mechanic\" to find where packaging and content don't match"]},
        {"type": "sources", "items": [{"title": "PPC Land: YouTube expands A/B testing to titles alongside thumbnails", "url": "https://ppc.land/youtube-expands-a-b-testing-to-include-titles-alongside-thumbnails/"}, {"title": "Search Engine Journal: How YouTube's recommendation system works", "url": "https://www.searchenginejournal.com/how-youtubes-recommendation-system-works-in-2025/538379/"}]},
      ]},
      { id: "yt3", title: "Monetisation in Kenya: The Real Numbers & the New Rules", minutes: 7, body: [
        {"type": "hook", "text": "In Kenya you can start earning from YouTube at **500 subscribers**, before any ad money. And from October 2026, Google holds your payouts until you add a KRA PIN."},
        {"type": "p", "text": "YouTube has two monetisation levels, and Kenya is on YouTube's official list for the lower one. Most people only know the 1,000-subscriber number, so they skip the first step."},
        {"type": "table", "headers": ["Level", "You need", "What you unlock"], "rows": [["Lower tier (fan funding)", "500 subs + 3 public uploads in 90 days + either 3,000 watch hours (12 months) or 3M Shorts views (90 days)", "Channel memberships, Super Thanks, Super Chat & Stickers, Shopping"], ["Full YPP", "1,000 subs + either 4,000 public watch hours (12 months) or 10M Shorts views (90 days)", "Ad revenue share + YouTube Premium revenue"]]},
        {"type": "callout", "label": "The Shorts view trap", "text": "Since 31 March 2025, the view count on a Short counts every play and replay. YouTube says YPP eligibility and earnings are still based on **engaged views**, the old, stricter count. Find it in Analytics > Advanced mode. Your \"10M\" progress is lower than your public counter."},
        {"type": "h3", "text": "What ad money actually looks like here"},
        {"type": "p", "text": "Ad rates depend largely on where viewers are and what advertisers pay to reach them. Kenyan YouTuber Thee Pluto has said 1 million views in Kenya pays around **KSh 100,000** on average, versus over KSh 1 million for US views. That's one creator's figure, not an official rate, but it's a useful reality check: roughly KSh 100 per 1,000 local views."},
        {"type": "stat", "value": "5%", "label": "Withheld by Google from Kenyan creators' YouTube earnings from September 2026; payouts freeze without a verified KRA PIN in AdSense (Techweez, Business Daily)"},
        {"type": "h3", "text": "The two policies that cost channels their money"},
        {"type": "ul", "items": ["**Inauthentic content (renamed July 2025).** Mass-produced or repetitive videos aren't monetisable, including \"AI-generated content made with generic or unoriginal templates giving the impression of mass production\". Using AI to edit scripts is explicitly fine.", "**Unsatisfying or off-putting content.** YouTube's monetisation policy now also lists content that \"relies heavily on emotionally manipulative formulas\".", "**Reused content.** Compilations with little narrative or silent reactions don't qualify. Reactions where you actually comment do."]},
        {"type": "myth", "myth": "Since May 2026, YouTube punishes AI videos with lower reach.", "truth": "YouTube now detects significant photorealistic AI and adds a label automatically if you didn't. But it says \"a disclosure label alone does not change how a video is recommended or whether it's eligible to earn money\". What gets channels in trouble is repeatedly failing to disclose, or mass-produced content."},
        {"type": "action", "label": "Do this today", "items": ["Open YouTube Studio > Earn and note which tier you're closest to.", "If you're near 500 subs, plan what you'd offer as a channel membership perk.", "Check AdSense > Payments > Settings for the KRA PIN field and make sure your name matches your KRA records exactly.", "For Shorts creators, check Engaged views in Advanced mode, not the public counter."]},
        {"type": "quiz", "q": "Your Shorts show 12 million views in the last 90 days. Have you hit the 10M Shorts threshold for YPP?", "options": ["Yes, 12M is above 10M", "Not necessarily; YPP counts engaged views, which are lower", "Only if they're from Kenya", "Yes, but only after 12 months"], "answer": 1, "explain": "Since March 2025 the public counter includes every play and replay. YouTube says eligibility still uses engaged views. Check those in Analytics > Advanced mode."},
        {"type": "takeaways", "items": ["Kenya qualifies for the 500-subscriber fan-funding tier; ad revenue needs 1,000 subs.", "Shorts thresholds use engaged views, not the public counter.", "Google withholds 5% from Kenyan creators and needs your KRA PIN to pay you.", "Mass-produced and emotionally manipulative content is what loses monetisation, not AI itself."]},
        {"type": "locked", "module": "yt_seo", "text": "YouTube SEO Mastery's final lesson is a full pre-monetisation audit.", "items": ["A six-point pre-monetisation checklist to fill in before you apply", "The playlist naming formula that turns playlists into search results", "Which uploads need an altered-content disclosure, checked video by video", "Where mid-roll ads help and where they just make people leave"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Overview of the expanded YouTube Partner Program (country list incl. Kenya)", "url": "https://support.google.com/youtube/answer/13429240?hl=en"}, {"title": "YouTube Help: YouTube Partner Program overview & eligibility", "url": "https://support.google.com/youtube/answer/72851?hl=en"}, {"title": "YouTube Help: Channel monetisation policies (inauthentic & reused content)", "url": "https://support.google.com/youtube/answer/1311392?hl=en"}, {"title": "Techweez: Google to withhold 5% of Kenyan YouTube earnings, KRA PIN required", "url": "https://techweez.com/2026/08/31/youtube-earnings-tax-kenya-5-percent-withholding/"}]},
      ]},
      { id: "yt4", title: "Seeding a New Upload: What Helps, What Never Counts", minutes: 6, body: [
        {"type": "hook", "text": "YouTube's own policy says artificial traffic \"will not be counted on YouTube\". So no bought view, hour or subscriber can ever move you closer to monetisation. Seeding still matters; you just need to know what it's for."},
        {"type": "p", "text": "A new video's first viewers matter because they're the first signal of who it's for. If the people watching early enjoy it and watch more, YouTube has a better idea who else to show it to. The question is where those first viewers come from."},
        {"type": "table", "headers": ["Seeding method", "Counts toward YPP?", "Main risk / cost"], "rows": [["Share to WhatsApp groups and status where people genuinely care about the topic", "Yes, real viewers", "Data cost for viewers; spamming groups annoys people"], ["Community post / Short pointing to the new video", "Yes", "Time"], ["End screens on older videos linking to the new one", "Yes", "None; most channels just skip it"], ["Collaboration with a creator in your niche", "Yes", "Need to offer real value back"], ["Bought views, likes or subscribers", "No; artificial traffic is not counted", "Against YouTube's fake engagement policy: removal, strikes, possible termination"]]},
        {"type": "myth", "myth": "You can buy 4,000 watch hours and get monetised.", "truth": "YouTube removes or ignores traffic it finds artificial, and promoting or showing off view-buying is itself a violation. Three strikes in 90 days can end a channel. Monetisation needs real viewers."},
        {"type": "h3", "text": "The WhatsApp seeding that actually works"},
        {"type": "p", "text": "Don't drop a link and run. Send it to the one group where the topic genuinely helps, with a line that says why. A Kisumu baker sharing \"How to stop cake burning in a sufuria\" in her customers' group gets real viewers who watch to the end. That's the signal you want."},
        {"type": "template", "label": "WhatsApp share message", "text": "Habari [GROUP NAME]! Many of you asked about [PROBLEM]. I made a short video showing [RESULT] in [TIME], e.g. under 6 minutes. The trick is at [TIMESTAMP]. [LINK]\nIf it helps, tell me in the comments what you want next."},
        {"type": "h3", "text": "Where a growth service fits, honestly"},
        {"type": "p", "text": "A brand-new video with zero likes can look abandoned to the first humans who find it. Some creators use a small package as **first-impression social proof** on a video they're proud of. Be clear-eyed: it's against YouTube's rules on inauthentic engagement, it never counts toward YPP, and it isn't risk-free. Never present those numbers to a brand as organic."},
        {"type": "service", "label": "First-impression social proof", "text": "For a video you're genuinely proud of, a small likes or views package can stop it looking empty to its first real visitors. It won't count toward monetisation and isn't risk-free under YouTube's rules, so keep it small and judge the video by real comments and returning viewers.", "platform": "youtube", "subcat": "likes", "cta": "See YouTube packages"},
        {"type": "action", "label": "Do this today", "items": ["Add end screens to your 5 most-viewed videos pointing to your newest one.", "Pick one WhatsApp group where your next video genuinely helps; write the share message now.", "Post a Short or community post teasing your next long video's best moment.", "Write down your real (engaged) views and watch hours so you track progress honestly."]},
        {"type": "quiz", "q": "What does YouTube's fake engagement policy say happens to traffic it finds artificial?", "options": ["It counts, but at half value", "It counts toward watch hours but not subscribers", "It is not counted, and can lead to strikes", "It is only counted after 90 days"], "answer": 2, "explain": "YouTube says artificial traffic \"will not be counted\" and can lead to strikes. That's why real seeding (groups, end screens, Shorts, collabs) is the only path to YPP."},
        {"type": "takeaways", "items": ["Early viewers matter because they tell YouTube who the video is for.", "Seed with real people: targeted WhatsApp shares, end screens, Shorts, collabs.", "Bought numbers are social proof at best, never progress to monetisation, and carry policy risk."]},
        {"type": "locked", "module": "yt_seo", "text": "YouTube SEO Mastery shows how to make every video seed the next one.", "items": ["A step-by-step Shorts funnel that links a Short to your long video", "The end-screen \"bridge line\" that gets viewers to click the next video", "Description chapters that YouTube can show in search", "How to check, two weeks later, how many views came from your own channel's pages"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Fake engagement policy", "url": "https://support.google.com/youtube/answer/3399767?hl=en"}, {"title": "PPC Land: Subscribers skip 90% of uploads, YouTube director says (Creator Insider)", "url": "https://ppc.land/subscribers-skip-90-of-uploads-in-their-feed-youtube-director-says/"}]},
      ]},
      { id: "yt5", title: "Satisfaction, Shorts & the 2026 Rulebook", minutes: 6, body: [
        {"type": "hook", "text": "Shorts can now be up to 3 minutes long, but if a Short over 1 minute gets **any** copyright claim, YouTube blocks it worldwide. Under 1 minute, the same claim doesn't block it."},
        {"type": "p", "text": "Since 15 October 2024, square or vertical videos up to three minutes upload as Shorts. The catch is in YouTube's help page: Shorts longer than one minute with an active Content ID claim \"are blocked globally\". They can't be watched, recommended or monetised until the claim is resolved. That one song from the radio can kill a 90-second Short."},
        {"type": "table", "headers": ["Your Short", "Copyright claim?", "Result"], "rows": [["Under 1 minute", "Yes", "Not blocked by this rule (normal claim terms apply)"], ["1–3 minutes", "Yes, any type", "Blocked globally until the claim is resolved"], ["1–3 minutes", "Music from YouTube Audio Library", "Royalty-free library music won't trigger Content ID"]]},
        {"type": "h3", "text": "Satisfaction: the scoreboard you can't see"},
        {"type": "p", "text": "Beaupré: \"No metric on its own is a good indicator of value.\" YouTube mixes watch time with likes, dislikes, shares and viewer surveys to estimate whether people were glad they watched. A tight 5-minute video that answers the question beats a 12-minute one padded to look long."},
        {"type": "myth", "myth": "Longer videos always win because they collect more watch time.", "truth": "Watch time still matters, but YouTube is also asking whether the viewer felt the time was well spent. Padding to hit a length usually shows up as a dip in retention and weaker survey answers."},
        {"type": "h3", "text": "Three 2026 facts most Kenyan creators haven't heard"},
        {"type": "ul", "items": ["**Hype isn't here yet.** The Hype button lets fans push videos from channels with 500–500,000 subscribers up a leaderboard. When it rolled out to 39 countries in August 2025, Africa wasn't included. Check your Studio before planning around it.", "**The Shorts view count changed.** Public views count every play since March 2025; engaged views (people who chose to keep watching) are what YouTube uses for YPP and earnings.", "**\"Unsatisfying\" is now a monetisation category.** Content that \"relies heavily on emotionally manipulative formulas\" can lose ad eligibility, even if it gets views."]},
        {"type": "insight", "label": "What most creators miss", "text": "Your rewatch spikes are free ideas. In the retention graph, a bump upward means people dragged back to watch a moment again. That moment, under 60 seconds and with your own or library audio, is your next Short."},
        {"type": "action", "label": "Do this today", "items": ["List any Shorts over 60 seconds that use commercial music; swap the audio or trim under a minute.", "Open retention on your best long video and find the biggest upward bump.", "Cut that moment into a Short under 60 seconds.", "Cut one padded section from your next long video before you upload."]},
        {"type": "quiz", "q": "Your 2-minute Short uses a popular song and gets a Content ID claim. What happens?", "options": ["It plays, but the label earns the money", "It's blocked globally until the claim is resolved", "Only Kenyan viewers are blocked", "Nothing; Shorts are exempt from Content ID"], "answer": 1, "explain": "YouTube's help page says Shorts over one minute with an active claim of any type are blocked globally. Under a minute, this rule doesn't apply."},
        {"type": "takeaways", "items": ["Shorts can be 3 minutes, but over 1 minute any copyright claim blocks them worldwide.", "YouTube weighs satisfaction (likes, dislikes, surveys), not just minutes watched.", "Hype hasn't reached Africa; engaged views, not the public counter, decide Shorts money."]},
        {"type": "locked", "module": "yt_seo", "text": "YouTube SEO Mastery has a full lesson on each of these tracks.", "items": ["A retention-graph table: four shapes, what each means and the exact fix", "The first-30-seconds script that stops early drop-off", "Shorts SEO as its own track: title, on-screen text and spoken line working together", "The viewed-vs-swiped number to track after 48 hours, and what to compare it against"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Understand three-minute YouTube Shorts", "url": "https://support.google.com/youtube/answer/15424877?hl=en"}, {"title": "PPC Land: Subscribers skip 90% of uploads, YouTube director says (Creator Insider)", "url": "https://ppc.land/subscribers-skip-90-of-uploads-in-their-feed-youtube-director-says/"}, {"title": "YouTube Help: Channel monetisation policies (inauthentic & reused content)", "url": "https://support.google.com/youtube/answer/1311392?hl=en"}, {"title": "Techweez: Africa left behind as YouTube expands Hype", "url": "https://techweez.com/2025/08/28/youtube-hype-feature-africa-misses-out/"}]},
      ]},
    ],
  },
  {
    id: 'other', icon: '👥', title: 'Facebook, X & Telegram',
    blurb: "Facebook, X and Telegram — what actually grows and pays in 2026",
    lessons: [
      { id: "fb1", title: "Facebook Page Growth in 2026: Why Original Beats Everything", minutes: 6, body: [
        {"type": "hook", "text": "In the second half of 2025, views of **original** Reels on Facebook roughly doubled — while pages built on reposted clips started losing reach and pay. The copy-paste era of Kenyan Facebook is ending."},
        {"type": "p", "text": "Facebook is still the widest net you can cast in Kenya. DataReportal's Digital 2026 report puts Facebook's ad reach at about 17 million Kenyans — more than four times Instagram's. But how that audience gets reached changed a lot in the last 18 months."},
        {"type": "stat", "value": "17.0M", "label": "Kenyans reachable with Facebook ads in late 2025, vs 3.95M on Instagram (DataReportal, Digital 2026: Kenya)"},
        {"type": "h3", "text": "What Facebook now means by \"original\""},
        {"type": "p", "text": "In March 2026 Facebook spelled it out: original content is **filmed or produced directly by you**. Remixes count only when you add something genuinely new — fresh information, analysis, a real storyline. Duplicates or \"minor edits to another creator's post\" are treated as unoriginal and pushed down in feeds."},
        {"type": "myth", "myth": "If I trim the clip, add music and write my own caption, it becomes my content.", "truth": "Kenyan reporting in July 2026 put it bluntly: trimming, adding music or changing a caption is \"increasingly unlikely to qualify as original\". Many pages asking \"mbona earnings zimeshuka?\" were living on recycled clips."},
        {"type": "h3", "text": "Every video is now a Reel"},
        {"type": "p", "text": "Since June 2025 Meta has been treating all new Facebook videos as Reels, with no length or format limits. So a 4-minute explainer from a Nairobi mechanic and a 15-second mitumba try-on now compete in the same system. That system decides fast, so the first 2–3 seconds have to earn the rest."},
        {"type": "insight", "label": "What most page owners miss", "text": "Facebook's reach in Kenya is so big that **shares** to WhatsApp and Facebook groups often do more than likes. A post someone forwards to their chama group reaches people who don't follow you — and they arrive already trusting the person who sent it. Make posts people want to forward: prices, how-tos, local news-you-can-use."},
        {"type": "table", "headers": ["Old habit", "What works in 2026"], "rows": [["Reposting viral clips from TikTok", "Filming your own version — even on a phone, even unpolished"], ["Landscape video with a slow intro", "Vertical, first frame shows the result or the problem"], ["\"Like if you agree, share if you care\"", "A real question people want to answer in comments"], ["Posting only on the Page", "Posting, then sharing into 2–3 relevant groups as a member, not a spammer"]]},
        {"type": "template", "label": "Reel hook + caption (Kenyan business page)", "text": "ON-SCREEN (first 2 sec): \"Usinunue [product] kabla ujue hii\" / \"Don't buy [product] before you know this\"\nVOICE: Show the mistake, then the fix, in under 30 seconds.\nCAPTION: [One-line lesson]. We're in [area] — price list on WhatsApp: [wa.me link]\nQUESTION: Which one would you pick, A or B?"},
        {"type": "action", "label": "Do this today", "items": ["Scroll your last 20 posts and mark which ones you filmed yourself vs reposted.", "Archive any reposted clip that still shows another app's watermark.", "Film one 20–40 second vertical Reel showing your own product, skill or opinion.", "Share it into one Facebook group where your customers already talk — add a line of context, not just a link."]},
        {"type": "quiz", "q": "Which upload is Facebook most likely to treat as original in 2026?", "options": ["A viral TikTok clip with your logo added", "A popular clip trimmed and set to new music", "A shaky 30-second phone video you filmed of your own shop", "Someone else's video with a new caption"], "answer": 2, "explain": "Facebook defines original as filmed or produced by you. Production quality doesn't decide it — authorship does. Logos, trims, music and captions on someone else's clip are 'minor edits'."},
        {"type": "takeaways", "items": ["Facebook is Kenya's biggest ad-reach platform — about 17M people.", "Original means you filmed or produced it; light edits of other people's clips get demoted.", "All new videos are Reels now, so the first seconds decide everything.", "Forwards to WhatsApp and groups are a hidden growth engine."]},
        {"type": "locked", "module": "fb_monetize", "text": "Growing the page is step one. The Facebook Monetization Blueprint turns that page into payouts.", "items": ["The 20-post audit that tells you which payout path (Reels, longer video or Stars) your page should chase for the next 90 days", "A 30-day eligibility sprint tracker that turns Meta's locked requirements into weekly targets", "The RPM + Stars calculator Kenyan pages use to predict a month's earnings before it lands", "The 5-step monthly compliance check — and a review-request message for when monetisation gets restricted"]},
        {"type": "sources", "items": [{"title": "DataReportal — Digital 2026: Kenya", "url": "https://datareportal.com/reports/digital-2026-kenya"}, {"title": "Tubefilter — Facebook doubles down on original content (Mar 2026)", "url": "https://www.tubefilter.com/2026/03/14/facebook-original-content-creator-impersonation/amp/"}, {"title": "Tubefilter — Meta is turning all Facebook videos into Reels (Jun 2025)", "url": "https://www.tubefilter.com/2025/06/17/meta-facebook-reels-all-videos-update/"}, {"title": "Pulse Kenya — Why Facebook doesn't pay like it used to (Jul 2026)", "url": "https://www.pulse.co.ke/story/monetized-on-meta-see-why-facebook-doesnt-pay-like-it-used-to-2026071222561533829"}]},
      ]},
      { id: "x1", title: "Growing on X: What the Open-Source Code Really Says", minutes: 6, body: [
        {"type": "hook", "text": "In X's 2023 open-source ranking code, a reply that the author answered back was weighted **75**. A like was worth **0.5**. One real conversation counted like 150 likes."},
        {"type": "p", "text": "That number went viral, and you've probably seen \"replies are worth 13.5x\" tips. Here's the part most people skip: in January 2026 X replaced that system with a new Grok-based model called Phoenix — and for Phoenix there are **no published weights**. The old numbers show direction, not exact law."},
        {"type": "table", "headers": ["Action (2023 code)", "Weight", "What it tells you today"], "rows": [["Like", "0.5", "The weakest signal — nice, but almost nothing"], ["Reply", "13.5", "Conversation beats applause"], ["Reply the author engages with", "75", "Replying to your replies is the strongest move you control"], ["\"Show less\" / mute / block", "−74", "One annoyed reader can cancel ~150 likes"], ["Report", "−369", "Rage-bait that gets reported is a disaster"]]},
        {"type": "insight", "label": "What most creators miss", "text": "The negative signals are huge. In the 2023 weights, a single \"not interested\" cancelled out about 148 likes. The 2026 Phoenix model still predicts blocks, mutes and \"not interested\" clicks as negatives. Going viral with rage can quietly shrink your reach afterwards."},
        {"type": "h3", "text": "X in Kenya: smaller than you think"},
        {"type": "stat", "value": "2.09M", "label": "Kenyans reachable with X ads in late 2025 — basically flat year on year (DataReportal, Digital 2026: Kenya)"},
        {"type": "p", "text": "KOT feels loud, but X reaches far fewer Kenyans than Facebook (17M) or TikTok. X's strength is influence: journalists, brands, recruiters and decision-makers read it. Use it to build authority in a niche, not to chase mass reach."},
        {"type": "h3", "text": "Getting paid on X changed in September 2026"},
        {"type": "p", "text": "On 8 September 2026 X replaced Creator Revenue Sharing with **Original Content Rewards**. You need an eligible Premium plan, 500+ verified followers and 500,000 Home Timeline impressions from verified users in 90 days — **replies don't count**. Payouts are per \"qualified impression\" from Premium users, every two weeks, US$30 minimum, via Stripe outside the US."},
        {"type": "myth", "myth": "Reply-farming and \"🚨BREAKING\" reposts are the fastest way to earn on X.", "truth": "Since April 2026 X has cut aggregator payouts, and the new program excludes copied content, light edits, reposts with little commentary, and repeatedly asking people to like or repost. Kenyan engagement farmers were among the first to feel it."},
        {"type": "template", "label": "3 post formats that start real conversations", "text": "1) THE HONEST QUESTION: \"Kenyan [niche] people: what's one thing you wish you knew before [starting X]? I'll go first in the replies.\"\n2) THE SMALL CONTRARIAN TAKE: \"Unpopular opinion: [specific claim]. Here's why 👇\" (reason in a reply, not a link)\n3) THE RECEIPT: \"I tried [thing] for 30 days. Cost: KES [x]. Result: [y]. Biggest surprise: [z].\""},
        {"type": "action", "label": "Do this today", "items": ["Reply to every reply on your last 3 posts — those conversations are your strongest signal.", "Move any link from your main post into the first reply and compare reach over a week.", "Write one post using the Honest Question format above.", "Mute nothing, but stop quote-tweeting to fight: rage invites the negative signals."]},
        {"type": "quiz", "q": "In X's open-source 2023 weights, which action was worth the most?", "options": ["A like", "A repost from a big account", "A reply that the post's author replied to", "A profile click"], "answer": 2, "explain": "An author-engaged reply was weighted 75 — 150x a like (0.5). The 2026 Phoenix model doesn't publish weights, but it still predicts replies and conversations as positive and mutes/blocks as negative."},
        {"type": "takeaways", "items": ["The famous X weights are from 2023; the 2026 Phoenix model publishes no constants.", "Conversations you take part in beat likes; negative feedback can wipe out gains.", "X is small in Kenya (~2.1M ad reach) — use it for authority, not mass reach.", "Original Content Rewards (Sept 2026): Premium + 500 verified followers + 500K verified Home Timeline impressions in 90 days."]},
        {"type": "locked", "module": "fb_monetize", "text": "X pays only a few creators. The Facebook Monetization Blueprint shows how to earn on Kenya's biggest platform — and how to stop relying on any one payout.", "items": ["How to build a rate card from the average views of your last ten posts — works for X, Facebook or Telegram", "A brand pitch DM that quotes honest Insights numbers to local businesses", "The 4 income streams that don't depend on a platform's payout formula, and which one to start first", "The originality traps that get pages demonetised — the same rules X now applies"]},
        {"type": "sources", "items": [{"title": "How Twitter's algorithm really works (2023 code walkthrough)", "url": "https://ernests.github.io/the-algorithm"}, {"title": "X algorithm open source: May 2026 update (Phoenix)", "url": "https://pasqualepillitteri.it/en/news/2594/x-algorithm-open-source-may-2026"}, {"title": "X replaces revenue sharing with Original Content Rewards (Sep 2026)", "url": "https://www.thatericalper.com/2026/09/12/x-replaces-creator-revenue-sharing-with-new-original-content-rewards-program/"}, {"title": "DataReportal — Digital 2026: Kenya", "url": "https://datareportal.com/reports/digital-2026-kenya"}]},
      ]},
      { id: "tg1", title: "Telegram Channels: No Algorithm, New Ways to Earn", minutes: 6, body: [
        {"type": "hook", "text": "Telegram has no feed algorithm deciding who sees your channel posts. Every post goes straight to subscribers. So your real enemy isn't the algorithm — it's the **mute button**."},
        {"type": "p", "text": "That changes the game. On TikTok you fight for discovery. On Telegram you fight for attention you already have. Post too often, post filler, and people mute you — they still count as subscribers, but they stop seeing anything."},
        {"type": "h3", "text": "The one number that matters: views per post"},
        {"type": "p", "text": "Divide the average views on your last 10 posts by your subscriber count. That's your **view rate**. Ad buyers in the Telegram market commonly look for roughly 20–40% — treat that as a rough industry rule of thumb, not an official figure. A 3,000-member channel with 1,200 views per post is worth more to a sponsor than a 10,000-member channel with 900."},
        {"type": "h3", "text": "Three ways Telegram itself now pays channel owners"},
        {"type": "table", "headers": ["Tool", "How it works", "Who can use it"], "rows": [["Ad revenue share", "Telegram shows ads in your channel and gives you 50% of the revenue, paid in Toncoin (TON)", "Public channels with 1,000+ subscribers (since March 2024)"], ["Paid posts", "You post content subscribers unlock with Telegram Stars", "Any channel admin (not 18+ channels)"], ["Suggested / paid posts from others", "Someone pays you Stars or TON to publish their post; you approve, edit or reprice it", "Rolled out July 2025, initially for Premium users"]]},
        {"type": "insight", "label": "What most creators miss", "text": "The money is real but it is **crypto-based**. Stars can only be withdrawn 21 days after you receive them, through Fragment, converted to TON. Turning TON into shillings means using a crypto exchange or P2P trader — prices move daily and you carry that risk. Keep records: it's still income in KRA's eyes."},
        {"type": "p", "text": "Telegram doesn't publish ad rates by country, so a Kenyan channel's ad revenue depends on how many ads Telegram sells against your audience. Treat it as a bonus until your own Monetization tab (Statistics → Monetization) shows real numbers."},
        {"type": "p", "text": "**Telegram's best job is the closer.** It rarely helps strangers find you. It shines as the place your TikTok or Instagram followers go for something extra: job alerts, betting-free sports analysis, deals from an Eastleigh wholesaler, revision notes for KCSE. Discovery happens elsewhere; loyalty happens here."},
        {"type": "template", "label": "Pinned welcome post", "text": "Karibu! 👋 This channel is for [who] who want [result].\nWhat you get: [e.g. 3 verified job leads every weekday by 8am]\nWhat you won't get: spam. Max [2] posts a day.\nShare with one friend who needs this: [t.me/yourchannel]"},
        {"type": "action", "label": "Do this today", "items": ["Work out your view rate: average views on your last 10 posts ÷ subscribers.", "Set a posting limit (e.g. max 2 per day) and pin a welcome post that promises it.", "Add your t.me link to your TikTok/Instagram bio and WhatsApp status with one clear reason to join.", "If you have 1,000+ subscribers on a public channel, open Statistics → Monetization and check what's switched on."]},
        {"type": "quiz", "q": "A sponsor is choosing between two Telegram channels. What should matter most?", "options": ["Total subscribers", "Average views per post", "How old the channel is", "Number of posts per day"], "answer": 1, "explain": "Telegram delivers every post to subscribers, but muted or inactive members never see it. Average views per post is the real audience a sponsor is paying to reach."},
        {"type": "service", "label": "First impressions for a new channel", "text": "A brand-new channel with 12 members looks like an empty room. A starting base of members can make a visitor more willing to join content you're proud of. It won't create views or Telegram ad revenue by itself — your posts do that.", "platform": "telegram", "subcat": "members", "cta": "See Telegram member packages"},
        {"type": "takeaways", "items": ["No feed algorithm: your threat is mutes, so post less and better.", "View rate (views ÷ subscribers) is your real size.", "Telegram pays via 50% ad share (1,000+ subs), paid posts and suggested posts — in TON and Stars.", "Stars withdraw after 21 days via Fragment; converting to KES carries crypto price risk."]},
        {"type": "locked", "module": "fb_monetize", "text": "Telegram ad payouts are small for most Kenyan channels. The Blueprint shows the streams that pay more.", "items": ["The rate-card method: price a sponsored post from your real average views, then raise it as results come in", "Why to ask for an M-Pesa deposit before you create — and how to package one post + one Story", "The income-stream table: brand deals vs your own product vs paid group vs referral links", "An honest brand pitch DM that never presents boosted numbers as organic"]},
        {"type": "sources", "items": [{"title": "Telegram — Sharing revenue with channel owners", "url": "https://www.telegram.org/blog/monetization-for-channels/?setln=en"}, {"title": "Neowin — Telegram adds new ways to monetise channels (Jul 2025)", "url": "https://www.neowin.net/amp/telegram-gets-group-checklists-new-ways-to-monetize-channels-and-more/"}, {"title": "Telegram Info — Rewards for channel owners (paid posts)", "url": "https://tx.me/s/tginfoen?after=1939"}]},
      ]},
      { id: "conv1", title: "First Impressions vs Payout Rules: What Numbers Can and Can't Do", minutes: 6, body: [
        {"type": "hook", "text": "X's new payout rules exclude **paid, fraudulent and artificially generated impressions** — and artificial likes, follows or views can disqualify you. Platforms now separate \"looks popular\" from \"gets paid\" more clearly than ever."},
        {"type": "p", "text": "That's useful to know, because it tells you exactly where social proof helps and where it doesn't. People still judge a page in seconds by how alive it looks. Payout systems judge something completely different."},
        {"type": "h3", "text": "Two audiences look at your numbers"},
        {"type": "table", "headers": ["Platform", "What a new visitor sees first", "What the payout system counts"], "rows": [["Facebook", "Followers, recent likes and comments", "Qualified views on original content, policy compliance"], ["X", "Followers, replies on your posts", "Home Timeline impressions from Premium users; replies excluded"], ["Telegram", "Member count", "Real ad impressions in your channel; Stars people actually pay"]]},
        {"type": "p", "text": "Humans react to the middle column. Algorithms and payout teams look at the right one. Confusing the two is the most expensive mistake small creators make."},
        {"type": "myth", "myth": "Buying followers helps me hit Facebook or X monetisation thresholds faster.", "truth": "No. Meta's monetisation policies prohibit artificially inflated engagement, and X explicitly excludes artificial impressions and can disqualify accounts for artificial likes or follows. Bought numbers can make a page look established to people — they don't count toward getting paid, and they carry real risk."},
        {"type": "h3", "text": "Where a starting boost can genuinely help"},
        {"type": "ul", "items": ["**First impressions:** a Nairobi salon page with 40 followers looks closed; one with a few hundred looks open for business.", "**Joining momentum:** people join a Telegram channel or WhatsApp-linked page faster when they're not the first one there.", "**Ratio matters:** 10,000 followers with 3 likes per post looks fake. Any boost should match real activity on content you're proud of."]},
        {"type": "insight", "label": "What most people miss", "text": "Correction to a common myth: Facebook monetisation isn't Pages-only. Kenyan guidance lists Pages **and professional-mode profiles** as eligible. If you're building on a personal profile, switch it to professional mode instead of starting from zero."},
        {"type": "service", "label": "Look established — honestly", "text": "If you've got content you're proud of and a page that looks empty, a modest follower base can help first-time visitors take you seriously. Keep it gradual, keep posting, and never present it to a brand as organic.", "platform": "all", "subcat": "followers", "cta": "Browse follower packages"},
        {"type": "action", "label": "Do this today", "items": ["Check your engagement ratio: average likes ÷ followers on your last 10 posts.", "On Facebook, switch your profile to professional mode if you haven't — then look at Professional Dashboard → Monetisation.", "Write down which numbers you show brands, and make sure they come from Insights, not guesswork.", "Pick one original post this week to put real effort behind."]},
        {"type": "quiz", "q": "Under X's Original Content Rewards (Sept 2026), what happens to artificially generated impressions?", "options": ["They count double for new creators", "They count once you have Premium", "They're excluded, and artificial engagement can disqualify you", "They count only if under 10% of total"], "answer": 2, "explain": "Paid, fraudulent and artificially generated impressions are excluded, and artificial likes, follows or views are listed as disqualifiers. Social proof can help human first impressions — never payouts."},
        {"type": "takeaways", "items": ["People judge how alive a page looks; payout systems judge real, original performance.", "Bought numbers never count toward Facebook or X monetisation, and break their rules.", "If you use a boost, keep it gradual, matched to real activity, and never sell it to brands as organic.", "Facebook professional-mode profiles can monetise too — not only Pages."]},
        {"type": "locked", "module": "fb_monetize", "text": "Want to hit Facebook's real thresholds the right way? That's what the Blueprint is for.", "items": ["The 30-day eligibility sprint: week-by-week targets pulled from your own Monetisation dashboard", "Why Meta rejects pages using inflated numbers — and the content routine that clears requirements instead", "The Creator Fast Track check for people who already have a following on TikTok or Instagram", "Which payout path (Reels, longer video, Stars) to chase first, decided from your top five posts"]},
        {"type": "sources", "items": [{"title": "X replaces revenue sharing with Original Content Rewards (Sep 2026)", "url": "https://www.thatericalper.com/2026/09/12/x-replaces-creator-revenue-sharing-with-new-original-content-rewards-program/"}, {"title": "GREY Journal — X Original Content Rewards needs 500K views, not 5M", "url": "https://greyjournal.net/hustle/x-original-content-rewards-program/"}, {"title": "Kenyans.co.ke — Facebook monetisation eligibility explained", "url": "https://www.kenyans.co.ke/news/98956-how-check-eligibility-criteria-facebook-monetization"}, {"title": "Creators Agency — Facebook Content Monetization requirements 2026", "url": "https://creatorsagency.co/blog/facebook-content-monetization-requirements-2026"}]},
      ]},
    ],
  },
  {
    id: 'safety', icon: '🛡️', title: 'Staying Safe & Compliant',
    blurb: "Honest rules, real risk reduction, account security and Kenyan law",
    lessons: [
      { id: "s1", title: "What the Rules Actually Say, and What Gets Flagged", minutes: 5, body: [
        {"type": "hook", "text": "On YouTube, if someone **you hired** to promote your channel uses bots, the strike lands on **your** channel, not theirs."},
        {"type": "p", "text": "Here's the plain truth this Academy owes you: Instagram, TikTok and YouTube all prohibit inauthentic engagement in their rules, and that includes bought followers, likes and views. Anyone who says growth services are '100% safe' or 'allowed' is wrong. What you can control is **how much risk** you take and how you take it."},
        {"type": "stat", "value": "147.7M", "label": "fake accounts TikTok removed in a single quarter, Q4 2025, with 99.1% of violating content caught proactively (TikTok enforcement report via Dhaka Tribune)"},
        {"type": "h3", "text": "What each platform actually says"},
        {"type": "table", "headers": ["Platform", "The rule", "What they do about it"], "rows": [["Instagram", "Third-party apps that generate inauthentic likes, follows and comments break the Community Guidelines (2018)", "Machine-learning detection, removal of that activity, an in-app notice asking you to change your password"], ["TikTok", "Prohibits facilitating the trade of services that artificially increase engagement", "Removes the fake followers or likes it finds. Manipulative content becomes ineligible for For You"], ["YouTube", "No artificially inflating views, likes or comments, including through a hired promoter", "Artificial views don't count. First a warning, then strikes; 3 strikes in 90 days can end a channel"]]},
        {"type": "h3", "text": "What actually draws attention"},
        {"type": "ul", "items": ["**Spikes against your own baseline.** A jump that looks nothing like your normal week.", "**One number moving alone.** Thousands of followers while likes and comments stay flat.", "**Shared logins.** Instagram specifically flagged apps that need your password. Anything that logs in as you is a red flag.", "**Spam-looking comments.** Generic emoji strings from empty accounts look bad to people as well as systems."]},
        {"type": "h3", "text": "Real risk reduction"},
        {"type": "ol", "items": ["**Never hand over a password.** A legitimate growth order only needs a public link.", "**Go gradual.** Drip-feed spreads delivery over hours or days. Split big orders across several days.", "**Keep it proportional.** A modest boost next to your real numbers, on a post that's already performing.", "**Keep it away from monetisation channels.** Don't send bought views to a YouTube channel you want in the Partner Program. They won't count, and they can bring strikes.", "**Never show boosted numbers to a brand as organic.** That turns a platform-rules risk into a trust and contract problem."]},
        {"type": "myth", "myth": "High-quality or 'real' accounts make bought engagement allowed.", "truth": "The rules are about whether engagement is **authentic**, not how good the accounts look. Higher tiers drop less and look better to people, which lowers practical risk, but they don't make it compliant. Know which side of the line you're on."},
        {"type": "insight", "label": "What most people miss", "text": "The biggest risks in practice are a lost **account** (shared logins, phishing) and lost **trust** (a brand finding out). Removed likes are the smallest risk of the three. Lessons 2 and 3 cover the first, and Lesson 4 covers your legal basics."},
        {"type": "quiz", "q": "A promoter you paid sends bot views to your YouTube video without telling you. Under YouTube's policy, what can happen?", "options": ["Nothing, because you didn't do it yourself", "Only the promoter's account is penalised", "Your video can be removed and your channel can get warnings or strikes", "The views count but can't be monetised"], "answer": 2, "explain": "YouTube says anyone you hire must follow the policy too. Violations by a hired promoter can lead to content removal or channel action, and artificial views don't count at all."},
        {"type": "takeaways", "items": ["All three major platforms prohibit inauthentic engagement. Be honest with yourself about that.", "Spikes against your own baseline, single-metric jumps and shared logins draw attention.", "Reduce risk: no passwords, gradual delivery, proportional amounts, nothing near monetisation.", "Never present boosted numbers to brands as organic."]},
        {"type": "locked", "module": "brand_pricing_pro", "text": "Brands audit creators before they pay. Charging Brands: The Kenya Pricing Guide shows what they check and how to price yourself honestly:", "items": ["The audit brands run with a live Insights screen-recording, and why screenshots no longer convince them", "2026 Kenya rate benchmarks by tier, and what actually moves you up within your tier", "How to build a rate card and one-page media kit you can send within minutes", "Usage rights and whitelisting: the question to ask before you agree a rate"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Fake engagement policy", "url": "https://support.google.com/youtube/answer/3399767?hl=en"}, {"title": "Instagram: Reducing inauthentic activity on Instagram (Nov 2018)", "url": "https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram/"}, {"title": "TikTok Community Guidelines: Integrity and Authenticity", "url": "https://www.tiktok.com/community-guidelines/en/integrity-authenticity/"}, {"title": "Dhaka Tribune: TikTok Q4 2025 Community Guidelines Enforcement Report", "url": "https://www.dhakatribune.com/feature/tech/408119/tiktok-releases-q4-2025-community-guidelines"}]},
      ]},
      { id: "s2", title: "Lock Down Your Account in 10 Minutes", minutes: 5, body: [
        {"type": "hook", "text": "SMS login codes have a weak spot most creators never think about. Whoever controls your **phone number** gets your codes, and in Kenya that number can be stolen without anyone touching your phone."},
        {"type": "stat", "value": "KES 491.6M", "label": "drained from Kenyan mobile wallets through SIM swap fraud in 2025, with Safaricom SIM-swap fraud investigations up 327% (INTERPOL African Cyberthreat Assessment 2026, via Tech-ish)"},
        {"type": "p", "text": "INTERPOL's report explains how it works. Fraudsters gather your personal details through phishing or leaked data, impersonate you to get a replacement SIM, then receive your one-time codes. Your Instagram, TikTok, Gmail and M-Pesa can all be reset from that one number."},
        {"type": "h3", "text": "The 10-minute lockdown"},
        {"type": "table", "headers": ["What to secure", "The setting", "Why it matters"], "rows": [["Your Safaricom line", "Dial *100*100# to restrict SIM replacement to a Safaricom shop or Safaricom directly", "Blocks the quickest route to a SIM swap"], ["Lines in your name", "Dial *106# to see every number registered to your ID", "Spots lines someone opened with your details"], ["Instagram / Facebook", "Accounts Center > Password and security > Two-factor authentication > Authentication app", "App codes live on your phone, not your SIM"], ["Your email", "Turn on 2FA with an authenticator app, and use a password you don't use anywhere else", "Email is the master key that resets every other account"], ["WhatsApp", "Settings > Account > Two-step verification > set a PIN", "Stops someone registering your number on a new phone"]]},
        {"type": "insight", "label": "The setting nobody turns on", "text": "Instagram offers SMS, WhatsApp, an authentication app and a security key for 2FA. Most people stop at SMS. An **authentication app** (Google Authenticator, Duo and the like) keeps working even if your SIM is hijacked. When you set it up, save the backup codes somewhere offline, like a notebook, not your camera roll."},
        {"type": "h3", "text": "Clean out who already has access"},
        {"type": "ul", "items": ["Check the active sessions or 'where you're logged in' list on each app and log out any device you don't recognise.", "Remove old third-party apps and websites connected to your Instagram or TikTok. Instagram's own crackdown targeted apps that held users' logins.", "If you ever gave a password to an 'auto-liker' or 'free followers' site, change that password today.", "If you have a business page, give helpers their own access roles instead of sharing your login."]},
        {"type": "callout", "label": "If you think you've been SIM-swapped", "text": "Signs: your phone suddenly shows no network where it normally works, or you get login alerts you didn't trigger. Call Safaricom straight away from another phone, then change your email password first, since every other account resets through it."},
        {"type": "action", "label": "Do this today (10 minutes)", "items": ["Dial *100*100# and *106# on your Safaricom line.", "Switch Instagram 2FA from SMS to an authentication app and write the backup codes on paper.", "Turn on WhatsApp two-step verification.", "Log out unknown sessions and remove connected apps you don't use."]},
        {"type": "quiz", "q": "A fraudster successfully SIM-swaps your number. Which 2FA method still protects your Instagram?", "options": ["SMS codes", "WhatsApp codes sent to the same number", "An authentication app on your phone", "None. 2FA is useless after a SIM swap"], "answer": 2, "explain": "SMS and number-linked codes follow your phone number to the attacker's new SIM. Authentication-app codes are generated on your own device, so a SIM swap doesn't hand them over."},
        {"type": "takeaways", "items": ["Your phone number is the weak point. Lock it with *100*100# and check lines with *106#.", "Use an authentication app for 2FA, not SMS, and keep backup codes on paper.", "Secure your email first, because it resets everything else.", "Never share logins. Give helpers their own roles."]},
        {"type": "locked", "module": "money", "text": "A secure account is something you can earn from. Turn Growth Into Income shows how to get paid from it:", "items": ["The engagement-rate and CPE formulas brands use to price you, and how to quote a number instead of 'what's your budget?'", "The red flag to walk away from: 'exposure' offers from businesses that clearly earn money", "Referral income math, paid out to M-Pesa from KES 100", "The four-step funnel for selling your own product, with M-Pesa checkout built in"]},
        {"type": "sources", "items": [{"title": "Tech-ish: Kenyans lost KES 491.6 million to SIM swap fraud in 2025 (INTERPOL)", "url": "https://tech-ish.com/2026/08/10/kenyans-lost-kes-491-6-million-to-sim-swap-fraud-in-2025-interpol-report-says/"}, {"title": "Safaricom: Fraud awareness tips", "url": "https://safaricom.co.ke/fraud-awareness/tips-tricks"}, {"title": "Malwarebytes: How to set up 2FA on your Instagram account", "url": "https://www.malwarebytes.com/blog/how-to/2025/10/how-to-set-up-two-factor-authentication-2fa-on-your-instagram-account"}]},
      ]},
      { id: "s3", title: "Scams Aimed at Kenyan Creators (and How to Spot Them)", minutes: 5, body: [
        {"type": "hook", "text": "One copyright scam doesn't need your password at all. It files fake complaints until Instagram suspends you, then offers to 'withdraw' them for a fee."},
        {"type": "p", "text": "Malwarebytes reported in September 2026 that scammers are filing fake copyright complaints against Instagram accounts. Meta automates much of that process and doesn't verify who files. Repeat complaints can trigger a suspension, and then a 'lawyer' shows up on Telegram or by email asking for payment, sometimes in crypto. Victims who paid have been targeted again."},
        {"type": "h3", "text": "The five scams aimed at creators"},
        {"type": "table", "headers": ["The scam", "The tell", "Your move"], "rows": [["'Copyright violation, your account will be deleted in 24 hours'", "Urgency, a link to a login page, a sender outside the app", "Check only in-app: Settings > Account status / Support requests"], ["'Get your blue badge, verify here'", "A DM or email offering verification through a link", "Verification only happens inside the official app settings"], ["Fake brand deal", "Asks you to pay 'registration' or 'shipping', or to download a 'brief' file or app", "Real brands pay you. Ask for a company email and a written scope"], ["Pay-to-withdraw complaint", "Someone offers to drop a complaint for money", "Don't pay. Use the official appeal and keep evidence"], ["M-Pesa 'wrong number' reversal", "A stranger sends money then begs you to send it back", "Safaricom says to forward reversal requests to 456 and not send money yourself"]]},
        {"type": "insight", "label": "The check most people don't know exists", "text": "Instagram has a list of the **real emails it sent you** in the last 14 days, under Settings > Security > Emails from Instagram (the exact menu may vary by app version). If a scary 'security' email isn't on that list, it didn't come from Instagram."},
        {"type": "h3", "text": "Kenya-specific traps"},
        {"type": "ul", "items": ["**Fake Safaricom calls.** Safaricom says it only calls from 0722000000 and never asks for your PIN. Never dial a code a caller dictates, such as *33*...", "**Lookalike 'support' accounts** for banks, telcos or growth platforms that DM you first. Real support doesn't cold-DM for codes.", "**'Pay to join' creator agencies** promising a TikTok Creator Fund place or a 'monetised account'. Check what's actually available in Kenya before paying anyone."]},
        {"type": "template", "label": "Reply to a brand offer that smells off", "text": "Thanks for reaching out! Before we go further, could you send:\n1. An email from your company domain (not Gmail)\n2. The campaign scope: deliverables, timeline and usage\n3. Your proposed fee and payment terms\nI don't pay registration or onboarding fees, and I don't download files or apps to receive a brief. Happy to continue once I have the above."},
        {"type": "callout", "label": "If it already happened", "text": "Don't pay. Screenshot the messages, usernames, emails and payment requests. Change your password and turn on app-based 2FA (Lesson 2). Appeal only through the app's own Help section. Forward scam SMS to 333. Kenya's amended Computer Misuse and Cybercrimes Act (2025) extends penalties for phishing and covers identity theft involving SIMs and digital wallets, so report it."},
        {"type": "quiz", "q": "You get an email saying your Instagram will be deleted in 24 hours for copyright, with a link to 'appeal'. What's the best first check?", "options": ["Click the link quickly before the deadline", "Reply asking whether it's real", "Check Settings > Security > Emails from Instagram and your in-app account status", "Pay the fee to make it go away"], "answer": 2, "explain": "Instagram lists genuine emails from the last 14 days in-app. If it isn't there, it's fake. Real copyright issues show inside the app, never behind a deadline link."},
        {"type": "takeaways", "items": ["Urgency plus a link plus a sender outside the app means it's almost certainly a scam.", "Check Instagram's 'Emails from Instagram' list before you act on any security email.", "Real brands pay you. They never charge you to work with them.", "Never pay to withdraw a complaint. Keep evidence and appeal in-app."]},
        {"type": "locked", "module": "brand_pricing_pro", "text": "The best protection from fake deals is knowing what a real one looks like. Charging Brands: The Kenya Pricing Guide spells it out:", "items": ["The scope-first reply script, so you never quote a number before you know the deliverables", "Payment terms that protect your cash flow, and why you get everything in writing", "Exclusivity clauses and what they should cost the brand", "The pricing mistakes that cost Kenyan creators the most, plus the 2026 tax changes"]},
        {"type": "sources", "items": [{"title": "Malwarebytes: Copyright scammers get Instagram accounts suspended and demand payment (Sept 2026)", "url": "https://www.malwarebytes.com/blog/scams/2026/09/copyright-scammers-get-instagram-accounts-suspended-and-demand-payment"}, {"title": "The Next Web: Instagram's 'Emails from Instagram' anti-phishing feature", "url": "https://thenextweb.com/news/instagrams-new-feature-can-help-spot-phishing-scams-heres-how"}, {"title": "Safaricom: Fraud awareness tips", "url": "https://safaricom.co.ke/fraud-awareness/tips-tricks"}, {"title": "The Star: Amended Computer Misuse and Cybercrimes Act, new offences (Nov 2025)", "url": "https://www.the-star.co.ke/news/infographics/2025-11-19-amended-computer-misuse-and-cybercrimes-act-new-offences-or-protections-introduced"}]},
      ]},
      { id: "s4", title: "Kenyan Law for Creators: Data, Cybercrime & Disclosure", minutes: 6, body: [
        {"type": "hook", "text": "A Nairobi lounge was fined **KES 1.85 million** for posting a customer's photo on its social media without consent. The same rules apply to your page."},
        {"type": "p", "text": "Most creators think law is a big-company problem. But Kenya's Data Protection Act 2019 applies to anyone who collects or uses other people's personal data, and on social media that includes faces, phone numbers and customer lists. Here are the basics in plain English. It isn't legal advice, so check anything serious with a lawyer."},
        {"type": "stat", "value": "KES 9.375M", "label": "in ODPC fines across three Kenyan cases, including Casa Vera Lounge (customer photos) and Roma School, KES 4.55M for posting pupils' data online (HapaKenya, Dec 2025)"},
        {"type": "h3", "text": "Data Protection Act: what touches creators"},
        {"type": "ul", "items": ["**Faces are personal data.** Posting a customer, a client's child or a reveller needs their consent. Kids need a parent's consent.", "**Marketing needs consent and an opt-out.** Adding people to a WhatsApp broadcast or SMS list to sell to them needs their consent, notice, and an easy way to stop.", "**Registration with the ODPC** is usually exempt below KES 5 million annual turnover **and** fewer than 10 staff. Some sectors, including education, health and direct marketing, must register whatever their size.", "**Penalties** can reach KES 5 million or 1% of annual turnover, whichever is lower."]},
        {"type": "template", "label": "Consent message before posting a customer", "text": "Hi [Name]! Thank you for coming to [Business]. We'd love to share your photo/video on our Instagram and TikTok. Is that okay with you? Reply YES to agree. You can ask us to take it down any time."},
        {"type": "h3", "text": "Cybercrime law: on your side, and watching you"},
        {"type": "p", "text": "Kenya's Computer Misuse and Cybercrimes (Amendment) Act 2025 extends penalties for phishing (fake calls and emails), clarifies identity theft to cover misuse of SIM cards and digital wallets, and widened cyber-harassment (in July 2026 the High Court struck down two of the new clauses, including the 'likely to cause suicide' wording, but harassment, phishing and identity-theft offences still stand). That helps you report scams. It also means a pile-on, a doxx or a 'name and shame' post can carry legal risk."},
        {"type": "h3", "text": "Advertising and disclosure"},
        {"type": "ul", "items": ["**Paid or affiliate posts:** say so plainly in the post. The US FTC's widely copied principle is that disclosure is the **influencer's** responsibility, and you can't assume followers know.", "**Gambling:** the Betting Control and Licensing Board's guidelines (June 2025) bar influencers and content creators from promoting gambling at all.", "**Honest numbers:** never present boosted followers or views to a brand as organic. That's a misrepresentation problem, not just a platform one."]},
        {"type": "myth", "myth": "If it's my phone and my page, I can post what I filmed.", "truth": "Owning the camera doesn't give you consent. Casa Vera's own social pages earned it a KES 1.85M fine, and the ODPC said businesses should get customers' approval before posting."},
        {"type": "action", "label": "Do this today", "items": ["Scroll your last 20 posts. Flag any identifiable customer or child you don't have consent for.", "Save the consent message and use it from your next shoot.", "Add 'Reply STOP to leave' to your next WhatsApp broadcast.", "Add a clear 'Ad' or 'Affiliate link' line to any paid post that's missing one."]},
        {"type": "quiz", "q": "Why was a Nairobi lounge fined KES 1.85 million by the Data Protection Commissioner?", "options": ["For buying followers", "For posting a customer's image on social media without consent", "For not registering a business name", "For playing copyrighted music"], "answer": 1, "explain": "Casa Vera Lounge posted a patron's photo without consent. Under the Data Protection Act, faces are personal data, so get a 'YES' before you post anyone."},
        {"type": "takeaways", "items": ["Faces and phone numbers are personal data. Get consent before you post or market.", "Small creators are usually exempt from ODPC registration, but not from consent rules.", "The 2025 cybercrime amendments cover phishing and SIM or wallet identity theft, and they also cover harassment.", "Disclose paid and affiliate posts, avoid gambling promotion, and never pass off boosted numbers as organic."]},
        {"type": "locked", "module": "affiliate_pro", "text": "Disclosure isn't only about compliance. It protects your income too. The Affiliate Marketing Guide covers both:", "items": ["Ready-to-copy disclosure lines for captions, video voice-overs, WhatsApp Status and gifted products", "Why a discount code on its own doesn't count as disclosure", "The affiliate income log that doubles as your KRA record and your disclosure history", "How a Nairobi reseller turned a 'are these paid?' comment pile-on back into sizing questions"]},
        {"type": "sources", "items": [{"title": "Capital FM: Casa Vera Lounge fined Sh1.85m for using a reveller's image without consent", "url": "https://www.capitalfm.co.ke/news/2023/09/casa-vera-lounge-penalised-sh1-8mn-for-using-revelers-image-without-consent"}, {"title": "HapaKenya: ODPC issues Ksh 9.3M in fines to Casa Vera Lounge and others", "url": "https://hapakenya.com/2025/12/04/odpc-issues-ksh-9-3m-in-fines-to-casa-vera-lounge-others-in-data-privacy-violations/"}, {"title": "DLA Piper: Data protection laws of the world, Kenya", "url": "https://www.dlapiperdataprotection.com/index.html?c=KE&c2=FR&t=law"}, {"title": "The Star: Amended Computer Misuse and Cybercrimes Act, new offences (Nov 2025)", "url": "https://www.the-star.co.ke/news/infographics/2025-11-19-amended-computer-misuse-and-cybercrimes-act-new-offences-or-protections-introduced"}]},
      ]},
    ],
  },
  {
    id: 'rules', icon: '📋', title: "Platform Rules: Dos & Don'ts",
    blurb: "What each platform actually bans, what gets you quietly limited, and the Kenyan laws that apply on top",
    lessons: [
      { id: "pr1", title: "Instagram: The Dos, Don'ts & Instant-Ban Mistakes", minutes: 7, body: [
        {"type": "hook", "text": "Instagram now judges originality across your **whole month** of posts, not one post at a time. A page that mostly reposts other people's videos can stop being shown to new people, even if every single repost credits the creator."},
        {"type": "p", "text": "Most Instagram punishment isn't a ban. Your posts stay up, but Instagram quietly stops **recommending** you to non-followers in Explore and Reels. You can check: on a professional account, open Settings, then **Account Status** (menu names vary by app version). It shows whether your content is eligible for recommendations and lets you edit, delete or appeal flagged posts."},
        {"type": "stat", "value": "5", "label": "the maximum number of hashtags Instagram now allows per post or Reel, a limit rolled out from December 2025 to stop hashtag spam (Social Media Today)"},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Post photos and Reels you filmed or designed yourself", "Run a page of other people's viral clips, even with 'credit to owner' in the caption"], ["Share someone's work with the built-in repost button or a Collab post", "Download a video, crop out the watermark and re-upload it as yours"], ["Use up to 5 specific hashtags, e.g. #NairobiBraids #KasaraniSalon", "Paste 30 generic tags like #love #instagood #viral"], ["Check Account Status once a month", "Ignore a 'not eligible for recommendation' notice and keep posting the same way"], ["Get a written 'YES' before posting a customer, and a parent's YES for any child", "Post the client photo you took 'for the records' without asking"], ["Turn on the Paid partnership label for sponsored posts", "Hide that a brand paid you"], ["Use an authenticator app for two-factor login", "Give your password to a 'growth app' or a 'get verified' DM"], ["Reply to comments and DMs yourself, like a person", "Use bots that mass-follow, mass-like or mass-DM strangers"], ["Appeal inside the app (Account Status or Help)", "Pay a 'Meta agent' on WhatsApp to unlock your account"], ["Promote your own products and services", "Accept betting-company promo deals (illegal for Kenyan creators since May 2025)"]]},
        {"type": "h3", "text": "What actually gets accounts restricted or disabled"},
        {"type": "ul", "items": ["**Inauthentic activity.** Instagram said back in 2018 that apps generating fake likes, follows and comments break its Community Guidelines, and that it removes that activity when detected.", "**Unoriginal content.** Since Instagram's 2026 originality update (now covering photos and carousels, not just Reels), crediting, adding a watermark or making small crops doesn't count as making something new.", "**Repeated strikes.** Meta counts violations and adds restrictions as they pile up. First-time violators can often remove a strike by completing a short course, but only once every 12 months and not for the most serious violations.", "**Severe violations.** Child sexual exploitation and terrorism-related content can lead to an account being disabled straight away, with no warning ladder."]},
        {"type": "h3", "text": "The honest risk ladder for bought followers and likes"},
        {"type": "p", "text": "Buying followers or likes breaks Instagram's rules on inauthentic activity. No 'premium' or 'real-looking' tier makes it compliant. What usually happens, from mildest to worst, is below. Instagram doesn't publish its thresholds, so treat this as the general pattern, not a promise."},
        {"type": "ol", "items": ["**Count removal.** Detected fake likes or follows quietly disappear.", "**Reach limits.** Your posts or whole account stop being recommended to non-followers.", "**Feature blocks.** Temporary 'we restrict certain activity' blocks on following, liking or commenting.", "**Disable.** Repeated or severe violations can cost you the account."]},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Faces are personal data.** In August 2026 the Data Protection Commissioner ordered Mukumu Girls to pay KES 300,000 for passing on a student's photo it had collected for admission. A photo taken for one purpose isn't consent to publish it.", "**No betting promos.** The Betting Control and Licensing Board's rules (29 May 2025) ban using celebrities, influencers and content creators to promote gambling on any media platform.", "**Cyber law still applies.** In July 2026 the High Court struck down two parts of the 2025 Computer Misuse and Cybercrimes amendments (website blocking and the 'likely to cause suicide' clause). The rest of the Act, including phishing and identity-theft offences, still applies."]},
        {"type": "myth", "myth": "Using hashtags gets you shadowbanned.", "truth": "Relevant hashtags don't hurt you. Adam Mosseri has said they don't do much for reach, but they tell people what a post is about. What can go wrong is irrelevant or spammy tags, which is why the cap is now 5. Instagram doesn't use the word 'shadowban'. Account Status tells you whether your content is eligible for recommendations, so check there instead of guessing."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Open Account Status and screenshot what it shows today.", "Count how many of your last 30 posts are someone else's content. If it's most of them, start mixing in your own.", "Cut every caption in your next 5 posts to 5 specific hashtags or fewer.", "Find any identifiable customer or child in your last 20 posts and get consent or archive the post.", "Delete any betting-promo post or story highlight."]},
        {"type": "quiz", "q": "Your page reposts viral Kenyan comedy clips and always tags the original creator. Under Instagram's 2026 originality rules, what's the most likely result?", "options": ["Nothing, because you gave credit", "Your account stops being recommended to non-followers", "An instant permanent ban", "Only your hashtags get hidden"], "answer": 1, "explain": "Instagram looks at your monthly output. Mostly-reposted accounts lose recommendations to non-followers, and credit or watermarks don't change that. The repost button, Collabs or real transformation do."},
        {"type": "takeaways", "items": ["Most Instagram enforcement is silent: you lose recommendations, not your account. Check Account Status monthly.", "Originality is judged across your month. Credit alone doesn't make a repost yours.", "Up to 5 relevant hashtags are fine. Spam is what gets punished.", "Bought engagement breaks the rules. The ladder runs count removal, then reach limits, then feature blocks, then disable."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "Staying inside the rules keeps you eligible. The Reels Growth Engine shows you how to use that eligibility to get real reach:", "items": ["What goes in frame 1, at 0.5 seconds and at 1.5 seconds, so viewers don't leave at second two", "How to calculate sends per 1,000 reached, plus the four Reel formats people actually forward", "The content-pillar split that stops Instagram getting confused about who your page is for", "The 5-second profile test that turns a Reel's 50,000 views into followers, not just 12"]},
        {"type": "sources", "items": [{"title": "PetaPixel: New Instagram policies target reposted content (Apr 2026)", "url": "https://petapixel.com/2026/04/30/new-instagram-policies-target-reposted-content/"}, {"title": "Social Media Today: Instagram implements new limits on hashtag use (Dec 2025)", "url": "https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/"}, {"title": "Engadget: Instagram tells creators when posts aren't eligible for recommendation", "url": "https://www.engadget.com/instagram-account-status-recommendations-shadowbans-180937137.html"}, {"title": "The Standard: Mukumu Girls ordered to pay Sh300,000 over a minor's photo (Aug 2026)", "url": "https://www.standardmedia.co.ke/crime-and-justice/article/2001555903/mukumu-girls-fined-sh300000-for-sharing-minors-photo-without-consent"}]},
      ]},
      { id: "pr2", title: "TikTok: The Dos, Don'ts & Instant-Ban Mistakes", minutes: 7, body: [
        {"type": "hook", "text": "Between October and December 2025, TikTok removed **820,552 videos** posted from Kenya, and 99.9% of them came down before a single user reported them. If your video disappears, it usually wasn't a jealous rival. The system found it."},
        {"type": "p", "text": "TikTok runs on a **strike system**. Break a rule and the video is removed and a strike is added. Strikes **expire after 90 days**. Hit a threshold within one feature (like LIVE or comments) or one policy (like bullying) and the ban is permanent. Some violations, such as threatening violence or child sexual abuse material, mean a permanent ban on the very first strike. Check your standing under **Account status** in the app's Safety Center."},
        {"type": "stat", "value": "108,752", "label": "Kenyan accounts TikTok banned in Q4 2025, plus 93,704 removed as suspected under-13s. 13 is the minimum age (TikTok report via Citizen Digital)"},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Film your own take on a trend", "Re-upload clips from other apps without new or creative edits. TikTok makes them ineligible for For You"], ["Switch on the commercial content disclosure toggle for paid posts", "Hide a brand deal. Commercial content must be disclosed"], ["Label realistic AI-generated content", "Post realistic AI of real people or public events without a label"], ["Watch your LIVE closely, including guests and translation or voice tools", "Assume 'it was the guest' covers you. Creators are responsible for everything in their LIVE"], ["Make videos with a real payoff", "Post extremely short clips or QR codes. TikTok lists these as low quality and keeps them off For You"], ["Ask for follows and comments honestly", "Post tips or offers for inflating engagement. TikTok bans both"], ["Wait until 18 to go LIVE", "Let your younger sibling run the account. Under-13 accounts get removed"], ["Check Account status after any warning", "Open a new account to dodge a ban"], ["Share news with a source", "Post unverified claims about unfolding events or election results"], ["Promote your own shop, salon or service", "Push 'sure odds' or betting codes. Kenyan law bars creators from promoting gambling"]]},
        {"type": "h3", "text": "What TikTok's Integrity and Authenticity rules ban"},
        {"type": "ul", "items": ["**Fake engagement.** 'Facilitating the trade of services that artificially increase engagement', and giving instructions on how to do it.", "**Spam.** Accounts operated in bulk, or run to pump out high-volume commercial content.", "**Impersonation.** Posing as another real person or brand, including fake personas meant to mislead.", "**Content that tricks people into engaging.** It isn't removed outright, but it becomes ineligible for the For You feed."]},
        {"type": "h3", "text": "The honest risk ladder for bought engagement"},
        {"type": "ol", "items": ["**Count removal.** TikTok removes fake followers or likes it detects.", "**Reach limits.** Content that manipulates engagement can be kept off For You. The video stays up, but it barely travels.", "**Feature blocks.** Strikes within one feature, like LIVE or comments, can cost you that feature.", "**Permanent ban.** Enough strikes inside 90 days, or one severe violation, ends the account."]},
        {"type": "insight", "label": "The rule most Kenyan sellers don't know about", "text": "TikTok's updated guidelines (in force since 13 September 2025) reduce the visibility of content that pushes people to buy **off-platform**, but only in markets where TikTok Shop is available. At the time of writing TikTok Shop isn't open to Kenyan sellers, so 'DM to order, pay via M-Pesa' isn't hit by that rule here. Check again if Shop launches in Kenya."},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Fake 'TikTok monetisation agents'.** In 2025 scammers posed as TikTok staff and charged fees to 'activate' earnings. TikTok has no agents and charges no such fees.", "**Pile-ons and 'exposing' people.** The 2025 cybercrime amendments widened cyber-harassment. In July 2026 the High Court struck out the vague 'likely to cause suicide' clause, but harassment and doxxing can still land you in court.", "**Gambling.** BCLB's May 2025 rules ban influencers and content creators from promoting gambling, and that includes TikTok."]},
        {"type": "myth", "myth": "Saying 'no copyright intended' makes reuploads safe.", "truth": "A disclaimer changes nothing. TikTok's guidelines make 'reproduced or unoriginal content imported or uploaded without any new or creative edits' ineligible for For You, and content that breaks someone else's copyright can be removed."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Open Account status and note any strikes and their dates. Each one drops off 90 days after it was issued.", "Find every paid or gifted post in the last 3 months and switch on the commercial content disclosure.", "Delete any video promoting betting or 'sure odds'.", "Remove any re-uploaded clip that still shows another app's watermark.", "Make sure you, not a younger sibling, own the account and know its login."]},
        {"type": "quiz", "q": "A Nairobi creator gets a bullying strike in January. According to TikTok, when does that strike stop counting toward a ban?", "options": ["Never, strikes are permanent", "After 30 days", "After 90 days", "After one year"], "answer": 2, "explain": "TikTok says strikes expire from an account's record after 90 days. Stacking several in one policy or feature within that window is what leads to a permanent ban, so space matters as much as content."},
        {"type": "takeaways", "items": ["99.9% of removed Kenyan videos were caught before anyone reported them. Assume the system sees everything.", "Strikes expire after 90 days, but severe violations mean a permanent ban on the first strike.", "Disclose paid posts, label realistic AI, and own everything said in your LIVE.", "Bought engagement breaks TikTok's rules. The ladder runs count removal, then reach limits, then feature blocks, then a ban."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Clean accounts get tested fairly. The Advanced TikTok Guide shows you how to win that test:", "items": ["Five numbers to check on every video, and the order that tells you why one stalled", "Four loop techniques that earn honest re-watches", "How to find when your own followers are online, so the first test doesn't flop while they sleep", "Selling from video in Kenya with KES prices and M-Pesa steps, no TikTok Shop needed"]},
        {"type": "sources", "items": [{"title": "TikTok Newsroom: Our new account enforcement system", "url": "https://newsroom.tiktok.com/account-enforcement-system?lang=en-GB"}, {"title": "TikTok Community Guidelines: Integrity and Authenticity", "url": "https://www.tiktok.com/community-guidelines/en/integrity-authenticity/"}, {"title": "TechCrunch: TikTok's new guidelines for LIVE creators, AI content and more (Aug 2025)", "url": "https://techcrunch.com/2025/08/15/tiktoks-new-guidelines-add-subtle-changes-for-live-creators-ai-content-and-more/"}, {"title": "Citizen Digital: TikTok removes over 820K Kenyan videos, bans 108K accounts", "url": "https://citizen.digital/article/tiktok-removes-over-820k-kenyan-videos-bans-108k-accounts-in-safety-crackdown-n383007"}]},
      ]},
      { id: "pr3", title: "YouTube: The Dos, Don'ts & Channel-Ending Mistakes", minutes: 7, body: [
        {"type": "hook", "text": "That 'I subscribe to you, you subscribe back' deal in your WhatsApp creators' group is named directly in YouTube's spam policy. It isn't a growth hack. It's a strike waiting to happen."},
        {"type": "p", "text": "YouTube is the most predictable platform about punishment, because it publishes its ladder. Learn it once and you'll never be surprised."},
        {"type": "table", "headers": ["Stage", "What happens"], "rows": [["First violation", "Usually just a **warning**. Complete YouTube's policy training and the warning expires after 90 days"], ["1st strike", "1 week with no uploads, live streams, custom thumbnails or Premieres. Lasts 90 days"], ["2nd strike (within 90 days)", "2 weeks with no posting"], ["3rd strike (within 90 days)", "The channel can be permanently removed"], ["Severe abuse", "Termination after a single case, with no warning"]]},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Ask viewers to like, subscribe and comment. That's allowed", "Join sub4sub groups or view-swap chains"], ["Make titles and thumbnails match what's in the video", "Promise 'FULL MATCH' and show a 2-minute clip"], ["Add real commentary, analysis or your own footage when you use clips", "Re-upload others' videos 'without adding anything of your own'"], ["Build series where each episode has its own focus", "Mass-produce near-identical template or AI videos"], ["Tick the altered or synthetic content box for realistic AI", "Pass off a realistic AI clip as real footage"], ["Comment as yourself on videos you actually watched", "Paste 'check out my channel' across hundreds of videos"], ["Link to your WhatsApp or shop as part of a useful video", "Make videos whose only purpose is to send people off YouTube"], ["Set 'made for kids' honestly", "Mislabel children's content to keep comments and personalised ads"], ["Use the YouTube Audio Library or music you have rights to", "Put a hit Bongo or gengetone track under your vlog without permission"], ["Vet anyone you hire to promote your channel", "Hire a promoter who sells views. YouTube holds you responsible"]]},
        {"type": "h3", "text": "What gets channels restricted or terminated"},
        {"type": "ul", "items": ["**Engagement manipulation.** Bots, coercion or rewards in exchange for views, likes or subscribers, including coordinated sub-for-sub schemes.", "**Misleading metadata.** Titles, thumbnails or descriptions designed to trick people into clicking.", "**Scams.** Get-rich-quick schemes, fake job offers and fake 'customer support' numbers.", "**Inauthentic content.** Since 15 July 2025, repetitive or mass-produced content (formerly called 'repetitious content') can't be monetised."]},
        {"type": "h3", "text": "The honest risk ladder for bought views"},
        {"type": "p", "text": "YouTube's fake engagement policy bans promoting services that boost views, likes or subscribers, and its Partner Program policies ban artificially inflating any metric. Here's how it usually escalates:"},
        {"type": "ol", "items": ["**Count removal.** Artificial views don't count and can be stripped from your totals.", "**Money held.** For monetised channels, YouTube can withhold or claw back earnings, with payment delays of up to 90 days while it investigates.", "**Feature blocks.** Strikes freeze uploads for 1 to 2 weeks.", "**Termination.** Removal from the Partner Program, or the channel itself."]},
        {"type": "myth", "myth": "A copyright claim is the same as a strike.", "truth": "They're different systems. A Content ID **claim** usually just sends the ad money to the music owner or blocks the video in some countries. A **copyright strike** comes from a formal takedown request. A **Community Guidelines strike** comes from breaking rules like spam or harassment. Three of either kind of strike puts a channel at risk."},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**KFCB and online video.** In May 2025 the High Court (Justice Mugambi) dismissed Eldoret creator William Getumbe's petition and held that the Films and Stage Plays Act covers any audio-visual recording shown to the public, amateur YouTube videos included. It also said pre-approving every upload is impractical.", "**Filming licences.** KFCB's 2026 notices said all filming in Kenya needs prior licensing, and its grace period for productions made from 2018 to 2026 closed on 4 June 2026. How this applies to small creators is still unclear, so commercial and sponsored shoots are the most exposed. Check with KFCB before a big production.", "**Betting sponsors.** BCLB's May 2025 rules ban creators from promoting gambling, so turn down that 'sponsored by' read."]},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Leave any sub4sub or view-swap WhatsApp group today.", "Open YouTube Studio, then Channel status (or Settings, then Channel, then Feature eligibility) and check for warnings or strikes.", "Compare your last 5 thumbnails with what's actually in each video. Fix any that over-promise.", "Check every video is set correctly for 'made for kids'.", "Swap any unlicensed music in your next upload for Audio Library tracks."]},
        {"type": "quiz", "q": "Which of these does YouTube's spam policy actually ALLOW?", "options": ["Joining a sub4sub group with real creators", "Ending your video with 'please like and subscribe'", "Commenting 'check out my channel' on 200 videos", "Linking to a site that sells views"], "answer": 1, "explain": "Asking your own viewers to like, subscribe or comment is fine. Swapping subscriptions, mass comment spam and promoting view sellers are all named as violations, even when the people involved are real."},
        {"type": "takeaways", "items": ["Learn the ladder: a warning, then 1-week and 2-week strikes, then possible termination at 3 strikes in 90 days.", "Sub4sub, misleading thumbnails and comment spam are named spam violations.", "Fake views don't count, can freeze your earnings, and can end a channel.", "In Kenya, a 2025 High Court ruling says film-classification law covers online video."]},
        {"type": "locked", "module": "yt_seo", "text": "Staying clean keeps your channel alive. YouTube SEO Mastery is about getting it found:", "items": ["The one-letter search trick that shows what Kenyans really type into YouTube, plus the A/B test that picks thumbnails by watch time", "Caption and description fixes for when auto-captions mishear Swahili words like 'sufuria'", "Four retention-graph shapes, what each one means, and how to fix it", "The full pre-monetisation checklist, including the KRA PIN step and the AI disclosure rule"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Community Guidelines strike basics", "url": "https://support.google.com/youtube/answer/2802032?hl=en"}, {"title": "YouTube Help: Spam policy", "url": "https://support.google.com/youtube/answer/2801973"}, {"title": "YouTube Help: YouTube channel monetisation policies (inauthentic and reused content)", "url": "https://support.google.com/youtube/answer/1311392?hl=en"}, {"title": "Radio Generation: Court upholds KFCB's authority to regulate social media content (May 2025)", "url": "https://radiogeneration.co.ke/kenya%20film%20classification%20board/13750/court-upholds-kfcbs-authority-to-regulate-social-media-content"}]},
      ]},
      { id: "pr4", title: "Facebook: The Dos, Don'ts & 'Facebook Jail' Mistakes", minutes: 7, body: [
        {"type": "hook", "text": "In the first half of 2025, Meta took down about **10 million** Facebook profiles pretending to be big creators. It also acted against around 500,000 accounts for spammy behaviour or fake engagement, from demoting their comments to cutting off their monetisation."},
        {"type": "p", "text": "'Facebook jail' isn't random. Meta runs a published **strike ladder**, and the early steps are warnings and feature limits, not bans. Two escape hatches most people miss: first-time violators can often **remove a strike** with a short course on the rule they broke (once every 12 months, not for the most serious violations), and Professional Dashboard shows why a post isn't being distributed and whether you're at risk of recommendation or monetisation penalties."},
        {"type": "table", "headers": ["Strikes", "Typical restriction (most violations)"], "rows": [["1", "A warning, nothing else"], ["2–6", "Some features limited for a while, e.g. posting in groups"], ["7", "1 day with no posting, commenting or creating Pages"], ["8", "3 days with no content creation"], ["9", "7 days with no content creation"], ["10+", "30 days with no content creation"]]},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Post mostly content you filmed or made yourself", "Repost other people's videos again and again. You lose monetisation for a period and reach on everything"], ["Add real voiceover, commentary or editing to clips you use", "Think stitching clips together or adding your logo makes them yours"], ["Upload the clean file from your editor", "Post videos still carrying TikTok or Instagram watermarks"], ["Tell a story with a beginning and an end", "Flood your Page with very short clips that offer little value"], ["Write relevant captions with 5 hashtags or fewer", "Stuff captions with links, ALL CAPS and hashtag walls"], ["Run your Page from your real profile, with two-factor login on", "Create fake profiles to like and share your own posts"], ["Ask real questions your audience wants to answer", "Post 'Type AMEN' or 'Comment YES if you agree' bait"], ["Use the branded content tool for paid posts", "Hide that a brand paid you"], ["Report anyone impersonating your Page", "Run a 'fan page' that looks like the real celebrity or brand"], ["Debate politics and policy hard", "Attack a tribe or community. That breaks Meta's rules and Kenyan law"]]},
        {"type": "h3", "text": "What gets Pages restricted or disabled"},
        {"type": "ul", "items": ["**Fake engagement and spam.** Meta's own numbers show half a million accounts actioned in six months, with penalties ranging from demoted comments to blocked monetisation.", "**Unoriginal content.** Since July 2025, accounts that repeatedly reuse others' videos, photos or text lose monetisation for a period and get reduced reach. Duplicate videos are also demoted.", "**Impersonation.** Pretending to be another creator or brand.", "**Severe content.** Child exploitation and terrorist material bring immediate action, including removing the account."]},
        {"type": "h3", "text": "The honest risk ladder for bought engagement"},
        {"type": "p", "text": "Buying likes, followers or shares breaks Meta's rules against inauthentic behaviour and fake engagement, and blocking monetisation is one of the penalties Meta lists for it. The usual escalation:"},
        {"type": "ol", "items": ["**Count removal and demotion.** Fake likes are removed and fake comments are pushed down.", "**Reach and money limits.** Recommendations are reduced and monetisation is blocked.", "**Feature blocks.** The strike ladder above.", "**Disable.** For repeat or severe offenders."]},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Election season is here.** In a July 2026 communiqué, the NCIC warned that online posts carry the same legal consequences as speeches at rallies, and called on influencers to show restraint. Section 62 of the NCIC Act criminalises words meant to stir up ethnic hatred.", "**Customer photos.** The Data Protection Act applies on Facebook too. Get a 'YES' before posting a customer, and a parent's YES for any child.", "**Marketplace and group sales.** 'Confirmation screenshots' are a common scam. Only release goods once the money shows in your own M-Pesa messages or app."]},
        {"type": "myth", "myth": "Adding my watermark or 'credit to the owner' makes a repost original.", "truth": "Meta says it doesn't. Its July 2025 guidance specifically says stitching clips together or adding your watermark doesn't count as meaningful enhancement. Commentary, voiceover and creative editing do."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Open Professional Dashboard, then Support home (or Account status), and screenshot any warnings.", "If you have exactly one first-time strike, check whether the 'remove the warning' course is offered.", "Delete or re-edit any post that still shows another app's watermark.", "Rewrite your next 3 captions without engagement bait or hashtag walls.", "Read your last 10 political posts the way an NCIC officer would."]},
        {"type": "quiz", "q": "Your Facebook Page has 4 strikes for low-level violations. Under Meta's usual ladder, what are you most likely facing?", "options": ["A 30-day ban", "Limits on some features, like posting in groups, for a while", "Immediate deletion of the Page", "Nothing at all"], "answer": 1, "explain": "Strikes 2 to 6 usually bring time-limited feature restrictions. Full content-creation blocks start at 7 strikes, and 30-day blocks at 10. Knowing your count lets you slow down before it bites."},
        {"type": "takeaways", "items": ["Facebook jail follows a ladder: warning, feature limits, then 1, 3, 7 and 30-day blocks.", "First-time strikes can often be removed with a short course, once a year.", "Reposts, watermarks and engagement bait cost you reach and monetisation.", "Bought engagement breaks Meta's rules and never counts toward monetisation. In Kenya, election-season speech carries legal risk too."]},
        {"type": "locked", "module": "fb_monetize", "text": "A clean Page is a Page that can get paid. The Facebook Monetization Blueprint picks up from here:", "items": ["A 5-step monthly check that finds the video getting you restricted before Facebook tells you", "The 20-post audit that shows which payout path fits your Page", "Simple maths that turns views, RPM and Stars (1 US cent each) into a realistic KES figure", "A rate card and pitch that gets local brands to say yes, so you're not relying on ad revenue alone"]},
        {"type": "sources", "items": [{"title": "Meta for Creators: Combating unoriginal content on Facebook (Jul 2025)", "url": "https://creators.facebook.com/blog/combating-unoriginal-content"}, {"title": "GFMD Tech & Journalism: Meta's account restriction ladder explained", "url": "https://tech-and-journalism-mechanism.gfmd.info/tools-resources/tech-platforms/meta"}, {"title": "PhoneArena: Meta expands strike-removal course to Facebook and Instagram", "url": "https://www.phonearena.com/news/meta-strike-removal-feature-instagram-facebook_id165584"}, {"title": "Capital FM: Digital posts carry same consequences as public speeches, NCIC warns", "url": "https://capitalfm.africa/digital-posts-carry-same-legal-consequences-as-public-speeches-ncic-warns-as-election-rhetoric-escalates/"}]},
      ]},
      { id: "pr5", title: "X (Twitter): The Dos, Don'ts & Suspension Mistakes", minutes: 6, body: [
        {"type": "hook", "text": "Since 8 September 2026, X only pays for **original** posts. Put 'Wueh, look at this 😂' on someone else's viral video and it earns you nothing, however many views it gets."},
        {"type": "p", "text": "X replaced Creator Revenue Sharing with the **Original Content Rewards** programme. To qualify you must be 18 or older, pay for Premium, Premium+ or Premium Business, have at least **500 verified followers**, and get **500,000 home-timeline views from verified users** in 90 days. Only Premium users' impressions count, and you have to keep meeting the bar to keep getting paid. Check in the app whether it's open in your country before you pay for Premium."},
        {"type": "p", "text": "Kenya has history here. A 2021 Mozilla Foundation study found about 3,700 accounts behind at least 11 paid 'hashtag for hire' campaigns, with some influencers paid around $10–15 a day via M-Pesa. Twitter then took action against more than 100 Kenyan accounts under its platform manipulation policy."},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Post your own writing, photos, reporting and memes", "Repost viral clips with a caption that just describes them"], ["Use one or two hashtags that fit the post", "Hijack a trending national hashtag to sell your wigs or phones"], ["Reply thoughtfully to people you follow", "Send bulk, unsolicited replies, mentions or DMs"], ["Run separate accounts for separate purposes (X allows up to ten that don't duplicate each other)", "Use several accounts to boost the same posts or push a trend"], ["Follow people whose posts you actually read", "Follow and unfollow in bulk to pad your numbers"], ["Argue hard about ideas", "Target people with abuse, or communities with ethnic insults"], ["Mark parody and fan accounts clearly", "Pose as a real person, company or government office"], ["Keep your handle and account yours", "Buy or sell accounts or handles. That can mean instant suspension"], ["Verify before you post breaking news", "Share fake documents or doctored clips, especially in protest or election periods"], ["Disclose paid posts clearly", "Take money to push a political hashtag without saying so"]]},
        {"type": "h3", "text": "What X's rules say gets you restricted"},
        {"type": "p", "text": "X's platform manipulation and spam policy bans inflating likes, reposts or poll votes (including through third-party apps), buying or selling followers or engagement, follow churn, coordinated activity across fake or automated accounts, and hashtag or keyword spam."},
        {"type": "h3", "text": "The honest risk ladder for bought engagement"},
        {"type": "ol", "items": ["**Reduced visibility.** Posts are hidden from parts of X or kept out of recommendations.", "**Anti-spam challenges.** The account is locked until you verify a phone number or solve a reCAPTCHA.", "**Feature limits and forced deletions.** Posting, DMs, Spaces or Live can be restricted, or you're told to delete posts before you can carry on.", "**Permanent suspension.** For repeat offences, or straight away for severe ones such as selling accounts."]},
        {"type": "insight", "label": "The detail most people miss", "text": "Buying followers is named in X's policy, and so is **selling** them. A creator who resells engagement or 'trend slots' to others is breaking the same rule on the other side. And the payout bar counts **verified** followers and Premium users' views, which cheap bulk followers usually aren't."},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Elections 2027.** The NCIC says online posts carry the same legal consequences as public speeches, and it has called on influencers to show restraint.", "**Cyber law.** The High Court's July 2026 ruling removed the 'likely to cause suicide' clause and NC4's power to block websites without a court. Harassment, phishing and identity-theft offences under the Computer Misuse and Cybercrimes Act still apply.", "**Paid trends.** Pushing a hashtag for cash without disclosure breaks X's rules on coordinated activity. If a campaign spreads ethnic hatred, it can also break the NCIC Act."]},
        {"type": "myth", "myth": "Using hashtags gets you shadowbanned on X.", "truth": "X's policy targets **excessive, unrelated** hashtags and hijacking trends to push something. One or two relevant tags are fine. The thing that actually reduces visibility is spammy behaviour: bulk replies, duplicate posts, and coordinated accounts."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Delete any post where you used a trending hashtag that has nothing to do with your content.", "List every account you control. Merge or delete any that duplicate each other.", "Leave any 'retweet group' or paid trend WhatsApp group.", "If you're aiming for payouts, check your verified-follower count and Premium impressions in the monetisation dashboard."]},
        {"type": "quiz", "q": "Under X's Original Content Rewards, which of these earns you nothing?", "options": ["A thread with your own analysis of the Finance Bill", "Photos you took at a Nairobi event", "Someone else's viral video with your caption 'Wueh, look at this'", "A meme you created"], "answer": 2, "explain": "X counts your own writing, photos, reporting and memes, plus clips you add real commentary to or creatively edit. A caption that just describes someone else's video doesn't qualify."},
        {"type": "takeaways", "items": ["X now pays only for original content, and only from verified users' impressions.", "Buying, selling, follow churn, trend hijacking and multi-account boosting are all named violations.", "The ladder runs reduced visibility, then challenges, then feature limits, then suspension.", "In Kenya, election-season posts and paid political trends carry legal risk as well as platform risk."]},
        {"type": "locked", "module": "branding_pro", "text": "X rewards people with a clear voice and punishes hot-take chaos. The Personal Branding Blueprint helps you build the first and survive the second:", "items": ["Why lasting damage comes from your first hour, not the mistake itself, plus the exact holding and apology posts", "The three-circle test for a niche you won't be bored of in six months", "The 'voice is never' list that keeps you consistent on bad days", "How to move your best followers onto a channel you own, so one suspension can't wipe you out"]},
        {"type": "sources", "items": [{"title": "X Help Center: Platform manipulation and spam policy", "url": "https://help.x.com/rules-and-policies/platform-manipulation"}, {"title": "Engadget: X is replacing revenue sharing with an Original Content Rewards program (2026)", "url": "https://www.engadget.com/2232981/x-replacing-revenue-sharing-with-original-content-rewards-program/"}, {"title": "Mozilla Foundation: Inside the shadowy world of disinformation-for-hire in Kenya", "url": "https://www.mozillafoundation.org/en/blog/fellow-research-inside-the-shadowy-world-of-disinformation-for-hire-in-kenya/"}, {"title": "HapaKenya: High Court declares 2 sections of the Cybercrimes Amendment Act unconstitutional (Jul 2026)", "url": "https://hapakenya.com/2026/07/02/high-court-declares-2-sections-of-cybercrimes-amendment-act-as-unconstitutional/"}]},
      ]},
      { id: "pr6", title: "Telegram: The Dos, Don'ts & Spam-Limit Mistakes", minutes: 6, body: [
        {"type": "hook", "text": "For three years running (2023, 2024 and 2025), Telegram went dark for Kenyan users on the first day of KCSE exams. On 3 November 2025, NetBlocks measured it at **0% reachability on Safaricom**. If your business lives only on Telegram, you don't fully control when it's open."},
        {"type": "p", "text": "Telegram's Terms of Service are short. You agree not to send spam or scam users, not to promote violence or post illegal pornography on **publicly viewable** channels and bots, and not to do things that are illegal in most countries. Break them and you face a temporary or permanent ban."},
        {"type": "stat", "value": "29.1M", "label": "groups and channels Telegram says it has blocked so far in 2026, using user reports, machine learning and AI tools (Telegram moderation overview)"},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Let people join through your invite link or QR code", "Add strangers to your group or channel without asking"], ["Share your own notes, tips and resources", "Share pirated movies, paid courses or 'KCSE leaks'"], ["Pin clear group rules and use slow mode and admin tools", "Let your group fill up with spam links. Admins can report it"], ["Post promos inside your own channel", "Cold-DM strangers with links, ads or invite links"], ["Register with your own real SIM", "Rely on virtual or VoIP numbers, which can be limited unfairly"], ["Contact @SpamBot if you were limited by mistake", "Open new accounts to keep sending the same messages"], ["Keep a WhatsApp or email backup of your best members", "Let Telegram be the only place your customers can find you"], ["Talk money and markets responsibly", "Run 'forex doubling' or 'sure odds' channels"], ["Report scam accounts and channels", "Forward 'earn by liking videos' task offers to friends"]]},
        {"type": "h3", "text": "How Telegram's spam limits actually work"},
        {"type": "p", "text": "When people tap **Report spam** on your messages, moderators review them. If they agree, your account is limited: you can't message strangers, but you can still message people who saved your number and reply to anyone who wrote first. Telegram says people especially dislike unsolicited ads, links, invite links and anything about 'commerce' or 'online popularity'."},
        {"type": "ol", "items": ["**First limit.** Usually a few days of no messaging strangers.", "**Repeat offences.** Longer and longer limits.", "**Permanent limit.** You can never message strangers again.", "**Ban.** For scams, illegal content or serious ToS breaches, a temporary or permanent ban, and channels can be blocked."]},
        {"type": "insight", "label": "The thing people waste hours on", "text": "Telegram's spam FAQ says plainly that admitting your mistake to @SpamBot will **not** get you released early. The bot is for genuine errors only. Pleading just wastes time, so wait the limit out and change what you send."},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Task scams.** Meta has described networks that offer pay for 'social media tasks' on WhatsApp, move victims to Telegram to like TikTok videos, then demand deposits to 'unlock' bigger earnings. In Kenya, fake task groups charged M-Pesa 'registration fees' of about KES 150–1,000 in 2025.", "**Doubling schemes.** Kenyan Telegram groups promising same-day forex or crypto doubling took deposits of KES 3,000–20,000 in 2025 and often vanished overnight. Promoting them can drag you into a fraud case.", "**Exam leaks.** Sharing or selling 'leaked' KCSE papers is a crime, and it's the reason Telegram gets restricted every November.", "**Gambling tips.** BCLB's May 2025 rules bar creators from promoting gambling on any platform. Telegram isn't an exception."]},
        {"type": "myth", "myth": "My group is private, so Telegram's rules don't apply.", "truth": "Only the violence and pornography rules are limited to public channels. The bans on spam, scams and illegal activity apply everywhere, and Kenyan law applies wherever you post."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Check your account: try to start a chat with a non-contact. If you're limited, read the @SpamBot reply.", "Turn on slow mode and pin a rules message in every group you run.", "Remove any member-adding bot or 'add 50 members' tool you've used.", "Post one message inviting your channel members to also join your WhatsApp Channel or email list."]},
        {"type": "quiz", "q": "Your Telegram account is limited for spam, and you're sure you did send those promo DMs. What does Telegram say about apologising to @SpamBot?", "options": ["It lifts the limit straight away", "It won't get you released early", "It deletes your account", "It doubles the limit"], "answer": 1, "explain": "Telegram's FAQ says getting released early just because you admit the mistake isn't possible. @SpamBot is for limits applied in error. Wait it out and stop the unsolicited messages."},
        {"type": "takeaways", "items": ["Telegram does moderate: more than 29 million groups and channels blocked so far in 2026.", "Spam reports trigger limits that grow with every repeat. Apologies don't shorten them.", "Spam, scam and illegal-activity rules apply in private groups too.", "Kenya restricts Telegram every KCSE season, so always keep a backup channel."]},
        {"type": "locked", "module": "branding_pro", "text": "Telegram can switch off without warning. The Personal Branding Blueprint shows you how to build an audience that survives it:", "items": ["The lead-magnet setup that keeps customers reachable whatever the algorithm or a shutdown does", "How to choose between a WhatsApp broadcast, a WhatsApp Channel, Telegram and email for your audience", "The positioning sentence and content pillars that make people want to follow you somewhere else", "Ready-made holding and apology templates for when a group blows up"]},
        {"type": "sources", "items": [{"title": "Telegram: Terms of Service", "url": "https://telegram.org/tos"}, {"title": "Telegram: Spam FAQ (account limits and @SpamBot)", "url": "https://telegram.dog/faq_spam"}, {"title": "Telegram: Moderation overview", "url": "https://telegram.org/moderation"}, {"title": "Tech-ish: Telegram blocked in Kenya for KCSE, third year in a row (Nov 2025)", "url": "https://tech-ish.com/2025/11/03/telegram-blocked-in-kenya-kcse"}]},
      ]},
      { id: "pr7", title: "WhatsApp Business: The Dos, Don'ts & Number-Ban Mistakes", minutes: 7, body: [
        {"type": "hook", "text": "A Kenyan lender was ordered to pay **KES 400,000** to one man for sending him loan promos by SMS and phone that he'd never agreed to. Your WhatsApp broadcasts fall under the same Data Protection Act."},
        {"type": "p", "text": "In that case (ODPC Complaint No. 1951 of 2024, against Platinum Credit), the man had never given the company his data or his consent. Now picture a salon blasting offers to 600 numbers copied out of a chama group. WhatsApp's Business Messaging Policy says the same thing: only message people who gave you their number **and** agreed to hear from you, and respect every request to stop. Break it and WhatsApp can limit or remove your access, and for terminated accounts it can bar your business for good."},
        {"type": "stat", "value": "6.8M", "label": "WhatsApp accounts banned in the first half of 2025 for links to organised scam centres (Meta, via The Daily Star)"},
        {"type": "table", "headers": ["DO", "DON'T"], "rows": [["Message customers who gave you their number and said yes", "Buy number lists or copy members out of groups"], ["End promos with 'Reply STOP to opt out', and honour every STOP", "Keep messaging people who asked you to stop"], ["Use the official WhatsApp Business app", "Use GB WhatsApp, WhatsApp Plus or other modded apps"], ["Use broadcast lists (they only reach people who saved your number)", "Use bulk-sender or auto-messaging tools on a normal number"], ["Ask before adding anyone to a group", "Add strangers to groups. WhatsApp now shows them a safety notice and an easy exit"], ["List clothes, food, beauty services and handmade goods in your catalogue", "List alcohol, vapes, live animals, prescription drugs, betting or shared Netflix/Showmax logins in the catalogue"], ["Confirm payment in your own M-Pesa message or app", "Release goods because someone sent a 'confirmation' screenshot"], ["Turn on two-step verification (a 6-digit PIN)", "Share your registration code with anyone, even 'Safaricom'"], ["Use your real business name and photo", "Name your profile 'M-Pesa Support' or copy a brand's logo"], ["Keep messages useful and occasional", "Send five promos a day until people block you"]]},
        {"type": "h3", "text": "What gets numbers restricted or banned"},
        {"type": "ul", "items": ["**Being blocked or reported by lots of people** in a short time. Blocks and reports hurt a business's quality rating, and when quality stays low WhatsApp rate-limits the business.", "**Bulk or automated messaging** at a speed no human could manage.", "**Unofficial apps.** WhatsApp has temporarily banned users of mods like GB WhatsApp and told them to switch to the official app.", "**Selling prohibited items.** WhatsApp's Commerce Policy (which follows Meta's Commerce Policy) bans categories including alcohol, tobacco, animals, real-money gambling, adult products, weapons, and digital subscriptions or accounts."]},
        {"type": "h3", "text": "The risk ladder: no likes to remove, so it starts higher"},
        {"type": "ol", "items": ["**Quality drop and rate limits.** Fewer messages get delivered.", "**Temporary ban.** Common with modded apps and mass messaging.", "**Permanent ban.** You lose the number on WhatsApp, and with it your chats, catalogue and customer list. Warnings aren't guaranteed."]},
        {"type": "template", "label": "Opt-in message (send once, keep the replies)", "text": "Hi [Name]! 👋 This is [Business] in [Area]. We send new stock and offers on WhatsApp about once a week.\nWould you like to receive them? Reply YES to join.\nYou can reply STOP any time and we'll remove you. Asante!"},
        {"type": "h3", "text": "Kenyan specifics"},
        {"type": "ul", "items": ["**Consent is law, not courtesy.** Under the Data Protection Act, marketing needs consent. The Platinum Credit case shows one complaint can cost hundreds of thousands of shillings.", "**Fake job tasks.** The DCI has warned about unsolicited WhatsApp 'work from home' offers that later ask you to download an app to get paid. The app can be malware. Block those numbers.", "**No betting promos on Status.** BCLB's May 2025 rules ban creators from promoting gambling on any platform, and your Status counts."]},
        {"type": "myth", "myth": "A broadcast list is private, so consent doesn't matter.", "truth": "Private delivery doesn't change the law or WhatsApp's policy. Both require opt-in. Broadcasts also only reach people who saved your number, which is why saving your number is the cleanest proof that someone wants to hear from you."},
        {"type": "action", "label": "Your 10-minute rules audit", "items": ["Send the opt-in template to your broadcast list and remove anyone who doesn't reply YES within a week.", "Check your app came from the Play Store or App Store, not an APK site.", "Turn on two-step verification: Settings, then Account, then Two-step verification.", "Go through your catalogue and remove anything on the prohibited list.", "Add 'Reply STOP to opt out' to your next promo."]},
        {"type": "quiz", "q": "Which of these is banned from your WhatsApp Business catalogue under the Commerce Policy?", "options": ["Handmade Maasai sandals", "Shared Netflix or Showmax account logins", "Birthday cakes", "Mitumba jackets"], "answer": 1, "explain": "WhatsApp's Commerce Policy prohibits selling digital content, subscriptions and accounts. Reselling streaming logins is a popular side hustle, and it can get a business number restricted."},
        {"type": "takeaways", "items": ["Only message people who agreed to hear from you. That's WhatsApp policy and Kenyan law.", "Blocks, reports, mods and bulk tools are the fastest ways to lose a number.", "Check your catalogue against the Commerce Policy. Alcohol, animals and digital subscriptions are out.", "WhatsApp bans can be permanent and come without warning, so back up your customer list."]},
        {"type": "locked", "module": "business_pro", "text": "WhatsApp works best as one layer of a proper sales system. The Business Scale-Up Guide builds the rest:", "items": ["The 4-layer stack (Google profile, social proof, WhatsApp plus M-Pesa checkout, retention) and the order to set it up", "How to work out what a customer is allowed to cost you, e.g. why a KES 9,000 customer can justify up to KES 3,000 to win", "The retargeting sequence aimed at people who visited but didn't buy, the cheapest ads you'll ever run", "A 5-column monthly sheet that shows which shilling is actually earning its keep"]},
        {"type": "sources", "items": [{"title": "WhatsApp Business Messaging Policy", "url": "https://whatsappbusiness.com/policy/"}, {"title": "Meta for Developers: Get opt-in for WhatsApp (quality rating and blocks)", "url": "https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in"}, {"title": "Capital FM: ODPC orders Platinum Credit to pay KES 400,000 over unsolicited messages", "url": "https://capitalfm.africa/odpc-platinum-credit-fined-400k-unlawful-data-use/"}, {"title": "The Daily Star: WhatsApp banned 6.8 million accounts linked to scams (Aug 2025)", "url": "https://www.thedailystar.net/tech-startup/news/whatsapp-banned-68-million-accounts-linked-scams-3958706"}]},
      ]},
    ],
  },
  {
    id: 'rescue', icon: '🚑', title: 'Account Rescue: When Things Go Wrong',
    blurb: "The first hour after a hack, ban, reach crash, copyright hit, frozen payout or impersonation, platform by platform",
    lessons: [
      { id: "rs1", title: "Hacked: The First 60 Minutes and the Official Way Back In", minutes: 7, body: [
        {"type": "hook", "text": "Telegram gives you a **24-hour head start** against a hacker. A device that has just logged in can't kick out older sessions for its first 24 hours. If you act inside that window, your own phone can throw the intruder out."},
        {"type": "p", "text": "Every platform has small rules like that, and they decide who wins the race for your account. Here's the first-hour plan, the official route for each app, and what to tell followers while you get back in."},
        {"type": "stat", "value": "9 months", "label": "how far back YouTube's support can help with a hacked channel. Older incidents may not be recoverable because of data retention (YouTube Help: Recover a hacked channel)"},
        {"type": "h3", "text": "The first 60 minutes, in order"},
        {"type": "ol", "items": ["**Check your phone signal.** 'No service' where you normally have network can mean a SIM swap. From another phone, call Safaricom on 100 (prepaid) or 200 (postpaid), or +254 722 002 100 from any network. Airtel: 100 from an Airtel line or 0733 100 100 from other networks.", "**Rescue your email first.** Every other account resets through it. For Gmail, use accounts.google.com/signin/recovery.", "**Start the official recovery route** for the hacked app (table below). Meta says its recovery now checks trusted devices and past login locations, so try from the phone and Wi-Fi you normally use.", "**Once you're in, lock the doors.** Change the password, log out every other session, remove any email or phone number you don't recognise, and turn 2FA on.", "**Undo the damage fast.** Delete posts the hacker made, fix your bio link, and check payout details. YouTube says quick clean-up can help you avoid strikes for content you didn't post.", "**Warn your followers** from a channel you still control (template below).", "**Screenshot everything**: security emails, times and messages. You'll need it for appeals and any police report."]},
        {"type": "h3", "text": "The official route for each platform"},
        {"type": "table", "headers": ["Platform", "Where to start", "Know this"], "rows": [["Instagram", "instagram.com/hacked", "Covers hacked accounts, forgotten passwords and lost 2FA access. An optional video selfie may be offered."], ["Facebook", "facebook.com/hacked", "Report the account as compromised even if you can still log in."], ["TikTok", "Login screen > Report a problem", "Have your old email or phone, the devices you used and screenshots ready as proof."], ["YouTube", "Recover the Google Account first, then the hacked-channel assistant: support.google.com/youtube/?p=ytRecoveryCawf", "Partner Program creators can contact Creator Support once the Google Account is back. Others can try @TeamYouTube on X."], ["X", "'Forgot password', then a Support Request from the account's email", "Include your username and the date you last had access."], ["Telegram", "Settings > Devices > Terminate all other sessions", "Locked out? Use telegram.org/support or Settings > Ask a question. Nowhere else."], ["WhatsApp", "Re-register your number with the 6-digit code", "This logs out every other device. If a PIN you don't know appears, a recovery email resets it; without one you wait 7 days."], ["EndaViral", "Open a support ticket with your order ID", "Do this if an order was delivering to the account when it was hijacked or renamed."]]},
        {"type": "insight", "label": "What most people miss about the video selfie", "text": "Meta's optional video selfie is compared against **photos already on the account**, and Meta says the facial data is deleted after the check. If your profile has never shown your face, there may be nothing to match. Then you'll need another route, like ID or a recovery email."},
        {"type": "myth", "myth": "Once I reset the password, the hacker is out.", "truth": "Not always. Sessions that are already logged in can stay alive, and hackers often add their own email, phone or 2FA so they can come back. After a reset, log out all other sessions and check every recovery detail and connected app."},
        {"type": "callout", "label": "Recovery is free. 'Recovery agents' are not", "text": "In June 2026 KrebsOnSecurity reported attackers tricking Meta's AI support chat into adding their email to Instagram accounts. Meta said it was fixed, and the hackers said it failed on accounts with 2FA on. Use only official routes. Anyone who DMs offering to 'recover' your account for a fee is a second scam."},
        {"type": "template", "label": "Follower warning (post on WhatsApp Status or another account)", "text": "Heads up: my [Instagram/TikTok] account @[handle] was hacked on [date]. I'm recovering it through the official [Instagram/TikTok] process.\nUntil I confirm here that it's fixed:\n- I am NOT selling anything, running giveaways or asking for M-Pesa.\n- Don't click links or send any code that account asks for.\n- If it DMs you for money, report it and block.\nPlease share so nobody gets conned. - [Your name]"},
        {"type": "action", "label": "Do this today (even if you're not hacked)", "items": ["Save this lesson's table in your phone notes so it's there when you're panicking.", "Write your telco's fraud number on paper: Safaricom 100/200, Airtel 100.", "On Telegram, open Settings > Devices and end any session you don't recognise.", "Make sure at least one photo on your Instagram or Facebook clearly shows your face, so a video selfie has something to match."]},
        {"type": "quiz", "q": "A stranger logged into your Telegram on a new phone 3 hours ago. You're still logged in on yours. What should you do right now?", "options": ["Wait for Telegram support to reply", "Terminate all other sessions from your phone immediately", "Delete your account and start again", "Message the hacker and ask them to log out"], "answer": 1, "explain": "A new device can't end your older session for its first 24 hours, but your phone can end its session. After 24 hours the hacker can lock you out, so act inside that window."},
        {"type": "takeaways", "items": ["Phone signal and email come first. A SIM swap or lost inbox unlocks everything else.", "Use only official routes like instagram.com/hacked, facebook.com/hacked and Google account recovery.", "After getting back in, end every session and remove the hacker's email, phone and 2FA.", "Warn followers from a channel you control, and screenshot everything."]},
        {"type": "locked", "module": "branding_pro", "text": "A hack shows how fast an audience you don't own can disappear. Personal Branding Blueprint shows how to keep a line to your people that no hacker can take:", "items": ["The owned-channel table: WhatsApp broadcast list vs WhatsApp Channel vs Telegram vs email, and the catch with each", "A lead-magnet call to action and welcome message that get followers to opt in", "The consent log that keeps your contact list legal under Kenya's Data Protection Act", "Ready-to-send holding message and correction post for when something goes wrong in public"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Recover a hacked YouTube channel", "url": "https://support.google.com/youtube/answer/76187?hl=en"}, {"title": "KrebsOnSecurity: Hackers used Meta's AI support bot to seize Instagram accounts (June 2026)", "url": "https://krebsonsecurity.com/2026/06/hackers-used-metas-ai-support-bot-to-seize-instagram-accounts/"}, {"title": "Kaspersky: What to do if your Telegram account is hacked", "url": "https://www.kaspersky.com/blog/telegram-account-hacked/52775/"}, {"title": "Safaricom: Contact us", "url": "https://safaricom.co.ke/about/contact-us"}]},
      ]},
      { id: "rs2", title: "Disabled, Suspended or Banned: Appeals That Work (and the Move That Kills Them)", minutes: 7, body: [
        {"type": "hook", "text": "Once a YouTube channel is terminated, YouTube says you may not **use, possess or create any other channel**. The 'backup account' most people open while they appeal can turn a fixable ban into a permanent one."},
        {"type": "p", "text": "A ban notice feels final, but most aren't. Each platform has a review route with a time limit, and the people who get accounts back usually do three things: they read the notice properly, appeal once with evidence, and stay quiet everywhere else while they wait."},
        {"type": "stat", "value": "1 year", "label": "how long you have to appeal a YouTube channel termination, with a limit of two appeals in that year (YouTube Help: Channel or account terminations)"},
        {"type": "h3", "text": "Read the notice before you touch anything"},
        {"type": "ul", "items": ["**What was hit?** One post removed, a feature restricted (like comments or live), the account suspended for a set time, or disabled.", "**Which rule?** Notices usually name the policy. Your appeal must answer that exact rule, not 'I did nothing wrong'.", "**What's the deadline?** Screenshot the notice with its date. Some windows are short: YouTube gives 21 days to appeal a Partner Program suspension.", "**Is there a reference ID?** On Meta, an ID starting FB or IG means that decision can go further, to the Oversight Board."]},
        {"type": "table", "headers": ["Platform", "Appeal route", "Time limit / rule"], "rows": [["Instagram & Facebook", "Tap the notice, or Settings > Account > Account Status > Request a review", "Use the deadline on your notice. Screenshot it the day you get it."], ["Oversight Board (Meta)", "oversightboard.com, using the FB/IG reference ID from Meta's final decision", "Content decisions only. Your account must not be disabled and you must be able to log in."], ["TikTok", "Inbox > System notifications > tap the notice > Appeal. Also Account status in the Safety Center", "Strikes expire from your record after 90 days."], ["YouTube (strike)", "Appeal from the notice in YouTube Studio", "A first violation is usually a warning. Strikes last 90 days, and 3 in 90 days can end the channel."], ["YouTube (termination)", "YouTube Studio channel appeal page > Begin Review", "Up to 1 year, two appeals at most."], ["X", "Log into the suspended account, then appeal at help.x.com/forms/general?subtopic=suspended", "Answer X's emails quickly and check your spam folder."], ["EndaViral", "Open a ticket with your order ID", "If an order was running when the account went down, don't re-order. Ask support what happens to it."]]},
        {"type": "h3", "text": "The appeal plan"},
        {"type": "ol", "items": ["Screenshot the notice, the date and any reference ID.", "Find the exact policy named and read it in full.", "Collect proof: your ID if it's an identity issue, licences or receipts if it's a content issue, dates if you were hacked.", "Write one calm appeal that answers that rule (template below). One appeal, not ten.", "Wait. Don't post the same content again, and don't create, borrow or 'revive' other accounts.", "Log every reply. If you're rejected and a further route exists (Oversight Board, a second YouTube appeal), use it with new information."]},
        {"type": "template", "label": "Appeal message (adapt to the policy named)", "text": "Hello, my account @[handle] was [disabled/suspended/restricted] on [date] for [policy named in the notice].\nI believe this is a mistake because [one or two specific facts, e.g. the video is my own original recording / the account was hacked between (dates) and those posts were not mine].\nEvidence: [what you're attaching: ID, licence, screenshots of the hack emails].\nSince then I have [secured the account / removed the post in question / reviewed the guidelines].\nI'm a [small business / creator] in [town], and this account is how my customers reach me. I'd be grateful for a human review.\n[Name], [email on the account]"},
        {"type": "myth", "myth": "Meta Verified gets a banned account back.", "truth": "Meta Verified (about USD 8 a month when it reached Kenya in 2023) gives access to account support, not a ruling in your favour. In 2025 TechCrunch reported paying subscribers stuck for weeks or months after wrongful bans. It can be a faster line to a human, but it's no override."},
        {"type": "callout", "label": "What NOT to do while you wait", "text": "Don't open a new account to carry on posting. YouTube treats that as circumvention, and X treats it as evading a suspension. Don't tag support from friends' accounts, don't file duplicate appeals, and never pay an 'unban agent' who says they know someone at Meta or TikTok."},
        {"type": "insight", "label": "The second chance few people know exists", "text": "YouTube is piloting a way for some terminated creators to **request a new channel**, but only a year after termination. It isn't open to channels terminated for copyright infringement. Starting a channel on your own before then breaks the rules; waiting and asking officially doesn't."},
        {"type": "quiz", "q": "Your YouTube channel was terminated and you think it was a mistake. While your appeal is pending, what's the safest move?", "options": ["Upload to a cousin's channel so your audience doesn't forget you", "Create a new channel under a slightly different name", "Appeal from YouTube Studio and don't use any other channel", "Submit a new appeal every day until someone answers"], "answer": 2, "explain": "After termination YouTube bars you from using, owning or creating other channels, including ones where you feature prominently. You have up to a year and two appeals, so use them carefully."},
        {"type": "takeaways", "items": ["Read the notice: what was hit, which rule, which deadline, and whether there's a reference ID.", "Appeal once, through the official route, answering the exact policy with evidence.", "New accounts, borrowed accounts and duplicate appeals can make a ban permanent.", "Meta Verified buys access to support, not a guaranteed unban."]},
        {"type": "locked", "module": "ig_reels_pro", "text": "Getting the account back is step one. The Instagram Reels Growth Engine shows how to keep it in good standing and get momentum back:", "items": ["The monthly Account Status check to add to your tracker, and what to do with each flagged post", "How to restart after going quiet without posting five Reels in one day", "A 90-day consistency tracker you can copy into your notes app", "Trial Reels: test new ideas on non-followers without risking your main grid"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Channel or account terminations", "url": "https://support.google.com/youtube/answer/2802168?hl=en"}, {"title": "YouTube Help: Community Guidelines strike basics", "url": "https://support.google.com/youtube/answer/2802032?hl=en"}, {"title": "Oversight Board: Frequently asked questions", "url": "https://oversightboard.com/faq/"}, {"title": "TechCrunch: Meta Verified subscribers struggle to get help after bans (2025)", "url": "https://techcrunch.com/?p=3024193"}]},
      ]},
      { id: "rs3", title: "Reach Crashed? Diagnose a 'Shadowban' Before You Panic", minutes: 7, body: [
        {"type": "hook", "text": "Instagram has a screen that tells you, in plain words, whether your posts can be shown to people who don't follow you. Most creators who complain about a 'shadowban' have never opened it."},
        {"type": "p", "text": "Mosseri has said 'shadowbanning is not a thing'. Platforms do limit reach, though. They just use different names: Instagram says content is 'not eligible to be recommended', and TikTok calls it 'ineligible for the For You feed'. The good news is that both now tell you when it happens, if you know where to look."},
        {"type": "stat", "value": "90 days", "label": "how long a TikTok strike stays on your record before it expires. Hitting a strike threshold in one policy or feature can mean a permanent ban (TikTok, 2023, via Dhaka Tribune)"},
        {"type": "h3", "text": "The 10-minute diagnosis"},
        {"type": "ol", "items": ["**Instagram:** Settings > Account > Account Status (professional accounts; menus vary by app version). Check whether your content can be recommended to non-followers.", "**TikTok:** open Account status or Account check in the Safety Center. Account check reviews your last 30 posts and shows any restrictions on comments or messages.", "**YouTube:** Studio > Analytics > Reach. If impressions fell, distribution changed. If impressions held but click-through fell, your titles and thumbnails stopped working.", "**Compare against your own normal.** Use the middle result of your last 10 posts, not your one viral hit.", "**Split followers vs non-followers** in Insights. That split usually tells you whether it's a restriction or just a weak post."]},
        {"type": "table", "headers": ["Platform", "Where to check", "What a restriction looks like", "How to fix"], "rows": [["Instagram", "Settings > Account > Account Status", "'Not eligible to be recommended', with example posts or profile parts", "Edit or delete the flagged item, or tap Request a review"], ["TikTok", "Safety Center > Account status / Account check", "A notice that your account is ineligible for the For You feed. Content also gets harder to find in search", "Appeal from the notice, and stop posting the type of content that was flagged"], ["YouTube", "Studio > Analytics > Reach; Studio > Content > Restrictions column", "No 'status' screen for reach. Look for copyright or ad-suitability restrictions on specific videos", "Fix the restriction, or check whether the drop is impressions or click-through"], ["EndaViral", "My Orders, then a ticket with the order ID", "Delivered followers or likes dropping after an order", "Ask support what the service covers. Don't re-order to 'top up'"]]},
        {"type": "insight", "label": "The signature of a real restriction", "text": "Instagram says content that breaks its Recommendation Guidelines **can still reach your followers normally**. It just isn't shown to strangers. So steady reach from followers with non-follower reach near zero across several posts points to a restriction. Both numbers falling together usually means the content, the timing or the season."},
        {"type": "h3", "text": "When it's just normal variance"},
        {"type": "ul", "items": ["**A viral outlier reset your expectations.** One Reel at 80,000 views makes 4,000 feel like a ban. It isn't.", "**The calendar.** Exam season, January, a big news week or an election cycle all change what Kenyans are scrolling.", "**Your topic drifted.** Instagram now lets viewers adjust their own topics, so off-niche posts land with fewer of the right people.", "**Removed fake activity.** If you've ever bought engagement, platforms remove inauthentic likes and follows they detect. A drop in those numbers is a clean-up, not a shadowban."]},
        {"type": "callout", "label": "Fixes and realistic timelines", "text": "There's no official clock for getting recommendations back. Instagram only says an account-wide restriction lasts 'for a period of time', and TikTok calls For You ineligibility 'temporary'. What you control: remove or edit flagged posts, appeal genuine mistakes, and post clean, on-niche content on a steady rhythm. Deleting your whole grid or going silent for weeks doesn't reset anything."},
        {"type": "template", "label": "Reach-drop log (fill in before you change anything)", "text": "Date the drop started: [ ]\nInstagram Account Status / TikTok Account check result: [eligible / not eligible + reason]\nMy typical reach (middle of last 10 posts): [ ]\nLast 5 posts: followers reached [ ] / non-followers reached [ ]\nAnything flagged or removed: [ ]\nAnything I changed that week (topic, length, sound, posting time, bought engagement): [ ]\nNext step: [fix flagged post / request review / keep posting and recheck in 14 days]"},
        {"type": "action", "label": "Do this today (10 minutes)", "items": ["Open Instagram Account Status and TikTok Account check, and screenshot both.", "Write down the middle reach of your last 10 posts. That's your real baseline.", "Check the follower vs non-follower split on your last 3 posts.", "If anything is flagged, fix or appeal that one item today."]},
        {"type": "quiz", "q": "Your last six Reels reached your followers as usual, but reach to non-followers fell to almost nothing. What's the most likely explanation?", "options": ["Instagram is punishing you to make you buy ads", "Your content or account isn't eligible to be recommended. Check Account Status", "Your followers have muted you", "It's random and there's nothing to check"], "answer": 1, "explain": "Instagram says content that breaks its Recommendation Guidelines still reaches followers but isn't recommended to non-followers. Account Status shows whether that's happening and lets you fix it or request a review."},
        {"type": "takeaways", "items": ["'Shadowban' has official names: not eligible for recommendations (Instagram), ineligible for For You (TikTok).", "Check Account Status and Account check before you change anything.", "Followers steady, non-followers near zero: likely a restriction. Both falling: usually content or season.", "TikTok strikes expire after 90 days. Fix, appeal, and keep posting clean content."]},
        {"type": "locked", "module": "tiktok_pro", "text": "Most stalled videos aren't restricted at all. They failed their first test. The Advanced TikTok Growth & Algorithm Guide shows you how to tell the difference:", "items": ["The '200-view jail': why a video stalls and the diagnostic checklist that finds the cause", "The five numbers to check on every video, and exactly where each one lives", "A traffic-source table: what For You, Search, Profile and Sound views tell you to do next", "A pre-post compliance pass that catches rule problems before they turn into removals"]},
        {"type": "sources", "items": [{"title": "Instagram for Creators: What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}, {"title": "Instagram: Helping you understand what's going on with your account (Account Status updates)", "url": "https://about.instagram.com/blog/announcements/instagram-outages-and-account-status"}, {"title": "TikTok Newsroom: Community Guidelines update and Account Check (April 2024)", "url": "https://newsroom.tiktok.com/cgupdate?lang=en-ZA"}, {"title": "Dhaka Tribune: TikTok updates account enforcement system (Feb 2023)", "url": "https://www.dhakatribune.com/business/281701/tiktok-updates-account-enforcement-system-to"}]},
      ]},
      { id: "rs4", title: "Copyright Claims, Strikes & Takedowns: Fix Them Without Losing the Channel", minutes: 7, body: [
        {"type": "hook", "text": "On YouTube, writing 'all credit to the artist' doesn't count as a reason to dispute a copyright claim. Neither does owning the song or not monetising the video. And a weak dispute can turn a harmless claim into a **strike**."},
        {"type": "p", "text": "Copyright problems come in two weights. A **claim** is the rights owner taking the money or muting the sound. A **strike** is a mark against your account, and enough of them shut it down. Treat them very differently."},
        {"type": "stat", "value": "3 in 90 days", "label": "copyright strikes that make a YouTube channel subject to termination. A strike only expires after 90 days if you've completed Copyright School (YouTube Help: Copyright strike basics)"},
        {"type": "table", "headers": ["Platform / situation", "Where to respond", "The rule that matters"], "rows": [["YouTube Content ID claim", "Studio > Content > Restrictions > See details. Dispute, or remove the claimed audio", "The claimant has 30 days to respond. If they reject your appeal, they can file a removal request, and that means a strike."], ["YouTube copyright strike", "Copyright School; ask the claimant to retract; or a counter notification", "If the email says removal is 'scheduled', you have 7 days to delete the video and avoid the strike."], ["TikTok", "Open the flagged video > View copyright details > Appeal. Policy: tiktok.com/legal/page/global/copyright-policy/en", "Business accounts only get the Commercial Music Library. Branded posts count as commercial even on personal accounts."], ["Instagram & Facebook", "The in-app notice, or Settings > Account Status, then appeal", "Repeated IP removals can restrict or disable the account. Keep your licences and original files."], ["Someone stole YOUR video", "YouTube copyright removal request; TikTok form at tiktok.com/legal/report/Copyright; in-app IP report on Meta", "Only report what you actually own. False reports carry consequences too."], ["Kenya (offline)", "Kenya Copyright Board (KECOBO): copyright.go.ke", "Copyright exists automatically once a work is recorded or written. Registration at nrr.copyright.go.ke is optional evidence."]]},
        {"type": "h3", "text": "What to do the day a notice lands"},
        {"type": "ol", "items": ["**Identify the type.** Claim, strike, mute or removal? The fix differs for each.", "**Be honest about rights.** Did you make it, license it, or use the platform's own library for the right account type?", "**Take the cheap fix first.** Trim, mute or swap the claimed song. YouTube lets you remove the claimed content instead of disputing.", "**Dispute only with proof**: a licence, your own original recording, or written permission.", "**Complete Copyright School** if you got a YouTube strike, or the strike won't expire.", "**Start a rights folder.** Keep licences, receipts, producer WhatsApp permissions and raw files with dates."]},
        {"type": "template", "label": "Dispute text (only when you have the rights)", "text": "I have the rights to use the claimed material.\nTrack/clip: [title, artist/producer]\nBasis: [licence from (source), licence ID (number), dated (date), covering online and commercial use] OR [original recording made by me on (date); raw file available]\nClaimed segment: [mm:ss to mm:ss]\nSupporting proof: [licence PDF / written permission from (name) on (date)]\nI'm happy to provide documents on request."},
        {"type": "myth", "myth": "If I give credit to the artist, I can use their song.", "truth": "YouTube lists 'giving credit', 'I bought the song' and 'I'm not monetising' as invalid dispute reasons. Credit isn't permission. Use licensed or platform-library music, or get written permission from the artist or producer."},
        {"type": "h3", "text": "Kenyan copyright basics"},
        {"type": "ul", "items": ["**Automatic protection:** your videos, photos, beats and captions are protected from creation. KECOBO says registration is optional, but its certificate helps prove ownership in a dispute.", "**Takedowns through internet providers:** the Copyright (Amendment) Act 2019 (section 35B) lets rights owners send takedown notices that providers must act on within 48 business hours, unless they get a counter-notice.", "**False notices are a crime:** filing a false or malicious takedown or counter-notice can mean a fine of up to KES 500,000, up to five years in prison, or both."]},
        {"type": "insight", "label": "What most creators miss", "text": "Copyright tools built for rights owners are being abused. In August 2026 India's Delhi High Court asked Meta why scammers seemed able to use Rights Manager to file false claims while established creators were refused access. Your best defence is boring: **dated original files** and a rights folder you can attach to any appeal within minutes."},
        {"type": "action", "label": "Do this today", "items": ["In YouTube Studio, open Content and sort by Restrictions to find any open claims.", "If you got a strike, complete Copyright School today.", "Create a 'Rights' folder in Google Drive for licences and permissions.", "Switch any branded TikTok post to Commercial Music Library sounds."]},
        {"type": "quiz", "q": "Your YouTube video gets a Content ID claim for a popular Kenyan song. Your description says 'No copyright intended, all credit to the artist'. Is that a valid dispute reason?", "options": ["Yes, crediting the artist makes it fair use", "Yes, if you don't monetise the video", "No. Credit isn't permission, and a weak dispute can lead to a removal request and a strike", "No, but disputing has no risk, so try anyway"], "answer": 2, "explain": "YouTube says credit, owning a copy and not monetising aren't valid reasons. If the claimant rejects your appeal they can request removal, and a valid removal request brings a copyright strike."},
        {"type": "takeaways", "items": ["A claim costs money or sound. A strike threatens the account. Three YouTube strikes in 90 days can end a channel.", "Remove or swap the claimed audio before you dispute. Only dispute with real proof of rights.", "TikTok business accounts are limited to the Commercial Music Library.", "In Kenya copyright is automatic, and false takedown notices are a criminal offence."]},
        {"type": "locked", "module": "yt_seo", "text": "YouTube SEO Mastery builds copyright checks into your upload routine, so claims never hit your best videos:", "items": ["The Short-length × music decision table: which combinations get blocked and which are safe", "A 48-hour Shorts check that includes a copyright line, so problems surface while they're cheap to fix", "The pre-monetisation checklist, including 'every video my own work or properly licensed'", "The surprising AI disclosure details, including why AI-generated music needs a label"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Copyright strike basics", "url": "https://support.google.com/youtube/answer/2814000"}, {"title": "YouTube Help: Dispute a Content ID claim", "url": "https://support.google.com/youtube/answer/2797454?hl=en"}, {"title": "CIPIT (Strathmore): ISPs and copyright in Kenya, Copyright Amendment Act 2019", "url": "https://cipit.strathmore.edu/?p=7168"}, {"title": "Kenya Copyright Board: Copyright registration", "url": "https://copyright.go.ke/node/110"}]},
      ]},
      { id: "rs5", title: "Money Stuck: Monetisation Rejected, Payouts Frozen, Brands Who Ghost", minutes: 7, body: [
        {"type": "hook", "text": "Since 1 October 2026, a Kenyan YouTuber can earn every shilling on paper and still be paid nothing. Google **freezes payouts** until a verified KRA PIN is in AdSense, and the name has to match exactly."},
        {"type": "p", "text": "Most creator money problems aren't bans. They're paperwork: a PIN letter nobody opened, a tax form ignored in the notifications, a name spelt differently on two forms, or a brand deal agreed on a voice note. All of them can be fixed, mostly from your phone."},
        {"type": "stat", "value": "5%", "label": "withheld from Kenyan creators' payouts by Meta since 1 January 2026, and by Google from September 2026 YouTube earnings (The Star; Techweez)"},
        {"type": "h3", "text": "Where the money gets stuck, and the route out"},
        {"type": "table", "headers": ["Problem", "Where to fix it", "The rule to know"], "rows": [["YouTube monetisation rejected", "YouTube Studio > Earn; appeal with a short video", "Appeal within 21 days. Or reapply 30 days after a first rejection, 90 days after later ones."], ["YouTube Partner Program suspended", "Appeal from Studio", "Appeal within 21 days of suspension. Decisions usually come within 14 days."], ["AdSense address PIN", "AdSense for YouTube > verify address", "The letter takes 3–4 weeks. Request a new one after 3 weeks. Unverified after 4 months means your channel is demonetised."], ["KRA PIN on YouTube", "AdSense for YouTube > Payments > Payments info > Manage settings > Kenya tax info", "11 characters, capital letters, no hyphens. The name must match your Google payments profile."], ["Meta (Facebook / Instagram)", "Payouts and tax settings in Professional Dashboard or Meta Business Suite", "5% withheld at source. Wrong name, TIN or address can delay your tax certificates."], ["TikTok", "Inbox > System notifications > 'Complete the Kenya tax form'", "Creator Rewards isn't available in Kenya yet. File the form so future payouts aren't held up."], ["A brand that won't pay", "Written demand, then the Small Claims Court", "Claims up to KES 1 million, no lawyer needed, and cases should end within 60 days."], ["An EndaViral payment", "Ticket with order ID and M-Pesa code", "One ticket can list several orders."]]},
        {"type": "insight", "label": "The mismatch that freezes payouts", "text": "Google says the documents you submit for Kenya tax info must **match your existing payments profile exactly**. If AdSense says 'Wanjiru M. Kamau' and your KRA PIN is under 'Mary Wanjiru Kamau', fix the mismatch before you submit, not after the payout fails."},
        {"type": "h3", "text": "Payout on hold? Check in this order"},
        {"type": "ol", "items": ["**Identity verification.** AdSense gives 45 days from the first request to submit documents.", "**Address PIN.** Entered within 4 months? Three wrong entries also cause problems, so request a new PIN rather than guessing.", "**Tax info.** KRA PIN on Google, tax details on Meta, the Kenya tax form on TikTok.", "**Payment method.** Bank details correct, and the account name matches.", "**Threshold and timing.** AdSense pays between the 21st and 26th of the month once your balance passes your payment threshold. Smaller balances roll over."]},
        {"type": "myth", "myth": "A monetisation rejection means YouTube has blacklisted my channel.", "truth": "A rejection means reviewers think a significant part of the channel doesn't meet policy. The email names the policies. You can appeal within 21 days, or fix the content and reapply after 30 days (90 after later rejections)."},
        {"type": "callout", "label": "When a brand ghosts you", "text": "Move it from WhatsApp vibes to a paper trail. Chase politely twice, then send a written demand giving 14–21 days. If that's ignored, the Small Claims Court takes claims up to KES 1 million. Filing fees start at KES 200 for claims under KES 200,000, and you can represent yourself. Bring the chat, the posted content, M-Pesa statements and proof the demand was delivered."},
        {"type": "template", "label": "Three-step brand payment chaser", "text": "DAY 1 (friendly): Hi [Name], hope the campaign went well! The [Reel/TikTok] went live on [date] (link: [ ]). Sharing the invoice again for KES [amount], due [date]. M-Pesa Till/Paybill: [ ]. Thanks!\n\nDAY 7 (firm): Hi [Name], following up on invoice [no.] for KES [amount], which was due on [date]. Please confirm the date payment will be made.\n\nDAY 14 (final): Dear [Name], payment of KES [amount] for [deliverables] delivered on [date] remains outstanding despite reminders on [dates]. Please pay within 14 days of this message. If I don't receive it, I'll file a claim at the Small Claims Court without further notice. Regards, [Full name, KRA PIN]"},
        {"type": "action", "label": "Do this today", "items": ["Open AdSense for YouTube and check that the KRA PIN, name and address all match.", "Search your TikTok notifications for 'Kenya tax form' and complete it.", "Check Meta's payout settings for your correct legal name and tax details.", "Save the chaser template, and send stage one to any brand that owes you."]},
        {"type": "quiz", "q": "Your AdSense address PIN letter still hasn't arrived after three weeks. What happens if you just keep waiting?", "options": ["Nothing. Google pays you anyway", "If the address isn't verified within 4 months of the PIN being generated, the channel is demonetised", "Google automatically emails the PIN after 60 days", "Your channel is terminated immediately"], "answer": 1, "explain": "YouTube's help page says to request a replacement PIN after 3 weeks, and that an address still unverified after 4 months leads to demonetisation. Some locations can verify online if AdSense offers it."},
        {"type": "takeaways", "items": ["Most stuck money is paperwork: PIN, tax form, matching names, payment method.", "Since October 2026, Google freezes Kenyan payouts without a verified KRA PIN.", "A rejected YouTube application has routes back: appeal within 21 days, or reapply after 30 or 90 days.", "Chase brands in writing. The Small Claims Court handles up to KES 1 million without a lawyer."]},
        {"type": "locked", "module": "brand_pricing_pro", "text": "The best way to avoid chasing a brand is a deal that's hard to dodge. Charging Brands: The Kenya Pricing Guide covers the terms that get you paid:", "items": ["Deposit and milestone terms (commonly 30–50% upfront) that protect your cash flow", "The WhatsApp deal confirmation to send before you create anything", "Weak vs strong clause wording for payment, usage, exclusivity and tax", "Why the 5% withheld isn't your final tax bill, and what to set aside"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Verify your address with a PIN in AdSense for YouTube", "url": "https://support.google.com/youtube/answer/14727844?hl=en"}, {"title": "Techweez: Google to withhold 5% tax from Kenyan YouTube earnings (Aug 2026)", "url": "https://techweez.com/2026/08/31/youtube-earnings-tax-kenya-5-percent-withholding/"}, {"title": "YouTube Help: Why was I rejected for monetisation?", "url": "https://support.google.com/youtube/answer/9235730"}, {"title": "K24: How to use Kenya's Small Claims Court to recover money you're owed", "url": "https://k24.digital/lifestyle/money/how-to-use-kenyas-small-claims-court-to-recover-money-youre-owed"}]},
      ]},
      { id: "rs6", title: "Fake Pages, Extortion, Sextortion & Doxxing: Where Kenyans Report It", minutes: 8, body: [
        {"type": "hook", "text": "To stop an intimate image spreading on Facebook, Instagram and TikTok, StopNCII.org **never asks you to upload the image**. It creates a digital fingerprint on your own device, and participating platforms block matches."},
        {"type": "p", "text": "Fake pages selling in your name, threats to leak photos, your home address posted in the comments: these feel like the end of the world, and extortionists count on that panic. You have more power than they want you to think. Platforms have dedicated routes, and Kenyan law is on your side."},
        {"type": "stat", "value": "1,463", "label": "victims identified in INTERPOL's Operation Contender 3.0 against social-media romance scams and sextortion in 14 African countries, including Kenya. They lost nearly USD 2.8M; 260 suspects were arrested (2025, via AllAfrica)"},
        {"type": "h3", "text": "If someone is extorting you: the plan"},
        {"type": "ol", "items": ["**Stop replying. Don't pay.** Paying proves you'll pay, and nothing stops them keeping copies.", "**Preserve evidence before you block.** Screenshot the profile with its username and link, the messages, any M-Pesa number or till, and the dates.", "**Report in the app**, then hash the images: stopncii.org if you were 18 or older in them, takeitdown.ncmec.org if you were under 18.", "**Block and lock down.** Set your accounts to private for now and check who can see your friends list.", "**Report to the police.** DCI's toll-free line is 0800 722 203, or WhatsApp 0709 570 000 (Fichua kwa DCI). Ask for an OB number.", "**Tell one trusted person** today. You don't have to handle this alone."]},
        {"type": "callout", "label": "You are not the criminal here", "text": "Under Kenya's Computer Misuse and Cybercrimes Act, sharing someone's intimate images without consent can bring a fine of up to KES 200,000, two years in prison, or both (section 37). Cyber harassment (section 27, upheld by the courts in March 2026) carries up to KES 20 million or 10 years. Being targeted is not your shame."},
        {"type": "h3", "text": "Reporting fakes and abuse on each platform"},
        {"type": "table", "headers": ["Platform", "Route", "Good to know"], "rows": [["Instagram", "Profile > ... > Report > pretending to be someone > Me. No access? help.instagram.com/contact/636276399721841", "The web form asks for a photo of your ID."], ["Facebook", "Profile > ... > Report profile > Pretending to be someone. No account? facebook.com/help/contact/295309487309948", "Use the same route for fake Pages selling in your name."], ["TikTok", "Profile > Share > Report > Pretending to be someone", "Brands can also use tiktok.com/legal/report/Copyright for stolen content."], ["YouTube", "support.google.com/youtube/contact/impersonation", "This includes AI copies of your face or voice, and names like 'Official' or 'Backup' added to yours."], ["X", "Report from the profile, or via help.x.com/en/safety-and-security/report-x-impersonation", "You don't need an X account to report."], ["Intimate images", "stopncii.org (18+), takeitdown.ncmec.org (under 18)", "The hash is made on your device. The image never leaves it."]]},
        {"type": "h3", "text": "Kenyan routes beyond the apps"},
        {"type": "table", "headers": ["Where", "Contact", "Use it for"], "rows": [["DCI (police)", "0800 722 203 toll-free; WhatsApp 0709 570 000", "Extortion, sextortion, impersonation fraud, threats"], ["National KE-CIRT/CC", "incidents@ke-cirt.go.ke; +254 703 042700; ke-cirt.go.ke", "Cyber incidents: hacking, phishing, impersonation campaigns"], ["Data Protection Commissioner (ODPC)", "odpc.go.ke/file-a-complaint; 020 780 1800", "Your personal data posted or misused, including doxxing by a business. ODPC says it investigates within 90 days."], ["Communications Authority", "Complain to your telco in writing first, then to the CA at ca.go.ke", "Telco failures such as an unresolved SIM swap. The CA says it responds within 30 days."], ["EndaViral", "A ticket with your order ID from your account", "Fake 'EndaViral support' DMs. Real support never asks for passwords, codes or your M-Pesa PIN."]]},
        {"type": "template", "label": "Incident summary to take to the police (or attach to a report)", "text": "INCIDENT SUMMARY\nName / ID no. / phone: [ ]\nWhat happened (3–5 lines): [ ]\nStarted: [date, time]\nAccounts involved: [usernames + profile links]\nDemands made: [amount, M-Pesa number/till, deadline given]\nMoney paid (if any): [M-Pesa codes, amounts, dates]\nEvidence attached: [list of screenshots, saved links]\nPlatform reports filed: [platform, date, report ID]\nRequest: investigation and an OB number"},
        {"type": "action", "label": "Do this today (10 minutes)", "items": ["Save DCI 0800 722 203 and WhatsApp 0709 570 000 in your contacts.", "Search your name and business name on Instagram and TikTok for lookalike accounts.", "Bookmark stopncii.org, just in case.", "Copy the incident summary template into your notes."]},
        {"type": "quiz", "q": "You want StopNCII.org to block an intimate image from spreading on Facebook, Instagram and TikTok. What do you have to send them?", "options": ["The image itself, so moderators can check it", "Nothing but a digital fingerprint (hash) created on your own device", "A police OB number first", "A screenshot of the blackmailer's messages"], "answer": 1, "explain": "StopNCII creates a hash, a numerical fingerprint, on your device. Participating platforms use it to detect and block matches. The image itself never leaves your phone."},
        {"type": "takeaways", "items": ["Don't pay, and don't delete. Screenshot first, then report and block.", "Every major platform has an impersonation route, and some work without an account.", "StopNCII (18+) and Take It Down (under 18) block images without you uploading them.", "In Kenya: DCI for crimes, KE-CIRT for cyber incidents, ODPC for misuse of your data, and the CA when telcos don't act."]},
        {"type": "locked", "module": "branding_pro", "text": "Impersonation and pile-ons are brand crises. Personal Branding Blueprint has a full playbook for handling them without making it worse:", "items": ["A situation table: when to ignore, reply once, post publicly, or screenshot, report and block", "The six-step response playbook, starting with the rule for the first emotional hour", "The 'receipts trap': why posting a customer's M-Pesa screenshot as proof can become a data-protection case", "Holding message and apology/correction templates ready to post"]},
        {"type": "sources", "items": [{"title": "Meta: Combating sextortion and intimate image abuse (StopNCII, Take It Down)", "url": "https://www.meta.com/en-gb/safety/topics/bullying-harassment/ncii/"}, {"title": "Computer Misuse and Cybercrimes Act, 2018 (full text)", "url": "https://policyvault.africa/wp-content/uploads/policy/KEN227.pdf"}, {"title": "Capital FM: Revamped DCI call centre adds WhatsApp reporting", "url": "https://www.capitalfm.co.ke/news/2025/07/revamped-dci-call-centre-adds-real-time-tracking-whatsapp-support"}, {"title": "Communications Authority: Cyber Security Report Q4 2025/2026 (KE-CIRT/CC contacts)", "url": "https://www.ca.go.ke/sites/default/files/2026-07/Cyber%20Security%20Report%20Q4%202025-2026_1.pdf"}]},
      ]},
    ],
  },
  {
    id: 'fundamentals', icon: '🎓', title: 'Marketing Fundamentals',
    blurb: "The timeless marketing every algorithm change can't touch: psychology, positioning, research, strategy and measurement, made practical for Kenyan creators and businesses.",
    lessons: [
      { id: "fm1", title: "Why People Follow and Buy: The Psychology That Actually Holds Up", minutes: 7, body: [
        {"type": "hook", "text": "The world's most famous shopping study says too much choice kills sales. When researchers pooled **50 experiments** on it, the average effect was close to zero."},
        {"type": "p", "text": "Marketing is full of 'psychology hacks' copied from old studies. Some are rock solid. Some have **failed when scientists tried to repeat them**. This lesson shows you which is which."},
        {"type": "stat", "value": "d = 0.04", "label": "Ego depletion (the idea that willpower runs out like a battery) tested in 23 labs with 2,141 people: a result consistent with no effect (Hagger et al., 2016, reported by Discover)"},
        {"type": "h3", "text": "What holds up, what's shaky"},
        {"type": "table", "headers": ["Idea", "What it means", "How to use it", "How solid?"], "rows": [["Social proof", "People copy what people like them do", "Show real reviews, customer photos, 'X people from Rongai ordered this week'", "Strong. Field tests show it, best when the 'others' feel similar"], ["Reciprocity", "We feel we owe people who helped us first", "Give a genuinely useful tip, price guide or sample before asking", "Well established (Cialdini's Influence); works only if the gift is real"], ["Familiarity (mere exposure)", "We tend to like what we see often", "Same face, colours and posting rhythm so people meet you again and again", "Solid in labs, but repetition can deepen dislike if people already dislike you"], ["Unity", "'One of us' beats 'like us'", "Speak to a shared identity: Kisumu mums, campus hustlers, matatu fans", "Newest of Cialdini's seven (added 2016)"], ["Loss aversion", "Losses always hurt more than gains", "Use carefully; don't build every caption on fear", "Contested: a 2018 review says it depends on context"], ["Choice overload", "More options always mean fewer sales", "Test it; a clear 'most popular' label often helps more than cutting options", "Weak: meta-analysis average near zero"], ["Ego depletion", "Tired buyers have no willpower left", "Don't plan your selling around it", "Failed a large multi-lab replication"]]},
        {"type": "myth", "myth": "Losses hurt twice as much as gains, so scare people into buying ('LAST CHANCE!!').", "truth": "Gal and Rucker's review in the Journal of Consumer Psychology (2018) argues loss aversion has been **overgeneralised**: when studies separate 'losing' from 'changing', the effect often disappears. What is reliable is **inertia**: people stick with what they already do. So your real job is making switching to you feel easy and safe, not frightening."},
        {"type": "h3", "text": "The question behind every purchase: what job is this hired for?"},
        {"type": "p", "text": "Clayton Christensen's **jobs-to-be-done** idea says people don't buy products, they 'hire' them to make progress in a specific situation. In his famous example, a fast-food chain found many morning milkshakes were bought by commuters who wanted something to make a long, boring drive less dull. Their real competitors were bananas and bagels, not other milkshakes."},
        {"type": "p", "text": "A Nairobi salon isn't only selling braids. For one client the job is 'look sharp for a job interview on Monday'; for another it's 'hair I don't have to think about for six weeks'. Same service, different job, different caption."},
        {"type": "insight", "label": "What most creators miss", "text": "Social proof works best when the 'others' are **similar to the viewer**. In a hotel study, a card saying most guests reuse towels beat a plain 'save the environment' card (44.1% vs 35.1% reuse), and naming guests who stayed in the same room did even better. 'Students at Kenyatta University love this' will usually beat '10,000 happy customers'."},
        {"type": "template", "label": "Job statement + proof caption", "text": "JOB STATEMENT (fill for your top 3 customers):\nWhen I'm [SITUATION, e.g. starting a new job next week],\nI want to [PROGRESS, e.g. look put-together without spending all Saturday at the salon],\nso I can [OUTCOME, e.g. walk in confident].\n\nCAPTION THAT USES IT:\n[SITUATION]? This is for you. [WHAT YOU DO] in [TIME / PRICE IN KES].\n[REAL PROOF: '14 clients from Kilimani booked this last month' or a customer quote with permission]\nDM '[KEYWORD]' and I'll send prices."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Write a job statement for your last three customers or commenters. Notice how different the 'jobs' are.", "Replace one vague proof line ('many happy clients') with a specific, similar-people proof line.", "Post one genuinely useful free tip before your next sales post (reciprocity first).", "Delete or rewrite one fear-based 'LAST CHANCE' caption into an 'easy to start' caption."]},
        {"type": "quiz", "q": "A friend says: 'Never show more than six products. The jam study proved too much choice kills sales.' What's most accurate?", "options": ["Correct, it's a proven law of shopping", "When researchers combined 50 experiments, the average effect of more choice was close to zero; it depends on the situation", "Wrong, more choice always increases sales", "Correct, but only for food"], "answer": 1, "explain": "The 2000 jam study was real, but a 2010 meta-analysis of 50 experiments found an average effect near zero. Choice overload can happen in some conditions, so test your own page instead of trusting the legend."},
        {"type": "takeaways", "items": ["Social proof, reciprocity and familiarity hold up. Make proof specific and from people like your viewer.", "Loss aversion is overstated; inertia is real, so make switching to you easy and safe.", "Ego depletion failed a big replication and choice overload is weak on average. Don't build on them.", "Ask what 'job' a customer hires you for. That job is your caption."]},
        {"type": "locked", "module": "branding_pro", "text": "Familiarity and social proof only work if people recognise you and can see your proof. Personal Branding Blueprint builds both:", "items": ["The one-page brand kit, including the 'voice is never' list that keeps you consistent on a bad day", "The clarity, proof and contact setup that turns a profile visit into a message", "A media kit outline built on your real Insights numbers, plus the honest way to handle boosted numbers with brands", "The holding-message and apology templates to use before a small complaint becomes a pile-on"]},
        {"type": "sources", "items": [{"title": "Discover: The End of Ego-Depletion Theory?", "url": "https://discovermagazine.com/mind/the-end-of-ego-depletion-theory"}, {"title": "Kitces: Gal & Rucker on the overgeneralisation of loss aversion", "url": "https://www.kitces.com/blog/loss-aversion-pain-loom-larger-than-gain-gal-rucker-journal-psychology/"}, {"title": "Psychology Today: Is choice overload a real thing?", "url": "https://www.psychologytoday.com/us/blog/pop-psych/201602/is-choice-overload-real-thing"}, {"title": "ScienceDaily: A room with a viewpoint (hotel towel social norms study, 2008)", "url": "https://www.sciencedaily.com/releases/2008/08/080822160338.htm"}]},
      ]},
      { id: "fm2", title: "Positioning & Niche: How to Stop Competing With Everyone", minutes: 7, body: [
        {"type": "hook", "text": "Your biggest competitor probably isn't the shop next door. It's **'I'll just do it myself'**, 'my cousin can do it', or doing nothing at all."},
        {"type": "p", "text": "Positioning is deciding who you're for, what you're compared with, and why you're the better choice for those people. Get it right and your captions, prices and content ideas almost write themselves. Get it wrong and you're shouting 'quality and affordable!' like everyone else."},
        {"type": "h3", "text": "STP: the university version in three steps"},
        {"type": "ul", "items": ["**Segmentation:** split the market into groups that buy for different reasons. Age and location are a start; the situation and the job (from Lesson 1) are usually more useful.", "**Targeting:** choose the one or two groups you can serve best and reach cheaply. Saying no to some customers is the point.", "**Positioning:** decide what you want that group to think when your name comes up, and back it with proof."]},
        {"type": "p", "text": "**Five building blocks.** In *Obviously Awesome*, positioning expert April Dunford breaks positioning into five parts, and her list **starts with the alternatives**, not with your features. Here it is applied to a Kisumu home baker:"},
        {"type": "table", "headers": ["Component", "Question to answer", "Kisumu baker example"], "rows": [["Competitive alternatives", "What would customers do if you didn't exist?", "Supermarket cake, a hotel bakery, or a relative baking at home"], ["Unique attributes", "What do you have that those alternatives don't?", "Custom designs, delivery same day, cakes from KES 1,800"], ["Value (and proof)", "What do those attributes do for the buyer?", "A party cake that looks premium without the hotel price; photos of past cakes with prices"], ["Best-fit customers", "Who cares most about that value?", "Parents planning a child's birthday on a budget"], ["Market category", "What frame helps people understand you fast?", "'Custom birthday cakes, Kisumu', not 'baker and caterer'"]]},
        {"type": "myth", "myth": "To stand out you must be totally unique.", "truth": "Almost nothing stays unique for long; competitors copy. Mark Ritson argues for **relative differentiation**: having more of something your target customers care about than the alternatives do. Byron Sharp's camp argues **distinctiveness** (being instantly recognisable) matters more than being different. Both agree on one thing: vague claims like 'best quality' do neither."},
        {"type": "h3", "text": "Category design, small-business version"},
        {"type": "p", "text": "The book *Play Bigger* argues the biggest winners create a new category and then own it. That is expensive: you have to teach people the category exists. For most small businesses and creators the smarter move is to **choose an existing frame people already search for**, then narrow it ('budget office wear for Nairobi interns' instead of 'fashion')."},
        {"type": "insight", "label": "What most creators miss", "text": "Your category label decides who you're compared with. Call yourself a 'boutique' and people compare you with every boutique on Instagram. Call yourself 'mitumba office wear, KES 500 and under' and you're compared with buying new office wear in town, where you win easily on price."},
        {"type": "template", "label": "Dunford-style positioning worksheet", "text": "1. If I didn't exist, my customers would: [ALTERNATIVE 1], [ALTERNATIVE 2], [DO NOTHING / DIY]\n2. What I have that they don't: [ATTRIBUTE 1], [ATTRIBUTE 2]\n3. So the buyer gets: [VALUE], proven by: [PHOTO / REVIEW / NUMBER]\n4. The people who care most: [SPECIFIC GROUP + SITUATION]\n5. Category I'll use: [WORDS THEY ALREADY SEARCH + LOCATION]\n\nOne-line test: For [GROUP] who are tired of [ALTERNATIVE], I offer [CATEGORY] that [VALUE]."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Ask your last three customers: 'If I wasn't around, what would you have done instead?' Write the exact answers.", "Fill in the worksheet using those answers, not your guesses.", "Rewrite your bio's first line with your category words and location.", "Look at three pages in your niche and list the category words they use. Pick a frame that makes you look different from them."]},
        {"type": "quiz", "q": "You sell ready-to-eat lunch boxes to office workers in Upper Hill. Using Dunford's approach, which is your most important 'competitive alternative'?", "options": ["Other lunch-box sellers on Instagram", "Whatever these workers do today: the kibanda downstairs, packing food from home, or skipping lunch", "Big restaurant chains only", "There are no alternatives if your food is good"], "answer": 1, "explain": "Competitive alternatives are what customers would do if you didn't exist, including DIY and doing nothing. Position against the kibanda and the home-packed lunch, and your message gets much sharper."},
        {"type": "takeaways", "items": ["STP: split the market, pick who you serve best, decide what they should think of you.", "Start positioning from the real alternatives, including DIY and doing nothing.", "Aim for relative difference and instant recognisability, not total uniqueness.", "Use a category frame people already search for, then narrow it."]},
        {"type": "locked", "module": "branding_pro", "text": "This lesson finds your position. Personal Branding Blueprint turns it into a brand people remember and pay:", "items": ["The three-circle overlap test for choosing the one thing you're known for, with 'too broad vs sharper' examples", "How to build 3–4 content pillars inside your positioning, and the rough 8-out-of-10 rule for staying on-brand", "The 15-post audit that shows which pillar your audience values most", "How to move your best followers onto a channel you own, with a lead-magnet keyword script"]},
        {"type": "sources", "items": [{"title": "Heinz Marketing: Five components of positioning (Obviously Awesome summary)", "url": "https://www.heinzmarketing.com/?p=14584"}, {"title": "Marketing Week: Ritson, differentiation is not about uniqueness", "url": "https://www.marketingweek.com/ritson-differentiation-uniqueness/"}, {"title": "The B2B House: How Brands Grow summary", "url": "https://www.theb2bhouse.com/how-brands-grow-book-summary-and-guide/"}, {"title": "State Library of Queensland: Play Bigger book overview", "url": "https://www.slq.qld.gov.au/blog/play-bigger-how-rebels-and-innovators-create-new-categories-and-dominate-markets-book"}]},
      ]},
      { id: "fm3", title: "Audience Research Without a Budget", minutes: 7, body: [
        {"type": "hook", "text": "'Would you buy this?' is one of the most expensive questions in business. People say yes to be kind, then never pay."},
        {"type": "p", "text": "Big companies spend millions on research. You can get most of the useful part for free, from conversations, comments, Google Trends and your own analytics. The skill is asking questions that **can't be answered politely**, only honestly."},
        {"type": "stat", "value": "18 points", "label": "How much one leading phrase raised support for an option in a YouGov wording experiment (38% vs 20% with neutral wording). How you ask changes the answer you get."},
        {"type": "h3", "text": "The Mom Test: three rules for honest answers (Rob Fitzpatrick)"},
        {"type": "ol", "items": ["**Talk about their life, not your idea.** Don't pitch. Ask about their problems and what they already do.", "**Ask about specific past events, not the future.** 'Talk me through the last time you bought a wig' beats 'Would you buy a wig from me?'", "**Talk less, listen more.** If you're talking more than them, you're selling, not learning."]},
        {"type": "h3", "text": "Five free research methods"},
        {"type": "table", "headers": ["Method", "What it tells you", "The trap to avoid"], "rows": [["5 short customer chats (WhatsApp call or in person)", "The real job, words customers use, what they tried before", "Pitching your idea, then counting compliments as proof"], ["Comment and DM mining", "Repeated questions = content ideas and objections", "Only hearing your loudest fans"], ["Google Trends (set to Kenya)", "Whether interest is rising and when it peaks in the year", "Reading 100 as a search count; it's a relative peak"], ["Platform analytics", "Who actually watches: city, age, active hours", "Ignoring location; a Nairobi shop needs Nairobi viewers"], ["Quick survey (Google Forms or WhatsApp poll)", "How common a pattern is, once you know what to ask", "Leading or agree/disagree questions"]]},
        {"type": "myth", "myth": "Google Trends shows 0 for my product, so nobody in Kenya searches for it.", "truth": "Google's own help page says 0 doesn't mean nobody searched. Trends only shows terms with enough volume, and 100 is the **highest relative interest** in your chosen time and place, not a number of searches. Compare your term with a few related terms to see its real size."},
        {"type": "insight", "label": "What most creators miss", "text": "Your comment section is a biased sample. It's mostly fans, and the people who scrolled past silently never tell you why. That's why five private chats with people who **didn't** buy are often worth more than 500 comments."},
        {"type": "template", "label": "Interview request + script + survey fixes", "text": "DM TO ASK FOR A CHAT:\nHi [NAME], I'm trying to understand how people in [AREA] handle [TOPIC]. Not selling anything. Could I ask you 5 quick questions on WhatsApp this week? I'll share [SMALL THANK-YOU, e.g. my price guide].\n\nSCRIPT:\n1. Talk me through the last time you [BOUGHT / DEALT WITH THING].\n2. What was the hardest part?\n3. What did you try first? What did it cost you?\n4. Why did you bother solving it at all?\n5. Who else should I talk to?\n\nSURVEY FIXES:\nBad: 'Don't you agree our prices are fair?'\nBetter: 'How do our prices compare with where you usually buy? Cheaper / About the same / More expensive'"},
        {"type": "callout", "label": "Collecting numbers? Mind the law", "text": "Kenya's Data Protection Act 2019 covers personal data like names and phone numbers. Only collect what you need, tell people why, and don't add survey respondents to a marketing list without their clear yes."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Scroll your last 50 comments and DMs. Write down every question asked more than once.", "Open Google Trends, set the location to Kenya and the time to 5 years, and compare three ways of naming your product.", "Send the interview DM to three people, including at least one who asked but didn't buy.", "Rewrite one survey or poll question so it has no 'agree' wording and no hint of the 'right' answer."]},
        {"type": "quiz", "q": "Which question gives you the most honest information before launching a new product?", "options": ["Would you buy this if I made it?", "Don't you think this is a great idea?", "Talk me through the last time you tried to solve this problem. What did you do?", "How much would you pay for this?"], "answer": 2, "explain": "Asking about a specific past event shows what people actually do, not what they politely say they'd do. Future 'would you' questions invite kind lies."},
        {"type": "takeaways", "items": ["Ask about past behaviour, not opinions or future promises.", "Wording changes answers. Avoid leading phrases and agree/disagree formats.", "Google Trends is relative: 100 is a peak, 0 isn't zero searches.", "Talk to people who didn't buy; your comments only show your fans."]},
        {"type": "locked", "module": "business_pro", "text": "Research tells you who your customers are. The Business Scale-Up Playbook tells you what each one is worth and how much to spend winning them:", "items": ["The CAC/LTV framework, with a worked KES example of the most you can afford to pay for one customer", "The four numbers to check every month, including the repeat-purchase rate most shops never calculate", "A five-column monthly tracker that shows which spend actually earns its keep", "The red flags in an agency quote, and real 2026 Kenyan agency rates to compare against"]},
        {"type": "sources", "items": [{"title": "Unusual Ventures: Rob Fitzpatrick's The Mom Test", "url": "https://www.unusual.vc/rob-fitzpatricks-mom-test/"}, {"title": "Google Trends Help: FAQ about Google Trends data", "url": "https://support.google.com/trends/answer/4365533?hl=en"}, {"title": "YouGov: How leading questions and acquiescence bias can impact survey results", "url": "https://yougov.com/articles/45308-how-leading-questions-and-acquiescence-bias-can-im"}]},
      ]},
      { id: "fm4", title: "The Funnel vs the Brand: How Content Really Turns Into Sales", minutes: 8, body: [
        {"type": "hook", "text": "At any moment, most people who will one day buy from you aren't ready to buy yet. Research on business buyers puts it at roughly **95 out of 100**."},
        {"type": "p", "text": "That's why hard-selling every post feels like shouting into the void. There are two big schools of thought on what to do about it. Smart marketers use both."},
        {"type": "h3", "text": "School 1: the funnel"},
        {"type": "p", "text": "The funnel idea goes back to **AIDA** (Attention, Interest, Desire, Action), usually credited to adman E. St. Elmo Lewis in the 1890s. Today it's often drawn as awareness, consideration, conversion and loyalty, with different content for each stage."},
        {"type": "table", "headers": ["Stage", "Job of the content", "Content that does it", "Number to watch"], "rows": [["Awareness", "Get noticed by strangers", "Short videos, trends done your way, relatable humour", "Reach, non-follower views"], ["Consideration", "Earn trust and answer doubts", "Tutorials, before/after, prices in KES, FAQs", "Saves, profile visits, follows"], ["Conversion", "Make buying easy now", "Offer posts, WhatsApp link, M-Pesa till, deadlines that are real", "DMs, orders"], ["Loyalty", "Bring buyers back and get referrals", "Thank-you posts, customer features, WhatsApp updates", "Repeat orders, referrals"]]},
        {"type": "p", "text": "**School 2: How Brands Grow.** Byron Sharp and the Ehrenberg-Bass Institute argue that people don't march neatly down a funnel. Brands grow mainly by reaching **more buyers**, especially light and occasional ones, and by building **mental availability** (coming to mind when a need arises) and physical availability (being easy to buy)."},
        {"type": "myth", "myth": "Growth comes from turning a few followers into superfans.", "truth": "Sharp's **double jeopardy** pattern: smaller brands have fewer buyers, and those buyers are also a bit less loyal. Growth mostly comes from reaching more people. Loyal fans matter, but for a small brand they usually follow growth rather than cause it."},
        {"type": "p", "text": "**The bridge.** Les Binet and Peter Field studied hundreds of IPA effectiveness case studies and found two kinds of effect: **brand building** (slow, broad, emotional, lasts) and **sales activation** (fast, targeted, fades). Their often-quoted optimum is about **60:40** brand to activation, confirmed at 62:38 in a 2018 follow-up."},
        {"type": "callout", "label": "The debate, fairly", "text": "Critics note that half of a set of winning IPA cases showed clear targeting, which cuts against 'reach everyone'. Mark Ritson's answer is 'bothism': use brand and performance together, with the mix set by your situation. 60:40 came from big advertisers, so for a small Kenyan business treat it as a direction, not a formula."},
        {"type": "insight", "label": "What most creators miss", "text": "Mental availability is built around **buying moments**, which Ehrenberg-Bass calls category entry points. A cake page shouldn't just post cakes; it should own moments like 'kid's birthday this Saturday', 'office send-off' and 'graduation week'. Each moment is a content series."},
        {"type": "template", "label": "One-week content mix (roughly 60:40)", "text": "BRAND (memory, reach) – 3 posts:\n• [BUYING MOMENT] story: '[SITUATION]? Here's how we handled it for [CUSTOMER TYPE].'\n• Behind the scenes with your signature look, sound or catchphrase\n• A useful tip for the whole category, not just buyers\n\nACTIVATION (sell now) – 2 posts:\n• Offer: [PRODUCT] KES [PRICE], order on WhatsApp [LINK] until [REAL DATE]\n• Proof: customer result + 'DM [KEYWORD] to book'"},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Label your last 10 posts as Brand or Activation. Note your current ratio.", "List five buying moments when someone would need what you sell.", "Plan next week using the content mix template.", "Check that a stranger can buy from you in two taps: WhatsApp link and M-Pesa details visible."]},
        {"type": "quiz", "q": "Binet and Field's famous 60:40 split refers to what?", "options": ["60% video posts, 40% photo posts", "Roughly 60% of effort on long-term brand building, 40% on short-term sales activation", "60% organic content, 40% paid ads", "60% posts for followers, 40% for non-followers"], "answer": 1, "explain": "It's brand building versus sales activation, based on IPA case studies. Brand work builds memory that makes later selling cheaper; activation cashes it in. Adjust the mix to your situation."},
        {"type": "takeaways", "items": ["Most future buyers aren't ready today, so build memory as well as making offers.", "The funnel is a useful map for content jobs; growth mostly comes from reaching more buyers.", "Balance brand and activation. 60:40 is a guide from big advertisers, not a law.", "Plan content around buying moments, not just products."]},
        {"type": "locked", "module": "money", "text": "Once people remember you, you need the part of the funnel that actually collects M-Pesa. Turn Growth Into Income covers it:", "items": ["The four-step funnel for selling your own product, and the one step that removes 'send me a screenshot'", "Which platforms let Kenyan buyers pay by M-Pesa directly, and what each one takes", "Why your first customers are already in your comments, and how to approach them before launching", "The cost-per-engagement sum that tells you if a brand's offer is under market"]},
        {"type": "sources", "items": [{"title": "Marketing Week: The 95:5 rule (Ehrenberg-Bass / LinkedIn B2B Institute)", "url": "https://www.marketingweek.com/peter-weinberg-jon-lombardo-95-5-rule"}, {"title": "IPA: The next chapter for The Long and The Short of It", "url": "https://ipa.co.uk/knowledge/ipa-blog/the-next-chapter-for-the-long-and-the-short-of-it/"}, {"title": "The B2B House: How Brands Grow summary", "url": "https://www.theb2bhouse.com/how-brands-grow-book-summary-and-guide/"}, {"title": "Marketing Week: Ritson, we should thank Byron Sharp, not attack him", "url": "https://www.marketingweek.com/?p=679992"}]},
      ]},
      { id: "fm5", title: "Measuring What Matters & Running Simple Experiments", minutes: 7, body: [
        {"type": "hook", "text": "YouTube's own A/B test tool doesn't crown the thumbnail with the most clicks. It picks the one that earns the most **watch time**."},
        {"type": "p", "text": "That one design choice tells you how the platforms think: the number that looks good isn't always the number that matters. This lesson helps you tell the difference and test ideas properly, even with a small page."},
        {"type": "h3", "text": "Vanity metrics vs decision metrics"},
        {"type": "p", "text": "A **vanity metric** looks impressive but doesn't tell you what to do next. A **decision metric** changes what you do on Monday. As investor Josh Kopelman put it, 'The real data is retention and repeat usage.'"},
        {"type": "table", "headers": ["Looks good (vanity)", "Better question (decision)", "What you'd change"], "rows": [["Total followers", "How many new followers came from this specific post?", "Make more of the posts that convert viewers"], ["Total views", "Average watch time and where people drop off", "Fix the hook or the slow part"], ["Likes", "Saves, shares and sends per 1,000 views", "Double down on useful, shareable topics"], ["Profile visits", "Link taps, WhatsApp chats started, orders", "Fix your bio, link or offer"], ["One viral post", "Your median views over the last 10 posts", "Judge progress by the typical post, not the outlier"]]},
        {"type": "myth", "myth": "If my follower count goes up, my business is growing.", "truth": "Followers can grow while sales stay flat, for example if the audience is in the wrong city or came for entertainment, not your product. Track **chats started and orders per week** next to followers. If only one of them moves, you've learned something important."},
        {"type": "h3", "text": "Simple experiments on social"},
        {"type": "ul", "items": ["**Change one thing at a time:** the hook, the cover, the caption or the posting time. Never all four.", "**Use the built-in tools:** Instagram's trial reels are shown to non-followers first, with results after about 24 hours. YouTube Studio's Test & Compare runs up to three titles and/or thumbnails on long videos.", "**Decide your rule before you start:** e.g. 'run 3 pairs; the hook wins if it beats the other in at least 2 of 3.'", "**Don't stop at the first good-looking result.** Checking constantly and stopping when it looks good makes lucky flukes look like winners."]},
        {"type": "insight", "label": "What most creators miss", "text": "Small numbers are mostly noise. If version A got 3 DMs and version B got 5, you haven't learned anything yet. Even YouTube's tool often reports 'performed the same' or 'inconclusive' and says that's normal. Look for **big, repeated** differences before you change your whole strategy."},
        {"type": "callout", "label": "The attribution blind spot", "text": "Much Kenyan word-of-mouth happens in WhatsApp chats and groups that analytics can't see. A sale may come from a video someone forwarded three weeks ago. So ask every buyer 'How did you hear about us?' and use a different keyword or code for each campaign."},
        {"type": "template", "label": "Experiment card + weekly review", "text": "EXPERIMENT\nIdea: If I [CHANGE ONE THING], then [METRIC] will go up because [REASON].\nVersion A: [ ]  Version B: [ ]\nRule decided in advance: [e.g. B wins if it beats A in 2 of 3 tries]\nResult: [ ]  Keep / Drop / Retest\n\nWEEKLY REVIEW (Sunday, 20 minutes)\n1. Chats started this week: [ ] Orders: [ ] KES in: [ ]\n2. Best post by saves/shares per 1,000 views: [ ] Why?\n3. Median views, last 10 posts: [ ] (up or down?)\n4. 'How did you hear about us?' answers: [ ]\n5. ONE thing to test next week: [ ]"},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Work out your median views over the last 10 posts and write it down as your baseline.", "Count the chats or orders that came in this week and note where each one heard about you.", "Write one experiment card for your next post: change only the hook.", "Set a Sunday reminder for the 20-minute weekly review."]},
        {"type": "quiz", "q": "When YouTube's Test & Compare tool picks a winning thumbnail, what does it use to decide?", "options": ["The highest click-through rate", "The most likes", "Watch time share", "The most new subscribers"], "answer": 2, "explain": "YouTube picks the option with the highest watch time share, not clicks, because a thumbnail that gets clicks but disappoints viewers isn't really winning. Judge your own tests by what happens after the click too."},
        {"type": "takeaways", "items": ["Track numbers that change your next move: watch time, shares, chats, orders.", "Test one change at a time, and set your winning rule before you start.", "Small differences are noise; look for big, repeated wins.", "Analytics can't see WhatsApp. Ask buyers where they found you."]},
        {"type": "locked", "module": "tiktok_pro", "text": "This lesson gives you the habit. The Advanced TikTok Growth & Algorithm Playbook gives you the exact numbers and logs to run it on every video:", "items": ["The five numbers worth checking on every video, and where each one hides in TikTok Analytics", "Why videos get stuck around a couple of hundred views, and the watch-time-first way to find the problem", "A 10-column video log that turns every post into a lesson", "How follower-first testing changes when you should post"]},
        {"type": "sources", "items": [{"title": "YouTube Help: A/B test titles & thumbnails", "url": "https://support.google.com/youtube/answer/16391400?hl=en"}, {"title": "Instagram Creators: Trial reels (Dec 2024)", "url": "https://creators.instagram.com/blog/instagram-trial-reels"}, {"title": "TechCrunch: Don't be fooled by vanity metrics (2011)", "url": "https://techcrunch.com/?p=399382"}]},
      ]},
    ],
  },
  {
    id: 'business', icon: '🏢', title: 'Social Media for Business Owners',
    blurb: "Turn followers into paying M-Pesa customers",
    lessons: [
      { id: "biz1", title: "Social Proof for Local Businesses: What Kenyan Buyers Check First", minutes: 6, body: [
        {"type": "hook", "text": "Google says customers are **2.7 times** more likely to see a business as reputable when its Business Profile is complete. Not better products. Not lower prices. A filled-in profile."},
        {"type": "p", "text": "Trust gets decided before anyone talks to you. A buyer in Kisumu looking for a cake for Saturday will check your page, your reviews and whether you look real — in under a minute — and then either message you or scroll on."},
        {"type": "stat", "value": "2.7x", "label": "more likely to be seen as reputable with a complete Google Business Profile; 70% more likely to visit (Google Business Profile Help)"},
        {"type": "h3", "text": "The trust stack buyers scan"},
        {"type": "ol", "items": ["**Is it real?** A physical area (\"Opposite Tuskys, Kisumu CBD\"), real photos, a phone number.", "**Is it active?** Recent posts, recent comments, replies from the owner.", "**Do others trust it?** Reviews, tagged customer photos, a believable follower count.", "**Is paying safe?** A named M-Pesa Till or Paybill, not a personal number."]},
        {"type": "insight", "label": "The overlooked signal: your Till in your bio", "text": "A Buy Goods Till shows a **registered business name** on the customer's M-Pesa confirmation. That's a trust signal, not just a payment method — people worried about \"kutapeliwa\" relax when the name matches your page. And since 7 August 2026 Safaricom charges merchants nothing on Buy Goods payments up to KES 500 (0.55% above that, capped at KES 200)."},
        {"type": "myth", "myth": "Customers only trust perfect 5-star ratings.", "truth": "BrightLocal's 2025 research found consumers are now more forgiving of imperfect ratings and see star scores partly as \"vanity metrics\". A 4.6 with detailed, recent reviews and owner replies often reads as more real than a handful of perfect fives."},
        {"type": "table", "headers": ["Where", "Trust fix", "Time"], "rows": [["Instagram/TikTok bio", "Area + \"Till 123456 (Business Name)\" + WhatsApp link", "5 min"], ["Facebook Page", "Hours, location, 6 real photos, Reviews switched on", "15 min"], ["Google Business Profile", "Category, hours, photos, phone/WhatsApp", "20 min"], ["WhatsApp Business", "Profile, address, catalogue, away message", "20 min"]]},
        {"type": "template", "label": "Trust-first bio", "text": "🎂 Custom cakes, Kisumu | Same-day orders before 10am\n📍 Milimani, near [landmark]\n💳 Till 123456 — [Registered Business Name]\n💬 Order on WhatsApp 👇 [wa.me/2547XXXXXXXX]"},
        {"type": "action", "label": "Do this today", "items": ["Add your Till/Paybill with your registered business name to every bio.", "Replace one stock photo with a real photo of your shop, team or product.", "Reply to the last 5 comments or reviews you never answered.", "Ask your 3 happiest recent customers for a short review today."]},
        {"type": "quiz", "q": "Which small change most directly reassures a cautious Kenyan buyer at the moment of paying?", "options": ["A logo redesign", "A personal Send Money number", "A Buy Goods Till that shows your registered business name", "More hashtags"], "answer": 2, "explain": "The M-Pesa confirmation shows the Till's registered name. When it matches your page, the buyer gets proof you're a real business at the exact moment they're nervous."},
        {"type": "service", "label": "Look open for business", "text": "If your page is new and quiet, a starting base of followers can help a first-time visitor read it as active — alongside real reviews and photos, not instead of them.", "platform": "all", "subcat": "followers", "cta": "Build a starting base"},
        {"type": "takeaways", "items": ["Trust is decided in seconds, from signals you control.", "A complete Google profile makes people 2.7x likelier to see you as reputable (Google).", "Your Till's registered name is a trust signal — put it in your bio.", "Recent, detailed reviews beat a perfect but thin rating."]},
        {"type": "locked", "module": "business_pro", "text": "Trust gets the click. The Business Scale-Up Playbook shows what to spend to turn clicks into profit.", "items": ["The CAC/LTV rule: why a shop with KES 9,000 lifetime value can safely pay up to about KES 3,000 per new customer", "The 4-layer digital stack (discovery → trust → conversion → retention) and the order to set it up", "Why boosting trust before paying for reach lowers the cost of every later ad", "The 4 numbers to track monthly so spend stops feeling like gambling"]},
        {"type": "sources", "items": [{"title": "Google Business Profile Help — Complete your Business Profile", "url": "https://support.google.com/business/answer/10515606?hl=en-GB"}, {"title": "The Standard — Safaricom halves M-Pesa merchant fees (Aug 2026)", "url": "https://www.standardmedia.co.ke/business/article/2001554316/safaricom-halves-m-pesa-merchant-fees-in-cbk-led-move"}, {"title": "Search Engine Journal — BrightLocal: do reviews still matter? (2025)", "url": "https://www.searchenginejournal.com/do-reviews-still-matter-study-looks-at-changing-consumer-behavior/541077/"}]},
      ]},
      { id: "biz2", title: "The Cold-Start Problem: Google Business Profile and Your First 10 Reviews", minutes: 6, body: [
        {"type": "hook", "text": "The most powerful free tool for a Kenyan shop isn't on Instagram or TikTok. It's the listing that appears when someone types \"salon near me\" — and most small businesses never claim it."},
        {"type": "p", "text": "Every new business has the same problem: no reviews, no followers, no proof. Customers would rather be your tenth buyer than your first. You break that loop by being findable and by collecting proof on purpose — not by waiting."},
        {"type": "h3", "text": "Step 1: Claim your Google Business Profile"},
        {"type": "p", "text": "It's free, and it puts you on Google Maps and local search. Google's own help page says customers are **70% more likely to visit** and **50% more likely to consider buying** from businesses with a complete profile. Complete means: correct category, hours, photos, phone or WhatsApp, and a description in plain words."},
        {"type": "stat", "value": "70%", "label": "more likely to visit a business with a complete Business Profile (Google Business Profile Help)"},
        {"type": "insight", "label": "What most owners miss", "text": "The **category** matters more than the description. \"Hair salon\" vs \"Beauty salon\" vs \"Barber shop\" changes which searches you show up in. Pick the most specific primary category, then add 1–2 secondary ones. Also add photos regularly — a profile that looks updated reads as a business that's still open."},
        {"type": "h3", "text": "Step 2: Engineer your first 10 reviews"},
        {"type": "ul", "items": ["Ask the **same day**, while the experience is fresh — at the counter or in the delivery WhatsApp chat.", "Send the direct review link (from your Google profile's \"Ask for reviews\" button), not \"search for us on Google\".", "Reply to every review, good or bad, within 48 hours. Owners who reply look present.", "Never buy fake reviews or review your own business — Google removes them and it can hurt your listing."]},
        {"type": "template", "label": "Review request (WhatsApp)", "text": "Hi [Name]! Asante for buying [product] from [Business] today 🙏\nIf you're happy with it, would you leave us a quick Google review? It really helps small businesses like ours get found:\n[your review link]\nIt takes 30 seconds. And if anything wasn't right, tell me here first so I can fix it."},
        {"type": "myth", "myth": "Reviews matter less now that everyone uses TikTok and Instagram.", "truth": "BrightLocal's 2025 research still found Google is consumers' preferred review platform, even as social media gains influence. Your social page gets attention; your Google profile often gets the final check before someone visits."},
        {"type": "action", "label": "Do this today", "items": ["Search your business name on Google Maps. If it's not there, create the profile; if it is, claim it.", "Choose the most specific primary category and add hours, 5 photos and your WhatsApp number.", "Copy your review link and save it as a WhatsApp quick reply (e.g. /review).", "Send the review request to 5 recent customers."]},
        {"type": "quiz", "q": "You're setting up a Google Business Profile. Which field most affects which searches you appear in?", "options": ["Business description", "Primary category", "Logo", "Opening date"], "answer": 1, "explain": "The primary category tells Google what kind of business you are, so it shapes which 'near me' searches you're matched to. Choose the most specific one."},
        {"type": "takeaways", "items": ["Claim your free Google Business Profile before spending on ads.", "Google says complete profiles get 70% more visits and 50% more purchase consideration.", "The primary category quietly decides which searches you show up in.", "Ask for reviews the same day, with a direct link, and answer every one."]},
        {"type": "locked", "module": "business_pro", "text": "Once you're findable, the next question is how much to spend to grow. That's where the Playbook starts.", "items": ["Why a verified, fully filled-in Google profile sits in the 'discovery' layer of the full Kenyan SME stack — and what comes after it", "The 30-day ROI sprint: trust in week 1, one focused ad in week 2, retargeting in week 3, cut-or-double in week 4", "Real 2026 Kenyan agency price ranges, so nobody charges you KES 30,000 a month for what you just did free", "The red flags in an agency quote — including no split between management fee and ad spend"]},
        {"type": "sources", "items": [{"title": "Google Business Profile Help — Complete your Business Profile", "url": "https://support.google.com/business/answer/10515606?hl=en-GB"}, {"title": "Search Engine Journal — BrightLocal: do reviews still matter? (2025)", "url": "https://www.searchenginejournal.com/do-reviews-still-matter-study-looks-at-changing-consumer-behavior/541077/"}, {"title": "DataReportal — Digital 2026: Kenya", "url": "https://datareportal.com/reports/digital-2026-kenya"}]},
      ]},
      { id: "biz3", title: "A Content + Ads Calendar That Doesn't Cost a Fortune", minutes: 7, body: [
        {"type": "hook", "text": "When a Kenyan business pays KES 1,000 for Meta ads, KES 160 more goes to VAT. Since November 2022 Meta has added **16% VAT** for advertisers billed in Kenya — and most first-time advertisers only notice on the receipt."},
        {"type": "p", "text": "Small ad budgets aren't a problem if every shilling lands on content that already works. The winning rhythm is simple: post consistently for free, watch what performs, and only then put money behind the winners."},
        {"type": "h3", "text": "The weekly rhythm (3 posts, 1 hour of filming)"},
        {"type": "table", "headers": ["Day", "Post type", "Example (Nairobi salon)"], "rows": [["Mon", "Proof", "Before/after braids, client tagged with permission"], ["Wed", "Teach", "\"3 mistakes that break your edges\" — 30-sec Reel/TikTok"], ["Fri", "Offer", "Weekend slots + price + WhatsApp link"], ["Daily", "WhatsApp Status", "Today's work, open slots, a customer voice note"]]},
        {"type": "p", "text": "Film everything in one session. Real, slightly rough clips often do better than polished ads because they look like content, not commercials."},
        {"type": "h3", "text": "Meta ads basics: Boost vs Ads Manager"},
        {"type": "ul", "items": ["**Boost** (the button on a post) is quick and fine for testing. Choose \"Get more messages\" over \"Get more likes\" if you sell through chat.", "**Ads Manager** gives you more control. For WhatsApp sellers the key setup is Engagement objective → Messaging apps → WhatsApp, which opens a chat with you straight from the ad (\"click-to-WhatsApp\").", "Start small: a few hundred shillings a day for 5–7 days on ONE proven post, aimed at a tight area around your shop.", "Budget for the 16% VAT. VAT-registered businesses can add their VAT ID in Meta's payment settings."]},
        {"type": "insight", "label": "What most owners miss", "text": "Boosting a post that flopped organically rarely saves it. Boost the post that already got the most **messages or saves** for free — the ad system has a head start because real people already responded to it."},
        {"type": "stat", "value": "16%", "label": "VAT added to Meta ads for advertisers billed in Kenya since November 2022 (Techweez / Meta notice)"},
        {"type": "template", "label": "Click-to-WhatsApp ad copy", "text": "PRIMARY TEXT: Knotless braids in Kilimani, done in 4 hours — not 8. Slots this weekend from KES [price].\nHEADLINE: Book on WhatsApp in 1 minute\nPRE-FILLED MESSAGE: Hi! I saw your ad. Do you have a slot this Saturday?"},
        {"type": "action", "label": "Do this today", "items": ["Plan next week's 3 posts in your phone notes using the table above.", "Look at your last 10 posts and find the one with the most messages or saves.", "If you'll advertise, set a fixed test budget (e.g. KES 2,100 + VAT over 7 days) on that one post.", "Write a pre-filled WhatsApp message so ad clicks arrive ready to buy."]},
        {"type": "quiz", "q": "You have KES 2,000 for ads this week. Which post should you put it behind?", "options": ["Your newest post, so it gets seen", "A post that got few likes, to rescue it", "The post that already got the most messages or saves for free", "A generic logo post"], "answer": 2, "explain": "Paid reach amplifies what's already working. A post that real people already messaged or saved has proven it can convert — ads just put it in front of more of the same people."},
        {"type": "takeaways", "items": ["Three posts a week plus daily WhatsApp Status is a realistic rhythm.", "Boost winners, not losers — pick by messages and saves, not likes.", "Click-to-WhatsApp ads send buyers straight into a chat.", "Meta adds 16% VAT for Kenyan advertisers — budget for it."]},
        {"type": "locked", "module": "business_pro", "text": "This lesson gets your first ad running. The Playbook shows how to scale it without wasting money.", "items": ["The exact sequence: trust first, then a small focused ad, then boost the posts the ad lands on", "Why to start with manual, tight targeting until you have 30–50 conversions before switching to automated bidding", "Retargeting — the cheapest ads you'll ever run — and how a small business sets it up", "A 5-column monthly tracker that shows which spend actually earns its keep"]},
        {"type": "sources", "items": [{"title": "Techweez — Meta ads in Kenya attract 16% VAT", "url": "https://techweez.com/2022/11/02/meta-ads-kenya-vat/"}, {"title": "360dialog — Ads that click to WhatsApp", "url": "https://docs.360dialog.com/docs/whatsapp-marketing/ads-that-click-to-whatsapp-ctwa-en"}, {"title": "DataReportal — Digital 2026: Kenya", "url": "https://datareportal.com/reports/digital-2026-kenya"}]},
      ]},
      { id: "biz4", title: "From DMs to M-Pesa: Closing the Sale on WhatsApp", minutes: 7, body: [
        {"type": "hook", "text": "A Communications Authority survey found WhatsApp and other social channels now carry about **1 in 5** online orders in Kenya — more than traditional websites. Your storefront is a chat window."},
        {"type": "p", "text": "Likes don't pay rent. Enquiries that turn into M-Pesa payments do. Most Kenyan businesses lose sales in the gap between \"How much?\" and \"Sent ✅\" — slow replies, no prices, unclear payment steps."},
        {"type": "stat", "value": "~20%", "label": "of online orders in Kenya placed via WhatsApp and other social channels; 70%+ of e-commerce done on phones (Communications Authority survey via The Star, Jan 2026)"},
        {"type": "h3", "text": "Set up WhatsApp Business properly (free)"},
        {"type": "ul", "items": ["**Catalogue:** up to 500 items, each with photos, price and description. Share the whole thing with one link: wa.me/c/2547XXXXXXXX.", "**Quick replies:** type /price, /location, /pay to send saved answers in one tap.", "**Labels:** New enquiry → Awaiting payment → Paid → Delivered. You'll see where sales get stuck.", "**Greeting + away messages:** answer instantly even when you're busy at the counter."]},
        {"type": "insight", "label": "What most sellers miss", "text": "\"Inbox me for price\" kills sales. Many buyers won't ask — they just leave. Put prices in the catalogue and posts. You lose nothing to competitors who already know your prices, and you stop losing customers who were too shy to ask."},
        {"type": "h3", "text": "The 4-message close"},
        {"type": "template", "label": "DM to sale script", "text": "1) GREET + QUALIFY: \"Karibu! 😊 Is it for you or a gift? Which size/colour?\"\n2) RECOMMEND + PRICE: \"This one is KES 2,500. Here's a photo on a customer 👇\"\n3) MAKE PAYING EASY: \"Pay to Till 123456 ([Business Name]) and I'll confirm right away. Delivery in Westlands today is KES 200.\"\n4) CONFIRM + NEXT STEP: \"Received, asante! Rider leaves at 3pm. I'll send his number.\""},
        {"type": "myth", "myth": "WhatsApp is free, so it'll always cost nothing to message customers.", "truth": "The free WhatsApp Business app is still free. But businesses using the WhatsApp Business Platform (API) pay per message, and from 1 October 2026 even service replies are charged after 1,000 free a month (about US$0.0044, ≈ KES 0.57, each in Kenya). Most small shops should stay on the free app until volume truly demands more."},
        {"type": "table", "headers": ["Leak", "Fix"], "rows": [["Reply after 3 hours", "Greeting message + quick replies; check chats at set times"], ["No price shown", "Prices in catalogue and posts"], ["\"Send to my number\"", "Till/Paybill with business name"], ["Buyer goes quiet", "One friendly follow-up the next day, then stop"]]},
        {"type": "action", "label": "Do this today", "items": ["Add your top 10 products to the WhatsApp Business catalogue with prices.", "Create /price, /location and /pay quick replies.", "Put your wa.me/c/ catalogue link in every bio.", "Label today's open chats and follow up once with anyone stuck at \"Awaiting payment\"."]},
        {"type": "quiz", "q": "What does a wa.me/c/ link do?", "options": ["Opens a group chat", "Shares your whole WhatsApp Business catalogue", "Sends an M-Pesa prompt", "Verifies your business"], "answer": 1, "explain": "wa.me/c/ followed by your number opens your catalogue directly, so a buyer can browse products and prices before messaging — perfect for bios and Status."},
        {"type": "takeaways", "items": ["About 1 in 5 Kenyan online orders now come through WhatsApp and social channels.", "A catalogue with prices + quick replies + labels removes most sales leaks.", "Make paying easy: a Till with your business name, stated in the chat.", "The free app is still free; the API now charges even service replies (from Oct 2026)."]},
        {"type": "locked", "module": "business_pro", "text": "You've got the close. The Playbook shows how to turn it into a system that pays back every month.", "items": ["Why businesses that removed the 'send me a screenshot' step lost fewer buyers — and how M-Pesa STK push does it", "The full WhatsApp cost table: marketing vs utility vs free replies, and when the paid API is worth it", "Owned vs rented channels: moving followers into a customer list you control", "Kenya's Data Protection Act opt-in rule for marketing messages — and how to collect consent"]},
        {"type": "sources", "items": [{"title": "The Star — How Kenyans place and receive orders (CA survey, Jan 2026)", "url": "https://www.the-star.co.ke/news/infographics/2026-01-08-placing-and-receiving-of-orders-what-kenyans-are-using-most"}, {"title": "Spur — WhatsApp Business catalogue limits and sharing", "url": "https://www.spurnow.com/en/blogs/whatsapp-business-catalog"}, {"title": "Techpoint Africa — WhatsApp per-message charges from 1 Oct 2026", "url": "https://techpoint.africa/guide/whatsapp-will-charge-businesses-per-message/"}, {"title": "The Standard — Safaricom halves M-Pesa merchant fees (Aug 2026)", "url": "https://www.standardmedia.co.ke/business/article/2001554316/safaricom-halves-m-pesa-merchant-fees-in-cbk-led-move"}]},
      ]},
    ],
  },
  {
    id: 'shorts', icon: '🎬', title: 'Shorts Strategy',
    blurb: "One video, three feeds — the 2026 rules",
    lessons: [
      { id: "sh1", title: "Why Short-Form Is the Cheapest Reach in Kenya", minutes: 5, body: [
        {"type": "hook", "text": "TikTok's ad tools can reach about 18.4 million Kenyan adults. Instagram's reach about 3.95 million people in Kenya. If you only post on Instagram, you're fishing in the smallest pond."},
        {"type": "p", "text": "Short vertical video is the only format where all three big platforms push your content to **people who don't follow you** by default. A photo mostly reaches followers. A good Short can reach a stranger in Kakamega on day one."},
        {"type": "stat", "value": "56.1%", "label": "Share of Kenyan adults (18+) reachable with TikTok ads in late 2025 — about 18.4 million people (DataReportal, Digital 2026: Kenya)"},
        {"type": "table", "headers": ["Platform", "Kenya ad reach (late 2025)", "How strangers find you"], "rows": [["TikTok", "18.4 million adults", "For You feed tests each video on new viewers"], ["YouTube", "12.1 million", "Shorts feed shows your video to a 'seed' audience first"], ["Instagram", "3.95 million", "Reels tab and Explore; Trial Reels go to non-followers only"]]},
        {"type": "p", "text": "Ad reach isn't the same as active users, and Meta revised how it reports audiences — so treat these as rough size comparisons, not exact headcounts."},
        {"type": "myth", "myth": "You need lots of followers before a video can go big.", "truth": "TikTok says in its own explanation of For You that \"neither follower count nor whether the account has had previous high-performing videos are direct factors\" in recommendations. Followers can still bring early views, but a new account's video can be tested on strangers like anyone else's."},
        {"type": "h3", "text": "Why it's cheap"},
        {"type": "ul", "items": ["**No ad spend needed** to reach non-followers — the feed does the distribution.", "**Your phone is enough.** Vertical 9:16, good light from a window, clear audio.", "**One idea can go to three apps**, if you do it properly (lesson 3)."]},
        {"type": "insight", "label": "What most creators miss", "text": "YouTube's Shorts team has said \"the audience is the algorithm\": each Short is shown to a small set of people who might like it, and reach grows or tapers based on how they respond. That means your first viewers decide everything — not your posting time, not your follower count."},
        {"type": "callout", "label": "Example: a Gikomba mitumba seller", "text": "A seller films 20-second try-ons of three jackets with prices on screen. On Instagram, a few hundred views. The same clips on TikTok and Shorts reach thousands of strangers in a week, and the WhatsApp orders come from all three. She keeps all three running, but now knows where discovery happens."},
        {"type": "action", "label": "Do this today", "items": ["Check whether you have accounts on TikTok, YouTube and Instagram under the same name — claim any that are missing.", "Film one 20–40 second vertical video showing a result (a finished hairstyle, a cake, a repair).", "Post it on the platform you use least and note views after 48 hours.", "Write down where your last 5 customers or new followers said they found you."]},
        {"type": "quiz", "q": "According to TikTok's own explanation, is follower count a direct factor in For You recommendations?", "options": ["Yes, it's the biggest factor", "Only after 1,000 followers", "No, it's not a direct factor", "Only for business accounts"], "answer": 2, "explain": "TikTok says neither follower count nor past hits are direct ranking factors. A new account can be tested on strangers — your content's first viewers decide."},
        {"type": "takeaways", "items": ["Short-form is the one format all three apps push to strangers by default.", "In Kenya, TikTok and YouTube reach far more people than Instagram.", "Followers aren't required for reach; strong first viewers are.", "Post where discovery happens, sell where your buyers message you."]},
        {"type": "locked", "module": "shorts_pro", "text": "Posting everywhere is easy. Posting everywhere well is a system — that's what the premium playbook is.", "items": ["The six dials you change per platform (hook, text, caption, audio, length, ending) without reshooting", "A one-page adaptation sheet you fill in for every video", "The four numbers that tell you which platform deserves most of your effort", "A 30-day test that picks your 'home base' platform from your own data"]},
        {"type": "sources", "items": [{"title": "DataReportal – Digital 2026: Kenya", "url": "https://datareportal.com/reports/digital-2026-kenya"}, {"title": "TikTok Newsroom – How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you"}, {"title": "OutlierKit – The YouTube Shorts algorithm in YouTube's words", "url": "https://outlierkit.com/resources/youtube-shorts-algorithm/"}]},
      ]},
      { id: "sh2", title: "The 3-Second Rule — and the Metric That Proves It", minutes: 5, body: [
        {"type": "hook", "text": "Every short-video app now shows you how many people rejected your video before it really started. Instagram calls it skip rate. YouTube calls it \"swiped away\". Most creators never look."},
        {"type": "p", "text": "Each platform tests your video on a small group first. If they leave fast, the video stops travelling. That's why the first seconds matter more than everything after them."},
        {"type": "h3", "text": "Where to find your 3-second score"},
        {"type": "table", "headers": ["App", "Metric", "What it tells you"], "rows": [["Instagram", "Skip rate (Reel Insights)", "% who left within the first 3 seconds"], ["YouTube", "Viewed vs swiped away (Studio)", "% who chose to watch instead of swiping"], ["TikTok", "Retention graph (video analytics)", "The exact second people drop off"]]},
        {"type": "myth", "myth": "My Short got 5,000 views, so 5,000 people watched it.", "truth": "Since March 2025, YouTube counts a Shorts view as soon as it starts playing or replays — no minimum watch time. The stricter number is now called **engaged views**, in Advanced Mode, and monetisation still uses engaged views. Look there to see who really stayed."},
        {"type": "h3", "text": "What a strong opening looks like"},
        {"type": "ul", "items": ["**Frame 1 is the result or the action**, not your face saying hello. Finished braids, the cake being cut, the engine starting.", "**Text on screen says the promise** in a few words, so it works with sound off.", "**No logo intros, no 'welcome back', no slow zoom.** Each spends your most valuable seconds on nothing.", "**Cut, don't fade.** Hard cuts keep pace in the opening."]},
        {"type": "insight", "label": "What most creators miss", "text": "TikTok says finishing a longer video from beginning to end gets more weight than weaker signals. A 45-second video that people actually finish is a stronger signal than a 7-second one they swipe from — so the hook must earn the middle, not just the first second."},
        {"type": "callout", "label": "Example: a Nairobi salon", "text": "Version A opens on the salon sign and the client sitting down — high skip rate. Version B opens on the finished knotless braids swinging, text: \"6 hours in 30 seconds\". Same footage, re-ordered. The salon compares skip rate and keeps whichever opening wins."},
        {"type": "template", "label": "Hooks to adapt (Kenyan versions)", "text": "\"KSh [AMOUNT] and this is what you get in [TOWN].\"\n\"Fundi wangu charged me [AMOUNT] for this. Here's how to do it yourself.\"\n\"Stop [COMMON HABIT] if you want [RESULT].\"\n\"[RESULT] in [TIME]. Watch.\"\n\"Nobody in [TOWN] is talking about this.\""},
        {"type": "action", "label": "Do this today", "items": ["Watch the first 3 seconds of your last video on mute. Would a stranger know what it's about?", "Find your skip rate, swipe-away rate or retention drop for one recent video.", "Re-edit one video so frame 1 is the result, with 8 words or fewer on screen.", "Post the new version and compare the 3-second number after 48 hours."]},
        {"type": "quiz", "q": "Since March 2025, what does a YouTube Shorts 'view' count?", "options": ["Anyone who watched at least 30 seconds", "Every play or replay, from the first frame", "Only viewers who liked the video", "Only viewers in your country"], "answer": 1, "explain": "Public Shorts views now count every start or replay. 'Engaged views' is the stricter number — and the one YouTube still uses for monetisation."},
        {"type": "takeaways", "items": ["Every app gives you a 3-second score — find it and track it.", "YouTube views count every play; check engaged views for the truth.", "Open on the result; explain after.", "A hook must earn the middle, because finishing counts."]},
        {"type": "locked", "module": "shorts_pro", "text": "A great hook is one dial. The premium playbook shows how to tune all of them per platform.", "items": ["How to write a different hook for TikTok, Reels and Shorts from the same footage", "The 'spine method' for cutting a 15–30s punch version and a longer story version from one shoot", "Exactly where each app shows a retention drop — and how to use it to decide your cut", "A two-cut script outline you can reuse every week"]},
        {"type": "sources", "items": [{"title": "Social Samosa – Instagram adds Retention chart and Skip Rate", "url": "https://www.socialsamosa.com/news-2/instagram-retention-chart-skip-rate-new-performance-metrics-reels-9730992"}, {"title": "PPC Land – YouTube changes how Shorts views are counted", "url": "https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/"}, {"title": "TikTok Newsroom – How TikTok recommends videos #ForYou", "url": "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you"}]},
      ]},
      { id: "sh3", title: "One Idea, Three Apps — Without Looking Like a Re-upload", minutes: 5, body: [
        {"type": "hook", "text": "On 1 October 2026, YouTube joined Instagram in cutting reach for re-uploaded Shorts. Posting your own video on three apps is fine — but do it the lazy way and it looks exactly like copying."},
        {"type": "p", "text": "One idea, filmed once, can become a TikTok, a Reel and a Short. The catch: each app now actively favours **original, native-looking** uploads, and each has different length rules."},
        {"type": "h3", "text": "The real length rules in 2026"},
        {"type": "table", "headers": ["Platform", "Length rule", "What to know"], "rows": [["YouTube Shorts", "Up to 3 minutes (since Oct 2024), square or taller", "Shorts view counts start at first play; monetisation uses engaged views"], ["Instagram Reels", "Up to 20 min in-app", "Only Reels of 3 minutes or less can be recommended to non-followers"], ["TikTok", "Multi-minute videos allowed", "Creator Rewards pays only for videos over 1 minute — and isn't open to Kenya-based creators"]]},
        {"type": "myth", "myth": "TikTok rewards 70% completion, Shorts need 30–45 seconds, Reels need 7–15 second loops.", "truth": "None of those numbers come from the platforms — earlier versions of this lesson repeated them, and we've corrected that. No platform publishes an ideal length. Make the video as long as the idea holds attention, and let each app's retention data tell you where to cut."},
        {"type": "h3", "text": "What counts as copying"},
        {"type": "ul", "items": ["**Another app's watermark** — Instagram tries not to recommend Reels carrying other apps' logos. Your own logo is fine (Mosseri, Oct 2024).", "**Low-effort changes** — Instagram says adding a watermark or changing speed doesn't make content yours.", "**Re-uploads with nothing added** — YouTube's October 2026 update reduces Shorts reach for these; YouTube says minor technical or template-based edits made \"simply to alter a video\" don't help."]},
        {"type": "insight", "label": "What most creators miss", "text": "The safest workflow is a **clean master**: edit once, export with no platform logo, and upload that file to each app. Never download your finished TikTok and re-upload it — that's how your own video ends up looking like someone else's re-upload."},
        {"type": "callout", "label": "Example: a Mombasa juice bar", "text": "The owner films one clip of a mango-passion blend. From the clean master: a tight cut with a trending sound on TikTok, a version ending \"send this to your juice-date friend\" on Reels, and one titled \"Mombasa's thickest mango juice?\" on Shorts. Same footage, three native uploads."},
        {"type": "template", "label": "Clean-master checklist", "text": "[ ] Filmed 9:16, face and text in the middle (away from top/bottom buttons)\n[ ] Exported from editor with NO platform watermark\n[ ] No 'follow me on TikTok' burned into the video\n[ ] Text and sound added inside each app\n[ ] Growth version under 3 minutes for Reels\n[ ] Caption rewritten for each platform"},
        {"type": "service", "label": "Back your best clip on the platform that converts", "text": "Once your clean versions are live, a small, gradual views order on the one that's bringing DMs gives it social proof as real viewers arrive. It won't count toward monetisation — it just helps a strong video make a good first impression.", "platform": "all", "subcat": "views", "cta": "Choose a views package"},
        {"type": "action", "label": "Do this today", "items": ["Search your last 10 uploads for any with another app's logo — delete or re-export them clean.", "Create a 'Masters' album on your phone for clean exports.", "Check that your Reels meant for new viewers are 3 minutes or under.", "Post one clean master to all three apps, each with its own caption."]},
        {"type": "quiz", "q": "Which upload is safest for reach on all three platforms?", "options": ["Your TikTok downloaded with its watermark", "A clean export with your own logo, captioned inside each app", "Someone else's viral clip sped up 1.1x", "A 6-minute Reel aimed at new viewers"], "answer": 1, "explain": "Your own logo is fine, rival watermarks and speed tweaks aren't, and Reels over 3 minutes can't be recommended. A clean master finished natively in each app is the safe route."},
        {"type": "takeaways", "items": ["Shorts ≤ 3 min; Reels for strangers ≤ 3 min; TikTok pays only for >1 min (not in Kenya).", "No app publishes an 'ideal length' — test with retention data.", "Rival watermarks and low-effort edits cost reach; your own logo doesn't.", "Always upload from a clean master."]},
        {"type": "locked", "module": "shorts_pro", "text": "This lesson keeps you safe. The premium playbook makes the system fast and measurable.", "items": ["A side-by-side table of hook, caption, sound and call to action for each platform", "A three-caption formula with KSh pricing and M-Pesa ordering built in", "A weekly rhythm: one filming session, three masters, nine posts", "A monthly scorecard (follow, share and enquiry rate per 1,000 views) to pick where to double down"]},
        {"type": "sources", "items": [{"title": "PPC Land – Re-uploaded Shorts lose reach as YouTube favours originals (Oct 2026)", "url": "https://ppc.land/re-uploaded-shorts-lose-reach-as-youtube-favours-original-clips/"}, {"title": "9to5Google – YouTube Shorts can be up to 3 minutes", "url": "https://9to5google.com/2024/10/03/youtube-shorts-3-minutes/"}, {"title": "Instagram for Creators – What creators need to know about recommendations", "url": "https://creators.instagram.com/blog/instagram-recommendations-eligibility-tips-creators"}, {"title": "TechCrunch – Instagram restricts reach of content aggregators (Apr 2026)", "url": "https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/"}]},
      ]},
    ],
  },
  {
    id: 'ai_content', icon: '🤖', title: 'AI Content Creation',
    blurb: "Use AI to think faster without sounding generic",
    lessons: [
      { id: "ai1", title: "AI as a Brainstorming Partner, Not a Ghostwriter", minutes: 6, body: [
        {"type": "hook", "text": "YouTube's rules explicitly allow \"using AI to edit your video scripts\". What they don't allow is content that looks mass-produced. The real line isn't AI or no AI. It's **templated or genuinely yours**."},
        {"type": "p", "text": "In July 2025 YouTube renamed its \"repetitious content\" policy to **inauthentic content**. It names AI-generated content \"made with generic or unoriginal templates giving the impression of mass production\" as not monetisable. Other platforms are moving the same way."},
        {"type": "p", "text": "In January 2026, Instagram head Adam Mosseri said AI will make polish easy to fake. He suggested creators may lean into **unproduced, imperfect** content as proof they're real. When everyone can generate polish, your real face, place and prices become the scarce thing."},
        {"type": "myth", "myth": "Platforms punish anything made with AI.", "truth": "YouTube says AI help with scripts, titles and thumbnails doesn't even need disclosing, and that an AI label alone doesn't reduce reach or earnings. The risk is generic, repetitive output with no human in it."},
        {"type": "h3", "text": "Use AI where it's strongest: quantity and angles"},
        {"type": "ol", "items": ["**Ask for volume.** 20 ideas, not 1. Most will be average; you're looking for 2–3 sparks.", "**Make it argue with itself.** \"Which 5 of these would a Nairobi audience find boring, and why?\" AI is good at critique.", "**Make it interview you.** \"Ask me 5 questions about my business before suggesting ideas.\" Your answers are the details AI can't invent.", "**You add the proof.** The real price, the real estate, the customer's actual question. That's what turns an AI idea into your content."]},
        {"type": "template", "label": "Brainstorm prompt (works in ChatGPT, Claude or Gemini)", "text": "I run [BUSINESS/CHANNEL] in [TOWN], for [AUDIENCE].\nBefore giving ideas, ask me 5 questions about my customers and what they always ask me.\nThen give me 20 short video ideas. Mix: 5 mistakes people make, 5 behind-the-scenes, 5 myths, 5 price/value explainers.\nFinally, tell me which 5 ideas are most generic and could be posted by anyone, so I can drop them."},
        {"type": "callout", "label": "Example: an Eastleigh fabric shop", "text": "AI suggests \"5 tips for choosing fabric\". Generic. After the interview step, the owner mentions customers always ask whether a KSh 450 per metre chiffon will shrink. New idea: \"I washed KSh 450 and KSh 1,200 chiffon side by side, here's what happened.\" Only she could make that video."},
        {"type": "action", "label": "Do this today", "items": ["Run the brainstorm prompt and answer its 5 questions honestly.", "Delete the 5 ideas it flags as generic.", "Add one real detail (price, place, customer question) to your top 3.", "Save the prompt in your notes app as \"Brainstorm v1\"."]},
        {"type": "quiz", "q": "Under YouTube's July 2025 inauthentic content policy, which of these is explicitly allowed?", "options": ["AI videos made from one template, posted 10 times a day", "Using AI to edit your video script", "Image slideshows with AI voiceover and no commentary", "An AI \"doctor\" persona giving health advice"], "answer": 1, "explain": "YouTube lists using AI to edit scripts as acceptable. Templated mass production, slideshows with minimal narrative, and AI personas posing as experts on sensitive topics are not monetisable."},
        {"type": "takeaways", "items": ["The line platforms draw is mass-produced vs original, not AI vs human.", "Use AI for volume and critique; you supply the real details.", "Imperfect, specific, real content is becoming the proof of authenticity."]},
        {"type": "locked", "module": "ai_content_pro", "text": "AI Content Creation, Advanced Workflows turns this into a month of content in one sitting.", "items": ["The reusable creator brief that makes AI output sound like your niche, not everyone's", "A 40-idea prompt sorted by content pillar, plus the 1–3 scoring system to cut it to 20", "The one follow-up prompt that turns your best idea into a 3-part series", "How a Kisumu fish seller turned one idea into three posts"]},
        {"type": "sources", "items": [{"title": "YouTube Help: Channel monetisation policies (inauthentic & reused content)", "url": "https://support.google.com/youtube/answer/1311392?hl=en"}, {"title": "Storyboard18: Instagram chief on AI flooding feeds and fingerprinting real media (Jan 2026)", "url": "https://www.storyboard18.com/digital/instagram-chief-warns-ai-generated-content-will-flood-feeds-flags-fingerprinting-of-real-media-86899.htm"}, {"title": "YouTube Help: Disclosing use of altered or synthetic content", "url": "https://support.google.com/youtube/answer/14328491?hl=en-GB"}]},
      ]},
      { id: "ai2", title: "Better Prompts in Half the Time", minutes: 6, body: [
        {"type": "hook", "text": "The fastest way to improve AI output isn't clever wording. It's pasting in **three of your own past captions**. Examples teach the AI your voice better than any adjective."},
        {"type": "p", "text": "OpenAI's own prompting guide recommends giving examples of the input and output you want, being precise, setting a role, and refining over several attempts. Nearly every bad AI caption comes from a prompt that skipped those steps."},
        {"type": "table", "headers": ["Weak prompt", "Strong prompt"], "rows": [["Write a caption for my salon", "Write 3 TikTok captions for a Rongai salon, knotless braids KSh 2,500, Saturday slots open. Audience: women 20–30. Friendly, a little Sheng. Under 25 words each."], ["Give me YouTube ideas", "Give me 10 YouTube ideas for a Nakuru maths tutor whose viewers are Form 3 students revising for KCSE. Avoid generic study tips."], ["Make this better", "Make this shorter and more direct. Keep my phrases \"sawa sawa\" and \"si utani\". Remove anything that sounds like an advert."]]},
        {"type": "h3", "text": "The 5-part prompt"},
        {"type": "ol", "items": ["**Role:** \"You are a social media editor for small Kenyan businesses.\"", "**Context:** platform, audience, location, price, goal (DMs, bookings, follows).", "**Task:** exactly what to produce and how many options.", "**Examples:** 2–3 of your own past posts that performed well, between clear markers like ---.", "**Format & limits:** word count, tone, language mix, \"no hashtags\", \"no emojis\"."]},
        {"type": "template", "label": "Copy-paste caption prompt", "text": "You are a social media editor for small Kenyan businesses.\nPlatform: [TIKTOK / REELS / SHORTS]\nBusiness: [WHAT YOU SELL] in [AREA], price [KSh]\nAudience: [WHO], goal: [DMs / BOOKINGS / FOLLOWS]\nHere are 3 of my captions that did well:\n---\n[CAPTION 1]\n---\n[CAPTION 2]\n---\n[CAPTION 3]\n---\nWrite 5 new captions for [TODAY'S POST] in the same voice. Under [25] words each. Mix English and a little Sheng like my examples. End each with one clear call to action."},
        {"type": "insight", "label": "What most creators miss", "text": "Ask the AI to explain its choices: \"For each option, tell me in one line who it's for.\" You learn faster, and you spot when it's guessing about your audience. Then fix the brief, not just the caption."},
        {"type": "myth", "myth": "Good prompters get it right first time.", "truth": "OpenAI's guide itself says to start, review the response and refine. Expect 2–3 rounds. What saves time is saving the prompt that finally worked."},
        {"type": "action", "label": "Do this today", "items": ["Find 3 of your best-performing captions and paste them into one note.", "Rewrite your usual \"write a caption\" prompt using the 5 parts.", "Run it, then refine once with a specific instruction (\"shorter\", \"more Sheng\", \"less salesy\").", "Save the final version as your caption prompt."]},
        {"type": "quiz", "q": "Which single addition usually improves AI captions the most?", "options": ["Saying \"please\" and \"make it viral\"", "Pasting 2–3 of your own past captions as examples", "Asking for more emojis", "Using a paid AI plan"], "answer": 1, "explain": "Examples show the AI your rhythm, length and language mix directly. OpenAI's prompting guide lists giving examples as a core technique. \"Make it viral\" tells it nothing about you."},
        {"type": "takeaways", "items": ["Role, context, task, examples, format: five parts, every time.", "Your own past captions are the best style guide you can give an AI.", "Expect to refine twice, then save the prompt that worked."]},
        {"type": "locked", "module": "ai_content_pro", "text": "The premium module builds your voice into every script.", "items": ["How to build a \"voice file\" and why it beats describing your tone", "A prompt that returns 5 hook types for every idea: question, bold claim, mistake, result-first, story", "The three edit passes (voice, specificity, cut) that turn AI drafts into your scripts", "Before/after table of generic AI lines rewritten with real KES, places and numbers"]},
        {"type": "sources", "items": [{"title": "OpenAI Help: Prompt engineering best practices for ChatGPT", "url": "https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt"}, {"title": "Storyboard18: Instagram chief on AI flooding feeds and fingerprinting real media (Jan 2026)", "url": "https://www.storyboard18.com/digital/instagram-chief-warns-ai-generated-content-will-flood-feeds-flags-fingerprinting-of-real-media-86899.htm"}]},
      ]},
      { id: "ai3", title: "Where AI Fits in 2026: Tools Change, Workflows Last", minutes: 7, body: [
        {"type": "hook", "text": "Sora, the AI video app that topped the charts in late 2025, was shut down on 26 April 2026. If your whole workflow depends on one AI tool, you're one announcement away from starting over."},
        {"type": "p", "text": "OpenAI announced the end of Sora in March 2026 and switched off its API in September. Google replaced Veo inside the Gemini app with a new model, Gemini Omni (10-second clips, paid plans only). Tools come and go. Build around **jobs**, not brand names."},
        {"type": "table", "headers": ["Workflow stage", "Let AI do", "Keep for yourself"], "rows": [["Ideas", "Generate 20+ angles, critique them", "Pick, add real customer questions"], ["Script & captions", "First drafts, 5 hook options", "Your voice, prices, places"], ["Filming", "Shot list, checklist", "Being on camera; real footage"], ["Editing", "Auto-captions, silence removal, resizing", "Pacing, what to cut, final look"], ["Posting", "Hashtag & title suggestions", "AI labels, timing, replying to comments"]]},
        {"type": "h3", "text": "What the main tools are good for"},
        {"type": "ul", "items": ["**ChatGPT, Claude, Gemini:** ideas, scripts, captions, turning a voice note into a plan. Free tiers are enough to start.", "**CapCut:** auto-captions are its most useful AI feature. Many advanced AI tools (video generation and more) need paid credits, and credits work on desktop and web rather than the phone app.", "**Video generators (Gemini Omni, Kling, Runway, Seedance in CapCut):** short synthetic clips. Fun for B-roll, rarely needed for a small business."]},
        {"type": "h3", "text": "The label you can't remove"},
        {"type": "p", "text": "Many AI tools now embed invisible markers. Google's Gemini videos carry a SynthID watermark. TikTok reads C2PA Content Credentials and has labelled more than 1.3 billion videos. Since May 2026 YouTube automatically labels significant photorealistic AI even if you didn't tick the box. Meta shows an \"AI info\" label on Facebook and Instagram."},
        {"type": "insight", "label": "What most creators miss", "text": "TikTok is testing a setting that lets viewers choose to see **less AI-generated content** in their For You feed. If your posts are mostly AI visuals, part of your audience can now opt out of them. Your own face and footage can't be filtered away like that."},
        {"type": "callout", "label": "Privacy: a Kenyan habit to build", "text": "Don't paste customers' names, phone numbers or M-Pesa messages into chatbots to \"write a thank-you post\". Kenya's Data Protection Act expects you to protect personal data you hold. Replace details with [CUSTOMER] first."},
        {"type": "action", "label": "Do this today", "items": ["Write your workflow in the 5 stages above and mark which tool you use at each.", "For any stage that depends on one tool, write down a backup tool.", "Turn on auto-captions in CapCut for your next video and fix any misheard Swahili words.", "Find the AI label switch in TikTok's and YouTube's upload screens so you know where it is."]},
        {"type": "quiz", "q": "You post a fully AI-generated, realistic video to YouTube and don't tick the AI disclosure. What does YouTube now do?", "options": ["Nothing, labels are only voluntary", "Its systems can detect it and add the label automatically", "It deletes the video instantly", "It demonetises the channel immediately"], "answer": 1, "explain": "Since May 2026 YouTube applies a label automatically when it detects significant photorealistic AI. The label alone doesn't cut reach, but repeatedly failing to disclose can lead to penalties."},
        {"type": "takeaways", "items": ["Build your workflow around jobs; tools like Sora can disappear.", "AI drafts and edits; your face, footage and details carry the content.", "Platforms increasingly detect AI automatically, so label honestly from the start."]},
        {"type": "locked", "module": "ai_content_pro", "text": "AI Content Creation, Advanced Workflows gives you the full system.", "items": ["The 4 categories of AI video tool and which one most creators actually need", "A tool-test scorecard (cost in KES, watermark, export limits, time to post) to stop wasting trials", "A 5-question disclosure decision guide plus copy-paste caption disclosure lines", "A Monday-to-Thursday weekly AI loop with a review prompt that learns from your best posts"]},
        {"type": "sources", "items": [{"title": "Wikipedia: Sora (text-to-video model), discontinuation dates", "url": "https://en.wikipedia.org/wiki/Sora_(text-to-video_model)"}, {"title": "Google Gemini: Video generation with Gemini Omni", "url": "https://gemini.google/overview/video-generation/"}, {"title": "TikTok Newsroom: More ways to spot, shape and understand AI-generated content", "url": "https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-generated-content?lang=en-GB"}, {"title": "YouTube Blog: Improving AI labels for viewers and creators (May 2026)", "url": "https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/"}]},
      ]},
    ],
  },
  {
    id: 'capcut', icon: '✂️', title: 'CapCut Editing',
    blurb: "Free, fast vertical editing, and how to avoid the 2026 paywall traps",
    lessons: [
      { id: "cc1", title: "Your First Edit (and the Pro-Badge Trap)", minutes: 5, body: [
        {"type": "hook", "text": "The most expensive tap in CapCut isn't an effect. It's adding a **Pro-badged** sticker, font or transition on a free account, then finding out at export that you must pay or start removing things."},
        {"type": "p", "text": "CapCut is still free to download and still does the core job beautifully: cutting vertical video fast on a phone. But in 2026 it is clearly split into **Free, Standard and Pro** tiers, and the line between them moves by region and app version. Learn the core loop on free tools, and you'll never be held hostage by a paywall."},
        {"type": "table", "headers": ["Plan", "Reported 2026 price (US)", "What it's for"], "rows": [["Free", "KES 0", "Cutting, splitting, keyframes, text, free templates and effects"], ["Standard", "About $9.99/month", "Removes watermarks on some paid items, more templates and effects, 1080p"], ["Pro", "$19.99/month or $179.99/year", "4K export, full AI toolkit, large cloud storage"]]},
        {"type": "p", "text": "Pro used to cost around $78 a year before CapCut raised it in early 2026. Prices differ by country and are often higher through the app stores, so always check the price shown in your own app."},
        {"type": "h3", "text": "Your first edit, step by step"},
        {"type": "ol", "items": ["Tap **New project** and select your clips. They land on the timeline in the order you picked them.", "Set the canvas to **9:16** first (look for Ratio or Format). Everything you add after this is framed correctly.", "Tap a clip to select it. The toolbar switches to clip tools like Split, Speed, Volume.", "Move the playhead to where you want a cut and tap **Split**.", "Select the piece you don't want and tap **Delete**. This is how you remove dead air, bad takes and \"ehh, so...\""]},
        {"type": "insight", "label": "The badge check", "text": "Anything with a small Pro or diamond badge, whether a font, effect, transition, filter or template, can trigger a watermark or a payment prompt when you export on a free plan. Before you build an edit around something pretty, look for the badge. If it's there, decide now, not after 20 minutes of work."},
        {"type": "myth", "myth": "A good edit needs transitions, effects and filters.", "truth": "Pacing is what keeps people watching, and pacing comes from Split and Delete. A cuts-only edit with every pause removed usually holds viewers better than a heavily decorated edit that's still slow. Effects are seasoning, not the meal."},
        {"type": "ul", "items": ["Download effects and fonts on Wi-Fi. Previewing dozens of templates on Safaricom bundles adds up fast.", "Export at 1080p for TikTok, Reels and Shorts. It's sharp on phones and keeps upload sizes manageable on mobile data.", "Name projects by date and topic (e.g. 261101_chapati_tip) so you can find them later."]},
        {"type": "action", "label": "Do this today", "items": ["Open CapCut, start a project and set the ratio to 9:16 before anything else.", "Import one clip you've already filmed and remove every pause using Split and Delete only.", "Scan your toolbar for Pro badges so you know which tools are free in your region.", "Check the price CapCut shows you for Pro in your app, in KES."]},
        {"type": "quiz", "q": "You're on CapCut's free plan and use a Pro-badged transition. What usually happens?", "options": ["Nothing, all effects are free in Kenya", "Export asks you to subscribe or remove the paid item, or adds a watermark", "CapCut deletes your project", "TikTok blocks the video"], "answer": 1, "explain": "Pro-badged items are the paywall's front door. On a free plan, exporting with them typically means paying, removing them, or accepting a watermark. Check for badges before you build an edit around them."},
        {"type": "takeaways", "items": ["CapCut now has Free, Standard and Pro tiers; prices vary by region.", "Pro rose to a reported $179.99/year in 2026 (from about $78).", "Look for Pro badges before using any effect, font or template.", "Split + Delete is the core skill; pacing beats polish."]},
        {"type": "locked", "module": "capcut_pro", "text": "Split and Delete gets you a clean cut. The premium course shows you where to cut and why.", "items": ["The 2–3 second visual-change rule, and when a process shot is allowed to break it", "Punch-in zooms that fake a second camera angle from one phone", "A retention-graph table that matches each drop pattern to the exact CapCut fix", "A pacing checklist that tells you, timestamp by timestamp, where viewers will get bored"]},
        {"type": "sources", "items": [{"title": "Newsweek: CapCut nearly doubles subscription price (Feb 2026)", "url": "https://www.newsweek.com/app-used-millions-nearly-doubles-subscription-price-overnight-11535999"}, {"title": "BIGVU: CapCut Free vs Pro, the 2026 restructure", "url": "https://bigvu.tv/blog/capcut-free-vs-pro-what-2026s-restructure-gives-you/"}, {"title": "Techpresso: Is CapCut Pro worth it in 2026?", "url": "https://academy.techpresso.co/reviews/is-capcut-pro-worth-it"}]},
      ]},
      { id: "cc2", title: "Captions in 2026: Free, Paid and the Kenyan Proofreading Problem", minutes: 5, body: [
        {"type": "hook", "text": "In many regions, CapCut's **Auto Captions** now carries a Pro badge. Meanwhile, the app you're posting to may caption your video for free. Most creators pay for something they already have."},
        {"type": "p", "text": "Captions matter because many people scroll with the sound off: in a matatu, at work, next to a sleeping baby. If they can't follow without sound, they swipe. But how you add captions in 2026 depends on what your CapCut shows you."},
        {"type": "table", "headers": ["Option", "Cost", "Best for"], "rows": [["CapCut Auto Captions", "Free in some regions/versions; Pro-badged or limited in others", "Styled, animated captions you control fully"], ["TikTok's own auto captions (in the posting editor)", "Free", "Quick talking videos posted only to TikTok"], ["CapCut manual Text tool", "Free", "Short videos with a few key lines"], ["Auto captions on YouTube", "Free", "Long videos; not burned into the picture"]]},
        {"type": "h3", "text": "If you have CapCut Auto Captions"},
        {"type": "ol", "items": ["Tap **Text**, then **Auto captions**. Choose the spoken language, and CapCut drops timed captions onto their own track.", "Open the caption list view and proofread everything in one scroll instead of tapping each clip.", "Style one caption: bold font, white text with a black outline or box. Apply to all.", "Drag the captions into the **middle third** of the screen. The top and bottom get covered by usernames, buttons and the progress bar."]},
        {"type": "insight", "label": "The Kenyan proofreading problem", "text": "Auto-transcription tends to struggle with Kenyan names, Swahili and Sheng, and terms like M-Pesa, Till, KSh, Gikomba or Kawangware. A caption reading \"Empress Are\" instead of \"M-Pesa Till\" tells a viewer you didn't check, and it confuses search, because TikTok uses the words in and around your video to work out what it's about."},
        {"type": "template", "label": "Words to always check in auto captions", "text": "Money: M-Pesa, Till, Paybill, KSh / KES, bob, ngiri\nPlaces: [YOUR AREA], [YOUR TOWN], [YOUR MARKET OR ESTATE]\nBrand: [YOUR BUSINESS NAME], [YOUR PRODUCT NAMES]\nSwahili/Sheng you use often: [e.g. sasa, poa, manze, uko wapi]\nNumbers: prices, phone numbers, dates (auto-captions often mis-hear these)"},
        {"type": "myth", "myth": "Captions are just for deaf viewers and people on mute.", "truth": "They also help **search**. TikTok's Creator Rewards formula includes a 'search value' metric based on popular search terms, and TikTok matches videos to searches using the words around them. A caption that says your keyword clearly gives the system one more clue about who should see the video."},
        {"type": "ul", "items": ["Keep 3–6 words on screen at a time so viewers watch rather than read.", "If Auto Captions is paywalled for you, add 3–5 manual text lines for the key moments instead of every word.", "Burned-in captions (in CapCut) survive when you repost to Reels or Shorts; TikTok's own captions don't travel with the file."]},
        {"type": "action", "label": "Do this today", "items": ["Open CapCut, tap Text, and check whether Auto Captions is free, limited or Pro-badged for you.", "If it's paywalled, try TikTok's own auto captions on your next TikTok-only post.", "Copy the proofreading template into your notes and fill in your own words.", "Fix the captions on one old video and move them into the middle third."]},
        {"type": "quiz", "q": "Auto Captions shows a Pro badge in your CapCut. What's the smartest free move for a TikTok-only talking video?", "options": ["Subscribe to Pro immediately", "Skip captions entirely", "Use TikTok's own free auto captions when posting, and proofread them", "Use a Pro font so it looks premium"], "answer": 2, "explain": "TikTok's posting editor offers its own auto captions at no cost. For a video that's only going to TikTok, that's often enough. Burned-in CapCut captions matter more when you repost the same file to other apps."},
        {"type": "takeaways", "items": ["Auto Captions may be free, limited or Pro depending on your region and version.", "TikTok's own captions are a free fallback for TikTok-only posts.", "Always proofread Kenyan names, Swahili, Sheng and M-Pesa terms.", "Middle third, 3–6 words at a time."]},
        {"type": "locked", "module": "capcut_pro", "text": "Getting captions on is step one. Making them fast, consistent and reusable is where the hours come back.", "items": ["A fill-once caption style spec, including the highlight colour trick that guides the eye to your price", "How to save your style so it's one tap on every future video", "Keyframe moves (slow push-in, pan, quick zoom) that make one static phone shot look filmed on purpose", "A Kisumu tutor's caption-and-keyframe routine that gets faster every week"]},
        {"type": "sources", "items": [{"title": "BIGVU: CapCut Free vs Pro, the 2026 restructure", "url": "https://bigvu.tv/blog/capcut-free-vs-pro-what-2026s-restructure-gives-you/"}, {"title": "FluxNote: CapCut AI features, free vs paid in 2026", "url": "https://fluxnote.io/guides/capcut-ai-features-free-vs-paid-2026"}, {"title": "TikTok Newsroom: Introducing the new Creator Rewards Program", "url": "https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program?lang=en"}]},
      ]},
      { id: "cc3", title: "Reusable Formats Without the Template Button", minutes: 5, body: [
        {"type": "hook", "text": "That \"post a template\" button you've seen on CapCut? It's restricted to **approved template creators**, and most people never get it. The real professional shortcut is far simpler, and it's free."},
        {"type": "p", "text": "Re-making the same styling decisions on every video is what makes editing feel slow. You pick a font. You find the right size. You remember where captions go. Every single time. The fix isn't a fancy feature; it's turning your best project into a **starting point**."},
        {"type": "h3", "text": "Method 1: Duplicate your best project"},
        {"type": "ol", "items": ["Finish a video you're happy with: captions styled, intro and outro set, music at the right volume.", "Go to your projects list, open the project's menu (the three dots) and choose **Duplicate**.", "Rename the copy, e.g. MASTER_salon_tip.", "For each new video, duplicate MASTER, swap in new clips and edit the text. Style, positions and export settings are already done."]},
        {"type": "h3", "text": "Method 2: Save text styles and favourites"},
        {"type": "p", "text": "When you style a caption you love, look in the text style panel for an option to save it or add it to favourites. The label moves between updates. Do the same for effects and transitions you use often by tapping the star or favourite icon."},
        {"type": "insight", "label": "Why your template button is missing", "text": "CapCut's help centre says posting templates is limited to approved creators, the option doesn't appear until you're approved, and posting generally isn't supported on the web version. Don't waste an evening hunting for a button you don't have. A duplicated master project gives you 90% of the benefit for your own channel."},
        {"type": "table", "headers": ["What to lock in your master project", "Why it saves time"], "rows": [["Caption font, size, colour and position", "The decision you'd otherwise make 50 times a month"], ["A 1–2 second intro or sign-off", "Makes videos recognisably yours"], ["Music volume level", "No more guessing if the music drowns your voice"], ["Export settings (9:16, 1080p)", "No accidental 720p uploads"], ["Placeholder text for price and contact", "You'll never forget \"KES ___ / WhatsApp ___\" again"]]},
        {"type": "myth", "myth": "Saving your project in CapCut's cloud means only you can ever use it.", "truth": "CapCut's June 2025 terms grant it a broad, worldwide licence to content you upload to its services, as reported by TechRadar. CapCut says the licence is only as far as needed to run the service. Practical takeaway: keep confidential client footage and unreleased product photos as local drafts, and back up your master files to your own phone or drive."},
        {"type": "template", "label": "Master project naming system", "text": "MASTER_[CONTENT TYPE]_[PLATFORM]\nExample: MASTER_pricevideo_tiktok\n\nNew videos: [YYMMDD]_[TOPIC]_v1\nExample: 261104_knotless_price_v1\n\nAfter posting, add a note in the project name if it beat your average: 261104_knotless_price_WIN"},
        {"type": "action", "label": "Do this today", "items": ["Pick the best video you've edited and duplicate it as a MASTER project.", "Save your favourite caption style in the text style panel.", "Star your two most-used transitions or effects as favourites.", "Back up your master project's raw clips to your phone gallery or a drive."]},
        {"type": "quiz", "q": "Why can't most creators find the option to post a CapCut template?", "options": ["It's only on iPhone", "Posting templates is restricted to approved template creators", "It costs KES 50 per template", "It was removed in Kenya"], "answer": 1, "explain": "CapCut's help centre says template posting is limited to approved creators, and the option doesn't show until you're approved. Duplicating a master project gives you a reusable format without needing approval."},
        {"type": "takeaways", "items": ["Template posting is for approved creators only.", "Duplicate a MASTER project to reuse your best format.", "Save text styles and favourite effects once, reuse forever.", "Keep sensitive footage local; read CapCut's content licence."]},
        {"type": "locked", "module": "capcut_pro", "text": "A master project saves minutes. The premium course turns your whole edit into a 15-minute routine.", "items": ["A five-stage edit sequence with a time budget for each stage", "Sound design in four layers, plus the cheap mic upgrade that beats a better camera", "Which CapCut AI tools are worth your time and which are novelties, with a keep-or-skip test", "A weekly edit plan that batches three videos across two short sessions"]},
        {"type": "sources", "items": [{"title": "CapCut Help: How do I post a template?", "url": "https://www.capcut.com/help/how-do-i-post-a-template"}, {"title": "TechRadar: CapCut's updated terms and what they mean (June 2025)", "url": "https://www.techradar.com/pro/popular-video-editing-app-capcut-wants-to-use-any-content-you-produce-for-free-forever-heres-what-you-should-know"}, {"title": "BIGVU: CapCut Free vs Pro, the 2026 restructure", "url": "https://bigvu.tv/blog/capcut-free-vs-pro-what-2026s-restructure-gives-you/"}]},
      ]},
    ],
  },
  {
    id: 'canva', icon: '🎨', title: 'Canva Design',
    blurb: "Scroll-stopping graphics on a free account, plus the hidden settings most people never open",
    lessons: [
      { id: "cv1", title: "Picking the Right Template (and Making It Unrecognisable)", minutes: 6, body: [
        {"type": "hook", "text": "Canva says it has more than **250 million monthly users**. That means the template you just fell in love with has probably already been posted by dozens of Kenyan pages this month. The skill isn't finding a template. It's making one unrecognisable in five minutes."},
        {"type": "stat", "value": "250M+", "label": "Canva's monthly active users, per its April 2026 Canva AI 2.0 announcement (Business Wire)"},
        {"type": "p", "text": "Most people scroll the template gallery looking for something pretty. Professionals scroll looking for a **structure**: where the photo sits, where the headline sits, and how much text fits. Colours and fonts you will change anyway; the skeleton is what you are really choosing."},
        {"type": "p", "text": "Start the right way: type the exact placement into Canva's search bar (\"Instagram Post\", \"Your Story\", \"Facebook Post\", \"YouTube Thumbnail\"). The gallery opens at the right pixel size, so nothing gets stretched or cropped later. Need an odd size for a printed flyer or banner? Use **Custom size** and type the dimensions."},
        {"type": "h3", "text": "The four structures that cover 90% of creator posts"},
        {"type": "table", "headers": ["Structure", "Use it for", "Kenyan example"], "rows": [["One big photo + short headline", "New stock, a finished result, a face", "A mitumba seller's 'New bale just opened' post"], ["Numbered list / carousel", "Tips, steps, price lists", "'5 ways to make your weave last' from a Nairobi salon"], ["Before / after split", "Transformations, repairs, makeovers", "A phone-repair shop in Luthuli Avenue showing a cracked vs fixed screen"], ["Quote or bold statement card", "Opinions, testimonials, announcements", "A customer's WhatsApp review, retyped on your brand colours"]]},
        {"type": "myth", "myth": "Choose the template that looks most beautiful.", "truth": "Choose the one whose **layout** fits your content. A gorgeous template built for one big photo will look broken when you squeeze seven price items into it. Filter by structure first, style second."},
        {"type": "h3", "text": "The 5-minute 'de-template' routine"},
        {"type": "ol", "items": ["Swap the fonts for your own two fonts (one bold headline, one plain body).", "Recolour everything with your own 2–3 colours. Delete any colour that isn't yours.", "Replace every stock photo with your own photo: your product, your shop, your face.", "Delete at least one decorative element (a squiggle, a sticker, an extra shape). Templates are over-decorated so they look good in the gallery, not on your feed.", "Move the logo to the same corner you always use."]},
        {"type": "insight", "label": "The free premium most people never apply for", "text": "If you are a primary or secondary school teacher, or you run a registered non-profit, you may not need to pay for premium Canva at all. Canva Education is a free edition for K-12 schools, and Canva for Nonprofits gives eligible organisations premium features free for up to 50 team members, in 190+ countries (Style Factory's October 2026 guide). Schools, political groups and government bodies can't use the non-profit plan, so check the rules before applying."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Open your last 6 posts and label each one by structure: photo, list, before/after or quote.", "Search Canva for your main placement (e.g. \"Instagram Post\") and save one template for each structure you use.", "Run the 5-minute de-template routine on one of them.", "Post it, then compare it side by side with an old post. Does it look like you or like Canva?"]},
        {"type": "quiz", "q": "You sell second-hand shoes and want a post listing 6 pairs with prices. What should you judge a template by first?", "options": ["How beautiful its colours are", "Whether its layout can hold 6 items and prices clearly", "How many people have used it", "Whether it has animations"], "answer": 1, "explain": "Colours and fonts get replaced in the de-template routine anyway. The structure, meaning how many items and how much text it can hold cleanly, is the part you can't easily fix later."},
        {"type": "takeaways", "items": ["Pick templates by structure (photo, list, before/after, quote), not by prettiness.", "Always search the exact placement so the size is right from the start.", "Five minutes of de-templating (fonts, colours, your own photos, less decoration) makes a template yours.", "Teachers and registered non-profits may qualify for free premium Canva."]},
        {"type": "locked", "module": "canva_pro", "text": "Canva Design for Creators — Advanced turns these habits into a system that runs itself.", "items": ["The Brand Kit spec sheet that makes every new design, and every AI draft, start on-brand", "The Magic Design prompt formula that gives you usable first drafts instead of generic ones", "How to batch a full week of posts from one spreadsheet with Bulk Create", "Publishing your media kit as a live Canva website link, and selling templates you've already built"]},
        {"type": "sources", "items": [{"title": "Canva unveils Canva AI 2.0 (Business Wire, April 2026)", "url": "https://www.businesswire.com/news/home/20260416696203/en/Canva-Unveils-Canva-AI-2.0-Reimagining-How-The-World-Designs-and-Works"}, {"title": "Canva Pro vs Free (Style Factory, updated July 2026)", "url": "https://www.stylefactoryproductions.com/blog/canva-pro-vs-free"}, {"title": "Canva for Nonprofits — All You Need to Know (Style Factory)", "url": "https://www.stylefactoryproductions.com/?p=22099"}]},
      ]},
      { id: "cv2", title: "Text, Contrast & Readability: The 4.5 Rule", minutes: 6, body: [
        {"type": "hook", "text": "**White text on a red background fails** the web's own readability standard for normal-size text. So does white on bright orange, and white on yellow fails badly. Most Kenyan flyers you'll see this week make at least one of these mistakes."},
        {"type": "p", "text": "Readability on a phone has a number attached to it. The W3C's accessibility guidelines (WCAG) say normal text needs a **contrast ratio of at least 4.5:1** against its background; large text (about 24px, or about 18.5px bold) needs at least 3:1. These are minimums, not targets."},
        {"type": "stat", "value": "4.5 : 1", "label": "Minimum contrast for normal text under WCAG 2 Level AA; large text needs 3:1 (W3C)"},
        {"type": "h3", "text": "How common colour combinations score on the WCAG formula"},
        {"type": "table", "headers": ["Text on background", "Contrast ratio", "Verdict"], "rows": [["White on yellow (#FFD600)", "1.4 : 1", "Fails everything. Unreadable in sunlight"], ["Light grey on white", "2.3 : 1", "Fails. The 'elegant' look that nobody can read"], ["White on mid green (#4CAF50)", "2.8 : 1", "Fails, even for big headlines"], ["White on bright orange (#FF6F00)", "2.8 : 1", "Fails, even for big headlines"], ["White on red (#E53935)", "4.2 : 1", "OK for big headlines only, not small text"], ["White on dark green (#1B5E20)", "7.9 : 1", "Passes comfortably"], ["Black on yellow (#FFD600)", "14.9 : 1", "Excellent. Why road signs use it"]]},
        {"type": "h3", "text": "Canva's hidden checker"},
        {"type": "p", "text": "Canva has a built-in accessibility check that most people never open: **File → Accessibility → Check design accessibility**. It flags text that is too small, colour combinations with poor contrast, and images missing alt text. Run it before you export anything important."},
        {"type": "h3", "text": "Three fixes for text on a busy photo"},
        {"type": "ul", "items": ["**Text background:** select the text, open Effects, choose Background. Canva drops a solid block behind the words, and you can lower its transparency to keep the photo visible.", "**Dark overlay:** put a black rectangle over the whole photo and set transparency to around 30–50%. White text on top suddenly becomes readable.", "**Move the text** to the plainest part of the photo (sky, wall, table top) instead of over faces or patterned fabric."]},
        {"type": "insight", "label": "What most creators miss", "text": "Your design will be seen on a cracked phone, at low brightness to save battery, in Nairobi sunshine, often half covered by app buttons. On TikTok, Reels and WhatsApp Status, the bottom and right edges are covered by captions, usernames and buttons. Keep key text in the centre-top area, and judge your design on your phone at half brightness, not on a laptop."},
        {"type": "template", "label": "One-message post structure", "text": "HEADLINE (6 words max): [e.g. Braids from KES 2,500 this week]\nDETAIL (one line): [e.g. Kilimani, Tue–Sat, book by WhatsApp]\nACTION (one instruction): [e.g. DM 'BRAIDS' to book]\n\nIf you need more than this, make it a carousel, not a crowded single post."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Open your most recent graphic in Canva and run File → Accessibility → Check design accessibility.", "Fix any contrast warning using a text background or dark overlay.", "Cut your headline to six words or fewer.", "Send the design to your own WhatsApp, open it at half brightness, and read it at arm's length."]},
        {"type": "quiz", "q": "Which of these passes the WCAG 4.5:1 contrast minimum for normal-size text?", "options": ["White on bright orange", "White on red", "Black on yellow", "White on mid green"], "answer": 2, "explain": "Black on yellow scores about 14.9:1. White on red is about 4.2:1, so it falls just short for small text, and white on orange or mid green is only about 2.8:1. Bright, 'loud' colours often have poor contrast with white."},
        {"type": "takeaways", "items": ["Readability has a number: aim for at least 4.5:1 contrast for normal text.", "Bright backgrounds (yellow, orange, mid green) with white text usually fail.", "Canva's File → Accessibility check flags small text and poor contrast for you.", "Keep key text away from the bottom and right edges on vertical formats."]},
        {"type": "locked", "module": "canva_pro", "text": "Canva Design for Creators — Advanced turns these habits into a system that runs itself.", "items": ["A Brand Kit table that stops your accent colour from spreading until nothing stands out", "The order to use Magic Eraser, Magic Expand, Magic Design and Magic Write so AI cleans up real photos instead of faking them", "A seven-step branded Reel workflow in Canva Video, including where captions get Swahili words and prices wrong", "A 15–30 second branded video outline you can reuse every week"]},
        {"type": "sources", "items": [{"title": "Understanding WCAG SC 1.4.3 Contrast (Minimum) — W3C", "url": "https://w3c.github.io/wcag/understanding/contrast-minimum.html"}, {"title": "Canva accessibility checks (Queen Mary University of London)", "url": "https://www.qmul.ac.uk/htdocs/external-relations/accessibility-hub/design/canva-accessibility-checks"}]},
      ]},
      { id: "cv3", title: "A Consistent Look on a Free Account", minutes: 6, body: [
        {"type": "hook", "text": "Almost everyone believes Brand Kit is a paid-only feature. It isn't. A free Canva account gets **one Brand Kit, limited to three colours**. Three colours is exactly what a disciplined brand needs anyway."},
        {"type": "stat", "value": "1 kit, 3 colours", "label": "What Canva Free includes for Brand Kit; Pro allows 5 kits with no colour limit (Style Factory, July 2026). Check your own account, as plans change."},
        {"type": "p", "text": "Consistency is what makes someone recognise your post before they read your name. On a free account you can get most of the way there with the free Brand Kit plus three habits."},
        {"type": "h3", "text": "Your three colours, and the job each one does"},
        {"type": "table", "headers": ["Colour role", "Job", "Example: a Kisumu home baker"], "rows": [["Main colour", "Backgrounds and headers; the colour people link to you", "Warm cream"], ["Text / dark colour", "All body text; must contrast strongly with the main colour", "Chocolate brown"], ["Accent colour", "Prices and calls to action ONLY", "Strawberry pink"]]},
        {"type": "p", "text": "Copy each colour's exact hex code (tap the swatch to see it, e.g. #F5F0E6). \"A similar blue\" is how grids end up looking like five different businesses."},
        {"type": "h3", "text": "Three free habits that do the rest"},
        {"type": "ul", "items": ["**Uploads tab:** upload your logo once, in a light version and a dark version. It stays there for every future design.", "**Make a copy, don't start fresh:** open last week's best post, then three-dot menu → Make a copy. Fonts, colours and logo position carry over automatically.", "**Two fonts, forever:** one bold headline font, one plain body font. Write their names in your phone notes."]},
        {"type": "myth", "myth": "Consistent means every post looks the same.", "truth": "Consistent means the **system** stays the same (colours, fonts, logo corner) while the content changes. Think of a matatu sacco: every vehicle has different art, but the same colours and lettering tell you which route it runs."},
        {"type": "insight", "label": "The Kenyan pricing trick", "text": "In Kenya, Canva Pro isn't only monthly. Tech-ish reported in February 2026 that Kenyan users were seeing a **day pass (about KES 130)** and a weekly plan alongside monthly (about KES 850) and yearly (about KES 6,800), payable by M-Pesa. If you only need Pro tools like background removal or Magic Resize for one big design session a month, a day pass can cost far less than a monthly plan. Prices change, so check the plan picker in your own account."},
        {"type": "template", "label": "Free-account brand spec (save in your notes)", "text": "Main colour: #______  (backgrounds)\nText colour: #______  (all body text)\nAccent: #______  (prices + CTA only)\nHeadline font: ______  |  Body font: ______\nLogo: light + dark version, always [bottom-right], small\nMaster post to copy: [name of your best design]"},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Open Brand → Brand Kit in Canva and add your three colours and two fonts.", "Upload light and dark versions of your logo.", "Fill in the brand spec template above with exact hex codes.", "Pick your best recent post, rename it 'MASTER', and make your next post as a copy of it."]},
        {"type": "quiz", "q": "What does a free Canva account get when it comes to Brand Kit?", "options": ["Nothing. Brand Kit is Pro-only", "One Brand Kit with a three-colour limit", "Unlimited Brand Kits", "Brand Kit only on desktop"], "answer": 1, "explain": "Free accounts get one Brand Kit limited to three colours, while Pro allows five kits with no colour limit. Three well-chosen colours (main, text, accent) is all a consistent brand needs."},
        {"type": "takeaways", "items": ["Free Canva includes one Brand Kit with three colours. Use it.", "Give each colour a job: main, text, accent (prices and CTAs only).", "Make a copy of a master post instead of starting from a blank page.", "In Kenya, a Pro day pass can be cheaper than a month for occasional heavy sessions."]},
        {"type": "locked", "module": "canva_pro", "text": "Canva Design for Creators — Advanced turns these habits into a system that runs itself.", "items": ["The full Brand Kit setup, including the two-logo rule and a fixed logo position, and how Canva's AI tools draw on it", "Which Magic Studio tools are worth learning and which to skip", "A ready-made Bulk Create sheet (with KES prices) that turns seven rows into seven finished posts", "Building a weekly video series that takes minutes, not evenings, to update"]},
        {"type": "sources", "items": [{"title": "Canva Pro vs Free (Style Factory, updated July 2026)", "url": "https://www.stylefactoryproductions.com/blog/canva-pro-vs-free"}, {"title": "Canva Pro daily & weekly plans in Kenya (Tech-ish, Feb 2026)", "url": "https://tech-ish.com/2026/02/24/canva-pro-daily-weekly-subscription-plans-in-kenya"}]},
      ]},
    ],
  },
  {
    id: 'branding', icon: '👤', title: 'Personal Branding',
    blurb: "Become the person people think of first, on purpose",
    lessons: [
      { id: "pb1", title: "Why \"Known For Something\" Beats \"Known For Everything\"", minutes: 6, body: [
        {"type": "hook", "text": "Since December 2025, Instagram shows users an **AI-written summary of the topics it thinks they like** (\"Lately you've been into…\"), and lets them add or remove topics. If nobody can sum up your account in a topic, the recommendation system has a harder time placing you too."},
        {"type": "p", "text": "Instagram's \"Your Algorithm\" tool, opened from the icon at the top right of Reels, lists the interests Instagram has inferred and lets people ask for more or less of each one (TechCrunch, December 2025). It launched in the US first, with a wider English rollout planned. The lesson for creators is plain: **platforms sort people and content by topic.** A clear topic is easier to sort."},
        {"type": "myth", "myth": "Niching down means fewer followers.", "truth": "Niching down means fewer **wrong** followers. A broad account competes with every creator in Kenya. A focused one is the obvious choice for one group of people, who are also more likely to save, share and buy. You can widen later. It's much harder to narrow a confused audience."},
        {"type": "h3", "text": "The one-sentence test"},
        {"type": "p", "text": "Can a stranger describe your account in one sentence after seeing three posts? If it takes a paragraph (\"she does comedy, but also cooking, and sometimes church, and some business tips…\"), you have a hobby feed, not a brand."},
        {"type": "table", "headers": ["Too broad", "Sharper", "Who instantly knows it's for them"], "rows": [["Comedy", "Matatu-culture skits for Nairobi commuters", "Anyone who rides a 46 or a Rongai mat"], ["Business tips", "Sourcing and pricing for Gikomba mitumba resellers", "New resellers on WhatsApp Status"], ["Beauty", "Natural hair care on a student budget", "Campus students in Kenya"], ["Food", "Kisumu fish recipes for under KES 500", "Families feeding 4 on a budget"]]},
        {"type": "insight", "label": "The niche is a person", "text": "Your niche is a **person**, not a topic. \"Fashion\" is a topic. \"A 24-year-old in her first office job who needs outfits under KES 3,000\" is a person. When you know the person, ideas come easily: what does she worry about this week? Write that post."},
        {"type": "insight", "label": "Your niche is now a search term", "text": "Since 10 July 2025, public posts from Instagram business and creator accounts (for users over 18) can appear in Google search results unless you switch it off (PPC Land). The words in your bio and captions are now search words. \"Nairobi braids\" in your caption can be found on Google. \"✨vibes✨\" can't."},
        {"type": "template", "label": "Your one-line niche", "text": "I post [TOPIC] for [SPECIFIC PERSON] so they can [RESULT].\n\nExample: I post honest phone reviews for Kenyan students so they can buy the best phone under KES 20,000."},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Write your one-line niche using the template.", "Send three of your recent posts to a friend and ask: \"In one sentence, what is this account about?\" Compare their answer to yours.", "Count how many of your last 12 posts fit your sentence.", "Put the key words from your sentence (topic + place) into your bio."]},
        {"type": "quiz", "q": "What does Instagram's \"Your Algorithm\" tool (launched December 2025) let users do?", "options": ["See who viewed their profile", "See an AI summary of their inferred interests and add or remove topics", "Buy promoted reach for Reels", "Download their follower list"], "answer": 1, "explain": "It shows users the topics Instagram thinks they like and lets them adjust them. Recommendations are organised around topics, which is why a clearly describable account is easier to recommend to the right people."},
        {"type": "takeaways", "items": ["Platforms sort content and people by topic. Make yours obvious.", "Pass the one-sentence test: a stranger should sum you up after three posts.", "Define your niche as a specific person, not just a subject.", "Bio and caption words now work as search terms, including on Google."]},
        {"type": "locked", "module": "branding_pro", "text": "Personal Branding Blueprint takes you from 'known for something' to 'paid for something'.", "items": ["The three-circle overlap that finds a niche you can still post about a year from now", "A positioning sentence template, plus a short bio version", "How to build 3–4 content pillars and the rough 80/20 rule for off-topic posts", "A 15-post audit that shows which pillar your audience already values most"]},
        {"type": "sources", "items": [{"title": "Instagram's new 'Your Algorithm' tool (TechCrunch, Dec 2025)", "url": "https://techcrunch.com/2025/12/10/instagrams-new-your-algorithm-tool-gives-you-more-control-over-the-reels-you-see"}, {"title": "Instagram content becomes searchable on Google from July 10 (PPC Land)", "url": "https://ppc.land/instagram-content-becomes-searchable-on-google-starting-july-10/"}]},
      ]},
      { id: "pb2", title: "Consistency: The Unglamorous Growth Lever", minutes: 6, body: [
        {"type": "hook", "text": "Psychologists have known since 1968 that people tend to like things more **just because they've seen them before**. It's called the mere-exposure effect. Every time you change your profile photo, colours or style, you start that familiarity over from zero."},
        {"type": "p", "text": "In Robert Zajonc's classic experiments, people rated unfamiliar words, symbols and faces more positively the more often they had seen them, with the biggest gains in the first few exposures (Simply Psychology's summary). Marketing research found the same with brand names and packaging, even when people couldn't remember seeing them. There is a limit: a 2017 meta-analysis found liking rises, peaks, then falls with too much repetition. **Be consistent in look, but vary the content.**"},
        {"type": "stat", "value": "3–4x", "label": "Organisations that presented their brand consistently were 3–4x more likely to report excellent brand visibility (Demand Metric & Lucidpress survey, 2016; self-reported)"},
        {"type": "myth", "myth": "Consistency means posting every single day.", "truth": "Consistency means being **predictable and recognisable**. Three posts a week for six months beats daily posting for three weeks and then disappearing. Choose a rhythm you could keep during exams, a busy season or a slow data month."},
        {"type": "h3", "text": "The three layers of consistency"},
        {"type": "table", "headers": ["Layer", "What stays the same", "Quick win"], "rows": [["Look", "Profile photo, 2–3 colours, 2 fonts, photo style", "Same profile photo on TikTok, Instagram, Facebook and WhatsApp Business"], ["Voice", "How you talk: words, humour, language mix (English, Swahili, Sheng)", "Write three words that describe your voice"], ["Rhythm", "Which days you post and which series run when", "Pick fixed days, e.g. Tue / Thu / Sat"]]},
        {"type": "insight", "label": "The signature move", "text": "The fastest recognition builder isn't a logo. It's a **signature**: a repeated opening line, a named weekly series, or the same background. A matatu-culture creator who opens every skit at the same stage with the same greeting becomes recognisable within seconds, before anyone reads the username."},
        {"type": "template", "label": "Weekly rhythm planner", "text": "MON: rest / plan\nTUE: [Series name, e.g. 'Price Check Tuesday']: [format]\nTHU: [Pillar 2 post]\nSAT: [Behind-the-scenes or customer story]\nSignature opener: \"[your line]\"\nSignature sign-off: \"[your line]\""},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Put the same profile photo on every platform you use, today.", "Write three words for your voice, and one word you will never be (e.g. 'rude').", "Choose 2–3 fixed posting days you can keep even in a busy month.", "Invent one signature: an opener, a sign-off, or a named weekly series."]},
        {"type": "quiz", "q": "According to research on the mere-exposure effect, what happens to liking with repeated exposure?", "options": ["It rises forever with every exposure", "It rises (most in the first few exposures), then can fall with overexposure", "It has no effect on liking", "It only works for famous brands"], "answer": 1, "explain": "Liking tends to grow with familiarity, especially early on, but too much identical repetition causes fatigue. That's why the rule is a consistent look with varied content."},
        {"type": "takeaways", "items": ["Familiarity builds liking, so every rebrand resets it.", "Consistency means three layers: look, voice and rhythm.", "A signature (opener, series, background) builds recognition fastest.", "Pick a rhythm you can sustain, not one that burns you out."]},
        {"type": "locked", "module": "branding_pro", "text": "Personal Branding Blueprint takes you from 'known for something' to 'paid for something'.", "items": ["A one-page brand kit covering both your look and your voice, including a 'voice is never' list", "The five elements to lock down once, and the common mistake for each", "How a small barbershop became recognisable before people saw the name", "A 10-post rollout plan that rebrands you without starting over"]},
        {"type": "sources", "items": [{"title": "Mere Exposure Effect in Psychology (Simply Psychology)", "url": "https://www.simplypsychology.org/mere-exposure-effect.html"}, {"title": "Demand Metric & Lucidpress brand consistency research (PRWeb)", "url": "https://www.prweb.com/releases/2016/11/prweb13829874.htm"}]},
      ]},
      { id: "pb3", title: "Making Your Profile Do the Selling For You", minutes: 6, body: [
        {"type": "hook", "text": "In a well-known 2006 study, people judged a web page's visual appeal in about **50 milliseconds**, roughly one frame of TV, and those snap judgements closely matched their later, slower ratings. Your profile gets the same split-second verdict from every new visitor."},
        {"type": "stat", "value": "50 ms", "label": "Time for people to form a first impression of a web page's visual appeal (Lindgaard et al., Behaviour & Information Technology, 2006, via Nature News)"},
        {"type": "p", "text": "A viral post sends visitors to your profile. The profile decides whether they follow, message or leave. Most creators spend hours on posts and two minutes on the profile, even though the profile is the page that **converts** attention into followers and customers."},
        {"type": "p", "text": "It now matters outside the app too: since July 2025, public posts from Instagram business and creator accounts can appear in Google search, so your name, bio and captions are part of how strangers find you."},
        {"type": "h3", "text": "The 5-second profile audit"},
        {"type": "table", "headers": ["Question a visitor asks", "Weak profile", "Strong profile (Eastleigh fabric shop)"], "rows": [["Who is this?", "Blurry group photo", "Clear logo or face, same photo on every platform"], ["What do they do?", "\"Living my best life ✨\"", "\"Wholesale & retail fabrics | Eastleigh, Nairobi\""], ["Why trust them?", "Random latest posts", "3 pinned posts: shop tour, customer review, price list"], ["How do I buy or contact?", "\"DM for more\"", "WhatsApp link + \"Order by 2pm for same-day delivery\""]]},
        {"type": "template", "label": "3-line bio formula", "text": "Line 1: What you do + who for  → [Natural hair care for campus students]\nLine 2: Proof or place          → [Kisumu | 200+ clients styled]\nLine 3: One action              → [Book on WhatsApp ↓]"},
        {"type": "insight", "label": "Pin by job, not by likes", "text": "Don't pin your three most-liked posts. Pin three posts that each do a **job**: one that says who you are, one that proves you're good (a result or review), and one that tells people how to buy or work with you. Your most viral post might be a random trend that tells a new visitor nothing about you."},
        {"type": "myth", "myth": "More links and more emojis give visitors more options.", "truth": "More options means fewer decisions. One clear action (WhatsApp, booking link or shop link) converts better than five links competing for attention. Keep emojis as signposts, not decoration."},
        {"type": "service", "label": "Make the first impression match the work", "text": "A new visitor also notices your numbers in that first glance. If your profile is complete and your content is something you're proud of, a starter followers package can add social proof. Never present bought followers to brands as organic.", "platform": "instagram", "subcat": "followers", "cta": "See follower packages"},
        {"type": "action", "label": "Do this today (under 15 minutes)", "items": ["Open your profile as a stranger would (log out or use a friend's phone) and run the 5-second audit.", "Rewrite your bio using the 3-line formula.", "Pin three posts: who you are, proof, how to buy.", "Add one clear contact link and remove any extras."]},
        {"type": "quiz", "q": "Which three posts should you pin to the top of your profile?", "options": ["Your three most-liked posts", "Your three newest posts", "One 'who I am', one proof post and one 'how to buy / work with me'", "Three trending-sound videos"], "answer": 2, "explain": "Pinned posts are your shop window. Each should answer a visitor's question (who, why trust, how to buy). Your most-liked post may be a trend that says nothing about what you offer."},
        {"type": "takeaways", "items": ["Visitors judge your profile in a split second, so make it obvious.", "Your bio answers: what you do, who for, proof, and one action.", "Pin posts by job (who, proof, how to buy), not by likes.", "One clear contact link beats five."]},
        {"type": "locked", "module": "branding_pro", "text": "Personal Branding Blueprint takes you from 'known for something' to 'paid for something'.", "items": ["The three-part conversion setup (clarity, proof, contact) and exactly where each part lives", "A one-page media kit outline built from your real insights numbers", "A short pitch DM that gets small local businesses replying", "How to talk to brands honestly about any boosted numbers without losing the deal"]},
        {"type": "sources", "items": [{"title": "Web users judge sites in the blink of an eye (Nature News, 2006)", "url": "https://www.nature.com/news/2006/060109/full/news060109-13.html"}, {"title": "Instagram content becomes searchable on Google from July 10 (PPC Land)", "url": "https://ppc.land/instagram-content-becomes-searchable-on-google-starting-july-10/"}]},
      ]},
    ],
  },
  {
    // PREMIUM — KES 50 one-time unlock via M-Pesa. Titles/minutes are shown
    // as a teaser; lesson `body` is intentionally omitted here. Full text is
    // fetched from GET /academy/modules/money/content only after a
    // SUCCESS purchase is confirmed server-side (see app/routers/academy.py
    // and app/services/academy_premium_content.py). Do NOT paste lesson body
    // text back into this file — that would defeat the payment gate, since
    // this bundle is public and readable by anyone via view-source.
    id: 'money', icon: '💰', title: 'Turn Growth Into Income',
    blurb: 'From audience to actual revenue',
    premium: true,
    priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'm1', title: 'Brand Deals: Pricing Yourself Like a Business, Not a Hobby', minutes: 7, body: null },
      { id: 'm2', title: 'Referral Income: The Math Behind Your Second Income Stream', minutes: 5, body: null },
      { id: 'm3', title: 'Selling Your Own Products or Services: The Full Funnel', minutes: 6, body: null },
    ],
  },
  {
    // PREMIUM — KES 150 one-time unlock via M-Pesa. Same gating pattern as
    // the money module above: teaser only here, full lesson body text lives
    // in app/services/academy_premium_content.py and is only ever served
    // after app/routers/academy.py confirms a SUCCESS purchase (or a points
    // redemption) for this (user, module) pair. Do NOT paste lesson body
    // text back into this file.
    id: 'business_pro', icon: '📊', title: 'The Business Scale-Up Guide',
    blurb: 'Turn a growing page into a growing business',
    premium: true,
    priceKes: ACADEMY_BUSINESS_PRO_PRICE_KES,
    lessons: [
      { id: 'bp1', title: 'Budgeting for Growth: The CAC/LTV Framework', minutes: 6, body: null },
      { id: 'bp2', title: 'Patterns Behind Kenyan SMEs That Scaled With Paid Growth', minutes: 6, body: null },
      { id: 'bp3', title: 'Combining Paid Ads + Growth Services for Maximum ROI', minutes: 6, body: null },
      { id: 'bp4', title: 'Building a Repeatable Growth System You Can Run Monthly', minutes: 5, body: null },
      { id: 'bp5', title: 'The Digital Marketing Stack Every Kenyan Business Needs', minutes: 6, body: null },
      { id: 'bp6', title: 'Agencies vs DIY: What You Should Actually Pay For', minutes: 6, body: null },
    ],
  },
  // ── New low-ticket premium topics — each its OWN separate KSh50 unlock ──
  // (not bundled together). Teaser only; body text lives in
  // academy_premium_content.py, same gating pattern as money/business_pro.
  {
    id: 'tiktok_pro', icon: '🎵', title: 'Advanced TikTok Growth & Algorithm Guide',
    blurb: 'Beyond the basics — engineered virality',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'ttp1', title: 'Reading Your Analytics Like a Growth Team', minutes: 8, body: null },
      { id: 'ttp2', title: 'Engineering a Video for Completion and Re-Watches', minutes: 6, body: null },
      { id: 'ttp3', title: 'Batching a Week of Content in One Sitting', minutes: 6, body: null },
      { id: 'ttp4', title: 'The 2026 Algorithm Reset: Follower-First Testing & Search', minutes: 7, body: null },
      { id: 'ttp5', title: 'Longer Videos, TikTok Shop & Where Distribution Is Heading', minutes: 6, body: null },
    ],
  },
  {
    id: 'fb_monetize', icon: '👥', title: 'Facebook Monetization Blueprint',
    blurb: 'Turn a Facebook page into real income',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'fbm1', title: 'Which Monetization Path Fits Your Page', minutes: 7, body: null },
      { id: 'fbm2', title: 'Hitting Eligibility Thresholds Faster', minutes: 7, body: null },
      { id: 'fbm3', title: 'What Kenyan Creators Actually Earn', minutes: 7, body: null },
      { id: 'fbm4', title: 'Staying Eligible: The Compliance Traps That Cost Creators', minutes: 6, body: null },
      { id: 'fbm5', title: 'Diversifying Beyond Ad Revenue', minutes: 7, body: null },
    ],
  },
  {
    id: 'yt_seo', icon: '🔍', title: 'YouTube SEO Mastery',
    blurb: 'Get found, not just watched',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'yts1', title: 'Titles & Thumbnails That Win the Click', minutes: 8, body: null },
      { id: 'yts2', title: 'Tags, Descriptions & Semantic Search', minutes: 7, body: null },
      { id: 'yts3', title: 'Satisfaction Over Watch Time: The 2026 Shift', minutes: 7, body: null },
      { id: 'yts4', title: 'Shorts SEO: A Separate Ranking Track', minutes: 6, body: null },
      { id: 'yts5', title: 'Monetization Requirements & the AI Disclosure Rule', minutes: 6, body: null },
    ],
  },
  {
    id: 'shorts_pro', icon: '🎬', title: 'Shorts, Reels & TikTok: One Guide',
    blurb: 'One short-form video, three platforms, three algorithms',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'shp1', title: 'One Video, Three Platforms — What Actually Changes', minutes: 7, body: null },
      { id: 'shp2', title: 'Repurposing Without It Looking Repurposed', minutes: 7, body: null },
      { id: 'shp3', title: 'A Weekly System Across All Three', minutes: 6, body: null },
      { id: 'shp4', title: 'Length: Why the Same Clip Needs Different Cuts', minutes: 6, body: null },
      { id: 'shp5', title: 'Choosing Where to Double Down', minutes: 6, body: null },
    ],
  },
  {
    id: 'ig_reels_pro', icon: '📸', title: 'Instagram Reels Growth Engine',
    blurb: 'The specific mechanics behind Reels reach',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'igrp1', title: 'The First 3 Seconds, Frame by Frame', minutes: 7, body: null },
      { id: 'igrp2', title: 'Sends Per Reach: The Signal That Matters Most in 2026', minutes: 7, body: null },
      { id: 'igrp3', title: '"Your Algorithm": Niche Consistency Is No Longer Optional', minutes: 7, body: null },
      { id: 'igrp4', title: 'Account-Level Authority: Why Consistency Compounds', minutes: 7, body: null },
      { id: 'igrp5', title: 'Cadence, Cover Images & Profile Conversion', minutes: 6, body: null },
    ],
  },
  {
    id: 'ai_content_pro', icon: '🤖', title: 'AI Content Creation — Advanced Workflows',
    blurb: 'From single prompts to a repeatable content pipeline',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'aip1', title: 'Building a Month of Ideas in One Session', minutes: 7, body: null },
      { id: 'aip2', title: 'Scripting Hooks & Captions That Sound Like You', minutes: 7, body: null },
      { id: 'aip3', title: 'The 2026 AI Video Toolkit: What Each Tool Is Actually For', minutes: 6, body: null },
      { id: 'aip4', title: 'Disclosure & Authenticity: Staying on the Right Side of Platform Rules', minutes: 6, body: null },
      { id: 'aip5', title: 'A Repeatable Weekly AI Workflow', minutes: 7, body: null },
    ],
  },
  {
    id: 'capcut_pro', icon: '✂️', title: 'CapCut Editing Mastery',
    blurb: 'Editing techniques that keep people watching',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'ccp1', title: 'Pacing: Cutting for Retention, Not Just Movement', minutes: 7, body: null },
      { id: 'ccp2', title: 'Captions, Keyframes & Presets That Save Hours Every Week', minutes: 7, body: null },
      { id: 'ccp3', title: 'Sound Design: The Most Skipped Step That Signals "Professional"', minutes: 8, body: null },
      { id: 'ccp4', title: "CapCut's AI Tools: What's Actually Worth Using", minutes: 7, body: null },
      { id: 'ccp5', title: 'A 15-Minute Edit Workflow, Start to Finish', minutes: 7, body: null },
    ],
  },
  {
    id: 'canva_pro', icon: '🎨', title: 'Canva Design for Creators — Advanced',
    blurb: 'Design that looks consistent, not thrown together',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'cvp1', title: 'Brand Kit: The One Setup Step That Multiplies Every Design After It', minutes: 7, body: null },
      { id: 'cvp2', title: 'Magic Studio in 2026: The Five Tools Worth Learning (and 35 to Skip)', minutes: 7, body: null },
      { id: 'cvp3', title: 'Batch-Designing a Week of Posts With Bulk Create', minutes: 6, body: null },
      { id: 'cvp4', title: 'Canva Video 2.0: Branded Video Without Learning a Separate Editor', minutes: 6, body: null },
      { id: 'cvp5', title: 'Beyond the Feed: Media Kits, Canva Sites & a Second Income From Templates', minutes: 7, body: null },
    ],
  },
  {
    id: 'affiliate_pro', icon: '💵', title: 'Affiliate Marketing Guide',
    blurb: 'Beyond the referral link — a real income channel',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'afp1', title: 'The Kenyan Affiliate Landscape: Real Programs, Real Numbers', minutes: 8, body: null },
      { id: 'afp2', title: 'The Math: EPC, CPE and Knowing What a Program Is Actually Worth You', minutes: 8, body: null },
      { id: 'afp3', title: 'Placement & Disclosure: Where Links Convert and Staying Compliant', minutes: 7, body: null },
      { id: 'afp4', title: 'Scaling Beyond One Program: Building an Affiliate Income Stack', minutes: 7, body: null },
      { id: 'afp5', title: 'Disclosure & Trust: The Rules That Protect Your Income Long-Term', minutes: 8, body: null },
    ],
  },
  {
    id: 'branding_pro', icon: '👤', title: 'Personal Branding Blueprint',
    blurb: 'Being known for something specific, on purpose',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'pbp1', title: 'Defining the One Thing You\'re Known For', minutes: 7, body: null },
      { id: 'pbp2', title: 'Visual & Voice Consistency: The Trust Multiplier', minutes: 7, body: null },
      { id: 'pbp3', title: 'Turning a Personal Brand Into Opportunities', minutes: 7, body: null },
      { id: 'pbp4', title: 'Protecting the Brand: Handling Mistakes, Criticism & Backlash', minutes: 6, body: null },
      { id: 'pbp5', title: 'Owning Your Audience: Building Beyond the Algorithm', minutes: 7, body: null },
    ],
  },
  {
    // PREMIUM — KES 200 one-time unlock via M-Pesa. Standalone deep-dive
    // (no free counterpart module), priced above the standard KSh50 "_pro"
    // tier — same gating pattern as money/business_pro above: teaser only
    // here, full lesson body text lives in academy_premium_content.py and
    // is only ever served after academy.py confirms a SUCCESS purchase (or
    // a points redemption) for this (user, module) pair. Do NOT paste
    // lesson body text back into this file.
    id: 'brand_pricing_pro', icon: '💼', title: 'Charging Brands: The Kenya Pricing Guide',
    blurb: 'Know your worth, quote it with confidence, and get it in writing',
    premium: true, priceKes: ACADEMY_BRAND_PRICING_PRO_PRICE_KES,
    lessons: [
      { id: 'cbp1', title: 'Know Your Worth: The Numbers Brands Actually Pay For', minutes: 7, body: null },
      { id: 'cbp2', title: 'Building Your Rate Card & Media Kit', minutes: 6, body: null },
      { id: 'cbp3', title: 'The Negotiation Guide: Getting Paid What You\'re Worth', minutes: 6, body: null },
      { id: 'cbp4', title: 'The Fine Print: Usage Rights, Exclusivity & Getting Paid on Time', minutes: 6, body: null },
      { id: 'cbp5', title: 'Pricing Mistakes That Cost Kenyan Creators Money — and Taxes Nobody Explains', minutes: 7, body: null },
    ],
  },
];

// ─── Storage / progress engine ────────────────────────────────────────────
// Server is the source of truth. _acState is just an in-memory cache of the
// last /academy/progress (or lesson-complete) response so render functions
// that fire synchronously off onclick handlers (_acOpenModule,
// openAcademyLesson) don't need to be async themselves.
let _acState = null;

function _acEmptyState() {
  return { xp: 0, completed: {}, moduleBadges: [], streak: { count: 0 }, graduated: false, purchasedModules: [], moduleMeta: {}, pointsBalance: 0 };
}

// Maps the backend's /academy/progress (or lesson-complete) response shape
// onto the flat shape the render functions expect. completed_lessons already
// comes back as "moduleId:lessonId" strings, matching the local key format.
// moduleMeta carries the server's authoritative premium/price/purchased
// flags per module id, keyed by module id — this is what UI lock state and
// purchase prices are read from, not the ACADEMY_PREMIUM_PRICE_KES constant.
function _acServerToLocal(data) {
  const completed = {};
  (data.completed_lessons || []).forEach(key => { completed[key] = true; });
  const moduleMeta = {};
  (data.modules || []).forEach(m => { moduleMeta[m.id] = m; });
  return {
    xp: data.xp || 0,
    completed,
    moduleBadges: data.module_badges || [],
    streak: { count: (data.streak && data.streak.current) || 0 },
    graduated: !!data.graduated,
    purchasedModules: data.purchased_modules || [],
    moduleMeta,
    // Loyalty points balance — same computed-on-read number GET
    // /loyalty/summary returns, included here too so the "Unlock with
    // points" affordance on a module card doesn't need a second fetch.
    pointsBalance: data.loyalty_points_balance || 0,
  };
}

function _acIsPurchased(state, moduleId) {
  const meta = state.moduleMeta && state.moduleMeta[moduleId];
  if (meta) return !!meta.purchased;
  // Fallback for a state built before moduleMeta existed (shouldn't happen
  // once _acFetchState has run once, but keeps _acEmptyState safe to render).
  return !ACADEMY_MODULES.find(m => m.id === moduleId)?.premium
      || (state.purchasedModules || []).includes(moduleId);
}

// Fetches current progress from the server (also touches the learning
// streak server-side, same as opening the page always did). Caches into
// _acState so subsequent renders can read synchronously, and now also
// goes through Store (20s TTL) so repeated navTo('academy') visits within
// that window don't each re-hit the DB. Mutations below (lesson complete,
// purchase, redeem points) pass force=true to guarantee they see their own
// just-written change rather than a stale cached copy.
async function _acFetchState(force = false) {
  const data = await Store.ensure('academyProgress', () => api('/academy/progress'), { ttl: 20000, force });
  _acSetState(data);
  return _acState;
}

// ─── Instant render: last-known progress, saved per user ───────────────────
// The Academy used to blank the screen ("Loading your progress…") until
// /academy/progress answered — slow on a cold backend. Now every fresh
// server response is also saved to localStorage under the user's id, so the
// page can draw immediately from the last-known copy and refresh quietly.
// Keyed by user id so a second account on the same device never sees
// someone else's progress; doLogout() also clears it.
let _acStateUid = null;
let _acRawJson = null;          // raw server JSON of what's on screen, for change detection
let _acHomeToken = 0;           // bumped whenever the Academy view changes

function _acUid() {
  return (typeof currentUser !== 'undefined' && currentUser && (currentUser.id || currentUser._id)) || null;
}

function _acSetState(data) {
  _acState = _acServerToLocal(data);
  _acStateUid = _acUid();
  try {
    _acRawJson = JSON.stringify(data);
    if (_acStateUid) localStorage.setItem('ev_ac_progress_' + _acStateUid, _acRawJson);
  } catch (_) { /* storage full / blocked — the in-memory copy still works */ }
}

// Last-known progress for the signed-in user, or null if we have none.
function _acCachedState() {
  const uid = _acUid();
  if (!uid) return null;
  if (_acState && _acStateUid === uid) return _acState;
  try {
    const raw = localStorage.getItem('ev_ac_progress_' + uid);
    if (!raw) return null;
    _acState = _acServerToLocal(JSON.parse(raw));
    _acStateUid = uid;
    _acRawJson = raw;
    return _acState;
  } catch (_) { return null; }
}

function _acClearCachedState() {
  _acState = null; _acStateUid = null; _acRawJson = null;
  try {
    Object.keys(localStorage).filter(k => k.startsWith('ev_ac_progress_')).forEach(k => localStorage.removeItem(k));
  } catch (_) { /* ignore */ }
}

function _acTotalLessons() {
  return ACADEMY_MODULES.reduce((n, m) => n + m.lessons.length, 0);
}

function _acCompletedCount(state) {
  return Object.keys(state.completed).length;
}

function _acModuleProgress(state, mod) {
  const done = mod.lessons.filter(l => state.completed[mod.id + ':' + l.id]).length;
  return { done, total: mod.lessons.length };
}

function _acLevelFor(xp) {
  let lvl = ACADEMY_LEVELS[0];
  for (const l of ACADEMY_LEVELS) if (xp >= l.min) lvl = l;
  return lvl;
}

async function _acUpdateBadges() {
  // Refresh sidebar badge + dashboard banner text from saved progress, safe to call anytime
  // (e.g. on login, before the Academy page has ever been opened). Uses the cached state if
  // we already have one from this session; otherwise fetches once from the server.
  let state = _acCachedState();
  if (!state) {
    try { state = await _acFetchState(); } catch (e) { return; }
  }
  const total = _acTotalLessons();
  const done  = _acCompletedCount(state);
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const navBadge = document.getElementById('academyBadge');
  if (navBadge) {
    if (pct > 0 && pct < 100) { navBadge.style.display = 'inline-block'; navBadge.textContent = pct + '%'; }
    else if (pct >= 100) { navBadge.style.display = 'inline-block'; navBadge.textContent = '🎓'; }
    else { navBadge.style.display = 'none'; }
  }

  const desc = document.getElementById('dashAcademyDesc');
  const btn  = document.getElementById('dashAcademyBtn');
  if (desc) {
    if (done === 0) desc.textContent = 'Learn how to grow on every platform — free lessons & badges';
    else if (pct >= 100) desc.textContent = "You've completed the Academy 🎓 — revisit any lesson anytime";
    else desc.textContent = `${done}/${total} lessons done · ${_acLevelFor(state.xp).icon} ${_acLevelFor(state.xp).name}`;
  }
  if (btn) btn.textContent = done === 0 ? 'Start Learning →' : (pct >= 100 ? 'Review Lessons →' : 'Continue →');
}

// ─── Rendering: home ───────────────────────────────────────────────────────
let _acCurrent = { moduleId: null, lessonId: null };

async function initAcademyPage() {
  const sec = document.getElementById('sec-academy');
  if (!sec) return;
  const myToken = ++_acHomeToken;

  // Have last-known progress? Draw it now, then refresh in the background
  // and redraw only if something actually changed and the user is still
  // looking at the Academy home (not inside a module).
  const cached = _acCachedState();
  if (cached) {
    const shownJson = _acRawJson;
    _acRenderHome(sec, cached);
    _acUpdateBadges();
    _acCheckReplies(sec);
    _acFetchState().then(() => {
      if (myToken !== _acHomeToken || _acRawJson === shownJson) return;
      _acRenderHome(sec, _acState);
      _acUpdateBadges();
    }).catch(() => { /* offline / cold server — keep showing the saved copy */ });
    return;
  }

  sec.innerHTML = `<div style="padding:60px 20px;text-align:center;color:var(--muted);font-size:13px;">Loading your progress…</div>`;

  let state;
  try {
    state = await _acFetchState();
  } catch (e) {
    sec.innerHTML = `
    <div style="padding:60px 20px;text-align:center;">
      <div style="font-size:13.5px;color:var(--muted);margin-bottom:14px;">Couldn't load Academy progress. ${esc(e.message || 'Please try again.')}</div>
      <button class="btn-secondary" onclick="initAcademyPage()">Retry</button>
    </div>`;
    return;
  }

  if (myToken !== _acHomeToken) return; // user already moved on (opened a module)
  _acRenderHome(sec, state);
  _acUpdateBadges();
  _acCheckReplies(sec);
}

// One-time CSS for the Academy home screen — scoped with an ac- prefix so it
// never leaks into the rest of the app. Injected lazily (once) into <head>
// rather than re-inserted on every render.
function _acInjectHomeStyles() {
  if (document.getElementById('acHomeStyles')) return;
  const style = document.createElement('style');
  style.id = 'acHomeStyles';
  style.textContent = `
    .ac-hero{position:relative;overflow:hidden;border-radius:20px;padding:26px 24px 22px;margin-bottom:20px;background:linear-gradient(120deg,#1a1330 0%,#1c1a3c 45%,#131b27 100%);border:1px solid rgba(255,215,0,.22);}
    .ac-hero::after{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(155,107,255,.18) 0%,rgba(155,107,255,0) 70%);pointer-events:none;}
    .ac-hero-corner{position:absolute;width:20px;height:20px;border:2px solid rgba(255,215,0,.5);pointer-events:none;}
    .ac-hero-corner.tl{top:12px;left:12px;border-right:none;border-bottom:none;}
    .ac-hero-corner.tr{top:12px;right:12px;border-left:none;border-bottom:none;}
    .ac-hero-corner.bl{bottom:12px;left:12px;border-right:none;border-top:none;}
    .ac-hero-corner.br{bottom:12px;right:12px;border-left:none;border-top:none;}
    .ac-hero-main{position:relative;z-index:1;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
    .ac-hero-crest{flex-shrink:0;width:52px;height:52px;border-radius:14px;background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.32);display:flex;align-items:center;justify-content:center;font-size:25px;}
    .ac-hero-copy{flex:1;min-width:200px;}
    .ac-hero-kicker{font-size:10.5px;font-weight:800;letter-spacing:2px;color:#ffd700;margin-bottom:5px;}
    .ac-hero-title{font-size:18px;font-weight:900;color:var(--white);margin-bottom:4px;letter-spacing:-.2px;}
    .ac-hero-sub{font-size:12.5px;color:#a9b8cc;line-height:1.5;}
    .ac-hero-level{flex-shrink:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 16px;text-align:right;}
    .ac-hero-level-top{display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:13px;font-weight:800;color:var(--white);white-space:nowrap;}
    .ac-hero-level-xp{font-size:11px;color:#a9b8cc;margin-top:4px;white-space:nowrap;}
    .ac-hero-level-next{color:var(--muted);}
    .ac-hero-progress{position:relative;z-index:1;margin-top:20px;}
    .ac-hero-progress-track{height:8px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden;}
    .ac-hero-progress-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,#9b6bff,#ffd700);transition:width .4s ease;}
    .ac-hero-progress-label{display:flex;justify-content:space-between;font-size:11px;color:#a9b8cc;margin-top:7px;}

    .ac-grad-banner{position:relative;overflow:hidden;background:linear-gradient(120deg,#241a42 0%,#1a1330 60%,#150f26 100%);border:1px solid rgba(255,215,0,.4);border-radius:16px;padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
    .ac-grad-icon{flex-shrink:0;width:46px;height:46px;border-radius:12px;background:rgba(255,215,0,.16);border:1px solid rgba(255,215,0,.35);display:flex;align-items:center;justify-content:center;font-size:22px;}
    .ac-grad-btn{flex-shrink:0;background:linear-gradient(120deg,#ffe259,#ffd700);color:#000;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:900;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;}

    .ac-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:26px;}
    .ac-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:15px 16px;position:relative;overflow:hidden;}
    .ac-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--ac-c,#9b6bff);}
    .ac-stat-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;margin-bottom:10px;background:var(--ac-cbg);border:1px solid var(--ac-cbd);}
    .ac-stat-val{font-size:13.5px;font-weight:800;color:var(--white);}
    .ac-stat-sub{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.4;}

    /* All 3 stat cards (streak / badges / points) stay in a single row
       on mobile instead of wrapping 2-then-1 — smaller padding/icon/text
       so three fit side by side at phone width. */
    @media(max-width:768px){
      .ac-stats{grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;}
      .ac-stat{padding:10px 8px;border-radius:12px;}
      .ac-stat-icon{width:26px;height:26px;font-size:12px;margin-bottom:7px;}
      .ac-stat-val{font-size:11.5px;}
      .ac-stat-sub{font-size:9.5px;margin-top:2px;line-height:1.3;}
    }

    .ac-group-hd{display:flex;align-items:center;gap:9px;margin:4px 0 12px;}
    .ac-group-hd .t{font-size:12px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--white);}
    .ac-group-hd .n{background:var(--navy);border:1px solid var(--border);border-radius:20px;padding:1px 9px;font-size:10.5px;color:var(--muted);font-weight:700;}
    .ac-group-hd .line{flex:1;height:1px;background:var(--border);}

    .ac-tpl{margin:0 0 14px;border:1px solid rgba(155,107,255,.35);border-radius:12px;overflow:hidden;background:rgba(155,107,255,.06);}
    .ac-tpl-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(155,107,255,.25);font-size:11.5px;font-weight:800;color:#c4a8ff;letter-spacing:.3px;}
    .ac-tpl-copy{flex-shrink:0;background:#9b6bff;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;}
    .ac-tpl-body{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:13px;line-height:1.55;color:var(--white);}
    .ac-svc{margin:18px 0 14px;padding:15px;border-radius:14px;background:linear-gradient(135deg,rgba(61,212,74,.13),rgba(61,212,74,.04));border:1px solid rgba(61,212,74,.45);}
    .ac-svc-kicker{font-size:10.5px;font-weight:800;letter-spacing:1.3px;color:var(--green);margin-bottom:5px;}
    .ac-svc-title{font-size:15px;font-weight:800;color:var(--white);line-height:1.3;margin-bottom:6px;}
    .ac-svc-text{font-size:13.5px;color:#c9d4e3;line-height:1.55;margin-bottom:12px;}
    .ac-svc-btn{width:100%;background:linear-gradient(135deg,#3dd44a,#28a035);color:#fff;border:none;border-radius:11px;padding:13px 16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;}
    .ac-svc-note{font-size:11px;color:var(--muted);margin-top:9px;line-height:1.45;}
    .ac-act{margin:18px 0 6px;padding:12px 14px;border-radius:12px;background:rgba(61,212,74,.07);border:1px solid rgba(61,212,74,.3);}
    .ac-act-hd{font-size:12px;font-weight:800;color:var(--green);letter-spacing:.4px;text-transform:uppercase;margin-bottom:8px;}
    .ac-act-row{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:13.5px;line-height:1.5;color:var(--white);cursor:pointer;}
    .ac-act-row input{margin-top:3px;accent-color:#3dd44a;width:16px;height:16px;flex-shrink:0;}
    .ac-act-row input:checked + span{color:var(--muted);text-decoration:line-through;}
    .ac-next{display:flex;align-items:center;gap:13px;flex-wrap:wrap;max-width:640px;margin:16px 0 4px;padding:15px 16px;border-radius:16px;cursor:pointer;
      background:linear-gradient(120deg,rgba(255,215,0,.10),rgba(155,107,255,.08));border:1px solid rgba(255,215,0,.35);transition:border-color .2s;}
    .ac-next:hover{border-color:rgba(255,215,0,.7);}
    .ac-next-hot{margin:0 0 16px;border-width:1.5px;box-shadow:0 0 0 3px rgba(255,215,0,.08);}
    .ac-next-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.32);flex-shrink:0;}
    .ac-next-body{flex:1;min-width:170px;}
    .ac-next-kicker{font-size:10px;font-weight:800;letter-spacing:1.4px;color:#ffd700;margin-bottom:3px;}
    .ac-next-title{font-size:14px;font-weight:800;color:var(--white);line-height:1.3;}
    .ac-next-sub{font-size:11.5px;color:var(--muted);margin-top:3px;line-height:1.45;}
    .ac-next-btn{flex-shrink:0;background:#ffd700;color:#1a1300;border:none;border-radius:10px;padding:10px 14px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;white-space:nowrap;}
    @media(max-width:520px){ .ac-next-btn{width:100%;} }
    .ac-start{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin:0 0 20px;padding:15px 16px;border-radius:16px;cursor:pointer;
      background:linear-gradient(120deg,rgba(61,212,74,.16),rgba(61,212,74,.04));border:1.5px solid rgba(61,212,74,.5);}
    .ac-start-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(61,212,74,.16);flex-shrink:0;}
    .ac-start-body{flex:1;min-width:180px;}
    .ac-start-kicker{font-size:10.5px;font-weight:800;letter-spacing:1.3px;color:var(--green);margin-bottom:3px;}
    .ac-start-title{font-size:15px;font-weight:800;color:var(--white);}
    .ac-start-sub{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.45;}
    .ac-start-btn{flex-shrink:0;background:linear-gradient(135deg,#3dd44a,#28a035);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;}
    @media(max-width:520px){ .ac-start-btn{width:100%;} }
    .ac-reco{margin:0 0 20px;}
    .ac-reco-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
    .ac-reco-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"i t p" "i w p";column-gap:12px;row-gap:3px;align-items:center;padding:12px 14px;border-radius:13px;background:var(--card);border:1px solid rgba(255,215,0,.28);cursor:pointer;min-width:0;}
    .ac-reco-row:hover{border-color:rgba(255,215,0,.6);}
    .ac-reco-row .i{grid-area:i;font-size:19px;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(255,215,0,.12);flex-shrink:0;}
    .ac-reco-row .t{grid-area:t;align-self:end;font-size:13px;font-weight:700;color:var(--white);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .ac-reco-row .w{grid-area:w;align-self:start;font-size:11px;color:var(--muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}
    .ac-reco-row .p{grid-area:p;font-size:12.5px;font-weight:800;color:#ffd700;white-space:nowrap;}
    @media(max-width:768px){
      .ac-reco-list{gap:8px;}
      .ac-reco-row{grid-template-columns:auto 1fr;grid-template-areas:"i p" "t t" "w w";row-gap:6px;padding:10px;}
      .ac-reco-row .i{width:34px;height:34px;font-size:17px;}
      .ac-reco-row .p{justify-self:end;font-size:11px;}
      .ac-reco-row .t{font-size:12px;}
      .ac-reco-row .w{font-size:10.5px;-webkit-line-clamp:2;}
    }
    .ac-premium-teaser{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;background:linear-gradient(120deg,rgba(255,215,0,.14),rgba(255,193,7,.05) 60%);border:1px solid rgba(255,215,0,.4);border-radius:16px;padding:15px 16px;margin-bottom:20px;cursor:pointer;transition:border-color .2s,transform .15s;}
    .ac-premium-teaser:active{transform:scale(.98);}
    .ac-premium-teaser:hover{border-color:rgba(255,215,0,.65);}
    .ac-premium-teaser-icon{flex-shrink:0;width:42px;height:42px;border-radius:12px;background:rgba(255,215,0,.18);border:1px solid rgba(255,215,0,.4);display:flex;align-items:center;justify-content:center;font-size:20px;}
    .ac-premium-teaser-body{flex:1;min-width:0;}
    .ac-premium-teaser-title{font-size:13.5px;font-weight:900;color:var(--white);line-height:1.3;}
    .ac-premium-teaser-sub{font-size:11.5px;color:#c9b98a;margin-top:3px;line-height:1.4;}
    .ac-premium-teaser-arrow{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:rgba(255,215,0,.16);color:#ffd700;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;animation:ac-teaser-bounce 1.8s ease-in-out infinite;}
    @keyframes ac-teaser-bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(3px);}}
    @media(max-width:768px){
      .ac-premium-teaser{padding:12px 13px;gap:11px;}
      .ac-premium-teaser-icon{width:36px;height:36px;font-size:17px;}
      .ac-premium-teaser-title{font-size:12px;}
      .ac-premium-teaser-sub{font-size:10.5px;}
    }

    .ac-modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:14px;margin-bottom:28px;}
    .ac-modcard{position:relative;min-width:0;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
    .ac-modcard:hover{transform:translateY(-3px);box-shadow:0 14px 28px rgba(0,0,0,.38);border-color:rgba(155,107,255,.55);}
    .ac-modcard.locked{border-color:rgba(255,215,0,.3);}
    .ac-modcard.locked:hover{border-color:rgba(255,215,0,.65);}
    .ac-modcard.done{border-color:rgba(61,212,74,.3);}
    .ac-modcard.done:hover{border-color:rgba(61,212,74,.65);}
    @media(max-width:768px){
      .ac-modgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:22px;}
      .ac-modcard{padding:12px;border-radius:14px;min-width:0;}
      .ac-modcard .ac-mod-top{margin-bottom:8px;gap:6px;}
      .ac-modcard .ac-mod-icon{width:32px;height:32px;font-size:15px;border-radius:10px;}
      .ac-modcard .ac-mod-pill{font-size:9.5px;padding:2px 7px;}
      .ac-modcard .ac-mod-pill .lbl,.ac-modcard .ac-mod-pill .pts{display:none;}
      .ac-modcard .ac-mod-title{font-size:12.5px;line-height:1.3;}
      .ac-modcard .ac-mod-blurb{font-size:10.5px;line-height:1.4;margin-bottom:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .ac-modcard .ac-mod-progress-row{font-size:10px;}
      .ac-modcard .ac-mod-unlock{font-size:10px;}
    }
    .ac-mod-top{display:flex;align-items:center;gap:10px;margin-bottom:11px;min-width:0;}
    .ac-mod-icon{flex-shrink:0;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;background:var(--ac-cbg);border:1px solid var(--ac-cbd);}
    .ac-mod-pill{margin-left:auto;flex-shrink:1;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:800;border-radius:20px;padding:3px 9px;white-space:nowrap;}
    .ac-mod-title{font-size:14px;font-weight:800;color:var(--white);margin-bottom:4px;}
    .ac-mod-blurb{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:13px;}
    .ac-mod-progress-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;}
    .ac-mod-progress-track{height:5px;border-radius:5px;background:var(--navy);overflow:hidden;}
    .ac-mod-progress-fill{height:100%;border-radius:5px;background:var(--ac-c,#9b6bff);}
    .ac-mod-unlock{font-size:11px;color:#ffd700;font-weight:700;}

    .ac-modhead{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
    .ac-modhead-icon{flex-shrink:0;width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:21px;background:var(--ac-cbg,rgba(155,107,255,.14));border:1px solid var(--ac-cbd,rgba(155,107,255,.3));}
    .ac-modhead-title{font-size:16px;font-weight:900;color:var(--white);}
    .ac-modhead-sub{font-size:12px;color:var(--muted);margin-top:2px;}

    .ac-lockcard{position:relative;overflow:hidden;max-width:520px;background:linear-gradient(150deg,#1a1330 0%,#151c2c 60%,var(--card) 100%);border:1px solid rgba(255,215,0,.32);border-radius:18px;padding:30px 26px;text-align:center;}
    .ac-lockcard .cr{position:absolute;width:18px;height:18px;border:2px solid rgba(255,215,0,.5);}
    .ac-lockcard .cr.tl{top:12px;left:12px;border-right:none;border-bottom:none;}
    .ac-lockcard .cr.tr{top:12px;right:12px;border-left:none;border-bottom:none;}
    .ac-lockcard .cr.bl{bottom:12px;left:12px;border-right:none;border-top:none;}
    .ac-lockcard .cr.br{bottom:12px;right:12px;border-left:none;border-top:none;}
    .ac-lockcard-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:16px;background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.32);display:flex;align-items:center;justify-content:center;font-size:26px;}

    .ac-lesson-row{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:transform .14s ease,border-color .14s ease,background .14s ease;}
    .ac-lesson-row:hover{transform:translateX(3px);border-color:rgba(155,107,255,.4);background:var(--card2);}
    .ac-lesson-row.done{border-color:rgba(61,212,74,.28);}
    .ac-lesson-num{flex-shrink:0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;}
  `;
  document.head.appendChild(style);
}

// Builds the inline CSS-variable string that colors a module card's accent
// (icon chip background, top rule, progress fill) based on its state.
function _acModAccent(kind) {
  if (kind === 'locked') return "--ac-c:#ffd700;--ac-cbg:rgba(255,215,0,.14);--ac-cbd:rgba(255,215,0,.32);";
  if (kind === 'done')   return "--ac-c:#3dd44a;--ac-cbg:rgba(61,212,74,.14);--ac-cbd:rgba(61,212,74,.3);";
  if (kind === 'active')  return "--ac-c:#9b6bff;--ac-cbg:rgba(155,107,255,.14);--ac-cbd:rgba(155,107,255,.3);";
  return "--ac-c:#7a8fad;--ac-cbg:rgba(122,143,173,.12);--ac-cbd:var(--border);";
}

// ─── Free course → its paid follow-up ──────────────────────────────────────
// Shown at the end of each free course ("Go deeper") and as "Your next step"
// once it's finished, plus in "Recommended for you" on the Academy home.
// The moment someone finishes a free course is when they're most likely to
// want more — before this, finishing one only asked for feedback.
const ACADEMY_FOLLOW_UP = {
  basics:     'money',
  ig:         'ig_reels_pro',
  tiktok:     'tiktok_pro',
  yt:         'yt_seo',
  other:      'fb_monetize',
  safety:     'money',
  business:   'business_pro',
  shorts:     'shorts_pro',
  ai_content: 'ai_content_pro',
  capcut:     'capcut_pro',
  canva:      'canva_pro',
  branding:   'branding_pro',
  rules:      'ig_reels_pro',
  rescue:     'money',
  fundamentals: 'business_pro',
};
// Fill-ins for "Recommended for you" when the learner hasn't started much yet.
const ACADEMY_DEFAULT_PICKS = ['tiktok_pro', 'money', 'business_pro', 'brand_pricing_pro', 'affiliate_pro'];

function _acFollowUpFor(moduleId, state) {
  const proId = ACADEMY_FOLLOW_UP[moduleId];
  const pro = proId && ACADEMY_MODULES.find(m => m.id === proId);
  return pro && pro.premium ? pro : null;
}

function _acPriceFor(mod, state) {
  const meta = state.moduleMeta && state.moduleMeta[mod.id];
  return (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;
}

// Up to `n` locked premium courses, most relevant first: follow-ups of the
// free courses this learner has made the most progress in, then defaults.
function _acRecommendedPro(state, n = 3) {
  const started = ACADEMY_MODULES
    .filter(m => !m.premium)
    .map(m => ({ m, done: _acModuleProgress(state, m).done }))
    .filter(x => x.done > 0)
    .sort((a, b) => b.done - a.done)
    .map(x => ACADEMY_FOLLOW_UP[x.m.id]);
  const out = [];
  [...started, ...ACADEMY_DEFAULT_PICKS].forEach(id => {
    const mod = id && ACADEMY_MODULES.find(m => m.id === id);
    if (mod && mod.premium && !_acIsPurchased(state, id) && !out.includes(mod) && out.length < n) out.push(mod);
  });
  return out;
}

// The "Go deeper" / "Your next step" card inside a free course.
function _acFollowUpCard(mod, state, finished) {
  const pro = _acFollowUpFor(mod.id, state);
  if (!pro) return '';
  const owned = _acIsPurchased(state, pro.id);
  const price = _acPriceFor(pro, state);
  const kicker = finished ? (owned ? 'KEEP GOING' : 'YOUR NEXT STEP') : 'WANT TO GO DEEPER?';
  return `
  <div class="ac-next${finished ? ' ac-next-hot' : ''}" onclick="${owned ? `_acOpenModule('${pro.id}')` : `openAcademyPurchase('${pro.id}')`}">
    <div class="ac-next-icon">${pro.icon}</div>
    <div class="ac-next-body">
      <div class="ac-next-kicker">${kicker}</div>
      <div class="ac-next-title">${esc(pro.title)}</div>
      <div class="ac-next-sub">${esc(pro.blurb)} · ${pro.lessons.length} lessons</div>
    </div>
    <button class="ac-next-btn" onclick="event.stopPropagation();${owned ? `_acOpenModule('${pro.id}')` : `openAcademyPurchase('${pro.id}')`}">${owned ? 'Open →' : `Unlock · KSh ${price}`}</button>
  </div>`;
}

// ─── Order success → a course for the platform they just ordered for ──────
// Shown on the "ORDER PLACED!" screen (index.html showOrderResult). Free
// course for that platform; if they've already finished it, its paid
// follow-up instead. Reaches order customers who never open the Academy.
const ACADEMY_COURSE_FOR_PLATFORM = {
  tiktok: 'tiktok', instagram: 'ig', youtube: 'yt', threads: 'ig',
  facebook: 'other', twitter: 'other', telegram: 'other',
};
const _AC_PLATFORM_NAME = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', threads: 'Threads',
  facebook: 'Facebook', twitter: 'X', telegram: 'Telegram' };

function acOrderSuggestionHTML(platKey) {
  const free = ACADEMY_MODULES.find(m => m.id === (ACADEMY_COURSE_FOR_PLATFORM[platKey] || 'basics'));
  if (!free) return '';
  const state = _acState;   // only known if they've opened the Academy this session
  const finished = state && state.moduleBadges && state.moduleBadges.includes(free.id);
  const pro = finished ? _acFollowUpFor(free.id, state) : null;
  const mod = (pro && !_acIsPurchased(state, pro.id)) ? pro : free;
  const plat = _AC_PLATFORM_NAME[platKey];
  const isPaid = mod === pro;
  const kicker = plat ? `KEEP YOUR ${plat.toUpperCase()} GROWING` : 'KEEP THE GROWTH GOING';
  const line = isPaid
    ? `You finished the free ${esc(free.title)} — go deeper:`
    : (plat ? `Boosts work best with strong content. Learn what makes ${plat} push your posts — free:` : 'Learn how to turn this boost into lasting growth — free:');
  const tag = isPaid ? `KSh ${_acPriceFor(mod, state || _acEmptyState())}` : 'FREE';
  return `
  <div class="om-ac-tip" onclick="acGoToCourse('${mod.id}')" role="button" tabindex="0">
    <div class="om-ac-kicker">🎓 ${kicker}</div>
    <div class="om-ac-line">${line}</div>
    <div class="om-ac-row">
      <div class="om-ac-icon">${mod.icon}</div>
      <div class="om-ac-body"><div class="om-ac-title">${esc(mod.title)}</div><div class="om-ac-sub">${mod.lessons.length} short lessons · ${esc(mod.blurb)}</div></div>
      <div class="om-ac-tag${isPaid ? ' paid' : ''}">${tag}</div>
    </div>
    <div class="om-ac-cta">${isPaid ? 'See the course →' : 'Start the first lesson →'}</div>
  </div>`;
}

// Open a specific course from anywhere in the app.
// Quick plain-language summary shown at the top of a course page.
// Only modules with a `summary` array get one; text is static, trusted copy.
function _acSummaryBox(mod) {
  if (!mod || !Array.isArray(mod.summary) || !mod.summary.length) return '';
  return `
  <div style="max-width:640px;margin:0 0 16px;background:rgba(61,212,74,.06);border:1px solid rgba(61,212,74,.22);border-radius:14px;padding:14px 16px;">
    <div style="font-size:11px;font-weight:800;color:var(--green);letter-spacing:.4px;margin-bottom:10px;">⚡ QUICK SUMMARY · 30 SECONDS</div>
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${mod.summary.map(s => `
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="font-size:15px;line-height:1.3;flex-shrink:0;width:20px;text-align:center;">${s.icon}</div>
        <div style="font-size:12.5px;line-height:1.45;color:#c9d4e3;">${s.text}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:11px;">Want more detail? Tap any lesson below.</div>
  </div>`;
}

async function acGoToCourse(moduleId) {
  if (typeof closeOrderModal === 'function') closeOrderModal();
  if (typeof navTo === 'function') navTo('academy');   // shows the section (and starts loading)
  try { await initAcademyPage(); } catch (_) {}
  _acOpenModule(moduleId);
  window.scrollTo(0, 0);
}

(function _acInjectOrderTipStyles() {
  const css = `
  .om-ac-tip{margin:0 0 18px;padding:14px;border-radius:14px;text-align:left;cursor:pointer;
    background:linear-gradient(135deg,rgba(155,107,255,.14),rgba(61,212,74,.06));border:1px solid rgba(155,107,255,.4);}
  .om-ac-tip:hover{border-color:rgba(155,107,255,.75);}
  .om-ac-kicker{font-size:10.5px;font-weight:800;letter-spacing:1.2px;color:#c4a8ff;margin-bottom:5px;}
  .om-ac-line{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:10px;}
  .om-ac-row{display:flex;align-items:center;gap:11px;}
  .om-ac-icon{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:21px;background:rgba(155,107,255,.16);flex-shrink:0;}
  .om-ac-body{flex:1;min-width:0;}
  .om-ac-title{font-size:14px;font-weight:800;color:var(--white);line-height:1.3;}
  .om-ac-sub{font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.4;}
  .om-ac-tag{flex-shrink:0;font-size:11px;font-weight:800;padding:5px 9px;border-radius:8px;background:rgba(61,212,74,.15);color:var(--green);}
  .om-ac-tag.paid{background:rgba(255,215,0,.15);color:#ffd700;}
  .om-ac-cta{margin-top:11px;font-size:13px;font-weight:800;color:#c4a8ff;}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

function _acScrollToPremium() {
  const el = document.getElementById('ac-premium-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _acRenderModCard(mod, state) {
  const mp = _acModuleProgress(state, mod);
  const mpct = Math.round((mp.done / mp.total) * 100);
  const badge = state.moduleBadges.includes(mod.id);
  const locked = mod.premium && !_acIsPurchased(state, mod.id);
  const meta = state.moduleMeta && state.moduleMeta[mod.id];
  const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;
  const ptsCost = meta && meta.points_cost;
  const kind = locked ? 'locked' : (mpct === 100 ? 'done' : (mpct > 0 ? 'active' : 'idle'));
  const cardClass = 'ac-modcard' + (locked ? ' locked' : '') + (kind === 'done' ? ' done' : '');

  return `
  <div class="${cardClass}" style="${_acModAccent(kind)}" onclick="_acOpenModule('${mod.id}')">
    <div class="ac-mod-top">
      <div class="ac-mod-icon">${mod.icon}</div>
      ${badge ? `<span onclick="event.stopPropagation();acOpenCertificate('${mod.id}')" class="ac-mod-pill" style="background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.3);color:#ffd700;cursor:pointer;">🎓<span class="lbl"> Certificate</span></span>` : ''}
      ${(!badge && locked) ? `<span class="ac-mod-pill" style="background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.32);color:#ffd700;">🔒 KSh ${price}${ptsCost ? `<span class="pts"> · or ⭐ ${ptsCost} pts</span>` : ''}</span>` : ''}
      ${(!badge && !locked && kind === 'done') ? `<span class="ac-mod-pill" style="background:rgba(61,212,74,.14);border:1px solid rgba(61,212,74,.3);color:var(--green);">✓<span class="lbl"> Done</span></span>` : ''}
    </div>
    <div class="ac-mod-title">${esc(mod.title)}</div>
    <div class="ac-mod-blurb">${esc(mod.blurb)}</div>
    ${locked ? `
    <div class="ac-mod-unlock">Unlock to view ${mp.total} lessons →</div>
    ` : `
    <div class="ac-mod-progress-row"><span>${mp.done}/${mp.total} lessons</span><span>${mpct}%</span></div>
    <div class="ac-mod-progress-track"><div class="ac-mod-progress-fill" style="width:${mpct}%"></div></div>
    `}
  </div>`;
}

function _acRenderHome(sec, state) {
  _acInjectHomeStyles();
  _acInjectGuideStyles();
  const total   = _acTotalLessons();
  const done    = _acCompletedCount(state);
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const level   = _acLevelFor(state.xp);
  const nextLvl = ACADEMY_LEVELS.find(l => l.min > state.xp);
  const xpToNext = nextLvl ? (nextLvl.min - state.xp) : 0;
  const streak  = state.streak.count || 0;

  const freeMods   = ACADEMY_MODULES.filter(m => !(m.premium && !_acIsPurchased(state, m.id)));
  const lockedMods = ACADEMY_MODULES.filter(m => m.premium && !_acIsPurchased(state, m.id));
  const recoMods   = _acRecommendedPro(state, 2);
  const startMod   = ACADEMY_MODULES.find(m => m.id === 'basics');
  const startProg  = startMod ? _acModuleProgress(state, startMod) : null;
  const showStart  = startMod && startProg && startProg.done < startProg.total;
  const anyStarted = ACADEMY_MODULES.some(m => !m.premium && _acModuleProgress(state, m).done > 0);

  sec.innerHTML = `
  <div class="ac-hero">
    <div class="ac-hero-corner tl"></div><div class="ac-hero-corner tr"></div>
    <div class="ac-hero-corner bl"></div><div class="ac-hero-corner br"></div>
    <div class="ac-hero-main">
      <div class="ac-hero-crest">🎓</div>
      <div class="ac-hero-copy">
        <div class="ac-hero-kicker">CREATOR ACADEMY</div>
        <div class="ac-hero-title">Grow your social media with Free Courses</div>
        <div class="ac-hero-sub">Start free, earn points as you go, then go deeper with step-by-step premium courses from KSh 50</div>
      </div>
      <div class="ac-hero-level">
        <div class="ac-hero-level-top"><span>${level.icon}</span><span>${esc(level.name)}</span></div>
        <div class="ac-hero-level-xp">${state.xp} learning points${nextLvl ? ` <span class="ac-hero-level-next">· ${xpToNext} more to level up</span>` : ' · Max level'}</div>
      </div>
    </div>
    <div class="ac-hero-progress">
      <div class="ac-hero-progress-track"><div class="ac-hero-progress-fill" style="width:${pct}%"></div></div>
      <div class="ac-hero-progress-label"><span>${done}/${total} lessons complete</span><span>${pct}% through the Academy</span></div>
    </div>
  </div>

  ${showStart ? `
  <div class="ac-start" onclick="_acOpenModule('basics')">
    <div class="ac-start-icon">${startMod.icon}</div>
    <div class="ac-start-body">
      <div class="ac-start-kicker">${startProg.done ? 'CONTINUE WHERE YOU LEFT OFF' : 'NEW HERE? START HERE'}</div>
      <div class="ac-start-title">${esc(startMod.title)}</div>
      <div class="ac-start-sub">${startMod.lessons.length} short lessons · how to order, pay with M-Pesa, track delivery and earn free orders${startProg.done ? ` · ${startProg.done}/${startProg.total} done` : ''}</div>
    </div>
    <button class="ac-start-btn" onclick="event.stopPropagation();_acOpenModule('basics')">${startProg.done ? 'Continue →' : 'Start →'}</button>
  </div>` : ''}

  ${recoMods.length ? `
  <div class="ac-reco">
    <div class="ac-group-hd" style="margin-top:0;"><span class="t">💎 ${anyStarted ? 'Recommended for you' : 'Popular premium courses'}</span><span class="line"></span></div>
    <div class="ac-reco-list">
      ${recoMods.map(m => `
      <div class="ac-reco-row" onclick="_acOpenModule('${m.id}')">
        <div class="i">${m.icon}</div>
        <div class="t">${esc(m.title)}</div>
        <div class="w">${m.lessons.length} lessons · ${esc(m.blurb)}</div>
        <div class="p">KSh ${_acPriceFor(m, state)} ›</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div id="ac-guides-section">
    <div class="ac-group-hd" style="margin-top:0;"><span class="t">📘 Premium Guides · PDF</span><span class="n">from KSh ${Math.min(...ACADEMY_GUIDES.map(g => g.priceKes))}</span><span class="line"></span></div>
    <div class="ac-guides" id="ac-guides">${_acGuidesInner()}</div>
  </div>

  ${lockedMods.length > recoMods.length ? `
  <div class="ac-premium-teaser" onclick="_acScrollToPremium()">
    <div class="ac-premium-teaser-icon">💎</div>
    <div class="ac-premium-teaser-body">
      <div class="ac-premium-teaser-title">See all ${lockedMods.length} premium courses — from KSh ${Math.min(...lockedMods.map(m => m.priceKes || ACADEMY_PREMIUM_PRICE_KES))}</div>
      <div class="ac-premium-teaser-sub">Deeper, step-by-step guides beyond the free lessons. Pay with M-Pesa or use your reward points.</div>
    </div>
    <div class="ac-premium-teaser-arrow">↓</div>
  </div>` : ''}

  ${state.graduated ? `
  <div class="ac-grad-banner">
    <div class="ac-grad-icon">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);margin-bottom:3px;">Academy Graduate</div>
      <div style="font-size:12px;color:#a9b8cc;line-height:1.5;">You finished every course — claim your graduation certificate</div>
    </div>
    <button class="ac-grad-btn" onclick="acOpenCertificate('graduation')">Get Certificate →</button>
  </div>` : ''}

  <div class="ac-stats">
    <div class="ac-stat" style="${_acModAccent('active')}">
      <div class="ac-stat-icon">🔥</div>
      <div class="ac-stat-val">${streak} day${streak === 1 ? '' : 's'}</div>
      <div class="ac-stat-sub">Days in a row you've studied</div>
    </div>
    <div class="ac-stat" style="${_acModAccent('locked')}">
      <div class="ac-stat-icon">🏅</div>
      <div class="ac-stat-val">${state.moduleBadges.length}/${ACADEMY_MODULES.length} badges</div>
      <div class="ac-stat-sub">${state.graduated ? 'Academy Graduate 🎓' : 'Finish a course to earn one'}</div>
    </div>
    <div class="ac-stat" style="${_acModAccent('done')}">
      <div class="ac-stat-icon">⭐</div>
      <div class="ac-stat-val">${(state.pointsBalance || 0).toLocaleString()} reward points</div>
      <div class="ac-stat-sub">You get these from placing orders — use them to unlock paid lessons</div>
    </div>
  </div>

  <div class="ac-group-hd"><span class="t">📘 Free Learning Path</span><span class="n">${freeMods.length} courses</span><span class="line"></span></div>
  <div class="ac-modgrid">
    ${freeMods.map(mod => _acRenderModCard(mod, state)).join('')}
  </div>

  ${lockedMods.length ? `
  <div class="ac-group-hd" id="ac-premium-section"><span class="t">🔒 Premium Courses</span><span class="n">${lockedMods.length} to unlock</span><span class="line"></span></div>
  <div class="ac-modgrid">
    ${lockedMods.map(mod => _acRenderModCard(mod, state)).join('')}
  </div>` : ''}`;
  if (_acPendingReplies.length) _acPaintReplyBanner(sec);
  _acFetchGuides(!_acGuidesLoaded).then(_acPaintGuides).catch(() => { /* keep the buy buttons */ });
}

// ─── Rendering: module (lesson list) ───────────────────────────────────────

// Merges the server's full lesson text (id/title/minutes/body) into the
// matching client-side ACADEMY_MODULES entries, in place, keyed by id.
function _acMergePremiumContent(mod, content) {
  if (!content || !Array.isArray(content.lessons)) return;
  content.lessons.forEach(serverLesson => {
    const local = mod.lessons.find(l => l.id === serverLesson.id);
    if (local) local.body = serverLesson.body;
  });
}

async function _acOpenModule(moduleId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;
  _acHomeToken++; // a pending home refresh must not overwrite this module view
  _acInjectHomeStyles();
  const sec = document.getElementById('sec-academy');
  const state = _acCachedState() || _acEmptyState();
  const locked = mod.premium && !_acIsPurchased(state, mod.id);
  const meta = state.moduleMeta && state.moduleMeta[mod.id];
  const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;

  if (locked) {
    const myToken = _acHomeToken;
    sec.innerHTML = _acLockedModuleHtml(mod, state, _acPreviewCache[mod.id]);
    if (!_acPreviewCache[mod.id]) {
      _acFetchPreview(mod.id).then(pv => {
        if (myToken !== _acHomeToken) return;   // user navigated away
        sec.innerHTML = _acLockedModuleHtml(mod, _acCachedState() || state, pv);
      }).catch(() => { /* keep the basic paywall */ });
    }
    return;
  }

  // Premium + unlocked, but this session hasn't fetched the full lesson
  // text yet (body is still null from the public bundle) — fetch it now.
  // Free modules never hit this branch since their body ships in the bundle.
  if (mod.premium && mod.lessons.some(l => l.body === null)) {
    sec.innerHTML = `
    <div class="sec-hd" style="margin-bottom:16px;">
      <div>
        <button class="btn-secondary" style="margin-bottom:14px;" onclick="initAcademyPage()">← All Modules</button>
        <div class="ac-modhead">
          <div class="ac-modhead-icon">${mod.icon}</div>
          <div class="ac-modhead-title">${esc(mod.title)}</div>
        </div>
      </div>
    </div>
    <div style="padding:40px 0;text-align:center;color:var(--muted);font-size:13px;">Loading your lessons…</div>`;
    try {
      const content = await api(`/academy/modules/${encodeURIComponent(moduleId)}/content`);
      _acMergePremiumContent(mod, content);
    } catch (e) {
      sec.innerHTML = `
      <div class="sec-hd" style="margin-bottom:16px;">
        <div>
          <button class="btn-secondary" style="margin-bottom:10px;" onclick="initAcademyPage()">← All Modules</button>
        </div>
      </div>
      <div style="max-width:520px;text-align:center;padding:20px 0;">
        <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">${esc(e.message || "Couldn't load your lessons.")}</div>
        <button class="btn-secondary" onclick="_acOpenModule('${moduleId}')">Retry</button>
      </div>`;
      return;
    }
  }

  const badgeEarned = state.moduleBadges.includes(mod.id);
  const doneCount = mod.lessons.filter(l => !!state.completed[mod.id + ':' + l.id]).length;

  sec.innerHTML = `
  <div class="sec-hd" style="margin-bottom:16px;">
    <div>
      <button class="btn-secondary" style="margin-bottom:14px;" onclick="initAcademyPage()">← All Modules</button>
      <div class="ac-modhead">
        <div class="ac-modhead-icon" style="${_acModAccent(badgeEarned ? 'done' : (doneCount > 0 ? 'active' : 'idle'))}">${mod.icon}</div>
        <div>
          <div class="ac-modhead-title">${esc(mod.title)}</div>
          <div class="ac-modhead-sub">${esc(mod.blurb)} · ${doneCount}/${mod.lessons.length} lessons</div>
        </div>
      </div>
    </div>
  </div>
  ${_acSummaryBox(mod)}
  <div style="display:flex;flex-direction:column;gap:10px;max-width:640px;">
    ${mod.lessons.map((l, i) => {
      const complete = !!state.completed[mod.id + ':' + l.id];
      return `
      <div onclick="openAcademyLesson('${mod.id}','${l.id}')" class="ac-lesson-row${complete ? ' done' : ''}">
        <div class="ac-lesson-num" style="background:${complete ? 'rgba(61,212,74,.15)' : 'var(--navy)'};color:${complete ? 'var(--green)' : 'var(--muted)'};border:1px solid ${complete ? 'rgba(61,212,74,.3)' : 'var(--border)'};">
          ${complete ? '✓' : (i + 1)}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:700;color:var(--white);">${esc(l.title)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${l.minutes} min read${complete ? ' · Completed' : ''}</div>
        </div>
        <div style="color:var(--muted);font-size:14px;">›</div>
      </div>`;
    }).join('')}
  </div>
  ${badgeEarned ? `
  <div class="ac-grad-banner" style="max-width:640px;margin-top:20px;margin-bottom:14px;">
    <div class="ac-grad-icon">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);">Course complete — your certificate is ready</div>
      <div style="font-size:11.5px;color:#a9b8cc;margin-top:2px;">Download it or share it straight to your socials</div>
    </div>
    <button class="ac-grad-btn" onclick="acOpenCertificate('${mod.id}')">Get Certificate →</button>
  </div>` : ''}
  ${(!mod.premium && badgeEarned) ? _acFollowUpCard(mod, state, true) : ''}
  ${(!mod.premium && !badgeEarned) ? _acFollowUpCard(mod, state, false) : ''}`;
}

// ════════════════════════════════════════════════════════════════════════════
// LESSON EXPERIENCE v2 — rich blocks, quick quiz, reactions, discussion thread,
// premium free-sample preview. Backend: app/routers/academy_community.py
// ════════════════════════════════════════════════════════════════════════════

// Escape, then allow **bold** (safe: runs on already-escaped text).
function _acInline(s) {
  return esc(s == null ? '' : String(s)).replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--white);font-weight:800;">$1</b>');
}

let _acQuizzes = [];   // quiz blocks of the open lesson, by index

function _acRenderBlocks(body, ctx) {
  ctx = ctx || {};
  _acTemplates = [];
  _acQuizzes = [];
  return (body || []).map(block => {
    if (!block || !block.type) return '';
    const t = block.type;
    if (t === 'p') return `<p style="margin-bottom:12px;">${_acInline(block.text)}</p>`;
    if (t === 'ul') return `<ul style="margin:0 0 12px 18px;padding:0;">${(block.items || []).map(it => `<li style="margin-bottom:7px;color:#c9d4e3;">${_acInline(it)}</li>`).join('')}</ul>`;
    if (t === 'ol') return `<ol style="margin:0 0 12px 18px;padding:0;">${(block.items || []).map(it => `<li style="margin-bottom:7px;color:#c9d4e3;">${_acInline(it)}</li>`).join('')}</ol>`;
    if (t === 'h3') return `<h3 class="ac-h3">${_acInline(block.text)}</h3>`;
    if (t === 'hook') return `<div class="ac-hook">${_acInline(block.text)}</div>`;
    if (t === 'callout') return `<div class="ac-callout">${block.label ? `<div class="ac-callout-lb">${esc(block.label)}</div>` : ''}<div class="ac-callout-tx">${_acInline(block.text)}</div></div>`;
    if (t === 'insight') return `<div class="ac-insight"><div class="ac-insight-lb">💡 ${esc(block.label || 'What most creators miss')}</div><div class="ac-insight-tx">${_acInline(block.text)}</div></div>`;
    if (t === 'stat') return `<div class="ac-stat-blk"><div class="ac-stat-v">${esc(block.value)}</div><div class="ac-stat-l">${_acInline(block.label)}</div></div>`;
    if (t === 'myth') return `<div class="ac-myth"><div class="ac-myth-row bad"><span class="ac-myth-tag">✗ MYTH</span><span>${_acInline(block.myth)}</span></div><div class="ac-myth-row good"><span class="ac-myth-tag">✓ REALITY</span><span>${_acInline(block.truth)}</span></div></div>`;
    if (t === 'takeaways') return `<div class="ac-take"><div class="ac-take-hd">🧠 Key takeaways</div>${(block.items || []).map((it, i) => `<div class="ac-take-row"><span class="ac-take-n">${i + 1}</span><span>${_acInline(it)}</span></div>`).join('')}</div>`;
    if (t === 'table') {
      const head = (block.headers || []).map(h => `<th>${esc(h)}</th>`).join('');
      const rows = (block.rows || []).map(r => `<tr>${r.map(c => `<td>${_acInline(c)}</td>`).join('')}</tr>`).join('');
      return `<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    if (t === 'template') {
      const i = _acTemplates.push(block.text || '') - 1;
      return `<div class="ac-tpl"><div class="ac-tpl-hd"><span>📋 ${esc(block.label || 'Template')}</span><button type="button" class="ac-tpl-copy" onclick="_acCopyTemplate(${i}, this)">Copy</button></div><pre class="ac-tpl-body">${esc(block.text || '')}</pre></div>`;
    }
    if (t === 'service') {
      const plat = String(block.platform || 'all').replace(/[^a-z]/g, '');
      const sub  = String(block.subcat || 'all').replace(/[^a-z]/g, '');
      return `<div class="ac-svc"><div class="ac-svc-kicker">🚀 ENDAVIRAL GROWTH</div><div class="ac-svc-title">${esc(block.label || '')}</div><div class="ac-svc-text">${_acInline(block.text || '')}</div><button type="button" class="ac-svc-btn" onclick="acOrderService('${plat}','${sub}')">${esc(block.cta || 'Order now')} →</button><div class="ac-svc-note">Works best as social proof on content you're proud of. Bought numbers don't count toward monetisation, so keep them out of brand pitches.</div></div>`;
    }
    if (t === 'action') {
      return `<div class="ac-act"><div class="ac-act-hd">✅ ${esc(block.label || 'Do this today')}</div>${(block.items || []).map(it => `<label class="ac-act-row"><input type="checkbox"><span>${_acInline(it)}</span></label>`).join('')}</div>`;
    }
    if (t === 'quiz') {
      const qi = _acQuizzes.push(block) - 1;
      return `<div class="ac-quiz" id="acQuiz${qi}"><div class="ac-quiz-kicker">⚡ QUICK CHECK</div><div class="ac-quiz-q">${_acInline(block.q)}</div>${(block.options || []).map((o, oi) => `<button type="button" class="ac-quiz-opt" onclick="_acQuizPick(${qi},${oi})"><span class="ac-quiz-l">${'ABCD'[oi] || '•'}</span><span>${_acInline(o)}</span></button>`).join('')}<div class="ac-quiz-ex" style="display:none;"></div></div>`;
    }
    if (t === 'sources') {
      const items = (block.items || []).filter(x => x && /^https?:\/\//i.test(x.url || ''));
      if (!items.length) return '';
      return `<details class="ac-src"><summary>📚 Research sources (${items.length})</summary>${items.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(x.title)}</a>`).join('')}</details>`;
    }
    if (t === 'locked') {
      const pm = ACADEMY_MODULES.find(m => m.id === block.module);
      if (!pm) return '';
      const st = _acState || _acEmptyState();
      const owned = _acIsPurchased(st, pm.id);
      const meta = st.moduleMeta && st.moduleMeta[pm.id];
      const price = (meta && meta.price_kes) || pm.priceKes || ACADEMY_PREMIUM_PRICE_KES;
      return `<div class="ac-lockteaser"><div class="ac-lt-kicker">${owned ? '✅ YOU OWN THIS COURSE' : '💎 GO DEEPER — PREMIUM'}</div><div class="ac-lt-title">${pm.icon} ${esc(pm.title)}</div><div class="ac-lt-text">${_acInline(block.text)}</div>${(block.items || []).map(it => `<div class="ac-lt-row"><span>${owned ? '▸' : '🔒'}</span><span>${_acInline(it)}</span></div>`).join('')}<button type="button" class="ac-lt-btn" onclick="_acOpenFromLesson('${pm.id}')">${owned ? 'Open the course →' : `Read lesson 1 free · then KSh ${price} →`}</button></div>`;
    }
    return '';
  }).join('');
}

function _acQuizPick(qi, oi) {
  const q = _acQuizzes[qi];
  const box = document.getElementById('acQuiz' + qi);
  if (!q || !box || box.dataset.done) return;
  box.dataset.done = '1';
  const right = oi === q.answer;
  box.querySelectorAll('.ac-quiz-opt').forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('ok');
    else if (i === oi) b.classList.add('bad');
  });
  const ex = box.querySelector('.ac-quiz-ex');
  if (ex) {
    ex.innerHTML = `<b style="color:${right ? 'var(--green)' : '#ffb347'};">${right ? '✓ Spot on.' : '✗ Not quite.'}</b> ${_acInline(q.explain)}`;
    ex.style.display = 'block';
  }
}

function _acOpenFromLesson(moduleId) {
  closeAcademyLesson();
  if (typeof navTo === 'function' && !document.getElementById('sec-academy')?.classList.contains('active')) {
    acGoToCourse(moduleId);
    return;
  }
  _acOpenModule(moduleId);
  window.scrollTo(0, 0);
}

// ─── Lesson modal chrome: reading-progress bar + community container ────────
function _acEnsureLessonChrome() {
  _acInjectHomeStyles();
  _acInjectLessonStyles();
  const modal = document.querySelector('#academyLessonModal .modal');
  const body = document.getElementById('acLessonBody');
  if (!modal || !body) return;
  if (!document.getElementById('acReadBar')) {
    const bar = document.createElement('div');
    bar.className = 'ac-readbar-wrap';
    bar.innerHTML = '<div class="ac-readbar" id="acReadBar"></div>';
    modal.insertBefore(bar, modal.firstChild);
    modal.addEventListener('scroll', _acUpdateReadBar, { passive: true });
  }
  if (!document.getElementById('acPreviewEnd')) {
    const pe = document.createElement('div');
    pe.id = 'acPreviewEnd';
    body.parentNode.insertBefore(pe, body.nextSibling);
  }
  if (!document.getElementById('acLessonCommunity')) {
    const c = document.createElement('div');
    c.id = 'acLessonCommunity';
    const pe = document.getElementById('acPreviewEnd');
    pe.parentNode.insertBefore(c, pe.nextSibling);
  }
}

function _acUpdateReadBar() {
  const modal = document.querySelector('#academyLessonModal .modal');
  const bar = document.getElementById('acReadBar');
  if (!modal || !bar) return;
  const max = modal.scrollHeight - modal.clientHeight;
  bar.style.width = (max > 0 ? Math.min(100, Math.round(modal.scrollTop / max * 100)) : 100) + '%';
}

// ─── Reactions + discussion ────────────────────────────────────────────────
let _acDiscKey = null;

function _acTimeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24); if (d < 30) return d + 'd ago';
  return new Date(iso).toLocaleDateString();
}

function _acCommentHtml(c) {
  const initial = esc((c.name || 'C').trim().charAt(0).toUpperCase());
  return `<div class="ac-cm${c.hidden ? ' hidden' : ''}" id="acCm-${esc(c.id)}">
    <div class="ac-cm-av">${initial}</div>
    <div class="ac-cm-main">
      <div class="ac-cm-meta"><b>${esc(c.name)}</b>${c.is_mine ? ' <span class="ac-cm-you">you</span>' : ''} · ${esc(_acTimeAgo(c.created_at))}${c.hidden ? ' · <span style="color:#ffb347;">hidden by moderators</span>' : ''}${c.is_mine ? ` · <button type="button" class="ac-cm-del" onclick="_acDeleteComment('${esc(c.id)}')">delete</button>` : ''}</div>
      <div class="ac-cm-tx">${esc(c.comment)}</div>
      ${c.admin_reply ? `<div class="ac-cm-reply"><div class="ac-cm-reply-hd">✔ ${esc(c.admin_reply_by || 'EndaViral Team')} · ${esc(_acTimeAgo(c.admin_replied_at))}</div><div>${esc(c.admin_reply)}</div></div>` : ''}
    </div>
  </div>`;
}

function _acRenderCommunityShell(moduleId, lessonId) {
  const el = document.getElementById('acLessonCommunity');
  if (!el) return;
  el.innerHTML = `
  <div class="ac-react">
    <div class="ac-react-q">Was this lesson useful?</div>
    <div class="ac-react-btns">
      <button type="button" class="ac-react-btn" id="acReactUp" onclick="_acReact(1)">🔥 Yes, learned something <span id="acReactUpN"></span></button>
      <button type="button" class="ac-react-btn" id="acReactDown" onclick="_acReact(-1)">😐 Not really</button>
    </div>
  </div>
  <div class="ac-disc">
    <div class="ac-disc-hd">💬 Discussion <span id="acDiscCount" class="ac-disc-n"></span></div>
    <div class="ac-disc-sub">Ask a question, share a result, or tell us what to cover next — the EndaViral team reads and replies to every comment.</div>
    <textarea id="acDiscInput" maxlength="1000" rows="3" placeholder="e.g. I tried this on my salon page and…"></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;">
      <span style="font-size:11px;color:var(--muted);">Be kind · no links or phone numbers</span>
      <button type="button" class="ac-disc-post" id="acDiscPost" onclick="_acPostComment()">Post comment</button>
    </div>
    <div id="acDiscList" class="ac-disc-list"><div style="font-size:12px;color:var(--muted);padding:10px 0;">Loading discussion…</div></div>
  </div>`;
}

async function _acLoadDiscussion(moduleId, lessonId) {
  const key = moduleId + ':' + lessonId;
  _acDiscKey = key;
  _acRenderCommunityShell(moduleId, lessonId);
  let data;
  try {
    data = await api(`/academy/lessons/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}/discussion`);
  } catch (e) {
    if (_acDiscKey !== key) return;
    const list = document.getElementById('acDiscList');
    if (list) list.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:10px 0;">Couldn't load comments right now.</div>`;
    return;
  }
  if (_acDiscKey !== key) return;
  _acPaintReactions(data.my_reaction, data.reactions);
  const cnt = document.getElementById('acDiscCount');
  if (cnt) cnt.textContent = data.total ? `· ${data.total}` : '';
  const list = document.getElementById('acDiscList');
  if (list) {
    list.innerHTML = (data.comments && data.comments.length)
      ? data.comments.map(_acCommentHtml).join('')
      : `<div class="ac-disc-empty">No comments yet — be the first. Questions get answered by the EndaViral team.</div>`;
  }
}

function _acPaintReactions(mine, totals) {
  const up = document.getElementById('acReactUp');
  const dn = document.getElementById('acReactDown');
  const n = document.getElementById('acReactUpN');
  if (up) up.classList.toggle('on', mine === 1);
  if (dn) dn.classList.toggle('on', mine === -1);
  if (n) n.textContent = totals && totals.up ? `· ${totals.up}` : '';
  if (up) up.dataset.mine = String(mine || 0);
}

async function _acReact(value) {
  if (!_acCurrent || !_acCurrent.moduleId) return;
  const up = document.getElementById('acReactUp');
  const mine = up ? Number(up.dataset.mine || 0) : 0;
  const next = mine === value ? 0 : value;
  try {
    const r = await api(`/academy/lessons/${encodeURIComponent(_acCurrent.moduleId)}/${encodeURIComponent(_acCurrent.lessonId)}/reaction`, {
      method: 'PUT', body: JSON.stringify({ value: next }),
    });
    _acPaintReactions(r.my_reaction, r.reactions);
    if (next === -1) {
      const ta = document.getElementById('acDiscInput');
      if (ta) { ta.placeholder = 'What was missing or unclear? We read every comment and improve lessons from them.'; ta.focus(); }
    } else if (next === 1) {
      toast('🔥 Thanks! Glad it helped.', 'success');
    }
  } catch (e) {
    toast(e.message || 'Could not save your vote', 'error');
  }
}

async function _acPostComment() {
  if (!_acCurrent || !_acCurrent.moduleId) return;
  const ta = document.getElementById('acDiscInput');
  const btn = document.getElementById('acDiscPost');
  const text = ta ? ta.value.trim() : '';
  if (text.length < 2) { toast('Write a comment first', 'error'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }
  try {
    const c = await api(`/academy/lessons/${encodeURIComponent(_acCurrent.moduleId)}/${encodeURIComponent(_acCurrent.lessonId)}/comments`, {
      method: 'POST', body: JSON.stringify({ comment: text }),
    });
    if (ta) ta.value = '';
    const list = document.getElementById('acDiscList');
    if (list) {
      const empty = list.querySelector('.ac-disc-empty');
      if (empty) empty.remove();
      list.insertAdjacentHTML('afterbegin', _acCommentHtml(c));
    }
    const cnt = document.getElementById('acDiscCount');
    if (cnt) { const n = (parseInt((cnt.textContent || '').replace(/\D/g, ''), 10) || 0) + 1; cnt.textContent = `· ${n}`; }
    toast('💬 Posted — the team will reply here', 'success');
  } catch (e) {
    toast(e.message || 'Could not post your comment', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Post comment'; }
  }
}

async function _acDeleteComment(id) {
  try {
    await api(`/academy/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const el = document.getElementById('acCm-' + id);
    if (el) el.remove();
  } catch (e) {
    toast(e.message || 'Could not delete', 'error');
  }
}

// Admin replies the learner hasn't seen yet → a banner on the Academy home.
let _acRepliesChecked = false;
let _acPendingReplies = [];
async function _acCheckReplies(sec) {
  if (_acRepliesChecked) { _acPaintReplyBanner(sec); return; }
  _acRepliesChecked = true;
  try {
    const data = await api('/academy/community/replies');
    _acPendingReplies = (data && data.items) || [];
  } catch (_) { return; }
  _acPaintReplyBanner(sec);
}

function _acPaintReplyBanner(sec) {
  sec = sec || document.getElementById('sec-academy');
  const items = _acPendingReplies;
  if (!items.length || !sec || document.getElementById('acReplyBanner')) return;
  if (!sec.querySelector('.ac-hero, #ac-premium-section')) return;   // only on the Academy home
  const first = items[0];
  const mod = ACADEMY_MODULES.find(m => m.id === first.module_id);
  const lesson = mod && mod.lessons.find(l => l.id === first.lesson_id);
  const div = document.createElement('div');
  div.id = 'acReplyBanner';
  div.className = 'ac-reply-banner';
  div.innerHTML = `<div style="font-size:20px;">💬</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;color:var(--white);">The EndaViral team replied to ${items.length > 1 ? items.length + ' of your comments' : 'your comment'}</div><div style="font-size:11.5px;color:#a9b8cc;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lesson ? esc(lesson.title) + ' — ' : ''}“${esc(String(first.admin_reply || '').slice(0, 90))}”</div></div><button type="button" class="ac-grad-btn">Read →</button>`;
  div.onclick = () => {
    _acPendingReplies = _acPendingReplies.filter(r => r !== first);
    div.remove();
    _acGoToLesson(first.module_id, first.lesson_id);
  };
  sec.insertBefore(div, sec.firstChild);
}

async function _acGoToLesson(moduleId, lessonId) {
  await _acOpenModule(moduleId);
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  const lesson = mod && mod.lessons.find(l => l.id === lessonId);
  if (lesson && lesson.body) openAcademyLesson(moduleId, lessonId);
  else if (mod && mod.premium) _acOpenPreviewLesson(moduleId);
}

// ─── Premium preview (free sample lesson + per-lesson hooks) ───────────────
const _acPreviewCache = {};

async function _acFetchPreview(moduleId) {
  if (_acPreviewCache[moduleId]) return _acPreviewCache[moduleId];
  const data = await api(`/academy/modules/${encodeURIComponent(moduleId)}/preview`);
  _acPreviewCache[moduleId] = data;
  return data;
}

async function _acOpenPreviewLesson(moduleId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;
  let pv;
  try { pv = await _acFetchPreview(moduleId); } catch (e) { toast(e.message || 'Could not load the free lesson', 'error'); return; }
  if (!pv || !pv.sample || !pv.sample.body) { toast('Free lesson not available yet', 'error'); return; }
  openAcademyLesson(moduleId, pv.sample.id, { preview: true, body: pv.sample.body, title: pv.sample.title, minutes: pv.sample.minutes, pv });
}

function _acPreviewEndHtml(mod, pv) {
  const st = _acState || _acEmptyState();
  const meta = st.moduleMeta && st.moduleMeta[mod.id];
  const price = (meta && meta.price_kes) || (pv && pv.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;
  const rest = mod.lessons.slice(1);
  const hooks = (pv && pv.hooks) || {};
  return `<div class="ac-pv-end">
    <div class="ac-pv-end-kicker">🎁 END OF YOUR FREE LESSON</div>
    <div class="ac-pv-end-title">That was 1 of ${mod.lessons.length}. Here's what the other ${rest.length} lessons unlock:</div>
    ${rest.map((l, i) => `<div class="ac-pv-row"><span class="ac-pv-n">${i + 2}</span><div><div class="ac-pv-t">${esc(l.title)}</div>${hooks[l.id] ? `<div class="ac-pv-h">${_acInline(hooks[l.id])}</div>` : ''}</div></div>`).join('')}
    <button type="button" class="ac-pv-btn" onclick="closeAcademyLesson();openAcademyPurchase('${mod.id}')">🔓 Unlock all ${mod.lessons.length} lessons — KSh ${price}</button>
    <div class="ac-pv-note">One-time M-Pesa payment · yours forever · or use your loyalty points</div>
  </div>`;
}

// Rich paywall for a locked premium module (replaces the old bare lock card).
function _acLockedModuleHtml(mod, state, pv) {
  const meta = state.moduleMeta && state.moduleMeta[mod.id];
  const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;
  const ptsCost = (meta && meta.points_cost) || 0;
  const ptsBalance = state.pointsBalance || 0;
  const canAffordPoints = ptsCost > 0 && ptsBalance >= ptsCost;
  const ptsStillNeeded = Math.max(0, ptsCost - ptsBalance);
  const hooks = (pv && pv.hooks) || {};
  const outcomes = (pv && pv.outcomes) || [];
  const proof = [];
  if (pv && pv.owners >= 10) proof.push(`👥 ${pv.owners} creators unlocked this`);
  if (pv && pv.comments >= 3) proof.push(`💬 ${pv.comments} comments from learners`);
  const totalMin = mod.lessons.reduce((n, l) => n + (l.minutes || 0), 0);

  return `
  <div class="sec-hd" style="margin-bottom:16px;">
    <div>
      <button class="btn-secondary" style="margin-bottom:14px;" onclick="initAcademyPage()">← All Modules</button>
      <div class="ac-modhead">
        <div class="ac-modhead-icon" style="${_acModAccent('locked')}">${mod.icon}</div>
        <div>
          <div class="ac-modhead-title">${esc(mod.title)}</div>
          <div class="ac-modhead-sub">${esc(mod.blurb)} · ${mod.lessons.length} lessons · ~${totalMin} min</div>
        </div>
      </div>
    </div>
  </div>
  <div class="ac-pw">
    ${pv && pv.pitch ? `<div class="ac-pw-pitch">${_acInline(pv.pitch)}</div>` : ''}
    ${proof.length ? `<div class="ac-pw-proof">${proof.map(esc).join(' · ')}</div>` : ''}
    <button type="button" class="ac-pw-free" onclick="_acOpenPreviewLesson('${mod.id}')">
      <span class="ac-pw-free-tag">FREE</span>
      <span style="flex:1;text-align:left;"><b>Read lesson 1 now</b><br><span style="font-size:11.5px;color:#a9b8cc;">${esc(mod.lessons[0].title)} · ${mod.lessons[0].minutes} min</span></span>
      <span style="font-size:18px;">→</span>
    </button>
    ${outcomes.length ? `<div class="ac-pw-sec">After this course you'll be able to</div>${outcomes.map(o => `<div class="ac-pw-out"><span>✓</span><span>${_acInline(o)}</span></div>`).join('')}` : ''}
    <div class="ac-pw-sec">What's inside</div>
    ${mod.lessons.map((l, i) => `
      <div class="ac-pw-lesson${i === 0 ? ' free' : ''}" onclick="${i === 0 ? `_acOpenPreviewLesson('${mod.id}')` : `openAcademyPurchase('${mod.id}')`}">
        <div class="ac-pw-ln">${i === 0 ? '▶' : '🔒'}</div>
        <div style="flex:1;min-width:0;">
          <div class="ac-pw-lt">${esc(l.title)} ${i === 0 ? '<span class="ac-pw-badge">FREE PREVIEW</span>' : ''}</div>
          ${hooks[l.id] ? `<div class="ac-pw-lh">${_acInline(hooks[l.id])}</div>` : `<div class="ac-pw-lh">${l.minutes} min read</div>`}
        </div>
      </div>`).join('')}
    <div class="ac-pw-buy">
      <button class="btn-primary" style="width:100%;" onclick="openAcademyPurchase('${mod.id}')">Unlock all ${mod.lessons.length} lessons — KSh ${price} with M-Pesa</button>
      ${ptsCost ? `
      <button class="btn-secondary" style="width:100%;margin-top:10px;${canAffordPoints ? '' : 'opacity:.55;cursor:not-allowed;'}" ${canAffordPoints ? `onclick="acRedeemWithPoints('${mod.id}')"` : 'disabled'}>⭐ Or unlock for ${ptsCost} loyalty points</button>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center;">${canAffordPoints ? `You have ${ptsBalance} points — this leaves you ${ptsBalance - ptsCost}.` : `You have ${ptsBalance} points · earn ${ptsStillNeeded} more from orders to unlock free.`}</div>` : ''}
      <div style="font-size:11px;color:var(--muted);margin-top:10px;text-align:center;">One-time unlock · yours forever · less than a plate of chips 🍟</div>
    </div>
  </div>`;
}

function _acInjectLessonStyles() {
  if (document.getElementById('acLessonStyles')) return;
  const st = document.createElement('style');
  st.id = 'acLessonStyles';
  st.textContent = `
    #acLessonBody p{color:#dbe3ee;}
    .ac-readbar-wrap{position:sticky;top:-32px;margin:-32px -32px 22px;height:4px;background:rgba(255,255,255,.06);z-index:3;border-radius:20px 20px 0 0;overflow:hidden;}
    .ac-readbar{height:100%;width:0;background:linear-gradient(90deg,#9b6bff,#3dd44a);transition:width .12s linear;}
    .ac-h3{margin:24px 0 10px;font-size:15px;font-weight:900;color:var(--white);letter-spacing:.2px;}
    .ac-hook{margin:0 0 16px;padding:2px 0 2px 14px;border-left:3px solid #9b6bff;font-size:16.5px;line-height:1.5;font-weight:800;color:var(--white);}
    .ac-callout{margin:0 0 14px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);border-left:3px solid var(--green);}
    .ac-callout-lb{font-size:11px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;}
    .ac-callout-tx{color:var(--white);font-size:13.5px;line-height:1.55;}
    .ac-insight{margin:4px 0 16px;padding:14px 15px;border-radius:12px;background:linear-gradient(135deg,rgba(155,107,255,.16),rgba(155,107,255,.05));border:1px solid rgba(155,107,255,.4);}
    .ac-insight-lb{font-size:11px;font-weight:900;color:#c4a8ff;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px;}
    .ac-insight-tx{font-size:13.5px;line-height:1.6;color:var(--white);}
    .ac-stat-blk{display:flex;align-items:center;gap:14px;margin:4px 0 16px;padding:14px 16px;border-radius:12px;background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.3);}
    .ac-stat-v{flex-shrink:0;font-size:28px;font-weight:900;color:#ffd700;line-height:1;letter-spacing:-.5px;min-width:64px;}
    .ac-stat-l{font-size:12.5px;line-height:1.5;color:#e6dcc0;}
    .ac-myth{margin:4px 0 16px;border-radius:12px;overflow:hidden;border:1px solid var(--border);}
    .ac-myth-row{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;font-size:13.5px;line-height:1.55;}
    .ac-myth-row.bad{background:rgba(255,92,92,.08);color:#e9c3c3;text-decoration-color:rgba(255,92,92,.5);}
    .ac-myth-row.good{background:rgba(61,212,74,.07);color:var(--white);border-top:1px solid var(--border);}
    .ac-myth-tag{flex-shrink:0;font-size:10px;font-weight:900;letter-spacing:.6px;padding:3px 7px;border-radius:6px;margin-top:2px;}
    .ac-myth-row.bad .ac-myth-tag{background:rgba(255,92,92,.18);color:#ff8a8a;}
    .ac-myth-row.good .ac-myth-tag{background:rgba(61,212,74,.18);color:var(--green);}
    .ac-take{margin:18px 0 14px;padding:14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--border);}
    .ac-take-hd{font-size:12px;font-weight:900;color:var(--white);letter-spacing:.4px;text-transform:uppercase;margin-bottom:8px;}
    .ac-take-row{display:flex;gap:10px;align-items:flex-start;padding:5px 0;font-size:13.5px;line-height:1.5;color:#dbe3ee;}
    .ac-take-n{flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(61,212,74,.16);color:var(--green);font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-top:1px;}
    .ac-tbl-wrap{overflow-x:auto;margin:0 0 14px;border:1px solid var(--border);border-radius:10px;}
    .ac-tbl{width:100%;border-collapse:collapse;min-width:420px;}
    .ac-tbl th{text-align:left;padding:9px 10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:1px solid var(--border);background:rgba(255,255,255,.03);}
    .ac-tbl td{padding:9px 10px;font-size:12.5px;line-height:1.45;color:var(--white);border-bottom:1px solid var(--border);vertical-align:top;}
    .ac-tbl tr:last-child td{border-bottom:none;}
    .ac-quiz{margin:20px 0 14px;padding:15px;border-radius:14px;background:rgba(0,180,255,.06);border:1px solid rgba(0,180,255,.32);}
    .ac-quiz-kicker{font-size:10.5px;font-weight:900;letter-spacing:1.2px;color:#5cc8ff;margin-bottom:6px;}
    .ac-quiz-q{font-size:14px;font-weight:800;color:var(--white);line-height:1.45;margin-bottom:10px;}
    .ac-quiz-opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:var(--navy,#0f1724);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:7px;color:var(--white);font-size:13px;line-height:1.45;cursor:pointer;font-family:inherit;transition:border-color .15s;}
    .ac-quiz-opt:hover:not(:disabled){border-color:#5cc8ff;}
    .ac-quiz-opt:disabled{cursor:default;opacity:.75;}
    .ac-quiz-opt.ok{border-color:var(--green);background:rgba(61,212,74,.12);opacity:1;}
    .ac-quiz-opt.bad{border-color:#ff7a7a;background:rgba(255,92,92,.1);opacity:1;}
    .ac-quiz-l{flex-shrink:0;width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.07);font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;}
    .ac-quiz-ex{margin-top:6px;font-size:13px;line-height:1.55;color:#dbe3ee;}
    .ac-src{margin:16px 0 4px;font-size:12px;color:var(--muted);}
    .ac-src summary{cursor:pointer;font-weight:700;padding:4px 0;}
    .ac-src a{display:block;color:#7fb8ff;text-decoration:none;padding:4px 0 4px 10px;border-left:2px solid var(--border);margin:4px 0;word-break:break-word;}
    .ac-lockteaser{margin:20px 0 10px;padding:16px;border-radius:14px;background:linear-gradient(140deg,rgba(255,215,0,.13),rgba(155,107,255,.08));border:1px solid rgba(255,215,0,.45);}
    .ac-lt-kicker{font-size:10.5px;font-weight:900;letter-spacing:1.2px;color:#ffd700;margin-bottom:5px;}
    .ac-lt-title{font-size:15px;font-weight:900;color:var(--white);margin-bottom:5px;}
    .ac-lt-text{font-size:13px;color:#e6dcc0;line-height:1.5;margin-bottom:10px;}
    .ac-lt-row{display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--white);padding:4px 0;}
    .ac-lt-btn{width:100%;margin-top:12px;background:#ffd700;color:#000;border:none;border-radius:11px;padding:12px 14px;font-size:13.5px;font-weight:900;cursor:pointer;font-family:inherit;}
    .ac-react{margin-top:26px;padding:14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--border);}
    .ac-react-q{font-size:13px;font-weight:800;color:var(--white);margin-bottom:9px;}
    .ac-react-btns{display:flex;gap:8px;flex-wrap:wrap;}
    .ac-react-btn{flex:1;min-width:130px;background:transparent;border:1px solid var(--border);color:var(--white);border-radius:10px;padding:9px 10px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;}
    .ac-react-btn.on{border-color:var(--green);background:rgba(61,212,74,.12);color:var(--green);}
    #acReactDown.on{border-color:#ffb347;background:rgba(255,179,71,.1);color:#ffb347;}
    .ac-disc{margin-top:14px;}
    .ac-disc-hd{font-size:14px;font-weight:900;color:var(--white);}
    .ac-disc-n{color:var(--muted);font-weight:700;}
    .ac-disc-sub{font-size:11.5px;color:var(--muted);margin:3px 0 10px;line-height:1.5;}
    #acDiscInput{width:100%;box-sizing:border-box;background:var(--navy,#0f1724);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--white);font-size:13.5px;font-family:inherit;resize:vertical;}
    .ac-disc-post{background:#9b6bff;color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;}
    .ac-disc-list{margin-top:14px;}
    .ac-disc-empty{font-size:12.5px;color:var(--muted);padding:12px;border:1px dashed var(--border);border-radius:10px;text-align:center;}
    .ac-cm{display:flex;gap:10px;padding:11px 0;border-top:1px solid var(--border);}
    .ac-cm.hidden{opacity:.55;}
    .ac-cm-av{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:rgba(155,107,255,.2);color:#c4a8ff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;}
    .ac-cm-main{flex:1;min-width:0;}
    .ac-cm-meta{font-size:11.5px;color:var(--muted);}
    .ac-cm-meta b{color:var(--white);}
    .ac-cm-you{font-size:9.5px;font-weight:800;background:rgba(61,212,74,.15);color:var(--green);padding:1px 6px;border-radius:6px;}
    .ac-cm-del{background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer;padding:0;text-decoration:underline;font-family:inherit;}
    .ac-cm-tx{font-size:13.5px;color:var(--white);line-height:1.5;margin-top:3px;white-space:pre-wrap;word-break:break-word;}
    .ac-cm-reply{margin-top:8px;padding:9px 11px;border-radius:9px;background:rgba(61,212,74,.08);border-left:3px solid var(--green);font-size:13px;line-height:1.5;color:var(--white);white-space:pre-wrap;word-break:break-word;}
    .ac-cm-reply-hd{font-size:11px;font-weight:800;color:var(--green);margin-bottom:3px;}
    .ac-reply-banner{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:13px 15px;border-radius:14px;cursor:pointer;background:linear-gradient(120deg,rgba(61,212,74,.14),rgba(61,212,74,.04));border:1px solid rgba(61,212,74,.45);}
    .ac-pv-end{margin:22px 0 4px;padding:16px;border-radius:14px;background:linear-gradient(150deg,#1a1330 0%,#151c2c 70%);border:1px solid rgba(255,215,0,.45);}
    .ac-pv-end-kicker{font-size:10.5px;font-weight:900;letter-spacing:1.2px;color:#ffd700;margin-bottom:5px;}
    .ac-pv-end-title{font-size:14.5px;font-weight:900;color:var(--white);margin-bottom:10px;line-height:1.4;}
    .ac-pv-row{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(255,255,255,.06);}
    .ac-pv-n{flex-shrink:0;width:22px;height:22px;border-radius:7px;background:rgba(255,215,0,.15);color:#ffd700;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;}
    .ac-pv-t{font-size:13px;font-weight:800;color:var(--white);line-height:1.35;}
    .ac-pv-h{font-size:12px;color:#c9b98a;line-height:1.45;margin-top:2px;}
    .ac-pv-btn{width:100%;margin-top:12px;background:linear-gradient(135deg,#ffd700,#ffb300);color:#000;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;}
    .ac-pv-note{font-size:11px;color:var(--muted);text-align:center;margin-top:8px;}
    .ac-pw{max-width:640px;}
    .ac-pw-pitch{font-size:15px;line-height:1.55;font-weight:700;color:var(--white);margin-bottom:10px;}
    .ac-pw-proof{font-size:12px;color:#c9b98a;margin-bottom:12px;}
    .ac-pw-free{display:flex;align-items:center;gap:12px;width:100%;margin:4px 0 18px;padding:14px 15px;border-radius:14px;background:linear-gradient(120deg,rgba(61,212,74,.16),rgba(61,212,74,.04));border:1px solid rgba(61,212,74,.55);color:var(--white);font-size:13.5px;cursor:pointer;font-family:inherit;}
    .ac-pw-free-tag{flex-shrink:0;background:var(--green);color:#000;font-size:10.5px;font-weight:900;letter-spacing:.8px;padding:5px 8px;border-radius:7px;}
    .ac-pw-sec{font-size:11px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:18px 0 8px;}
    .ac-pw-out{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--white);padding:4px 0;}
    .ac-pw-out span:first-child{color:var(--green);font-weight:900;}
    .ac-pw-lesson{display:flex;gap:12px;align-items:flex-start;padding:12px 13px;margin-bottom:8px;border-radius:12px;background:var(--card);border:1px solid var(--border);cursor:pointer;}
    .ac-pw-lesson.free{border-color:rgba(61,212,74,.45);}
    .ac-pw-ln{flex-shrink:0;width:26px;height:26px;border-radius:8px;background:var(--navy,#0f1724);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--green);}
    .ac-pw-lt{font-size:13.5px;font-weight:800;color:var(--white);line-height:1.35;}
    .ac-pw-lh{font-size:12px;color:#a9b8cc;line-height:1.45;margin-top:3px;}
    .ac-pw-badge{display:inline-block;font-size:9.5px;font-weight:900;letter-spacing:.5px;background:rgba(61,212,74,.18);color:var(--green);padding:2px 6px;border-radius:6px;margin-left:4px;vertical-align:middle;}
    .ac-pw-buy{position:sticky;bottom:0;margin-top:16px;padding:14px 0 6px;background:linear-gradient(180deg,rgba(0,0,0,0),var(--black,#0d1117) 30%);}
    @media (max-width:600px){
      .ac-readbar-wrap{top:-24px;margin:-24px -16px 18px;}
      .ac-hook{font-size:15.5px;}
      .ac-stat-v{font-size:24px;min-width:54px;}
    }
  `;
  document.head.appendChild(st);
}

// ─── Rendering: lesson modal ────────────────────────────────────────────────
function openAcademyLesson(moduleId, lessonId, opts) {
  opts = opts || {};
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  const baseLesson = mod && mod.lessons.find(l => l.id === lessonId);
  if (!mod || !baseLesson) return;
  // Free-sample mode (premium lesson 1 read before buying): body comes from
  // GET /academy/modules/{id}/preview instead of the gated /content call.
  const preview = !!(opts.preview && opts.body);
  const lesson = preview ? { ...baseLesson, body: opts.body, title: opts.title || baseLesson.title, minutes: opts.minutes || baseLesson.minutes } : baseLesson;
  if (lesson.body === null) {
    // Premium lesson text hasn't been fetched into this module yet — route
    // back through _acOpenModule, which fetches/merges content (or shows
    // the paywall if it turns out not to be purchased after all).
    _acOpenModule(moduleId);
    return;
  }
  _acCurrent = { moduleId, lessonId, preview };
  _acEnsureLessonChrome();

  const state = _acState || _acEmptyState();
  const complete = !!state.completed[moduleId + ':' + lessonId];

  document.getElementById('acLessonEyebrow').textContent = mod.icon + ' ' + mod.title.toUpperCase();
  document.getElementById('acLessonTitle').textContent = lesson.title;
  const idx = mod.lessons.findIndex(l => l.id === lessonId);
  document.getElementById('acLessonMeta').textContent = preview
    ? `🎁 Free preview · ${lesson.minutes} min read · Lesson 1 of ${mod.lessons.length}`
    : `${lesson.minutes} min read · Lesson ${idx + 1} of ${mod.lessons.length}`;
  document.getElementById('acLessonBody').innerHTML = _acRenderBlocks(lesson.body, { moduleId });

  const pe = document.getElementById('acPreviewEnd');
  if (pe) pe.innerHTML = preview ? _acPreviewEndHtml(mod, opts.pv) : '';

  const btn = document.getElementById('acLessonCompleteBtn');
  const xpEl = document.getElementById('acLessonXp');
  if (xpEl) xpEl.textContent = ACADEMY_XP_PER_LESSON;
  if (btn) {
    if (preview) { btn.textContent = '🔓 Unlock the full course'; btn.disabled = false; btn.style.opacity = '1'; }
    else if (complete) { btn.textContent = '✓ Completed'; btn.disabled = true; btn.style.opacity = '.7'; }
    else { btn.innerHTML = `Mark Complete +<span id="acLessonXp">${ACADEMY_XP_PER_LESSON}</span> points`; btn.disabled = false; btn.style.opacity = '1'; }
  }

  document.getElementById('academyLessonModal').classList.add('show');
  const modalEl = document.querySelector('#academyLessonModal .modal');
  if (modalEl) modalEl.scrollTop = 0;
  _acUpdateReadBar();
  _acLoadDiscussion(moduleId, lessonId);
}

let _acTemplates = []; // texts of the template blocks in the open lesson (copied by index)

// From a lesson's order card straight to New Order, filtered to the right
// platform and service type (e.g. TikTok → Views).
async function acOrderService(platform, subcat) {
  closeAcademyLesson();
  if (typeof navTo === 'function') navTo('services');
  try { if (typeof loadServices === 'function') await loadServices(); } catch (_) {}
  try {
    if (typeof selectPlatform === 'function') selectPlatform(platform && platform !== 'all' ? platform : 'all');
    if (subcat && subcat !== 'all' && document.querySelector(`.subcat-tile[data-subcat="${subcat}"]`) && typeof selectSubcat === 'function') selectSubcat(subcat);
  } catch (_) {}
  const target = document.getElementById('subcatBar') || document.getElementById('sec-services');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _acCopyTemplate(i, btn) {
  const text = _acTemplates[i] || '';
  const done = () => { if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy'; }, 1800); } };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => toast('Could not copy — press and hold the text to copy it', 'error'));
  } else {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); done(); } catch (_) { toast('Could not copy', 'error'); }
    t.remove();
  }
}

function closeAcademyLesson() {
  document.getElementById('academyLessonModal').classList.remove('show');
}

async function acMarkCurrentComplete() {
  if (_acCurrent && _acCurrent.preview) {
    const pid = _acCurrent.moduleId;
    closeAcademyLesson();
    openAcademyPurchase(pid);
    return;
  }
  const { moduleId, lessonId } = _acCurrent;
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;
  const key = moduleId + ':' + lessonId;

  const state = _acState || _acEmptyState();
  if (state.completed[key]) { closeAcademyLesson(); return; }

  const btn = document.getElementById('acLessonCompleteBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }

  // XP, module badges, and graduation are all decided server-side (see
  // app/routers/academy.py::complete_lesson) — this request carries no XP
  // amount, only the ids being completed. The server response is what we
  // render; we never compute those numbers ourselves.
  let data;
  try {
    data = await api(`/academy/lessons/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}/complete`, {
      method: 'POST',
    });
  } catch (e) {
    toast(e.message || 'Could not save your progress — check your connection and try again.', 'error');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    return;
  }

  const wasGraduated = state.graduated;
  Store.set('academyProgress', data); // keep Store's cache in sync — this mutation already has the fresh server state, no need to force a refetch
  _acSetState(data);

  if (data.completed_now) {
    if (data.graduated && !wasGraduated) {
      toast('🎓 Academy Graduate! You completed every lesson.', 'success');
    } else if (data.module_badge_earned) {
      toast(`🏅 Course badge earned: ${mod.title}! +${ACADEMY_XP_PER_MODULE} bonus points`, 'success');
    } else if (data.leveled_up) {
      const newLevel = _acLevelFor(data.xp);
      toast(`${newLevel.icon} Leveled up! You're now a ${newLevel.name}`, 'success');
    } else {
      toast(`+${data.xp_gained || ACADEMY_XP_PER_LESSON} points earned!`, 'success');
    }
  }

  closeAcademyLesson();
  _acOpenModule(moduleId);
  _acUpdateBadges();

  // Module just finished (badge earned) — prompt for feedback instead of
  // auto-advancing (there's no next lesson in this module to advance to
  // anyway). Skipped for the module content is on us to improve, but we
  // never re-nag: openAcademyFeedback() itself avoids interrupting if the
  // learner already left feedback for this module.
  if (data.module_badge_earned) {
    setTimeout(() => openAcademyFeedback(moduleId), 700);
    return;
  }

  // Auto-advance: if there's a next lesson in this module, offer it immediately.
  const idx = mod.lessons.findIndex(l => l.id === lessonId);
  const next = mod.lessons[idx + 1];
  if (next) setTimeout(() => openAcademyLesson(moduleId, next.id), 550);
}

// ─── Rendering: post-module feedback (comment + optional star rating) ────────
let _acFeedbackModuleId = null;
let _acFeedbackRating = null;

async function openAcademyFeedback(moduleId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;
  _acFeedbackModuleId = moduleId;
  _acFeedbackRating = null;

  const titleEl = document.getElementById('acFeedbackTitle');
  const subEl = document.getElementById('acFeedbackSub');
  const commentEl = document.getElementById('acFeedbackComment');
  const btn = document.getElementById('acFeedbackSubmitBtn');
  if (titleEl) titleEl.textContent = `🏅 ${mod.title} complete!`;
  if (subEl) subEl.textContent = 'How was it? Your feedback helps us improve the Academy.';
  if (commentEl) commentEl.value = '';
  if (btn) { btn.disabled = false; btn.textContent = 'Send Feedback'; }
  _acRenderFeedbackStars(0);

  // Prefill if the learner already left feedback for this module (e.g. they
  // reopened it via a "Leave feedback" button, not the just-finished flow).
  try {
    const existing = await api(`/academy/modules/${encodeURIComponent(moduleId)}/feedback/me`);
    if (existing && existing.comment) {
      if (commentEl) commentEl.value = existing.comment;
      _acRenderFeedbackStars(existing.rating || 0);
      if (subEl) subEl.textContent = 'You already left feedback — feel free to update it.';
    }
  } catch (e) { /* non-fatal — just show a blank form */ }

  document.getElementById('academyFeedbackModal').classList.add('show');
}

function closeAcademyFeedback() {
  const overlay = document.getElementById('academyFeedbackModal');
  if (overlay) overlay.classList.remove('show');
}

function _acRenderFeedbackStars(rating) {
  _acFeedbackRating = rating || null;
  const container = document.getElementById('acFeedbackStars');
  if (!container) return;
  container.innerHTML = [1, 2, 3, 4, 5].map(n => `
    <span onclick="_acRenderFeedbackStars(${n})" style="cursor:pointer;font-size:28px;line-height:1;color:${n <= rating ? '#ffd700' : 'var(--border)'};transition:color .15s;">★</span>
  `).join('');
}

async function submitAcademyFeedback() {
  const moduleId = _acFeedbackModuleId;
  if (!moduleId) return;
  const commentEl = document.getElementById('acFeedbackComment');
  const comment = commentEl ? commentEl.value.trim() : '';
  if (comment.length < 3) { toast('Add a quick comment before sending', 'error'); return; }

  const btn = document.getElementById('acFeedbackSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    await api(`/academy/modules/${encodeURIComponent(moduleId)}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comment, rating: _acFeedbackRating }),
    });
    toast('Thanks for the feedback! 🙏', 'success');
    closeAcademyFeedback();
  } catch (e) {
    toast(e.message || 'Could not send feedback — try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Send Feedback'; }
  }
}
// ─── Rendering: premium module purchase (M-Pesa STK, same pattern as wallet deposit) ─
// ─── Premium guides: downloadable PDFs (Standard KSh 250, Advanced KSh 500) ─
// Bought with the same M-Pesa modal as premium courses, but against
// /academy/guides/*. The server owns the prices and the files; once paid,
// a guide can be downloaded again any time from this page.
const ACADEMY_GUIDES = [
  { id: 'guide_standard', edition: 'Standard', priceKes: 250, pages: 47, sections: 14,
    title: 'Social Media Growth Strategy — Standard Edition', cover: 'guide-standard-cover.jpg',
    blurb: 'A simple, step-by-step plan: clear posts, the right audience, better hooks and your numbers. Worked examples and a 30-day plan.' },
  { id: 'guide_advanced', edition: 'Advanced', priceKes: 500, pages: 44, sections: 15,
    title: 'Social Media Growth Strategy — Advanced Edition', cover: 'guide-advanced-cover.jpg',
    blurb: 'Build a growth system: give every post a job, read your numbers, test and grow on several apps. Plain English, 90-day plan.' },
];
let _acOwnedGuides = new Set();
let _acGuidesLoaded = false;

const _acIsGuide = id => typeof id === 'string' && id.startsWith('guide_');
const _acGuide = id => ACADEMY_GUIDES.find(g => g.id === id);
const _acItemBase = id => _acIsGuide(id) ? '/academy/guides/' : '/academy/modules/';
function _acItemTitle(id) {
  if (_acIsGuide(id)) { const g = _acGuide(id); return g ? g.title : 'Guide'; }
  const m = ACADEMY_MODULES.find(x => x.id === id); return m ? m.title : 'your course';
}

async function _acFetchGuides(force = false) {
  const data = await api('/academy/guides' + (force ? `?t=${Date.now()}` : ''));
  const list = (data && data.guides) || [];
  _acOwnedGuides = new Set(list.filter(g => g.owned).map(g => g.id));
  list.forEach(sg => { const g = _acGuide(sg.id); if (g && sg.price_kes) g.priceKes = sg.price_kes; });
  _acGuidesLoaded = true;
}

function _acInjectGuideStyles() {
  if (document.getElementById('acGuideStyles')) return;
  const st = document.createElement('style');
  st.id = 'acGuideStyles';
  st.textContent = `
    .ac-guides{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:8px;}
    .ac-guide{display:flex;gap:14px;background:linear-gradient(135deg,rgba(255,176,32,.10),rgba(61,212,74,.05));border:1px solid rgba(255,176,32,.35);border-radius:16px;padding:14px;}
    .ac-guide.owned{border-color:rgba(61,212,74,.5);background:linear-gradient(135deg,rgba(61,212,74,.10),rgba(61,212,74,.03));}
    .ac-guide img{width:84px;height:119px;object-fit:cover;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.45);flex-shrink:0;}
    .ac-guide-b{flex:1;min-width:0;display:flex;flex-direction:column;}
    .ac-guide-ed{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);}
    .ac-guide.owned .ac-guide-ed{color:var(--green);}
    .ac-guide-t{font-size:14px;font-weight:900;color:var(--white);line-height:1.3;margin:3px 0 4px;}
    .ac-guide-w{font-size:11.5px;color:var(--muted);line-height:1.45;}
    .ac-guide-m{font-size:11px;color:#a9b8cc;margin-top:6px;}
    .ac-guide-btn{white-space:nowrap;margin-top:auto;align-self:flex-start;border:0;border-radius:10px;padding:9px 14px;font-weight:900;font-size:12.5px;cursor:pointer;background:var(--gold);color:#1a1204;}
    .ac-guide.owned .ac-guide-btn{background:var(--green);color:#06140a;}
    .ac-guide-btn[disabled]{opacity:.6;cursor:wait;}
    .ac-guide-act{display:flex;align-items:center;gap:10px;margin-top:10px;}
    .ac-guide-note{font-size:10.5px;color:var(--muted);}
    @media(max-width:420px){.ac-guide img{width:70px;height:99px;}.ac-guide-t{font-size:13px;}}
  `;
  document.head.appendChild(st);
}

function _acGuidesInner() {
  return ACADEMY_GUIDES.map(g => {
    const owned = _acOwnedGuides.has(g.id);
    return `
    <div class="ac-guide${owned ? ' owned' : ''}">
      <img src="${g.cover}" alt="${esc(g.title)} cover" loading="lazy">
      <div class="ac-guide-b">
        <div class="ac-guide-ed">${owned ? '✓ Yours · ' : ''}${g.edition} Edition · PDF</div>
        <div class="ac-guide-t">Social Media Growth Strategy</div>
        <div class="ac-guide-w">${esc(g.blurb)}</div>
        <div class="ac-guide-m">${g.pages} pages · ${g.sections} sections · worksheets &amp; templates</div>
        <div class="ac-guide-act">
          ${owned
            ? `<button class="ac-guide-btn" onclick="acDownloadGuide('${g.id}', this)">⬇ Download PDF</button><span class="ac-guide-note">Download again any time</span>`
            : `<button class="ac-guide-btn" onclick="openAcademyPurchase('${g.id}')">Buy · KSh ${g.priceKes}</button><span class="ac-guide-note">M-Pesa · instant download</span>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function _acPaintGuides() {
  const el = document.getElementById('ac-guides');
  if (el) el.innerHTML = _acGuidesInner();
}

function _acScrollToGuides() {
  const el = document.getElementById('ac-guides-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Deep link (/?go=academy&m=guide_standard) and the landing page "Buy" buttons.
async function acOpenGuide(guideId) {
  if (typeof navTo === 'function') navTo('academy');
  try { if (typeof initAcademyPage === 'function') await initAcademyPage(); } catch (_) {}
  try { await _acFetchGuides(true); _acPaintGuides(); } catch (_) {}
  setTimeout(_acScrollToGuides, 150);
  if (_acGuide(guideId) && !_acOwnedGuides.has(guideId)) openAcademyPurchase(guideId);
}

async function acDownloadGuide(guideId, btn) {
  const g = _acGuide(guideId);
  if (!g) return;
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
  try {
    // A plain link can't carry the sign-in token, so fetch the file and save it.
    const r = await fetch(API + `/academy/guides/${encodeURIComponent(guideId)}/download`, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    if (r.status === 401) { doLogout(); toast('Your session has expired. Please sign in again.', 'error'); return; }
    if (r.status === 403) { openAcademyPurchase(guideId); return; }
    if (!r.ok) {
      let msg = ''; try { msg = (await r.json()).detail; } catch (_) {}
      throw new Error(msg || 'Could not download the guide. Please try again.');
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EndaViral-Social-Media-Growth-Strategy-${g.edition}-Edition.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Your guide is downloading. Check your Downloads folder.', 'success');
  } catch (e) {
    toast(e.message || 'Could not download the guide. Please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label || '⬇ Download PDF'; }
  }
}

let _acPurchaseModuleId = null;
let _acPurchasePollTimer = null;
let _acPurchaseCheckoutId = null; // most recent checkoutRequestId this session is polling — used to release the PaymentEvents listener on close

function openAcademyPurchase(moduleId) {
  const guide = _acGuide(moduleId);
  const mod = guide ? null : ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod && !guide) return;
  _acStopPurchasePoll();
  _acPurchaseModuleId = moduleId;

  const state = _acState || _acEmptyState();
  const meta = state.moduleMeta && state.moduleMeta[moduleId];
  const price = guide ? guide.priceKes : ((meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES);
  const subEl = document.querySelector('#acPurchaseForm .modal-sub');
  if (subEl) subEl.textContent = guide ? 'One-time payment · download any time from the Academy' : 'One-time unlock · lifetime access';

  const titleEl = document.getElementById('acPurchaseModuleTitle');
  const priceEl = document.getElementById('acPurchasePrice');
  const phoneInput = document.getElementById('acPurchasePhone');
  const btn = document.getElementById('acPurchaseBtn');
  if (titleEl) titleEl.textContent = guide ? '📘 ' + guide.title : mod.icon + ' ' + mod.title;
  if (priceEl) priceEl.textContent = 'KSh ' + price;
  // Keep a number they already typed (e.g. coming back via "Try Again");
  // otherwise prefill from the account.
  if (phoneInput && !phoneInput.value) {
    phoneInput.value = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) ? currentUser.phone : '';
  }
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = guide ? '📱 PAY & GET PDF' : '📱 PAY & UNLOCK'; }

  _acPurchaseStep('form');
  document.getElementById('academyPurchaseModal').classList.add('show');
}

// Shows exactly one of the three steps: 'form' | 'wait' | 'result'.
// (Uses style.display on plain divs — the old version relied on clearing an
// inline style on a .deposit-status box, whose CSS class is display:none, so
// the waiting/failed/success messages never actually appeared.)
function _acPurchaseStep(step) {
  const ids = { form: 'acPurchaseForm', wait: 'acPurchaseWait', result: 'acPurchaseResult' };
  Object.entries(ids).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === step ? '' : 'none';
  });
  const modal = document.querySelector('#academyPurchaseModal .modal');
  if (modal) modal.scrollTop = 0;
}

function _acStopPurchasePoll() {
  if (_acPurchasePollTimer) { clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null; }
  if (typeof PaymentEvents !== 'undefined' && _acPurchaseCheckoutId) PaymentEvents.off(_acPurchaseCheckoutId);
}

function closeAcademyPurchase() {
  const overlay = document.getElementById('academyPurchaseModal');
  if (overlay) overlay.classList.remove('show');
  _acStopPurchasePoll();
  _acPurchaseCheckoutId = null;
}

// "✕ Cancel" while waiting for the PIN. We can't withdraw the prompt from
// their phone — if they still enter the PIN, the server unlocks the course
// on its own (webhook / reconciler), so say that rather than "cancelled".
function cancelAcademyPurchase() {
  closeAcademyPurchase();
  toast(`Stopped waiting. If you still enter your M-Pesa PIN, the ${_acIsGuide(_acPurchaseModuleId) ? 'guide' : 'course'} will unlock automatically.`, 'info');
}

// Result step. kind: 'success' | 'failed' | 'cancelled' | 'pending'
function _acShowPurchaseResult(kind, moduleId, msg) {
  const isGuide = _acIsGuide(moduleId);
  const icon  = { success: '✅', failed: '❌', cancelled: '🚫', pending: '⏳' }[kind];
  const title = { success: isGuide ? 'GUIDE UNLOCKED!' : 'COURSE UNLOCKED!', failed: 'PAYMENT FAILED', cancelled: 'PAYMENT CANCELLED', pending: 'STILL CONFIRMING' }[kind];
  document.getElementById('acResultIcon').textContent = icon;
  document.getElementById('acResultTitle').textContent = title;
  document.getElementById('acResultDesc').textContent = msg;

  const b1 = document.getElementById('acResultBtn');
  const b2 = document.getElementById('acResultBtn2');
  b2.style.display = 'none';

  if (kind === 'success' && isGuide) {
    b1.textContent = '⬇ Download PDF';
    b1.onclick = () => acDownloadGuide(moduleId, b1);
    b2.style.display = '';
    b2.textContent = 'Close';
    b2.onclick = () => closeAcademyPurchase();
  } else if (kind === 'success') {
    b1.textContent = 'Start Learning →';
    b1.onclick = () => { closeAcademyPurchase(); _acOpenModule(moduleId); };
  } else if (kind === 'pending') {
    b1.textContent = '🔄 Check Again';
    b1.onclick = () => _acPollPurchaseStatus(moduleId, _acPurchaseCheckoutId, true);
    b2.style.display = '';
    b2.textContent = 'Close';
    b2.onclick = () => closeAcademyPurchase();
  } else {
    b1.textContent = 'Try Again';
    b1.onclick = () => openAcademyPurchase(moduleId);
    b2.style.display = '';
    b2.textContent = '🎫 Get Help';
    b2.onclick = () => {
      closeAcademyPurchase();
      if (typeof navTo === 'function') navTo('tickets');
      toast(`Describe the issue with "${_acItemTitle(moduleId)}" payment — admin will respond shortly.`, 'info');
    };
  }
  _acPurchaseStep('result');
}

async function submitAcademyPurchase() {
  const moduleId = _acPurchaseModuleId;
  if (!moduleId) return;
  const isGuide = _acIsGuide(moduleId);
  const payLabel = isGuide ? '📱 PAY & GET PDF' : '📱 PAY & UNLOCK';
  const phoneInput = document.getElementById('acPurchasePhone');
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const digits = phone.replace(/\D/g, '');
  if (!phone) { toast('Enter your M-Pesa number', 'error'); phoneInput && phoneInput.focus(); return; }
  if (digits.length < 9 || digits.length > 12) { toast('That M-Pesa number looks incomplete — use 07XX XXX XXX', 'error'); phoneInput && phoneInput.focus(); return; }

  const btn = document.getElementById('acPurchaseBtn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Sending STK Push…'; }

  // Price is never sent from the client — the server looks up
  // module_price_kes(module_id) itself (see app/routers/academy.py).
  let data;
  try {
    data = await api(`${_acItemBase(moduleId)}${encodeURIComponent(moduleId)}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  } catch (e) {
    const msg = e.message || '';
    const gateway = e.status === 502 || e.status === 503 || /502|bad gateway|unreachable|payment request failed/i.test(msg);
    toast(gateway ? 'M-Pesa is currently unreachable. Please try again in a few minutes.' : (msg || 'Could not start payment. Please try again.'), 'error');
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = payLabel; }
    return;
  }
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = payLabel; }

  if (data.already_purchased) {
    if (isGuide) {
      _acFetchGuides(true).then(_acPaintGuides).catch(() => {});
      _acShowPurchaseResult('success', moduleId, 'You already own this guide. Download it any time.');
    } else {
      _acFetchState(true).then(() => _acUpdateBadges()).catch(() => {});
      _acShowPurchaseResult('success', moduleId, 'You already own this course — jump straight in.');
    }
    return;
  }

  const priceText = (document.getElementById('acPurchasePrice') || {}).textContent || '';
  document.getElementById('acPayPhone').textContent = phone;
  document.getElementById('acPayCourse').textContent = _acItemTitle(moduleId);
  document.getElementById('acPayAmount').textContent = data.amount_kes ? 'KSh ' + data.amount_kes : priceText;
  _acPurchaseStep('wait');

  _acPollPurchaseStatus(moduleId, data.checkout_request_id);
}

// Polls purchase-status every 4s for up to 2 minutes (same window as the
// order flow), with PaymentEvents (SSE) as an earlier nudge. `again` = the
// "Check Again" button after a timeout: go back to the waiting screen and
// start a fresh 2-minute window.
function _acPollPurchaseStatus(moduleId, checkoutRequestId, again = false) {
  _acStopPurchasePoll();
  if (!checkoutRequestId) return;
  _acPurchaseCheckoutId = checkoutRequestId;
  if (again) _acPurchaseStep('wait');

  let attempts = 0;
  let done = false;
  const maxAttempts = 30; // 30 × 4s = 2 min

  async function tick() {
    if (done || _acPurchaseCheckoutId !== checkoutRequestId) return; // closed or superseded
    attempts++;
    let data = null;
    try {
      data = await api(`${_acItemBase(moduleId)}${encodeURIComponent(moduleId)}/purchase-status/${encodeURIComponent(checkoutRequestId)}`);
    } catch (e) { /* transient network blip — keep polling */ }
    if (done || _acPurchaseCheckoutId !== checkoutRequestId) return;

    const status = data && data.status;
    const receipt = data && (data.mpesa_receipt || data.mpesaReceipt || data.receipt);
    if (status === 'success' || status === 'completed') {
      done = true; _acStopPurchasePoll();
      if (_acIsGuide(moduleId)) {
        _acOwnedGuides.add(moduleId); _acPaintGuides();
        _acFetchGuides(true).then(_acPaintGuides).catch(() => {});
        _acShowPurchaseResult('success', moduleId,
          'Payment confirmed' + (receipt ? ` (M-Pesa ref ${receipt})` : '') + '. Download your guide now, or any time later from the Academy page.');
      } else {
        _acFetchState(true).then(() => _acUpdateBadges()).catch(() => {});
        _acShowPurchaseResult('success', moduleId,
          'Payment confirmed' + (receipt ? ` (M-Pesa ref ${receipt})` : '') + '. The course is yours for life — enjoy the lessons!');
      }
    } else if (status === 'failed' || status === 'cancelled') {
      done = true; _acStopPurchasePoll();
      _acShowPurchaseResult(status, moduleId, status === 'cancelled'
        ? 'You dismissed the M-Pesa prompt. No charge was made.'
        : 'Payment failed (wrong PIN, insufficient funds, or timeout). No charge was made — feel free to try again.');
    } else if (attempts >= maxAttempts) {
      done = true;
      if (_acPurchasePollTimer) { clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null; }
      // Stay subscribed to PaymentEvents: the unlock is applied server-side
      // whenever the webhook or reconciler resolves this checkout, and the
      // push lets us flip this screen to success if it's still open.
      if (typeof PaymentEvents !== 'undefined') {
        PaymentEvents.onPaymentStatus(checkoutRequestId, () => {
          if (_acPurchaseCheckoutId === checkoutRequestId) _acPollPurchaseStatus(moduleId, checkoutRequestId, true);
        });
      }
      _acShowPurchaseResult('pending', moduleId,
        `We haven't received your M-Pesa confirmation yet. If you already entered your PIN, the ${_acIsGuide(moduleId) ? 'guide' : 'course'} will unlock automatically within a few minutes. If you didn't pay, nothing was charged.`);
    }
  }

  _acPurchasePollTimer = setInterval(tick, 4000);
  if (again) tick();

  // Real-time nudge — the backend pushes a payment_status SSE event the
  // moment Nexus's webhook (or the reconciler) resolves this checkout via
  // academy_purchase_reconciliation.apply_nexus_status_to_academy_purchase.
  // tick() re-reads purchase-status itself, so this is an earlier trigger
  // of the same check; the poll above is the fallback if SSE drops.
  if (typeof PaymentEvents !== 'undefined') {
    PaymentEvents.onPaymentStatus(checkoutRequestId, () => tick());
  }
}

// ─── Loyalty points: unlock a premium module with points instead of M-Pesa ─
// No STK push, no polling needed — it's a single synchronous server call.
// Cost and balance are never trusted from the client; the button is only
// enabled when the last-fetched state said the balance covers the cost,
// and the server independently re-checks both before spending anything.
async function acRedeemWithPoints(moduleId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;

  let data;
  try {
    data = await api(`/academy/modules/${encodeURIComponent(moduleId)}/redeem-points`, {
      method: 'POST',
    });
  } catch (e) {
    toast(e.message || 'Could not redeem points right now. Please try again.', 'error');
    return;
  }

  if (data.already_unlocked) {
    toast('You already own this course!', 'success');
  } else if (data.unlocked) {
    toast(`⭐ Unlocked with ${data.points_spent} points! ${data.points_remaining} left.`, 'success');
  }

  await _acFetchState(true);
  _acUpdateBadges();
  _acOpenModule(moduleId);
}

// ─── Rendering: certificates ────────────────────────────────────────────────
// Fetched data (title/icon/name/date/certificate_number) is drawn onto a
// <canvas>, which is what actually makes it a downloadable/shareable image —
// the certificate itself is never a server-rendered file, it's built client-
// side from server-issued data every time the modal opens. `refId` is either
// a module id or the literal string 'graduation'.
//
// The EndaViral logo is loaded the same way index.html loads it everywhere
// else — a plain relative-path <img src="EndaViral_logo_transparent.png">,
// same-origin with the page — rather than an inlined base64 copy. `img.
// crossOrigin = 'anonymous'` is set as a safety net so drawImage() never
// taints the canvas even if this ever ends up served cross-origin (e.g. a
// CDN); that would otherwise silently break the Download/Share buttons'
// canvas.toDataURL()/toBlob() calls further down this file. If the image
// ever fails to load, `_acLoadLogo()` resolves null and the draw routine
// below falls back to a plain text wordmark.
let _acLogoImg = null;
let _acLogoLoadPromise = null;

function _acLoadLogo() {
  if (_acLogoImg) return Promise.resolve(_acLogoImg);
  if (_acLogoLoadPromise) return _acLogoLoadPromise;
  _acLogoLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // keeps canvas untainted if ever served cross-origin/CDN
    img.onload  = () => { _acLogoImg = img; resolve(img); };
    img.onerror = () => resolve(null); // fall back to a text wordmark if it ever fails to load
    img.src = 'EndaViral_logo_transparent.png'; // same relative path index.html uses everywhere else
  });
  return _acLogoLoadPromise;
}
let _acCertData = null;

async function acOpenCertificate(refId) {
  const overlay = document.getElementById('academyCertModal');
  const canvas  = document.getElementById('acCertCanvas');
  if (!overlay || !canvas) return;

  overlay.classList.add('show');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#131b27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7a8fad';
  ctx.font = '14px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading your certificate…', canvas.width / 2, canvas.height / 2);

  const path = refId === 'graduation' ? '/academy/certificate/graduation' : `/academy/certificate/${encodeURIComponent(refId)}`;
  let data, logoImg;
  try {
    [data, logoImg] = await Promise.all([api(path), _acLoadLogo()]);
  } catch (e) {
    toast(e.message || "Couldn't load your certificate.", 'error');
    closeAcademyCertificate();
    return;
  }

  _acCertData = data;
  _acDrawCertificate(canvas, data, logoImg);
}

function closeAcademyCertificate() {
  const overlay = document.getElementById('academyCertModal');
  if (overlay) overlay.classList.remove('show');
}

function _acFormatCertDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Simple greedy word-wrap against the currently-set ctx.font.
function _acWrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Shrinks the accomplishment title (30px → down to 18px) until it fits
// within maxLines, so a long module title (e.g. "Charging Brands: The
// Kenya Pricing Playbook") always wraps cleanly instead of overflowing
// the card or overlapping the seal below it.
function _acFitTitle(ctx, text, maxWidth, maxLines) {
  let fontSize = 30;
  let lines = [text];
  while (fontSize >= 18) {
    ctx.font = `800 ${fontSize}px Montserrat, sans-serif`;
    lines = _acWrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }
  return { fontSize, lines };
}

// A short gold rule with a small rotated-square ornament at its center —
// used twice (below the brand mark, below the accomplishment line).
function _acDrawDivider(ctx, cx, y, halfWidth, gold) {
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - halfWidth, y); ctx.lineTo(cx - 9, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 9, y); ctx.lineTo(cx + halfWidth, y); ctx.stroke();
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gold;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

// Rounded-rect path — used for the frame and the promo banner.
function _acRoundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Letter-spaced (tracked) text, centered on cx — reads like an engraved
// certificate label instead of a plain UI string.
function _acFillTracked(ctx, text, cx, y, spacing) {
  const chars = Array.from(text);
  const widths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing; });
  ctx.textAlign = prevAlign;
}

// A small L-shaped gold corner accent, mirrored via sx/sy (±1).
function _acDrawCornerFlourish(ctx, x, y, sx, sy, gold) {
  const len = 30;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + sy * len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * len, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gold;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

// Two notched ribbon tails hanging behind the seal.
function _acDrawRibbonTails(ctx, cx, y, len, color) {
  const w = 20, gap = 9;
  ctx.fillStyle = color;
  [-1, 1].forEach(dir => {
    const x0 = cx + dir * gap;
    const x1 = cx + dir * (gap + w);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1, y + len);
    ctx.lineTo(x0 + dir * w / 2, y + len - 14);
    ctx.lineTo(x0, y + len);
    ctx.closePath();
    ctx.fill();
  });
}

function _acDrawCertificate(canvas, data, logoImg) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const gold = '#ffd700', green = '#3dd44a', white = '#f4f7ff', muted = '#8296b3';

  // ── Background — richer gradient with a soft glow, plus a faint oversized
  // logo watermark for brand texture even before anyone reads a word.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#161f2e');
  bg.addColorStop(0.55, '#0f1720');
  bg.addColorStop(1, '#0a0f14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, H * 0.9);
  glow.addColorStop(0, 'rgba(61,212,74,0.07)');
  glow.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    const wmW = 640, wmH = logoImg.height * (wmW / logoImg.width);
    ctx.drawImage(logoImg, W / 2 - wmW / 2, H / 2 - wmH / 2, wmW, wmH);
    ctx.restore();
  }

  // ── Rounded double-line frame + corner flourishes
  _acRoundedRectPath(ctx, 28, 28, W - 56, H - 56, 18);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  _acRoundedRectPath(ctx, 42, 42, W - 84, H - 84, 12);
  ctx.strokeStyle = 'rgba(255,215,0,.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  _acDrawCornerFlourish(ctx, 64, 64, 1, 1, gold);
  _acDrawCornerFlourish(ctx, W - 64, 64, -1, 1, gold);
  _acDrawCornerFlourish(ctx, 64, H - 64, 1, -1, gold);
  _acDrawCornerFlourish(ctx, W - 64, H - 64, -1, -1, gold);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // ── Brand mark — the real EndaViral logo, not a text wordmark ──────────
  let brandBottom;
  if (logoImg) {
    const logoW = 220;
    const logoH = logoImg.height * (logoW / logoImg.width);
    ctx.drawImage(logoImg, W / 2 - logoW / 2, 54, logoW, logoH);
    brandBottom = 54 + logoH;
  } else {
    // Falls back cleanly if the image ever fails to load (offline, missing
    // file, etc.) — keeps the certificate usable either way.
    ctx.fillStyle = green;
    ctx.font = '900 22px Montserrat, sans-serif';
    ctx.fillText('🚀 ENDAVIRAL', W / 2, 120);
    brandBottom = 128;
  }

  ctx.fillStyle = muted;
  ctx.font = '700 12px Montserrat, sans-serif';
  _acFillTracked(ctx, 'CREATOR ACADEMY', W / 2, brandBottom + 20, 4);

  _acDrawDivider(ctx, W / 2, brandBottom + 40, 90, gold);

  // Title — subtle gold glow for an engraved-foil feel
  ctx.save();
  ctx.shadowColor = 'rgba(255,215,0,.5)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = gold;
  ctx.font = '400 40px Georgia, serif';
  ctx.fillText('Certificate of Completion', W / 2, brandBottom + 88);
  ctx.restore();

  ctx.fillStyle = muted;
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillText('This certifies that', W / 2, brandBottom + 120);

  // Learner name
  ctx.fillStyle = white;
  ctx.font = '700 44px Georgia, serif';
  const learnerName = data.learner_name || 'Creator';
  ctx.fillText(learnerName, W / 2, brandBottom + 174);
  const nameWidth = Math.min(520, ctx.measureText(learnerName).width + 40);
  const underline = ctx.createLinearGradient(W / 2 - nameWidth / 2, 0, W / 2 + nameWidth / 2, 0);
  underline.addColorStop(0, 'rgba(255,215,0,0)');
  underline.addColorStop(0.5, gold);
  underline.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.strokeStyle = underline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameWidth / 2, brandBottom + 190);
  ctx.lineTo(W / 2 + nameWidth / 2, brandBottom + 190);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillText('has successfully completed', W / 2, brandBottom + 222);

  // Module / graduation title — auto-shrinks & wraps up to 2 lines so a
  // long module name never overflows the card or crowds the seal.
  const titleText = `${data.icon || '🎓'}  ${data.title || ''}`;
  const { fontSize: titleFontSize, lines: titleLines } = _acFitTitle(ctx, titleText, W - 260, 2);
  ctx.fillStyle = green;
  ctx.font = `800 ${titleFontSize}px Montserrat, sans-serif`;
  const titleLineHeight = titleFontSize * 1.2;
  const titleBlockTop = brandBottom + 257;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleBlockTop + i * titleLineHeight);
  });
  const titleBlockBottom = titleBlockTop + (titleLines.length - 1) * titleLineHeight;

  _acDrawDivider(ctx, W / 2, titleBlockBottom + 34, 90, gold);

  // Seal with hanging ribbon tails — soft glow + double ring, centered so it
  // never sits under the left/right-aligned footer text.
  const sealY = titleBlockBottom + 90;
  const sealRadius = 38;
  _acDrawRibbonTails(ctx, W / 2, sealY + sealRadius - 10, 44, '#d9b400');
  ctx.save();
  ctx.shadowColor = 'rgba(255,215,0,.45)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(W / 2, sealY, sealRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,.14)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(W / 2, sealY, sealRadius, 0, Math.PI * 2);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, sealY, sealRadius - 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,215,0,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.font = '30px sans-serif';
  ctx.fillText(data.kind === 'graduation' ? '🎓' : '🏅', W / 2, sealY + 10);

  // Issued date (left) + certificate number (right) — small and unobtrusive,
  // sitting just above the promo banner rather than competing with it.
  const footerLabelY = H - 150;
  const footerValueY = H - 132;

  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.font = '700 10px Montserrat, sans-serif';
  ctx.fillText('ISSUED', 96, footerLabelY);
  ctx.fillStyle = white;
  ctx.font = '700 15px Montserrat, sans-serif';
  ctx.fillText(_acFormatCertDate(data.issued_at), 96, footerValueY);

  ctx.textAlign = 'right';
  ctx.fillStyle = muted;
  ctx.font = '700 10px Montserrat, sans-serif';
  ctx.fillText('CERTIFICATE NO.', W - 96, footerLabelY);
  ctx.fillStyle = white;
  ctx.font = '700 15px Montserrat, sans-serif';
  ctx.fillText(data.certificate_number || '', W - 96, footerValueY);

  // ── Promotional banner — the part that actually sells EndaViral once this
  // is posted to Instagram/WhatsApp: bold, on-brand, unmissable even cropped
  // into a small thumbnail.
  const bannerX = 70, bannerW = W - 140, bannerY = H - 118, bannerH = 56;
  _acRoundedRectPath(ctx, bannerX, bannerY, bannerW, bannerH, 12);
  const bannerGrad = ctx.createLinearGradient(bannerX, 0, bannerX + bannerW, 0);
  bannerGrad.addColorStop(0, '#1f7a2e');
  bannerGrad.addColorStop(0.5, green);
  bannerGrad.addColorStop(1, '#1f7a2e');
  ctx.fillStyle = bannerGrad;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#08120a';
  ctx.font = '900 21px Montserrat, sans-serif';
  ctx.fillText('🚀  ENDAVIRAL.CO.KE', W / 2, bannerY + 25);
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillText('Fuel Your Growth  ·  Learn a skill, get paid for it', W / 2, bannerY + 44);
}

function _acCertFileName() {
  const slug = (_acCertData && (_acCertData.ref_id || _acCertData.kind)) || 'certificate';
  return `endaviral-academy-${slug}-certificate.png`;
}

function acDownloadCertificate() {
  const canvas = document.getElementById('acCertCanvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = _acCertFileName();
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function acShareCertificate() {
  const canvas = document.getElementById('acCertCanvas');
  if (!canvas || !_acCertData) return;

  canvas.toBlob(async (blob) => {
    if (!blob) { acDownloadCertificate(); return; }
    const file = new File([blob], _acCertFileName(), { type: 'image/png' });
    const shareText = `I just earned my "${_acCertData.title}" certificate from EndaViral Creator Academy! 🎓🚀 Learn a skill, get paid for it → endaviral.co.ke`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My EndaViral Academy Certificate', text: shareText });
        return;
      } catch (e) {
        // User cancelled the share sheet, or share failed — fall through to download.
      }
    }
    // No Web Share support (most desktop browsers) — download instead so the
    // person can still attach it manually wherever they want to post it.
    acDownloadCertificate();
    toast('Certificate downloaded — attach it anywhere you\'d like to share it!', 'success');
  }, 'image/png');
}