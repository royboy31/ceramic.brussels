#!/usr/bin/env node
/**
 * Backfill `instagram` and `website` on the 2024 and 2025 exhibitor records.
 *
 * Why: a past edition's gallery page draws the two pills whenever the fields
 * are set (`ExhibitorDetail.astro`), and on those years they are set on
 * nothing - "these individual gallery pages should have the same layout as on
 * the current edition website, so « presents {name of artist} » should still
 * be there, and the instagram and website buttons as well" (Léonie,
 * 2026-10-26; docs/client-feedback-2026-10-26.md, request 20).
 *
 * The 2026 import filled the fields and left the bio clean. The 2024 and 2025
 * records came in before that, with the gallery's handle and address still
 * sitting in the **last paragraph of the bio** - which is why the live page
 * shows "spaxprojects.com @spaxprojects" as a stray line of body copy instead
 * of two pills. So the source is that paragraph, per record, per language.
 *
 * **`legacy-export/normalized/exhibitors.json` is the third source, and the
 * richest one.** The first pass of this script dismissed it after reading
 * `attrs` (city, category, year, booth) and `blocks` (empty) - but the old
 * site put each gallery's address and handle in the **body of its
 * description**, as ordinary `<a href>` links. 55 of the 57 2024 records and
 * 69 of the 78 2025 ones carry one, which is four times what the bio tail and
 * the sibling years together could find. Matched on name *and* year, with a
 * cross-year fallback for a gallery whose own year's page has none.
 *
 * **Artists are deliberately not touched.** They are per-year - a gallery
 * shows different artists each edition - so copying 2026's references back
 * onto a 2025 record would be a factual error, and nothing in the export
 * carries the real lists. Some bios name them in prose ("the gallery will
 * present works by …"); turning that into `artistsText` is a guess, so this
 * only counts them and leaves them for the client.
 *
 * Usage:
 *   node scripts/backfill-past-exhibitor-links.mjs             # dry run
 *   node scripts/backfill-past-exhibitor-links.mjs --apply
 *   node scripts/backfill-past-exhibitor-links.mjs --apply --strip-bio
 *
 * `--strip-bio` also removes the now-duplicated link paragraph from every
 * language of the bio, which is what makes the page read like 2026's. It is
 * separate because it edits published prose; without it the links show both
 * as pills and as that trailing line.
 *
 * SHOW=<n|all> controls how many planned records are listed.
 *
 * Run `npm run dates` afterwards, as after any script that writes to the
 * dataset (CLAUDE.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const STRIP = process.argv.includes('--strip-bio');
const YEARS = [2024, 2025];
const SHOW = process.env.SHOW === 'all' ? Infinity : Number(process.env.SHOW ?? 12);

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);
/* The same .env reader the other scripts here use; dotenv is not a dependency. */
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);

if (APPLY && !env.SANITY_API_WRITE_TOKEN) {
  console.error('no SANITY_API_WRITE_TOKEN in .env; --apply needs it.');
  process.exit(1);
}

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-05-03',
  token: APPLY ? env.SANITY_API_WRITE_TOKEN : undefined,
  useCdn: !APPLY,
});

const LOCALES = ['en', 'fr', 'nl'];

/** The plain text of one portable-text block. */
const blockText = (b) =>
  b && b._type === 'block' ? (b.children ?? []).map((c) => c?.text ?? '').join('').trim() : '';

/**
 * A trailing "spaxprojects.com @spaxprojects" line, and nothing else. Strict
 * on purpose: a short last paragraph *made of* a handle and/or an address, so
 * a closing sentence that happens to mention a museum's website is left alone.
 */
const TLD = '(?:com|be|fr|nl|eu|org|net|art|gallery|studio|ch|de|it|es|dk|se|no|at|lu|uk|co\\.uk)';
const IG = /(?:instagram\.com\/|@)([A-Za-z0-9._]{2,30})/i;
const URL_RE = new RegExp(
  `(?:https?://)?(?:www\\.)?([a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.${TLD})(/[^\\s]*)?`,
  'i',
);

function parseLinkLine(text) {
  if (!text || text.length > 160) return null;
  const ig = text.match(IG);
  // Take the handle out before looking for a domain, or "@spaxprojects" and
  // "spaxprojects.com" fight over the same characters.
  const withoutIg = ig ? text.replace(ig[0], ' ') : text;
  const url = withoutIg.match(URL_RE);
  if (!ig && !url) return null;
  // What is left once the handle and the address are removed should be
  // punctuation and whitespace - otherwise this is a real sentence.
  const rest = withoutIg.replace(url ? url[0] : '', ' ').replace(/[\s,./|·—⎯-]+/g, '');
  if (rest.length > 3) return null;
  return {
    instagram: ig ? ig[1] : null,
    website: url ? `https://${url[1]}${url[2] ?? ''}`.replace(/\/$/, '') : null,
    text,
  };
}

const rows = await client.fetch(
  `*[_type=="exhibitor" && edition->year in $years]{
     _id, name, "slug": slug.current, "year": edition->year,
     instagram, website, "artistCount": count(artists), artistsText, bio
   } | order(year asc, name asc)`,
  { years: YEARS },
);

/** The same gallery in another year, where the fields were already filled. */
const siblings = await client.fetch(
  `*[_type=="exhibitor" && (defined(instagram) || defined(website))]{
     name, "year": edition->year, instagram, website
   }`,
);
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/\d{2,4}$/, '');
const byName = new Map();
for (const s of siblings) if (!byName.has(norm(s.name))) byName.set(norm(s.name), s);

/* ------------------------------------------------------- the legacy export */

/**
 * Legacy titles carry the country the old listing showed - "Valerius Gallery
 * (lu)", "Almine Rech (be/fr/us)" - and accents the Sanity names also have.
 * Both go before the alphanumeric squeeze, or no 2024 record matches.
 */
const legacyNorm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*\([a-z/\s]{2,20}\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, '');

/** The gallery's own handle and address out of one legacy description. */
function legacyLinks(record) {
  const hrefs = [];
  for (const loc of ['en', 'fr', 'nl']) {
    const html = record.description?.[loc];
    if (typeof html !== 'string') continue;
    for (const m of html.matchAll(/href="([^"]+)"/g)) hrefs.push(m[1]);
  }
  const external = hrefs.filter(
    (h) => /^https?:\/\//i.test(h) && !/ceramic\.brussels/i.test(h),
  );
  const igHref = external.find((h) => /instagram\.com/i.test(h));
  const webHref = external.find((h) => !/instagram\.com|facebook\.com|twitter\.com|x\.com/i.test(h));
  const handle = igHref?.match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i)?.[1] ?? null;
  return {
    instagram: handle,
    website: webHref ? webHref.replace(/\/$/, '') : null,
  };
}

const legacyPath = path.join(ROOT, 'legacy-export', 'normalized', 'exhibitors.json');
const legacyByYear = new Map();
const legacyAnyYear = new Map();
if (fs.existsSync(legacyPath)) {
  for (const rec of JSON.parse(fs.readFileSync(legacyPath, 'utf8'))) {
    const key = legacyNorm(rec.title?.en ?? rec.listingTitle);
    if (!key) continue;
    const year = rec.attrs?.year;
    if (!legacyByYear.has(`${key}|${year}`)) legacyByYear.set(`${key}|${year}`, rec);
    if (!legacyAnyYear.has(key)) legacyAnyYear.set(key, rec);
  }
} else {
  console.warn(`legacy export not found at ${legacyPath}; that source is skipped.`);
}

const plans = [];
const unresolved = [];
/** Records carrying a link paragraph the pills already replace, flag or no flag. */
const strippables = [];
let prose = 0;

for (const r of rows) {
  const found = {};
  const evidence = {};
  for (const loc of LOCALES) {
    const blocks = r.bio?.[loc];
    if (!Array.isArray(blocks) || !blocks.length) continue;
    const lastIndex = blocks.map(blockText).reduce((acc, t, i) => (t ? i : acc), -1);
    if (lastIndex < 0) continue;
    const parsed = parseLinkLine(blockText(blocks[lastIndex]));
    if (!parsed) continue;
    evidence[loc] = { key: blocks[lastIndex]._key, text: parsed.text };
    if (parsed.instagram && !found.instagram) found.instagram = parsed.instagram;
    if (parsed.website && !found.website) found.website = parsed.website;
  }

  let source = Object.keys(evidence).length ? 'bio tail' : null;
  let sibling = null;
  if (!found.instagram && !found.website) {
    const sib = byName.get(norm(r.name));
    if (sib) {
      if (sib.instagram) found.instagram = sib.instagram;
      if (sib.website) found.website = sib.website;
      source = `sibling ${sib.year}`;
      sibling = sib;
    }
  }
  /* The old site's own page for this gallery, that year, is the last word -
     and for 2024 and 2025 it is usually the only one. */
  if (!found.instagram && !found.website) {
    const key = legacyNorm(r.name);
    const sameYear = legacyByYear.get(`${key}|${r.year}`);
    const rec = sameYear ?? legacyAnyYear.get(key);
    if (rec) {
      const links = legacyLinks(rec);
      if (links.instagram || links.website) {
        if (links.instagram) found.instagram = links.instagram;
        if (links.website) found.website = links.website;
        source = sameYear ? `legacy ${r.year}` : `legacy ${rec.attrs?.year ?? '?'}`;
      }
    }
  }

  const en = (r.bio?.en ?? []).map(blockText).join(' ');
  if (/\bwill present\b|\bpresents?\b[^.]{0,40}\bworks?\b/i.test(en)) prose += 1;

  const set = {};
  if (found.instagram && !r.instagram) set.instagram = found.instagram;
  if (found.website && !r.website) set.website = found.website;

  /**
   * The link paragraph may only go once the pills can stand in its place -
   * either this run is setting the fields, or an earlier one already did.
   * Without that guard a second pass would delete the only copy of a handle
   * it had never saved anywhere.
   *
   * It is also why `strippable` is tracked apart from `set`: the first run
   * filled the fields, so on every run after it `set` is empty and the
   * record would otherwise drop out of the plan with its paragraph still
   * there (which is exactly what happened on 2026-10-27).
   */
  const strippable =
    Object.keys(evidence).length > 0 &&
    Boolean(r.instagram ?? set.instagram ?? r.website ?? set.website);
  if (strippable) strippables.push(r._id);

  if (Object.keys(set).length || (STRIP && strippable)) {
    plans.push({ ...r, set, source, evidence, sibling, strippable });
  } else unresolved.push(r);
}

/* ------------------------------------------------------------------ report */

const toFill = plans.filter((p) => Object.keys(p.set).length);
console.log(`\nPast exhibitor records (${YEARS.join(', ')}): ${rows.length}`);
console.log(`  fields to fill  : ${toFill.length}`);
console.log(`  paragraphs to remove (--strip-bio): ${strippables.length}`);
console.log(`  left untouched  : ${unresolved.length}`);
console.log(`  bios naming artists in prose (NOT touched): ${prose}\n`);

const bySource = plans.reduce((a, p) => ((a[p.source] = (a[p.source] ?? 0) + 1), a), {});
console.log('source:', JSON.stringify(bySource), '\n');

for (const p of plans.slice(0, SHOW)) {
  console.log(`${p.year}  ${p.name}`);
  console.log(`      set: ${JSON.stringify(p.set)}   [${p.source}]`);
  const ev = Object.entries(p.evidence)[0];
  if (ev) console.log(`      from bio.${ev[0]}: ${JSON.stringify(ev[1].text)}`);
  else if (p.sibling) console.log(`      from "${p.sibling.name}" (${p.sibling.year})`);
}
if (plans.length > SHOW) console.log(`\n… and ${plans.length - SHOW} more (SHOW=all to list)`);

console.log(
  `\n--strip-bio removes the link paragraph from ${strippables.length} record(s), in every language it appears,` +
    ' and only where the pills already carry the same handle or address.',
);

if (unresolved.length) {
  console.log('\nLeft untouched (no link line, no sibling with the fields):');
  for (const u of unresolved.slice(0, 15)) console.log(`  ${u.year}  ${u.name}`);
  if (unresolved.length > 15) console.log(`  … and ${unresolved.length - 15} more`);
}

if (!APPLY) {
  console.log('\nDRY RUN - nothing written. Re-run with --apply (and --strip-bio) to write.');
  process.exit(0);
}

/* ------------------------------------------------------------------- apply */

/* `--strip-bio` deletes published prose, so what it removes is written out
   first. The file is enough to put any paragraph back by hand. */
if (STRIP) {
  const backup = plans
    .filter((p) => p.strippable)
    .map((p) => ({ _id: p._id, name: p.name, year: p.year, removed: p.evidence }));
  const dir = path.join(ROOT, 'legacy-export', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'exhibitor-bio-link-lines-2026-10-27.json');
  /**
   * Merged, never overwritten. A second pass only sees the paragraphs still
   * standing, so writing the file fresh would drop what the first pass took:
   * that is how the Dutch entries were lost on 2026-10-27 and had to be read
   * back out of Sanity's document history.
   */
  let merged = backup;
  if (fs.existsSync(file)) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byId = new Map(prev.map((r) => [r._id, r]));
    for (const r of backup) {
      const old = byId.get(r._id);
      if (old) old.removed = { ...r.removed, ...old.removed };
      else byId.set(r._id, r);
    }
    merged = [...byId.values()];
  }
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log(`\nbacked up ${backup.length} removed paragraph(s) to ${path.relative(ROOT, file)}`);
}

let tx = client.transaction();
let n = 0;
for (const p of plans) {
  let patch = client.patch(p._id);
  if (Object.keys(p.set).length) patch = patch.set(p.set);
  /**
   * One `unset` call with every path, never one per language: the client's
   * patch builder *assigns* the unset list rather than appending to it, so a
   * call per locale left only the last one standing. The 2026-10-27 run
   * removed the Dutch paragraph from all seven records and neither the
   * English nor the French one, which is how this came to light.
   */
  if (STRIP && p.strippable) {
    const paths = Object.entries(p.evidence).map(
      ([loc, ev]) => `bio.${loc}[_key=="${ev.key}"]`,
    );
    if (paths.length) patch = patch.unset(paths);
  }
  tx = tx.patch(patch);
  n += 1;
  if (n % 50 === 0) {
    await tx.commit({ visibility: 'async' });
    tx = client.transaction();
    console.log(`  committed ${n}/${plans.length}`);
  }
}
if (n % 50) await tx.commit({ visibility: 'async' });
console.log(`\nWrote ${plans.length} record(s)${STRIP ? ', link paragraph removed' : ''}.`);
console.log('Now run: npm run dates');
