"""Small resumable public-profile batches; preserve published generation on failure."""
import hashlib,json,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from extract_athletic import profile
from acquire_seriea import BASE,save

def main():
 snapshot=json.loads((BASE/'data/athletic_squad_candidates_2026_27.json').read_text());people={p['sourcePersonId']:p for p in snapshot['players']};path=BASE/'reports/ATHLETIC_PROFILE_CHECKPOINT.json';found={};errors=[]
 if path.exists():
  for r in json.loads(path.read_text())['profiles']:
   if r['sourcePersonId'] not in people or r['source']!=people[r['sourcePersonId']]['profileUrl']:raise ValueError('Saved profile identity does not match source squad')
   found[r['sourcePersonId']]=r
 limit=int(sys.argv[1]) if len(sys.argv)>1 else 4
 if not 1<=limit<=4:raise ValueError('Batch size must be 1 to 4 profiles')
 def collect(p):
  u=p['profileUrl']
  if urlparse(u).scheme!='https' or urlparse(u).hostname!='www.athletic-club.eus':raise ValueError('Unexpected profile source')
  with urlopen(Request(u,headers={'User-Agent':'Mozilla/5.0 HuroofAlKora evidence collector'}),timeout=10) as response:
   if urlparse(response.url).scheme!='https' or urlparse(response.url).hostname!='www.athletic-club.eus':raise ValueError('Unexpected source redirect')
   raw=response.read(6000001)
  if len(raw)>6000000:raise ValueError('Oversized profile')
  digest=hashlib.sha256(raw).hexdigest();cache=BASE/'sources/html'/('athletic-'+digest+'.html');cache.write_bytes(raw);r=profile(raw.decode(),p);r['sourceSha256']=digest;return r
 pending=[p for pid,p in people.items() if pid not in found]
 with ThreadPoolExecutor(max_workers=2) as pool:
  jobs={pool.submit(collect,p):p for p in pending[:limit]}
  for f in as_completed(jobs):
   try:r=f.result();found[r['sourcePersonId']]=r
   except Exception as e:errors.append({'sourcePersonId':jobs[f]['sourcePersonId'],'source':jobs[f]['profileUrl'],'error':str(e)})
   save(path,{'profiles':list(found.values()),'failures':errors,'remaining':len(people)-len(found),'releaseReady':False})
 if len(found)==len(people):save(BASE/'data/athletic_personal_candidates_2026_27.json',{'profiles':sorted(found.values(),key=lambda r:r['sourcePersonId']),'releaseReady':False})
 print(json.dumps({'profiles':len(found),'remaining':len(people)-len(found),'failures':errors}))
if __name__=='__main__':main()
