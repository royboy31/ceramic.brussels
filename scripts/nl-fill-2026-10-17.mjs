#!/usr/bin/env node
/**
 * Every Dutch translation the dataset was missing, written natively from the
 * current English - the pass that makes /nl/ a complete language next to
 * English and French instead of a page of fallbacks.
 *
 * Scope: every localised field a rendered document carries whose English is
 * filled and whose Dutch was empty on 2026-10-17 - 809 rows over 387
 * documents (programme events, artists, pages, site settings and FAQ,
 * stories, exhibitions, editions, laureates, persons, partners, the menu,
 * past and coming exhibitors). Fields no page renders (award citation,
 * exhibitor artistsNote, partner subtitle, programme description outside the
 * VIP section…) were left out on purpose. The three retranslated pages of
 * scripts/nl-3-pages-2026-10-17.mjs are not touched here: their Dutch is no
 * longer empty.
 *
 * Source: scripts/data/nl-fill-2026-10-17.json. A row is a scalar (`nl`), or
 * one paragraph of a block field; a paragraph whose English carries inline
 * marks has `nlSpans`, one Dutch text per English span, so bold run-ins,
 * italics and links keep their place without a hand-anchored map.
 *
 * Safety: the English of every row is re-read and compared before anything
 * is written; a changed English stops the run. This is a FILL - a field
 * whose Dutch is no longer empty (an editor got there first) is skipped and
 * reported, never overwritten.
 *
 *   node scripts/nl-fill-2026-10-17.mjs           dry run - prints everything
 *   node scripts/nl-fill-2026-10-17.mjs --apply   one transaction + JSON backup;
 *                                                 open drafts get the same change
 *
 * Run `npm run dates` afterwards, as every script that writes to the dataset
 * must: one unreadable date costs the whole build.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const BACKUPS = path.join(ROOT, 'legacy-export', 'backups');
const PAYLOAD = path.join(ROOT, 'scripts', 'data', 'nl-fill-2026-10-17.json');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
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

const key = () => crypto.randomBytes(6).toString('hex');
const plain = (b) => (b.children ?? []).map((c) => c.text ?? '').join('');
const norm = (s) => (s ?? '').replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Walk a path like `sections[_key=="ab"].links[_key=="cd"].label` or
 * `practicalInfo.hotelDeal.rate` down to the locale object it names.
 * Every array step in the payload selects by _key; there are no numeric
 * indexes (verified at assembly).
 */
function resolve(doc, base) {
  const steps = base.match(/[A-Za-z][\w]*|\[_key=="[^"]+"\]/g) ?? [];
  let node = doc;
  for (const s of steps) {
    if (node == null) return undefined;
    if (s.startsWith('[')) {
      const k = s.slice(8, -2);
      node = Array.isArray(node) ? node.find((x) => x && x._key === k) : undefined;
    } else {
      node = node[s];
    }
  }
  return node;
}

/** The Dutch block mirroring `enBlock`: flat text, or one text per English span. */
function nlBlock(row, enBlock) {
  const markDefs = JSON.parse(JSON.stringify(enBlock.markDefs ?? []));
  let children;
  if (row.nlSpans) {
    const enChildren = enBlock.children ?? [];
    if (enChildren.length !== row.nlSpans.length) {
      throw new Error(`${row.doc} ${row.champ}: ${enChildren.length} English spans, ${row.nlSpans.length} Dutch`);
    }
    children = enChildren.map((c, j) => ({ _key: key(), _type: 'span', marks: [...(c.marks ?? [])], text: row.nlSpans[j] }));
  } else {
    children = [{ _key: key(), _type: 'span', marks: [], text: row.nl }];
  }
  return { _key: key(), _type: 'block', style: enBlock.style ?? 'normal', markDefs, children };
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
  const ids = [...new Set(rows.map((r) => r.doc))];
  const docs = Object.fromEntries((await client.fetch('*[_id in $ids]', { ids })).map((d) => [d._id, d]));
  const gone = ids.filter((i) => !docs[i]);
  if (gone.length) throw new Error(`documents not found: ${gone.join(', ')}`);
  const draftIds = await client.fetch('*[_id in $ids]._id', { ids: ids.map((i) => `drafts.${i}`) });

  /* One entry per field; block paragraphs collected in English order. */
  const fields = new Map();
  for (const r of rows) {
    const m = r.champ.match(/^(.*)\.en\[(\d+)\]$/);
    const base = m ? m[1] : r.champ;
    const k = `${r.doc}|${base}`;
    if (!fields.has(k)) fields.set(k, { doc: r.doc, base, blocks: m ? [] : null, scalar: null });
    const f = fields.get(k);
    if (m) f.blocks[Number(m[2])] = r;
    else f.scalar = r;
  }

  const patchesById = {};
  const skipped = [];
  let nFields = 0;
  for (const f of [...fields.values()]) {
    const doc = docs[f.doc];
    const loc = resolve(doc, f.base);
    if (!loc || typeof loc !== 'object') throw new Error(`${f.doc}: nothing at ${f.base}`);

    if (f.scalar) {
      if (typeof loc.en !== 'string') throw new Error(`${f.doc}.${f.base}: English is not a string`);
      if (norm(loc.en) !== norm(f.scalar.en)) {
        throw new Error(`${f.doc}.${f.base}: the English has changed since the sheet was made\n  sanity: ${loc.en}\n  sheet : ${f.scalar.en}`);
      }
      if ((loc.nl ?? '').trim()) { skipped.push(`${f.doc}.${f.base} (Dutch no longer empty)`); continue; }
      patchesById[f.doc] = { ...(patchesById[f.doc] ?? {}), [`${f.base}.nl`]: f.scalar.nl };
      nFields += 1;
      continue;
    }

    const en = Array.isArray(loc.en) ? loc.en : [];
    const nlNow = (Array.isArray(loc.nl) ? loc.nl : []).filter((b) => b._type === 'block');
    if (nlNow.some((b) => plain(b).trim())) { skipped.push(`${f.doc}.${f.base} (Dutch no longer empty)`); continue; }
    const out = [];
    let i = 0;
    for (const b of en) {
      if (b._type !== 'block') { out.push(JSON.parse(JSON.stringify(b))); continue; }
      const enText = plain(b);
      const row = f.blocks[i];
      if (!enText.trim()) {
        if (row) throw new Error(`${f.doc}.${f.base}[${i}]: a row for an empty English paragraph`);
        out.push({ _key: key(), _type: 'block', style: b.style ?? 'normal', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text: '' }] });
        i += 1;
        continue;
      }
      if (!row) throw new Error(`${f.doc}.${f.base}[${i}]: no Dutch for "${enText.slice(0, 60)}…"`);
      if (norm(enText) !== norm(row.en)) {
        throw new Error(`${f.doc}.${f.base}[${i}]: the English has changed since the sheet was made\n  sanity: ${enText}\n  sheet : ${row.en}`);
      }
      out.push(nlBlock(row, b));
      i += 1;
    }
    patchesById[f.doc] = { ...(patchesById[f.doc] ?? {}), [`${f.base}.nl`]: out };
    nFields += 1;
  }

  for (const [id, sets] of Object.entries(patchesById)) {
    console.log(`\n${id}`);
    for (const [p, v] of Object.entries(sets)) {
      const preview = typeof v === 'string' ? v : `[${v.length} block(s)] ${plain(v[0] ?? {})}`;
      console.log(`  ${p} = ${preview.slice(0, 110)}${preview.length > 110 ? '…' : ''}`);
    }
  }
  if (skipped.length) {
    console.log('\nskipped, Dutch already there:');
    for (const s of skipped) console.log(`  ${s}`);
  }
  console.log(`\n${rows.length} sheet rows → ${Object.keys(patchesById).length} document(s), ${nFields} field(s), ${skipped.length} skipped. Drafts also patched: ${draftIds.length}`);

  if (!APPLY) { console.log('\nDry run - nothing written. Re-run with --apply.'); return; }

  fs.mkdirSync(BACKUPS, { recursive: true });
  const bpath = path.join(BACKUPS, `nl-fill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(bpath, JSON.stringify({ when: new Date().toISOString(), docs: Object.values(docs) }, null, 1));
  console.log(`backup: ${bpath}`);

  const tx = client.transaction();
  for (const [id, sets] of Object.entries(patchesById)) {
    tx.patch(id, (p) => p.set(sets));
    if (draftIds.includes(`drafts.${id}`)) tx.patch(`drafts.${id}`, (p) => p.set(sets));
  }
  const res = await tx.commit();
  console.log(`applied: transaction ${res.transactionId}`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
