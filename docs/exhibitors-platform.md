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

`npm run vip -- --import exhibitors.csv --audience exhibitor` - the same
sheet shape (email required, names optional), codes written back for
Tiphaine's mailing. `--add x@y.z --audience exhibitor` for one. The Studio's
VIP guests tool still manages VIPs only: its add/import write `audience`
'vip' (the column default). Giving the tool an audience filter is the next
step if the team wants to manage exhibitors there too.

## Still to do

- The agenda section block (`agendaSection`): schema + `SECTIONS` branch +
  `PLAIN_KEYS` (`kind`, `date`, `endDate`) are designed, not yet written -
  the calendar is an editor-entered list of dated, coloured, linkable
  entries, and the month grid draws itself. Until it exists the page can
  carry the calendar as an image block.
- Lilanga: the styling pass on both states to the frames, and the entry
  point - where the public exhibitors pages link to the platform (a pill in
  the band, or a menu row via a typed path; the address is noindexed and
  disallowed either way).
- The `page-exhibitors-platform` document itself (editors, or a seed
  script): until it is published the entered state shows the "published
  shortly" line.
- Apply migration 0004 (remote) before the deploy that carries this code.
- Tiphaine's gallery list through the import; send her the codes CSV.
