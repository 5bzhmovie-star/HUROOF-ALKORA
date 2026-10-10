import {many,one} from './database.mjs';
import {atlasDetail} from './football-viewer.mjs';
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function playerSearch(q){
 const key=norm(q);if(key.length<2)return [];
 const words=key.split(' ').filter(Boolean);
 const candidates=many("SELECT id,name_ar,name_en,image_key,metadata FROM football_entities WHERE entity_type='player' ORDER BY name_ar LIMIT 4000");
 return candidates.map(row=>{
  const names=[row.name_ar,row.name_en,...(JSON.parse(row.metadata||'{}').aliases||[])].filter(x=>typeof x==='string').map(norm);
  const matched=names.some(n=>n===key)?3:names.some(n=>n.startsWith(key))?2:names.some(n=>words.every(w=>n.includes(w)))?1:0;
  return {row,matched};
 }).filter(x=>x.matched>0).sort((a,b)=>b.matched-a.matched||a.row.name_ar.localeCompare(b.row.name_ar)).slice(0,12).map(x=>({...x.row,metadata:JSON.parse(x.row.metadata||'{}')}));
}
export function playerAutofill(id){
 const data=atlasDetail(id);if(data.entity.entity_type!=='player')throw Error('اختر لاعبًا');
 const entity=data.entity,m=entity.metadata||{},links=data.related;
 const clubs=links.filter(r=>['played_for','loaned_to'].includes(r.relation)).sort((a,b)=>String(a.from||'').localeCompare(String(b.from||'')));
 const known=Object.fromEntries(['position','shirtNumber','nationality','nationalities','dateOfBirth','heightCm','preferredFoot','contractUntil','marketValue','clubAtDate'].filter(k=>m[k]!=null).map(k=>[k,m[k]]));
 const lastClub=clubs.filter(r=>!r.to).sort((a,b)=>String(b.from).localeCompare(String(a.from)))[0];
 return {id:entity.id,nameAr:entity.name_ar,nameEn:entity.name_en,photo:entity.image_key||m.externalImage?.url||'',...known,
 currentClub:lastClub?.entity?.name_ar||null,career:clubs.map(r=>({club:r.entity.name_ar,clubImage:r.entity.image_key||'',from:r.from,to:r.to,loan:r.relation==='loaned_to',source:r.source})),missing:['position','shirtNumber','nationality'].filter(k=>known[k]==null),source:m.source||null};
}
