#!/usr/bin/env node
/**
 * Keeps the fair's English names in English on the French and Dutch site
 * (Tiphaine, WhatsApp 2026-09-25: "a list of words that stay in English -
 * Awards, Art prize, Advisory board"). The code's labels are in STRINGS in
 * src/lib/i18n.ts; this is the content half: menu items, quick links, page
 * titles and SEO titles, where the French menu read "prix" for both the art
 * prize and its awards.
 *
 * The rule, on every localised string of every published document: where the
 * English is exactly one of TERMS, French and Dutch become the English. A
 * title built of parts ("Art prize — about") is compared part by part, so
 * "Prix — à propos" becomes "Art prize — à propos". Prose is never touched:
 * only a whole string or a whole part matches.
 *
 * One transaction, JSON backup of every touched document first. A document
 * with an open draft gets the same change on the draft. Turn the Sanity
 * deploy webhook off before --apply, and run one deploy-hook build after.
 *
 *   node scripts/keep-english-terms.mjs           dry run
 *   node scripts/keep-english-terms.mjs --apply   write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const TERMS = new Set(['awards', 'art prize', 'advisory board']);
const SEP = ' — ';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const BACKUPS = path.join(ROOT, 'legacy-export', 'backups');

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

const isTerm = (s) => TERMS.has(s.trim().toLowerCase());

/** The fr/nl value the rule wants, or null when it leaves the string alone. */
function target(en, other) {
  if (typeof en !== 'string' || typeof other !== 'string' || !other) return null;
  if (isTerm(en)) return other === en ? null : en;
  const e = en.split(SEP);
  const o = other.split(SEP);
  if (e.length < 2 || e.length !== o.length) return null;
  const next = o.map((part, i) => (isTerm(e[i]) ? e[i] : part)).join(SEP);
  return next === other ? null : next;
}

/** [{ path, locale, from, to }] for one document, paths in patch syntax. */
function changesIn(doc) {
  const out = [];
  const walk = (node, p) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, v && v._key ? `${p}[_key=="${v._key}"]` : `${p}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object' || node._type === 'block') return;
    if (typeof node.en === 'string') {
      for (const locale of ['fr', 'nl']) {
        const to = target(node.en, node[locale]);
        if (to !== null) out.push({ path: `${p}.${locale}`, locale, from: node[locale], to });
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('_')) walk(v, p ? `${p}.${k}` : k);
  };
  walk(doc, '');
  return out;
}

const docs = await client.fetch(`*[!(_id in path("_.**")) && !(_type match "sanity.*") && !(_type match "system.*")]`);
const plan = docs
  .map((d) => ({ id: d._id, type: d._type, changes: changesIn(d) }))
  .filter((p) => p.changes.length);

for (const p of plan) {
  console.log(`\n${p.id} (${p.type})`);
  for (const c of p.changes) console.log(`  ${c.path}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
}
const total = plan.reduce((n, p) => n + p.changes.length, 0);
console.log(`\n${total} strings in ${plan.length} documents.`);

if (!APPLY) {
  console.log('Dry run - nothing written. --apply to write.');
  process.exit(0);
}
if (!plan.length) process.exit(0);

const ids = plan.map((p) => p.id);
const backup = await client.fetch(`*[_id in $ids]`, { ids });
fs.mkdirSync(BACKUPS, { recursive: true });
const backupFile = path.join(BACKUPS, `keep-english-terms-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
console.log(`Backup of ${backup.length} documents: ${path.relative(ROOT, backupFile)}`);

const tx = client.transaction();
for (const p of plan) tx.patch(p.id, (patch) => patch.set(Object.fromEntries(p.changes.map((c) => [c.path, c.to]))));
const res = await tx.commit();
console.log(`Written: transaction ${res.transactionId}.`);
