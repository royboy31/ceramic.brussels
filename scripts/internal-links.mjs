#!/usr/bin/env node
/**
 * Turns the links in rich text that point back at this site from typed
 * addresses into "link to this site" marks (src/sanity/schemaTypes/objects/
 * richText.ts), so they render as relative paths in the page's language.
 *
 * What it fixes. The old site's text came in with its own addresses -
 * `https://ceramic.brussels/en/art-prize#laureates-2` - and on 2026-09-14 the
 * dataset held 87 of them in 25 documents (awards, laureates, programme
 * events, people, one page). On a staging page they open the live site; in a
 * French text they keep their English; and the anchors (#laureates-2,
 * #advisory-board) name sections the new site has made into tabs, so the 301
 * lands on the hub rather than on the tab. Johan Creten's two links went to
 * /guest-of-honour, which now shows the current edition's guest.
 *
 * The mapping is explicit (TARGETS below). An address it does not recognise
 * is listed and the run refuses to apply, rather than guessing. A link whose
 * text is an artist's name and whose address is the guest-of-honour hub goes
 * to that artist's page. Email, phone and other sites' links are not touched.
 *
 * Second pass, same run: the "A section of this site" links on buttons and
 * in the menu, which stored a section and a tab typed by hand, get the
 * `path` the Studio's search box now writes ("art-prize/laureates"), and
 * the two old fields are cleared. links.ts reads both shapes, so this is
 * tidiness: it keeps the old fields from showing beside the new box.
 *
 *   node scripts/internal-links.mjs            plan and back up, write nothing
 *   node scripts/internal-links.mjs --apply    write, in one transaction
 *
 * **Apply only once the schema and PortableText.astro are on `main`.** Until
 * then the production Studio does not know the mark and the live site renders
 * the text without its link. The script checks origin/main for it.
 * Turn the Sanity webhook off first: a transaction fires it once per document.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const BACKUP = path.resolve('legacy-export/backups/internal-links-2026-09-14.json');

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

/** This site's own pages: absolute on either host, or relative with a language. */
const OWN = /^(?:https?:\/\/(?:www\.)?ceramic\.brussels)?\/(?:en|fr|nl)(\/[^#?]*)?(?:\?[^#]*)?(?:#(.*))?$/i;

/**
 * Old path (language dropped, no slashes at the ends) → target. `anchors`
 * maps the old page's section anchors onto the new site's tabs; a missing
 * anchor is the hub root.
 */
const TARGETS = {
  'art-prize': {
    route: 'art-prize',
    anchors: {
      'laureates-2': 'laureates',
      laureates: 'laureates',
      'laureat-e-s': 'laureates',
      'jury-2': 'jury',
      jury: 'jury',
      'awards-2': 'awards',
      awards: 'awards',
    },
  },
  'ceramic-brussels': { route: 'about', anchors: { 'advisory-board': 'advisory-board' } },
  'visitors-info': { route: 'visit', anchors: {} },
  'guest-of-honour': { route: 'guest-of-honour', anchors: {} },
  // The old past-editions guest page; Johan Creten's bio is the only text
  // linking it, and his edition is 2024 - where the 301 map sends it too.
  'pasteditions/guest-of-honour': { route: 'editions', anchor: '2024', anchors: {} },
};

/**
 * One address the path rules above get wrong: the Dutch sentence names the
 * 2025 jury, as its English and French do with #jury-2, but its address lost
 * the anchor.
 */
const OVERRIDES = [{ doc: 'demo-award-2025-9', href: 'https://ceramic.brussels/nl/art-prize', anchor: 'jury' }];

function targetFor(href, text, docId, artistsByName) {
  const m = OWN.exec(href.trim());
  if (!m) return null;
  const oldPath = (m[1] ?? '').replace(/^\/+|\/+$/g, '');
  const oldAnchor = m[2] || undefined;

  const override = OVERRIDES.find((o) => o.doc === docId.replace(/^drafts\./, '') && o.href === href);
  if (/^exhibitors\/\d{4}$/.test(oldPath)) return { path: oldPath };

  const rule = TARGETS[oldPath];
  if (!rule) return { unmapped: true };

  const artist = artistsByName.get(text.trim().toLowerCase());
  if (oldPath === 'guest-of-honour' && artist) {
    return { internal: { _type: 'reference', _ref: artist } };
  }

  let anchor = rule.anchor;
  if (oldAnchor) {
    if (!(oldAnchor in rule.anchors)) return { unmapped: true };
    anchor = rule.anchors[oldAnchor];
  }
  if (override) anchor = override.anchor;
  // The same "hub/tab" identifiers the Studio's list offers; links.ts
  // `sitePath` writes them out in each page's language.
  return { path: anchor ? `${rule.route}/${anchor}` : rule.route };
}

/** Every markDef in a document, with the patch path that addresses it. */
function* markDefs(value, at) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      yield* markDefs(item, `${at}[${item?._key ? `_key=="${item._key}"` : i}]`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.markDefs)) {
    for (const def of value.markDefs) {
      const text = (value.children ?? [])
        .filter((c) => (c.marks ?? []).includes(def._key))
        .map((c) => c.text)
        .join('');
      yield { def, text, path: `${at}.markDefs[_key=="${def._key}"]` };
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'markDefs' || key === 'children' || key.startsWith('_')) continue;
    yield* markDefs(child, at ? `${at}.${key}` : key);
  }
}

const docs = await client.fetch(`*[!(_type match "sanity.*")]`);
const artistsByName = new Map(
  docs
    .filter((d) => d._type === 'artist' && !d._id.startsWith('drafts.') && d.name)
    .map((d) => [d.name.trim().toLowerCase(), d._id]),
);

const plan = [];
const unmapped = [];
for (const doc of docs) {
  for (const { def, text, path: at } of markDefs(doc, '')) {
    if (def._type !== 'link' || typeof def.href !== 'string') continue;
    const target = targetFor(def.href, text, doc._id, artistsByName);
    if (!target) continue;
    if (target.unmapped) {
      unmapped.push({ doc: doc._id, href: def.href, text });
      continue;
    }
    plan.push({ doc, path: at.replace(/^\./, ''), text, href: def.href, value: { _key: def._key, _type: 'internalLink', ...target } });
  }
}

/** "A section of this site" links and menu items still on route + anchor. */
function* routeLinks(value, at) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      yield* routeLinks(item, `${at}[${item?._key ? `_key=="${item._key}"` : i}]`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  const isTarget = 'kind' in value && ('route' in value || 'anchor' in value) && !('path' in value);
  if (isTarget && (value.kind === 'route' || value.kind === undefined) && typeof value.route === 'string' && value.route !== '') {
    yield { at, route: value.route, anchor: value.anchor };
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'markDefs' || key.startsWith('_')) continue;
    yield* routeLinks(child, at ? `${at}.${key}` : key);
  }
}

const linkPlan = [];
for (const doc of docs) {
  for (const { at, route, anchor } of routeLinks(doc, '')) {
    linkPlan.push({ doc, at: at.replace(/^\./, ''), value: anchor ? `${route}/${anchor}` : route });
  }
}

const describe = (v) => (v.internal ? `document ${v.internal._ref}` : `path ${v.path}`);
const byTarget = {};
for (const p of plan) {
  const key = `${p.href}  →  ${describe(p.value)}`;
  byTarget[key] = (byTarget[key] ?? 0) + 1;
}
console.log(Object.entries(byTarget).map(([k, n]) => `${String(n).padStart(3)}  ${k}`).join('\n'));
const linkCounts = {};
for (const p of linkPlan) linkCounts[p.value] = (linkCounts[p.value] ?? 0) + 1;
console.log(`\n${linkPlan.length} button and menu links on section + tab, to become a path:`);
console.log(Object.entries(linkCounts).map(([k, n]) => `${String(n).padStart(3)}  ${k}`).join('\n'));
const touched = [...new Set([...plan, ...linkPlan].map((p) => p.doc._id))];
console.log(`\n${plan.length} links in ${touched.length} documents (drafts counted separately).`);

if (unmapped.length) {
  console.log(`\n${unmapped.length} links to this site with no rule - add them to TARGETS:`);
  for (const u of unmapped) console.log(`  ${u.doc}  ${u.href}  "${u.text}"`);
}

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify(docs.filter((d) => touched.includes(d._id)), null, 2));
console.log(`\nBacked up the ${touched.length} documents to ${path.relative(process.cwd(), BACKUP)}.`);

if (!APPLY) {
  console.log('Dry run - nothing written. --apply to write.');
  process.exit(0);
}
if (unmapped.length) {
  console.error('Refusing to apply with unmapped links.');
  process.exit(1);
}
const live = execSync('git fetch origin main --quiet && git show origin/main:src/sanity/schemaTypes/objects/richText.ts', {
  encoding: 'utf8',
});
if (!live.includes("name: 'internalLink'")) {
  console.error('origin/main does not have the "link to this site" mark yet - merge the code first.');
  process.exit(1);
}

const tx = client.transaction();
for (const id of touched) {
  const doc = docs.find((d) => d._id === id);
  const sets = Object.fromEntries([
    ...plan.filter((p) => p.doc._id === id).map((p) => [p.path, p.value]),
    ...linkPlan.filter((p) => p.doc._id === id).map((p) => [`${p.at}.path`, p.value]),
  ]);
  const unsets = linkPlan.filter((p) => p.doc._id === id).flatMap((p) => [`${p.at}.route`, `${p.at}.anchor`]);
  tx.patch(id, (patch) => patch.ifRevisionId(doc._rev).set(sets).unset(unsets));
}
const result = await tx.commit();
console.log(`Written: ${result.results.length} documents, transaction ${result.transactionId}.`);
