import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, Spinner, Stack, Text, TextInput } from '@sanity/ui';
// @sanity/ui v4 splits its entry points; the toast API is its own subpath.
import { useToast } from '@sanity/ui/toast';
import { useClient } from 'sanity';

/**
 * VIP guests, inside the Studio (docs/vip-access.md).
 *
 * The guest list is not Sanity content and must never be: this dataset
 * answers queries with no credentials at all, and the list is some 3,000
 * people's names and emails. It lives in Cloudflare D1, and everything here
 * goes through /api/vip/admin on the same origin.
 *
 * Only an administrator of the Sanity project gets in. Each call carries the
 * Studio's own token; the server checks it against Sanity, uses it for that
 * and throws it away (src/server/sanityIdentity.ts). An editor sees a note
 * saying so and nothing else.
 *
 * What an administrator does here: grant or deny the requests the "not a VIP
 * yet?" form files, add a guest by hand, edit, revoke, reissue a code,
 * delete, import the team's spreadsheet and export the list with codes for
 * the invitation mailing. The codes themselves are made the way they always
 * were - nothing here stores one.
 */

/** Navbar glyph. Local rather than from `@sanity/icons`, like the other icons here. */
export function VipToolIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="4.5" y="7.5" width="16" height="11" rx="1.5" />
      <path d="M8 11l1.6 4 1.6-4M13.2 11v4M15.4 15v-4h1.4a1.2 1.2 0 010 2.4h-1.4" />
    </svg>
  );
}

type Status = 'pending' | 'approved' | 'denied';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  function: string;
  status: Status;
  revoked: boolean;
  entries: number;
  lastEntryAt: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  createdAt: string;
  code?: string;
}

type Filter = 'pending' | 'approved' | 'denied' | 'revoked' | 'all';

/** What became of mailing a code (src/server/vipMail.ts). */
type Mail = { sent: true; to: string } | { sent: false; to: string; reason: 'unconfigured' | 'dry-run' | 'failed'; detail?: string };
type Coded = { guest: Guest; code: string | null; mail?: Mail };

function mailLine(mail: Mail | undefined): string {
  if (!mail) return 'Not emailed.';
  if (mail.sent) return `Emailed to ${mail.to}.`;
  if (mail.reason === 'unconfigured') return 'Not emailed: the site has no email service connected (BREVO_API_KEY). Send it yourself.';
  if (mail.reason === 'dry-run') return 'Not emailed: this preview only logs email. Send it yourself.';
  return `Not emailed: ${mail.detail ?? 'the email service refused it'}. Send it yourself, or try again below.`;
}
type Fields = Pick<Guest, 'firstName' | 'lastName' | 'email' | 'institution' | 'function'>;

const NEWLINE = String.fromCharCode(10);
const SHOWN = 200;
const IMPORT_CHUNK = 300;

let studioToken: string | undefined;

/**
 * The Studio keeps its token in localStorage under
 * `__studio_auth_token_<projectId>`, shape `{ token?: string }`. The client
 * usually exposes the same value, but not on a cookie-authenticated session.
 */
function readStudioToken(projectId?: string): string | undefined {
  if (!projectId || typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`__studio_auth_token_${projectId}`);
    return raw ? (JSON.parse(raw)?.token as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/vip/admin/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...(studioToken ? { 'x-sanity-token': studioToken } : {}) },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const answer = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(answer.error ?? `Failed (${response.status})`, response.status);
  return answer as T;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/* ------------------------------------------------------------------ csv */

/** The parser of scripts/vip-guests.mjs: commas or semicolons, quoted cells. */
function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const code = text.charCodeAt(i);
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';') {
      row.push(cell);
      cell = '';
    } else if (code === 10 || code === 13) {
      if (code === 13 && text.charCodeAt(i + 1) === 10) i++;
      row.push(cell);
      lines.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    lines.push(row);
  }
  return lines.filter((r) => r.some((v) => v.trim()));
}

/** Which column is which, from the heading, in the three languages the team writes. */
const COLUMNS: Record<keyof Fields, RegExp> = {
  firstName: /^(first\s*name|firstname|prenom|prénom|voornaam|first)$/i,
  lastName: /^(last\s*name|lastname|surname|name|nom|naam|achternaam|last|family\s*name)$/i,
  email: /^(e-?mail|email\s*address|adresse\s*e-?mail|courriel|mail)$/i,
  institution: /^(institution|organisation|organization|company|gallery|galerie|instelling|organisatie|société|societe)$/i,
  function: /^(function|fonction|functie|role|title|job\s*title|position)$/i,
};

function readSheet(text: string): Fields[] {
  const [header = [], ...data] = parseCsv(text.replace(/^\uFEFF/, ''));
  const index: Partial<Record<keyof Fields, number>> = {};
  header.forEach((h, i) => {
    const key = (Object.keys(COLUMNS) as (keyof Fields)[]).find((k) => COLUMNS[k].test(h.trim()));
    if (key && index[key] === undefined) index[key] = i;
  });
  for (const k of ['firstName', 'lastName', 'email'] as const) {
    if (index[k] === undefined) throw new Error(`No "${k}" column. Headings seen: ${header.join(' | ')}`);
  }
  const get = (r: string[], k: keyof Fields) => (index[k] === undefined ? '' : (r[index[k]!] ?? '').trim());
  return data
    .map((r) => ({
      firstName: get(r, 'firstName'),
      lastName: get(r, 'lastName'),
      email: get(r, 'email').toLowerCase(),
      institution: get(r, 'institution'),
      function: get(r, 'function'),
    }))
    .filter((g) => g.email);
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",;]/.test(s) || s.includes(NEWLINE) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ----------------------------------------------------------------- tool */

export function VipTool() {
  const client = useClient({ apiVersion: '2021-06-07' });
  studioToken = client.config().token ?? readStudioToken(client.config().projectId);

  const toast = useToast();
  const say = useCallback(
    (status: 'error' | 'success' | 'warning', title: string) => toast.push({ status, title, duration: 7000 }),
    [toast],
  );

  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [blocked, setBlocked] = useState<{ status: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Guest | 'new' | null>(null);
  const [shown, setShown] = useState<{ guest: Guest; code: string; note?: string; mail?: Mail } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { guests: list } = await api<{ guests: Guest[] }>({ action: 'list' });
      setGuests(list);
      setBlocked(null);
    } catch (error) {
      const e = error as ApiError;
      setBlocked({ status: e.status ?? 0, text: e.message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, ok?: string | ((result: T) => string)): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await action();
        if (ok) say('success', typeof ok === 'string' ? ok : ok(result));
        await load();
        return result;
      } catch (error) {
        say('error', (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load, say],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, denied: 0, revoked: 0, all: 0 };
    for (const g of guests ?? []) {
      c.all++;
      if (g.revoked) c.revoked++;
      else c[g.status]++;
    }
    return c;
  }, [guests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guests ?? []).filter((g) => {
      if (filter === 'revoked' ? !g.revoked : filter !== 'all' && (g.revoked || g.status !== filter)) return false;
      return !q || `${g.firstName} ${g.lastName} ${g.email} ${g.institution}`.toLowerCase().includes(q);
    });
  }, [guests, filter, search]);

  const decide = (guest: Guest, action: 'approve' | 'deny') =>
    run(() => api<Coded>({ action, id: guest.id }), action === 'approve' ? undefined : `${guest.firstName} ${guest.lastName}: request denied.`).then(
      (result) => {
        if (action === 'approve' && result?.code) setShown({ guest: result.guest, code: result.code, note: `Approved. ${mailLine(result.mail)}`, mail: result.mail });
      },
    );

  const showCode = (guest: Guest) =>
    run(() => api<{ code: string | null }>({ action: 'code', id: guest.id })).then((result) => {
      if (result?.code) setShown({ guest, code: result.code });
    });

  const reissue = (guest: Guest) => {
    if (!window.confirm(`Give ${guest.firstName} ${guest.lastName} a new code? The one they have stops working, and they are signed out.`)) return;
    void run(() => api<Coded>({ action: 'reissue', id: guest.id })).then((result) => {
      if (result?.code) setShown({ guest: result.guest, code: result.code, note: `New code; the old one no longer works. ${mailLine(result.mail)}`, mail: result.mail });
    });
  };

  const mailCode = (guest: Guest) =>
    run(() => api<Coded>({ action: 'mail', id: guest.id })).then((result) => {
      if (!result) return;
      say(result.mail?.sent ? 'success' : 'error', mailLine(result.mail));
      setShown((s) => (s && s.guest.id === guest.id ? { ...s, note: undefined, mail: result.mail } : s));
    });

  const remove = (guest: Guest) => {
    if (!window.confirm(`Delete ${guest.firstName} ${guest.lastName} from the guest list? Their code stops working. This cannot be undone.`)) return;
    void run(() => api({ action: 'delete', id: guest.id }), `${guest.firstName} ${guest.lastName} deleted.`);
  };

  const importFile = async (file: File) => {
    let rows: Fields[];
    try {
      rows = readSheet(await file.text());
    } catch (error) {
      say('error', (error as Error).message);
      return;
    }
    if (!rows.length) return say('error', 'No rows with an email in that file.');
    if (!window.confirm(`Import ${rows.length} guest(s) from ${file.name}? New emails are added as approved; everyone already in the list keeps their code.`)) return;
    await run(
      async () => {
        const total = { created: 0, approved: 0, unchanged: 0, rejected: [] as string[] };
        for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
          const part = await api<typeof total>({ action: 'import', rows: rows.slice(i, i + IMPORT_CHUNK) });
          total.created += part.created;
          total.approved += part.approved;
          total.unchanged += part.unchanged;
          total.rejected.push(...part.rejected);
        }
        return total;
      },
      (t) =>
        `${t.created} added, ${t.approved} pending request(s) approved, ${t.unchanged} already in the list` +
        (t.rejected.length ? `, ${t.rejected.length} row(s) skipped (no name or no valid email)` : '') +
        '.',
    );
  };

  const exportList = () =>
    run(
      async () => {
        const all: Guest[] = [];
        let offset: number | null = 0;
        while (offset !== null) {
          const page: { guests: Guest[]; next: number | null } = await api({ action: 'export', offset });
          all.push(...page.guests);
          offset = page.next;
        }
        const header = ['first name', 'last name', 'email', 'institution', 'function', 'code', 'status', 'entries', 'last entry'];
        const lines = all.map((g) =>
          [g.firstName, g.lastName, g.email, g.institution, g.function, g.code, g.revoked ? 'revoked' : g.status, g.entries, g.lastEntryAt ?? '']
            .map(csvCell)
            .join(','),
        );
        download('guests-with-codes.csv', [header.join(','), ...lines].join(NEWLINE) + NEWLINE);
        return all.length;
      },
      (n) => `${n} guest(s) exported. Keep that file private.`,
    );

  if (blocked) {
    return (
      <Box padding={4}>
        <Card tone={blocked.status === 403 ? 'caution' : 'critical'} padding={4} radius={2} border>
          <Stack gap={3}>
            <Text weight="semibold">{blocked.status === 403 ? 'Administrators only' : 'The guest list is not available here'}</Text>
            <Text size={1}>{blocked.text}</Text>
            {blocked.status !== 403 && (
              <Text size={1} muted>
                The list lives with the deployed site. On a local dev server there is no database: open the Studio on the
                live or the preview address.
              </Text>
            )}
          </Stack>
        </Card>
      </Box>
    );
  }

  const filters: [Filter, string][] = [
    ['pending', 'Requests'],
    ['approved', 'Approved'],
    ['denied', 'Denied'],
    ['revoked', 'Revoked'],
    ['all', 'All'],
  ];

  return (
    <Box padding={4} style={{ overflow: 'auto', height: '100%' }}>
      <Stack gap={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Heading size={2}>VIP guests</Heading>
          <Flex gap={2} wrap="wrap">
            <Button text="Add a guest" tone="primary" fontSize={1} disabled={busy} onClick={() => setEditing('new')} />
            <Button text="Import CSV" mode="ghost" fontSize={1} disabled={busy} onClick={() => fileInput.current?.click()} />
            <Button text="Export with codes" mode="ghost" fontSize={1} disabled={busy || !guests?.length} onClick={() => void exportList()} />
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void importFile(file);
              }}
            />
          </Flex>
        </Flex>

        <Card padding={3} radius={2} tone="primary" border>
          <Text size={1}>
            A request from the site's "not a VIP yet?" form waits under Requests until you approve or deny it; its code
            opens nothing before that. Approving a guest, adding one or giving them a new code shows the code and emails
            it to them (the text is Site settings → VIP). An import emails nobody: the invitation mailing is yours, from
            the export, and "Send by email" mails one guest's code at a time. A spreadsheet needs the columns first name,
            last name and email (institution and function are optional).
          </Text>
        </Card>

        <Flex gap={2} wrap="wrap" align="center">
          {filters.map(([key, label]) => (
            <Button
              key={key}
              text={`${label} (${counts[key]})`}
              fontSize={1}
              mode={filter === key ? 'default' : 'ghost'}
              tone={key === 'pending' && counts.pending > 0 ? 'caution' : 'default'}
              onClick={() => setFilter(key)}
            />
          ))}
          <Box flex={1} style={{ minWidth: '14rem' }}>
            <TextInput fontSize={1} placeholder="Search name, email, institution" value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
          </Box>
        </Flex>

        {!guests ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : visible.length === 0 ? (
          <Card padding={4} radius={2} border>
            <Text size={1} muted>
              {filter === 'pending' && !search ? 'No requests waiting.' : 'Nobody here.'}
            </Text>
          </Card>
        ) : (
          <Stack gap={2}>
            {visible.slice(0, SHOWN).map((g) => (
              <Card key={g.id} padding={3} radius={2} border tone={g.revoked || g.status === 'denied' ? 'transparent' : 'default'}>
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <Stack gap={2}>
                    <Flex gap={2} align="center" wrap="wrap">
                      <Text weight="semibold">
                        {g.firstName} {g.lastName}
                      </Text>
                      {g.revoked ? (
                        <Badge tone="critical" fontSize={0}>
                          revoked
                        </Badge>
                      ) : (
                        <Badge tone={g.status === 'approved' ? 'positive' : g.status === 'pending' ? 'caution' : 'critical'} fontSize={0}>
                          {g.status === 'pending' ? 'request' : g.status}
                        </Badge>
                      )}
                    </Flex>
                    <Text size={1} muted>
                      {[g.email, g.institution, g.function].filter(Boolean).join(' · ')}
                    </Text>
                    <Text size={0} muted>
                      {[
                        g.requestedAt && `asked ${formatDate(g.requestedAt)}`,
                        g.decidedAt && `${g.status} ${formatDate(g.decidedAt)}${g.decidedBy ? ` by ${g.decidedBy}` : ''}`,
                        g.entries > 0 && `entered ${g.entries}×, last ${formatDate(g.lastEntryAt)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || `added ${formatDate(g.createdAt)}`}
                    </Text>
                  </Stack>

                  <Flex gap={2} wrap="wrap">
                    {g.status !== 'approved' && <Button text="Approve" tone="positive" fontSize={1} disabled={busy} onClick={() => void decide(g, 'approve')} />}
                    {g.status === 'pending' && <Button text="Deny" tone="critical" mode="ghost" fontSize={1} disabled={busy} onClick={() => void decide(g, 'deny')} />}
                    {g.status === 'approved' && !g.revoked && (
                      <>
                        <Button text="Show code" mode="ghost" fontSize={1} disabled={busy} onClick={() => void showCode(g)} />
                        <Button text="New code" mode="ghost" fontSize={1} disabled={busy} onClick={() => reissue(g)} />
                        <Button
                          text="Revoke"
                          mode="ghost"
                          tone="caution"
                          fontSize={1}
                          disabled={busy}
                          onClick={() => void run(() => api({ action: 'revoke', id: g.id }), `${g.firstName} ${g.lastName}: code revoked, signed out.`)}
                        />
                      </>
                    )}
                    {g.revoked && (
                      <Button
                        text="Restore"
                        mode="ghost"
                        fontSize={1}
                        disabled={busy}
                        onClick={() => void run(() => api({ action: 'restore', id: g.id }), `${g.firstName} ${g.lastName}: the same code works again.`)}
                      />
                    )}
                    <Button text="Edit" mode="ghost" fontSize={1} disabled={busy} onClick={() => setEditing(g)} />
                    <Button text="Delete" mode="ghost" tone="critical" fontSize={1} disabled={busy} onClick={() => remove(g)} />
                  </Flex>
                </Flex>
              </Card>
            ))}
            {visible.length > SHOWN && (
              <Text size={1} muted>
                Showing the first {SHOWN} of {visible.length}. Search to narrow it down.
              </Text>
            )}
          </Stack>
        )}
      </Stack>

      {editing && (
        <GuestDialog
          guest={editing === 'new' ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => {
            const target = editing;
            setEditing(null);
            if (target === 'new') {
              void run(() => api<Coded>({ action: 'add', ...fields })).then((result) => {
                if (result?.code) setShown({ guest: result.guest, code: result.code, note: `Added. ${mailLine(result.mail)}`, mail: result.mail });
              });
            } else {
              void run(() => api<Coded & { codeChanged: boolean }>({ action: 'update', id: target.id, ...fields }), 'Saved.').then(
                (result) => {
                  if (result?.codeChanged && result.code) {
                    setShown({
                      guest: result.guest,
                      code: result.code,
                      note: `The first name is part of the code, so the code changed with it; the old one no longer works. ${mailLine(result.mail)}`,
                      mail: result.mail,
                    });
                  }
                },
              );
            }
          }}
        />
      )}

      {shown && (
        <Dialog id="vip-code" header={`${shown.guest.firstName} ${shown.guest.lastName}`} width={1} onClose={() => setShown(null)}>
          <Box padding={4}>
            <Stack gap={4}>
              {shown.note && <Text size={1}>{shown.note}</Text>}
              <Card padding={4} radius={2} tone="positive" border>
                <Text size={3} weight="semibold" style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {shown.code}
                </Text>
              </Card>
              <Text size={1} muted>
                {shown.guest.email}. Typed in any case, with or without the hyphens.
                {shown.mail && !shown.note ? ` ${mailLine(shown.mail)}` : ''}
              </Text>
              <Flex gap={2}>
                <Button
                  text="Copy"
                  tone="primary"
                  onClick={() => navigator.clipboard.writeText(shown.code).then(() => say('success', 'Code copied.'), () => say('error', 'Could not copy.'))}
                />
                <Button text={shown.mail?.sent ? 'Send again' : 'Send by email'} mode="ghost" disabled={busy} onClick={() => void mailCode(shown.guest)} />
                <Button text="Close" mode="ghost" onClick={() => setShown(null)} />
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </Box>
  );
}

function GuestDialog({
  guest,
  busy,
  onClose,
  onSubmit,
}: {
  guest: Guest | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (fields: Fields) => void;
}) {
  const [fields, setFields] = useState<Fields>({
    firstName: guest?.firstName ?? '',
    lastName: guest?.lastName ?? '',
    email: guest?.email ?? '',
    institution: guest?.institution ?? '',
    function: guest?.function ?? '',
  });
  const set = (key: keyof Fields) => (event: React.FormEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setFields((f) => ({ ...f, [key]: value }));
  };
  const ready = fields.firstName.trim() && fields.lastName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim());

  const field = (key: keyof Fields, label: string, props: Record<string, unknown> = {}) => (
    <Stack gap={2}>
      <Text size={1} weight="medium">
        {label}
      </Text>
      <TextInput value={fields[key]} onChange={set(key)} {...props} />
    </Stack>
  );

  return (
    <Dialog id="vip-guest" header={guest ? 'Edit guest' : 'Add a guest'} width={1} onClose={onClose}>
      <Box padding={4}>
        <Stack gap={4}>
          <Grid columns={2} gap={3}>
            {field('firstName', 'First name')}
            {field('lastName', 'Last name')}
          </Grid>
          {field('email', 'Email', { type: 'email', readOnly: !!guest })}
          {guest && (
            <Text size={1} muted>
              The email is what the guest's code is made from, so it cannot change. For a new address, delete this guest and add them again.
            </Text>
          )}
          <Grid columns={2} gap={3}>
            {field('institution', 'Institution')}
            {field('function', 'Function')}
          </Grid>
          {!guest && (
            <Text size={1} muted>
              Added as approved: their code works straight away, is shown next and is emailed to them.
            </Text>
          )}
          <Flex gap={2}>
            <Button text={guest ? 'Save' : 'Add guest'} tone="primary" disabled={busy || !ready} onClick={() => onSubmit(fields)} />
            <Button text="Cancel" mode="ghost" onClick={onClose} />
          </Flex>
        </Stack>
      </Box>
    </Dialog>
  );
}
