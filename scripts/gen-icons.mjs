// Generates the PWA icons (PNG) and favicon (SVG) with no image dependencies.
// Run: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x6d, 0x5e, 0xfc];
// 3×3 "calendar" of day cells; 1 = marked (white), 0 = unmarked (faded white).
const PATTERN = [
  [1, 1, 0],
  [1, 0, 1],
  [1, 1, 1],
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Inside a rounded rectangle (normalized coordinates)? */
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/**
 * Colour at a point. `rounded` gives a transparent rounded-corner tile;
 * `content` is the fraction of the tile the cell grid spans (smaller for maskable safe zone).
 */
function sample(x, y, { rounded, content }) {
  const insideTile = rounded ? inRoundRect(x, y, 0, 0, 1, 1, 0.22) : true;
  if (!insideTile) return [0, 0, 0, 0];
  const start = (1 - content) / 2;
  const cell = content / (3 + 2 * 0.28);
  const gap = cell * 0.28;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x0 = start + c * (cell + gap);
      const y0 = start + r * (cell + gap);
      if (inRoundRect(x, y, x0, y0, x0 + cell, y0 + cell, cell * 0.3)) {
        const a = PATTERN[r][c] ? 1 : 0.38;
        return [
          Math.round(BG[0] + (255 - BG[0]) * a),
          Math.round(BG[1] + (255 - BG[1]) * a),
          Math.round(BG[2] + (255 - BG[2]) * a),
          255,
        ];
      }
    }
  }
  return [...BG, 255];
}

function render(size, opts) {
  const ss = 4; // supersampling for smooth edges
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const [cr, cg, cb, ca] = sample((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, opts);
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const i = (py * size + px) * 4;
      out[i] = a ? Math.round(r / a) : 0;
      out[i + 1] = a ? Math.round(g / a) : 0;
      out[i + 2] = a ? Math.round(b / a) : 0;
      out[i + 3] = Math.round(a / (ss * ss));
    }
  }
  return encodePng(size, out);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, { rounded: true, content: 0.56 }));
writeFileSync('public/icons/icon-512.png', render(512, { rounded: true, content: 0.56 }));
writeFileSync('public/icons/icon-maskable-512.png', render(512, { rounded: false, content: 0.44 }));
writeFileSync('public/icons/apple-touch-icon.png', render(180, { rounded: false, content: 0.52 }));

// Favicon SVG with the same design.
const cell = 0.56 / (3 + 2 * 0.28);
const gap = cell * 0.28;
const start = (1 - 0.56) / 2;
const rects = PATTERN.flatMap((row, r) =>
  row.map((on, c) => {
    const x = (start + c * (cell + gap)) * 64;
    const y = (start + r * (cell + gap)) * 64;
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cell * 64).toFixed(2)}" height="${(cell * 64).toFixed(2)}" rx="${(cell * 64 * 0.3).toFixed(2)}" fill="#fff"${on ? '' : ' fill-opacity="0.38"'}/>`;
  }),
);
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6d5efc"/>${rects.join('')}</svg>\n`,
);
console.log('Icons written to public/');
