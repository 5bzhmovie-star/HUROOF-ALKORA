import { one, many, run, transaction } from './database.mjs';
import { fail, token } from './security.mjs';
import { answerLetter, LETTERS } from './game.mjs';
import { validName, broadcast } from './rooms.mjs';
import { normalizeSupportUrl } from './support-url.mjs';
import { validateVisualQuestion } from './visual-questions.mjs';
import {searchEntities,getHistory,libraryStats,addEntity,addRelation,fixtureDraft} from './football-library.mjs';
import { saveMedia, referencedMediaExists } from './visual-media.mjs';
import { mkdirSync, openSync, closeSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { dataDir } from './database.mjs';
const RESET_PHRASE = 'حذف جميع الأسئلة';
function exportBasicQuestions() {
  return many('SELECT tournament_id,letter,text,answer,difficulty,status,source,note FROM questions ORDER BY tournament_id,id');
}

export function audit(actor, action, target = '') { run('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)', actor, action, String(target).slice(0, 180), Date.now()); }
export function requireAdmin(admin, roles = ['owner', 'manager', 'questions']) { if (!admin || !admin.active)
    fail(401, 'سجّل دخول الإدارة أولًا.'); if (!roles.includes(admin.role))
    fail(403, 'ليست لديك صلاحية لهذا الإجراء.'); }
function questionInput(body) { const q = { tournament_id: String(body.tournament_id || ''), text: String(body.text || '').trim(), answer: String(body.answer || '').trim(), letter: String(body.letter || '').trim(), difficulty: body.difficulty || 'medium', status: body.status || 'published', source: String(body.source || '').trim(), note: String(body.note || '').trim() }; if (q.text.length < 12 || q.text.length > 600 || q.answer.length < 2 || q.answer.length > 180 || q.note.length > 800 || /[\p{Cc}\p{Cf}]/u.test(q.text + q.answer) || !['easy', 'medium', 'hard'].includes(q.difficulty) || !['published', 'hidden'].includes(q.status))
    fail(422, 'راجع نص السؤال والإجابة ومستوى الصعوبة.'); if (!one('SELECT id FROM tournaments WHERE id=?', q.tournament_id))
    fail(422, 'اختر بطولة صحيحة.'); if (!LETTERS.includes(q.letter) || answerLetter(q.answer) !== q.letter)
    fail(422, 'الحرف يجب أن يطابق أول حرف في الإجابة بعد تجاهل «الـ» وتوحيد الهمزة.'); try {
    const u = new URL(q.source);
    if (u.protocol !== 'https:' || u.username || u.password || q.source.length > 1000)
        throw 0;
}
catch {
    fail(422, 'أضف رابط مصدر صحيح يبدأ بـ https.');
} return q; }
function writeQuestion(q, id) { const now = Date.now(); run('INSERT INTO questions(id,tournament_id,letter,text,answer,difficulty,status,source,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET tournament_id=excluded.tournament_id,letter=excluded.letter,text=excluded.text,answer=excluded.answer,difficulty=excluded.difficulty,status=excluded.status,source=excluded.source,note=excluded.note,updated_at=excluded.updated_at', id, q.tournament_id, q.letter, q.text, q.answer, q.difficulty, q.status, q.source, q.note, now, now); }
export function adminGet(path, url, admin) {
    requireAdmin(admin);
    switch (path) {
        case 'overview': return { questions: one('SELECT count(*) AS n FROM questions').n, published: one("SELECT count(*) AS n FROM questions WHERE status='published'").n, rooms: one("SELECT count(*) AS n FROM rooms WHERE status='open' AND expires_at>?", Date.now()).n, matches: one('SELECT count(*) AS n FROM matches').n, users: one('SELECT count(*) AS n FROM users').n, competitions: many("SELECT t.id,t.name,count(q.id) AS questions FROM tournaments t LEFT JOIN questions q ON q.tournament_id=t.id GROUP BY t.id ORDER BY t.position"), popular: many("SELECT t.name,count(*) AS rooms FROM rooms r,json_each(r.config,'$.tournaments') j JOIN tournaments t ON t.id=j.value GROUP BY t.id ORDER BY rooms DESC LIMIT 5"), role: admin.role };
        case 'questions': {
            const terms = ['1=1'], p = [];
            for (const [key, col] of [['tournament', 'q.tournament_id'], ['letter', 'q.letter'], ['status', 'q.status'], ['difficulty', 'q.difficulty']]) {
                const value = url.searchParams.get(key);
                if (value) {
                    terms.push(`${col}=?`);
                    p.push(value);
                }
            }
            const search = url.searchParams.get('search');
            if (search) {
                terms.push('(q.text LIKE ? OR q.answer LIKE ?)');
                p.push(`%${search.slice(0, 100)}%`, `%${search.slice(0, 100)}%`);
            }
            const where = terms.join(' AND '), page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
            return { items: many(`SELECT q.*,t.name AS tournament FROM questions q JOIN tournaments t ON t.id=q.tournament_id WHERE ${where} ORDER BY q.updated_at DESC,q.id LIMIT 25 OFFSET ?`, ...p, (page - 1) * 25), total: one(`SELECT count(*) AS n FROM questions q WHERE ${where}`, ...p).n, page };
        }
        case 'football-library': return searchEntities({search:url.searchParams.get('search'),type:url.searchParams.get('type')});
        case 'football-library-stats': return libraryStats();
        case 'football-library-history': return getHistory(url.searchParams.get('id'));
        case 'football-fixture-draft': return fixtureDraft(url.searchParams.get('id'));
        case 'visual-media': return many('SELECT id,content_type,license,source,created_at FROM visual_assets ORDER BY created_at DESC LIMIT 500')
            .map(item=>({...item,url:'/api/visual-media/'+item.id}));
        case 'visual-questions': return many('SELECT q.id,q.text,q.answer,q.letter,q.tournament_id,q.difficulty,q.status,v.kind,v.payload,v.verified_at FROM visual_questions v JOIN questions q ON q.id=v.question_id ORDER BY q.updated_at DESC LIMIT 500')
            .map(item=>({...item,visual:JSON.parse(item.payload),payload:undefined}));
        case 'tournaments': return many("SELECT t.*,count(q.id) AS questions FROM tournaments t LEFT JOIN questions q ON q.tournament_id=t.id GROUP BY t.id ORDER BY t.position,t.name");
        case 'questions-reset-info': {
            requireAdmin(admin,['owner']);
            const count = one('SELECT count(*) n FROM questions').n;
            return {count,phrase:RESET_PHRASE,miniCount:one('SELECT count(*) n FROM mini_game_rounds').n};
        }
        case 'export':
            audit(admin.username, 'questions.export');
            return exportBasicQuestions();
        case 'rooms':
            requireAdmin(admin, ['owner', 'manager']);
            return many('SELECT id,owner_id,config,status,created_at,expires_at FROM rooms ORDER BY created_at DESC LIMIT 200').map(r => ({ ...r, config: JSON.parse(r.config) }));
        case 'mini-games':
            return many('SELECT id,game_slug,difficulty,prompt,solution,accepted,explanation,source,status,updated_at FROM mini_game_rounds ORDER BY game_slug,id').map(r=>({...r,accepted:JSON.parse(r.accepted||'[]')}));
        case 'mini-rooms':
            requireAdmin(admin, ['owner', 'manager']);
            return many('SELECT id,owner_id,config,state,status,created_at,expires_at FROM mini_game_rooms ORDER BY created_at DESC LIMIT 200').map(r=>({...r,config:JSON.parse(r.config),state:JSON.parse(r.state)}));
        case 'users':
            requireAdmin(admin, ['owner', 'manager']);
            return many('SELECT id,name,blocked,created_at FROM users ORDER BY created_at DESC LIMIT 200');
        case 'audit':
            requireAdmin(admin, ['owner', 'manager']);
            return many('SELECT * FROM audit ORDER BY id DESC LIMIT 200');
        case 'settings':
            requireAdmin(admin, ['owner']);
            return Object.fromEntries(many('SELECT * FROM settings').map(x => [x.key, x.value]));
        case 'admins':
            requireAdmin(admin, ['owner']);
            return many('SELECT id,username,role,active,created_at FROM admins ORDER BY created_at');
        default: fail(404, 'الصفحة غير موجودة.');
    }
}
export function adminWrite(path, body, admin) {
    requireAdmin(admin);
    switch (path) {
        case 'football-entity-create': {
            requireAdmin(admin,['owner','manager','questions']);
            const result=addEntity(body);audit(admin.username,'football.entity',result.id);return result;
        }
        case 'football-relation-create': {
            requireAdmin(admin,['owner','manager','questions']);
            const result=addRelation(body);audit(admin.username,'football.relation',result.id);return result;
        }
        case 'visual-media-upload': {
            requireAdmin(admin,['owner','manager','questions']);
            const result=saveMedia(body);
            audit(admin.username,'visual.media-upload',result.id);
            return result;
        }
        case 'visual-question': {
            requireAdmin(admin,['owner','manager','questions']);
            const base=questionInput(body), visual=validateVisualQuestion(body.visual);
            const refs=new Set();
            const collect=(object)=>{
                if(!object||typeof object!=='object')return;
                for(const [key,val] of Object.entries(object)){
                    if(['photo','flag','clubLogo','teamImage','playerPhoto'].includes(key)&&typeof val==='string')refs.add(val);
                    else if(Array.isArray(val))val.forEach(collect);
                    else if(val&&typeof val==='object')collect(val);
                }
            };
            collect(visual);
            for(const ref of refs)if(!referencedMediaExists(ref))fail(422,'الصورة غير موجودة في مكتبة الوسائط: '+ref);
            // Prevent publishing non-reviewed questions and reject mismatched type/answer.
            if(base.status==='published'&&(!visual.source||!visual.verifiedAt))fail(422,'التحقق التاريخي مطلوب للنشر.');
            const id=body.id?String(body.id):token(18);
            if(body.id&&!one('SELECT id FROM questions WHERE id=?',id))fail(404,'السؤال غير موجود.');
            transaction(()=>{
                writeQuestion(base,id);
                run('INSERT INTO visual_questions(question_id,kind,payload,verified_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,verified_at=excluded.verified_at',
                    id,visual.type,JSON.stringify(visual),visual.verifiedAt,Date.now());
                audit(admin.username,'visual.question-save',id);
            });
            return {id,kind:visual.type};
        }
        case 'question': {
            const q = questionInput(body), id = body.id ? String(body.id) : token(18);
            if (body.id && !one('SELECT id FROM questions WHERE id=?', id))
                fail(404, 'السؤال غير موجود.');
            transaction(() => { writeQuestion(q, id); audit(admin.username, body.id ? 'question.update' : 'question.create', id); });
            return { id };
        }
        case 'questions-reset': {
            requireAdmin(admin,['owner']);
            const current = one('SELECT count(*) n FROM questions').n;
            if (body.confirm !== RESET_PHRASE || !Number.isSafeInteger(body.expectedCount) || body.expectedCount !== current)
                fail(409,'العدد تغيّر أو عبارة التأكيد غير صحيحة. حدّث الصفحة ثم أعد المحاولة.');
            if (!current) fail(409,'بنك الأسئلة فارغ بالفعل.');
            if (one("SELECT 1 FROM rooms WHERE status='open' AND expires_at>? LIMIT 1",Date.now()))
                fail(409,'أغلق غرف حروف الكورة النشطة قبل تفريغ الأسئلة.');
            const questions = exportBasicQuestions();
            if (questions.length !== current) fail(500,'تعذّر تأكيد اكتمال النسخة الاحتياطية.');
            const stamp = new Date().toISOString().replace(/[:.]/g,'-');
            const id = randomUUID();
            const filename = `questions-before-reset-${stamp}-${id}.json`;
            const directory = resolve(dataDir,'backups');
            mkdirSync(directory,{recursive:true,mode:0o700});
            const file = resolve(directory,filename);
            const json = JSON.stringify({format:'huroof-basic-questions-backup-v1',savedAt:new Date().toISOString(),count:current,questions},null,2);
            let fd;
            try {
                fd = openSync(file,'wx',0o600);
                writeFileSync(fd,json,'utf8');
                const verified=JSON.parse(readFileSync(file,'utf8'));
                if(verified.count!==current || verified.questions.length!==current)throw Error('invalid backup');
            } catch {
                if (fd !== undefined) {try{closeSync(fd);}catch{} fd=undefined;}
                try{unlinkSync(file);}catch{}
                fail(500,'تعذّر حفظ نسخة احتياطية مؤكدة. لم تُحذف أي أسئلة.');
            } finally {if(fd!==undefined)closeSync(fd);}
            transaction(()=>{
                run("INSERT INTO settings(key,value) VALUES('basic_questions_customized','true') ON CONFLICT(key) DO UPDATE SET value='true'");
                run('DELETE FROM questions');
                audit(admin.username,'questions.reset',String(current));
            });
            return {ok:true,deleted:current,backupFile:filename,sha256:createHash('sha256').update(json).digest('hex'),remaining:one('SELECT count(*) n FROM questions').n};
        }
        case 'question-delete': {
            const id = String(body.id || '');
            transaction(() => { run('DELETE FROM questions WHERE id=?', id); audit(admin.username, 'question.delete', id); });
            return { ok: true };
        }
        case 'mini-game-round': {
            const id=String(body.id||''),prompt=String(body.prompt||'').trim(),solution=String(body.solution||'').trim(),explanation=String(body.explanation||'').trim(),source=String(body.source||'').trim(),difficulty=String(body.difficulty||''),status=String(body.status||''),accepted=(Array.isArray(body.accepted)?body.accepted:[solution]).map(value=>String(value).trim()).filter(Boolean);
            if(!one('SELECT id FROM mini_game_rounds WHERE id=?',id))fail(404,'الجولة غير موجودة.');
            if(prompt.length<8||prompt.length>240||solution.length<1||solution.length>180||explanation.length>600||!accepted.length||accepted.length>50||accepted.some(value=>value.length>180)||!['easy','medium','hard','mixed'].includes(difficulty)||!['published','hidden'].includes(status))fail(422,'راجع نص الجولة والحل والإجابات المقبولة والحالة.');
            try{const url=new URL(source);if(url.protocol!=='https:'||url.username||url.password)throw 0;}catch{fail(422,'أضف رابط مصدر صحيحًا يبدأ بـ https.');}
            transaction(()=>{run('UPDATE mini_game_rounds SET prompt=?,solution=?,accepted=?,explanation=?,source=?,difficulty=?,status=?,updated_at=? WHERE id=?',prompt,solution,JSON.stringify(accepted),explanation,source,difficulty,status,Date.now(),id);audit(admin.username,'mini-game-round.update',id);});
            return {id};
        }
        case 'mini-game-round-delete': {
            const id=String(body.id||'');
            if(one("SELECT id FROM mini_game_rooms WHERE status='open' AND json_extract(state,'$.currentId')=? LIMIT 1",id))
                fail(409,'هذه الجولة مستخدمة الآن. أخفها بدل حذفها.');
            transaction(()=>{run('DELETE FROM mini_game_rounds WHERE id=?',id);audit(admin.username,'mini-game-round.delete',id);});return {ok:true};
        }
        case 'import': {
            if (!Array.isArray(body.questions) || !body.questions.length || body.questions.length > 2000)
                fail(422, 'استورد من سؤال واحد إلى ٢٠٠٠ سؤال في الدفعة.');
            const input = body.questions.map(questionInput), texts = new Set();
            for (const q of input) {
                if (texts.has(q.text) || one('SELECT id FROM questions WHERE text=?', q.text))
                    fail(409, 'تحتوي الدفعة على سؤال مكرر. لم يُحفظ أي سؤال.');
                texts.add(q.text);
            }
            transaction(() => { for (const q of input)
                writeQuestion(q, token(18)); audit(admin.username, 'questions.import', input.length); });
            return { count: input.length };
        }
        case 'tournament': {
            const name = validName(body.name), id = body.id ? String(body.id) : token(9), position = Number(body.position || 0);
            if (!Number.isInteger(position) || position < 0 || position > 999)
                fail(422, 'الترتيب يجب أن يكون بين ٠ و٩٩٩.');
            transaction(() => { run('INSERT INTO tournaments(id,name,active,position) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active,position=excluded.position', id, name, body.active === false ? 0 : 1, position); audit(admin.username, 'tournament.save', id); });
            return { id };
        }
        case 'close-room':
            requireAdmin(admin, ['owner', 'manager']);
            transaction(() => { run("UPDATE rooms SET status='closed' WHERE id=?", String(body.id)); audit(admin.username, 'room.close', body.id); });
            broadcast(String(body.id));
            return { ok: true };
        case 'close-mini-room':
            requireAdmin(admin,['owner','manager']);
            transaction(()=>{run("UPDATE mini_game_rooms SET status='closed',version=version+1 WHERE id=?",String(body.id||''));audit(admin.username,'mini-room.close',body.id);});
            return {ok:true};
        case 'block-user':
            requireAdmin(admin, ['owner', 'manager']);
            transaction(() => { run('UPDATE users SET blocked=? WHERE id=?', body.blocked ? 1 : 0, String(body.id)); if (body.blocked)
                run('DELETE FROM sessions WHERE user_id=?', String(body.id)); audit(admin.username, 'user.block', body.id); });
            for (const r of many('SELECT room_id AS id FROM members WHERE user_id=?', String(body.id)))
                broadcast(r.id);
            return { ok: true };
        case 'settings':
            requireAdmin(admin, ['owner']);
            {
                const supportUrl = normalizeSupportUrl(body.support_url);
                if (!['auto', 'light', 'dark'].includes(body.default_theme) || !Number.isInteger(body.max_players) || body.max_players < 2 || body.max_players > 100 || supportUrl === null)
                    fail(422, 'راجع الإعدادات. رابط الدعم يجب أن يبدأ بـ https://');
                transaction(() => { for (const [key, value] of Object.entries({ maintenance: String(body.maintenance), default_theme: body.default_theme, max_players: String(body.max_players), support_url: supportUrl }))
                    run('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, value); audit(admin.username, 'settings.update'); });
            }
            return { ok: true };
        case 'admin-role': {
            requireAdmin(admin, ['owner']);
            if (!['owner', 'manager', 'questions'].includes(body.role))
                fail(422, 'الصلاحية غير صحيحة.');
            if (body.id === admin.id)
                fail(422, 'لا يمكنك تغيير صلاحيات حسابك الحالي.');
            transaction(() => { run('UPDATE admins SET role=?,active=? WHERE id=?', body.role, body.active ? 1 : 0, String(body.id)); run('DELETE FROM sessions WHERE admin_id=?', String(body.id)); audit(admin.username, 'admin.permissions', body.id); });
            return { ok: true };
        }
        default: fail(404, 'الإجراء غير موجود.');
    }
}
