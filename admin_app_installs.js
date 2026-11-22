/* ═══════════════ ADMIN → APP INSTALLS ═══════════════
 * Who has EndaViral on their home screen. The installed app says hello at most
 * once a day (ev_pwa.js → POST /app/seen), so this is counted from the day it
 * went live. Phones never report removals: anyone not seen for 30 days is
 * shown faded as "may have removed it".
 * Data: GET /admin/app-installs (admin only). Loaded only when the tab is opened.
 * Depends on globals: api(), esc(), currentUser.
 * ════════════════════════════════════════════════════ */

const _aiPlat = { iphone: 'iPhone', ipad: 'iPad', android: 'Android', windows: 'Windows', mac: 'Mac', other: 'Other' };
const _aiIcon = (id) => `<svg class="ev-i" aria-hidden="true"><use href="#ev-${id}"></use></svg>`;
const _aiNum = (n) => Number(n || 0).toLocaleString('en-KE');
function _aiAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 864e5;
  return d < 1 ? 'today' : d < 2 ? 'yesterday' : `${Math.round(d)} days ago`;
}
const _aiDate = (iso) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

async function loadAdminAppInstalls() {
  const root = document.getElementById('appInstallsRoot');
  if (!root) return;
  if (!currentUser || currentUser.role !== 'admin') { root.innerHTML = '<div class="empty-state"><p>Admins only.</p></div>'; return; }
  root.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div>';
  try {
    root.innerHTML = _aiRender(await api('/admin/app-installs'));
  } catch (e) {
    root.innerHTML = `<div class="ai-err">${String(e.message || e).includes('Not Found')
      ? 'This page needs the latest server update. Deploy the backend, then open it again.'
      : 'Could not load: ' + esc(e.message || e)}</div>`;
  }
}

function _aiRender(d) {
  const plats = Object.entries(d.by_platform || {});
  const pmax = Math.max(1, ...plats.map(([, v]) => v));
  const daily = d.daily || [];
  const dmax = Math.max(1, ...daily.map((x) => x.new));
  const dsum = daily.reduce((t, x) => t + x.new, 0);
  const stat = (cls, ic, label, value, sub) => `<div class="ai-stat ${cls}"><div class="ai-stat-ic">${_aiIcon(ic)}</div>
    <div class="ai-stat-l">${label}</div><div class="ai-stat-v">${value}</div><div class="ai-stat-s">${sub}</div></div>`;
  const chip = (p) => `<span class="ai-chip">${_aiIcon(p === 'windows' || p === 'mac' ? 'laptop' : 'phone')}${_aiPlat[p] || esc(p)}</span>`;

  return `
  <div class="sec-hd"><div><div class="sec-title">APP INSTALLS</div>
    <div class="sec-sub">People who use EndaViral from their home-screen icon. Your admin and CCR devices aren't counted.</div></div>
    <button class="btn-secondary" style="display:inline-flex;align-items:center;gap:6px;" onclick="loadAdminAppInstalls()">${_aiIcon('refresh')} Refresh</button></div>

  <div class="ai-stats">
    ${stat('s1', 'phone', 'Devices with the app', _aiNum(d.active), `opened in the last 30 days · ${_aiNum(d.devices)} ever`)}
    ${stat('s2', 'users', 'Users with the app', _aiNum(d.users), 'signed in on at least one device')}
    ${stat('s3', 'trending', 'New this week', _aiNum(d.new_7d), 'devices installed in the last 7 days')}
    ${stat('s4', 'eye', 'Not signed in', _aiNum(d.guests), 'installed, but no account on that device yet')}
  </div>

  <div class="ai-grid">
    <div class="ai-card"><div class="ai-h">By device</div><div class="ai-sub">Opened in the last 30 days</div>
      ${plats.length ? plats.map(([k, v]) => `<div class="ai-row"><span>${_aiPlat[k] || esc(k)}</span><span class="ai-track"><span style="width:${Math.max(3, v / pmax * 100)}%"></span></span><b>${_aiNum(v)}</b></div>`).join('')
        : '<div class="ai-empty">No installs yet.</div>'}
    </div>
    <div class="ai-card"><div class="ai-h">New installs per day</div><div class="ai-sub">Last 30 days · ${_aiNum(dsum)} in total</div>
      <div class="ai-cols">${daily.map((x) => `<span title="${esc(_aiDate(x.date))}: ${x.new}" style="height:${x.new ? Math.max(6, x.new / dmax * 100) : 2}%"></span>`).join('')}</div>
      <div class="ai-axis"><span>${daily[0] ? esc(_aiDate(daily[0].date)) : ''}</span><span>Today</span></div>
    </div>
  </div>

  <div class="ai-card"><div class="ai-h">${_aiIcon('phone')} Who has the app</div>
    <div class="ai-sub">Counted from the first time each person opens the installed app.</div>
    ${(d.people || []).length ? `<div class="ai-tbl"><table><thead><tr><th>User</th><th>Device</th><th>Installed</th><th>Last opened</th></tr></thead><tbody>
      ${d.people.map((p) => `<tr class="${p.active ? '' : 'ai-old'}">
        <td data-label="User"><strong>${esc(p.name || '—')}</strong><div class="ai-muted">${esc(p.email || p.phone || '')}</div></td>
        <td data-label="Device"><span class="ai-chips">${p.platforms.map(chip).join('')}</span></td>
        <td data-label="Installed">${_aiDate(p.first_seen)}</td>
        <td data-label="Last opened"><span>${_aiAgo(p.last_seen)}${p.active ? '' : '<span class="ai-note">may have removed it</span>'}</span></td></tr>`).join('')}
      </tbody></table></div>`
      : '<div class="ai-empty">Nobody has opened the installed app yet. It starts counting the first time each person opens it.</div>'}
  </div>`;
}

/* styles (scoped to this panel) */
(function () {
  if (document.getElementById('ai-css')) return;
  const s = document.createElement('style'); s.id = 'ai-css';
  s.textContent = `
#appInstallsRoot .ai-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:14px 0; }
#appInstallsRoot .ai-stat { position:relative; overflow:hidden; border-radius:14px; padding:16px 18px; color:#fff; box-shadow:0 10px 28px -14px var(--g); }
#appInstallsRoot .ai-stat::after { content:""; position:absolute; right:-30px; top:-30px; width:110px; height:110px; border-radius:50%; background:rgba(255,255,255,.12); }
#appInstallsRoot .s1 { background:linear-gradient(135deg,#0d1b3e,#1f3a8a); --g:#1f3a8a; }
#appInstallsRoot .s2 { background:linear-gradient(135deg,#1a7f2a,#3dd44a); --g:#3dd44a; }
#appInstallsRoot .s3 { background:linear-gradient(135deg,#7a1fd1,#c04ae8); --g:#c04ae8; }
#appInstallsRoot .s4 { background:linear-gradient(135deg,#c2410c,#ff8a3d); --g:#ff8a3d; }
#appInstallsRoot .ai-stat-ic { width:30px; height:30px; border-radius:9px; display:grid; place-items:center; background:rgba(255,255,255,.16); margin-bottom:10px; }
#appInstallsRoot .ai-stat-ic .ev-i { width:16px; height:16px; }
#appInstallsRoot .ai-stat-l { font-size:12px; font-weight:700; opacity:.9; }
#appInstallsRoot .ai-stat-v { font-size:28px; font-weight:800; line-height:1.15; margin:2px 0; }
#appInstallsRoot .ai-stat-s { font-size:11.5px; opacity:.85; }
#appInstallsRoot .ai-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
#appInstallsRoot .ai-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:16px 18px; margin-bottom:12px; }
#appInstallsRoot .ai-grid .ai-card { margin-bottom:0; }
#appInstallsRoot .ai-h { font-weight:800; font-size:15px; display:flex; align-items:center; gap:6px; }
#appInstallsRoot .ai-sub { font-size:12px; color:var(--muted); margin:2px 0 12px; }
#appInstallsRoot .ai-row { display:grid; grid-template-columns:80px 1fr 36px; gap:10px; align-items:center; font-size:13px; margin:8px 0; }
#appInstallsRoot .ai-row b { text-align:right; }
#appInstallsRoot .ai-track { height:10px; border-radius:6px; background:rgba(128,128,160,.15); overflow:hidden; }
#appInstallsRoot .ai-track span { display:block; height:100%; border-radius:6px; background:linear-gradient(90deg,#3dd44a,#26c6da); box-shadow:0 0 10px rgba(61,212,74,.5); }
#appInstallsRoot .ai-cols { display:flex; align-items:flex-end; gap:3px; height:96px; }
#appInstallsRoot .ai-cols span { flex:1; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#3dd44a,#1f8a4c); min-height:2px; }
#appInstallsRoot .ai-axis { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-top:6px; }
#appInstallsRoot .ai-tbl { overflow-x:auto; }
#appInstallsRoot .ai-tbl td { font-size:13px; vertical-align:middle; }
#appInstallsRoot .ai-muted { font-size:12px; color:var(--muted); }
#appInstallsRoot .ai-chips { display:inline-flex; flex-wrap:wrap; gap:5px; }
#appInstallsRoot .ai-chip { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700;
  color:#3dd44a; background:rgba(61,212,74,.1); border:1px solid rgba(61,212,74,.35); white-space:nowrap; }
#appInstallsRoot .ai-chip .ev-i { width:13px; height:13px; }
#appInstallsRoot .ai-note { display:block; font-size:11.5px; color:var(--muted); }
#appInstallsRoot tr.ai-old td { opacity:.55; }
#appInstallsRoot .ai-empty { padding:18px 0; color:var(--muted); font-size:13px; }
#appInstallsRoot .ai-err { padding:30px; color:#ff5252; }
@media (max-width:900px) { #appInstallsRoot .ai-stats { grid-template-columns:1fr 1fr; } #appInstallsRoot .ai-grid { grid-template-columns:1fr; } }
@media (max-width:420px) { #appInstallsRoot .ai-stat { padding:14px; } #appInstallsRoot .ai-stat-v { font-size:24px; } }`;
  document.head.appendChild(s);
})();
