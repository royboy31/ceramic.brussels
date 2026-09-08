/**
 * Lists every file the current branch changes outside the frontend half.
 *
 *   npm run boundary            compare with origin/dev (fetched first)
 *   npm run boundary -- --base=origin/main
 *
 * The frontend half is what docs/frontend-handbook.md says Lilanga owns:
 * pages, layouts, components, UI strings, placeholders, static assets and
 * the two hand-off documents. Anything else on the branch - schemas,
 * queries, hub/locale lists, deployment, scripts - belongs to the backend
 * and should be a request in docs/backend-requests.md instead. Exits 1 when
 * such files exist, so it can guard a commit or a PR.
 */
import { execSync } from 'node:child_process';

const ALLOWED = [
  /^src\/pages\/(?!login\.astro$)/,
  /^src\/layouts\//,
  /^src\/components\//,
  /^src\/lib\/i18n\.ts$/,
  /^src\/lib\/placeholders\.ts$/,
  /^public\/(?!_headers$|_redirects$|section-previews\/)/,
  /^docs\/frontend-handbook\.md$/,
  /^docs\/backend-requests\.md$/,
  /^\.claude\/skills\//,
];

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const base = baseArg ? baseArg.slice('--base='.length) : 'origin/dev';

const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const lines = (s) => (s ? s.split(/\r?\n/).filter(Boolean) : []);

if (base.startsWith('origin/')) {
  try { git(`fetch -q origin ${base.slice('origin/'.length)}`); } catch { /* offline: use what we have */ }
}

let mergeBase;
try { mergeBase = git(`merge-base HEAD ${base}`); } catch {
  console.error(`Cannot find ${base}. Run: git fetch origin`);
  process.exit(2);
}

const changed = new Set([
  ...lines(git(`diff --name-only ${mergeBase}`)),
  ...lines(git('diff --name-only --cached')),
  ...lines(git('ls-files --others --exclude-standard')),
]);

const outside = [...changed].filter((f) => !ALLOWED.some((re) => re.test(f))).sort();

if (outside.length === 0) {
  console.log(`boundary: ${changed.size} changed file(s) since ${base}, all inside the frontend half.`);
  process.exit(0);
}

console.log(`boundary: ${outside.length} file(s) outside the frontend half (since ${base}):\n`);
for (const f of outside) console.log(`  ${f}`);
console.log(`
These belong to the backend half (see docs/frontend-handbook.md, "What is
yours and what is not"). Revert them and log what the page needs in
docs/backend-requests.md, or, if Kamindu asked for the change, say so in
the PR.`);
process.exit(1);
