import importlib.util,unittest
from pathlib import Path
class SaffDirectoryTest(unittest.TestCase):
 def test_source_club_id_and_year_precision_are_preserved(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_saff_directory.py';self.assertTrue(p.is_file(),'Alternative directory parser missing')
  spec=importlib.util.spec_from_file_location('saff_directory',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  h='<table><tr><td><font>Name: </font><a href="team.php?id=1">Al Hilal</a><br><font>City: </font><font>Riyadh</font><br><font>Establish Date: </font><font>1957</font></td></tr></table>'
  rows=m.extract(h);self.assertEqual(rows[0]['sourceClubId'],'1');self.assertEqual(rows[0]['foundationYear'],1957);self.assertEqual(rows[0]['foundationPrecision'],'year')
  self.assertIsNone(rows[0]['canonicalClubId'])
if __name__=='__main__':unittest.main()
