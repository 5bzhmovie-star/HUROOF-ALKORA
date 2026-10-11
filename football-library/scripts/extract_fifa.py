"""Extract FIFA's dated World Cup roster, not a current-club roster.
Requires pdfplumber. Original PDF remains a local reference until redistribution
rights have been established. No names are silently repaired from guesses.
"""
import hashlib,json,re,logging,unicodedata
from datetime import datetime
from pathlib import Path
logging.getLogger('pdfminer').setLevel(logging.ERROR)
BASE=Path(__file__).resolve().parents[1]
SOURCE='https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf'

def stable_id(kind,value):
 key=unicodedata.normalize('NFKD',value).casefold()
 return kind+':fifa2026:'+hashlib.sha256(key.encode()).hexdigest()[:24]

def parse_player(row,team_code,page,headers=None):
 if headers is not None:
  standard=['#','POS','PLAYER NAME',None,'FIRST NAME(S)','LAST NAME(S)',None,'NAME ON SHIRT','DOB',None,'CLUB',None,'HEIGHT (CM)','CAPS','GOALS']
  row=[row[headers.index(key)] if key else None for key in standard]
 if len(row)!=15:raise ValueError('Unexpected PDF table columns')
 number=int(row[0]); dob=datetime.strptime(row[8],'%d/%m/%Y').date().isoformat()
 full_name=' '.join([row[4] or '',row[5] or '']).strip()
 text_issues=[i for i in (2,4,5,7,10) if '\x00' in (row[i] or '') or '\ufffd' in (row[i] or '')]
 return {'id':stable_id('player',full_name+'|'+dob),'nameOriginal':full_name,'nameEn':full_name,'nameAr':None,'sourceDisplayName':row[2],'firstNames':row[4],'lastNames':row[5],'shirtName':row[7],'dateOfBirth':dob,'position':row[1],'shirtNumber':number,'clubAtWorldCup':row[10],'heightCm':int(row[12]) if row[12] else None,'internationalCapsAsOfSource':int(row[13]) if row[13] else None,'internationalGoalsAsOfSource':int(row[14]) if row[14] else None,'nationalTeamCode':team_code,'source':SOURCE,'sourcePage':page,'asOf':'2026-07-19','verifiedAt':'2026-10-11','textIssues':text_issues,'verification':'pending','rawCells':row}

def apply_text_corrections(result,corrections):
 import copy
 if result['sourceSha256']!=corrections['sourceSha256']:raise ValueError('Correction document source checksum differs')
 if not corrections.get('reviewer') or datetime.strptime(corrections['verifiedAt'],'%Y-%m-%d').date().isoformat()!=corrections['verifiedAt']:raise ValueError('Missing visual review provenance')
 output=copy.deepcopy(result);players={p['id']:p for p in output['players']};seen=set()
 for repair in corrections['corrections']:
  key=repair['playerId']
  if key in seen or key not in players:raise ValueError('Duplicate or unknown correction identity')
  seen.add(key);player=players[key]
  if player['sourcePage']!=repair['sourcePage'] or player['shirtNumber']!=repair['shirtNumber']:raise ValueError('Correction row identity differs')
  row=list(player['rawCells']);columns=[]
  for cell in repair['cells']:
   column=cell['column'];columns.append(column)
   if column not in player['textIssues'] or row[column]!=cell['original'] or not isinstance(cell['corrected'],str) or not cell['corrected'] or any(ord(c)<32 or c=='\ufffd' for c in cell['corrected']):raise ValueError('Correction does not match damaged source cell')
   row[column]=cell['corrected']
  if len(set(columns))!=len(columns) or set(columns)!=set(player['textIssues']):raise ValueError('Incomplete or duplicate damaged-cell corrections')
  repaired=parse_player(row,player['nationalTeamCode'],player['sourcePage']);repaired['id']=player['id'];repaired['rawCellsCorrected']=row;repaired['rawCells']=player['rawCells']
  repaired['textCorrections']={'cells':repair['cells'],'sourceSha256':corrections['sourceSha256'],'reviewer':corrections['reviewer'],'verifiedAt':corrections['verifiedAt'],'method':'visual inspection of original PDF row'}
  players[key]=repaired
 output['players']=[players[p['id']] for p in output['players']]
 output['issues']=[issue for issue in output['issues'] if issue['playerId'] not in seen]
 output['visuallyCorrectedRecords']=len(seen)
 return output

def extract(path):
 import pdfplumber
 teams=[];players=[];coaches=[];issues=[]
 with pdfplumber.open(path) as pdf:
  if len(pdf.pages)!=48:raise ValueError('Expected 48 team pages')
  for index,page in enumerate(pdf.pages,1):
   text=page.extract_text() or ''
   m=re.search(r'^(.+) \(([A-Z]{3})\)$',text,re.M)
   if not m:raise ValueError(f'Missing team header on page {index}')
   name,code=m.groups();team_id='national_team:fifa:'+code.lower()
   tables=page.extract_tables()
   if not tables:raise ValueError(f'Missing roster table on page {index}')
   table=tables[0];rows=[r for r in table if r[0] and re.fullmatch(r'\d+',r[0])]
   if len(rows)!=26 or {int(r[0]) for r in rows}!=set(range(1,27)):raise ValueError(f'Incomplete/duplicate roster on page {index}')
   roster=[parse_player(r,code,index,table[0]) for r in rows];players.extend(roster)
   staff=[r for r in table if r[0]=='Head coach']
   if len(staff)!=1:raise ValueError(f'Coach missing on page {index}')
   row=staff[0];coach_header=next(r for r in table if r[0]=='ROLE')
   coach_first=row[coach_header.index('FIRST NAME(S)')];coach_last=row[coach_header.index('LAST NAME(S)')];coach_nation=row[coach_header.index('NATIONALITY')]
   coach_name=' '.join(filter(None,[coach_first,coach_last]))
   coach={'id':stable_id('coach',coach_name+'|'+coach_nation),'nameOriginal':coach_name,'nameEn':coach_name,'nameAr':None,'nationality':coach_nation,'teamId':team_id,'source':SOURCE,'sourcePage':index,'asOf':'2026-07-19','verification':'pending','rawCells':row}
   coaches.append(coach)
   teams.append({'id':team_id,'nameEn':name,'nameAr':None,'fifaCode':code,'playerIds':[r['id'] for r in roster],'coachIds':[coach['id']],'source':SOURCE,'sourcePage':index,'season':'2026','snapshotDate':'2026-07-19','verification':'pending'})
   issues.extend({'playerId':r['id'],'page':index,'kind':'damaged-font-text','columns':r['textIssues']} for r in roster if r['textIssues'])
 if len({r['id'] for r in players})!=len(players):raise ValueError('Duplicate player identity; requires explicit resolution')
 if len({r['id'] for r in teams})!=48:raise ValueError('Duplicate team')
 return {'format':'huroof-fifa-roster-evidence-v1','source':SOURCE,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'asOf':'2026-07-19','teams':teams,'players':players,'coaches':coaches,'issues':issues}

if __name__=='__main__':
 result=extract(BASE/'sources/FIFA_WC2026_SquadLists.pdf')
 corrections=BASE/'data/fifa_text_corrections_2026.json'
 if corrections.exists():result=apply_text_corrections(result,json.loads(corrections.read_text()))
 for key in ['teams','players','coaches']:
  (BASE/'data'/('wc2026_'+key+'.json')).write_text(json.dumps(result[key],ensure_ascii=False,indent=2)+'\n')
 report={k:v for k,v in result.items() if k not in ['teams','players','coaches']}
 report.update({'teamsExtracted':len(result['teams']),'playersExtracted':len(result['players']),'coachesExtracted':len(result['coaches']),'releaseReady':False,'missing':['Arabic name review','Club season rosters','Contextual portraits','Detailed career, transfers and season statistics','Image/redistribution rights review']})
 (BASE/'reports/FIFA_EXTRACTION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:report[k] for k in ['teamsExtracted','playersExtracted','coachesExtracted','releaseReady']}));print('Font issues:',len(result['issues']))
