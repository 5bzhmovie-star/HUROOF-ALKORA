"""Build a source-only PHP catalog from preserved identity evidence; never modify the game database."""
import argparse,collections,hashlib,json,re,sqlite3,unicodedata
from pathlib import Path
def norm(v):
 s=''.join(c for c in unicodedata.normalize('NFKD',str(v)).casefold() if not unicodedata.combining(c));return ' '.join(s.translate(str.maketrans('أإآٱى','ااااي')).replace('ـ','').split())
def same_person(r,p,club):
 return str(p.get('plPersonId'))==r['sourcePersonId'] and str(club)==r['clubId'] and p['personalAsPublished'].get('dates',{}).get('birth')==r['dob'] and norm(p['nameAsPublished']) in {norm(n) for n in r['names']}
def context_photo_candidate(r,photos,paths,births):
 # A contextual presentation candidate only: never an identity merge or an approved question.
 if r['namespace']!='premier-league-api' or r['clubId']!='4':return None
 def key(value):return ''.join(c for c in norm(value) if c.isalnum())
 names={key(n) for n in r['names']}
 hits=[p for p in photos if p.get('kind')=='player' and p.get('teamId')=='club:chelsea' and p.get('declaredSeason')=='2026-2027' and key(p.get('name','')) in names]
 if len(hits)!=1:return None
 p=hits[0];birth=births.get(p.get('sourceIdentity'))
 if not birth or not r.get('dob') or birth.get('dateOfBirth')!=r['dob'] or birth.get('source')!=p.get('profileSource') or not any(key(n) in names for n in birth.get('profileNames',[])):return None
 a=paths.get(p.get('file'))
 if not a or a['sha256']!=p.get('sha256') or not any(e.get('sourceIdentity')==p.get('sourceIdentity') and e.get('kind')=='player' for e in a.get('evidence',[])):return None
 return {'sha256':a['sha256'],'status':'candidate-exact-name-birth-and-official-club-context','dateOfBirthCorroborated':True,'birthSourceSha256':birth.get('sourceSha256'),'approvedForQuestions':False,'sourceIdentity':p['sourceIdentity'],'source':p.get('profileSource') or p.get('source')}
def build(base,out):
 base=Path(base).resolve();out=Path(out)
 if out.exists():raise ValueError('Use a new output directory')
 sources={}
 def read(name):
  raw=(base/'data'/name).read_bytes();sources[name]={'path':'data/'+name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()};return json.loads(raw)
 review=base/'data/identity_review_english_media_2026_10_18';m=json.loads((review/'index.json').read_text());raw=(review/'identity_review.sqlite').read_bytes()
 if hashlib.sha256(raw).hexdigest()!=m['sqlite']['sha256']:raise ValueError('Identity database checksum mismatch')
 for evidence in m['inputs']:
  if hashlib.sha256((base/evidence['path']).read_bytes()).hexdigest()!=evidence['sha256']:raise ValueError('Source snapshot changed; rebuild identity evidence first')
 db=sqlite3.connect((review/'identity_review.sqlite').as_uri()+'?mode=ro',uri=True);rows=[json.loads(r[0]) for r in db.execute("SELECT payload FROM observations WHERE namespace IN ('laliga','spl-primary','premier-league-api') ORDER BY namespace,source_person_id")];by={(r['namespace'],r['sourcePersonId'],r['clubId']):r for r in rows};assets=read('media_files.index.json')['files']
 if (base/'data/club_badges_supplement.index.json').exists():
  extra=read('club_badges_supplement.index.json')
  if extra.get('format')!='huroof-club-badges-v1':raise ValueError('Invalid badge supplement')
  assets=assets+extra['files']
  if len({a['sha256'] for a in assets})!=len(assets):raise ValueError('Duplicate supplemental media')
 chelsea=read('chelsea_profiles_2026_27.json')['photos'];chelsea_births={x['sourceIdentity']:x for x in read('chelsea_profile_birth_evidence_2026_10_18.json')['profiles']}
 paths={a['path']:a for a in assets};refs={};details={};coaches={};sdpclub={};extra={}
 for c in read('english_completion_sdp_personal_2026_27.json')['clubs']:
  sdpclub[str(c['sourceClubId'])]=str(c['plSourceClubId'])
  for p in c['players']:extra[str(p.get('plPersonId'))]=(p,str(c['plSourceClubId']),c['source'])
 for c in read('laliga_senior_squads_2026_27.json')['clubs']:
  ns='laliga';cid=str(c['sourceClubId']);refs[ns,cid]={'league':'esp','name':c['clubName'],'nameAr':None,'source':c['sources'][0]['source'],'logoPrefix':'assets/pending_media/laliga/clubs/'+cid+'/logo.'}
  for p in c['players']:
   x=p['person'];details[ns,str(x['id']),cid]={'heightCm':x.get('height') or None,'weightKg':x.get('weight') or None,'birthPlace':x.get('place_of_birth'),'nationality':x.get('country',{}).get('id'),'position':p.get('position',{}).get('name'),'shirtNumber':p.get('shirt_number'),'preferredFoot':None}
 for c in read('spl_squad_candidates_2026_27.json'):
  ns='spl-primary';cid=str(c['club']['sourceClubId']);refs[ns,cid]={'league':'sau','name':c['club']['nameEn'],'nameAr':c['club'].get('nameAr'),'source':c['club']['source'],'logoPrefix':'assets/pending_media/spl/clubs/'+cid+'/logo.'}
  for p in c['players']:
   d=p.get('personal',{});details[ns,p['sourcePersonId'],cid]={'nameAr':p.get('nameAr'),'heightCm':d.get('heightCm') or None,'weightKg':d.get('weightKg') or None,'nationality':p.get('nationalityCodeAsPublished'),'position':p.get('positionLabel'),'shirtNumber':p.get('shirtNumber'),'preferredFoot':d.get('preferredFoot')}
  x=c.get('coach') or {};coaches[ns,cid]=[{'name':x.get('nameEn') or x.get('nameAr'),'nameAr':x.get('nameAr'),'dateOfBirth':str(x.get('dateOfBirthAsPublished') or '')[:10] or None,'source':x.get('sourceAr'),'status':'source-observation-not-current-coach-certification','photo':next((a['sha256'] for a in assets if '/coaches/' in a['path'] and cid in a['path'] and any(e.get('source')==x.get('portraitSource') for e in a.get('evidence',[]))),None)}] if x else []
 for c in read('pl_api_first_team_candidates_2026_27.json')['clubs']:
  ns='premier-league-api';cid=str(c['sourceClubId']);src=c['sources'][0];refs[ns,cid]={'league':'eng','name':c['clubAsPublished']['name'],'nameAr':None,'source':src.get('source') if isinstance(src,dict) else src}
  for p in c['players']:
   x=p['personalAsPublished'];key=(ns,p['sourcePersonId'],cid);d={'nationality':x.get('nationalTeam',{}).get('isoCode'),'birthPlace':x.get('birth',{}).get('place'),'position':x.get('info',{}).get('positionInfo') or x.get('info',{}).get('position'),'shirtNumber':x.get('info',{}).get('shirtNum')};e=extra.get(p['sourcePersonId'])
   if e and key in by and same_person(by[key],e[0],e[1]):
    v=e[0]['personalAsPublished'];d.update(heightCm=v.get('height') or None,weightKg=v.get('weight') or None,preferredFoot=v.get('preferredFoot'),joinedClubAsPublished=v.get('dates',{}).get('joinedClub'),additionalSource=e[2])
   details[key]=d
 for x in read('laliga_head_coaches_2026_27.json')['currentCoachSources']:
  p=x['personalAsPublished'];cid=str(x['sourceClubId']);coaches['laliga',cid]=[{'name':p.get('name'),'dateOfBirth':str(p.get('date_of_birth') or '')[:10] or None,'source':x['sources'][0]['source'],'status':'pending','photo':next((a['sha256'] for a in assets if a['path'].startswith('assets/pending_media/laliga_squads/'+cid+'/coach/'+str(x['sourcePersonId'])+'/')),None)}]
 for x in read('english_headcoach_completion_2026_27.json')['currentHeadcoaches']:
  p=x['nameAsPublished'];a=paths.get((x.get('portrait') or {}).get('file'));coaches['premier-league-api',sdpclub.get(str(x['sourceClubId']))]=[{'name':' '.join(filter(None,[p.get('first'),p.get('last')])),'dateOfBirth':x.get('dateOfBirth'),'source':x['source'],'appointedAtAsPublished':x.get('appointmentDateAsPublished'),'status':'pending','photo':a['sha256'] if a and a['sha256']==x['portrait']['sha256'] else None}]
 aliases={'Manchester City FC':'Manchester City','Man City FC':'Manchester City','Manchester United FC':'Manchester United','Liverpool FC':'Liverpool','Arsenal FC':'Arsenal','Chelsea FC':'Chelsea'};logos={}
 for a in assets:
  for e in a.get('evidence',[]):
   if e.get('kind')=='club-logo':logos[aliases.get(e.get('nameAsPublished'),e.get('nameAsPublished'))]=a['sha256']
 groups=collections.defaultdict(list)
 for r in rows:groups[r['namespace'],r['clubId']].append(r)
 out.mkdir(parents=True);(out/'clubs').mkdir();search=[];clubs=[];pictures=0
 for (ns,cid),members in sorted(groups.items()):
  ref=refs[ns,cid];club_id=ref['league']+'-'+cid
  if not re.fullmatch(r'[a-z0-9-]{3,80}',club_id):raise ValueError('Unsafe club identifier')
  logo=next((a['sha256'] for a in assets if ref.get('logoPrefix') and a['path'].startswith(ref['logoPrefix'])),None) or logos.get(ref['name']);players=[]
  for r in members:
   p={'id':r['id'],'sourceIdentityKey':r['sourceIdentityKey'],'name':r['names'][0],'aliases':r['names'],'dateOfBirth':r['dob'],'source':r['source'],'sourceFile':r['inputFile'],'verification':'pending','approvedForQuestions':False,'isCanonicalIdentity':False,**details.get((ns,r['sourcePersonId'],cid),{})};media=r.get('mediaCandidates',[]);p['photo']=media[0]['sha256'] if media else None;candidate=context_photo_candidate(r,chelsea,paths,chelsea_births) if not p['photo'] else None
   if candidate:p['photo']=candidate['sha256'];p['photoLinkEvidence']=candidate
   p['photoStatus']='pending-identity-kit-period-and-rights' if p['photo'] else 'missing';pictures+=bool(p['photo']);p['fifaIdentityCandidates']=[v[0] for v in db.execute('SELECT target_id FROM candidates WHERE source_id=?',(r['id'],))];players.append(p);search.append({'id':p['id'],'club':club_id,'league':ref['league'],'name':p['name'],'nameAr':p.get('nameAr'),'search':norm(' '.join([*r['names'],p.get('nameAr') or '',ref['name'],ref.get('nameAr') or '',str(p.get('nationality') or ''),str(p.get('position') or '')]))})
  doc={'id':club_id,'league':ref['league'],'name':ref['name'],'nameAr':ref.get('nameAr'),'logo':logo,'source':ref['source'],'coaches':coaches.get((ns,cid),[]),'players':players,'verification':'pending','releaseReady':False}
  if ns=='spl-primary' and ref['name']=='Al Fateh':doc['coachReviewNote']='توجد أدلة من موقع النادي لتغيير المدرب؛ لا تعتمد ملاحظة هذا المصدر بوصفها المدرب الحالي.'
  name='clubs/'+club_id+'.json';raw=(json.dumps(doc,ensure_ascii=False,separators=(',',':'))+'\n').encode();(out/name).write_bytes(raw);clubs.append({'id':club_id,'league':ref['league'],'name':ref['name'],'nameAr':ref.get('nameAr'),'logo':logo,'players':len(players),'file':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 raw=(json.dumps(search,ensure_ascii=False,separators=(',',':'))+'\n').encode();(out/'search.json').write_bytes(raw);index={'format':'huroof-php-source-catalog-v1','releaseReady':False,'season':'2026-2027','canonicalCatalogModified':False,'leagues':[{'id':'sau','nameAr':'الدوري السعودي للمحترفين'},{'id':'esp','nameAr':'الدوري الإسباني'},{'id':'eng','nameAr':'الدوري الإنجليزي الممتاز'}],'clubs':clubs,'search':{'path':'search.json','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()},'sourceIdentityManifestSha256':hashlib.sha256((review/'index.json').read_bytes()).hexdigest(),'sourceInputs':list(sources.values())};(out/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');db.close();return {'clubs':len(clubs),'sourcePlayerCards':len(search),'playerCardsWithContextPortrait':pictures,'clubsWithLogo':sum(bool(c['logo']) for c in clubs),'releaseReady':False}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('base');p.add_argument('output');a=p.parse_args();print(json.dumps(build(a.base,a.output)))
