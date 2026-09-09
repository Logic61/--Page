// 一次性分析 分支图-final.png 的 luma 分布，决定树体该压到哪个范围
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', '分支图-final.png');

const img = sharp(src);
const meta = await img.metadata();
const { width: w, height: h, channels: c } = meta;
const raw = await img.clone().raw().toBuffer();

const hist = new Array(16).fill(0);
let opaque = 0, minL = 255, maxL = 0, sumL = 0;
for (let i = 0; i < w * h; i++) {
  const p = i * 4;
  const a = raw[p + 3];
  if (a < 10) continue;
  opaque++;
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma < minL) minL = luma;
  if (luma > maxL) maxL = luma;
  sumL += luma;
  hist[Math.min(15, Math.floor(luma / 16))]++;
}
console.log('opaque pixels:', opaque);
console.log('luma min/max/avg:', minL.toFixed(1), maxL.toFixed(1), (sumL / opaque).toFixed(1));
console.log('histogram (16 bins, 0..15=0..15, 16..31, ..., 240..255):');
for (let i = 0; i < 16; i++) {
  const lo = i * 16, hi = lo + 15;
  const pct = (hist[i] / opaque * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(hist[i] / opaque * 80));
  console.log(`  [${lo.toString().padStart(3)}-${hi.toString().padStart(3)}] ${pct.padStart(5)}% ${bar}`);
}
