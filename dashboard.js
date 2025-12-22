import { getBaseUrl, copyToClipboard as copyTextToClipboard, generateQRFilename, renderQRAsCharacters, generateQRCanvas } from './utils.js';

if (!window.firebaseAuth) {
  console.error('Firebase Auth not loaded');
  window.location.href = '/';
} else {
  const { auth, onAuthStateChanged, signOut } = window.firebaseAuth;

  const logoutBtn = document.getElementById('logout');
  const userInfo = document.getElementById('user-info');

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign-out error:', error);
      alert('Failed to sign out');
    }
  });

  // Auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (userInfo) userInfo.textContent = user.email || user.uid;

      window.firebaseUser = user;
      loadDashboard();
    } else {
      // Not logged in, redirect to home
      window.location.href = '/';
    }
  });
}

// Dashboard functionality
async function loadDashboard() {
  const dashboardContent = document.getElementById('dashboard-content');
  
  if (!dashboardContent) return;

  try {
    const idToken = await window.firebaseUser.getIdToken();
    
    const response = await fetch('/api/qr', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load QR codes');
    }

    const data = await response.json();
    const qrCodes = data.qrCodes || [];

    if (qrCodes.length === 0) {
      dashboardContent.innerHTML = '<p>No QR codes yet. <a href="/">Create one!</a></p>';
    } else {
      dashboardContent.innerHTML = qrCodes.map(qr => `
        <div class="qr-item" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
          <div style="display: flex; gap: 20px;">
            <div style="flex-shrink: 0;">
              <div id="display-${qr.slug}"></div>
              <br>
              <button onclick="downloadQR('${qr.slug}', '${qr.destination}')" style="margin-top: 5px; width: 100%;">Download</button>
            </div>
            <div style="flex-grow: 1;">
              <div style="margin-bottom: 10px;">
                <strong>Slug:</strong> <code>${qr.slug}</code>
                <button onclick="copyToClipboard('${getBaseUrlWrapper()}/r/${qr.slug}')" style="margin-left: 10px;">Copy URL</button>
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Destination:</strong>
                <input 
                  type="text" 
                  id="dest-${qr.slug}" 
                  value="${qr.destination}" 
                  style="width: 70%; padding: 5px;"
                />
                <button onclick="updateDestination('${qr.slug}')" style="margin-left: 10px;">Save</button>
                <span id="status-${qr.slug}" style="margin-left: 10px; color: green;"></span>
              </div>
              <div style="font-size: 0.9em; color: #666;">
                Created: ${new Date(qr.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      `).join('');
      
      // Generate QR codes after DOM is updated
      qrCodes.forEach(async qr => {
        const displayContainer = document.getElementById(`display-${qr.slug}`);
        const shortUrl = `${getBaseUrl()}/r/${qr.slug}`;
        
        // Render as characters
        await renderQRAsCharacters(shortUrl, displayContainer, { size: 'small' });
        
        // Generate hidden canvas for download
        const canvas = await generateQRCanvas(shortUrl, 300);
        canvas.id = `canvas-${qr.slug}`;
        canvas.setAttribute('data-slug', qr.slug);
        document.body.appendChild(canvas);
      });
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    dashboardContent.innerHTML = '<p style="color: red;">Failed to load QR codes. Please refresh.</p>';
  }
}

async function updateDestination(slug) {
  const input = document.getElementById(`dest-${slug}`);
  const status = document.getElementById(`status-${slug}`);
  const saveBtn = event.target;
  
  if (!input) return;

  const newDestination = input.value.trim();
  if (!newDestination) {
    alert('Destination cannot be empty');
    return;
  }

  saveBtn.disabled = true;
  status.textContent = 'Saving...';
  status.style.color = 'orange';

  try {
    const idToken = await window.firebaseUser.getIdToken();
    
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
      throw new Error(error.error || 'Failed to update');
    }

    status.textContent = '✓ Saved';
    status.style.color = 'green';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Update failed:', error);
    status.textContent = '✗ Failed';
    status.style.color = 'red';
    alert(error.message || 'Failed to update destination');
  } finally {
    saveBtn.disabled = false;
  }
}

function copyToClipboard(text) {
  copyTextToClipboard(text).then((success) => {
    if (success) {
      alert('URL copied to clipboard!');
    } else {
      alert('Failed to copy URL');
    }
  });
}

function downloadQR(slug, destination) {
  const canvas = document.getElementById(`canvas-${slug}`);
  if (!canvas) {
    alert('QR code not found');
    return;
  }
  
  const filename = generateQRFilename(slug, destination);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function getBaseUrlWrapper() {
  return getBaseUrl();
}

// Make functions globally available
window.updateDestination = updateDestination;
window.copyToClipboard = copyToClipboard;
window.downloadQR = downloadQR;
window.getBaseUrlWrapper = getBaseUrlWrapper;
