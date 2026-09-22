#!/usr/bin/env node
/**
 * Fills the press & media hub (backend requests #19-#22, the designer's
 * hand-off of 2026-09-21) with the design's own content, read off the four
 * Figma frames (stories 1108:725, press 1108:887, photos & videos 1153:1447,
 * media partners 1171:1750):
 *
 * - the four tab pages of the `press-media` hub, with the leads the frames
 *   write under each heading (English only: an empty translation falls back
 *   to English, and the client's translators own the French and Dutch);
 * - the stories the frames draw: three interviews and two collectors'
 *   voices. Marion Verboom's is real and links to the guest of honour's
 *   interview tab, with her portrait. The other four are the designer's
 *   examples (Puilaetco, Collect Magazine, Galila, Charles Kaisin), text as
 *   drawn, no picture and no link - for the editors to finish or delete;
 * - Site settings → Press → the "discover Ceramics Now ↗" pill;
 * - and it removes the two about-hub pages nothing renders any more (the
 *   old press tab and the hidden images tab), so they stop showing up as
 *   "about" tab pages in the Studio.
 *
 * Only known fields are set, a draft is patched along with its published
 * document, and a value already in place is kept, so a re-run is a no-op.
 *
 *   node scripts/press-media-content.mjs --dry
 *   node scripts/press-media-content.mjs
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

const slug = (s) => ({ en: { _type: 'slug', current: s } });

/* ------------------------------------------------------------ the pages */

/** id → the document as created when missing; existing ones only gain the fields they lack. */
const PAGES = {
  'page-press-media-stories': {
    _type: 'page', section: 'press-media', order: 0, title: { en: 'Stories' }, slug: slug('stories'),
    intro: {
      en: 'Because the fair is a collective effort, we regularly give a voice to our key players and partners. Discover their inspiring interviews and insights here to get a behind-the-scenes look at the market and how it’s evolving.',
    },
    intro2: {
      en: 'Echoing the leading digital magazine Ceramics Now, the fair offers a monthly look into the world of a collector. Through these intimate interviews, discover their relationship with the medium and the artistic highlights that shape their collections. This exclusive series stems from a collaboration launched in 2024 between Vasi Hirdo, Editor-in-Chief of the publication, and the fair’s team.',
    },
  },
  'page-press-media-press': {
    _type: 'page', section: 'press-media', order: 1, title: { en: 'Press' }, slug: slug('press'),
    intro: { en: 'Discover a selection of articles on ceramic brussels featured in leading international publications.' },
    intro2: {
      en: 'Benefiting from strong international visibility since its inception, the fair relies on the expertise of renowned press agencies to drive its media coverage.',
    },
  },
  'page-press-media-photos-videos': {
    _type: 'page', section: 'press-media', order: 2, title: { en: 'Photos & videos' }, slug: slug('photos-videos'),
    intro: {
      en: 'ceramic brussels unfolds over five days of discovery, driven by a vibrant and inspiring energy. Discover here a glimpse of the past editions.',
    },
  },
  'page-press-media-media-partners': {
    _type: 'page', section: 'press-media', order: 3, title: { en: 'Media partners' }, slug: slug('media-partners'),
    intro: {
      en: 'The strong commitment of leading media outlets to ceramic brussels has been instrumental in supporting our visibility, both in Belgium and abroad. Thanks to their editorial support, readers can discover more about the fair, its themes, and the people behind it. We warmly thank:',
    },
  },
};

/* ---------------------------------------------------------- the stories */

const GUEST = 'demo-artist-marion-verboom';

const STORIES = {
  'story-interview-marion-verboom-2027': {
    _type: 'story', kind: 'interview', order: 1, publishedAt: '2026-06-10',
    title: { en: 'Marion Verboom' },
    role: { en: 'guest of honour', fr: 'invitée d’honneur', nl: 'eregast' },
    text: {
      en: 'Dive into the artistic vision of Marion Verboom, our 2027 guest of honor, as she discusses her relationship with clay and her upcoming exhibition.',
    },
    // The guest of honour hub's interview tab, in the reader's language.
    link: { _type: 'link', kind: 'route', path: 'guest-of-honour/interview' },
    // Her portrait is set below, from the artist document.
  },
  'story-interview-puilaetco': {
    _type: 'story', kind: 'interview', order: 2, publishedAt: '2026-05-01',
    title: { en: 'Puilaetco' },
    role: { en: 'main partner', fr: 'partenaire principal', nl: 'hoofdpartner' },
    text: {
      en: 'Explore the intersection of art and strategy with Sophie Clauwaert, Art Advisor at Puilaetco, as she shares her insights on supporting the fair.',
    },
  },
  'story-interview-collect-magazine': {
    _type: 'story', kind: 'interview', order: 3, publishedAt: '2026-04-01',
    title: { en: 'Collect Magazine' },
    role: { en: 'media partner', fr: 'partenaire média', nl: 'mediapartner' },
    text: {
      en: 'Explore our discussions with Collect Magazine as they share their perspective on contemporary ceramic art and the evolving art scene.',
    },
  },
  'story-collector-galila': {
    _type: 'story', kind: 'collectors-voice', order: 100, publishedAt: '2026-12-01',
    title: { en: 'Galila’s contemporary cabinet of curiosities' },
    text: {
      en: 'Explore our conversation with Galila, Art Prize jury member and founder of Galila’s P.O.C., as she talks about contemporary ceramics and collecting.',
    },
  },
  'story-collector-charles-kaisin': {
    _type: 'story', kind: 'collectors-voice', order: 100, publishedAt: '2026-11-01',
    title: { en: 'Charles Kaisin’s art-infused home' },
    text: {
      en: 'Explore the imaginative universe of Charles Kaisin - designer, collector, and art prize jury member - in our exclusive interview.',
    },
  },
};

/* --------------------------------------------------------- site settings */

const SETTINGS = {
  collectorsVoicesLink: {
    _type: 'link',
    kind: 'external',
    label: { en: 'discover Ceramics Now', fr: 'découvrir Ceramics Now', nl: 'ontdek Ceramics Now' },
    external: 'https://www.ceramicsnow.org/',
  },
};

/** The about hub's former press and images tab pages: no route reads them since #19. */
const REMOVE = ['demo-page-about-press', 'demo-page-about-images'];

/* ------------------------------------------------------------------ run */

const log = (...a) => console.log(dry ? '[dry]' : '[apply]', ...a);

async function main() {
  const ids = [...Object.keys(PAGES), ...Object.keys(STORIES), 'siteSettings', GUEST, ...REMOVE];
  const existing = await client.fetch('*[_id in $ids || _id in $drafts]', {
    ids,
    drafts: ids.map((id) => `drafts.${id}`),
  });
  const byId = new Map(existing.map((d) => [d._id, d]));
  const has = (id) => byId.get(id) ?? byId.get(`drafts.${id}`);

  const tx = client.transaction();
  let changes = 0;

  const guest = has(GUEST);
  if (guest?.portrait?.asset) STORIES['story-interview-marion-verboom-2027'].image = { ...guest.portrait, _type: 'figure' };
  else console.warn(`  ! ${GUEST} has no portrait; the interview card will have no picture`);

  /** Create a document, or set on the existing one (and its draft) the fields it lacks. */
  const upsert = (id, doc) => {
    const current = has(id);
    if (!current) {
      log(`create ${id} (${doc._type})`);
      tx.createIfNotExists({ _id: id, ...doc });
      changes++;
      return;
    }
    const missing = Object.fromEntries(Object.entries(doc).filter(([k]) => k !== '_type' && current[k] == null));
    if (Object.keys(missing).length === 0) return log(`keep   ${id}: nothing missing`);
    log(`patch  ${id}: ${Object.keys(missing).join(', ')}`);
    for (const target of [id, `drafts.${id}`]) if (byId.has(target)) tx.patch(target, (p) => p.set(missing));
    changes++;
  };

  for (const [id, doc] of Object.entries(PAGES)) upsert(id, doc);
  for (const [id, doc] of Object.entries(STORIES)) upsert(id, doc);
  upsert('siteSettings', { _type: 'siteSettings', ...SETTINGS });

  for (const id of REMOVE) {
    for (const target of [id, `drafts.${id}`]) {
      if (!byId.has(target)) continue;
      log(`delete ${target} (${byId.get(target).title?.en ?? ''})`);
      tx.delete(target);
      changes++;
    }
  }

  if (!changes) return console.log('Nothing to do.');
  if (dry) return console.log(`\n${changes} change(s) planned. Run without --dry to apply.`);
  const result = await tx.commit();
  console.log(`\nApplied ${changes} change(s): transaction ${result.transactionId}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
