import { escapeHtml } from './mail';

/**
 * The one layout every VIP mail is drawn in: Baïlo's mockup of 2 Nov 2026
 * (ceramic-brussels-VIP-emails-mockup.pdf), with the lower banner she asked
 * for. A yellow banner with the wordmark, a heading, paragraphs, the code
 * in a black block as text (never an image, so it can be copied), a black
 * button and the shared footer - plus the same mail as plain text, which
 * goes out next to it.
 *
 * Mail clients are not browsers: tables for layout, inline styles only, no
 * web fonts, no SVG (Gmail and Outlook drop it), a background colour under
 * the logo so the banner stays yellow with images off, and a "bulletproof"
 * button made of a table cell rather than an image.
 *
 * The footer is this edition's. When the dates or the venue change, change
 * EDITION, and the year in the subjects with it (vipMail.ts).
 */

export const EDITION = {
  name: 'ceramic brussels',
  year: '2027',
  dates: '20 to 24 January 2027',
  venue: 'Tour & Taxis',
  address: 'Avenue du Port 86C, 1000 Brussels',
  directions: 'https://www.google.com/maps/search/?api=1&query=Tour+%26+Taxis%2C+Avenue+du+Port+86C%2C+1000+Brussels',
  site: 'ceramic.brussels',
  vipEmail: 'vip@ceramic.brussels',
};

const ACID = '#ffed00';
const INK = '#050505';
const MUTED = '#555555';
const RULE = '#e2e2e2';
const FONT = "Helvetica, Arial, sans-serif";

export interface VipMail {
  /** The inbox preview line, hidden in the mail itself. */
  preheader: string;
  heading: string;
  /** Paragraphs; `**bold**` is the one mark they take. */
  intro: string[];
  code?: string;
  /** Paragraphs between the code and the button. */
  afterCode?: string[];
  button?: { label: string; href: string };
  /** Paragraphs after the button. */
  closing?: string[];
  signOff: string;
  /** A person under the sign-off (name in bold, title muted), or the team. */
  signature: { name: string; title?: string; bold?: boolean };
}

const inline = (text: string) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1');

const p = (text: string, last = false) =>
  `<p style="margin:0 0 ${last ? 0 : 18}px;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK}">${inline(text)}</p>`;

function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px">
<tr><td bgcolor="${INK}" style="background:${INK};padding:24px 26px">
<p style="margin:0 0 10px;font-family:${FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${ACID}">Your personal access code</p>
<p style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.2;letter-spacing:3px;font-weight:bold;color:#ffffff;word-break:break-all">${escapeHtml(code)}</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#bdbdbd">This code is yours alone. It may be typed in upper or lower case, with or without hyphens.</p>
</td></tr></table>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 26px">
<tr><td bgcolor="${INK}" style="background:${INK}">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 26px;font-family:${FONT};font-size:15px;font-weight:bold;color:${ACID};text-decoration:none">${escapeHtml(label)} &rarr;</a>
</td></tr></table>`;
}

function footerHtml(siteUrl: string): string {
  const link = `color:${MUTED};text-decoration:underline`;
  return `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:${MUTED}">
<strong style="color:${INK}">${EDITION.name}</strong> &middot; ${escapeHtml(EDITION.dates)}<br>
${escapeHtml(EDITION.venue)}, <a href="${escapeHtml(EDITION.directions)}" style="${link}">${escapeHtml(EDITION.address)}</a><br>
<a href="${escapeHtml(siteUrl)}" style="${link}">${EDITION.site}</a> &middot; <a href="mailto:${EDITION.vipEmail}" style="${link}">${EDITION.vipEmail}</a>
</p>`;
}

/**
 * The mail as HTML and as text. `site` is the host the links and the
 * banner image are on: the canonical one in production, a branch preview's
 * own host while the layout is being tried.
 */
export function renderVipMail(mail: VipMail, site: string): { html: string; text: string } {
  const home = new URL('/en/', site).href;
  const logo = new URL('/assets/vip/mail-logo.png', site).href;
  const sig = mail.signature;

  const body = [
    `<h1 style="margin:0 0 22px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:bold;color:${INK}">${escapeHtml(mail.heading)}</h1>`,
    ...mail.intro.map((t) => p(t)),
    mail.code ? codeBlock(mail.code) : '',
    ...(mail.afterCode ?? []).map((t) => p(t)),
    mail.button ? button(mail.button.label, mail.button.href) : '',
    ...(mail.closing ?? []).map((t) => p(t)),
    `<p style="margin:8px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${sig.bold ? INK : MUTED}">${escapeHtml(mail.signOff)}<br>` +
      (sig.bold ? `<strong>${escapeHtml(sig.name)}</strong>` : escapeHtml(sig.name)) +
      (sig.title ? `<br><span style="color:${MUTED}">${escapeHtml(sig.title)}</span>` : '') +
      `</p>`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(mail.heading)}</title></head>
<body style="margin:0;padding:0;background:#f2f2ef">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(mail.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f2ef" style="background:#f2f2ef">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff">
<tr><td align="center" bgcolor="${ACID}" style="background:${ACID};padding:26px 20px">
<a href="${escapeHtml(home)}"><img src="${escapeHtml(logo)}" width="120" height="63" alt="ceramic brussels" style="display:block;width:120px;height:auto;border:0;font-family:${FONT};font-size:20px;color:${INK}"></a>
</td></tr>
<tr><td style="padding:40px 44px 32px">
${body}
</td></tr>
<tr><td style="padding:0 44px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${RULE};padding-top:20px">
${footerHtml(new URL('/en/', site).href)}
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    mail.heading,
    ...mail.intro.map(plain),
    ...(mail.code
      ? [`YOUR PERSONAL ACCESS CODE\n${mail.code}\nThis code is yours alone. It may be typed in upper or lower case, with or without hyphens.`]
      : []),
    ...(mail.afterCode ?? []).map(plain),
    ...(mail.button ? [`${mail.button.label}: ${mail.button.href}`] : []),
    ...(mail.closing ?? []).map(plain),
    [mail.signOff, sig.name, sig.title].filter(Boolean).join('\n'),
    `--\n${EDITION.name} · ${EDITION.dates}\n${EDITION.venue}, ${EDITION.address}\n${EDITION.site} · ${EDITION.vipEmail}`,
  ].join('\n\n');

  return { html, text };
}
