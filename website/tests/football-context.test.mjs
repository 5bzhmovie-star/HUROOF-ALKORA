import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('team and date context never falls back to another jersey; missing snapshots block completion',()=>{
 const dir=mkdtempSync(join(tmpdir(),'football-context-'));
 try {
 const code=`
 import assert from 'node:assert/strict';
 import {db,run} from './server/database.mjs';
 import {atlasDetail} from './server/football-viewer.mjs';
 import {atlasCoverage} from './server/football-coverage.mjs';
 for(const [id,type,name] of [['player:test','player','Test'],['club:test','club','Club'],['national_team:test','national_team','Nation']])
 run('INSERT INTO football_entities VALUES(?,?,?,?,?,?,?,?,?,?)',id,type,name,name,'/api/visual-media/generic_photo',null,null,name,'{}',Date.now());
 const d=atlasDetail('player:test',{teamId:'club:test',at:'2026-10-11'});
 assert.equal(d.entity.image_key,null,'generic player portrait must not leak into a team context');
 assert.equal(d.mediaContext.status,'missing');
 assert.throws(()=>atlasDetail('player:test',{teamId:'club:test',at:'2026-02-30'}));
 assert.equal(atlasCoverage().releaseReady,false);
 assert.equal(atlasCoverage().contentAudit.participantSnapshotsRequired,11);
 assert.equal(atlasCoverage().contentAudit.participantSnapshotsVerified,0);
 db.close();`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'test'},encoding:'utf8',timeout:45000});
 assert.equal(r.status,0,r.stderr||r.stdout);
 } finally {rmSync(dir,{recursive:true,force:true})}
});
test('context portraits are distinct, audited, byte-checked and reject traversal or overlapping dates',()=>{
 const dir=mkdtempSync(join(tmpdir(),'football-media-'));
 try{
 const code=`
 import assert from 'node:assert/strict';
 import {mkdirSync,writeFileSync} from 'node:fs';
 import {join} from 'node:path';
 import {createHash} from 'node:crypto';
 import {db,run,dataDir} from './server/database.mjs';
 import * as m from './server/football-context.mjs';
 assert.equal(typeof m.registerContextMedia,'function');
 for(const [id,type] of [['player:test','player'],['club:test','club'],['national_team:test','national_team']])run('INSERT INTO football_entities VALUES(?,?,?,?,?,?,?,?,?,?)',id,type,id,id,null,null,null,id,'{}',Date.now());
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQkAAAAASUVORK5CYII=','base64');
 const folder=join(dataDir,'visual-media');mkdirSync(folder);
 for(const id of ['club_asset','nation_asset']){writeFileSync(join(folder,id+'.png'),bytes);run('INSERT INTO visual_assets VALUES(?,?,?,?,?,?,?)',id,'image/png',id+'.png',createHash('sha256').update(bytes).digest('hex')+(id==='nation_asset'?'bad':''),'fixture-license','https://example.test/photo',Date.now());}
 const input={entityId:'player:test',teamId:'club:test',role:'portrait',startsAt:'2026-06-11',endsAt:'2026-07-19',assetId:'club_asset',review:{identity:true,kit:true,visual:true,rights:true,reviewer:'Test reviewer',evidence:'https://example.test/review',verifiedAt:'2026-10-11'}};
 m.registerContextMedia(input);
 assert.equal(m.contextMedia('player:test',{teamId:'club:test',at:'2026-07-01'}).url,'/api/visual-media/club_asset');
 assert.equal(m.contextMedia('player:test',{teamId:'national_team:test',at:'2026-07-01'}).url,null);
 assert.equal(m.contextMedia('player:test',{teamId:'club:test',at:'2026-10-11'}).url,null);
 assert.throws(()=>m.registerContextMedia({...input,teamId:'national_team:test',assetId:'nation_asset'}));
 assert.throws(()=>m.registerContextMedia({...input,startsAt:'2026-07-01'}));
 run('UPDATE visual_assets SET relative_path=? WHERE id=?','../outside.png','club_asset');
 writeFileSync(join(dataDir,'outside.png'),bytes);
 assert.equal(m.contextMedia('player:test',{teamId:'club:test',at:'2026-07-01'}).url,null);
 db.close();`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'test'},encoding:'utf8',timeout:45000});assert.equal(r.status,0,r.stderr||r.stdout);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
