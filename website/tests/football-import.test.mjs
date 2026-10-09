import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
test('historical atlas batch dry run, uniqueness, rollback and repeat-safe import',()=>{
 const dir=mkdtempSync(join(tmpdir(),'atlas-test-'));
 const code=[
 "import assert from 'node:assert/strict';",
 "import {db,seedDatabase,one} from './server/database.mjs';",
 "import {importCatalogBatch,validateCatalogBatch,importHistory} from './server/football-import.mjs';",
 "seedDatabase();",
 "const e=(key,type,name)=>({externalKey:key,type,nameAr:name,nameEn:name,verifiedAt:'2026-10-09',source:'https://example.org/official'});",
 "const batch={format:'huroof-football-catalog-v1',source:'https://example.org/season',snapshotDate:'2026-10-09',entities:[e('atlas-test-p','player','لاعب الاختبار'),e('atlas-test-c','club','نادي الاختبار')],relations:[{type:'played_for',from:'player:atlas-test-p',to:'club:atlas-test-c',fromDate:'2025-07-01',verifiedAt:'2026-10-09',source:'https://example.org/transfer'}]};",
 "assert.equal(importCatalogBatch(batch).dryRun,true);",
 "assert.equal(one(\"SELECT count(*) n FROM football_entities WHERE id='player:atlas-test-p'\").n,0);",
 "assert.throws(()=>validateCatalogBatch({...batch,entities:[batch.entities[0],batch.entities[0]]}),/مكررة/);",
 "assert.throws(()=>importCatalogBatch({...batch,entities:[{...batch.entities[0],imageUrl:'https://untrusted.org/player.jpg'}]}),/المحلية/);",
 "const first=importCatalogBatch(batch,{dryRun:false});assert.equal(first.added,2);assert.equal(first.linked,1);",
 "const again=importCatalogBatch(batch,{dryRun:false});assert.equal(again.added,0);assert.equal(again.existing,2);assert.equal(again.linked,0);",
 "assert.equal(importHistory().length,2);",
 "assert.equal(one(\"SELECT count(*) n FROM football_relations WHERE from_entity_id='player:atlas-test-p'\").n,1);",
 "assert.ok(one('SELECT count(*) n FROM mini_game_rounds').n>0);db.close();console.log('atlas-ok');"
 ].join('\n');
 try{const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'desktop'},encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/atlas-ok/)}finally{rmSync(dir,{recursive:true,force:true})}
});
