import importlib.util,unittest,copy
from pathlib import Path
class LaLigaSquadsTest(unittest.TestCase):
 def module(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_laliga_squads.py'
  self.assertTrue(path.exists(),'Official season squad collector missing')
  spec=importlib.util.spec_from_file_location('laliga_squads',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
 def row(self,pid,role='jugador',team=18):
  return {'id':pid+100,'current':True,'loan_to':False,'person':{'id':pid,'gender':'male','name':'Person','date_of_birth':'2000-01-02T00:00:00+00:00'},'team':{'id':team},'role':{'slug':role},'photos':{}}
 def test_separates_players_head_coaches_and_outbound_loans_without_assistant_leak(self):
  m=self.module();rows=[self.row(1),self.row(2,'entrenador'),self.row(3,'segundo-entrenador'),self.row(4)];rows[-1]['loan_to']=True
  result=m.classify({'total':4,'squads':rows},18)
  self.assertEqual([p['person']['id'] for p in result['players']],[1]);self.assertEqual([p['person']['id'] for p in result['coaches']],[2]);self.assertEqual(len(result['excluded']),2)
 def test_rejects_wrong_team_duplicate_person_and_unfinished_pagination(self):
  m=self.module()
  for data in [{'total':1,'squads':[self.row(1,team=2)]},{'total':2,'squads':[self.row(1),self.row(1)]},{'total':2,'squads':[self.row(1)]}]:
   with self.assertRaises(ValueError):m.classify(data,18)
 def test_rejects_published_silhouette_even_when_format_and_dimensions_are_valid(self):
  m=self.module();self.assertTrue(hasattr(m,'validate_portrait'),'Source silhouette rejection missing')
  from PIL import Image
  import io
  im=Image.new('RGBA',(512,556),(0,0,0,255));stream=io.BytesIO();im.save(stream,format='PNG')
  with self.assertRaises(ValueError):m.validate_portrait(stream.getvalue())
if __name__=='__main__':unittest.main()
