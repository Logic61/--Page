#!/usr/bin/env node
/**
 * 构建后 SEO 产物生成器（在 `astro build` 之后运行）
 *
 * 产出两个文件到 dist/：
 *   1. sitemap.xml —— 收录全部可索引页面。
 *      自动跳过带 <meta name="robots" content="noindex"> 的页面
 *      （/zhoufa/chuancheng、/zhoufa/tixi、/zhoufa/wenzhang/* 等旧地址跳转桩）。
 *   2. robots.txt  —— 允许全站抓取，并声明 sitemap 地址。
 *
 * 地址来源：
 *   SITE_URL   默认 https://logic61.github.io   （换自定义域名时改这里）
 *   BASE_PATH  默认 /                           （GitHub Pages 部署时 workflow 注入 /--Page）
 *
 * 两个文件都按 base 前缀生成，本地 base=/ 与线上 base=/--Page 各自得到正确的绝对地址。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const SITE = (process.env.SITE_URL || 'https://logic61.github.io').replace(/\/+$/, '');
const BASE = (process.env.BASE_PATH || '/').replace(/\/+$/, ''); // '/--Page' 或 ''

if (!existsSync(DIST)) {
  console.error('[gen-seo] 找不到 dist/，请先执行 astro build');
  process.exit(1);
}

/** 命中即视为「不要收录」：Astro 静态重定向桩用的就是 noindex */
const NOINDEX_RE = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const lastmod = new Date().toISOString().slice(0, 10);
const entries = [];
let skipped = 0;

for (const file of await walk(DIST)) {
  if (!file.endsWith('.html')) continue;
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  // 静态站点只有目录式页面：index.html 与 xxx/index.html
  if (rel !== 'index.html' && !rel.endsWith('/index.html')) continue;

  const html = await readFile(file, 'utf8');
  if (NOINDEX_RE.test(html)) {
    skipped++;
    continue;
  }

  const dir = rel === 'index.html' ? '' : rel.slice(0, -'index.html'.length);
  // encodeURI 保留 / 与 : ，只把非 ASCII 转义，保证 sitemap 是合法 URI
  entries.push({ loc: encodeURI(`${SITE}${BASE}/${dir}`), lastmod });
}

entries.sort((a, b) => a.loc.localeCompare(b.loc));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`),
  '</urlset>',
  '',
].join('\n');

await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

// robots.txt 只有放在**主机根目录**（https://logic61.github.io/robots.txt）才会被爬虫读取。
// 这里照样生成一份：一来 /--Page/ 下有一份便于自检，二来可以直接复制到
// logic61.github.io 根站点仓库的 public/ 里，让 Sitemap 指令真正生效。
const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${SITE}${BASE}/sitemap.xml`,
  '',
].join('\n');

await writeFile(path.join(DIST, 'robots.txt'), robots, 'utf8');

console.log(`[gen-seo] sitemap.xml：收录 ${entries.length} 个页面，跳过 ${skipped} 个 noindex 页面`);
console.log(`[gen-seo] robots.txt：Sitemap -> ${SITE}${BASE}/sitemap.xml`);
