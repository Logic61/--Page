// 金色环带 — 三套断点的几何规格（desktop / wide / mobile）
// 位置：左下角（之前是右上）
// 形状：椭圆（rx ≠ ry），圆心在画面外下方，弧从底部掠到左侧
// 符文流动：每枚用 SMIL animateMotion 沿 base path 循环
//   · 圆心 C=(cx,cy)；半轴 rx, ry；点 P(θ)=(cx+rx·cosθ, cy+ry·sinθ)，θ 用 SVG y-down 角度
//   · 椭圆切线方向：dP/dθ = (-rx·sinθ, ry·cosθ) → angle = atan2(ry·cosθ, -rx·sinθ) × 180/π
//   · genFrom/genTo = path 角度区间；animateMotion 沿 path 走一圈
//   · 视觉分层：外轨 + 发丝 + 微微泛金通道 + 暗芯 + 内轨（两条线 + 之间的"凹槽"）

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

// === Desktop 1440×900：左下角小弧
//    椭圆 cx=200, cy=900, rx=400, ry=300
//    弧进入 (600, 900) → 出 (0, 640)，可见跨度 ≈ 127°（从底到左）
const A = {
  viewW: 1440, viewH: 900,
  cx: 200, cy: 900, rx: 400, ry: 300,
  band: 40, dark: 22, lipW: 5, bounceW: 2,
  outRail: { off: 20, w: 4.0, color: '#fce18c' },
  outHair: { off: 22, w: 0.9, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -20, w: 4.0, color: '#fce18c' },
  genFrom: -127, genTo: 0,
  enter: [600, 900], exit: [0, 640],
  slotCount: 10,
  runeScale: 0.24,
  tickFrom: -120, tickTo: -5, tickStep: 6.0,
  dashedR: 0, dashed: '',
  sheenDur: '300s', sheenDash: '2 998', sheenW: 7,
  flowDur: 24,
};

// === Wide 1920×1000：左下角
//    椭圆 cx=300, cy=1000, rx=500, ry=400
//    弧进入 (800, 1000) → 出 (0, 680)，可见跨度 ≈ 127°
const W = {
  viewW: 1920, viewH: 1000,
  cx: 300, cy: 1000, rx: 500, ry: 400,
  band: 40, dark: 22, lipW: 5, bounceW: 2,
  outRail: { off: 20, w: 4.0, color: '#fce18c' },
  outHair: { off: 22, w: 0.9, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -20, w: 4.0, color: '#fce18c' },
  genFrom: -130, genTo: 0,
  enter: [800, 1000], exit: [0, 680],
  slotCount: 10,
  runeScale: 0.24,
  tickFrom: -125, tickTo: -5, tickStep: 6.0,
  dashedR: 0, dashed: '',
  sheenDur: '320s', sheenDash: '2 998', sheenW: 6,
  flowDur: 26,
};

// === Mobile 414×896：左下角
//    椭圆 cx=100, cy=900, rx=250, ry=300
//    弧进入 (350, 900) → 出 (0, 625)，可见跨度 ≈ 127°
const M = {
  viewW: 414, viewH: 896,
  cx: 100, cy: 900, rx: 250, ry: 300,
  band: 34, dark: 19, lipW: 5, bounceW: 2,
  outRail: { off: 17, w: 3.0, color: '#fce18c' },
  outHair: { off: 18.4, w: 0.7, color: '#fff6d8', opacity: 0.55 },
  inRail:  { off: -17, w: 3.0, color: '#fce18c' },
  genFrom: -130, genTo: 0,
  enter: [350, 900], exit: [0, 625],
  slotCount: 5,
  runeScale: 0.20,
  tickFrom: -125, tickTo: -5, tickStep: 8.0,
  dashedR: 0, dashed: '',
  sheenDur: '240s', sheenDash: '1.6 998.4', sheenW: 5,
  flowDur: 24,
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