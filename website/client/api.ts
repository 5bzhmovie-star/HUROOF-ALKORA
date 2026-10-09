export type User = {
    id: string;
    name: string;
    theme: string;
};
export type Session = {
    user: User | null;
    admin: {
        id: string;
        username: string;
        role: string;
    } | null;
    csrf: string;
    bot: {
        provider: string;
        siteKey?: string;
    };
    defaultTheme: string;
    maintenance: boolean;
    supportUrl?: string | null;
};
export type Competition = {
    id: string;
    name: string;
    questions: number;
    position: number;
    active?: number;
};
export type Team = {
    name: string;
    color: string;
};
export type Cell = {
    index: number;
    letter: string;
    owner: number;
};
export type Room = {
    id: string;
    version: number;
    config: {
        teams: Team[];
        size: number;
        rounds: number;
        mode: string;
        seconds: number;
        tournaments: string[];
        autoReopen: boolean;
        difficulty: string;
    };
    round: number;
    results: {round: number; winner: number}[];
    matchWinner: number;
    board: Cell[];
    cell: number | null;
    question: {
        letter: string;
        text: string;
        answer?: string;
        visual?: import('./VisualQuestion').VisualLineup;
        source?: string;
        note?: string;
        difficulty: string;
        tournament: string;
    } | null;
    revealed: boolean;
    visualReveal?: {mode:string;slots:number[];startedAt:number|null}|null;
    winner: number;
    path: number[];
    buzz: {
        open: boolean;
        winner: {
            id: string;
            name: string;
            team: number;
        } | null;
        deadline: number | null;
        key: string;
    };
    serverTime: number;
    questionKey: string;
    playersCount: number;
    canControl?: boolean;
    me: {
        id: string;
        name: string;
        team: number;
    } | null;
    players?: {
        id: string;
        name: string;
        team: number;
        online: boolean;
    }[];
    events?: {
        id: number;
        message: string;
        created_at: number;
    }[];
    canUndo?: boolean;
    links?: {
        display: string;
        buzzer: string;
    };
};
let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export async function api<T = any>(path: string, body?: unknown): Promise<T> { let response: Response; try { response = await fetch('/api' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000), headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); } catch { throw new Error('تأخر الاتصال بالموقع. حاول مرة أخرى.'); } let result: any; try {
    result = await response.json();
}
catch {
    throw new Error('تعذر الاتصال بالموقع. حاول مرة أخرى.');
} if (!response.ok)
    throw Object.assign(new Error(result.error || 'لم يكتمل الطلب.'), { status: response.status }); if (result.csrf)
    setCsrf(result.csrf); return result; }
export const ar = (value: number) => value.toLocaleString('ar-SA');
export const difficulties = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
export const navigate = (path: string) => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0 }); };

/** The Windows host may advertise a LAN URL for invite links while staying on loopback itself. */
export const inviteOrigin = (): string => typeof window === 'undefined' ? '' :
    ((window as any).__HK_LAN_SHARE_ORIGIN || window.location.origin);
