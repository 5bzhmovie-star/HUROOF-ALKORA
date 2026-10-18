import importlib.util,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('barca_builder',Path(__file__).resolve().parents[1]/'scripts/build_php_source_catalog.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class BarcelonaLinkTests(unittest.TestCase):
 def test_matching_requires_birth_club_and_published_full_name_slug(self):
  r={'namespace':'laliga','clubId':'4','names':['Rodrigo Hernández Cascante'],'dob':'1996-06-22'};u='https://www.fcbarcelona.com/en/football/first-team/players/16286/rodrigo-hernandez-cascante';x={'sourcePersonId':'16286','sourceClubSlug':'barcelona','profileUrl':u,'nameEnAsPublished':'Rodri','kind':'player','profileEvidence':{'source':u,'dateOfBirth':r['dob'],'status':'published-person-schema','memberOf':{'name':'FC Barcelona  Club'},'sourceSha256':'s'}};a={'path':'portrait.jpg','sha256':'a','evidence':[{'sourcePersonId':'16286','sourceClubSlug':'barcelona','sourcePage':u,'kind':'player'}]}
  self.assertEqual(m.barcelona_context_candidate(r,[x],[a])['sha256'],'a')
  for bad in [{**r,'dob':'1996-06-21'},{**r,'clubId':'15'},{**r,'names':['Rodrigo']}]:self.assertIsNone(m.barcelona_context_candidate(bad,[x],[a]))
  self.assertIsNone(m.barcelona_context_candidate(r,[x,x],[a]));self.assertIsNone(m.barcelona_context_candidate(r,[x],[]))
  x['profileEvidence']['memberOf']['name']='Other club';self.assertIsNone(m.barcelona_context_candidate(r,[x],[a]))
