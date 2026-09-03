// 金色环带 —— 三套断点的几何规格（desktop / wide / mobile）
// 约定：
//   · 圆心 C=(cx,cy)；半径 r；点 P(θ)=(cx+r·cosθ, cy+r·sinθ)，θ 用 SVG y-down 角度
//   · 切线朝向 = θ+90
//   · genFrom/genTo 比 slotFrom/slotEnd 多外扩 6°+ 让 geom fade 落在画外，
//     槽位本身保持 1.0 不透明

const n2 = (v) => Math.round(v * 10) / 10;

const P = (cx, cy, r, deg) => {
  const t = (deg * Math.PI) / 180;
  return [n2(cx + r * Math.cos(t)), n2(cy + r * Math.sin(t))];
};

// === Desktop：主环圆心 (-800,2000) R=2400，通道宽 46 ===
const A = {
  viewW: 1440, viewH: 1000,
  cx: -800, cy: 2000, r: 2400,
  rIn: 2377, rOut: 2423, rChannel: 2400,
  band: 46, dark: 26, lipW: 7, lipR: 2419.5, bounceW: 2.5, bounceR: 2380,
  outRail: { r: 2423, w: 2.6, color: '#fce18c' },
  outHair: { r: 2424.6, w: 0.9, color: '#fff6d8', opacity: 0.55 },
  inRail:  { r: 2377, w: 2.2, color: '#c9a85a', opacity: 0.86 },
  enter: [571, 30], exit: [1382, 1000],
  genFrom: -63, genTo: -17,
  slotFrom: -55.0, slotStep: 2.15, slotCount: 15,
  nodeAt: [4, 9, 14],
  runeScale: 0.40,
  tickFrom: -58, tickTo: -22, tickStep: 1.1,
  tickInR: 2426, tickOutR: 2432, tickMajorR: 2436,
  dashedR: 2371, dashed: '2 12',
  sheenDur: '300s', sheenDash: '2 998', sheenW: 7,
};

// === Wide：主环圆心 (-1000,2100) R=2900，通道宽 40 ===
const W = {
  viewW: 1920, viewH: 1000,
  cx: -1000, cy: 2100, r: 2900,
  rIn: 2880, rOut: 2920, rChannel: 2900,
  band: 40, dark: 22, lipW: 6, lipR: 2917, bounceW: 2.2, bounceR: 2883,
  outRail: { r: 2920, w: 2.4, color: '#fce18c' },
  outHair: { r: 2921.6, w: 0.8, color: '#fff6d8', opacity: 0.55 },
  inRail:  { r: 2880, w: 2.0, color: '#c9a85a', opacity: 0.86 },
  enter: [1031, 30], exit: [1683, 1000],
  genFrom: -53, genTo: -15,
  slotFrom: -46.5, slotStep: 2.0, slotCount: 13,
  nodeAt: [3, 8, 12],
  runeScale: 0.35,
  tickFrom: -48, tickTo: -20, tickStep: 0.95,
  tickInR: 2923, tickOutR: 2928, tickMajorR: 2931,
  dashedR: 2874, dashed: '2 12',
  sheenDur: '320s', sheenDash: '2 998', sheenW: 6,
};

// === Mobile：底部托底弧，圆心 (770,1830) R=1223，xMidYMax slice 底边锚定 ===
const M = {
  viewW: 414, viewH: 896,
  cx: 770, cy: 1830, r: 1223,
  rIn: 1206, rOut: 1240, rChannel: 1223,
  band: 34, dark: 19, lipW: 5, lipR: 1238, bounceW: 2, bounceR: 1208.5,
  outRail: { r: 1240, w: 2.0, color: '#fce18c' },
  outHair: { r: 1241.4, w: 0.7, color: '#fff6d8', opacity: 0.55 },
  inRail:  { r: 1206, w: 1.8, color: '#c9a85a', opacity: 0.86 },
  enter: [414, 660], exit: [0, 880],
  genFrom: -136, genTo: -100,
  slotFrom: -128.0, slotStep: 3.65, slotCount: 6,
  nodeAt: [1, 4],
  runeScale: 0.28,
  tickFrom: -132, tickTo: -104, tickStep: 2.2,
  tickInR: 1242, tickOutR: 1246, tickMajorR: 1248.5,
  dashedR: 0, dashed: '',
  sheenDur: '240s', sheenDash: '1.6 998.4', sheenW: 5,
};

// === 输出生成器 ===

// 槽位（雷纹 / 菱形结点）
function slots(cfg, runes) {
  const out = [];
  for (let k = 0; k < cfg.slotCount; k++) {
    const ang = cfg.slotFrom + k * cfg.slotStep;
    const pt = P(cfg.cx, cfg.cy, cfg.r, ang);
    const isNode = cfg.nodeAt.includes(k);
    out.push({
      kind: isNode ? 'node' : 'rune',
      runeIdx: k % runes.length,
      x: pt[0],
      y: pt[1],
      deg: n2(ang),
      rotDeg: n2(ang + 90),
      delay: (k * 0.62).toFixed(2),
    });
  }
  return out;
}

// 外沿刻度
function ticks(cfg) {
  const out = [];
  let i = 0;
  for (let d = cfg.tickFrom; d <= cfg.tickTo + 1e-6; d += cfg.tickStep) {
    const isMajor = i % 5 === 0;
    const p1 = P(cfg.cx, cfg.cy, cfg.tickInR, d);
    const p2 = P(cfg.cx, cfg.cy, isMajor ? cfg.tickMajorR : cfg.tickOutR, d);
    out.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], major: isMajor });
    i++;
  }
  return out;
}

export const CFG_A = A;
export const CFG_W = W;
export const CFG_M = M;
export { P, slots, ticks };