import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('legacy-export/raw/ceramic-twill-export.json','utf8'));
// find a record containing accordion / person / partner / event blocks
const want = ['a17-block-accordion','a17-block-person','a17-block-partner','a17-block-event'];
for (const type of want) {
  const hit = Object.entries(d.records).find(([k,r]) => Object.values(r.blocks||{}).flat().some(b=>b.type===type));
  if (!hit) { console.log(type,'-> none'); continue; }
  const [key,r] = hit;
  const b = Object.values(r.blocks).flat().find(x=>x.type===type);
  const own = (r.fields||[]).filter(f=>f.name.includes(`blocks[${b.id}]`)).map(f=>({n:f.name, v:JSON.stringify(f.value).slice(0,120)}));
  const med = Object.keys(r.medias||{}).filter(k=>k.includes(`blocks[${b.id}]`));
  console.log('\n===',type,'in',key,'block',b.id);
  console.log(' block obj:', JSON.stringify({...b, attributes:b.attributes?Object.keys(b.attributes):null}).slice(0,300));
  console.log(' fields:', JSON.stringify(own,null,1).slice(0,700));
  console.log(' medias:', med.join(', '));
}
const r0 = d.records['pages:1'];
console.log('\n=== repeaters shape:', JSON.stringify(r0.repeaters).slice(0,400));
console.log('=== attributes shape:', JSON.stringify(r0.attributes).slice(0,300));
console.log('=== publication:', JSON.stringify(r0.publication).slice(0,500));
