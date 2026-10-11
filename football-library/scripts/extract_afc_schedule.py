"""Extract AFC official league-stage schedule; qualifying participants remain separate gaps."""
import datetime,hashlib,json,re,sys
from pathlib import Path
import pdfplumber
SOURCE='https://assets.the-afc.com/2026-27_ACL_Elite/Downloads/Match_Schedule/AFC-Champions-League-Elite-202627---League-Stage-Match-Schedule---Sep6upd.pdf'
def rows(table,page):
 date=None;region=None;result=[]
 for index,row in enumerate(table):
  if row[0] in ('WEST','EAST'):region=row[0].lower()
  if len(row)<9 or row[3]!='vs':continue
  if row[0]:
   match=re.search(r'([0-9]{1,2} [A-Za-z]{3} [0-9]{4})',row[0])
   if not match and re.fullmatch(r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),',row[0]):
    for later in table[index+1:]:
     if later[0] in ('WEST','EAST') or (later[0] and ',' in later[0]):break
     match=re.search(r'([0-9]{1,2} [A-Za-z]{3} [0-9]{4})',later[0] or '')
     if match:
      if datetime.datetime.strptime(match[1],'%d %b %Y').strftime('%A')!=row[0].rstrip(','):raise ValueError('Split date weekday differs')
      break
   if not match:raise ValueError('Missing fixture calendar date')
   date=datetime.datetime.strptime(match[1],'%d %b %Y').date().isoformat()
  if not date:raise ValueError('Fixture date not inherited from official table')
  clubs=[]
  for slot,label in [(row[1],row[2]),(row[5],row[4])]:
   if not re.fullmatch(r'[A-H][1-4]',slot or ''):raise ValueError('Invalid league-stage draw slot')
   name=' '.join((label or '').split());match=re.fullmatch(r'(.+) \(([A-Z]{3})\)',name)
   if not match:raise ValueError('Missing participant association code')
   clubs.append({'drawSlot':slot,'nameEn':match[1],'associationCodeAsPublished':match[2],'canonicalClubId':None,'sourceClubId':None,'verification':'official schedule; global identity reconciliation pending'})
  if region is None:raise ValueError('Missing region heading')
  if not re.fullmatch(r'[0-9]{2}:[0-9]{2}',row[6] or ''):raise ValueError('Invalid kick-off time')
  result.append({'home':clubs[0],'away':clubs[1],'region':region,'date':date,'kickOffLocalAsPublished':row[6],'timeZone':'not separately specified; no UTC conversion inferred','venueAsPublished':' '.join((row[7] or '').split()),'homeGoals':None,'awayGoals':None,'sourcePage':page,'source':SOURCE,'verification':'fixture schedule only; results not provided'})
 return result

def extract(path):
 matches=[]
 with pdfplumber.open(path) as pdf:
  for index,page in enumerate(pdf.pages,1):
   if 'Official Match Schedule' not in (page.extract_text() or ''):raise ValueError('Unexpected AFC schedule page')
   tables=page.extract_tables();candidate=[t for t in tables if any(len(r)>3 and r[3]=='vs' for r in t)]
   if len(candidate)!=1:raise ValueError('Ambiguous or missing schedule table')
   found=rows(candidate[0],index)
   if len(found)!=16:raise ValueError('Incomplete league-stage matchday')
   matches.extend(found)
 clubs={}
 for match in matches:
  for side in ['home','away']:
   c=match[side];slot=c['drawSlot']
   if slot in clubs and clubs[slot]!=c:raise ValueError('Conflicting AFC draw-slot identity')
   clubs[slot]=c
 if len(clubs)!=32 or len({(m['date'],m['home']['drawSlot'],m['away']['drawSlot']) for m in matches})!=len(matches):raise ValueError('Incomplete or duplicate AFC league-stage coverage')
 return {'competition':'afc-champions-league-elite','season':'2026-2027','source':SOURCE,'sourceSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'scope':'club-first-team-only','verifiedAt':datetime.date.today().isoformat(),'clubs':sorted(clubs.values(),key=lambda c:c['drawSlot']),'matches':matches,'missing':['preliminary and play-off participants not covered by this league-stage schedule','first-team registrations','coaches and context portraits','source club identifiers and canonical identity reconciliation','matchday-one schedule absent from this document','results and detailed statistics'],'releaseReady':False}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('Usage: extract_afc_schedule.py schedule.pdf output.json')
 r=extract(sys.argv[1]);Path(sys.argv[2]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'clubs':len(r['clubs']),'scheduledMatches':len(r['matches'])}))
