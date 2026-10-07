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
>
> **Start at "Tomorrow, in order" below** — it is the whole open list, ordered,
> with the Buzz QA findings folded in and its five wrong figures corrected.

## Tomorrow, in order — the resume point for 2026-10-06

Everything below is open; everything not below is done. Owners as in the Buzz
list: **K** Kamindu · **L** Lilanga · **E** editors · **R** Roy/client.

**First, because they are live credentials (K, ten minutes):**

1. **Revoke the two Cloudflare tokens** — `CLOUDFLARE_ZONE_READ_TOKEN` and
   `CLOUDFLARE_ZONE_WRITE_TOKEN`: delete at dash.cloudflare.com → My Profile →
   API Tokens, then drop the two lines from `.env`. They did the cutover and
   have no further use.
2. **Revoke `studio-site-accounts`** (sanity.io/manage → project 5hqzhin7 → API
   → Tokens; role *editor*, created 2026-09-06) **and delete the
   `SANITY_STUDIO_TOKEN` Pages secret.** It is the leftover from the removed D1
   site-accounts system: a browser still holding it can edit the dataset. This
   has been owed since 2026-09-15.
3. **Rotate the opus-mini token.** It exists (created 2026-10-05 14:03:31Z,
   developer + editor + contributor), so nothing is missing in Sanity — the mini
   holds a stale string, and a token value is shown only once. Issue a fresh one,
   Roy pastes it into `~/.buzz/.secrets/sanity.env` (mode 600), never through
   Buzz, WhatsApp or a DM.

**Then the cheap wins (minutes each, biggest effect first):**

4. **E/K — upload a default share image** (Site settings → Default SEO → Share
   image, 1200×630). **Fixes all 54 live pages that have no `og:image` in one
   action**; `Base.astro` already falls back to it.
5. **K — turn Email Address Obfuscation off** (Cloudflare → Scrape Shield). The
   setting is `on`, so every address on the site is a `/cdn-cgi/l/…` link and no
   `mailto:` survives for crawlers, no-JS readers or link previews.
6. **E — four `seo.title.fr` writes**: `main-exhibitors` → *Exposants*,
   `demo-page-programme-talks` → *Programme — conférences*, `-la-cambre` →
   *Programme — ceramic brussels x La Cambre*, `-vip` → *Programme — VIP*. Each
   French page shows the English title today.
7. **K — `/storage/*` rule.** Add above the generated block in
   `public/_redirects`, pointing at the floor plan (host the current PDF under
   `public/files/` if there is one). The old upload links answer 404 today.
8. **K — delete the two newsletter test rows** from the Newsletter tab of
   `ceramic_contact_pages` (`kamindudushmantha@gmail.com` and the `+cbtest`
   variant, 2026-10-05 21:10 and 21:12).
9. **E — unpublish Collector's Voices**, still open from 2026-10-02:
   `story-collector-charles-kaisin` and `story-collector-galila` are published.
   Two clicks, or `node scripts/unpublish-collectors.mjs --apply`.

**The three things the launch could not prove (K + E, needs a human):**

10. **GA4** — accept statistics on `www` and watch realtime in `G-XVTPYEC66H`.
    The tracker only fires on the real host, so it has never fired. Check that
    `?utm_source=…` survives the apex hop.
11. **One publish → webhook → build → page** cycle from the Studio.
12. **The application form and the VIP request**, EN/FR, with a test address:
    team mail, applicant confirmation in the right language, the thank-you page,
    `Reply-To`. Brevo itself is proven (two confirmations delivered 2026-10-05
    21:10/21:12), so this tests those two templates and recipients, nothing more.

**K — Search Console (do it early, it only starts collecting once submitted):**

13. Submit `https://www.ceramic.brussels/sitemap-index.xml`, remove the old
    `sitemap.xml` if listed, and request indexing for `/en/`, `/fr/`, and the
    main hubs in both languages. The verification TXT is already in DNS.

**K — hardening, in the order the Buzz list proposes (headers first, HSTS last):**

14. `Permissions-Policy` and `X-Frame-Options: SAMEORIGIN` in `public/_headers`
    (the Studio keeps `DENY`); `nosniff` + `Referrer-Policy` onto the Worker's
    responses in `scripts/pages-worker.mjs`, which `_headers` never reaches.
15. Cache: `/fonts/*` and `/assets/*` are on Cloudflare's 4-hour TTL — a week is
    safe for both, `immutable` only for files that get renamed when they change.
16. Rate limiting on `POST /api/apply/` and `/api/newsletter/` (5/min/IP), WAF.
17. HSTS only after a week or two of stable HTTPS, no `includeSubDomains` at
    first, no preload. Then CSP in report-only for a week before enforcing.

**L — frontend (PR into `dev`):**

18. **The narrow-window exhibitors overflow** (~1020px) — promised in the group
    before launch and still the one code item outstanding.
19. Homepage LCP: `fetchpriority="high"` + `loading="eager"` on the hero image
    (nothing in the codebase sets either), and a smaller
    `/assets/video-still.webp` — it is 215 kB at a fixed 1,600px.
20. `og:locale` → `en_GB`/`fr_BE`/`nl_BE` with `og:locale:alternate`; a
    site-wide `Organization` JSON-LD in `Base.astro`.
21. The jury-prize badge's alt says "jury prize 2026" for the 2025 image.

**R — decisions blocking other work:**

22. **Newsletter: Mailchimp or the internal form.** `newsletterUrl` still points
    at `mailchi.mp/ceramic/…` in the menu, footer and about/team while the
    internal form works end to end. Two lists drift apart; pick one, then either
    publish `drafts.page-newsletter` and repoint the setting, or leave the page
    unpublished deliberately.
23. A privacy notice beside each form and a privacy/cookie page (Brevo, Sheets,
    VIP D1, GA4, retention, contact) — needed before any campaign.
24. The candidatures deadline, the fair-award names EN/FR, and the
    "voir tous les awards de l'art prize" label with Tiphaine.

**E — content, no deadline:**

25. The 16 priority SEO descriptions (EN + FR). **87** of 210 pages use the site
    default today, not 178 — exhibitor details can take a code-side template
    instead of hand-written text.
26. The Mestre news title is stored with literal `>>` and `<<`; 42 exhibitor
    websites are `http://`; the **Artists main page has never been created**
    (empty form, no lead paragraph, no SEO).

**Later, tracked but not tomorrow:** Dutch (translate, then drop the `/nl/`
noindex, the switcher entry and the hreflang workaround together — `L2` in the
Buzz list explains why the tag stays until `legacy-redirects.mjs` learns another
way to find NL targets); `#52` and `PAST_EDITIONS_PUBLIC=true` for the 2024/2025
galleries; the weekly monitoring of GSC, GA4 and Cloudflare for the first four
weeks.

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

## The Buzz QA list, checked against the live site — 2026-10-05 ~21:30

A post-launch audit arrived from Opus-mini (Buzz). Every claim in it that could
be checked from here was checked against `https://www.ceramic.brussels`,
production `31ba16c`, the dataset and the zone settings. Most of it holds. The
figures below replace the ones in the original where they differ.

**Confirmed, worth doing:**

- **Cloudflare Email Address Obfuscation is `on`** (the zone setting itself, in
  `legacy-export/dns/dns-records-after-cutover.json`). Every `mailto:` on the
  live pages is rewritten: the team page has **0** `mailto:` and 6
  `/cdn-cgi/l/email-protection` links, the applications page 1, the FAQ 5. The
  addresses are public anyway, so turning it off costs nothing and fixes no-JS,
  crawlers and link previews.
- **No default share image.** `defaultSeo.ogImage` is empty, and a sweep of all
  210 live pages finds **exactly 54 with no `og:image`** — the number in the
  report is right to the page. One 1200×630 upload in Site settings fixes all
  54, because `Base.astro` already falls back to it. **Best return of anything
  on this list.**
- **`seo.title.fr` is empty on `main-exhibitors`, `demo-page-programme-talks`,
  `-la-cambre` and `-vip`**, so the French pages show the English SEO title.
  Four one-field writes.
- **`/storage/*` answers 404** — the old site's upload links (floor-plan PDFs
  mailed out and linked from partner sites) have no rule. Worth one.
- **No `fetchpriority` anywhere** in the codebase, and `/assets/video-still.webp`
  is **215,370 bytes** at a fixed 1,600px, used by `VideoSection.astro:27` and
  `PressMedia.astro:423` — both cited lines are exact.
- **`og:locale` is the bare locale** (`en`/`fr`/`nl`) where Facebook wants
  `en_GB`/`fr_BE`/`nl_BE`, and there is no `og:locale:alternate`.
- **No site-wide `Organization` JSON-LD.** The homepage has `ExhibitionEvent`,
  exhibitor pages `Organization`, news `Article` — nothing in `Base.astro`.
- **Security headers:** `Permissions-Policy` absent, `X-Frame-Options` absent on
  `/*` (only `/studio` sends `DENY`), HSTS disabled in the zone
  (`security_header.strict_transport_security.enabled: false`). And the report
  is right that **`/api/*` gets none of `_headers`** — the Worker's responses
  carry neither `nosniff` nor `Referrer-Policy`.
- **42 exhibitor websites stored as `http://`** (32 are `https://`), and
  `exhibitor-2026-chaxartxrtm` holds `http://chaxart.com`,
  `exhibitor-2026-barrera-baldan-galeria` `https://www.berlingaleria.es`,
  `exhibitor-2026-a-iynedjian-fine-art-aifa` an Instagram field reading
  "AIFA Gallery" rather than a handle.
- **`newsletterUrl` is still Mailchimp** while the internal form works — the
  decision in R1 is real and worth making before anything is mailed.

**Corrected:**

| Claim | What is actually there |
| :-- | :-- |
| 178 of 210 pages use the default description | **87** of 210 use the site default; **0** pages have no description at all. (217 *documents* lack `seo.description.en`, which is likely where 178 came from — most of them never build a page.) The priority 16 fields are still worth writing. |
| `/fonts/*` and `/assets/*` return `max-age=0, must-revalidate` | Both return `public, max-age=14400, must-revalidate` — Cloudflare's 4-hour browser TTL, not "uncached". Lengthening it is still reasonable; the premise is not. |
| Two **news titles** over 65 characters | No *stored* title exceeds 65. Four *rendered* `<title>`s do: the Marion Verboom news in EN (81) and FR (77), and the Enric Mestre tribute in both (79). The point stands, the field does not. |
| 78 old `/nl/…` URLs | The map holds **190** `/nl/` rules of 585. |
| The opus-mini token "was deleted or revoked → add a token" | A token labelled **`opus-mini` exists**, created **2026-10-05 14:03:31Z**, roles developer + editor + contributor. Nothing is missing in Sanity; the value on the mini is stale or truncated. Since a token value is shown only once, rotating it is the fix — but the diagnosis to act on is "the mini has the wrong string", not "the project lost its token". |
| 250/250 old URLs verified | True as far as it goes; the cutover check measured **562/562** rules (250 is the Wayback + old-sitemap subset of them). |

**Found while checking, not in the report:** the Enric Mestre news title is
stored with literal `>>` and `<<` around it, which renders as escaped entities
in the page title. Editor cleanup.

**Could not be verified from here** (no access, or it needs a real send): the
Search Console state, the WAF/rate-limiting rules, every test in section 2,
Lighthouse's numbers (LCP 3.0 s, 361 KiB avoidable, a11y 100), and "GA4 consent
works end to end" — the tracker only fires on the real host, so nothing has
confirmed a hit in `G-XVTPYEC66H` yet.

**The token listing also showed `studio-site-accounts` (role: editor) still
alive** — the leftover from the removed D1 site-accounts system, still bound to
production as `SANITY_STUDIO_TOKEN`. Delete the Pages secret and revoke the
token.
