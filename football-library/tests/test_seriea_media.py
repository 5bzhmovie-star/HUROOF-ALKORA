import importlib.util,sys,unittest
from pathlib import Path
class SerieAMediaTest(unittest.TestCase):
 def test_snapshot_player_image_cannot_claim_another_person(self):
  folder=Path(__file__).resolve().parents[1]/'scripts';sys.path.insert(0,str(folder));s=importlib.util.spec_from_file_location('seriea_media',folder/'acquire_seriea_media.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
  cid='a'*32;pid='b'*32;season='c'*32
  p={'sourcePersonId':pid,'sourceSeasonId':'serie-a::Football_Season::'+season,'portraitSource':'https://media-sdp.legaseriea.it/playerImages/'+'d'*32+'/'+season+'/'+cid+'/home/'+pid+'_left.webp'}
  snapshot={'squads':[{'club':{'sourceClubId':cid,'logoSource':'https://media-sdp.legaseriea.it/clubLogos/'+cid+'.webp'},'coach':{'staffId':'serie-a::Football_Official::'+'e'*32},'players':[p]}]}
  self.assertEqual(len(m.jobs(snapshot)),2)
  p['portraitSource']=p['portraitSource'].replace(pid,'f'*32)
  with self.assertRaises(ValueError):m.jobs(snapshot)
