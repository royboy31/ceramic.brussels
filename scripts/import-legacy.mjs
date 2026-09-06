#!/usr/bin/env node
/**
 * Imports the content captured from the old Twill CMS into Sanity.
 *
 *   node scripts/import-legacy.mjs --dry               plan only, write nothing
 *   node scripts/import-legacy.mjs                     write documents, no images
 *   node scripts/import-legacy.mjs --images            also upload the images
 *   node scripts/import-legacy.mjs --images --max-width=2000
 *   node scripts/import-legacy.mjs --only=people,partners
 *
 * Source: legacy-export/ (see legacy-export/MAPPING.md). The old CMS stored
 * everything as a page with an ordered list of blocks; this promotes those
 * blocks to the documents the new model expects - a `person` block becomes a
 * person, an `event` block becomes a programmeEvent, and so on.
 *
 * Nothing is deleted and nothing is overwritten wholesale. Document ids are
 * deterministic, and when a document with the same name already exists (the
 * seeded `demo-*` content does, and some of it holds 2026/2027 content the old
 * site never had) the importer patches THAT document instead of creating a
 * near-duplicate beside it. Only fields this script knows about are set.
 *
 * Images are uploaded once each and cached in legacy-export/asset-map.json, so
 * a second run neither re-uploads nor duplicates them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { localeHtmlToBlocks, htmlToText } from './lib/html-to-portable-text.mjs';

/* --------------------------------------------------------------- plumbing */

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
const dry = process.argv.includes('--dry');
const withImages = process.argv.includes('--images');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim()) : null;
const widthArg = process.argv.find((a) => a.startsWith('--max-width='));
const maxWidth = widthArg ? Number(widthArg.slice(12)) : 0;
const wants = (name) => !only || only.includes(name);

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET;
const token = env.SANITY_API_WRITE_TOKEN;
if (!projectId || !dataset || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}
const client = createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });

const EXPORT = 'legacy-export';
const N = (f) => JSON.parse(fs.readFileSync(path.join(EXPORT, 'normalized', `${f}.json`), 'utf8'));
const D = (f) => JSON.parse(fs.readFileSync(path.join(EXPORT, 'derived', `${f}.json`), 'utf8'));

const t = (v, l = 'en') => (v && typeof v === 'object' ? v[l] ?? v.en ?? v.fr ?? v.nl ?? '' : v ?? '');
const text = (v) => htmlToText(t(v));
const COMBINING = /[̀-ͯ]/g;
const slugOf = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(COMBINING, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const key = (s) =>
  String(s ?? '').replace(/<[^>]*>/g, ' ').toLowerCase().normalize('NFD').replace(COMBINING, '')
    .replace(/\((?:[a-z]{2})\)\s*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Daria Kowalewska (pl)" -> { name, countryCode } */
const splitCountry = (s) => {
  const m = String(s).match(/^(.*?)\s*\(([a-z]{2})\)\s*$/i);
  return m ? { name: m[1].trim(), countryCode: m[2].toLowerCase() } : { name: String(s).trim(), countryCode: null };
};
const localeString = (v) => {
  if (!v) return null;
  if (typeof v !== 'object') return { en: htmlToText(v) };
  const out = {};
  for (const l of ['en', 'fr', 'nl']) if (v[l]) out[l] = htmlToText(v[l]);
  return Object.keys(out).length ? out : null;
};
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== '' &&
  !(Array.isArray(v) && !v.length) &&
  !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)));

/* ------------------------------------------------------------------ state */

const stats = {};
const bump = (k, n = 1) => (stats[k] = (stats[k] ?? 0) + n);
const plan = [];
let live = [];
const ASSET_MAP = path.join(EXPORT, 'asset-map.json');
const assetMap = fs.existsSync(ASSET_MAP) ? JSON.parse(fs.readFileSync(ASSET_MAP, 'utf8')) : {};

/** Ids already spoken for in this plan, so two records never target one document. */
const claimed = new Set();

/** Existing doc of `type` whose name matches, so we patch rather than duplicate. */
function findExisting(type, name, extra) {
  const k = key(name);
  if (!k) return null;
  return live.find((d) => d._type === type && !claimed.has(d._id) && (!extra || extra(d)) &&
    [d.name, d.title].some((v) => key(typeof v === 'object' && v ? v.en : v) === k)) ?? null;
}
function add(type, preferredId, name, fields, matchExtra) {
  const hit = findExisting(type, name, matchExtra);
  let id = hit ? hit._id : preferredId;
  // A source-side duplicate (same name, same edition) must not silently
  // overwrite the record that got there first.
  if (claimed.has(id)) {
    let n = 2;
    while (claimed.has(`${id}-${n}`)) n++;
    id = `${id}-${n}`;
    bump(`${type}:duplicate-name`);
  }
  claimed.add(id);
  plan.push({ id, type, action: hit ? 'patch' : 'create', label: text(name) || preferredId, doc: drop(fields) });
  bump(`${type}:${hit ? 'patch' : 'create'}`);
  return id;
}

/** The edition year an existing document is scoped to, via its edition ref. */
function docYear(d) {
  const ed = live.find((x) => x._id === (d.edition && d.edition._ref));
  return ed ? ed.year : null;
}
/** Match only within the same edition: "The jury prize" exists for several years. */
const sameEdition = (year) => (d) => docYear(d) === year;

/* ----------------------------------------------------------------- images */

async function uploadImage(media) {
  if (!media || !media.url) return null;
  if (assetMap[media.id]) return assetMap[media.id];
  if (dry || !withImages) return null;
  // The old site serves resized derivatives, so a 6700px original need not be
  // moved in full. Sanity generates its own responsive sizes from whatever we
  // upload, and legacy-export keeps every original URL for a later re-fetch.
  const resized = maxWidth && media.width > maxWidth ? `${media.url}?w=${maxWidth}` : null;
  let res = resized ? await fetch(resized) : null;
  // The old resizer answers 500 for a handful of files (1152 and 1344 in the
  // 2025 exhibitor galleries). The original still downloads, so take that
  // rather than leave the figure empty.
  if (!res || !res.ok) {
    if (res) console.warn(`\n  ! image ${media.id} resized HTTP ${res.status}, fetching original`);
    res = await fetch(media.url);
  }
  if (!res.ok) { bump('image:failed'); console.warn(`\n  ! image ${media.id} HTTP ${res.status}`); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload('image', buf, { filename: media.filename || `${media.id}.jpg` });
  assetMap[media.id] = asset._id;
  fs.writeFileSync(ASSET_MAP, JSON.stringify(assetMap, null, 2));
  bump('image:uploaded');
  return asset._id;
}
async function figure(media, extra = {}) {
  if (!media) return null;
  bump('figure:referenced');
  const assetId = await uploadImage(media);
  if (!assetId) return null;
  return drop({
    _type: 'figure',
    asset: { _type: 'reference', _ref: assetId },
    alt: text(media.alt) || null,
    caption: text(media.caption) || null,
    ...extra,
  });
}
async function figures(list) {
  const out = [];
  for (const m of list || []) {
    const f = await figure(m);
    if (f) out.push({ ...f, _key: `img${m.id}` });
  }
  return out;
}

/* ------------------------------------------------------------- editions */

const editionRef = {};
const refEdition = (year) => (editionRef[year] ? { _type: 'reference', _ref: editionRef[year] } : null);

/** pastEditions is a tree whose depth-0 nodes are the years. */
const peYear = new Map();
function buildEditionIndex() {
  for (const d of live.filter((x) => x._type === 'edition')) if (d.year) editionRef[d.year] = d._id;
  const pe = N('pastEditions');
  const roots = new Map(pe.filter((r) => r.depth === 0).map((r) => [r.id, parseInt(text(r.title), 10)]));
  for (const r of pe) peYear.set(r.id, r.depth === 0 ? roots.get(r.id) : roots.get(r.parentId));
}
/** Current-site records describe the upcoming edition unless a year is named. */
function yearOf(rec) {
  if (rec.fromModule === 'pastEditions') return peYear.get(rec.pageId) || null;
  const m = String(rec.fromPage || '').match(/20\d\d/);
  return m ? +m[0] : 2027;
}

/* ------------------------------------------------------------- the mapping */

async function importPeople() {
  const merged = new Map();
  for (const p of D('people')) {
    if (!p.name) continue;
    const k = key(p.name);
    const group = /advisory/i.test(p.fromPage) ? 'advisory-board'
      : /jury/i.test(p.fromPage) ? 'jury'
      : /team|founder/i.test(p.fromPage) ? 'team'
      : 'collaborator';
    const cur = merged.get(k) || { name: p.name, groups: new Set(), years: new Set(), role: null, bio: null, portrait: null };
    cur.groups.add(group);
    const y = yearOf(p); if (y) cur.years.add(y);
    if (!cur.role) cur.role = p.role;
    if (!cur.bio) cur.bio = p.bio;
    if (!cur.portrait) cur.portrait = p.portrait;
    merged.set(k, cur);
  }
  for (const p of merged.values()) {
    const { name } = splitCountry(p.name);
    add('person', `person-${slugOf(name)}`, name, {
      _type: 'person',
      name,
      groups: [...p.groups],
      role: localeString(p.role),
      bio: localeHtmlToBlocks(p.bio, `p${slugOf(name)}`),
      portrait: await figure(p.portrait ? { ...p.portrait, alt: name } : null),
      edition: refEdition(p.years.size ? Math.max(...p.years) : 2027),
    });
  }
}

async function importPartners() {
  /** Old-site page -> PARTNER_TIERS value (src/lib/options.ts). */
  const tierOf = (page) => {
    const s = String(page).toLowerCase();
    if (s.includes('main partner')) return 'main';
    if (s.includes('institution')) return 'institutional';
    if (s.includes('hotel')) return 'hotel';
    if (s.includes('exhibition pass')) return 'exhibition-pass';
    if (s.includes('media')) return 'media';
    if (s.includes('food') || s.includes('drink') || s.includes('coffee')) return 'food-drinks';
    if (s.includes('prize') || s.includes('award')) return 'art-prize';
    if (s.includes('logistic') || s.includes('insurance') || s.includes('furniture') ||
        s.includes('apparel') || s.includes('corporate')) return 'supplier';
    if (s.includes('partner') || s.includes('collab')) return 'event';
    return null;
  };
  const rows = D('partners');
  const merged = new Map();
  for (const p of rows.filter((x) => x.name)) {
    const k = key(p.name);
    const cur = merged.get(k) || { name: p.name, subtitle: p.subtitle, description: p.description, logos: [], tiers: new Set(), years: new Set() };
    cur.logos.push(...p.logos);
    const tier = tierOf(p.fromPage); if (tier) cur.tiers.add(tier);
    const y = yearOf(p); if (y) cur.years.add(y);
    if (!cur.subtitle) cur.subtitle = p.subtitle;
    if (!cur.description) cur.description = p.description;
    merged.set(k, cur);
  }
  for (const p of merged.values()) {
    const { name } = splitCountry(p.name);
    const logo = p.logos[0];
    add('partner', `partner-${slugOf(name)}`, name, {
      _type: 'partner',
      name,
      tier: [...p.tiers][0] || null,
      subtitle: localeString(p.subtitle),
      description: localeHtmlToBlocks(p.description, `pt${slugOf(name)}`),
      logo: await figure(logo ? { ...logo, alt: name } : null),
      url: text(logo && logo.link) || null,
      editions: [...p.years].map((y) => refEdition(y)).filter(Boolean).map((r, i) => ({ ...r, _key: `ed${i}` })),
    });
  }
  // Logo grids carry no name in the CMS; recover what we can from the filename.
  const guess = (u) => decodeURIComponent(String(u).split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '')
    .replace(/^logo[-_ ]*/i, '').replace(/[-_]+/g, ' ').trim();
  const unmatched = [];
  for (const p of rows.filter((x) => !x.name)) {
    for (const l of p.logos) {
      const g = guess(l.url);
      if (findExisting('partner', g)) bump('partner:logo-matched');
      else { bump('partner:logo-unmatched'); unmatched.push({ guess: g, page: p.fromPage, url: l.url, link: t(l.link) }); }
    }
  }
  if (unmatched.length) fs.writeFileSync(path.join(EXPORT, 'unmatched-logos.json'), JSON.stringify(unmatched, null, 2));
}

/**
 * The old site has stale translations: on the 2027 laureates page the English
 * bio is the 2027 artist while the French and Dutch are still the 2026 one.
 * Importing those verbatim would publish the wrong person's biography, so a
 * locale is dropped when its text names a *different* laureate from the same
 * page. The site falls back to English for an empty translation, which is the
 * right outcome until an editor writes the real one.
 */
const staleTranslations = [];
function dropStaleLocales(value, ownName, otherNames, where) {
  if (!value || typeof value !== 'object') return value;
  const own = key(ownName).split(' ').filter((w) => w.length > 3);
  const out = {};
  for (const [loc, html] of Object.entries(value)) {
    const txt = key(htmlToText(html));
    const namesOther = otherNames.some((o) => {
      const parts = key(o).split(' ').filter((w) => w.length > 3);
      return parts.length && parts.every((w) => txt.includes(w));
    });
    const namesOwn = own.length && own.some((w) => txt.includes(w));
    if (namesOther && !namesOwn) {
      staleTranslations.push({ where, name: ownName, locale: loc, text: htmlToText(html).slice(0, 120) });
      bump('translation:stale-dropped');
      continue;
    }
    out[loc] = html;
  }
  return Object.keys(out).length ? out : null;
}

async function importArtistsAndLaureates() {
  const runs = D('laureates-awards');
  const isAward = (r) => /award/i.test(r.fromPage);
  // Compare against every laureate the fair has ever had, not just the ones on
  // the same page: the stale French on the 2027 page is the 2026 cohort, who
  // live on a different page entirely.
  // Only artist names belong in this set. Award headings are institution names
  // ("Ceramic Art Andenne"), and a laureate citation legitimately says
  // "winner of the Ceramic Art Andenne award" - that is not a stale translation.
  const everyName = [...new Set(runs.filter((r) => !isAward(r)).map((r) => splitCountry(r.heading).name))]
    .concat(live.filter((d) => d._type === 'artist').map((d) => d.name))
    .filter(Boolean);
  const others = (r) => {
    const own = key(splitCountry(r.heading).name);
    return everyName.filter((n) => key(n) !== own);
  };

  for (const r of runs.filter((x) => !isAward(x))) {
    const { name, countryCode } = splitCountry(r.heading);
    if (!name) continue;
    const year = yearOf(r);
    const artistId = add('artist', `artist-${slugOf(name)}`, name, drop({
      _type: 'artist',
      name,
      slug: { _type: 'slug', current: slugOf(name) },
      countryCode: countryCode ? countryCode.toUpperCase() : null,
    }));
    if (!wants('laureates') || !year) continue;
    plan.push({
      id: `laureate-${year}-${slugOf(name)}`, type: 'laureate', action: 'create', label: `${name} ${year}`,
      doc: drop({
        _type: 'laureate',
        artist: { _type: 'reference', _ref: artistId },
        edition: refEdition(year),
        statement: localeHtmlToBlocks(
          dropStaleLocales(r.text, name, others(r), `laureate ${year}`), `l${slugOf(name)}`),
        images: await figures(r.images),
      }),
    });
    bump('laureate:create');
  }

  for (const r of runs.filter(isAward)) {
    const { name } = splitCountry(r.heading);
    if (!name) continue;
    const year = yearOf(r);
    const partner = findExisting('partner', name);
    add('award', `award-${year}-${slugOf(name)}`, name, {
      _type: 'award',
      name: { en: name },
      family: /jury prize/i.test(name) ? 'art-prize' : 'fair',
      edition: refEdition(year),
      partner: partner ? { _type: 'reference', _ref: partner._id } : null,
      description: localeHtmlToBlocks(
        dropStaleLocales(r.text, name, others(r), `award ${year}`), `a${slugOf(name)}`),
      image: await figure(r.images && r.images[0]),
    }, sameEdition(year));
  }
}

async function importExhibitors() {
  for (const e of N('exhibitors')) {
    const raw = text(e.title);
    if (!raw) continue;
    const year = e.attrs.year || 2026;
    const { name, countryCode } = splitCountry(raw);
    // The old `category` is two things at once: a kind, and whether the gallery
    // is part of the country focus. EXHIBITOR_KINDS has no "focus" value.
    const category = String(e.attrs.category || '').toLowerCase();
    const inCountryFocus = category.startsWith('focus');
    const kind = category.includes('editor') || category.includes('book') ? 'publisher'
      : category.includes('jury prize') ? 'jury-prize'
      : /^>>|tribute/i.test(raw) ? 'tribute'
      : 'gallery';
    add('exhibitor', `exhibitor-${year}-${slugOf(name)}`, name, {
      _type: 'exhibitor',
      name,
      slug: { _type: 'slug', current: slugOf(name) },
      edition: refEdition(year),
      booth: e.attrs.booth || null,
      city: e.attrs.city || null,
      country: countryCode ? countryCode.toUpperCase() : null,
      kind,
      inCountryFocus: inCountryFocus || null,
      bio: localeHtmlToBlocks(e.description, `x${year}${slugOf(name)}`),
      images: await figures(e.media),
    }, sameEdition(year));
  }
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function eventDate(heading, hour, year) {
  const h = text(heading && heading.title);
  const dm = h.match(/(\d{1,2})\s*([a-z]{3})/i);
  if (!dm || !hour || !year) return null;
  const month = MONTHS[dm[2].toLowerCase()];
  if (month === undefined) return null;
  const parts = String(hour).split(':').map(Number);
  const d = new Date(Date.UTC(year, month, +dm[1], parts[0] || 0, parts[1] || 0));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function importEvents() {
  let i = 0;
  for (const e of D('events')) {
    if (!e.title) continue;
    i++;
    const year = yearOf(e);
    const invitationOnly = /invitation|uitnodiging/i.test(JSON.stringify(e.dayHeading || ''));
    add('programmeEvent', `event-${year}-${slugOf(e.title)}-${i}`, e.title, {
      _type: 'programmeEvent',
      title: { en: e.title },
      slug: { _type: 'slug', current: slugOf(e.title) },
      edition: refEdition(year),
      startsAt: eventDate(e.dayHeading, e.start, year),
      endsAt: eventDate(e.dayHeading, e.end, year),
      description: localeHtmlToBlocks(e.description, `e${i}`),
      invitationOnly: invitationOnly || null,
      image: await figure(e.image),
    }, sameEdition(year));
  }
}

/* -------------------------------------------------------------------- run */

(async () => {
  live = await client.fetch('*[!(_id in path("drafts.**"))]');
  buildEditionIndex();
  console.log(`Dataset ${projectId}/${dataset}: ${live.length} existing documents`);
  console.log(`Editions: ${Object.entries(editionRef).map(([y, id]) => `${y} -> ${id}`).join(', ') || 'none'}`);
  console.log(`Images: ${withImages ? 'uploading' : 'skipped (pass --images)'}\n`);

  if (wants('people')) await importPeople();
  if (wants('partners')) await importPartners();
  if (wants('artists') || wants('laureates') || wants('awards')) await importArtistsAndLaureates();
  if (wants('exhibitors')) await importExhibitors();
  if (wants('events')) await importEvents();

  console.log('Plan:');
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(28)} ${v}`);
  if (staleTranslations.length) {
    fs.writeFileSync(path.join(EXPORT, 'stale-translations.json'), JSON.stringify(staleTranslations, null, 2));
    console.log(`\n${staleTranslations.length} stale translations left out (the old site still had the previous`);
    console.log(`year's text there) -> legacy-export/stale-translations.json`);
  }
  const byId = new Map();
  for (const p of plan) byId.set(p.id, (byId.get(p.id) || 0) + 1);
  const collisions = [...byId].filter(([, n]) => n > 1);
  if (collisions.length) {
    console.error(`\nRefusing to continue: ${collisions.length} document ids are targeted more than once`);
    for (const [id] of collisions.slice(0, 10)) console.error(`  ${id}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(EXPORT, 'import-plan.json'), JSON.stringify(plan, null, 2));
  console.log(`\n${plan.length} documents planned -> legacy-export/import-plan.json`);

  if (dry) { console.log('\n--dry: nothing written.'); return; }

  let n = 0;
  for (let i = 0; i < plan.length; i += 50) {
    const tx = client.transaction();
    for (const p of plan.slice(i, i + 50)) {
      // `_type` is fixed at creation; including it in the patch would try to
      // change the type of a document that already exists.
      const { _type, ...fields } = p.doc;
      tx.createIfNotExists({ _id: p.id, _type: p.type });
      tx.patch(p.id, (patch) => patch.set(fields));
      n++;
    }
    await tx.commit({ visibility: 'async' });
    process.stdout.write(`\r  written ${n}/${plan.length}`);
  }
  console.log(`\nDone. ${n} documents written.`);
})().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
