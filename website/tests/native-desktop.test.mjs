import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { createHmac } from 'node:crypto';

const exec = promisify(execFile);
const dir = mkdtempSync(join(tmpdir(),'huroof-native-enroll-'));
process.env.DATA_DIR = dir;
process.env.NODE_ENV = 'desktop';
const script = resolve('server/bootstrap-admin.mjs');
const env = {...process.env, DATA_DIR: dir, NODE_ENV: 'desktop'};

function totp(secret) {
  const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits=0,value=0,bytes=[];
  for(const char of secret){ value=(value<<5)|abc.indexOf(char); bits+=5;
    if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;} }
  const time=Buffer.alloc(8);time.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac('sha1', Buffer.from(bytes)).update(time).digest();
  const offset=digest[digest.length-1]&15;
  return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
const status = async()=>JSON.parse((await exec(process.execPath,[script,'--status'],{env,timeout:30000})).stdout.trim());

test('Windows first-run enrollment is private, one-time, password-hashed and TOTP protected',async()=>{
  assert.equal((await status()).configured,false);
  const child=spawn(process.execPath,[script],{env,stdio:['pipe','pipe','pipe']});
  const reader=createInterface({input:child.stdout})[Symbol.asyncIterator]();
  const send=async payload=>{
    child.stdin.write(JSON.stringify(payload)+'\n');
    const {value,done}=await Promise.race([
      reader.next(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('bootstrap timeout')),30000))
    ]);
    assert.equal(done,false);return JSON.parse(value);
  };
  try {
    const first=await send({username:'windowsowner',password:'secure-long-password-2026!'});
    assert.match(first.secret,/^[A-Z2-7]+$/);
    assert.ok(first.uri.startsWith('otpauth://totp/'));
    const good=totp(first.secret),bad=good==='000000'?'111111':'000000';
    assert.match((await send({code:bad})).error,/رمز/);
    assert.equal((await send({code:good})).ok,true);
    await new Promise(resolve=>child.once('close',resolve));
    assert.equal((await status()).configured,true);
    const duplicate=spawn(process.execPath,[script],{env,stdio:['pipe','pipe','pipe']});
    const lines=createInterface({input:duplicate.stdout})[Symbol.asyncIterator]();
    duplicate.stdin.write(JSON.stringify({username:'anotherowner',password:'another-password-2026!x'})+'\n');
    const result=JSON.parse((await lines.next()).value);
    assert.match(result.error,/الإدارة بالفعل/);
    duplicate.kill();
  } finally { if(child.exitCode===null)child.kill(); }
});

test('LAN HTTP accepts only the configured IP and blocks administrator endpoints',async()=>{
  process.env.HK_DESKTOP_LAN_IP='192.168.21.42';
  const {createApplication}=await import('../server/index.mjs');
  const {db}=await import('../server/database.mjs');
  const app=createApplication({port:0,origin:'http://127.0.0.1:0'});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const port=app.server.address().port;
  // Node fetch/undici replaces Host with the actual transport port. Use an explicit
  // HTTP request here to simulate the public Host header without spoofing a socket.
  const {request}=await import('node:http');
  const send=(path,host)=>new Promise((resolve,reject)=>{
    const client=request({hostname:'127.0.0.1',port,path,headers:{Host:host}},response=>{
      response.resume();response.on('end',()=>resolve(response.statusCode));
    });
    client.on('error',reject);client.end();
  });
  try{
    assert.equal(await send('/api/session','192.168.21.42:0'),200);
    assert.equal(await send('/api/admin/overview','192.168.21.42:0'),403);
    assert.equal(await send('/api/session','192.168.21.43:0'),400);
  } finally {
    app.server.closeAllConnections();
    await new Promise(r=>app.server.close(r));
    db.close();
    delete process.env.HK_DESKTOP_LAN_IP;
    rmSync(dir,{recursive:true,force:true});
  }
});
