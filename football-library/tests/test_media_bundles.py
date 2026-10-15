import importlib.util,json,os,shutil,subprocess,tempfile,unittest
from pathlib import Path

class MediaBundleTest(unittest.TestCase):
 def test_php_materializes_original_bytes_and_rejects_tampering_before_writes(self):
  root=Path(__file__).resolve().parents[1];p=root/'scripts/bundle_media.py'
  self.assertTrue(p.is_file(),'Portable media bundler missing')
  spec=importlib.util.spec_from_file_location('bundles',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  import hashlib
  from PIL import Image
  with tempfile.TemporaryDirectory() as folder:
   base=Path(folder)/'source';source=base/'assets/pending_media/test/person/portrait.png';source.parent.mkdir(parents=True);Image.new('RGB',(64,64),'red').save(source);raw=source.read_bytes()
   manifest={'files':[{'path':source.relative_to(base).as_posix(),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}]}
   (base/'data').mkdir();(base/'data/media_files.index.json').write_text(json.dumps(manifest))
   result=m.build(base,base/'assets/bundles',limit=4096)
   self.assertEqual(result['fileCount'],1)
   target=Path(folder)/'target';(target/'assets').mkdir(parents=True);shutil.copytree(base/'assets/bundles',target/'assets/bundles')
   php=os.environ.get('HA_TEST_PHP_BINARY') or shutil.which('php');self.assertIsNotNone(php,'PHP required for actual extraction test')
   command=[php,str(root/'import/media.php'),'--root',str(target)]
   run=subprocess.run(command,capture_output=True,text=True);self.assertEqual(run.returncode,0,run.stderr)
   self.assertEqual((target/source.relative_to(base)).read_bytes(),raw)
   again=subprocess.run(command,capture_output=True,text=True);self.assertEqual(again.returncode,0,again.stderr);self.assertEqual(json.loads(again.stdout)['extracted'],0)
   corrupted=Path(folder)/'corrupted';(corrupted/'assets').mkdir(parents=True);shutil.copytree(base/'assets/bundles',corrupted/'assets/bundles')
   part=corrupted/'assets/bundles'/result['parts'][0]['path'];part.write_bytes(part.read_bytes()[:-1]+b'X')
   failed=subprocess.run([php,str(root/'import/media.php'),'--root',str(corrupted)],capture_output=True,text=True)
   self.assertNotEqual(failed.returncode,0);self.assertFalse((corrupted/'assets/pending_media').exists())
   bad=json.loads((base/'data/media_files.index.json').read_text());bad['files'][0]['path']='assets/pending_media/../outside.png';(base/'data/media_files.index.json').write_text(json.dumps(bad))
   with self.assertRaises(ValueError):m.build(base,base/'unsafe-bundles',limit=4096)
if __name__=='__main__':unittest.main()
