#!/usr/bin/env node
/**
 * 每日城市级来客快照：从 MapMyVisitors 读取各城市来客数与坐标，
 * 写入 src/data/cities.json（首页「访客星图」的城市光点直接消费）。
 *
 * 由 .github/workflows/visits.yml 每日调用；本地亦可手动运行：
 *   node scripts/snapshot-cities.mjs
 *
 * 数据接口（公开只读、无密钥；参数取自项目嵌入代码初始化时返回的配置）：
 *   https://mapmyvisitors.com/ajax/map?initial=true&user=0&id=<项目ID>&url=<站点URL>
 * 返回一段供其小部件 eval 的 JS，每处来客一条：
 *   _map.mapObject.addMarker('<hit-id>', { latLng: [lat, lng], name: "N recent visits from CITY" })
 * 注意：此接口只取数不计数；计数发生在访客浏览器加载 widget_call_home.js 时
 * （见 src/components/Analytics.astro 的信标），快照请求本身不会污染统计。
 *
 * 失败容错：接口不可达或格式变化时打警告后正常退出（保留旧数据），
 * 不阻塞同日的 GoatCounter 快照与提交。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 项目参数取自嵌入代码返回（widget_call_home.js 尾部 new Map 的实参）。
// 站点 URL 若变更（如加自定义域名），url 需同步更新。
const PROJECT = {
  id: '2250851',
  user: '0',
  url: '"https://logic61.github.io/--Page/"',
};
const PROFILE = 'https://mapmyvisitors.com/web/1c8rn';
const OUT = path.resolve('src/data/cities.json');

function apiUrl() {
  const u = new URL('https://mapmyvisitors.com/ajax/map');
  u.searchParams.set('last_hit_id', '');
  u.searchParams.set('initial_hit_id', '');
  u.searchParams.set('initial', 'true');
  u.searchParams.set('animate', 'true');
  u.searchParams.set('user', PROJECT.user);
  u.searchParams.set('url', PROJECT.url);
  u.searchParams.set('id', PROJECT.id);
  u.searchParams.set('mapType', 'widget');
  return u;
}

/** 从应答 JS 中解出各城市来客；找不到任何 addMarker 记录时返回 null（视为格式异常）。 */
function parseCities(js) {
  if (!js.includes('addMarker')) return null;
  const cities = new Map();
  for (const chunk of js.split('addMarker(').slice(1)) {
    const latLng = /latLng:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/.exec(chunk);
    // 城市显示名取未注释的那行 `name: "N recent visits from CITY"`；
    // 同一段里另有被 /* */ 注释的旧格式，行首锚定可避开
    const name = /^\s*name:\s*"([^"]+)"/m.exec(chunk);
    if (!latLng || !name) continue;
    const m =
      /^(\d+)\s+recent visits? from (.+?)[.\s]*$/i.exec(name[1]) ||
      /^(\d+)\s+visits? from (.+?)[.\s]*$/i.exec(name[1]);
    if (!m) continue;
    const city = m[2].trim();
    if (/unknown/i.test(city)) continue; // 无定位的来客（数据中心出口等），不上图
    const hits = Number(m[1]) || 0;
    const cur = cities.get(city);
    if (cur) cur.hits += hits;
    else cities.set(city, { name: city, lat: Number(latLng[1]), lng: Number(latLng[2]), hits });
  }
  return [...cities.values()].sort((a, b) => b.hits - a.hits);
}

async function readPrev() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let js;
  try {
    const res = await fetch(apiUrl(), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    js = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const cities = parseCities(js);
  if (cities === null) {
    console.log(`::warning::MapMyVisitors 应答不含预期的 addMarker 记录（${js.length} 字节），保留旧数据`);
    return;
  }

  const prev = await readPrev();
  if (cities.length === 0 && prev) {
    console.log(`MapMyVisitors 应答正常（${js.length} 字节），当前尚无带定位的来客，保留旧数据`);
    return;
  }
  if (prev && JSON.stringify(prev.cities) === JSON.stringify(cities)) {
    console.log(`数据无变化，不重写文件（${cities.length} 城）`);
    return;
  }

  await writeFile(
    OUT,
    JSON.stringify({ updated: new Date().toISOString(), source: PROFILE, cities }, null, 2) + '\n',
  );
  console.log(
    `已写入 ${OUT}：${cities.length} 城、${cities.reduce((n, c) => n + c.hits, 0)} 次到访` +
      (cities.length ? `（前五：${cities.slice(0, 5).map((c) => `${c.name} ${c.hits}`).join('、')}）` : ''),
  );
}

main().catch((err) => {
  console.log(`::warning::MapMyVisitors 快照失败（保留旧数据）：${err?.message ?? err}`);
});
