#!/usr/bin/env node
/**
 * The exhibitors platform's page document, from the Figma frame (1813:964,
 * docs/exhibitors-platform.md): the intro line, the agenda calendar with the
 * design's eleven entries (the new agendaSection block), the useful links,
 * the Hoxton deal, Tiphaine's contact and the Embelco block.
 *
 * One document: `page-exhibitors-platform`, section "exhibitors", English
 * slug "platform" - what getPlatformPage reads. The platform renders live,
 * so a publish shows behind the gate immediately, no rebuild.
 *
 * The calendar entries carry the design's own French next to the English
 * and a Dutch translation; the prose blocks the same. Left for the editors,
 * deliberately - the frame has them but no link or file exists yet:
 *   - the exhibitor guide (an embedded catalogue);
 *   - the three forms and their deadline links (Form 1 before 4 Dec,
 *     Forms 2+3 before 8 Jan, dinner before 13 Jan - the deadlines
 *     themselves are on the calendar);
 *   - the communication kit (logos, colour palette);
 *   - the booth photos.
 *
 *   node scripts/seed-exhibitors-platform-page.mjs             plan only
 *   node scripts/seed-exhibitors-platform-page.mjs --apply     write a draft
 *   node scripts/seed-exhibitors-platform-page.mjs --apply --publish
 *   --force   overwrite an existing document
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const FORCE = process.argv.includes('--force');
const ID = 'page-exhibitors-platform';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
if (APPLY && !env.SANITY_API_WRITE_TOKEN) throw new Error('no SANITY_API_WRITE_TOKEN in .env');
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/* ------------------------------------------------------------ helpers */

let n = 0;
const key = (p) => `${p}${(n++).toString(36)}`;

const ls = (en, fr, nl) => ({ _type: 'localeString', en, ...(fr ? { fr } : {}), ...(nl ? { nl } : {}) });
const lt = (en, fr, nl) => ({ _type: 'localeText', en, ...(fr ? { fr } : {}), ...(nl ? { nl } : {}) });

const block = (children, { style = 'normal', defs = [] } = {}) => ({
  _key: key('b'),
  _type: 'block',
  style,
  markDefs: defs,
  children: (Array.isArray(children) ? children : [children]).map((c) =>
    typeof c === 'string'
      ? { _key: key('s'), _type: 'span', marks: [], text: c }
      : { _key: key('s'), _type: 'span', marks: c.marks ?? [], text: c.text },
  ),
});

/** A paragraph whose `phrase` carries an external (mailto/https) link mark. */
const linked = (text, phrase, href) => {
  const [before, after] = text.split(phrase);
  const id = key('m');
  return block([before, { text: phrase, marks: [id] }, after].filter((p) => p !== ''), {
    defs: [{ _key: id, _type: 'link', href }],
  });
};

const entry = (kind, date, label, text, endDate) => ({
  _key: key('e'),
  _type: 'agendaEntry',
  kind,
  date,
  ...(endDate ? { endDate } : {}),
  label,
  ...(text ? { text } : {}),
});

const heading = (title) => ({ _key: key('h'), _type: 'headingSection', title, level: 'group' });

/** A booth photo referencing an asset already in Sanity (the 2026 archive). */
const booth = (ref, alt, caption) => ({
  _key: key('f'),
  _type: 'figure',
  asset: { _type: 'reference', _ref: ref },
  alt,
  caption,
});

/* ------------------------------------------------------------ content */

const sections = [
  {
    _key: key('c'),
    _type: 'contentSection',
    layout: 'single',
    body: {
      en: [block('On this page, you will find all useful information, documents, and forms to fill out.')],
      fr: [block('Vous trouverez sur cette page toutes les informations utiles, les documents et les formulaires à remplir.')],
      nl: [block('Op deze pagina vindt u alle nuttige informatie, documenten en in te vullen formulieren.')],
    },
  },

  heading(ls('agenda')),
  {
    _key: key('a'),
    _type: 'agendaSection',
    entries: [
      entry(
        'deadline',
        '2026-12-04',
        ls('Form 1', 'Formulaire 1', 'Formulier 1'),
        lt(
          'Stand options + lighting\n+\nCatalogue order',
          'Options de stand + lumières\n+\nCommande du catalogue',
          'Standopties + verlichting\n+\nCatalogusbestelling',
        ),
      ),
      entry(
        'payment',
        '2026-12-07',
        ls('Payment', 'Paiement', 'Betaling'),
        lt('2nd half of the stand balance', '2e moitié du solde du stand', 'Tweede helft van het standsaldo'),
      ),
      entry(
        'deadline',
        '2027-01-08',
        ls('Forms 2 + 3', 'Formulaires 2 + 3', 'Formulieren 2 + 3'),
        lt(
          'Badges + (un)loading slots\n+\nInsurance certificates',
          'Badges + créneaux de (dé)chargement\n+\nAttestations d’assurances',
          'Badges + laad- en lostijden\n+\nVerzekeringsattesten',
        ),
      ),
      entry('deadline', '2027-01-13', ls('Dinner booking', 'Réservation du dîner', 'Reservatie van het diner')),
      entry(
        'montage',
        '2027-01-18',
        ls('Build-up', 'Montage', 'Opbouw'),
        lt(
          'Unloading & start of build-up\n16:00–22:00\n→ access rue Picard 3',
          'Déchargement & début montage\n16:00–22:00\n→ accès rue Picard 3',
          'Lossen & start opbouw\n16:00–22:00\n→ toegang rue Picard 3',
        ),
      ),
      entry(
        'montage',
        '2027-01-19',
        ls('Build-up', 'Montage', 'Opbouw'),
        lt(
          'Unloading & build-up\n7:00–22:00\n→ access rue Picard 3',
          'Déchargement & montage\n7:00–22:00\n→ accès rue Picard 3',
          'Lossen & opbouw\n7:00–22:00\n→ toegang rue Picard 3',
        ),
      ),
      entry(
        'fair',
        '2027-01-20',
        ls('Fair', 'Foire', 'Beurs'),
        lt(
          'End of build-up 7:00–11:00\nMandatory break 11:00–12:30\n→ no access to the fair\nPreview 13:00–16:00\nVernissage 16:00–21:00',
          'Fin du montage 7:00–11:00\nPause obligatoire 11:00–12:30\n→ accès à la foire interdit\nPreview 13:00–16:00\nVernissage 16:00–21:00',
          'Einde opbouw 7:00–11:00\nVerplichte pauze 11:00–12:30\n→ geen toegang tot de beurs\nPreview 13:00–16:00\nVernissage 16:00–21:00',
        ),
      ),
      entry(
        'fair',
        '2027-01-21',
        ls('Fair', 'Foire', 'Beurs'),
        lt(
          'Open to the public\n11:00–19:00\n→ sheds 1 & 2 bis',
          'Ouverture publique\n11:00–19:00\n→ sheds 1 & 2 bis',
          'Open voor het publiek\n11:00–19:00\n→ sheds 1 & 2 bis',
        ),
        '2027-01-22',
      ),
      entry(
        'fair',
        '2027-01-23',
        ls('Fair', 'Foire', 'Beurs'),
        lt(
          'Open to the public\n11:00–19:00\n→ sheds 1 & 2 bis\nExhibitors’ drink\n19:30–21:00',
          'Ouverture publique\n11:00–19:00\n→ sheds 1 & 2 bis\nDrink exposant·es\n19:30–21:00',
          'Open voor het publiek\n11:00–19:00\n→ sheds 1 & 2 bis\nDrink voor exposanten\n19:30–21:00',
        ),
      ),
      entry(
        'fair',
        '2027-01-24',
        ls('Fair', 'Foire', 'Beurs'),
        lt(
          'Open to the public\n11:00–18:00\n→ sheds 1 & 2 bis\nStart of dismantling 18:00\nVehicle loading\n19:00–22:00\n→ access rue Picard 3',
          'Ouverture publique\n11:00–18:00\n→ sheds 1 & 2 bis\nDébut démontage 18:00\nChargement des véhicules\n19:00–22:00\n→ accès rue Picard 3',
          'Open voor het publiek\n11:00–18:00\n→ sheds 1 & 2 bis\nStart afbouw 18:00\nLaden van voertuigen\n19:00–22:00\n→ toegang rue Picard 3',
        ),
      ),
    ],
  },

  // The booths strip: a gallery renders as a full-width band between the
  // columns (the route's rule), its section title riding along. The photos
  // are 2026 fair stands from the edition's archive gallery - referenced,
  // not re-uploaded - as stand-ins until Tiphaine has 2027 booth pictures.
  heading(ls('booths', 'stands', 'stands')),
  {
    _key: key('g'),
    _type: 'gallerySection',
    columns: 3,
    images: [
      booth('image-01fc1d5dc417fb63cffa92672deb8105392d4d7f-2048x1365-jpg', "people in front of the sorry we're closed booth at ceramic brussels", 'ceramic brussels © Geoffrey Fritsch'),
      booth('image-ff4b056e9986ad51468d16720f95539a0f9fc610-3600x2400-jpg', 'a booth with ceramic art works during ceramic brussels', 'ceramic brussels © Geoffrey Fritsch'),
      booth('image-3523c159ecd3b376a674c640b78d7a83ddb80553-2500x1667-jpg', 'a booth with ceramics on black plinths at ceramic brussels', 'ceramic brussels © Bureau Rouge'),
      booth('image-40803066807c61d97a4ddfcd7e7a2f659a64074e-2500x1667-jpg', 'visitors at a booth of blue and white ceramics at ceramic brussels', 'ceramic brussels © Geoffrey Fritsch'),
      booth('image-68c923b0b3b747ce34b745c1e2008ae64df0e0fe-2500x1667-jpg', 'a booth with framed works and vases at ceramic brussels', 'ceramic brussels © Geoffrey Fritsch'),
      booth('image-a04da206b5790c25c55349974190405a6b2fcd7a-2500x1667-jpg', 'a booth with works on the wall at ceramic brussels', 'ceramic brussels © Geoffrey Fritsch'),
    ],
  },

  heading(ls('hotel deal', 'offre hôtel', 'hoteldeal')),
  {
    _key: key('c'),
    _type: 'contentSection',
    layout: 'single',
    heading: ls('the hoxton'),
    body: {
      en: [
        block(
          'The Hoxton Brussels is the official hotel partner of ceramic brussels 2027. Ideally located by the Botanical Garden, a short walk from the city’s historic centre and just 6 minutes by car or 15 minutes by public transport from Tour&Taxis, this 4-star hotel is the ideal place for VIPs, journalists and exhibitors to come together during the fair.',
        ),
        block([{ text: '€160/night breakfast included', marks: ['strong'] }]),
        block(
          'Through our partnership, exhibitors benefit from a preferential rate of €160 per night for single occupancy (€180 for double occupancy), including breakfast. For every booking of 6 consecutive nights, exhibitors also receive one complimentary night for a guest of their choice. To book your stay and benefit from the preferential rate, please follow this link and enter the code CERAMIC27.',
        ),
      ],
      fr: [
        block(
          'Le Hoxton Brussels est l’hôtel partenaire officiel de ceramic brussels 2027. Idéalement situé près du Jardin botanique, à quelques pas du centre historique et à seulement 6 minutes en voiture ou 15 minutes en transports en commun de Tour&Taxis, cet hôtel 4 étoiles est le lieu idéal où VIP, journalistes et exposant·es se retrouvent pendant la foire.',
        ),
        block([{ text: '160 €/nuit, petit-déjeuner compris', marks: ['strong'] }]),
        block(
          'Grâce à notre partenariat, les exposant·es bénéficient d’un tarif préférentiel de 160 € par nuit en occupation simple (180 € en occupation double), petit-déjeuner compris. Pour toute réservation de 6 nuits consécutives, les exposant·es reçoivent également une nuit offerte pour un·e invité·e de leur choix. Pour réserver votre séjour au tarif préférentiel, suivez ce lien et introduisez le code CERAMIC27.',
        ),
      ],
      nl: [
        block(
          'The Hoxton Brussels is de officiële hotelpartner van ceramic brussels 2027. Ideaal gelegen bij de Kruidtuin, op wandelafstand van het historische centrum en op amper 6 minuten met de auto of 15 minuten met het openbaar vervoer van Tour&Taxis, is dit viersterrenhotel dé plek waar vips, journalisten en exposanten elkaar tijdens de beurs ontmoeten.',
        ),
        block([{ text: '€ 160/nacht, ontbijt inbegrepen', marks: ['strong'] }]),
        block(
          'Dankzij ons partnerschap genieten exposanten een voorkeurtarief van € 160 per nacht voor een eenpersoonskamer (€ 180 voor een tweepersoonskamer), ontbijt inbegrepen. Bij elke boeking van 6 opeenvolgende nachten krijgen exposanten bovendien één gratis nacht voor een gast naar keuze. Volg deze link en voer de code CERAMIC27 in om uw verblijf aan het voorkeurtarief te boeken.',
        ),
      ],
    },
    links: [
      {
        _key: key('k'),
        _type: 'link',
        kind: 'external',
        external: 'https://thehoxton.com/belgium/brussels/',
        label: ls('book your stay', 'réservez votre séjour', 'boek uw verblijf'),
      },
    ],
  },

];

// The frame's narrow right column, beside the stack above (page.aside).
const aside = [
  heading(ls('useful links', 'liens utiles', 'nuttige links')),
  {
    _key: key('l'),
    _type: 'linksSection',
    variant: 'pill',
    links: [
      {
        _key: key('k'),
        _type: 'link',
        kind: 'route',
        path: 'exhibitors',
        label: ls('see the full exhibitors 2027 list', 'voir la liste complète des exposant·es 2027', 'bekijk de volledige lijst van exposanten 2027'),
      },
      {
        _key: key('k'),
        _type: 'link',
        kind: 'route',
        path: 'vip/programme',
        label: ls('discover our VIP programme', 'découvrez notre programme VIP', 'ontdek ons VIP-programma'),
      },
      {
        _key: key('k'),
        _type: 'link',
        kind: 'route',
        path: 'visit',
        label: ls('visitors info', 'infos visiteurs', 'bezoekersinfo'),
      },
    ],
  },

  heading(ls('more questions?', 'd’autres questions ?', 'nog vragen?')),
  {
    _key: key('c'),
    _type: 'contentSection',
    layout: 'single',
    heading: ls('tiphaine quéguineur'),
    body: {
      en: [
        block('Exhibitor Relations & Fair Coordination'),
        linked('tiphaine@ceramic.brussels', 'tiphaine@ceramic.brussels', 'mailto:tiphaine@ceramic.brussels'),
        block('+32 492 57 65 51'),
      ],
      fr: [
        block('Relations exposant·es & coordination de la foire'),
        linked('tiphaine@ceramic.brussels', 'tiphaine@ceramic.brussels', 'mailto:tiphaine@ceramic.brussels'),
        block('+32 492 57 65 51'),
      ],
      nl: [
        block('Exposantenrelaties & beurscoördinatie'),
        linked('tiphaine@ceramic.brussels', 'tiphaine@ceramic.brussels', 'mailto:tiphaine@ceramic.brussels'),
        block('+32 492 57 65 51'),
      ],
    },
  },

  // The spacer is the route's marker: the sidebar continues below the
  // booths band, which lands the transport partner beside the hotel.
  { _key: key('s'), _type: 'spacerSection', size: 'medium' },

  heading(ls('transport partner', 'partenaire transport', 'transportpartner')),
  {
    _key: key('c'),
    _type: 'contentSection',
    layout: 'single',
    heading: ls('embelco'),
    body: {
      en: [linked('nils@embelco.be', 'nils@embelco.be', 'mailto:nils@embelco.be')],
    },
    links: [
      {
        _key: key('k'),
        _type: 'link',
        kind: 'external',
        external: 'https://www.embelco.be/',
        label: ls('website'),
      },
    ],
  },
];

const doc = {
  _id: ID,
  _type: 'page',
  title: ls('exhibitors platform', 'plateforme exposants', 'exposantenplatform'),
  section: 'exhibitors',
  slug: {
    en: { _type: 'slug', current: 'platform' },
    fr: { _type: 'slug', current: 'platform' },
    nl: { _type: 'slug', current: 'platform' },
  },
  sections,
  aside,
};

/* ------------------------------------------------------------ run */

const existing = await client.fetch('*[_id in [$id, $draft]]{_id}', { id: ID, draft: `drafts.${ID}` });
if (existing.length && !FORCE) {
  console.error(`${existing.map((d) => d._id).join(', ')} already exists - re-run with --force to overwrite.`);
  process.exit(1);
}

console.log(
  `${doc.sections.length} sections + ${doc.aside.length} sidebar, ${doc.sections.find((s) => s._type === 'agendaSection').entries.length} agenda entries.`,
);
if (!APPLY) {
  console.log(`Plan only. --apply writes drafts.${ID}; add --publish to publish it.`);
  process.exit(0);
}

const id = PUBLISH ? ID : `drafts.${ID}`;
await client.createOrReplace({ ...doc, _id: id });
console.log(`wrote ${id}${PUBLISH ? ' (published - the platform renders it live)' : ' (draft - publish in the Studio to show it)'}`);
console.log('Left for the editors: exhibitor guide embed, the three form links, communication kit, booth photos.');
