if (!window.firebaseAuth) {
  console.error('Firebase Auth not loaded');
  alert('Firebase Auth failed to load. Check your connection.');
} else {
  console.log('Firebase Auth loaded successfully');
  const {
    auth,
    onAuthStateChanged,
    signOut
  } = window.firebaseAuth;

  // Import and initialize auth modal
  import('./auth-modal.js').then(({ initAuthModal, setupModalAuth, openAuthModal }) => {
    initAuthModal();
    setupModalAuth(window.firebaseAuth);
    
    // Make openAuthModal available for button onclick
    window.openAuthModal = openAuthModal;
    
    // Auto-open modal if ?login query param is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('login')) {
      openAuthModal();
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  // Get form elements that need to be enabled/disabled
  const destinationInput = document.getElementById('destination');
  const submitButton = document.querySelector('#qr-form button[type="submit"]');

  // Initially set button to login mode
  if (submitButton) {
    submitButton.textContent = 'Login to Generate QR';
    submitButton.type = 'button'; // Prevent form submission
    submitButton.onclick = () => window.openAuthModal();
  }
  if (destinationInput) destinationInput.disabled = true;

  // UI elements
  const logoutBtn = document.getElementById('logout');
  const dashboardLink = document.getElementById('dashboard-link');
  const userInfo = document.getElementById('user-info');

  console.log('Auth setup complete');

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      alert('Failed to sign out');
    }
  });

  // Auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (dashboardLink) dashboardLink.style.display = 'inline-block';

      if (userInfo) userInfo.textContent = user.email || user.uid;

      // Enable form fields and change button to submit mode
      if (destinationInput) destinationInput.disabled = false;
      if (submitButton) {
        submitButton.textContent = 'Generate QR';
        submitButton.type = 'submit';
        submitButton.onclick = null; // Remove modal opener, let form submit naturally
      }

      // Store user object to get fresh tokens on demand
      window.firebaseUser = user;
    } else {
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (dashboardLink) dashboardLink.style.display = 'none';

      if (userInfo) userInfo.textContent = '';
      
      // Disable form fields and change button to login mode
      if (destinationInput) destinationInput.disabled = true;
      if (submitButton) {
        submitButton.textContent = 'Login to Generate QR';
        submitButton.type = 'button';
        submitButton.onclick = () => window.openAuthModal();
      }
      
      window.firebaseUser = null;
    }
  });

  // Form setup
  const form = document.getElementById('qr-form');
  const output = document.getElementById('output')
  const redirectUrlEl = document.getElementById('redirect-url');
  const redirectUrlLink = redirectUrlEl?.parentElement;
  const canvas = document.getElementById('qr-canvas');
  const downloadBtn = document.getElementById('download');
  const destinationUrlEl = document.getElementById('destination-url');
  const destinationUrlLink = destinationUrlEl?.parentElement;
  const baseUrl = getBaseUrl();
  let currentDestination = '';
  let currentSlug = '';

  function getBaseUrl() {
    if (window.location.protocol === 'file:') {
      // local dev fallback
      return 'https://example.com';
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  function normaliseDestination(input) {
    let value = input.trim();

    if (!value) return null;

    // If protocol is missing, default to https
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
      value = 'https://' + value;
    }

    try {
      const url = new URL(value);

      // Optional: block non-http(s) schemes
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  function generateSlug() {
    return Math.random().toString(36).substring(2, 8);
  }

  function sanitizeForFilename(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/\./g, '-') + urlObj.pathname.replace(/\//g, '-').replace(/^-+|-+$/g, '');
    } catch {
      return url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawDestination = destinationInput.value;
    const destination = normaliseDestination(rawDestination);

    if (!destination) {
      alert('Please enter a valid URL');
      return;
    }

    // Check if user is authenticated
    if (!window.firebaseUser) {
      alert('Please log in to generate QR codes');
      return;
    }

    // Show loading state
    submitButton.textContent = 'Generating...';
    submitButton.disabled = true;

    // Get fresh token (automatically refreshes if expired)
    let idToken;
    try {
      idToken = await window.firebaseUser.getIdToken(true);
      console.log('Got fresh token:', idToken.substring(0, 50) + '...');
    } catch (error) {
      console.error('Failed to get ID token:', error);
      alert('Session expired. Please log in again.');
      return;
    }

    // Call API to create QR code
    let slug;
    try {
      const response = await fetch('/api/qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ destination })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Handle specific error cases
        if (response.status === 401) {
          alert('Please log in again.');
          return;
        }
        
        if (response.status === 429) {
          alert('Rate limit exceeded. Please wait a moment before generating more QR codes.');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create QR code');
      }

      const data = await response.json();
      slug = data.slug;
    } catch (error) {
      console.error('API error:', error);
      alert(error.message || 'Failed to create QR code');
      return;
    }
    
    // Redirect to ad page with slug
    window.location.href = `/ad.html?slug=${encodeURIComponent(slug)}`;
  });
}
