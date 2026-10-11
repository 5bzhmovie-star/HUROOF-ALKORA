import importlib.util,unittest
from pathlib import Path
class DfbTest(unittest.TestCase):
 def test_missing_profile_id_keeps_player_and_coach_and_rejects_other_season(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_dfb.py';self.assertTrue(path.exists(),'DFB collector not implemented');spec=importlib.util.spec_from_file_location('dfb',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  html='<h3>Kader Bundesliga 2026/2027</h3><table><tr><td><table><thead><tr><th>Trainer</th></tr></thead><tbody><tr class="c-Table-body-row"><td></td><td><a href="https://datencenter.dfb.de/profil/10">Coach</a></td><td>10.04.1986</td></tr></tbody></table><table><thead><tr><th>Mittelfeld</th></tr></thead><tbody><tr class="c-Table-body-row"><td>39</td><td>Bara Sapoko Ndiaye</td><td>31.12.2007</td></tr></tbody></table></td></tr></table>'
  result=m.squad(html,'bayern-muenchen');self.assertEqual(len(result['players']),1);self.assertEqual(result['players'][0]['nameOriginal'],'Bara Sapoko Ndiaye');self.assertIsNone(result['players'][0]['sourcePersonId']);self.assertEqual(result['players'][0]['dateOfBirth'],'2007-12-31');self.assertEqual(result['coaches'][0]['sourcePersonId'],'10')
  with self.assertRaises(ValueError):m.squad(html.replace('2026/2027','2025/2026'),'bayern-muenchen')
