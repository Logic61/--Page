// 由 巫/分支图-7.png（1667×2515 黑底压平导出，带"AI生成/豆包AI生成"水印）
// 生成真透明贴图 public/巫/分支图-7.png。
// 背景：-7 的透明信息被压平成了 PS 棋盘格纹理（两档中性灰 ~rgb(46,46,42)/rgb(62,62,58)），
// 金色主体全部为饱和暖金；两处水印为低饱和浅色元素（左上药丸标签含深暖灰底板）。
// 管线：
//   1) 背景洪泛：从边界洪泛与棋盘两色曼哈顿距离 <30 的连通像素；
//   2) 键控：非背景像素 alpha = smoothstep(S, 0.08, 0.18)——只保留饱和金，
//      白字/浅灰边的水印与暗色缝隙一并归零（藤蔓镂空是 -7 设计特征）;
//   3) 左上角 (0,0)-(380,230) 显式清零：清除"AI生成"药丸底板（深暖灰、S 偏高无法被键控）；
//      右下"豆包AI生成"为纯白文字，步骤 2 已自动去除；
//   4) alpha 0.6px 羽化；PNG 调色板量化 q95 输出（4450KB → 1112KB，
//      压平后逐像素差异仅 2.2%@阈值6，为抖动级色差）。
// 用法: node scripts/gen-v7-alpha.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '巫', '分支图-7.png');
const OUT = path.join(root, 'public', '巫', '分支图-7.png');

const meta = await sharp(SRC).metadata();
const W = meta.width, H = meta.height, N = W * H;
const raw = await sharp(SRC).removeAlpha().raw().toBuffer();

const DARK = [47, 47, 43], LIGHT = [62, 62, 58];
const nearChecker = (i) => {
  const p = i * 3;
  const d1 = Math.abs(raw[p] - DARK[0]) + Math.abs(raw[p + 1] - DARK[1]) + Math.abs(raw[p + 2] - DARK[2]);
  const d2 = Math.abs(raw[p] - LIGHT[0]) + Math.abs(raw[p + 1] - LIGHT[1]) + Math.abs(raw[p + 2] - LIGHT[2]);
  return Math.min(d1, d2) < 30;
};

// 1) flood from borders
const bg = new Uint8Array(N);
const q = new Int32Array(N); let head = 0, tail = 0;
for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = y * W + x; if (nearChecker(i) && !bg[i]) { bg[i] = 1; q[tail++] = i; } }
for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const i = y * W + x; if (nearChecker(i) && !bg[i]) { bg[i] = 1; q[tail++] = i; } }
while (head < tail) {
  const cur = q[head++], x = cur % W, y = (cur / W) | 0;
  for (const nb of [x > 0 ? cur - 1 : -1, x < W - 1 ? cur + 1 : -1, y > 0 ? cur - W : -1, y < H - 1 ? cur + W : -1]) {
    if (nb < 0) continue;
    if (!bg[nb] && nearChecker(nb)) { bg[nb] = 1; q[tail++] = nb; }
  }
}

// 2-3) compose alpha
const out = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const p = i * 3, q4 = i * 4;
  out[q4] = raw[p]; out[q4 + 1] = raw[p + 1]; out[q4 + 2] = raw[p + 2];
  if (bg[i]) { out[q4 + 3] = 0; continue; }
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const S = mx === 0 ? 0 : (mx - mn) / mx;
  out[q4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (S - 0.08) / (0.18 - 0.08))));
}
// 左上水印药丸底板显式清零
for (let y = 0; y < 230; y++) for (let x = 0; x < 380; x++) out[(y * W + x) * 4 + 3] = 0;

// 4) feather + palette output
await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .blur(0.6)
  .png({ palette: true, quality: 95, effort: 9 })
  .toFile(OUT);
console.log('written:', OUT);
