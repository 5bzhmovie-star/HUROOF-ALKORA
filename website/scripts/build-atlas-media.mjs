// Generates an actual binary image bundle in seed/atlas-media during release builds.
// Never substitute icons or mark missing downloads as bundled photographs.
import {mkdirSync,writeFileSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {root,db,one,many,seedDatabase} from '../server/database.mjs';
import {importCompetitionCatalog} from '../server/football-competitions.mjs';
import {addEntity} from '../server/football-library.mjs';
import {importOfficialStarter} from '../server/football-starter.mjs';
import {cacheCandidateImage} from '../server/football-media-cache.mjs';
const output=resolve(root,'seed/atlas-media');
const imagesDir=resolve(process.env.DATA_DIR||resolve(root,'data'),'visual-media');
const mimemap={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
seedDatabase();importCompetitionCatalog({addEntity,one});importOfficialStarter();
mkdirSync(output,{recursive:true});
const entities=many("SELECT id,entity_type FROM football_entities WHERE entity_type IN ('competition','player') ORDER BY CASE WHEN entity_type='competition' THEN 0 ELSE 1 END,id");
const images=[],failures=[];
for(const [index,entity] of entities.entries()){
 try{
  const status=await cacheCandidateImage(entity.id);
  if(status.status!=='cached'){failures.push({id:entity.id,reason:status.status});continue}
  const assetId=status.url.slice('/api/visual-media/'.length);
  const asset=one('SELECT * FROM visual_assets WHERE id=?',assetId);
  if(!asset||!mimemap[asset.content_type]||!existsSync(resolve(imagesDir,asset.relative_path))){
   failures.push({id:entity.id,reason:'file-not-found'});continue;
  }
  const bytes=readFileSync(resolve(imagesDir,asset.relative_path));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const file=sha256+mimemap[asset.content_type];
  writeFileSync(resolve(output,file),bytes);
  images.push({entityId:entity.id,file,sha256,contentType:asset.content_type,source:asset.source,license:asset.license});
 }catch(e){failures.push({id:entity.id,reason:String(e.message||e).slice(0,200)})}
 if((index+1)%10===0)console.log('Atlas pictures:',index+1,'/',entities.length,'files:',images.length,'missing:',failures.length);
}
writeFileSync(resolve(output,'manifest.json'),JSON.stringify({format:'huroof-atlas-media-v1',generatedAt:new Date().toISOString(),images,failures},null,2)+'\n');
db.close();
console.log(JSON.stringify({required:entities.length,downloaded:images.length,missing:failures.length,failures},null,2));
if(failures.length)process.exitCode=1;
