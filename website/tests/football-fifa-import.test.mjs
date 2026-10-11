import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
test('FIFA import is idempotent, dated and preserves current-club uncertainty',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fifa-import-'));
 try{
 const r=spawnSync(process.execPath,['--input-type=module','-e',`
 import assert from 'node:assert/strict';
 import {db,one} from './server/database.mjs';
 import * as m from './server/football-fifa-import.mjs';
 assert.equal(typeof m.importFifaSnapshot,'function');
 const a=m.importFifaSnapshot();assert.equal(a.players,1248);assert.equal(a.teams,48);assert.equal(a.coaches,48);
 const count=one('SELECT count(*) n FROM football_entities').n;
 m.importFifaSnapshot();assert.equal(one('SELECT count(*) n FROM football_entities').n,count);
 const row=one("SELECT metadata FROM football_entities WHERE entity_type='player' AND name_en='Lionel Andrés MESSI'");
 assert.ok(row);const data=JSON.parse(row.metadata);assert.equal(data.currentClub,undefined);
 assert.equal(data.clubAtWorldCup,'Inter Miami CF (USA)');
 assert.equal(data.asOf,'2026-07-19');assert.equal(data.verification,'pending');
 assert.equal(one('SELECT count(*) n FROM football_squad_snapshots').n,48);
 assert.equal(m.installFifaFlags().installed,48);assert.equal(m.installFifaFlags().installed,0);
 assert.equal(one('SELECT count(*) n FROM football_context_media').n,48);
 const {contextMedia}=await import('./server/football-context.mjs');
 assert.equal(contextMedia('national_team:fifa:ksa',{role:'flag',at:'2026-10-12'}).status,'reviewed');
 db.close();`],{cwd:resolve('.'),env:{...process.env,DATA_DIR:dir,NODE_ENV:'test'},encoding:'utf8',timeout:60000});
 assert.equal(r.status,0,r.stderr||r.stdout);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
