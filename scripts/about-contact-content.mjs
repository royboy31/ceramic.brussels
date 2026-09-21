#!/usr/bin/env node
/**
 * Brings the about → contact tab (`/en/about/team/`) up to the client's
 * design of 2026-09-21 (Google Doc "ceramics"): the lead paragraph, the
 * directors' title and short biographies, the team's roles as the design
 * writes them, phone numbers, and the organiser line and postal address of
 * the closing contact block (Site settings → Contact, backend request #13).
 *
 * English only, except the directors' title, which is short enough to
 * translate: an empty translation falls back to English, so the French and
 * Dutch biographies keep the old site's longer text until someone translates
 * the new one.
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
const blocks = (id, paragraphs) =>
  paragraphs.map((text, i) => ({
    _key: `${id}en${i * 2}`,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: `${id}en${i * 2 + 1}`, _type: 'span', marks: [], text }],
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
  },
  'demo-person-jean-marc-dimanche': {
    ...DIRECTOR,
    'bio.en': blocks('pjean-marc-dimanche', [
      'After 20 years leading the design agency V.I.T.R.I.O.L., he co-founded Maison Parisienne in 2008—a traveling gallery for French fine crafts, staging over fifty exhibitions across Europe.',
      'In 2016, he advised H.R.H. the Grand Duchess Heiress of Luxembourg on establishing the De Mains De Maîtres biennial, where he now serves as General Commissioner. From 2019 to 2022, he also directed ELEVEN STEENS in Brussels, a space celebrating Art and Matter across design, crafts, and fine arts.',
      'Today, as an independent curator, he leads craft and contemporary art exhibitions across France, Belgium, and Luxembourg. A former contributor to the Revue de la Céramique et du Verre, he frequently writes for exhibition catalogues and monographs.',
    ]),
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
