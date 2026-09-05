#!/usr/bin/env node
/**
 * `npm run build:preview` - the build as Cloudflare Pages previews run it,
 * with the preview Worker included. Sets PREVIEW_RUNTIME=1 for the child
 * without depending on the shell's syntax for that, since the team is on
 * both Windows and macOS.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PREVIEW_RUNTIME: '1', PUBLIC_PREVIEW_ENABLED: 'true' },
});
process.exit(result.status ?? 1);
