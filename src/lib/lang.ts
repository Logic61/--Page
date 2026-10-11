// ============================================================
// 中英双语切换 —— 一处初始化，全站生效
//
// 机制：
//   1) html[data-lang="zh"|"en"]：由各布局 <head> 的早置脚本从
//      localStorage('zhumen-lang') 读出后挂上，避免首屏闪档；
//   2) 正文双写：bi(zh, en) 生成一对 <span class="zl-zh">…</span>
//      <span class="zl-en">…</span>，global.css 按 data-lang 显隐。
//      未做翻译的段落不要包类名——中英两态下都原样显示，
//      便于分批补译期间不出现破版；
//   3) 属性类文案（aria-label / title / placeholder / alt / data-name）：
//      元素上写 data-en-xxx，initLang 在切换时把 xxx 本体属性换成英文，
//      中文原文首次运行时存入 data-zh-xxx，切回时不丢；
//   4) 切到英文时弹一次英文提示（AI 翻译可能有偏误，详情走 /lianxi）。
//   5) 疑似非中文母语的来客（可选整段移除，互不影响）：从未手动选过语言的
//      访客，浏览器语言非中文、或（中文浏览器时）IP 归属判为非中国 → 弹底部
//      金条询问是否切英文；点按钮即切（AI 提示随之出现），关闭则本会话不再问。
//      文案刻意只说「可能非中文母语」、不提位置——避免暴露「已识别您的所在」。
//      判定信号说明：浏览器语言是同步的、能赶在首帧，但本站选择了「询问而
//      不静默切」——IP 接口异步、赶不上首帧，且静默误会误伤国内英文浏览器。
//      IP 用 api.country.is（免费无密钥、CORS 开放、只回 {ip,country}）。
// ============================================================

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 生成一对中英互斥的 <span>（用 set:html 嵌入模板）。 */
export const bi = (zh: string, en: string): string =>
  `<span class="zl-zh">${esc(zh)}</span><span class="zl-en">${esc(en)}</span>`;

/** [本体属性, 英文值属性, 中文备份属性] */
const ATTRS: ReadonlyArray<readonly [string, string, string]> = [
  ['aria-label', 'data-en-aria', 'data-zh-aria'],
  ['title', 'data-en-title', 'data-zh-title'],
  ['placeholder', 'data-en-ph', 'data-zh-ph'],
  ['alt', 'data-en-alt', 'data-zh-alt'],
  ['data-name', 'data-en-name', 'data-zh-name'],
];

const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';

const applyAttrs = () => {
  const en = isEn();
  for (const [attr, enAttr, zhAttr] of ATTRS) {
    document.querySelectorAll<HTMLElement>(`[${enAttr}]`).forEach((el) => {
      if (!el.hasAttribute(zhAttr)) el.setAttribute(zhAttr, el.getAttribute(attr) ?? '');
      el.setAttribute(attr, (en ? el.getAttribute(enAttr) : el.getAttribute(zhAttr)) ?? '');
    });
  }
  // SVG 图形提示（<path>/<g> 的子 <title>）：文本在子元素里，不在属性上，
  // 带 data-en-tip 的元素把子 <title> 的文本整体换成对应语言
  document.querySelectorAll<SVGElement>('[data-en-tip]').forEach((el) => {
    const t = el.querySelector('title');
    if (!t) return;
    if (!el.hasAttribute('data-zh-tip')) el.setAttribute('data-zh-tip', t.textContent ?? '');
    t.textContent = el.getAttribute(en ? 'data-en-tip' : 'data-zh-tip') ?? '';
  });
};

const apply = (lang: 'zh' | 'en') => {
  const root = document.documentElement;
  root.setAttribute('data-lang', lang);
  root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
  try {
    localStorage.setItem('zhumen-lang', lang);
  } catch {}
  applyAttrs();
};

// EN/CN 切到英文时弹一次英文提示：站内英文为 AI 翻译，可能有偏误，
// 详情走联系页。样式随元素内联注入，独立于各布局的样式表。
let noticeTimer = 0;

const buildNotice = (): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'lang-notice';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<span>English text on this site is AI-translated and may contain inaccuracies. For details, please contact us via the <a href="' +
    BASE +
    '/lianxi/">Contact Us</a> page.</span>' +
    '<button type="button" class="lang-notice-close" aria-label="Dismiss">×</button>';
  el.querySelector('.lang-notice-close')?.addEventListener('click', () => el.classList.remove('is-on'));
  return el;
};

const ensureNoticeStyle = () => {
  if (document.getElementById('lang-notice-style')) return;
  const s = document.createElement('style');
  s.id = 'lang-notice-style';
  s.textContent = `
.lang-notice{position:fixed;left:50%;bottom:1.4rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:9999;max-width:min(92vw,44rem);padding:.9rem 2.8rem .9rem 1.2rem;background:rgba(14,10,6,.97);border:1px solid rgba(248,220,160,.45);border-radius:4px;box-shadow:0 12px 34px rgba(0,0,0,.55);color:#e8d8b6;font-size:.82rem;line-height:1.75;letter-spacing:.02em;transition:opacity .35s ease,transform .35s ease}
.lang-notice.is-on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.lang-notice a{color:#f0d59f;text-decoration:underline;text-underline-offset:2px}
.lang-notice a:hover{color:#fff0cb}
.lang-notice-close{position:absolute;top:.3rem;right:.45rem;padding:.25rem .3rem;background:none;border:0;color:#d0b98a;font-size:1.05rem;line-height:1;cursor:pointer}
.lang-notice-close:hover{color:#fff0cb}`;
  document.head.appendChild(s);
};

const showLangNotice = () => {
  ensureNoticeStyle();
  let el = document.querySelector<HTMLDivElement>('.lang-notice');
  if (!el) {
    el = buildNotice();
    document.body.appendChild(el);
  }
  const notice = el;
  window.clearTimeout(noticeTimer);
  requestAnimationFrame(() => notice.classList.add('is-on'));
  noticeTimer = window.setTimeout(() => notice.classList.remove('is-on'), 15000);
};

const hideLangNotice = () => {
  window.clearTimeout(noticeTimer);
  document.querySelector<HTMLDivElement>('.lang-notice')?.classList.remove('is-on');
};

/* ---------------- 疑似非中文母语来客：询问是否切换英文 ---------------- */

// 只问「从没手动选过语言」的访客；一个会话问过一次就不再问。
// 点「English」会写 localStorage（等于手动选择），此后永不打扰；
// 点 × 只记会话，下次访问若仍未选择会再问一次。
const SUGGEST_KEY = 'zhumen-lang-suggested';

/** 查 IP 归属国（免费接口，CORS 开放，只回 {ip,country}）；超时/失败返回 null，静默放弃。 */
const geoCountry = async (): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('https://api.country.is/', { signal: ctrl.signal, cache: 'no-store' });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { country?: unknown };
    return typeof data.country === 'string' ? data.country.toUpperCase() : null;
  } catch {
    return null;
  }
};

let suggestEl: HTMLDivElement | null = null;

/** 中英双行并显（不套 .zl-zh/.zl-en——那对类名在 zh 态会藏掉英文行，
    而此处恰是英文读者最需要看见的一屏）；样式与 lang-notice 同语言、更亮 */
const buildSuggest = (): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'lang-suggest';
  el.setAttribute('role', 'status');
  el.innerHTML =
    '<p class="ls-text">' +
    '<span class="ls-en">It seems you may not be a native Chinese speaker &mdash; switch to English?</span>' +
    '<span class="ls-zh">检测到您可能为非中文母语用户，是否切换为英文界面？</span>' +
    '</p>' +
    '<div class="ls-actions">' +
    '<button type="button" class="ls-yes">English</button>' +
    '<button type="button" class="ls-no" aria-label="关闭 / Dismiss">×</button>' +
    '</div>';
  el.querySelector('.ls-yes')?.addEventListener('click', () => {
    hideLangSuggest();
    apply('en');
    showLangNotice();
  });
  el.querySelector('.ls-no')?.addEventListener('click', hideLangSuggest);
  return el;
};

const ensureSuggestStyle = () => {
  if (document.getElementById('lang-suggest-style')) return;
  const s = document.createElement('style');
  s.id = 'lang-suggest-style';
  s.textContent = `
.lang-suggest{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:10000;max-width:min(94vw,40rem);display:flex;align-items:center;gap:1.1rem;padding:1rem 1.1rem 1rem 1.4rem;background:linear-gradient(180deg,rgba(30,21,10,.98),rgba(12,8,4,.98));border:1px solid rgba(248,220,160,.72);border-radius:5px;box-shadow:0 14px 44px rgba(0,0,0,.62),0 0 30px rgba(205,160,60,.28);color:#f2e4c4;font-size:.86rem;line-height:1.7;letter-spacing:.02em;transition:opacity .4s ease,transform .4s ease}
.lang-suggest.is-on{opacity:1;transform:translate(-50%,0);pointer-events:auto;animation:ls-in .45s ease}
@keyframes ls-in{from{opacity:0;transform:translate(-50%,1rem)}to{opacity:1;transform:translate(-50%,0)}}
.lang-suggest .ls-text{margin:0;display:flex;flex-direction:column;gap:.15rem;flex:1;min-width:0}
.lang-suggest .ls-en{color:#f2e4c4}
.lang-suggest .ls-zh{color:#b99f6e;font-size:.78rem;letter-spacing:.06em}
.lang-suggest .ls-actions{display:flex;align-items:center;gap:.4rem;flex:none}
.lang-suggest .ls-yes{padding:.55rem 1.15rem;border:1px solid rgba(248,220,160,.75);border-radius:3px;background:linear-gradient(180deg,rgba(246,217,138,.2),rgba(246,217,138,.07));color:#ffe9ad;font-size:.86rem;letter-spacing:.1em;cursor:pointer;white-space:nowrap;transition:background .25s ease,color .25s ease}
.lang-suggest .ls-yes:hover{background:rgba(246,217,138,.32);color:#fff3c9}
.lang-suggest .ls-no{padding:.3rem .4rem;background:none;border:0;color:#d0b98a;font-size:1.15rem;line-height:1;cursor:pointer}
.lang-suggest .ls-no:hover{color:#fff0cb}
@media (max-width:600px){.lang-suggest{flex-direction:column;align-items:stretch;gap:.55rem;bottom:1rem}.lang-suggest .ls-actions{justify-content:flex-end}}`;
  document.head.appendChild(s);
};

const showLangSuggest = () => {
  ensureSuggestStyle();
  if (!suggestEl) {
    suggestEl = buildSuggest();
    document.body.appendChild(suggestEl);
  }
  // 入场用 keyframes 动画（见样式表），不依赖 rAF 补帧——元素首次挂载时
  // 同一帧加类也能播出淡入；隐藏用 transition，反复显隐照样平滑
  suggestEl.classList.add('is-on');
};

const hideLangSuggest = () => suggestEl?.classList.remove('is-on');

const maybeSuggestLang = async () => {
  try {
    if (localStorage.getItem('zhumen-lang')) return; // 已手动选过，永不打扰
    if (sessionStorage.getItem(SUGGEST_KEY)) return; // 本会话已问过
  } catch {}
  // 非中文浏览器直接问（也省掉一次接口请求）；中文浏览器查 IP 归属再定
  let foreign = !/^zh/i.test(navigator.language || '');
  if (!foreign) {
    const cc = await geoCountry();
    foreign = cc !== null && cc !== 'CN';
  }
  if (!foreign || isEn()) return;
  try {
    sessionStorage.setItem(SUGGEST_KEY, '1');
  } catch {}
  // 稍缓一拍再出现：让首屏先落定，也不与页面加载动画抢戏；
  // 出现前再复查一次选择（期间可能在别处切过了）
  window.setTimeout(() => {
    try {
      if (localStorage.getItem('zhumen-lang') || isEn()) return;
    } catch {}
    showLangSuggest();
  }, 900);
};

export function initLang() {
  applyAttrs();
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest?.('.lang-toggle');
    if (!btn) return;
    hideLangSuggest();
    const next = isEn() ? 'zh' : 'en';
    apply(next);
    if (next === 'en') showLangNotice();
    else hideLangNotice();
  });
  void maybeSuggestLang();
}
