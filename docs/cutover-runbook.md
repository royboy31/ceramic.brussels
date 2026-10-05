# The cutover: connecting www.ceramic.brussels to Pages

> **Done. The site went live on `https://www.ceramic.brussels` at 18:43:49Z on
> 2026-10-05** (20:43 Brussels), by `node scripts/cutover-connect.mjs --apply`:
> the custom domain attached, `www`'s `AAAA` deleted and its `A` turned into a
> proxied `CNAME` to `ceramic-brussels.pages.dev`, and the apex 301 written as a
> Single Redirect. The zone had no redirect rules before, so nothing was
> displaced. Verified immediately after:
>
> - **562 of 562 legacy URLs**: 301, one hop, onto a 200
> - **all 210 sitemap URLs**: 200, every canonical on `www`
> - apex → `www` 301 keeping path *and* query; `http://` → `https://` on both
>   hosts (Pages does this itself, so the zone's Always Use HTTPS can stay off)
> - `/studio/` 200, `noindex`, frame-denied; Sanity CORS answers both hosts
> - `/nl/` still `noindex`; `robots.txt` and the sitemap name `www`
> - the VIP gate 302s to `/en/vip/access/`; `/api/apply/` answers 405 to a GET,
>   so the Worker is alive; the 404 page 404s
> - `legacy-export/dns/*-after-cutover.*` is the matching new snapshot
>
> Still untested because each one sends real mail or needs a human: the three
> forms, GA4 realtime, and one publish → webhook → build cycle. They are in
> `docs/post-launch.md`.

Written 2026-10-05, the launch day, for the switch from the Twill server to the
Cloudflare Pages project `ceramic-brussels`. The after-live checklist is
`docs/post-launch.md`; this file is only the switch itself, in order, with the
way back.

**The decision that drives the whole thing: `www` is the host that serves.**
Every page Google has indexed is a `https://www.ceramic.brussels/…` URL, the old
site's own `robots.txt` named `www`, and all 561 generated redirect rules are
checked against `www`. So `www` gets the Pages custom domain, and the apex
(`ceramic.brussels`, which serves the Twill site today) becomes a 301 to `www`.
Never the other way around: pointing Pages at the apex and redirecting `www`
would send every indexed URL through a hop it does not need.

## Before anything is switched

- [x] **Backups taken, in full** — `legacy-export/dns/` holds the public DNS
      snapshot, the old site's HTTP behaviour, the Pages project's deployed
      settings, and, since the credentialled export of 18:08Z, the BIND zone
      file plus every record with its `proxied` flag. The Twill origin behind
      the proxy is `45.157.189.111` / `2001:1600:4:9:f816:3eff:fe14:9a8` — the
      one thing public DNS could never show, and the thing a rollback needs.
      `legacy-export/dns/README.md` lists each file and spells out the restore.
      Re-take it any time with `node scripts/dns-backup.mjs --label …`.
- [x] **`PUBLIC_SITE_URL` → `https://www.ceramic.brussels`** in `wrangler.toml`
      `[vars]`. It feeds Astro's `site`, so canonicals, hreflang, OG URLs and
      the sitemap are built from it. **This must be deployed *before* DNS
      moves**, so that the first request the real domain ever serves already
      names itself correctly. Deploying it early costs nothing: it only makes
      the noindexed pages.dev alias advertise `www`.
- [ ] **Push it** — `git push` on `main`, and wait for the Pages build to go
      green. (A production deploy is the user's to trigger.)
- [ ] **Sanity CORS** — add `https://www.ceramic.brussels` **and**
      `https://ceramic.brussels` at sanity.io/manage → API → CORS origins, with
      credentials allowed. Checked today: neither is on the list. The Studio is
      served from the live domain, so without this `/studio` stops loading
      content for every editor the moment DNS moves, and it reads as "the CMS is
      down".
- [x] **SSL/TLS mode is `full`** — checked by the export, so a Pages custom
      domain will not redirect-loop the way it does behind Flexible. *Always Use
      HTTPS* is **off**, which is why plain `http://` was answered rather than
      redirected; Pages forces HTTPS on its custom domain by itself, and turning
      the zone setting on afterwards makes the apex do the same.
- [ ] **Look at Rules → Page Rules and Rules → Redirect Rules by eye.** The
      read-only token cannot read either (`9109 Unauthorized`), so they are the
      one part of the zone that is not backed up. Nothing is known to be there,
      but a leftover rule from the Twill setup would outlive the record change
      and could fight the new apex redirect.

## The switch

- [ ] **Attach the custom domain.** Workers & Pages → `ceramic-brussels` →
      Custom domains → *Set up a custom domain* → `www.ceramic.brussels`.
      Because the zone is in the same account, Cloudflare offers to replace the
      existing proxied `A`/`AAAA` records for `www` with the CNAME it needs —
      accept, and the certificate is issued within a minute or two. Do not add
      the apex here; it gets a rule instead.
- [ ] **Redirect the apex.** Rules → Redirect Rules → *Create rule*, on the
      free Single Redirects allowance:

      When incoming requests match:  hostname equals  ceramic.brussels
      Then:  Static/Dynamic redirect
             URL: concat("https://www.ceramic.brussels", http.request.uri.path)
             (dynamic, so the path and query survive the hop)
      Status: 301 — Permanent
      Preserve query string: on

      The apex's own `A`/`AAAA` records stay as they are; the rule runs at the
      edge before them, and leaving the records in place is what lets a rollback
      be a rule toggle rather than a re-creation.

## Verify, in this order

- [ ] `curl -sI https://www.ceramic.brussels/` → 200, `Server: cloudflare`, and
      **no** `x-robots-tag: noindex` (that header is scoped to the pages.dev
      alias and must not appear here).
- [ ] `curl -sI https://ceramic.brussels/en/` → 301 → `https://www.ceramic.brussels/en/`.
- [ ] `curl -s https://www.ceramic.brussels/en/ | grep canonical` → the canonical
      names `www.ceramic.brussels`, not pages.dev. Same for an `hreflang` block
      and for `/fr/`.
- [ ] `curl -s https://www.ceramic.brussels/sitemap-index.xml` → `www` URLs, and
      `robots.txt` advertises that sitemap.
- [ ] `node scripts/legacy-redirects.mjs --check https://www.ceramic.brussels`
      → every one of the ~561 old URLs: 301, one hop, onto a 200. **This is the
      check the indexed pages depend on**, and the first moment it can run
      against the host that has to serve them.
- [ ] `/studio` loads on the live domain and an editor can sign in (the CORS
      step above).
- [ ] `/nl/` still carries `<meta name="robots" content="noindex">` — Dutch is
      post-launch.
- [ ] The VIP gate on the new host: `https://www.ceramic.brussels/en/vip/programme/`
      → 302 to `/en/vip/access/`, a good code opens it, a wrong one is refused.
      The session cookie is per host, so this is genuinely untested until now.
- [ ] GA4: accept statistics in the banner and watch realtime in `G-XVTPYEC66H`.
      `TRACKING_HOSTS` is `www.ceramic.brussels` / `ceramic.brussels`, so this is
      the first time the tracker fires at all.
- [ ] One publish → webhook → build → the page shows it.

Then continue with `docs/post-launch.md`.

## The way back

Full detail in `legacy-export/dns/README.md`. In short: re-add the apex and
`www` `A`/`AAAA` records from `dns-records-2026-10-05.txt` **with their proxied
flag**, disable the apex redirect rule, remove the custom domain from the Pages
project, and revert `PUBLIC_SITE_URL`. TTLs were 300 seconds, and proxied
records change at the edge immediately, so the old site is back in minutes.

Nothing in Sanity, Brevo, D1 or KV is involved in the switch, and the mail
records — Microsoft 365 MX, the SPF TXT, Brevo's two DKIM CNAMEs, `_dmarc` — are
never touched. Neither is the Search Console verification TXT.
