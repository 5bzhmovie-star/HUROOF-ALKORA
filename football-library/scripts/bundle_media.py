"""Bundle original media bytes in indexed standard TAR files for native PHP."""
import argparse,hashlib,json,re,tarfile
from pathlib import Path

def safe_path(value):
 if not isinstance(value,str) or not re.fullmatch(r'assets/pending_media/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)',value):raise ValueError('Unsafe media path')
 if any(p in ('','.','..') for p in value.split('/')):raise ValueError('Unsafe media segment')
 return value

def build(base,output,limit=8*1024*1024):
 base=Path(base).resolve();output=Path(output)
 if output.exists():raise ValueError('Use a new bundle output directory')
 if not 4096<=limit<=64*1024*1024:raise ValueError('Invalid bundle size')
 index_raw=(base/'data/media_files.index.json').read_bytes();source=json.loads(index_raw);files=source['files'];checked=[];seen=set()
 for record in files:
  path=safe_path(record['path'])
  if path in seen:raise ValueError('Duplicate media path')
  seen.add(path);p=base/path
  if p.is_symlink() or not p.resolve().is_relative_to(base) or not p.is_file():raise ValueError('Missing or unsafe asset')
  raw=p.read_bytes()
  if len(raw)!=record['bytes'] or hashlib.sha256(raw).hexdigest()!=record['sha256']:raise ValueError('Media checksum mismatch')
  checked.append((record,p))
 output.mkdir(parents=True);parts=[];groups=[];current=[];size=0
 for item in checked:
  cost=512+((item[0]['bytes']+511)//512)*512
  if current and size+cost>limit:groups.append(current);current=[];size=0
  current.append(item);size+=cost
 if current:groups.append(current)
 for i,group in enumerate(groups,1):
  name=f'media-{i:04d}.tar';path=output/name
  with tarfile.open(path,'w',format=tarfile.USTAR_FORMAT) as archive:
   for record,p in group:
    info=tarfile.TarInfo(record['path']);info.size=record['bytes'];info.mode=0o644;info.mtime=0
    with p.open('rb') as stream:archive.addfile(info,stream)
  entries=[]
  with tarfile.open(path,'r') as archive:
   for member,(record,p) in zip(archive.getmembers(),group):
    if not member.isfile() or member.name!=record['path']:raise ValueError('Unexpected TAR entry')
    entries.append({'path':member.name,'offset':member.offset_data,'bytes':member.size,'sha256':record['sha256']})
  parts.append({'path':name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'files':entries})
 result={'format':'huroof-media-bundles-v1','mediaIndexSha256':hashlib.sha256(index_raw).hexdigest(),'fileCount':len(files),'totalBytes':sum(r['bytes'] for r,p in checked),'parts':parts,'releaseReady':False}
 (output/'index.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');return result

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('base');parser.add_argument('output');args=parser.parse_args();result=build(args.base,args.output);print(json.dumps({'files':result['fileCount'],'parts':len(result['parts']),'bytes':result['totalBytes']}))
