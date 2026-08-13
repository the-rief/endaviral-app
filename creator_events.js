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

  card.innerHTML = `
    ${ev.cover_image_url
      ? `<div class="lp-evt-cover" style="background-image:url('${esc(ev.cover_image_url)}');"></div>`
      : `<div class="lp-evt-cover lp-evt-cover-fallback"></div>`}
    <div class="lp-evt-body">
      <div class="lp-evt-eyebrow">CREATOR EVENT</div>
      <div class="lp-evt-title">${esc(ev.title)}</div>
      <div class="lp-evt-info">📅 ${esc(ev.event_date)} · ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>📍 ${esc(ev.venue)}, ${esc(ev.city)}</div>
      ${!ev.is_sold_out ? `
      <div class="lp-evt-urgency">
        <span>${ev.slots_remaining} slots left</span>
        <div class="lp-evt-urgency-bar"><div class="lp-evt-urgency-fill" style="width:${Math.max(6, Math.min(100, pctSold))}%"></div></div>
      </div>` : `<div class="lp-evt-urgency"><span>Sold out</span></div>`}
    </div>
    <div class="lp-evt-stub">
      <div class="lp-evt-price"><span>Ticket</span>${fmtKES(ev.ticket_price_kes)}</div>
      <div class="lp-evt-qr">🎟️</div>
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
    el.innerHTML = '<div class="empty-state"><div class="icon">🎤</div><p>No upcoming events right now — check back soon.</p></div>';
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">${_eventsCache.map(ev => `
    <div class="event-card" style="background:var(--navy);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;">
      ${ev.cover_image_url ? `<img src="${esc(ev.cover_image_url)}" alt="" style="width:100%;height:150px;object-fit:cover;">` : `<div style="width:100%;height:100px;background:linear-gradient(135deg,#0b0b0b,#101a10);display:flex;align-items:center;justify-content:center;font-size:30px;">🎤</div>`}
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
  `).join('')}</div>`;
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

function eventOpenDetail(eventId) {
  const ev = _eventsCache.find(e => e.id === eventId);
  if (!ev) return;
  const modal = document.getElementById('eventDetailModal');
  const body = document.getElementById('eventDetailBody');
  if (!modal || !body) return;

  body.innerHTML = `
    ${ev.cover_image_url ? `<img src="${esc(ev.cover_image_url)}" style="width:100%;border-radius:10px;margin-bottom:12px;">` : ''}
    <h3 style="margin:0 0 6px;">${esc(ev.title)}</h3>
    <p style="color:var(--muted);font-size:14px;">${esc(ev.description || '')}</p>
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
  modal.style.display = 'flex';
}

function eventCloseDetail() {
  const modal = document.getElementById('eventDetailModal');
  if (modal) modal.style.display = 'none';
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
  modal.style.display = 'flex';
}

function eventCloseBuy() {
  const modal = document.getElementById('eventBuyModal');
  if (modal) modal.style.display = 'none';
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
  overlay.style.display = 'flex';

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
  if (modal) modal.style.display = 'none';
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

async function _evDrawTicket(canvas, t, logoImg) {
  const ev = t.event;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const stubW = 232, mainW = W - stubW;
  const frontH = 462, footH = H - frontH;

  const green = '#3dd44a', darkGreen = '#1f7a2e', white = '#ffffff';
  const muted = '#9fb3ab', black = '#111111', mutedDark = '#6b7280';

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  _evRoundedRectPath(ctx, 0, 0, W, H, 22);
  ctx.clip();

  // ── Backgrounds ──────────────────────────────────────────────────────
  const mainGrad = ctx.createLinearGradient(0, 0, mainW, frontH);
  mainGrad.addColorStop(0, '#0b0b0b');
  mainGrad.addColorStop(1, '#101a10');
  ctx.fillStyle = mainGrad;
  ctx.fillRect(0, 0, mainW, frontH);

  // subtle diagonal texture, top-right of the main panel
  ctx.save();
  ctx.strokeStyle = 'rgba(61,212,74,.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(mainW - 220 + i * 26, 0);
    ctx.lineTo(mainW - 220 + i * 26 + 140, frontH * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = white;
  ctx.fillRect(mainW, 0, stubW, frontH);

  const footGrad = ctx.createLinearGradient(0, frontH, W, H);
  footGrad.addColorStop(0, '#0e1712');
  footGrad.addColorStop(1, '#0a1210');
  ctx.fillStyle = footGrad;
  ctx.fillRect(0, frontH, W, footH);

  // ── Perforation notches + dashed seam between main panel and stub ─────
  _evPunchHole(ctx, mainW, 0, 15);
  _evPunchHole(ctx, mainW, frontH, 15);

  ctx.save();
  ctx.strokeStyle = 'rgba(120,130,120,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(mainW, 4);
  ctx.lineTo(mainW, frontH - 4);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(61,212,74,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, frontH);
  ctx.lineTo(W, frontH);
  ctx.stroke();

  // ── Main panel: logo + wordmark ────────────────────────────────────────
  const padX = 46;
  ctx.textAlign = 'left';
  if (logoImg) {
    ctx.drawImage(logoImg, padX, 30, 42, 42);
  } else {
    _evRoundedRectPath(ctx, padX, 30, 42, 42, 8);
    ctx.fillStyle = green;
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '900 16px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EV', padX + 21, 30 + 27);
    ctx.textAlign = 'left';
  }
  ctx.font = '900 20px Montserrat, sans-serif';
  ctx.fillStyle = white;
  ctx.fillText('Enda', padX + 54, 52);
  const endaW = ctx.measureText('Enda').width;
  ctx.fillStyle = green;
  ctx.fillText('Viral', padX + 54 + endaW, 52);
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  _evFillTracked(ctx, 'FUEL YOUR GROWTH', padX + 54, 66, 1.5, 'left');

  // ── Ticket-type / price badge, top-right of the main panel ────────────
  const badgeW = 168, badgeH = 62, badgeX = mainW - badgeW - 32, badgeY = 30;
  _evRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.strokeStyle = green;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(61,212,74,.08)';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = '18px sans-serif';
  ctx.fillStyle = green;
  ctx.fillText('🎫', badgeX + badgeW / 2, badgeY + 24);
  ctx.font = '800 11px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  _evFillTracked(ctx, 'VALID TICKET', badgeX + badgeW / 2, badgeY + 40, 1, 'center');
  ctx.font = '800 15px Montserrat, sans-serif';
  ctx.fillStyle = white;
  ctx.fillText(fmtKES(ev.ticket_price_kes), badgeX + badgeW / 2, badgeY + 57);
  ctx.textAlign = 'left';

  // ── Eyebrow + title ─────────────────────────────────────────────────
  ctx.font = '800 12px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'CREATOR EVENT', padX, 110, 1.5, 'left');

  const titleMaxW = mainW - padX - (badgeW + 48);
  const { fontSize: titleSize, lines: titleLines } = _evFitTitle(ctx, ev.title || '', titleMaxW, 2, 38, 22);
  ctx.font = `800 ${titleSize}px Montserrat, sans-serif`;
  ctx.fillStyle = white;
  const titleLineH = titleSize * 1.15;
  let titleY = 148;
  titleLines.forEach((line, i) => { ctx.fillText(line, padX, titleY + i * titleLineH); });
  let cursorY = titleY + (titleLines.length - 1) * titleLineH + 34;

  // ── Date / time / venue ────────────────────────────────────────────
  ctx.font = '600 15px Montserrat, sans-serif';
  ctx.fillStyle = '#cfe6d6';
  const metaLine = `📅 ${ev.event_date}   ⏰ ${ev.start_time_label}${ev.end_time_label ? ' – ' + ev.end_time_label : ''}`;
  ctx.fillText(metaLine, padX, cursorY);
  cursorY += 26;
  ctx.fillText(`📍 ${ev.venue}, ${ev.city}`, padX, cursorY);
  cursorY += 20;

  // ── Highlight chips ─────────────────────────────────────────────────
  const highlights = (ev.highlights || []).slice(0, 5);
  if (highlights.length) {
    cursorY += 20;
    ctx.font = '700 11px Montserrat, sans-serif';
    let chipX = padX;
    const chipY0 = cursorY;
    const chipMaxX = mainW - 32;
    highlights.forEach(h => {
      const label = `✓ ${h}`;
      const tw = ctx.measureText(label).width + 20;
      if (chipX + tw > chipMaxX) { chipX = padX; cursorY += 30; }
      _evRoundedRectPath(ctx, chipX, cursorY - 18, tw, 26, 13);
      ctx.fillStyle = 'rgba(61,212,74,.12)';
      ctx.fill();
      ctx.fillStyle = green;
      ctx.fillText(label, chipX + 10, cursorY);
      chipX += tw + 8;
    });
  }

  // ── Bottom stat bar: attendee / ticket id / order / price ────────────
  const barH = 74, barY = frontH - barH - 22, barX = 28, barW = mainW - 56;
  _evRoundedRectPath(ctx, barX, barY, barW, barH, 12);
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fill();

  const cols = [
    { label: 'ATTENDEE',  value: t.attendee_name || 'Creator' },
    { label: 'TICKET ID', value: t.ticket_number || '' },
    { label: 'ORDER ID',  value: 'ORD-' + (t.purchase_id || '').slice(0, 8).toUpperCase() },
    { label: 'PRICE',     value: fmtKES(t.amount_kes) },
  ];
  const colW = barW / cols.length;
  cols.forEach((c, i) => {
    const cx = barX + colW * i + 20;
    ctx.font = '700 9.5px Montserrat, sans-serif';
    ctx.fillStyle = mutedDark;
    _evFillTracked(ctx, c.label, cx, barY + 26, 1, 'left');
    ctx.font = '800 14px Montserrat, sans-serif';
    ctx.fillStyle = white;
    let val = String(c.value);
    if (ctx.measureText(val).width > colW - 30) {
      while (ctx.measureText(val + '…').width > colW - 30 && val.length > 3) val = val.slice(0, -1);
      val += '…';
    }
    ctx.fillText(val, cx, barY + 50);
  });

  // ── Stub: ADMIT ONE + QR + codes + barcode ─────────────────────────
  const stubCX = mainW + stubW / 2;
  ctx.textAlign = 'center';
  ctx.font = '800 14px Montserrat, sans-serif';
  ctx.fillStyle = darkGreen;
  ctx.fillText('★ — ADMIT ONE — ★', stubCX, 46);

  const qrBoxSize = 168, qrBoxX = mainW + (stubW - qrBoxSize) / 2, qrBoxY = 62;
  _evRoundedRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 14);
  ctx.strokeStyle = green;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const qrSize = 144, qrPad = (qrBoxSize - qrSize) / 2;
  try {
    if (typeof QRious !== 'undefined' && t.ticket_code) {
      const apiBase = (typeof API !== 'undefined' ? API : (typeof API_BASE !== 'undefined' ? API_BASE : ''));
      const verifyUrl = `${apiBase}/events/ticket/verify/${encodeURIComponent(t.ticket_code)}`;
      const off = document.createElement('canvas');
      new QRious({ element: off, value: verifyUrl, size: qrSize, level: 'M', background: '#ffffff', foreground: '#0b0b0b' });
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

  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  _evFillTracked(ctx, 'SCAN TO CHECK-IN', stubCX, qrBoxY + qrBoxSize + 18, 1, 'center');

  let stubY = qrBoxY + qrBoxSize + 42;
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = green;
  _evFillTracked(ctx, 'VERIFICATION CODE', stubCX, stubY, 1, 'center');
  stubY += 20;
  ctx.font = '800 15px Montserrat, sans-serif';
  ctx.fillStyle = black;
  ctx.fillText(t.ticket_number || '', stubCX, stubY);

  stubY += 26;
  ctx.font = '700 9px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  _evFillTracked(ctx, 'TICKET ID', stubCX, stubY, 1, 'center');
  stubY += 18;
  ctx.font = '700 12px Montserrat, sans-serif';
  ctx.fillStyle = black;
  ctx.fillText('EVT-' + (t.purchase_id || '').slice(0, 8).toUpperCase(), stubCX, stubY);

  // decorative barcode along the bottom of the stub
  _evDrawBarcode(ctx, mainW + 22, frontH - 34, stubW - 44, 22, t.purchase_id);

  ctx.textAlign = 'left';

  // ── Footer strip: brand / T&Cs / event date ────────────────────────
  ctx.textAlign = 'left';
  ctx.font = '900 15px Montserrat, sans-serif';
  ctx.fillStyle = white;
  ctx.fillText('EndaViral', padX, frontH + 34);
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.fillStyle = green;
  ctx.fillText('endaviral.co.ke', padX, frontH + 52);
  ctx.font = '600 11px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  ctx.fillText('Fuel Your Growth', padX, frontH + 68);

  ctx.textAlign = 'center';
  ctx.font = '600 11.5px Montserrat, sans-serif';
  ctx.fillStyle = '#8fa89c';
  const tncLines = _evWrapText(ctx, 'Valid for one entry · Present this QR code at the gate · Non-transferable & non-refundable · Arrive early to secure your spot', W * 0.42);
  tncLines.slice(0, 3).forEach((line, i) => ctx.fillText(line, W / 2, frontH + 30 + i * 16));

  ctx.textAlign = 'right';
  ctx.font = '800 12px Montserrat, sans-serif';
  ctx.fillStyle = white;
  const sponsorNames = (ev.sponsors || []).map(s => s.name).filter(Boolean);
  ctx.fillText(sponsorNames.length ? 'Sponsored by' : 'See you there!', W - padX, frontH + 34);
  ctx.font = '600 11px Montserrat, sans-serif';
  ctx.fillStyle = mutedDark;
  ctx.fillText(sponsorNames.length ? sponsorNames.slice(0, 2).join(', ') : ev.event_date, W - padX, frontH + 52);
  ctx.font = '600 10.5px Montserrat, sans-serif';
  ctx.fillText('@endaviral_ke', W - padX, frontH + 68);

  ctx.textAlign = 'left';
  ctx.restore(); // release outer rounded-rect clip
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