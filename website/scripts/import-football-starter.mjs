import {seedDatabase} from '../server/database.mjs';
import {importOfficialStarter} from '../server/football-starter.mjs';
seedDatabase();
console.log(JSON.stringify(importOfficialStarter(),null,2));
