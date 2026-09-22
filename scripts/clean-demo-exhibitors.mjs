#!/usr/bin/env node
/**
 * Removes the `demo-exhibitor-2027-*` records seeded from the design mock-up
 * before the old site was imported (client feedback, 2026-09-22: "the ones
 * listed under 2027 aren't the exhibitors for that edition"). They are copies
 * of real 2026 galleries, so re-dating them makes duplicates - two of them
 * already were (AIFA, Al-Tiba9).
 *
 * What it does, in one transaction:
 *
 * - moves the artist references the demo records carry onto the imported
 *   2026 record of the same gallery, which the import left without artists
 *   (Frédérique Fleury → ANALORA, Heidi Bjørgan → Format Oslo, and so on),
 *   so those artists keep a gallery for the A–Z list to link to;
 * - re-points the 2026 "best booth" award (`demo-award-2026-8`) from the
 *   demo Galerie Bernard Jordan to Galerie Judith Andreae, the winner the
 *   old site names ("Galerie Judith Andreae (DE) won the best booth 2026
 *   with works by Janis Löhrer");
 * - deletes the demo records. Not "Marie Pic — jury prize 2026 solo show":
 *   the 2026 winner's solo show at the 2027 fair is a real entry the old
 *   CMS never had.
 *
 * A demo record is only deleted when nothing references it any more, so a
 * reference this script does not know about stops it rather than being lost.
 *
 *   node scripts/clean-demo-exhibitors.mjs --dry
 *   node scripts/clean-demo-exhibitors.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

/** The one demo record that is real content. */
const KEEP = new Set(['demo-exhibitor-2027-marie-pic-jury-prize-2026-solo-show']);

/** demo record → the imported 2026 record its artists belong on. */
const ARTISTS_TO = {
  'demo-exhibitor-2027-analora': 'exhibitor-2026-analora',
  'demo-exhibitor-2027-al-tiba9-gallery': 'exhibitor-2026-al-tiba9-gallery',
  'demo-exhibitor-2027-chaxartxrtm': 'exhibitor-2026-chaxartxrtm',
  'demo-exhibitor-2027-format-oslo': 'exhibitor-2026-format-oslo',
  'demo-exhibitor-2027-galerie-bernard-jordan': 'exhibitor-2026-bernard-jordan-gallery',
};

/** award → the exhibitor its `winnerExhibitor` must point at instead of a demo record. */
const AWARD_WINNER = { 'demo-award-2026-8': 'exhibitor-2026-galerie-judith-andreae' };

const log = (...a) => console.log(dry ? '[dry]' : '[apply]', ...a);

async function main() {
  const demos = await client.fetch(
    `*[_type == "exhibitor" && _id match "demo-exhibitor-*"]{
      _id, name, "year": edition->year, "slug": slug.current,
      "artists": artists[]{ _key, _ref },
      "refs": *[references(^._id)]{ _id, _type }
    } | order(name asc)`,
  );
  const targets = await client.fetch(`*[_id in $ids]{ _id, name, "year": edition->year, "artists": artists[]._ref }`, {
    ids: [...Object.values(ARTISTS_TO), ...Object.values(AWARD_WINNER)],
  });
  const target = (id) => targets.find((t) => t._id === id);
  for (const id of [...Object.values(ARTISTS_TO), ...Object.values(AWARD_WINNER)]) {
    if (!target(id)) throw new Error(`target ${id} does not exist`);
  }

  const tx = client.transaction();
  let changes = 0;
  const problems = [];

  // 1. Artists onto the real records.
  for (const [from, to] of Object.entries(ARTISTS_TO)) {
    const demo = demos.find((d) => d._id === from);
    if (!demo) continue;
    const have = new Set(target(to).artists ?? []);
    const add = (demo.artists ?? []).filter((a) => !have.has(a._ref));
    if (add.length === 0) continue;
    log(`artists  ${from} → ${to} (${target(to).name}, ${target(to).year}): ${add.map((a) => a._ref).join(', ')}`);
    tx.patch(to, (p) => p.setIfMissing({ artists: [] }).append('artists', add.map((a) => ({ _key: a._key ?? a._ref.slice(-8), _type: 'reference', _ref: a._ref }))));
    changes++;
  }

  // 2. The award onto the real winner.
  for (const [award, winner] of Object.entries(AWARD_WINNER)) {
    log(`award    ${award}.winnerExhibitor → ${winner} (${target(winner).name}, ${target(winner).year})`);
    tx.patch(award, (p) => p.set({ winnerExhibitor: { _type: 'reference', _ref: winner } }));
    changes++;
  }

  // 3. Delete the demo records nothing else points at.
  for (const demo of demos) {
    if (KEEP.has(demo._id)) {
      log(`keep     ${demo._id} (${demo.name}, ${demo.year}) - real content`);
      continue;
    }
    const blocking = demo.refs.filter((r) => !(r._id in AWARD_WINNER) && !r._id.startsWith('demo-exhibitor-'));
    if (blocking.length) {
      problems.push(`${demo._id} is referenced by ${blocking.map((r) => `${r._type} ${r._id}`).join(', ')}`);
      continue;
    }
    log(`delete   ${demo._id} (${demo.name}, ${demo.year}, /${demo.slug})`);
    tx.delete(demo._id);
    tx.delete(`drafts.${demo._id}`);
    changes++;
  }

  if (problems.length) {
    console.error('\nNot run - references this script does not know about:');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  if (!changes) return console.log('Nothing to do.');
  if (dry) return console.log(`\n${changes} change(s) planned. Run without --dry to apply.`);
  const result = await tx.commit();
  console.log(`\nApplied ${changes} change(s): transaction ${result.transactionId}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
