import { MINI_MEDIA } from './mini-content.mjs';

export function miniMedia(key) {
    return /^[a-z0-9-]{1,40}$/.test(key) ? MINI_MEDIA[key] || null : null;
}
