"use client";
import React,{useEffect,useState} from 'react';
import {api,Competition} from './api';
import {VisualQuestion} from './VisualQuestion';
import FootballLibrary from './FootballLibrary';
import VisualMediaPicker from './VisualMediaPicker';
type Media={id:string;url:string;license:string;source:string;content_type:string};
const empty=(slot:number)=>({slot,x:15+(slot%4)*23,y:15+Math.floor(slot/4)*35,name:'',position:'',nationality:'',clubAtDate:'',photo:'',flag:'',clubLogo:'',number:null as number|null});
const careerStop=()=>({club:'',clubLogo:'',from:2020,to:2021,loan:false});
const types=[['career','خمن اللاعب من مسيرته'],['guess_club_nationalities','خمن النادي من جنسيات التشكيلة'],['guess_nation_clubs','خمن المنتخب من أندية لاعبيه']];
export default function VisualEditor({tournaments,onSaved}:{tournaments:Competition[];onSaved:()=>void}){
 const [assets,setAssets]=useState<Media[]>([]);
 const [kind,setKind]=useState('career');
 const [libraryOpen,setLibraryOpen]=useState(false);
 const [selectedLibrary,setSelectedLibrary]=useState<{id:string;name_ar:string;image_key:string|null}|null>(null);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [input,setInput]=useState({tournament_id:tournaments[0]?.id||'',letter:'م',text:'',answer:'',difficulty:'medium',status:'hidden',source:'',note:''});
 const [visual,setVisual]=useState<any>({type:'career',eventDate:'',verifiedAt:'',source:'',competition:'',playerPhoto:'',playerName:'',stations:[careerStop(),careerStop(),careerStop()],teamName:'',teamImage:'',formation:'4-3-3',coach:'',players:Array.from({length:11},(_,slot)=>empty(slot))});
 const update=(key:string,value:any)=>setVisual((s:any)=>({...s,[key]:value}));
 useEffect(()=>{api<Media[]>('/admin/visual-media').then(setAssets).catch(e=>setError(e.message));},[]);
 const mediaPicker=(value:string,changed:(value:string)=>void,label:string)=><VisualMediaPicker label={label} value={value||''} onChange={changed} assets={assets}/>;
 const updateEntry=(key:'stations'|'players',i:number,field:string,value:any)=>setVisual((prev:any)=>({...prev,[key]:prev[key].map((entry:any,j:number)=>j===i?{...entry,[field]:value}:entry)}));
 async function uploadMedia(file:File,license:string,source:string){
  if(file.size>1_350_000)throw Error('الصورة أكبر من 1.35MB، ضغطها إلى WebP أو PNG.');
  const buffer=new Uint8Array(await file.arrayBuffer());
  let binary='';for(const byte of buffer)binary+=String.fromCharCode(byte);
  const result=await api<Media>('/admin/visual-media-upload',{contentType:file.type,base64:btoa(binary),license,source});
  setAssets(previous=>previous.some(x=>x.id===result.id)?previous:[...previous,result]);
 }
 const [license,setLicense]=useState(''),[mediaSource,setMediaSource]=useState(''),[file,setFile]=useState<File|null>(null);
 const save=async()=>{setBusy(true);setError('');setStatus('');try{
  const result=await api<{id:string}>('/admin/visual-question',{...input,visual:{...visual,type:kind,source:input.source,playerName:input.answer}});
  setStatus('حُفظ السؤال '+result.id+' — '+(input.status==='published'?'منشور':'مسودة مخفية'));onSaved();
 }catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const picker=(key:string,label:string)=>mediaPicker(visual[key],value=>update(key,value),label);
 return <section className="panel visual-editor" dir="rtl"><h2>محرر الأسئلة البصرية</h2>
 <p className="hint">لا يمكن نشر سؤال ناقص الصور أو المصدر. جميع الأسئلة الجديدة تُحفظ مخفية افتراضيًا حتى تراجع المعلومات.</p>
 <button type="button" onClick={()=>setLibraryOpen(v=>!v)}>{libraryOpen?'إخفاء المكتبة الكروية':'البحث عن لاعب أو فريق من المكتبة'}</button>
 {libraryOpen&&<FootballLibrary onSelect={entry=>{
  setSelectedLibrary(entry);
  if(entry.entity_type==='fixture'&&kind!=='career'){
    api<any>('/admin/football-fixture-draft?id='+encodeURIComponent(entry.id)).then(draft=>{
      setVisual((old:any)=>({...old,players:draft.players,competition:draft.fixture.name,eventDate:draft.players[0]?.date||old.eventDate}));
      setStatus('استوردت أسماء 11 لاعبًا. يلزم استكمال المراكز والصور المرخصة والأندية بتاريخ المباراة قبل النشر.');
    }).catch(e=>setError(e.message));
  }else if(entry.entity_type==='player'&&kind==='career'){
   setInput(old=>({...old,answer:entry.name_ar}));
   setVisual((old:any)=>({...old,playerName:entry.name_ar,playerPhoto:entry.image_key?.startsWith('/api/visual-media/')?entry.image_key:old.playerPhoto}));
  }else if(['club','national_team'].includes(entry.entity_type)&&kind!=='career'){
   setVisual((old:any)=>({...old,teamName:entry.name_ar,teamImage:entry.image_key?.startsWith('/api/visual-media/')?entry.image_key:old.teamImage}));
   setInput(old=>({...old,answer:entry.name_ar}));
  }
 }}/>}
 {selectedLibrary&&<p role="status">تم اختيار {selectedLibrary.name_ar} من السجل المركزي. أكمل عناصر السؤال التي لم تُوثَّق بعد.</p>}
 <div className="settings-row"><label>النوع<select value={kind} onChange={e=>setKind(e.target.value)}>{types.map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label><label>البطولة<select value={input.tournament_id} onChange={e=>setInput(s=>({...s,tournament_id:e.target.value}))}>{tournaments.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>الحرف<input value={input.letter} maxLength={1} onChange={e=>setInput(s=>({...s,letter:e.target.value}))}/></label></div>
 <label>السؤال<input value={input.text} onChange={e=>setInput(s=>({...s,text:e.target.value}))}/></label>
 <label>الإجابة<input value={input.answer} onChange={e=>setInput(s=>({...s,answer:e.target.value}))}/></label>
 <div className="settings-row"><label>الصعوبة<select value={input.difficulty} onChange={e=>setInput(s=>({...s,difficulty:e.target.value}))}>{['easy','medium','hard'].map(v=><option key={v}>{v}</option>)}</select></label><label>الحالة<select value={input.status} onChange={e=>setInput(s=>({...s,status:e.target.value}))}><option value="hidden">مسودة مخفية</option><option value="published">منشور بعد التدقيق</option></select></label></div>
 <label>رابط المصدر التاريخي HTTPS<input dir="ltr" value={input.source} onChange={e=>setInput(s=>({...s,source:e.target.value}))}/></label>
 <div className="settings-row"><label>تاريخ الحدث<input type="date" value={visual.eventDate} onChange={e=>update('eventDate',e.target.value)}/></label><label>آخر تحقق<input type="date" value={visual.verifiedAt} onChange={e=>update('verifiedAt',e.target.value)}/></label><label>المسابقة<input value={visual.competition} onChange={e=>update('competition',e.target.value)}/></label></div>
 <fieldset className="panel"><legend>مكتبة الوسائط المحلية</legend>
 <div className="settings-row"><label>الصورة<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>الترخيص / الإذن<input value={license} onChange={e=>setLicense(e.target.value)} placeholder="مثال: CC BY-SA 4.0"/></label><label>رابط مصدر الصورة<input dir="ltr" value={mediaSource} onChange={e=>setMediaSource(e.target.value)}/></label></div>
 <button type="button" disabled={!file||busy} onClick={async()=>{if(!file)return;setBusy(true);setError('');try{await uploadMedia(file,license,mediaSource);setStatus('تم رفع الصورة إلى المكتبة');}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>رفع الصورة إلى المكتبة</button>
 <p className="hint">الحد 1.35 ميجابايت لكل صورة؛ SVG محظور حتى تتوفر آلية تعقيم موثوقة.</p></fieldset>
 {kind==='career'?<div><h3>محطات المسيرة (3–8)</h3>{picker('playerPhoto','صورة اللاعب بعد الكشف')}
 {visual.stations.map((entry:any,i:number)=><div className="settings-row" key={i}>
 <label>النادي {i+1}<input value={entry.club} onChange={e=>updateEntry('stations',i,'club',e.target.value)}/></label>
 {mediaPicker(entry.clubLogo,value=>updateEntry('stations',i,'clubLogo',value),'شعار النادي')}
 <label>من<input type="number" value={entry.from} onChange={e=>updateEntry('stations',i,'from',Number(e.target.value))}/></label>
 <label>إلى<input type="number" value={entry.to} onChange={e=>updateEntry('stations',i,'to',Number(e.target.value))}/></label>
 <label>إعارة<input type="checkbox" checked={entry.loan} onChange={e=>updateEntry('stations',i,'loan',e.target.checked)}/></label></div>)}
 <button type="button" disabled={visual.stations.length>=8} onClick={()=>update('stations',[...visual.stations,careerStop()])}>إضافة محطة</button>
 <button type="button" disabled={visual.stations.length<=3} onClick={()=>update('stations',visual.stations.slice(0,-1))}>حذف آخر محطة</button>
 </div>:<div><h3>التشكيلة الأساسية — 11 لاعبًا</h3><div className="settings-row"><label>الفريق الصحيح<input value={visual.teamName} onChange={e=>update('teamName',e.target.value)}/></label><label>الخطة<input value={visual.formation} onChange={e=>update('formation',e.target.value)}/></label><label>المدرب<input value={visual.coach} onChange={e=>update('coach',e.target.value)}/></label>{picker('teamImage','شعار/علم الإجابة')}</div>
 {visual.players.map((p:any,i:number)=><details className="panel" key={i}><summary>لاعب التشكيلة {i+1}: {p.name||'غير محدد'}</summary>
 <div className="settings-row">{['name','position','nationality','clubAtDate'].map(k=><label key={k}>{({name:'اسم اللاعب',position:'المركز',nationality:'الجنسية',clubAtDate:'النادي وقت المباراة'} as any)[k]}<input value={p[k]} onChange={e=>updateEntry('players',i,k,e.target.value)}/></label>)}
 <label>رقم القميص<input type="number" value={p.number??''} onChange={e=>updateEntry('players',i,'number',e.target.value===''?null:Number(e.target.value))}/></label>
 <label>موضع X %<input type="number" min={8} max={92} value={p.x} onChange={e=>updateEntry('players',i,'x',Number(e.target.value))}/></label>
 <label>موضع Y %<input type="number" min={8} max={92} value={p.y} onChange={e=>updateEntry('players',i,'y',Number(e.target.value))}/></label>
 {mediaPicker(p.photo,value=>updateEntry('players',i,'photo',value),'صورة اللاعب')}
 {mediaPicker(p.flag,value=>updateEntry('players',i,'flag',value),'علم الجنسية')}
 {mediaPicker(p.clubLogo,value=>updateEntry('players',i,'clubLogo',value),'شعار النادي بتاريخ المباراة')}
 </div></details>)}</div>}
 <h3>معاينة السؤال قبل النشر</h3><p className="hint">يمكنك سحب بطاقات اللاعبين لتغيير مراكزهم داخل الملعب الأفقي. هذه معاينة خاصة بالإدارة.</p><VisualQuestion data={{...visual,type:kind} as any} revealed={false} canControl={false} editable={kind!=='career'} onMovePlayer={(slot,x,y)=>setVisual((state:any)=>({...state,players:state.players.map((p:any)=>p.slot===slot?{...p,x,y}:p)}))}/>
 {error&&<p role="alert" style={{color:'#fa9e9e'}}>{error}</p>}{status&&<p role="status">{status}</p>}
 <button type="button" disabled={busy} onClick={save}>{busy?'جارٍ حفظ السؤال…':'تحقق من المعلومات واحفظ السؤال'}</button>
 </section>;
}
