#!/usr/bin/env node
/**
 * Puts Site settings → Hotel deal → "Hotel description" back, and moves the
 * rate paragraph to the field of its own.
 *
 * `hotelDeal.text` is read by **two** pages, not one: the VIP hotel tab and
 * Visitors info → practical info, which is public. Repurposing it for the
 * rate paragraph on 2026-09-30 therefore printed "Use code {code} to enjoy a
 * special rate …" on a public page, placeholder and all - and had the site
 * ever substituted it there, the VIP code would have been public.
 *
 * So the two paragraphs are two fields now: `text` the description, exactly
 * as the client wrote it in all three languages, and `rateText` the VIP
 * paragraph that carries `{code}`. The description is restored verbatim from
 * the backup the earlier move wrote.
 *
 *   node scripts/hotel-restore-text.mjs           dry run
 *   node scripts/hotel-restore-text.mjs --apply   write
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

const BACKUP = path.join(ROOT, 'legacy-export', 'backups', 'hotel-rate-text-2026-09-30T18-51-43-449Z.json');
const saved = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
const description = saved.settings?.practicalInfo?.hotelDeal?.text;
if (!description?.en) {
  console.error('The backup has no hotel description to restore.');
  process.exit(1);
}

const now = await client.fetch(`*[_type == "siteSettings"][0]{_id, "hotel": practicalInfo.hotelDeal}`);
const rateText = now.hotel?.rateText ?? now.hotel?.text;

console.log('Hotel description (restored, public - Visitors info):');
for (const loc of ['en', 'fr', 'nl']) console.log(`  [${loc}] ${(description[loc] ?? '(empty)').slice(0, 78)}`);
console.log('\nRate paragraph (VIP hotel tab only):');
console.log(`  [en] ${(rateText?.en ?? '(empty)').slice(0, 78)}`);

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

await client
  .patch(now._id)
  .set({ 'practicalInfo.hotelDeal.text': description, 'practicalInfo.hotelDeal.rateText': rateText })
  .commit();
console.log('\nwritten.');
