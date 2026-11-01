/* ════════════════════════════════════════════════════════════════════
 * ENDAVIRAL CONNECT — Bids Workspace (bids.js)  v1.0
 *
 * Replaces the old modal-on-modal Bids Inbox (campaign modal → bids list
 * modal → bid chat view → pay sheet view, all squeezed into one 640px
 * dialog) with a single full-screen, three-pane workspace:
 *
 *   ┌ rail ─────┐┌ list ────────────────────┐┌ detail ──────────────────┐
 *   │ New   412 ││ [ ] Kulture    KES 200    ││  Kulture — chat, offers, │
 *   │ Talks  14 ││ [x] Wolanda    KES 150    ││  Accept/Reject, Pay      │
 *   │ Hired   3 ││ [ ] Njeri M    KES 120     ││  Accept/Reject, Pay      │
 *   │ Closed760 ││ ...infinite scroll...     ││                          │
 *   └───────────┘└───────────────────────────┘└──────────────────────────┘
 *
 * DESIGN NOTE — what's real vs. cosmetic:
 *   The rail's 4 segments (New/In talks/Hired/Closed) map 1:1 onto the
 *   ApplicationStatus values the backend already returns via
 *   /applications/counts and /applications?status=... — same statuses
 *   connect.js's CN_STATUS_LABELS already defines. No fake segments.
 *
 *   "Shortlist" (★) still has no backend field, so it stays a client-side,
 *   per-campaign flag stored in localStorage — a scratch pad for triage,
 *   not a server-side status. Everything else in the rail (platform,
 *   min. followers, verified-only, max price) is real: connect.py's
 *   list_applications now accepts platform/min_followers/verified_only/
 *   max_price and attaches creator_followers_count/creator_platforms/
 *   creator_is_verified/creator_rating_avg to each row, mirroring the
 *   filters browse_creators already had — see the accompanying connect.py
 *   diff. Requires that backend patch to be deployed to work.
 *
 *   Bulk Accept/Reject calls the existing single-application accept/reject
 *   endpoints once per selected row (there's no bulk endpoint yet). Fast
 *   enough for real-world selection sizes; flagged here in case a true
 *   bulk endpoint gets added later — swap the loop in _bwBulkAction for a
 *   single call then.
 *
 * OWNERSHIP: this file is the ONLY home for bid management — the rail/
 *   list/search/sort/filter/shortlist/bulk-accept-reject workspace above,
 *   plus the bid chat thread, price negotiation-in-a-bid, the pay sheet,
 *   and the STK push + funding poll it triggers (_cnOpenBidsInbox,
 *   _cnCloseBidsModal, _cnOpenBidChat, _cnRenderBidChatActionCard,
 *   _cnOpenPaySheet, _cnPaySheetSyncButton, _cnCancelPaySheet, _cnContinuePaySheet,
 *   _cnProposePriceFromPaySheet, _cnFundFormHtml, _cnSubmitFund, _cnPollFunding,
 *   _cnStopFundPolling, _cnPlatformProcessingFee). None of it is defined in connect.js and
 *   nothing here is overridden by connect.js — this is simply the single
 *   implementation. connect.js's own "N bids received" summary card (on
 *   a business's still-open campaign, before the workspace is opened)
 *   calls _bwFetchCampaignSummaryCounts(campaignId) — the one function
 *   here meant to be called from outside — and keeps the result in its
 *   own local variable; it never reads or writes this file's _bwCounts.
 *   It reuses the existing #cnBidsModalBody markup already sitting in
 *   index.html's ★MODALS block, reparented into this workspace's detail
 *   pane.
 *
 * INTEGRATION: drop-in. No index.html edits needed.
 *   - Load AFTER connect.js:  <script src="bids.js"></script>
 *   - _cnOpenBidsInbox(campaignId) is the entry point every "Open Bids
 *     Inbox" button calls; _cnCloseBidsModal()/_cnCloseBidChat() are the
 *     legacy names anything outside this file still calls to close it.
 *
 * Depends on (globals owned by connect.js / the app shell — read, never
 * redefined, here):
 *   esc(), fmtKES(), toast(), api(), currentUser, token, API,
 *   _cnCurrentCampaign, _cnActiveNegotiationApp, _cnMsgThreadCreatorId,
 *   _cnFundPollTimer, _cnRenderMsgInputRow(), _cnLoadMessages(),
 *   _cnCanNegotiateNow(), _cnNegotiationBannerHtml(), _cnDownloadReceipt(),
 *   _cnOpenCampaign(), _cnOpenInviteModal(), _cnStatusPill(),
 *   CONNECT_PLATFORMS
 * ════════════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────────────────
const BW_PAGE_SIZE = 30;
const BW_SEGMENTS = [
  { key: 'pending',  label: 'New',      statusParam: 'pending' },
  { key: 'accepted', label: 'Chatting', statusParam: 'accepted' },
  { key: 'hired',    label: 'Hired',    statusParam: 'hired' },
  { key: 'closed',   label: 'Not chosen', statusParam: 'rejected,withdrawn,not_selected' },
];

let _bwCampaignId = null;
let _bwSegment = 'pending';
let _bwSort = 'newest';          // 'newest' | 'price_low' | 'price_high'
let _bwQuery = '';
let _bwOffset = 0;
let _bwRows = [];                // every row fetched so far for the active segment/sort/query
let _bwHasMore = false;
let _bwLoading = false;
let _bwSelected = new Set();     // application ids selected for bulk action (New segment only)
let _bwActiveAppId = null;
let _bwShortlist = new Set();    // application ids, client-side only, persisted per campaign
let _bwShortlistOnly = false;
let _bwMaxPrice = '';            // server-side — sent as max_price
let _bwPlatform = '';            // server-side — sent as platform (bidder's own profile platforms)
let _bwMinFollowers = '';        // server-side — sent as min_followers
let _bwVerifiedOnly = false;     // server-side — sent as verified_only
let _bwFilterDebounce = null;
let _bwSearchDebounce = null;
let _bwScrollGuard = false;
let _bwOrigModalBodyParent = null; // where #cnBidsModalBody normally lives, so we can put it back

// ─── Entry point ─────────────────────────────────────────────────────────
// Every "Open Bids Inbox" button on the campaign card calls this directly.
function _cnOpenBidsInbox(campaignId) {
  _bwOpen(campaignId);
}

// Old ✕ / any stray caller of the modal-close path now just closes the workspace.
function _cnCloseBidsModal() {
  _bwClose();
}

async function _bwOpen(campaignId) {
  _bwInjectStyles();
  _bwBuildShell();

  _bwCampaignId = campaignId;
  _bwSegment = 'pending';
  _bwSort = 'newest';
  _bwQuery = '';
  _bwMaxPrice = '';
  _bwPlatform = '';
  _bwMinFollowers = '';
  _bwVerifiedOnly = false;
  _bwShortlistOnly = false;
  _bwOffset = 0;
  _bwRows = [];
  _bwHasMore = false;
  _bwSelected.clear();
  _bwActiveAppId = null;

  document.getElementById('cnCampaignModal')?.classList.remove('show');
  document.getElementById('bwOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';

  _bwLoadShortlist();
  _bwShowDetailEmpty();

  // Campaign header (title) + counts, in parallel.
  document.getElementById('bwCampaignTitle').textContent = 'Loading…';
  try {
    const [campaign] = await Promise.all([
      api(`/connect/campaigns/${campaignId}`),
      _bwRefreshCounts(),
    ]);
    _cnCurrentCampaign = campaign; // connect.js's chat/pay/negotiate code reads this global directly
    document.getElementById('bwCampaignTitle').textContent = campaign.title || 'Bids';
  } catch (e) {
    document.getElementById('bwCampaignTitle').textContent = 'Bids';
    toast(e.message || "Couldn't load this campaign", 'error');
  }

  _bwRenderRail();
  await _bwFetchPage(true);
}

function _bwClose() {
  document.getElementById('bwOverlay')?.classList.remove('show');
  document.body.style.overflow = '';
  _cnStopFundPolling?.();
  _cnActiveNegotiationApp = null;
  _cnMsgThreadCreatorId = null;
  _bwPutBackModalBody();
  const cid = _bwCampaignId;
  _bwCampaignId = null;
  if (cid) _cnOpenCampaign(cid);
}

// ─── One-time DOM build ─────────────────────────────────────────────────────
function _bwBuildShell() {
  if (document.getElementById('bwOverlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'bw-overlay';
  overlay.id = 'bwOverlay';
  overlay.innerHTML = `
    <div class="bw-shell">
      <div class="bw-topbar">
        <div class="bw-topbar-left">
          <button class="bw-back" onclick="_bwClose()" aria-label="Back to campaign">←</button>
          <div class="bw-topbar-icon">📥</div>
          <div>
            <div class="bw-eyebrow">Creators' prices</div>
            <div class="bw-title" id="bwCampaignTitle">Bids</div>
          </div>
        </div>
        <div class="bw-topbar-right">
          <button class="btn-secondary" id="bwInviteBtn" aria-label="Invite a creator">✉️ <span class="bw-invite-label">Invite a creator</span></button>
        </div>
      </div>
      <div class="bw-body" id="bwBody" data-view="list">
        <div class="bw-rail" id="bwRail"></div>
        <div class="bw-rail-scrim" onclick="_bwSetView('list')"></div>
        <div class="bw-list-col">
          <div class="bw-list-toolbar" id="bwToolbar"></div>
          <div class="bw-bulkbar" id="bwBulkbar" style="display:none;"></div>
          <div class="bw-list" id="bwList" onscroll="_bwOnListScroll(this)"></div>
        </div>
        <div class="bw-detail" id="bwDetailPane">
          <div class="bw-detail-empty" id="bwDetailEmpty">
            <div class="bw-detail-empty-icon">💬</div>
            <div class="bw-detail-empty-title">Pick a creator</div>
            <div class="bw-detail-empty-sub">Tap a creator on the left to chat, agree the price, and pay.</div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('bwInviteBtn').onclick = () => {
    if (_bwCampaignId) _cnOpenInviteModal(null, null, _bwCampaignId);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('bwOverlay')?.classList.contains('show')) _bwClose();
  });
}

// ─── Mobile view state ──────────────────────────────────────────────────────
// Three panes (rail / list / detail) sit side by side on desktop, no state
// needed. Below the 768px breakpoint (see CSS) there's only room for one at
// a time, so .bw-body's [data-view] attribute — "list" | "rail" | "detail" —
// drives which pane is slid into view. Setting it is always safe to call
// even on desktop, where it's simply ignored (the CSS hook only exists
// inside the mobile media query).
function _bwSetView(view) {
  const body = document.getElementById('bwBody');
  if (body) body.dataset.view = view;
}

function _bwToggleRail() {
  const body = document.getElementById('bwBody');
  if (!body) return;
  _bwSetView(body.dataset.view === 'rail' ? 'list' : 'rail');
}

// ─── Shortlist (client-side only — see header note) ────────────────────────
function _bwShortlistKey() { return `bw_shortlist_${_bwCampaignId}`; }

function _bwLoadShortlist() {
  _bwShortlist = new Set();
  try {
    const raw = localStorage.getItem(_bwShortlistKey());
    if (raw) JSON.parse(raw).forEach(id => _bwShortlist.add(id));
  } catch (_) { /* corrupt/missing — just start empty */ }
}

function _bwSaveShortlist() {
  try { localStorage.setItem(_bwShortlistKey(), JSON.stringify([..._bwShortlist])); } catch (_) {}
}

function _bwToggleShortlist(appId, evt) {
  evt.stopPropagation();
  if (_bwShortlist.has(appId)) _bwShortlist.delete(appId); else _bwShortlist.add(appId);
  _bwSaveShortlist();
  _bwRenderList();
}

// ─── Rail (segments + counts + local refinements) ──────────────────────────
// _bwCounts is this workspace's own copy, refreshed on open/segment change.
// connect.js shows its own separate "N bids received" summary card before
// the workspace is even opened — it calls _bwFetchCampaignSummaryCounts()
// below (the shared, stateless fetch) and keeps the result in its own
// local variable, never touching _bwCounts itself.
let _bwCounts = {};

async function _bwRefreshCounts() {
  _bwCounts = await _bwFetchCampaignSummaryCounts(_bwCampaignId);
}

// The one function in this file meant to be called from outside (by
// connect.js) — a stateless counts fetch, so the raw API call has exactly
// one owner even though two summary UIs (this rail, connect.js's campaign
// card) both need the numbers.
async function _bwFetchCampaignSummaryCounts(campaignId) {
  try { return await Store.ensure(`bidsCounts:${campaignId}`, () => api(`/connect/campaigns/${campaignId}/applications/counts`), { ttl: 15000 }); }
  catch (_) { return {}; }
}

function _bwRenderRail() {
  const rail = document.getElementById('bwRail');
  if (!rail) return;
  const counts = _bwCounts || {};
  const closedN = (counts.rejected || 0) + (counts.withdrawn || 0) + (counts.not_selected || 0);
  const countFor = (key) => key === 'closed' ? closedN : (counts[key] || 0);
  const segIcon = { pending: '🆕', accepted: '🤝', hired: '✅', closed: '🗂️' };

  rail.innerHTML = `
    <button class="bw-rail-close" onclick="_bwSetView('list')" aria-label="Close filters">✕ Close</button>
    <div class="bw-rail-label">Show</div>
    ${BW_SEGMENTS.map(s => `
      <button class="bw-rail-item ${_bwSegment === s.key ? 'active' : ''}" onclick="_bwSwitchSegment('${s.key}')">
        <span class="bw-rail-item-icon">${segIcon[s.key] || ''}</span>
        <span class="bw-rail-item-label">${esc(s.label)}</span>
        <span class="bw-rail-count ${countFor(s.key) > 0 ? 'has-count' : ''}">${countFor(s.key)}</span>
      </button>
    `).join('')}
    <div class="bw-rail-divider"></div>
    <div class="bw-rail-label">Filter by</div>
    <label class="bw-rail-check">
      <input type="checkbox" ${_bwShortlistOnly ? 'checked' : ''} onchange="_bwToggleShortlistOnly()">
      <span>★ Shortlisted only</span>
    </label>
    <label class="bw-rail-check">
      <input type="checkbox" ${_bwVerifiedOnly ? 'checked' : ''} onchange="_bwSetVerifiedOnly(this.checked)">
      <span>✔️ Verified creators only</span>
    </label>
    <div class="bw-rail-field">
      <label>Platform</label>
      <select onchange="_bwSetPlatform(this.value)">
        <option value="">Any</option>
        ${CONNECT_PLATFORMS.map(p => `<option value="${p.key}" ${_bwPlatform === p.key ? 'selected' : ''}>${p.emoji} ${esc(p.label)}</option>`).join('')}
      </select>
    </div>
    <div class="bw-rail-field">
      <label>Min. followers</label>
      <input type="number" min="0" placeholder="Any" value="${esc(_bwMinFollowers)}" oninput="_bwSetMinFollowers(this.value)">
    </div>
    <div class="bw-rail-field">
      <label>Max price (KES)</label>
      <input type="number" min="0" placeholder="Any" value="${esc(_bwMaxPrice)}" oninput="_bwSetMaxPrice(this.value)">
    </div>
  `;
}

function _bwSwitchSegment(key) {
  if (_bwSegment === key) { _bwSetView('list'); return; }
  _bwSegment = key;
  _bwOffset = 0;
  _bwRows = [];
  _bwSelected.clear();
  _bwRenderRail();
  _bwRenderToolbar();
  _bwFetchPage(true);
  _bwSetView('list'); // no-op on desktop (data-view is mobile-only); closes the rail overlay on phones
}

function _bwSetSort(v) {
  _bwSort = v;
  _bwOffset = 0;
  _bwRows = [];
  _bwFetchPage(true);
}

function _bwOnSearchInput(v) {
  clearTimeout(_bwSearchDebounce);
  _bwSearchDebounce = setTimeout(() => {
    _bwQuery = v.trim();
    _bwOffset = 0;
    _bwRows = [];
    _bwFetchPage(true);
  }, 300);
}

// Platform/followers/price are real server-side filters now (see
// connect.py's list_applications) — debounced the same way search is, so
// typing a follower count or price doesn't fire a request per keystroke.
function _bwRefetchFiltered() {
  clearTimeout(_bwFilterDebounce);
  _bwFilterDebounce = setTimeout(() => {
    _bwOffset = 0;
    _bwRows = [];
    _bwFetchPage(true);
  }, 300);
}

function _bwSetMaxPrice(v) { _bwMaxPrice = v; _bwRefetchFiltered(); }
function _bwSetMinFollowers(v) { _bwMinFollowers = v; _bwRefetchFiltered(); }
function _bwSetPlatform(v) { _bwPlatform = v; _bwRenderRail(); _bwRefetchFiltered(); }
function _bwSetVerifiedOnly(checked) { _bwVerifiedOnly = checked; _bwRenderRail(); _bwRefetchFiltered(); }

// Shortlist stays purely client-side (see header note), so toggling it just
// re-filters whatever's already been loaded — no refetch needed.
function _bwToggleShortlistOnly() {
  _bwShortlistOnly = !_bwShortlistOnly;
  _bwRenderRail();
  _bwRenderList();
}

// ─── Toolbar (search + sort), separate from the list so retyping never
// blows away input focus mid-keystroke ───────────────────────────────────
function _bwRenderToolbar() {
  const el = document.getElementById('bwToolbar');
  if (!el) return;
  const counts = _bwCounts || {};
  const closedN = (counts.rejected || 0) + (counts.withdrawn || 0) + (counts.not_selected || 0);
  const nFor = (k) => k === 'closed' ? closedN : (counts[k] || 0);
  // Phones: the segment list lives in a hidden side panel, which people
  // never opened — show the segments as plain tabs right above the list.
  el.innerHTML = `
    <div class="bw-segtabs">${BW_SEGMENTS.map(sg => `<button class="bw-segtab ${_bwSegment === sg.key ? 'active' : ''}" onclick="_bwSwitchSegment('${sg.key}')">${esc(sg.label)} <span>${nFor(sg.key)}</span></button>`).join('')}</div>`
  + `
    <button class="bw-filter-btn" onclick="_bwToggleRail()" aria-label="Filters">⚙︎</button>
    <div class="bw-search-wrap">
      <span class="bw-search-icon">🔍</span>
      <input type="text" class="bw-search" placeholder="Search name…" value="${esc(_bwQuery)}" oninput="_bwOnSearchInput(this.value)">
    </div>
    <select class="bw-sort" onchange="_bwSetSort(this.value)" aria-label="Sort">
      <option value="newest" ${_bwSort === 'newest' ? 'selected' : ''}>Newest</option>
      <option value="price_low" ${_bwSort === 'price_low' ? 'selected' : ''}>Cheapest</option>
      <option value="price_high" ${_bwSort === 'price_high' ? 'selected' : ''}>Highest</option>
    </select>
  `;
}

// ─── Data fetch ─────────────────────────────────────────────────────────────
function _bwStatusParam() {
  return (BW_SEGMENTS.find(s => s.key === _bwSegment) || BW_SEGMENTS[0]).statusParam;
}

async function _bwFetchPage(reset) {
  if (_bwLoading) return;
  _bwLoading = true;
  if (reset) {
    _bwRenderToolbar();
    document.getElementById('bwList').innerHTML = `<div class="bw-empty">Loading…</div>`;
  }
  try {
    const params = new URLSearchParams({
      status: _bwStatusParam(),
      sort: _bwSort,
      limit: String(BW_PAGE_SIZE),
      offset: String(_bwOffset),
    });
    if (_bwQuery) params.set('q', _bwQuery);
    if (_bwPlatform) params.set('platform', _bwPlatform);
    if (_bwMinFollowers !== '' && !isNaN(parseInt(_bwMinFollowers, 10))) params.set('min_followers', String(parseInt(_bwMinFollowers, 10)));
    if (_bwVerifiedOnly) params.set('verified_only', 'true');
    if (_bwMaxPrice !== '' && !isNaN(parseFloat(_bwMaxPrice))) params.set('max_price', String(parseFloat(_bwMaxPrice)));
    const data = await api(`/connect/campaigns/${_bwCampaignId}/applications?${params.toString()}`);
    _bwRows = reset ? data.applications : _bwRows.concat(data.applications);
    _bwOffset += data.applications.length;
    _bwHasMore = _bwOffset < data.total;
  } catch (e) {
    document.getElementById('bwList').innerHTML = `<div class="bw-empty">${esc(e.message || "Couldn't load bids.")}</div>`;
    _bwLoading = false;
    return;
  }
  _bwLoading = false;
  _bwRenderList();
}

function _bwOnListScroll(el) {
  if (_bwScrollGuard || _bwLoading || !_bwHasMore) return;
  if (el.scrollTop + el.clientHeight > el.scrollHeight - 200) {
    _bwScrollGuard = true;
    _bwFetchPage(false).finally(() => { _bwScrollGuard = false; });
  }
}

// ─── Local (already-loaded) filters ────────────────────────────────────────
function _bwPassesLocalFilters(row) {
  // Only the shortlist is client-side (see header note) — platform,
  // followers, verification and price are all applied server-side now,
  // so the rows we've already fetched already satisfy those.
  return !_bwShortlistOnly || _bwShortlist.has(row.id);
}

function _bwVisibleRows() {
  return _bwRows.filter(_bwPassesLocalFilters);
}

// ─── List render ────────────────────────────────────────────────────────────
function _bwRenderList() {
  const listEl = document.getElementById('bwList');
  if (!listEl) return;
  const visible = _bwVisibleRows();
  const canBulk = _bwSegment === 'pending';

  if (!visible.length) {
    const emptyIcon = { pending: '📭', accepted: '🤝', hired: '✅', closed: '🗂️' }[_bwSegment] || '📭';
    const base = _bwSegment === 'pending' ? 'No new prices yet. Creators usually reply within a day — or invite one yourself.'
      : _bwSegment === 'accepted' ? 'You are not chatting with anyone yet. Tap “Chat” on a creator in New.'
      : _bwSegment === 'hired' ? 'No one hired yet.'
      : 'Nothing here yet.';
    const filtered = (_bwShortlistOnly || _bwMaxPrice !== '');
    const msg = filtered ? 'Nothing matches your current filters.' : base;
    listEl.innerHTML = `<div class="bw-empty"><div class="bw-empty-icon">${filtered ? '🔍' : emptyIcon}</div><div>${esc(msg)}</div></div>`;
  } else {
    listEl.innerHTML = visible.map(a => {
      const starred = _bwShortlist.has(a.id);
      const followers = a.creator_followers_count;
      return `
      <div class="bw-row ${_bwActiveAppId === a.id ? 'active' : ''}" onclick="_bwOpenRow('${a.id}')">
        ${canBulk ? `<input type="checkbox" class="bw-row-check" onclick="event.stopPropagation()" ${_bwSelected.has(a.id) ? 'checked' : ''} onchange="_bwToggleSelectRow('${a.id}', this.checked)">` : ''}
        ${a.creator_avatar_url
          ? `<img class="bw-row-avatar" src="${/^https?:\/\//i.test(a.creator_avatar_url) ? esc(a.creator_avatar_url) : ''}" alt="">`
          : `<div class="bw-row-avatar bw-row-avatar-fallback">${esc((a.creator_display_name || 'C')[0].toUpperCase())}</div>`}
        <div class="bw-row-main">
          <div class="bw-row-top">
            <div class="bw-row-name">
              <button class="bw-star ${starred ? 'on' : ''}" onclick="_bwToggleShortlist('${a.id}', event)" title="Shortlist">${starred ? '★' : '☆'}</button>
              ${esc(a.creator_display_name || 'Creator')}
              ${a.creator_is_verified ? '<span class="bw-verified" title="Verified">✔️</span>' : ''}
            </div>
            <div class="bw-row-amt">${fmtKES(a.fund_amount_kes)}</div>
          </div>
          <div class="bw-row-sub"><span>⏱ Ready in ${a.delivery_days} day${a.delivery_days == 1 ? '' : 's'}</span>${followers ? `<span class="bw-row-dot">·</span><span>👥 ${followers.toLocaleString()}</span>` : ''}<span class="bw-row-dot">·</span>${_cnStatusPill(a.status)}</div>
          ${a.proposal ? `<div class="bw-row-proposal">${esc(a.proposal)}</div>` : ''}
        </div>
        ${a.status === 'pending' ? `
        <div class="bw-row-actions">
          <button class="cn-btn-sm cn-btn-accept" onclick="event.stopPropagation();_bwSingleAction('${a.id}','accept')">💬 Chat & agree price</button>
          <button class="cn-btn-sm cn-btn-reject" onclick="event.stopPropagation();_bwSingleAction('${a.id}','reject')">No thanks</button>
        </div>` : (a.status === 'accepted' ? `<div class="bw-row-actions"><button class="cn-btn-sm cn-btn-accept" onclick="event.stopPropagation();_bwOpenRow('${a.id}')">Open chat →</button></div>` : '')}
      </div>
    `;
    }).join('') + (_bwLoading ? `<div class="bw-empty">Loading more…</div>` : (!_bwHasMore ? `<div class="bw-list-end"><span>— end of list —</span></div>` : ''));
  }
  _bwUpdateBulkbar();
}

// ─── Selection + bulk actions (New segment only) ───────────────────────────
function _bwToggleSelectRow(id, checked) {
  if (checked) _bwSelected.add(id); else _bwSelected.delete(id);
  _bwUpdateBulkbar();
}

function _bwClearSelection() {
  _bwSelected.clear();
  _bwRenderList();
}

function _bwUpdateBulkbar() {
  const bar = document.getElementById('bwBulkbar');
  if (!bar) return;
  if (_bwSegment !== 'pending' || _bwSelected.size === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = `
    <span class="bw-bulk-icon">☑️</span>
    <span class="bw-bulk-count">${_bwSelected.size} selected</span>
    <button class="cn-btn-sm cn-btn-accept" onclick="_bwBulkAction('accept')">💬 Chat with all</button>
    <button class="cn-btn-sm cn-btn-reject" onclick="_bwBulkAction('reject')">No thanks</button>
    <button class="bw-bulk-clear" onclick="_bwClearSelection()">Clear</button>
  `;
}

async function _bwSingleAction(id, action) {
  try {
    await api(`/connect/campaigns/${_bwCampaignId}/applications/${id}/${action}`, { method: 'POST' });
    toast(action === 'accept' ? 'Chat opened — agree the price, then tap Pay' : 'Done — they\'ve been told', action === 'accept' ? 'success' : 'info');
    _bwSelected.delete(id);
    Store.invalidate(`bidsCounts:${_bwCampaignId}`);
    await _bwRefreshCounts();
    _bwRenderRail();
    if (action === 'accept') {
      // Go straight into the chat with this creator — the next step.
      _bwSegment = 'accepted'; _bwOffset = 0; _bwRows = [];
      _bwRenderRail();
      await _bwFetchPage(true);
      if (_bwRows.find(r => r.id === id)) _bwOpenRow(id);
    } else {
      await _bwFetchPage(true);
    }
  } catch (e) {
    toast(e.message || 'Something went wrong — try again', 'error');
  }
}

async function _bwBulkAction(action) {
  const ids = [..._bwSelected];
  if (!ids.length) return;
  const label = action === 'accept' ? 'Accepting' : 'Rejecting';
  toast(`${label} ${ids.length} bid${ids.length === 1 ? '' : 's'}…`, 'info');
  let ok = 0, fail = 0;
  for (const id of ids) {
    try {
      await api(`/connect/campaigns/${_bwCampaignId}/applications/${id}/${action}`, { method: 'POST' });
      ok++;
    } catch (_) { fail++; }
  }
  toast(`${ok} done${fail ? `, ${fail} failed` : ''}`, fail ? 'error' : 'success');
  _bwSelected.clear();
  Store.invalidate(`bidsCounts:${_bwCampaignId}`);
  await _bwRefreshCounts();
  _bwRenderRail();
  await _bwFetchPage(true);
}

// ─── Detail pane — reparents the shared #cnBidsModalBody markup in, then
// hands off to this file's own chat/negotiate/pay logic (_cnOpenBidChat
// and everything it calls, further down) ────────────────────────────────
function _bwShowDetailEmpty() {
  _bwActiveAppId = null;
  _bwPutBackModalBody();
  const empty = document.getElementById('bwDetailEmpty');
  if (empty) empty.style.display = '';
  _bwSetView('list');
}

function _bwPutBackModalBody() {
  const modalBody = document.getElementById('cnBidsModalBody');
  const oldModal = document.getElementById('cnBidsModal');
  if (modalBody && oldModal && modalBody.parentElement !== oldModal) {
    oldModal.appendChild(modalBody);
  }
}

function _bwOpenRow(appId) {
  const pane = document.getElementById('bwDetailPane');
  const modalBody = document.getElementById('cnBidsModalBody');
  const empty = document.getElementById('bwDetailEmpty');
  if (!pane || !modalBody) return;

  if (!_bwOrigModalBodyParent) _bwOrigModalBodyParent = modalBody.parentElement;
  if (modalBody.parentElement !== pane) pane.appendChild(modalBody);
  if (empty) empty.style.display = 'none';

  _bwActiveAppId = appId;
  _bwRenderList(); // to highlight the active row
  _bwSetView('detail');
  _cnOpenBidChat(_bwCampaignId, appId); // below — chat, negotiate, pay, fund
}

// Back arrow inside the chat view — steps back to the workspace's empty
// state and refreshes the list, since this bid may have moved segments
// (e.g. price agreed, or funded) while its chat was open.
function _cnCloseBidChat() {
  _cnActiveNegotiationApp = null;
  _cnMsgThreadCreatorId = null;
  _bwShowDetailEmpty();
  if (_bwCampaignId) {
    _bwRefreshCounts().then(_bwRenderRail);
    _bwFetchPage(true);
  }
}

// If anything (e.g. this file's own post-funding success flow in
// _cnPollFunding, below) navigates back to the campaign modal while the
// workspace is open, close the workspace out of the way first so the two
// full-screen surfaces never stack.
(function _bwWrapOpenCampaign() {
  const original = _cnOpenCampaign;
  _cnOpenCampaign = async function (campaignId) {
    const wasOpen = document.getElementById('bwOverlay')?.classList.contains('show');
    if (wasOpen) {
      document.getElementById('bwOverlay').classList.remove('show');
      document.body.style.overflow = '';
      _bwPutBackModalBody();
      _bwCampaignId = null;
    }
    return original(campaignId);
  };
})();

// ─── Styles ─────────────────────────────────────────────────────────────────
function _bwInjectStyles() {
  if (document.getElementById('bwStyles')) return;
  const style = document.createElement('style');
  style.id = 'bwStyles';
  style.textContent = `
    .bw-overlay{--cn-accent:#ff7043;--cn-accent-dark:#e0562b;--cn-accent-soft:rgba(255,112,67,.14);
      display:none;position:fixed;inset:0;z-index:1000;background:var(--black);
      font-family:'Montserrat',sans-serif;}
    .bw-overlay.show{display:flex;animation:bwFadeIn .18s ease;}
    @keyframes bwFadeIn{from{opacity:0;}to{opacity:1;}}
    .bw-shell{display:flex;flex-direction:column;width:100%;height:100%;position:relative;}
    .bw-shell::before{content:'';position:absolute;top:0;left:0;right:0;height:220px;pointer-events:none;
      background:radial-gradient(ellipse 60% 100% at 15% 0%,rgba(255,112,67,.07) 0%,transparent 65%);z-index:0;}

    /* ── Topbar ─────────────────────────────────────────────────────── */
    .bw-topbar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:14px 24px;border-bottom:1px solid var(--border);background:var(--navy);flex-shrink:0;
      box-shadow:0 1px 0 rgba(255,255,255,.02) inset,0 8px 24px -18px rgba(0,0,0,.7);}
    .bw-topbar-left{display:flex;align-items:center;gap:13px;}
    .bw-back{background:var(--card);border:1px solid var(--border);color:var(--muted);width:34px;height:34px;
      border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
      transition:color .15s,border-color .15s,transform .15s;}
    .bw-back:hover{color:var(--white);border-color:var(--cn-accent);transform:translateX(-1px);}
    .bw-topbar-icon{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
      font-size:15px;background:var(--cn-accent-soft);border:1px solid rgba(255,112,67,.35);}
    .bw-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--cn-accent);}
    .bw-title{font-size:15.5px;font-weight:800;color:var(--white);margin-top:2px;letter-spacing:-.2px;}

    .bw-body{position:relative;z-index:1;flex:1;display:grid;grid-template-columns:210px minmax(320px,1fr) minmax(340px,42%);
      min-height:0;overflow:hidden;}

    /* ── Rail ───────────────────────────────────────────────────────── */
    .bw-rail{border-right:1px solid var(--border);background:var(--navy);padding:18px 12px;overflow-y:auto;}
    .bw-rail-label{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);
      padding:0 8px;margin-bottom:8px;}
    .bw-rail-divider{height:1px;background:var(--border);margin:14px 4px 16px;}
    .bw-rail-item{width:100%;display:flex;align-items:center;gap:9px;
      background:none;border:1px solid transparent;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:700;
      padding:9px 10px;border-radius:10px;cursor:pointer;margin-bottom:3px;text-align:left;
      transition:background .15s,color .15s,border-color .15s;position:relative;}
    .bw-rail-item:hover{background:var(--card);color:var(--white);}
    .bw-rail-item.active{background:var(--cn-accent-soft);color:var(--white);border-color:rgba(255,112,67,.3);}
    .bw-rail-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);
      width:3px;height:16px;border-radius:3px;background:var(--cn-accent);}
    .bw-rail-item-icon{font-size:13px;flex-shrink:0;opacity:.9;}
    .bw-rail-item-label{flex:1;min-width:0;}
    .bw-rail-count{background:var(--card);color:var(--muted);border-radius:10px;padding:1.5px 8px;font-size:10.5px;font-weight:800;}
    .bw-rail-count.has-count{color:#c3d3e0;}
    .bw-rail-item.active .bw-rail-count{background:var(--cn-accent);color:#fff;}
    .bw-rail-check{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);
      padding:4px 6px;cursor:pointer;margin-bottom:10px;transition:color .15s;}
    .bw-rail-check:hover{color:#c3d3e0;}
    .bw-rail-check input{accent-color:var(--cn-accent);}
    .bw-rail-field{padding:0 6px;margin-bottom:12px;}
    .bw-rail-field label{display:block;font-size:10.5px;font-weight:700;color:var(--muted);margin-bottom:5px;}
    .bw-rail-field input,.bw-rail-field select{width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;
      padding:7px 9px;color:var(--white);font-size:12px;font-family:inherit;transition:border-color .15s;}
    .bw-rail-field input:focus,.bw-rail-field select:focus{outline:none;border-color:var(--cn-accent);}
    .bw-rail-hint{font-size:10.5px;color:var(--muted);line-height:1.5;padding:0 6px;}

    /* ── List column ────────────────────────────────────────────────── */
    .bw-list-col{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--border);background:rgba(255,255,255,.008);}
    .bw-list-toolbar{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0;}
    .bw-filter-btn{display:none;flex-shrink:0;width:38px;height:38px;align-items:center;justify-content:center;
      background:var(--navy);border:1px solid var(--border);border-radius:9px;color:var(--white);font-size:15px;cursor:pointer;}
    .bw-filter-btn:hover{border-color:var(--cn-accent);}
    .bw-rail-close{display:none;width:100%;background:none;border:none;border-bottom:1px solid var(--border);
      color:var(--muted);font-size:11.5px;font-weight:700;text-align:left;padding:0 8px 14px;margin-bottom:14px;cursor:pointer;}
    .bw-rail-close:hover{color:var(--white);}
    .bw-rail-scrim{display:none;}
    .bw-search-wrap{position:relative;flex:1;min-width:0;}
    .bw-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:11.5px;opacity:.55;pointer-events:none;}
    .bw-search{width:100%;background:var(--navy);border:1px solid var(--border);border-radius:9px;
      padding:9px 11px 9px 30px;color:var(--white);font-size:12.5px;font-family:inherit;transition:border-color .15s;}
    .bw-search:focus{outline:none;border-color:var(--cn-accent);}
    .bw-sort{flex-shrink:0;background:var(--navy);border:1px solid var(--border);border-radius:9px;
      padding:9px 8px;color:var(--white);font-size:12px;font-family:inherit;cursor:pointer;transition:border-color .15s;}
    .bw-sort:focus{outline:none;border-color:var(--cn-accent);}

    .bw-bulkbar{align-items:center;gap:10px;padding:10px 14px;background:var(--cn-accent-soft);
      border-bottom:1px solid rgba(255,112,67,.3);flex-shrink:0;animation:bwFadeIn .12s ease;}
    .bw-bulk-icon{font-size:13px;}
    .bw-bulk-count{font-size:12px;font-weight:800;color:var(--white);margin-right:2px;}
    .bw-bulk-clear{background:none;border:none;color:var(--muted);font-size:11.5px;cursor:pointer;
      margin-left:auto;text-decoration:underline;transition:color .15s;}
    .bw-bulk-clear:hover{color:var(--white);}

    .bw-list{flex:1;overflow-y:auto;padding:12px;}
    .bw-row{display:flex;gap:11px;align-items:flex-start;background:var(--navy);border:1px solid var(--border);
      border-radius:13px;padding:13px 14px;margin-bottom:9px;cursor:pointer;position:relative;
      transition:border-color .15s,transform .12s,box-shadow .15s;}
    .bw-row:hover{border-color:rgba(255,112,67,.45);transform:translateY(-1px);box-shadow:0 10px 22px -14px rgba(0,0,0,.7);}
    .bw-row.active{border-color:var(--cn-accent);background:linear-gradient(180deg,var(--cn-accent-soft),var(--navy) 70%);
      box-shadow:0 10px 24px -14px rgba(255,112,67,.25);}
    .bw-row.active::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--cn-accent);}
    .bw-row-check{margin-top:3px;flex-shrink:0;width:15px;height:15px;accent-color:var(--cn-accent);cursor:pointer;}
    .bw-row-avatar{width:36px;height:36px;border-radius:50%;flex-shrink:0;object-fit:cover;margin-top:1px;
      border:1.5px solid var(--border);}
    .bw-row-avatar-fallback{display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
      color:#fff;background:linear-gradient(135deg,var(--cn-accent),var(--cn-accent-dark));border-color:transparent;}
    .bw-row-main{flex:1;min-width:0;}
    .bw-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .bw-row-name{font-size:12.5px;font-weight:800;color:var(--white);display:flex;align-items:center;gap:6px;min-width:0;}
    .bw-star{background:none;border:none;color:var(--muted);font-size:15px;cursor:pointer;padding:0;line-height:1;
      flex-shrink:0;transition:color .15s,transform .1s;}
    .bw-star:hover{color:var(--gold);transform:scale(1.12);}
    .bw-star.on{color:var(--gold);}
    .bw-verified{color:#2196f3;font-size:11px;flex-shrink:0;}
    .bw-row-amt{font-family:'Montserrat',sans-serif;font-weight:800;color:var(--green);font-size:12.5px;white-space:nowrap;
      background:rgba(61,212,74,.12);border:1px solid rgba(61,212,74,.25);border-radius:20px;padding:3px 10px;flex-shrink:0;}
    .bw-row-sub{font-size:11px;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
    .bw-row-dot{opacity:.5;}
    .bw-row-proposal{font-size:12px;color:#c3d3e0;margin-top:9px;line-height:1.45;
      border-left:2px solid var(--border);padding-left:9px;}
    .bw-row-actions{display:flex;gap:8px;margin-top:11px;flex-shrink:0;}
    .bw-row-actions .cn-btn-sm{padding:7px 14px;border-radius:20px;font-size:11px;letter-spacing:.2px;transition:filter .15s,transform .1s;}
    .bw-row-actions .cn-btn-sm:hover{filter:brightness(1.08);transform:translateY(-1px);}
    .bw-bulkbar .cn-btn-sm{padding:6px 14px;border-radius:20px;font-size:11px;flex:none;}
    .bw-empty{font-size:12px;color:var(--muted);text-align:center;padding:44px 16px;}
    .bw-empty-icon{font-size:26px;margin-bottom:10px;opacity:.55;}
    .bw-list-end{font-size:10.5px;color:var(--muted);text-align:center;padding:14px 0 6px;letter-spacing:.3px;opacity:.7;}

    /* ── Detail pane ────────────────────────────────────────────────── */
    .bw-detail{display:flex;flex-direction:column;min-height:0;overflow-y:auto;padding:18px 20px;}
    .bw-detail-empty{margin:auto;text-align:center;color:var(--muted);font-size:12.5px;max-width:260px;}
    .bw-detail-empty-icon{width:56px;height:56px;margin:0 auto 16px;border-radius:50%;font-size:22px;
      display:flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--border);opacity:.9;}
    .bw-detail-empty-title{font-size:13.5px;font-weight:800;color:var(--white);margin-bottom:6px;}
    .bw-detail-empty-sub{font-size:11.5px;line-height:1.55;color:var(--muted);}

    /* ── Scrollbars (dark theme) ────────────────────────────────────── */
    .bw-rail::-webkit-scrollbar,.bw-list::-webkit-scrollbar,.bw-detail::-webkit-scrollbar{width:8px;}
    .bw-rail::-webkit-scrollbar-track,.bw-list::-webkit-scrollbar-track,.bw-detail::-webkit-scrollbar-track{background:transparent;}
    .bw-rail::-webkit-scrollbar-thumb,.bw-list::-webkit-scrollbar-thumb,.bw-detail::-webkit-scrollbar-thumb{
      background:var(--border);border-radius:8px;}
    .bw-rail::-webkit-scrollbar-thumb:hover,.bw-list::-webkit-scrollbar-thumb:hover,.bw-detail::-webkit-scrollbar-thumb:hover{background:#354867;}

    /* ── Mobile (≤768px) — only room for one pane at a time. Rail and
       detail become full-height slide-in overlays over the list, driven
       by .bw-body's [data-view] attribute ("list" default | "rail" |
       "detail") instead of the old fixed 3-column grid, which at any
       width below ~980px still tried to cram a 150px rail next to a
       260px-minimum list — more than most phone screens are wide. ────*/
    @media(max-width:768px){
      .bw-topbar{padding:11px 14px;gap:8px;}
      .bw-topbar-icon{width:30px;height:30px;font-size:13px;}
      .bw-title{font-size:14px;}
      .bw-eyebrow{font-size:9.5px;}
      .bw-topbar-right .btn-secondary{padding:8px 10px;font-size:12px;}
      .bw-invite-label{display:none;}

      .bw-filter-btn{display:flex;}
      .bw-rail-close{display:block;}

      .bw-body{grid-template-columns:1fr;position:relative;overflow:hidden;}
      .bw-list-col{width:100%;border-right:none;}

      .bw-rail,.bw-detail{position:absolute;top:0;bottom:0;left:0;z-index:6;
        background:var(--navy);transition:transform .22s ease;}
      .bw-rail{width:86%;max-width:320px;transform:translateX(-105%);
        box-shadow:18px 0 32px -20px rgba(0,0,0,.7);}
      .bw-detail{width:100%;right:0;background:var(--black);transform:translateX(105%);}

      .bw-body[data-view="rail"] .bw-rail{transform:translateX(0);}
      .bw-body[data-view="detail"] .bw-detail{transform:translateX(0);}

      .bw-rail-scrim{display:block;position:absolute;inset:0;z-index:5;
        background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s ease;}
      .bw-body[data-view="rail"] .bw-rail-scrim{opacity:1;pointer-events:auto;}

      /* Bid rows: actions go full-width UNDER the details instead of
         squeezing the name/price into a 90px column (names used to
         overlap the price and the proposal read one word per line). */
      .bw-row{flex-wrap:wrap;padding:12px;}
      .bw-row-main{flex:1 1 0;min-width:0;}
      .bw-row-top{flex-wrap:wrap;row-gap:6px;}
      .bw-row-name{flex:1 1 140px;flex-wrap:wrap;font-size:13.5px;}
      .bw-row-amt{font-size:13px;}
      .bw-row-sub{font-size:12px;}
      .bw-row-proposal{font-size:13px;}
      .bw-row-actions{flex:1 1 100%;width:100%;margin-top:10px;}
      .bw-row-actions .cn-btn-sm{flex:1;padding:11px 10px;font-size:12.5px;}
      .bw-list{padding:10px;}
      .bw-list-toolbar{flex-wrap:wrap;padding:10px;}
      .bw-search{font-size:16px;}
      .bw-segtabs{display:grid !important;}
      .bw-detail{padding:0;}
      #cnBidsModalBody .cn-bidchat-scroll{padding:12px 12px 0;}
      #cnBidsModalBody #cnMsgInputRow{padding:0 12px 12px !important;}
      .bw-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw;}
    }
    .bw-segtabs{display:none;grid-template-columns:repeat(4,1fr);gap:5px;width:100%;margin-bottom:2px;}
    .bw-segtab{background:var(--navy);border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:8px 4px;font-size:11.5px;font-weight:800;font-family:inherit;cursor:pointer;line-height:1.2;}
    .bw-segtab span{display:block;font-size:13px;color:var(--white);margin-top:2px;}
    .bw-segtab.active{background:var(--cn-accent-soft);border-color:var(--cn-accent);color:var(--white);}
  `;
  document.head.appendChild(style);
}
// ─── Bid chat, negotiate price, pay sheet + fund (moved from connect.js —
// this is the ONLY place any of this renders now) ──────────────────────
function _cnOpenBidChat(campaignId, applicationId) {
  const app = _bwRows.find(a => a.id === applicationId);
  if (!app) return;
  _cnActiveNegotiationApp = app;
  _cnMsgThreadCreatorId = app.creator_user_id;

  const detail = document.getElementById('cnBidsModalBody');
  if (!detail) return;
  detail.innerHTML = `
    <div class="cn-bidchat-head">
      <button class="cn-bidchat-back" onclick="_cnCloseBidChat()" aria-label="Back to bids list">←</button>
      <div>
        <div class="cn-bidchat-title">${esc(app.creator_display_name || 'Creator')}</div>
        <div class="cn-bidchat-sub">${_cnStatusPill(app.status)}</div>
      </div>
    </div>
    <div class="cn-bidchat-scroll">
      <div class="cn-msgs" id="cnMsgList"><div style="color:var(--muted);font-size:12px;padding:14px 0;text-align:center;">Loading…</div></div>
      <div id="cnMsgActionCard"></div>
    </div>
    <div id="cnMsgInputRow" style="padding:0 16px 14px;"></div>
  `;
  _cnRenderBidChatActionCard();
  _cnRenderMsgInputRow(campaignId);
  _cnLoadMessages(campaignId, app.creator_user_id);
}

function _cnRenderBidChatActionCard() {
  const el = document.getElementById('cnMsgActionCard');
  if (!el) return;
  const c = _cnCurrentCampaign;
  const app = _cnActiveNegotiationApp;
  let html = '';
  if (app && app.status === 'accepted' && c.status === 'published') {
    html += `<div class="cn-deal-panel">`
      + _cnNegotiationBannerHtml({ fundAmount: app.fund_amount_kes, bidAmount: app.bid_amount_kes, agreedAmount: app.agreed_amount_kes });
    html += `<div style="padding:10px 12px;"><button class="cn-pay-btn" style="margin-bottom:6px;" onclick="_cnOpenPaySheet('${c.id}','${app.id}')">💳 Pay ${fmtKES(app.fund_amount_kes)} & hire</button><div style="font-size:11.5px;color:var(--muted);text-align:center;line-height:1.4;">EndaViral holds the money. The creator is only paid after you approve the video.</div></div>`;
    html += `</div>`;
  }
  el.innerHTML = html;
}

// Kept for backward compatibility with any external caller — new code
// should call _cnRenderBidChatActionCard directly.
function _cnRenderActionCard() { _cnRenderBidChatActionCard(); }

function _cnPlatformProcessingFee(amountKes) {
  if (amountKes < 1000) return 30;
  if (amountKes < 5000) return 50;
  if (amountKes < 10000) return 75;
  return 100;
}

// ─── Pay Sheet — the ONLY place the KES breakdown is shown, and only after
// the business taps Pay in a bid's chat. Two steps in the same modal:
//  1. Confirm — the amount is editable (see below), plus the M-Pesa number
//     to pay from.
//  2. Breakdown + Pay — budget/fee/total appears only once step 1 is
//     confirmed, then the STK push goes out.
//
// The amount field lets the business type in whatever price they actually
// agreed with the creator (in case it moved on since the last accepted
// offer), but it can NEVER skip straight to funding at a number the
// creator hasn't agreed to — connect.py's fund_campaign still only ever
// charges coalesce(agreed_amount_kes, bid_amount_kes) server-side, and the
// creator is still the only one who can accept a price (see connect.py's
// accept_price: "you can't accept your own offer"). So Continue checks the
// typed amount against the currently agreed one: unchanged goes straight
// to the funding breakdown as before; changed sends it as a normal price
// offer (the same /negotiate/offer call the chat's 💰 button uses) and
// hands back to the bid chat to wait for the creator's accept. ───────────
function _cnOpenPaySheet(campaignId, applicationId) {
  const app = (_cnActiveNegotiationApp && _cnActiveNegotiationApp.id === applicationId)
    ? _cnActiveNegotiationApp
    : _bwRows.find(a => a.id === applicationId);
  if (!app) return;
  const body = document.getElementById('cnBidsModalBody');
  if (!body) return;
  const phone = (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) ? currentUser.phone : '';
  // One screen: what you pay, the M-Pesa number, one big Pay button. The
  // old two-step sheet asked for the phone number twice. A different price
  // still has to go through the creator (server only charges the agreed
  // amount), so that's a separate, clearly-labelled link.
  body.innerHTML = `
    <div style="padding:16px 16px 0;">
      <button class="cn-bidchat-back" style="margin-bottom:14px;display:flex;" onclick="_cnCancelPaySheet('${campaignId}','${applicationId}')" aria-label="Back to chat">←</button>
      <div class="modal-title" style="margin-bottom:2px;">Pay & hire ${esc(app.creator_display_name || 'creator')}</div>
      <div class="modal-sub" style="margin-bottom:14px;">You'll get an M-Pesa PIN prompt on your phone.</div>
      ${_cnFundFormHtml(applicationId, Number(app.fund_amount_kes), phone)}
      <details style="margin-top:14px;">
        <summary style="font-size:12.5px;color:var(--muted);cursor:pointer;">Agreed a different price?</summary>
        <div class="cn-paysheet-field" style="margin-top:10px;">
          <input type="number" min="200" step="1" inputmode="numeric" id="cnPayAmount" class="cn-paysheet-amt-input" placeholder="New price (KES)">
          <div class="cn-paysheet-amt-hint">We'll send this to ${esc(app.creator_display_name || 'the creator')} to agree first. You can pay once they agree.</div>
          <button class="btn-secondary" id="cnPaySheetContinueBtn" style="width:100%;margin-top:8px;" onclick="_cnContinuePaySheet('${campaignId}','${applicationId}')">💬 Send new price</button>
        </div>
      </details>
    </div>
  `;
}

// Flips the Continue button's label the moment the typed amount stops
// matching what's currently agreed, so it's clear before they click that
// this will send a new offer rather than go straight to payment.
function _cnPaySheetSyncButton(applicationId) {
  const btn = document.getElementById('cnPaySheetContinueBtn');
  const amountInput = document.getElementById('cnPayAmount');
  if (!btn || !amountInput || btn.disabled) return;
  const app = (_cnActiveNegotiationApp && _cnActiveNegotiationApp.id === applicationId)
    ? _cnActiveNegotiationApp
    : _bwRows.find(a => a.id === applicationId);
  if (!app) return;
  const amount_kes = parseFloat(amountInput.value);
  const changed = !amount_kes || amount_kes <= 0 || Math.abs(amount_kes - Number(app.fund_amount_kes)) > 0.005;
  btn.textContent = changed ? '💬 Propose This Price' : 'Continue';
}

// Cancelling the pay sheet (before Continue) just steps back to that bid's
// chat — never closes the whole modal, since the negotiation itself is
// untouched.
function _cnCancelPaySheet(campaignId, applicationId) {
  _cnStopFundPolling();
  _cnOpenBidChat(campaignId, applicationId);
}

function _cnContinuePaySheet(campaignId, applicationId) {
  const app = (_cnActiveNegotiationApp && _cnActiveNegotiationApp.id === applicationId)
    ? _cnActiveNegotiationApp
    : _bwRows.find(a => a.id === applicationId);
  if (!app) return;
  const amountInput = document.getElementById('cnPayAmount');
  const amount_kes = parseFloat(amountInput ? amountInput.value : '');
  const amtErr = (typeof _cnAmountError === 'function') ? _cnAmountError(amount_kes, 'Price') : (!amount_kes ? 'Enter a price' : null);
  if (amtErr) { toast(amtErr, 'error'); return; }
  if (Math.abs(amount_kes - Number(app.fund_amount_kes)) <= 0.005) { toast('That is already the agreed price — just tap Pay above', 'info'); return; }

  // Unchanged from what's already agreed → straight to the funding
  // breakdown, same as before. Changed → this is a new price, so it goes
  // out as a proposal (never straight to funding — see the header note
  // above this pay sheet for why).
  if (Math.abs(amount_kes - Number(app.fund_amount_kes)) > 0.005) {
    _cnProposePriceFromPaySheet(campaignId, applicationId, amount_kes);
    return;
  }

}

async function _cnProposePriceFromPaySheet(campaignId, applicationId, amount_kes) {
  const btn = document.getElementById('cnPaySheetContinueBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    await api(`/connect/campaigns/${campaignId}/negotiate/offer`, {
      method: 'POST',
      body: JSON.stringify({ amount_kes, application_id: applicationId }),
    });
    toast('New price sent — you can pay once they agree', 'success');
    _cnOpenBidChat(campaignId, applicationId);
  } catch (e) {
    toast(e.message || 'Could not propose that price', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💬 Send new price'; }
  }
}

function _cnStopFundPolling() {
  if (_cnFundPollTimer) { clearInterval(_cnFundPollTimer); _cnFundPollTimer = null; }
  if (typeof PaymentEvents !== 'undefined' && _cnLastFundCheckoutId) {
    PaymentEvents.off(_cnLastFundCheckoutId);
  }
}

function _cnFundFormHtml(applicationId, fundAmount, phone) {
  const fee = _cnPlatformProcessingFee(fundAmount);
  const total = fundAmount + fee;
  return `
    <div class="cn-fund-breakdown" style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);padding:2px 0;">
        <span>Agreed price (for the creator)</span><span>${fmtKES(fundAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);padding:2px 0;">
        <span>M-Pesa & safety fee</span><span>${fmtKES(fee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;color:var(--white);padding:6px 0 4px;margin-top:4px;border-top:1px solid var(--border);">
        <span>You pay</span><span>${fmtKES(total)}</span>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:6px;line-height:1.5;">
        🔒 EndaViral keeps the money safe and only pays the creator after you approve the video. If something goes wrong, we help you get it back.
      </div>
    </div>
    <label for="cnFundPhone" style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;">Pay from this M-Pesa number</label>
    <div id="cnFundForm" class="cn-fund-row" style="padding:0;background:none;border:none;">
      <input type="tel" inputmode="tel" id="cnFundPhone" class="cn-fund-phone" value="${esc(phone || '')}" placeholder="07XXXXXXXX">
      <button class="cn-fund-btn" id="cnFundBtn" onclick="_cnSubmitFund('${_cnCurrentCampaign.id}','${applicationId}')">📱 Pay ${fmtKES(total)}</button>
    </div>
    <div id="cnFundStatus" style="display:none;text-align:center;padding:16px 0 6px;">
      <div style="font-size:30px;margin-bottom:6px;" id="cnFundIcon">📱</div>
      <div style="font-weight:800;color:var(--white);margin-bottom:4px;font-size:14px;" id="cnFundTitle">Check your phone</div>
      <div style="font-size:12.5px;color:var(--muted);" id="cnFundDesc">Enter your M-Pesa PIN to pay ${fmtKES(total)}. Keep this screen open.</div>
    </div>
    <div style="text-align:center;padding-top:10px;">
      <a href="javascript:void(0)" onclick="_cnOpenFundingIssueModal('${_cnCurrentCampaign.id}','${esc(phone || '')}')" style="font-size:11.5px;color:var(--muted);text-decoration:underline;">
        Paid but it didn't go through? Tell us
      </a>
    </div>
  `;
}

async function _cnSubmitFund(campaignId, applicationId) {
  const phone = document.getElementById('cnFundPhone').value.trim();
  if (!phone) { toast('Enter your M-Pesa number', 'error'); return; }

  const btn = document.getElementById('cnFundBtn');
  const btnLabel = btn.textContent;
  btn.disabled = true; btn.textContent = 'Sending…';

  let data;
  try {
    data = await api(`/connect/campaigns/${campaignId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ phone, application_id: applicationId }),
    });
  } catch (e) {
    toast(e.message || 'Could not start payment', 'error');
    btn.disabled = false; btn.textContent = btnLabel;
    return;
  }

  document.getElementById('cnFundForm').style.display = 'none';
  document.getElementById('cnFundStatus').style.display = '';
  _cnLastFundCheckoutId = data.checkoutRequestId;
  _cnPollFunding(campaignId, applicationId, data.checkoutRequestId);
}

function _cnPollFunding(campaignId, applicationId, checkoutRequestId) {
  let attempts = 0;
  const maxAttempts = 20; // 60s at 3s interval — active DB polling stops here;
                           // the webhook/reconciler is expected to resolve it
                           // from this point on, see the PaymentEvents note below
  if (_cnFundPollTimer) clearInterval(_cnFundPollTimer);

  async function tick() {
    attempts++;
    let data;
    try {
      data = await api(`/connect/campaigns/${campaignId}/funding-status/${encodeURIComponent(checkoutRequestId)}`);
      console.log('[EndaViral Connect] funding-status poll', attempts, data);
    } catch (e) {
      console.error('[EndaViral Connect] funding-status poll failed', attempts, e);
      return;
    }

    const icon = document.getElementById('cnFundIcon');
    const title = document.getElementById('cnFundTitle');
    const desc = document.getElementById('cnFundDesc');

    // Accept both 'success' and 'completed' as the terminal success value —
    // mirrors index.html's order-payment poller (startPaymentPoll) and
    // wallet-deposit poller, which both check for either string. The
    // campaign funding poller here previously checked 'success' only, so a
    // funding-status response of 'completed' was silently never recognized:
    // the poll just kept running until it timed out, the UI never called
    // _cnOpenCampaign() to refresh, and the chat kept showing stale
    // Pay/Fund Now buttons even though the payment (and the backend's
    // campaign.status/application.status flip in connect.py) had already
    // gone through.
    if (data.status === 'success' || data.status === 'completed') {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      if (typeof PaymentEvents !== 'undefined') PaymentEvents.off(checkoutRequestId);
      if (icon) icon.textContent = '✅';
      if (title) title.textContent = 'Paid ✓ — creator can start';
      if (desc) {
        const feeNote = data.platform_processing_fee_kes
          ? ` (incl. ${fmtKES(data.platform_processing_fee_kes)} processing fee)`
          : '';
        desc.textContent = `You paid ${fmtKES(data.total_charge_kes || data.amount_kes)}${feeNote}. EndaViral is holding it until you approve the video.`;
      }
      const statusEl = document.getElementById('cnFundStatus');
      if (statusEl && !document.getElementById('cnFundReceiptBtn')) {
        const btn = document.createElement('button');
        btn.id = 'cnFundReceiptBtn';
        btn.className = 'btn-secondary';
        btn.style.cssText = 'margin-top:12px;';
        btn.textContent = '⬇️ Download Receipt';
        btn.onclick = () => _cnDownloadReceipt(campaignId, checkoutRequestId);
        statusEl.appendChild(btn);
      }
      toast('🎉 Paid! The creator has been told to start.', 'success');
      Store.invalidate('connectCampaigns');
      Store.invalidate('connectWork');
        setTimeout(() => {
        _cnStopFundPolling();
        // Refetch the campaign so _cnCurrentCampaign.status reflects FUNDED,
        // then reopen this same bid's chat instead of leaving the workspace.
        api(`/connect/campaigns/${campaignId}`).then(updatedCampaign => {
            _cnCurrentCampaign = updatedCampaign;
            _cnOpenBidChat(campaignId, applicationId); // back to the chat, not _cnOpenCampaign
        });
        }, 2400);


    } else if (data.status === 'failed' || data.status === 'cancelled') {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      if (typeof PaymentEvents !== 'undefined') PaymentEvents.off(checkoutRequestId);
      if (icon) icon.textContent = '❌';
      if (title) title.textContent = data.status === 'cancelled' ? 'Payment cancelled' : 'Payment didn\'t go through';
      if (desc) desc.textContent = 'No money was taken. You can try again.';
      const retryForm = document.getElementById('cnFundForm');
      const statusEl = document.getElementById('cnFundStatus');
      setTimeout(() => {
        if (retryForm) retryForm.style.display = '';
        if (statusEl) statusEl.style.display = 'none';
        const btn = document.getElementById('cnFundBtn');
        if (btn) { btn.disabled = false; }
      }, 1800);
    } else if (attempts >= maxAttempts) {
      clearInterval(_cnFundPollTimer); _cnFundPollTimer = null;
      // Deliberately NOT calling PaymentEvents.off() here — active DB
      // polling stops, but escrow funding (campaign status, winner
      // selection, notifications) is applied entirely server-side
      // (connect_service.apply_nexus_status_to_funding) whenever the
      // webhook or reconciler resolves this checkout, so we stay
      // subscribed to the push and let tick() run one more time,
      // silently, whenever that happens — no further polling required.
      if (desc) desc.textContent = 'Still waiting for M-Pesa. If you already entered your PIN, it will update by itself — please don\'t pay again.';
    }
  }

  _cnFundPollTimer = setInterval(tick, 3000);

  // Real-time nudge — same idea as index.html's startPaymentPoll. The
  // backend pushes a payment_status SSE event the moment Nexus's webhook
  // (or the reconciler) resolves this checkout via
  // connect_service.apply_nexus_status_to_funding; tick() re-reads
  // funding-status itself, so this is just an earlier trigger of the same
  // check, not a second source of truth. The 3s poll above still runs as
  // the reliability fallback if the SSE connection drops.
  if (typeof PaymentEvents !== 'undefined') {
    PaymentEvents.onPaymentStatus(checkoutRequestId, () => tick());
  }
}

// ─── "Payment not reflecting?" support ticket — reachable from every state
// of the fund flow (form, waiting-for-payment, and failed), since the
// whole point of this is covering the case where the STK poll itself
// can't be trusted (closed tab mid-poll, a delayed/lost Nexus callback,
// or the deduction going through without the poll ever catching it).
// Builds its own lightweight overlay rather than depending on index.html
// markup, so it works no matter what's open underneath it. Posts to
// POST /connect/campaigns/{id}/funding/report-issue (connect.py), which
// creates a CampaignFundingIssueReport ticket an admin resolves from the
// Connect admin panel's Payment Issues queue (admin_connect_stats.js).
function _cnOpenFundingIssueModal(campaignId, phone) {
  _cnCloseFundingIssueModal(); // guard against stacking if triggered twice
  const overlay = document.createElement('div');
  overlay.id = 'cnFundingIssueOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.onclick = (e) => { if (e.target === overlay) _cnCloseFundingIssueModal(); };
  overlay.innerHTML = `
    <div style="background:var(--card,#161d2b);border:1px solid var(--border);border-radius:14px;max-width:420px;width:100%;padding:20px;">
      <div style="font-weight:800;color:var(--white);font-size:15px;margin-bottom:4px;">🆘 Paid but not showing?</div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">Tell us and we'll check M-Pesa and fix it. Please don't pay again.</div>
      <label style="font-size:11.5px;color:var(--muted);display:block;margin-bottom:4px;">What happened?</label>
      <textarea id="cnFiMessage" rows="3" placeholder="e.g. Paid via M-Pesa at 2:15pm but the campaign still shows unfunded" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:8px;color:var(--white);padding:8px 10px;font-size:12.5px;margin-bottom:10px;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea>
      <label style="font-size:11.5px;color:var(--muted);display:block;margin-bottom:4px;">M-Pesa code from the SMS (optional)</label>
      <input id="cnFiReceipt" type="text" placeholder="e.g. QGH7XXXXX" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:8px;color:var(--white);padding:8px 10px;font-size:12.5px;margin-bottom:10px;box-sizing:border-box;">
      <label style="font-size:11.5px;color:var(--muted);display:block;margin-bottom:4px;">M-Pesa phone number (optional)</label>
      <input id="cnFiPhone" type="text" value="${esc(phone || '')}" placeholder="07XXXXXXXX" style="width:100%;background:var(--navy);border:1px solid var(--border);border-radius:8px;color:var(--white);padding:8px 10px;font-size:12.5px;margin-bottom:16px;box-sizing:border-box;">
      <div style="display:flex;gap:8px;">
        <button class="btn-secondary" style="flex:1;" onclick="_cnCloseFundingIssueModal()">Cancel</button>
        <button class="btn-primary" id="cnFiSubmitBtn" style="flex:1;" onclick="_cnSubmitFundingIssueReport('${campaignId}')">Send Report</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function _cnCloseFundingIssueModal() {
  const el = document.getElementById('cnFundingIssueOverlay');
  if (el) el.remove();
}

async function _cnSubmitFundingIssueReport(campaignId) {
  const messageEl = document.getElementById('cnFiMessage');
  const message = messageEl ? messageEl.value.trim() : '';
  if (!message) { toast('Tell us what happened', 'error'); return; }
  const mpesa_receipt = document.getElementById('cnFiReceipt').value.trim() || null;
  const phone = document.getElementById('cnFiPhone').value.trim() || null;

  const btn = document.getElementById('cnFiSubmitBtn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await api(`/connect/campaigns/${campaignId}/funding/report-issue`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        checkout_request_id: _cnLastFundCheckoutId || undefined,
        mpesa_receipt,
        phone,
      }),
    });
    toast('Reported — EndaViral support will confirm and get back to you.', 'success');
    _cnCloseFundingIssueModal();
  } catch (e) {
    toast(e.message || 'Could not send report', 'error');
    btn.disabled = false; btn.textContent = 'Send Report';
  }
}