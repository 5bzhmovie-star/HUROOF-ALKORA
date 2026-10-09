// First-run owner enrollment via a private child-process stdin/stdout protocol.
// Never exposes a bootstrap HTTP endpoint or ships a hardcoded administrator.
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { db, one, run, seedDatabase } from './database.mjs';
import { base32, sealSecret, verifyTotp, passwordHash, token } from './security.mjs';

seedDatabase();
const rl = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
let pending = null, attempts = 0;
const reply = data => process.stdout.write(JSON.stringify(data) + '\n');
try {
  for await (const line of rl) {
    let body;
    try { body = JSON.parse(line); } catch { reply({error: 'بيانات غير صحيحة.'}); break; }
    const admins = Number(one('SELECT count(*) n FROM admins')?.n || 0);
    if (admins) { reply({error: 'تم إعداد حساب الإدارة بالفعل. افتح شاشة دخول الإدارة.'}); break; }
    if (!pending) {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!/^[a-z0-9_.-]{3,32}$/.test(username) || password.length < 14 || password.length > 128) {
        reply({error: 'اسم المستخدم 3-32 حرفًا إنجليزيًا وكلمة المرور 14-128 حرفًا.'}); break;
      }
      const secret = base32(randomBytes(20));
      pending = {username, password, secret};
      reply({secret, uri: `otpauth://totp/HuroofAlKora:${encodeURIComponent(username)}?secret=${secret}&issuer=HuroofAlKora&algorithm=SHA1&digits=6&period=30`});
      continue;
    }
    const code = String(body.code || '').trim();
    const step = verifyTotp({totp_secret: sealSecret(pending.secret), last_totp_step: -1},code);
    if (step < 0) {
      attempts++;
      if(attempts >= 5){ reply({error: 'انتهت المحاولات. افتح الإعداد من جديد.'}); break; }
      reply({error: 'رمز المصادقة غير صحيح؛ انتظر رمزًا جديدًا.'});
      continue;
    }
    if (one('SELECT count(*) n FROM admins').n !== 0) { reply({error:'تم إعداد مالك بالفعل.'}); break; }
    const digest = await passwordHash(pending.password);
    run('INSERT INTO admins(id,username,password_hash,totp_secret,last_totp_step,role,active,created_at) VALUES(?,?,?,?,?,?,1,?)',
      token(18),pending.username,digest,sealSecret(pending.secret),step,'owner',Date.now());
    pending.password = '';
    reply({ok:true});
    break;
  }
} catch {
  reply({error:'تعذّر إعداد الإدارة. أعد المحاولة.'});
} finally { pending = null; rl.close(); db.close(); }
