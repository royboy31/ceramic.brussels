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
| 3 | overview | "thinner underline, see Figma" on the highlights links | `Overview.astro`, 1px |
| 4 | overview | "make these 2 photos a slideshow, same as on guest of honour's « about » page, with 5 photos" | `Overview.astro` — the pair is now one `Slideshow` of up to five, two in view at a time |
| 5 | year band | "all these caps titles could be a little bit bigger" | `YearBand.astro`, 16 → 20px (14 → 16 on a phone) |
| 6 | exhibitors | filter buttons transparent, not white | `ExhibitorsListing.astro` |
| 7 | exhibitors | the heading read "exhibitors 2026 2025" | `ExhibitorHead.astro` — the menu label's own year is dropped before the page's is added |
| 8 | exhibitors | individual gallery pages grey, like the rest of the section | `[year]/[slug].astro`, `theme="ash"` on an archived year |
| 9 | exhibitors | no "artists"/"awards" on those pages; "galleries" becomes "← back to all exhibitors" | `ExhibitorHead.astro`, one pill behind the `archive` prop; the string is `exhibitors.backToAll` in all three locales |
| 10 | art prize | "make underline thinner for the laureates names" | `ArtPrize.astro`, 1px |
| 11 | art prize | "the sentence under each award should be body-text size" | `ArtPrize.astro`, `--body-*` |
| 12 | art prize | jury roles "the same text-style as all the other bold & caps ones throughout the website" | `ArtPrize.astro` `.role` — body size, 600, no extra tracking |
| 13 | art prize | jury instagram/website buttons "bigger, just like they are on the rest of the website" | `ArtPrize.astro` — the 15px override dropped, so `.pill`'s site tokens apply |
| 14 | norway focus | "when there's a link, the highlight should be black and the text white, and not yellow, to respect the « grey & black » codes of this section" | `PreviousEdition.astro`, keyed on `body.ash-page`, both mark/link nestings |
| 15 | norway focus | "underline thinner" on the galleries list | `Focus.astro`, 1px |
| 16 | norway focus | "the text explaining every talk should be body-text size" | `Focus.astro` `.talk .body` |
| 17 | norway focus | "« speakers » and « Moderator » subtitles should be the same style as the other bold & caps subtitles" | `Focus.astro` `.tag` |
| 18 | publication | "remove the « publication » button underneath the inserted publication" | `Publication.astro` |

Verified against the **built** output, not the dev server: every rule above
found in `dist`'s CSS, and every archived gallery page in all three
languages checked for its heading, its grey ground, its single pill, that
pill's left arrow and its href — 603 pages, with the landing year's 201
checked for the opposite. `npm run build` clean: 398 pages with the flag
off, 800 with it on.

## Not code — content, for an editor or a migration

| # | Ask | What is actually missing |
| :-- | :-- | :-- |
| 19 | "Add a jury prize 2024 filter, and add a « Damien Fragnon » page (Damien Fragnon was the laureate of the jury prize). You can also use the yellow « jury prize 2024 » logo on the photo on the main exhibitors page, as well as on its individual page." | The code is already there: the filter appears for any year that has an exhibitor with `kind: "jury-prize"`, labels itself from the edition year ("jury prize 2024" on the 2025 list), and `juryPrizeLockup` already resolves `jury-prize-2024.png`. What is missing is the **record**: Damien Fragnon exists only as an `artist` (`artist-damien-fragnon`), and 2025 has no jury-prize exhibitor at all. Needs an `exhibitor` for edition 2025, `kind: "jury-prize"`, with his images. |
| 20 | Gallery pages should keep the current edition's layout: "presents {artist}, {artist}" and the instagram and website buttons | `ExhibitorDetail` draws all three whenever the fields are set. They are empty on the past records — SPAX Projects has `artists`, `instagram` and `website` on its 2026 record and none on 2024 or 2025. This is the legacy import: the old CMS carried the handle inside the bio text. A pass over the 2024/2025 exhibitors is needed, or the data lifted from each gallery's own later record where the slug matches. |
| 21 | overview: five photos in the new slideshow | `edition.leadImages` holds two for 2025. Léonie is sending photos by email. |
| 22 | guest of honour: "make the blue image next to « AT TWILIGHT » text a slideshow of 5 photos" | Already a `Slideshow`; `guestInstallation.images` holds **one**. Four more photos, coming by email. |
| 23 | norway focus: "make the big image a slideshow" and "make the image a slideshow of 3 photos" under the talks | Both are already `Slideshow`s; `focus.images` and `focus.talkImages` hold one each. Photos coming by email. |

The talks themselves are still invisible on the 2025 focus tab: no event
carries `section == "focus"` (BACKEND-REQUEST #35), so items 16 and 17 are
written but cannot be seen until those events are tagged.

## Not started, by her own instruction

> **PROGRAMME** — Will get back to you later on these pages, we still need to
> decide what type of info we'll put there.
