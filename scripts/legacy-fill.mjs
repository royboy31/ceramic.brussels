#!/usr/bin/env node
/**
 * What the old site shows and the new one did not yet, filled from
 * legacy-export. The rule agreed with Kamindu on 2026-09-11: add it when it
 * tallies with the existing site's content. Dry run by default; `--apply`
 * uploads what is missing and writes, in one transaction, after a backup.
 *
 * - Edition photo galleries: the old site's photo pages (2024 "1st edition",
 *   2025 "photos", the 2026 photos on "ceramic brussels") become each
 *   edition's gallery - shown on /about/images, /editions and the year pages.
 * - The about page's scenography section: its two texts, the 2026 site plan
 *   (PDF) and its four photos, as blocks at the end of "the fair".
 * - The homepage cards the old homepage has and ours did not - the 2026
 *   catalogue, best booth, best solo show, jury prize and the 2026
 *   exhibitors - as Feature blocks after the key figures (which already are
 *   its "review of the 3rd edition"), in the old order.
 * - The seeded 2027 programme placeholders go: until 2027's programme is
 *   out, the tabs show 2026's, as the old site does (getProgramme).
 *
 * Sanity limits: every image is uploaded once - legacy-export/asset-map.json
 * caches uploads by old media id, shared with scripts/import-legacy.mjs - and
 * the old site resizes it to 2500px first. The plan is one query.
 * Turn the webhook off first: an uploaded asset is a document too, and each
 * would queue a production build.
 *
 *   node scripts/legacy-fill.mjs           plan and back up, write nothing
 *   node scripts/legacy-fill.mjs --apply   upload what is missing, then write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { localeHtmlToBlocks, htmlToText } from './lib/html-to-portable-text.mjs';

const APPLY = process.argv.includes('--apply');
const MAX_WIDTH = 2500;
const EXPORT = path.resolve('legacy-export');
const ASSET_MAP = path.join(EXPORT, 'asset-map.json');
const BACKUP = path.join(EXPORT, 'backups', 'legacy-fill-2026-09-11.json');
const LOCALES = ['en', 'fr', 'nl'];

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

const N = (f) => {
  const j = JSON.parse(fs.readFileSync(path.join(EXPORT, 'normalized', `${f}.json`), 'utf8'));
  return Array.isArray(j) ? j : Object.values(j);
};
const pages = N('pages');
const past = N('pastEditions');
const home = JSON.parse(fs.readFileSync(path.join(EXPORT, 'normalized', 'singletons.json'), 'utf8')).homepage;
const assetMap = JSON.parse(fs.readFileSync(ASSET_MAP, 'utf8'));

/* ------------------------------------------------------------ helpers */

const localeText = (v) => {
  const out = {};
  for (const l of LOCALES) {
    const s = htmlToText(v?.[l] ?? '');
    if (s) out[l] = s;
  }
  return out.en ? out : null;
};

const pending = new Map();
let uploaded = 0;

/** The Sanity asset for an old media record: cached, or uploaded (apply only). */
async function assetFor(media) {
  if (assetMap[media.id]) return assetMap[media.id];
  if (!APPLY) {
    pending.set(media.id, media);
    return `pending-${media.id}`;
  }
  const resized = media.width > MAX_WIDTH ? `${media.url}?w=${MAX_WIDTH}` : null;
  let res = resized ? await fetch(resized) : null;
  // The old resizer answers 500 for some large files; the original still downloads.
  if (!res || !res.ok) res = await fetch(media.url);
  if (!res.ok) throw new Error(`image ${media.id}: HTTP ${res.status} for ${media.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload('image', buf, { filename: media.filename || `${media.id}.jpg` });
  assetMap[media.id] = asset._id;
  fs.writeFileSync(ASSET_MAP, JSON.stringify(assetMap, null, 2));
  if (++uploaded % 10 === 0) console.log(`  … ${uploaded} images uploaded`);
  return asset._id;
}

async function figure(media, key) {
  const ref = await assetFor(media);
  const alt = htmlToText(media.alt?.en ?? '');
  const caption = htmlToText(media.caption?.en ?? '');
  return {
    _key: key,
    _type: 'figure',
    asset: { _type: 'reference', _ref: ref },
    ...(alt ? { alt } : {}),
    ...(caption ? { caption } : {}),
  };
}

const unique = (list) => [...new Map(list.map((m) => [m.id, m])).values()];
const galleryMedia = (rec) => unique((rec?.blocks ?? []).filter((b) => b.type === 'gallery').flatMap((b) => b.media ?? []));

/* ------------------------------------------------------------- sources */

const GALLERIES = [
  { edition: 'demo-edition-2024', media: galleryMedia(past.find((r) => r.id === 2)) },
  { edition: 'demo-edition-2025', media: galleryMedia(past.find((r) => r.id === 28)) },
  { edition: 'demo-edition-2026', media: galleryMedia(pages.find((p) => p.id === 77)) },
];

const scenography = pages.find((p) => p.id === 56);
const OLD_PLAN = 'https://ceramic.brussels/storage/uploads/b522b177-3e60-4e3d-bd89-64c96a100226/CB26_PLAN_Site-web_A4.pdf';
const ABOUT = 'demo-page-about-the-fair';

/** The homepage cards to add, by position on the old homepage. */
const CARDS = [4, 5, 6, 7, 8];

/** Where an old card's arrow link goes on the new site. */
function linkTarget(href) {
  if (/fliphtml5\.com/.test(href)) return { kind: 'external', external: href };
  if (/ceramic\.brussels\/(en|fr|nl)\/art-prize/.test(href)) return { kind: 'route', route: 'art-prize', anchor: 'awards' };
  if (/ceramic\.brussels\/(en|fr|nl)\/exhibitors/.test(href)) return { kind: 'route', route: 'exhibitors', anchor: '2026' };
  return { kind: 'external', external: href };
}

const PLACEHOLDER_EVENTS = [1, 2, 3, 4, 5, 6, 7].map((n) => `demo-event-2027-${n}`);
const withDrafts = (ids) => ids.flatMap((id) => [id, `drafts.${id}`]);

/* --------------------------------------------------------------- plan */

const ids = withDrafts([...GALLERIES.map((g) => g.edition), ABOUT, 'homepage', ...PLACEHOLDER_EVENTS]);
const docs = await client.fetch(`*[_id in $ids]`, { ids });
const byId = Object.fromEntries(docs.map((d) => [d._id, d]));

const refs = await client.fetch(`*[references($ids) && !(_id in $ids)]{ _id }`, { ids: withDrafts(PLACEHOLDER_EVENTS) });
if (refs.length) {
  console.error('Placeholder events are referenced, stopping:', refs);
  process.exit(1);
}

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), documents: docs }, null, 1));
console.log(`backup: ${docs.length} documents -> ${path.relative(process.cwd(), BACKUP)}`);

// The 2026 site plan: uploaded (apply only) so the link survives the old site.
let planUrl = OLD_PLAN;
if (APPLY) {
  const pdf = Buffer.from(await (await fetch(OLD_PLAN)).arrayBuffer());
  const asset = await client.assets.upload('file', pdf, { filename: 'ceramic-brussels-2026-floor-plan.pdf', contentType: 'application/pdf' });
  planUrl = asset.url;
}

const ops = [];

// 1. Edition galleries.
for (const g of GALLERIES) {
  const doc = byId[g.edition];
  if (!doc) continue;
  if ((doc.images ?? []).length) {
    console.log(`skip ${g.edition}: already has ${doc.images.length} photos`);
    continue;
  }
  const images = [];
  for (const m of g.media) images.push(await figure(m, `m${m.id}`));
  ops.push((tx) => tx.patch(g.edition, (p) => p.set({ images })));
  console.log(`patch ${g.edition}: gallery of ${images.length} photos`);
}

// 2. Scenography on "the fair".
for (const id of withDrafts([ABOUT]).filter((id) => byId[id])) {
  if ((byId[id].sections ?? []).some((s) => s._key === 'scenography')) {
    console.log(`skip ${id}: already has the scenography section`);
    continue;
  }
  const [text1, titleBlock, text2] = scenography.blocks;
  const rewrite = (value) =>
    Object.fromEntries(
      Object.entries(value ?? {}).map(([l, html]) => [
        l,
        String(html ?? '')
          .replaceAll(OLD_PLAN, planUrl)
          .replace(/https:\/\/ceramic\.brussels\/(en|fr|nl)\/art-prize/g, '/$1/art-prize'),
      ]),
    );
  const photos = [];
  for (const m of galleryMedia(scenography)) photos.push(await figure(m, `s${m.id}`));
  const blocks = [
    {
      _key: 'scenography',
      _type: 'contentSection',
      heading: localeText(scenography.title) ?? { en: 'scenography', fr: 'scénographie', nl: 'scenografie' },
      body: localeHtmlToBlocks(rewrite(text1.text), 'scen1'),
    },
    {
      _key: 'scenographyprize',
      _type: 'contentSection',
      heading: localeText(titleBlock.subtitle),
      body: localeHtmlToBlocks(rewrite(text2.text), 'scen2'),
    },
    { _key: 'scenographyphotos', _type: 'gallerySection', columns: 2, captions: false, images: photos },
  ];
  ops.push((tx) => tx.patch(id, (p) => p.setIfMissing({ sections: [] }).append('sections', blocks)));
  console.log(`patch ${id}: scenography - 2 texts, the site plan link, ${photos.length} photos`);
}

// 3. Homepage cards, after the key figures (published and the pending draft, so neither loses them).
const cards = [];
for (const position of CARDS) {
  const b = home.blocks.find((x) => x.position === position);
  const text = {};
  const label = {};
  let href = null;
  for (const l of LOCALES) {
    const html = String(b.text?.[l] ?? '');
    const a = html.match(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/);
    if (a) {
      href ??= a[1];
      label[l] = htmlToText(a[2]).replace(/^→\s*/, '');
    }
    // The arrow line becomes the link; the rest is the headline.
    // Everything from the arrow ("→" or "&rarr;", sometimes with an empty
    // <u> before the link) to the end of the link is the link line.
    text[l] = htmlToText(html.replace(/(?:→|&rarr;)[\s\S]*?<\/a>/g, ''));
  }
  cards.push({
    _key: `oldhome${position}`,
    _type: 'spotlight',
    kicker: localeText(b.title),
    headline: Object.fromEntries(Object.entries(text).filter(([, v]) => v)),
    ...(href ? { link: { _type: 'link', ...linkTarget(href), label: { _type: 'localeString', ...label } } } : {}),
    image: await figure(b.media[0], `h${b.media[0].id}`),
  });
}
for (const id of withDrafts(['homepage']).filter((id) => byId[id])) {
  const sections = byId[id].sections ?? [];
  const have = new Set(sections.map((s) => s._key));
  const add = cards.filter((c) => !have.has(c._key));
  if (!add.length) {
    console.log(`skip ${id}: the old homepage cards are there`);
    continue;
  }
  const figures = sections.find((s) => s._type === 'keyFiguresSection');
  ops.push((tx) =>
    tx.patch(id, (p) =>
      figures ? p.insert('after', `sections[_key=="${figures._key}"]`, add) : p.setIfMissing({ sections: [] }).append('sections', add),
    ),
  );
  console.log(`patch ${id}: ${add.length} cards (${add.map((c) => c.kicker?.en).join(', ')}) ${figures ? 'after the key figures' : 'at the end'}`);
}

// 4. The seeded 2027 programme placeholders.
const gone = withDrafts(PLACEHOLDER_EVENTS).filter((id) => byId[id]);
for (const id of gone) ops.push((tx) => tx.delete(id));
console.log(`delete ${gone.length}: ${gone.join(', ')}`);

console.log(
  `\nimages: ${pending.size ? `${pending.size} to upload (not in the cache)` : `${uploaded} uploaded`}; ` +
    `${GALLERIES.reduce((n, g) => n + g.media.length, 0)} gallery photos, ${galleryMedia(scenography).length} scenography, ${CARDS.length} cards`,
);

if (!APPLY) {
  console.log('dry run - nothing uploaded or written. Add --apply.');
  process.exit(0);
}
const tx = client.transaction();
for (const op of ops) op(tx);
const result = await tx.commit({ visibility: 'sync' });
console.log(`written: transaction ${result.transactionId}, ${result.results.length} mutations`);
