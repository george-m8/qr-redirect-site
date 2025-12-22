export async function onRequest({ params, env }) {
  const { slug } = params
  const { DB } = env

  const row = await DB
    .prepare('SELECT destination FROM qr_codes WHERE slug = ?')
    .bind(slug)
    .first()

  if (!row) {
    return new Response('Not found', { status: 404 })
  }

  return Response.redirect(row.destination, 302)
}