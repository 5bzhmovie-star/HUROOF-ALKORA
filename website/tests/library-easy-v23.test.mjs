import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('personal images persist, library edits preserve history, and personal questions publish without a source URL',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hk-easy-'));
 try {
 const r=spawnSync(process.execPath,['--input-type=module','-e',`
 import assert from 'node:assert/strict';
 import {db,one,run,seedDatabase} from './server/database.mjs';
 import {saveMedia,getMedia} from './server/visual-media.mjs';
 import {saveLibraryEntity} from './server/football-library-edit.mjs';
 import {playerSearch,playerAutofill} from './server/football-autofill.mjs';
 import {adminWrite} from './server/admin.mjs';
 const bytes='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6PwAAAABJRU5ErkJggg==';
 const photo=saveMedia({origin:'computer',fileName:'صورتي.png',contentType:'image/png',base64:bytes});
 assert.ok(getMedia(photo.id).bytes.length>30);
 assert.equal(saveMedia({origin:'computer',contentType:'image/png',base64:bytes}).id,photo.id);
 assert.throws(()=>saveMedia({origin:'computer',contentType:'image/png',base64:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')}));
 const club=saveLibraryEntity({type:'club',nameAr:'نادي خاص',imageUrl:photo.url});
 assert.equal(club.name_en,'نادي خاص');
 const p=saveLibraryEntity({type:'player',nameAr:'محمد تجربة',imageUrl:photo.url,nationality:'BR',position:'GK',shirtNumber:12,clubId:club.id,clubAtDate:'نادي خاص',aliases:['My Custom Player']});
 assert.equal(playerSearch('My Custom Player')[0].id,p.id);
 let auto=playerAutofill(p.id);assert.equal(auto.photo,photo.url);assert.equal(auto.currentClub,'نادي خاص');assert.equal(auto.clubLogo,photo.url);assert.equal(auto.shirtNumber,12);
 run("UPDATE football_entities SET metadata=json_set(metadata,'$.retainedHistory','keep-me') WHERE id=?",p.id);
 const edited=saveLibraryEntity({id:p.id,type:'player',nameAr:'محمد معدل',imageUrl:photo.url,nationality:'SA',position:'ST',shirtNumber:9,clubAtDate:'تغيير يدوي'});
 assert.equal(edited.id,p.id);auto=playerAutofill(p.id);assert.equal(auto.currentClub,'تغيير يدوي');assert.equal(auto.shirtNumber,9);assert.equal(edited.metadata.retainedHistory,'keep-me');
 const linked=saveLibraryEntity({type:'player',nameAr:'لاعب بعلاقة فقط'});
 run('INSERT INTO football_relations VALUES(?,?,?,?,?,?,?,?)','relation-test',linked.id,club.id,'played_for','2025-01-01',null,'{}','https://example.org');
 saveLibraryEntity({id:linked.id,type:'player',nameAr:'الاسم المعدل',imageUrl:photo.url});
 assert.equal(playerAutofill(linked.id).currentClub,'نادي خاص');
 run('UPDATE football_entities SET image_key=?,image_source=?,image_license=? WHERE id=?','https://example.org/legacy.png','https://example.org','legacy',linked.id);
 const legacy=saveLibraryEntity({id:linked.id,type:'player',nameAr:'اسم قديم',imageUrl:'https://example.org/legacy.png'});
 assert.equal(legacy.image_key,'https://example.org/legacy.png');assert.equal(legacy.image_license,'legacy');
 for(const type of ['national_team','coach','flag','country','competition','stadium','fixture','season'])assert.ok(saveLibraryEntity({type,nameAr:'إضافة '+type,imageUrl:photo.url}).id);
 assert.throws(()=>saveLibraryEntity({id:'not-found',type:'player',nameAr:'اسم'}));
 assert.throws(()=>saveLibraryEntity({type:'player',nameAr:'اسم',imageUrl:'https://example.org/unpersisted.png'}));
 assert.throws(()=>saveLibraryEntity({type:'script',nameAr:'اسم'}));
 seedDatabase();
 const personal=adminWrite('visual-question',{tournament_id:'saudi',letter:'م',text:'من اللاعب الظاهر في هذه الصورة؟',answer:'محمد تجربة',difficulty:'medium',status:'published',source:'',visual:{type:'image',image:photo.url,eventDate:'2026-10-19',verifiedAt:'2026-10-19',origin:'user',source:''}},{active:1,role:'owner',username:'owner'});
 assert.equal(one('SELECT status FROM questions WHERE id=?',personal.id).status,'published');
 assert.throws(()=>adminWrite('football-entity-save',{type:'player',nameAr:'اسم'},null));
 db.close();
 `],{encoding:'utf8',env:{...process.env,DATA_DIR:dir},timeout:60000});
 assert.equal(r.status,0,r.stderr);
 } finally {rmSync(dir,{recursive:true,force:true})}
});
