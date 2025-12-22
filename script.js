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
loginGoogleBtn.addEventListener('click', async () => {
  await signInWithPopup(auth, new GoogleAuthProvider());
});

// GitHub
loginGithubBtn.addEventListener('click', async () => {
  await signInWithPopup(auth, new GithubAuthProvider());
});

// Email login
loginEmailBtn.addEventListener('click', async () => {
  await signInWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  );
});

// Email signup
signupEmailBtn.addEventListener('click', async () => {
  await createUserWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  );
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

// Auth state listener (this is the important bit)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginGoogleBtn.style.display = 'none';
    loginGithubBtn.style.display = 'none';
    loginEmailBtn.style.display = 'none';
    signupEmailBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';

    userInfo.textContent = user.email || user.uid;

    // 🔑 Save token for later backend use
    window.firebaseIdToken = await user.getIdToken();
  } else {
    loginGoogleBtn.style.display = 'inline-block';
    loginGithubBtn.style.display = 'inline-block';
    loginEmailBtn.style.display = 'inline-block';
    signupEmailBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';

    userInfo.textContent = '';
    window.firebaseIdToken = null;
  }
});

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
    const STORAGE_KEY = 'qr-redirect-mappings'
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

    function getStoredMappings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch {
            return {}
        }
    }

    function storeMapping(destination, slug) {
        try {
            const mappings = getStoredMappings()
            mappings[destination] = slug
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
        } catch (e) {
            console.error('Failed to store mapping:', e)
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

        // Check if we already have a slug for this destination
        const mappings = getStoredMappings()
        let slug = mappings[destination]
        
        // If no existing slug and user didn't provide one, generate new
        if (!slug) {
            // Check rate limit for new QR code generation
            const rateLimitCheck = checkRateLimit()
            if (!rateLimitCheck.allowed) {
                alert(`Rate limit exceeded. Please wait ${rateLimitCheck.waitTime} seconds before generating more QR codes.`)
                return
            }
            
            slug = slugInput.value.trim() || generateSlug()
            storeMapping(destination, slug)
        }
        
        const redirectUrl = `${baseUrl}/r/${slug}`

        currentDestination = destination
        redirectUrlEl.textContent = redirectUrl
        redirectUrlLink.href = redirectUrl
        destinationUrlEl.textContent = destination
        destinationUrlLink.href = destination
        output.style.display = 'block'

        const hostnameStr = sanitizeForFilename(baseUrl)
        const destinationStr = sanitizeForFilename(currentDestination)
        const title = `${hostnameStr}_${destinationStr}`
        canvas.title = title

        await QRCode.toCanvas(canvas, redirectUrl, {
            width: 256,
            margin: 2
        })
    })

    downloadBtn.addEventListener('click', () => {
      const hostnameStr = sanitizeForFilename(baseUrl)
      const destinationStr = sanitizeForFilename(currentDestination)
      const filename = `${hostnameStr}_${destinationStr}.png`
      
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    })