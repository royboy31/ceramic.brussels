# The zone as it stood before the cutover

The DNS of `ceramic.brussels`, captured on **2026-10-05**, the day the domain
moved from the Twill server to Cloudflare Pages. It is here so that putting the
old site back is a restore and not a reconstruction.

| File | What it holds |
| :-- | :-- |
| `public-dns-2026-10-05.json` | Every answer the public resolvers gave, over DNS-over-HTTPS, for 40 likely names × 9 record types, with a second resolver as a cross-check. Taken **without any credentials**, so it can always be re-taken. |
| `old-site-http-2026-10-05.txt` | How the live domain answered over HTTP before the switch: redirect chains, status codes, server headers. |
| `pages-project-settings-2026-10-05.toml` | The Pages project's own settings as deployed (`wrangler pages download config`), including the production and preview variables and the D1/KV bindings. |
| `zone-export-2026-10-05.txt` | The BIND zone file — the artefact a restore is driven from. Written by `scripts/dns-backup.mjs`. |
| `dns-records-2026-10-05.json` | Every record with the things a zone file cannot carry: the **proxied** flag, the TTL as Cloudflare stores it, the record id, plus zone settings, page rules and the redirect/transform rule phases. |
| `dns-records-2026-10-05.txt` | The same records as a table, for reading. |

Re-take the credentialled half at any time with:

```sh
node scripts/dns-backup.mjs --label after-cutover
```

## What the public snapshot already tells us

- **`ceramic.brussels` and `www.ceramic.brussels` were proxied** — both answered
  with Cloudflare's own addresses (`104.21.13.33`, `172.67.132.125` and the
  matching IPv6). The Twill origin is therefore **not** in the public snapshot;
  it exists only in the zone export. `ftp` and `autodiscover` pointed at the
  same proxied records.
- **Mail is Microsoft 365 and is not touched by the cutover.**
  `MX 0 ceramic-brussels.mail.protection.outlook.com`, with
  `mx.mailprotect.be` and `mx.backup.mailprotect.be` behind it,
  `TXT MS=ms75504785`, and
  `SPF v=spf1 include:spf.protection.outlook.com -all`.
- **Brevo's sending identity lives in this zone** and is likewise untouched:
  `brevo1._domainkey` and `brevo2._domainkey` CNAME into
  `b{1,2}.ceramic-brussels.dkim.brevo.com`, the `brevo-code:…` TXT verifies the
  domain, and `_dmarc` is `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`.
  Worth noting for later, not for launch day: **Brevo is not in the SPF record**,
  so its mail passes DMARC on DKIM alignment alone, with `p=none` as the
  backstop. The site's three forms have been delivering since 2026-09-23.
- `google-site-verification=q0T3lX2Qi530w3FL6suKrjKNrBvqAVffsrJnb8ExUac` is the
  Search Console verification. **Leave it in place** — removing it would
  unverify the property the launch needs.
- The zone is on Cloudflare's own name servers (`gabriella`/`jobs.ns.cloudflare.com`),
  so every change is a record edit, never a registrar change.
- **`http://` was not redirected to `https://`** before the cutover (the old app
  answered the plain-HTTP request and kept the scheme). Pages forces HTTPS on a
  custom domain by itself, so this gets better rather than worse.

## Rolling back

The cutover replaces two records and adds one rule. To undo it:

1. In **DNS → Records**, delete the `CNAME www → ceramic-brussels.pages.dev`
   and the apex record Pages created, then re-add the `A`/`AAAA` records for
   `ceramic.brussels` and `www` exactly as `dns-records-2026-10-05.txt` lists
   them — **including the proxied flag**, which is what keeps the certificate
   working. The origin addresses are in `zone-export-2026-10-05.txt`.
2. Disable the apex → www **redirect rule** (Rules → Redirect Rules). It is a
   rule, not a record, so it survives the record restore and would otherwise
   keep sending the apex to a `www` that no longer serves Pages.
3. In the Pages project, remove the custom domain (Workers & Pages →
   ceramic-brussels → Custom domains). Leaving it attached does no harm, but a
   second attempt later is cleaner from a clean slate.
4. Nothing in Sanity, Brevo, D1 or KV needs undoing: the content, the mail and
   the VIP stores never depended on which host served the HTML. The one code
   change worth reverting with it is `PUBLIC_SITE_URL` in `wrangler.toml`, so
   canonicals stop naming a host that is back on the old site.

TTLs on the records being replaced were **300 seconds**, so a rollback is
visible within five minutes, and proxied records change at Cloudflare's edge
immediately for anyone who resolves fresh.
