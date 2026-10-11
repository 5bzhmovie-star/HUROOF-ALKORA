"""Extract SAFF King Cup first-round evidence, retaining shootout scores separately."""
import datetime,hashlib,json,re,sys
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup
SOURCE='https://saff.com.sa/championship.php?id=434&round=13&week=0'
def king_cup(html):
 s=BeautifulSoup(html,'html.parser');options=s.select('option[selected]')
 if not any(o.get('value')=='434' and o.get_text(' ',strip=True)=='موسم 2026-2027' for o in options):raise ValueError('Wrong SAFF season')
 if not any(o.get('value')=='round=13&week=0' and o.get_text(' ',strip=True)=='دور الـ 32' for o in options) or 'كأس خادم الحرمين الشريفين' not in s.get_text():raise ValueError('Wrong competition or round')
 tables=[t for t in s.find_all('table') if t.find('td',id=re.compile(r'^fixture_td_2_[0-9]+$'))]
 if not tables:raise ValueError('Missing fixture table')
 clubs={};matches=[];date=None
 for row in tables[0].find_all('tr'):
  day=row.find('a',href=re.compile(r'^calendar\.php\?calendar_date='))
  if day:
   m=re.fullmatch(r'calendar\.php\?calendar_date=([0-9]{4}-[0-9]{2}-[0-9]{2})',day['href'])
   if not m:raise ValueError('Invalid fixture date')
   date=m[1];datetime.date.fromisoformat(date)
  home=row.find('td',id=re.compile(r'^fixture_td_2_[0-9]+$'))
  if home is None:continue
  mid=home['id'].rsplit('_',1)[1];away=row.find('td',id='fixture_td_4_'+mid);score=row.find('td',id='fixture_td_3_'+mid);time=row.find('td',id='fixture_td_1_'+mid);stadium=row.find('td',id='fixture_td_5_'+mid)
  if not all(x is not None for x in [away,score,time,stadium]) or date is None:raise ValueError('Incomplete fixture')
  ids=[]
  for cell in [home,away]:
   a=cell.find('a',href=True);m=re.fullmatch(r'team\.php\?id=([0-9]+)',a.get('href','') if a else '')
   if not m:raise ValueError('Invalid participant identity')
   logo=a.find('img');logo=logo.get('src') if logo else None
   if logo and not re.fullmatch(r'uploadcenter/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp)',logo):raise ValueError('Unsafe logo path')
   c={'sourceClubId':m[1],'sourceIdNamespace':'saff-team','canonicalClubId':None,'nameAr':a.get_text(' ',strip=True),'profileUrl':urljoin(SOURCE,a['href']),'logoSource':urljoin(SOURCE,logo) if logo else None,'verification':'pending-identity-and-logo-review'}
   if m[1] in clubs and clubs[m[1]]!=c:raise ValueError('Conflicting participant')
   clubs[m[1]]=c;ids.append(m[1])
  text=score.get_text(' ',strip=True);m=re.fullmatch(r'([0-9]+)\s*-\s*([0-9]+)(?:\s*\(\s*([0-9]+)\s*-\s*([0-9]+)\s*\))?',text)
  if not m:raise ValueError('Unrecognized final score')
  matches.append({'sourceMatchId':mid,'date':date,'localTimeAsPublished':time.get_text(' ',strip=True),'timeZone':'Asia/Riyadh','homeSourceClubId':ids[0],'awaySourceClubId':ids[1],'homeGoals':int(m[1]),'awayGoals':int(m[2]),'homePenaltyShootout':int(m[3]) if m[3] else None,'awayPenaltyShootout':int(m[4]) if m[4] else None,'extraTimeStatus':'not separately asserted by score cell','stadiumAsPublished':stadium.get_text(' ',strip=True),'source':SOURCE,'verification':'pending-source-comparison'})
 if len(clubs)!=32 or len(matches)!=16 or len({m['sourceMatchId'] for m in matches})!=16:raise ValueError('Incomplete first round participants or duplicate fixtures')
 return {'competition':'saudi-king-cup','season':'2026-2027','scope':'club-first-team-only','source':SOURCE,'sourceSha256':hashlib.sha256(html.encode('cp1256')).hexdigest(),'verifiedAt':datetime.date.today().isoformat(),'clubs':list(clubs.values()),'matches':matches,'releaseReady':False}
def super_cup(html,club_directory):
 text=BeautifulSoup(html,'html.parser').get_text(' ',strip=True)
 if 'كأس السوبر السعودي' not in text or '2026-2027' not in text:raise ValueError('Wrong Super Cup season or competition')
 match=re.search(r'مشاركة أربعة أندية هي:\s*(.+?)،\s*حيث ستحدد القرعة',text)
 if not match:raise ValueError('Missing explicit Super Cup participants')
 names=[x.strip().removeprefix('و') for x in match[1].split('،')]
 if len(names)!=4 or len(set(names))!=4:raise ValueError('Incomplete Super Cup participants')
 clubs=[]
 for name in names:
  candidates=[c for c in club_directory if c['nameAr']==name and c['sourceIdNamespace']=='saff-team']
  if len(candidates)!=1:raise ValueError('Super Cup club identity reconciliation required')
  clubs.append(candidates[0])
 return {'competition':'saudi-super-cup','season':'2026-2027','source':'https://www.saff.com.sa/news.php?id=4407','sourceSha256':hashlib.sha256(html.encode('cp1256')).hexdigest(),'scope':'club-first-team-only','verifiedAt':datetime.date.today().isoformat(),'clubs':clubs,'matches':[],'fixtureStatus':'not announced in this source; draw is scheduled for 2026-10-14','releaseReady':False}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Usage: extract_saff.py source.html output.json')
 data=Path(sys.argv[1]).read_bytes();r=king_cup(data.decode('cp1256'));r['sourceSha256']=hashlib.sha256(data).hexdigest();Path(sys.argv[2]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'clubs':len(r['clubs']),'matches':len(r['matches'])}))
