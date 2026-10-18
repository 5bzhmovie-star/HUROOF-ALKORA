"""Reproducible offline English media linkage; leaves canonical catalog unchanged."""
import argparse,collections,datetime,hashlib,json
from pathlib import Path
from urllib.parse import urlsplit
from build_identity_review import collect,birth,link_english_media,match_candidates,write_sqlite

def build(base,output):
 base=Path(base);output=Path(output)
 if output.exists():raise ValueError('Use a new output directory')
 rows,targets,inputs=collect(base);sdp=json.loads((base/'data/english_completion_sdp_personal_2026_27.json').read_text());club_links={str(c['sourceClubId']):str(c['plSourceClubId']) for c in sdp['clubs']}
 for r in rows:
  if r['namespace']=='premier-league-sdp':
   media=r.pop('mediaCandidates');r['assertedOtherClubId']={'namespace':'premier-league-api','id':club_links[r['clubId']],'status':'pending-source-club-linkage-review'};r['mediaCandidates']=media
 primary=json.loads((base/'data/pl_api_first_team_candidates_2026_27.json').read_text());records=[]
 for file in sorted((base/'data').glob('english_completion_*2026_27.json')):
  raw=file.read_bytes();data=json.loads(raw)
  if not data.get('media') or 'logos'in file.name:continue
  sha=hashlib.sha256(raw).hexdigest();inputs.append({'path':'data/'+file.name,'sha256':sha,'bytes':len(raw)})
  for original in data['media']:
   if original.get('kind')!='player':continue
   e=dict(original);personal=e.get('personalAsPublished') or {};millis=personal.get('birth',{}).get('date',{}).get('millis');e['publishedBirthDate']=datetime.datetime.fromtimestamp(millis/1000,datetime.timezone.utc).date().isoformat() if isinstance(millis,(int,float)) else birth((e.get('officialRecord') or {}).get('birthDate'));club=(personal.get('currentTeam') or {}).get('id')
   if isinstance(club,(int,float)) and float(club).is_integer():e['expectedPlClubId']=str(int(club))
   elif file.name=='english_completion_palace_2026_27.json' and e.get('sourceClubId')=='crystal-palace' and urlsplit(e.get('source','')).hostname=='www.cpfc.co.uk' and e.get('officialRecord',{}).get('teamId')=='t31':
    # Namespaced club mapping supported by the official first-team page; t31 is not PL numeric6.
    palace=[c for c in primary['clubs'] if c['clubAsPublished']['name']=='Crystal Palace']
    if len(palace)==1:e['expectedPlClubId']=str(palace[0]['sourceClubId'])
   e.update(evidenceFile='data/'+file.name,evidenceSha256=sha);records.append(e)
 media=json.loads((base/'data/media_files.index.json').read_text());rows,audit=link_english_media(rows,records,media['files']);matches=match_candidates(rows,targets);output.mkdir(parents=True);write_sqlite(output/'identity_review.sqlite',rows,matches,targets)
 manifest={'format':'huroof-identity-review-v1','releaseReady':False,'canonicalCatalogModified':False,'inputs':inputs,'counts':{'observations':len(rows),'fifaTargets':len(targets),'candidateLinks':sum(len(r['candidateIds']) for r in matches),'observationsByNamespace':dict(collections.Counter(r['namespace'] for r in rows)),'reviewStatuses':dict(collections.Counter(r['status'] for r in matches)),'clubContextMediaLinks':sum(len(r['mediaCandidates']) for r in rows),'distinctClubContextMediaFiles':len({m['path'] for r in rows for m in r['mediaCandidates']})},'parts':[],'englishMediaAudit':dict(collections.Counter(r['status'] for r in audit))}
 for label,values in [('observations',rows),('matches',matches),('fifa_targets',targets),('english_media_audit',audit)]:
  for at in range(0,len(values),200):
   name=f'{label}-{at//200+1:04d}.json';raw=(json.dumps(values[at:at+200],ensure_ascii=False,separators=(',',':'))+'\n').encode();(output/name).write_bytes(raw);manifest['parts'].append({'path':name,'kind':label,'rows':len(values[at:at+200]),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 raw=(output/'identity_review.sqlite').read_bytes();manifest['sqlite']={'path':'identity_review.sqlite','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()};(output/'index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');return manifest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('base');p.add_argument('output');a=p.parse_args();print(json.dumps(build(a.base,a.output)['counts']))
