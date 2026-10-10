#!/usr/bin/env node
/**
 * 每日访问数据快照：从 GoatCounter 拉取各国来客数，写入 src/data/visits.json。
 *
 * 由 .github/workflows/visits.yml 每日调用；本地亦可手动运行：
 *   GOATCOUNTER_SITE=xxx GOATCOUNTER_TOKEN=... node scripts/snapshot-visits.mjs
 *
 * 输出结构（首页「访客星图」直接消费）：
 *   { updated, all: {visitors, views, countries:[{code,visitors,views}],
 *                    regions:[{code,name,visitors,views}]}, d30: {...} }
 * 位置码为 ISO-3166-2（国家为两位如 CN，地区形如 CN-SH）。
 * countries 按国家前缀聚合（旧口径不变）；regions 保留地区级条目——
 * GoatCounter 的 collect_regions 默认对美国/俄罗斯/中国采集到省州级
 * （settings.go 默认 ["US","RU","CN"]），首页「访客星图」据此点亮省州。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 站点代码取自 https://<代码>.goatcounter.com。这里容错归一化：允许填「logic」「LOGIC」，
// 也允许误填整条网址（如 https://logic.goatcounter.com/，从浏览器地址栏复制很常见）——
// 一律剥成站点代码再拼 API 域名；带路径/尾斜杠会让最终请求路径错位、GoatCounter 回 404。
const rawSite = (process.env.GOATCOUNTER_SITE || '').trim().toLowerCase();
const SITE = rawSite
  .replace(/^[a-z][a-z0-9+.-]*:\/\//, '') // 去协议
  .split('/')[0] // 去路径与结尾斜杠
  .replace(/\.goatcounter\.com$/, ''); // 去域名后缀
const TOKEN = (process.env.GOATCOUNTER_TOKEN || '').trim();
const OUT = path.resolve('src/data/visits.json');

const missing = [!SITE && 'GOATCOUNTER_SITE', !TOKEN && 'GOATCOUNTER_TOKEN'].filter(Boolean);
if (missing.length) {
  console.log(`::warning ::${missing.join(' / ')} 未配置，跳过快照（统计接入前属正常）`);
  process.exit(0);
}
if (rawSite !== SITE) console.log(`GOATCOUNTER_SITE 已归一化："${rawSite}" → "${SITE}"`);
if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(SITE)) {
  console.error(
    `::error ::GOATCOUNTER_SITE 不像站点代码（归一化后为 "${SITE}"）。应填 https://<代码>.goatcounter.com 里的 <代码>，如 logic。`,
  );
  process.exit(1);
}
console.log(`取数站点：https://${SITE}.goatcounter.com`);

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

async function fetchLocations(start) {
  const agg = new Map();
  const regions = new Map();
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
        // 错误页多为「<h1>Error 401</h1><p>error 401: …</p>」或 404 的
        // 「<h1>Not found</h1><p>This page doesn't exist.</p>」；
        // 先整段去掉 <style>/<script>，否则内联 css 会混进摘要
        const clean = text.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ');
        const pair = clean.match(/<h1[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
        msg =
          (pair ? `${pair[1]} — ${pair[2]}` : '') ||
          clean.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
          clean;
        msg = msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        msg = msg
          .replace(/&#39;|&#x27;/gi, "'")
          .replace(/&#34;|&quot;/gi, '"')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/g, '&');
      }
      const hint =
        res.status === 404 || res.status === 400
          ? '（多半是 GOATCOUNTER_SITE 填得不对：应填站点代码如 logic，而不是整条网址）'
          : '';
      throw new Error(`GoatCounter ${res.status}: ${msg.slice(0, 200)}${hint}`);
    }
    const body = await res.json();
    const stats = Array.isArray(body.stats) ? body.stats : [];
    for (const s of stats) {
      const code = String(s.id || s.name || '').toUpperCase();
      const m = /^([A-Z]{2})(?:$|-)/.exec(code);
      if (!m) continue;
      const views = Number(s.count) || 0;
      const visitors = Number(s.count_unique ?? s.countUnique ?? 0) || views;
      const cur = agg.get(m[1]) ?? { visitors: 0, views: 0 };
      cur.views += views;
      cur.visitors += visitors;
      agg.set(m[1], cur);
      if (code.includes('-')) {
        // 地区级条目（如 CN-SH、US-TX）：单独留档，供首页点亮省州
        const r = regions.get(code) ?? { name: String(s.name ?? ''), visitors: 0, views: 0 };
        r.views += views;
        r.visitors += visitors;
        regions.set(code, r);
      }
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
    regions: [...regions.entries()]
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.visitors - a.visitors || b.views - a.views),
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
if (all.regions.length) {
  console.log(
    `省州级位置 ${all.regions.length} 条：` +
      all.regions.slice(0, 20).map((r) => `${r.code}(${r.name}·${r.visitors})`).join('、'),
  );
} else {
  console.log('未取得省州级位置（collect_regions 未覆盖或尚无对应来客）');
}
