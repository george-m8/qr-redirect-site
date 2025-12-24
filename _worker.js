// Minimal test worker for Pages Functions
export default {
  async fetch(request, env, ctx) {
    try {
      // Get the origin response from Pages
      const response = await env.ASSETS.fetch(request);
      
      // Only process HTML
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return response;
      }
      
      // For now, just pass through without HTMLRewriter
      return response;
      
    } catch (error) {
      return new Response(`Worker error: ${error.message}`, { status: 500 });
    }
  }
};
