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

// === Desktop 1440×900：拉长的弧（横跨整个底部）
//    椭圆 cx=720, cy=900, rx=900, ry=300
//    y=900 弦：x∈[-180, 1620]，覆盖整个 1440 视口
//    180° 弧：左侧 (-180, 900) → 顶部 (720, 600) → 右侧 (1620, 900) → 沿底部回到 (-180, 900)
//    可见：底部 y=900 整条 + 两侧向上 + 顶部
//    band=44, off=±30, w=4.5（暗间隙 4px）
const A = {
  viewW: 1440, viewH: 900,
  cx: 720, cy: 900, rx: 900, ry: 300,
  band: 44, dark: 24, lipW: 5, bounceW: 1.4,
  outRail: { off: 30, w: 4.5, color: '#fce18c' },
  outHair: { off: 34, w: 1.0, color: '#fff6d8', opacity: 0.6 },
  inRail:  { off: -30, w: 4.5, color: '#fce18c' },
  // 180° 弧：左侧 → 顶部 → 右侧（顺时针；genFrom=180→genTo=0 跨 180°）
  // 但 sweep=1（SVG 顺时针）从 θ=180 到 θ=0 是下半圆，
  // 想要上半圆可见需 sweep=0 或 genFrom=0→genTo=180
  // 这里用 genFrom=180, genTo=360: 从左(-180)顺时针到顶部到右(0)再到底到左(-180)
  // 实际：sweep=1 + 180° 跨 → 短弧 = 下半圆（过底部）
  // 要让"拉长弧"可见在上半部分，需用 sweep=0 或 走长边
  // 简化：保持 sweep=1，路径跨 180° = 短弧 = 下半圆 + 部分左右
  // 既然短弧 = 底半圆, 它正好覆盖底部 + 两侧下段 = 我们想要的"沿底部扫的弧"
  // genFrom=180, genTo=0, sweep=1: 路径 M(左,900) A ... (右,900) = 半圆跨底部
  genFrom: 180, genTo: 0,
  enter: [-180, 900], exit: [1620, 900],
  slotCount: 14,
  runeScale: 0.30,
  tickFrom: 175, tickTo: 5, tickStep: 5.0,
  dashedR: 0, dashed: '',
  sheenDur: '300s', sheenDash: '2 998', sheenW: 7,
  flowDur: 24,
};

// === Wide 1920×1000：拉长弧
//    椭圆 cx=300, cy=1000, rx=500, ry=400
//    genFrom=180, genTo=0 → 180° 弧（从左侧到右侧，沿底部）
const W = {
  viewW: 1920, viewH: 1000,
  cx: 300, cy: 1000, rx: 500, ry: 400,
  band: 52, dark: 28, lipW: 5, bounceW: 1.6,
  outRail: { off: 34, w: 5.0, color: '#fce18c' },
  outHair: { off: 38, w: 1.0, color: '#fff6d8', opacity: 0.6 },
  inRail:  { off: -34, w: 5.0, color: '#fce18c' },
  genFrom: 180, genTo: 0,
  enter: [-200, 1000], exit: [800, 1000],
  slotCount: 14,
  runeScale: 0.30,
  tickFrom: 175, tickTo: 5, tickStep: 5.0,
  dashedR: 0, dashed: '',
  sheenDur: '320s', sheenDash: '2 998', sheenW: 6,
  flowDur: 26,
};

// === Mobile 414×896：拉长弧
//    椭圆 cx=100, cy=900, rx=250, ry=300
//    移动屏幕窄（414），180° 弧超出范围。保留 200° 弧覆盖底部
const M = {
  viewW: 414, viewH: 896,
  cx: 100, cy: 900, rx: 250, ry: 300,
  band: 36, dark: 20, lipW: 5, bounceW: 1.2,
  outRail: { off: 24, w: 3.5, color: '#fce18c' },
  outHair: { off: 27, w: 0.7, color: '#fff6d8', opacity: 0.6 },
  inRail:  { off: -24, w: 3.5, color: '#fce18c' },
  genFrom: 200, genTo: -20,
  enter: [-150, 900], exit: [350, 900],
  slotCount: 10,
  runeScale: 0.26,
  tickFrom: 195, tickTo: -15, tickStep: 7.0,
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