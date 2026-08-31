#!/usr/bin/env node
/**
 * Wires "publish in Sanity -> rebuild the static site".
 *
 * The site is built with output: 'static', so content is baked in at build
 * time. This registers a Sanity webhook that pings your host's deploy hook
 * whenever a content document is created, updated, or deleted.
 *
 * Usage:
 *   node scripts/create-deploy-webhook.mjs                     # dry run
 *   node scripts/create-deploy-webhook.mjs <deploy-hook-url>   # create/update
 *
 * Get <deploy-hook-url> from your host:
 *   Netlify  Site settings -> Build & deploy -> Build hooks
 *   Vercel   Project settings -> Git -> Deploy Hooks
 *   Cloudflare Pages  Settings -> Builds & deployments -> Deploy hooks
 */
import fs from 'node:fs';

const HOOK_NAME = 'rebuild-static-site';
const API = 'https://api.sanity.io/v2021-10-04';

// Minimal .env reader - this runs outside Vite, so import.meta.env is empty.
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
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET;
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    'Missing PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, or SANITY_API_WRITE_TOKEN.\n' +
      'They live in .env - see .env.example.',
  );
  process.exit(1);
}

const deployHookUrl = process.argv[2];

const payload = {
  name: HOOK_NAME,
  description: 'Rebuild the Astro static site when published content changes.',
  url: deployHookUrl,
  dataset,
  // Content types only. Without this filter, Sanity's internal system.* docs
  // would trigger pointless rebuilds.
  filter: '_type in ["piece", "post"]',
  projection: '{_id, _type}',
  on: ['create', 'update', 'delete'],
  httpMethod: 'POST',
  apiVersion: 'v2021-03-25',
  // Drafts must not rebuild the public site - only published content.
  includeDrafts: false,
  isDisabled: false,
};

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  return body;
}

const existing = await api(`/hooks/projects/${projectId}`);
const match = existing.find((h) => h.name === HOOK_NAME);

console.log(`Project ${projectId} / dataset ${dataset}`);
console.log(`Existing webhooks: ${existing.length}`);
for (const h of existing) {
  console.log(`  - ${h.name} -> ${h.url} ${h.isDisabled ? '(disabled)' : ''}`);
}

if (!deployHookUrl) {
  console.log('\nDry run - no deploy hook URL given. Would send:\n');
  console.log(JSON.stringify({ ...payload, url: '<deploy-hook-url>' }, null, 2));
  console.log('\nRe-run with the URL to create it:');
  console.log('  node scripts/create-deploy-webhook.mjs https://api.netlify.com/build_hooks/xxxx');
  process.exit(0);
}

if (!/^https:\/\//.test(deployHookUrl)) {
  console.error(`Refusing to register a non-HTTPS deploy hook: ${deployHookUrl}`);
  process.exit(1);
}

if (match) {
  await api(`/hooks/projects/${projectId}/${match.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  console.log(`\nUpdated existing webhook "${HOOK_NAME}" -> ${deployHookUrl}`);
} else {
  const created = await api(`/hooks/projects/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  console.log(`\nCreated webhook "${HOOK_NAME}" (id ${created.id}) -> ${deployHookUrl}`);
}
