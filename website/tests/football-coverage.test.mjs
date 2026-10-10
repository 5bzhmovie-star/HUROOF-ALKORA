import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
test('coverage gate never claims missing eleven logos and images are ready',()=>{
 const dir=mkdtempSync(join(tmpdir(),'atlas-coverage-'));
 try{const code=["import assert from 'node:assert/strict';","import {seedDatabase,db} from './server/database.mjs';","import {atlasCoverage} from './server/football-coverage.mjs';","seedDatabase();const result=atlasCoverage();","assert.equal(result.competitions.length,11);","assert.equal(result.logosRequired,11);","assert.equal(result.logosCached,0);",
 "assert.ok(result.competitions.every(c=>c.logoUrl===null));",
 "assert.equal(result.playerPhotosCached,0);","assert.equal(result.releaseReady,false);","db.close();"].join('\n');
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'test'},encoding:'utf8',timeout:45000});assert.equal(r.status,0,r.stderr||r.stdout)}finally{rmSync(dir,{recursive:true,force:true})}
});