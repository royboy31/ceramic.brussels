# ceramic.brussels

Trilingual (EN/FR/NL) site for the Ceramic Brussels art fair. Astro 7, static
output, content from Sanity, hosted on Cloudflare Pages.

`AGENTS.md` is a duplicate of this file, so agent tools that look for either
name find the same instructions. Git tracks them as two separate files — if you
edit one, copy it over the other.

## Who owns what

**Lilanga — frontend design and development.** Everything under `src/pages/`,
`src/layouts/`, `src/components/`, and the styling throughout. This is the
active workstream.

**Kamindu — CMS and multi-site setup.** Everything under `src/sanity/`
(schemas, Studio structure, Studio components), `src/lib/queries.ts`, and the
Cloudflare/deployment configuration.

The boundary matters because the two halves are wired together: a Sanity schema
field only reaches a page if a GROQ query in `src/lib/queries.ts` selects it.
**If you need a field that isn't being returned, ask Kamindu rather than editing
the schema or the query.** Changing a schema without a matching content
migration silently blanks published content, and the Studio is already live for
editors.

## Getting set up

Node **22.12.0 or newer** (enforced by `engines` in package.json).

```sh
git clone https://github.com/royboy31/ceramic.brussels.git
cd ceramic.brussels
npm install
cp .env.example .env
```

Then fill `.env` with:

```
PUBLIC_SANITY_PROJECT_ID=uia5r1rc
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://www.ceramic.brussels
```

That is all the frontend needs. The `production` dataset is ACL-public, so
**reads require no token** — the whole site runs and builds without a secret.
`SANITY_API_WRITE_TOKEN` is only for migrations and seeding, and is Kamindu's
side. Never commit `.env`; it is gitignored, keep it that way.

To log into the Studio at `/studio` you need a Sanity account invited to the
project — ask Kamindu. `localhost:4321` is already allow-listed in Sanity CORS.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

Other scripts: `npm run build` (production build into `dist/`), `npm run
preview` (serve that build), `npm run content` (report which content exists and
which translations are missing).

## Git workflow

These branches already exist on the remote:

| Branch | Role |
| :-- | :-- |
| `main` | Production — builds the live site. **Never push here directly.** |
| `dev` | Staging/integration. Builds to `dev.ceramic-brussels.pages.dev`. |
| `lilanga` | Your working branch. Gets its own preview URL on every push. |
| `kamindu` | Kamindu's working branch. |

```sh
git checkout lilanga
# work, commit
git push
```

Then open a PR into `dev`, check the preview build, and once `dev` looks right
it gets merged to `main`. Every branch push produces its own Cloudflare preview
deployment, so a change can always be seen on a real URL before it goes near
production.

Merge or rebase `dev` into your branch regularly — Kamindu is working in
`src/sanity/` and `src/lib/queries.ts` in parallel.

### Repository access

You need write access to `royboy31/ceramic.brussels` — ask Roy to add you as a
collaborator. For authentication, either sign in through the browser prompt on
your first push, or use a **fine-grained** personal access token. A token needs:

- **Repository access** covering `ceramic.brussels`. A token created before the
  repo existed will not include it.
- **Contents: Read and write** — this is what `git push` actually requires.
- **Pull requests: Read and write**, if you want to open PRs from the CLI.

A fine-grained token with no repository permissions authenticates fine and then
fails the push with `403 Permission denied`, which reads like an access problem
but is a scope problem. `.gitattributes` normalises line endings to LF, so CRLF
on Windows is nothing to worry about.

## Architecture

**Everything is static.** `astro build` emits plain HTML plus assets — no
adapter, no server runtime. Sanity content is fetched at build time and baked
into the HTML, which has two consequences worth internalising:

1. **Drafts are invisible.** The queries are unauthenticated and only see
   published documents. Editing in the Studio is not enough — someone has to
   press Publish.
2. **A publish does not change the live site until a rebuild runs.** In
   production a Sanity webhook triggers that rebuild.

The Studio at `/studio` is a client-side React app on **hash routing** — one
HTML file, with every screen after the `#`. That is why it works as a static
asset and needs no server-side catch-all rule.

### Routing

Routes live under `src/pages/[lang]/`, where `[lang]` is `en`, `fr` or `nl`.
`src/lib/locales.ts` is the single source of truth for the language list and is
used by both the Astro routes and the Sanity schemas, so the two cannot drift.

Astro's built-in `i18n` config is **deliberately not used** — enabling it makes
the dev server 404 the `/studio` route that `@sanity/astro` injects, and the
static build still emits it, so the breakage only shows up in dev. There is a
comment saying so in `astro.config.mjs`. Don't "fix" this by turning it on.

The site is a set of **hubs with tabs**, mirroring the Figma menu. Each hub
is a `[...tab].astro` route: `guest-of-honour`, `art-prize`, `programme`,
`partners`, `visit`, `about`. The tab list, its stable English slugs and
its label keys live in `src/lib/hubs.ts`; the first tab is the hub root
(`/en/art-prize`), the others are `/en/art-prize/laureates` and so on. A
`page` document with a matching `section` and English slug supplies a tab's
text; list tabs (laureates, awards, jury, talks, vendors, people) come from
their own documents. `src/lib/links.ts` turns Sanity `link` and navigation
objects into hrefs, so a menu anchor like `art-prize` + `laureates` lands on
the right tab. The shared pieces are `HubNav`, `Sections`, `Slideshow`,
`PersonCard`, `ExhibitorCard` and `LinkPill` in `src/components/`.

`page` slugs are per-language, which produces genuinely translated URLs
(`/en/about`, `/fr/a-propos`, `/nl/over`). hreflang is generated from those same
slugs via the `altPaths` prop on the layout, so the language switcher and the
alternate tags can never disagree.

### Layout and styling

`src/layouts/Base.astro` wraps every page and holds the global stylesheet,
including the design tokens:

```
--ground --surface --surface-2     backgrounds
--ink --ink-2 --ink-3              text, in descending emphasis
--rule                             borders
--accent                           links and focus rings
--measure (68ch)                   text column width
--shell (1140px)                   page width
--font                             system font stack
```

Dark mode works by redefining those tokens under
`@media (prefers-color-scheme: dark)`. **Use the tokens rather than literal
colours** — a hard-coded hex looks right in light mode and wrong in dark.

There is **no CSS framework and no global stylesheet file**. Page- and
component-specific CSS lives in scoped `<style>` blocks inside the `.astro` file
that uses it. Keep it that way unless you and Kamindu agree otherwise.

Props on `Base.astro`: `lang`, `title`, `description`, `path` (the locale-less
path, used for hreflang), `altPaths` (per-locale paths when slugs differ),
`noIndex`, and `editId` / `editType` so the Edit button can deep-link to the
document being rendered.

### UI strings vs content

Content comes from Sanity. The labels *around* it — nav items, "Read more",
empty states — live in `STRINGS` in `src/lib/i18n.ts`, kept in code
deliberately, because they change with the build and not with an editor.

```astro
const t = useTranslations(lang);
t('news.readMore')
```

**Adding a string means adding it to all three locales.** A missing key falls
back to English rather than breaking, so an untranslated string ships silently —
a shipped English label on a French page is a bug nobody gets warned about.

Also in `i18n.ts`: `localePath(lang, path)` for building links, and
`formatDate` / `formatDateRange` / `formatTime`, which are locale-aware
(`en-GB`, `fr-BE`, `nl-BE`). Use those rather than `toLocaleDateString`.

### Components

- **`SanityImage.astro`** — responsive Sanity image. Emits a real srcset ladder,
  lets the CDN pick the format, and always sets width/height so nothing shifts
  while loading. Props: `image`, `widths`, `sizes`, `aspect`, `loading`, `class`.
  Use it for every Sanity image; never hand-roll an `<img>`.
- **`PortableText.astro`** — renders Sanity rich text: blocks, lists, marks and
  inline figures. Hand-rolled rather than pulled from a package.
  The editor's styling controls are **roles, not values**: the Style dropdown
  offers Lead / Normal / Small / Heading / Subheading / Minor heading / Quote,
  and the toolbar adds three swatch marks — Highlight (`.t-highlight`, acid
  marker), Muted (`.t-muted`) and Inverse (`.t-inverse`, knockout chip). Only
  the name is stored, so the CSS here decides what each one looks like and
  restyling never needs a content migration. The list of roles lives in
  `src/sanity/schemaTypes/objects/richText.ts`; adding one means adding it in
  both places.
- **`EditLink.astro`** — deep-links into the Studio for the document being
  viewed. Shows in `astro dev` only, unless `PUBLIC_SHOW_EDIT_LINKS=true`.

### Data

Page frontmatter calls a helper from `src/lib/queries.ts` — `getHomepage`,
`getCurrentEdition`, `getExhibitors`, `getGuestOfHonour`, `getLaureates`,
`getAwards`, `getPeople`, `getPartners`, `getProgramme`, `getHubPages`,
`getPage`, and so on. Each takes `lang` and returns content already resolved
to that language. Localised fields hold EN/FR/NL together in one document and
**fall back to English when a translation is empty**, so a missing translation
never renders as a blank page.

The content model follows the 2027 Figma design. The shape to keep in mind:

- **Hubs and tabs.** about, art prize, programme, visitors info and partners
  are hub routes with pill tabs. The text tabs are `page` documents with a
  `section` (fetched with `getHubPages(lang, section)`); the list tabs
  (laureates, awards, jury, talks, food & drinks…) come from their own
  documents. Anchors in `navigation` and `link` name those tabs.
- **Edition-scoped data.** Dates, the dates mark, opening hours, tickets, key
  figures, guest of honour, country focus, film and photo gallery live on
  `edition`; the current one comes from `getCurrentEdition`.
- **Images carry their caption.** `figure` has `caption` (artist),
  `workTitle` (render italic) and `year` next to `alt` and `credit`; the
  design's "Artist, *Title*, 2024" line is assembled from those.
- **Links are objects.** A `link` is a route + optional anchor, a document
  reference, or an external URL. Internal ones get "→", external ones "↗".

### Creating and duplicating documents

The Create menu offers **starting points** from `src/sanity/templates.ts`: one
"new tab" per hub (which presets `section`, the field that makes a page a tab
at all), two standalone page shapes, and one per exhibitor kind. They set
initial values only - nothing is locked, and editing a template never touches
documents already made from it, so adding or reworking them is free. Localised
fields are seeded in English alone: an empty translation falls back to English,
a pre-filled English one pretending to be French does not.

`src/sanity/components/DuplicateAction.tsx` replaces Sanity's built-in
Duplicate. The built-in copies the slug as well, leaving two documents claiming
one URL with nothing to warn you - the copy looks finished and the build picks
one. Ours clears the slug and appends "(copy)" to the title, so the duplicate is
visibly unfinished. Everything else carries over, which is the point: a
duplicated exhibitor keeps its edition, artists and images.

**Where the templates actually appear.** The **`+` in the navbar**, and the
create button of any pane wired with `initialValueTemplates` in
`structure.ts`. The New button inside a pane is scoped to that pane's type, so
Laureates offers `laureate` and nothing else - it will never show page or
exhibitor templates, and looking for them there is the obvious wrong turn.

A template can also be linked to directly, which makes a usable bookmark:

    /studio/#/intent/create/type=page;template=page-hub-art-prize/

Only `page` and `exhibitor` have templates. `laureate`, `award` and `person`
do not, so New in those panes gives a bare document.

`README.md` has the full table of document types and where each shows.
`docs/design-inventory.md` and `docs/legacy-site-inventory.md` are the two
inventories the model was derived from — check them before asking what a
field is for.

## Deployment

Cloudflare Pages, connected to this repo. A push to `main` builds production;
any other branch builds a preview. Build command is `npm run build`; the output
directory comes from `pages_build_output_dir` in `wrangler.toml`, not from a
dashboard field. The same goes for build environment variables: Pages ignores
the dashboard ones when `wrangler.toml` exists and reads `[vars]` /
`[env.preview.vars]` from the file, so `PUBLIC_*` values are set there.

`public/_headers` marks `/_astro/*` immutable and forces HTML to revalidate —
without that, a rebuild would never reach anyone holding a cached page.
`public/_redirects` is where legacy URLs from the old Laravel site go at
migration time.

## Site accounts

Editors who do not have a Sanity account are managed in the Studio under
**Users**. This is **Kamindu's** side of the project.

**Why they are not documents.** The `production` dataset is ACL-public: it
answers a GROQ query with no credentials at all, so anything stored in it is
world-readable. A `user` document would publish email addresses and password
hashes to the open internet. The accounts therefore live in **D1**, which is
private, and the Studio screen is a custom tool that administers them over
`/api/users` on the same origin.

| Path | What |
| :-- | :-- |
| `src/sanity/components/UsersTool.tsx` | The Users screen inside the Studio |
| `src/pages/login.astro` | Sign-in for site accounts, and the hand-off into the Studio |
| `functions/` | Pages Functions - auth, sessions, user management, audit |
| `src/server/` | Shared modules those Functions import |
| `migrations/` | D1 schema, applied with `npm run admin:migrate` |

**Managing users needs its own sign-in.** A Sanity login says who you are to
Sanity; it says nothing about whether you may administer these accounts, so the
Users screen asks for D1 credentials of its own.

**Accounts.** `npm run admin:user -- --email x@y.z --name "Name"` creates one
and prints a temporary password, flagged so the person must choose their own on
first sign-in. After the first admin exists, everything else happens in the
Studio.

### How a site account reaches the Studio

The Studio's own login screen only accepts Sanity identities, so it can never
authenticate one of these accounts. What it *does* accept is a token in
`localStorage` under `__studio_auth_token_<projectId>`, holding
`{token, authenticated}` - the key `createAuthStore` reads on boot, and the same
one the Users screen looks at. `/login` and `/studio` are the same origin, so
`/login` can simply write it.

1. `/login` signs the person in against D1, exactly as the Users screen does.
2. `POST /api/auth/studio-token` returns `SANITY_STUDIO_TOKEN` to any signed-in,
   active account, and writes a `studio.token` row into `audit_log`.
3. The page writes that key and navigates to `/studio`, which boots signed in.

**Do not hand the token over as `/studio#token=…`.** `sanity` does support that -
`consumeHashToken` reads it at boot - but **this Studio is on hash routing**, so
the hash is also the route. Both read it: you are signed in *and* dropped on
"Tool not found: token=…" with an empty screen. It was built that way first and
that is exactly what happened.

`auth.providers` in `sanity.config.ts` puts a **Ceramic Brussels account**
button on the Studio's login screen pointing at `/login`, so the loop closes
from either direction. The Studio passes the page it wanted as `?origin=`, and
`/login` returns there - after checking it is same-origin - rather than always
landing on the Studio root.

**`SANITY_STUDIO_TOKEN` is a Pages secret**, a token created in
sanity.io/manage with the narrowest role that lets an editor work. It is not
`SANITY_API_WRITE_TOKEN`: that one is for migrations and imports, its grants are
much wider, and the endpoint refuses to fall back to it - an unset secret
returns 503 rather than handing out the wrong key.

**What this costs, deliberately.** The token reaches the browser, where its
holder can read it out of localStorage and use it from anywhere; it is one
shared credential; Sanity tokens do not expire; and withdrawing it from one
person means rotating it for everyone and having the others sign in again.
Deactivating an account in the Users screen stops that person getting a *new*
token, not one they already hold.

**Attribution.** Edits arrive at Sanity as the token, not as the person, so
Sanity's history cannot tell the team apart - every change reads as the robot
the token belongs to. `audit_log` in D1 records who was handed a token and
when, which is the only trace of the individual. It cannot see the edits
themselves, because those go straight from the Studio to Sanity rather than
through `/api`. Closing that gap means proxying the Sanity API so the token
never leaves the server, which is the larger piece of work this defers.

**Local development does not work on Windows.** `wrangler pages dev` needs
workerd, which crashes with an access violation on that machine. Test on a
branch preview instead - previews share the same D1 database.

**Secrets** live in Pages, never in `wrangler.toml`.

## Importing the old site

The live site at ceramic.brussels still runs **Twill** (Laravel). Its whole
content was captured through the admin at `/admintool` and lives in
`legacy-export/`. This is **Kamindu's** side.

| Path | What |
| :-- | :-- |
| `legacy-export/raw/` | The verbatim capture, 6.5 MB. The source of truth - it cannot be regenerated without a session on the old admin |
| `legacy-export/normalized/` | Per module, locales decoded, blocks assembled, select ids resolved to labels |
| `legacy-export/derived/` | Candidate people, partners, events, laureates and FAQ entries pulled out of the blocks |
| `legacy-export/INVENTORY.md` | Page tree, block composition, facet counts |
| `legacy-export/MAPPING.md` | How each legacy shape maps onto the schemas, and what is still undecided |
| `scripts/import-legacy.mjs` | The importer. `--dry` plans, `--images` uploads, `--only=` narrows |

**Twill kept everything as a page with an ordered list of blocks.** Twelve block
types carried all the structure, so the import is mostly *promoting blocks to
documents*: a `person` block becomes a person, an `event` block becomes a
programmeEvent, and the page a block sat on supplies what the block does not
carry - a person's `groups`, a partner's `tier`, an event's date.

**The import merges, it does not replace.** The seeded `demo-*` documents are
not all disposable: they hold the 2026 laureates and the 2027 exhibitors, which
the old CMS never had. So when a legacy record matches an existing document by
name the importer patches *that* one. Ids are deterministic and only known
fields are set, so a re-run corrects rather than duplicates.

**Match on name *and* edition.** "The jury prize" exists for several years, as
do "preview" and "vernissage" - matching on name alone silently collapses them
into one document. The script refuses to run if two records ever target one id.

**The old site has stale translations.** On the 2027 laureates page the English
bio is the 2027 artist while the French and Dutch are still the 2026 one. The
importer drops a locale whose text names a different laureate and lists it in
`legacy-export/stale-translations.json`; an empty translation falls back to
English, a wrong one does not.

**Images are a separate pass.** `--images` uploads them and caches the result in
`legacy-export/asset-map.json`, so it is resumable and never uploads twice -
**keep that file.** The originals reach 6700px; the old CDN resizes on request,
so `--max-width=2500` moves about 2.2 GB instead of 5.6 GB.

## Gotchas

- **`fixSanityWindowsAlias` in `astro.config.mjs`** works around a Windows path
  bug in `@sanity/astro` 3.5.1. On macOS and Linux it looks like dead code. It
  is not — leave it in.
- **`optimizeDeps.include`** in the same file pre-bundles the Studio's lazy
  panes. Remove it and you get an endless reload loop with "Failed to fetch
  dynamically imported module".
- The build is roughly 487 files / 9.2 MB, most of it the Studio bundle, which
  only downloads when someone actually opens `/studio`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
