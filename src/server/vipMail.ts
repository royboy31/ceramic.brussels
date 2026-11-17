import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE } from '../lib/locales';
import { localePath } from '../lib/i18n';
import { hubTabPath } from '../lib/hubs';
import { PLATFORM_PATH } from '../lib/exhibitorsPlatform';
import { brevoKey, fill, mailDryRun, sendMail, senderFor, type Address } from './mail';
import type { RowAudience } from './vip';
import { EDITION, renderVipMail, type VipMail } from './vipMailLayout';

/**
 * The mails a VIP guest gets (docs/vip-access.md), all in the branded
 * layout of vipMailLayout.ts, their texts from Baïlo's mockup of 2 Nov 2026:
 *
 * - `acknowledgement` - the "not a VIP yet?" form was sent (routes/vip-request.ts);
 * - `code` - the welcome with their code, when the Studio's VIP tool adds,
 *   approves or reissues a guest and on its "Send by email" button; an
 *   import never sends it, the invitation mailing is the team's;
 * - `member` - an approved guest asked again, so their code goes back to
 *   the address on file (routes/vip-request.ts);
 * - `decline` - the VIP tool denied a request; Brevo sends it 48 hours later
 *   (Baïlo, 4 Nov: so the selection does not feel automated), and an
 *   approval or a deletion in between calls it off (routes/vip-admin.ts).
 *
 * The acknowledgement and the decline share a subject so the answer lands
 * in the request's thread. The texts are English: the guest list keeps no
 * language. Sender and reply-to are Site settings → VIP. The outcome goes
 * back to the tool, so an editor always knows whether the guest has the
 * mail or must be written to by hand.
 *
 * An exhibitor's password is not a VIP mail: it keeps its plain text, Site
 * settings → VIP → "Password email" or the stock one below, with `{link}`
 * filled with the platform's address (docs/exhibitors-platform.md).
 */

export type MailOutcome =
  | { sent: true; to: string; messageId?: string; scheduledAt?: string }
  | { sent: false; to: string; reason: 'unconfigured' | 'dry-run' | 'failed'; detail?: string };

export type VipMailKind = 'acknowledgement' | 'code' | 'member' | 'decline';

interface MailSettings {
  senderName?: string;
  senderEmail?: string;
  contactEmail?: string;
  exhibitorCodeSubject?: string;
  exhibitorCodeText?: string;
  siteName?: string;
}

const APPLICATION_SUBJECT = `Your VIP application, ceramic brussels ${EDITION.year}`;

async function settings(): Promise<MailSettings> {
  const result = await sanityClient.fetch<MailSettings | null>(
    `*[_type == "siteSettings"][0]{
      "senderName": vip.senderName,
      "senderEmail": vip.senderEmail,
      "contactEmail": coalesce(vip.contactEmail, contactEmail),
      "exhibitorCodeSubject": vip.exhibitorCodeSubject,
      "exhibitorCodeText": vip.exhibitorCodeText,
      siteName
    }`,
  );
  return result ?? {};
}

/** The site the links point at: the canonical host, or the one the request came in on. */
export const mailSite = (origin: string) => import.meta.env.PUBLIC_SITE_URL || origin;

/** The access page, the code already in the box (VipCodeForm reads `#code=`; a fragment never reaches a log). */
const accessLink = (site: string, code?: string) =>
  new URL(localePath(DEFAULT_LOCALE, 'vip/access'), site).href + (code ? `#code=${encodeURIComponent(code)}` : '');

/** Each mail's subject and content. `firstName` is already a fallback when the row has none. */
export function vipMailContent(kind: VipMailKind, firstName: string, site: string, code?: string): { subject: string; mail: VipMail } {
  const team = { name: `The ${EDITION.name} VIP team` };
  const home = new URL(localePath(DEFAULT_LOCALE, ''), site).href;
  switch (kind) {
    case 'acknowledgement':
      return {
        subject: APPLICATION_SUBJECT,
        mail: {
          preheader: 'We have received your application to the VIP programme.',
          heading: `Thank you, ${firstName}`,
          intro: [
            'We have received your application to the VIP programme of ceramic brussels.',
            'As our programme is intentionally limited in size, each request is reviewed individually by our VIP Relations team. You will hear from us within ten working days.',
            'Should you wish to share any additional information in the meantime, simply reply to this email. Your details will, of course, be treated with the utmost confidentiality.',
            `ceramic brussels takes place from **${EDITION.dates}** at ${EDITION.venue}, in Brussels.`,
          ],
          button: { label: 'discover the fair', href: home },
          signOff: 'With kind regards,',
          signature: team,
        },
      };
    case 'code':
      return {
        subject: `Welcome to the ${EDITION.name} VIP programme`,
        mail: {
          preheader: 'Your personal access code to the VIP programme.',
          heading: `Welcome, ${firstName}`,
          intro: ['It is a great pleasure to welcome you to the VIP programme of ceramic brussels.'],
          code,
          afterCode: ['Enter it on our VIP page to discover the full VIP programme and to benefit from our partner hotel offer when booking your stay.'],
          button: { label: 'access the VIP programme', href: accessLink(site, code) },
          closing: [
            'Our team remains at your entire disposal to tailor your visit, whether you would like an introduction to specific galleries, a private tour of the fair or recommendations for your stay in Brussels.',
            `We look forward to welcoming you at ${EDITION.venue}, from ${EDITION.dates}.`,
          ],
          signOff: 'Warm regards,',
          signature: { name: 'Baïlo Staumont', title: 'Head of International Relations & Partnership Development', bold: true },
        },
      };
    case 'member':
      return {
        subject: `Your ${EDITION.name} VIP code`,
        mail: {
          preheader: 'You are already a member: here is your personal access code.',
          heading: `Dear ${firstName}`,
          intro: [
            'We have received a new VIP request with your email address. You are already a member of the VIP programme of ceramic brussels, so there is nothing more to do: here is your personal access code.',
          ],
          code,
          button: { label: 'access the VIP programme', href: accessLink(site, code) },
          closing: ['If you did not make this request, you can simply ignore this email.'],
          signOff: 'With kind regards,',
          signature: team,
        },
      };
    case 'decline':
      return {
        subject: APPLICATION_SUBJECT,
        mail: {
          preheader: 'About your application to the VIP programme.',
          heading: `Dear ${firstName}`,
          intro: [
            'Thank you for your interest in ceramic brussels and for the time you took to share your application with us.',
            'As the number of places in our VIP programme is deliberately limited, we are not in a position to extend a VIP invitation to you for this edition.',
            // Gilles' sentence, without the second "delighted" (Roy's wording, 12 Nov 2026). The fair opens to the public on the 21st, so not EDITION.dates (20 to 24, VIP days included).
            `We would nevertheless be delighted to welcome you to the fair, held at ${EDITION.venue} from 21 to 24 January 2027, and invite you to discover the programme we have prepared for this edition.`,
          ],
          // Visitors info, Baïlo's answer to the mockup's note 3 (10 Nov 2026); the label is hers (11 Nov 2026).
          button: { label: 'visitors info', href: new URL(localePath(DEFAULT_LOCALE, hubTabPath('visit')), site).href },
          closing: ['With your permission, we will gladly keep your details for our future editions.'],
          signOff: 'With kind regards,',
          signature: team,
        },
      };
  }
}

/** One of the mails above to one guest, through Brevo, or the reason it was not sent. */
export async function mailVip(
  kind: VipMailKind,
  guest: { first_name: string; last_name: string; email: string },
  origin: string,
  code?: string,
  scheduledAt?: Date,
): Promise<MailOutcome> {
  const to = guest.email;
  const apiKey = brevoKey();
  if (!apiKey) {
    if (mailDryRun()) {
      console.warn(
        `[vip] APPLY_DRY_RUN: ${kind} mail not sent`,
        JSON.stringify({ to, ...(code ? { code } : {}), ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}) }),
      );
      return { sent: false, to, reason: 'dry-run' };
    }
    return { sent: false, to, reason: 'unconfigured' };
  }
  try {
    const cfg = await settings();
    const name = `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim();
    // Most of the imported list has no first name yet: "Dear guest", never "Dear ,".
    const { subject, mail } = vipMailContent(kind, guest.first_name?.trim() || 'guest', mailSite(origin), code);
    const { html, text } = renderVipMail(mail, mailSite(origin));
    const recipient: Address = { email: to, ...(name ? { name } : {}) };
    const messageId = await sendMail(apiKey, {
      sender: senderFor(cfg.senderName || cfg.siteName, cfg.senderEmail),
      to: [recipient],
      ...(cfg.contactEmail ? { replyTo: { email: cfg.contactEmail } } : {}),
      subject,
      text,
      html,
      scheduledAt,
    });
    return { sent: true, to, ...(messageId ? { messageId } : {}), ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[vip] ${kind} mail not sent:`, detail);
    return { sent: false, to, reason: 'failed', detail };
  }
}

const DEFAULT_EXHIBITOR_SUBJECT = 'Your password for the ceramic brussels exhibitors platform';
const DEFAULT_EXHIBITOR_TEXT = `Dear {firstName},

Welcome to ceramic brussels. Your personal password for the exhibitors platform is

{code}

Enter it at {link} to find the exhibitor guide, the forms and their deadlines, the agenda and the practical information for the fair. The password is yours alone; type it in any case, with or without the hyphens.

The ceramic brussels team
{contact}`;

/** An exhibitor's password, in its plain text. */
async function mailExhibitorCode(guest: { first_name: string; last_name: string; email: string }, code: string, origin: string): Promise<MailOutcome> {
  const to = guest.email;
  const apiKey = brevoKey();
  if (!apiKey) {
    if (mailDryRun()) {
      console.warn('[vip] APPLY_DRY_RUN: code not mailed', JSON.stringify({ to, code }));
      return { sent: false, to, reason: 'dry-run' };
    }
    return { sent: false, to, reason: 'unconfigured' };
  }
  try {
    const cfg = await settings();
    const values = {
      firstName: guest.first_name?.trim() || 'guest',
      lastName: guest.last_name ?? '',
      code,
      link: new URL(localePath(DEFAULT_LOCALE, PLATFORM_PATH), mailSite(origin)).href,
      contact: cfg.contactEmail ?? '',
    };
    const toName = `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim();
    await sendMail(apiKey, {
      sender: senderFor(cfg.senderName || cfg.siteName, cfg.senderEmail),
      to: [toName ? { email: to, name: toName } : { email: to }],
      ...(cfg.contactEmail ? { replyTo: { email: cfg.contactEmail } } : {}),
      subject: fill(cfg.exhibitorCodeSubject || DEFAULT_EXHIBITOR_SUBJECT, values),
      text: fill(cfg.exhibitorCodeText || DEFAULT_EXHIBITOR_TEXT, values),
    });
    return { sent: true, to };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[vip] code not mailed:', detail);
    return { sent: false, to, reason: 'failed', detail };
  }
}

/** A guest's code: the VIP welcome or "already a member" reminder, or an exhibitor's password. */
export const mailVipCode = (
  guest: { first_name: string; last_name: string; email: string; audience?: RowAudience },
  code: string,
  origin: string,
  kind: 'code' | 'member' = 'code',
) => (guest.audience === 'exhibitor' ? mailExhibitorCode(guest, code, origin) : mailVip(kind, guest, origin, code));
