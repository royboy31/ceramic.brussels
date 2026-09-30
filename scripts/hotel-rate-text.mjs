#!/usr/bin/env node
/**
 * Puts the hotel deal's two paragraphs in the fields meant for them.
 *
 * Site settings → Venue and access → Hotel deal → **Text** is described in
 * the schema as "the paragraph under the rate", the "use code … " line of
 * the frame. An editor filled it with the hotel's *description* instead -
 * which the VIP hotel tab already prints twice, as its own intro and body -
 * so the field the rate paragraph needed was occupied and the paragraph
 * stayed hard-coded in English in src/components/vipContent.ts.
 *
 * The description cannot simply be overwritten: its French and Dutch are the
 * only translation of it anywhere (the page's intro and body are English
 * only). So this moves rather than pastes:
 *
 *   settings hotelDeal.text.fr → page-vip-hotel-deal intro.fr
 *   settings hotelDeal.text.nl → page-vip-hotel-deal intro.nl
 *   settings hotelDeal.text    ← the rate paragraph, English
 *
 * The French and Dutch land where they are read, so the hotel tab stops
 * showing English on /fr/ and /nl/, and the rate paragraph becomes an
 * editable, translatable field for the first time. The English description
 * is dropped: the page's own intro already carries it, in the client's
 * wording.
 *
 *   node scripts/hotel-rate-text.mjs           dry run
 *   node scripts/hotel-rate-text.mjs --apply   write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'raw',
});

/** The frame's own paragraph, verbatim - `{code}` is filled at render time. */
const RATE_TEXT =
  'Use code {code} to enjoy a special rate of €160 per night for single occupancy ' +
  '(excluding city tax), breakfast included, for stays between January 19 and 25, 2027.';

const settings = await client.fetch(`*[_type == "siteSettings"][0]{_id, practicalInfo}`);
const page = await client.fetch(`*[_id == "page-vip-hotel-deal"][0]{_id, intro}`);
if (!settings || !page) {
  console.error('Site settings or the hotel-deal page is missing.');
  process.exit(1);
}

const text = settings.practicalInfo?.hotelDeal?.text ?? {};
const moves = ['fr', 'nl'].filter((loc) => text[loc] && !page.intro?.[loc]);
const blocked = ['fr', 'nl'].filter((loc) => text[loc] && page.intro?.[loc]);

console.log('Hotel deal → Text, today:');
for (const loc of ['en', 'fr', 'nl']) console.log(`  [${loc}] ${(text[loc] ?? '(empty)').slice(0, 80)}`);
console.log('\nPlanned:');
for (const loc of moves) console.log(`  page intro.${loc}  ← the description, moved (${text[loc].length} chars)`);
for (const loc of blocked) console.log(`  page intro.${loc}  ! already filled, left alone - resolve by hand`);
console.log(`  settings hotelDeal.text.en ← "${RATE_TEXT.slice(0, 60)}…"`);
console.log('  settings hotelDeal.text.fr / .nl ← cleared, so they fall back to English until translated');

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const dir = path.join(ROOT, 'legacy-export', 'backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `hotel-rate-text-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify({ settings, page }, null, 2));
console.log(`\nbackup: ${path.relative(ROOT, file)}`);

const intro = { ...(page.intro ?? {}), _type: page.intro?._type ?? 'localeText' };
for (const loc of moves) intro[loc] = text[loc];

await client
  .transaction()
  .patch(page._id, (p) => p.set({ intro }))
  .patch(settings._id, (p) =>
    p.set({ 'practicalInfo.hotelDeal.text': { _type: text._type ?? 'localeText', en: RATE_TEXT } }),
  )
  .commit();
console.log(`moved ${moves.length} translation(s); the rate paragraph is now a field.`);
