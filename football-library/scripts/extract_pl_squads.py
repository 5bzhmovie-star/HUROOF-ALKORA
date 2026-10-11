"""Extract submitted Premier League squads without treating names as canonical identities."""
import datetime,hashlib,json,re,sys
from pathlib import Path
from bs4 import BeautifulSoup

SOURCE='https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists'
def extract(html):
 soup=BeautifulSoup(html,'html.parser')
 title=soup.find('h1')
 if not title or title.get_text(' ',strip=True)!='See all the 2026/27 Premier League squad lists':raise ValueError('Incorrect season or source document')
 clubs=[]
 for heading in soup.find_all('h5'):
  anchor=heading.find('a')
  if not anchor:continue
  match=re.fullmatch(r'https://www\.premierleague\.com/(en/)?clubs/([0-9]+)/[A-Za-z0-9-]+/overview',anchor.get('href',''))
  if not match:continue
  records=[];groups=set();group=None
  for sibling in heading.next_siblings:
   if getattr(sibling,'name',None)=='h5':break
   if getattr(sibling,'name',None)!='p':continue
   lines=[line.strip() for line in sibling.get_text('\n',strip=True).splitlines() if line.strip()]
   if not lines:continue
   for original in lines:
    if original.startswith('25 Squad players'):next_group='senior'
    elif original.startswith('U21 players'):next_group='under21'
    else:next_group=None
    if next_group:
     if next_group in groups:raise ValueError('Duplicate registration group')
     group=next_group;groups.add(group);continue
    if group is None:continue
    if ',' not in original or any(ord(char)<32 for char in original):raise ValueError('Malformed submitted name')
    loan='(Loan)' in original;home='*' in original
    name=original.replace('(Loan)','').replace('*','').strip()
    surname,given=[value.strip() for value in name.split(',',1)]
    if not surname or not given:raise ValueError('Incomplete submitted name')
    records.append({'nameAsPublished':original,'surnameAsPublished':surname,'givenNamesAsPublished':given,'displayNameEn':given+' '+surname,'registrationGroup':group,'homeGrownAsMarked':home,'loanAsMarked':loan,'canonicalPlayerId':None,'verification':'pending-identity-reconciliation','source':SOURCE})
  if groups!={'senior','under21'} or not records:raise ValueError('Missing submitted registration group')
  if len([r for r in records if r['registrationGroup']=='senior'])>25:raise ValueError('Senior squad exceeds registration limit')
  if len({r['nameAsPublished'] for r in records})!=len(records):raise ValueError('Duplicate submitted name requires review')
  clubs.append({'sourceClubId':match[2],'sourceIdNamespace':'english-route' if match[1] else 'legacy-route','sourceClubKey':('en:' if match[1] else 'legacy:')+match[2],'nameEn':heading.get_text(' ',strip=True),'profileUrl':anchor['href'],'canonicalClubId':None,'players':records})
 if len(clubs)!=20 or len({c['sourceClubKey'] for c in clubs})!=20:raise ValueError('Incomplete Premier League participant list')
 return {'season':'2026-2027','source':SOURCE,'verifiedAt':datetime.date.today().isoformat(),'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'clubs':clubs,'releaseReady':False}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Usage: extract_pl_squads.py source.html output.json')
 result=extract(Path(sys.argv[1]).read_text(encoding='utf-8'))
 Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'clubs':len(result['clubs']),'registrations':sum(len(c['players']) for c in result['clubs']),'senior':sum(r['registrationGroup']=='senior' for c in result['clubs'] for r in c['players'])}))
