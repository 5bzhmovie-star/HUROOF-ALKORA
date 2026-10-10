// Curated source-linked identity starter. Safe to rerun; NOT licensed photo content.
import {one,run} from './database.mjs';
import {addEntity,addRelation} from './football-library.mjs';
const date='2026-10-09';
const madrid='https://www.realmadrid.com/es-ES/noticias/futbol/primer-equipo/actualidad/once-inicial-del-real-madrid-para-la-final-de-la-champions';
const argentina='https://www.fff.fr/article/9089-argentine-france-les-compositions.html';
const madridNames=[
 ['courtois','تيبو كورتوا','Thibaut Courtois'],
 ['carvajal','داني كارفاخال','Dani Carvajal'],
 ['militao','إيدير ميليتاو','Éder Militão'],
 ['alaba','دافيد ألابا','David Alaba'],
 ['mendy','فيرلان ميندي','Ferland Mendy'],
 ['kroos','توني كروس','Toni Kroos'],
 ['casemiro','كاسيميرو','Casemiro'],
 ['modric','لوكا مودريتش','Luka Modrić'],
 ['valverde','فيديريكو فالفيردي','Federico Valverde'],
 ['benzema','كريم بنزيما','Karim Benzema'],
 ['vinicius','فينيسيوس جونيور','Vinícius Júnior']
];
const argentinaNames=[
 ['martinez','إيميليانو مارتينيز','Emiliano Martínez'],
 ['molina','ناهويل مولينا','Nahuel Molina'],
 ['romero','كريستيان روميرو','Cristian Romero'],
 ['otamendi','نيكولاس أوتاميندي','Nicolás Otamendi'],
 ['tagliafico','نيكولاس تاليافيكو','Nicolás Tagliafico'],
 ['depaul','رودريغو دي بول','Rodrigo De Paul'],
 ['macallister','أليكسيس ماك أليستر','Alexis Mac Allister'],
 ['fernandez','إنزو فرنانديز','Enzo Fernández'],
 ['dimaria','أنخيل دي ماريا','Ángel Di María'],
 ['messi','ليونيل ميسي','Lionel Messi'],
 ['alvarez','خوليان ألفاريز','Julián Álvarez']
];
const add=(type,externalKey,nameAr,nameEn,source)=>{
 // Reuse central records first (including Mini Games entities), never duplicate Messi/Courtois/Benzema.
 const existing=one('SELECT id,name_en,metadata FROM football_entities WHERE entity_type=? AND name_ar=?',type,nameAr);
 if(existing){
   const metadata=JSON.parse(existing.metadata||'{}');
   const aliases=Array.isArray(metadata.aliases)?metadata.aliases.filter(x=>typeof x==='string'):[];
   if(!aliases.includes(nameEn))aliases.push(nameEn);
   run('UPDATE football_entities SET metadata=?,name_en=? WHERE id=?',JSON.stringify({...metadata,aliases}),
      existing.name_en&&/[A-Za-z]/.test(existing.name_en)?existing.name_en:nameEn,existing.id);
   return existing.id;
 }
 try{return addEntity({type,externalKey,nameAr,nameEn,source,verifiedAt:date,verification:'pending'}).id}
 catch(err){if(err.status===409 || /مسجل/.test(String(err.message)))return type+':'+externalKey;throw err}
};
export function importOfficialStarter(){
const club=add('club','club:realmadrid','ريال مدريد','Real Madrid',madrid);
const nation=add('national_team','nation:argentina','الأرجنتين','Argentina',argentina);
const fixtureMadrid=add('fixture','match:ucl2022final','نهائي دوري أبطال أوروبا 2022','2022 UEFA Champions League Final',madrid);
const fixtureArgentina=add('fixture','match:worldcup2022final','نهائي كأس العالم 2022','2022 FIFA World Cup Final',argentina);
let created=0;
for(const [tag,ar,en] of madridNames){
 const id=add('player','player:rm22:'+tag,ar,en,madrid);
 try{addRelation({type:'appeared_in',from:id,to:fixtureMadrid,fromDate:'2022-05-28',source:madrid,verifiedAt:date,verification:'pending'});created++}catch(e){if(!/مسجلة/.test(e.message))throw e}
}
for(const [tag,ar,en] of argentinaNames){
 const id=add('player','player:arg22:'+tag,ar,en,argentina);
 try{addRelation({type:'appeared_in',from:id,to:fixtureArgentina,fromDate:'2022-12-18',source:argentina,verifiedAt:date,verification:'pending'});created++}catch(e){if(!/مسجلة/.test(e.message))throw e}
}
// Salah's chronological European career sourced from Liverpool's historical fact file.
const salahSource='https://www.liverpoolfc.com/news/first-team/266614-fact-file-mohamed-salah-s-career-so-far-in-numbers';
const salah=add('player','player:salah:career','محمد صلاح','Mohamed Salah',salahSource);
const careerClubs=[
  ['basel','بازل','FC Basel','2012-07-01','2014-01-27',false],
  ['chelsea','تشيلسي','Chelsea','2014-01-27','2015-02-02',false],
  ['fiorentina','فيورنتينا','Fiorentina','2015-02-02','2015-06-01',true],
  ['roma','روما','AS Roma','2015-08-06','2016-08-03',true],
  ['roma','روما','AS Roma','2016-08-03','2017-07-01',false],
  ['liverpool','ليفربول','Liverpool','2017-07-01',null,false]
];
let careerRelationsAdded=0;
for(const [key,ar,en,from,to,loan] of careerClubs){
 const clubId=add('club','club:career:'+key,ar,en,salahSource);
 try{
   addRelation({type:loan?'loaned_to':'played_for',from:salah,to:clubId,fromDate:from,toDate:to,source:salahSource,verifiedAt:date,verification:'pending'});
   careerRelationsAdded++;
 }catch(e){if(!/مسجلة/.test(e.message))throw e}
}
return {sourceLinkedEntities:32,relationsAdded:created,careerRelationsAdded,
 sourceDates:['2022-05-28','2022-12-18','2017-07-01'],publishableVisualQuestions:0,
 note:'Official-source-linked identity and career drafts; images and positions require review'};
}

