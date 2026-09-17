/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  /** '1' on a build that carries the preview Worker. See astro.config.mjs. */
  readonly PREVIEW_RUNTIME?: string;
  /** 'true' gives the Studio its Preview tab. Set together with PREVIEW_RUNTIME. */
  readonly PUBLIC_PREVIEW_ENABLED?: string;
}
