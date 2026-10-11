"""Collect DFB's explicit 2026/27 Bundesliga roster evidence, retaining unlinked players."""
import datetime,hashlib,json,re
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup

BASE=Path(__file__).resolve().parents[1]
DIRECTORY='https://datencenter.dfb.de/competitions/bundesliga/seasons/2026-2027/teams'
def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)
def fetch(url):
 if urlparse(url).scheme!='https' or urlparse(url).hostname!='datencenter.dfb.de':raise ValueError('Unexpected DFB source')
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 HuroofAlKora source collector'}),timeout=30) as response:
  if urlparse(response.url).scheme!='https' or urlparse(response.url).hostname!='datencenter.dfb.de':raise ValueError('Unexpected DFB redirect')
  data=response.read(9000001)
 if len(data)>9000000:raise ValueError('Oversized DFB document')
 digest=hashlib.sha256(data).hexdigest();cache=BASE/'sources/html'/('dfb-'+digest+'.html');cache.parent.mkdir(parents=True,exist_ok=True);cache.write_bytes(data)
 return data.decode('utf-8'),digest
def directory(html):
 soup=BeautifulSoup(html,'html.parser');title=soup.find('title')
 if not title or 'Saison 2026/2027' not in title.get_text():raise ValueError('DFB directory season differs')
 clubs=[]
 for anchor in soup.find_all('a'):
  href=anchor.get('href','');match=re.fullmatch(r'/competitions/bundesliga/seasons/2026-2027/teams/([a-z0-9-]+)\?datacenter_name=datencenter',href)
  if match:clubs.append({'sourceClubId':match[1],'sourceIdNamespace':'dfb-season-club-slug','canonicalClubId':None,'nameOriginal':anchor.get_text(' ',strip=True),'profileUrl':'https://datencenter.dfb.de'+href})
 if len(clubs)!=18 or len({c['sourceClubId'] for c in clubs})!=18:raise ValueError('Incomplete or duplicate Bundesliga directory')
 return clubs
def squad(html,club_id):
 soup=BeautifulSoup(html,'html.parser');heading=next((h for h in soup.find_all('h3') if h.get_text(' ',strip=True)=='Kader Bundesliga 2026/2027'),None)
 if heading is None:raise ValueError('DFB squad season differs or missing roster')
 root=heading.find_next('table')
 if root is None:raise ValueError('Missing DFB roster table')
 players=[];coaches=[]
 positions={'Torwart':'GK','Abwehr':'DF','Mittelfeld':'MF','Sturm':'FW'}
 for table in root.find_all('table'):
  header=table.find('th');role=header.get_text(' ',strip=True) if header else ''
  if role not in positions and role!='Trainer':raise ValueError('Unexpected DFB roster role '+role)
  for row in table.select('tr.c-Table-body-row'):
   cells=row.find_all('td',recursive=False)
   if len(cells)!=3:raise ValueError('Unexpected DFB roster columns')
   shirt=cells[0].get_text(' ',strip=True);name=cells[1].get_text(' ',strip=True);birth=cells[2].get_text(' ',strip=True);anchor=cells[1].find('a')
   if not name or (shirt and not shirt.isdigit()):raise ValueError('Missing name or invalid shirt')
   dob=datetime.datetime.strptime(birth,'%d.%m.%Y').date().isoformat() if birth else None
   identity=None;profile=None
   if anchor:
    profile=anchor.get('href','');parsed=urlparse(profile);match=re.fullmatch(r'/profil/([0-9]+)',parsed.path)
    if parsed.scheme!='https' or parsed.hostname!='datencenter.dfb.de' or not match:raise ValueError('Unexpected DFB person profile')
    identity=match[1]
   person={'sourcePersonId':identity,'sourceIdNamespace':'dfb-person','sourceClubId':club_id,'canonicalPersonId':None,'nameOriginal':name,'dateOfBirth':dob,'shirtNumber':int(shirt) if shirt else None,'position':positions.get(role),'roleAsPublished':role,'profileUrl':profile,'verification':'pending-identity-and-roster-review'}
   (coaches if role=='Trainer' else players).append(person)
 if not players or not coaches or len({(p['nameOriginal'],p['dateOfBirth']) for p in players})!=len(players):raise ValueError('Incomplete or duplicate DFB roster')
 return {'sourceClubId':club_id,'players':players,'coaches':coaches,'season':'2026-2027','verifiedAt':datetime.date.today().isoformat()}
def main():
 html,digest=fetch(DIRECTORY);clubs=directory(html);results=[];failures=[]
 def collect(club):
  html,digest=fetch(club['profileUrl']);result=squad(html,club['sourceClubId']);result.update(club=club,source=club['profileUrl'],sourceSha256=digest);return result
 with ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(collect,c):c for c in clubs}
  for future in as_completed(jobs):
   try:results.append(future.result())
   except Exception as e:failures.append({'club':jobs[future]['sourceClubId'],'error':str(e)})
   save(BASE/'reports/DFB_COLLECTION.json',{'directorySource':DIRECTORY,'directorySha256':digest,'clubs':len(clubs),'squads':len(results),'players':sum(len(r['players']) for r in results),'coaches':sum(len(r['coaches']) for r in results),'failures':failures,'releaseReady':False})
 if not failures and len(results)==18:save(BASE/'data/dfb_squad_candidates_2026_27.json',{'source':DIRECTORY,'sourceSha256':digest,'clubs':clubs,'squads':sorted(results,key=lambda r:r['sourceClubId']),'releaseReady':False})
 else:save(BASE/'reports/DFB_ROSTER_CHECKPOINT.json',results)
 print(json.dumps({'squads':len(results),'players':sum(len(r['players']) for r in results),'failures':failures}))
if __name__=='__main__':main()
