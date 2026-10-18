import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {resolve,join} from 'node:path';import {spawnSync} from 'node:child_process';
test('repository source catalog is packaged with real local images, then upgrades idempotently without replacing edits',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'hk-source-'));try{
 const {buildSourceLibrary,optimizeSourceLibrary}=await import('../scripts/build-source-library.mjs');
 const result=buildSourceLibrary(resolve('../football-library'),join(temp,'pack'));
 await optimizeSourceLibrary(join(temp,'pack'));assert.equal(result.clubs,58);assert.equal(result.players,1612);assert.ok(result.images>=1374);
 const pack=JSON.parse(readFileSync(join(temp,'pack/manifest.json'),'utf8'));assert.ok(pack.media.every(m=>m.sourceSha256&&m.contentType==='image/webp'));assert.equal(pack.entities.filter(e=>e.type==='player').length,1612);
 const r=spawnSync(process.execPath,['--input-type=module','-e',`
 import assert from 'node:assert/strict';import {installSourceLibrary} from './server/source-library.mjs';import {one,run,db} from './server/database.mjs';import {playerSearch,playerAutofill} from './server/football-autofill.mjs';import {getMedia} from './server/visual-media.mjs';
 const result=installSourceLibrary(process.env.PACK);assert.equal(result.players,1612);
 const p=playerSearch('Rodrygo')[0];assert.ok(p);const d=playerAutofill(p.id);assert.equal(d.currentClub,'Real Madrid');assert.equal(d.shirtNumber,11);assert.ok(d.photo.startsWith('/api/visual-media/'));assert.ok(getMedia(d.photo.split('/').pop()).bytes.length>100);assert.equal(d.verification,'pending');
 run('UPDATE football_entities SET name_ar=? WHERE id=?','اسم معدل يدويًا',p.id);installSourceLibrary(process.env.PACK);assert.equal(one('SELECT name_ar FROM football_entities WHERE id=?',p.id).name_ar,'اسم معدل يدويًا');assert.equal(one("SELECT count(*) n FROM football_entities WHERE id LIKE 'player:source:%'").n,1612);db.close();
 `],{encoding:'utf8',env:{...process.env,DATA_DIR:join(temp,'db'),PACK:join(temp,'pack')},timeout:60000});assert.equal(r.status,0,r.stderr||r.stdout);
 const media=pack.media[0];writeFileSync(join(temp,'pack',media.file),'corrupt');
 const failed=spawnSync(process.execPath,['--input-type=module','-e',`import {installSourceLibrary} from './server/source-library.mjs';installSourceLibrary(process.env.PACK);`],{encoding:'utf8',env:{...process.env,DATA_DIR:join(temp,'broken'),PACK:join(temp,'pack')},timeout:60000});assert.notEqual(failed.status,0);assert.match(failed.stderr,/checksum/i);
 }finally{rmSync(temp,{recursive:true,force:true})}
});
