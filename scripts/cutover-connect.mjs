#!/usr/bin/env node
/**
 * The cutover of 2026-10-05, as three API calls instead of a tour of the
 * dashboard: attach `www.ceramic.brussels` to the Pages project, make `www`
 * resolve to it, and send the apex there with a 301.
 *
 *     node scripts/cutover-connect.mjs              # plan only, changes nothing
 *     node scripts/cutover-connect.mjs --apply
 *     node scripts/cutover-connect.mjs --rollback   # put the Twill records back
 *
 * It needs a write token in `.env` as `CLOUDFLARE_ZONE_WRITE_TOKEN`:
 *
 *     Account · Cloudflare Pages · Edit      (attach the custom domain)
 *     Zone · Zone · Read                     (find the zone by name)
 *     Zone · DNS · Edit                      (the www record)
 *     Zone · Single Redirect · Edit          (the apex 301; the row is called
 *                                             "Dynamic URL Redirects" on older accounts)
 *     Zone · Page Rules · Edit               (optional: the same 301 the old way,
 *                                             if neither row is on the token's list)
 *     Zone Resources: ceramic.brussels
 *
 * The apex redirect is tried as a Single Redirect first - rulesets are where
 * Cloudflare puts new work, and the rule is visible under Rules → Redirect
 * Rules. If the token cannot write rulesets, the same 301 is written as a
 * legacy Page Rule (`ceramic.brussels/*` → forwarding URL), which every
 * account has and which does the job identically. Either way `--rollback`
 * finds and removes whichever one was made.
 *
 * Why `www` serves and the apex redirects, and not the other way round: every
 * page Google has indexed is a `www.ceramic.brussels/…` URL, the old site's
 * robots.txt named `www`, and all 561 generated redirect rules are checked
 * against `www`.
 *
 * What it deliberately does **not** touch: the apex's own A/AAAA records. A
 * redirect rule answers at the edge before any origin is fetched, so the apex
 * never reaches the Twill server even while its records still point there -
 * and leaving them in place makes the rollback a rule toggle rather than a
 * re-creation. Mail (Microsoft 365 MX, SPF), Brevo's DKIM, Mailchimp's DKIM and
 * the Search Console verification TXT are never read, let alone written.
 *
 * The state it replaces is in `legacy-export/dns/` - take a fresh copy with
 * `node scripts/dns-backup.mjs --label after-cutover` once this has run.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT = '68abcbaf4817943a805737802e15679a';
const PROJECT = 'ceramic-brussels';
const ZONE_NAME = 'ceramic.brussels';
const HOST = `www.${ZONE_NAME}`;
const TARGET = `${PROJECT}.pages.dev`;
const RULE_DESCRIPTION = 'apex to www (cutover 2026-10-05)';

/** The records the apex and www held before the cutover, for --rollback. */
const TWILL = {
  a: '45.157.189.111',
  aaaa: '2001:1600:4:9:f816:3eff:fe14:9a8',
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rollback = args.includes('--rollback');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);

const token = env.CLOUDFLARE_ZONE_WRITE_TOKEN || process.env.CLOUDFLARE_ZONE_WRITE_TOKEN;
if (!token) {
  console.error('[cutover] no CLOUDFLARE_ZONE_WRITE_TOKEN in .env - see the header of this file for the scopes.');
  process.exit(1);
}

async function call(method, url, body) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const message = (json.errors || []).map((e) => `${e.code} ${e.message}`).join('; ') || `HTTP ${res.status}`;
    return { ok: false, error: message, raw: json };
  }
  return { ok: true, body: json.result };
}

const plan = [];
const step = (what, run) => plan.push({ what, run });

const zones = await call('GET', `/zones?name=${encodeURIComponent(ZONE_NAME)}`);
if (!zones.ok) {
  console.error(`[cutover] cannot read the zone: ${zones.error}`);
  process.exit(1);
}
const zone = zones.body[0];
console.log(`[cutover] zone ${zone.name} (${zone.id}), project ${PROJECT}, account ${ACCOUNT}`);

const dns = await call('GET', `/zones/${zone.id}/dns_records?per_page=100`);
if (!dns.ok) {
  console.error(`[cutover] cannot read the records: ${dns.error}`);
  process.exit(1);
}
const at = (name, type) => dns.body.find((r) => r.name === name && r.type === type);

if (rollback) {
  /* Back to Twill: the CNAME goes, the two addresses come back proxied, and the
     redirect rule is removed. The apex records were never touched. */
  const cname = at(HOST, 'CNAME');
  if (cname) step(`delete CNAME ${HOST} → ${cname.content}`, () => call('DELETE', `/zones/${zone.id}/dns_records/${cname.id}`));
  if (!at(HOST, 'A')) step(`re-create A ${HOST} → ${TWILL.a} (proxied)`, () => call('POST', `/zones/${zone.id}/dns_records`, { type: 'A', name: HOST, content: TWILL.a, ttl: 1, proxied: true }));
  if (!at(HOST, 'AAAA')) step(`re-create AAAA ${HOST} → ${TWILL.aaaa} (proxied)`, () => call('POST', `/zones/${zone.id}/dns_records`, { type: 'AAAA', name: HOST, content: TWILL.aaaa, ttl: 1, proxied: true }));
} else {
  /* 1. The Pages custom domain. With the zone on the same account Cloudflare
        usually writes the DNS record itself; step 2 checks and fills in. */
  const domains = await call('GET', `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`);
  const attached = domains.ok && domains.body.some((d) => d.name === HOST);
  if (attached) console.log(`  already attached: ${HOST}`);
  else step(`attach ${HOST} to the Pages project ${PROJECT}`, () => call('POST', `/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, { name: HOST }));

  /* 2. www must be a CNAME at the Pages project. The AAAA goes first, so www
        never stops resolving: the A record keeps answering until the moment it
        becomes the CNAME. A CNAME cannot coexist with an A or AAAA. */
  const cname = at(HOST, 'CNAME');
  const a = at(HOST, 'A');
  const aaaa = at(HOST, 'AAAA');
  if (cname && cname.content === TARGET) {
    console.log(`  already pointed: CNAME ${HOST} → ${TARGET}`);
  } else {
    if (aaaa) step(`delete AAAA ${HOST} → ${aaaa.content} (the A record keeps www up)`, () => call('DELETE', `/zones/${zone.id}/dns_records/${aaaa.id}`));
    if (a) step(`turn A ${HOST} → ${a.content} into CNAME → ${TARGET} (proxied)`, () => call('PUT', `/zones/${zone.id}/dns_records/${a.id}`, { type: 'CNAME', name: HOST, content: TARGET, ttl: 1, proxied: true }));
    else if (!cname) step(`create CNAME ${HOST} → ${TARGET} (proxied)`, () => call('POST', `/zones/${zone.id}/dns_records`, { type: 'CNAME', name: HOST, content: TARGET, ttl: 1, proxied: true }));
    else step(`repoint CNAME ${HOST} → ${TARGET}`, () => call('PUT', `/zones/${zone.id}/dns_records/${cname.id}`, { type: 'CNAME', name: HOST, content: TARGET, ttl: 1, proxied: true }));
  }
}

/* 3. The apex redirect. The dynamic-redirect phase is read first and the rule
      appended, because a PUT to a phase entrypoint replaces every rule in it -
      writing one rule blind would delete any other the zone already has. */
const phase = await call('GET', `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
const existing = phase.ok ? phase.body.rules || [] : [];
if (!phase.ok && !/not found|10000|does not exist/i.test(phase.error)) {
  console.log(`  (could not read the redirect rules: ${phase.error})`);
}
console.log(`  redirect rules already in the zone: ${existing.length}`);
for (const rule of existing) console.log(`    - ${rule.description || rule.expression} ${rule.enabled === false ? '(disabled)' : ''}`);

const ours = existing.find((r) => r.description === RULE_DESCRIPTION);
const apexRule = {
  action: 'redirect',
  action_parameters: {
    from_value: {
      status_code: 301,
      target_url: { expression: `concat("https://${HOST}", http.request.uri.path)` },
      preserve_query_string: true,
    },
  },
  expression: `(http.host eq "${ZONE_NAME}")`,
  description: RULE_DESCRIPTION,
  enabled: !rollback,
};

/* The same 301 as a legacy Page Rule, for a token whose list offers neither
   "Single Redirect" nor "Dynamic URL Redirects". `$1` carries the path, and
   Cloudflare appends the query string by itself. */
const pageRule = {
  targets: [{ target: 'url', constraint: { operator: 'matches', value: `${ZONE_NAME}/*` } }],
  actions: [{ id: 'forwarding_url', value: { url: `https://${HOST}/$1`, status_code: 301 } }],
  status: 'active',
  priority: 1,
};
const pageRules = await call('GET', `/zones/${zone.id}/pagerules`);
const oursAsPageRule = pageRules.ok
  ? pageRules.body.find((r) => (r.targets || []).some((t) => t.constraint?.value === `${ZONE_NAME}/*`) && (r.actions || []).some((a) => a.id === 'forwarding_url'))
  : null;

/** The ruleset write, falling back to a Page Rule when the token cannot. */
async function writeApexRedirect() {
  const viaRuleset = await call('PUT', `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, {
    rules: [...existing.map(cleanRule), apexRule],
  });
  if (viaRuleset.ok) {
    console.log('  written as a Single Redirect (Rules → Redirect Rules)');
    return viaRuleset;
  }
  if (!/9109|10000|unauthoriz|not entitled|permission/i.test(viaRuleset.error)) return viaRuleset;
  console.log(`  the ruleset refused the token (${viaRuleset.error}); writing a Page Rule instead`);
  const viaPageRule = await call('POST', `/zones/${zone.id}/pagerules`, pageRule);
  if (viaPageRule.ok) console.log('  written as a Page Rule (Rules → Page Rules)');
  return viaPageRule;
}

if (rollback) {
  if (ours) step('remove the apex → www Single Redirect', () => call('PUT', `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, { rules: existing.filter((r) => r.description !== RULE_DESCRIPTION).map(cleanRule) }));
  if (oursAsPageRule) step(`remove the apex → www Page Rule (${oursAsPageRule.id})`, () => call('DELETE', `/zones/${zone.id}/pagerules/${oursAsPageRule.id}`));
  if (!ours && !oursAsPageRule) console.log('  no apex redirect of ours to remove');
} else if (ours || oursAsPageRule) {
  console.log(`  already present: the apex → www redirect (${ours ? 'Single Redirect' : 'Page Rule'})`);
} else {
  step(`add the apex redirect: ${ZONE_NAME}/* → https://${HOST}/* (301, query kept)`, writeApexRedirect);
}

/** A rule read back from the API carries fields it will not accept on write. */
function cleanRule(rule) {
  const { id, version, last_updated, ref, ...rest } = rule;
  return rest;
}

console.log(`\n[cutover] ${plan.length} step(s)${apply ? '' : ' - plan only, nothing sent'}:`);
plan.forEach((s, i) => console.log(`  ${i + 1}. ${s.what}`));
if (!plan.length) console.log('  nothing to do.');

if (!apply) {
  console.log('\n[cutover] re-run with --apply to send these.');
  process.exit(0);
}

for (const [i, s] of plan.entries()) {
  process.stdout.write(`\n[${i + 1}/${plan.length}] ${s.what}\n`);
  const res = await s.run();
  if (!res.ok) {
    console.error(`  FAILED: ${res.error}`);
    console.error('  stopping here; nothing after this step was sent.');
    process.exit(1);
  }
  console.log('  ok');
}

console.log('\n[cutover] done. Verify with:');
console.log(`  curl -sI https://${HOST}/              # 200, no x-robots-tag`);
console.log(`  curl -sI https://${ZONE_NAME}/en/      # 301 → https://${HOST}/en/`);
console.log(`  node scripts/legacy-redirects.mjs --check https://${HOST}`);
console.log('  node scripts/dns-backup.mjs --label after-cutover');
