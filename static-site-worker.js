// Cloudflare Worker for SA1L.CC static site
// Handles HTML partial includes via HTMLRewriter

const PARTIALS = {
  'consent-modal': `<!-- Cookie Consent Modal -->
<div id="consent-modal" class="consent-modal">
  <div class="consent-content">
    <div class="consent-header">
      <div class="consent-title">Cookie Consent</div>
      <div class="consent-description">
        We use cookies to improve your experience and show relevant ads.
      </div>
    </div>
    
    <!-- Main View -->
    <div id="consent-main">
      <div class="consent-body">
        <div class="consent-section">
          <div class="consent-section-title">Your Privacy Matters</div>
          <div class="consent-section-desc">
            We respect your privacy. Choose how we use cookies on this site.
          </div>
        </div>
      </div>
      
      <div class="consent-actions">
        <button id="consent-accept-all" class="consent-primary-btn">
          Accept All Cookies
        </button>
        <div class="consent-links">
          <a href="#" id="consent-reject-all">reject all</a> · 
          <a href="#" id="consent-customize">customize preferences</a>
        </div>
      </div>
    </div>

    <!-- Custom Preferences View -->
    <div id="consent-custom">
      <div class="consent-body">
        <div class="consent-option">
          <input type="checkbox" id="consent-necessary" checked disabled>
          <label for="consent-necessary" class="consent-option-label">
            <span class="consent-option-name">Necessary</span>
            <span class="consent-option-desc">Required for site functionality. Cannot be disabled.</span>
          </label>
        </div>

        <div class="consent-option">
          <input type="checkbox" id="consent-analytics">
          <label for="consent-analytics" class="consent-option-label">
            <span class="consent-option-name">Analytics</span>
            <span class="consent-option-desc">Helps us understand how visitors use our site.</span>
          </label>
        </div>

        <div class="consent-option">
          <input type="checkbox" id="consent-ads">
          <label for="consent-ads" class="consent-option-label">
            <span class="consent-option-name">Advertising</span>
            <span class="consent-option-desc">Allows us to show relevant ads and measure their performance.</span>
          </label>
        </div>

        <div class="consent-option">
          <input type="checkbox" id="consent-personalization">
          <label for="consent-personalization" class="consent-option-label">
            <span class="consent-option-name">Personalization</span>
            <span class="consent-option-desc">Remembers your preferences and settings.</span>
          </label>
        </div>
      </div>

      <div class="consent-actions">
        <button id="consent-accept-all-custom" class="consent-primary-btn">
          Accept All Cookies
        </button>
        <button id="consent-save-custom" class="consent-primary-btn" style="margin-top: 10px;">
          Save Preferences
        </button>
      </div>
    </div>

    <div class="consent-footer"></div>
  </div>
</div>`,

  'useful-links': `<!-- Useful Links Section -->
<div class="receipt-section">
  <div class="section-title">━━━ useful links ━━━</div>
  <p style="text-align: center;">
    <a href="#" onclick="window.SA1LConsent.showModal(); return false;">manage cookie preferences</a>
  </p>
</div>`
};

// HTMLRewriter handler for [data-include] elements
class IncludeHandler {
  constructor(partialName) {
    this.partialName = partialName;
  }

  element(element) {
    const content = PARTIALS[this.partialName];
    if (content) {
      element.setInnerContent(content, { html: true });
      element.removeAttribute('data-include');
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Get the origin response
    const response = await fetch(request);
    
    // Only process HTML pages
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    // Apply HTMLRewriter to inject partials
    let rewriter = new HTMLRewriter();
    
    // Add handlers for each partial type
    Object.keys(PARTIALS).forEach(partialName => {
      rewriter = rewriter.on(`[data-include="${partialName}"]`, new IncludeHandler(partialName));
    });

    // Also inject CF-IPCountry as meta tag for consent.js geo-detection
    rewriter = rewriter.on('head', {
      element(element) {
        const country = request.cf?.country || 'UNKNOWN';
        element.append(`<meta name="cf-country" content="${country}">`, { html: true });
      }
    });

    return rewriter.transform(response);
  }
};
