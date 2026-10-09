// Server-only visual question contract. No confidential answers in public projections.
import { fail } from './security.mjs';
const TYPES = new Set(['career','guess_club_nationalities','guess_nation_clubs']);
const EXT = new Set(['image/png','image/webp','image/jpeg','image/svg+xml']);
const pathOk = s => typeof s==='string' && /^\/api\/visual-media\/[a-zA-Z0-9_-]{8,64}$/.test(s);
const secureAsset = (asset, label) => {
  if(!pathOk(asset)) fail(422,'وسائط ناقصة أو غير معتمدة: '+label);
  return asset;
};
export function validateVisualQuestion(item) {
  if(!item || !TYPES.has(item.type)) fail(422,'نوع السؤال البصري غير معتمد.');
  if(typeof item.source!=='string' || !/^https:\/\//.test(item.source) || !Number.isFinite(Date.parse(item.verifiedAt||'')))
    fail(422,'يتطلب السؤال مصدرًا موثقًا وتاريخ تحقق صحيحًا.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(item.eventDate||'')) fail(422,'أدخل تاريخ المباراة أو المسيرة المرجعي.');
  const image = (value,label) => secureAsset(value,label);
  if(item.type==='career') {
    if(!Array.isArray(item.stations)||item.stations.length<3||item.stations.length>8)
      fail(422,'المسيرة تتطلب 3 إلى 8 محطات موثقة.');
    item.stations.forEach((stop,i)=>{
      image(stop.clubLogo,'شعار النادي '+i);
      if(!Number.isInteger(stop.from)||!Number.isInteger(stop.to)||stop.from>stop.to)fail(422,'راجع سنوات المسيرة.');
      if(typeof stop.club!=='string'||!stop.club.trim())fail(422,'اسم النادي مطلوب.');
    });
    image(item.playerPhoto,'صورة اللاعب');
  } else {
    if(!Array.isArray(item.players)||item.players.length!==11) fail(422,'يلزم أحد عشر لاعبًا أساسيًا موثقًا.');
    if(!/^\d-\d(?:-\d){0,3}$/.test(item.formation||'')) fail(422,'خطة اللعب غير صحيحة.');
    if(!item.teamName)fail(422,'اسم النادي أو المنتخب الصحيح مطلوب.');
    image(item.teamImage,'شعار أو علم الإجابة');
    const pos=new Set();
    for(const p of item.players) {
      if(!Number.isInteger(p.slot)||p.slot<0||p.slot>10||pos.has(p.slot))fail(422,'المراكز يجب أن تكون 11 موقعًا فريدًا.');
      pos.add(p.slot);
      if(!p.name||!p.position||!p.nationality||!p.clubAtDate)fail(422,'بيانات تاريخية ناقصة للاعب.');
      image(p.photo,'صورة لاعب');
      image(item.type==='guess_club_nationalities'?p.flag:p.clubLogo,'علم/شعار اللاعب');
    }
  }
  return item;
}
export function publicVisual(visual, revealAll=false, revealedSlots=[]) {
  if(!visual)return null;
  const slots=new Set(revealedSlots);
  const shared={type:visual.type,eventDate:visual.eventDate,competition:visual.competition||'',formation:visual.formation||null};
  if(visual.type==='career')return {...shared,stations:visual.stations.map(s=>({clubLogo:s.clubLogo,from:s.from,to:s.to,loan:!!s.loan})),...(revealAll?{playerPhoto:visual.playerPhoto,playerName:visual.playerName}: {})};
  return {...shared,players:visual.players.map(p=>{
    const exposed=revealAll||slots.has(p.slot);
    return {slot:p.slot,x:p.x,y:p.y,marker:visual.type==='guess_club_nationalities'?p.flag:p.clubLogo,
      ...(exposed?{photo:p.photo,name:p.name,position:p.position,nationality:p.nationality,clubAtDate:p.clubAtDate,number:p.number??null}: {})};
  }),...(revealAll?{teamName:visual.teamName,teamImage:visual.teamImage,coach:visual.coach||null}: {})};
}
