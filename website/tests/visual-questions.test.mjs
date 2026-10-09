import test from 'node:test';
import assert from 'node:assert/strict';
import { publicVisual, validateVisualQuestion } from '../server/visual-questions.mjs';
import { publicQuestion } from '../server/game.mjs';
const media=n=>'/api/visual-media/'+String(n).padStart(8,'0');
const fixture={type:'guess_club_nationalities',eventDate:'2022-05-28',verifiedAt:'2026-10-09',source:'https://www.uefa.com/',competition:'UCL',
formation:'4-3-3',teamName:'فريق تجريبي',teamImage:media(99),coach:'مدرب',players:Array.from({length:11},(_,slot)=>({slot,x:slot*8,y:slot*6,name:'لاعب '+slot,position:'وسط',nationality:'فرنسي',clubAtDate:'النادي',photo:media(slot+1),flag:media(slot+20),clubLogo:media(slot+40)}))};
test('lineup does not expose player names, identity, team, coach or portraits pre-reveal',()=>{
 validateVisualQuestion(fixture);
 const hidden=JSON.stringify(publicVisual(fixture));
 for(const secret of ['فريق تجريبي','مدرب','لاعب 5','photo','clubAtDate','teamImage'])assert.ok(!hidden.includes(secret),secret);
 const partial=publicVisual(fixture,false,[5]);
 assert.equal(partial.players[5].name,'لاعب 5');
 assert.equal(partial.players[4].name,undefined);
 assert.equal(partial.teamName,undefined);
 const full=publicVisual(fixture,true);
 assert.equal(full.players.length,11);
 assert.equal(full.teamName,'فريق تجريبي');
});
test('reject missing images, speculative rosters and discontinued current-club question types',()=>{
 assert.throws(()=>validateVisualQuestion({...fixture,type:'current_club'}));
 assert.throws(()=>validateVisualQuestion({...fixture,players:fixture.players.slice(0,10)}));
 assert.throws(()=>validateVisualQuestion({...fixture,players:fixture.players.map((p,i)=>i===0?{...p,photo:'BR'}:p)}));
});

test('host text answer does not reveal visual lineup until server reveal or slot action',()=>{
 const q={letter:'ر',text:'خمن الفريق',answer:'ريال مدريد',tournament:'UCL',difficulty:'medium',visual:fixture,revealedSlots:[]};
 const host=publicQuestion(q,true,false);
 assert.equal(host.answer,'ريال مدريد');
 assert.equal(host.visual.teamName,undefined);
 assert.equal(host.visual.players[0].name,undefined);
 const withSlot=publicQuestion({...q,revealedSlots:[0]},true,false);
 assert.equal(withSlot.visual.players[0].name,'لاعب 0');
 assert.equal(withSlot.visual.players[1].name,undefined);
});
