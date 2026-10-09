import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MINI_CONTENT_VERSION, MINI_MEDIA, MINI_ROUNDS } from './mini-content.mjs';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dataDir = resolve(process.env.DATA_DIR || resolve(root, 'data'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const dbPath = resolve(dataDir, 'huroof.sqlite');
export const db = new DatabaseSync(dbPath);
chmodSync(dbPath, 0o600);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;`);
db.exec(readFileSync(resolve(root, 'server/schema.sql'), 'utf8'));
function ensureLocalMigrations() {
    const columns = new Set(db.prepare('PRAGMA table_info(mini_game_rounds)').all().map(column => column.name));
    if (!columns.has('accepted')) db.exec("ALTER TABLE mini_game_rounds ADD COLUMN accepted TEXT NOT NULL DEFAULT '[]'");
    if (!columns.has('explanation')) db.exec("ALTER TABLE mini_game_rounds ADD COLUMN explanation TEXT NOT NULL DEFAULT ''");
    if (!columns.has('visual_data')) db.exec("ALTER TABLE mini_game_rounds ADD COLUMN visual_data TEXT NOT NULL DEFAULT '{}'");
    db.prepare('INSERT OR IGNORE INTO schema_versions(version,applied_at) VALUES(?,?)').run(3, Date.now());
}
ensureLocalMigrations();
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const many = (sql, ...params) => db.prepare(sql).all(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);
export function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
        const result = fn();
        db.exec('COMMIT');
        return result;
    }
    catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}
export function seedDatabase() {
    const bank = JSON.parse(readFileSync(resolve(root, 'seed/questions.json'), 'utf8'));
    const current = Number(one("SELECT value FROM settings WHERE key='seed_version'")?.value || 0);
    if (current < bank.version) transaction(() => {
        if (current < 4)
            run("DELETE FROM questions WHERE note='قاعدة كروية عامة تنطبق على مباريات هذه البطولة.'");
        for (const t of current ? [] : bank.tournaments)
            run('INSERT OR IGNORE INTO tournaments(id,name,active,position) VALUES(?,?,1,?)', t.id, t.name, t.position);
        for (const q of (one("SELECT value FROM settings WHERE key='basic_questions_customized'")?.value === 'true' ? [] : bank.questions.filter(q => !current || (q.pack || 1) > current)))
            run('INSERT OR IGNORE INTO questions(id,tournament_id,letter,text,answer,difficulty,status,source,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)', q.id, q.tournament_id, q.letter, q.text, q.answer, q.difficulty, 'published', q.source, q.note || '', Date.now(), Date.now());
        run("INSERT INTO settings(key,value) VALUES('seed_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",String(bank.version));
        run("INSERT OR IGNORE INTO settings(key,value) VALUES('maintenance','false'),('default_theme','dark'),('max_players','64')");
        run("UPDATE settings SET value='dark' WHERE key='default_theme' AND value='auto'");
        run("UPDATE users SET theme='dark' WHERE theme='auto'");
    });
    const miniCurrent = Number(one("SELECT value FROM settings WHERE key='mini_seed_version'")?.value || 0);
    if (miniCurrent < MINI_CONTENT_VERSION) transaction(() => {
        const stamp = Date.now();
        run("UPDATE mini_game_rounds SET status='hidden',updated_at=? WHERE id='gt-argentina'", stamp);
        for (const round of MINI_ROUNDS)
            run("INSERT INTO mini_game_rounds(id,game_slug,difficulty,prompt,solution,accepted,explanation,visual_data,source,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET game_slug=excluded.game_slug,difficulty=excluded.difficulty,prompt=excluded.prompt,solution=excluded.solution,accepted=excluded.accepted,explanation=excluded.explanation,visual_data=excluded.visual_data,source=excluded.source,updated_at=excluded.updated_at", round.id, round.game_slug, round.difficulty, round.prompt, round.solution, JSON.stringify(round.accepted), round.explanation, JSON.stringify(round.visual), round.source, round.status, stamp, stamp);
        for (const [id, media] of Object.entries(MINI_MEDIA))
            run("INSERT INTO football_entities(id,entity_type,name_ar,name_en,image_key,image_source,image_license,fallback,metadata,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET entity_type=excluded.entity_type,image_key=excluded.image_key,image_source=excluded.image_source,image_license=excluded.image_license,fallback=excluded.fallback,updated_at=excluded.updated_at", id, media.type, media.fallback, media.fallback, media.url, media.source, media.license, media.fallback, '{}', stamp);
        run("INSERT INTO settings(key,value) VALUES('mini_seed_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(MINI_CONTENT_VERSION));
    });
    db.exec('PRAGMA optimize');
}
