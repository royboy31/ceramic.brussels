# Going live, and what comes after

Written 2026-10-05, the launch day, from the state of `main` = `fe4335d`
(deployed and verified on `ceramic-brussels.pages.dev`). The Oct 1 call's
checklist is `launch-meeting.md`; this file takes over from the moment the
domain moves.

> **The cutover ran on 2026-10-05 at 18:43Z** — `https://www.ceramic.brussels`
> serves the new site, the apex 301s to it, 562/562 legacy URLs and 210/210
> sitemap URLs check out. The record of it, and the way back, is
> `docs/cutover-runbook.md`. What is left of "the first hour" below is the three
> things that need a human or send real mail: the forms, GA4 realtime, and one
> publish → webhook → build cycle. Two tokens to revoke:
> `CLOUDFLARE_ZONE_READ_TOKEN` and `CLOUDFLARE_ZONE_WRITE_TOKEN` in `.env`.

## Can we go live?

**Yes — the site is ready; the cutover itself is four steps, and two of them
are not ours.** Verified today:

- `main` = `fe4335d` is built and live on the production alias (the drawn
  language caret, the `/nl/` noindex and the French tab pills are all there),
  so the build is green with the launch content in it;
- `npm run dates` is clean (2,489 documents, 0 unreadable dates) — the one
  value that can stop a build silently;
- the dataset carries no mojibake (697 documents walked field by field, 0
  suspect strings) after the weekend's write-back scripts;
- the sitemap is 105 EN + 105 FR, no Dutch, and `/nl/` pages say
  `<meta name="robots" content="noindex">`;
- the VIP gate is closed on the real deployment (`/en/vip/programme/` → 302
  to `/en/vip/access/`), and the stories pill is gone from the press & media
  hub in EN and FR because its page is unpublished — both as designed.

Nothing in the code blocks the switch. What follows must happen *in order*.

## The cutover, in order

- [ ] **`PUBLIC_SITE_URL` → `https://www.ceramic.brussels`** in
      `wrangler.toml` `[vars]`, then push and let Pages rebuild. Today it is
      `https://ceramic-brussels.pages.dev`, and `astro.config.mjs` feeds it to
      `site`: every canonical tag, every hreflang, every OG URL and the whole
      sitemap currently name the alias — which is also the host the `_headers`
      rule noindexes. Launching without this change publishes a site whose
      canonicals point at a page Google is told to ignore.
- [ ] **Add the domain to Sanity's CORS origins** — `https://www.ceramic.brussels`
      *and* `https://ceramic.brussels`, credentials allowed, at
      sanity.io/manage. Checked today: neither origin is on the list
      (`ceramic-brussels.pages.dev` is). The Studio is served from the live
      domain, so the moment DNS moves, `/studio` stops loading content for
      every editor — and it looks like "the CMS is down", not like a CORS
      list.
- [ ] **Attach the custom domain to the Pages project, then move DNS**
      (Roy/Gilles — the zone is theirs and `www` still answers from Twill
      today, apex included). Not ours to touch.
- [ ] **Decide the pages.dev noindex rule.** `public/_headers` noindexes
      `https://ceramic-brussels.pages.dev/*` only. The ledger said remove it at
      cutover; the recommendation now is **keep it** — it is host-scoped, it
      never reaches `www.ceramic.brussels`, and it is what stops the alias
      being indexed as a duplicate of the real site.
- [ ] **Confirm the Sanity publish webhook** still points at a deploy hook for
      `main`, and that a publish produces a build.

## The first hour after the domain answers

- [ ] `node scripts/legacy-redirects.mjs --check https://www.ceramic.brussels`
      — every one of the ~561 rules: 301, one hop, onto a 200. This is the
      first time it can run against the host that actually has to serve them.
- [ ] `https://www.ceramic.brussels/robots.txt` and `/sitemap-index.xml`:
      the sitemap must list `www` URLs now, not pages.dev. Spot-check a
      canonical and an hreflang block in EN and FR, and that `/nl/` still says
      noindex.
- [ ] `/studio` loads and an editor can sign in (the CORS step above).
- [ ] One end-to-end content change: edit, publish, webhook, build, page shows
      it. The thing nobody can see from the Studio if it breaks.
- [ ] The three forms, on the real host, where Brevo is live and there is no
      dry run: gallery application (`/api/apply`), newsletter signup (Sheet
      row + confirmation mail; delete the test rows afterwards), VIP request.
- [ ] The VIP flow on `www`: a code redeems, the session cookie is set for the
      new host, a locked tab opens, a wrong code is refused.
- [ ] **GA4** — accept statistics in the banner and watch realtime in
      `G-XVTPYEC66H`. `TRACKING_HOSTS` is `www.ceramic.brussels` /
      `ceramic.brussels`, so this is the first moment the tracker fires at all.
- [ ] Certificate on `www`, apex → `www`, the 404 page, the favicon, and an OG
      card in a WhatsApp/LinkedIn share.

## The first days

- [ ] Search Console: property for the live site, submit the sitemap,
      URL-inspect a handful, then watch Coverage for 404s. Roy's GSC export
      goes through `node scripts/check-gsc-urls.mjs` — expect zero misses
      against the 561 rules.
- [ ] Watch Cloudflare analytics for 404s that are old URLs nobody mapped, and
      add them to `ALIASES` in `scripts/legacy-redirects.mjs`.
- [ ] Keep the Twill server up until the redirect check has passed on the real
      domain; only then set a decommission date. `legacy-export/` and
      `legacy-export/asset-map.json` are the only copies of the old content —
      they stay in the repo forever.
- [ ] Sanity's free plan meters 250k API requests a month and every publish
      triggers a build of ~700 pages; usage is only visible at
      sanity.io/manage. Watch it for the first week of editor traffic.
- [ ] **Workers Paid ($5/mo) before the VIP code mailing** — KV's free tier
      allows 1,000 writes a day and a code entry is one write; ~3,000 codes go
      out in one mail.
- [ ] Leftover secrets: revoke `SANITY_STUDIO_TOKEN` at sanity.io/manage and
      delete it from Pages if that has not been done, and delete the old
      Sanity project `uia5r1rc` if it is still there.

## Content and CMS, carried over from the launch list

- [ ] **Dutch.** The launch took it off the switcher (`eb645b3`) and out of
      search (`c4d5c90`). Bringing it back: translate with the keep-English
      glossary the French review produced, drop the `/nl/` noindex, put the
      locale back in the switcher, let the sitemap pick NL up again. One NL bug
      is already known: `demo-award-2026-7`'s Dutch outcome still holds English
      ("are the laureates of a 3-month residency").
- [ ] **Newsletter.** `drafts.page-newsletter` is still a draft and Site
      settings → `newsletterUrl` still points at Mailchimp
      (`https://mailchi.mp/ceramic/ceramic-brussels`), so the footer link
      bypasses the form that is live and working. Publish the page, repoint the
      setting, add the FR confirmation text, delete the test rows from the
      Sheet.
- [ ] **Collector's Voices.** Still published: `story-collector-charles-kaisin`
      and `story-collector-galila`. Two clicks in the Studio, or
      `node scripts/unpublish-collectors.mjs --apply` (backup already in
      `legacy-export/backups/`). The group was told "today" on Oct 2.
- [ ] **The Artists main page has never been created** — the Studio's
      Artists → Artists page is an empty form, so the listing has no lead
      paragraph and no SEO of its own.
- [ ] **Stories** reappear pill-and-route by themselves once Léonie's
      interview template is ready and `drafts.page-press-media-stories` is
      published. Nothing to deploy.
- [ ] Delete the editors' scratch drafts: `Test 2`, `Test PWS`, and the stray
      `about` draft.
- [ ] **Previous editions** (#52, about a working day): give the 2024/2025
      galleries the data the 2026 ones have, then set `PAST_EDITIONS_PUBLIC`
      back to `true` in `src/components/launch.ts` — the 61 legacy rules
      re-aim themselves on the next build.
- [ ] Editors' content still owed: #28 awards, the key-figure links, Léonie's
      best-solo-show and best-booth logos, the gallery descriptions' AI pass,
      and the English gallery bios' missing "for this third edition… will
      present…" paragraph that the French has (Jev's lead).
- [ ] Decisions parked with the client: the candidatures deadline, the
      fair-award names EN/FR, and the "voir tous les awards de l'art prize"
      link label with Tiphaine.
- [ ] Alt text: the AI fill pass was offered and never run.

## Frontend, still open

- [ ] **Tiphaine's narrow-window exhibitors overflow** (~1020px, gallery detail
      squeezed) — promised in the group, the one code item that went into
      launch unfixed.
- [ ] The jury-prize badge's alt says "jury prize 2026" where the image is the
      2025 one — a one-word fix.
- [ ] Tiphaine's pinch-zoom report, and the underline reply Léonie is owed
      (measurably one rule, not two).
- [ ] Header: make the hardcoded nav button name editable in the CMS.

## Repository hygiene

- [ ] The working tree carries untracked screenshots (`24-fix1.png`,
      `24-fix2.png`, `lilanga.png`), `first-meeting.md`,
      `legacy-export/backups/`, `legacy-export/refetch-images.json` and a
      modified `asset-map.json`. The backups and the asset map matter; the
      screenshots do not. Commit or ignore, deliberately.
- [ ] `dev` is 119 commits behind `main` and `lilanga` 277 — Lilanga merges
      `main` into his branch, and `dev` wants a fast-forward to `main` so a
      staging build means something again. `press-media-launch` is fully picked
      and can go.
- [ ] Run `npm run dates` after anything that writes to the dataset. It is
      deliberately not part of the build.
