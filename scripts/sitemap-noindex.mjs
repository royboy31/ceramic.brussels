#!/usr/bin/env node
/**
 * Drops every noindex page from the sitemap. Runs after `astro build`.
 *
 * The sitemap integration filters by URL and never sees the page, so a page
 * an editor marked "hide from search engines" (seo.noIndex - the thank-you
 * page, say) was listed with the rest, which contradicts the robots tag on
 * the page itself. This reads each listed page's HTML back from dist and
 * removes the entries whose <head> carries `<meta name="robots"
 * content="noindex">`. The index file needs no change: it names the sitemap
 * file, not the pages.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const files = fs.readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const NOINDEX = /<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i;

let dropped = 0;
for (const file of files) {
  const full = path.join(dist, file);
  const xml = fs.readFileSync(full, 'utf8');
  const kept = xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) return entry;
    const pathname = new URL(loc).pathname;
    const html = path.join(dist, pathname, 'index.html');
    if (!fs.existsSync(html)) return entry;
    if (!NOINDEX.test(fs.readFileSync(html, 'utf8').slice(0, 8000))) return entry;
    dropped++;
    return '';
  });
  if (kept !== xml) fs.writeFileSync(full, kept);
}
console.log(`[sitemap-noindex] ${dropped} noindex page(s) removed from ${files.join(', ')}`);
