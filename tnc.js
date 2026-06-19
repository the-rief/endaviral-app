// ── Terms & Conditions modal ──────────────────────────────────────────────────
// Injects the full T&C content into #tncModalBody on first open, then handles
// open / close / accept interactions for the registration flow.

(function () {
  'use strict';

  // ── Full Terms of Service content ─────────────────────────────────────────
  const TNC_SECTIONS = [
    {
      heading: null,
      body: `By accessing, registering, depositing funds, or placing an order with EndaViral, you
automatically agree to all the terms and conditions listed below, whether or not you have read them.
EndaViral reserves the right to modify, update, or change these Terms of Service at any time without
prior notice. It is the responsibility of every user to review these terms before placing an order.
Our services are intended strictly for promotional and cosmetic social media enhancement purposes.
EndaViral is not affiliated with, endorsed by, or sponsored by Instagram, TikTok, YouTube, Facebook,
X (Twitter), Telegram, or any other social media platform.`,
    },
    {
      heading: '1. General Use',
      body: `By using our services, you agree to use the website only in accordance with all applicable
laws, platform Terms of Service, and these Terms & Conditions. You understand that EndaViral is a
digital marketing platform providing social media engagement services through third-party providers,
APIs, reseller systems, and automated infrastructure. We do not guarantee that the use of our services
will result in account growth, monetization, business success, viral reach, increased sales, authentic
engagement, or organic visibility. Some services may involve automated or incentivized engagement, and
results may vary depending on platform algorithms and external factors beyond our control.`,
    },
    {
      heading: '2. Service Delivery',
      body: `EndaViral aims to deliver all orders as accurately and efficiently as possible. However,
delivery times are estimates only and are not guaranteed. Some orders may start instantly while others
may take longer depending on provider availability, maintenance, system load, or platform conditions.
Delays, interruptions, partial delivery, or failures may occur due to third-party provider issues, API
failures, technical maintenance, internet outages, or platform changes. Orders marked as Processing are
not eligible for cancellation solely because delivery is taking longer than expected. EndaViral reserves
the right to change providers, replace services, split orders, partially complete orders, pause delivery,
or modify service methods if necessary to maintain operational stability or complete an order successfully.`,
    },
    {
      heading: '3. Third-Party Providers',
      body: `EndaViral relies on external providers, APIs, reseller systems, and automated networks to
deliver services. By using our platform, you acknowledge and accept that service quality, speed, and
retention may vary; providers may experience outages or sudden discontinuation; engagement may fluctuate
or drop over time; and services may change without notice. EndaViral shall not be held liable for
provider outages, delayed delivery, incorrect delivery, partial delivery, engagement drops, provider
shutdowns, platform-related losses, or interruptions caused by third-party systems. Users understand
that all services are provided on an "as available" basis.`,
    },
    {
      heading: '4. No Guarantees',
      body: `EndaViral does not guarantee permanent followers, likes, views, or engagement; specific
retention rates; monetization eligibility; account verification; organic reach improvements; revenue or
financial results; or platform safety outcomes. Social media platforms regularly update their systems
and algorithms, which may affect engagement visibility, retention, or account performance.`,
    },
    {
      heading: '5. Refund Policy',
      body: `All sales are final once an order has been submitted successfully. Because all services
provided by EndaViral are digital, intangible, and non-returnable, completed orders cannot be reversed,
processed orders cannot be cancelled, and delivered services are non-refundable. Refunds will only be
considered if the order failed completely, the order was proven undeliverable, or a duplicate payment
was confirmed. No refunds will be issued for completed orders, partially completed orders, delayed
orders, dropped engagement after delivery, customer mistakes, incorrect usernames or links, private or
restricted accounts, or dissatisfaction with results. Approved refunds, where applicable, will be issued
as EndaViral account credit only. No refunds will be returned to M-Pesa, bank accounts, cards, crypto
wallets, or external payment methods. Once a deposit has been completed, it cannot be reversed.`,
    },
    {
      heading: '6. Refill Policy',
      body: `Some services may include refill protection while others may not. Refill eligibility depends
entirely on the service purchased, provider availability, and refill period limitations. EndaViral
reserves the right to deny refill requests outside the eligible refill period. Refill eligibility becomes
void if usernames are changed, content is deleted, accounts become private, or another provider is used
simultaneously. Minor fluctuations in engagement may not qualify for refill.`,
    },
    {
      heading: '7. Account Responsibility',
      body: `Users are fully responsible for ensuring that submitted usernames and links are correct,
accounts remain public during delivery, content complies with platform rules, and duplicate orders are
not placed across multiple providers. EndaViral is not responsible for failed or incomplete orders
caused by incorrect submissions, account restrictions, private accounts, deleted content, username
changes, or user-side platform actions.`,
    },
    {
      heading: '8. Platform Risks',
      body: `Users understand that social media marketing services may carry risks including account
warnings, reduced reach, content limitations, demonetization, temporary restrictions, and account
suspensions or bans. EndaViral shall not be held responsible for any actions taken by social media
platforms against user accounts, content, or pages. All services are used at the customer's own risk.`,
    },
    {
      heading: '9. Pricing & Service Changes',
      body: `All prices, service descriptions, rates, and availability are subject to change at any time
without notice. EndaViral reserves the right to modify pricing, discontinue services, reject orders,
limit quantities, suspend accounts suspected of abuse or fraud, or refuse service to anyone at our
discretion.`,
    },
    {
      heading: '10. Fraud, Chargebacks & Disputes',
      body: `Fraudulent activity including unauthorised payments, fake disputes, chargebacks, payment
reversals, account abuse, or system exploitation may result in immediate account suspension, permanent
bans, cancellation of balances or orders, reversal of delivered services, or reporting to payment
providers or relevant authorities. By making a payment, you agree not to file chargebacks or disputes
without contacting support first. EndaViral reserves the right to recover losses associated with
fraudulent disputes or abuse.`,
    },
    {
      heading: '11. Acceptable Use',
      body: `You agree not to use EndaViral services for spam, phishing, scams, hate speech, illegal
activity, harmful or abusive content, extremist material, child exploitation content, or platform
manipulation in violation of applicable laws. We reserve the right to refuse or terminate services at
our sole discretion.`,
    },
    {
      heading: '12. Limitation of Liability',
      body: `Under no circumstances shall EndaViral, its owners, employees, affiliates, partners, or
providers be liable for financial losses, account bans, reputation damage, lost profits, business
interruptions, indirect damages, incidental damages, or platform-related consequences. All services are
provided strictly on an "as is" and "as available" basis without warranties of any kind. By using our
platform, you agree that all purchases are made entirely at your own risk. Our maximum liability under
any circumstance shall not exceed the amount paid by the user for the specific disputed order.`,
    },
    {
      heading: '13. Force Majeure',
      body: `EndaViral shall not be held responsible for delays, interruptions, or failures caused by
events beyond our reasonable control including internet outages, cyber attacks, provider failures, API
issues, platform changes, natural disasters, government actions, or technical interruptions.`,
    },
    {
      heading: '14. Contact & Support',
      body: `For support, billing issues, refill requests, or service inquiries, users should contact
EndaViral through the official support channels provided on the website. Response times may vary
depending on support volume, provider response times, or technical conditions.`,
    },
    {
      heading: '15. Governing Law',
      body: `These Terms shall be governed by and interpreted in accordance with the laws of Kenya. Any
disputes arising from the use of EndaViral shall first be attempted to be resolved through negotiation
or arbitration before court proceedings.`,
    },
    {
      heading: '16. Appearance & Engagement Disclaimer',
      body: `EndaViral services are intended solely to improve the visual appearance and perceived
engagement of social media profiles and content. We do not guarantee that followers, likes, views, or
subscribers obtained through our services will interact with your content. We only aim to deliver the
quantity purchased. Additionally, we do not guarantee that all accounts involved in delivery will
contain profile pictures, biographies, uploaded content, or active engagement behaviour, although we
strive to maintain quality across all services.`,
    },
    {
      heading: '17. Drop Disclaimer & Server Usage',
      body: `Due to the nature of digital promotional services, engagement drops and fluctuations may
occur over time. Not all drops qualify for refill, and eligibility depends entirely on the specific
service purchased. Users must not use multiple providers simultaneously for the same link or content,
as this may distort delivery results and void refill or refund eligibility.`,
    },
    {
      heading: '18. Third-Party Trademarks',
      body: `All third-party platform names including Instagram, TikTok, Facebook, YouTube, Telegram,
and X (Twitter) belong to their respective trademark owners. These names are used strictly for
identification and reference purposes only. EndaViral is not affiliated with, endorsed by, or sponsored
by any third-party platform mentioned on this website.`,
    },
    {
      heading: '19. Service Interruptions',
      body: `Services may occasionally experience interruptions or delays due to maintenance, API
limitations, provider failures, technical problems, internet outages, or platform updates. We are not
liable for disruptions caused by such events and will resume services as reasonably possible.`,
    },
    {
      heading: '20. Privacy Summary',
      body: `We collect only the information necessary to operate our services including email addresses,
usernames, links, payment records, and order data. We do not sell or rent personal information to third
parties. All information is handled securely and used strictly for operational purposes.`,
    },
    {
      heading: '21. Final Terms',
      body: `If any section of these Terms is found invalid or unenforceable, all remaining sections
shall continue to remain fully valid and enforceable. By continuing to use EndaViral, you confirm that
you fully understand and accept all Terms listed on this page.`,
    },
  ];

  // ── Build the HTML once and cache it ─────────────────────────────────────
  let _contentInjected = false;

  function _injectContent() {
    if (_contentInjected) return;
    const body = document.getElementById('tncModalBody');
    if (!body) return;

    const html = TNC_SECTIONS.map(function (s) {
      const heading = s.heading
        ? '<h4>' + _esc(s.heading) + '</h4>'
        : '';
      return heading + '<p>' + _esc(s.body) + '</p>';
    }).join('');

    body.innerHTML = html;
    _contentInjected = true;
  }

  function _esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Open the T&C modal */
  window.openTnc = function () {
    _injectContent();
    const overlay = document.getElementById('tncOverlay');
    if (!overlay) return;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    // Scroll modal body back to top on each open
    const modalBody = overlay.querySelector('.tnc-modal-body');
    if (modalBody) modalBody.scrollTop = 0;
  };

  /** Close the T&C modal without accepting */
  window.closeTnc = function () {
    const overlay = document.getElementById('tncOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  /** Accept terms: tick the checkbox, clear any error, close the modal */
  window.acceptTnc = function () {
    const checkbox = document.getElementById('tncCheck');
    const errEl    = document.getElementById('tncErr');
    if (checkbox) checkbox.checked = true;
    if (errEl)    errEl.classList.remove('show');
    window.closeTnc();
  };

})();