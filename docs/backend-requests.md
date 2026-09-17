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

## #4 · done · 2026-09-17 · filters on the artists list

**Done (Kamindu, 2026-09-17):** `getArtists` → `exhibitors[]` now carries `_id`, `kind` and `inCountryFocus` next to the fields of #1.

**Page / component:** `src/pages/[lang]/artists/index.astro`, above the letter lists
**Figma frame:** `ceramics-layouts/ceramic brussels — exhibitors — artists.png`
**The design shows:** the same "FILTERS:" row as the galleries list - solo show, focus España, publishers, jury prize 2026, awards - narrowing the artists to those whose current exhibitor matches.
**The query returns today:** `getArtists` → `exhibitors[]{ name, slug, booth, soloShow, year, current }`; no exhibitor `_id`, `kind` or `inCountryFocus`, which is what the galleries list filters on (and `_id` is how an award's `winnerExhibitor` is matched).
**Rendered meanwhile:** the filters the returned fields can drive; the others are left out, marked in the markup.
**Asked for:** `_id`, `kind` and `inCountryFocus` on `exhibitors[]` in `getArtists`.

---

## #5 · done · 2026-09-17 · several pictures per award

**Done (Kamindu, 2026-09-17):** `award.images[]` (figures, "Slideshow" in the Studio), selected as `images` in `getAwards` beside the unchanged `image`. No migration: `image` keeps working, and a page can read `images` when it has any, else `[image]`.

**Page / component:** `src/pages/[lang]/exhibitors/awards.astro` (and the art prize awards tab, which reads the same `award`)
**Figma frame:** `ceramics-layouts/ceramic brussels — exhibitors — awards.png`
**The design shows:** each award beside a slideshow of three fair photos with the "1/3" counter and a caption per photo.
**The query returns today:** `award.image`, one `figure`; without it the page falls back to the winning gallery's artwork.
**Rendered meanwhile:** the one image, as a single-slide slideshow.
**Asked for:** an `images[]` array of `figure` on `award` (keeping `image` readable, or migrating it into `images[0]`), selected in the awards projections.

---

## #6 · done · 2026-09-17 · tab labels in French and Dutch

**Done (Kamindu, 2026-09-17):** `PAGE` → `"tabLabel": tabLabel[$lang]` - an editor's own label in the page's language, or nothing; no title fallback, no English fallback. The pill reads `t(hubTab.label)` when it is absent, so HubNav's "equal to the title" guess can go.

**Page / component:** `src/components/HubNav.astro`, every hub's pills
**Figma frame:** all hub frames; seen on `/fr/programme` where the talks pill reads "talks" instead of "conférences"
**The design shows:** each pill in the page's language.
**The query returns today:** `PAGE` in `queries.ts` → `"tabLabel": coalesce(localised('tabLabel'), localised('title'))`. Localised fields fall back to English, so a page with only an English title overrides the translated `tabs.*` label in STRINGS on the French and Dutch pages.
**Rendered meanwhile:** since 2026-09-17 `HubNav` treats a `tabLabel` equal to the page title as no override and uses the translated label, so the pills are right already; a proper `tabLabel` without the fallback would remove that guess.
**Asked for:** return `tabLabel` only when an editor set one (no `title` fallback, or no English fallback for it), so the frontend falls back to `t(hubTab.label)`. Or say which of the two should win and the frontend follows.

---

## #7 · done · 2026-09-17 · the about hub's three tabs

**Done (Kamindu, 2026-09-17):** confirmed as changed on `lilanga`. The decisions: the team tab keeps its `team` address (the page document, `previewPaths.ts` and the `founders`/`team` redirects use it, and `/[lang]/contact` is a separate page); press and images stay built without a pill, so their redirects keep a target and the content stays reachable by address; the published menu lists no press or images link under about, so nothing to re-point. `nav.sub.about` and the Studio's "Tab intros" entry now read the three tabs.

**Page / component:** `src/lib/hubs.ts`, `HUBS.about` (changed on `lilanga` at Lilanga's request - please confirm or redo)
**Figma frame:** `ceramics-layouts/ceramic brussels —about — ceramic brussels.png`, `-1.png`, `-2.png`
**The design shows:** three pills - ceramic brussels / advisory board / contact - where "contact" is the directors and the team.
**The code said:** six tabs - ceramic brussels, advisory board, team, partners (a link to the partners hub), press, images.
**Changed:** the `team` tab is labelled `tabs.contact` ("contact" in all three languages) and keeps its slug and address (`/en/about/team`, `/fr/a-propos/equipe`), which the page document, `previewPaths.ts` and the legacy redirects (`founders`, `team`) use. The partners link tab is removed. Press and images get a new `hidden: true` on `HubTab`: still built, no pill, so the redirects onto `about/press` and `about/images` keep a target.
**Your decisions:** whether the team tab's address should become `contact` (it needs the redirect map and `previewPaths.ts` changed with it, and sits next to the existing `/[lang]/contact` page); whether press and images stay reachable or go, with their redirects re-pointed; and the menu's about links in the navigation document, which may still list press and images.

---

## #8 · open · 2026-09-17 · the programme tabs in the designer's order

**Page / component:** `src/lib/hubs.ts`, `HUBS.programme.tabs` (Kamindu's file - not changed here)
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:05 (Léonie)
**The design shows:** the programme submenu in this order - **talks, award ceremony, ceramic brussels x La Cambre, exhibition pass (coming up)**.
**The code says today:** the tab list and its order live in `HUBS.programme.tabs`; the first tab is the hub root, so reordering also moves `/[lang]/programme` onto a different tab and the redirects and `previewPaths.ts` follow it.
**Rendered meanwhile:** the order as `hubs.ts` has it; nothing changed on the frontend.
**Asked for:** reorder `HUBS.programme.tabs` to talks / awards / la-cambre, and say whether "exhibition pass (coming up)" should be a fourth tab now (a `page` document plus a slug, or a `hidden` placeholder) or wait until there is content. Talks becoming the first tab makes `/[lang]/programme` the talks page - please confirm that is wanted and re-point the legacy redirects with it.

---

## #9 · open · 2026-09-17 · several pictures per programme event

**Page / component:** `src/components/hubs/Programme.astro`, the talks accordion rows
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:05 (Léonie): "Could you make all photos inside the accordion elements a slideshow?"
**The design shows:** each event in the accordion beside a slideshow of its own photos, with the counter and caption the other slideshows have.
**The query returns today:** `getProgramme` → `image ${IMAGE}`, one `figure` per `programmeEvent`.
**Rendered meanwhile:** the one image, drawn through the shared `Slideshow` component as a single slide (its counter and caption line are hidden while there is only one), so the markup is ready for an array; a placeholder from the fair pool while an event has no picture.
**Asked for:** an `images[]` array of `figure` on `programmeEvent` (keeping `image` readable, or migrating it into `images[0]`), selected in the `getProgramme` projection. Same shape as request #5 for `award`.

---

## #10 · open · 2026-09-17 · remove the media tab from the partners hub

**Page / component:** `src/lib/hubs.ts`, `HUBS.partners.tabs` (Kamindu's file - not changed here)
**Figma frame:** client feedback of 2026-09-17, annotated frame `screenshot/WhatsApp Image 2026-09-17 at 8.37.02 PM-2.jpeg` (the "media" pill is crossed out)
**The design shows:** four pills on the partners hub - main partner, institutions, hotel, event partners. The designer: *"Remove the « media » submenu (it will appear in the press & media tab)."*
**The code says today:** a fifth tab `{ slug: 'media', segment: { fr: 'medias' }, label: 'tabs.media' }`, which `PARTNER_TABS.media` maps to the `media` tier.
**Rendered meanwhile:** nothing changed - the pill is still there, the tab still builds, the frontend does not edit `hubs.ts`.
**Asked for:** drop the media tab from `HUBS.partners.tabs`, or mark it `hidden: true` if `/en/partners/media` must keep answering for the legacy redirects (`hidden` already exists on `HubTab`, used by about → press / images). **The `media` partner tier itself stays**: media partners are still partner documents with `tier: "media"`, they just move to the press & media tab of the about hub, so nothing in the schema or in `PARTNER_TABS`' other rows should change. Please say which tab is to list them so the frontend can render them there.

---

## #11 · open · 2026-09-17 · a size control for partner logos

**Page / component:** `src/components/hubs/Partners.astro`, the logo under each partner (institutions, main, event, media tabs)
**Figma frame:** client feedback of 2026-09-17, same annotated frame
**The design shows:** the logos in a row of cards reading as one family. The designer: *"I was wondering if there's any way to adjust the size of the logos for every partner? I see sometimes the logos are very small, sometimes big, is there a way to keep control of that?"* - she wants the size to be an editor's decision, per partner.
**The query returns today:** `PARTNER` in `queries.ts` → `_id, name, tier, url, instagram, order, subtitle, description, currentExhibition, editions, logo, images`. The logo is a plain image; there is no scale, size or display-width field anywhere on `partner`.
**Rendered meanwhile:** the frontend normalises optically instead of asking the editor: the logo slot is still 250px wide, but its height is now derived from the file's own aspect ratio (`asset->metadata.dimensions`, which `IMAGE` already returns) - the wider the file, the shorter the slot - so a near-square mark and a 4:1 wordmark cover comparable area. `logoHeight()` in `src/components/hubs/Partners.astro`, marked `BACKEND-REQUEST #11`. It evens out the worst of it but it cannot know that a file has whitespace baked into it, which is the other half of the problem.
**Asked for:** a `logoScale` on `partner` - a number the editor sets, e.g. a percentage 50-150 defaulting to 100, or a three-value list (small / medium / large) if a free number is too loose - selected in `PARTNER` so it reaches every tab and the `partnersSection` block. The frontend multiplies the computed slot height by it. A fixed list of values would need adding to `stegaFilter`'s `PLAIN_KEYS`.

---

## #12 · open · 2026-09-17 · a three-image hero on about → ceramic brussels

**Page / component:** `src/components/hubs/About.astro`, the `the-fair` tab's hero
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:08 (Léonie): "Make the big image at the top of the page a 3-image slideshow"
**The design shows:** the large picture beside "the fair" as a slideshow of three pictures, with the white dots on the image the other slideshows have.
**The query returns today:** `PAGE` in `queries.ts` → `cover ${IMAGE}`, one `figure` per page. `images[]` is already spoken for: it is the closing strip of photos at the foot of the page.
**Rendered meanwhile:** the hero is drawn through the shared `Slideshow` component with the one `cover` as its only slide (its dots and counter stay hidden while there is one), so an array needs no further work here.
**Asked for:** a `heroImages[]` array of `figure` on `page` - or `cover` widened into an array - selected in `PAGE`. Same shape as requests #5 and #9.

---

## #13 · open · 2026-09-17 · the contact block on about → contact

**Page / component:** `src/components/hubs/About.astro`, the `team` tab (the design's "contact" page)
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:09 (Léonie), wireframe image 6
**The design shows:** under the team grid, a "contact" heading over a rule, then three things: the line "ceramic brussels is initiated and organized jointly by studio emosi and ceramic brussels ASBL.", a "discover studio emosi's projects ↗" pill, and the organisation's postal address ("Rue Franz Merjay 148C…").
**The query returns today:** `getSettings` → `contactEmail`, the social URLs, `practicalInfo.address`. That address is the **fair's venue** (Brussels Expo), which the visit hub prints, not the ASBL's office; there is no organiser line and no studio emosi link anywhere in the projection.
**Rendered meanwhile:** nothing is invented. The tab still renders the team page's own section stack under the grid, so an editor can build the block out of a section title + text + buttons meanwhile.
**Asked for:** an Organisation group on Site settings - `organiserText` (localeText), `organiserLink` (a `link`, so the pill's label is editable) and `postalAddress` (text) - returned by `getSettings`. If any of the three is meant to live on the about/contact `page` instead, say which and the frontend reads it there.

---
