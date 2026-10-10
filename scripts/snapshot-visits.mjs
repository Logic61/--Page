#!/usr/bin/env node
/**
 * 每日访问数据快照：从 GoatCounter 拉取各国来客数与省州级明细，写入 src/data/visits.json。
 *
 * 由 .github/workflows/visits.yml 每日调用；本地亦可手动运行：
 *   GOATCOUNTER_SITE=xxx GOATCOUNTER_TOKEN=... node scripts/snapshot-visits.mjs
 *
 * 输出结构（首页「访客星图」直接消费）：
 *   { updated, all: {visitors, views,
 *                    countries:[{code,visitors,views}],
 *                    regions:[{country,name,views}]}, d30: {...} }
 * countries 由国家列表接口得到，code 为两字母国家码；regions 是逐国下钻的省州
 * 明细——国家级列表的 SQL 会把地区码 substr(location,0,3) 折掉（分组即国家），
 * 地区行只出现在 /api/v0/stats/locations/{CC} 明细里，且只给地区英文名（如 Shanghai）
 * 而非 ISO 码。站点需在后台 Settings → Data collection 勾选 "Region"，且国家在
 * collect_regions 名单内（默认美国/俄罗斯/中国）才会有明细；没有时不报错，只返回空数组。
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 请求一页统计；网络抖动与 5xx/404 属瞬时故障（2026-10-10 实遇一次偶发 404），重试；400/401/403 是配置类错误，立即抛。 */
async function fetchPage(url) {
  const waits = [0, 3000, 8000, 15000];
  let lastErr;
  for (let i = 0; i < waits.length; i++) {
    if (waits[i]) await sleep(waits[i]);
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.log(`::warning::GoatCounter 请求失败（网络层），稍后重试（${i + 1}/${waits.length}）：${lastErr.message.slice(0, 160)}`);
      continue;
    }
    if (res.ok) return res;
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
        ? '（若反复如此，多半是 GOATCOUNTER_SITE 填得不对：应填站点代码如 logic，而不是整条网址）'
        : '';
    lastErr = new Error(`GoatCounter ${res.status}: ${msg.slice(0, 200)}${hint}`);
    if (res.status === 400 || res.status === 401 || res.status === 403) throw lastErr;
    console.log(`::warning::${lastErr.message.slice(0, 180)}——稍后重试（${i + 1}/${waits.length}）`);
  }
  throw lastErr;
}

/** 取一页 /api/v0/stats/{endpoint}（endpoint 亦可是 "locations/CN" 这样的明细路径）。 */
async function fetchStatsPage(endpoint, start, offset) {
  const url = new URL(`https://${SITE}.goatcounter.com/api/v0/stats/${endpoint}`);
  url.searchParams.set('start', start);
  url.searchParams.set('limit', '200');
  url.searchParams.set('offset', String(offset));
  const res = await fetchPage(url);
  return res.json();
}

async function fetchLocations(start) {
  const agg = new Map();
  let offset = 0;
  for (;;) {
    const body = await fetchStatsPage('locations', start, offset);
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

  // 省州明细：逐国下钻。明细行形如 {id:"Shanghai", name:"Shanghai", count:N}
  // （SQL 只选 name/count，id 为空时由 API 回填成 name），地区为空的来客
  // 合并成一行 name=""（或 "(unknown)"），跳过。
  const regions = [];
  for (const c of countries) {
    let off = 0;
    for (;;) {
      let body;
      try {
        body = await fetchStatsPage(`locations/${c.code}`, start, off);
      } catch (err) {
        // 明细属锦上添花：单国失败不拖垮整次快照，留下警告继续
        console.log(`::warning::省州明细取数失败（${c.code}），跳过：${err?.message?.slice(0, 140) ?? err}`);
        break;
      }
      const stats = Array.isArray(body.stats) ? body.stats : [];
      for (const s of stats) {
        const name = String(s.name ?? s.id ?? '').trim();
        if (!name || /^\(unknown\)$/i.test(name)) continue;
        regions.push({ country: c.code, name, views: Number(s.count) || 0 });
      }
      if (!body.more || stats.length === 0) break;
      off += stats.length;
      if (off > 2000) break;
    }
    await sleep(350); // 官方限流 4 次/秒，留出余量
  }
  regions.sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));

  return {
    visitors: countries.reduce((n, c) => n + c.visitors, 0),
    views: countries.reduce((n, c) => n + c.views, 0),
    countries,
    regions,
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
  const byCountry = new Map();
  for (const r of all.regions) {
    byCountry.set(r.country, [...(byCountry.get(r.country) ?? []), r]);
  }
  console.log(
    `省州级位置 ${all.regions.length} 条：` +
      [...byCountry]
        .map(
          ([cc, rs]) =>
            `${cc} ${rs.length} 条（${rs.slice(0, 6).map((r) => `${r.name} ${r.views}`).join('、')}${rs.length > 6 ? '…' : ''}）`,
        )
        .join('；'),
  );
} else {
  console.log('未取得省州级位置：站点可能尚未勾选 Region（GoatCounter 后台 Settings → Data collection，默认覆盖美国/俄罗斯/中国）');
}
