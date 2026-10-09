import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const QRCode = require('./vendor/qr/index.js');
export function qrSvg(value) { const qr = new QRCode(-1, 1); qr.addData(value); qr.make(); const size = qr.getModuleCount(); let path = ''; for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
        if (qr.isDark(y, x))
            path += `M${x + 4} ${y + 4}h1v1h-1z`; return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 ${size + 8} ${size + 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="#102826"/></svg>`; }
