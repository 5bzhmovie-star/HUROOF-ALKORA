import {one,many,run,transaction} from './database.mjs';
import {fail} from './security.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {addEntity,addRelation} from './football-library.mjs';
const allowedTypes=new Set(['player','club','national_team','competition','season','fixture','coach','stadium','country','flag']);
const relations=new Set(['played_for','loaned_to','selected_for','participated_in','belongs_to','managed_by','appeared_in']);
const https=s=>typeof s==='string'&&/^https:\/\/[^/\s]+/.test(s);
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s));
function checkEntity(e){
 if(!e||!allowedTypes.has(e.type)||!/^[-a-z0-9:_]{5,128}$/.test(String(e.externalKey||'')))fail(422,'معرف كروي أو تصنيف غير صالح.');
 if(!e.nameAr?.trim()||!e.nameEn?.trim()||!https(e.source)||!date(e.verifiedAt))fail(422,'اسم أو مصدر أو تاريخ تحقق ناقص.');
 if(e.imageUrl&&!/^\/api\/visual-media\/[a-zA-Z0-9_-]{8,64}$/.test(e.imageUrl))fail(422,'تُقبل الصور المحلية المرخصة فقط.');
}
export function validateCatalogBatch(batch){
 if(batch?.format!=='huroof-football-catalog-v1'||!https(batch.source)||!date(batch.snapshotDate))fail(422,'صيغة أو مصدر دفعة غير صالح.');
 if(!Array.isArray(batch.entities)||batch.entities.length>500||!Array.isArray(batch.relations)||batch.relations.length>1200)fail(422,'تجاوزت الدفعة حدود الاستيراد.');
 const keys=new Set();
 for(const e of batch.entities){checkEntity(e);const key=e.type+':'+e.externalKey;if(keys.has(key))fail(409,'هوية مكررة داخل الدفعة');keys.add(key);}
 for(const r of batch.relations){
  if(!relations.has(r.type)||!r.from||!r.to||!https(r.source)||!date(r.fromDate)||!date(r.verifiedAt))fail(422,'علاقة تاريخية غير صالحة.');
  if(r.toDate&&(!date(r.toDate)||r.toDate<r.fromDate))fail(422,'تاريخ نهاية العلاقة غير صالح.');
 }
 return {entities:batch.entities.length,relations:batch.relations.length,missingImages:batch.entities.filter(e=>!e.imageUrl).length};
}
export function importCatalogBatch(batch,{dryRun=true}={}){
 const audit=validateCatalogBatch(batch);
 const hash=createHash('sha256').update(JSON.stringify(batch)).digest('hex');
 const id=randomUUID();
 if(dryRun)return {...audit,id:null,dryRun:true,sha256:hash};
 const ids=new Set(batch.entities.map(e=>e.type+':'+e.externalKey));
 for(const r of batch.relations)if(!ids.has(r.from)&&!one('SELECT id FROM football_entities WHERE id=?',r.from))fail(422,'الكيان المصدر غير موجود: '+r.from);
 for(const r of batch.relations)if(!ids.has(r.to)&&!one('SELECT id FROM football_entities WHERE id=?',r.to))fail(422,'الكيان الهدف غير موجود: '+r.to);
 let added=0,linked=0,existing=0;
 transaction(()=>{
  for(const e of batch.entities){
   const key=e.type+':'+e.externalKey;
   if(one('SELECT id FROM football_entities WHERE id=?',key)){existing++;continue;}
   addEntity({...e,verification:'pending'});added++;
  }
  for(const r of batch.relations){
   const key=r.type+':'+r.from+':'+r.to+':'+r.fromDate;
   if(one('SELECT id FROM football_relations WHERE id=?',key))continue;
   addRelation({...r,verification:'pending'});linked++;
  }
  run('INSERT INTO football_import_batches(id,source,snapshot_date,sha256,entities_added,relations_added,images_missing,created_at) VALUES(?,?,?,?,?,?,?,?)',id,batch.source,batch.snapshotDate,hash,added,linked,audit.missingImages,Date.now());
 });
 return {...audit,added,linked,existing,id,sha256:hash,dryRun:false};
}
export function importHistory(){
 return many('SELECT id,source,snapshot_date,entities_added,relations_added,images_missing,created_at FROM football_import_batches ORDER BY created_at DESC LIMIT 50');
}
