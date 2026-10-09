import { one, many, run, transaction } from './database.mjs';
import { token, fail } from './security.mjs';
import { makeBoard, findPath, publicQuestion, checkColors } from './game.mjs';
import { publicVisual } from './visual-questions.mjs';
export const subscribers = new Map();
const ROOM_TTL = 10 * 60 * 1000;
export function getRoom(id) { const row = one('SELECT * FROM rooms WHERE id=?', id); if (!row)
    fail(404, 'الغرفة غير موجودة. تأكد من الرابط أو الرمز.'); if (row.status !== 'open' || row.expires_at < Date.now())
    fail(410, 'انتهت هذه الغرفة أو تم إغلاقها.'); if (row.expires_at < Date.now() + 8 * 60 * 1000) { row.expires_at = Date.now() + ROOM_TTL; run('UPDATE rooms SET expires_at=? WHERE id=?', row.expires_at, id); } return { ...row, config: JSON.parse(row.config), state: JSON.parse(row.state) }; }
export function owner(room, user) { if (!user || room.owner_id !== user.id)
    fail(403, 'التحكم في هذه الغرفة متاح للمقدم فقط.'); }
export function member(room, user) { if (!user)
    fail(401, 'ادخل باسمك أولًا.'); const row = one('SELECT * FROM members WHERE room_id=? AND user_id=?', room.id, user.id); if (!row || row.kicked)
    fail(403, 'لست ضمن لاعبي هذه الغرفة.'); return row; }
export function validName(value) { const n = String(value || '').normalize('NFKC').trim(); if (n.length < 2 || n.length > 24 || /[\p{Cc}\p{Cf}<>]/u.test(n))
    fail(422, 'اكتب اسمًا من حرفين إلى ٢٤ حرفًا بدون رموز تحكم.'); return n; }
export function roomConfig(body) { const config = { teams: [{ name: validName(body.teams?.[0]?.name), color: String(body.teams?.[0]?.color || '') }, { name: validName(body.teams?.[1]?.name), color: String(body.teams?.[1]?.color || '') }], size: Number(body.size), rounds: body.rounds === undefined ? 2 : body.rounds, mode: body.mode, seconds: Number(body.seconds), tournaments: [...new Set(Array.isArray(body.tournaments) ? body.tournaments : [])], difficulty: body.difficulty || 'all', autoReopen: body.autoReopen === true }; if (![4, 5, 6, 7].includes(config.size) || ![2,3,4,5,6].includes(config.rounds) || !['human', 'auto'].includes(config.mode) || ![5, 10, 15, 20].includes(config.seconds) || !['all', 'easy', 'medium', 'hard'].includes(config.difficulty))
    fail(422, 'راجع إعدادات المباراة.'); if (!checkColors(config.teams[0].color, config.teams[1].color))
    fail(422, 'اختر لونين داكنين ومختلفين بوضوح حتى تبقى الحروف مقروءة.'); if (config.teams[0].name === config.teams[1].name)
    fail(422, 'اختر اسمًا مختلفًا لكل فريق.'); if (!config.tournaments.length || config.tournaments.length > 50 || config.tournaments.some(id => typeof id !== 'string' || !one('SELECT id FROM tournaments WHERE id=? AND active=1', id)))
    fail(422, 'اختر بطولة متاحة واحدة على الأقل.'); return config; }
function questionFilter(config, letter) { const params = [...config.tournaments]; let sql = `q.status='published' AND t.active=1 AND q.tournament_id IN (${params.map(() => '?').join(',')})`; if (config.difficulty !== 'all') {
    sql += ' AND q.difficulty=?';
    params.push(config.difficulty);
} if (letter) {
    sql += ' AND q.letter=?';
    params.push(letter);
} return { sql, params }; }
export function questionCoverage(config) { const collect = candidate => { const filter = questionFilter(candidate), coverage = {}; for (const row of many(`SELECT q.letter,count(*) AS count FROM questions q JOIN tournaments t ON t.id=q.tournament_id WHERE ${filter.sql} GROUP BY q.letter`, ...filter.params)) coverage[row.letter] = Number(row.count); return coverage; }; const preferred = collect(config); return Object.values(preferred).reduce((sum, count) => sum + count, 0) >= config.size * config.size || config.difficulty === 'all' ? preferred : collect({ ...config, difficulty: 'all' }); }
export function pickQuestion(config, letter, used = []) {
  const pick = candidate => {
    const filter = questionFilter(candidate, letter);
    // Visual drafts are never drawn, and old text questions remain fully compatible.
    const row = one(`SELECT q.*,t.name AS tournament,v.kind AS visual_kind,v.payload AS visual_payload
      FROM questions q JOIN tournaments t ON t.id=q.tournament_id
      LEFT JOIN visual_questions v ON v.question_id=q.id
      WHERE ${filter.sql} AND q.id NOT IN (SELECT value FROM json_each(?))
      ORDER BY random() LIMIT 1`, ...filter.params, JSON.stringify(used)) || null;
    if(!row)return null;
    if(row.visual_payload) {
      try {row.visual=JSON.parse(row.visual_payload);} catch {return null;}
      delete row.visual_payload;
    }
    return row;
  };
  return pick(config) || (config.difficulty !== 'all' ? pick({...config,difficulty:'all'}) : null);
}
export function freshState(config, round = 1, results = [], matchKey = round) { const coverage = questionCoverage(config); return { round, matchKey, results, matchWinner: 0, board: makeBoard(config.size, coverage), current: null, cell: null, revealed: false, used: [], history: [], winner: 0, path: [], buzz: { open: false, winner: null, deadline: null, key: token(12) }, questionKey: token(12), visualReveal:null }; }
export function createRoom(user, body) { const config = roomConfig(body), state = freshState(config), id = token(9), now = Date.now(); run('INSERT INTO rooms(id,owner_id,config,state,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?)', id, user.id, JSON.stringify(config), JSON.stringify(state), now, now, now + ROOM_TTL); event(id, 'بدأت الغرفة'); return getRoom(id); }
export function event(id, message) { run('INSERT INTO events(room_id,message,created_at) VALUES(?,?,?)', id, message, Date.now()); }
export function projection(room, view, user) { if (view === 'host')
    owner(room, user); if (view === 'buzzer')
    member(room, user); const { state: s, config } = room, controller = user?.id === room.owner_id; const online = new Set([...(subscribers.get(room.id) || [])].map(x => x.userId).filter(Boolean)); const players = many('SELECT user_id AS id,name,team,kicked FROM members WHERE room_id=? AND kicked=0 ORDER BY joined_at', room.id); const projected = s.current ? {...s.current,revealedSlots:s.visualReveal?.slots || []} : null;
 return { id: room.id, version: room.version, config, serverTime: Date.now(), round: s.round, results: s.results || [], matchWinner: s.matchWinner || 0, board: s.board, cell: s.cell, question: publicQuestion(projected, s.revealed || (view === 'host' && config.mode === 'human')), visualReveal: s.visualReveal ? {mode:s.visualReveal.mode,slots:s.visualReveal.slots,startedAt:s.visualReveal.startedAt} : null, revealed: s.revealed, winner: s.winner, path: s.path, buzz: s.buzz, questionKey: s.questionKey, playersCount: players.length, canControl: config.mode === 'auto' && controller, me: user ? players.find(p => p.id === user.id) || null : null, ...(view === 'host' ? { players: players.map(p => ({ ...p, online: online.has(p.id) })), events: many('SELECT id,message,created_at FROM events WHERE room_id=? ORDER BY id DESC LIMIT 40', room.id), canUndo: s.history.length > 0, links: { display: `/room/${room.id}/display`, buzzer: `/room/${room.id}/buzzer` } } : {}) }; }
export function broadcast(id) { const clients = subscribers.get(id); if (!clients)
    return; for (const c of clients) {
    try {
        const user = c.userId ? one('SELECT * FROM users WHERE id=? AND blocked=0', c.userId) : null;
        const auth = one('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?', c.sessionHash, Date.now());
        if (!auth && c.view !== 'display')
            throw new Error('session ended');
        const data = projection(getRoom(id), c.view, user);
        if (c.res.writableLength > 262144) {
            c.res.end();
            continue;
        }
        c.res.write(`event: state\ndata: ${JSON.stringify(data)}\n\n`);
    }
    catch {
        c.res.write('event: closed\ndata: {}\n\n');
        c.res.end();
    }
} }
function save(room, message) { room.version++; run('UPDATE rooms SET state=?,version=?,updated_at=?,expires_at=? WHERE id=?', JSON.stringify(room.state), room.version, Date.now(), Date.now() + ROOM_TTL, room.id); if (message)
    event(room.id, message); }
function remember(state) { const { history, ...snapshot } = structuredClone(state); state.history.push(snapshot); state.history = state.history.slice(-40); }
function closeBuzz(state) { state.buzz = { open: false, winner: null, deadline: null, key: token(12) }; }
function recordWinner(room) { const s = room.state; run('DELETE FROM matches WHERE room_id=? AND round=?', room.id, s.matchKey || s.round); s.winner = 0; s.path = []; for (const team of [1, 2]) {
    const path = findPath(s.board, room.config.size, team);
    if (path.length) {
        s.winner = team;
        s.path = path;
        break;
    }
} s.results = (s.results || []).filter(result => result.round !== s.round); if (s.winner) s.results.push({ round: s.round, winner: s.winner }); s.matchWinner = 0; if (s.round >= (room.config.rounds || 2) && s.winner) { const wins = [1, 2].map(team => s.results.filter(result => result.winner === team).length); if (wins[0] !== wins[1]) s.matchWinner = wins[0] > wins[1] ? 1 : 2; } if (s.winner) {
    const matchId = token(18);
    run('INSERT INTO matches VALUES(?,?,?,?,?,?)', matchId, room.id, s.matchKey || s.round, s.winner, JSON.stringify(s.board), Date.now());
    for (const p of many('SELECT user_id,team FROM members WHERE room_id=? AND kicked=0', room.id))
        run('INSERT INTO match_players VALUES(?,?,?)', matchId, p.user_id, Number(p.team === s.winner));
    closeBuzz(s);
} }
export function act(id, user, body) {
    transaction(() => {
        const room = getRoom(id);
        owner(room, user);
        const s = room.state;
        if (body.version !== room.version)
            fail(409, 'تغيّرت المباراة. انتظر تحديث اللوحة ثم أعد المحاولة.');
        let message = '';
        switch (body.action) {
            case 'select': {
                if (s.winner)
                    fail(409, 'انتهت المباراة. ابدأ مباراة جديدة.');
                if (s.current)
                    fail(409, 'أكمل السؤال الحالي أولًا.');
                const index = Number(body.cell);
                if (!Number.isInteger(index) || !s.board[index] || s.board[index].owner)
                    fail(422, 'اختر خلية متاحة.');
                const question = pickQuestion(room.config, s.board[index].letter, s.used);
                if (!question)
                    fail(422, 'نفدت أسئلة هذا الحرف. أعد المباراة أو اختر حرفًا آخر.');
                remember(s);
                s.current = question;
                s.used.push(s.current.id);
                s.cell = index;
                s.revealed = false;
                s.visualReveal = s.current?.visual ? {mode:'manual',slots:[],startedAt:null} : null;
                s.questionKey = token(12);
                closeBuzz(s);
                if (room.config.mode === 'auto')
                    s.buzz.open = true;
                message = `اختير حرف ${s.current.letter}`;
                break;
            }
            case 'change': {
                if (!s.current)
                    fail(409, 'اختر حرفًا أولًا.');
                const question = pickQuestion(room.config, s.current.letter, s.used);
                if (!question)
                    fail(422, 'لا يوجد سؤال بديل لهذا الحرف ضمن اختياراتك.');
                remember(s);
                s.current = question;
                s.used.push(s.current.id);
                s.revealed = false;
                s.questionKey = token(12);
                closeBuzz(s);
                if (room.config.mode === 'auto')
                    s.buzz.open = true;
                message = 'تم تغيير السؤال';
                break;
            }
            case 'visual-reveal-slot': {
                if(!s.current?.visual || s.revealed || !s.visualReveal)fail(409,'لا يوجد سؤال تشكيلات متاح للكشف.');
                if(s.current.visual.type === 'career')fail(422,'هذا النوع لا يحتوي على تشكيلات.');
                const slot = Number(body.slot);
                if(!Number.isInteger(slot)||slot<0||slot>10)fail(422,'اختر لاعبًا من التشكيلة.');
                s.visualReveal.slots = [...new Set([...s.visualReveal.slots,slot])].sort((a,b)=>a-b);
                s.visualReveal.mode = 'manual';
                s.visualReveal.startedAt = Date.now();
                message = 'كُشفت بطاقة لاعب';
                break;
            }
            case 'visual-reveal-all':
            case 'visual-reveal-auto': {
                if(!s.current?.visual || s.revealed)fail(409,'لا يوجد سؤال بصري للكشف.');
                s.revealed = true;
                s.visualReveal = {mode:body.action==='visual-reveal-auto'?'auto':'all',slots:[0,1,2,3,4,5,6,7,8,9,10],startedAt:Date.now()};
                closeBuzz(s);
                message='اكتمل الكشف البصري';
                break;
            }
            case 'reveal':
                if (!s.current)
                    fail(409, 'لا يوجد سؤال مفتوح.');
                s.revealed = true;
                closeBuzz(s);
                message = 'ظهرت الإجابة';
                break;
            case 'award': {
                if (!s.current || !s.revealed)
                    fail(409, 'أظهر الإجابة قبل اعتمادها.');
                const team = Number(body.team);
                if (![0, 1, 2].includes(team))
                    fail(422, 'الفريق غير صحيح.');
                remember(s);
                if (team)
                    s.board[s.cell].owner = team;
                message = team ? `احتسبت خلية ${s.board[s.cell].letter} لصالح ${room.config.teams[team - 1].name}` : 'انتهى السؤال بدون نقطة';
                s.current = null;
                s.cell = null;
                s.revealed = false;
                closeBuzz(s);
                recordWinner(room);
                if (s.winner)
                    message += ` — فاز ${room.config.teams[s.winner - 1].name}`;
                break;
            }
            case 'buzz-open':
                if (!s.current || s.revealed || s.winner)
                    fail(409, 'الجرس غير متاح الآن.');
                closeBuzz(s);
                s.buzz.open = true;
                message = 'فُتح الجرس';
                break;
            case 'buzz-close':
                closeBuzz(s);
                message = 'أُغلق الجرس';
                break;
            case 'correct': {
                const index = Number(body.cell), team = Number(body.team);
                if (!Number.isInteger(index) || !s.board[index] || ![0, 1, 2].includes(team))
                    fail(422, 'خلية أو فريق غير صحيح.');
                if (s.current)
                    fail(409, 'أكمل السؤال قبل تعديل الخلايا.');
                remember(s);
                s.board[index].owner = team;
                recordWinner(room);
                message = `عُدلت نتيجة خلية ${s.board[index].letter}`;
                break;
            }
            case 'undo': {
                if (!s.history.length)
                    fail(409, 'لا توجد حركة للتراجع عنها.');
                const used = s.used, history = s.history, previous = history.pop();
                room.state = { ...previous, used: [...new Set([...previous.used, ...used])], history, questionKey: token(12) };
                closeBuzz(room.state);
                recordWinner(room);
                message = 'تراجع المقدم عن آخر حركة';
                break;
            }
            case 'restart':
                if (!s.winner || s.matchWinner) fail(409, 'أكمل الجولة أو ابدأ مباراة جديدة.');
                room.state = freshState(room.config, s.round + 1, s.results || [], (s.matchKey || s.round) + 1);
                message = 'بدأت الجولة التالية';
                break;
            case 'new-match':
                room.state = freshState(room.config, 1, [], (s.matchKey || s.round) + 1);
                message = 'بدأت مباراة جديدة';
                break;
            case 'kick': {
                const target = String(body.userId || '');
                if (!one('SELECT user_id FROM members WHERE room_id=? AND user_id=?', id, target))
                    fail(404, 'اللاعب غير موجود.');
                run('UPDATE members SET kicked=1 WHERE room_id=? AND user_id=?', id, target);
                if (s.buzz.winner?.id === target)
                    closeBuzz(s);
                message = 'أُزيل لاعب من الغرفة';
                break;
            }
            default: fail(422, 'الإجراء غير معروف.');
        }
        save(room, message);
    });
    broadcast(id);
    return projection(getRoom(id), 'host', user);
}
export function joinRoom(id, user, body) { transaction(() => { const room = getRoom(id), existing = one('SELECT * FROM members WHERE room_id=? AND user_id=?', id, user.id); if (existing?.kicked)
    fail(403, 'أزالك المقدم من هذه الغرفة.'); const max = Number(one("SELECT value FROM settings WHERE key='max_players'")?.value || 64); if (!existing && one('SELECT count(*) AS n FROM members WHERE room_id=? AND kicked=0', id).n >= max)
    fail(409, 'الغرفة مكتملة.'); const team = Number(body.team); if (![1, 2].includes(team))
    fail(422, 'اختر فريقك.'); if (existing && existing.team !== team && room.state.board.some(c => c.owner))
    fail(409, 'لا يمكن تبديل الفريق بعد احتساب أول خلية.'); run('INSERT INTO members(room_id,user_id,team,name,joined_at) VALUES(?,?,?,?,?) ON CONFLICT(room_id,user_id) DO UPDATE SET name=excluded.name,team=excluded.team', id, user.id, team, user.name, Date.now()); save(room, existing ? '' : `انضم ${user.name}`); }); broadcast(id); return projection(getRoom(id), 'buzzer', user); }
export function buzz(id, user, body) { transaction(() => { const room = getRoom(id), p = member(room, user), s = room.state; if (!s.current || s.revealed || !s.buzz.open || s.buzz.winner || body.key !== s.buzz.key || body.questionKey !== s.questionKey)
    fail(409, 'الجرس مغلق أو سبقك لاعب آخر.'); s.buzz = { ...s.buzz, open: false, winner: { id: p.user_id, name: p.name, team: p.team }, deadline: Date.now() + room.config.seconds * 1000 }; save(room, `ضغط ${p.name} الجرس`); }); broadcast(id); return { ok: true }; }
export function expireBuzzers() { const rows = many("SELECT id FROM rooms WHERE status='open' AND json_extract(state,'$.buzz.deadline') IS NOT NULL AND json_extract(state,'$.buzz.deadline')<=?", Date.now()); for (const { id } of rows) {
    try {
        transaction(() => { const room = getRoom(id); closeBuzz(room.state); if (room.config.autoReopen && room.state.current && !room.state.revealed)
            room.state.buzz.open = true; save(room, 'انتهى وقت الإجابة'); });
        broadcast(id);
    }
    catch { }
} }
