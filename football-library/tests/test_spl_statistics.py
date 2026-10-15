import importlib.util, unittest
from pathlib import Path

class StatisticsTest(unittest.TestCase):
 def test_statistics_require_exact_person_club_and_published_season(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_spl_statistics.py'
  self.assertTrue(path.is_file(), 'Resumable statistics collector is missing')
  spec=importlib.util.spec_from_file_location('stats',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  p={'sourcePersonId':'a'*32,'sourceClubId':'b'*32,'sourceSeasonId':'c'*32}
  r={'playerId':'spl::Football_Player::'+'a'*32,'team':{'teamId':'spl::Football_Team::'+'b'*32},'seasonId':'spl::Football_Season::'+'c'*32,'stats':[{'statsId':'goals','statsValue':0},{'statsId':'minutes-played','statsValue':None},{'statsId':'xg-efficiency','statsValue':-1}]}
  result=m.select_statistics([r],p)
  self.assertEqual(result['statisticsAsPublished'],r['stats'][:2])
  self.assertEqual(result['omittedUnlicensedAdvancedMetrics'],['xg-efficiency'])
  for field,value in [('playerId','wrong'),('seasonId','spl::Football_Season::'+'d'*32),('team',{'teamId':'wrong'})]:
   with self.assertRaises(ValueError):m.select_statistics([dict(r,**{field:value})],p)
  with self.assertRaises(ValueError):m.select_statistics([dict(r,stats='$undefined')],p)
  with self.assertRaises(ValueError):m.select_statistics([r,r],p)

if __name__=='__main__':unittest.main()
