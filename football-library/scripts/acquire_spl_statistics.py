"""Resumable primary-source statistics evidence; never releases unreviewed data."""
import argparse, datetime, gzip, hashlib, json, math, re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen
import importlib.util
_spec=importlib.util.spec_from_file_location('huroof_spl',Path(__file__).with_name('acquire_spl.py'))
spl=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(spl)

BASE=Path(__file__).resolve().parents[1]

def select_statistics(records, player):
 matches=[r for r in records if r.get('playerId')=='spl::Football_Player::'+player['sourcePersonId'] and r.get('team',{}).get('teamId')=='spl::Football_Team::'+player['sourceClubId']]
 if len(matches)!=1:raise ValueError('Missing or ambiguous exact player and club')
 record=matches[0]
 if not player.get('sourceSeasonId') or record.get('seasonId')!='spl::Football_Season::'+player['sourceSeasonId']:raise ValueError('Published season mismatch')
 if not isinstance(record.get('stats'),list) or not record['stats']:raise ValueError('Statistics unavailable or unresolved in published source')
 kept=[];omitted=[];seen={}
 for stat in record['stats']:
  if not isinstance(stat,dict):raise ValueError('Unresolved statistic record')
  key=stat.get('statsId');label=stat.get('statsLabel') or ''
  if not isinstance(key,str) or not re.fullmatch(r'[A-Za-z0-9 _./()%+&-]{1,160}',key):raise ValueError('Invalid statistic identity')
  if key.lower().startswith(('xg','xa')) or 'expected' in (key+' '+label).lower():omitted.append(key);continue
  value=stat.get('statsValue')
  if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or value<0):raise ValueError('Invalid numeric statistic')
  if key in seen and seen[key]!=stat:raise ValueError('Conflicting statistic identity')
  if key not in seen:kept.append(stat);seen[key]=stat
 return {'statisticsAsPublished':kept,'omittedUnlicensedAdvancedMetrics':omitted}

def collect(player):
 url=player['profileUrl'].replace('/ar/','/en/')
 url=quote(url,safe=':/%?=&-_.~')
 if urlparse(url).hostname!='www.spl.com.sa':raise ValueError('Unexpected source host')
 with urlopen(Request(url,headers={'User-Agent':'HuroofAlKora evidence collector','Accept-Encoding':'gzip'}),timeout=22) as response:
  if urlparse(response.url).hostname!='www.spl.com.sa':raise ValueError('Unexpected redirect host')
  data=response.read(6000001)
  if len(data)>6000000:raise ValueError('Oversized source')
  if response.headers.get('Content-Encoding')=='gzip':
   import io
   with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:data=stream.read(6000001)
  if len(data)>6000000:raise ValueError('Oversized decoded source')
 digest=hashlib.sha256(data).hexdigest();cache=BASE/'sources/spl_profiles'/f'{digest}.html.gz'
 cache.parent.mkdir(parents=True,exist_ok=True);cache.write_bytes(gzip.compress(data,mtime=0))
 records=spl.embedded_players(data.decode('utf-8'),player['sourceClubId'])
 result=select_statistics(list(records.values()),player)
 result.update({k:player[k] for k in ('sourcePersonId','sourceClubId','sourceSeasonId')})
 result.update({'source':url,'sourceSha256':digest,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCache':str(cache.relative_to(BASE)),'verification':'pending-independent-period-identity-and-data-license-review','releaseReady':False})
 return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=48);parser.add_argument('--workers',type=int,default=6);args=parser.parse_args()
 if not 1<=args.workers<=8 or not 1<=args.limit<=544:raise ValueError('Invalid collection limits')
 path=BASE/'reports/SPL_PROFILE_STATISTICS_CHECKPOINT.json'
 report=json.loads(path.read_text()) if path.is_file() else {'records':[],'failures':[],'releaseReady':False}
 key=lambda p:(p['sourcePersonId'],p['sourceClubId'],p['sourceSeasonId'])
 completed={key(r) for r in report['records']}
 _,squads,_=spl.load_snapshot();players=[p for s in squads for p in s['players'] if p.get('sourcePersonId') and key(p) not in completed][:args.limit]
 with ThreadPoolExecutor(max_workers=args.workers) as pool:
  jobs={pool.submit(collect,p):p for p in players}
  for future in as_completed(jobs):
   p=jobs[future];report['failures']=[f for f in report['failures'] if f['profileUrl']!=p['profileUrl']]
   try:report['records'].append(future.result())
   except Exception as error:report['failures'].append({'profileUrl':p['profileUrl'],'error':type(error).__name__+': '+str(error)})
   report['targetWebsiteCards']=sum(len(s['players']) for s in squads);spl.save_json(path,report)
   print(json.dumps({'collected':len(report['records']),'failures':len(report['failures'])}),flush=True)
 summary={'profilesCollected':len(report['records']),'targetWebsiteCards':report.get('targetWebsiteCards'),'uncollectedWebsiteCards':report.get('targetWebsiteCards',0)-len(report['records']),'failedLatestAttempts':report['failures'],'releaseReady':False,'limitations':['Website squad cards are not certified formal senior registrations','Statistics retain published source labels; independent review and canonical merge pending','Advanced xG/xA metrics omitted without a redistribution license']}
 spl.save_json(BASE/'reports/SPL_STATISTICS_COLLECTION.json',summary)

if __name__=='__main__':main()
