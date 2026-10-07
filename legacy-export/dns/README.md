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

## What the credentialled export added — run 2026-10-05 18:08Z

Zone `3e9e033390af03d5deafbcb46cef924b`, plan Free Website, 18 records,
**SSL mode `full`** (Pages-compatible; Flexible would have looped the custom
domain) and **Always Use HTTPS off**, which is why plain `http://` was answered
rather than redirected.

**The origin the public snapshot could not show:**

```
A     ceramic.brussels      proxied → 45.157.189.111
A     www.ceramic.brussels  proxied → 45.157.189.111
AAAA  both                  proxied → 2001:1600:4:9:f816:3eff:fe14:9a8
```

That is the Twill server. Those four records, with the proxied flag, are the
whole of what the cutover replaces.

Two records in the set are worth not deleting by reflex later:

- `ftp.ceramic.brussels` → `185.86.19.149`, a different and older host than the
  website's. Nothing on the new site uses it; it is also not ours to clean up.
- `k2._domainkey` / `k3._domainkey` → `dkim2/dkim3.mcsv.net` are **Mailchimp's**
  DKIM. Site settings → `newsletterUrl` still points at the Mailchimp landing
  page, so these stay until the newsletter has fully moved to the on-site form
  and Brevo.

**Not captured:** page rules and the redirect/transform rule phases — the
read-only token has DNS and zone-settings scope only, and Cloudflare answered
`9109 Unauthorized` / `10000 Authentication error` for those two. Nothing is
known to exist there, but **look at Rules → Page Rules and Rules → Redirect
Rules by eye before the switch**: a leftover rule from the Twill setup would
outlive the record change and could fight the new apex redirect.

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

1. In **DNS → Records**, delete the `CNAME www → ceramic-brussels.pages.dev`,
   then re-add these four, **proxied**, TTL auto:

   | Type | Name | Content |
   | :-- | :-- | :-- |
   | A | `ceramic.brussels` | `45.157.189.111` |
   | AAAA | `ceramic.brussels` | `2001:1600:4:9:f816:3eff:fe14:9a8` |
   | A | `www` | `45.157.189.111` |
   | AAAA | `www` | `2001:1600:4:9:f816:3eff:fe14:9a8` |

   The proxied flag is not decoration: without it the records answer with the
   origin's own address and the site comes back without a certificate. The same
   four lines, in restorable form, are in `zone-export-2026-10-05.txt`.
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
