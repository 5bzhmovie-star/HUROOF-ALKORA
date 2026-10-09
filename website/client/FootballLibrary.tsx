"use client";
import React,{useEffect,useState} from 'react';
import {api} from './api';
type Entity={id:string;entity_type:string;name_ar:string;name_en:string;image_key:string|null;image_license:string|null;metadata:{source?:string;verifiedAt?:string;verification?:string}};
type Stats={entities:{type:string;total:number}[];pendingReview:number;media:number;publishedVisual:number;relations:number};
const kinds=[['player','لاعب'],['club','نادي'],['national_team','منتخب'],['competition','بطولة'],['season','موسم'],['fixture','مباراة'],['coach','مدرب']];
export default function FootballLibrary({onSelect,canReview=false}:{onSelect?:(entity:Entity)=>void;canReview?:boolean}){
 const [items,setItems]=useState<Entity[]>([]),[stats,setStats]=useState<Stats|null>(null),[search,setSearch]=useState(''),[type,setType]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [form,setForm]=useState({type:'player',externalKey:'',nameAr:'',nameEn:'',source:'',verifiedAt:'',verification:'pending'});
 const [selected,setSelected]=useState<Entity|null>(null),[history,setHistory]=useState<any[]>([]),[reviewEvidence,setReviewEvidence]=useState('');
 const reload=async()=>{setBusy(true);setError('');try{
  const [list,totals]=await Promise.all([api<Entity[]>('/admin/football-library?'+new URLSearchParams({search,type})),api<Stats>('/admin/football-library-stats')]);
  setItems(list);setStats(totals);
 }catch(e:any){setError(e.message)}finally{setBusy(false)}};
 useEffect(()=>{void reload()},[search,type]);
 const select=async(item:Entity)=>{setSelected(item);onSelect?.(item);try{setHistory(await api('/admin/football-library-history?id='+encodeURIComponent(item.id)))}catch(e:any){setError(e.message)}};
 const save=async()=>{setBusy(true);setError('');try{
  await api('/admin/football-entity-create',form);setMessage('أُضيف السجل للمكتبة، في انتظار التدقيق أو الربط التاريخي.');setForm(f=>({...f,externalKey:'',nameAr:'',nameEn:''}));await reload();
 }catch(e:any){setError(e.message)}finally{setBusy(false)}};
 return <section className="panel football-library" dir="rtl">
 <h2>المكتبة الكروية المركزية</h2><button type="button" disabled={busy} onClick={async()=>{
  if(!window.confirm('استيراد بيانات أولية من مباراتين تاريخيتين؟ ستُضاف كسجلات مراجعة، دون نشر أسئلة أو صور.'))return;
  setBusy(true);setError('');
  try{const result=await api<{relationsAdded:number}>('/admin/football-import-starter',{});
    setMessage('تم ربط التشكيلات التاريخية. علاقات جديدة: '+result.relationsAdded+'. بيانات الصور والمراكز ما زالت تحتاج مراجعة.');
    await reload();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }}>استيراد تشكيلتَي نهائي 2022 من المصادر الرسمية</button>
 <p className="hint">اللاعب يُحفظ مرة واحدة، وترتبط انتقالاته ومبارياته بسجله الأصلي. هذه المكتبة لا تنشر أسئلة دون تدقيق المصادر والوسائط.</p>
 {stats&&<div className="settings-row">{stats.entities.map(x=><div className="panel" key={x.type}><strong>{kinds.find(k=>k[0]===x.type)?.[1]||x.type}: {x.total}</strong></div>)}<div className="panel">العلاقات: {stats.relations}</div><div className="panel">بحاجة إلى مراجعة: {stats.pendingReview}</div><div className="panel">صور مخزنة: {stats.media}</div></div>}
 <div className="settings-row"><label>بحث عربي/إنجليزي<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم لاعب أو فريق"/></label>
 <label>النوع<select value={type} onChange={e=>setType(e.target.value)}><option value="">كل الكيانات</option>{kinds.map(([key,title])=><option value={key} key={key}>{title}</option>)}</select></label></div>
 <div className="football-library-results">{items.map(item=><button key={item.id} type="button" onClick={()=>select(item)} className="panel" style={{textAlign:'right',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
 {item.image_key?.startsWith('/api/visual-media/')&&<img src={item.image_key} alt="" width={56} height={56} style={{objectFit:'contain'}}/>}
 <span><strong>{item.name_ar}</strong><small style={{display:'block'}}>{item.name_en} · {item.entity_type} · {item.metadata.verification||'غير مدقق'}</small></span></button>)}</div>
 {selected&&<div className="panel"><strong>السجل التاريخي: {selected.name_ar}</strong>
 {canReview&&selected.metadata.verification!=='reviewed'&&<div className="settings-row"><label>رابط إثبات مستقل للمراجعة<input dir="ltr" type="url" value={reviewEvidence} onChange={e=>setReviewEvidence(e.target.value)} placeholder="https://…"/></label><button type="button" disabled={busy||!reviewEvidence.startsWith('https://')} onClick={async()=>{setBusy(true);setError('');try{await api('/admin/football-entity-review',{id:selected.id,evidenceUrl:reviewEvidence});setMessage('تم توثيق مراجعة هوية الكيان فقط؛ تراخيص الصور تُراجع بصورة منفصلة.');setReviewEvidence('');await reload();}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>اعتماد مراجعة الهوية</button></div>}{history.length===0?<p>لا توجد علاقات مؤرخة بعد.</p>:history.map(x=><p key={x.id}>{x.relation_type} · {x.to_name} · {x.starts_at} – {x.ends_at||'مستمر'} <a href={x.source} target="_blank" rel="noreferrer">المصدر</a></p>)}</div>}
 <details><summary>إضافة كيان موثّق المصدر</summary><div className="settings-row">
 <label>النوع<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{kinds.map(([key,title])=><option value={key} key={key}>{title}</option>)}</select></label>
 {([['externalKey','معرف مرجعي ثابت'],['nameAr','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['source','رابط المصدر الرسمي HTTPS']] as const).map(([key,label])=><label key={key}>{label}<input value={form[key]} dir={key==='nameAr'?'rtl':'ltr'} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></label>)}
 <label>تاريخ آخر تحقق<input type="date" value={form.verifiedAt} onChange={e=>setForm(f=>({...f,verifiedAt:e.target.value}))}/></label>
 <label>حالة التدقيق<select value={form.verification} onChange={e=>setForm(f=>({...f,verification:e.target.value}))}><option value="pending">بانتظار المراجعة</option></select></label></div>
 <button type="button" disabled={busy} onClick={save}>حفظ الكيان</button></details>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert" style={{color:'#f7b0b0'}}>{error}</p>}
 </section>;
}
