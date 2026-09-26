/**
 * Re-fetch, at full size, the legacy images the first import pass brought in
 * small (Tiphaine, 2026-09-25: "photos still appear pixelated").
 *
 * The 2026-09-05 image pass asked the old site's resizer for `?w=2500`, and
 * on some 150 portrait files the resizer answered with a 1500px-tall
 * derivative instead. Those sit in Sanity at 1000x1500 while the old site
 * holds a 3000-8000px original - all 2024 exhibitors and laureates, and a few
 * artist portraits. Every other soft picture on the site is small on the
 * old site too (Peach Corner's 720px, for one) and needs a new file from the
 * gallery, not this script.
 *
 * For each candidate - a referenced Sanity image asset whose legacy original
 * (legacy-export/raw, `media.width`) is more than 10% wider than what Sanity
 * holds, and narrower than --min-width (default 1600) - it downloads the
 * original at `?w=2500` (the resizer, falling back to the untouched original
 * as the importer does), uploads it as a NEW asset, and re-points every
 * document that references the old one, drafts included, by `_key` path, in
 * one transaction with a JSON backup first. The old asset is left in place
 * (Sanity garbage-collects nothing by itself; --delete-old removes them once
 * the site has rebuilt and looks right). legacy-export/asset-map.json is
 * updated to the new id so a re-run of the importer keeps it.
 *
 * Idempotent: a second run finds nothing under --min-width.
 *
 * Budgets (checked 2026-09-26, so a run never repeats 2026-09-05's outage):
 * - Sanity API: the dry run is ONE request on api.sanity.io (the token
 *   client cannot use the CDN); --apply adds one getDocuments, one upload
 *   per image and one transaction - ~160 requests for the 155 candidates,
 *   against 250k a month. The count is printed at the end.
 * - Sanity assets: 155 files at 2500px are ~250 MB more storage; the old
 *   ones stay until --delete-old. Storage and bandwidth are visible at
 *   sanity.io/manage only.
 * - The old site's resizer decodes the whole file per request and 500s on
 *   its largest, so downloads run one at a time with a pause between them.
 * - Cloudflare Pages: TURN THE DEPLOY WEBHOOK OFF before --apply. The
 *   transaction fires it once per patched document (40 here), and Pages
 *   meters build minutes. One build after, by deploy hook.
 * --limit=N caps a run at N uploads so it can be tried on a few first.
 *
 *   node scripts/refetch-images.mjs                  dry run: list candidates
 *   node scripts/refetch-images.mjs --min-width=2500 widen: everything the old site holds bigger
 *   node scripts/refetch-images.mjs --only=exhibitor narrow to one document type
 *   node scripts/refetch-images.mjs --apply          upload + re-point
 *   node scripts/refetch-images.mjs --delete-old     (with --apply) also delete the replaced assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const DELETE_OLD = process.argv.includes('--delete-old');
const minArg = process.argv.find((a) => a.startsWith('--min-width='));
const MIN_WIDTH = minArg ? Number(minArg.slice(12)) : 1600;
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.slice(8)) : Infinity;
const FETCH_WIDTH = 2500;
const PAUSE_MS = 1500;
let apiRequests = 0;
const count = () => { apiRequests += 1; };

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const EXPORT = path.join(ROOT, 'legacy-export', 'raw', 'ceramic-twill-export.json');
const ASSET_MAP = path.join(ROOT, 'legacy-export', 'asset-map.json');
const BACKUPS = path.join(ROOT, 'legacy-export', 'backups');
const REPORT = path.join(ROOT, 'legacy-export', 'refetch-images.json');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
if (APPLY && !env.SANITY_API_WRITE_TOKEN) {
  console.error('SANITY_API_WRITE_TOKEN missing from .env');
  process.exit(1);
}
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/* ---------------------------------------------------------- candidates */

const media = new Map(JSON.parse(fs.readFileSync(EXPORT, 'utf8')).media.map((m) => [String(m.id), m]));
const assetMap = JSON.parse(fs.readFileSync(ASSET_MAP, 'utf8'));
const legacyOf = new Map(Object.entries(assetMap).map(([lid, aid]) => [aid, lid]));

count();
const assets = await client.fetch(
  `*[_type == "sanity.imageAsset"]{
    _id, originalFilename,
    "w": metadata.dimensions.width, "h": metadata.dimensions.height,
    "refs": *[references(^._id)]{ _id, _type }
  }`,
);

const candidates = [];
for (const a of assets) {
  const lid = legacyOf.get(a._id);
  const m = lid && media.get(lid);
  if (!m || !a.w || !a.refs.length) continue;
  const ow = m.width || 0;
  if (ow <= a.w * 1.1 || a.w >= MIN_WIDTH) continue;
  const types = [...new Set(a.refs.map((r) => r._type))];
  if (ONLY && !types.some((t) => ONLY.has(t))) continue;
  candidates.push({
    assetId: a._id, legacyId: lid, filename: (a.originalFilename && !/^\d+\.\w+$/.test(a.originalFilename) ? a.originalFilename : m.name) || `${lid}.jpg`,
    have: `${a.w}x${a.h}`, original: `${ow}x${m.height}`, url: m.url || m.original,
    refs: a.refs.map((r) => r._id), types,
  });
}
candidates.sort((x, y) => x.types.join().localeCompare(y.types.join()) || Number(x.legacyId) - Number(y.legacyId));

const byType = {};
for (const c of candidates) for (const t of c.types) byType[t] = (byType[t] || 0) + 1;
console.log(`${candidates.length} asset(s) under ${MIN_WIDTH}px that the old site holds bigger:`, byType);
for (const c of candidates.slice(0, 12)) console.log(`  ${c.legacyId.padStart(5)} ${c.have.padEnd(10)} -> ${c.original.padEnd(10)} ${c.types.join(',')} x${c.refs.length}  ${c.filename}`);
if (candidates.length > 12) console.log(`  … ${candidates.length - 12} more`);
fs.writeFileSync(REPORT, JSON.stringify({ minWidth: MIN_WIDTH, at: new Date().toISOString(), candidates }, null, 2) + '\n');
console.log(`list written to ${path.relative(ROOT, REPORT)}`);

if (!APPLY) {
  console.log('\ndry run - nothing uploaded, ' + apiRequests + ' API request. Re-run with --apply.');
  process.exit(0);
}
if (Number.isFinite(LIMIT)) candidates.splice(LIMIT);
console.log('applying to ' + candidates.length + ' asset(s)');

/* ----------------------------------------------------------- download */

async function download(c) {
  // The resizer first, as the importer did; some files 500 there and the
  // original still downloads. fit=max never upscales, so a 2000px original
  // comes back at 2000.
  const resized = `${c.url}?w=${FETCH_WIDTH}`;
  let res = await fetch(resized).catch(() => null);
  if (!res || !res.ok) {
    if (res) console.warn(`  ! ${c.legacyId} resized HTTP ${res.status}, fetching original`);
    res = await fetch(c.url);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${c.url}`);
  return Buffer.from(await res.arrayBuffer());
}

/* ------------------------------------------------- re-pointing the refs */

/** Every path in `doc` whose value is an image reference to `oldId`, written the way a patch addresses it. */
function refPaths(node, oldId, base = '') {
  const out = [];
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      const seg = item && typeof item === 'object' && item._key ? `[_key=="${item._key}"]` : `[${i}]`;
      out.push(...refPaths(item, oldId, base + seg));
    });
  } else if (node && typeof node === 'object') {
    if (node._type === 'reference' && node._ref === oldId) return [base];
    for (const [k, v] of Object.entries(node)) out.push(...refPaths(v, oldId, base ? `${base}.${k}` : k));
  }
  return out;
}

fs.mkdirSync(BACKUPS, { recursive: true });
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const backupFile = path.join(BACKUPS, `refetch-images-${stamp}.json`);

const docIds = [...new Set(candidates.flatMap((c) => c.refs))];
count();
const docs = await client.getDocuments(docIds);
const docById = new Map(docs.filter(Boolean).map((d) => [d._id, d]));
fs.writeFileSync(backupFile, JSON.stringify({ candidates, documents: [...docById.values()] }, null, 2));
console.log(`\nbackup of ${docById.size} document(s): ${path.relative(ROOT, backupFile)}`);

const uploaded = [];
const failed = [];
let n = 0;
for (const c of candidates) {
  n += 1;
  process.stdout.write(`\r[${n}/${candidates.length}] ${c.legacyId} ${c.filename.slice(0, 50)}`.padEnd(90));
  try {
    if (n > 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const buf = await download(c);
    count();
    const asset = await client.assets.upload('image', buf, { filename: c.filename });
    if (asset._id === c.assetId) {
      // Same bytes as before: the old site has no bigger file after all.
      failed.push({ ...c, error: 'download identical to the stored asset' });
      continue;
    }
    uploaded.push({ ...c, newId: asset._id, got: `${asset.metadata.dimensions.width}x${asset.metadata.dimensions.height}` });
    assetMap[c.legacyId] = asset._id;
    fs.writeFileSync(ASSET_MAP, JSON.stringify(assetMap, null, 2));
  } catch (e) {
    failed.push({ ...c, error: String(e.message || e) });
  }
}
process.stdout.write('\n');
console.log(`uploaded ${uploaded.length}, failed ${failed.length}`);
for (const f of failed) console.log(`  ! ${f.legacyId} ${f.filename}: ${f.error}`);

// One patch per document, every replaced reference in it at once.
const patches = new Map();
for (const u of uploaded) {
  for (const id of u.refs) {
    const doc = docById.get(id);
    if (!doc) continue;
    const paths = refPaths(doc, u.assetId);
    if (!paths.length) continue;
    const set = patches.get(id) || {};
    for (const p of paths) set[`${p}._ref`] = u.newId;
    patches.set(id, set);
  }
}
if (patches.size) {
  const tx = client.transaction();
  for (const [id, set] of patches) tx.patch(id, (p) => p.set(set));
  count();
  const result = await tx.commit({ visibility: 'sync' });
  console.log(`re-pointed ${patches.size} document(s), transaction ${result.transactionId}`);
}

if (DELETE_OLD && uploaded.length) {
  const tx = client.transaction();
  for (const u of uploaded) tx.delete(u.assetId);
  count();
  await tx.commit();
  console.log(`deleted ${uploaded.length} replaced asset(s)`);
} else if (uploaded.length) {
  console.log('old assets kept; delete them later with --apply --delete-old, or from Media in the Studio');
}
fs.writeFileSync(REPORT, JSON.stringify({ minWidth: MIN_WIDTH, at: new Date().toISOString(), uploaded, failed }, null, 2) + '\n');
console.log(apiRequests + ' Sanity API request(s) in this run');
