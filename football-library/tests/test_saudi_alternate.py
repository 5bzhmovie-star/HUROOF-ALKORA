import importlib.util,unittest
from pathlib import Path
class AlternateStatisticsTest(unittest.TestCase):
 def test_page_is_bound_to_source_season_and_in_scope_clubs(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_saudi_alternate_statistics.py';self.assertTrue(p.is_file(),'Alternate statistics parser missing')
  spec=importlib.util.spec_from_file_location('alt',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  season='alahli::Football_Season::'+'a'*32;team='alahli::Football_Team::'+'b'*32
  player={'playerId':'alahli::Football_Player::'+'c'*32,'team':{'teamId':team},'stats':[{'statsId':'goals','statsValue':0},{'statsId':'assists','statsValue':None},{'statsId':'xg-efficiency','statsValue':-2}]}
  payload={'competition':{'seasonId':season},'players':[player]}
  rows=m.extract(payload,season,{team});self.assertEqual(rows[0]['statisticsAsPublished'],player['stats'][:2]);self.assertFalse(rows[0]['releaseReady'])
  with self.assertRaises(ValueError):m.extract(payload,season,{'other'})
  with self.assertRaises(ValueError):m.extract(payload,'wrong',{team})
  with self.assertRaises(ValueError):m.extract(dict(payload,players=[player,player]),season,{team})
  bad=dict(player,stats=player['stats']+[{'statsId':'tackles-won','statsValue':-1}]);row=m.extract(dict(payload,players=[bad]),season,{team})[0]
  self.assertEqual(row['statisticsAsPublished'],player['stats'][:2]);self.assertEqual(row['invalidStatisticsAsPublished'][0]['record']['statsValue'],-1)
if __name__=='__main__':unittest.main()
