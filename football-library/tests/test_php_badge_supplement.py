import unittest,tempfile,json,subprocess,os,shutil,hashlib,base64,io,importlib.util
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
class BadgeSupplementTests(unittest.TestCase):
 def test_all58_clubs_have_distinct_local_source_logos(self):
  spec=importlib.util.spec_from_file_location('supplement_catalog_builder',BASE/'scripts/build_php_source_catalog.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  with tempfile.TemporaryDirectory() as tmp:
   result=m.build(BASE,Path(tmp)/'catalog');self.assertEqual(result['clubsWithLogo'],58)
 def test_supplemental_png_serving_and_checksum_rejection(self):
  from PIL import Image
  stream=io.BytesIO();Image.new('RGB',(20,30),'green').save(stream,format='PNG');raw=stream.getvalue();sha=hashlib.sha256(raw).hexdigest()
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);catalog=root/'data/php_source_catalog_2026_10_18';catalog.mkdir(parents=True);(catalog/'index.json').write_text(json.dumps({'format':'huroof-php-source-catalog-v1','releaseReady':False}));(root/'data/media_files.index.json').write_text(json.dumps({'files':[]}));relative='assets/pending_media/english_badges/test/logo.png';p=root/relative;p.parent.mkdir(parents=True);p.write_bytes(raw);(root/'data/club_badges_supplement.index.json').write_text(json.dumps({'format':'huroof-club-badges-v1','files':[{'path':relative,'bytes':len(raw),'sha256':sha}]}));php=os.environ.get('HA_TEST_PHP_BINARY') or shutil.which('php');code='require '+json.dumps(str(BASE/'integration/php/SourceCatalog.php'))+';try{$c=new HuroofSourceCatalog($argv[1]);$m=$c->media($argv[2]);echo base64_encode($m["bytes"]);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(4);}';command=[php,'-r',code,str(root),sha];run=subprocess.run(command,capture_output=True,text=True);self.assertEqual(run.returncode,0,run.stderr);self.assertEqual(base64.b64decode(run.stdout),raw);p.write_bytes(raw[:-1]+b'X');run=subprocess.run(command,capture_output=True,text=True);self.assertEqual(run.returncode,4);self.assertIn('checksum mismatch',run.stderr)
 def test_supplemental_bundle_serves_all15_saved_original_crests(self):
  extra=json.loads((BASE/'data/club_badges_supplement.index.json').read_text());self.assertEqual(len(extra['files']),15)
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);catalog=root/'data/php_source_catalog_2026_10_18';catalog.mkdir(parents=True);(catalog/'index.json').write_text(json.dumps({'format':'huroof-php-source-catalog-v1','releaseReady':False}));(root/'data/media_files.index.json').write_text(json.dumps({'files':[]}));(root/'data/club_badges_supplement.index.json').write_text(json.dumps(extra));shutil.copytree(BASE/'assets/club_badges/bundles',root/'assets/club_badges/bundles');php=os.environ.get('HA_TEST_PHP_BINARY') or shutil.which('php');code='require '+json.dumps(str(BASE/'integration/php/SourceCatalog.php'))+';$c=new HuroofSourceCatalog($argv[1]);$out=[];foreach(explode(",",$argv[2])as$id){$m=$c->media($id);$out[]=$m["sha256"];}echo json_encode($out);';expected=[f['sha256'] for f in extra['files']];r=subprocess.run([php,'-r',code,str(root),','.join(expected)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout),expected)
if __name__=='__main__':unittest.main()
