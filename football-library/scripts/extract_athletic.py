"""Season-specific Athletic senior cards; youth teams and assistant staff are excluded."""
import datetime,hashlib,json,re,sys
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup
SOURCE='https://www.athletic-club.eus/en/teams/athletic-club/2026-27/squad/'
def extract(html):
 s=BeautifulSoup(html,'html.parser')
 if not s.h1 or s.h1.get_text(' ',strip=True)!='Athletic Club' or '2026-27' not in s.get_text(' ',strip=True):raise ValueError('Wrong Athletic senior season source')
 players=[];positions={'Goalkeepers':'GK','Defender':'DF','Defenders':'DF','Midfielders':'MF','Forwards':'FW'}
 for card in s.select('div.item-player__main'):
  a=card.find('a',href=True);profile=re.fullmatch(r'/en/players/([a-z0-9-]+)',a.get('href','') if a else '');name=card.select_one('.item-player__heading-title');shirt=card.select_one('.item-player__heading-dorsal');img=card.find('img');role=card.find_previous('h3')
  if not profile or not name or role is None or role.get_text(' ',strip=True) not in positions:raise ValueError('Invalid senior player card')
  photo=img.get('src') if img else None
  if photo and not re.fullmatch(r'https://cdn\.athletic-club\.eus/imagenes/player_images/medium/[A-Za-z0-9_-]+\.png',photo):raise ValueError('Unsafe portrait source')
  num=shirt.get_text(' ',strip=True) if shirt else None
  if num is not None and (not num.isdigit() or not 1<=int(num)<=99):raise ValueError('Invalid squad number')
  players.append({'sourcePersonId':profile[1],'sourceIdNamespace':'athletic-profile-slug','canonicalPlayerId':None,'nameOriginal':name.get_text(' ',strip=True),'fullNameAsPublished':img.get('alt') if img else None,'profileUrl':urljoin(SOURCE,a['href']),'portraitSource':photo,'shirtNumber':int(num) if num else None,'position':positions[role.get_text(' ',strip=True)],'verification':'pending-identity-period-and-portrait-review','rights':'not-cleared-for-redistribution'})
 coaches=[]
 for item in s.select('div.list-staff__item'):
  role=item.find('h3');name=item.find('h4');a=item.find('a',href=True)
  if not role or role.get_text(' ',strip=True)!='Coach':continue
  profile=re.fullmatch(r'/en/coaches/([a-z0-9-]+)',a.get('href','') if a else '')
  if not profile or not name:raise ValueError('Missing head coach source identity')
  coaches.append({'sourcePersonId':profile[1],'sourceIdNamespace':'athletic-coach-slug','canonicalCoachId':None,'nameOriginal':name.get_text(' ',strip=True),'profileUrl':urljoin(SOURCE,a['href']),'verification':'pending-source-comparison'})
 if not players or len({p['sourcePersonId'] for p in players})!=len(players) or len(coaches)!=1:raise ValueError('Incomplete or duplicate senior squad')
 return {'clubName':'Athletic Club','season':'2026-2027','scope':'club-first-team-only','source':SOURCE,'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'verifiedAt':datetime.date.today().isoformat(),'players':players,'coach':coaches[0],'releaseReady':False}
def profile(html,player):
 s=BeautifulSoup(html,'html.parser')
 if not s.h1 or s.h1.get_text(' ',strip=True)!=player['nameOriginal']:raise ValueError('Player profile identity mismatch')
 fields={}
 for item in s.select('li.info-squad__list-item'):
  label=item.find('label');value=item.find('span')
  if not label or not value:continue
  key=label.get_text(' ',strip=True);text=value.get_text(' ',strip=True)
  if key in fields and fields[key]!=text:raise ValueError('Conflicting published personal field')
  fields[key]=text
 def date(key):
  value=fields.get(key)
  if value in (None,'','-'):return None
  return datetime.datetime.strptime(value,'%d/%m/%Y').date().isoformat()
 height=fields.get('Height');cm=None
 if height and height!='-':
  match=re.fullmatch(r'([0-9]\.[0-9]{1,2}) metres',height)
  if not match:raise ValueError('Unrecognized height units')
  cm=round(float(match[1])*100)
  if not 120<=cm<=230:raise ValueError('Invalid height')
 total=fields.get('Official games');appearances=None
 if total and total!='-':
  if not total.isdigit():raise ValueError('Invalid official career appearances')
  appearances=int(total)
 return {'sourcePersonId':player['sourcePersonId'],'sourceIdNamespace':'athletic-profile-slug','dateOfBirth':date('Date of birth'),'birthplaceAsPublished':fields.get('Place of birth'),'heightCm':cm,'clubFirstTeamDebutDate':date('Debut date'),'clubCareerOfficialAppearancesAsPublished':appearances,'careerAppearancesScope':'Athletic first-team official career matches; not seasonal and not global career totals','publishedFields':{k:fields[k] for k in ['Date of birth','Place of birth','Debut date','Height','Seasons','Official games'] if k in fields},'source':player['profileUrl'],'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'verifiedAt':datetime.date.today().isoformat(),'verification':'pending-source-comparison'}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Usage: extract_athletic.py squad.html output.json')
 raw=Path(sys.argv[1]).read_bytes();r=extract(raw.decode());r['sourceSha256']=hashlib.sha256(raw).hexdigest();Path(sys.argv[2]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'players':len(r['players']),'headCoach':r['coach']['nameOriginal']}))
