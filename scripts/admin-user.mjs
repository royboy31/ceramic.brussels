/**
 * Creates the first admin for the content panel, or adds one from the command
 * line if you are ever locked out.
 *
 *   npm run admin:user -- --email you@example.com --name "Your Name"
 *   npm run admin:user -- --email you@example.com --name "You" --role editor --local
 *
 * A temporary password is generated and printed once. It is stored with
 * must_change_password set, so it stops working the moment the person signs in
 * and picks their own - which is why it is safe to send them one over chat.
 *
 * The hash must match src/server/crypto.ts exactly: PBKDF2-SHA256, the same
 * iteration count, salt and hash base64-encoded in one $-separated string.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read from the server module so the two can never drift: a mismatch here
// produces accounts that look fine and cannot sign in.
const PBKDF2_ITERATIONS = Number(
  readFileSync(new URL('../src/server/crypto.ts', import.meta.url), 'utf8')
    .match(/PBKDF2_ITERATIONS = ([0-9_]+)/)[1]
    .replace(/_/g, ''),
);
const DATABASE = 'ceramic-brussels-admin';
const ACCOUNT_ID = '68abcbaf4817943a805737802e15679a';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const email = (arg('email') ?? '').trim().toLowerCase();
const name = (arg('name') ?? '').trim();
const role = arg('role', 'admin');
const local = process.argv.includes('--local');

if (!email || !name) {
  console.error('Usage: npm run admin:user -- --email <email> --name "<name>" [--role editor] [--local]');
  process.exit(1);
}
if (role !== 'admin' && role !== 'editor') {
  console.error('--role must be admin or editor');
  process.exit(1);
}

const b64 = (bytes) => Buffer.from(bytes).toString('base64');

/** Readable but high-entropy: 4 groups of 5 from an unambiguous alphabet. */
function temporaryPassword() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join('')).join('-');
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

const password = arg('password') ?? temporaryPassword();
const hash = await hashPassword(password);
const id = crypto.randomUUID();
const now = new Date().toISOString();
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const sql = `INSERT INTO users (id, email, name, password_hash, role, is_active, must_change_password, created_at, created_by)
VALUES (${quote(id)}, ${quote(email)}, ${quote(name)}, ${quote(hash)}, ${quote(role)}, 1, 1, ${quote(now)}, 'cli');`;

const file = join(tmpdir(), `admin-user-${id}.sql`);
writeFileSync(file, sql);

try {
  // Run wrangler's entry point with this same node binary. Going through npx
  // needs a shell on Windows, and a shell concatenates arguments rather than
  // escaping them.
  const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
  execFileSync(
    process.execPath,
    [wrangler, 'd1', 'execute', DATABASE, local ? '--local' : '--remote', '--file', file, '-y'],
    { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID } },
  );
} finally {
  unlinkSync(file);
}

console.log('\n  Account created');
console.log(`  email    ${email}`);
console.log(`  role     ${role}`);
console.log(`  password ${password}`);
console.log('\n  This password works once. They must set their own on first sign-in.\n');
