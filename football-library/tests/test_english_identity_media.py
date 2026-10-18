import importlib.util,unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'scripts/build_identity_review.py'
def module():
 s=importlib.util.spec_from_file_location('identity_english',P);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
class EnglishIdentityMediaTest(unittest.TestCase):
 def case(self):
  r={'id':'observation','namespace':'premier-league-api','sourcePersonId':'123','clubId':'6','names':['José Silva'],'dob':'1990-01-01','mediaCandidates':[]};e={'plPersonId':'123','nameAsPublished':'Jose Silva','expectedPlClubId':'6','publishedBirthDate':'1990-01-01','file':'assets/pending_media/english_completion/club/person/portrait.png','sha256':'a'*64,'bytes':100,'imageSource':'https://example.test/player.png','kind':'player','evidenceFile':'source.json','evidenceSha256':'b'*64};a={'path':e['file'],'sha256':e['sha256'],'bytes':100,'evidence':[{'imageSource':e['imageSource']}]};return r,e,a
 def test_exact_identity_and_club_links_original_bytes_without_approval(self):
  r,e,a=self.case();rows,audit=module().link_english_media([r],[e],[a]);self.assertEqual(len(rows[0]['mediaCandidates']),1);self.assertFalse(rows[0]['mediaCandidates'][0]['approvedForQuestions']);self.assertEqual(r['mediaCandidates'],[])
 def test_wrong_club_changed_birth_or_file_hash_are_rejected(self):
  for field,value in [('expectedPlClubId','7'),('publishedBirthDate','1991-01-01'),('sha256','c'*64),('nameAsPublished','Another Person')]:
   r,e,a=self.case();e[field]=value;rows,audit=module().link_english_media([r],[e],[a]);self.assertEqual(rows[0]['mediaCandidates'],[],field)
 def test_other_namespace_numeric_identity_is_not_equivalent(self):
  r,e,a=self.case();r['namespace']='laliga';rows,audit=module().link_english_media([r],[e],[a]);self.assertEqual(rows[0]['mediaCandidates'],[])
 def test_sdp_link_requires_explicit_other_club_and_identity_plus_birth(self):
  r,e,a=self.case();r.update(namespace='premier-league-sdp',sourcePersonId='999',clubId='31',assertedOtherSourceId={'namespace':'premier-league-api','id':'123'},assertedOtherClubId={'namespace':'premier-league-api','id':'6'});rows,audit=module().link_english_media([r],[e],[a]);self.assertEqual(len(rows[0]['mediaCandidates']),1);r['assertedOtherClubId']['id']='7';rows,audit=module().link_english_media([r],[e],[a]);self.assertEqual(rows[0]['mediaCandidates'],[])
if __name__=='__main__':unittest.main()
