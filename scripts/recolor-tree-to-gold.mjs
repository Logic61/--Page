// 把 树的 PNG 重新着色为与法阵符文环同色相（HSL hue=45° gold）的金。
//
// 之前两版都错了：
//   v1: t = luma/255 → 24.6% 的 luma<15 像素变近黑，与亮金阵纹反差极大
//   v2: t = 0.7 + 0.3*... → 暗部被抬到 75% 金，丢了全部明暗梯度 → 树扁平
// 正确做法：转 HSL，锁死色相到目标金 (hue=45°, sat=0.9)，但保留原亮度 L 作为梯度。
//
// 效果：
//   - 树亮部 L≈0.7 → rgb(~249, ~204, ~85) → 叠同 filter 后 ≈ 符文环 rgb(208,194,137) ✓
//   - 树暗部 L≈0.15 → rgb(~106, ~87, ~37) → 叠同 filter 后 ≈ 暗焦金，与阵纹暗金同色族 ✓
//   - 树体本身的"焦褐→亮金"梯度完整保留 → 像参考图那样树与法阵一片金。
//
// L 下限取 0.08：避免极暗像素变纯黑（仍保留深焦褐感）。
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', '分支图-final.png');
const out = path.join(root, 'public', '分支图-final-gold.png');

// 法阵符文环色相与饱和度（源色 #fce18c → HSL ≈ 45.5°, 95%, 77%）
const TARGET_HUE_DEG = 45;
const TARGET_SAT = 0.7;
// 暗部下限：避免 L=0 像素 → 纯黑（仍保留深焦褐感，与阵纹最暗处协调）
const L_FLOOR = 0.08;
// 整体亮度偏置：之前 L_BIAS=+0.1 让树比原 PNG 还亮，视觉上跳出法阵 → 改 -0.05，
// 让树高光略低于原图，整体回到"暗金"状态，与法阵结构层亮度对齐。
const L_BIAS = -0.05;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h, s, l = (mx + mn) / 2;
  if (mx === mn) { h = s = 0; }
  else {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

const img = sharp(src);
const meta = await img.metadata();
const { width: w, height: h, channels: c } = meta;
if (c !== 4) throw new Error('expected RGBA, got channels=' + c);
const raw = await img.clone().raw().toBuffer();

const outBuf = Buffer.alloc(raw.length);
const targetHue = TARGET_HUE_DEG / 360;
for (let i = 0; i < w * h; i++) {
  const p = i * 4;
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const a = raw[p + 3];
  // 灰度像素（r=g=b）：保留为灰，不强行染色（保持极暗阴影的自然暗金感）
  if (Math.abs(r - g) < 2 && Math.abs(g - b) < 2) {
    // 仍按目标色相的灰度拉伸：金度 L 但保留原灰度值 → 避免饱和色出现在阴影里
    const gray = Math.min(0.85, Math.max(0, r / 255 + L_BIAS));
    const [nr, ng, nb] = hslToRgb(targetHue, TARGET_SAT, Math.max(L_FLOOR, gray));
    outBuf[p]     = Math.round(nr);
    outBuf[p + 1] = Math.round(ng);
    outBuf[p + 2] = Math.round(nb);
  } else {
    const [, , light] = rgbToHsl(r, g, b);
    const newL = Math.min(0.85, Math.max(L_FLOOR, light + L_BIAS));
    const [nr, ng, nb] = hslToRgb(targetHue, TARGET_SAT, newL);
    outBuf[p]     = Math.round(nr);
    outBuf[p + 1] = Math.round(ng);
    outBuf[p + 2] = Math.round(nb);
  }
  outBuf[p + 3] = a; // alpha 原样保留
}
await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(out);
console.log('written:', out, `(${w}x${h})`);
