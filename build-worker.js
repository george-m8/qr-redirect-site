#!/usr/bin/env node

/**
 * Build script for static-site-worker.js
 * Reads HTML partials from /partials directory and generates worker with embedded content
 * 
 * Usage: node build-worker.js
 */

const fs = require('fs');
const path = require('path');

const PARTIALS_DIR = path.join(__dirname, 'partials');
const WORKER_TEMPLATE = path.join(__dirname, 'static-site-worker.template.js');
const WORKER_OUTPUT = path.join(__dirname, 'static-site-worker.js');

console.log('🔨 Building static site worker...\n');

// Read all HTML files from partials directory
const partialFiles = fs.readdirSync(PARTIALS_DIR)
  .filter(file => file.endsWith('.html'))
  .sort();

if (partialFiles.length === 0) {
  console.error('❌ No HTML files found in /partials directory');
  process.exit(1);
}

// Build partials object
const partials = {};
partialFiles.forEach(file => {
  const name = file.replace('.html', '');
  const content = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf8');
  partials[name] = content;
  console.log(`  ✓ Loaded partial: ${name}`);
});

// Read worker template
const template = fs.readFileSync(WORKER_TEMPLATE, 'utf8');

// Replace {{PARTIALS}} placeholder with actual partials
const partialsCode = JSON.stringify(partials, null, 2);
const workerCode = template.replace('{{PARTIALS}}', partialsCode);

// Write output
fs.writeFileSync(WORKER_OUTPUT, workerCode, 'utf8');

console.log(`\n✅ Worker built successfully: ${WORKER_OUTPUT}`);
console.log(`📦 Included ${Object.keys(partials).length} partials`);
console.log('\nNext step: wrangler deploy');
