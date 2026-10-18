<?php
declare(strict_types=1);
// Native PHP only: indexed original TAR bytes, no archive extension or shell.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
function ha_media_target(string $root,string $relative): string {
 if(!preg_match('~^assets/pending_media/[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$~D',$relative))throw new RuntimeException('Unsafe media path');
 $path=$root;
 foreach(explode('/',$relative) as $segment){
  if($segment==='' || $segment==='.' || $segment==='..')throw new RuntimeException('Unsafe media segment');
  $path.='/'.$segment;if(is_link($path))throw new RuntimeException('Media symlink forbidden');
 }
 return $path;
}
function ha_media_hash_range(string $path,int $offset,int $length,$destination=null): string {
 $stream=fopen($path,'rb');if($stream===false)throw new RuntimeException('Cannot read media bundle');
 try{
  if(fseek($stream,$offset)!==0)throw new RuntimeException('Invalid media offset');$hash=hash_init('sha256');$remaining=$length;
  while($remaining>0){$chunk=fread($stream,min($remaining,262144));if($chunk===false || $chunk==='')throw new RuntimeException('Truncated media bundle');hash_update($hash,$chunk);
   if($destination!==null){$position=0;while($position<strlen($chunk)){$written=fwrite($destination,substr($chunk,$position));if($written===false || $written===0)throw new RuntimeException('Cannot write media');$position+=$written;}}
   $remaining-=strlen($chunk);
  }
  return hash_final($hash);
 }finally{fclose($stream);}
}
function ha_materialize_media(string $directory,bool $verifyOnly=false): array {
 $root=realpath($directory);if($root===false || !is_dir($root))throw new RuntimeException('Library root required');
 $bundleRoot=$root.'/assets/bundles';$indexPath=$bundleRoot.'/index.json';
 if(!is_file($indexPath) || is_link($indexPath) || filesize($indexPath)>4194304)throw new RuntimeException('Missing media bundle index');
 $index=json_decode(file_get_contents($indexPath),true,128,JSON_THROW_ON_ERROR);
 if(($index['format']??'')!=='huroof-media-bundles-v1' || !is_int($index['fileCount']??null) || $index['fileCount']>50000 || !is_array($index['parts']??null) || count($index['parts'])>1000)throw new RuntimeException('Unsupported media bundle index');
 $seen=[];$entries=[];$present=0;
 // Verify every bundle and every byte range before any asset directory is created.
 foreach($index['parts'] as $part){
  $name=$part['path']??'';if(!is_string($name) || !preg_match('~^media-[0-9]{4}\.tar$~D',$name))throw new RuntimeException('Unsafe bundle path');
  $path=$bundleRoot.'/'.$name;if(!is_file($path) || is_link($path) || filesize($path)!==($part['bytes']??null) || !hash_equals($part['sha256']??'',hash_file('sha256',$path)))throw new RuntimeException('Media bundle checksum mismatch');
  foreach($part['files']??[] as $file){
   $relative=$file['path']??'';if(!is_string($relative) || isset($seen[$relative]))throw new RuntimeException('Duplicate media path');$seen[$relative]=true;
   $target=ha_media_target($root,$relative);$offset=$file['offset']??null;$length=$file['bytes']??null;$sha=$file['sha256']??'';
   if(!is_int($offset) || $offset<512 || $offset%512!==0 || !is_int($length) || $length<1 || $length>95000000 || $offset+$length>filesize($path) || !is_string($sha) || !preg_match('/^[a-f0-9]{64}$/D',$sha))throw new RuntimeException('Invalid indexed media range');
   if(!hash_equals($sha,ha_media_hash_range($path,$offset,$length)))throw new RuntimeException('Media content checksum mismatch');
   if(file_exists($target)){if(!is_file($target) || !hash_equals($sha,hash_file('sha256',$target)))throw new RuntimeException('Existing media differs; refusing overwrite');$present++;}
   elseif($verifyOnly)throw new RuntimeException('Missing materialized media: '.$relative);
   $entries[]=[$path,$file,$target];
  }
 }
 if(count($entries)!==$index['fileCount'])throw new RuntimeException('Media file count mismatch');$extracted=0;
 if(!$verifyOnly)foreach($entries as [$path,$file,$target]){
  if(is_file($target))continue;$parent=dirname($target);if(!is_dir($parent) && !mkdir($parent,0755,true) && !is_dir($parent))throw new RuntimeException('Cannot create media directory');
  ha_media_target($root,$file['path']);$temporary=$target.'.huroof-tmp';$output=fopen($temporary,'xb');if($output===false)throw new RuntimeException('Cannot stage media');
  try{$sha=ha_media_hash_range($path,$file['offset'],$file['bytes'],$output);}finally{fclose($output);}
  if(!hash_equals($sha,$file['sha256'])){unlink($temporary);throw new RuntimeException('Media changed during extraction');}
  if(file_exists($target)){unlink($temporary);throw new RuntimeException('Media target appeared concurrently');}
  if(!rename($temporary,$target))throw new RuntimeException('Cannot install media');$extracted++;
 }
 return ['verified'=>count($entries),'alreadyPresent'=>$present,'extracted'=>$extracted,'releaseReady'=>false];
}
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){
 try{$args=$argv;$at=array_search('--root',$args,true);$root=$at!==false?($args[$at+1]??''):dirname(__DIR__);echo json_encode(ha_materialize_media($root,in_array('--verify',$args,true)),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE).PHP_EOL;}
 catch(Throwable $error){fwrite(STDERR,'Media import failed: '.$error->getMessage().PHP_EOL);exit(1);}
}
