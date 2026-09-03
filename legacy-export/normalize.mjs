import fs from 'node:fs';
const RAW = 'legacy-export/raw/ceramic-twill-export.json';
const OUT = 'legacy-export/normalized';
const d = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const LOCALES = ['en', 'fr', 'nl'];

// A Twill field value is a plain string; localised ones are JSON encoding {en,fr,nl}.
const parseValue = (v) => {
  if (typeof v !== 'string') return v;
  if (!/^[{[]/.test(v.trim())) return v;
  try {
    const p = JSON.parse(v);
    if (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).some(k => LOCALES.includes(k))) {
      const out = {};
      for (const l of LOCALES) if (p[l] != null && p[l] !== '') out[l] = p[l];
      return Object.keys(out).length ? out : null;
    }
    return p;
  } catch { return v; }
};

// Split "a[b][c]" honouring nested brackets: mediaMeta[blocks[8][image]][12][caption]
const segments = (name) => {
  const out = []; let i = name.indexOf('[');
  if (i === -1) return [name];
  out.push(name.slice(0, i));
  while (i < name.length && name[i] === '[') {
    let depth = 0, j = i;
    for (; j < name.length; j++) {
      if (name[j] === '[') depth++;
      else if (name[j] === ']' && --depth === 0) break;
    }
    out.push(name.slice(i + 1, j)); i = j + 1;
  }
  return out;
};

const cleanMedia = (m, role) => ({
  id: m.id, role, filename: m.name, url: m.original,
  width: m.width, height: m.height,
  tags: (m.tags || []).map(t => t.label ?? t.name ?? t),
  alt: parseValue(JSON.stringify(m.metadatas?.custom?.altText ?? {})) || m.metadatas?.default?.altText || null,
  caption: parseValue(JSON.stringify(m.metadatas?.custom?.caption ?? {})) || m.metadatas?.default?.caption || null,
  crop: m.crops?.default ? { w: m.crops.default.width, h: m.crops.default.height, x: m.crops.default.x, y: m.crops.default.y } : null,
});

function normalize(rec, listing) {
  const own = {};            // top-level fields
  const blockFields = {};    // blockId -> {field: value}
  const mediaMeta = {};      // "<scope>" -> mediaId -> {key: value}

  for (const f of rec.fields || []) {
    const seg = segments(f.name);
    const val = parseValue(f.value);
    if (seg[0] === 'blocks') { (blockFields[seg[1]] ??= {})[seg[2]] = val; continue; }
    if (seg[0] === 'mediaMeta') {
      const scope = seg[1].replace(/_\d+$/, '');
      ((mediaMeta[scope] ??= {})[seg[2]] ??= {})[seg[3]] = val;
      continue;
    }
    own[seg[0]] = val;
  }

  // media selections, split into block-scoped and record-scoped
  const recMedia = [], blockMedia = {};
  for (const [key, list] of Object.entries(rec.medias || {})) {
    const seg = segments(key);
    const items = (Array.isArray(list) ? list : [list]).filter(Boolean);
    if (seg[0] === 'blocks') {
      const arr = (blockMedia[seg[1]] ??= []);
      for (const m of items) arr.push(applyMeta(cleanMedia(m, seg[2]), mediaMeta, key, m.id));
    } else {
      for (const m of items) recMedia.push(applyMeta(cleanMedia(m, key), mediaMeta, key, m.id));
    }
  }

  // resolve select ids to their labels
  const labelOf = (field, value) => (rec.options?.[field] || []).find(o => String(o.value) === String(value))?.label ?? null;
  const attrs = {};
  for (const [k, v] of Object.entries(own)) {
    if (['title', 'slug', 'description', 'name'].includes(k)) continue;
    attrs[k] = v;
    if (k.endsWith('_id') && v !== '' && v != null) attrs[k.replace(/_id$/, '')] = labelOf(k, v);
  }

  const blocks = Object.values(rec.blocks || {}).flat().map((b, i) => {
    const f = blockFields[b.id] || {};
    return {
      id: b.id, position: i, type: String(b.type).replace(/^a17-block-/, ''),
      ...Object.fromEntries(Object.entries(f).filter(([, v]) => v != null && v !== '')),
      media: blockMedia[b.id] || [],
    };
  });

  return {
    module: rec.module, id: rec.id,
    published: !!(rec.publication?.published ?? listing?.published),
    listingTitle: listing?.title ?? null,
    depth: listing?.depth ?? 0,
    title: own.title ?? own.name ?? null,
    slug: own.slug ?? null,
    description: own.description ?? null,
    attrs,
    media: recMedia,
    blocks,
  };
}

function applyMeta(media, mediaMeta, key, id) {
  const scope = key.replace(/_\d+$/, '');
  const meta = mediaMeta[scope]?.[id] || mediaMeta[key]?.[id];
  if (meta) {
    if (meta.altText) media.alt = meta.altText;
    if (meta.caption) media.caption = meta.caption;
    for (const [k, v] of Object.entries(meta)) if (!['altText', 'caption'].includes(k)) (media.meta ??= {})[k] = v;
  }
  return media;
}

fs.mkdirSync(OUT, { recursive: true });
const byModule = {};
for (const rec of Object.values(d.records)) {
  const listing = rec.listing || {};
  (byModule[rec.module] ??= []).push(normalize(rec, listing));
}

// rebuild the page tree's parent links from the depth-ordered listing
for (const mod of Object.keys(byModule)) {
  const stack = [];
  for (const r of byModule[mod]) {
    stack.length = r.depth;
    r.parentId = r.depth > 0 ? (stack[r.depth - 1] ?? null) : null;
    stack[r.depth] = r.id;
  }
}

for (const [mod, rows] of Object.entries(byModule)) {
  fs.writeFileSync(`${OUT}/${mod}.json`, JSON.stringify(rows, null, 2));
  console.log(`${mod.padEnd(14)} ${String(rows.length).padStart(3)} records`);
}

const singles = {};
for (const [k, s] of Object.entries(d.singletons)) {
  if (!s || s.error) { singles[k] = { error: s?.error ?? 'missing' }; continue; }
  singles[k] = normalize({ ...s, module: k, id: k, options: s.options }, { title: k, published: true, depth: 0 });
}
fs.writeFileSync(`${OUT}/singletons.json`, JSON.stringify(singles, null, 2));
console.log('singletons     ', Object.keys(singles).join(', '));

const media = d.media.map(m => cleanMedia(m, null));
fs.writeFileSync(`${OUT}/media-library.json`, JSON.stringify(media, null, 2));
fs.writeFileSync(`${OUT}/file-library.json`, JSON.stringify(d.files, null, 2));
console.log('media          ', media.length, '| files', d.files.length);
