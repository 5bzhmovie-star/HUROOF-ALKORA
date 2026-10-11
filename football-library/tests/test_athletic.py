import importlib.util,unittest
from pathlib import Path
class AthleticTest(unittest.TestCase):
 def test_only_first_team_cards_and_head_coach_with_source_slug_identity(self):
  spec=importlib.util.spec_from_file_location('athletic',Path(__file__).resolve().parents[1]/'scripts/extract_athletic.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  h='<h1>Athletic Club</h1><p>2026-27</p><h3>Goalkeepers</h3><div class="item-player__main"><img alt="Player Full" src="https://cdn.athletic-club.eus/imagenes/player_images/medium/player.png"><h4><span class="item-player__heading-dorsal">1</span><span class="item-player__heading-title">Player</span></h4><a href="/en/players/player">View player</a></div><div class="list-staff__item"><h3>Coach</h3><a href="/en/coaches/head"><h4>Head Coach</h4></a></div><div class="list-staff__item"><h3>Assistant Coach</h3><a href="/en/coaches/assistant"><h4>Assistant</h4></a></div>'
  r=m.extract(h);self.assertEqual(len(r['players']),1);self.assertEqual(r['coach']['nameOriginal'],'Head Coach');self.assertIsNone(r['players'][0]['canonicalPlayerId']);self.assertEqual(r['players'][0]['sourcePersonId'],'player')
  with self.assertRaises(ValueError):m.extract(h.replace('2026-27','2025-26'))
 def test_profile_totals_do_not_become_season_stats_or_professional_debut(self):
  spec=importlib.util.spec_from_file_location('athletic_profile',Path(__file__).resolve().parents[1]/'scripts/extract_athletic.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  p={'nameOriginal':'Player','sourcePersonId':'player','profileUrl':'https://www.athletic-club.eus/en/players/player'};h='<h1>Player</h1><ul><li class="info-squad__list-item"><label>Date of birth</label><span>11/06/1997</span></li><li class="info-squad__list-item"><label>Debut date</label><span>20/08/2018</span></li><li class="info-squad__list-item"><label>Height</label><span>1.90 metres</span></li><li class="info-squad__list-item"><label>Official games</label><span>271</span></li></ul>'
  r=m.profile(h,p);self.assertEqual(r['dateOfBirth'],'1997-06-11');self.assertEqual(r['clubFirstTeamDebutDate'],'2018-08-20');self.assertEqual(r['heightCm'],190);self.assertEqual(r['clubCareerOfficialAppearancesAsPublished'],271);self.assertNotIn('seasonAppearances',r);self.assertNotIn('firstProfessionalMatch',r)
