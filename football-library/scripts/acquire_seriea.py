"""Official Serie A first-team evidence; source identities await reconciliation."""
import datetime,hashlib,json,re,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
BASE=Path(__file__).resolve().parents[1]
def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
def embedded(html):
 chunks=[];records=[]
 for script in BeautifulSoup(html,'html.parser').find_all('script'):
  match=re.fullmatch(r'self\.__next_f\.push\((.*)\)',script.string or '',re.S)
  if match:
   args=json.loads(match[1])
   if isinstance(args,list) and len(args)==2 and args[0]==1 and isinstance(args[1],str):chunks.append(args[1])
 def walk(v,depth=0):
  if depth>80:raise ValueError('Excessive embedded nesting')
  if isinstance(v,dict):
   records.append(v)
   for x in v.values():walk(x,depth+1)
  elif isinstance(v,list):
   for x in v:walk(x,depth+1)
  elif isinstance(v,str) and v.startswith(('{','[')):
   try:d=json.loads(v)
   except json.JSONDecodeError:return
   walk(d,depth+1)
 for line in ''.join(chunks).splitlines():
  try:d=json.loads(line.partition(':')[2])
  except json.JSONDecodeError:continue
  walk(d)
 return records
def current_season(records):
 values={r.get('extraData',{}).get('seasonId') for r in records if r.get('title')=='2026/2027' and r.get('extraData',{}).get('isCurrent') is True}
 # Different competitions have different season IDs. Restrict to the Serie A competition tags.
 competitions=[r for r in records if r.get('slug')=='serie-a' and r.get('fields',{}).get('name')=='Serie A Enilive']
 if competitions:
  values={t['extraData']['seasonId'] for c in competitions for t in c.get('tags',[]) if t.get('title')=='2026/2027' and t.get('extraData',{}).get('isCurrent') is True}
 if len(values)!=1 or not re.fullmatch(r'serie-a::Football_Season::[a-f0-9]{32}',next(iter(values),'') or ''):raise ValueError('Missing unique current Serie A 2026/2027 season')
 return values.pop()
def directory(html):
 season=current_season(embedded(html));clubs={}
 for a in BeautifulSoup(html,'html.parser').find_all('a',href=True):
  link=re.fullmatch(r'https://www\.legaseriea\.it/team/([a-z0-9-]+)/',a['href']);img=a.find('img');heading=a.find('h3')
  if not link or not img or not heading:continue
  logo=re.fullmatch(r'https://media-sdp\.legaseriea\.it/clubLogos/([a-f0-9]{32})\.webp',img.get('src',''))
  if not logo:raise ValueError('Invalid official club logo identity')
  club={'sourceClubId':logo[1],'slug':link[1],'nameEn':heading.get_text(' ',strip=True),'profileUrl':a['href'],'logoSource':img['src'],'sourceSeasonId':season,'canonicalClubId':None}
  if logo[1] in clubs and clubs[logo[1]]!=club:raise ValueError('Conflicting official club directory')
  clubs[logo[1]]=club
 if len(clubs)!=20:raise ValueError('Incomplete Serie A club directory')
 return list(clubs.values())
def number(value,low,high):
 if value in (None,'','0',0):return None
 n=int(value)
 if not low<=n<=high:raise ValueError('Invalid published measurement')
 return n
def squad(html,club):
 soup=BeautifulSoup(html,'html.parser')
 records=embedded(html);season=current_season(records)
 if club.get('sourceSeasonId') and club['sourceSeasonId']!=season:raise ValueError('Directory and squad seasons differ')
 teamid='serie-a::Football_Team::'+club['sourceClubId'];teams=[r for r in records if r.get('teamId')==teamid and r.get('teamType')=='prima_squadra' and isinstance(r.get('coach'),dict)];players={}
 if not teams:raise ValueError('First-team evidence absent')
 names={club['nameEn']}|{t.get(k) for t in teams for k in ('officialName','mediaName','mediaShortName','shortName') if t.get(k)}
 if not soup.h1 or soup.h1.get_text(' ',strip=True) not in names:raise ValueError('Official squad club name mismatch')
 for r in records:
  if 'playerId' not in r or 'dateOfBirth' not in r or r.get('teamId')!=teamid:continue
  pid=r['playerId'];match=re.fullmatch(r'serie-a::Football_Player::([a-f0-9]{32})',pid)
  if not match or r.get('seasonId')!=season:raise ValueError('Player season or source identity differs')
  person=match[1];url=r.get('playerUrl')
  if url is not None:
   parsed=urlparse(url);slug=parsed.path.removeprefix('/players/').removesuffix('/')
   if parsed.scheme!='https' or parsed.hostname!='www.legaseriea.it' or parsed.query or parsed.fragment or not parsed.path.startswith('/players/') or not parsed.path.endswith('/') or not slug or not all(c.isalnum() or c=='-' for c in slug):raise ValueError('Invalid player profile URL')
  photo=r.get('playerImage');pm=re.fullmatch(r'https://media-sdp\.legaseriea\.it/playerImages/([a-f0-9]{32})/([a-f0-9]{32})/([a-f0-9]{32})/home/([a-f0-9]{32})_(left|middle|right)\.webp',photo or '')
  if photo and (not pm or pm[2]!=season.rsplit('::',1)[1] or pm[3]!=club['sourceClubId'] or pm[4]!=person):raise ValueError('Portrait context identity differs')
  dob=r.get('dateOfBirth')
  if dob:dob=dob[:10];datetime.date.fromisoformat(dob)
  value={'sourcePersonId':person,'sourceIdNamespace':'serie-a-person','canonicalPlayerId':None,'sourceClubId':club['sourceClubId'],'sourceSeasonId':season,'nameOriginal':r.get('shortName'),'firstNameAsPublished':r.get('mediaFirstName'),'lastNameAsPublished':r.get('mediaLastName'),'dateOfBirth':dob,'heightCm':number(r.get('height'),120,230),'weightKg':number(r.get('weight'),35,150),'shirtNumber':number(r.get('bibNumber'),1,99),'positionAsPublished':r.get('roleLabel'),'nationalityAsPublished':r.get('nationality'),'nationalityCodeAsPublished':r.get('nationalityIsoCode'),'statusAsPublished':r.get('playerStatus'),'profileUrl':url,'portraitSource':photo,'verification':'pending-source-comparison-and-identity-review','rights':'not-cleared-for-redistribution'}
  if not value['nameOriginal']:raise ValueError('Missing player name')
  if person in players and players[person]!=value:raise ValueError('Conflicting player evidence')
  players[person]=value
 if not players:raise ValueError('Missing first-team players')
 contexts={json.dumps(t,sort_keys=True) for t in teams}
 if len(contexts)!=1:raise ValueError('Conflicting first-team coach or metadata')
 t=teams[0];coach=t['coach'];staff=coach.get('staffId','')
 if not re.fullmatch(r'serie-a::Football_Official::[a-f0-9]{32}',staff) or coach.get('roleLabel')!='Head Coach':raise ValueError('Missing head coach identity')
 return {'club':club,'players':list(players.values()),'coach':coach,'clubDetails':{k:t.get(k) for k in ('officialName','mediaName','acronymName','countryCode','primaryColor','yearFoundation','stadium','links')},'season':'2026-2027','sourceSeasonId':season,'scope':'club-first-team-only','verification':'official senior squad evidence; registration and identity review pending','verifiedAt':datetime.date.today().isoformat()}
def fetch(url):
 if urlparse(url).scheme!='https' or urlparse(url).hostname!='www.legaseriea.it':raise ValueError('Unexpected source host')
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 HuroofAlKora evidence collector'}),timeout=30) as r:
  if urlparse(r.url).hostname!='www.legaseriea.it' or urlparse(r.url).scheme!='https':raise ValueError('Unexpected redirect')
  data=r.read(10000001)
 if len(data)>10000000:raise ValueError('Oversized official document')
 digest=hashlib.sha256(data).hexdigest();p=BASE/'sources/html'/('seriea-'+digest+'.html');p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return data.decode('utf8'),digest
def main():
 html,digest=fetch('https://www.legaseriea.it/serie-a/index');clubs=directory(html);checkpoint=BASE/'reports/SERIEA_ROSTER_CHECKPOINT.json';results=[];failures=[]
 if checkpoint.exists():
  prior=json.loads(checkpoint.read_text())
  if prior['participantSourceSha256']==digest:results=prior['squads']
 done={r['club']['sourceClubId'] for r in results}
 def collect(c):
  url=c['profileUrl'].rstrip('/')+'/squad';h,sha=fetch(url);r=squad(h,c);r.update(source=url,sourceSha256=sha);return r
 save(BASE/'data/seriea_participant_candidates_2026_27.json',{'clubs':clubs,'source':'https://www.legaseriea.it/serie-a/index','sourceSha256':digest,'season':'2026-2027','releaseReady':False})
 with ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(collect,c):c for c in clubs if c['sourceClubId'] not in done}
  for future in as_completed(jobs):
   try:results.append(future.result())
   except Exception as error:failures.append({'club':jobs[future]['sourceClubId'],'source':jobs[future]['profileUrl']+'squad','error':str(error)})
   save(checkpoint,{'participantSourceSha256':digest,'squads':results})
   save(BASE/'reports/SERIEA_COLLECTION.json',{'clubs':len(clubs),'squads':len(results),'registrations':sum(len(r['players']) for r in results),'coaches':len(results),'failures':failures,'releaseReady':False})
 if len(results)==len(clubs) and not failures:save(BASE/'data/seriea_squad_candidates_2026_27.json',{'participantSourceSha256':digest,'squads':sorted(results,key=lambda r:r['club']['sourceClubId']),'releaseReady':False})
 print(json.dumps({'clubs':len(clubs),'squads':len(results),'registrations':sum(len(r['players']) for r in results),'failures':failures}))
if __name__=='__main__':main()
