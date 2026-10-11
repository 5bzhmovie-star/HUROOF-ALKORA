import {importFifaSnapshot,installFifaFlags} from '../server/football-fifa-import.mjs';
import {db} from '../server/database.mjs';
try{console.log(JSON.stringify({...importFifaSnapshot(),flags:installFifaFlags()},null,2));}finally{db.close()}
