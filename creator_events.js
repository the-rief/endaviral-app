/* ═══════════════════════ CREATOR EVENTS (public) ═══════════════════════
 * Browse published events, buy a ticket (M-Pesa STK push via Nexus Pay),
 * poll for payment, then view/download the ticket — same purchase-poll
 * shape as the Academy premium-module unlock flow, and the ticket itself
 * uses the same "signed code -> QR -> downloadable card" pattern as an
 * Academy certificate.
 *
 * Depends on: api(), toast(), fmtKES(), esc() — globals from index.html
 * html2canvas is lazy-loaded from cdnjs only when the user hits Download,
 * so it never costs anything on pages that don't need it.
 * ════════════════════════════════════════════════════════════════════════ */

let _eventsCache = [];
let _eventsPollTimer = null;

function eventsInit() {
  loadEvents();
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
  el.innerHTML = _eventsCache.map(ev => `
    <div class="event-card" style="background:var(--navy);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;">
      ${ev.cover_image_url ? `<img src="${esc(ev.cover_image_url)}" alt="" style="width:100%;height:150px;object-fit:cover;">` : ''}
      <div style="padding:16px;display:flex;flex-direction:column;gap:8px;flex:1;">
        <div style="font-size:11px;color:var(--green);font-weight:700;letter-spacing:.05em;">CREATOR EVENT</div>
        <div style="font-size:17px;font-weight:700;">${esc(ev.title)}</div>
        <div style="font-size:13px;color:var(--muted);">
          📅 ${esc(ev.event_date)} · ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>
          📍 ${esc(ev.venue)}, ${esc(ev.city)}
        </div>
        ${(ev.highlights || []).length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;">
          ${ev.highlights.map(h => `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(61,212,74,.10);color:var(--green);">✓ ${esc(h)}</span>`).join('')}
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
  `).join('');
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
      <div style="background:var(--navy);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
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

// ─── Ticket render + download ───────────────────────────────────────────

async function eventOpenTicketByPurchase(purchaseId) {
  const modal = document.getElementById('eventTicketModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const wrap = document.getElementById('eventTicketCardWrap');
  wrap.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading ticket…</span></div>';
  try {
    const t = await api(`/events/my-tickets/${purchaseId}`);
    wrap.innerHTML = _renderTicketHtml(t);
    wrap.dataset.purchaseId = purchaseId;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function eventCloseTicket() {
  const modal = document.getElementById('eventTicketModal');
  if (modal) modal.style.display = 'none';
}

function _renderTicketHtml(t) {
  const ev = t.event;
  // QR encodes the verify URL door-staff will hit when they scan it.
  // API_BASE is whatever global your app already uses for the backend origin.
  const verifyUrl = `${(typeof API_BASE !== 'undefined' ? API_BASE : '')}/events/ticket/verify/${encodeURIComponent(t.ticket_code)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&color=000000&bgcolor=ffffff&data=${encodeURIComponent(verifyUrl)}`;

  return `
    <div id="ticketCardRender" style="background:#0b0b0b;border-radius:16px;overflow:hidden;font-family:inherit;color:#fff;max-width:520px;margin:0 auto;">
      <div style="display:flex;">
        <div style="flex:1;padding:20px;background:linear-gradient(135deg,#0b0b0b,#101a10);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <div style="font-weight:800;font-size:18px;">EV <span style="color:var(--green);">EndaViral</span></div>
          </div>
          <div style="font-size:11px;color:var(--green);font-weight:700;letter-spacing:.05em;">CREATOR EVENT</div>
          <div style="font-size:22px;font-weight:800;line-height:1.2;margin:4px 0 10px;">${esc(ev.title)}</div>
          <div style="font-size:13px;color:#bbb;line-height:1.7;">
            📅 ${esc(ev.event_date)}<br>
            ⏰ ${esc(ev.start_time_label)}${ev.end_time_label ? ' – ' + esc(ev.end_time_label) : ''}<br>
            📍 ${esc(ev.venue)}, ${esc(ev.city)}
          </div>
        </div>
        <div style="width:190px;background:#fff;color:#111;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:2px dashed #333;">
          <div style="font-size:11px;color:var(--green);font-weight:700;margin-bottom:8px;">ADMIT ONE</div>
          <img src="${qrSrc}" alt="Ticket QR" style="width:150px;height:150px;">
          <div style="font-size:10px;color:#666;margin-top:8px;">SCAN TO CHECK IN</div>
          <div style="font-size:12px;font-weight:700;margin-top:6px;">${esc(t.ticket_number)}</div>
        </div>
      </div>
      <div style="background:#111;padding:14px 20px;display:flex;justify-content:space-between;font-size:12px;">
        <div><span style="color:#888;">ATTENDEE</span><br><strong>${esc(t.attendee_name)}</strong></div>
        <div><span style="color:#888;">PRICE</span><br><strong>${fmtKES(t.amount_kes)}</strong></div>
        <div><span style="color:#888;">STATUS</span><br><strong>${t.checked_in ? 'Checked in ✅' : 'Not checked in'}</strong></div>
      </div>
    </div>
  `;
}

async function downloadTicket() {
  const wrap = document.getElementById('eventTicketCardWrap');
  const target = document.getElementById('ticketCardRender');
  if (!target) return;
  try {
    await _ensureHtml2Canvas();
    const canvas = await html2canvas(target, { backgroundColor: '#0b0b0b', scale: 2 });
    const link = document.createElement('a');
    link.download = `endaviral-ticket-${wrap.dataset.purchaseId || 'ticket'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    toast('Could not generate the ticket image — try again', 'error');
  }
}

let _html2canvasLoading = null;
function _ensureHtml2Canvas() {
  if (typeof html2canvas !== 'undefined') return Promise.resolve();
  if (_html2canvasLoading) return _html2canvasLoading;
  _html2canvasLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _html2canvasLoading;
}