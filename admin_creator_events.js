/* ════════════════════ ADMIN — CREATOR EVENTS PANEL ════════════════════
 * Create/edit physical training events, publish them, watch ticket sales
 * and revenue, and view/export the attendee list.
 *
 * Depends on: api(), toast(), fmtKES(), esc() — globals from index.html / admin.js
 * Entry point: adminTab('creator-events', el) calls adminEventsInit()
 *
 * HTML this expects to find in the admin tab markup:
 *   #adminEventsList              — the events table container
 *   #adminEventEditorModal        — create/edit modal
 *   #adminEventAttendeesModal     — attendees list modal
 *   plus the form fields referenced by id in _readEventForm() below
 * ════════════════════════════════════════════════════════════════════════ */

let _adminEventsCache = [];
let _adminEventsEditingId = null; // null = creating new

function adminEventsInit() {
  loadAdminEvents();
  loadAdminCityRequests();
}

// ─── List ───────────────────────────────────────────────────────────────

async function loadAdminEvents() {
  const el = document.getElementById('adminEventsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading events…</span></div>';
  try {
    const events = await api('/admin/events');
    _adminEventsCache = events || [];
    renderAdminEvents();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderAdminEvents() {
  const el = document.getElementById('adminEventsList');
  if (!el) return;
  if (!_adminEventsCache.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🎤</div><p>No events yet — create one to get started.</p></div>';
    return;
  }
  const statusBadge = (s) => {
    const map = {
      draft:     ['var(--navy)', 'var(--muted)'],
      published: ['rgba(61,212,74,.12)', 'var(--green)'],
      completed: ['rgba(100,150,255,.12)', '#6496ff'],
      cancelled: ['rgba(255,80,80,.12)', '#ff5050'],
    };
    const [bg, fg] = map[s] || map.draft;
    return `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${bg};color:${fg};">${esc(s)}</span>`;
  };
  el.innerHTML = `<table>
    <thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Price</th><th>Slots</th><th>Revenue</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${_adminEventsCache.map(e => `
      <tr>
        <td><strong>${esc(e.title)}</strong></td>
        <td>${esc(e.event_date)}</td>
        <td>${esc(e.venue)}, ${esc(e.city)}</td>
        <td>${fmtKES(e.ticket_price_kes)}</td>
        <td>${e.slots_taken} / ${e.capacity}</td>
        <td style="color:var(--green);">${fmtKES(e.slots_taken * e.ticket_price_kes)}</td>
        <td>${statusBadge(e.status)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="action-btn" onclick="adminEventOpenEdit('${esc(e.id)}')">Edit</button>
            <button class="action-btn" onclick="adminEventOpenAttendees('${esc(e.id)}')">Attendees</button>
            ${e.status === 'draft' ? `<button class="action-btn" onclick="adminEventPublish('${esc(e.id)}')">Publish</button>` : ''}
            ${e.status === 'published' ? `<button class="action-btn danger" onclick="adminEventCancel('${esc(e.id)}')">Cancel</button>` : ''}
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ─── Create / edit modal ────────────────────────────────────────────────

function adminEventOpenCreate() {
  _adminEventsEditingId = null;
  _resetEventForm();
  document.getElementById('adminEventEditorTitle').textContent = 'New Creator Event';
  const modal = document.getElementById('adminEventEditorModal');
  modal.style.display = 'flex';
  // .modal-overlay is opacity:0/pointer-events:none by default (see CSS) —
  // every other modal in this app becomes visible/clickable via the
  // .show class, not by toggling `display` alone. Without this the modal
  // "opens" but stays invisible and unclickable.
  requestAnimationFrame(() => modal.classList.add('show'));
}

function adminEventOpenEdit(eventId) {
  const ev = _adminEventsCache.find(e => e.id === eventId);
  if (!ev) return;
  _adminEventsEditingId = eventId;
  _fillEventForm(ev);
  document.getElementById('adminEventEditorTitle').textContent = `Edit: ${ev.title}`;
  const modal = document.getElementById('adminEventEditorModal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function adminEventCloseEditor() {
  const modal = document.getElementById('adminEventEditorModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
}

// ─── Speakers / sponsors repeaters ──────────────────────────────────────
// Replaces the old "paste a JSON array" textareas — admins fill in plain
// name/topic/bio fields per speaker (or name/logo per sponsor) and this
// assembles the same speakers[]/sponsors[] shape the API expects.

let _evSpeakers = [];
let _evSponsors = [];

function evAddSpeaker(speaker) {
  _evSpeakers.push(speaker || { name: '', bio: '', topic: '', photo_url: '' });
  _renderEvSpeakers();
}

function evRemoveSpeaker(i) {
  _evSpeakers.splice(i, 1);
  _renderEvSpeakers();
}

function _evUpdateSpeaker(i, field, value) {
  if (_evSpeakers[i]) _evSpeakers[i][field] = value;
}

function _renderEvSpeakers() {
  const el = document.getElementById('evSpeakersList');
  if (!el) return;
  if (!_evSpeakers.length) {
    el.innerHTML = '<div style="font-size:12.5px;color:var(--muted);">No speakers added yet — optional, but attendees like knowing who they\'ll hear from.</div>';
    return;
  }
  el.innerHTML = _evSpeakers.map((s, i) => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative;">
      <button type="button" onclick="evRemoveSpeaker(${i})" title="Remove speaker" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;">✕</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-right:20px;">
        <div class="field" style="margin:0;"><label style="font-size:11px;">Name *</label><input type="text" value="${esc(s.name)}" oninput="_evUpdateSpeaker(${i},'name',this.value)" placeholder="Jane Doe"/></div>
        <div class="field" style="margin:0;"><label style="font-size:11px;">Topic</label><input type="text" value="${esc(s.topic)}" oninput="_evUpdateSpeaker(${i},'topic',this.value)" placeholder="Growth on TikTok"/></div>
        <div class="field" style="grid-column:1/-1;margin:0;"><label style="font-size:11px;">Bio</label><input type="text" value="${esc(s.bio)}" oninput="_evUpdateSpeaker(${i},'bio',this.value)" placeholder="Short bio…"/></div>
        <div class="field" style="grid-column:1/-1;margin:0;"><label style="font-size:11px;">Photo URL</label><input type="text" value="${esc(s.photo_url)}" oninput="_evUpdateSpeaker(${i},'photo_url',this.value)" placeholder="https://…"/></div>
      </div>
    </div>`).join('');
}

function evAddSponsor(sponsor) {
  _evSponsors.push(sponsor || { name: '', logo_url: '' });
  _renderEvSponsors();
}

function evRemoveSponsor(i) {
  _evSponsors.splice(i, 1);
  _renderEvSponsors();
}

function _evUpdateSponsor(i, field, value) {
  if (_evSponsors[i]) _evSponsors[i][field] = value;
}

function _renderEvSponsors() {
  const el = document.getElementById('evSponsorsList');
  if (!el) return;
  if (!_evSponsors.length) {
    el.innerHTML = '<div style="font-size:12.5px;color:var(--muted);">No sponsors added yet — optional, display credit only.</div>';
    return;
  }
  el.innerHTML = _evSponsors.map((s, i) => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative;">
      <button type="button" onclick="evRemoveSponsor(${i})" title="Remove sponsor" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;">✕</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-right:20px;">
        <div class="field" style="margin:0;"><label style="font-size:11px;">Name *</label><input type="text" value="${esc(s.name)}" oninput="_evUpdateSponsor(${i},'name',this.value)" placeholder="Safaricom"/></div>
        <div class="field" style="margin:0;"><label style="font-size:11px;">Logo URL</label><input type="text" value="${esc(s.logo_url)}" oninput="_evUpdateSponsor(${i},'logo_url',this.value)" placeholder="https://…"/></div>
      </div>
    </div>`).join('');
}

function _resetEventForm() {
  ['evTitle', 'evDescription', 'evCoverImage', 'evVenue', 'evCity', 'evDate',
   'evStartTime', 'evEndTime'].forEach(id => { const f = document.getElementById(id); if (f) f.value = ''; });
  document.getElementById('evPrice').value = 500;
  document.getElementById('evCapacity').value = 50;
  document.getElementById('evHighlights').value = '';
  _evSpeakers = [];
  _evSponsors = [];
  _renderEvSpeakers();
  _renderEvSponsors();
}

function _fillEventForm(ev) {
  document.getElementById('evTitle').value = ev.title || '';
  document.getElementById('evDescription').value = ev.description || '';
  document.getElementById('evCoverImage').value = ev.cover_image_url || '';
  document.getElementById('evVenue').value = ev.venue || '';
  document.getElementById('evCity').value = ev.city || '';
  document.getElementById('evDate').value = ev.event_date || '';
  document.getElementById('evStartTime').value = ev.start_time_label || '';
  document.getElementById('evEndTime').value = ev.end_time_label || '';
  document.getElementById('evPrice').value = ev.ticket_price_kes;
  document.getElementById('evCapacity').value = ev.capacity;
  document.getElementById('evHighlights').value = (ev.highlights || []).join(', ');
  _evSpeakers = (ev.speakers || []).map(s => ({
    name: s.name || '', bio: s.bio || '', topic: s.topic || '', photo_url: s.photo_url || '',
  }));
  _evSponsors = (ev.sponsors || []).map(s => ({
    name: s.name || '', logo_url: s.logo_url || '',
  }));
  _renderEvSpeakers();
  _renderEvSponsors();
}

function _readEventForm() {
  // Blank rows (no name typed) are dropped rather than erroring — an
  // admin who clicked "+ Add Speaker" then changed their mind shouldn't
  // have to also remember to delete the row.
  const speakers = _evSpeakers
    .filter(s => (s.name || '').trim())
    .map(s => ({ name: s.name.trim(), bio: (s.bio || '').trim(), topic: (s.topic || '').trim(), photo_url: (s.photo_url || '').trim() }));
  const sponsors = _evSponsors
    .filter(s => (s.name || '').trim())
    .map(s => ({ name: s.name.trim(), logo_url: (s.logo_url || '').trim() }));

  return {
    title: document.getElementById('evTitle').value.trim(),
    description: document.getElementById('evDescription').value.trim(),
    cover_image_url: document.getElementById('evCoverImage').value.trim(),
    venue: document.getElementById('evVenue').value.trim(),
    city: document.getElementById('evCity').value.trim(),
    event_date: document.getElementById('evDate').value,
    start_time_label: document.getElementById('evStartTime').value.trim(),
    end_time_label: document.getElementById('evEndTime').value.trim(),
    ticket_price_kes: parseInt(document.getElementById('evPrice').value, 10),
    capacity: parseInt(document.getElementById('evCapacity').value, 10),
    highlights: document.getElementById('evHighlights').value.split(',').map(s => s.trim()).filter(Boolean),
    speakers,
    sponsors,
  };
}

async function adminEventSave() {
  let body;
  try { body = _readEventForm(); } catch (e) { toast(e.message, 'error'); return; }
  if (!body.title || !body.venue || !body.city || !body.event_date || !body.start_time_label) {
    toast('Title, venue, city, date and start time are required', 'error');
    return;
  }
  try {
    if (_adminEventsEditingId) {
      await api(`/admin/events/${_adminEventsEditingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Event updated', 'success');
    } else {
      await api('/admin/events', { method: 'POST', body: JSON.stringify(body) });
      toast('Event created as draft — publish it when ready', 'success');
    }
    adminEventCloseEditor();
    loadAdminEvents();
  } catch (e) { toast(e.message, 'error'); }
}

async function adminEventPublish(eventId) {
  if (!confirm('Publish this event? It will become visible and bookable immediately.')) return;
  try {
    await api(`/admin/events/${eventId}/publish`, { method: 'POST' });
    toast('Event published', 'success');
    loadAdminEvents();
  } catch (e) { toast(e.message, 'error'); }
}

async function adminEventCancel(eventId) {
  if (!confirm('Cancel this event? Existing ticket holders will need manual refunds.')) return;
  try {
    const res = await api(`/admin/events/${eventId}/cancel`, { method: 'POST' });
    toast(res.message || 'Event cancelled', 'success');
    loadAdminEvents();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Attendees modal ────────────────────────────────────────────────────

async function adminEventOpenAttendees(eventId) {
  const ev = _adminEventsCache.find(e => e.id === eventId);
  const modal = document.getElementById('adminEventAttendeesModal');
  const body = document.getElementById('adminEventAttendeesBody');
  if (!modal || !body) return;
  document.getElementById('adminEventAttendeesTitle').textContent = ev ? `Attendees: ${ev.title}` : 'Attendees';
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
  body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    const [attendees, stats] = await Promise.all([
      api(`/admin/events/${eventId}/attendees`),
      api(`/admin/events/${eventId}/stats`),
    ]);
    body.innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap;">
        <div><div style="font-size:12px;color:var(--muted);">Sold</div><div style="font-size:20px;font-weight:700;">${stats.slots_taken}/${stats.capacity}</div></div>
        <div><div style="font-size:12px;color:var(--muted);">Revenue</div><div style="font-size:20px;font-weight:700;color:var(--green);">${fmtKES(stats.revenue_kes)}</div></div>
        <div><div style="font-size:12px;color:var(--muted);">Checked in</div><div style="font-size:20px;font-weight:700;">${stats.checked_in_count}</div></div>
      </div>
      ${!attendees.length ? '<div class="empty-state"><p>No tickets sold yet.</p></div>' : `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Paid</th><th>Purchased</th><th>Checked in</th></tr></thead>
        <tbody>${attendees.map(a => `
          <tr>
            <td>${esc(a.name)}</td>
            <td>${esc(a.email)}</td>
            <td>${fmtKES(a.amount_kes)}</td>
            <td style="font-size:12px;color:var(--muted);">${a.purchased_at ? new Date(a.purchased_at).toLocaleString() : '—'}</td>
            <td>${a.checked_in ? '✅' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    `;
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function adminEventCloseAttendees() {
  const modal = document.getElementById('adminEventAttendeesModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.style.display = 'none';
}

// ─── City requests — demand signal from the public empty-state form ──────
// Fed by GET /admin/events/city-requests. Shows a "top requested cities"
// leaderboard plus the raw list of every submission (city, what they want
// to learn, who asked, when), so this data can actually drive where the
// next Creator Event gets scheduled.

async function loadAdminCityRequests() {
  const el = document.getElementById('adminCityRequestsPanel');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading city requests…</span></div>';
  try {
    const data = await api('/admin/events/city-requests');
    renderAdminCityRequests(data);
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function renderAdminCityRequests(data) {
  const el = document.getElementById('adminCityRequestsPanel');
  if (!el) return;
  const requests = data.requests || [];
  const topCities = data.top_cities || [];

  if (!requests.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>No city requests yet — they\'ll show up here once creators submit them from the Creator Events page.</p></div>';
    return;
  }

  const leaderboard = topCities.length ? `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px;">
      ${topCities.map((c, i) => `
        <div style="background:var(--card,var(--navy));border:1px solid var(--border);border-radius:12px;padding:14px 16px;position:relative;">
          ${i === 0 ? '<div style="position:absolute;top:-9px;right:10px;font-size:16px;">🏆</div>' : ''}
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">#${i + 1}</div>
          <div style="font-size:16px;font-weight:800;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(c.city)}">${esc(c.city)}</div>
          <div style="font-size:20px;font-weight:800;color:var(--green);margin-top:4px;">${c.count} <span style="font-size:11px;color:var(--muted);font-weight:600;">vote${c.count === 1 ? '' : 's'}</span></div>
        </div>`).join('')}
    </div>` : '';

  const rows = requests.map(r => `
    <tr>
      <td><strong>${esc(r.city)}</strong></td>
      <td style="max-width:340px;font-size:13px;color:var(--muted);white-space:pre-wrap;">${esc(r.topics || '—')}</td>
      <td style="font-size:13px;">${esc(r.requester_name || '—')}${r.requester_email ? `<div style="font-size:11px;color:var(--muted);">${esc(r.requester_email)}</div>` : ''}</td>
      <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--muted);margin-bottom:10px;">🏆 TOP REQUESTED CITIES</div>
    ${leaderboard}
    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--muted);margin:20px 0 10px;">📋 ALL REQUESTS (${requests.length})</div>
    <table>
      <thead><tr><th>City</th><th>Wants to learn</th><th>Requested by</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}