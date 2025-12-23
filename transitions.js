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

      const overlayEl = document.getElementById('page-transition-overlay');

      // Helper: parse CSS time strings like '0.4s' or '300ms'
      function parseDuration(timeStr) {
        if (!timeStr) return 0;
        const first = timeStr.split(',')[0].trim();
        if (first.endsWith('ms')) return parseFloat(first);
        if (first.endsWith('s')) return parseFloat(first) * 1000;
        return 0;
      }

      // If there is no previous pixel stored, just fade overlay and exit
      if (prevPx === null) {
        if (overlayEl) {
          overlayEl.classList.remove('visible');
          const fadeMs = parseDuration(getComputedStyle(overlayEl).transitionDuration) || OVERLAY_FADE_MS;
          setTimeout(() => { try { overlayEl.remove(); } catch (e) {} }, fadeMs + 20);
        }
        return;
      }

      // Snap to previous width without transition
      wrapper.style.transition = 'none';
      wrapper.style.maxWidth = prevPx + 'px';
      // force reflow so the snap is painted
      wrapper.offsetHeight;

      // Hold briefly to ensure the snap is painted, then begin fading the overlay
      setTimeout(() => {
        if (overlayEl) {
          // start overlay fade
          overlayEl.classList.remove('visible');
          const overlayFadeMs = parseDuration(getComputedStyle(overlayEl).transitionDuration) || OVERLAY_FADE_MS;

          // after fade completes and element removed, animate wrapper to target width
          setTimeout(() => {
            try { overlayEl.remove(); } catch (e) {}

            // Now animate wrapper to the target size
            wrapper.style.transition = '';
            const wrapperTransMs = parseDuration(getComputedStyle(wrapper).transitionDuration) || WRAPPER_TRANS_MS;
            requestAnimationFrame(() => {
              wrapper.style.maxWidth = targetWidth + 'px';
              setTimeout(() => { try { wrapper.style.maxWidth = ''; } catch (e) {} }, wrapperTransMs + 20);
            });
          }, overlayFadeMs + 20);
        } else {
          // No overlay — animate immediately after hold
          wrapper.style.transition = '';
          const wrapperTransMs = parseDuration(getComputedStyle(wrapper).transitionDuration) || WRAPPER_TRANS_MS;
          requestAnimationFrame(() => {
            wrapper.style.maxWidth = targetWidth + 'px';
            setTimeout(() => { try { wrapper.style.maxWidth = ''; } catch (e) {} }, wrapperTransMs + 20);
          });
        }
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
      // build spinner structure matching server-rendered markup
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.setAttribute('role', 'status');
      spinner.setAttribute('aria-live', 'polite');

      const anim = document.createElement('div');
      anim.className = 'spinner-animation';
      anim.setAttribute('aria-hidden', 'true');

      const text = document.createElement('div');
      text.className = 'spinner-text';
      text.textContent = '--- LOADING ---';

      spinner.appendChild(anim);
      spinner.appendChild(text);
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
