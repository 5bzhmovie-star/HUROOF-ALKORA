import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
test('latest profile context wins out-of-order requests and close invalidates late responses',async()=>{
 const path=new URL('../client/latest-request.mjs',import.meta.url);
 assert.ok(existsSync(path),'latest-request controller has not been implemented');
 const {latestRequest}=await import(path);
 const request=latestRequest();const displayed=[];let finishClub,finishNation;
 const club=request.run(()=>new Promise(resolve=>finishClub=resolve),value=>displayed.push(value));
 const nation=request.run(()=>new Promise(resolve=>finishNation=resolve),value=>displayed.push(value));
 finishNation('nation jersey');await nation;finishClub('club jersey');await club;
 assert.deepEqual(displayed,['nation jersey']);
 let finishAfterClose;const closing=request.run(()=>new Promise(resolve=>finishAfterClose=resolve),value=>displayed.push(value));request.cancel();finishAfterClose('late portrait');await closing;
 assert.deepEqual(displayed,['nation jersey']);
});
