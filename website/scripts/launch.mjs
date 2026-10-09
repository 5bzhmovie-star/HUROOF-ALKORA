import {spawn} from 'node:child_process';
if(Number(process.versions.node.split('.')[0])<24){console.error('Node.js 24 or newer is required.');process.exit(1);}
const {createApplication}=await import('../server/index.mjs');
const {server,port,config}=createApplication();
server.listen(port,'127.0.0.1',()=>{console.log('حروف الكورة تعمل على '+config.origin);if(process.platform==='win32')spawn('rundll32.exe',['url.dll,FileProtocolHandler',config.origin],{stdio:'ignore'});});
