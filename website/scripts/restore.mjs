import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,copyFileSync,chmodSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
const [sourceArg,targetArg,confirmation]=process.argv.slice(2);
if(!sourceArg||!targetArg||confirmation!=='--server-stopped'){console.error('Usage: node scripts/restore.mjs /absolute/backup /absolute/target --server-stopped\nStop the server first. Target must be empty.');process.exit(1);}
const source=resolve(sourceArg),target=resolve(targetArg),file=resolve(source,'huroof.sqlite');
if(!existsSync(file)||!existsSync(resolve(source,'.session-key'))||existsSync(resolve(target,'huroof.sqlite')))throw new Error('Backup is incomplete or destination is not empty. Existing data will not be overwritten.');
const input=new DatabaseSync(file,{readOnly:true});if(input.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed.');if(input.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Backup foreign keys are inconsistent.');input.close();
mkdirSync(target,{recursive:true,mode:0o700});copyFileSync(file,resolve(target,'huroof.sqlite'));copyFileSync(resolve(source,'.session-key'),resolve(target,'.session-key'));chmodSync(resolve(target,'huroof.sqlite'),0o600);chmodSync(resolve(target,'.session-key'),0o600);
const restored=new DatabaseSync(resolve(target,'huroof.sqlite'));restored.exec('DELETE FROM sessions; DELETE FROM challenges; DELETE FROM rates;');restored.close();
console.log('Restore completed. Sessions were revoked. Set DATA_DIR to the restored directory and start the server.');
