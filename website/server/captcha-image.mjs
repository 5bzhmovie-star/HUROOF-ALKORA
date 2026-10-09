import { randomInt } from 'node:crypto';
import { deflateSync } from 'node:zlib';
// Small raster glyphs. The response contains pixels only, never the challenge text.
const GLYPHS = {
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
    '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111']
};
function crc(bytes) { let value = 0xffffffff; for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i++)
        value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
} return (value ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, checksum]); }
export function captchaImage(code) {
    const width = 220, height = 76, pixels = Buffer.alloc(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        pixels[i * 3] = 237;
        pixels[i * 3 + 1] = 246;
        pixels[i * 3 + 2] = 239;
    }
    const draw = (x, y, color) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < width && y < height)
        for (let i = 0; i < 3; i++)
            pixels[(y * width + x) * 3 + i] = color[i]; };
    for (let i = 0; i < 5; i++) {
        const glyph = GLYPHS[code[i]], offsetY = randomInt(12, 24), slope = randomInt(-2, 3) / 12;
        for (let row = 0; row < 7; row++)
            for (let col = 0; col < 5; col++)
                if (glyph[row][col] === '1')
                    for (let dy = 0; dy < 5; dy++)
                        for (let dx = 0; dx < 5; dx++)
                            draw(15 + i * 39 + col * 5 + dx + slope * row * 5, offsetY + row * 5 + dy, [23, 55, 43]);
    }
    for (let i = 0; i < 100; i++)
        draw(randomInt(width), randomInt(height), [110, 157, 130]);
    for (let line = 0; line < 3; line++) {
        const y = randomInt(height), slope = randomInt(-10, 11) / 20;
        for (let x = 0; x < width; x++)
            draw(x, y + slope * x, [132, 170, 147]);
    }
    const rows = Buffer.alloc(height * (width * 3 + 1));
    for (let y = 0; y < height; y++)
        pixels.copy(rows, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
