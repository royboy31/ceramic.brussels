/**
 * The Worker's environment: bindings (the D1 database) and secrets.
 *
 * `cloudflare:workers` only resolves inside the Cloudflare build. This
 * module is imported lazily from runtime.ts and only when PREVIEW_RUNTIME
 * is on, so the plain static build never tries to bundle it; astro.config
 * additionally marks it external there so an accidental import fails loudly
 * at runtime rather than at build time.
 */
// @ts-ignore - resolved by the Cloudflare adapter's Vite plugin; absent elsewhere.
export { env } from 'cloudflare:workers';
