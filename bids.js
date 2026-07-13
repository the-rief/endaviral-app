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
 *   │ Hired   3 ││ [ ] Njeri M    KES 120     ││  (reuses connect.js's    │
 *   │ Closed760 ││ ...infinite scroll...     ││   existing chat/pay/fund │
 *   └───────────┘└───────────────────────────┘└  logic unchanged)────────┘
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
 * REUSE, NOT REBUILD:
 *   The chat thread, price negotiation, pay sheet, STK push + polling,
 *   and receipts are all left completely alone in connect.js — this file
 *   just physically relocates the existing #cnBidsModalBody element (and
 *   everything already wired to render into it) from the old cramped
 *   modal into this workspace's right-hand pane. _cnOpenBidChat,
 *   _cnRenderMsgInputRow, _cnLoadMessages, _cnOpenPaySheet,
 *   _cnSubmitFund, _cnPollFunding etc. are untouched.
 *
 * INTEGRATION: drop-in. No index.html edits needed.
 *   - Load AFTER connect.js:  <script src="bids.js"></script>
 *   - It overrides window._cnOpenBidsInbox / _cnCloseBidsModal /
 *     _cnCloseBidChat (later <script> tag wins) so every existing
 *     "Open Bids Inbox" button keeps working, just opens this instead.
 *   - It reuses the existing #cnBidsModalBody markup already sitting in
 *     index.html's ★MODALS block — nothing there needs to change either.
 *
 * Depends on (all globals already provided by connect.js / the app shell):
 *   esc(), fmtKES(), toast(), api(), currentUser,
 *   _cnCurrentCampaign, _cnBidsCampaignId, _cnBidsTotalLoaded,
 *   _cnOpenBidChat(), _cnOpenCampaign(), _cnOpenInviteModal(), _cnStatusPill()
 * ════════════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────────────────
const BW_PAGE_SIZE = 30;
const BW_SEGMENTS = [
  { key: 'pending',  label: 'New',      statusParam: 'pending' },
  { key: 'accepted', label: 'In talks', statusParam: 'accepted' },
  { key: 'hired',    label: 'Hired',    statusParam: 'hired' },
  { key: 'closed',   label: 'Closed',   statusParam: 'rejected,withdrawn,not_selected' },
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

// ─── Entry point — overrides connect.js's modal opener ─────────────────────
// Every existing "Open Bids Inbox" button calls _cnOpenBidsInbox(campaignId);
// redefining it here (this script loads after connect.js) redirects all of
// them into the workspace without touching a single call site.
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

  _cnBidsCampaignId = campaignId; // keep connect.js's own reference in sync — its chat/pay code reads this

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
          <div>
            <div class="bw-eyebrow">📥 Bids Workspace</div>
            <div class="bw-title" id="bwCampaignTitle">Bids</div>
          </div>
        </div>
        <div class="bw-topbar-right">
          <button class="btn-secondary" id="bwInviteBtn">✉️ Invite a Creator Directly</button>
        </div>
      </div>
      <div class="bw-body">
        <div class="bw-rail" id="bwRail"></div>
        <div class="bw-list-col">
          <div class="bw-list-toolbar" id="bwToolbar"></div>
          <div class="bw-bulkbar" id="bwBulkbar" style="display:none;"></div>
          <div class="bw-list" id="bwList" onscroll="_bwOnListScroll(this)"></div>
        </div>
        <div class="bw-detail" id="bwDetailPane">
          <div class="bw-detail-empty" id="bwDetailEmpty">
            <div class="bw-detail-empty-icon">💬</div>
            <div>Select a bid to see the conversation</div>
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
async function _bwRefreshCounts() {
  try { _cnBidsCounts = await api(`/connect/campaigns/${_bwCampaignId}/applications/counts`); }
  catch (_) { _cnBidsCounts = _cnBidsCounts || {}; }
}

function _bwRenderRail() {
  const rail = document.getElementById('bwRail');
  if (!rail) return;
  const counts = _cnBidsCounts || {};
  const closedN = (counts.rejected || 0) + (counts.withdrawn || 0) + (counts.not_selected || 0);
  const countFor = (key) => key === 'closed' ? closedN : (counts[key] || 0);

  rail.innerHTML = `
    <div class="bw-rail-label">Segments</div>
    ${BW_SEGMENTS.map(s => `
      <button class="bw-rail-item ${_bwSegment === s.key ? 'active' : ''}" onclick="_bwSwitchSegment('${s.key}')">
        <span>${esc(s.label)}</span><span class="bw-rail-count">${countFor(s.key)}</span>
      </button>
    `).join('')}
    <div class="bw-rail-label" style="margin-top:18px;">Filter by</div>
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
  if (_bwSegment === key) return;
  _bwSegment = key;
  _bwOffset = 0;
  _bwRows = [];
  _bwSelected.clear();
  _bwRenderRail();
  _bwFetchPage(true);
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
  el.innerHTML = `
    <input type="text" class="bw-search" placeholder="Search by creator name…" value="${esc(_bwQuery)}" oninput="_bwOnSearchInput(this.value)">
    <select class="bw-sort" onchange="_bwSetSort(this.value)">
      <option value="newest" ${_bwSort === 'newest' ? 'selected' : ''}>Newest first</option>
      <option value="price_low" ${_bwSort === 'price_low' ? 'selected' : ''}>Lowest price</option>
      <option value="price_high" ${_bwSort === 'price_high' ? 'selected' : ''}>Highest price</option>
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
    _cnBidsTotalLoaded = _bwRows; // keep connect.js's chat/pay lookups (by id) in sync
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
    const base = _bwSegment === 'pending' ? 'No new bids yet — check back soon, or invite a creator directly.'
      : _bwSegment === 'accepted' ? 'No active negotiations right now.'
      : _bwSegment === 'hired' ? 'No one hired yet.'
      : 'Nothing here yet.';
    const msg = (_bwShortlistOnly || _bwMaxPrice !== '') ? 'Nothing matches your current filters.' : base;
    listEl.innerHTML = `<div class="bw-empty">${esc(msg)}</div>`;
  } else {
    listEl.innerHTML = visible.map(a => {
      const starred = _bwShortlist.has(a.id);
      const followers = a.creator_followers_count;
      return `
      <div class="bw-row ${_bwActiveAppId === a.id ? 'active' : ''}" onclick="_bwOpenRow('${a.id}')">
        ${canBulk ? `<input type="checkbox" class="bw-row-check" onclick="event.stopPropagation()" ${_bwSelected.has(a.id) ? 'checked' : ''} onchange="_bwToggleSelectRow('${a.id}', this.checked)">` : ''}
        ${a.creator_avatar_url
          ? `<img class="bw-row-avatar" src="${esc(a.creator_avatar_url)}" alt="">`
          : `<div class="bw-row-avatar bw-row-avatar-fallback">${esc((a.creator_display_name || 'C')[0].toUpperCase())}</div>`}
        <div class="bw-row-main">
          <div class="bw-row-top">
            <div class="bw-row-name">
              <button class="bw-star ${starred ? 'on' : ''}" onclick="_bwToggleShortlist('${a.id}', event)" title="Shortlist">${starred ? '★' : '☆'}</button>
              ${esc(a.creator_display_name || 'Creator')}
              ${a.creator_is_verified ? '<span title="Verified" style="color:#2196f3;">✔️</span>' : ''}
            </div>
            <div class="bw-row-amt">${fmtKES(a.fund_amount_kes)}</div>
          </div>
          <div class="bw-row-sub">delivery in ${a.delivery_days} day${a.delivery_days == 1 ? '' : 's'}${followers ? ` · ${followers.toLocaleString()} followers` : ''} · ${_cnStatusPill(a.status)}</div>
          ${a.proposal ? `<div class="bw-row-proposal">${esc(a.proposal)}</div>` : ''}
        </div>
        ${a.status === 'pending' ? `
        <div class="bw-row-actions">
          <button class="cn-btn-sm cn-btn-accept" onclick="event.stopPropagation();_bwSingleAction('${a.id}','accept')">Accept</button>
          <button class="cn-btn-sm cn-btn-reject" onclick="event.stopPropagation();_bwSingleAction('${a.id}','reject')">Reject</button>
        </div>` : ''}
      </div>
    `;
    }).join('') + (_bwLoading ? `<div class="bw-empty">Loading more…</div>` : (!_bwHasMore ? `<div class="bw-list-end">— end of list —</div>` : ''));
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
    <span class="bw-bulk-count">${_bwSelected.size} selected</span>
    <button class="cn-btn-sm cn-btn-accept" onclick="_bwBulkAction('accept')">Accept</button>
    <button class="cn-btn-sm cn-btn-reject" onclick="_bwBulkAction('reject')">Reject</button>
    <button class="bw-bulk-clear" onclick="_bwClearSelection()">Clear</button>
  `;
}

async function _bwSingleAction(id, action) {
  try {
    await api(`/connect/campaigns/${_bwCampaignId}/applications/${id}/${action}`, { method: 'POST' });
    toast(action === 'accept' ? 'Bid accepted — negotiate a price in chat, then fund when ready' : 'Bid rejected', action === 'accept' ? 'success' : 'info');
    _bwSelected.delete(id);
    await _bwRefreshCounts();
    _bwRenderRail();
    await _bwFetchPage(true);
  } catch (e) {
    toast(e.message || `Could not ${action} bid`, 'error');
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
  toast(`${ok} bid${ok === 1 ? '' : 's'} ${action === 'accept' ? 'accepted' : 'rejected'}${fail ? `, ${fail} failed` : ''}`, fail ? 'error' : 'success');
  _bwSelected.clear();
  await _bwRefreshCounts();
  _bwRenderRail();
  await _bwFetchPage(true);
}

// ─── Detail pane — reparents connect.js's existing #cnBidsModalBody in,
// then hands off entirely to connect.js's unchanged chat/negotiate/pay
// logic (_cnOpenBidChat and everything it calls) ────────────────────────
function _bwShowDetailEmpty() {
  _bwActiveAppId = null;
  _bwPutBackModalBody();
  const empty = document.getElementById('bwDetailEmpty');
  if (empty) empty.style.display = '';
  document.querySelector('.bw-body')?.classList.remove('bw-detail-open');
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
  document.querySelector('.bw-body')?.classList.add('bw-detail-open');
  _cnOpenBidChat(_bwCampaignId, appId); // unchanged connect.js logic — chat, negotiate, pay, fund
}

// Back arrow inside the chat view — connect.js's own _cnCloseBidChat used to
// step back to its OLD list-in-modal renderer. Overridden here so it steps
// back to the workspace's empty state and refreshes the list instead of
// clobbering #cnBidsModalBody with the old shell markup.
function _cnCloseBidChat() {
  _cnActiveNegotiationApp = null;
  _cnMsgThreadCreatorId = null;
  _bwShowDetailEmpty();
  if (_bwCampaignId) {
    _bwRefreshCounts().then(_bwRenderRail);
    _bwFetchPage(true);
  }
}

// If anything (e.g. the post-funding success flow inside connect.js's
// _cnPollFunding) navigates back to the campaign modal while the
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
      display:none;position:fixed;inset:0;z-index:1000;background:var(--black);}
    .bw-overlay.show{display:flex;}
    .bw-shell{display:flex;flex-direction:column;width:100%;height:100%;}

    .bw-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:14px 22px;border-bottom:1px solid var(--border);background:var(--navy);flex-shrink:0;}
    .bw-topbar-left{display:flex;align-items:center;gap:14px;}
    .bw-back{background:var(--card);border:1px solid var(--border);color:var(--muted);width:34px;height:34px;
      border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    .bw-back:hover{color:var(--white);border-color:var(--cn-accent);}
    .bw-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--cn-accent);}
    .bw-title{font-size:15px;font-weight:800;color:var(--white);margin-top:1px;}

    .bw-body{flex:1;display:grid;grid-template-columns:200px minmax(320px,1fr) minmax(340px,42%);
      min-height:0;overflow:hidden;}

    .bw-rail{border-right:1px solid var(--border);background:var(--navy);padding:16px 12px;overflow-y:auto;}
    .bw-rail-label{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);
      padding:0 6px;margin-bottom:8px;}
    .bw-rail-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
      background:none;border:none;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:700;
      padding:9px 10px;border-radius:9px;cursor:pointer;margin-bottom:2px;text-align:left;}
    .bw-rail-item:hover{background:var(--card);color:var(--white);}
    .bw-rail-item.active{background:var(--cn-accent-soft);color:var(--white);}
    .bw-rail-count{background:var(--card);color:var(--muted);border-radius:10px;padding:1px 8px;font-size:10.5px;}
    .bw-rail-item.active .bw-rail-count{background:var(--cn-accent);color:#fff;}
    .bw-rail-check{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);
      padding:4px 6px;cursor:pointer;margin-bottom:10px;}
    .bw-rail-field{padding:0 6px;margin-bottom:10px;}
    .bw-rail-field label{display:block;font-size:10.5px;color:var(--muted);margin-bottom:4px;}
    .bw-rail-field input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;
      padding:7px 9px;color:var(--white);font-size:12px;font-family:inherit;}
    .bw-rail-field input:focus{outline:none;border-color:var(--cn-accent);}
    .bw-rail-hint{font-size:10.5px;color:var(--muted);line-height:1.5;padding:0 6px;}

    .bw-list-col{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--border);}
    .bw-list-toolbar{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0;}
    .bw-search{flex:1;min-width:0;background:var(--navy);border:1px solid var(--border);border-radius:9px;
      padding:9px 11px;color:var(--white);font-size:12.5px;font-family:inherit;}
    .bw-search:focus{outline:none;border-color:var(--cn-accent);}
    .bw-sort{flex-shrink:0;background:var(--navy);border:1px solid var(--border);border-radius:9px;
      padding:9px 8px;color:var(--white);font-size:12px;font-family:inherit;cursor:pointer;}

    .bw-bulkbar{align-items:center;gap:10px;padding:9px 14px;background:var(--cn-accent-soft);
      border-bottom:1px solid var(--border);flex-shrink:0;}
    .bw-bulk-count{font-size:12px;font-weight:800;color:var(--white);margin-right:4px;}
    .bw-bulk-clear{background:none;border:none;color:var(--muted);font-size:11.5px;cursor:pointer;
      margin-left:auto;text-decoration:underline;}

    .bw-list{flex:1;overflow-y:auto;padding:10px;}
    .bw-row{display:flex;gap:10px;align-items:flex-start;background:var(--navy);border:1px solid var(--border);
      border-radius:12px;padding:12px 13px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;}
    .bw-row:hover{border-color:var(--cn-accent);}
    .bw-row.active{border-color:var(--cn-accent);background:var(--cn-accent-soft);}
    .bw-row-check{margin-top:3px;flex-shrink:0;width:15px;height:15px;accent-color:var(--cn-accent);}
    .bw-row-avatar{width:34px;height:34px;border-radius:50%;flex-shrink:0;object-fit:cover;margin-top:1px;}
    .bw-row-avatar-fallback{display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
      color:#fff;background:linear-gradient(135deg,var(--cn-accent),var(--cn-accent-dark));}
    .bw-row-main{flex:1;min-width:0;}
    .bw-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .bw-row-name{font-size:12.5px;font-weight:800;color:var(--white);display:flex;align-items:center;gap:6px;}
    .bw-star{background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;padding:0;line-height:1;}
    .bw-star.on{color:var(--gold);}
    .bw-row-amt{font-family:'Montserrat',sans-serif;font-weight:800;color:var(--green);font-size:13.5px;white-space:nowrap;}
    .bw-row-sub{font-size:11px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .bw-row-proposal{font-size:12px;color:var(--white);margin-top:8px;line-height:1.4;}
    .bw-row-actions{display:flex;gap:8px;margin-top:10px;flex-shrink:0;}
    .bw-empty{font-size:12px;color:var(--muted);text-align:center;padding:30px 10px;}
    .bw-list-end{font-size:11px;color:var(--muted);text-align:center;padding:10px 0;}

    .bw-detail{display:flex;flex-direction:column;min-height:0;overflow-y:auto;padding:18px 20px;}
    .bw-detail-empty{margin:auto;text-align:center;color:var(--muted);font-size:12.5px;}
    .bw-detail-empty-icon{font-size:30px;margin-bottom:10px;opacity:.6;}

    @media (max-width:980px){
      .bw-body{grid-template-columns:150px minmax(260px,1fr) 0;}
      .bw-detail{display:none;}
      .bw-body.bw-detail-open{grid-template-columns:0 0 1fr;}
      .bw-body.bw-detail-open .bw-rail,.bw-body.bw-detail-open .bw-list-col{display:none;}
      .bw-body.bw-detail-open .bw-detail{display:flex;}
    }
  `;
  document.head.appendChild(style);
}