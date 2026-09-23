import type { APIRoute } from 'astro';
import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';
import { codePepper, vipEnv } from '../vip';
import { createGuest } from '../vipGuests';
import { brevoKey, fill, mailDryRun, paragraphs, rowsHtml, sendMail, senderFor } from '../mail';

/**
 * POST /api/vip/request - the "not a VIP yet?" form on the VIP access page.
 *
 * The gallery application form's pattern (apply.ts), with the VIP hub's
 * five fields: checks them, turns away bots and repeats, and **files the
 * request in the guest list as a pending row** - in D1, never in Sanity,
 * whose dataset is public. A Sanity administrator grants or denies it in
 * the Studio's VIP tool; a pending row's code opens nothing (vip.ts
 * findGuestByCode). Someone already in the list, whatever their state, is
 * left as they are: asking twice changes nothing.
 *
 * The emails through Brevo - the request to the VIP team, a confirmation to
 * the requester when Site settings → VIP has one - are a notification now,
 * not the record, so a request filed without them still counts as received.
 * Only when it could be neither filed nor mailed does this answer 503 and
 * the form show its failure state with the VIP address - never a false
 * "sent". On a branch preview APPLY_DRY_RUN=1 logs the mail instead.
 */
export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_WINDOW_SECONDS = 15 * 60;

interface Submission {
  firstName: string;
  lastName: string;
  institution: string;
  jobTitle: string;
  email: string;
  lang: LocaleId;
}

interface FormSettings {
  recipient?: string;
  cc?: string;
  senderName?: string;
  senderEmail?: string;
  confirmationSubject?: string;
  confirmationText?: string;
  contactEmail?: string;
  siteName?: string;
  successSlug?: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const page = (status: number, title: string, text: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"></head>` +
      `<body style="font-family:system-ui;padding:3rem;max-width:40rem"><h1>${title}</h1><p>${text}</p><p><a href="javascript:history.back()">← back</a></p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

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

async function settings(lang: LocaleId): Promise<FormSettings> {
  const result = await sanityClient.fetch<FormSettings | null>(
    `*[_type == "siteSettings"][0]{
      "recipient": coalesce(vip.recipient, vip.contactEmail),
      "cc": vip.cc,
      "senderName": vip.senderName,
      "senderEmail": vip.senderEmail,
      "confirmationSubject": coalesce(vip.confirmationSubject[$lang], vip.confirmationSubject.en),
      "confirmationText": coalesce(vip.confirmationText[$lang], vip.confirmationText.en),
      "successSlug": coalesce(vip.successPage->slug[$lang].current, vip.successPage->slug.en.current),
      "contactEmail": coalesce(vip.contactEmail, contactEmail),
      siteName
    }`,
    { lang },
  );
  return result ?? {};
}

/** The same address twice in a quarter of an hour is a double click, not a second request. */
async function isRepeat(email: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.toLowerCase()));
  const key = new Request(`https://vip-request.invalid/${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`);
  const cache = await caches.open('vip-request');
  if (await cache.match(key)) return true;
  await cache.put(key, new Response('1', { headers: { 'cache-control': `max-age=${DUPLICATE_WINDOW_SECONDS}` } }));
  return false;
}

/**
 * A request is a row in the guest list now, so one address may not file them
 * without end: ten an hour, counted per colo in the Cache API like the code
 * box's failures. A real visitor sends one.
 */
const REQUEST_LIMIT = 10;
async function tooManyRequests(request: Request): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = new Request(`https://vip-request-ip.invalid/${encodeURIComponent(ip)}`);
  const cache = await caches.open('vip-request');
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= REQUEST_LIMIT) return true;
  await cache.put(key, new Response(String(count + 1), { headers: { 'cache-control': 'max-age=3600' } }));
  return false;
}

async function deliver(apiKey: string, s: Submission, cfg: FormSettings): Promise<void> {
  const sender = senderFor(cfg.senderName || cfg.siteName, cfg.senderEmail);
  const to = cfg.recipient || cfg.contactEmail;
  if (!to) throw new Error('No recipient configured in Site settings → VIP.');

  const rows: [string, string][] = [
    ['First name', s.firstName],
    ['Last name', s.lastName],
    ['Institution', s.institution],
    ['Function', s.jobTitle],
    ['Email', s.email],
    ['Language', s.lang],
  ];
  await sendMail(apiKey, {
    sender,
    to: [{ email: to }],
    ...(cfg.cc ? { cc: [{ email: cfg.cc }] } : {}),
    replyTo: { email: s.email, name: `${s.firstName} ${s.lastName}` },
    subject: `VIP access request: ${s.firstName} ${s.lastName}, ${s.institution}`,
    html: `<p>Someone asked for VIP access through the website. It waits under Requests in the Studio's VIP guests tool.</p>${rowsHtml(rows)}`,
  });

  // A confirmation only when the team wrote one: a VIP request is a judgement
  // call, and a stock "we have received it" can read as a yes.
  if (!cfg.confirmationSubject && !cfg.confirmationText) return;
  const values = { firstName: s.firstName, lastName: s.lastName, institution: s.institution, email: s.email };
  const text = fill(
    cfg.confirmationText ||
      'Dear {firstName},\n\nThank you for your request. The ceramic brussels VIP team will get back to you.\n\nThe ceramic brussels team',
    values,
  );
  await sendMail(apiKey, {
    sender,
    to: [{ email: s.email, name: `${s.firstName} ${s.lastName}` }],
    replyTo: { email: to },
    subject: fill(cfg.confirmationSubject || 'Your VIP request to ceramic brussels', values),
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
  // The hidden field only a bot fills in: say yes, send nothing.
  if (clean(body.website, 10)) return wantsJson ? json(200, { ok: true }) : page(200, 'Thank you', 'Your request has been received.');

  const lang = (LOCALE_IDS as string[]).includes(body.lang) ? (body.lang as LocaleId) : DEFAULT_LOCALE;
  const submission: Submission = {
    firstName: clean(body.firstName, 120),
    lastName: clean(body.lastName, 120),
    institution: clean(body.institution, 200),
    jobTitle: clean(body.function, 200),
    email: clean(body.email, 254),
    lang,
  };
  if (!submission.firstName || !submission.lastName || !submission.institution || !submission.jobTitle || !EMAIL.test(submission.email)) {
    return answer(400, 'invalid', 'Something is missing', 'Please fill in every field with a valid email address.');
  }

  const cfg = await settings(lang);
  const apiKey = brevoKey();
  const dryRun = mailDryRun();
  const env = await vipEnv();
  const pepper = codePepper();
  if (!(env && pepper) && !apiKey && !dryRun) {
    console.error('[vip] request: no guest list and no BREVO_API_KEY on this deployment; request not received');
    return answer(503, 'unconfigured', 'Not available yet', `The form is not connected yet. Please write to ${cfg.contactEmail || 'the VIP team'}.`);
  }

  if (await tooManyRequests(request)) return answer(429, 'throttled', 'Too many requests', 'Please try again later.');
  if (await isRepeat(submission.email)) return answer(409, 'duplicate', 'Already received', 'We already have a request from this address.');

  // The record: a pending row for the Studio's VIP tool.
  let filed = false;
  if (env && pepper) {
    try {
      await createGuest(
        env.VIP_DB,
        pepper,
        { firstName: submission.firstName, lastName: submission.lastName, email: submission.email, institution: submission.institution, function: submission.jobTitle },
        'pending',
        null,
      );
      filed = true;
    } catch (error) {
      console.error('[vip] request could not be filed:', error instanceof Error ? error.message : error);
    }
  }

  // The notification. Its failure only matters when nothing was filed.
  try {
    if (apiKey) await deliver(apiKey, submission, cfg);
    else if (dryRun) console.warn('[vip] APPLY_DRY_RUN: request not mailed', JSON.stringify({ ...submission, to: cfg.recipient, cc: cfg.cc }));
  } catch (error) {
    console.error('[vip] request delivery failed:', error instanceof Error ? error.message : error);
    if (!filed) return answer(502, 'delivery', 'Could not send', `Your request could not be sent. Please write to ${cfg.contactEmail || 'the VIP team'}.`);
  }
  if (!filed && !apiKey && !dryRun) {
    return answer(502, 'delivery', 'Could not send', `Your request could not be sent. Please write to ${cfg.contactEmail || 'the VIP team'}.`);
  }

  const next = cfg.successSlug ? localePath(lang, cfg.successSlug) : undefined;
  if (wantsJson) return json(200, { ok: true, ...(next ? { redirect: next } : {}) });
  if (next) return new Response(null, { status: 303, headers: { location: next, 'cache-control': 'no-store' } });
  return page(200, 'Thank you', 'Your request has been received. The VIP team will get back to you.');
};

export const GET: APIRoute = () => json(405, { ok: false, error: 'method' });
