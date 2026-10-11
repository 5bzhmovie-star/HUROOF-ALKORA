import {many,one,run,transaction,dataDir} from './database.mjs';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fail} from './security.mjs';
import {COMPETITIONS} from './football-competitions.mjs';
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function auditAsset(asset){
 if(!asset)return {ok:false,reason:'missing-asset'};
 try{
 const base=realpathSync(resolve(dataDir,'visual-media')),file=realpathSync(resolve(base,asset.relative_path));
 if(!file.startsWith(base+sep))return {ok:false,reason:'unsafe-path'};
 const size=statSync(file).size;if(size<30||size>1350000)return {ok:false,reason:'invalid-size'};
 const bytes=readFileSync(file),type=asset.content_type;
 const signature=type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':false;
 if(!signature)return {ok:false,reason:'invalid-signature'};
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)return {ok:false,reason:'hash-mismatch'};
 if(!asset.license?.trim()||!/^https:\/\//.test(asset.source))return {ok:false,reason:'missing-attribution'};
 return {ok:true,bytes:size};
 }catch{return {ok:false,reason:'missing-file'}}
}
export function contextMedia(entityId,{teamId=null,at=new Date().toISOString().slice(0,10),role='portrait'}={}){
 if(!validDate(at))fail(422,'تاريخ سياق الصورة غير صالح.');
 if(teamId&&!one("SELECT id FROM football_entities WHERE id=? AND entity_type IN ('club','national_team')",teamId))fail(422,'فريق سياق الصورة غير موجود.');
 const rows=many(`SELECT m.*,a.relative_path,a.content_type,a.sha256,a.license,a.source FROM football_context_media m JOIN visual_assets a ON a.id=m.asset_id WHERE m.entity_id=? AND m.team_id IS ? AND m.role=? AND m.starts_at<=? AND (m.ends_at IS NULL OR m.ends_at>=?)`,entityId,teamId,role,at,at);
 const candidates=rows.filter(r=>{const review=JSON.parse(r.review);return auditAsset(r).ok&&review.identity===true&&review.visual===true&&review.rights===true&&review.reviewer&&/^https:\/\//.test(review.evidence||'')&&validDate(review.verifiedAt)&&(!teamId||review.kit===true)});
 if(candidates.length!==1)return {status:candidates.length>1?'conflicting':'missing',url:null,teamId,at,role};
 return {status:'reviewed',url:'/api/visual-media/'+candidates[0].asset_id,teamId,at,role,source:candidates[0].source};
}
export function contentAudit(){
 const missing=[],expectedTeams=new Set(),expectedPlayers=new Set(),expectedCoaches=new Set(),seenPortraits=new Set();let participantSnapshotsVerified=0,squadSnapshotsVerified=0,portraitsRequired=0,portraitsVerified=0,teamAssetsRequired=0,teamAssetsVerified=0;
 for(const [key] of COMPETITIONS){
 const competitionId='competition:'+key,season=key==='fifa-world-cup'?'2026':'2026-2027';
 const snapshot=one('SELECT * FROM football_participant_snapshots WHERE competition_id=? AND season=?',competitionId,season),teams=snapshot?JSON.parse(snapshot.team_ids):[];
 if(!snapshot||snapshot.status!=='reviewed'||!teams.length||new Set(teams).size!==teams.length||(key==='fifa-world-cup'&&teams.length!==48)){missing.push({kind:'participants',competitionId,season});continue}
 participantSnapshotsVerified++;
 for(const teamId of teams){
 const type=key==='fifa-world-cup'?'national_team':'club',team=one('SELECT entity_type FROM football_entities WHERE id=?',teamId);
 if(team?.entity_type!==type){missing.push({kind:'invalid-team',teamId,competitionId});continue}
 if(!expectedTeams.has(teamId)){expectedTeams.add(teamId);for(const role of type==='national_team'?['flag','emblem']:['logo']){teamAssetsRequired++;if(contextMedia(teamId,{role}).status==='reviewed')teamAssetsVerified++;else missing.push({kind:role,teamId})}}
 const squad=one('SELECT * FROM football_squad_snapshots WHERE team_id=? AND competition_id=? AND season=?',teamId,competitionId,season),ids=squad?JSON.parse(squad.player_ids):[],coaches=squad?JSON.parse(squad.coach_ids):[];
 if(!squad||squad.status!=='reviewed'||!ids.length||!coaches.length||new Set(ids).size!==ids.length){missing.push({kind:'squad',teamId,competitionId,season});continue}
 squadSnapshotsVerified++;
 for(const personId of [...ids,...coaches]){
 const person=one('SELECT entity_type FROM football_entities WHERE id=?',personId),coach=coaches.includes(personId);
 if(person?.entity_type!==(coach?'coach':'player')){missing.push({kind:'invalid-person',personId,teamId});continue}
 (coach?expectedCoaches:expectedPlayers).add(personId);
 const context=coach?null:teamId,uniqueKey=personId+'|'+context+'|'+season;
 if(!seenPortraits.has(uniqueKey)){seenPortraits.add(uniqueKey);portraitsRequired++;if(contextMedia(personId,{teamId:context,at:season==='2026'?'2026-07-19':new Date().toISOString().slice(0,10)}).status==='reviewed')portraitsVerified++;else missing.push({kind:coach?'coach-portrait':'player-portrait',personId,teamId,season})}
 }
 }
 }
 const missingFacts=[];
 for(const personId of [...expectedPlayers,...expectedCoaches])for(const kind of ['personal','career','statistics','honors',...(expectedPlayers.has(personId)?['transfers']:[])])if(!one("SELECT id FROM football_fact_records WHERE entity_id=? AND kind=? AND status IN ('reviewed','unavailable')",personId,kind))missingFacts.push({personId,kind});
 return {participantSnapshotsRequired:11,participantSnapshotsVerified,squadSnapshotsVerified,teams:expectedTeams.size,players:expectedPlayers.size,coaches:expectedCoaches.size,portraitsRequired,portraitsVerified,teamAssetsRequired,teamAssetsVerified,missing,missingFacts,releaseReady:false,certification:'pending-full-field-and-image-audit'};
}

export function registerContextMedia(input){
 const {entityId,teamId=null,role='portrait',startsAt,endsAt=null,assetId,review={}}=input||{};
 if(!validDate(startsAt)||(endsAt&&(!validDate(endsAt)||endsAt<startsAt)))fail(422,'فترة الصورة غير صالحة.');
 const entity=one('SELECT entity_type FROM football_entities WHERE id=?',entityId);
 const team=teamId?one('SELECT entity_type FROM football_entities WHERE id=?',teamId):null;
 if(!entity||!['portrait','flag','emblem','logo'].includes(role))fail(422,'كيان الصورة غير صالح.');
 if(role==='portrait'&&(!['player','coach'].includes(entity.entity_type)||(entity.entity_type==='player'&&!['club','national_team'].includes(team?.entity_type))||(entity.entity_type==='coach'&&teamId)))fail(422,'سياق الصورة الشخصية غير صالح.');
 if(role!=='portrait'&&(teamId||(role==='logo'&&!['club','competition'].includes(entity.entity_type))||(['flag','emblem'].includes(role)&&entity.entity_type!=='national_team')))fail(422,'سياق الشعار أو العلم غير صالح.');
 const asset=one('SELECT * FROM visual_assets WHERE id=?',assetId);
 if(!auditAsset(asset).ok)fail(422,'ملف الصورة مفقود أو تالف أو غير آمن.');
 if(review.identity!==true||review.visual!==true||review.rights!==true||(teamId&&review.kit!==true)||typeof review.reviewer!=='string'||!review.reviewer.trim()||review.reviewer.length>180||!validDate(review.verifiedAt)||!/^https:\/\//.test(review.evidence||'')||review.evidence.length>1800)fail(422,'أدلة تدقيق الهوية والقميص والجودة والحقوق مطلوبة.');
 return transaction(()=>{
 const overlap=one(`SELECT id FROM football_context_media WHERE entity_id=? AND team_id IS ? AND role=? AND starts_at<=? AND (ends_at IS NULL OR ends_at>=?)`,entityId,teamId,role,endsAt||'9999-12-31',startsAt);
 if(overlap)fail(409,'توجد صورة معتمدة بفترة متداخلة لهذا السياق.');
 const id=randomUUID();run('INSERT INTO football_context_media VALUES(?,?,?,?,?,?,?,?)',id,entityId,teamId,role,startsAt,endsAt,assetId,JSON.stringify(review));
 return {id,url:'/api/visual-media/'+assetId};
 });
}
