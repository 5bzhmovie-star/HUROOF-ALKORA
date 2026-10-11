import importlib.util,unittest
from pathlib import Path
class Ligue1Test(unittest.TestCase):
 def test_official_article_names_are_evidence_not_invented_club_identifiers(self):
  spec=importlib.util.spec_from_file_location('ligue1',Path(__file__).resolve().parents[1]/'scripts/extract_ligue1.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  html="<h1>Quand reprennent les clubs de Ligue 1 McDonald's ?</h1><p>18 clubs de Ligue 1 pour la saison 2026/2027</p><div class='article'><h3>Les dates de reprise des clubs :</h3><p>"+''.join(f'<span><strong>Club {i}</strong> : lundi 6 juillet</span><br>' for i in range(18))+'</p></div>'
  r=m.extract(html);self.assertEqual(len(r['clubs']),18);self.assertIsNone(r['clubs'][0]['canonicalClubId']);self.assertIsNone(r['clubs'][0]['sourceClubId']);self.assertFalse(r['releaseReady'])
  with self.assertRaises(ValueError):m.extract(html.replace('2026/2027','2025/2026'))
