import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

test('owner reset saves full JSON backup, preserves mini games and prevents reseed on restart',()=>{
  const dir=mkdtempSync(join(tmpdir(),'huroof-reset-'));
  const js=String.raw`
    import {one,many,run,db,seedDatabase,dataDir} from './server/database.mjs';
    import {adminGet,adminWrite} from './server/admin.mjs';
    import {readdirSync,readFileSync} from 'node:fs';
    import {resolve} from 'node:path';
    import assert from 'node:assert/strict';
    const owner={id:'owner-test',username:'owner-test',role:'owner',active:1};
    seedDatabase();
    const count=one('SELECT count(*) n FROM questions').n;
    const minis=one('SELECT count(*) n FROM mini_game_rounds').n;
    const tournaments=one('SELECT count(*) n FROM tournaments').n;
    assert.ok(count>1000);
    assert.ok(minis>0);
    assert.throws(()=>adminWrite('questions-reset',{confirm:'wrong',expectedCount:count},owner),/التأكيد/);
    assert.throws(()=>adminWrite('questions-reset',{confirm:'حذف جميع الأسئلة',expectedCount:count-1},owner),/العدد/);
    assert.throws(()=>adminWrite('questions-reset',{confirm:'حذف جميع الأسئلة',expectedCount:count},{...owner,role:'manager'}),/صلاحية/);
    assert.equal(one('SELECT count(*) n FROM questions').n,count);
    const result=adminWrite('questions-reset',{confirm:'حذف جميع الأسئلة',expectedCount:count},owner);
    assert.equal(result.deleted,count);
    assert.equal(result.remaining,0);
    const raw=readFileSync(resolve(dataDir,'backups',result.backupFile),'utf8');
    const backup=JSON.parse(raw);
    assert.equal(backup.count,count);
    assert.equal(backup.questions.length,count);
    assert.equal(createHash('sha256').update(raw).digest('hex'),result.sha256);
    assert.equal(one('SELECT count(*) n FROM mini_game_rounds').n,minis);
    assert.equal(one('SELECT count(*) n FROM tournaments').n,tournaments);
    run("UPDATE settings SET value='0' WHERE key='seed_version'");
    seedDatabase();
    assert.equal(one('SELECT count(*) n FROM questions').n,0);
    assert.equal(one('SELECT count(*) n FROM mini_game_rounds').n,minis);
    assert.equal(adminGet('questions-reset-info',new URL('http://localhost'),owner).count,0);
    db.close();
    console.log('reset-check-ok');
  `;
  try {
    const r=spawnSync(process.execPath,['--input-type=module','-e',js],{
      cwd:resolve('.'),
      env:{...process.env,DATA_DIR:dir,NODE_ENV:'desktop'},
      encoding:'utf8',timeout:60000,maxBuffer:2_000_000
    });
    assert.equal(r.status,0,r.stderr||r.stdout);
    assert.match(r.stdout,/reset-check-ok/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
