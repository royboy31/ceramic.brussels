# Plan — the launch of Monday 2026-10-05

Updated 2026-10-02, after Léonie's round of 2026-10-01 (`c3cd500`).

## What is done

**This afternoon** (`c393dbd`): previous editions off behind one switch
(`PAST_EDITIONS_PUBLIC` in `src/components/launch.ts`), the galleries
carousel at one width with each picture's own height, and the swipe/zoom
misalignment - the three things `changes.md` called "to tackle for Monday".

**This evening** (`c3cd500`), Léonie's list in full:

- the jury and contact & team biographies back to the site's body type (a
  regression of my own, from moving them out of the text column on 09-30);
- every photograph on the eight pages she named reaching both screen edges
  on a phone, audited at 390px before and after;
- the about hero's slideshow dots centred on the picture rather than 17px
  right of it;
- the laureates' slideshows one width, each picture its own height;
- the year row and the "overview" and "floor plan" buttons off the galleries
  page, and nothing anywhere linking into previous editions;
- Léonore Chastagner's badge the 2025 jury prize (the prize is won one year
  and shown the next);
- "La Cambre 100th" in all three locales;
- the exhibition pass's titles at intro size, its dates in the bold caps of
  "DAY TICKET";
- a "website" button on every partner card, and **the Hoxton's logo**, which
  that layout never drew;
- the dates mark smaller on a phone, no focus ring on the menu's ×, and a
  tighter gap between the Hoxton spotlight and the newsletter band.

## 1 · Before Monday

| # | What | Who |
| :-- | :-- | :-- |
| 1 | **Open the PR `lilanga` → `main`** (not `dev`: it is 52 commits behind and holds nothing of its own) and check the branch preview | L |
| 2 | **Advisory board websites: 0 of 7 filled.** `person.website`; the pill draws itself once one is there | editors |
| 3 | **Collaborators band**: the `collaborator` group still holds legacy imports, not the four on Léonie's frame | editors |
| 4 | **Send Léonie and Tiphaine the preview** - `changes.md` asks for the carousel and the zoom to be confirmed with them | L |
| 5 | **The two award logos** (best solo show, best booth), still not sent | client |

## 2 · Waiting on Léonie

- **`noi-grotesk-500.woff2`** - the FAQ questions carry `font-weight: 500`
  and will render Medium the moment the face exists. Asked twice now.
- **"Only one underline style for links"** - measured on the live page: both
  links she circled are the same rule (1px, 0.12em offset). What differs
  above is the rule closing the lead paragraph, which falls right under that
  link. Needs a word back, not a change.
- **Press clippings and partner logos** keep their inset on a phone - a
  clipping is a bordered card and the logo has a slot. Say if those should
  go full width too.

## 3 · Straight after launch

- Flip `PAST_EDITIONS_PUBLIC` back to `true`.
- **#53**: while it is off, 61 of the old site's rules go through a stub
  page; retargeting the map at `exhibitors` would let the routes and
  `EditionHidden.astro` go.
- Drop the `X-Robots-Tag: noindex` on `ceramic-brussels.pages.dev`
  (`public/_headers`) at cutover.

## 4 · Frontend backlog

Awards: pictures resizable, and an award with no picture at all. The "no link
yet" marker on an editor-set pill. Two ~1020px overflows (the A-Z filter row,
the team cards). The jury-prize icon swap, waiting on her file. Léonie's
"first text" / ABOUT notes, which exist only in `ceramics-new.pdf`.

## 5 · Kamindu

Open on `main`: **#17** (VIP tab pages), **#28** (exhibitors → awards
content), **#34 / #52** (2024 and 2025 galleries, the same job twice),
**#47** (2025 exhibitor cards have no pictures), **#53** (the legacy map).
