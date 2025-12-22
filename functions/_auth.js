export async function verifyFirebaseToken(token, projectId) {
  if (!token) {
    console.error('No token provided');
    return null;
  }

  if (!projectId) {
    console.error('No projectId provided - check FIREBASE_PROJECT_ID env var');
    return null;
  }

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Token verification failed:', res.status, errorText);
      return null;
    }

    const data = await res.json();

    // Basic validation
    if (
      data.aud !== projectId ||
      data.iss !== `https://securetoken.google.com/${projectId}`
    ) {
      console.error('Token validation failed:', {
        expectedAud: projectId,
        actualAud: data.aud,
        expectedIss: `https://securetoken.google.com/${projectId}`,
        actualIss: data.iss
      });
      return null;
    }

    console.log('Token verified successfully for user:', data.sub);
    return data; // contains sub (uid), email, etc.
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}