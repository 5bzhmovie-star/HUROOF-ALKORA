import {one,many} from './database.mjs';
import {COMPETITIONS} from './football-competitions.mjs';
export function atlasCoverage(){
 const competitions=COMPETITIONS.map(([key,ar,en,source])=>{
 const id='competition:'+key;
 const row=one('SELECT image_key,metadata FROM football_entities WHERE id=?',id);
 const image=Boolean(row?.image_key?.startsWith('/api/visual-media/'));
 const linked=one("SELECT count(*) n FROM football_relations WHERE from_entity_id=? OR to_entity_id=?",id,id)?.n||0;
 return {id,nameAr:ar,nameEn:en,source,logoCached:image,relations:linked,ready:image&&linked>0};
 });
 const kinds=many("SELECT entity_type kind,count(*) total,sum(CASE WHEN image_key LIKE '/api/visual-media/%' THEN 1 ELSE 0 END) images FROM football_entities GROUP BY entity_type");
 const players=kinds.find(x=>x.kind==='player');
 return {competitions,logosCached:competitions.filter(x=>x.logoCached).length,logosRequired:11,
 playerPhotosCached:players?.images||0,playersIndexed:players?.total||0,
 missingLogos:competitions.filter(x=>!x.logoCached).map(x=>x.nameAr),
 releaseReady:competitions.every(x=>x.ready)&&players?.total>0&&players?.images===players?.total,
 warning:'This is a media/relations gate, not certification of 2026-27 roster, lineup or statistics accuracy'};
}
