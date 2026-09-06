import { getSecret } from 'astro:env/server';
import type { Env } from './http';

/**
 * Where the server code gets its secrets and bindings, on the three runtimes
 * it runs on:
 *
 *   - `astro dev` on a laptop: Node, `.env`
 *   - `astro build`: Node, at build time; the API is never called here
 *   - the deployed Worker: `cloudflare:workers`
 *
 * Plain secrets go through Astro's `getSecret`, which the Cloudflare adapter
 * wires to the Worker's environment and Node wires to `process.env`, so one
 * call works everywhere. Bindings - the D1 database - only exist on the
 * Worker and are only reachable through `cloudflare:workers`, a module that
 * does not exist anywhere else. That import lives in cfEnv.ts and is loaded
 * lazily, behind a build-time flag, so the static build never sees it.
 */

/** The token the preview reads drafts with. The narrowest one set wins. */
export function previewToken(): string | undefined {
  return getSecret('SANITY_VIEWER_TOKEN') || getSecret('SANITY_STUDIO_TOKEN') || undefined;
}

/**
 * The full environment for the admin API. Null anywhere but the Worker: a
 * caller that gets null should answer 503 rather than pretend.
 */
export async function workerEnv(): Promise<Env | null> {
  if (import.meta.env.PREVIEW_RUNTIME !== '1') return null;
  const mod = await import('./cfEnv');
  return mod.env as unknown as Env;
}
