/**
 * Lower the built CSS to classic syntax for older phones.
 *
 * Astro's CSS pipeline re-prints every stylesheet through Lightning CSS
 * without browser targets, which "modernises" `(max-width: 700px)` into the
 * range syntax `(width<=700px)` - parsed by iOS Safari only from 16.4. On an
 * older iPhone every such media query is silently invalid, so the phone gets
 * no mobile layout at all: padded images, desktop sizes ("web simulator is
 * fine, actual phone doesn't" - Gilles and Kamindu, 2026-10-03). Neither
 * `build.cssTarget` nor `css.lightningcss.targets` reaches that re-print, so
 * this runs right after `astro build` and transforms every emitted
 * stylesheet with explicit targets.
 *
 * A changed stylesheet is also RENAMED (new content hash) and every
 * reference to it across dist is rewritten: public/_headers marks /_astro/*
 * immutable, so a browser that has the old file never refetches the same
 * name - the content must move to a new one. Runs before pages-worker, so
 * on a PREVIEW_RUNTIME build the Worker's own bundles are still in dist and
 * get the same rewrite.
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

const dir = path.join(DIST, '_astro');
if (!fs.existsSync(dir)) {
  console.error('[lower-css] dist/_astro missing - run right after astro build');
  process.exit(1);
}

/** Base64url content hash, 8 chars, the shape Astro's own names use. */
const hashOf = (buf) => crypto.createHash('sha256').update(buf).digest('base64url').slice(0, 8);

const renames = new Map(); // old file name -> new file name
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.css')) continue;
  const file = path.join(dir, name);
  const before = fs.readFileSync(file);
  const { code } = transform({ filename: name, code: before, minify: true, targets: TARGETS });
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
let rewritten = 0;
const walk = (d) => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (TEXT.has(path.extname(entry.name))) {
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
        rewritten++;
      }
    }
  }
};
if (renames.size) walk(DIST);

// The guards this script exists for: no modern range syntax may ship, and no
// reference to a replaced name may remain.
const leftoverSyntax = fs
  .readdirSync(dir)
  .filter((n) => n.endsWith('.css'))
  .filter((n) => /\(\s*width\s*[<>]/.test(fs.readFileSync(path.join(dir, n), 'utf8')));
if (leftoverSyntax.length) {
  console.error(`[lower-css] range syntax still in: ${leftoverSyntax.join(', ')}`);
  process.exit(1);
}

console.log(`[lower-css] ${renames.size} stylesheet(s) lowered for safari >= 15, ${rewritten} file(s) repointed`);
