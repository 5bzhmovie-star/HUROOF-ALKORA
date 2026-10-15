"""Collect the published LaLiga senior squad API, scoped to the verified season.

Uses the website's public client configuration only in memory. Never stores or
prints subscription headers. Source data and all image approvals remain pending.
"""
import argparse,concurrent.futures,datetime,hashlib,io,json,re,urllib.request,urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image,ImageStat
BASE=Path(__file__).resolve().parents[1]

def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def classify(payload,team_id):
 rows=payload.get('squads');total=payload.get('total')
 if not isinstance(rows,list) or not isinstance(total,int) or isinstance(total,bool) or total!=len(rows):raise ValueError('Unfinished or invalid squad pagination')
 result={'players':[],'coaches':[],'excluded':[]};seen=set()
 for row in rows:
  if row.get('team',{}).get('id')!=team_id:raise ValueError('Squad belongs to another club')
  p=row.get('person',{});pid=p.get('id')
  if not isinstance(pid,int) or isinstance(pid,bool) or pid<1 or pid in seen:raise ValueError('Invalid or duplicated person identity')
  seen.add(pid);role=row.get('role',{}).get('slug')
  if row.get('current') is not True or row.get('loan_to') is True or p.get('gender')!='male':bucket='excluded'
  elif role=='jugador':bucket='players'
  elif role=='entrenador':bucket='coaches'
  else:bucket='excluded'
  result[bucket].append(row)
 return result

def public_configuration():
 url='https://www.laliga.com/clubes/valencia-cf/plantilla'
 raw=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
 data=json.loads(BeautifulSoup(raw,'html.parser').find('script',id='__NEXT_DATA__').string)
 props=data['props']['pageProps'];cfg=data['runtimeConfig']
 if props.get('season')!='2026' or props.get('competition')!='primera-division' or cfg.get('backendUrl')!='https://apim.laliga.com/public-service':raise ValueError('Published competition/season configuration changed')
 return cfg,{'source':url,'sourceSha256':hashlib.sha256(raw).hexdigest(),'seasonAsPublished':props['season'],'competitionAsPublished':props['competition']}

def api_get(route,cfg):
 url=cfg['backendUrl']+route
 request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Origin':'https://www.laliga.com','Content-Language':'es','Ocp-Apim-Subscription-Key':cfg['backendSubscription']})
 with urllib.request.urlopen(request,timeout=30) as response:
  if urllib.parse.urlparse(response.url).hostname!='apim.laliga.com':raise ValueError('Unexpected API redirect')
  raw=response.read(5000001)
 if len(raw)>5000000:raise ValueError('Source too large')
 sha=hashlib.sha256(raw).hexdigest();path=BASE/'sources/html'/('laliga-squad-'+sha+'.json');path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
 return json.loads(raw),{'source':url,'sourceSha256':sha,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}

def collect_club(club,cfg):
 rows=[];sources=[];offset=0
 for _ in range(10):
  route=f"/api/v1/teams/{club['slug']}/squad?limit=50&offset={offset}&orderField=id&orderType=DESC&seasonYear=2026"
  data,evidence=api_get(route,cfg);sources.append(evidence);page=data.get('squads',[]);rows.extend(page)
  if len(rows)>=data.get('total',-1):break
  if not page:raise ValueError('Empty page before total')
  offset+=len(page)
 result=classify({'total':data.get('total'),'squads':rows},int(club['sourceClubId']))
 if not result['players']:raise ValueError('Empty first-team squad')
 return {'sourceClubId':club['sourceClubId'],'sourceIdNamespace':'laliga','clubSlug':club['slug'],'clubName':club['displayNameEn'],'season':'2026-2027','sources':sources,'publishedRows':len(rows),**result,'formalRegistrationReview':'pending','releaseReady':False}

def portrait(row,size=512):
 # 004 is a game card graphic, not the unadorned club portrait. Use 001 only.
 variants=row.get('photos',{}).get('001',{})
 candidates=[(int(k.split('x')[0]),v) for k,v in variants.items() if re.fullmatch(r'[0-9]+x[0-9]+',k)]
 preferred=[p for p in candidates if p[0]<=size]
 if not preferred:return None
 url=max(preferred)[1];parsed=urllib.parse.urlparse(url)
 if parsed.scheme!='https' or parsed.hostname!='assets.laliga.com' or '/squad/2026/' not in parsed.path:return None
 return url

def validate_portrait(raw):
 if len(raw)>8000000:raise ValueError('Image too large')
 image=Image.open(io.BytesIO(raw));image.verify();image=Image.open(io.BytesIO(raw))
 if image.format!='PNG' or min(image.size)<200:raise ValueError('Inadequate source portrait')
 # Conservative quality screen for the source's solid-black face placeholders.
 # This does not certify a face, identity, shirt or rights; visual review remains required.
 region=image.convert('RGBA').crop((int(image.width*.42),int(image.height*.13),int(image.width*.58),int(image.height*.32)))
 stats=ImageStat.Stat(region)
 if max(stats.mean[:3])<4 and max(stats.stddev[:3])<10:raise ValueError('Published silhouette/blank face; not a real player portrait')
 return image

def collect_media(club,row,kind,size):
 pid=row['person']['id'];cid=club['sourceClubId'];url=portrait(row,size)
 if not url:raise ValueError('No published season portrait')
 relative=f'assets/pending_media/laliga_squads/{cid}/{kind}/{pid}/portrait.png';path=BASE/relative
 if path.exists():raw=path.read_bytes()
 else:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as response:
   if urllib.parse.urlparse(response.url).hostname!='assets.laliga.com':raise ValueError('Unexpected image redirect')
   raw=response.read(8000001)
 image=validate_portrait(raw)
 path.parent.mkdir(parents=True,exist_ok=True)
 if not path.exists():path.write_bytes(raw)
 return {'sourcePersonId':str(pid),'sourceIdNamespace':'laliga','sourceClubId':cid,'nameAsPublished':row['person']['name'],'optaIdAsPublished':row.get('opta_id'),'kind':kind,'season':'2026-2027','file':relative,'source':url,'sourcePage':f"https://www.laliga.com/clubes/{club['clubSlug']}/plantilla",'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'width':image.width,'height':image.height,'identityReview':'pending','kitPeriodReview':'pending','rightsStatus':'pending-review','approvedForQuestions':False}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--media',action='store_true');parser.add_argument('--workers',type=int,choices=range(1,9),default=4);parser.add_argument('--size',type=int,choices=[512,1024],default=512);args=parser.parse_args()
 clubs=json.loads((BASE/'data/laliga_participant_candidates_2026_27.json').read_text())['clubs']
 if len(clubs)!=20 or len({c['sourceClubId'] for c in clubs})!=20:raise ValueError('Participant list invalid')
 cfg,season_evidence=public_configuration();path=BASE/'data/laliga_senior_squads_2026_27.json';result=json.loads(path.read_text()) if path.exists() else {'clubs':[],'failures':[]}
 result.update({'season':'2026-2027','seasonEvidence':season_evidence,'sourceIdNamespace':'laliga','releaseReady':False});done={c['sourceClubId'] for c in result['clubs']}
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  jobs={pool.submit(collect_club,c,cfg):c for c in clubs if c['sourceClubId'] not in done}
  for future in concurrent.futures.as_completed(jobs):
   c=jobs[future];result['failures']=[f for f in result['failures'] if f['sourceClubId']!=c['sourceClubId']]
   try:result['clubs'].append(future.result())
   except Exception as e:result['failures'].append({'sourceClubId':c['sourceClubId'],'error':type(e).__name__+': '+str(e)})
   save(path,result);print(json.dumps({'clubs':len(result['clubs']),'players':sum(len(c['players']) for c in result['clubs']),'failures':len(result['failures'])}),flush=True)
 if args.media:
  report_path=BASE/'reports/LALIGA_SQUAD_MEDIA.json';report=json.loads(report_path.read_text()) if report_path.exists() else {'downloaded':[],'failures':[],'releaseReady':False};done={(x['sourceClubId'],x['kind'],x['sourcePersonId']) for x in report['downloaded']+report.get('rejected',[])}
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
   jobs={pool.submit(collect_media,c,r,kind,args.size):(c,r,kind) for c in result['clubs'] for key,kind in [('players','player'),('coaches','coach')] for r in c[key] if (c['sourceClubId'],kind,str(r['person']['id'])) not in done}
   for future in concurrent.futures.as_completed(jobs):
    c,r,kind=jobs[future];pid=str(r['person']['id']);report['failures']=[f for f in report['failures'] if (f['sourceClubId'],f['sourcePersonId'],f['kind'])!=(c['sourceClubId'],pid,kind)]
    try:report['downloaded'].append(future.result())
    except Exception as e:report['failures'].append({'sourceClubId':c['sourceClubId'],'sourcePersonId':pid,'kind':kind,'name':r['person']['name'],'error':type(e).__name__+': '+str(e)})
    save(report_path,report)
    if (len(report['downloaded'])+len(report['failures']))%10==0:print(json.dumps({'media':len(report['downloaded']),'mediaFailures':len(report['failures'])}),flush=True)
 summary={'clubs':len(result['clubs']),'players':sum(len(c['players']) for c in result['clubs']),'headCoaches':sum(len(c['coaches']) for c in result['clubs']),'excludedOtherStaffInactiveOrLoanedOut':sum(len(c['excluded']) for c in result['clubs']),'failures':result['failures'],'releaseReady':False};save(BASE/'reports/LALIGA_SQUAD_COLLECTION.json',summary);print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
