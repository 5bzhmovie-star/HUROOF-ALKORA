import unittest,importlib.util
from pathlib import Path
class FlagTest(unittest.TestCase):
 def test_local_svg_references_allowed_external_and_script_rejected(self):
  path=Path(__file__).resolve().parents[1]/'scripts/acquire_flags.py';spec=importlib.util.spec_from_file_location('flags',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  safe=b'<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="p" d="M0 0"/></defs><use href="#p"/></svg>'
  self.assertEqual(m.validate_svg(safe),safe)
  for value in [b'<svg><script>x</script></svg>',b'<svg><use href="https://evil.test/a"/></svg>',b'<svg><path fill="url(https://evil.test/a)"/></svg>']:
   with self.assertRaises(ValueError):m.validate_svg(value)
if __name__=='__main__':unittest.main()
