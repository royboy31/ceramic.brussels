import fs from 'node:fs';
const cur = JSON.parse(fs.readFileSync('legacy-export/current-sanity.json','utf8'));
const D = f => JSON.parse(fs.readFileSync(`legacy-export/derived/${f}.json`,'utf8'));
const N = f => JSON.parse(fs.readFileSync(`legacy-export/normalized/${f}.json`,'utf8'));
const t=(v,l='en')=>typeof v==='object'&&v?(v[l]??v.en??''):(v??'');
const strip=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
// normalise a name for matching: lowercase, de-accent, drop "(pl)" country suffix and punctuation
const key = s => strip(s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/\((?:[a-z]{2})\)\s*$/,'')
  .replace(/[^a-z0-9]+/g,' ').trim();

const byType = ty => cur.filter(d=>d._type===ty);
const report = [];
function match(label, legacyNames, sanityDocs, nameOf) {
  const sMap = new Map(sanityDocs.map(d=>[key(nameOf(d)), d]));
  const uniq = [...new Set(legacyNames.map(key))].filter(Boolean);
  const hit = uniq.filter(k=>sMap.has(k));
  const miss = uniq.filter(k=>!sMap.has(k));
  const orphan = [...sMap.keys()].filter(k=>!uniq.includes(k));
  report.push({label, legacyUnique:uniq.length, inSanity:sanityDocs.length, matched:hit.length, newToImport:miss.length, sanityOnly:orphan.length,
    matchedNames:hit, missSample:miss, orphanSample:orphan});
}
match('people', D('people').map(p=>p.name), byType('person'), d=>d.name);
match('partners', D('partners').filter(p=>p.name).map(p=>p.name), byType('partner'), d=>d.name);
match('artists (laureate/award headings)', D('laureates-awards').map(r=>r.heading), byType('artist'), d=>d.name);
match('exhibitors', N('exhibitors').map(e=>strip(t(e.title))), byType('exhibitor'), d=>d.name);
match('programme events', D('events').map(e=>e.title), byType('programmeEvent'), d=>t(d.title));
match('pages (by title)', N('pages').map(p=>strip(t(p.title))), byType('page'), d=>t(d.title));

for (const r of report) {
  console.log(`\n== ${r.label}`);
  console.log(`   legacy unique: ${r.legacyUnique}   already in Sanity: ${r.inSanity}   matched: ${r.matched}   new: ${r.newToImport}   Sanity-only: ${r.sanityOnly}`);
  if (r.matchedNames.length) console.log(`   matched → ${r.matchedNames.slice(0,12).join(' | ')}${r.matchedNames.length>12?' …':''}`);
  if (r.orphanSample.length) console.log(`   Sanity-only → ${r.orphanSample.slice(0,12).join(' | ')}${r.orphanSample.length>12?' …':''}`);
}
fs.writeFileSync('legacy-export/match-report.json', JSON.stringify(report,null,2));
