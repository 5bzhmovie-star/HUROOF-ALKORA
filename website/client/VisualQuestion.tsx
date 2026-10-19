"use client";
import React, { useState } from 'react';
import './VisualQuestion.css';

export type VisualLineup = {
 type:'image'|'career'|'coach_career'|'common_link'|'odd_one_out'|'missing_player'|'guess_club_nationalities'|'guess_nation_clubs';
 image?:string;eventDate:string;competition:string;formation?:string;
 stations?:{clubLogo:string;from:number;to:number;loan:boolean}[];
 playerPhoto?:string;playerName?:string;
 players?:{slot:number;x:number;y:number;marker?:string;missing?:boolean;photo?:string;name?:string;position?:string;nationality?:string;clubAtDate?:string;number?:number|null}[];
 cards?:{slot:number;name:string;photo:string}[];explanation?:string;answerIndex?:number;teamName?:string;teamImage?:string;coach?:string|null
};

const clamp=(v:number,low=8,high=92)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:50));
export function VisualQuestion({data,revealed,canControl,onAction,mode='auto',editable=false,onMovePlayer}:{
 data:VisualLineup;revealed:boolean;canControl:boolean;
 mode?:'auto'|'all'|'manual';
 onAction?:(action:string,details?:Record<string,unknown>)=>void;
 editable?:boolean;onMovePlayer?:(slot:number,x:number,y:number)=>void
}) {
 const [portraitErrors,setPortraitErrors]=useState<Set<string>>(()=>new Set());
 const [inspected,setInspected]=useState<number|null>(null);
 const [reduceMotion,setReduceMotion]=useState(false);
 const [dragSlot,setDragSlot]=useState<number|null>(null);
 const [fullScreen,setFullScreen]=useState(false);
 const portraitY=(p:{x:number;y:number})=>clamp(p.y);
 if(data.type==='image')return <section className={'visual-image-question '+(revealed?'is-revealed':'')} dir="rtl"><div className="visual-image-stage">{data.image?<img src={data.image} alt="صورة السؤال" loading="eager" decoding="async"/>:<div className="visual-image-missing">اختر صورة السؤال من المكتبة</div>}</div><div className="visual-image-caption">{revealed?'تم كشف الإجابة':'تأمل الصورة… ما الإجابة؟'}</div></section>;
 if(data.type==='career'||data.type==='coach_career')return <section className="visual-career" dir="rtl">
  <div className="visual-description">{data.type==='coach_career'?'مسيرة مدرب':'مسيرة اللاعب'} · {data.eventDate}</div>
  <div className="visual-career-row">{data.stations?.map((s,i)=><div className="visual-career-stop" key={i}>
    <img src={s.clubLogo} alt="شعار أحد أندية المسيرة" loading="eager"/>
    <span>{s.from}–{s.to}</span>{s.loan&&<small>إعارة</small>}
  </div>)}</div>
  {revealed&&data.playerPhoto&&<div className="visual-final">
    <img src={data.playerPhoto} alt={data.playerName||'صورة اللاعب'}/>
    <strong>{data.playerName}</strong>
  </div>}
 </section>;
 if(data.type==='common_link'||data.type==='odd_one_out')return <section className="visual-connections" dir="rtl"><div className="visual-connection-title"><span>{data.type==='common_link'?'٤ لاعبين · رابط واحد':'٣ يجمعهم رابط · وواحد دخيل'}</span><h3>{data.type==='common_link'?'وش الرابط؟':'من الدخيل؟'}</h3></div><div className="visual-four-grid">{data.cards?.map((c,i)=><article key={c.slot} className={revealed&&data.answerIndex===i?'is-answer':''}><span className="visual-card-number">{i+1}</span><div className="visual-card-photo"><img src={c.photo} alt={c.name}/></div><strong>{c.name}</strong>{revealed&&data.answerIndex===i&&<small>الدخيل</small>}</article>)}</div>{revealed&&data.explanation&&<div className="visual-explanation"><small>{data.type==='common_link'?'الرابط المشترك':'سبب اختيار الدخيل'}</small><p>{data.explanation}</p></div>}</section>;
 const isMissing=data.type==='missing_player';
 return <section className={'visual-stadium '+(reduceMotion?'visual-reduced-motion':'')} dir="rtl">
  <div className="visual-stadium-header"><strong>{isMissing?data.teamName:data.competition}</strong><span>{data.eventDate} · {data.formation}</span>
   <button type="button" onClick={e=>{const el=e.currentTarget.closest(".visual-stadium");if(document.fullscreenElement){void document.exitFullscreen();setFullScreen(false)}else if(el?.requestFullscreen){void el.requestFullscreen();setFullScreen(true)}}}>{fullScreen?"تصغير الملعب":"ملء الشاشة"}</button><button type="button" onClick={()=>setReduceMotion(v=>!v)} aria-pressed={reduceMotion}>{reduceMotion?'تفعيل الحركة':'تقليل الحركة'}</button></div>
  <div className={"visual-pitch "+(editable?"is-editable":"")} role="group" aria-label="ملعب طولي من المرمى العلوي إلى المرمى السفلي">
   <div className="visual-touchline"/><div className="visual-halfline"/><div className="visual-centercircle"/>
   <div className="visual-box visual-box-top"/><div className="visual-box visual-box-bottom"/><div className="visual-goal visual-goal-top"/><div className="visual-goal visual-goal-bottom"/><div className="visual-penalty-spot top"/><div className="visual-penalty-spot bottom"/>
   {data.players?.map(p=>{
    const shown=!!p.name;
    return <button key={p.slot} type="button"
      className={'visual-player '+(shown?'is-revealed':'is-hidden')}
      style={{left:clamp(p.x)+'%',top:portraitY(p)+'%'}}
      onClick={()=>!editable&&(shown?setInspected(p.slot):!isMissing&&canControl&&onAction?.('visual-reveal-slot',{slot:p.slot}))}
      onPointerDown={e=>{if(!editable)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setDragSlot(p.slot)}}
      onPointerUp={e=>{if(!editable||dragSlot!==p.slot)return;const pitch=e.currentTarget.closest('.visual-pitch') as HTMLElement | null;
        if(pitch){const r=pitch.getBoundingClientRect();onMovePlayer?.(p.slot,clamp((e.clientX-r.left)/r.width*100),clamp((e.clientY-r.top)/r.height*100));}
        setDragSlot(null)}}
      onPointerCancel={()=>setDragSlot(null)}
      disabled={!editable&&!shown&&(!canControl||isMissing)} aria-label={shown?p.name:'لاعب مخفي'}>
      <span className="visual-flip" style={{'--reveal-delay':reduceMotion?'0ms':(mode==='auto'?p.slot*110:0)+'ms'} as React.CSSProperties}>
       <span className="visual-front">{isMissing?<b className="visual-missing-mark">؟</b>:p.marker?<img src={p.marker} alt="دليل السؤال"/>:<b>؟</b>}</span>
       {shown&&<span className="visual-back">{p.photo&&!portraitErrors.has(p.photo)?<img src={p.photo} alt={p.name} onError={()=>setPortraitErrors(s=>new Set([...s,p.photo!]))}/>:<span className="visual-portrait-missing" title="لا توجد صورة محفوظة لهذا اللاعب"><b>{p.name?.split(/\s+/).slice(0,2).map(w=>w[0]).join('')}</b><small>بدون صورة</small></span>}</span>}
      </span>
      {shown&&<span className="visual-player-name">{p.name}</span>}
    </button>
   })}
  </div>
  {revealed&&data.teamName&&<div className="visual-team-reveal">
   {data.teamImage&&<img src={data.teamImage} alt="شعار أو علم الإجابة"/>}
   <strong>{data.teamName}</strong><span>{data.formation}{data.coach?' · '+data.coach:''}</span>
  </div>}
  {canControl&&!revealed&&!isMissing&&<div className="visual-reveal-controls">
    <button type="button" onClick={()=>onAction?.('visual-reveal-auto')}>كشف سينمائي كامل</button>
    <button type="button" onClick={()=>onAction?.('visual-reveal-all')}>كشف الجميع دفعة واحدة</button>
    <small>للكشف تدريجيًا اضغط على أي بطاقة في الملعب</small>
  </div>}
  {inspected!==null&&data.players?.some(player=>player.slot===inspected&&player.name)&&(()=>{
    const p=data.players.find(player=>player.slot===inspected)!;return <div className="visual-player-detail" role="dialog" aria-modal="false" aria-label="بطاقة اللاعب">
      <button type="button" onClick={()=>setInspected(null)}>إغلاق</button>
      <img src={p.photo} alt={p.name}/><strong>{p.name}</strong>
      <p>{p.position} · {p.nationality} · {p.clubAtDate}{p.number!==null&&p.number!==undefined?' · #'+p.number:''}</p>
    </div>;
  })()}
 </section>;
}
