// Pages Function for partial injection and geo-targeting
const PARTIALS = {
  "auth-modal": `<!-- Auth Modal -->
<div id="auth-modal" class="auth-modal">
  <div class="auth-modal-content">
    <button id="auth-modal-close" class="auth-modal-close">&times;</button>
    <h2>━━━ Login ━━━</h2>
    <p class="small-text center-text">log in with:</p>
    <div class="auth-buttons">
      <button id="modal-login-google"><img src="/img/google.svg" alt="" class="button-icon">Google</button>
      <button id="modal-login-github"><img src="/img/github.svg" alt="" class="button-icon">GitHub</button>
    </div>
  </div>
</div>`,
  "consent-modal": `<!-- Cookie Consent Modal -->
<div id="consent-modal" class="consent-modal">
  <div class="consent-content">
    <div class="consent-header">
      <div class="consent-title">Cookie Consent</div>
      <div class="consent-description">
        We use cookies to improve your experience and show relevant ads.
      </div>
    </div>
    
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
  "firebase-init": `<!-- Firebase Auth (CDN, no build step) -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyD-f9TGmva8BXdX6_b460tdrUkzTGkbjjw",
    authDomain: "qr-redirect-site-1f3b9.firebaseapp.com",
    projectId: "qr-redirect-site-1f3b9",
    storageBucket: "qr-redirect-site-1f3b9.firebasestorage.app",
    messagingSenderId: "897097551184",
    appId: "1:897097551184:web:aca2f4c3aeac4f21b4b055"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  window.firebaseAuth = {
    auth,
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    GithubAuthProvider
  };
</script>`,
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
</div>`,
  "useful-links": `<!-- Useful Links Section -->
<div class="receipt-section">
  <div class="section-title">━━━ useful links ━━━</div>
  <p style="text-align: center;">
    <a href="#" onclick="window.SA1LConsent.showModal(); return false;">manage cookie preferences</a>
  </p>
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

// Import Pages Functions directly
import * as qrFunctions from './functions/api/qr.js';
import * as qrSlugFunctions from './functions/api/qr/[slug].js';
import * as redirectFunction from './functions/r/[slug].js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Handle API routes by calling Pages Functions directly
      if (url.pathname === '/api/qr') {
        if (request.method === 'GET') {
          return qrFunctions.onRequestGet({ request, env, ctx });
        } else if (request.method === 'POST') {
          return qrFunctions.onRequestPost({ request, env, ctx });
        }
      }
      
      // Handle specific QR code routes
      const qrSlugMatch = url.pathname.match(/^\/api\/qr\/([^\/]+)$/);
      if (qrSlugMatch) {
        const slug = qrSlugMatch[1];
        if (request.method === 'GET') {
          return qrSlugFunctions.onRequestGet({ request, env, ctx, params: { slug } });
        } else if (request.method === 'DELETE') {
          return qrSlugFunctions.onRequestDelete({ request, env, ctx, params: { slug } });
        }
      }
      
      // Handle redirects
      const redirectMatch = url.pathname.match(/^\/r\/([^\/]+)$/);
      if (redirectMatch) {
        const slug = redirectMatch[1];
        return redirectFunction.onRequest({ request, env, ctx, params: { slug } });
      }
      
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
