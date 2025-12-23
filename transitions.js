/**
 * Page transition animations for receipt wrapper
 * Handles smooth width transitions when navigating between pages with different wrapper sizes
 */

(function() {
  /**
   * New selector-based approach:
   * - Pages that want the wide layout include an element with class `receipt-wrapper-wide-selector`.
   * - On load, if that selector exists, we add `receipt-wrapper-wide` to the main `.receipt-wrapper`.
   * - If selector is absent, we remove the class so transitions occur both directions.
   */

  function applyWrapperClassFromSelector() {
    const wrapper = document.querySelector('.receipt-wrapper');
    if (!wrapper) return;

    const wantsWide = !!document.querySelector('.receipt-wrapper-wide-selector');

    // If the state already matches, nothing to do
    const hasWide = wrapper.classList.contains('receipt-wrapper-wide');
    if (wantsWide && !hasWide) {
      // add class (CSS transition on max-width will animate)
      wrapper.classList.add('receipt-wrapper-wide');
    } else if (!wantsWide && hasWide) {
      // remove class to animate back to normal
      wrapper.classList.remove('receipt-wrapper-wide');
    }
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyWrapperClassFromSelector);
    } else {
      applyWrapperClassFromSelector();
    }
  }

  init();
})();
