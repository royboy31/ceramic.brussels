import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE, LOCALE_IDS, type LocaleId } from '../../lib/locales';
import { localePath } from '../../lib/i18n';

/**
 * POST /api/vip/request - the "not a VIP yet?" form on the VIP access page.
 *
 * The gallery application form's pattern (apply.ts), with the VIP hub's
 * five fields: checks them, turns away bots and repeats, and sends the
 * request to the VIP team through Brevo, plus a confirmation to the
 * requester when Site settings → VIP has one. Nothing is stored: the
 * dataset is public, and the emails are the record. The team decides, adds
 * the guest to the list (scripts/vip-guests.mjs) and sends the code.
 *
 * Until BREVO_API_KEY is set this answers 503 and the form shows its
 * failure state with the VIP address - never a false "sent" - except on a
 * branch preview, where APPLY_DRY_RUN=1 logs the request instead.
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

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function deliver(apiKey: string, s: Submission, cfg: FormSettings): Promise<void> {
  const sender = { name: cfg.senderName || cfg.siteName || 'ceramic brussels', email: cfg.senderEmail || cfg.recipient || cfg.contactEmail || '' };
  const to = cfg.recipient || cfg.contactEmail;
  if (!sender.email || !to) throw new Error('No recipient or sender configured in Site settings → VIP.');

  const send = (message: Record<string, unknown>) =>
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(message),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
    });

  const rows = [
    ['First name', s.firstName],
    ['Last name', s.lastName],
    ['Institution', s.institution],
    ['Function', s.jobTitle],
    ['Email', s.email],
    ['Language', s.lang],
  ];
  await send({
    sender,
    to: [{ email: to }],
    ...(cfg.cc ? { cc: [{ email: cfg.cc }] } : {}),
    replyTo: { email: s.email, name: `${s.firstName} ${s.lastName}` },
    subject: `VIP access request: ${s.firstName} ${s.lastName}, ${s.institution}`,
    htmlContent: `<p>Someone asked for VIP access through the website.</p><table>${rows
      .map(([k, v]) => `<tr><th align="left" style="padding:2px 12px 2px 0">${k}</th><td>${escape(v)}</td></tr>`)
      .join('')}</table>`,
  });

  // A confirmation only when the team wrote one: a VIP request is a judgement
  // call, and a stock "we have received it" can read as a yes.
  if (!cfg.confirmationSubject && !cfg.confirmationText) return;
  const fill = (text: string) =>
    text.replace(/\{(firstName|lastName|institution|email)\}/g, (_, k: keyof Submission) => String(s[k] ?? ''));
  const text = fill(
    cfg.confirmationText ||
      'Dear {firstName},\n\nThank you for your request. The ceramic brussels VIP team will get back to you.\n\nThe ceramic brussels team',
  );
  await send({
    sender,
    to: [{ email: s.email, name: `${s.firstName} ${s.lastName}` }],
    replyTo: { email: to },
    subject: fill(cfg.confirmationSubject || 'Your VIP request to ceramic brussels'),
    textContent: text,
    htmlContent: text.split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join(''),
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
  const apiKey = getSecret('BREVO_API_KEY');
  const dryRun = !apiKey && getSecret('APPLY_DRY_RUN') === '1';
  if (!apiKey && !dryRun) {
    console.error('[vip] request: BREVO_API_KEY is not set; request not delivered');
    return answer(503, 'unconfigured', 'Not available yet', `The form is not connected yet. Please write to ${cfg.contactEmail || 'the VIP team'}.`);
  }

  if (await isRepeat(submission.email)) return answer(409, 'duplicate', 'Already received', 'We already have a request from this address.');

  try {
    if (dryRun) console.warn('[vip] APPLY_DRY_RUN: request not delivered', JSON.stringify({ ...submission, to: cfg.recipient, cc: cfg.cc }));
    else await deliver(apiKey!, submission, cfg);
  } catch (error) {
    console.error('[vip] request delivery failed:', error instanceof Error ? error.message : error);
    return answer(502, 'delivery', 'Could not send', `Your request could not be sent. Please write to ${cfg.contactEmail || 'the VIP team'}.`);
  }

  const next = cfg.successSlug ? localePath(lang, cfg.successSlug) : undefined;
  if (wantsJson) return json(200, { ok: true, ...(next ? { redirect: next } : {}) });
  if (next) return new Response(null, { status: 303, headers: { location: next, 'cache-control': 'no-store' } });
  return page(200, 'Thank you', 'Your request has been received. The VIP team will get back to you.');
};

export const GET: APIRoute = () => json(405, { ok: false, error: 'method' });
