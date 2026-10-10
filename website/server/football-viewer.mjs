import {one,many} from './database.mjs';
import {fail} from './security.mjs';
const types=new Set(['player','club','national_team','competition','season','fixture','coach','stadium','country','flag']);
function map(r){return {...r,metadata:JSON.parse(r.metadata||'{}')}}
export function atlasExplore({type='',q='',page=1}={}){
 const t=types.has(type)?type:'',term=String(q).slice(0,100).trim(),p=Math.max(1,Math.min(1000,Number(page)||1)),where=[],args=[];
 if(t){where.push('entity_type=?');args.push(t)}
 if(term){where.push('(name_ar LIKE ? OR name_en LIKE ?)');args.push('%'+term+'%','%'+term+'%')}
 const sql=where.length?' WHERE '+where.join(' AND '):'';
 const count=one('SELECT count(*) n FROM football_entities'+sql,...args).n;
 const items=many('SELECT * FROM football_entities'+sql+' ORDER BY name_ar LIMIT 24 OFFSET ?',...args,(p-1)*24).map(map);
 const summary=many('SELECT entity_type type,count(*) total FROM football_entities GROUP BY entity_type');
 return {items,total:count,page:p,pageSize:24,summary};
}
export function atlasDetail(id){
 const entity=one('SELECT * FROM football_entities WHERE id=?',id);if(!entity)fail(404,'هذا العنصر غير موجود');
 const e=map(entity);
 const links=many('SELECT r.*,f.id from_id,f.name_ar from_name,f.entity_type from_type,f.image_key from_image,t.id to_id,t.name_ar to_name,t.entity_type to_type,t.image_key to_image FROM football_relations r JOIN football_entities f ON f.id=r.from_entity_id JOIN football_entities t ON t.id=r.to_entity_id WHERE r.from_entity_id=? OR r.to_entity_id=? ORDER BY r.starts_at DESC LIMIT 150',id,id).map(r=>({...r,metadata:JSON.parse(r.metadata||'{}')}));
 const related=links.map(r=>({relation:r.relation_type,from:r.starts_at,to:r.ends_at,source:r.source,metadata:r.metadata,entity:{id:r.from_id===id?r.to_id:r.from_id,name_ar:r.from_id===id?r.to_name:r.from_name,entity_type:r.from_id===id?r.to_type:r.from_type,image_key:r.from_id===id?r.to_image:r.from_image}}));
 const metrics=Object.fromEntries(Object.entries(e.metadata||{}).filter(([k,v])=>['dateOfBirth','position','nationality','heightCm','preferredFoot','shirtNumber','marketValue','contractUntil','season','venue','kickoff','score','coach','founded','country','appearances','goals','assists','minutes','yellowCards','redCards','rating','shots','xG','xA','cleanSheets','competition'].includes(k)&&(['number','string'].includes(typeof v))));
 return {entity:e,related,metrics,recordedAt:e.updated_at,statsVerified:e.metadata?.statsVerified===true};
}
