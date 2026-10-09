#!/usr/bin/env node
/**
 * 每日访问数据快照：从 GoatCounter 拉取各国来客数，写入 src/data/visits.json。
 *
 * 由 .github/workflows/visits.yml 每日调用；本地亦可手动运行：
 *   GOATCOUNTER_SITE=xxx GOATCOUNTER_TOKEN=... node scripts/snapshot-visits.mjs
 *
 * 输出结构（首页「访客星图」直接消费）：
 *   { updated, all: {visitors, views, countries:[{code,visitors,views}]}, d30: {...} }
 * 位置码为 ISO-3166-2（国家为两位如 CN，地区形如 CN-SH），这里按国家聚合。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 站点代码统一转小写（GoatCounter 主机名大小写不敏感，但保持一致更稳）
const SITE = (process.env.GOATCOUNTER_SITE || '').trim().toLowerCase();
const TOKEN = (process.env.GOATCOUNTER_TOKEN || '').trim();
const OUT = path.resolve('src/data/visits.json');

const missing = [!SITE && 'GOATCOUNTER_SITE', !TOKEN && 'GOATCOUNTER_TOKEN'].filter(Boolean);
if (missing.length) {
  console.log(`::warning ::${missing.join(' / ')} 未配置，跳过快照（统计接入前属正常）`);
  process.exit(0);
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

async function fetchLocations(start) {
  const agg = new Map();
  let offset = 0;
  for (;;) {
    const url = new URL(`https://${SITE}.goatcounter.com/api/v0/stats/locations`);
    url.searchParams.set('start', start);
    url.searchParams.set('limit', '200');
    url.searchParams.set('offset', String(offset));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) {
      // 失败时多为 HTML 错误页（如 token 缺 "Read statistics" 权限的 403），
      // 提取可读信息再抛出，方便在 Actions 日志里直接看到原因
      const text = await res.text();
      let msg = '';
      try {
        msg = JSON.parse(text).error || '';
      } catch {}
      if (!msg) {
        const paras = [...text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
        msg = paras.find((p) => /error|permission/i.test(p)) || text;
        msg = msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        msg = msg
          .replace(/&#3[49];|&#x27;/gi, "'")
          .replace(/&quot;/gi, '"')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&');
      }
      throw new Error(`GoatCounter ${res.status}: ${msg.slice(0, 200)}`);
    }
    const body = await res.json();
    const stats = Array.isArray(body.stats) ? body.stats : [];
    for (const s of stats) {
      const m = /^([A-Z]{2})(?:$|-)/.exec(String(s.id || s.name || '').toUpperCase());
      if (!m) continue;
      const views = Number(s.count) || 0;
      const visitors = Number(s.count_unique ?? s.countUnique ?? 0) || views;
      const cur = agg.get(m[1]) ?? { visitors: 0, views: 0 };
      cur.views += views;
      cur.visitors += visitors;
      agg.set(m[1], cur);
    }
    if (!body.more || stats.length === 0) break;
    offset += stats.length;
    if (offset > 5000) break;
  }
  const countries = [...agg.entries()]
    .map(([code, v]) => ({ code, visitors: v.visitors, views: v.views }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views);
  return {
    visitors: countries.reduce((n, c) => n + c.visitors, 0),
    views: countries.reduce((n, c) => n + c.views, 0),
    countries,
  };
}

const all = await fetchLocations('2000-01-01');
const d30 = await fetchLocations(daysAgo(29));

let prev = null;
try {
  prev = JSON.parse(await readFile(OUT, 'utf8'));
} catch {}
if (prev && JSON.stringify(prev.all) === JSON.stringify(all) && JSON.stringify(prev.d30) === JSON.stringify(d30)) {
  console.log('数据无变化，不重写文件');
  process.exit(0);
}

await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), all, d30 }, null, 2) + '\n');
console.log(`已写入 ${OUT}：全部 ${all.visitors} 人 / ${all.countries.length} 地；近三十日 ${d30.visitors} 人`);
