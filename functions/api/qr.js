function generateSlug() {
  return Math.random().toString(36).slice(2, 8)
}

export async function onRequestPost({ request, env }) {
  const { DB } = env

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
      headers: { 'Content-Type': 'application/json' }
    }
  )
}