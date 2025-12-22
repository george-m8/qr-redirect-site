import { verifyFirebaseToken } from '../_auth';

function generateSlug() {
  return Math.random().toString(36).slice(2, 8)
}

async function checkRateLimit(db, identifier, max, windowSeconds) {
  if (!db) {
    console.error('RATE_DB binding not found')
    // Fail open: rate limiting must never block core functionality
    return { allowed: true, remaining: max }
  }

  try {
    const now = `strftime('%s','now')`
    const cutoff = `strftime('%s','now') - ${windowSeconds}`

    // Clean up old entries
    await db
      .prepare(`DELETE FROM rate_limits WHERE timestamp < ${cutoff}`)
      .run()

    // Count recent requests
    const result = await db
      .prepare(`SELECT COUNT(*) as count FROM rate_limits WHERE identifier = ? AND timestamp > ${cutoff}`)
      .bind(identifier)
      .first()

    if (result.count >= max) {
      return { allowed: false, remaining: 0 }
    }

    // Record this request
    await db
      .prepare(`INSERT INTO rate_limits (identifier, timestamp) VALUES (?, ${now})`)
      .bind(identifier)
      .run()

    return { allowed: true, remaining: max - result.count - 1 }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open: rate limiting must never block core functionality
    return { allowed: true, remaining: max }
  }
}

// GET /api/qr - List all QR codes for user OR get single QR by slug (public)
export async function onRequestGet({ request, env }) {
  const { DB, FIREBASE_PROJECT_ID } = env
  
  // Check if slug parameter is provided for single QR lookup
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  
  // If slug is provided, return single QR (public, no auth required)
  if (slug) {
    try {
      const result = await DB
        .prepare('SELECT slug, destination, owner, created_at FROM qr_codes WHERE slug = ?')
        .bind(slug)
        .first();

      if (!result) {
        return new Response(
          JSON.stringify({ error: 'QR code not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ qrCode: result }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch QR code' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Otherwise, list all QR codes for authenticated user
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

  try {
    // Query all QR codes owned by this user
    const result = await DB
      .prepare('SELECT slug, destination, created_at FROM qr_codes WHERE owner = ? ORDER BY created_at DESC')
      .bind(userId)
      .all();

    return new Response(
      JSON.stringify({ qrCodes: result.results || [] }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to fetch QR codes:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch QR codes' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST /api/qr - Create new QR code
export async function onRequestPost({ request, env }) {
  const { DB, RATE_DB, FIREBASE_PROJECT_ID } = env

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

  const userId = payload.sub; // Firebase UID

  const RATE_LIMIT_MAX = 6 // requests
  const RATE_LIMIT_WINDOW = 60 // seconds

  // Check rate limit using userId instead of IP
  const rateLimitCheck = await checkRateLimit(RATE_DB, userId, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)
  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(RATE_LIMIT_WINDOW)
        }
      }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { destination, slug: customSlug } = body

  if (!destination || typeof destination !== 'string') {
    return new Response('Missing destination', { status: 400 })
  }

  let slug = customSlug || null
  let inserted = false

  // If custom slug provided, try it first
  if (slug) {
    try {
      await DB
        .prepare(
          'INSERT INTO qr_codes (slug, destination, owner, created_at) VALUES (?, ?, ?, datetime("now"))'
        )
        .bind(slug, destination, userId)
        .run()
      
      inserted = true
    } catch {
      // Custom slug already exists or invalid
      return new Response(
        JSON.stringify({ error: 'Slug already in use' }),
        { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // Generate random slug if no custom slug or not yet inserted
  if (!inserted) {
    for (let i = 0; i < 5; i++) {
      slug = generateSlug()

      try {
        await DB
          .prepare(
            'INSERT INTO qr_codes (slug, destination, owner, created_at) VALUES (?, ?, ?, datetime("now"))'
          )
          .bind(slug, destination, userId)
          .run()

        inserted = true
        break
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error.message || error)
        // If it's not a unique constraint error, stop retrying
        if (!error.message?.includes('UNIQUE') && !error.message?.includes('unique')) {
          return new Response(
            JSON.stringify({ error: `Database error: ${error.message || 'Unknown error'}` }),
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        // Otherwise it's a slug collision, retry
      }
    }
  }

  if (!inserted) {
    return new Response(
      JSON.stringify({ error: 'Could not generate unique slug after 5 attempts' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const redirectUrl = new URL(`/r/${slug}`, request.url).toString()

  return new Response(
    JSON.stringify({ slug, redirectUrl }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
        'X-RateLimit-Remaining': String(rateLimitCheck.remaining)
      }
    }
  )
}