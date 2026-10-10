import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('viewer read-only player and club detail exposes only recorded statistics',()=>{
 const dir=mkdtempSync(join(tmpdir(),'huroof-atlas-view-'));
 try{
  const code=[
  "import assert from 'node:assert/strict';",
  "import {db,seedDatabase} from './server/database.mjs';",
  "import {atlasExplore,atlasDetail} from './server/football-viewer.mjs';",
  "seedDatabase();",
  "const list=atlasExplore({type:'player',q:'ميسي'});",
  "assert.ok(list.total>=1);",
  "const result=atlasDetail(list.items[0].id);",
  "assert.equal(result.entity.entity_type,'player');",
  "assert.ok(Array.isArray(result.related));",
  "assert.equal(result.statsVerified,false);",
  "assert.equal(Object.hasOwn(result.metrics,'goals'),false);",
  "assert.throws(()=>atlasDetail('invalid:missing'),/غير موجود/);",
  "assert.equal(atlasExplore({type:'player',q:'not-real-record'}).total,0);",
  "db.close();console.log('atlas-view-ok')"
  ].join('\n');
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'desktop'},encoding:'utf8',timeout:60000});
  assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/atlas-view-ok/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
