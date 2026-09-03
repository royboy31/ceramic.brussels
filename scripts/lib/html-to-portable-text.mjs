/**
 * Converts the HTML that the old Twill site stored in its rich-text fields
 * into Portable Text blocks matching `richTextBlock` in
 * src/sanity/schemaTypes/objects/richText.ts.
 *
 * The legacy corpus only ever uses nine tags - p, a, br, strong, u, em, h4,
 * ul, li - so this is a small hand-rolled parser rather than a DOM dependency.
 * Anything unrecognised degrades to its text content instead of being dropped.
 *
 * Keys are derived from a counter seeded per call, so converting the same HTML
 * twice yields byte-identical output and a re-import is a no-op.
 */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', eacute: 'é',
  egrave: 'è', agrave: 'à', ccedil: 'ç', deg: '°',
};

export const decodeEntities = (s) =>
  String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);

/** Tag -> Portable Text decorator. `u` is the only rename. */
const DECORATORS = { strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'underline', s: 'strike-through', code: 'code' };
/** Block-level tags and the style they map to. */
const STYLES = { p: 'normal', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4', blockquote: 'blockquote' };

/** Tokenise into tags and text. */
function tokenize(html) {
  const out = [];
  const re = /<\/?([a-z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/gi;
  let last = 0, m;
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ text: html.slice(last, m.index) });
    out.push({ tag: m[1].toLowerCase(), close: m[0][1] === '/', attrs: m[2] || '' });
    last = re.lastIndex;
  }
  if (last < html.length) out.push({ text: html.slice(last) });
  return out;
}

const attr = (attrs, name) => {
  const m = attrs.match(new RegExp(`${name}\s*=\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? decodeEntities(m[2] ?? m[3] ?? '') : null;
};

/**
 * @param {string} html
 * @param {{keyPrefix?: string}} [opts]
 * @returns {Array} Portable Text blocks (empty array when there is no content)
 */
export function htmlToPortableText(html, opts = {}) {
  if (!html || typeof html !== 'string') return [];
  const prefix = opts.keyPrefix ?? 'b';
  let n = 0;
  const key = () => `${prefix}${(n++).toString(36)}`;

  const blocks = [];
  let block = null;             // current block being filled
  let marks = [];               // open decorators
  let linkStack = [];           // open link annotations
  let listItem = null;          // 'bullet' | 'number' when inside <li>

  const startBlock = (style) => {
    block = { _type: 'block', _key: key(), style: style ?? 'normal', markDefs: [], children: [] };
    if (listItem) { block.listItem = listItem; block.level = 1; }
  };
  const pushText = (raw) => {
    const text = decodeEntities(raw).replace(/\s+/g, ' ');
    if (!text) return;
    if (!block) startBlock('normal');
    if (!text.trim() && !block.children.length) return;
    const activeMarks = [...marks, ...linkStack.map((l) => l._key)];
    const prev = block.children[block.children.length - 1];
    if (prev && prev.marks.join('|') === activeMarks.join('|')) prev.text += text;
    else block.children.push({ _type: 'span', _key: key(), text, marks: activeMarks });
  };
  const endBlock = () => {
    if (!block) return;
    // trim edges and drop blocks that ended up with no real text
    if (block.children.length) {
      block.children[0].text = block.children[0].text.replace(/^\s+/, '');
      const last = block.children[block.children.length - 1];
      last.text = last.text.replace(/\s+$/, '');
    }
    block.children = block.children.filter((c) => c.text !== '');
    if (block.children.length) blocks.push(block);
    block = null;
  };

  for (const tok of tokenize(html)) {
    if (tok.text !== undefined) { pushText(tok.text); continue; }
    const { tag, close, attrs } = tok;

    if (tag === 'br') { if (block?.children.length) pushText(' '); continue; }

    if (STYLES[tag]) { endBlock(); if (!close) startBlock(STYLES[tag]); continue; }

    if (tag === 'ul' || tag === 'ol') {
      endBlock();
      listItem = close ? null : tag === 'ul' ? 'bullet' : 'number';
      continue;
    }
    if (tag === 'li') { endBlock(); if (!close) startBlock('normal'); continue; }

    if (DECORATORS[tag]) {
      const d = DECORATORS[tag];
      if (close) marks = marks.filter((x) => x !== d);
      else if (!marks.includes(d)) marks.push(d);
      continue;
    }

    if (tag === 'a') {
      if (close) { linkStack.pop(); continue; }
      const href = attr(attrs, 'href');
      if (!href) continue;
      const def = { _type: 'link', _key: key(), href };
      if (!block) startBlock('normal');
      block.markDefs.push(def);
      linkStack.push(def);
      continue;
    }
    // unknown tag: ignore the tag, keep its text
  }
  endBlock();

  // markDefs that ended up unused (link wrapping only whitespace) would fail validation
  for (const b of blocks) {
    const used = new Set(b.children.flatMap((c) => c.marks));
    b.markDefs = b.markDefs.filter((d) => used.has(d._key));
  }
  return blocks;
}

/** Convert a `{en,fr,nl}` HTML object into a localeBlock value. */
export function localeHtmlToBlocks(value, keyPrefix = 'b') {
  if (!value) return null;
  if (typeof value === 'string') return { en: htmlToPortableText(value, { keyPrefix }) };
  const out = {};
  for (const [loc, html] of Object.entries(value)) {
    const blocks = htmlToPortableText(html, { keyPrefix: `${keyPrefix}${loc}` });
    if (blocks.length) out[loc] = blocks;
  }
  return Object.keys(out).length ? out : null;
}

/** Plain text of an HTML string, for slugs/labels. */
export const htmlToText = (html) =>
  decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
