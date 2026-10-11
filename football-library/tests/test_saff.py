import importlib.util,unittest
from pathlib import Path
class SaffTest(unittest.TestCase):
 def test_round32_uses_dated_first_round_and_separates_penalties(self):
  s=importlib.util.spec_from_file_location('saff',Path(__file__).resolve().parents[1]/'scripts/extract_saff.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
  h='<select><option value="434" selected>موسم 2026-2027</option><option value="round=13&amp;week=0" selected>دور الـ 32</option></select><h1>كأس خادم الحرمين الشريفين</h1><table>'
  for i in range(16):h+=f'<tr><td><a href="calendar.php?calendar_date=2026-08-16">date</a></td><td id="fixture_td_1_{i+1}">19:00</td><td id="fixture_td_2_{i+1}"><a href="team.php?id={i*2+1}">Home {i}<img src="uploadcenter/logo{i*2+1}.png"></a></td><td id="fixture_td_3_{i+1}">0 - 0 (3 - 2)</td><td id="fixture_td_4_{i+1}"><a href="team.php?id={i*2+2}">Away {i}<img src="uploadcenter/logo{i*2+2}.png"></a></td><td id="fixture_td_5_{i+1}">Stadium</td></tr>'
  h+='</table>';r=m.king_cup(h);self.assertEqual(len(r['clubs']),32);self.assertEqual(len(r['matches']),16);self.assertEqual(r['matches'][0]['homeGoals'],0);self.assertEqual(r['matches'][0]['homePenaltyShootout'],3)
  with self.assertRaises(ValueError):m.king_cup(h.replace('2026-2027','2025-2026'))
 def test_supercup_participants_reuse_saff_identity_and_do_not_invent_future_fixtures(self):
  s=importlib.util.spec_from_file_location('saff_super',Path(__file__).resolve().parents[1]/'scripts/extract_saff.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
  html='<h1>قرعة كأس السوبر السعودي 2026-2027</h1><p>وتشهد قرعة كأس السوبر السعودي مشاركة أربعة أندية هي: النصر، الخلود، الأهلي، والقادسية، حيث ستحدد القرعة مواجهات الدور نصف النهائي من المسابقة.</p>'
  directory=[{'sourceClubId':str(i+1),'sourceIdNamespace':'saff-team','nameAr':name} for i,name in enumerate(['النصر','الخلود','الأهلي','القادسية'])]
  r=m.super_cup(html,directory);self.assertEqual(len(r['clubs']),4);self.assertEqual(r['clubs'][0]['sourceClubId'],'1');self.assertEqual(r['matches'],[])
  with self.assertRaises(ValueError):m.super_cup(html,directory[:3])
