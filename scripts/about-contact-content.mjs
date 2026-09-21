#!/usr/bin/env node
/**
 * Brings the about → contact tab (`/en/about/team/`) up to the client's
 * design of 2026-09-21 (Google Doc "ceramics"): the lead paragraph, the
 * directors' title and short biographies, the team's roles as the design
 * writes them, phone numbers, and the organiser line and postal address of
 * the closing contact block (Site settings → Contact, backend request #13).
 *
 * The lead and the organiser line are English only (an empty translation
 * falls back to English). The directors' title and short biographies are in
 * all three languages; the French and Dutch are our translations of the
 * design's English, for the client to proofread.
 *
 * Phone numbers are the old site's own (legacy-export), not the design's:
 * the design prints Tiphaine's number under everyone as a placeholder.
 *
 * Nobody is added to or removed from the team, and no photo is touched.
 * Only known fields are set, a draft is patched along with its published
 * document, and a value already in place is skipped, so a re-run is a no-op.
 *
 *   node scripts/about-contact-content.mjs --dry
 *   node scripts/about-contact-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

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

/** Paragraphs as Portable Text, with keys that are the same on every run. */
const blocks = (id, paragraphs, lang = 'en') =>
  paragraphs.map((text, i) => ({
    _key: `${id}${lang}${i * 2}`,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: `${id}${lang}${i * 2 + 1}`, _type: 'span', marks: [], text }],
  }));

const DIRECTOR = { 'role.en': 'Founder & Co-director', 'role.fr': 'Fondateur & co-directeur', 'role.nl': 'Oprichter & codirecteur' };

/** Document id → the fields to set, as patch paths. */
const CHANGES = {
  'demo-page-about-team': {
    'intro.en':
      'The fair is co-directed by Franco-Belgian duo Gilles Parmentier and Jean-Marc Dimanche. Bringing together their complementary expertise and deep roots in the European art scene, they jointly steer ceramic brussels with a shared vision.',
  },
  siteSettings: {
    'organiserText.en': 'ceramic brussels is initiated and organized jointly by studio emosi and ceramic brussels ASBL.',
    postalAddress: 'Rue Franz Merjay 148C\n1050 Ixelles\nBrussels, BELGIUM',
    // The design shows the pill, not where it goes: studio-emosi.com is the
    // studio's own site (it lists ceramic brussels among its projects).
    organiserLink: {
      _type: 'link',
      kind: 'external',
      external: 'https://studio-emosi.com/',
      label: {
        _type: 'localeString',
        en: 'discover studio emosi’s projects',
        fr: 'découvrir les projets de studio emosi',
        nl: 'ontdek de projecten van studio emosi',
      },
    },
  },
  'demo-person-gilles-parmentier': {
    ...DIRECTOR,
    phone: '+32 476 91 07 87',
    'bio.en': blocks('pgilles-parmentier', [
      'With over ten years of background in communication and HR, Gilles Parmentier became Director of the photojournalism and video agency Reporters in 2011.',
      'In 2017, he established Studio Gondo (VO Group) to connect contemporary art with commercial brands. Between 2018 and 2024, he served as Managing Fair Director of Art on Paper, steering its development and founding Brussels Drawing Week alongside more than 30 partner cultural institutions.',
      'He currently develops and collaborates on various high-profile artistic, creative, and event-based projects.',
    ]),
    'bio.fr': blocks('pgilles-parmentier', [
      'Fort de plus de dix ans d’expérience en communication et en ressources humaines, Gilles Parmentier prend en 2011 la direction de Reporters, agence de photojournalisme et de vidéo.',
      'En 2017, il fonde Studio Gondo (VO Group) pour relier l’art contemporain aux marques. De 2018 à 2024, il est Managing Fair Director d’Art on Paper, dont il pilote le développement, et crée la Brussels Drawing Week avec plus de 30 institutions culturelles partenaires.',
      'Il développe aujourd’hui divers projets artistiques, créatifs et événementiels de premier plan, et y collabore.',
    ], 'fr'),
    'bio.nl': blocks('pgilles-parmentier', [
      'Met meer dan tien jaar ervaring in communicatie en hr werd Gilles Parmentier in 2011 directeur van Reporters, het agentschap voor fotojournalistiek en video.',
      'In 2017 richtte hij Studio Gondo (VO Group) op om hedendaagse kunst en merken met elkaar te verbinden. Van 2018 tot 2024 was hij Managing Fair Director van Art on Paper, waarvan hij de ontwikkeling leidde, en richtte hij de Brussels Drawing Week op, samen met meer dan 30 culturele partnerinstellingen.',
      'Vandaag ontwikkelt hij diverse toonaangevende artistieke, creatieve en eventprojecten en werkt hij eraan mee.',
    ], 'nl'),
  },
  'demo-person-jean-marc-dimanche': {
    ...DIRECTOR,
    'bio.en': blocks('pjean-marc-dimanche', [
      'After 20 years leading the design agency V.I.T.R.I.O.L., he co-founded Maison Parisienne in 2008—a traveling gallery for French fine crafts, staging over fifty exhibitions across Europe.',
      'In 2016, he advised H.R.H. the Grand Duchess Heiress of Luxembourg on establishing the De Mains De Maîtres biennial, where he now serves as General Commissioner. From 2019 to 2022, he also directed ELEVEN STEENS in Brussels, a space celebrating Art and Matter across design, crafts, and fine arts.',
      'Today, as an independent curator, he leads craft and contemporary art exhibitions across France, Belgium, and Luxembourg. A former contributor to the Revue de la Céramique et du Verre, he frequently writes for exhibition catalogues and monographs.',
    ]),
    'bio.fr': blocks('pjean-marc-dimanche', [
      'Après avoir dirigé pendant 20 ans l’agence de design V.I.T.R.I.O.L., il cofonde en 2008 Maison Parisienne, galerie itinérante dédiée aux métiers d’art français, qui a présenté plus de cinquante expositions à travers l’Europe.',
      'En 2016, il conseille S.A.R. la Grande-Duchesse héritière de Luxembourg pour la création de la biennale De Mains De Maîtres, dont il est aujourd’hui le commissaire général. De 2019 à 2022, il dirige également ELEVEN STEENS à Bruxelles, un espace consacré à l’Art et à la Matière, entre design, métiers d’art et beaux-arts.',
      'Aujourd’hui commissaire indépendant, il conçoit des expositions de métiers d’art et d’art contemporain en France, en Belgique et au Luxembourg. Ancien contributeur de la Revue de la Céramique et du Verre, il écrit régulièrement pour des catalogues d’exposition et des monographies.',
    ], 'fr'),
    'bio.nl': blocks('pjean-marc-dimanche', [
      'Na 20 jaar aan het hoofd van het designbureau V.I.T.R.I.O.L. was hij in 2008 medeoprichter van Maison Parisienne, een reizende galerie voor Frans kunstambacht, goed voor meer dan vijftig tentoonstellingen in heel Europa.',
      'In 2016 adviseerde hij H.K.H. de Erfgroothertogin van Luxemburg bij de oprichting van de biënnale De Mains De Maîtres, waarvan hij vandaag algemeen commissaris is. Van 2019 tot 2022 leidde hij ook ELEVEN STEENS in Brussel, een ruimte gewijd aan Kunst en Materie, op het snijvlak van design, ambacht en beeldende kunst.',
      'Vandaag maakt hij als onafhankelijk curator tentoonstellingen rond ambacht en hedendaagse kunst in Frankrijk, België en Luxemburg. Hij schreef eerder voor de Revue de la Céramique et du Verre en schrijft geregeld voor tentoonstellingscatalogi en monografieën.',
    ], 'nl'),
  },
  'demo-person-tiphaine-queguineur': { 'role.en': 'Exhibitor Relations & Fair Coordination', phone: '+32 492 57 65 51' },
  'person-felicie-jourdain': { 'role.en': 'Communication & Partner Relations', email: 'felicie@ceramic.brussels' },
  'demo-person-julie-alluin': { 'role.en': 'Communication & Partner Relations', phone: '+32 472 45 35 49' },
  'demo-person-leonie-lefere': { 'role.en': 'Graphic Designer' },
  'person-coralie-pay': { 'role.en': 'Production Coordinator' },
  'person-favori-paris': { 'role.en': 'Press Relations France' },
  'person-marie-douel-studio': { 'role.en': 'Exhibition Design & Scenography Studio' },
  'person-pam-jenny': { 'role.en': 'Visual Identity' },
  'person-sophie-carree': { 'role.en': 'Press Relations Belgium' },
  'person-variable': { 'role.en': 'Web Development' },
};

const PARENT_TYPES = { intro: 'localeText', organiserText: 'localeText', role: 'localeString', bio: 'localeBlock' };

const at = (doc, p) => p.split('.').reduce((v, k) => v?.[k], doc);
const show = (v) => (Array.isArray(v) ? `[${v.length} paragraphs] ${v[0]?.children?.[0]?.text?.slice(0, 50)}…` : JSON.stringify(v));
/** Compare on what is read, not on keys. */
const plain = (v) =>
  Array.isArray(v) ? v.map((b) => b.children?.map((c) => c.text).join('')).join('\n') : v && typeof v === 'object' ? stable(v) : v;
/** An object as the API returns it has its keys in another order. */
function stable(v) {
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  return `{${Object.keys(v).sort().map((k) => `${k}:${stable(v[k])}`).join(',')}}`;
}

let writes = 0;
for (const [baseId, fields] of Object.entries(CHANGES)) {
  const found = await client.fetch('*[_id in [$id, "drafts." + $id]]', { id: baseId });
  // Site settings may sit under another id than its type.
  const docs = found.length || baseId !== 'siteSettings' ? found : await client.fetch('*[_type == "siteSettings"]');
  if (docs.length === 0) {
    console.log(`! ${baseId}: not found, skipped`);
    continue;
  }
  for (const doc of docs) {
    const set = {};
    for (const [p, value] of Object.entries(fields)) {
      if (plain(at(doc, p)) === plain(value)) continue;
      set[p] = value;
      console.log(`${doc._id}  ${p}\n    - ${show(at(doc, p))}\n    + ${show(value)}`);
    }
    if (Object.keys(set).length === 0) continue;
    writes += 1;
    // A localised field that was never filled has no object to set `.en` on.
    const parents = {};
    for (const p of Object.keys(set)) {
      const [parent, child] = p.split('.');
      if (child && doc[parent] == null) parents[parent] = { _type: PARENT_TYPES[parent] };
    }
    if (!dry) await client.patch(doc._id).setIfMissing(parents).set(set).commit();
  }
}
console.log(`\n${dry ? 'DRY RUN - would patch' : 'patched'} ${writes} document(s).`);
