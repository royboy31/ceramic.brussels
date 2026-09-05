#!/usr/bin/env node
/**
 * After `astro build` with PREVIEW_RUNTIME=1: turn the Cloudflare adapter's
 * Workers-shaped output into what Cloudflare Pages expects.
 *
 * The adapter builds for Workers: static files in one directory, the Worker
 * in another, and a wrangler.json tying them together. Pages wants the
 * static files at the root of the output directory and the Worker as
 * `_worker.js` (a directory with an index.js is fine) beside them, and it
 * reads `_routes.json` to know which paths should reach the Worker at all.
 *
 * Only /preview and /api go to the Worker. Every other request is served as
 * a static file without a Worker invocation, so the published site is
 * exactly as fast and as cheap as it was before the preview existed.
 *
 * A no-op when PREVIEW_RUNTIME is not set, so `npm run build` is the same
 * command on every environment.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

if (process.env.PREVIEW_RUNTIME !== '1') {
  console.log('[pages-worker] PREVIEW_RUNTIME is off - static build, nothing to do');
  process.exit(0);
}

const wranglerJson = find(DIST, (name) => name === 'wrangler.json');
if (!wranglerJson) {
  console.error('[pages-worker] no wrangler.json under dist/ - did the Cloudflare adapter run?');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(wranglerJson, 'utf8'));
const serverDir = path.dirname(wranglerJson);
const main = path.resolve(serverDir, config.main ?? 'index.js');
const assetsDir = config.assets?.directory ? path.resolve(serverDir, config.assets.directory) : null;

console.log(`[pages-worker] worker entry ${rel(main)}`);
console.log(`[pages-worker] assets ${assetsDir ? rel(assetsDir) : '(none declared)'}`);

// 1. Static files to the root of dist/, if the adapter put them elsewhere.
if (assetsDir && path.resolve(assetsDir) !== DIST) {
  moveContents(assetsDir, DIST);
  fs.rmSync(assetsDir, { recursive: true, force: true });
}

// 2. The Worker to dist/_worker.js/, entry renamed to index.js.
const workerOut = path.join(DIST, '_worker.js');
fs.rmSync(workerOut, { recursive: true, force: true });
fs.mkdirSync(workerOut, { recursive: true });
moveContents(serverDir, workerOut);
if (path.basename(main) !== 'index.js') {
  fs.renameSync(path.join(workerOut, path.basename(main)), path.join(workerOut, 'index.js'));
}
// The adapter's wrangler.json is for `wrangler deploy`, which is not how this
// site ships; Pages would only be confused by it.
fs.rmSync(path.join(workerOut, 'wrangler.json'), { force: true });
// The adapter also copies `.dev.vars` (local secrets for `wrangler dev`) next
// to the Worker, and `.assetsignore` into the static files. Neither belongs in
// a deploy - the first one would publish a write token.
fs.rmSync(path.join(workerOut, '.dev.vars'), { force: true });
fs.rmSync(path.join(DIST, '.dev.vars'), { force: true });
fs.rmSync(path.join(DIST, '.assetsignore'), { force: true });
if (fs.existsSync(serverDir) && fs.readdirSync(serverDir).length === 0) fs.rmdirSync(serverDir);
// Whatever the server directory's parent was (dist/server/), drop it if empty.
const parent = path.dirname(serverDir);
if (parent !== DIST && fs.existsSync(parent) && fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);

// The adapter also leaves `.wrangler/deploy/config.json` in the project,
// redirecting wrangler to the wrangler.json this script just removed. Pages
// CI reads that redirect at deploy time and fails on the missing target.
fs.rmSync(path.resolve('.wrangler/deploy'), { recursive: true, force: true });

// 3. Route only the on-demand paths through the Worker.
fs.writeFileSync(
  path.join(DIST, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/preview', '/preview/*', '/api/*'], exclude: [] }, null, 2) + '\n',
);

console.log(`[pages-worker] wrote dist/_worker.js (${fs.readdirSync(workerOut).length} files) and dist/_routes.json`);

/* ---------- helpers ---------- */

function find(dir, match) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro' || entry.name === 'assets' || entry.name === 'node_modules') continue;
      const hit = find(full, match);
      if (hit) return hit;
    } else if (match(entry.name)) {
      return full;
    }
  }
  return null;
}

function moveContents(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory() && fs.existsSync(dest)) {
      moveContents(src, dest);
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      fs.rmSync(dest, { recursive: true, force: true });
      fs.renameSync(src, dest);
    }
  }
}

function rel(p) {
  return path.relative(process.cwd(), p).split(path.sep).join('/');
}
