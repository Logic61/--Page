// 雷纹素材 → 金色符文（240x240 透明底 PNG）
// 用法：node scripts/gen-leiwen.mjs [起始编号] [结束编号]  默认 1..16
// 流程：原图灰度 → Otsu 阈值 → 边框像素判定背景极性（亮纹暗底/暗纹亮底自适应）
//       → 软阈值生成 alpha → 裁剪内容包围盒 → 等比缩放居中到 240x240 透明画布
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '巫', '雷纹');
const OUT = path.join(root, 'public', 'leiwen');
const SIZE = 240;
const MARGIN = 0.94; // 内容占画布比例

const start = Number(process.argv[2] ?? 1);
const end = Number(process.argv[3] ?? 16);

// 鎏金：与 four-veins 中心树贴图（分支图-3-alpha.png）亮部（luma 前 10%）像素均值一致 #deb463；
// 页面端 .a-rune 采用与树 .map-img 完全相同的滤镜链
// （sepia(0.28) hue-rotate(8deg) saturate(1.4) brightness(1.05)），
// 同源色 + 同滤镜 → 符文渲染色与树亮金像素级一致（渲染后 ≈ #e4cc78）。
const GOLD = { r: 222, g: 180, b: 99 };

const otsu = (hist, total) => {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  return thr;
};

async function convert(n) {
  // 1) 原图灰度原始像素；先做轻度高斯模糊抹掉扫描/打印/低分辨率源里的颗粒噪点，
  //    让 Otsu 阈值能把"同一个笔画"的灰阶聚合到一起（避免稀疏小图被切成零散点阵）
  let srcPath = path.join(SRC, `${n}.png`);
  try { await sharp(srcPath).metadata(); }
  catch { srcPath = path.join(SRC, `${n}.jpg`); }
  const { data, info } = await sharp(srcPath)
    .grayscale()
    .blur(1.8)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, total = w * h;

  // 2) Otsu 全局阈值
  const hist = new Array(256).fill(0);
  for (let i = 0; i < total; i++) hist[data[i]]++;
  const thr = otsu(hist, total);

  // 3) 极性：背景通常接触图像边缘
  let borderBright = 0, borderN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > 1 && x < w - 2 && y > 1 && y < h - 2) continue;
      borderN++;
      if (data[y * w + x] > thr) borderBright++;
    }
  }
  const bgIsBright = borderBright / borderN > 0.5;
  const fgScore = (v) => (bgIsBright ? thr - v : v - thr); // 越大越像前景

  // 4) 软阈值 → alpha（保留笔画内部纹理层次）
  let mean = 0;
  for (let i = 0; i < total; i++) mean += data[i];
  mean /= total;
  let varSum = 0;
  for (let i = 0; i < total; i++) varSum += (data[i] - mean) ** 2;
  const soft = Math.max(8, Math.min(36, Math.sqrt(varSum / total) * 0.35));

  const alpha = new Uint8Array(total);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = fgScore(data[y * w + x]);
      let a = (s + soft) / (2 * soft);
      // 阈值底抬到 0.12：防止笔画内部偏暗的像素被切到 0 形成「黑洞」
      // （闪电这种笔画粗短的素材容易在内部留 a≈0 的区域）
      a = Math.max(0.12, Math.min(1, (a - 0.4) / 0.45));
      const v = Math.round(a * 255);
      alpha[y * w + x] = v;
      if (v > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('未检测到前景');

  // 5) 裁剪内容 → 金色 RGBA
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (y + minY) * w + (x + minX);
      crop[(y * cw + x) * 4] = GOLD.r;
      crop[(y * cw + x) * 4 + 1] = GOLD.g;
      crop[(y * cw + x) * 4 + 2] = GOLD.b;
      crop[(y * cw + x) * 4 + 3] = alpha[si];
    }
  }

  // 6) 等比缩放进 240x240 居中透明画布
  const inner = Math.round(SIZE * MARGIN);
  await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.floor((SIZE - inner) / 2), bottom: Math.ceil((SIZE - inner) / 2),
      left: Math.floor((SIZE - inner) / 2), right: Math.ceil((SIZE - inner) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(OUT, `${n}-gold.png`));

  console.log(`${n}-gold.png ✓ (${w}x${h} → ${cw}x${ch} 裁边, ${bgIsBright ? '暗纹亮底' : '亮纹暗底'}, thr=${thr})`);
}

for (let n = start; n <= end; n++) {
  try { await convert(n); }
  catch (e) { console.error(`${n} 失败: ${e.message}`); }
}
