<?php
declare(strict_types=1);
// CLI only: credentials come from the process environment, never HTTP parameters.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
const TABLE_COLUMNS = [
 'football_entities'=>['id','entity_type','name_ar','name_en','image_key','image_source','image_license','fallback','metadata','updated_at'],
 'visual_assets'=>['id','content_type','relative_path','sha256','license','source','created_at'],
 'football_relations'=>['id','from_entity_id','to_entity_id','relation_type','starts_at','ends_at','metadata','source'],
 'football_import_batches'=>['id','source','snapshot_date','sha256','entities_added','relations_added','images_missing','created_at'],
 'football_participant_snapshots'=>['competition_id','season','team_ids','source','verified_at','status'],
 'football_squad_snapshots'=>['team_id','competition_id','season','player_ids','coach_ids','source','verified_at','status'],
 'football_context_media'=>['id','entity_id','team_id','role','starts_at','ends_at','asset_id','review'],
 'football_fact_records'=>['id','entity_id','kind','context_id','season','as_of','payload','source','status','verified_at']
];
function readBounded(string $path,int $limit): string {
 if (!is_file($path) || filesize($path)>$limit) throw new RuntimeException('Missing or oversized snapshot file');
 $bytes=file_get_contents($path); if($bytes===false)throw new RuntimeException('Cannot read snapshot');return $bytes;
}
function decode(string $value): array {
 $result=json_decode($value,true,128,JSON_THROW_ON_ERROR);
 if(!is_array($result))throw new RuntimeException('Invalid JSON object');return $result;
}
try {
 $base=realpath($argv[1]??'');if($base===false || !is_dir($base))throw new RuntimeException('Snapshot directory required');
 $indexBytes=readBounded($base.'/index.json',1048576);$index=decode($indexBytes);
 if(($index['formatVersion']??null)!==1 || ($index['releaseReady']??null)!==false)throw new RuntimeException('Unsupported snapshot format');
 $tables=$index['tables']??[];$names=array_keys($tables);sort($names);$expected=array_keys(TABLE_COLUMNS);sort($expected);
 if($names!==$expected)throw new RuntimeException('Unexpected or missing snapshot table');
 $loaded=[];$counts=[];$digest=hash_init('sha256');hash_update($digest,$indexBytes);
 // Validate every byte and row before any database connection or write.
 foreach(TABLE_COLUMNS as $table=>$columns){
  $record=$tables[$table];$total=0;$loaded[$table]=[];$seenParts=[];
  if(!is_int($record['rows']??null) || $record['rows']<0 || $record['rows']>100000 || !is_array($record['parts']??null))throw new RuntimeException('Invalid table count');
  foreach($record['parts'] as $part){
   $relative=$part['path']??'';
   if(!is_string($relative) || !preg_match('~^'.preg_quote($table,'~').'/part-[0-9]{4}\.json$~D',$relative) || isset($seenParts[$relative]))throw new RuntimeException('Unsafe or duplicate part path');
   $seenParts[$relative]=true;$path=realpath($base.'/'.$relative);
   if($path===false || !str_starts_with($path,$base.DIRECTORY_SEPARATOR))throw new RuntimeException('Unsafe snapshot path');
   $raw=readBounded($path,8388608);
   if(!is_string($part['sha256']??null) || !hash_equals($part['sha256'],hash('sha256',$raw)))throw new RuntimeException('Part checksum mismatch');
   $rows=decode($raw);if(!array_is_list($rows) || count($rows)!==($part['rows']??null))throw new RuntimeException('Part row count mismatch');
   foreach($rows as $row){
    if(!is_array($row))throw new RuntimeException('Invalid row');$keys=array_keys($row);sort($keys);$wanted=$columns;sort($wanted);
    if($keys!==$wanted)throw new RuntimeException('Unexpected row columns');
    foreach($row as $value)if(!is_null($value) && !is_string($value) && !is_int($value))throw new RuntimeException('Invalid scalar field');
   }
   $loaded[$table][]=$rows;$total+=count($rows);hash_update($digest,$relative);hash_update($digest,$raw);
  }
  if($total!==$record['rows'])throw new RuntimeException('Table row count mismatch');$counts[$table]=$total;
 }
 $snapshotSha=hash_final($digest);$dsn=getenv('HA_IMPORT_DSN')?:'';
 if(!str_starts_with($dsn,'mysql:'))throw new RuntimeException('HA_IMPORT_DSN must select MySQL');
 $db=new PDO($dsn,getenv('HA_IMPORT_USER')?:'',getenv('HA_IMPORT_PASSWORD')?:'',[
  PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false]);
 $db->exec('SET NAMES utf8mb4');
 // Fixed local schema only. MySQL DDL commits separately; data insertion is atomic.
 $schema=file_get_contents(__DIR__.'/schema.mysql.sql');if($schema===false)throw new RuntimeException('Missing schema');
 foreach(explode(';',$schema) as $statement)if(trim($statement)!=='')$db->exec($statement);
 $lock=$db->query("SELECT GET_LOCK('huroof_library_import',10)")->fetchColumn();if((int)$lock!==1)throw new RuntimeException('Another import is running');
 try {
  $previous=$db->query('SELECT snapshot_sha FROM huroof_library_import_runs')->fetchAll(PDO::FETCH_COLUMN);
  $already=in_array($snapshotSha,$previous,true);
  if($previous && !$already)throw new RuntimeException('Different snapshot already installed; migration required');
  if(!$already){
   foreach(TABLE_COLUMNS as $table=>$columns)if((int)$db->query('SELECT COUNT(*) FROM huroof_library_'.$table)->fetchColumn()!==0)throw new RuntimeException('Existing library data; refusing overwrite');
   $db->beginTransaction();
   try {
    foreach(TABLE_COLUMNS as $table=>$columns){
     $sql='INSERT INTO huroof_library_'.$table.' (`'.implode('`,`',$columns).'`) VALUES ('.implode(',',array_fill(0,count($columns),'?')).')';$insert=$db->prepare($sql);
     foreach($loaded[$table] as $part)foreach($part as $row)$insert->execute(array_map(fn($column)=>$row[$column],$columns));
    }
    $db->prepare('INSERT INTO huroof_library_import_runs(snapshot_sha,counts) VALUES(?,?)')->execute([$snapshotSha,json_encode($counts,JSON_THROW_ON_ERROR)]);$db->commit();
   }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
  }
  foreach($counts as $table=>$count)if((int)$db->query('SELECT COUNT(*) FROM huroof_library_'.$table)->fetchColumn()!==$count)throw new RuntimeException('Installed row count mismatch');
  echo json_encode(['snapshotSha'=>$snapshotSha,'alreadyImported'=>$already,'counts'=>$counts,'releaseReady'=>false],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE).PHP_EOL;
 }finally{$db->query("SELECT RELEASE_LOCK('huroof_library_import')");}
}catch(Throwable $error){fwrite(STDERR,'Import failed: '.$error->getMessage().PHP_EOL);exit(1);}
