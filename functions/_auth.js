export async function verifyFirebaseToken(token, projectId) {
  if (!token) return null;

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();

  // Basic validation
  if (
    data.aud !== projectId ||
    data.iss !== `https://securetoken.google.com/${projectId}`
  ) {
    return null;
  }

  return data; // contains sub (uid), email, etc.
}