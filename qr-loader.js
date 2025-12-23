/* QR Loader for spinner animation
   - Detects the intended target URL (slug or page)
   - Generates a text QR (using qrcode-generator if available)
   - Renders a small character/block QR into .spinner-animation
   - Reveals modules dot-by-dot to simulate drawing
*/
(function(){
  const CDN = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';

  function ensureLib(cb){
    if (typeof window.qrcode === 'function') return cb(null, true);
    // if a preload script tag exists and hasn't executed yet, wait for it
    const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.includes('qrcode-generator'));
    if (existing) {
      if (typeof window.qrcode === 'function') return cb(null, true);
      existing.addEventListener('load', ()=> cb(null, true));
      existing.addEventListener('error', ()=> cb(new Error('failed to load qr lib')));
      return;
    }
    const s = document.createElement('script');
    s.src = CDN;
    s.async = true;
    s.onload = () => cb(null, true);
    s.onerror = () => cb(new Error('failed to load qr lib'));
    document.head.appendChild(s);
  }

  function getTargetUrl(){
    const u = new URL(window.location.href);
    const path = u.pathname.split('/').pop();
    const params = u.searchParams;

    if (path === 'qr.html' || path === 'ad.html'){
      const slug = params.get('slug');
      if (slug) return `${u.origin}/r/${encodeURIComponent(slug)}`;
      return u.href;
    }

    if (path === 'dashboard.html' || path === 'dashboard'){
      return `${u.origin}/dashboard`;
    }

    if (path === '' || path === 'index.html') return `${u.origin}/`;

    return u.href;
  }

  // Fallback generator: deterministic pseudo-random matrix for a given text
  function buildFallbackMatrix(text, size=21){
    // simple seeded RNG from text
    let seed = 0;
    for (let i=0;i<text.length;i++) seed = ((seed << 5) - seed) + text.charCodeAt(i);
    function rand() { seed = (seed * 1664525 + 1013904223) | 0; return (seed >>> 0) / 0xFFFFFFFF; }
    const rows = [];
    for (let r=0;r<size;r++){
      const row = [];
      for (let c=0;c<size;c++){
        // border-ish pattern for nicer visual
        if (r<2 || c<2 || r>size-3 || c>size-3) row.push((r+c)%2===0);
        else row.push(rand() > 0.5);
      }
      rows.push(row);
    }
    return rows;
  }

  function buildMatrixReal(text){
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      const rows = [];
      for (let r=0;r<n;r++){
        const row = [];
        for (let c=0;c<n;c++) row.push(qr.isDark(r,c));
        rows.push(row);
      }
      return rows;
    } catch (e){
      return null;
    }
  }

  // Parse a preformatted textual QR (lines of characters) into rows boolean matrix
  function parsePreToRows(preText){
    if (!preText) return null;
    const lines = preText.split(/\r?\n/).map(l => l.replace(/\r/g, ''))
      .filter(l => l.trim().length > 0);
    if (!lines.length) return null;
    const rows = [];
    for (let r=0;r<lines.length;r++){
      const line = lines[r];
      const row = [];
      for (let c=0;c<line.length;c++){
        const ch = line[c];
        // treat '#', '█', 'X' as dark; space, '.' or other as light
        const dark = (ch === '#' || ch === '█' || ch === 'X' || ch === 'x');
        row.push(!!dark);
      }
      rows.push(row);
    }
    return rows;
  }

  // Render rows into container using the project's character-based markup
  // This keeps parity with `renderQRAsCharacters()` and `qr-render.css`.
  function renderInto(container, rows, initialRevealCount){
    container.innerHTML = '';
    if (!rows) return;
    const qd = document.createElement('div');
    qd.className = 'qr-display qr-display-small';
    const totalCols = rows[0].length;
    let idx = 0;
    // store rows and row elements for animation
    container._qrRows = rows;
    container._rowEls = [];

    for (let r=0;r<rows.length;r++){
      const rowEl = document.createElement('span');
      rowEl.className = 'qr-display-row';
      // build initial text content using two-character blocks per module
      let txt = '';
      for (let c=0;c<rows[r].length;c++){
        const dark = !!rows[r][c];
        const block = dark ? '██' : '  ';
        // if within initialRevealCount, show the block; else show spaces
        if (typeof initialRevealCount === 'number' && idx < initialRevealCount) txt += block;
        else txt += '  ';
        idx++;
      }
      rowEl.textContent = txt;
      qd.appendChild(rowEl);
      container._rowEls.push(rowEl);
    }
    container.appendChild(qd);
    // set current reveal index
    container._revealIndex = (typeof initialRevealCount === 'number') ? initialRevealCount : 0;
  }

  // animate reveal for character-based `.qr-display` markup
  // This schedules reveal steps iteratively so the pacing can be adjusted mid-flight
  function animateReveal(container, opts){
    const rows = container._qrRows;
    const rowEls = container._rowEls;
    if (!rows || !rowEls || !rows.length) return;
    const cols = rows[0].length;
    const total = rows.length * cols;
    let start = (typeof container._revealIndex === 'number') ? container._revealIndex : 0;
    container._revealIndex = start;
    container._animating = true;

    function step(){
      if (!container._animating) return;
      if (container._revealIndex >= total) { container._animating = false; return; }

      // compute current stepMs. Support two-phase reveal if container._twoPhase is set.
      const two = container._twoPhase;
      let stepMs;
      if (two && typeof two.split === 'number' && typeof two.firstDur === 'number' && typeof two.totalDur === 'number') {
        const splitCount = Math.floor(total * two.split);
        if (container._revealIndex < splitCount) {
          // first fast phase: finish splitCount modules in firstDur
          const firstDur = two.firstDur;
          const per = Math.max(2, Math.floor(firstDur / Math.max(1, splitCount)));
          stepMs = (opts && opts.stepMs) ? opts.stepMs : per;
        } else {
          // second phase: remaining modules in remaining time
          const rem = total - splitCount;
          const secondDur = Math.max(40, (two.totalDur - two.firstDur));
          const per = Math.max(2, Math.floor(secondDur / Math.max(1, rem)));
          stepMs = (opts && opts.stepMs) ? opts.stepMs : per;
        }
      } else {
        // compute current stepMs: prefer explicit opts.stepMs, then a desired duration, then default
        const desiredDuration = (opts && opts.duration) || container._desiredDuration;
        stepMs = (opts && opts.stepMs) ? opts.stepMs : (desiredDuration ? Math.max(2, Math.floor(desiredDuration / total)) : 6);
      }

      const i = container._revealIndex;
      const r = Math.floor(i / cols);
      const c = i % cols;
      const row = rows[r];
      const rowEl = rowEls[r];
      if (rowEl) {
        const before = rowEl.textContent.slice(0, c*2);
        const block = row[c] ? '██' : '  ';
        const after = rowEl.textContent.slice((c+1)*2);
        rowEl.textContent = before + block + after;
      }
      container._revealIndex = i + 1;
      container._animTimer = setTimeout(step, stepMs);
    }

    // start stepping
    step();
  }

  // Listen for page transition timing so we can pace reveal to finish while overlay is visible
  window.addEventListener('page-transition:timing', (e) => {
    try {
      const detail = e && e.detail ? e.detail : null;
      const totalMs = detail && detail.totalMs ? detail.totalMs : null;
      // leave a small buffer so the reveal completes just before overlay hides
      const buffer = 40;
      const desired = totalMs ? Math.max(0, totalMs - buffer) : null;
      // store on all existing spinner-animation containers but don't overwrite explicit durations
      const anims = document.querySelectorAll('.spinner-animation');
      anims.forEach(a => {
        // if already explicitly set (e.g., ad page), don't overwrite unless overlay is faster
        if (typeof a._desiredDuration === 'number') {
          if (desired && a._desiredDuration > desired) a._desiredDuration = desired;
        } else {
          a._desiredDuration = desired;
        }
        // set a two-phase plan so the overlay draws ~50% quickly then finishes
        if (desired) {
          const split = 0.5;
          const firstDur = Math.min(600, Math.max(60, Math.floor(desired * 0.6)));
          a._twoPhase = { split, firstDur, totalDur: desired };
        }
      });
      // for document-level default, only set if not explicitly provided by page (ads set this)
      if (!document._qrDesiredDuration || (desired && document._qrDesiredDuration > desired)) {
        document._qrDesiredDuration = desired;
      }
    } catch (err) {}
  });

  // when a new spinner-animation is created, set its desired duration from document default
  const _observer = new MutationObserver((mutations)=>{
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        const found = n.matches && n.matches('.spinner-animation') ? n : (n.querySelector && n.querySelector('.spinner-animation'));
        if (found) {
          found._desiredDuration = document._qrDesiredDuration || null;
        }
      }
    }
  });
  _observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  // Try to render using project's `renderQRAsCharacters` helper to match styles
  async function tryRenderWithUtils(text){
    try {
      if (!('import' in window)) return null;
      const mod = await import('/utils.js');
      // create hidden container
      const hidden = document.createElement('div');
      hidden.style.position = 'absolute';
      hidden.style.left = '-9999px';
      hidden.style.top = '0';
      document.body.appendChild(hidden);
      await mod.renderQRAsCharacters(text, hidden, { size: 'small' });
      // parse generated `.qr-display .qr-display-row`
      const rows = [];
      const rowEls = hidden.querySelectorAll('.qr-display-row');
      if (!rowEls || rowEls.length === 0) { hidden.remove(); return null; }
      rowEls.forEach(el => {
        const txt = el.textContent || '';
        const row = [];
        // renderQRAsCharacters uses two-char blocks for each module (██ or two spaces)
        for (let i=0;i<txt.length;i+=2){
          const pair = txt.substr(i,2);
          row.push(pair === '██');
        }
        rows.push(row);
      });
      hidden.remove();
      return rows;
    } catch (e) {
      return null;
    }
  }

  function init(){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  function run(){
    const anim = document.querySelector('.spinner-animation');
    if (!anim) return; // nothing to render into
    const target = getTargetUrl();

    // If a preformatted QR is present on the page (id="fallback-qr-pre"), use it immediately
    const preEl = document.getElementById('fallback-qr-pre');
    if (preEl && preEl.textContent && preEl.textContent.trim().length > 0) {
      const rows = parsePreToRows(preEl.textContent);
      if (rows) {
        renderInto(anim, rows, 0);
        const desired = anim._desiredDuration || document._qrDesiredDuration || null;
        setTimeout(()=> animateReveal(anim, { duration: desired }), 20);
      }
    } else {
      // Render fallback immediately (fast) so animation can start right away
      const fallbackText = 'https://sa1l.cc/';
      const fallbackRows = buildFallbackMatrix(fallbackText, 21);
      renderInto(anim, fallbackRows, 0);
      // start reveal of fallback (use desired duration if provided)
      const desiredFb = anim._desiredDuration || document._qrDesiredDuration || null;
      setTimeout(()=> animateReveal(anim, { duration: desiredFb }), 20);
    }

    // now ensure real lib; when available replace smoothly preserving progress
    ensureLib((err)=>{
      if (err) return; // keep fallback
      const realRows = buildMatrixReal(target);
      if (!realRows) return;

      // compute preserved progress ratio using stored rows if available
      const rowsBefore = anim._qrRows;
      const modulesBefore = (rowsBefore && rowsBefore.length) ? rowsBefore.length * rowsBefore[0].length : 1;
      const revealed = typeof anim._revealIndex === 'number' ? anim._revealIndex : modulesBefore;
      const ratio = Math.min(1, revealed / modulesBefore);

      // render real matrix with initial reveal count scaled
      const totalNew = realRows.length * realRows[0].length;
      const initialRevealCount = Math.floor(ratio * totalNew);
      renderInto(anim, realRows, initialRevealCount);

      // continue reveal from initialRevealCount
      anim._revealIndex = initialRevealCount;
      const desiredReal = anim._desiredDuration || document._qrDesiredDuration || null;
      setTimeout(()=> animateReveal(anim, { duration: desiredReal }), 40);
    });
  }

  init();
  // Observe for any future `.spinner-animation` insertions and run loader for them
  const observer = new MutationObserver((mutations)=>{
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches && node.matches('.spinner-animation')) {
          run();
          return;
        }
        const found = node.querySelector && node.querySelector('.spinner-animation');
        if (found) { run(); return; }
      }
    }
  });
  observer.observe(document.documentElement || document.body, {childList: true, subtree: true});
})();
