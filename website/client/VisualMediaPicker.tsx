"use client";
import React,{useMemo,useState} from 'react';
export type MediaRecord={id:string;url:string;license:string;source:string;content_type:string};
export default function VisualMediaPicker({label,value,onChange,assets}:{label:string;value:string;onChange:(v:string)=>void;assets:MediaRecord[]}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 const filtered=useMemo(()=>assets.filter(a=>(a.license+' '+a.source+' '+a.id).toLowerCase().includes(search.toLowerCase())).slice(0,120),[assets,search]);
 const selected=assets.find(a=>a.url===value);
 return <div className="visual-media-picker">
 <div className="visual-media-heading"><strong>{label}</strong><button type="button" onClick={()=>setOpen(v=>!v)}>{open?'إغلاق المكتبة':'اختيار من الصور'}</button></div>
 {selected&&<figure><img src={selected.url} alt="الصورة المحددة" width={70} height={70} loading="lazy"/><figcaption>{selected.license}</figcaption></figure>}
 {open&&<div className="visual-media-gallery" role="group" aria-label={label}>
 <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالترخيص أو المصدر أو المعرف" aria-label="بحث الصور"/>
 <div className="visual-media-cards">{filtered.map(a=><button type="button" key={a.id} className={value===a.url?'active':''} onClick={()=>{onChange(a.url);setOpen(false)}} title={a.source}>
 <img src={a.url} alt={a.license} loading="lazy" width={88} height={88}/>
 <small>{a.license}</small></button>)}</div>
 {filtered.length===0&&<p>لا توجد صور مطابقة. ارفع الصورة بترخيص ومصدر موثّق أولًا.</p>}
 </div>}
 </div>;
}
