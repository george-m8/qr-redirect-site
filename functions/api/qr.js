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

export async function onRequestPost({ request, env }) {
  const { DB, RATE_DB } = env

  const RATE_LIMIT_MAX = 6 // requests
  const RATE_LIMIT_WINDOW = 60 // seconds

  // Get client identifier (IP address)
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                   'unknown'

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(RATE_DB, clientIP, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)
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

  const { destination } = body

  if (!destination || typeof destination !== 'string') {
    return new Response('Missing destination', { status: 400 })
  }

  let slug
  let inserted = false

  for (let i = 0; i < 5; i++) {
    slug = generateSlug()

    try {
      await DB
        .prepare(
          'INSERT INTO qr_codes (slug, destination, created_at) VALUES (?, ?, datetime("now"))'
        )
        .bind(slug, destination)
        .run()

      inserted = true
      break
    } catch {
      // slug collision, retry
    }
  }

  if (!inserted) {
    return new Response('Could not generate unique slug', { status: 500 })
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