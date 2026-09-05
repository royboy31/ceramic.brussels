#!/usr/bin/env node
/**
 * Starter set of page templates - the ready-made section stacks offered by
 * "Apply template…" in the Studio. Deterministic ids, so re-running updates
 * these rather than adding copies, and templates the team made themselves
 * are never touched.
 *
 *   node scripts/seed-templates.mjs           create or update
 *   node scripts/seed-templates.mjs --dry     print what would be written
 *
 * Text is English-only and written as prompts ("Introduce the prize here"),
 * so a page made from a template shows what goes where and never ships the
 * placeholder as if it were a translation.
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
const dry = process.argv.includes('--dry');

if (!env.SANITY_API_WRITE_TOKEN && !dry) {
  console.error('SANITY_API_WRITE_TOKEN missing from .env');
  process.exit(1);
}

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-11-01',
  useCdn: false,
});

/* ---------- little builders ---------- */

let n = 0;
const key = () => `t${(n++).toString(36).padStart(3, '0')}`;
const en = (text) => ({ en: text });
const para = (text) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: key(), text, marks: [] }],
});
const rich = (...texts) => ({ en: texts.map(para) });

const text = (heading, body, layout = 'full') => ({
  _type: 'contentSection',
  _key: key(),
  heading: en(heading),
  body: rich(...[].concat(body)),
  layout,
});
const imageText = (heading, body, imageSide = 'left') => ({
  _type: 'imageTextSection',
  _key: key(),
  heading: en(heading),
  body: rich(...[].concat(body)),
  imageSide,
});
const gallery = (columns = 3, captions = false) => ({ _type: 'gallerySection', _key: key(), columns, captions });
const slideshow = (aspect = '3:2') => ({ _type: 'slideshowSection', _key: key(), aspect });
const video = () => ({ _type: 'videoSection', _key: key() });
const quote = (q, who) => ({ _type: 'quoteSection', _key: key(), quote: en(q), attribution: en(who) });
const banner = (t, style = 'gradient') => ({ _type: 'bannerSection', _key: key(), text: en(t), style });
const heading = (t) => ({ _type: 'headingSection', _key: key(), title: en(t) });
const links = (labels, variant = 'pill') => ({
  _type: 'linksSection',
  _key: key(),
  variant,
  links: labels.map((label) => ({ _type: 'link', _key: key(), kind: 'route', route: '', label: en(label) })),
});
const people = (group) => ({ _type: 'peopleSection', _key: key(), group });
const figures = () => ({ _type: 'keyFiguresSection', _key: key() });
const news = (count = 2) => ({ _type: 'newsSection', _key: key(), count });
const faq = () => ({
  _type: 'faqSection',
  _key: key(),
  items: [
    { _type: 'faqItem', _key: key(), question: en('First question?'), answer: rich('The answer.') },
    { _type: 'faqItem', _key: key(), question: en('Second question?'), answer: rich('The answer.') },
  ],
});

/* ---------- the templates ---------- */

const TEMPLATES = [
  {
    _id: 'template-text-two-columns',
    title: 'Text in two columns',
    description: 'A long read: headed text blocks with the copy flowing in two columns.',
    appliesTo: ['page'],
    order: 10,
    intro: en('One or two sentences that say what this page is about, at the large size.'),
    sections: [
      text('introduction', 'Introduce the subject here. This block runs its text in two columns across the full width.'),
      text('details', 'The substance. Add as many text blocks as the page needs, and drag them into order.'),
      text('practical information', ['Dates, places, prices, contacts.', 'Use a Buttons block below for links.']),
      links(['book your tickets', 'floor plan']),
    ],
  },
  {
    _id: 'template-text-one-column',
    title: 'Text in one column',
    description: 'Short pages and legal text: one narrow column, easy to read.',
    appliesTo: ['page'],
    order: 20,
    sections: [
      text('introduction', 'A single column of text, full width.', 'single'),
      text('details', 'Another block, same shape.', 'single'),
    ],
  },
  {
    _id: 'template-side-by-side',
    title: 'Two blocks side by side',
    description: 'Pairs of half-width text blocks, as "goals" and "development" on the about page.',
    appliesTo: ['page'],
    order: 30,
    sections: [
      text('goals', 'Half width: this block and the next sit side by side.', 'half'),
      text('development', 'The right-hand half.', 'half'),
      text('team', 'A second pair starts a new row.', 'half'),
      text('partners', 'Its right-hand half.', 'half'),
    ],
  },
  {
    _id: 'template-image-and-text',
    title: 'Image and text',
    description: 'A big picture beside the lead text, then the rest of the story.',
    appliesTo: ['page'],
    order: 40,
    sections: [
      imageText('the fair', 'Text on the last third of the width, beside the picture.'),
      text('the story', 'Full-width text in two columns under it.'),
      imageText('in practice', 'A second picture, this time on the right.', 'right'),
    ],
  },
  {
    _id: 'template-laureate',
    title: 'Art prize winner',
    description: 'Title, a paragraph, a few pictures, a quote - the shape of a laureate presentation.',
    appliesTo: ['page', 'artist'],
    order: 50,
    intro: en('Name of the artist, the prize, the year.'),
    sections: [
      text('about the work', 'A paragraph on the artist and the piece that won.'),
      slideshow('4:5'),
      quote('A sentence from the artist or the jury.', 'The jury, 2027'),
      text('biography', 'Born in, lives and works in, studied at.'),
      links(['instagram', 'website']),
    ],
  },
  {
    _id: 'template-gallery',
    title: 'Photo page',
    description: 'A short intro and a grid of captioned pictures.',
    appliesTo: ['page'],
    order: 60,
    sections: [text('the images', 'A few lines on what the pictures show.', 'single'), gallery(3, true)],
  },
  {
    _id: 'template-video',
    title: 'Film page',
    description: 'A film first, then the text and a slideshow.',
    appliesTo: ['page', 'artist'],
    order: 70,
    sections: [video(), text('about the film', 'Who made it, when, where it was shown.'), slideshow('16:9')],
  },
  {
    _id: 'template-people',
    title: 'People page',
    description: 'An intro, then a group of people as cards two across.',
    appliesTo: ['page'],
    order: 80,
    sections: [text('who we are', 'A paragraph on the group.', 'single'), heading('the team'), people('team'), heading('collaborators'), people('collaborator')],
  },
  {
    _id: 'template-faq',
    title: 'Questions and answers',
    description: 'Folding questions, with a banner at the end.',
    appliesTo: ['page'],
    order: 90,
    sections: [faq(), banner('still have a question? write to us', 'outline')],
  },
  {
    _id: 'template-homepage-classic',
    title: 'Homepage - news first',
    description: 'The hand-off order: features, banner, film, key figures, closing banner.',
    appliesTo: ['homepage'],
    order: 100,
    sections: [news(2), banner('discover the 2026 edition', 'gradient'), video(), figures(), banner('see the images', 'solid')],
  },
  {
    _id: 'template-homepage-film-first',
    title: 'Homepage - film first',
    description: 'The film straight under the hero, then the news and the figures.',
    appliesTo: ['homepage'],
    order: 110,
    sections: [video(), news(2), figures(), banner('see the images', 'solid')],
  },
];

/* ---------- write ---------- */

for (const t of TEMPLATES) {
  const doc = { _type: 'pageTemplate', ...t };
  console.log(`${dry ? 'would write' : 'writing'} ${t._id}  (${t.sections.length} sections, for ${t.appliesTo.join(', ')})`);
  if (!dry) await client.createOrReplace(doc);
}
console.log(dry ? 'dry run, nothing written' : `${TEMPLATES.length} templates in place`);
