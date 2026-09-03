import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('legacy-export/raw/ceramic-twill-export.json','utf8'));
const N = f => JSON.parse(fs.readFileSync(`legacy-export/normalized/${f}.json`,'utf8'));
const mods = ['pages','exhibitors','pastEditions','parisPages'];
const isEmpty = v => v==null || v==='' || (typeof v==='object' && !Array.isArray(v) && Object.keys(v).length===0);
const LOC=['en','fr','nl'];
const pv = v => { if(typeof v!=='string') return v; if(!/^[{[]/.test(v.trim())) return v;
  try{ const p=JSON.parse(v); if(p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).some(k=>LOC.includes(k))){ const o={}; for(const l of LOC) if(p[l]!=null&&p[l]!=='') o[l]=p[l]; return Object.keys(o).length?o:null;} return p;}catch{return v;} };

let rawTop=0, rawBlock=0, rawMeta=0, rawEmpty=0;
for (const rec of Object.values(raw.records)) for (const f of rec.fields||[]) {
  const v = pv(f.value);
  if (isEmpty(v)) { rawEmpty++; continue; }
  if (f.name.startsWith('mediaMeta[')) rawMeta++;
  else if (f.name.startsWith('blocks[')) rawBlock++;
  else rawTop++;
}
let nTop=0, nBlock=0, nMeta=0;
for (const m of mods) for (const r of N(m)) {
  for (const k of ['title','slug','description']) if(!isEmpty(r[k])) nTop++;
  for (const [k,v] of Object.entries(r.attrs)) if(!isEmpty(v) && !['city','category'].includes(k)) nTop++;
  for (const b of r.blocks) nBlock += Object.keys(b).filter(k=>!['id','position','type','media'].includes(k)).length;
  for (const mm of [...r.media, ...r.blocks.flatMap(b=>b.media)]) {
    if (!isEmpty(mm.alt)) nMeta++;
    if (!isEmpty(mm.caption)) nMeta++;
    nMeta += Object.keys(mm.meta||{}).length;
  }
}
console.log('RAW  (non-empty)   top:',rawTop,' block:',rawBlock,' mediaMeta:',rawMeta,' | empty skipped:',rawEmpty);
console.log('NORM               top:',nTop,' block:',nBlock,' mediaMeta:',nMeta);
console.log('deltas             top:',nTop-rawTop,' block:',nBlock-rawBlock,' mediaMeta:',nMeta-rawMeta);
console.log('\nNOTE: normalised mediaMeta can exceed raw when alt/caption also come from the media library defaults.');
