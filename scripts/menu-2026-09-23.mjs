#!/usr/bin/env node
/**
 * The site menu as the design draws it (Lilanga's screenshot of 2026-09-23):
 * nine rows in menu order - exhibitors, guest of honour, art prize,
 * programme, visitors info, partners, VIP, press & media, about - each with
 * the sub-items the design lists. Adds the missing ones (exhibitors' four,
 * jury, floor plan, FAQ, main and event partners, the press & media row,
 * contact), moves visitors info above partners, points partners at its hub
 * root rather than the institutions tab, and drops VIP's sub-items, which
 * the design does not show.
 *
 * Two of the design's sub-items are left out because there is nothing to
 * link to: "catalogue" (the current edition has no catalogue URL) and
 * "exhibition pass" (no page; hubs.ts leaves the tab out on purpose).
 *
 * Writes the **draft** of the navigation document only - the published menu
 * is untouched until someone presses Publish in the Studio. Refuses to run
 * over an existing draft, which would be an editor's unsaved work. Keeps
 * every existing item's key, so the Studio's history reads as a reorder.
 * The footer items are copied over unchanged.
 *
 *   node scripts/menu-2026-09-23.mjs                 plan and back up, write nothing
 *   node scripts/menu-2026-09-23.mjs --apply         write the draft
 *   --env=<file>                                     read the token from another .env
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.slice(6) ?? '.env';
const BACKUP = path.resolve('legacy-export/backups/menu-2026-09-23.json');

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
if (!env.SANITY_API_WRITE_TOKEN) throw new Error(`no SANITY_API_WRITE_TOKEN in ${ENV_FILE}`);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID || '5hqzhin7',
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

const [published, draft] = await Promise.all([client.getDocument('navigation'), client.getDocument('drafts.navigation')]);
if (!published) throw new Error('no published navigation document');
if (draft) {
  const row = (i) => `  ${i.label?.en}: ${(i.children ?? []).map((c) => c.label?.en).join(', ') || '-'}`;
  console.log(`An unpublished draft of the menu exists, last edited ${draft._updatedAt}.`);
  console.log('Draft menu:');
  (draft.items ?? []).forEach((i) => console.log(row(i)));
  console.log('Published menu:');
  (published.items ?? []).forEach((i) => console.log(row(i)));
  console.log('Publish or discard it in the Studio (Setup -> Menu and footer), then run this again.');
  process.exit(1);
}

const label = (en, fr, nl) => ({ _type: 'localeString', en, fr: fr ?? en, nl: nl ?? en });

/** [route, anchor, label] -> a menu item, reusing the key of the one already there. */
const oldItems = published.items ?? [];
let fresh = 0;
function item(route, anchor, lbl, children) {
  const old = oldItems.find((i) => i.route === route && i.kind === 'route');
  const kids = (children ?? []).map(([r, a, l], n) => {
    const was = old?.children?.find((c) => c.route === r && (c.anchor ?? '') === (a ?? ''));
    return {
      _key: was?._key ?? `navChildNew${n}${fresh++}`,
      _type: 'navChild',
      kind: 'route',
      route: r,
      ...(a ? { anchor: a } : {}),
      label: l,
    };
  });
  return {
    _key: old?._key ?? `navItem-${route}`,
    _type: 'navItem',
    kind: 'route',
    route,
    ...(anchor ? { anchor } : {}),
    label: lbl,
    ...(kids.length ? { children: kids } : {}),
  };
}

const old = (route) => oldItems.find((i) => i.route === route)?.label;
const oldChild = (route, anchor) =>
  oldItems.find((i) => i.route === route)?.children?.find((c) => c.anchor === anchor)?.label;

const items = [
  item('exhibitors', null, old('exhibitors') ?? label('exhibitors', 'exposants', 'exposanten'), [
    ['exhibitors', null, label('galleries', 'galeries', 'galerieën')],
    ['artists', null, label('artists', 'artistes', 'kunstenaars')],
    ['exhibitors', 'awards', label('awards', 'prix', 'prijzen')],
  ]),
  item('guest-of-honour', null, old('guest-of-honour') ?? label('guest of honour', 'invitée d’honneur', 'eregast')),
  item('art-prize', null, old('art-prize') ?? label('art prize'), [
    ['art-prize', 'about', oldChild('art-prize', 'about') ?? label('about', 'à propos', 'over')],
    ['art-prize', 'laureates', oldChild('art-prize', 'laureates') ?? label('laureates', 'lauréats', 'laureaten')],
    ['art-prize', 'jury', label('jury')],
    ['art-prize', 'awards', oldChild('art-prize', 'awards') ?? label('awards', 'prix', 'prijzen')],
  ]),
  item('programme', null, old('programme') ?? label('programme', 'programme', 'programma'), [
    ['programme', 'talks', oldChild('programme', 'talks') ?? label('talks')],
    ['programme', 'awards', oldChild('programme', 'awards') ?? label('award ceremony', 'remise des prix', 'prijsuitreiking')],
    ['programme', 'la-cambre', oldChild('programme', 'la-cambre') ?? label('ceramic brussels x La Cambre')],
  ]),
  item('visit', null, old('visit') ?? label('visitors info', 'infos pratiques', 'bezoekersinfo'), [
    ['visit', 'practical-info', oldChild('visit', 'practical-info') ?? label('practical info', 'infos pratiques', 'praktische info')],
    ['visit', 'food-drinks', oldChild('visit', 'food-drinks') ?? label('food & drinks')],
    ['visit', 'floor-plan', label('floor plan', 'plan', 'plattegrond')],
    ['visit', 'faq', label('FAQ')],
  ]),
  item('partners', null, old('partners') ?? label('partners', 'partenaires', 'partners'), [
    ['partners', 'main', label('main partner', 'partenaire principal', 'hoofdpartner')],
    ['partners', 'institutions', oldChild('partners', 'institutions') ?? label('institutions', 'institutions', 'instellingen')],
    ['partners', 'hotel', oldChild('partners', 'hotel') ?? label('hotel', 'hôtel', 'hotel')],
    ['partners', 'event', label('event partners', 'partenaires événement', 'eventpartners')],
  ]),
  item('vip', null, old('vip') ?? label('VIP')),
  item('press-media', null, label('press & media', 'presse & médias', 'pers & media'), [
    ['press-media', 'press', label('press', 'presse', 'pers')],
    ['press-media', 'photos-videos', label('photos', 'photos', 'foto’s')],
    ['press-media', 'media-partners', label('partners', 'partenaires', 'partners')],
  ]),
  item('about', null, old('about') ?? label('about', 'à propos', 'over'), [
    ['about', 'the-fair', oldChild('about', 'the-fair') ?? label('ceramic brussels')],
    ['about', 'advisory-board', oldChild('about', 'advisory-board') ?? label('advisory board', 'comité consultatif', 'adviesraad')],
    ['about', 'team', label('contact')],
  ]),
];

// Anything in the published menu this plan does not account for is listed,
// so nothing an editor added disappears without being seen.
const planned = new Set(items.map((i) => i.route));
for (const i of oldItems) if (!planned.has(i.route)) console.log(`  DROPPED top-level item: ${i.label?.en} (${i.kind} ${i.route ?? i.url ?? ''})`);

for (const i of items) {
  console.log(`${i.label.en}  ->  /${i.route}${i.anchor ? `#${i.anchor}` : ''}`);
  for (const c of i.children ?? []) console.log(`    ${c.label.en} | ${c.label.fr} | ${c.label.nl}  ->  ${c.route}${c.anchor ? ` + ${c.anchor}` : ''}`);
}

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), document: published }, null, 1));
console.log(`backup -> ${path.relative(process.cwd(), BACKUP)}`);

if (!APPLY) {
  console.log('dry run: nothing written. Add --apply to write the draft.');
  process.exit(0);
}

const { _rev, _updatedAt, _createdAt, _system, ...rest } = published;
const res = await client.create({ ...rest, _id: 'drafts.navigation', items });
console.log(`draft written: ${res._id} rev ${res._rev}. Review with Preview, then Publish in the Studio.`);
