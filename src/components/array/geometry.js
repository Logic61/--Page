// 阵图几何 —— 「四方回天式」方阵的圆角矩形周线采样。
// 用法：roundSquarePerimeter(H, r, t) 返回周长上的点与切线方向；
//       bandUses() 沿周线等距排布纹样单元，可留缺口、可错相。
// 坐标系：中心在原点，(H,r) 为该层方阵的半边长与圆角半径。

export function roundSquarePerimeter(H, r, t) {
  const A = H - r;
  const segs = [];
  const line = (x0, y0, x1, y1) => segs.push({ type: 'line', x0, y0, x1, y1, len: Math.hypot(x1 - x0, y1 - y0) });
  const arc = (cx, cy, a0, a1) => segs.push({ type: 'arc', cx, cy, r, a0, a1, len: (a0 - a1) * r });

  // 顺时针，自正东 (H,0) 起
  line(H, 0, H, -A);
  arc(A, -A, 0, -Math.PI / 2);
  line(A, -H, -A, -H);
  arc(-A, -A, -Math.PI / 2, -Math.PI);
  line(-H, -A, -H, A);
  arc(-A, A, Math.PI, Math.PI / 2);
  line(-A, H, A, H);
  arc(A, A, Math.PI / 2, 0);
  line(H, A, H, 0);

  const L = segs.reduce((s, x) => s + x.len, 0);
  let d = ((t % 1) + 1) % 1 * L;
  for (const s of segs) {
    if (d <= s.len) {
      const u = s.len ? d / s.len : 0;
      if (s.type === 'line') {
        const x = s.x0 + (s.x1 - s.x0) * u;
        const y = s.y0 + (s.y1 - s.y0) * u;
        const tx = (s.x1 - s.x0) / s.len;
        const ty = (s.y1 - s.y0) / s.len;
        return { x, y, tx, ty };
      }
      const a = s.a0 + (s.a1 - s.a0) * u;
      const x = s.cx + s.r * Math.cos(a);
      const y = s.cy + s.r * Math.sin(a);
      return { x, y, tx: Math.sin(a), ty: -Math.cos(a) };
    }
    d -= s.len;
  }
  return { x: H, y: 0, tx: 0, ty: -1 };
}

// 沿周线取 n 个采样点（起点错相 offset，可跳过缺口）
export function samplesOnSquare(H, r, n, { offset = 0, gaps = [] } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n + offset;
    const p = roundSquarePerimeter(H, r, t);
    const deg = (Math.atan2(p.y, p.x) * 180) / Math.PI;
    if (gaps.some((g) => {
      let d = Math.abs(deg - g.angle);
      if (d > 180) d = 360 - d;
      return d < g.half;
    })) continue;
    out.push(p);
  }
  return out;
}

// 纹样带：把 unit 沿周线等距排布，各自旋转到切线方向
export function bandUses(unit, H, r, n, { offset = 0, rotExtra = 0, gaps = [] } = {}) {
  const pts = samplesOnSquare(H, r, n, { offset, gaps });
  const n2 = (v) => Math.round(v * 10) / 10;
  return pts
    .map((p) => {
      const ang = (Math.atan2(p.ty, p.tx) * 180) / Math.PI + rotExtra;
      return `<use href="#${unit}" transform="translate(${n2(p.x)} ${n2(p.y)}) rotate(${n2(ang)})"/>`;
    })
    .join('');
}

// 周线路径字符串（用于窃曲大带的“缎带本体”或呼吸高光）
export function perimeterPath(H, r, t0, t1, n = 80) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = roundSquarePerimeter(H, r, t0 + ((t1 - t0) * i) / n);
    pts.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}