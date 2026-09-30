# Client feedback, 30 September 2026 — and the night that followed

Two rounds arrived in the Ceramic Website group on 30 September, and one
regression report before them. This is what was said, what was done that
night, and what is waiting in the morning.

## Where it stands

**On main = `40373e1`, all verified live.** Everything under "Done" below is
deployed and checked on the real site or the real preview, not inferred from
a build log.

---

## 1. Félicie, 14:59 — "there still seems to be an issue in the VIP section"

Her two points, and what caused them.

**Not a deploy. A switch in the code that an editor can flip by pressing
Publish.** `const fromDesign = !page` in `src/components/hubs/Vip.astro`: a
VIP tab rendered Léonie's frames from `src/components/vipContent.ts` *only
while it had no page document*. On 29 September she created and published the
About, Lounge and Hotel deal pages, and all three tabs switched to a CMS path
that was never finished. She had not touched the layout; she had pressed
Publish, and her instinct that the two should be unrelated was right.

| Her report | Done |
| :-- | :-- |
| About / Lounge / Hotel deal no longer match the Figma design | the blocks render in the frames' proportions (`vip` and `vip-panel` variants) |
| "Discover the Hoxton" has moved | back in the hotel column, above the rate panel; it is a page **field** now, not a block |
| Her "Discover xx" buttons never appeared | `event.link` is drawn on both programme groups — the field had been filled since 29 Sept and rendered nowhere |
| The buttons vanished from the preview | that and the above were the same missing renderer |

Also fixed on the way: `whenText` now wins over the formatted time (the
discovery tours event already carried the frame's "everyday — 11:00 / 16:00"),
and `page-vip-programme` was published, so the events are on the live site
and not only in preview.

## 2. Léonie, 19:41–20:46 — a full round

**Done:** the capitalisation ask — pill labels keep the editor's capitals, so
"discover Puilaetco" and "discover MAD Brussels" stop being lowercased.
`preserveCase` was already on `LinkPill` for exactly this; the three block
renderers now pass it.

**Backend, logged:** "exhibition pass", a new tab under programme
(docs/backend-requests.md **#36**), and the two logos she still has to send
(best solo show, best booth).

**Frontend, Lilanga:** mobile full-width photos and slideshows, smaller
captions everywhere, the gallery hover pill, bigger gallery names on mobile,
the HALL C rectangle, press "as seen in the press" in four columns, the press
releases section, press-agency and stories typography, the photo beside each
collectors' voices entry, mobile title sizes.

Two of hers look like backend and are not: **the collectors' voices photo**
(`story.image` already exists, it is only unrendered) and **the awards
pictures** (`award.images` exists, request #5 — the sizing is the Slideshow's
`fit` and the empty state is a render guard).

## 3. Tiphaine, 20:01 — four asks and a question

All backend. Logged as **#32** (laureates on the artists page), **#33**
(/exhibitors should open on 2026 — *needs a decision, two options*), **#34**
(2024 and 2025 filled in as 2026 was), **#35** (a new line cannot be typed in
awards — undiagnosed), and **#37**, her question about renaming menu buttons,
which is answered there and only needs sending.

---

## Also fixed that night, none of it asked for

- **Production could not build at all.** A robot token wrote
  `2024-01-23T18:00 (fr):00.000Z` onto a 2024 programme event at 10:27 UTC;
  it passes `defined(startsAt)` and then throws out of `formatTime`, which
  stopped the build at `/en/editions/2024/` — **7 files where a good build
  writes 774**. Cloudflare keeps serving the last good deploy, so for several
  hours nothing an editor published reached the site, with no sign of it
  anywhere they could see. Every date helper now prints nothing for a date it
  cannot read, `npm run dates` finds one, and the value is repaired.
- **The hotel deal's two paragraphs** are two fields: "Hotel description" is
  public (Visitors info prints it) and "Rate paragraph" carries `{code}`.
  Repurposing the one field had briefly printed the VIP code's placeholder on
  a public page.
- **"book your stay"** reads Site settings → Hotel deal → Booking link, and
  survives preview: it used to match the partner by name, and a preview
  render encodes that name, so the pill silently vanished there.
- **The rate line** is filled in the Studio, so the panel is editable.
- The lounge's heading sizes, the two heading levels the frames have, and the
  image sides — see below.

## Waiting in the morning

**Backend:** #32–#36, and #33 wants a decision before anything is built.

**The VIP lounge, against the frames** — measured, not guessed:

 - the aperitivos block is eight-and-four where the frame is half and half;
 - the frame's agenda rows lead with the picture at its own width;
 - "everyday — 17:30 → 19:00" has no field of its own, so it renders as body
   copy where the frame gives it `.event-when`;
 - `.panel-title` line-height: Figma says 42px on a 40px heading (node
   982:1027), the site computes 46px. One line, but it touches every panel
   title on the site, so confirm it against a second frame first.

**Two loose ends from the night:**

 - the lounge page has a draft that is now identical to the published
   document; publish it or discard it, either is safe;
 - nobody knows what ran at 10:27 UTC under a robot token. The guard means it
   cannot take the site down again, but nothing stops it corrupting another
   field.

**And a working note.** Four of the faults above were the same shape: a page
built out of blocks loses what the bespoke markup gave it, and the loss is
silent. When a VIP tab, or any page, is switched from scaffolding to the CMS,
the thing to check is not whether the text arrived — it is whether every
treatment the frame had still has somewhere to come from.
