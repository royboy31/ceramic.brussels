import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { verifySanityAdmin } from '../sanityIdentity';

/**
 * POST /api/newsletters/mailchimp - the Studio's newsletter pane
 * (src/sanity/components/NewsletterPane.tsx) talking to Mailchimp.
 *
 * Gate: the Studio's own Sanity token in `x-sanity-token`, checked against
 * Sanity by sanityIdentity.ts - an administrator of this project, nobody
 * else, the same rule as the VIP guest list. No cookie, so nothing a
 * cross-site form could ride on.
 *
 * Key: the MAILCHIMP_API_KEY Pages secret, never in Sanity (the dataset is
 * public) and never in the browser. Its suffix (`-us10`) is the data
 * centre. Without it every action answers 503 and the pane says so.
 *
 * Actions, one per call (`action` in the JSON body):
 *   audiences  the lists and their saved segments, with member counts
 *   test       create or update the campaign, put the HTML in, send a test
 *   prepare    the same, then report how many people it would go to
 *   send       send a prepared campaign - the pane only offers it after
 *              `prepare` and a confirmation showing that number
 *
 * One newsletter is one Mailchimp campaign: its id travels with the
 * document, and the campaign is updated in place until it is sent. A sent
 * campaign is never touched again; editing and sending again makes a new
 * one. The HTML comes from the pane, which renders it with the same code as
 * its preview (src/newsletter/render.ts) - the administrator check is what
 * makes that acceptable.
 */
export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
const fail = (status: number, error: string) => json(status, { ok: false, error });

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const isId = (value: unknown) => typeof value === 'string' && /^[a-z0-9]{1,40}$/i.test(value);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class MailchimpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function mailchimp(key: string) {
  const dc = key.split('-').pop();
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = `Basic ${btoa(`anystring:${key}`)}`;
  return async function call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return {} as T;
    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      const detail = data?.errors?.map((e: any) => `${e.field}: ${e.message}`).join('; ');
      throw new MailchimpError([data?.title, data?.detail, detail].filter(Boolean).join(' - ') || `Mailchimp answered ${response.status}`, response.status);
    }
    return data as T;
  };
}

type Call = ReturnType<typeof mailchimp>;

async function audiences(call: Call) {
  const { lists = [] } = await call('GET', '/lists?count=100&fields=lists.id,lists.name,lists.stats.member_count');
  return Promise.all(
    lists.map(async (l: any) => {
      const { segments = [] } = await call('GET', `/lists/${l.id}/segments?count=200&fields=segments.id,segments.name,segments.member_count,segments.type`);
      return {
        id: l.id,
        name: l.name,
        members: l.stats?.member_count ?? null,
        segments: segments.map((s: any) => ({ id: s.id, name: s.name, members: s.member_count, type: s.type })),
      };
    }),
  );
}

/**
 * The campaign for this newsletter: the one it already has while it is
 * still a draft in Mailchimp, else a new one. From name and reply-to come
 * from the list's own defaults, which Félicie already keeps in Mailchimp.
 */
async function upsert(call: Call, body: Record<string, unknown>) {
  const listId = clean(body.listId, 40);
  if (!isId(listId)) throw new MailchimpError('Choose an audience first.', 400);
  const segment = Number(body.segmentId);
  const subject = clean(body.subject, 150);
  if (!subject) throw new MailchimpError('The newsletter has no subject line.', 400);
  const html = typeof body.html === 'string' ? body.html : '';
  if (html.length < 200 || html.length > 1_500_000) throw new MailchimpError('The newsletter is empty or too large.', 400);

  const list = await call('GET', `/lists/${listId}?fields=campaign_defaults`);
  const recipients: Record<string, unknown> = { list_id: listId };
  if (Number.isInteger(segment) && segment > 0) recipients.segment_opts = { saved_segment_id: segment };
  const settings = {
    subject_line: subject,
    preview_text: clean(body.previewText, 150),
    title: clean(body.title, 100) || subject,
    from_name: list.campaign_defaults?.from_name,
    reply_to: list.campaign_defaults?.from_email,
  };

  let campaign: any = null;
  if (isId(body.campaignId)) {
    campaign = await call('GET', `/campaigns/${body.campaignId}?fields=id,web_id,status`).catch(() => null);
    if (campaign && campaign.status !== 'save') campaign = null;
  }
  campaign = campaign
    ? await call('PATCH', `/campaigns/${campaign.id}`, { recipients, settings })
    : await call('POST', '/campaigns', { type: 'regular', recipients, settings });
  await call('PUT', `/campaigns/${campaign.id}/content`, { html });
  return campaign;
}

export const POST: APIRoute = async ({ request }) => {
  const admin = await verifySanityAdmin(import.meta.env.PUBLIC_SANITY_PROJECT_ID, request.headers.get('x-sanity-token'));
  if (!admin) return fail(403, 'Only a Sanity administrator of this project can send newsletters.');

  const key = getSecret('MAILCHIMP_API_KEY');
  if (!key || !/-us\d+$/.test(key)) return fail(503, 'Mailchimp is not connected yet: the MAILCHIMP_API_KEY secret is missing.');
  const call = mailchimp(key);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, 'Bad request.');
  }

  try {
    switch (body.action) {
      case 'audiences':
        return json(200, { ok: true, audiences: await audiences(call) });

      case 'test': {
        const emails = (Array.isArray(body.emails) ? body.emails : [])
          .map((e) => clean(e, 200).toLowerCase())
          .filter((e) => EMAIL.test(e))
          .slice(0, 5);
        if (!emails.length) return fail(400, 'Give at least one address for the test.');
        const campaign = await upsert(call, body);
        await call('POST', `/campaigns/${campaign.id}/actions/test`, { test_emails: emails, send_type: 'html' });
        return json(200, { ok: true, campaignId: campaign.id, webId: campaign.web_id, status: 'save', sentTo: emails, by: admin.name });
      }

      case 'prepare': {
        const campaign = await upsert(call, body);
        const [full, checklist] = await Promise.all([
          call('GET', `/campaigns/${campaign.id}?fields=id,web_id,status,recipients.recipient_count,recipients.list_name,recipients.segment_text,archive_url`),
          call('GET', `/campaigns/${campaign.id}/send-checklist`),
        ]);
        return json(200, {
          ok: true,
          campaignId: full.id,
          webId: full.web_id,
          status: full.status,
          recipients: full.recipients?.recipient_count ?? null,
          listName: full.recipients?.list_name ?? '',
          segment: full.recipients?.segment_text ?? '',
          ready: !!checklist.is_ready,
          problems: (checklist.items ?? []).filter((i: any) => i.type !== 'success').map((i: any) => `${i.heading}: ${i.details}`),
        });
      }

      case 'send': {
        if (!isId(body.campaignId)) return fail(400, 'Prepare the campaign first.');
        const campaign = await call('GET', `/campaigns/${body.campaignId}?fields=id,status,recipients.recipient_count`);
        if (campaign.status !== 'save') return fail(409, `This campaign is already ${campaign.status}.`);
        // The count the confirmation showed must still be the count: an
        // audience that grew or shrank in between is asked again.
        if (Number(body.expectRecipients) !== campaign.recipients?.recipient_count) {
          return fail(409, `The audience changed: it is now ${campaign.recipients?.recipient_count} people. Prepare again.`);
        }
        await call('POST', `/campaigns/${campaign.id}/actions/send`);
        const after = await call('GET', `/campaigns/${campaign.id}?fields=status,archive_url`);
        console.log(`[newsletter] ${admin.name} sent campaign ${campaign.id} to ${campaign.recipients?.recipient_count}`);
        return json(200, { ok: true, status: after.status, archiveUrl: after.archive_url, recipients: campaign.recipients?.recipient_count, by: admin.name });
      }

      default:
        return fail(400, 'Unknown action.');
    }
  } catch (error) {
    if (error instanceof MailchimpError) return fail(error.status >= 500 ? 502 : error.status === 400 ? 400 : 502, error.message);
    console.error('[newsletter]', error);
    return fail(500, 'Something went wrong talking to Mailchimp.');
  }
};
