#!/usr/bin/env node
/**
 * Fills every SEO block with what the page renders today, so an editor opens
 * the SEO group and sees the meta title, description and share image the
 * site actually sends instead of empty fields that silently fall back.
 *
 * The source is a build, not a re-implementation of the fallbacks: build with
 * PUBLIC_SHOW_EDIT_LINKS=true and every page names the document it renders
 * (the "Edit this content" link). Each page's <title> (less the " — site
 * name" suffix Base.astro adds), meta description and og:image are read back
 * and written onto that document, per language.
 *
 * Rules, so the site renders exactly as before:
 * - A localised field falls back to English (queries.ts `localised`). French
 *   or Dutch is written only where it differs from the English value; where
 *   it is the same, leaving it empty renders the same text and does not
 *   pretend to be a translation.
 * - A document that renders with two different titles in one language (a
 *   guest of honour: "guest of honour — X" on the hub, "X" on the artist
 *   page) keeps that field empty, so each route keeps its own.
 * - Only empty fields are written (setIfMissing); pending drafts get the same
 *   patch, so publishing one does not drop the values.
 * - The share image is a copy of the figure the page falls back to (cover,
 *   portrait, first image), hotspot and crop included, so the crop is the same.
 * - Site settings' default description gets the tagline, which is what pages
 *   without a description of their own already send.
 *
 *   npx astro build --outDir <dir>  (with PUBLIC_SHOW_EDIT_LINKS=true)
 *   node scripts/fill-seo.mjs --from=<dir>                 plan and back up, write nothing
 *   node scripts/fill-seo.mjs --from=<dir> --skip-generic  leave out descriptions that are only the site tagline
 *   node scripts/fill-seo.mjs --from=<dir> --apply         write, in one transaction
 *
 * Turn the Sanity webhook off first: a transaction fires it once per document.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const APPLY = process.argv.includes('--apply');
const SKIP_GENERIC = process.argv.includes('--skip-generic');
const FROM = path.resolve(arg('from') ?? 'dist');
const PLAN = arg('plan');
const BACKUP = path.resolve('legacy-export/backups/fill-seo-2026-09-11.json');
const LOCALES = ['en', 'fr', 'nl'];
const TYPES = new Set(['homepage', 'page', 'exhibitor', 'artist', 'newsItem']);

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

/* ------------------------------------------------------- read the build */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m,
  );

function* htmlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name === 'index.html') yield full;
  }
}

if (!fs.existsSync(FROM)) throw new Error(`no build at ${FROM}`);
const pages = [];
for (const lang of LOCALES) {
  const root = path.join(FROM, lang);
  if (!fs.existsSync(root)) continue;
  for (const file of htmlFiles(root)) {
    const html = fs.readFileSync(file, 'utf8');
    const url = '/' + path.relative(FROM, path.dirname(file)).split(path.sep).join('/') + '/';
    const edits = [...html.matchAll(/href="\/studio#\/intent\/edit\/id=([^;"]+);type=([^;"&]+)/g)]
      .map((m) => ({ id: decode(m[1]), type: decode(m[2]) }))
      .filter((e) => e.id !== 'navigation');
    pages.push({
      url,
      lang,
      title: decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim(),
      description: decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '').trim(),
      ogImage: decode(html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? ''),
      edit: edits[0] ?? null,
    });
  }
}
if (!pages.some((p) => p.edit)) throw new Error('no edit links in the build - build it with PUBLIC_SHOW_EDIT_LINKS=true');

/* ------------------------------------------------------------ the data */

const settings = await client.fetch(`*[_id == "siteSettings"][0]{ _id, siteName, tagline, defaultSeo }`);
const siteName = settings?.siteName ?? 'ceramic brussels';
const suffix = ` — ${siteName}`;
const tagline = settings?.tagline ?? {};

// The practical info tab passes Site settings as its document (its content
// lives there), but its title and description come from the tab's page.
const practical = await client.fetch(`*[_type == "page" && section == "visit" && slug.en.current == "practical-info" && !(_id in path("drafts.**"))][0]._id`);

/** Asset id of a Sanity CDN image URL: .../production/<hash>-<w>x<h>.<ext>?... */
const assetOf = (url) => {
  const m = url.match(/\/images\/[^/]+\/[^/]+\/([0-9a-f]+-\d+x\d+)\.(\w+)/);
  return m ? `image-${m[1]}-${m[2]}` : null;
};

const byDoc = new Map();
const unmapped = [];
for (const p of pages) {
  let id = p.edit?.id;
  let type = p.edit?.type;
  if (type === 'siteSettings' && practical) [id, type] = [practical, 'page'];
  if (!id || !TYPES.has(type)) {
    unmapped.push(p.url);
    continue;
  }
  const d = byDoc.get(id) ?? { id, type, langs: {} };
  const l = (d.langs[p.lang] ??= { titles: new Set(), descriptions: new Set(), images: new Set(), urls: [] });
  l.titles.add(p.title === siteName ? siteName : p.title.endsWith(suffix) ? p.title.slice(0, -suffix.length) : p.title);
  l.descriptions.add(p.description);
  l.images.add(p.ogImage ? assetOf(p.ogImage) : '');
  l.urls.push(p.url);
  byDoc.set(id, d);
}

const ids = [...byDoc.keys()];
const docs = await client.fetch(`*[_id in $ids]`, { ids: ids.flatMap((id) => [id, `drafts.${id}`]) });
const docById = Object.fromEntries(docs.map((d) => [d._id, d]));

/** The figure on the document whose asset the page shares, copied whole. */
function figureFor(doc, ref) {
  let found = null;
  const walk = (v) => {
    if (found || !v || typeof v !== 'object') return;
    if (v.asset?._ref === ref) {
      found = v;
      return;
    }
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x);
  };
  walk(doc);
  const { _key, ...figure } = found ?? { asset: { _type: 'reference', _ref: ref } };
  return { ...figure, _type: 'figure' };
}

/** One value per language, or null when a language renders two. French/Dutch only where they differ. */
function localised(langs, key, _type) {
  const values = {};
  for (const l of LOCALES) {
    const set = langs[l]?.[key];
    if (!set) continue;
    if (set.size !== 1) return { conflict: [...set] };
    const [v] = set;
    if (v) values[l] = v;
  }
  if (!values.en) return null;
  const out = { _type, en: values.en };
  for (const l of LOCALES.slice(1)) if (values[l] && values[l] !== values.en) out[l] = values[l];
  return { value: out };
}

/* ---------------------------------------------------------------- plan */

const plan = [];
const conflicts = [];
const stats = { title: 0, description: 0, genericDescription: 0, ogImage: 0, drafts: 0, skippedFilled: 0 };

for (const d of byDoc.values()) {
  const doc = docById[d.id];
  if (!doc) continue;
  const set = {};

  const title = localised(d.langs, 'titles', 'localeString');
  if (title?.conflict) conflicts.push({ id: d.id, field: 'title', values: title.conflict });
  else if (title?.value) {
    if (doc.seo?.title) stats.skippedFilled++;
    else set['seo.title'] = title.value;
  }

  const description = localised(d.langs, 'descriptions', 'localeText');
  if (description?.conflict) conflicts.push({ id: d.id, field: 'description', values: description.conflict });
  else if (description?.value) {
    const v = description.value;
    const generic = LOCALES.every((l) => (v[l] ?? v.en) === (tagline[l] ?? tagline.en));
    if (doc.seo?.description) stats.skippedFilled++;
    else if (!(generic && SKIP_GENERIC)) {
      set['seo.description'] = v;
      if (generic) stats.genericDescription++;
    }
  }

  const images = new Set(LOCALES.flatMap((l) => [...(d.langs[l]?.images ?? [])]).filter(Boolean));
  if (images.size > 1) conflicts.push({ id: d.id, field: 'ogImage', values: [...images] });
  else if (images.size === 1 && !doc.seo?.ogImage?.asset) {
    const [ref] = images;
    // The site-wide share image is not this page's own; leave it to Site settings.
    if (ref !== settings?.defaultSeo?.ogImage?.asset?._ref) set['seo.ogImage'] = figureFor(doc, ref);
  }

  if (!Object.keys(set).length) continue;
  for (const k of Object.keys(set)) stats[k.slice(4)]++;
  const targets = [d.id, ...(docById[`drafts.${d.id}`] ? [`drafts.${d.id}`] : [])];
  if (targets.length > 1) stats.drafts++;
  plan.push({ id: d.id, type: d.type, targets, set, urls: LOCALES.map((l) => d.langs[l]?.urls[0]).filter(Boolean) });
}

// Site settings: the default description every page without one already sends.
const settingsTargets = [];
if (settings && !settings.defaultSeo?.description && tagline.en) {
  const draft = await client.fetch(`*[_id == "drafts.siteSettings"][0]._id`);
  settingsTargets.push('siteSettings', ...(draft ? [draft] : []));
}

/* ---------------------------------------------------------------- report */

const byType = {};
for (const p of plan) {
  const t = (byType[p.type] ??= { documents: 0, title: 0, description: 0, ogImage: 0 });
  t.documents++;
  for (const k of Object.keys(p.set)) t[k.slice(4)]++;
}
console.log(`build: ${pages.length} pages read from ${path.relative(process.cwd(), FROM) || FROM}, ${byDoc.size} documents named`);
console.log(`pages without a document of their own (listing/archive routes, 404): ${unmapped.length}`);
console.table(byType);
console.log(
  `descriptions that are only the site tagline: ${stats.genericDescription}${SKIP_GENERIC ? ' (left out, --skip-generic)' : ''}; ` +
    `drafts patched too: ${stats.drafts}; fields already filled, kept: ${stats.skippedFilled}`,
);
if (settingsTargets.length) console.log(`siteSettings: default description = the tagline (${settingsTargets.join(', ')})`);
if (conflicts.length) {
  console.log(`\nleft empty - the document renders two ways:`);
  for (const c of conflicts) console.log(`  ${c.id} ${c.field}: ${c.values.map((v) => JSON.stringify(v)).join(' | ')}`);
}
if (PLAN) {
  fs.writeFileSync(PLAN, JSON.stringify({ unmapped, conflicts, plan }, null, 1));
  console.log(`\nplan written to ${PLAN}`);
}

const backupIds = [...plan.flatMap((p) => p.targets), ...settingsTargets];
const backup = await client.fetch(`*[_id in $ids]`, { ids: backupIds });
fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), documents: backup }, null, 1));
console.log(`backup: ${backup.length} documents -> ${path.relative(process.cwd(), BACKUP)}`);

if (!APPLY) {
  console.log('\ndry run - nothing written. Add --apply to write.');
  process.exit(0);
}

const tx = client.transaction();
for (const p of plan) {
  for (const id of p.targets) tx.patch(id, (patch) => patch.setIfMissing({ seo: { _type: 'seo' } }).setIfMissing(p.set));
}
for (const id of settingsTargets) {
  tx.patch(id, (patch) =>
    patch.setIfMissing({ defaultSeo: { _type: 'seo' } }).setIfMissing({ 'defaultSeo.description': { _type: 'localeText', ...Object.fromEntries(LOCALES.filter((l) => tagline[l]).map((l) => [l, tagline[l]])) } }),
  );
}
const result = await tx.commit({ visibility: 'sync' });
console.log(`\nwritten: transaction ${result.transactionId}, ${result.results.length} mutations`);
