"use client";
import React, { useEffect, useState, useRef } from 'react';
import { LoaderCircle, RefreshCw, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { api, Session, navigate } from './api';
export { Button };
export function Link({ to, children, className = '', ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
}) { return <a href={to} className={className} {...props} onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    navigate(to);
} }}>{children}</a>; }
export function Choice({ value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: [
        string,
        string
    ][];
    label: string;
}) { return <Select dir="rtl" value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue placeholder={label}/></SelectTrigger><SelectContent position="popper">{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select>; }
export function Notice({ children, success = false }: {
    children: React.ReactNode;
    success?: boolean;
}) { return <div className={'notice ' + (success ? 'success' : '')} role={success ? 'status' : 'alert'}>{success ? <Check size={19}/> : <AlertCircle size={19}/>}<span>{children}</span></div>; }
export function Loading() { return <div className="loading" role="status"><LoaderCircle className="spin"/> لحظة ونجهزها…</div>; }
export function Empty({ title, detail }: {
    title: string;
    detail?: string;
}) { return <div className="empty"><div className="empty-mark">ح</div><h3>{title}</h3>{detail && <p>{detail}</p>}</div>; }
export function Confirm({ open, onOpenChange, title, description, action }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    action: () => void;
}) { return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent dir="rtl"><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={action}>تأكيد</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>; }
export function BotCheck({ session, onValue, reset }: {
    session: Session;
    onValue: (data: any) => void;
    reset: number;
}) {
    const [captcha, setCaptcha] = useState<any>(null), [error, setError] = useState(''), ref = useRef<HTMLDivElement>(null), [code, setCode] = useState('');
    const load = async () => { try {
        setError('');
        setCode('');
        const result = await api('/challenge');
        setCaptcha(result);
        onValue({ challenge: result.id, answer: '' });
    }
    catch (e: any) {
        setError(e.message);
    } };
    useEffect(() => { if (session.bot.provider === 'captcha') {
        void load();
        return;
    } let widget: any; let stopped = false; const render = () => { const ts = (window as any).turnstile; if (!stopped && ts && ref.current) {
        widget = ts.render(ref.current, { sitekey: session.bot.siteKey, language: 'ar', theme: 'auto', callback: (response: string) => onValue({ turnstile: response }), 'expired-callback': () => onValue({ turnstile: '' }), 'error-callback': () => setError('تعذر التحقق. أعد المحاولة.') });
    } }; const existing = document.querySelector<HTMLScriptElement>('#turnstile-script'); if ((window as any).turnstile)
        render();
    else if (existing)
        existing.addEventListener('load', render, { once: true });
    else {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = render;
        script.onerror = () => setError('تعذر تحميل التحقق. تحقق من اتصالك.');
        document.head.appendChild(script);
    } return () => { stopped = true; if (widget !== undefined)
        (window as any).turnstile?.remove(widget); }; }, [reset, session.bot.provider]);
    return <div className="bot-check">{session.bot.provider === 'turnstile' ? <div ref={ref}/> : <><label htmlFor="captcha">اكتب الرمز الظاهر</label><div className="captcha-row">{captcha?.image && <img src={captcha.image} width="220" height="76" alt="رمز التحقق من خمسة أحرف وأرقام"/>}<Button type="button" variant="outline" size="icon" aria-label="تغيير رمز التحقق" onClick={load}><RefreshCw /></Button></div><input id="captcha" dir="ltr" autoComplete="off" maxLength={5} value={code} onChange={e => { setCode(e.target.value); onValue({ challenge: captcha?.id, answer: e.target.value }); }} placeholder="ABCDE" required/></>}{error && <Notice>{error}</Notice>}</div>;
}
export function Identity({ session, onLogin }: {
    session: Session;
    onLogin: (s: Session) => void;
}) { const [name, setName] = useState(''), [bot, setBot] = useState<any>({}), [busy, setBusy] = useState(false), [error, setError] = useState(''), [reset, setReset] = useState(0); return <form className="identity-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
    onLogin(await api('/identity', { name, ...bot }));
}
catch (e: any) {
    setError(e.message);
    setReset(v => v + 1);
}
finally {
    setBusy(false);
} }}><label htmlFor="nickname">اسمك في اللعبة</label><input id="nickname" autoComplete="nickname" placeholder="وش نناديك؟" value={name} minLength={2} maxLength={24} onChange={e => setName(e.target.value)} required/><p className="hint">اسم مستعار يكفي. بدون بريد أو رقم جوال.</p><BotCheck session={session} onValue={setBot} reset={reset}/>{error && <Notice>{error}</Notice>}<Button className="primary wide" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin"/> : <>يلا نلعب <ArrowLeft /></>}</Button></form>; }
