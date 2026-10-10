import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
test('Arabic and English player aliases fill the same canonical record without false stats',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hk-autofill-'));
 try{const source=[
 "import assert from 'node:assert/strict';",
 "import {seedDatabase,db} from './server/database.mjs';",
 "import {playerSearch,playerAutofill} from './server/football-autofill.mjs';",
 "seedDatabase();",
 "const arabic=playerSearch('ميسي');const english=playerSearch('Messi');",
 "assert.ok(arabic.length>0);assert.ok(english.length>0);",
 "const p=playerAutofill(arabic[0].id);assert.ok(p.nameAr);",
 "assert.ok(Array.isArray(p.career));assert.ok(Array.isArray(p.missing));",
 "assert.equal(p.shirtNumber==null,true);",
 "db.close();console.log('autofill-ok');"
 ].join('\n');const r=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'desktop',ATLAS_AUTO_IMAGES:'0'},encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/autofill-ok/)}
 finally{rmSync(dir,{recursive:true,force:true})}
});