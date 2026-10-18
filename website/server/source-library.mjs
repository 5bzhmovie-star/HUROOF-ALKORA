import {existsSync,readFileSync,mkdirSync,writeFileSync,lstatSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {root,dataDir,one,run,transaction} from './database.mjs';
export function installSourceLibrary(dir=resolve(root,'seed/source-library')){
 const manifest=resolve(dir,'manifest.json');if(!existsSync(manifest))return {players:0,clubs:0,images:0,missing:true};
 const pack=JSON.parse(readFileSync(manifest,'utf8'));if(pack.format!=='huroof-source-library-v1'||!Array.isArray(pack.entities)||!Array.isArray(pack.media))throw Error('Invalid source library');
 const directory=resolve(dataDir,'visual-media');mkdirSync(directory,{recursive:true,mode:0o700});
 // Validate every file before the database transaction; never flag an incomplete import as installed.
 const formats={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
 const assets=pack.media.map(m=>{if(!/^[a-f0-9]{64}$/.test(m.id)||m.sha256!==m.id||!formats[m.contentType]||m.file!=='images/'+m.id+formats[m.contentType])throw Error('Invalid source media path');const path=resolve(dir,m.file);if(lstatSync(path).isSymbolicLink()||lstatSync(resolve(dir,'images')).isSymbolicLink())throw Error('Source media symlink');const bytes=readFileSync(path);if(bytes.length!==m.bytes||bytes.length>12582912||createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Source image checksum mismatch');const file=m.id+formats[m.contentType];const target=resolve(directory,file);if(!existsSync(target)||createHash('sha256').update(readFileSync(target)).digest('hex')!==m.sha256)writeFileSync(target,bytes,{mode:0o600});return {m,file}});
 const mediaIds=new Set(pack.media.map(m=>m.id));
 for(const e of pack.entities)if(!/^(club|player):source:[a-zA-Z0-9_-]+$/.test(e.id)||!['club','player'].includes(e.type)||!e.nameAr||!e.nameEn||(e.image&&!mediaIds.has(e.image)))throw Error('Invalid source entity');
 transaction(()=>{
 for(const {m,file} of assets){const existing=one('SELECT id FROM visual_assets WHERE sha256=?',m.sha256);if(!existing)run('INSERT INTO visual_assets(id,content_type,relative_path,sha256,license,source,created_at) VALUES(?,?,?,?,?,?,?)',m.id,m.contentType,file,m.sha256,m.license,m.source,Date.now());}
 for(const e of pack.entities){const actual=e.image?one('SELECT id FROM visual_assets WHERE sha256=?',e.image):null;run('INSERT OR IGNORE INTO football_entities(id,entity_type,name_ar,name_en,image_key,image_source,image_license,fallback,metadata,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',e.id,e.type,e.nameAr,e.nameEn,actual?'/api/visual-media/'+actual.id:null,e.metadata.source,'حقوق المصدر — بانتظار المراجعة',e.nameAr,JSON.stringify(e.metadata),Date.now());}
 run("INSERT INTO settings(key,value) VALUES('source_library_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",pack.version);
 });return {players:pack.entities.filter(e=>e.type==='player').length,clubs:pack.entities.filter(e=>e.type==='club').length,images:pack.media.length};
}
