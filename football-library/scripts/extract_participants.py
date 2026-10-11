"""Parse season-specific official participant evidence; canonical identity remains reviewed separately."""
import datetime,hashlib,json,re,sys
from pathlib import Path
from bs4 import BeautifulSoup

SOURCES={'laliga':'https://www.laliga.com/en-EG/laliga-easports/clubs','uefa':'https://www.uefa.com/uefachampionsleague/clubs/'}
def unique(records,count=None):
 if not records or len({c['sourceClubId'] for c in records})!=len(records) or (count is not None and len(records)!=count):raise ValueError('Incomplete or duplicate participant identities')
 return records
def laliga(html):
 soup=BeautifulSoup(html,'html.parser');heading=soup.find('h1')
 if not heading or heading.get_text(' ',strip=True)!='Teams of LALIGA EA SPORTS 2026/27':raise ValueError('LaLiga source season differs')
 script=soup.find('script',id='__NEXT_DATA__')
 if not script:raise ValueError('Missing official page data')
 teams=json.loads(script.string)['props']['pageProps']['teams'];records=[]
 for team in teams:
  identity=team.get('id');slug=team.get('slug');name=team.get('name')
  if not isinstance(identity,int) or identity<0 or not isinstance(slug,str) or not re.fullmatch(r'[a-z0-9-]+',slug) or not name:raise ValueError('Invalid LaLiga club identity')
  foundation=team.get('foundation');year=int(foundation[:4]) if isinstance(foundation,str) and re.match(r'^\d{4}-',foundation) else None
  records.append({'sourceClubId':str(identity),'sourceIdNamespace':'laliga','canonicalClubId':None,'slug':slug,'nameAsPublished':name,'displayNameEn':team.get('nickname') or name,'abbreviation':team.get('shortname'),'foundationYear':year,'foundationPrecision':'year' if year else None,'foundationAsPublished':foundation,'officialWebsite':team.get('web'),'primaryColor':team.get('color'),'secondaryColor':team.get('color_secondary'),'stadiumAsPublished':team.get('venue'),'logoSource':(team.get('shield') or {}).get('url'),'providerIds':{'opta':team.get('opta_id'),'lde':team.get('lde_id')},'profileUrl':'https://www.laliga.com/en-EG/clubs/'+slug+'/squad','verification':'pending-cross-source-review'})
 return unique(records,20)
def uefa(html):
 soup=BeautifulSoup(html,'html.parser');title=soup.find('title')
 if not title or 'UEFA Champions League 2026/27' not in title.get_text():raise ValueError('UEFA source season differs')
 stages={'League phase','Play-offs','Third qualifying round','Second qualifying round','First qualifying round'};records=[];seen=set()
 for group in soup.select('.teams-overview_group'):
  heading=group.find('h2');stage=heading.get_text(' ',strip=True) if heading else ''
  if stage not in stages or stage in seen:raise ValueError('Unexpected or duplicate UEFA stage')
  seen.add(stage)
  for anchor in group.select('a.team-wrap'):
   match=re.fullmatch(r'/uefachampionsleague/clubs/([0-9]+)--([a-z0-9-]+)/',anchor.get('href',''))
   badge=anchor.find('pk-badge');country=anchor.find('span',attrs={'slot':'secondary'});name=anchor.get('title')
   if not match or not badge or not country or not name:raise ValueError('Missing UEFA club identity evidence')
   code=country.get_text(' ',strip=True);code_match=re.fullmatch(r'\(([A-Z]{3})\)',code)
   logo=badge.get('src','')
   if not code_match or not re.fullmatch(r'https://img\.uefa\.com/imgml/TP/teams/logos/[0-9]+x[0-9]+/'+match[1]+r'\.png',logo):raise ValueError('UEFA badge identity differs')
   records.append({'sourceClubId':match[1],'sourceIdNamespace':'uefa','canonicalClubId':None,'nameAsPublished':badge.get('badge-title') or name,'displayNameEn':name,'associationCodeAsPublished':code_match[1],'stageAsPublished':stage,'profileUrl':'https://www.uefa.com'+anchor['href'],'logoSource':logo,'verification':'pending-round-and-canonical-review'})
 if seen!=stages or sum(r['stageAsPublished']=='League phase' for r in records)!=36:raise ValueError('Incomplete UEFA season-stage evidence')
 return unique(records)
if __name__=='__main__':
 if len(sys.argv)!=4 or sys.argv[1] not in SOURCES:raise SystemExit('Usage: extract_participants.py laliga|uefa source.html output.json')
 kind=sys.argv[1];html=Path(sys.argv[2]).read_text(encoding='utf-8');records=globals()[kind](html)
 payload={'source':SOURCES[kind],'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'season':'2026-2027','verifiedAt':datetime.date.today().isoformat(),'clubs':records,'sourceProvisionalNotice':'provisional' in BeautifulSoup(html,'html.parser').get_text().casefold(),'releaseReady':False}
 Path(sys.argv[3]).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'competition':kind,'clubs':len(records),'releaseReady':False}))
