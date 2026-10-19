import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import sharp from 'sharp';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source='https://github.com/lipis/flag-icons';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function buildFlagLibrary(output=resolve(root,'seed/flag-library')){
 const dir=resolve(root,'node_modules/flag-icons/flags/4x3'),namesAr=new Intl.DisplayNames(['ar'],{type:'region'}),namesEn=new Intl.DisplayNames(['en'],{type:'region'});const mapping=JSON.parse(readFileSync(resolve(root,'../football-library/data/national-team-names.json'),'utf8'));
 const special={'gb-eng':['إنجلترا','England','ENG'],'gb-sct':['اسكتلندا','Scotland','SCO'],'gb-wls':['ويلز','Wales','WAL'],'gb-nir':['أيرلندا الشمالية','Northern Ireland','NIR'],'xk':['كوسوفو','Kosovo','KVX']};
 const entities=[],media=[],byIso=new Map();mkdirSync(resolve(output,'images'),{recursive:true});
 for(const file of readdirSync(dir).filter(f=>/^[a-z]{2}(?:-[a-z]{3})?\.svg$/.test(f)).sort()){
 const code=file.slice(0,-4),upper=code.toUpperCase();let ar,en;try{ar=namesAr.of(upper);en=namesEn.of(upper);}catch{[ar,en]=special[code]||[upper,upper];}if(special[code])[ar,en]=special[code];
 const original=readFileSync(resolve(dir,file)),bytes=await sharp(original).resize(256,192).webp({quality:95}).toBuffer(),id=sha(bytes),path='images/'+id+'.webp';writeFileSync(resolve(output,path),bytes);
 const aliases=[upper,code,ar,en,...(special[code]||[]),...Object.entries(mapping).filter(([,v])=>v[1]===code).flatMap(([fifa,v])=>[fifa,v[0]])];
 media.push({id,sha256:id,file:path,bytes:bytes.length,contentType:'image/webp',source:source+'/blob/v7.5.0/flags/4x3/'+file,license:'MIT — flag-icons / Panayiotis Lipiridis',sourceSha256:sha(original)});
 entities.push({id:'flag:iso:'+code,type:'flag',nameAr:ar,nameEn:en,image:id,metadata:{isoCode:upper,aliases,verification:'source-artwork',source,license:'MIT'}});byIso.set(code,{id,ar,en});
 }
 const teams=JSON.parse(readFileSync(resolve(root,'../football-library/data/wc2026_teams.json'),'utf8'));for(const t of teams){const m=mapping[t.fifaCode],flag=m&&byIso.get(m[1]);if(!flag)throw Error('Missing flag for '+t.fifaCode);entities.push({id:t.id,type:'national_team',nameAr:m[0],nameEn:t.nameEn,image:flag.id,metadata:{source:t.source||'https://www.fifa.com/',verification:'pending',fifaCode:t.fifaCode,isoCode:m[1].toUpperCase(),aliases:[t.nameEn,m[0],t.fifaCode],flagId:'flag:iso:'+m[1]}});}
 const coaches=JSON.parse(readFileSync(resolve(root,'../football-library/data/wc2026_coaches.json'),'utf8'));for(const c of coaches)entities.push({id:'coach:source:'+c.id.split(':').pop(),type:'coach',nameAr:c.nameAr||c.nameEn,nameEn:c.nameEn,image:null,metadata:{source:c.source,verification:'pending',nationality:c.nationality,sourceTeamId:c.teamId,asOf:c.asOf,aliases:[c.nameOriginal,c.nameEn].filter(Boolean)}});
 const pack={format:'huroof-source-library-v1',id:'flags',version:sha(Buffer.from(JSON.stringify(entities))),entities,media};writeFileSync(resolve(output,'manifest.json'),JSON.stringify(pack));writeFileSync(resolve(output,'FLAG-ICONS-LICENSE.txt'),readFileSync(resolve(root,'node_modules/flag-icons/LICENSE')));return {flags:byIso.size,teams:teams.length,coaches:coaches.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await buildFlagLibrary());
