# ceramic.brussels — the whole project, 0 to 100

This is the training document for anyone (and any Claude Code session)
who has to work on ceramic.brussels the way Kamindu and Lilanga do: the
site, the Studio, the data between them, the server side, email, the VIP
hub, Git, Cloudflare, the keys, and the habits. Read it top to bottom once,
then keep it open. `CLAUDE.md` (= `AGENTS.md`) is the reference card; this
file is the course.

**Since 2026-09-23 Lilanga works across the whole stack**, not only the
frontend half described in `docs/frontend-kickoff.md`. The rules in this
file about schemas, queries and content apply to everyone; they are what
keeps a live Studio from losing content.

---

## 1. What this is

| | |
| :-- | :-- |
| Site | Ceramic Brussels, an art fair. Trilingual: EN / FR / NL. 2027 edition design. |
| Stack | Astro 7 (static output) + Sanity (content) + Cloudflare Pages (hosting) + a small Cloudflare Worker for previews, forms and the VIP gate |
| Repo | `github.com/royboy31/ceramic.brussels` (Roy's account; Kamindu and Lilanga are collaborators) |
| Production | `https://ceramic-brussels.pages.dev` (branch `main`). `www.ceramic.brussels` still serves the **old Twill site** until cutover, planned around mid-October 2026. |
| Staging | `https://dev.ceramic-brussels.pages.dev` (branch `dev`) |
| Previews | `https://<branch>.ceramic-brussels.pages.dev` and `https://<hash>.ceramic-brussels.pages.dev` per push |
| Studio | `/studio` on every deployment and on localhost. One Sanity project, `5hqzhin7`, dataset `production`. |
| People | **Roy** (Perelweb Studio, owns the accounts: GitHub, Cloudflare, Brevo, Sanity billing). **Kamindu** (CMS, data, server, deploy). **Lilanga** (design and frontend). **The client** (Ceramic Brussels team, editors in the Studio; Tiphaine receives gallery applications). |
| Old site | Twill (Laravel) at ceramic.brussels. Its whole content was exported to `legacy-export/` and imported into Sanity. |

Everything the site shows comes from Sanity at **build time**. The Studio
is a React app served as a static file. A Worker handles the few things
that must run on request: draft previews, the two forms, the VIP gate and
the VIP guest list.

---

## 2. Setting up a machine

Node **22.12 or newer**.

```sh
git clone https://github.com/royboy31/ceramic.brussels.git
cd ceramic.brussels
npm install
cp .env.example .env
```

Fill `.env` with at least:

```
PUBLIC_SANITY_PROJECT_ID=5hqzhin7
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://www.ceramic.brussels
```

That is enough to run and build the whole site: the dataset is
**ACL-public**, reads need no token. Then:

```sh
astro dev --background      # dev server on http://localhost:4321
astro dev status            # is it up
astro dev logs              # what it says
astro dev stop
```

Always run the dev server in background mode from Claude Code; a
foreground server blocks the session.

The Studio at `http://localhost:4321/studio` needs a Sanity account that
is a member of the project. Ask Kamindu for an invitation; sign in with
Google, GitHub or email. `localhost:4321` is already in Sanity's CORS list.

Other commands you will use:

| Command | What |
| :-- | :-- |
| `npm run build` | Production build into `dist/`, then the three post-build scripts (Worker layout, legacy redirects, sitemap noindex) |
| `npm run build:preview` | The same with `PREVIEW_RUNTIME=1`, i.e. exactly what Cloudflare builds. Use this to check the Worker compiles. |
| `npm run preview` | Serve `dist/` |
| `npm run content` | Which documents exist, which translations are missing |
| `npm run boundary` | Files this branch changes outside the frontend half (still useful to see what you touched on the CMS side) |
| `npx tsc --noEmit -p tsconfig.json` | Typecheck. Four errors are known and harmless (Sanity's own typings for `Grid columns` and `localeText rows`); anything else is yours. |
| `npm run previews` | Regenerate the section-block thumbnails the Studio shows |
| `npm run templates` | Seed the eleven starter page templates (safe to re-run) |
| `npm run vip -- …` | The VIP guest list from the laptop (see §11) |
| `npm run vip:migrate` | Apply D1 migrations in `migrations/` to the remote database |

---

## 3. Environment variables and secrets

The rule: **`.env` is gitignored and stays that way. Nothing secret goes
into `wrangler.toml`, a commit, a doc, a screenshot or a chat.** Secrets
for the deployed site live in the Cloudflare Pages dashboard as encrypted
secrets. Public values (`PUBLIC_*`) live in `wrangler.toml` and ship in the
browser bundle, which is fine because they identify a public dataset.

| Variable | Where | Who has it | What it does |
| :-- | :-- | :-- | :-- |
| `PUBLIC_SANITY_PROJECT_ID` | `.env`, `wrangler.toml [vars]` | public | `5hqzhin7` |
| `PUBLIC_SANITY_DATASET` | same | public | `production` |
| `PUBLIC_SITE_URL` | same | public | Canonical origin for canonical tags, hreflang, sitemap and the links in emails. `wrangler.toml` sets it per environment. |
| `PUBLIC_SHOW_EDIT_LINKS` | `wrangler.toml [env.preview.vars]` | public | Shows the Edit button on previews. Never on production. |
| `PREVIEW_RUNTIME` + `PUBLIC_PREVIEW_ENABLED` | `wrangler.toml`, both environments | public | Build switch: adds the Cloudflare adapter and the Worker (`/preview/*`, `/api/*`), and gives the Studio its Preview button. Leave unset on a laptop unless you run the Worker locally. |
| `APPLY_DRY_RUN` | `wrangler.toml [env.preview.vars]` only | public | On previews the forms log instead of sending. **Never set on production.** |
| `SANITY_API_WRITE_TOKEN` | `.env` only | Kamindu | Writes to the dataset: migrations, seeding, imports. **Must never reach Cloudflare.** Ask Kamindu if a script needs it. |
| `SANITY_VIEWER_TOKEN` | `.env` (optional), Pages secret both environments | Kamindu / Roy | Read-only token the Worker reads **drafts** with for `/preview/`. Without it previews answer 503. |
| `VIP_CODE_PEPPER` | `.env`, Pages secret both environments | Kamindu | The secret VIP codes are hashed with. The laptop script and the Worker must hold the same value. Changing it invalidates every code. |
| `BREVO_API_KEY` | `.env`, Pages secret **production only** | Roy / Kamindu | Brevo transactional API key. Forms and VIP code emails send with it. Previews keep the dry run on purpose. |
| `SANITY_STUDIO_TOKEN` | Pages secret (legacy) | — | Left over from the removed site accounts. To delete and revoke by hand; nothing reads it. |
| `GITHUB_TOKEN` | `.env` | — | Dead (401). Ignore. |

How to set a Pages secret from the CLI (wrangler is logged in on Kamindu's
machine through OAuth; Roy's account holds the project):

```sh
printf '%s' "the-value" | npx wrangler pages secret put NAME --project-name ceramic-brussels
npx wrangler pages secret list --project-name ceramic-brussels
npx wrangler pages secret list --project-name ceramic-brussels --env preview
```

A secret change takes effect on the **next deploy**, not immediately.

Where the value of each key comes from:

- Sanity tokens: `sanity.io/manage` → project `5hqzhin7` → API → Tokens. Viewer role for the preview token; Editor role for the write token.
- Brevo key: `app.brevo.com` → SMTP & API → API keys, on Roy's Perelweb account.
- The pepper: generated once by Kamindu; ask for it, never regenerate.

---

## 4. How the site is put together

### Static pages, one Worker

`astro build` writes plain HTML into `dist/`. Sanity content is fetched
during the build and baked in. Two consequences to internalise:

1. **Drafts are invisible.** Only published documents reach the site.
2. **Publish does not change the site until a rebuild.** A Sanity webhook fires a Cloudflare deploy hook on every publish (see §7), so in practice "publish, wait about five minutes".

On top of that, every build since 2026-09-06 has `PREVIEW_RUNTIME=1`, so
`@astrojs/cloudflare` adds a Worker that `scripts/pages-worker.mjs` moves
to `dist/_worker.js`. `dist/_routes.json` sends only these paths to it:

| Path | What |
| :-- | :-- |
| `/preview/[lang]/…` | Every page a second time, rendered on request from **drafts** (needs `SANITY_VIEWER_TOKEN`) |
| `/api/preview/enable`, `/api/preview/disable` | The preview cookie door |
| `/api/apply/` | The gallery application form |
| `/api/vip/enter/`, `/api/vip/leave/`, `/api/vip/request/`, `/api/vip/admin/` | The VIP gate, the "not a VIP yet?" form, the guest list |
| `/[lang]/vip/programme|lounge|hotel-deal` | The three locked VIP tabs, rendered on request behind the gate |

Everything else is a file on the CDN. `src/middleware.ts` is the Worker's
gatekeeper: it lets a request into `/preview/` on the preview cookie, and
into a locked VIP tab on a VIP session, and rewrites nothing else.

### Routing and languages

- Routes live under `src/pages/[lang]/`, `[lang]` ∈ `en | fr | nl`. `src/lib/locales.ts` is the one list, used by routes and schemas.
- Astro's built-in `i18n` is **deliberately off** (it 404s `/studio` in dev). Do not enable it.
- The site is **hubs with tabs**: `guest-of-honour`, `art-prize`, `programme`, `vip`, `partners`, `visit`, `about`, `press-media`. Each is a `[...tab].astro` route; the tab list and its slugs are in `src/lib/hubs.ts`. The first tab is the hub root. Text tabs are `page` documents with a `section`; list tabs (laureates, jury, talks…) come from their own documents.
- Listing routes: exhibitors (per year: `/exhibitors`, `/exhibitors/<slug>`, `/exhibitors/<year>`, `/exhibitors/<year>/<slug>`), artists A–Z (no detail page since 2026-09-22; a name links to its gallery), news. Contact is no listing since 2026-09-24: `/contact` 301s to about → "contact & team".
- `page` slugs are per language, so URLs are genuinely translated (`/en/about`, `/fr/a-propos`, `/nl/over`). hreflang and the language switcher are generated from the same slugs.
- Build every internal link with `localePath(lang, path)` from `src/lib/i18n.ts` (always trailing slash). `src/lib/links.ts` turns Sanity `link` objects into hrefs; `exhibitorPath`, `partnerPath`, `artistHref`, `sitePath` live there.

### Layout, styling, strings

- `src/layouts/Base.astro` wraps every page and holds the global CSS and the design tokens (`--ground`, `--surface`, `--ink`, `--rule`, `--accent`, `--measure`, `--shell`, `--gutter`, `--font`). **Use tokens, never literal colours**: dark mode is the same tokens redefined.
- No CSS framework, no global stylesheet file. Scoped `<style>` in each `.astro`.
- Labels around content (nav, "Read more", empty states, consent texts) are `STRINGS` in `src/lib/i18n.ts`. **A new string goes into all three locales**; a missing key silently falls back to English.
- Dates and times: `formatDate`, `formatDateRange`, `formatTime` from `i18n.ts` (Brussels time zone, locale-aware). Never `toLocaleDateString`.
- Components you reuse rather than rewrite: `SanityImage` (every Sanity image, never a hand-rolled `<img>`), `PortableText` (rich text), `PageSections` + `src/components/sections/*` (the page builder), `HubNav`, `Slideshow`, `PersonCard`, `ExhibitorCard`, `LinkPill`, `EditLink`, `CookieConsent`.

The Figma frames, the route for each, the data helpers each uses and the
fifteen section blocks are tabulated in `docs/frontend-handbook.md`. The
`frontend-page` skill in `.claude/skills/` walks one page from frame to PR.

---

## 5. Sanity: the content side

### The project

- Project `5hqzhin7`, dataset `production`, **public read**. Anyone with the project id can read every published document through the API, which is why nothing private (emails of applicants, VIP names, codes) is ever stored in it.
- Plan: check at `sanity.io/manage`. On the Free plan the live API endpoint is metered (250k requests/month); see §8 for the rules that keep builds under it.
- Everyone who edits is a **project member** (up to 20 seats): invited at `sanity.io/manage`, attributed by name in document history. There are no other accounts.
- CORS: `localhost:3333`, `localhost:4321`, `ceramic-brussels.pages.dev` and `*.ceramic-brussels.pages.dev`, so the Studio logs in on every preview.

### The Studio

`/studio` is a client-side React app on **hash routing**: one HTML file,
every screen after the `#`. A deep link looks like
`/studio/#/structure/exhibitors;<id>`. It is built by `@sanity/astro` as
part of `astro build`, so a Studio change deploys with the site.

The Studio's code is `src/sanity/`:

| File | What |
| :-- | :-- |
| `schemaTypes/` | Every document and object type. `documents/siteSettings.ts` is the settings singleton (contact, tracking, applications form, VIP). `objects/pageBuilder.ts` is the section blocks. `objects/richText.ts` is the text roles and marks. |
| `structure.ts` | The sidebar: one folder per menu section in menu order, then Setup. **The sidebar follows the site menu.** |
| `mainPages.ts` | Which `page` is the "main page" of each section (fixed ids `main-<section>`) |
| `pageKinds.ts` | Which fields a page form shows, per route kind. **Change it together with the route that reads the field.** |
| `templates.ts` | Create-menu starting points (two page shapes, one per exhibitor kind) |
| `siteLinks.ts` + `components/SiteLinkInput.tsx` | The "link to this site" search box over every built page |
| `components/` | Studio UI: `PreviewLauncher` (top-bar Preview), `TemplateActions` (Apply template / Save as template), `DuplicateAction` (clears the slug), `VipTool` (VIP guests screen), `KeyFiguresInput`, `LocaleInput`, `richTextMarks` |
| `previewPaths.ts`, `openPreview.ts`, `currentDocument.ts` | How the Studio knows which page a document is and opens its preview |

`README.md` has the table of every document type and where each shows on
the site. `docs/design-inventory.md` and `docs/legacy-site-inventory.md`
are the two inventories the model came from; look there before asking what
a field is for.

### Content model in one breath

- **Localised fields** hold EN/FR/NL in one document (`localeString`, `localeText`, `localeBlock`, `localeSlug`) and **fall back to English** when a translation is empty. Never fill a French field with English to "make it complete": an empty one falls back, a wrong one does not.
- **Edition-scoped data** (dates, hours, tickets, key figures, guest of honour, country focus, film, gallery) is on `edition`; `getCurrentEdition` returns the current one.
- **Images** are `figure` objects: image + `alt`, `caption` (artist), `workTitle`, `year`, `credit`, with hotspot and crop enabled. Editors frame with "Edit hotspot and crop"; there are no placeholders anywhere since 2026-09-22, an empty image draws an empty box.
- **Links** are objects: a path on this site (picked from the search box or typed), a document reference, or an external URL. Internal links get "→", external "↗".
- **Pages are section stacks.** `page.sections`, `homepage.sections`, `artist.sections` are page-builder arrays of pre-designed blocks (text, image + text, image grid, slideshow, video, quote, feature, banner, buttons, section title, people, key figures, latest news, FAQ, embed, application form). Each block has `hidden` and `anchor`. The look is fixed in code, the content and order are the editor's.
- **Page templates are content**: `pageTemplate` documents an editor applies or saves from any page's ⋯ menu. Making a new layout needs no deploy.
- **Exhibitors are per year**: one record per gallery per edition, often on the same slug.
- **Hidden fields**: fields no route reads are hidden in the schema with a comment, never deleted. The data stays.

### Preview

The Studio's top-bar **Preview** (and "Open preview" in a document's ⋯
menu) opens the page being edited **from its draft** in a new tab at
`/preview/[lang]/…`. Every text on that page has an "Open in Studio"
link back to the field (stega encoding), and every image is click-to-edit
(`data-sanity` from `src/lib/previewImages.ts`). This is how an editor
checks work before publishing, and how you check a Studio-side change
without waiting for a build.

Two traps: stega appends invisible characters to strings, so any code
that compares a value against a fixed list must get a plain one.
`stegaFilter` in `src/middleware.ts` keeps `PLAIN_KEYS` unencoded; a new
field that is picked from a list goes in there. And a component that
draws a Sanity image without `SanityImage` has to emit `data-sanity`
itself.

---

## 6. Connecting the Studio to a page: the recipes

The wiring between the halves is always the same three places. A field
that is missing from one of them does not exist for the others.

```
schema (src/sanity/schemaTypes/…)  →  GROQ projection (src/lib/queries.ts)  →  page or component
```

### Recipe A — a new field on an existing type

1. **Schema.** Add the field with `defineField` in the type's file. Give it a `title` and a `description` an editor understands. Use `localeString` / `localeText` / `localeBlock` for anything a visitor reads. If only some page kinds should show it, wire it in `pageKinds.ts`.
2. **Query.** Find the projection in `queries.ts` that returns the type (they are named constants: `NEWS_CARD`, `SECTIONS`, `PERSON`, `PARTNER`, …) and add the field. Localised fields are read with the `localised(field)` helper, which expands to `coalesce(field[$lang], field.en)`; copy the neighbour.
3. **Page.** Read the field from the helper's result and render it. Build links with `localePath`, images with `SanityImage`, text with `PortableText`.
4. **Preview.** If the value is compared against a list (a category, a tier, a layout), add its key to `PLAIN_KEYS` in `src/middleware.ts`.
5. **Check.** `npm run content` sees it, the Studio shows it, the dev server renders it in three languages, `npx tsc --noEmit` is clean.

Adding a field is safe: existing documents simply do not have it yet.

### Recipe B — renaming, moving or retyping a field (needs a migration)

**A schema change without a matching content migration silently blanks
published content.** The Studio is live and editors publish daily.

1. Write a script in `scripts/` on the pattern of `scripts/move-artist-bio.mjs` or `scripts/migrate-sections.mjs`: reads with the public client, writes with `SANITY_API_WRITE_TOKEN` from `.env`, has a `--dry` mode that prints what it would patch, and is **deterministic** (a re-run corrects, never duplicates).
2. Run `--dry`, read the plan, then run for real.
3. Before a bulk write, **turn the Sanity webhook off** (`sanity.io/manage` → API → Webhooks → `cloudflare-production-rebuild`), otherwise every patch triggers a production build. Turn it back on and fire one build afterwards.
4. Ship the schema change and the script in the same commit; note the date and the transaction id in the commit message or in `docs/`.
5. Keep a backup: `legacy-export/backups/` holds dataset exports; make one first for anything that deletes.

### Recipe C — a new page-builder block

Three places plus a thumbnail: the block's schema in
`objects/pageBuilder.ts`, a branch in the `SECTIONS` projection in
`queries.ts`, a component in `src/components/sections/` rendered by
`PageSections.astro`, then `npm run previews`. Blocks that draw on other
content (people, news, key figures) resolve inside `SECTIONS` so a page is
still one query.

### Recipe D — a new hub tab or route

A tab is an entry in `src/lib/hubs.ts` (slug, per-language segment,
label key) plus a `page` document with the matching `section` and English
slug, plus its label in `STRINGS`. The Studio's search box and the link
objects find it by themselves. A whole new route under `src/pages/[lang]/`
also needs: its `main-<section>` page in `mainPages.ts` if it is a
listing, its entry in `structure.ts`, its kind in `pageKinds.ts`, its
paths in `src/sanity/siteLinks.ts` if links should find it, and a line in
`docs/frontend-handbook.md`.

### Recipe E — a new UI string, tracker or consent text

`STRINGS` in `i18n.ts`, all three locales. A tracker: its id in
`src/lib/tracking.ts`, its loader in `CookieConsent.astro`, its texts under
`consent.*`, and a `CONSENT_VERSION` bump.

### Recipe F — a new rich-text role or mark

The name in `objects/richText.ts` and its CSS in `PortableText.astro`.
Only the name is stored, so restyling never needs a migration.

### When you cannot or should not do the CMS side yourself

Log a numbered request in `docs/backend-requests.md` (format inside),
put a `{/* BACKEND-REQUEST #n */}` comment at the spot, render without it,
and tell Kamindu. Requests #1 to #22 show the tone.

---

## 7. From an editor's Publish to the live page

```
editor presses Publish
  → Sanity GROQ webhook "cloudflare-production-rebuild" (published docs only)
  → Cloudflare deploy hook → build of `main` (about 4–6 minutes)
  → new HTML on ceramic-brussels.pages.dev; `public/_headers` makes HTML revalidate so nobody keeps an old page
```

- The webhook exists on the Sanity project (created by hand at `sanity.io/manage` → API → Webhooks; the management API cannot list or create GROQ-powered ones). It rebuilds **main only**; previews stay as built.
- The deploy hook is `sanity-publish-production` under the Pages project's settings. Its URL is the secret; do not paste it anywhere.
- Preview (§5) shows a draft **now**; the live site shows the publish **after the build**. Tell editors both.
- There is no build status in the Studio. To confirm a deploy, look in the Cloudflare dashboard (Roy's account, project `ceramic-brussels`) or from Kamindu's machine `npx wrangler pages deployment list --project-name ceramic-brussels`. Do not diff a local build against the live HTML: production builds with the adapter and is never byte-identical.

---

## 8. Data safety rules

- **The dataset is public.** No email address of a member of the public, no VIP name, no code, no token in any document. Form submissions are emailed, not stored; VIP guests are in D1.
- **API quota.** The free plan meters `api.sanity.io`. Every query goes through `run()` in `queries.ts`, which memoises per build and fails a build over 2,500 requests; `astro.config.mjs` sets `useCdn: true`. Route a new query through `run()`; never query per page in `Base.astro`. Token clients (drafts, imports) cannot use the CDN.
- **Never edit content by hand to test code.** Use Preview with a draft, or a throwaway document you delete afterwards.
- **Deterministic scripts.** Every script that writes has `--dry`, stable ids, and only sets known fields.
- **Deleting is last.** Prefer hiding a field or unpublishing a document. Export first (`legacy-export/backups/`).

---

## 9. The server side (`src/server/`)

| File | What |
| :-- | :-- |
| `runtime.ts`, `cfEnv.ts` | Reaching the Cloudflare bindings (`env`) from Astro code; null under `astro dev` |
| `preview.ts`, `routes/preview-enable.ts`, `routes/preview-disable.ts` | The preview cookie |
| `mail.ts` | The one Brevo send (§10) |
| `routes/apply.ts` | The gallery application form: validate, honeypot, 15-minute repeat guard, two emails, 303 to the thank-you page |
| `vip.ts`, `vipGuests.ts`, `vipSession.ts`, `vipMail.ts` | The VIP gate, guest rows and codes, KV sessions, the code email |
| `routes/vip-enter.ts`, `vip-leave.ts`, `vip-request.ts`, `vip-admin.ts`, `vip-tab.astro` | Code entry, sign-out, the "not a VIP yet?" form, the Studio's guest list API, the locked tabs |
| `sanityIdentity.ts` | Asks Sanity who a Studio token belongs to and whether they administer the project |
| `src/middleware.ts` | Lets requests into `/preview/` and the locked tabs; the stega filter |
| `src/integrations/preview-routes.mjs`, `vip-routes.mjs` | Inject those routes into the build only when `PREVIEW_RUNTIME=1` |

Bindings (both `wrangler.toml` and `wrangler.worker.toml`, keep them in
step): D1 `VIP_DB` = database `ceramic-brussels-admin`, KV `VIP_SESSIONS`.
Migrations in `migrations/`, applied with `npm run vip:migrate`.

`astro dev` has no Worker: `/api/*` and `/preview/*` do not exist there,
and the locked VIP tabs open without a code. **Server changes are tested
on a branch preview**, never only locally. `npm run build:preview` at
least proves they compile.

---

## 10. Email (Brevo)

- **Account:** Roy's Perelweb Studio Brevo account, Starter plan, monthly send credits shared with his other sites. The domain `ceramic.brussels` is authenticated there (DKIM/SPF via DNS, 2026-09-22).
- **Sender:** `ceramic brussels <info@ceramic.brussels>`, created 2026-09-23. It is the default for everything. Site settings can name another sender per form, but it must be on `ceramic.brussels` or Brevo refuses the message.
- **Key:** `BREVO_API_KEY`, production Pages secret (set 2026-09-23) and in Kamindu's `.env` for tests. Previews have no key and `APPLY_DRY_RUN=1`, so they log instead of sending.
- **Code:** `src/server/mail.ts` (`sendMail`, `senderFor`, `fill` for `{placeholders}`, `paragraphs`, `rowsHtml`). Every email in the project goes through it; do not `fetch` Brevo anywhere else.

What sends what:

| Trigger | To | Text from |
| :-- | :-- | :-- |
| Gallery application form (`/api/apply/`) | Site settings → Applications → recipient (+ cc), reply-to the applicant; and a confirmation to the applicant | Applications → confirmation subject/text, localised, `{firstName} {lastName} {gallery}` |
| "Not a VIP yet?" form (`/api/vip/request/`) | Site settings → VIP → recipient (falls back to the VIP team address, then the contact email); confirmation only if the team wrote one | VIP → confirmation subject/text |
| VIP guests tool: approve, new code, rename that moved the code | The guest | VIP → "Code email" subject/text, `{firstName} {lastName} {code} {link} {contact}`, stock English when empty |
| VIP guests tool: add a guest | The guest, if "Email them their code now" is ticked (default) | same |
| VIP guests tool: "Email code" on a row / "Send by email" in the code dialog | The guest, on demand | same |
| Import of a spreadsheet | nobody; the invitation mailing is the team's, from the export | — |

Testing without spamming anyone: on a branch preview, post the form and
expect `{"ok":true,"redirect":"/en/thank-you/"}` (dry run). On
production, the honeypot field `website` makes the route answer ok and
send nothing. A real end-to-end test is adding yourself as a VIP guest in
the Studio and reading the email. Checking the key by hand:

```sh
curl -s -H "api-key: $BREVO_API_KEY" https://api.brevo.com/v3/account
curl -s -H "api-key: $BREVO_API_KEY" https://api.brevo.com/v3/senders
```

Sanity does not send email. Site settings only holds the addresses and
the texts, because they are the editors'.

---

## 11. The VIP hub

Full design in `docs/vip-access.md`. The short version:

- Three locked tabs (programme, lounge, hotel deal) and an access page. A code opens them; Site settings → VIP → "A code is required" turns the gate off after the fair.
- ~3,000 personal codes, format `CB27-FIRSTNAME-XXXXXX`, derived from the guest's email with the pepper (`makeCode` in `vipGuests.ts` and in `scripts/vip-guests.mjs`, **the same function twice; change both**). Only the hash is stored, in D1. A code is shown or emailed, never listed.
- Sessions in Workers KV (free tier: 1,000 writes/day; **Workers Paid before the mailing**).
- The guest list lives in the Studio's top-bar **VIP guests** tool (Sanity administrators only, checked by the Worker against Sanity). States: pending (filed by the site's form), approved, denied; plus revoked. Import a spreadsheet (first name, last name, email, institution, function), export with codes for the mailing.
- From the laptop: `npm run vip -- --import guests.csv | --export | --revoke <email> | --reissue <email> | --set hotel_code=…`, with `VIP_CODE_PEPPER` in `.env`.
- Still by hand (Roy): Workers Paid, a Cloudflare rate-limit rule on `/api/vip/enter/`.

---

## 12. Git: how we work

| Branch | Role |
| :-- | :-- |
| `main` | Production. Never push here directly; it moves by fast-forward from `dev` (or, in a hurry, from `kamindu`) once a preview looks right. |
| `dev` | Staging. Integration of both working branches. |
| `lilanga` | Lilanga's branch. Nobody else pushes to it. |
| `kamindu` | Kamindu's branch. Nobody else pushes to it. |

The cycle:

```sh
git checkout lilanga
git fetch origin && git merge origin/dev     # take the other half's work first, regularly
# work, commit
git push                                     # → lilanga.ceramic-brussels.pages.dev builds
```

Open a PR into `dev` (or ask the other one to fast-forward it), check
`dev.ceramic-brussels.pages.dev`, then `main`. Every push produces its own
preview URL; **look at the real URL before calling something done**,
especially anything under `src/server/` or `src/sanity/`.

Habits:

- **Commit only when asked** in a Claude session, with a message that says why, and the attribution line the session gives you. Stage only your files: the checkout usually has untracked backups and scratch scripts that are not yours.
- Keep `CLAUDE.md` and `AGENTS.md` identical; edit one, copy over the other.
- `.gitattributes` normalises to LF; CRLF on Windows is nothing to worry about.
- Push `403 Permission denied` on Windows is Git Credential Manager reusing a stale entry: `cmdkey /list | findstr github`, delete every `git:https://…github.com` target, push again, pick the right GitHub account in the window that opens. It is not a scope problem. Reads succeeding proves nothing, the repo is public.
- Another Claude session may be working in the same checkout. Do not switch branches under it; use `git worktree add` for a side task.
- Whoever moves `main` writes the commit hash and the time in their notes. Both developers' memory files carry a "main = …" line for that reason.

---

## 13. Cloudflare Pages

- Project `ceramic-brussels` in Roy's account, Git-connected. Build command `npm run build`; output dir from `pages_build_output_dir` in `wrangler.toml`.
- **Build variables come from `wrangler.toml`**, `[vars]` for production, `[env.preview.vars]` for every other branch. Dashboard variables are ignored while that file exists. Secrets are dashboard-only.
- Deploys happen only from Git. `npx wrangler pages deploy dist` exists for emergencies and has never been needed.
- `public/_headers`: `/_astro/*` immutable, HTML revalidates, and `X-Robots-Tag: noindex` on `ceramic-brussels.pages.dev/*` only (remove or keep at cutover; it never matches the real domain).
- `public/_redirects` is short; `scripts/legacy-redirects.mjs` appends ~470 rules for the old site's URLs after every build, from a map of old page → new English path plus the FR/NL slugs it reads from the built pages. A target that was not built **fails the build**, which is the point. `--check <url>` tests rules live.
- `scripts/sitemap-noindex.mjs` drops noindexed pages from the sitemap.
- Watching a deploy from Kamindu's machine: `npx wrangler pages deployment list --project-name ceramic-brussels [--environment preview]`. Wrangler's OAuth token expires within the hour; a 401 in a loop looks like a hung build.

### Cutover checklist (mid-October)

1. Point `www.ceramic.brussels` at the Pages project (custom domain in the dashboard), `PUBLIC_SITE_URL` in `wrangler.toml [vars]` to `https://www.ceramic.brussels`.
2. Add `https://www.ceramic.brussels` to Sanity CORS.
3. `curl -I https://www.ceramic.brussels/en/` — no `x-robots-tag`.
4. `node scripts/legacy-redirects.mjs --check https://www.ceramic.brussels` — every old URL 301s once onto a 200.
5. GA4 starts counting by itself: it loads only on `www.ceramic.brussels` after consent.
6. Brevo: nothing to do, the sender is already on the real domain.
7. Delete the `SANITY_STUDIO_TOKEN` secret and revoke that token at `sanity.io/manage`.

---

## 14. The scripts

All in `scripts/`, all Node, run with `node scripts/<name>.mjs`; the
writing ones read `SANITY_API_WRITE_TOKEN` from `.env` and have `--dry`.

| Script | What |
| :-- | :-- |
| `pages-worker.mjs`, `legacy-redirects.mjs`, `sitemap-noindex.mjs` | Post-build, run by `npm run build` |
| `with-preview-runtime.mjs` | `npm run build:preview` |
| `boundary.mjs`, `content-status.mjs`, `section-previews.mjs` | Checks and thumbnails |
| `seed.mjs`, `seed-templates.mjs`, `seed-thank-you.mjs` | Seeding; templates are safe to re-run |
| `import-legacy.mjs` (+ `legacy/`, `lib/`), `legacy-fill.mjs`, `import-exhibitors.mjs` | The old site's content into Sanity. `--images` uploads and caches in `legacy-export/asset-map.json`; **keep that file**. Thirteen images are unrecoverable (`legacy-export/unrecoverable-images.json`). |
| `internal-links.mjs` | Converted the old site's internal links into link objects |
| `migrate-sections.mjs`, `move-artist-bio.mjs`, `studio-cleanup.mjs`, `fix-programme-2026.mjs`, `clean-demo-exhibitors.mjs` | One-off content migrations, kept as patterns |
| `fill-seo.mjs`, `fill-missing-images.mjs` | Filled SEO blocks and image fields from what the build rendered |
| `apply-design-content.mjs`, `sync-design-text.mjs`, `about-contact-content.mjs`, `press-media-content.mjs`, `trim-homepage-2026-09-14.mjs` | Design-text and client-content applications |
| `create-deploy-webhook.mjs` | Created the Cloudflare deploy hook (the Sanity webhook itself was made by hand) |
| `vip-guests.mjs` | The VIP guest list from the laptop |

`legacy-export/` is the old site: `raw/` (the capture, irreplaceable),
`normalized/`, `derived/`, `INVENTORY.md`, `MAPPING.md`, `backups/`.

---

## 15. Before you push: the checklist

1. `npx tsc --noEmit -p tsconfig.json` — nothing beyond the four known errors.
2. The page in **all three languages** on localhost, light and dark, phone width. No English label on a French page.
3. `npm run build:preview` if you touched anything under `src/server/`, `src/sanity/`, `src/integrations/`, `astro.config.mjs` or `wrangler*.toml`.
4. `npm run content` if you touched schemas or queries: no field silently empty.
5. For a Studio change: open `/studio` on the dev server, open a document of that type, save nothing, look. Then the branch preview after pushing.
6. For a server change: the branch preview's real URL. `curl` the route.
7. Docs: `CLAUDE.md` = `AGENTS.md`, `docs/frontend-handbook.md` for a route, `docs/backend-requests.md` for a request, `docs/vip-access.md` for VIP.

---

## 16. Working with Claude Code on this project

- Start a session by reading `CLAUDE.md`; for a page, invoke the `frontend-page` skill; for anything else, this file.
- The dev server always in the background (`astro dev --background`).
- The auto-mode classifier blocks some outward commands (pushing `main`, writing a Pages secret, reading the credential store). When that happens the session hands Kamindu a **one-line** command to run with the `!` prefix; do not work around it.
- Claude keeps per-developer memory notes (dates, hashes, what is on `main`, what is left by hand). Facts about the code belong in the repo docs, not in memory.
- Do not narrate; verify. "It builds" means the build ran. "It is live" means the URL was fetched.
- Ask before: deleting content, running a migration for real, pushing another person's branch, changing a schema type or field name, anything under `wrangler*.toml`.

---

## 17. Where things are

| | |
| :-- | :-- |
| Sanity manage | `sanity.io/manage` → project `5hqzhin7`: members, tokens, CORS, webhooks, usage, plan |
| Cloudflare | Roy's account → Workers & Pages → `ceramic-brussels`: deployments and build logs, secrets, deploy hooks, custom domain; D1 `ceramic-brussels-admin`; KV `VIP_SESSIONS` |
| Brevo | `app.brevo.com`, Roy's Perelweb account: senders & domains, API keys, statistics/logs of every message sent |
| GitHub | `royboy31/ceramic.brussels`, collaborators |
| Figma | The 2027 design file; frame ids per page in `docs/frontend-handbook.md` |
| Task board | `tasks.perelweb.be` |
| Old site admin | `ceramic.brussels/admintool` (Twill), read-only reference until cutover |

When in doubt about content or data: Kamindu. About the design: Lilanga.
About accounts, billing, domains: Roy.
