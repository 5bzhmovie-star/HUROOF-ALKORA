import importlib.util,json,unittest
from pathlib import Path
class SplTest(unittest.TestCase):
 def test_failed_collection_preserves_published_generation(self):
  import tempfile
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_spl.py';spec=importlib.util.spec_from_file_location('spl',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  with tempfile.TemporaryDirectory() as folder:
   m.BASE=Path(folder);clubs=[{'sourceClubId':str(i)} for i in range(18)];squads=[{'club':c,'players':[]} for c in clubs]
   original=m.publish_snapshot(clubs,squads,[])
   with self.assertRaises(ValueError):m.publish_snapshot(clubs,squads[:1],[{'error':'unavailable'}])
   self.assertEqual(len(m.load_snapshot()[1]),18)
   saved=json.loads((m.BASE/'data/spl_snapshot_2026_27.json').read_text());saved['clubs'][0]['sourceClubId']='tampered';m.save_json(m.BASE/'data/spl_snapshot_2026_27.json',saved)
   with self.assertRaises(ValueError):m.load_snapshot()
 def test_coach_portrait_must_match_the_staff_identity(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_spl.py';spec=importlib.util.spec_from_file_location('spl',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  club='a'*32;person='b'*32
  good={'staffId':'spl::Football_Official::'+person,'coachImage':'https://media-sdp.spl.com.sa/playerImages/'+'c'*32+'/'+'d'*32+'/'+club+'/coaches/'+person+'.webp'}
  self.assertEqual(m.coach_portrait(good,good,club),good['coachImage'])
  bad=dict(good,coachImage=good['coachImage'].replace(person,'e'*32))
  with self.assertRaises(ValueError):m.coach_portrait(bad,good,club)
 def test_embedded_official_data_is_decoded_as_json_with_person_and_club_identity(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_spl.py';spec=importlib.util.spec_from_file_location('spl',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  person={'playerId':'spl::Football_Player::'+'b'*32,'playerSlug':'person','dateOfBirth':'1995-12-30T00:00:00Z','height':'180','weight':'75','team':{'teamId':'spl::Football_Team::'+'a'*32}}
  payload='1:'+json.dumps({'players':[person]})+'\n';half=len(payload)//2
  html=''.join('<script>self.__next_f.push('+json.dumps([1,c])+')</script>' for c in [payload[:half],payload[half:]])
  self.assertEqual(m.embedded_players(html,'a'*32)['person']['height'],'180')
  self.assertEqual(m.embedded_players(html,'c'*32),{})
 def test_source_identity_and_shirt_context_without_guessing_canonical_person(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_spl.py'
  spec=importlib.util.spec_from_file_location('spl',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  club='a'*32;person='b'*32;season='c'*32;competition='d'*32
  html=f'<h2>حارس المرمى</h2><div><a href="https://www.spl.com.sa/ar/players/person/">Profile</a><img alt="KSA" src="https://images.spl.com.sa/flags/KSA"><picture><img alt="محمد Player Image" src="https://media-sdp.spl.com.sa/playerImages/{season}/{competition}/{club}/home/{person}_middle.webp"></picture></div>'
  result=m.parse_squad(html,club,'https://www.spl.com.sa/ar/teams/test/squad')
  self.assertEqual(len(result),1);self.assertEqual(result[0]['sourcePersonId'],person)
  self.assertEqual(result[0]['sourceClubId'],club);self.assertEqual(result[0]['nameAr'],'محمد')
  self.assertIsNone(result[0]['canonicalPlayerId']);self.assertIsNone(result[0]['shirtNumber'])
  mixed=html.replace('/players/person/','/players/galeno-بومعكيل/')
  self.assertEqual(m.parse_squad(mixed,club,'https://www.spl.com.sa/ar/teams/test/squad')[0]['profileUrl'],'https://www.spl.com.sa/ar/players/galeno-بومعكيل/')
  missing=html.replace(f'https://media-sdp.spl.com.sa/playerImages/{season}/{competition}/{club}/home/{person}_middle.webp','/assets/placeholder.webp')
  absent=m.parse_squad(missing,club,'https://www.spl.com.sa/ar/teams/test/squad')[0]
  self.assertIsNone(absent['portraitSource']);self.assertIsNone(absent['sourcePersonId'])
  with self.assertRaises(ValueError):m.parse_squad(html,'e'*32,'https://www.spl.com.sa/ar/teams/test/squad')
if __name__=='__main__':unittest.main()
