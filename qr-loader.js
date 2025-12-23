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

  // render rows into container, optionally setting initial revealed count
  function renderInto(container, rows, initialRevealCount){
    container.innerHTML = '';
    if (!rows) return;
    const fragment = document.createDocumentFragment();
    const total = rows.length * rows.length;
    let idx = 0;
    for (let r=0;r<rows.length;r++){
      const rowEl = document.createElement('div');
      rowEl.className = 'qr-row';
      for (let c=0;c<rows[r].length;c++){
        const m = document.createElement('span');
        m.className = 'qr-module' + (rows[r][c] ? ' on' : '');
        m.dataset.index = idx.toString();
        // set initial opacity if within initialRevealCount
        if (typeof initialRevealCount === 'number' && idx < initialRevealCount) m.style.opacity = '1';
        fragment.appendChild(m);
        rowEl.appendChild(m);
        idx++;
      }
      fragment.appendChild(rowEl);
    }
    container.appendChild(fragment);
  }

  // animate reveal; stores current reveal index on container._revealIndex
  function animateReveal(container, opts){
    const modules = Array.from(container.querySelectorAll('.qr-module'));
    if (!modules.length) return;
    const step = opts && opts.stepMs ? opts.stepMs : 6;
    let start = (typeof container._revealIndex === 'number') ? container._revealIndex : 0;
    container._revealIndex = start;
    for (let i=start;i<modules.length;i++){
      const el = modules[i];
      setTimeout(()=>{
        el.style.opacity = '1';
        container._revealIndex = i + 1;
      }, (i - start) * step);
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
        setTimeout(()=> animateReveal(anim, {stepMs: 6}), 20);
      }
    } else {
      // Render fallback immediately (fast) so animation can start right away
      const fallbackText = 'https://sa1l.cc/';
      const fallbackRows = buildFallbackMatrix(fallbackText, 21);
      renderInto(anim, fallbackRows, 0);
      // start reveal of fallback
      setTimeout(()=> animateReveal(anim, {stepMs: 6}), 20);
    }

    // now ensure real lib; when available replace smoothly preserving progress
    ensureLib((err)=>{
      if (err) return; // keep fallback
      const realRows = buildMatrixReal(target);
      if (!realRows) return;

      // compute preserved progress ratio
      const modulesBefore = anim.querySelectorAll('.qr-module').length || 1;
      const revealed = typeof anim._revealIndex === 'number' ? anim._revealIndex : modulesBefore;
      const ratio = Math.min(1, revealed / modulesBefore);

      // render real matrix with initial reveal count scaled
      const totalNew = realRows.length * realRows.length;
      const initialRevealCount = Math.floor(ratio * totalNew);
      renderInto(anim, realRows, initialRevealCount);

      // continue reveal from initialRevealCount
      anim._revealIndex = initialRevealCount;
      setTimeout(()=> animateReveal(anim, {stepMs: 6}), 40);
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
