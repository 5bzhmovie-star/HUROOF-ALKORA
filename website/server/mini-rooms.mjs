import { one, many, run, transaction } from './database.mjs';
import { token, fail } from './security.mjs';
import { checkColors } from './game.mjs';
import { MINI_GAMES, projectMiniRound } from './mini-content.mjs';

const TTL=10*60*1000;
const slugs=new Set(MINI_GAMES.map(game=>game.slug));
const closedBuzz=()=>({open:false,winner:null,deadline:null,key:token(12)});
const cleanName=value=>{const name=String(value||'').normalize('NFKC').trim();if(name.length<1||name.length>24||/[\p{Cc}\p{Cf}<>]/u.test(name))fail(422,'اكتب اسم فريق واضحًا حتى ٢٤ حرفًا.');return name;};
function configFrom(body){
  let game=String(body.game||'');
  if(game==='random')game=MINI_GAMES[Math.floor(Math.random()*MINI_GAMES.length)].slug;
  if(game!=='party'&&!slugs.has(game))fail(422,'اختر لعبة متاحة.');
  const config={game,teams:[{name:cleanName(body.teams?.[0]?.name),color:String(body.teams?.[0]?.color||'')},{name:cleanName(body.teams?.[1]?.name),color:String(body.teams?.[1]?.color||'')}],difficulty:String(body.difficulty||'all'),rounds:Number(body.rounds||2),seconds:Number(body.seconds||5)};
  if(config.teams[0].name===config.teams[1].name||!checkColors(config.teams[0].color,config.teams[1].color)||!['all','easy','medium','hard','mixed'].includes(config.difficulty)||![2,3,4,5,6,10].includes(config.rounds)||![5,10,15,20].includes(config.seconds))fail(422,'راجع إعدادات اللعبة.');
  return config;
}
function rowRound(row){return row?{...row,accepted:JSON.parse(row.accepted||'[]'),visual:JSON.parse(row.visual_data||'{}')}:null;}
function chooseRound(config,used=[]){
  const params=[],where=["status='published'"];
  if(config.game!=='party'){where.push('game_slug=?');params.push(config.game);}
  if(config.difficulty!=='all'){where.push('difficulty=?');params.push(config.difficulty);}
  let row=one(`SELECT * FROM mini_game_rounds WHERE ${where.join(' AND ')} AND id NOT IN (SELECT value FROM json_each(?)) ORDER BY random() LIMIT 1`,...params,JSON.stringify(used));
  if(!row&&config.difficulty!=='all'){const relaxed=where.filter(x=>x!=='difficulty=?'),values=config.game==='party'?[]:[config.game];row=one(`SELECT * FROM mini_game_rounds WHERE ${relaxed.join(' AND ')} AND id NOT IN (SELECT value FROM json_each(?)) ORDER BY random() LIMIT 1`,...values,JSON.stringify(used));}
  if(!row){const base=config.game==='party'?"status='published'":"status='published' AND game_slug=?";row=one(`SELECT * FROM mini_game_rounds WHERE ${base} ORDER BY random() LIMIT 1`,...(config.game==='party'?[]:[config.game]));}
  if(!row)fail(503,'محتوى هذه اللعبة غير متاح الآن.');
  return rowRound(row);
}
function freshState(config,number=1,scores=[0,0],used=[]){const current=chooseRound(config,used);return {number,scores,currentId:current.id,used:[...used,current.id],revealed:false,buzz:{...closedBuzz(),open:true},roundKey:token(12),audioPlays:0,finished:false,winner:0};}
export function createMiniRoom(user,body){const config=configFrom(body),id=token(9),stamp=Date.now(),state=freshState(config);run('INSERT INTO mini_game_rooms(id,owner_id,config,state,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?)',id,user.id,JSON.stringify(config),JSON.stringify(state),stamp,stamp,stamp+TTL);run('INSERT INTO mini_game_events(room_id,message,created_at) VALUES(?,?,?)',id,'بدأت اللعبة',stamp);return {id};}
export function getMiniRoom(id,{touch=true}={}){const row=one('SELECT * FROM mini_game_rooms WHERE id=?',id);if(!row)fail(404,'غرفة Mini Games غير موجودة.');if(row.status!=='open'||row.expires_at<Date.now())fail(410,'انتهت الغرفة لعدم النشاط.');const room={...row,config:JSON.parse(row.config),state:JSON.parse(row.state)};if(room.state.buzz?.deadline&&room.state.buzz.deadline<=Date.now()&&!room.state.revealed){room.state.buzz={...closedBuzz(),open:true};save(room,'انتهى وقت الإجابة وفُتح الجرس من جديد');}if(touch&&room.expires_at<Date.now()+8*60*1000){room.expires_at=Date.now()+TTL;run('UPDATE mini_game_rooms SET expires_at=? WHERE id=?',room.expires_at,id);}return room;}
const owner=(room,user)=>{if(!user||user.id!==room.owner_id)fail(403,'التحكم للمقدم فقط.');};
const members=id=>many('SELECT user_id id,name,team,last_seen FROM mini_game_members WHERE room_id=? AND kicked=0 ORDER BY joined_at',id);
const member=(room,user)=>{if(!user)fail(401,'ادخل باسمك أولًا.');const value=one('SELECT * FROM mini_game_members WHERE room_id=? AND user_id=?',room.id,user.id);if(!value||value.kicked)fail(403,'انضم إلى أحد الفريقين أولًا.');return value;};
const currentRound=room=>rowRound(one('SELECT * FROM mini_game_rounds WHERE id=?',room.state.currentId));
export function miniProjection(room,view,user,authorized=false){if(view==='host')owner(room,user);if(view==='buzzer'&&!authorized)member(room,user);const s=room.state,players=members(room.id),projected=projectMiniRound(currentRound(room),s.revealed);if(!projected)fail(409,'تغير محتوى الجولة. اختر سؤالًا جديدًا.');return {id:room.id,version:room.version,config:room.config,serverTime:Date.now(),number:s.number,scores:s.scores,round:projected.round,revealed:s.revealed,buzz:s.buzz,roundKey:s.roundKey,audioPlays:s.audioPlays,finished:s.finished,winner:s.winner,playersCount:players.length,me:user?players.find(p=>p.id===user.id)||null:null,media:projected.media,...(view==='host'?{players:players.map(p=>({...p,online:p.last_seen>Date.now()-30000})),events:many('SELECT id,message,created_at FROM mini_game_events WHERE room_id=? ORDER BY id DESC LIMIT 30',room.id),links:{display:`/mini-room/${room.id}/display`,buzzer:`/mini-room/${room.id}/buzzer`}}:{})};}
function save(room,message){room.version++;const stamp=Date.now();run('UPDATE mini_game_rooms SET state=?,config=?,version=?,updated_at=?,expires_at=? WHERE id=?',JSON.stringify(room.state),JSON.stringify(room.config),room.version,stamp,stamp+TTL,room.id);if(message)run('INSERT INTO mini_game_events(room_id,message,created_at) VALUES(?,?,?)',room.id,message,stamp);}
export function joinMiniRoom(id,user,body){transaction(()=>{const room=getMiniRoom(id),existing=one('SELECT * FROM mini_game_members WHERE room_id=? AND user_id=?',id,user.id);if(existing?.kicked)fail(403,'أزالك المقدم من الغرفة.');if(!existing){const max=Math.max(2,Math.min(200,Number(one("SELECT value FROM settings WHERE key='max_players'")?.value||64))),count=Number(one('SELECT count(*) count FROM mini_game_members WHERE room_id=? AND kicked=0',id)?.count||0);if(count>=max)fail(409,'اكتمل عدد اللاعبين في الغرفة.');}const team=Number(body.team);if(![1,2].includes(team))fail(422,'اختر فريقك.');run('INSERT INTO mini_game_members(room_id,user_id,team,name,joined_at,last_seen) VALUES(?,?,?,?,?,?) ON CONFLICT(room_id,user_id) DO UPDATE SET team=excluded.team,name=excluded.name,last_seen=excluded.last_seen',id,user.id,team,user.name,Date.now(),Date.now());save(room,existing?'':`انضم ${user.name}`);});return miniProjection(getMiniRoom(id),'buzzer',user);}
export function buzzMini(id,user,body){transaction(()=>{const room=getMiniRoom(id),p=member(room,user),s=room.state;if(s.finished||s.revealed||!s.buzz.open||s.buzz.winner||body.key!==s.buzz.key||body.roundKey!==s.roundKey)fail(409,'الجرس مغلق أو سبقك لاعب.');s.buzz={...s.buzz,open:false,winner:{id:p.user_id,name:p.name,team:p.team},deadline:Date.now()+room.config.seconds*1000};save(room,`ضغط ${p.name} الجرس`);});return {ok:true};}
export function actMini(id,user,body){let result;transaction(()=>{const room=getMiniRoom(id),s=room.state;owner(room,user);if(Number(body.version)!==room.version)fail(409,'تغيرت الجولة. انتظر التحديث.');let message='';switch(body.action){
  case 'reveal':if(s.finished||s.revealed)fail(409,'لا توجد إجابة جديدة للكشف.');s.revealed=true;s.buzz=closedBuzz();message='ظهر الحل';break;
  case 'audio':{const round=currentRound(room);if(round.game_slug!=='iconic-commentary')fail(409,'هذه الجولة بلا وصف صوتي.');if(s.audioPlays>=2)fail(409,'استخدمت فرصتي تشغيل الوصف.');s.audioPlays++;message=`شُغّل الوصف الصوتي (${s.audioPlays}/2)`;break;}
  case 'buzz-open':if(s.finished||s.revealed)fail(409,'الجرس غير متاح.');s.buzz={...closedBuzz(),open:true};message='فُتح الجرس';break;
  case 'buzz-close':s.buzz=closedBuzz();message='أُغلق الجرس';break;
  case 'change':{const next=chooseRound(room.config,s.used);s.currentId=next.id;s.used.push(next.id);s.revealed=false;s.buzz={...closedBuzz(),open:true};s.roundKey=token(12);s.audioPlays=0;message='تغير السؤال';break;}
  case 'award':{if(!s.revealed)fail(409,'اكشف الحل أولًا.');const team=Number(body.team);if(![0,1,2].includes(team))fail(422,'الفريق غير صحيح.');if(team)s.scores[team-1]++;if(s.number>=room.config.rounds&&s.scores[0]!==s.scores[1]){s.finished=true;s.winner=s.scores[0]>s.scores[1]?1:2;s.buzz=closedBuzz();message=`فاز ${room.config.teams[s.winner-1].name}`;}else{if(s.number>=room.config.rounds&&s.scores[0]===s.scores[1])room.config.rounds++;const next=freshState(room.config,s.number+1,s.scores,s.used);room.state=next;message=team?`نقطة لـ ${room.config.teams[team-1].name}`:'انتقلتم دون نقطة';}break;}
  case 'new-match':room.state=freshState(room.config);message='بدأت مباراة جديدة';break;
  case 'kick':{const target=String(body.userId||'');if(!one('SELECT user_id FROM mini_game_members WHERE room_id=? AND user_id=?',id,target))fail(404,'اللاعب غير موجود.');run('UPDATE mini_game_members SET kicked=1 WHERE room_id=? AND user_id=?',id,target);if(s.buzz.winner?.id===target)s.buzz=closedBuzz();message='أُزيل لاعب';break;}
  default:fail(422,'الإجراء غير معروف.');}
  save(room,message);result=miniProjection(room,'host',user);});return result;}
export function touchMiniMember(id,user){if(user)run('UPDATE mini_game_members SET last_seen=? WHERE room_id=? AND user_id=? AND last_seen<?',Date.now(),id,user.id,Date.now()-10000);}
