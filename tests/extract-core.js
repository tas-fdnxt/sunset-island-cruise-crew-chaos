// Pulls the pure logic module out of island.html so the suites can run headless.
// Usage: node tests/extract-core.js  (run from the repo root)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'island.html'), 'utf8');
const blocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
if (!blocks.length) { console.error('no script blocks found'); process.exit(1); }
const core = blocks[0].replace(/^<script>/, '').replace(/<\/script>$/, '');
if (core.indexOf('module.exports') === -1) { console.error('first block is not the core module'); process.exit(1); }
// The building suites run on a flat grid with no sea, so their fixtures stay simple. test-shore.js turns the sea back on.
fs.writeFileSync(path.join(__dirname, 'isle-core.js'), core + '\nif (typeof ISLE !== "undefined") ISLE.ALL_LAND = true;\n');
console.log('isle-core.js written,', core.length, 'chars');
