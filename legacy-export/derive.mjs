import fs from 'node:fs';
const N = f => JSON.parse(fs.readFileSync(`legacy-export/normalized/${f}.json`,'utf8'));
const OUT='legacy-export/derived'; fs.mkdirSync(OUT,{recursive:true});
const t=(v,l='en')=>typeof v==='object'&&v?(v[l]??v.en??''):(v??'');
const strip=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const all = ['pages','pastEditions','parisPages'].flatMap(m=>N(m).map(r=>({...r,_mod:m})));

// people: every `person` block, tagged by the page it sits on
const people = [];
for (const p of all) for (const b of p.blocks.filter(b=>b.type==='person')) {
  people.push({ name: strip(t(b.title)), role: b.subtitle ?? null, bio: b.text ?? null,
    portrait: b.media[0] ? {id:b.media[0].id, url:b.media[0].url} : null,
    fromPage: strip(t(p.title)), fromModule: p._mod, pageId: p.id, blockId: b.id });
}
// partners: every `partner` block
const partners = [];
for (const p of all) for (const b of p.blocks.filter(b=>b.type==='partner')) {
  partners.push({ name: strip(t(b.title)), subtitle: b.subtitle ?? null, description: b.text ?? null,
    logos: b.media.map(m=>({id:m.id, url:m.url, link:m.meta?.link ?? null, small:m.meta?.small_size ?? null})),
    fromPage: strip(t(p.title)), fromModule: p._mod, pageId: p.id, blockId: b.id });
}
// events: every `event` block, with the preceding `title` block as its day heading
const events = [];
for (const p of all) {
  let heading = null;
  for (const b of p.blocks) {
    if (b.type==='title') { heading = {title: b.title ?? null, subtitle: b.subtitle ?? null}; continue; }
    if (b.type!=='event') continue;
    events.push({ title: strip(t(b.title)), description: b.text ?? null,
      start: b.start_hour ?? null, end: b.end_hour ?? null, dayHeading: heading,
      image: b.media[0] ? {id:b.media[0].id, url:b.media[0].url} : null,
      fromPage: strip(t(p.title)), fromModule: p._mod, pageId: p.id, blockId: b.id });
  }
}
// laureates / awards: title + text-2col (+ gallery) runs on laureate & award pages
const runs = [];
for (const p of all) {
  const isRun = /laureate|award/i.test(strip(t(p.title)));
  if (!isRun) continue;
  let cur = null;
  for (const b of p.blocks) {
    if (b.type==='title') { if(cur) runs.push(cur); cur = {heading: strip(t(b.title)), subtitle: b.subtitle ?? null, text:null, images:[], fromPage:strip(t(p.title)), fromModule:p._mod, pageId:p.id}; continue; }
    if (!cur) continue;
    if (b.type==='text-2col'||b.type==='text-1col') cur.text = b.text ?? cur.text;
    if (b.type==='gallery'||b.type==='image') cur.images.push(...b.media.map(m=>({id:m.id,url:m.url,caption:m.caption})));
  }
  if (cur) runs.push(cur);
}
// accordions -> FAQ candidates
const faqs = all.flatMap(p=>p.blocks.filter(b=>b.type==='accordion').map(b=>({q:b.title??null,a:b.text??null,fromPage:strip(t(p.title)),pageId:p.id})));

const write=(n,v)=>{fs.writeFileSync(`${OUT}/${n}.json`,JSON.stringify(v,null,2)); console.log(`${n.padEnd(12)} ${v.length}`);};
write('people',people); write('partners',partners); write('events',events); write('laureates-awards',runs); write('faq',faqs);

const uniq = a => [...new Set(a)];
console.log('\nUnique person names:', uniq(people.map(p=>p.name)).length, 'of', people.length, 'blocks');
console.log('Unique partner names:', uniq(partners.map(p=>p.name)).length, 'of', partners.length);
console.log('\nPerson groups by source page:');
for (const [k,v] of Object.entries(people.reduce((a,p)=>((a[`${p.fromModule}: ${p.fromPage}`] ??= []).push(p.name),a),{}))) console.log(`  ${k} — ${v.length}`);
console.log('\nPartner tiers by source page:');
for (const [k,v] of Object.entries(partners.reduce((a,p)=>((a[`${p.fromModule}: ${p.fromPage}`] ??= []).push(p.name),a),{}))) console.log(`  ${k} — ${v.length}: ${v.slice(0,4).join(', ')}${v.length>4?'…':''}`);
console.log('\nEvents by source page:');
for (const [k,v] of Object.entries(events.reduce((a,e)=>((a[`${e.fromModule}: ${e.fromPage}`] ??= []).push(e),a),{}))) console.log(`  ${k} — ${v.length}`);
console.log('\nLaureate/award runs:');
for (const [k,v] of Object.entries(runs.reduce((a,r)=>((a[`${r.fromModule}: ${r.fromPage}`] ??= []).push(r.heading),a),{}))) console.log(`  ${k} — ${v.length}: ${v.slice(0,3).join(' | ')}${v.length>3?'…':''}`);
