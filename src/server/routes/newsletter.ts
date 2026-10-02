import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { brevoKey, fill, mailDryRun, paragraphs, sendMail } from '../mail';

/**
 * POST /api/newsletter - the newsletter signup block
 * (NewsletterSignup.astro; launch call, 2026-10-01).
 *
 * Writes the address as a row into the team's Google Sheet through their
 * Apps Script web app - the same system the studio's other sites use
 * (scripts/newsletter-apps-script.gs has the script and the setup) - then
 * sends the subscriber a confirmation through Brevo. The sheet is the
 * record, so its write is awaited and a failure refuses the signup; the
 * confirmation is best-effort, because a saved address should not bounce
 * over a mail hiccup.
 *
 * The Apps Script URL is the NEWSLETTER_SHEETS_URL Pages secret: whoever
 * holds it can write rows, and the dataset is world-readable, so it never
 * goes in Sanity. Without it this answers 503 and the form shows its
 * failure state with the contact address - never a false "subscribed".
 * On a branch preview APPLY_DRY_RUN=1 (wrangler.toml) logs the row and the
 * mail instead, so the flow can be tried end to end.
 */
export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_WINDOW_SECONDS = 24 * 60 * 60;
const TAB = 'Newsletter';

interface Settings {
  confirmationSubject?: string;
  confirmationText?: string;
  contactEmail?: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** A plain answer for a browser that posted the form without JavaScript. */
const page = (status: number, title: string, text: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"></head>` +
      `<body style="font-family:system-ui;padding:3rem;max-width:40rem"><h1>${title}</h1><p>${text}</p><p><a href="javascript:history.back()">← back</a></p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = await request.json().catch(() => null);
    return body && typeof body === 'object' ? (body as Record<string, string>) : {};
  }
  const data = await request.formData().catch(() => null);
  const out: Record<string, string> = {};
  data?.forEach((value, key) => (out[key] = String(value)));
  return out;
}

async function settings(lang: LocaleId): Promise<Settings> {
  const result = await sanityClient.fetch<Settings | null>(
    `*[_type == "siteSettings"][0]{
      "confirmationSubject": coalesce(newsletter.confirmationSubject[$lang], newsletter.confirmationSubject.en),
      "confirmationText": coalesce(newsletter.confirmationText[$lang], newsletter.confirmationText.en),
      contactEmail
    }`,
    { lang },
  );
  return result ?? {};
}

/**
 * The same address twice in a day is a double click, not a second
 * subscriber. Checking and marking are separate on purpose: marking before
 * the write locked an address out for a day when the write FAILED - found
 * live on 2026-10-02, when the misuploaded secret 502ed a signup and the
 * retry got "already on the list" for a row that was never written.
 */
async function repeatKey(email: string): Promise<Request> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.toLowerCase()));
  return new Request(`https://newsletter.invalid/${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`);
}

async function isRepeat(email: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const cache = await caches.open('newsletter');
  return !!(await cache.match(await repeatKey(email)));
}

/** Remember the address once its row is written, and only then. */
async function markSeen(email: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open('newsletter');
  await cache.put(await repeatKey(email), new Response('1', { headers: { 'cache-control': `max-age=${DUPLICATE_WINDOW_SECONDS}` } }));
}

/**
 * One row per address, upserted by the Email column - the Apps Script
 * matches `key` in `data`, updates the row or inserts one, and adds any
 * missing header itself, so the sheet needs no preparation beyond the tab.
 * `writeOnce` keeps the first signup date when the same address comes back.
 */
async function writeRow(sheetsUrl: string, email: string, lang: LocaleId): Promise<void> {
  const date = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Brussels' });
  const response = await fetch(sheetsUrl, {
    method: 'POST',
    body: JSON.stringify({
      tab: TAB,
      key: 'Email',
      data: { Date: date, Email: email, Language: lang.toUpperCase(), Source: 'website' },
      writeOnce: ['Date'],
    }),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Sheets HTTP ${response.status}`);
  const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!result?.ok) throw new Error(result?.error || 'Sheets answered without ok');
}

async function confirm(apiKey: string, email: string, cfg: Settings): Promise<void> {
  const text = fill(
    cfg.confirmationText ||
      'Hello,\n\nThank you for subscribing to the ceramic brussels newsletter. You will hear from us with the fair’s news and programme.\n\nThe ceramic brussels team',
    { email },
  );
  await sendMail(apiKey, {
    to: [{ email }],
    ...(cfg.contactEmail ? { replyTo: { email: cfg.contactEmail } } : {}),
    subject: fill(cfg.confirmationSubject || 'Welcome to the ceramic brussels newsletter', { email }),
    text,
    html: paragraphs(text),
  });
}

export const POST: APIRoute = async ({ request }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const answer = (status: number, error: string, title: string, text: string) =>
    wantsJson ? json(status, { ok: false, error }) : page(status, title, text);

  // Same origin only: the form lives on this site and nowhere else.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return answer(403, 'origin', 'Not allowed', 'Cross-site request.');

  const body = await readBody(request);
  // The hidden field only a bot fills in: say yes, save nothing.
  if (typeof body.website === 'string' && body.website.trim()) {
    return wantsJson ? json(200, { ok: true }) : page(200, 'Thank you', 'You are on the list.');
  }

  const lang = (LOCALE_IDS as string[]).includes(body.lang) ? (body.lang as LocaleId) : DEFAULT_LOCALE;
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
  if (!EMAIL.test(email)) return answer(400, 'invalid', 'Something is missing', 'Please enter a valid email address.');

  const cfg = await settings(lang);
  const sheetsUrl = getSecret('NEWSLETTER_SHEETS_URL') || undefined;
  const dryRun = mailDryRun();
  if (!sheetsUrl && !dryRun) {
    console.error('[newsletter] NEWSLETTER_SHEETS_URL is not set; signup not saved');
    return answer(503, 'unconfigured', 'Not available yet', `The signup is not connected yet. Please write to ${cfg.contactEmail || 'the team'}.`);
  }

  if (await isRepeat(email)) return answer(409, 'duplicate', 'Already subscribed', 'This address is already on the list.');

  try {
    if (dryRun) console.warn('[newsletter] APPLY_DRY_RUN: not saved', JSON.stringify({ email, lang }));
    else await writeRow(sheetsUrl!, email, lang);
  } catch (error) {
    console.error('[newsletter] sheet write failed:', error instanceof Error ? error.message : error);
    return answer(502, 'delivery', 'Could not save', `Your subscription could not be saved. Please write to ${cfg.contactEmail || 'the team'}.`);
  }
  await markSeen(email);

  // The row is saved; the confirmation is best-effort.
  const apiKey = brevoKey();
  if (apiKey && !dryRun) {
    try {
      await confirm(apiKey, email, cfg);
    } catch (error) {
      console.error('[newsletter] confirmation failed:', error instanceof Error ? error.message : error);
    }
  } else if (!dryRun) {
    console.warn('[newsletter] BREVO_API_KEY is not set; row saved, no confirmation sent');
  }

  if (wantsJson) return json(200, { ok: true });
  return page(200, 'Thank you', 'You are on the list. A confirmation is on its way to you.');
};

export const GET: APIRoute = () => json(405, { ok: false, error: 'method' });
