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
    // Timing configuration (ms)
    const HOLD_MS = 80; // wait while snapped width is painted
    const WRAPPER_TRANS_MS = 450; // expected wrapper max-width transition duration
    const OVERLAY_FADE_MS = 300; // should match CSS .page-transition-overlay transition

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

      // Ensure overlay exists so it can mask layout changes immediately
      ensureOverlay();

      // If there is no previous pixel stored, just respect server-rendered class and exit
      if (prevPx === null) {
        // Keep overlay for a short moment then fade
        hideOverlayAfterDelay(120);
        return;
      }

      // Snap to previous width without transition
      wrapper.style.transition = 'none';
      wrapper.style.maxWidth = prevPx + 'px';
      // force reflow so the snap is painted
      wrapper.offsetHeight;

      // Hold briefly to ensure paint stability, then start the animated change
      setTimeout(() => {
        requestAnimationFrame(() => {
          // Re-enable CSS transition (use CSS rule on .receipt-wrapper)
          wrapper.style.transition = '';
          // Start animating to target width (inline only)
          wrapper.style.maxWidth = targetWidth + 'px';

          // Arrange overlay fade so it finishes roughly when wrapper finishes.
          // Only remove the inline maxWidth after the overlay has fully faded and been removed,
          // to ensure the snapped/inline widths are in effect while the overlay is visible.
          const overlayEl = document.getElementById('page-transition-overlay');
          if (overlayEl) {
            const overlayStartDelay = Math.max(0, WRAPPER_TRANS_MS - OVERLAY_FADE_MS);
            setTimeout(() => {
              overlayEl.classList.remove('visible');
              // remove element after fade completes
              setTimeout(() => {
                try { overlayEl.remove(); } catch (e) {}
                // Now that overlay is fully gone, remove the inline maxWidth so stylesheet takes over
                try { wrapper.style.maxWidth = ''; } catch (e) {}
              }, OVERLAY_FADE_MS + 20);
            }, overlayStartDelay);
          } else {
            // No overlay to coordinate with — fallback to removing after wrapper transition
            setTimeout(() => {
              wrapper.style.maxWidth = '';
            }, WRAPPER_TRANS_MS + 20);
          }
        });
      }, HOLD_MS);

      // cleanup stored value
      try { sessionStorage.removeItem(KEY_PX); } catch {}
    }

    /* Overlay helpers */
    function ensureOverlay() {
      if (document.getElementById('page-transition-overlay')) return;
      const div = document.createElement('div');
      div.id = 'page-transition-overlay';
      div.className = 'page-transition-overlay visible';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.textContent = '';
      div.appendChild(spinner);
      document.body.appendChild(div);
    }

    function hideOverlayAfterDelay(ms) {
      const el = document.getElementById('page-transition-overlay');
      if (!el) return;
      el.classList.remove('visible');
      setTimeout(() => {
        el.remove();
      }, Math.max(ms, 200));
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
