# Design pages → CMS plan

Written 2026-09-08 from the sixteen finished HTML pages in `html pages/`
(Lilanga's static build of the Figma frames, "final for now"), compared
against the Sanity schema, the queries and what the `production` dataset
holds today. It says, page by page, what the design shows, which document
and field already carries it, and what is missing on each of the three
sides: schema/query (Kamindu), content (editors, with Kamindu's import),
and frontend (Lilanga).

The headline: **the model already fits.** Every element on the sixteen pages
maps to an existing field, with two exceptions that need a schema or code
change (a partner-logos block, and hub tabs that link to another hub). What
is mostly missing is *content*: images, the 2027 dates on imported events,
site settings, and page stacks arranged to match the design. The frontend
work is a port of Lilanga's own markup into the route files and the block
components, binding each element to the field named below.

`html pages/` is not committed (165 MB of PNGs); Lilanga has the source
project. It is gitignored.

## Status, 2026-09-11 — old URLs redirected; pages.dev out of search

`main` is `6417b67`, live on ceramic-brussels.pages.dev (deployment
`5a70eb9f`). Three things landed since the entry below, each cherry-picked
onto `main`:

- **The production alias is noindexed** (`a11ade3`, 09-10). Cloudflare adds
  `x-robots-tag: noindex` to branch previews by itself but not to
  ceramic-brussels.pages.dev, so all 702 pages were crawlable before launch.
  A rule at the end of `public/_headers` names that host only, so
  www.ceramic.brussels will never get it. Before and after the deploy, 15 URLs
  were compared: the header was the only change.
- **The homepage "latest news" spacing** matches frame 4:4 (`e135cf7`, from
  another session).
- **Every old site URL redirects** (`6417b67`). `public/_redirects` held only
  a comment pointing at a `legacyPath` field that never existed, so every old
  URL would have 404ed at cutover. `scripts/legacy-redirects.mjs` now runs at
  the end of `npm run build` and appends 474 rules to `dist/_redirects`. It
  maps each old page, by its English slug, to the new English path. The old
  FR/NL slugs come from `legacy-export/normalized`: the old site accepted any
  slug under any language prefix, and every section of a long page was its
  own URL, so each old slug gets a rule under /en, /fr and /nl. The FR/NL
  targets come from each built page's hreflang, so the pending FR/NL slug
  translation needs no second map. A target that was not built fails the
  build. Verified on production: every URL in
  `docs/legacy-site-inventory.md` has a rule (254), and all 475 answer 301 in
  one hop onto a 200. The root now goes straight to `/en/`; it was two hops.
  Judgement calls, each one line of the map: an old URL that is also a new
  page keeps its new meaning (`/en/programme` was food & drinks, now the
  programme hub). Past exhibitor years go to `/editions/`. `/contact` is a page
  of its own again (`src/pages/[lang]/contact.astro`, 2026-09-11; it went to
  about → team before), and the exhibition pass goes to partners → event.

**At cutover:** run `node scripts/legacy-redirects.mjs --check
https://www.ceramic.brussels` (and `curl -I` to confirm no noindex there),
then remove the pages.dev noindex rule, or keep it: it never matches the real
domain, and it keeps pages.dev from being indexed as a duplicate. Still open
there:
- The bare `ceramic.brussels` domain needs to redirect to www, and old links
  on it take two hops unless the bare domain is also attached to Pages.
- Old `/img/…` and `/storage/uploads/…` links, including the PDFs, are not
  redirected; about 1,000 rules could be built from `asset-map.json`.
- `#section` anchors land at the top of the right page, not on its tab; that
  needs a small script in the page (frontend).
- Canonical and hreflang tags point at slashless URLs, which Pages answers
  with a 308 (frontend, `Base.astro`).

Housekeeping: `kamindu` carries today's three changes under their original
hashes (`0126daa`, `dad68e4`, `174fa3d`; `main` has them as cherry-picks).
But it lacks Lilanga's three 09-09 fixes (licensed font, partner logos,
exhibitor page), which went to `main` straight from `lilanga`. The status
entries in this file exist only on `kamindu`. `dev` and `lilanga` still trail
`main`. `git rebase origin/main` on `kamindu` lines it up: git skips the
commits `main` already has as cherry-picks and replays only the docs.

## Status, 2026-09-09 — live on production; main pages editable

The ported design went to `main` in the morning (`8c20e75`) and has been
on ceramic-brussels.pages.dev since. Three more things landed on `main`
over the day, each cherry-picked straight from its branch:

- **The favicon.** It had been Astro's scaffold logo since the first
  commit. The old Twill site's own set replaced it — the acid dot as a real
  16 + 32 ICO, an SVG and a 180px apple-touch-icon (`8ccb8fb`). Not taken:
  the old `site.webmanifest`, which has an empty name.
- **Lilanga's fixes** from `lilanga`: the licensed Noi Grotesk cut (the
  trial carried no accents, curly quotes or dashes, so French and Dutch
  had been falling back to Helvetica), the partner-logo halo and collisions,
  and the exhibitor detail page filling the window.
- **Main pages in the Studio** (`2309090`, then `a2a0ee3`). Editors could
  not find where `/en/about` or `/en/exhibitors` are edited: a hub's URL is
  its first tab, so the about page was the document called "ceramic
  brussels" under About → Tab pages, and the listings had no document at
  all. The sidebar now opens with a **Main pages** folder — Homepage,
  Exhibitors, Artists, Guest of honour, Art prize, Programme, Partners,
  Visitors info, About, News — each opening the document that page is made
  from. The listings became editable the same way: a page in the
  `exhibitors`, `artists` or `news` section supplies the lead paragraph,
  SEO and a section stack rendered under the list; the list stays code.
  Details in CLAUDE.md, "Main pages in the Studio". The dead
  "Exhibitors — new tab" template is gone.

What remains is unchanged from the list below, plus two housekeeping
items: `dev` and `lilanga` trail `main` and want syncing before Lilanga's
next push, and the exhibitors page's lead paragraph is an empty draft
waiting for an editor (the old site never had one).

## Status, 2026-09-08 late — side-by-side pass done

Every page was opened next to its design page in Chrome at 1440px, the
text parity script re-run, and the production build passed (705 pages).
Fixed in that pass: the guest portrait and two other rules that targeted a
class on a child component (scoped styles never reach a child's markup —
use `:global(.class)` for those); the "exhibitors" title band on the list
and detail pages; lowercase hub and tab titles; the 2026 awards in the
design's column order; the talks accordion closed by default; the
institutions tab down to the institutional tier; the design's text for the
hotel, the advisory board and ANALORA. What remains is the content list
below, unchanged.

## Status, 2026-09-08 night — the frontend is ported too

Kamindu ported the sixteen pages into the routes the same night (see
"How the design is wired" in `docs/frontend-handbook.md`): the shell with
the accordion menu, the homepage and its block variants, and every hub
page, each with the design's markup and its page CSS. Checked page by page
against the design in Chrome at 1440px and with the text parity script.
What still differs from the design, all of it content or deliberate:

- The 2027 laureates have no bio, birth year or base line yet (the design
  shows the 2026 laureates); the talks tab shows the seeded 2027 events.
- The art prize "about" hero is one cover image where the design has a
  three-slide show; the counter reads 1/1.
- Anna Laudel is filed under Istanbul, so its code reads TR, not the
  design's DE; the "art shippers" paragraph under two Brussels institutions
  is a design placeholder and was not copied.
- The A–Z strip greys out letters that have no exhibitor; the design's
  static strip does not.
- Mobile: the design has no mobile frames; the ported CSS carries the
  build's own breakpoints, untested below 700px.

## Status, 2026-09-08 evening — the CMS side is done

Everything below the line that was marked **schema** or **content** has
been applied, and checked page by page against the design with a script
that looks for every visible line of each design page on the matching
localhost page (`npm run dev` against the live dataset):

- **Code**: `partnersSection` block (schema, projection, `sections/Partners.astro`,
  thumbnail); hub tabs that link to another hub (`HubTab.link`, `hubTabHref`,
  `HubNav`), wired for programme → awards and about → partners; the film
  falls back to the latest edition that has one; four new page templates
  (`npm run templates`).
- **Data** (`scripts/apply-design-content.mjs`, re-runnable, images cached in
  `legacy-export/design-asset-map.json`): the Navigation document as the
  design draws the menu; the 50 design images on the documents that show
  them (dates mark, hero, features, guest portrait and works, 2027
  exhibitors, 2026 laureates, awards, partners, page covers and closing
  rows, practical-info photos, four Thursday talks); the homepage stack in
  the design's order; the art prize partners block with MAD, A+S and ASCP;
  duplicate partners merged, award families fixed, 2027 country focus,
  practical info (venue, address, access, hotel deal).
- **Text** (`scripts/sync-design-text.mjs`): where the design's copy is newer
  than the legacy import, the design wins — guest of honour intro, biography
  and practice, art prize texts, 2026 laureate bios, seven award
  descriptions, five institution and four food-vendor descriptions, the
  about page, the CHAxART bio, ticket notes, captions.
- **Programme** (`scripts/fix-programme-2026.mjs`): the events the import had
  filed under 2027 without dates are the **2026** programme (the captured
  page's day headings are the 2026 dates); they now carry their 2026 day,
  time, section, kind, speakers and language. The 2027 talks tab therefore
  shows the seeded 2027 placeholders, not the 2026 talks the design used as
  sample content. That is the one place the CMS deliberately does not match
  the design; editors add the real 2027 talks.

What the parity check still lists is **frontend** — the same data rendered
differently by today's routes, which Lilanga's port replaces: country codes
on exhibitor cards, "°1994" before the base line, "● A5" after the city,
the "presenting" line from `artistsText`, "→ Name and Name" joins on awards,
slideshow counters and captions ("1/5 · Artist, *Title*, year"), work
captions on the guest page, the La Cambre intro on the programme hub, the
opening-hours / tickets / access typography, the day accordions on talks,
and the `+` sub-menus of the menu overlay (the children are already in the
data: today's overlay prints them as a subtitle line).

Two design placeholders were not copied: the "art shippers" paragraph
pasted under City of Brussels and Brussels-Capital Region, and Anna
Laudel's "DE" (the gallery is filed under Istanbul).

## Reading the tables

- **Design** — what the HTML page shows, in order.
- **Data** — the document and field that carries it, and the query helper
  that returns it. `page.*` means the `page` document with that hub
  `section` and English slug, fetched with `getHubPages(lang, section)`.
- **Gap** — `schema`, `content` or `frontend`, and what to do.

Where a page is a `page` document, the last column of its table is the
**section stack** that reproduces the design; that stack is what to save as
a page template (Studio → Page templates) so the next page of the same
shape starts from it.

---

## Global

| Design | Data | Gap |
| :-- | :-- | :-- |
| Header: dates mark, wordmark, EN / FR / NL, menu button | `edition.datesMark` (current), `siteSettings.siteName`, locales | **content**: the 2027 edition has no `datesMark` image yet; upload the "20–24 January 2027" mark |
| Menu overlay: 7 rows, some with `+` and children ↗ | `navigation.items[]` with `children[]` | **content**: today's document does not match the design. Design: exhibitors (no children), guest of honour, art prize (about, laureates, awards), programme (La Cambre, talks), partners (institutions, hotel), visitors info (practical info, food & drinks), about (ceramic brussels, advisory board). Today: exhibitors carries four filter children, partners has none, visitors info lists five anchors. Edit the Navigation document. |
| Footer: © line, instagram / newsletter / linkedin | `siteSettings.copyright`, `navigation.footerItems[]`, `siteSettings.*Url` | — (present) |
| Acid-yellow header/footer wash, black-outline pill tabs | — | **frontend**: `Header`, `Footer`, `HubNav`, tokens `--acid` |

## Homepage — `/`

`homepage` singleton: `getHomepage`. Fixed hero, then a section stack.

| Design | Data | Gap |
| :-- | :-- | :-- |
| Hero image, statement, "more on the fair →" | `heroImage`, `heroText`, `heroLink` | — |
| Quick links: galleries · art prize · visitors info · tickets | `quickLinks[]` | — |
| h2 "latest news" | `headingSection` | **content**: add block |
| Guest-of-honour feature (eyebrow, headline, link, image) | `spotlight` (exists) | — |
| "ceramic brussels 2026 in images →" text link | `bannerSection` style `text`, or `linksSection` variant `text` | **content**: exists as a banner; set style |
| Full-width film, autoplay muted loop | `videoSection` (falls back to the *current* edition's `film`) | **content**: 2027 has no film; 2026 does. Set `edition[2027].film` to the YouTube URL, **or** **schema**: fall back to the latest edition *with* a film. Do the query change; it also fixes every future January. |
| Partner spotlight (The Hoxton) | `spotlight` (exists) | — |
| "key 2026 figures": 19,200 visitors · 70 exhibitors · 200+ artists · 3,500 VIPs · 230+ press clips | `keyFiguresSection` → latest edition with `keyFigures` (2026 has 6) | **content**: editor trims to the five shown, or keeps six |
| "2026 in images →" again | `bannerSection` (exists) | — |

**Stack to save as template "Homepage 2027":**
`headingSection` · `spotlight` · `bannerSection`(text) · `videoSection` · `spotlight` · `keyFiguresSection` · `bannerSection`(text).
Today's stack has the same blocks in a different order plus a "gallery
applications" banner the design does not show: reorder, hide that one.

**Frontend:** hero grid, quick-link row, `Feature.astro` (spotlight),
`VideoSection.astro` (YouTube embed with the design's autoplay params),
`KeyFigures.astro`, `Banner.astro` text style, `Heading.astro`.

## Exhibitors — `/exhibitors`

`getExhibitors(lang)` (current edition), `getCurrentEdition`.

| Design | Data | Gap |
| :-- | :-- | :-- |
| A–Z index strip | derived from `sortName` | **frontend** |
| Filters: solo show · focus españa · publishers · jury prize 2026 | `soloShow`, `inCountryFocus` + `edition.countryFocus`, `kind = publisher`, `kind = jury-prize` (route has these) | **content**: `edition[2027].countryFocus` is empty; 2026 has "focus España". Set it on 2027 |
| Card: image, name, country code, badge tags | `images[0]`, `name`, `country`, `soloShow` / `inCountryFocus` | **content**: the 14 exhibitors of 2027 have **no images** (old CMS never had them). Editor uploads. **frontend/schema**: `country` holds full names ("France", "Netherlands"); the design shows "FR", "NL". Either a name → ISO map in the frontend, or a `countryCode` field on the backend. Frontend map is enough for the seven countries of 2027; log a request if it grows. |

**Frontend:** grid, filter pills, badge chips (the HTML uses `solo-show.png`;
render as a styled chip instead so it translates).

## Exhibitor detail — `/exhibitors/[slug]`

`getExhibitor`, plus `getExhibitors` for previous / next.

| Design | Data | Gap |
| :-- | :-- | :-- |
| Artwork figure with "Artist, *Title*" caption, solo-show badge | `images[0]` (`caption`, `workTitle`, `year`), `soloShow` | — |
| Name · "Paris (FR) ● B28" · instagram ↗ · website ↗ | `name`, `city`, `country`, `booth`, `instagram`, `website` | — |
| "presenting" + artist names | `artists[]->name`, `artistsText` | — |
| Bio paragraphs | `bio` | — |
| "back to all →", "← previous / next →" | route already computes them | **frontend** |

No gap beyond images.

## Guest of honour — `/guest-of-honour` (+ `/interview`)

`getGuestOfHonour(lang)` → the current edition's `artist`, with its feature
group. The design shows **about | interview** as in-page anchors on one
page; the hub has them as two tab routes. Keep the routes (the navigation
document and `link` anchors already point at them); Lilanga styles `HubNav`
the same.

| Design | Data | Gap |
| :-- | :-- | :-- |
| Portrait | `artist.portrait` | **content**: Verboom has none |
| Name · "°1983, France" | `name`, `birthYear`, `nationality` | — |
| Intro paragraph | `artist.intro` | — |
| h3 "biography" + paragraphs; h3 "sculptural practice" + paragraphs | `artist.sections`: two `contentSection`s with those headings (already there) | — |
| Two work images between them | `artist.works[]` (2 present) | — |
| Video still with ▶ → YouTube | `artist.video.url` (+ `poster`) | **content**: poster |
| Interview tab | `artist.interview` | — |

Note for Lilanga: the "biography" text lives in the section stack, not in
`artist.bio` (which is the short bio used on laureate and exhibitor pages).

## Art prize — `/art-prize` hub (yellow treatment)

Tabs from `HUBS['art-prize']`: about · laureates · awards · jury.

### about — `page` section `art-prize`, slug `about`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Cover image | `page.cover` | **content** |
| Intro sentence | `page.intro` (present) | — |
| "the prize", "applications" text sections | `page.sections` — two `contentSection` (page has 3 blocks today) | **content**: check headings |
| "partners" paragraph + MAD / A+S / ASCP logos | no block lists partners | **schema**: new block `partnersSection` — `heading`, `body`, `tier` (or hand-picked `partners[]->`), renders `partner.logo` linked to `partner.url`. Reuse on the partners hub (main partner, event partners, media) and anywhere logos appear. **content**: MAD Brussels exists (tier `art-prize`, no logo); add A+S and ASCP Studio, upload logos. |
| Three closing images | `page.images[]` | **content** |

**Stack / template "Hub page with partners":** `contentSection` · `contentSection` · `partnersSection`.

### laureates — `getLaureates(lang)` (current edition)

| Design | Data | Gap |
| :-- | :-- | :-- |
| Alternating rows: slideshow image, name, instagram ↗, "°1994 Based in Norway", two bio paragraphs | `laureate.images[]`, `artist.name`, `artist.instagram`, `artist.birthYear`, `artist.basedIn`, `artist.bio` | **content**: the design shows the 2026 laureates. The five 2027 laureates exist with 4 images each but **no bio, birthYear or basedIn**; the 2026 ones have bios but **no images**. Fill whichever edition the tab is meant to show. |

No intro paragraph in the design; the `page` for this tab stays empty.

### awards — `getAwards(lang)` filtered `family == 'art-prize'`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Intro | `page.intro` (present) | — |
| Per award: name, "→ Laureate will…", description, optional image | `award.name`, `outcome`, `description`, `image` | **content**: (1) 2027 has no awards, the route shows the current edition — either enter 2027 awards after the jury or show the newest edition that has any (**query** tweak, recommended); (2) 2026 has duplicates ("The jury prize" / "jury prize"); (3) the partner awards listed in the design (Ateliers dans la Forêt, Latvian Centre, YXCCCA, Ambassade de France, CWB Paris, Keramis) are `family: fair` in the dataset and must be `art-prize` to appear; (4) images on jury prize and Keramis. |

### jury — `getPeople(lang, 'jury')`, no design page

Five 2027 jury persons exist with portraits and bios. Build from the
advisory-board pattern.

## Programme — `/programme` hub

Tabs: ceramic brussels x La Cambre · talks · awards · VIP.

**Design detail:** the **awards** tab links to `/art-prize/awards`; today's
hub renders programme events of section `awards` (the ceremony). **schema/
code**: let a `HubTab` carry a link to another route (`hubs.ts` +
`HubNav`), and point this tab at art prize → awards. Same mechanism for the
about hub below.

### la-cambre — `page` section `programme`, slug `la-cambre`

Design shows the intro paragraph only (the frame is taller; nothing else is
built). `page.intro` is present. When the rest arrives it is a
`contentSection` + `gallerySection` stack — template "Project page".

### talks — `getProgramme(lang, 'talks')`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Intro | `page.intro` (present) | — |
| One accordion per day ("Thursday 21 January ↓"), open by default for the first | grouped by `startsAt` day (route does it) | **frontend**: `<details>` |
| Row: `{ Artist Talk }` · 14:00 · title · image · "FR / with speakers" | `kind`, `startsAt`, `title`, `image`, `languages[]`, `speakersText` | **content**: only 4 of the ~25 imported 2027 events have a `section` and a `startsAt`; the rest (book launches, roundtables, Spanish-focus talks…) have neither, so they never render. Kamindu: set them in the import or by hand. Images on none. |

### vip — `getProgramme(lang, 'vip')`

Preview and vernissage exist for 2027. No design page.

## Partners — `/partners` hub

Tabs: main partner · institutions · hotel · event partners · media
(`PARTNER_TABS` maps tab → tiers).

### institutions — `getPartners` tiers `institutional`, `exhibition-pass`, `art-prize`

| Design | Data | Gap |
| :-- | :-- | :-- |
| h2 "institutions" | tab label | — |
| Per partner: name, description, website ↗ — **no logos** | `name`, `description`, `url` | **content**: duplicates from the two imports (LOEWE FOUNDATION / Loewe Foudation, two Centre Wallonie-Bruxelles, two SNA, Brussels-Capital Region twice). Merge; keep the 2027-tagged one. |

### hotel — tier `hotel`

| Design | Data | Gap |
| :-- | :-- | :-- |
| h2 "hotel", large photo, h2 name, three paragraphs, website ↗ | `partner.images[0]`, `name`, `description`, `url` | **content**: two Hoxton documents, no images |

### main partner · event partners · media — no design page

Logo lists. Use the new `partnersSection` block or the same list style as
institutions. Puilaetco (main), five 2024 event partners, eight media exist.

## Visitors info — `/visit` hub

Tabs: practical info · food & drinks · floor plan · FAQ.

### practical-info — edition + siteSettings

| Design | Data | Gap |
| :-- | :-- | :-- |
| Cover photo (Tour & Taxis entrance) | `siteSettings.practicalInfo.heroImage` or `page.cover` | **content** |
| "ceramic brussels' 4th edition will take place from 20 till 24 January 2027 at Tour & Taxis, Brussels." | `edition.ordinal`, `startDate`, `endDate`, `venue` → `formatDateRange` | **frontend**: compose from fields; or `page.intro` |
| opening hours: three day rows with slots and "(upon invitation)" | `edition.openingHours[]` (3 present on 2027), `openingSlot.invitationOnly` | — |
| address | `siteSettings.practicalInfo.venueName`, `address` | **content**: empty |
| tickets: five rows, price, note; "book your tickets ↗" | `edition.tickets[]` (5 present), `ticketsUrl` | — |
| hotel deal: THE HOXTON paragraph, "discover the hotel ↗" | `siteSettings.practicalInfo.hotelDeal` (`partner`, `text`, `url`) | **content**: empty |
| access: public transport / train / bike / car park | `siteSettings.practicalInfo.access[]` (`mode`, `text`) | **content**: empty |
| Three closing images | `siteSettings.practicalInfo.images[]` | **content** |

### food-drinks — tier `food-drinks`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Intro | `page.intro` (present) | — |
| Per vendor: name ↗ (link), slideshow "1/3", paragraphs | `name`, `url`, `images[]`, `description` | **content**: no images on any; duplicates (Flora / Flora Brussels, Fernand Obb ×2, MOK ×2, Traiteur Benjamin) |

### floor-plan · faq — no design page

`edition.fairMap` (file) and `siteSettings.faq[]` (3 items exist). FAQ is
the `faqSection` block's look.

## About — `/about` hub

Tabs in the design: ceramic brussels · advisory board · team · **partners**
· press · images. The **partners** tab links to the partners hub — same
cross-link mechanism as programme → awards. `HUBS.about` has no such tab;
add it once `HubTab` can link out.

### the-fair — `page` section `about`, slug `the-fair`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Intro sentence | `page.intro` (present) | — |
| Cover photo | `page.cover` | **content** |
| "the fair", "goals" (with ↘ bullet list), "development" | `page.sections` — three `contentSection` (3 blocks present) | **content**: check; ↘ bullets are a list in rich text, styled by `PortableText` |
| Three closing images | `page.images[]` | **content** |

**Stack / template "Hub text page":** `contentSection` · `contentSection` · `contentSection` (single column, full width). Cover, intro and closing images are page fields, not blocks.

### advisory-board — `getPeople(lang, 'advisory-board')`

| Design | Data | Gap |
| :-- | :-- | :-- |
| Intro | `page.intro` (present) | — |
| Per person: name, portrait, bio, instagram ↗ website ↗ | `person.*` (7 for 2027, all with portraits) | — |

### team · press · images — no design page

Routes exist; build from the advisory-board and gallery patterns.

---

## Work split

### Kamindu — schema, queries, seeding

1. **`partnersSection` block**: schema in `pageBuilder.ts`, branch in the
   `SECTIONS` projection, `sections/Partners.astro` (Lilanga styles it),
   thumbnail via `npm run previews`. Fields: `heading`, `body`, `tier`
   *or* `partners[]->`.
2. **Hub tabs that link elsewhere**: `HubTab.href` (route + tab) in
   `hubs.ts`, honoured by `HubNav`, `hubTabParams` (no static path for a
   link tab) and `links.ts`. Wire programme → awards and about → partners.
3. **Query tweaks**: `videoSection` and the homepage film fall back to the
   latest edition *with* a film; awards tab shows the newest edition with
   art-prize awards when the current has none.
4. **Templates**: add to `scripts/seed-templates.mjs` — "Homepage 2027",
   "Hub text page", "Hub page with partners", "Project page" — and re-run
   `npm run templates`.
5. **Import fixes**: `startsAt` + `section` on the 2027 programme events;
   `family: art-prize` on the six partner awards of 2026; merge duplicate
   partners and awards; `countryFocus` on 2027.
6. **Navigation document** edited to the design's menu.

### Editors (Tiphaine), with Kamindu's help

Images everywhere: 2027 exhibitors (14), laureates of the shown edition,
partner photos (hotel, food & drinks), page covers and closing image rows,
Verboom's portrait, event images. Site settings: venue, address, access,
hotel deal. Homepage stack reordered as above. 2027 film URL.

### Lilanga — frontend

Port each page's markup and CSS from his build into the route file named
in `docs/frontend-handbook.md`, binding every element to the field in the
tables above; then the block components. Order: blocks (`Feature`,
`Banner`, `Heading`, `VideoSection`, `KeyFigures`, `Sections`, `Gallery`,
`People`, `Faq`, the new `Partners`) → homepage → exhibitors list and
detail → art prize (yellow) → visitors info → partners → programme →
about → guest of honour. Anything not in the tables goes into
`docs/backend-requests.md`.
