// Trim the homepage stack to the six blocks of the 2026-09-14 design build:
// latest news, art prize feature, video, band, guest of honour feature, key
// figures. Run from the repo root: node <this file> [--apply]
import { createClient } from '@sanity/client';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const apply = process.argv.includes('--apply');
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const home = await client.getDocument('homepage');
const byKey = Object.fromEntries(home.sections.map((s) => [s._key, s]));
const guest = byKey['spotlight0'];
if (!guest || !byKey['design-heading'] || !byKey['video-1'] || !byKey['banner-0'] || !byKey['figures-2']) {
  throw new Error('homepage stack is not the one this script expects; aborting');
}

// The design's art prize row, built like the guest row (same picture, as in the build).
const artPrize = {
  ...guest,
  _key: 'art-prize-feature',
  kicker: { ...guest.kicker, en: 'art prize', fr: 'art prize', nl: 'art prize' },
  headline: {
    ...guest.headline,
    en: 'Discover the five laureates selected by our international art prize jury.',
    fr: 'Découvrez les cinq lauréat·es sélectionné·es par le jury international de notre art prize.',
    nl: 'Ontdek de vijf laureaten die onze internationale art prize-jury selecteerde.',
  },
  link: {
    ...guest.link,
    kind: 'route',
    route: 'art-prize',
    anchor: 'laureates',
    label: { ...guest.link.label, en: 'meet the artists', fr: 'rencontrez les artistes', nl: 'ontmoet de kunstenaars' },
  },
};
delete artPrize.hidden;

const sections = [byKey['design-heading'], artPrize, byKey['video-1'], byKey['banner-0'], guest, byKey['figures-2']];
const removed = home.sections.filter((s) => !sections.includes(s)).map((s) => `${s._key} (${s._type}${s.kicker?.en ? `: ${s.kicker.en}` : ''})`);

// The film's poster and credit: the fair photo the hero uses, "Video by Bureau Rouge".
const edition = await client.getDocument('demo-edition-2026');
const poster = {
  _type: 'figure',
  asset: { _type: 'reference', _ref: home.heroImage.asset._ref },
  alt: 'Visions behind ceramic brussels 2026',
  credit: 'Bureau Rouge',
};

console.log('new stack:', sections.map((s) => `${s._key} (${s._type})`).join(' → '));
console.log('removed:', removed.join(', '));
console.log('film poster:', edition?.film?.poster ? 'already set, left alone' : 'set from the hero image, credit Bureau Rouge');

if (!apply) {
  console.log('\ndry run; add --apply to write');
  process.exit(0);
}

const tx = client.transaction().patch('homepage', (p) => p.set({ sections }));
if (edition && !edition.film?.poster) tx.patch('demo-edition-2026', (p) => p.set({ 'film.poster': poster }));
const res = await tx.commit();
console.log('written, transaction', res.transactionId);
