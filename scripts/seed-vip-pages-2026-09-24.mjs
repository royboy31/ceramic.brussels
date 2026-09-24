#!/usr/bin/env node
/**
 * The VIP hub's five tabs and the 2027 VIP programme, into Sanity from the
 * design scaffolding (request #17).
 *
 * The tabs render `src/components/vipContent.ts` - the Figma frames' own copy
 * and pictures - while no `page` document exists in section "vip"; creating
 * one switches its tab over to the Studio for good (`fromDesign` in
 * Vip.astro). This writes that content into Sanity as the same content, so
 * the switch changes nothing on the page and everything for the editors:
 *
 *   page-vip-about       intro, cover, body (the note under the code box),
 *                        sections (programme overview, the two closing columns)
 *   page-vip-programme   the tab; its rows are the events below
 *   page-vip-lounge      intro, cover, sections (scenography, aperitivos, agenda)
 *   page-vip-hotel-deal  intro, cover, body (the hotel), a pill
 *   page-vip-access      the tab, empty (the two forms are code)
 *   event-2027-vip-*     eight programmeEvents on the 2027 edition, section
 *                        "vip", on-site or off-site, with picture and text
 *
 * **Drafts by default.** `--apply` writes every document as `drafts.<id>`:
 * the live site does not change (a build sees published documents only),
 * the Studio shows them as unpublished, and Preview renders them. Publishing
 * is the editors' decision, one document at a time, when the client's text
 * is final. `--publish` writes them published instead.
 *
 * Two things change the moment the programme events are published, so
 * publish them together and knowingly:
 *   - the VIP programme tab lists them (fine, that is the point);
 *   - getProgramme picks "the current edition, once it has any event", so
 *     the programme hub's talks tab moves from 2026 to 2027 too - and 2027
 *     has no talks yet. Have the 2027 talks in before publishing these.
 *
 * Pictures: the 17 files in public/assets/vip/ are uploaded once (Sanity
 * keys assets by content, a re-run uploads nothing new). Ids are
 * deterministic, so a re-run corrects rather than duplicates; it refuses to
 * overwrite a document an editor has already published unless --force.
 *
 * Left out, deliberately - each is listed at the end of a run:
 *   - "book your visit" on every off-site row: no venue has a booking URL
 *     yet (request #14 made the field; the link is the editors' to fill);
 *   - "discover Embelco": that partner has no website URL, the same reason
 *     the page drops it today;
 *   - the Charles Kaisin lunch has no picture in the hand-off;
 *   - the MAD afterparty text and the three lounge agenda texts repeat
 *     another entry's paragraph in the frame - kept word for word, flagged
 *     with "[placeholder in the design]" so an editor finds them.
 *
 *   node scripts/seed-vip-pages-2026-09-24.mjs             plan, write nothing
 *   node scripts/seed-vip-pages-2026-09-24.mjs --apply     upload, write drafts
 *   node scripts/seed-vip-pages-2026-09-24.mjs --apply --publish
 *   --force        overwrite documents that are already published
 *   --env=<file>   read the token from another .env
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const FORCE = process.argv.includes('--force');
const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.slice(6) ?? '.env';
const DIR = 'public/assets/vip';
const EDITION_ID = 'demo-edition-2027';
const PHOTO_CREDIT = 'Geoffrey Fritsch, ceramic brussels 2026';
const PLACEHOLDER = ' [placeholder in the design]';

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
if (APPLY && !env.SANITY_API_WRITE_TOKEN) throw new Error(`no SANITY_API_WRITE_TOKEN in ${ENV_FILE}`);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/* ------------------------------------------------------------ helpers */

const ls = (en) => ({ _type: 'localeString', en });
const lt = (en) => ({ _type: 'localeText', en });
const slug = (en, fr = en, nl = en) => ({
  en: { _type: 'slug', current: en },
  fr: { _type: 'slug', current: fr },
  nl: { _type: 'slug', current: nl },
});

let n = 0;
const key = (p) => `${p}${(n++).toString(36)}`;

/** One paragraph. `parts` is a string, or [text | {text, marks:[...]}...]; `defs` its markDefs. */
const block = (parts, style = 'normal', defs = []) => {
  const list = Array.isArray(parts) ? parts : [parts];
  return {
    _key: key('b'),
    _type: 'block',
    style,
    markDefs: defs,
    children: list.map((p) =>
      typeof p === 'string'
        ? { _key: key('s'), _type: 'span', marks: [], text: p }
        : { _key: key('s'), _type: 'span', marks: p.marks ?? [], text: p.text },
    ),
  };
};
/** Rich text (localeBlock), English only, as the page templates seed it. */
const rich = (...blocks) => ({ en: blocks });

/** A paragraph with one phrase linked to a page of this site. */
const linkedParagraph = (text, phrase, sitePath) => {
  const [before, after] = text.split(phrase);
  const id = key('m');
  return block(
    [before, { text: phrase, marks: [id] }, after].filter((p) => p !== ''),
    'normal',
    [{ _key: id, _type: 'internalLink', path: sitePath }],
  );
};

const siteLink = (label, sitePath) => ({ _key: key('l'), _type: 'link', kind: 'route', path: sitePath, label: ls(label) });
const webLink = (label, url) => ({ _key: key('l'), _type: 'link', kind: 'external', external: url, label: ls(label) });

const FILES = {};
const figure = (file, alt, credit) => {
  if (!fs.existsSync(path.join(DIR, file))) throw new Error(`missing ${DIR}/${file}`);
  FILES[file] ??= { alt, credit };
  return { _key: key('f'), _type: 'figure', file, alt, ...(credit ? { credit } : {}) };
};

const heading = (title) => ({ _key: key('h'), _type: 'headingSection', title: ls(title) });
const text = (layout, title, body, links = []) => ({
  _key: key('c'),
  _type: 'contentSection',
  layout,
  ...(title ? { heading: ls(title) } : {}),
  body: rich(...body),
  ...(links.length ? { links } : {}),
});
const imageText = (side, title, body, image, links = []) => ({
  _key: key('i'),
  _type: 'imageTextSection',
  imageSide: side,
  ...(title ? { heading: ls(title) } : {}),
  body: rich(...body),
  ...(image ? { image } : {}),
  ...(links.length ? { links } : {}),
});
const pills = (...links) => ({ _key: key('p'), _type: 'linksSection', variant: 'pill', links });

/* ------------------------------------------------------------ partners */

const partners = Object.fromEntries(
  (await client.fetch(`*[_type == "partner" && name in ["Puilaetco", "MAD Brussels", "The Hoxton", "Embelco"]]{ name, url }`)).map(
    (p) => [p.name, p.url],
  ),
);
const skipped = [];
/** "discover Puilaetco ↗": the partner's own site; none while it has no URL, as the page does today. */
const discover = (name) => {
  if (!partners[name]) {
    skipped.push(`"discover ${name}": partner has no website URL`);
    return [];
  }
  return [webLink(`discover ${name}`, partners[name])];
};
const booking = (title) => {
  skipped.push(`"book your visit" on ${title}: no booking URL yet (request #14 - the event's Link field)`);
  return undefined;
};

/* ------------------------------------------------------------ the pages */

const aboutNote =
  'Designed in dialogue with a network of committed institutions and partners, this programme redefines the fair experience. The agenda for this 4th edition features a range of initiatives that foster exchange and connection within the fair, while inviting an insider exploration of Brussels’ vibrant artistic ecosystem—and far beyond.';

const pages = [
  {
    _id: 'page-vip-about',
    _type: 'page',
    section: 'vip',
    order: 0,
    title: ls('VIP'),
    tabLabel: { _type: 'localeString', en: 'about', fr: 'à propos', nl: 'over' },
    slug: slug('about', 'a-propos', 'over'),
    intro: lt(
      'Each year, the fair curates an exceptional programme tailored specifically for art professionals and collectors from around the world.',
    ),
    cover: figure('about-hero.webp', 'Visitors in conversation in front of the ceramic brussels entrance wall.', PHOTO_CREDIT),
    body: rich(linkedParagraph(aboutNote, 'committed institutions and partners', '/partners/institutions')),
    sections: [
      heading('programme overview'),
      heading('at the fair'),
      imageText(
        'right',
        'discovery tours',
        [
          block(
            'Explore the galleries’ presentations through the eyes of experts. Thanks to the support of Puilaetco, the main partner of the fair, enjoy complimentary, exclusive thematic guided tours from Thursday to Sunday.',
          ),
        ],
        figure('about-discovery-tours.webp', 'A Discovery Tours group gathered under the Puilaetco sign.'),
        [siteLink('learn more', '/vip/programme'), ...discover('Puilaetco')],
      ),
      imageText(
        'right',
        'vip lounge',
        [
          block(
            'A showcase set right at the heart of the fair, designed in collaboration with MAD Brussels. This lounge highlights today’s and tomorrow’s Belgian design talents. Each day, the lounge hosts the VIP Aperitivo—a cocktail gathering built around intimate encounters with artists, curators, and institutional leaders.',
          ),
        ],
        figure('about-lounge.webp', 'Guests talking on the sofas of the VIP lounge.'),
        [siteLink('learn more', '/vip/lounge'), ...discover('MAD Brussels')],
      ),
      heading('beyond the fair'),
      imageText(
        'right',
        'vip programme',
        [
          block(
            'Build your tailor-made schedule and gain access to exclusive events strictly reserved for our guests: private tours of personal collections, VIP museum breakfasts, and behind-the-scenes studio visits.',
          ),
        ],
        figure('about-programme.webp', 'Guests at a long lunch table during an off-site VIP visit.'),
        [siteLink('learn more', '/vip/programme')],
      ),
      text(
        'half',
        'The Hoxton: exclusive hotel partner',
        [
          block(
            'For our international visitors, the experience begins as soon as you arrive in Brussels. Enjoy preferential rates and exclusive perks at the stylish Hoxton Brussels, the perfect base for your stay.',
          ),
        ],
        [siteLink('learn more', '/vip/hotel-deal'), ...discover('The Hoxton')],
      ),
      text('half', 'contact', [
        block(
          'Have a question or a special request? Our VIP team is at your full disposal for any queries regarding your visit or reservation. Contact us: vip@ceramic.brussels',
        ),
      ]),
    ],
  },
  {
    _id: 'page-vip-programme',
    _type: 'page',
    section: 'vip',
    order: 1,
    title: ls('VIP programme'),
    tabLabel: { _type: 'localeString', en: 'VIP programme', fr: 'programme VIP', nl: 'VIP-programma' },
    slug: slug('programme', 'programme', 'programma'),
  },
  {
    _id: 'page-vip-lounge',
    _type: 'page',
    section: 'vip',
    order: 2,
    title: ls('VIP lounge'),
    tabLabel: { _type: 'localeString', en: 'VIP lounge', fr: 'lounge VIP', nl: 'VIP-lounge' },
    slug: slug('lounge'),
    intro: lt(
      'Located in the heart of hall B, the VIP lounge is an exceptional space exclusively reserved for the fair’s VIP guests. It features a bar as well as welcoming, comfortable areas specially designed to foster connections and conversations.',
    ),
    cover: figure('lounge-cover.webp', 'The crowd in the VIP lounge during the fair.', PHOTO_CREDIT),
    sections: [
      text(
        'single',
        'scenography by MAD Brussels',
        [
          block(
            'The 250 m² hospitality space was entirely conceived and designed by the team at MAD Brussels (Center for Fashion & Design), who carefully curated every element. This unique layout is made possible through the generous support of our logistics partner, Embelco.',
          ),
        ],
        [...discover('MAD Brussels'), ...discover('Embelco')],
      ),
      imageText(
        'right',
        'VIP aperitivos',
        [
          block('everyday — 17:30 → 19:00', 'small'),
          block('End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.'),
        ],
        figure('lounge-aperitivos.webp', 'Champagne glasses on a yellow table at the VIP aperitivo.', PHOTO_CREDIT),
      ),
      heading('agenda'),
      imageText(
        'left',
        'meet the speakers & happy hour',
        [
          block('everyday — 17:30 → 19:00', 'small'),
          block(
            'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.' + PLACEHOLDER,
          ),
        ],
        figure('lounge-speakers.webp', 'Two guests talking during the happy hour.'),
        [siteLink('see the full talks programme', '/programme')],
      ),
      imageText(
        'left',
        'meet the guest of honour',
        [
          block('thurs. 21 january 2027 — 14:30', 'small'),
          block(
            'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.' + PLACEHOLDER,
          ),
        ],
        figure('lounge-guest-of-honour.webp', 'The guest of honour in her studio.'),
        [siteLink('more on the guest of honour', '/guest-of-honour')],
      ),
      imageText(
        'left',
        'meet the art prize laureates',
        [
          block('fri. 22 january 2027 — 17:30', 'small'),
          block(
            'End your day with an exclusive gathering featuring intimate discussions on major art market trends, followed by a networking cocktail.' + PLACEHOLDER,
          ),
        ],
        figure('lounge-laureates.webp', 'Visitors in front of a laureate’s presentation at the fair.'),
        [siteLink('more on the art prize laureates', '/art-prize/laureates')],
      ),
    ],
  },
  {
    _id: 'page-vip-hotel-deal',
    _type: 'page',
    section: 'vip',
    order: 3,
    title: ls('Hotel deal'),
    tabLabel: { _type: 'localeString', en: 'hotel deal', fr: 'offre hôtel', nl: 'hotelaanbod' },
    slug: slug('hotel-deal', 'offre-hotel', 'hotelaanbod'),
    intro: lt(
      'For its fourth edition, ceramic brussels is partnering with The Hoxton, ideally located overlooking the Botanical Gardens and close to both the fair and Brussels’ historic city center.',
    ),
    cover: figure('hotel-hoxton.webp', 'The entrance of The Hoxton Brussels.', PHOTO_CREDIT),
    body: rich(
      block('The Hoxton', 'h3'),
      block(
        'The Hoxton is a design-led hotel and vibrant gathering spot, offering sweeping city views, bold interiors, and two lively dining destinations: Cantina Valentina and Tope.',
      ),
    ),
    sections: partners['The Hoxton'] ? [pills(...discover('The Hoxton'))] : [],
  },
  {
    _id: 'page-vip-access',
    _type: 'page',
    section: 'vip',
    order: 4,
    title: ls('VIP access'),
    tabLabel: { _type: 'localeString', en: 'access', fr: 'accès', nl: 'toegang' },
    slug: slug('access', 'acces', 'toegang'),
  },
];

/* ----------------------------------------------------------- the events */

/** Brussels is CET in January. */
const at = (day, time) => `2027-01-${day}T${time}:00+01:00`;
const event = (id, title, day, time, venue, kind, body, image, extra = {}) => ({
  _id: `event-2027-vip-${id}`,
  _type: 'programmeEvent',
  title: ls(title),
  slug: { _type: 'slug', current: `${id}-2027` },
  edition: { _type: 'reference', _ref: EDITION_ID },
  section: 'vip',
  venue,
  kind,
  startsAt: at(day, time),
  description: rich(...body),
  ...(image ? { image } : {}),
  ...extra,
});

const events = [
  event(
    'discovery-tours',
    'discovery tours by Puilaetco',
    21,
    '11:00',
    'on-site',
    'tour',
    [
      block(
        'In partnership with Puilaetco – a Quintet Private Bank, the fair’s main partner, ceramic brussels offers annual Discovery Tours reserved for its VIPs. Free of charge and requiring advance registration, these guided tours through the fair aisles offer an up-close look at the diverse artistic works presented by our exhibitors, accompanied by an expert.',
      ),
      block([{ text: 'Practical information and registration: November 2026.', marks: ['em'] }]),
    ],
    figure('programme-discovery-tours.webp', 'A guide leading a Discovery Tour through the fair aisles.', PHOTO_CREDIT),
    {
      // "everyday — 11:00 / 16:00": one datetime cannot say it (request #15).
      whenText: ls('everyday — 11:00 / 16:00'),
      ...(partners.Puilaetco ? { link: webLink('discover Puilaetco', partners.Puilaetco) } : {}),
    },
  ),
  event(
    'kanal',
    'KANAL visit',
    20,
    '10:30',
    'off-site',
    'tour',
    [
      block(
        'Discover KANAL, a new museum of modern and contemporary art, architecture, and landscape opening in November 2026. It is a meeting place for artists, architects, creators, and the public, set inside the iconic Citroën garage along the canal, just steps from Brussels’ historic city center.',
      ),
    ],
    figure('programme-kanal.webp', 'The KANAL building, the former Citroën garage, along the canal.', 'KANAL'),
    { link: booking('KANAL visit') },
  ),
  event(
    'charles-kaisin',
    'Lunch at Charles Kaisin’s home & private collection tour',
    20,
    '12:30',
    'off-site',
    'tour',
    [
      block(
        'Step into the world of Belgian designer and architect Charles Kaisin. Renowned worldwide for his poetic design, modular installations, and famous Surrealist Dinners, he opens the doors to his private home. Guests will enjoy an exclusive lunch surrounded by his extraordinary, eclectic art collection—an intimate immersion into creativity, gastronomy, and art.',
      ),
    ],
    // The one row of the frame without a picture in the hand-off.
    (skipped.push('picture for the Charles Kaisin lunch: none in the hand-off'), undefined),
    { link: booking('the Charles Kaisin lunch') },
  ),
  event(
    'galila',
    'Lunch at Galila’s P.O.C & collection tour',
    21,
    '12:30',
    'off-site',
    'tour',
    [
      block(
        'Enjoy an exclusive lunch at Galila’s P.O.C. (Passion, Obsession, Collection), a converted 1950s venue turned contemporary cabinet of curiosities. Discover collector Galila Barzilaï-Hollander’s vibrant, playful collection of over 600 thematic artworks.',
      ),
    ],
    figure('programme-galila.webp', 'Visitors in front of a wall of small collected objects at Galila’s P.O.C.', 'Galila’s P.O.C'),
    { link: booking('the Galila’s P.O.C lunch') },
  ),
  event(
    'hotel-solvay',
    'Guided tour of Hotel Solvay',
    22,
    '15:30',
    'off-site',
    'tour',
    [
      block(
        'Discover Hôtel Solvay, a UNESCO World Heritage site and crowning achievement of Art Nouveau architecture by Victor Horta. Remarkably preserved in its original glory, this iconic residence showcases breathtaking stained glass, luxurious materials, and the refined elegance of fin-de-siècle Brussels.',
      ),
    ],
    figure('programme-hotel-solvay.webp', 'The stained-glass stairwell of Hôtel Solvay.', 'Hotel Solvay'),
    { link: booking('the Hotel Solvay tour') },
  ),
  event(
    'charles-riva',
    'Tour of the Charles Riva Collection',
    22,
    '16:30',
    'off-site',
    'tour',
    [
      block(
        'Discover the Charles Riva Collection, an extraordinary private collection of post-war and contemporary art housed within an elegant 19th-century townhouse in the heart of Brussels.',
      ),
    ],
    // The frame credits this "© Hotel Solvay" - the row above's credit left in place.
    figure('programme-charles-riva.webp', 'A painting hung in the Charles Riva Collection.', 'Charles Riva Collection'),
    { link: booking('the Charles Riva tour') },
  ),
  event(
    'vanhaerents',
    'Tour of the Vanhaerents Art Collection',
    23,
    '15:30',
    'off-site',
    'tour',
    [
      block(
        'Housed in a former industrial warehouse in Brussels, the Vanhaerents Art Collection showcases groundbreaking, monumental contemporary artworks and immersive installations from world-renowned artists.',
      ),
    ],
    figure('programme-vanhaerents.webp', 'An immersive installation in the Vanhaerents Art Collection warehouse.', 'Vanhaerents Art Collections'),
    { link: booking('the Vanhaerents tour') },
  ),
  event(
    'mad-afterparty',
    'MAD Brussels afterparty',
    23,
    '19:30',
    'off-site',
    'opening',
    [
      // The frame repeats the Charles Riva paragraph here.
      block(
        'Discover the Charles Riva Collection, an extraordinary private collection of post-war and contemporary art housed within an elegant 19th-century townhouse in the heart of Brussels.' +
          PLACEHOLDER,
      ),
    ],
    figure('programme-mad-afterparty.webp', 'The MAD Brussels building.', 'MAD Brussels'),
    { link: booking('the MAD Brussels afterparty') },
  ),
].map((e) => {
  if (e.link === undefined) delete e.link;
  return e;
});

/* ------------------------------------------------------------ the plan */

const docs = [...pages, ...events];
const edition = await client.fetch(`*[_id == $id][0]{ _id, year, isCurrent }`, { id: EDITION_ID });
if (!edition) throw new Error(`no edition ${EDITION_ID}`);

const ids = docs.map((d) => d._id);
const existing = await client.fetch(`*[_id in $all]{ _id }`, { all: [...ids, ...ids.map((i) => `drafts.${i}`)] });
const published = existing.filter((d) => !d._id.startsWith('drafts.')).map((d) => d._id);
const drafted = existing.filter((d) => d._id.startsWith('drafts.')).map((d) => d._id.slice(7));
const others = await client.fetch(
  `*[(_type == "page" && section == "vip" && !(_id in $all)) || (_type == "programmeEvent" && section == "vip" && edition._ref == $ed && !(_id in $all))]{ _id, _type, "slug": coalesce(slug.en.current, slug.current) }`,
  { all: [...ids, ...ids.map((i) => `drafts.${i}`)], ed: EDITION_ID },
);

console.log(`edition  ${edition._id} (${edition.year}${edition.isCurrent ? ', current' : ''})`);
console.log(`pictures ${Object.keys(FILES).length} in ${DIR}`);
for (const d of docs) {
  const state = published.includes(d._id) ? 'PUBLISHED' : drafted.includes(d._id) ? 'draft' : 'new';
  console.log(`${d._type.padEnd(15)} ${d._id.padEnd(30)} ${state}`);
}
if (others.length) {
  console.log('\nalso in Sanity, not touched:');
  for (const o of others) console.log(`  ${o._type} ${o._id} (${o.slug ?? '-'})`);
}
if (skipped.length) {
  console.log('\nleft for the editors:');
  for (const s of [...new Set(skipped)]) console.log(`  - ${s}`);
}
if (published.length && !FORCE) {
  console.log(`\n${published.length} of these are already published; --force overwrites them. Stopping.`);
  process.exit(1);
}
if (!APPLY) {
  console.log(`\ndry run: nothing uploaded or written. Add --apply to write ${PUBLISH ? 'published documents' : 'drafts'}.`);
  process.exit(0);
}

/* ------------------------------------------------------------ the write */

const assets = {};
for (const [file, meta] of Object.entries(FILES)) {
  const asset = await client.assets.upload('image', fs.createReadStream(path.join(DIR, file)), { filename: file });
  assets[file] = asset._id;
  console.log(`uploaded ${file}: ${asset._id}${meta.credit ? `  © ${meta.credit}` : ''}`);
}
/** Swap every figure's file name for its uploaded asset. */
const resolve = (v) => {
  if (Array.isArray(v)) return v.map(resolve);
  if (v && typeof v === 'object') {
    if (v._type === 'figure' && v.file) {
      const { file, ...rest } = v;
      return { ...rest, asset: { _type: 'reference', _ref: assets[file] } };
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
  }
  return v;
};

const tx = client.transaction();
for (const d of docs) {
  const doc = resolve(d);
  if (PUBLISH) {
    tx.createOrReplace(doc);
    tx.delete(`drafts.${doc._id}`);
  } else {
    tx.createOrReplace({ ...doc, _id: `drafts.${doc._id}` });
  }
}
const result = await tx.commit();
console.log(`\nwritten: ${result.results.length} ${PUBLISH ? 'published' : 'draft'} document(s), transaction ${result.transactionId}`);
console.log(PUBLISH ? 'Live on the next build.' : 'Drafts: see them in the Studio under VIP, and in Preview. Publish there when the text is final.');
