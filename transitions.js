/**
 * Page transition animations for receipt wrapper
 * Handles smooth width transitions when navigating between pages with different wrapper sizes
 */

  (function() {
    /**
     * Pixel-based transition approach (simplified):
     * - `receipt-wrapper-wide` class indicates wide layout (720px).
     * - `receipt-wrapper` alone indicates normal layout (600px).
     * - Before internal navigation we store the current wrapper pixel width in sessionStorage.
     * - On the next page load we snap the wrapper to the previous pixel width (inline style),
     *   then animate to the target width inferred from whether `.receipt-wrapper-wide` is present.
     */

    const KEY_PX = 'receipt-prev-px';
    const NORMAL_PX = 600;
    const WIDE_PX = 720;

    function storeCurrentWidth() {
      const wrapper = document.querySelector('.receipt-wrapper');
      if (!wrapper) return;
      try {
        const rect = wrapper.getBoundingClientRect();
        sessionStorage.setItem(KEY_PX, Math.round(rect.width).toString());
      } catch {}
    }

    function applyWithAnimation() {
      const wrapper = document.querySelector('.receipt-wrapper');
      if (!wrapper) return;

      const prevPxRaw = sessionStorage.getItem(KEY_PX);
      const prevPx = prevPxRaw ? parseInt(prevPxRaw, 10) : null;
      const renderedWide = wrapper.classList.contains('receipt-wrapper-wide');
      const targetWidth = renderedWide ? WIDE_PX : NORMAL_PX;

      // If there is no previous pixel stored, just respect server-rendered class and exit
      if (prevPx === null) {
        return;
      }

      // Snap to previous width without transition
      wrapper.style.transition = 'none';
      wrapper.style.maxWidth = prevPx + 'px';
      // force reflow
      wrapper.offsetHeight;

      // Schedule animation to the target width using inline styles only
      requestAnimationFrame(() => {
        // Re-enable CSS transition
        wrapper.style.transition = '';
        // Set explicit target max-width to animate towards (do not toggle classes)
        wrapper.style.maxWidth = targetWidth + 'px';

        // After the transition, remove the inline style so CSS rules control layout
        setTimeout(() => {
          wrapper.style.maxWidth = '';
        }, 450);
      });

      // cleanup stored value
      try { sessionStorage.removeItem(KEY_PX); } catch {}
    }

    function init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyWithAnimation);
      } else {
        applyWithAnimation();
      }

      // Remember current width on internal navigation
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        try {
          const href = link.getAttribute('href');
          if (!href || href.startsWith('#') || link.hasAttribute('download')) return;
          const url = new URL(link.href, window.location.href);
          if (url.origin === window.location.origin) {
            storeCurrentWidth();
          }
        } catch (err) {
          // ignore
        }
      });
    }

    init();
  })();
