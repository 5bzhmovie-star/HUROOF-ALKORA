import importlib.util
import unittest
from pathlib import Path

class ExtractionTest(unittest.TestCase):
 def test_visual_correction_preserves_identity_and_raw_evidence(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_fifa.py';spec=importlib.util.spec_from_file_location('extract',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  row=['17','DF','BELGHALI Ra\x00k',None,'Ra\x00k','BELGHALI',None,'BELGHALI','07/06/2002',None,'Hellas Verona FC (ITA)',None,'180','17','2']
  player=m.parse_player(row,'ALG',1);old_id=player['id']
  result={'sourceSha256':'a'*64,'players':[player],'issues':[{'playerId':old_id}]}
  changes={'sourceSha256':'a'*64,'reviewer':'visual PDF row review','verifiedAt':'2026-10-11','corrections':[{'playerId':old_id,'sourcePage':1,'shirtNumber':17,'cells':[{'column':2,'original':row[2],'corrected':'BELGHALI Rafik'},{'column':4,'original':row[4],'corrected':'Rafik'}]}]}
  repaired=m.apply_text_corrections(result,changes)
  self.assertEqual(repaired['players'][0]['id'],old_id);self.assertEqual(repaired['players'][0]['nameEn'],'Rafik BELGHALI');self.assertEqual(repaired['players'][0]['rawCells'][4],'Ra\x00k');self.assertEqual(repaired['players'][0]['textIssues'],[]);self.assertEqual(repaired['issues'],[])
  self.assertEqual(repaired['players'][0]['verification'],'pending')
  with self.assertRaises(ValueError):m.apply_text_corrections({'sourceSha256':'b'*64,'players':[player],'issues':[]},changes)
 def test_parser_preserves_cells_and_flags_damaged_font_text(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_fifa.py'
  self.assertTrue(p.exists(),'official PDF extractor has not been implemented')
  spec=importlib.util.spec_from_file_location('extract',p)
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  row=['7','FW','MAHREZ Riyad',None,'Riyad Karim','MAHREZ',None,'MAHREZ','21/02/1991',None,'Al Ahli FC (KSA)',None,'179','120','40']
  result=module.parse_player(row,'ALG',1)
  self.assertEqual(result['dateOfBirth'],'1991-02-21')
  self.assertEqual(result['clubAtWorldCup'],'Al Ahli FC (KSA)')
  self.assertEqual(result['heightCm'],179)
  self.assertEqual(result['shirtNumber'],7)
  self.assertNotIn('currentClub',result)
  self.assertFalse(result['textIssues'])
  row[4]='Ra\x00k';self.assertTrue(module.parse_player(row,'ALG',1)['textIssues'])
  short=row[:9]+row[10:]
  headers=['#','POS','PLAYER NAME',None,'FIRST NAME(S)','LAST NAME(S)',None,'NAME ON SHIRT','DOB','CLUB',None,'HEIGHT (CM)','CAPS','GOALS']
  self.assertEqual(module.parse_player(short,'ALG',1,headers)['clubAtWorldCup'],row[10])
  row[8]='31/02/1991'
  with self.assertRaises(ValueError):module.parse_player(row,'ALG',1)
if __name__=='__main__':unittest.main()
