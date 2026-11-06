/**
 * Search titles and descriptions for Academy lessons.
 *
 * The visible lesson title (H1) and the URL still come from academy.js. These
 * only change what Google shows: a <title> of 60 characters or less that leads
 * with the words people search, and a description of 155 or less that ends on
 * a full sentence. Key: "<course-slug>/<lesson-slug>" (the lesson's URL path
 * under /learn/). A lesson without an entry falls back to
 * "<lesson title> | EndaViral Academy" and its opening sentences.
 */
export const ACADEMY_SEO = {
  // TikTok
  'tiktok/cracking-the-for-you-page-what-tiktok-actually-admits': {
    title: 'How the TikTok For You Page Works (Kenya 2026)',
    desc: 'TikTok says follower count is not a direct ranking factor. What it does use to pick For You videos, and how Kenyan creators can work with it.' },
  'tiktok/views-likes-comments-or-shares-which-number-does-what': {
    title: 'TikTok Views vs Likes vs Shares: Which Counts?',
    desc: 'Views, likes, comments and shares each do a different job on TikTok. Learn which number moves reach and which only builds trust, before you spend.' },
  'tiktok/trends-bring-spikes-search-brings-months': {
    title: 'TikTok Search SEO in Kenya: Get Found for Months',
    desc: 'Trends give a spike; search keeps a video earning views for months. How TikTok search works and how Kenyan creators can rank in it.' },
  'tiktok/what-tiktok-really-pays-kenyans-in-2026-and-where-a-boost-fits': {
    title: 'How Much TikTok Pays in Kenya (2026 Rates)',
    desc: 'The Creator Rewards Program is still closed to Kenya, yet Kenyan TikTokers still earn. Where the money really comes from in 2026.' },
  'tiktok/your-videos-first-hour-facts-estimates-and-myths': {
    title: "TikTok 200 Views Jail: What's True in Kenya",
    desc: "Is the 200-view jail real? What TikTok has actually said about a video's first hour, which numbers are guesses, and what to do when views stall." },

  // Instagram
  'instagram/how-instagram-actually-ranks-you-in-2026': {
    title: 'How the Instagram Algorithm Works in 2026 (Kenya)',
    desc: 'What Instagram has confirmed about ranking Reels, posts and Stories in 2026, including the signals its boss named, and what they mean for Kenyan accounts.' },
  'instagram/social-proof-vs-algorithm-signals-using-growth-services-wisely': {
    title: 'Do Bought Instagram Likes Help Reach? (Kenya)',
    desc: "Bought likes can make a stranger trust your page, but they can't make the Reels algorithm push it. How to use growth services without wasting money." },
  'instagram/reels-in-2026-the-3-minute-line-skip-rate-and-cadence': {
    title: 'Instagram Reels Length, Skip Rate and Posting in 2026',
    desc: "Reels can run 20 minutes, but anything over 3 minutes isn't shown to new people. Ideal length, skip rate and how often Kenyan creators should post." },
  'instagram/keeping-your-account-healthy-and-recommendable': {
    title: 'Instagram Account Status: Check If You Can Be Recommended',
    desc: 'One Instagram settings screen tells you whether your posts can reach non-followers. How to check it, fix problems and keep your Kenyan account healthy.' },
  'instagram/when-buying-growth-helps-and-when-it-wastes-your-money': {
    title: 'Is Buying Instagram Followers Worth It in Kenya?',
    desc: 'When bought followers help a Kenyan page convert visitors, and when they are wasted money. A plain guide to spending on Instagram growth well.' },
  'instagram/your-algorithm-5-hashtags-and-originality-what-changed-in-2025-2026': {
    title: 'Instagram Hashtags in 2026: The 5-Tag Limit Explained',
    desc: 'Instagram now caps hashtags at 5, rewards original posts and lets users tune their own feed. What changed in 2025 and 2026 and how to adapt in Kenya.' },

  // YouTube
  'youtube/your-subscribers-arent-your-launch-pad-heres-what-is': {
    title: 'How YouTube Recommends New Videos (Kenya Guide)',
    desc: "YouTube says subscribers drive only a small share of views. What actually launches a new video, and why 'get subs first' is the wrong plan in Kenya." },
  'youtube/titles-thumbnails-and-the-test-that-doesnt-pick-by-clicks': {
    title: 'YouTube Thumbnail A/B Test: How Test & Compare Works',
    desc: "YouTube's thumbnail and title test picks the winner by watch time, not clicks. How to run it and write titles and thumbnails that hold viewers." },
  'youtube/monetisation-in-kenya-the-real-numbers-and-the-new-rules': {
    title: 'YouTube Monetisation in Kenya: Rules and Pay 2026',
    desc: 'You can start earning on YouTube in Kenya at 500 subscribers. Requirements, what Kenyan creators really earn, and the new KRA PIN rule for payouts.' },
  'youtube/seeding-a-new-upload-what-helps-what-never-counts': {
    title: 'How to Get Views on a New YouTube Video (Kenya)',
    desc: "YouTube doesn't count artificial traffic toward monetisation. What really helps a new upload get its first viewers, and what never counts." },
  'youtube/satisfaction-shorts-and-the-2026-rulebook': {
    title: 'YouTube Shorts Rules 2026: Length and Copyright',
    desc: 'Shorts can now be 3 minutes, but a copyright claim on one over a minute blocks it worldwide. The 2026 Shorts rules every Kenyan creator should know.' },

  // Account rescue
  'account-rescue/hacked-the-first-60-minutes-and-the-official-way-back-in': {
    title: 'Hacked Instagram or TikTok? Recover It in Kenya',
    desc: 'What to do in the first hour after your Instagram, TikTok, Facebook, WhatsApp or Telegram account is hacked, and the official recovery steps for each.' },
  'account-rescue/disabled-suspended-or-banned-appeals-that-work-and-the-move-that-kills': {
    title: 'Instagram Account Disabled? How to Appeal (Kenya)',
    desc: 'How to appeal a disabled, suspended or banned account on Instagram, TikTok, Facebook and YouTube, and the backup-account mistake that ends appeals.' },
  'account-rescue/reach-crashed-diagnose-a-shadowban-before-you-panic': {
    title: 'Shadowbanned on Instagram or TikTok? How to Check',
    desc: 'Reach dropped overnight? How to check for a shadowban on Instagram and TikTok, find the real cause and get your posts showing to new people again.' },
  'account-rescue/copyright-claims-strikes-and-takedowns-fix-them-without-losing-the': {
    title: 'YouTube Copyright Strike? How to Remove It (Kenya)',
    desc: "How to handle copyright claims, strikes and takedowns on YouTube, TikTok and Instagram, and why 'credit to the artist' is not a defence." },
  'account-rescue/money-stuck-monetisation-rejected-payouts-frozen-brands-who-ghost': {
    title: 'YouTube AdSense Payment on Hold in Kenya? Fix It',
    desc: 'Monetisation rejected, AdSense payouts frozen by the KRA PIN rule, or a brand that never paid. Steps Kenyan creators can take to get their money.' },
  'account-rescue/fake-pages-extortion-sextortion-and-doxxing-where-kenyans-report-it': {
    title: 'Fake Account or Sextortion? Where to Report in Kenya',
    desc: 'How to report fake pages, extortion, sextortion and doxxing in Kenya, take down intimate images with StopNCII, and which authorities can help.' },

  // Platform rules
  'platform-rules/instagram-the-dos-donts-and-instant-ban-mistakes': {
    title: 'Instagram Rules 2026: What Gets Accounts Banned',
    desc: "Instagram's dos and don'ts for 2026: originality rules, reposting, spam limits and the mistakes that get Kenyan accounts banned without warning." },
  'platform-rules/tiktok-the-dos-donts-and-instant-ban-mistakes': {
    title: 'TikTok Community Guidelines: What Gets You Banned',
    desc: 'TikTok removed over 820,000 videos from Kenya in three months. The rules that matter most and the mistakes that get Kenyan accounts banned.' },
  'platform-rules/youtube-the-dos-donts-and-channel-ending-mistakes': {
    title: 'YouTube Rules: Mistakes That End Channels (Kenya)',
    desc: "Sub-for-sub deals, reused content and misleading thumbnails are all in YouTube's policies. The rules Kenyan creators break most, and how to stay safe." },
  'platform-rules/facebook-the-dos-donts-and-facebook-jail-mistakes': {
    title: 'Facebook Jail: Why Accounts Get Restricted (Kenya)',
    desc: "Why Facebook restricts accounts and pages ('Facebook jail'), the rules behind it, and the posting habits that keep Kenyan pages out of trouble." },
  'platform-rules/x-twitter-the-dos-donts-and-suspension-mistakes': {
    title: 'X (Twitter) Rules 2026: Avoid Suspension in Kenya',
    desc: 'Since September 2026 X only pays for original posts. The rules that get Kenyan accounts suspended or demonetised on X, and how to avoid them.' },
  'platform-rules/telegram-the-dos-donts-and-spam-limit-mistakes': {
    title: 'Telegram Spam Limit: How to Avoid It (Kenya)',
    desc: "Why Telegram limits accounts for spam, how to lift a limit, and how Kenyan channel owners can keep growing even through the KCSE-week shutdowns." },
  'platform-rules/whatsapp-business-the-dos-donts-and-number-ban-mistakes': {
    title: 'WhatsApp Business Ban: Rules to Follow in Kenya',
    desc: "Why WhatsApp bans business numbers, the consent rules under Kenya's Data Protection Act, and how to send broadcasts without losing your number." },

  // Business
  'business/social-proof-for-local-businesses-what-kenyan-buyers-check-first': {
    title: 'Social Proof for Small Businesses in Kenya',
    desc: 'What Kenyan buyers check before they trust a business online: reviews, a complete Google profile and an active page. How to build each one.' },
  'business/the-cold-start-problem-google-business-profile-and-your-first-10-reviews': {
    title: 'Google Business Profile in Kenya: Get Your First Reviews',
    desc: 'How to set up a Google Business Profile in Kenya, appear for "near me" searches and collect your first 10 genuine reviews without breaking the rules.' },
  'business/a-content-ads-calendar-that-doesnt-cost-a-fortune': {
    title: 'Facebook Ads Cost in Kenya and a Content Calendar',
    desc: 'What Meta ads really cost in Kenya once 16% VAT is added, and a simple content and ads calendar a small business can afford to keep up.' },
  'business/from-dms-to-m-pesa-closing-the-sale-on-whatsapp': {
    title: 'How to Sell on WhatsApp Business in Kenya',
    desc: 'About 1 in 5 online orders in Kenya now come through WhatsApp and social apps. How to turn DMs into M-Pesa payments with catalogues and quick replies.' },

  // Facebook, X & Telegram
  'facebook-x-telegram/facebook-page-growth-in-2026-why-original-beats-everything': {
    title: 'How to Grow a Facebook Page in Kenya (2026)',
    desc: 'Original Reels views on Facebook doubled in late 2025 while repost pages lost reach and pay. How to grow a Facebook page in Kenya the way Meta now rewards.' },
  'facebook-x-telegram/growing-on-x-what-the-open-source-code-really-says': {
    title: 'How the X (Twitter) Algorithm Works: Grow in Kenya',
    desc: "X's published ranking code weights a reply the author answers far above a like. What the code shows and how Kenyan accounts can use it to grow." },
  'facebook-x-telegram/telegram-channels-no-algorithm-new-ways-to-earn': {
    title: 'How to Grow and Monetise a Telegram Channel (Kenya)',
    desc: 'Telegram has no feed algorithm, so growth depends on you. How Kenyan channel owners find subscribers and earn with Stars, ads and paid posts.' },
  'facebook-x-telegram/first-impressions-vs-payout-rules-what-numbers-can-and-cant-do': {
    title: "Bought Followers and Payouts: What Platforms Exclude",
    desc: "X, Facebook and YouTube exclude paid and artificial activity from payouts. What bought numbers can do for first impressions, and what they can't." },

  // Short-form video
  'short-form-video/why-short-form-is-the-cheapest-reach-in-kenya': {
    title: 'TikTok vs Instagram Reels in Kenya: Who Reaches More',
    desc: "TikTok reaches about 18 million Kenyan adults; Instagram about 4 million. Why short video is the cheapest reach in Kenya and where to post first." },
  'short-form-video/the-3-second-rule-and-the-metric-that-proves-it': {
    title: 'Short Video Hooks: The 3-Second Rule and Skip Rate',
    desc: 'Every short-video app now shows how many people swiped away early. How to read skip rate and write a hook that holds viewers past 3 seconds.' },
  'short-form-video/one-idea-three-apps-without-looking-like-a-re-upload': {
    title: 'Post One Video on TikTok, Reels and Shorts Safely',
    desc: 'YouTube and Instagram now cut reach for re-uploads. How to post one idea on TikTok, Reels and Shorts without being flagged as unoriginal.' },

  // Marketing fundamentals
  'marketing-fundamentals/why-people-follow-and-buy-the-psychology-that-actually-holds-up': {
    title: 'Marketing Psychology That Works: Why People Buy',
    desc: 'Which famous marketing psychology findings hold up and which fall apart, and how Kenyan creators and businesses can use the ones that work.' },
  'marketing-fundamentals/positioning-and-niche-how-to-stop-competing-with-everyone': {
    title: 'How to Find Your Niche and Position Your Brand',
    desc: "Your real competitor is often 'I'll do it myself'. How to pick a niche and position a business or page in Kenya so the right people choose you." },
  'marketing-fundamentals/audience-research-without-a-budget': {
    title: 'Free Audience Research for Small Businesses',
    desc: "'Would you buy this?' gets polite lies. Free ways for Kenyan creators and businesses to learn what their audience really wants and will pay for." },
  'marketing-fundamentals/the-funnel-vs-the-brand-how-content-really-turns-into-sales': {
    title: 'How Social Media Content Turns Into Sales',
    desc: 'Most future buyers are not ready to buy today. How to balance brand content and sales posts so your social media turns into steady sales.' },
  'marketing-fundamentals/measuring-what-matters-and-running-simple-experiments': {
    title: 'Social Media Metrics That Matter and Simple Tests',
    desc: 'Which social media numbers are worth tracking, and how to run simple experiments on posts and thumbnails to see what really works for your audience.' },

  // Personal branding
  'personal-branding/why-known-for-something-beats-known-for-everything': {
    title: 'Personal Branding: Be Known for One Thing',
    desc: 'Instagram now shows users a summary of the topics it thinks they like. Why being known for one thing grows a personal brand faster in Kenya.' },
  'personal-branding/consistency-the-unglamorous-growth-lever': {
    title: 'How Often to Post: Why Consistency Grows Pages',
    desc: 'People like what they have seen before. Why posting consistently grows a page, and a realistic posting rhythm Kenyan creators can actually keep.' },
  'personal-branding/making-your-profile-do-the-selling-for-you': {
    title: 'How to Write a Bio and Profile That Gets Follows',
    desc: 'Visitors judge your profile in a fraction of a second. How to set up your bio, photo, highlights and pinned posts so your page sells for you.' },

  // AI content
  'ai-content/ai-as-a-brainstorming-partner-not-a-ghostwriter': {
    title: 'Using AI for Social Media Content Without Penalties',
    desc: 'YouTube allows AI-edited scripts but not mass-produced content. How to use AI to brainstorm content without your posts looking generic or getting flagged.' },
  'ai-content/better-prompts-in-half-the-time': {
    title: 'ChatGPT Prompts for Social Media Captions',
    desc: 'The quickest way to better AI captions is pasting three of your own. Simple prompt habits that make AI write in your voice for Kenyan audiences.' },
  'ai-content/where-ai-fits-in-2026-tools-change-workflows-last': {
    title: 'AI Tools for Content Creators in 2026',
    desc: "AI apps come and go; Sora shut down in April 2026. How creators can build an AI workflow that survives when a favourite tool disappears." },

  // CapCut
  'capcut/your-first-edit-and-the-pro-badge-trap': {
    title: 'CapCut for Beginners: Avoid the Pro Export Trap',
    desc: 'How to make your first CapCut edit on a free account, and how to spot Pro-badged effects before they block your export.' },
  'capcut/captions-in-2026-free-paid-and-the-kenyan-proofreading-problem': {
    title: 'CapCut Auto Captions Free? Options in 2026',
    desc: 'CapCut auto captions now need Pro in many regions. Free ways to caption videos, and how to fix the mistakes auto captions make with Kenyan speech.' },
  'capcut/reusable-formats-without-the-template-button': {
    title: 'How to Make Reusable CapCut Templates (Free)',
    desc: "CapCut's post-a-template button is limited to approved creators. How to build reusable video formats on a free account and edit faster every week." },

  // Canva
  'canva/picking-the-right-template-and-making-it-unrecognisable': {
    title: 'How to Customise Canva Templates So They Stand Out',
    desc: "Canva has over 250 million users, so popular templates are everywhere. How to pick a template and change it so your design looks like your own brand." },
  'canva/text-contrast-and-readability-the-4-5-rule': {
    title: 'Canva Text Readability: Colour Contrast Rules',
    desc: 'White on red, orange or yellow fails readability standards. The 4.5:1 contrast rule and simple Canva fixes that make text easy to read on phones.' },
  'canva/a-consistent-look-on-a-free-account': {
    title: 'Canva Brand Kit on a Free Account: How to Use It',
    desc: 'Free Canva accounts do get one Brand Kit with three colours. How to set it up and keep a consistent look across posts without paying for Pro.' },

  // Account safety
  'account-safety/what-the-rules-actually-say-and-what-gets-flagged': {
    title: 'Is Buying Followers Against the Rules? What Gets Flagged',
    desc: 'What Instagram, TikTok and YouTube rules actually say about paid growth and promotion, what gets flagged, and how Kenyan creators can stay safe.' },
  'account-safety/lock-down-your-account-in-10-minutes': {
    title: 'Secure Your Instagram and TikTok in 10 Minutes',
    desc: 'SIM swaps let attackers steal SMS login codes. Set up app-based two-factor login, backup codes and login alerts on every account in 10 minutes.' },
  'account-safety/scams-aimed-at-kenyan-creators-and-how-to-spot-them': {
    title: 'Instagram and TikTok Scams Targeting Kenyan Creators',
    desc: 'Fake copyright complaints, brand deal scams and verification offers. The scams aimed at Kenyan creators and how to spot each one before you lose money.' },
  'account-safety/kenyan-law-for-creators-data-cybercrime-and-disclosure': {
    title: 'Kenyan Law for Content Creators: Data and Cybercrime',
    desc: "A Nairobi lounge was fined KES 1.85 million for posting a customer's photo. What Kenya's data, cybercrime and ad disclosure laws mean for creators." },

  // EndaViral basics
  'endaviral-basics/your-first-order-the-8-seconds-that-decide-it': {
    title: 'How to Order Followers on EndaViral (First Order)',
    desc: 'Most failed first orders go wrong before payment, on the link. How to place your first EndaViral order correctly and get it delivered fast.' },
  'endaviral-basics/reading-service-tiers-like-a-pro': {
    title: 'Cheap vs Quality Followers: Reading Service Tiers',
    desc: 'The cheapest followers per 1,000 can cost more per follower that stays. How to read service tiers, refill guarantees and drop rates before you buy.' },
  'endaviral-basics/payments-refunds-and-the-rewards-youre-already-earning': {
    title: 'Paying by M-Pesa on EndaViral: Refunds and Rewards',
    desc: 'How M-Pesa payments, refunds and loyalty points work on EndaViral, and why you should cancel any PIN prompt you did not start yourself.' },
  'endaviral-basics/getting-help-fast-and-getting-paid-back': {
    title: 'EndaViral Support: Get Help and Refunds Fast',
    desc: 'Start your ticket with the order ID and it is traced in seconds. How to contact EndaViral support, track an order and get a refund when one is due.' },
  'endaviral-basics/the-cold-start-problem-what-a-boost-can-and-cant-do': {
    title: 'Growing a New Page From Zero: Does a Boost Help?',
    desc: 'On a new page the hardest follower to get is the first stranger. What a starting boost can and cannot do, and how to pair it with good content.' },
};
