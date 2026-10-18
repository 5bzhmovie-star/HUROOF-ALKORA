import {one,many} from './database.mjs';import {fail} from './security.mjs';
export function visualDetail(id){const row=one('SELECT q.*,v.kind,v.payload,v.verified_at FROM questions q JOIN visual_questions v ON v.question_id=q.id WHERE q.id=?',id);if(!row)fail(404,'السؤال المصور غير موجود.');return {...row,visual:JSON.parse(row.payload),payload:undefined};}
export function visualBank(filters={}){
 const where=[],args=[];for(const [key,col] of [['kind','v.kind'],['status','q.status'],['tournament','q.tournament_id'],['letter','q.letter']]){const val=filters[key];if(val&&val!=='all'){where.push(col+'=?');args.push(String(val).slice(0,100));}}
 const term=String(filters.search||'').trim().slice(0,100);if(term){where.push('(q.text LIKE ? OR q.answer LIKE ?)');args.push('%'+term+'%','%'+term+'%');}
 const sql=where.length?' WHERE '+where.join(' AND '):'';const from=' FROM visual_questions v JOIN questions q ON q.id=v.question_id';
 const page=Math.max(1,Math.min(100000,Math.floor(Number(filters.page)||1))),pageSize=24;
 const total=one('SELECT count(*) total'+from+sql,...args).total;
 const items=many('SELECT q.*,t.name tournament,v.kind,v.payload'+from+' JOIN tournaments t ON t.id=q.tournament_id'+sql+' ORDER BY q.updated_at DESC,q.id LIMIT ? OFFSET ?',...args,pageSize,(page-1)*pageSize).map(r=>({...r,visual:JSON.parse(r.payload),payload:undefined}));
 const all=one("SELECT count(*) total,coalesce(sum(q.status='published'),0) published,coalesce(sum(q.status='hidden'),0) drafts"+from);
 return {items,total,page,pageSize,stats:{...all,byKind:many('SELECT v.kind,count(*) total'+from+' GROUP BY v.kind'),byTournament:many('SELECT t.id,t.name,count(*) total'+from+' JOIN tournaments t ON t.id=q.tournament_id GROUP BY t.id ORDER BY t.position'),byLetter:many('SELECT q.letter,count(*) total'+from+' GROUP BY q.letter ORDER BY q.letter')}};
}
