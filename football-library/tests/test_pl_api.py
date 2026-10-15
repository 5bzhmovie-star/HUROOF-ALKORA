import importlib.util,unittest
from pathlib import Path

class PremierApiTest(unittest.TestCase):
 def test_only_explicit_current_first_team_is_a_current_squad_candidate(self):
  p=Path(__file__).resolve().parents[1]/'scripts/acquire_pl_api.py'
  self.assertTrue(p.is_file(),'Official API collector missing')
  spec=importlib.util.spec_from_file_location('pl_api',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  records=[{'id':1,'name':{'display':'Senior'},'currentTeam':{'id':2,'teamType':'FIRST'}},{'id':3,'name':{'display':'Academy'},'currentTeam':{'id':20,'teamType':'U21'}},{'id':4,'name':{'display':'Moved'},'currentTeam':{'id':8,'teamType':'FIRST'}},{'id':5,'name':{'display':'Unclear'}}]
  active,others=m.classify(records,2)
  self.assertEqual([r['sourcePersonId'] for r in active],['1'])
  self.assertEqual(len(others),3)
  self.assertEqual(active[0]['canonicalPlayerId'],None)
  with self.assertRaises(ValueError):m.classify(records+[records[0]],2)
 def test_source_count_discrepancy_is_preserved_without_claiming_completeness(self):
  p=Path(__file__).resolve().parents[1]/'scripts/acquire_pl_api.py';spec=importlib.util.spec_from_file_location('pl_api',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  result=m.count_audit(51,55)
  self.assertFalse(result['sourceCountMatches'])
  self.assertEqual(result['sourceCountDifference'],4)
  self.assertEqual(result['recordsActuallyReturned'],51)
  self.assertTrue(m.count_audit(55,55)['sourceCountMatches'])
if __name__=='__main__':unittest.main()
