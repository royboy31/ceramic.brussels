#!/usr/bin/env node
/**
 * Shows what Sanity actually holds right now: published documents and any
 * unpublished drafts. Useful when a change is visible in the Studio but not on
 * the site - almost always because it was never published.
 *
 * Usage: npm run content
 */
import fs from 'node:fs';

function readEnv() {
  const out = {};
  if (!fs.existsSync('.env')) return out;
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const { PUBLIC_SANITY_PROJECT_ID: projectId, PUBLIC_SANITY_DATASET: dataset } = env;
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET in .env');
  process.exit(1);
}

// Drafts are only readable with a token; without one we still show published.
const query = '*[!(_type match "system.**")]{_id, _type, title, _updatedAt}';
const url =
  `https://${projectId}.api.sanity.io/v2022-03-07/data/query/${dataset}` +
  `?query=${encodeURIComponent(query)}`;

const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
if (!res.ok) {
  console.error(`Sanity returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const docs = (await res.json()).result ?? [];
const drafts = docs.filter((d) => d._id.startsWith('drafts.'));
const published = docs.filter((d) => !d._id.startsWith('drafts.'));

console.log(`${projectId} / ${dataset}${token ? '' : '  (no token - drafts hidden)'}\n`);

console.log(`PUBLISHED (${published.length}) - this is what the site renders`);
for (const d of published) {
  console.log(`  ${d._type.padEnd(8)} ${String(d.title ?? d._id).padEnd(32)} updated ${d._updatedAt}`);
}
if (!published.length) console.log('  (none)');

console.log(`\nDRAFTS (${drafts.length}) - NOT visible on the site until published`);
for (const d of drafts) {
  console.log(`  ${d._type.padEnd(8)} ${String(d.title ?? d._id).padEnd(32)} updated ${d._updatedAt}`);
}
if (!drafts.length) console.log('  (none)');
