// 由 巫/分支图-9.png（1024×1536 真 alpha 树贴图，暖金偏亮版）生成 four-veins 页用的贴图
// public/巫/分支图-9.png。与 -7/-8 管线一致：alpha 0.5px 羽化收边 + 调色板量化。
// 用法: node scripts/gen-v9-alpha.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, '巫', '分支图-9.png');
const OUT = path.join(root, 'public', '巫', '分支图-9.png');

const meta = await sharp(SRC).metadata();
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
console.log('source:', info.width + 'x' + info.height, 'channels', info.channels);

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .blur(0.5)
  .png({ palette: true, quality: 95, effort: 9 })
  .toFile(OUT);
console.log('written:', OUT);
