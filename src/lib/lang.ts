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

export function initLang() {
  applyAttrs();
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest?.('.lang-toggle');
    if (!btn) return;
    const next = isEn() ? 'zh' : 'en';
    apply(next);
    if (next === 'en') showLangNotice();
    else hideLangNotice();
  });
}
