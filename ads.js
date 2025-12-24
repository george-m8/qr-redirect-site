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

  // Dashboard in-feed ad slots
  const DASHBOARD_AD_SLOTS = [
    { name: 'infeed-ad-dash-1', slot: '1071890501', layoutKey: '-gu-18+5g-2f-83' },
    { name: 'infeed-ad-dash-2', slot: '8114336220', layoutKey: '-gw-3+1f-3d+2z' },
    { name: 'infeed-ad-dash-3', slot: '3073762530', layoutKey: '-gw-3+1f-3d+2z' },
    { name: 'infeed-ad-dash-4', slot: '4765940546', layoutKey: '-gw-3+1f-3d+2z' }
  ];

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
    
    // Fallback message for when ad doesn't load (shows above ad)
    const fallback = document.createElement('div');
    fallback.className = 'ad-fallback';
    const fallbackLink = document.createElement('a');
    fallbackLink.href = 'mailto:ads@sa1l.cc';
    fallbackLink.textContent = 'advertise on this site';
    fallback.appendChild(fallbackLink);
    
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', opts.client);
    ins.setAttribute('data-ad-slot', opts.slot);
    ins.setAttribute('data-ad-format', opts.format);
    if (opts.layoutKey) {
      ins.setAttribute('data-ad-layout-key', opts.layoutKey);
    }
    
    adWrapper.appendChild(fallback);
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
    
    console.log('[ads.js] Filling placeholder for slot:', options.slot);
    
    const adElement = createAdElement(options);
    const insElement = adElement.querySelector('.adsbygoogle');
    const fallbackElement = adElement.querySelector('.ad-fallback');
    placeholder.appendChild(adElement);
    // Don't add any class yet - placeholder is visible by default
    
    // Track if iframe returns error
    let iframeError = false;
    
    console.log('[ads.js] Pushing to AdSense...');
    
    // Push to AdSense queue
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('[ads.js] AdSense push completed');
    } catch (e) {
      // If push fails, hide the placeholder immediately
      console.warn('[ads.js] AdSense push failed, hiding placeholder:', e);
      placeholder.classList.add('ad-placeholder-hidden');
      return adElement;
    }
    
    // Wait for Google to process, checking for unfilled indicators
    // Google sets data-ad-status="unfilled" or adds adsbygoogle-noablate class
    let checkCount = 0;
    let doneTime = null;
    
    // Monitor iframe for errors (check periodically since iframe is added async)
    const iframeCheckInterval = setInterval(() => {
      const iframe = insElement.querySelector('iframe');
      if (iframe && !iframe.dataset.errorChecked) {
        iframe.dataset.errorChecked = 'true';
        
        console.log('[ads.js] Iframe detected, src:', iframe.src);
        
        iframe.addEventListener('error', () => {
          console.log('[ads.js] ❌ Iframe load error event for slot:', options.slot);
          iframeError = true;
        });
        
        iframe.addEventListener('load', () => {
          console.log('[ads.js] Iframe load event fired for slot:', options.slot);
          
          // Check if iframe has actual dimensions after load
          setTimeout(() => {
            const hasContent = iframe.offsetHeight > 0 && iframe.offsetWidth > 0;
            console.log('[ads.js] Iframe dimensions after load:', {
              width: iframe.offsetWidth,
              height: iframe.offsetHeight,
              hasContent
            });
            
            if (!hasContent) {
              console.log('[ads.js] ❌ Iframe loaded but has no dimensions');
              iframeError = true;
            }
            // Don't hide fallback here - wait for final check to confirm ad is filled
          }, 100);
        });
      }
    }, 50);
    
    setTimeout(() => clearInterval(iframeCheckInterval), 3000);
    
    const checkInterval = setInterval(() => {
      checkCount++;
      const isDone = insElement.getAttribute('data-adsbygoogle-status') === 'done';
      const adStatus = insElement.getAttribute('data-ad-status');
      const hasNoAblate = insElement.classList.contains('adsbygoogle-noablate');
      const displayStyle = window.getComputedStyle(insElement).display;
      
      console.log(`[ads.js] Check #${checkCount} - slot ${options.slot}:`, {
        isDone,
        adStatus,
        hasNoAblate,
        displayStyle,
        insClasses: insElement.className
      });
      
      // Check for unfilled at any point
      if (adStatus === 'unfilled' || hasNoAblate || displayStyle === 'none' || iframeError) {
        clearInterval(checkInterval);
        placeholder.classList.add('ad-placeholder-hidden');
        
        // Log all attributes to see if Google provides a reason
        const allAttrs = {};
        for (let attr of insElement.attributes) {
          allAttrs[attr.name] = attr.value;
        }
        
        // Get iframe details if present
        const iframe = insElement.querySelector('iframe');
        const iframeDetails = iframe ? {
          src: iframe.src,
          width: iframe.offsetWidth,
          height: iframe.offsetHeight,
          styleWidth: iframe.style.width,
          styleHeight: iframe.style.height,
          attrWidth: iframe.getAttribute('width'),
          attrHeight: iframe.getAttribute('height')
        } : null;
        
        console.log('[ads.js] ✗ Ad unfilled, hiding placeholder for slot:', options.slot);
        console.log('[ads.js] ━━━ Unfilled Reason Details ━━━');
        console.log('  Status:', adStatus);
        console.log('  Has noablate class:', hasNoAblate);
        console.log('  Display style:', displayStyle);
        console.log('  Iframe error:', iframeError);
        console.log('  Iframe details:', iframeDetails);
        console.log('  All attributes:', allAttrs);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return;
      }
      
      // When done is first detected, record the time
      if (isDone && !doneTime) {
        doneTime = Date.now();
        console.log('[ads.js] AdSense marked done for slot:', options.slot);
      }
      
      // After being done for 4000ms (4 seconds), stop checking and assume filled
      // Google should have set unfilled status by then if it was going to
      if (doneTime && (Date.now() - doneTime >= 4000)) {
        clearInterval(checkInterval);
        
        // One final check
        const finalAdStatus = insElement.getAttribute('data-ad-status');
        const finalNoAblate = insElement.classList.contains('adsbygoogle-noablate');
        const finalDisplay = window.getComputedStyle(insElement).display;
        
        // Check if iframe actually has content
        const iframe = insElement.querySelector('iframe');
        const iframeHasError = iframeError || (iframe && (
          iframe.offsetHeight === 0 || 
          iframe.style.height === '0px' ||
          iframe.getAttribute('height') === '0' ||
          iframe.offsetWidth === 0 ||
          iframe.style.width === '0px' ||
          iframe.getAttribute('width') === '0'
        ));
        
        console.log('[ads.js] Final check details:', {
          finalAdStatus,
          finalNoAblate,
          finalDisplay,
          iframeError,
          iframeHeight: iframe ? iframe.offsetHeight : 'no iframe',
          iframeWidth: iframe ? iframe.offsetWidth : 'no iframe',
          iframeStyle: iframe ? iframe.style.height : 'no iframe'
        });
        
        if (finalAdStatus === 'unfilled' || finalNoAblate || finalDisplay === 'none' || iframeHasError) {
          placeholder.classList.add('ad-placeholder-hidden');
          
          // Log all attributes for unfilled reason
          const allAttrs = {};
          for (let attr of insElement.attributes) {
            allAttrs[attr.name] = attr.value;
          }
          
          const iframeDetails = iframe ? {
            src: iframe.src,
            width: iframe.offsetWidth,
            height: iframe.offsetHeight,
            styleWidth: iframe.style.width,
            styleHeight: iframe.style.height,
            attrWidth: iframe.getAttribute('width'),
            attrHeight: iframe.getAttribute('height')
          } : null;
          
          console.log('[ads.js] ✗ Final check: Ad unfilled, hiding placeholder for slot:', options.slot);
          console.log('[ads.js] ━━━ Final Unfilled Reason Details ━━━');
          console.log('  Status:', finalAdStatus);
          console.log('  Has noablate class:', finalNoAblate);
          console.log('  Display style:', finalDisplay);
          console.log('  Iframe error:', iframeHasError);
          console.log('  Iframe details:', iframeDetails);
          console.log('  All attributes:', allAttrs);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          // Ad filled, hide fallback
          if (fallbackElement) {
            fallbackElement.classList.add('hidden');
            console.log('[ads.js] Final check: Hiding fallback - ad filled');
          }
          console.log('[ads.js] ✓ Final check: Ad filled, keeping placeholder visible for slot:', options.slot);
        }
      }
    }, 100);
    
    // Give up after 10 seconds - if Google hasn't responded, treat as unfilled
    setTimeout(() => {
      clearInterval(checkInterval);
      
      const isDone = insElement.getAttribute('data-adsbygoogle-status') === 'done';
      const adStatus = insElement.getAttribute('data-ad-status');
      
      // If Google never marked it as done, or status is still null, treat as unfilled
      if (!isDone || adStatus === null) {
        console.log('[ads.js] ⏱️ Timeout reached for slot:', options.slot, '- Google never responded, treating as unfilled');
        console.log('[ads.js] Final state:', {
          isDone,
          adStatus,
          doneTime: doneTime ? 'set' : 'never set'
        });
        
        placeholder.classList.add('ad-placeholder-hidden');
        // Fallback remains visible since we never hide it
        
        // Set up MutationObserver to catch late responses from Google
        console.log('[ads.js] 🔍 Setting up MutationObserver for late ad load on slot:', options.slot);
        
        const observer = new MutationObserver((mutations) => {
          const nowDone = insElement.getAttribute('data-adsbygoogle-status') === 'done';
          const nowStatus = insElement.getAttribute('data-ad-status');
          const iframe = insElement.querySelector('iframe');
          const hasContent = iframe && iframe.offsetHeight > 0 && iframe.offsetWidth > 0;
          
          // Check if ad is now filled
          if (nowDone && nowStatus !== 'unfilled' && hasContent) {
            console.log('[ads.js] 🎉 Late ad load detected for slot:', options.slot, '- showing ad');
            
            // Reverse the hiding: show placeholder, hide fallback
            placeholder.classList.remove('ad-placeholder-hidden');
            if (fallbackElement) {
              fallbackElement.classList.add('hidden');
            }
            
            observer.disconnect();
          } else if (nowStatus === 'unfilled') {
            // If Google finally responded but with unfilled, disconnect observer
            console.log('[ads.js] Late response was unfilled for slot:', options.slot);
            observer.disconnect();
          }
        });
        
        // Watch for attribute changes and child additions (iframe)
        observer.observe(insElement, {
          attributes: true,
          attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
          childList: true,
          subtree: true
        });
        
        // Stop observing after 20 more seconds (30 seconds total)
        setTimeout(() => {
          observer.disconnect();
          console.log('[ads.js] MutationObserver stopped for slot:', options.slot, '- max observation time reached');
        }, 20000);
        
      } else {
        console.log('[ads.js] Timeout reached for slot:', options.slot, '- but ad is done, assuming unfilled');
      }
    }, 10000);
    
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

  /**
   * Inject in-feed ads between dashboard QR items
   * - Always place first ad between items 1 and 2
   * - Place remaining ads randomly every 1-4 items after that
   */
  function injectDashboardAds() {
    const qrItems = document.querySelectorAll('.qr-item');
    if (qrItems.length < 2) {
      console.log('[ads.js] Not enough QR items for dashboard ads (need at least 2)');
      return;
    }

    console.log(`[ads.js] Found ${qrItems.length} QR items, injecting dashboard ads`);

    let adsInjected = 0;
    let currentIndex = 1; // Start after first item
    
    // Always place first ad between 1st and 2nd item
    if (DASHBOARD_AD_SLOTS.length > 0 && qrItems.length >= 2) {
      const adConfig = DASHBOARD_AD_SLOTS[0];
      const targetItem = qrItems[1]; // Insert before 2nd item
      
      const placeholder = document.createElement('div');
      placeholder.setAttribute('data-ad-placeholder', '');
      placeholder.setAttribute('data-ad-title', '━━━ PROMOTIONS ━━━');
      placeholder.setAttribute('data-ad-slot', adConfig.slot);
      placeholder.setAttribute('data-ad-layout-key', adConfig.layoutKey);
      placeholder.classList.add('dashboard-infeed-ad');
      
      targetItem.parentNode.insertBefore(placeholder, targetItem);
      fillPlaceholder(placeholder);
      
      console.log(`[ads.js] Injected ${adConfig.name} (slot ${adConfig.slot}) after item 1`);
      adsInjected++;
      currentIndex = 2; // Next ad can start from position 2
    }
    
    // Place remaining ads randomly every 1-4 items
    for (let i = 1; i < DASHBOARD_AD_SLOTS.length && adsInjected < 4; i++) {
      // Random spacing between 1-4 items
      const spacing = Math.floor(Math.random() * 4) + 1;
      currentIndex += spacing;
      
      // Stop if we've run out of items
      if (currentIndex >= qrItems.length) {
        console.log(`[ads.js] Reached end of QR items at position ${currentIndex}`);
        break;
      }
      
      const adConfig = DASHBOARD_AD_SLOTS[i];
      const targetItem = qrItems[currentIndex];
      
      const placeholder = document.createElement('div');
      placeholder.setAttribute('data-ad-placeholder', '');
      placeholder.setAttribute('data-ad-title', '━━━ PROMOTIONS ━━━');
      placeholder.setAttribute('data-ad-slot', adConfig.slot);
      placeholder.setAttribute('data-ad-layout-key', adConfig.layoutKey);
      placeholder.classList.add('dashboard-infeed-ad');
      
      targetItem.parentNode.insertBefore(placeholder, targetItem);
      fillPlaceholder(placeholder);
      
      console.log(`[ads.js] Injected ${adConfig.name} (slot ${adConfig.slot}) after item ${currentIndex - 1}`);
      adsInjected++;
    }
    
    console.log(`[ads.js] Total dashboard ads injected: ${adsInjected}`);
  }

  // Expose API
  window.SA1LAds = {
    createAdElement,
    insertAd,
    insertMultipleAds,
    fillPlaceholder,
    fillAllPlaceholders,
    injectDashboardAds
  };
  
  // Auto-fill placeholders when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillAllPlaceholders);
  } else {
    fillAllPlaceholders();
  }
})();
