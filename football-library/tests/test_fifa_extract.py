import importlib.util
import unittest
from pathlib import Path

class ExtractionTest(unittest.TestCase):
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
