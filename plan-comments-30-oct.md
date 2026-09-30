# Plan — client comments of 2026-09-30

**Source:** `comments-ceramics-30-oct.pdf` (12 pages, Word export with screenshots)
**New designs referenced, both present:**
`screenshot/ceramic brussels — programme — exhibition pass.png`,
`screenshot/ceramic brussels —about — contact-collaborators.png`

**Owner codes:** **L** Lilanga (frontend) · **K** Kamindu (schema, query, data,
import) · **C** client / editors (content) · **?** decision needed first

---

## Five things worth knowing first

**1. Three items are empty CMS fields, not bugs — and we are changing how that
looks.** Checked against the live dataset:

| Comment | Reality |
| :-- | :-- |
| "The figures at the bottom still aren't clickable" | `keyFigure.link` exists (#25) and `KeyFigures.astro` renders an `<a>` when it resolves. **None of the six has a link** |
| "Add the photo next to each collectors' voices interview" | `story.image` exists and `PressMedia.astro:203` renders it. **Neither story has an image** |
| ~~VIP "discover xx" buttons~~ | **Withdrawn 2026-10-01.** My query read `link.url`; this schema stores an external address in `link.external`, so it read null for all ten. The links were complete — the buttons were missing only because the component drew no pill, now written |

**Lilanga is filling these in the Studio** — no code needed for the content
itself.

**Behaviour change (L), so this stops recurring:** a pill whose label is set but
whose link is empty is currently dropped without trace, which reads as "the
button disappeared". It will instead be **drawn in preview and dev with a
visible "no link yet" marker, and still dropped in production** — the
`EditLink.astro` pattern (`astro dev`, plus `PUBLIC_SHOW_EDIT_LINKS=true` on
previews). Editors see the button and see why it is not live; visitors never
get a dead control.

**Not `href="#"`.** A pill that looks live and does nothing is a worse defect
than a missing one, it would be reported back by a real visitor, and it hides
the problem from the only person who can fix it.

**This does not by itself fix the VIP buttons.** They are missing for two
reasons, and the empty URL is only one: `Vip.astro` draws no pill from
`event.link` in the Sanity branch at all. That code has to be written either
way (Batch 5).

**2. About half the list is mobile, and there are no mobile frames.**
`.claude/skills/frontend-page/SKILL.md` says plainly: *"There are no mobile
frames. Keep pages usable below 1440px; do not invent a mobile design."* This
round is ~25 mobile-specific items, several art-directed to the pixel ("the
numbers can be a little bit bigger", "too close to the edge"). Either we get
mobile frames from Léonie, or we agree the screenshots in this PDF are the
spec and I work to those. **This is the single biggest question in the list** —
without it, every mobile item is me guessing and being corrected.

**3. Two cross-cutting rules close about ten individual items at once.**
The first two comments in the PDF are general rules: full-bleed photos on
mobile, and smaller captions + slideshow marks everywhere. Many of the
per-page mobile complaints are instances of those two. Do them first, then
re-check the per-page list — some entries will already be gone.

**4. The exhibition pass frame reorders the programme tabs.**
The frame shows `ceramic brussels x La Cambre · talks · award ceremony ·
exhibition pass`. Today the order is `talks · award ceremony · La Cambre`, and
**talks is the first tab, which means it is the hub root** — `/en/programme/`
*is* the talks page. Putting La Cambre first moves that URL. It also
contradicts backend request #8 ("the designer's order of 2026-09-17: talks
first"). Ask before building: is this a real reorder, or just how the mock was laid
the mock?

**5. Collaborators and the advisory-board website buttons need no schema work.**
`person` already has a `collaborator` group in `PERSON_GROUPS` and a `website`
field. Both are pure frontend. Good news — they looked like backend jobs.

---

## Decisions taken

Client is not being asked again; these are our calls.

| # | Decision | Reasoning |
| :-- | :-- | :-- |
| D1 | **The PDF screenshots are the mobile spec.** No mobile frames requested | The comments already art-direct to the pixel. I build to the screenshots and to the desktop frames' proportions, and take corrections on preview |
| D2 | **Keep talks first; add exhibition pass as the fourth pill** | The frame shows La Cambre first, but talks is the hub root — `/en/programme/` *is* the talks page, and the old site's `programme-69` redirects onto it. Moving it costs a URL for what is most likely an incidental mock ordering. Contradicts #8 too. Revisit only if it is raised again |
| D4 | **The galleries listing shows the most recent edition that has published exhibitors**, with year buttons for the rest | Gives "2026 first, buttons for 2025/2024" today and needs no per-year toggle: when 2027 is ready it appears by being published. Content-driven, no code change next time |
| D6 | **Diagnose the pixelated pictures, don't ask** | Likely the `SanityImage` width ladders or low-res legacy sources. First job in Batch 3 |

### Still open — for Kamindu, not the client

| # | Question |
| :-- | :-- |
| D3 | Exhibition pass: new document type, or reuse `programmeEvent`? Needed before the tab can be built |
| D5 | 2024/2025 gallery automation (Instagram, website, artist pages, captions, cities) — his estimate before we commit to it |

## Work plan

### Batch 1 — the two general rules (L)

Do first; re-check the per-page mobile list afterwards.

- Full-bleed photos and slideshows on mobile everywhere **except** jury and
  advisory board (the client names that exception explicitly).
- Smaller captions and smaller slideshow marks (`1/3`) everywhere.

Touches `SanityImage.astro`, `Slideshow.astro`, and the caption styling they
share, so it lands on every page at once. Check a sample per hub afterwards.

### Batch 2 — typography and weights (L)

Mostly token and style work, low risk, quick to review as one pass.

- FAQ: question weight → Medium; the Black-looking bold inside accordions →
  Bold or Semi Bold.
- One underline style for links in body text (there are currently two).
- Intro text size: guest of honour "about" and all Stories intros → match the
  guest of honour interview intro.
- Interview: quote bigger; "Marion Verboom" → intro size and letter-spacing;
  questions → italic, tighter letter-spacing, same weight; less gap between
  parts.
- Press agencies: names → Bold caps as used site-wide; "Sophie Carrée PR" etc.
  → body-text letter-spacing.
- Stories: "Marion Verboom", "Puilaetco", "Collect Magazine" → gallery-name
  styling; subtitles ("main partner") and dates ("DEC. 2026") → Bold caps.

### Batch 3 — behaviour and layout bugs (L)

- Autoplay slideshows keep playing on hover.
- Narrow window: the page title is hidden by the buttons on the right.
- Menu: narrower so it does not cover the "ceramic brussels" title.
- Homepage: less gap between news items.
- Award ceremony: push the "HALL C" chip off the hour.
- Laureates: captions stick together when swiping a slideshow (reported as
  happening site-wide — fix once in `Slideshow`).
- VIP about: allow capitals in pill labels ("discover Puilaetco"). Pills
  lowercase editor text today; `LinkPill` already has `preserveCase`, so this
  is applying it where the label is editor-written.

### Batch 4 — mobile, page by page (L)

Homepage (news photo-then-text order, key figures sizing, newsletter banner
underline pushing the arrow), menu (full width, gradient, tab and submenu text
size, logo in the close rectangle), galleries (name size), laureates (gap),
jury (body text full width, like the advisory board), contact & team (body
placement like advisory board), about (slideshow dots too near the edge),
photos & videos (full width), Stories (title sizes).

### Batch 5 — new builds (L, some gated)

| Build | Gate | Notes |
| :-- | :-- | :-- |
| Collaborators section on contact & team | — | `person` group `collaborator` + `website` already exist. Pure frontend |
| Website buttons on advisory board | — | Same placement as jury. `person.website` exists |
| Press releases section | — | `newsItem` with category `press-release`, `edition` done in #22. Section is not rendered yet; **no release item exists** (C) |
| "As seen in the press" → 4 columns | — | The client explicitly overrides their own Figma (3 columns) for this section only |
| ~~Photo beside each collectors' voices interview~~ | — | **Not frontend.** Already rendered; the photos are simply not uploaded (see finding 1) |
| Pill from `event.link` on the VIP programme | — | The missing code behind the "disappeared buttons"; see `vip-regression-2026-09-30.md` |
| "No link yet" marker on editor-set pills | — | Finding 1. Preview and dev only |
| **Exhibition pass tab** | **D3** | Added as the *fourth* pill (D2). New tab in `hubs.ts` (**K**), a content model (**K**), component (**L**). The biggest single item in this round |

### Batch 6 — galleries and awards

| Item | Owner |
| :-- | :-- |
| Hover pill on gallery covers: transparent fill, white stroke and text | L |
| Align gallery slideshow pictures to the top, not the bottom | L |
| Remove art prize laureates from the artists page | L |
| Awards: pictures resizable, as on gallery pages | L (`award.images` already exists) |
| Awards: allow no picture at all (see "best group show") | L — check what renders when empty |
| Awards: cannot start a new line | L or K — `award.description` is `localeBlock`, so Enter should make a paragraph. Needs diagnosis |
| 2027 galleries hidden, default view 2026, buttons for 2025/2024 | L — per D4: show the latest edition that has published exhibitors |
| Automate 2024/2025: Instagram + website buttons, artist pages, captions, correct city (2026 cities also wrong) | K — **D5** |
| Two logos still to send: best solo show, best booth | C |

---

## To go to Kamindu as backend requests

1. **Exhibition pass** — a fourth tab in `src/lib/hubs.ts` plus a content model
   for the partner-institution exhibitions (**D3** first). Tab order is
   unchanged, so no URL moves.
2. **2024/2025 gallery data automation** (**D5**) — the largest data job here,
   and the client frames it as a time-saver rather than a must.

That is all. D2 and D4 were resolved without needing him.

## Waiting on the client (assets, not questions)

1. **The two logos** — best solo show, best booth. Still to be sent; nothing
   to build until they arrive.
2. **A press release item.** The section can be built, but there is no
   `press-release` news item in the dataset yet, so it will render empty.

Nothing else goes back to them. "The filters now look perfect" is logged here so
it is not re-opened.

---

## Sequencing

Batch 1 first, because it deletes work from Batch 4. Then Batch 2 and 3
together as one review pass — small, visible, and they let the client see
movement quickly. Batch 5's unblocked builds (collaborators, advisory board
buttons, press releases, the VIP pill, the "no link yet" marker) can run in
parallel with Batch 4. Exhibition pass last, once **D3** is answered, because
it needs Kamindu.

The VIP work in `vip-regression-2026-09-30.md` is separate and should be
decided before any of this — it is a live regression, this list is refinement.
