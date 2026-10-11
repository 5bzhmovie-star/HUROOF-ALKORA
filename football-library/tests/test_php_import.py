"""Integration tests use a disposable MySQL database supplied by the test runner."""
import hashlib,json,os,shutil,subprocess,tempfile,unittest
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
class PhpImportTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not os.environ.get('HA_IMPORT_DSN'):raise unittest.SkipTest('Disposable MySQL test database not configured')
 def query(self,sql,env=None):
  code='$d=new PDO(getenv("HA_IMPORT_DSN"),getenv("HA_IMPORT_USER"),getenv("HA_IMPORT_PASSWORD")?:"");echo $d->query('+json.dumps(sql)+')->fetchColumn();'
  result=subprocess.run(['php','-r',code],env=env,capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr);return result.stdout
 def test_import_actual_snapshot_repeat_and_reject_tampered_parts(self):
  self.assertIsNotNone(shutil.which('php'),'PHP runtime required')
  snapshot=BASE/'build/json-export-v1'
  command=['php',str(BASE/'import/import.php'),str(snapshot)]
  result=subprocess.run(command,capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
  data=json.loads(result.stdout);self.assertEqual(data['counts']['football_entities'],1345)
  self.assertEqual(data['counts']['football_fact_records'],2496)
  self.assertFalse(data['releaseReady'])
  self.assertEqual(self.query("SELECT COUNT(*) FROM huroof_library_football_fact_records WHERE status='pending'"),'2496')
  repeat=subprocess.run(command,capture_output=True,text=True)
  self.assertEqual(repeat.returncode,0,repeat.stderr)
  self.assertTrue(json.loads(repeat.stdout)['alreadyImported'])
  with tempfile.TemporaryDirectory() as temporary:
   copy=Path(temporary)/'snapshot';shutil.copytree(snapshot,copy)
   index=json.loads((copy/'index.json').read_text())
   part=index['tables']['football_entities']['parts'][0]['path']
   (copy/part).write_text('[]')
   failed=subprocess.run(['php',str(BASE/'import/import.php'),str(copy)],capture_output=True,text=True)
   self.assertNotEqual(failed.returncode,0);self.assertIn('checksum',failed.stderr.lower())
   # Rejection must leave the prior import untouched.
   after=subprocess.run(command,capture_output=True,text=True)
   self.assertEqual(after.returncode,0,after.stderr)
   self.assertEqual(json.loads(after.stdout)['counts']['football_entities'],1345)

 def test_foreign_key_failure_rolls_back_all_inserted_rows(self):
  self.assertTrue(os.environ.get('HA_TEST_ROLLBACK_DSN'),'Separate empty rollback database required')
  env=dict(os.environ,HA_IMPORT_DSN=os.environ['HA_TEST_ROLLBACK_DSN'])
  with tempfile.TemporaryDirectory() as temporary:
   copy=Path(temporary)/'snapshot';shutil.copytree(BASE/'build/json-export-v1',copy)
   index=json.loads((copy/'index.json').read_text());part=index['tables']['football_relations']['parts'][0]
   path=copy/part['path'];rows=json.loads(path.read_text());rows[0]['to_entity_id']='missing:team'
   path.write_text(json.dumps(rows));part['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
   (copy/'index.json').write_text(json.dumps(index))
   result=subprocess.run(['php',str(BASE/'import/import.php'),str(copy)],env=env,capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertIn('foreign key',result.stderr.lower())
   for table in index['tables']:
    self.assertEqual(self.query('SELECT COUNT(*) FROM huroof_library_'+table,env),'0')
   self.assertEqual(self.query('SELECT COUNT(*) FROM huroof_library_import_runs',env),'0')

if __name__=='__main__':unittest.main()
