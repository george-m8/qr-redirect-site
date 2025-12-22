import { verifyFirebaseToken } from '../../_auth';

// PATCH /api/qr/:slug - Update destination for a QR code
export async function onRequestPatch({ request, env, params }) {
  const { DB, FIREBASE_PROJECT_ID } = env;
  const { slug } = params;

  // Extract and verify Firebase token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  const payload = await verifyFirebaseToken(token, FIREBASE_PROJECT_ID);

  if (!payload) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const userId = payload.sub;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const { destination } = body;

  if (!destination || typeof destination !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid destination' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Verify ownership and update
    const result = await DB
      .prepare('UPDATE qr_codes SET destination = ? WHERE slug = ? AND owner = ?')
      .bind(destination, slug, userId)
      .run();

    if (result.meta.changes === 0) {
      // Either slug doesn't exist or doesn't belong to user
      // Check if slug exists at all
      const existing = await DB
        .prepare('SELECT owner FROM qr_codes WHERE slug = ?')
        .bind(slug)
        .first();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'QR code not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Slug exists but belongs to someone else
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not own this QR code' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        slug,
        destination
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to update QR code:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update QR code' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
