#!/usr/bin/env node
/**
 * Cleans up the 2026 exhibitors the legacy import left half-done (Tiphaine,
 * WhatsApp 2026-09-24): the website and Instagram sit as the last paragraphs
 * of the bio, every gallery says "Brussels" (the old CMS only knew the fair's
 * city), the artists are not linked, and each picture's caption is one
 * "Artist, Work title, Year" string in the caption field.
 *
 * What it does, per 2026 exhibitor:
 *
 *   links     website / instagram from the link marks in the bio (all three
 *             locales agree); the link paragraphs come out of the bio, prose
 *             that shared a paragraph with them stays.
 *   name      the "(tr)" country codes the old site typed into the title come
 *             off the name; every code goes into countryCode (setIfMissing).
 *   captions  "Artist, Title, 2024" split into caption / workTitle / year on
 *             each figure; alt filled from the original string. Only figures
 *             whose workTitle and year are empty are touched.
 *   artists   artist documents created or reused and referenced from the
 *             exhibitor, from the names in the review file (see below).
 *   city      from the review file.
 *
 * The old site had no field for the gallery's city or its artists, so those
 * two cannot be derived - only guessed. The dry run therefore writes
 * scripts/data/exhibitors-2026-review.json with, per exhibitor, the city
 * candidates it found in the prose ("based in Paris") and the artist names it
 * read off the captions and the prose, each marked create / reuse. Check that
 * file by hand (set "city": "…", delete or fix artist entries), then --apply
 * reads it. An existing review file is never overwritten (--refresh does).
 *
 * Nothing an editor has set is overwritten: website, instagram, countryCode,
 * city and the caption parts are set only where empty, artist references are
 * appended, and the bio is rewritten only to drop the link paragraphs. A
 * document with an open draft gets the same patch on the draft. One
 * transaction, with a JSON backup of every touched document first, like
 * legacy-fill.mjs. Turn the Sanity deploy webhook off before --apply.
 *
 *   node scripts/fix-exhibitors-2026.mjs             dry run: report + review file
 *   node scripts/fix-exhibitors-2026.mjs --refresh   dry run, rewrite the review file
 *   node scripts/fix-exhibitors-2026.mjs --apply     write
 *   --only=links,name,captions,artists,city          narrow the steps
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const REFRESH = process.argv.includes('--refresh');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = new Set((onlyArg ? onlyArg.slice(7) : 'links,name,captions,artists,city').split(','));

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const LEGACY = path.join(ROOT, 'legacy-export', 'normalized', 'exhibitors.json');
const REVIEW = path.join(ROOT, 'scripts', 'data', 'exhibitors-2026-review.json');
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

/* ------------------------------------------------------------ helpers */

const LOCALES = ['en', 'fr', 'nl'];
const slugOf = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
const nameKey = (s) => slugOf(s).replace(/-/g, '');
const blockText = (b) => (b?.children ?? []).map((c) => c.text ?? '').join('');
const isInstagram = (href) => /instagram\.com\//i.test(href);
const isSocial = (href) => /(facebook|linkedin|tiktok|youtube|twitter|x)\.com\//i.test(href);
const DOMAIN_RE = /^(https?:\/\/)?(www\.)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
const HANDLE_RE = /^@[\w.]+$/;

function cleanUrl(raw) {
  let u = String(raw).trim().replace(/#$/, '');
  if (!/^https?:\/\//i.test(u)) u = `https://${u.replace(/^\/+/, '')}`;
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) if (/^(fbclid|utm_\w+|igsh|igshid|hl)$/i.test(k)) url.searchParams.delete(k);
    url.hash = '';
    // "https://x.com" stays as typed: URL adds a "/" to a bare host.
    return url.toString().replace(/\?$/, '').replace(/^(https?:\/\/[^/?]+)\/$/, '$1');
  } catch {
    return null;
  }
}
function handleOf(href) {
  const m = String(href).match(/instagram\.com\/([^/?#\s]+)/i);
  if (!m) return null;
  const h = m[1].replace(/^@/, '');
  return /^(p|reel|explore|accounts)$/i.test(h) ? null : h;
}

/** Website + instagram from every link mark in the bio, all locales. */
function linksFromBio(bio) {
  const hrefs = [];
  for (const loc of LOCALES) for (const b of bio?.[loc] ?? []) for (const d of b.markDefs ?? []) if (d.href) hrefs.push(d.href);
  const handles = [...new Set(hrefs.map(handleOf).filter(Boolean).map((h) => h.toLowerCase()))];
  const sites = [...new Set(hrefs.filter((h) => !isInstagram(h) && !isSocial(h)).map(cleanUrl).filter(Boolean).map((u) => u.toLowerCase()))];
  const instagram = hrefs.map(handleOf).find(Boolean) ?? null;
  const website = hrefs.filter((h) => !isInstagram(h) && !isSocial(h)).map(cleanUrl).find(Boolean) ?? null;
  return { website, instagram, hrefs, extra: [...sites.slice(1), ...handles.slice(1).map((h) => `@${h}`)] };
}

/**
 * The bio without its link paragraphs. A block that starts with linked
 * spans (or with a bare "@handle" / "domain.com") loses those; if prose
 * follows in the same block it stays, left-trimmed. Returns null when nothing
 * changes.
 */
function stripLinkBlocks(blocks) {
  if (!Array.isArray(blocks)) return null;
  let changed = false;
  const out = [];
  for (const b of blocks) {
    if (b._type !== 'block') {
      out.push(b);
      continue;
    }
    const linkKeys = new Set((b.markDefs ?? []).filter((d) => d._type === 'link' || d.href).map((d) => d._key));
    const children = [...(b.children ?? [])];
    let i = 0;
    let stripped = false;
    // Leading linked spans, and the whitespace between them.
    while (i < children.length) {
      const c = children[i];
      const linked = (c.marks ?? []).some((m) => linkKeys.has(m));
      const blank = !(c.text ?? '').trim();
      if (linked || (blank && stripped)) {
        i++;
        stripped = true;
      } else break;
    }
    // Or a bare handle / domain typed as text at the start of the block.
    if (!stripped && children.length) {
      const first = children[0].text ?? '';
      const m = first.match(/^\s*(\S+)(\s*)([\s\S]*)$/);
      if (m && (HANDLE_RE.test(m[1]) || (DOMAIN_RE.test(m[1]) && !/[,;:]$/.test(m[1])))) {
        children[0] = { ...children[0], text: m[3] };
        stripped = true;
      }
    }
    if (!stripped) {
      out.push(b);
      continue;
    }
    changed = true;
    const rest = children.slice(i);
    if (rest.length) rest[0] = { ...rest[0], text: (rest[0].text ?? '').replace(/^\s+/, '') };
    const text = rest.map((c) => c.text ?? '').join('').trim();
    if (!text) continue; // the whole paragraph was the link
    const used = new Set(rest.flatMap((c) => c.marks ?? []));
    out.push({ ...b, children: rest, markDefs: (b.markDefs ?? []).filter((d) => used.has(d._key)) });
  }
  return changed ? out : null;
}

/** "Ertugrul Güngör & Faruk Ertekin, Pise on Fire, 2025" → parts. */
const YEAR_RE = /^(c\.\s*)?\d{4}(\s*[–-]\s*(\d{2}|\d{4}))?$/;
function splitCaption(caption) {
  const parts = String(caption)
    .split(/\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const artist = parts.shift();
  let year;
  if (parts.length && YEAR_RE.test(parts[parts.length - 1])) year = parts.pop();
  const workTitle = parts.length ? parts.join(', ') : undefined;
  return { artist, workTitle, year };
}
const NAME_WORD = /^(?:[A-ZÀ-ÝŠŽ][\p{L}'’.-]*|de|da|del|della|van|von|der|den|le|la|du|el|y|e|&)$/u;
function looksLikeName(s) {
  const words = s.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 5 && !/\d/.test(s) && words.every((w) => NAME_WORD.test(w));
}
const splitPeople = (s) =>
  s
    .replace(/\s+(and|et|en)\s+/gi, ', ')
    .split(/\s*(?:,|&)\s*/)
    .map((x) => x.trim())
    .filter((x) => x && looksLikeName(x));

/**
 * Artist names read off the captions and the prose, with where each came
 * from. "caption" means the caption had a title or year after the name and
 * is reliable; "caption?" is a caption that was only words, so the title may
 * be glued to the name ("Shozo Michikawa Kohiki"); "prose?" is a name the
 * text mentions, which may be anyone. When an unsure name starts with a sure
 * one (from any exhibitor, or an existing artist document) the sure name
 * wins; near-identical spellings are flagged for the reviewer.
 */
function artistCandidates(doc, sureNames) {
  const found = new Map(); // key → { name, sources }
  const add = (name, source) => {
    const n = name.replace(/\s+/g, ' ').trim();
    if (!looksLikeName(n)) return;
    const k = nameKey(n);
    if (!found.has(k)) found.set(k, { name: n, sources: new Set() });
    found.get(k).sources.add(source);
  };
  for (const f of doc.images ?? []) {
    const cap = f.caption?.trim();
    if (!cap) continue;
    const sp = splitCaption(cap);
    if (!sp) continue;
    if (sp.workTitle || sp.year) for (const p of splitPeople(sp.artist)) add(p, 'caption');
    else if (looksLikeName(sp.artist)) for (const p of splitPeople(sp.artist)) add(p, 'caption?');
  }
  const prose = (doc.bio?.en ?? []).map(blockText).join(' ');
  for (const m of prose.matchAll(/\b(?:solo show|solo exhibition|duo show|works?|pieces|sculptures|ceramics|artists?)\s+(?:by|of|from)\s+([^.;:()]+)/gi)) {
    for (const p of splitPeople(m[1].replace(/\s+(?:at|in|for|during|alongside|with)\s+[\s\S]*$/i, ''))) add(p, 'prose?');
  }
  // An unsure name that begins with a sure one is that artist plus a title.
  for (const [k, x] of [...found]) {
    if (x.sources.has('caption')) continue;
    const sure = [...sureNames].find((s) => k !== s && k.startsWith(s));
    if (sure) {
      found.delete(k);
      const name = sureNames.get(sure);
      if (!found.has(sure)) found.set(sure, { name, sources: new Set() });
      for (const s of x.sources) found.get(sure).sources.add(s);
    }
  }
  const list = [...found.values()].map((x) => ({ name: x.name, sources: [...x.sources] }));
  // Two spellings of one person ("Claudi" / "Claude Casanovas"): the less
  // sure one points at the other.
  const sureness = (x) => (x.sources.includes('caption') ? 2 : x.sources.includes('caption?') ? 1 : 0);
  for (const a of list)
    for (const b of list) {
      if (a === b || editDistance(nameKey(a.name), nameKey(b.name)) > 2) continue;
      if (sureness(a) < sureness(b) || (sureness(a) === sureness(b) && a.name > b.name)) a.maybeSameAs = b.name;
    }
  return list;
}
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** The names every caption with a title or year vouches for, across all exhibitors, plus the artist documents. */
function sureNamesOf(docs, artists) {
  const sure = new Map(); // key → name
  for (const a of artists) if (a.name) sure.set(nameKey(a.name), a.name);
  for (const doc of docs)
    for (const f of doc.images ?? []) {
      const sp = f.caption ? splitCaption(f.caption.trim()) : null;
      if (sp && (sp.workTitle || sp.year)) for (const p of splitPeople(sp.artist)) sure.set(nameKey(p), p);
    }
  return sure;
}

/** "based in Paris", "located in Verbier", "founded in 2013 in Algeria" → guesses. */
function cityCandidates(doc) {
  const prose = (doc.bio?.en ?? []).map(blockText).join(' ');
  const out = new Set();
  for (const m of prose.matchAll(
    /\b(?:based|located|situated|established|founded|opened|settled|housed|headquartered)\b[^.;]{0,40}?\bin\s+(?:the\s+(?:heart|centre|center)\s+of\s+)?([A-ZÀ-Ý][\p{L}'’-]+(?:[\s-][A-ZÀ-Ý][\p{L}'’-]+){0,2})/gu,
  ))
    out.add(m[1]);
  return [...out];
}

/* -------------------------------------------------------------- data */

const legacy = JSON.parse(fs.readFileSync(LEGACY, 'utf8')).filter((e) => e.attrs?.year === 2026);
const legacyBySlug = new Map(legacy.map((e) => [e.slug?.en, e]));
const legacyByName = new Map(legacy.map((e) => [nameKey(String(e.title?.en ?? '').replace(/\s*\([a-z]{2}\)\s*/gi, ' ')), e]));

const docs = await client.fetch(
  `*[_type == "exhibitor" && !(_id in path("drafts.**")) && edition->year == 2026] | order(name) {
    _id, name, sortName, "slug": slug.current, kind, city, country, countryCode, website, instagram, bio, images, artists,
    "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
  }`,
);
const artistsAll = await client.fetch(`*[_type == "artist" && !(_id in path("drafts.**"))]{ _id, name }`);
const artistByKey = new Map(artistsAll.map((a) => [nameKey(a.name ?? ''), a]));
const existingIds = new Set(artistsAll.map((a) => a._id));

const sureNames = sureNamesOf(docs, artistsAll);
const showArg = process.argv.find((a) => a.startsWith('--show='));
const SHOW = new Set(showArg ? showArg.slice(7).split(',') : []);

let review = fs.existsSync(REVIEW) && !REFRESH ? JSON.parse(fs.readFileSync(REVIEW, 'utf8')) : null;
const reviewOut = {};
const warnings = [];
const plan = []; // { id, hasDraft, set, setIfMissing, unset, appendArtists, summary[] }
const newArtists = new Map(); // id → doc

for (const doc of docs) {
  const p = { id: doc._id, hasDraft: doc.hasDraft, set: {}, setIfMissing: {}, appendArtists: [], summary: [] };
  const leg = legacyBySlug.get(doc.slug) ?? legacyByName.get(nameKey(doc.name.replace(/\s*\([a-z]{2}\)\s*/gi, ' ')));
  if (!leg) warnings.push(`${doc._id}: no legacy record matched (slug ${doc.slug})`);

  /* links */
  if (ONLY.has('links')) {
    const { website, instagram, hrefs, extra } = linksFromBio(doc.bio);
    if (website && !doc.website) (p.setIfMissing.website = website), p.summary.push(`website ${website}`);
    if (instagram && !doc.instagram) (p.setIfMissing.instagram = instagram), p.summary.push(`instagram @${instagram}`);
    if (extra.length) warnings.push(`${doc._id}: one website and one handle per exhibitor - also in the bio, and dropped with it: ${extra.join(', ')}`);
    if (doc.instagram && !/^[\w.]+$/.test(doc.instagram)) warnings.push(`${doc._id}: instagram "${doc.instagram}" is not a handle (hand-typed?) - left as is`);
    if (website && doc.website && cleanUrl(doc.website) !== website) warnings.push(`${doc._id}: website kept "${doc.website}", bio says ${website}`);
    if (!hrefs.length) warnings.push(`${doc._id}: no links in the bio`);
    const bio = {};
    let bioChanged = false;
    for (const loc of LOCALES) {
      const stripped = stripLinkBlocks(doc.bio?.[loc]);
      if (stripped) (bio[loc] = stripped), (bioChanged = true);
      else if (doc.bio?.[loc]) bio[loc] = doc.bio[loc];
    }
    if (bioChanged) {
      p.set.bio = { ...doc.bio, ...bio };
      const dropped = LOCALES.map((l) => (doc.bio?.[l]?.length ?? 0) - (p.set.bio[l]?.length ?? 0));
      p.summary.push(`bio: link paragraphs out (en/fr/nl −${dropped.join('/')} blocks)`);
    }
    if (SHOW.has(doc._id)) {
      console.log(`\n=== ${doc._id}: bio before → after (--show)`);
      for (const loc of LOCALES) {
        const before = (doc.bio?.[loc] ?? []).map(blockText);
        const after = (p.set.bio?.[loc] ?? doc.bio?.[loc] ?? []).map(blockText);
        console.log(`  [${loc}] before:`);
        for (const t of before) console.log(`     | ${t.slice(0, 140)}`);
        console.log(`  [${loc}] after:`);
        for (const t of after) console.log(`     | ${t.slice(0, 140)}`);
      }
    }
  }

  /* name + country codes */
  if (ONLY.has('name')) {
    const codes = new Set();
    for (const src of [leg?.title?.en, doc.name]) for (const m of String(src ?? '').matchAll(/\(([a-z]{2})\)/gi)) codes.add(m[1].toUpperCase().replace(/^(UK|EN)$/, 'GB'));
    const clean = doc.name.replace(/\s*\([a-z]{2}\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
    if (clean !== doc.name) (p.set.name = clean), p.summary.push(`name "${doc.name}" → "${clean}"`);
    const code = doc.countryCode || [...codes][0] || (/^[A-Z]{2}$/.test(doc.country ?? '') ? doc.country : null);
    if (code && !doc.countryCode) (p.setIfMissing.countryCode = code), p.summary.push(`countryCode ${code}${codes.size > 1 ? ` (title also says ${[...codes].slice(1).join(', ')})` : ''}`);
  }

  /* captions */
  if (ONLY.has('captions') && Array.isArray(doc.images)) {
    let n = 0;
    const images = doc.images.map((f) => {
      if (!f.caption || f.workTitle || f.year) return f;
      const sp = splitCaption(f.caption);
      if (!sp || (!sp.workTitle && !sp.year)) return f.alt ? f : { ...f, alt: f.caption };
      n++;
      return { ...f, caption: sp.artist, ...(sp.workTitle ? { workTitle: sp.workTitle } : {}), ...(sp.year ? { year: sp.year } : {}), alt: f.alt || f.caption };
    });
    if (SHOW.has(doc._id)) {
      console.log(`\n=== ${doc._id}: figures before → after (--show)`);
      doc.images.forEach((f, i) => {
        const g = images[i];
        console.log(`  "${f.caption ?? ''}" → caption "${g.caption ?? ''}" | title "${g.workTitle ?? ''}" | year "${g.year ?? ''}" | alt "${g.alt ?? ''}"`);
      });
    }
    if (JSON.stringify(images) !== JSON.stringify(doc.images)) {
      p.set.images = images;
      p.summary.push(`captions split on ${n} of ${doc.images.length} figures${doc.images.some((f) => !f.caption) ? ` (${doc.images.filter((f) => !f.caption).length} have none)` : ''}`);
    }
  }

  /* review file: city + artists */
  const candidates = artistCandidates(doc, sureNames);
  const already = new Set((doc.artists ?? []).map((r) => r._ref));
  reviewOut[doc._id] = {
    name: doc.name,
    city: review?.[doc._id]?.city ?? '',
    cityCandidates: cityCandidates(doc),
    linkedAlready: [...already].map((id) => artistsAll.find((a) => a._id === id)?.name ?? id),
    artists:
      review?.[doc._id]?.artists ??
      candidates
        .filter((c) => !already.has(artistByKey.get(nameKey(c.name))?._id))
        .map((c) => {
          const hit = artistByKey.get(nameKey(c.name));
          return {
            name: c.name,
            from: c.sources.join('+'),
            ...(c.maybeSameAs ? { maybeSameAs: c.maybeSameAs } : {}),
            ...(hit ? { reuse: hit._id } : { create: `artist-${slugOf(c.name)}` }),
          };
        }),
  };

  if (review) {
    const r = review[doc._id];
    if (ONLY.has('city') && r?.city && r.city !== doc.city) (p.set.city = r.city), p.summary.push(`city "${doc.city ?? ''}" → "${r.city}"`);
    if (ONLY.has('artists'))
      for (const a of r?.artists ?? []) {
        if (a.skip || !a.name) continue;
        let id = a.reuse ?? artistByKey.get(nameKey(a.name))?._id;
        if (!id) {
          id = a.create ?? `artist-${slugOf(a.name)}`;
          if (!existingIds.has(id) && !newArtists.has(id)) newArtists.set(id, { _id: id, _type: 'artist', name: a.name, slug: { _type: 'slug', current: slugOf(a.name) } });
        }
        if (already.has(id) || p.appendArtists.some((x) => x._ref === id)) continue;
        p.appendArtists.push({ _key: `a${slugOf(a.name).replace(/-/g, '').slice(0, 12)}${id.length}`, _type: 'reference', _ref: id });
        p.summary.push(`artist ${a.name} (${newArtists.has(id) ? 'new' : 'existing'} ${id})`);
      }
  }

  if (p.summary.length) plan.push(p);
}

/* ------------------------------------------------------------- report */

for (const p of plan) {
  console.log(`\n${p.id}${p.hasDraft ? ' (has draft)' : ''}`);
  for (const s of p.summary) console.log(`  - ${s}`);
}
console.log(`\n${docs.length} exhibitors of 2026, ${plan.length} to change, ${newArtists.size} artist documents to create.`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
const noCity = Object.values(reviewOut).filter((r) => !r.city).length;
const noArtists = Object.values(reviewOut).filter((r) => !r.artists.length && !r.linkedAlready.length).length;

if (!APPLY) {
  fs.mkdirSync(path.dirname(REVIEW), { recursive: true });
  if (!review || REFRESH) {
    fs.writeFileSync(REVIEW, JSON.stringify(reviewOut, null, 2) + '\n');
    console.log(`\nReview file written: ${path.relative(ROOT, REVIEW)}`);
  } else console.log(`\nReview file kept: ${path.relative(ROOT, REVIEW)} (--refresh to regenerate)`);
  console.log(`  ${noCity} exhibitors without a city set, ${noArtists} without any artist. Fill "city", check "artists", then --apply.`);
  console.log('\nDry run - nothing written. --apply to write.');
  process.exit(0);
}

if (!review) {
  console.error(`\nNo review file at ${path.relative(ROOT, REVIEW)} - run the dry run first, check it, then --apply.`);
  process.exit(1);
}

/* -------------------------------------------------------------- write */

const ids = plan.flatMap((p) => (p.hasDraft ? [p.id, `drafts.${p.id}`] : [p.id]));
const backup = await client.fetch(`*[_id in $ids]`, { ids });
fs.mkdirSync(BACKUPS, { recursive: true });
const backupFile = path.join(BACKUPS, `fix-exhibitors-2026-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
console.log(`\nBackup of ${backup.length} documents: ${path.relative(ROOT, backupFile)}`);

const tx = client.transaction();
for (const a of newArtists.values()) tx.createIfNotExists(a);
for (const p of plan) {
  for (const id of p.hasDraft ? [p.id, `drafts.${p.id}`] : [p.id]) {
    let patch = client.patch(id);
    if (Object.keys(p.set).length) patch = patch.set(p.set);
    if (Object.keys(p.setIfMissing).length) patch = patch.setIfMissing(p.setIfMissing);
    if (p.appendArtists.length) patch = patch.setIfMissing({ artists: [] }).append('artists', p.appendArtists);
    tx.patch(patch);
  }
}
const result = await tx.commit({ visibility: 'sync' });
console.log(`Written: ${result.results.length} documents, transaction ${result.transactionId}.`);
