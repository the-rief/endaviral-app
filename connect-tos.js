/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL CONNECT — Marketplace Terms of Service (connect-tos.js)
 * Split out of connect.js so the legal text can be reviewed/updated on
 * its own without touching application logic.
 *
 * Load this file BEFORE connect.js — connect.js reads CONNECT_TOS_HTML,
 * CONNECT_CREATOR_TOS_CHECKS and CONNECT_BUSINESS_TOS_CHECKS as globals
 * (see _cnOpenTos() and _cnRenderJoinScreen() in connect.js).
 *
 * <script src="connect-tos.js"></script>
 * <script src="connect.js"></script>
 *
 * Full text lives here so it renders identically in the join-gate modal
 * for both roles. Role-specific acknowledgement checkboxes mirror the
 * CREATOR ACCEPTANCE / BUSINESS ACCEPTANCE boxes at the bottom of the
 * ToS doc — each one must be individually ticked (not just the general
 * "I Agree") for _cnSubmitJoin() to allow the user through.
 *
 * `key` must match connect_service.py's CREATOR_TOS_ACK_KEYS /
 * BUSINESS_TOS_ACK_KEYS exactly — the server re-validates that every
 * key was included in the join payload, so this list and the
 * checkboxes it renders are a UX convenience, not the source of truth.
 * IMPORTANT: this update adds a new "no_circumvention" key to BOTH
 * roles (from ToS §13, Marketplace Protection & Non-Circumvention) and
 * a new "platform_transactions" key to the business role (from §13.1) —
 * connect_service.py's CREATOR_TOS_ACK_KEYS / BUSINESS_TOS_ACK_KEYS
 * must be updated to match or joins will fail server-side validation.
 * ════════════════════════════════════════════════════════════════════ */

const CONNECT_CREATOR_TOS_CHECKS = [
  { key: 'fee_deduction', text: 'I understand EndaViral deducts a 15% Marketplace Success Fee only after you are paid from completed campaigns.' },
  { key: 'payment_after_approval', text: 'I understand payments are released only after campaign approval or completion of the review period.' },
  { key: 'independent_contractor', text: 'I understand I participate on the Platform as an independent creator and not as an employee of EndaViral.' },
  { key: 'no_circumvention', text: 'I agree not to bypass the Platform by accepting direct payment from businesses introduced through EndaViral.' },
];
const CONNECT_BUSINESS_TOS_CHECKS = [
  { key: 'escrow_hold', text: 'I understand campaign funds are securely held until campaign completion.' },
  { key: 'marketplace_intermediary', text: 'I understand EndaViral provides a marketplace and is not responsible for campaign performance or business results.' },
  { key: 'no_circumvention', text: 'I agree not to solicit or pay creators outside the Platform for introductions made through EndaViral.' },
  { key: 'platform_transactions', text: 'I agree that all campaign communication and payments relating to Marketplace introductions should be conducted through EndaViral unless otherwise permitted by the Platform.' },
];

const CONNECT_TOS_HTML = `
  <div class="modal-title" style="font-size:18px;">EndaViral Connect Marketplace Terms of Service</div>
  <div class="cn-tos-updated">Last updated: 12/07/2026 </div>
  <div class="cn-tos-body">
    <p>Welcome to <strong>EndaViral Marketplace</strong>, the creator marketplace on the <strong>EndaViral</strong> platform. These Terms of Service govern your use of the EndaViral Connect Marketplace. By creating an account, posting campaigns, applying for jobs, funding campaigns, or using any Marketplace services, you agree to these Terms.</p>

    <h4>1. Definitions</h4>
    <p><strong>EndaViral / Platform</strong> — the EndaViral website, mobile applications, products and services, including EndaViral Connect.<br>
    <strong>Creator</strong> — an independent individual or team offering content creation, influencer marketing, digital marketing or promotional services through the Platform.<br>
    <strong>Business</strong> — a person, company, organization or brand seeking creator services through the Platform.<br>
    <strong>Campaign</strong> — a paid opportunity created by a Business for Creators.<br>
    <strong>Marketplace Fee</strong> — the commission deducted by EndaViral from successfully completed campaigns.<br>
    <strong>Paymnents Protected</strong> — funds temporarily held by EndaViral until campaign completion.</p>

    <h4>2. About EndaViral</h4>
    <p>EndaViral Connect is a digital marketplace connecting Businesses with independent Creators. EndaViral provides creator discovery, campaign management, secure messaging, payment processing, dispute resolution and marketplace analytics.</p>
    <p>EndaViral does not employ Creators or Businesses and is not a party to the commercial relationship beyond operating the marketplace.</p>

    <h4>3. Account Registration</h4>
    <p>To join the Marketplace you must provide:<br>
    <strong>Creators</strong> — full name, phone number, email address, password, and at least one social media handle.<br>
    <strong>Businesses</strong> — business name, phone number, email address, password.</p>
    <p>Users are responsible for maintaining accurate account information. Phone numbers and emails may be verified before Marketplace access is granted.</p>

    <h4>4. Creator Responsibilities</h4>
    <p>Creators agree to deliver work according to campaign requirements, meet agreed deadlines, submit genuine and original content, respect intellectual property rights, maintain professional communication, and use only social media accounts they own or manage.</p>
    <p>Creators may not purchase fake engagement for campaign submissions, submit false campaign links, misrepresent follower counts or engagement, use copyrighted content without permission, or engage in fraudulent activity.</p>

    <h4>5. Business Responsibilities</h4>
    <p>Businesses agree to publish accurate campaign descriptions, clearly state budgets and deliverables, fund campaigns before work begins, review completed work within the specified review period, and treat Creators professionally.</p>
    <p>Businesses may not post misleading campaigns, request illegal or prohibited content, or attempt to bypass the Platform to avoid Marketplace fees.</p>

    <h4>6. Campaigns</h4>
    <p>Businesses are responsible for ensuring campaign details include a campaign title, description, budget, deliverables, deadline, platform(s), and creator requirements. Campaigns may be rejected or removed if they violate Platform policies.</p>

    <h4>7. Secure Payments</h4>
    <p>Businesses must fund campaigns before work begins. Funds are securely held by EndaViral until campaign completion.</p>
    <p>Payment is released when the Business approves the submitted work, or when no dispute is raised within the review period.</p>
    <p>EndaViral deducts a Marketplace Success Fee from Creator earnings. Current Marketplace Fee: <strong>15%.</strong></p>
    <div class="cn-tos-example">Example — Campaign Budget: KES 10,000 · Creator Receives: KES 8,500 · Marketplace Fee: KES 1,500</div>
    <p>Marketplace fees may be updated with prior notice.</p>

    <h4>8. Creator Payouts</h4>
    <p>Creators may withdraw available earnings subject to minimum withdrawal limits, successful campaign completion, and compliance with Platform policies. Payments are sent to the withdrawal details provided by the Creator.</p>

    <h4>9. Disputes</h4>
    <p>If a dispute arises, EndaViral may review the campaign description, chat history, submitted deliverables, campaign timeline, and supporting evidence from both parties. Possible outcomes include releasing payment to the Creator, a partial refund, a full refund, or campaign cancellation. EndaViral's decision is final.</p>

    <h4>10. Ratings &amp; Reviews</h4>
    <p>Businesses and Creators may rate each other after campaign completion. Reviews must be honest. False, abusive or misleading reviews may be removed.</p>

    <h4>11. Intellectual Property</h4>
    <p>Unless otherwise agreed within a Campaign, Creators retain ownership of their original content and Businesses receive the agreed usage rights for delivered work. Any transfer of ownership or extended commercial usage rights must be agreed within the campaign.</p>

    <h4>12. Marketplace Conduct</h4>
    <p>Users agree not to harass other users, share offensive content, commit fraud, circumvent Marketplace payments, manipulate ratings, use bots or automated accounts, or create duplicate accounts for abuse. Violation may result in suspension or permanent removal.</p>

    <h4>13. Marketplace Protection &amp; Non-Circumvention</h4>
    <p>EndaViral invests in acquiring businesses, attracting creators, operating the Marketplace, facilitating communication, processing payments, resolving disputes, and maintaining the Platform. To protect the integrity of the Marketplace, all users agree to the following:</p>

    <h5>13.1 Platform Transactions</h5>
    <p>Businesses and Creators introduced through EndaViral agree that all campaigns initiated through the Platform shall be managed and paid through EndaViral.</p>

    <h5>13.2 Circumvention</h5>
    <p>A Business or Creator shall not intentionally avoid the EndaViral Marketplace by requesting direct payment outside the Platform, providing personal payment details for campaigns initiated through EndaViral, moving campaign negotiations off the Platform to avoid Marketplace fees, entering into private agreements for the same campaign after introduction through EndaViral, or using the Platform solely to identify or recruit users before completing transactions elsewhere.</p>

    <h5>13.3 Protection Period</h5>
    <p>Where a Business and Creator are first introduced through EndaViral, they agree that all commercial engagements arising from that introduction shall be conducted through EndaViral for a period of twelve (12) months from the date of first contact through the Platform, unless EndaViral provides written approval otherwise.</p>

    <h5>13.4 Existing Relationships</h5>
    <p>This restriction does not apply where the Business and Creator had an existing commercial relationship before using EndaViral, and either party can reasonably demonstrate that the relationship predated the Marketplace introduction.</p>

    <h5>13.5 Consequences</h5>
    <p>Where EndaViral reasonably determines that users have intentionally bypassed the Platform to avoid Marketplace fees, EndaViral may, at its sole discretion, suspend or permanently terminate one or both accounts, cancel active campaigns, withhold Marketplace privileges, restrict future access to the Platform, or take any lawful action available to recover unpaid Marketplace fees or protect its business interests.</p>

    <h5>13.6 Future Independent Relationships</h5>
    <p>After the twelve (12) month Marketplace Protection Period expires, Businesses and Creators may establish independent commercial relationships outside the Platform without restriction, provided no outstanding disputes or contractual obligations remain under EndaViral.</p>

    <h5>13.7 Reporting Circumvention</h5>
    <p>Users are encouraged to report suspected attempts to bypass the Marketplace. EndaViral may investigate reports and request relevant information from affected parties.</p>

    <h4>14. Limitation of Liability</h4>
    <p>EndaViral provides a marketplace platform only. EndaViral is not responsible for campaign performance, Creator earnings, Business profitability, lost profits, indirect damages, or user-generated content. Users participate at their own risk.</p>

    <h4>15. Privacy</h4>
    <p>EndaViral collects only information necessary to operate the Marketplace. Information may be used to verify accounts, process payments, prevent fraud, improve Platform functionality, and provide customer support. Personal information is handled according to the EndaViral Privacy Policy.</p>

    <h4>16. Changes to These Terms</h4>
    <p>EndaViral may update these Terms from time to time. Continued use of the Marketplace after changes constitutes acceptance of the updated Terms.</p>

    <h4>17. Governing Law</h4>
    <p>These Terms shall be governed by the laws of the Republic of Kenya. Any disputes arising from these Terms shall be subject to the jurisdiction of Kenyan courts unless otherwise resolved through the Platform's dispute resolution process.</p>

    <h4>18. Legal Notice</h4>
    <p>EndaViral is the trading platform through which these Marketplace services are provided. The Platform is operated by its lawful owner and operator in accordance with applicable Kenyan laws.</p>

    <h4>19. Acceptance</h4>
    <p>By joining the Marketplace, you confirm that you have read and understood these Terms, agree to be legally bound by them, and are at least 18 years old or have legal authority to enter into this agreement.</p>
  </div>
`;