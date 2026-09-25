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
