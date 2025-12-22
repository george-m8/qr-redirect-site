/**
 * Auth Modal - Reusable authentication popup
 */

let authModalInitialized = false;

export function initAuthModal() {
  if (authModalInitialized) return;
  
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('auth-modal-close');
  
  // Close on X button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }
  
  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAuthModal();
      }
    });
  }
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeAuthModal();
    }
  });
  
  authModalInitialized = true;
}

export function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }
}

export function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
  }
}

/**
 * Setup Firebase auth in modal
 * Should be called after Firebase is loaded
 */
export function setupModalAuth(firebaseAuth) {
  const {
    auth,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    GithubAuthProvider
  } = firebaseAuth;
  
  const loginGoogleBtn = document.getElementById('modal-login-google');
  const loginGithubBtn = document.getElementById('modal-login-github');
  const loginEmailBtn = document.getElementById('modal-login-email');
  const signupEmailBtn = document.getElementById('modal-signup-email');
  const emailInput = document.getElementById('modal-email');
  const passwordInput = document.getElementById('modal-password');
  
  // Google login
  loginGoogleBtn?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      closeAuthModal();
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Failed to sign in with Google');
    }
  });
  
  // GitHub login
  loginGithubBtn?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      closeAuthModal();
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      alert('Failed to sign in with GitHub');
    }
  });
  
  // Email login
  loginEmailBtn?.addEventListener('click', async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      closeAuthModal();
    } catch (error) {
      console.error('Email sign-in error:', error);
      alert('Failed to sign in with email');
    }
  });
  
  // Email signup
  signupEmailBtn?.addEventListener('click', async () => {
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      closeAuthModal();
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // Auto-login if email already exists
        try {
          await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
          closeAuthModal();
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
  
  // Enter key submits email login
  passwordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginEmailBtn?.click();
    }
  });
}

// Make functions available globally for onclick handlers
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
