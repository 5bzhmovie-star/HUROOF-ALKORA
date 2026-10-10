import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { root, db, one, many, run, transaction, seedDatabase } from './database.mjs';
import * as security from './security.mjs';
import * as rooms from './rooms.mjs';
import { adminGet, adminWrite, audit, requireAdmin } from './admin.mjs';
import { qrSvg } from './qr.mjs';
import { normalizeSupportUrl } from './support-url.mjs';
import { miniMedia } from './mini-media.mjs';
import { getMedia } from './visual-media.mjs';
import {atlasExplore,atlasDetail} from './football-viewer.mjs';
import { importCompetitionCatalog } from './football-competitions.mjs';
import { addEntity } from './football-library.mjs';
import { importOfficialStarter } from './football-starter.mjs';
import * as miniRooms from './mini-rooms.mjs';
import { MINI_GAMES } from './mini-content.mjs';
import { cleanupExpired } from './cleanup.mjs';
const { fail, hash, hmac, limit } = security;
export function createApplication(options = {}) {
    const port = Number(options.port ?? process.env.PORT ?? 3000);
    const config = { origin: options.origin || process.env.APP_ORIGIN || `http://localhost:${port}`, turnstileSecret: process.env.TURNSTILE_SECRET_KEY || '', turnstileSite: process.env.TURNSTILE_SITE_KEY || '' };
    const originURL = new URL(config.origin);
    // LAN is an explicit desktop-only opt-in. Never wildcard-match arbitrary Host headers.
    const lanIp = process.env.NODE_ENV === 'desktop' ? String(process.env.HK_DESKTOP_LAN_IP || '') : '';
    const isLanIp = /^(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}$/.test(lanIp)
      && lanIp.split('.').every(octet=>Number(octet)>=0&&Number(octet)<=255);
    const lanOrigin = isLanIp ? `http://${lanIp}:${port}` : null;
    config.origin = originURL.origin;
    const production = process.env.NODE_ENV === 'production', secure = originURL.protocol === 'https:';
    if (production && !secure)
        throw new Error('APP_ORIGIN must use HTTPS in production.');
    if (Boolean(config.turnstileSecret) !== Boolean(config.turnstileSite))
        throw new Error('Both Turnstile keys are required.');
    seedDatabase();
    // Preload the source-linked reference catalog in desktop builds. This only creates
    // pending-review records; it never publishes questions or claims licensed images.
    if (process.env.NODE_ENV === 'desktop' && !one("SELECT value FROM settings WHERE key='football_atlas_first_run_v1'")) {
        transaction(() => {
            importCompetitionCatalog({addEntity,one});
            importOfficialStarter();
            run("INSERT OR IGNORE INTO settings(key,value) VALUES('football_atlas_first_run_v1',?)",new Date().toISOString());
        });
    }
    const clientDir = resolve(root, 'dist/client'), assetCache = new Map(), remoteMediaCache = new Map();
    let passwordChecks = 0;
    function requireUser(session) { const user = session?.user_id ? one('SELECT * FROM users WHERE id=? AND blocked=0', session.user_id) : null; if (!user)
        fail(401, 'ادخل باسمك أولًا.'); return user; }
    async function bodyJson(req, max = 1048576) { let length = 0, parts = []; for await (const data of req) {
        length += data.length;
        if (length > max)
            fail(413, 'الطلب أكبر من الحد المسموح.');
        parts.push(data);
    } try {
        const data = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
        if (!data || typeof data !== 'object' || Array.isArray(data))
            throw 0;
        return data;
    }
    catch {
        fail(400, 'البيانات المرسلة غير صحيحة.');
    } }
    function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
    function sessionPayload(s, admin) { const user = s?.user_id ? one('SELECT id,name,theme FROM users WHERE id=? AND blocked=0', s.user_id) : null; return { user, admin: admin ? { id: admin.id, username: admin.username, role: admin.role } : null, csrf: hmac(`csrf:${s.token_hash}`), bot: config.turnstileSite ? { provider: 'turnstile', siteKey: config.turnstileSite } : { provider: 'captcha' }, defaultTheme: one("SELECT value FROM settings WHERE key='default_theme'")?.value || 'auto', maintenance: one("SELECT value FROM settings WHERE key='maintenance'")?.value === 'true', supportUrl: normalizeSupportUrl(one("SELECT value FROM settings WHERE key='support_url'")?.value) || null }; }
    const server = http.createServer(async (req, res) => {
        security.headers(res, secure);
        const requestId = randomUUID();
        res.setHeader('X-Request-Id', requestId);
        try {
            const lanRequest = !!lanOrigin && req.headers.host === new URL(lanOrigin).host;
            if (req.headers.host !== originURL.host && !lanRequest)
                fail(400, 'عنوان الخادم غير صحيح.');
            if (String(req.headers['sec-fetch-site'] || '') === 'cross-site' && String(req.url).startsWith('/api/'))
                fail(403, 'الطلب غير مسموح.');
            const requestOrigin = lanRequest ? lanOrigin : config.origin;
            const url = new URL(req.url, requestOrigin), path = url.pathname, method = req.method || 'GET';
            // Admin passwords and TOTP must never pass over plaintext LAN HTTP.
            if (lanRequest && path.startsWith('/api/admin'))
                fail(403, 'إدارة البرنامج متاحة على الكمبيوتر المضيف فقط.');
            let ip = req.socket.remoteAddress || 'unknown';
            // Trust only a specifically configured upstream address; never arbitrary forwarded headers.
            if (process.env.TRUSTED_PROXY_IP && ip === process.env.TRUSTED_PROXY_IP)
                ip = String(req.headers['x-forwarded-for'] || ip).split(',').at(-1).trim();
            const visualMediaMatch = method === 'GET' && path.match(/^\/api\/visual-media\/([a-zA-Z0-9_-]{8,64})$/);
            if(visualMediaMatch) {
                limit(`visual-media:${ip}`,200,60000);
                const media=getMedia(visualMediaMatch[1]);
                res.writeHead(200, {'Content-Type':media.contentType,'Cache-Control':'private,max-age=3600','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});
                return res.end(media.bytes);
            }
            const mediaMatch = method === 'GET' && path.match(/^\/api\/media\/([a-z0-9-]{1,40})$/);
            if (mediaMatch) {
                limit(`media:${ip}`, 120, 60000);
                const item = miniMedia(mediaMatch[1]);
                if (!item)
                    fail(404, 'الصورة غير موجودة.');
                let media = remoteMediaCache.get(mediaMatch[1]);
                if (!media) {
                    const upstream = await fetch(item.url, { headers: { Accept: 'image/avif,image/webp,image/jpeg,image/*', 'User-Agent': 'Huroof-Alkora/1.0' }, signal: AbortSignal.timeout(8000) });
                    const type = upstream.headers.get('content-type') || '';
                    if (!upstream.ok || !type.startsWith('image/'))
                        fail(502, 'تعذر تحميل الصورة.');
                    const body = Buffer.from(await upstream.arrayBuffer());
                    if (body.length > 5000000)
                        fail(502, 'الصورة أكبر من الحد.');
                    media = { body, type };
                    remoteMediaCache.set(mediaMatch[1], media);
                }
                res.writeHead(200, { 'Content-Type': media.type, 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400', 'Cross-Origin-Resource-Policy': 'same-origin' });
                return res.end(media.body);
            }
            if (path === '/api/health') {
                // Desktop runtime verifies this process before trusting the localhost origin.
                if (process.env.HK_DESKTOP_HEALTH_TOKEN &&
                    req.headers['x-desktop-health'] !== process.env.HK_DESKTOP_HEALTH_TOKEN)
                    fail(403, 'فشل تحقق التطبيق المحلي.');
                one('SELECT 1');
                return json(res, { ok: true });
            }
            if (path.startsWith('/api/')) {
                limit(`api:${ip}`, 900, 60000);
                let cookies = security.parseCookies(req), s = security.session(cookies.hk_sid, 'guest');
                const as = security.session(cookies.hk_admin, 'admin');
                const admin = as ? one('SELECT * FROM admins WHERE id=? AND active=1', as.admin_id) : null;
                const user = s?.user_id ? one('SELECT * FROM users WHERE id=? AND blocked=0', s.user_id) : null;
                if (method === 'GET' && path === '/api/session') {
                    if (!s) {
                        limit(`session:${ip}`, 120, 3600000);
                        const raw = security.newSession('guest', null, null, 2592000);
                        security.cookie(res, 'hk_sid', raw, 2592000, secure);
                        s = security.session(raw, 'guest');
                    }
                    return json(res, sessionPayload(s, admin));
                }
                if (method !== 'GET')
                    security.checkWrite(req, requestOrigin, s?.token_hash);
                if (one("SELECT value FROM settings WHERE key='maintenance'")?.value === 'true' && !admin && !path.startsWith('/api/admin') && !['/api/session', '/api/challenge', '/api/logout'].includes(path))
                    fail(503, 'الموقع في صيانة قصيرة. جرّب بعد قليل.');
                if (method === 'GET' && path === '/api/challenge') {
                    if (!s)
                        fail(401, 'حدّث الصفحة أولًا.');
                    limit(`captcha:${ip}`, 60, 600000);
                    return json(res, config.turnstileSite ? { provider: 'turnstile', siteKey: config.turnstileSite } : security.captcha(s.token_hash));
                }
                if (method === 'POST' && path === '/api/identity') {
                    limit(`identity:${ip}`, 30, 3600000);
                    const body = await bodyJson(req, 4096);
                    const name = rooms.validName(body.name);
                    await security.verifyBot(body, s.token_hash, config);
                    const id = user?.id || security.token(18);
                    transaction(() => { if (user)
                        run('UPDATE users SET name=? WHERE id=?', name, id);
                    else
                        run('INSERT INTO users(id,name,created_at) VALUES(?,?,?)', id, name, Date.now()); run('UPDATE members SET name=? WHERE user_id=?',name,id); run('UPDATE mini_game_members SET name=? WHERE user_id=?',name,id); run('DELETE FROM sessions WHERE token_hash=?', s.token_hash); });
                    const raw = security.newSession('guest', id, null, 2592000);
                    security.cookie(res, 'hk_sid', raw, 2592000, secure);
                    s = security.session(raw, 'guest');
                    return json(res, sessionPayload(s, admin));
                }
                if (method === 'POST' && path === '/api/logout') {
                    run('DELETE FROM sessions WHERE token_hash=?', s.token_hash);
                    security.cookie(res, 'hk_sid', '', 0, secure);
                    return json(res, { ok: true });
                }
                if (method === 'GET' && path === '/api/atlas/explore')return json(res,atlasExplore({type:url.searchParams.get('type')||'',q:url.searchParams.get('q')||'',page:url.searchParams.get('page')||1}));
                if (method === 'GET' && path === '/api/atlas/detail')return json(res,atlasDetail(String(url.searchParams.get('id')||'')));
                if (method === 'GET' && path === '/api/tournaments')
                    return json(res, many("SELECT t.id,t.name,t.position,count(q.id) AS questions FROM tournaments t LEFT JOIN questions q ON q.tournament_id=t.id AND q.status='published' WHERE t.active=1 GROUP BY t.id ORDER BY t.position"));
                if (method === 'GET' && path === '/api/mini-games')
                    return json(res, MINI_GAMES.map(game => ({ ...game, rounds: one("SELECT count(*) AS n FROM mini_game_rounds WHERE game_slug=? AND status='published'", game.slug).n })));
                if (method === 'GET' && path === '/api/profile') {
                    const u = requireUser(s);
                    return json(res, { user: { id: u.id, name: u.name, theme: u.theme }, stats: one('SELECT count(*) AS games,coalesce(sum(won),0) AS wins FROM match_players WHERE user_id=?', u.id), rooms: many("SELECT id,config,created_at FROM rooms WHERE owner_id=? AND status='open' AND expires_at>? ORDER BY created_at DESC LIMIT 20", u.id, Date.now()).map(r => ({ ...r, config: JSON.parse(r.config) })) });
                }
                if (method === 'POST' && path === '/api/profile') {
                    const u = requireUser(s), body = await bodyJson(req, 4096);
                    const name = rooms.validName(body.name);
                    if (!['auto', 'light', 'dark'].includes(body.theme))
                        fail(422, 'اختر مظهرًا صحيحًا.');
                    run('UPDATE users SET name=?,theme=? WHERE id=?', name, body.theme, u.id);
                    run('UPDATE members SET name=? WHERE user_id=?', name, u.id);
                    run('UPDATE mini_game_members SET name=? WHERE user_id=?', name, u.id);
                    for (const r of many('SELECT room_id AS id FROM members WHERE user_id=?', u.id))
                        rooms.broadcast(r.id);
                    return json(res, { ok: true });
                }
                if (method === 'POST' && path === '/api/rooms') {
                    const u = requireUser(s);
                    limit(`rooms:${u.id}`, 8, 3600000);
                    limit(`rooms-ip:${ip}`, 30, 3600000);
                    if (one("SELECT count(*) AS n FROM rooms WHERE status='open' AND expires_at>?", Date.now()).n >= 500)
                        fail(503, 'الغرف مكتملة مؤقتًا. حاول لاحقًا.');
                    const room = rooms.createRoom(u, await bodyJson(req, 16384));
                    return json(res, { id: room.id }, 201);
                }
                if (method === 'POST' && path === '/api/mini-rooms') {
                    const u = requireUser(s);
                    limit(`mini-rooms:${u.id}`, 12, 3600000);
                    return json(res, miniRooms.createMiniRoom(u, await bodyJson(req, 16384)), 201);
                }
                const miniMatch = path.match(/^\/api\/mini-rooms\/([A-Za-z0-9_-]{12})(?:\/(action|join|buzz|qr))?$/);
                if (miniMatch) {
                    const [, id, operation] = miniMatch, view = url.searchParams.get('view') || 'display';
                    if (!['host', 'display', 'buzzer'].includes(view)) fail(422, 'نوع العرض غير صحيح.');
                    if (method === 'GET' && !operation) {
                        const room = miniRooms.getMiniRoom(id);
                        if (view === 'buzzer') miniRooms.touchMiniMember(id, user);
                        if (url.searchParams.get('since') === String(room.version)) return json(res, { unchanged: true, version: room.version, serverTime: Date.now() });
                        return json(res, miniRooms.miniProjection(room, view, user));
                    }
                    if (method === 'GET' && operation === 'qr') {
                        miniRooms.getMiniRoom(id);
                        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=3600' });
                        return res.end(qrSvg(`${requestOrigin}/mini-room/${id}/buzzer`));
                    }
                    if (method === 'POST') {
                        const u = requireUser(s), body = await bodyJson(req, 8192);
                        if (operation === 'join') { limit(`mini-join:${u.id}`, 20, 60000); return json(res, miniRooms.joinMiniRoom(id, u, body)); }
                        if (operation === 'buzz') { limit(`mini-buzz:${u.id}`, 6, 1000); return json(res, miniRooms.buzzMini(id, u, body)); }
                        if (operation === 'action') { limit(`mini-action:${u.id}`, 160, 60000); return json(res, miniRooms.actMini(id, u, body)); }
                    }
                }
                const match = path.match(/^\/api\/rooms\/([A-Za-z0-9_-]{12})(?:\/(action|join|buzz|events|qr))?$/);
                if (match) {
                    const [, id, operation] = match;
                    const view = url.searchParams.get('view') || 'display';
                    if (!['host', 'display', 'buzzer'].includes(view))
                        fail(422, 'نوع العرض غير صحيح.');
                    if (method === 'GET' && !operation) {
                        const room = rooms.getRoom(id);
                        // Check role before the 304-like reply: no authorization bypass.
                        if (view === 'host') rooms.owner(room, user);
                        if (view === 'buzzer') rooms.member(room, user);
                        if (url.searchParams.get('since') === String(room.version))
                            return json(res, { unchanged: true, version: room.version, serverTime: Date.now() });
                        return json(res, rooms.projection(room, view, user));
                    }
                    if (method === 'GET' && operation === 'qr') {
                        rooms.getRoom(id);
                        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=3600' });
                        return res.end(qrSvg(`${requestOrigin}/room/${id}/buzzer`));
                    }
                    if (method === 'GET' && operation === 'events') {
                        if (!s)
                            fail(401, 'حدّث الصفحة أولًا.');
                        rooms.projection(rooms.getRoom(id), view, user);
                        limit(`sse-open:${s.token_hash}`, 40, 60000);
                        const all = [...rooms.subscribers.values()].flatMap(set => [...set]);
                        if (all.filter(c => c.sessionHash === s.token_hash).length >= 8 || all.filter(c => c.ip === ip).length >= 160 || all.length >= 3000)
                            fail(429, 'وصلت للحد الأقصى للشاشات المفتوحة.');
                        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
                        res.write('retry: 1500\n\n');
                        const c = { res, view, sessionHash: s.token_hash, userId: user?.id, ip };
                        if (!rooms.subscribers.has(id))
                            rooms.subscribers.set(id, new Set());
                        rooms.subscribers.get(id).add(c);
                        rooms.broadcast(id);
                        const heartbeat = setInterval(() => { try {
                            if (!security.session(cookies.hk_sid, 'guest'))
                                return res.end();
                            rooms.getRoom(id);
                            res.write(`event: ping\ndata: ${Date.now()}\n\n`);
                        }
                        catch {
                            res.end();
                        } }, 20000);
                        heartbeat.unref();
                        res.on('close', () => { clearInterval(heartbeat); rooms.subscribers.get(id)?.delete(c); if (!rooms.subscribers.get(id)?.size)
                            rooms.subscribers.delete(id);
                        else
                            rooms.broadcast(id); });
                        return;
                    }
                    if (method === 'POST') {
                        const u = requireUser(s);
                        limit(`action:${u.id}`, 160, 60000);
                        const body = await bodyJson(req, 8192);
                        if (operation === 'action')
                            return json(res, rooms.act(id, u, body));
                        if (operation === 'join') {
                            limit(`join:${u.id}`, 20, 60000);
                            return json(res, rooms.joinRoom(id, u, body));
                        }
                        if (operation === 'buzz') {
                            limit(`buzz:${u.id}`, 6, 1000);
                            return json(res, rooms.buzz(id, u, body));
                        }
                    }
                }
                if (path === '/api/admin/login' && method === 'POST') {
                    const b = await bodyJson(req, 4096);
                    const username = String(b.username || '').toLowerCase().trim();
                    limit(`admin-ip:${ip}`, 20, 900000);
                    limit(`admin-name:${username}`, 8, 900000);
                    if (passwordChecks >= 3)
                        fail(429, 'حاول تسجيل الدخول بعد قليل.');
                    if (String(b.password || '').length > 256)
                        fail(400, 'تعذر تسجيل الدخول.');
                    const a = one('SELECT * FROM admins WHERE username=? AND active=1', username);
                    passwordChecks++;
                    let valid = false;
                    try {
                        valid = await security.checkPassword(String(b.password || ''), a?.password_hash);
                    }
                    finally {
                        passwordChecks--;
                    }
                    const step = a ? security.verifyTotp(a, String(b.code || '')) : -1;
                    if (!valid || step < 0) {
                        audit('anonymous', 'admin.login.failed', hmac(username).slice(0, 16));
                        fail(401, 'بيانات الدخول أو رمز التحقق غير صحيح.');
                    }
                    if (run('UPDATE admins SET last_totp_step=? WHERE id=? AND last_totp_step<?', step, a.id, step).changes !== 1)
                        fail(401, 'استخدم رمز تحقق جديدًا.');
                    if (as)
                        run('DELETE FROM sessions WHERE token_hash=?', as.token_hash);
                    const raw = security.newSession('admin', null, a.id, 7200);
                    security.cookie(res, 'hk_admin', raw, 7200, secure);
                    audit(a.username, 'admin.login');
                    return json(res, sessionPayload(s, a));
                }
                if (path === '/api/admin/logout' && method === 'POST') {
                    if (as)
                        run('DELETE FROM sessions WHERE token_hash=?', as.token_hash);
                    security.cookie(res, 'hk_admin', '', 0, secure);
                    return json(res, { ok: true });
                }
                if (path === '/api/admin/invite' && method === 'POST') {
                    requireAdmin(admin, ['owner']);
                    limit(`invite:${admin.id}`, 5, 3600000);
                    const b = await bodyJson(req, 4096), username = String(b.username || '').toLowerCase().trim(), password = String(b.password || '');
                    if (!/^[a-z0-9_.-]{3,32}$/.test(username) || password.length < 14 || password.length > 128 || !['owner', 'manager', 'questions'].includes(b.role))
                        fail(422, 'اسم الإدارة بالإنجليزية، وكلمة المرور ١٤ حرفًا على الأقل.');
                    const secret = security.base32(randomBytes(20)), id = security.token(18), digest = await security.passwordHash(password);
                    run('INSERT INTO admins(id,username,password_hash,totp_secret,role,active,created_at) VALUES(?,?,?,?,?,0,?)', id, username, digest, security.sealSecret(secret), b.role, Date.now());
                    audit(admin.username, 'admin.invite', id);
                    return json(res, { id, secret, uri: `otpauth://totp/Huroof:${encodeURIComponent(username)}?secret=${secret}&issuer=Huroof&algorithm=SHA1&digits=6&period=30` });
                }
                if (path === '/api/admin/activate' && method === 'POST') {
                    requireAdmin(admin, ['owner']);
                    limit(`activate:${admin.id}`, 12, 900000);
                    const b = await bodyJson(req, 4096), a = one('SELECT * FROM admins WHERE id=? AND active=0', String(b.id));
                    const step = a ? security.verifyTotp(a, String(b.code)) : -1;
                    if (step < 0)
                        fail(422, 'رمز التحقق غير صحيح.');
                    run('UPDATE admins SET active=1,last_totp_step=? WHERE id=?', step, a.id);
                    audit(admin.username, 'admin.activate', a.id);
                    return json(res, { ok: true });
                }
                if (path.startsWith('/api/admin/')) {
                    requireAdmin(admin);
                    limit(`admin:${admin.id}`, 180, 60000);
                    const route = path.slice('/api/admin/'.length);
                    if (method === 'GET')
                        return json(res, adminGet(route, url, admin));
                    if (method === 'POST')
                        return json(res, await adminWrite(route, await bodyJson(req, 2097152), admin));
                }
                fail(404, 'الطلب غير موجود.');
            }
            if (!['GET', 'HEAD'].includes(method))
                fail(405, 'الطريقة غير مسموحة.');
            let relative;
            try {
                relative = decodeURIComponent(path);
            }
            catch {
                fail(400, 'الرابط غير صحيح.');
            }
            const routes = /^\/(?:|create|account|admin|atlas|privacy|rules|mini-games(?:\/[a-z0-9-]+)?|mini-room\/[A-Za-z0-9_-]{12}\/(?:host|display|buzzer)|room\/[A-Za-z0-9_-]{12}\/(?:host|display|buzzer))$/;
            const route = routes.test(relative);
            let filename = route ? resolve(clientDir, 'index.html') : resolve(clientDir, '.' + relative);
            if (!filename.startsWith(clientDir + sep) || !existsSync(filename) || !statSync(filename).isFile()) {
                if (!route) fail(404, 'الملف غير موجود.');
                if (!existsSync(resolve(clientDir, 'index.html')))
                    fail(503, 'ملفات الموقع قيد التجهيز.');
                filename = resolve(clientDir, 'index.html');
                res.statusCode = 404;
            }
            const ext = extname(filename), mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' }[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', ext === '.html' || relative === '/sw.js' ? 'no-cache' : relative.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
            let data = assetCache.get(filename);
            if (!data) {
                data = readFileSync(filename);
                if (ext === '.html')
                    data = Buffer.from(data.toString().replaceAll('__APP_ORIGIN__', config.origin));
                if (data.length < 2000000)
                    assetCache.set(filename, data);
            }
            if (req.headers['accept-encoding']?.includes('gzip') && ['.html', '.js', '.css', '.svg', '.json'].includes(ext)) {
                res.setHeader('Content-Encoding', 'gzip');
                res.setHeader('Vary', 'Accept-Encoding');
                const gzipKey = `${filename}::gzip`;
                let compressed = assetCache.get(gzipKey);
                if (!compressed) {
                    compressed = gzipSync(data);
                    if (compressed.length < 2000000) assetCache.set(gzipKey, compressed);
                }
                data = compressed;
            }
            if (method === 'HEAD')
                return res.end();
            res.end(data);
        }
        catch (error) {
            if (res.headersSent) {
                res.end();
                return;
            }
            let status = error.status || 500, message = error.message;
            if (/UNIQUE constraint failed/.test(message)) {
                status = 409;
                message = 'هذا السجل موجود مسبقًا.';
            }
            if (status >= 500 && status !== 503) {
                console.error(JSON.stringify({ level: 'error', requestId, code: error.code || 'INTERNAL', message: production ? 'request failed' : error.message }));
                message = 'حدث خطأ مؤقت. حاول مرة أخرى.';
            }
            if (status === 429)
                res.setHeader('Retry-After', '30');
            json(res, { error: message, requestId }, status);
        }
    });
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    server.keepAliveTimeout = 5000;
    server.maxHeadersCount = 40;
    const timer = setInterval(rooms.expireBuzzers, 250);
    timer.unref();
    const cleanup = setInterval(() => { const now = Date.now(); run('DELETE FROM sessions WHERE expires_at<?', now); run('DELETE FROM challenges WHERE expires_at<?', now); run('DELETE FROM rates WHERE reset_at<?', now); cleanupExpired(now); run('DELETE FROM events WHERE created_at<?', now - 30 * 86400000); run('DELETE FROM mini_game_events WHERE created_at<?', now - 30 * 86400000); run('DELETE FROM audit WHERE created_at<?', now - 90 * 86400000); }, 60000);
    cleanup.unref();
    server.on('close', () => { clearInterval(timer); clearInterval(cleanup); for (const clients of rooms.subscribers.values())
        for (const c of clients)
            c.res.end(); rooms.subscribers.clear(); });
    return { server, config, port };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { server, port, config } = createApplication();
    server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`حروف الكورة — ${config.origin}`));
    for (const signal of ['SIGTERM', 'SIGINT'])
        process.on(signal, () => { for (const clients of rooms.subscribers.values())
            for (const c of clients)
                c.res.end(); server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(1), 8000).unref(); });
}
