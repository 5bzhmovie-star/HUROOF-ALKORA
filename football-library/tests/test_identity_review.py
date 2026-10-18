import importlib.util,unittest,tempfile,sqlite3,json
from pathlib import Path
SCRIPT=Path(__file__).resolve().parents[1]/'scripts/build_identity_review.py'
class IdentityReviewTests(unittest.TestCase):
 def module(self):
  self.assertTrue(SCRIPT.exists(),'Identity review builder is missing');s=importlib.util.spec_from_file_location('identity_review',SCRIPT);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
 def test_name_only_never_matches_and_date_conflicts_are_visible(self):
  m=self.module();f=[{'id':'f1','names':['José Silva'],'dob':'1990-01-02'}];rows=[{'id':'x','names':['Jose Silva'],'dob':None},{'id':'y','names':['Jose Silva'],'dob':'1991-01-02'}];r=m.match_candidates(rows,f);self.assertEqual(r[0]['candidateIds'],[]);self.assertEqual(r[0]['status'],'missing-birth-date');self.assertEqual(r[1]['status'],'birth-date-conflict');self.assertEqual(r[1]['candidateIds'],[])
 def test_ambiguity_is_not_a_merge_and_nicknames_do_not_expand(self):
  m=self.module();f=[{'id':'f1','names':['José Silva'],'dob':'1990-01-02'},{'id':'f2','names':['Jose Silva'],'dob':'1990-01-02'}];r=m.match_candidates([{'id':'a','names':['Jose Silva'],'dob':'1990-01-02'},{'id':'b','names':['Silva'],'dob':'1990-01-02'}],f);self.assertEqual(r[0]['status'],'ambiguous');self.assertEqual(r[1]['candidateIds'],[]);self.assertTrue(all(not x['mergeApproved'] for x in r))
 def test_exact_match_preserves_fifa_club_history_and_requires_review(self):
  m=self.module();f=[{'id':'f1','names':['José Silva'],'dob':'1990-01-02','clubAtWorldCup':'Old Club'}];r=m.match_candidates([{'id':'a','names':['Jose Silva'],'dob':'1990-01-02','clubId':'new-club'}],f);self.assertEqual(r[0]['candidateIds'],['f1']);self.assertEqual(r[0]['status'],'exact-name-and-birth-date-review-required');self.assertFalse(r[0]['mergeApproved']);self.assertEqual(f[0]['clubAtWorldCup'],'Old Club')
 def test_namespaces_are_distinct_and_sqlite_rejects_broken_links(self):
  m=self.module();self.assertNotEqual(m.source_key('laliga','123'),m.source_key('premier-league-api','123'))
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'review.sqlite';m.write_sqlite(p,[{'id':'s1','names':['Example'],'dob':'1990-01-01','namespace':'n','sourcePersonId':'1','clubId':'c','source':'https://example.test','inputFile':'input.json','inputSha256':'a'*64}], [{'sourceId':'s1','candidateIds':['f1'],'status':'review-required','mergeApproved':False}], [{'id':'f1','names':['Example'],'dob':'1990-01-01'}]);db=sqlite3.connect(p);self.assertEqual(db.execute('select count(*) from observations').fetchone()[0],1);self.assertEqual(db.execute('pragma foreign_key_check').fetchall(),[]);self.assertEqual(db.execute('select merge_approved from candidates').fetchone()[0],0)
if __name__=='__main__':unittest.main()
