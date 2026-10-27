/* ═══════════════ ADMIN → BROADCASTS ═══════════════
 * Write one message; it is posted into EVERY client's support chat as a
 * message from EndaViral (topic "📣 Announcement" or "🎁 Special offer").
 * Clients see it exactly like any other message from us: live pop-up + chat
 * badge if the app is open, "New message from EndaViral" on the dashboard
 * otherwise. They can reply in the chat; replies reach Support as normal.
 *
 * Panel: composer (type, title, message) with a preview that uses the chat's
 * own message renderer (_ttMsgHtml in admin.js), then the sent list with
 * Delete from all chats / Reuse.
 *
 * Data: /admin/broadcasts/… (admin only; backend routers/broadcasts.py).
 * Loaded when the tab opens — no timers.
 * Depends on globals: api(), toast(), esc(), currentUser, _ttMsgHtml().
 * ══════════════════════════════════════════════════ */

(function injectBroadcastStyles() {
  const css = `
.bca-wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start;margin-bottom:22px;}
@media (max-width:980px){.bca-wrap{grid-template-columns:1fr;}}
.bca-box{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;}
.bca-lbl{display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 7px;}
.bca-lbl:first-child{margin-top:0;}
.bca-lbl .n{letter-spacing:0;text-transform:none;font-weight:600;}
.bca-lbl .n.over{color:#ff8a80;}
.bca-in{width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:11px 13px;color:var(--white);font-family:inherit;font-size:14px;outline:none;}
.bca-in:focus{border-color:var(--green);}
textarea.bca-in{min-height:150px;resize:vertical;line-height:1.5;}
.bca-hint{font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.45;}
.bca-hint code{background:rgba(255,255,255,.07);padding:1px 5px;border-radius:4px;color:var(--white);}
.bca-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.bca-seg button{border:1px solid var(--border);background:var(--navy);color:var(--muted);border-radius:10px;padding:11px 8px;font-weight:700;font-size:13px;cursor:pointer;text-align:left;line-height:1.3;}
.bca-seg button small{display:block;font-weight:500;font-size:11px;margin-top:2px;opacity:.85;}
.bca-seg button.on.announcement{border-color:var(--green);color:var(--white);background:rgba(61,212,74,.08);}
.bca-seg button.on.promo{border-color:var(--gold);color:var(--white);background:rgba(255,176,32,.08);}
.bca-tpl{display:flex;gap:6px;flex-wrap:wrap;}
.bca-tpl button{border:1px dashed var(--border);background:transparent;color:var(--muted);border-radius:999px;padding:5px 11px;font-size:11.5px;font-weight:600;cursor:pointer;}
.bca-tpl button:hover{color:var(--white);border-color:var(--muted);}
.bca-send{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;align-items:center;}
.bca-go{flex:1;min-width:200px;border:none;border-radius:11px;padding:13px 16px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#3dd44a,#28a035);color:#06120a;}
.bca-go.confirm{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#1a1200;}
.bca-go:disabled{opacity:.55;cursor:not-allowed;}
.bca-err{color:#ff8a80;font-size:12.5px;margin-top:10px;min-height:1px;}
.bca-aud{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.bca-aud div{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:12.5px;color:var(--muted);}
.bca-aud b{color:var(--white);font-size:14px;margin-right:4px;}
.bca-chat{background:#0c1322;border:1px solid var(--border);border-radius:14px;overflow:hidden;}
.bca-chat-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #1e2a40;font-size:13px;font-weight:700;}
.bca-chat-hd img{width:26px;height:auto;}
.bca-chat-body{padding:16px 14px 18px;display:flex;flex-direction:column;gap:10px;min-height:150px;}
.bca-hist{display:flex;flex-direction:column;gap:10px;}
.bca-h{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;}
.bca-h-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.bca-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;padding:4px 9px;border-radius:999px;}
.bca-chip.promo{background:rgba(255,176,32,.15);color:var(--gold);}
.bca-chip.announcement{background:rgba(61,212,74,.13);color:var(--green);}
.bca-state{font-size:10.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:3px 8px;border-radius:6px;}
.bca-state.live{background:rgba(61,212,74,.13);color:var(--green);}
.bca-state.taken_down{background:rgba(229,57,53,.13);color:#ff8a80;}
.bca-h-title{font-weight:800;font-size:15px;margin:8px 0 4px;overflow-wrap:anywhere;}
.bca-h-body{font-size:12.5px;color:var(--muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;}
.bca-stats{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:12px;color:var(--muted);}
.bca-stats b{color:var(--white);}
.bca-h-act{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}
`;
  const s = document.createElement('style');
  s.id = 'bcaStyles';
  s.textContent = css;
  document.head.appendChild(s);
})();

const BCA_TOPIC = { announcement: '📣 Announcement', promo: '🎁 Special offer' };

const BCA_TEMPLATES = [
  { label: '🎁 Discount offer', kind: 'promo', title: '20% off all TikTok followers this weekend',
    body: 'This Friday to Sunday only, every TikTok followers package is **20% cheaper**.\n\nTop up your wallet and order before Sunday midnight to get the discount. Tap **New Order** to start.' },
  { label: '🆕 New service', kind: 'promo', title: 'New: YouTube watch hours',
    body: 'You can now order **YouTube watch hours** on EndaViral and get closer to monetisation faster.\n\nFind it under **New Order → YouTube**.' },
  { label: '🛠️ Maintenance notice', kind: 'announcement', title: 'Short maintenance tonight',
    body: 'EndaViral will be unavailable tonight from **11:00 PM to 11:30 PM** while we upgrade our systems.\n\nOrders already placed are not affected. Thank you for your patience.' },
];

let _bcaKind = 'announcement';
let _bcaAud = null;
let _bcaConfirmArmed = false;
let _bcaHistory = [];

function _bcaEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}
function _bcaFmt(n) { return Number(n || 0).toLocaleString('en-KE'); }
function _bcaAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24); if (d < 7) return d + 'd ago';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function _bcaChip(kind) {
  return kind === 'promo'
    ? '<span class="bca-chip promo">🎁 Special offer</span>'
    : '<span class="bca-chip announcement">📣 Announcement</span>';
}

function _bcaDraft() {
  return {
    kind: _bcaKind,
    title: (document.getElementById('bcaTitle')?.value || '').trim(),
    body: (document.getElementById('bcaBody')?.value || '').trim(),
  };
}

function _bcaProblem(d) {
  if (d.title.length < 3) return 'Add a title (at least 3 characters).';
  if (d.title.length > 120) return 'Title is too long (max 120).';
  if (!d.body) return 'Write the message.';
  if (d.body.length > 2000) return 'Message is too long (max 2,000).';
  return '';
}

/* Same text the backend posts (routers/broadcasts.py → chat_body). */
function _bcaChatBody(d) { return `**${d.title}**\n\n${d.body}`; }

function _bcaPreviewHTML(d) {
  const msg = {
    sender: 'admin', is_bot: true, topic: BCA_TOPIC[d.kind],
    body: (d.title || d.body) ? _bcaChatBody({ title: d.title || 'Your title', body: d.body || 'Your message…' }) : '**Your title**\n\nYour message appears here…',
    created_at: new Date().toISOString(),
  };
  if (typeof _ttMsgHtml === 'function') return _ttMsgHtml(msg);
  return `<div style="white-space:pre-wrap">${_bcaEsc(msg.body)}</div>`;
}

function _bcaRenderAudience() {
  const el = document.getElementById('bcaAudience');
  if (!el) return;
  const a = _bcaAud;
  el.innerHTML = a ? `
    <div><b>${_bcaFmt(a.users)}</b>users — it goes into each one's chat</div>
    <div title="Have EndaViral open right now — they get a pop-up instantly"><b>${_bcaFmt(a.online_now)}</b>online now</div>` : '';
}

let _bcaPrevMode = 'popup';
function bcaPreviewMode(m) { _bcaPrevMode = m; _bcaUpdate(); }

function _bcaUpdate() {
  const d = _bcaDraft();
  const tn = document.getElementById('bcaTitleN'), bn = document.getElementById('bcaBodyN');
  if (tn) { tn.textContent = `${d.title.length}/120`; tn.classList.toggle('over', d.title.length > 120); }
  if (bn) { bn.textContent = `${d.body.length}/2000`; bn.classList.toggle('over', d.body.length > 2000); }
  document.querySelectorAll('#bcaKind button').forEach(b => b.classList.toggle('on', b.dataset.kind === _bcaKind));
  const pv = document.getElementById('bcaPreview');
  if (pv) pv.innerHTML = _bcaPreviewHTML(d);
  const pp = document.getElementById('bcaPopPreview');
  if (pp) {
    pp.innerHTML = _bcpCardHTML({ kind: d.kind, title: d.title || 'Your title appears here', body: d.body || 'Your message appears here…' }, { preview: true });
    _bcpSetupReadMore(pp);
  }
  document.getElementById('bcaPrevPopup')?.toggleAttribute('hidden', _bcaPrevMode !== 'popup');
  document.getElementById('bcaPrevChat')?.toggleAttribute('hidden', _bcaPrevMode !== 'chat');
  document.querySelectorAll('.bca-ptabs button').forEach(b => b.classList.toggle('on', b.dataset.m === _bcaPrevMode));
  _bcaDisarm();
  _bcaRenderAudience();
}

function _bcaDisarm() {
  _bcaConfirmArmed = false;
  const go = document.getElementById('bcaGo');
  if (go) { go.classList.remove('confirm'); go.textContent = 'Send to everyone\'s chat →'; }
  const c = document.getElementById('bcaCancel');
  if (c) c.style.display = 'none';
}

function bcaSetKind(k) { _bcaKind = k; _bcaUpdate(); }

function bcaUseTemplate(i, src) {
  const t = src || BCA_TEMPLATES[i];
  if (!t) return;
  _bcaKind = t.kind === 'promo' ? 'promo' : 'announcement';
  document.getElementById('bcaTitle').value = t.title || '';
  document.getElementById('bcaBody').value = t.body || '';
  document.getElementById('bcaErr').textContent = '';
  _bcaUpdate();
  document.getElementById('bcaTitle').focus();
}

function bcaReuse(id) {
  const b = _bcaHistory.find(x => x.id === id);
  if (!b) return;
  bcaUseTemplate(null, b);
  document.getElementById('ap-broadcasts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Copied into the composer — edit and send', 'info');
}

async function bcaSend() {
  const d = _bcaDraft();
  const err = document.getElementById('bcaErr');
  const problem = _bcaProblem(d);
  err.textContent = problem;
  if (problem) return;
  const go = document.getElementById('bcaGo');
  if (!_bcaConfirmArmed) {
    _bcaConfirmArmed = true;
    go.classList.add('confirm');
    go.textContent = `Confirm: send to ${_bcaAud ? _bcaFmt(_bcaAud.users) : 'all'} users`;
    document.getElementById('bcaCancel').style.display = '';
    return;
  }
  go.disabled = true;
  go.textContent = 'Sending…';
  try {
    const r = await api('/admin/broadcasts', { method: 'POST', body: JSON.stringify(d) });
    toast(`Sent ✓ in ${_bcaFmt(r.recipients)} chats${r.live_delivered ? ` · ${_bcaFmt(r.live_delivered)} online saw it instantly` : ''}`, 'success');
    document.getElementById('bcaTitle').value = '';
    document.getElementById('bcaBody').value = '';
    _bcaUpdate();
    _bcaLoadHistory();
  } catch (e) {
    err.textContent = e.message || 'Could not send. Try again.';
  } finally {
    go.disabled = false;
    _bcaDisarm();
  }
}

async function bcaTakeDown(id) {
  const btn = document.getElementById('bcaTd_' + id);
  if (btn && btn.dataset.armed !== '1') {
    btn.dataset.armed = '1';
    btn.textContent = 'Tap again to delete from all chats';
    setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = 'Delete from all chats'; } }, 4000);
    return;
  }
  if (btn) btn.disabled = true;
  try {
    const r = await api(`/admin/broadcasts/${encodeURIComponent(id)}/take-down`, { method: 'POST' });
    toast(`Deleted from ${_bcaFmt(r.removed)} chats`, 'success');
    _bcaLoadHistory();
  } catch (e) {
    if (btn) btn.disabled = false;
    toast(_bcaEsc(e.message || 'Failed'), 'error');
  }
}

function _bcaRenderHistory() {
  const el = document.getElementById('bcaHistory');
  if (!el) return;
  if (!_bcaHistory.length) {
    el.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="icon">📣</div><p>Nothing sent yet.</p></div>';
    return;
  }
  el.innerHTML = _bcaHistory.map(b => {
    const id = _bcaEsc(b.id);
    const live = b.state === 'live';
    return `<div class="bca-h">
      <div class="bca-h-top">${_bcaChip(b.kind)}<span class="bca-state ${live ? 'live' : 'taken_down'}">${live ? 'In chats' : 'Deleted'}</span>
        <span style="font-size:11.5px;color:var(--muted);">${_bcaAgo(b.created_at)}${b.sent_by ? ' by ' + _bcaEsc(b.sent_by) : ''}</span></div>
      <div class="bca-h-title">${_bcaEsc(b.title)}</div>
      <div class="bca-h-body">${_bcaEsc(String(b.body || '').replace(/\*\*/g, ''))}</div>
      <div class="bca-stats">
        <span>💬 Posted in <b>${_bcaFmt(b.recipients)}</b> chats</span>
        <span title="Had the app open when it was sent">⚡ <b>${_bcaFmt(b.live_delivered)}</b> saw it instantly</span>
        ${!live && b.taken_down_at ? `<span>🗑️ Deleted ${_bcaAgo(b.taken_down_at)}</span>` : ''}
      </div>
      <div class="bca-h-act">
        ${live ? `<button type="button" class="action-btn danger" id="bcaTd_${id}" onclick="bcaTakeDown('${id}')">Delete from all chats</button>` : ''}
        <button type="button" class="action-btn" onclick="bcaReuse('${id}')">Reuse</button>
      </div>
    </div>`;
  }).join('');
}

async function _bcaLoadHistory() {
  const el = document.getElementById('bcaHistory');
  try {
    const r = await api('/admin/broadcasts?limit=30&_=' + Date.now());
    _bcaHistory = r.items || [];
    _bcaRenderHistory();
  } catch (e) {
    if (el) el.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${_bcaEsc(e.message)}</p></div>`;
  }
}

async function _bcaLoadAudience() {
  try { _bcaAud = await api('/admin/broadcasts/audience?_=' + Date.now()); } catch (_) { _bcaAud = null; }
  _bcaUpdate();
}

function bcaRefresh() { _bcaLoadAudience(); _bcaLoadHistory(); }

function loadAdminBroadcasts() {
  const root = document.getElementById('broadcastsRoot');
  if (!root) return;
  if (!currentUser || currentUser.role !== 'admin') { root.innerHTML = '<div class="empty-state"><p>Admins only.</p></div>'; return; }
  if (!document.getElementById('bcaTitle')) {
    root.innerHTML = `
      <div class="sec-hd" style="flex-wrap:wrap;">
        <div><div class="sec-title">📣 BROADCASTS</div><div class="sec-sub">Write once — it's posted into every user's chat as a message from EndaViral.</div></div>
        <button class="btn-secondary" onclick="bcaRefresh()">↻ Refresh</button>
      </div>
      <div class="bca-aud" id="bcaAudience"></div>
      <div class="bca-wrap">
        <div class="bca-box">
          <div class="bca-lbl">Quick start</div>
          <div class="bca-tpl">${BCA_TEMPLATES.map((t, i) => `<button type="button" onclick="bcaUseTemplate(${i})">${t.label}</button>`).join('')}</div>

          <div class="bca-lbl">Type</div>
          <div class="bca-seg" id="bcaKind">
            <button type="button" class="announcement" data-kind="announcement" onclick="bcaSetKind('announcement')">📣 Announcement<small>News, service notices, updates</small></button>
            <button type="button" class="promo" data-kind="promo" onclick="bcaSetKind('promo')">🎁 Promotion<small>Offers, discounts, new services</small></button>
          </div>

          <label class="bca-lbl" for="bcaTitle">Title <span class="n" id="bcaTitleN">0/120</span></label>
          <input class="bca-in" id="bcaTitle" maxlength="140" placeholder="e.g. 20% off TikTok followers this weekend" oninput="_bcaUpdate()">

          <label class="bca-lbl" for="bcaBody">Message <span class="n" id="bcaBodyN">0/2000</span></label>
          <textarea class="bca-in" id="bcaBody" maxlength="2100" placeholder="Write your message…" oninput="_bcaUpdate()"></textarea>
          <div class="bca-hint">Line breaks are kept. Wrap words in <code>**double stars**</code> to make them <b>bold</b>.</div>

          <div class="bca-send">
            <button type="button" class="bca-go" id="bcaGo" onclick="bcaSend()">Send to everyone's chat →</button>
            <button type="button" class="btn-secondary" id="bcaCancel" style="display:none;padding:12px 14px;" onclick="_bcaDisarm()">Cancel</button>
          </div>
          <div class="bca-err" id="bcaErr" role="alert"></div>
        </div>
        <div>
          <div class="bca-lbl" style="margin-top:0;">Preview — what users see</div>
          <div class="bca-ptabs">
            <button type="button" data-m="popup" onclick="bcaPreviewMode('popup')">Pop-up</button>
            <button type="button" data-m="chat" onclick="bcaPreviewMode('chat')">In their chat</button>
          </div>
          <div id="bcaPrevPopup"><div class="bca-pop-stage" id="bcaPopPreview"></div></div>
          <div id="bcaPrevChat" hidden><div class="bca-chat">
            <div class="bca-chat-hd"><img src="EndaViral_logo_transparent.png" alt="">EndaViral Support</div>
            <div class="bca-chat-body" id="bcaPreview"></div>
          </div></div>
          <div class="bca-hint" style="margin-top:8px;">Pops up instantly for users online, and for everyone else the next time they open the app (once per device). They can dismiss it with <b>Dismiss</b>, ✕, tapping outside or swiping down. If someone replies, it lands in <b>Support</b> like any other chat.</div>
        </div>
      </div>
      <div class="sec-hd" style="margin-top:6px;"><div><div class="sec-title" style="font-size:16px;">SENT</div><div class="sec-sub">Delete a message from every chat if you made a mistake</div></div></div>
      <div class="bca-hist" id="bcaHistory"><div class="loading-spinner"><div class="spinner"></div><span>Loading…</span></div></div>`;
    _bcaUpdate();
  }
  bcaRefresh();
}


/* ════════════════════════ CUSTOMER POP-UP ════════════════════════
 * Every broadcast also POPS UP as a big card over whatever page the user is
 * on (the message itself lives in their chat):
 *   - live: SSE {type:'broadcast'} → pop-up now (auth.js → bcOnEvent)
 *   - offline when it was sent: GET /broadcasts/mine once when the app opens
 *     (bcInit) → pop-up for anything sent in the last 7 days not yet shown
 *     on this device.
 * "Open chat" goes to the conversation; "Got it" closes. Either way it is
 * remembered (localStorage) so it never pops twice on the same device.
 * The small chat strip (chat.js evShowDashboardPopup) is muted while this
 * shows, so the user doesn't get two pop-ups for one message.
 * ════════════════════════════════════════════════════════════════ */

(function injectBroadcastPopupStyles() {
  const css = `
.bcp-ov{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.66);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;animation:bcpFade .2s ease;}
@keyframes bcpFade{from{opacity:0}to{opacity:1}}
.bcp-card{position:relative;width:100%;max-width:430px;background:var(--card);border:1px solid rgba(61,212,74,.4);border-radius:18px;padding:22px 20px 18px;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:bcpUp .28s cubic-bezier(.2,.9,.3,1.2);}
.bcp-card.promo{border-color:rgba(255,176,32,.5);background:linear-gradient(180deg,rgba(255,176,32,.10),rgba(255,176,32,0) 55%),var(--card);}
.bcp-card.announcement{background:linear-gradient(180deg,rgba(61,212,74,.08),rgba(61,212,74,0) 55%),var(--card);}
@keyframes bcpUp{from{transform:translateY(24px) scale(.96);opacity:.3}to{transform:none;opacity:1}}
.bcp-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:9px;border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;}
.bcp-x:hover{color:var(--white);background:rgba(255,255,255,.06);}
.bcp-from{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.bcp-from img{width:34px;height:34px;object-fit:contain;border-radius:50%;background:#0c1322;border:1px solid #22314f;padding:3px;box-sizing:border-box;}
.bcp-from b{display:block;font-size:13px;color:var(--white);}
.bcp-chip{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;padding:3px 8px;border-radius:999px;margin-top:2px;}
.bcp-card.promo .bcp-chip{background:rgba(255,176,32,.15);color:var(--gold);}
.bcp-card.announcement .bcp-chip{background:rgba(61,212,74,.13);color:var(--green);}
.bcp-title{font-family:var(--font-display);font-size:19px;font-weight:800;color:var(--white);margin:0 30px 8px 0;line-height:1.25;overflow-wrap:anywhere;}
.bcp-body{font-size:14px;line-height:1.6;color:#cbd5e6;overflow-wrap:anywhere;max-height:46vh;overflow-y:auto;}
.bcp-body.clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;max-height:none;}
.bcp-readmore{background:none;border:none;padding:6px 0 0;color:var(--green);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;}
.bcp-card.promo .bcp-readmore{color:var(--gold);}
.bcp-handle{display:none;width:42px;height:5px;border-radius:3px;background:rgba(255,255,255,.2);margin:-8px auto 14px;}
.bcp-hint{display:none;margin-top:10px;font-size:11px;color:var(--muted);text-align:center;}
@media (max-width:600px){
  .bcp-ov{align-items:flex-end;padding:0;}
  .bcp-card{max-width:none;border-radius:20px 20px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom));animation:bcpSheet .28s ease;}
  .bcp-handle,.bcp-hint{display:block;}
}
@keyframes bcpSheet{from{transform:translateY(100%)}to{transform:none}}
.bca-pop-stage{background:#05080e;border:1px solid var(--border);border-radius:14px;padding:22px 14px;display:flex;justify-content:center;align-items:center;min-height:200px;}
.bca-pop-stage .bcp-card{animation:none;box-shadow:0 12px 30px rgba(0,0,0,.45);border-radius:18px;padding-bottom:18px;}
.bca-pop-stage .bcp-handle,.bca-pop-stage .bcp-hint{display:none;}
.bca-ptabs{display:flex;gap:6px;margin-bottom:8px;}
.bca-ptabs button{border:1px solid var(--border);background:var(--navy);color:var(--muted);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;}
.bca-ptabs button.on{border-color:var(--green);color:var(--white);background:rgba(61,212,74,.08);}
.bcp-actions{display:flex;gap:10px;margin-top:18px;}
.bcp-go{flex:1;border:none;border-radius:11px;padding:12px 14px;font-family:var(--font-display);font-size:14px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#3dd44a,#28a035);color:#06120a;}
.bcp-card.promo .bcp-go{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#1a1200;}
.bcp-ok{border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:11px;padding:12px 16px;font-family:var(--font-display);font-size:13px;font-weight:700;cursor:pointer;}
.bcp-ok:hover{color:var(--white);border-color:var(--muted);}
.bcp-more{margin-top:10px;font-size:12px;color:var(--muted);text-align:center;}
`;
  const s = document.createElement('style');
  s.id = 'bcpStyles';
  s.textContent = css;
  document.head.appendChild(s);
})();

let _bcpCurrent = null;     // broadcast on screen
let _bcpQueue = [];         // more waiting (shown one after another)

function _bcpKey() { return 'ev_bc_seen_' + (currentUser?.id || currentUser?.email || ''); }
function _bcpSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(_bcpKey()) || '[]')); } catch (_) { return new Set(); }
}
function _bcpMarkSeen(id) {
  try { localStorage.setItem(_bcpKey(), JSON.stringify([..._bcpSeen(), id].slice(-60))); } catch (_) {}
}

function _bcpBody(text) {
  return _bcaEsc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function _bcpShow(b) {
  _bcpCurrent = b;
  _bcpMarkSeen(b.id);
  window._evBigPopupUntil = Date.now() + 8000;   // mute chat.js's small strip for this message
  document.getElementById('ev-dash-popup')?.remove();
  document.getElementById('bcpPopup')?.remove();
  const ov = document.createElement('div');
  ov.className = 'bcp-ov';
  ov.id = 'bcpPopup';
  ov.innerHTML = _bcpCardHTML(b, { more: _bcpQueue.length });
  ov.addEventListener('click', e => { if (e.target === ov) bcpClose(); });   // tap outside = dismiss
  document.body.appendChild(ov);
  _bcpSetupReadMore(ov);
  _bcpSetupSwipe(ov.querySelector('.bcp-card'));
  setTimeout(() => ov.querySelector('.bcp-go')?.focus({ preventScroll: true }), 60);
}

/* The pop-up card. Used for the real pop-up AND the admin preview
   (opts.preview: no buttons wired up), so the admin sees exactly this. */
function _bcpCardHTML(b, opts = {}) {
  const kind = b.kind === 'promo' ? 'promo' : 'announcement';
  const on = fn => (opts.preview ? '' : `onclick="${fn}"`);
  const more = opts.more ? `<div class="bcp-more">+${opts.more} more message${opts.more > 1 ? 's' : ''} from EndaViral</div>` : '';
  return `
    <div class="bcp-card ${kind}" role="dialog" aria-modal="true" aria-labelledby="bcpTitle">
      <div class="bcp-handle" aria-hidden="true"></div>
      <button type="button" class="bcp-x" aria-label="Dismiss" title="Dismiss" ${on('bcpClose()')}>✕</button>
      <div class="bcp-from"><img src="EndaViral_logo_transparent.png" alt="">
        <div><b>EndaViral</b><span class="bcp-chip">${kind === 'promo' ? '🎁 Special offer' : '📣 Announcement'}</span></div></div>
      <div class="bcp-title" ${opts.preview ? '' : 'id="bcpTitle"'}>${_bcaEsc(b.title)}</div>
      <div class="bcp-body clamp">${_bcpBody(b.body)}</div>
      <button type="button" class="bcp-readmore" hidden ${on('bcpReadMore(this)')}>Read more ▾</button>
      <div class="bcp-actions">
        <button type="button" class="bcp-go" ${on('bcpOpenChat()')}>💬 Open chat</button>
        <button type="button" class="bcp-ok" ${on('bcpClose()')}>Dismiss</button>
      </div>
      ${more}
      <div class="bcp-hint">Swipe down to dismiss</div>
    </div>`;
}

/* Long messages show a 4-line preview; "Read more" opens the rest in place. */
function _bcpSetupReadMore(root) {
  const body = root.querySelector('.bcp-body'), btn = root.querySelector('.bcp-readmore');
  if (body && btn) btn.hidden = body.scrollHeight <= body.clientHeight + 2;
}
function bcpReadMore(btn) {
  const body = btn.parentElement.querySelector('.bcp-body');
  const open = body.classList.toggle('clamp') === false;
  btn.textContent = open ? 'Show less ▴' : 'Read more ▾';
}

/* Phones: drag the sheet down to dismiss it. */
function _bcpSetupSwipe(card) {
  if (!card) return;
  let y0 = null, dy = 0;
  card.addEventListener('touchstart', e => {
    if (card.querySelector('.bcp-body:not(.clamp)')?.contains(e.target) && e.target.closest('.bcp-body').scrollTop > 0) return;
    y0 = e.touches[0].clientY; dy = 0; card.style.transition = 'none';
  }, { passive: true });
  card.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    card.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  card.addEventListener('touchend', () => {
    if (y0 == null) return;
    y0 = null;
    card.style.transition = 'transform .2s ease';
    if (dy > 90) { card.style.transform = 'translateY(110%)'; setTimeout(bcpClose, 180); }
    else card.style.transform = '';
  });
}

function _bcpRemove() {
  document.getElementById('bcpPopup')?.remove();
  _bcpCurrent = null;
}

function bcpClose() {
  _bcpRemove();
  const next = _bcpQueue.shift();
  if (next) setTimeout(() => _bcpShow(next), 250);
}

function bcpOpenChat() {
  const b = _bcpCurrent;
  _bcpQueue.forEach(x => _bcpMarkSeen(x.id));   // they'll see the rest in the chat
  _bcpQueue = [];
  _bcpRemove();
  if (typeof navTo === 'function') navTo('tickets');
  if (b && b.thread_id && typeof openTicketThread === 'function') setTimeout(() => openTicketThread(b.thread_id), 250);
}

function _bcpOffer(list) {
  const seen = _bcpSeen();
  const fresh = list.filter(b => b && b.id && !seen.has(b.id)
    && b.id !== _bcpCurrent?.id && !_bcpQueue.some(q => q.id === b.id));
  if (!fresh.length) return;
  if (_bcpCurrent) { _bcpQueue.push(...fresh); return; }
  _bcpQueue.push(...fresh.slice(1));
  _bcpShow(fresh[0]);
}

/* App opened / stream reconnected: anything sent while this device was away. */
async function bcLoad() {
  if (!token) return;
  if (document.getElementById('appWrap')?.style.display === 'none') return;
  try {
    const r = await api('/broadcasts/mine');
    _bcpOffer((r && r.items) || []);
  } catch (_) { /* optional — never break the app */ }
}

/* SSE events from auth.js. */
function bcOnEvent(evt) {
  if (!evt) return;
  if (evt.type === 'broadcast' && evt.broadcast) {
    _bcpOffer([evt.broadcast]);
  } else if (evt.type === 'broadcast_removed') {
    if (_bcpCurrent && _bcpCurrent.id === evt.id) bcpClose();
    _bcpQueue = _bcpQueue.filter(x => x.id !== evt.id);
  }
  // The message was added to / removed from their chat: refresh the chat
  // badge, dashboard banner and the open conversation, like a support reply.
  window._bgAllThreadsClosed = false;
  if (typeof _bgTicketWatchTick === 'function') _bgTicketWatchTick();
  if (evt.thread_id && typeof _refreshOpenTicketThread === 'function') _refreshOpenTicketThread(evt.thread_id);
  if (evt.broadcast?.thread_id && typeof _refreshOpenTicketThread === 'function') _refreshOpenTicketThread(evt.broadcast.thread_id);
}

function bcInit() { setTimeout(bcLoad, 1200); }   // after the dashboard has painted

function bcReset() { _bcpQueue = []; _bcpRemove(); }

document.addEventListener('keydown', e => { if (e.key === 'Escape' && _bcpCurrent) bcpClose(); });
