/**
 * The 2027 galleries' bios in French and Dutch.
 *
 * Tiphaine, 2026-10-27: *"We have put the 2027 exhibitors in the cms. Could
 * you translate the pages in French and Dutch and do the switch on the website
 * so that the 2027 galleries now appear?"* This does the first half. The
 * switch is `showExhibitors` on the 2027 edition, an editor's tick, and it is
 * not this script's business - see docs/exhibitors-2027-switch.md for why the
 * two are one decision.
 *
 * `bio` is a `localeBlock`: portable text per locale. A translation therefore
 * has to be written as blocks, not as a string, and it has to mirror the
 * English block for block - same count, same `style` - or the page renders a
 * different shape in one language than in another. None of the 61 English
 * bios carries a link (`markDefs` is empty across all of them), so every block
 * is one span of plain text and nothing has to be re-anchored.
 *
 * **It only ever fills a blank.** A locale that already holds text is left
 * exactly as it is, re-checked against the live dataset at write time rather
 * than trusted from the file, so a re-run after an editor has corrected
 * something cannot overwrite them.
 *
 * Writing is one transaction. The publish webhook rebuilds production on every
 * mutation, and these 63 records alone fired 53 builds on 2026-10-27; one
 * transaction is the cheapest way to keep that down without turning the
 * webhook off by hand. The writes are invisible on www either way: 2027 is
 * `isCurrent` with `showExhibitors` false, so `EXHIBITOR_SHOWN` excludes every
 * one of these records until the tick.
 *
 *   node scripts/fill-2027-exhibitor-bios.mjs            # plan, writes nothing
 *   node scripts/fill-2027-exhibitor-bios.mjs --apply    # write
 *
 * Run `npm run dates` afterwards, as after any script that writes.
 */
import crypto from 'node:crypto';
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

const APPLY = process.argv.includes('--apply');
const SOURCE = process.argv.find((a) => a.startsWith('--source='))?.slice(9);
if (!SOURCE) {
  console.error('need --source=<translations.json>');
  process.exit(1);
}

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const key = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
const text = (blocks) =>
  !Array.isArray(blocks) ? '' : blocks.map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')).join('');

/** A translated paragraph becomes one block, wearing the English block's style. */
const toBlocks = (paras, enBlocks) =>
  paras.map((t, i) => ({
    _type: 'block',
    _key: key(),
    style: enBlocks[i]?.style ?? 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text: t, marks: [] }],
  }));

const translations = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

const live = await client.fetch(
  `*[_type == "exhibitor" && edition->year == 2027 && !(_id in path("drafts.**"))] | order(name asc){_id, name, bio}`,
);

const byName = new Map(live.map((e) => [e.name.trim(), e]));
const plan = [];
const skipped = [];

for (const t of Object.values(translations)) {
  const doc = byName.get(t.name.trim());
  if (!doc) {
    skipped.push(`${t.name}: no published 2027 record`);
    continue;
  }
  const en = doc.bio?.en;
  if (!Array.isArray(en) || !text(en).trim()) {
    skipped.push(`${t.name}: no English bio to mirror`);
    continue;
  }
  for (const loc of ['fr', 'nl']) {
    if (!t[loc]) continue;
    // The live value decides, not the file: an editor may have filled it since.
    if (text(doc.bio?.[loc]).trim()) {
      skipped.push(`${t.name} ${loc}: already filled, left alone`);
      continue;
    }
    if (t[loc].length !== en.length) {
      skipped.push(`${t.name} ${loc}: ${t[loc].length} paragraphs against ${en.length} English - NOT written`);
      continue;
    }
    plan.push({ id: doc._id, name: doc.name, loc, blocks: toBlocks(t[loc], en) });
  }
}

console.log(`2027 galleries published: ${live.length}`);
console.log(`to write: ${plan.length}  (fr ${plan.filter((p) => p.loc === 'fr').length}, nl ${plan.filter((p) => p.loc === 'nl').length})`);
for (const s of skipped) console.log(`  - ${s}`);

if (!APPLY) {
  console.log('\nplan only; pass --apply to write');
  process.exit(0);
}

const tx = plan.reduce(
  (t, p) => t.patch(p.id, (patch) => patch.setIfMissing({ bio: { _type: 'localeBlock' } }).set({ [`bio.${p.loc}`]: p.blocks })),
  client.transaction(),
);

await tx.commit();
console.log(`\nwritten in one transaction: ${plan.length} locale bios`);

const after = await client.fetch(
  `*[_type == "exhibitor" && edition->year == 2027 && !(_id in path("drafts.**"))]{"fr": defined(bio.fr), "nl": defined(bio.nl)}`,
);
console.log(`now filled: fr ${after.filter((a) => a.fr).length}/${after.length}, nl ${after.filter((a) => a.nl).length}/${after.length}`);
