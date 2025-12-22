if (!window.firebaseAuth) {
  console.error('Firebase Auth not loaded');
} else {
  const {
    auth,
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    GithubAuthProvider
  } = window.firebaseAuth;

  // UI elements
  const loginGoogleBtn = document.getElementById('login-google');
  const loginGithubBtn = document.getElementById('login-github');
  const loginEmailBtn = document.getElementById('login-email');
  const signupEmailBtn = document.getElementById('signup-email');
  const logoutBtn = document.getElementById('logout');
  const userInfo = document.getElementById('user-info');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Google
  loginGoogleBtn?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Failed to sign in with Google');
    }
  });

  // GitHub
  loginGithubBtn?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      alert('Failed to sign in with GitHub');
    }
  });

  // Email login
  loginEmailBtn?.addEventListener('click', async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value
      );
    } catch (error) {
      console.error('Email sign-in error:', error);
      alert('Failed to sign in with email');
    }
  });

  // Email signup
  signupEmailBtn?.addEventListener('click', async () => {
    try {
      await createUserWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value
      );
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // Auto-login if email already exists
        try {
          await signInWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
          );
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          alert('Email already in use. Please use correct password.');
        }
      } else {
        console.error('Email signup error:', error);
        alert(error.message || 'Failed to sign up with email');
      }
    }
  });

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
      if (loginGoogleBtn) loginGoogleBtn.style.display = 'none';
      if (loginGithubBtn) loginGithubBtn.style.display = 'none';
      if (loginEmailBtn) loginEmailBtn.style.display = 'none';
      if (signupEmailBtn) signupEmailBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';

      if (userInfo) userInfo.textContent = user.email || user.uid;

      // Store user object to get fresh tokens on demand
      window.firebaseUser = user;
    } else {
      if (loginGoogleBtn) loginGoogleBtn.style.display = 'inline-block';
      if (loginGithubBtn) loginGithubBtn.style.display = 'inline-block';
      if (loginEmailBtn) loginEmailBtn.style.display = 'inline-block';
      if (signupEmailBtn) signupEmailBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';

      if (userInfo) userInfo.textContent = '';
      window.firebaseUser = null;
    }
  });
}


const form = document.getElementById('qr-form')
    const destinationInput = document.getElementById('destination')
    const slugInput = document.getElementById('slug')
    const output = document.getElementById('output')
    const redirectUrlEl = document.getElementById('redirect-url')
    const redirectUrlLink = redirectUrlEl.parentElement
    const canvas = document.getElementById('qr-canvas')
    const downloadBtn = document.getElementById('download')
    const destinationUrlEl = document.getElementById('destination-url')
    const destinationUrlLink = destinationUrlEl.parentElement
    const baseUrl = getBaseUrl()
    let currentDestination = ''
    let currentSlug = ''
    const RATE_LIMIT_KEY = 'qr-redirect-rate-limit'
    const MAX_REQUESTS = 10
    const TIME_WINDOW = 60000 // 1 minute in milliseconds

    function checkRateLimit() {
        try {
            const now = Date.now()
            const stored = localStorage.getItem(RATE_LIMIT_KEY)
            let timestamps = stored ? JSON.parse(stored) : []
            
            // Remove timestamps outside the time window
            timestamps = timestamps.filter(ts => now - ts < TIME_WINDOW)
            
            if (timestamps.length >= MAX_REQUESTS) {
                const oldestTimestamp = Math.min(...timestamps)
                const waitTime = Math.ceil((TIME_WINDOW - (now - oldestTimestamp)) / 1000)
                return { allowed: false, waitTime }
            }
            
            // Add current timestamp
            timestamps.push(now)
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps))
            
            return { allowed: true }
        } catch (e) {
            console.error('Rate limit check failed:', e)
            return { allowed: true } // Fail open
        }
    }

    function getBaseUrl() {
        if (window.location.protocol === 'file:') {
            // local dev fallback
            return 'https://example.com'
        }
        return `${window.location.protocol}//${window.location.host}`
    }

    function normaliseDestination(input) {
        let value = input.trim()

        if (!value) return null

        // If protocol is missing, default to https
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
            value = 'https://' + value
        }

        try {
            const url = new URL(value)

            // Optional: block non-http(s) schemes
            if (!['http:', 'https:'].includes(url.protocol)) {
            return null
            }

            return url.toString()
        } catch {
            return null
        }
    }

    function generateSlug() {
      return Math.random().toString(36).substring(2, 8)
    }

    function sanitizeForFilename(url) {
      try {
        const urlObj = new URL(url)
        return urlObj.hostname.replace(/\./g, '-') + urlObj.pathname.replace(/\//g, '-').replace(/^-+|-+$/g, '')
      } catch {
        return url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
      }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        const rawDestination = destinationInput.value
        const destination = normaliseDestination(rawDestination)

        if (!destination) {
            alert('Please enter a valid URL')
            return
        }

        // Check if user is authenticated
        if (!window.firebaseUser) {
            alert('Please log in to generate QR codes')
            return
        }

        // Get fresh token (automatically refreshes if expired)
        let idToken
        try {
            idToken = await window.firebaseUser.getIdToken(true)
            console.log('Got fresh token:', idToken.substring(0, 50) + '...')
        } catch (error) {
            console.error('Failed to get ID token:', error)
            alert('Session expired. Please log in again.')
            return
        }

        // Check rate limit for new QR code generation
        const rateLimitCheck = checkRateLimit()
        if (!rateLimitCheck.allowed) {
            alert(`Rate limit exceeded. Please wait ${rateLimitCheck.waitTime} seconds before generating more QR codes.`)
            return
        }

        // Always call API to create QR code (ensures uniqueness per user)
        let slug
        try {
            const response = await fetch('/api/qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    destination,
                    slug: slugInput.value.trim() || undefined
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('API error:', response.status, errorText)
                let errorData
                try {
                    errorData = JSON.parse(errorText)
                } catch {
                    errorData = { error: errorText }
                }
                throw new Error(errorData.error || 'Failed to create QR code')
            }

            const data = await response.json()
            slug = data.slug
        } catch (error) {
            console.error('API error:', error)
            alert(error.message || 'Failed to create QR code')
            return
        }
        
        const redirectUrl = `${baseUrl}/r/${slug}`

        currentDestination = destination
        currentSlug = slug
        redirectUrlEl.textContent = redirectUrl
        redirectUrlLink.href = redirectUrl
        destinationUrlEl.textContent = destination
        destinationUrlLink.href = destination
        output.style.display = 'block'

        const destinationStr = sanitizeForFilename(currentDestination)
        const title = `${slug}_${destinationStr}`
        canvas.title = title

        await QRCode.toCanvas(canvas, redirectUrl, {
            width: 256,
            margin: 2
        })
    })

    downloadBtn.addEventListener('click', () => {
      const destinationStr = sanitizeForFilename(currentDestination)
      const filename = `${currentSlug}_${destinationStr}.png`
      
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    })