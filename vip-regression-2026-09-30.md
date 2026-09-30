# VIP section: what changed, and why

**For:** Kamindu (cc Roy)
**From:** Lilanga
**Date:** 2026-09-30
**About:** the client's report of 2026-09-30 — layout changes on VIP about /
lounge / hotel deal, and CMS edits not showing on VIP programme.

---

## Summary

Nothing in the VIP layout code was changed. The last commits to `Vip.astro`
(2026-09-28) were cosmetic — lounge title spacing and one link hover class.

**What changed is content: three VIP `page` documents were published on
2026-09-29.** `Vip.astro` has a one-way switch that turns the designed layout
off the moment a tab has a page document, and the tab then renders the
editor's generic page-builder stack instead. That is the whole of issue 1, and
half of issue 2.

The client is right that their text edits did not cause this.

This *was* the plan (request #17) — but it was staged as drafts precisely so
that publishing would be a deliberate decision, and the seed script assumed
the switch would be visually identical. That assumption is the bug.

---

## The mechanism

`src/components/hubs/Vip.astro:127`

```js
const fromDesign = !page;
```

Every designed block on the VIP tabs is guarded by `fromDesign &&`. When a
`page` document exists for the tab:

- the bespoke frames (`.split-8-4 overview-row`, `.two-col closing`,
  `.two-col aperitivos`, `.group agenda`, the hotel panel) stop rendering;
- `src/components/hubs/Vip.astro:525` renders the editor's stack instead:
  `{hasSections && <PageSections lang={lang} sections={page.sections} />}`.

`src/components/vipContent.ts` states it in its header: *"creating that page
in the Studio switches the tab over to Sanity for good (`fromDesign` in
Vip.astro is the whole of it)."*

The designed layout and the generic blocks are **not** the same widths, which
is why the pages look bigger.

---

## Timeline

| When | What | Evidence |
| :-- | :-- | :-- |
| 2026-09-18 | Request **#17** — "the VIP tabs have no page documents" | `docs/backend-requests.md`, still marked `open` |
| 2026-09-24 07:54 | `scripts/seed-vip-pages-2026-09-24.mjs` writes 5 VIP pages + 8 events **as drafts** | `_createdAt` identical on all five |
| 2026-09-28 | Last `Vip.astro` changes — cosmetic only | `188eded`, `12617cd`; main at `0815c9f` |
| **2026-09-29 08:52** | **`page-vip-about` published + edited** (8 section blocks) | `_updatedAt` |
| **2026-09-29 10:02** | **`page-vip-lounge` published + edited** (6 section blocks) | `_updatedAt` |
| **2026-09-29 10:21** | **`page-vip-hotel-deal` published + edited** (1 section block) | `_updatedAt` |
| 2026-09-29 08:57–10:04 | 8 VIP event button labels changed to "discover …" | `event-2027-vip-*` |

Current document state:

```
page-vip-about          PUBLISHED   2026-09-29T08:52:03Z   8 sections
page-vip-hotel-deal     PUBLISHED   2026-09-29T10:21:24Z   1 section
page-vip-lounge         PUBLISHED   2026-09-29T10:02:14Z   6 sections
drafts.page-vip-programme   DRAFT   2026-09-24T07:54:31Z   no sections
drafts.page-vip-access      DRAFT   2026-09-24T07:54:31Z   no sections
```

---

## Issue 1 — "the sections and photos are now bigger and wider"

Affects exactly the three tabs whose pages were published: **about, VIP lounge,
hotel deal**. Verified by rendering each tab locally against Léonie's frames
in `ceramics-layouts/`.

### Hotel deal

- The frame puts **"discover The Hoxton"** in the right column, directly under
  the paragraph. It is now a `linksSection` block, and `PageSections` renders
  the stack *after* everything else — so the pill lands **bottom left, under
  the photo**. This is the "button has moved" the client reports.
- "The Hoxton" has lost its ruled panel-title styling; it is plain body text
  now, because it comes through `page.body` instead of the designed panel.

### VIP lounge

- Page height **3900px, against the frame's 2853px** (+37%).
- Agenda photographs render about **twice** the designed width: the designed
  row uses `sizes="… 30vw"` (≈432px at 1440), the generic image+text block
  renders ≈810px.
- **"scenography by MAD Brussels"** has dropped *below* the hero image instead
  of sitting beside it in the second column.

---

## Issue 2 — VIP programme buttons

Two separate causes produce the two symptoms, which is why it looks
contradictory. (One of them was misdiagnosed at first - see the correction
below.)

### "Hasn't updated on the website"

`page-vip-programme` is **still a draft** — never published. So the live tab is
still on `fromDesign`, taking its rows from the hard-coded `vipContent.ts`
with the old "book your visit" labels. Nothing typed in the CMS can reach it.

### "Buttons have disappeared completely from the preview"

Preview renders **drafts**, so there the draft page *does* exist →
`fromDesign` is false → the designed rows switch off → and the Sanity path
draws no button at all. Two independent reasons, both real:

**`Vip.astro` never draws a pill from `event.link` in the `!fromDesign`
branch.** Every `LinkPill` in the programme section sits inside the
hard-coded branch. Request #17 already listed this as a frontend leftover:
*"it draws no pill from `event.link` (#14, in the query)."*

**Correction, 2026-10-01.** This entry first gave a second reason - that every
event had a label and no URL. That was wrong, and it was my own query's
fault: I selected `link.url`, but the `link` schema stores an external
address in **`link.external`**, so it read back null for all ten events. The
links were complete the whole time. There is nothing for the editors to fill
here, and the one real cause is the missing pill, now written
(`LinkPill` on both the on-site and off-site rows). Verified: all eight rows
render their pill with its real address, e.g. "discover Charles Kaisin ↗" →
`https://www.surrealistdinner.com/`.

---

## Not a regression (checked)

Publishing the 8 VIP 2027 events did move `getProgramme` onto the 2027 edition,
as the seed script warned it would. The talks tab handles it properly: it shows
"The 2027 talk programme will be announced soon" with a link to the 2026
programme. 2027 has 0 talks, 2026 has 16. No action needed.

---

## Decisions needed

**1. Short-term: do we unpublish?**
Unpublishing `page-vip-about`, `page-vip-lounge` and `page-vip-hotel-deal`
returns the three tabs to the designed layout — instantly for lounge and hotel
deal (Worker-rendered), after a rebuild for about. The drafts keep the client's
09-29 text.

Trade-off: their 09-29 text edits stop showing on the site, because the tabs go
back to the hard-coded English in `vipContent.ts`. **Worth asking the client
which they prefer** — correct layout with older text, or current layout with
their text.

**2. Do not publish `page-vip-programme` yet.**
It would give the programme tab the same widening, and with no pill code the
buttons still would not appear.

**3. Real fix — the #17 frontend leftovers (Lilanga).**
Make the Sanity path render to the frames rather than to generic blocks, and
draw the pill from `event.link`. #17 lists three:

- `Vip.astro` prints `formatTime(startsAt)` where `whenText` (#15) should win;
- it draws no pill from `event.link` (#14);
- the hotel rate block still reads `C.hotelDeal.rate` rather than
  Site settings → Hotel deal (#16).

**4. Editors.**
The 8 VIP events need real URLs, not just labels. Until then no button can
render, on either path.

---

## How to reproduce the checks

Published documents (no token needed — the dataset is ACL-public):

```sh
curl -s -G "https://5hqzhin7.apicdn.sanity.io/v2024-01-01/data/query/production" \
  --data-urlencode 'query=*[_type=="page" && section=="vip"]{_id,_updatedAt,"sections":count(sections)}'
```

Including drafts (needs a token):

```sh
curl -s -G "https://5hqzhin7.api.sanity.io/v2024-01-01/data/query/production" \
  -H "Authorization: Bearer $SANITY_API_WRITE_TOKEN" \
  --data-urlencode 'query=*[_type=="page" && section=="vip"]{_id,_updatedAt}'
```

The locked tabs open without a code in `astro dev` (there is no Worker), so
`/en/vip/lounge/` and `/en/vip/hotel-deal/` can be compared with
`ceramics-layouts/ceramic brussels — VIP — *.png` directly on localhost.
