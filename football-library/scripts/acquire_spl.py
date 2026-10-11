"""Collect official SPL directories and squad portraits as evidence awaiting review."""
import datetime,hashlib,io,json,re,sys,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
from PIL import Image
BASE=Path(__file__).resolve().parents[1]
CACHED={}
PORTRAIT=re.compile(r'^https://media-sdp\.spl\.com\.sa/playerImages/([a-f0-9]{32})/([a-f0-9]{32})/([a-f0-9]{32})/home/([a-f0-9]{32})_middle\.webp$')
def fetch(url):
 parsed=urlparse(url)
 if parsed.scheme!='https' or parsed.hostname not in {'www.spl.com.sa','media-sdp.spl.com.sa'}:raise ValueError('Unexpected official source host')
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'HuroofAlKora evidence collector; offline catalog'}),timeout=30) as response:
    if urlparse(response.url).hostname not in {'www.spl.com.sa','media-sdp.spl.com.sa'}:raise ValueError('Unexpected redirect')
    data=response.read(5000001)
    if len(data)>5000000:raise ValueError('Oversized source')
    return data
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def save_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temporary.replace(path)
def directory(html,language):
 soup=BeautifulSoup(html,'html.parser');result=[]
 for heading in soup.find_all('h5'):
  card=heading.parent.parent.parent;image=heading.parent.find('img');anchor=card.find('a')
  if not image or not anchor:continue
  match=re.fullmatch(r'https://media-sdp\.spl\.com\.sa/clubLogos/([a-f0-9]{32})(?:_light)?\.webp',image.get('src',''))
  if not match:raise ValueError('Unrecognized club logo identity')
  url=anchor.get('href','')
  if not re.fullmatch(r'https://www\.spl\.com\.sa/'+language+r'/teams/[a-z0-9-]+/',url):raise ValueError('Unsafe club URL')
  spans=[s.get_text(' ',strip=True) for s in card.find_all('span',attrs={'translate':'no'})]
  result.append({'sourceClubId':match[1],'name':heading.get_text(' ',strip=True),'profileUrl':url,'logoSource':image['src'],'stadium':spans[0] if spans else None,'city':spans[1] if len(spans)>1 else None})
 if len(result)!=18 or len({c['sourceClubId'] for c in result})!=18:raise ValueError('Incomplete SPL club directory')
 return result
def embedded_players(html,club_id,team_context=None):
 soup=BeautifulSoup(html,'html.parser');chunks=[];found={}
 for script in soup.find_all('script'):
  match=re.fullmatch(r'self\.__next_f\.push\((.*)\)',script.string or '',re.S)
  if not match:continue
  args=json.loads(match[1])
  if isinstance(args,list) and len(args)==2 and args[0]==1 and isinstance(args[1],str):chunks.append(args[1])
 def walk(value,depth=0):
  if depth>80:raise ValueError('Embedded data recursion exceeds limit')
  if isinstance(value,dict):
   if team_context is not None and value.get('teamId')=='spl::Football_Team::'+club_id and 'coach' in value:
    selected={key:value.get(key) for key in ('teamId','seasonId','officialName','yearFoundation','primaryColor','countryCode','stadium','coach','links')}
    if team_context and team_context!=selected:raise ValueError('Conflicting embedded club data')
    team_context.update(selected)
   if 'playerId' in value and 'dateOfBirth' in value and value.get('team',{}).get('teamId')=='spl::Football_Team::'+club_id:
    key=value.get('playerSlug');person=value.get('playerId','')
    if not re.fullmatch(r'spl::Football_Player::[a-f0-9]{32}',person):raise ValueError('Invalid embedded person identity')
    if key is None:key=person
    if not isinstance(key,str):raise ValueError('Invalid embedded player slug')
    if key in found and found[key]!=value:raise ValueError('Conflicting embedded player data')
    found[key]=value
   for child in value.values():walk(child,depth+1)
  elif isinstance(value,list):
   for child in value:walk(child,depth+1)
  elif isinstance(value,str) and value.startswith(('{','[')):
   try:decoded=json.loads(value)
   except json.JSONDecodeError:return
   walk(decoded,depth+1)
 for line in ''.join(chunks).splitlines():
  try:value=json.loads(line.partition(':')[2])
  except json.JSONDecodeError:continue
  walk(value)
 return found
def enrich_players(players,html,club_id):
 published=embedded_players(html,club_id)
 for player in players:
  record=published.get(player['sourceProfileKey'])
  if record is None and player['sourcePersonId']:
   matches=[r for r in published.values() if r['playerId']=='spl::Football_Player::'+player['sourcePersonId']]
   if len(matches)==1:record=matches[0]
  if record is None:
   player['personal']={'dateOfBirth':None,'heightCm':None,'weightKg':None,'statusAsPublished':None,'nationalityAsPublished':None,'publishedFirstName':None,'publishedLastName':None,'preferredFoot':None,'verification':'unavailable-in-embedded-source'}
   player['personalExtractionIssue']='Visible squad player has no matching embedded personal record'
   continue
  person=record['playerId'].rsplit('::',1)[1]
  if player['sourcePersonId'] and player['sourcePersonId']!=person:raise ValueError('Portrait identity differs from official record')
  dob=record.get('dateOfBirth');dob=dob[:10] if isinstance(dob,str) and dob else None
  if dob:datetime.date.fromisoformat(dob)
  def number(field,lower,upper):
   value=record.get(field)
   if value is None or value in ('','0'):return None
   if not str(value).isdigit() or not lower<=int(value)<=upper:raise ValueError('Invalid published '+field)
   return int(value)
  player['sourcePersonId']=person
  player['personal']={'dateOfBirth':dob,'heightCm':number('height',100,250),'weightKg':number('weight',30,200),
   'statusAsPublished':record.get('playerStatus'),'nationalityAsPublished':record.get('nationality'),
   'publishedFirstName':record.get('mediaFirstName'),'publishedLastName':record.get('mediaLastName'),
   'preferredFoot':None,'verification':'pending-source-comparison'}
  player['providerId']=record.get('providerId');player['registeredSeasonIdAsPublished']=record.get('seasonId')
 return players
def parse_squad(html,club_id,source,language='ar'):
 soup=BeautifulSoup(html,'html.parser');players=[]
 for anchor in soup.find_all('a'):
  profile=anchor.get('href','')
  if not re.fullmatch(r'https://www\.spl\.com\.sa/'+language+r'/players/[\w%-]+/',profile):continue
  card=anchor.parent;images=[i for i in card.find_all('img') if i.get('alt','').endswith(' Player Image')]
  if len(images)!=1:raise ValueError('Missing or ambiguous player image card')
  image=images[0];match=PORTRAIT.fullmatch(image.get('src',''));season=competition=person=None;team=club_id;portrait=None
  if match:
   season,competition,team,person=match.groups()
   if team!=club_id:raise ValueError('Portrait jersey context belongs to another club')
   portrait=image['src']
  name=re.sub(r' Player Image$','',image.get('alt','')).strip()
  if not name:raise ValueError('Missing player name')
  header=anchor.find_previous('h2');numbers=[int(t) for t in card.stripped_strings if re.fullmatch(r'[0-9]{1,3}',t)]
  flags=[i.get('alt') for i in card.find_all('img') if '/flags/' in i.get('src','')]
  players.append({'sourcePersonId':person,'sourceProfileKey':urlparse(profile).path.split('/')[3],'sourceClubId':team,'sourceSeasonId':season,'sourceCompetitionId':competition,'canonicalPlayerId':None,
   'nameAr':name if language=='ar' else None,'nameEn':name if language=='en' else None,'profileUrl':profile,'portraitSource':portrait,
   'positionLabel':header.get_text(' ',strip=True) if header else None,'shirtNumber':numbers[0] if len(numbers)==1 else None,
   'nationalityCodeAsPublished':flags[0] if len(flags)==1 else None,'source':source,'verification':'pending','rights':'not-cleared-for-redistribution'})
 if not players or len({p['sourceProfileKey'] for p in players})!=len(players):raise ValueError('Squad cards or identities missing; no partial success allowed')
 return players
def save_image(url,path):
 relative=path.relative_to(BASE).as_posix();cached=CACHED.get(relative)
 data=path.read_bytes() if cached and cached['source']==url and path.is_file() else None
 if data is None or hashlib.sha256(data).hexdigest()!=cached['sha256']:data=fetch(url)
 with Image.open(io.BytesIO(data)) as image:
  image.verify()
 with Image.open(io.BytesIO(data)) as image:
  if image.format!='WEBP' or min(image.size)<64:raise ValueError('Invalid portrait or logo bytes')
  dimensions=list(image.size)
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 return {'path':path.relative_to(BASE).as_posix(),'sha256':hashlib.sha256(data).hexdigest(),'width':dimensions[0],'height':dimensions[1],'bytes':len(data),'source':url,'identityReview':'pending','kitReview':'pending','rightsReview':'pending'}
def coach_portrait(ar,en,club_id):
 staff=ar.get('staffId')
 if staff!=en.get('staffId') or not isinstance(staff,str) or not re.fullmatch(r'spl::Football_Official::[a-f0-9]{32}',staff):raise ValueError('Invalid or conflicting coach identity')
 person=staff.rsplit('::',1)[1]
 for record in (ar,en):
  photo=record.get('coachImage')
  if photo and not re.fullmatch(r'https://media-sdp\.spl\.com\.sa/playerImages/[a-f0-9]{32}/[a-f0-9]{32}/'+club_id+r'/coaches/'+person+r'\.webp',photo):raise ValueError('Coach portrait identity differs from staff identity')
 return ar.get('coachImage') or en.get('coachImage')
def publish_snapshot(clubs,results,failures):
 if failures or len(clubs)!=18 or len(results)!=18 or {c['sourceClubId'] for c in clubs}!={r['club']['sourceClubId'] for r in results}:raise ValueError('Incomplete snapshot cannot be published')
 payload={'clubs':sorted(clubs,key=lambda c:c['sourceClubId']),'squads':sorted(results,key=lambda r:r['club']['sourceClubId']),'failures':[]}
 payload['generationId']=hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
 save_json(BASE/'data/spl_snapshot_2026_27.json',payload)
 save_json(BASE/'data/spl_club_directory_2026_27.json',payload['clubs'])
 save_json(BASE/'data/spl_squad_candidates_2026_27.json',payload['squads'])
 return payload
def load_snapshot():
 payload=json.loads((BASE/'data/spl_snapshot_2026_27.json').read_text());generation=payload.pop('generationId')
 if hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False).encode()).hexdigest()!=generation:raise ValueError('Snapshot generation checksum differs')
 if payload['failures'] or len(payload['clubs'])!=18 or len(payload['squads'])!=18 or {c['sourceClubId'] for c in payload['clubs']}!={r['club']['sourceClubId'] for r in payload['squads']}:raise ValueError('Incomplete saved snapshot')
 return payload['clubs'],payload['squads'],payload['failures']
def collect_rosters():
 arabic=directory(fetch('https://www.spl.com.sa/ar/teams'),'ar');english={c['sourceClubId']:c for c in directory(fetch('https://www.spl.com.sa/en/teams'),'en')}
 if set(english)!={c['sourceClubId'] for c in arabic}:raise ValueError('Arabic and English club directories conflict')
 clubs=[]
 for c in arabic:
  en=english[c['sourceClubId']];clubs.append({'sourceClubId':c['sourceClubId'],'canonicalClubId':None,'nameAr':c['name'],'nameEn':en['name'],
   'stadiumAr':c['stadium'],'stadiumEn':en['stadium'],'cityAr':c['city'],'cityEn':en['city'],'profileAr':c['profileUrl'],'profileEn':en['profileUrl'],
   'logoSource':c['logoSource'],'source':'https://www.spl.com.sa/ar/teams','referenceSeason':'2026-2027','verifiedAt':'2026-10-11','verification':'pending-season-and-canonical-review'})
 results=[];failures=[]
 def collect(club):
  squad_url=club['profileAr']+'squad';ar_html=fetch(squad_url);ar=enrich_players(parse_squad(ar_html,club['sourceClubId'],squad_url),ar_html,club['sourceClubId'])
  en_url=club['profileEn']+'squad';en_html=fetch(en_url);en={p['sourceProfileKey']:p for p in enrich_players(parse_squad(en_html,club['sourceClubId'],en_url,'en'),en_html,club['sourceClubId'])}
  if set(en)!={p['sourceProfileKey'] for p in ar}:raise ValueError('Arabic and English squad identities conflict')
  for p in ar:
   other=en[p['sourceProfileKey']]
   if p['sourcePersonId'] and other['sourcePersonId'] and p['sourcePersonId']!=other['sourcePersonId']:raise ValueError('Arabic and English source person IDs conflict')
   p['nameEn']=other['nameEn'];p['profileEn']=other['profileUrl'];p['positionEn']=other['positionLabel']
   for field in ('dateOfBirth','heightCm','weightKg'):
    left,right=p['personal'][field],other['personal'][field]
    if left is None and right is not None:p['personal'][field]=right;p.setdefault('fieldSourceOverrides',{})[field]=en_url
    elif left is not None and right is not None and left!=right:
     p.setdefault('personalConflicts',{})[field]={'ar':left,'en':right};p['personal'][field]=None
   p['publishedFirstNameEn']=other['personal']['publishedFirstName'];p['publishedLastNameEn']=other['personal']['publishedLastName']
   if not p['portraitSource'] and other['portraitSource']:p['portraitSource']=other['portraitSource'];p['sourcePersonId']=other['sourcePersonId']
  context_ar={};context_en={};embedded_players(ar_html,club['sourceClubId'],context_ar);embedded_players(en_html,club['sourceClubId'],context_en)
  coach_ar=context_ar.get('coach') or {};coach_en=context_en.get('coach') or {}
  if coach_ar.get('staffId')!=coach_en.get('staffId'):raise ValueError('Arabic and English coach identities conflict')
  portrait=coach_portrait(coach_ar,coach_en,club['sourceClubId'])
  staff={'nameAr':coach_ar.get('shortName'),'nameEn':coach_en.get('shortName'),'sourceStaffId':coach_ar.get('staffId'),'canonicalCoachId':None,
   'dateOfBirthAsPublished':coach_ar.get('dateOfBirth'),'nationalityCodeAsPublished':coach_ar.get('nationalityIsoCode'),'portraitSource':portrait,
   'sourceAr':squad_url,'sourceEn':en_url,'verification':'pending','appointedAt':None}
  club['publishedDetails']={key:context_ar.get(key) for key in ('yearFoundation','primaryColor','countryCode','stadium','links')}
  return {'club':club,'players':ar,'coach':staff,'rosterStatus':'website-squad-evidence; approved-registration-review-pending'}
 with ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(collect,c):c for c in clubs}
  for future in as_completed(jobs):
   club=jobs[future]
   try:results.append(future.result())
   except Exception as error:failures.append({'club':club['sourceClubId'],'error':str(error)})
   save_json(BASE/'reports/SPL_ROSTER_CHECKPOINT.json',sorted(results,key=lambda r:r['club']['sourceClubId']))
   save_json(BASE/'reports/SPL_COLLECTION.json',{'clubs':len(clubs),'squads':len(results),'players':sum(len(r['players']) for r in results),'failures':failures,'releaseReady':False})
 if not failures and len(results)==len(clubs):publish_snapshot(clubs,results,failures)
 return clubs,results,failures
def main():
 global CACHED
 manifest=BASE/'reports/SPL_MEDIA_CANDIDATES.json'
 if manifest.is_file():CACHED={entry['path']:entry for entry in json.loads(manifest.read_text())['downloaded']}
 if '--media-only' in sys.argv:
  clubs,results,failures=load_snapshot()
 else:clubs,results,failures=collect_rosters()
 if '--rosters-only' in sys.argv:
  print(json.dumps({'clubs':len(clubs),'squads':len(results),'players':sum(len(r['players']) for r in results),'failures':failures}));return
 images={};image_failures=[];jobs=[]
 for club in clubs:
  team=club['sourceClubId'];jobs.append((club['logoSource'],BASE/'assets/pending_media/spl/clubs'/team/'logo.webp'))
 for result in results:
  club=result['club'];team=club['sourceClubId']
  staff=result.get('coach') or {}
  if staff.get('portraitSource'):
   person=staff['sourceStaffId'].rsplit('::',1)[1]
   if not re.fullmatch(r'[a-f0-9]{32}',person):raise ValueError('Invalid staff identity')
   jobs.append((staff['portraitSource'],BASE/'assets/pending_media/spl/coaches'/person/'clubs'/team/'portrait.webp'))
  for p in result['players']:
   if p['portraitSource']:jobs.append((p['portraitSource'],BASE/'assets/pending_media/spl/players'/p['sourcePersonId']/'clubs'/team/'portrait.webp'))
   else:image_failures.append({'profile':p['profileUrl'],'error':'No genuine portrait on either language squad card; placeholder excluded'})
 limit=32
 for argument in sys.argv:
  if argument.startswith('--media-limit='):limit=int(argument.split('=',1)[1])
 if not 1<=limit<=64:raise ValueError('Media batch must contain 1 to 64 new downloads')
 selected=[];new=0
 for url,path in jobs:
  cached=CACHED.get(path.relative_to(BASE).as_posix())
  if cached and cached['source']==url and path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==cached['sha256']:
   images[cached['path']]=cached
  elif new<limit:selected.append((url,path));new+=1
 with ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(save_image,url,path):(url,path) for url,path in selected}
  for future in as_completed(futures):
   url,path=futures[future]
   try:
    entry=future.result();images[entry['path']]=entry
   except Exception as error:image_failures.append({'source':url,'path':path.relative_to(BASE).as_posix(),'error':str(error)})
   save_json(BASE/'reports/SPL_MEDIA_CANDIDATES.json',{'downloaded':sorted(images.values(),key=lambda entry:entry['path']),'failures':image_failures,'remainingDownloads':len(jobs)-len(images),'releaseReady':False})
 print(json.dumps({'clubs':len(clubs),'squads':len(results),'players':sum(len(r['players']) for r in results),'downloaded':len(images),'remainingDownloads':len(jobs)-len(images),'squadFailures':len(failures),'imageFailures':len(image_failures)}))
if __name__=='__main__':main()
