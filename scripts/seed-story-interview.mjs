/**
 * Fills the co-directors interview (`story`, kind `interview`) with the text
 * of Léonie's frame of 2026-10-08, so the new `/[lang]/stories/<slug>` page
 * has something real to render and can be held against the drawing.
 *
 * The card already exists - Félicie made all three of the frame's interviews -
 * so this only adds what the page needs: a slug, the interview itself, and
 * the closing strip of photographs. Nothing else on the document is touched,
 * and a re-run writes the same values.
 *
 * The text is the frame's, including its pull quote, which Léonie borrowed
 * from the Marie Pic interview - it is a layout drawing, not a proof. Replace
 * it with a line of the co-directors' own before anyone reads this for sense.
 *
 *   node scripts/seed-story-interview.mjs --dry     plan only
 *   node scripts/seed-story-interview.mjs           write
 *   node scripts/seed-story-interview.mjs --clear   take the page away again
 *
 * Run `npm run dates` after writing, as with every script that touches the
 * dataset.
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
const clear = process.argv.includes('--clear');

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

/** The co-directors' card, which Félicie made from the frame. */
const DOC = '5e144d09-449c-42d7-af0e-4ef8db9a5d18';
const SLUG = 'gilles-parmentier-jean-marc-dimanche';

/* ---------- little builders ---------- */

let n = 0;
const key = () => `seed${(n += 1).toString().padStart(3, '0')}`;

/** A paragraph. `parts` is a list of [text, marks] pairs. */
const block = (style, parts) => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: parts.map(([text, marks = []]) => ({
    _type: 'span',
    _key: key(),
    text,
    marks,
  })),
});

const para = (text) => block('normal', [[text]]);
/** A question: the frame sets them in semibold, which is the Minor heading role. */
const question = (text) => block('h4', [[text]]);
/** An answer: the speaker's initials bold at the start, then the answer. */
const answer = (who, text) => block('normal', [[who, ['strong']], [' ' + text]]);
const quote = (text) => block('blockquote', [[text]]);

const figure = (asset, caption) => ({
  _type: 'figure',
  _key: key(),
  asset: { _type: 'reference', _ref: asset },
  alt: caption,
  caption,
});

/* ---------- the frame's text ---------- */

const body = [
  para(
    'A few months before the doors open at Tour & Taxis, co-founders Gilles Parmentier and Jean-Marc Dimanche have agreed to share some valuable insights with us. They unveil the first highlights of the programme and share their vision for this new edition.',
  ),

  question('How are you feeling as the 4th edition approaches?'),
  answer(
    'GP',
    'We can’t wait! Together with the whole team, we are making great progress on every detail of this new experience. We can already say that this edition will be even more impactful, inspiring and diverse than the last. The gallery selection has closed in early October, and their proposals promise to be more high-quality and varied than ever.',
  ),
  answer(
    'JMD',
    'The marathon is well and truly under way! We are moving at an excellent pace in preparing our exhibitions, especially the one devoted to our guest of honour, Marion Verboom, in close collaboration with her gallery’s team. At the same time, we are finalising the scenography for the 5 laureates of the ceramic brussels art prize. And of course, we still have plenty of surprises in store…',
  ),

  question('On that note, what will be the main highlights of this new edition?'),
  answer(
    'JMD',
    'There are so many! To name just a few, we are launching a brand-new award to recognise the Best Group Show among the galleries. The call we sent to galleries for an "XL" trail has also received a very positive response: the fair will feature a series of never-before-seen monumental sculptures.',
  ),
  answer(
    'GP',
    'Our talks programme grows richer by the day, with great proposals exploring, among other things, the major upcoming exhibitions in European institutions and the powerful link between ceramics and politics. We will also shine a light on the vibrant Belgian art scene through a new off-site programme and an extended version of our exhibition pass.',
  ),

  /* The pull quote opens the right column wherever it sits in the text. */
  quote(
    '“I plan to develop new glaze shades and create a series of bas-reliefs inspired by late 19th-century designs for jewellery and accessories”',
  ),
  para('Marie Pic'),

  question('Any projects to keep an eye on in the coming months?'),
  answer(
    'GP',
    'We are delighted to open a new, exclusive VIP lounge, created in collaboration with MAD Brussels, and to bring back our Discovery Tours guided visits with our partner Puilaetco.',
  ),
  block('normal', [
    ['JMD', ['strong']],
    [' We are proud to unveil an exclusive collaboration with ENSAV La Cambre as part of its 100th anniversary, through '],
    ['Letterrestres', ['em']],
    [', a cross-disciplinary project that brings together the school’s ceramics and typography workshops.'],
  ]),
];

/* The frame's closing strip: three across, with their captions. */
const images = [
  figure('image-00276f8f204198bd17b018d34c22243572dc9442-2500x1667-jpg', 'Fondation Bruckner © Lisa Frisco'),
  figure('image-00a2ac46bc1b4ce1d0bd3d116a187badd07de542-4042x2696-jpg', '2026 art prize group show © Bureau Rouge'),
  figure('image-0102b555a5916d39978e7e1ace2f4dea0d52bb26-2500x1667-jpg', '2026 art prize group show © Bureau Rouge'),
];

/* ---------- write ---------- */

console.log(clear ? 'Clearing' : 'Filling', 'story ' + DOC);
if (!clear) {
  console.log('  slug.en    ' + SLUG);
  console.log(
    '  body.en    ' + body.length + ' blocks (' + body.filter((b) => b.style === 'h4').length + ' questions, 1 quote)',
  );
  console.log('  images     ' + images.length);
  console.log('  fr/nl left empty on purpose: they fall back to English.');
}

if (dry) {
  console.log('\n--dry: nothing written.');
  process.exit(0);
}

const patch = clear
  ? client.patch(DOC).unset(['slug', 'body', 'images'])
  : client.patch(DOC).set({
      slug: { _type: 'localeSlug', en: { _type: 'slug', current: SLUG } },
      body: { _type: 'localeBlock', en: body },
      images,
    });

const res = await patch.commit();
console.log('\nDone. ' + res._id + ' rev ' + res._rev);
console.log(clear ? 'The page is gone; the card is back as it was.' : 'Page: /en/stories/' + SLUG + '/');
