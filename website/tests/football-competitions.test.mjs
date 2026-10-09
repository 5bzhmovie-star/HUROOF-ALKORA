import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPETITIONS} from '../server/football-competitions.mjs';
test('exactly eleven unique, sourced competitions with Arabic names',()=>{
 assert.equal(COMPETITIONS.length,11);
 assert.equal(new Set(COMPETITIONS.map(c=>c[0])).size,11);
 assert.ok(COMPETITIONS.every(c=>c[1]&&c[2]&&/^https:\/\/[^/]+/.test(c[3])));
 assert.ok(COMPETITIONS.some(c=>c[1]==='الدوري السعودي'));
 assert.ok(COMPETITIONS.some(c=>c[1]==='دوري أبطال آسيا للنخبة'));
});
test('official directory never claims 2026 player rosters or image licenses',()=>{
 assert.ok(COMPETITIONS.every(c=>c.length===4));
});
