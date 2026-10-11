import importlib.util,json,unittest
from pathlib import Path
class ParticipantTest(unittest.TestCase):
 def module(self):
  p=Path(__file__).resolve().parents[1]/'scripts/extract_participants.py';self.assertTrue(p.exists(),'Participant extractor not implemented');s=importlib.util.spec_from_file_location('participants',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
 def test_uefa_keeps_qualifying_teams_in_the_scope(self):
  m=self.module();html='<title>Teams | UEFA Champions League 2026/27</title>'
  for stage,count in [('League phase',36),('Play-offs',2),('Third qualifying round',1),('Second qualifying round',1),('First qualifying round',1)]:
   html+='<div class="teams-overview_group"><h2>'+stage+'</h2>'
   for i in range(count):
    identity=str(len(html));html+=f'<div class="team"><a class="team-wrap" href="/uefachampionsleague/clubs/{identity}--team/" title="Club"><pk-badge src="https://img.uefa.com/imgml/TP/teams/logos/70x70/{identity}.png" badge-title="Full Club"></pk-badge><span slot="secondary">(ENG)</span></a></div>'
   html+='</div>'
  result=m.uefa(html);self.assertEqual(len(result),41);self.assertEqual(sum(c['stageAsPublished']=='First qualifying round' for c in result),1)
  with self.assertRaises(ValueError):m.uefa(html.replace('2026/27','2025/26'))
 def test_laliga_uses_only_current_page_teams_and_year_precision(self):
  m=self.module();teams=[{'id':i,'slug':'club-'+str(i),'name':'Club','foundation':'1900-12-31T00:00:00+00:00','shield':{'url':'https://assets.laliga.com/club.png'}} for i in range(20)]
  data={'props':{'pageProps':{'teams':teams},'globalData':{'otherTeams':[{'id':99}]}},'page':'/clubs'}
  html='<h1>Teams of LALIGA EA SPORTS 2026/27</h1><script id="__NEXT_DATA__" type="application/json">'+json.dumps(data)+'</script>'
  result=m.laliga(html);self.assertEqual(len(result),20);self.assertEqual(result[0]['foundationPrecision'],'year');self.assertEqual(result[0]['foundationYear'],1900);self.assertNotIn('foundationDate',result[0])
  teams[19]['id']=0
  with self.assertRaises(ValueError):m.laliga('<h1>Teams of LALIGA EA SPORTS 2026/27</h1><script id="__NEXT_DATA__">'+json.dumps(data)+'</script>')
