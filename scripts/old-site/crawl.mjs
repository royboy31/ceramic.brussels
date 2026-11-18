// Crawl the old Twill site straight from its origin server (the domain now
// points to Pages). Usage: node scripts/old-site/crawl.mjs <rawDir>
// Works only while the Twill server at 45.157.189.111 is still running.
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN_IP = '45.157.189.111';
const OUT = process.argv[2];
const HOST = 'www.ceramic.brussels';
const agent = new https.Agent({ keepAlive: true, maxSockets: 4, rejectUnauthorized: false,
  lookup: (h, o, cb) => o && o.all ? cb(null, [{ address: ORIGIN_IP, family: 4 }]) : cb(null, ORIGIN_IP, 4) });

function get(p) {
  return new Promise((res, rej) => {
    const req = https.request({ host: HOST, servername: HOST, path: p, agent, headers: { 'user-agent': 'cb-archive' }, timeout: 60000 }, r => {
      const chunks = []; r.on('data', c => chunks.push(c));
      r.on('end', () => res({ status: r.statusCode, location: r.headers.location, type: r.headers['content-type'] || '', body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', rej); req.end();
  });
}

const SKIP = /^\/(img|admintool|storage|build|api|login|livewire)\b|\.(jpe?g|png|gif|svg|pdf|webp|zip|mp4)$/i;
function norm(href) {
  try {
    const u = new URL(href, `https://${HOST}/`);
    if (!/^(www\.)?ceramic\.brussels$/.test(u.hostname)) return null;
    let p = decodeURI(u.pathname).replace(/\/+$/, '') || '/';
    if (SKIP.test(p)) return null;
    return encodeURI(p);
  } catch { return null; }
}

const seen = new Set(); const queue = ['/en', '/fr', '/nl'];
const log = { pages: {}, redirects: {}, errors: {} };
queue.forEach(q => seen.add(q));
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    try {
      const r = await get(p);
      if (r.status >= 300 && r.status < 400) {
        log.redirects[p] = r.location; const n = norm(r.location);
        if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
        continue;
      }
      if (r.status !== 200 || !r.type.includes('html')) { log.errors[p] = r.status; continue; }
      const html = r.body.toString('utf8');
      const file = path.join(OUT, decodeURI(p) === '/' ? 'index' : decodeURI(p), 'index.html');
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, html);
      log.pages[p] = html.length;
      for (const m of html.matchAll(/href="([^"#]+)/g)) {
        const n = norm(m[1].replace(/&amp;/g, '&').split('?')[0]);
        if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
      }
      if (Object.keys(log.pages).length % 50 === 0) console.log(Object.keys(log.pages).length, 'pages, queue', queue.length);
    } catch (e) { log.errors[p] = String(e.message); }
  }
}
// queue can grow while workers run: loop until stable
while (queue.length) await Promise.all([1, 2, 3, 4].map(worker));
fs.writeFileSync(path.join(OUT, '..', 'crawl-log.json'), JSON.stringify(log, null, 1));
console.log('pages', Object.keys(log.pages).length, 'redirects', Object.keys(log.redirects).length, 'errors', Object.keys(log.errors).length);
