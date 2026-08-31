#!/usr/bin/env node
/**
 * Fills the dataset with enough realistic content to exercise every page and
 * every content type. Uses deterministic document IDs, so re-running updates
 * the same documents instead of piling up duplicates.
 *
 *   npm run seed            create or update the demo content
 *   npm run seed -- --clear remove everything this script created
 *
 * Content is modelled on the real fair but written for the demo - it is not
 * scraped from ceramic.brussels.
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

const block = (text) => ({
  _type: 'block',
  _key: Math.abs(hash(text)).toString(36).slice(0, 8),
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: 's0', text, marks: [] }],
});

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

const rich = (en, fr, nl) => ({ en: [block(en)], fr: [block(fr)], nl: [block(nl)] });
const str = (en, fr, nl) => ({ _type: 'localeString', en, fr, nl });
const text = (en, fr, nl) => ({ _type: 'localeText', en, fr, nl });

/* ------------------------------------------------------------------ data */

const EDITIONS = [
  {
    id: `${PREFIX}edition-2026`,
    year: 2026,
    startDate: '2026-01-21',
    endDate: '2026-01-25',
    isCurrent: true,
    title: str('Ceramic Brussels 2026', 'Ceramic Brussels 2026', 'Ceramic Brussels 2026'),
    intro: rich(
      'The fourth edition brings together more than seventy galleries from across Europe and beyond, all dedicated to contemporary ceramic art.',
      'La quatrième édition réunit plus de soixante-dix galeries européennes et internationales, toutes consacrées à la céramique contemporaine.',
      'De vierde editie brengt meer dan zeventig galerieën uit Europa en daarbuiten samen, allemaal gewijd aan hedendaagse keramiek.',
    ),
    ticketsUrl: 'https://www.ceramic.brussels/en/visitors-info',
    catalogueUrl: 'https://www.ceramic.brussels/en/exhibitors',
  },
  {
    id: `${PREFIX}edition-2025`,
    year: 2025,
    startDate: '2025-01-23',
    endDate: '2025-01-26',
    isCurrent: false,
    title: str('Ceramic Brussels 2025', 'Ceramic Brussels 2025', 'Ceramic Brussels 2025'),
  },
];

const ARTISTS = [
  {
    id: `${PREFIX}artist-marion-verboom`,
    name: 'Marion Verboom',
    nationality: 'French',
    birthYear: 1983,
    isGuestOfHonour: true,
    bio: rich(
      'Verboom builds stacked, totemic columns that read as core samples of imagined civilisations, layering plaster, resin and glazed ceramic.',
      'Verboom élève des colonnes totémiques empilées, telles des carottes géologiques de civilisations imaginaires, superposant plâtre, résine et céramique émaillée.',
      'Verboom bouwt gestapelde, totemachtige kolommen die lezen als boorkernen van verbeelde beschavingen, in gips, hars en geglazuurd keramiek.',
    ),
    works: [
      { title: 'Achronie XVII', year: 2025, materials: str('Glazed stoneware, plaster', 'Grès émaillé, plâtre', 'Geglazuurd steengoed, gips'), dimensions: { height: 180, width: 40, depth: 40 } },
      { title: 'Strata', year: 2024, materials: str('Ceramic and resin', 'Céramique et résine', 'Keramiek en hars'), dimensions: { height: 95, width: 35, depth: 35 } },
    ],
  },
  {
    id: `${PREFIX}artist-heidi-bjorgan`,
    name: 'Heidi Bjørgan',
    nationality: 'Norwegian',
    birthYear: 1970,
    bio: rich(
      'Bjørgan works with found ceramic objects and thick, unruly glazes, treating the kiln as a collaborator rather than a tool.',
      'Bjørgan travaille à partir d’objets céramiques trouvés et d’émaux épais et indociles, traitant le four en collaborateur plutôt qu’en outil.',
      'Bjørgan werkt met gevonden keramische objecten en dikke, weerbarstige glazuren, en behandelt de oven als medewerker in plaats van gereedschap.',
    ),
    works: [
      { title: 'Untitled (Green)', year: 2025, materials: str('Earthenware, glaze', 'Terre cuite, émail', 'Aardewerk, glazuur'), dimensions: { height: 42, width: 30, depth: 28 } },
    ],
  },
  {
    id: `${PREFIX}artist-nils-martin`,
    name: 'Nils Martin',
    nationality: 'Norwegian',
    birthYear: 1986,
    bio: rich(
      'Martin makes vessels that hover between function and sculpture, finished in slips that record every movement of the hand.',
      'Martin réalise des vases oscillant entre fonction et sculpture, finis dans des engobes qui enregistrent chaque geste de la main.',
      'Martin maakt vaten die zweven tussen functie en sculptuur, afgewerkt met engobes die elke handbeweging vastleggen.',
    ),
    works: [],
  },
  {
    id: `${PREFIX}artist-montse-rego`,
    name: 'Montse Rego',
    nationality: 'Spanish',
    birthYear: 1978,
    bio: rich(
      'Rego presses porcelain into thin, folded planes that behave more like textile than clay.',
      'Rego presse la porcelaine en plans fins et pliés qui se comportent davantage comme du textile que comme de l’argile.',
      'Rego perst porselein tot dunne, gevouwen vlakken die zich meer als textiel dan als klei gedragen.',
    ),
    works: [],
  },
];

const EXHIBITORS = [
  {
    id: `${PREFIX}exhibitor-format-oslo`,
    name: 'Format Oslo',
    country: 'Norway',
    city: 'Oslo',
    booth: 'B32',
    website: 'https://formatoslo.no',
    instagram: 'formatoslo',
    artists: [`${PREFIX}artist-heidi-bjorgan`, `${PREFIX}artist-nils-martin`],
    bio: rich(
      'Founded in 1991, Format is the leading gallery for contemporary crafts and design in Norway.',
      'Fondée en 1991, Format est la première galerie norvégienne dédiée à l’artisanat et au design contemporains.',
      'Format, opgericht in 1991, is de toonaangevende galerie voor hedendaagse vormgeving in Noorwegen.',
    ),
  },
  {
    id: `${PREFIX}exhibitor-metro-gallery`,
    name: 'METRO Gallery',
    country: 'Spain',
    city: 'Vigo',
    booth: 'B12',
    website: 'https://metrogallery.es',
    instagram: 'metrogallery',
    artists: [`${PREFIX}artist-montse-rego`],
    bio: rich(
      'Founded and directed by Javier Blanco, METRO was created in 2007 to promote contemporary art from Galicia and beyond.',
      'Fondée et dirigée par Javier Blanco, METRO a été créée en 2007 pour promouvoir l’art contemporain de Galice et d’ailleurs.',
      'METRO, opgericht en geleid door Javier Blanco, ontstond in 2007 om hedendaagse kunst uit Galicië en daarbuiten te tonen.',
    ),
  },
  {
    id: `${PREFIX}exhibitor-al-tiba9`,
    name: 'Al-Tiba9 Gallery',
    country: 'Spain',
    city: 'Barcelona',
    booth: 'B9',
    website: 'https://altiba9.com',
    instagram: 'altiba9',
    artists: [],
    bio: rich(
      'Founded in Algeria in 2013, Al-Tiba9 opened its Barcelona space in October 2023.',
      'Fondée en Algérie en 2013, Al-Tiba9 a ouvert son espace barcelonais en octobre 2023.',
      'Al-Tiba9, in 2013 opgericht in Algerije, opende in oktober 2023 een ruimte in Barcelona.',
    ),
  },
  {
    id: `${PREFIX}exhibitor-puls-contemporary`,
    name: 'Puls Contemporary Ceramics',
    country: 'Belgium',
    city: 'Brussels',
    booth: 'A21',
    website: 'https://pulsceramics.com',
    instagram: 'pulsceramics',
    artists: [`${PREFIX}artist-marion-verboom`],
    bio: rich(
      'A Brussels gallery showing contemporary ceramics since 2000, with a particular focus on European studio practice.',
      'Galerie bruxelloise consacrée à la céramique contemporaine depuis 2000, avec un intérêt marqué pour la pratique européenne en atelier.',
      'Een Brusselse galerie die sinds 2000 hedendaagse keramiek toont, met bijzondere aandacht voor Europese atelierpraktijk.',
    ),
  },
  {
    id: `${PREFIX}exhibitor-galerie-marianne`,
    name: 'Galerie Marianne Heller',
    country: 'Germany',
    city: 'Heidelberg',
    booth: 'A4',
    website: 'https://galerie-heller.de',
    instagram: 'galeriehellerheidelberg',
    artists: [],
    bio: rich(
      'One of the longest-running ceramic galleries in Germany, showing studio ceramics since 1989.',
      'L’une des plus anciennes galeries de céramique d’Allemagne, présentant de la céramique d’atelier depuis 1989.',
      'Een van de oudste keramiekgalerieën van Duitsland, actief met atelierkeramiek sinds 1989.',
    ),
  },
];

const NEWS = [
  {
    id: `${PREFIX}news-exhibitor-list-2026`,
    slug: 'exhibitor-list-2026-announced',
    publishedAt: '2025-10-14T09:00:00.000Z',
    category: 'announcement',
    title: str(
      'The 2026 exhibitor list is announced',
      'La liste des exposants 2026 est dévoilée',
      'De exposantenlijst voor 2026 is bekend',
    ),
    excerpt: text(
      'More than seventy galleries will take part in the fourth edition at Tour & Taxis.',
      'Plus de soixante-dix galeries participeront à la quatrième édition à Tour & Taxis.',
      'Meer dan zeventig galerieën nemen deel aan de vierde editie in Tour & Taxis.',
    ),
    body: rich(
      'The selection committee has confirmed the galleries taking part in January. The list spans fifteen countries and includes eleven galleries showing at the fair for the first time.',
      'Le comité de sélection a confirmé les galeries participant en janvier. La liste couvre quinze pays et compte onze galeries présentes pour la première fois.',
      'De selectiecommissie heeft de deelnemende galerieën voor januari bevestigd. De lijst omvat vijftien landen en elf galerieën die voor het eerst deelnemen.',
    ),
  },
  {
    id: `${PREFIX}news-guest-of-honour-2026`,
    slug: 'marion-verboom-guest-of-honour',
    publishedAt: '2025-11-06T10:30:00.000Z',
    category: 'announcement',
    title: str(
      'Marion Verboom is the 2026 guest of honour',
      'Marion Verboom, invitée d’honneur 2026',
      'Marion Verboom is eregast in 2026',
    ),
    excerpt: text(
      'The French sculptor will present a new series of stacked ceramic columns.',
      'La sculptrice française présentera une nouvelle série de colonnes céramiques empilées.',
      'De Franse beeldhouwer toont een nieuwe reeks gestapelde keramische kolommen.',
    ),
    body: rich(
      'Verboom will occupy the central hall with Achronie, an ongoing series of stacked columns that read as core samples of imagined civilisations.',
      'Verboom occupera le hall central avec Achronie, série continue de colonnes empilées évoquant des carottes de civilisations imaginaires.',
      'Verboom vult de centrale hal met Achronie, een doorlopende reeks gestapelde kolommen als boorkernen van verbeelde beschavingen.',
    ),
  },
  {
    id: `${PREFIX}news-2025-recap`,
    slug: 'looking-back-at-2025',
    publishedAt: '2025-02-04T12:00:00.000Z',
    category: 'recap',
    title: str('Looking back at 2025', 'Retour sur 2025', 'Terugblik op 2025'),
    excerpt: text(
      'Nineteen thousand visitors over four days, and a record number of first-time collectors.',
      'Dix-neuf mille visiteurs en quatre jours et un nombre record de nouveaux collectionneurs.',
      'Negentienduizend bezoekers in vier dagen en een recordaantal nieuwe verzamelaars.',
    ),
    body: rich(
      'The third edition closed with strong sales across every price band and a noticeably younger audience than in previous years.',
      'La troisième édition s’est clôturée sur de fortes ventes dans toutes les gammes de prix et un public sensiblement plus jeune.',
      'De derde editie sloot af met sterke verkoop in alle prijsklassen en een merkbaar jonger publiek.',
    ),
  },
];

const PAGES = [
  {
    id: `${PREFIX}page-about`,
    navOrder: 10,
    title: str('About the fair', 'À propos', 'Over de beurs'),
    navLabel: str('About', 'À propos', 'Over'),
    slug: { en: 'about', fr: 'a-propos', nl: 'over' },
    intro: text(
      'The first international contemporary art fair dedicated to ceramics.',
      'La première foire internationale d’art contemporain consacrée à la céramique.',
      'De eerste internationale hedendaagse kunstbeurs gewijd aan keramiek.',
    ),
    body: rich(
      'Ceramic Brussels was founded to give contemporary ceramic art the kind of stage usually reserved for painting and sculpture. Each January the fair takes over Tour & Taxis for five days.',
      'Ceramic Brussels a été fondée pour offrir à la céramique contemporaine une scène habituellement réservée à la peinture et à la sculpture. Chaque janvier, la foire investit Tour & Taxis pendant cinq jours.',
      'Ceramic Brussels werd opgericht om hedendaagse keramiek het podium te geven dat doorgaans voor schilderkunst en sculptuur is gereserveerd. Elke januari neemt de beurs vijf dagen lang Tour & Taxis over.',
    ),
  },
  {
    id: `${PREFIX}page-visitors`,
    navOrder: 20,
    title: str('Visitor information', 'Informations pratiques', 'Praktische info'),
    navLabel: str('Visit', 'Infos pratiques', 'Bezoek'),
    slug: { en: 'visit', fr: 'infos-pratiques', nl: 'praktische-info' },
    intro: text(
      'Opening hours, tickets and how to reach Tour & Taxis.',
      'Horaires, billets et accès à Tour & Taxis.',
      'Openingsuren, tickets en bereikbaarheid van Tour & Taxis.',
    ),
    body: rich(
      'The fair runs from 21 to 25 January 2026. Doors open at 11:00 daily, with a late opening until 21:00 on Friday.',
      'La foire se tient du 21 au 25 janvier 2026. Ouverture à 11h00 chaque jour, nocturne jusqu’à 21h00 le vendredi.',
      'De beurs loopt van 21 tot 25 januari 2026. Dagelijks open vanaf 11.00 uur, met avondopening tot 21.00 uur op vrijdag.',
    ),
  },
  {
    id: `${PREFIX}page-applications`,
    navOrder: 30,
    title: str('Gallery applications', 'Candidatures galeries', 'Aanmelding galerieën'),
    navLabel: str('Apply', 'Candidater', 'Aanmelden'),
    slug: { en: 'gallery-applications', fr: 'candidatures-galeries', nl: 'aanmelding-galerieen' },
    intro: text(
      'Applications for the 2027 edition open in March.',
      'Les candidatures pour l’édition 2027 ouvrent en mars.',
      'Aanmeldingen voor de editie 2027 openen in maart.',
    ),
    body: rich(
      'Galleries are selected by an independent committee. Applications require a booth proposal, artist list and images of recent presentations.',
      'Les galeries sont sélectionnées par un comité indépendant. Le dossier comprend une proposition de stand, une liste d’artistes et des visuels de présentations récentes.',
      'Galerieën worden geselecteerd door een onafhankelijke commissie. Een aanmelding bevat een standvoorstel, kunstenaarslijst en beelden van recente presentaties.',
    ),
  },
];

const PROGRAMME = [
  {
    id: `${PREFIX}event-opening-talk`,
    slug: 'why-ceramics-now',
    startsAt: '2026-01-22T14:00:00.000Z',
    endsAt: '2026-01-22T15:00:00.000Z',
    kind: 'talk',
    location: 'Talks Room',
    speakers: [`${PREFIX}artist-marion-verboom`],
    title: str('Why ceramics, now?', 'Pourquoi la céramique, maintenant ?', 'Waarom keramiek, nu?'),
    description: rich(
      'A conversation on why ceramic practice has moved from the margins of contemporary art to its centre.',
      'Une conversation sur le passage de la céramique des marges au centre de l’art contemporain.',
      'Een gesprek over hoe keramiek van de marge naar het centrum van de hedendaagse kunst verhuisde.',
    ),
  },
  {
    id: `${PREFIX}event-glaze-workshop`,
    slug: 'glaze-chemistry-workshop',
    startsAt: '2026-01-23T11:00:00.000Z',
    endsAt: '2026-01-23T13:00:00.000Z',
    kind: 'workshop',
    location: 'Workshop Space',
    speakers: [`${PREFIX}artist-heidi-bjorgan`],
    title: str('Glaze chemistry in practice', 'La chimie des émaux en pratique', 'Glazuurchemie in de praktijk'),
    description: rich(
      'A hands-on session on building glazes that behave unpredictably, and learning to work with that.',
      'Une séance pratique sur la fabrication d’émaux imprévisibles et l’art de composer avec.',
      'Een praktijksessie over glazuren die zich onvoorspelbaar gedragen, en leren daarmee te werken.',
    ),
  },
  {
    id: `${PREFIX}event-award-ceremony`,
    slug: 'award-ceremony-2026',
    startsAt: '2026-01-24T18:00:00.000Z',
    endsAt: '2026-01-24T19:00:00.000Z',
    kind: 'ceremony',
    location: 'Main Hall',
    speakers: [],
    title: str('Award ceremony', 'Remise des prix', 'Prijsuitreiking'),
    description: rich(
      'The jury announces the Ceramic Brussels Art Prize and the Best Booth award.',
      'Le jury annonce le Prix Ceramic Brussels et le prix du meilleur stand.',
      'De jury maakt de Ceramic Brussels Art Prize en de prijs voor de beste stand bekend.',
    ),
  },
];

const PARTNERS = [
  { id: `${PREFIX}partner-tour-taxis`, name: 'Tour & Taxis', tier: 'main', order: 10, url: 'https://tour-taxis.com' },
  { id: `${PREFIX}partner-visit-brussels`, name: 'visit.brussels', tier: 'institutional', order: 20, url: 'https://visit.brussels' },
  { id: `${PREFIX}partner-wallonie-bruxelles`, name: 'Wallonie-Bruxelles International', tier: 'institutional', order: 30 },
  { id: `${PREFIX}partner-the-art-newspaper`, name: 'The Art Newspaper', tier: 'media', order: 40 },
  { id: `${PREFIX}partner-bruzz`, name: 'BRUZZ', tier: 'media', order: 50 },
];

const PRESS = [
  { id: `${PREFIX}press-1`, title: 'Ceramics finally gets its own art fair', outlet: 'The Art Newspaper', publishedAt: '2026-01-22', language: 'en', url: 'https://www.theartnewspaper.com' },
  { id: `${PREFIX}press-2`, title: 'À Bruxelles, la céramique prend toute la place', outlet: 'Le Soir', publishedAt: '2026-01-23', language: 'fr' },
  { id: `${PREFIX}press-3`, title: 'Keramiek verovert Tour & Taxis', outlet: 'BRUZZ', publishedAt: '2026-01-21', language: 'nl' },
  { id: `${PREFIX}press-4`, title: 'The quiet rise of the ceramic collector', outlet: 'Financial Times', publishedAt: '2025-01-28', language: 'en' },
];

const AWARDS = [
  {
    id: `${PREFIX}award-art-prize-2025`,
    name: str('Ceramic Brussels Art Prize', 'Prix Ceramic Brussels', 'Ceramic Brussels Kunstprijs'),
    edition: `${PREFIX}edition-2025`,
    winnerArtist: `${PREFIX}artist-heidi-bjorgan`,
    citation: rich(
      'For a body of work that treats the kiln as a collaborator and accident as method.',
      'Pour une œuvre qui fait du four un collaborateur et de l’accident une méthode.',
      'Voor een oeuvre dat de oven als medewerker en het toeval als methode behandelt.',
    ),
  },
  {
    id: `${PREFIX}award-best-booth-2025`,
    name: str('Best Booth', 'Meilleur stand', 'Beste stand'),
    edition: `${PREFIX}edition-2025`,
    winnerExhibitor: `${PREFIX}exhibitor-format-oslo`,
    citation: rich(
      'For a presentation that gave each work the space it needed and none that it did not.',
      'Pour une présentation offrant à chaque œuvre l’espace nécessaire, et rien de plus.',
      'Voor een presentatie die elk werk precies de ruimte gaf die het nodig had.',
    ),
  },
];

/* --------------------------------------------------------------- helpers */

const ref = (id) => ({ _type: 'reference', _ref: id });
const refArray = (ids) =>
  ids.map((id, i) => ({ _type: 'reference', _ref: id, _key: `r${i}` }));

function buildDocs() {
  const docs = [];

  docs.push({
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: 'Ceramic Brussels',
    tagline: str(
      'The international fair for contemporary ceramic art',
      'La foire internationale d’art céramique contemporain',
      'De internationale beurs voor hedendaagse keramiek',
    ),
    contactEmail: 'info@ceramic.brussels',
    instagramUrl: 'https://www.instagram.com/ceramic.brussels/',
    newsletterUrl: 'https://mailchi.mp/ceramic/ceramic-brussels',
    practicalInfo: {
      address: 'Tour & Taxis\nAvenue du Port 88\n1000 Brussels',
      openingHours: text(
        'Daily 11:00 – 19:00, Friday until 21:00',
        'Tous les jours 11h00 – 19h00, vendredi jusqu’à 21h00',
        'Dagelijks 11.00 – 19.00 uur, vrijdag tot 21.00 uur',
      ),
      transport: text(
        'Metro Yser, then a ten minute walk along the canal.',
        'Métro Yser, puis dix minutes à pied le long du canal.',
        'Metro IJzer, daarna tien minuten wandelen langs het kanaal.',
      ),
    },
  });

  docs.push({
    _id: 'navigation',
    _type: 'navigation',
    items: [
      { _key: 'n1', _type: 'navItem', kind: 'route', route: 'exhibitors', label: str('Exhibitors', 'Exposants', 'Exposanten') },
      { _key: 'n2', _type: 'navItem', kind: 'route', route: 'artists', label: str('Artists', 'Artistes', 'Kunstenaars') },
      { _key: 'n3', _type: 'navItem', kind: 'route', route: 'programme', label: str('Programme', 'Programme', 'Programma') },
      { _key: 'n4', _type: 'navItem', kind: 'route', route: 'news', label: str('News', 'Actualités', 'Nieuws') },
      { _key: 'n5', _type: 'navItem', kind: 'page', page: ref(`${PREFIX}page-about`), label: str('About', 'À propos', 'Over') },
      { _key: 'n6', _type: 'navItem', kind: 'page', page: ref(`${PREFIX}page-visitors`), label: str('Visit', 'Infos pratiques', 'Bezoek') },
      { _key: 'n7', _type: 'navItem', kind: 'route', route: 'awards', label: str('Awards', 'Prix', 'Prijzen') },
      { _key: 'n8', _type: 'navItem', kind: 'route', route: 'partners', label: str('Partners', 'Partenaires', 'Partners') },
      { _key: 'n9', _type: 'navItem', kind: 'route', route: 'press', label: str('Press', 'Presse', 'Pers') },
      { _key: 'n10', _type: 'navItem', kind: 'route', route: 'editions', label: str('Past editions', 'Éditions précédentes', 'Vorige edities') },
      { _key: 'n11', _type: 'navItem', kind: 'page', page: ref(`${PREFIX}page-applications`), label: str('Apply', 'Candidater', 'Aanmelden') },
    ],
    footerItems: [
      { _key: 'f1', _type: 'navItem', kind: 'page', page: ref(`${PREFIX}page-visitors`), label: str('Visitor information', 'Infos pratiques', 'Praktische info') },
      { _key: 'f2', _type: 'navItem', kind: 'external', url: 'https://www.instagram.com/ceramic.brussels/', label: str('Instagram', 'Instagram', 'Instagram') },
    ],
  });

  for (const e of EDITIONS) {
    docs.push({
      _id: e.id,
      _type: 'edition',
      year: e.year,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: 'Tour & Taxis, Brussels',
      isCurrent: e.isCurrent,
      ...(e.intro ? { intro: e.intro } : {}),
      ...(e.ticketsUrl ? { ticketsUrl: e.ticketsUrl } : {}),
      ...(e.catalogueUrl ? { catalogueUrl: e.catalogueUrl } : {}),
    });
  }

  for (const a of ARTISTS) {
    docs.push({
      _id: a.id,
      _type: 'artist',
      name: a.name,
      slug: { _type: 'slug', current: a.id.replace(`${PREFIX}artist-`, '') },
      nationality: a.nationality,
      birthYear: a.birthYear,
      isGuestOfHonour: !!a.isGuestOfHonour,
      bio: a.bio,
      works: (a.works ?? []).map((w, i) => ({
        _type: 'artwork',
        _key: `w${i}`,
        title: w.title,
        year: w.year,
        materials: w.materials,
        dimensions: w.dimensions,
      })),
    });
  }

  for (const x of EXHIBITORS) {
    docs.push({
      _id: x.id,
      _type: 'exhibitor',
      name: x.name,
      slug: { _type: 'slug', current: x.id.replace(`${PREFIX}exhibitor-`, '') },
      edition: ref(`${PREFIX}edition-2026`),
      booth: x.booth,
      country: x.country,
      city: x.city,
      website: x.website,
      instagram: x.instagram,
      bio: x.bio,
      artists: refArray(x.artists ?? []),
    });
  }

  for (const n of NEWS) {
    docs.push({
      _id: n.id,
      _type: 'newsItem',
      title: n.title,
      slug: { _type: 'slug', current: n.slug },
      publishedAt: n.publishedAt,
      category: n.category,
      excerpt: n.excerpt,
      body: n.body,
      edition: ref(`${PREFIX}edition-2026`),
    });
  }

  for (const p of PAGES) {
    docs.push({
      _id: p.id,
      _type: 'page',
      title: p.title,
      navLabel: p.navLabel,
      navOrder: p.navOrder,
      slug: {
        en: { _type: 'slug', current: p.slug.en },
        fr: { _type: 'slug', current: p.slug.fr },
        nl: { _type: 'slug', current: p.slug.nl },
      },
      intro: p.intro,
      body: p.body,
    });
  }

  for (const e of PROGRAMME) {
    docs.push({
      _id: e.id,
      _type: 'programmeEvent',
      title: e.title,
      slug: { _type: 'slug', current: e.slug },
      edition: ref(`${PREFIX}edition-2026`),
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      kind: e.kind,
      location: e.location,
      speakers: refArray(e.speakers ?? []),
      description: e.description,
    });
  }

  for (const p of PARTNERS) {
    docs.push({
      _id: p.id,
      _type: 'partner',
      name: p.name,
      tier: p.tier,
      order: p.order,
      ...(p.url ? { url: p.url } : {}),
    });
  }

  for (const p of PRESS) {
    docs.push({
      _id: p.id,
      _type: 'pressClip',
      title: p.title,
      outlet: p.outlet,
      publishedAt: p.publishedAt,
      language: p.language,
      ...(p.url ? { url: p.url } : {}),
    });
  }

  for (const a of AWARDS) {
    docs.push({
      _id: a.id,
      _type: 'award',
      name: a.name,
      edition: ref(a.edition),
      ...(a.winnerArtist ? { winnerArtist: ref(a.winnerArtist) } : {}),
      ...(a.winnerExhibitor ? { winnerExhibitor: ref(a.winnerExhibitor) } : {}),
      citation: a.citation,
    });
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
  const tx = ids.reduce((t, id) => t.delete(id).delete(`drafts.${id}`), client.transaction());
  await tx.commit();
  console.log(`Deleted ${ids.length} seeded documents. siteSettings was left in place.`);
  process.exit(0);
}

const docs = buildDocs();

// References must exist before the documents that point at them, so commit in
// dependency order rather than one big transaction.
const order = ['siteSettings', 'edition', 'artist', 'exhibitor', 'newsItem', 'page', 'programmeEvent', 'partner', 'pressClip', 'award', 'navigation'];

for (const type of order) {
  const batch = docs.filter((d) => d._type === type);
  if (!batch.length) continue;
  const tx = batch.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
  await tx.commit();
  console.log(`${String(batch.length).padStart(3)}  ${type}`);
}

console.log(`\nSeeded ${docs.length} documents into ${projectId}/${dataset}.`);
console.log('Run "npm run seed -- --clear" to remove them again.');
