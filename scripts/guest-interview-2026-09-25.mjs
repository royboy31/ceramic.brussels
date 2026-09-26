#!/usr/bin/env node
/**
 * The guest of honour's interview, from the 2027 interview frame
 * (screenshot/dd/ceramic brussels — guest of honour — interview.png), into
 * Marion Verboom's Interview field - English only; French and Dutch fall
 * back to it until someone translates them. The three pictures are the
 * frame's own, uploaded from screenshot/dd.
 *
 * Written the way GuestInterview.astro reads it: a Quote for the pull quote,
 * the introduction, the Heading "interview", then each question as a bold
 * paragraph and its answer starting with "MV" in bold, the pictures in
 * between.
 *
 * It writes a DRAFT (Lilanga, 2026-09-25): the published page is untouched
 * until an editor opens the artist in the Studio and presses Publish. An
 * existing draft keeps its other edits; only Interview → English is set.
 * Sanity keys assets by content, so a re-run uploads nothing new.
 *
 *   node scripts/guest-interview-2026-09-25.mjs              plan, write nothing
 *   node scripts/guest-interview-2026-09-25.mjs --apply      upload and write the draft
 *   --env=<file>                                             read the token from another .env
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.slice(6) ?? '.env';
const ID = 'demo-artist-marion-verboom';
const DIR = 'screenshot/dd';

const PHOTOS = {
  slicedCloud: {
    file: 'W25084SlicedCloudHD 1.png',
    alt: 'Sliced Cloud: five glazed ceramic fragments covered in spiral shells, threaded on a lit plexiglas rod.',
    workTitle: 'Sliced Cloud',
    year: '2020',
    caption: 'ceramics, plexiglas & led lamps',
  },
  clito: {
    file: 'W26305Clito 2.png',
    alt: 'Clito: a carved wooden form full of openings, rising into two white plaster arms joined by a crystal ball.',
    workTitle: 'Clito',
    year: '2022',
    caption: 'wood, plaster & cristal',
  },
  apex: {
    file: 'W25084SlicedCloudHD 2.png',
    alt: 'Apex 1, detail: a pierced ceramic form under a crackled lilac and white glaze.',
    workTitle: 'Apex 1 (detail)',
    year: '2021',
    caption: 'ceramics',
  },
};
const CREDIT = 'Nicolas Brasseur';

const QA = [
  {
    q: 'Your work creates connections between different eras, cultures and art histories. What interests you in these crossings?',
    a: [
      'This way of working is specific to the ',
      ['Achronie', 'em'],
      ' series, which I have been developing for several years through near-encyclopaedic research in constant expansion, and which I then translate through modelling and moulding. In this way I build up a gypsotheca, a kind of alphabet of forms that pass through me. I particularly imprint the forms that create an echo: motifs that are familiar to me and that fluctuate through the ages, that settle into my memory, and that I then develop by modelling clay. Modelling then becomes a space of circulation where the forms keep transforming; it is not about reproducing existing models. Each fragment that makes up my gypsotheca is an element of an infinite construction, akin to both an archaeological column and a geological core sample. In these fragments, what I seek to express is not so much cultural crossings as the action of time and of geographical displacements on motifs, symbols and systems of representation. The composition of the fragments stacked one on top of another builds up like a DNA sequence or a logosyllabic sentence, mixing colours, textures and their inscription in vertical time.',
    ],
  },
  'slicedCloud',
  {
    q: 'You often work through fragments, assemblages, strata, columns. What attracts you to this way of building pieces?',
    a: [
      'Ever since my first drawings, I have always been interested in the creation of interstices. In foundry work, they are called “nuits”. These junctions, which open up the possibility of reassembly, fascinate me. This capacity for interlocking is sometimes even the very reason my constructions exist. I find that a form, a representation, more truthfully reflects our perception of the world when it is not monolithic, but made up of several parts forming a whole. You don’t perceive a sculpture all at once; you have to walk around it and make a mental addition to grasp a volume. That’s a little like what I do in the making, too.',
    ],
  },
  'clito',
  {
    q: 'You work with a great diversity of materials, including plaster, concrete, bronze, resin, wood and clay. What place does material, and perhaps ceramics in particular, hold in your creative process?',
    a: [
      'I mainly use materials that solidify through catalysis or firing, with techniques such as modelling, moulding or lost-wax casting. I like to work materials with my hands and watch them transform under my gesture. As Gaston Bachelard so aptly developed in Earth and Reveries of Will, the hard and the soft already constitute a form in themselves. Form is inseparable from its substance, and the way of reaching it matters as much as the result. It is therefore important for me to create multi-material sculptures, in order to generate contrasts and bring out the qualities specific to each substance. It’s a balancing act. I like to assemble elements belonging to different temporalities, references or worlds, so as to build a new reading of the work. Very early on, I was drawn to transparency. It seemed essential to me to integrate this quality into my volumetric constructions, to counterbalance the masses, shift the equilibriums and create new circulations of light.',
    ],
  },
  {
    q: 'What place does drawing hold in your creative process? Is it a moment of research, of projection, or another way of building?',
    a: [
      'It’s fairly evolving. When I had no studio, I would stretch a large sheet of paper across my bedroom to draw networks of volumes in graphite. Later, I made watercolours. I found that this technique matched my way of working with material well, since the pigment evolves within a liquid pool and concentrates, revealing the path of the fluids. Lately, I have been combining pastel with oil paint on paper, to bring together heterogeneous colours and textures and depict anthropomorphic forms that mutate and dream. I’m drawing on Ovid’s Metamorphoses for my next exhibition at Galerie Lelong. Drawing can be programmatic, serving as a starting point or projection for a sculpture to come, but it is also an end in itself. That distinction isn’t entirely settled in my mind, in fact: drawing moves freely between the sketch, the research and the autonomous work.',
    ],
  },
  {
    q: 'For ceramic brussels 2027, you will be guest of honour: how do you intend to approach this rather special exhibition?',
    a: [
      'I want to bring together different stages of my visual research, to offer a generous exhibition. I am not a ceramicist; and yet clay holds a central place in my work. I fire it, I glaze it, I combine it with glass, but I also use it as a matrix in the studio. It is, in fact, the same clay I have been using for over ten years to make my fragments. Once the fragment is modelled and then moulded, I re-moisten the clay, which becomes available again for the next sculpture. Lately, I have notably used this clay to shape the models for my anthropomorphic figures in cast aluminium. So even when it disappears from the final result, it remains present at every stage of the making process, like a fertile silt that connects all of my productions.',
    ],
  },
  'apex',
];

let n = 0;
const key = () => `gi${(n++).toString(36).padStart(3, '0')}`;
const span = (text, ...marks) => ({ _type: 'span', _key: key(), text, marks });
const block = (children, style = 'normal') => ({ _type: 'block', _key: key(), style, markDefs: [], children });

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
if (APPLY && !env.SANITY_API_WRITE_TOKEN) throw new Error(`no SANITY_API_WRITE_TOKEN in ${ENV_FILE}`);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

for (const p of Object.values(PHOTOS)) {
  const f = path.join(DIR, p.file);
  if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  console.log(`photo  ${p.file}  (${Math.round(fs.statSync(f).size / 1024)} kB)  ${p.workTitle}, ${p.year}`);
}
const published = await client.getDocument(ID);
if (!published) throw new Error(`${ID} is not published - is the guest of honour still that document?`);
console.log(`artist ${published.name} (${ID}); interview: ${QA.filter((x) => typeof x === 'object').length} questions`);

if (!APPLY) {
  console.log('dry run: nothing uploaded or written. Add --apply to write the draft.');
  process.exit(0);
}

const refs = {};
for (const [name, p] of Object.entries(PHOTOS)) {
  const asset = await client.assets.upload('image', fs.createReadStream(path.join(DIR, p.file)), { filename: p.file });
  refs[name] = asset._id;
  console.log(`uploaded ${p.file}: ${asset._id}`);
}

const en = [
  block([span('“I love watching material take shape in my hands”')], 'blockquote'),
  block([
    span(
      'For the 2027 edition, artist Marion Verboom will present a major monographic exhibition in a dedicated space in the fair, in collaboration with Galerie Lelong Paris. To better understand what inspires and nourishes her work, we asked her a few questions.',
    ),
  ]),
  block([span('interview')], 'h2'),
  ...QA.flatMap((x) => {
    if (typeof x === 'string') {
      const { file, ...p } = PHOTOS[x];
      return [{ _type: 'figure', _key: key(), asset: { _type: 'reference', _ref: refs[x] }, ...p, credit: CREDIT }];
    }
    return [
      block([span(x.q, 'strong')]),
      block([span('MV', 'strong'), span(' '), ...x.a.map((t) => (Array.isArray(t) ? span(t[0], t[1]) : span(t)))]),
    ];
  }),
];

const { _rev, _updatedAt, _createdAt, ...copy } = published;
const draftId = `drafts.${ID}`;
await client
  .transaction()
  .createIfNotExists({ ...copy, _id: draftId })
  .patch(draftId, (p) => p.set({ 'interview.en': en }))
  .commit();
console.log(`wrote ${draftId}: Interview → English, ${en.length} blocks. Publish it in the Studio (Guest of honour → Marion Verboom).`);
