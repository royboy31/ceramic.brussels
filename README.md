# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Content & deployment

Content lives in Sanity (project `uia5r1rc`, dataset `production`). The embedded
Studio is served at `/studio`.

### How content reaches the site

The site is built with Astro's default `output: 'static'`, so **Sanity content is
fetched at build time and baked into the HTML**. Two consequences:

- **Drafts are invisible.** The queries in `src/pages/` are unauthenticated, so
  they only see published documents. Editing in the Studio is not enough — you
  have to hit **Publish**.
- **Published edits need a rebuild.** In `astro dev` every request re-queries
  Sanity, so edits show up on reload. In production they do not appear until the
  site is rebuilt.

To close that gap, register a Sanity webhook that pings your host's deploy hook
whenever published content changes:

```sh
npm run webhook                                       # dry run, shows the payload
npm run webhook -- https://api.netlify.com/build_hooks/xxxx   # create it
```

Get the deploy hook URL from your host:

| Host             | Where                                                  |
| :--------------- | :----------------------------------------------------- |
| Netlify          | Site settings → Build & deploy → Build hooks           |
| Vercel           | Project settings → Git → Deploy Hooks                  |
| Cloudflare Pages | Settings → Builds & deployments → Deploy hooks         |

The webhook filters on `_type in ["piece", "post"]` and sets `includeDrafts:
false`, so only published content changes trigger a build — not drafts and not
Sanity's internal `system.*` documents.

### Build-time environment

The production build needs only the two public vars:

```
PUBLIC_SANITY_PROJECT_ID=uia5r1rc
PUBLIC_SANITY_DATASET=production
```

`SANITY_API_WRITE_TOKEN` is **not** needed to build — the `production` dataset is
ACL-public, so reads are unauthenticated. Keep it out of your host's build
environment. It is only used locally, by `scripts/create-deploy-webhook.mjs` and
by any future write path (migrations, form submissions, draft preview).

## Content types

The model is in `src/sanity/schemaTypes/`, split into reusable objects and
documents. Field-level i18n (`localeString` / `localeText` / `localeBlock`)
keeps language-neutral data — booth number, country, images — in a single
document instead of duplicating it per language.

| Document | Route | Notes |
| :-- | :-- | :-- |
| `edition` | `/[lang]/editions` | Anchors everything dated. Exactly one is `isCurrent`. |
| `exhibitor` | `/[lang]/exhibitors/[slug]` | Gallery. Index has a client-side filter. |
| `artist` | `/[lang]/artists/[slug]` | Embeds `artwork` objects. |
| `newsItem` | `/[lang]/news/[slug]` | The blog. |
| `page` | `/[lang]/[...slug]` | Editor-created pages, **slug per locale**. |
| `programmeEvent` | `/[lang]/programme` | Grouped by day. |
| `award` | `/[lang]/awards` | Grouped by edition year. |
| `partner` | `/[lang]/partners` | Grouped by tier. |
| `pressClip` | `/[lang]/press` | Sortable table. |
| `siteSettings` | — | Singleton; not creatable or deletable in the Studio. |

### Demo content

```sh
npm run seed              # create/update ~32 demo documents
npm run seed -- --clear   # remove them again
```

Seeded IDs are prefixed `demo-`. **Do not use a dot in a document ID** — Sanity
treats a dotted ID as path-prefixed and therefore private (the same mechanism
behind `drafts.`), so the documents exist but are invisible to the
unauthenticated reads the site makes.

## Navigation

The main menu is a Sanity singleton (**Navigation**, pinned at the top of the
Studio). Each item points at one of three things:

- **A section of this site** — a built-in listing route (`exhibitors`, `news`, …)
- **A page** — a reference, so the link follows that page's slug *in each language*
- **An external address** — a plain URL

Labels are per-language, and drag-to-reorder is the published order. If the
Navigation document is empty the site falls back to a built-in menu, so a
half-finished edit can never leave the site without navigation.

## Editing multilingual pages

Every translatable field is a `localeString` / `localeText` / `localeBlock`
object holding EN, FR and NL together in one document. English is expanded by
default; the translations sit below it in a fixed order and fall back to English
when empty, so a missing translation never renders as a blank page.

The **Pages** list shows translation status in the subtitle — `/en/about ·
missing NL` — so an editor can see what still needs doing without opening
anything.

`page` slugs are per-language, which is what produces real translated URLs:

```
/en/about   /fr/a-propos          /nl/over
/en/visit   /fr/infos-pratiques   /nl/praktische-info
```

hreflang is generated from those same slugs, so the language switcher and the
alternate tags can never disagree.

## Edit links

Pages carry an **Edit** button that deep-links into the Studio for exactly the
document being viewed, using Sanity's intent router:

```
/studio#/intent/edit/id=<documentId>;type=<schemaType>
```

Intent links survive desk restructuring, unlike hard-coded desk paths. They show
in `astro dev` only. To keep them on a deployed build — useful on staging, not
on the public site — set `PUBLIC_SHOW_EDIT_LINKS=true`.

## Hosting on Cloudflare

The whole app, Studio included, is **static**. `astro build` emits plain HTML
plus assets, so there is no adapter, no Worker runtime, and nothing to keep warm.

The Studio works as a static asset because `@sanity/astro` serves it on **hash
routing**: `/studio` is a single HTML file and every screen inside it lives after
the `#`, which the server never sees. That is why no SPA catch-all rule is needed.

### Deploy pipeline

Hosting is a **Cloudflare Pages** project (`ceramic-brussels`) connected to
`github.com/royboy31/ceramic.brussels`. Every push builds:

| Branch | What it builds | URL |
| :-- | :-- | :-- |
| `main` | Production | the custom domain, and `ceramic-brussels.pages.dev` |
| `dev` | Staging — the integration branch | `dev.ceramic-brussels.pages.dev` |
| `kamindu`, `lilanga` | Per-developer previews | `<branch>.ceramic-brussels.pages.dev` |

Work happens on a personal branch, is merged into `dev` and checked on the
staging URL, and only then goes to `main`. Nothing reaches the live domain
without having been seen on a preview build first.

`wrangler.toml` carries `pages_build_output_dir`, so the output directory lives
in version control; Pages CI reads it and ignores the dashboard field. Build
command is `npm run build` and `NODE_VERSION` must be `22.12.0` or newer (see
`engines` in package.json).

A manual upload is possible but should not be the normal path, because it
produces a deployment with no commit behind it:

```sh
npx wrangler pages deploy dist
```

### Build environment variables

Pages keeps two sets, **Production** and **Preview**. Both need the Sanity
coordinates and the Node version; they differ in the canonical origin.

Production:

```
PUBLIC_SANITY_PROJECT_ID=uia5r1rc
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://www.ceramic.brussels
NODE_VERSION=22.12.0
```

Preview — the site URL must point at the preview host, or `dev` would emit
canonical tags, hreflang and a sitemap claiming to be the live domain and invite
Google to index staging as the real thing:

```
PUBLIC_SANITY_PROJECT_ID=uia5r1rc
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://dev.ceramic-brussels.pages.dev
PUBLIC_SHOW_EDIT_LINKS=true
NODE_VERSION=22.12.0
```

`SANITY_API_WRITE_TOKEN` must **not** be added to either. The dataset is
ACL-public, so the build reads without it, and a token in a build environment is
a token that can leak.

### Required: add the Cloudflare origin to Sanity CORS

The Studio authenticates with cookies, so its origin must be allow-listed with
credentials or **login will fail on the deployed Studio while working fine
locally**. In *sanity.io/manage → API → CORS origins*, add each with **Allow
credentials** on:

```
https://www.ceramic.brussels
https://ceramic-brussels.pages.dev
https://*.ceramic-brussels.pages.dev     # every branch preview
```

### Rebuild on publish

Static means content is baked in at build time. Wire the Cloudflare deploy hook
to Sanity so a publish triggers a rebuild:

```sh
npm run webhook -- https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxxx
```

### Caching

`public/_headers` fingerprints `/_astro/*` as immutable and forces HTML to
revalidate — without that, a rebuild after a publish would not reach anyone
holding a cached page. It also sends `noindex` and `X-Frame-Options: DENY` on
`/studio`.

### Limits

Current build: 487 files, 9.2 MB — comfortably inside Cloudflare's 20,000 file
and 25 MiB-per-file limits. Most of the weight is the Studio bundle, which only
downloads when someone actually opens `/studio`.
