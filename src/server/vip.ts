import { getSecret } from 'astro:env/server';
import { sanityClient } from 'sanity:client';

/**
 * The VIP gate's server side (docs/vip-access.md): the Worker's bindings,
 * the code hashing, the guest lookup and the settings the gate reads.
 *
 * Codes are never stored. A guest row holds the SHA-256 of the code with a
 * pepper (the `VIP_CODE_PEPPER` Pages secret) in front, so the database on
 * its own says nothing about what a VIP types. scripts/vip-guests.mjs
 * derives the same hash when it issues a code, from the same pepper in
 * `.env`.
 *
 * Bindings are typed here rather than from @cloudflare/workers-types: the
 * two calls this needs are enough, and the ambient globals of that package
 * fight the DOM lib the pages compile against.
 */

export interface D1Statement {
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1Like {
  prepare(query: string): { bind(...values: unknown[]): D1Statement };
  /** Several statements in one round trip and one transaction. */
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

export interface KVLike {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export interface VipEnv {
  VIP_DB: D1Like;
  VIP_SESSIONS: KVLike;
}

/**
 * The bindings, when this runs on the Worker; null under `astro dev` and
 * on a build without the runtime, which have neither. Reached through
 * `cloudflare:workers` (cfEnv.ts, loaded lazily behind the build flag): the
 * Astro 7 adapter no longer puts them on `Astro.locals.runtime.env`.
 */
export async function vipEnv(): Promise<VipEnv | null> {
  if (import.meta.env.PREVIEW_RUNTIME !== '1') return null;
  const mod = await import('./cfEnv').catch(() => null);
  const env = mod?.env as Partial<VipEnv> | undefined;
  return env?.VIP_DB && env?.VIP_SESSIONS ? (env as VipEnv) : null;
}

export const codePepper = (): string | undefined => getSecret('VIP_CODE_PEPPER') || undefined;

/** A code as typed - any case, with or without hyphens or spaces - in the one form that is hashed. */
export function normaliseCode(input: unknown): string {
  return typeof input === 'string' ? input.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const codeHash = (code: string, pepper: string) => sha256Hex(`${pepper}:${normaliseCode(code)}`);

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  revoked: number;
}

/**
 * Approved guests only. A request filed through the "not a VIP yet?" form is
 * a row like any other, and its code can be worked out from its email the
 * moment it exists - so a pending or denied row must never match here, or
 * asking for access would be the same as having it.
 */
export async function findGuestByCode(db: D1Like, hash: string): Promise<Guest | null> {
  return db
    .prepare("SELECT id, first_name, last_name, revoked FROM guests WHERE code_hash = ? AND status = 'approved'")
    .bind(hash)
    .first<Guest>();
}

export async function recordEntry(db: D1Like, id: string): Promise<void> {
  await db
    .prepare('UPDATE guests SET entries = entries + 1, last_entry_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run();
}

/** A value from the `settings` table - the hotel code, say - or null. */
export async function vipSetting(db: D1Like, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

/**
 * Whether the locked tabs need a code at all: Site settings → VIP → "A code
 * is required". Read through the CDN and kept for five minutes per isolate,
 * so the gate costs the Sanity quota next to nothing. Unset counts as on:
 * a settings document that was never saved must not open the tabs.
 */
let gate: { value: boolean; until: number } | undefined;
const GATE_TTL_MS = 5 * 60 * 1000;

export async function gateOpen(): Promise<boolean> {
  if (gate && gate.until > Date.now()) return gate.value;
  let value = true;
  try {
    const result = await sanityClient.fetch<boolean | null>('*[_type == "siteSettings"][0].vip.gateOpen');
    value = result !== false;
  } catch (error) {
    console.error('[vip] could not read the gate setting; keeping the gate closed:', error instanceof Error ? error.message : error);
  }
  gate = { value, until: Date.now() + GATE_TTL_MS };
  return value;
}

/**
 * A same-site path to send a visitor on to, or the fallback. Only a path
 * of this site - never another host, never a scheme - so the enter route
 * cannot be used to bounce someone elsewhere.
 */
export function safeNext(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  // A path of this site: one slash, then anything but a second slash or a
  // backslash, and no line breaks anywhere.
  if (!value.startsWith('/') || value.startsWith('//') || value.charAt(1) === '\\' || /[\r\n]/.test(value)) return fallback;
  return value;
}
