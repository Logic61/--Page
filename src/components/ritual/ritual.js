// 云雷祭阵 v3 几何工具 —— 圆形魔法阵：圆环排布、刻度、星形多边形、缎带、高光
// 复用 array/geometry.js 的周线采样（方阵版历史工具保留），新增圆阵工具。
import { samplesOnSquare, roundSquarePerimeter, perimeterPath } from '../array/geometry.js';

const n2 = (v) => Math.round(v * 10) / 10;

// ===== 方阵工具（保留） =====
export function motifBand(units, H, r, n, { offset = 0, gaps = [], scaleCycle = [1, 0.85, 1.1] } = {}) {
  const pts = samplesOnSquare(H, r, n, { offset, gaps });
  return pts
    .map((p, i) => {
      const raw = units[i % units.length];
      const u = typeof raw === 'string' ? { id: raw } : raw;
      const sc = scaleCycle[i % scaleCycle.length] * (u.scale ?? 1);
      const ang = (Math.atan2(p.ty, p.tx) * 180) / Math.PI + (u.rot ?? 0);
      return `<use href="#${u.id}" transform="translate(${n2(p.x)} ${n2(p.y)}) rotate(${n2(ang)}) scale(${n2(sc)})"/>`;
    })
    .join('');
}

export function wavyRings(H, r, { lines = [-10, 0, 10], waves = 5, amp = 4.5, gaps = [] } = {}) {
  const N = 340;
  const done = lines.map(() => []);
  const cur = lines.map(() => []);
  const inGap = (a) =>
    gaps.some((g) => {
      let d = Math.abs(a - g.angle);
      if (d > 180) d = 360 - d;
      return d < g.half;
    });
  let lastA = null;
  for (let i = 0; i <= N; i++) {
    const p = roundSquarePerimeter(H, r, i / N);
    let a = (Math.atan2(p.y, p.x) * 180) / Math.PI;
    if (lastA !== null) {
      let d = a - lastA;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (Math.abs(d) > 9 || inGap(a)) {
        lines.forEach((_, li) => { done[li].push(cur[li]); cur[li] = []; });
      }
    }
    lines.forEach((off, li) => {
      const perpX = -p.ty;
      const perpY = p.tx;
      const w = Math.sin((i / N) * Math.PI * 2 * waves) * amp + off;
      cur[li].push({ x: p.x + perpX * w, y: p.y + perpY * w });
    });
    lastA = a;
  }
  lines.forEach((_, li) => done[li].push(cur[li]));
  return done.map((segs) =>
    segs
      .filter((s) => s.length > 8)
      .map((s) => 'M ' + s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '))
      .join(' ')
  );
}

export function sheenPath(H, r, { waves = 8, amp = 5, gaps = [] } = {}) {
  const N = 200;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const p = roundSquarePerimeter(H, r, i / N);
    const deg = (Math.atan2(p.y, p.x) * 180) / Math.PI;
    const skip = gaps.some((g) => {
      let d = Math.abs(deg - g.angle);
      if (d > 180) d = 360 - d;
      return d < g.half + 4;
    });
    if (skip) continue;
    const perpX = -p.ty;
    const perpY = p.tx;
    const off = Math.sin((i / N) * Math.PI * 2 * waves) * amp;
    pts.push(`${(p.x + perpX * off).toFixed(1)} ${(p.y + perpY * off).toFixed(1)}`);
  }
  return 'M ' + pts.join(' L ');
}

export function ringPath(H, r) {
  return perimeterPath(H, r, 0, 1, 90);
}

// ===== 圆阵工具 =====
// 沿圆周排布纹样/符文：units 轮换，切线方向放置，可错相、可缩放交替。
export function ringUses(units, radius, count, { offset = 0, scaleCycle = [1], gaps = [] } = {}) {
  const norm = (u) => (typeof u === 'string' ? { id: u } : u);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5 + offset) / count;
    const a = t * 360;
    if (gaps.some((g) => {
      let d = Math.abs(a - g.angle);
      if (d > 180) d = 360 - d;
      return d < g.half;
    })) continue;
    const rad = (a * Math.PI) / 180;
    const u = norm(units[i % units.length]);
    const sc = scaleCycle[i % scaleCycle.length] * (u.scale ?? 1);
    const rot = a + 90 + (u.rot ?? 0);
    out.push(`<use href="#${u.id}" transform="translate(${n2(Math.cos(rad) * radius)} ${n2(Math.sin(rad) * radius)}) rotate(${n2(rot)}) scale(${n2(sc)})"/>`);
  }
  return out.join('');
}

// 圆环刻度：一圈放射短划
export function ringTicks(radius, count, len, { inner = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r1 = radius - inner;
    const r2 = radius + len;
    pts.push(`M ${n2(Math.cos(a) * r1)} ${n2(Math.sin(a) * r1)} L ${n2(Math.cos(a) * r2)} ${n2(Math.sin(a) * r2)}`);
  }
  return `<path class="a-tick" d="${pts.join(' ')}"/>`;
}

// 正多边形路径（八卦八芒 = 两正方形交叠等）
export function polygonPath(sides, radius, rotDeg = 0) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + (rotDeg * Math.PI) / 180;
    pts.push(`${n2(Math.cos(a) * radius)} ${n2(Math.sin(a) * radius)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
