"""Offline, source-namespaced identity evidence. Never mutates the canonical catalog."""
import argparse,collections,datetime,hashlib,json,re,sqlite3,unicodedata
from pathlib import Path

def source_key(namespace,person_id):
 return json.dumps([str(namespace),str(person_id)],ensure_ascii=False,separators=(',',':'))
def normalize(name):
 s=''.join(c for c in unicodedata.normalize('NFKD',str(name)).casefold() if not unicodedata.combining(c))
 return ' '.join(''.join(c if c.isalnum() else ' ' for c in s).split())
def birth(value):
 if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',value[:10]):return None
 try:return datetime.date.fromisoformat(value[:10]).isoformat()
 except ValueError:return None

def match_candidates(rows,targets):
 by_name=collections.defaultdict(set);by_pair=collections.defaultdict(set)
 for target in targets:
  for name in target['names']:
   n=normalize(name)
   if not n:continue
   by_name[n].add(target['id'])
   if birth(target.get('dob')):by_pair[n,target['dob']].add(target['id'])
 result=[]
 for row in rows:
  names={normalize(n) for n in row['names'] if normalize(n)};dob=birth(row.get('dob'));ids=set();same_names=set()
  for name in names:
   same_names.update(by_name[name]);ids.update(by_pair[name,dob] if dob else ())
  status='missing-birth-date' if not dob else ('ambiguous' if len(ids)>1 else ('exact-name-and-birth-date-review-required' if ids else ('birth-date-conflict' if same_names else 'no-exact-fifa-match')))
  result.append({'sourceId':row['id'],'candidateIds':sorted(ids),'sameNameTargetIds':sorted(same_names),'status':status,'mergeApproved':False,'basis':'Exact normalized published name plus full birth date only; no fuzzy matching or automatic merge'})
 return result

def write_sqlite(path,rows,matches,targets):
 if Path(path).exists():raise ValueError('Output database must be new')
 db=sqlite3.connect(path);db.execute('PRAGMA foreign_keys=ON')
 try:
  db.executescript('''CREATE TABLE observations(id TEXT PRIMARY KEY,namespace TEXT NOT NULL,source_person_id TEXT NOT NULL,club_id TEXT NOT NULL,dob TEXT,payload TEXT NOT NULL);
CREATE INDEX observation_source_identity ON observations(namespace,source_person_id);
CREATE TABLE fifa_targets(id TEXT PRIMARY KEY,dob TEXT,payload TEXT NOT NULL);
CREATE TABLE candidates(source_id TEXT NOT NULL REFERENCES observations(id),target_id TEXT NOT NULL REFERENCES fifa_targets(id),status TEXT NOT NULL,merge_approved INTEGER NOT NULL CHECK(merge_approved=0),PRIMARY KEY(source_id,target_id));
CREATE TABLE review_status(source_id TEXT PRIMARY KEY REFERENCES observations(id),status TEXT NOT NULL,payload TEXT NOT NULL);
CREATE TABLE media_candidates(source_id TEXT NOT NULL REFERENCES observations(id),path TEXT NOT NULL,sha256 TEXT NOT NULL,club_id TEXT NOT NULL,approved INTEGER NOT NULL CHECK(approved=0),PRIMARY KEY(source_id,path));''')
  db.executemany('INSERT INTO observations VALUES(?,?,?,?,?,?)',[(r['id'],r['namespace'],r['sourcePersonId'],r['clubId'],r.get('dob'),json.dumps(r,ensure_ascii=False)) for r in rows])
  db.executemany('INSERT INTO fifa_targets VALUES(?,?,?)',[(r['id'],r.get('dob'),json.dumps(r,ensure_ascii=False)) for r in targets])
  for r in matches:
   db.execute('INSERT INTO review_status VALUES(?,?,?)',(r['sourceId'],r['status'],json.dumps(r,ensure_ascii=False)))
   db.executemany('INSERT INTO candidates VALUES(?,?,?,0)',[(r['sourceId'],t,r['status']) for t in r['candidateIds']])
  for r in rows:
   db.executemany('INSERT INTO media_candidates VALUES(?,?,?,?,0)',[(r['id'],m['path'],m['sha256'],r['clubId']) for m in r.get('mediaCandidates',[])])
  db.commit()
  if db.execute('PRAGMA foreign_key_check').fetchall() or db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Database validation failed')
 finally:db.close()

def collect(base):
 rows=[];inputs=[]
 def read(name):
  raw=(base/'data'/name).read_bytes();sha=hashlib.sha256(raw).hexdigest();inputs.append({'path':'data/'+name,'sha256':sha,'bytes':len(raw)});return json.loads(raw),sha
 def add(ns,pid,club,names,dob,source,filename,sha,**extra):
  names=list(dict.fromkeys(n.strip() for n in names if isinstance(n,str) and n.strip()));key=source_key(ns,pid)
  r={'id':hashlib.sha256(source_key(key,club+filename).encode()).hexdigest(),'namespace':ns,'sourcePersonId':str(pid),'sourceIdentityKey':key,'clubId':str(club),'names':names,'dob':birth(dob),'source':source,'inputFile':'data/'+filename,'inputSha256':sha,'season':'2026-2027','verification':'pending','mergeApproved':False,**extra};rows.append(r)
 fn='laliga_senior_squads_2026_27.json';data,sha=read(fn)
 for c in data['clubs']:
  for p in c['players']:
   person=p['person'];add('laliga',person['id'],str(c['sourceClubId']),[person.get('name'),' '.join(filter(None,[person.get('firstname'),person.get('lastname')]))],person.get('date_of_birth'),c['sources'][0]['source'],fn,sha,clubName=c['clubName'],sourcePortraits=list(p.get('photos',{}).get('001',{}).values()))
 fn='spl_squad_candidates_2026_27.json';data,sha=read(fn)
 for c in data:
  for p in c['players']:
   add('spl-primary',p['sourcePersonId'],p['sourceClubId'],[p.get('nameEn'),' '.join(filter(None,[p.get('publishedFirstNameEn'),p.get('publishedLastNameEn')]))],p.get('personal',{}).get('dateOfBirth'),p['source'],fn,sha,clubName=c['club']['nameEn'],nameAr=p.get('nameAr'),sourcePortraits=[p['portraitSource']] if p.get('portraitSource') else [])
 fn='pl_api_first_team_candidates_2026_27.json';data,sha=read(fn)
 for c in data['clubs']:
  for p in c['players']:
   personal=p['personalAsPublished'];name=personal.get('name',{});millis=personal.get('birth',{}).get('date',{}).get('millis');dob=datetime.datetime.fromtimestamp(millis/1000,datetime.timezone.utc).date().isoformat() if isinstance(millis,(int,float)) else None
   src=c['sources'][0];src=src.get('source',src.get('url')) if isinstance(src,dict) else src
   add('premier-league-api',p['sourcePersonId'],str(c['sourceClubId']),[p.get('nameEn'),' '.join(filter(None,[name.get('first'),name.get('middle'),name.get('last')]))],dob,src,fn,sha,clubName=c['clubAsPublished']['name'],sourcePortraits=[])
 fn='english_completion_sdp_personal_2026_27.json';data,sha=read(fn)
 for c in data['clubs']:
  for p in c['players']:
   personal=p['personalAsPublished'];name=personal.get('name',{});add('premier-league-sdp',p['sourcePersonId'],str(c['sourceClubId']),[p.get('nameAsPublished'),' '.join(filter(None,[name.get('first'),name.get('middle'),name.get('last')]))],personal.get('dates',{}).get('birth'),c['source'],fn,sha,clubName=c['clubAsPublished']['name'],assertedOtherSourceId={'namespace':'premier-league-api','id':p.get('plPersonId'),'status':'pending-name-and-club-linkage-review'},sourcePortraits=[])
 fn='wc2026_players.json';data,sha=read(fn);targets=[{'id':p['id'],'names':list(dict.fromkeys(n for n in [p.get('nameOriginal'),p.get('nameEn'),' '.join(filter(None,[p.get('firstNames'),p.get('lastNames')]))] if n)),'dob':birth(p.get('dateOfBirth')),'clubAtWorldCup':p.get('clubAtWorldCup'),'nationalTeamCode':p.get('nationalTeamCode'),'source':p['source'],'inputSha256':sha} for p in data]
 fn='media_files.index.json';media,sha=read(fn);by_url=collections.defaultdict(list)
 for asset in media['files']:
  for ev in asset.get('evidence',[]):
   url=ev.get('imageSource') or ev.get('source')
   if url:by_url[url].append(asset)
 for r in rows:
  assets={}
  for url in r.pop('sourcePortraits',[]):
   for a in by_url[url]:
    # Exact original media URL, plus explicit club context in the local path.
    safe_context=(r['namespace']=='laliga' and '/laliga_squads/'+r['clubId']+'/player/'+r['sourcePersonId']+'/' in a['path']) or (r['namespace']=='spl-primary' and '/spl/players/'+r['sourcePersonId']+'/clubs/'+r['clubId']+'/' in a['path'])
    if safe_context:assets[a['path']]={'path':a['path'],'sha256':a['sha256'],'bytes':a['bytes'],'approvedForQuestions':False,'identityKitAndRights':'pending'}
  r['mediaCandidates']=list(assets.values())
 if len({r['id'] for r in rows})!=len(rows):raise ValueError('Duplicated observation')
 return rows,targets,inputs

def build(base,output):
 base=Path(base);output=Path(output)
 if output.exists():raise ValueError('Use a new output directory')
 rows,targets,inputs=collect(base);matches=match_candidates(rows,targets);output.mkdir(parents=True);write_sqlite(output/'identity_review.sqlite',rows,matches,targets)
 manifest={'format':'huroof-identity-review-v1','releaseReady':False,'canonicalCatalogModified':False,'inputs':inputs,'counts':{'observations':len(rows),'fifaTargets':len(targets),'candidateLinks':sum(len(r['candidateIds']) for r in matches),'observationsByNamespace':dict(collections.Counter(r['namespace'] for r in rows)),'reviewStatuses':dict(collections.Counter(r['status'] for r in matches)),'clubContextMediaLinks':sum(len(r['mediaCandidates']) for r in rows)},'parts':[]}
 for label,values in [('observations',rows),('matches',matches),('fifa_targets',targets)]:
  for at in range(0,len(values),200):
   path=f'{label}-{at//200+1:04d}.json';raw=(json.dumps(values[at:at+200],ensure_ascii=False,separators=(',',':'))+'\n').encode();(output/path).write_bytes(raw);manifest['parts'].append({'path':path,'kind':label,'rows':len(values[at:at+200]),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 raw=(output/'identity_review.sqlite').read_bytes();manifest['sqlite']={'path':'identity_review.sqlite','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()};(output/'index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('base');parser.add_argument('output');args=parser.parse_args();print(json.dumps(build(args.base,args.output)['counts'],ensure_ascii=False))
