import { sha256Hex, type KVLike, type Audience } from './vip';

/**
 * Gate sessions, in Workers KV (docs/vip-access.md).
 *
 * The cookie is `<guest id>.<random>`. KV holds one key per session,
 * `<prefix>:<guest id>:<SHA-256 of the random part>`, so a copy of the
 * namespace cannot be replayed, and every guest's sessions share a prefix, so
 * revoking a guest is one list and a few deletes (scripts/vip-guests.mjs).
 * Each key carries its own expiry; nothing is ever pruned. A gate check is
 * one KV read, cached at the edge for a minute.
 *
 * Two realms share the machinery and nothing else: the VIP hub (`cb_vip`,
 * keys under `s:`) and the exhibitors platform (`cb_exh`, keys under `x:`).
 * Separate cookies and separate prefixes mean a VIP session can never open
 * the platform, whatever the rest of the code does.
 */

export interface SessionRealm {
  cookie: string;
  prefix: string;
}

export const REALMS: Record<Audience, SessionRealm> = {
  vip: { cookie: 'cb_vip', prefix: 's' },
  exhibitor: { cookie: 'cb_exh', prefix: 'x' },
};

export const VIP_COOKIE = REALMS.vip.cookie;
const TTL_SECONDS = 30 * 24 * 3600;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function cookieHeader(realm: SessionRealm, value: string, maxAge: number): string {
  return `${realm.cookie}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export const clearVipCookie = (realm: SessionRealm = REALMS.vip) => cookieHeader(realm, '', 0);

export function readVipCookie(request: Request, realm: SessionRealm = REALMS.vip): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === realm.cookie) return rest.join('=') || null;
  }
  return null;
}

const sessionKey = async (realm: SessionRealm, guestId: string, secret: string) =>
  `${realm.prefix}:${guestId}:${await sha256Hex(secret)}`;

/** Opens a session for a guest and returns the Set-Cookie header. */
export async function createVipSession(kv: KVLike, guestId: string, request: Request, realm: SessionRealm = REALMS.vip): Promise<string> {
  const secret = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await kv.put(
    await sessionKey(realm, guestId, secret),
    JSON.stringify({ at: new Date().toISOString(), ua: (request.headers.get('user-agent') ?? '').slice(0, 200) }),
    { expirationTtl: TTL_SECONDS },
  );
  return cookieHeader(realm, `${guestId}.${secret}`, TTL_SECONDS);
}

/** The guest id of the request's session, or null. */
export async function readVipSession(kv: KVLike, request: Request, realm: SessionRealm = REALMS.vip): Promise<string | null> {
  const value = readVipCookie(request, realm);
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot <= 0) return null;
  const guestId = value.slice(0, dot);
  const secret = value.slice(dot + 1);
  if (!/^[a-f0-9]{8,64}$/.test(guestId) || secret.length < 32) return null;
  const hit = await kv.get(await sessionKey(realm, guestId, secret), { cacheTtl: 60 });
  return hit ? guestId : null;
}

export async function deleteVipSession(kv: KVLike, request: Request, realm: SessionRealm = REALMS.vip): Promise<void> {
  const value = readVipCookie(request, realm);
  const dot = value?.indexOf('.') ?? -1;
  if (!value || dot <= 0) return;
  await kv.delete(await sessionKey(realm, value.slice(0, dot), value.slice(dot + 1)));
}
