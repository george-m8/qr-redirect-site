/* Cookie Consent with Google Consent Mode v2
   Simple consent management for SA1L.CC
   
   To add new scripts:
   1. Add script URL to appropriate category in CONSENT_CONFIG
   2. Scripts load only after user consents
*/

(function(){
  // Configuration: map consent categories to scripts that require them
  const CONSENT_CONFIG = {
    analytics: [
      // Add analytics scripts here, e.g.:
      // 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX'
    ],
    ads: [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5742022755370369'
    ],
    personalization: [
      // Add personalization scripts here
    ]
  };

  const COOKIE_NAME = 'sa1l_consent';
  const COOKIE_DURATION = 365; // days

  // EU/EEA countries that require GDPR consent
  const EU_EEA_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
    'SE', 'IS', 'LI', 'NO', 'GB'
  ];

  // Check if user is in a region requiring consent banner
  function requiresConsent() {
    // Check Cloudflare country header (set via meta tag, cookie, or JS variable)
    
    // Option 1: Meta tag (e.g., <meta name="cf-country" content="US">)
    const metaCountry = document.querySelector('meta[name="cf-country"]')?.content;
    if (metaCountry) {
      const country = metaCountry.toUpperCase();
      return EU_EEA_COUNTRIES.includes(country);
    }
    
    // Option 2: Cookie (e.g., cf_country=US)
    const cookieCountry = getCookie('cf_country');
    if (cookieCountry) {
      const country = cookieCountry.toUpperCase();
      return EU_EEA_COUNTRIES.includes(country);
    }
    
    // Option 3: Window variable (e.g., window.CF_COUNTRY = 'US')
    if (window.CF_COUNTRY) {
      const country = window.CF_COUNTRY.toUpperCase();
      return EU_EEA_COUNTRIES.includes(country);
    }
    
    // Default: show banner if we can't determine location (safer for compliance)
    console.log('[Consent] Could not determine user location, showing banner to be safe');
    return true;
  }

  // Initialize Google Consent Mode (must run before any Google tags)
  function initGoogleConsent() {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    // Set default consent to denied (compliant default)
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'denied',
      'personalization_storage': 'denied',
      'functionality_storage': 'granted', // necessary cookies always granted
      'security_storage': 'granted'
    });
  }

  // Update Google Consent Mode based on user choice
  function updateGoogleConsent(consent) {
    if (!window.gtag) return;
    
    gtag('consent', 'update', {
      'ad_storage': consent.ads ? 'granted' : 'denied',
      'ad_user_data': consent.ads ? 'granted' : 'denied',
      'ad_personalization': consent.personalization ? 'granted' : 'denied',
      'analytics_storage': consent.analytics ? 'granted' : 'denied',
      'personalization_storage': consent.personalization ? 'granted' : 'denied'
    });
  }

  // Load scripts for granted categories
  function loadConsentScripts(consent) {
    Object.keys(CONSENT_CONFIG).forEach(category => {
      if (consent[category]) {
        CONSENT_CONFIG[category].forEach(scriptUrl => {
          if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
            console.log('[Consent] Loaded script:', scriptUrl);
          }
        });
      }
    });
  }

  // Cookie helpers
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  // Get saved consent or null
  function getSavedConsent() {
    const saved = getCookie(COOKIE_NAME);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }

  // Save consent choices
  function saveConsent(consent) {
    setCookie(COOKIE_NAME, JSON.stringify(consent), COOKIE_DURATION);
    updateGoogleConsent(consent);
    loadConsentScripts(consent);
  }

  // Show consent modal
  function showConsentModal() {
    const modal = document.getElementById('consent-modal');
    if (modal) modal.classList.add('visible');
  }

  // Hide consent modal
  function hideConsentModal() {
    const modal = document.getElementById('consent-modal');
    if (modal) modal.classList.remove('visible');
  }

  // Handle Accept All
  function acceptAll() {
    const consent = {
      necessary: true,
      analytics: true,
      ads: true,
      personalization: true
    };
    saveConsent(consent);
    hideConsentModal();
    console.log('[Consent] User accepted all');
  }

  // Handle Reject All (except necessary)
  function rejectAll() {
    const consent = {
      necessary: true,
      analytics: false,
      ads: false,
      personalization: false
    };
    saveConsent(consent);
    hideConsentModal();
    console.log('[Consent] User rejected non-essential');
  }

  // Handle Customize (show options)
  function showCustomize() {
    const main = document.getElementById('consent-main');
    const custom = document.getElementById('consent-custom');
    if (main) main.style.display = 'none';
    if (custom) custom.style.display = 'block';
  }

  // Handle Save Custom
  function saveCustom() {
    const consent = {
      necessary: true, // always true
      analytics: document.getElementById('consent-analytics')?.checked || false,
      ads: document.getElementById('consent-ads')?.checked || false,
      personalization: document.getElementById('consent-personalization')?.checked || false
    };
    saveConsent(consent);
    hideConsentModal();
    console.log('[Consent] User saved custom preferences:', consent);
  }

  // Initialize
  function init() {
    // Set up Google Consent Mode first
    initGoogleConsent();

    // Check for saved consent
    const saved = getSavedConsent();
    if (saved) {
      // User already made choice
      updateGoogleConsent(saved);
      loadConsentScripts(saved);
      console.log('[Consent] Using saved preferences:', saved);
    } else {
      // No saved consent - check if user is in region requiring consent
      if (requiresConsent()) {
        // EU/EEA user, show modal
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', showConsentModal);
        } else {
          showConsentModal();
        }
      } else {
        // Non-EU/EEA user, auto-accept all (no banner needed)
        console.log('[Consent] User not in EU/EEA, auto-granting consent');
        const consent = {
          necessary: true,
          analytics: true,
          ads: true,
          personalization: true
        };
        saveConsent(consent);
        // No need to show modal
      }
    }

    // Set up event listeners
    document.addEventListener('DOMContentLoaded', () => {
      const acceptBtn = document.getElementById('consent-accept-all');
      const acceptCustomBtn = document.getElementById('consent-accept-all-custom');
      const rejectLink = document.getElementById('consent-reject-all');
      const customizeLink = document.getElementById('consent-customize');
      const saveCustomBtn = document.getElementById('consent-save-custom');

      if (acceptBtn) acceptBtn.addEventListener('click', acceptAll);
      if (acceptCustomBtn) acceptCustomBtn.addEventListener('click', acceptAll);
      if (rejectLink) rejectLink.addEventListener('click', (e) => { e.preventDefault(); rejectAll(); });
      if (customizeLink) customizeLink.addEventListener('click', (e) => { e.preventDefault(); showCustomize(); });
      if (saveCustomBtn) saveCustomBtn.addEventListener('click', saveCustom);
    });
  }

  // Expose API for settings page to re-open modal
  window.SA1LConsent = {
    showModal: showConsentModal,
    getSaved: getSavedConsent
  };

  init();
})();
