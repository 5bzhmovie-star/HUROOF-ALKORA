// Deterministic offline snapshot. Source records remain pending; never infer careers.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,openSync,closeSync,readSync,unlinkSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function buildSourceLibrary(sourceRoot,outputDir){
 const root=resolve(sourceRoot),out=resolve(outputDir);const safe=p=>{if(typeof p!=='string'||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe catalog path');const full=resolve(root,p);if(isAbsolute(relative(root,full))||relative(root,full).startsWith('..'))throw Error('Unsafe catalog path');let walk=root;for(const s of p.split('/')){walk=resolve(walk,s);if(existsSync(walk)&&lstatSync(walk).isSymbolicLink())throw Error('Catalog symlink');}return full};
 const json=p=>JSON.parse(readFileSync(safe(p),'utf8'));
 const catalogDir='data/php_source_catalog_2026_10_18/';const index=json(catalogDir+'index.json');
 if(index.format!=='huroof-php-source-catalog-v1')throw Error('Unsupported source catalog');
 const files=new Map(),ranges=new Map();
 for(const file of ['data/media_files.index.json','data/club_badges_supplement.index.json'])if(existsSync(safe(file)))for(const m of json(file).files)files.set(m.sha256,m);
 for(const dir of ['assets/bundles/','assets/club_badges/bundles/'])if(existsSync(safe(dir+'index.json')))for(const part of json(dir+'index.json').parts)for(const f of part.files)ranges.set(f.sha256,{...f,bundle:dir+part.path,partBytes:part.bytes});
 mkdirSync(resolve(out,'images'),{recursive:true});const media=new Map(),entities=[];
 function image(sha){if(!sha)return null;if(media.has(sha))return sha;if(!/^[a-f0-9]{64}$/.test(sha))throw Error('Invalid image hash');const m=files.get(sha);if(!m)throw Error('Missing indexed image '+sha);let bytes;
 if(existsSync(safe(m.path)))bytes=readFileSync(safe(m.path));else{const f=ranges.get(sha);if(!f||f.bytes!==m.bytes||!Number.isInteger(f.offset)||f.offset<512||f.offset%512!==0||f.bytes>12582912)throw Error('Missing/invalid media range '+sha);const path=safe(f.bundle);if(lstatSync(path).size!==f.partBytes||f.offset+f.bytes>f.partBytes)throw Error('Truncated media bundle');const fd=openSync(path,'r');try{bytes=Buffer.alloc(f.bytes);if(readSync(fd,bytes,0,f.bytes,f.offset)!==f.bytes)throw Error('Truncated media');}finally{closeSync(fd)}}
 if(bytes.length!==m.bytes||hash(bytes)!==sha)throw Error('Image checksum mismatch '+sha);
 const ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216?'jpg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;if(!ext)throw Error('Invalid raster');
 const file='images/'+sha+'.'+ext;writeFileSync(resolve(out,file),bytes);const evidence=m.evidence?.[0]||{};
 media.set(sha,{id:sha,file,sha256:sha,bytes:bytes.length,contentType:{png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[ext],source:evidence.sourcePage||evidence.source||'https://www.fifa.com/',license:'حقوق المصدر — بانتظار مراجعة الاستخدام',review:'pending'});return sha;
 }
 for(const entry of index.clubs){const raw=readFileSync(safe(catalogDir+entry.file));if(raw.length!==entry.bytes||hash(raw)!==entry.sha256)throw Error('Club checksum mismatch');const club=JSON.parse(raw);const clubId='club:source:'+club.id;
 entities.push({id:clubId,type:'club',nameAr:club.nameAr||club.name,nameEn:club.name,image:image(club.logo),metadata:{source:club.source,verification:'pending',season:index.season,league:club.league,sourceSnapshot:true,aliases:[club.name,club.nameAr].filter(Boolean)}});
 for(const p of club.players)entities.push({id:'player:source:'+p.id,type:'player',nameAr:p.nameAr||p.name,nameEn:p.name,image:image(p.photo),metadata:{...p,photo:undefined,id:undefined,verification:'pending',sourceSnapshot:true,sourceClubId:clubId,clubAtDate:club.nameAr||club.name,season:index.season,league:club.league,aliases:[p.name,p.nameAr,...(p.aliases||[])].filter(Boolean)}});
 }
 const pack={format:'huroof-source-library-v1',version:hash(Buffer.from(JSON.stringify(entities))),season:index.season,entities,media:[...media.values()]};writeFileSync(resolve(out,'manifest.json'),JSON.stringify(pack));return {clubs:index.clubs.length,players:entities.filter(e=>e.type==='player').length,images:media.size};
}
export async function optimizeSourceLibrary(outputDir){
 const {default:sharp}=await import('sharp');const dir=resolve(outputDir),manifest=resolve(dir,'manifest.json');const pack=JSON.parse(readFileSync(manifest,'utf8'));const mapping=new Map(),converted=[];let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<pack.media.length){const m=pack.media[cursor++],original=readFileSync(resolve(dir,m.file));if(hash(original)!==m.sha256)throw Error('Original image checksum mismatch');const bytes=await sharp(original,{limitInputPixels:50000000}).rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:4}).toBuffer();const sha=hash(bytes),file='images/'+sha+'.webp';writeFileSync(resolve(dir,file),bytes);mapping.set(m.id,sha);converted.push({...m,id:sha,file,sha256:sha,bytes:bytes.length,contentType:'image/webp',sourceSha256:m.sha256,sourceBytes:m.bytes});}}));
 const kept=new Set(converted.map(m=>m.file));for(const m of pack.media)if(!kept.has(m.file))unlinkSync(resolve(dir,m.file));
 pack.entities=pack.entities.map(e=>({...e,image:e.image?mapping.get(e.image):null}));pack.media=converted.sort((a,b)=>a.id.localeCompare(b.id));pack.version=hash(Buffer.from(JSON.stringify(pack.entities)));writeFileSync(manifest,JSON.stringify(pack));return {images:pack.media.length,bytes:pack.media.reduce((n,m)=>n+m.bytes,0)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const output=resolve(dirname(fileURLToPath(import.meta.url)),'../seed/source-library');console.log(buildSourceLibrary(resolve(dirname(fileURLToPath(import.meta.url)),'../../football-library'),output));console.log('Optimized local images:',await optimizeSourceLibrary(output));}
