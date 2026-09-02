#!/usr/bin/env node
/**
 * Imports the exhibitor lists crawled from the old site into Sanity.
 *
 *   node scripts/import-exhibitors.mjs 2026          one year
 *   node scripts/import-exhibitors.mjs 2024 2025 2026
 *   node scripts/import-exhibitors.mjs 2026 --dry    print, write nothing
 *
 * Source: scripts/legacy/exhibitors-<year>.json, one row per accordion entry
 * on ceramic.brussels/en/exhibitors[/<year>]: name (with the country code the
 * old site typed into it), booth, links, and the captions of its images.
 * Descriptions and the images themselves were not captured and stay empty -
 * editors fill those in the Studio, or a second pass fetches them.
 *
 * Document ids are deterministic (`exhibitor-<year>-<slug>`) so re-running
 * updates in place. Existing `bio`, `images`, `artists` and flags set by an
 * editor are preserved: only the fields this script knows about are patched.
 * The edition document for the year must exist (created by the seed, or by an
 * editor).
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
const { PUBLIC_SANITY_PROJECT_ID: projectId, PUBLIC_SANITY_DATASET: dataset, SANITY_API_WRITE_TOKEN: token } = env;
const dry = process.argv.includes('--dry');
const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);

if (!years.length) {
  console.error('Usage: node scripts/import-exhibitors.mjs <year> [<year>…] [--dry]');
  process.exit(1);
}
if (!dry && (!projectId || !dataset || !token)) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

const client = dry ? null : createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false });

/* ---------------------------------------------------------------- parsing */

const slugOf = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The old site's codes, normalised to ISO 3166-1 alpha-2. */
const CODE_FIXES = { uk: 'GB', en: 'GB' };

/**
 * "Galerie Fontana (nl)(be)" → { name: "Galerie Fontana", codes: ["NL", "BE"] }
 * "Almine Rech (be/fr/us)"   → codes ["BE", "FR", "US"]
 * "Format (no) ___ focus Norway" → name "Format", codes ["NO"], focus true
 */
function parseName(raw) {
  let name = raw.trim();
  let kind = 'gallery';
  let focus = false;

  if (/^>>.*<<$/.test(name)) {
    kind = 'tribute';
    name = name.replace(/^>>\s*|\s*<<$/g, '');
  }
  if (/jury prize/i.test(name)) kind = 'jury-prize';

  const focusMatch = name.match(/_{2,}\s*focus\s+\w+/i);
  if (focusMatch) {
    focus = true;
    name = name.replace(focusMatch[0], '').trim();
  }

  const codes = [];
  name = name
    .replace(/\(([a-z]{2}(?:[\/,]\s*[a-z]{2})*)\)/gi, (_, group) => {
      for (const c of group.split(/[\/,]\s*/)) codes.push(CODE_FIXES[c.toLowerCase()] ?? c.toUpperCase());
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { name, codes, kind, focus };
}

function parseLinks(links) {
  let website;
  let instagram;
  for (const raw of links ?? []) {
    if (!raw) continue;
    const url = raw.replace(/[?&](fbclid|utm_[a-z]+)=[^&]*/g, '').replace(/\?$/, '');
    const ig = url.match(/instagram\.com\/([^\/?#]+)/i);
    if (ig) {
      instagram ??= ig[1];
    } else if (!website) {
      website = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    }
  }
  return { website, instagram };
}

/**
 * Captions read like "Frédérique Fleury, Les Endormies" or
 * "Barry Wolfryd, Knowing When to Quit, Murano glass, 68x33x29cm, 2023".
 * Kept as a note on the document so an editor uploading the images has
 * the captions to hand.
 */
function captionsNote(imgs) {
  const list = (imgs ?? []).filter(Boolean);
  return list.length ? list.join('\n') : undefined;
}

/* ------------------------------------------------------------------ main */

for (const year of years) {
  const file = `scripts/legacy/exhibitors-${year}.json`;
  if (!fs.existsSync(file)) {
    console.error(`No ${file}`);
    continue;
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const editionId = client
    ? await client.fetch(`*[_type == "edition" && year == $year][0]._id`, { year })
    : `edition-${year}`;
  if (!editionId) {
    console.error(`No edition document for ${year}. Create it first.`);
    continue;
  }

  const seen = new Set();
  const patches = [];

  for (const row of rows) {
    const { name, codes, kind, focus } = parseName(row.name);
    const { website, instagram } = parseLinks(row.links);
    let slug = slugOf(name);
    if (seen.has(slug)) slug = `${slug}-${slugOf(row.booth ?? '')}`;
    seen.add(slug);

    const _id = `exhibitor-${year}-${slug}`;
    const fields = {
      name,
      slug: { _type: 'slug', current: slug },
      edition: { _type: 'reference', _ref: editionId },
      kind,
      booth: row.booth || undefined,
      countryCode: codes[0],
      inCountryFocus: focus || undefined,
      website,
      instagram,
      importNote: captionsNote(row.imgs),
    };
    for (const k of Object.keys(fields)) if (fields[k] === undefined) delete fields[k];
    patches.push({ _id, fields });
  }

  console.log(`\n${year}: ${patches.length} exhibitors`);
  if (dry) {
    for (const p of patches) console.log(`  ${p._id.padEnd(48)} ${p.fields.booth ?? '   '}  ${p.fields.countryCode ?? '--'}  ${p.fields.kind}`);
    continue;
  }

  // createIfNotExists + patch keeps whatever an editor already filled in.
  for (let i = 0; i < patches.length; i += 50) {
    const tx = patches
      .slice(i, i + 50)
      .reduce(
        (t, { _id, fields }) =>
          t
            .createIfNotExists({ _id, _type: 'exhibitor', soloShow: false, inCountryFocus: false, ...fields })
            .patch(_id, (p) => p.set(fields)),
        client.transaction(),
      );
    await tx.commit();
  }
  console.log(`  written to ${projectId}/${dataset}`);
}
