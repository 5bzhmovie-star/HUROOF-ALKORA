import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('shared football entity identity, historical relations, reporting and deduplication',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hk-football-library-'));
 const script=[
 "import assert from 'node:assert/strict';",
 "import {db,seedDatabase,one} from './server/database.mjs';",
 "import {addEntity,addRelation,searchEntities,getHistory,libraryStats,reviewEntity} from './server/football-library.mjs';",
 "seedDatabase();",
 "const first=addEntity({type:'player',externalKey:'fifa:athlete123',nameAr:'لاعب اختبار',nameEn:'Fixture Athlete',source:'https://example.org/players/123',verifiedAt:'2026-10-09',verification:'pending'});",
 "const club=addEntity({type:'club',externalKey:'fifa:club123',nameAr:'نادي اختبار',nameEn:'Fixture Club',source:'https://example.org/clubs/123',verifiedAt:'2026-10-09',verification:'pending'});",
 "assert.throws(()=>addEntity({type:'player',externalKey:'fifa:athlete123',nameAr:'لاعب مكرر',nameEn:'Duplicate',source:'https://example.org/a',verifiedAt:'2026-10-09',verification:'pending'}),/مسجل/);",
 "const relation={type:'played_for',from:first.id,to:club.id,fromDate:'2020-01-01',toDate:'2022-01-01',source:'https://example.org/history',verifiedAt:'2026-10-09'};",
 "const rel=addRelation(relation);assert.ok(rel.id);",
 "assert.throws(()=>addRelation(relation),/مسجلة/);",
 "assert.throws(()=>addRelation({...relation,fromDate:'2024-02-20',toDate:'2023-02-20'}),/تاريخية/);",
 "assert.equal(searchEntities({type:'player',search:'Fixture'}).length,1);",
 "assert.throws(()=>addEntity({type:'player',externalKey:'dup-review',nameAr:'هوية غير مدققة',nameEn:'Unreviewed',source:'https://example.org/id',verifiedAt:'2026-10-09',verification:'reviewed'}),/المراجعة/);",
 "assert.throws(()=>reviewEntity(first.id,'http://bad.org','owner-test'),/مصدر/);",
 "assert.equal(reviewEntity(first.id,'https://example.org/evidence','owner-test').verification,'reviewed');",
 "assert.equal(getHistory(first.id).length,1);",
 "const stats=libraryStats();assert.ok(stats.entities.some(e=>e.type==='player'));assert.ok(stats.pendingReview>=2);",
 "assert.ok(one('SELECT count(*) n FROM mini_game_rounds').n>0);",
 "db.close();console.log('football-library-ok');"
 ].join('\n');
 try{
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'desktop'},encoding:'utf8',timeout:60000});
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,/football-library-ok/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
