#!/usr/bin/env node
/**
 * Repairs the programme events the first legacy import filed under 2027.
 *
 * The old site's "programme" page was the 2026 programme when it was
 * captured: its day headings run "wed 21 jan" to "sun 25 jan", the 2026
 * dates. The importer took the page for the coming edition, so those
 * events sit on 2027 with no date and no section - and never render.
 *
 * This walks the captured page in block order, so every event gets the
 * last day heading above it (the empty "talks" / "awards ceremony" headings
 * keep the day and change the section), and patches each matching document:
 * edition 2026, start and end, section, kind, a title without the
 * "[ARTIST TALK]:" prefix, and the moderator / speakers / language /
 * location the description carries. Re-runnable: it only ever sets fields.
 *
 *   node scripts/fix-programme-2026.mjs --dry
 *   node scripts/fix-programme-2026.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const dry = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
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

const YEAR = 2026;
const TZ = '+01:00'; // Brussels in January
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (o) => (o && (o.en ?? o.fr ?? o.nl)) ?? '';

/* ---------- the captured page, walked in order ---------- */

const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'legacy-export/normalized/pages.json'), 'utf8'));
const page = (Array.isArray(pages) ? pages : Object.values(pages)).find((p) => p.id === 69 && p.module === 'pages');
if (!page) throw new Error('programme page (id 69) not found in legacy-export/normalized/pages.json');

const byBlock = new Map(); // blockId -> { day: 'YYYY-MM-DD', sub, invitation }
let day = null;
let sub = '';
let invitation = false;
for (const b of page.blocks) {
  if (b.type === 'title') {
    const t = pick(b.title);
    const s = pick(b.subtitle);
    const dm = t.match(/(\d{1,2})\s*([a-z]{3})/i);
    if (dm && MONTHS[dm[2].toLowerCase()]) {
      day = `${YEAR}-${String(MONTHS[dm[2].toLowerCase()]).padStart(2, '0')}-${String(dm[1]).padStart(2, '0')}`;
      invitation = /invitation|uitnodiging/i.test(t);
      sub = s || '';
    } else if (s) {
      sub = s;
    }
  } else if (b.type === 'event') {
    byBlock.set(b.id, { day, sub, invitation, start: b.start_hour, end: b.end_hour });
  }
}

/* ---------- what each event becomes ---------- */

const sectionOf = (sub, title) => {
  if (/talk/i.test(sub)) return 'talks';
  if (/award/i.test(sub)) return 'awards';
  if (/^(preview|vernissage)$/i.test(title)) return 'vip';
  return null; // public opening: opening hours, not a programme item
};
const kindOf = (sub, title) => {
  if (/^\[?artist talk/i.test(title)) return 'artist-talk';
  if (/^\[?roundtable/i.test(title)) return 'roundtable';
  if (/^\[?book launch/i.test(title)) return 'book-launch';
  if (/award/i.test(sub)) return 'ceremony';
  if (/^(preview|vernissage|public opening)$/i.test(title)) return 'opening';
  if (/talk/i.test(sub)) return 'talk';
  return null;
};
const cleanTitle = (t) => {
  const raw = strip(t);
  const bare = raw.replace(/^\[[^\]]*\]\s*:?\s*/, '').replace(/^\s*:\s*/, '').trim();
  // "[BOOK LAUNCH]" on its own: the bracket was the whole title.
  const s = bare || raw.replace(/[\[\]]/g, '').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const at = (dayIso, hhmm) => {
  if (!dayIso || !hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  return `${dayIso}T${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00${TZ}`;
};
const names = (s) =>
  strip(s).replace(/\s*\([^)]*\)/g, '').split(/\s*(?:,|&|\band\b)\s*/).map((x) => x.trim()).filter(Boolean);

/** moderator / speakers / language / location lines out of the description HTML. */
function meta(html) {
  const out = {};
  for (const line of String(html ?? '').split(/<\/p>|<br\s*\/?>/i).map(strip).filter(Boolean)) {
    const m = line.match(/^(moderator|moderatrice|speakers?|intervenants?|language|langue|location|lieu)\s*:\s*(.+)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k.startsWith('moder')) out.moderator = names(v)[0] ?? v;
    // "speaker: Elmar Trenkwalder (AT), Guest of Honour artist…" — one
    // person followed by a description; "speakers:" is a real list.
    else if (k === 'speaker' || k === 'intervenant') out.speakers = names(v).slice(0, 1);
    else if (k.startsWith('speaker') || k.startsWith('interven')) out.speakers = names(v);
    else if (k === 'language' || k === 'langue') out.languages = v.split(/\s*[\/,]\s*/).map((x) => x.toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
    else if (k === 'location' || k === 'lieu') out.location = v;
  }
  return out;
}

/* ---------- derived events in import order, matched to documents ---------- */

const derived = JSON.parse(fs.readFileSync(path.join(ROOT, 'legacy-export/derived/events.json'), 'utf8'));
const fromProgramme = (Array.isArray(derived) ? derived : Object.values(derived).flat()).filter((e) => e.title && e.fromPage === 'programme' && e.pageId === 69);

const docs = await client.fetch(
  `*[_type == "programmeEvent" && edition->year in [2026, 2027]]{ _id, "title": title.en, startsAt, section, "year": edition->year }`,
);
const ed2026 = await client.fetch(`*[_type == "edition" && year == 2026][0]._id`);
if (!ed2026) throw new Error('no 2026 edition document');

const used = new Set();
const findDoc = (title) => {
  const t = strip(title).toLowerCase();
  const hits = docs
    .filter((d) => !used.has(d._id) && strip(d.title).toLowerCase() === t)
    // imported ids carry the running index; the seeded demo ones come last
    .sort((a, b) => (a._id.startsWith('demo-') ? 1 : 0) - (b._id.startsWith('demo-') ? 1 : 0) || a._id.localeCompare(b._id));
  return hits[0] ?? null;
};

const patches = [];
const creates = [];
let unmatched = 0;
for (const e of fromProgramme) {
  const b = byBlock.get(e.blockId);
  if (!b || !b.day) { console.warn(`no day for block ${e.blockId}: ${strip(e.title)}`); continue; }
  const title = cleanTitle(e.title);
  const m = meta(e.description?.en ?? e.description?.fr ?? '');
  const set = {
    edition: { _type: 'reference', _ref: ed2026 },
    startsAt: at(b.day, b.start),
    endsAt: at(b.day, b.end),
    section: sectionOf(b.sub, strip(e.title)),
    kind: kindOf(b.sub, strip(e.title)),
    'title.en': title,
    invitationOnly: b.invitation || null,
    ...(m.moderator ? { moderator: m.moderator } : {}),
    ...(m.speakers?.length ? { 'speakersText.en': `with ${[m.moderator, ...m.speakers].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' & $1')}` } : {}),
    ...(m.languages?.length ? { languages: m.languages } : {}),
    ...(m.location ? { 'location.en': m.location } : {}),
  };
  for (const k of Object.keys(set)) if (set[k] === null || set[k] === undefined) delete set[k];

  const doc = findDoc(e.title);
  if (doc && doc._id.startsWith('demo-event-2027-')) {
    // A seeded 2027 placeholder the importer overwrote with the 2026 day.
    // Leave it to 2027 (its date is restored below) and give 2026 its own.
    used.add(doc._id);
    creates.push({ _id: `event-2026-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`, _type: 'programmeEvent', title: { en: title }, slug: { _type: 'slug', current: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) }, ...unflatten(set) });
    continue;
  }
  if (!doc) { unmatched++; console.warn(`no document for: ${strip(e.title)}`); continue; }
  used.add(doc._id);
  patches.push({ id: doc._id, was: `${doc.year} ${doc.startsAt ?? '(no date)'} ${doc.section ?? '-'}`, set });
}

/** 'title.en' style keys into nested objects, for a create. */
function unflatten(flat) {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let o = out;
    for (const p of parts.slice(0, -1)) o = o[p] ??= {};
    o[parts[parts.length - 1]] = v;
  }
  return out;
}

/* The seeded 2027 preview and vernissage: back onto the 2027 opening day. */
const restore = [
  { id: 'demo-event-2027-6', set: { startsAt: `2027-01-20T14:00:00${TZ}`, endsAt: `2027-01-20T17:00:00${TZ}` } },
  { id: 'demo-event-2027-7', set: { startsAt: `2027-01-20T17:00:00${TZ}`, endsAt: `2027-01-20T21:00:00${TZ}` } },
].filter((r) => docs.some((d) => d._id === r.id));

/* ---------- report and write ---------- */

console.log(`${fromProgramme.length} events on the captured programme page; ${patches.length} documents to patch, ${creates.length} to create, ${restore.length} seeded dates to restore, ${unmatched} unmatched\n`);
for (const p of patches) console.log(`  ${p.id}\n     was ${p.was}\n     now ${p.set.startsAt ?? '-'} ${p.set.section ?? '-'} ${p.set.kind ?? '-'} · ${p.set['title.en']}${p.set['speakersText.en'] ? `\n     ${p.set['speakersText.en']}` : ''}`);
for (const c of creates) console.log(`  + ${c._id}  ${c.startsAt} ${c.section ?? '-'}`);
for (const r of restore) console.log(`  ~ ${r.id}  ${r.set.startsAt}`);

if (dry) { console.log('\ndry run, nothing written'); process.exit(0); }
let tx = client.transaction();
for (const p of patches) tx = tx.patch(p.id, (x) => x.set(p.set));
for (const c of creates) tx = tx.createOrReplace(c);
for (const r of restore) tx = tx.patch(r.id, (x) => x.set(r.set));
const res = await tx.commit();
console.log(`\ncommitted ${res.results?.length ?? 0} mutations`);
