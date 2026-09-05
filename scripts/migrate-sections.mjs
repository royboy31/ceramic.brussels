#!/usr/bin/env node
/**
 * One-off: move the homepage's fixed blocks into its section stack.
 *
 * Before the page builder the homepage held spotlights, a banner, a video,
 * the key-figures image and link, and a closing banner as separate fields
 * in a fixed order. They are now blocks in `sections`, in that same order,
 * so the site looks the same after this runs and the editor can reorder
 * from then on.
 *
 *   node scripts/migrate-sections.mjs          apply
 *   node scripts/migrate-sections.mjs --dry    show the patch, change nothing
 *
 * Idempotent: a homepage that already has sections and none of the old
 * fields is left alone. Needs SANITY_API_WRITE_TOKEN in .env.
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';

function readEnv() {
  const out = {};
  if (!fs.existsSync('.env')) return out;
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const dry = process.argv.includes('--dry');

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-11-01',
  useCdn: false,
});

if (!env.SANITY_API_WRITE_TOKEN && !dry) {
  console.error('SANITY_API_WRITE_TOKEN missing from .env');
  process.exit(1);
}

let n = 0;
const key = (p) => `${p}-${(n++).toString(36)}`;

const OLD_FIELDS = ['spotlights', 'banner', 'video', 'figuresImage', 'figuresLink', 'closingBanner'];

function blocksFrom(home) {
  const out = [];

  for (const s of home.spotlights ?? []) {
    out.push({ ...s, _type: 'spotlight', _key: s._key ?? key('spot') });
  }

  if (home.banner?.text?.en || home.banner?.link || home.banner?.image) {
    out.push({
      _type: 'bannerSection',
      _key: key('banner'),
      style: 'gradient',
      text: home.banner.text,
      link: home.banner.link,
      image: home.banner.image,
    });
  }

  // Always a video block: an empty one shows the current edition's film,
  // which is what the old page did when the field was blank.
  out.push({ _type: 'videoSection', _key: key('video'), video: home.video?.url ? home.video : undefined });

  out.push({
    _type: 'keyFiguresSection',
    _key: key('figures'),
    image: home.figuresImage,
    link: home.figuresLink,
  });

  if (home.closingBanner?.text?.en || home.closingBanner?.link) {
    out.push({
      _type: 'bannerSection',
      _key: key('closing'),
      style: 'solid',
      text: home.closingBanner.text,
      link: home.closingBanner.link,
    });
  }

  // Drop undefined values so the document stays tidy.
  return out.map((b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)));
}

async function migrate(id) {
  const home = await client.getDocument(id);
  if (!home) return console.log(`${id}: not found, skipped`);

  const hasOld = OLD_FIELDS.some((f) => home[f] !== undefined);
  if (!hasOld) return console.log(`${id}: already migrated`);

  const existing = home.sections ?? [];
  const sections = [...existing, ...blocksFrom(home)];

  console.log(`${id}: ${existing.length} existing + ${sections.length - existing.length} converted sections`);
  for (const s of sections) console.log(`   · ${s._type}${s.text?.en ? ` "${s.text.en}"` : s.headline?.en ? ` "${s.headline.en}"` : ''}`);

  if (dry) return;
  await client.patch(id).set({ sections }).unset(OLD_FIELDS).commit();
  console.log(`${id}: written`);
}

// The published document and its draft, if an editor has one open.
await migrate('homepage');
await migrate('drafts.homepage');
