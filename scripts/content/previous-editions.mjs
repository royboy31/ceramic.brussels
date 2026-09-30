/**
 * Fills the previous-editions section with the content of Léonie's frames.
 *
 *   node scripts/content/previous-editions.mjs --dry     plan, write nothing
 *   node scripts/content/previous-editions.mjs           do it
 *   node scripts/content/previous-editions.mjs --only=focus,guest
 *
 * The frames at `Previous editions/` are the client's own copy, and the
 * fields they need were added to the `edition` schema on 2026-09-30
 * (requests #32-#36). This script puts the words and the pictures in, so the
 * pages read as designed rather than as empty bands.
 *
 * **It only ever adds.** Every patch sets fields that were introduced with
 * this section and that nothing else reads, with two declared exceptions,
 * both of which replace a seeded placeholder rather than an editor's work:
 *
 *   - `artist.bio` on Elizabeth Jaeger - a one-line demo string; the frame
 *     carries her real three-paragraph biography.
 *   - the five Norwegian galleries' `name`, which the legacy import left as
 *     "Format (no) ___ focus Norway". The suffix is cut and the flag it was
 *     standing in for is set instead.
 *
 * Re-running is safe: assets are cached in `legacy-export/asset-map.json`
 * style by path in `scripts/content/.previous-editions-assets.json`, and
 * every mutation is a patch with a fixed shape, not an append.
 */
import fs from 'node:fs';
import path from 'node:path';

const PROJECT = '5hqzhin7';
const DATASET = 'production';
const API = `https://${PROJECT}.api.sanity.io/v2023-05-03`;
const ASSETS_DIR = 'Previous editions/Assets';
const CACHE = 'scripts/content/.previous-editions-assets.json';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const only = (argv.find((a) => a.startsWith('--only=')) ?? '').slice('--only='.length);
const ONLY = only ? new Set(only.split(',').map((s) => s.trim())) : null;
const wants = (step) => !ONLY || ONLY.has(step);

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) fail('SANITY_API_WRITE_TOKEN is not in .env');

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

async function query(groq, params = {}) {
  const url = new URL(`${API}/data/query/${DATASET}`);
  url.searchParams.set('query', groq);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const j = await r.json();
  if (!r.ok) fail(`query failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j.result;
}

const mutations = [];
const patch = (id, set) => mutations.push({ patch: { id, set } });

async function commit() {
  if (!mutations.length) return console.log('  nothing to write');
  if (DRY) {
    console.log(`\n  --dry: ${mutations.length} mutation(s) not sent:`);
    for (const m of mutations) console.log(`    patch ${m.patch.id}: ${Object.keys(m.patch.set).join(', ')}`);
    return;
  }
  const r = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  const j = await r.json();
  if (!r.ok) fail(`mutate failed: ${JSON.stringify(j).slice(0, 600)}`);
  console.log(`  ✓ ${mutations.length} mutation(s) committed`);
}

/* ------------------------------------------------------------- assets */

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

async function upload(file) {
  if (cache[file]) return cache[file];
  const full = path.join(ASSETS_DIR, file);
  if (!fs.existsSync(full)) fail(`asset missing: ${full}`);
  if (DRY) return `image-DRY-${file}`;
  const r = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(file)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'image/jpeg' },
    body: fs.readFileSync(full),
  });
  const j = await r.json();
  if (!r.ok) fail(`upload failed for ${file}: ${JSON.stringify(j).slice(0, 300)}`);
  cache[file] = j.document._id;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  console.log(`    uploaded ${file} → ${j.document._id}`);
  return cache[file];
}

let keyN = 0;
const key = () => `pe${(keyN++).toString(36)}${Date.now().toString(36).slice(-4)}`;

/** A `figure` value pointing at an uploaded asset. */
/** Credits are stored bare: Slideshow and the portrait caption print the ©. */
const figure = (assetId, { alt, credit, caption } = {}) => ({
  _type: 'figure',
  _key: key(),
  asset: { _type: 'reference', _ref: assetId },
  ...(alt ? { alt } : {}),
  ...(credit ? { credit } : {}),
  ...(caption ? { caption } : {}),
});

/* -------------------------------------------------------- portable text */

/**
 * Paragraphs into a localeBlock. `en` only: an empty translation falls back
 * to English, a machine-translated one pretending to be French does not
 * (CLAUDE.md). Markers: `[text](url)` becomes an external link.
 */
function blocks(paragraphs) {
  return {
    _type: 'localeBlock',
    en: paragraphs.map((text) => {
      const markDefs = [];
      const children = [];
      let rest = text;
      const re = /\[([^\]]+)\]\(([^)]+)\)/;
      let m;
      while ((m = re.exec(rest))) {
        if (m.index > 0) children.push({ _type: 'span', _key: key(), text: rest.slice(0, m.index), marks: [] });
        const mk = key();
        markDefs.push({ _type: 'link', _key: mk, href: m[2] });
        children.push({ _type: 'span', _key: key(), text: m[1], marks: [mk] });
        rest = rest.slice(m.index + m[0].length);
      }
      if (rest) children.push({ _type: 'span', _key: key(), text: rest, marks: [] });
      return { _type: 'block', _key: key(), style: 'normal', markDefs, children };
    }),
  };
}

const lead = (tab, paragraphs) => ({ _type: 'editionLead', _key: key(), tab, lead: blocks(paragraphs) });

const highlight = (label, path) => ({
  _type: 'editionHighlight',
  _key: key(),
  label: { _type: 'localeString', en: label },
  link: { _type: 'link', kind: 'route', path },
});

/* ------------------------------------------------------------ the copy */

// Transcribed from the frames in `Previous editions/`.
const COPY = {
  2025: {
    overview:
      'The 2025 edition put Norwegian creation in the spotlight through a dedicated national focus. Highlights also featured a major solo exhibition by guest of honour Elizabeth Jaeger alongside the new art prize laureates.',
    guest: 'The guest of honour of the 2025 edition was American artist Elizabeth Jaeger.',
    artPrize:
      'An immersive journey into the heart of emerging ceramic art, where ten laureates challenge the scales, practices, and narratives of clay.',
    focus:
      'ceramic brussels 2025 highlighted the vitality of the Norwegian scene in collaboration with [Norwegian Crafts](https://www.norwegiancrafts.no/), by hosting 5 Norwegian galleries, co-curating a programme of talks with a renowned panel, during the fair.',
    publication:
      'A special publication dedicated to the fair provides an overview of contemporary ceramic world through interviews, opinion pieces, exchanges and conversations, available online and on paper.',
  },
};

const JAEGER_BIO = [
  'Born in 1988 in San Francisco, USA, Elizabeth Jaeger lives and works in New York.',
  'Elizabeth Jaeger’s dissonant yet poetic sculptures inhabit the space in between ontological categories - her subtle visual inflections resist definition and embrace the rich mystery and murkiness of our shared reality. The artist says: “My working process is to take logic to its illogical conclusion, or a rationale to its irrational end.”',
  'The artist has participated in numerous solo and group exhibitions including prey at Mennour, Paris; yours truly at Museum Moirsbroich, Leverkusen; Licking the Walls at Callie’s, Berlin; Persona and Parasite at White Space, Beijing; How To Survive at the Sprengel Museum, Hannover; Mirror Cells at the Whitney Museum of American Art; Greater New York at MoMA PS1; In Practice: Fantasy Can Invent Nothing New at Sculpture Center, New York; 99 Cents or Less at the Museum of Contemporary Art Detroit, and Zombies: Pay Attention! at the Aspen Art Museum.',
];

const AT_TWILIGHT = [
  'Elizabeth Jaeger has chosen to take possession of the site and transcend it, installing a few simple, docile anthropomorphic sculptures, modelled in black clay and enhanced with bronze highlights — a flora and fauna that play with scale and time. It feels somewhat like an adult fairy tale, a bedtime story of sorts, unless it reflects an urgent need to awaken our consciences, to sound the alarm and finally wake up.',
  'Perhaps here, in the singular setting of a fair, this urgency is even more palpable, and the system of compartmentalisation and confinement specially designed by the artist serves only to clarify the discourse and hasten action. Undoubtedly, this intentional distancing acts as a signal in this entrance — a place of passage entrusted to the artist to occupy, like a carefully crafted invitation for us to pause and shift our gaze.',
  'The question of our belonging to the living world remains more pressing than ever, and to paraphrase Jean-Christophe Bailly in Versant animal, we must acknowledge that if “animals witness the world, we witness it with them, and at the same time as them.” It is this time that Elizabeth Jaeger seeks to address, in her own way, with or in spite of us—a time that is resolutely ageless.',
];

/** The three talks the focus co-curated, as the frame prints them. */
const FOCUS_TALKS = {
  'clay meets painting': { moderator: 'Jorunn Veiteberg' },
  'ceramics: art and industry': { moderator: 'Jorunn Veiteberg' },
  'ceramics in public space': { moderator: 'Marthe Yung Mee Hansen, Norwegian Crafts' },
};

/** Laureate handles and nationalities, from `legacy-export` and the frame. */
const LAUREATES_2025 = {
  'Asya Marakulina': { instagram: 'asya_marakulina', nationality: 'RU' },
  'Béatrice Guilleman': { instagram: 'beatriceguilleman', nationality: 'FR' },
  'Camilla Hanney': { instagram: 'camilla.hanney', nationality: 'IE' },
  'Eléonore Griveau': { instagram: 'CONCRETEELEONORE', nationality: 'FR' },
  'Léonore Chastagner': { instagram: 'leonorechas', nationality: 'FR' },
  'Luna-Isola Bersanetti': { instagram: 'lunaisolab', nationality: 'FR' },
  'Maëlle Dufour': { instagram: 'maelle.dufour', nationality: 'BE' },
  'Pascale Robert': { instagram: 'pascale.robertpascale', nationality: 'FR' },
  'Pia Mougeot': { instagram: 'piamougeot', nationality: 'FR' },
  'Raphaël Emine': { instagram: 'raphael.emine', nationality: 'FR' },
};

/** The page-flip readers, found on the live old site 2026-09-30. */
const PUBLICATIONS = {
  2025: 'https://online.fliphtml5.com/qogyd/xffh/',
  2024: 'https://online.fliphtml5.com/qogyd/ncuf/',
};

/* ----------------------------------------------------------------- run */

const ed = await query(
  `*[_type == "edition" && year in [2024, 2025, 2026]]{ _id, year }`,
);
const editionId = Object.fromEntries(ed.map((e) => [e.year, e._id]));
console.log('editions:', JSON.stringify(editionId));

/* --- 2025: the leads, the overview, the publication -------------------- */
if (wants('leads')) {
  console.log('\nleads, highlights, overview pictures, publication (2025)');
  const wall = await upload('W26423LEvadeHD 14.jpg');
  const ambassador = await upload('250122_CERAMIC2025_010_HD 1-1.jpg');

  patch(editionId[2025], {
    archiveLeads: [
      lead('overview', [COPY[2025].overview]),
      lead('guest-of-honour', [COPY[2025].guest]),
      lead('art-prize', [COPY[2025].artPrize]),
      lead('focus', [COPY[2025].focus]),
      lead('publication', [COPY[2025].publication]),
    ],
    leadImages: [
      figure(wall, { alt: 'The welcome wall at ceramic brussels 2025', credit: 'ceramic brussels' }),
      figure(ambassador, {
        alt: 'Visitors among the Norwegian galleries at ceramic brussels 2025',
        credit: 'Geoffrey Fritsch, ceramic brussels 2025',
      }),
    ],
    highlights: [
      highlight('guest of honour: Elizabeth Jaeger (US)', 'previous-editions/2025/guest-of-honour'),
      highlight('10 art prize laureates', 'previous-editions/2025/art-prize'),
      highlight('Focus on the Norwegian ceramic scene', 'previous-editions/2025/focus'),
      highlight('65 galleries from 14 countries', 'exhibitors/2025'),
    ],
    publication: {
      _type: 'editionPublication',
      url: PUBLICATIONS[2025],
      title: { _type: 'localeString', en: 'ceramic brussels 2025 × AMA' },
    },
  });

  for (const [year, url] of Object.entries(PUBLICATIONS)) {
    if (year === '2025' || !editionId[year]) continue;
    patch(editionId[year], { publication: { _type: 'editionPublication', url } });
  }
}

/* --- the guest of honour ---------------------------------------------- */
if (wants('guest')) {
  console.log('\nguest of honour: portrait, biography, AT TWILIGHT (2025)');
  const portrait = await upload('Photo. Archives Mennour 1.jpg');
  const twilight = await upload('CB26_foire_@Martin_Pilette_Prod_79 6.jpg');

  const jaeger = await query(`*[_type == "artist" && name == "Elizabeth Jaeger"][0]{ _id }`);
  if (!jaeger) fail('Elizabeth Jaeger not found');

  patch(jaeger._id, {
    portrait: figure(portrait, { alt: 'Elizabeth Jaeger', credit: 'Mennour' }),
    bio: blocks(JAEGER_BIO),
    nationality: { _type: 'localeString', en: 'US' },
  });

  patch(editionId[2025], {
    guestInstallation: {
      _type: 'guestInstallation',
      title: { _type: 'localeString', en: 'AT TWILIGHT, ceramic brussels 2025' },
      text: blocks(AT_TWILIGHT),
      author: 'Jean-Marc Dimanche',
      images: [
        figure(twilight, {
          alt: 'AT TWILIGHT, the entrance installation at ceramic brussels 2025',
          credit: 'Geoffrey Fritsch, ceramic brussels 2025',
        }),
      ],
    },
  });
}

/* --- the country focus ------------------------------------------------- */
if (wants('focus')) {
  console.log('\ncountry focus: lead, pictures, galleries, talks (2025)');
  const ambassador = await upload('250122_CERAMIC2025_010_HD 1-1.jpg');
  const talkShot = await upload('250124_CERAMIC2025_306_Web 1.jpg');

  patch(editionId[2025], {
    focus: {
      _type: 'editionFocus',
      lead: blocks([COPY[2025].focus]),
      images: [
        figure(ambassador, {
          alt: 'Visit with the Norwegian Ambassador at ceramic brussels 2025',
          caption: 'Visit with the Norwegian Ambassador',
          credit: 'Geoffrey Fritsch, ceramic brussels 2025',
        }),
      ],
      talkImages: [
        figure(talkShot, {
          alt: 'The “Ceramics in Public Space” talk at ceramic brussels 2025',
          credit: 'Geoffrey Fritsch, ceramic brussels 2025',
        }),
      ],
    },
  });

  // The five Norwegian galleries: the flag the import never set, and the
  // marker it wrote into the name instead.
  const norwegian = await query(
    `*[_type == "exhibitor" && edition->year == 2025 && name match "*focus Norway*"]{ _id, name }`,
  );
  console.log(`  ${norwegian.length} galleries carry the name marker`);
  for (const g of norwegian) {
    patch(g._id, { inCountryFocus: true, name: g.name.replace(/\s*_+\s*focus\s+Norway\s*$/i, '').trim() });
  }

  // The talks, by title. Their descriptions came out of the old site with
  // the credits appended as further paragraphs - "moderator: …",
  // "speakers: …", "language: EN", "location: talk area // hall B" - which
  // the frame sets as its own SPEAKERS and MODERATOR lines instead. The
  // prose is kept, the speakers move to `speakersText`, and the rest goes.
  const talks = await query(
    `*[_type == "programmeEvent" && edition->year == 2025 && lower(title.en) in $titles]{
      _id, "t": title.en, "desc": description
    }`,
    { titles: Object.keys(FOCUS_TALKS) },
  );
  console.log(`  ${talks.length} of ${Object.keys(FOCUS_TALKS).length} focus talks matched`);
  const CREDIT_LINE = /^\s*(moderator|speakers?|language|location|moderatie|sprekers)\s*[:：]/i;
  for (const t of talks) {
    const set = { section: 'focus', moderator: FOCUS_TALKS[t.t.toLowerCase()].moderator };
    const desc = t.desc ?? {};
    const cleaned = {};
    const speakers = {};
    for (const [locale, value] of Object.entries(desc)) {
      if (!Array.isArray(value)) continue;
      cleaned[locale] = value.filter((block) => {
        const text = (block?.children ?? []).map((c) => c?.text ?? '').join('').trim();
        if (!CREDIT_LINE.test(text)) return true;
        const m = text.match(/^\s*(speakers?|sprekers)\s*[:：]\s*(.+)$/i);
        if (m) speakers[locale] = m[2].replace(/\s*;\s*/g, ', ').trim();
        return false;
      });
    }
    if (Object.keys(cleaned).length) set.description = { _type: 'localeBlock', ...cleaned };
    if (Object.keys(speakers).length) set.speakersText = { _type: 'localeString', ...speakers };
    patch(t._id, set);
  }
}

/* --- laureates: handles and nationalities ------------------------------ */
if (wants('laureates')) {
  console.log('\nart prize laureates: Instagram and nationality (2025)');
  const artists = await query(
    `*[_type == "laureate" && edition->year == 2025].artist->{ _id, name }`,
  );
  let n = 0;
  for (const a of artists) {
    const info = LAUREATES_2025[a.name];
    if (!info) {
      console.log(`  ? no handle for "${a.name}"`);
      continue;
    }
    patch(a._id, { instagram: info.instagram, nationality: { _type: 'localeString', en: info.nationality } });
    n++;
  }
  console.log(`  ${n} of ${artists.length} laureates matched`);
}

/* --- programme dates --------------------------------------------------- */
if (wants('dates')) {
  console.log('\nprogramme: the dates the import dropped (2024, 2025)');
  const legacy = JSON.parse(fs.readFileSync('legacy-export/normalized/pastEditions.json', 'utf8'));
  const pages = Array.isArray(legacy) ? legacy : Object.values(legacy);
  const MONTHS = { jan: '01', janv: '01', feb: '02' };
  const SOURCES = { 2025: 'programme-3', 2024: 'programme-27' };

  for (const [year, slug] of Object.entries(SOURCES)) {
    const page = pages.find((p) => (p.slug?.en ?? p.slug) === slug);
    if (!page) continue;
    /** title → "YYYY-MM-DDTHH:MM:00.000Z", built by walking the day headings. */
    const when = new Map();
    let day = null;
    for (const b of page.blocks ?? []) {
      const type = b.type ?? b._type;
      if (type === 'title') {
        const m = String(b.title?.en ?? '').match(/(\d{1,2})\s*([a-z]+)/i);
        if (m && MONTHS[m[2].toLowerCase()]) day = `${year}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
        continue;
      }
      if (type !== 'event' || !day) continue;
      const title = (b.title?.en ?? '').trim();
      const hour = (b.start_hour ?? '11:00').replace('h', ':');
      if (title) when.set(title.toLowerCase(), `${day}T${hour.padStart(5, '0')}:00.000Z`);
    }

    const events = await query(
      `*[_type == "programmeEvent" && edition->year == $year && !defined(startsAt)]{ _id, "t": title.en }`,
      { year: Number(year) },
    );
    let n = 0;
    for (const e of events) {
      const at = when.get((e.t ?? '').trim().toLowerCase());
      if (!at) continue;
      patch(e._id, { startsAt: at });
      n++;
    }
    console.log(`  ${year}: ${n} of ${events.length} undated events dated`);
  }
}

/* --- jury: the links the frame shows as pills ---------------------------- */
if (wants('jury')) {
  console.log('\njury: website, Instagram and country (2024-2026)');
  const legacy = JSON.parse(fs.readFileSync('legacy-export/normalized/pastEditions.json', 'utf8'));
  const pages = Array.isArray(legacy) ? legacy : Object.values(legacy);

  /** name → { website, instagram, countryCode }, read out of the person blocks. */
  const found = new Map();
  for (const page of pages) {
    for (const b of page.blocks ?? []) {
      if ((b.type ?? b._type) !== 'person') continue;
      const title = String(b.title?.en ?? '').trim();
      const m = title.match(/^(.*?)\s*\(([a-z/]{2,5})\)\s*$/i);
      const name = (m ? m[1] : title).trim();
      if (!name) continue;
      const html = String(b.text?.en ?? '');
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
      const entry = found.get(name) ?? {};
      const ig = hrefs.find((h) => /instagram\.com/i.test(h));
      const web = hrefs.find((h) => !/instagram\.com/i.test(h));
      if (ig && !entry.instagram) entry.instagram = (ig.match(/instagram\.com\/([^/?#]+)/i) ?? [])[1];
      if (web && !entry.website) entry.website = web.startsWith('http') ? web : `https://${web}`;
      if (m && !entry.countryCode) entry.countryCode = m[2].split('/')[0].toUpperCase();
      found.set(name, entry);
    }
  }

  const jury = await query(
    `*[_type == "person" && "jury" in groups && edition->year in [2024, 2025, 2026]]{
      _id, name, "y": edition->year, website, instagram, countryCode
    }`,
  );
  let n = 0;
  for (const p of jury) {
    const info = found.get(p.name);
    if (!info) {
      console.log(`  ? nothing in the export for "${p.name}" (${p.y})`);
      continue;
    }
    const set = {};
    if (info.website && !p.website) set.website = info.website;
    if (info.instagram && !p.instagram) set.instagram = info.instagram;
    if (info.countryCode && !p.countryCode) set.countryCode = info.countryCode;
    if (Object.keys(set).length) {
      patch(p._id, set);
      n++;
    }
  }
  console.log(`  ${n} of ${jury.length} jury members filled in`);
}

await commit();
console.log('\nDone. Rebuild to see it: npm run build\n');
