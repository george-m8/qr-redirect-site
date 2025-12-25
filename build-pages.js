#!/usr/bin/env node

/**
 * Build script for markdown pages
 * Reads markdown files from /content directory and generates HTML pages
 * using templates from /templates
 * 
 * Usage: node build-pages.js
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(__dirname, 'content');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const OUTPUT_DIR = __dirname; // Output to root

console.log('📄 Building markdown pages...\n');

// Configure marked for safer HTML
marked.setOptions({
  headerIds: true,
  mangle: false,
  breaks: true
});

// Recursively find all .md files
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process a single markdown file
function processMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content: markdown } = matter(content);
  
  // Default values
  const title = frontmatter.title || 'Untitled';
  const template = frontmatter.template || 'page';
  const permalink = frontmatter.permalink || null;
  
  // Convert markdown to HTML
  const htmlContent = marked(markdown);
  
  // Load template
  const templatePath = path.join(TEMPLATES_DIR, `${template}.html`);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`  ✗ Template not found: ${template}.html`);
    return;
  }
  
  let templateHtml = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders
  templateHtml = templateHtml
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{content\}\}/g, htmlContent);
  
  // Determine output path
  let outputPath;
  
  if (permalink) {
    // Use custom permalink
    outputPath = path.join(OUTPUT_DIR, permalink);
  } else {
    // Generate from file path
    const relativePath = path.relative(CONTENT_DIR, filePath);
    const outputRelativePath = relativePath.replace('.md', '.html');
    outputPath = path.join(OUTPUT_DIR, outputRelativePath);
  }
  
  // Ensure output directory exists
  const outputDirectory = path.dirname(outputPath);
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  
  // Write output file
  fs.writeFileSync(outputPath, templateHtml, 'utf8');
  
  const relativeOutput = path.relative(OUTPUT_DIR, outputPath);
  console.log(`  ✓ ${path.relative(CONTENT_DIR, filePath)} → ${relativeOutput}`);
  
  return {
    source: filePath,
    output: outputPath,
    title,
    permalink: permalink || relativeOutput
  };
}

// Main build process
try {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('❌ /content directory not found');
    process.exit(1);
  }
  
  const markdownFiles = findMarkdownFiles(CONTENT_DIR);
  
  if (markdownFiles.length === 0) {
    console.log('⚠️  No markdown files found in /content directory');
    console.log('   Create .md files in /content/ to get started\n');
    process.exit(0);
  }
  
  console.log(`Found ${markdownFiles.length} markdown file(s)\n`);
  
  const results = markdownFiles
    .map(processMarkdownFile)
    .filter(Boolean);
  
  console.log(`\n✅ Built ${results.length} page(s) successfully`);
  
  // Output manifest for reference
  const manifest = results.map(r => ({
    title: r.title,
    permalink: r.permalink
  }));
  
  const manifestPath = path.join(OUTPUT_DIR, '.pages-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📋 Page manifest: .pages-manifest.json\n`);
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
