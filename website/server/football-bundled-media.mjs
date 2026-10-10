// Offline atlas images bundled with the Windows game. No network needed at startup.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {root,one,run} from './database.mjs';
import {saveMedia,referencedMediaExists} from './visual-media.mjs';

const formats={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
const localPrefix='/api/visual-media/';
export function installBundledAtlasMedia(dir=resolve(root,'seed/atlas-media')){
 const manifestPath=resolve(dir,'manifest.json');
 if(!existsSync(manifestPath))return {installed:0,skipped:0,missing:0,reason:'no bundled media pack'};
 const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
 if(manifest.format!=='huroof-atlas-media-v1'||!Array.isArray(manifest.images))throw Error('Invalid atlas media manifest');
 let installed=0,skipped=0,missing=0;
 for(const item of manifest.images){
  if(!item||typeof item.entityId!=='string'||!/^(player|competition|club|national_team):[a-zA-Z0-9:_-]+$/.test(item.entityId)){missing++;continue}
  const suffix=formats[item.contentType],filename=item.file;
  if(!suffix||typeof filename!=='string'||basename(filename)!==filename||!filename.endsWith(suffix)){missing++;continue}
  if(typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256)||
     !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(item.source||'')||
     typeof item.license!=='string'||!item.license.trim()){missing++;continue}
  const row=one('SELECT image_key FROM football_entities WHERE id=?',item.entityId);
  if(!row){missing++;continue}
  if(row.image_key?.startsWith(localPrefix)&&referencedMediaExists(row.image_key)){skipped++;continue}
  const filePath=resolve(dir,filename);
  if(!existsSync(filePath)){missing++;continue}
  const bytes=readFileSync(filePath);
  if(createHash('sha256').update(bytes).digest('hex')!==item.sha256){missing++;continue}
  try{
   const media=saveMedia({contentType:item.contentType,base64:bytes.toString('base64'),source:item.source,license:item.license});
   run('UPDATE football_entities SET image_key=?,image_source=?,image_license=?,updated_at=? WHERE id=?',
    media.url,item.source,item.license,Date.now(),item.entityId);
   installed++;
  }catch(e){missing++;console.warn('Bundled atlas media skipped',item.entityId,String(e.message||e))}
 }
 return {installed,skipped,missing,total:manifest.images.length};
}
