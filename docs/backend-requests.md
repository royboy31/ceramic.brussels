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

## #8 · done · 2026-09-17 · the programme tabs in the designer's order

**Done (Kamindu, 2026-09-19):** `HUBS.programme.tabs` is now **talks / awards / la-cambre**, so `/[lang]/programme` is the talks page and La Cambre moved to `/[lang]/programme/la-cambre`. Confirmed with Kamindu: the old site's `/programme` was an alias of food & drinks and already redirects onto the hub root, so the move costs no URL. `programme-69` (the 2026 talks page) now redirects to `programme` rather than `programme/talks`, which is no longer built; `src/sanity/previewPaths.ts` moves `talks` onto `/programme` and `project` onto `/programme/la-cambre`; the Studio's Programme folder is relabelled and its main page is the talks document; `scripts/apply-design-content.mjs` lists the three tabs in this order, award ceremony included. `node scripts/legacy-redirects.mjs --doc` is clean: 254 inventory URLs, 474 rules, none orphaned.

**Not done, deliberately:** the fourth pill, "exhibition pass (coming up)". A tab is a pill onto a page, and there is no content for it - say the word and it is three lines in `hubs.ts` plus a `page` document.

**Page / component:** `src/lib/hubs.ts`, `HUBS.programme.tabs` (Kamindu's file - not changed here)
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:05 (Léonie)
**The design shows:** the programme submenu in this order - **talks, award ceremony, ceramic brussels x La Cambre, exhibition pass (coming up)**.
**The code says today:** the tab list and its order live in `HUBS.programme.tabs`; the first tab is the hub root, so reordering also moves `/[lang]/programme` onto a different tab and the redirects and `previewPaths.ts` follow it.
**Rendered meanwhile:** the order as `hubs.ts` has it; nothing changed on the frontend.
**Asked for:** reorder `HUBS.programme.tabs` to talks / awards / la-cambre, and say whether "exhibition pass (coming up)" should be a fourth tab now (a `page` document plus a slug, or a `hidden` placeholder) or wait until there is content. Talks becoming the first tab makes `/[lang]/programme` the talks page - please confirm that is wanted and re-point the legacy redirects with it.

---

## #9 · done · 2026-09-17 · several pictures per programme event

**Done (Kamindu, 2026-09-19):** `programmeEvent.images[]` (figures, "Slideshow" in the Studio), selected as `images` in `getProgramme` beside the unchanged `image`. The same shape as `award.images` (#5), so read `images` when it has any and fall back to `[image]`. No migration: every existing event keeps its single picture.

**Page / component:** `src/components/hubs/Programme.astro`, the talks accordion rows
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:05 (Léonie): "Could you make all photos inside the accordion elements a slideshow?"
**The design shows:** each event in the accordion beside a slideshow of its own photos, with the counter and caption the other slideshows have.
**The query returns today:** `getProgramme` → `image ${IMAGE}`, one `figure` per `programmeEvent`.
**Rendered meanwhile:** the one image, drawn through the shared `Slideshow` component as a single slide (its counter and caption line are hidden while there is only one), so the markup is ready for an array; a placeholder from the fair pool while an event has no picture.
**Asked for:** an `images[]` array of `figure` on `programmeEvent` (keeping `image` readable, or migrating it into `images[0]`), selected in the `getProgramme` projection. Same shape as request #5 for `award`.

---

## #10 · done · 2026-09-17 · remove the media tab from the partners hub

**Done (Kamindu, 2026-09-19):** The partners hub's `media` tab is `hidden: true` - no pill, still built, so `/en/partners/media` and its translations keep answering the legacy redirects. The `media` tier and `PARTNER_TABS` are untouched.

**Where they go:** the about hub's `press` tab, which is a visible pill again and is relabelled **press & media** (`tabs.pressMedia`, added to all three locales in `i18n.ts` - the one frontend file this round touches). Its address stays `/[lang]/about/press` and its translations, which the page document and the old site's redirects use. **Over to you:** `About.astro`'s press tab renders the press contacts, kit and clips; it does not list partners yet. `getPartners` already returns the `media` tier, so it is a filter and a card grid.

**Page / component:** `src/lib/hubs.ts`, `HUBS.partners.tabs` (Kamindu's file - not changed here)
**Figma frame:** client feedback of 2026-09-17, annotated frame `screenshot/WhatsApp Image 2026-09-17 at 8.37.02 PM-2.jpeg` (the "media" pill is crossed out)
**The design shows:** four pills on the partners hub - main partner, institutions, hotel, event partners. The designer: *"Remove the « media » submenu (it will appear in the press & media tab)."*
**The code says today:** a fifth tab `{ slug: 'media', segment: { fr: 'medias' }, label: 'tabs.media' }`, which `PARTNER_TABS.media` maps to the `media` tier.
**Rendered meanwhile:** nothing changed - the pill is still there, the tab still builds, the frontend does not edit `hubs.ts`.
**Asked for:** drop the media tab from `HUBS.partners.tabs`, or mark it `hidden: true` if `/en/partners/media` must keep answering for the legacy redirects (`hidden` already exists on `HubTab`, used by about → press / images). **The `media` partner tier itself stays**: media partners are still partner documents with `tier: "media"`, they just move to the press & media tab of the about hub, so nothing in the schema or in `PARTNER_TABS`' other rows should change. Please say which tab is to list them so the frontend can render them there.

---

## #11 · done · 2026-09-17 · a size control for partner logos

**Done (Kamindu, 2026-09-19):** `partner.logoScale`, a number between 50 and 150 with `initialValue: 100`, selected in `PARTNER` so it reaches every tab and the `partnersSection` block. Multiply the slot height your `logoHeight()` works out by `logoScale / 100`, treating a missing value as 100. A number rather than a small / medium / large list, on purpose: the corrections are particular, and a number needs no entry in `stegaFilter`'s `PLAIN_KEYS` (a fixed-list string would).

**Page / component:** `src/components/hubs/Partners.astro`, the logo under each partner (institutions, main, event, media tabs)
**Figma frame:** client feedback of 2026-09-17, same annotated frame
**The design shows:** the logos in a row of cards reading as one family. The designer: *"I was wondering if there's any way to adjust the size of the logos for every partner? I see sometimes the logos are very small, sometimes big, is there a way to keep control of that?"* - she wants the size to be an editor's decision, per partner.
**The query returns today:** `PARTNER` in `queries.ts` → `_id, name, tier, url, instagram, order, subtitle, description, currentExhibition, editions, logo, images`. The logo is a plain image; there is no scale, size or display-width field anywhere on `partner`.
**Rendered meanwhile:** the frontend normalises optically instead of asking the editor: the logo slot is still 250px wide, but its height is now derived from the file's own aspect ratio (`asset->metadata.dimensions`, which `IMAGE` already returns) - the wider the file, the shorter the slot - so a near-square mark and a 4:1 wordmark cover comparable area. `logoHeight()` in `src/components/hubs/Partners.astro`, marked `BACKEND-REQUEST #11`. It evens out the worst of it but it cannot know that a file has whitespace baked into it, which is the other half of the problem.
**Asked for:** a `logoScale` on `partner` - a number the editor sets, e.g. a percentage 50-150 defaulting to 100, or a three-value list (small / medium / large) if a free number is too loose - selected in `PARTNER` so it reaches every tab and the `partnersSection` block. The frontend multiplies the computed slot height by it. A fixed list of values would need adding to `stegaFilter`'s `PLAIN_KEYS`.

---

## #12 · done · 2026-09-17 · a three-image hero on about → ceramic brussels

**Done (Kamindu, 2026-09-19):** `page.heroImages[]` (figures, "Cover slideshow" in the Studio), selected as `heroImages` in `PAGE`. `cover` is untouched and still the field for a page with one picture, so nothing migrates; read `heroImages` when it has any, else `[cover]` - which is what `About.astro` already builds. `heroImages` is in `pageKinds.ts` wherever `cover` is (`FULL` and `STANDALONE`), so the field shows on exactly the pages that draw a cover.

**Page / component:** `src/components/hubs/About.astro`, the `the-fair` tab's hero
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:08 (Léonie): "Make the big image at the top of the page a 3-image slideshow"
**The design shows:** the large picture beside "the fair" as a slideshow of three pictures, with the white dots on the image the other slideshows have.
**The query returns today:** `PAGE` in `queries.ts` → `cover ${IMAGE}`, one `figure` per page. `images[]` is already spoken for: it is the closing strip of photos at the foot of the page.
**Rendered meanwhile:** the hero is drawn through the shared `Slideshow` component with the one `cover` as its only slide (its dots and counter stay hidden while there is one), so an array needs no further work here.
**Asked for:** a `heroImages[]` array of `figure` on `page` - or `cover` widened into an array - selected in `PAGE`. Same shape as requests #5 and #9.

---

## #13 · done · 2026-09-17 · the contact block on about → contact

**Done (Kamindu, 2026-09-19):** Three fields on Site settings → Contact, returned by `getSettings`: `organiserText` (localeText, the "initiated and organized jointly by…" line), `organiserLink` (a `link`, so the pill's label and target are the editor's and `resolveLink` gives it the right arrow) and `postalAddress` (text). They are fields of their own rather than a second reading of `practicalInfo.address`, which is the fair's **venue** and belongs to the visit hub.

**Page / component:** `src/components/hubs/About.astro`, the `team` tab (the design's "contact" page)
**Figma frame:** client feedback, WhatsApp "Ceramic Website", 2026-09-17 15:09 (Léonie), wireframe image 6
**The design shows:** under the team grid, a "contact" heading over a rule, then three things: the line "ceramic brussels is initiated and organized jointly by studio emosi and ceramic brussels ASBL.", a "discover studio emosi's projects ↗" pill, and the organisation's postal address ("Rue Franz Merjay 148C…").
**The query returns today:** `getSettings` → `contactEmail`, the social URLs, `practicalInfo.address`. That address is the **fair's venue** (Brussels Expo), which the visit hub prints, not the ASBL's office; there is no organiser line and no studio emosi link anywhere in the projection.
**Rendered meanwhile:** nothing is invented. The tab still renders the team page's own section stack under the grid, so an editor can build the block out of a section title + text + buttons meanwhile.
**Asked for:** an Organisation group on Site settings - `organiserText` (localeText), `organiserLink` (a `link`, so the pill's label is editable) and `postalAddress` (text) - returned by `getSettings`. If any of the three is meant to live on the about/contact `page` instead, say which and the frontend reads it there.

---
## #14 · done · 2026-09-18 · a booking link on a VIP programme event

**Done (Kamindu, 2026-09-19):** `programmeEvent.link`, the shared `link` object, selected as `link` in the `getProgramme` projection. Label, target and internal/external are all the editor's, so "book your visit ↗", "book the party ↗" and "discover Puilaetco →" are one field. `resolveLink` renders it as everywhere else, and `kind`, `route`, `anchor` and `path` are already in `stegaFilter`'s `PLAIN_KEYS`, so it survives a preview render. An event with no link gets no pill - drop the mailto fallback when you wire it.

**Page / component:** `src/components/hubs/Vip.astro`, the VIP programme tab
**Figma frame:** `output.pdf` page 3 (VIP frames, 2026-09-18)
**The design shows:** every off-site entry ends in a pill - "book your visit ↗"
on KANAL, Charles Kaisin, Galila's P.O.C, Hôtel Solvay, Charles Riva and
Vanhaerents, "book the party ↗" on the MAD Brussels afterparty - and the
on-site entry ends in "discover Puilaetco →". Both the label and the target
change per event, so neither can be a fixed string in the code.
**The query returns today:** `getProgramme` → `_id, startsAt, endsAt, kind,
section, venue, languages, moderator, invitationOnly, slug, title, location,
description, speakersText, speakers[], image`. There is no link anywhere on
`programmeEvent`.
**Rendered meanwhile:** the pill is drawn, with the frame's own label, and
points at the VIP team's address - the one the contact block gives for "any
queries regarding your visit or reservation". No venue URL is guessed. A
`programmeEvent` that carries its own link gets no pill at all today, so
wiring this field also removes that gap.
**Asked for:** a `link` (the shared `link` object, so the label is the
editor's and internal/external gives the right arrow) on `programmeEvent`,
selected in the `getProgramme` projection. The `link` object is already used
by `page`, `partner` and the page-builder blocks, so `resolveLink` renders it
with no further work here.

---

## #15 · done · 2026-09-18 · a VIP event that repeats every day

**Done (Kamindu, 2026-09-19):** `programmeEvent.whenText` (localeString, "When (free text)" in the Studio), selected as `whenText` in `getProgramme`. Print it in place of the formatted time when it is set. The recurrence model is deliberately not built: two blocks in the whole design need it.

**Still content, not schema:** the current edition has two VIP events (Preview, Vernissage), both off-site, against the frame's eight. That is part of #17.

**Page / component:** `src/components/hubs/Vip.astro`, the VIP programme tab,
on-site section
**Figma frame:** `output.pdf` page 3, "discovery tours by Puilaetco"
**The design shows:** the on-site entry is dated **"everyday — 11:00 /
16:00"**: it runs on all five days, at two times, and the frame prints that
instead of a date. The VIP lounge frame does the same ("VIP aperitivos,
everyday — 17:30 → 19:00").
**The query returns today:** `startsAt` is one required datetime and `endsAt`
is hidden, so an event that repeats is either one document on an arbitrary day
(and the page prints that day, which is wrong) or five documents (and the
design's single block becomes five).
**Rendered meanwhile:** the tab shows the frames' own entries
(`src/components/vipContent.ts`), where "everyday — 11:00 / 16:00" is a
string, so the design is on screen. Once the tab has a `page` document the
component switches to Sanity and the on-site row prints
`formatTime(startsAt)` alone - no day, which reads correctly for a one-off
and understates a repeat. The off-site section is genuinely per-day and is
grouped by `startsAt`, so it needs nothing.
**Asked for:** the simplest thing that renders the frame - a `whenText`
(localeString) on `programmeEvent`, shown in place of the formatted time when
it is set, so an editor writes "everyday — 11:00 / 16:00" once. A recurrence
model (`days[]` + `times[]`) would also work but is far more than these two
blocks need.

**Also, content rather than schema:** only two VIP events exist for the
current edition (Preview, Vernissage) and both are `venue: "off-site"`, so
the design's on-site section has nothing to draw and the seven off-site
entries of the frame are not in Sanity at all. The tab renders what is there.

---

## #16 · done · 2026-09-18 · the hotel's special rate as its own fields

**Done (Kamindu, 2026-09-19):** `practicalInfo.hotelDeal.rate` (localeString) beside the existing `text`, both selected in `getSettings`. The rate line and the paragraph are two fields now, so the split in `vipContent.ts` can go. Kept on `practicalInfo` rather than made a page-builder block: the panel appears on one tab, and moving it later costs a query line. `{code}` substitution is unchanged and still works in either field.

**Page / component:** `src/components/hubs/Vip.astro`, the hotel deal tab
**Figma frame:** `output.pdf` page 5
**The design shows:** a bordered panel with three distinct things - the label
"special rate" in the top right corner, the rate line **"€160/night breakfast
included"** in bold caps, and under it the paragraph "Use code CERAMIC27 to
enjoy a special rate of €160 per night…". Beside the panel, above it, sit the
hotel's own name, its description and "discover The Hoxton ↗".
**The query returns today:** `getSettings` → `practicalInfo.hotelDeal{ text,
url, partner-> }`. One Text field has to carry both the rate line and the
paragraph, and there is nothing to put in the panel's label.
**Rendered meanwhile:** the panel is drawn from the frame's own two lines
(`src/components/vipContent.ts`) while the tab has no `page` document, with
the label from a UI string (`vip.specialRate`, all three locales). `{code}`
in that paragraph is filled from the D1 setting `hotel_code` on a Worker
render and falls back to the frame's CERAMIC27, so the live code still never
sits in the repo or in Sanity.
**Asked for:** a `rate` (localeString) beside `text` on
`practicalInfo.hotelDeal`, selected in `getSettings`, so the two lines are two
fields and the split can go. If the panel is meant to be reusable on other
pages it should instead be a page-builder block (label, rate, text, link) -
say which and the frontend follows.

---
## #17 · open · 2026-09-18 · the VIP tabs have no page documents

**Seeded as drafts (Kamindu, 2026-09-24):** `scripts/seed-vip-pages-2026-09-24.mjs` wrote the five `page` documents (`page-vip-about`, `-programme`, `-lounge`, `-hotel-deal`, `-access`) and the frame's eight 2027 VIP events (`event-2027-vip-*`) as **drafts**, with the 17 pictures uploaded, from `vipContent.ts` word for word - so the switch to Sanity changes nothing on the page. The live site is untouched until an editor publishes them (Studio → VIP; Preview shows them). Two things to know before publishing: the programme events flip `getProgramme` to the 2027 edition, whose talks tab is still empty - have the 2027 talks in first; and the "book your visit" pills come back one event at a time as its Link field is filled (#14). The lounge and hotel-deal forms now show Cover (`pageKinds.ts`), which `Vip.astro` reads there. Three frontend leftovers for Lilanga once the tabs are Sanity-backed: `Vip.astro` prints `formatTime(startsAt)` where `whenText` (#15, in the query) should win; it draws no pill from `event.link` (#14, in the query); and the hotel rate block still reads `C.hotelDeal.rate` rather than Site settings → Hotel deal (#16). When all five are published, `vipContent.ts`, `VipShot.astro` and `fromDesign` go.

**Still open, on purpose (Kamindu, 2026-09-19):** the scaffolding stays. The five `page` documents would flip `fromDesign` off for good, and the copy the client has signed off on is still moving; typing the frames' English into Sanity now would replace a designed page with an empty one. The Studio is ready for them - the VIP folder already offers the about page and the tab intros - so this is a content session, not a code change, and it wants the client's final text. The two fields that cost nothing are handled below.

**Page / component:** `src/components/hubs/Vip.astro`, all five tabs
**Figma frame:** `output.pdf`, the five VIP frames (2026-09-18)
**The design shows:** five full pages - lead, pictures, "programme overview"
with two groups of rows, an on-site and a four-day off-site programme, the
lounge's scenography, aperitivos and agenda, and the hotel deal.
**The query returns today:** `getHubPages(lang, 'vip')` → nothing. No `page`
document exists with `section: "vip"` for any of `about`, `programme`,
`lounge`, `hotel-deal`, `access`, so every tab has no lead, no cover, no
section stack and no body. `getProgramme` returns two VIP events (Preview,
Vernissage, both 2026, both `venue: "off-site"`, neither with a description)
where the frame lists eight for 2027.
**Rendered meanwhile:** the frames' own copy and pictures, from
`src/components/vipContent.ts` and `public/assets/vip/`, so the pages can be
reviewed and shown now. **This is scaffolding and is meant to be deleted.**
A tab switches to Sanity the moment it has a `page` document - `fromDesign`
in the component is the whole of the mechanism - so the hand-over is one
document at a time and needs no frontend change.
**Two fields that are only fields, and change what the page prints today:**
 - **Site settings → VIP → contact email** is empty, so `getVipSettings`
   coalesces it to the site's `contactEmail` and the contact block, the
   "book your visit" pills and the wrong-code line all say
   *info@ceramic.brussels*. The frame says **vip@ceramic.brussels**.
 - **Partner "Embelco" has no website URL**, so its pill is dropped. The
   lounge frame draws "discover Embelco →" beside "discover MAD Brussels";
   filling the URL brings it back with no code change.

**The two fields:** Site settings → VIP → contact email and the Embelco partner URL are one-line edits in the Studio, both listed in `docs/vip-access.md` for the editors' pass. Neither needs a schema or a query change.

**Asked for:** five `page` documents in section `vip` with the English slugs
`about`, `programme`, `lounge`, `hotel-deal` and `access`, and the 2027 VIP
events of the frame as `programmeEvent`s with `section: "vip"` and `venue`
set. The copy is transcribed in `src/components/vipContent.ts` and the
pictures are in `public/assets/vip/`, ready to be uploaded; the English is
the only language the design has. Two notes for whoever types it in: the
frame's MAD Brussels afterparty and its three lounge agenda rows repeat
another entry's paragraph (still placeholder in the design), and the Charles
Riva row is credited "© Hotel Solvay" by mistake, which the fallback corrects.

---
## #18 · done · 2026-09-18 · a VIP row in the menu, after partners

**Done (Kamindu, 2026-09-19):** A `navItem` keyed `navItemVip` sits between partners and visitors info in `scripts/apply-design-content.mjs`, labelled VIP / VIP / VIP, with `navChild`ren for about, VIP programme, VIP lounge and hotel deal. The three locked children are linked like any other: a visitor without a session is sent to the access page by the gate, which is the intended door.

**Not yet in the dataset.** The script writes to the live `production` dataset, so `--only=nav` is run deliberately, not as part of a build. Until it is, the live menu is the `navigation` document as it stands - no VIP row, and the programme children still in the old order. Say the word and it runs.

**Page / component:** the slide-in menu (`src/components/MenuOverlay.astro`,
fed by `getNavigation` through `Base.astro`)
**Figma frame:** the VIP frames of 2026-09-18; the hub exists and is linked
from nothing.
**The design shows:** VIP as a menu row of its own, **after partners** and
before visitors info, with its tabs on the sub-line (about / VIP programme /
VIP lounge / hotel deal).
**The query returns today:** `getNavigation` → the seven rows the
`navigation` document holds - exhibitors, guest of honour, art prize,
programme, partners, visitors info, about. There is no VIP row, so the hub
is reachable only by typing the address.
**Rendered meanwhile:** nothing invented - the menu renders the document as
it is. The *fallback* menu (used only when the document has no items) now
orders the hubs the way the design does, VIP after partners, through
`MENU_ORDER` in `Base.astro`.
**Asked for:** a `navItem` for the VIP hub between `navItem4` (partners) and
the visitors-info row, with `navChild`ren for its four pills. **It belongs in
`scripts/apply-design-content.mjs`, not only in the Studio**: the `nav` step
does `set('navigation', { items })` with fixed `_key`s, so it replaces the
whole array - a row added by hand in the Studio disappears the next time
`--only=nav` runs. Labels, for the three locales: VIP / VIP / VIP, and the
tabs are already translated in `STRINGS` (`tabs.about`, `tabs.vipProgramme`,
`tabs.vipLounge`, `tabs.hotelDeal`).

---

## #19 · done · 2026-09-22 · press & media as a hub of its own, with its leads

**Done (Kamindu, 2026-09-22):** a `press-media` hub in `src/lib/hubs.ts` - `/en/press-media` (stories, the root), `/press-media/press`, `/press-media/photos-videos`, `/press-media/media-partners`; French `presse-medias/recits|presse|photos-videos|partenaires-medias`, Dutch `pers-media/verhalen|pers|fotos-videos|mediapartners`. The about hub keeps its "press & media" pill as a link tab onto the press tab; its hidden `images` tab is gone (the gallery is photos & videos now). `hubs/PressMedia.astro` mounts your `PressMedia.astro` per tab: it takes `tab`, `page`, `pages`, `settings`, draws the band with `route="press-media"` and the one view, and the hash script went. Leads: each tab's `page` has `intro` (first heading) and, on stories and press, `intro2` (second heading: collectors' voices, press room) - rendered inside `.section-intro` / `.top-section` as `p.lead`, or as `.intro-large.lead-top` on the two tabs without headings; styled minimally, yours to restyle. Empty states per tab (`press.storiesEmpty`, `press.empty`, `about.imagesEmpty`, `press.partnersEmpty`). Redirects: `/about/press` and `/about/images` in every language in `public/_redirects`, the old site's `press`, `photos`, `aftermovie` in `scripts/legacy-redirects.mjs`. Studio: a "Press & media" folder (page, tab intros, stories, clippings, releases, editions, media partners, Site settings → Press), `pageKinds.ts` shows the two leads. The designer's "search by media" question stays open. `scripts/press-media-content.mjs` seeds the four pages, the leads and the first story.

**Page / component:** `src/components/PressMedia.astro`, mounted by `src/components/hubs/About.astro` on the `press` tab
**Figma frame:** the press & media hand-off of 2026-09-21 (`ceramic-brussels-press-media-html-2026-09-21-v2.zip`, previews in `press-and -media/`)
**The design shows:** "press & media" as a hub title with four tabs - **stories**, **press**, **photos & videos**, **media partners** - each its own page. Every view opens with a lead paragraph (two on stories and press, one per section): "Because the fair is a collective effort…", "Discover a selection of articles…", "Benefiting from strong international visibility…", "ceramic brussels unfolds over five days of discovery…", "The strong commitment of leading media outlets…".
**The code says today:** press & media is one tab of the about hub (`/[lang]/about/press`), one `page` document (`demo-page-about-press`), whose one `intro` ("Press clips, press kit and contacts…") the design has no place for.
**Rendered meanwhile:** the four views on the one tab, under the design's "press & media" band. The pills switch between them in place and put the view in the hash (`/en/about/press/#photos-videos`). A view with no content has no pill. The leads are not rendered and neither is the page's `intro`. Each view is a `<section data-view-panel>` that moves to its own tab unchanged.
**Asked for:** a hub (or a second tab level, whichever you prefer) with the four tabs and translated segments, and somewhere for the leads - a `page` per tab would carry one `intro` each, which leaves stories and press one short (the second heading's lead). The old `/about/press` addresses need a target: the new hub root or the press tab. **Question for the designer:** the photos view's "search by media ↓" pill - what does it search? It is not built.

---

## #20 · done · 2026-09-22 · a cover image on a press clipping

**Done (Kamindu, 2026-09-22):** `pressClip.cover` (`figure`), returned as `cover` by `getPressClips`, drawn at the top of each press card as `img.cover` (3:4). There are no legacy articles to import: the old site never had article records, only a flipbook of clippings per edition (the edition's `pressClipsUrl`, listed under "press reviews"), so the clippings are editors' entries - Press & media → "Press: as seen in the press" in the Studio.

**Page / component:** `PressMedia.astro`, press view, "as seen in the press"
**Figma frame:** press & media hand-off, "press" page
**The design shows:** three cards a row, each led by the magazine's cover (portrait, roughly 3:4), then the date (01.12.2025), the article title, the outlet and "read the article ↗", with "load more ↓" underneath.
**The query returns today:** `getPressClips()` → `title, outlet, publishedAt, language, url, pdfUrl`. No image. (And no clippings exist yet: the dataset has 0 `pressClip` documents, so the section is not shown at all.)
**Rendered meanwhile:** the cards without a cover: date, title, outlet, link; six, then six more per "load more".
**Asked for:** a `cover` (`figure`) on `pressClip`, returned as `cover ${IMAGE}` by `getPressClips`. The import of the 230+ legacy articles would fill the section.

---

## #21 · done · 2026-09-22 · stories: interviews and collectors' voices

**Done (Kamindu, 2026-09-22):** a `story` document (`src/sanity/schemaTypes/documents/story.ts`): `kind` (interview / collectors-voice), `title` (name or title), `role` (interviews), `publishedAt`, `image`, `text`, `link` (the site `link` object: a news item, a page of this site, or an external address) and `order`. `getStories(lang)` returns them; the component maps each to `{ image, title, role, date, text, url, arrow, external }` through `resolveLink`, so "read the interview" carries → or ↗ with the link. A story is a card, not a page: an interview published here is a news item the story links to; the guest of honour's story links to the guest-of-honour interview tab. The Ceramics Now pill is Site settings → Press → "Collectors’ voices: series link" (`collectorsVoicesLink`, a `link` with its own label), drawn beside the collectors' lead. Studio: Press & media → "Stories: interviews" and "Stories: collectors’ voices".

**Page / component:** `PressMedia.astro`, stories view (markup built, fed empty arrays)
**Figma frame:** press & media hand-off, "stories" page
**The design shows:** two lists. **Interviews**: three cards a row, picture, name ("Marion Verboom"), the role they speak in, in capitals ("guest of honour", "main partner", "media partner"), a short text, "read the interview →"; "load more ↓". **Collectors' voices**: a lead with a "discover Ceramics Now ↗" pill beside it, then rows of picture (half) + a dated rule ("DEC. 2026"), title, text, "read the interview →".
**The query returns today:** nothing of the kind. `newsItem` has no interview category and no "role" line.
**Rendered meanwhile:** no stories pill; the view appears as soon as either list has an item. The component expects per item `image` (figure), `title`, `role` (interviews), `date` (collectors), `text`, `url`.
**Asked for:** your call on the shape: two new `newsItem` categories (`interview`, `collector`) plus a localised `role` line would give each story a page of its own, which "read the interview →" suggests; or a small `story` document if they link out (Ceramics Now hosts the collectors' series). Plus the Ceramics Now link (a Site settings field or the partner document's `url`).

---

## #22 · done · 2026-09-22 · press releases: their edition, and a file per language

**Done (Kamindu, 2026-09-22):** `"edition": edition->year` in `NEWS_CARD`; the field shows on a news item whose category is "press release" (hidden otherwise), and the component uses it before the date rule. Releases stay news items with a page per language, as you built them; Studio: Press & media → "Press: press releases (news)". Files per language are not added: nothing says the releases are PDFs - if the client's are, ask again and it is a `file` per language on the item.

**Page / component:** `PressMedia.astro`, press view, "press releases"
**Figma frame:** press & media hand-off, "press" page
**The design shows:** "SORT BY:" pills per edition ("2027 edition", "3rd edition"…), then each release: a dated rule ("SEPT. 2026"), the title, and "read in EN → / read in FR → / read in NL →".
**The query returns today:** `getNews` → `NEWS_CARD`, which has `category` (so `press-release` items can be picked out) but not `edition`, although the field exists (hidden) on `newsItem`. No press-release item exists yet.
**Rendered meanwhile:** releases are the `press-release` news items; the three "read in" pills are the item's news page in each language. The edition is worked out from the date - a release belongs to the first edition that ends after it was published.
**Asked for:** `"edition": edition->year` in `NEWS_CARD` (and the field shown again for this category). If the releases are PDFs rather than pages, say so: then a `file` per language on the item, and the pills link those.

---
## #23 · done · 2026-09-24 · the header's main-partner lockup as a field

**Done (Kamindu, 2026-09-24):** `headerLockup` (figure) on `partner`, shown only when the tier is "main"; `headerLockup ${IMAGE}` in `PARTNER`. `Header.astro` draws it as one image fitted to the design's 161 × 29 slot and falls back to the shipped Puilaetco files when the main partner has none, so nothing changes until an editor uploads one. Studio: Partners → Puilaetco → Header lockup.

**Page / component:** `src/components/Header.astro`, the lockup beside "main partner"
**Figma frame:** the header, every frame
**The design shows:** the main partner's mark, name and tagline as one lockup.
**The query returned before:** `PARTNER` had `name`, `tier`, `url` and the partners-page `logo`, nothing for the header, so the three SVGs in `public/assets/` were fixed in the markup - a change of main partner meant a code change.
**Asked for:** one wide image on the main partner for the header.

---
## #24 · done · 2026-09-24 · the venue map on practical info as a field

**Done (Kamindu, 2026-09-24):** `venueMap` (figure) on `edition`, group "Hours & tickets", and `venueMap ${IMAGE}` in `EDITION_CORE`. `Visit.astro` draws the current edition's map under the access modes and falls back to `public/assets/venue-map.png` (the designer's 2027 drawing) when the edition has none. Alt text is the figure's, else `visit.mapAlt`. Studio: Setup → Editions → 2027 → Hours & tickets → Venue map.

**Page / component:** `src/components/hubs/Visit.astro`, practical info, under "how to get there"
**Figma frame:** visitors info, practical info (2026-09-17)
**The design shows:** the site diagram of the hall with its entrances and the transport around it.
**The query returned before:** nothing - the PNG was fixed in the markup, and a new edition in another hall meant a code change.
**Asked for:** a figure per edition.

---
## #25 · done · 2026-09-24 · a link on each key figure

**Done (Lilanga's branch, 2026-09-24 - Kamindu please review):** an optional `link` (the site's `link` object) on `keyFigure` in `objects/visitor.ts`, and `"link": link ${LINK}` in `KEY_FIGURES`. Additive: no migration, nothing changes until an editor sets a link. Studio: Setup → Editions → 2026 → Key figures → each figure's Link.

**Page / component:** `src/components/sections/KeyFigures.astro`, homepage variant
**Figma frame:** client feedback of 2026-09-24 (`ceramics-new.pdf`, homepage)
**The design shows:** each figure of the "key 2026 figures" grid as a link, turning acid on hover like the artists list: 19,200 visitors → about → ceramic brussels, 70 exhibitors → exhibitors, 200+ artists → artists, 3,500 VIPs → VIP → about, 230+ press clips → press & media, and a new "50k Instagram followers" (replacing "15 countries", an editor's change on the 2027 edition) → the Instagram account.
**The query returns today:** `KEY_FIGURES` → `value`, `label`; `keyFigure` has no link.
**Rendered meanwhile:** the component already reads `figure.link` through `resolveLink` and turns a linked cell into an `<a>` with the acid hover; with no link the cell is plain, as now.
**Asked for:** an optional `link` (the site's `link` object) on `keyFigure`, selected in `KEY_FIGURES` as `link{ ... }` the way other links are projected.

---
## #26 · done · 2026-09-24 · art prize tabs: jury before awards

**Done (Lilanga's branch, 2026-09-24 - Kamindu please review):** the two entries swapped in `HUBS['art-prize'].tabs`. Slugs and segments unchanged, so no URL, redirect or page document moves.

**Page / component:** `src/components/HubNav.astro` on the art prize hub
**Figma frame:** client feedback of 2026-09-24 (`ceramics-new.pdf`, art prize)
**The design shows:** the tabs in the menu's order - about, laureates, jury, awards - so "awards" is the last button on the page. The menu already lists them that way.
**The code has today:** `src/lib/hubs.ts` lists `awards` before `jury` in the `art-prize` tabs.
**Rendered meanwhile:** unchanged order.
**Asked for:** swap the two entries in `HUBS['art-prize'].tabs`. Neither is the first tab, so no route or URL moves.

---
## #27 · done · 2026-09-24 · "leave the VIP area" does nothing for an editor

**Done (Lilanga's branch, 2026-09-24 - Kamindu please review):** `/api/vip/leave` now clears the preview cookie along with `cb_vip` (the gate itself is unchanged; Preview in the Studio issues a new cookie when next used). The locked tabs also reload when the browser restores them from its back/forward cache, so Back after leaving asks the gate again instead of showing the page.

**Page / component:** `src/components/hubs/Vip.astro`, the leave form; `src/middleware.ts` (`vipGate`), `src/server/routes/vip-leave.ts`
**Figma frame:** client feedback of 2026-09-24 ("it works for me … but not for Tiphaine")
**What happens:** `/api/vip/leave` deletes the KV session and clears `cb_vip`, but `vipGate` lets a request in on the **preview cookie** before it looks at the session. Anyone who has used Preview in the Studio - Tiphaine is an editor - still carries that cookie, so the locked tabs keep opening for them after leaving, and no code is ever asked for.
**Rendered meanwhile:** the link itself is restyled (centred, arrow, underline wipe); the behaviour is server-side.
**Asked for:** either honour the preview cookie only under `/preview/` (the published VIP tabs then need a session like everyone's), or have the leave route clear the preview cookie as well. Your call which; the first is what an editor would expect when testing the gate.

---
## #28 · open · 2026-09-24 · exhibitors → awards: the page's content

**Page / component:** `src/pages/[lang]/exhibitors/awards.astro`
**Figma frame:** client screenshot in `ceramics-new.pdf` (exhibitors → awards, 2026-09-24)
**Where it stands:** an editor made the three awards in the Studio on 2026-09-24 (best booth, best solo show, best group show, all on the 2026 edition, with descriptions; best booth has its three fair photos, and SECCI / Galerie Judith Andreae as winners). The page now lists one row per award name of this edition or the last, so that data renders as the frame: "previous laureate (2026)" under best booth and best solo show, "new this year" on best group show, which nobody has won.
**Still missing (content, editors):**
- the intro line - a `page` in section "exhibitors" with English slug `awards` and this lead: "Each year, ceramic brussels honors participating galleries for the excellence and quality of their presentation. For this edition, 3 awards valued at €2,000 each will be presented to the winners." If the Studio has no way to create a second page in the exhibitors section, that is the backend part of this request;
- photos on best solo show and best group show (best solo show shows SECCI's artworks meanwhile, best group show is empty); the frame's captions are "SECCI, ceramic brussels 2026" and "Puls Ceramics, ceramic brussels 2026";
- **Outcome** on the two winners ("featuring works by German artist Janis Löhrer", "presenting works by Irish artist Kevin Francis Gray");
- **Order**: best booth is 10, the other two are both 100, so their order is not fixed - 20 for best solo show and 30 for best group show gives the frame's order.

---
## #29 · done · 2026-09-24 · about: "contact & team", and /contact merged into it

**Done (Lilanga's branch, 2026-09-24 - Kamindu please review):** client feedback and Figma "about - contact & team". In `src/lib/hubs.ts` the about hub's press & media pill is removed and the `team` tab is labelled `tabs.contact` = "contact & team" / "contact & équipe" (slug and segments unchanged). `/[lang]/contact` is now a 301 page to `about/team`, whose tab carries the contact block (Site settings → Contact & social) above the team. In `scripts/legacy-redirects.mjs` the old site's `contact` goes to `about/team`. The FAQ's "contact us" links the tab.
**Editors:** Setup → Menu and footer → about → rename the "contact" sub-item "contact & team". The tab's lead paragraph (the page document's Intro) is not in the Figma frame; clear it there if it should go.

**Studio side done (Kamindu, 2026-09-25):** the `/contact` route is gone (`src/pages/[lang]/contact.astro` deleted) and `public/_redirects` sends `/en|fr|nl/contact/` to the tab with a real 301, where the page could only manage a meta refresh. Contact is no longer a listing section: the sidebar's Contact folder is removed and its Site settings entry ("Email, address, social links, newsletter") sits in the About folder; `mainPages.ts`, `pageKinds.ts`, `routes.ts` (`BUILT_IN_ROUTES`, `PAGE_SECTIONS`, `LISTING_SECTIONS`), `links.ts` `LISTINGS`, `siteLinks.ts` and `previewPaths.ts` no longer know it. No `page` document ever had section "contact", so nothing is orphaned; a link that still says route `contact` resolves to `/contact` and 301s.

---
## #30 · done · 2026-09-27 · exhibitors: a list image of its own

**Page / component:** `src/components/ExhibitorCard.astro`, on `/exhibitors` and `/exhibitors/<year>`
**Asked by:** Tiphaine, WhatsApp 2026-09-25 ("a separate preview image when in the full list of galleries, rather than automatically using the first slideshow photo"); `docs/client-feedback-2026-09-25.md` row 20
**The query returned:** `"image": images[0]` in `EXHIBITOR_CARD` - the card was always the slideshow's first picture.
**Done (Kamindu):** new optional `figure` field `listImage` ("List image", Images tab of the exhibitor, above the slideshow). `EXHIBITOR_CARD` now selects `"image": coalesce(listImage, images[0])`, so the card reads the same `image` prop as before and **needs no frontend change**; a gallery without a list image looks exactly as it did, so there is no migration. The Studio list thumbnail follows the same rule. The detail page's slideshow is untouched.

---
## #31 · done · 2026-09-28 · feature block: several pictures, for an autoplay slideshow

**Page / component:** `src/components/sections/Feature.astro` (the `spotlight` block), homepage features
**Asked by:** Tiphaine, WhatsApp 2026-09-24 (homepage features as a slideshow that plays by itself); Roy's follow-up of 2026-09-28, item 3
**The query returns today:** `_type == "spotlight" => { kicker, headline, link, image }` in `SECTIONS` - one `figure`.
**Rendered meanwhile:** the one picture, as now.
**Asked for:** an optional array of `figure` on `spotlight` (e.g. `images`, "More pictures", after `image`), and `"images": images[] ${IMAGE}` in its projection. `image` stays the first picture, so no migration and nothing changes for a block without extras. With more than one picture the frontend draws the block's picture as a slideshow that advances by itself (paused on hover and for reduced motion).
**Done (Lilanga, 2026-09-28, working across the stack per docs/project-handbook.md):** `images` ("More pictures", array of `figure`, grid layout) on `spotlight` in `src/sanity/schemaTypes/objects/section.ts`, after `image`; `"images": images[] ${IMAGE}` in the `spotlight` branch of `SECTIONS`. Additive, no migration. `Feature.astro` shows `[image, ...images]` as a `Slideshow` with `autoplay` (4.5 s, held on hover/focus/off screen, off for reduced motion) when there is more than one. **Editors:** homepage → the feature → More pictures.

---
## #32 · done · 2026-09-30 · previous editions: a lead paragraph per tab

**Page / component:** `src/components/editions/*.astro`, every tab of `/[lang]/previous-editions/<year>`
**Figma frames:** `Previous editions/ceramic brussels — previous editions — 2025 — *.png` (all seven)
**Asked by:** Léonie, Figma comments 2026-09-28 ("NEW SECTION to add to the website: previous editions… the principle and pages stay the same for 2026 and 2024"); `docs/previous-editions-plan.md` §4
**The design shows:** every one of the seven tabs opens with its own lead paragraph, in the site's large lead type — *"The 2025 edition put Norwegian creation in the spotlight through a dedicated national focus…"* on overview, *"An immersive journey into the heart of emerging ceramic art…"* on art prize, *"A special publication dedicated to the fair…"* on publication, and so on. Seven different paragraphs per year.
**The query returns today:** `edition.intro` (`localeBlock`), one field for the whole edition — and it is **empty on 2024, 2025 and 2026**. Nothing per tab.
**Rendered meanwhile:** no lead; each tab starts at its first band.
**Asked for:** a lead per tab on `edition`. Suggested shape: one `archiveLeads` array of an object with `tab` (a string from a fixed list: overview, guest-of-honour, exhibitors, art-prize, focus, programme, publication) and `lead` (`localeBlock`), selected as-is. An object per tab in a fieldset would do as well — what matters is that a tab can be given its own paragraph without the others inheriting it. `intro` stays what it is for `/editions` and the homepage; overview can fall back to it.
**Source text:** `legacy-export/normalized/pastEditions.json` — the `text-2col` / `text-1col` blocks on `guest-of-honour-3`, `norwegian-focus`, `art-prize-laureates-2`, `magazine-2`, `photos` and their 2024/2026 counterparts.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** new `archiveLeads` array of `editionLead` (tab + lead) on `edition`, Figures & archive group. The five 2025 leads are in, transcribed from the frames. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #33 · done · 2026-09-30 · previous editions: overview highlights and its two images

**Page / component:** `src/components/editions/Overview.astro`, `/[lang]/previous-editions/<year>`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — overview.png`
**Asked by:** Léonie, Figma 2026-09-28; `docs/previous-editions-plan.md` §4.1
**The design shows:** two things `edition` has no home for.
1. **Two images side by side** under the lead, full width, one landscape pair — not a slideshow and not the 60-odd photo gallery.
2. A **`highlights`** column beside `key figures`: four editor-written links, each a sentence ending in `→` — *"guest of honour: Elizabeth Jaeger (US) →"*, *"10 art prize laureates →"*, *"Focus on the Norwegian ceramic scene →"*, *"Art installation by KRJST studio →"*. Three of the four point at other tabs of the same edition; the fourth (KRJST) is a one-off.
**The query returns today:** `cover` (one `figure`) and `images` (the archive gallery, 39–68 pictures) — no pair, no highlights.
**Rendered meanwhile:** `cover` alone, and no highlights column.
**Asked for:** on `edition`, in the archive group — `leadImages`, an array of `figure` (the overview draws the first two), and `highlights`, an array of an object with a `localeString` label and a `link` (the existing `link` object, so the Studio's site-link search box picks the tab and `sitePath` writes it out in the reading page's language). Both optional; the column and the image row collapse when empty.
**Note:** `keyFigures` on the same frame is already filled for all three years and **needs no schema change**. It does not match the frame — 2025 holds five figures (`17,840 visitors`, `65 galleries`, `200+ artists`, `14 countries`, `13 talks`) where the frame draws three rows with two figures combined on one line and different numbers — but that is a layout question for the designer (`docs/previous-editions-plan.md` §8.6), not a field.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** new `leadImages` (array of `figure`) and `highlights` (array of `editionHighlight`: a localeString label + a `link`) on `edition`. 2025 has its pair of pictures and its four highlight links. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #34 · done · 2026-09-30 · previous editions: the guest of honour's installation that year

**Page / component:** `src/components/editions/GuestOfHonour.astro`, `/[lang]/previous-editions/<year>/guest-of-honour`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — guest of honour.png`
**Asked by:** Léonie, Figma 2026-09-28; `docs/previous-editions-plan.md` §4.2
**The design shows:** under the portrait and `biography`, a second run: a titled essay about the work the guest made *for that fair* — **`AT TWILIGHT, ceramic brussels 2025`**, four paragraphs, signed **`Jean-Marc Dimanche`** — with a five-picture slideshow beside it, credited *"© Geoffrey Fritsch, ceramic brussels 2025"*.
**The query returns today:** `artist.bio`, `artist.portrait`, `artist.nationality` — the person, filled and fine. Nothing about what they showed in a given year. `artist.intro`, `artist.carousel` and `artist.interview` are the *current* guest's feature-page fields and belong to the artist, not to an edition: 2025's guest has since been followed by two others, so putting AT TWILIGHT there would attach it to Elizabeth Jaeger forever rather than to ceramic brussels 2025.
**Rendered meanwhile:** the lead, portrait and biography; the essay and its slideshow are absent.
**Asked for:** on `edition`, a `guestInstallation` object — `title` (`localeString`, *"AT TWILIGHT, ceramic brussels 2025"*), `text` (`localeBlock`), `author` (`string`, *"Jean-Marc Dimanche"*), `images` (array of `figure`). Edition-scoped, so each year keeps its own; optional, so a year without one draws the biography alone.
**Source text:** `legacy-export/normalized/pastEditions.json` → `guest-of-honour-3` (2025, blocks `title / text-2col / gallery ×4`), `guest-of-honour-31` (2026), `guest-of-honour` (2024).

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** new `guestInstallation` object on `edition` (title, text, author, images). 2025 carries AT TWILIGHT, its three paragraphs and Jean-Marc Dimanche's signature, with the entrance photograph. Elizabeth Jaeger's real three-paragraph biography and her Mennour portrait replaced the seeded one-liner on the artist. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #35 · done · 2026-09-30 · previous editions: the country focus tab

**Page / component:** `src/components/editions/Focus.astro`, `/[lang]/previous-editions/<year>/focus`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — norway focus.png`
**Asked by:** Léonie, Figma 2026-09-28 (and comment on the galleries list: *"these link to the individual gallery pages in exhibitors 2025"*); `docs/previous-editions-plan.md` §4.5
**The design shows:** a tab per edition that had a country focus — labelled `norway focus` in 2025, and by the same rule `españa focus` in 2026. On it: a lead with an inline external link (*"in collaboration with **Norwegian Crafts**"*), a slideshow, a `galleries` list of the five participating galleries each ending in `↗`, and a `talks programme` of three talks, each with a description, `SPEAKERS` and `MODERATOR`, plus a second slideshow.
**The query returns today:** `edition.countryFocus`, a `localeString` used as a badge on exhibitor cards (*"focus Norway"*) — the label and nothing else. `exhibitor.inCountryFocus` flags the galleries. `programmeEvent` carries every field a talk needs but nothing says a given event belongs to the focus rather than to the general programme, and the design shows the same year's events split across two tabs.
**Rendered meanwhile:** the tab is built from `countryFocus` alone — its label and the exhibitors flagged `inCountryFocus`; no lead, no talks.
**Asked for:** on `edition`, a `focus` object — `lead` (`localeBlock`, carrying its own inline link, so no separate URL field), and `images` (array of `figure`) if the slideshow should not simply reuse the archive gallery. Plus **one way to mark a focus talk**: either a `focus` value in the existing `section` list on `programmeEvent`, or a `talks` array of references on the `focus` object. The first is less to maintain; your call.
**Two things the data does not have (checked against `production`, 2026-09-30):**
1. **No 2025 exhibitor is flagged `inCountryFocus`** — but the five are trivially findable, because **the import wrote the marker into their names instead**:

       Format (no) ___ focus Norway
       Kiosken (no) ___ focus Norway
       QB Gallery (no) ___ focus Norway
       RAM galleri (no) ___ focus Norway
       SKOG Art Space (no) ___ focus Norway

   Those are exactly the five on the frame. So this is one patch: set `inCountryFocus` on them and cut the ` ___ focus Norway` off the name. **The suffix is on the site today** — `/en/exhibitors/2025` prints "Format (no) ___ focus Norway" as a gallery's name, which is worth fixing whatever happens to the focus tab.

   Eight documents do carry the flag and all eight are 2026's España galleries, so **2026's focus tab already lists its galleries** and only 2025 is empty. Once flagged, the list is `getExhibitorsByYear(lang, year)` filtered on the flag and linked through `exhibitorPath()` — no new field. A `galleries` reference array on the `focus` object would do the same job less cheaply. Until one of them is filled, `tabsFor` gives 2025 no focus pill at all, because a pill onto an empty page is worse than no pill.
2. **`section` is set only on 2026 and 2027 events.** Every 2025 and 2024 `programmeEvent` has it empty, so adding a `focus` value to the list is not enough on its own — that year's talks have to be given a section for the focus and programme tabs to divide between them.
**Source text:** `legacy-export/normalized/pastEditions.json` → `norwegian-focus` (blocks `text-2col / image / accordion ×2 / text-1col / gallery`); the accordions are the talks, with their speakers and moderators.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** new `focus` object on `edition` (lead, images, talkImages) and a `focus` value in `PROGRAMME_SECTIONS`. The five Norwegian galleries are flagged `inCountryFocus` and their names no longer carry "___ focus Norway"; the three talks are sectioned `focus`, with their moderators, their speakers lifted into `speakersText` and the credit lines stripped out of their descriptions. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #36 · done · 2026-09-30 · previous editions: the publication reader

**Page / component:** `src/components/editions/Publication.astro`, `/[lang]/previous-editions/<year>/publication`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — publication.png`
**Asked by:** Léonie, Figma 2026-09-28; `docs/previous-editions-plan.md` §4.7
**The design shows:** a lead (*"A special publication dedicated to the fair provides an overview of contemporary ceramic world…"*) over a full-width page-flip reader showing the AMA × ceramic brussels cover, `#366`, with a `1/84` page counter.
**The query returns today:** `edition.catalogueUrl` and `edition.overviewUrl`, both plain `url`, rendered as pills on `/editions`. Neither is the reader, and nothing says which to embed.
**Rendered meanwhile:** nothing — the tab is not built without a URL.
**Asked for:** on `edition`, a `publication` object — `url` (the reader, embedded in an `<iframe>`) and optionally `cover` (`figure`) and `title` (`localeString`) for the link-out and the page's social image. The lead comes from #32.
**The URLs, found on the live old site 2026-09-30** (`/en/pasteditions/magazine-2` and `/magazine`), so nothing needs hunting:
- 2025 → `https://online.fliphtml5.com/qogyd/xffh/`
- 2024 → `https://online.fliphtml5.com/qogyd/ncuf/`
- 2026 → not on any past-edition page; if there is a 2026 reader, please ask the client for it.

FlipHTML5 serves these in a plain iframe, so `Embed.astro` should cover the rendering.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** new `publication` object on `edition` (url, title, cover). 2025 and 2024 point at their FlipHTML5 readers. 2026 still has none - ask the client whether one exists. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #37 · done · 2026-09-30 · programme events: show the moderator again

**Page / component:** `src/components/editions/Focus.astro` and `src/components/editions/Programme.astro`; also `src/components/hubs/Programme.astro`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — norway focus.png`, talks programme
**Asked by:** Léonie, Figma 2026-09-28; `docs/previous-editions-plan.md` §4.5
**The design shows:** each talk lists `SPEAKERS` and, under it, `MODERATOR` — *"Jorunn Veiteberg"* on two of the three 2025 talks, *"Marthe Yung Mee Hansen, Norwegian Crafts"* on the third. Two labelled lines, not one.
**The query returns today:** `moderator` is selected in `getProgramme` — but the field is `hidden: true` in `src/sanity/schemaTypes/documents/programmeEvent.ts`, so an editor cannot see or fill it. It was hidden under the rule in `CLAUDE.md` that a field no page reads is hidden in its schema with a comment; this page reads it.
**Rendered meanwhile:** speakers only.
**Asked for:** unhide `moderator` on `programmeEvent` (under `speakersText`, where it belongs), and select it in `getEditionArchive` alongside the events it already returns.
**And a backfill.** Checked against `production` 2026-09-30: **only 2026 events have a `moderator` value** — twelve of them. No 2025 or 2024 event has one, so unhiding the field leaves this frame's two `MODERATOR` lines (*"Jorunn Veiteberg"*, *"Marthe Yung Mee Hansen, Norwegian Crafts"*) still empty. The values are in `legacy-export/normalized/pastEditions.json` → `norwegian-focus` and `programme-3`; they were presumably skipped because the field was hidden.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** `moderator` unhidden on `programmeEvent` and selected in `getEditionArchive`. The 2025 values are in. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #38 · done · 2026-09-30 · previous editions: laureate Instagram handles and nationalities

**Page / component:** `src/components/editions/ArtPrize.astro`, `/[lang]/previous-editions/<year>/art-prize`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — art prize.png`
**Asked by:** Léonie, Figma comment 2026-09-28 on the laureates list: *"These link directly to the laureates' Instagrams"*
**The design shows:** each laureate as `Asya Marakulina (RU) ↗` — the name, the country in brackets, and an external arrow, the whole line linking to that artist's Instagram. The jury below it shows `instagram ↗` and `website ↗` pills under each member.
**The query returns today:** `artist.instagram`, `artist.nationality`, `artist.website` and `person.countryCode / instagram / website` are all selected — and all empty for the past editions. Checked 2026-09-30: **none of the 10 laureates of 2025 has an instagram, a nationality or a website**, and none of the four jury members has a country code, an instagram or a website. Four artists in the whole dataset have an instagram. The art prize hub works around this by lifting a trailing `@handle` paragraph out of the laureate's bio (`liftInstagram` in `src/components/hubs/ArtPrize.astro`); past laureates have no bio at all, so there is nothing to lift.
**Rendered meanwhile:** the laureate's name as plain text, with no bracket and no arrow; the jury member's name and role with no pills. Both light up field by field, so a partial import is worth having.
**Asked for:** fill `instagram` and `nationality` on the past laureates' `artist` documents, and `countryCode` / `instagram` / `website` on the past jury `person` documents. No schema change — every field already exists and is already selected.
**The handles are in the export, so this is an import pass, not research.** `legacy-export/normalized/pastEditions.json` → `art-prize-laureates-2` carries all ten of 2025's:

    asya_marakulina · beatriceguilleman · camilla.hanney · CONCRETEELEONORE · leonorechas
    lunaisolab · maelle.dufour · pascale.robertpascale · piamougeot · raphael.emine

`art-prize-laureates` (2024) and `art-prize-2` (2026) hold their years', and the `person` blocks on `art-prize-jury`, `art-prize-jury-2` and `art-prize-2` hold the jury's links. The nationalities are the `(RU)`, `(FR)`, `(IE)`, `(BE)` marks beside each name on those same pages.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** all ten 2025 laureates have their Instagram handle and nationality; ten of the twelve 2024-2026 jury members have their website, Instagram and country code, read out of the export's person blocks. Wendy Gers (2026) is stored under a name the export writes as "Wendy Gers (fr/za)" and was left alone. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## Note · 2026-09-30 · previous editions: what this branch changed in the backend half

Not a request - a record, so `npm run boundary` has an answer in the PR.
Following #31 and `docs/project-handbook.md`, which is the guide for working
across both halves since 2026-09-23.

**Changed by Lilanga, outside the frontend half:**

- **`src/lib/previousEditions.ts`** (new) - the section's tabs, segments, paths
  and `tabsFor`. The analogue of `hubs.ts` for a route whose tabs are not a
  constant. No schema, no query.
- **`src/lib/queries.ts`** - `getEditionArchive` extended (it already existed
  for the undesigned `/editions/<year>` archive, which this branch replaces)
  and `getPastEditionsIndex` added, which is the cheap summary the year band
  and `tabsFor` read. The extension **asks for the fields of #32–#36 before
  they exist**; GROQ returns them undefined, so nothing breaks and each tab
  lights up the moment a field lands. One query per year page, memoised by
  `run()`, so seven tabs cost one request - the build makes 136 in total.
- **`src/lib/links.ts`** - `sitePath` and `routePath` now read `editions` and
  `editions/<year>` as the new section, so every `link` an editor has already
  made with the route "Past editions" keeps landing on a real page.
- **`scripts/legacy-redirects.mjs`** - `pastEditionPath()` returns
  `previous-editions/<year>`, and the literal year targets follow. 486 rules,
  135 of them `/pasteditions/`.

**Still Kamindu's, and not touched:** `src/sanity/siteLinks.ts` still offers
`editions` and `editions/<year>` in the Studio's site-link search box, and
`src/sanity/schemaTypes/objects/routes.ts` still lists "Past editions" as
`editions`. Both keep working - `links.ts` translates them and the redirect
map covers a stale one - so this is tidying, not a break. Worth doing when
#32–#36 are done.

---
## #39 · done · 2026-09-30 · past programme events have no dates

**Page / component:** `src/components/editions/Programme.astro`, `/[lang]/previous-editions/<year>/programme`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — programme.png`
**Asked by:** Léonie, Figma comment 2026-09-28: *"same layout than the 2027 talks programme, but without the time, only the title"*
**The design shows:** one folding row per day of the fair — `Thursday 22 January 2025 ↓`, `Friday 23 January 2025 ↓`, `Saturday 24 January 2025 ↓` — the events of that day inside. The time is dropped, but the **day** is the whole structure of the page.
**The query returns today:** `startsAt` on every `programmeEvent`, as it always has. Checked against `production` 2026-09-30: **16 of 2025's 18 events have no `startsAt` at all.** Only `preview` and `vernissage` are dated. 2024 and 2026 are the same shape — the import brought the talks across with their titles, speakers and descriptions but not their times, so there is nothing to group by.
**Rendered meanwhile:** the two dated events in their day row, and the other sixteen listed under the accordion with no day heading — visible, because hiding five sixths of a programme is worse than a list that is not yet grouped. They move up into their day on their own once dated.
**Asked for:** set `startsAt` on the past editions' events. The date alone is what this page needs — the time is not rendered here, though the 2027 talks page does use it, so a real time is better than midnight.
**Where the dates are:** `legacy-export/normalized/pastEditions.json` → `programme-3` (2025), `programme-27` and `programme-2` (2024), `programme-32` (2026). The old pages are built as `title` blocks naming the day followed by the `event` blocks of that day, so the day is the preceding title rather than a field on the event — which is presumably why the import dropped it.

**Done (Lilanga, 2026-09-30, across the stack per docs/project-handbook.md):** the day headings in `legacy-export` were walked to rebuild each event's date: 16 of 16 undated 2025 events and 8 of 9 for 2024. The 2025 programme tab now shows its five real fair days. Filled by `scripts/content/previous-editions.mjs`, which is re-runnable.

---
## #40 · open · 2026-09-30 · a person can only sit on one edition's jury

**Page / component:** `src/components/editions/ArtPrize.astro`, `/[lang]/previous-editions/2025/art-prize`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — art prize.png`
**The design shows:** five jury members for 2025, the third of them **Jean-Marc Dimanche**, "CO-DIRECTOR, CERAMIC BRUSSELS".
**The query returns today:** four. Jean-Marc Dimanche exists once, as `demo-person-jean-marc-dimanche`, and `person.edition` is a single reference pointing at 2027 — so he is 2027's jury, 2027's team and 2027's collaborator, and cannot also be 2025's juror. The same will be true of anyone who sits on the jury twice, which for this fair is most of them.
**Rendered meanwhile:** the four whose `edition` is 2025. No placeholder, no gap.
**Asked for:** your call on the model, which is why this is a request rather than a patch — a second `person` document per year duplicates the human, and an `editions` array or a `juryYears` field changes what `getPeople` means. Whatever you choose, 2025's jury needs Dimanche on it and the export has his bio (`legacy-export/normalized/pastEditions.json` → `art-prize-jury-2`, block 741).

---
## #41 · open · 2026-09-30 · the 2025 exhibitor cards have no pictures

**Page / component:** `src/components/ExhibitorCard.astro`, `/[lang]/exhibitors/2025`
**Figma frame:** `Previous editions/ceramic brussels — previous editions — 2025 — exhibitors.png`
**The design shows:** a three-column grid of gallery cards, each with an artwork.
**The query returns today:** `coalesce(listImage, images[0])` — and the 2025 exhibitors have neither, so the grid is 77 grey placeholders. 2026's have pictures; 2025's were never imported.
**Rendered meanwhile:** the card's frame and the gallery's name, no picture.
**The pictures exist but are not safely matchable.** Léonie's hand-off carries eleven at `Previous editions/Assets/W26423LEvadeHD *.jpg`, 433 × 289, which are the artworks on that frame's cards. Five are identifiable by eye (3 = acb Galéria, 1 = ANALORA, 11 = Deletaille, 12 = Esther Verhaeghe, 13 = Format Oslo) and the file numbering does not follow the card order, so the other six would be guesswork — and an artwork credited to the wrong gallery is worse than no artwork. Either the designer names them, or the 2025 galleries' own images come across from the old site the way 2026's did.

---

---
## #42 · open · 2026-10-01 · programme: the exhibition pass tab and what it lists

**Page / component:** a fourth tab on the programme hub; component is Lilanga's
**Figma frame:** `screenshot/ceramic brussels — programme — exhibition pass.png` (Léonie, sent with the comments of 2026-09-30)
**Asked by:** the client's comments of 2026-09-30, last line: "I have created a new « exhibition pass » page in Figma (inside the « programme » section)!"

**The design shows:** a lead ("Each ticket to the fair includes free access to partner institutions' exhibitions."), then one row per partner institution, alternating picture-left / picture-right. Each row: the institution's name as a ruled heading ("BPS22 — Art Museum of the Province of Hainaut"), the artist's name and the exhibition title in italic on the next line ("Emmanuel Van der Auwera / *Juggernaut*"), a boxed chip at the right with postcode and city ("6000 Charleroi"), a bold-caps date line ("30 JAN. → 9 MAY 2027", and on the second row just "→ 18 APR. 2027", so the start is optional), a paragraph, a "discover the exhibition →" pill, and a slideshow of three pictures with the usual caption line.

**The query returns today:** nothing. There is no document type for a partner institution's exhibition, and `src/lib/hubs.ts` deliberately leaves the tab out — its own comment says "The design's fourth pill, 'exhibition pass (coming up)', is deliberately not here: a tab with no content is a pill onto an empty page." That is no longer true.

**Rendered meanwhile:** nothing; the tab does not exist.

**Asked for:**
1. A tab `{ slug: 'exhibition-pass', … }` **fourth** in the programme hub in `src/lib/hubs.ts`. Note the frame draws the pills in a different order (La Cambre first), but talks is the hub root — `/[lang]/programme` *is* the talks page and `programme-69` redirects onto it — so the order is deliberately unchanged and only the new pill is added. Say if you disagree; it costs a URL.
2. A document type (working name `exhibition`) with: `institution` (localeString), `artist` (string, optional — the CID row has none), `exhibitionTitle` (localeString, rendered italic), `city` (string, the "6000 Charleroi" chip), `startDate` (date, **optional**), `endDate` (date), `description` (localeText), `link` (`link`), `images` (array of `figure`), `edition` (reference), `order` (number).
3. Its projection, and the lead from the tab's own `page` document as the other programme tabs do.

Reusing `programmeEvent` was considered and looks wrong: these are months-long exhibitions at other venues, with no time, no venue-on-site and no programme section, and they would pollute `getProgramme`. Your call.

---
## #43 · open · 2026-10-01 · the photographs are pixelated: the sources are small

**Page / component:** everywhere; reported on photos & videos and the gallery pages
**Asked by:** the client's comments of 2026-09-30, "The picture are still pixelated" — "still", after the retina ladder fix of 2026-09-23

**Not a frontend bug, and that is the point of this entry.** Traced end to end on localhost: a picture asking the CDN for `w=600` is delivered at 600 natural, 1.19× at DPR 2. `SanityImage` already doubles its top step and caps at the asset's own width. The ladder is doing its job; there are not enough pixels in the source.

**The numbers,** photographs only (`image/jp*`, so logos and PNGs are excluded), of 1,416:

| width | count |
| :-- | :-- |
| under 600px | 9 |
| 600–1000px | 63 |
| 1000–1500px | 249 |
| **under 1500px** | **321 (23%)** |

By the document that uses them: **149 unreferenced** (dead weight from the import), **135 exhibitor**, 11 person, 10 edition, 7 partner, 3 page, 2 artist, 2 programmeEvent, 1 laureate, 1 homepage. So the live problem is about **172 pictures, concentrated in the exhibitor galleries**.

The worst are clearly legacy imports — `969.jpg` at 300×225 on the person Vincent Lieber, `2481.jpg` at 473×473 on The Hoxton, `961.jpg` at 479×640 on Florence Reckinger Taddeï. `CLAUDE.md` records why: the old site's resizer answered 500 for `?w=2500` on some 350 files and for any size above roughly 50 megapixels, and the importer falls back to the original when the resized fetch fails.

**Asked for:** a judgement on what is recoverable. Three questions: can the 350 that failed at 2500 be re-fetched at an intermediate width rather than falling back to the original; are the 149 unreferenced ones safe to delete; and for the rest, do we go back to the galleries and the photographers. A displayed-vs-natural report per page can be produced on request.

---
## #44 · open · 2026-10-01 · the Studio still offers "Past editions" as `editions`

**Page / component:** `src/sanity/siteLinks.ts`, `src/sanity/schemaTypes/objects/routes.ts`

**The state today:** the section moved to `/[lang]/previous-editions/<year>` and the note of 2026-09-30 at the bottom of this file flagged this as tidying "worth doing when #32–#36 are done". They are done. The Studio's site-link search box still offers `editions` and `editions/<year>`, and the route list still calls it "Past editions".

**Nothing is broken:** `sitePath` and `routePath` in `links.ts` translate both, and `scripts/legacy-redirects.mjs` covers a stale one. This is so an editor picking a link does not see a name the site no longer uses.

**Asked for:** rename the entry to "Previous editions" and the value to `previous-editions`, keeping the old value readable so existing links do not break.

---
## #45 · open · 2026-10-01 · `npm run boundary` flags `src/styles/`

**Page / component:** `scripts/boundary.mjs`

`ALLOWED` lists `src/pages`, `src/layouts`, `src/components`, two `src/lib` files and `public/`, but not `src/styles/`. `CLAUDE.md` gives Lilanga "everything under `src/pages/`, `src/layouts/`, `src/components/`, **and the styling throughout**", and `src/styles/design.css` — the design build's stylesheet — already lives there and predates the script.

The branch adds `src/styles/site.css`, which is where the cross-cutting rules of the 2026-09-30 round live (the mobile full-bleed utility, caption sizes, the `strong` weight, the menu overrides). `npm run boundary` therefore exits 1 on a branch that is entirely inside the frontend half.

**Asked for:** `/^src\/styles\//` in `ALLOWED`.

---
## #46 · open · 2026-10-01 · 2024 and 2025 galleries: the data the 2026 ones have

**Asked by:** the client's comments of 2026-09-30, galleries: "Is it possible to do the same for 2024 and 2025 as was done to 2026 for the galleries: automatize the instagram and website buttons, create the artists pages, caption all pictures, put the correct city (**not done in 2026 either**). This would make us win a lot of time if possible."

Relayed, not specified — this is an import job and the scope is yours. The client frames it as a time-saver rather than a must, so an estimate first would help us tell them what to expect. Note their aside that the city is wrong on 2026 as well, which is a smaller and separate fix.
