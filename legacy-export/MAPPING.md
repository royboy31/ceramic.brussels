# Legacy → Sanity import mapping

How the Twill export in `legacy-export/` lines up with the content model in
`src/sanity/schemaTypes/`. Counts are actual, from the export.

## What the legacy model is

Twill stores almost everything as a **page with an ordered list of blocks**.
There are only four record types (`pages`, `exhibitors`, `pastEditions`,
`parisPages`) plus two singletons, and 12 block types carry all the structure.
Every text field is `{en, fr, nl}`; images live in a shared media library and
are referenced per block with their own alt text and caption.

The new model inverts this: people, partners, events, laureates and awards are
**documents**, not blocks. So the import is mostly *promoting blocks to
documents* and keeping only genuinely prose-shaped pages as `page`.

## Record-level mapping

| Legacy | Count | → Sanity | Notes |
| :-- | --: | :-- | :-- |
| `exhibitors` | 202 | `exhibitor` | Direct. `city_id`→`city`, `category_id`→`kind`, `year`→`edition` ref, `booth`, `description`→`bio`, `gallery`→`images[]` (figures with caption/alt already present) |
| `pages` (prose) | ~20 | `page` | Ones whose blocks are only text/title/image/gallery. Need a `section` + tab slug from `src/lib/hubs.ts` |
| `pages` (rosters) | ~14 | promoted to documents | advisory board, team, founders, juries, partners tiers, programme, laureates, awards — see below |
| `pastEditions` | 30 | `edition` archive + documents | Same block shapes, but for 2024/2025. Feeds past `edition` docs and historical `person`/`partner`/`laureate`/`programmeEvent` records |
| `parisPages` | 8 | **decision needed** | Manifest Paris is a separate venture. Either a second Sanity dataset/site, or a `site` field on `page` |
| `homepage` | 1 | `homepage` | 9 `image-text` blocks → `spotlights[]` |
| `settings_contact` | 1 | `siteSettings` | One `contact_text` rich-text field |

## Block → document promotion

| Legacy block | Count | → Sanity | How the extra fields come out |
| :-- | --: | :-- | :-- |
| `person` | 63 (45 unique people) | `person` | `title`→`name`, `subtitle`→`role`, `text`→`bio`, `portrait`→`portrait`. `groups[]` from the page it sits on (advisory board / team / jury / collaborator); `edition` from the page's year |
| `partner` | 54 (31 named + 21 logo-only) | `partner` | Named blocks give `name`/`subtitle`/`description`. The 21 logo-only blocks are logo grids: **96 logos**, 23 carrying a `link` — one `partner` per logo. `tier` comes from the page (main, institutions, hotel, logistics, insurance, media, food & drinks, exhibition pass, …) |
| `event` | 84 (82 timed) | `programmeEvent` | `title`, `text`→`description`, `start_hour`/`end_hour` + the day from the preceding `title` block (e.g. "wed 21 jan.") → `startsAt`/`endsAt`. "(Upon invitation)" in the heading → `invitationOnly` |
| `title` + `text-2col` + `gallery` runs | 38 runs | `laureate` / `award` | On laureate pages the heading is the artist name → `artist` doc + `laureate` with `statement` and `images[]`. On award pages the heading is the award name → `award` |
| `accordion` | 35 | FAQ / `contentSection` | `title`→question, `text`→answer. The `visit`/`faq` tab and the set-design and focus españa pages |
| `text-1col` / `text-2col` / `title` | 262 | `page.sections[]` / `body` | Prose. `text-2col` is a layout hint, not content — collapses to `localeBlock` |
| `gallery` / `image` | 89 | `figure[]` | Captions and alt are already per-locale on each media reference |
| `flipbook` | 3 | `link` or embed | `embed_code` — likely Issuu; needs a home in the new model |
| `image-text` | 9 | `homepage.spotlights[]` | Homepage only |

## Media

- **2,285** images in the library; **1,434** are actually referenced by content.
- Every reference carries per-locale `altText` and `caption`, plus the default
  crop box — enough to build `figure` objects directly.
- Originals are at `https://ceramic.brussels/img/<uuid>/<filename>`, unsigned,
  so the import script can stream them straight into Sanity's asset API.
  Recommendation: **import only the 1,434 referenced images**, not all 2,285.
- 11 files in the file library (PDFs — floor plan candidates for `edition.fairMap`).

## Open questions

1. **Manifest Paris (8 pages)** — separate site, separate dataset, or a flag on
   `page`? This decides whether the import writes into one dataset or two.
2. **Past editions (30 records)** — how much of 2024/2025 is worth keeping?
   They duplicate people and partners that also exist in the current pages, so
   dedupe is by name and the same person gets one document with two `edition`
   refs rather than two documents.
3. **Which prose page becomes which hub tab.** The legacy slugs
   (`/art-prize`, `/guest-of-honour`, `/partners-3`, `/food-and-drinks-2`) map
   onto `HUBS` in `src/lib/hubs.ts` but not one-to-one — some hub tabs have no
   legacy page and some legacy pages have no tab.
4. **Drafts** — 12 pages and 2 exhibitors are unpublished. Import as Sanity
   drafts, or skip?
5. **Artists.** Laureate headings carry a country suffix — "Daria Kowalewska
   (pl)" — so `artist` documents can be created with `countryCode` parsed out.
   Confirm that's wanted rather than free text.

## Files

| File | What |
| :-- | :-- |
| `raw/ceramic-twill-export.json` | Verbatim capture, 6.5 MB. The source of truth |
| `normalized/*.json` | Per-module records: locales decoded, blocks assembled, select ids resolved to labels, media flattened with alt/caption/crop |
| `derived/*.json` | Candidate `person`, `partner`, `event`, `laureate`/`award` and FAQ entities pulled out of the blocks |
| `INVENTORY.md` | Full page tree, block composition, facet counts |
| `normalize.mjs` / `derive.mjs` | Rerunnable — `node legacy-export/normalize.mjs` |
| `reconcile.mjs` | Proves the normalised set loses no field against the raw capture |
