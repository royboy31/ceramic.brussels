# Frontend kickoff — instructions for Claude Code

You are working with **Lilanga**, the frontend developer on ceramic.brussels.
He will open a session in this repository and tell you to read this file.
Follow it top to bottom. It is the first session's script; after that the
`frontend-page` skill and `docs/frontend-handbook.md` are the working rules.

## Who owns what

Lilanga owns, and you may edit:

- `src/pages/**` (except `login.astro`)
- `src/layouts/**`
- `src/components/**`
- `src/lib/i18n.ts` and `src/lib/placeholders.ts`
- `public/assets/**` and `public/fonts/**`
- `docs/backend-requests.md`

Kamindu owns, and you never edit or propose editing:

- `src/sanity/**` — the Studio is live for editors; a schema change without
  a migration blanks published content
- `src/lib/queries.ts` — the GROQ projections are the data contract
- `src/lib/hubs.ts`, `src/lib/locales.ts`, `src/lib/links.ts` — imported by
  the Sanity schemas
- `src/server/**`, `functions/`, `src/middleware.ts`, `wrangler*.toml`,
  `astro.config.mjs`, `public/_headers`, `public/_redirects`, `scripts/**`,
  `migrations/**`

If a design needs data the queries do not return, do **not** add it. Log a
numbered entry in `docs/backend-requests.md`, put a
`{/* BACKEND-REQUEST #n: ... */}` comment at the spot, render the page
without it, and tell Lilanga. The handbook's section "When the design needs
something the data does not have" has the format.

## Read first

1. `CLAUDE.md` — project setup, architecture, gotchas.
2. `docs/frontend-handbook.md` — every Figma frame mapped to its route file,
   its data helpers and its Sanity documents; the table of the fifteen
   section blocks and the fields each receives; the localhost checks.
3. `.claude/skills/frontend-page/SKILL.md` — the per-page workflow. Invoke
   the `frontend-page` skill for every page or component task.

## Step 1 — bring the checkout up to date

Lilanga's branch was reset onto `dev` on 2026-09-08. His earlier commits are
already merged into `dev`, so nothing is lost by resetting.

```sh
git fetch origin
git checkout lilanga
git reset --hard origin/lilanga
npm install
```

If `git status` shows local changes before the reset, ask Lilanga whether
he wants them; do not reset over uncommitted work without asking.

## Step 2 — the environment file

`.env` must contain exactly these three lines. The old Sanity project id
(`uia5r1rc`) no longer works; the site moved to `5hqzhin7` on 2026-09-06.

```
PUBLIC_SANITY_PROJECT_ID=5hqzhin7
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://www.ceramic.brussels
```

No token is needed. The dataset is public, so reads work without one.
Never commit `.env`.

## Step 3 — run and verify

Start the dev server in the background:

```sh
npm run dev
```

Confirm these all answer 200 and report the result to Lilanga:

- `http://localhost:4321/en/`, `/fr/`, `/nl/`
- `http://localhost:4321/en/art-prize`, `/en/visit`, `/en/programme`,
  `/en/partners`, `/en/about`, `/en/guest-of-honour`, `/en/exhibitors`
- `http://localhost:4321/studio/` — Lilanga signs in with his Sanity account

Then run both checks and show the output:

```sh
npm run boundary   # must list no files outside the frontend half
npm run build      # must pass; it renders every page
```

Published content shows on localhost after a refresh, no rebuild. Drafts
never show on localhost; for drafts, use the Studio's Preview tab or the
"Open preview" document action on `https://dev.ceramic-brussels.pages.dev/studio/`.

## Step 4 — first work: check the ported pages against your build

On 2026-09-08 Kamindu ported your sixteen static pages into the routes
(read "How the design is wired" in `docs/frontend-handbook.md`): the
shell with the accordion menu, the homepage, every hub page, with your
markup and CSS. Start by opening each page on localhost next to your
static build at 1440px and fixing what differs; then the breakpoints below
1440px, which the port carries from your build but nobody has checked;
then the pages the design does not cover yet (news, artists, editions,
standalone pages, 404 — wrapped in `.legacy-page`), from the same patterns.

The section blocks remain the templates: editors compose pages from the
sixteen section blocks in `src/components/sections/` and
`src/components/Sections.astro`, and the page templates in the Studio are
stacks of those blocks. Styling a block styles every template and every
editor-built page.

- The handbook's block table says which fields each block receives. Render
  every one of them; never assume a field that is not in the projection.
- Style to the Figma design: file key `z9cip6kiRdBEJoLRMzhOiU`, frames
  listed by node id in `docs/frontend-handbook.md` and described element by
  element in `docs/design-inventory.md`. Use the Figma MCP server if it is
  connected; otherwise ask Lilanga for screenshots.
- Use the design tokens on `Base.astro` (never a literal colour),
  `SanityImage` for every image, `PortableText` for rich text, `LinkPill`
  and `resolveLink` for links, and `t('key')` for labels, added to `en`,
  `fr` and `nl` in the same edit.
- To see every block on one page: Lilanga creates a page in the Studio,
  applies the **Photo page** and **People page** templates from the
  document ⋯ menu (Apply template…), publishes it, and gives you the URL.
  Ask for it.
- Check each block at 1440px and narrower, in all three languages, in dark
  mode, and with a field left empty.

After the blocks, the order is: hub tabs to their Figma frames (art prize,
visit, partners, programme, about), then the frames Léonie has not drawn
yet (jury, FAQ, floor plan, team, press, mobile) once they arrive, then
hover states and small animations.

## Working rules

- Small commits on the `lilanga` branch, in Lilanga's name.
- Before every commit: `npm run boundary` and `npm run build`.
- Do not push and do not open a pull request without asking Lilanga.
  Pushes build a preview at `https://lilanga.ceramic-brussels.pages.dev`;
  PRs go into `dev`.
- Merge `dev` into `lilanga` regularly; the backend half moves in parallel.
- When a block or page is done, give Lilanga the localhost URL to check and
  the numbers of any backend requests you logged.
- No hard-coded copy or values standing in for a CMS field. If it is not in
  the data, it is a backend request.
