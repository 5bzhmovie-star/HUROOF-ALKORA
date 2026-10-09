"use client";
import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {api} from './api';
import {BookOpen,Users,Shield,CalendarDays,Search,RefreshCw,CloudDownload,Image as ImageIcon,CheckCircle2,AlertTriangle,ChevronLeft,ArrowUpLeft,Globe2,Trophy,Flag,Building2,UserRound,MapPin,Layers,Plus,Clock3,Link as LinkIcon,Filter,Database,ShieldCheck,X} from 'lucide-react';
import './FootballLibrary.css';

export type AtlasEntity={id:string;entity_type:string;name_ar:string;name_en:string;image_key:string|null;image_license:string|null;metadata:{source?:string;verifiedAt?:string;verification?:string;reviewEvidence?:string;externalImage?:{url:string;source:string;license:string;artist?:string;checkedAt:string}}};
type Summary={entities:{type:string;total:number}[];pendingReview:number;media:number;publishedVisual:number;relations:number};
type Timeline={id:string;from_name:string;to_name:string;relation_type:string;starts_at:string|null;ends_at:string|null;source:string;metadata?:{verification?:string}};
const CATEGORIES:{id:string;title:string;icon:React.ComponentType<any>}[]=[
{id:'',title:'الكل',icon:Layers},{id:'player',title:'اللاعبون',icon:UserRound},{id:'club',title:'الأندية',icon:Shield},
{id:'national_team',title:'المنتخبات',icon:Flag},{id:'competition',title:'البطولات',icon:Trophy},
{id:'season',title:'المواسم',icon:CalendarDays},{id:'fixture',title:'المباريات',icon:CalendarDays},
{id:'coach',title:'المدربون',icon:Users},{id:'stadium',title:'الملاعب',icon:MapPin},{id:'country',title:'الدول',icon:Globe2}];
const LEAGUES=[
{key:'la-liga',name:'الدوري الإسباني',region:'إسبانيا',country:'🇪🇸'},
{key:'premier-league',name:'الدوري الإنجليزي',region:'إنجلترا',country:'🏴'},
{key:'bundesliga',name:'الدوري الألماني',region:'ألمانيا',country:'🇩🇪'},
{key:'serie-a',name:'الدوري الإيطالي',region:'إيطاليا',country:'🇮🇹'},
{key:'ucl',name:'دوري أبطال أوروبا',region:'أوروبا',country:'🏆'},
{key:'ligue-1',name:'الدوري الفرنسي',region:'فرنسا',country:'🇫🇷'},
{key:'saudi-league',name:'الدوري السعودي',region:'السعودية',country:'🇸🇦'},
{key:'world-cup',name:'كأس العالم',region:'عالمي',country:'🌍'},
{key:'kings-cup',name:'كأس الملك',region:'السعودية',country:'🏆'},
{key:'saudi-super-cup',name:'السوبر السعودي',region:'السعودية',country:'🇸🇦'},
{key:'afc-champions-league',name:'دوري أبطال آسيا للنخبة',region:'آسيا',country:'🏆'}
];
const labels:Record<string,string>={player:'لاعب',club:'نادي',national_team:'منتخب',competition:'بطولة',season:'موسم',fixture:'مباراة',coach:'مدرب',stadium:'ملعب',country:'دولة',flag:'علم',manager:'مدرب',played_for:'لعب لـ',loaned_to:'إعارة إلى',selected_for:'انضم إلى',appeared_in:'شارك في',participated_in:'شارك في',belongs_to:'يتبع',managed_by:'يدرب'};
const mimeImage=(url:string|null)=>url?.startsWith('/api/visual-media/')?url:null;
function Portrait({item,size=55}:{item:AtlasEntity;size?:number}){
 const Icon=CATEGORIES.find(x=>x.id===item.entity_type)?.icon||Globe2;
 const url=mimeImage(item.image_key)||((item.metadata?.externalImage?.url||'').startsWith('https://upload.wikimedia.org/')?item.metadata.externalImage.url:null);
 return <span className="atlas-crest" style={{width:size,height:size}}>{url?<img src={url} loading="lazy" alt={item.name_ar}/>:<Icon size={size*.46} aria-hidden="true"/>}</span>;
}
export default function FootballLibrary({onSelect,canReview=false}:{onSelect?:(x:AtlasEntity)=>void;canReview?:boolean}){
 const [items,setItems]=useState<AtlasEntity[]>([]),[stats,setStats]=useState<Summary|null>(null);
 const [filter,setFilter]=useState(''),[search,setSearch]=useState(''),[debounced,setDebounced]=useState('');
 const [selected,setSelected]=useState<AtlasEntity|null>(null),[timeline,setTimeline]=useState<Timeline[]>([]);
 const [loading,setLoading]=useState(true),[working,setWorking]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[reviewSource,setReviewSource]=useState('');
 const [form,setForm]=useState({type:'player',externalKey:'',nameAr:'',nameEn:'',source:'',verifiedAt:new Date().toISOString().slice(0,10),verification:'pending'});
 const [league,setLeague]=useState('');
 const [offset,setOffset]=useState(0);
 const [overview,setOverview]=useState<any[]>([]);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<any>(null);
 const [history,setHistory]=useState<any[]>([]);
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(search),220);return ()=>clearTimeout(timer)},[search]);
 const reload=useCallback(async()=>{
  setLoading(true);setError('');
  try {
    const [entities,summary]=await Promise.all([
      api<AtlasEntity[]>('/admin/football-library?'+new URLSearchParams({type:filter,search:debounced})),
      api<Summary>('/admin/football-library-stats')
    ]);
    setItems(entities);setStats(summary);setSelected(previous=>previous ? entities.find(item=>item.id===previous.id)||previous : null);
  }catch(e:any){setError(e.message||'تعذر تحميل المكتبة')}
  finally{setLoading(false)}
 },[filter,debounced]);
 useEffect(()=>{void reload()},[reload]);
 useEffect(()=>{setOffset(0)},[filter,debounced,league]);
 const inspect=async(item:AtlasEntity)=>{
  setSelected(item);onSelect?.(item);setError('');
  try{setTimeline(await api<Timeline[]>('/admin/football-library-history?id='+encodeURIComponent(item.id)))}catch(e:any){setTimeline([]);setError(e.message)}
 };
 const mutate=async(path:string,body:any,success:string)=>{
  setWorking(true);setError('');setMessage('');
  try{await api('/admin/'+path,body);setMessage(success);await reload()}
  catch(e:any){setError(e.message||'فشل الطلب')}finally{setWorking(false)}
 };
 const count=(kind:string)=>stats?.entities.find(x=>x.type===kind)?.total||0;
 const pageItems=items.slice(offset,offset+24);
 const reviewCount=stats?.pendingReview||0;
 return <div className="football-atlas" dir="rtl">
   <header className="atlas-hero">
    <div><div className="atlas-eyebrow">HUROOF FOOTBALL · FOOTBALL ATLAS</div>
      <h2>المكتبة الكروية</h2>
      <p>اللاعبون والأندية والمنتخبات والتاريخ الكروي في مكان واحد. سجل مستقل لكل هوية، ومصادر ومراجعات تحفظ تاريخ كل معلومة.</p>
      <div className="atlas-page-meta">بيانات جهازك · آخر مراجعة لكل سجل ظاهرة في تفاصيله · عرض 100 نتيجة كحد أقصى لكل بحث</div>
    </div>
    <div className="atlas-actions"><button className="atlas-btn" type="button" disabled={working} onClick={async()=>{if(!window.confirm('البحث عن صور أول 12 سجلًا ناقصًا في ويكيميديا؟ قد تستغرق العملية قليلًا.'))return;setWorking(true);setError('');try{const result=await api<{found:number;checked:number}>('/admin/football-images-enrich',{limit:12});setMessage('فُحص '+result.checked+' سجلًا وعُثر على '+result.found+' صورة مطابقة محتملة.');await reload();}catch(e:any){setError(e.message)}finally{setWorking(false)}}}><ImageIcon size={16}/> جلب صور من الإنترنت</button><button className="atlas-btn" type="button" disabled={working} onClick={()=>{if(window.confirm("إضافة البطولات الإحدى عشرة إلى المكتبة كسجلات أولية قابلة للتدقيق؟"))void mutate("football-import-competitions",{},"أُضيف كتالوج البطولات الرسمي. يحتاج كل موسم وفرق وصور إلى مراجعة منفصلة.")}}><Trophy size={16}/> استيراد البطولات الـ11</button><button className="atlas-btn" type="button" onClick={()=>void reload()}><RefreshCw size={16}/> تحديث العرض</button>
     <button className="atlas-btn main" type="button" disabled={working} onClick={()=>{if(window.confirm('استيراد هويات أولية موثّقة المصدر من نهائيَي 2022 ومسيرة محمد صلاح؟ لا تُنشر أسئلة أو صور تلقائيًا.'))void mutate('football-import-starter',{},'تم استيراد السجلات المرجعية. راجع المصادر والصور قبل النشر.')}}><CloudDownload size={16}/> استيراد البيانات المرجعية</button>
    </div>
   </header>
   <div className="atlas-dashboard">
    {[{n:count('player'),text:'اللاعبون المسجلون',I:Users},{n:count('club'),text:'الأندية المسجلة',I:Shield},{n:count('national_team'),text:'المنتخبات',I:Flag},{n:stats?.media||0,text:'صور محلية مرخصة',I:ImageIcon},
       {n:stats?.relations||0,text:'العلاقات التاريخية',I:Layers},{n:reviewCount,text:'تحتاج مراجعة',I:AlertTriangle},{n:stats?.publishedVisual||0,text:'أسئلة بصرية منشورة',I:BookOpen},{n:11,text:'بطولات مستهدفة',I:Trophy}].map(o=><div className="atlas-metric" key={o.text}><o.I size={25} color="#c2f17c"/><div><div className="figure">{loading&&!stats?'—':o.n.toLocaleString('ar-SA')}</div><small>{o.text}</small></div></div>)}
   </div>
   <section className="atlas-collections"><h3>البطولات المعتمدة <span className="atlas-page-meta">11 مسابقة · التغطية الفعلية تعتمد على السجلات المستوردة والمعتمدة</span></h3>
     <div className="atlas-league-grid">{LEAGUES.map(l=><button type="button" key={l.key} className={'atlas-league-card '+(league===l.key?'active':'')} onClick={()=>{setLeague(league===l.key?'':l.key);setFilter('competition');setSearch(league===l.key?'':l.name)}}>
       <span className="atlas-crest"><Trophy size={23}/></span><span><strong>{l.name}</strong><small>{l.region} · {l.country}</small></span></button>)}</div>
     {league&&<p className="atlas-notice">تم اختيار {LEAGUES.find(x=>x.key===league)?.name}. هذه مسابقة ضمن خطة التغطية؛ لا يعني عرضها أن قوائم فرقها الحالية اكتملت. ابحث عن اسم البطولة في سجلات المكتبة أو استورد بياناتها المرخصة بعد مراجعتها.</p>}
   </section>
   <section className="atlas-library-main"><h3>استكشف المكتبة</h3>
    <div className="atlas-toolbar">
      <label className="atlas-search">بحث سريع<Search size={14}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم اللاعب أو النادي أو معرفه..." /></label>
      <label><Filter size={14}/> التصنيف<select value={filter} onChange={e=>setFilter(e.target.value)}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <span className="atlas-page-meta">{loading?'جارٍ التحميل':items.length.toLocaleString('ar-SA')+' نتيجة في البحث الحالي'}</span>
    </div>
    <div className="atlas-split"><div>
      <div className="atlas-results">{pageItems.map(item=><button key={item.id} type="button" className={'atlas-entity-card '+(selected?.id===item.id?'active':'')} onClick={()=>void inspect(item)}>
         <Portrait item={item}/><span><strong>{item.name_ar}</strong><small>{item.name_en}</small><small>{labels[item.entity_type]||item.entity_type} · {item.metadata?.verification==='reviewed'?'تمت مراجعة الهوية':'بانتظار مراجعة الهوية'}</small></span><ChevronLeft size={17} color="#b7d0bb"/></button>)}
       {!loading&&items.length===0&&<div className="atlas-empty"><Database size={30}/><h4>لا توجد سجلات مطابقة</h4><p>جرّب بحثًا مختلفًا، أو استورد بيانات موثّقة المصدر لإضافتها إلى المكتبة.</p></div>}
       {loading&&items.length===0&&<div className="atlas-empty">جارٍ تحميل السجلات…</div>}
      </div>
      {items.length>24&&<div className="atlas-actions" style={{justifyContent:'center',marginTop:15}}>
       <button className="atlas-btn" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-24))}>السابق</button>
       <span className="atlas-page-meta">{offset+1}–{Math.min(offset+24,items.length)} من {items.length}</span>
       <button className="atlas-btn" disabled={offset+24>=items.length} onClick={()=>setOffset(v=>v+24)}>التالي</button>
      </div>}
    </div>
    <aside className="atlas-detail">
     {selected?<><div className="atlas-detail-top"><Portrait item={selected} size={76}/><div><h4>{selected.name_ar}</h4><small>{selected.name_en}</small><div><span className="atlas-status">{selected.metadata?.verification==='reviewed'?'الهوية مدققة':'بانتظار المراجعة'}</span></div></div></div>
       <p>التصنيف: {labels[selected.entity_type]||selected.entity_type}</p>
       <p>آخر تاريخ تحقق: {selected.metadata?.verifiedAt||'غير محدد'}</p>
       <p>الصورة: {mimeImage(selected.image_key)?'محفوظة محليًا':selected.metadata?.externalImage?'معاينة من ويكيميديا (غير مضمنة في EXE)':'لم يُعثر على صورة معتمدة'}</p>
       {selected.image_license&&<p>الترخيص المسجل: {selected.image_license}</p>}{selected.metadata?.externalImage&&<p>صورة من <a href={selected.metadata.externalImage.source} target="_blank" rel="noopener noreferrer">ويكيميديا كومنز</a> · الرخصة: {selected.metadata.externalImage.license} · المصور: {selected.metadata.externalImage.artist||'غير مذكور'}</p>}
       {selected.metadata?.source&&<a href={selected.metadata.source} target="_blank" rel="noopener noreferrer" className="atlas-btn"><LinkIcon size={14}/> المصدر الأساسي</a>}
       {!mimeImage(selected.image_key)&&<button type="button" disabled={working} className="atlas-btn" onClick={async()=>{setWorking(true);setError('');try{const result=await api<{status:string}>('/admin/football-image-discover',{id:selected.id});setMessage(result.status==='candidate'?'عُثر على صورة مع مصدرها ورخصتها.':'لم تُطابق خدمة الصور هوية هذا السجل بشكل موثوق: '+result.status);await reload();}catch(e:any){setError(e.message)}finally{setWorking(false)}}}><ImageIcon size={15}/> جلب صورة مطابقة من الإنترنت</button>}
       <h4 style={{fontSize:16,marginTop:25}}>السجل التاريخي</h4>
       <div className="atlas-timeline">{timeline.length?timeline.map(h=><div className="atlas-timeline-item" key={h.id}><strong>{labels[h.relation_type]||h.relation_type}: {h.from_name===selected.name_ar?h.to_name:h.from_name}</strong><small>{h.starts_at||'غير مؤرخ'} – {h.ends_at||'مستمر / غير محدد'}</small><a href={h.source} rel="noopener noreferrer" target="_blank" className="atlas-page-meta">عرض الإثبات <ArrowUpLeft size={12}/></a></div>):<p className="atlas-page-meta">لا توجد علاقات مؤرخة في هذا السجل حتى الآن.</p>}</div>
       {canReview&&selected.metadata?.verification!=='reviewed'&&<div className="atlas-review"><label>إثبات مراجعة مستقل<input type="url" dir="ltr" placeholder="https://…" value={reviewSource} onChange={e=>setReviewSource(e.target.value)}/></label><button type="button" className="atlas-btn" disabled={working||!reviewSource.startsWith('https://')} onClick={()=>void mutate('football-entity-review',{id:selected.id,evidenceUrl:reviewSource},'تم اعتماد مراجعة الهوية. لا يشمل ذلك الموافقة على حقوق الصور.')}>اعتماد الهوية</button></div>}
       <button type="button" className="atlas-btn" style={{marginTop:14}} onClick={()=>{setSelected(null);setTimeline([])}}><X size={14}/> إغلاق التفاصيل</button>
     </>:<div className="atlas-empty" style={{padding:16}}><BookOpen size={30}/><h4>بطاقة المعلومات</h4><p>اختر لاعبًا أو ناديًا أو منتخبًا لعرض بياناته ومصادره وسجله التاريخي في هذا المكان.</p></div>}
    </aside></div>
   </section>
   <details className="atlas-create"><summary><Database size={16} style={{display:'inline'}}/> استيراد قاعدة بيانات موسم موثقة من JSON</summary>
    <p className="atlas-page-meta">يدعم كيانات مترابطة وصورًا مخزنة في مكتبتك المحلية فقط. لا يقبل صور Base64 أو روابط عشوائية. افحص الدفعة قبل اعتمادها.</p>
    <input type="file" accept=".json,application/json" onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null)}} />
    <div className="atlas-actions" style={{marginTop:12}}>
      <button type="button" className="atlas-btn" disabled={!file||working} onClick={async()=>{
       if(!file)return;setWorking(true);setError('');
       try{if(file.size>1800000)throw new Error('الحد الأقصى 1.8 ميجابايت');const batch=JSON.parse(await file.text());
        const result=await api('/admin/football-import-batch',{batch,dryRun:true});setPreview({batch,result});}
       catch(e:any){setError(e.message)}finally{setWorking(false)}
      }}>فحص الدفعة دون تعديل البيانات</button>
      {preview&&<button className="atlas-btn main" type="button" disabled={working} onClick={async()=>{
       if(!window.confirm('تأكيد إضافة السجلات والعلاقات بعد الفحص؟'))return;setWorking(true);
       try{const result=await api('/admin/football-import-batch',{batch:preview.batch,dryRun:false});setMessage('تمت إضافة '+result.added+' سجلات و'+result.linked+' علاقات؛ الصور الناقصة: '+result.missingImages);setPreview(null);await reload();}
       catch(e:any){setError(e.message)}finally{setWorking(false)}
      }}>اعتماد الاستيراد</button>}
    </div>
    {preview&&<p className="atlas-notice">المعاينة: {preview.result.entities} كيانًا، {preview.result.relations} علاقة، صور ناقصة: {preview.result.missingImages}</p>}
   </details>
   <details className="atlas-create"><summary><Plus size={15} style={{display:'inline'}}/> إضافة كيان جديد إلى المكتبة</summary>
    <p className="atlas-page-meta">السجلات الجديدة لا تُعد موثقة تلقائيًا، ولا تُنشأ صور من أسماء العناصر.</p>
    <div className="atlas-create-grid">
     <label>التصنيف<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{CATEGORIES.filter(c=>c.id).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
     {([['externalKey','المعرف المرجعي'],['nameAr','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['source','رابط المصدر الرسمي HTTPS']] as const).map(([key,title])=><label key={key}>{title}<input value={form[key]} dir={key==='nameAr'?'rtl':'ltr'} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></label>)}
     <label>تاريخ التحقق<input type="date" value={form.verifiedAt} onChange={e=>setForm(f=>({...f,verifiedAt:e.target.value}))}/></label>
    </div><button type="button" className="atlas-btn main" disabled={working} onClick={()=>void mutate('football-entity-create',form,'تمت إضافة الكيان في وضع انتظار المراجعة')}>حفظ السجل</button>
   </details>
   {message&&<p className="atlas-notice" role="status"><CheckCircle2 size={17} style={{display:'inline'}}/> {message}</p>}
   {error&&<p className="atlas-notice" role="alert" style={{color:'#ffb9b9',borderColor:'#b66666'}}><AlertTriangle size={17} style={{display:'inline'}}/> {error}</p>}
 </div>;
}
