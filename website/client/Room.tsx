"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Bell, LockKeyhole, Wifi, WifiOff, Users, Copy, Check, Maximize, MonitorPlay, Link as LinkIcon, RotateCcw, Undo2, Eye, EyeOff, RefreshCw, Trophy, ArrowRight, Volume2, Settings2, UserRoundX, LoaderCircle, Clock3 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { inviteOrigin, api, Room as RoomData, Session, ar, difficulties, navigate } from './api';
import { Board } from './Board';
import { VisualQuestion } from './VisualQuestion';
import { LiveSeconds } from './LiveSeconds';
import { Button, Link, Notice, Loading, Identity, Confirm, Choice } from './ui';
import { playSound } from './audio';
import { qrDataUrl } from './qr';
type Role = 'host' | 'display' | 'buzzer';
// A 150ms live cadence remains imperceptible in play while avoiding overlapping
// requests that made every client slower when a room had several players.
const ACTIVE_POLL_MS = 300;
const IDLE_POLL_MS = 900;
const sourceName = (source?: string) => {
    if (!source)
        return '';
    try {
        const host = new URL(source).hostname.replace(/^www\./, '');
        return host === 'the-afc.com' ? 'الاتحاد الآسيوي' : host === 'spa.gov.sa' ? 'وكالة الأنباء السعودية' : host === 'raw.githubusercontent.com' ? 'سجل البيانات' : 'المرجع التاريخي';
    }
    catch {
        return 'المصدر';
    }
};
export default function RoomPage({ id, role, session, onSession }: {
    id: string;
    role: Role;
    session: Session;
    onSession: (s: Session) => void;
}) {
    const [room, setRoom] = useState<RoomData | null>(null), [entered, setEntered] = useState(false), [connection, setConnection] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [fatal, setFatal] = useState(''), [busy, setBusy] = useState(false), [team, setTeam] = useState('1'), [share, setShare] = useState(false), [copied, setCopied] = useState(''), [showCode, setShowCode] = useState(false), [restart, setRestart] = useState(false), [kick, setKick] = useState<string | null>(null), [correction, setCorrection] = useState(false), [correctionCell, setCorrectionCell] = useState('0'), [correctionTeam, setCorrectionTeam] = useState('0'), offset = useRef(0), last = useRef<RoomData | null>(null);
    // Ignore acknowledgement-only and stale polling payloads: never render a partial room.
    const accept = (incoming: RoomData) => {
        if (!incoming || !incoming.config || !Array.isArray(incoming.board) || typeof incoming.version !== 'number') return;
        const data: RoomData = { ...incoming, buzz: {
            open: false, winner: null, deadline: null, key: '',
            ...(incoming.buzz || {}), winner: incoming.buzz?.winner ?? null
        } };
        if (last.current && data.version < last.current.version)
        return; if (last.current && data.buzz.winner && data.buzz.key !== last.current.buzz.key)
        playSound('buzz');
    else if (last.current && data.buzz.winner && !last.current.buzz.winner)
        playSound('buzz'); if (data.winner && !last.current?.winner)
        playSound('win'); offset.current = data.serverTime - Date.now(); last.current = data; setRoom(data); };
    useEffect(() => { let live = true; setLoading(true); setFatal(''); (async () => { try {
        const r = await api<RoomData>(`/rooms/${id}?view=${role}`);
        if (live) {
            if (role === 'host' && r.config.mode === 'auto') { navigate(`/room/${id}/display`); return; }
            accept(r);
            setEntered(true);
            setConnection(true);
        }
    }
    catch (e: any) {
        if (role === 'buzzer' && [401, 403].includes(e.status)) {
            try {
                const r = await api<RoomData>(`/rooms/${id}?view=display`);
                if (live) {
                    accept(r);
                    setEntered(false);
                }
            }
            catch (x: any) {
                if (live)
                    setFatal(x.message);
            }
        }
        else if (live)
            setFatal(e.message);
    }
    finally {
        if (live)
            setLoading(false);
    } })(); return () => { live = false; }; }, [id, role, session.user?.id]);
    useEffect(() => {
        if (!entered) return;
        let live = true, pending = false, streaming = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let stream: EventSource | null = null;
        const schedule = (delay: number) => {
            if (timer) clearTimeout(timer);
            if (live) timer = setTimeout(poll, delay);
        };
        const poll = async () => {
            if (!live || pending) return;
            if (document.hidden || streaming) { schedule(1500); return; }
            pending = true;
            let failed = false;
            try {
                const data = await api<RoomData & { unchanged?: boolean }>(`/rooms/${id}?view=${role}&since=${last.current?.version ?? 0}`);
                if (live) {
                    if (!data.unchanged) accept(data);
                    else offset.current = data.serverTime - Date.now();
                    setConnection(true);
                }
            } catch (e: any) {
                failed = true;
                if (live) {
                    setConnection(false);
                    if ([401, 403, 410].includes(e.status)) setFatal(e.message);
                }
            } finally {
                pending = false;
                const state = last.current;
                schedule(failed ? 1200 : (state?.question || state?.buzz.open || state?.buzz.winner ? ACTIVE_POLL_MS : IDLE_POLL_MS));
            }
        };
        // The self-hosted Node server pushes updates immediately. ChatGPT Sites
        // uses D1 and does not provide a persistent stream; it retains polling.
        if (typeof EventSource !== 'undefined' && !location.hostname.endsWith('.chatgpt.site')) {
            stream = new EventSource(`/api/rooms/${id}/events?view=${role}`);
            stream.addEventListener('state', event => {
                if (!live) return;
                try {
                    const data = JSON.parse((event as MessageEvent).data) as RoomData;
                    streaming = true;
                    accept(data);
                    setConnection(true);
                } catch { /* ignore malformed event; fallback polling remains available */ }
            });
            stream.addEventListener('closed', () => {
                streaming = false;
                stream?.close(); stream = null;
                if (live) { setConnection(false); schedule(0); }
            });
            stream.onerror = () => {
                streaming = false;
                stream?.close(); stream = null;
                if (live) { setConnection(false); schedule(0); }
            };
            schedule(1200); // Initial fallback if the stream cannot connect.
        } else schedule(0);
        const wake = () => { if (!document.hidden && !streaming) schedule(0); };
        document.addEventListener('visibilitychange', wake);
        window.addEventListener('focus', wake);
        return () => {
            live = false;
            if (timer) clearTimeout(timer);
            stream?.close();
            document.removeEventListener('visibilitychange', wake);
            window.removeEventListener('focus', wake);
        };
    }, [entered, id, role]);
    async function action(name: string, extra: any = {}) { if (!room || busy)
        return; setBusy(true); setError(''); try {
        accept(await api(`/rooms/${id}/action`, { action: name, version: room.version, ...extra }));
    }
    catch (e: any) {
        setError(e.message);
        if (e.status === 409)
            try {
                accept(await api(`/rooms/${id}?view=${role}`));
            }
            catch { }
    }
    finally {
        setBusy(false);
    } }
    async function copy(path: string) { try {
        await navigator.clipboard.writeText(inviteOrigin() + path);
        setCopied(path);
        setTimeout(() => setCopied(''), 1800);
    }
    catch {
        setError('تعذر النسخ. اضغط الرابط مطولًا وانسخه.');
    } }
    async function ring() { if (!room || busy || !connection)
        return; setBusy(true); setError(''); try {
        accept(await api(`/rooms/${id}/buzz`, { key: room.buzz.key, questionKey: room.questionKey }));
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    if (loading)
        return <Loading />;
    if (fatal || !room)
        return <main className="container small-page"><div className="panel center"><LockKeyhole size={40}/><h1>ما قدرنا ندخل الغرفة</h1><p>{fatal || 'تأكد من الرابط وحاول مرة أخرى.'}</p><Button asChild><Link to="/">العودة للرئيسية</Link></Button></div></main>;
    const teams = room.config.teams;
    const clock = <LiveSeconds deadline={room.buzz.deadline} fallback={room.config.seconds} offsetMs={offset.current} />;
    const teamStyle = { '--team-one': teams[0].color, '--team-two': teams[1].color } as React.CSSProperties;
    if (role === 'buzzer' && !entered)
        return <main className="container join-page"><div className="join-header"><span className="eyebrow">جمهورك ينتظرك</span><h1>{teams[0].name} <span>ضد</span> {teams[1].name}</h1><p>انضم لفريقك، وخلك الأسرع على الجرس.</p></div><div className="panel join-panel">{!session.user ? <Identity session={session} onLogin={onSession}/> : <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
            accept(await api(`/rooms/${id}/join`, { team: Number(team) }));
            setEntered(true);
        }
        catch (e: any) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        } }}><p>حيّاك، <strong>{session.user.name}</strong></p><h2>مع أي فريق؟</h2><RadioGroup value={team} onValueChange={setTeam} dir="rtl" className="join-team-options">{teams.map((t, i) => <label key={i} style={{ borderColor: team === String(i + 1) ? t.color : undefined }}><RadioGroupItem value={String(i + 1)}/><span className="color-dot" style={{ background: t.color }}/>{t.name}</label>)}</RadioGroup>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy}>ادخل الجرس <Bell /></Button></form>}</div></main>;
    const connectionLabel = <span className={'connection ' + (connection ? 'connected' : '')} role="status">{connection ? <Wifi size={16}/> : <WifiOff size={16}/>} {connection ? 'متصل بالمباراة' : 'جارٍ إعادة الاتصال…'}</span>;
    const controller = role === 'host' || (role === 'display' && Boolean(room.canControl));
    const wins = [1, 2].map(team => (room.results || []).filter(result => result.winner === team).length);
    const seriesScore = <div className="series-score" aria-label="نتيجة الجولات"><span>{teams[0].name} <b>{ar(wins[0])}</b></span><span>الجولة {ar(room.round)}{room.round > (room.config.rounds || 2) ? ' · فاصلة' : ` / ${ar(room.config.rounds || 2)}`}</span><span><b>{ar(wins[1])}</b> {teams[1].name}</span></div>;
    const winner = room.winner ? <section className="winner-panel" style={{ '--winner-color': teams[room.winner - 1].color } as React.CSSProperties}><Trophy size={64}/><span className="eyebrow">{room.matchWinner ? 'فاز بالمباراة' : `فاز بالجولة ${ar(room.round)}`}</span><h1>{teams[room.winner - 1].name}</h1><p>{room.matchWinner ? `نتيجة الجولات: ${ar(wins[room.winner - 1])} – ${ar(wins[2 - room.winner])}` : room.round >= (room.config.rounds || 2) ? 'تعادلتم في الجولات؛ الجولة القادمة تحسم المباراة.' : 'الجولة التالية تنتظركم.'}</p>{controller && (room.matchWinner ? <Button className="primary" onClick={() => setRestart(true)}>مباراة جديدة <RotateCcw /></Button> : <Button className="primary" onClick={() => action('restart')}>الجولة التالية <ArrowRight /></Button>)}</section> : null;
    if (role === 'buzzer')
        return <main className="buzzer-page" style={teamStyle}><div className="buzzer-heading"><span className="eyebrow">جاهز للتحدّي؟</span><h1>{room.me?.name || session.user?.name}</h1><span className="buzzer-team" style={{ background: teams[(room.me?.team || 1) - 1].color }}>{teams[(room.me?.team || 1) - 1].name}</span>{connectionLabel}</div>{seriesScore}{winner || <><div className="buzz-status" aria-live="polite">{room.buzz.winner ? <><strong>{room.buzz.winner.id === session.user?.id ? 'الجرس لك!' : `سبقك ${room.buzz.winner.name}`}</strong><span>وقت الإجابة {clock}</span></> : room.buzz.open ? <><strong>الجرس مفتوح</strong><span>تعرف الإجابة؟ اضغط!</span></> : <><strong>انتظر فتح الجرس</strong><span>{room.revealed ? 'السؤال انتهى، استعد للتالي.' : 'خلّ عينك على شاشة العرض.'}</span></>}</div><button className={'big-buzzer ' + (room.buzz.open && connection ? 'ready' : 'locked')} aria-label="ضغط الجرس" disabled={!room.buzz.open || !connection || busy} onClick={ring}>{room.buzz.open ? <Bell /> : <LockKeyhole />}<span>{busy ? 'لحظة…' : room.buzz.open ? 'اضغط' : 'مغلق'}</span></button><p className="hint">أول ضغطة تصل تُحجز لصاحبها.</p></>}{error && <Notice>{error}</Notice>}<Link className="back-link" to="/account">حسابي</Link></main>;
    const question = room.question && <section className={'question-panel ' + (role === 'display' ? 'display-question' : '')} aria-live="polite"><div className="question-meta"><span>{room.question.tournament}</span><span>{difficulties[room.question.difficulty as keyof typeof difficulties]}</span></div><div className="question-letter">{room.question.letter}</div><h2>{room.question.text}</h2>{room.question.visual && <VisualQuestion
 data={room.question.visual as any} revealed={room.revealed} canControl={Boolean(controller)}
 mode={room.visualReveal?.mode as any}
 onAction={(actionName,details)=>void action(actionName,details)}
/>}{room.buzz.winner && <div className="buzz-winner" style={{ borderColor: teams[room.buzz.winner.team - 1].color }}><Bell size={22}/><span>{room.buzz.winner.name}<small>له أولوية الإجابة</small></span>{clock}</div>}{room.question.answer && (controller || room.revealed) && <div className={'answer ' + (room.revealed ? 'revealed' : '')}><span>{room.revealed ? 'الإجابة' : 'الإجابة عندك فقط'}</span><strong>{room.question.answer}</strong>{room.question.note && <p>{room.question.note}</p>}{room.question.source && <a href={room.question.source} target="_blank" rel="noreferrer">المصدر الموثق: {sourceName(room.question.source)} ↗</a>}</div>}{controller && <div className="question-actions">{!room.revealed ? <><Button onClick={() => action('reveal')} disabled={busy} className="primary wide"><Eye /> إظهار الإجابة للجميع</Button><Button onClick={() => action('change')} disabled={busy} variant="outline"><RefreshCw /> تغيير السؤال</Button><Button onClick={() => action(room.buzz.open ? 'buzz-close' : 'buzz-open')} disabled={busy} variant="outline"><Bell /> {room.buzz.open ? 'إغلاق الجرس' : 'فتح الجرس'}</Button></> : <><p>من جاوب صح؟</p><div className="award-buttons">{teams.map((t, i) => <Button key={i} style={{ background: t.color, color: '#fff' }} disabled={busy} onClick={() => action('award', { team: i + 1 })}>{t.name}</Button>)}</div><Button variant="ghost" disabled={busy} onClick={() => action('award', { team: 0 })}>لا أحد — السؤال التالي</Button></>}</div>}</section>;
    return <main className={'match-page ' + (role === 'display' ? 'tv-page' : 'container')} style={teamStyle}><div className="match-toolbar"><div><span className="eyebrow">{role === 'display' ? 'شاشة المباراة' : room.config.mode === 'human' ? 'لوحة المقدم' : 'العبوا مع بعض'}</span><div className="room-label">الغرفة <b dir="ltr">{showCode ? id : '••••••••••••'}</b><Button size="icon" variant="ghost" aria-label={showCode ? 'إخفاء رمز الغرفة' : 'إظهار رمز الغرفة'} aria-pressed={showCode} title={showCode ? 'إخفاء الرمز' : 'إظهار الرمز'} onClick={() => setShowCode(v => !v)}>{showCode ? <EyeOff size={18}/> : <Eye size={18}/>}</Button>{controller && <Button variant="outline" onClick={() => setShare(true)}><Users /> رابط الجرس وQR</Button>}<span>· الجولة {ar(room.round)}{room.round > (room.config.rounds || 2) ? ' الفاصلة' : ` من ${ar(room.config.rounds || 2)}`}</span></div></div><div className="toolbar-actions">{connectionLabel}<Button variant="outline" size="icon" title="ملء الشاشة" aria-label="ملء الشاشة" onClick={() => { if (document.fullscreenElement)
        void document.exitFullscreen();
    else
        void document.documentElement.requestFullscreen?.(); }}><Maximize /></Button></div></div><div className="scoreboard">{teams.map((t, i) => <div key={i} className="score-team"><span className="score-emblem" style={{ background: t.color }}>{i === 0 ? '●' : '◆'}</span><div><strong>{t.name}</strong><small>{i === 0 ? 'من أعلى لأسفل' : 'من اليمين لليسار'}</small></div><b>{ar(room.board.filter(c => c.owner === i + 1).length)}</b></div>)}<span className="score-vs">ضد</span></div>{seriesScore}{error && <Notice>{error}</Notice>}{role === 'host' ? <div className="match-layout"><section className="board-panel panel"><div className="board-top"><h2>{room.winner ? 'مسار الفوز' : room.question ? 'الحرف في اللعب' : 'اختر حرف التحدّي'}</h2><span>{ar(room.config.size)} × {ar(room.config.size)}</span></div>{winner || <Board cells={room.board} size={room.config.size} teams={teams} selected={room.cell} path={room.path} onSelect={cell => action('select', { cell })} disabled={busy || Boolean(room.question) || !connection}/>}<div className="board-tools"><Button variant="ghost" disabled={!room.canUndo || busy} onClick={() => action('undo')}><Undo2 /> تراجع</Button><Button variant="ghost" disabled={Boolean(room.question) || busy} onClick={() => setCorrection(true)}><Settings2 /> تعديل خلية</Button><Button variant="ghost" onClick={() => setRestart(true)}><RotateCcw /> مباراة جديدة</Button></div></section><aside className="host-console panel">{question || <div className="await-question"><span className="empty-letter">؟</span><h2>{room.matchWinner ? 'انتهت المباراة' : room.winner ? 'انتهت الجولة' : 'اختر حرفًا لبدء الجولة'}</h2><p>{room.matchWinner ? 'الفائز بالمباراة ظاهر على اللوحة.' : room.winner ? 'النتيجة ظاهرة أعلى اللوحة. ابدأ الجولة التالية.' : 'اختر خلية من اللوحة ليظهر السؤال عند الجميع.'}</p><div className="share-shortcuts"><a target="_blank" rel="noreferrer" href={room.links?.display}><MonitorPlay /> افتح شاشة العرض</a><button onClick={() => setShare(true)}><LinkIcon /> رابط الجرس والـ QR</button></div></div>}</aside><section className="panel player-panel"><div className="section-title"><h2><Users size={20}/> اللاعبين <span className="muted">{ar(room.playersCount)}</span></h2><Button variant="ghost" onClick={() => setShare(true)}>دعوة</Button></div>{room.players?.length ? <div className="players">{room.players.map(p => <div key={p.id}><span className={'presence ' + (p.online ? 'online' : '')}/><span>{p.name}<small style={{ color: teams[p.team - 1].color }}>{teams[p.team - 1].name}</small></span><Button size="icon" variant="ghost" onClick={() => setKick(p.id)} aria-label={'إزالة ' + p.name}><UserRoundX size={17}/></Button></div>)}</div> : <p className="hint">شارك رابط الجرس، وبتشوف أسماء اللاعبين هنا.</p>}</section><section className="panel events-panel"><h2><Clock3 size={19}/> أحداث المباراة</h2><ol>{room.events?.slice(0, 8).map(e => <li key={e.id}><span>{e.message}</span><time>{new Date(e.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol></section></div> : <div className="display-surface">{winner || question || <Board cells={room.board} size={room.config.size} teams={teams} path={room.path} onSelect={room.canControl ? cell => action('select', { cell }) : undefined} disabled={busy || !connection}/>} {room.canControl && !room.question && !room.winner && <div className="board-tools display-controls"><Button variant="outline" disabled={!room.canUndo || busy} onClick={() => action('undo')}><Undo2 /> تراجع</Button><Button variant="outline" disabled={busy} onClick={() => setCorrection(true)}><Settings2 /> تعديل خلية</Button><Button variant="outline" disabled={busy} onClick={() => setRestart(true)}><RotateCcw /> مباراة جديدة</Button></div>}<p className="display-bottom">{room.buzz.open ? 'الجرس مفتوح.. من يعرف الإجابة؟' : 'حروف الكورة · يزن عبدالعزيز'}</p></div>}
    <Dialog open={share} onOpenChange={setShare}><DialogContent className="share-dialog" dir="rtl">
        <DialogTitle>اجمع فريقك</DialogTitle><DialogDescription>صوّر رمز QR للانضمام إلى الجرس، أو انسخ الرابط وشاركه مع اللاعبين.</DialogDescription>
        <div className="share-content"><div className="share-qr"><img className="qr-image" src={qrDataUrl(`${typeof location !== 'undefined' ? inviteOrigin() : ''}/room/${id}/buzzer`)} alt="رمز QR للانضمام إلى جرس المباراة" width="220" height="220"/><span>رمز الجرس</span></div>
        <div className="share-details">{[['رابط الجرس', `/room/${id}/buzzer`], ['شاشة العرض', `/room/${id}/display`]].map(([label, path]) => <div className="share-link" key={path}><label>{label}</label><div><a href={path} target="_blank" rel="noreferrer" dir="ltr">{typeof location !== 'undefined' ? inviteOrigin() : ''}{path}</a><Button size="icon" variant="outline" aria-label={'نسخ ' + label} onClick={() => copy(path)}>{copied === path ? <Check /> : <Copy />}</Button></div></div>)}<p className="hint">رمز الغرفة مخفي على اللوحة. رابط الجرس لا يعطي اللاعبين صلاحية التحكم.</p></div></div>
    </DialogContent></Dialog>
    <Confirm open={restart} onOpenChange={setRestart} title="نبدأ مباراة جديدة؟" description="نبدأ الجولات من الأولى ونصفّر نتيجة هذه الغرفة. نتائج الجولات المكتملة تبقى في السجل." action={() => action('new-match')}/><Confirm open={Boolean(kick)} onOpenChange={v => !v && setKick(null)} title="إزالة اللاعب من الغرفة؟" description="لن يستطيع هذا اللاعب العودة بنفس جلسته." action={() => { void action('kick', { userId: kick }); setKick(null); }}/>
    <Dialog open={correction} onOpenChange={setCorrection}><DialogContent dir="rtl"><DialogTitle>تعديل نتيجة خلية</DialogTitle><DialogDescription>اختر الخلية ثم حدّد الفريق الذي يستحقها.</DialogDescription><Choice label="الخلية" value={correctionCell} onChange={setCorrectionCell} options={room.board.map(c => [String(c.index), `${c.letter} — الصف ${ar(Math.floor(c.index / room.config.size) + 1)}، العمود ${ar(c.index % room.config.size + 1)}`])}/><Choice label="الفريق" value={correctionTeam} onChange={setCorrectionTeam} options={[["0", "خلية بدون مالك"], ["1", teams[0].name], ["2", teams[1].name]]}/><Button className="primary" onClick={() => { void action('correct', { cell: Number(correctionCell), team: Number(correctionTeam) }); setCorrection(false); }}>حفظ التعديل</Button></DialogContent></Dialog></main>;
}
