/* ═══════════════════════ CREATOR EVENTS (public) ═══════════════════════
 * Browse published events, buy a ticket (M-Pesa STK push via Nexus Pay),
 * poll for payment, then view/download the ticket.
 *
 * TICKET RENDERING: same philosophy as the Academy certificate
 * (_acDrawCertificate in academy.js) — the ticket is drawn entirely on a
 * <canvas> with vector shapes + text, NOT a DOM screenshot. This means:
 *   - no html2canvas / CORS-tainting risk from cover images
 *   - crisp output at any zoom, consistent across browsers
 *   - a real, scannable QR code (via QRious, lazy-loaded from cdnjs,
 *     same lazy-load pattern this file already used for html2canvas)
 *     encoding the same door-scan verify URL the QR always encoded here
 *   - downloadable via canvas.toDataURL() and shareable via the Web
 *     Share API, exactly like acDownloadCertificate() / acShareCertificate()
 *
 * Depends on: api(), toast(), fmtKES(), esc(), API_BASE — globals from index.html
 * ════════════════════════════════════════════════════════════════════════ */

// Decorative QR-look icon for the landing-page ticket teaser (NOT a real
// scannable code — that only exists on the actual purchased ticket, drawn
// by _evDrawTicket() below via QRious). Static markup, shared by the
// pre-login placeholder in index.html and lpLoadEventsTeaser() below.
const _EV_QR_SVG = '<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="0" y="0" width="6" height="6"/><rect x="6" y="0" width="6" height="6"/><rect x="12" y="0" width="6" height="6"/><rect x="18" y="0" width="6" height="6"/><rect x="24" y="0" width="6" height="6"/><rect x="30" y="0" width="6" height="6"/><rect x="36" y="0" width="6" height="6"/><rect x="42" y="0" width="6" height="6"/><rect x="48" y="0" width="6" height="6"/><rect x="54" y="0" width="6" height="6"/><rect x="60" y="0" width="6" height="6"/><rect x="66" y="0" width="6" height="6"/><rect x="72" y="0" width="6" height="6"/><rect x="78" y="0" width="6" height="6"/><rect x="84" y="0" width="6" height="6"/><rect x="0" y="6" width="6" height="6"/><rect x="36" y="6" width="6" height="6"/><rect x="42" y="6" width="6" height="6"/><rect x="48" y="6" width="6" height="6"/><rect x="84" y="6" width="6" height="6"/><rect x="0" y="12" width="6" height="6"/><rect x="12" y="12" width="6" height="6"/><rect x="18" y="12" width="6" height="6"/><rect x="24" y="12" width="6" height="6"/><rect x="36" y="12" width="6" height="6"/><rect x="48" y="12" width="6" height="6"/><rect x="60" y="12" width="6" height="6"/><rect x="66" y="12" width="6" height="6"/><rect x="72" y="12" width="6" height="6"/><rect x="84" y="12" width="6" height="6"/><rect x="0" y="18" width="6" height="6"/><rect x="12" y="18" width="6" height="6"/><rect x="18" y="18" width="6" height="6"/><rect x="24" y="18" width="6" height="6"/><rect x="36" y="18" width="6" height="6"/><rect x="42" y="18" width="6" height="6"/><rect x="48" y="18" width="6" height="6"/><rect x="60" y="18" width="6" height="6"/><rect x="66" y="18" width="6" height="6"/><rect x="72" y="18" width="6" height="6"/><rect x="84" y="18" width="6" height="6"/><rect x="0" y="24" width="6" height="6"/><rect x="12" y="24" width="6" height="6"/><rect x="18" y="24" width="6" height="6"/><rect x="24" y="24" width="6" height="6"/><rect x="36" y="24" width="6" height="6"/><rect x="48" y="24" width="6" height="6"/><rect x="60" y="24" width="6" height="6"/><rect x="66" y="24" width="6" height="6"/><rect x="72" y="24" width="6" height="6"/><rect x="84" y="24" width="6" height="6"/><rect x="0" y="30" width="6" height="6"/><rect x="36" y="30" width="6" height="6"/><rect x="42" y="30" width="6" height="6"/><rect x="48" y="30" width="6" height="6"/><rect x="84" y="30" width="6" height="6"/><rect x="0" y="36" width="6" height="6"/><rect x="6" y="36" width="6" height="6"/><rect x="12" y="36" width="6" height="6"/><rect x="18" y="36" width="6" height="6"/><rect x="24" y="36" width="6" height="6"/><rect x="30" y="36" width="6" height="6"/><rect x="36" y="36" width="6" height="6"/><rect x="42" y="36" width="6" height="6"/><rect x="48" y="36" width="6" height="6"/><rect x="54" y="36" width="6" height="6"/><rect x="60" y="36" width="6" height="6"/><rect x="66" y="36" width="6" height="6"/><rect x="72" y="36" width="6" height="6"/><rect x="78" y="36" width="6" height="6"/><rect x="84" y="36" width="6" height="6"/><rect x="6" y="42" width="6" height="6"/><rect x="18" y="42" width="6" height="6"/><rect x="24" y="42" width="6" height="6"/><rect x="42" y="42" width="6" height="6"/><rect x="48" y="42" width="6" height="6"/><rect x="72" y="42" width="6" height="6"/><rect x="84" y="42" width="6" height="6"/><rect x="0" y="48" width="6" height="6"/><rect x="6" y="48" width="6" height="6"/><rect x="12" y="48" width="6" height="6"/><rect x="18" y="48" width="6" height="6"/><rect x="24" y="48" width="6" height="6"/><rect x="30" y="48" width="6" height="6"/><rect x="36" y="48" width="6" height="6"/><rect x="48" y="48" width="6" height="6"/><rect x="54" y="48" width="6" height="6"/><rect x="60" y="48" width="6" height="6"/><rect x="66" y="48" width="6" height="6"/><rect x="78" y="48" width="6" height="6"/><rect x="0" y="54" width="6" height="6"/><rect x="36" y="54" width="6" height="6"/><rect x="48" y="54" width="6" height="6"/><rect x="60" y="54" width="6" height="6"/><rect x="66" y="54" width="6" height="6"/><rect x="72" y="54" width="6" height="6"/><rect x="0" y="60" width="6" height="6"/><rect x="12" y="60" width="6" height="6"/><rect x="18" y="60" width="6" height="6"/><rect x="24" y="60" width="6" height="6"/><rect x="36" y="60" width="6" height="6"/><rect x="42" y="60" width="6" height="6"/><rect x="60" y="60" width="6" height="6"/><rect x="78" y="60" width="6" height="6"/><rect x="0" y="66" width="6" height="6"/><rect x="12" y="66" width="6" height="6"/><rect x="18" y="66" width="6" height="6"/><rect x="24" y="66" width="6" height="6"/><rect x="36" y="66" width="6" height="6"/><rect x="60" y="66" width="6" height="6"/><rect x="72" y="66" width="6" height="6"/><rect x="78" y="66" width="6" height="6"/><rect x="0" y="72" width="6" height="6"/><rect x="12" y="72" width="6" height="6"/><rect x="18" y="72" width="6" height="6"/><rect x="24" y="72" width="6" height="6"/><rect x="36" y="72" width="6" height="6"/><rect x="42" y="72" width="6" height="6"/><rect x="54" y="72" width="6" height="6"/><rect x="84" y="72" width="6" height="6"/><rect x="0" y="78" width="6" height="6"/><rect x="36" y="78" width="6" height="6"/><rect x="0" y="84" width="6" height="6"/><rect x="6" y="84" width="6" height="6"/><rect x="12" y="84" width="6" height="6"/><rect x="18" y="84" width="6" height="6"/><rect x="24" y="84" width="6" height="6"/><rect x="30" y="84" width="6" height="6"/><rect x="36" y="84" width="6" height="6"/><rect x="42" y="84" width="6" height="6"/><rect x="72" y="84" width="6" height="6"/><rect x="78" y="84" width="6" height="6"/></svg>';

let _eventsCache = [];
let _eventsPollTimer = null;

function eventsInit() {
  loadEvents();
}

// ─── Landing-page evergreen teaser (public, runs pre-login) ─────────────
// The "Creator Events" section on the marketing landing page (#creator-events)
// has its concept copy hard-coded in index.html so the idea of Creator
// Events — in-person, run from time to time, rotating regions — is always
// visible, even before a single event has ever been created. This function
// only handles the dynamic part: swapping the placeholder ticket-style card
// for a REAL upcoming event once one exists. It never invents mock data —
// on any failure or empty result it just leaves the honest "nothing
// scheduled yet" placeholder already in the markup untouched.
async function lpLoadEventsTeaser() {
  const card = document.getElementById('lpEvtTeaserVisual');
  const note = document.getElementById('lpEvtMoreNote');
  if (!card) return; // landing markup not present on this page

  let events;
  try {
    events = await api('/events');
  } catch (e) {
    return;
  }
  if (!events || !events.length) return;

  const ev = events[0]; // soonest published event
  const count = events.length;
  const pctSold = ev.capacity ? Math.round(100 - (ev.slots_remaining / ev.capacity) * 100) : 0;

  const highlights = (ev.highlights || []).slice(0, 3);

  card.innerHTML = `
    <div class="lp-evt-main">
      ${ev.cover_image_url
        ? `<div class="lp-evt-cover" style="background-image:url('${esc(ev.cover_image_url)}');"></div>`
        : `<div class="lp-evt-cover lp-evt-cover-fallback"></div>`}
      <div class="lp-evt-brand"><img src="EndaViral_logo_transparent.png" alt="" onerror="this.style.display='none'"><span>EndaViral</span></div>
      <div class="lp-evt-badge"><span>🎟️</span><b>Ticket</b><em>${fmtKES(ev.ticket_price_kes)}</em></div>
      <div class="lp-evt-eyebrow">CREATOR EVENT</div>
      <div class="lp-evt-title">${esc(ev.title)}</div>
      <div class="lp-evt-info">📅 ${esc(ev.event_date)} · ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>📍 ${esc(ev.venue)}, ${esc(ev.city)}</div>
      ${highlights.length ? `<div class="lp-evt-chiprow">${highlights.map(h => `<span class="lp-evt-chip2">✓ ${esc(h)}</span>`).join('')}</div>` : ''}
      ${!ev.is_sold_out ? `
      <div class="lp-evt-urgency">
        <span>${ev.slots_remaining} slots left</span>
        <div class="lp-evt-urgency-bar"><div class="lp-evt-urgency-fill" style="width:${Math.max(6, Math.min(100, pctSold))}%"></div></div>
      </div>` : `<div class="lp-evt-urgency"><span>Sold out</span></div>`}
    </div>
    <div class="lp-evt-perf"><span class="lp-evt-hole lp-evt-hole-l"></span><span class="lp-evt-hole lp-evt-hole-r"></span></div>
    <div class="lp-evt-stub">
      <div class="lp-evt-stub-left">
        <div><span class="lp-evt-stub-label">Ticket</span><div class="lp-evt-price">${fmtKES(ev.ticket_price_kes)}</div></div>
        <div class="lp-evt-barcode"></div>
      </div>
      <div class="lp-evt-qrbox">
        <div class="lp-evt-qr">${_EV_QR_SVG}</div>
        <span class="lp-evt-scan-label">Book now</span>
      </div>
    </div>
  `;

  if (note) {
    note.textContent = count > 1
      ? `${count} events open for booking — create an account to grab a slot.`
      : 'Create a free account to book your slot.';
  }
}
lpLoadEventsTeaser();

// ─── Sub-tabs (Upcoming / My Tickets) ────────────────────────────────────

function evSubTab(which) {
  ['browse', 'mytickets'].forEach(t => {
    const btn  = document.getElementById('evSubTab-' + t);
    const pane = document.getElementById('evPane-' + t);
    const active = t === which;
    if (btn)  { btn.style.borderBottomColor = active ? 'var(--green)' : 'transparent'; btn.style.color = active ? 'var(--green)' : 'var(--muted)'; btn.style.fontWeight = active ? '800' : '700'; }
    if (pane) pane.style.display = active ? '' : 'none';
  });
  if (which === 'browse') loadEvents();
  if (which === 'mytickets') loadMyTickets();
}

// ─── Browse ─────────────────────────────────────────────────────────────

async function loadEvents() {
  const el = document.getElementById('eventsGrid');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading events…</span></div>';
  try {
    const events = await api('/events');
    _eventsCache = events || [];
    renderEventsGrid();
    _evUpdateDashTeaser();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderEventsGrid() {
  const el = document.getElementById('eventsGrid');
  if (!el) return;
  if (!_eventsCache.length) {
    el.innerHTML = _evCityRequestHero();
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">${_eventsCache.map(ev => `
    <div class="event-card" style="background:var(--navy);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;">
      ${ev.cover_image_url ? `<img src="${esc(ev.cover_image_url)}" alt="" style="width:100%;height:150px;object-fit:cover;">` : `
      <div style="position:relative;width:100%;height:150px;overflow:hidden;background:linear-gradient(160deg,#0a0f0a 0%,#0c1810 60%,#080c08 100%);">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 82% 10%,rgba(61,212,74,.32),transparent 55%);"></div>
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(100deg,rgba(170,255,180,.14) 0 3px,transparent 3px 40px);opacity:.6;"></div>
        <div style="position:absolute;top:14px;left:0;right:14px;text-align:center;font-size:10px;font-weight:800;color:var(--green);letter-spacing:.28em;">CREATOR&nbsp;EVENT</div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:52px;height:52px;border-radius:50%;border:1.5px solid var(--green);background:rgba(10,20,14,.55);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 18px rgba(61,212,74,.3);">🎤</div>
        </div>
        <div style="position:absolute;bottom:12px;left:0;right:14px;text-align:center;font-size:9px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.15em;">ENDAVIRAL</div>
        <div style="position:absolute;top:0;right:0;bottom:0;width:8px;background:linear-gradient(180deg,#28a83c,#155a20);"></div>
        <div style="position:absolute;left:0;right:8px;bottom:0;height:4px;background:linear-gradient(90deg,#2fbf42,#155a20);"></div>
      </div>`}
      <div style="padding:16px;display:flex;flex-direction:column;gap:8px;flex:1;">
        <div style="font-size:11px;color:var(--green);font-weight:700;letter-spacing:.05em;">CREATOR EVENT</div>
        <div style="font-size:17px;font-weight:700;">${esc(ev.title)}</div>
        <div style="font-size:13px;color:var(--muted);">
          📅 ${esc(ev.event_date)} · ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>
          📍 ${esc(ev.venue)}, ${esc(ev.city)}
        </div>
        ${(ev.highlights || []).length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;">
          ${ev.highlights.slice(0, 4).map(h => `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(61,212,74,.10);color:var(--green);">✓ ${esc(h)}</span>`).join('')}
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--green);">${fmtKES(ev.ticket_price_kes)}</div>
            <div style="font-size:12px;color:var(--muted);">${ev.is_sold_out ? 'Sold out' : ev.slots_remaining + ' slots left'}</div>
          </div>
          <button class="action-btn" ${ev.is_sold_out ? 'disabled' : ''} onclick="eventOpenDetail('${esc(ev.id)}')">
            ${ev.is_sold_out ? 'Sold Out' : 'Book Slot'}
          </button>
        </div>
      </div>
    </div>
  `).join('')}</div>${_evCityRequestBanner()}`;
}

// ─── "Bring an event to my city" demand-capture form ─────────────────────
// Two presentations of the same idea, both posting to
// POST /events/city-requests: a big creative hero when there are zero
// upcoming events (replaces the old flat "check back soon" empty state),
// and a compact banner tacked onto the bottom of the grid once events
// exist, so we keep collecting demand signal even when the calendar isn't
// empty. Both render into the SAME element ids (#cityReqCity/#cityReqTopics/
// #cityReqFormWrap) because only one of the two is ever in the DOM at once
// — #eventsGrid is fully replaced on every render.

function _evCityRequestHero() {
  return `
  <div style="max-width:640px;margin:10px auto 0;text-align:center;">
    <div style="font-size:52px;line-height:1;margin-bottom:10px;">🎤✨</div>
    <div style="font-size:21px;font-weight:800;color:var(--white);margin-bottom:8px;">No events on the calendar — yet.</div>
    <div style="font-size:14px;color:var(--muted);margin-bottom:26px;line-height:1.6;">
      EndaViral Creator Events rotate from city to city, and <strong style="color:var(--green);">you</strong> get to decide where we go next.
      Tell us your city and what you'd love to learn, and we'll bring the training to you.
    </div>
    <div id="cityReqFormWrap" style="background:var(--navy);border:1px solid var(--border);border-radius:16px;padding:26px;text-align:left;">
      <div style="font-size:12px;font-weight:800;color:var(--green);letter-spacing:.05em;margin-bottom:16px;">📍 REQUEST YOUR CITY</div>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Which city should we bring the next Creator Event to?</label>
      <input id="cityReqCity" type="text" placeholder="e.g. Kisumu, Eldoret, Mombasa…" maxlength="100"
        style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;background:var(--card);border:1px solid var(--border);color:var(--white);font-size:14px;margin-bottom:16px;font-family:inherit;">
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">What would you love to learn there?</label>
      <textarea id="cityReqTopics" rows="3" placeholder="e.g. Growing on TikTok, M-Pesa payments for creators, landing brand deals…" maxlength="1000"
        style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;background:var(--card);border:1px solid var(--border);color:var(--white);font-size:14px;margin-bottom:18px;resize:vertical;font-family:inherit;"></textarea>
      <button class="btn-primary" style="width:100%;" onclick="evSubmitCityRequest(this)">🚀 Submit My Request</button>
    </div>
  </div>`;
}

function _evCityRequestBanner() {
  return `
  <div style="margin-top:22px;background:var(--navy);border:1px solid var(--border);border-radius:14px;padding:18px 20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      <span style="font-size:22px;">📍</span>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--white);">Want us in your city next?</div>
        <div style="font-size:12px;color:var(--muted);">Tell us where to go and what to teach — top requests shape our next stop.</div>
      </div>
    </div>
    <div id="cityReqFormWrap" style="display:flex;gap:10px;flex-wrap:wrap;">
      <input id="cityReqCity" type="text" placeholder="Your city…" maxlength="100"
        style="flex:1;min-width:140px;padding:10px 12px;border-radius:9px;background:var(--card);border:1px solid var(--border);color:var(--white);font-size:13px;font-family:inherit;">
      <input id="cityReqTopics" type="text" placeholder="What you'd love to learn…" maxlength="1000"
        style="flex:2;min-width:200px;padding:10px 12px;border-radius:9px;background:var(--card);border:1px solid var(--border);color:var(--white);font-size:13px;font-family:inherit;">
      <button class="action-btn" onclick="evSubmitCityRequest(this)">Submit</button>
    </div>
  </div>`;
}

async function evSubmitCityRequest(btn) {
  const cityEl = document.getElementById('cityReqCity');
  const topicsEl = document.getElementById('cityReqTopics');
  const city = (cityEl?.value || '').trim();
  const topics = (topicsEl?.value || '').trim();
  if (!city) { toast('Tell us which city 🙂', 'error'); cityEl?.focus(); return; }

  const orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const res = await api('/events/city-requests', { method: 'POST', body: JSON.stringify({ city, topics }) });
    const wrap = document.getElementById('cityReqFormWrap');
    if (wrap) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:6px 4px;width:100%;">
          <div style="font-size:38px;margin-bottom:8px;">🎉</div>
          <div style="font-size:15px;font-weight:800;color:var(--white);margin-bottom:4px;">Request received!</div>
          <div style="font-size:13px;color:var(--muted);">${esc(res.message || `We've logged ${city} — thanks for the vote!`)}</div>
        </div>`;
    }
    toast('Thanks! Your city request was submitted 🎉', 'success');
  } catch (e) {
    toast(e.message || 'Failed to submit your request', 'error');
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

// Keeps the dashboard promo card + sidebar badge honest: shows the count
// of published upcoming events once loaded, hides quietly if there are none.
function _evUpdateDashTeaser() {
  const badge = document.getElementById('eventsBadge');
  const desc  = document.getElementById('dashEventsDesc');
  const count = _eventsCache.length;
  if (badge) {
    if (count > 0) { badge.style.display = ''; badge.textContent = String(count); }
    else badge.style.display = 'none';
  }
  if (desc) {
    desc.textContent = count > 0
      ? `${count} upcoming event${count === 1 ? '' : 's'} — book your slot`
      : 'In-person training with real speakers';
  }
}

// ─── Detail + buy modal ─────────────────────────────────────────────────

// Event descriptions are typically typed as one long block mixing plain
// sentences with emoji-marked bullet points (e.g. "...learn how to: ✅ Grow
// your audience 💰 Turn your content ..."). Dumped into a single <p>,
// default HTML whitespace collapsing turns that into an unreadable run-on
// paragraph — any line breaks the admin typed get swallowed too. This
// splits the text into readable chunks: real newlines are honored, and a
// line break is also inserted before any emoji that visually opens a new
// bullet (emoji followed by a capitalized word), so each point renders as
// its own row instead of bleeding into the next sentence.
function _evFormatDescription(text) {
  if (!text) return '';
  const raw = String(text);
  const EMOJI_BULLET = /\s*(\p{Extended_Pictographic})\s*(?=[A-Z])/gu;
  const withBreaks = raw.replace(/\r\n|\r/g, '\n').replace(EMOJI_BULLET, '\n$1 ');
  const lines = withBreaks.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    return `<p style="color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 12px;">${esc(raw)}</p>`;
  }

  return lines.map(line => {
    const m = line.match(/^(\p{Extended_Pictographic})\s*(.+)$/u);
    if (m) {
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:4px 0;">
        <span style="font-size:15px;line-height:1.5;flex:none;">${m[1]}</span>
        <span style="color:var(--muted);font-size:14px;line-height:1.5;">${esc(m[2])}</span>
      </div>`;
    }
    return `<p style="color:var(--muted);font-size:14px;line-height:1.6;margin:0 0 10px;">${esc(line)}</p>`;
  }).join('');
}

function eventOpenDetail(eventId) {
  const ev = _eventsCache.find(e => e.id === eventId);
  if (!ev) return;
  const modal = document.getElementById('eventDetailModal');
  const body = document.getElementById('eventDetailBody');
  if (!modal || !body) return;

  body.innerHTML = `
    ${ev.cover_image_url ? `<img src="${esc(ev.cover_image_url)}" style="width:100%;border-radius:10px;margin-bottom:12px;">` : ''}
    <h3 style="margin:0 0 6px;">${esc(ev.title)}</h3>
    <div style="margin:6px 0 12px;">${_evFormatDescription(ev.description)}</div>
    <div style="font-size:14px;margin:10px 0;">📅 ${esc(ev.event_date)} · ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>📍 ${esc(ev.venue)}, ${esc(ev.city)}</div>
    ${(ev.speakers || []).length ? `
      <h4 style="margin:14px 0 6px;">Speakers</h4>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${ev.speakers.map(s => `<div><strong>${esc(s.name)}</strong>${s.topic ? ' — ' + esc(s.topic) : ''}${s.bio ? `<div style="font-size:12px;color:var(--muted);">${esc(s.bio)}</div>` : ''}</div>`).join('')}
      </div>` : ''}
    ${(ev.sponsors || []).length ? `
      <h4 style="margin:14px 0 6px;">Sponsors</h4>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
        ${ev.sponsors.map(s => s.logo_url ? `<img src="${esc(s.logo_url)}" alt="${esc(s.name)}" style="height:28px;">` : `<span>${esc(s.name)}</span>`).join('')}
      </div>` : ''}
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:20px;font-weight:700;color:var(--green);">${fmtKES(ev.ticket_price_kes)}</div>
      <button class="action-btn" ${ev.is_sold_out ? 'disabled' : ''} onclick="eventOpenBuy('${esc(ev.id)}')">
        ${ev.is_sold_out ? 'Sold Out' : 'Book This Slot'}
      </button>
    </div>
  `;
  modal.classList.add('show');
}

function eventCloseDetail() {
  const modal = document.getElementById('eventDetailModal');
  if (modal) modal.classList.remove('show');
}

function eventOpenBuy(eventId) {
  eventCloseDetail();
  const ev = _eventsCache.find(e => e.id === eventId);
  if (!ev) return;
  const modal = document.getElementById('eventBuyModal');
  if (!modal) return;
  document.getElementById('eventBuyTitle').textContent = `Book: ${ev.title}`;
  document.getElementById('eventBuyPrice').textContent = fmtKES(ev.ticket_price_kes);
  document.getElementById('eventBuyPhone').value = '';
  document.getElementById('eventBuyStatus').textContent = '';
  modal.dataset.eventId = eventId;
  modal.classList.add('show');
}

function eventCloseBuy() {
  const modal = document.getElementById('eventBuyModal');
  if (modal) modal.classList.remove('show');
  if (_eventsPollTimer) { clearInterval(_eventsPollTimer); _eventsPollTimer = null; }
}

async function eventConfirmBuy() {
  const modal = document.getElementById('eventBuyModal');
  const eventId = modal.dataset.eventId;
  const phone = document.getElementById('eventBuyPhone').value.trim();
  const statusEl = document.getElementById('eventBuyStatus');
  if (!/^0[71]\d{8}$|^254[71]\d{8}$/.test(phone)) {
    toast('Enter a valid M-Pesa phone number', 'error');
    return;
  }
  statusEl.textContent = 'Sending M-Pesa prompt…';
  try {
    const res = await api(`/events/${eventId}/buy-ticket`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    statusEl.textContent = 'Check your phone and enter your M-Pesa PIN…';
    _pollTicketPayment(eventId, res.checkout_request_id);
  } catch (e) {
    statusEl.textContent = '';
    toast(e.message, 'error');
  }
}

function _pollTicketPayment(eventId, checkoutId) {
  if (_eventsPollTimer) clearInterval(_eventsPollTimer);
  const statusEl = document.getElementById('eventBuyStatus');
  let attempts = 0;
  _eventsPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 30) { // ~90s at 3s interval
      clearInterval(_eventsPollTimer);
      statusEl.textContent = 'Still waiting — check "My Tickets" shortly, or try again.';
      return;
    }
    try {
      const res = await api(`/events/${eventId}/ticket-status/${checkoutId}`);
      if (res.status === 'success') {
        clearInterval(_eventsPollTimer);
        statusEl.textContent = '✅ Payment confirmed — opening your ticket…';
        toast('Ticket booked!', 'success');
        eventCloseBuy();
        loadEvents();
        eventOpenTicketByPurchase(res.purchase_id);
      } else if (res.status === 'refunded') {
        clearInterval(_eventsPollTimer);
        statusEl.textContent = '';
        toast('That slot filled just before your payment landed — you will be refunded.', 'error');
      } else if (res.status === 'failed' || res.status === 'cancelled') {
        clearInterval(_eventsPollTimer);
        statusEl.textContent = '';
        toast('Payment was not completed. You can try again.', 'error');
      }
      // else still pending — keep polling
    } catch (e) {
      // transient poll error — keep trying silently until attempts run out
    }
  }, 3000);
}

// ─── My tickets ─────────────────────────────────────────────────────────

async function loadMyTickets() {
  const el = document.getElementById('myTicketsGrid');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading your tickets…</span></div>';
  try {
    const tickets = await api('/events/my-tickets');
    if (!tickets.length) {
      el.innerHTML = '<div class="empty-state"><div class="icon">🎟️</div><p>No tickets yet — book a Creator Event to get one.</p></div>';
      return;
    }
    el.innerHTML = tickets.map(t => `
      <div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:700;">${esc(t.event.title)}</div>
          <div style="font-size:12px;color:var(--muted);">${esc(t.event.event_date)} · ${esc(t.ticket_number)}${t.checked_in ? ' · ✅ Checked in' : ''}</div>
        </div>
        <button class="action-btn" onclick="eventOpenTicketByPurchase('${esc(t.purchase_id)}')">View Ticket</button>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

// ─── Ticket render (canvas — same drawing philosophy as the Academy
//     certificate in academy.js) + download / share ───────────────────────

let _evTicketData = null;
let _evLogoImg = null;
let _evLogoLoadPromise = null;
let _evQRiousLoading = null;

function _evLoadLogo() {
  if (_evLogoImg) return Promise.resolve(_evLogoImg);
  if (_evLogoLoadPromise) return _evLogoLoadPromise;
  _evLogoLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { _evLogoImg = img; resolve(img); };
    img.onerror = () => resolve(null); // fall back to a text wordmark
    img.src = 'EndaViral_logo_transparent.png'; // same relative path used elsewhere
  });
  return _evLogoLoadPromise;
}

function _evEnsureQRious() {
  if (typeof QRious !== 'undefined') return Promise.resolve();
  if (_evQRiousLoading) return _evQRiousLoading;
  _evQRiousLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _evQRiousLoading;
}

async function eventOpenTicketByPurchase(purchaseId) {
  const overlay = document.getElementById('eventTicketModal');
  const canvas  = document.getElementById('evTicketCanvas');
  if (!overlay || !canvas) return;
  overlay.classList.add('show');

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#131b27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7a8fad';
  ctx.font = '14px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading your ticket…', canvas.width / 2, canvas.height / 2);

  let t, logoImg;
  try {
    [t, logoImg] = await Promise.all([api(`/events/my-tickets/${purchaseId}`), _evLoadLogo(), _evEnsureQRious().catch(() => null)]);
  } catch (e) {
    toast(e.message || "Couldn't load your ticket.", 'error');
    eventCloseTicket();
    return;
  }

  _evTicketData = t;
  await _evDrawTicket(canvas, t, logoImg);
}

function eventCloseTicket() {
  const modal = document.getElementById('eventTicketModal');
  if (modal) modal.classList.remove('show');
}

function _evRoundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function _evWrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(' ');
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

function _evFitTitle(ctx, text, maxWidth, maxLines, startSize, minSize) {
  let fontSize = startSize;
  let lines = [text];
  while (fontSize >= minSize) {
    ctx.font = `800 ${fontSize}px Montserrat, sans-serif`;
    lines = _evWrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }
  return { fontSize, lines };
}

function _evFillTracked(ctx, text, x, y, spacing, align) {
  const chars = Array.from(String(text || ''));
  const widths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let startX = align === 'center' ? x - totalWidth / 2 : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, startX, y); startX += widths[i] + spacing; });
  ctx.textAlign = prevAlign;
}

// Punches a transparent circular "hole" through everything drawn so far —
// the classic ticket-stub perforation notch. Must run AFTER backgrounds
// are filled and BEFORE foreground content (text/QR) is drawn on top.
function _evPunchHole(ctx, cx, cy, r) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Decorative barcode — visual flourish matching the sample ticket, not a
// real scan target (the QR code is what door-staff actually scans).
function _evDrawBarcode(ctx, x, y, w, h, seedStr) {
  let seed = 0;
  for (const c of String(seedStr || 'EV')) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) / 0xFFFFFF; };
  let cx = x;
  ctx.fillStyle = '#111';
  while (cx < x + w) {
    const bw = 1 + Math.floor(rand() * 3);
    if (rand() > 0.4) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1;
  }
}

// Small icon per highlight, matched by keyword — falls back to a plain
// checkmark for anything unrecognized so free-text highlights never break.
function _evHighlightIcon(label) {
  const s = String(label || '').toLowerCase();
  if (/workshop|training|masterclass|class/.test(s)) return '🎓';
  if (/network/.test(s)) return '🤝';
  if (/opportun|deal|brand/.test(s)) return '⭐';
  if (/giveaway|prize|gift/.test(s)) return '🎁';
  if (/q&a|qa\b|question/.test(s)) return '💬';
  if (/monet|income|earn/.test(s)) return '💰';
  if (/content|photo|video/.test(s)) return '📸';
  if (/pitch|panel|talk|speak|stage/.test(s)) return '🎤';
  return '✓';
}

function _evWeekdayLabel(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  } catch (e) { return ''; }
}

function _evDateLabel(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr || '');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  } catch (e) { return String(dateStr || ''); }
}

// Procedural "concert" backdrop — deliberately NOT an image draw. Loading
// the event's arbitrary cover_image_url onto this canvas would reintroduce
// exactly the CORS-tainting risk this whole canvas-based approach exists to
// avoid (see file header): a tainted canvas can't toDataURL()/toBlob() for
// download/share. So the stage-light mood is built from gradients + shapes
// instead, using only first-party colors.
function _evDrawStageBg(ctx, x, y, w, h) {
  const base = ctx.createLinearGradient(x, y, x, y + h);
  base.addColorStop(0, '#0a0f0a');
  base.addColorStop(0.6, '#0c1810');
  base.addColorStop(1, '#080c08');
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  const glow = ctx.createRadialGradient(x + w * 0.78, y + h * 0.12, 10, x + w * 0.78, y + h * 0.12, h * 1.1);
  glow.addColorStop(0, 'rgba(61,212,74,.32)');
  glow.addColorStop(1, 'rgba(61,212,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  for (let i = 0; i < 5; i++) {
    const bx = x + w * 0.5 + i * 34;
    const beamGrad = ctx.createLinearGradient(bx, y, bx, y + h * 0.85);
    beamGrad.addColorStop(0, 'rgba(170,255,180,.16)');
    beamGrad.addColorStop(1, 'rgba(170,255,180,0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 4, y);
    ctx.lineTo(bx + 4, y);
    ctx.lineTo(bx + 50, y + h * 0.85);
    ctx.lineTo(bx - 50, y + h * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h * 1.08, w * 0.58, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(61,212,74,.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w - 220 + i * 26, y);
    ctx.lineTo(x + w - 220 + i * 26 + 140, y + h * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

// Wraps `text` at maxWidth and draws it starting at (x, y) with the given
// line height, stopping at maxLines (adding an ellipsis on the last line if
// there's more). Returns the y position just after the last line drawn.
function _evDrawParagraph(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = _evWrapText(ctx, text, maxWidth);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines && shown.length) {
    let last = shown[shown.length - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 3) last = last.slice(0, -1);
    shown[shown.length - 1] = last + '…';
  }
  shown.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + shown.length * lineHeight;
}

// Bulleted list — small square marker + wrapped text per item. Returns the
// y position just after the last item.
function _evDrawBulletList(ctx, items, x, y, maxWidth, lineHeight, markerColor) {
  let cy = y;
  const indent = 14;
  items.forEach(item => {
    ctx.fillStyle = markerColor;
    ctx.fillRect(x, cy - 8, 5, 5);
    cy = _evDrawParagraph(ctx, item, x + indent, cy, maxWidth - indent, lineHeight, 3);
    cy += 4;
  });
  return cy;
}

async function _evDrawTicket(canvas, t, logoImg) {
  const ev = t.event;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const green = '#3dd44a', darkGreen = '#155a20', white = '#ffffff';
  const muted = '#9fb3ab', black = '#0d1210', mutedDark = '#6b7280', navy = '#111a24';

  // ── Overall geometry: two separate rounded cards (ticket front, then a
  // gap, then a back/info panel) — not one continuous shape.
  const stripW = 54, stubW = 214, mainW = W - stubW - stripW;
  const barH = 32;                 // thin green strip along the bottom of the ticket card
  const card1H = 546;
  const gap = 20;
  const card2Y = card1H + gap;
  const card2H = H - card2Y;
  const contentH = card1H - barH;  // usable height above the bottom green bar

  ctx.clearRect(0, 0, W, H);

  // ══════════════════════════════ CARD 1 — TICKET ══════════════════════
  ctx.save();
  _evRoundedRectPath(ctx, 0, 0, W, card1H, 22);
  ctx.clip();

  _evDrawStageBg(ctx, 0, 0, mainW, card1H);
  ctx.fillStyle = white;
  ctx.fillRect(mainW, 0, stubW, card1H);
  const stripGrad = ctx.createLinearGradient(0, 0, 0, card1H);
  stripGrad.addColorStop(0, '#28a83c');
  stripGrad.addColorStop(1, darkGreen);
  ctx.fillStyle = stripGrad;
  ctx.fillRect(mainW + stubW, 0, stripW, card1H);

  // faint oversized logo watermark on the main panel, right side
  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    const wmW = 220, wmH = logoImg.height * (wmW / logoImg.width);
    ctx.drawImage(logoImg, mainW - wmW - 30, contentH / 2 - wmH / 2, wmW, wmH);
    ctx.restore();
  }

  // perforation notches + dashed seam between main panel and stub
  _evPunchHole(ctx, mainW, 14, 13);
  _evPunchHole(ctx, mainW, contentH - 14, 13);
  ctx.save();
  ctx.strokeStyle = 'rgba(140,150,140,.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(mainW, 26);
  ctx.lineTo(mainW, contentH - 26);
  ctx.stroke();
  ctx.restore();

  // bottom green bar (spans main + stub)
  const barGrad = ctx.createLinearGradient(0, contentH, 0, card1H);
  barGrad.addColorStop(0, '#2fbf42');
  barGrad.addColorStop(1, darkGreen);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, contentH, mainW + stubW, barH);
  ctx.textAlign = 'center';
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillText('www.endaviral.co.ke', (mainW + stubW) / 2, contentH + barH / 2 + 4);

  // ── Main panel: logo + wordmark ──────────────────────────────────────
  const padX = 44;
  ctx.textAlign = 'left';
  if (logoImg) {
    ctx.drawImage(logoImg, padX, 26, 40, 40);
  } else {
    _evRoundedRectPath(ctx, padX, 26, 40, 40, 8);
    ctx.fillStyle = green;
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 15px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EV', padX + 20, 26 + 26);
    ctx.textAlign = 'left';
  }
  ctx.font = '900 19px Montserrat, sans-serif';
  ctx.fillStyle = white;
  ctx.fillText('Enda', padX + 50, 46);
  const endaW = ctx.measureText('Enda').width;
  ctx.fillStyle = green;
  ctx.fillText('Viral', padX + 50 + endaW, 46);
  ctx.font = '700 8.5px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  _evFillTracked(ctx, 'FUEL YOUR GROWTH', padX + 50, 59, 1.5, 'left');

  // ── Ticket-type badge, top-right ───────────────────────────────────────
  const ticketType = (t.ticket_type || 'General');
  const isVIP = /vip/i.test(ticketType);
  const badgeW = 158, badgeH = 84, badgeX = mainW - badgeW - 30, badgeY = 24;
  _evRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fillStyle = 'rgba(10,20,14,.55)';
  ctx.fill();
  ctx.strokeStyle = green;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '18px sans-serif';
  ctx.fillStyle = green;
  ctx.fillText(isVIP ? '👑' : '🎟️', badgeX + badgeW / 2, badgeY + 26);
  ctx.font = '800 19px Montserrat, sans-serif';
  ctx.fillStyle = green;
  ctx.fillText(ticketType.length > 10 ? ticketType.slice(0, 10) + '…' : ticketType.toUpperCase(), badgeX + badgeW / 2, badgeY + 52);
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  _evFillTracked(ctx, 'TICKET', badgeX + badgeW / 2, badgeY + 70, 2, 'center');
  ctx.textAlign = 'left';

  // ── Eyebrow + title (last line accented green when it wraps) ──────────
  ctx.font = '800 12px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'CREATOR EVENT', padX, 100, 1.5, 'left');

  const titleMaxW = mainW - padX - (badgeW + 46);
  const { fontSize: titleSize, lines: titleLines } = _evFitTitle(ctx, ev.title || '', titleMaxW, 2, 36, 22);
  ctx.font = `800 ${titleSize}px Montserrat, sans-serif`;
  const titleLineH = titleSize * 1.14;
  let titleY = 136;
  titleLines.forEach((line, i) => {
    ctx.fillStyle = (titleLines.length > 1 && i === titleLines.length - 1) ? green : white;
    ctx.fillText(line, padX, titleY + i * titleLineH);
  });
  let cursorY = titleY + (titleLines.length - 1) * titleLineH + 30;

  // ── Meta row: date / time / venue, three columns with dividers ────────
  const metaAreaW = mainW - padX - 40;
  const metaColW = metaAreaW / 3;
  const weekday = _evWeekdayLabel(ev.event_date);
  const dateLabel = _evDateLabel(ev.event_date);
  const timeLine2 = ev.end_time_label ? `– ${ev.end_time_label}` : '';
  const metaCols = [
    { icon: '📅', l1: weekday || 'DATE', l2: dateLabel },
    { icon: '🕐', l1: ev.start_time_label || '', l2: timeLine2 },
    { icon: '📍', l1: ev.venue || '', l2: ev.city || '' },
  ];
  const metaTop = cursorY;
  metaCols.forEach((c, i) => {
    const cx = padX + metaColW * i;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 16, metaTop - 14);
      ctx.lineTo(cx - 16, metaTop + 26);
      ctx.stroke();
    }
    ctx.font = '13px sans-serif';
    ctx.fillStyle = white;
    ctx.fillText(c.icon, cx, metaTop);
    ctx.font = '800 13px Montserrat, sans-serif';
    ctx.fillStyle = white;
    let l1 = c.l1;
    const maxColTextW = metaColW - 28;
    while (ctx.measureText(l1).width > maxColTextW && l1.length > 3) l1 = l1.slice(0, -1);
    ctx.fillText(l1, cx + 20, metaTop);
    ctx.font = '600 12px Montserrat, sans-serif';
    ctx.fillStyle = '#cfe6d6';
    let l2 = c.l2;
    while (ctx.measureText(l2).width > maxColTextW && l2.length > 3) l2 = l2.slice(0, -1);
    ctx.fillText(l2, cx + 20, metaTop + 20);
  });
  cursorY = metaTop + 44;

  // ── Highlights: icon + label, wrapping row ─────────────────────────────
  const highlights = (ev.highlights || []).slice(0, 6);
  if (highlights.length) {
    cursorY += 14;
    ctx.font = '700 12px Montserrat, sans-serif';
    let hx = padX;
    const hMaxX = mainW - 30;
    highlights.forEach(h => {
      const label = `${_evHighlightIcon(h)} ${h}`;
      const tw = ctx.measureText(label).width;
      if (hx + tw > hMaxX) { hx = padX; cursorY += 22; }
      ctx.fillStyle = '#e7f3ea';
      ctx.fillText(label, hx, cursorY);
      hx += tw + 26;
    });
  }

  // ── Bottom stat bar: attendee / ticket id / order / type / price ──────
  const statH = 70, statY = contentH - statH - 18, statX = 26, statW = mainW - 52;
  _evRoundedRectPath(ctx, statX, statY, statW, statH, 12);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fill();

  const statCols = [
    { label: 'ATTENDEE',  value: t.attendee_name || 'Creator' },
    { label: 'TICKET ID', value: t.ticket_number || '' },
    { label: 'ORDER ID',  value: 'ORD-' + (t.purchase_id || '').slice(0, 8).toUpperCase() },
    { label: 'TICKET TYPE', value: ticketType },
    { label: 'PRICE',     value: fmtKES(t.amount_kes) },
  ];
  const statColW = statW / statCols.length;
  statCols.forEach((c, i) => {
    const cx = statX + statColW * i + 18;
    ctx.font = '700 9px Montserrat, sans-serif';
    ctx.fillStyle = mutedDark;
    _evFillTracked(ctx, c.label, cx, statY + 24, 1, 'left');
    ctx.font = '800 13px Montserrat, sans-serif';
    ctx.fillStyle = white;
    let val = String(c.value);
    if (ctx.measureText(val).width > statColW - 26) {
      while (ctx.measureText(val + '…').width > statColW - 26 && val.length > 3) val = val.slice(0, -1);
      val += '…';
    }
    ctx.fillText(val, cx, statY + 48);
  });

  // ── Stub: ADMIT ONE + QR (with center brand badge) + codes + barcode ──
  const stubCX = mainW + stubW / 2;
  ctx.textAlign = 'center';
  ctx.font = '800 14px Montserrat, sans-serif';
  ctx.fillStyle = darkGreen;
  ctx.fillText('★ — ADMIT ONE — ★', stubCX, 42);

  const qrBoxSize = 158, qrBoxX = mainW + (stubW - qrBoxSize) / 2, qrBoxY = 58;
  _evRoundedRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 14);
  ctx.strokeStyle = green;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const qrSize = 134, qrPad = (qrBoxSize - qrSize) / 2;
  try {
    if (typeof QRious !== 'undefined' && t.ticket_code) {
      const apiBase = (typeof API !== 'undefined' ? API : (typeof API_BASE !== 'undefined' ? API_BASE : ''));
      const verifyUrl = `${apiBase}/events/ticket/verify/${encodeURIComponent(t.ticket_code)}`;
      const off = document.createElement('canvas');
      new QRious({ element: off, value: verifyUrl, size: qrSize, level: 'H', background: '#ffffff', foreground: '#0b0b0b' });
      ctx.drawImage(off, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
    } else {
      ctx.fillStyle = '#eee';
      ctx.fillRect(qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
      ctx.fillStyle = '#888';
      ctx.font = '11px Montserrat, sans-serif';
      ctx.fillText('QR unavailable', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize / 2);
    }
  } catch (e) {
    ctx.fillStyle = '#eee';
    ctx.fillRect(qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
  }

  // small circular brand badge at the QR's center — 'H' error correction
  // above tolerates this without hurting scannability
  const qrCX = qrBoxX + qrBoxSize / 2, qrCY = qrBoxY + qrBoxSize / 2, badgeR = 15;
  ctx.beginPath();
  ctx.arc(qrCX, qrCY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1a12';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  if (logoImg) {
    const logoR = badgeR - 4;
    ctx.drawImage(logoImg, qrCX - logoR, qrCY - logoR, logoR * 2, logoR * 2);
  } else {
    ctx.font = '900 10px Montserrat, sans-serif';
    ctx.fillStyle = green;
    ctx.fillText('EV', qrCX, qrCY + 3);
  }

  // "SCAN TO CHECK-IN" pill, overlapping the bottom edge of the QR box
  const pillW = 152, pillH = 24, pillX = stubCX - pillW / 2, pillY = qrBoxY + qrBoxSize - pillH / 2;
  _evRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 12);
  ctx.fillStyle = black;
  ctx.fill();
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = white;
  _evFillTracked(ctx, 'SCAN TO CHECK-IN', stubCX, pillY + pillH / 2 + 3, 1, 'center');

  let stubY = qrBoxY + qrBoxSize + 34;
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'VERIFICATION CODE', stubCX, stubY, 1, 'center');
  stubY += 20;
  ctx.font = '800 15px Montserrat, sans-serif';
  ctx.fillStyle = black;
  ctx.fillText(t.ticket_number || '', stubCX, stubY);

  stubY += 24;
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  _evFillTracked(ctx, 'TICKET ID', stubCX, stubY, 1, 'center');
  stubY += 17;
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillStyle = black;
  ctx.fillText('EVT-' + (t.purchase_id || '').slice(0, 8).toUpperCase(), stubCX, stubY);

  _evDrawBarcode(ctx, mainW + 20, contentH - 30, stubW - 40, 20, t.purchase_id);

  // ── Vertical green strip: small brand mark + rotated event title ──────
  const stripCX = mainW + stubW + stripW / 2;
  if (logoImg) {
    ctx.drawImage(logoImg, stripCX - 12, 22, 24, 24);
  } else {
    ctx.font = '900 12px Montserrat, sans-serif';
    ctx.fillStyle = white;
    ctx.fillText('EV', stripCX, 40);
  }
  ctx.save();
  ctx.translate(stripCX, card1H - 24);
  ctx.rotate(-Math.PI / 2);
  const availLen = card1H - 90;
  let stripFont = 11;
  ctx.font = `700 ${stripFont}px Montserrat, sans-serif`;
  let stripText = (ev.title || '').toUpperCase();
  const trackSpacing = 2.5;
  const trackedWidth = t => {
    const chars = Array.from(t);
    return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + trackSpacing * (chars.length - 1);
  };
  while (stripFont > 7 && trackedWidth(stripText) > availLen) {
    stripFont -= 1;
    ctx.font = `700 ${stripFont}px Montserrat, sans-serif`;
  }
  while (trackedWidth(stripText + '…') > availLen && stripText.length > 3) stripText = stripText.slice(0, -1);
  if (trackedWidth(stripText) > availLen) stripText += '…';
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  _evFillTracked(ctx, stripText, 0, 0, trackSpacing, 'center');
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.restore(); // release card 1 clip

  // ══════════════════════════ CARD 2 — BACK / INFO PANEL ════════════════
  ctx.save();
  _evRoundedRectPath(ctx, 0, card2Y, W, card2H, 22);
  ctx.clip();

  const backGrad = ctx.createLinearGradient(0, card2Y, 0, card2Y + card2H);
  backGrad.addColorStop(0, '#101a24');
  backGrad.addColorStop(1, '#0b1319');
  ctx.fillStyle = backGrad;
  ctx.fillRect(0, card2Y, W, card2H);

  const backBarH = 10;
  const backBarGrad = ctx.createLinearGradient(0, card2Y + card2H - backBarH, 0, card2Y + card2H);
  backBarGrad.addColorStop(0, '#2fbf42');
  backBarGrad.addColorStop(1, darkGreen);
  ctx.fillStyle = backBarGrad;
  ctx.fillRect(0, card2Y + card2H - backBarH, W, backBarH);

  const padX2 = 40, colGap = 30;
  const colW = (W - padX2 * 2 - colGap * 3) / 4;
  const c1x = padX2, c2x = c1x + colW + colGap, c3x = c2x + colW + colGap, c4x = c3x + colW + colGap;
  const colTop = card2Y + 34;
  const colBottom = card2Y + card2H - backBarH - 20;

  [c2x, c3x, c4x].forEach(cx => {
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - colGap / 2, colTop - 4);
    ctx.lineTo(cx - colGap / 2, colBottom);
    ctx.stroke();
  });

  ctx.textAlign = 'left';

  // Col 1 — About EndaViral
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'ABOUT ENDAVIRAL', c1x, colTop, 1, 'left');
  ctx.font = '500 12px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  let c1y = _evDrawParagraph(
    ctx,
    "EndaViral is Kenya's all-in-one platform for creators to grow their audience, earn more and connect with amazing opportunities.",
    c1x, colTop + 26, colW, 17, 5
  );
  c1y += 18;
  ctx.font = 'italic 700 14px Georgia, serif';
  ctx.fillStyle = white;
  ctx.fillText('Your Growth.', c1x, c1y);
  ctx.fillStyle = green;
  ctx.fillText('Our Mission.', c1x, c1y + 20);

  // Col 2 — Terms & Conditions
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'TERMS & CONDITIONS', c2x, colTop, 1, 'left');
  ctx.font = '500 12px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  _evDrawBulletList(ctx, [
    'This ticket is valid for one person only.',
    'Present this ticket (QR code) for entry.',
    'Tickets are non-transferable and non-refundable.',
    'EndaViral is not responsible for lost or stolen tickets.',
    'Arrive early to secure your spot.',
  ], c2x, colTop + 26, colW, 16, green);

  // Col 3 — See you there!
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'SEE YOU THERE!', c3x, colTop, 1, 'left');
  ctx.font = '18px sans-serif';
  ctx.fillStyle = white;
  ctx.fillText('📅', c3x, colTop + 34);
  ctx.font = '800 14px Montserrat, sans-serif';
  ctx.fillStyle = white;
  ctx.fillText(_evDateLabel(ev.event_date) || ev.event_date || '', c3x + 26, colTop + 34);
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(c3x, colTop + 52);
  ctx.lineTo(c3x + colW, colTop + 52);
  ctx.stroke();
  ctx.font = '15px sans-serif';
  ctx.fillStyle = green;
  const socialIcons = ['📷', '🎵', '▶️', '✖️'];
  let sx = c3x;
  socialIcons.forEach(ic => { ctx.fillText(ic, sx, colTop + 78); sx += 26; });
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText('@endaviral_ke', c3x, colTop + 100);

  // Col 4 — Sponsored by (falls back to EndaViral self-brand)
  const sponsors = (ev.sponsors || []).filter(s => s && s.name);
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, sponsors.length ? 'SPONSORED BY' : 'POWERED BY', c4x, colTop, 1, 'left');
  if (sponsors.length) {
    ctx.font = '700 14px Montserrat, sans-serif';
    ctx.fillStyle = white;
    sponsors.slice(0, 4).forEach((s, i) => ctx.fillText(s.name, c4x, colTop + 30 + i * 22));
  } else if (logoImg) {
    const lw = 32, lh = logoImg.height * (lw / logoImg.width);
    ctx.drawImage(logoImg, c4x, colTop + 20, lw, lh);
    ctx.font = '900 15px Montserrat, sans-serif';
    ctx.fillStyle = white;
    ctx.fillText('Enda', c4x + lw + 8, colTop + 20 + lh / 2 + 5);
    const ew = ctx.measureText('Enda').width;
    ctx.fillStyle = green;
    ctx.fillText('Viral', c4x + lw + 8 + ew, colTop + 20 + lh / 2 + 5);
    ctx.font = '700 9px Montserrat, sans-serif';
    ctx.fillStyle = mutedDark;
    _evFillTracked(ctx, 'FUEL YOUR GROWTH', c4x, colTop + 20 + lh + 18, 1, 'left');
  } else {
    ctx.font = '800 16px Montserrat, sans-serif';
    ctx.fillStyle = white;
    ctx.fillText('EndaViral', c4x, colTop + 30);
  }

  ctx.restore(); // release card 2 clip
}

function _evTicketFileName() {
  const id = (_evTicketData && (_evTicketData.ticket_number || _evTicketData.purchase_id)) || 'ticket';
  return `endaviral-event-${String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}

function downloadTicket() {
  const canvas = document.getElementById('evTicketCanvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = _evTicketFileName();
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function shareTicket() {
  const canvas = document.getElementById('evTicketCanvas');
  if (!canvas || !_evTicketData) return;

  canvas.toBlob(async (blob) => {
    if (!blob) { downloadTicket(); return; }
    const file = new File([blob], _evTicketFileName(), { type: 'image/png' });
    const evTitle = (_evTicketData.event && _evTicketData.event.title) || 'a EndaViral Creator Event';
    const shareText = `I'm booked for "${evTitle}"! 🎟️ Grab your ticket → endaviral.co.ke`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My EndaViral Event Ticket', text: shareText });
        return;
      } catch (e) {
        // user cancelled the share sheet — fall through to download
      }
    }
    downloadTicket();
    toast('Ticket downloaded — attach it anywhere you\'d like to share it!', 'success');
  }, 'image/png');
}