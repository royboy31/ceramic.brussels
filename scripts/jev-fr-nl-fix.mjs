#!/usr/bin/env node
/**
 * The Jev gate's confirmed bugs, fixed 2026-10-04. Kept as the record of
 * transaction eQCR1n23HeACrbntfBflSE (it ran as a scratchpad one-off; this
 * is the same patch list, re-runnable).
 *
 * Roy's Opus-mini agent scored the whole French against English on
 * 2026-10-03/04 and flagged, among much that was by design, a set of real
 * bugs. Validated against the live dataset, every one held, and the sweep
 * found what the gate missed - it never scanned Dutch, where the same leak
 * sat in seven fields, and it skipped the 2025 award:
 *
 *   - 5 FR + 7 NL award outcomes still in English (every award but
 *     demo-award-2026-1 on the NL side), written in the descriptive style
 *     the 2026-10-03 QA pass set ("est lauréate d'une…"), genders checked
 *     against the laureates.
 *   - demo-page-visit-practical-info seo.title.fr was "Infos pratiques —
 *     infos pratiques": hub and tab translate to the same word, so the
 *     EN "A — B" pattern cannot survive French here.
 *   - The two talks FAQ entries said "talks" where the FR tab they point
 *     to says "conférences" (the internalLink mark is kept).
 *   - The about page said "un country focus" where the site's own menu
 *     says "focus pays".
 *
 * Left alone on purpose: the gallery descriptions (the client's own AI
 * pass), "Danish Design School" (a proper name), and everything English
 * that Tiphaine's keep-English rule puts there - the gate misread that
 * rule as covering sentences; it covers menus, titles and SEO titles only.
 *
 *   node scripts/jev-fr-nl-fix.mjs           dry run
 *   node scripts/jev-fr-nl-fix.mjs --apply   write, in one transaction
 *
 * Every patch carries the exact value it expects to replace; one mismatch
 * aborts the whole run before anything is sent, so against today's dataset
 * a re-run refuses itself. Touched documents are backed up to
 * legacy-export/backups first.
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
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim())),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

/** [document id, patch path, the exact current value, the new value] */
const FIXES = [
  ['demo-award-2025-9', 'outcome.fr',
    'presented a solo show during ceramic brussels 2026',
    'a présenté un solo show lors de ceramic brussels 2026'],
  ['demo-award-2025-9', 'outcome.nl',
    'presented a solo show during ceramic brussels 2026',
    'presenteerde een solotentoonstelling tijdens ceramic brussels 2026'],
  ['demo-award-2026-2', 'outcome.nl',
    'is the laureate of a monograph devoted to her work',
    'is laureate van een monografie gewijd aan haar werk'],
  ['demo-award-2026-3', 'outcome.fr',
    'will take part in an exhibition in 2027 in Paris',
    'participera à une exposition à Paris en 2027'],
  ['demo-award-2026-3', 'outcome.nl',
    'will take part in an exhibition in 2027 in Paris',
    'neemt in 2027 deel aan een tentoonstelling in Parijs'],
  ['demo-award-2026-4', 'outcome.fr',
    'will benefit from a 2-month residency',
    'bénéficiera d’une résidence de 2 mois'],
  ['demo-award-2026-4', 'outcome.nl',
    'will benefit from a 2-month residency',
    'krijgt een residentie van 2 maanden'],
  ['demo-award-2026-5', 'outcome.fr',
    'will benefit from a residency in July 2026',
    'bénéficiera d’une résidence en juillet 2026'],
  ['demo-award-2026-5', 'outcome.nl',
    'will benefit from a residency in July 2026',
    'krijgt een residentie in juli 2026'],
  ['demo-award-2026-6', 'outcome.nl',
    'is the laureate of a 3-week residency in Latvia',
    'is laureaat van een residentie van 3 weken in Letland'],
  ['demo-award-2026-7', 'outcome.fr',
    'are the laureates of a 3-month residency',
    'sont lauréates d’une résidence de 3 mois'],
  ['demo-award-2026-7', 'outcome.nl',
    'are the laureates of a 3-month residency',
    'zijn laureaten van een residentie van 3 maanden'],
  ['demo-page-visit-practical-info', 'seo.title.fr',
    'Infos pratiques — infos pratiques',
    'Infos pratiques'],
  ['siteSettings', 'faq[_key=="0c44e7a85c11"].question.fr',
    'Les talks sont-ils compris dans mon billet ?',
    'Les conférences sont-elles comprises dans mon billet ?'],
  ['siteSettings', 'faq[_key=="0c44e7a85c11"].answer.fr[_key=="4f29d5d968df"].children[_key=="70510670f8da"].text',
    'Oui, l’accès aux talks est inclus dans le billet d’entrée.',
    'Oui, l’accès aux conférences est inclus dans le billet d’entrée.'],
  ['siteSettings', 'faq[_key=="fd4622f6af9c"].question.fr',
    'En quelles langues se tiennent les talks ?',
    'En quelles langues se tiennent les conférences ?'],
  ['siteSettings', 'faq[_key=="fd4622f6af9c"].answer.fr[_key=="8b6e135e2414"].children[_key=="496df487ca85"].text',
    'page des talks',
    'page des conférences'],
  ['demo-page-about-the-fair', 'sections[_key=="contentSection2"].body.fr[_key=="ecc8c5d2dc82"].children[_key=="e4379b41a6b8"].text',
    'Depuis 2025, la foire a officiellement élargi son champ à la céramique moderne et au verre. Elle met également à l’honneur des scènes nationales à travers un country focus : la Norvège en 2025, l’Espagne en 2026.',
    'Depuis 2025, la foire a officiellement élargi son champ à la céramique moderne et au verre. Elle met également à l’honneur des scènes nationales à travers un focus pays : la Norvège en 2025, l’Espagne en 2026.'],
];

/** Walk a patch path ( field.field, [_key=="…"] segments ) through a document. */
function resolve(doc, p) {
  let cur = doc;
  for (const part of p.replaceAll('"]', '').split('.')) {
    if (part.includes('[_key==')) {
      const [field, key] = part.split('[_key=="');
      cur = (cur?.[field] ?? []).find((x) => x?._key === key);
    } else {
      cur = cur?.[part];
    }
    if (cur === undefined) return undefined;
  }
  return cur;
}

const ids = [...new Set(FIXES.map(([id]) => id))];
const docs = new Map(
  (await client.fetch('*[_id in $ids]', { ids }, { perspective: 'raw' })).map((d) => [d._id, d]),
);
const drafts = await client.fetch('*[_id in $ids]._id', { ids: ids.map((i) => `drafts.${i}`) });
if (drafts.length) throw new Error(`open drafts, patch them alike: ${drafts}`);

let bad = 0;
for (const [id, p, expect, next] of FIXES) {
  const cur = resolve(docs.get(id), p);
  const ok = cur === expect;
  if (!ok) bad++;
  console.log(`[${ok ? 'OK' : 'MISMATCH'}] ${id} :: ${p}`);
  if (!ok) console.log(`    expected ${JSON.stringify(expect)}\n    found    ${JSON.stringify(cur)}`);
}
console.log(`\n${FIXES.length} fields across ${ids.length} documents.`);
if (bad) {
  console.error(`${bad} guard(s) failed - nothing written.`);
  process.exit(1);
}
if (!APPLY) {
  console.log('Dry run. --apply to write.');
  process.exit(0);
}

const backupDir = path.join(ROOT, 'legacy-export', 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `jev-fr-nl-fixes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backup, JSON.stringify([...docs.values()], null, 1));
console.log(`Backup: ${backup}`);

let tx = client.transaction();
for (const id of ids) {
  const sets = Object.fromEntries(FIXES.filter(([d]) => d === id).map(([, p, , next]) => [p, next]));
  tx = tx.patch(id, (patch) => patch.ifRevisionId(docs.get(id)._rev).set(sets));
}
const res = await tx.commit({ visibility: 'sync' });
console.log(`Transaction: ${res.transactionId}`);
