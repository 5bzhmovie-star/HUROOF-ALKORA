import importlib.util,unittest
from pathlib import Path
class SpanishSourceTest(unittest.TestCase):
 def test_only_senior_players_and_head_coach_are_selected(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_spanish_clubs.py';self.assertTrue(p.is_file(),'Spanish club extractor missing')
  spec=importlib.util.spec_from_file_location('es',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  def card(role,slug):return f'<a class="profile-card" href="/en-US/football/first-team/players/{slug}"><span class="profile-card__name">Person</span><span class="profile-card__role">{role}</span><span class="profile-card__number">1</span><img class="profile-card__img" src="https://assets.realmadrid.com/image.jpg"></a>'
  result=m.extract(card('Goalkeeper','player')+card('Coach','coach')+card('Assistant coach','assistant'),'real-madrid')
  self.assertEqual([v['kind'] for v in result],['player','coach'])
  self.assertEqual(result[0]['sourcePersonId'],'player')
  self.assertIsNone(result[0]['canonicalPersonId'])
  self.assertEqual(len(m.extract(card('Goalkeeper','player').replace('/first-team/','/under-19/'),'real-madrid')),0)
if __name__=='__main__':unittest.main()
