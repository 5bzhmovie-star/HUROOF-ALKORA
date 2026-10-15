"""Parse a season-selected federation senior club directory."""
import re
from bs4 import BeautifulSoup

def extract(html):
 soup=BeautifulSoup(html,'html.parser');rows=[];seen=set()
 for a in soup.find_all('a',href=re.compile(r'^team\.php\?id=\d+$')):
  name=a.get_text(' ',strip=True)
  if not name:continue
  sid=a['href'].split('=')[-1]
  if sid in seen:raise ValueError('Duplicate source club')
  card=a.find_parent('table')
  if card is None:raise ValueError('Missing club card')
  def field(label):
   node=card.find('font',string=lambda t:t and t.strip()==label)
   value=node.find_next_sibling('font') if node else None
   return value.get_text(' ',strip=True) if value else None
  year=field('Establish Date:');city=field('City:')
  if not year or not re.fullmatch(r'\d{4}',year) or not 1800<=int(year)<=2026:raise ValueError('Invalid foundation year')
  if '\ufffd' in name or city and '\ufffd' in city:raise ValueError('Unreliable source encoding in selected fields')
  rows.append({'sourceClubId':sid,'sourceIdNamespace':'saff','canonicalClubId':None,'nameEnAsPublished':name,'cityEnAsPublished':city,'foundationYear':int(year),'foundationPrecision':'year','profileUrl':'https://www.saff.com.sa/en/'+a['href'],'verification':'pending-cross-source-identity-review'})
  seen.add(sid)
 return rows
