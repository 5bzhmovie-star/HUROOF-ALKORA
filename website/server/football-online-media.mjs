// Image discovery is separate from verified football facts and from commercial reproduction rights.
// Uses Wikimedia public search and Wikidata item claims; never trusts arbitrary user-controlled URLs.
import {one,run,many} from './database.mjs';
import {fail} from './security.mjs';
const searchEndpoint='https://www.wikidata.org/w/api.php';
const commonsEndpoint='https://commons.wikimedia.org/w/api.php';
// Stable Wikidata IDs independently checked for these competitions, avoiding fuzzy name matches.
const competitionIds={'competition:en-premier-league':'Q9448','competition:es-la-liga':'Q324867',
 'competition:de-bundesliga':'Q82595','competition:it-serie-a':'Q15804',
 'competition:uefa-champions-league':'Q18756','competition:sa-pro-league':'Q255633'};
// Resolve additional competition identities through exact encyclopedia sitelinks, not fuzzy name search.
const competitionSitelinks={
 'competition:fr-ligue1':'Ligue 1',
 'competition:fifa-world-cup':'FIFA World Cup',
 'competition:sa-kings-cup':'King Cup (Saudi Arabia)',
 'competition:sa-super-cup':'Saudi Super Cup',
 'competition:afc-champions-league-elite':'AFC Champions League Elite'
};
const types={player:['Q5'],coach:['Q5'],club:['Q476028','Q847017','Q6979593'],national_team:['Q6979593'],country:['Q6256'],flag:['Q6256'],stadium:['Q483110'],competition:['Q15991303','Q18536594']};
let lastRemoteCall=0;
async function json(url,timeout=8500) {
 for(let attempt=0;attempt<4;attempt++){
  const delay=Math.max(0,1750-(Date.now()-lastRemoteCall));
  if(delay)await new Promise(r=>setTimeout(r,delay));
  lastRemoteCall=Date.now();
  const ctrl=new AbortController();const timeoutId=setTimeout(()=>ctrl.abort(),timeout);
  try {
   const res=await fetch(url,{signal:ctrl.signal,headers:{'User-Agent':'HuroofAlKoraFootballAtlas/1.8 (offline media packaging)'}});
   if((res.status===429||res.status===503)&&attempt<3){
    const retry=Number(res.headers.get('retry-after'));
    await new Promise(r=>setTimeout(r,Number.isFinite(retry)&&retry>0?Math.min(retry*1000,20000):2000*(attempt+1)*(attempt+1)));
    continue;
   }
   if(!res.ok)throw new Error('Remote media service HTTP '+res.status);
   return await res.json();
  } finally{clearTimeout(timeoutId)}
 }
 throw new Error('Remote media service retry limit exceeded');
}
const safeFile=f=>typeof f==='string'&&/^[^<>#|{}\u0000-\u001f]{3,260}$/.test(f)&&/\.(?:png|jpg|jpeg|webp|svg)$/i.test(f);
function commonsPage(filename){return 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(filename.replace(/^File:/i,''));}
export async function discoverImageForEntity(entityId){
 const entity=one('SELECT id,entity_type,name_en,metadata,image_key FROM football_entities WHERE id=?',entityId);
 if(!entity)fail(404,'الكيان غير موجود');
 if(entity.image_key?.startsWith('/api/visual-media/'))return {status:'local',url:entity.image_key};
 if(!Object.hasOwn(types,entity.entity_type))return {status:'unsupported'};
 const url=new URL(searchEndpoint);url.search=new URLSearchParams({action:'wbsearchentities',search:entity.name_en,language:'en',type:'item',format:'json',limit:'7'});
 let curated=entity.entity_type==='competition'?competitionIds[entity.id]:null;
 if(!curated&&entity.entity_type==='competition'&&competitionSitelinks[entity.id]){
  const lookup=new URL(searchEndpoint);
  lookup.search=new URLSearchParams({action:'wbgetentities',sites:'enwiki',
   titles:competitionSitelinks[entity.id],props:'info',format:'json'});
  const response=await json(lookup);
  curated=Object.entries(response.entities||{}).find(([id,item])=>/^Q[0-9]+$/.test(id)&&!item?.missing)?.[0]||null;
 }
 const search=curated?null:await json(url);
 const exact=(search?.search||[]).filter(x=>x.label?.toLocaleLowerCase('en')===entity.name_en.toLocaleLowerCase('en'));
 if(!curated&&exact.length!==1)return {status:'ambiguous',matches:exact.length};
 const qid=curated||exact[0].id;
 const details=new URL(searchEndpoint);details.search=new URLSearchParams({action:'wbgetentities',ids:qid,props:'claims|labels|descriptions',format:'json'});
 const claims=(await json(details)).entities?.[qid]?.claims||{};
 const qIds=(claims.P31||[]).map(c=>c.mainsnak?.datavalue?.value?.id).filter(Boolean);
 const description=String(exact[0]?.description||'').toLowerCase();
 const matched=entity.entity_type==='player'||entity.entity_type==='coach'
  ? qIds.includes('Q5') && /(football|soccer)/.test(description)
  : entity.entity_type==='country'||entity.entity_type==='flag'
  ? qIds.includes('Q6256')
  : qIds.some(id=>types[entity.entity_type].includes(id)) || 
   (entity.entity_type==='club'&&/(football club|soccer club)/.test(description)) ||
   (entity.entity_type==='national_team'&&/national football team/.test(description)) ||
   (entity.entity_type==='stadium'&&/(stadium|football ground)/.test(description)) ||
   (entity.entity_type==='competition'&&/(football competition|football league|football tournament)/.test(description));
 if(!curated&&!matched)return {status:'type-mismatch',qid};
 const prop=entity.entity_type==='club'||entity.entity_type==='national_team'||entity.entity_type==='competition'?'P154':entity.entity_type==='country'||entity.entity_type==='flag'?'P41':'P18';
 const file=claims[prop]?.find(c=>c.mainsnak?.datavalue?.value)?.mainsnak?.datavalue?.value;
 if(!safeFile(file))return {status:'no-image',qid};
 const title='File:'+file.replace(/^File:/i,'');
 const mediaUrl=new URL(commonsEndpoint);mediaUrl.search=new URLSearchParams({action:'query',titles:title,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'500',format:'json'});
 const metadata=await json(mediaUrl);
 const page=Object.values(metadata.query?.pages||{})[0];
 const info=page?.imageinfo?.[0];
 if(!info?.thumburl || !new URL(info.thumburl).hostname.endsWith('.wikimedia.org'))return {status:'no-image',qid};
 const license=String(info.extmetadata?.LicenseShortName?.value||'Unknown').replace(/<[^>]*>/g,'').slice(0,150);
 const artist=String(info.extmetadata?.Artist?.value||'').replace(/<[^>]*>/g,'').slice(0,250);
 const image={url:info.thumburl,source:commonsPage(file),wikidata:qid,license,artist,checkedAt:new Date().toISOString(),kind:prop};
 const old=JSON.parse(entity.metadata||'{}');
 // Image candidate is explicitly separate from verified, locally licensed game assets.
 run('UPDATE football_entities SET metadata=?,updated_at=? WHERE id=?',
 JSON.stringify({...old,externalImage:image}),Date.now(),entityId);
 return {status:'candidate',...image};
}
export async function enrichMissingImages({limit=12}={}){
 const count=Math.max(1,Math.min(30,Number(limit)||12));
 const rows=many("SELECT id FROM football_entities WHERE image_key IS NULL AND json_extract(metadata,'$.externalImage') IS NULL ORDER BY updated_at LIMIT ?",count);
 const results=[];
 for(const row of rows){try{results.push({id:row.id,...await discoverImageForEntity(row.id)})}catch(e){results.push({id:row.id,status:'error',message:String(e.message||e)})}}
 return {checked:results.length,found:results.filter(r=>r.status==='candidate').length,results};
}
