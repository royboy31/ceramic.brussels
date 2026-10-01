# Kamindu — the backend side of the 2026-09-30 round

**From:** Lilanga · **Date:** 2026-10-01

Read this first, then the files it points at. It is written so you can hand it
to a Claude Code session in this repository ("read KAMINDU-START-HERE.md and
follow it"), the way `docs/frontend-kickoff.md` works on my side.

Nothing here needs me. Everything is either a numbered request in the file you
already work from, or a decision only you can make.

---

## 1. One live regression, decide before anything else

**`vip-regression-2026-09-30.md`** — the VIP about / lounge / hotel-deal tabs
stopped matching Léonie's frames on 2026-09-29. Not a code change: publishing
those three `page` documents flipped `fromDesign` in `Vip.astro`, which
switches the bespoke layout off and renders the editor's generic block stack
instead.

The file has the mechanism, the timeline with `_updatedAt` evidence, the
measurements, and the reproduce commands. It ends with four decisions. The
first one is time-sensitive because the client is looking at it now:
**unpublish those three pages and lose their 09-29 text, or leave the layout
wrong until I rebuild the Sanity path to the frames.** That is a question for
the client, not for us, but it needs asking today.

Do **not** publish `page-vip-programme` yet — it would do the same to the
programme tab, and the buttons still would not appear.

## 2. Five requests, in the usual place

`docs/backend-requests.md`, entries **#48–#52**, house format, all `open`:

| # | What | Size |
| :-- | :-- | :-- |
| #48 | Exhibition pass: a fourth programme tab and a document type for the institutions' exhibitions. Field list derived from the frame is in the entry | the big one |
| #49 | The pixelated photographs: **not** a frontend bug, the sources are small. Numbers, and a breakdown by document type | needs your judgement |
| #50 | The Studio still offers "Past editions" as `editions` | one rename |
| #51 | `npm run boundary` flags `src/styles/`, which is mine | one line |
| #52 | 2024/2025 gallery data, relayed from the client | estimate first |

#48 has one thing I decided rather than asked: the frame draws the programme
pills in a new order, La Cambre first, and I have **not** followed it, because
talks is the hub root and moving it costs a URL. Say if you disagree.

## 3. Three things the client reported that are content, not code

Worth knowing before you chase them:

- **"The figures still aren't clickable"** — `keyFigure.link` exists since #25
  and `KeyFigures.astro` renders an `<a>` when it resolves. Not one of the six
  has a link filled.
- **"Add the photo next to each collectors' voices interview"** — `story.image`
  exists and `PressMedia.astro` already renders it. Neither story has one.
- **The advisory board's "website" buttons** — `person.website` is in the
  schema *and* in the `PERSON` projection, and `PersonCard` already renders
  the pill. None of the seven has one filled.

I am filling these in the Studio.

**Struck from this list on 2026-10-01: the VIP "discover xx" buttons.** I
reported those as label-without-URL; that was my query reading `link.url`
when the schema stores an external address in `link.external`. The links were
complete all along, and the buttons were missing only because `Vip.astro`
drew no pill from `event.link` - now written. See the correction in
`vip-regression-2026-09-30.md`.

## 4. What is on `lilanga` and not yet on `dev`

Twelve commits, two bodies of work: the previous-editions section, and batches
1–4 of the 2026-09-30 comments. `PR-lilanga-to-dev.md` is the PR description if
it is still unopened when you read this.

Backend-half files on the branch are the previous-editions ones already
recorded as a Note at the bottom of `docs/backend-requests.md`. This round's
work added none — except `src/styles/site.css`, which is #51.

Also on that compare: three old merge commits that are on `main` and `lilanga`
but not `dev`, so `dev` is behind `main`. Merging catches it up; flagging it so
it is not a surprise.

## 5. Still waiting on Léonie, if you speak to her first

- the **best solo show** and **best booth** logos (round 2 was a different set);
- **`noi-grotesk-500.woff2`** — the FAQ questions are set to Medium and it is
  inert without the file, because the site loads 400/600/900 only;
- an **italic face**, if the interview questions should not be a synthesised
  oblique.
