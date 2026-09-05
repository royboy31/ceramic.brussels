#!/usr/bin/env node
/**
 * Draws the thumbnails the Studio's "Add section" grid shows, one SVG per
 * block type, into public/section-previews/. Wireframes, not screenshots:
 * they only have to say "this is the one with the picture on the left".
 *
 *   node scripts/section-previews.mjs
 *
 * Re-run after adding a block type. The Studio reads them by schema type
 * name (see sectionsField in src/sanity/schemaTypes/objects/pageBuilder.ts).
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/section-previews');
const W = 320;
const H = 200;

const INK = '#1a1a1a';
const MUTED = '#c9c9c9';
const ACID = '#fff350';
const PAPER = '#ffffff';

const rect = (x, y, w, h, fill = MUTED, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const line = (x, y, w, h = 6, fill = INK) => rect(x, y, w, h, fill, 'rx="3"');
const rule = (x, y, w) => rect(x, y, w, 2, INK);
const text = (x, y, w, rows = 4, gap = 12, fill = MUTED) =>
  Array.from({ length: rows }, (_, i) => line(x, y + i * gap, i === rows - 1 ? w * 0.6 : w, 6, fill)).join('');
const heading = (x, y, w) => `${line(x, y, w * 0.55, 10)}${rule(x, y + 18, w)}`;
const picture = (x, y, w, h) =>
  `${rect(x, y, w, h, MUTED)}<path d="M${x} ${y + h} L${x + w * 0.35} ${y + h * 0.45} L${x + w * 0.55} ${y + h * 0.75} L${x + w * 0.7} ${y + h * 0.55} L${x + w} ${y + h}" fill="#b0b0b0"/>`;
const dot = (x, y, r = 3, fill = INK) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const pill = (x, y, w, fill = PAPER) => `<rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;

const M = 24; // margin
const CW = W - 2 * M; // content width

const BLOCKS = {
  contentSection: () => `${heading(M, 30, CW)}${text(M, 62, 128, 6)}${text(M + 144, 62, 128, 6)}`,
  imageTextSection: () => `${picture(M, 30, 168, 140)}${heading(M + 184, 30, 88)}${text(M + 184, 62, 88, 5)}`,
  gallerySection: () => `${picture(M, 40, 84, 60)}${picture(M + 94, 40, 84, 60)}${picture(M + 188, 40, 84, 60)}${picture(M, 110, 84, 60)}${picture(M + 94, 110, 84, 60)}${picture(M + 188, 110, 84, 60)}`,
  slideshowSection: () => `${picture(M, 30, CW, 120)}${dot(W / 2 - 14, 165)}${dot(W / 2, 165, 3, MUTED)}${dot(W / 2 + 14, 165, 3, MUTED)}${line(M, 172, 22, 5)}${line(W - M - 90, 172, 90, 5, MUTED)}`,
  videoSection: () => `${rect(M, 30, CW, 140, INK)}<polygon points="${W / 2 - 14},${H / 2 - 20} ${W / 2 - 14},${H / 2 + 20} ${W / 2 + 22},${H / 2}" fill="${PAPER}"/>`,
  quoteSection: () => `${rule(M, 34, CW)}<text x="${M}" y="96" font-family="Georgia, serif" font-size="56" fill="${INK}">“</text>${line(M + 40, 70, 200, 10)}${line(M + 40, 90, 150, 10)}${line(M + 40, 118, 90, 6, MUTED)}${rule(M, 164, CW)}`,
  spotlight: () => `${line(M, 44, 60, 8, MUTED)}${line(M, 62, 120, 14)}${line(M, 82, 100, 14)}${line(M, 120, 70, 6)}${picture(M + 146, 30, 126, 140)}`,
  bannerSection: () => `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACID}"/><stop offset="0.5" stop-color="${PAPER}"/><stop offset="1" stop-color="${ACID}"/></linearGradient></defs>${rect(0, 60, W, 80, 'url(#g)')}${line(W / 2 - 90, 94, 180, 12)}`,
  linksSection: () => `${pill(M, 90, 80)}${pill(M + 92, 90, 96)}${pill(M + 200, 90, 72, INK)}`,
  headingSection: () => `${rule(M, 70, CW)}${line(M, 84, 180, 22)}`,
  peopleSection: () => `${line(M, 34, 100, 8)}${rule(M, 48, 128)}${rect(M, 58, 40, 50, MUTED)}${text(M + 50, 60, 78, 4, 11)}${line(M + 144, 34, 100, 8)}${rule(M + 144, 48, 128)}${rect(M + 144, 58, 40, 50, MUTED)}${text(M + 194, 60, 78, 4, 11)}${rule(M, 122, 128)}${rect(M, 132, 40, 50, MUTED)}${text(M + 50, 134, 78, 4, 11)}${rule(M + 144, 122, 128)}${rect(M + 144, 132, 40, 50, MUTED)}${text(M + 194, 134, 78, 4, 11)}`,
  keyFiguresSection: () => `${rule(0, 50, W)}${rule(W / 2, 50, 2)}<line x1="${W / 2}" y1="50" x2="${W / 2}" y2="170" stroke="${INK}" stroke-width="2"/>${rule(0, 110, W)}${rule(0, 170, W)}<text x="${M}" y="96" font-family="sans-serif" font-size="40" fill="${INK}">12k</text>${line(M + 82, 84, 50, 8, MUTED)}<text x="${W / 2 + 20}" y="96" font-family="sans-serif" font-size="40" fill="${INK}">60</text>${line(W / 2 + 76, 84, 50, 8, MUTED)}<text x="${M}" y="156" font-family="sans-serif" font-size="40" fill="${INK}">90</text>${line(M + 82, 144, 50, 8, MUTED)}<text x="${W / 2 + 20}" y="156" font-family="sans-serif" font-size="40" fill="${INK}">5</text>${line(W / 2 + 50, 144, 60, 8, MUTED)}`,
  newsSection: () => `${line(W / 2 - 50, 22, 100, 12)}${line(M, 60, 80, 6, MUTED)}${line(M, 74, 110, 12)}${line(M, 110, 50, 6)}${picture(M + 146, 52, 126, 60)}${picture(M, 122, 126, 60)}${line(M + 146, 130, 80, 6, MUTED)}${line(M + 146, 144, 110, 12)}${line(M + 146, 170, 50, 6)}`,
  faqSection: () => [0, 1, 2, 3].map((i) => `${rule(M, 44 + i * 34, CW)}${line(M, 54 + i * 34, 150 + (i % 2) * 40, 10)}<text x="${W - M - 12}" y="66 " font-family="sans-serif" font-size="14" fill="${INK}" transform="translate(0 ${i * 34})">↓</text>`).join('') + rule(M, 44 + 4 * 34, CW),
  embedSection: () => `<rect x="${M}" y="30" width="${CW}" height="140" fill="${PAPER}" stroke="${INK}" stroke-width="2" stroke-dasharray="6 4"/>${line(M + 16, 46, 60, 6, MUTED)}${rect(M + 16, 62, CW - 32, 92, '#eeeeee')}<text x="${W / 2}" y="114" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${INK}">https://…</text>`,
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, draw] of Object.entries(BLOCKS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rect(0, 0, W, H, PAPER)}${draw()}</svg>\n`;
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
}
console.log(`${Object.keys(BLOCKS).length} previews written to ${path.relative(process.cwd(), OUT)}`);
