import importlib.util,json,unittest
from pathlib import Path
class SerieATest(unittest.TestCase):
 def test_senior_squad_requires_matching_season_person_and_jersey_ids(self):
  spec=importlib.util.spec_from_file_location('seriea',Path(__file__).resolve().parents[1]/'scripts/acquire_seriea.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  club={'sourceClubId':'a'*32,'slug':'test','nameEn':'Test'};season='serie-a::Football_Season::'+'b'*32;pid='c'*32
  team={'teamId':'serie-a::Football_Team::'+'a'*32,'teamType':'prima_squadra','coach':{'staffId':'serie-a::Football_Official::'+'d'*32,'shortName':'Coach','roleLabel':'Head Coach'}}
  person={'playerId':'serie-a::Football_Player::'+pid,'teamId':team['teamId'],'seasonId':season,'shortName':'Young Senior','dateOfBirth':'2007-01-02','height':'180','weight':'70','roleLabel':'Forward','playerUrl':'https://www.legaseriea.it/players/young-senior/','playerImage':'https://media-sdp.legaseriea.it/playerImages/'+'e'*32+'/'+'b'*32+'/'+'a'*32+'/home/'+pid+'_left.webp'}
  data=[{'title':'2026/2027','extraData':{'seasonId':season,'isCurrent':True}},team,person]
  def html():return '<h1>Test</h1><script>self.__next_f.push('+json.dumps([1,'1:'+json.dumps(data)+'\n'])+')</script>'
  r=m.squad(html(),club);self.assertEqual(len(r['players']),1);self.assertEqual(r['players'][0]['dateOfBirth'],'2007-01-02');self.assertEqual(r['players'][0]['heightCm'],180)
  person['seasonId']=season.replace('b','f')
  with self.assertRaises(ValueError):m.squad(html(),club)
  person['seasonId']=season;person['playerImage']=person['playerImage'].replace(pid,'f'*32)
  with self.assertRaises(ValueError):m.squad(html(),club)

  person['playerImage']=person['playerImage'].replace('f'*32,pid);person['playerUrl']=None
  self.assertIsNone(m.squad(html(),club)['players'][0]['profileUrl'])
  person['playerUrl']='https://www.legaseriea.it/players/albert-guðmundsson/'
  self.assertIn('guð',m.squad(html(),club)['players'][0]['profileUrl'])
  team['officialName']='Test';club['nameEn']='Test FC'
  self.assertEqual(len(m.squad(html(),club)['players']),1)
  del person['playerUrl']
  self.assertIsNone(m.squad(html(),club)['players'][0]['profileUrl'])
