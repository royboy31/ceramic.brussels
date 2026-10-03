// Unpublish the two collectors' voices stories (FÃ©licie, 2026-10-01:
// "Collector's Voices: set to hidden draft"). Copies each published document
// to its draft (so nothing is lost and editors can republish), then deletes
// the published one. Backs both up to legacy-export/backups/ first.
// Run from the project root: node <this file> [--apply]
import { createClient } from '@sanity/client';
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const apply = process.argv.includes('--apply');
const docs = await client.fetch('*[_type == "story" && kind == "collectors-voice" && !(_id in path("drafts.**"))]');
console.log(docs.map((d) => `${d._id}  ${d.title?.en}`).join('\n') || '(none published)');
if (!docs.length) process.exit(0);

const stamp = new Date().toISOString().slice(0, 10);
const backup = `legacy-export/backups/collectors-voices-unpublish-${stamp}.json`;
writeFileSync(backup, JSON.stringify(docs, null, 2));
console.log('backed up to', backup);

if (!apply) { console.log('dry run - pass --apply to unpublish'); process.exit(0); }

let tx = client.transaction();
for (const d of docs) {
  const { _rev, _updatedAt, _createdAt, ...rest } = d;
  tx = tx.createOrReplace({ ...rest, _id: `drafts.${d._id}` }).delete(d._id);
}
const res = await tx.commit({ visibility: 'async' });
console.log('unpublished', docs.length, 'documents, tx', res.transactionId);

