// 生成知识点结构化数据（knowledge.json）与全局搜索索引（search-index.json）
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const text = readFileSync(join(root, '巫', '知识点.txt'), 'utf8').replace(/\r\n/g, '\n');
const lines = text.split('\n');
const outData = join(root, 'src', 'data');

const nums = { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,二十:20,二十一:21,二十二:22,二十三:23,二十四:24,二十五:25,二十六:26,二十七:27,二十八:28,二十九:29,三十:30,三十一:31,三十二:32,三十三:33,三十四:34,三十五:35,三十六:36,三十七:37,三十八:38,三十九:39,四十:40,四十一:41,四十二:42,四十三:43,四十四:44,四十五:45,四十六:46,四十七:47,四十八:48,四十九:49,五十:50,五十一:51,五十二:52,五十三:53,五十四:54,五十五:55,五十六:56,五十七:57,五十八:58,五十九:59,六十:60 };

const headRe = /^([一二三四五六七八九十百]+|\d{1,2})[：:、](.+)$/;
const markerRe = /^#?人道(传承人|传人)?好友内容#?$/;
const norm = (s) => s.replace(/[#？?！!，。、：:；;""''（）()「」『』\s]/g, '');
const cleanTitle = (s) => s.replace(/^#+/, '').replace(/#+$/, '').replace(/\s+$/, '').trim();

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
const commonPrefixLen = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

// ---------- 目录块（阿拉伯或中文数字的连续行） ----------
const runs = [];
let run = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].trim().match(headRe);
  if (m && m[2].trim().length < 60) {
    const num = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : nums[m[1]];
    if (!run) run = { entries: [] };
    run.entries.push({ line: i, num, title: cleanTitle(m[2]) });
  } else if (run) { runs.push(run); run = null; }
}
if (run) runs.push(run);
runs.sort((a, b) => b.entries.length - a.entries.length);
const tocA = runs[0], tocB = runs[1];
const tocAmap = Object.fromEntries(tocA.entries.map(e => [e.num, e.title]));
const tocBmap = Object.fromEntries(tocB.entries.map(e => [e.num, e.title]));

const prefaceStart = lines.findIndex(l => l.includes('个人前言'));
const prefaceLines = [];
for (let i = prefaceStart + 1; i < tocA.entries[0].line; i++) {
  const t = lines[i].trim();
  if (t) prefaceLines.push(t.replace(/^\d+[：:]\s*/, ''));
}
const jinggaoIdx = lines.findIndex((l, idx) => idx > tocB.entries[0].line && l.includes('敬告：本脉上古祝法来历'));
const noticeLines = [];
for (let i = jinggaoIdx; i < lines.length && i < jinggaoIdx + 8; i++) {
  const t = lines[i].trim();
  if (!t) continue;
  if (/^[一二三四五六七八九十百]+[：:]/.test(t) && i > jinggaoIdx) break;
  noticeLines.push(t.replace(/^敬告：/, ''));
}

const partAStart = lines.findIndex(l => /^一：什么是修炼？/.test(l.trim()));
const partBStart = lines.findIndex(l => /^一：什么是祝法？/.test(l.trim()));
if (partAStart < 0 || partBStart < 0) throw new Error('无法定位内容分区');
const partA = lines.slice(partAStart, tocB.entries[0].line);
const partB = lines.slice(partBStart);

// ---------- 顶层判断 ----------
function makeTopJudge(tocMap) {
  return (n, title) => {
    const t = tocMap[n];
    if (!t) return false;
    const a = norm(title), b = norm(t);
    return a === b || lev(a, b) <= 3 || commonPrefixLen(a, b) >= 6;
  };
}
const isQ = (s) => /[？?]$/.test(s) || /^(为什么|怎么|可以|有没有|是不是|要不要|如何|能不能|为何)/.test(s);

function parsePart(region, tocMap) {
  const items = [];
  const isTop = makeTopJudge(tocMap);
  let cur = null;
  let lastTop = 0;
  let prevQuestion = false;
  let first = true;
  const flush = () => {
    if (!cur) return;
    const paras = cur.content.map(p => p.trim()).filter(Boolean);
    if (paras.length) items.push({ ...cur, content: paras, excerpt: paras[0].slice(0, 110) });
    cur = null;
  };
  for (const line of region) {
    const t = line.trim();
    if (!t) { if (cur) cur.content.push(''); continue; }
    if (markerRe.test(t)) continue;
    const hm = t.match(headRe);
    if (hm) {
      const num = /^\d+$/.test(hm[1]) ? parseInt(hm[1], 10) : nums[hm[1]];
      const title = cleanTitle(hm[2]);
      const tocHit = isTop(num, title);
      const seqHit = num === lastTop + 1;
      const top = first || tocHit || (seqHit && prevQuestion);
      if (top) {
        flush();
        cur = { num: String(hm[1]), n: num, title, content: [] };
        lastTop = num;
        prevQuestion = isQ(title);
        first = false;
      } else {
        if (cur) cur.content.push('【' + title + '】');
        else { cur = { num: String(hm[1]), n: num, title, content: [] }; lastTop = num; prevQuestion = isQ(title); first = false; }
      }
      continue;
    }
    if (cur) cur.content.push(t);
  }
  flush();
  return items;
}

const itemsA = parsePart(partA, tocAmap);
const itemsB = parsePart(partB, tocBmap);

// ---------- 分类 ----------
const CATS = [
  { id: 'jichu', name: '修炼基础' },
  { id: 'shicheng', name: '师承与传承' },
  { id: 'xiuxing', name: '修行与境界' },
  { id: 'zhufa-yangsheng', name: '祝法与养生' },
  { id: 'zongjiao', name: '宗教与神道' },
];
function categorize(t) {
  if (/祝法|祝由|缘法|养生|辟谷|艾灸|拔罐|吃什么|禁色|断情禁欲|马阴藏相|补药|素食/.test(t)) return 'zhufa-yangsheng';
  if (/传承|师父|老师|师传|师寻|收费|拜师|明师|考核|收徒|门户|忽悠|劝人|教什么/.test(t)) return 'shicheng';
  if (/神通|功能|气功|治病|炼形|飞升|维度|先天|胎息|道心|功感|神识|天眼|内景|幻境|修证|外丹|地仙|玄关|经脉|丹田|周天|杂念|聪明|脾气|火候|体系|次第|导引|古法|丹道|比喻|元神|识神|精气神|暗物质|声波|科学|长生|境界|反应|意识|修丹|心性/.test(t)) return 'xiuxing';
  if (/神|佛|宗教|膜拜|功德|福报|放生|行善|鲁班|鬼神|迷信|因果|业力|爱狗|顶礼|崇拜/.test(t)) return 'zongjiao';
  return 'jichu';
}

const allItems = [];
for (const it of itemsA) allItems.push({ id: 'a-' + it.n, part: '修炼基础认知', num: it.num, title: it.title, category: categorize(it.title), content: it.content, excerpt: it.excerpt });
for (const it of itemsB) allItems.push({ id: 'b-' + it.n, part: '祝法与修行', num: it.num, title: it.title, category: categorize(it.title), content: it.content, excerpt: it.excerpt });

const faqPatterns = ['什么是修炼', '修炼求什么', '为什么求道那么困难', '没有传承', '人的命是不是注定', '修炼就是修心', '如何防止忽悠', '佛道兼修', '什么是祝法', '天赋', '辟谷', '修行与神通', '求神拜佛', '完整传承', '修行吃什么'];
const faqIds = [];
for (const pat of faqPatterns) {
  const hit = allItems.find(it => !faqIds.includes(it.id) && it.title.includes(pat));
  if (hit) faqIds.push(hit.id);
}

const knowledge = { notice: noticeLines.join('\n'), preface: prefaceLines, categories: CATS, faqIds, items: allItems };
writeFileSync(join(outData, 'knowledge.json'), JSON.stringify(knowledge, null, 2), 'utf8');

const index = [];
for (const it of allItems) index.push({ type: 'knowledge', id: it.id, title: it.title, snippet: it.excerpt, category: CATS.find(c => c.id === it.category)?.name || '', url: '/zhoufa/zhishi#k-' + it.id });
for (const f of readdirSync(join(root, '巫')).filter(f => f.endsWith('.md')).sort()) {
  const md = readFileSync(join(root, '巫', f), 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) continue;
  const get = (k) => { const m = fm[1].match(new RegExp('^' + k + ':\s*(.+)$', 'm')); return m ? m[1].trim() : ''; };
  const slug = get('slug');
  if (!slug) continue;
  index.push({ type: 'article', id: slug, title: '《' + (get('title') || f) + '》', snippet: get('summary'), category: '神机秘闻', url: '/zhoufa/wenzhang/' + slug });
}
writeFileSync(join(outData, 'search-index.json'), JSON.stringify(index, null, 2), 'utf8');

console.log('条目: ' + allItems.length + '（基础 ' + itemsA.length + ' + 祝法 ' + itemsB.length + '） FAQ: ' + faqIds.length + ' 索引: ' + index.length);
const counts = {};
for (const it of allItems) counts[it.category] = (counts[it.category] || 0) + 1;
console.log('分类: ' + JSON.stringify(counts));
