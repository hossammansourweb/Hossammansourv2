import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- CRC32 (for PNG chunks) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Brand palette
const TEAL_TOP = [14, 56, 71]; // #0E3847
const TEAL_BOT = [16, 51, 60]; // #10333C
const CORAL = [224, 90, 71]; // #E05A47
const WHITE = [255, 255, 255];

function buildIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const corner = size * (maskable ? 0 : 0.18); // rounded corner radius for standard
  const circleR = size * (maskable ? 0.30 : 0.34); // white disc
  const arm = size * 0.072; // cross arm half-thickness
  const len = size * 0.20; // cross arm half-length
  const discInner = size * 0.012;

  const inRoundRect = (x, y) => {
    if (maskable) return true;
    const r = corner;
    if (x >= r && x <= size - r) return true;
    if (y >= r && y <= size - r) return true;
    const nx = Math.min(Math.max(x, r), size - r);
    const ny = Math.min(Math.max(y, r), size - r);
    return (x - nx) ** 2 + (y - ny) ** 2 <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundRect(x, y)) {
        px[i] = px[i + 1] = px[i + 2] = 0;
        px[i + 3] = 0;
        continue;
      }
      // Background gradient
      const t = y / size;
      let r = lerp(TEAL_TOP[0], TEAL_BOT[0], t);
      let g = lerp(TEAL_TOP[1], TEAL_BOT[1], t);
      let b = lerp(TEAL_TOP[2], TEAL_BOT[2], t);

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White disc
      if (dist <= circleR) {
        r = g = b = 255;
        // subtle inner ring
        if (dist > circleR - discInner * 4 && dist <= circleR) {
          r = g = b = 255;
        }
      }

      // Coral medical cross (only inside disc)
      if (dist <= circleR - discInner * 2) {
        const inCross =
          (Math.abs(dx) <= arm && Math.abs(dy) <= len) ||
          (Math.abs(dy) <= arm && Math.abs(dx) <= len);
        if (inCross) {
          r = CORAL[0];
          g = CORAL[1];
          b = CORAL[2];
        }
      }

      px[i] = clamp(r);
      px[i + 1] = clamp(g);
      px[i + 2] = clamp(b);
      px[i + 3] = 255;
    }
  }
  return encodePNG(size, size, px);
}

const sizes = [192, 512];
for (const s of sizes) {
  writeFileSync(join(OUT, `icon-${s}.png`), buildIcon(s, false));
  writeFileSync(join(OUT, `maskable-${s}.png`), buildIcon(s, true));
}
// Apple touch icon (180) — standard style
writeFileSync(join(OUT, 'apple-touch-icon.png'), buildIcon(180, false));
// Favicon PNG (96) for broad support
writeFileSync(join(OUT, 'favicon-96.png'), buildIcon(96, false));

console.log('PWA icons generated in', OUT);
