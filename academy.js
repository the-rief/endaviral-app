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
 * ════════════════════════════════════════════════════════════════════ */

// ─── Curriculum ──────────────────────────────────────────────────────────────
// Every lesson: { id, title, minutes, body:[ {type:'p'|'ul', text|items} ] }
const ACADEMY_XP_PER_LESSON  = 25;
const ACADEMY_XP_PER_MODULE  = 50;
// Display fallback only — the server (academy_curriculum.py) is the actual
// source of truth for price; /academy/progress returns the real price_kes
// per module and that's what purchase requests are billed at.
const ACADEMY_PREMIUM_PRICE_KES = 50;
// Display fallback for the business_pro module — real price still comes
// from the server the same way ACADEMY_PREMIUM_PRICE_KES does for money.
const ACADEMY_BUSINESS_PRO_PRICE_KES = 150;

const ACADEMY_LEVELS = [
  { min: 0,   name: 'New Creator',       icon: '🌱' },
  { min: 120, name: 'Rising Creator',    icon: '🌿' },
  { min: 320, name: 'Growth Pro',        icon: '🚀' },
  { min: 600, name: 'Growth Strategist', icon: '🔥' },
  { min: 900, name: 'Viral Master',      icon: '👑' },
];

const ACADEMY_MODULES = [
  {
    id: 'basics', icon: '🚀', title: 'Platform Mastery',
    blurb: 'How EndaViral actually works, end to end',
    lessons: [
      { id: 'b1', title: 'Your First Order, Step by Step', minutes: 4, body: [
        { type: 'p', text: "Every order follows the same simple path: pick a platform, choose a service, paste your link, set a quantity, then pay with M-Pesa. The moment payment confirms, your order status moves from Pending → Processing → Completed, and you can track it any time from My Orders." },
        { type: 'ul', items: [
          'Keep the target account or post set to Public — private content can\'t be delivered to and often can\'t be refunded.',
          "Double-check your link before paying. Wrong links are the #1 reason orders can't be refunded.",
          'Many services use drip-feed, spreading delivery over hours or days so growth looks natural instead of an instant spike.',
        ]},
      ]},
      { id: 'b2', title: 'Reading Service Names Like a Pro', minutes: 3, body: [
        { type: 'p', text: 'Service names carry real information: platform, action, quality tier and delivery speed. Learning to read them means you never overpay for the wrong thing.' },
        { type: 'ul', items: [
          '"Real Mix" or "High Quality" tiers use accounts with profile pictures and activity — better for pages that need to look credible to brands or new visitors.',
          '"No Refill" means if numbers drop naturally over time, that\'s not covered — "Refill" or "30-Day Refill" services top you back up automatically.',
          'Cheaper isn\'t always better. Rock-bottom pricing usually means lower-quality accounts that can drop fast — match the tier to what the order is actually for.',
        ]},
      ]},
      { id: 'b3', title: 'Payments, Minimums & Refunds', minutes: 3, body: [
        { type: 'p', text: 'Every payment on EndaViral goes through an M-Pesa STK push — you\'ll get a prompt on your phone, enter your PIN, and the order starts automatically once it confirms.' },
        { type: 'ul', items: [
          'There\'s a 10 KES minimum across deposits and orders — useful to know if you\'re testing a service for the first time.',
          'Refunds are considered for delivery problems (order stuck or short-delivered) — not for links that were pasted incorrectly, so always re-check that link.',
          'If something looks stuck for more than a few hours, don\'t re-order — open a ticket instead so support can trace the original order.',
        ]},
      ]},
      { id: 'b4', title: 'Getting Help Fast', minutes: 2, body: [
        { type: 'p', text: 'The chat widget answers most common questions instantly — order status, pricing, and how services work. For anything account-specific, a ticket gets you a real answer.' },
        { type: 'ul', items: [
          'Always include your order ID when opening a ticket — it\'s the fastest way for support to find your order.',
          'Screenshots of the exact link and quantity you used speed up any investigation.',
          'Check My Orders first — statuses update automatically and often answer the question before you need to ask.',
        ]},
      ]},
      { id: 'b5', title: 'Why Smart Creators Don\'t Wait for Organic Growth', minutes: 3, body: [
        { type: 'p', text: 'Building an audience from zero, purely organically, can take months of consistent posting before it feels worth the effort — that long, quiet stretch is exactly where most people give up.' },
        { type: 'ul', items: [
          'A page that already shows some followers, likes or views clears the biggest hurdle a brand-new profile faces: convincing a stranger to be the *first* person to follow it.',
          'Starting an order for even a modest amount removes the "0" from your profile at the exact moment new visitors are deciding whether you\'re worth following — first impressions happen before anyone reads a single caption.',
          'Most creators who use a small order early on treat it the same as any other startup cost — the KES spent is usually far less than what one missed brand deal or one lost sale is worth once the page looks established.',
        ]},
      ]},
    ],
  },
  {
    id: 'ig', icon: '📸', title: 'Instagram Growth Playbook',
    blurb: 'Turn the algorithm in your favor',
    lessons: [
      { id: 'ig1', title: 'How the Algorithm Actually Ranks You', minutes: 4, body: [
        { type: 'p', text: 'Instagram ranks content by early engagement velocity and watch-time — how much interaction a post gets in its first hour, and how long people watch Reels, matters far more than raw follower count.' },
        { type: 'ul', items: [
          'Saves and shares are weighted more heavily than likes — they tell Instagram the content is worth revisiting or sending to a friend.',
          'Consistency beats intensity — accounts that post regularly get more distribution than ones that post in bursts and go quiet.',
          'A follower count with no matching engagement is a red flag to both the algorithm and to brands.',
        ]},
      ]},
      { id: 'ig2', title: 'Stacking Services the Smart Way', minutes: 4, body: [
        { type: 'p', text: 'The order you buy services in matters. Engagement first, reach second is the pattern that mirrors organic growth and gets the best algorithmic response.' },
        { type: 'ul', items: [
          'Post first, then add likes and comments within the first hour — this boosts the early-engagement signal that decides how far a post travels.',
          'Add followers over the following days rather than all at once — a sudden jump in followers with flat engagement looks unnatural.',
          "Spread big orders using drip-feed instead of buying everything in one sitting — it protects your account and your budget.",
        ]},
      ]},
      { id: 'ig3', title: 'Reels & Posting Cadence', minutes: 3, body: [
        { type: 'p', text: 'Reels remain Instagram\'s biggest distribution engine. What you post — and when — has a direct effect on how far each one reaches.' },
        { type: 'ul', items: [
          'Hook viewers in the first 3 seconds — that\'s the window where most people decide to keep watching or scroll past.',
          'Posting 4–6 times a week keeps you visible without burning out your content ideas.',
          'Trending audio gives a small discovery boost, but only pair it with content that\'s actually relevant to your niche.',
        ]},
      ]},
      { id: 'ig4', title: 'Staying Under the Radar', minutes: 3, body: [
        { type: 'p', text: 'Growth only helps if the account stays healthy. A few habits keep your Instagram looking — and performing — like an organically growing page.' },
        { type: 'ul', items: [
          'Keep the account Public while orders are running so delivery isn\'t blocked.',
          'Avoid combining growth services with mass-follow/unfollow bots at the same time — that pattern is what actually triggers platform flags.',
          "Watch your engagement rate over time, not just the follower number — a healthy account keeps both moving together.",
        ]},
      ]},
      { id: 'ig5', title: 'The Case for Buying Instagram Growth', minutes: 3, body: [
        { type: 'p', text: 'Instagram decides how far a post travels almost entirely in its first hour — the amount of engagement it gets early on tells the algorithm whether to keep showing it to more people.' },
        { type: 'ul', items: [
          'A post with visible early likes and comments earns noticeably more organic reach in that window than an identical post with none — an early boost is timing engineering, not a shortcut around having good content.',
          'New accounts benefit the most: a profile with some engagement history gets more benefit of the doubt from both the algorithm and human visitors deciding whether to follow.',
          'Pairing a boosted post with the ranking behavior from Lesson 2.1 means you\'re feeding the algorithm the exact signal it already rewards, instead of hoping it notices you eventually.',
        ]},
      ]},
    ],
  },
  {
    id: 'tiktok', icon: '🎵', title: 'TikTok Growth Playbook',
    blurb: 'Crack the For You Page',
    lessons: [
      { id: 'tt1', title: 'Cracking the For You Page', minutes: 4, body: [
        { type: 'p', text: 'TikTok\'s FYP is driven almost entirely by completion rate and re-watches — how many people watch your video to the end, and how many watch it twice.' },
        { type: 'ul', items: [
          'The first 2 seconds decide whether someone scrolls away — open with the payoff, not the setup.',
          'Short, tight videos with a clear loop tend to get re-watched, which is one of the strongest FYP signals.',
          'A slow start on a video usually means a re-edit, not a bigger promotion — fix the hook before spending on growth.',
        ]},
      ]},
      { id: 'tt2', title: 'Views, Likes or Shares — What to Buy First', minutes: 3, body: [
        { type: 'p', text: 'Each metric plays a different role in how a video performs after you\'ve posted it.' },
        { type: 'ul', items: [
          'Views build early social proof and can help nudge the FYP push if the video is already gaining organic traction.',
          'Likes and comments boost credibility for people who land on the video from the FYP — they decide in seconds whether to keep watching.',
          'Shares carry the heaviest algorithmic weight of the three — pace these rather than buying them all at once.',
        ]},
      ]},
      { id: 'tt3', title: 'Trend-Jacking Without Losing Your Voice', minutes: 3, body: [
        { type: 'p', text: 'Trends are a distribution shortcut, not a content strategy — the accounts that grow fastest adapt trends to their own niche instead of copying them exactly.' },
        { type: 'ul', items: [
          'Post 1–3 times a day if you can sustain the quality — TikTok rewards frequency more than any other platform.',
          'Use TikTok\'s own search and captions to find rising sounds and formats before they peak.',
          'Keep a recognizable style (a phrase, a transition, a topic) so viewers remember you beyond one viral clip.',
        ]},
      ]},
      { id: 'tt4', title: 'Why Buy Views, Likes or Shares on TikTok', minutes: 3, body: [
        { type: 'p', text: 'A video\'s first few minutes online decide most of its fate — TikTok tests new content on a small slice of viewers first, then pushes it wider only if that early group reacts well.' },
        { type: 'ul', items: [
          'A quick order of views or likes right after posting gives that first test slice something to react to instead of a blank counter — it\'s the difference between an untested video and one that already looks worth watching.',
          'Shares carry the heaviest algorithmic weight of the three metrics — a small paced order can nudge a video past the threshold where TikTok starts distributing it more widely on its own.',
          'Buying growth on a video you\'re proud of costs far less than the hours spent reshooting and re-posting the same idea hoping the FYP notices it eventually.',
        ]},
      ]},
    ],
  },
  {
    id: 'yt', icon: '▶️', title: 'YouTube Growth Playbook',
    blurb: 'Subscribers, retention & safe monetization',
    lessons: [
      { id: 'yt1', title: 'Subscribers vs Views — Sequencing', minutes: 4, body: [
        { type: 'p', text: 'YouTube\'s search and suggested-video systems respond first to views and watch time, then use subscriber growth as a trust signal on top of that.' },
        { type: 'ul', items: [
          'Build views and watch time on a video first — this is what actually triggers YouTube to suggest it to more people.',
          'Add subscribers gradually afterward so growth on the channel matches growth on the content, rather than spiking on its own.',
          'A channel with subscribers but no view growth signals inactivity to YouTube\'s recommendation system.',
        ]},
      ]},
      { id: 'yt2', title: 'Thumbnails, Titles & Retention', minutes: 3, body: [
        { type: 'p', text: 'Click-through rate gets someone to open the video — retention decides whether YouTube keeps recommending it.' },
        { type: 'ul', items: [
          'A thumbnail that overpromises will hurt retention even if it wins the click — mismatch is worse for long-term growth than a lower CTR.',
          'The first 15 seconds should deliver on the title\'s promise — that\'s the window most viewers decide to stay or leave.',
          'Pattern-interrupts (a cut, a question, a visual change) every 30–60 seconds help hold attention through longer videos.',
        ]},
      ]},
      { id: 'yt3', title: 'Monetization-Safe Growth', minutes: 3, body: [
        { type: 'p', text: 'Growing a channel and keeping it monetization-eligible go hand in hand — a few guardrails keep both intact.' },
        { type: 'ul', items: [
          'Stay inside YouTube Partner Program guidelines for watch-hours and subscribers — there\'s no legitimate shortcut around the eligibility thresholds themselves.',
          'Favor real-engagement service tiers over anything promising instant guaranteed watch-hours — those patterns are exactly what triggers manual review.',
          'Understand what commonly triggers demonetization review (reused content, misleading titles, community guideline strikes) and audit your own uploads against it regularly.',
        ]},
      ]},
      { id: 'yt4', title: 'Why Seed Your Channel With Real Engagement', minutes: 3, body: [
        { type: 'p', text: 'A brand-new video competes for suggested-video slots against millions of others with a head start — seeding it with an early batch of views and watch time gives YouTube\'s system something to measure instead of nothing.' },
        { type: 'ul', items: [
          'Watch time is the single biggest input into whether YouTube suggests a video further — an order that adds real watch time gives the algorithm a stronger, earlier signal than waiting on organic views alone to accumulate.',
          'A channel that shows steady subscriber growth alongside its content looks active to both YouTube\'s systems and to sponsors evaluating it for a deal.',
          'The cost of seeding one video is small compared to the ad revenue, sponsorship value, or reach a video permanently loses by never clearing that first-hours hurdle.',
        ]},
      ]},
    ],
  },
  {
    id: 'other', icon: '👥', title: 'Facebook, X & Telegram',
    blurb: 'Grow beyond the big two',
    lessons: [
      { id: 'fb1', title: 'Facebook Page Growth Tactics', minutes: 3, body: [
        { type: 'p', text: 'Facebook rewards post engagement more than raw page likes now — a smaller, active page often outperforms a larger dormant one.' },
        { type: 'ul', items: [
          'Engagement (comments, shares) on individual posts does more for reach than growing the page-like count on its own.',
          'Relevant Kenyan Facebook groups are still one of the highest-engagement discovery channels available.',
          'Pairing a boosted post with existing engagement services amplifies both — Facebook\'s ad system responds to accounts that already show activity.',
        ]},
      ]},
      { id: 'x1', title: 'Growing on X (Twitter)', minutes: 3, body: [
        { type: 'p', text: "X's timeline moves fast, so consistency and replies matter more here than almost any other platform." },
        { type: 'ul', items: [
          'Replies and retweets carry more algorithmic weight than likes — engaging in your niche\'s conversations grows an account faster than posting alone.',
          'Threads that open with a strong first line get significantly more read-through than single tweets.',
          'Follower quality (people who actually engage) matters more here than count — vanity followers rarely convert to reach.',
        ]},
      ]},
      { id: 'tg1', title: 'Telegram Channel Growth', minutes: 3, body: [
        { type: 'p', text: 'Telegram works differently — it\'s less about discovery and more about converting an audience you already have into a closer community.' },
        { type: 'ul', items: [
          'Member count matters less than post view rate — a channel with high view-per-post is far more valuable to brands or for monetization than a large silent one.',
          "Cross-promote your Telegram channel from Instagram, TikTok or YouTube — it's rarely a discovery platform on its own.",
          'Use it as the "closer" step in a funnel — the place followers go to get exclusive content, deals or direct access to you.',
        ]},
      ]},
      { id: 'conv1', title: 'Why Small Accounts Buy Growth on Every Platform', minutes: 3, body: [
        { type: 'p', text: 'Facebook, X and Telegram all share the same cold-start problem as the bigger platforms — people trust a page, profile or channel more once it already looks like other people trust it too.' },
        { type: 'ul', items: [
          'A Facebook page with some page likes and post engagement clears local group and search discovery filters that a completely empty page doesn\'t.',
          'An X profile with a modest, believable follower count gets replies and quote-tweets read by more people than an identical account with a near-zero count.',
          'A Telegram channel that already shows an active member count converts new joiners faster, since nobody wants to be the only person in an empty room.',
        ]},
      ]},
    ],
  },
  {
    id: 'safety', icon: '🛡️', title: 'Staying Safe & Compliant',
    blurb: 'Grow without risking your account',
    lessons: [
      { id: 's1', title: 'Understanding Platform Risk', minutes: 3, body: [
        { type: 'p', text: "Every platform has terms of service around inauthentic activity. The safest approach isn't avoiding growth services — it's understanding what actually gets flagged." },
        { type: 'ul', items: [
          'Sudden, isolated spikes in one single metric (only followers, only likes) are what typically draw attention — not gradual, mixed growth.',
          'Bot-spam patterns (identical comments, obviously fake accounts) are the real risk, not engagement services with real or high-quality accounts.',
          'Reading a service description before buying tells you which risk category it falls into — this is exactly why Lesson 1.2 on service names matters.',
        ]},
      ]},
      { id: 's2', title: 'Gradual Delivery = Natural Growth', minutes: 3, body: [
        { type: 'p', text: 'Drip-feed delivery exists for a reason — it spreads an order over hours or days so the growth curve looks like something a real audience would produce.' },
        { type: 'ul', items: [
          'Large orders are safer split across several days than delivered instantly.',
          'Mixing services (some likes, some comments, some followers) mimics organic behavior better than growing one number alone.',
          'If a service offers instant, no-drip delivery for a large quantity, treat it as a higher-risk option and use it sparingly.',
        ]},
      ]},
      { id: 's3', title: 'Organic + Paid = The Winning Combo', minutes: 3, body: [
        { type: 'p', text: 'Paid growth works best as an amplifier for content you\'re already posting — not a replacement for a content strategy.' },
        { type: 'ul', items: [
          'The accounts that grow fastest post consistently and use services to boost specific posts, not to sit still and hope numbers rise on their own.',
          'Consistency in posting matters more long-term than any single order — algorithms reward accounts that show up regularly.',
          "Treat every order as supporting a specific piece of content, not the account in the abstract — it's easier to measure what's working that way.",
        ]},
      ]},
      { id: 's4', title: 'Buying Growth the Safe Way', minutes: 3, body: [
        { type: 'p', text: 'Everything in this module points to the same conclusion: buying growth isn\'t the risky part — buying it carelessly is. Done the way this Academy teaches, it\'s one of the lowest-risk ways to solve the cold-start problem.' },
        { type: 'ul', items: [
          'Stick to gradual, mixed orders (Lesson 6.2) on services with real or high-quality accounts (Lesson 1.2) and the risk profile barely differs from organic growth that happened to arrive quickly.',
          'Treat every order as amplifying a specific post rather than replacing a content plan (Lesson 6.3) — that\'s what keeps growth looking natural rather than suspicious.',
          'If you\'ve read this far, you already know more about doing this safely than most people who order growth services anywhere else — that knowledge is the actual edge.',
        ]},
      ]},
    ],
  },
  {
    id: 'business', icon: '🏢', title: 'Social Media for Business Owners',
    blurb: 'Turn followers into paying customers',
    lessons: [
      { id: 'biz1', title: 'Why Social Proof Sells for Local Businesses', minutes: 4, body: [
        { type: 'p', text: 'A customer scrolling past your page makes a trust decision in seconds — before reading a single review, they\'re already reading your follower count, your engagement, and how "alive" the page looks.' },
        { type: 'ul', items: [
          'A business page with visible activity (followers, likes, comments) reads as "established" to a first-time visitor — the same way a busy shop reads as trustworthy compared to an empty one.',
          'This isn\'t about faking success — it\'s about removing the hesitation a genuinely good business loses customers to simply because its page looks new or quiet.',
          'The businesses that treat their page\'s look as seriously as their storefront\'s look tend to convert page visitors into customers at a noticeably higher rate.',
        ]},
      ]},
      { id: 'biz2', title: 'The Cold-Start Problem: Getting Noticed With Zero Reviews', minutes: 4, body: [
        { type: 'p', text: 'Every business starts with the same problem: no reviews, no followers, no proof — and customers overwhelmingly prefer businesses that other customers have already trusted.' },
        { type: 'ul', items: [
          'A page that starts with some baseline engagement (likes, followers, page reviews) breaks the chicken-and-egg cycle where nobody wants to be your first customer.',
          'This matters most in the first weeks of a page\'s life — the same boost has far more relative impact on a brand-new page than on one that\'s already established.',
          'Many Kenyan SMEs treat a small kick-start order the same as any other launch cost — signage, a logo, a first batch of business cards — a one-time investment to look ready for customers on day one.',
        ]},
      ]},
      { id: 'biz3', title: 'A Content + Growth Calendar That Doesn\'t Cost a Fortune', minutes: 4, body: [
        { type: 'p', text: 'Consistent posting builds long-term trust, but it\'s slow on its own — pairing a simple weekly content plan with a small recurring boost on your best posts compounds much faster than either alone.' },
        { type: 'ul', items: [
          'Pick your 1–2 best-performing post types (a product photo, a customer testimonial, a behind-the-scenes clip) and boost those specifically, rather than spreading a budget thin across everything.',
          'A modest, regular order on your top posts each month is easier to plan around than one large order — and it keeps your page looking consistently active rather than spiking and going quiet.',
          'Track which boosted posts actually drove enquiries or sales (not just likes) so next month\'s budget goes toward what\'s proven to work for your business specifically.',
        ]},
      ]},
      { id: 'biz4', title: 'From Followers to Paying Customers: Closing the Loop', minutes: 4, body: [
        { type: 'p', text: 'Followers and engagement are only worth something if they turn into enquiries, bookings or sales — a page can look busy and still convert nobody if the last step is missing.' },
        { type: 'ul', items: [
          'A clear call-to-action (a WhatsApp link, a phone number, an order form) in your bio and in every boosted post is what actually turns page traffic into revenue.',
          'A page with credible social proof gets that call-to-action clicked far more often than an identical page with none — this is the whole reason the earlier lessons in this module matter.',
          'The Turn Growth Into Income module goes deeper on pricing, brand deals and building a repeatable revenue system once your page has the audience to support it — worth unlocking once you\'re past the cold-start stage.',
        ]},
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
      { id: 'm1', title: 'Brand Deals 101', minutes: 4, body: null },
      { id: 'm2', title: 'Refer & Earn — Your Second Income', minutes: 3, body: null },
      { id: 'm3', title: 'Selling Your Own Products or Services', minutes: 3, body: null },
    ],
  },
  {
    // PREMIUM — KES 150 one-time unlock via M-Pesa. Same gating pattern as
    // the money module above: teaser only here, full lesson body text lives
    // in app/services/academy_premium_content.py and is only ever served
    // after app/routers/academy.py confirms a SUCCESS purchase (or a points
    // redemption) for this (user, module) pair. Do NOT paste lesson body
    // text back into this file.
    id: 'business_pro', icon: '📊', title: 'The Business Scale-Up Playbook',
    blurb: 'Turn a growing page into a growing business',
    premium: true,
    priceKes: ACADEMY_BUSINESS_PRO_PRICE_KES,
    lessons: [
      { id: 'bp1', title: 'Budgeting for Growth: What to Spend and When', minutes: 4, body: null },
      { id: 'bp2', title: 'Patterns Behind Kenyan SMEs That Scaled With Paid Growth', minutes: 4, body: null },
      { id: 'bp3', title: 'Combining Paid Ads + Growth Services for Maximum ROI', minutes: 4, body: null },
      { id: 'bp4', title: 'Building a Repeatable Growth System You Can Run Monthly', minutes: 3, body: null },
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
// _acState so subsequent renders can read synchronously.
async function _acFetchState() {
  const data = await api('/academy/progress');
  _acState = _acServerToLocal(data);
  return _acState;
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
  let state = _acState;
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
    if (done === 0) desc.textContent = 'Learn how to grow on every platform — free lessons, XP & badges';
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

  _acRenderHome(sec, state);
  _acUpdateBadges();
}

function _acRenderHome(sec, state) {
  const total   = _acTotalLessons();
  const done    = _acCompletedCount(state);
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const level   = _acLevelFor(state.xp);
  const nextLvl = ACADEMY_LEVELS.find(l => l.min > state.xp);
  const xpToNext = nextLvl ? (nextLvl.min - state.xp) : 0;
  const streak  = state.streak.count || 0;

  sec.innerHTML = `
  <div class="sec-hd" style="flex-wrap:wrap;gap:12px;margin-bottom:20px;">
    <div>
      <div class="sec-title">🎓 CREATOR ACADEMY</div>
      <div class="sec-sub">Free lessons on growing every platform — learn a little, earn XP, level up</div>
    </div>
  </div>

  ${state.graduated ? `
  <div style="position:relative;overflow:hidden;background:linear-gradient(120deg,#1a1330 0%,#241a42 50%,#150f26 100%);border:1px solid rgba(255,215,0,.35);border-radius:16px;padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
    <div style="flex-shrink:0;width:46px;height:46px;border-radius:12px;background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.3);display:flex;align-items:center;justify-content:center;font-size:22px;">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);margin-bottom:3px;">Academy Graduate</div>
      <div style="font-size:12px;color:#8faab8;line-height:1.5;">You finished every module — claim your graduation certificate</div>
    </div>
    <button style="flex-shrink:0;background:#ffd700;color:#000;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:900;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;" onclick="acOpenCertificate('graduation')">Get Certificate →</button>
  </div>` : ''}

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px;">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:22px;margin-bottom:4px;">${level.icon}</div>
      <div style="font-size:13px;font-weight:800;color:var(--white);">${esc(level.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${state.xp} XP${nextLvl ? ` · ${xpToNext} to next level` : ' · Max level'}</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:22px;margin-bottom:4px;">🔥</div>
      <div style="font-size:13px;font-weight:800;color:var(--white);">${streak} day${streak === 1 ? '' : 's'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">Learning streak</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:22px;margin-bottom:4px;">📚</div>
      <div style="font-size:13px;font-weight:800;color:var(--white);">${done}/${total} lessons</div>
      <div style="margin-top:8px;height:6px;border-radius:6px;background:var(--navy);overflow:hidden;"><div style="height:100%;width:${pct}%;background:#9b6bff;"></div></div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:22px;margin-bottom:4px;">🏅</div>
      <div style="font-size:13px;font-weight:800;color:var(--white);">${state.moduleBadges.length}/${ACADEMY_MODULES.length} badges</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${state.graduated ? 'Academy Graduate 🎓' : 'Finish modules to earn badges'}</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:22px;margin-bottom:4px;">⭐</div>
      <div style="font-size:13px;font-weight:800;color:var(--white);">${(state.pointsBalance || 0).toLocaleString()} pts</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">Earned on every order · spend to unlock modules</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;">
    ${ACADEMY_MODULES.map(mod => {
      const mp = _acModuleProgress(state, mod);
      const mpct = Math.round((mp.done / mp.total) * 100);
      const badge = state.moduleBadges.includes(mod.id);
      const locked = mod.premium && !_acIsPurchased(state, mod.id);
      const meta = state.moduleMeta && state.moduleMeta[mod.id];
      const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;
      const ptsCost = meta && meta.points_cost;
      return `
      <div onclick="_acOpenModule('${mod.id}')" style="position:relative;background:var(--card);border:1px solid ${locked ? 'rgba(155,107,255,.35)' : 'var(--border)'};border-radius:16px;padding:18px;cursor:pointer;transition:border-color .2s;" onmouseover="this.style.borderColor='rgba(155,107,255,.4)'" onmouseout="this.style.borderColor='${locked ? 'rgba(155,107,255,.35)' : 'var(--border)'}'">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:26px;">${mod.icon}</div>
          ${badge ? '<span style="font-size:11px;">✅</span>' : ''}
          ${badge ? `<span onclick="event.stopPropagation();acOpenCertificate('${mod.id}')" style="margin-left:auto;font-size:10px;font-weight:800;background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.3);color:#ffd700;border-radius:20px;padding:2px 8px;cursor:pointer;">🎓 Certificate</span>` : ''}
          ${(!badge && locked) ? `<span style="margin-left:auto;font-size:10px;font-weight:800;background:rgba(155,107,255,.16);border:1px solid rgba(155,107,255,.3);color:#9b6bff;border-radius:20px;padding:2px 8px;">🔒 KSh ${price}${ptsCost ? ` · ⭐ ${ptsCost}pts` : ''}</span>` : ''}
        </div>
        <div style="font-size:14px;font-weight:800;color:var(--white);margin-bottom:3px;">${esc(mod.title)}</div>
        <div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:10px;">${esc(mod.blurb)}</div>
        ${locked ? `
        <div style="font-size:11px;color:#9b6bff;font-weight:700;">Unlock to view ${mp.total} lessons →</div>
        ` : `
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;">
          <span>${mp.done}/${mp.total} lessons</span><span>${mpct}%</span>
        </div>
        <div style="height:5px;border-radius:5px;background:var(--navy);overflow:hidden;"><div style="height:100%;width:${mpct}%;background:#9b6bff;"></div></div>
        `}
      </div>`;
    }).join('')}
  </div>`;
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
  const sec = document.getElementById('sec-academy');
  const state = _acState || _acEmptyState();
  const locked = mod.premium && !_acIsPurchased(state, mod.id);
  const meta = state.moduleMeta && state.moduleMeta[mod.id];
  const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;

  if (locked) {
    const ptsCost = (meta && meta.points_cost) || 0;
    const ptsBalance = state.pointsBalance || 0;
    const canAffordPoints = ptsCost > 0 && ptsBalance >= ptsCost;
    const ptsStillNeeded = Math.max(0, ptsCost - ptsBalance);

    sec.innerHTML = `
    <div class="sec-hd" style="margin-bottom:16px;">
      <div>
        <button class="btn-secondary" style="margin-bottom:10px;" onclick="initAcademyPage()">← All Modules</button>
        <div class="sec-title">${mod.icon} ${esc(mod.title)}</div>
        <div class="sec-sub">${esc(mod.blurb)}</div>
      </div>
    </div>
    <div style="max-width:520px;background:var(--card);border:1px solid rgba(155,107,255,.3);border-radius:16px;padding:28px 24px;text-align:center;">
      <div style="font-size:32px;margin-bottom:10px;">🔒</div>
      <div style="font-size:15px;font-weight:800;color:var(--white);margin-bottom:6px;">${mod.lessons.length} lessons locked</div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:20px;">
        ${mod.lessons.map(l => esc(l.title)).join(' · ')}
      </div>
      <button class="btn-primary" style="width:100%;" onclick="openAcademyPurchase('${mod.id}')">Unlock for KSh ${price} — Pay with M-Pesa</button>
      ${ptsCost ? `
      <div style="display:flex;align-items:center;gap:10px;margin:16px 0;">
        <div style="flex:1;height:1px;background:var(--border);"></div>
        <span style="font-size:10px;color:var(--muted);font-weight:700;">OR</span>
        <div style="flex:1;height:1px;background:var(--border);"></div>
      </div>
      <button class="btn-secondary" style="width:100%;${canAffordPoints ? '' : 'opacity:.55;cursor:not-allowed;'}" ${canAffordPoints ? `onclick="acRedeemWithPoints('${mod.id}')"` : 'disabled'}>
        ⭐ Unlock for ${ptsCost} loyalty points
      </button>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;">
        ${canAffordPoints
          ? `You have ${ptsBalance} points — this leaves you ${ptsBalance - ptsCost}.`
          : `You have ${ptsBalance} points · earn ${ptsStillNeeded} more from orders to unlock free.`}
      </div>` : ''}
      <div style="font-size:11px;color:var(--muted);margin-top:12px;">One-time unlock · Yours forever once paid or redeemed</div>
    </div>`;
    return;
  }

  // Premium + unlocked, but this session hasn't fetched the full lesson
  // text yet (body is still null from the public bundle) — fetch it now.
  // Free modules never hit this branch since their body ships in the bundle.
  if (mod.premium && mod.lessons.some(l => l.body === null)) {
    sec.innerHTML = `
    <div class="sec-hd" style="margin-bottom:16px;">
      <div>
        <button class="btn-secondary" style="margin-bottom:10px;" onclick="initAcademyPage()">← All Modules</button>
        <div class="sec-title">${mod.icon} ${esc(mod.title)}</div>
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

  sec.innerHTML = `
  <div class="sec-hd" style="margin-bottom:16px;">
    <div>
      <button class="btn-secondary" style="margin-bottom:10px;" onclick="initAcademyPage()">← All Modules</button>
      <div class="sec-title">${mod.icon} ${esc(mod.title)}</div>
      <div class="sec-sub">${esc(mod.blurb)}</div>
    </div>
  </div>
  ${badgeEarned ? `
  <div style="max-width:640px;background:linear-gradient(120deg,#1a1330 0%,#241a42 50%,#150f26 100%);border:1px solid rgba(255,215,0,.3);border-radius:14px;padding:16px 18px;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
    <div style="font-size:26px;">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);">Module complete — your certificate is ready</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">Download it or share it straight to your socials</div>
    </div>
    <button class="btn-primary" style="flex-shrink:0;background:#ffd700;color:#000;" onclick="acOpenCertificate('${mod.id}')">Get Certificate →</button>
  </div>` : ''}
  <div style="display:flex;flex-direction:column;gap:10px;max-width:640px;">
    ${mod.lessons.map((l, i) => {
      const complete = !!state.completed[mod.id + ':' + l.id];
      return `
      <div onclick="openAcademyLesson('${mod.id}','${l.id}')" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;">
        <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;
          background:${complete ? 'rgba(61,212,74,.15)' : 'var(--navy)'};color:${complete ? 'var(--green)' : 'var(--muted)'};border:1px solid ${complete ? 'rgba(61,212,74,.3)' : 'var(--border)'};">
          ${complete ? '✓' : (i + 1)}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:700;color:var(--white);">${esc(l.title)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${l.minutes} min read${complete ? ' · Completed' : ''}</div>
        </div>
        <div style="color:var(--muted);font-size:14px;">›</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── Rendering: lesson modal ────────────────────────────────────────────────
function openAcademyLesson(moduleId, lessonId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  const lesson = mod && mod.lessons.find(l => l.id === lessonId);
  if (!mod || !lesson) return;
  if (lesson.body === null) {
    // Premium lesson text hasn't been fetched into this module yet — route
    // back through _acOpenModule, which fetches/merges content (or shows
    // the paywall if it turns out not to be purchased after all).
    _acOpenModule(moduleId);
    return;
  }
  _acCurrent = { moduleId, lessonId };

  const state = _acState || _acEmptyState();
  const complete = !!state.completed[moduleId + ':' + lessonId];

  document.getElementById('acLessonEyebrow').textContent = mod.icon + ' ' + mod.title.toUpperCase();
  document.getElementById('acLessonTitle').textContent = lesson.title;
  document.getElementById('acLessonMeta').textContent = lesson.minutes + ' min read';
  document.getElementById('acLessonBody').innerHTML = lesson.body.map(block => {
    if (block.type === 'p') return `<p style="margin-bottom:12px;">${esc(block.text)}</p>`;
    if (block.type === 'ul') return `<ul style="margin:0 0 12px 18px;padding:0;">${block.items.map(it => `<li style="margin-bottom:7px;color:var(--muted);">${esc(it)}</li>`).join('')}</ul>`;
    return '';
  }).join('');

  const btn = document.getElementById('acLessonCompleteBtn');
  const xpEl = document.getElementById('acLessonXp');
  if (xpEl) xpEl.textContent = ACADEMY_XP_PER_LESSON;
  if (btn) {
    if (complete) { btn.textContent = '✓ Completed'; btn.disabled = true; btn.style.opacity = '.7'; }
    else { btn.innerHTML = `Mark Complete +<span id="acLessonXp">${ACADEMY_XP_PER_LESSON}</span> XP`; btn.disabled = false; btn.style.opacity = '1'; }
  }

  document.getElementById('academyLessonModal').classList.add('show');
}

function closeAcademyLesson() {
  document.getElementById('academyLessonModal').classList.remove('show');
}

async function acMarkCurrentComplete() {
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
  _acState = _acServerToLocal(data);

  if (data.completed_now) {
    if (data.graduated && !wasGraduated) {
      toast('🎓 Academy Graduate! You completed every lesson.', 'success');
    } else if (data.module_badge_earned) {
      toast(`🏅 Module badge earned: ${mod.title}! +${ACADEMY_XP_PER_MODULE} bonus XP`, 'success');
    } else if (data.leveled_up) {
      const newLevel = _acLevelFor(data.xp);
      toast(`${newLevel.icon} Leveled up! You're now a ${newLevel.name}`, 'success');
    } else {
      toast(`+${data.xp_gained || ACADEMY_XP_PER_LESSON} XP earned!`, 'success');
    }
  }

  closeAcademyLesson();
  _acOpenModule(moduleId);
  _acUpdateBadges();

  // Auto-advance: if there's a next lesson in this module, offer it immediately.
  const idx = mod.lessons.findIndex(l => l.id === lessonId);
  const next = mod.lessons[idx + 1];
  if (next) setTimeout(() => openAcademyLesson(moduleId, next.id), 550);
}
// ─── Rendering: premium module purchase (M-Pesa STK, same pattern as wallet deposit) ─
let _acPurchaseModuleId = null;
let _acPurchasePollTimer = null;

function openAcademyPurchase(moduleId) {
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!mod) return;
  _acPurchaseModuleId = moduleId;

  const state = _acState || _acEmptyState();
  const meta = state.moduleMeta && state.moduleMeta[moduleId];
  const price = (meta && meta.price_kes) || mod.priceKes || ACADEMY_PREMIUM_PRICE_KES;

  const titleEl = document.getElementById('acPurchaseModuleTitle');
  const priceEl = document.getElementById('acPurchasePrice');
  const phoneInput = document.getElementById('acPurchasePhone');
  const formEl = document.getElementById('acPurchaseForm');
  const statusEl = document.getElementById('acPurchaseStatus');
  const btn = document.getElementById('acPurchaseBtn');
  if (titleEl) titleEl.textContent = mod.icon + ' ' + mod.title;
  if (priceEl) priceEl.textContent = 'KSh ' + price;
  if (phoneInput) phoneInput.value = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) ? currentUser.phone : '';
  if (formEl) formEl.style.display = '';
  if (statusEl) statusEl.style.display = 'none';
  if (btn) { btn.disabled = false; btn.textContent = '📱 SEND STK PUSH'; }

  document.getElementById('academyPurchaseModal').classList.add('show');
}

function closeAcademyPurchase() {
  const overlay = document.getElementById('academyPurchaseModal');
  if (overlay) overlay.classList.remove('show');
  if (_acPurchasePollTimer) { clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null; }
}

async function submitAcademyPurchase() {
  const moduleId = _acPurchaseModuleId;
  if (!moduleId) return;
  const phoneInput = document.getElementById('acPurchasePhone');
  const phone = phoneInput ? phoneInput.value.trim() : '';
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }

  const btn = document.getElementById('acPurchaseBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  // Price is never sent from the client — the server looks up
  // module_price_kes(module_id) itself (see app/routers/academy.py).
  let data;
  try {
    data = await api(`/academy/modules/${encodeURIComponent(moduleId)}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  } catch (e) {
    toast(e.message || 'Could not start payment. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '📱 SEND STK PUSH'; }
    return;
  }

  if (data.already_purchased) {
    toast('You already own this module!', 'success');
    closeAcademyPurchase();
    await _acFetchState();
    _acUpdateBadges();
    _acOpenModule(moduleId);
    return;
  }

  const formEl = document.getElementById('acPurchaseForm');
  const statusEl = document.getElementById('acPurchaseStatus');
  if (formEl) formEl.style.display = 'none';
  if (statusEl) statusEl.style.display = '';
  const iconEl = document.getElementById('acPurchaseStatusIcon');
  const titleEl2 = document.getElementById('acPurchaseStatusTitle');
  const descEl = document.getElementById('acPurchaseStatusDesc');
  if (iconEl) iconEl.textContent = '📱';
  if (titleEl2) titleEl2.textContent = 'WAITING FOR PAYMENT';
  if (descEl) descEl.innerHTML = 'A prompt has been sent to your phone.<br>Enter your M-Pesa PIN to unlock this module.';

  _acPollPurchaseStatus(moduleId, data.checkout_request_id);
}

function _acPollPurchaseStatus(moduleId, checkoutRequestId) {
  let attempts = 0;
  const maxAttempts = 30; // ~90s at 3s interval — mirrors the wallet deposit poller
  if (_acPurchasePollTimer) clearInterval(_acPurchasePollTimer);

  _acPurchasePollTimer = setInterval(async () => {
    attempts++;
    let data;
    try {
      data = await api(`/academy/modules/${encodeURIComponent(moduleId)}/purchase-status/${encodeURIComponent(checkoutRequestId)}`);
    } catch (e) {
      return; // transient network blip — keep polling rather than aborting the flow
    }

    const iconEl = document.getElementById('acPurchaseStatusIcon');
    const titleEl = document.getElementById('acPurchaseStatusTitle');
    const descEl = document.getElementById('acPurchaseStatusDesc');

    if (data.status === 'success') {
      clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null;
      if (iconEl) iconEl.textContent = '✅';
      if (titleEl) titleEl.textContent = 'MODULE UNLOCKED';
      if (descEl) descEl.textContent = 'Payment confirmed — enjoy the lessons!';
      toast('🎉 Module unlocked!', 'success');
      setTimeout(async () => {
        closeAcademyPurchase();
        await _acFetchState();
        _acUpdateBadges();
        _acOpenModule(moduleId);
      }, 1200);
    } else if (data.status === 'failed' || data.status === 'cancelled') {
      clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null;
      if (iconEl) iconEl.textContent = '❌';
      if (titleEl) titleEl.textContent = data.status === 'cancelled' ? 'PAYMENT CANCELLED' : 'PAYMENT FAILED';
      if (descEl) descEl.textContent = 'You can try again.';
      setTimeout(() => { openAcademyPurchase(moduleId); }, 1800);
    } else if (attempts >= maxAttempts) {
      clearInterval(_acPurchasePollTimer); _acPurchasePollTimer = null;
      if (descEl) descEl.textContent = 'Still waiting — check your phone, or close this and try again.';
    }
  }, 3000);
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
    toast('You already own this module!', 'success');
  } else if (data.unlocked) {
    toast(`⭐ Unlocked with ${data.points_spent} points! ${data.points_remaining} left.`, 'success');
  }

  await _acFetchState();
  _acUpdateBadges();
  _acOpenModule(moduleId);
}

// ─── Rendering: certificates ────────────────────────────────────────────────
// Fetched data (title/icon/name/date/certificate_number) is drawn onto a
// <canvas>, which is what actually makes it a downloadable/shareable image —
// the certificate itself is never a server-rendered file, it's built client-
// side from server-issued data every time the modal opens. `refId` is either
// a module id or the literal string 'graduation'.
let _acCertData = null;

async function acOpenCertificate(refId) {
  const overlay = document.getElementById('academyCertModal');
  const canvas  = document.getElementById('acCertCanvas');
  if (!overlay || !canvas) return;

  overlay.classList.add('active');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#131b27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7a8fad';
  ctx.font = '14px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading your certificate…', canvas.width / 2, canvas.height / 2);

  const path = refId === 'graduation' ? '/academy/certificate/graduation' : `/academy/certificate/${encodeURIComponent(refId)}`;
  let data;
  try {
    data = await api(path);
  } catch (e) {
    toast(e.message || "Couldn't load your certificate.", 'error');
    closeAcademyCertificate();
    return;
  }

  _acCertData = data;
  _acDrawCertificate(canvas, data);
}

function closeAcademyCertificate() {
  const overlay = document.getElementById('academyCertModal');
  if (overlay) overlay.classList.remove('active');
}

function _acFormatCertDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function _acDrawCertificate(canvas, data) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const gold = '#ffd700', green = '#3dd44a', white = '#f0f4ff', muted = '#7a8fad';

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a2435');
  bg.addColorStop(1, '#0d1117');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Borders
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = 'rgba(255,215,0,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  ctx.textAlign = 'center';

  // Brand
  ctx.fillStyle = green;
  ctx.font = '900 22px Montserrat, sans-serif';
  ctx.fillText('🚀 ENDAVIRAL', W / 2, 120);
  ctx.fillStyle = muted;
  ctx.font = '700 13px Montserrat, sans-serif';
  ctx.fillText('C R E A T O R   A C A D E M Y', W / 2, 144);

  // Divider
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2 - 90, 168); ctx.lineTo(W / 2 + 90, 168); ctx.stroke();

  // Title
  ctx.fillStyle = gold;
  ctx.font = '400 40px Georgia, serif';
  ctx.fillText('Certificate of Completion', W / 2, 235);

  ctx.fillStyle = muted;
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('This certifies that', W / 2, 300);

  // Learner name
  ctx.fillStyle = white;
  ctx.font = '700 52px Georgia, serif';
  ctx.fillText(data.learner_name || 'Creator', W / 2, 375);
  const nameWidth = Math.min(500, ctx.measureText(data.learner_name || 'Creator').width + 40);
  ctx.strokeStyle = 'rgba(255,215,0,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - nameWidth / 2, 395); ctx.lineTo(W / 2 + nameWidth / 2, 395); ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('has successfully completed', W / 2, 440);

  // Module / graduation title
  ctx.fillStyle = green;
  ctx.font = '800 30px Montserrat, sans-serif';
  ctx.fillText(`${data.icon || '🎓'}  ${data.title || ''}`, W / 2, 490);

  // Divider
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2 - 90, 545); ctx.lineTo(W / 2 + 90, 545); ctx.stroke();

  // Seal
  ctx.beginPath();
  ctx.arc(W / 2, 630, 46, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,.12)';
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.font = '34px sans-serif';
  ctx.fillText(data.kind === 'graduation' ? '🎓' : '🏅', W / 2, 642);

  // Footer: issued date (left) + certificate number (right)
  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.fillText('ISSUED', 100, 700);
  ctx.fillStyle = white;
  ctx.font = '700 16px Montserrat, sans-serif';
  ctx.fillText(_acFormatCertDate(data.issued_at), 100, 722);

  ctx.textAlign = 'right';
  ctx.fillStyle = muted;
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.fillText('CERTIFICATE NO.', W - 100, 700);
  ctx.fillStyle = white;
  ctx.font = '700 16px Montserrat, sans-serif';
  ctx.fillText(data.certificate_number || '', W - 100, 722);

  // Footer tagline
  ctx.textAlign = 'center';
  ctx.fillStyle = muted;
  ctx.font = '11px Montserrat, sans-serif';
  ctx.fillText('endaviral.com  ·  Verify this certificate anytime with its certificate number', W / 2, 758);
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
    const shareText = `I just earned my "${_acCertData.title}" certificate from EndaViral Creator Academy! 🎓`;

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