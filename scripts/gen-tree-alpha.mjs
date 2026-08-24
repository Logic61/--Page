// 由 分支图-3.png 生成“真透明树贴图”（public/分支图-3-alpha.png）。
// 用途：four-veins 页改为「法阵在下层、树在上层」的稳定图层结构，
//       树贴图必须有真实 alpha：
//         1) 树主体剪影（含内部暗纹缝隙填实）→ 不透明，正常遮挡阵纹；
//         2) 四个分支节点圆盘（法门/修炼常识/秘闻/闲文 图标背后的黑盘）
//            → 改按亮度键控，金色纹样保留、黑盘变全透明，阵纹可透出；
//         3) 其余海报暗背景 → 全透明。
// 生成策略：
//   A. 候选像素 = 暖金高饱和亮部（luma>=8 且 sat>=0.68），与深褐底纹区分；
//   B. 连通域过滤：保留最大树主体 + 节点/徽章/底座区域内的成规模连通域；
//   C. 膨胀合并 + 洪泛填洞 → 树体剪影 S；
//   D. 四个节点圆盘内：alpha 改为亮度键控（软混合边界），
//      金纹 luma 高保留不透明，黑盘 luma 低归零透明；
//   E. alpha 轻微羽化收边。
// 说明：本脚本只在本机重新生成贴图时运行；生成结果已提交进 public/，
//       构建/部署不依赖 sharp，因此不写进 dev/build 流程。
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public', '分支图-3.png');
const out = path.join(root, 'public', '分支图-3-alpha.png');
const preview = path.join(root, '.qa', 'tree-alpha-preview.png');

const img = sharp(src);
const meta = await img.metadata();
const { width: w, height: h } = meta;
const raw = await img.clone().raw().toBuffer(); // RGB

// A) 候选二值
// 阈值标定：luma>=8 会把整张海报的暗金底纹连成一大片（最大域占 31.7%），
// luma>=16 才是树体本身（最大域约 6.3%），故取 16。
const LUMA_T = 16;
const bin = new Uint8Array(w * h);
for (let i = 0, p = 0; i < w * h; i++, p += 3) {
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  bin[i] = luma >= LUMA_T && sat >= 0.68 ? 1 : 0;
}

// B) 连通域
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

// 需要保留的“实体区”（图片像素坐标）：四个节点 + 顶部徽章 + 树根底座
const keepZones = [
  { x1: 140, y1: 470, x2: 400, y2: 660 },   // 法门
  { x1: 690, y1: 460, x2: 880, y2: 600 },   // 修炼常识
  { x1: 190, y1: 840, x2: 360, y2: 1010 },  // 秘闻
  { x1: 765, y1: 810, x2: 935, y2: 980 },   // 闲文
  { x1: 200, y1: 30, x2: 860, y2: 260 },    // 顶部徽章
  { x1: 400, y1: 1150, x2: 720, y2: 1440 }, // 树根底座
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
  if (c.size < 60) continue;
  for (const z of keepZones) {
    if (overlap(c, z) / zoneArea(z) >= 0.03) {
      keep.add(c.id);
      break;
    }
  }
}
console.log('kept components:', comps.filter((c) => keep.has(c.id)).length);

const kept = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) if (label[i] !== -1 && keep.has(label[i])) kept[i] = 1;

// 方形结构元：dilate=或、erode=与（行列分离）
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
  const outB = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let found = mode === 'dilate' ? 0 : 1;
      for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) {
        const v = tmp[yy * w + x];
        if (mode === 'dilate') { if (v) { found = 1; break; } }
        else if (!v) { found = 0; break; }
      }
      outB[y * w + x] = found;
    }
  }
  return outB;
}

// C) 填洞：凡是不与图片边缘连通的“0”都视为树体内部暗纹 → 填成 1
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
  const outB = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) outB[i] = srcBin[i] === 1 || outer[i] === 0 ? 1 : 0;
  return outB;
}

const merged = morph(kept, 'dilate', 4);
const silhouette = fillHoles(merged);

// D) 键控区域：alpha 改按亮度键控（黑底→透明，金纹→不透明）
// 四个节点圆盘 + 顶部巫字徽章（徽章内巫字笔画细碎，连通域/填洞易误伤，
// 直接亮度键控最稳：亮金保留、暗底透光）
const discs = [
  { cx: 305, cy: 557, r: 100 },  // 法门
  { cx: 772, cy: 508, r: 88 },   // 修炼常识（避开下方标签文字）
  { cx: 277, cy: 925, r: 100 },  // 秘闻
  { cx: 847, cy: 895, r: 100 },  // 闲文
  { cx: 530, cy: 242, r: 122 },  // 顶部巫字徽章
];

// 文字标签保护矩形：标签笔画细、不一定能进树体剪影，
// 若落在圆盘键控羽化带内会被半透明化。矩形内按宽松亮度键控取 max：
// 金色笔画（luma 64+）强制不透明，暗底（luma 18-）不受影响仍透明。
const labelRects = [
  { x1: 240, y1: 575, x2: 400, y2: 650 },  // 法门
  { x1: 660, y1: 550, x2: 930, y2: 630 },  // 修炼常识
  { x1: 70,  y1: 910, x2: 185, y2: 985 },  // 秘闻
  { x1: 880, y1: 845, x2: 1000, y2: 920 }, // 闲文
];
const xOf = (i) => i % w;
const yOf = (i) => (i / w) | 0;
const discFeather = new Float32Array(w * h); // 0..1 圆盘权重（软边）
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    let m = 0;
    for (const d of discs) {
      const dx = x - d.cx, dy = y - d.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 半径内全权、外扩 14px 线性衰减到 0
      if (dist <= d.r) { m = 1; break; }
      if (dist <= d.r + 14) m = Math.max(m, 1 - (dist - d.r) / 14);
    }
    discFeather[y * w + x] = m;
  }
}

// E) 组装 RGBA
// 键控曲线：luma 24 以下全透明，84 以上全不透明，中间线性过渡
const rgba = new Uint8Array(w * h * 4);
for (let i = 0, p = 0, q = 0; i < w * h; i++, p += 3, q += 4) {
  const r = raw[p], g = raw[p + 1], b = raw[p + 2];
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const keyed = Math.max(0, Math.min(1, (luma - 24) / (84 - 24)));
  const sil = silhouette[i];
  let a = sil * (1 - discFeather[i]) + keyed * discFeather[i];
  // 标签保护：矩形内宽松键控（luma 18→64 过渡）与当前 alpha 取 max
  if (labelRects.some((z) => xOf(i) >= z.x1 && xOf(i) <= z.x2 && yOf(i) >= z.y1 && yOf(i) <= z.y2)) {
    const kg = Math.max(0, Math.min(1, (luma - 18) / (64 - 18)));
    a = Math.max(a, kg);
  }
  rgba[q] = r;
  rgba[q + 1] = g;
  rgba[q + 2] = b;
  rgba[q + 3] = Math.round(a * 255);
}
const alphaSharp = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
await alphaSharp.clone().blur(0.7).png({ compressionLevel: 9 }).toFile(out);

// 预览：叠在中灰底上核对轮廓与透出效果
await sharp({ create: { width: w, height: h, channels: 4, background: { r: 40, g: 34, b: 22, alpha: 1 } } })
  .composite([{ input: await alphaSharp.clone().blur(0.7).png().toBuffer(), blend: 'over' }])
  .png()
  .toFile(preview);
console.log('alpha written:', out);
console.log('preview written:', preview);
