// 金色环带 — 三套断点的几何规格（desktop / wide / mobile）
// 形状：椭圆（rx ≠ ry），圆心在画面外，掠入边角；通道 / 轨道 / 符文都贴在椭圆弧上。
// 约定：
//   · 圆心 C=(cx,cy)；半轴 rx, ry；点 P(θ)=(cx+rx·cosθ, cy+ry·sinθ)，θ 用 SVG y-down 角度
//   · 椭圆切线方向：dP/dθ = (-rx·sinθ, ry·cosθ) → angle = atan2(ry·cosθ, -rx·sinθ) × 180/π
//   · genFrom/genTo 比 slotFrom/slotEnd 多外扩 6°+ 让 geom fade 落在画外

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

// === Desktop：圆心 (200, 450)，半径 900 — 弧从右上 (1440, 16) 扫到右下 (958, 900)
//    可见 θ 范围 ≈ [-86°, 83°]
const A = {
  viewW: 1440, viewH: 900,
  cx: 200, cy: 450, rx: 900, ry: 900,
  band: 46, dark: 26, lipW: 7, bounceW: 2.5,
  outRail: { off: 23, w: 2.6, color: '#fce18c' },
  outHair: { off: 24.6, w: 0.9, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -23, w: 2.2, color: '#c9a85a', opacity: 0.86 },
  enter: [1440, 16], exit: [958, 900],
  genFrom: -95, genTo: 90,
  slotFrom: -86.0, slotStep: 12.0, slotCount: 15,
  nodeAt: [4, 9, 14],
  runeScale: 0.40,
  tickFrom: -90, tickTo: 85, tickStep: 3.5,
  dashedOff: -29, dashed: '2 12',
  sheenDur: '300s', sheenDash: '2 998', sheenW: 7,
  flowDash: '90 3000',
  flowDur: '28s',
};

// === Wide：圆心 (300, 500)，半径 1300 — 弧从右上 (1850, 50) 扫到右下 (300, 850)
//    可见 θ 范围 ≈ [-94°, 92°]
const W = {
  viewW: 1920, viewH: 1000,
  cx: 300, cy: 500, rx: 1300, ry: 1300,
  band: 40, dark: 22, lipW: 6, bounceW: 2.2,
  outRail: { off: 20, w: 2.4, color: '#fce18c' },
  outHair: { off: 21.6, w: 0.8, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -20, w: 2.0, color: '#c9a85a', opacity: 0.86 },
  enter: [1850, 50], exit: [300, 850],
  genFrom: -100, genTo: 100,
  slotFrom: -90.0, slotStep: 13.5, slotCount: 13,
  nodeAt: [3, 8, 12],
  runeScale: 0.35,
  tickFrom: -95, tickTo: 95, tickStep: 4.0,
  dashedOff: -22, dashed: '2 12',
  sheenDur: '320s', sheenDash: '2 998', sheenW: 6,
  flowDash: '70 4000',
  flowDur: '32s',
};

// === Mobile：圆心 (100, 400)，半径 500
const M = {
  viewW: 414, viewH: 896,
  cx: 100, cy: 400, rx: 500, ry: 500,
  band: 34, dark: 19, lipW: 5, bounceW: 2,
  outRail: { off: 17, w: 2.0, color: '#fce18c' },
  outHair: { off: 18.4, w: 0.7, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -17, w: 1.8, color: '#c9a85a', opacity: 0.86 },
  enter: [113, 30], exit: [113, 870],
  genFrom: -100, genTo: 100,
  slotFrom: -90.0, slotStep: 36.0, slotCount: 6,
  nodeAt: [1, 4],
  runeScale: 0.28,
  tickFrom: -98, tickTo: 98, tickStep: 7.0,
  dashedOff: 0, dashed: '',
  sheenDur: '240s', sheenDash: '1.6 998.4', sheenW: 5,
  flowDash: '50 2000',
  flowDur: '20s',
};

// === 输出生成器 ===

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