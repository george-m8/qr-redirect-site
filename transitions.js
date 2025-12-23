/**
 * Page transition animations for receipt wrapper
 * Handles smooth width transitions when navigating between pages with different wrapper sizes
 */

(function() {
  const STORAGE_KEY = 'receipt-wrapper-state';
  const WRAPPER_NORMAL = 600;
  const WRAPPER_WIDE = 720;
  
  /**
   * Get the current wrapper width based on classes
   * @returns {number} The max-width value
   */
  function getCurrentWrapperWidth() {
    const wrapper = document.querySelector('.receipt-wrapper');
    if (!wrapper) return null;
    
    return wrapper.classList.contains('receipt-wrapper-wide') ? WRAPPER_WIDE : WRAPPER_NORMAL;
  }
  
  /**
   * Store the current wrapper state before navigation
   */
  function storeWrapperState() {
    const width = getCurrentWrapperWidth();
    if (width !== null) {
      sessionStorage.setItem(STORAGE_KEY, width.toString());
    }
  }
  
  /**
   * Animate wrapper width on page load if transitioning between sizes
   */
  function animateWrapperTransition() {
    const wrapper = document.querySelector('.receipt-wrapper');
    if (!wrapper) return;
    
    const previousWidth = sessionStorage.getItem(STORAGE_KEY);
    const currentWidth = getCurrentWrapperWidth();
    
    // Only animate if we have a previous width and it's different from current
    if (previousWidth && parseInt(previousWidth) !== currentWidth) {
      // Temporarily disable transition
      wrapper.style.transition = 'none';
      
      // Set to previous width
      wrapper.style.maxWidth = previousWidth + 'px';
      
      // Force reflow
      wrapper.offsetHeight;
      
      // Re-enable transition
      wrapper.style.transition = '';
      
      // Animate to current width
      requestAnimationFrame(() => {
        wrapper.style.maxWidth = '';
      });
    }
    
    // Clear stored state after use
    sessionStorage.removeItem(STORAGE_KEY);
  }
  
  /**
   * Initialize transition handling
   */
  function init() {
    // Animate on page load if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', animateWrapperTransition);
    } else {
      animateWrapperTransition();
    }
    
    // Store state before navigation
    window.addEventListener('beforeunload', storeWrapperState);
    
    // For single-page style navigation (if clicking links)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (link && !link.hasAttribute('download') && link.href.startsWith(window.location.origin)) {
        storeWrapperState();
      }
    });
  }
  
  init();
})();
