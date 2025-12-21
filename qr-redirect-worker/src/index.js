/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/r/')) {
      return Response.redirect('https://example.com', 302)
    }

    return new Response('Not found', { status: 404 })
  }
}