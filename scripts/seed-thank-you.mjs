#!/usr/bin/env node
/**
 * Seeds the gallery-application thank-you page and points Site settings →
 * Applications → "Page shown after sending" at it.
 *
 *   node scripts/seed-thank-you.mjs --dry   plan only
 *   node scripts/seed-thank-you.mjs         write
 *
 * The page is an ordinary standalone `page` (Other pages), id `page-thank-you`,
 * noindex, with a title, a lead paragraph and one "back to the homepage"
 * pill in the three languages. Deterministic id, so a re-run corrects rather
 * than duplicates - but it only creates: a page an editor has since changed
 * is left alone (createIfNotExists), and the setting is only set when empty.
 * Needs SANITY_API_WRITE_TOKEN in .env.
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
if (!env.SANITY_API_WRITE_TOKEN && !dry) {
  console.error('SANITY_API_WRITE_TOKEN missing from .env');
  process.exit(1);
}
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-11-01',
  useCdn: false,
});

const PAGE_ID = 'page-thank-you';

const page = {
  _id: PAGE_ID,
  _type: 'page',
  order: 101,
  title: { _type: 'localeString', en: 'Thank you', fr: 'Merci', nl: 'Bedankt' },
  slug: {
    _type: 'localeSlug',
    en: { _type: 'slug', current: 'thank-you' },
    fr: { _type: 'slug', current: 'merci' },
    nl: { _type: 'slug', current: 'bedankt' },
  },
  intro: {
    _type: 'localeText',
    en: 'Your request has been received. A confirmation is on its way to your inbox, and the team will be in touch with the application form and all the relevant information shortly.',
    fr: 'Votre demande a bien été reçue. Une confirmation arrive dans votre boîte mail, et l’équipe vous enverra prochainement le formulaire de candidature et toutes les informations utiles.',
    nl: 'Uw aanvraag is ontvangen. Een bevestiging is onderweg naar uw mailbox, en het team bezorgt u binnenkort het aanmeldingsformulier en alle nuttige informatie.',
  },
  sections: [
    {
      _key: 'home',
      _type: 'linksSection',
      variant: 'solid',
      links: [
        {
          _key: 'l1',
          _type: 'link',
          kind: 'route',
          path: '/',
          label: { _type: 'localeString', en: 'back to the homepage', fr: 'retour à l’accueil', nl: 'terug naar de homepage' },
        },
      ],
    },
  ],
  seo: { _type: 'seo', noIndex: true },
};

const settings = await client.fetch(`*[_type == "siteSettings"][0]{ _id, "current": applications.successPage._ref }`);
const existing = await client.fetch(`*[_id == $id][0]._id`, { id: PAGE_ID });

console.log(`${existing ? 'keep' : 'create'} ${PAGE_ID} (/en/thank-you/, /fr/merci/, /nl/bedankt/)`);
console.log(
  settings?.current
    ? `keep siteSettings.applications.successPage = ${settings.current}`
    : `set  siteSettings.applications.successPage -> ${PAGE_ID}`,
);
if (dry) {
  console.log('dry run, nothing written');
  process.exit(0);
}

const tx = client.transaction().createIfNotExists(page);
if (settings && !settings.current) {
  tx.patch(settings._id, (p) => p.setIfMissing({ applications: {} }).set({ 'applications.successPage': { _type: 'reference', _ref: PAGE_ID } }));
}
const result = await tx.commit();
console.log(`done: ${result.results.length} mutation(s), transaction ${result.transactionId}`);
