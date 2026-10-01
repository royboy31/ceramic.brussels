#!/usr/bin/env node
/**
 * Fills the image fields the site had been covering with stand-ins, so the
 * Studio shows what the site shows (docs: the 2026-09-11 audit of
 * src/lib/placeholders.ts and the other fallbacks).
 *
 * Steps, each one opt-in with --only (default: hero,film,events,editions):
 *   hero      homepage.heroImage      the design's home-hero, already an asset
 *   film      homepage video block    the film the query was borrowing
 *   events    6 current programme events (talks, vip) - the picture each one shows today
 *   editions  edition.cover           --editions=site (today's stand-in, default)
 *                                     or --editions=real (the year's own photo for 2024/2025)
 *   news      newsItem.cover          today's stand-in; ALSO adds a cover on each article page
 *   artists   artist.portrait         real portraits from the old site - never the
 *                                     stand-ins, which are the advisory board's photos
 *   works     artist.portrait         for artists with no portrait anywhere: a photo of
 *                                     their own work, captioned as such
 *
 * Stand-ins are resolved exactly as src/lib/placeholders.ts picks them (same
 * hash, same seed) and mapped to the design asset each file was cut from, so
 * a filled slot renders the picture it rendered before.
 *
 * Every write is setIfMissing: nothing an editor has set is overwritten. A
 * document with an open draft gets the same patch on the draft, so publishing
 * that draft later does not drop the image. All patches go in one transaction.
 * New uploads (only --editions=real and artists) are cached in
 * legacy-export/asset-map.json by legacy media id, like the importer does.
 *
 *   node scripts/fill-missing-images.mjs                       dry run
 *   node scripts/fill-missing-images.mjs --write
 *   node scripts/fill-missing-images.mjs --only=artists --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const write = process.argv.includes('--write');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = new Set((onlyArg ? onlyArg.slice(7) : 'hero,film,events,editions').split(','));
const editionsMode = (process.argv.find((a) => a.startsWith('--editions=')) ?? '--editions=site').slice(11);
if (!['site', 'real'].includes(editionsMode)) throw new Error('--editions must be site or real');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const MAP = path.join(ROOT, 'legacy-export', 'asset-map.json');
const LIBRARY = path.join(ROOT, 'legacy-export', 'normalized', 'media-library.json');

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

/* ---------------------------------------------------------------- assets */

const HOME_HERO = 'image-ff4b056e9986ad51468d16720f95539a0f9fc610-3600x2400-jpg';

/**
 * public/assets/ph/fair-N → the design asset it was cut from (matched by
 * image comparison; fair-5 is video-fair-alt at 434px).
 */
const FAIR = [
  { asset: 'image-09676f56e403b6c67ec07e2e02dfe1b323d8af66-3840x2561-jpg', alt: 'Visitors at ceramic brussels' },
  { asset: 'image-a0444ff3229ea44534fbb287ef1c4f93f223bd2d-670x447-png', alt: 'ceramic brussels entrance at Tour & Taxis', credit: 'Martin Pilette Prod' },
  { asset: 'image-0150aa40ad3c84d8a133ae78dc61cdd9155be568-907x605-png', alt: 'The art prize exhibition at ceramic brussels 2026', credit: 'Geoffrey Fritsch' },
  { asset: 'image-f79c365aeb08c8d31a917782a90915e1e32f28b2-670x447-png', alt: 'The art prize exhibition at ceramic brussels 2026', credit: 'Martin Pilette Prod' },
  { asset: 'image-bef3ceed5e3031d01eb14c09621d2fe517506092-670x447-png', alt: 'The art prize exhibition at ceramic brussels 2026', credit: 'Martin Pilette Prod' },
  { asset: 'image-922f21858e845873da6f6583a725f6d1ff474570-2048x1365-jpg', alt: 'ceramic brussels fair interior' },
  { asset: 'image-a5399b30bbd9fac876917ea575f4fa3772cd0199-670x447-png', alt: 'Work by Marie Pic at ceramic brussels 2026', credit: 'Geoffrey Fritsch' },
];

/** The same hash and modulo as src/lib/placeholders.ts. */
function standIn(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return FAIR[Math.abs(h) % FAIR.length];
}

/** Old-site photos of each fair, for --editions=real (legacy media ids). */
const EDITION_PHOTOS = {
  2024: { mid: 910, alt: 'ceramic brussels 2024 at Tour & Taxis', credit: 'Geoffrey Fritsch' },
  2025: { mid: 1615, alt: 'ceramic brussels 2025 at Tour & Taxis' },
};

/**
 * Real portraits. Either the artist's name and "portrait" are in the old
 * site's filename, or the file sat in that artist's own laureate block (and
 * the block's text is about that artist). The laureates whose old blocks
 * carried another artist's text - Daria Kowalewska, Jules Bouteleux,
 * Sojeong You - are left out on purpose, as is anyone without a portrait.
 * `mid` = legacy media id still to upload; `asset` = already in Sanity.
 */
const PORTRAITS = [
  ['artist-antoine-moulinard', 'Antoine Moulinard', { asset: 'image-7ba2908d7b3911831fcb5c2b71afa3094f4ab50e-1000x1500-jpg' }],
  ['artist-asya-marakulina', 'Asya Marakulina', { asset: 'image-8e08c38d02d598215e6dd433048407503e70888c-4480x6720-jpg' }],
  ['artist-audrey-ballacchino', 'Audrey Ballacchino', { asset: 'image-43f322cc89065e05f64cf225dd8cf6d42f6db364-1000x1500-jpg' }],
  ['artist-damien-fragnon', 'Damien Fragnon', { asset: 'image-2cde615d355532f03aa32716649c61f53bea7e9c-2500x1667-jpg', credit: 'Elise Ortiou Campion' }],
  ['artist-duo-vertigo-nitsa-meletopoulos-fr-victor-alarcon', 'Nitsa Meletopoulos and Victor Alarçon (Duo Vertigo)', { asset: 'image-401ced6c63fb18e3118c264f2625633f215df5ff-2500x1600-jpg', credit: 'Edouard Roussel' }],
  ['artist-elsa-guillaume', 'Elsa Guillaume', { asset: 'image-f00abf1ab2a93126894a6065240aca24bfab296d-1125x1500-jpg', credit: 'Ernest William' }],
  ['artist-eleonore-griveau', 'Eléonore Griveau', { asset: 'image-75a44098dee962cd1bf52a0d50f0365d983cea26-3388x5082-jpg' }],
  ['artist-francois-bauer', 'François Bauer', { asset: 'image-3b16b3e783f06180e11fc5b99cd23e7103de1b9a-1125x1500-jpg' }],
  ['artist-inup-park', 'Inup Park', { asset: 'image-612bd34c8d40e6534f96da8013ef1dfd11cf67ab-1064x1500-jpg', credit: 'Sung Hoon Kim' }],
  ['artist-joke-raes', 'Joke Raes', { asset: 'image-b64b4a7d448e4ca95cb59278323163233c0da1fb-2500x1666-jpg', credit: 'Alex Vanhee' }],
  ['artist-jonas-moenne', 'Jonas Moënne', { asset: 'image-ab690ea259b67368f08a457a7ead4b8a34479e4e-1125x1500-jpg', credit: 'Vincent Everarts' }],
  ['artist-ming-miao-ko', 'Ming-Miao Ko', { asset: 'image-6ed09d44168b3b41b43ee8305a6cc5075fd00da0-1100x1500-jpg' }],
  ['artist-pascale-robert', 'Pascale Robert', { asset: 'image-d89a969ae0661f579842f3d56880cb025587e1ac-5584x8368-jpg' }],
  ['artist-raphael-emine', 'Raphaël Emine', { asset: 'image-4660b29ebf156667e7ba1ba2621ec6ff7355ed1b-1000x1500-jpg' }],
  ['artist-ioulia-chante', 'Ioulia Chante', { asset: 'image-03c472c5cd09b99883c7880519cf2d3e0f2c9771-4000x5000-jpg' }],
  ['artist-luna-isola-bersanetti', 'Luna-Isola Bersanetti', { asset: 'image-57d6213fa1c4c296bb7d78b437978701c5a39b25-6014x4048-png' }],
  ['demo-artist-leonore-chastagner', 'Léonore Chastagner', { asset: 'image-465e4c31bdce6f728d92ce1e4611f10ba1eed4de-4608x3072-jpg' }],
  ['artist-maelle-dufour', 'Maëlle Dufour', { asset: 'image-bc932c328821ba0a5c802b37592df7ab4c8c5c9a-1500x2250-jpg', credit: 'Ithier Held' }],
  ['artist-camilla-hanney', 'Camilla Hanney', { asset: 'image-93c7e0cc0c70aa87b76a7e1c3d8965d620d452ce-1920x1200-jpg' }],
  ['demo-artist-elmar-trenkwalder', 'Elmar Trenkwalder', { mid: 1972 }],
  ['demo-artist-walter-yu', 'Walter Yu', { mid: 1908 }],
  ['demo-artist-angelika-stefaniak', 'Angelika Stefaniak', { mid: 1874, credit: 'Kajo Aftyka' }],
  // Second pass: legacy uploads stored under numeric names, found through the media library.
  ['demo-artist-johan-creten', 'Johan Creten', { asset: 'image-7b37f0d2bd4f2c017b6ed3213d677770d7bd9791-1000x1500-jpg' }],
  ['demo-artist-lorie-ballage', 'Lorie Ballage', { asset: 'image-12c7a2bbdd835f33465b456711e9c8057e2b5987-2250x3000-jpg', credit: 'Lumir' }],
  ['demo-artist-kira-frose', 'Kira Fröse', { asset: 'image-fe319e0aac43b59013cd6344006c185239a0ec9a-3264x4912-jpg' }],
  ['artist-pia-mougeot', 'Pia Mougeot', { asset: 'image-8e8c0c10a83685b732cb97f259819fd8f76d2cae-1536x2048-jpg' }],
  ['artist-dominik-adamec', 'Dominik Adamec', { asset: 'image-6473a83bd8bd2cbd34fafccf6c527b9de71aa14c-1536x2048-jpg' }],
];

/**
 * Artists with no portrait in the old site or the design: one of their own
 * works instead, named in the file (or captioned in the design), so it is
 * theirs and says so. Daria Kowalewska, Sojeong You and Santiago
 * Insignares-Martínez have nothing that can be attributed and stay empty.
 */
const WORKS = [
  ['demo-artist-barry-wolfryd', 'Barry Wolfryd', { asset: 'image-27529fe25a941500ff785e713381754c11a4ceae-2237x3082-jpg', workTitle: 'A Drop in the Bucket', year: '2023' }],
  ['artist-beatrice-guilleman', 'Béatrice Guilleman', { asset: 'image-709a6e086e4439821d889f6aaf6f8504b28742e0-1969x2953-jpg' }],
  ['demo-artist-danny-cremers', 'Danny Cremers', { asset: 'image-cf27e29e1ffa43fe4d6af3c9abcfe777eb2b2965-4000x5000-jpg', workTitle: 'Vase' }],
  ['demo-artist-frederique-fleury', 'Frédérique Fleury', { asset: 'image-3ead7460409531b23fb49f9163f0963c38d119b7-2362x2953-jpg' }],
  ['demo-artist-heidi-bj-rgan', 'Heidi Bjørgan', { asset: 'image-91a7ccc7f8ed19279c0aa25c80607215ac4feef1-2500x1667-jpg', workTitle: 'Object 00684', year: '2024', credit: 'Thor Brødreskift' }],
  ['demo-artist-janis-lohrer', 'Janis Löhrer', { asset: 'image-bacc38fac58e0c258a6e3673e4b9d1d202781514-2500x3333-jpg', workTitle: 'Schild', year: '2025', credit: 'Johannes Bendzulla' }],
  ['artist-jules-bouteleux', 'Jules Bouteleux', { asset: 'image-228be084c5fd4de015d99b790463d433e5a1cda4-5152x6869-jpg', workTitle: 'Echaffaudage lourd', year: '2023', credit: 'Arsenic galerie' }],
  ['demo-artist-ninon-hivert', 'Ninon Hivert', { asset: 'image-a80165fdc056e73e6632c17beebbded1ac5e6853-3872x2592-jpg', workTitle: 'Personnes', year: '2021', credit: 'Misha Zavalny' }],
  ['demo-artist-tong-xindi-shen-ting', 'Tong Xindi & Shen Ting', { asset: 'image-45287afe823ad3f2bd7f38cabe42e0af8af9fa60-2500x2500-jpg', workTitle: 'Hydraflame', year: '2020' }],
  ['demo-artist-uriel-caspi', 'Uriel Caspi', { asset: 'image-f9b4d65bb6dbd396d5835ad383f497d0b7067a33-433x541-png', workTitle: 'Organs', year: '2024', credit: 'Miles Warburton' }],
  ['demo-artist-marie-pic', 'Marie Pic', { mid: 1916, workTitle: 'Fusion des clés égarées', year: '2025', credit: 'Romain Blanck' }],
  ['demo-artist-elizabeth-jaeger', 'Elizabeth Jaeger', { mid: 991 }],
  ['demo-artist-faye-papargyropoulou', 'Faye Papargyropoulou', { mid: 1912, workTitle: 'From Fragility to Stability 01' }],
];

const assetMap = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const library = JSON.parse(fs.readFileSync(LIBRARY, 'utf8'));
let uploads = 0;

/** A legacy media id → Sanity asset id, uploading it once if it never was. */
async function legacyAsset(mid) {
  if (assetMap[mid]) return assetMap[mid];
  const media = library.find((m) => m.id === mid);
  if (!media) throw new Error(`legacy media ${mid} not in the media library`);
  if (!write) {
    console.log(`    would upload ${media.filename} (${media.width}x${media.height}) from the old site`);
    return `image-dry-${mid}`;
  }
  // The old resizer answers 500 on some large files; fall back to the original, as the importer does.
  let res = await fetch(`${media.url}?w=2500`);
  if (!res.ok) res = await fetch(media.url);
  if (!res.ok) throw new Error(`old site answered ${res.status} for ${media.url}`);
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), { filename: media.filename });
  assetMap[mid] = asset._id;
  fs.writeFileSync(MAP, JSON.stringify(assetMap, null, 2));
  uploads++;
  console.log(`    uploaded ${media.filename} → ${asset._id}`);
  return asset._id;
}

const figure = (asset, alt, credit) => ({
  _type: 'figure',
  asset: { _type: 'reference', _ref: asset },
  alt,
  ...(credit ? { credit } : {}),
});

/* ------------------------------------------------------------- the plan */

/** [documentId, patch path, value] - applied only where the path is still empty. */
const planned = [];
const want = (step) => only.has(step);

const docs = await client.fetch(
  `*[_type in ["homepage", "programmeEvent", "edition", "newsItem", "artist"]]{
    _id, _type, year, "slug": slug.current, heroImage, cover, image, portrait,
    "videoBlock": sections[_key == "video-1"][0]{ _key, video }
  }`,
);
const byId = new Map(docs.map((d) => [d._id, d]));
const published = (id) => byId.get(id);

if (want('hero')) {
  const home = published('homepage');
  if (home && !home.heroImage?.asset) planned.push(['homepage', 'heroImage', figure(HOME_HERO, 'Ceramic works presented at ceramic brussels')]);
}

if (want('film')) {
  const home = published('homepage');
  // Exactly what the SECTIONS projection falls back to: the latest edition with a film.
  const film = await client.fetch(`*[_type == "edition" && defined(film.url) && !(_id in path("drafts.**"))] | order(year desc)[0].film`);
  if (!home?.videoBlock) console.warn('  homepage has no video-1 block, film skipped');
  else if (!film?.url) console.warn('  no edition has a film, film skipped');
  else if (!home.videoBlock.video?.url) planned.push(['homepage', 'sections[_key=="video-1"].video', film]);
}

if (want('events')) {
  // The six the programme page lists today (talks and vip tabs of the current edition, dated).
  const ids = ['demo-event-2027-1', 'demo-event-2027-2', 'demo-event-2027-3', 'demo-event-2027-4', 'demo-event-2027-6', 'demo-event-2027-7'];
  for (const id of ids) {
    const e = published(id);
    if (!e) { console.warn(`  ${id} missing`); continue; }
    if (e.image?.asset) continue;
    const s = standIn(e.slug ?? e._id);
    planned.push([id, 'image', figure(s.asset, s.alt, s.credit)]);
  }
}

if (want('editions')) {
  for (const e of docs.filter((d) => d._type === 'edition' && !d._id.startsWith('drafts.'))) {
    if (e.cover?.asset) continue;
    const real = editionsMode === 'real' && EDITION_PHOTOS[e.year];
    if (real) planned.push([e._id, 'cover', figure(await legacyAsset(real.mid), real.alt, real.credit)]);
    else {
      const s = standIn(String(e.year ?? ''));
      planned.push([e._id, 'cover', figure(s.asset, s.alt, s.credit)]);
    }
  }
}

if (want('news')) {
  for (const n of docs.filter((d) => d._type === 'newsItem' && !d._id.startsWith('drafts.'))) {
    if (n.cover?.asset) continue;
    const s = standIn(n.slug ?? '');
    planned.push([n._id, 'cover', figure(s.asset, s.alt, s.credit)]);
  }
}

if (want('artists')) {
  for (const [id, name, src] of PORTRAITS) {
    const a = published(id);
    if (!a) { console.warn(`  ${id} missing`); continue; }
    if (a.portrait?.asset) continue;
    const asset = src.asset ?? (await legacyAsset(src.mid));
    planned.push([id, 'portrait', figure(asset, `Portrait of ${name}`, src.credit)]);
  }
}

if (want('works')) {
  const queued = new Set(planned.map(([id, field]) => `${id}.${field}`));
  for (const [id, name, src] of WORKS) {
    const a = published(id);
    if (!a) { console.warn(`  ${id} missing`); continue; }
    if (a.portrait?.asset || queued.has(`${id}.portrait`)) continue;
    const asset = src.asset ?? (await legacyAsset(src.mid));
    const alt = `Work by ${name}${src.workTitle ? `: ${src.workTitle}` : ''}`;
    planned.push([id, 'portrait', {
      ...figure(asset, alt, src.credit),
      caption: name,
      ...(src.workTitle ? { workTitle: src.workTitle } : {}),
      ...(src.year ? { year: src.year } : {}),
    }]);
  }
}

/* ------------------------------------------------------------- mutations */

const mutations = [];
const touchedPublished = new Set();
for (const [id, field, value] of planned) {
  mutations.push({ patch: { id, setIfMissing: { [field]: value } } });
  touchedPublished.add(id);
  // An open draft would otherwise publish over the image later.
  if (byId.has(`drafts.${id}`)) mutations.push({ patch: { id: `drafts.${id}`, setIfMissing: { [field]: value } } });
}

console.log(`\nSteps: ${[...only].join(', ')}${want('editions') ? ` (editions=${editionsMode})` : ''}`);
for (const [id, field, value] of planned) {
  const ref = value.asset?._ref ?? value.url ?? '';
  console.log(`  ${id.padEnd(58)} ${field.padEnd(30)} ${ref}${byId.has(`drafts.${id}`) ? '  (+ draft)' : ''}`);
}
console.log(`\n${mutations.length} patches on ${touchedPublished.size} published documents, ${write ? uploads : 'no'} new uploads`);
console.log(`The publish webhook fires once per published document: ${touchedPublished.size} rebuilds if it is on.`);

if (!write) {
  console.log('\ndry run, nothing written. Add --write to commit.');
  process.exit(0);
}
if (!mutations.length) {
  console.log('nothing to do');
  process.exit(0);
}
const res = await client.mutate(mutations, { visibility: 'sync' });
console.log(`committed: transaction ${res.transactionId}`);
