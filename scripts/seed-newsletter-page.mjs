#!/usr/bin/env node
/**
 * A draft standalone page carrying the newsletter signup block (#55), so
 * the team can see the form in the Studio's preview and publish it when
 * the sheet is connected. Draft only - publishing is the editors' call.
 * Deterministic id, safe to re-run; it never touches a published page.
 *
 *   node scripts/seed-newsletter-page.mjs
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const id = 'drafts.page-newsletter';
const existing = await client.fetch('*[_id in [$draft, $published]][0]._id', {
  draft: id,
  published: 'page-newsletter',
});
if (existing) {
  console.log('already there:', existing, '- nothing written');
  process.exit(0);
}

await client.createIfNotExists({
  _id: id,
  _type: 'page',
  title: { _type: 'localeString', en: 'Newsletter' },
  slug: {
    _type: 'localeSlug',
    en: { _type: 'slug', current: 'newsletter' },
    fr: { _type: 'slug', current: 'newsletter' },
    nl: { _type: 'slug', current: 'nieuwsbrief' },
  },
  intro: {
    _type: 'localeText',
    en: 'Stay in touch: the fair’s news, programme and invitations, a few times a year.',
  },
  sections: [
    {
      _type: 'newsletterSection',
      _key: 'signup',
      heading: { _type: 'localeString', en: 'subscribe to our newsletter' },
    },
  ],
});
console.log('draft created:', id, '- publish it from Other pages once the sheet is connected');
