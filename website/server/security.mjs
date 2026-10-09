import { captchaImage } from './captcha-image.mjs';
import { randomBytes, createHash, createHmac, timingSafeEqual, scrypt as _scrypt, randomInt, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { one, run, dataDir } from './database.mjs';
export const scrypt = promisify(_scrypt);
export const token = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const hash = value => createHash('sha256').update(String(value)).digest('hex');
const secretFile = resolve(dataDir, '.session-key');
if (!existsSync(secretFile))
    writeFileSync(secretFile, randomBytes(48), { mode: 0o600, flag: 'wx' });
const secret = readFileSync(secretFile);
export const hmac = value => createHmac('sha256', secret).update(String(value)).digest('hex');
export const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const encryptionKey = createHash('sha256').update(secret).update('admin-totp-v1').digest();
export function sealSecret(value) { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey, iv); const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.'); }
export function openSecret(value) { const [version, iv, tag, encrypted] = String(value).split('.'); if (version !== 'v1')
    throw new Error('Invalid TOTP secret envelope'); const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'base64url')); decipher.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8'); }
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function limit(key, max, windowMs) {
    const now = Date.now(), hashed = hmac(key);
    run('INSERT INTO rates(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END', hashed, now + windowMs, now, now);
    const entry = one('SELECT count,reset_at FROM rates WHERE key=?', hashed);
    if (entry.count > max)
        fail(429, 'طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.');
}
export function parseCookies(req) {
    const out = {};
    for (const part of (req.headers.cookie || '').split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key && !Object.hasOwn(out, key))
            out[key] = rest.join('=');
    }
    return out;
}
export function cookie(res, name, value, seconds, secure) {
    const existing = res.getHeader('Set-Cookie') || [];
    res.setHeader('Set-Cookie', [...existing, `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`]);
}
export function session(raw, kind) {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw))
        return null;
    return one('SELECT * FROM sessions WHERE token_hash=? AND kind=? AND expires_at>?', hash(raw), kind, Date.now()) || null;
}
export function newSession(kind, userId, adminId, lifetime) {
    const raw = token();
    run('INSERT INTO sessions VALUES(?,?,?,?,?,?)', hash(raw), kind, userId || null, adminId || null, Date.now() + lifetime * 1000, Date.now());
    return raw;
}
export function checkWrite(req, origin, sessionHash) {
    if (req.headers.origin !== origin)
        fail(403, 'مصدر الطلب غير مسموح.');
    if (!String(req.headers['content-type'] || '').startsWith('application/json'))
        fail(415, 'صيغة الطلب غير مدعومة.');
    if (!sessionHash || !equal(req.headers['x-csrf-token'], hmac(`csrf:${sessionHash}`)))
        fail(403, 'انتهت جلسة الصفحة. حدّث الصفحة وحاول مرة أخرى.');
}
export function headers(res, secure) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://commons.wikimedia.org https://upload.wikimedia.org https://flagcdn.com https://crests.football-data.org; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'");
    if (secure)
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
export async function passwordHash(password) {
    const salt = token(16), key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function checkPassword(password, encoded) {
    const [, salt, digest] = String(encoded || '').split('$');
    const key = await scrypt(password, salt || 'invalid-admin-account', 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return digest ? equal(key.toString('hex'), digest) : false;
}
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes) { let bits = 0, value = 0, out = ''; for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
        out += BASE32[(value >>> (bits - 5)) & 31];
        bits -= 5;
    }
} if (bits)
    out += BASE32[(value << (5 - bits)) & 31]; return out; }
export function totp(secretText, step = Math.floor(Date.now() / 30000)) {
    let bits = 0, value = 0, bytes = [];
    for (const ch of secretText) {
        value = (value << 5) | BASE32.indexOf(ch);
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest(), offset = digest[19] & 15;
    return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
export function verifyTotp(admin, code) {
    if (!/^\d{6}$/.test(code))
        return -1;
    const now = Math.floor(Date.now() / 30000);
    for (const step of [now, now - 1, now + 1])
        if (step > admin.last_totp_step && equal(totp(openSecret(admin.totp_secret), step), code))
            return step;
    return -1;
}
export function captcha(sessionHash) {
    const id = token(18), alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const code = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
    run('DELETE FROM challenges WHERE session_hash=? OR expires_at<?', sessionHash, Date.now());
    run('INSERT INTO challenges VALUES(?,?,?,?)', id, sessionHash, hmac(`${id}:${code}`), Date.now() + 120000);
    return { id, image: 'data:image/png;base64,' + captchaImage(code).toString('base64') };
}
export async function verifyBot(body, sessionHash, config) {
    if (config.turnstileSecret) {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ secret: config.turnstileSecret, response: body.turnstile || '' }), signal: AbortSignal.timeout(7000) }).catch(() => null);
        const result = response?.ok ? await response.json() : {};
        if (!result.success || result.hostname !== new URL(config.origin).hostname)
            fail(400, 'لم ينجح التحقق. حاول مرة أخرى.');
        return;
    }
    const c = one('SELECT * FROM challenges WHERE id=? AND session_hash=?', String(body.challenge || ''), sessionHash);
    if (c)
        run('DELETE FROM challenges WHERE id=?', c.id);
    if (!c || c.expires_at < Date.now() || !equal(c.answer_hash, hmac(`${c.id}:${String(body.answer || '').toUpperCase().trim()}`)))
        fail(400, 'رمز التحقق غير صحيح أو انتهى. أعد المحاولة برمز جديد.');
}
