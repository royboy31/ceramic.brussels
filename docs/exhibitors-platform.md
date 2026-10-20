# The exhibitors platform

Plan of 2026-10-19, from the two Figma frames beside the exhibitors pages:
`1813:716` ("exhibitors platform FORM", the locked state) and `1813:964`
(the platform page). Kamindu owns everything here except the styling pass,
which is Lilanga's.

## What the design asks for

A password-protected page for the ~100 participating galleries, hanging off
the exhibitors listing ("← back to all exhibitors"):

- **The locked state** (`1813:716`): "are you a participating gallery? ↓
  Please log in with your personal password to enter the exhibitors
  platform" - one password field, ENTER - beside "forgot your password?
  Please write to Tiphaine Quéguineur at tiphaine@ceramic.brussels". No
  request form: lost passwords go to Tiphaine by email.
- **The platform** (`1813:964`): exhibitor guide (embedded catalogue), three
  forms with deadlines (booth options + lighting before 4 Dec, badges and
  (un)loading slots + insurance before 8 Jan, dinner before 13 Jan), an
  agenda calendar (Dec-Jan: deadlines, montage, fair days), communication
  kit (logos, colour palette), useful links, Tiphaine's contact, booth
  photos, the Hoxton deal (CERAMIC27), transport partner Embelco.

## How it works - the VIP machinery, realm apart

"Personal password" = a personal code from the same generator as the VIP
codes (docs/vip-access.md). One guest table, one KV namespace, one pepper,
one enter route; what keeps the two doors separate:

- **`audience` on `guests`** (migration `0004_exhibitor_audience.sql`):
  `'vip'` or `'exhibitor'`. `findGuestByCode` filters on it, so a code only
  ever opens its own door. One email is one row, so an address is in one
  list or the other - moving someone means delete and re-add (new code).
  **Apply the migration before deploying this code**
  (`npx wrangler d1 migrations apply ceramic-brussels-admin --remote`):
  the column is additive, so old code is unaffected, but new code selects it.
- **Session realms** (`vipSession.ts` `REALMS`): the platform session lives
  in its own cookie `cb_exh` and its own KV prefix `x:`, so a VIP session
  can never open the platform nor the other way round. Revocation ends both
  prefixes (vipGuests.ts `endSessions`, and the CLI's).
- **One address, two states.** Unlike the VIP hub there is no separate
  access page: `/[lang]/exhibitors/platform/` is mounted on request
  (`vip-routes.mjs` → `src/server/routes/exhibitors-platform.astro`), never
  prerendered, and `src/middleware.ts` (`platformGate`) decides the state
  through `locals.exhibitorEntered` - an exhibitor session or the editors'
  preview cookie. Everyone sees the same URL; only what it renders differs.
  Both states are `private, no-store` and `noindex, nofollow`; the paths
  ride in `_vip-paths.json` → `_routes.json` and robots.txt with the VIP
  locked tabs. In `astro dev` there is no Worker: the platform renders
  entered, as the VIP tabs render unlocked there.
- **The form posts to `/api/vip/enter/` with `audience=exhibitor`** (and
  `/api/vip/leave/` the same), so the existing throttle and the Cloudflare
  rate limiting rule cover both doors. A wrong code returns to the platform
  address with `?error=code`.
- **Content is a `page` document**: section "exhibitors", English slug
  `platform`, an ordinary section stack (`getPlatformPage` in queries.ts).
  Tiphaine owns the forms, deadlines, agenda and hours; the page renders
  live on every request, so a publish shows immediately, no rebuild. The
  dataset is public by design - the gate protects the address, not the API -
  so nothing secret goes on the page (the same accepted trade-off as the
  VIP tabs, and why the Hoxton code stays a D1 setting on the VIP side).

## Issuing the passwords

Two ways, the same as VIP:

- **The Studio** (2026-10-19): the VIP guests tool has a **VIPs /
  Exhibitors** switch in its header. On the Exhibitors screen, "Add a
  guest" needs only an email (names optional everywhere since the nameless
  codes); the password is generated, shown, and emailed through Brevo with
  its own text - Site settings → VIP → "Exhibitor password email", stock
  English when empty, `{link}` filled with the platform's address. Import
  CSV and "Export with codes" work per screen; an import that meets an
  email already on the *other* list leaves it alone and says so.
- **The CLI**: `npm run vip -- --import exhibitors.csv --audience
  exhibitor` (same sheet shape, codes written back for the mailing),
  `--add x@y.z --audience exhibitor` for one.

`/api/vip/request/` also takes `audience=exhibitor` and files a pending
exhibitor row - the door is open should the platform ever carry a request
form, though the design says "write to Tiphaine" instead.

## The page and the calendar (built 2026-10-20)

The agenda calendar is a page-builder block, `agendaSection` - the usual
three places plus the thumbnail. Each `agendaEntry` is a label, a kind, a
date, an optional end date it repeats until, detail lines and a link; the
Monday-first month grid draws itself around the entries, the kind colours
the day (deadline acid, payment violet, build-up grey, fair ink-on-ground),
deadline and payment entries close on the bold DEADLINE word, and below
700px the grid gives way to a list of the same entries. `date` and
`endDate` are in stegaFilter's `PLAIN_KEYS`.

`scripts/seed-exhibitors-platform-page.mjs` wrote and published
`page-exhibitors-platform` from the frame: intro, the calendar's eleven
dates (the design's French beside English and Dutch), useful links, the
Hoxton deal, Tiphaine's contact, Embelco. Verified on the kamindu preview
in EN and FR.

## Still to do

- Lilanga: the styling pass on both states to the frames (the two-column
  zigzag; today the blocks stack), and the entry point - where the public
  exhibitors pages link to the platform (a pill in the band, or a menu row
  via a typed path; the address is noindexed and disallowed either way).
- Editors/Tiphaine, on the page: the exhibitor guide embed, the three form
  links (the deadlines are already on the calendar), the communication kit
  (logos, colour palette), the booth photos.
- Editors: the "Exhibitor password email" text in Site settings → VIP, if
  the stock English will not do.
- Tiphaine's gallery list through the import; send her the codes CSV.

Migration 0004 was applied to the remote D1 and the whole flow verified on
the kamindu preview on 2026-10-20: wrong code → `?error=code`, a code typed
lower-case enters, leave returns to the form, and neither realm's session
opens the other's door. The same check caught the page rendering without
any CSS: the dev wrapper in src/pages and the injected route both claimed
the pattern, and the Worker matched the style-less file-based entry - which
is why the route is now the wrapper alone, flipped to on-demand by
vip-routes.mjs (`astro:route:setup`) when the runtime is on.
