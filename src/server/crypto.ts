/**
 * Password and token primitives for the admin panel.
 *
 * The Workers runtime has WebCrypto but no bcrypt, scrypt or argon2, so
 * password hashing is PBKDF2-SHA256 - the strongest option available here
 * without shipping WASM. Iterations are stored per hash, so raising the count
 * later re-hashes users on their next login instead of invalidating everyone.
 */

const enc = new TextEncoder();

/**
 * 100_000 is not a preference, it is the ceiling: the Workers runtime rejects
 * PBKDF2 above it. Verified against this project's own D1 - probe accounts
 * seeded at 1k/10k/50k/100k all authenticate, 150k and 210k do not, and the
 * failure surfaces as a rejected password rather than an error, which is what
 * the logging below is for.
 *
 * The count is stored inside each hash, so if the runtime ever raises the cap,
 * bumping this re-hashes people on their next sign-in without invalidating
 * anyone. OWASP wants more than this for PBKDF2-SHA256; if that matters more
 * than avoiding a per-seat cost, Cloudflare Access in front of /admin removes
 * password handling from this codebase entirely.
 */
export const PBKDF2_ITERATIONS = 100_000;

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
  } catch (error) {
    // A malformed stored hash is a legitimate false. A runtime failure is not,
    // and must not disappear silently as "wrong password".
    console.error('verifyPassword failed', {
      message: error instanceof Error ? error.message : String(error),
      iterations: count,
    });
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
