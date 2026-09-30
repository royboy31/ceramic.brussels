#!/usr/bin/env node
/**
 * Moves the VIP hotel tab's "discover The Hoxton ↗" out of the page-builder
 * stack and into the page's own Buttons field.
 *
 * The seed put that pill in a links *block*, which the Studio lists above
 * Body - so the editor met the button before the text it belongs under - and
 * which the page rendered at the very foot, under the picture. `page.links`
 * (schema, `pageKinds.ts`, the PAGE projection) is the field for it: under
 * Body in the form, in the hotel column on the page.
 *
 *   node scripts/hotel-button-field.mjs           dry run
 *   node scripts/hotel-button-field.mjs --apply   write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
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

const ID = 'page-vip-hotel-deal';
const docs = await client.fetch(`*[_id in [$id, "drafts." + $id]]{_id, links, sections}`, { id: ID });
if (!docs.length) {
  console.error(`${ID} not found.`);
  process.exit(1);
}

const plan = [];
for (const doc of docs) {
  const blocks = doc.sections ?? [];
  const links = blocks.filter((b) => b?._type === 'linksSection').flatMap((b) => (b.links ?? []).filter(Boolean));
  const rest = blocks.filter((b) => b?._type !== 'linksSection');
  if (!links.length) {
    console.log(`${doc._id}: no links block, nothing to move`);
    continue;
  }
  if ((doc.links ?? []).length) {
    console.log(`${doc._id}: Buttons already filled, left alone`);
    continue;
  }
  plan.push({ id: doc._id, links, rest });
  console.log(`${doc._id}`);
  for (const l of links) console.log(`  → Buttons: ${l.label?.en ?? '(no label)'} ${l.external ?? l.path ?? ''}`);
  console.log(`  sections: ${blocks.length} → ${rest.length}`);
}

if (!plan.length || !APPLY) {
  if (plan.length) console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const dir = path.join(ROOT, 'legacy-export', 'backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `hotel-button-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(docs, null, 2));
console.log(`\nbackup: ${path.relative(ROOT, file)}`);

let tx = client.transaction();
for (const p of plan) tx = tx.patch(p.id, (patch) => patch.set({ links: p.links, sections: p.rest }));
await tx.commit();
console.log(`moved the pill on ${plan.length} document(s).`);
