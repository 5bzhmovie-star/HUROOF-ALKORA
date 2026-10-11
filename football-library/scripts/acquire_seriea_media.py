"""Download physical source candidates; no image is approved automatically."""
import hashlib,io,json,re,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
from PIL import Image
from acquire_seriea import BASE,save

def jobs(snapshot):
 result=[]
 for squad in snapshot['squads']:
  cid=squad['club']['sourceClubId']
  result.append((squad['club']['logoSource'],f'assets/pending_media/seriea/clubs/{cid}/logo.webp'))
  staff=squad['coach'];pid=staff['staffId'].rsplit('::',1)[1];url=staff.get('coachImage')
  if url:
   m=re.fullmatch(r'https://media-sdp\.legaseriea\.it/playerImages/[a-f0-9]{32}/[a-f0-9]{32}/([a-f0-9]{32})/coaches/([a-f0-9]{32})\.webp',url)
   if not m or m[1]!=cid or m[2]!=pid:raise ValueError('Coach portrait source identity differs')
   result.append((url,f'assets/pending_media/seriea/coaches/{pid}/clubs/{cid}/portrait.webp'))
  for p in squad['players']:
   if p.get('portraitSource'):
    pm=re.fullmatch(r'https://media-sdp\.legaseriea\.it/playerImages/[a-f0-9]{32}/([a-f0-9]{32})/([a-f0-9]{32})/home/([a-f0-9]{32})_(left|middle|right)\.webp',p['portraitSource'])
    if not pm or pm[1]!=p['sourceSeasonId'].rsplit('::',1)[1] or pm[2]!=cid or pm[3]!=p['sourcePersonId']:raise ValueError('Player portrait context differs')
    result.append((p['portraitSource'],f"assets/pending_media/seriea/players/{p['sourcePersonId']}/clubs/{cid}/portrait.webp"))
 if len({path for url,path in result})!=len(result):raise ValueError('Duplicate media context')
 return result

def download(url,relative):
 parsed=urlparse(url)
 if parsed.scheme!='https' or parsed.hostname!='media-sdp.legaseriea.it' or parsed.query or parsed.fragment:raise ValueError('Unexpected portrait source host')
 target=BASE/relative
 if target.is_symlink() or not target.resolve().is_relative_to((BASE/'assets/pending_media/seriea').resolve()):raise ValueError('Unsafe media path')
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 HuroofAlKora evidence collector'}),timeout=25) as response:
  if urlparse(response.url).hostname!='media-sdp.legaseriea.it' or urlparse(response.url).scheme!='https':raise ValueError('Unexpected image redirect')
  raw=response.read(12000001)
 if len(raw)>12000000:raise ValueError('Oversized portrait')
 with Image.open(io.BytesIO(raw)) as image:
  if image.format!='WEBP' or not 20<=image.width<=8192 or not 20<=image.height<=8192:raise ValueError('Invalid WebP source dimensions or format')
  dimensions=[image.width,image.height];image.verify()
 target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix('.tmp');temp.write_bytes(raw);temp.replace(target)
 return {'path':relative,'source':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'dimensions':dimensions,'verification':'pending-visual-identity-kit-period-review','rights':'not-cleared-for-redistribution','approved':False}

def main():
 raw=(BASE/'data/seriea_squad_candidates_2026_27.json').read_bytes();snapshot=json.loads(raw);alljobs=jobs(snapshot);manifest=BASE/'reports/SERIEA_MEDIA_CANDIDATES.json';prior={}
 if manifest.exists():prior={r['path']:r for r in json.loads(manifest.read_text())['downloaded']}
 completed={};pending=[];failures=[]
 for url,path in alljobs:
  old=prior.get(path);p=BASE/path
  if old and old['source']==url and p.is_file() and not p.is_symlink() and hashlib.sha256(p.read_bytes()).hexdigest()==old['sha256']:completed[path]=old
  else:pending.append((url,path))
 limit=int(sys.argv[1]) if len(sys.argv)>1 else 64
 if not 1<=limit<=660:raise ValueError('Invalid collection batch size')
 with ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(download,url,path):(url,path) for url,path in pending[:limit]}
  for f in as_completed(futures):
   url,path=futures[f]
   try:r=f.result();completed[path]=r
   except Exception as e:failures.append({'source':url,'path':path,'error':str(e)})
   save(manifest,{'snapshotSha256':hashlib.sha256(raw).hexdigest(),'downloaded':sorted(completed.values(),key=lambda r:r['path']),'failures':failures,'remainingDownloads':len(alljobs)-len(completed),'releaseReady':False})
 print(json.dumps({'downloaded':len(completed),'remaining':len(alljobs)-len(completed),'failures':len(failures)}))
if __name__=='__main__':main()
