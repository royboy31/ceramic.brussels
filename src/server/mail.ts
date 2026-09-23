import { getSecret } from 'astro:env/server';

/**
 * Email, through Brevo's transactional API - the gallery application form
 * (routes/apply.ts), the "not a VIP yet?" request (routes/vip-request.ts)
 * and a VIP's code (vipMail.ts) all go out through here.
 *
 * One sender for the whole site: **ceramic brussels <info@ceramic.brussels>**,
 * created in Brevo on 2026-09-23 on the authenticated `ceramic.brussels`
 * domain of Roy's Perelweb account. Site settings may name another address
 * for a form, but it has to be on that domain or Brevo refuses the message,
 * which is why the fallback is this sender and never the recipient.
 *
 * The key is the `BREVO_API_KEY` Pages secret (docs/vip-access.md). Without
 * it nothing is sent, and each route says what it does then: the forms
 * refuse or, on a branch preview with `APPLY_DRY_RUN=1`, log the message;
 * the VIP tool shows the code and says it was not mailed.
 */

export const DEFAULT_SENDER = { name: 'ceramic brussels', email: 'info@ceramic.brussels' };

export interface Address {
  email: string;
  name?: string;
}

export interface Message {
  sender?: Address;
  to: Address[];
  cc?: Address[];
  replyTo?: Address;
  subject: string;
  /** Plain text; a blank line starts a new paragraph. The HTML is made from it when none is given. */
  text?: string;
  html?: string;
}

export const brevoKey = (): string | undefined => getSecret('BREVO_API_KEY') || undefined;

/** Branch previews (wrangler.toml [env.preview.vars]): log the message instead of sending it. */
export const mailDryRun = (): boolean => !brevoKey() && getSecret('APPLY_DRY_RUN') === '1';

/** The sender a form is configured with, on the site's own sender when it names none. */
export const senderFor = (name?: string | null, email?: string | null): Address => ({
  name: name || DEFAULT_SENDER.name,
  email: email || DEFAULT_SENDER.email,
});

export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Plain text to paragraphs: a blank line starts one, a single newline breaks a line. */
export const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

/** `{name}` placeholders filled from `values`; one not in `values` is left as typed. */
export const fill = (text: string, values: Record<string, string | undefined>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key] ?? '') : match));

/** A table of label/value rows for the notifications the team gets. */
export const rowsHtml = (rows: [string, string][]) =>
  `<table>${rows
    .map(([k, v]) => `<tr><th align="left" style="padding:2px 12px 2px 0">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</table>`;

export async function sendMail(apiKey: string, message: Message): Promise<void> {
  const body = {
    sender: message.sender ?? DEFAULT_SENDER,
    to: message.to,
    ...(message.cc?.length ? { cc: message.cc } : {}),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    subject: message.subject,
    ...(message.text ? { textContent: message.text } : {}),
    htmlContent: message.html ?? paragraphs(message.text ?? ''),
  };
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${(await response.text()).slice(0, 300)}`);
}
