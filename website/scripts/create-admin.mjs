import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {randomBytes} from 'node:crypto';
import {Writable} from 'node:stream';
import {db,one,run,seedDatabase} from '../server/database.mjs';
import {base32,passwordHash,token,sealSecret,verifyTotp} from '../server/security.mjs';
seedDatabase();
if(!stdin.isTTY){console.error('Run this command in an interactive terminal. Passwords are never accepted on command-line arguments.');process.exit(1);}
let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)stdout.write(chunk,encoding);done();}});
const rl=createInterface({input:stdin,output,terminal:true});
try{
  console.log('حروف الكورة — إنشاء حساب إدارة محلي موثوق');
  const username=(await rl.question('اسم المستخدم (English): ')).trim().toLowerCase();
  if(!/^[a-z0-9_.-]{3,32}$/.test(username)||one('SELECT id FROM admins WHERE username=?',username))throw new Error('اسم غير صحيح أو مستخدم مسبقًا.');
  stdout.write('كلمة مرور قوية (14 حرفًا على الأقل، مخفية): ');muted=true;const password=await rl.question('');muted=false;stdout.write('\n');
  if(password.length<14||password.length>128)throw new Error('كلمة المرور يجب أن تكون بين 14 و128 حرفًا.');
  const secret=base32(randomBytes(20));
  console.log('أضف هذا المفتاح في تطبيق المصادقة (TOTP):\n'+secret+'\nاحتفظ به في مكان آمن. لا ترسله لأحد.');
  const encrypted=sealSecret(secret),code=await rl.question('اكتب الرمز المكون من ستة أرقام: '),step=verifyTotp({totp_secret:encrypted,last_totp_step:-1},code.trim());
  if(step<0)throw new Error('رمز التحقق غير صحيح. لم يتم إنشاء الحساب.');
  const id=token(18);run('INSERT INTO admins(id,username,password_hash,totp_secret,last_totp_step,role,created_at) VALUES(?,?,?,?,?,?,?)',id,username,await passwordHash(password),encrypted,step,'owner',Date.now());
  console.log('تم إنشاء الحساب. افتح /admin وسجّل الدخول برمز تحقق جديد.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{muted=false;rl.close();db.close();}
