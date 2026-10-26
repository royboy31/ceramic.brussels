# Previous editions — Léonie's round, 2026-10-26

Six WhatsApp messages in the *Ceramic Website* group, 16:50–16:59, with
thirteen annotated screenshots. Her framing:

> Here is (finally) my feedback on the previous editions section on ceramic
> brussels website. I'm referring to the « 2025, second edition » part since
> that's the template version I had made in Figma (but the changes should be
> made for all 3 previous editions of course).

So every item below is written against 2025 and applies to 2024 and 2026 too,
which it does by construction: the seven tabs are one set of components
rendering any year (`docs/previous-editions-plan.md`).

**The section is still off for the public** (`PAST_EDITIONS_PUBLIC` in
`src/components/launch.ts`), and on for the branch it is reviewed on. These
changes are in place for when it comes back; nothing here reaches a live
page while the flag is false on main.

**Two of the items are gated on more than the flag.** The grey ground and
the one back pill apply to a gallery of an **archived** year, which is not
the same as any year-numbered address. 2027 is the current edition but does
not show its galleries yet, so `/exhibitors` is 2026's list and its cards
link to `/exhibitors/2026/<slug>`. Those are the pages a reader means by
"the current edition pages" — the very thing the grey is meant to tell them
apart from — and greying them would also strand them, since the one pill
leads into a section they never entered. So `[year]/[slug].astro` compares
the year against `exhibitorEditions(editions).landingYear` and passes
`archive` down: 2026 keeps its white page and its full band, 2025 and 2024
are the archive. When 2027 opens its exhibitors the landing year moves with
it and 2026 joins them, with no edit. The heading fix is not gated — it is
right for every year.

## Done

| # | Tab | Ask | Where |
| :-- | :-- | :-- | :-- |
| 1 | overview | "make this button rectangle, not pill-shaped" — the footer's `← back to 2027` | `Footer.astro`, `.footer-back` |
| 2 | overview | "move the credits next to the « back to 2027 » button, on its right … same size as on ceramic basel website" | `Footer.astro`, `.has-back .footer-credit` — left-aligned, and ceramic-basel's own credit clamp |
| 3 | overview | "thinner underline, see Figma" on the highlights links | `Overview.astro`, **2px**, measured off node `1448:607` |
| 4 | overview | "make these 2 photos a slideshow, same as on guest of honour's « about » page, with 5 photos" | `Overview.astro` — the pair is now one `Slideshow` of up to five, two in view at a time |
| 5 | year band | "all these caps titles could be a little bit bigger" | `YearBand.astro`, 16 → **24px**, the frame's own size (node `1462:1889`); 14 → 18 on a phone |
| 6 | exhibitors | filter buttons transparent, not white | `ExhibitorsListing.astro` |
| 7 | exhibitors | the heading read "exhibitors 2026 2025" | `ExhibitorHead.astro` — the menu label's own year is dropped before the page's is added |
| 8 | exhibitors | individual gallery pages grey, like the rest of the section | `[year]/[slug].astro`, `theme="ash"` on an archived year |
| 9 | exhibitors | no "artists"/"awards" on those pages; "galleries" becomes "← back to all exhibitors" | `ExhibitorHead.astro`, one pill behind the `archive` prop; the string is `exhibitors.backToAll` in all three locales |
| 10 | art prize | "make underline thinner for the laureates names" | `ArtPrize.astro`, **2px**, measured off node `1457:1403` |
| 11 | art prize | "the sentence under each award should be body-text size" | `ArtPrize.astro`, `--body-*` |
| 12 | art prize | jury roles "the same text-style as all the other bold & caps ones throughout the website" | `ArtPrize.astro` `.role` — body size, 600, no extra tracking |
| 13 | art prize | jury instagram/website buttons "bigger, just like they are on the rest of the website" | `ArtPrize.astro` — the 15px override dropped, so `.pill`'s site tokens apply |
| 14 | norway focus | "when there's a link, the highlight should be black and the text white, and not yellow, to respect the « grey & black » codes of this section" | `PreviousEdition.astro`, keyed on `body.ash-page`, both mark/link nestings |
| 15 | norway focus | "underline thinner" on the galleries list | `Focus.astro`, **2px**, as the other two |
| 16 | norway focus | "the text explaining every talk should be body-text size" | `Focus.astro` `.talk .body` |
| 17 | norway focus | "« speakers » and « Moderator » subtitles should be the same style as the other bold & caps subtitles" | `Focus.astro` `.tag` |
| 18 | publication | "remove the « publication » button underneath the inserted publication" | `Publication.astro` |

Verified against the **built** output, not the dev server: every rule above
found in `dist`'s CSS, and every archived gallery page in all three
languages checked for its heading, its grey ground, its single pill, that
pill's left arrow and its href — 603 pages, with the landing year's 201
checked for the opposite. `npm run build` clean: 398 pages with the flag
off, 800 with it on.

## Checked against the Figma frames

She wrote "see Figma" on the underline, so the frames were measured rather
than guessed (`Previous editions` on page `0:1`; overview `1405:650`, art
prize `1457:1217`).

| What | The frame says | What we do |
| :-- | :-- | :-- |
| Underlines | **2px** solid under both the 32px highlights and the 40px laureates | 2px. 1px, tried first, was half the design; the browser's `auto` is about half again as thick, which is what she was looking at |
| Year band caps | Noi Grotesk Fix **24** | 24px |
| `← back to 2027` | 166 × 37, **corner radius 0**, 1px inside stroke | `border-radius: 0` |
| The footer credit | **not in the frame at all** | which is why she gave ceramic-basel as the size reference, and why that site's own clamp is what we use |
| The overview pictures | `Frame 3`, 2052 wide inside a 1440 frame: three 670 × 447 pictures at x 0 / 710 / 1429 — a row that runs off the right edge | a slideshow with 40px gaps and slides at `(100% - 40px) / 2`, which is 670 at the section's width. The frame *is* a two-up scrolling row |
| Jury roles | the shared text style **"Body — CAPS BOLD · 24/30"** | the site's own bold & caps, 22/30 — she asked for "the same text-style as all the other bold & caps ones throughout the website", and the site's body is 22px. The 2px gap to the frame is site-wide and predates this round |
| Award sentences | 24px | `var(--body-size)` = 22px, same reason |
| Jury instagram/website | 129 × 31, smaller than the site's pill | the site's `--pill` tokens: she asked for "bigger, just like they are on the rest of the website", which overrides the frame |
| Laureates list | 40px on a 62.7px pitch | ours is 36px on ~51px. **Not flagged by her**, left alone, noted here |

**The other four frames, checked the same way** (guest of honour
`1449:626`, exhibitors `1449:968`, norway focus `1457:1513`, publication
`1462:1982`):

- **Guest of honour.** The picture beside the AT TWILIGHT essay is drawn as
  a slideshow already - half width, one at a time, with its dots and a
  `1/5` counter. That is what the component does; only the photographs are
  missing.
- **Exhibitors.** The filter pills measure 215-219 against a 217 page, so
  they are transparent on the grey, which is what she asked for and what we
  now draw. The ground samples **#D9D9D9**, confirming the ash theme. The
  row's order - solo show, norway focus, publishers, jury prize 2024,
  awards - is exactly `FILTER_ORDER`'s for a past year. And the frame draws
  **both** the "jury prize 2024" pill **and** a Damien Fragnon card carrying
  the yellow badge, so request 19 below is the design's intent, not an
  afterthought.
- **Norway focus.** Pictures left, galleries right (the frame's 907/433),
  then the talks two across with a `1/3` slideshow taking a cell of the same
  grid - the layout we render. MODERATOR and SPEAKERS carry the shared
  "Body — CAPS BOLD · 24/30" style, the same one the jury roles use.
  **"Norwegian Crafts" carries no highlight in the frame at all**, only an
  underline; her note is about what an editor's Highlight should look like
  here, not about restoring something the design has.
- **Publication.** Lead, reader, footer. No button under it, which is the
  removal. (Its reader is about 2:1 in the frame where ours is 16:10 - not
  raised by her, left alone.)

There is no frame for an individual gallery page in the section, so items 7
to 9 are her words alone.

## Content — two done on 2026-10-27, three still with the client

| # | Ask | What is actually missing |
| :-- | :-- | :-- |
| 19 | **DONE.** `scripts/add-fragnon-jury-prize-2025.mjs` created `exhibitor-2025-damien-fragnon` - the artist referenced, `kind: "jury-prize"`, countryCode FR. No code change was needed: the pill now reads "jury prize 2024" on the 2025 list and the card and his page carry `jury-prize-2024.png`, because the prize is won the year before it is shown. **Its two pictures are his 2024 prize works** (from `laureate-2024-damien-fragnon`, captions and photographer intact), not photographs of a 2025 stand, and booth, city and a description are not invented - all four are for the client. |
| 20 | **PARTLY DONE.** `scripts/backfill-past-exhibitor-links.mjs` filled `instagram` and `website` on **45 of 134** past records: 7 read off the link paragraph the import left at the foot of their bio, 38 taken from the same gallery's 2026 or 2027 record, where the handle and address are the gallery's own and do not change with the year. The remaining 89 have neither and need the client. **Artists were deliberately not touched** - they are per-year, nothing in `legacy-export` carries the real lists, and copying 2026's references back would be a factual error; 115 bios name them in prose, which is a guess, not data. **Still open:** on those 7 records the links now appear twice, as pills and as that bio line. `--strip-bio` removes the line (and writes `legacy-export/backups/` first) but it edits published prose, so it has not been run. |
| 21 | overview: five photos in the new slideshow | `edition.leadImages` holds two for 2025. Léonie is sending photos by email. |
| 22 | guest of honour: "make the blue image next to « AT TWILIGHT » text a slideshow of 5 photos" | Already a `Slideshow`; `guestInstallation.images` holds **one**. Four more photos, coming by email. |
| 23 | norway focus: "make the big image a slideshow" and "make the image a slideshow of 3 photos" under the talks | Both are already `Slideshow`s; `focus.images` and `focus.talkImages` hold one each. Photos coming by email. |

The talks themselves are still invisible on the 2025 focus tab: no event
carries `section == "focus"` (BACKEND-REQUEST #35), so items 16 and 17 are
written but cannot be seen until those events are tagged.

## Not started, by her own instruction

> **PROGRAMME** — Will get back to you later on these pages, we still need to
> decide what type of info we'll put there.
