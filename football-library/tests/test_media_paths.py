import importlib.util,unittest
from pathlib import Path
class MediaPathTest(unittest.TestCase):
 def test_chelsea_asset_paths_are_portable_and_reject_traversal(self):
  p=Path(__file__).resolve().parents[1]/'scripts/acquire_chelsea.py';spec=importlib.util.spec_from_file_location('chelsea',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  self.assertTrue(hasattr(m,'media_folder'),'Portable source path helper missing')
  folder=m.media_folder('chelsea:Abc_123-xy');self.assertEqual(folder.parts[-2:],('chelsea','Abc_123-xy'))
  for identity in ['chelsea:../outside','chelsea:a/b','chelsea:c:d','other:abc']:
   with self.assertRaises(ValueError):m.media_folder(identity)
if __name__=='__main__':unittest.main()
