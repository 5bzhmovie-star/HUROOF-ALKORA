"""Collect the official men's profile snapshot, retaining loan status.
Downloaded photos are internal candidates until identity, jersey/date and rights
are reviewed. They are deliberately excluded from public git commits.
"""
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image
import concurrent.futures,hashlib,json,urllib.request,urllib.parse,io
BASE=Path(__file__).resolve().parents[1]
SOURCE='https://www.chelseafc.com/en/teams/mens-profiles'
class ProfileParser(HTMLParser):
 def __init__(self):super().__init__();self.players=[]
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key=='data-props' and value and value.startswith('{'):
    try:
     data=json.loads(value)
     if isinstance(data.get('players'),dict) and isinstance(data['players'].get('players'),list):self.players=data['players']['players']
    except ValueError:pass

def acquire(player):
 url=player['playerImage']['file']['url'].replace('http:','https:').replace('/image/upload/','/image/upload/f_webp,w_768,c_limit/')
 if urllib.parse.urlsplit(url).hostname!='img.chelseafc.com':raise ValueError('Unexpected media domain')
 identifier='chelsea:'+player['playerId'];folder=BASE/'assets/pending_media'/identifier;folder.mkdir(parents=True,exist_ok=True)
 target=folder/'portrait.webp'
 if target.exists():data=target.read_bytes()
 else:
  with urllib.request.urlopen(url,timeout=25) as r:data=r.read(1350001)
  if len(data)>1350000:raise ValueError('Portrait exceeds local asset limit')
  Image.open(io.BytesIO(data)).verify();target.write_bytes(data)
 image=Image.open(io.BytesIO(data))
 return {'sourceIdentity':identifier,'name':(player['playerFirstName']+' '+player['playerLastName']).strip(),'kind':'coach' if player.get('playerPositionDetailed')=='Manager' else 'player','teamId':'club:chelsea','source':SOURCE,'profileSource':'https://www.chelseafc.com'+player['playerProfileLink']['url'],'imageSource':url,'file':target.relative_to(BASE).as_posix(),'sha256':hashlib.sha256(data).hexdigest(),'width':image.width,'height':image.height,'declaredSeason':'2026-2027' if '2026-27' in url else None,'kitReviewed':False,'identityReviewed':False,'rightsStatus':'not-cleared','verification':'pending','sourcePlayer':player}
if __name__=='__main__':
 with urllib.request.urlopen(SOURCE,timeout=25) as r:html=r.read().decode()
 parser=ProfileParser();parser.feed(html)
 if not parser.players:raise ValueError('Missing official profiles')
 # Main squad and head coach only; academy/on-loan entries are not silently
 # asserted to be the league's registered first-team roster.
 selected=[p for p in parser.players if 'mensteam' in p.get('teams',[]) or p.get('playerPositionDetailed')=='Manager']
 photos=[];failures=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for p,future in zip(selected,pool.map(lambda p:acquire(p),selected)):
   photos.append(future)
 report={'source':SOURCE,'checkedAt':'2026-10-11','sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'profilePlayers':sum(p['kind']=='player' for p in photos),'profileCoaches':sum(p['kind']=='coach' for p in photos),'photos':photos,'releaseReady':False,'note':'Current official profile page, not a certified league registration list. Club membership and canonical FIFA identity mapping require review.'}
 (BASE/'data/chelsea_profiles_2026_27.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'localPortraits':len(photos),'players':report['profilePlayers'],'coaches':report['profileCoaches']}))
