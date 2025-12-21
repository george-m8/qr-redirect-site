export async function onRequest(context) {
  const { slug } = context.params

  // temporary test redirect
  return Response.redirect('https://example.com', 302)
}