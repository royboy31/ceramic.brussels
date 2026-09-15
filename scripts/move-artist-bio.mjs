#!/usr/bin/env node
/**
 * An artist whose biography sits in the page sections instead of the
 * Biography field - Marion Verboom, seeded that way for the design - shows an
 * empty Biography in the Studio while the site prints one (feedback,
 * 2026-09-11). This moves the text block anchored "biography" into `bio` and
 * takes it out of the stack, on the published document and its draft, after
 * a backup. Only artists with no `bio` of their own are touched.
 *
 * Needs the code that reads `bio` first on the guest-of-honour page (same
 * day): with the older code, the next text block would take the biography's
 * place there. So run it only once that code is live where it matters.
 *
 *   node scripts/move-artist-bio.mjs           plan and back up, write nothing
 *   node scripts/move-artist-bio.mjs --apply   write, in one transaction
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const BACKUP = path.resolve('legacy-export/backups/move-artist-bio-2026-09-11.json');
const DEFAULT_HEADING = { en: 'biography', fr: 'biographie', nl: 'biografie' };

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

const docs = await client.fetch(
  `*[_type == "artist" && !defined(bio) && count(sections[_type == "contentSection" && anchor == "biography" && defined(body)]) > 0]`,
);

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), documents: docs }, null, 1));
console.log(`backup: ${docs.length} documents -> ${path.relative(process.cwd(), BACKUP)}`);

const tx = client.transaction();
for (const doc of docs) {
  const section = doc.sections.find((s) => s._type === 'contentSection' && s.anchor === 'biography' && s.body);
  const heading = section.heading ?? {};
  // The Biography field is drawn under the site's own "biography" label; say
  // so if the block's heading said something else, which would be lost.
  const odd = Object.entries(heading).filter(([l, v]) => l !== '_type' && v && v !== DEFAULT_HEADING[l]);
  if (odd.length) console.log(`  note ${doc._id}: heading ${JSON.stringify(Object.fromEntries(odd))} becomes the default label`);
  const { _key, ...body } = section.body;
  const langs = Object.keys(body).filter((k) => !k.startsWith('_'));
  console.log(`move ${doc._id} (${doc.name}): section ${section._key} -> bio [${langs.join(', ')}], ${doc.sections.length - 1} sections left`);
  tx.patch(doc._id, (p) => p.set({ bio: { _type: 'localeBlock', ...body } }).unset([`sections[_key=="${section._key}"]`]));
}

if (!APPLY) {
  console.log('\ndry run - nothing written. Add --apply to write.');
  process.exit(0);
}
if (!docs.length) process.exit(0);
const result = await tx.commit({ visibility: 'sync' });
console.log(`\nwritten: transaction ${result.transactionId}, ${result.results.length} mutations`);
