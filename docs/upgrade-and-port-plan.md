# Two plans, written 2026-10-27

1. **Bringing the dependencies current on `kamindu`** — which is *not* an
   Astro 7 migration, because the site is already on Astro 7.
2. **Porting Léonie's previous-editions round to `main`** when the client
   says go.

They are independent. Part 2 can land before Part 1, and should: it is a
no-op on the live site, while Part 1 touches the Studio bundle.

---

# Part 1 — The dependencies on `kamindu`

## The premise, checked first

There is no Astro 7 migration left to do.

| | declared | installed |
| :-- | :-- | :-- |
| `main` (e2f254c) | `astro ^7.3.1` | — |
| `kamindu` (0d850dc) | `astro ^7.3.1` | `7.3.1` |

`npm view astro version` is **7.4.2**; there is no Astro 8. So the site is on
the current major on both branches, and what "migrate to Astro 7" turns into
is **dependency currency**: eighteen packages behind, of which exactly one is
a major.

## What is actually behind

Seventeen of the eighteen are inside the carets already in `package.json`, so
a plain `npm update` takes them:

| Package | Current | Latest |
| :-- | :-- | :-- |
| `astro` | 7.3.1 | 7.4.2 |
| `@astrojs/cloudflare` | 14.3.0 | 14.4.2 |
| `@astrojs/sitemap` | 3.7.3 | 3.7.4 |
| `@sanity/astro` | 3.5.1 | 3.6.0 |
| `@sanity/client` | 8.3.0 | 8.11.0 |
| `@sanity/icons` | 5.2.1 | 5.2.3 |
| `@sanity/ui` | 4.0.6 | 4.4.10 |
| `sanity` | 6.11.0 | 6.20.0 |
| `react` / `react-dom` / `react-is` | 19.2.8 | 19.3.1 |
| `@types/react` / `-dom` / `-is` | 19.2.x | 19.3.0 |
| `styled-components` | 6.5.3 | 6.6.0 |
| `wrangler` | 4.129.0 | 4.153.0 |
| `@cloudflare/workers-types` | 5.20260903.1 | 5.20261027.1 |

The eighteenth is the only decision:

**`@astrojs/react` 6.0.4 → 7.1.1** (7.0.0 published 2026-09-22). Its peer
dependencies gained **`oxc-transform-react ^0.145.0`** — the JSX transform
moved to oxc — so the bump is not just a version number, it needs that
package installed alongside. `6.0.6` is the caret-safe step if the major is
not wanted yet.

## What can break, and why

Four of these land exactly on the workarounds `CLAUDE.md` warns about.

1. **`fixSanityWindowsAlias` must stay.** I unpacked `@sanity/astro@3.6.0`
   and read its bundled `sanity:module-dedupe`: the alias is still built by
   stripping `package.json` with `.replace(/\/package\.json$/, '')`, a
   forward-slash regex. `require.resolve` returns backslashes on Windows, so
   **the bug is not fixed in 3.6.0** and removing the plugin would blank
   `/studio` again. One thing did change: the plugin is now `apply: 'serve'`,
   so it only runs in `astro dev` — the workaround matters for dev and the
   Studio, not for a build. Update the comment's version from 3.5.1 to 3.6.0
   and leave the code.

2. **`optimizeDeps.include` and the Studio's lazy panes.** `sanity`
   6.11 → 6.20 is nine minors of Studio; if a pane's module path moved, the
   pre-bundle list goes stale and the symptom is the endless reload loop with
   "Failed to fetch dynamically imported module .../deps/pane-*.js". This is
   the single most likely failure, and it only shows in `astro dev`, never in
   a build. Test by opening `/studio` in dev and clicking into **every** pane
   kind: a page, an exhibitor, a person, the page builder, Page templates, VIP
   guests.

3. **The CSS targets, and a live bug next to them.** The `cssTarget` /
   `css.lightningcss.targets` pinning exists because the minifier rewrites
   `(max-width: 700px)` into `(width <= 700px)`, which iOS Safari before 16.4
   drops silently — the phones that rendered the desktop layout on
   2026-10-03. Astro 7.4 carries a different Vite/Lightning CSS, so after the
   upgrade **grep the built CSS for `width<=` and `width>=`**; finding none is
   the proof.

   While reading the config for this I found a latent bug worth fixing in the
   same pass. In `astro.config.mjs` the `vite` object sets
   `build: { cssTarget: [...] }` and then, in the non-preview branch, spreads
   `build: { rollupOptions: { external: ['cloudflare:workers'] } }` after it.
   The second `build` **replaces** the first, so `cssTarget` is dropped
   whenever `PREVIEW_RUNTIME` is off. The Lightning CSS targets survive and
   are the ones Astro actually uses, which is why the phone fix held — but the
   esbuild pin has been inert in plain builds since it was written. Merge the
   two `build` objects.

4. **The adapter and Astro move together.** `@astrojs/cloudflare` needs Astro
   ≥ 7.3; 14.4.2 with 7.4.2 is in step. If the adapter's bindings surface
   changed, `wrangler.worker.toml` has to stay in step with `wrangler.toml` —
   the two are kept in sync by hand.

Lower risk, worth a look: a `sanity` 6.20 bundle changes the Studio chunk, so
the build's file count and size will move off the numbers in `CLAUDE.md`; and
React 19.3 only reaches the Studio, since the site itself ships no React
islands.

## The procedure

**Why not straight on `kamindu`:** its preview URL is in active use — the
Dutch retranslation and the exhibitors platform are both read there, and
`0f4f810` / `63d4915` make that branch the only place the NL switcher exists.
A half-upgraded Studio there costs a client review. So work on a side branch
and merge when it is green.

0. **Baseline.** `git checkout kamindu`, deal with the dirty tree first
   (`legacy-export/asset-map.json` is modified and eleven files are untracked,
   including four `*.tmp.mjs` one-offs). Record a clean `npm run build`, a
   clean `npm run dates`, and keep the current `package-lock.json` — that file
   is the rollback.
1. `git checkout -b deps-2026-10 kamindu`.
2. **The seventeen minors.** `npm update`, then `npm run build`,
   `npm run dates`, `npm run content`, `astro dev --background` and the Studio
   pane sweep, the three locales on a few pages, and the `width<=` grep.
   Commit.
3. **The one major, on its own commit** so it can be reverted alone:
   `npm i @astrojs/react@^7 oxc-transform-react@^0.145.0`. Rebuild and hammer
   the Studio again — it is the only React consumer on the site.
4. **Both shapes of build.** `npm run build` *and* `npm run build:preview`.
   They take different code paths — the adapter, the `cloudflare:workers`
   externals, and `scripts/pages-worker.mjs` rearranging `dist` — and only the
   second produces `_worker.js` and `_routes.json`. Both must pass.
5. **Push and verify on the real URL**, because workerd only exists there:
   `/studio` loads and saves; `/preview/` renders a draft; a locked VIP tab
   sends a visitor without a code to `/vip/access/`; `/api/apply` answers in
   dry-run; a handful of legacy 301s still land on 200s.
6. **Merge into `kamindu`**, then PR into `dev`. To `main` by cherry-pick
   only — never a merge or a fast-forward.

A note on quota: repeated local builds read Sanity through the CDN, which has
its own large allowance, and `run()` fails a build over 2,500 requests. Keep
`useCdn: true` in place through all of this; an upgrade loop against the live
endpoint is how the free plan was burned in four days once already.

## What happened, 2026-10-27

Steps 0-5 ran on `kamindu` itself rather than a side branch (Kamindu's call).

**The seventeen minors are in, on `3c62402`.** They cost one fix: `@sanity/ui`
4.4.10 ships a container query, `scripts/lower-css.mjs` could not tell a
`@container` prelude from a `@media` one, and the build died at the guard -
taking `legacy-redirects` and `sitemap-noindex` down with it, so a dist that
looked finished was missing 561 redirect rules. The guard now matches `@media`
alone. Both build shapes verified, the Studio swept pane by pane in dev, and the
deploy confirmed live: 804 pages, 561 redirects, zero `@media` range syntax in
the stylesheets Cloudflare actually serves.

**`@astrojs/react` 7 is parked, reverted in `0e8f57e`.** It builds on Windows and
fails `npm ci` on Linux, because two peers want disjoint ranges of the same
native package: `@astrojs/react@7.1.1` asks for `oxc-transform-react ^0.145.0`
(`>=0.145.0 <0.146.0`) while the `@vitejs/plugin-react` nested under it - and
under four `@sanity/*` packages - asks for `^0.152.0`. `npm i` here settled on
0.145.0 and wrote a lockfile `npm ci` cannot reproduce: *Missing
@oxc-transform-react/binding-linux-x64-gnu@0.152.0 from lock file*. Two things to
carry forward: `npm ci --dry-run` **passes on Windows and fails on Linux**, so it
is not a pre-push check here - the builder's own log is; and the major buys no
functional change, so retry it only once Astro's integration and
`@vitejs/plugin-react` agree on an oxc range.


## Porting the upgrade to live - queued for 2026-10-28

Decided the evening of 2026-10-27: the dependency round goes to `main`
tomorrow. It is ready; nothing about it is waiting on anyone.

**What goes:** `3c62402` alone - the seventeen minors and the `lower-css`
guard. Not `a2a8122` (React 7) and therefore not its revert `0e8f57e` either;
leaving both out gives `main` the same tree with two fewer commits. By
cherry-pick, never a merge.

**Before pushing:** `npm run build` and `npm run build:preview` on a worktree
off `origin/main`, because `main` has `PAST_EDITIONS_PUBLIC` false and
`HELD_BACK = ['nl']` where `kamindu` has neither - a build there renders a
different, smaller set of pages (220 sitemap URLs on production against 792 on
the kamindu preview), so it is genuinely not the build already verified.

**After pushing:** read the deployment, do not poll a page -
`npx wrangler pages deployment list --project-name ceramic-brussels` after
`npx wrangler whoami`, and the build log by API on a failure. A failed Pages
build keeps serving the last good deployment, so from the URL alone a failure
and a slow build look identical. That cost ~50 minutes today.

**The check that matters afterwards:** zero `@media` range syntax in the
stylesheets www actually serves. That is the regression the guard exists for,
and the whole reason this round was not a no-op.

**Not coupled to the exhibitors work.** The 2027 switch and the
previous-editions release are content and flag decisions
(`docs/exhibitors-2027-switch.md`); this is dependencies. Land it first and on
its own, so that if anything does go wrong tomorrow it is not tangled with an
announcement.

---

# Part 2 — Porting previous editions to `main`

## The port is already rehearsed

`origin/previous-editions-review` (b096cd2) **is** current `main` plus the
round plus the flag — it was rebuilt that way on 2026-10-27, cherry-picks
clean, 803 pages locally, and all 23 of Léonie's items verified on the
deployed URL. So the port is not an experiment; it is replaying a pick that
already worked.

`git diff --stat main origin/previous-editions-review` is 15 files, and
`src/components/launch.ts` is touched by **nothing but the flag commits**.

## The round lands dark

This is the part that makes the timing easy. With `PAST_EDITIONS_PUBLIC`
still `false` on `main`, every change in the round is invisible on
www.ceramic.brussels. Checked one by one:

- `src/pages/[lang]/exhibitors/[year]/[slug].astro` computes
  `const archive = PAST_EDITIONS_PUBLIC && year !== landingYear`, so `archive`
  is **always false** while the flag is off. `theme="ash"` never applies, and
  `ExhibitorHead` / `ExhibitorDetail` take exactly today's path — the full tab
  band, not the single back pill.
- `Footer.astro`'s new rules are scoped to `.site-footer.has-back`, and
  `has-back` is `!!backLink`. The only component that passes `backLink` is
  `editions/PreviousEdition.astro`; `Base.astro`'s own `footerBack` comes from
  `newestPast`, which is `undefined` while the flag is off.
- `Base.astro`'s hover fix **adds** `body.ash-page` selectors beside the
  existing `body.acid-page` ones. The acid pages behave as before, and
  `ash-page` is set by the previous-editions theme alone.
- `exhibitors.backToAll` changes in all three locales, and on `main` that key
  is defined but **used nowhere** — only the round's back pill reads it.
- The editions components (`Overview`, `ArtPrize`, `Focus`, `Publication`,
  `YearBand`, `PreviousEdition`) are still built, because 61 legacy redirect
  rules point into the section and an unbuilt target fails the build — but
  every one of those addresses answers a 302 to `/exhibitors/`.

**One change does reach a live page:** `ExhibitorsListing.astro` takes the
filter pills from `background: #fff` to `background: transparent`. On
`/exhibitors`, which is white, that is the same colour — confirm by eye on the
preview, then stop worrying about it.

So Move A needs no client go-signal. Only Move B does.

## Move A — the code and the record, any time

Five commits carry the round. Cherry-pick in this order, from
`origin/previous-editions-review`:

```
0185a84  Léonie's previous-editions round: the section in its own grey and black
a835cf2  The grey stops at the archive: the year /exhibitors lands on keeps its own
1ac4566  Measured off the frames: the underline is 2px and the band is 24
68a17f6  The other four frames checked: nothing more to change
0ebb277  The grey section's link hover is black too, not just its highlight mark
```

**Never pick `6066f27` or `64a0b81`.** Both set `PAST_EDITIONS_PUBLIC = true`
— the review branch carries two of them, the original and the re-pick, and
`1c521d4` is the same change on `kamindu`. The section is not public until the
client says so.

Six more commits on `kamindu` belong to this round and touch **only** `docs/`
and `scripts/` — no site code, no build impact, so they can ride along in the
same push:

```
199f116  Requests 19 and 20: the jury prize winner's page, and 45 galleries' links
addbbc4  The second pass can strip: planning no longer hangs on the fields
0150ab2  The link line goes, in all three languages this time
1fb3e41  The record says which yellow it was
55d5ad3  The old site had the links all along: 76 more galleries get their pills
0d850dc  The record catches up with the dataset: 121 of 135, and Fragnon has his links
```

They bring `scripts/backfill-past-exhibitor-links.mjs`,
`scripts/add-fragnon-jury-prize-2025.mjs` and the finished
`docs/client-feedback-2026-10-26.md` onto `main`. The dataset writes those
scripts made are **already in production content** — the dataset is shared and
has one `production` — which is why items 19 and 20 verified on the review URL
without any code port at all.

Then: `npm run build` locally, `npm run dates`, push, and check on www that
nothing moved — the exhibitors list, a 2026 gallery page, the footer on a
normal page, and a `/previous-editions/2025/` address still 302ing to
`/exhibitors/`.

## Move B — the flag, on the go-signal

One line in `src/components/launch.ts`:

```
export const PAST_EDITIONS_PUBLIC = false;   ->   true
```

Everything the flag governs is in code, so that edit is the whole switch: the
section's pages start rendering `PreviousEdition` instead of `EditionHidden`,
`/previous-editions` 301s to the newest past edition, the year row and the
footer's "previous editions →" pill are drawn, `archive` starts coming out
true for 2025 and 2024, and 135 past gallery pages join the build (the page
count rises from ~800 to ~803+ and the sitemap grows with it).

Before pushing it:

1. Léonie's four open asks are answered or consciously shipped without —
   slideshow photos for overview / guest of honour / focus, the 2024–2025
   artist lists, Fragnon's booth, city, description and stand photo, and links
   for CONSTELLATIONS GALLERY, Format, Kiosken and RAM galleri.
2. `npm run build` locally, then the 23-item check against the production URL.
   The script is written and passes on the review URL;
   `bash verify-round.sh https://www.ceramic.brussels` is the whole run. Two
   of its patterns report false failures and are known: item 6, because the
   minifier writes `transparent` as `background:0 0`, and item 16, because the
   rule carries scope attributes between `.talk` and `.body`.
3. `scripts/legacy-redirects.mjs --check https://www.ceramic.brussels` on the
   61 rules that point into the section, which have been landing on a stub
   since the launch and will now reach real pages.
4. A rollback that is the same one line back, plus a Cloudflare deployment to
   roll back to, noted before the push.

## Order

Part 2 Move A first — it is dark, it is already rehearsed, and it gets the
round and the dataset record out of a branch. Then Part 1 on its own branch.
Move B last, whenever the client answers, by which time `main` already holds
everything but the switch.
