// Server-only visual question contract. No confidential answers in public projections.
import { fail } from './security.mjs';
const TYPES = new Set(['image','career','coach_career','common_link','odd_one_out','missing_player','guess_club_nationalities','guess_nation_clubs']);

const pathOk = s => typeof s==='string' && /^\/api\/visual-media\/[a-zA-Z0-9_-]{8,64}$/.test(s);
const secureAsset = (asset, label) => {
  if(!pathOk(asset)) fail(422,'وسائط ناقصة أو غير معتمدة: '+label);
  return asset;
};
export function validateVisualQuestion(item,{draft=false}={}) {
  if(!item || !TYPES.has(item.type)) fail(422,'نوع السؤال البصري غير معتمد.');
  if(JSON.stringify(item).length>180000)fail(422,'محتوى السؤال أكبر من الحد.');
  if(draft){
    for(const key of ['players','stations','cards'])if(item[key]!==undefined&&(!Array.isArray(item[key])||item[key].length>(key==='players'?11:key==='cards'?4:8)))fail(422,'راجع عناصر السؤال.');
    return item;
  }
  if((item.origin!=='user'&&(typeof item.source!=='string'||!/^https:\/\//.test(item.source))) || (item.source&&!/^https:\/\//.test(item.source)) || !Number.isFinite(Date.parse(item.verifiedAt||'')))
    fail(422,'يتطلب السؤال مصدرًا موثقًا وتاريخ تحقق صحيحًا.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(item.eventDate||'')) fail(422,'أدخل تاريخ المباراة أو المسيرة المرجعي.');
  const coords = p => {if(![p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100))fail(422,'موقع اللاعب خارج الملعب.');};
  const image = (value,label) => secureAsset(value,label);
  if(item.type==='image'){image(item.image,'صورة السؤال');return item;}
  if(['common_link','odd_one_out'].includes(item.type)){
    if(!Array.isArray(item.cards)||item.cards.length!==4)fail(422,'يلزم أربعة لاعبين بالضبط.');
    for(const c of item.cards){if(typeof c.name!=='string'||!c.name.trim())fail(422,'اسم اللاعب مطلوب.');image(c.photo,'صورة اللاعب');}
    if(item.type==='odd_one_out'&&(!Number.isInteger(item.answerIndex)||item.answerIndex<0||item.answerIndex>3))fail(422,'اختر اللاعب الدخيل.');
    if(typeof item.explanation!=='string'||item.explanation.trim().length<3||item.explanation.length>800)fail(422,'اكتب شرح الرابط أو سبب اختيار الدخيل.');return item;
  }
  if(item.type==='missing_player'){
    if(!Array.isArray(item.players)||item.players.length!==11||!Number.isInteger(item.missingSlot)||item.missingSlot<0||item.missingSlot>10)fail(422,'حدد لاعبًا ناقصًا ضمن تشكيلة من 11 لاعبًا.');
    if(!/^\d-\d(?:-\d){0,3}$/.test(item.formation||'')||item.formation.split('-').reduce((n,x)=>n+Number(x),0)!==10)fail(422,'الخطة يجب أن تحتوي عشرة لاعبين ميدانيين وحارسًا.');
    if(new Set(item.players.map(p=>p.slot)).size!==11)fail(422,'مواقع التشكيلة مكررة.');
    for(const p of item.players){coords(p);if(!Number.isInteger(p.slot)||p.slot<0||p.slot>10||!p.name||!p.position)fail(422,'اسم اللاعب ومركزه مطلوبان.');image(p.photo,'صورة اللاعب');}return item;
  }
  if(['career','coach_career'].includes(item.type)) {
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
    if(!/^\d-\d(?:-\d){0,3}$/.test(item.formation||'')||item.formation.split('-').reduce((n,x)=>n+Number(x),0)!==10) fail(422,'خطة اللعب غير صحيحة.');
    if(!item.teamName)fail(422,'اسم النادي أو المنتخب الصحيح مطلوب.');
    image(item.teamImage,'شعار أو علم الإجابة');
    const pos=new Set();
    for(const p of item.players) {
      coords(p);
      if(!Number.isInteger(p.slot)||p.slot<0||p.slot>10||pos.has(p.slot))fail(422,'المراكز يجب أن تكون 11 موقعًا فريدًا.');
      pos.add(p.slot);
      if(!p.name||!p.position||!p.nationality||!p.clubAtDate)fail(422,'بيانات تاريخية ناقصة للاعب.');
      image(p.photo,'صورة لاعب');
      image(item.type==='guess_club_nationalities'?p.flag:p.clubLogo,'علم/شعار اللاعب');
    }
  }
  return item;
}
export {publicVisual} from './visual-projection.mjs';
