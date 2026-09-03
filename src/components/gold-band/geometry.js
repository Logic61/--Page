// 金色环带 — 三套断点的几何规格（desktop / wide / mobile）
// 形状：椭圆（rx ≠ ry），圆心在画面外，掠入边角。
// 符文流动：每枚符文用 SMIL animateMotion 沿 base path 循环移动
//   · 圆心 C=(cx,cy)；半轴 rx, ry；点 P(θ)=(cx+rx·cosθ, cy+ry·sinθ)，θ 用 SVG y-down 角度
//   · 椭圆切线方向：dP/dθ = (-rx·sinθ, ry·cosθ) → angle = atan2(ry·cosθ, -rx·sinθ) × 180/π
//   · genFrom/genTo = path 角度区间，animateMotion 沿 path 走一圈

const n2 = (v) => Math.round(v * 10) / 10;

const P = (cx, cy, rx, ry, deg) => {
  const t = (deg * Math.PI) / 180;
  return [n2(cx + rx * Math.cos(t)), n2(cy + ry * Math.sin(t))];
};

const tangentDeg = (rx, ry, deg) => {
  const t = (deg * Math.PI) / 180;
  const dx = -rx * Math.sin(t);
  const dy = ry * Math.cos(t);
  return n2((Math.atan2(dy, dx) * 180) / Math.PI);
};

// === Desktop 1440×900：右上小弧
//    椭圆 cx=1100, cy=200, rx=350, ry=250
//    弧进入 (890, 0) → 出 (1440, 140)，可见跨度 ≈ 113°
//    path 范围 -135° → -5°，让 fade 落在画外
const A = {
  viewW: 1440, viewH: 900,
  cx: 1100, cy: 200, rx: 350, ry: 250,
  band: 46, dark: 26, lipW: 7, bounceW: 2.5,
  outRail: { off: 23, w: 2.6, color: '#fce18c' },
  outHair: { off: 24.6, w: 0.9, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -23, w: 2.2, color: '#c9a85a', opacity: 0.86 },
  genFrom: -135, genTo: -5,
  enter: [890, 0], exit: [1440, 140],
  slotCount: 12,                    // 流动符文数
  runeScale: 0.40,
  tickFrom: -130, tickTo: -15, tickStep: 5.0,
  dashedR: -29, dashed: '2 12',
  sheenDur: '300s', sheenDash: '2 998', sheenW: 7,
  flowDur: 24,                       // path 走一圈的秒数
};

// === Wide 1920×1000：右上小弧
//    椭圆 cx=1500, cy=200, rx=400, ry=300
//    弧进入 (1202, 0) → 出 (1883, 114)，可见跨度 ≈ 114°
const W = {
  viewW: 1920, viewH: 1000,
  cx: 1500, cy: 200, rx: 400, ry: 300,
  band: 40, dark: 22, lipW: 6, bounceW: 2.2,
  outRail: { off: 20, w: 2.4, color: '#fce18c' },
  outHair: { off: 21.6, w: 0.8, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -20, w: 2.0, color: '#c9a85a', opacity: 0.86 },
  genFrom: -145, genTo: 20,
  enter: [1202, 0], exit: [1883, 114],
  slotCount: 10,
  runeScale: 0.35,
  tickFrom: -140, tickTo: 15, tickStep: 6.0,
  dashedR: -22, dashed: '2 12',
  sheenDur: '320s', sheenDash: '2 998', sheenW: 6,
  flowDur: 26,
};

// === Mobile 414×896：右上小弧
//    椭圆 cx=350, cy=100, rx=200, ry=200
//    弧进入 (177, 0) → 出 (414, 289)，可见跨度 ≈ 221°
const M = {
  viewW: 414, viewH: 896,
  cx: 350, cy: 100, rx: 200, ry: 200,
  band: 34, dark: 19, lipW: 5, bounceW: 2,
  outRail: { off: 17, w: 2.0, color: '#fce18c' },
  outHair: { off: 18.4, w: 0.7, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -17, w: 1.8, color: '#c9a85a', opacity: 0.86 },
  genFrom: -155, genTo: 80,
  enter: [177, 0], exit: [414, 289],
  slotCount: 6,
  runeScale: 0.28,
  tickFrom: -150, tickTo: 75, tickStep: 8.0,
  dashedR: 0, dashed: '',
  sheenDur: '240s', sheenDash: '1.6 998.4', sheenW: 5,
  flowDur: 24,
};

// === 输出生成器 ===

// 槽位函数保留以备后用（当前未直接调用；符文用 animateMotion）
function slots(cfg, runes) {
  const out = [];
  for (let k = 0; k < cfg.slotCount; k++) {
    const ang = cfg.slotFrom + k * cfg.slotStep;
    const pt = P(cfg.cx, cfg.cy, cfg.rx, cfg.ry, ang);
    const isNode = cfg.nodeAt.includes(k);
    out.push({
      kind: isNode ? 'node' : 'rune',
      runeIdx: k % runes.length,
      x: pt[0], y: pt[1],
      deg: n2(ang),
      rotDeg: tangentDeg(cfg.rx, cfg.ry, ang),
      delay: (k * 0.62).toFixed(2),
    });
  }
  return out;
}

function ticks(cfg) {
  const out = [];
  let i = 0;
  for (let d = cfg.tickFrom; d <= cfg.tickTo + 1e-6; d += cfg.tickStep) {
    const isMajor = i % 5 === 0;
    const offIn = cfg.band / 2 + 1;
    const offOut = isMajor ? (cfg.band / 2 + 5) : (cfg.band / 2 + 3);
    const p1 = P(cfg.cx, cfg.cy, cfg.rx + offIn, cfg.ry + offIn * (cfg.ry / cfg.rx), d);
    const p2 = P(cfg.cx, cfg.cy, cfg.rx + offOut, cfg.ry + offOut * (cfg.ry / cfg.rx), d);
    out.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], deg: n2(d), major: isMajor });
    i++;
  }
  return out;
}

export const CFG_A = A;
export const CFG_W = W;
export const CFG_M = M;
export { P, tangentDeg, slots, ticks };