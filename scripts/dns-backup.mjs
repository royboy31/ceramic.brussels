#!/usr/bin/env node
/**
 * A full backup of the ceramic.brussels Cloudflare zone, taken before the
 * cutover of 2026-10-05 and re-runnable afterwards.
 *
 *     node scripts/dns-backup.mjs            # into legacy-export/dns/
 *     node scripts/dns-backup.mjs --label after-cutover
 *
 * Why a script and not a dashboard click: the dashboard's "Export records"
 * gives the BIND zone file, which is the thing you need to put a record back,
 * but it leaves out everything *around* the records - whether a record is
 * proxied (the orange cloud), the zone's SSL mode, the redirect rules. A
 * rollback that restores the addresses and forgets that `www` was proxied
 * brings the site back with a broken certificate. So this takes all of it:
 *
 *   - the zone file (what the dashboard exports), for a literal restore;
 *   - every record as JSON, including `proxied`, `ttl` and the record id;
 *   - the zone settings (SSL mode, Always Use HTTPS, minification, ...);
 *   - page rules and the rule phases that hold redirect/transform rules.
 *
 * It needs a **read-only** API token in `.env` as `CLOUDFLARE_ZONE_READ_TOKEN`
 * (Zone · DNS · Read + Zone · Zone Settings · Read, scoped to this one zone).
 * Nothing here writes to Cloudflare; the token can be revoked the moment the
 * backup is in the repo. A missing permission is reported and skipped rather
 * than failing the run, so a token with only DNS·Read still produces the two
 * files that matter.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'legacy-export', 'dns');
const ZONE_NAME = 'ceramic.brussels';
const API = 'https://api.cloudflare.com/client/v4';

const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : new Date().toISOString().slice(0, 10);

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);

const token = env.CLOUDFLARE_ZONE_READ_TOKEN || process.env.CLOUDFLARE_ZONE_READ_TOKEN;
if (!token) {
  console.error('[dns-backup] no CLOUDFLARE_ZONE_READ_TOKEN in .env.');
  console.error('             Create one at dash.cloudflare.com → My Profile → API Tokens:');
  console.error('             Zone · DNS · Read and Zone · Zone Settings · Read, zone resources = ceramic.brussels.');
  process.exit(1);
}

/** A GET against the API. `text` for the zone file, which is not JSON. */
async function get(url, { text = false } = {}) {
  const res = await fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = text ? await res.text() : await res.json();
  if (text) return res.ok ? { ok: true, body } : { ok: false, error: `HTTP ${res.status}` };
  if (!body.success) {
    const message = (body.errors || []).map((e) => `${e.code} ${e.message}`).join('; ') || `HTTP ${res.status}`;
    return { ok: false, error: message };
  }
  return { ok: true, body: body.result, info: body.result_info };
}

function write(name, contents) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, contents, 'utf8');
  console.log(`  wrote legacy-export/dns/${name} (${(Buffer.byteLength(contents) / 1024).toFixed(1)} kB)`);
}

const zones = await get(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
if (!zones.ok) {
  console.error(`[dns-backup] could not read the zone: ${zones.error}`);
  process.exit(1);
}
const zone = zones.body[0];
if (!zone) {
  console.error(`[dns-backup] no zone called ${ZONE_NAME} on this token's account.`);
  process.exit(1);
}

console.log(`[dns-backup] ${zone.name} · zone ${zone.id} · ${zone.status} · account ${zone.account?.name ?? zone.account?.id}`);
console.log(`             name servers: ${(zone.name_servers || []).join(', ')}`);

/* 1. The zone file - the one artefact a restore can be driven from. */
const zoneFile = await get(`/zones/${zone.id}/dns_records/export`, { text: true });
if (zoneFile.ok) write(`zone-export-${label}.txt`, zoneFile.body);
else console.log(`  (zone file unavailable: ${zoneFile.error})`);

/* 2. Every record, with the proxy flag the zone file cannot carry. */
const records = [];
for (let page = 1; ; page += 1) {
  const res = await get(`/zones/${zone.id}/dns_records?per_page=100&page=${page}`);
  if (!res.ok) {
    console.log(`  (records unavailable: ${res.error})`);
    break;
  }
  records.push(...res.body);
  if (!res.info || page >= res.info.total_pages) break;
}

/* 3. Zone settings, page rules, and the rule phases. Each is optional: a
      token scoped to DNS alone simply reports them as unavailable. */
const extras = {};
for (const [key, url] of [
  ['settings', `/zones/${zone.id}/settings`],
  ['pageRules', `/zones/${zone.id}/pagerules`],
  ['rulesets', `/zones/${zone.id}/rulesets`],
]) {
  const res = await get(url);
  extras[key] = res.ok ? res.body : { unavailable: res.error };
  if (!res.ok) console.log(`  (${key} unavailable: ${res.error})`);
}

/* The redirect and transform rules live inside their phase entrypoints, which
   are a second call each. They are what sends the apex to www after the
   cutover, so they belong in the backup. */
extras.phases = {};
if (Array.isArray(extras.rulesets)) {
  for (const ruleset of extras.rulesets.filter((r) => r.kind === 'zone')) {
    const res = await get(`/zones/${zone.id}/rulesets/${ruleset.id}`);
    extras.phases[ruleset.phase] = res.ok ? res.body : { unavailable: res.error };
  }
}

write(
  `dns-records-${label}.json`,
  JSON.stringify(
    {
      takenAt: new Date().toISOString(),
      zone: {
        id: zone.id,
        name: zone.name,
        status: zone.status,
        paused: zone.paused,
        type: zone.type,
        nameServers: zone.name_servers,
        originalNameServers: zone.original_name_servers,
        account: zone.account,
        plan: zone.plan?.name,
      },
      records: records.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.content,
        priority: r.priority,
        ttl: r.ttl,
        proxied: r.proxied,
        comment: r.comment,
        tags: r.tags,
        modifiedOn: r.modified_on,
      })),
      ...extras,
    },
    null,
    2,
  ),
);

/* A table for human eyes, and the two lines a rollback actually needs. */
const table = records
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type))
  .map((r) => `${r.type.padEnd(6)} ${r.name.padEnd(38)} ${String(r.ttl === 1 ? 'auto' : r.ttl).padStart(5)}  ${r.proxied ? 'proxied' : '  dns  '}  ${r.content}${r.priority != null ? ` (prio ${r.priority})` : ''}`)
  .join('\n');

const sslMode = Array.isArray(extras.settings) ? extras.settings.find((s) => s.id === 'ssl')?.value : '(unavailable)';
const alwaysHttps = Array.isArray(extras.settings) ? extras.settings.find((s) => s.id === 'always_use_https')?.value : '(unavailable)';

write(
  `dns-records-${label}.txt`,
  [
    `# ${zone.name} — every DNS record as it stood on ${new Date().toISOString()}`,
    `# zone ${zone.id} · plan ${zone.plan?.name} · SSL mode ${sslMode} · Always Use HTTPS ${alwaysHttps}`,
    '#',
    '# "proxied" is the orange cloud: the record answers with Cloudflare addresses',
    '# and the content below is the origin behind it. Restoring a record means',
    '# restoring this flag too, or the site comes back without a certificate.',
    '',
    table,
    '',
    `# ${records.length} records`,
  ].join('\n'),
);

const hosts = records.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type) && (r.name === zone.name || r.name === `www.${zone.name}`));
console.log('\n[dns-backup] the records the cutover replaces:');
for (const r of hosts) console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(26)} ${r.proxied ? 'proxied' : 'dns only'}  →  ${r.content}`);
console.log(`\n[dns-backup] ${records.length} records, SSL mode "${sslMode}", Always Use HTTPS ${alwaysHttps}.`);
console.log('             Pages needs SSL mode Full or Full (strict); Flexible loops a custom domain.');
