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
    id: 'basics', icon: '🚀', title: 'Platform Mastery',
    blurb: 'How EndaViral actually works, end to end',
    lessons: [
      { id: 'b1', title: 'Your First Order, Step by Step', minutes: 4, body: [
        { type: 'p', text: "Every order follows the same simple path: pick a platform, choose a service, paste your link, set a quantity, then pay with M-Pesa. The moment payment confirms, your order status moves from Pending → Processing → Completed, and you can track it any time from My Orders." },
        { type: 'ul', items: [
          'Keep the target account or post set to Public — private content can\'t be delivered to and often can\'t be refunded.',
          "Double-check your link before paying. Wrong links are the #1 reason orders can't be refunded.",
          'Many services use drip-feed, spreading delivery over hours or days so growth looks natural instead of an instant spike — this mirrors exactly how the platforms\' own anti-spam systems expect real growth to look.',
        ]},
      ]},
      { id: 'b2', title: 'Reading Service Names Like a Pro', minutes: 3, body: [
        { type: 'p', text: 'Service names carry real information: platform, action, quality tier and delivery speed. Learning to read them means you never overpay for the wrong thing.' },
        { type: 'ul', items: [
          '"Real Mix" or "High Quality" tiers use accounts with profile pictures and activity — better for pages that need to look credible to brands or new visitors.',
          '"No Refill" means if numbers drop naturally over time, that\'s not covered — "Refill" or "30-Day Refill" services top you back up automatically.',
          'Cheaper isn\'t always better. Rock-bottom pricing usually means lower-quality accounts that can drop fast — match the tier to what the order is actually for.',
          'Speed matters too: "Instant Start" is good for time-sensitive posts, but a service with gradual delivery over 24–48 hours almost always protects account health better than one that dumps everything in minutes.',
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
        { type: 'p', text: 'Building an audience from zero, purely organically, can take months of consistent posting before it feels worth the effort — that long, quiet stretch is exactly where most people give up. Every platform\'s own recommendation systems make this worse, not better: a brand-new account has no watch-history, no engagement pattern and no "relationship signal" for the algorithm to work with, so it gets shown to almost nobody until it produces some.' },
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
      { id: 'ig1', title: 'How the Algorithm Actually Ranks You', minutes: 5, body: [
        { type: 'p', text: 'Instagram doesn\'t run one algorithm anymore — it runs separate AI ranking systems for Feed, Reels, Stories and Explore, and each one weighs signals differently. But in January 2025, Instagram head Adam Mosseri confirmed the three signals that matter most across every surface: watch time, likes-per-reach, and sends-per-reach (DM shares) — and by 2026 that third one has quietly become the most important of all.' },
        { type: 'ul', items: [
          'Sends per reach — how often people forward your post via DM — is now weighted so heavily that industry trackers estimate one DM share carries roughly the distribution value of 10–15 likes. Content built for a "send this to someone who…" moment outperforms content built purely to be liked.',
          'Saves are the second-strongest signal — they tell Instagram the content is worth returning to, which is why practical, reference-style posts (tips, lists, how-tos) consistently out-reach purely entertaining ones.',
          'Relationship strength (DMs, comments, profile visits, Story replies) increasingly decides your Feed ranking with existing followers — replying to every comment and DM isn\'t just good manners, it\'s a direct algorithmic lever.',
          'A follower count with no matching engagement is a red flag to both the algorithm and to brands evaluating you for a deal.',
        ]},
      ]},
      { id: 'ig2', title: 'Stacking Services the Smart Way', minutes: 4, body: [
        { type: 'p', text: 'The order you buy services in matters. Engagement first, reach second is the pattern that mirrors organic growth and gets the best algorithmic response — especially now that Instagram tests every Reel on a batch of non-followers before deciding whether to expand it further.' },
        { type: 'ul', items: [
          'Post first, then add likes and comments within the first hour — this is the exact "window one" testing period Instagram uses to decide whether a post deserves wider distribution.',
          'Add followers over the following days rather than all at once — a sudden jump in followers with flat engagement looks unnatural to both the algorithm and human visitors.',
          "Spread big orders using drip-feed instead of buying everything in one sitting — it protects your account and mirrors the gradual pattern real audience growth actually produces.",
        ]},
      ]},
      { id: 'ig3', title: 'Reels & Posting Cadence', minutes: 4, body: [
        { type: 'p', text: 'Reels remain Instagram\'s biggest discovery engine — most Reel views now come from people who don\'t follow you yet. What you post, and when, has a direct effect on how far each one travels.' },
        { type: 'ul', items: [
          'Hook viewers in the first 3 seconds — research on viewer behavior shows people decide within under 2 seconds whether to keep watching or scroll past, so the "setup" has to come after the payoff, not before it.',
          'Posting 4–6 times a week keeps you visible without burning out your content ideas, and gives the algorithm enough fresh data to keep refining who it shows you to.',
          'Shorter, tightly-looped Reels (7–15 seconds) tend to get rewatched more, and a rewatch counts as a much stronger engagement signal than a first-time view.',
          'Instagram now actively suppresses Reels carrying a visible watermark from another app — always export a clean version before posting, never repost directly from TikTok.',
        ]},
      ]},
      { id: 'ig4', title: 'Staying Under the Radar', minutes: 3, body: [
        { type: 'p', text: 'Growth only helps if the account stays healthy. A few habits keep your Instagram looking — and performing — like an organically growing page.' },
        { type: 'ul', items: [
          'Keep the account Public while orders are running so delivery isn\'t blocked.',
          'Avoid combining growth services with mass-follow/unfollow bots at the same time — Instagram\'s systems now actively detect coordinated engagement-pod patterns, and that behavior (not gradual, real-account engagement) is what actually triggers a flag.',
          "Watch your engagement rate over time, not just the follower number — a healthy account keeps both moving together.",
        ]},
      ]},
      { id: 'ig5', title: 'The Case for Buying Instagram Growth', minutes: 3, body: [
        { type: 'p', text: 'Instagram decides how far a post travels almost entirely in its first testing window — the amount of engagement it gets from that early sample audience tells the algorithm whether to keep showing it to more people.' },
        { type: 'ul', items: [
          'A post with visible early likes and comments earns noticeably more organic reach in that window than an identical post with none — an early boost is timing engineering, not a shortcut around having good content.',
          'New accounts benefit the most: a profile with some engagement history gets more benefit of the doubt from both the algorithm and human visitors deciding whether to follow.',
          'Pairing a boosted post with the ranking behavior from Lesson 2.1 means you\'re feeding the algorithm the exact signals it already rewards — sends, saves, watch time — instead of hoping it notices you eventually.',
        ]},
      ]},
      { id: 'ig6', title: 'Sends, "Your Algorithm" & What Actually Changed in 2026', minutes: 4, body: [
        { type: 'p', text: 'Two shifts reshaped Instagram distribution going into 2026, and most creators still haven\'t adjusted to either one. Understanding both is the difference between guessing and actually working with the algorithm.' },
        { type: 'ul', items: [
          'In December 2025, Instagram launched "Your Algorithm" — a feature letting every user directly edit which topics their Reels feed favors. By early 2026 it was live globally. Practically, this means your Reels now need to match a topic viewers have actively chosen, not just one Instagram predicted for them — a niche mismatch, even on a well-made Reel, means it simply won\'t surface for that person.',
          'Instagram is also now actively fingerprinting and demoting aggregator accounts — profiles that repost more than roughly 10 pieces of other people\'s content within 30 days lose recommendation eligibility almost entirely, while accounts posting original, platform-native content have seen meaningful reach increases from the same change.',
          'Mosseri\'s own year-end note flagged a shift toward "raw, real human content" over polished AI output through 2026 — content that visibly carries your own voice, face or perspective is now favored over anything that reads as fully AI-generated with no personal layer.',
          'This module gives you the ranking fundamentals. Instagram Reels Growth Engine (premium) goes deeper into the specific mechanics of the sends-per-reach signal, the first-3-seconds frame-by-frame breakdown that actually gets Reels past window one, and the account-level authority patterns that compound your reach month over month — the exact playbook behind accounts consistently breaking out of the algorithm\'s cold-start test pool.',
        ]},
      ]},
    ],
  },
  {
    id: 'tiktok', icon: '🎵', title: 'TikTok Growth Playbook',
    blurb: 'Crack the For You Page',
    lessons: [
      { id: 'tt1', title: 'Cracking the For You Page', minutes: 5, body: [
        { type: 'p', text: 'TikTok\'s FYP is driven above all by completion rate and rewatches. TikTok itself states plainly that a strong indicator of interest — like finishing a video from beginning to end — gets far more weight than a weak one like a passing like. By 2026, the bar for what counts as "viral-worthy" completion has climbed to roughly 70%, up from around 50% just a couple of years earlier.' },
        { type: 'ul', items: [
          'The first 2–3 seconds decide whether someone scrolls away — open with the payoff, not the setup. TikTok\'s own data shows most viewers decide within this window whether to keep watching.',
          'Short, tight videos with a clear loop tend to get rewatched, and each rewatch is scored almost like a fresh engagement — it\'s one of the strongest signals a video can send.',
          'A slow start on a video usually means a re-edit, not a bigger promotion — fix the hook before spending on growth, since no amount of purchased engagement fixes a video people are dropping off in the first two seconds.',
        ]},
      ]},
      { id: 'tt2', title: 'Views, Likes or Shares — What to Buy First', minutes: 4, body: [
        { type: 'p', text: 'Each metric plays a different role in how a video performs after you\'ve posted it, and TikTok weighs them very differently in 2026.' },
        { type: 'ul', items: [
          'Views build early social proof and can help nudge the FYP push if the video is already gaining organic traction in its test pool.',
          'Likes and comments boost credibility for people who land on the video from the FYP — they decide in seconds whether to keep watching. Comment *depth* matters more than count now: a genuine two-sentence comment outweighs a handful of emoji reactions.',
          'Shares — especially direct shares to DM — carry the heaviest algorithmic weight of the three, reportedly worth roughly 3x a like in distribution value. Pace these rather than buying them all at once.',
        ]},
      ]},
      { id: 'tt3', title: 'Trend-Jacking Without Losing Your Voice', minutes: 3, body: [
        { type: 'p', text: 'Trends are a distribution shortcut, not a content strategy — the accounts that grow fastest adapt trends to their own niche instead of copying them exactly.' },
        { type: 'ul', items: [
          'Post 3–5 times a week if you can sustain the quality — TikTok\'s own 2026 guidance favors steady, sustainable frequency over daily bursts that burn creators out and drop in quality.',
          'Use TikTok\'s own search and captions to find rising sounds and formats before they peak — TikTok now scans your spoken audio and on-screen text as "Search Value," matching your video to search queries, not just hashtags.',
          'Keep a recognizable style (a phrase, a transition, a topic) so viewers remember you beyond one viral clip.',
        ]},
      ]},
      { id: 'tt4', title: 'Why Buy Views, Likes or Shares on TikTok', minutes: 3, body: [
        { type: 'p', text: 'A video\'s first hour online decides most of its fate. TikTok shows every new upload to a small cold-start test pool — typically a few hundred viewers — before deciding whether to expand it to thousands, then tens of thousands, then the open FYP.' },
        { type: 'ul', items: [
          'A quick order of views or likes right after posting gives that first test pool something to react to instead of a blank counter — it\'s the difference between an untested video and one that already looks worth watching.',
          'Shares carry the heaviest algorithmic weight of the three metrics — a small paced order can nudge a video past the threshold where TikTok starts distributing it more widely on its own.',
          'Buying growth on a video you\'re proud of costs far less than the hours spent reshooting and re-posting the same idea hoping the FYP notices it eventually.',
        ]},
      ]},
      { id: 'tt5', title: 'The Cold-Start Test Pool: What Actually Happens in Your Video\'s First Hour', minutes: 4, body: [
        { type: 'p', text: 'Most creators think TikTok either "picks you" or it doesn\'t. In reality, every single upload goes through the same measurable pipeline — and knowing the actual mechanics changes how you use every tool in this module.' },
        { type: 'ul', items: [
          'TikTok\'s 2026 system shows a new video to a stratified test pool of roughly 200–500 viewers, drawn from a mix of your followers and category browsers — late 2025 changes mean your own followers now see it first, before strangers do.',
          'To graduate out of that first pool into a 5,000–10,000 viewer expansion round, a video typically needs completion rate above roughly 35% and at least one engagement signal — a share, save, or substantial comment — firing above about 1.5% of viewers. Fall short, and the video quietly stops circulating: the so-called "200-view jail."',
          'This is exactly why timing a small, paced boost in that first hour matters more on TikTok than almost anywhere else — you\'re not gaming a black box, you\'re helping a video clear a specific, known threshold before the test window closes.',
          'The Advanced TikTok Growth & Algorithm Playbook (premium) breaks down how to read your own analytics like TikTok\'s growth team does, how to engineer a video specifically for rewatches, how to batch a week of content in one sitting, and the full 2026 algorithm reset — including the shift toward follower-first testing and TikTok Shop\'s growing role in distribution. If cracking the test pool consistently (not just once) is the goal, that\'s where the real depth lives.',
        ]},
      ]},
    ],
  },
  {
    id: 'yt', icon: '▶️', title: 'YouTube Growth Playbook',
    blurb: 'Subscribers, retention & safe monetization',
    lessons: [
      { id: 'yt1', title: 'Subscribers vs Views — Sequencing', minutes: 5, body: [
        { type: 'p', text: 'YouTube tests every new upload on a small audience first — typically your subscribers plus a lookalike micro-audience of 10 to 100 viewers — before deciding whether to expand it over the following 7 to 14 days. What that test group does with the video matters more than anything you can control after the upload button.' },
        { type: 'ul', items: [
          'Build views and watch time on a video first — this is what actually triggers YouTube to widen its testing pool and suggest it to more people.',
          'Add subscribers gradually afterward so growth on the channel matches growth on the content, rather than spiking on its own.',
          'A channel with subscribers but no view growth signals inactivity to YouTube\'s recommendation system — subscriber count alone hasn\'t been a strong ranking signal for years.',
        ]},
      ]},
      { id: 'yt2', title: 'Thumbnails, Titles & Retention', minutes: 4, body: [
        { type: 'p', text: 'Click-through rate gets someone to open the video — but as of 2026, YouTube weighs what happens *after* the click, through viewer satisfaction, even more heavily than raw watch time.' },
        { type: 'ul', items: [
          'A thumbnail that overpromises will hurt retention even if it wins the click — mismatch is worse for long-term growth than a lower CTR, since disappointed viewers now show up directly in satisfaction survey data YouTube feeds into ranking.',
          'The first 30 seconds are now treated as a core ranking input on their own, not just a diagnostic stat — that opening window is the strongest early predictor of whether YouTube keeps recommending the video.',
          'Pattern-interrupts (a cut, a question, a visual change) every 30–60 seconds help hold attention through longer videos.',
        ]},
      ]},
      { id: 'yt3', title: 'Monetization-Safe Growth', minutes: 3, body: [
        { type: 'p', text: 'Growing a channel and keeping it monetization-eligible go hand in hand — a few guardrails keep both intact.' },
        { type: 'ul', items: [
          'Stay inside YouTube Partner Program guidelines for watch-hours and subscribers — there\'s no legitimate shortcut around the eligibility thresholds themselves.',
          'Favor real-engagement service tiers over anything promising instant guaranteed watch-hours — those patterns are exactly what triggers manual review.',
          'As of May 2026, YouTube enforces AI-content disclosure with automated detection — undisclosed, fully AI-generated photorealistic video now faces reduced distribution or removal, so label AI-assisted content honestly rather than risk the penalty.',
        ]},
      ]},
      { id: 'yt4', title: 'Why Seed Your Channel With Real Engagement', minutes: 3, body: [
        { type: 'p', text: 'A brand-new video competes for suggested-video slots against millions of others with a head start — seeding it with an early batch of views and watch time gives YouTube\'s system something to measure instead of nothing.' },
        { type: 'ul', items: [
          'Watch time is still one of the biggest inputs into whether YouTube suggests a video further — an order that adds real watch time gives the algorithm a stronger, earlier signal than waiting on organic views alone to accumulate.',
          'A channel that shows steady subscriber growth alongside its content looks active to both YouTube\'s systems and to sponsors evaluating it for a deal.',
          'The cost of seeding one video is small compared to the ad revenue, sponsorship value, or reach a video permanently loses by never clearing that first-days testing window.',
        ]},
      ]},
      { id: 'yt5', title: 'Satisfaction Over Watch Time: Why the Rules Changed in 2026', minutes: 4, body: [
        { type: 'p', text: 'For over a decade, "make it longer" was the safest YouTube advice there was — more minutes meant more watch time, and watch time was king. That era is over, and creators still optimizing for it are quietly losing ground to shorter, more satisfying videos.' },
        { type: 'ul', items: [
          'YouTube now feeds post-watch satisfaction surveys, replay rates and whether a viewer stays on the platform afterward directly into ranking — a video someone genuinely enjoyed for 4 minutes now consistently outranks one they merely tolerated for 8.',
          '"Session contribution" — whether your video keeps someone watching YouTube afterward, not just your own video — is the leading signal for long-form ranking in 2026. It\'s a big part of why playlists and multi-part series now consistently outperform one-off uploads.',
          'Shorts run on a completely separate ranking engine from long-form as of late 2025 — Shorts need roughly 65% retention under 30 seconds, or roughly 50% for 30–60 second Shorts, to get pushed to a wider audience. The old advice to keep every Short under 15 seconds now actively works against you, since ultra-short clips can\'t clear the watch-time-per-impression bar even at 100% completion — the 2026 sweet spot sits closer to 30–45 seconds.',
          'YouTube SEO Mastery (premium) goes deep on exactly this shift — the semantic search changes behind titles and descriptions, a full breakdown of the satisfaction signal, Shorts-specific SEO as its own ranking track, and the current monetization and AI-disclosure requirements you need to stay eligible under. If your upload strategy still assumes 2023\'s rules, that module is where you catch up fast.',
        ]},
      ]},
    ],
  },
  {
    id: 'other', icon: '👥', title: 'Facebook, X & Telegram',
    blurb: 'Grow beyond the big two',
    lessons: [
      { id: 'fb1', title: 'Facebook Page Growth Tactics', minutes: 4, body: [
        { type: 'p', text: 'Facebook rewards post engagement more than raw page likes now — a smaller, active page often outperforms a larger dormant one. This matters even more in Kenya since Meta activated native monetization here, making an "active-looking" page a direct revenue question, not just a vanity one.' },
        { type: 'ul', items: [
          'Engagement (comments, shares) on individual posts does more for reach than growing the page-like count on its own.',
          'Relevant Kenyan Facebook groups are still one of the highest-engagement discovery channels available.',
          'Pairing a boosted post with existing engagement services amplifies both — Facebook\'s ad and recommendation systems respond to accounts that already show activity.',
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
      { id: 'conv1', title: 'Why Small Accounts Buy Growth on Every Platform', minutes: 4, body: [
        { type: 'p', text: 'Facebook, X and Telegram all share the same cold-start problem as the bigger platforms — people trust a page, profile or channel more once it already looks like other people trust it too. On Facebook specifically, this now has a hard dollar value: Kenya\'s Content Monetization program requires a Page (not a personal profile) to show real, sustained activity before Meta will even review it for ads.' },
        { type: 'ul', items: [
          'A Facebook page with some page likes and post engagement clears local group and search discovery filters that a completely empty page doesn\'t.',
          'An X profile with a modest, believable follower count gets replies and quote-tweets read by more people than an identical account with a near-zero count.',
          'A Telegram channel that already shows an active member count converts new joiners faster, since nobody wants to be the only person in an empty room.',
          'The Facebook Monetization Blueprint (premium) walks through exactly which of Facebook\'s payout paths — in-stream ads, Reels bonuses, Stars, subscriptions — fits your page, and the real thresholds Meta checks (follower count, minutes-viewed-in-60-days, active video count) before it lets a Kenyan Page start earning.',
        ]},
      ]},
    ],
  },
  {
    id: 'safety', icon: '🛡️', title: 'Staying Safe & Compliant',
    blurb: 'Grow without risking your account',
    lessons: [
      { id: 's1', title: 'Understanding Platform Risk', minutes: 3, body: [
        { type: 'p', text: "Every platform has terms of service around inauthentic activity. The safest approach isn't avoiding growth services — it's understanding what actually gets flagged, and in 2026 the platforms are unusually specific and public about exactly what that is." },
        { type: 'ul', items: [
          'Sudden, isolated spikes in one single metric (only followers, only likes) are what typically draw attention — not gradual, mixed growth.',
          'Coordinated engagement-pod patterns (groups of accounts scripted to like/comment on each other on cue) are now actively detected by Instagram\'s and other platforms\' AI systems — that\'s the real risk category, not engagement services using real or high-quality accounts.',
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
        { type: 'p', text: 'Paid growth works best as an amplifier for content you\'re already posting — not a replacement for a content strategy. Every platform\'s 2026 algorithm update points the same direction: systems increasingly reward accounts with a real, consistent posting history over anything that looks like a one-off spike.' },
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
          'The Business Scale-Up Playbook (premium) goes much deeper here — a CAC/LTV budgeting framework built for Kenyan SME budgets, real patterns behind businesses that scaled with paid growth, how to combine paid ads with growth services for maximum ROI, and an honest breakdown of when an agency is worth paying for versus doing it yourself. Worth unlocking once you\'re past the cold-start stage and ready to treat this as a real revenue channel.',
        ]},
      ]},
    ],
  },
  {
    id: 'shorts', icon: '🎬', title: 'Shorts Strategy',
    blurb: 'One video, three feeds — the fundamentals',
    lessons: [
      { id: 'sh1', title: 'Why Short-Form Is the Cheapest Reach on the Internet', minutes: 3, body: [
        { type: 'p', text: 'YouTube Shorts, Instagram Reels and TikTok all actively push short vertical video to new viewers who\'ve never followed you — no other content format gets that much free distribution by default.' },
        { type: 'ul', items: [
          'A single well-hooked short video can reach far beyond your existing followers, unlike a static post which mostly reaches people already following you.',
          'Vertical, full-screen framing (9:16) is required to be eligible for each platform\'s short-form feed — landscape or square clips get far less push.',
          'Posting consistently in this format is one of the fastest ways to grow an audience from zero, faster than almost any other content type.',
        ]},
      ]},
      { id: 'sh2', title: 'The 3-Second Rule', minutes: 3, body: [
        { type: 'p', text: 'Every short-form platform decides a video\'s fate in its first few seconds — if a viewer swipes away before that window closes, the algorithm treats that as a signal to stop showing it.' },
        { type: 'ul', items: [
          'Start with the most interesting frame or line, not a slow build-up — save context for after you\'ve earned the viewer\'s attention.',
          'Avoid title cards, logos, or intros before the content starts — they\'re the single most common reason a short underperforms.',
          'Watch your own video with the sound off for the first 3 seconds — if it\'s not visually interesting without audio, it needs a stronger hook.',
        ]},
      ]},
      { id: 'sh3', title: 'One Idea, Filmed Once, Posted Everywhere', minutes: 4, body: [
        { type: 'p', text: 'A single short video idea can become three posts — one for Shorts, one for Reels, one for TikTok — without needing three separate filming sessions. But the three platforms don\'t actually reward the same length or pacing, which is the part most creators get wrong.' },
        { type: 'ul', items: [
          'Film in the vertical 9:16 safe zone from the start so the same clip works across all three without re-cropping.',
          'Export a clean, unwatermarked version each time — every platform now programmatically detects and suppresses a rival platform\'s watermark.',
          'The sweet spot differs by platform in 2026: TikTok now rewards completion rate up to roughly 70%, which favors tighter clips; YouTube Shorts favor 30–45 seconds since anything under ~15 seconds can\'t clear its watch-time bar; Instagram Reels reward 7–15 second loops that get rewatched. The Shorts, Reels & TikTok: One Playbook (premium) breaks down exactly how to re-cut one piece of footage into three length- and pacing-optimized versions without reshooting.',
        ]},
      ]},
    ],
  },
  {
    id: 'ai_content', icon: '🤖', title: 'AI Content Creation',
    blurb: 'Use AI to never run out of ideas again',
    lessons: [
      { id: 'ai1', title: 'AI as a Brainstorming Partner, Not a Ghostwriter', minutes: 3, body: [
        { type: 'p', text: 'AI tools are most useful for creators as an idea-generation engine — the fastest way to escape a blank page, not a replacement for your own voice. This isn\'t just a style preference anymore: platforms are now actively rewarding content that reads as genuinely human over anything that looks fully AI-generated.' },
        { type: 'ul', items: [
          'Ask for 10 content ideas around a specific topic rather than one — quantity first, then pick the strongest 2–3 to actually make.',
          'Give the AI context about your niche and audience before asking for ideas — generic prompts get generic, unusable suggestions back.',
          'Treat every AI output as a first draft to edit, not a finished product — Instagram\'s own leadership has publicly signaled a 2026 push toward "raw, real human content," and posting AI text unedited is usually easy for both audiences and algorithms to spot.',
        ]},
      ]},
      { id: 'ai2', title: 'Getting Better Prompts, Faster', minutes: 3, body: [
        { type: 'p', text: 'The difference between a useless AI response and a genuinely useful one usually comes down to how specific the prompt was.' },
        { type: 'ul', items: [
          'Include your platform, audience, and goal in every prompt (e.g. "TikTok, small business owners, drive page visits") instead of a vague request.',
          'Ask for multiple tones or angles on the same idea so you have real options to choose from, rather than accepting the first response.',
          'Save prompts that worked well — reusing a proven prompt structure saves far more time than starting fresh every session.',
        ]},
      ]},
      { id: 'ai3', title: 'Where AI Fits Into a Real Content Workflow', minutes: 3, body: [
        { type: 'p', text: 'AI tools are most valuable as one step in a workflow — idea generation, caption drafts, hashtag suggestions — not as the entire process.' },
        { type: 'ul', items: [
          'Use AI for the planning and writing stages, then keep filming, editing and posting decisions in your own hands — that\'s where your specific voice matters most, and where both YouTube\'s AI-disclosure rules and Instagram\'s authenticity push reward you for showing up as a real person.',
          'A short weekly session generating a batch of ideas and captions saves far more time than prompting fresh every time you sit down to post.',
          'AI Content Creation — Advanced Workflows (premium) goes deeper on building a full month of ideas in one sitting, scripting hooks that still sound like you, the current 2026 AI video toolkit broken down by what each tool actually does well, and how to stay compliant with each platform\'s disclosure rules while still moving fast.',
        ]},
      ]},
    ],
  },
  {
    id: 'capcut', icon: '✂️', title: 'CapCut Editing',
    blurb: 'Free, powerful, and built for short-form video',
    lessons: [
      { id: 'cc1', title: 'Setting Up Your First Edit', minutes: 3, body: [
        { type: 'p', text: 'CapCut is free, mobile-first, and purpose-built for the vertical short-form video every growth platform now favors — no prior editing experience needed to get a clean result.' },
        { type: 'ul', items: [
          'Start every project in the 9:16 vertical canvas size — it\'s the correct format for Shorts, Reels and TikTok alike.',
          'Trim dead space and silence from your raw footage first, before adding any effects — pacing matters more than polish, and pacing is what platforms\' completion-rate algorithms actually measure.',
          'Keep your first few edits simple (cuts + captions only) — added effects are easy to layer in once the basics feel natural.',
        ]},
      ]},
      { id: 'cc2', title: 'Auto-Captions in Under a Minute', minutes: 3, body: [
        { type: 'p', text: 'Captions noticeably increase watch time, since most viewers watch short-form video with the sound off — CapCut\'s auto-caption tool makes adding them nearly instant.' },
        { type: 'ul', items: [
          'Always proofread auto-generated captions before posting — even small typos undercut how polished a video feels.',
          'Keep caption text large and high-contrast so it\'s readable on a small phone screen while scrolling.',
          'Position captions in the middle third of the frame — top and bottom areas are often covered by platform UI elements, and on-screen text now also feeds directly into how TikTok and YouTube match your video to search queries.',
        ]},
      ]},
      { id: 'cc3', title: 'Your First Reusable Template', minutes: 3, body: [
        { type: 'p', text: 'Saving your caption style and basic structure as a reusable template is what makes editing fast enough to sustain regular posting.' },
        { type: 'ul', items: [
          'Save your preferred caption font, size, and color once you find a style you like, and reuse it across every future video.',
          'Keep a consistent intro/outro structure (even 1–2 seconds) so your videos start feeling recognizable as "yours."',
          'CapCut Editing Mastery (premium) goes deeper on pacing for retention, sound design (the most-skipped step in most edits), CapCut\'s built-in AI tools worth actually using, and a full 15-minute edit workflow from raw footage to posted video.',
        ]},
      ]},
    ],
  },
  {
    id: 'canva', icon: '🎨', title: 'Canva Design',
    blurb: 'Professional-looking graphics without a designer',
    lessons: [
      { id: 'cv1', title: 'Picking the Right Template', minutes: 3, body: [
        { type: 'p', text: 'Canva\'s templates give you a professional starting point instantly — the skill worth building isn\'t designing from scratch, it\'s picking and adapting the right template fast.' },
        { type: 'ul', items: [
          'Search templates by platform (Instagram Post, Reel Cover, Facebook Post) so the dimensions are already correct for where you\'re posting.',
          'Pick a template with a layout that matches your content type (a list, a quote, a photo showcase) rather than forcing your content into a mismatched design.',
          'Swap fonts and colors to match your own brand before publishing — an unedited template looks like everyone else\'s unedited template.',
        ]},
      ]},
      { id: 'cv2', title: 'Text, Contrast & Readability', minutes: 3, body: [
        { type: 'p', text: 'A design that looks great to you on a laptop can be unreadable on a small phone screen while someone scrolls — readability matters more than decoration.' },
        { type: 'ul', items: [
          'Use high-contrast text/background combinations (dark text on light, or light text on dark) rather than similar tones that blend together.',
          'Keep font sizes large enough to read at a glance — if you have to zoom in to read your own design, so will everyone else.',
          'Limit each design to one clear message — a design trying to say five things usually communicates none of them well.',
        ]},
      ]},
      { id: 'cv3', title: 'Building Your First Brand Kit', minutes: 3, body: [
        { type: 'p', text: 'Saving your colors and fonts as a Canva Brand Kit is the single fastest way to make every future design look consistent with the last.' },
        { type: 'ul', items: [
          'Pick 2–3 core colors and stick to them across every design — consistency reads as more professional than variety.',
          'Upload your logo once and reuse it in the same position across templates so it becomes a recognizable visual anchor.',
          'Canva Design for Creators — Advanced (premium) goes deeper on building a brand kit you\'ll actually keep using, templates engineered to convert rather than just look nice, and batch-designing a full week of posts in one sitting.',
        ]},
      ]},
    ],
  },
  {
    id: 'branding', icon: '👤', title: 'Personal Branding',
    blurb: 'Becoming known for something specific',
    lessons: [
      { id: 'pb1', title: 'Why "Known For Something" Beats "Known For Everything"', minutes: 3, body: [
        { type: 'p', text: 'Viewers remember creators who are clearly about one thing far more easily than ones who post a bit of everything — specificity is what makes a brand memorable, and it\'s now also what the algorithms reward. Instagram\'s "Your Algorithm" and TikTok\'s interest-graph both work by matching your content to a specific declared topic — a scattered account gives them nothing consistent to match against.' },
        { type: 'ul', items: [
          'Try to describe what you post in one short sentence — if it takes several sentences, your content is likely too scattered to build a clear brand or a clear algorithmic identity.',
          'A specific niche builds a smaller but far more loyal and engaged audience than a broad, unfocused one.',
          'You can always expand later — starting specific is easier to grow from than starting broad and trying to narrow down.',
        ]},
      ]},
      { id: 'pb2', title: 'Consistency: The Unglamorous Growth Lever', minutes: 3, body: [
        { type: 'p', text: 'The same profile photo, bio and posting style across every platform makes you instantly recognizable — inconsistency is one of the most common (and fixable) reasons a personal brand doesn\'t stick.' },
        { type: 'ul', items: [
          'Use the same profile photo and bio wording everywhere so someone finding you on a second platform immediately recognizes you.',
          'Post on a predictable rhythm — audiences build a habit of checking in on creators who show up consistently.',
          'A recognizable visual or verbal habit (a phrase, a color, an intro) helps people remember you beyond a single post.',
        ]},
      ]},
      { id: 'pb3', title: 'Making Your Profile Do the Selling For You', minutes: 3, body: [
        { type: 'p', text: 'Most new visitors decide whether to follow within seconds of landing on your profile — that first impression matters as much as any individual post, and it\'s directly tied to the "profile click" signal several platforms now weigh in their ranking.' },
        { type: 'ul', items: [
          'Make sure your bio clearly states what you do and who it\'s for — a vague bio wastes the attention you\'ve already earned.',
          'Pin your best 1–3 posts to the top of your profile — they\'re what most new visitors see first.',
          'Personal Branding Blueprint (premium) goes deeper on positioning your brand for real opportunities — brand deals, partnerships and audience trust — and turning "known for something" into "paid for something."',
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
    id: 'business_pro', icon: '📊', title: 'The Business Scale-Up Playbook',
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
    id: 'tiktok_pro', icon: '🎵', title: 'Advanced TikTok Growth & Algorithm Playbook',
    blurb: 'Beyond the basics — engineered virality',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'ttp1', title: 'Reading Your Analytics Like a Growth Team', minutes: 5, body: null },
      { id: 'ttp2', title: 'Engineering a Video for Completion and Re-Watches', minutes: 5, body: null },
      { id: 'ttp3', title: 'Batching a Week of Content in One Sitting', minutes: 4, body: null },
      { id: 'ttp4', title: 'The 2026 Algorithm Reset: Follower-First Testing & Search', minutes: 6, body: null },
      { id: 'ttp5', title: 'Longer Videos, TikTok Shop & Where Distribution Is Heading', minutes: 5, body: null },
    ],
  },
  {
    id: 'fb_monetize', icon: '👥', title: 'Facebook Monetization Blueprint',
    blurb: 'Turn a Facebook page into real income',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'fbm1', title: 'Which Monetization Path Fits Your Page', minutes: 5, body: null },
      { id: 'fbm2', title: 'Hitting Eligibility Thresholds Faster', minutes: 5, body: null },
      { id: 'fbm3', title: 'What Kenyan Creators Actually Earn', minutes: 5, body: null },
      { id: 'fbm4', title: 'Staying Eligible: The Compliance Traps That Cost Creators', minutes: 4, body: null },
      { id: 'fbm5', title: 'Diversifying Beyond Ad Revenue', minutes: 4, body: null },
    ],
  },
  {
    id: 'yt_seo', icon: '🔍', title: 'YouTube SEO Mastery',
    blurb: 'Get found, not just watched',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'yts1', title: 'Titles & Thumbnails That Win the Click', minutes: 5, body: null },
      { id: 'yts2', title: 'Tags, Descriptions & Semantic Search', minutes: 5, body: null },
      { id: 'yts3', title: 'Satisfaction Over Watch Time: The 2026 Shift', minutes: 6, body: null },
      { id: 'yts4', title: 'Shorts SEO: A Separate Ranking Track', minutes: 5, body: null },
      { id: 'yts5', title: 'Monetization Requirements & the AI Disclosure Rule', minutes: 5, body: null },
    ],
  },
  {
    id: 'shorts_pro', icon: '🎬', title: 'Shorts, Reels & TikTok: One Playbook',
    blurb: 'One short-form video, three platforms, three algorithms',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'shp1', title: 'One Video, Three Platforms — What Actually Changes', minutes: 5, body: null },
      { id: 'shp2', title: 'Repurposing Without It Looking Repurposed', minutes: 5, body: null },
      { id: 'shp3', title: 'A Weekly System Across All Three', minutes: 4, body: null },
      { id: 'shp4', title: 'Length: Why the Same Clip Needs Different Cuts', minutes: 5, body: null },
      { id: 'shp5', title: 'Choosing Where to Double Down', minutes: 4, body: null },
    ],
  },
  {
    id: 'ig_reels_pro', icon: '📸', title: 'Instagram Reels Growth Engine',
    blurb: 'The specific mechanics behind Reels reach',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'igrp1', title: 'The First 3 Seconds, Frame by Frame', minutes: 5, body: null },
      { id: 'igrp2', title: 'Sends Per Reach: The Signal That Matters Most in 2026', minutes: 6, body: null },
      { id: 'igrp3', title: '"Your Algorithm": Niche Consistency Is No Longer Optional', minutes: 5, body: null },
      { id: 'igrp4', title: 'Account-Level Authority: Why Consistency Compounds', minutes: 5, body: null },
      { id: 'igrp5', title: 'Cadence, Cover Images & Profile Conversion', minutes: 4, body: null },
    ],
  },
  {
    id: 'ai_content_pro', icon: '🤖', title: 'AI Content Creation — Advanced Workflows',
    blurb: 'From single prompts to a repeatable content pipeline',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'aip1', title: 'Building a Month of Ideas in One Session', minutes: 5, body: null },
      { id: 'aip2', title: 'Scripting Hooks & Captions That Sound Like You', minutes: 5, body: null },
      { id: 'aip3', title: 'The 2026 AI Video Toolkit: What Each Tool Is Actually For', minutes: 6, body: null },
      { id: 'aip4', title: 'Disclosure & Authenticity: Staying on the Right Side of Platform Rules', minutes: 5, body: null },
      { id: 'aip5', title: 'A Repeatable Weekly AI Workflow', minutes: 4, body: null },
    ],
  },
  {
    id: 'capcut_pro', icon: '✂️', title: 'CapCut Editing Mastery',
    blurb: 'Editing techniques that keep people watching',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'ccp1', title: 'Pacing: Cutting for Retention, Not Just Movement', minutes: 5, body: null },
      { id: 'ccp2', title: 'Captions, Keyframes & Presets That Save Hours Every Week', minutes: 5, body: null },
      { id: 'ccp3', title: 'Sound Design: The Most Skipped Step That Signals "Professional"', minutes: 4, body: null },
      { id: 'ccp4', title: "CapCut's AI Tools: What's Actually Worth Using", minutes: 5, body: null },
      { id: 'ccp5', title: 'A 15-Minute Edit Workflow, Start to Finish', minutes: 4, body: null },
    ],
  },
  {
    id: 'canva_pro', icon: '🎨', title: 'Canva Design for Creators — Advanced',
    blurb: 'Design that looks consistent, not thrown together',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'cvp1', title: 'Brand Kit: The One Setup Step That Multiplies Every Design After It', minutes: 5, body: null },
      { id: 'cvp2', title: 'Magic Studio in 2026: The Five Tools Worth Learning (and 35 to Skip)', minutes: 6, body: null },
      { id: 'cvp3', title: 'Batch-Designing a Week of Posts With Bulk Create', minutes: 4, body: null },
    ],
  },
  {
    id: 'affiliate_pro', icon: '💵', title: 'Affiliate Marketing Playbook',
    blurb: 'Beyond the referral link — a real income channel',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'afp1', title: 'The Kenyan Affiliate Landscape: Real Programs, Real Numbers', minutes: 6, body: null },
      { id: 'afp2', title: 'The Math: EPC, CPE and Knowing What a Program Is Actually Worth You', minutes: 5, body: null },
      { id: 'afp3', title: 'Placement & Disclosure: Where Links Convert and Staying Compliant', minutes: 5, body: null },
    ],
  },
  {
    id: 'branding_pro', icon: '👤', title: 'Personal Branding Blueprint',
    blurb: 'Being known for something specific, on purpose',
    premium: true, priceKes: ACADEMY_PREMIUM_PRICE_KES,
    lessons: [
      { id: 'pbp1', title: 'Defining the One Thing You\'re Known For', minutes: 5, body: null },
      { id: 'pbp2', title: 'Visual & Voice Consistency: The Trust Multiplier', minutes: 5, body: null },
      { id: 'pbp3', title: 'Turning a Personal Brand Into Opportunities', minutes: 4, body: null },
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
    id: 'brand_pricing_pro', icon: '💼', title: 'Charging Brands: The Kenya Pricing Playbook',
    blurb: 'Know your worth, quote it with confidence, and get it in writing',
    premium: true, priceKes: ACADEMY_BRAND_PRICING_PRO_PRICE_KES,
    lessons: [
      { id: 'cbp1', title: 'Know Your Worth: The Numbers Brands Actually Pay For', minutes: 7, body: null },
      { id: 'cbp2', title: 'Building Your Rate Card & Media Kit', minutes: 6, body: null },
      { id: 'cbp3', title: 'The Negotiation Playbook: Getting Paid What You\'re Worth', minutes: 6, body: null },
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

    .ac-group-hd{display:flex;align-items:center;gap:9px;margin:4px 0 12px;}
    .ac-group-hd .t{font-size:12px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--white);}
    .ac-group-hd .n{background:var(--navy);border:1px solid var(--border);border-radius:20px;padding:1px 9px;font-size:10.5px;color:var(--muted);font-weight:700;}
    .ac-group-hd .line{flex:1;height:1px;background:var(--border);}

    .ac-modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:14px;margin-bottom:28px;}
    .ac-modcard{position:relative;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
    .ac-modcard:hover{transform:translateY(-3px);box-shadow:0 14px 28px rgba(0,0,0,.38);border-color:rgba(155,107,255,.55);}
    .ac-modcard.locked{border-color:rgba(255,215,0,.3);}
    .ac-modcard.locked:hover{border-color:rgba(255,215,0,.65);}
    .ac-modcard.done{border-color:rgba(61,212,74,.3);}
    .ac-modcard.done:hover{border-color:rgba(61,212,74,.65);}
    .ac-mod-top{display:flex;align-items:center;gap:10px;margin-bottom:11px;}
    .ac-mod-icon{flex-shrink:0;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;background:var(--ac-cbg);border:1px solid var(--ac-cbd);}
    .ac-mod-pill{margin-left:auto;flex-shrink:0;font-size:10px;font-weight:800;border-radius:20px;padding:3px 9px;white-space:nowrap;}
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
      ${badge ? `<span onclick="event.stopPropagation();acOpenCertificate('${mod.id}')" class="ac-mod-pill" style="background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.3);color:#ffd700;cursor:pointer;">🎓 Certificate</span>` : ''}
      ${(!badge && locked) ? `<span class="ac-mod-pill" style="background:rgba(255,215,0,.14);border:1px solid rgba(255,215,0,.32);color:#ffd700;">🔒 KSh ${price}${ptsCost ? ` · ⭐ ${ptsCost}pts` : ''}</span>` : ''}
      ${(!badge && !locked && kind === 'done') ? `<span class="ac-mod-pill" style="background:rgba(61,212,74,.14);border:1px solid rgba(61,212,74,.3);color:var(--green);">✓ Done</span>` : ''}
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
  const total   = _acTotalLessons();
  const done    = _acCompletedCount(state);
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const level   = _acLevelFor(state.xp);
  const nextLvl = ACADEMY_LEVELS.find(l => l.min > state.xp);
  const xpToNext = nextLvl ? (nextLvl.min - state.xp) : 0;
  const streak  = state.streak.count || 0;

  const freeMods   = ACADEMY_MODULES.filter(m => !(m.premium && !_acIsPurchased(state, m.id)));
  const lockedMods = ACADEMY_MODULES.filter(m => m.premium && !_acIsPurchased(state, m.id));

  sec.innerHTML = `
  <div class="ac-hero">
    <div class="ac-hero-corner tl"></div><div class="ac-hero-corner tr"></div>
    <div class="ac-hero-corner bl"></div><div class="ac-hero-corner br"></div>
    <div class="ac-hero-main">
      <div class="ac-hero-crest">🎓</div>
      <div class="ac-hero-copy">
        <div class="ac-hero-kicker">CREATOR ACADEMY</div>
        <div class="ac-hero-title">Learn a little, earn XP, level up</div>
        <div class="ac-hero-sub">Free lessons on growing every platform, plus deep-dive premium modules</div>
      </div>
      <div class="ac-hero-level">
        <div class="ac-hero-level-top"><span>${level.icon}</span><span>${esc(level.name)}</span></div>
        <div class="ac-hero-level-xp">${state.xp} XP${nextLvl ? ` <span class="ac-hero-level-next">· ${xpToNext} to next level</span>` : ' · Max level'}</div>
      </div>
    </div>
    <div class="ac-hero-progress">
      <div class="ac-hero-progress-track"><div class="ac-hero-progress-fill" style="width:${pct}%"></div></div>
      <div class="ac-hero-progress-label"><span>${done}/${total} lessons complete</span><span>${pct}% through the Academy</span></div>
    </div>
  </div>

  ${state.graduated ? `
  <div class="ac-grad-banner">
    <div class="ac-grad-icon">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);margin-bottom:3px;">Academy Graduate</div>
      <div style="font-size:12px;color:#a9b8cc;line-height:1.5;">You finished every module — claim your graduation certificate</div>
    </div>
    <button class="ac-grad-btn" onclick="acOpenCertificate('graduation')">Get Certificate →</button>
  </div>` : ''}

  <div class="ac-stats">
    <div class="ac-stat" style="${_acModAccent('active')}">
      <div class="ac-stat-icon">🔥</div>
      <div class="ac-stat-val">${streak} day${streak === 1 ? '' : 's'}</div>
      <div class="ac-stat-sub">Learning streak</div>
    </div>
    <div class="ac-stat" style="${_acModAccent('locked')}">
      <div class="ac-stat-icon">🏅</div>
      <div class="ac-stat-val">${state.moduleBadges.length}/${ACADEMY_MODULES.length} badges</div>
      <div class="ac-stat-sub">${state.graduated ? 'Academy Graduate 🎓' : 'Finish modules to earn badges'}</div>
    </div>
    <div class="ac-stat" style="${_acModAccent('done')}">
      <div class="ac-stat-icon">⭐</div>
      <div class="ac-stat-val">${(state.pointsBalance || 0).toLocaleString()} pts</div>
      <div class="ac-stat-sub">Earned on every order · spend to unlock modules</div>
    </div>
  </div>

  <div class="ac-group-hd"><span class="t">📘 Learning Path</span><span class="n">${freeMods.length} modules</span><span class="line"></span></div>
  <div class="ac-modgrid">
    ${freeMods.map(mod => _acRenderModCard(mod, state)).join('')}
  </div>

  ${lockedMods.length ? `
  <div class="ac-group-hd"><span class="t">🔒 Premium Modules</span><span class="n">${lockedMods.length} to unlock</span><span class="line"></span></div>
  <div class="ac-modgrid">
    ${lockedMods.map(mod => _acRenderModCard(mod, state)).join('')}
  </div>` : ''}`;
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
  _acInjectHomeStyles();
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
        <button class="btn-secondary" style="margin-bottom:14px;" onclick="initAcademyPage()">← All Modules</button>
        <div class="ac-modhead">
          <div class="ac-modhead-icon" style="${_acModAccent('locked')}">${mod.icon}</div>
          <div>
            <div class="ac-modhead-title">${esc(mod.title)}</div>
            <div class="ac-modhead-sub">${esc(mod.blurb)}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ac-lockcard">
      <div class="cr tl"></div><div class="cr tr"></div><div class="cr bl"></div><div class="cr br"></div>
      <div class="ac-lockcard-icon">🔒</div>
      <div style="font-size:15px;font-weight:800;color:var(--white);margin-bottom:6px;">${mod.lessons.length} lessons locked</div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:22px;">
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
  ${badgeEarned ? `
  <div class="ac-grad-banner" style="max-width:640px;">
    <div class="ac-grad-icon">🎓</div>
    <div style="flex:1;min-width:180px;">
      <div style="font-size:13px;font-weight:900;color:var(--white);">Module complete — your certificate is ready</div>
      <div style="font-size:11.5px;color:#a9b8cc;margin-top:2px;">Download it or share it straight to your socials</div>
    </div>
    <button class="ac-grad-btn" onclick="acOpenCertificate('${mod.id}')">Get Certificate →</button>
  </div>` : ''}
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
    // ── Richer block types (premium lessons) ──────────────────────────
    if (block.type === 'h3') return `<h3 style="margin:22px 0 10px;font-size:14.5px;font-weight:800;color:var(--white);letter-spacing:.2px;">${esc(block.text)}</h3>`;
    if (block.type === 'ol') return `<ol style="margin:0 0 12px 18px;padding:0;">${block.items.map(it => `<li style="margin-bottom:7px;color:var(--muted);">${esc(it)}</li>`).join('')}</ol>`;
    if (block.type === 'callout') return `<div style="margin:0 0 14px;padding:12px 14px;border-radius:10px;background:var(--card);border-left:3px solid var(--green);">${block.label ? `<div style="font-size:11px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${esc(block.label)}</div>` : ''}<div style="color:var(--white);font-size:13.5px;line-height:1.5;">${esc(block.text)}</div></div>`;
    if (block.type === 'table') {
      const head = (block.headers || []).map(h => `<th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);border-bottom:1px solid var(--border);">${esc(h)}</th>`).join('');
      const rows = (block.rows || []).map(r => `<tr>${r.map(c => `<td style="padding:8px 10px;font-size:13px;color:var(--white);border-bottom:1px solid var(--border);">${esc(c)}</td>`).join('')}</tr>`).join('');
      return `<div style="overflow-x:auto;margin-bottom:14px;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
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
  const maxAttempts = 60; // ~90s at 3s interval — mirrors the wallet deposit poller
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