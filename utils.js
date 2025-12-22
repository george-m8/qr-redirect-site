/**
 * Shared utility functions for QR redirect site
 */

/**
 * Render QR code as Unicode block characters for display
 * @param {string} text - Text to encode in QR code
 * @param {HTMLElement} container - Container element to render into
 * @param {Object} options - Options (size: 'small' | 'normal')
 * @returns {Promise<void>}
 */
export async function renderQRAsCharacters(text, container, options = {}) {
  const size = options.size || 'normal';
  
  try {
    // Generate QR code matrix using QRCode library
    const qr = await new Promise((resolve, reject) => {
      QRCode.create(text, { errorCorrectionLevel: 'M' }, (err, qrcode) => {
        if (err) reject(err);
        else resolve(qrcode);
      });
    });
    
    const modules = qr.modules;
    const moduleCount = modules.size;
    
    // Create HTML representation using Unicode blocks
    let html = '';
    for (let row = 0; row < moduleCount; row++) {
      let rowHtml = '';
      for (let col = 0; col < moduleCount; col++) {
        // Use full block for dark modules, space for light
        rowHtml += modules.get(row, col) ? '█' : ' ';
      }
      html += `<span class="qr-display-row" style="--row-index: ${row}">${rowHtml}</span>`;
    }
    
    const sizeClass = size === 'small' ? 'qr-display-small' : '';
    container.innerHTML = `<div class="qr-display ${sizeClass}">${html}</div>`;
  } catch (error) {
    console.error('Failed to render QR code:', error);
    container.innerHTML = '<p style="color: red;">Failed to generate QR code</p>';
  }
}

/**
 * Generate a hidden canvas for PNG download
 * @param {string} text - Text to encode
 * @param {number} width - Canvas width
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generateQRCanvas(text, width = 300) {
  const canvas = document.createElement('canvas');
  canvas.className = 'qr-canvas-hidden';
  
  await new Promise((resolve, reject) => {
    QRCode.toCanvas(canvas, text, {
      width: width,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  
  return canvas;
}

/**
 * Sanitize a URL for use in a filename
 * Converts hostname and path to a safe filename string
 * @param {string} url - The URL to sanitize
 * @returns {string} Safe filename string
 * 
 * @example
 * sanitizeForFilename('https://example.com/path/to/page')
 * // Returns: 'example-com-path-to-page'
 */
export function sanitizeForFilename(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/\./g, '-') + urlObj.pathname.replace(/\//g, '-').replace(/^-+|-+$/g, '');
  } catch {
    // If not a valid URL, just sanitize the string directly
    return url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }
}

/**
 * Get the base URL of the current site
 * @returns {string} Base URL (e.g., 'https://example.com')
 */
export function getBaseUrl() {
  if (typeof window === 'undefined') {
    throw new Error('getBaseUrl can only be called in browser context');
  }
  
  if (window.location.protocol === 'file:') {
    // Fallback for local development
    return 'https://example.com';
  }
  
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * Generate a filename for QR code download
 * Format: hostname_slug_destination.png
 * @param {string} slug - The QR code slug
 * @param {string} destination - The destination URL
 * @param {string} [baseUrl] - Optional base URL (defaults to current site)
 * @returns {string} Filename for download
 * 
 * @example
 * generateQRFilename('abc123', 'https://example.com/page')
 * // Returns: 'sa1l-cc_abc123_example-com-page.png'
 */
export function generateQRFilename(slug, destination, baseUrl = null) {
  const base = baseUrl || getBaseUrl();
  const hostnameStr = sanitizeForFilename(base);
  const destinationStr = sanitizeForFilename(destination);
  return `${hostnameStr}_${slug}_${destinationStr}.png`;
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Normalize a destination URL
 * Adds https:// if no protocol specified, validates URL format
 * @param {string} input - Raw URL input
 * @returns {string|null} Normalized URL or null if invalid
 * 
 * @example
 * normalizeDestination('example.com')
 * // Returns: 'https://example.com/'
 */
export function normalizeDestination(input) {
  let value = input.trim();
  
  if (!value) return null;
  
  // If protocol is missing, default to https
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    value = 'https://' + value;
  }
  
  try {
    const url = new URL(value);
    
    // Only allow http(s) schemes
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    
    return url.toString();
  } catch {
    return null;
  }
}
