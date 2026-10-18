import importlib.util, unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('uefa_builder',Path(__file__).resolve().parents[1]/'scripts/build_php_source_catalog.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class UefaContextTests(unittest.TestCase):
 def inputs(self):
  r={'id':'obs','namespace':'premier-league-api','clubId':'1','names':['Bukayo Saka'],'dob':'2001-09-05'}
  a={'path':'image.jpg','sha256':'abc','evidence':[{'sourcePersonId':'250106939','sourceClubId':'52280','kind':'player','sourceIdNamespace':'uefa-person','season':'2026-2027'}]}
  e={'targetObservationId':'obs','targetClubId':'eng-1','targetBirth':r['dob'],'targetName':'Bukayo Saka','media':{'path':'image.jpg','sha256':'abc','sourceClubId':'52280','clubNameAsPublished':'Arsenal FC','kind':'player','season':'2026-2027','sourcePersonId':'250106939','nameAsPublished':'Bukayo Saka'},'uefaPlayer':{'sourcePersonId':'250106939','sourceClubId':'52280','nameOriginal':'Bukayo Saka','profileUrl':'https://www.uefa.com/profile/saka/'},'profileEvidence':{'source':'https://www.uefa.com/profile/saka/','status':'published-meta-fields','names':['Bukayo Saka'],'dateOfBirth':r['dob'],'sourceSha256':'x'}}
  return r,e,{'image.jpg':a}
 def test_exact_birth_name_club_asset_evidence(self):
  r,e,a=self.inputs();x=m.uefa_context_candidate(r,[e],a);self.assertEqual(x['sha256'],'abc');self.assertFalse(x['approvedForQuestions']);self.assertTrue(x['dateOfBirthCorroborated'])
 def test_mismatches_and_ambiguous_links_are_rejected(self):
  r,e,a=self.inputs()
  for wrong in [{**r,'dob':'1990-01-01'},{**r,'clubId':'12'},{**r,'names':['Saka']},{**r,'id':'other'}]:self.assertIsNone(m.uefa_context_candidate(wrong,[e],a))
  self.assertIsNone(m.uefa_context_candidate(r,[e,e],a));self.assertIsNone(m.uefa_context_candidate(r,[e],{}))
  e['media']['sha256']='wrong';self.assertIsNone(m.uefa_context_candidate(r,[e],a))
 def test_same_player_on_wrong_official_club_evidence_is_rejected(self):
  r,e,a=self.inputs();a['image.jpg']['evidence'][0]['sourceClubId']='52682';self.assertIsNone(m.uefa_context_candidate(r,[e],a))

class UefaCatalogIntegrationTests(unittest.TestCase):
 def test_real_snapshot_rejects_birth_conflict_and_preserves_missing_statistics(self):
  import json,tempfile
  base=Path(__file__).resolve().parents[1]
  with tempfile.TemporaryDirectory() as tmp:
   result=m.build(base,Path(tmp)/'catalog');self.assertGreaterEqual(result['playerCardsWithContextPortrait'],1311)
   cards=[p for f in (Path(tmp)/'catalog/clubs').glob('eng-*.json') for p in json.loads(f.read_text())['players']]
   evidence=json.loads((base/'data/english_uefa_profile_evidence_2026_10_18.json').read_text())['records'];count=0
   for x in evidence:
    p=next(p for p in cards if p['id']==x['targetObservationId'])
    if x['profileEvidence']['dateOfBirth']!=x['targetBirth']:
     self.assertIsNone(p['photo']);self.assertNotIn('competitionStatistics',p);continue
    count+=1;self.assertFalse(p['approvedForQuestions']);self.assertEqual(p['photo'],x['media']['sha256'])
    stats=p['competitionStatistics'][0]
    for key in ['appearances','goals','goalsConceded']:self.assertEqual(stats[key],x['uefaPlayer']['statistics'][key])
    self.assertEqual(stats['sourceSha256'],x['media']['sourcePageSha256']);self.assertFalse(stats['approvedForQuestions'])
   self.assertEqual(count,67)
