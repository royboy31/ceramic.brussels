# The 2027 galleries: the switch, and what it takes with it

The client, 2026-10-27 evening: *"We have put the 2027 exhibitors in the cms.
Could you translate the pages in French and Dutch and do the switch on the
website so that the 2027 galleries now appear? We will announce it publicly
tomorrow afternoon so we will verify the translations tomorrow morning if
possible."*

Checked against the live dataset the same evening. Three separate jobs, of
very different sizes, and one of them is not in the request at all.

## The switch is one field, not a deploy

`showExhibitors` on the **edition** document decides it:

```
EDITION_SHOWN = (showExhibitors == true || isCurrent != true)
LANDING_YEAR  = newest edition that is shown, else the current one
```

A past edition always shows its galleries; the **current** edition shows them
only once `showExhibitors` is ticked. So this is an editor's tick in the Studio
on the 2027 edition, no code and no release - the publish webhook rebuilds
production by itself.

| year | isCurrent | showExhibitors | published galleries |
| ---: | :-- | :-- | ---: |
| 2027 | true | **false** | **63** |
| 2026 | false | true | 67 |
| 2025 | false | - | 78 |
| 2024 | false | - | 57 |

The records really are in, and published - nothing sits in drafts.

## The part nobody asked about: 2026 disappears

`src/pages/[lang]/exhibitors/[year]/[slug].astro` builds a past year's gallery
pages like this:

```js
const shown = PAST_EDITIONS_PUBLIC ? past : past.filter((p) => p.year === landingYear);
```

While previous editions are off - which is still the case on `main` - **only
the landing year's gallery pages are built at all.** Tick `showExhibitors` on
2027 and `landingYear` moves 2026 → 2027, so the 67 published 2026 gallery
pages stop being built.

They are live today. `/en/exhibitors/2026/a-iynedjian-fine-art-aifa26/` answers
200 on www.ceramic.brussels and 2026 gallery URLs are all through the
production sitemap (220 URLs, 536 references to `/exhibitors/2026/` counting
hreflang alternates). Tomorrow afternoon they would 404. No legacy redirect
covers an individual 2026 gallery - the map only sends `exhibitors/2026` to the
section listing - so there is nothing to catch them.

**So the 2027 switch and [[client-feedback-2026-10-26]]'s previous-editions
release are the same decision.** Turning `PAST_EDITIONS_PUBLIC` on at the same
moment keeps 2026 reachable, under `/previous-editions/2026/exhibitors` and its
gallery pages, and the year row offers it. Léonie's round is built, verified on
all 23 points and waiting only on her photos. This is the reason to finish it.

## The translations, measured

63 published galleries, counting the `bio` field, which is the only localised
text on an exhibitor:

| | have it | to do |
| :-- | ---: | ---: |
| English bio | 61 / 63 | 2 have none at all |
| **French bio** | **5 / 63** | **58** |
| **Dutch bio** | **9 / 63** | **54** |
| city | 63 / 63 | - |
| booth | 62 / 63 | 1 |
| instagram | 62 / 63 | 1 |
| website | 61 / 63 | 2 |
| listImage set | 8 / 63 | see below |

Two galleries have no English bio to translate from - **County Hall Pottery**
and **Vriend van Bavink Gallery** - so those need the client's copy first, in
any language.

**The list images were not the problem, and saying they were was a mistake.**
This file first claimed 55 of 63 galleries had no picture and that the
announcement would land on empty frames. That read `listImage` alone and never
read the query the cards are drawn from:

```groq
"image": coalesce(listImage, images[0])
```

A card falls back to the gallery's own first image, so **59 of 63 had a picture
all along** and the list looked right the moment it went up.

What the mistake did turn up is a real bug, older than this round. An editor can
fill a figure's alt text and credit and never attach the asset, which leaves
`listImage` a present-but-assetless object - and a present object is where
`coalesce` stops, so the fallback never ran. Three galleries were in that state,
Andreae with four usable images sitting behind the blank. Fixed in the
projection on 2026-10-28 (`select(defined(listImage.asset) => listImage)`,
kamindu `ef6aa83`, main `a4007bb`): 2027 goes 59 -> 62 cards with a picture and
2024-2026 keep all 199 of theirs.

**Galerie Michel Giraud is the one real gap** - no `listImage`, no `images` -
and it is the client's to fill.

## What this costs, in order

1. **Ask for one picture**, Galerie Michel Giraud's. That is the whole of the
   image problem, once the projection stopped stopping at an empty figure.
2. **Decide the previous-editions switch with it.** Either both go on together,
   or 67 live gallery pages 404 tomorrow afternoon.
3. **Translate 58 FR + 54 NL bios.** Mechanical, scriptable the way the
   2026-10-17 Dutch fill was ([[nl-retranslation]]: 809 fields written
   natively), reviewable by the client in the morning as they asked. Get the
   two missing English bios first.
4. **Tick `showExhibitors` on the 2027 edition** - seconds, once the rest is
   ready.

## One operational note

Those 63 records were edited between 2026-10-13 and **2026-10-27T15:50:55Z**,
and the production deploy hook fired 53 times today and 62 yesterday, every one
of them a full 800-page rebuild. That burst *is* this work. It is inside the
Workers Paid allowance (5,000 builds/month, ~600 used in October) and the
Sanity reads go through the CDN, so nothing is at risk - but a bulk translation
script must not publish 112 fields one at a time with the webhook armed. Turn
it off, write, turn it on, fire one deploy hook.
