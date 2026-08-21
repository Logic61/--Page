// 交互 —— hover 高亮传承路径、点击进入对应页、拖拽 / 触屏双指缩放。
// 初始视图按树内容包围盒适配；滚轮不控制缩放，页面正常滚动。

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function computeBBox(nodes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    const halfW = n.w / 2;
    const halfH = n.type === 'origin' ? 72 : n.h / 2;
    minX = Math.min(minX, n.x - halfW);
    maxX = Math.max(maxX, n.x + halfW);
    minY = Math.min(minY, n.y - halfH);
    maxY = Math.max(maxY, n.y + halfH);
  });
  return { minX, minY, maxX, maxY };
}

export function initInteraction(rootEl, nodes) {
  const viewport = rootEl.querySelector('.pulse-viewport');
  const canvas = rootEl.querySelector('.pulse-canvas');
  const bbox = computeBBox(nodes);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;

  let sx = 0;
  let sy = 0;
  let k = 1;

  const pointers = new Map();
  let pinchLast = null;
  let downInfo = null;
  let suppressClick = false;

  function apply() {
    canvas.style.transform = `translate(${sx}px, ${sy}px) scale(${k})`;
    viewport.classList.toggle('panning', pointers.size > 0);
  }

  function fit() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const pad = 30;
    k = Math.min((vw - pad * 2) / bboxW, (vh - pad * 2) / bboxH);
    if (vw < 700) {
      k = clamp(k, 0.55, 1.1);
    } else {
      k = clamp(k, 0.72, 1.2);
    }
    sx = vw / 2 - centerX * k;
    sy = vh / 2 - centerY * k;
    apply();
  }

  function zoomAt(mx, my, factor) {
    const nk = clamp(k * factor, 0.5, 3.2);
    sx = mx - (mx - sx) * (nk / k);
    sy = my - (my - sy) * (nk / k);
    k = nk;
    apply();
  }

  // ---- 拖拽 / 触屏双指缩放 ----
  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downInfo = { x: e.clientX, y: e.clientY };
      suppressClick = false;
    }
    pinchLast = null;
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);

    if (pointers.size === 1) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (downInfo && Math.abs(e.clientX - downInfo.x) + Math.abs(e.clientY - downInfo.y) > 6) {
        suppressClick = true;
      }
      sx += dx;
      sy += dy;
      p.x = e.clientX;
      p.y = e.clientY;
      apply();
    } else {
      p.x = e.clientX;
      p.y = e.clientY;
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const rect = viewport.getBoundingClientRect();
      const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
      const my = (pts[0].y + pts[1].y) / 2 - rect.top;
      if (pinchLast) {
        zoomAt(mx, my, d / pinchLast.d);
      }
      pinchLast = { d, mx, my };
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchLast = null;
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  // 拖拽后抑制链接跳转
  viewport.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    },
    true
  );

  // ---- hover / 键盘聚焦：高亮整条传承路径 ----
  function setActive(id) {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    const activeBranches = new Set(node.branchPath);
    const ownBranch = node.branchPath[node.branchPath.length - 1];
    const activeNodes = new Set([...node.path, id]);

    rootEl.querySelectorAll('.tree-branch, .tree-sheen, .tree-shadow').forEach((b) => {
      const bid = b.dataset.branch;
      const on = activeBranches.has(bid);
      b.classList.toggle('is-dimmed', !on);
      b.classList.toggle('is-path', on && bid !== ownBranch);
      b.classList.toggle('is-current', bid === ownBranch);
    });

    rootEl.querySelectorAll('.tree-node').forEach((g) => {
      g.classList.toggle('is-dimmed', !activeNodes.has(g.dataset.id));
      g.classList.toggle('is-current', g.dataset.id === id);
      g.classList.toggle('is-path', activeNodes.has(g.dataset.id) && g.dataset.id !== id);
    });
  }

  function clearActive() {
    rootEl.querySelectorAll('.tree-branch, .tree-sheen, .tree-shadow, .tree-node').forEach((el) => {
      el.classList.remove('is-dimmed', 'is-path', 'is-current');
    });
  }

  rootEl.querySelectorAll('.tree-node').forEach((g) => {
    g.addEventListener('mouseenter', () => setActive(g.dataset.id));
    g.addEventListener('mouseleave', clearActive);
    g.addEventListener('focusin', () => setActive(g.dataset.id));
    g.addEventListener('focusout', clearActive);
    g.addEventListener('pointerdown', clearActive);
  });

  // ---- 视口变化时重排 ----
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 160);
  });

  fit();
}