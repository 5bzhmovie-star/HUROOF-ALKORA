"use client";
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Goal, Sun, Moon, Volume2, VolumeX, UserRound, ArrowRight, Trophy, Flag, ShieldCheck } from 'lucide-react';
import Home from './Home';
import { Session, Competition, api, ar } from './api';
import { Button, Choice, Link, Loading, Notice, Identity } from './ui';
import { unlockAudio } from './audio';
const loadCreate = () => import('./Create');
const loadRoom = () => import('./Room');
const loadMiniGames = () => import('./MiniGames');
const Create = lazy(loadCreate);
const RoomPage = lazy(loadRoom);
const MiniGamesCatalog = lazy(() => loadMiniGames().then(module => ({ default: module.MiniGamesCatalog })));
const MiniGamePlay = lazy(() => loadMiniGames().then(module => ({ default: module.MiniGamePlay })));
const MiniRoomPage = lazy(() => loadMiniGames().then(module => ({ default: module.MiniRoomPage })));
const Admin = lazy(() => import('./Admin'));
function Profile({ session, onSession, theme, onTheme }: {
    session: Session;
    onSession: (s: Session) => void;
    theme: string;
    onTheme: (v: string) => void;
}) { const [data, setData] = useState<any>(null), [name, setName] = useState(session.user?.name || ''), [error, setError] = useState(''), [saved, setSaved] = useState(false); useEffect(() => { if (session.user)
    api('/profile').then(setData).catch(e => setError(e.message)); }, [session.user]); if (!session.user)
    return <main className="container small-page"><div className="panel"><h1>ملفك في حروف الكورة</h1><Identity session={session} onLogin={s => { setName(s.user?.name || ''); onSession(s); }}/></div></main>; return <main className="container account-page"><div className="page-heading"><span className="eyebrow">أهلًا باللاعب</span><h1>{session.user.name}</h1><p>اسمك ونتائجك وغرفك في مكان واحد.</p></div>{error && <Notice>{error}</Notice>}{!data ? <Loading /> : <><div className="stat-grid two"><div className="panel stat"><Flag /><span>جولات لعبتها</span><strong>{ar(data.stats.games)}</strong></div><div className="panel stat"><Trophy /><span>جولات فزت فيها</span><strong>{ar(data.stats.wins)}</strong></div></div><div className="account-layout"><form className="panel" onSubmit={async (e) => { e.preventDefault(); setError(''); setSaved(false); try {
    await api('/profile', { name, theme });
    onSession({ ...session, user: { ...session.user!, name, theme } });
    setSaved(true);
}
catch (e: any) {
    setError(e.message);
} }}><h2>إعداداتك</h2><label>اسمك الظاهر<input minLength={2} maxLength={24} value={name} onChange={e => setName(e.target.value)} required/></label><label>مظهر الموقع<Choice label="المظهر" value={theme} onChange={onTheme} options={[["light", "صباحي"], ["dark", "مسائي"]]}/></label>{saved && <Notice success>تم حفظ إعداداتك.</Notice>}<Button className="primary wide">حفظ التغييرات</Button><p className="hint">ملفك مرتبط بهذا الجهاز. حذف ملفات الارتباط أو الخروج يفصل هذا الجهاز عن الملف.</p><Button variant="ghost" type="button" onClick={async () => { await api('/logout', {}); onSession(await api('/session')); setData(null); }}>الخروج من هذا الجهاز</Button></form><section className="panel"><h2>غرفك المفتوحة</h2>{data.rooms.length ? data.rooms.map((r: any) => <Link className="my-room" key={r.id} to={`/room/${r.id}/${r.config.mode === 'auto' ? 'display' : 'host'}`}><div><strong>{r.config.teams.map((t: any) => t.name).join(' ضد ')}</strong><span dir="ltr">{r.id}</span></div><ArrowRight size={18}/></Link>) : <p className="hint">ما عندك غرفة مفتوحة. جهّز أول تحدّي!</p>}<Button asChild variant="outline"><Link to="/create">إنشاء غرفة</Link></Button></section></div></>}</main>; }
function InfoPage({ privacy = false }: {
    privacy?: boolean;
}) { return <main className="container prose-page"><Link className="back-link" to="/"><ArrowRight size={18}/> الرئيسية</Link><h1>{privacy ? 'خصوصيتك في الملعب' : 'كيف تلعب حروف الكورة؟'}</h1>{privacy ? <><h2>بيانات أقل</h2><p>نحفظ اسمك المستعار ومعرّفًا عشوائيًا، وثيمك، والغرف التي أنشأتها أو شاركت فيها ونتائجك. لا نطلب بريدًا إلكترونيًا أو رقم جوال أو كلمة مرور للاعبين.</p><h2>الجلسة وملفات الارتباط</h2><p>تستخدم اللعبة ملف ارتباط ضروريًا لإثبات جلستك والعودة إليها. اختيار المظهر والصوت يُحفظ على جهازك. لوحة الإدارة مرتبطة بحساب مالك الموقع في هذه الاستضافة. لا توجد أدوات إعلانات أو تتبع تسويقي داخل التطبيق.</p><h2>الدعم المادي</h2><p>إذا اخترت دعم الموقع، يفتح لك رابط دفع خارجي يحدده مالك الموقع. لا نجمع داخل حروف الكورة بيانات بطاقتك أو تفاصيل الدفع.</p><h2>مدة الاحتفاظ</h2><p>تُحذف غرفة حروف الكورة أو Mini Games عندما تبقى بلا نشاط لمدة ١٠ دقائق. تنتهي جلسة اللاعب بعد ٣٠ يومًا، وتُحذف أحداث الغرف بعد ٣٠ يومًا وسجلات الإدارة بعد ٩٠ يومًا.</p><h2>الصور والصوت</h2><p>تعرض Mini Games صورًا وشعارات وأعلامًا من مصادرها المبينة بعد كشف الحل. الوصف الصوتي يُنشأ على جهازك من نص عربي أصلي ولا يسجل صوتك أو يطلب الميكروفون.</p><h2>طلب حذف بياناتك</h2><p>تواصل مع مشغّل الموقع: يزن عبدالعزيز — Discord: k6a.</p></> : <><h2>الفكرة</h2><p>فريقان يتنافسان على لوحة حروف سداسية. الفريق الأول يربط أعلى اللوحة بأسفلها، والثاني يربط يمينها بيسارها.</p><h2>قبل الصافرة</h2><p>أنشئ غرفة، وسمّ الفريقين، وافتح شاشة العرض على التلفزيون أو شاشة ثانية، ثم شارك رابط الجرس أو QR. تبقى الغرفة ما دامت مستخدمة وتحذف بعد ١٠ دقائق من الخمول.</p><h2>Mini Games</h2><p>اختر لعبة، وحدد عدد الجولات، ثم شارك رابط الجرس. تظهر المرئيات أولًا، ويكشف المقدم الحل ومصدره بعد الإجابة. لعبة التعليق توفر وصفًا صوتيًا يمكن تشغيله مرتين فقط.</p><h2>السؤال والجرس</h2><p>أول ضغطة تصل إلى الخادم تُحجز لصاحبها، ويظهر اسمه وفريقه فورًا على شاشة العرض.</p><h2>الإجابة والفوز</h2><p>المقدم يكشف الإجابة ويحتسب النقطة. عند تساوي النتيجة بعد الجولات المحددة تُنشأ جولة فاصلة.</p><h2>الصوت والاتصال</h2><p>فعّل الصوت لسماع الجرس والفوز. عند انقطاع الشبكة تحاول الصفحة العودة تلقائيًا، وحالة المباراة محفوظة على الخادم.</p></>}</main>; }
export default function GameApp() {
    const [path, setPath] = useState('/'), [session, setSession] = useState<Session | null>(null), [tournaments, setTournaments] = useState<Competition[]>([]), [error, setError] = useState(''), [theme, setTheme] = useState('dark'), [sound, setSound] = useState(false);
    const setMode = (value: string) => { setTheme(value); localStorage.setItem('hk-theme', value); };
    async function load() { setError(''); try {
        const s = await api<Session>('/session');
        setSession(s);
        const pref = localStorage.getItem('hk-theme');
        setTheme(pref === 'light' || pref === 'dark' ? pref : s.user?.theme === 'light' ? 'light' : s.defaultTheme === 'light' ? 'light' : 'dark');
        if (!s.maintenance || s.admin)
            void api<Competition[]>('/tournaments').then(setTournaments).catch(e => setError(e.message));
    }
    catch (e: any) {
        setError(e.message);
    } }
    useEffect(() => { setPath(location.pathname); const onPop = () => setPath(location.pathname); window.addEventListener('popstate', onPop); setSound(localStorage.getItem('hk-sound') === 'on'); void load(); if ('serviceWorker' in navigator)
        navigator.serviceWorker.register('/sw.js').catch(() => { }); return () => window.removeEventListener('popstate', onPop); }, []);
    useEffect(() => { const warm = () => { void loadCreate(); void loadRoom(); void loadMiniGames(); }; if ('requestIdleCallback' in window) { const idle = window.requestIdleCallback(warm, { timeout: 1200 }); return () => window.cancelIdleCallback(idle); } const timer = window.setTimeout(warm, 500); return () => window.clearTimeout(timer); }, []);
    useEffect(() => { const dark = theme !== 'light'; document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; }, [theme]);
    const match = path.match(/^\/room\/([A-Za-z0-9_-]{12})\/(host|display|buzzer)$/), miniRoom=path.match(/^\/mini-room\/([A-Za-z0-9_-]{12})\/(host|display|buzzer)$/),miniMatch=path.match(/^\/mini-games\/([a-z0-9-]+)$/), isDisplay = match?.[2] === 'display'||miniRoom?.[2]==='display', isBuzzer = match?.[2] === 'buzzer'||miniRoom?.[2]==='buzzer';
    let content;
    if (!session)
        content = error ? <main className="container small-page"><Notice>{error}</Notice><Button onClick={load}>إعادة المحاولة</Button></main> : <Loading />;
    else if (session.maintenance && !session.admin && path !== '/admin')
        content = <main className="container small-page"><div className="panel center"><Goal size={45}/><h1>استراحة بين الشوطين</h1><p>الموقع تحت الصيانة. نرجع لكم قريب.</p><Button variant="outline" onClick={load}>إعادة المحاولة</Button></div></main>;
    else if (match)
        content = <Suspense fallback={<Loading />}><RoomPage key={path} id={match[1]} role={match[2] as any} session={session} onSession={setSession}/></Suspense>;
    else if(miniRoom)
        content=<Suspense fallback={<Loading/>}><MiniRoomPage key={path} id={miniRoom[1]} role={miniRoom[2] as any} session={session} onSession={setSession}/></Suspense>;
    else if (path === '/')
        content = <Home tournaments={tournaments} supportUrl={session.supportUrl}/>;
    else if(path==='/mini-games')
        content=<Suspense fallback={<Loading/>}><MiniGamesCatalog/></Suspense>;
    else if(miniMatch)
        content=<Suspense fallback={<Loading/>}><MiniGamePlay slug={miniMatch[1]} session={session} onSession={setSession}/></Suspense>;
    else if (path === '/create')
        content = <Suspense fallback={<Loading />}><Create key={tournaments.length} session={session} onSession={setSession} tournaments={tournaments}/></Suspense>;
    else if (path === '/account')
        content = <Profile session={session} onSession={setSession} theme={theme} onTheme={setMode}/>;
    else if (path === '/admin')
        content = <Suspense fallback={<Loading />}><Admin session={session} onSession={setSession} tournaments={tournaments}/></Suspense>;
    else if (path === '/rules' || path === '/privacy')
        content = <InfoPage privacy={path === '/privacy'}/>;
    else
        content = <main className="container small-page"><div className="panel center"><span className="error-number">٤٠٤</span><h1>الرابط طلع تسلل</h1><p>ما لقينا هذه الصفحة. ارجع للملعب وابدأ من جديد.</p><Button asChild className="primary"><Link to="/">العودة للرئيسية</Link></Button></div></main>;
    return <div className={'app ' + (isDisplay ? 'display-app' : '')} dir="rtl"><a href="#main-content" className="skip-link">تجاوز إلى المحتوى</a><header className={'site-header ' + (isBuzzer ? 'small-header' : '')}><div className="container header-inner"><Link to="/" className="wordmark" aria-label="حروف الكورة — الرئيسية"><span className="brand-mark"><Goal /></span><span>حروف<span>الكورة</span></span></Link>{!isDisplay && !isBuzzer && <nav aria-label="التنقل الرئيسي"><Link to="/" className={path === '/' ? 'current' : ''}>الرئيسية</Link><Link to="/mini-games" className={path.startsWith('/mini-games') ? 'current' : ''}>Mini Games</Link><Link to="/rules" className={path === '/rules' ? 'current' : ''}>طريقة اللعب</Link></nav>}<div className="header-controls"><div className="theme-control"><Choice label="مظهر الموقع" value={theme} onChange={setMode} options={[["light", "صباحي"], ["dark", "مسائي"]]}/>{theme === 'dark' ? <Moon size={17}/> : theme === 'light' ? <Sun size={17}/> : null}</div><Button variant="ghost" size="icon" aria-label={sound ? 'كتم الصوت' : 'تفعيل الصوت'} aria-pressed={sound} onClick={() => { setSound(!sound); localStorage.setItem('hk-sound', !sound ? 'on' : 'off'); if (!sound)
        unlockAudio(); }}>{sound ? <Volume2 /> : <VolumeX />}</Button>{!isDisplay && !isBuzzer && <Button variant="outline" asChild className="account-button"><Link to="/account"><UserRound />{session?.user?.name || 'حسابي'}</Link></Button>}</div></div></header><div id="main-content" tabIndex={-1}>{content}</div>{!isDisplay && !isBuzzer && <footer className="site-footer container"><span>حروف الكورة <span className="footer-dot">•</span> يزن عبدالعزيز — Discord: <b dir="ltr">k6a</b></span><div>{session?.supportUrl && <a href={session.supportUrl} target="_blank" rel="noopener noreferrer">دعم الموقع</a>}<Link to="/privacy">الخصوصية</Link><Link to="/admin">الإدارة</Link></div></footer>}</div>;
}
