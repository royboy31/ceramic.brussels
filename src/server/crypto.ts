/**
 * Password and token primitives for the admin panel.
 *
 * The Workers runtime has WebCrypto but no bcrypt, scrypt or argon2, so
 * password hashing is PBKDF2-SHA256 - the strongest option available here
 * without shipping WASM. Iterations are stored per hash, so raising the count
 * later re-hashes users on their next login instead of invalidating everyone.
 */

const enc = new TextEncoder();

/** Raised over time; existing hashes keep verifying at their stored count. */
export const PBKDF2_ITERATIONS = 210_000;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomId(): string {
  return crypto.randomUUID();
}

/** Session tokens are stored hashed, so the table cannot be replayed. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

/** Constant-time compare - a length-dependent early return leaks the hash. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const count = Number(iterations);
  if (!Number.isFinite(count) || count < 1000) return false;
  try {
    const candidate = await derive(password, unb64(salt), count);
    return timingSafeEqual(candidate, unb64(hash));
  } catch {
    return false;
  }
}

/**
 * Password rules. Deliberately length-first: a long passphrase beats a short
 * string with a symbol bolted on, and complexity rules push people towards
 * "Password1!".
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (password.length > 200) return 'Password must be at most 200 characters.';
  if (/^\s|\s$/.test(password)) return 'Password cannot start or end with a space.';
  return null;
}
