import fs from 'node:fs';
const N = f => JSON.parse(fs.readFileSync(`legacy-export/normalized/${f}.json`,'utf8'));
const t = (v,l='en') => typeof v==='object'&&v ? (v[l]??v.en??v.fr??v.nl??'') : (v??'');
const strip = s => String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const out = [];
out.push('# Legacy site content inventory (ceramic.brussels Twill export)\n');
out.push(`Exported ${new Date().toISOString().slice(0,10)} from https://ceramic.brussels/admintool.\n`);

const pages = N('pages');
out.push('## Pages (47)\n');
out.push('Tree, with the block types each page is built from.\n');
for (const p of pages) {
  const comp = p.blocks.reduce((a,b)=>(a[b.type]=(a[b.type]||0)+1,a),{});
  const langs = ['en','fr','nl'].filter(l=>p.title?.[l]).join('/');
  out.push(`${'  '.repeat(p.depth)}- **${strip(t(p.title))}** \`/${t(p.slug)}\` — id ${p.id}${p.published?'':' _(draft)_'} · ${langs} · ${p.blocks.length} blocks${p.blocks.length?': '+Object.entries(comp).map(([k,v])=>`${k}×${v}`).join(', '):''}`);
}
const cat = {}, city = {}, year = {};
for (const e of N('exhibitors')) { cat[e.attrs.category ?? '—'] = (cat[e.attrs.category ?? '—']||0)+1; city[e.attrs.city ?? '—']=(city[e.attrs.city??'—']||0)+1; year[e.attrs.year ?? '—']=(year[e.attrs.year??'—']||0)+1; }
out.push('\n## Exhibitors (202)\n');
out.push('| Facet | Breakdown |\n| :-- | :-- |');
out.push(`| Category | ${Object.entries(cat).map(([k,v])=>`${k}: ${v}`).join(' · ')} |`);
out.push(`| City | ${Object.entries(city).map(([k,v])=>`${k}: ${v}`).join(' · ')} |`);
out.push(`| Year | ${Object.entries(year).sort().map(([k,v])=>`${k}: ${v}`).join(' · ')} |`);
const ex = N('exhibitors');
out.push(`\nFields per exhibitor: title, slug, description (rich text), booth, year, city, category, gallery images.`);
out.push(`Total gallery images across exhibitors: ${ex.reduce((a,e)=>a+e.media.length,0)}.`);
out.push(`With a booth number: ${ex.filter(e=>e.attrs.booth).length}. With images: ${ex.filter(e=>e.media.length).length}.`);

for (const [name,label] of [['pastEditions','Past editions (30)'],['parisPages','Manifest Paris pages (8)']]) {
  out.push(`\n## ${label}\n`);
  for (const r of N(name)) {
    const comp = r.blocks.reduce((a,b)=>(a[b.type]=(a[b.type]||0)+1,a),{});
    out.push(`- **${strip(t(r.title))}** \`/${t(r.slug)}\` — id ${r.id}${r.published?'':' _(draft)_'} · ${r.blocks.length} blocks${r.blocks.length?': '+Object.entries(comp).map(([k,v])=>`${k}×${v}`).join(', '):''}`);
  }
}
const s = JSON.parse(fs.readFileSync('legacy-export/normalized/singletons.json','utf8'));
out.push('\n## Singletons\n');
for (const [k,v] of Object.entries(s)) out.push(`- **${k}** — ${v.blocks?.length ?? 0} blocks${v.blocks?.length?': '+[...new Set(v.blocks.map(b=>b.type))].join(', '):''}`);
const media = N('media-library');
const tagged = media.filter(m=>m.tags.length).length;
out.push('\n## Media\n');
out.push(`- Media library: **${media.length}** images, ${tagged} tagged, ${media.filter(m=>m.alt).length} with alt text.`);
out.push(`- File library: **${N('file-library').length}** files.`);
out.push(`- Referenced by content: **${new Set([...pages,...ex,...N('pastEditions'),...N('parisPages')].flatMap(r=>[...r.media,...r.blocks.flatMap(b=>b.media)]).map(m=>m.id)).size}** distinct images.`);
const allBlocks = [...pages,...N('pastEditions'),...N('parisPages')].flatMap(r=>r.blocks).concat(Object.values(s).flatMap(v=>v.blocks||[]));
const bt = allBlocks.reduce((a,b)=>(a[b.type]=(a[b.type]||0)+1,a),{});
out.push('\n## Block types in use\n');
out.push('| Block | Count | Fields |\n| :-- | --: | :-- |');
for (const [k,v] of Object.entries(bt).sort((a,b)=>b[1]-a[1])) {
  const fields = [...new Set(allBlocks.filter(b=>b.type===k).flatMap(b=>Object.keys(b).filter(x=>!['id','position','type','media'].includes(x)).concat(b.media.length?['media:'+[...new Set(b.media.map(m=>m.role))].join('/')]:[])))];
  out.push(`| \`${k}\` | ${v} | ${fields.join(', ')} |`);
}
fs.writeFileSync('legacy-export/INVENTORY.md', out.join('\n')+'\n');
console.log(out.join('\n').slice(0,3000));
