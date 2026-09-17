/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  /** '1' on a build that carries the preview Worker. See astro.config.mjs. */
  readonly PREVIEW_RUNTIME?: string;
  /** 'true' gives the Studio its Preview tab. Set together with PREVIEW_RUNTIME. */
  readonly PUBLIC_PREVIEW_ENABLED?: string;
}

/**
 * What the Cloudflare adapter puts on `Astro.locals` on the Worker: the
 * bindings of wrangler.worker.toml. Absent under `astro dev` and at build
 * time, hence optional. Typed loosely on purpose - src/server/vip.ts narrows
 * the two bindings it uses to the calls it makes.
 */
declare namespace App {
  interface Locals {
    runtime?: { env: Record<string, unknown> };
  }
}
