/**
 * Page transition animations for receipt wrapper
 * Handles smooth width transitions when navigating between pages with different wrapper sizes
 */

  (function() {
    /**
     * Selector + session approach:
     * - Pages that want the wide layout include an element with class `receipt-wrapper-wide-selector`.
     * - When clicking internal links we store whether the current page was wide.
     * - On the next page load we detect the desired (selector) state and previous state and
     *   animate between them (both grow and shrink) by briefly applying the previous width
     *   and then toggling the class so the CSS transition animates to the new width.
     */

    const KEY = 'receipt-was-wide';
    const NORMAL_PX = 600;
    const WIDE_PX = 720;

    function wantsWideOnThisPage() {
      return !!document.querySelector('.receipt-wrapper-wide-selector');
    }

    function storeCurrentState() {
      const wrapper = document.querySelector('.receipt-wrapper');
      if (!wrapper) return;
      const wasWide = wrapper.classList.contains('receipt-wrapper-wide');
      try {
        sessionStorage.setItem(KEY, wasWide ? '1' : '0');
      } catch {}
    }

    function applyWithAnimation() {
      const wrapper = document.querySelector('.receipt-wrapper');
      if (!wrapper) return;

      const prev = sessionStorage.getItem(KEY);
      const prevWasWide = prev === '1';
      const selectorPresent = !!document.querySelector('.receipt-wrapper-wide-selector');
      const renderedWide = wrapper.classList.contains('receipt-wrapper-wide');
      const wantWide = selectorPresent || renderedWide;

      // If no stored previous state, just apply selector state (but don't remove server-rendered class)
      if (prev === null) {
        if (selectorPresent && wantWide && !renderedWide) wrapper.classList.add('receipt-wrapper-wide');
        // only remove class if the page explicitly included the selector and wants narrow
        else if (selectorPresent && !wantWide && renderedWide) wrapper.classList.remove('receipt-wrapper-wide');
        return;
      }

      // If states match, ensure selector-driven changes are applied (don't remove server classes)
      if (prevWasWide === wantWide) {
        if (selectorPresent) {
          if (wantWide) wrapper.classList.add('receipt-wrapper-wide');
          else wrapper.classList.remove('receipt-wrapper-wide');
        }
        sessionStorage.removeItem(KEY);
        return;
      }

      // States differ -> animate between prev and current
      const prevWidth = prevWasWide ? WIDE_PX : NORMAL_PX;

      // Snap to previous width without transition
      wrapper.style.transition = 'none';
      wrapper.style.maxWidth = prevWidth + 'px';
      wrapper.offsetHeight; // force reflow

      // Ensure starting state matches previous width by toggling the class appropriately
      if (wantWide) {
        // start narrow, then add wide class to animate
        wrapper.classList.remove('receipt-wrapper-wide');
      } else {
        // start wide, then remove wide class to animate
        wrapper.classList.add('receipt-wrapper-wide');
      }

      // Allow the DOM to settle, then toggle to target and re-enable transitions
      requestAnimationFrame(() => {
        if (wantWide) wrapper.classList.add('receipt-wrapper-wide');
        else wrapper.classList.remove('receipt-wrapper-wide');

        // Re-enable CSS transition (defined in stylesheet)
        wrapper.style.transition = '';
        // Clear inline maxWidth so CSS can control the final value
        wrapper.style.maxWidth = '';
      });

      // cleanup
      sessionStorage.removeItem(KEY);
    }

    function init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyWithAnimation);
      } else {
        applyWithAnimation();
      }

      // Remember current state on internal navigation
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        // only store for in-origin navigations (same site) and non-download links
        try {
          const href = link.getAttribute('href');
          if (!href || href.startsWith('#') || link.hasAttribute('download')) return;
          const url = new URL(link.href, window.location.href);
          if (url.origin === window.location.origin) {
            storeCurrentState();
          }
        } catch (err) {
          // ignore
        }
      });
    }

    init();
  })();
