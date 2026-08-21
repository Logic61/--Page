// 树几何 —— 一棵“真实的树”，不是树状图。
//   · 主干从画面下方长出，粗细渐变、轻微弯曲，直抵上方
//   · 主干在不同高度自然分叉，左右不对称、枝条长短不一
//   · 每条枝条继续生长，末梢挂一枚“铭牌”（法门入口）
//   · 树枝决定结构，入口只是长在枝条上的结果
// 所有曲线都是贝塞尔，绘制为“渐变粗细的填充形”，而非等宽线段。

export const VIEW_W = 1400;
export const VIEW_H = 1040;

function pt(x, y) {
  return { x, y };
}

function bez(p0, c1, c2, p1, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  };
}

function flattenBez(p0, c1, c2, p1, n = 44) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(p0, c1, c2, p1, i / n));
  return pts;
}

// 沿曲线的法线方向偏移，生成首尾渐变粗细的闭合填充路径
function taperedPath(points, w0, w1) {
  const n = points.length;
  if (n < 2) return '';
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const w = w0 + ((w1 - w0) * i) / (n - 1);
    left.push([p.x - ty * (w / 2), p.y + tx * (w / 2)]);
    right.push([p.x + ty * (w / 2), p.y - tx * (w / 2)]);
  }
  const path = left
    .map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
    .join(' L ');
  const back = right
    .slice()
    .reverse()
    .map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
    .join(' L ');
  return `M ${path} L ${back} Z`;
}

// ---- 主干：粗壮如柱，根部最厚 ----
const trunk = {
  id: 'trunk',
  p0: pt(712, 905),
  c1: pt(700, 768),
  c2: pt(694, 500),
  p1: pt(704, 240),
  w0: 64,
  w1: 24,
};

// ---- 五条主枝（不同高度、不同方向、长短不一，刻意不对称） ----
const limbs = [
  {
    id: 'limbA',
    gate: 'zhenqi',
    tFork: 0.26,
    bez: [pt(703, 770), pt(880, 745), pt(1060, 690), pt(1215, 545)],
    w0: 44,
    w1: 11,
    plaque: pt(1264, 545),
    twigs: [
      { id: 'tA1', leaf: 'waiqi', t: 0.32, bez: [pt(808, 739), pt(852, 706), pt(884, 682), pt(906, 660)], w0: 13, w1: 4, plaque: pt(906, 643) },
      { id: 'tA2', leaf: 'shenqi', t: 0.55, bez: [pt(945, 706), pt(1000, 668), pt(1030, 646), pt(1052, 624)], w0: 12, w1: 4, plaque: pt(1052, 607) },
      { id: 'tA3', leaf: 'jifa', t: 0.78, bez: [pt(1090, 662), pt(1130, 622), pt(1150, 600), pt(1166, 578)], w0: 11, w1: 4, plaque: pt(1166, 561) },
    ],
  },
  {
    id: 'limbB',
    gate: 'oujing',
    tFork: 0.42,
    bez: [pt(700, 666), pt(520, 636), pt(350, 570), pt(225, 400)],
    w0: 42,
    w1: 10,
    plaque: pt(176, 400),
    twigs: [
      { id: 'tB1', leaf: 'neijing', t: 0.3, bez: [pt(552, 647), pt(500, 610), pt(470, 588), pt(446, 566)], w0: 13, w1: 4, plaque: pt(446, 549) },
      { id: 'tB2', leaf: 'guanzhao', t: 0.55, bez: [pt(414, 590), pt(362, 552), pt(334, 530), pt(310, 506)], w0: 12, w1: 4, plaque: pt(310, 489) },
      { id: 'tB3', leaf: 'shouyi', t: 0.78, bez: [pt(296, 500), pt(262, 452), pt(240, 420), pt(222, 392)], w0: 11, w1: 4, plaque: pt(222, 375) },
    ],
  },
  {
    id: 'limbC',
    gate: 'zhoufa',
    tFork: 0.6,
    bez: [pt(703, 520), pt(640, 430), pt(606, 300), pt(622, 148)],
    w0: 42,
    w1: 11,
    plaque: pt(622, 120),
    twigs: [
      { id: 'tC1', leaf: 'zhudao', t: 0.3, bez: [pt(668, 465), pt(600, 452), pt(556, 442), pt(520, 428)], w0: 13, w1: 4, plaque: pt(520, 411) },
      { id: 'tC2', leaf: 'zhuyou', t: 0.55, bez: [pt(640, 372), pt(560, 360), pt(510, 340), pt(470, 314)], w0: 12, w1: 4, plaque: pt(470, 297) },
      { id: 'tC3', leaf: 'yinji', t: 0.8, bez: [pt(616, 246), pt(540, 238), pt(488, 222), pt(448, 200)], w0: 11, w1: 4, plaque: pt(448, 183) },
    ],
  },
  {
    id: 'limbD',
    gate: 'aozhan',
    tFork: 0.74,
    bez: [pt(703, 428), pt(560, 412), pt(430, 356), pt(330, 210)],
    w0: 36,
    w1: 9,
    plaque: pt(288, 190),
    twigs: [
      { id: 'tD1', leaf: 'danji', t: 0.3, bez: [pt(578, 419), pt(524, 388), pt(496, 368), pt(472, 350)], w0: 11, w1: 4, plaque: pt(472, 333) },
      { id: 'tD2', leaf: 'fangzhong', t: 0.55, bez: [pt(472, 368), pt(420, 330), pt(394, 306), pt(372, 282)], w0: 10, w1: 4, plaque: pt(372, 265) },
      { id: 'tD3', leaf: 'yangsheng', t: 0.8, bez: [pt(366, 288), pt(328, 244), pt(306, 220), pt(290, 198)], w0: 9, w1: 4, plaque: pt(290, 181) },
    ],
  },
  {
    id: 'limbE',
    gate: 'zhuyanshu',
    tFork: 0.85,
    bez: [pt(704, 350), pt(830, 342), pt(950, 300), pt(1055, 170)],
    w0: 32,
    w1: 9,
    plaque: pt(1100, 150),
    twigs: [
      { id: 'tE1', leaf: 'zhuyan', t: 0.32, bez: [pt(814, 345), pt(866, 320), pt(896, 300), pt(918, 280)], w0: 11, w1: 4, plaque: pt(918, 263) },
      { id: 'tE2', leaf: 'yangrong', t: 0.58, bez: [pt(938, 304), pt(992, 272), pt(1020, 252), pt(1042, 232)], w0: 10, w1: 4, plaque: pt(1042, 215) },
      { id: 'tE3', leaf: 'shengfa', t: 0.8, bez: [pt(1004, 236), pt(1054, 200), pt(1076, 178), pt(1094, 156)], w0: 9, w1: 4, plaque: pt(1094, 139) },
    ],
  },
];

// 主干上的分叉点：主枝从主干“长出来”
limbs.forEach((limb) => {
  const fork = bez(trunk.p0, trunk.c1, trunk.c2, trunk.p1, limb.tFork);
  limb.fork = pt(fork.x, fork.y);
  limb.bez[0] = pt(fork.x, fork.y);
});

// 细枝从主枝上“长出来”
limbs.forEach((limb) => {
  const [p0, c1, c2, p1] = limb.bez;
  limb.twigs.forEach((twig) => {
    const start = bez(p0, c1, c2, p1, twig.t);
    twig.bez[0] = pt(start.x, start.y);
  });
});

// ---- 把几何变成节点 —— 铭牌位置、所属枝干路径 ----
import { pulseTree } from './data.js';

const nodeLookup = {};
(function collect(node) {
  nodeLookup[node.id] = node;
  (node.children || []).forEach(collect);
})(pulseTree);

export function buildTree() {
  const nodes = [];

  // 本源：主干根部的圆印
  const origin = nodeLookup.origin;
  nodes.push({
    id: origin.id,
    name: origin.name,
    glyph: origin.glyph,
    type: 'origin',
    x: 712,
    y: 936,
    w: 84,
    h: 40,
    path: [],
    branchPath: ['trunk'],
  });

  // 门户：主枝末梢的铭牌
  limbs.forEach((limb) => {
    const gate = nodeLookup[limb.gate];
    const w = gate.name.length > 2 ? 96 : 78;
    nodes.push({
      id: gate.id,
      name: gate.name,
      glyph: gate.glyph,
      type: 'major',
      route: gate.route,
      x: limb.plaque.x,
      y: limb.plaque.y,
      w,
      h: 32,
      path: ['origin'],
      branchPath: ['trunk', limb.id],
      limbId: limb.id,
      stem: [limb.bez[3], limb.plaque],
    });

    // 传承：细枝末梢的小铭牌
    limb.twigs.forEach((twig) => {
      const leaf = nodeLookup[twig.leaf];
      nodes.push({
        id: leaf.id,
        name: leaf.name,
        glyph: leaf.glyph,
        type: 'normal',
        route: leaf.route,
        x: twig.plaque.x,
        y: twig.plaque.y,
        w: 48,
        h: 28,
        path: ['origin', limb.gate],
        branchPath: ['trunk', limb.id, twig.id],
        stem: [twig.bez[3], twig.plaque],
      });
    });
  });

  return { trunk, limbs, nodes };
}

export { taperedPath, flattenBez };
