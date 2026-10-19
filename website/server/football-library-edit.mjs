import{randomUUID}from'node:crypto';import{one,run}from'./database.mjs';import{referencedMediaExists}from'./visual-media.mjs';import{fail}from'./security.mjs';
const types=new Set(['player','club','national_team','coach','flag','country','competition','stadium','fixture','season']);
const text=(v,max=180)=>String(v??'').trim().slice(0,max);
export function saveLibraryEntity(input){
 if(!types.has(input.type)||typeof input.nameAr!=='string'||!input.nameAr.trim()||input.nameAr.length>180)fail(422,'اختر التصنيف واكتب الاسم.');
 const old=input.id?one('SELECT * FROM football_entities WHERE id=?',String(input.id)):null;if(input.id&&!old)fail(404,'العنصر غير موجود.');
 const id=old?.id||input.type+':local:'+randomUUID();const meta=old?JSON.parse(old.metadata||'{}'):{};
 const image=input.imageUrl===undefined?old?.image_key||null:input.imageUrl||null;
 if(image&&!(old&&image===old.image_key&&/^https:\/\//.test(image))&&!referencedMediaExists(image))fail(422,'ارفع الصورة من جهازك أو اختر صورة محفوظة في المكتبة.');
 const patch={};for(const key of ['position','nationality','clubAtDate','season','note'])if(Object.hasOwn(input,key))patch[key]=text(input[key],key==='note'?1200:180);
 if(Object.hasOwn(input,'shirtNumber')){if(input.shirtNumber!==null&&input.shirtNumber!==''&&(!Number.isInteger(Number(input.shirtNumber))||Number(input.shirtNumber)<0||Number(input.shirtNumber)>999))fail(422,'رقم القميص غير صحيح.');patch.shirtNumber=input.shirtNumber===''||input.shirtNumber===null?null:Number(input.shirtNumber);}
 if(Object.hasOwn(input,'clubId')||Object.hasOwn(input,'clubAtDate')){const clubId=text(input.clubId);if(clubId&&!one("SELECT id FROM football_entities WHERE id=? AND entity_type IN ('club','national_team')",clubId))fail(422,'الفريق المختار غير موجود.');patch.sourceClubId=clubId||null;}
 for(const key of ['flag','clubLogo'])if(Object.hasOwn(input,key)){if(input[key]&&!referencedMediaExists(input[key]))fail(422,'العلم أو الشعار غير موجود في الصور المحلية.');patch[key]=input[key]||'';}
 if(Object.hasOwn(input,'aliases')){if(!Array.isArray(input.aliases)||input.aliases.length>30||input.aliases.some(a=>typeof a!=='string'||a.length>180))fail(422,'اكتب حتى 30 اسمًا للبحث.');patch.aliases=[...new Set(input.aliases.map(a=>a.trim()).filter(Boolean))];}
 const source=input.source===undefined?meta.source||'':text(input.source,1200);if(source&&!/^https:\/\//.test(source))fail(422,'رابط المصدر اختياري، ويبدأ بـ https عند إدخاله.');
 const metadata={...meta,...patch,source,entryOrigin:'user',verification:'user',userEdited:true,userEditedFields:[...new Set([...(meta.userEditedFields||[]),...Object.keys(patch)])],updatedByUserAt:new Date().toISOString()};
 const match=image&&/^\/api\/visual-media\/([\w-]+)$/.exec(image);const media=match?one('SELECT license,source FROM visual_assets WHERE id=?',match[1]):null;
 run(`INSERT INTO football_entities(id,entity_type,name_ar,name_en,image_key,image_source,image_license,fallback,metadata,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET entity_type=excluded.entity_type,name_ar=excluded.name_ar,name_en=excluded.name_en,image_key=excluded.image_key,image_source=excluded.image_source,image_license=excluded.image_license,fallback=excluded.fallback,metadata=excluded.metadata,updated_at=excluded.updated_at`,id,input.type,input.nameAr.trim(),text(input.nameEn)||input.nameAr.trim(),image,media?.source||(image===old?.image_key?old?.image_source:null)||null,media?.license||(image===old?.image_key?old?.image_license:null)||null,input.nameAr.trim(),JSON.stringify(metadata),Date.now());
 return{...one('SELECT * FROM football_entities WHERE id=?',id),metadata};
}
