import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('legacy-export/raw/ceramic-twill-export.json','utf8'));
const pat = s => s.replace(/\[\d+\]/g,'[#]').replace(/gallery_\d+/g,'gallery_#');
const acc = { fieldsByMod:{}, blockTypes:{}, mediaKeys:{}, browserKeys:{}, repeaterKeys:{}, attrKeys:{} };
const bump=(o,k)=>o[k]=(o[k]||0)+1;
for (const [key,r] of Object.entries(d.records)) {
  const mod = r.module;
  acc.fieldsByMod[mod] ??= {};
  for (const f of r.fields||[]) bump(acc.fieldsByMod[mod], pat(f.name));
  for (const list of Object.values(r.blocks||{})) for (const b of list||[]) bump(acc.blockTypes, b.type);
  for (const k of Object.keys(r.medias||{})) bump(acc.mediaKeys, pat(k));
  for (const k of Object.keys(r.browsers||{})) bump(acc.browserKeys, pat(k));
  for (const k of Object.keys(r.repeaters||{})) bump(acc.repeaterKeys, pat(k));
  if (r.attributes && typeof r.attributes==='object') for (const k of Object.keys(r.attributes)) bump(acc.attrKeys, k);
}
for (const s of [d.singletons.homepage, d.singletons.settings_contact]) {
  if(!s||s.error) continue;
  acc.fieldsByMod[s.label] ??= {};
  for (const f of s.fields||[]) bump(acc.fieldsByMod[s.label], pat(f.name));
  for (const list of Object.values(s.blocks||{})) for (const b of list||[]) bump(acc.blockTypes, b.type);
}
console.log(JSON.stringify(acc,null,1));
