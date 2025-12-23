# Cloudflare Worker Setup for SA1L.CC

This Worker handles HTML partial includes for shared components across the static site.

## Features

- **HTML Partial Injection**: Injects consent modal and useful links sections via `data-include` attributes
- **Geo-detection**: Automatically adds `<meta name="cf-country">` tag for consent.js geo-targeting
- **Zero Build Step**: Server-side processing, no pre-processing needed

## Deployment

### Option 1: Deploy via Cloudflare Dashboard

1. Go to **Workers & Pages** > **Create Application** > **Create Worker**
2. Name it: `sa1l-static-site`
3. Click **Deploy**
4. Click **Edit Code**
5. Copy the contents of `static-site-worker.js` and paste it
6. Click **Save and Deploy**
7. Go to **Workers & Pages** > **sa1l-static-site** > **Settings** > **Triggers**
8. Add route: `sa1l.cc/*` and `*.sa1l.cc/*`

### Option 2: Deploy via Wrangler CLI

```bash
# Install wrangler if needed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create wrangler.toml
cat > wrangler.toml << 'EOF'
name = "sa1l-static-site"
main = "static-site-worker.js"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "sa1l.cc/*", zone_name = "sa1l.cc" }
]
EOF

# Deploy
wrangler deploy
```

## Usage in HTML

Replace large HTML blocks with simple data-include attributes:

### Before:
```html
<!-- 90 lines of consent modal HTML -->
```

### After:
```html
<div data-include="consent-modal"></div>
```

## Available Partials

- `consent-modal` - Full cookie consent modal
- `useful-links` - Footer links section

## Adding New Partials

1. Create HTML file in `/partials/` directory
2. Add to `PARTIALS` object in `static-site-worker.js`:

```javascript
const PARTIALS = {
  'my-new-partial': `<div>Your HTML here</div>`
};
```

3. Use in HTML:
```html
<div data-include="my-new-partial"></div>
```

## Testing Locally

Unfortunately, HTMLRewriter doesn't work in local wrangler dev. Test by:
1. Deploying to Cloudflare
2. Or temporarily hardcode HTML for local dev

## Notes

- Partials are embedded in Worker for speed (no external fetches)
- Country detection uses `request.cf.country`
- Only processes HTML responses (skips CSS, JS, images)
