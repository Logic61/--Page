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
//      中文原文首次运行时存入 data-zh-xxx，切回时不丢。
// ============================================================

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

export function initLang() {
  applyAttrs();
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest?.('.lang-toggle');
    if (!btn) return;
    apply(isEn() ? 'zh' : 'en');
  });
}
