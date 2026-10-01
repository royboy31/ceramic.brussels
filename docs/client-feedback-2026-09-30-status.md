# The 30 September round, message by message — status on 2026-10-01

Each ask as the group sent it, and where it stands at the end of 2026-10-01
(`main = bdacf4e`, everything marked done is live on
ceramic-brussels.pages.dev). The round itself is written up in
`docs/client-feedback-2026-09-30.md`; the numbered entries live in
`docs/backend-requests.md`.

## Félicie — 14:59, "there still seems to be an issue in the VIP section"

| her words | status |
| :-- | :-- |
| about / lounge / hotel deal no longer match the Figma design | ✅ fixed overnight 30 Sept → 1 Oct, verified live |
| "Discover the Hoxton" has moved | ✅ back in the hotel column; it is a page field now |
| her "discover xx" buttons never appeared / vanished from preview | ✅ drawn from the event's Link on both programme groups |

## Léonie — 19:41–20:46, the full round

| her ask | status |
| :-- | :-- |
| pills keep the editors' capitals ("discover Puilaetco") | ✅ done (Lilanga) |
| "I have created a new « exhibition pass » page in Figma (inside the « programme » section)!" | ✅ built and live 1 Oct (#48, #36 merged in): `/en/programme/exhibition-pass/`, BPS22 + CID in as working examples. **Waiting on her real content and photographs** — Studio → Programme → Exhibition pass 2027 |
| mobile: photos full width, smaller captions, bigger gallery names | ✅ done (Lilanga, batches 1–4, on main) |
| gallery hover pill · press in four columns · press releases section · stories typography · mobile title sizes | ✅ done (Lilanga, batches 3–6, on main) |
| the photo beside each collectors' voices interview | ✅ done — code renders it, and all 6 stories carry their photo (checked 1 Oct, filled by Lilanga) |
| award pictures resizable / the empty award row | ⏳ Lilanga's queue |
| the two logos — best solo show, best booth | ⏳ **waiting on Léonie**, never sent |

## Tiphaine — 20:01, four asks and a question

| her words | status |
| :-- | :-- |
| "Remove the art prize laureates from the artists page" | ✅ done 1 Oct (#32): 165 → 129, only galleries' artists. One orphan found — "Connor Coulston", presented by nobody; ask whether it should exist |
| "First page when we click on galleries should be 2026 and buttons for 2025-2024", 2027 not visible | ✅ done 1 Oct (#33), live: 67 galleries, year row 2026 / 2025 / 2024, no 2027 pages. Announcement day = one tick on the 2027 edition |
| "Is it possible to do the same for 2024 and 2025 as was done to 2026" | ⏳ **waiting on Tiphaine** (#34): her pass on `scripts/data/exhibitors-2026-review.json` — 47 cities, 56 artist–gallery matches — unblocks all three years |
| "In awards, it is impossible to start a new line" | ✅ answered (#35): Outcome is one line by design; Description below takes paragraphs; the form says so now |
| "is it possible for us to change the name of the buttons (sub-sections)…?" | ✅ answered (#37) — **the reply is written and has never been sent.** Short version: menu label and tab label are theirs, the URL is ours |
| "The picture are still pixelated" | ✅ judged and closed 1 Oct (#49): the files are small at the source; everything recoverable was re-fetched. The per-gallery chase list is `docs/small-images-2026-10-01.md` — **needs sending** |
| "the figures still aren't clickable" | code ✅ since #25 — **content: 0 of 6 key figures has a link filled** |

## The balance

Everything code-shaped in the three messages is done and live. What remains
is in the group's hands:

1. **Two written answers sitting unsent** — #37, and the photo chase list.
   They cost nothing and unblock the most.
2. **Tiphaine:** the 2026 review file (blocks #34); fill the six key-figure
   links.
3. **Léonie:** exhibition-pass content and photographs; the two award logos.
4. **Lilanga:** award picture sizing and the empty award row; the
   exhibition-pass type-level finish.

Still open outside this round: #17 (VIP page documents — a content session),
#28 (exhibitors → awards content), #52 (the 2024/2025 automation estimate),
and the one-word decisions — deleting the 209 unreferenced assets (259 MB),
and making "Current edition" a real either/or tick.
