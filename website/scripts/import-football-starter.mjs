// Curated source-linked identity starter. Safe to rerun; NOT licensed photo content.
import {seedDatabase} from '../server/database.mjs';
import {addEntity,addRelation} from '../server/football-library.mjs';
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
 try{return addEntity({type,externalKey,nameAr,nameEn,source,verifiedAt:date,verification:'pending'}).id}
 catch(err){if(err.status===409 || /مسجل/.test(String(err.message)))return type+':'+externalKey;throw err}
};
seedDatabase();
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
console.log(JSON.stringify({importedOrAlreadyExisting:26,relationsAdded:created,sourceDates:['2022-05-28','2022-12-18'],publishableVisualQuestions:0,note:'Identity starter only: images, player nationality and historical club affiliation require independent validation before publishing'},null,2));
