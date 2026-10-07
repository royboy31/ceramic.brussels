#!/usr/bin/env node
/**
 * Fills the alt text, caption and photo credit on a past edition's pictures.
 *
 * "For the photos & videos of the past editions, could you automatically add
 * the alt text and the title & credit of the photos, which are always the
 * same: either 'ceramic brussels 2025 @Geoffrey Fritsch' or 'ceramic brussels
 * 2024 @Geoffrey Fritsch'?" - Felicie, 2026-10-05.
 *
 * Every picture on an `edition` document of one of those years gets, where the
 * field is empty:
 *
 *   caption  ceramic brussels <year>
 *   credit   Geoffrey Fritsch
 *   alt      ceramic brussels <year>
 *
 * The caption line the site draws from those two is "ceramic brussels 2025 ©
 * Geoffrey Fritsch", which is the string she asked for. The credit is kept out
 * of `alt` on purpose: alt is read aloud in place of the picture, and a screen
 * reader announcing the photographer's name as the content of every image is
 * noise. Change ALT_WITH_CREDIT below if the client would rather have it.
 *
 * **Only empty fields are written.** A caption an editor typed is never
 * replaced, so this cannot undo anyone's work and is safe to re-run.
 *
 * It walks the whole document rather than a list of field names, so the photo
 * gallery, the overview pictures, the cover, the guest installation, the
 * country focus and the publication are all covered, and a figure field added
 * later is picked up without editing this file.
 *
 *   node scripts/edition-photo-credits.mjs                      dry run, prints a per-year table
 *   node scripts/edition-photo-credits.mjs --years=2024,2025,2026
 *   node scripts/edition-photo-credits.mjs --apply              write, in one transaction
 *
 * Turn the Sanity webhook off first: a transaction fires it once per document.
 * Run `npm run dates` afterwards, as after any script that writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
/** The two editions Felicie named. Widen with --years= when more are shot by the same photographer. */
const YEARS = (arg('years') ?? '2024,2025').split(',').map((y) => Number(y.trim())).filter(Boolean);
const CREDIT = arg('credit') ?? 'Geoffrey Fritsch';
const ALT_WITH_CREDIT = false;

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
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

if (!env.SANITY_API_WRITE_TOKEN && APPLY) {
  console.error('SANITY_API_WRITE_TOKEN is missing from .env - nothing written.');
  process.exit(1);
}

const empty = (v) => v == null || String(v).trim() === '';

/**
 * Every figure in the document, with the JSONMatch path that patches it.
 * Array members are addressed by `_key`, never by index: an editor reordering
 * the gallery between the read and the write would otherwise move the patch
 * onto a different picture.
 */
function figures(node, trail, found) {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === 'object' && item._key) figures(item, `${trail}[_key=="${item._key}"]`, found);
    }
    return found;
  }
  if (!node || typeof node !== 'object') return found;
  if (node._type === 'figure' && node.asset) found.push({ path: trail, figure: node });
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_') || key === 'asset') continue;
    if (value && typeof value === 'object') figures(value, trail ? `${trail}.${key}` : key, found);
  }
  return found;
}

const editions = await client.fetch(`*[_type == "edition" && year in $years]| order(year asc)`, { years: YEARS });
if (!editions.length) {
  console.error(`No edition document for ${YEARS.join(', ')}.`);
  process.exit(1);
}

const patches = [];
const backup = [];
let pictures = 0;
let videos = 0;

for (const edition of editions) {
  const label = `ceramic brussels ${edition.year}`;
  const found = figures(edition, '', []);
  const set = {};
  let touched = 0;

  for (const { path: at, figure } of found) {
    pictures += 1;
    const fields = {};
    if (empty(figure.caption)) fields[`${at}.caption`] = label;
    if (empty(figure.credit)) fields[`${at}.credit`] = CREDIT;
    if (empty(figure.alt)) fields[`${at}.alt`] = ALT_WITH_CREDIT ? `${label} © ${CREDIT}` : label;
    if (Object.keys(fields).length) {
      touched += 1;
      Object.assign(set, fields);
      backup.push({
        _id: edition._id,
        path: at,
        before: { alt: figure.alt ?? null, caption: figure.caption ?? null, credit: figure.credit ?? null },
      });
    }
  }

  if (edition.film?.url) videos += 1;

  console.log(
    `${edition.year}: ${found.length} picture(s), ${touched} to fill, ${Object.keys(set).length} field(s)` +
      (edition.film?.url ? ' + 1 film' : ''),
  );
  if (Object.keys(set).length) patches.push({ id: edition._id, set });
}

console.log(`\n${pictures} picture(s) across ${editions.length} edition(s); ${videos} film(s) seen.`);
if (videos) {
  console.log(
    'Films carry a URL and a poster, not a caption: a film credit is a field the schema does not have yet.\n' +
      'Ask Felicie whether she wants one before adding it.',
  );
}

if (!patches.length) {
  console.log('Nothing to fill - every picture already has its alt, caption and credit.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = path.join(ROOT, 'legacy-export/backups', `edition-photo-credits-${stamp}.json`);

if (!APPLY) {
  console.log(`\nDry run. ${patches.length} document(s) would be patched. Re-run with --apply to write.`);
  console.log(`A sample of what would be set:`);
  for (const [key, value] of Object.entries(patches[0].set).slice(0, 6)) console.log(`  ${key} = ${JSON.stringify(value)}`);
  process.exit(0);
}

fs.writeFileSync(file, JSON.stringify(backup, null, 2));
console.log(`\nBacked up ${backup.length} picture(s) to ${path.relative(ROOT, file)}`);

/* Drafts take the same patch, so publishing one later does not drop the
   values - but only the drafts that exist. Patching an absent `drafts.<id>`
   is not a no-op: it fails the whole transaction, and with it the published
   documents that were fine (2026-10-05, demo-edition-2024 has no draft). */
const bareIds = patches.map(({ id }) => id.replace(/^drafts\./, ''));
const liveDrafts = new Set(
  await client.fetch(`*[_id in $ids]._id`, { ids: bareIds.map((id) => `drafts.${id}`) }),
);

const tx = patches.reduce((t, { id, set }) => {
  const bare = id.replace(/^drafts\./, '');
  const next = t.patch(bare, (p) => p.set(set));
  return liveDrafts.has(`drafts.${bare}`) ? next.patch(`drafts.${bare}`, (p) => p.set(set)) : next;
}, client.transaction());
console.log(`${liveDrafts.size} of ${bareIds.length} edition(s) have a draft; those get the patch too.`);

await tx.commit({ visibility: 'async' }).then(
  () => console.log(`Written: ${patches.length} edition(s).`),
  (error) => {
    console.error('Transaction failed, nothing written:', error.message);
    process.exit(1);
  },
);
