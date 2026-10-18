import React,{useEffect,useRef,useState} from 'react';import {api} from './api';
export default function PlayerLookup({onSelect,type='player',label='ابحث عن لاعب بالعربي أو الإنجليزي'}:{onSelect:(player:any)=>void;type?:'player'|'club'|'national_team';label?:string}){
 const [query,setQuery]=useState(''),[items,setItems]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef(0);
 useEffect(()=>{const ticket=++request.current;setError('');setItems([]);if(query.trim().length<2){setBusy(false);return}setBusy(true);const timer=setTimeout(()=>{
 const path=type==='player'?'/atlas/player-search?q='+encodeURIComponent(query):'/atlas/explore?type='+type+'&q='+encodeURIComponent(query);
 api<any>(path).then(result=>{if(ticket===request.current)setItems(type==='player'?result:result.items)}).catch(e=>{if(ticket===request.current)setError(e.message)}).finally(()=>{if(ticket===request.current)setBusy(false)});
 },220);
 return()=>{clearTimeout(timer);request.current++};},[query,type]);
 return <div className="player-lookup"><label>{label}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={type==='player'?'مثال: Salah / صلاح / Rodrygo':'اسم الفريق'}/></label>{busy&&<small role="status">جارٍ البحث…</small>}{error&&<p role="alert">{error}</p>}
 {items.length>0&&<div className="visual-smart-results">{items.map(item=><button key={item.id} type="button" onClick={async()=>{const ticket=++request.current;setBusy(true);setError('');try{const full=type==='player'?await api<any>('/atlas/player-autofill?id='+encodeURIComponent(item.id)):item;if(ticket!==request.current)return;onSelect(full);setQuery('');setItems([]);}catch(e:any){if(ticket===request.current)setError(e.message)}finally{if(ticket===request.current)setBusy(false)}}}>{item.image_key?.startsWith('/api/visual-media/')&&<img src={item.image_key} width="40" height="40" alt=""/>}<span>{item.name_ar}<small>{item.name_en}</small><small>{item.metadata?.clubAtDate||item.metadata?.season||''}</small></span></button>)}</div>}
 {!busy&&query.trim().length>=2&&!items.length&&!error&&<small>لا توجد نتيجة مطابقة. جرّب الاسم الإنجليزي أو أكمل البيانات يدويًا.</small>}</div>;
}
