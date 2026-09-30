#!/usr/bin/env node
/**
 * Marks the VIP about tab's two inner headings as the smaller level.
 *
 * The frame sets "programme overview" over "at the fair" and "beyond the
 * fair" - two sizes, ruled differently. A `headingSection` had only one, so
 * once the page was built from blocks all three came out the same and
 * Léonie's 23 September note ("the « at the fair » and « beyond the fair »
 * titles should be bigger, same title style as the « food & drinks » ones")
 * quietly stopped holding. `level` is that second size; this sets it on the
 * two headings that had it in the design.
 *
 *   node scripts/vip-subgroup-titles.mjs           dry run
 *   node scripts/vip-subgroup-titles.mjs --apply   write
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

/** The frame's inner headings, by their English text. */
const INNER = ['at the fair', 'beyond the fair'];

const docs = await client.fetch(`*[_id in ["page-vip-about", "drafts.page-vip-about"]]{_id, sections}`);
const plan = [];
for (const doc of docs) {
  const sections = (doc.sections ?? []).map((b) => {
    if (b?._type !== 'headingSection') return b;
    const title = String(b.title?.en ?? '').trim().toLowerCase();
    const want = INNER.includes(title) ? 'subgroup' : 'group';
    if ((b.level ?? 'group') === want) return b;
    plan.push(`${doc._id}  "${b.title?.en}"  ${b.level ?? 'group'} → ${want}`);
    return { ...b, level: want };
  });
  doc.next = sections;
}
if (!plan.length) {
  console.log('Nothing to change.');
  process.exit(0);
}
for (const line of plan) console.log(' ', line);

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const dir = path.join(ROOT, 'legacy-export', 'backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `vip-subgroup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(docs.map(({ next, ...d }) => d), null, 2));
console.log(`\nbackup: ${path.relative(ROOT, file)}`);

let tx = client.transaction();
for (const doc of docs) tx = tx.patch(doc._id, (p) => p.set({ sections: doc.next }));
await tx.commit();
console.log('written.');
