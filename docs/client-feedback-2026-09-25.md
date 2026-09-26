# Client feedback of 2026-09-24 and 2026-09-25

WhatsApp group "Ceramic Website". Léonie (design), Tiphaine (content),
Félicie (editor). Status as of 2026-09-26 morning, main = 0573ac0.

Status: `done` (on main) · `open` · `answer` (needs a reply or a decision,
not code) · `waiting` (on the client).

Owner: L = Lilanga (frontend), K = Kamindu (CMS, queries, content).

## Léonie · 2026-09-25 19:00

| # | Item | Status | Owner | Where |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Header, mobile: wordmark distorted when the window shrinks | done | L | 7b830e9 |
| 2 | Homepage: small gap between text and the underline on arrow links | done | L | 7b830e9 |
| 3 | Exhibitors: the dev link shows the 2027 galleries, 2026 only through the artists list | done | K | 2027 is the current edition, 2026 is at `/exhibitors/2026`. The old site's year row ("→ 2026 → 2025 → 2024") is back on every list as pills under the A-Z, the year being read filled acid (kamindu, 2026-09-26). Neither the Figma frame nor the old site switches the list to the next edition before it has galleries; the 11 demo 2027 galleries are what makes the current list look wrong, and unpublishing them is a Studio decision |
| 4 | Exhibitors: "search by country" with full country names | done | L | 9f5c2b3 |
| 5 | Artists list: bigger "solo show" icon | done | L | 9f5c2b3 |
| 6 | Artists list: "focus España" icon next to the solo show one | done | L | 9f5c2b3 |
| 7 | Artists list: booth number | done | L | 9f5c2b3 (follows the gallery of this edition, else the most recent) |
| 8 | One gallery page layout; instagram and website pills always under the city | done | L | 9f5c2b3 |
| 9 | Exhibitors 2026: remove "overview" and "floor plan" | done | L | 9f5c2b3 |
| 10 | Artists list, mobile: capital letter overlaps its rule, list starts further right, A-Z row without horizontal scroll | done | L | 9f5c2b3 (A-Z is two rows of thirteen) |
| 11 | "Jury prize" icon in the artists list and on the exhibitors page | waiting | L | She will send the file. The code already marks jury-prize galleries with a text badge (`kind === 'jury-prize'`), so it is a swap |
| 12 | Programme, mobile: tabs stack instead of being cut off, on every hub | done | L | 7770f0e (HubNav wraps) |
| 13 | Programme, desktop: open accordion content one column narrower | done | L | 7770f0e (four of six columns) |
| 14 | FAQ: section titles in the awards page's style | done | L | e088105 |
| 15 | FAQ: exhibitors-style pill filters with a × to deselect | done | L | e088105 |
| 16 | Contact & team: "subscribe to our newsletter" as a pill with → | done | L | 0baa0b2 |

## Tiphaine · 2026-09-25 19:10

| # | Item | Status | Owner | Where |
| :-- | :-- | :-- | :-- | :-- |
| 17 | Photos still pixelated | open | K | Not investigated. Cards ship a srcset to 1200px, so probably source quality: old-site resizer fallbacks (`legacy-export/unrecoverable-images.json`, `--max-width=2500` pass) or small editor uploads. Ask which pages |
| 18 | Translations: automatic inclusive French (lauréat → lauréat·e) | answer | K | Translation-workflow question. Decide whether a translation pass exists to hook into, then reply |
| 19 | Translations: a list of words that stay in English (Awards, Art prize, Advisory board) | open | K | Tab labels are `STRINGS` in `src/lib/i18n.ts` (all three locales); content wording is the editors' |
| 20 | Exhibitors: a separate preview image for the gallery list instead of the first slideshow photo | open | K → L | New `exhibitor` field + `queries.ts` + `ExhibitorCard.astro`. No backend request logged yet |
| 21 | Exhibitors: slideshows adapt to each image's shape (portrait stays portrait, landscape stays landscape) | open | L | `Slideshow.astro` fixes one aspect. No request logged |
| 22 | Focus Spain logo on the gallery detail pages, like the solo show one | open | L | `ExhibitorDetail.astro` shows solo show or jury prize only; the list got it in 9f5c2b3 |
| 23 | Art prize: the white menu bar's top turns yellow in the art prize section | open | L | `Header.astro` / `Base.astro` theme `acid` |
| 24 | Her video at 19:13 | open | K | Could not be viewed: the WhatsApp bridge's media download fails. Ask her what it shows |

## Still open from 2026-09-24

| # | Item | Status | Owner | Where |
| :-- | :-- | :-- | :-- | :-- |
| 25 | Exhibitors → awards: the page's content (intro, photos) | open | editors | `docs/backend-requests.md` #28 |
| 26 | Key figures: links on each figure, "15 countries" → "50k Instagram followers" | open | editors | Field shipped in #25; the values are content |
| 27 | Menu label "contact & team" | open | editors | Menu and footer in the Studio |
| 28 | 2026 exhibitors: 47 cities still "Brussels", 56 unsure artist names | waiting | Tiphaine | `scripts/data/exhibitors-2026-review.json`; re-run `scripts/fix-exhibitors-2026.mjs --apply` after her review |
| 29 | Léonie's "first text" and ABOUT feedback | open | L | Only in the PDF `ceramics-new.pdf` Lilanga has; never posted to the group |
| 30 | Tiphaine's art prize question (which page to edit) | done | K | Answered 2026-09-25 12:42: "Art prize page", first entry of the Art prize folder |

## Shipped on 2026-09-25 for Léonie's 24 Sept round

Art prize header gradient, bold country exponents on the jury, awards last,
website and instagram pills on jury members, partner names as links with the
website buttons gone, VIP button, practical-info button widths, FAQ body
size, /contact merged into "contact & team": Lilanga's fa74a1b, requests
#25-#29, Kamindu's Studio contact cleanup db7a88f. Tiphaine's 2026
exhibitors ask (links out of the bio, captions, artists, cities): 82539a7 +
7d449c4, applied on 2026-09-25 06:22 UTC.
