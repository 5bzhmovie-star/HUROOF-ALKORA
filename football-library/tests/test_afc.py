import importlib.util,unittest
from pathlib import Path
class AfcTest(unittest.TestCase):
 def test_schedule_retains_country_slots_and_local_date_without_invented_results(self):
  spec=importlib.util.spec_from_file_location('afc',Path(__file__).resolve().parents[1]/'scripts/extract_afc_schedule.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  r=m.rows([['WEST',None,None,None,None,None,None,None,None],['Monday,\n12 Oct 2026','A4','Pakhtakor (UZB)','vs','Al Qadsiah Club (KSA)','B4','18:45','Stadium',None]],1)
  self.assertEqual(r[0]['date'],'2026-10-12');self.assertEqual(r[0]['home']['associationCodeAsPublished'],'UZB');self.assertEqual(r[0]['away']['nameEn'],'Al Qadsiah Club');self.assertIsNone(r[0]['homeGoals']);self.assertIsNone(r[0]['home']['canonicalClubId'])
  with self.assertRaises(ValueError):m.rows([['12 Oct 2026','A4','Missing country','vs','Other (KSA)','B4','18:45','Stadium',None]],1)

  split=[['WEST',None,None,None,None,None,None,None,None],['Monday,','A4','Home (UZB)','vs','Away (KSA)','B4','18:45','Stadium',None],[None,'A3','Other (UZB)','vs','Third (KSA)','B3','19:00','Stadium',None],['26 Oct 2026','A2','Fourth (UZB)','vs','Fifth (KSA)','B2','20:00','Stadium',None]]
  self.assertEqual([x['date'] for x in m.rows(split,2)],['2026-10-26']*3)
