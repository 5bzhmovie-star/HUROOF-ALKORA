import {backup} from 'node:sqlite';
import {mkdirSync,copyFileSync,chmodSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {db,dataDir} from '../server/database.mjs';
const target=resolve(process.env.BACKUP_DIR||resolve(dataDir,'backups'),new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(target,{recursive:true,mode:0o700});
try{await backup(db,resolve(target,'huroof.sqlite'));copyFileSync(resolve(dataDir,'.session-key'),resolve(target,'.session-key'));chmodSync(resolve(target,'huroof.sqlite'),0o600);chmodSync(resolve(target,'.session-key'),0o600);writeFileSync(resolve(target,'backup.json'),JSON.stringify({version:1,created_at:new Date().toISOString(),note:'Contains database and encryption key. Keep this directory private.'},null,2),{mode:0o600});console.log('Backup created: '+target);}finally{db.close();}
