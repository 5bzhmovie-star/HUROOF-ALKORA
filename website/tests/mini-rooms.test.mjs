import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

process.env.DATA_DIR=mkdtempSync(resolve(tmpdir(),'huroof-mini-test-'));
process.env.NODE_ENV='test';
const {createApplication}=await import('../server/index.mjs');
const {db,one,run}=await import('../server/database.mjs');
const {hash,hmac,token}=await import('../server/security.mjs');
let server,base;
const ORIGIN='http://127.0.0.1:39872';
class Client{
  cookies={};csrf='';user=null;
  async request(path,body){const headers={Host:'127.0.0.1:39872',Connection:'close',Cookie:Object.entries(this.cookies).map(([k,v])=>`${k}=${v}`).join('; '),...(body===undefined?{}:{Origin:ORIGIN,'Content-Type':'application/json','X-CSRF-Token':this.csrf})};const res=await fetch(base+'/api'+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});for(const c of res.headers.getSetCookie()){const [key,value]=c.split(';')[0].split('=');this.cookies[key]=value;}const data=await res.json();if(data.csrf)this.csrf=data.csrf;if(data.user)this.user=data.user;return{status:res.status,data};}
  async init(name){await this.request('/session');const id=token(18),answer='AB234';run('INSERT INTO challenges VALUES(?,?,?,?)',id,hash(this.cookies.hk_sid),hmac(`${id}:${answer}`),Date.now()+120000);const r=await this.request('/identity',{name,challenge:id,answer});assert.equal(r.status,200,JSON.stringify(r.data));return this;}
}
before(async()=>{const app=createApplication({origin:ORIGIN});server=app.server;await new Promise(r=>server.listen(39872,'127.0.0.1',r));base=ORIGIN;});
after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));db.close();});

test('legacy self-host database gains official mini-game columns before seeding',()=>{
  const legacyDir=mkdtempSync(resolve(tmpdir(),'huroof-mini-upgrade-')),legacy=new DatabaseSync(resolve(legacyDir,'huroof.sqlite'));
  legacy.exec("CREATE TABLE mini_game_rounds(id TEXT PRIMARY KEY,game_slug TEXT NOT NULL,difficulty TEXT NOT NULL,prompt TEXT NOT NULL,solution TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'published',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)");legacy.close();
  const child=spawnSync(process.execPath,['--input-type=module','-e',"const m=await import('./server/database.mjs');m.seedDatabase();console.log(m.many('PRAGMA table_info(mini_game_rounds)').map(x=>x.name).join(','));m.db.close();"],{cwd:resolve('.'),env:{...process.env,DATA_DIR:legacyDir,NODE_ENV:'test'},encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/accepted/);assert.match(child.stdout,/visual_data/);
});

test('mini room lifecycle keeps answers private and server buzzer authoritative',async()=>{
  const host=await new Client().init('المقدم'),a=await new Client().init('يزن'),b=await new Client().init('فهد');
  const created=await host.request('/mini-rooms',{game:'who-am-i',teams:[{name:'الصقور',color:'#15803d'},{name:'النجوم',color:'#2563eb'}],difficulty:'all',rounds:2,seconds:5});
  assert.equal(created.status,201,JSON.stringify(created.data));const id=created.data.id;assert.match(id,/^[A-Za-z0-9_-]{12}$/);
  assert.equal((await a.request(`/mini-rooms/${id}/join`,{team:1})).status,200);
  assert.equal((await b.request(`/mini-rooms/${id}/join`,{team:2})).status,200);
  let hostRoom=(await host.request(`/mini-rooms/${id}?view=host`)).data;
  assert.ok(hostRoom.links.display&&hostRoom.links.buzzer);assert.equal(hostRoom.round.solution,undefined);
  let display=(await a.request(`/mini-rooms/${id}?view=display`)).data;
  assert.equal(display.round.solution,undefined);assert.equal(JSON.stringify(display).includes('accepted'),false);
  const payload={key:display.buzz.key,roundKey:display.roundKey};
  const results=await Promise.all([a.request(`/mini-rooms/${id}/buzz`,payload),b.request(`/mini-rooms/${id}/buzz`,payload)]);
  assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  hostRoom=(await host.request(`/mini-rooms/${id}?view=host`)).data;
  assert.ok(hostRoom.buzz.winner);assert.equal(hostRoom.buzz.open,false);
  let action=await host.request(`/mini-rooms/${id}/action`,{action:'reveal',version:hostRoom.version});assert.equal(action.status,200);
  display=(await a.request(`/mini-rooms/${id}?view=display`)).data;assert.ok(display.round.solution);assert.ok(display.round.source);
  action=await host.request(`/mini-rooms/${id}/action`,{action:'award',version:display.version,team:1});assert.equal(action.status,200);assert.deepEqual(action.data.scores,[1,0]);
  action=await host.request(`/mini-rooms/${id}/action`,{action:'reveal',version:action.data.version});assert.equal(action.status,200);
  action=await host.request(`/mini-rooms/${id}/action`,{action:'award',version:action.data.version,team:2});assert.equal(action.status,200);
  assert.equal(action.data.number,3);assert.equal(action.data.config.rounds,3);
  hostRoom=(await host.request(`/mini-rooms/${id}?view=host`)).data;
  assert.equal(hostRoom.config.rounds,3,'the decider must stay persisted after the next poll');
});

test('commentary audio can be requested only twice per round',async()=>{
  const host=await new Client().init('مقدم الصوت');
  const created=await host.request('/mini-rooms',{game:'iconic-commentary',teams:[{name:'أخضر',color:'#15803d'},{name:'أزرق',color:'#2563eb'}],difficulty:'all',rounds:2,seconds:5});const id=created.data.id;
  for(let i=0;i<2;i++){const room=(await host.request(`/mini-rooms/${id}?view=host`)).data;assert.equal((await host.request(`/mini-rooms/${id}/action`,{action:'audio',version:room.version})).status,200);}
  const room=(await host.request(`/mini-rooms/${id}?view=host`)).data;assert.equal(room.audioPlays,2);assert.equal((await host.request(`/mini-rooms/${id}/action`,{action:'audio',version:room.version})).status,409);
});

test('answer deadline is enforced by the server and reopens the buzzer',async()=>{
  const host=await new Client().init('مقدم المؤقت'),player=await new Client().init('لاعب المؤقت');
  const created=await host.request('/mini-rooms',{game:'who-won',teams:[{name:'أخضر',color:'#15803d'},{name:'أزرق',color:'#2563eb'}],difficulty:'all',rounds:2,seconds:5}),id=created.data.id;
  await player.request(`/mini-rooms/${id}/join`,{team:1});
  const display=(await player.request(`/mini-rooms/${id}?view=display`)).data;
  assert.equal((await player.request(`/mini-rooms/${id}/buzz`,{key:display.buzz.key,roundKey:display.roundKey})).status,200);
  const stored=one('SELECT state FROM mini_game_rooms WHERE id=?',id),state=JSON.parse(stored.state),oldKey=state.buzz.key;
  state.buzz.deadline=Date.now()-1;run('UPDATE mini_game_rooms SET state=? WHERE id=?',JSON.stringify(state),id);
  const refreshed=(await host.request(`/mini-rooms/${id}?view=host`)).data;
  assert.equal(refreshed.buzz.open,true);assert.equal(refreshed.buzz.winner,null);assert.notEqual(refreshed.buzz.key,oldKey);
});

test('inactive normal and mini rooms are deleted after ten minutes',async()=>{
  const host=await new Client().init('مقدم الخمول');
  const created=await host.request('/mini-rooms',{game:'who-won',teams:[{name:'أ',color:'#15803d'},{name:'ب',color:'#2563eb'}],difficulty:'all',rounds:2,seconds:5});
  run('UPDATE mini_game_rooms SET expires_at=? WHERE id=?',Date.now()-1,created.data.id);
  const cleanup=await import('../server/cleanup.mjs');cleanup.cleanupExpired();
  assert.equal(one('SELECT id FROM mini_game_rooms WHERE id=?',created.data.id),undefined);
});
