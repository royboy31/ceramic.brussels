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

## #2 · open · 2026-09-15 · FAQ categories

**Page / component:** `src/components/hubs/Visit.astro`, FAQ tab (`/en/visit/faq`)
**Figma frame:** client mock-up `screenshot/Screenshot_565.jpg` (visitors info → FAQ, two columns)
**The design shows:** the questions grouped under bold category headings over a rule - tickets, coming to the fair, food & drinks, media, advisory board - the groups flowing in two columns, and a "FILTERS:" row of pills, one per category, above them.
**The query returns today:** `getSettings` → `faq[]{ _key, question, answer }` from Site settings; no category on a question.
**Rendered meanwhile:** every question in one list over two columns, all closed, each on its own rule; no headings, no filter row.
**Asked for:** a category per question (e.g. `faq[].category`, a short list of options, localised label), selected in the `faq[]` projection - or `faq` as groups `{ title, items[] }` if editors should name and order the categories themselves.

---
