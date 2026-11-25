// Builds one self-contained review page that shows newsletter templates at
// desktop and phone width, one tab per template, for sharing a review link
// (a claude.ai artifact, or any static host). Every image and font is
// embedded as a data: URI, because a shared page may not load files from
// other sites; a file used by several templates is embedded once.
//
//   node newsletters/build-share.mjs out.html newsletters/mailchimp/vip.html [more templates...]
//
// Like Mailchimp, it shows the first layout of each mc:variant block, and
// fills the merge fields with sample values.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) {
  console.error('usage: node newsletters/build-share.mjs out.html template.html [template.html...]');
  process.exit(1);
}

// Tab names and labels, by file name.
const NAMES = {
  vip: 'VIPs of ceramic',
  monthly: 'Monthly, November',
  galleries: 'Participating galleries 2027',
  basel: 'Destination Basel',
};

const SAMPLE = {
  VIPCODE: 'CB27-7KQ4-XM2P',
  MC_PREVIEW_TEXT: '',
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

// Every distinct file becomes one entry of ASSETS; templates refer to it as @@n@@.
const assets = [];
const index = new Map();
async function token(url) {
  const real = url.replaceAll('&amp;', '&');
  if (index.has(real)) return index.get(real);
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
  const t = `@@${assets.length}@@`;
  assets.push(`data:${type};base64,${buf.toString('base64')}`);
  index.set(real, t);
  return t;
}

const emails = [];
for (const input of inputs) {
  const id = path.basename(input, '.html');
  let html = await readFile(path.join(root, input), 'utf8');
  html = firstVariants(html);
  html = html.replace(/\*\|([A-Z_:]+)\|\*/g, (m, k) => (k in SAMPLE ? SAMPLE[k] : k === 'MC:SUBJECT' ? (NAMES[id] || id) : m));
  const urls = new Set(html.match(/https?:\/\/[^"')\s]+?\.(?:jpe?g|png|gif|webp|woff2)(?:\?[^"')\s]*)?/g) || []);
  for (const url of urls) html = html.split(url).join(await token(url));
  emails.push({ id, name: NAMES[id] || id, html });
}

const fontFaces = [400, 500, 600, 900].map((w) => {
  const t = index.get(`https://www.ceramic.brussels/fonts/noi-grotesk-${w}.woff2`);
  return t ? `@font-face{font-family:'Noi Grotesk';font-weight:${w};font-style:normal;font-display:swap;src:url('${assets[Number(t.slice(2, -2))]}') format('woff2')}` : '';
}).join('\n');

const json = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');
const shell = await readFile(path.join(root, 'newsletters/share-shell.html'), 'utf8');
const page = shell
  .replace('/*FONT_FACES*/', fontFaces)
  .replace('"EMAILS_JSON"', json(emails))
  .replace('"ASSETS_JSON"', json(assets));

await writeFile(path.resolve(output), page);
console.log(`${output}: ${(page.length / 1024 / 1024).toFixed(2)} MB, ${emails.length} templates, ${assets.length} files embedded`);
