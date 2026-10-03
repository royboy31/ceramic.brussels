# Launch meeting — October 01, 2026 (87 min)

Fathom recap of the call with Roy, Gilles, Tiphaine, Félicie, Léonie, Lilanga, Kamindu.
Full recording and verbatim transcript:
https://fathom.video/share/n_9zQzaxS_JezS8JkVc_BhcRSwFR7AgV
(`first-meeting.md` is the September 4 kickoff; this is the launch call.)

## The decision

**The site launches Monday, October 5**, in English and French. Dutch follows
post-launch, AI-translated once the French review has produced the list of
terms that must stay untranslated. Timeline:

1. Client finalises all English content by **EOD Friday Oct 3**.
2. Roy runs the AI translation to French over the weekend (with a glossary;
   gallery texts that were professionally translated are copy-pasted from the
   old site instead).
3. Client reviews the French on **Monday morning**, then launch.

New communication rule: the client pushes for an update on any task not done
within a day; the team acknowledges every WhatsApp with 👍 and marks
completion with a second emoji.

## Status — 2026-10-01 evening

Lilanga committed the launch fixes on his branch; his tip (`c393dbd`) is the
same work as the two commits cherry-picked onto main (`853fca9` footer pill
unified, `12764bb` past editions off + carousel + slideshow zoom), so main is
current and has been rebuilt — nothing on `lilanga` is still unpicked. That
closes three of the meeting's fixes (past editions, carousel width *and*
captions, slideshow zoom — the zoom was Lilanga's item and is done) and adds
three new items for Kamindu, folded into the checklist below: request #53
(retarget the 61 legacy rules, optional this week), the talks-tab Studio
link to remove before launch, and #52 (2024/2025 gallery data, post-launch
estimate). Everything else on the Kamindu list is still open.

## Status — 2026-10-01 night, the WhatsApp rounds arrived

The two WhatsApps the meeting was waiting on both landed in the Ceramic
Website group the same evening, and their tasks are folded into the
checklists below:

- **Félicie, afternoon** — the VIP pages are better but three alignment/
  styling leftovers remain, and the full **press & media** feedback came
  with three screenshots (press-release PDFs, the "Back to News" dead end,
  the too-tall article-photo frames, a duplicate "Press kit" button,
  interview pages, Collector's Voices to hidden draft). On the follow-up
  question she asked, Kamindu answered: **one interview template for all
  stories**, not one per interview.
- **Léonie, evening** — "TO TACKLE FOR MONDAY (by order of priority)", ten
  messages with screenshots and a screen recording. Four of her items were
  already answered by the evening's deploy, minutes after she filmed them:
  the galleries slideshows (same width, own height, caption on the photo),
  the swipe misalignment from the zoom effect, the gallery-page buttons
  leading into previous editions, and the footer "Previous editions"
  button. The rest is styling (mostly Lilanga) plus two Studio content
  edits and two Kamindu checks, all listed below.
- **The talks-tab Studio link closed itself**: an editor removed "Find the
  2026 talk programme here" while rewriting the talks page in the
  afternoon, before we got to it — verified gone from the published
  dataset, the drafts and the live build.
- **Félicie, late evening** (checked 2026-10-02 morning, nothing newer):
  Photo & Video page — resize the oversized first photo and auto-arrange
  photos by orientation in the CMS; and the Stories page stays **draft**
  for Monday (Léonie is building an interview template). Both acknowledged
  by Kamindu in the group.

## Status — 2026-10-02, Lilanga's branch answers Léonie's round

`lilanga` gained `c3cd500` (Léonie's list in full), `89a2cc5` (his own
plan, `PLAN-launch-2026-10-05.md`, plus the client's `changes.md`) and
`c6a8ad6` (FAQ questions in Medium, from a package already in the repo).
**All three were cherry-picked to `main` on 2026-10-02 night and are live
on production** (`649f369`), together with Kamindu's five tasks of the
same evening. `c3cd500` closes the whole Lilanga styling list below and
three items that sat on Kamindu's list:

- **the Hoxton logo** — not a CMS or query problem: the hotel branch of the
  partners layout never drew a logo at all; it has a slot now;
- **the two "Studio content" edits were code** — Léonore Chastagner's badge
  is the 2025 jury prize by rule (won one year, shown the next), and
  "La Cambre 100th" is renamed in all three locales.

Two of Léonie's asks bounce back to her (listed in his plan): the FAQ
Medium weight is blocked on a `noi-grotesk-500.woff2` the font set lacks
(asked twice), and the "two underline styles" are measurably one rule —
needs a reply, not a change.

## To-do — Kamindu

- [x] Exhibitors: remove every "Past editions" link/button (2026 exhibitors
      only) — **done, Lilanga's `12764bb` + `853fca9`, cherry-picked to main
      and rebuilt.** One switch: `PAST_EDITIONS_PUBLIC` in
      `src/components/launch.ts`; the old `/previous-editions/…` URLs answer
      a noindexed stub pointing at `/exhibitors/`, so the 61 legacy redirects
      keep resolving.
- [x] Exhibitors carousel: all images the same width, each its own height,
      caption 8px under its own picture, dots moved under the line —
      **fully done in `12764bb`** (`fit="width"` on `Slideshow`)
- [x] #53 (from Lilanga): **done 2026-10-02** (`7246cea` on main) — the
      redirect map reads `PAST_EDITIONS_PUBLIC` from the source and sends
      all 61 rules straight to `/exhibitors/` while it is off; one 301, no
      stub hop, verified on the branch preview and production. The stub
      *routes* stay until Lilanga's PR lands (his half of the file); flip
      the switch back and the rules re-aim themselves on the next build.
- [x] Studio content, before launch: remove the editor link "Find the 2026
      talk programme here" on the programme hub's talks tab — **done, an
      editor removed it rewriting the talks page on 2026-10-01; verified
      gone from dataset, drafts and the live build**
- [ ] #52 (post-launch, estimate for the client): give the 2024/2025
      galleries the data the 2026 ones have (Instagram/website buttons,
      artist pages, captions, cities — city is wrong on 2026 too).
      **Estimate (2026-10-02, measured against the dataset):** 134
      galleries (57 of 2024, 77 of 2025). None has a website or Instagram
      yet — both extract from the imported bios with the same script that
      did 2026. None has artist links — the 2026 pass matched ~73% by
      itself and left the rest to a review file. Captions: 2024 is
      essentially done (56/56), 2025 has ~15 galleries with uncaptioned
      pictures the legacy data cannot fill. Cities are all *set* but
      unreviewed, like 2026's were. **About one working day** to adapt and
      run the 2026 scripts over both years, producing a Tiphaine review
      file (likely ~100 rows of unsure artists/cities); captions beyond the
      legacy data and the review itself are editor time, not ours.
- [x] Artist detail page: fix the disappearing "Catalog" button — **done
      2026-10-02** (`49e3da6`): the band's catalogue tab only ever got the
      landing edition (the one with a catalogue) on `/exhibitors`; artists,
      awards and both gallery-detail routes got the 2027 edition or none,
      so the tab vanished off the list. Every band now carries the edition
      its galleries belong to; verified on all four page types.
- [x] Artist detail page: resolve preview-vs-live visual mismatch — **done
      2026-10-02** (same commit): the preview stega-encodes names, and an
      encoded "Kim Sang-man" missed the surname lookups, so the preview
      filed artists under other letters than live. Grouping now runs on
      stega-cleaned strings; verified side by side on the branch preview
      (drafts and published renders now group identically, names still
      click-to-edit).
- [x] Preview ↔ Studio linking is inconsistent — **diagnosed and fixed
      2026-10-02** (`d152d93`): a brand-new document (no draft, no
      published) was never reported to the top bar's Preview, which then
      claimed "Nothing open to preview" while the editor looked straight at
      the form — the "especially new pages" complaint. New documents now
      report themselves; Preview explains a page needs content and a slug
      before it has an address, and a new document's ⋯ menu shows a
      disabled "Open preview" with the reason. (The artists-page stega fix
      above removes the other half of the confusion.) Found along the way:
      the **Artists page main document has never been created** — the
      Studio's Artists → Artists page is an empty form; an editor should
      fill and publish it for the lead paragraph and SEO.
- [ ] Header: make the hardcoded nav button name editable in the CMS
- [ ] Press & media, per Félicie's WhatsApp (2026-10-01 afternoon, with
      screenshots):
      - press releases: a way to attach a **PDF** instead of typing the
        content onto a generated page (schema + query, a backend-requests
        decision)
      - the release page's "Back to News" leads to a News page "that comes
        out of nowhere" — fix the destination or drop the button
      - "As Seen in the Press": the white frame extends beyond the top of
        the article photo — shrink the containers
      - Press Room: remove the "Press kit" button (duplicate of the press
        reviews below)
      - Stories/interviews: "Read the interview" should open an interview
        page when the interview isn't elsewhere on the site — **one
        template for all stories** (answered in the group)
      - Collector's Voices: set to hidden draft (Studio content)
      - the menu doesn't match the submenus — check the press & media hub
        tabs against the nav
- [ ] VIP leftovers, per Félicie (after the 2026-10-01 fix round): "About"
      page's "Programme at and beyond the fair" section aligned fully left
      and its titles not underlined; "VIP Lounge" Aperitivo + Agenda
      sections left-aligned; "Hotel Deal": "The Hoxton" title still off the
      Figma, "€160/night, breakfast included" in a larger font
- [x] Hoxton partner logo is in the CMS but shows neither in preview nor on
      the site — **resolved in Lilanga's `c3cd500`**: the hotel layout
      never drew a logo; nothing wrong on the CMS/query side. Live once his
      PR lands.
- [x] Studio content for Léonie's round — **both turned out to be code,
      done in `c3cd500`**: the jury-prize badge shows the edition before
      the stand (Chastagner 2025, and Marie Pic 2026 in 2027), and
      "La Cambre 100th" renamed in all three locales. Live once his PR
      lands.
- [ ] Photo & Video page, per Félicie (2026-10-01 late evening, acknowledged
      in the group):
      - resize the first photo so it no longer takes the whole page — same
        dimensions as the photos below
      - arrange the photos automatically by format in the CMS: horizontals
        together on one line, verticals together on another, so nothing
        needs cropping
- [ ] Stories page: keep as **draft for Monday's launch** (Léonie is making
      an interview template; page stories won't be posted at launch) —
      agreed in the group, "will keep it as draft"
- [ ] Newsletter form on the FR site: save to Google Sheet + send the
      confirmation email; check the other languages too
- [ ] 301 redirects: take Roy's scrape of the 104 GSC-indexed legacy URLs,
      check them against the generated map (`scripts/legacy-redirects.mjs
      --doc` / `--check`), fallback for unmatched URLs = homepage
- [ ] SEO checklist before launch: sitemap, meta titles/descriptions, page
      titles, AI alt text for images (the `fill-seo.mjs` pass is still
      unapplied)
- [ ] Cutover tasks from the ledger, now dated Monday: remove the pages.dev
      noindex rule from `public/_headers`, run `--check` against the real
      domain, DNS switch
- [ ] Join Buzz (Roy sends instructions on WhatsApp); modify the WhatsApp
      bridge to save media to the server so Buzz can read images/videos

## To-do — others

- **Lilanga** — ~~homepage slideshow hover-zoom "glitch" on auto-advance~~:
  **done in `12764bb`** — rather than keeping the zoom across transitions,
  slideshows are left out of the hover zoom and the arrival animation
  entirely (cards and links keep both). Remaining: test shared Buzz agents
  (Codex, Jev) after onboarding; send WhatsApp image-reading instructions to
  the PWS team.

  **Styling from Léonie's 2026-10-01 "TO TACKLE FOR MONDAY" round** — all
  **done and ON MAIN since 2026-10-02 night** (`c3cd500` + `c6a8ad6`,
  cherry-picked as `739856f`/`649f369`, live on production): overview/
  floor-plan buttons off, the jury and contact & team body text back to
  the site's type, exhibition pass titles and dates, the about dots,
  partner website buttons, the three mobile tweaks, the full-width mobile
  sweep (audited at 390px on all eight pages), **and the FAQ questions in
  Medium** — he found the 500 weight in a package already in the repo, so
  nothing waits on Léonie's font file any more. **Correction of 2026-10-02
  (Kamindu, `15a2bff`/`4bec9e6`/`1a90e5b` on main):** re-measuring the
  sweep at 390px found two of the eight pages not actually reaching the
  edges — the art-prize pictures (the component's own margins beat the
  global pull: 25px of sideways scroll) and the VIP shot (the vip
  variant's spans kept eight phantom grid tracks alive, centring the
  photo on its cell). Both verified edge-to-edge on the branch preview;
  the art-prize bleed now lives in `ArtPrize.astro`, the image-text one
  in `ImageText.astro`. One item still needs a
  **reply to Léonie, not a fix**: the "two underline styles" she circled
  are measurably one rule. His remaining list is `PLAN-launch-2026-10-05.md`
  (now in the repo root): send the preview to Léonie/Tiphaine for the
  carousel and zoom sign-off, plus the frontend backlog (awards pictures,
  pill markers, two ~1020px overflows).
- **Roy** — oversee FR translation + glossary + request Tiphaine/Léonie
  review; scrape the 104 indexed URLs from Search Console; Buzz join
  instructions for Kamindu; email Gilles about the NL site issues (cart,
  invoicing, VAT, staging forms, prices).
- **Félicie** — ~~detailed WhatsApp with all Press & media changes~~:
  **arrived 2026-10-01**, folded into the Kamindu list above.
- **Léonie** — ~~prioritized design feedback to Roy/Lilanga/Kamindu~~:
  **arrived 2026-10-01** ("TO TACKLE FOR MONDAY"), split across the
  Kamindu and Lilanga lists above.
- **Client team** — English content final EOD Friday; FR review Monday
  morning.
