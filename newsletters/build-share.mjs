// Builds one self-contained page that shows a newsletter template at desktop
// and phone width, for sharing a review link (a claude.ai artifact, or any
// static host). Every image and font is embedded as a data: URI, because a
// shared page may not load files from other sites.
//
//   node newsletters/build-share.mjs newsletters/mailchimp/vip.html out.html
//
// Like Mailchimp, it shows the first layout of each mc:variant block, and
// fills the merge fields with sample values.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [input = 'newsletters/mailchimp/vip.html', output = 'newsletters/share.html'] = process.argv.slice(2);

const SAMPLE = {
  VIPCODE: 'CB27-7KQ4-XM2P',
  MC_PREVIEW_TEXT: 'Your VIP news for November',
  'MC:SUBJECT': 'VIPs of ceramic',
  EMAIL: 'guest@example.com',
  ABOUT_LIST: '#', UNSUB: '#', UPDATE_PROFILE: '#',
  'LIST:ADDRESSLINE': 'ceramic brussels · 148c rue Franz Merjay · Ixelles 1050 · Belgium',
};

// Keep the first element of each mc:repeatable group that has variants.
function firstVariants(html) {
  const seen = new Set();
  let out = html;
  for (;;) {
    const re = /<(\w+)\b[^>]*mc:repeatable="([^"]+)"[^>]*mc:variant="[^"]*"[^>]*>/g;
    let m, cut = null;
    while ((m = re.exec(out))) {
      const key = m[2];
      if (!seen.has(key)) { seen.add(key); continue; }
      // a later variant of a seen group: find its matching close tag
      const tag = m[1];
      const open = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
      open.lastIndex = m.index;
      let depth = 0, end = -1, t;
      while ((t = open.exec(out))) {
        depth += t[0].startsWith('</') ? -1 : 1;
        if (depth === 0) { end = t.index + t[0].length; break; }
      }
      cut = [m.index, end];
      break;
    }
    if (!cut) return out;
    out = out.slice(0, cut[0]) + out.slice(cut[1]);
    seen.clear();
  }
}

const cache = new Map();
async function dataUri(url) {
  const real = url.replaceAll('&amp;', '&');
  if (cache.has(real)) return cache.get(real);
  let buf, type;
  const local = real.match(/^https:\/\/www\.ceramic\.brussels\/((?:fonts|assets)\/.+)$/);
  if (local) {
    buf = await readFile(path.join(root, 'public', local[1]));
    type = local[1].endsWith('.woff2') ? 'font/woff2' : local[1].endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else {
    const res = await fetch(real);
    if (!res.ok) throw new Error(`${res.status} for ${real}`);
    buf = Buffer.from(await res.arrayBuffer());
    type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  }
  const uri = `data:${type};base64,${buf.toString('base64')}`;
  cache.set(real, uri);
  return uri;
}

async function embed(html) {
  const urls = new Set(html.match(/https?:\/\/[^"')\s]+?\.(?:jpe?g|png|webp|woff2)(?:\?[^"')\s]*)?/g) || []);
  for (const url of urls) html = html.split(url).join(await dataUri(url));
  return html;
}

let email = await readFile(path.join(root, input), 'utf8');
email = firstVariants(email);
email = email.replace(/\*\|([A-Z_:]+)\|\*/g, (m, k) => (k in SAMPLE ? SAMPLE[k] : m));
email = await embed(email);

const fontFaces = [400, 500, 600, 900].map((w) => `@font-face{font-family:'Noi Grotesk';font-weight:${w};font-style:normal;font-display:swap;src:url('${cache.get(`https://www.ceramic.brussels/fonts/noi-grotesk-${w}.woff2`)}') format('woff2')}`).join('\n');

const shell = await readFile(path.join(root, 'newsletters/share-shell.html'), 'utf8');
const page = shell
  .replace('/*FONT_FACES*/', fontFaces)
  .replace('"EMAIL_HTML"', JSON.stringify(email).replace(/<\//g, '<\\/'));

await writeFile(path.resolve(output), page);
console.log(`${output}: ${(page.length / 1024).toFixed(0)} KB, ${cache.size} files embedded`);
