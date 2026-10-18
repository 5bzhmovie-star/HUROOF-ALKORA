import importlib.util, unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'scripts/build_php_source_catalog.py'
s=importlib.util.spec_from_file_location('context_builder',P);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ContextPortraitTests(unittest.TestCase):
 def test_matching_is_contextual_and_requires_unique_complete_name(self):
  r={'namespace':'premier-league-api','clubId':'4','names':['Moisés Caicedo'],'dob':'2001-11-02'}
  photo={'kind':'player','name':'Moises Caicedo','teamId':'club:chelsea','declaredSeason':'2026-2027','file':'portrait.webp','sha256':'a'}
  asset={'path':'portrait.webp','sha256':'a','evidence':[{'sourceIdentity':'chelsea:123','kind':'player'}]};photo['sourceIdentity']='chelsea:123';photo['profileSource']='https://club/profile/123'
  births={'chelsea:123':{'source':photo['profileSource'],'dateOfBirth':r['dob'],'profileNames':['Moises Caicedo']}}
  self.assertEqual(m.context_photo_candidate(r,[photo],{'portrait.webp':asset},births)['sha256'],'a')
  self.assertIsNone(m.context_photo_candidate({**r,'clubId':'1'},[photo],{'portrait.webp':asset},births))
  self.assertIsNone(m.context_photo_candidate(r,[photo,photo],{'portrait.webp':asset},births))
  self.assertIsNone(m.context_photo_candidate(r,[{**photo,'sha256':'wrong'}],{'portrait.webp':asset},births))
  self.assertIsNone(m.context_photo_candidate(r,[{**photo,'name':'Caicedo'}],{'portrait.webp':asset},births))
  self.assertIsNone(m.context_photo_candidate({**r,'dob':'1999-01-01'},[photo],{'portrait.webp':asset},births))
 def test_no_canonical_approval_is_inferred(self):
  r={'namespace':'premier-league-api','clubId':'4','names':['Cole Palmer'],'dob':'2002-05-06'};p={'kind':'player','name':'Cole Palmer','teamId':'club:chelsea','declaredSeason':'2026-2027','file':'p','sha256':'a','sourceIdentity':'chelsea:1'}
  p['profileSource']='https://club/profile/1';births={'chelsea:1':{'source':p['profileSource'],'dateOfBirth':r['dob'],'profileNames':['Cole Palmer']}}
  result=m.context_photo_candidate(r,[p],{'p':{'sha256':'a','evidence':[{'sourceIdentity':'chelsea:1','kind':'player'}]}},births)
  self.assertFalse(result['approvedForQuestions']);self.assertTrue(result['dateOfBirthCorroborated']);self.assertEqual(result['status'],'candidate-exact-name-birth-and-official-club-context')
