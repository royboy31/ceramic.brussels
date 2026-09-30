# Client comments of 2026-09-30, batches 1–4 (and the previous-editions section)

Twelve commits. **Two separate bodies of work** — worth reviewing as such:

- `2c9f9cb`…`cb3e4be` — the **previous editions** section (seven tabs, three
  years), built earlier and not yet on `dev`.
- `68f1212`…`f45c523` — **batches 1–4** of the client comments of 2026-09-30
  (`comments-ceramics-30-oct.pdf`). Plan and running order in
  `plan-comments-30-oct.md`.

Build: 812 pages, 139 Sanity requests, redirects and sitemap post-processing
all clean.

---

## Batches 1–4

**Batch 1 — the two general rules** (`68f1212`). Photos run edge to edge below
700px via a new `.bleed-m`; `Slideshow` takes it by default, `SanityImage`
opts in. The one exception the client named — jury and advisory board — needs
no opt-out, because those portraits come through `PersonCard`. Captions and
slideshow marks smaller on a phone (12px / 15px against 15 / 22).

**Exhibitor lockups** (`95597fe`). Léonie's round 2: norway focus and the
jury prize ovals for 2024–26. The España test was written into three files;
it is a table now (`src/components/exhibitorBadges.ts`). 2025 shows 5 Norway
lockups where it printed words, 2026 shows the jury prize oval where it had a
text disc. Anything without artwork still falls back to words.

**Batch 2 — typography** (`9d8a0ff`, `1899af5`, `29888c0`). Three new tokens
beside the existing `--body-*`: `--intro-*` and `--name-*`, because the client
anchors items to "the same size as the interview intro" and "the same as the
galleries names" repeatedly. Bold in rich text was rendering **Black** site-wide
— the browser's `strong` is 700 and the site ships no 700 face, so it fell
through to 900.

**Batch 3 — behaviour** (`af41a05`). Autoplay keeps running under the pointer;
one caption at a time in slideshows; editors can capitalise a pill again; the
menu no longer covers the wordmark (it did at *every* width); and the header
collision is French-only — "partenaire principal" against "main partner".

**Batch 4 — the phone** (`f45c523`). Menu full width with the wordmark in the
close bar and bigger type; the jury biography full width under the portrait;
the laureate gap 86 → 48.

---

## Three findings that are not code

1. **Three "still broken" items are empty CMS fields.** No key figure has a
   link, neither collectors' voices story has an image, and all eight VIP
   events have a label with no URL. The fields exist and the code renders
   them. Lilanga is filling these.
2. **The pixelated pictures are source resolution.** Traced end to end: a
   picture asking `w=600` is delivered at 600 natural. Of 1,549 image assets,
   **424 are under 1500px wide**, 145 under 1000, smallest 258×344 — the
   legacy imports. Needs a re-import or the originals, not CSS.
3. **The menu gradient is already identical on mobile.** Percentage stops
   scale with the row. What differs is how much screen it covers. Making it
   lighter on a phone is a design decision (middle stop 52% → ~70%).

## Outstanding

**From Léonie:** the best solo show and best booth logos;
`noi-grotesk-500.woff2` (the FAQ "Medium" is declared and inert without it);
an italic face if the interview questions should not be a synthesised oblique.

**From Kamindu:** the exhibition pass content model (plan D3); an estimate for
the 2024/2025 gallery automation (D5). Note `npm run boundary` flags
`src/styles/site.css` — `^src/styles/` is not in its allowlist although
CLAUDE.md gives Lilanga "the styling throughout", and `design.css` predates
the script. One line in `scripts/boundary.mjs`.

**Backend-half files on this branch** are the previous-editions ones already
recorded as a Note in `docs/backend-requests.md` (2026-09-30).

## Known, not introduced here

The A–Z filter row on the exhibitor lists overflows horizontally at about
1020px. Verified against a clean tree; it predates these commits and is not in
the client's list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
