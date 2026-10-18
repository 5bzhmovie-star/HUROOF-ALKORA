"""Keep structured source facts without redistributing long narrative biographies."""
import hashlib,json
from pathlib import Path

def sanitize(value):
 if isinstance(value,dict):
  result={}
  for key,item in value.items():
   narrative=isinstance(item,str) and item.strip() and ('biograph' in key.lower() or (key.lower() in {'bio','description','careerhistory','html','content','about','story'} and len(item)>300))
   result[key]={'sourceNarrativeOmitted':True,'sourceTextSha256':hashlib.sha256(item.encode()).hexdigest(),'characters':len(item),'reason':'Source prose omitted; structured facts and attribution retained'} if narrative else sanitize(item)
  return result
 if isinstance(value,list):return [sanitize(item) for item in value]
 return value

if __name__=='__main__':
 base=Path(__file__).resolve().parents[1]
 for f in base.glob('data/english_completion_*2026_27.json'):
  d=json.loads(f.read_text());new=sanitize(d)
  if new!=d:f.write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n')
