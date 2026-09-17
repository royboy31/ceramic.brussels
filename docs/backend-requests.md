# Backend requests

The hand-off log from the frontend to the backend. When a Figma frame needs
something the content model or the queries do not provide, the frontend
**does not add it**; it is logged here and Kamindu changes the schema, the
migration and the projection together. See `docs/frontend-handbook.md`,
section "When the design needs something the data does not have".

One entry per request, newest at the bottom, numbered in order. Put
`{/* BACKEND-REQUEST #n: ... */}` at the spot in the code, and quote the
numbers in the PR. Kamindu fills in **Done** and flips the status; the
frontend then wires the field in and the entry stays as the record.

Status: `open` → `done` | `declined` (with a reason).

---

## #0 · done · 2026-09-08 · example entry

**Page / component:** `src/pages/[lang]/art-prize/[...tab].astro`, laureates tab
**Figma frame:** `119:65`
**The design shows:** a one-line subtitle under each laureate's name ("Winner of the Jury Prize 2026").
**The query returns today:** `getLaureates` → `artist.name`, `edition.year`, `statement`, `slideshow`; no subtitle.
**Rendered meanwhile:** name and year only.
**Done (Kamindu):** not a new field: it is `award.outcome` on the award that lists this laureate, now selected as `awards[]{title, outcome}` on each laureate in `getLaureates`. Render `awards[0].outcome`.

---

## #1 · done · 2026-09-15 · solo show on the artists list

**Done (Kamindu, 2026-09-15):** `getArtists` now selects `exhibitors[]{ name, slug, booth, soloShow, year, current }`. Pick the entry with `current == true` for the booth and the badge.

**Page / component:** `src/pages/[lang]/artists/index.astro`, the letter lists
**Figma frame:** client mock-up `screenshot/Screenshot_561.jpg` (exhibitors → artists, two columns)
**The design shows:** each artist row as name, country code raised, the round black "solo show" badge when the artist's exhibitor has a solo show, and the booth ("B9 ●") at the right.
**The query returns today:** `getArtists` → `ARTIST_CARD` (incl. `countryCode`) and `exhibitors[]{ name, slug, booth }` for every exhibitor referencing the artist, any year; no `soloShow`, no edition year or current flag.
**Rendered meanwhile:** name, country code and booth; no badge. The booth is the first referencing exhibitor's with one set - today no artist has a booth from a past edition, but once past years are linked the list could show an old booth.
**Asked for:** `soloShow` and `"current": edition->isCurrent == true` (as `ARTIST_FULL` already selects) on `exhibitors[]` in `getArtists`, so the list can take the current edition's booth and badge.

---

## #2 · done · 2026-09-15 · FAQ categories

**Done (Kamindu, 2026-09-16):** `faqItem.category`, one of `FAQ_CATEGORIES` in `src/lib/options.ts` (tickets, visiting, food-drinks, media, advisory-board, other), selected in `getSettings` → `faq[]` and in the `faqSection` block's items. Labels are `faq.category.<value>` in STRINGS; the Visit hub's FAQ tab groups the questions under those headings with a FILTERS row of pills. Editors pick the category on each question in Site settings → FAQ; a question without one sits under "other".

**Page / component:** `src/components/hubs/Visit.astro`, FAQ tab (`/en/visit/faq`)
**Figma frame:** client mock-up `screenshot/Screenshot_565.jpg` (visitors info → FAQ, two columns)
**The design shows:** the questions grouped under bold category headings over a rule - tickets, coming to the fair, food & drinks, media, advisory board - the groups flowing in two columns, and a "FILTERS:" row of pills, one per category, above them.
**The query returns today:** `getSettings` → `faq[]{ _key, question, answer }` from Site settings; no category on a question.
**Rendered meanwhile:** every question in one list over two columns, all closed, each on its own rule; no headings, no filter row.
**Asked for:** a category per question (e.g. `faq[].category`, a short list of options, localised label), selected in the `faq[]` projection - or `faq` as groups `{ title, items[] }` if editors should name and order the categories themselves.

---

## #3 · done · 2026-09-16 · the programme's award ceremony as a real tab

**Done (Kamindu, 2026-09-17):** the `hubs.ts` line as asked, merged with the
VIP hub of the same day (VIP left the programme hub; the awards tab stays
third). The two calls: (1) translated segments, `/fr/programme/remise-des-prix`
and `/nl/programma/prijsuitreiking` - the old site never had the page, so
nothing to preserve and the hub convention wins; (2) no second pill for the
art prize awards - the page's "see all art prize awards →" button carries
the link, and two pills reading "awards" in one hub would mislead. Also:
`location` on a programme event is visible again for awards events (the
"HALL C" chip; editors type the hall), an "Award ceremony" list in the
Studio's Programme folder, the "Not on the site" list no longer swallows
awards events, `getProgramme`'s edition fallback counts them, and "Open
preview" on an awards event lands on the tab. The tab's `page` document
(lead paragraph and slideshow pictures) is still content for an editor:
Programme → Tab intros offers an "Award ceremony tab" starting point.

**Page / component:** `src/components/hubs/Programme.astro`, award ceremony tab (`/en/programme/awards`)
**Figma frame:** client mock-up `screenshot/ceramic brussels — programme — award ceremony.png`
**The design shows:** a fourth programme pill reading **"award ceremony"**, active
(yellow), with a page of its own: the tab's lead paragraph, then two columns -
a slideshow at the left, and at the right the ceremony's day heading
("Thursday 21 January 2026"), each event as "{ award ceremony }" + a boxed
hall chip + the time over a rule, its title, its description, the
"EN / with …" line, and two pills, "see all exhibitors awards →" and
"see all art prize awards →".

**The code says today:** `src/lib/hubs.ts` makes this tab a *link* tab —
`{ slug: 'awards', label: 'tabs.awards', link: { route: 'art-prize', tab: 'awards' } }`
— so `hubRouteParams` skips it (`.filter((tab) => !tab.link)`), no route is
built, and `HubNav` can never mark it active, which is why the pill never goes
yellow. `programmeEvent.section` already offers `awards`, and
`src/sanity/schemaTypes/documents/programmeEvent.ts` says so explicitly:
*"Awards events are not shown anywhere: that pill leads to the art prize
awards."* Three published events carry `section == "awards"`
(`event-2027-best-gallery-booth-2026-4`, `-best-solo-show-2026-5`,
`-ceramic-brussels-art-prize-6`), all `kind: "ceremony"`, all on 2026-01-22,
with descriptions — they render nowhere today.

**Rendered meanwhile:** nothing — without the route the tab cannot be reached.
The layout, its CSS and its strings are built and working; they are dead code
until the line below changes.

**Asked for:** in `src/lib/hubs.ts`, the programme hub's `awards` tab, one line:

```ts
// from
{ slug: 'awards', label: 'tabs.awards', link: { route: 'art-prize', tab: 'awards' } },
// to
{ slug: 'awards', label: 'tabs.awardCeremony' },
```

`tabs.awardCeremony` is already in STRINGS in all three locales ("award
ceremony" / "cérémonie de remise des prix" / "prijsuitreiking"). It is a new
key on purpose: `tabs.awards` is shared with the art prize's own awards tab,
which keeps reading "awards" / "prix" / "prijzen".

Two decisions that are yours, both in that file:

1. **A translated `segment`?** Left off, so the URLs are `/fr/programme/awards`
   and `/nl/programma/awards`. The old site has no award ceremony page to
   preserve, so nothing is lost either way, but `ceremonie-de-remise-des-prix`
   / `prijsuitreiking` would match how the other tabs read.
2. **Does the art prize's awards tab still want a pill here?** The design
   replaces the link pill with this tab, and the "see all art prize awards →"
   pill inside the page now carries that link instead.

**Also needed, but content not code:** a `page` document with `section:
"programme"` and `slug.en: "awards"` for the tab's lead paragraph and the
slideshow's pictures (`images`). Only `la-cambre`, `talks` and `vip` exist, so
the lead is absent and the slideshow falls back to the `fair` placeholder pool.
No awards event carries a `location`, so the design's "HALL C" chip is hidden
(marked in the markup at the chip — content, not schema: `location`
is already selected by `getProgramme`).

---
