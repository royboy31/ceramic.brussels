#!/usr/bin/env node
/**
 * Copies the copy: the paragraphs the sixteen design pages in `html pages/`
 * show, into the documents that render them. The legacy import brought the
 * old site's wording; the design carries the newer text the client signed
 * off, so where the two differ the design wins. Only English is written —
 * the design has no French or Dutch — and only the fields listed here.
 *
 *   node scripts/sync-design-text.mjs --dry
 *   node scripts/sync-design-text.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { createClient } from '@sanity/client';
import { htmlToPortableText } from './lib/html-to-portable-text.mjs';

const dry = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PAGES = path.join(ROOT, 'html pages');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

/* ---------- helpers ---------- */

const page = (rel) => parse(fs.readFileSync(path.join(PAGES, rel, 'index.html'), 'utf8')).querySelector('main');
const text = (el) => el.structuredText.replace(/\s+/g, ' ').trim();
let n = 0;
/** <p> elements → Portable Text blocks; a blank line inside one <p> is a paragraph break. */
const blocks = (ps) =>
  ps.flatMap((p) =>
    p.innerHTML.split(/\n\s*\n/).flatMap((chunk) => htmlToPortableText(chunk, { keyPrefix: `d${(n++).toString(36)}` })),
  );
/** The <p> siblings after a heading, up to the next heading. */
function after(heading) {
  const out = [];
  let el = heading.nextElementSibling;
  while (el && !/^H[1-6]$/.test(el.tagName)) {
    if (el.tagName === 'P') out.push(el);
    else out.push(...el.querySelectorAll('p'));
    el = el.nextElementSibling;
  }
  return out;
}
const headingIn = (root, tag, label) => root.querySelectorAll(tag).find((h) => text(h).toLowerCase() === label.toLowerCase());
const isMeta = (p) => /^(°|1\/\d|→)/.test(text(p)) || text(p).length === 0;
/** "Artist, Title, 2024" → figure caption parts. */
function captionParts(s) {
  const m = s.replace(/\s+/g, ' ').trim().match(/^(.+?),\s*(.+?),\s*([0-9–\-]+)$/);
  return m ? { caption: m[1], workTitle: m[2], year: m[3] } : { caption: s.trim() };
}

const patches = [];
const set = (id, fields) => patches.push({ id, fields });
const report = (id, fields) => console.log(`  ${id}: ${Object.keys(fields).join(', ')}`);

/* ---------- guest of honour ---------- */
{
  const m = page('guest-of-honour');
  const intro = m.querySelector('section.intro');
  const introP = intro.querySelectorAll('p').find((p) => !isMeta(p));
  const bio = after(headingIn(intro, 'h3', 'biography'));
  const practice = m.querySelector('section.practice').querySelectorAll('p');
  const caps = m.querySelectorAll('section.gallery figcaption').map((c) => captionParts(text(c)));
  const f = {
    'intro.en': blocks([introP]),
    'sections[_key=="contentSection0"].body.en': blocks(bio),
    'sections[_key=="contentSection1"].body.en': blocks(practice),
  };
  caps.forEach((c, i) => {
    for (const [k, v] of Object.entries(c)) f[`works[${i}].image.${k}`] = v;
  });
  set('demo-artist-marion-verboom', f);
}

/* ---------- art prize · about ---------- */
{
  const m = page('art-prize/about');
  const prize = after(headingIn(m, 'h2', 'the prize'));
  const partners = after(headingIn(m, 'h2', 'partners')).filter((p) => text(p).length > 40);
  const cap = captionParts(text(m.querySelector('figure figcaption span')));
  const f = {
    'sections[_key=="contentSection0"].body.en': blocks(prize),
    'sections[_key=="contentSection2"].body.en': blocks(partners),
  };
  for (const [k, v] of Object.entries(cap)) f[`cover.${k}`] = v;
  set('demo-page-art-prize-about', f);
}

/* ---------- art prize · laureates ---------- */
{
  const m = page('art-prize/laureates');
  const ids = { 'Lorie Ballage': 'demo-artist-lorie-ballage', 'Uriel Caspi': 'demo-artist-uriel-caspi', 'Danny Cremers': 'demo-artist-danny-cremers' };
  for (const a of m.querySelectorAll('article')) {
    const name = text(a.querySelector('h2'));
    const id = ids[name];
    if (!id) continue;
    set(id, { 'bio.en': blocks(a.querySelectorAll('section p').filter((p) => !isMeta(p))) });
  }
  const cap = captionParts(text(m.querySelector('article figcaption span')));
  set('demo-laureate-2026-lorie-ballage', Object.fromEntries(Object.entries(cap).map(([k, v]) => [`images[0].${k}`, v])));
}

/* ---------- art prize · awards ---------- */
{
  const m = page('art-prize/awards');
  const ids = {
    'jury prize': 'demo-award-2026-1',
    'Ambassade de France en Belgique': 'demo-award-2026-2',
    'Centre Wallonie-Bruxelles | Paris': 'demo-award-2026-3',
    'Les Ateliers dans la Forêt': 'demo-award-2026-4',
    Keramis: 'demo-award-2026-5',
    'The Latvian Centre for Contemporary Ceramics': 'demo-award-2026-6',
    YXCCCA: 'demo-award-2026-7',
  };
  for (const a of m.querySelectorAll('article')) {
    const id = ids[text(a.querySelector('h2'))];
    if (!id) { console.warn(`  award not mapped: ${text(a.querySelector('h2'))}`); continue; }
    set(id, { 'description.en': blocks(a.querySelectorAll('p').filter((p) => !isMeta(p))) });
  }
}

/* ---------- partners · institutions ---------- */
{
  const m = page('partners/institutions');
  const ids = {
    'LOEWE FOUNDATION': 'demo-partner-loewe-foundation',
    'visit.brussels': 'demo-partner-visit-brussels',
    'Wallonia-Brussels International': 'demo-partner-wallonia-brussels-international',
    'Centre Wallonie-Bruxelles Paris': 'demo-partner-centre-wallonie-bruxelles-paris',
    'Syndicat des négociants en art': 'demo-partner-syndicat-des-negociants-en-art',
    // City of Brussels and Brussels-Capital Region carry a pasted art-shipper
    // paragraph in the design: placeholder, not copied.
  };
  for (const a of m.querySelectorAll('article')) {
    const id = ids[text(a.querySelector('h3'))];
    if (!id) continue;
    set(id, { 'description.en': blocks(a.querySelectorAll('p')) });
  }
}

/* ---------- visitors info · food & drinks ---------- */
{
  const m = page('visitors-info/food-drinks');
  set('demo-page-visit-food-drinks', { 'intro.en': text(m.querySelector('p')) });
  const ids = { 'Traiteur Benjamin': 'demo-partner-traiteur-benjamin', 'Fernand Obb': 'demo-partner-fernand-obb', Flora: 'demo-partner-flora', 'MOK COFFEE': 'demo-partner-mok-coffee' };
  for (const a of m.querySelectorAll('article')) {
    const id = ids[text(a.querySelector('h2')).replace(/\s*↗\s*$/, '')];
    if (!id) continue;
    set(id, { 'description.en': blocks(a.querySelectorAll('p').filter((p) => !isMeta(p))) });
  }
}

/* ---------- about · the fair ---------- */
{
  const m = page('about');
  set('demo-page-about-the-fair', {
    'sections[_key=="contentSection0"].body.en': blocks(after(headingIn(m, 'h2', 'the fair'))),
    'sections[_key=="contentSection2"].body.en': blocks(after(headingIn(m, 'h2', 'development'))),
  });
}

/* ---------- exhibitor · CHAxARTxRTM ---------- */
{
  const m = page('exhibitors/chaxartxrtm');
  const ps = m.querySelectorAll('article p').filter((p) => text(p).length > 100);
  set('demo-exhibitor-2027-chaxartxrtm', { 'bio.en': blocks(ps), 'images[0].caption': 'Tong Xindi & Shen Ting' });
}

/* ---------- exhibitor · ANALORA ---------- */
{
  const m = page('exhibitors/analora');
  const ps = m.querySelectorAll('article p').filter((p) => text(p).length > 100);
  set('demo-exhibitor-2027-analora', { 'bio.en': blocks(ps) });
}

/* ---------- programme · talks intro ---------- */
{
  const m = page('programme/talks');
  set('demo-page-programme-talks', { 'intro.en': text(m.querySelector('p')) });
}

/* ---------- visitors info · practical ---------- */
{
  const m = page('visitors-info');
  const ed = await client.fetch(`*[_id == "demo-edition-2027"][0]{ tickets[]{ _key, "n": name.en } }`);
  const notes = {
    'Reduction ticket': 'valid for students under 22 years old, job seekers, EU disability card holders',
    'Article 27': 'no advance booking possible, purchase at the ticket office upon presentation of the Article 27 voucher',
  };
  const f = {};
  for (const t of ed?.tickets ?? []) if (notes[t.n]) f[`tickets[_key=="${t._key}"].note.en`] = notes[t.n];
  if (Object.keys(f).length) set('demo-edition-2027', f);

  const hotel = m.querySelectorAll('h2').find((h) => /hotel deal/i.test(text(h)));
  const hotelText = text(after(hotel)[0]).replace(/^THE HOXTON\s*/i, '');
  const access = m.querySelectorAll('h2').find((h) => /^access$/i.test(text(h)));
  const modes = after(access).map((p) => {
    const raw = p.innerHTML.split(/<br[^>]*>/i).map((s) => text(parse(s)));
    const label = raw[0];
    const lines = raw.slice(1).filter(Boolean);
    return { label: label.charAt(0) + label.slice(1).toLowerCase(), text: lines.join('\n') };
  });
  const cur = await client.fetch(`*[_id == "siteSettings"][0].practicalInfo.access[]{ _key, "m": mode.en }`);
  const s = { 'practicalInfo.hotelDeal.text.en': hotelText };
  for (const md of modes) {
    const hit = (cur ?? []).find((a) => a.m?.toLowerCase() === md.label.toLowerCase());
    if (hit) s[`practicalInfo.access[_key=="${hit._key}"].text.en`] = md.text;
    else console.warn(`  no access row for ${md.label}`);
  }
  set('siteSettings', s);
}

/* ---------- write ---------- */

console.log(`${patches.length} documents:`);
for (const p of patches) report(p.id, p.fields);
if (dry) {
  for (const p of patches) {
    for (const [k, v] of Object.entries(p.fields)) {
      const preview = Array.isArray(v) ? v.map((b) => b.children.map((c) => c.text).join('')).join(' ¶ ') : String(v);
      console.log(`    ${p.id} ${k}\n      ${preview.slice(0, 220)}${preview.length > 220 ? '…' : ''}`);
    }
  }
  console.log('\ndry run, nothing written');
  process.exit(0);
}
let tx = client.transaction();
for (const p of patches) tx = tx.patch(p.id, (x) => x.set(p.fields));
const res = await tx.commit();
console.log(`committed ${res.results?.length ?? 0} mutations`);
