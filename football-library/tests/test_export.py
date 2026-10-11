import importlib.util,json,sqlite3,tempfile,unittest
from pathlib import Path

class ExportTest(unittest.TestCase):
 def test_chunked_export_preserves_pending_records_and_excludes_accounts(self):
  path=Path(__file__).resolve().parents[1]/'scripts/export_snapshot.py'
  spec=importlib.util.spec_from_file_location('export_snapshot',path)
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as directory:
   base=Path(directory);db=sqlite3.connect(base/'catalog.sqlite')
   db.execute('CREATE TABLE football_entities(id TEXT PRIMARY KEY, metadata TEXT)')
   db.execute('CREATE TABLE users(password TEXT)')
   db.executemany('INSERT INTO football_entities VALUES(?,?)',[(str(i),'{"verification":"pending","nameAr":null}') for i in range(3)])
   db.execute("INSERT INTO users VALUES('secret')");db.commit();db.close()
   result=module.export(base/'catalog.sqlite',base/'output',chunk_size=2)
   self.assertEqual(result['tables']['football_entities']['rows'],3)
   self.assertNotIn('users',result['tables']);self.assertFalse(result['releaseReady'])
   parts=result['tables']['football_entities']['parts'];self.assertEqual([p['rows'] for p in parts],[2,1])
   rows=[r for p in parts for r in json.loads((base/'output'/p['path']).read_text())]
   self.assertEqual(json.loads(rows[0]['metadata'])['verification'],'pending')
   module.verify(base/'output')
   (base/'output'/parts[0]['path']).write_text('[]')
   with self.assertRaises(ValueError):module.verify(base/'output')

if __name__=='__main__':unittest.main()
