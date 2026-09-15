import { getSecret } from 'astro:env/server';

/**
 * Where the server code gets its secret, on the three runtimes it runs on:
 *
 *   - `astro dev` on a laptop: Node, `.env`
 *   - `astro build`: Node, at build time; the routes are never called here
 *   - the deployed Worker: the Pages secret
 *
 * Astro's `getSecret` is wired to the Worker's environment by the Cloudflare
 * adapter and to `process.env` by Node, so one call works everywhere.
 */

/** The read-only token the preview reads drafts with. */
export function previewToken(): string | undefined {
  return getSecret('SANITY_VIEWER_TOKEN') || undefined;
}
