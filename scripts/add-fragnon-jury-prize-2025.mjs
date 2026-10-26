#!/usr/bin/env node
/**
 * The jury prize 2024 winner's page in the 2025 edition.
 *
 * "Add a jury prize 2024 filter, and add a « Damien Fragnon » page (Damien
 * Fragnon was the laureate of the jury prize). You can also use the yellow
 * « jury prize 2024 » logo on the photo on the main exhibitors page, as well
 * as on its individual page." (Léonie, 2026-10-26; request 19 of
 * docs/client-feedback-2026-10-26.md.)
 *
 * **Nothing in the code had to change for this.** The filter appears for any
 * year holding an exhibitor with `kind: "jury-prize"` and labels itself from
 * the edition ("jury prize 2024" on the 2025 list, `ExhibitorsListing.astro`);
 * `juryPrizeLockup` already resolves `/assets/exhibitors/jury-prize-2024.png`
 * for an exhibitor of 2025, because the prize is won the year before it is
 * shown. The exhibitors frame in Figma draws both the pill and this card, so
 * the only thing missing was the record.
 *
 * The shape follows `exhibitor-2026-leonore-chastagner`, the 2025 winner
 * exhibiting in 2026: named after the artist, the artist referenced, `kind`
 * jury-prize, no `soloShow` (the badge is driven by `kind`), no `sortName`.
 *
 * **The pictures are his own prize works, not 2025 stand photographs.** The
 * two taken from `laureate-2024-damien-fragnon` carry their real titles and
 * the photographer's credit ("Interconnexion aquatique # naturer de dune,
 * 2022, ©Elise Ortiou Campion"), so nothing here says something untrue - but
 * they are from the art prize, and the client should replace them with
 * pictures of the stand. A third laureate image is skipped: it is the same
 * asset as the artist's portrait. Booth, city and a description are not
 * invented; they are for the client to add.
 *
 * Deterministic `_id`, so a re-run corrects rather than duplicates, and one
 * delete undoes it.
 *
 * Usage:
 *   node scripts/add-fragnon-jury-prize-2025.mjs           # dry run
 *   node scripts/add-fragnon-jury-prize-2025.mjs --apply
 *
 * Run `npm run dates` afterwards (CLAUDE.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);

if (APPLY && !env.SANITY_API_WRITE_TOKEN) {
  console.error('no SANITY_API_WRITE_TOKEN in .env; --apply needs it.');
  process.exit(1);
}

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-05-03',
  token: APPLY ? env.SANITY_API_WRITE_TOKEN : undefined,
  useCdn: !APPLY,
});

const DOC_ID = 'exhibitor-2025-damien-fragnon';
const ARTIST_ID = 'artist-damien-fragnon';
const LAUREATE_ID = 'laureate-2024-damien-fragnon';

const [artist, laureate, edition, existing] = await Promise.all([
  client.fetch(`*[_id==$id][0]{_id, name, countryCode, "portraitRef": portrait.asset._ref}`, { id: ARTIST_ID }),
  client.fetch(`*[_id==$id][0]{_id, "images": images[]{..., "ref": asset._ref}}`, { id: LAUREATE_ID }),
  client.fetch(`*[_type=="edition" && year==2025][0]{_id, year}`),
  client.fetch(`*[_id==$id][0]{_id}`, { id: DOC_ID }),
]);

if (!artist) throw new Error(`${ARTIST_ID} not found`);
if (!edition) throw new Error('no 2025 edition');

/* His works, minus the frame that is also his portrait. Keys are stable so a
   re-run does not reshuffle the slideshow. */
const images = (laureate?.images ?? [])
  .filter((img) => img.ref && img.ref !== artist.portraitRef)
  .map((img, i) => ({
    _key: `fragnon${i}`,
    _type: 'figure',
    asset: { _type: 'reference', _ref: img.ref },
    ...(img.caption ? { caption: img.caption } : {}),
    ...(img.credit ? { credit: img.credit } : {}),
    ...(img.alt ? { alt: img.alt } : {}),
  }));

const doc = {
  _id: DOC_ID,
  _type: 'exhibitor',
  name: artist.name,
  slug: { _type: 'slug', current: 'damien-fragnon' },
  edition: { _type: 'reference', _ref: edition._id },
  kind: 'jury-prize',
  artists: [{ _key: 'artistref', _type: 'reference', _ref: artist._id }],
  ...(artist.countryCode ? { countryCode: artist.countryCode } : {}),
  ...(images.length ? { images } : {}),
};

console.log(`\n${existing ? 'REPLACE existing' : 'CREATE'} ${DOC_ID}`);
console.log(`  edition      : ${edition._id} (${edition.year})`);
console.log(`  kind         : jury-prize  ->  filter pill "jury prize 2024", badge jury-prize-2024.png`);
console.log(`  artists      : ${artist.name} (${artist._id})`);
console.log(`  countryCode  : ${artist.countryCode ?? '(none)'}`);
console.log(`  images       : ${images.length} from ${LAUREATE_ID}`);
for (const img of images) console.log(`     - ${img.caption ?? '(no caption)'}`);
console.log(`  booth/city/bio: not set - for the client`);
console.log('\nfull document:\n' + JSON.stringify(doc, null, 2));

if (!APPLY) {
  console.log('\nDRY RUN - nothing written. Re-run with --apply.');
  process.exit(0);
}

await client.createOrReplace(doc);
console.log(`\nWrote ${DOC_ID}.`);
console.log('Now run: npm run dates');
