/**
 * Lower the built CSS to classic syntax for older phones.
 *
 * Astro's CSS pipeline re-prints every stylesheet through Lightning CSS
 * without browser targets, which "modernises" `(max-width: 700px)` into the
 * range syntax `(width<=700px)` - parsed by iOS Safari only from 16.4. On an
 * older iPhone every such media query is silently invalid, so the phone gets
 * no mobile layout at all: padded images, desktop sizes ("web simulator is
 * fine, actual phone doesn't" - Gilles and Kamindu, 2026-10-03). Neither
 * `build.cssTarget` nor `css.lightningcss.targets` reaches that re-print,
 * so this lowers the emitted CSS with explicit targets after the fact - in
 * BOTH places it ships:
 *
 * - the hashed files in dist/_astro. A changed file is RENAMED (new content
 *   hash) and every reference across dist rewritten: public/_headers marks
 *   /_astro/* immutable, so a browser that has the old file never refetches
 *   the same name - the content must move to a new one.
 * - the <style> blocks Astro inlines into each page's HTML (small sheets
 *   are inlined by default, which is where most component styles land).
 *
 * Runs AFTER pages-worker, which is what puts _astro at the dist root on a
 * PREVIEW_RUNTIME build (before it, the adapter keeps assets in a subdir
 * and this script found nothing - the 2026-10-03 a4b5b50 deploy failure).
 * The Worker's server-rendered /preview/* pages keep the modern syntax
 * inside the JS bundle; previews are an editors' tool on current browsers.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'lightningcss';

const DIST = path.resolve('dist');
// Lightning CSS's own version encoding: major << 16 | minor << 8. Explicit
// numbers, not browserslistToTargets - a wrong browser name there returns
// {} silently and nothing lowers.
const TARGETS = { chrome: 90 << 16, firefox: 90 << 16, safari: 15 << 16, ios_saf: 15 << 16 };
const RANGE = /\(\s*width\s*[<>]/;

const lower = (css, name) =>
  transform({ filename: name, code: Buffer.isBuffer(css) ? css : Buffer.from(css), minify: true, targets: TARGETS }).code;

const dir = path.join(DIST, '_astro');
if (!fs.existsSync(dir)) {
  console.error('[lower-css] dist/_astro missing - run after pages-worker');
  process.exit(1);
}

/** Base64url content hash, 8 chars, the shape Astro's own names use. */
const hashOf = (buf) => crypto.createHash('sha256').update(buf).digest('base64url').slice(0, 8);

// ------------------------------------------------- the hashed stylesheets
const renames = new Map(); // old file name -> new file name
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.css')) continue;
  const file = path.join(dir, name);
  const before = fs.readFileSync(file);
  const code = lower(before, name);
  if (Buffer.compare(code, before) === 0) continue;
  const stem = name.replace(/\.[^.]+\.css$/, '');
  const fresh = `${stem}.${hashOf(code)}.css`;
  fs.writeFileSync(path.join(dir, fresh), code);
  fs.unlinkSync(file);
  renames.set(name, fresh);
}

// Rewrite every reference to a renamed stylesheet, in any text file of the
// build - page HTML, other CSS, and the server bundles a preview build holds.
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.txt', '.xml']);
let repointed = 0;
const htmlFiles = [];
const walk = (d) => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) walk(p);
    else {
      const ext = path.extname(entry.name);
      if (ext === '.html') htmlFiles.push(p);
      if (!TEXT.has(ext) || renames.size === 0) continue;
      let text = fs.readFileSync(p, 'utf8');
      let touched = false;
      for (const [oldName, newName] of renames) {
        if (text.includes(oldName)) {
          text = text.split(oldName).join(newName);
          touched = true;
        }
      }
      if (touched) {
        fs.writeFileSync(p, text);
        repointed++;
      }
    }
  }
};
walk(DIST);

// ------------------------------------------- the <style> blocks in pages
let inlined = 0;
for (const p of htmlFiles) {
  const html = fs.readFileSync(p, 'utf8');
  if (!RANGE.test(html)) continue;
  const out = html.replace(/(<style(?:\s[^>]*)?>)([\s\S]*?)(<\/style>)/gi, (whole, open, css, close) => {
    if (!RANGE.test(css)) return whole;
    return open + lower(css, path.basename(p)).toString() + close;
  });
  if (out !== html) {
    fs.writeFileSync(p, out);
    inlined++;
  }
}

// The guards this script exists for: no modern range syntax may ship in a
// stylesheet or a page, and no reference to a replaced name may remain.
const badCss = fs
  .readdirSync(dir)
  .filter((n) => n.endsWith('.css'))
  .filter((n) => RANGE.test(fs.readFileSync(path.join(dir, n), 'utf8')));
const badHtml = htmlFiles.filter((p) => {
  const html = fs.readFileSync(p, 'utf8');
  return /(<style(?:\s[^>]*)?>)([\s\S]*?)(<\/style>)/gi[Symbol.match]
    ? [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].some((m) => RANGE.test(m[1]))
    : false;
});
if (badCss.length || badHtml.length) {
  console.error(`[lower-css] range syntax still in: ${[...badCss, ...badHtml.slice(0, 5).map((p) => path.relative(DIST, p))].join(', ')}`);
  process.exit(1);
}

console.log(
  `[lower-css] ${renames.size} stylesheet(s) lowered and renamed, ${repointed} file(s) repointed, ${inlined} page(s) with inline styles lowered`,
);
