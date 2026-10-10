import {one,many,run} from './database.mjs';
import {discoverImageForEntity} from './football-online-media.mjs';
import {saveMedia} from './visual-media.mjs';
import {fail} from './security.mjs';
const allowed=new Set(['upload.wikimedia.org','commons.wikimedia.org']);
function safeImageUrl(s){try{const u=new URL(s);return u.protocol==='https:'&&allowed.has(u.hostname)&&!u.username&&!u.password;}catch{return false}}
export async function cacheCandidateImage(id){
 const row=one('SELECT id,image_key,metadata FROM football_entities WHERE id=?',id);
 if(!row)fail(404,'الكيان غير موجود');
 if(row.image_key?.startsWith('/api/visual-media/'))return {status:'cached',url:row.image_key};
 let candidate=JSON.parse(row.metadata||'{}').externalImage;
 if(!candidate){const found=await discoverImageForEntity(id);if(found.status!=='candidate')return found;candidate=found}
 if(!safeImageUrl(candidate.url)||!/^https:\/\/commons\.wikimedia\.org\//.test(candidate.source||''))return {status:'unsupported-image-source'};
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(candidate.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'HuroofAlKoraMedia/1.7.1'}});
  if(!response.ok)return {status:'fetch-failed',code:response.status};
  const len=Number(response.headers.get('content-length')||0);
  if(len>1300000)return {status:'oversized'};
  const contentType=String(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(!['image/png','image/jpeg','image/webp'].includes(contentType))return {status:'unsupported-format',contentType};
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>1300000)return {status:'oversized'};
  const photo=saveMedia({contentType,base64:bytes.toString('base64'),source:candidate.source,
    license:String(candidate.license||'See Commons license').slice(0,150)});
  run('UPDATE football_entities SET image_key=?,image_source=?,image_license=?,updated_at=? WHERE id=?',
    photo.url,candidate.source,String(candidate.license||'See Commons license').slice(0,150),Date.now(),id);
  return {status:'cached',url:photo.url,license:candidate.license,source:candidate.source};
 }finally{clearTimeout(timeout)}
}
export async function cacheImages({type='',limit=11}={}){
 const n=Math.max(1,Math.min(15,Number(limit)||11)),params=[];
 let sql="SELECT id FROM football_entities WHERE (image_key IS NULL OR image_key='')";
 if(type){if(!['competition','player','club','national_team','country','flag'].includes(type))fail(422,'تصنيف غير صالح');sql+=' AND entity_type=?';params.push(type)}
 sql+=' ORDER BY CASE WHEN entity_type=\'competition\' THEN 0 ELSE 1 END,updated_at,id LIMIT ?';params.push(n);
 const results=[];
 for(const r of many(sql,...params)){try{results.push({id:r.id,...await cacheCandidateImage(r.id)})}
 catch(e){results.push({id:r.id,status:'error',error:String(e.message||e)})}}
 return {total:results.length,cached:results.filter(x=>x.status==='cached').length,results};
}
