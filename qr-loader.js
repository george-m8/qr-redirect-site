/* QR Loader for spinner animation
   - Detects the intended target URL (slug or page)
   - Generates a text QR (using qrcode-generator if available)
   - Renders a small character/block QR into .spinner-animation
   - Reveals modules dot-by-dot to simulate drawing
*/
(function(){
  const CDN = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';

  function ensureLib(cb){
    if (typeof window.qrcode === 'function') return cb();
    const s = document.createElement('script');
    s.src = CDN;
    s.async = true;
    s.onload = () => cb();
    s.onerror = () => cb(new Error('failed to load qr lib'));
    document.head.appendChild(s);
  }

  function getTargetUrl(){
    const u = new URL(window.location.href);
    const path = u.pathname.split('/').pop();
    const params = u.searchParams;

    // pages that support slug param
    if (path === 'qr.html' || path === 'ad.html'){
      const slug = params.get('slug');
      if (slug) return `${u.origin}/r/${encodeURIComponent(slug)}`;
      return u.href;
    }

    if (path === 'dashboard.html' || path === 'dashboard'){
      return `${u.origin}/dashboard`;
    }

    // index or other pages -> point to root
    if (path === '' || path === 'index.html') return `${u.origin}/`;

    return u.href;
  }

  function buildMatrix(text){
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

  function renderInto(container, rows){
    container.innerHTML = '';
    if (!rows) return;
    const fragment = document.createDocumentFragment();
    for (let r=0;r<rows.length;r++){
      const rowEl = document.createElement('div');
      rowEl.className = 'qr-row';
      for (let c=0;c<rows[r].length;c++){
        const m = document.createElement('span');
        m.className = 'qr-module' + (rows[r][c] ? ' on' : '');
        m.dataset.index = (r * rows.length + c).toString();
        rowEl.appendChild(m);
      }
      fragment.appendChild(rowEl);
    }
    container.appendChild(fragment);
  }

  function animateReveal(container, opts){
    const modules = Array.from(container.querySelectorAll('.qr-module'));
    if (!modules.length) return;
    const step = opts && opts.stepMs ? opts.stepMs : 6;
    modules.forEach((el, i)=>{
      setTimeout(()=>{
        el.style.opacity = '1';
      }, i * step);
    });
  }

  function init(){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  function run(){
    const anim = document.querySelector('.spinner-animation');
    if (!anim) return; // nothing to render into
    const target = getTargetUrl();
    ensureLib((err)=>{
      const rows = err ? null : buildMatrix(target);
      renderInto(anim, rows);
      // small delay so overlay has time to be visible before drawing
      setTimeout(()=> animateReveal(anim, {stepMs: 6}), 120);
    });
  }

  init();
})();
