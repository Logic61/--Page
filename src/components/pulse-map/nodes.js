// 铭牌生成 —— 法门入口“长在”枝条上。
//   origin —— 主干根部的圆印（本源）
//   major —— 主枝末梢的铭牌（门户）
//   normal —— 细枝末梢的小铭牌（传承）
// 每个铭牌带 data-id 与 data-branch-path，供 hover 高亮传承路径。

import { el } from './svg.js';

function roundRect(cx, cy, w, h, r) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} ` +
    `V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} ` +
    `H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} ` +
    `Q${x},${y} ${x + r},${y} Z`
  );
}

function buildPlaque(node, g) {
  if (node.type === 'origin') {
    el('circle', { class: 'op-ring', cx: 0, cy: 0, r: 38 }, g);
    el('circle', { class: 'op-core', cx: 0, cy: 0, r: 27 }, g);
    el('text', { class: 'op-glyph', x: 0, y: 0, 'text-anchor': 'middle', dy: '0.36em' }, g).textContent = node.glyph;
    el('text', { class: 'op-label', x: 0, y: 58, 'text-anchor': 'middle' }, g).textContent = node.name;
    return;
  }

  const isMajor = node.type === 'major';
  const w = node.w;
  const h = node.h;
  const r = isMajor ? 5 : 3;
  const y = isMajor ? 0 : 0;

  el('path', { class: 'tp-plaque', d: roundRect(0, y, w, h, r) }, g);
  if (isMajor) {
    el('line', { class: 'tp-tick', x1: -w / 2 + 10, y1: -7, x2: -w / 2 + 10, y2: 7 }, g);
  }
  el('text', {
    class: `tp-text ${isMajor ? 'tp-major' : 'tp-leaf'}`,
    x: 0,
    y,
    'text-anchor': 'middle',
    dy: '0.37em',
  }, g).textContent = node.name;
}

function drawStem(node, g) {
  if (!node.stem) return;
  const [a, b] = node.stem;
  el('line', { class: 'tp-stem', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g);
}

export function renderNodes(groups, nodes, base) {
  nodes.forEach((node) => {
    const g = el('g', {
      class: `tree-node tree-node-${node.type}`,
      'data-id': node.id,
      'data-branch-path': node.branchPath.join(' '),
      transform: `translate(${node.x} ${node.y})`,
    });

    drawStem(node, g);
    buildPlaque(node, g);
    node.el = g;

    if (node.route) {
      const a = el('a', {
        href: base + node.route,
        class: 'tree-link',
        'aria-label': `进入${node.name}`,
        tabindex: '0',
      }, groups.nodes);
      a.appendChild(g);
    } else {
      groups.nodes.appendChild(g);
    }
  });
}
