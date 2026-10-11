import importlib.util,unittest
from pathlib import Path
class PremierLeagueTest(unittest.TestCase):
 def test_combined_senior_and_under21_paragraphs_preserve_markers(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_pl_squads.py';s=importlib.util.spec_from_file_location('pl',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
  html='<h1>See all the 2026/27 Premier League squad lists</h1>'
  for i in range(20):html+=f'<h5><a href="https://www.premierleague.com/clubs/{i}/Team/overview">Team {i}</a></h5><p><strong>25 Squad players (*Home grown)</strong><br>Senior, Person*<br><strong>U21 players (Contract and Scholars; *Home grown)</strong><br>Youth, Person (Loan)</p>'
  html=html.replace('</p>','</p><p>Continuation, Person</p>')
  html=html.replace('/clubs/19/','/en/clubs/0/')
  result=m.extract(html);self.assertNotEqual(result['clubs'][0]['sourceClubKey'],result['clubs'][19]['sourceClubKey']);self.assertEqual(len(result['clubs']),20)
  records=result['clubs'][0]['players'];self.assertEqual(len(records),3);self.assertTrue(records[0]['homeGrownAsMarked']);self.assertTrue(records[1]['loanAsMarked']);self.assertEqual(records[1]['registrationGroup'],'under21');self.assertIsNone(records[1]['canonicalPlayerId'])
  with self.assertRaises(ValueError):m.extract(html.replace('2026/27','2025/26'))
