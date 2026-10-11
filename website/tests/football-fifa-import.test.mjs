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
 import {db,one,run} from './server/database.mjs';
 import {readFileSync} from 'node:fs';
 import * as m from './server/football-fifa-import.mjs';
 assert.equal(typeof m.importFifaSnapshot,'function');
 const a=m.importFifaSnapshot();assert.equal(a.players,1248);assert.equal(a.teams,48);assert.equal(a.coaches,48);
 const count=one('SELECT count(*) n FROM football_entities').n;
 m.importFifaSnapshot();assert.equal(one('SELECT count(*) n FROM football_entities').n,count);
 const evidence=JSON.parse(readFileSync('../football-library/data/wc2026_players.json','utf8'));
 assert.equal(evidence.filter(p=>p.textCorrections).length,17);
 for(const p of evidence.filter(p=>p.textCorrections).slice(0,2)){
 const originalName=p.rawCells[4]+' '+p.rawCells[5];const originalClub=p.rawCells[10];
 const entity=one('SELECT * FROM football_entities WHERE id=?',p.id),metadata=JSON.parse(entity.metadata);
 Object.assign(metadata,{nameEn:originalName,nameOriginal:originalName,firstNames:p.rawCells[4],sourceDisplayName:p.rawCells[2],clubAtWorldCup:originalClub,textIssues:p.textCorrections.cells.map(c=>c.column)});delete metadata.textCorrections;
 run('UPDATE football_entities SET name_en=?,name_ar=?,fallback=?,metadata=? WHERE id=?',originalName,originalName,originalName,JSON.stringify(metadata),p.id);
 const fact=one('SELECT * FROM football_fact_records WHERE id=?',p.id+':personal:wc2026'),payload=JSON.parse(fact.payload);Object.assign(payload,{nameOriginal:originalName,clubAtWorldCup:originalClub});run('UPDATE football_fact_records SET payload=? WHERE id=?',JSON.stringify(payload),fact.id);
 const relation=one('SELECT * FROM football_relations WHERE id=?',p.id+':wc2026-squad'),link=JSON.parse(relation.metadata);link.clubAtWorldCup=originalClub;run('UPDATE football_relations SET metadata=? WHERE id=?',JSON.stringify(link),relation.id);
 m.importFifaSnapshot();
 const updated=one('SELECT * FROM football_entities WHERE id=?',p.id);assert.equal(updated.name_en,p.nameEn);assert.equal(updated.name_ar,p.nameEn);assert.equal(JSON.parse(updated.metadata).textIssues.length,0);assert.equal(JSON.parse(one('SELECT payload FROM football_fact_records WHERE id=?',fact.id).payload).clubAtWorldCup,p.clubAtWorldCup);assert.equal(JSON.parse(one('SELECT metadata FROM football_relations WHERE id=?',relation.id).metadata).clubAtWorldCup,p.clubAtWorldCup);
 const stale=JSON.parse(updated.metadata);stale.textIssues=p.textCorrections.cells.map(c=>c.column);delete stale.textCorrections;run('UPDATE football_entities SET metadata=? WHERE id=?',JSON.stringify(stale),p.id);m.importFifaSnapshot();assert.equal(JSON.parse(one('SELECT metadata FROM football_entities WHERE id=?',p.id).metadata).textIssues.length,0);
 }
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
