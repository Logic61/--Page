// 初始化 —— 数据 → 树几何 → SVG 骨架 → 树枝 → 铭牌 → 交互。

import { buildTree } from './tree.js';
import { createMapSvg } from './svg.js';
import { renderBranches } from './branches.js';
import { renderNodes } from './nodes.js';
import { initInteraction } from './interaction.js';

export function initPulseMap(rootEl) {
  const base = rootEl.dataset.base || '';
  const canvas = rootEl.querySelector('.pulse-canvas');

  const { groups } = createMapSvg(canvas);
  const tree = buildTree();

  renderBranches(groups, tree);
  renderNodes(groups, tree.nodes, base);
  initInteraction(rootEl, tree.nodes);
}
