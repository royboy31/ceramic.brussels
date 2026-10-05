#!/usr/bin/env node
/**
 * The French of the three pages Tiphaine said had changed completely
 * (WhatsApp, 2026-10-05 15:01): the gallery pages, the art prize awards tab
 * and "about ceramic brussels". Every value is translated from the *current*
 * English in Sanity, not from the old French, which is what made the review
 * sheet's second tab unusable ("l'anglais et le français ne disent pas la
 * même chose" on sentences that had simply been rewritten in English).
 *
 * Source: scripts/data/fr-3-pages-2026-10-05.json - the 216 rows of the
 * internal review sheet "3 pages FR retraduites (2026-10-05)", one row per
 * paragraph, carrying the document id and the English field path it came
 * from (`bio.en[2]`, `sections[_key=="scenography"].heading`…).
 *
 * Scope is deliberately exactly those pages: Tiphaine asked at 15:06 the
 * same day that nothing else be touched while the team checks the rest.
 * So: no other page, no menu or footer, no SEO field, no 2024/2025
 * galleries, no Dutch.
 *
 * The English block each paragraph came from is re-read and compared before
 * anything is written, so a row whose English has since changed stops the
 * run instead of writing French for a sentence that is no longer there.
 * `bio.fr` is rebuilt as a whole array, mirroring the English blocks one for
 * one (same count, same style), which keeps a field that had extra old-site
 * paragraphs - a website address, "X est le gagnant de…" - from keeping them.
 *
 *   node scripts/fr-3-pages-2026-10-05.mjs           dry run - prints everything
 *   node scripts/fr-3-pages-2026-10-05.mjs --apply   one transaction + JSON backup;
 *                                                    a document with an open
 *                                                    draft gets the same change
 *                                                    on the draft
 *
 * Run `npm run dates` afterwards, as every script that writes to the dataset
 * must: one unreadable date costs the whole build.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);
const BACKUPS = path.join(ROOT, 'legacy-export', 'backups');
const PAYLOAD = path.join(ROOT, 'scripts', 'data', 'fr-3-pages-2026-10-05.json');

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

/* ------------------------------------------------------------- the marks

   Ten of the 216 English paragraphs carry a mark: one link, eight bold
   run-ins (a gallery's own name, the three "↘" pillars on the about page)
   and one italic paragraph. The sheet is flat text, so the mark is put back
   here, on a French anchor given explicitly rather than guessed.

   `anchor`  the French substring the mark covers; `whole` marks all of it.
   `mark`    'strong' | 'em' | 'link' (the link copies the English markDef,
             so the href can never drift from the English).
   `wrap`    put the paragraph between French quotation marks: the English is
             a quotation and the sheet lost its curly quotes on the way in. */
const MARKS = {
  'demo-page-about-the-fair|sections[_key=="contentSection0"].body|1': { anchor: 'Tour & Taxis', mark: 'link' },
  'demo-page-about-the-fair|sections[_key=="contentSection1"].body|1': { anchor: ' Une vitrine mondiale', mark: 'strong' },
  'demo-page-about-the-fair|sections[_key=="contentSection1"].body|2': { anchor: ' Un tremplin pour les talents émergents', mark: 'strong' },
  'demo-page-about-the-fair|sections[_key=="contentSection1"].body|3': { anchor: ' Une plateforme d’affaires et de networking', mark: 'strong' },
  'exhibitor-2026-arnoldsche-art-publishers|bio|0': { anchor: 'Arnoldsche Art Publishers', mark: 'strong' },
  'exhibitor-2026-editions-ateliers-d-art-de-france|bio|0': { anchor: 'Éditions Ateliers d’Art de France', mark: 'strong' },
  'exhibitor-2026-latvian-centre-for-contemporary-ceramic|bio|0': { anchor: 'Le Latvian Centre for Contemporary Ceramics', mark: 'strong' },
  'exhibitor-2026-leonore-chastagner|bio|1': { wrap: 'guillemets' },
  'exhibitor-2026-leonore-chastagner|bio|3': { whole: true, mark: 'em' },
  'exhibitor-2026-ponce-robles-and-jorge-lopez-galeria|bio|0': { anchor: 'Ponce + Robles', mark: 'strong' },
  'exhibitor-2026-ponce-robles-and-jorge-lopez-galeria|bio|1': { anchor: 'Jorge López Galería', mark: 'strong' },
};

/** The French block for one paragraph, positioned and marked like `enBlock`. */
function frBlock(text, enBlock, spec) {
  let body = text;
  if (spec?.wrap === 'guillemets') body = `« ${body} »`;
  const markDefs = [];
  const span = (t, marks = []) => ({ _key: key(), _type: 'span', marks, text: t });

  let children;
  if (!spec || (!spec.anchor && !spec.whole)) {
    children = [span(body)];
  } else if (spec.whole) {
    children = [span(body, [spec.mark])];
  } else {
    const at = body.indexOf(spec.anchor);
    if (at < 0) throw new Error(`anchor ${JSON.stringify(spec.anchor)} not in ${JSON.stringify(body.slice(0, 60))}`);
    let mark = spec.mark;
    if (spec.mark === 'link') {
      const def = (enBlock.markDefs ?? [])[0];
      if (!def) throw new Error('link mark asked for, but the English block has no markDef');
      const copy = { ...def, _key: key() };
      markDefs.push(copy);
      mark = copy._key;
    }
    children = [
      span(body.slice(0, at)),
      span(spec.anchor, [mark]),
      span(body.slice(at + spec.anchor.length)),
    ].filter((c) => c.text !== '');
  }
  return { _key: key(), _type: 'block', style: enBlock.style ?? 'normal', markDefs, children };
}

const plain = (block) => (block.children ?? []).map((c) => c.text ?? '').join('');
/** The sheet's English column lost a few curly quotes; compare without them. */
const norm = (s) => (s ?? '').replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();

/** The section or the document a field path lives on, plus the field name. */
function container(doc, base) {
  const m = base.match(/^sections\[_key=="([^"]+)"\]\.(\w+)$/);
  if (!m) return [doc, base];
  const section = (doc.sections ?? []).find((s) => s._key === m[1]);
  if (!section) throw new Error(`${doc._id}: no section _key=="${m[1]}"`);
  return [section, m[2]];
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
  const ids = [...new Set(rows.map((r) => r.doc))];
  const docs = Object.fromEntries(
    (await client.fetch('*[_id in $ids]', { ids })).map((d) => [d._id, d]),
  );
  const missing = ids.filter((i) => !docs[i]);
  if (missing.length) throw new Error(`documents not found: ${missing.join(', ')}`);
  const draftIds = await client.fetch('*[_id in $ids]._id', { ids: ids.map((i) => `drafts.${i}`) });

  /* Group the rows: one entry per field, paragraphs in the English's order. */
  const fields = new Map();
  for (const r of rows) {
    const m = r.champ.match(/^(.*)\.en\[(\d+)\]$/);
    const base = m ? m[1] : r.champ;
    const k = `${r.doc}|${base}`;
    if (!fields.has(k)) fields.set(k, { doc: r.doc, base, blocks: m ? [] : null, scalar: null, page: r.page });
    const f = fields.get(k);
    if (m) f.blocks[Number(m[2])] = r;
    else f.scalar = r;
  }

  const patchesById = {};
  const notes = [];
  let nFields = 0;
  for (const f of [...fields.values()]) {
    const doc = docs[f.doc];
    const [host, name] = container(doc, f.base);
    const loc = host[name];
    if (!loc || typeof loc !== 'object') throw new Error(`${f.doc}: nothing at ${f.base}`);

    if (f.scalar) {
      if (typeof loc.en !== 'string') throw new Error(`${f.doc}.${f.base}: English is not a string`);
      if (norm(loc.en) !== norm(f.scalar.en)) {
        throw new Error(`${f.doc}.${f.base}: the English has changed since the sheet was made\n  sanity: ${loc.en}\n  sheet : ${f.scalar.en}`);
      }
      if (loc.fr === f.scalar.fr) continue; // already right
      patchesById[f.doc] = { ...(patchesById[f.doc] ?? {}), [`${f.base}.fr`]: f.scalar.fr };
      nFields += 1;
      continue;
    }

    /* A block field: rebuild `fr` to mirror `en` one block for one block. */
    const en = Array.isArray(loc.en) ? loc.en : [];
    const textBlocks = en.filter((b) => b._type === 'block');
    const out = [];
    let i = 0;
    for (const b of en) {
      if (b._type !== 'block') { out.push(JSON.parse(JSON.stringify(b))); continue; }
      const enText = plain(b);
      const row = f.blocks[i];
      if (!enText.trim()) {
        // An empty English paragraph (one gallery has a trailing one): keep
        // the position, write nothing. The sheet has no row for it.
        if (row) throw new Error(`${f.doc}.${f.base}[${i}]: the sheet has a row for an empty English paragraph`);
        out.push({ _key: key(), _type: 'block', style: b.style ?? 'normal', markDefs: [], children: [{ _key: key(), _type: 'span', marks: [], text: '' }] });
        i += 1;
        continue;
      }
      if (!row) throw new Error(`${f.doc}.${f.base}[${i}]: no French for "${enText.slice(0, 60)}…"`);
      if (norm(enText) !== norm(row.en)) {
        throw new Error(`${f.doc}.${f.base}[${i}]: the English has changed since the sheet was made\n  sanity: ${enText}\n  sheet : ${row.en}`);
      }
      const spec = MARKS[`${f.doc}|${f.base}|${i}`];
      if (spec) notes.push(`${f.doc} ${f.base}[${i}] — ${spec.wrap ? 'quotation marks added' : `${spec.mark} on ${spec.whole ? 'the whole paragraph' : JSON.stringify(spec.anchor)}`}`);
      out.push(frBlock(row.fr, b, spec));
      i += 1;
    }
    if (f.blocks.length > textBlocks.length) {
      throw new Error(`${f.doc}.${f.base}: the sheet has ${f.blocks.length} paragraphs, the English ${textBlocks.length}`);
    }
    patchesById[f.doc] = { ...(patchesById[f.doc] ?? {}), [`${f.base}.fr`]: out };
    nFields += 1;
  }

  for (const [id, sets] of Object.entries(patchesById)) {
    console.log(`\n${id}`);
    for (const [p, v] of Object.entries(sets)) {
      const preview = typeof v === 'string'
        ? v
        : `[${v.length} block(s)] ${plain(v[0] ?? {})}`;
      console.log(`  ${p} = ${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}`);
    }
  }
  if (notes.length) {
    console.log('\nmarks put back by hand:');
    for (const n of notes) console.log(`  ${n}`);
  }
  console.log(`\n${rows.length} sheet rows → ${Object.keys(patchesById).length} document(s), ${nFields} field(s). Drafts also patched: ${draftIds.length}`);

  if (!APPLY) { console.log('\nDry run - nothing written. Re-run with --apply.'); return; }

  fs.mkdirSync(BACKUPS, { recursive: true });
  const bpath = path.join(BACKUPS, `fr-3-pages-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
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
