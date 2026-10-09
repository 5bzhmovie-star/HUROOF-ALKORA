// Official governing-body starting points. This is a competition directory,
// not 2026 roster or image verification. Each record starts pending review.
export const COMPETITIONS=[
 ['es-la-liga','الدوري الإسباني','La Liga','https://www.laliga.com/'],
 ['en-premier-league','الدوري الإنجليزي','Premier League','https://www.premierleague.com/'],
 ['de-bundesliga','الدوري الألماني','Bundesliga','https://www.bundesliga.com/'],
 ['it-serie-a','الدوري الإيطالي','Serie A','https://www.legaseriea.it/'],
 ['uefa-champions-league','دوري أبطال أوروبا','UEFA Champions League','https://www.uefa.com/uefachampionsleague/'],
 ['fr-ligue1','الدوري الفرنسي','Ligue 1','https://ligue1.com/'],
 ['sa-pro-league','الدوري السعودي','Saudi Pro League','https://www.spl.com.sa/'],
 ['fifa-world-cup','كأس العالم','FIFA World Cup','https://www.fifa.com/'],
 ['sa-kings-cup','كأس الملك','King Cup','https://www.saff.com.sa/'],
 ['sa-super-cup','السوبر السعودي','Saudi Super Cup','https://www.saff.com.sa/'],
 ['afc-champions-league-elite','دوري أبطال آسيا للنخبة','AFC Champions League Elite','https://www.the-afc.com/']
];
export function importCompetitionCatalog({addEntity,one}){
 let created=0;
 for(const [externalKey,nameAr,nameEn,source] of COMPETITIONS){
   const current=one('SELECT id FROM football_entities WHERE id=?','competition:'+externalKey);
   if(current)continue;
   addEntity({type:'competition',externalKey,nameAr,nameEn,source,
     verifiedAt:new Date().toISOString().slice(0,10),verification:'pending'});
   created++;
 }
 return {added:created,existing:COMPETITIONS.length-created,total:COMPETITIONS.length,
 note:'Competition directory only; no imported licensed crests or verified current squads'};
}
