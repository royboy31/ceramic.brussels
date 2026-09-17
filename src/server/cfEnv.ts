/**
 * The Worker's environment: the bindings of wrangler.worker.toml (the VIP
 * hub's D1 database and KV namespace) and the secrets.
 *
 * `cloudflare:workers` only resolves inside the Cloudflare build. This
 * module is imported lazily from vip.ts and only when PREVIEW_RUNTIME is on,
 * so the plain static build never tries to bundle it; astro.config
 * additionally marks it external there, so an accidental import fails
 * loudly at runtime rather than at build time. The Astro 7 adapter took
 * `Astro.locals.runtime.env` away in favour of this import.
 */
// @ts-ignore - resolved by the Cloudflare adapter's Vite plugin; absent elsewhere.
export { env } from 'cloudflare:workers';
