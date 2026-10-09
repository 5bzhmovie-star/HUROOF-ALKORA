import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { one, run, dataDir } from './database.mjs';
import { fail } from './security.mjs';

const directory = resolve(dataDir,'visual-media');
const mimeMap={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
const sniff=(b,type)=>
 type==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
 type==='image/jpeg'?b.length>3 && b[0]===0xff&&b[1]===0xd8&&b[2]===0xff:
 type==='image/webp'?b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP':false;
export function saveMedia(body) {
 const contentType=String(body.contentType||'');
 if(!mimeMap[contentType])fail(422,'الوسائط المدعومة حاليًا PNG وWebP وJPEG فقط؛ SVG يحتاج مراجعة وتعقيمًا مستقلًا.');
 const encoded=String(body.base64||'');
 if(!encoded||encoded.length>1900000||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))fail(413,'الصورة أكبر من الحد أو تنسيقها غير صحيح.');
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length<30||bytes.length>1_350_000||!sniff(bytes,contentType))fail(422,'محتوى الصورة لا يطابق تنسيقها.');
 const license=String(body.license||'').trim(),source=String(body.source||'').trim();
 if(!license||license.length>160||!/^https:\/\//.test(source)||source.length>1200)fail(422,'وثّق ترخيص الصورة ورابط مصدرها HTTPS.');
 const hash=createHash('sha256').update(bytes).digest('hex');
 const existing=one('SELECT id FROM visual_assets WHERE sha256=?',hash);
 if(existing)return {url:'/api/visual-media/'+existing.id,id:existing.id,duplicate:true};
 const id=randomBytes(18).toString('base64url');
 const file=id+mimeMap[contentType];
 mkdirSync(directory,{recursive:true,mode:0o700});
 writeFileSync(resolve(directory,file),bytes,{flag:'wx',mode:0o600});
 run('INSERT INTO visual_assets(id,content_type,relative_path,sha256,license,source,created_at) VALUES(?,?,?,?,?,?,?)',
 id,contentType,file,hash,license,source,Date.now());
 return {url:'/api/visual-media/'+id,id,duplicate:false};
}
export function getMedia(id) {
 if(!/^[A-Za-z0-9_-]{8,64}$/.test(id))fail(404,'الوسيط غير موجود.');
 const row=one('SELECT relative_path,content_type FROM visual_assets WHERE id=?',id);
 if(!row)fail(404,'الوسيط غير موجود.');
 return {contentType:row.content_type,bytes:readFileSync(resolve(directory,row.relative_path))};
}
export function referencedMediaExists(url) {
 const match=/^\/api\/visual-media\/([A-Za-z0-9_-]{8,64})$/.exec(url||'');
 return Boolean(match&&one('SELECT id FROM visual_assets WHERE id=?',match[1]));
}
