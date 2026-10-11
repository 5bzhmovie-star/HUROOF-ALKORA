"""Capture UEFA season squad registrations, List B markers and clearly scoped basic stats."""
import datetime,hashlib,json,re,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urlparse,unquote
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
BASE=Path(__file__).resolve().parents[1]
def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)
def number(value):
 if value in ('','-'):return None
 if not value.isdigit():raise ValueError('Invalid published numeric field')
 return int(value)
def squad(html,club):
 soup=BeautifulSoup(html,'html.parser');heading=soup.find('h1')
 if not heading or heading.get_text(' ',strip=True)!=club['nameAsPublished']+' Squad UEFA Champions League 2026/27':raise ValueError('UEFA club identity or season differs')
 players=[];coaches=[];positions={'Goalkeepers':'GK','Defenders':'DF','Midfielders':'MF','Forwards':'FW'}
 for table in soup.select('pk-table.table--squadlist'):
  coach='table--coach' in table.get('class',[]);role=table.find_previous('h2',class_='squadlist--role');label=role.get_text(' ',strip=True) if role else ''
  if not coach and label not in positions:raise ValueError('Unknown UEFA squad position')
  body=table.find('pk-table-body')
  if body is None:raise ValueError('Missing UEFA squad body')
  for row in body.find_all('pk-table-row',recursive=False):
   cells={c.get('column-key'):c for c in row.find_all('pk-table-cell',recursive=False)}
   cell=cells.get('coach' if coach else 'name')
   if cell is None:raise ValueError('Missing UEFA person cell')
   avatar=cell.find('pk-avatar');portrait=avatar.get('src') if avatar else None;photo=re.fullmatch(r'https://img\.uefa\.com/imgml/TP/players/1/2027/324x324/([0-9]+)\.jpg',portrait or '')
   identity=None;profile=None
   if coach:
    name_cell=cell.find(attrs={'itemprop':'name'});name=name_cell.get_text(' ',strip=True) if name_cell else ''
    nation=cell.find(attrs={'slot':'secondary'});nationality=nation.get_text(' ',strip=True) if nation else None;identity=photo[1] if photo else None
   else:
    anchor=cell.find('a');match=re.fullmatch(r'/uefachampionsleague/clubs/players/([0-9]+)--([a-zA-Z0-9%-]+)/',anchor.get('href','') if anchor else '')
    if not match or not anchor.get('title') or not all(c.isalnum() or c=='-' for c in unquote(match[2],errors='strict')):raise ValueError('Missing UEFA player identity')
    identity=match[1];profile='https://www.uefa.com'+anchor['href'];name=anchor['title'];nationality=cells.get('nationality').get_text(' ',strip=True) if cells.get('nationality') else None
   if not name or (nationality and not re.fullmatch(r'[A-Z]{3}',nationality)):raise ValueError('Invalid UEFA name or nationality')
   if photo and photo[1]!=identity:raise ValueError('UEFA portrait person identity differs')
   shirt=cell.find(attrs={'itemprop':'numberedPosition'});primary=cell.find(attrs={'slot':'primary'})
   record={'sourcePersonId':identity,'sourceIdNamespace':'uefa-person','sourceClubId':club['sourceClubId'],'canonicalPersonId':None,'nameOriginal':name,'nationalityCodeAsPublished':nationality,'profileUrl':profile,'portraitSource':portrait if photo else None,'portraitContextEvidence':'season squad page; jersey and temporal identity review pending','dateOfBirth':None,'shirtNumber':number(shirt.get_text(' ',strip=True)) if shirt else None,'position':None if coach else positions[label],'listBAsMarked':False if coach else bool(primary and '*' in primary.get_text()),'verification':'pending-identity-and-context-review'}
   if not coach:
    record['ageAsPublished']=number(cells['age'].get_text(' ',strip=True)) if 'age' in cells else None
    played=number(cells['matches'].get_text(' ',strip=True)) if 'matches' in cells else None;goals=number(cells['goals'].get_text(' ',strip=True)) if 'goals' in cells else None
    record['statistics']={'appearances':played,'goals':None if positions[label]=='GK' else goals,'goalsConceded':goals if positions[label]=='GK' else None,'competition':'uefa-champions-league','season':'2026-2027','scope':'season squad page totals; phase not separately asserted','sourceUnavailableMarker':'- is retained as null, never converted to zero'}
   (coaches if coach else players).append(record)
 if not players or not coaches or len({p['sourcePersonId'] for p in players})!=len(players):raise ValueError('Incomplete or duplicate UEFA squad')
 return {'club':club,'players':players,'coaches':coaches,'season':'2026-2027','verifiedAt':datetime.date.today().isoformat(),'registrationStatus':'official squad page evidence; historical List A changes and identity review pending'}
def fetch(url):
 if urlparse(url).scheme!='https' or urlparse(url).hostname!='www.uefa.com':raise ValueError('Unexpected UEFA source')
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 HuroofAlKora source collector'}),timeout=30) as response:
  if urlparse(response.url).scheme!='https' or urlparse(response.url).hostname!='www.uefa.com':raise ValueError('Unexpected UEFA redirect')
  data=response.read(9000001)
 if len(data)>9000000:raise ValueError('Oversized UEFA document')
 digest=hashlib.sha256(data).hexdigest();cache=BASE/'sources/html'/('uefa-'+digest+'.html');cache.parent.mkdir(parents=True,exist_ok=True);cache.write_bytes(data);return data.decode('utf-8'),digest
def main():
 directory=json.loads((BASE/'data/uefa_participant_candidates_2026_27.json').read_text());clubs=directory['clubs'];checkpoint=BASE/'reports/UEFA_ROSTER_CHECKPOINT.json';results=[]
 if checkpoint.exists():
  prior=json.loads(checkpoint.read_text())
  if prior['participantSourceSha256']!=directory['sourceSha256']:raise ValueError('Saved squads belong to a different participant source')
  results=prior['squads'];keys=[r['club']['sourceClubId'] for r in results]
  if len(set(keys))!=len(keys) or not set(keys)<={c['sourceClubId'] for c in clubs}:raise ValueError('Invalid saved UEFA squad identities')
 done={r['club']['sourceClubId'] for r in results};remaining=[c for c in clubs if c['sourceClubId'] not in done];failures=[]
 def collect(club):
  url=club['profileUrl']+'squad/';html,digest=fetch(url);result=squad(html,club);result.update(source=url,sourceSha256=digest);return result
 with ThreadPoolExecutor(max_workers=3) as pool:
  jobs={pool.submit(collect,c):c for c in remaining}
  for future in as_completed(jobs):
   try:results.append(future.result())
   except Exception as error:failures.append({'club':jobs[future]['sourceClubId'],'source':jobs[future]['profileUrl']+'squad/','error':str(error)})
   save(checkpoint,{'participantSourceSha256':directory['sourceSha256'],'squads':sorted(results,key=lambda r:r['club']['sourceClubId'])})
   save(BASE/'reports/UEFA_COLLECTION.json',{'clubs':len(clubs),'squads':len(results),'registrations':sum(len(r['players']) for r in results),'coaches':sum(len(r['coaches']) for r in results),'failures':failures,'releaseReady':False})
 if len(results)==len(clubs) and not failures:save(BASE/'data/uefa_squad_candidates_2026_27.json',{'participantSourceSha256':directory['sourceSha256'],'squads':sorted(results,key=lambda r:r['club']['sourceClubId']),'releaseReady':False})
 print(json.dumps({'squads':len(results),'registrations':sum(len(r['players']) for r in results),'failures':failures}))
if __name__=='__main__':main()
