#!/usr/bin/env node
/**
 * The Studio clean-up of 2026-09-11, agreed with Kamindu: demo leftovers,
 * duplicate records and wrong images out, one transaction. Dry run by
 * default; `--apply` writes.
 *
 * Every document it deletes or patches is saved first, whole and with its
 * draft, to legacy-export/backups/studio-cleanup-2026-09-11.json - restore
 * one by creating it again from that file (`sanity documents create`, or a
 * createOrReplace mutation).
 *
 * What it does, and why:
 * - Deletes the four press clippings the seed invented (real outlet names,
 *   made-up articles), the two "[SAMPLE — safe to delete]" drafts, a
 *   test document of a type that no longer exists, and the programme "awards"
 *   tab page - that pill links to the art prize, so the page never shows.
 * - Deletes the "public opening" events: they are opening hours, one per
 *   day, and are on the visitors info page already. None is on the site.
 * - Deletes the second copy of each 2024 event the import made twice (the
 *   old site listed them once per language page; the copies are identical).
 * - Merges Modern Shapes' two 2025 records into one: the old site listed
 *   the gallery once, "B17 and B26". The fuller record keeps its text and
 *   gains the other's images.
 * - Removes the images on three 2027 laureates. The old site's blocks for
 *   them were copied from the 2026 laureates, images included, so their
 *   cards showed other artists' work; with none, the card shows the
 *   artist's own picture.
 * - Clears the three empty starter blocks from the Exhibitors page, which
 *   showed as bare headings under the exhibitor list.
 *
 *   node scripts/studio-cleanup.mjs           plan and back up, write nothing
 *   node scripts/studio-cleanup.mjs --apply   write, in one transaction
 *
 * Turn the Sanity webhook off first: a transaction still fires it once per
 * document, and each would queue a production build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const BACKUP = path.resolve('legacy-export/backups/studio-cleanup-2026-09-11.json');

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

const DELETE = [
  // demo leftovers
  'demo-press-1',
  'demo-press-2',
  'demo-press-3',
  'demo-press-4',
  'sample-exhibitor-gallery',
  'sample-page-art-prize',
  'piece-test-stoneware-vase',
  'demo-page-programme-awards',
  // "public opening": opening hours, not events
  ...[61, 62, 63, 76, 77, 78].map((n) => `event-2024-public-opening-${n}`),
  ...[29, 38, 42, 47].map((n) => `event-2025-public-opening-${n}`),
  ...[12, 20, 25, 3, 80, 81, 82, 83, 84].map((n) => `event-2027-public-opening-${n}`),
  // the second copy of each 2024 event the import made twice
  'event-2024-ceramique-au-xxieme-siecle-defis-et-perspective-par-mad-brus-74',
  'event-2024-ceramique-et-transmission-71',
  'event-2024-entretien-avec-johan-creten-69',
  'event-2024-gesprek-met-carolein-smit-72',
  'event-2024-het-materiaal-wijst-de-weg-een-gesprek-over-klei-en-verbindi-73',
  'event-2024-la-ceramique-une-passion-partagee-qu-est-ce-qui-relie-la-fas-75',
  'event-2024-le-marche-de-la-ceramique-reappropriation-d-une-pratique-ou--70',
  'event-2024-preview-65',
  'event-2024-public-late-opening-67',
  'event-2024-vernissage-66',
  // merged into exhibitor-2025-modern-shapes-2 below
  'exhibitor-2025-modern-shapes',
];

const MODERN_KEEP = 'exhibitor-2025-modern-shapes-2';
const MODERN_DROP = 'exhibitor-2025-modern-shapes';
const LAUREATES = ['laureate-2027-daria-kowalewska', 'laureate-2027-jules-bouteleux', 'laureate-2027-sojeong-you'];
const MAIN_EXHIBITORS = 'main-exhibitors';

const withDrafts = (ids) => ids.flatMap((id) => [id, `drafts.${id}`]);
const touched = [...DELETE, MODERN_KEEP, ...LAUREATES, MAIN_EXHIBITORS];

const docs = await client.fetch(`*[_id in $ids]`, { ids: withDrafts(touched) });
const byId = Object.fromEntries(docs.map((d) => [d._id, d]));

// Nothing outside the deletion list may point at what is deleted: a strong
// reference would fail the whole transaction, a weak one would dangle.
const refs = await client.fetch(`*[references($ids) && !(_id in $ids)]{ _id, _type }`, { ids: withDrafts(DELETE) });
const blocking = refs.filter((r) => !r._id.startsWith('sanity.'));
if (blocking.length) {
  console.error('Referenced by documents outside the list, stopping:', blocking);
  process.exit(1);
}

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), documents: docs }, null, 1));
console.log(`backup: ${docs.length} documents -> ${path.relative(process.cwd(), BACKUP)}`);

const tx = client.transaction();

const deletions = withDrafts(DELETE).filter((id) => byId[id]);
for (const id of deletions) tx.delete(id);
console.log(`delete ${deletions.length}: ${deletions.join(', ')}`);

// Modern Shapes: one record, both booths, every image once.
const keep = byId[MODERN_KEEP];
const drop = byId[MODERN_DROP];
if (keep && drop) {
  const seen = new Set((keep.images ?? []).map((i) => i.asset?._ref));
  const extra = (drop.images ?? [])
    .filter((i) => i.asset?._ref && !seen.has(i.asset._ref))
    .map((i, n) => ({ ...i, _key: `merged${n}${i._key ?? ''}`.slice(0, 32) }));
  tx.patch(MODERN_KEEP, (p) => p.set({ booth: 'B17 and B26' }).setIfMissing({ images: [] }).append('images', extra));
  console.log(`patch ${MODERN_KEEP}: booth "B17 and B26", +${extra.length} images from ${MODERN_DROP}`);
}

for (const id of withDrafts(LAUREATES).filter((id) => byId[id]?.images?.length)) {
  tx.patch(id, (p) => p.unset(['images']));
  console.log(`patch ${id}: remove ${byId[id].images.length} images`);
}

for (const id of withDrafts([MAIN_EXHIBITORS]).filter((id) => byId[id]?.sections?.length)) {
  const empty = byId[id].sections.every((s) => s._type === 'contentSection' && !s.body && !(s.images ?? []).length && !(s.links ?? []).length);
  if (!empty) {
    console.log(`skip ${id}: its blocks have content now`);
    continue;
  }
  tx.patch(id, (p) => p.unset(['sections']));
  console.log(`patch ${id}: remove ${byId[id].sections.length} empty blocks`);
}

if (!APPLY) {
  console.log('\ndry run - nothing written. Add --apply to write.');
  process.exit(0);
}
const result = await tx.commit({ visibility: 'sync' });
console.log(`\nwritten: transaction ${result.transactionId}, ${result.results.length} mutations`);
