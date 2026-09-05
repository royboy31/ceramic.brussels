/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts on /api requests: the signed-in site account, or null. */
    user?: import('./server/http').SessionUser | null;
    /** The Worker's bindings and secrets, on /api requests. */
    env?: import('./server/http').Env;
    /** The Cloudflare execution context, when running on the Worker. */
    cfContext?: { waitUntil(promise: Promise<unknown>): void };
  }
}

interface ImportMetaEnv {
  /** '1' on a build that carries the preview Worker. See astro.config.mjs. */
  readonly PREVIEW_RUNTIME?: string;
  /** 'true' gives the Studio its Preview tab. Set together with PREVIEW_RUNTIME. */
  readonly PUBLIC_PREVIEW_ENABLED?: string;
}
