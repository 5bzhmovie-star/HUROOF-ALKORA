"""Acquire pinned MIT flag artwork; preserve original SVG and offline PNG."""
from pathlib import Path
import concurrent.futures,hashlib,json,urllib.request,os,subprocess,re
from defusedxml import ElementTree as ET
import cairosvg
BASE=Path(__file__).resolve().parents[1]
COMMIT='086f7e97d657358203916dbe84f61c2bccaa81eb'

def validate_svg(data):
 root=ET.fromstring(data)
 if not root.tag.endswith('svg'):raise ValueError('Not an SVG')
 for element in root.iter():
  if element.tag.rsplit('}',1)[-1] in ['script','foreignObject','image','style']:raise ValueError('Unsupported active or referenced content')
  for name,value in element.attrib.items():
   if name.lower().startswith('on'):raise ValueError('Active content')
   if 'href' in name and not re.fullmatch(r'#[A-Za-z_][A-Za-z0-9_.:-]*',value):raise ValueError('External reference')
   for ref in re.findall(r'url\(([^)]+)\)',value):
    if not re.fullmatch(r'#[A-Za-z_][A-Za-z0-9_.:-]*',ref.strip()):raise ValueError('External reference')
 return data

def download(team):
 code=team['fifaCode'];mapping=json.loads((BASE/'data/national-team-names.json').read_text())[code]
 source=f'https://raw.githubusercontent.com/lipis/flag-icons/{COMMIT}/flags/4x3/{mapping[1]}.svg'
 folder=BASE/'assets/national_teams'/team['id'].replace(':','_');folder.mkdir(parents=True,exist_ok=True)
 target=folder/'flag.svg'
 local=os.environ.get('HUROOF_FLAG_SOURCE_DIR')
 if local:
  repository=Path(local).resolve()
  actual=subprocess.check_output(['git','-C',str(repository),'rev-parse','HEAD'],text=True).strip()
  if actual!=COMMIT:raise ValueError('Flag source commit mismatch')
  data=validate_svg((repository/'flags/4x3'/f'{mapping[1]}.svg').read_bytes());target.write_bytes(data)
 elif target.exists():data=validate_svg(target.read_bytes())
 else:
  with urllib.request.urlopen(source,timeout=25) as r:data=validate_svg(r.read(200000))
  target.write_bytes(data)
 cairosvg.svg2png(bytestring=data,write_to=str(folder/'flag.png'),output_width=640,output_height=480)
 return {'teamId':team['id'],'role':'flag','file':target.relative_to(BASE).as_posix(),'png':(folder/'flag.png').relative_to(BASE).as_posix(),'source':source,'license':'MIT','rightsHolder':'Panayiotis Lipiridis','sha256':hashlib.sha256(data).hexdigest(),'verification':'pending-visual-review'}

if __name__=='__main__':
 teams=json.loads((BASE/'data/wc2026_teams.json').read_text());results=[];failures=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  futures={pool.submit(download,t):t for t in teams}
  for f,t in futures.items():
   try:results.append(f.result())
   except Exception as e:failures.append({'teamId':t['id'],'error':str(e)})
 (BASE/'reports/FLAG_ASSETS.json').write_text(json.dumps({'downloaded':results,'failures':failures,'releaseReady':False},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'flagsLocal':len(results),'failures':len(failures)}))
