"use client";
import React,{useEffect,useState} from 'react';
import {api,navigate} from './api';
import {ArrowRight,Search,Users,Shield,Trophy,CalendarDays,Flag,ArrowUpLeft,Globe2,MapPin,BarChart3,Clock3,Goal,Image as ImageIcon} from 'lucide-react';
import './FootballAtlasViewer.css';
type Item={id:string;entity_type:string;name_ar:string;name_en:string;image_key:string|null;metadata:any};
type Result={items:Item[];total:number;page:number;pageSize:number;summary:{type:string;total:number}[]};
type Relation={relation:string;from:string|null;to:string|null;source:string;entity:Item;metadata:any};
type Detail={entity:Item;related:Relation[];metrics:Record<string,string|number>;statsVerified:boolean};
const filters=[['','الكل'],['player','اللاعبون'],['club','الأندية'],['national_team','المنتخبات'],['competition','البطولات'],['fixture','المباريات'],['season','المواسم'],['coach','المدربون'],['stadium','الملاعب']];
const typeName:Record<string,string>={player:'لاعب',club:'نادي',national_team:'منتخب',competition:'بطولة',fixture:'مباراة',season:'موسم',coach:'مدرب',stadium:'ملعب'};
const statLabels:Record<string,string>={dateOfBirth:'تاريخ الميلاد',position:'المركز',nationality:'الجنسية',heightCm:'الطول (سم)',preferredFoot:'القدم المفضلة',shirtNumber:'رقم القميص',marketValue:'القيمة السوقية',contractUntil:'نهاية العقد',season:'الموسم',venue:'الملعب',kickoff:'وقت المباراة',score:'النتيجة',coach:'المدرب',founded:'سنة التأسيس',country:'الدولة',appearances:'المشاركات',goals:'الأهداف',assists:'صناعة الأهداف',minutes:'الدقائق',yellowCards:'البطاقات الصفراء',redCards:'البطاقات الحمراء',rating:'التقييم',shots:'التسديدات',xG:'الأهداف المتوقعة',xA:'الصناعة المتوقعة',cleanSheets:'شباك نظيفة',competition:'المسابقة'};
const statKeys=new Set(['appearances','goals','assists','minutes','yellowCards','redCards','rating','shots','xG','xA','cleanSheets']);
const iconFor=(type:string)=>type==='player'||type==='coach'?Users:type==='club'?Shield:type==='competition'?Trophy:type==='fixture'?CalendarDays:type==='national_team'?Flag:type==='stadium'?MapPin:Globe2;
function Image({item,size=64}:{item:Item;size?:number}){
 const uri=item.image_key?.startsWith('/api/visual-media/')?item.image_key:(item.metadata?.externalImage?.url||'');
 const safe=uri.startsWith('/api/visual-media/')||uri.startsWith('https://upload.wikimedia.org/');
 const [broken,setBroken]=useState(false);const Icon=iconFor(item.entity_type);
 useEffect(()=>setBroken(false),[uri]);
 return <span className="fav-photo" style={{width:size,height:size}}>{safe&&!broken?<img src={uri} loading="lazy" alt={item.name_ar} onError={()=>setBroken(true)}/>:<Icon size={Math.max(18,size*.38)}/>}</span>;
}
export default function FootballAtlasViewer(){
 const [kind,setKind]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[data,setData]=useState<Result|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null),[tab,setTab]=useState('overview'),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [id,setId]=useState<string|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>{setLoading(true);api<Result>('/atlas/explore?'+new URLSearchParams({type:kind,q:query,page:String(page)})).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))},180);return ()=>clearTimeout(timer)},[kind,query,page]);
 const open=async(item:Item)=>{setId(item.id);setTab('overview');setError('');try{const next=await api<Detail>('/atlas/detail?id='+encodeURIComponent(item.id));setDetail(next)}catch(e:any){setError(e.message)}};
 const close=()=>{setId(null);setDetail(null);setTab('overview')};
 const related=(detail?.related||[]).filter(x=>tab==='career'?['played_for','loaned_to','selected_for'].includes(x.relation):tab==='matches'?['appeared_in','participated_in'].includes(x.relation):true);
 const stats=Object.entries(detail?.metrics||{}).filter(([k])=>statKeys.has(k));
 const facts=Object.entries(detail?.metrics||{}).filter(([k])=>!statKeys.has(k));
 const tabs=detail?.entity.entity_type==='player'? [['overview','ملف اللاعب'],['stats','الإحصائيات'],['matches','المباريات'],['career','المسيرة والانتقالات']]:detail?.entity.entity_type==='fixture'?[['overview','المباراة'],['squad','التشكيلة'],['stats','الإحصائيات']]:[['overview','نظرة عامة'],['squad','اللاعبون والفرق'],['matches','المباريات'],['stats','الإحصائيات']];
 return <main className="container football-viewer" dir="rtl">
 <section className="fav-hero"><div><small>HUROOF FOOTBALL ATLAS</small><h1>الموسوعة الكروية</h1><p>استكشف اللاعبين والأندية والمنتخبات والبطولات والمسيرات، واختر أي بطاقة لفتح ملفها الكامل بالمعلومات المتاحة.</p></div><span className="fav-hero-emblem"><Trophy size={48}/></span></section>
 <div className="fav-counters">{[['player','لاعبون',Users],['club','أندية',Shield],['national_team','منتخبات',Flag],['competition','بطولات',Trophy]] .map(([type,title,Icon]:any)=><div key={type}><Icon size={21}/><strong>{(data?.summary.find(s=>s.type===type)?.total||0).toLocaleString('ar-SA')}</strong><small>{title}</small></div>)}</div>
 <section className="fav-main"><div className="fav-heading"><h2>استكشف كرة القدم</h2><p>صور، بطاقات، ومسيرات مترابطة — ليست أوامر الإدارة</p></div>
 <label className="fav-search"><Search size={19}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);close()}} placeholder="ابحث باسم لاعب أو نادي أو بطولة…" aria-label="ابحث في الموسوعة"/></label>
 <div className="fav-filters">{filters.map(([value,label])=><button key={value} type="button" className={kind===value?'active':''} onClick={()=>{setKind(value);setPage(1);close()}}>{label}</button>)}</div>
 {error&&<p className="fav-absent" role="alert">{error}</p>}
 <div className="fav-layout"><div className="fav-list">{loading?<div className="fav-absent">جارٍ عرض الملفات الكروية…</div>:data?.items.length?data.items.map(item=><button className={'fav-card '+(id===item.id?'selected':'')} onClick={()=>void open(item)} key={item.id}><Image item={item} size={66}/><span><b>{item.name_ar}</b><small>{item.name_en}</small><small>{typeName[item.entity_type]||item.entity_type}</small></span><ArrowUpLeft size={18}/></button>):<div className="fav-absent">لا توجد نتائج لهذا البحث في البيانات المستوردة.</div>}
 <div className="fav-pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}>السابق</button><span>صفحة {page} · {data?.total||0} سجل</span><button disabled={!data||page*24>=data.total} onClick={()=>setPage(page+1)}>التالي</button></div></div>
 <aside className="fav-profile">{detail?<><header className="fav-profile-header"><button className="fav-close" onClick={close} aria-label="إغلاق">×</button><Image item={detail.entity} size={102}/><h2>{detail.entity.name_ar}</h2><p>{detail.entity.name_en}</p><span className="fav-tag">{typeName[detail.entity.entity_type]||'ملف كروي'}</span></header>
 <nav className="fav-tabs">{tabs.map(([k,title])=><button className={tab===k?'active':''} key={k} onClick={()=>setTab(k)}>{title}</button>)}</nav>
 {tab==='overview'&&<div className="fav-section"><h3>معلومات {typeName[detail.entity.entity_type]||'الملف'}</h3>{facts.length?<div className="fav-facts">{facts.map(([k,v])=><div key={k}><small>{statLabels[k]||k}</small><strong>{String(v)}</strong></div>)}</div>:<p className="fav-muted">معلومات الهوية متوفرة، والخصائص التفصيلية غير مدخلة في المصدر الحالي بعد.</p>}
 <h3>روابط كروية</h3>{detail.related.length?<div className="fav-related">{detail.related.slice(0,12).map((r,i)=><button key={i} onClick={()=>void open(r.entity)}><Image item={r.entity} size={38}/><span>{r.entity.name_ar}<small>{r.from||'التاريخ غير محدد'}</small></span><ArrowUpLeft size={14}/></button>)}</div>:<p className="fav-muted">لم تُسجل ارتباطات تاريخية لهذا الملف بعد.</p>}</div>}
 {tab==='stats'&&<section className="fav-section"><h3><BarChart3 size={18}/> إحصائيات اللاعب أو الفريق</h3>{stats.length&&detail.statsVerified?<div className="fav-stats">{stats.map(([k,v])=><div key={k}><strong>{String(v)}</strong><small>{statLabels[k]}</small></div>)}</div>:<p className="fav-muted">لا توجد إحصائيات موسمية معتمدة لهذا الملف حاليًا. لن نعرض أرقامًا تخمينية.</p>}</section>}
 {(tab==='career'||tab==='matches'||tab==='squad')&&<section className="fav-section"><h3>{tab==='career'?'المسيرة والانتقالات':tab==='matches'?'سجل المباريات':'العناصر المرتبطة'}</h3>{related.length?<div className="fav-related">{related.map((r,i)=><button key={i} onClick={()=>void open(r.entity)}><Image item={r.entity} size={42}/><span>{r.entity.name_ar}<small>{r.from||'بدون تاريخ'} {r.to?'– '+r.to:''}</small></span><ArrowUpLeft size={14}/></button>)}</div>:<p className="fav-muted">لا يوجد سجل موثق لهذا القسم بعد.</p>}</section>}
 <footer className="fav-source"><Clock3 size={14}/> تاريخ السجل: {detail.entity.metadata?.verifiedAt||'غير محدد'}{detail.entity.metadata?.source&&<a href={detail.entity.metadata.source} target="_blank" rel="noopener noreferrer">المصدر <ArrowUpLeft size={12}/></a>}</footer>
 </>:<div className="fav-placeholder"><Goal size={42}/><h3>اختر أي بطاقة</h3><p>تظهر هنا صورة اللاعب أو شعار الفريق، وتفاصيله ومسيرته ومبارياته وإحصائياته المسجلة.</p></div>}</aside></div>
 </section>
 </main>;
}