import unittest,importlib.util,tempfile,json,hashlib,os,subprocess,socket,time,shutil,tarfile,io,base64
from pathlib import Path
from urllib.request import Request,build_opener,ProxyHandler
from urllib.error import HTTPError
from urllib.parse import urlencode
BASE=Path(__file__).resolve().parents[1]
def builder():
 spec=importlib.util.spec_from_file_location('php_source_builder',BASE/'scripts/build_php_source_catalog.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
class PhpSourceBrowserTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.php=os.environ.get('HA_TEST_PHP_BINARY') or shutil.which('php')
  if not cls.php:raise RuntimeError('PHP required')
  s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close();cls.url=f'http://127.0.0.1:{port}';cls.open=build_opener(ProxyHandler({})).open;cls.server=subprocess.Popen([cls.php,'-S',f'127.0.0.1:{port}','-t',str(BASE/'integration/php')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(50):
   try:cls.open(cls.url+'/api.php',timeout=.2).read();break
   except Exception:time.sleep(.05)
  else:cls.server.terminate();cls.server.wait(timeout=5);raise RuntimeError('PHP HTTP adapter failed startup')
 @classmethod
 def tearDownClass(cls):cls.server.terminate();cls.server.wait(timeout=5)
 def get(self,path):
  with self.open(self.url+path,timeout=10) as r:return r.status,r.headers,r.read()
 def test_source_export_unique_counts_and_checked_json(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'catalog';result=builder().build(BASE,p);self.assertEqual(result['clubs'],58);self.assertEqual(result['sourcePlayerCards'],1612);self.assertFalse(result['releaseReady']);index=json.loads((p/'index.json').read_text());ids=[]
   for club in index['clubs']:
    raw=(p/club['file']).read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),club['sha256']);data=json.loads(raw);self.assertTrue(all(not x['approvedForQuestions'] for x in data['players']));ids.extend(x['id'] for x in data['players'])
   self.assertEqual(len(ids),len(set(ids)))
 def test_enrichment_rejects_wrong_identity_club_and_birth(self):
  m=builder();r={'sourcePersonId':'12','clubId':'6','dob':'1990-01-01','names':['José Silva']};e={'plPersonId':'12','nameAsPublished':'Jose Silva','personalAsPublished':{'dates':{'birth':'1990-01-01'}}};self.assertTrue(m.same_person(r,e,'6'));self.assertFalse(m.same_person(r,e,'7'));e['personalAsPublished']['dates']['birth']='1991-01-01';self.assertFalse(m.same_person(r,e,'6'));e['personalAsPublished']['dates']['birth']='1990-01-01';e['plPersonId']='13';self.assertFalse(m.same_person(r,e,'6'))
 def test_php_arabic_normalization(self):
  code='require '+json.dumps(str(BASE/'integration/php/SourceCatalog.php'))+';echo HuroofSourceCatalog::normalize("إِلْهِلال ى");';r=subprocess.run([self.php,'-r',code],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout,'الهلال ي')
 def test_http_pagination_and_arabic_search(self):
  self.assertEqual(len(json.loads(self.get('/api.php?action=clubs')[2])),58);a=json.loads(self.get('/api.php?action=players&league=eng')[2]);b=json.loads(self.get('/api.php?action=players&league=eng&page=2')[2]);self.assertEqual(a['total'],481);self.assertEqual(len(a['items']),24);self.assertFalse({p['id'] for p in a['items']} & {p['id'] for p in b['items']});found=json.loads(self.get('/api.php?'+urlencode({'action':'players','q':'اَلْهِلال'}))[2]);self.assertGreater(found['total'],0)
 def test_http_rejects_invalid_input_post_and_escapes_html(self):
  for q in ['action=media&id=../../README_AR.md','action=players&q[]=x','action=players&page=-1','action=players&page=10001','action=unknown']:
   with self.assertRaises(HTTPError) as cm:self.get('/api.php?'+q)
   self.assertEqual(cm.exception.code,400)
  _,headers,raw=self.get('/index.php?'+urlencode({'q':'<script>alert(1)</script>'}));self.assertNotIn(b'<script>alert(1)</script>',raw);self.assertIn(b'&lt;script&gt;',raw);self.assertIn("default-src 'none'",headers['Content-Security-Policy'])
  with self.assertRaises(HTTPError) as cm:self.open(Request(self.url+'/api.php',method='POST',data=b'{}'))
  self.assertEqual(cm.exception.code,405)
 def test_player_page_uses_requested_identity_and_local_images(self):
  _,_,raw=self.get('/index.php');self.assertIn('حروف الكورة'.encode(),raw);self.assertNotIn(b'src="https://',raw);p=json.loads(self.get('/api.php?action=players&league=sau')[2])['items'][0];_,_,raw=self.get('/index.php?player='+p['id']);self.assertIn((p.get('nameAr') or p['name']).encode(),raw);self.assertIn('تاريخ الميلاد'.encode(),raw);self.assertEqual(json.loads(self.get('/api.php?action=player&id='+p['id'])[2])['player']['id'],p['id'])
 def test_club_json_tampering_is_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);target=root/'data/php_source_catalog_2026_10_18';shutil.copytree(BASE/'data/php_source_catalog_2026_10_18',target);c=json.loads((target/'index.json').read_text())['clubs'][0];p=target/c['file'];p.write_bytes(p.read_bytes()+b' ');code='require '+json.dumps(str(BASE/'integration/php/SourceCatalog.php'))+';try{$c=new HuroofSourceCatalog($argv[1]);$c->club($argv[2]);exit(2);}catch(RuntimeException $e){echo $e->getMessage();}';run=subprocess.run([self.php,'-r',code,str(root),c['id']],capture_output=True,text=True);self.assertEqual(run.returncode,0,run.stderr);self.assertIn('checksum mismatch',run.stdout)
 def test_original_raster_range_and_tamper_detection(self):
  from PIL import Image
  stream=io.BytesIO();Image.new('RGB',(32,32),'green').save(stream,format='PNG');raw=stream.getvalue();sha=hashlib.sha256(raw).hexdigest();relative='assets/pending_media/test/portrait.png'
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);catalog=root/'data/php_source_catalog_2026_10_18';catalog.mkdir(parents=True);(catalog/'index.json').write_text(json.dumps({'format':'huroof-php-source-catalog-v1','releaseReady':False,'clubs':[],'leagues':[]}));(root/'data/media_files.index.json').write_text(json.dumps({'files':[{'path':relative,'sha256':sha,'bytes':len(raw)}]}));folder=root/'assets/bundles';folder.mkdir(parents=True);part=folder/'media-0001.tar'
   with tarfile.open(part,'w',format=tarfile.USTAR_FORMAT) as ar:
    member=tarfile.TarInfo(relative);member.size=len(raw);ar.addfile(member,io.BytesIO(raw))
   (folder/'index.json').write_text(json.dumps({'parts':[{'path':part.name,'bytes':part.stat().st_size,'files':[{'path':relative,'bytes':len(raw),'offset':512,'sha256':sha}]}]}));code='require '+json.dumps(str(BASE/'integration/php/SourceCatalog.php'))+';try{$c=new HuroofSourceCatalog($argv[1]);$m=$c->media($argv[2]);echo base64_encode($m["bytes"]);}catch(RuntimeException $e){fwrite(STDERR,$e->getMessage());exit(4);}';command=[self.php,'-r',code,str(root),sha];r=subprocess.run(command,capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(base64.b64decode(r.stdout),raw);changed=bytearray(part.read_bytes());changed[532]^=1;part.write_bytes(changed);r=subprocess.run(command,capture_output=True,text=True);self.assertEqual(r.returncode,4);self.assertIn('checksum mismatch',r.stderr)
if __name__=='__main__':unittest.main()
