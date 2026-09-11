# Frontend handbook

How the frontend half of ceramic.brussels is built, page by page, against the
Figma design and the Sanity content model. Written for Lilanga and for the
Claude Code session working with him. `CLAUDE.md` has the project-wide setup;
this file is the part that matters when you sit down to build a page.

The split, in one line: **Lilanga owns how things look and where they sit on
the page; Kamindu owns what data exists and how it reaches the page.** A page
is finished when it matches its Figma frame *and* renders every field the
content model gives it, with nothing invented on the frontend side.

## What is yours and what is not

Yours to edit freely:

| Path | What |
| :-- | :-- |
| `src/pages/**` | One `.astro` file per route. Markup and scoped CSS. **Not** `login.astro` (site accounts, Kamindu). |
| `src/layouts/Base.astro` | The shell around every page: `<head>`, design tokens, header, menu, footer. |
| `src/components/**` | Header, footer, menu overlay, cards, hub nav, and the 15 section blocks in `sections/`. |
| `src/lib/i18n.ts` | UI strings (`STRINGS`), in all three locales, every time. |
| `src/lib/placeholders.ts` | Hand-off photography used until editors upload real images. |
| `public/assets/**`, `public/fonts/**` | Static assets. |
| `docs/backend-requests.md` | Your requests to Kamindu (see below). |

Not yours, even when it looks like a one-line change:

| Path | Why |
| :-- | :-- |
| `src/sanity/**` | Schemas, Studio structure and components. The Studio is live for editors; a schema change without a migration blanks published content. |
| `src/lib/queries.ts` | The GROQ projections. A field only reaches a page if a query selects it, and Kamindu keeps the query in step with the schema and the build request budget. |
| `src/lib/hubs.ts`, `src/lib/locales.ts`, `src/lib/links.ts` | Shared with the Sanity side: the tab list and locale list are imported by the schemas. Adding a tab is a backend request. |
| `src/server/**`, `functions/`, `src/middleware.ts`, `src/preview/` | Site accounts and the drafts preview Worker. |
| `wrangler*.toml`, `astro.config.mjs`, `public/_headers`, `public/_redirects` | Deployment. |
| `scripts/**`, `migrations/**`, `legacy-export/**` | Import, seeding, D1. |

`npm run boundary` prints every file your branch changes outside the first
table. Run it before every commit; it is also what Kamindu will run on your
PR.

## How the design is wired (since 2026-09-08)

The sixteen design pages were ported into the routes on 2026-09-08, so every
page now renders the design's own markup and CSS. The pieces:

- **`src/styles/design.css`** is the design build's shared stylesheet,
  imported by `Base.astro`: the Tailwind preflight and the utility classes
  the markup uses (`page-grid`, `col-span-6`, `h-[31vw]`, …), plus the
  header, menu overlay, footer, pill and grid rules. It is copied verbatim
  from the build; do not hand-edit utilities, add page rules to the page.
- **Page-scoped rules** live in each route's `<style>`, copied from the
  design page's own `<style>` with the build's scope attributes stripped.
- **The shell** (`Header`, `MenuOverlay` with the `+` accordion, `Footer`)
  and **`HubNav`** (the `.section-head` title band; `dark` on acid pages)
  carry the design markup; the acid pages get `body.acid-page`.
- **Blocks have a `variant`**: `PageSections variant="home"` renders the
  homepage's blocks the way the homepage draws them (`Heading` as
  "latest news", `Feature` rows, `Links` as the image bands, `VideoSection`
  as the looping frame, `KeyFigures` as the counting table); the default is
  the hub treatment.
- **`Base.astro`** carries the design's page script: link arrows that slide
  on hover, key figures that count up, sections and images that fade in.
- Pages the design does not cover yet (news, artists, editions, standalone
  pages, 404) are wrapped in `.legacy-page` and keep the older look.

## Page → route → data → Figma

Every page's frontmatter calls helpers from `src/lib/queries.ts`. Each takes
`lang` and returns content already resolved to that language, falling back to
English when a translation is empty. Read the helper's projection to know
exactly which fields you have; the projection is the contract.

| Figma frame (node id) | Route file | Data helpers | Sanity documents behind it |
| :-- | :-- | :-- | :-- |
| Homepage `4:4` | `src/pages/[lang]/index.astro` | `getHomepage`, `getCurrentEdition`, `getNews`, `getEditions` | `homepage` (fixed hero + section stack), `edition`, `newsItem` |
| Header (every frame) | `src/components/Header.astro` | props from `Base.astro` (`getSettings`, `getCurrentEdition`) | `siteSettings`, `edition.datesMark` |
| Menu overlay `32:3` | `src/components/MenuOverlay.astro` | props from `Base.astro` (`getNavigation`, `getNavPages`) | `navigation`, `page` |
| Footer (every inner frame) | `src/components/Footer.astro` | props from `Base.astro` | `siteSettings`, `navigation` |
| Exhibitors list `50:2` | `src/pages/[lang]/exhibitors/index.astro` | `getExhibitors`, `getCurrentEdition` | `exhibitor`, `edition` |
| Exhibitor detail `58:13`, `69:193` | `src/pages/[lang]/exhibitors/[slug].astro` | `getExhibitor`, `getExhibitors` | `exhibitor`, `artist` |
| Guest of honour `77:339` | `src/pages/[lang]/guest-of-honour/[...tab].astro` | `getGuestOfHonour`, `getHubPages` | `artist` (feature-page group), `page` |
| Art prize: laureates `119:65`, about `137:430`, awards `137:192`, jury (no frame) | `src/pages/[lang]/art-prize/[...tab].astro` | `getHubPages('art-prize')`, `getLaureates`, `getAwards`, `getPeople` | `page`, `laureate`, `award`, `person` |
| Visitors info: opening hours `163:508`, food & drinks `198:81`, floor plan and FAQ (no frame) | `src/pages/[lang]/visit/[...tab].astro` | `getHubPages('visit')`, `getCurrentEdition`, `getSettings`, `getPartners` | `page`, `edition` (hours, tickets), `siteSettings` (venue, access, FAQ), `partner` (`food-drinks` tier) |
| Partners: institutions `242:14`, hotel `288:442` | `src/pages/[lang]/partners/[...tab].astro` | `getHubPages('partners')`, `getPartners` | `page`, `partner` (tab → tiers in `PARTNER_TABS`) |
| Programme: La Cambre `266:177`, talks `277:283` | `src/pages/[lang]/programme/[...tab].astro` | `getHubPages('programme')`, `getProgramme` | `page`, `programmeEvent` (grouped by day) |
| About: the fair `289:671`, advisory board `289:767`, team, press, images (no frame) | `src/pages/[lang]/about/[...tab].astro` | `getHubPages('about')`, `getPeople`, `getPressClips`, `getEditions`, `getSettings` | `page`, `person`, `pressClip`, `edition` |
| Artists index and detail (no frame) | `src/pages/[lang]/artists/index.astro`, `artists/[slug].astro` | `getArtists`, `getArtist` | `artist` |
| News list and article (no frame) | `src/pages/[lang]/news/index.astro`, `news/[slug].astro` | `getNews`, `getNewsItem` | `newsItem` |
| Past editions (no frame) | `src/pages/[lang]/editions.astro` | `getEditions` | `edition` |
| Contact (no frame) | `src/pages/[lang]/contact.astro` | `getMainPage('contact')`, `getSettings`, `getPeople('team')` | `page` (section `contact`), `siteSettings` (address, social, newsletter), `person` (team members with an email) |
| Standalone page (no frame) | `src/pages/[lang]/[...slug].astro` | `getPage` | `page` without a `section`, slug per locale |

Frames marked "no frame" have no Figma yet. Build them from the closest frame
and the design tokens, and list them in the PR so Léonie knows what to draw.

### How a hub page is put together

`art-prize`, `programme`, `partners`, `visit`, `about` and `guest-of-honour`
are hubs: one `[...tab].astro` route, pill tabs from `HUBS` in
`src/lib/hubs.ts`, first tab on the hub root. `HubNav` renders the pills.
A tab with a `link` is a pill that leads to another hub (programme →
awards goes to the art prize awards, about → partners to the partners hub);
it has no route of its own and is never the active pill. `hubTabHref` gives
a pill's path either way.

- **Text tabs** come from a `page` document with a matching `section` and
  English slug, found with `pageForTab(pages, slug)`. A `page` gives you:
  `title`, `tabLabel`, `intro`, `body` (rich text), `sections` (the block
  stack), `images` (closing images), `cover`, `seo`. Render all of them; an
  editor who fills `cover` and sees nothing will file a bug.
- **List tabs** (laureates, awards, jury, talks, food & drinks, people) are
  built from their own documents, with the `page` for that tab, if one
  exists, supplying the intro text above the list.

### The section blocks are the templates

Editors compose pages from a fixed set of blocks, and the eleven **page
templates** in the Studio are nothing more than saved stacks of those blocks.
So the look of the templates *is* the look of the block components. Styling
one block styles every template and every page that uses it.

`PageSections.astro` renders a stack in editor order, one component per block
type. Text blocks are grouped by `layout` (two columns, one column, or two
half-width blocks side by side); everything else is one block, one component.

| Studio label | `_type` | Component | Fields the query returns |
| :-- | :-- | :-- | :-- |
| Text | `contentSection` | `Sections.astro` | `layout`, `heading`, `body`, `images[]`, `links[]` |
| Image + text | `imageTextSection` | `sections/ImageText.astro` | `imageSide`, `image`, `heading`, `body`, `links[]` |
| Image grid | `gallerySection` | `sections/Gallery.astro` | `columns` (2/3/4), `captions`, `heading`, `images[]` |
| Slideshow | `slideshowSection` | `sections/SlideshowSection.astro` | `aspect`, `heading`, `images[]` |
| Video | `videoSection` | `sections/VideoSection.astro` | `heading`, `video` (falls back to the current edition's film) |
| Quote | `quoteSection` | `sections/Quote.astro` | `quote`, `attribution` |
| Feature | `spotlight` | `sections/Feature.astro` | `kicker`, `headline`, `link`, `image`; `flip` alternates sides |
| Banner | `bannerSection` | `sections/Banner.astro` | `style`, `text`, `link`, `image` |
| Buttons | `linksSection` | `sections/Links.astro` | `variant`, `links[]` |
| Section title | `headingSection` | `sections/Heading.astro` | `title` |
| People | `peopleSection` | `sections/People.astro` | `group`, `heading`, `people[]` (resolved) |
| Partners | `partnersSection` | `sections/Partners.astro` | `display` (`logos` / `list`), `tier`, `heading`, `body`, `partners[]` (resolved: `name`, `logo`, `url`, `description`) |
| Key figures | `keyFiguresSection` | `sections/KeyFigures.astro` | `image`, `link`, `edition.keyFigures` (resolved) |
| Latest news | `newsSection` | `sections/News.astro` | `count`, `heading`, `items[]` (resolved) |
| FAQ | `faqSection` | `sections/Faq.astro` | `heading`, `items[]{question, answer}` |
| Embed | `embedSection` | `sections/Embed.astro` | `url`, `height`, `heading` |

Every block also has `anchor` (render it as the section `id`) and `hidden`
(already dropped by the query). Text fields marked "styled" carry the editor's
role choices: Lead / Normal / Small / Heading / Subheading / Minor heading /
Quote, and the three swatch marks `.t-highlight`, `.t-muted`, `.t-inverse`.
`PortableText.astro` turns them into classes; the CSS decides what each role
looks like. Restyling a role never needs a content migration.

To see every block on one page, open the Studio, create a page from
**Page templates → Photo page** or **People page**, publish it, and load it on
localhost. Or apply a template to a scratch page with **Apply template…** in
the document ⋯ menu.

### Images, links, dates, strings

- Every Sanity image goes through `SanityImage.astro` (`image`, `widths`,
  `sizes`, `aspect`, `loading`, `class`). Never hand-roll an `<img>` for
  CMS content. A `figure` carries `alt`, `caption` (artist), `workTitle`
  (italic), `year`, `credit`; the design's "Artist, *Title*, 2024" line is
  assembled from those.
- Links are objects. `resolveLink` in `src/lib/links.ts` turns them into an
  href; internal links get "→", external ones "↗". `LinkPill` is the pill.
- Dates: `formatDate`, `formatDateRange`, `formatTime` from `i18n.ts`.
  Never `toLocaleDateString`.
- Labels around content (nav items, "Read more", empty states, tab labels)
  are `STRINGS` in `i18n.ts`. **Add a key to `en`, `fr` and `nl` at once.**
  A missing key falls back to English silently, so a French page with an
  English label is a bug nobody is warned about.
- Colours are tokens on `Base.astro` (`--ground`, `--surface`, `--ink`,
  `--rule`, `--accent`, `--acid`…). Dark mode redefines the tokens, so a
  literal hex looks right in light mode and wrong in dark.
- Scoped `<style>` in the `.astro` file that uses it. No global stylesheet,
  no framework.

## The localhost loop

```sh
npm run dev          # http://localhost:4321/en/  (also /fr/ and /nl/)
```

Published content shows on the next refresh, no rebuild. Drafts do not show
on localhost at all: use the Studio's **Preview** tab or **Open preview** on
`https://dev.ceramic-brussels.pages.dev/studio/` for those. The Edit link on
every dev page opens the document being rendered.

Before calling a page done, check it:

1. at 1440px against the frame, then narrower (there are no mobile frames;
   keep it usable, do not invent a mobile design);
2. in all three languages, with the language switcher, because French and
   Dutch copy runs longer;
3. in dark mode (`prefers-color-scheme`);
4. with **empty** content: hide a block, blank a field, use an exhibitor
   with no images. Every list needs its empty state string; every optional
   field needs to disappear cleanly.

`npm run build` should pass before a PR; it renders every page and fails on a
broken one.

## When the design needs something the data does not have

This is the important rule. The design will ask for things the model does
not carry yet: a subtitle under a laureate, a second image on a partner, a
new tab, a field on the edition. When that happens:

1. **Do not add it on the frontend side.** No new schema field, no query
   edit, no hard-coded copy standing in for a CMS field. A hard-coded value
   ships to production and nobody can edit it.
2. **Log it in `docs/backend-requests.md`** with the page, the Figma frame,
   what the design shows, what the query returns today, and what you rendered
   meanwhile. Number it.
3. **Mark the spot in code** with a comment carrying that number, so Kamindu
   can find where the field lands:
   ```astro
   {/* BACKEND-REQUEST #3: laureate subtitle */}
   ```
4. **Render gracefully meanwhile**: leave the slot out, or show what exists.
   The page must still build and still look finished without the field.
5. Mention the request numbers in the PR description.

Kamindu adds the field, the migration if content exists, and the projection,
then marks the request done with the field's name and where it appears in the
helper's return value. You then wire it in.

Things that are *not* requests, because they are yours: a new UI string, a
new component, a different layout for existing data, a placeholder image, a
hover state, an animation.

## Branch and PR

Work on `lilanga`, push often: every push builds its own preview at
`https://lilanga.ceramic-brussels.pages.dev`. Open PRs into `dev`; `dev`
builds `https://dev.ceramic-brussels.pages.dev`, and Kamindu merges `dev`
into `main` (production). Merge `dev` into `lilanga` regularly, because the
backend half moves in parallel.

Before every commit:

```sh
npm run boundary     # files outside the frontend half → move them to a request
npm run build        # every page renders
```
