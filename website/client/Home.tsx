"use client";
import React, { useState } from 'react';
import { ArrowLeft, Users, Radio, Goal, Trophy, ChevronLeft, HeartHandshake, ExternalLink, Dices, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link, Button, Notice } from './ui';
import { Board, sampleBoard, sampleTeams } from './Board';
import { Competition, api, ar, navigate } from './api';

export default function Home({ tournaments, supportUrl }: { tournaments: Competition[]; supportUrl?: string | null }) {
  const [join,setJoin]=useState(false),[code,setCode]=useState(''),[error,setError]=useState(''),[joining,setJoining]=useState(false);
  const enter=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    const value=code.trim(),miniLink=value.match(/\/mini-room\/([A-Za-z0-9_-]{12})(?:\/|$)/),normalLink=value.match(/\/room\/([A-Za-z0-9_-]{12})(?:\/|$)/),raw=value.match(/^([A-Za-z0-9_-]{12})$/),id=miniLink?.[1]||normalLink?.[1]||raw?.[1];
    if(!id){setError('تأكد من رمز الغرفة: ١٢ حرفًا ورقمًا.');return;}
    if(miniLink){setJoin(false);navigate(`/mini-room/${id}/buzzer`);return;}
    if(normalLink){setJoin(false);navigate(`/room/${id}/buzzer`);return;}
    setJoining(true);
    try{await api(`/mini-rooms/${id}?view=display`);setJoin(false);navigate(`/mini-room/${id}/buzzer`);}
    catch{try{await api(`/rooms/${id}?view=display`);setJoin(false);navigate(`/room/${id}/buzzer`);}catch(e:any){setError(e.message||'الغرفة غير موجودة أو انتهت.');}}
    finally{setJoining(false);}
  };
  const isDesktopLocal = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1';
  return <main className="home">{isDesktopLocal && <div className="desktop-local-note container" role="status"><b>الوضع المحلي السريع</b><span>المباراة تعمل على جهازك. للعب مع الأصدقاء من جوالاتهم، استخدم زر «أونلاين» أعلى نافذة التطبيق؛ رمز الغرفة المحلية لا يعمل خارج الجهاز.</span></div>}
    <section className="hero container">
      <div className="hero-copy"><span className="eyebrow"><span className="tiny-ball"><Goal size={17}/></span> جمعتكم لها لعبة</span><h1>جاوب. وصّل.<br/><span>واكسب التحدّي.</span></h1><p>حروف وأسئلة كروية ومنافسة بين فريقين.<br/>وصّل جهتك قبلهم، والملعب لك.</p><div className="hero-actions"><Button asChild className="primary"><Link to="/create">إنشاء غرفة لعب <ArrowLeft/></Link></Button><Button variant="outline" onClick={()=>setJoin(true)}>عندي رمز غرفة</Button></div><div className="hero-meta"><Users size={17}/><span>فريقان</span><span className="meta-sep"/><Radio size={17}/><span>العبوا من أجهزتكم</span></div>{supportUrl&&<a className="support-callout" href={supportUrl} target="_blank" rel="noopener noreferrer" aria-label="ادعم حروف الكورة، يفتح رابط الدفع الخارجي في نافذة جديدة"><HeartHandshake size={22}/><span>ادعم حروف الكورة<small>دعم اختياري · الدفع في صفحة خارجية</small></span><ExternalLink size={17}/></a>}</div>
      <div className="hero-game"><div className="demo-top"><span className="match-label">التحدّي يبدأ بحرف</span><span className="round-label">٥ × ٥</span></div><Board cells={sampleBoard} size={5} teams={sampleTeams} compact/><div className="demo-bottom"><span><span className="team-square one"/> كل إجابة تقرّبك</span><span>المسار المتصل يكسب الجولة <Trophy size={17}/></span></div></div>
    </section>
    <section className="mini-home container"><div className="mini-home-icon"><Dices/></div><div><span className="eyebrow"><Sparkles size={15}/> قسم مستقل جديد</span><h2>Mini Games</h2><p>٣١ لعبة كروية بصرية: مسيرات، تشكيلات، ملاعب، تحديات سرعة وMini Games Party.</p></div><Button asChild className="primary"><Link to="/mini-games">استعرض الألعاب <ArrowLeft/></Link></Button></section>
    <section className="how-section container" id="how"><div className="section-title"><div><span className="eyebrow">طريقة اللعب</span><h2>طريقة اللعب في ثلاث خطوات</h2></div><Link to="/rules" className="text-link">القوانين كاملة <ChevronLeft size={18}/></Link></div><div className="steps"><div><span className="step-no">01</span><h3>جهّز فريقك</h3><p>اختر الأسماء والبطولات، وشارك رابط الجرس مع اللاعبين.</p></div><div><span className="step-no">02</span><h3>اختر حرفًا وجاوب</h3><p>إجابة صحيحة؟ الخلية تصير بلون فريقك. السرعة لها دور.</p></div><div><span className="step-no">03</span><h3>وصّل طريقك للفوز</h3><p>وصّل جهتك للفوز بالجولة. بعد الجولات نعرف فائز المباراة.</p></div></div></section>
    <section className="competitions container"><div className="section-title"><div><span className="eyebrow">من الدوري إلى المونديال</span><h2>اختر البطولات</h2></div><span className="count-label">{ar(tournaments.length)} بطولة</span></div><div className="competition-strip">{tournaments.map((t,i)=><div key={t.id} className="competition-mini"><span className={'competition-symbol symbol-'+i}>{['SA','PL','LA','L1','BL','A','WC','CL','AC','KC','SC'][i]||'FC'}</span><span>{t.name}</span></div>)}</div><p className="hint bank-note">{ar(tournaments.reduce((sum,t)=>sum+t.questions,0))} سؤال متاح · اختر البطولات التي تعرفونها</p></section>
    <Dialog open={join} onOpenChange={setJoin}><DialogContent dir="rtl"><DialogTitle>ادخل غرفة أصحابك</DialogTitle><DialogDescription>اكتب رمز أي غرفة أو الصق رابط الجرس.</DialogDescription><form onSubmit={enter}><input dir="ltr" value={code} onChange={e=>setCode(e.target.value)} placeholder="رمز الغرفة" required autoFocus/>{error&&<Notice>{error}</Notice>}<Button className="primary wide" type="submit" disabled={joining}>{joining?'جاري البحث…':<>انضم للغرفة <ArrowLeft/></>}</Button></form></DialogContent></Dialog>
  </main>;
}
