import unittest,json,hashlib,sys
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'scripts'))
from sanitize_source_narratives import sanitize
class RecoveryTests(unittest.TestCase):
 def test_narrative_sanitization_keeps_facts(self):
  result=sanitize({'biography':'Long source prose','height':180,'careerHistory':[{'club':'Example','year':2020}]})
  self.assertTrue(result['biography']['sourceNarrativeOmitted']);self.assertEqual(result['height'],180);self.assertEqual(result['careerHistory'][0]['year'],2020)
 def test_no_verbatim_biographies(self):
  def visit(v):
   if isinstance(v,dict):
    for k,x in v.items():
     if 'biograph'in k.lower() and isinstance(x,str):self.assertFalse(x.strip())
     visit(x)
   elif isinstance(v,list):
    for x in v:visit(x)
  for p in BASE.glob('data/english_completion_*2026_27.json'):visit(json.loads(p.read_text()))
 def test_media_index_unique_paths_hashes_and_bundle_coverage(self):
  raw=(BASE/'data/media_files.index.json').read_bytes();m=json.loads(raw);d=json.loads((BASE/'assets/bundles/index.json').read_text());files=m['files'];allfiles=[f for p in d['parts'] for f in p['files']]
  self.assertEqual(len(files),m['fileCount']);self.assertEqual(len({f['path'] for f in files}),len(files));self.assertEqual(len({f['sha256'] for f in files}),len(files));self.assertEqual(sum(f['bytes'] for f in files),m['totalBytes']);self.assertEqual(d['mediaIndexSha256'],hashlib.sha256(raw).hexdigest());self.assertEqual({(f['path'],f['sha256'],f['bytes']) for f in files},{(f['path'],f['sha256'],f['bytes']) for f in allfiles});self.assertEqual(len(allfiles),len(files))
 def test_wikidata_chunk_checksums_counts_and_paths(self):
  p=BASE/'data/wikidata_career_candidates_2026_27.json';d=json.loads(p.read_text())
  for spec in d['arrays'].values():
   count=0
   for part in spec['parts']:
    target=(p.parent/part['path']).resolve();self.assertTrue(target.is_relative_to(p.parent.resolve()));raw=target.read_bytes();self.assertEqual(len(raw),part['bytes']);self.assertEqual(hashlib.sha256(raw).hexdigest(),part['sha256']);rows=json.loads(raw);self.assertEqual(len(rows),part['rows']);count+=len(rows)
   self.assertEqual(count,spec['rows'])
if __name__=='__main__':unittest.main()
