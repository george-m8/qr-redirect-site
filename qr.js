// Import utility functions
import { sanitizeForFilename, generateQRFilename, getBaseUrl, copyToClipboard as copyTextToClipboard } from './utils.js';

// Wait for Firebase to load
if (!window.firebaseAuth) {
  console.error('Firebase Auth not loaded');
  showError('Authentication system failed to load. Please refresh the page.');
} else {
  const { auth, onAuthStateChanged } = window.firebaseAuth;
  
  // Track auth state
  onAuthStateChanged(auth, (user) => {
    window.firebaseUser = user;
    checkAuthForEditing();
  });
}

let currentQRData = null;

// Get slug from URL
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');

// Validate slug format (alphanumeric, 6-10 chars typically)
if (!slug || !/^[a-zA-Z0-9]{4,12}$/.test(slug)) {
  showError('Invalid QR code identifier. Please check your link.');
  document.getElementById('loading').style.display = 'none';
} else {
  loadQRData();
}

async function loadQRData() {
  try {
    const response = await fetch(`/api/qr?slug=${encodeURIComponent(slug)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('QR code not found. It may have been deleted.');
      }
      throw new Error('Failed to load QR code data.');
    }

    const data = await response.json();
    currentQRData = data.qrCode;

    if (!currentQRData) {
      throw new Error('QR code not found.');
    }

    displayQRCode();
  } catch (error) {
    console.error('Error loading QR data:', error);
    showError(error.message || 'Failed to load QR code. Please try again.');
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

function displayQRCode() {
  const content = document.getElementById('content');
  const canvas = document.getElementById('qr-canvas');
  const redirectUrlEl = document.getElementById('redirect-url-text');
  const redirectUrlLink = document.getElementById('redirect-url');
  const destinationUrlEl = document.getElementById('destination-url-text');
  const destinationUrlLink = document.getElementById('destination-url');
  const newDestinationInput = document.getElementById('new-destination');

  const baseUrl = getBaseUrl();
  const shortUrl = `${baseUrl}/r/${currentQRData.slug}`;

  // Update URL displays
  redirectUrlEl.textContent = shortUrl;
  redirectUrlLink.href = shortUrl;
  destinationUrlEl.textContent = currentQRData.destination;
  destinationUrlLink.href = currentQRData.destination;
  newDestinationInput.value = currentQRData.destination;

  // Generate QR code
  QRCode.toCanvas(canvas, shortUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  }, (error) => {
    if (error) {
      console.error('QR generation error:', error);
      showError('Failed to generate QR code image.');
    }
  });

  content.style.display = 'block';
}

function checkAuthForEditing() {
  if (!currentQRData) return;

  const authRequired = document.getElementById('auth-required');
  const editForm = document.getElementById('edit-form');

  if (window.firebaseUser && currentQRData.owner === window.firebaseUser.uid) {
    // User is owner, show edit form
    authRequired.style.display = 'none';
    editForm.style.display = 'block';
  } else if (window.firebaseUser) {
    // User is logged in but not owner
    authRequired.innerHTML = '<p>⚠️ You can only edit QR codes that you created.</p>';
    authRequired.style.display = 'block';
    editForm.style.display = 'none';
  } else {
    // User not logged in
    authRequired.style.display = 'block';
    editForm.style.display = 'none';
  }
}

async function updateDestination() {
  const newDestinationInput = document.getElementById('new-destination');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  
  const newDestination = newDestinationInput.value.trim();
  
  if (!newDestination) {
    alert('Please enter a destination URL');
    return;
  }

  if (!window.firebaseUser) {
    alert('Please log in to edit this QR code');
    window.location.href = '/';
    return;
  }

  saveBtn.disabled = true;
  saveStatus.textContent = 'Saving...';
  saveStatus.style.color = 'orange';

  try {
    const idToken = await window.firebaseUser.getIdToken(true);
    
    const response = await fetch(`/api/qr/${slug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ destination: newDestination })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error response:', error);
      throw new Error(error.error || 'Failed to update destination');
    }

    const result = await response.json();
    console.log('Update result:', result);
    
    // API returns { success, slug, destination }
    if (!result.destination) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response from server');
    }
    
    currentQRData.destination = result.destination;

    // Update the displayed destination
    document.getElementById('destination-url-text').textContent = result.destination;
    document.getElementById('destination-url').href = result.destination;

    saveStatus.textContent = '✓ Saved successfully!';
    saveStatus.style.color = 'green';
    
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Update failed:', error);
    saveStatus.textContent = '✗ Failed to save';
    saveStatus.style.color = 'red';
    alert(error.message || 'Failed to update destination');
  } finally {
    saveBtn.disabled = false;
  }
}

function copyToClipboard(type) {
  const text = type === 'redirect' 
    ? document.getElementById('redirect-url-text').textContent
    : document.getElementById('destination-url-text').textContent;
  
  copyTextToClipboard(text).then((success) => {
    if (success) {
      alert('Copied to clipboard!');
    } else {
      alert('Failed to copy to clipboard');
    }
  });
}

function downloadQR() {
  if (!currentQRData) {
    alert('QR code data not loaded yet');
    return;
  }
  
  const canvas = document.getElementById('qr-canvas');
  const filename = generateQRFilename(currentQRData.slug, currentQRData.destination);
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Make functions globally available for onclick handlers
window.updateDestination = updateDestination;
window.copyToClipboard = copyToClipboard;
window.downloadQR = downloadQR;
