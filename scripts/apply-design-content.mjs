#!/usr/bin/env node
/**
 * Brings the dataset up to the sixteen design pages in `html pages/`
 * (docs/design-pages-plan.md): the menu the design draws, the images it
 * uses, the text it shows for the practical info, the homepage stack in the
 * design's order, and the data fixes the comparison turned up (award
 * families, duplicate partners, the 2027 country focus).
 *
 * Images come from `html pages/assets/` and are uploaded once each; the
 * result is cached in legacy-export/design-asset-map.json, so the script is
 * re-runnable and never uploads twice. Everything else only sets fields or
 * removes a known duplicate, so a re-run is a no-op.
 *
 *   node scripts/apply-design-content.mjs --dry
 *   node scripts/apply-design-content.mjs
 *   node scripts/apply-design-content.mjs --only=nav,partners
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const wants = (step) => !only || only.has(step);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ASSETS = path.join(ROOT, 'html pages', 'assets');
const MAP = path.join(ROOT, 'legacy-export', 'design-asset-map.json');

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
});

/* ---------- helpers ---------- */

const assetMap = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : {};
let uploads = 0;
/** The files came off a Mac: accented names are stored decomposed, so match on normalized form. */
function locate(rel) {
  const direct = path.join(ASSETS, rel);
  if (fs.existsSync(direct)) return direct;
  const dir = path.join(ASSETS, path.dirname(rel));
  const want = path.basename(rel).normalize('NFC');
  const hit = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.normalize('NFC') === want);
  return hit ? path.join(dir, hit) : null;
}
async function upload(rel) {
  if (assetMap[rel]) return assetMap[rel];
  const file = locate(rel);
  if (!file) throw new Error(`missing design asset: ${rel}`);
  if (dry) { console.log(`    would upload ${rel}`); return `image-dry-${rel}`; }
  const asset = await client.assets.upload('image', fs.readFileSync(file), { filename: path.basename(file) });
  assetMap[rel] = asset._id;
  fs.writeFileSync(MAP, JSON.stringify(assetMap, null, 2));
  uploads++;
  console.log(`    uploaded ${rel} → ${asset._id}`);
  return asset._id;
}
async function figure(rel, alt, extra = {}) {
  const id = await upload(rel);
  const f = { _type: 'figure', asset: { _type: 'reference', _ref: id }, alt };
  for (const [k, v] of Object.entries(extra)) if (v) f[k] = v;
  return f;
}
async function figures(list) {
  const out = [];
  let i = 0;
  for (const [rel, alt, extra] of list) out.push({ ...(await figure(rel, alt, extra)), _key: `design-${i++}` });
  return out;
}
const ref = (id) => ({ _type: 'reference', _ref: id });
const L = (en, fr, nl) => ({ _type: 'localeString', en, fr: fr ?? en, nl: nl ?? en });
const T = (en) => ({ _type: 'localeText', en });
const para = (key, text) => ({ _type: 'block', _key: key, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }] });

const mutations = [];
const set = (id, fields) => mutations.push({ patch: { id, set: fields } });
const unset = (id, paths) => mutations.push({ patch: { id, unset: paths } });
const create = (doc) => mutations.push({ createIfNotExists: doc });
const replace = (doc) => mutations.push({ createOrReplace: doc });
const del = (id) => mutations.push({ delete: { id } });
const exists = async (id) => !!(await client.fetch('defined(*[_id == $id][0]._id)', { id }));

/* ================================================================ nav */

async function nav() {
  console.log('nav: the menu as the design draws it');
  const route = (key, route, anchor, label) => ({ _key: key, _type: 'navChild', kind: 'route', route, anchor, label });
  const items = [
    { _key: 'navItem0', _type: 'navItem', kind: 'route', route: 'exhibitors', label: L('exhibitors', 'exposants', 'exposanten') },
    { _key: 'navItem1', _type: 'navItem', kind: 'route', route: 'guest-of-honour', label: L('guest of honour', 'invitée d’honneur', 'eregast') },
    {
      _key: 'navItem2', _type: 'navItem', kind: 'route', route: 'art-prize', label: L('art prize', 'prix', 'prijs'),
      children: [
        route('navChild0', 'art-prize', 'about', L('about', 'à propos', 'over')),
        route('navChild1', 'art-prize', 'laureates', L('laureates', 'lauréats', 'laureaten')),
        route('navChild2', 'art-prize', 'awards', L('awards', 'prix', 'prijzen')),
      ],
    },
    {
      _key: 'navItem3', _type: 'navItem', kind: 'route', route: 'programme', label: L('programme', 'programme', 'programma'),
      children: [
        route('navChild0', 'programme', 'la-cambre', L('ceramic brussels x La Cambre')),
        route('navChild1', 'programme', 'talks', L('talks', 'talks', 'talks')),
      ],
    },
    {
      _key: 'navItem4', _type: 'navItem', kind: 'route', route: 'partners', anchor: 'institutions', label: L('partners', 'partenaires', 'partners'),
      children: [
        route('navChild0', 'partners', 'institutions', L('institutions', 'institutions', 'instellingen')),
        route('navChild1', 'partners', 'hotel', L('hotel', 'hôtel', 'hotel')),
      ],
    },
    {
      _key: 'navItem5', _type: 'navItem', kind: 'route', route: 'visit', label: L('visitors info', 'infos pratiques', 'praktische info'),
      children: [
        route('navChild0', 'visit', 'practical-info', L('practical info', 'infos pratiques', 'praktische info')),
        route('navChild1', 'visit', 'food-drinks', L('food & drinks')),
      ],
    },
    {
      _key: 'navItem6', _type: 'navItem', kind: 'route', route: 'about', label: L('about', 'à propos', 'over'),
      children: [
        route('navChild0', 'about', 'the-fair', L('ceramic brussels')),
        route('navChild1', 'about', 'advisory-board', L('advisory board', 'comité consultatif', 'adviesraad')),
      ],
    },
  ];
  set('navigation', { items });
}

/* ================================================================ awards */

async function awards() {
  console.log('awards: families, duplicates, images');
  // Partner awards of the art prize were filed under the fair family.
  const partnerAwards = await client.fetch(
    `*[_type == "award" && family == "fair" && defined(partner) && edition->year >= 2025]._id`,
  );
  for (const id of partnerAwards) set(id, { family: 'art-prize' });

  // Two jury prizes per year: the seeded one carries the laureate and the
  // outcome, the imported one only a description. Keep the seeded, fold the
  // text in where it is missing, drop the import.
  for (const [keep, drop] of [
    ['demo-award-2026-1', 'award-2026-the-jury-prize'],
    ['demo-award-2025-9', 'award-2025-the-jury-prize'],
  ]) {
    const [k, d] = await client.fetch(`[*[_id == $keep][0]{ _id, description }, *[_id == $drop][0]{ _id, description }]`, { keep, drop });
    if (!d) continue;
    if (k && !k.description && d.description) set(keep, { description: d.description });
    if (k) del(drop);
  }

  set('demo-award-2026-1', { image: await figure('ceramic/CB26_artprize_Marie_Pic_@Geoffrey_Fritsch_6 1.png', 'Marie Pic, jury prize 2026') });
  set('demo-award-2026-5', { image: await figure('ceramic/Capture d’écran 2026-06-15 à 14.02.55 1.png', 'Keramis') });
}

/* ================================================================ partners */

const MERGES = [
  // [keep (referenced, has url), drop (second import: logo, long text, 2027)]
  ['demo-partner-loewe-foundation', 'partner-loewe-foudation'],
  ['demo-partner-centre-wallonie-bruxelles-paris', 'partner-centre-wallonie-bruxelles'],
  ['demo-partner-syndicat-des-negociants-en-art', 'partner-syndicat-des-negociants-en-art-sna'],
  ['demo-partner-the-hoxton', 'partner-the-hoxton-hotel-partner'],
  ['demo-partner-flora', 'partner-flora-brussels'],
  ['demo-partner-bps22', 'partner-bps-22-musee-d-art-de-la-province-du-hainaut'],
  ['demo-partner-cid-grand-hornu', 'partner-cid-centre-for-innovation-and-design-at-grand-hornu'],
  ['demo-partner-centrale-for-contemporary-art', 'partner-centrale-for-contemporary-arts'],
  ['demo-partner-keramis', 'partner-keramis-ceramics-center'],
];

async function partners() {
  console.log('partners: merge the double imports, art prize logos, photos');
  for (const [keep, drop] of MERGES) {
    const [k, d, refs] = await client.fetch(
      `[*[_id == $keep][0]{ _id, description, logo, editions, subtitle, url }, *[_id == $drop][0]{ _id, description, logo, editions, subtitle, url }, count(*[references($drop)])]`,
      { keep, drop },
    );
    if (!d) continue; // already merged
    if (!k) { console.warn(`  keep ${keep} missing, leaving ${drop}`); continue; }
    if (refs > 0) { console.warn(`  ${drop} is referenced ${refs}×, not deleting`); continue; }
    const fields = {};
    if (d.description) fields.description = d.description;
    if (d.logo && !k.logo) fields.logo = d.logo;
    if (d.editions?.length) fields.editions = d.editions;
    if (d.subtitle && !k.subtitle) fields.subtitle = d.subtitle;
    if (d.url && !k.url) fields.url = d.url;
    if (Object.keys(fields).length) set(keep, fields);
    del(drop);
    console.log(`  ${drop} → ${keep} (${Object.keys(fields).join(', ') || 'nothing to copy'})`);
  }

  // The art prize's three partners, with their logos.
  set('demo-partner-mad-brussels', { logo: await figure('ceramic/MAD_Logo_Noir 1.png', 'MAD Brussels'), order: 1 });
  create({
    _id: 'partner-action-et-service', _type: 'partner', name: 'Action et Service', tier: 'art-prize', order: 2,
    subtitle: L('A+S'), url: 'https://www.actionetservice.be',
    logo: await figure('ceramic/Action Service_Logo 1.png', 'Action et Service'),
  });
  create({
    _id: 'partner-ascp-studio', _type: 'partner', name: 'ASCP Studio', tier: 'art-prize', order: 3,
    logo: await figure('ceramic/IMG_E09D310425AC-1 1.png', 'ASCP Studio'),
  });

  // Photos the design shows: the hotel, the four food & drinks vendors.
  set('demo-partner-the-hoxton', { images: await figures([['ceramic/Hox-brussels-new-location-nav 1.png', 'The Hoxton Brussels']]) });
  const vendors = [
    ['demo-partner-traiteur-benjamin', 'ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1-1.png', 'Traiteur Benjamin'],
    ['demo-partner-fernand-obb', 'ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 2.png', 'Fernand Obb'],
    ['demo-partner-flora', 'ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 3.png', 'Flora'],
    ['demo-partner-mok-coffee', 'ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 4.png', 'MOK COFFEE'],
  ];
  for (const [id, rel, alt] of vendors) set(id, { images: await figures([[rel, alt]]) });
}

/* ================================================================ edition */

async function edition() {
  console.log('edition 2027: country focus, dates mark');
  const focus = await client.fetch(`*[_type == "edition" && year == 2026][0].countryFocus`);
  const fields = { datesMark: await figure('date-logo.png', '20–24 January 2027') };
  if (focus) fields.countryFocus = focus;
  set('demo-edition-2027', fields);
}

/* ================================================================ homepage */

async function homepage() {
  console.log('homepage: hero image, the stack in the design’s order, feature images');
  const home = await client.fetch(`*[_type == "homepage"][0]{ sections }`);
  const byKey = Object.fromEntries((home?.sections ?? []).map((s) => [s._key, s]));
  const goh = byKey.spotlight0;
  const hox = byKey.spotlight1;
  const video = byKey['video-1'] ?? { _key: 'video-1', _type: 'videoSection' };
  const figuresBlock = byKey['figures-2'] ?? { _key: 'figures-2', _type: 'keyFiguresSection' };
  const closing = byKey['closing-3'];
  const apply = byKey['banner-0'];
  if (!goh || !hox) throw new Error('homepage spotlights not found; run scripts/migrate-sections.mjs first');

  const imagesLink = closing?.link ?? { _type: 'link', kind: 'route', route: 'about', anchor: 'images', label: L('in images') };
  const textLink = (key) => ({
    _key: key, _type: 'linksSection', variant: 'text',
    links: [{ ...imagesLink, _key: `${key}-l`, label: L('ceramic brussels 2026 in images') }],
  });

  const sections = [
    { _key: 'design-heading', _type: 'headingSection', title: L('latest news') },
    { ...goh, image: await figure('guest.png', 'Work by Marion Verboom') },
    textLink('design-images-1'),
    video,
    { ...hox, image: await figure('hoxton.png', 'The Hoxton Brussels interior') },
    figuresBlock,
    textLink('design-images-2'),
    ...(apply ? [{ ...apply, hidden: true }] : []),
    ...(closing ? [{ ...closing, hidden: true }] : []),
  ];
  set('homepage', { sections, heroImage: await figure('home-hero.png', 'Ceramic works presented at ceramic brussels') });
}

/* ================================================================ pages */

async function pages() {
  console.log('pages: covers, closing images, the art prize partners block');
  set('demo-page-about-the-fair', {
    cover: await figure('video-fair.png', 'Visitors at ceramic brussels'),
    images: await figures([
      ['ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1-2.png', 'ceramic brussels fair'],
      ['ceramic/CB26_artprize_vue_densemble_@Geoffrey_Fritsch_6 1-1.png', 'ceramic brussels fair'],
      ['ceramic/CB26_art_prize_awards_ceremony_@Geoffrey_Fritsch_6 1-1.png', 'ceramic brussels fair'],
    ]),
  });

  const art = await client.fetch(`*[_id == "demo-page-art-prize-about"][0]{ sections }`);
  const sections = (art?.sections ?? []).map((s) => {
    if (s._type === 'contentSection' && s.heading?.en === 'partners') {
      return { _key: s._key, _type: 'partnersSection', heading: s.heading, body: s.body, tier: 'art-prize', display: 'logos', anchor: s.anchor, hidden: s.hidden };
    }
    return s;
  });
  set('demo-page-art-prize-about', {
    sections,
    cover: await figure('ceramic/CB26_artprize_vue_densemble_@Geoffrey_Fritsch_5 1.png', 'ceramic brussels art prize'),
    images: await figures([
      ['ceramic/CB26_artprize_vue_densemble_@Geoffrey_Fritsch_6 1-2.png', 'art prize'],
      ['ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1-3.png', 'art prize'],
      ['ceramic/CB26_art_prize_awards_ceremony_@Geoffrey_Fritsch_6 1-2.png', 'art prize'],
    ]),
  });
}

/* ================================================================ settings */

async function settings() {
  console.log('site settings: venue, address, access, hotel deal, photos');
  const cur = await client.fetch(`*[_id == "siteSettings"][0]{ practicalInfo }`);
  const pi = cur?.practicalInfo ?? {};
  const mode = (key, en, text) => ({ _key: key, _type: 'accessMode', mode: L(en), text: T(text) });
  const fields = {
    'practicalInfo.venueName': 'Tour & Taxis — Sheds 1 & 2bis',
    'practicalInfo.address': 'Rue Picard 3\n1000 Brussels',
    'practicalInfo.heroImage': await figure('ceramic/CB26_foire_exterieur_@Martin_Pilette_Prod_3 1.png', 'ceramic brussels entrance at Tour & Taxis'),
    'practicalInfo.access': [
      mode('access-transport', 'By public transport', 'Metro lines 2 and 6, stop Ribaucourt or Yser (10 min walk)\nBus 14, 20, 46, 86, stop Suzan Daniel'),
      mode('access-train', 'By train', 'Free shuttle service from Brussels-North station, stop at Tour & Taxis'),
      mode('access-bike', 'By bike', 'Bike racks in front of Maison de la Poste, rue Picard 1—11 or avenue du Port 86C\nVillo! station at the Gare Maritime, rue Picard 7'),
      mode('access-car', 'Car park', 'Park Lane, rue Picard 13\nEsplanade Parking, avenue du Port 86C'),
    ],
    'practicalInfo.hotelDeal.partner': ref('demo-partner-the-hoxton'),
    'practicalInfo.hotelDeal.text': T(
      'For its fourth edition, ceramic brussels partners with The Hoxton, ideally located above the Botanical Gardens and within easy reach of the fair and Brussels’ historic centre. The Hoxton is a design-led hotel and lively meeting point, offering sweeping city views, bold interiors, and two vibrant food destinations: Cantina Valentina and Tope.',
    ),
    'practicalInfo.images': await figures([
      ['ceramic/CB26_artprize_vue_densemble_@Martin_Pilette_Prod_2 1.png', 'Visitors at ceramic brussels'],
      ['ceramic/CB26_artprize_vue_densemble_@Geoffrey_Fritsch_6 1.png', 'Tour & Taxis entrance'],
      ['video-fair-alt.png', 'ceramic brussels fair interior'],
    ]),
  };
  // Keep what an editor already wrote.
  if (pi.venueName) delete fields['practicalInfo.venueName'];
  if (pi.address) delete fields['practicalInfo.address'];
  if (pi.access?.length) delete fields['practicalInfo.access'];
  if (pi.hotelDeal?.text?.en) delete fields['practicalInfo.hotelDeal.text'];
  set('siteSettings', fields);
}

/* ================================================================ artist */

async function artist() {
  console.log('guest of honour: portrait, works, video still');
  const a = await client.fetch(`*[_id == "demo-artist-marion-verboom"][0]{ works[]{ _key, title, image } }`);
  const works = a?.works ?? [];
  const fields = {
    portrait: await figure('guest-portrait.png', 'Marion Verboom in her studio'),
    'video.poster': await figure('guest-video.png', 'Watch the Marion Verboom interview'),
  };
  const shots = ['guest-work-1.png', 'guest-work-2.png'];
  for (let i = 0; i < Math.min(works.length, shots.length); i++) {
    if (!works[i].image?.asset) fields[`works[_key=="${works[i]._key}"].image`] = await figure(shots[i], `${works[i].title ?? 'Work'} by Marion Verboom`);
  }
  set('demo-artist-marion-verboom', fields);
}

/* ================================================================ exhibitors */

const CARDS = [
  ['demo-exhibitor-2027-aifa', 'aifa.png', 'AIFA'],
  ['demo-exhibitor-2027-al-tiba9-gallery', 'altiba.png', 'Al-Tiba9 Gallery'],
  ['demo-exhibitor-2027-analora', 'analora.png', 'Frédérique Fleury, Les Endormies', { caption: 'Frédérique Fleury', workTitle: 'Les Endormies' }],
  ['demo-exhibitor-2027-anna-laudel', 'anna-laudel.png', 'Anna Laudel'],
  ['demo-exhibitor-2027-arsenic-galerie', 'arsenic.png', 'arsenic galerie'],
  ['demo-exhibitor-2027-barrera-baldan-galeria', 'barrera.png', 'Barrera Baldan Galeria'],
  ['demo-exhibitor-2027-galerie-bernard-jordan', 'bernard-jordan.png', 'Galerie Bernard Jordan'],
  ['demo-exhibitor-2027-brazil-modernist', 'brazil.png', 'Brazil Modernist'],
  ['demo-exhibitor-2027-deletaille-gallery', 'deletaille.png', 'Deletaille Gallery'],
  ['demo-exhibitor-2027-esther-verhaeghe-art-concepts', 'esther.png', 'Esther Verhaeghe — art concepts'],
  ['demo-exhibitor-2027-format-oslo', 'format-oslo.png', 'Format Oslo'],
];

async function exhibitors() {
  console.log('exhibitors 2027: the design’s card and detail images');
  for (const [id, rel, alt, extra] of CARDS) {
    if (!(await exists(id))) { console.warn(`  ${id} missing`); continue; }
    set(id, { images: await figures([[rel, alt, extra]]) });
  }
  set('demo-exhibitor-2027-chaxartxrtm', {
    images: await figures([
      ['chaxart-detail.png', 'Tong Xindi and Shen Ting, Microcosm, 2024', { caption: 'Tong Xindi and Shen Ting', workTitle: 'Microcosm', year: '2024' }],
      ['chaxart.png', 'CHAxARTxRTM'],
    ]),
  });
}

/* ================================================================ laureates */

async function laureates() {
  console.log('laureates 2026: slideshow images');
  const shots = [
    ['demo-laureate-2026-lorie-ballage', 'ceramic/Lorie Ballage — Slideshow.png', 'Lorie Ballage'],
    ['demo-laureate-2026-uriel-caspi', 'ceramic/CB26_ArtPrize_UrielCaspi_Organs_Viewinstallation_38x21x35cm_2024_Credits_MilesWarburton 1.png', 'Uriel Caspi, Organs, view of the installation, 2024', { caption: 'Uriel Caspi', workTitle: 'Organs', year: '2024', credit: 'Miles Warburton' }],
    ['demo-laureate-2026-danny-cremers', 'ceramic/CB26_ArtPrize_DannyCremers_VASE_01 1.png', 'Danny Cremers, Vase', { caption: 'Danny Cremers', workTitle: 'Vase' }],
  ];
  for (const [id, rel, alt, extra] of shots) {
    if (!(await exists(id))) { console.warn(`  ${id} missing`); continue; }
    set(id, { images: await figures([[rel, alt, extra]]) });
  }
}

/* ================================================================ events */

async function events() {
  console.log('programme: the Thursday talk images (after scripts/fix-programme-2026.mjs)');
  const talks = [
    [/exclusive interview of Elmar Trenkwalder/i, 'programme-thu-1.png', 'Artist talk at ceramic brussels'],
    [/Exposer la céramique dans les institutions/i, 'programme-thu-2.png', 'Roundtable at ceramic brussels'],
    [/Yixing CCCA Residency/i, 'programme-thu-3.png', 'Roundtable at ceramic brussels'],
    [/Quelle place dans le paysage éditorial/i, 'programme-thu-4.png', 'Roundtable at ceramic brussels'],
  ];
  const docs = await client.fetch(`*[_type == "programmeEvent" && edition->year == 2026 && section == "talks"]{ _id, "title": title.en }`);
  for (const [re, rel, alt] of talks) {
    const doc = docs.find((d) => re.test(d.title ?? ''));
    if (!doc) { console.warn(`  no 2026 talk matching ${re}`); continue; }
    set(doc._id, { image: await figure(rel, alt) });
  }
}

/* ================================================================ run */

const STEPS = { nav, awards, partners, edition, homepage, pages, settings, artist, exhibitors, laureates, events };
for (const [name, fn] of Object.entries(STEPS)) if (wants(name)) await fn();

console.log(`\n${mutations.length} mutations, ${uploads} new uploads${dry ? ' (dry run: uploads counted as would-upload)' : ''}`);
if (dry) {
  for (const m of mutations) {
    const k = Object.keys(m)[0];
    const id = m[k].id ?? m[k]._id;
    const what = k === 'patch' ? Object.keys(m[k].set ?? m[k].unset ?? {}).join(', ') : k;
    console.log(`  ${k.padEnd(18)} ${id}  ${what}`);
  }
  console.log('\ndry run, nothing written');
  process.exit(0);
}
const res = await client.mutate(mutations, { returnIds: false });
console.log(`committed: transaction ${res.transactionId}`);
