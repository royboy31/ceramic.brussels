#!/usr/bin/env node
/**
 * Every date in the dataset, checked for one a page cannot read.
 *
 * On 2026-09-30 a robot token wrote "2024-01-23T18:00 (fr):00.000Z" onto a
 * 2024 programme event - a language marker spliced into an ISO string. It
 * passed the queries' `defined(startsAt)` and then threw `RangeError:
 * Invalid time value` out of `formatTime`. `astro build` renders pages one
 * after another, so that one value stopped the build on
 * /en/editions/2024/ and every page after it: 7 files where a good build
 * writes 774. Cloudflare deploys nothing from a failed build and keeps
 * serving the last good one, so for several hours nothing an editor
 * published could reach the site, with no sign of it anywhere an editor
 * could see.
 *
 * `readable()` in src/lib/i18n.ts means a value like that can never cost the
 * site its build again - the page prints nothing for it and goes out. This
 * is the other half: it makes the value *visible*, because a date that
 * silently stops printing is its own quiet bug.
 *
 *   node scripts/check-dates.mjs           report
 *   node scripts/check-dates.mjs --strict  exit 1 when anything is corrupt
 *   node scripts/check-dates.mjs --fix     repair what is unambiguous
 *
 * `--fix` only ever removes an injected "(xx)" marker from a value that is a
 * valid date once it is gone. Anything else is reported and left alone: a
 * date nobody can reconstruct is the editors' to retype, not a script's to
 * guess. Every touched document is backed up to legacy-export/backups first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const STRICT = process.argv.includes('--strict');
const FIX = process.argv.includes('--fix');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: FIX ? env.SANITY_API_WRITE_TOKEN : env.SANITY_VIEWER_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/** The fields the schemas hold dates in, and anything already shaped like one. */
const DATE_KEY = /^(startsAt|endsAt|startDate|endDate|publishedAt|date|deadline)$/;
const ISOish = /^\d{4}-\d{2}-\d{2}[T ]/;
/** " (fr)", " (nl)", " (en)" spliced into a value that is otherwise a date. */
const MARKER = /\s*\((?:fr|nl|en)\)/gi;

const readable = (value) => !Number.isNaN(new Date(value).getTime());

/** Walks a document and yields every string sitting where a date belongs. */
function* dates(node, trail = []) {
  if (node == null) return;
  if (typeof node === 'string') {
    if (DATE_KEY.test(String(trail[trail.length - 1])) || ISOish.test(node)) yield { path: trail, value: node };
    return;
  }
  if (Array.isArray(node)) { for (const [i, v] of node.entries()) yield* dates(v, [...trail, i]); return; }
  if (typeof node === 'object') for (const [k, v] of Object.entries(node)) yield* dates(v, [...trail, k]);
}

/** Sanity patch syntax: a.b[2].c */
const patchPath = (trail) =>
  trail.reduce((s, part) => (typeof part === 'number' ? `${s}[${part}]` : s ? `${s}.${part}` : String(part)), '');

const docs = [];
for (let last = ''; ; ) {
  const batch = await client.fetch(`*[_id > $last] | order(_id) [0...500]`, { last });
  if (!batch.length) break;
  docs.push(...batch);
  last = batch[batch.length - 1]._id;
  if (batch.length < 500) break;
}

const broken = [];
for (const doc of docs)
  for (const { path: trail, value } of dates(doc)) {
    if (readable(value)) continue;
    const stripped = value.replace(MARKER, '');
    broken.push({
      id: doc._id,
      type: doc._type,
      field: patchPath(trail),
      value,
      repair: stripped !== value && readable(stripped) ? stripped : null,
    });
  }

console.log(`[check-dates] ${docs.length} documents, ${broken.length} unreadable date(s)`);
for (const b of broken)
  console.log(
    `  ${b.type} ${b.id}\n     ${b.field} = ${JSON.stringify(b.value)}` +
      (b.repair ? `\n     → ${JSON.stringify(b.repair)}` : `\n     → cannot be repaired without guessing; retype it in the Studio`),
  );

const repairable = broken.filter((b) => b.repair);
if (FIX && repairable.length) {
  const dir = path.join(ROOT, 'legacy-export', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `dates-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(docs.filter((d) => repairable.some((b) => b.id === d._id)), null, 2));
  console.log(`\n[check-dates] backup: ${path.relative(ROOT, file)}`);

  let tx = client.transaction();
  for (const b of repairable) tx = tx.patch(b.id, (p) => p.set({ [b.field]: b.repair }));
  await tx.commit();
  console.log(`[check-dates] repaired ${repairable.length} value(s)`);
} else if (!FIX && repairable.length) {
  console.log(`\n[check-dates] ${repairable.length} repairable - re-run with --fix`);
}

if (STRICT && broken.length) process.exit(1);
