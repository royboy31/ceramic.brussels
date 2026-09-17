#!/usr/bin/env node
/**
 * The VIP guest list (docs/vip-access.md), in the D1 database the site's
 * Worker reads.
 *
 *   npm run vip -- --import guests.csv [--out guests-with-codes.csv]
 *       Reads the team's spreadsheet - columns first name, last name, email,
 *       institution, function (any order, any case, French or Dutch
 *       headings accepted) - creates or updates one guest per email, and
 *       writes the same rows back with a `code` column for the invitation
 *       mailing. Re-running with the same sheet changes nothing; a guest
 *       already in the list keeps their code.
 *   npm run vip -- --export [--out guests-with-codes.csv]
 *       The whole list with codes, as it stands.
 *   npm run vip -- --revoke a@b.c      the code stops working, sessions end
 *   npm run vip -- --restore a@b.c     the same code works again
 *   npm run vip -- --reissue a@b.c     a new code; the old one stops working
 *   npm run vip -- --set hotel_code=CERAMIC27   a value the site reads from D1
 *   npm run vip -- --get hotel_code
 *   npm run vip -- --stats             counts, entries, last entries
 *
 * How a code is made. The code is never stored: the database holds the
 * SHA-256 of `<pepper>:<code>`, where the pepper is VIP_CODE_PEPPER in
 * `.env` here and the Pages secret of the same name on the Worker - they
 * must be the same value. The code itself is derived, not drawn:
 * `CB27-<FIRST NAME>-<6 characters>`, the six from an HMAC of the guest's
 * email and their `code_version` with the same pepper. That is what lets a
 * re-run reproduce every code, `--export` print them, and `--reissue` make
 * a different one by bumping the version, all without keeping a code
 * anywhere in the clear.
 *
 * Talks to Cloudflare through wrangler (signed in; the account id below
 * picks the studio's account). D1 for the guests, KV for the sessions a
 * revocation must end.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ACCOUNT_ID = '68abcbaf4817943a805737802e15679a';
const DATABASE = 'ceramic-brussels-admin';
const KV_NAMESPACE_ID = '5155f6c4aed24d8f82341a81f96cb005';
const PREFIX = 'CB27';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, no 1/I

/* ---------------------------------------------------------------- args */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};

function readEnv() {
  const out = {};
  if (!fs.existsSync('.env')) return out;
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...readEnv(), ...process.env };
const PEPPER = env.VIP_CODE_PEPPER;
if (!PEPPER || PEPPER.length < 16) {
  console.error('VIP_CODE_PEPPER is missing from .env (at least 16 characters; the same value as the Pages secret).');
  process.exit(1);
}

/* --------------------------------------------------------------- codes */

const normalise = (code) => String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
const codeHash = (code) => crypto.createHash('sha256').update(`${PEPPER}:${normalise(code)}`).digest('hex');
const guestId = (email) => crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 20);

/** "Émilie-Louise" → "EMILIELOUISE"; nothing usable → "VIP". */
function namePart(firstName) {
  const ascii = String(firstName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 10);
  return ascii || 'VIP';
}

function makeCode(firstName, email, version) {
  const mac = crypto.createHmac('sha256', PEPPER).update(`${email.trim().toLowerCase()}:${version}`).digest();
  let tail = '';
  for (let i = 0; i < 6; i++) tail += ALPHABET[mac[i] % ALPHABET.length];
  return `${PREFIX}-${namePart(firstName)}-${tail}`;
}

/* ------------------------------------------------------------ wrangler */

/** wrangler's own entry point, run with this Node: no shell, so arguments pass through untouched on Windows too. */
const WRANGLER = path.resolve('node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(args, { json = false } = {}) {
  const result = spawnSync(process.execPath, [WRANGLER, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID },
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`wrangler ${args.slice(0, 3).join(' ')} failed`);
  }
  if (!json) return result.stdout;
  // wrangler prints its banner before the JSON; the JSON starts at the first bracket.
  const start = result.stdout.search(/[[{]/);
  return JSON.parse(result.stdout.slice(start));
}

const sql = (text) => text.replace(/'/g, "''");
const q = (v) => (v == null ? 'NULL' : `'${sql(String(v))}'`);

/**
 * Runs SQL against the remote database. A single statement goes as a
 * command, which answers with its rows; a batch goes through a file, which
 * wrangler uploads and answers with a summary only - fine for writes.
 */
function d1(statements) {
  if (!Array.isArray(statements)) {
    return wrangler(['d1', 'execute', DATABASE, '--remote', '--json', '--command', statements], { json: true });
  }
  const file = path.join(os.tmpdir(), `vip-${Date.now()}.sql`);
  fs.writeFileSync(file, statements.join('\n'));
  try {
    return wrangler(['d1', 'execute', DATABASE, '--remote', '--json', '--file', file], { json: true });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

const rows = (out) => out?.[0]?.results ?? [];

function allGuests() {
  return rows(
    d1(
      'SELECT id, code_version, first_name, last_name, email, institution, function, revoked, entries, last_entry_at, created_at FROM guests ORDER BY last_name, first_name',
    ),
  );
}

/** Ends every session of a guest: their keys share a prefix in KV. */
function endSessions(id) {
  const listed = wrangler(['kv', 'key', 'list', '--namespace-id', KV_NAMESPACE_ID, '--prefix', `s:${id}:`], { json: true });
  const keys = listed.map((k) => k.name);
  if (!keys.length) return 0;
  const file = path.join(os.tmpdir(), `vip-keys-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(keys));
  try {
    wrangler(['kv', 'bulk', 'delete', '--namespace-id', KV_NAMESPACE_ID, '--force', file]);
  } finally {
    fs.rmSync(file, { force: true });
  }
  return keys.length;
}

/* ----------------------------------------------------------------- csv */

function parseCsv(text) {
  const lines = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      lines.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), lines.push(row);
  return lines.filter((r) => r.some((v) => v.trim()));
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, data) => [header, ...data].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

/** Which column is which, from the heading, in the three languages the team writes. */
const COLUMNS = {
  firstName: /^(first\s*name|firstname|prenom|prénom|voornaam|first)$/i,
  lastName: /^(last\s*name|lastname|surname|name|nom|naam|achternaam|last|family\s*name)$/i,
  email: /^(e-?mail|email\s*address|adresse\s*e-?mail|courriel|mail)$/i,
  institution: /^(institution|organisation|organization|company|gallery|galerie|instelling|organisatie|société|societe)$/i,
  function: /^(function|fonction|functie|role|title|job\s*title|position)$/i,
};

function readSheet(file) {
  const [header, ...data] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const index = {};
  header.forEach((h, i) => {
    const key = Object.keys(COLUMNS).find((k) => COLUMNS[k].test(h.trim()));
    if (key && index[key] === undefined) index[key] = i;
  });
  for (const k of ['firstName', 'lastName', 'email']) {
    if (index[k] === undefined) throw new Error(`No "${k}" column in ${file}. Headings seen: ${header.join(' | ')}`);
  }
  const get = (r, k) => (index[k] === undefined ? '' : (r[index[k]] ?? '').trim());
  return data
    .map((r) => ({
      firstName: get(r, 'firstName'),
      lastName: get(r, 'lastName'),
      email: get(r, 'email').toLowerCase(),
      institution: get(r, 'institution'),
      function: get(r, 'function'),
    }))
    .filter((g) => g.email);
}

/* ------------------------------------------------------------ commands */

const now = () => new Date().toISOString();

function importSheet(file) {
  const sheet = readSheet(file);
  const bad = sheet.filter((g) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email) || !g.firstName || !g.lastName);
  if (bad.length) {
    console.error(`${bad.length} row(s) without a first name, last name or a valid email:`);
    for (const g of bad.slice(0, 10)) console.error('  ', JSON.stringify(g));
    process.exit(1);
  }
  const seen = new Set();
  const dupes = sheet.filter((g) => (seen.has(g.email) ? true : (seen.add(g.email), false)));
  if (dupes.length) {
    console.error(`${dupes.length} email(s) appear twice in the sheet: ${dupes.map((g) => g.email).slice(0, 10).join(', ')}`);
    process.exit(1);
  }

  const existing = new Map(allGuests().map((g) => [g.id, g]));
  const stamp = now();
  const statements = [];
  const out = [];
  let created = 0;
  let updated = 0;
  for (const g of sheet) {
    const id = guestId(g.email);
    const version = existing.get(id)?.code_version ?? 1;
    const code = makeCode(g.firstName, g.email, version);
    statements.push(
      `INSERT INTO guests (id, code_hash, code_version, first_name, last_name, email, institution, function, created_at, updated_at)
       VALUES (${q(id)}, ${q(codeHash(code))}, ${version}, ${q(g.firstName)}, ${q(g.lastName)}, ${q(g.email)}, ${q(g.institution || null)}, ${q(g.function || null)}, ${q(stamp)}, ${q(stamp)})
       ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name, institution = excluded.institution, function = excluded.function, updated_at = excluded.updated_at;`,
    );
    existing.has(id) ? updated++ : created++;
    out.push([g.firstName, g.lastName, g.email, g.institution, g.function, code]);
  }
  // In batches: one statement per row, a few hundred rows per call.
  for (let i = 0; i < statements.length; i += 300) d1(statements.slice(i, i + 300));

  const outFile = value('out') ?? file.replace(/\.csv$/i, '') + '-with-codes.csv';
  fs.writeFileSync(outFile, toCsv(['first name', 'last name', 'email', 'institution', 'function', 'code'], out));
  console.log(`${created} guest(s) created, ${updated} updated. Codes written to ${outFile} - keep that file private.`);
}

function exportList() {
  const guests = allGuests();
  const outFile = value('out') ?? 'guests-with-codes.csv';
  fs.writeFileSync(
    outFile,
    toCsv(
      ['first name', 'last name', 'email', 'institution', 'function', 'code', 'revoked', 'entries', 'last entry'],
      guests.map((g) => [
        g.first_name,
        g.last_name,
        g.email,
        g.institution,
        g.function,
        g.revoked ? '' : makeCode(g.first_name, g.email, g.code_version),
        g.revoked ? 'yes' : '',
        g.entries,
        g.last_entry_at ?? '',
      ]),
    ),
  );
  console.log(`${guests.length} guest(s) written to ${outFile} - keep that file private.`);
}

function findGuest(email) {
  const id = guestId(email);
  const [g] = rows(d1(`SELECT id, code_version, first_name, last_name, email, revoked FROM guests WHERE id = ${q(id)}`));
  if (!g) {
    console.error(`No guest with the email ${email}.`);
    process.exit(1);
  }
  return g;
}

function revoke(email, revoked) {
  const g = findGuest(email);
  d1(`UPDATE guests SET revoked = ${revoked ? 1 : 0}, updated_at = ${q(now())} WHERE id = ${q(g.id)};`);
  const ended = revoked ? endSessions(g.id) : 0;
  console.log(`${g.first_name} ${g.last_name}: ${revoked ? `revoked, ${ended} session(s) ended` : 'restored'}.`);
}

function reissue(email) {
  const g = findGuest(email);
  const version = Number(g.code_version) + 1;
  const code = makeCode(g.first_name, g.email, version);
  d1(`UPDATE guests SET code_version = ${version}, code_hash = ${q(codeHash(code))}, revoked = 0, updated_at = ${q(now())} WHERE id = ${q(g.id)};`);
  const ended = endSessions(g.id);
  console.log(`${g.first_name} ${g.last_name}: new code ${code} (${ended} session(s) ended). The old one no longer works.`);
}

function setSetting(pair) {
  const at = pair.indexOf('=');
  if (at <= 0) throw new Error('--set needs key=value');
  const key = pair.slice(0, at).trim();
  const val = pair.slice(at + 1);
  d1(`INSERT INTO settings (key, value, updated_at) VALUES (${q(key)}, ${q(val)}, ${q(now())}) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`);
  console.log(`${key} set.`);
}

function getSetting(key) {
  const [row] = rows(d1(`SELECT value, updated_at FROM settings WHERE key = ${q(key)}`));
  console.log(row ? `${key} = ${row.value} (set ${row.updated_at})` : `${key} is not set.`);
}

function stats() {
  const [s] = rows(
    d1(
      `SELECT COUNT(*) AS guests, SUM(revoked) AS revoked, SUM(CASE WHEN entries > 0 THEN 1 ELSE 0 END) AS entered, SUM(entries) AS entries, MAX(last_entry_at) AS last_entry FROM guests`,
    ),
  );
  console.log(`${s.guests} guest(s), ${s.revoked ?? 0} revoked, ${s.entered ?? 0} have entered a code (${s.entries ?? 0} entries in all), last entry ${s.last_entry ?? 'never'}.`);
}

/* ---------------------------------------------------------------- main */

try {
  if (value('import')) importSheet(value('import'));
  else if (flag('export')) exportList();
  else if (value('revoke')) revoke(value('revoke'), true);
  else if (value('restore')) revoke(value('restore'), false);
  else if (value('reissue')) reissue(value('reissue'));
  else if (value('set')) setSetting(value('set'));
  else if (value('get')) getSetting(value('get'));
  else if (flag('stats')) stats();
  else {
    console.log('Usage: npm run vip -- --import guests.csv | --export | --revoke email | --restore email | --reissue email | --set key=value | --get key | --stats');
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
