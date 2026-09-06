/**
 * The preview cookie.
 *
 * `/api/preview/enable` is the only door into `/preview/…`: the Studio (or a
 * share link the Studio made) arrives there with a one-time secret that is
 * checked against Sanity, and leaves with this cookie. Every `/preview/`
 * request after that is let in on the cookie alone, so it has to be
 * unforgeable: an HMAC over an expiry, keyed with the preview token itself,
 * which never leaves the server. Nothing is stored; a cookie is valid until
 * its expiry or until the token is rotated, whichever comes first.
 */

export const PREVIEW_COOKIE = 'cb_preview';
const TTL_SECONDS = 12 * 3600;

const encoder = new TextEncoder();

async function hmac(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function issuePreviewCookie(key: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const value = `${exp}.${await hmac(key, `preview:${exp}`)}`;
  return `${PREVIEW_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}

export const clearPreviewCookie = () => `${PREVIEW_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function readPreviewCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === PREVIEW_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export async function verifyPreviewCookie(value: string | null, key: string): Promise<boolean> {
  if (!value) return false;
  const [expText, sig] = value.split('.');
  const exp = Number(expText);
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(key, `preview:${exp}`);
  // Constant-time compare; both are fixed-length hex.
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
