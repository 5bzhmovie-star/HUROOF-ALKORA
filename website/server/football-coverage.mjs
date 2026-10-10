import {one,many,dataDir} from './database.mjs';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {COMPETITIONS} from './football-competitions.mjs';
export function atlasCoverage(){
 const competitions=COMPETITIONS.map(([key,ar,en,source])=>{
 const id='competition:'+key;
 const row=one(`SELECT e.image_key,a.relative_path FROM football_entities e
 LEFT JOIN visual_assets a ON a.id=substr(e.image_key,19) WHERE e.id=?`,id);
 const image=Boolean(row?.relative_path&&existsSync(resolve(dataDir,'visual-media',row.relative_path)));
 const linked=one("SELECT count(*) n FROM football_relations WHERE from_entity_id=? OR to_entity_id=?",id,id)?.n||0;
 return {id,nameAr:ar,nameEn:en,source,logoCached:image,logoUrl:image?row.image_key:null,relations:linked,ready:image&&linked>0};
 });
 const kinds=many("SELECT entity_type kind,count(*) total,sum(CASE WHEN image_key LIKE '/api/visual-media/%' THEN 1 ELSE 0 END) images FROM football_entities GROUP BY entity_type");
 const players=kinds.find(x=>x.kind==='player');
 const localPlayerPhotos=many(`SELECT a.relative_path FROM football_entities e
 JOIN visual_assets a ON a.id=substr(e.image_key,19)
 WHERE e.entity_type='player'`).filter(r=>r.relative_path&&existsSync(resolve(dataDir,'visual-media',r.relative_path))).length;
 const dated=one("SELECT count(*) n FROM football_entities WHERE entity_type='player' AND json_extract(metadata,'$.statsVerified') = 1")?.n||0;
 const seasonEntries=one("SELECT count(*) n FROM football_entities WHERE entity_type='season' AND json_extract(metadata,'$.verification')='reviewed'")?.n||0;
 return {competitions,logosCached:competitions.filter(x=>x.logoCached).length,logosRequired:11,
 playerPhotosCached:localPlayerPhotos,playersIndexed:players?.total||0,
 missingLogos:competitions.filter(x=>!x.logoCached).map(x=>x.nameAr),
 verifiedPlayerStatistics:dated,verifiedSeasons:seasonEntries,
 releaseReady:competitions.every(x=>x.ready)&&players?.total>0&&localPlayerPhotos===players?.total&&dated===players?.total&&seasonEntries>=11,
 warning:'This is a media/relations gate, not certification of 2026-27 roster, lineup or statistics accuracy'};
}
