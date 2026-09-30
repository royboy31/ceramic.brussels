# Previous editions — build plan

Written 2026-09-30 from the seven Figma frames and six Figma comments in
`Previous editions/` (Léonie, 2026-09-28), compared against the routes, the
queries, the `production` dataset as it stands today, and the live old site.

**The new section.** Léonie's comment on the whole board: *"NEW SECTION to add
to the website: previous editions. I made the 2025 edition section, but the
principle and pages stay the same for 2026 and 2024."* So the frames are one
year's worth of a template that has to render three years.

**The headline: this is mostly a frontend job.** The dataset already carries
the bulk of it — every past edition has its exhibitors, laureates, jury,
events, key figures, photo gallery, guest of honour and country focus. Six
things the design shows have nowhere to live yet (requests #32–#37), and the
text for all six is sitting in `legacy-export/normalized/pastEditions.json`,
already captured from the old site. Nothing needs writing from scratch.

---

## 1. The URLs

Checked against the live site on 2026-09-30, not guessed.

| Live today | Status | Note |
| :-- | :-- | :-- |
| `/{lang}/pasteditions` | 200 | index, a flat list of links grouped by year |
| `/{lang}/pasteditions/2024\|2025\|2026` | 200 | the year root records |
| `/{lang}/pasteditions/{slug}` × 27 | 200 | same slug in EN/FR/NL — the segment was never translated |
| `/{lang}/exhibitors/2025` | 200 | the year list, in all three languages |
| `/{lang}/editions` | **404** | `editions` is this build's invention; it preserves nothing |

Two consequences:

**`editions` is not worth keeping.** It was chosen before this section was
designed and it inherits no address from the old site. The design, the client's
comments and the footer button all say *previous editions*. So the section moves
to that word:

```
/[lang]/previous-editions/[year]                    overview  (the year root)
/[lang]/previous-editions/[year]/guest-of-honour
/[lang]/previous-editions/[year]/exhibitors         → links out, see §4.3
/[lang]/previous-editions/[year]/art-prize
/[lang]/previous-editions/[year]/focus
/[lang]/previous-editions/[year]/programme
/[lang]/previous-editions/[year]/publication
```

Segments are translated the way every other route is (`src/lib/hubs.ts` rules):
`previous-editions` / `editions-precedentes` / `vorige-edities`. The old site
never translated `pasteditions`, so there is no legacy wording to preserve and
the French and Dutch can simply read properly.

**The redirect map costs about ten string edits.** `pastEditionPath()` in
`scripts/legacy-redirects.mjs` returns `editions/${year}` on one line and
generates every `/{lang}/pasteditions/{slug}` rule from it; the rest are
literals in `PAGES`, `ALIASES` and `UNPREFIXED` (`focus-espana`,
`ideat-special-prize`, `pasteditions`, `awards`, `collaborations`, `magazine`,
`1st-edition`, `exhibitors/2023`). Change those and the map rewrites itself —
it already reads each FR/NL target from the built page's own hreflang. Add
`editions` and `editions/<year>` as aliases onto the new paths so nothing that
shipped to a preview breaks.

**`/exhibitors/<year>` stays exactly where it is.** It is a live old-site URL in
all three languages, the redirect map already preserves it, and Léonie's comment
on the galleries list — *"these link to the individual gallery pages in
exhibitors 2025"* — means `/exhibitors/2025/<slug>` has to keep working too.
The exhibitors tab is a pill that leads there, not a second copy of the list.

---

## 2. The shape of a page

Every frame has the same three bands under the site header:

1. **The year band.** Full width, three equal cells, one per past edition, the
   current one filled black: `2026, THIRD EDITION | 2025, SECOND EDITION |
   2024, FIRST EDITION`. Newest first. Text is `edition.year` + `edition.ordinal`
   (`"3rd edition"`, already filled for all four editions, localised).
2. **The title band.** `2nd edition` on the left — again `edition.ordinal` —
   and the tab pills right-aligned, active one filled acid. This is exactly the
   existing `.section-head` block, and `HubNav.astro` already has the escape
   hatch for it: pass `title` and `items`, which it renders as pills with
   `href` used as given. **No change to `HubNav` is needed.**
3. **The tab's own content.**

The footer on six of the seven frames replaces the copyright line with a
`← back to 2027` pill (see §5.1).

### Tabs are per year, not fixed

This is the one thing that does not fit the `HUBS` model, where a hub's tabs are
a constant. A previous edition's tabs depend on what that year had:

| Tab | 2026 | 2025 | 2024 | Condition |
| :-- | :--: | :--: | :--: | :-- |
| overview | ✓ | ✓ | ✓ | always (the year root) |
| guest of honour | ✓ | ✓ | ✓ | `edition.guestOfHonour` is set |
| exhibitors | ✓ | ✓ | ✓ | that year has exhibitors (67 / 77 / 57) |
| art prize | ✓ | ✓ | ✓ | that year has laureates (10 / 10 / 10) |
| *focus* | ✓ | ✓ | — | `edition.countryFocus` is set |
| programme | ✓ | ✓ | ✓ | that year has events (21 / 18 / 14) |
| publication | ✓ | ✓ | ? | request #36 is filled |

So: a `tabsFor(edition)` function, not a static list. The focus tab's **label**
is the country (`norway focus`, `españa focus`) while its **segment** stays
`focus` in every year and language — a segment that changed with the country
would give each year a different URL for the same tab.

### Files

```
src/lib/previousEditions.ts              tabs, segments, paths, tabsFor()
src/pages/[lang]/previous-editions/[year]/[...tab].astro
src/components/editions/YearBand.astro   the three-cell year switcher
src/components/editions/Overview.astro
src/components/editions/GuestOfHonour.astro
src/components/editions/ArtPrize.astro
src/components/editions/Focus.astro
src/components/editions/Programme.astro
src/components/editions/Publication.astro
```

One route, a component per tab, mirroring `[hub]/[...tab].astro` and
`src/components/hubs/`. `getStaticPaths` comes from `getPastEditionYears()`
(exists) crossed with `tabsFor()`.

**One new query, `getPreviousEdition(lang, year)`.** `getEditionArchive` already
returns most of it — core fields, laureates, awards, jury, people, events,
images, exhibitor count — and it is the query the page it was written for
(`/editions/[year]`) will stop using. Extend it rather than adding a second.

### What happens to `/editions` and `/editions/[year]`

They are the undesigned archive built before this section existed
(`.legacy-page` primitives). `editions/[year].astro` is replaced by the new
route. `editions.astro` — the index — has **no frame**: the year band makes an
index unnecessary, so it becomes a redirect onto the newest past year
(`/en/previous-editions/2026`), which is also where `/{lang}/pasteditions` should
land. Confirm with Léonie before deleting the file (§8).

---

## 3. Data: what is already there

Queried `production` on 2026-09-30:

| | 2026 | 2025 | 2024 |
| :-- | --: | --: | --: |
| ordinal | 3rd edition | 2nd edition | 1st edition |
| exhibitors | 67 | 77 | 57 |
| laureates | 10 | 10 | 10 |
| awards | 10 | 6 | 0 |
| jury | 4 | 4 | 4 |
| programme events | 21 | 18 | 14 |
| key figures | 6 | 5 | 5 |
| gallery images | 68 | 66 | 39 |
| guest of honour | Elmar Trenkwalder | Elizabeth Jaeger | Johan Creten |
| country focus | focus España | focus Norway | — |
| `intro` | empty | empty | empty |

Better than `CLAUDE.md` suggests — the import filled these. But three fields the
design leans on came through **empty for the past years**, checked the same day:

- **`intro` is empty on all three**, so every tab's lead is a gap (#32).
- **`inCountryFocus` is set on no 2025 exhibitor at all.** The eight that
  carry it are all 2026's España galleries, so 2026's focus tab has a real
  list and 2025's has none (#35).
- **`programmeEvent.section` is set only on 2026 and 2027 events**, and
  **`moderator` only on 2026**. The 2025 and 2024 events carry neither, so
  splitting a year's events into *focus talks* and *programme* needs the values
  backfilled, not just unhidden (#35, #37).
- **2024 has no awards**, so the art prize tab's awards column is empty that
  year and must collapse rather than draw a bare heading.

None of this blocks building the tabs — it decides what they show on day one.

---

## 4. Tab by tab

### 4.1 overview — `/previous-editions/2025`

*Frame: `… — 2025 — overview.png`*

Lead paragraph, two images side by side, then `key figures` and `highlights` in
two columns under ruled headings.

- **Lead** — `edition.intro`, empty. → **#32**
- **Two images** — the design draws two specific pictures, not a slideshow.
  `edition.cover` is one; `edition.images` is the 60-odd photo gallery. → **#33**
- **key figures** — `edition.keyFigures`, filled, but it does not line up with
  the frame and that is a **design question, not a data gap** (§9.6). 2025 holds
  *five* figures — `17,840 visitors`, `65 galleries`, `200+ artists`,
  `14 countries`, `13 talks`. The frame draws *three rows* —
  `13,000 visitors` / `65 exhibitors from 13 countries` / `200 artists` — with
  two figures combined on the middle row and different numbers. So the frame's
  numbers are illustrative, and the layout has to pair two figures on one line.
  `/editions` already does two-per-row (`.stats-table`); reuse that rule rather
  than asking for a second value field.
- **highlights** — four labelled internal links with `→`
  (`guest of honour: Elizabeth Jaeger (US)`, `10 art prize laureates`,
  `Focus on the Norwegian ceramic scene`, `Art installation by KRJST studio`).
  Editor-written, pointing at this section's own tabs. → **#33**

The `← back to 2027` comment (Screenshot_578) is anchored on this frame.

### 4.2 guest of honour

*Frame: `… — 2025 — guest of honour.png`*

Lead, then portrait + `biography` in two columns, then a second run: a titled
installation essay (`AT TWILIGHT, ceramic brussels 2025`) in one column with a
five-image slideshow beside it, signed `Jean-Marc Dimanche`.

- **Portrait, biography, nationality** — on `artist`, filled.
- **The installation essay** — has nowhere to live. It is *per edition*, not per
  artist: a guest of honour is invited for one year and `AT TWILIGHT` belongs to
  2025. `artist.intro` / `artist.interview` are the current guest's feature
  fields and must not be overloaded. → **#34**
- **Its slideshow** — `Slideshow.astro` as-is: the frame's `1/5` counter, dots
  on the image and right-aligned credit line are exactly what it draws.

Source text: `legacy-export/normalized/pastEditions.json` → `guest-of-honour-3`
(2025, blocks `title / text-2col / gallery ×4`), `guest-of-honour-31` (2026),
`guest-of-honour` (2024).

### 4.3 exhibitors

*Frame: `… — 2025 — exhibitors.png`*

A–Z row, `FILTERS:` row (search by country ↓, solo show, norway focus,
publishers, jury prize 2024, awards) and the three-column card grid with
`solo show` and `jury prize 2025` badges.

**This page already exists and already looks like this.**
`ExhibitorsListing.astro` on `/exhibitors/2025` draws the A–Z row, the same
filter set and the same grid. The work is:

1. the tab pill links to `/[lang]/exhibitors/<year>` (via `localePath`, not
   hand-written);
2. that page grows the year band and the edition pills above its own title band,
   so it reads as part of the section;
3. the filter order in the frame is *solo show, focus, publishers, jury prize,
   awards*; the code has *solo show, awards, focus, jury prize, publishers*.
   One line in `ExhibitorsListing.astro`.

Nothing else. No new route, no redirect, and `/exhibitors/2025/<slug>` keeps
serving the gallery pages that §5.3 depends on.

### 4.4 art prize

*Frame: `… — 2025 — art prize.png`*

Lead, then a slideshow + `laureates` in two columns, then `jury` + `awards` in
two columns.

- **laureates** — ten names with nationality and `↗`. Léonie (Screenshot_580):
  *"These link directly to the laureates' Instagrams"* — so `↗`, external, not a
  link to an artist page. `artist.instagram` exists and is filled for the
  laureates; a laureate without one renders as plain text.
- **jury** — name, nationality, role in caps, then `instagram ↗` / `website ↗`
  pills. All four fields are on `person`, filled, edition-scoped. `PersonCard`
  may already cover this — check before writing new markup.
- **awards** — heading + sentence per award. `award.name` + `award.description`;
  `getEditionArchive` already selects them. **Empty for 2024** — collapse the
  column.
- **slideshow** — `edition.images`, or a subset. Same component.

Lead → **#32**.

### 4.5 focus (`norway focus`)

*Frame: `… — 2025 — norway focus.png`*

Lead with an inline external link (`Norwegian Crafts`), slideshow + `galleries`
list in two columns, then `talks programme`: three talks in two columns, each
with a description, `SPEAKERS` and `MODERATOR`, and a second slideshow.

- **Lead and its link** — → **#35**. Inline links are ordinary `richText`, so
  once there is a field this is `PortableText.astro`.
- **galleries** — five names with `↗`. Léonie (Screenshot_581): *"these link to
  the individual gallery pages in exhibitors 2025"* — so **internal**, to
  `exhibitorPath()`, despite the `↗`. Worth confirming the arrow is intended
  (§8). It is derivable from `exhibitor.inCountryFocus` — but only for 2026:
  the eight documents carrying that flag are all 2026's España galleries and
  **no 2025 exhibitor has it**. The five Norwegian ones are still easy to
  find, because the import wrote the marker into their *names* —
  `Format (no) ___ focus Norway` and four like it — which is also why that
  suffix prints on `/en/exhibitors/2025` today. One patch fixes both. → **#35**
- **talks programme** — these are `programmeEvent`s: title, description,
  speakers, moderator, all on the schema. Two gaps, both worse than they look:
  **`moderator` is `hidden: true`** and only 2026's events have a value at all
  (**#37**); and nothing marks an event as a *focus* talk — `section` is unset
  on every 2025 and 2024 event (**#35**).

Source text: `legacy-export/normalized/pastEditions.json` → `norwegian-focus`
(blocks `text-2col / image / accordion ×2 / text-1col / gallery`); the accordions
are the talks.

### 4.6 programme

*Frame: `… — 2025 — programme.png`*

Lead, then one row per fair day (`Thursday 22 January 2025 ↓`), ruled, that
opens. Léonie (Screenshot_582): *"same layout than the 2027 talks programme, but
without the time, only the title"*.

- So: lift the day accordion from `src/components/hubs/Programme.astro` and drop
  the time column. Read it before writing anything.
- Days come from the events themselves (`getEditionArchive` already groups by
  `startsAt`), 18 events across three days for 2025.
- The lead in the frame is the *focus* lead, copy-pasted in the mock-up — do not
  read anything into it. This tab's own lead is **#32**.
- This is the one frame whose footer still shows `© ceramic brussels, 2026`
  rather than the back pill — an older frame, not a different rule (§8).

### 4.7 publication

*Frame: `… — 2025 — publication.png`*

Lead, then a full-width flipbook reader.

The reader in the frame is **FlipHTML5** — its toolbar (`+`, magnifier, grid,
play, mute, `1/84`, share, download, fullscreen) is unmistakable. Found the live
URLs on the old site:

- 2025 → `https://online.fliphtml5.com/qogyd/xffh/`
- 2024 → `https://online.fliphtml5.com/qogyd/ncuf/`
- 2026 → not on a past-edition page; ask Kamindu or the client

An `<iframe>`, so `Embed.astro` may already cover it. Needs a field for the URL
and the lead → **#36**.

---

## 5. The three comments that are not a tab

### 5.1 The footer button (Screenshots 578 + 579)

> *"the 'back to 2027' button in the footer takes us back to the homepage"*
> *"when back on the homepage, this button changes to 'previous editions →'"*

A pill at the **left** of the footer band, where the copyright line normally
sits, on six of the seven frames:

- on a previous-editions page: `← back to <current year>` → the homepage;
- on the homepage: `previous editions →` → the newest past year.

`<current year>` is `getCurrentEdition().year`, never a literal. Everywhere else
the footer is unchanged. Whether the copyright line moves or disappears is
open (§8).

### 5.2 Laureate names link to Instagram (Screenshot_580)

External, `artist.instagram`. §4.4.

### 5.3 Gallery names link into exhibitors (Screenshot_581)

Internal, `exhibitorPath()`. §4.5. This is why the exhibitors tab must not move
off `/exhibitors/<year>`.

---

## 6. What the backend has to add — requests #32–#39

Logged in full in `docs/backend-requests.md`:

| # | What | Blocks |
| :-- | :-- | :-- |
| #32 | a lead paragraph per tab on `edition` | all seven tabs |
| #33 | overview: highlights links, and the two lead images | overview |
| #34 | the guest of honour's installation at that edition | guest of honour |
| #35 | the focus tab: lead, galleries, its talks | focus |
| #36 | the publication: lead and reader URL | publication |
| #37 | `moderator` shown again on a programme event | focus, programme |
| #38 | the laureates' Instagram handles and nationalities | art prize |
| #39 | the past programme events have no dates | programme, focus |

**None of them needs text written from scratch.** Every one has its source in
`legacy-export/normalized/pastEditions.json`, captured from the old site and not
yet promoted to documents — `CLAUDE.md` lists the `page` documents as the part
of the import that has not run. Filling these six fields is the same pass.

---

## 7. Built on 2026-09-30

Everything in §8 below is still open; everything else here is on the branch.
800 pages build, 136 Sanity requests, 486 redirect rules.

| | Built | Note |
| :-- | :-- | :-- |
| routes, year band, title band | ✓ | `/[lang]/previous-editions/<year>/<tab>`, translated |
| overview | ✓ | key figures; the pair of images stands in from `cover` + gallery until #33 |
| guest of honour | ✓ | portrait, biography; the installation essay awaits #34 |
| exhibitors | ✓ | the pill leads to `/exhibitors/<year>`, which gained the section chrome |
| art prize | ✓ | slideshow, laureates, jury, awards; names link to Instagram once #38 lands |
| focus | ✓ | 2026 only — 2025 has no flagged galleries and no focus talks (#35) |
| programme | ✓ | day accordion; 16 of 18 events undated, listed below the days (#39) |
| publication | ✓ | built but no year has a reader URL yet (#36) |
| footer pill | ✓ | `← back to <year>` on the section, `previous editions →` on the homepage |
| `/editions` retired | ✓ | routes deleted, redirect map re-pointed |

Four things the build revealed that the frames could not:

1. **The tabs had to become conditional per year.** 2024 has no country focus
   and 2026's is the only one with content, so `tabsFor()` earns each pill
   from the data rather than drawing seven every time.
2. **`getEditionArchive` dropped every undated event** (`defined(startsAt)` in
   its filter), which hid 16 of 2025's 18. Fixed; the filter was written for
   the old archive page, where it did not show.
3. **The award's winner sentence is the last paragraph of its description**,
   not `outcome`, on five of 2025's six. The component reads `outcome` first
   and falls back, which gives the frame's one line for all six.
4. **The five Norwegian galleries carry `___ focus Norway` in their names**
   and print it on `/exhibitors/2025` today (#35).

## 8. Order of work (as planned)

Nothing below is blocked on the backend: every tab can be built against the data
that exists and gets its lead when #32 lands.

1. **Scaffolding.** `previousEditions.ts`, the route, `YearBand.astro`,
   `HubNav` wired with `title`/`items`, and the seven tabs stubbed. Redirect
   changes in `legacy-redirects.mjs` in the same commit — the build fails on a
   target that was not built, so they cannot drift.
2. **The tabs that are already fed:** art prize (§4.4), programme (§4.6),
   exhibitors (§4.3 — three small changes to a page that exists).
3. **The footer button** (§5.1) — self-contained, and the client will look for it.
4. **Overview** (§4.1) — key figures now, highlights and images when #33 lands.
5. **Guest of honour, focus, publication** — the frames are complete, so build
   them against the fields as requested in #34/#35/#36 and they light up when
   the content is imported.
6. **`/editions` retired** (§2) once §8 is answered.
7. **Three years, three languages.** The frames are 2025 only. 2024 has no focus
   tab and no awards; 2026's publication URL is unknown. Check all three years in
   all three languages before the PR — that is 63 pages, and the empty-state
   behaviour is the point of checking.

`npm run boundary` before the PR: everything above is in the frontend half
except the redirect map, which is shared and should be called out.

---

## 9. Open questions for Léonie

1. **The copyright line.** Six frames put `← back to 2027` where
   `© ceramic brussels, 2026` normally sits; the programme frame still shows the
   copyright. Does the pill replace the credit on these pages, or sit beside it?
2. **`/previous-editions` with no year.** There is no frame for an index. Should
   it redirect to the newest past edition, or does the section need a landing
   page the year band cannot replace?
3. **The galleries list's arrow.** The five Norwegian galleries carry `↗`, the
   site's mark for *external*, but the comment says they lead to the exhibitor
   pages. Internal `→`, or keep `↗` as drawn?
4. **2026's publication.** The 2024 and 2025 readers are on the old site; the
   2026 one is not. Is there one?
5. **2024 has no awards.** The art prize tab's right column is empty that year.
   Collapse it, or is the content coming?
6. **The key figures on overview.** The frame shows three rows —
   `13,000 visitors`, `65 exhibitors from 13 countries`, `200 artists` — but
   2025 actually holds five figures, with different numbers (`17,840 visitors`,
   `65 galleries`, `200+ artists`, `14 countries`, `13 talks`). Are the frame's
   numbers illustrative and all five should show, two to a row? Or does the
   overview show a chosen three?
