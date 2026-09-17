# VIP access

Plan of 2026-09-17, from the VIP frames in Figma. Kamindu owns everything
here except the page markup, which is Lilanga's (see "Frontend" at the end).

## What the design asks for

A **VIP hub** with four tabs, in this order: *about*, *VIP programme*, *VIP
lounge*, *hotel deal*. VIP leaves the programme hub, where it is a tab
today. Figma frames on page `0:1` of the design file:

| Tab | Frame | Locked? | Content |
| :-- | :-- | :-- | :-- |
| about | `897:1285` | no | intro, photo, the "enter your code" box, a *programme overview* teaser (at the fair / beyond the fair), the Hoxton, contact vip@ceramic.brussels |
| VIP programme | `963:400` | yes | on-site / off-site filter, events grouped by day with image, time, text |
| VIP lounge | `982:776` | yes | text, MAD Brussels scenography, an agenda of aperitivos and meet-the-… slots |
| hotel deal | `998:1083` | yes | The Hoxton, the CERAMIC27 code and rate |
| access (locked state) | `1026:1895` | – | "VIP already? enter your code → enter" beside "not a VIP yet? first name, last name, institution, function, email → send form" |

## Decisions taken (Kamindu, 2026-09-17)

1. **One code per VIP**, about 3,000 of them, personal (built from the
   guest's name) and unguessable.
2. **Codes live in Cloudflare D1, sessions in Workers KV, nothing in
   Sanity.** The D1 database the removed site accounts left behind
   (`ceramic-brussels-admin`, Western Europe) is reused for the guest list;
   KV, with its built-in expiry, holds the sessions. The Worker checks a
   session before serving a locked tab and redirects everyone else to the
   access page. No VIP's name or email ever enters the public dataset.
3. **VIP page text stays in the one Studio**, in the production dataset.
   That dataset is public by design, so the text is readable through the
   Sanity API by anyone who knows the project id and the type name - the
   gate protects the pages, not the API. Accepted and to be said to the
   client: the site never links to it, the pages never exist as files, and
   the old site listed VIP tours openly. The one real secret, the hotel
   code, lives in D1 and is rendered by the Worker, never in Sanity. (The
   alternative, a private dataset, is a Sanity Growth feature at $15 per
   seat per month; sanity.io/pricing, 2026-09-17. Not taken.)
4. **Search engines are kept out** of the locked tabs and the access page,
   on every layer (see "Robots").
5. **"Not a VIP yet"** is a second form on the gallery-application pattern:
   an email to the VIP team through Brevo, nothing stored, the team answers
   by hand.

## How it works

**Content, in the Studio.** A `vip` hub in `hubs.ts` and `section: 'vip'`
on `page` for the three text tabs (section stacks as anywhere else). VIP
events keep `programmeEvent` with `section: 'vip'`, plus an on-site /
off-site flag. Site settings gets a **VIP** tab: gate on or off, the access
page's texts, the request form's recipient and sender, the contact address.
With the gate off the tabs are public, which is what the team will want
after the fair.

**Guests, in D1.** The existing database `ceramic-brussels-admin`
(id `5c35303c-7b4e-48f9-9480-d236f7ae4ff5`, weur), bound as `VIP_DB` in
`wrangler.toml` and `wrangler.worker.toml`, production and preview alike.
Its first new migration drops the old `users` and audit tables; `migrations/`
comes back for that. Two tables:

| Table | Columns | Notes |
| :-- | :-- | :-- |
| `guests` | id, code_hash, first_name, last_name, email, institution, function, revoked, created_at, note | `code_hash` = SHA-256 of the code with a pepper secret; the code itself is stored nowhere on the server |
| `settings` | key, value | `hotel_code` and anything else that must not be in Sanity |

D1 is read once per **code entry** and once per **revocation**, never per
page view. Its free tier (5 million reads and 100,000 writes a day) is not
a concern.

**Sessions, in Workers KV.** A namespace `VIP_SESSIONS`, bound in both
wrangler files. KV is Cloudflare's store for exactly this: reads are cached
at the edge (a gate check costs about a millisecond), and every key carries
an expiry, so sessions vanish by themselves and nothing is ever pruned.

- The cookie `cb_vip` is `<guestId>.<random 32 bytes>`.
- The key is `s:<guestId>:<SHA-256 of the random part>`, the value a small
  JSON record (created, user agent), `expirationTtl` 30 days. Hashing the
  random part means a copied namespace cannot be replayed.
- Revoking a guest lists the keys under `s:<guestId>:` and deletes them,
  and sets `revoked` in D1 so no new session can be opened. KV is
  eventually consistent, so a revoked session may survive up to a minute
  at some edges - acceptable here.

**KV's free tier allows 1,000 writes a day across the namespace.** Each
code entry is one write, so on the day the invitations go out logins would
start failing after the thousandth. The Workers Paid plan ($5 a month on
the account that holds the Pages project) makes reads and writes unlimited;
it has to be on **before the mailing**. Check the plan under Workers &
Pages → Plans. The session store is one module, `src/server/vipSession.ts`,
so if the plan is not wanted it can be pointed at a `sessions` table in D1
instead, whose free writes are a hundred times higher.

**Codes.** Format `CB27-<FIRSTNAME>-<6 chars>` from an alphabet without
0/O/1/I, upper-case, hyphens and case ignored on entry. Around 700 million
per first name, and a Cloudflare rate limiting rule on the entry route.

**Entering.** `POST /api/vip/enter/` with `code` and `next` (the path to
return to, same-site only). The Worker hashes the code, looks the guest up
in D1, refuses a revoked one, writes the session to KV, sets the cookie
(HttpOnly, Secure, SameSite=Lax, Path=/, 30 days) and answers 303 to
`next`. A wrong code sends the browser back to the access page with
`error=code`. `POST /api/vip/leave/` deletes the session and clears the
cookie.

**The gate.** `src/middleware.ts`, on the locked tabs' paths in three
languages: read the cookie, one KV read, serve if the session exists, else
**302 to the access page** with `next` set. The preview cookie also opens
the locked tabs, so editors see their work without a code. Under
`astro dev` there is no KV, no D1 and no Worker: the locked tabs render
unlocked, exactly as `/preview/` is absent there; the gate is tried on a
branch preview.

**The locked tabs never exist as files.** They are `prerender = false` and
rendered by the Worker on request (the preview pattern with the ordinary
CDN client), so there is no static copy to fetch around the gate. Answers
are `cache-control: private, no-store`. A short in-Worker cache of the
Sanity query keeps the request count trivial. `scripts/pages-worker.mjs`
adds the locked paths to `_routes.json` from the built hub list.

**Issuing codes.** `scripts/vip-guests.mjs --import guests.csv` reads the
team's spreadsheet (first name, last name, email, institution, function),
generates a code per row, writes the hashes to D1 through `wrangler d1
execute --remote` and writes `guests-with-codes.csv` back for the
invitation mailing. Deterministic on email, so a re-run updates rather than
duplicates and never changes a code already issued. `--revoke <email>`,
`--export` (the list without codes; codes are not recoverable, a lost one is
reissued with `--reissue <email>`). Sending the invitations stays with the
team's mailing tool.

**"Not a VIP yet".** `POST /api/vip/request/` on the `apply.ts` pattern:
validate, honeypot, repeat guard, one email to the VIP team through Brevo,
`APPLY_DRY_RUN` on branch previews, 503 until `BREVO_API_KEY` exists. The
team adds the guest to the spreadsheet, imports, and sends the code.

## Robots

Four layers, because each one alone has a hole:

1. `public/robots.txt` disallows the locked tabs' paths, the access page
   and `/api/`, in all three languages. The about tab stays crawlable: it
   is the marketing page.
2. Every Worker answer on those paths carries `X-Robots-Tag: noindex,
   nofollow`, and the access page's HTML has `<meta name="robots"
   content="noindex, nofollow">` - a disallowed URL can still be listed
   from links alone; the tag stops that once a crawler does get through.
3. The locked tabs are never prerendered, so they are never in the
   sitemap; the access page is static but noindex, and
   `scripts/sitemap-noindex.mjs` already drops noindex pages.
4. Links from the about tab and the hub pills to the locked tabs are
   `rel="nofollow"`.

## Secrets and config

| Where | What |
| :-- | :-- |
| D1 `ceramic-brussels-admin` (exists) | guests and settings; the old users tables dropped by the first migration |
| KV namespace `VIP_SESSIONS` (to create) | sessions, expiring by themselves |
| Workers Paid plan ($5/month) | lifts KV's 1,000 writes a day; on before the mailing |
| Pages secret `VIP_CODE_PEPPER` | hashes the codes; changing it invalidates every code |
| Pages secret `BREVO_API_KEY` | already planned; the request form |
| `wrangler.toml` / `wrangler.worker.toml` | `[[d1_databases]] binding = "VIP_DB"` and `[[kv_namespaces]] binding = "VIP_SESSIONS"`, both files, plus `[env.preview]` |
| Cloudflare rate limiting rule | `/api/vip/enter/`, e.g. 10 per minute per IP |
| `scripts/pages-worker.mjs` | `_routes.json` gains the locked tabs' paths |
| `public/robots.txt` | the disallows above |

Note for the record: the site accounts removed on 2026-09-15 were editor
logins sharing one Sanity write token in this same D1 database. This is a
guest table with no Sanity access of any kind; the objection does not
apply. Revoking `SANITY_STUDIO_TOKEN` at sanity.io/manage and deleting
that Pages secret are still to do by hand - the database itself is no
longer to be deleted.

## Status, 2026-09-17

On main (4dd26f7) and verified end to end on production: the hub, the five
tabs (a first working build, markup for Lilanga), the gate, the three
routes, the session store, the migration (applied: the old tables are
gone), the import script, robots. The KV namespace exists
(`5155f6c4aed24d8f82341a81f96cb005`), the `VIP_CODE_PEPPER` secret is set
for production and preview, the hotel code is set, one test guest is in
and has entered: a code opened a session, the three locked tabs answered,
a wrong code was refused, leaving locked them again. Still to do:

- Roy: the Workers Paid plan before the mailing; a rate limiting rule on
  `/api/vip/enter/`; the Brevo key for the request form.
- Lilanga: the pages to the Figma frames (his branch is behind main).
- Editors: the tabs' text and the VIP events in the Studio.
- The team's spreadsheet through `npm run vip -- --import`.

## Order of work

1. Kamindu: the `vip` hub and section, the events' on-site flag, the VIP
   tab on Site settings, nav strings; VIP out of the programme hub.
2. Kamindu: the KV namespace, both bindings, the migration that clears
   and reshapes the old database, the enter / leave / request routes, the
   gate, the on-request tabs, robots, the import script.
3. Lilanga: the hub, four tabs, the access page and the code box on the
   about tab, from the contract below, against the three-language preview.
4. The team's spreadsheet in, `guests-with-codes.csv` out; a handful of
   codes tried on the preview host; the rate limiting rule; Workers Paid
   on; gate on.
5. Brevo key (Roy) unblocks the request form, as for the application form.

## Frontend

For the pages Lilanga builds:

- Routes: `/[lang]/vip/` (about, public), `/[lang]/vip/programme/`,
  `/[lang]/vip/lounge/`, `/[lang]/vip/hotel-deal/` (locked),
  `/[lang]/vip/access/` (the locked state, public, noindex). Translated
  segments come from `hubs.ts` as for every hub.
- The code box (about tab and access page) is a form: `method="post"
  action="/api/vip/enter/"`, fields `code` and hidden `next` (the path to
  land on). A wrong code returns to the access page with `?error=code`;
  with JavaScript the JSON answer is `{ ok, error?, next? }`.
- The request form: `action="/api/vip/request/"`, fields `firstName`,
  `lastName`, `institution`, `function`, `email`, `lang`, honeypot
  `website`. Answers like the application form (303 to a thank-you page or
  JSON).
- A locked tab's component only ever renders unlocked: the Worker has
  already redirected everyone else. The hotel tab receives `hotelCode` as
  a prop from the Worker; the editor writes `{code}` in the text where it
  goes.
- Strings for the two forms and the access page go in `STRINGS`, all three
  locales.
