// 由 巫/分支图-10.png（1024×1536 RGB 纯黑底、无 alpha 的发光金线树图）
// 生成 four-veins 页用的真 alpha 贴图 public/巫/分支图-10.png。
// 背景纯黑（65.6% 像素 L<8），树体为亮金发光线条（含亮白高光，故用亮度键而非饱和度键）。
// 管线：
//   1) 亮度键：alpha = smoothstep(L, 10, 52)——纯黑背景→0，树体亮线→255，
//      半透明保留光晕边缘（暗部阴影让法阵透出，保持发光线的层次）；
//   2) alpha 0.5px 羽化 + PNG 调色板量化 q95 输出。
// 用法: node scripts/gen-v10-alpha.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '巫', '分支图-10.png');
const OUT = path.join(root, 'public', '巫', '分支图-10.png');

const meta = await sharp(SRC).metadata();
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
console.log('source:', W + 'x' + H, 'channels', info.channels);

const out = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const p = i * 3, q = i * 4;
  const r = data[p], g = data[p + 1], b = data[p + 2];
  out[q] = r; out[q + 1] = g; out[q + 2] = b;
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = Math.max(0, Math.min(1, (L - 10) / (52 - 10)));
  out[q + 3] = Math.round(255 * t * t * (3 - 2 * t)); // smoothstep
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .blur(0.5)
  .png({ palette: true, quality: 95, effort: 9 })
  .toFile(OUT);
console.log('written:', OUT);
