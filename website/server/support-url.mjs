// A support link is an external destination. Never accept a scheme that can run code
// or a URL that embeds credentials; an empty value disables the public link.
export function normalizeSupportUrl(value) {
    if (value == null || value === '') return '';
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return '';
    if (raw.length > 2048 || /[\u0000-\u001f\u007f]/.test(raw)) return null;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return null;
        return url.href;
    } catch {
        return null;
    }
}
