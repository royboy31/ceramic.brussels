import { sanityClient } from 'sanity:client';
import { DEFAULT_LOCALE } from '../lib/locales';
import { localePath } from '../lib/i18n';
import { brevoKey, fill, mailDryRun, sendMail, senderFor } from './mail';

/**
 * A VIP's code, mailed to them (docs/vip-access.md). The Studio's VIP tool
 * sends it when a guest is added, approved or given a new code, and on its
 * "Send by email" button; an import never does - the invitation mailing is
 * the team's, from the export.
 *
 * The text is Site settings → VIP → "Code email", with the guest's name,
 * the code, the access page and the VIP address filled in, and a stock
 * English text when the team wrote none: the guest list keeps no language.
 * The outcome goes back to the tool, so an editor always knows whether the
 * guest has the code or must be sent it by hand.
 */

export type MailOutcome =
  | { sent: true; to: string }
  | { sent: false; to: string; reason: 'unconfigured' | 'dry-run' | 'failed'; detail?: string };

interface CodeMailSettings {
  senderName?: string;
  senderEmail?: string;
  contactEmail?: string;
  codeSubject?: string;
  codeText?: string;
  siteName?: string;
}

const DEFAULT_SUBJECT = 'Your VIP code for ceramic brussels';
const DEFAULT_TEXT = `Dear {firstName},

Welcome to the VIP programme of ceramic brussels. Your personal access code is

{code}

Enter it at {link} to open the VIP programme, the VIP lounge and the hotel deal. The code is yours alone; type it in any case, with or without the hyphens.

The ceramic brussels VIP team
{contact}`;

async function settings(): Promise<CodeMailSettings> {
  const result = await sanityClient.fetch<CodeMailSettings | null>(
    `*[_type == "siteSettings"][0]{
      "senderName": vip.senderName,
      "senderEmail": vip.senderEmail,
      "contactEmail": coalesce(vip.contactEmail, contactEmail),
      "codeSubject": vip.codeSubject,
      "codeText": vip.codeText,
      siteName
    }`,
  );
  return result ?? {};
}

/** The access page on the site the code is for: the canonical host, or the one the request came in on. */
const accessLink = (origin: string) => new URL(localePath(DEFAULT_LOCALE, 'vip/access'), import.meta.env.PUBLIC_SITE_URL || origin).href;

export async function mailVipCode(
  guest: { first_name: string; last_name: string; email: string },
  code: string,
  origin: string,
): Promise<MailOutcome> {
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
      firstName: guest.first_name,
      lastName: guest.last_name,
      code,
      link: accessLink(origin),
      contact: cfg.contactEmail ?? '',
    };
    await sendMail(apiKey, {
      sender: senderFor(cfg.senderName || cfg.siteName, cfg.senderEmail),
      to: [{ email: to, name: `${guest.first_name} ${guest.last_name}` }],
      ...(cfg.contactEmail ? { replyTo: { email: cfg.contactEmail } } : {}),
      subject: fill(cfg.codeSubject || DEFAULT_SUBJECT, values),
      text: fill(cfg.codeText || DEFAULT_TEXT, values),
    });
    return { sent: true, to };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[vip] code not mailed:', detail);
    return { sent: false, to, reason: 'failed', detail };
  }
}
