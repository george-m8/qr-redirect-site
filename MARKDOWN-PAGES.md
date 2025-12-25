# Markdown Pages System

This project includes a markdown-to-HTML build system for creating static content pages.

## Quick Start

1. **Create a markdown file** in `/content/`:
   ```bash
   touch content/my-page.md
   ```

2. **Add frontmatter and content**:
   ```markdown
   ---
   title: My Page Title
   template: page
   permalink: my-page.html
   ---

   # My Page

   Your content here...
   ```

3. **Build pages**:
   ```bash
   npm run build:pages
   ```

4. **Build everything** (worker + pages):
   ```bash
   npm run build
   ```

## Frontmatter Options

### Required
- `title`: Page title (appears in `<title>` tag)

### Optional
- `template`: Template to use (`page` or `simple`, default: `page`)
- `permalink`: Custom output path (default: mirrors content structure)

## Available Templates

### `page.html` (default)
Full-featured page with:
- Site header
- Navigation back link
- Styled content area
- All favicon links
- Responsive design

### `simple.html`
Minimal page with:
- Basic header
- Clean typography
- Smaller file size
- Perfect for simple docs

## Creating Custom Templates

1. Add a new template in `/templates/`:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>{{title}}</title>
   </head>
   <body>
     {{content}}
   </body>
   </html>
   ```

2. Use placeholders:
   - `{{title}}` - Replaced with frontmatter title
   - `{{content}}` - Replaced with rendered markdown HTML

3. Reference in markdown:
   ```markdown
   ---
   title: My Page
   template: my-custom-template
   ---
   ```

## Markdown Features

Full markdown support including:
- **Headers** (H1-H6)
- **Lists** (ordered and unordered)
- **Links** and images
- **Code blocks** with syntax
- **Blockquotes**
- **Bold**, *italic*, ~~strikethrough~~
- Horizontal rules
- Tables

## Directory Structure

```
/content/              # Markdown source files
  about.md
  guide.md
  terms.md
  
/templates/            # HTML templates
  page.html            # Default template
  simple.html          # Minimal template
  
/build-pages.js        # Build script
.pages-manifest.json   # Generated manifest
about.html             # Generated output
guide.html             # Generated output
terms.html             # Generated output
```

## Deployment

The build script runs automatically during deployment:

```bash
npm run deploy:static   # Builds worker + pages, then deploys
```

Or manually:
```bash
npm run build           # Build worker + pages
wrangler deploy         # Deploy to Cloudflare Pages
```

## Tips

- Keep markdown files organized in `/content/` subdirectories
- Use `permalink` to control exact output paths
- Generated HTML files are gitignored (built during deployment)
- The build is fast - rebuilding all pages takes milliseconds
- Test locally by opening generated HTML files in a browser

## Examples

### Basic Page
```markdown
---
title: Contact
template: simple
---

# Get in Touch

Email: hello@sa1l.cc
```

### Nested Structure
```
/content/
  docs/
    getting-started.md
    api.md
```
Outputs to:
```
docs/getting-started.html
docs/api.html
```

### Custom Permalink
```markdown
---
title: Privacy Policy
permalink: privacy.html
---
```
Always outputs to `privacy.html` regardless of source location.
