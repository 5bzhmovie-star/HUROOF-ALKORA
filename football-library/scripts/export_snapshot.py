"""Export only library tables. Never export game accounts or claim completion."""
import argparse,hashlib,json,sqlite3
from pathlib import Path

TABLES=('football_entities','football_relations','visual_assets','football_import_batches',
        'football_participant_snapshots','football_squad_snapshots','football_context_media','football_fact_records')
def write(path,value):
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def export(database,output,chunk_size=250):
 database,output=Path(database).resolve(),Path(output).resolve()
 if not database.is_file() or not 1<=chunk_size<=1000:raise ValueError('Invalid database or chunk size')
 if output.exists():raise ValueError('Use a new output directory to avoid stale or overwritten exports')
 db=sqlite3.connect(database.as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
 try:
  db.execute('BEGIN')
  if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('SQLite integrity failure')
  if db.execute('PRAGMA foreign_key_check').fetchone():raise ValueError('Broken foreign key')
  existing={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
  output.mkdir(parents=True);manifest={'formatVersion':1,'releaseReady':False,'status':'internal-working-snapshot','tables':{}}
  for table in TABLES:
   if table not in existing:continue
   schema=[dict(r) for r in db.execute('PRAGMA table_info('+table+')')]
   order=[r['name'] for r in sorted(schema,key=lambda r:r['pk']) if r['pk']]
   if not order:raise ValueError('Missing stable table identity: '+table)
   cursor=db.execute('SELECT * FROM '+table+' ORDER BY '+','.join('"'+c+'"' for c in order))
   directory=output/table;directory.mkdir();parts=[];count=0
   while True:
    rows=[dict(r) for r in cursor.fetchmany(chunk_size)]
    if not rows:break
    relative=table+'/part-'+str(len(parts)+1).zfill(4)+'.json';path=output/relative;write(path,rows)
    parts.append({'path':relative,'rows':len(rows),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});count+=len(rows)
   manifest['tables'][table]={'rows':count,'columns':schema,'parts':parts}
  write(output/'index.json',manifest);verify(output);return manifest
 finally:db.close()
def verify(output):
 output=Path(output).resolve();manifest=json.loads((output/'index.json').read_text(encoding='utf-8'))
 for table,record in manifest['tables'].items():
  if table not in TABLES:raise ValueError('Unexpected table')
  total=0
  for part in record['parts']:
   path=(output/part['path']).resolve()
   if not path.is_relative_to(output) or not path.is_file():raise ValueError('Unsafe or missing part')
   raw=path.read_bytes()
   if hashlib.sha256(raw).hexdigest()!=part['sha256']:raise ValueError('Part checksum mismatch')
   rows=json.loads(raw)
   if not isinstance(rows,list) or len(rows)!=part['rows']:raise ValueError('Part row count mismatch')
   total+=len(rows)
  if total!=record['rows']:raise ValueError('Table row count mismatch')
 return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('database');parser.add_argument('output');args=parser.parse_args()
 result=export(args.database,args.output);print(json.dumps({k:v['rows'] for k,v in result['tables'].items()}))
