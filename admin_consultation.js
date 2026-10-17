/* ════════════════════ ADMIN — CONSULTATIONS PANEL ════════════════════
 * Worklist of paid "Hire EndaViral" consult bookings — call the person,
 * set up a Google Meet, and log what happened. No video call happens
 * inside this app; this is purely the CRM layer around the payment.
 *
 * Depends on: api(), toast(), esc() — globals from index.html / admin.js
 * Entry point: adminTab('consultations', el) calls loadAdminConsultations()
 *
 * HTML this expects:
 *   #adminConsultationsList   — the table container
 *   #consultStatsRow          — small stat cards row
 *   #consultStageFilter       — <select> filter
 *   #consultScheduleModal     — schedule modal, with #consultScheduleAt / #consultMeetLink
 * ════════════════════════════════════════════════════════════════════════ */

let _adminConsultCache = [];
let _adminConsultSchedulingId = null;

async function loadAdminConsultations() {
  const el = document.getElementById('adminConsultationsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading consultations…</span></div>';

  const stage = document.getElementById('consultStageFilter')?.value || '';
  const tier = document.getElementById('consultTierFilter')?.value || '';
  const qs = new URLSearchParams();
  if (stage) qs.set('stage', stage);
  if (tier) qs.set('tier', tier);

  try {
    const [bookings, stats] = await Promise.all([
      api(`/admin/consultations${qs.toString() ? `?${qs}` : ''}`),
      api('/admin/consultations/stats'),
    ]);
    _adminConsultCache = bookings || [];
    _renderConsultStats(stats);
    _renderAdminConsultations();
  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

function _renderConsultStats(stats) {
  const el = document.getElementById('consultStatsRow');
  if (!el || !stats) return;
  const cards = [
    ['Paid Bookings', stats.paid_bookings],
    ['Awaiting Contact', stats.awaiting_contact],
    ['Completed', stats.completed],
    ['Revenue', fmtKES(stats.revenue_kes)],
  ];
  el.innerHTML = cards.map(([label, val]) => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${esc(label)}</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">${val}</div>
    </div>
  `).join('');
  _renderConsultTierStats(stats.by_tier || []);
}

const _CONSULT_TIER_STYLE = {
  quick_fix:   ['rgba(122,143,173,.16)', '#a9b8d0'],
  growth_plan: ['rgba(61,212,74,.14)', 'var(--green)'],
  money_plan:  ['rgba(34,211,238,.14)', 'var(--cyan)'],
  management:  ['rgba(255,176,32,.15)', 'var(--gold)'],
};
const _CONSULT_GOAL_LABEL = {
  sales: 'More customers', brand_deals: 'Brand deals',
  grow_audience: 'Grow audience', engagement: 'Engagement',
};

function _tierBadge(tier, label) {
  const [bg, fg] = _CONSULT_TIER_STYLE[tier] || _CONSULT_TIER_STYLE.quick_fix;
  return `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${bg};color:${fg};white-space:nowrap;">${esc(label || tier)}</span>`;
}

// One card per package — click to filter the table to that package
function _renderConsultTierStats(rows) {
  const el = document.getElementById('consultTierStatsRow');
  if (!el) return;
  const active = document.getElementById('consultTierFilter')?.value || '';
  el.innerHTML = rows.map(r => {
    const [, fg] = _CONSULT_TIER_STYLE[r.tier] || _CONSULT_TIER_STYLE.quick_fix;
    const on = active === r.tier;
    return `
    <div onclick="adminConsultFilterTier('${esc(r.tier)}')" style="cursor:pointer;background:var(--card);border:1px solid ${on ? fg : 'var(--border)'};border-left:3px solid ${fg};border-radius:12px;padding:12px 14px;">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 6px;">
        <div style="font-size:12.5px;font-weight:800;color:${fg};">${esc(r.label)}</div>
        <div style="font-size:11px;color:var(--muted);white-space:nowrap;">${fmtKES(r.price_kes)}${r.kind === 'monthly' ? '/mo' : ''}</div>
      </div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">${r.paid} <span style="font-size:12px;color:var(--muted);font-weight:600;">paid</span></div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${fmtKES(r.revenue_kes)} · ${r.awaiting_contact ? `<span style="color:#ffc107;">${r.awaiting_contact} to call</span>` : 'all contacted'}</div>
    </div>`;
  }).join('');
}

function adminConsultFilterTier(tier) {
  const sel = document.getElementById('consultTierFilter');
  if (!sel) return;
  sel.value = sel.value === tier ? '' : tier;
  loadAdminConsultations();
}

function _stageBadge(stage) {
  const map = {
    to_contact: ['rgba(255,193,7,.14)', '#ffc107', 'To contact'],
    contacted:  ['rgba(74,168,255,.14)', '#4aa8ff', 'Contacted'],
    scheduled:  ['rgba(155,107,255,.16)', '#9b6bff', 'Scheduled'],
    completed:  ['rgba(61,212,74,.14)', 'var(--green)', 'Completed'],
  };
  const [bg, fg, label] = map[stage] || map.to_contact;
  return `<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:${bg};color:${fg};">${label}</span>`;
}

function _renderAdminConsultations() {
  const el = document.getElementById('adminConsultationsList');
  if (!el) return;
  if (!_adminConsultCache.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">💼</div><p>No consultations match this filter.</p></div>';
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Package</th><th>Name</th><th>Phone</th><th>Account &amp; goal</th><th>Notes</th><th>Paid</th><th>Stage</th><th>Meet</th><th>Actions</th></tr></thead>
    <tbody>${_adminConsultCache.map(b => `
      <tr>
        <td>${_tierBadge(b.tier, b.tier_label)}
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${fmtKES(b.amount_kes)}${b.credit_kes ? ` <span title="Consult fee credited">(−${fmtKES(b.credit_kes)} credit)</span>` : ''}</div></td>
        <td><strong>${esc(b.name)}</strong>${b.business_name ? `<div style="font-size:11px;color:var(--muted);">${esc(b.business_name)}</div>` : ''}${b.email ? `<div style="font-size:11px;color:var(--muted);">${esc(b.email)}</div>` : ''}</td>
        <td><a href="tel:${esc(b.phone)}" style="color:var(--white);">${esc(b.phone)}</a></td>
        <td>${b.social_handle ? `<strong>${esc(b.social_handle)}</strong>` : '—'}${b.goal ? `<div style="font-size:11px;color:var(--muted);">🎯 ${esc(_CONSULT_GOAL_LABEL[b.goal] || b.goal)}</div>` : ''}</td>
        <td style="max-width:220px;font-size:12.5px;color:var(--muted);white-space:normal;">${esc(b.notes || '—')}</td>
        <td>${b.paid_at ? new Date(b.paid_at).toLocaleString() : '—'}</td>
        <td>${_stageBadge(b.stage)}</td>
        <td>${b.meet_link ? `<a href="${esc(b.meet_link)}" target="_blank" rel="noopener" style="color:var(--green);">Join link</a>${b.scheduled_at ? `<div style="font-size:11px;color:var(--muted);">${new Date(b.scheduled_at).toLocaleString()}</div>` : ''}` : '—'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${!b.contacted_at ? `<button class="action-btn" onclick="adminConsultMarkContacted('${esc(b.id)}')">Mark Contacted</button>` : ''}
            <button class="action-btn" onclick="adminConsultOpenSchedule('${esc(b.id)}')">${b.scheduled_at ? 'Reschedule' : 'Schedule'}</button>
            ${!b.completed_at ? `<button class="action-btn" onclick="adminConsultMarkCompleted('${esc(b.id)}')">Mark Completed</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('')}</tbody>
  </table>`;
}

// ─── Actions ────────────────────────────────────────────────────────────

async function adminConsultMarkContacted(id) {
  try {
    await api(`/admin/consultations/${id}/contacted`, { method: 'POST', body: JSON.stringify({}) });
    toast('Marked as contacted', 'success');
    loadAdminConsultations();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function adminConsultMarkCompleted(id) {
  try {
    await api(`/admin/consultations/${id}/complete`, { method: 'POST', body: JSON.stringify({}) });
    toast('Marked as completed', 'success');
    loadAdminConsultations();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function adminConsultOpenSchedule(id) {
  _adminConsultSchedulingId = id;
  const b = _adminConsultCache.find(x => x.id === id);
  document.getElementById('consultScheduleAt').value = b?.scheduled_at ? b.scheduled_at.slice(0, 16) : '';
  document.getElementById('consultMeetLink').value = b?.meet_link || '';
  document.getElementById('consultScheduleModal').classList.add('show');
}

function adminConsultCloseSchedule() {
  document.getElementById('consultScheduleModal').classList.remove('show');
  _adminConsultSchedulingId = null;
}

async function adminConsultSaveSchedule() {
  if (!_adminConsultSchedulingId) return;
  const scheduled_at = document.getElementById('consultScheduleAt').value;
  const meet_link = document.getElementById('consultMeetLink').value.trim();
  if (!scheduled_at) { toast('Pick a date and time', 'error'); return; }
  try {
    await api(`/admin/consultations/${_adminConsultSchedulingId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_at: new Date(scheduled_at).toISOString(), meet_link }),
    });
    toast('Session scheduled', 'success');
    adminConsultCloseSchedule();
    loadAdminConsultations();
  } catch (e) {
    toast(e.message, 'error');
  }
}