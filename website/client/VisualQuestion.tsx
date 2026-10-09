"use client";
import React, { useState } from 'react';
import './VisualQuestion.css';

export type VisualLineup = {
 type:'career'|'guess_club_nationalities'|'guess_nation_clubs';
 eventDate:string;competition:string;formation?:string;
 stations?:{clubLogo:string;from:number;to:number;loan:boolean}[];
 playerPhoto?:string;playerName?:string;
 players?:{slot:number;x:number;y:number;marker:string;photo?:string;name?:string;position?:string;nationality?:string;clubAtDate?:string;number?:number|null}[];
 teamName?:string;teamImage?:string;coach?:string|null
};

const clamp=(v:number,low=8,high=92)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:50));
export function VisualQuestion({data,revealed,canControl,onAction,mode='auto',editable=false,onMovePlayer}:{
 data:VisualLineup;revealed:boolean;canControl:boolean;
 mode?:'auto'|'all'|'manual';
 onAction?:(action:string,details?:Record<string,unknown>)=>void;
 editable?:boolean;onMovePlayer?:(slot:number,x:number,y:number)=>void
}) {
 const [inspected,setInspected]=useState<number|null>(null);
 const [reduceMotion,setReduceMotion]=useState(false);
 const [dragSlot,setDragSlot]=useState<number|null>(null);
 if(data.type==='career')return <section className="visual-career" dir="rtl">
  <div className="visual-description">المسيرة الاحترافية · {data.eventDate}</div>
  <div className="visual-career-row">{data.stations?.map((s,i)=><div className="visual-career-stop" key={i}>
    <img src={s.clubLogo} alt="شعار أحد أندية المسيرة" loading="eager"/>
    <span>{s.from}–{s.to}</span>{s.loan&&<small>إعارة</small>}
  </div>)}</div>
  {revealed&&data.playerPhoto&&<div className="visual-final">
    <img src={data.playerPhoto} alt={data.playerName||'صورة اللاعب'}/>
    <strong>{data.playerName}</strong>
  </div>}
 </section>;
 const revealedPlayers=(data.players||[]).filter(p=>p.name).length;
 return <section className={'visual-stadium '+(reduceMotion?'visual-reduced-motion':'')} dir="rtl">
  <div className="visual-stadium-header"><strong>{data.competition}</strong><span>{data.eventDate} · {data.formation}</span>
   <button type="button" onClick={()=>setReduceMotion(v=>!v)} aria-pressed={reduceMotion}>{reduceMotion?'تفعيل الحركة':'تقليل الحركة'}</button></div>
  <div className="visual-pitch" role="group" aria-label="ملعب السؤال المصور">
   <div className="visual-touchline"/><div className="visual-halfline"/><div className="visual-centercircle"/>
   <div className="visual-box visual-box-top"/><div className="visual-box visual-box-bottom"/>
   {data.players?.map(p=>{
    const shown=!!p.name;
    return <button key={p.slot} type="button"
      className={'visual-player '+(shown?'is-revealed':'is-hidden')}
      style={{left:clamp(p.x)+'%',top:clamp(p.y)+'%'}}
      onClick={()=>!editable&&(shown?setInspected(p.slot):canControl&&onAction?.('visual-reveal-slot',{slot:p.slot}))}
      onPointerDown={e=>{if(!editable)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setDragSlot(p.slot)}}
      onPointerUp={e=>{if(!editable||dragSlot!==p.slot)return;const pitch=e.currentTarget.closest('.visual-pitch') as HTMLElement | null;
        if(pitch){const r=pitch.getBoundingClientRect();onMovePlayer?.(p.slot,clamp((e.clientX-r.left)/r.width*100),clamp((e.clientY-r.top)/r.height*100));}
        setDragSlot(null)}}
      onPointerCancel={()=>setDragSlot(null)}
      disabled={!editable&&!shown&&!canControl} aria-label={shown?p.name:'لاعب مخفي'}>
      <span className="visual-flip" style={{transitionDelay:reduceMotion?'0ms':(mode==='auto'?p.slot*110:0)+'ms'}}>
       <span className="visual-front"><img src={p.marker} alt="دليل السؤال"/></span>
       {shown&&<span className="visual-back"><img src={p.photo} alt={p.name}/></span>}
      </span>
      {shown&&<span className="visual-player-name">{p.name}</span>}
    </button>
   })}
  </div>
  {revealed&&data.teamName&&<div className="visual-team-reveal">
   {data.teamImage&&<img src={data.teamImage} alt="شعار أو علم الإجابة"/>}
   <strong>{data.teamName}</strong><span>{data.formation}{data.coach?' · '+data.coach:''}</span>
  </div>}
  {canControl&&!revealed&&<div className="visual-reveal-controls">
    <button type="button" onClick={()=>onAction?.('visual-reveal-auto')}>كشف سينمائي كامل</button>
    <button type="button" onClick={()=>onAction?.('visual-reveal-all')}>كشف الجميع دفعة واحدة</button>
    <small>للكشف تدريجيًا اضغط على أي بطاقة في الملعب</small>
  </div>}
  {inspected!==null&&data.players?.[inspected]?.name&&(()=>{
    const p=data.players.find(player=>player.slot===inspected)!;return <div className="visual-player-detail" role="dialog" aria-modal="false" aria-label="بطاقة اللاعب">
      <button type="button" onClick={()=>setInspected(null)}>إغلاق</button>
      <img src={p.photo} alt={p.name}/><strong>{p.name}</strong>
      <p>{p.position} · {p.nationality} · {p.clubAtDate}{p.number!==null&&p.number!==undefined?' · #'+p.number:''}</p>
    </div>;
  })()}
 </section>;
}
