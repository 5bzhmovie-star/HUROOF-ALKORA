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
   assert.equal(count.importedOrAlreadyExisting,26);
   if(attempt===0)assert.equal(count.relationsAdded,22);
   else assert.equal(count.relationsAdded,0);
  }
  const verify=spawnSync(process.execPath,['--input-type=module','-e',
    "import {one,db} from './server/database.mjs';console.log(JSON.stringify({players:one(\"SELECT count(*) n FROM football_entities WHERE entity_type='player' AND id LIKE 'player:player:%'\").n,relations:one(\"SELECT count(*) n FROM football_relations WHERE relation_type='appeared_in'\").n,mini:one('SELECT count(*) n FROM mini_game_rounds').n}));db.close();"
  ],{cwd:resolve('.'),env,encoding:'utf8',timeout:30000});
  assert.equal(verify.status,0,verify.stderr);
  const result=JSON.parse(verify.stdout);
  assert.equal(result.players,22);
  assert.equal(result.relations,22);
  assert.ok(result.mini>0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
