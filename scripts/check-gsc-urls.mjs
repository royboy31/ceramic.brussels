#!/usr/bin/env node
/**
 * Roy's Search Console scrape against the redirect map (launch call,
 * 2026-10-01): takes a file of indexed legacy URLs, one per line (full
 * addresses or bare paths, blank lines and # comments ignored), and says
 * for each whether the built site answers it - a generated redirect rule
 * in dist/_redirects, or a page the build wrote at that very path.
 *
 *   npm run build                                     the rules are read from dist/
 *   node scripts/check-gsc-urls.mjs gsc-urls.txt      report; exits 1 if any URL is unanswered
 *
 * The unanswered list is what still needs a decision: an explicit rule in
 * scripts/legacy-redirects.mjs, or the agreed fallback to the homepage.
 */
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-gsc-urls.mjs <file with one URL per line>');
  process.exit(2);
}

const DIST = path.resolve('dist');
const redirects = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8');

/** Every rule's source path, splats kept as prefixes. */
const exact = new Set();
const splats = [];
for (const line of redirects.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [from] = t.split(/\s+/);
  if (!from?.startsWith('/')) continue;
  if (from.endsWith('/*')) splats.push(from.slice(0, -1));
  else {
    exact.add(from.replace(/\/+$/, '') || '/');
    // Pages matches the rule with and without the trailing slash.
    exact.add((from.replace(/\/+$/, '') || '') + '/');
  }
}

const normalise = (raw) => {
  let p = raw.trim();
  if (!p || p.startsWith('#')) return null;
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    return null;
  }
  p = p.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = '/' + p;
  return decodeURI(p);
};

const built = (p) => {
  const clean = p.replace(/^\/+|\/+$/g, '');
  return (
    fs.existsSync(path.join(DIST, clean, 'index.html')) ||
    (clean.endsWith('.html') && fs.existsSync(path.join(DIST, clean)))
  );
};

const answered = (p) => {
  const noSlash = p.replace(/\/+$/, '') || '/';
  if (exact.has(noSlash) || exact.has(noSlash + '/')) return 'rule';
  if (splats.some((s) => p.startsWith(s))) return 'splat';
  if (built(p)) return 'page';
  return null;
};

const urls = fs
  .readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map(normalise)
  .filter(Boolean);

const misses = [];
for (const p of urls) {
  const how = answered(p);
  if (!how) misses.push(p);
}

console.log(`[check-gsc-urls] ${urls.length} URLs, ${urls.length - misses.length} answered, ${misses.length} not`);
for (const m of misses) console.log('  MISS ' + m);
process.exit(misses.length ? 1 : 0);
