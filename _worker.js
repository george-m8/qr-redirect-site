// Pages Function for partial injection and geo-targeting
const PARTIALS = {
  "page-overlay": `<div id="page-transition-overlay" class="page-transition-overlay visible">
  <div class="spinner" role="status" aria-live="polite">
    <div class="spinner-animation" aria-hidden="true"></div>
    <div class="spinner-text">--- LOADING ---</div>
  </div>
</div>`,
  "site-header": `<div class="receipt-header">
  <pre class="site-logo"></pre>
  <h1 class="site-logo-text">SA1L.CC</h1>
  <div class="site-description">generate and manage short qr redirect links</div>
</div>`
};

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
    try {
      // Get the origin response from Pages
      const response = await env.ASSETS.fetch(request);
      
      // Only process HTML
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return response;
      }
      
      // Apply HTMLRewriter
      let rewriter = new HTMLRewriter();
      
      // Add handlers for each partial
      Object.keys(PARTIALS).forEach(partialName => {
        rewriter = rewriter.on(`[data-include="${partialName}"]`, new IncludeHandler(partialName));
      });
      
      // Inject CF-IPCountry meta tag
      rewriter = rewriter.on('head', {
        element(element) {
          const country = request.cf?.country || 'UNKNOWN';
          element.append(`<meta name="cf-country" content="${country}">`, { html: true });
        }
      });
      
      return rewriter.transform(response);
      
    } catch (error) {
      return new Response(`Worker error: ${error.message}`, { status: 500 });
    }
  }
};
