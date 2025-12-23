/* Receipt-styled Ad System for SA1L.CC
   Injects Google AdSense ads in receipt-themed containers across the site.
   
   Usage:
   - Call insertAd(containerId, options) to place an ad
   - Or use createAdElement(options) to get an ad element you can insert manually
   
   Google AdSense setup:
   - Load adsbygoogle.js once in <head> (already done in index.html)
   - Use same client ID across all ad units
   - Each ad unit needs its own data-ad-slot ID from Google AdSense dashboard
   - Call (adsbygoogle = window.adsbygoogle || []).push({}) for each unit after insertion
*/

(function(){
  const DEFAULT_OPTIONS = {
    title: '━━━ PROMOTIONS ━━━',
    client: 'ca-pub-5742022755370369',
    slot: '5634500789',
    format: 'fluid',
    layoutKey: '-gw-3+1f-3d+2z',
    className: 'ad-container' // additional classes
  };

  /**
   * Creates a receipt-styled ad container element with AdSense markup
   * @param {Object} options - Ad configuration (title, client, slot, format, layoutKey, className)
   * @returns {HTMLElement} - The ad container element
   */
  function createAdElement(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const container = document.createElement('div');
    container.className = `receipt-section ad-section ${opts.className || ''}`;
    
    const title = document.createElement('div');
    title.className = 'section-title ad-title';
    title.textContent = opts.title;
    
    const adWrapper = document.createElement('div');
    adWrapper.className = 'ad-wrapper';
    
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', opts.client);
    ins.setAttribute('data-ad-slot', opts.slot);
    ins.setAttribute('data-ad-format', opts.format);
    if (opts.layoutKey) {
      ins.setAttribute('data-ad-layout-key', opts.layoutKey);
    }
    
    adWrapper.appendChild(ins);
    container.appendChild(title);
    container.appendChild(adWrapper);
    
    return container;
  }

  /**
   * Inserts a receipt-styled ad into the specified container
   * @param {string} containerId - ID of the container element (or CSS selector)
   * @param {Object} options - Ad configuration
   * @param {string} position - 'beforeend' (default), 'afterbegin', 'beforebegin', 'afterend'
   * @returns {HTMLElement|null} - The inserted ad element, or null if container not found
   */
  function insertAd(containerId, options = {}, position = 'beforeend') {
    const container = typeof containerId === 'string' 
      ? document.querySelector(containerId) 
      : containerId;
    
    if (!container) {
      console.warn(`[ads.js] Container not found: ${containerId}`);
      return null;
    }
    
    const adElement = createAdElement(options);
    
    // Insert based on position
    if (position === 'beforeend' || position === 'afterbegin') {
      container.insertAdjacentElement(position, adElement);
    } else {
      container.insertAdjacentElement(position, adElement);
    }
    
    // Push to AdSense queue after insertion
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('[ads.js] AdSense push failed:', e);
    }
    
    return adElement;
  }

  /**
   * Batch insert multiple ads at once
   * @param {Array} adConfigs - Array of {containerId, options, position}
   */
  function insertMultipleAds(adConfigs) {
    adConfigs.forEach(config => {
      insertAd(config.containerId, config.options, config.position);
    });
  }

  /**
   * Fills a placeholder div with an ad
   * @param {HTMLElement} placeholder - The placeholder element
   * @returns {HTMLElement|null} - The inserted ad element
   */
  function fillPlaceholder(placeholder) {
    if (!placeholder) return null;
    
    // Read options from data attributes
    const options = {
      title: placeholder.dataset.adTitle || DEFAULT_OPTIONS.title,
      client: placeholder.dataset.adClient || DEFAULT_OPTIONS.client,
      slot: placeholder.dataset.adSlot || DEFAULT_OPTIONS.slot,
      format: placeholder.dataset.adFormat || DEFAULT_OPTIONS.format,
      layoutKey: placeholder.dataset.adLayoutKey || DEFAULT_OPTIONS.layoutKey,
      className: placeholder.dataset.adClass || ''
    };
    
    const adElement = createAdElement(options);
    const insElement = adElement.querySelector('.adsbygoogle');
    placeholder.appendChild(adElement);
    placeholder.classList.add('ad-placeholder-filled');
    
    // Push to AdSense queue
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('[ads.js] AdSense push failed:', e);
    }
    
    // Check if ad was filled after a short delay
    setTimeout(() => {
      const adStatus = insElement.getAttribute('data-ad-status');
      const adDisplay = window.getComputedStyle(insElement).display;
      
      // If unfilled or hidden, remove the filled class to hide placeholder
      if (adStatus === 'unfilled' || adDisplay === 'none') {
        placeholder.classList.remove('ad-placeholder-filled');
        console.log('[ads.js] Ad unfilled, hiding placeholder');
      }
    }, 1000);
    
    return adElement;
  }

  /**
   * Auto-detect and fill all ad placeholders on the page
   * Looks for elements with [data-ad-placeholder] attribute
   */
  function fillAllPlaceholders() {
    const placeholders = document.querySelectorAll('[data-ad-placeholder]');
    placeholders.forEach(placeholder => {
      if (!placeholder.classList.contains('ad-placeholder-filled')) {
        fillPlaceholder(placeholder);
      }
    });
  }

  // Expose API
  window.SA1LAds = {
    createAdElement,
    insertAd,
    insertMultipleAds,
    fillPlaceholder,
    fillAllPlaceholders
  };
  
  // Auto-fill placeholders when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillAllPlaceholders);
  } else {
    fillAllPlaceholders();
  }
})();
