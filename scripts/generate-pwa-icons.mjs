import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AMBER = [0xf5, 0xb5, 0x2a, 255];
const INK = [0x1a, 0x14, 0x04, 255];
const NIGHT = [0x0b, 0x0f, 0x14, 255];

const B = ["11110", "10001", "10001", "11110", "10001", "10001", "11110"];
const M = ["10001", "11011", "10101", "10001", "10001", "10001", "10001"];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fill(pixels, size, color) {
  for (let index = 0; index < size * size; index += 1) {
    const offset = index * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  }
}

function insideRoundRect(x, y, left, top, right, bottom, radius) {
  if (x < left || y < top || x >= right || y >= bottom) return false;
  const inCornerX = x < left + radius || x >= right - radius;
  const inCornerY = y < top + radius || y >= bottom - radius;
  if (!inCornerX || !inCornerY) return true;
  const cx = x < left + radius ? left + radius : right - radius - 1;
  const cy = y < top + radius ? top + radius : bottom - radius - 1;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function drawGlyph(pixels, size, glyph, originX, originY, unit) {
  for (let row = 0; row < glyph.length; row += 1) {
    for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] !== "1") continue;
      for (let dy = 0; dy < unit; dy += 1) {
        for (let dx = 0; dx < unit; dx += 1) {
          setPixel(pixels, size, originX + col * unit + dx, originY + row * unit + dy, INK);
        }
      }
    }
  }
}

function draw(size) {
  const pixels = Buffer.alloc(size * size * 4);
  fill(pixels, size, NIGHT);
  const inset = Math.round(size * 0.14);
  const radius = Math.round(size * 0.18);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (insideRoundRect(x, y, inset, inset, size - inset, size - inset, radius)) {
        setPixel(pixels, size, x, y, AMBER);
      }
    }
  }
  const unit = Math.max(2, Math.round(size * 0.045));
  const originX = Math.round((size - 11 * unit) / 2);
  const originY = Math.round((size - 7 * unit) / 2);
  drawGlyph(pixels, size, B, originX, originY, unit);
  drawGlyph(pixels, size, M, originX + 6 * unit, originY, unit);
  return png(size, pixels);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "public/icons"), { recursive: true });
writeFileSync(path.join(root, "public/apple-touch-icon.png"), draw(180));
writeFileSync(path.join(root, "public/icons/icon-192.png"), draw(192));
writeFileSync(path.join(root, "public/icons/icon-512.png"), draw(512));
