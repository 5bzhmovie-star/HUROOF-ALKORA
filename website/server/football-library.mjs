import {one,many,run} from './database.mjs';
import {fail} from './security.mjs';
const TYPES=new Set(['player','club','national_team','competition','season','fixture','coach']);
const RELATIONS=new Set(['played_for','loaned_to','selected_for','participated_in','belongs_to','managed_by','appeared_in']);
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'));
const web=x=>typeof x==='string'&&/^https:\/\/[^/]+/.test(x)&&x.length<1800;
const plain=x=>typeof x==='string'&&x.trim().length>0&&x.length<=180;
export function addEntity(input){
 if(!TYPES.has(input.type)||!plain(input.nameAr)||!plain(input.nameEn)||!web(input.source))
   fail(422,'نوع الكيان أو اسمه أو رابط المصدر غير صالح.');
 if(!iso(input.verifiedAt))fail(422,'تاريخ التحقق مطلوب.');
 const key=String(input.externalKey||'').trim();
 if(!/^[a-z0-9:_-]{5,128}$/.test(key))fail(422,'مفتاح مرجعي ثابت مطلوب لمنع التكرار.');
 if(!['reviewed','pending'].includes(input.verification))fail(422,'حالة التدقيق غير صالحة.');
 const id=input.type+':'+key;
 if(one('SELECT id FROM football_entities WHERE id=?',id))fail(409,'هذا الكيان مسجل مسبقًا.');
 run('INSERT INTO football_entities(id,entity_type,name_ar,name_en,image_key,image_source,image_license,fallback,metadata,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
 id,input.type,input.nameAr.trim(),input.nameEn.trim(),input.imageUrl||null,input.imageSource||null,input.imageLicense||null,input.nameAr.trim(),
 JSON.stringify({source:input.source,verifiedAt:input.verifiedAt,verification:input.verification,externalKey:key,identity:'central-v1.5'}),Date.now());
 return {id};
}
export function addRelation(input){
 const from=String(input.from||''),to=String(input.to||'');
 if(!RELATIONS.has(input.type)||from===to||!one('SELECT id FROM football_entities WHERE id=?',from)||!one('SELECT id FROM football_entities WHERE id=?',to))
 fail(422,'علاقة كروية أو كيانات غير صحيحة.');
 if(!iso(input.fromDate)||(input.toDate&&!iso(input.toDate))||(input.toDate&&input.toDate<input.fromDate))
 fail(422,'أدخل فترة تاريخية صحيحة.');
 if(!web(input.source)||!iso(input.verifiedAt))fail(422,'توثيق العلاقة وتاريخ تحققها مطلوبان.');
 const id=input.type+':'+from+':'+to+':'+input.fromDate;
 if(one('SELECT id FROM football_relations WHERE id=?',id))fail(409,'العلاقة التاريخية مسجلة مسبقًا.');
 run('INSERT INTO football_relations(id,from_entity_id,to_entity_id,relation_type,starts_at,ends_at,metadata,source) VALUES(?,?,?,?,?,?,?,?)',
 id,from,to,input.type,input.fromDate,input.toDate||null,JSON.stringify({verifiedAt:input.verifiedAt,verification:input.verification||'pending',details:input.details||{}}),input.source);
 return {id};
}
export function searchEntities(filter={}){
 const term=String(filter.search||'').trim().slice(0,100);
 const type=TYPES.has(filter.type)?filter.type:null;
 const clauses=[],args=[];
 if(type){clauses.push('entity_type=?');args.push(type);}
 if(term){clauses.push('(name_ar LIKE ? OR name_en LIKE ? OR id LIKE ?)');args.push(...Array(3).fill('%'+term+'%'));}
 const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
 return many('SELECT id,entity_type,name_ar,name_en,image_key,image_license,metadata FROM football_entities '+where+' ORDER BY name_ar LIMIT 100',...args)
 .map(r=>({...r,metadata:JSON.parse(r.metadata||'{}')}));
}
export function getHistory(id){
 if(!one('SELECT id FROM football_entities WHERE id=?',id))fail(404,'الكيان غير موجود.');
 return many('SELECT r.*, f.name_ar from_name,t.name_ar to_name FROM football_relations r JOIN football_entities f ON r.from_entity_id=f.id JOIN football_entities t ON r.to_entity_id=t.id WHERE r.from_entity_id=? OR r.to_entity_id=? ORDER BY r.starts_at',id,id)
 .map(r=>({...r,metadata:JSON.parse(r.metadata||'{}')}));
}
export function libraryStats(){
 const counts=many('SELECT entity_type type,count(*) total FROM football_entities GROUP BY entity_type');
 const review=one("SELECT count(*) pending FROM football_entities WHERE json_extract(metadata,'$.verification') != 'reviewed' OR json_extract(metadata,'$.verification') IS NULL");
 const assets=one('SELECT count(*) total FROM visual_assets');
 const published=one("SELECT count(*) total FROM visual_questions v JOIN questions q ON q.id=v.question_id WHERE q.status='published'");
 return {entities:counts,pendingReview:review.pending,media:assets.total,publishedVisual:published.total,
 relations:one('SELECT count(*) total FROM football_relations').total};
}
