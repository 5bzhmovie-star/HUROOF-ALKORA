import importlib.util,unittest
from pathlib import Path
class AtleticoTest(unittest.TestCase):
 def test_profile_facts_preserve_year_precision_and_missing_statistics(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_atletico_evidence.py';self.assertTrue(p.is_file(),'Atletico evidence parser missing')
  spec=importlib.util.spec_from_file_location('atleti',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  source='Juan Musso - Season 2026-2027 (https://en.atleticodemadrid.com/jugadores/musso-2026-2027)\nL85: ## 1 JUAN MUSSO\nL87: * Nationality Argentinian\nL88: * Height (cm) 191\nL89: * Weight (kg) 93\nL90: * Born 06/05/1994\nL98: > Position: Goalkeeper\nL109: PATH\nL111: Racing Club: 2012-2018\nL114: Atlético de Madrid: 2024 - .\nL115: WINNERS\nL117: 2021 Copa América\nL121: # Latest News'
  r=m.extract_profile(source)
  self.assertEqual(r['personal']['dateOfBirth'],'1994-05-06');self.assertEqual(r['personal']['heightCm'],191)
  self.assertEqual(r['careerAsPublished'][0]['datePrecision'],'year');self.assertEqual(r['careerAsPublished'][0]['fromYear'],2012)
  self.assertIsNone(r['statistics']);self.assertFalse(r['releaseReady'])
  unavailable=m.extract_profile('Internal Error\nL0: Failed to fetch https://en.atleticodemadrid.com/jugadores/musso-2026-2027: (403) Forbidden')
  self.assertIsNone(unavailable['personal']);self.assertIn('unavailable',unavailable['verification'])
if __name__=='__main__':unittest.main()
