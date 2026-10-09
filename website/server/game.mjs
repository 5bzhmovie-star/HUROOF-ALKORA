import { randomInt } from 'node:crypto';
export const LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
export const PALETTE = ['#15803d', '#2563eb', '#b45309', '#be185d', '#7c3aed', '#0e7490'];
export function normalizeAnswer(value) { return String(value).normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[أإآٱ]/g, 'ا').trim(); }
export function answerLetter(value) { let a = normalizeAnswer(value); if (a.startsWith('ال'))
    a = a.slice(2); return a[0]; }
export function checkColors(a, b) { if (![a, b].every(c => /^#[0-9a-f]{6}$/i.test(c)))
    return false; const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const [x, y] = [rgb(a), rgb(b)]; const luminance = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); return [x, y].every(v => 1.05 / (luminance(v) + .05) >= 4.5) && Math.hypot(...x.map((v, i) => v - y[i])) >= 120; }
// Alternating horizontal offsets: even rows start left, odd rows start half a cell right.
export function neighbors(index, size) { const row = Math.floor(index / size), col = index % size; const offsets = row % 2 ? [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]] : [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]; return offsets.map(([r, c]) => [row + r, col + c]).filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size).map(([r, c]) => r * size + c); }
export function findPath(board, size, team) { const seen = new Set(), queue = []; for (let i = 0; i < size; i++) {
    const start = team === 1 ? i : i * size;
    if (board[start].owner === team) {
        queue.push([start]);
        seen.add(start);
    }
} for (let head = 0; head < queue.length; head++) {
    const path = queue[head], last = path.at(-1);
    if (team === 1 ? Math.floor(last / size) === size - 1 : last % size === size - 1)
        return path;
    for (const n of neighbors(last, size))
        if (!seen.has(n) && board[n].owner === team) {
            seen.add(n);
            queue.push([...path, n]);
        }
} return []; }
export function makeBoard(size, coverage) {
    const playable = LETTERS.filter(letter => coverage[letter] > 0);
    if (!playable.length || playable.reduce((sum, letter) => sum + coverage[letter], 0) < size * size)
        throw Object.assign(new Error('الأسئلة الخاصة بالبطولات المختارة لا تكفي لهذه اللوحة. اختر بطولات أكثر أو مستوى متنوعًا.'), { status: 422 });
    const used = new Map();
    return Array.from({ length: size * size }, (_, index) => {
        // Prefer every relevant letter once before repeating. Never add a
        // letter merely to inject a generic question unrelated to the selection.
        const unused = playable.filter(letter => (used.get(letter) || 0) === 0);
        const available = unused.length ? unused : playable.filter(letter => (used.get(letter) || 0) < coverage[letter]);
        if (!available.length)
            throw Object.assign(new Error('الأسئلة لا تكفي لهذا الحجم. أضف بطولات أو اختر شبكة أصغر.'), { status: 422 });
        const least = Math.min(...available.map(letter => used.get(letter) || 0));
        const candidates = available.filter(letter => (used.get(letter) || 0) === least);
        const letter = candidates[randomInt(candidates.length)];
        used.set(letter, (used.get(letter) || 0) + 1);
        return { index, letter, owner: 0 };
    });
}
export function publicQuestion(q, showAnswer) { if (!q)
    return null; const result = { letter: q.letter, text: q.text, difficulty: q.difficulty, tournament: q.tournament }; if (showAnswer)
    Object.assign(result, { answer: q.answer, source: q.source, note: q.note }); return result; }
