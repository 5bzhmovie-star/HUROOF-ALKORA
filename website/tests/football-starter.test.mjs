import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('official source starter loads 22 distinct player identities and is idempotent',()=>{
 const dir=mkdtempSync(join(tmpdir(),'huroof-starter-'));
 try{
  const env={...process.env,DATA_DIR:dir,NODE_ENV:'desktop'};
  for(let attempt=0;attempt<2;attempt++){
   const result=spawnSync(process.execPath,['scripts/import-football-starter.mjs'],{cwd:resolve('.'),env,encoding:'utf8',timeout:60000});
   assert.equal(result.status,0,result.stderr||result.stdout);
   const count=JSON.parse(result.stdout);
   assert.equal(count.sourceLinkedEntities,32);
   if(attempt===0){assert.equal(count.relationsAdded,22);assert.equal(count.careerRelationsAdded,6);}
   else {assert.equal(count.relationsAdded,0);assert.equal(count.careerRelationsAdded,0);}
  }
  const verify=spawnSync(process.execPath,['--input-type=module','-e',
    "import {one,db} from './server/database.mjs';import {careerDraft,fixtureDraft} from './server/football-library.mjs';const career=careerDraft('salah');const fixture=fixtureDraft('fixture:match:ucl2022final');console.log(JSON.stringify({players:one(\"SELECT count(DISTINCT from_entity_id) n FROM football_relations WHERE relation_type='appeared_in'\").n,relations:one(\"SELECT count(*) n FROM football_relations WHERE relation_type='appeared_in'\").n,mini:one('SELECT count(*) n FROM mini_game_rounds').n,careerStops:career.stations.length,careerPublishable:career.publishable,fixturePlayers:fixture.players.length,fixturePublishable:fixture.publishable}));db.close();"
  ],{cwd:resolve('.'),env,encoding:'utf8',timeout:30000});
  assert.equal(verify.status,0,verify.stderr);
  const result=JSON.parse(verify.stdout);
  assert.equal(result.players,22);
  assert.equal(result.relations,22);
  assert.ok(result.mini>0);
  assert.equal(result.careerStops,6);
  assert.equal(result.careerPublishable,false);
  assert.equal(result.fixturePlayers,11);
  assert.equal(result.fixturePublishable,false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
