import fs from 'node:fs';
const N = f => JSON.parse(fs.readFileSync(`legacy-export/normalized/${f}.json`,'utf8'));
const raw = JSON.parse(fs.readFileSync('legacy-export/raw/ceramic-twill-export.json','utf8'));
const mods = ['pages','exhibitors','pastEditions','parisPages'];
const issues = [];
let totalBlocks=0, totalMedia=0;
for (const m of mods) {
  const rows = N(m);
  for (const r of rows) {
    totalBlocks += r.blocks.length; totalMedia += r.media.length + r.blocks.reduce((a,b)=>a+b.media.length,0);
    if (!r.title) issues.push(`${m}:${r.id} no title`);
    if (!r.slug && m!=='parisPages') issues.push(`${m}:${r.id} no slug`);
    for (const b of r.blocks) if (Object.keys(b).filter(k=>!['id','position','type','media'].includes(k)).length===0 && b.media.length===0) issues.push(`${m}:${r.id} block ${b.id} (${b.type}) empty`);
  }
}
// field-count parity: every raw field must land somewhere
let rawFields=0, mapped=0;
for (const rec of Object.values(raw.records)) {
  for (const f of rec.fields||[]) { rawFields++; }
}
const norm = Object.fromEntries(mods.map(m=>[m,N(m)]));
for (const m of mods) for (const r of norm[m]) {
  mapped += ['title','slug','description'].filter(k=>r[k]!=null).length;
  mapped += Object.keys(r.attrs).filter(k=>!norm.__x && !k.match(/^(city|category)$/)).length;
  for (const b of r.blocks) mapped += Object.keys(b).filter(k=>!['id','position','type','media'].includes(k)).length;
}
console.log('blocks:', totalBlocks, ' media refs:', totalMedia);
console.log('raw field entries:', rawFields, ' mapped (excl. mediaMeta):', mapped);
console.log('issues:', issues.length);
console.log(issues.slice(0,15).join('\n'));
console.log('\n--- sample page ---');
const p = N('pages').find(r=>r.blocks.length>3);
console.log(JSON.stringify({...p, blocks: p.blocks.slice(0,3)}, null, 1).slice(0,1600));
