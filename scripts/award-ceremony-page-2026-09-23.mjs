#!/usr/bin/env node
/**
 * The award ceremony tab (/programme/awards) draws a slideshow on the left
 * of the ceremony from its page document's Images - and there was no such
 * page, so the left half stood empty. This creates it: a `page` in the
 * programme section with the English slug `awards` (what getHubPages and
 * the tab match on), the tab's French and Dutch words as the other slugs,
 * and three photos from the 2026 fair as its Images (Lilanga, 2026-09-23:
 * "if the client doesn't like them we can change them later" - an editor
 * swaps them in the Studio, Programme -> Tab intros).
 *
 * Deterministic id, so a re-run corrects rather than duplicates; Sanity keys
 * assets by content, so a re-run uploads nothing new. Refuses to run over an
 * existing page for that tab, or over a draft of this one.
 *
 *   node scripts/award-ceremony-page-2026-09-23.mjs              plan, write nothing
 *   node scripts/award-ceremony-page-2026-09-23.mjs --apply      upload and publish
 *   --env=<file>                                                 read the token from another .env
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.slice(6) ?? '.env';
const ID = 'page-programme-awards';
const DIR = 'screenshot/dd';

const PHOTOS = [
  {
    file: 'CB26_foire_@Martin_Pilette_Prod_79 1.png',
    alt: 'Visitors crowding the aisles of ceramic brussels 2026, under the hall’s steel roof.',
    credit: 'Martin Pilette',
  },
  {
    file: 'CB26_talks_voices_of_galleries_@Geoffrey_Fritsch_2 1.png',
    alt: 'Gallery owners in conversation on the talks stage at ceramic brussels 2026.',
    credit: 'Geoffrey Fritsch',
  },
  {
    file: 'Hox-brussels-new-location-nav 1n.png',
    alt: 'Winners on stage at the ceramic brussels 2026 awards ceremony.',
  },
];

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
if (APPLY && !env.SANITY_API_WRITE_TOKEN) throw new Error(`no SANITY_API_WRITE_TOKEN in ${ENV_FILE}`);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

for (const p of PHOTOS) {
  const f = path.join(DIR, p.file);
  if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  console.log(`photo  ${p.file}  (${Math.round(fs.statSync(f).size / 1024)} kB)${p.credit ? `  © ${p.credit}` : ''}`);
}

const others = await client.fetch(
  `*[_type == "page" && section == "programme" && slug.en.current == "awards" && !(_id in [$id, "drafts." + $id])]._id`,
  { id: ID },
);
if (others.length) throw new Error(`a page for the award ceremony tab already exists: ${others.join(', ')} - add the photos there instead`);
const draft = APPLY ? await client.getDocument(`drafts.${ID}`) : null;
if (draft) throw new Error(`drafts.${ID} exists - publish or discard it in the Studio first`);

console.log(`page   ${ID}  (programme / awards)`);
if (!APPLY) {
  console.log('dry run: nothing uploaded or written. Add --apply to write.');
  process.exit(0);
}

const images = [];
for (const [i, p] of PHOTOS.entries()) {
  const asset = await client.assets.upload('image', fs.createReadStream(path.join(DIR, p.file)), { filename: p.file });
  console.log(`uploaded ${p.file}: ${asset._id}`);
  images.push({
    _key: `awards${i}`,
    _type: 'figure',
    alt: p.alt,
    ...(p.credit ? { credit: p.credit } : {}),
    asset: { _type: 'reference', _ref: asset._id },
  });
}

const doc = await client.createOrReplace({
  _id: ID,
  _type: 'page',
  section: 'programme',
  order: 1,
  title: { _type: 'localeString', en: 'award ceremony', fr: 'remise des prix', nl: 'prijsuitreiking' },
  slug: {
    en: { _type: 'slug', current: 'awards' },
    fr: { _type: 'slug', current: 'remise-des-prix' },
    nl: { _type: 'slug', current: 'prijsuitreiking' },
  },
  images,
});
console.log(`written: ${doc._id} rev ${doc._rev}`);
