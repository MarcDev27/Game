// Generates PNG app icons (pure Node, no dependencies): node tools/gen-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 32x32 pixel-art design, upscaled: layered strata, a glowing ore vein and a neon horizon.
function design(u, v) {
  const x = Math.floor(u * 32), y = Math.floor(v * 32);
  const sky = [5 + y * 2, 6 + y * 2, 15 + y * 5];
  if (y < 13) {
    if ((x * 7 + y * 13) % 37 === 0) return [220, 240, 255];
    const dx = x - 22, dy = y - 7;
    if (dx * dx + dy * dy < 14) return [255, 61, 220];
    return sky;
  }
  if (y === 13) return [46, 242, 255];
  if (y === 14) return [47, 224, 168];
  const band = Math.floor((y - 15) / 4);
  const base = [[110, 81, 72], [107, 115, 128], [63, 69, 82], [75, 59, 59]][Math.min(3, band)];
  const ore = (Math.abs(x - 16 - Math.sin(y * 0.6) * 5) < 1.5) && y > 17 && y < 29;
  if (ore) return [164, 107, 255];
  const n = ((x * 31 + y * 17) % 7) - 3;
  return [base[0] + n * 4, base[1] + n * 4, base[2] + n * 4];
}
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const buf = png(size, (x, y) => [...design(x / size, y / size), 255]);
  fs.writeFileSync(path.join(root, 'icons', name), buf);
  console.log('wrote', name, buf.length, 'bytes');
}
