/**
 * The switch Tiphaine asked for: the 2027 galleries on the site.
 *
 * `showExhibitors` on the **edition** document is the whole thing. A past
 * edition always shows its galleries; the current one shows them only once
 * this is ticked:
 *
 *   EDITION_SHOWN = (showExhibitors == true || isCurrent != true)
 *   LANDING_YEAR  = newest shown edition, else the current one
 *
 * So ticking it on 2027 moves the landing year from 2026 to 2027, and
 * `/exhibitors` becomes the 2027 list.
 *
 * **What it takes with it.** While `PAST_EDITIONS_PUBLIC` is false - still the
 * case on `main` - `[lang]/exhibitors/[year]/[slug].astro` builds only the
 * landing year's gallery pages:
 *
 *   const shown = PAST_EDITIONS_PUBLIC ? past : past.filter(p => p.year === landingYear)
 *
 * so the 67 published 2026 gallery pages stop being built. They answer 200
 * today and run through the production sitemap, no 2026 slug reappears under
 * 2027, and no legacy redirect covers an individual gallery. That is 134 URLs
 * across en/fr. Turning previous editions on at the same time is what avoids
 * it; see docs/exhibitors-2027-switch.md.
 *
 *   node scripts/toggle-2027-exhibitors.mjs           # report only
 *   node scripts/toggle-2027-exhibitors.mjs --on      # show the 2027 galleries
 *   node scripts/toggle-2027-exhibitors.mjs --off     # roll back
 *
 * Either direction is one publish, so the webhook rebuilds production by
 * itself, in about two and a half minutes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const ON = process.argv.includes('--on');
const OFF = process.argv.includes('--off');

const editions = await client.fetch(
  `*[_type == "edition" && defined(year)] | order(year desc){_id, year, isCurrent, showExhibitors,
     "galleries": count(*[_type == "exhibitor" && references(^._id) && !(_id in path("drafts.**"))])}`,
);

const shown = (e) => e.showExhibitors === true || e.isCurrent !== true;
const landing = editions.filter((e) => shown(e)).map((e) => e.year).sort((a, b) => b - a)[0]
  ?? editions.find((e) => e.isCurrent)?.year;

console.log('year  isCurrent  showExhibitors  galleries');
for (const e of editions) {
  console.log(
    `${e.year}  ${String(e.isCurrent ?? '-').padEnd(10)} ${String(e.showExhibitors ?? '-').padEnd(15)} ${e.galleries}`,
  );
}
console.log(`\n/exhibitors currently lands on: ${landing}`);

if (!ON && !OFF) {
  console.log('\nreport only; pass --on or --off');
  process.exit(0);
}

const target = editions.find((e) => e.year === 2027);
if (!target) {
  console.error('no 2027 edition');
  process.exit(1);
}

await client.patch(target._id).set({ showExhibitors: ON }).commit();

const after = await client.fetch(`*[_id == $id][0]{year, isCurrent, showExhibitors}`, { id: target._id });
console.log(`\n${target._id}: showExhibitors -> ${after.showExhibitors}`);
console.log(`/exhibitors will land on: ${ON ? 2027 : 2026} once the rebuild finishes`);
