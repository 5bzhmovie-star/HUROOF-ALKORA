import test from 'node:test';
import assert from 'node:assert/strict';
import {MINI_GAMES,MINI_MEDIA,MINI_ROUNDS,projectMiniRound} from '../server/mini-content.mjs';

test('official mini games ship 31 playable games with at least two sourced rounds each',()=>{
  assert.equal(MINI_GAMES.length,31);
  assert.equal(new Set(MINI_GAMES.map(game=>game.slug)).size,31);
  for(const game of MINI_GAMES){
    const rounds=MINI_ROUNDS.filter(round=>round.game_slug===game.slug&&round.status==='published');
    assert.ok(rounds.length>=2,`${game.slug} has ${rounds.length} rounds`);
  }
  assert.equal(new Set(MINI_ROUNDS.map(round=>round.id)).size,MINI_ROUNDS.length);
});

test('every mini round is clear, sourced, answerable and backed by structured visuals',()=>{
  for(const round of MINI_ROUNDS){
    assert.match(round.id,/^[a-z0-9-]{4,80}$/);
    assert.ok(['easy','medium','hard','mixed'].includes(round.difficulty),round.id);
    assert.ok(round.prompt.length>=8&&round.prompt.length<=240,round.id);
    assert.ok(round.solution.length>=1&&round.solution.length<=180,round.id);
    assert.ok(Array.isArray(round.accepted)&&round.accepted.length>0,round.id);
    assert.ok(round.accepted.every(answer=>typeof answer==='string'&&answer.trim()),round.id);
    const source=new URL(round.source);assert.equal(source.protocol,'https:',round.id);
    assert.ok(round.visual&&typeof round.visual.template==='string',round.id);
    assert.ok(round.visual.question&&typeof round.visual.question==='object',round.id);
    assert.ok(round.visual.reveal&&typeof round.visual.reveal==='object',round.id);
  }
});

test('mini media uses direct resilient URLs, visible fallbacks and attribution',()=>{
  assert.ok(Object.keys(MINI_MEDIA).length>=20);
  for(const [key,item] of Object.entries(MINI_MEDIA)){
    assert.ok(item.url.startsWith('https://'),key);
    assert.ok(!item.url.includes('/api/media/'),key);
    assert.ok(item.fallback?.length>=2,key);
    assert.ok(item.source?.startsWith('https://'),key);
    assert.ok(item.license?.length>=2,key);
  }
});

test('unrevealed mini rounds expose only opaque media aliases and no solution metadata',()=>{
  const round=MINI_ROUNDS.find(item=>item.id==='wai-messi');
  const hidden=projectMiniRound(round,false),shown=projectMiniRound(round,true);
  assert.equal(hidden.round.solution,undefined);
  assert.equal(hidden.round.source,undefined);
  assert.equal(hidden.round.accepted,undefined);
  assert.equal(JSON.stringify(hidden).includes('wai-messi'),false);
  assert.equal(JSON.stringify(hidden).includes('ليونيل ميسي'),false);
  assert.ok(Object.keys(hidden.media).every(key=>/^asset-\d+$/.test(key)));
  assert.ok(shown.round.solution.includes('ميسي'));
});
