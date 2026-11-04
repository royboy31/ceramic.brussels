import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE } from '../lib/locales';
import { localePath } from '../lib/i18n';
import { brevoKey, mailDryRun, sendMail, senderFor, type Address } from './mail';
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
 */

export type MailOutcome =
  | { sent: true; to: string; messageId?: string; scheduledAt?: string }
  | { sent: false; to: string; reason: 'unconfigured' | 'dry-run' | 'failed'; detail?: string };

export type VipMailKind = 'acknowledgement' | 'code' | 'member' | 'decline';

interface MailSettings {
  senderName?: string;
  senderEmail?: string;
  contactEmail?: string;
  siteName?: string;
}

const APPLICATION_SUBJECT = `Your VIP application, ceramic brussels ${EDITION.year}`;

async function settings(): Promise<MailSettings> {
  const result = await sanityClient.fetch<MailSettings | null>(
    `*[_type == "siteSettings"][0]{
      "senderName": vip.senderName,
      "senderEmail": vip.senderEmail,
      "contactEmail": coalesce(vip.contactEmail, contactEmail),
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
            `We would nevertheless be delighted to welcome you at the fair, held at ${EDITION.venue} from ${EDITION.dates}, and warmly invite you to discover ceramic and the city, our free programme of exhibitions, talks and book launches across Brussels.`,
          ],
          // The "ceramic and the city" page is still to be confirmed (mockup, note 3): the programme hub until then.
          button: { label: 'discover ceramic and the city', href: new URL(localePath(DEFAULT_LOCALE, 'programme'), site).href },
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
    const name = `${guest.first_name} ${guest.last_name}`.trim();
    // Most of the imported list has no first name yet: "Dear guest", never "Dear ,".
    const { subject, mail } = vipMailContent(kind, guest.first_name || 'guest', mailSite(origin), code);
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

/** A guest's code, as the welcome or as the "already a member" reminder. */
export const mailVipCode = (
  guest: { first_name: string; last_name: string; email: string },
  code: string,
  origin: string,
  kind: 'code' | 'member' = 'code',
) => mailVip(kind, guest, origin, code);
