// SVG 管理 —— 命名空间、元素创建、地图骨架与公用渐变。

import { VIEW_W, VIEW_H } from './tree.js';

export const NS = 'http://www.w3.org/2000/svg';

export function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) {
    node.setAttribute(key, attrs[key]);
  }
  if (parent) parent.appendChild(node);
  return node;
}

export function createMapSvg(canvas) {
  const svg = el(
    'svg',
    {
      class: 'pulse-map',
      viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
      width: VIEW_W,
      height: VIEW_H,
      role: 'img',
      'aria-label': '古巫祝脉传承之树',
    },
    canvas
  );

  const defs = el('defs', {}, svg);

  // 树身金铜渐变：根部深铜、梢头亮金，像浇铸的青铜鎏金树身
  const woodGrad = el('linearGradient', { id: 'woodGrad', x1: '0', y1: '1', x2: '0', y2: '0' }, defs);
  el('stop', { offset: '0', 'stop-color': '#241708' }, woodGrad);
  el('stop', { offset: '0.28', 'stop-color': '#5e451f' }, woodGrad);
  el('stop', { offset: '0.62', 'stop-color': '#96722f' }, woodGrad);
  el('stop', { offset: '1', 'stop-color': '#c9a75c' }, woodGrad);

  // 中心高光渐变：越近梢头越亮，模拟鎏金受光
  const sheenGrad = el('linearGradient', { id: 'sheenGrad', x1: '0', y1: '1', x2: '0', y2: '0' }, defs);
  el('stop', { offset: '0', 'stop-color': '#f0d9a0', 'stop-opacity': '0' }, sheenGrad);
  el('stop', { offset: '0.5', 'stop-color': '#f0d9a0', 'stop-opacity': '0.2' }, sheenGrad);
  el('stop', { offset: '1', 'stop-color': '#fff1a8', 'stop-opacity': '0.5' }, sheenGrad);

  // 分叉金点渐变
  const knotGrad = el('radialGradient', { id: 'knotGrad' }, defs);
  el('stop', { offset: '0', 'stop-color': '#ffe9a8' }, knotGrad);
  el('stop', { offset: '0.55', 'stop-color': '#c7a45a' }, knotGrad);
  el('stop', { offset: '1', 'stop-color': '#7a5c24' }, knotGrad);

  const groups = {};
  ['branches', 'nodes'].forEach((name) => {
    groups[name] = el('g', { class: name }, svg);
  });

  return { svg, groups };
}
