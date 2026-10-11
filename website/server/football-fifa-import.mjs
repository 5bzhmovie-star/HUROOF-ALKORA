import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {one,run,transaction,root} from './database.mjs';
import {validDate,registerContextMedia,contextMedia} from './football-context.mjs';
import {saveMedia} from './visual-media.mjs';
const base=resolve(root,'../football-library');
const read=name=>JSON.parse(readFileSync(resolve(base,'data',name),'utf8'));
function repairPlayerText(p){
 if(!p.textCorrections)return;
 const current=one('SELECT * FROM football_entities WHERE id=?',p.id),metadata=JSON.parse(current.metadata);
 const raw=p.rawCells,originalName=[raw[4]||'',raw[5]||''].join(' ').trim();
 const fields={nameOriginal:originalName,nameEn:originalName,sourceDisplayName:raw[2],firstNames:raw[4],lastNames:raw[5],shirtName:raw[7],clubAtWorldCup:raw[10]};
 const validate=(value,original,corrected)=>{if(value!==original&&value!==corrected)throw Error('FIFA visual repair conflicts with an existing value: '+p.id)};
 for(const [key,old] of Object.entries(fields))validate(metadata[key],old,p[key]);
 validate(current.name_en,originalName,p.nameEn);
 const changed=Object.keys(fields).some(key=>metadata[key]!==p[key])||current.name_en!==p.nameEn||Boolean(metadata.textIssues?.length)||!metadata.textCorrections;
 if(changed&&(metadata.referenceScope!=='wc2026'||metadata.source!==p.source||metadata.verification!=='pending'))throw Error('FIFA visual repair requires manual review of a protected entity: '+p.id);
 if(changed){
 for(const key of Object.keys(fields))metadata[key]=p[key];metadata.textIssues=[];metadata.textCorrections=p.textCorrections;
 run('UPDATE football_entities SET name_en=?,name_ar=?,fallback=?,metadata=?,updated_at=? WHERE id=?',p.nameEn,current.name_ar===originalName?p.nameEn:current.name_ar,current.fallback===originalName?p.nameEn:current.fallback,JSON.stringify(metadata),Date.now(),p.id);
 }
 const fact=one('SELECT * FROM football_fact_records WHERE id=?',p.id+':personal:wc2026'),payload=JSON.parse(fact.payload);
 validate(payload.nameOriginal,originalName,p.nameOriginal);validate(payload.clubAtWorldCup,raw[10],p.clubAtWorldCup);
 if(payload.nameOriginal!==p.nameOriginal||payload.clubAtWorldCup!==p.clubAtWorldCup){
 if(fact.status!=='pending'||fact.source!==p.source)throw Error('FIFA visual repair conflicts with a protected personal fact: '+p.id);
 Object.assign(payload,{nameOriginal:p.nameOriginal,clubAtWorldCup:p.clubAtWorldCup,textCorrections:p.textCorrections});run('UPDATE football_fact_records SET payload=? WHERE id=?',JSON.stringify(payload),fact.id);
 }
 const relation=one('SELECT * FROM football_relations WHERE id=?',p.id+':wc2026-squad'),link=JSON.parse(relation.metadata);validate(link.clubAtWorldCup,raw[10],p.clubAtWorldCup);
 if(link.clubAtWorldCup!==p.clubAtWorldCup){
 if(link.verification!=='pending'||relation.source!==p.source)throw Error('FIFA visual repair conflicts with a protected relation: '+p.id);
 link.clubAtWorldCup=p.clubAtWorldCup;link.textCorrections=p.textCorrections;run('UPDATE football_relations SET metadata=? WHERE id=?',JSON.stringify(link),relation.id);
 }
}
export function importFifaSnapshot(){
 const teams=read('wc2026_teams.json'),players=read('wc2026_players.json'),coaches=read('wc2026_coaches.json'),names=read('national-team-names.json');
 if(teams.length!==48||players.length!==1248||coaches.length!==48||new Set(players.map(p=>p.id)).size!==1248)throw Error('Incomplete or duplicated official roster evidence');
 const ids=new Set(players.map(p=>p.id)),staffIds=new Set(coaches.map(c=>c.id));
 for(const t of teams)if(t.playerIds.length!==26||new Set(t.playerIds).size!==26||t.playerIds.some(id=>!ids.has(id))||t.coachIds.length!==1||t.coachIds.some(id=>!staffIds.has(id)))throw Error('Invalid team squad');
 for(const p of players)if(!validDate(p.dateOfBirth)||!['GK','DF','MF','FW'].includes(p.position)||!Number.isInteger(p.shirtNumber)||p.shirtNumber<1||p.shirtNumber>26)throw Error('Invalid player field');
 const competitionId='competition:fifa-world-cup',source=teams[0].source,stamp=Date.now();
 const put=(id,type,nameAr,nameEn,metadata)=>{
 run(`INSERT INTO football_entities(id,entity_type,name_ar,name_en,fallback,metadata,updated_at) VALUES(?,?,?,?,?,?,?)
 ON CONFLICT(id) DO NOTHING`,id,type,nameAr||nameEn,nameEn,nameAr||nameEn,JSON.stringify(metadata),stamp);
 };
 transaction(()=>{
 put(competitionId,'competition','كأس العالم','FIFA World Cup',{source,verifiedAt:'2026-10-11',verification:'reviewed'});
 for(const t of teams)put(t.id,'national_team',names[t.fifaCode][0],t.nameEn,{...t,referenceScope:'wc2026',verification:'pending'});
 for(const p of players){
 const {rawCells,...metadata}=p;
 put(p.id,'player',p.nameAr,p.nameEn,{...metadata,referenceScope:'wc2026',arabicNameStatus:'missing',aliases:[p.sourceDisplayName,p.shirtName],verification:'pending'});
 run(`INSERT OR IGNORE INTO football_fact_records VALUES(?,?,?,?,?,?,?,?,?,?)`,p.id+':personal:wc2026',p.id,'personal',null,'2026','2026-07-19',JSON.stringify({dateOfBirth:p.dateOfBirth,heightCm:p.heightCm,position:p.position,nameOriginal:p.nameOriginal,clubAtWorldCup:p.clubAtWorldCup,sourcePage:p.sourcePage}),p.source,'pending','2026-10-11');
 run(`INSERT OR IGNORE INTO football_fact_records VALUES(?,?,?,?,?,?,?,?,?,?)`,p.id+':international:wc2026',p.id,'statistics','competition:fifa-world-cup','2026','2026-07-19',JSON.stringify({internationalCaps:p.internationalCapsAsOfSource,internationalGoals:p.internationalGoalsAsOfSource,sourcePage:p.sourcePage,scope:'international totals printed in squad document; not World Cup match statistics',effectiveDate:null}),p.source,'pending','2026-10-11');
 const teamId='national_team:fifa:'+p.nationalTeamCode.toLowerCase();
 run(`INSERT OR IGNORE INTO football_relations VALUES(?,?,?,?,?,?,?,?)`,p.id+':wc2026-squad',p.id,teamId,'selected_for','2026-06-11','2026-07-19',JSON.stringify({periodType:'tournament',shirtNumber:p.shirtNumber,clubAtWorldCup:p.clubAtWorldCup,verification:'pending'}),p.source);
 repairPlayerText(p);
 }
 for(const c of coaches)put(c.id,'coach',c.nameAr,c.nameEn,{...c,referenceScope:'wc2026',arabicNameStatus:'missing',verification:'pending'});
 run(`INSERT OR IGNORE INTO football_participant_snapshots VALUES(?,?,?,?,?,?)`,competitionId,'2026',JSON.stringify(teams.map(t=>t.id)),source,'2026-10-11','reviewed');
 for(const t of teams)run(`INSERT OR IGNORE INTO football_squad_snapshots VALUES(?,?,?,?,?,?,?,?)`,t.id,competitionId,'2026',JSON.stringify(t.playerIds),JSON.stringify(t.coachIds),source,'2026-10-11','pending');
 });
 return {teams:teams.length,players:players.length,coaches:coaches.length,status:'pending-field-and-Arabic-review',releaseReady:false};
}

export function installFifaFlags(){
 const manifest=JSON.parse(readFileSync(resolve(base,'reports/FLAG_ASSETS.json'),'utf8'));
 if(manifest.downloaded.length!==48||manifest.failures.length)throw Error('Incomplete local flag files');
 let installed=0;
 for(const flag of manifest.downloaded){
 if(!/^assets\/national_teams\/national_team_fifa_[a-z]{3}\/flag\.png$/.test(flag.png)||flag.license!=='MIT')throw Error('Invalid local flag manifest');
 // Repair only this collector's original verification-date expiry.
 run("UPDATE football_context_media SET ends_at=NULL WHERE entity_id=? AND role='flag' AND ends_at='2026-10-11' AND asset_id IN (SELECT id FROM visual_assets WHERE source=?)",flag.teamId,flag.source);
 if(contextMedia(flag.teamId,{role:'flag',at:'2026-10-11'}).status==='reviewed')continue;
 const bytes=readFileSync(resolve(base,flag.png));
 const asset=saveMedia({contentType:'image/png',base64:bytes.toString('base64'),source:flag.source,license:'MIT; Panayiotis Lipiridis; see flag-icons-MIT.txt'});
 registerContextMedia({entityId:flag.teamId,role:'flag',startsAt:'2026-06-11',endsAt:null,assetId:asset.id,review:{identity:true,visual:true,rights:true,reviewer:'Codex visual flag sheet review',evidence:flag.source,verifiedAt:'2026-10-11'}});installed++;
 }
 return {installed,localFlags:manifest.downloaded.length};
}
