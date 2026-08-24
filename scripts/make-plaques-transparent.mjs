// 分支图-4 铭牌底板处理：黑底 → 半透明深色底板（保留金字与金色描边）。
// 完全透明时金字直接压在亮金阵纹上看不清，故底板保留约 60% 不透明黑，
// 既透出法阵纹路，又保证金字对比度。
// 用法: node scripts/make-plaques-transparent.mjs [alpha]  (alpha 默认 150, 0=全透明)
import sharp from 'sharp';
import fs from 'node:fs';

const ALPHA = Number(process.argv[2] ?? 150);
const SRC = 'public/分支图-4.png';
const BACKUP = '.qa/分支图-4-orig.png';

if (!fs.existsSync(BACKUP)) {
  console.error('缺少原图备份', BACKUP);
  process.exit(1);
}

// 从备份原图（不透明黑底）重新生成
const { data, info } = await sharp(BACKUP).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
if (C !== 4) throw new Error('expected RGBA, got channels=' + C);

// 四块铭牌（像素实测，原图 1024×1536）：左列 x≈88-309，右列 x≈716-937，上排 y≈623-693，下排 y≈1059-1128
const boxes = {
  famen:    [88, 623, 309, 693],
  changshi: [716, 624, 938, 693],
  miwen:    [88, 1059, 309, 1128],
  xianwen:  [715, 1059, 937, 1128],
};

let plate = 0, kept = 0;
for (const [x1, y1, x2, y2] of Object.values(boxes)) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const i = (y * W + x) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const m = Math.max(r, g, b), mn = Math.min(r, g, b);
      // 深色铭牌底板：纯黑/近黑，或低饱和暗棕（金字 AA 边缘带明显色差，予以保留）
      const isPlate = m < 45 || (m < 90 && (m - mn) < 30);
      if (isPlate && data[i + 3] > 0) { data[i + 3] = ALPHA; plate++; }
      else kept++;
    }
  }
}

await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
  .png({ compressionLevel: 9 })
  .toFile(SRC);
console.log('done: plate pixels -> alpha', ALPHA, '(', plate, ') kept', kept);
