---
name: frontend-page
description: Build or restyle a ceramic.brussels page, layout, or section block to its Figma frame, check it on localhost in three languages, keep it matched to the Sanity content model, and log anything the backend must change. Use for any work in src/pages, src/layouts, src/components, src/lib/i18n.ts or public.
---

# Build a frontend page

You are working on the **frontend half** of ceramic.brussels: pages, layout,
components, styling. The backend half (Sanity schemas, GROQ queries, hub and
locale lists, deployment) belongs to Kamindu and is never edited here. Read
`docs/frontend-handbook.md` first; it holds the page → route → data → Figma
map and the block table this skill refers to.

## Steps

1. **Locate the page.** Find its row in the handbook map: the route file, the
   data helpers it calls, and the Figma node id. Open the frame (Figma MCP if
   connected, otherwise the screenshots in the hand-off). `docs/design-inventory.md`
   has every frame described element by element.

2. **Read the data contract before the markup.** Open the helpers the route
   calls in `src/lib/queries.ts` and read their projections. That list of
   fields is everything the page may render. Do not guess at fields; do not
   edit the projection.

3. **Build to the frame.** Change markup and scoped CSS in the route file and
   its components. Keep the frontmatter data calls as they are. Use the
   design tokens from `Base.astro`, `SanityImage` for every CMS image,
   `PortableText` for rich text, `resolveLink`/`LinkPill` for links, the
   `format*` helpers for dates, and `t('key')` for every label, added to
   `en`, `fr` and `nl` in `src/lib/i18n.ts` in the same edit.

4. **Section blocks.** If the page renders a section stack, each block type
   is one component in `src/components/sections/` and must render every
   field its projection returns (handbook block table). Styling a block is
   styling every template and page that uses it, so check a block on more
   than one page. Wrap each block in an element carrying `id={section.anchor}`.

5. **Check on localhost.** With `npm run dev` running, load the page at
   `/en/`, `/fr/` and `/nl/`, at 1440px and narrower, in light and dark, and
   once with content removed (hidden block, blank optional field, item with
   no image). Every list needs its empty state; every optional field must
   vanish cleanly. Use the Edit link on the page to open the document in the
   Studio and change content to test.

6. **When the design needs data that is not there** — a field, a tab, a
   document type, a different query — stop and do these four things instead
   of adding it:
   - append an entry to `docs/backend-requests.md` (next number, page, frame,
     what the design shows, what the query returns, what you rendered meanwhile);
   - put `{/* BACKEND-REQUEST #n: ... */}` at the spot in the code;
   - render the page without it so it still builds and looks finished;
   - list the numbers in the PR description.
   Never hard-code copy or values in place of a CMS field; never edit
   `src/sanity/**`, `src/lib/queries.ts`, `src/lib/hubs.ts`, `src/lib/locales.ts`
   or `src/lib/links.ts`.

7. **Before committing** run `npm run boundary` (must print no files outside
   the frontend half) and `npm run build` (must pass). Commit on `lilanga`,
   push, open a PR into `dev`.

## Rules that are easy to break

- A missing `fr` or `nl` string falls back to English silently. Add all
  three every time.
- A literal colour breaks dark mode. Tokens only.
- A hand-rolled `<img>` for a Sanity image loses the srcset and shifts the
  layout. `SanityImage` only.
- Drafts never show on localhost; only published documents do. For drafts
  use the Preview tab in the Studio on dev.ceramic-brussels.pages.dev.
- There are no mobile frames. Keep pages usable below 1440px; do not invent
  a mobile design.
- The Studio is live for editors. Nothing in `src/sanity/` is a safe edit.
