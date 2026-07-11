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
//
// The EndaViral logo is embedded as a base64 data URI (not <img src="...">
// loaded from disk) so drawImage() never touches a cross-origin resource —
// that would taint the canvas and silently break the Download/Share buttons'
// canvas.toDataURL()/toBlob() calls further down this file.
const AC_LOGO_DATA_URI = 'data:image/png;base64,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';

let _acCertData = null;
let _acLogoImg = null;
let _acLogoLoadPromise = null;

function _acLoadLogo() {
  if (_acLogoImg) return Promise.resolve(_acLogoImg);
  if (_acLogoLoadPromise) return _acLogoLoadPromise;
  _acLogoLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { _acLogoImg = img; resolve(img); };
    img.onerror = () => resolve(null); // fall back to a text wordmark if it ever fails to decode
    img.src = AC_LOGO_DATA_URI;
  });
  return _acLogoLoadPromise;
}

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
    // Extremely unlikely (the logo is embedded, not fetched) — text fallback
    // keeps the certificate usable even if the image somehow fails to decode.
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