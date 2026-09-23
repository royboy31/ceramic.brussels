#!/usr/bin/env node
/**
 * The media partners the press & media hand-off draws (2026-09-21,
 * assets/press-media/media-partners-grid.png): nineteen logos in the
 * design's order. Four of them were seeded without a logo; the other fifteen
 * did not exist. The logos are the old site's own files (its media blocks,
 * legacy-export/derived/partners.json), fetched full size from
 * ceramic.brussels/img and uploaded to Sanity - which keys an asset by its
 * content, so a re-run reuses the same asset instead of uploading twice.
 *
 * An existing partner is matched by name and patched (logo, sort order, and
 * the website only where it has none); a new one gets a deterministic id
 * `partner-media-<slug>`, so a re-run corrects, never duplicates. Media
 * partners not in the design (BRUZZ, COLLECT AAA, The Art Newspaper, IDEAT
 * SPECIAL PRIZE) are listed and left alone.
 *
 * Writes published documents, in one transaction. The Sanity webhook fires
 * a production build per document changed; the handbook says to switch it
 * off for a bulk write and fire one build after.
 *
 *   node scripts/media-partners-2026-09-23.mjs              plan and back up, write nothing
 *   node scripts/media-partners-2026-09-23.mjs --apply      upload the logos and write
 *   --env=<file>                                            read the token from another .env
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.slice(6) ?? '.env';
const BACKUP = path.resolve('legacy-export/backups/media-partners-2026-09-23.json');
const IMG = 'https://ceramic.brussels/img/';

/** The design's grid, in reading order: name, old site's logo file, website where the old site gave one. */
const PARTNERS = [
  ['AMA', 'dae8229d-1471-405a-9767-006000dcda41/logo-ama-black.jpg', 'https://en.artmediaagency.com/'],
  ['artpress', 'logo-detoure-copie.jpg'],
  ['Ateliers d’Art', 'logo1-aa-noir.png'],
  ['Beaux Arts Magazine', 'beaux-arts-magazine-logo-vector.png'],
  ['Ceramics Now', 'ceramics-now-logo.jpg'],
  ['Dezeen', 'logo-dezeen.jpeg'],
  ['Les Éditions Ateliers d’Art de France', 'logo-les-editions-aaf-small-noir.jpg'],
  ['L’Eventail', 'eventail.jpg'],
  ['La Gazette Drouot', 'capture-decran-2026-01-09-a-105152.png'],
  ['IDEAT', '5f7a2a.jpeg', 'https://ideat.be/fr/'],
  ['infoceramica.com', 'logo-hd.jpg'],
  ['Le Journal des Arts', 'jda-logo-noir.png'],
  ['La Libre Belgique', 'lalibre.png'],
  ['L’Œil', 'l-oeil-logo-noir.jpg'],
  ['Le Quotidien de l’Art', 'capture-decran-2025-09-05-a-121411.png', 'https://www.lequotidiendelart.com'],
  ['La Revue de la Céramique et du Verre', 'logo-rcv.jpg'],
  ['TLmag', 'tlm-logo-cw.jpg'],
  ['Villas', 'logo-villas-noir.png', 'https://www.villasdecoration.com/en/'],
  ['Vormen uit Vuur', 'vuv-cmyk-kopie.jpeg', 'https://vormenuitvuur.nl/vormen-uit-vuur/'],
];
const ORDER_FROM = 60;

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

// The old site's logo URLs carry a uuid folder; find each file's full URL in the export.
const legacy = JSON.parse(fs.readFileSync('legacy-export/derived/partners.json', 'utf8'));
const legacyUrls = legacy.flatMap((p) => (p.logos ?? []).map((l) => l.url));
const urlFor = (file) => (file.includes('/') ? IMG + file : legacyUrls.find((u) => u.endsWith('/' + file)));

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/œ/gi, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const slug = (s) => norm(s).replace(/ /g, '-');

const existing = await client.fetch(`*[_type == "partner" && !(_id in path("drafts.**"))]`);
const drafts = await client.fetch(`*[_type == "partner" && _id in path("drafts.**")]._id`);
const byName = (name) => existing.find((d) => norm(d.name) === norm(name));

const plan = PARTNERS.map(([name, file, url], i) => {
  const src = urlFor(file);
  if (!src) throw new Error(`no legacy logo file ${file} for ${name}`);
  const doc = byName(name);
  if (doc && doc.tier !== 'media') throw new Error(`${name} exists as a ${doc.tier} partner (${doc._id}); not touching it`);
  return { name, src, url, order: ORDER_FROM + i, doc, id: doc?._id ?? `partner-media-${slug(name)}` };
});

for (const p of plan) {
  const what = p.doc ? `patch  ${p.id}` : `create ${p.id}`;
  const logo = p.doc?.logo?.asset ? 'replace logo' : 'add logo';
  console.log(`${String(p.order).padEnd(3)} ${what.padEnd(58)} ${logo}  <- ${p.src.split('/').pop()}${p.url && !p.doc?.url ? `  + ${p.url}` : ''}`);
  if (drafts.includes(`drafts.${p.id}`)) console.log(`      note: ${p.id} has an unpublished draft, which will not show these changes`);
}
const planned = new Set(plan.map((p) => p.id));
for (const d of existing.filter((d) => d.tier === 'media' && !planned.has(d._id)))
  console.log(`    left alone, not in the design: ${d.name} (${d._id})`);

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(
  BACKUP,
  JSON.stringify({ takenAt: new Date().toISOString(), documents: plan.filter((p) => p.doc).map((p) => p.doc) }, null, 1),
);
console.log(`backup -> ${path.relative(process.cwd(), BACKUP)}`);

if (!APPLY) {
  console.log('dry run: nothing uploaded or written. Add --apply to write.');
  process.exit(0);
}

const tx = client.transaction();
for (const p of plan) {
  const res = await fetch(p.src);
  if (!res.ok) throw new Error(`${p.src}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload('image', buf, { filename: p.src.split('/').pop() });
  console.log(`uploaded ${p.name}: ${asset._id}`);
  const logo = { _type: 'figure', alt: p.name, asset: { _type: 'reference', _ref: asset._id } };
  if (p.doc) {
    tx.patch(p.id, (patch) => {
      patch = patch.set({ logo, order: p.order });
      return p.url && !p.doc.url ? patch.set({ url: p.url }) : patch;
    });
  } else {
    tx.createOrReplace({
      _id: p.id,
      _type: 'partner',
      name: p.name,
      tier: 'media',
      logo,
      logoScale: 100,
      order: p.order,
      ...(p.url ? { url: p.url } : {}),
    });
  }
}
const done = await tx.commit();
console.log(`written: transaction ${done.transactionId}, ${plan.length} partners`);
