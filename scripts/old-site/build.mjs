// Turn the crawled Twill pages into a static archive served at /old-site/.
// Usage: node scripts/old-site/build.mjs <rawDir> public/old-site
// Rewrites links under /old-site/, serves images from Sanity where the import
// uploaded them (legacy-export/asset-map.json) and copies the rest from the old
// server; strips Google Analytics so archive views never reach the live property.
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const [RAW, OUT] = process.argv.slice(2);
const L = new URL('../../legacy-export/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = '/old-site';
const HOST = 'www.ceramic.brussels';
const agent = new https.Agent({ keepAlive: true, maxSockets: 4, rejectUnauthorized: false,
  lookup: (h, o, cb) => o && o.all ? cb(null, [{ address: '45.157.189.111', family: 4 }]) : cb(null, '45.157.189.111', 4) });
const get = p => new Promise((res, rej) => {
  const req = https.request({ host: HOST, servername: HOST, path: encodeURI(decodeURI(p)), agent, timeout: 120000 }, r => {
    const c = []; r.on('data', d => c.push(d)); r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(c) }));
  });
  req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', rej); req.end();
});

// old /img/<uuid>/<file> path -> Sanity asset id
const media = JSON.parse(fs.readFileSync(L + 'normalized/media-library.json'));
const amap = JSON.parse(fs.readFileSync(L + 'asset-map.json'));
const sanityOf = {};
for (const m of Array.isArray(media) ? media : Object.values(media)) {
  const a = amap[m.id]; if (!a) continue;
  const [, hash, dims, ext] = a.match(/^image-([0-9a-f]+)-(\d+x\d+)-(\w+)$/) || [];
  if (hash) sanityOf[decodeURI(new URL(m.url).pathname)] = `https://cdn.sanity.io/images/5hqzhin7/production/${hash}-${dims}.${ext}`;
}

const pages = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : pages.push(p); } })(RAW);
const downloads = new Map(); // site path -> local archive path
const local = (p) => { const clean = decodeURI(p).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\/.\-]/g, '-'); downloads.set(p, clean); return BASE + encodeURI(clean); };

function img(pathname, query) {
  const w = Math.min(Number(new URLSearchParams(query.replace(/&amp;/g, '&')).get('w')) || 1280, 2000);
  const s = sanityOf[decodeURI(pathname)];
  if (s) return `${s}?w=${w}&fit=max&auto=format`;
  return local(pathname); // one local copy per image, fetched at 1280
}

const BANNER = `<div style="position:fixed;left:12px;bottom:52px;z-index:9999;max-width:calc(100vw - 24px);background:#111;color:#fff;font:13px/1.4 system-ui,sans-serif;padding:6px 12px;border-radius:999px">Archive of the old site, as it ran until 5 October 2026 &middot; <a href="https://www.ceramic.brussels/" style="color:#fff;text-decoration:underline">current site</a></div>`;

let n = 0;
for (const file of pages) {
  let h = fs.readFileSync(file, 'utf8');
  h = h
    // analytics and structured data: never report archive views, never look like the live site
    .replace(/<script[^>]*googletagmanager[^>]*><\/script>/g, '')
    .replace(/<script>\s*window\.dataLayer[\s\S]*?<\/script>/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/<link rel="(canonical|alternate|icon|apple-touch-icon|manifest)"[^>]*>/g, '')
    .replace(/<meta name="robots"[^>]*>/g, '')
    .replace(/<head>/, '<head>\n<meta name="robots" content="noindex, nofollow">')
    .replace(/(<body[^>]*>)/, `$1\n${BANNER}`)
    // responsive ladders: one src is enough for an archive
    .replace(/\s+srcset="[^"]*"/g, '')
    // images
    .replace(/https?:\/\/(?:www\.)?ceramic\.brussels(\/img\/[^"?\s]+)(\?[^"\s]*)?/g, (_, p, q = '') => img(p, q))
    // build assets and uploads
    .replace(/https?:\/\/(?:www\.)?ceramic\.brussels(\/(?:build|storage)\/[^"'\s)]+)/g, (_, p) => local(p))
    // pages
    .replace(/(href=")https?:\/\/(?:www\.)?ceramic\.brussels(\/[^"#?]*)?([#?][^"]*)?"/g, (_, a, p = '/', rest = '') =>
      `${a}${BASE}${(p.replace(/\/+$/, '') || '/en')}/${rest}"`)
    .replace(/(href=")\/(?!old-site\/|\/)([^"]*)"/g, (_, a, p) => `${a}${BASE}/${p}"`)
    // protocol-less external links were broken on the old site too
    .replace(/href="(www\.[^"]+)"/g, 'href="https://$1"');
  const rel = path.relative(RAW, file);
  fs.mkdirSync(path.join(OUT, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), h); n++;
}

// fixed extras
for (const p of ['/build/assets/app-554f02e4.js', '/build/assets/photoswipe.esm-1464cdb9.js', '/build/assets/app-89c36f64.css']) downloads.set(p, p);
const failed = [];
for (const [remote, localPath] of downloads) {
  const dest = path.join(OUT, localPath);
  if (fs.existsSync(dest)) continue;
  const isImg = remote.startsWith('/img/');
  let r = await get(remote + (isImg ? '?fm=jpg&q=72&fit=max&w=1000' : '')).catch(e => ({ status: String(e) }));
  if (isImg && r.status !== 200) r = await get(remote).catch(e => ({ status: String(e) }));
  if (r.status !== 200) { failed.push([remote, r.status]); continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let body = r.body;
  if (/\.(css|js)$/.test(remote)) {
    let t = body.toString('utf8').replaceAll('url(/build/', `url(${BASE}/build/`).replaceAll('"/build/"', `"${BASE}/build/"`);
    body = Buffer.from(t);
    for (const m of t.matchAll(/url\(\/old-site(\/build\/[^)]+)\)/g)) if (!downloads.has(m[1])) downloads.set(m[1], m[1]);
  }
  fs.writeFileSync(dest, body);
}
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=${BASE}/en/"><title>Old site archive</title><a href="${BASE}/en/">Old site archive</a>`);
console.log('pages', n, 'files', downloads.size, 'failed', failed);
