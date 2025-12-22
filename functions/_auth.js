import { decodeProtectedHeader, jwtVerify } from 'jose';

let firebaseCerts = null;
let certsFetchedAt = 0;
const CERT_TTL = 60 * 60 * 1000; // 1 hour

async function getFirebaseCerts() {
  const now = Date.now();
  if (firebaseCerts && now - certsFetchedAt < CERT_TTL) {
    return firebaseCerts;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );

  if (!res.ok) {
    throw new Error('Failed to fetch Firebase certs');
  }

  firebaseCerts = await res.json();
  certsFetchedAt = now;
  return firebaseCerts;
}

export async function verifyFirebaseToken(token, projectId) {
  if (!token) return null;

  const { kid } = decodeProtectedHeader(token);
  const certs = await getFirebaseCerts();
  const cert = certs[kid];

  if (!cert) return null;

  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(cert),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const { payload } = await jwtVerify(token, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });

  return payload; // contains uid, email, etc
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s+/g, '');

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}