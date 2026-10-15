"""Collect official Premier League current first-team profile candidates.

Season-filtered portal results also include youth and historical associations;
these are preserved separately and never certified as a current squad.
"""
import datetime,hashlib,json,math
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor,as_completed
BASE=Path(__file__).resolve().parents[1]
API='https://footballapi.pulselive.com/football/'

def ident(value):
 if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<1 or int(value)!=value:raise ValueError('Invalid published numeric identity')
 return str(int(value))

def classify(records,team_id):
 active=[];other=[];seen=set()
 for p in records:
  pid=ident(p.get('id'))
  if pid in seen:raise ValueError('Duplicate person within API page generation')
  seen.add(pid);team=p.get('currentTeam') or {}
  if team.get('teamType')=='FIRST' and team.get('id')==team_id:
   active.append({'sourcePersonId':pid,'sourceIdNamespace':'premier-league-api','canonicalPlayerId':None,'nameEn':p.get('name',{}).get('display'),'personalAsPublished':{k:p.get(k) for k in ('name','birth','nationalTeam','info','currentTeam','previousTeam','altIds','playerId')},'scopeEvidence':'Explicit currentTeam FIRST matching this club; formal registration verification pending'})
  else:other.append({'sourcePersonId':pid,'reason':'No matching explicit current first-team assignment','recordAsPublished':p})
 return active,other

def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def count_audit(actual,published):
 if isinstance(published,bool) or not isinstance(published,(int,float)) or not math.isfinite(published) or published<0 or int(published)!=published:raise ValueError('Invalid published count')
 return {'recordsActuallyReturned':actual,'totalAsPublished':int(published),'sourceCountMatches':actual==published,'sourceCountDifference':int(published)-actual}

def request(route):
 url=API+route
 with urlopen(Request(url,headers={'Origin':'https://www.premierleague.com','User-Agent':'HuroofAlKora evidence collector'}),timeout=25) as response:
  if urlparse(response.url).hostname!='footballapi.pulselive.com':raise ValueError('Unexpected source redirect')
  raw=response.read(6000001)
 if len(raw)>6000000:raise ValueError('Oversized source')
 digest=hashlib.sha256(raw).hexdigest();path=BASE/'sources/html'/f'pl-api-{digest}.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
 evidence={'source':url,'sourceSha256':digest,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 save(path.with_suffix('.source.json'),evidence)
 return json.loads(raw),evidence

def collect_team(team,season):
 tid=ident(team['id']);records=[];sources=[];page=0
 while True:
  data,evidence=request(f'players?compSeasons={season}&teams={tid}&page={page}&pageSize=100')
  sources.append(evidence);info=data.get('pageInfo',{});content=data.get('content')
  if not isinstance(content,list) or info.get('page')!=page:raise ValueError('Invalid API page')
  records.extend(content);pages=info.get('numPages')
  if not isinstance(pages,(int,float)) or not 1<=pages<=10:raise ValueError('Invalid API pagination')
  if page+1>=pages:
   audit=count_audit(len(records),info.get('numEntries'))
   break
  page+=1
 active,other=classify(records,team['id'])
 if not active:raise ValueError('No explicitly current first-team candidates')
 return {'sourceClubId':tid,'sourceIdNamespace':'premier-league-api','clubAsPublished':team,'sourceSeasonId':season,'players':active,'excludedFromCurrentSquad':other,'sourceCountAudit':audit,'sources':sources,'releaseReady':False,'formalSquadCompletenessVerified':False}

def main():
 seasons,seasons_source=request('competitions/1/compseasons?page=0&pageSize=100')
 matches=[s for s in seasons.get('content',[]) if s.get('label')=='English Premier League Season 2026/2027']
 if len(matches)!=1:raise ValueError('Published season not uniquely identified')
 season=ident(matches[0]['id']);teams,teams_source=request(f'teams?compSeasons={season}&page=0&pageSize=100')
 clubs=teams.get('content',[])
 if len(clubs)!=20 or len({ident(t['id']) for t in clubs})!=20 or any(t.get('teamType')!='FIRST' for t in clubs):raise ValueError('Expected 20 unique published first teams')
 path=BASE/'data/pl_api_first_team_candidates_2026_27.json'
 report=json.loads(path.read_text()) if path.exists() else {'clubs':[],'failures':[],'releaseReady':False}
 report.update({'season':'2026-2027','sourceSeasonId':season,'seasonEvidence':seasons_source,'participantsEvidence':teams_source,'participantsAsPublished':clubs,'limitations':['Current team assignment is not proof of formal season registration','Age-based blanket U21 rosters are not included','Identity reconciliation, Arabic names, portraits, careers and licenses pending']})
 done={c['sourceClubId'] for c in report['clubs']}
 with ThreadPoolExecutor(max_workers=4) as pool:
  jobs={pool.submit(collect_team,c,season):c for c in clubs if ident(c['id']) not in done}
  for f in as_completed(jobs):
   c=jobs[f];tid=ident(c['id']);report['failures']=[v for v in report['failures'] if v['sourceClubId']!=tid]
   try:report['clubs'].append(f.result())
   except Exception as e:report['failures'].append({'sourceClubId':tid,'clubName':c['name'],'error':str(e)})
   save(path,report);print(json.dumps({'clubs':len(report['clubs']),'playerAssignments':sum(len(c['players']) for c in report['clubs']),'failures':len(report['failures'])}),flush=True)
 save(BASE/'reports/PL_API_COLLECTION.json',{'clubsCollected':len(report['clubs']),'currentFirstTeamAssignments':sum(len(c['players']) for c in report['clubs']),'excludedYouthHistoricalOrUnclear':sum(len(c['excludedFromCurrentSquad']) for c in report['clubs']),'failures':report['failures'],'releaseReady':False})
if __name__=='__main__':main()
