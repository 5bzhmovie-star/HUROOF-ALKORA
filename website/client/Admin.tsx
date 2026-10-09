"use client";
import React, { useEffect, useState } from 'react';
import { ShieldCheck, BookOpen, Trophy, Users, Radio, ScrollText, Settings2, Search, Plus, Download, Upload, Save, Trash2, LogOut, ChevronRight, ChevronLeft, Gamepad2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Session, Competition, api, ar, difficulties } from './api';
import { Button, Choice, Notice, Loading, Confirm } from './ui';
const roleNames: Record<string, string> = { owner: 'مالك البرنامج', manager: 'مدير', questions: 'مشرف أسئلة' };
type Question = {
    id?: string;
    tournament_id: string;
    letter: string;
    text: string;
    answer: string;
    difficulty: string;
    status: string;
    source: string;
    note: string;
};
export default function Admin({ session, onSession, tournaments }: {
    session: Session;
    onSession: (s: Session) => void;
    tournaments: Competition[];
}) {
    const [credentials, setCredentials] = useState({ username: '', password: '', code: '' });
    const [loginBusy, setLoginBusy] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [tab, setTab] = useState('overview'), [data, setData] = useState<any>(null), [dataTab, setDataTab] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [refresh, setRefresh] = useState(0), [filter, setFilter] = useState({ tournament: 'all', difficulty: 'all', status: 'all', letter: 'all', search: '', page: 1 }), [search, setSearch] = useState(''), [question, setQuestion] = useState<Question | null>(null), [miniRound, setMiniRound] = useState<any>(null), [competition, setCompetition] = useState<any>(null), [deleting, setDeleting] = useState<string | null>(null), [allTournaments, setAllTournaments] = useState<Competition[]>(tournaments), [importing, setImporting] = useState(false), [importText, setImportText] = useState(''), [invite, setInvite] = useState(false), [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'questions' }), [enrollment, setEnrollment] = useState<any>(null), [activation, setActivation] = useState('');
    const bump = () => setRefresh(v => v + 1);
    async function save(path: string, body: any) { setBusy(true); setError(''); setSuccess(''); try {
        const result = await api('/admin/' + path, body);
        if (path === 'settings') {
            try { onSession(await api<Session>('/session')); } catch { /* Settings are already saved. */ }
        }
        setSuccess('تم الحفظ.');
        bump();
        return result;
    }
    catch (e: any) {
        setError(e.message);
        return null;
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { if (!session.admin)
        return; let live = true; setData(null); setError(''); const params = new URLSearchParams(); if (tab === 'questions') {
        Object.entries(filter).forEach(([key, value]) => { if (value !== 'all' && value !== '')
            params.set(key, String(value)); });
    } api('/admin/' + tab + '?' + params).then(v => { if (live) {
        setData(v); setDataTab(tab); } }).catch(e => { if (live)
        setError(e.message); }); return () => { live = false; }; }, [tab, session.admin, refresh, filter]);
    useEffect(() => { if (session.admin)
        api<Competition[]>('/admin/tournaments').then(setAllTournaments).catch(() => { }); }, [session.admin, refresh]);
    if (!session.admin)
        return <main className="container admin-login"><form className="panel" onSubmit={async event => {
            event.preventDefault(); if (loginBusy) return; setLoginBusy(true); setLoginError('');
            try {
                const result = await api<Session>('/admin/login', credentials);
                setCredentials({username:'',password:'',code:''}); onSession(result);
            } catch (err: any) { setLoginError(err.message || 'تعذّر تسجيل الدخول.'); }
            finally { setLoginBusy(false); }
        }}><div className="admin-lock"><ShieldCheck size={32}/></div><h1>دخول إدارة حروف الكورة</h1>
        <p>سجّل بحساب إدارة البرنامج وكلمة المرور ورمز المصادقة.</p>
        <label>اسم المستخدم<input required autoComplete="username" dir="ltr" value={credentials.username} onChange={e=>setCredentials(c=>({...c,username:e.target.value}))}/></label>
        <label>كلمة المرور<input required type="password" autoComplete="current-password" value={credentials.password} onChange={e=>setCredentials(c=>({...c,password:e.target.value}))}/></label>
        <label>رمز التحقق (٦ أرقام)<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" pattern="[0-9]{6}" value={credentials.code} onChange={e=>setCredentials(c=>({...c,code:e.target.value}))}/></label>
        {loginError&&<Notice>{loginError}</Notice>}
        <Button className="primary wide" type="submit" disabled={loginBusy}>{loginBusy?'جارٍ التحقق…':'دخول لوحة الإدارة'}</Button>
        <p className="hint">إذا لم تنشئ حسابًا بعد، اضغط «لوحة الإدارة» في شريط تطبيق Windows لإعداده أول مرة.</p>
        </form></main>;
    const owner = session.admin.role === 'owner', operational = session.admin.role !== 'questions';
    const sections = [['overview', 'نظرة عامة', ShieldCheck], ['questions', 'الأسئلة', BookOpen], ['mini-games', 'محتوى Mini Games', Gamepad2], ['tournaments', 'البطولات', Trophy], ...(operational ? [['rooms', 'غرف الحروف', Radio], ['mini-rooms', 'غرف Mini Games', Gamepad2], ['users', 'اللاعبون', Users], ['audit', 'سجل العمليات', ScrollText]] : []), ...(owner ? [['settings', 'الإعدادات', Settings2]] : [])];
    const newQuestion = () => setQuestion({ tournament_id: allTournaments[0]?.id || '', letter: 'ا', text: '', answer: '', difficulty: 'medium', status: 'published', source: '', note: '' });
    return <main className="container admin-page"><div className="page-heading inline"><div><span className="eyebrow">حروف الكورة</span><h1>إدارة الملعب</h1><p>{session.admin.username} · {roleNames[session.admin.role]}</p></div><Button variant="outline" onClick={async () => { try { await api('/admin/logout',{}); onSession(await api<Session>('/session')); } catch (err:any) { setError(err.message); } }}><LogOut /> خروج الإدارة</Button></div>{error && <Notice>{error}</Notice>}{success && <Notice success>{success}</Notice>}<Tabs value={tab} onValueChange={setTab} dir="rtl" className="admin-tabs"><TabsList className="admin-nav">{sections.map(([key, label, Icon]: any) => <TabsTrigger key={key} value={key}><Icon size={18}/>{label}</TabsTrigger>)}</TabsList>{sections.filter(([key]) => key === tab).map(([key]: any) => <TabsContent key={key} value={key}>{!data || dataTab !== tab ? (error ? <Button variant="outline" onClick={bump}>إعادة تحميل القسم</Button> : <Loading />) : <>
            {key === 'overview' && <><div className="stat-grid">{[['الأسئلة المنشورة', data.published], ['الغرف النشطة', data.rooms], ['الجولات المكتملة', data.matches], ['اللاعبون', data.users]].map(([label, value]) => <div className="panel stat" key={label}><span>{label}</span><strong>{ar(Number(value))}</strong></div>)}</div><div className="admin-overview-grid"><section className="panel"><h2>أسئلة كل بطولة</h2>{data.competitions.map((t: any) => <div className="stat-row" key={t.id}><span>{t.name}</span><b>{ar(t.questions)}</b></div>)}</section><section className="panel"><h2>أكثر البطولات لعبًا</h2>{data.popular.length ? data.popular.map((t: any) => <div className="stat-row" key={t.name}><span>{t.name}</span><b>{ar(t.rooms)} غرفة</b></div>) : <p className="hint">تظهر هنا بعد إنشاء أول غرفة.</p>}</section></div></>}
            {key === 'questions' && <section className="panel question-management"><div className="admin-actions"><h2>{ar(data.total)} سؤال</h2><Button className="primary" onClick={newQuestion}><Plus /> إضافة سؤال</Button><Button variant="outline" onClick={() => setImporting(true)}><Upload /> استيراد</Button><Button variant="outline" onClick={async () => { try {
                const qs = await api('/admin/export'), blob = new Blob([JSON.stringify(qs, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
                a.href = url;
                a.download = 'huroof-questions.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }
            catch (e: any) {
                setError(e.message);
            } }}><Download /> تصدير</Button></div><form className="question-filters" onSubmit={e => { e.preventDefault(); setFilter(f => ({ ...f, search, page: 1 })); }}><div className="search-field"><Search size={19}/><input aria-label="بحث في الأسئلة" placeholder="ابحث في السؤال أو الإجابة" value={search} onChange={e => setSearch(e.target.value)}/></div><Button variant="outline" type="submit">بحث</Button><Choice value={filter.tournament} onChange={v => setFilter(f => ({ ...f, tournament: v, page: 1 }))} label="البطولة" options={[["all", "كل البطولات"], ...allTournaments.map(t => [t.id, t.name] as [
                    string,
                    string
                ])]}/><Choice value={filter.difficulty} onChange={v => setFilter(f => ({ ...f, difficulty: v, page: 1 }))} label="الصعوبة" options={[["all", "كل المستويات"], ...Object.entries(difficulties)]}/><Choice value={filter.status} onChange={v => setFilter(f => ({ ...f, status: v, page: 1 }))} label="حالة السؤال" options={[["all", "كل الحالات"], ["published", "منشور"], ["hidden", "مخفي"]]}/><Choice value={filter.letter} onChange={v => setFilter(f => ({ ...f, letter: v, page: 1 }))} label="الحرف" options={[["all", "كل الحروف"], ...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('').map(l => [l, l] as [
                    string,
                    string
                ])]}/></form><Table><TableHeader><TableRow><TableHead>الحرف</TableHead><TableHead>السؤال والإجابة</TableHead><TableHead>البطولة</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader><TableBody>{data.items.map((q: any) => <TableRow key={q.id}><TableCell><span className="table-letter">{q.letter}</span></TableCell><TableCell className="question-cell"><strong>{q.text}</strong><span>{q.answer} · {difficulties[q.difficulty as keyof typeof difficulties]}</span></TableCell><TableCell>{q.tournament}</TableCell><TableCell><span className={'status-tag ' + q.status}>{q.status === 'published' ? 'منشور' : 'مخفي'}</span></TableCell><TableCell><div className="row-actions"><Button variant="outline" onClick={() => setQuestion(q)}>تعديل</Button><Button variant="ghost" size="icon" aria-label="حذف السؤال" onClick={() => setDeleting(q.id)}><Trash2 size={17}/></Button></div></TableCell></TableRow>)}</TableBody></Table><div className="pagination"><Button variant="outline" disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}><ChevronRight /> السابق</Button><span>{ar(filter.page)} / {ar(Math.max(1, Math.ceil(data.total / 25)))}</span><Button variant="outline" disabled={filter.page * 25 >= data.total} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>التالي <ChevronLeft /></Button></div></section>}
            {key === 'mini-games' && <section className="panel"><div className="admin-actions"><h2>جولات Mini Games</h2><span className="hint">{ar(data.length)} جولة في 31 لعبة</span></div><Table><TableHeader><TableRow><TableHead>اللعبة</TableHead><TableHead>السؤال والحل</TableHead><TableHead>المستوى</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader><TableBody>{data.map((round:any)=><TableRow key={round.id}><TableCell dir="ltr">{round.game_slug}</TableCell><TableCell className="question-cell"><strong>{round.prompt}</strong><span>{round.solution}</span></TableCell><TableCell>{round.difficulty}</TableCell><TableCell><span className={'status-tag '+round.status}>{round.status==='published'?'منشورة':'مخفية'}</span></TableCell><TableCell><div className="row-actions"><Button variant="outline" onClick={()=>setMiniRound(round)}>تعديل</Button><Button variant="ghost" size="icon" aria-label="حذف الجولة" onClick={async()=>{if(confirm('حذف الجولة نهائيًا؟'))await save('mini-game-round-delete',{id:round.id});}}><Trash2 size={17}/></Button></div></TableCell></TableRow>)}</TableBody></Table></section>}
            {key === 'tournaments' && <section className="panel"><div className="admin-actions"><h2>البطولات</h2><Button className="primary" onClick={() => setCompetition({ name: '', active: true, position: allTournaments.length })}><Plus /> إضافة بطولة</Button></div><div className="admin-tournaments">{data.map((t: any) => <div key={t.id}><Trophy /><div><strong>{t.name}</strong><span>{ar(t.questions)} سؤال · {t.active ? 'ظاهرة' : 'مخفية'} · ترتيب {ar(t.position)}</span></div><Button variant="outline" onClick={() => setCompetition({ ...t, active: Boolean(t.active) })}>تعديل</Button></div>)}</div></section>}
            {key === 'rooms' && <section className="panel"><h2>أحدث الغرف</h2><Table><TableHeader><TableRow><TableHead>الغرفة</TableHead><TableHead>الفرق</TableHead><TableHead>الحالة</TableHead><TableHead>التحكم</TableHead></TableRow></TableHeader><TableBody>{data.map((r: any) => <TableRow key={r.id}><TableCell dir="ltr">{r.id}</TableCell><TableCell>{r.config.teams.map((t: any) => t.name).join(' ضد ')}</TableCell><TableCell>{r.status === 'open' && r.expires_at > Date.now() ? 'مفتوحة' : 'منتهية'}</TableCell><TableCell><Button variant="outline" disabled={r.status !== 'open'} onClick={() => save('close-room', { id: r.id })}>إغلاق الغرفة</Button></TableCell></TableRow>)}</TableBody></Table></section>}
            {key === 'mini-rooms' && <section className="panel"><h2>غرف Mini Games</h2><Table><TableHeader><TableRow><TableHead>الغرفة</TableHead><TableHead>اللعبة</TableHead><TableHead>الفرق والنتيجة</TableHead><TableHead>الحالة</TableHead><TableHead>التحكم</TableHead></TableRow></TableHeader><TableBody>{data.map((r:any)=><TableRow key={r.id}><TableCell dir="ltr">{r.id}</TableCell><TableCell dir="ltr">{r.config.game}</TableCell><TableCell>{r.config.teams.map((t:any)=>t.name).join(' ضد ')} · {r.state.scores?.join('–')}</TableCell><TableCell>{r.status==='open'&&r.expires_at>Date.now()?'مفتوحة':'منتهية'}</TableCell><TableCell><Button variant="outline" disabled={r.status!=='open'} onClick={()=>save('close-mini-room',{id:r.id})}>إغلاق الغرفة</Button></TableCell></TableRow>)}</TableBody></Table></section>}
            {key === 'users' && <section className="panel"><h2>اللاعبون</h2><Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>تاريخ الانضمام</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader><TableBody>{data.map((u: any) => <TableRow key={u.id}><TableCell>{u.name}</TableCell><TableCell>{new Date(u.created_at).toLocaleDateString('ar-SA')}</TableCell><TableCell>{u.blocked ? 'موقوف' : 'نشط'}</TableCell><TableCell><Button variant="outline" onClick={() => save('block-user', { id: u.id, blocked: !u.blocked })}>{u.blocked ? 'إلغاء الإيقاف' : 'إيقاف'}</Button></TableCell></TableRow>)}</TableBody></Table><p className="hint">الإيقاف يخص المعرّف الحالي على الجهاز. لا نجمع هوية شخصية لإثبات ملكية الحساب.</p></section>}
            {key === 'audit' && <section className="panel"><h2>سجل العمليات</h2><Table><TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead>الإجراء</TableHead><TableHead>الهدف</TableHead><TableHead>الوقت</TableHead></TableRow></TableHeader><TableBody>{data.map((a: any) => <TableRow key={a.id}><TableCell>{a.actor}</TableCell><TableCell dir="ltr">{a.action}</TableCell><TableCell dir="ltr">{a.target || '—'}</TableCell><TableCell>{new Date(a.created_at).toLocaleString('ar-SA')}</TableCell></TableRow>)}</TableBody></Table></section>}
            {key === 'settings' && <form className="panel settings-form" onSubmit={e => { e.preventDefault(); void save('settings', { maintenance: data.maintenance === 'true', default_theme: data.default_theme, max_players: Number(data.max_players), support_url: data.support_url || '' }); }}><h2>إعدادات الموقع</h2><label className="switch-row"><span>وضع الصيانة</span><Checkbox checked={data.maintenance === 'true'} onCheckedChange={v => setData({ ...data, maintenance: String(Boolean(v)) })}/></label><label>المظهر الافتراضي<Choice label="المظهر" value={data.default_theme} onChange={v => setData({ ...data, default_theme: v })} options={[["light", "صباحي"], ["dark", "مسائي"]]}/></label><label>الحد الأعلى للاعبين في الغرفة<input type="number" min="2" max="100" value={data.max_players} onChange={e => setData({ ...data, max_players: e.target.value })}/></label><label>رابط الدعم المادي<input type="url" inputMode="url" dir="ltr" autoComplete="url" maxLength={2048} value={data.support_url || ''} onChange={e => setData({ ...data, support_url: e.target.value })} aria-describedby="support-hint"/></label><p className="hint" id="support-hint">ألصق رابط الدفع الذي تملكه ويبدأ بـ https://. يظهر زر الدعم بعد الحفظ، ومسح الرابط يخفيه. الدفع يتم خارج الموقع.</p><Button type="submit" className="primary" disabled={busy}><Save /> حفظ الإعدادات</Button></form>}
            {key === 'admins' && <section className="panel"><div className="admin-actions"><h2>حسابات الإدارة</h2><Button className="primary" onClick={() => setInvite(true)}><Plus /> حساب إدارة جديد</Button></div>{data.map((a: any) => <div className="admin-account-row" key={a.id}><div><strong>{a.username}</strong><span>{a.active ? 'نشط' : 'غير مفعّل'}</span></div><Choice label="صلاحية الحساب" value={a.role} onChange={role => save('admin-role', { id: a.id, role, active: Boolean(a.active) })} options={Object.entries(roleNames)}/><Button variant="outline" disabled={a.id === session.admin?.id} onClick={() => save('admin-role', { id: a.id, role: a.role, active: !a.active })}>{a.active ? 'تعطيل' : 'تفعيل'}</Button></div>)}<p className="hint">كل حساب إدارة يستخدم كلمة مرور وتحققًا بخطوتين.</p></section>}
            </>}</TabsContent>)}</Tabs>
    <Dialog open={Boolean(question)} onOpenChange={v => !v && setQuestion(null)}><DialogContent className="edit-question" dir="rtl"><DialogTitle>{question?.id ? 'تعديل السؤال' : 'سؤال جديد'}</DialogTitle><DialogDescription>الإجابة تبدأ بالحرف المحدد، مع تجاهل «الـ» في الأسماء.</DialogDescription>{question && <form onSubmit={async (e) => { e.preventDefault(); if (await save('question', question))
        setQuestion(null); }}><div className="settings-row"><label>البطولة<Choice label="البطولة" value={question.tournament_id} onChange={v => setQuestion({ ...question, tournament_id: v })} options={allTournaments.map(t => [t.id, t.name])}/></label><label>الحرف<Choice label="الحرف" value={question.letter} onChange={v => setQuestion({ ...question, letter: v })} options={'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('').map(l => [l, l])}/></label></div><label>نص السؤال<textarea rows={3} minLength={12} maxLength={600} value={question.text} onChange={e => setQuestion({ ...question, text: e.target.value })} required/></label><label>الإجابة<input value={question.answer} onChange={e => setQuestion({ ...question, answer: e.target.value })} required maxLength={180}/></label><div className="settings-row"><label>المستوى<Choice label="المستوى" value={question.difficulty} onChange={v => setQuestion({ ...question, difficulty: v })} options={Object.entries(difficulties)}/></label><label>الحالة<Choice label="الحالة" value={question.status} onChange={v => setQuestion({ ...question, status: v })} options={[["published", "منشور"], ["hidden", "مخفي"]]}/></label></div><label>رابط المصدر<input type="url" dir="ltr" value={question.source} onChange={e => setQuestion({ ...question, source: e.target.value })} required/></label><label>توضيح اختياري<textarea value={question.note} maxLength={800} onChange={e => setQuestion({ ...question, note: e.target.value })}/></label>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>حفظ السؤال <Save /></Button></form>}</DialogContent></Dialog>
    <Dialog open={Boolean(miniRound)} onOpenChange={v=>!v&&setMiniRound(null)}><DialogContent className="edit-question" dir="rtl"><DialogTitle>تعديل جولة Mini Games</DialogTitle><DialogDescription>عدّل السؤال والحل والمصدر والحالة. المرئيات المرتبطة بالجولة تبقى محفوظة.</DialogDescription>{miniRound&&<form onSubmit={async e=>{e.preventDefault();if(await save('mini-game-round',miniRound))setMiniRound(null);}}><label>اللعبة<input value={miniRound.game_slug} disabled dir="ltr"/></label><label>السؤال<textarea rows={3} minLength={8} maxLength={240} value={miniRound.prompt} onChange={e=>setMiniRound({...miniRound,prompt:e.target.value})} required/></label><label>الحل<input maxLength={180} value={miniRound.solution} onChange={e=>setMiniRound({...miniRound,solution:e.target.value})} required/></label><label>شرح الكشف<textarea rows={3} maxLength={600} value={miniRound.explanation||''} onChange={e=>setMiniRound({...miniRound,explanation:e.target.value})}/></label><div className="settings-row"><label>المستوى<Choice label="المستوى" value={miniRound.difficulty} onChange={v=>setMiniRound({...miniRound,difficulty:v})} options={[["easy","سهل"],["medium","متوسط"],["hard","صعب"],["mixed","متنوع"]]}/></label><label>الحالة<Choice label="الحالة" value={miniRound.status} onChange={v=>setMiniRound({...miniRound,status:v})} options={[["published","منشورة"],["hidden","مخفية"]]}/></label></div><label>المصدر<input type="url" dir="ltr" value={miniRound.source} onChange={e=>setMiniRound({...miniRound,source:e.target.value})} required/></label>{error&&<Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>حفظ الجولة <Save/></Button></form>}</DialogContent></Dialog>
    <Dialog open={Boolean(competition)} onOpenChange={v => !v && setCompetition(null)}><DialogContent dir="rtl"><DialogTitle>بيانات البطولة</DialogTitle><DialogDescription>إخفاء البطولة يمنع اختيار أسئلتها في الغرف الجديدة.</DialogDescription>{competition && <form onSubmit={async (e) => { e.preventDefault(); if (await save('tournament', competition))
        setCompetition(null); }}><label>اسم البطولة<input required maxLength={24} value={competition.name} onChange={e => setCompetition({ ...competition, name: e.target.value })}/></label><label>الترتيب<input type="number" min="0" max="999" value={competition.position} onChange={e => setCompetition({ ...competition, position: Number(e.target.value) })}/></label><label className="switch-row">ظاهرة للاعبين<Checkbox checked={competition.active} onCheckedChange={v => setCompetition({ ...competition, active: Boolean(v) })}/></label>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>حفظ البطولة</Button></form>}</DialogContent></Dialog>
    <Confirm open={Boolean(deleting)} onOpenChange={v => !v && setDeleting(null)} title="حذف السؤال؟" description="سيُحذف من بنك الأسئلة. السؤال المفتوح داخل مباراة يحتفظ بنسخته حتى انتهاء الجولة." action={() => { void save('question-delete', { id: deleting }); setDeleting(null); }}/>
    <Dialog open={importing} onOpenChange={setImporting}><DialogContent dir="rtl"><DialogTitle>استيراد أسئلة</DialogTitle><DialogDescription>اختر ملف JSON من تصدير الأسئلة، أو ملفًا بنفس الحقول. الحد ٢٠٠٠ سؤال. تُرفض الدفعة كاملة إن احتوت خطأ أو تكرارًا.</DialogDescription><input type="file" accept=".json,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) {
        if (f.size > 1900000) {
            setError('الملف أكبر من ١٫٩ ميجابايت.');
            return;
        }
        setImportText(await f.text());
    } }}/><p className="hint">{importText ? 'الملف جاهز للفحص والحفظ.' : 'لم يتم اختيار ملف.'}</p>{error && <Notice>{error}</Notice>}<Button className="primary" disabled={!importText || busy} onClick={async () => { try {
        const parsed = JSON.parse(importText);
        const result = await save('import', { questions: Array.isArray(parsed) ? parsed : parsed.questions });
        if (result) {
            setImporting(false);
            setImportText('');
            setSuccess(`تم استيراد ${ar(result.count)} سؤال.`);
        }
    }
    catch {
        setError('ملف JSON غير صحيح.');
    } }}>فحص واستيراد</Button></DialogContent></Dialog>
    <Dialog open={invite} onOpenChange={v => { setInvite(v); if (!v) {
        setEnrollment(null);
        setNewAdmin({ username: '', password: '', role: 'questions' });
    } }}><DialogContent dir="rtl"><DialogTitle>حساب إدارة جديد</DialogTitle><DialogDescription>فعّل تطبيق المصادقة قبل منح الحساب إمكانية الدخول.</DialogDescription>{!enrollment ? <form onSubmit={async (e) => { e.preventDefault(); const result = await save('invite', newAdmin); if (result) {
        setEnrollment(result);
        setNewAdmin({ ...newAdmin, password: '' });
    } }}><label>اسم الحساب<input dir="ltr" pattern="[a-zA-Z0-9_.-]{3,32}" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} required/></label><label>كلمة المرور<input dir="ltr" type="password" minLength={14} maxLength={128} autoComplete="new-password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} required/></label><Choice label="الصلاحية" value={newAdmin.role} onChange={v => setNewAdmin({ ...newAdmin, role: v })} options={Object.entries(roleNames)}/>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>إعداد التحقق بخطوتين</Button></form> : <form onSubmit={async (e) => { e.preventDefault(); if (await save('activate', { id: enrollment.id, code: activation })) {
        setEnrollment(null);
        setInvite(false);
        setActivation('');
    } }}><p>أضف حسابًا جديدًا في تطبيق المصادقة باستخدام مفتاح الإعداد التالي. يظهر مرة واحدة.</p><code className="totp-secret" dir="ltr">{enrollment.secret}</code><label>الرمز من تطبيق المصادقة<input dir="ltr" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={activation} onChange={e => setActivation(e.target.value)} required/></label>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>تفعيل الحساب</Button></form>}</DialogContent></Dialog>
    </main>;
}
