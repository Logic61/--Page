// 由 分支图-2.png 生成“树体蒙版”（public/分支图-2-mask.png）。
// 用途：把同一张海报的树体/节点图标以正常混合重新叠回法阵之上，
//       让树真正压在法阵线条上方；黑色背景被蒙版滤掉，
//       法阵仍是海报（含树）的“背光”，而不是整张盖住树。
// 生成策略：
//   1) 候选像素 = 暖金高饱和亮部（luma>=8 且 sat>=0.68），与深褐底纹尽量区分；
//   2) 连通域过滤：只保留最大的树主体，以及四个分支节点图标 + 顶部徽章
//      所在区域内的成规模连通域，滤掉散碎的底纹亮点；
//   3) 填洞（从边缘洪泛）把树干内部的暗纹缝隙补实；
//   4) 小半径膨胀覆盖树边缘的抗锯齿过渡，最后羽化收边。
// 说明：本脚本只在本机重新生成蒙版时运行；生成结果已提交进 public/，
//       构建/部署不依赖 sharp，因此不写进 dev/build 流程。
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', '分支图-2.png');
const out = path.join(root, 'public', '分支图-2-mask.png');
const preview = path.join(root, '.qa', 'tree-mask-preview.png');

const img = sharp(src);
const meta = await img.metadata();
const { width: w, height: h } = meta;
const raw = await img.clone().raw().toBuffer(); // RGB

// 1) 候选二值
const bin = new Uint8Array(w * h);
for (let i = 0, p = 0; i < w * h; i++, p += 3) {
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  bin[i] = luma >= 8 && sat >= 0.68 ? 1 : 0;
}

// 2) 连通域
function labelComponents(srcBin) {
  const label = new Int32Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  const comps = [];
  for (let start = 0; start < w * h; start++) {
    if (srcBin[start] === 0 || label[start] !== -1) continue;
    const id = comps.length;
    let head = 0, tail = 0, size = 0;
    let minx = w, maxx = 0, miny = h, maxy = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const cur = queue[head++];
      size++;
      const x = cur % w, y = (cur / w) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      const nb = [
        x > 0 ? cur - 1 : -1,
        x < w - 1 ? cur + 1 : -1,
        y > 0 ? cur - w : -1,
        y < h - 1 ? cur + w : -1,
      ];
      for (const n of nb) {
        if (n >= 0 && srcBin[n] === 1 && label[n] === -1) {
          label[n] = id;
          queue[tail++] = n;
        }
      }
    }
    comps.push({ id, size, minx, miny, maxx, maxy });
  }
  return { label, comps };
}

const { label, comps } = labelComponents(bin);
comps.sort((a, b) => b.size - a.size);

// 需要保留的“实体区”（图片像素坐标，已外扩 20px）：
// 四个分支节点图标 + 顶部徽章（树主体由最大连通域覆盖）
const keepZones = [
  { x1: 170, y1: 280, x2: 320, y2: 400 }, // 左上节点（法门）
  { x1: 700, y1: 90, x2: 1030, y2: 340 }, // 右上节点（修炼常识）
  { x1: 150, y1: 620, x2: 320, y2: 770 }, // 左下节点（秘闻）
  { x1: 780, y1: 630, x2: 1000, y2: 790 }, // 右下节点（闲文）
  { x1: 200, y1: 40, x2: 860, y2: 240 }, // 顶部徽章
  { x1: 425, y1: 1175, x2: 705, y2: 1405 }, // 树根底座
];
const overlap = (c, z) => {
  const ox = Math.max(0, Math.min(c.maxx, z.x2) - Math.max(c.minx, z.x1));
  const oy = Math.max(0, Math.min(c.maxy, z.y2) - Math.max(c.miny, z.y1));
  return ox * oy;
};
const zoneArea = (z) => (z.x2 - z.x1) * (z.y2 - z.y1);

const keep = new Set();
keep.add(comps[0].id); // 最大连通域 = 树主体
for (const c of comps.slice(1)) {
  if (c.size < 60) continue; // 滤掉零散噪点
  for (const z of keepZones) {
    if (overlap(c, z) / zoneArea(z) >= 0.03) {
      keep.add(c.id);
      break;
    }
  }
}
const keptIds = comps.filter((c) => keep.has(c.id)).sort((a, b) => b.size - a.size);
console.log('kept components:', keptIds.map((c) => c.size).join(','));
console.log('kept boxes:', keptIds.map((c) => `${c.minx},${c.miny}-${c.maxx},${c.maxy}`).join(' | '));

const kept = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) if (label[i] !== -1 && keep.has(label[i])) kept[i] = 1;

// 3) 填洞：凡是不与图片边缘连通的“0”都被视为树体内部暗纹 → 填成 1
function fillHoles(srcBin) {
  const outer = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) if (srcBin[y * w + x] === 0 && outer[y * w + x] === 0) { outer[y * w + x] = 1; queue[tail++] = y * w + x; }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) if (srcBin[y * w + x] === 0 && outer[y * w + x] === 0) { outer[y * w + x] = 1; queue[tail++] = y * w + x; }
  }
  while (head < tail) {
    const cur = queue[head++];
    const x = cur % w, y = (cur / w) | 0;
    const nb = [
      x > 0 ? cur - 1 : -1,
      x < w - 1 ? cur + 1 : -1,
      y > 0 ? cur - w : -1,
      y < h - 1 ? cur + w : -1,
    ];
    for (const n of nb) {
      if (n >= 0 && srcBin[n] === 0 && outer[n] === 0) {
        outer[n] = 1;
        queue[tail++] = n;
      }
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = srcBin[i] === 1 || outer[i] === 0 ? 1 : 0;
  return out;
}
// 先把保留的实体小幅膨胀（合并紧贴的枝梢/图标碎片），再填洞补实
const merged = morph(kept, 'dilate', 4);
const filled = fillHoles(merged);

// 4) 方形结构元：dilate=或、erode=与（行列分离）
function morph(srcBin, mode, r) {
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = mode === 'dilate' ? 0 : 1;
      for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
        const v = srcBin[y * w + xx];
        if (mode === 'dilate') { if (v) { found = 1; break; } }
        else if (!v) { found = 0; break; }
      }
      tmp[y * w + x] = found;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let found = mode === 'dilate' ? 0 : 1;
      for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) {
        const v = tmp[yy * w + x];
        if (mode === 'dilate') { if (v) { found = 1; break; } }
        else if (!v) { found = 0; break; }
      }
      out[y * w + x] = found;
    }
  }
  return out;
}
// 已在上一步膨胀合并，这里不再额外膨胀，直接羽化收边
const dilated = filled;

// 5) 组装 RGBA（RGB 全白，alpha=蒙版）并羽化
const rgba = new Uint8Array(w * h * 4);
for (let i = 0; i < w * h; i++) {
  rgba[i * 4] = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = dilated[i] * 255;
}
const maskSharp = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
await maskSharp.clone().blur(0.7).png({ compressionLevel: 9 }).toFile(out);
// 预览：把蒙版叠到中灰底上，方便肉眼核对轮廓
await sharp({ create: { width: w, height: h, channels: 4, background: { r: 60, g: 60, b: 60, alpha: 1 } } })
  .composite([{ input: await maskSharp.clone().png().toBuffer(), blend: 'over' }])
  .png()
  .toFile(preview);
console.log('mask written:', out);
console.log('preview written:', preview);
