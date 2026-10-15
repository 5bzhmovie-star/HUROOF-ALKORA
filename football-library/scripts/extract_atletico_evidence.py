"""Parse retained official profile text from the alternate retrieval route."""
import datetime,re
from urllib.parse import urlparse

def extract_profile(text):
 urls=re.findall(r'https://(?:en|www)\.atleticodemadrid\.com/jugadores/[^\s)]+',text)
 if not urls:raise ValueError('Missing official player profile URL')
 url=urls[0].rstrip(':');path=urlparse(url).path
 if '2026-2027' not in path:raise ValueError('Wrong source season')
 result={'sourceProfileKey':path.rsplit('/',1)[1],'sourceIdNamespace':'atletico-official-profile','canonicalPersonId':None,'source':url,'season':'2026-2027','personal':None,'careerAsPublished':[],'honorsAsPublished':[],'statistics':None,'releaseReady':False,'verification':'profile-unavailable-in-alternate-retrieval'}
 lines=[re.sub(r'^L\d+:\s*','',l).strip() for l in text.splitlines()]
 heading=next((l for l in lines if re.match(r'^##\s+\d+\s+',l)),None)
 if not heading:return result
 match=re.match(r'^##\s+(\d+)\s+(.+)',heading);result.update({'shirtNumber':int(match[1]),'nameAsPublished':match[2]})
 personal={'dateOfBirth':None,'heightCm':None,'weightKg':None,'nationalityAsPublished':None,'positionAsPublished':None}
 for line in lines:
  match=re.match(r'^\* Born (\d{2}/\d{2}/\d{4})$',line)
  if match:personal['dateOfBirthAsPublished']=match[1];personal['dateOfBirth']=datetime.datetime.strptime(match[1],'%d/%m/%Y').date().isoformat()
  for label,key,low,high in [('Height (cm)','heightCm',100,250),('Weight (kg)','weightKg',30,200)]:
   match=re.fullmatch(r'\* '+re.escape(label)+r' (\d+)',line)
   if match:
    value=int(match[1])
    if not low<=value<=high:raise ValueError('Implausible source '+key)
    personal[key]=value
  if line.startswith('* Nationality '):personal['nationalityAsPublished']=line[len('* Nationality '):]
  if line.startswith('> Position: '):personal['positionAsPublished']=line[len('> Position: '):]
 section=None
 for line in lines:
  if line in ('PATH','WINNERS'):section=line;continue
  if line.startswith('# Latest News'):break
  if section=='PATH':
   match=re.match(r'^(.+?):\s*(\d{4})\s*[-–]\s*(\d{4}|\.)',line)
   if match:result['careerAsPublished'].append({'teamNameAsPublished':match[1],'fromYear':int(match[2]),'toYear':int(match[3]) if match[3].isdigit() else None,'datePrecision':'year','raw':line})
  elif section=='WINNERS' and re.match(r'^\d{4}\b',line):result['honorsAsPublished'].append({'year':int(line[:4]),'nameAsPublished':line[4:].strip(),'verification':'pending-cross-source-review'})
 result['personal']=personal;result['verification']='pending-independent-person-period-and-source-completeness-review'
 return result
