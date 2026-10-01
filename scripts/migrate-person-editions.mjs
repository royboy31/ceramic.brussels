/**
 * #46: one person, several years. Moves each person's single `edition`
 * reference into the `editions` array the schema reads now, and puts
 * Jean-Marc Dimanche on the 2025 jury, which is the page that exposed the
 * model (the frame shows five jurors, the site drew four).
 *
 *   node scripts/migrate-person-editions.mjs          # plan, write nothing
 *   node scripts/migrate-person-editions.mjs --apply  # do it
 *
 * Idempotent: a person already carrying `editions` is left alone, the value
 * is moved (unset after copying) so there is one source of truth, and
 * `createIfNotExists` semantics apply throughout. Run `npm run dates` after,
 * as after every script that writes.
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const project = env.PUBLIC_SANITY_PROJECT_ID;
const token = env.SANITY_API_WRITE_TOKEN;
if (!token) throw new Error('SANITY_API_WRITE_TOKEN not in .env');
const apply = process.argv.includes('--apply');

const q = async (query) => {
  const r = await fetch(
    `https://${project}.api.sanity.io/v2024-01-01/data/query/production?query=${encodeURIComponent(query)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  return (await r.json()).result;
};

const people = await q(`*[_type == "person" && defined(edition)]{ _id, name, "ref": edition._ref, "already": defined(editions) }`);
const e2025 = await q(`*[_type == "edition" && year == 2025][0]._id`);
const dimanche = await q(`*[_type == "person" && name match "Jean-Marc Dimanche*"][0]{ _id, name, "refs": coalesce(editions[]._ref, [edition._ref]) }`);
if (!e2025) throw new Error('no 2025 edition');
if (!dimanche) throw new Error('Dimanche not found');

const mutations = [];
for (const p of people) {
  // Copy the single reference in unless the array already holds it, then
  // drop the single so the two can never disagree.
  const patch = { id: p._id, unset: ['edition'] };
  if (!p.already) patch.set = { editions: [{ _type: 'reference', _ref: p.ref, _key: p.ref }] };
  mutations.push({ patch });
  console.log(`  ${p.name}: edition -> editions[${p.already ? 'kept existing array' : '1'}]`);
}
if (!dimanche.refs?.includes(e2025)) {
  mutations.push({
    patch: {
      id: dimanche._id,
      insert: { after: 'editions[-1]', items: [{ _type: 'reference', _ref: e2025, _key: e2025 }] },
    },
  });
  console.log(`  ${dimanche.name}: + 2025 (${e2025})`);
} else {
  console.log(`  ${dimanche.name}: already on 2025`);
}

console.log(`${mutations.length} mutation(s)${apply ? '' : ' - dry run, nothing written (--apply to run)'}`);
if (apply && mutations.length) {
  const r = await fetch(`https://${project}.api.sanity.io/v2024-01-01/data/mutate/production`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  });
  const out = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(out));
  console.log(`applied: ${out.results.length} patched`);
}
