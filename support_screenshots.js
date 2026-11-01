/* ═══════════════ SUPPORT CHAT — CUSTOMER SCREENSHOTS ═══════════════
 * Customers can attach a screenshot to a support message (📎 button, or
 * paste an image into the message box on a computer).
 *
 *  • The picture is shrunk IN THE BROWSER before upload (max 1600 px, JPEG
 *    ~75%) — a phone screenshot becomes ~100–300 KB. Keeps the free Neon
 *    database small and uploads fast on mobile data.
 *  • Images are fetched with the login token (never public URLs) and shown
 *    in the chat for both the customer and support staff. Tap to enlarge.
 *  • The server deletes every screenshot 7 days after it was sent; the chat
 *    then shows "Screenshot deleted after 7 days" in its place.
 *
 * Public helpers (used by admin.js):
 *   evShotHtml(attachment)   → markup for a message's screenshot
 *   ttPickShot() / ttClearShot() / ttTakeShot()  → customer composer
 * Depends on: API, token, toast(), esc()
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  const MAX_SIDE = 1600;
  const TARGET_BYTES = 450 * 1024;     // aim well under the server's 2 MB limit
  const _blobCache = new Map();        // attachment id → object URL

  /* ── Compression ─────────────────────────────────────────────────── */
  function _loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  async function compress(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('Please choose a picture (screenshot).');
    if (file.size > 25 * 1024 * 1024) throw new Error('That picture is too big.');
    const img = await _loadImage(file);
    let w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    w = Math.round(w * scale); h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);        // transparent PNGs → white, not black
    ctx.drawImage(img, 0, 0, w, h);
    let q = 0.78, out = canvas.toDataURL('image/jpeg', q);
    while (out.length * 0.75 > TARGET_BYTES && q > 0.45) {
      q -= 0.08;
      out = canvas.toDataURL('image/jpeg', q);
    }
    return out;
  }

  /* ── Showing screenshots in a chat ───────────────────────────────── */
  window.evShotHtml = function (att) {
    if (!att || !att.id) return '';
    if (att.expired) {
      return `<div class="ev-shot-gone">📷 Screenshot deleted after 7 days</div>`;
    }
    return `<div class="ev-shot" data-att="${esc(att.id)}"><span class="ev-shot-loading">📷 Loading screenshot…</span></div>`;
  };

  async function _hydrate(el) {
    if (el.dataset.loaded) return;
    el.dataset.loaded = '1';
    const id = el.dataset.att;
    try {
      let url = _blobCache.get(id);
      if (!url) {
        const r = await fetch(`${API}/support/attachments/${encodeURIComponent(id)}`, {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        });
        if (r.status === 410) { el.outerHTML = `<div class="ev-shot-gone">📷 Screenshot deleted after 7 days</div>`; return; }
        if (!r.ok) throw new Error('load failed');
        url = URL.createObjectURL(await r.blob());
        _blobCache.set(id, url);
      }
      el.innerHTML = `<img src="${url}" alt="Screenshot" loading="lazy">`;
      el.onclick = () => _openViewer(url);
    } catch (_) {
      el.innerHTML = `<span class="ev-shot-loading">📷 Couldn't load screenshot — tap to retry</span>`;
      el.onclick = () => { delete el.dataset.loaded; el.onclick = null; _hydrate(el); };
    }
  }

  function _scan(root) {
    (root.querySelectorAll ? root : document).querySelectorAll('.ev-shot[data-att]:not([data-loaded])').forEach(_hydrate);
  }
  // Chat renderers just output evShotHtml(); this picks them up wherever
  // they appear (customer chat, staff inbox, earlier-messages paging).
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) _scan(n);
  }).observe(document.documentElement, { childList: true, subtree: true });

  function _openViewer(url) {
    let v = document.getElementById('evShotViewer');
    if (!v) {
      v = document.createElement('div');
      v.id = 'evShotViewer';
      v.onclick = () => { v.style.display = 'none'; };
      document.body.appendChild(v);
    }
    v.innerHTML = `<img src="${url}" alt="Screenshot"><button aria-label="Close">✕</button>`;
    v.style.display = 'flex';
  }

  /* ── Customer composer ───────────────────────────────────────────── */
  let _pending = null;   // data URL waiting to be sent

  function _renderPreview() {
    const box = document.getElementById('ttShotPreview');
    if (!box) return;
    if (!_pending) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = 'flex';
    box.innerHTML = `<img src="${_pending}" alt="">
      <div style="flex:1;min-width:0;font-size:12px;color:#c3d3e0;line-height:1.4;">Screenshot ready to send<br><span style="color:#93a3ba;font-size:11px;">Add a message if you like, then tap send.</span></div>
      <button type="button" onclick="ttClearShot()" aria-label="Remove screenshot">✕</button>`;
  }

  async function _accept(file) {
    try {
      const box = document.getElementById('ttShotPreview');
      if (box) { box.style.display = 'flex'; box.innerHTML = '<span style="font-size:12px;color:#93a3ba;">Preparing screenshot…</span>'; }
      _pending = await compress(file);
      _renderPreview();
      document.getElementById('ttReplyInput')?.focus();
    } catch (e) {
      _pending = null; _renderPreview();
      toast(e.message || "Couldn't use that picture", 'error');
    }
  }

  window.ttPickShot = function () {
    let inp = document.getElementById('ttShotInput');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'ttShotInput'; inp.style.display = 'none';
      inp.onchange = () => { if (inp.files && inp.files[0]) _accept(inp.files[0]); inp.value = ''; };
      document.body.appendChild(inp);
    }
    inp.click();
  };
  window.ttClearShot = function () { _pending = null; _renderPreview(); };
  // Called by sendTicketReply(): returns the screenshot and clears the preview.
  window.ttTakeShot = function () { const d = _pending; _pending = null; _renderPreview(); return d; };

  // Paste a screenshot straight into the message box (computers).
  document.addEventListener('paste', (e) => {
    if (!e.target || e.target.id !== 'ttReplyInput') return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type && i.type.startsWith('image/'));
    if (item) { e.preventDefault(); _accept(item.getAsFile()); }
  });

  /* ── Styles ──────────────────────────────────────────────────────── */
  const st = document.createElement('style');
  st.textContent = `
    .ev-shot{display:block;margin:2px 0 6px;max-width:220px;border-radius:10px;overflow:hidden;cursor:zoom-in;background:rgba(0,0,0,.2);}
    .ev-shot img{display:block;width:100%;height:auto;max-height:260px;object-fit:cover;object-position:top;}
    @media(max-width:600px){ .tt-head-logo{height:34px !important;} #ttStatusBadge .ticket-status{font-size:10.5px !important;letter-spacing:.3px;padding:3px 9px;} }
    .ev-shot-loading,.ev-shot-gone{display:block;font-size:12px;color:#93a3ba;padding:10px 12px;font-style:italic;}
    .ev-shot-gone{background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.15);border-radius:10px;margin:2px 0 6px;cursor:default;}
    #evShotViewer{position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;padding:12px;}
    #evShotViewer img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;}
    #evShotViewer button{position:absolute;top:14px;right:14px;width:42px;height:42px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:18px;cursor:pointer;}
    #ttShotPreview{display:none;align-items:center;gap:10px;padding:8px 12px;background:#0c1322;border-top:1px solid #1e2a40;}
    #ttShotPreview img{width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #2a3a58;}
    #ttShotPreview button{width:32px;height:32px;border-radius:50%;border:1px solid #2a3a58;background:#111a2c;color:#c3d3e0;cursor:pointer;flex-shrink:0;}
    .tt-attach-btn{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:#111a2c;border:1px solid #2a3a58;color:#c3d3e0;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .tt-attach-btn:hover{border-color:rgba(61,212,74,.55);color:#3dd44a;}
  `;
  document.head.appendChild(st);
})();
