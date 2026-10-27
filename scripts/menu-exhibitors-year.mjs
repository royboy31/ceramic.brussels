/**
 * The year in the exhibitors menu label.
 *
 * The heading on every exhibitors page is the **menu label**, not the page
 * title: `ExhibitorHead` reads `getNavigation(lang)`, finds the item whose
 * route is `exhibitors`, and uses its label - appending a year only on a past
 * edition's tab, after stripping the one the label already carries. So when
 * the galleries on `/exhibitors` moved from 2026 to 2027 (showExhibitors on
 * the 2027 edition, 2026-10-28) the label went stale in three languages at
 * once, and the site showed "exhibitors 2026" over the 2027 list.
 *
 * The label is content, so it lives here rather than in code, and it has to
 * be moved by hand every time the landing year moves.
 *
 *   node scripts/menu-exhibitors-year.mjs             # report
 *   node scripts/menu-exhibitors-year.mjs --to=2027   # write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const to = process.argv.find((a) => a.startsWith('--to='))?.slice(5);

const nav = await client.fetch(`*[_type == "navigation"][0]{_id, items}`);
const idx = (nav.items ?? []).findIndex(
  (i) => i.route === 'exhibitors' || String(i.path ?? '').split('/').filter(Boolean).pop() === 'exhibitors',
);
if (idx < 0) {
  console.error('no exhibitors item in the menu');
  process.exit(1);
}

const item = nav.items[idx];
console.log(`${nav._id} item ${item._key}:`);
for (const loc of ['en', 'fr', 'nl']) console.log(`  ${loc}: ${JSON.stringify(item.label?.[loc] ?? null)}`);

if (!to) {
  console.log('\nreport only; pass --to=<year>');
  process.exit(0);
}
if (!/^\d{4}$/.test(to)) {
  console.error('--to wants four digits');
  process.exit(1);
}

const patch = {};
for (const loc of ['en', 'fr', 'nl']) {
  const cur = item.label?.[loc];
  if (typeof cur !== 'string' || !cur.trim()) continue;
  // Replace a trailing year, or append one where the label carries none.
  const next = /\d{4}\s*$/.test(cur) ? cur.replace(/\d{4}\s*$/, to) : `${cur.trim()} ${to}`;
  if (next !== cur) patch[`items[_key=="${item._key}"].label.${loc}`] = next;
}

if (!Object.keys(patch).length) {
  console.log('\nnothing to change');
  process.exit(0);
}

console.log('\nwriting:');
for (const [k, v] of Object.entries(patch)) console.log(`  ${k.split('.').pop()} -> ${JSON.stringify(v)}`);

await client.patch(nav._id).set(patch).commit();

const after = await client.fetch(
  `*[_type == "navigation"][0].items[_key == $key][0].label`,
  { key: item._key },
);
console.log('\nnow:', JSON.stringify(after));
