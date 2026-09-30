#!/usr/bin/env node
/**
 * Puts the VIP lounge's headings back on the design's own sizes.
 *
 * Two things had drifted:
 *
 * 1. "scenography by MAD Brussels" and "VIP aperitivos" carried a per-field
 *    Style of Display / Medium, set in the Studio while the headings were
 *    rendering at body size from a CSS bug of mine. The bug is fixed, so the
 *    override now *causes* the mismatch: Figma gives that heading 40px
 *    Semibold (node 982:1027, checked 2026-10-01), which is exactly what
 *    `.panel-title` carries. Clearing the style returns them to it.
 *
 * 2. "agenda" is a section title, and the frame rules it underneath at about
 *    40px semibold rather than over the top at 60px regular. That is the
 *    smaller of the two heading levels (`level`, pageBuilder.ts).
 *
 * Both the published document and its draft, so preview and the live site
 * agree. Backed up first.
 *
 *   node scripts/vip-lounge-headings.mjs           dry run
 *   node scripts/vip-lounge-headings.mjs --apply   write
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

const docs = await client.fetch(`*[_id in ["page-vip-lounge", "drafts.page-vip-lounge"]]{...}`);
if (!docs.length) {
  console.error('page-vip-lounge not found.');
  process.exit(1);
}

const plan = [];
for (const doc of docs) {
  doc.next = (doc.sections ?? []).map((b) => {
    const label = b?.heading?.en ?? b?.title?.en ?? '(untitled)';
    let out = b;
    // 1. a Style on the heading, where the design has none
    for (const field of ['heading', 'title']) {
      if (out?.[field]?.style) {
        const { style, ...rest } = out[field];
        out = { ...out, [field]: rest };
        plan.push(`${doc._id}  "${label}"  clear ${field} Style ${JSON.stringify(style.size ?? '')}/${JSON.stringify(style.weight ?? '')}`);
      }
    }
    // 2. "agenda" is the smaller level
    if (out?._type === 'headingSection' && String(out.title?.en ?? '').trim().toLowerCase() === 'agenda' && out.level !== 'subgroup') {
      out = { ...out, level: 'subgroup' };
      plan.push(`${doc._id}  "${label}"  level ${out.level === 'subgroup' ? '→ subgroup' : ''}`);
    }
    return out;
  });
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
const file = path.join(dir, `vip-lounge-headings-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(docs.map(({ next, ...d }) => d), null, 2));
console.log(`\nbackup: ${path.relative(ROOT, file)}`);

let tx = client.transaction();
for (const doc of docs) tx = tx.patch(doc._id, (p) => p.set({ sections: doc.next }));
await tx.commit();
console.log('written.');
