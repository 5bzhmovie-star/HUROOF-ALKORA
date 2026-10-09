import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerLetter,findPath,neighbors,makeBoard,checkColors,LETTERS} from '../server/game.mjs';
const bank=JSON.parse(readFileSync(new URL('../seed/questions.json',import.meta.url),'utf8'));
test('question bank: more than 5000 unique, clear, sourced Arabic questions',()=>{
  assert.ok(bank.questions.length>5000);assert.equal(bank.tournaments.length,11);
  assert.equal(new Set(bank.questions.map(q=>q.id)).size,bank.questions.length);
  assert.equal(new Set(bank.questions.map(q=>q.text)).size,bank.questions.length);
  for(const t of bank.tournaments)assert.ok(bank.questions.filter(q=>q.tournament_id===t.id).length>=100,t.name);
  const trusted=new Set(['en.wikipedia.org','raw.githubusercontent.com','www.spa.gov.sa','www.the-afc.com']);
  for(const q of bank.questions){
    assert.equal(answerLetter(q.answer),q.letter,q.text);
    const source=new URL(q.source);assert.equal(source.protocol,'https:');assert.ok(trusted.has(source.hostname),source.hostname);
    assert.equal(q.text,q.text.trim());assert.ok(q.text.endsWith('؟'),q.text);assert.ok(!/\s{2,}/.test(q.text),q.text);
    assert.ok(q.text.length>=12&&q.text.length<=600);assert.ok(q.answer.length>=2&&q.answer.length<=180);
    assert.ok(['easy','medium','hard'].includes(q.difficulty));
  }
});
test('every section contains only substantial tournament-specific questions',()=>{
  const labels={saudi:['الدوري السعودي'],england:['الدوري الإنجليزي'],spain:['الدوري الإسباني'],france:['الدوري الفرنسي'],germany:['الدوري الألماني'],italy:['الدوري الإيطالي'],worldcup:['كأس العالم'],ucl:['دوري أبطال أوروبا'],afc:['دوري أبطال آسيا'],king:['كأس الملك السعودي'],super:['السوبر السعودي','للسوبر السعودي']};
  for(const t of bank.tournaments){
    const chosen=bank.questions.filter(q=>q.tournament_id===t.id);
    assert.ok(chosen.length>=100,t.id);
    for(const q of chosen){
      assert.ok(labels[t.id].some(label=>q.text.includes(label)),q.text);
      assert.ok(!q.source.includes('theifab.com'),q.text);
      assert.notEqual(q.note,'قاعدة كروية عامة تنطبق على مباريات هذه البطولة.');
    }
  }
});
test('every competition stays playable using only its relevant answer letters',()=>{
  for(const t of bank.tournaments){
    const chosen=bank.questions.filter(q=>q.tournament_id===t.id),coverage={};
    for(const q of chosen)coverage[q.letter]=(coverage[q.letter]||0)+1;
    const available=Object.keys(coverage).length;
    for(const size of [4,5,6,7]){
      const board=makeBoard(size,coverage),first=board.slice(0,Math.min(size*size,available));
      assert.equal(board.length,size*size);
      assert.equal(new Set(first.map(c=>c.letter)).size,first.length,t.id);
      for(const letter of Object.keys(coverage))assert.ok(board.filter(c=>c.letter===letter).length<=coverage[letter]);
    }
  }
});
test('hex geometry: reciprocal six-edge adjacency and exclusive, complete winner on all 3×3 colorings',()=>{
  for(let i=0;i<49;i++)for(const n of neighbors(i,7))assert.ok(neighbors(n,7).includes(i));
  assert.deepEqual(neighbors(7,7).filter(i=>i<7),[0,1]);
  assert.deepEqual(neighbors(14,7).filter(i=>i>=7&&i<14),[7]);
  for(let mask=0;mask<512;mask++){const board=Array.from({length:9},(_,i)=>({owner:(mask>>i&1)?1:2}));const first=findPath(board,3,1),second=findPath(board,3,2);assert.notEqual(Boolean(first.length),Boolean(second.length),`mask ${mask}`);}
});
test('team colors reject lookalikes and unreadable light colors',()=>{assert.equal(checkColors('#15803d','#2563eb'),true);assert.equal(checkColors('#15803d','#16813e'),false);assert.equal(checkColors('#ffffff','#2563eb'),false);assert.equal(checkColors('red','#000000'),false);});
test('Arabic answer normalization is consistent with the public rules',()=>{assert.equal(answerLetter('الهِلال'),'ه');assert.equal(answerLetter('إسبانيا'),'ا');assert.equal(answerLetter('البرازيل'),'ب');assert.equal(answerLetter('عمر عبدالرحمن'),'ع');});
