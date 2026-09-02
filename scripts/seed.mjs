#!/usr/bin/env node
/**
 * Fills the dataset with enough realistic content to exercise every page and
 * every content type. Uses deterministic document IDs, so re-running updates
 * the same documents instead of piling up duplicates.
 *
 *   npm run seed            create or update the demo content
 *   npm run seed -- --clear remove everything this script created
 *
 * Content follows the 2027 design (docs/design-inventory.md) and the facts on
 * the old site (docs/legacy-site-inventory.md): real fair dates, real partner
 * tiers, real laureates - but written for the demo, and only a handful of
 * exhibitors. The full exhibitor lists are imported separately by
 * scripts/import-exhibitors.mjs.
 *
 * Long texts are English-only on purpose: the site falls back to English when
 * a translation is empty, and `npm run content` should show that gap.
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';

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
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET;
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });

/** Every seeded document id starts with this, so cleanup is unambiguous. */
const PREFIX = 'demo-';

/* --------------------------------------------------------------- helpers */

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}
const key = (s) => Math.abs(hash(s)).toString(36).slice(0, 8);

const block = (text, style = 'normal') => ({
  _type: 'block',
  _key: key(text),
  style,
  markDefs: [],
  children: [{ _type: 'span', _key: 's0', text, marks: [] }],
});

/** Rich text from one or more paragraphs per language. `null` leaves a language empty. */
const rich = (en, fr = null, nl = null) => {
  const toBlocks = (v) => (v == null ? undefined : (Array.isArray(v) ? v : [v]).map((p) => block(p)));
  return { en: toBlocks(en), fr: toBlocks(fr), nl: toBlocks(nl) };
};
const str = (en, fr = en, nl = en) => ({ _type: 'localeString', en, fr, nl });
const text = (en, fr = en, nl = en) => ({ _type: 'localeText', en, fr, nl });
const ref = (id) => ({ _type: 'reference', _ref: id });
/** For singletons: a weak reference survives the target being deleted by --clear. */
const weak = (id) => ({ _type: 'reference', _ref: id, _weak: true });
const refs = (ids) => ids.map((id, i) => ({ _type: 'reference', _ref: id, _key: `r${i}` }));
const withKeys = (items, type) => items.map((it, i) => ({ _type: type, _key: `${type}${i}`, ...it }));
const route = (label, routeValue, anchor) => ({
  _type: 'link',
  kind: 'route',
  route: routeValue,
  ...(anchor ? { anchor } : {}),
  label: str(...label),
});
const external = (label, url) => ({ _type: 'link', kind: 'external', external: url, label: str(...label) });
const slugOf = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const id = {
  edition: (y) => `${PREFIX}edition-${y}`,
  artist: (n) => `${PREFIX}artist-${slugOf(n)}`,
  exhibitor: (n, y) => `${PREFIX}exhibitor-${y}-${slugOf(n)}`,
  partner: (n) => `${PREFIX}partner-${slugOf(n)}`,
  person: (n, y) => `${PREFIX}person-${slugOf(n)}${y ? `-${y}` : ''}`,
  page: (n) => `${PREFIX}page-${slugOf(n)}`,
};

/* --------------------------------------------------------------- editions */

const EDITIONS = [
  {
    year: 2027,
    isCurrent: true,
    startDate: '2027-01-20',
    endDate: '2027-01-24',
    ordinal: str('4th edition', '4e édition', '4de editie'),
    guestOfHonour: id.artist('Marion Verboom'),
    intro: rich(
      "ceramic brussels' 4th edition will take place from 20 till 24 January 2027 at Tour & Taxis, Brussels.",
      'La 4e édition de ceramic brussels se tiendra du 20 au 24 janvier 2027 à Tour & Taxis, Bruxelles.',
      'De 4de editie van ceramic brussels vindt plaats van 20 tot 24 januari 2027 in Tour & Taxis, Brussel.',
    ),
    openingHours: withKeys(
      [
        {
          label: str('Wednesday 20 January 2027', 'Mercredi 20 janvier 2027', 'Woensdag 20 januari 2027'),
          date: '2027-01-20',
          slots: withKeys(
            [
              { time: '14—17:00', label: str('Preview', 'Preview', 'Preview'), invitationOnly: true },
              { time: '17—21:00', label: str('Vernissage', 'Vernissage', 'Vernissage'), invitationOnly: true },
            ],
            'openingSlot',
          ),
        },
        {
          label: str(
            'Thursday 21 — Saturday 23 January 2027',
            'Jeudi 21 — samedi 23 janvier 2027',
            'Donderdag 21 — zaterdag 23 januari 2027',
          ),
          date: '2027-01-21',
          slots: withKeys([{ time: '11—19:00', label: str('Public opening', 'Ouverture au public', 'Open voor publiek') }], 'openingSlot'),
        },
        {
          label: str('Sunday 24 January 2027', 'Dimanche 24 janvier 2027', 'Zondag 24 januari 2027'),
          date: '2027-01-24',
          slots: withKeys([{ time: '11—18:00', label: str('Public opening', 'Ouverture au public', 'Open voor publiek') }], 'openingSlot'),
        },
      ],
      'openingDay',
    ),
    lastEntry: str(
      'Last entry 30 minutes before closing.',
      'Dernière entrée 30 minutes avant la fermeture.',
      'Laatste toegang 30 minuten voor sluitingstijd.',
    ),
    tickets: withKeys(
      [
        { name: str('Day ticket', 'Billet journée', 'Dagticket'), price: '20€' },
        {
          name: str('4-day pass', 'Pass 4 jours', '4-dagenpas'),
          price: '38€',
          note: text('valid from 21—24 January 2027', 'valable du 21 au 24 janvier 2027', 'geldig van 21 tot 24 januari 2027'),
        },
        {
          name: str('Reduction ticket', 'Tarif réduit', 'Kortingsticket'),
          price: '8€',
          note: text(
            'students under 22, job seekers, EU disability card holders',
            'étudiants de moins de 22 ans, demandeurs d’emploi, titulaires de la carte européenne du handicap',
            'studenten onder 22, werkzoekenden, houders van de Europese handicapkaart',
          ),
        },
        {
          name: str('Article 27', 'Article 27', 'Artikel 27'),
          price: '1,25€',
          note: text(
            'no advance booking; at the ticket office upon presentation of the Article 27 voucher',
            'pas de réservation ; à la billetterie sur présentation du ticket Article 27',
            'geen voorverkoop; aan de kassa op vertoon van de Artikel 27-bon',
          ),
        },
        { name: str('Under 12 years old', 'Moins de 12 ans', 'Onder 12 jaar'), price: 'Free' },
      ],
      'ticketType',
    ),
    ticketsUrl: 'https://ceramicbrussels27.tickoweb.be/selection',
    ticketsNote: text(
      'Tickets are also sold on site, by card or cash. Tickets are non-refundable. Cloakroom 2€.',
      'Billets également en vente sur place, par carte ou en espèces. Billets non remboursables. Vestiaire 2€.',
      'Tickets ook ter plaatse te koop, met kaart of cash. Tickets worden niet terugbetaald. Vestiaire 2€.',
    ),
  },
  {
    year: 2026,
    startDate: '2026-01-21',
    endDate: '2026-01-25',
    ordinal: str('3rd edition', '3e édition', '3de editie'),
    countryFocus: str('focus España'),
    guestOfHonour: id.artist('Elmar Trenkwalder'),
    keyFigures: withKeys(
      [
        { value: '19,200', label: str('visitors', 'visiteurs', 'bezoekers') },
        { value: '70', label: str('exhibitors', 'exposants', 'exposanten') },
        { value: '200+', label: str('artists', 'artistes', 'kunstenaars') },
        { value: '15', label: str('countries', 'pays', 'landen') },
        { value: '3,500', label: str('VIPs') },
        { value: '230+', label: str('press clips', 'articles de presse', 'persartikels') },
      ],
      'keyFigure',
    ),
    film: { _type: 'video', url: 'https://youtu.be/IyklMBqj4L4', title: str('Visions behind ceramic brussels 2026') },
    catalogueUrl: 'https://online.fliphtml5.com/qogyd/CB26_CATALOGUE/',
    overviewUrl: 'https://online.fliphtml5.com/qogyd/ohtg/',
    pressClipsUrl: 'https://online.fliphtml5.com/qogyd/CB26_press_clips/',
  },
  {
    year: 2025,
    startDate: '2025-01-22',
    endDate: '2025-01-26',
    ordinal: str('2nd edition', '2e édition', '2de editie'),
    countryFocus: str('focus Norway', 'focus Norvège', 'focus Noorwegen'),
    guestOfHonour: id.artist('Elizabeth Jaeger'),
    keyFigures: withKeys(
      [
        { value: '17,840', label: str('visitors', 'visiteurs', 'bezoekers') },
        { value: '65', label: str('galleries', 'galeries', 'galerieën') },
        { value: '200+', label: str('artists', 'artistes', 'kunstenaars') },
        { value: '14', label: str('countries', 'pays', 'landen') },
        { value: '13', label: str('talks', 'conférences', 'talks') },
      ],
      'keyFigure',
    ),
    overviewUrl: 'https://online.fliphtml5.com/qogyd/tozg/',
  },
  {
    year: 2024,
    startDate: '2024-01-24',
    endDate: '2024-01-28',
    ordinal: str('1st edition', '1re édition', '1ste editie'),
    guestOfHonour: id.artist('Johan Creten'),
    keyFigures: withKeys(
      [
        { value: '12,900', label: str('visitors', 'visiteurs', 'bezoekers') },
        { value: '55', label: str('galleries', 'galeries', 'galerieën') },
        { value: '200', label: str('artists', 'artistes', 'kunstenaars') },
        { value: '10+', label: str('countries', 'pays', 'landen') },
        { value: '100+', label: str('press clips', 'articles de presse', 'persartikels') },
      ],
      'keyFigure',
    ),
  },
];

/* ---------------------------------------------------------------- artists */

const ARTISTS = [
  {
    name: 'Marion Verboom',
    birthYear: 1983,
    countryCode: 'FR',
    nationality: str('France', 'France', 'Frankrijk'),
    basedIn: str('Paris'),
    gallery: 'Galerie Lelong, Paris',
    intro: rich(
      "Based in Paris, Verboom's work unfolds through a precise sculptural language informed by architecture, mythology and systems of writing, where forms evolve through layering and recomposition. A selection of her works will be presented at the entrance of the fair, in collaboration with Galerie Lelong.",
      "Basée à Paris, Marion Verboom déploie un langage sculptural précis, nourri d'architecture, de mythologie et de systèmes d'écriture, où les formes évoluent par strates et recompositions. Une sélection de ses œuvres sera présentée à l'entrée de la foire, en collaboration avec la Galerie Lelong.",
    ),
    sections: [
      {
        heading: str('biography', 'biographie', 'biografie'),
        anchor: 'biography',
        body: rich([
          'Born in 1983, Marion Verboom lives and works in Paris. She graduated from the École nationale supérieure des Beaux-Arts in Paris in 2009 and continued her training at De Ateliers in Amsterdam between 2009 and 2011.',
          'Since then, she has developed a distinctive body of work that occupies a singular position within contemporary sculpture, at the intersection of architecture, ornament and the history of forms.',
          'Her work has been widely presented in institutional contexts in France and internationally, including solo exhibitions at La Verrière – Fondation d’entreprise Hermès in Brussels, Le Voyage à Nantes and the Frac Île-de-France. It is held in several public collections, including the Centre national des arts plastiques (CNAP), MAC VAL and the Musée d’Arts de Nantes.',
        ]),
      },
      {
        heading: str('sculptural practice', 'pratique sculpturale', 'sculpturale praktijk'),
        anchor: 'practice',
        body: rich([
          'Marion Verboom’s work is based on a principle of iteration, assembling fragments into modular structures that can be combined, repeated and reorganised. Since 2015, she has been developing the ongoing series Achronies, a group of totemic sculptures that revisit the traditional architectural column.',
          'Working across a wide variety of materials — including concrete, wood, plaster, bronze, clay and resin — she develops sculptures that unfold through a process combining technical precision and experimentation.',
        ]),
      },
    ],
    video: { _type: 'video', url: 'https://youtu.be/IyklMBqj4L4', title: str('Marion Verboom in the studio') },
    interview: rich([
      'How did ceramics enter your practice?',
      'Through architecture, really. I was looking for a material that could hold a mould and a gesture at the same time, and clay does both.',
    ]),
    works: [
      { title: 'Achronie XVII', year: 2025, materials: str('Glazed stoneware, plaster', 'Grès émaillé, plâtre', 'Geglazuurd steengoed, gips'), dimensions: { height: 180, width: 40, depth: 40 } },
      { title: 'Chryséléphantine', year: 2023, materials: str('Ceramic, resin, bronze', 'Céramique, résine, bronze', 'Keramiek, hars, brons') },
    ],
  },
  { name: 'Elmar Trenkwalder', birthYear: 1959, countryCode: 'AT', nationality: str('Austria', 'Autriche', 'Oostenrijk'), gallery: 'Galerie Bernard Jordan', bio: rich('Elmar Trenkwalder builds monumental glazed architectures whose ornament borrows from the baroque, the gothic and the body.') },
  { name: 'Elizabeth Jaeger', birthYear: 1988, countryCode: 'US', nationality: str('United States', 'États-Unis', 'Verenigde Staten'), gallery: 'Mennour', bio: rich('Elizabeth Jaeger’s figures and vessels hover between stillness and threat; her installation AT TWILIGHT opened the 2025 fair.') },
  { name: 'Johan Creten', birthYear: 1963, countryCode: 'BE', nationality: str('Belgium', 'Belgique', 'België'), bio: rich('A pioneer of the return of ceramics to contemporary art, Johan Creten was the guest of honour of the first edition in 2024.') },

  /* 2026 laureates */
  {
    name: 'Lorie Ballage',
    birthYear: 1994,
    countryCode: 'FR',
    basedIn: str('Norway', 'Norvège', 'Noorwegen'),
    instagram: 'lorieballage',
    bio: rich([
      'Lorie Ballage’s practice emerges from a deep engagement with water — as a transformative element and a metaphor for the fluidity of human experience. She works predominantly with ceramic sculptures, combined with recycled industrial materials, narration, and sound to create environments that blur the line between the familiar and the uncanny.',
      'These multi-sensory spaces aim to invite slowness and reflection, revealing hidden layers of connection. In a world saturated with ceramics — often invisible in their everyday utility — Ballage seeks to unearth the poetic and political potential of failure, absurdity, and disuse.',
    ]),
  },
  {
    name: 'Uriel Caspi',
    birthYear: 1993,
    countryCode: 'IL',
    basedIn: str('The Netherlands', 'Pays-Bas', 'Nederland'),
    instagram: 'caspiceramics',
    bio: rich(
      'From early childhood, ceramic artist Uriel Caspi has been fascinated with clay. He earned a BFA in Ceramics from the Bezalel Academy, Jerusalem (2018), and an MFA from Alfred University, New York (2021). He has worked internationally as an academic fellow and artist-in-residence, including the Archie Bray Foundation, Yingge Ceramics Museum, EKWC and Cercco–HEAD Genève. Born in Haifa, Israel, Caspi is currently based in Tilburg, The Netherlands.',
    ),
  },
  {
    name: 'Danny Cremers',
    birthYear: 1989,
    countryCode: 'NL',
    basedIn: str('The Netherlands', 'Pays-Bas', 'Nederland'),
    instagram: 'nicevases',
    bio: rich([
      'Danny Cremers is an Amsterdam-based Dutch ceramic artist working with handbuilt porcelain. Trained in fashion design at Central Saint Martins, he explores classical forms through subtle imbalance and imperfection. His vases hold a quiet tension between freedom and control, with textured surfaces and loosely constructed forms.',
      'Drawn to the energy of the sketch, open-ended, intuitive, and unconcerned with finality, he seeks to capture that same immediacy in each finished piece.',
    ]),
  },
  { name: 'Marie Pic', countryCode: 'FR', instagram: 'mariepic', bio: rich('Marie Pic won the 2026 jury prize and will present a solo show at ceramic brussels 2027.') },
  { name: 'Ninon Hivert', countryCode: 'FR', bio: rich('Ninon Hivert is the laureate of the French Embassy monograph and the Centre Wallonie-Bruxelles | Paris exhibition prize 2026.') },
  { name: 'Walter Yu', countryCode: 'CN', bio: rich('Walter Yu is the laureate of the Keramis residency 2026.') },
  { name: 'Kira Fröse', countryCode: 'DE' },
  { name: 'Santiago Insignares-Martínez', countryCode: 'CO' },
  { name: 'Faye Papargyropoulou', countryCode: 'GR' },
  { name: 'Angelika Stefaniak', countryCode: 'PL' },

  /* 2025 jury prize → 2026 solo show */
  { name: 'Léonore Chastagner', countryCode: 'FR', bio: rich('Winner of the 2025 jury prize, Léonore Chastagner presented a solo show at ceramic brussels 2026.') },

  /* booth artists */
  { name: 'Frédérique Fleury', countryCode: 'FR' },
  { name: 'Barry Wolfryd', countryCode: 'US' },
  { name: 'Tong Xindi & Shen Ting', countryCode: 'CN' },
  { name: 'Heidi Bjørgan', countryCode: 'NO', birthYear: 1970 },
  { name: 'Janis Löhrer', countryCode: 'DE' },
];

/* ------------------------------------------------------------- exhibitors */

/** The twelve cards in the design plus the three special rows the old site carries. */
const EXHIBITORS_2027 = [
  { name: 'AIFA', city: 'Geneva', countryCode: 'CH', country: 'Switzerland', booth: 'A3', soloShow: true, website: 'https://aifa.ch', instagram: 'aifa.ch' },
  {
    name: 'Al-Tiba9 Gallery',
    city: 'Barcelona',
    countryCode: 'ES',
    country: 'Spain',
    booth: 'B9',
    soloShow: true,
    inCountryFocus: true,
    website: 'https://altiba9.gallery',
    instagram: 'altiba9',
    artists: ['Barry Wolfryd'],
    bio: rich('Founded in 2013 in Algeria and now based in Barcelona, Al-Tiba9 Gallery works with artists whose practices sit between craft, sculpture and conceptual art.'),
  },
  {
    name: 'ANALORA',
    city: 'Paris',
    countryCode: 'FR',
    country: 'France',
    booth: 'B28',
    soloShow: true,
    website: 'https://galerieanalora.com/',
    instagram: 'analora_by_annelaurepilet',
    artists: ['Frédérique Fleury'],
    bio: rich(
      [
        'Founded by Anne-Laure Pilet in 2021 in Lisbon, the gallery is now based in Paris. Contemporary ceramics hold a central place in its programme, while the gallery also showcases artists working in other media (painting, drawing, textile, plaster, etc.).',
        'The selection is built around a genuine commitment from both the gallery and the artists. Its ambition is to work hand in hand with artists whose gestures are always meaningful and who push the boundaries of technique.',
      ],
      [
        'Fondée par Anne-Laure Pilet en 2021 à Lisbonne, la galerie est aujourd’hui installée à Paris. La céramique contemporaine occupe une place centrale dans sa programmation, aux côtés d’artistes travaillant d’autres médiums (peinture, dessin, textile, plâtre…).',
        'La sélection repose sur un engagement réel de la galerie comme des artistes, avec l’ambition de travailler main dans la main avec des artistes au geste toujours signifiant, qui repoussent les limites de la technique.',
      ],
    ),
    artistsNote: rich(
      'Anne-Laure Pilet enjoys presenting both emerging and established artists, with works that can sometimes be monumental. Her talent for discovery has been shaped primarily by her life in China and Portugal — two countries, two cultures, and two distinct approaches to contemporary art.',
    ),
  },
  { name: 'Anna Laudel', city: 'Istanbul', countryCode: 'TR', country: 'Turkey', booth: 'B25', website: 'https://annalaudel.gallery', instagram: 'annalaudel.gallery' },
  { name: 'arsenic galerie', city: 'Paris', countryCode: 'FR', country: 'France', booth: 'A14', website: 'https://arsenicgalerie.com' },
  { name: 'Barrera Baldan Galeria', city: 'Madrid', countryCode: 'ES', country: 'Spain', booth: 'B11', inCountryFocus: true },
  { name: 'Galerie Bernard Jordan', sortName: 'Bernard Jordan', city: 'Paris', countryCode: 'FR', country: 'France', booth: 'A19', soloShow: true, artists: ['Elmar Trenkwalder'], website: 'https://galeriebernardjordan.com' },
  { name: 'Brazil Modernist', city: 'Paris', countryCode: 'FR', country: 'France', booth: 'A2' },
  {
    name: 'CHAxARTxRTM',
    city: 'Amsterdam',
    countryCode: 'NL',
    country: 'Netherlands',
    booth: 'A5',
    artists: ['Tong Xindi & Shen Ting'],
    artistsText: str('Dong Quanbin, Liu Langqing, Tong Xindi & Shen Ting, Xin Yaoyao, Xu Chaoqi and Xu Qun'),
    bio: rich([
      'Founded in 2021, CHAxART is an intercultural initiative established by overseas Chinese in the Netherlands. It is dedicated to fostering meaningful exchange and integration between Eastern and Western cultures through the dual lenses of tea and contemporary art.',
      'Positioned at the intersection of traditional tea culture and contemporary artistic practice, CHAxART engages both as powerful instruments for cultural dialogue, critical reflection, and embodied experience.',
    ]),
    artistsNote: rich(
      'By recontextualizing tea within contemporary cultural discourse, CHAxART offers a distinctive curatorial approach that bridges artistic practice and cultural heritage.',
    ),
  },
  { name: 'Deletaille Gallery', city: 'Brussels', countryCode: 'BE', country: 'Belgium', booth: 'A9', soloShow: true, website: 'https://deletaille.com' },
  { name: 'Esther Verhaeghe — art concepts', sortName: 'Esther Verhaeghe', city: 'Brussels', countryCode: 'BE', country: 'Belgium', booth: 'A21' },
  { name: 'Format Oslo', city: 'Oslo', countryCode: 'NO', country: 'Norway', booth: 'B32', artists: ['Heidi Bjørgan'], website: 'https://formatoslo.no', instagram: 'formatoslo' },
  { name: 'Mercatorfonds', city: 'Brussels', countryCode: 'BE', country: 'Belgium', booth: 'C3', kind: 'publisher', website: 'https://mercatorfonds.be', instagram: 'mercatorfondsfondsmercator' },
  { name: 'Marie Pic — jury prize 2026 solo show', sortName: 'Pic', city: 'Paris', countryCode: 'FR', country: 'France', booth: 'B16', kind: 'jury-prize', artists: ['Marie Pic'] },
];

/* ------------------------------------------------------------- partners */

const PARTNERS = [
  { name: 'Puilaetco', tier: 'main', order: 10, url: 'https://www.puilaetco.be', description: rich('Puilaetco is the main partner of ceramic brussels since its first edition.') },
  {
    name: 'The Hoxton',
    tier: 'hotel',
    order: 20,
    url: 'https://thehoxton.com/brussels/',
    instagram: 'thehoxtonhotel',
    description: rich([
      'Set just above the Botanical Gardens and a short walk from Brussels’ historic centre, The Hoxton offers a vibrant base from which to experience the city during ceramic brussels. Spread across floors 13 to 21, its rooms open onto sweeping views of the Brussels skyline, combining modern comfort with a bold, 70s-inspired design language.',
      'More than a place to stay, The Hoxton is also a lively meeting point in the city. Guests can discover Cantina Valentina’s Peruvian-inspired plates, head up to Tope for rooftop tacos and panoramic views, or step outside to explore the surrounding neighbourhood.',
    ]),
  },
  { name: 'Embelco', tier: 'event', order: 30, instagram: 'embelco.art.shipping', subtitle: str('logistics', 'logistique', 'logistiek') },
  {
    name: 'LOEWE FOUNDATION',
    tier: 'institutional',
    order: 40,
    url: 'https://loewefoundation.com',
    description: rich([
      'The LOEWE FOUNDATION was established as a private cultural foundation in 1988 by Enrique Loewe Lynch, a fourth-generation member of LOEWE’s founding family.',
      'Today under the direction of his daughter Sheila Loewe, the Foundation’s mission is to promote creativity, educational programs and to safeguard heritage in the fields of poetry, dance, photography, art and craft.',
    ]),
  },
  { name: 'City of Brussels', tier: 'institutional', order: 41, url: 'https://www.brussels.be' },
  {
    name: 'visit.brussels',
    tier: 'institutional',
    order: 42,
    url: 'https://visit.brussels',
    description: rich('visit.brussels is the regional organisation contributing to the influence of ceramic brussels and the Brussels visibility in general. visit.brussels is an organism of public interest subsidised by the Brussels-Capital Region.'),
  },
  { name: 'Brussels-Capital Region', tier: 'institutional', order: 43, url: 'https://be.brussels' },
  {
    name: 'Wallonia-Brussels International',
    tier: 'institutional',
    order: 44,
    url: 'https://www.wbi.be',
    description: rich('WBI is the organization responsible for the international relations of Wallonia-Brussels. It is the instrument of the international policy conducted by Wallonia, the Wallonia-Brussels Federation, and the French Community Commission of the Brussels-Capital Region, federated entities of Belgium.'),
  },
  {
    name: 'Centre Wallonie-Bruxelles | Paris',
    tier: 'institutional',
    order: 45,
    url: 'https://cwb.fr',
    instagram: 'cwb_paris',
    description: rich('The Centre Wallonie-Bruxelles | Paris, also known as Le Vaisseau, is a catalyst of reference for French-speaking Belgian contemporary creation and its artistic ecosystem.'),
  },
  {
    name: 'Syndicat des négociants en art',
    tier: 'institutional',
    order: 46,
    url: 'https://sna-france.com',
    instagram: 'sna_officiel',
    description: rich('The Syndicat des Négociants en Art is the French professional organization representing dealers and galleries active on the secondary market, from archaeology to modern and contemporary art.'),
  },
  { name: 'Atelier Coperta', tier: 'event', order: 50, url: 'https://atelier-coperta.com', instagram: 'ateliercoperta', subtitle: str('corporate') },
  { name: 'Options', tier: 'event', order: 51, url: 'https://options.be', subtitle: str('furniture', 'mobilier', 'meubilair') },
  { name: 'romarin uniforms', tier: 'event', order: 52, url: 'https://romarinuniforms.com', instagram: 'romarin_uniforms', subtitle: str('apparel', 'tenues', 'kleding') },
  { name: 'BPS22', tier: 'exhibition-pass', order: 60, url: 'https://www.bps22.be', description: rich('Musée d’art de la Province de Hainaut, Charleroi.') },
  { name: 'Centrale for contemporary art', tier: 'exhibition-pass', order: 61, url: 'https://centrale.brussels' },
  { name: 'CID Grand-Hornu', tier: 'exhibition-pass', order: 62, url: 'https://www.cid-grand-hornu.be' },
  { name: 'Keramis', tier: 'exhibition-pass', order: 63, url: 'https://www.keramis.be', description: rich('A museum and space for art and creation dedicated to ceramics, Keramis was built on the site of the old Boch faience factory in La Louvière.') },
  { name: 'Ambassade de France en Belgique', tier: 'art-prize', order: 70, url: 'https://be.ambafrance.org' },
  { name: 'Les Ateliers dans la Forêt', tier: 'art-prize', order: 71 },
  { name: 'The Latvian Centre for Contemporary Ceramics', tier: 'art-prize', order: 72 },
  { name: 'YXCCCA', tier: 'art-prize', order: 73, subtitle: str('Creative & Cultural Ceramic Avenue, Yixing') },
  { name: 'MAD Brussels', tier: 'art-prize', order: 74, url: 'https://mad.brussels' },
  { name: 'The Art Newspaper', tier: 'media', order: 80, url: 'https://www.theartnewspaper.com' },
  { name: 'Le Quotidien de l’Art', tier: 'media', order: 81 },
  { name: 'La Revue de la Céramique et du Verre', tier: 'media', order: 82 },
  { name: 'Ceramics Now', tier: 'media', order: 83 },
  { name: 'COLLECT AAA', tier: 'media', order: 84, url: 'https://collectaaa.be' },
  { name: 'IDEAT', tier: 'media', order: 85, url: 'https://ideat.be' },
  { name: 'BRUZZ', tier: 'media', order: 86 },
  {
    name: 'Traiteur Benjamin',
    tier: 'food-drinks',
    order: 90,
    url: 'https://www.traiteurbenjamin.be',
    subtitle: str('Chez Loulou', 'Chez Loulou', 'Chez Loulou'),
    description: rich([
      'Passionate about gastronomy, Benjamin Schijns learned from the best: he began his career at Le Pain et le Vin, a Michelin-starred restaurant in Brussels, before taking up a position as sommelier at the Sea Grill, chef Yves Mattagne’s 2-star restaurant.',
      'In 2009, he launched Traiteur Benjamin, whose quality of service inspires confidence. He likes to surprise and delight, and will propose dishes that will awaken all the senses.',
    ]),
  },
  {
    name: 'Fernand Obb',
    tier: 'food-drinks',
    order: 91,
    url: 'https://www.fernandobb.be',
    description: rich('Opened in 2018 in the heart of Saint-Gilles, Fernand Obb Delicatessen proposes a popular cuisine made from the best ingredients, in a warm atmosphere. In October 2018 it won Brussels’ best grey shrimp croquette award.'),
  },
  {
    name: 'Flora',
    tier: 'food-drinks',
    order: 92,
    url: 'https://flora.brussels',
    subtitle: str('Belgian craft beers', 'Bières artisanales belges', 'Belgische craft beers'),
    description: rich('Flora is a craft beer project made with flowers, created in 2024 by Maxime and Thibault. Easy-to-drink beers enhanced with a floral touch and without added sugar.'),
  },
  {
    name: 'MOK COFFEE',
    tier: 'food-drinks',
    order: 93,
    url: 'https://mokcoffee.be',
    description: rich('MOK COFFEE offers a complete coffee experience, from bean to cup. Two locations embody this philosophy: one, rustic and welcoming in Leuven, the other, modern and dynamic in Brussels’ Dansaert district.'),
  },
];

/* ------------------------------------------------------- awards & people */

const AWARDS = [
  {
    year: 2026,
    family: 'art-prize',
    order: 1,
    name: str('jury prize', 'prix du jury', 'juryprijs'),
    laureates: ['Marie Pic'],
    outcome: str('will present a solo show during ceramic brussels 2027', 'présentera un solo show lors de ceramic brussels 2027', 'presenteert een solotentoonstelling tijdens ceramic brussels 2027'),
    description: rich('The artist will be given the chance to present their work in a solo show during the 2027 edition of ceramic brussels.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 2,
    name: str('Ambassade de France en Belgique'),
    partner: 'Ambassade de France en Belgique',
    laureates: ['Ninon Hivert'],
    outcome: str('is the laureate of a monograph devoted to her work'),
    description: rich('The artist benefits from the publication of a monograph on their work, supported by the French Embassy in Brussels and produced in partnership with Les Éditions des Ateliers d’Art de France.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 3,
    name: str('Centre Wallonie-Bruxelles | Paris'),
    partner: 'Centre Wallonie-Bruxelles | Paris',
    laureates: ['Ninon Hivert'],
    outcome: str('will take part in an exhibition in 2027 in Paris'),
    description: rich('The artist awarded the Centre Prize will benefit from the presentation of one of their works within a group exhibition produced by the Centre in the 2027 season.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 4,
    name: str('Les Ateliers dans la Forêt'),
    partner: 'Les Ateliers dans la Forêt',
    laureates: ['Danny Cremers'],
    outcome: str('will benefit from a 2-month residency'),
    description: rich('A new artistic residency in France, in the heart of the Orléans forest. The artist will benefit from a 2-month research and creation residency in 2026, including accommodation on site and a fully equipped workshop.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 5,
    name: str('Keramis'),
    partner: 'Keramis',
    laureates: ['Walter Yu'],
    outcome: str('will benefit from a residency in July 2026'),
    description: rich('The artist will benefit from a 30-day residency in July 2026 at the Keramis residence, with a grant of €2,000 and a budget of €500 for kiln hire.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 6,
    name: str('The Latvian Centre for Contemporary Ceramics'),
    partner: 'The Latvian Centre for Contemporary Ceramics',
    laureates: ['Danny Cremers'],
    outcome: str('is the laureate of a 3-week residency in Latvia'),
    description: rich('A three-week residency in Latvia, developed in partnership with the Daugavpils Mark Rothko Museum, concluding with an exhibition at the museum.'),
  },
  {
    year: 2026,
    family: 'art-prize',
    order: 7,
    name: str('YXCCCA'),
    partner: 'YXCCCA',
    laureates: ['Marie Pic', 'Ninon Hivert'],
    outcome: str('are the laureates of a 3-month residency'),
    description: rich('Two artists are hosted for a 3-month residency in Yixing, the birthplace of Chinese purple clay, with free accommodation, studio access, materials and firings, and a grant of 15,000 RMB.'),
  },
  {
    year: 2026,
    family: 'fair',
    order: 10,
    name: str('best booth', 'meilleur stand', 'beste stand'),
    exhibitor: ['Galerie Bernard Jordan', 2027],
    laureates: ['Janis Löhrer'],
    citation: rich('For a booth that let the works breathe and the visitors slow down.'),
  },
  {
    year: 2025,
    family: 'art-prize',
    order: 1,
    name: str('jury prize', 'prix du jury', 'juryprijs'),
    laureates: ['Léonore Chastagner'],
    outcome: str('presented a solo show during ceramic brussels 2026'),
  },
];

const PEOPLE = [
  {
    name: 'Christine Germain-Donnat',
    groups: ['advisory-board', 'jury'],
    countryCode: 'FR',
    order: 1,
    role: str('Patrimony Curator, Ministère de la Culture de France'),
    bio: rich('Trained as a historian and art historian, Christine Germain-Donnat has directed the Musée de la Chasse et de la Nature in Paris since 2019 and previously the Musée National de la Céramique at Sèvres.'),
  },
  { name: 'Florence Reckinger Taddeï', groups: ['advisory-board'], countryCode: 'LU', order: 2, role: str('President of Les Amis des Musées d’art et d’histoire Luxembourg'), bio: rich('In 2019 she founded the Regala gallery and residency program in Arles. She serves on the boards of Mudam, the Edward Steichen Award and Les Rencontres d’Arles.') },
  { name: 'Ludovic Recchia', groups: ['advisory-board'], countryCode: 'BE', order: 3, role: str('Director of Keramis'), bio: rich('Art historian and curator specialising in modern and contemporary ceramics, director and curator of Keramis Museum and Art Center, which he founded in 2015.') },
  { name: 'Geertje Jacobs', groups: ['advisory-board'], countryCode: 'NL', order: 4, role: str('Director of the EKWC'), bio: rich('Director of the European Ceramics Centre (EKWC) in the Netherlands, an international artists’ residency and centre of excellence for ceramics.') },
  { name: 'Magdalena Gerber', groups: ['advisory-board'], countryCode: 'CH', order: 5, role: str('Artist, Professor and Head of CERCCO, HEAD-Geneva'), bio: rich('Since 2013 director of CERCCO, the Centre for Contemporary Ceramics at HEAD – Geneva.') },
  { name: 'Henri Jobbé-Duval', groups: ['advisory-board'], countryCode: 'FR', order: 6, role: str('Co-founder of the Fiac'), bio: rich('A pioneering force in the art market, he helped set up the FIAC organizing committee and contributed to the creation of Art Paris Abu Dhabi.') },
  { name: 'Gilles Parmentier', groups: ['team'], order: 1, role: str('co-director', 'co-directeur', 'co-directeur'), email: 'gilles@ceramic.brussels' },
  { name: 'Jean-Marc Dimanche', groups: ['team', 'jury'], countryCode: 'FR', order: 2, role: str('co-director', 'co-directeur', 'co-directeur'), email: 'jean-marc@ceramic.brussels' },
  { name: 'Tiphaine Quéguineur', groups: ['team'], order: 3, role: str('exhibitors relations & fair coordination', 'relations exposants & coordination', 'relaties exposanten & coördinatie'), email: 'tiphaine@ceramic.brussels' },
  { name: 'Julie Alluin', groups: ['team'], order: 4, role: str('communication & partners relations', 'communication & relations partenaires', 'communicatie & partnerrelaties'), email: 'julie@ceramic.brussels' },
  { name: 'Léonie Lefere', groups: ['team'], order: 5, role: str('graphic designer', 'graphiste', 'grafisch ontwerper'), email: 'leonie@ceramic.brussels' },
  { name: 'Charles Kaisin', groups: ['jury'], year: 2027, countryCode: 'BE', order: 1, role: str('Designer & Scenographer') },
  { name: 'Duan Zhang de Courrèges', groups: ['jury'], year: 2027, countryCode: 'FR', order: 2, role: str('curator & art advisor') },
  { name: 'Galila', groups: ['jury'], year: 2027, countryCode: 'BE', order: 3, role: str('Founder of Galila’s P.O.C') },
  { name: 'Shinsuke Kawahara', groups: ['jury'], year: 2027, countryCode: 'JP', order: 4, role: str('Pluridisciplinary artist') },
];

/* -------------------------------------------------------------- programme */

const PROGRAMME = [
  { year: 2027, section: 'talks', startsAt: '2027-01-21T14:00:00+01:00', kind: 'artist-talk', languages: ['EN'], title: str('Exclusive interview of Marion Verboom, guest of honour 2027'), speakers: ['Marion Verboom'], location: str('talk area, hall B') },
  {
    year: 2027,
    section: 'talks',
    startsAt: '2027-01-21T15:00:00+01:00',
    kind: 'roundtable',
    languages: ['FR'],
    title: str('Exposer la céramique dans les institutions'),
    speakersText: text('with Christine Germain-Donnat (French Ministry of Culture), Ludovic Recchia (Keramis, BE) & Geertje Jacobs (EKWC, NL)'),
    location: str('talk area, hall B'),
  },
  { year: 2027, section: 'talks', startsAt: '2027-01-22T11:30:00+01:00', kind: 'artist-talk', languages: ['EN'], title: str('Thinking Hands: ways of teaching ceramics today'), speakersText: text('with Magdalena Gerber (CERCCO — HEAD Geneva, CH), Geertje Jacobs (EKWC, NL) & Caroline Andrin (ENSAV La Cambre, BE)') },
  { year: 2027, section: 'talks', startsAt: '2027-01-22T13:30:00+01:00', kind: 'artist-talk', languages: ['ES', 'FR'], title: str('In conversation with the 2026 laureates'), speakersText: text('with Lorie Ballage, Uriel Caspi & Danny Cremers') },
  { year: 2027, section: 'awards', startsAt: '2027-01-21T12:00:00+01:00', endsAt: '2027-01-21T13:30:00+01:00', kind: 'ceremony', title: str('Art prize award ceremony', 'Remise des prix', 'Prijsuitreiking'), location: str('art prize area, entrance') },
  { year: 2027, section: 'vip', startsAt: '2027-01-20T14:00:00+01:00', endsAt: '2027-01-20T17:00:00+01:00', kind: 'opening', invitationOnly: true, title: str('Preview', 'Preview', 'Preview') },
  { year: 2027, section: 'vip', startsAt: '2027-01-20T17:00:00+01:00', endsAt: '2027-01-20T21:00:00+01:00', kind: 'opening', invitationOnly: true, title: str('Vernissage') },
];

/* ------------------------------------------------------------------ pages */

const PAGES = [
  {
    key: 'about-the-fair',
    section: 'about',
    order: 1,
    title: str('ceramic brussels'),
    tabLabel: str('ceramic brussels'),
    intro: text(
      'ceramic brussels is the first international contemporary art fair dedicated to ceramics.',
      'ceramic brussels est la première foire internationale d’art contemporain dédiée à la céramique.',
      'ceramic brussels is de eerste internationale beurs voor hedendaagse kunst gewijd aan keramiek.',
    ),
    sections: [
      {
        heading: str('the fair', 'la foire', 'de beurs'),
        anchor: 'the-fair',
        body: rich(
          'ceramic brussels develops an international marketplace and exchange platform while offering the encounter of curated content within a unique experience. Founded in January 2024, ceramic brussels is a committed fair, firmly focused on promoting contemporary ceramics and built around an intense programme of visits, exhibitions, and talks.',
        ),
      },
      {
        heading: str('goals', 'objectifs', 'doelstellingen'),
        anchor: 'goals',
        body: rich([
          'ceramic brussels aims to showcase the vitality and diversity of contemporary ceramics practice, support contemporary creation and stimulate new exchanges between artists, institutions, galleries and the audience. Its aims are:',
          '↘ to showcase the diversity of artistic approaches to ceramics through the selection of international galleries and the involvement of leading global institutions and key players',
          '↘ to offer a unique forum for high-level exchanges, networking, and induce interactions and collaborations',
          '↘ to deliver the ceramic brussels art prize, a European call for projects with an international jury, and several additional prizes to be awarded during the fair',
          '↘ to support the production and dissemination of content dedicated to ceramics',
        ]),
      },
      {
        heading: str('development', 'développement', 'ontwikkeling'),
        anchor: 'development',
        body: rich(
          'Since its first edition, the fair has chosen to invite an artist of honour and to highlight their work through a series of initiatives throughout the fair. In 2026, the artist Elmar Trenkwalder was the guest of honour, following American artist Elizabeth Jaeger (2025) and Belgian artist Johan Creten (2024). From its second edition onwards, ceramic brussels broadened its scope by integrating modern ceramics and introducing a country focus (Norway 2025, Spain 2026).',
        ),
      },
    ],
  },
  { key: 'about-advisory-board', section: 'about', order: 2, title: str('advisory board', 'comité consultatif', 'adviesraad'), intro: text('The fair has the support of renowned international experts in the field of ceramics as its advisory board:', 'La foire bénéficie du soutien d’experts internationaux reconnus dans le domaine de la céramique, réunis en comité consultatif :', 'De beurs wordt gesteund door een adviesraad van gerenommeerde internationale experts in keramiek:') },
  { key: 'about-team', section: 'about', order: 3, title: str('team', 'équipe', 'team') },
  { key: 'about-press', section: 'about', order: 4, title: str('press', 'presse', 'pers'), intro: text('Press clips, press kit and contacts for the Benelux, France and international press.', 'Revue de presse, dossier de presse et contacts pour le Benelux, la France et la presse internationale.', 'Persoverzicht, persmap en contacten voor de Benelux, Frankrijk en de internationale pers.') },
  { key: 'about-images', section: 'about', order: 5, title: str('images', 'images', 'beelden') },
  {
    key: 'art-prize-about',
    section: 'art-prize',
    order: 1,
    title: str('about', 'à propos', 'over'),
    intro: text(
      'The art prize aims to highlight the vitality and diversity of contemporary ceramic practice while supporting young contemporary creators.',
      'Le prix vise à mettre en lumière la vitalité et la diversité de la céramique contemporaine tout en soutenant les jeunes créateurs.',
      'De prijs wil de vitaliteit en diversiteit van hedendaagse keramiek in de kijker zetten en jonge makers ondersteunen.',
    ),
    sections: [
      { heading: str('the prize', 'le prix', 'de prijs'), anchor: 'the-prize', body: rich(['5 laureates will be presented in a group show at ceramic brussels 2027.', 'The selection will be made by an international jury and organized by Jean-Marc Dimanche, co-director of the fair. The laureates will also benefit from awards given by institutional partners, such as residencies, exhibitions and monographies.']) },
      { heading: str('applications', 'candidatures', 'kandidaturen'), anchor: 'applications', body: rich(['The call is open to art students and/or young artists:', '→ based in the EU', '→ with less than 10 years’ practice & research in the field of ceramics', '→ not represented by a gallery', 'Applications for 2027 are now closed.']) },
      { heading: str('partners', 'partenaires', 'partners'), anchor: 'partners', body: rich('On the occasion of the art prize, MAD Brussels, Action et Service and ceramic brussels launched an open call for a Brussels-based designer or studio to imagine a new scenography for the laureates’ works. The studio selected for the third edition is A S C P Studio.') },
    ],
  },
  { key: 'art-prize-laureates', section: 'art-prize', order: 2, title: str('laureates', 'lauréats', 'laureaten') },
  { key: 'art-prize-awards', section: 'art-prize', order: 3, title: str('awards', 'prix', 'prijzen'), intro: text('Expanding opportunities for the laureates, the fair’s institutional partners also grant a prestigious selection of parallel awards, residencies, and exhibition prizes.', 'Les partenaires institutionnels de la foire offrent aux lauréats une sélection de prix parallèles, résidences et expositions.', 'De institutionele partners van de beurs kennen de laureaten bovendien parallelle prijzen, residenties en tentoonstellingen toe.') },
  { key: 'art-prize-jury', section: 'art-prize', order: 4, title: str('jury') },
  {
    key: 'programme-la-cambre',
    section: 'programme',
    order: 1,
    title: str('ceramic brussels x La Cambre'),
    intro: text(
      'La Cambre celebrates its centenary at the heart of ceramic brussels! For this 4th edition, the prestigious Brussels art school takes over the fair with a unique, cross-disciplinary project. From artistic ceramic furniture designed by its alumni to live printing demonstrations with the Letterrestres project, discover how a new generation of artists is pushing boundaries and reshaping the medium.',
    ),
  },
  { key: 'programme-talks', section: 'programme', order: 2, title: str('talks'), intro: text('Open to the public for four days, the fair features around fifteen talks and conferences, including book launches, roundtables and artist talks.', 'Ouverte au public pendant quatre jours, la foire propose une quinzaine de conférences : lancements de livres, tables rondes et rencontres d’artistes.', 'Vier dagen lang biedt de beurs een vijftiental talks: boekvoorstellingen, rondetafels en artist talks.') },
  { key: 'programme-awards', section: 'programme', order: 3, title: str('awards', 'prix', 'prijzen') },
  { key: 'programme-vip', section: 'programme', order: 4, title: str('VIP') },
  { key: 'visit-practical-info', section: 'visit', order: 1, title: str('practical info', 'infos pratiques', 'praktische info') },
  {
    key: 'visit-food-drinks',
    section: 'visit',
    order: 2,
    title: str('food & drinks'),
    intro: text(
      'Each year, ceramic brussels develops collaborations with partners committed to the promotion of Belgian and Brussels know-how. These collaborations make it possible to offer unique, high-quality areas for visitors to discover and take a break, in the heart of the fair.',
      'Chaque année, ceramic brussels développe des collaborations avec des partenaires engagés dans la promotion du savoir-faire belge et bruxellois, pour offrir aux visiteurs des espaces de découverte et de pause au cœur de la foire.',
      'Elk jaar werkt ceramic brussels samen met partners die de Belgische en Brusselse knowhow promoten, om bezoekers unieke plekken te bieden om te ontdekken en te pauzeren, in het hart van de beurs.',
    ),
  },
  { key: 'visit-floor-plan', section: 'visit', order: 3, title: str('floor plan', 'plan', 'plattegrond') },
  { key: 'visit-faq', section: 'visit', order: 4, title: str('FAQ') },
  {
    key: 'gallery-applications',
    order: 10,
    title: str('gallery applications', 'candidatures galeries', 'aanmelding galerieën'),
    navLabel: str('Apply', 'Candidater', 'Aanmelden'),
    slug: { en: 'gallery-applications', fr: 'candidatures-galeries', nl: 'aanmelding-galerieen' },
    intro: text('Applications for the 2027 edition are open until 30 September.', 'Les candidatures pour l’édition 2027 sont ouvertes jusqu’au 30 septembre.', 'Kandidaturen voor de editie 2027 zijn open tot 30 september.'),
    body: rich('Galleries wishing to take part send their application through the form below. Questions go to tiphaine@ceramic.brussels.', 'Les galeries souhaitant participer envoient leur candidature via le formulaire ci-dessous. Questions : tiphaine@ceramic.brussels.', 'Galerieën die willen deelnemen sturen hun kandidatuur via onderstaand formulier. Vragen: tiphaine@ceramic.brussels.'),
  },
];

/* ------------------------------------------------------------------ news */

const NEWS = [
  {
    slug: 'marion-verboom-guest-of-honour-2027',
    publishedAt: '2026-06-10T09:00:00.000Z',
    category: 'announcement',
    year: 2027,
    title: str('Marion Verboom is the guest of honour of ceramic brussels 2027', 'Marion Verboom, invitée d’honneur de ceramic brussels 2027', 'Marion Verboom is eregast van ceramic brussels 2027'),
    excerpt: text('A selection of her works will be presented at the entrance of the fair, in collaboration with Galerie Lelong.', 'Une sélection de ses œuvres sera présentée à l’entrée de la foire, en collaboration avec la Galerie Lelong.', 'Een selectie van haar werk wordt aan de ingang van de beurs getoond, in samenwerking met Galerie Lelong.'),
    body: rich('Every year, ceramic brussels invites an artist whose work marks the field. In 2027 the fair welcomes French sculptor Marion Verboom.'),
  },
  {
    slug: 'gallery-applications-2027-open',
    publishedAt: '2026-05-02T09:00:00.000Z',
    category: 'announcement',
    year: 2027,
    title: str('Gallery applications are open', 'Les candidatures galeries sont ouvertes', 'Aanmeldingen voor galerieën zijn open'),
    excerpt: text('Galleries can apply for the 4th edition until 30 September 2026.', 'Les galeries peuvent candidater à la 4e édition jusqu’au 30 septembre 2026.', 'Galerieën kunnen zich tot 30 september 2026 aanmelden voor de 4de editie.'),
  },
  {
    slug: 'looking-back-at-2026',
    publishedAt: '2026-02-03T12:00:00.000Z',
    category: 'recap',
    year: 2026,
    title: str('Looking back at 2026', 'Retour sur 2026', 'Terugblik op 2026'),
    excerpt: text('19,200 visitors, 70 exhibitors from 15 countries, 3,500 VIPs: the third edition in numbers.', '19 200 visiteurs, 70 exposants de 15 pays, 3 500 VIP : la troisième édition en chiffres.', '19.200 bezoekers, 70 exposanten uit 15 landen, 3.500 VIP’s: de derde editie in cijfers.'),
  },
];

const PRESS = [
  { title: 'Ceramics finally gets its own art fair', outlet: 'The Art Newspaper', publishedAt: '2026-01-22', language: 'en', url: 'https://www.theartnewspaper.com' },
  { title: 'À Bruxelles, la céramique prend toute la place', outlet: 'Le Soir', publishedAt: '2026-01-23', language: 'fr' },
  { title: 'Keramiek verovert Tour & Taxis', outlet: 'BRUZZ', publishedAt: '2026-01-21', language: 'nl' },
  { title: 'The quiet rise of the ceramic collector', outlet: 'Financial Times', publishedAt: '2025-01-28', language: 'en' },
];

/* ------------------------------------------------------------ build docs */

function buildDocs() {
  const docs = [];
  const artistId = (name) => id.artist(name);
  const partnerId = (name) => id.partner(name);

  docs.push({
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: 'ceramic brussels',
    tagline: str(
      'the first international contemporary art fair dedicated to ceramics',
      'la première foire internationale d’art contemporain dédiée à la céramique',
      'de eerste internationale beurs voor hedendaagse kunst gewijd aan keramiek',
    ),
    copyright: '© ceramic brussels, 2026',
    contactEmail: 'info@ceramic.brussels',
    newsletterUrl: 'https://mailchi.mp/ceramic/ceramic-brussels',
    instagramUrl: 'https://www.instagram.com/ceramic.brussels/',
    linkedinUrl: 'https://www.linkedin.com/company/ceramic-brussels/',
    facebookUrl: 'https://www.facebook.com/profile.php?id=100094708248221',
    applicationsUrl: 'https://www.ceramic.brussels/en/gallery-applications',
    pressEmail: 'press@sophiecarree.be',
    pressKitUrl: 'https://online.fliphtml5.com/qogyd/CB26_press_clips/',
    pressContacts: withKeys(
      [
        { region: str('Benelux'), name: 'Sophie Carrée PR', email: 'press@sophiecarree.be', url: 'https://sophiecarree.com' },
        { region: str('France'), name: 'FAVORI', url: 'https://favoriparis.com' },
        { region: str('International'), name: 'A R T Communication + Brand Consultancy', url: 'https://annarosathomae.com', instagram: 'a_r_t_communication' },
      ],
      'pressContact',
    ),
    faq: withKeys(
      [
        { question: str('Can I bring my dog?', 'Puis-je venir avec mon chien ?', 'Mag ik mijn hond meenemen?'), answer: rich('No pets are allowed, assistance animals excepted.', 'Les animaux ne sont pas admis, à l’exception des chiens d’assistance.', 'Huisdieren zijn niet toegelaten, met uitzondering van assistentiehonden.') },
        { question: str('Is the fair accessible to wheelchair users?', 'La foire est-elle accessible aux personnes à mobilité réduite ?', 'Is de beurs toegankelijk voor rolstoelgebruikers?'), answer: rich('Yes. The sheds are on one level and the entrance at Shed 2bis is step-free.', 'Oui. Les sheds sont de plain-pied et l’entrée par le Shed 2bis est sans marche.', 'Ja. De sheds liggen gelijkvloers en de ingang via Shed 2bis is drempelloos.') },
        { question: str('Can I take photographs?', 'Puis-je prendre des photos ?', 'Mag ik foto’s nemen?'), answer: rich('For personal use only.', 'Pour un usage personnel uniquement.', 'Enkel voor persoonlijk gebruik.') },
      ],
      'faqItem',
    ),
    practicalInfo: {
      venueName: 'Tour & Taxis — Sheds 1 & 2bis',
      address: 'Rue Picard 3\n1000 Brussels',
      mapUrl: 'https://goo.gl/maps/KXxSTzu3L6dfdWDD6',
      intro: text(
        "ceramic brussels' 4th edition will take place from 20 till 24 January 2027 at Tour & Taxis, Brussels.",
        'La 4e édition de ceramic brussels se tiendra du 20 au 24 janvier 2027 à Tour & Taxis, Bruxelles.',
        'De 4de editie van ceramic brussels vindt plaats van 20 tot 24 januari 2027 in Tour & Taxis, Brussel.',
      ),
      access: withKeys(
        [
          { mode: str('By public transport', 'En transports en commun', 'Met het openbaar vervoer'), text: text('Metro lines 2 and 6, stop Ribeaucourt or Yser (10 min walk). Bus 14, 20, 46, 86, stop Suzan Daniel.', 'Métro lignes 2 et 6, arrêt Ribeaucourt ou Yser (10 min à pied). Bus 14, 20, 46, 86, arrêt Suzan Daniel.', 'Metro lijnen 2 en 6, halte Ribeaucourt of IJzer (10 min wandelen). Bus 14, 20, 46, 86, halte Suzan Daniel.') },
          { mode: str('By train', 'En train', 'Met de trein'), text: text('Free shuttle service from Brussels-North station, stop at Tour & Taxis.', 'Navette gratuite depuis la gare de Bruxelles-Nord, arrêt Tour & Taxis.', 'Gratis shuttle vanaf station Brussel-Noord, halte Tour & Taxis.') },
          { mode: str('By bike', 'À vélo', 'Met de fiets'), text: text('Bike racks in front of Maison de la Poste, rue Picard 1—11 or avenue du Port 86C. Villo! station at the Gare Maritime, rue Picard 7.', 'Range-vélos devant la Maison de la Poste, rue Picard 1—11 ou avenue du Port 86C. Station Villo! à la Gare Maritime, rue Picard 7.', 'Fietsenstalling voor het Maison de la Poste, Picardstraat 1—11 of Havenlaan 86C. Villo!-station aan de Gare Maritime, Picardstraat 7.') },
          { mode: str('Car park', 'Parking', 'Parking'), text: text('Park Lane, rue Picard 13. Esplanade Parking, avenue du Port 86C.', 'Park Lane, rue Picard 13. Parking Esplanade, avenue du Port 86C.', 'Park Lane, Picardstraat 13. Esplanade Parking, Havenlaan 86C.') },
        ],
        'accessMode',
      ),
      hotelDeal: {
        partner: weak(partnerId('The Hoxton')),
        url: 'https://thehoxton.com/brussels/',
        text: text(
          'For its fourth edition, ceramic brussels partners with The Hoxton, ideally located above the Botanical Gardens and within easy reach of the fair and Brussels’ historic centre.',
          'Pour sa quatrième édition, ceramic brussels s’associe à The Hoxton, idéalement situé au-dessus du Jardin botanique, à deux pas de la foire et du centre historique.',
          'Voor zijn vierde editie werkt ceramic brussels samen met The Hoxton, ideaal gelegen boven de Kruidtuin, dicht bij de beurs en het historische centrum.',
        ),
      },
    },
  });

  docs.push({
    _id: 'homepage',
    _type: 'homepage',
    heroText: text(
      'the first international contemporary art fair dedicated to ceramics',
      'la première foire internationale d’art contemporain dédiée à la céramique',
      'de eerste internationale beurs voor hedendaagse kunst gewijd aan keramiek',
    ),
    heroLink: route(['more on the fair', 'en savoir plus sur la foire', 'meer over de beurs'], 'about'),
    quickLinks: withKeys(
      [
        route(['galleries', 'galeries', 'galerieën'], 'exhibitors'),
        route(['art prize', 'prix', 'prijs'], 'art-prize'),
        route(['visitors info', 'infos pratiques', 'praktische info'], 'visit'),
        external(['tickets', 'billets', 'tickets'], 'https://ceramicbrussels27.tickoweb.be/selection'),
      ],
      'link',
    ),
    spotlights: withKeys(
      [
        {
          kicker: str('guest of honour', 'invitée d’honneur', 'eregast'),
          headline: text('French artist Marion Verboom is the guest of honour of ceramic brussels 2027.', 'L’artiste française Marion Verboom est l’invitée d’honneur de ceramic brussels 2027.', 'De Franse kunstenares Marion Verboom is eregast van ceramic brussels 2027.'),
          link: route(['discover her work', 'découvrir son travail', 'ontdek haar werk'], 'guest-of-honour'),
        },
        {
          kicker: str('partner spotlight', 'partenaire à la une', 'partner in de kijker'),
          headline: text('The Hoxton joins ceramic brussels as a new partner for 2027.', 'The Hoxton rejoint ceramic brussels comme nouveau partenaire pour 2027.', 'The Hoxton wordt nieuwe partner van ceramic brussels voor 2027.'),
          link: route(['discover The Hoxton', 'découvrir The Hoxton', 'ontdek The Hoxton'], 'partners', 'hotel'),
        },
      ],
      'spotlight',
    ),
    banner: {
      text: str('gallery applications are open', 'les candidatures galeries sont ouvertes', 'aanmeldingen voor galerieën zijn open'),
      link: { _type: 'link', kind: 'internal', internal: weak(id.page('gallery-applications')), label: str('apply', 'candidater', 'aanmelden') },
    },
    figuresLink: route(['more on the fair', 'en savoir plus sur la foire', 'meer over de beurs'], 'about'),
    closingBanner: {
      text: str('ceramic brussels 2026 in images', 'ceramic brussels 2026 en images', 'ceramic brussels 2026 in beeld'),
      link: route(['in images', 'en images', 'in beeld'], 'about', 'images'),
    },
  });

  docs.push({
    _id: 'navigation',
    _type: 'navigation',
    items: withKeys(
      [
        {
          label: str('exhibitors', 'exposants', 'exposanten'),
          kind: 'route',
          route: 'exhibitors',
          children: withKeys(
            [
              { label: str('galleries', 'galeries', 'galerieën'), kind: 'route', route: 'exhibitors', anchor: 'galleries' },
              { label: str('country focus', 'focus pays', 'landenfocus'), kind: 'route', route: 'exhibitors', anchor: 'focus' },
              { label: str('publishers', 'éditeurs', 'uitgevers'), kind: 'route', route: 'exhibitors', anchor: 'publishers' },
              { label: str('jury prize 2026', 'prix du jury 2026', 'juryprijs 2026'), kind: 'route', route: 'exhibitors', anchor: 'jury-prize' },
            ],
            'navChild',
          ),
        },
        { label: str('guest of honour', 'invitée d’honneur', 'eregast'), kind: 'route', route: 'guest-of-honour' },
        {
          label: str('art prize', 'prix', 'prijs'),
          kind: 'route',
          route: 'art-prize',
          children: withKeys(
            ['about', 'laureates', 'awards', 'jury'].map((a, i) => ({
              label: str(a, ['à propos', 'lauréats', 'prix', 'jury'][i], ['over', 'laureaten', 'prijzen', 'jury'][i]),
              kind: 'route',
              route: 'art-prize',
              anchor: a,
            })),
            'navChild',
          ),
        },
        {
          label: str('programme', 'programme', 'programma'),
          kind: 'route',
          route: 'programme',
          children: withKeys(
            [
              { label: str('ceramic brussels x La Cambre'), kind: 'route', route: 'programme', anchor: 'la-cambre' },
              { label: str('talks'), kind: 'route', route: 'programme', anchor: 'talks' },
              { label: str('awards', 'prix', 'prijzen'), kind: 'route', route: 'programme', anchor: 'awards' },
              { label: str('VIP'), kind: 'route', route: 'programme', anchor: 'vip' },
            ],
            'navChild',
          ),
        },
        { label: str('partners', 'partenaires', 'partners'), kind: 'route', route: 'partners' },
        {
          label: str('visitors info', 'infos pratiques', 'praktische info'),
          kind: 'route',
          route: 'visit',
          children: withKeys(
            [
              { label: str('opening hours', 'horaires', 'openingsuren'), kind: 'route', route: 'visit', anchor: 'opening-hours' },
              { label: str('access', 'accès', 'bereikbaarheid'), kind: 'route', route: 'visit', anchor: 'access' },
              { label: str('food & drinks'), kind: 'route', route: 'visit', anchor: 'food-drinks' },
              { label: str('floor plan', 'plan', 'plattegrond'), kind: 'route', route: 'visit', anchor: 'floor-plan' },
              { label: str('FAQ'), kind: 'route', route: 'visit', anchor: 'faq' },
            ],
            'navChild',
          ),
        },
        {
          label: str('about', 'à propos', 'over'),
          kind: 'route',
          route: 'about',
          children: withKeys(
            [
              { label: str('ceramic brussels'), kind: 'route', route: 'about', anchor: 'the-fair' },
              { label: str('advisory board', 'comité consultatif', 'adviesraad'), kind: 'route', route: 'about', anchor: 'advisory-board' },
              { label: str('team', 'équipe', 'team'), kind: 'route', route: 'about', anchor: 'team' },
              { label: str('press', 'presse', 'pers'), kind: 'route', route: 'about', anchor: 'press' },
              { label: str('images', 'images', 'beelden'), kind: 'route', route: 'about', anchor: 'images' },
            ],
            'navChild',
          ),
        },
      ],
      'navItem',
    ),
    footerItems: withKeys(
      [
        { label: str('instagram'), kind: 'external', url: 'https://www.instagram.com/ceramic.brussels/' },
        { label: str('newsletter'), kind: 'external', url: 'https://mailchi.mp/ceramic/ceramic-brussels' },
        { label: str('linkedin'), kind: 'external', url: 'https://www.linkedin.com/company/ceramic-brussels/' },
      ],
      'navItem',
    ),
  });

  for (const e of EDITIONS) {
    const { year, guestOfHonour, ...rest } = e;
    docs.push({
      _id: id.edition(year),
      _type: 'edition',
      year,
      title: str(`ceramic brussels ${year}`),
      venue: 'Tour & Taxis, Brussels',
      isCurrent: !!e.isCurrent,
      ...(guestOfHonour ? { guestOfHonour: ref(guestOfHonour) } : {}),
      ...rest,
    });
  }

  for (const a of ARTISTS) {
    const { name, sections, works, ...rest } = a;
    docs.push({
      _id: artistId(name),
      _type: 'artist',
      name,
      slug: { _type: 'slug', current: slugOf(name) },
      ...rest,
      ...(sections ? { sections: withKeys(sections, 'contentSection') } : {}),
      ...(works ? { works: withKeys(works, 'artwork') } : {}),
    });
  }

  for (const x of EXHIBITORS_2027) {
    const { name, artists, ...rest } = x;
    docs.push({
      _id: id.exhibitor(name, 2027),
      _type: 'exhibitor',
      name,
      slug: { _type: 'slug', current: slugOf(name) },
      edition: ref(id.edition(2027)),
      kind: 'gallery',
      soloShow: false,
      inCountryFocus: false,
      ...rest,
      artists: refs((artists ?? []).map(artistId)),
    });
  }

  for (const p of PARTNERS) {
    const { name, ...rest } = p;
    docs.push({ _id: partnerId(name), _type: 'partner', name, ...rest });
  }

  for (const [i, l] of ['Lorie Ballage', 'Uriel Caspi', 'Danny Cremers', 'Kira Fröse', 'Ninon Hivert', 'Santiago Insignares-Martínez', 'Faye Papargyropoulou', 'Marie Pic', 'Angelika Stefaniak', 'Walter Yu'].entries()) {
    docs.push({
      _id: `${PREFIX}laureate-2026-${slugOf(l)}`,
      _type: 'laureate',
      artist: ref(artistId(l)),
      edition: ref(id.edition(2026)),
      order: i + 1,
    });
  }

  for (const [i, a] of AWARDS.entries()) {
    const { year, laureates, partner, exhibitor, ...rest } = a;
    docs.push({
      _id: `${PREFIX}award-${year}-${i + 1}`,
      _type: 'award',
      edition: ref(id.edition(year)),
      laureates: refs((laureates ?? []).map(artistId)),
      ...(partner ? { partner: ref(partnerId(partner)) } : {}),
      ...(exhibitor ? { winnerExhibitor: ref(id.exhibitor(exhibitor[0], exhibitor[1])) } : {}),
      ...rest,
    });
  }

  for (const p of PEOPLE) {
    const { name, year, ...rest } = p;
    docs.push({
      _id: id.person(name, year),
      _type: 'person',
      name,
      ...(year ? { edition: ref(id.edition(year)) } : {}),
      ...rest,
    });
  }

  for (const [i, ev] of PROGRAMME.entries()) {
    const { year, speakers, title, ...rest } = ev;
    docs.push({
      _id: `${PREFIX}event-${year}-${i + 1}`,
      _type: 'programmeEvent',
      title,
      slug: { _type: 'slug', current: slugOf(title.en) },
      edition: ref(id.edition(year)),
      speakers: refs((speakers ?? []).map(artistId)),
      ...rest,
    });
  }

  for (const p of PAGES) {
    const { key: k, sections, slug, ...rest } = p;
    // Hub tabs are matched to the frontend's tab list on their English slug
    // (see src/lib/hubs.ts), so a tab page's slug is the tab slug in every
    // language: "about-the-fair" → "the-fair".
    const tabSlug = k.replace(/^(about|art-prize|programme|visit)-/, '');
    docs.push({
      _id: id.page(k),
      _type: 'page',
      ...rest,
      ...(sections ? { sections: withKeys(sections, 'contentSection') } : {}),
      slug: {
        en: { _type: 'slug', current: slug?.en ?? tabSlug },
        fr: { _type: 'slug', current: slug?.fr ?? tabSlug },
        nl: { _type: 'slug', current: slug?.nl ?? tabSlug },
      },
    });
  }

  for (const n of NEWS) {
    const { slug, year, ...rest } = n;
    docs.push({
      _id: `${PREFIX}news-${slug}`,
      _type: 'newsItem',
      slug: { _type: 'slug', current: slug },
      edition: ref(id.edition(year)),
      ...rest,
    });
  }

  for (const [i, p] of PRESS.entries()) {
    docs.push({ _id: `${PREFIX}press-${i + 1}`, _type: 'pressClip', ...p });
  }

  return docs;
}

/* ------------------------------------------------------------------ main */

const clear = process.argv.includes('--clear');

if (clear) {
  const ids = await client.fetch(`*[_id match $p]._id`, { p: `${PREFIX}*` });
  if (!ids.length) {
    console.log('Nothing to clear.');
    process.exit(0);
  }
  // Earlier seeds pointed the singletons at demo documents with strong
  // references, which would block the delete. Detach them first.
  // Each on its own: a patch on a singleton that does not exist yet would
  // fail the whole transaction and leave the others in place.
  const detach = [
    ['navigation', ['items', 'footerItems']],
    ['siteSettings', ['practicalInfo.hotelDeal']],
    ['homepage', ['banner', 'spotlights', 'quickLinks', 'heroLink', 'figuresLink', 'closingBanner']],
  ];
  for (const [docId, paths] of detach) {
    await client.patch(docId).unset(paths).commit().catch(() => {});
  }
  const tx = ids.reduce((t, id) => t.delete(id).delete(`drafts.${id}`), client.transaction());
  await tx.commit();
  console.log(`Deleted ${ids.length} seeded documents. siteSettings, homepage and navigation were left in place.`);
  process.exit(0);
}

const docs = buildDocs();

// References must exist before the documents that point at them, so commit in
// dependency order rather than one big transaction. Sanity tolerates dangling
// references at write time; the order is for editors opening the Studio
// mid-seed and for the strong-reference checks on delete.
const order = [
  'artist',
  'edition',
  'partner',
  'siteSettings',
  'exhibitor',
  'laureate',
  'award',
  'person',
  'programmeEvent',
  'page',
  'newsItem',
  'pressClip',
  'homepage',
  'navigation',
];

for (const type of order) {
  const batch = docs.filter((d) => d._type === type);
  if (!batch.length) continue;
  const tx = batch.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
  await tx.commit();
  console.log(`${String(batch.length).padStart(3)}  ${type}`);
}

console.log(`\nSeeded ${docs.length} documents into ${projectId}/${dataset}.`);
console.log('Run "npm run seed -- --clear" to remove them again.');
