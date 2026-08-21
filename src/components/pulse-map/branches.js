// 树枝生成 —— 把“树”画出来。
// 主干 / 主枝 / 细枝都是渐变粗细的填充形，整体呈一棵自然生长的古树。
// 每个形状带 data-branch，供 hover 高亮整条传承路径使用。
// 每根枝干由四层构成：落影 → 金铜主体 → 中心高光 → 分叉金点，营造厚重浮雕感。

import { el } from './svg.js';
import { flattenBez, taperedPath } from './tree.js';

function drawBranch(group, id, bez, w0, w1) {
  const pts = flattenBez(bez[0], bez[1], bez[2], bez[3]);
  const d = taperedPath(pts, w0, w1);
  const sheenPts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  el('path', { class: 'tree-shadow', 'data-branch': id, d }, group);
  el('path', { class: 'tree-branch', 'data-branch': id, d }, group);
  el('polyline', { class: 'tree-sheen', 'data-branch': id, points: sheenPts }, group);

  const knotR = Math.max(2.5, w0 * 0.16).toFixed(1);
  el('circle', { class: 'tree-knot', 'data-branch': id, cx: bez[0].x.toFixed(1), cy: bez[0].y.toFixed(1), r: knotR }, group);
}

export function renderBranches(groups, tree) {
  const layer = groups.branches;

  drawBranch(layer, tree.trunk.id, [tree.trunk.p0, tree.trunk.c1, tree.trunk.c2, tree.trunk.p1], tree.trunk.w0, tree.trunk.w1);

  tree.limbs.forEach((limb) => {
    drawBranch(layer, limb.id, limb.bez, limb.w0, limb.w1);
    limb.twigs.forEach((twig) => {
      drawBranch(layer, twig.id, twig.bez, twig.w0, twig.w1);
    });
  });
}
