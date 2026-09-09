// 山海流线 pattern generator v2
// Every curve is mathematically generated:
// - cloud heads: tangent quarter-circle spirals (smooth, no kinks)
// - ribbons: single closed outline paths with tapered tips (no double caps)
// - waves: dense sine samples with tangent spiral curls
// - mountains: rhythmic sharp peaks
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'public', 'shanhai');
fs.mkdirSync(outDir, { recursive: true });

const BRIGHT = '#f6d9a0';
const GOLD = '#dfb878';
const DEEP = '#b08c50';

const r2 = (n) => Math.round(n * 100) / 100;
const esc = (n) => r2(n).toString();

function poly(pts) {
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + esc(p[0]) + ' ' + esc(p[1])).join(' ');
}

function tangentAt(pts, i) {
  const j = Math.min(i + 2, pts.length - 1);
  const k = Math.max(i - 2, 0);
  const dx = pts[j][0] - pts[k][0];
  const dy = pts[j][1] - pts[k][1];
  return Math.atan2(dy, dx);
}

function offsetPoint(pts, i, d) {
  const j = Math.min(i + 1, pts.length - 1);
  const k = Math.max(i - 1, 0);
  const dx = pts[j][0] - pts[k][0];
  const dy = pts[j][1] - pts[k][1];
  const len = Math.hypot(dx, dy) || 1;
  return [pts[i][0] - (dy / len) * d, pts[i][1] + (dx / len) * d];
}

function spiral(cx, cy, r0, r1, theta0, turns, dir = 1, n = 240) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t;
    const th = theta0 + dir * Math.PI * 2 * turns * t;
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  return pts;
}

// curl starting at P with initial direction ta, spiraling to radius r1
function curl(P, ta, r0, r1, turns, dir = 1, n = 130) {
  return spiral(P[0], P[1], r0, r1, ta - Math.PI / 2, turns, dir, n);
}

// tapered ribbon as ONE closed outline path (round joins give pointed tips)
function ribbonPath(pts, width, taperStart = true, taperEnd = true, wScale = 1) {
  const n = pts.length - 1;
  const top = [];
  const bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let f = 1;
    if (taperStart) f *= Math.pow(Math.sin(Math.PI * t), 0.5);
    if (taperEnd) f *= Math.pow(Math.sin(Math.PI * (1 - t)), 0.5);
    const w = width * wScale * f;
    top.push(offsetPoint(pts, i, w));
    bot.push(offsetPoint(pts, i, -w));
  }
  const bottom = poly(bot.slice().reverse()).replace(/^M/, 'L');
  return poly(top) + ' ' + bottom + ' Z';
}

function waveLine(x0, x1, yBase, amp, per, phase, amp2 = 0, n = 340) {
  const pts = [];
  const step = (x1 - x0) / n;
  for (let i = 0; i <= n; i++) {
    const x = x0 + step * i;
    const k = ((x + phase) / per) * Math.PI * 2;
    const k2 = ((x + phase) / per) * Math.PI * 4;
    pts.push([x, yBase + amp * Math.sin(k) + amp2 * Math.sin(k2)]);
  }
  return pts;
}

function peaks(x0, x1, baseY, height, per, phase, sharp = 1.8, scale = 1, n = 560) {
  const pts = [];
  const step = (x1 - x0) / n;
  for (let i = 0; i <= n; i++) {
    const x = x0 + step * i;
    const s = (((x + phase) % per) + per) % per;
    const half = per / 2;
    const dist = Math.abs(s - half);
    const t = Math.max(0, 1 - dist / half);
    pts.push([x, baseY - height * Math.pow(t, sharp) * scale]);
  }
  return pts;
}

// tangent quarter-circle spiral — corrected construction:
// each quarter arc starts exactly where the previous ended and its
// tangent continues the previous tangent, so the head is seamless.
function cloudHead(cx, cy, r0, k, quarters, dir = 1, nPerQuarter = 30) {
  const pts = [];
  let px = cx, py = cy;
  let ang = 0;
  let r = r0;
  for (let q = 0; q < quarters; q++) {
    // start-angle so that arc begins at P with tangent ang
    const phi0 = Math.atan2(-dir * Math.cos(ang), dir * Math.sin(ang));
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const cx2 = px + nx * r * dir;
    const cy2 = py + ny * r * dir;
    const phi1 = phi0 + dir * (Math.PI / 2);
    for (let i = (q === 0 ? 0 : 1); i <= nPerQuarter; i++) {
      const phi = phi0 + (dir * (Math.PI / 2) * i) / nPerQuarter;
      pts.push([cx2 + Math.cos(phi) * r, cy2 + Math.sin(phi) * r]);
    }
    px = cx2 + Math.cos(phi1) * r;
    py = cy2 + Math.sin(phi1) * r;
    ang += dir * (Math.PI / 2);
    r *= k;
  }
  return { pts, tailTangent: ang, tailPoint: pts[pts.length - 1] };
}

function cubic(p0, p1, p2, p3, n = 90) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

function openSvg(w, h, body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" fill="none" stroke-linecap="round" stroke-linejoin="round">\n' + body + '\n</svg>\n';
}
function stroke(d, color, width, op = 1) {
  return '<path d="' + d + '" stroke="' + color + '" stroke-width="' + width + '"' + (op < 1 ? ' opacity="' + op + '"' : '') + '/>';
}

function sunMedallion(cx, cy, r, ticks = 16, tickLen = 5) {
  const parts = [];
  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="' + BRIGHT + '" stroke-width="1.2"/>');
  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r2(r * 0.76) + '" stroke="' + GOLD + '" stroke-width="0.9" opacity="0.95"/>');
  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r2(r * 0.52) + '" stroke="' + GOLD + '" stroke-width="0.7" opacity="0.9"/>');
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r;
    const y1 = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a) * (r + tickLen);
    const y2 = cy + Math.sin(a) * (r + tickLen);
    parts.push('<line x1="' + esc(x1) + '" y1="' + esc(y1) + '" x2="' + esc(x2) + '" y2="' + esc(y2) + '" stroke="' + GOLD + '" stroke-width="0.7" opacity="0.85"/>');
  }
  return parts.join('\n  ');
}

function bird(x, y, s = 1) {
  return 'M ' + esc(x - 8 * s) + ' ' + esc(y) + ' Q ' + esc(x - 4 * s) + ' ' + esc(y - 5 * s) + ' ' + esc(x) + ' ' + esc(y) +
    ' Q ' + esc(x + 4 * s) + ' ' + esc(y - 5 * s) + ' ' + esc(x + 8 * s) + ' ' + esc(y);
}

// tiny 4-point star glyph, stroke-only
function star(x, y, s = 1) {
  return 'M ' + esc(x) + ' ' + esc(y - s) + ' Q ' + esc(x + 0.2 * s) + ' ' + esc(y - 0.2 * s) + ' ' + esc(x + s) + ' ' + esc(y) +
    ' Q ' + esc(x + 0.2 * s) + ' ' + esc(y + 0.2 * s) + ' ' + esc(x) + ' ' + esc(y + s) +
    ' Q ' + esc(x - 0.2 * s) + ' ' + esc(y + 0.2 * s) + ' ' + esc(x - s) + ' ' + esc(y) +
    ' Q ' + esc(x - 0.2 * s) + ' ' + esc(y - 0.2 * s) + ' ' + esc(x) + ' ' + esc(y - s) + ' Z';
}

// partial circular arc, sampled
function arcPts(cx, cy, r, a0, a1, n = 180) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// the 山形印 glyph, reusable at any transform
function sealGlyph() {
  const parts = [];
  parts.push('<rect x="18" y="18" width="114" height="114" rx="8" stroke="' + GOLD + '" stroke-width="1.4"/>');
  parts.push('<rect x="31" y="31" width="88" height="88" rx="5" stroke="' + GOLD + '" stroke-width="0.7" opacity="0.75"/>');
  parts.push(stroke('M 52 96 L 52 78', GOLD, 1.25));
  parts.push(stroke('M 75 96 L 75 66', GOLD, 1.25));
  parts.push(stroke('M 98 96 L 98 78', GOLD, 1.25));
  parts.push(stroke('M 52 96 Q 63.5 89 75 96', GOLD, 1.1));
  parts.push(stroke('M 75 96 Q 86.5 89 98 96', GOLD, 1.1));
  parts.push(stroke('M 48 110 Q 58 105 68 110 T 88 110', DEEP, 0.9, 0.8));
  parts.push(stroke('M 52 118 Q 62 113 72 118 T 92 118', DEEP, 0.8, 0.6));
  return parts.join('\n  ');
}

// ============================================================
// 写意山水 (ink-wash landscape) helpers
// ============================================================

// deterministic rng
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// organic ridge: sum of seeded sines, shaped toward pointed peaks.
// optional env = [{c, w, a}] gaussian masses to compose painterly grouping.
function ridge(x0, x1, baseY, amp, seed, freq = [0.0011, 0.0017, 0.0026], pow = 1.25, step = 3, env = null, peaks = null) {
  const rnd = mulberry32(seed);
  const waves = freq.map((f) => ({ f, a: 0.55 + rnd() * 0.45, p: rnd() * Math.PI * 2 }));
  const envAt = (x) => {
    let v = 0;
    for (const e of env) v += e.a * Math.exp(-((x - e.c) * (x - e.c)) / (2 * e.w * e.w));
    return v;
  };
  let envMax = 1;
  if (env) {
    envMax = 0;
    for (let x = x0; x <= x1; x += 8) envMax = Math.max(envMax, envAt(x));
    if (envMax < 0.05) envMax = 1;
  }
  const bumpAt = (x) => {
    if (!peaks) return 0;
    let v = 0;
    for (const p of peaks) v += p.h * Math.exp(-((x - p.x) * (x - p.x)) / (2 * p.w * p.w));
    return v;
  };
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    let v = 0;
    for (const w of waves) v += Math.sin(x * w.f * 2 * Math.PI + w.p) * w.a;
    v /= waves.length;
    const t = Math.pow((v + 1) / 2, pow);
    const f = env ? envAt(x) / envMax : 1;
    const relief = Math.min(1.25, t * f + bumpAt(x));
    pts.push([x, baseY - amp * relief]);
  }
  return pts;
}

function yAt(pts, x) {
  let best = pts[0];
  for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
  return best[1];
}

function silhouettePath(ridgePts, baseY) {
  const last = ridgePts[ridgePts.length - 1];
  const first = ridgePts[0];
  return poly(ridgePts) + ' L ' + esc(last[0]) + ' ' + esc(baseY) + ' L ' + esc(first[0]) + ' ' + esc(baseY) + ' Z';
}

// shared defs: wash gradients + turbulence displacement + blurs
function inkDefs() {
  return `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#dfb878" stop-opacity="0"/>
    <stop offset="0.55" stop-color="#dfb878" stop-opacity="0.045"/>
    <stop offset="1" stop-color="#dfb878" stop-opacity="0.09"/>
  </linearGradient>
  <radialGradient id="sunHalo">
    <stop offset="0" stop-color="#f6d9a0" stop-opacity="0.30"/>
    <stop offset="0.55" stop-color="#dfb878" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#dfb878" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="sunDisc">
    <stop offset="0" stop-color="#fff6d0" stop-opacity="0.55"/>
    <stop offset="0.6" stop-color="#f6d9a0" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#f6d9a0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e8c47e" stop-opacity="0.58"/>
    <stop offset="0.5" stop-color="#b08c50" stop-opacity="0.24"/>
    <stop offset="1" stop-color="#8a7448" stop-opacity="0.07"/>
  </linearGradient>
  <linearGradient id="mtnSoft" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c8a468" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#8a7448" stop-opacity="0.02"/>
  </linearGradient>
  <linearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c8a468" stop-opacity="0.10"/>
    <stop offset="1" stop-color="#8a7448" stop-opacity="0.01"/>
  </linearGradient>
  <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#dfb878" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#dfb878" stop-opacity="0.85"/>
    <stop offset="1" stop-color="#dfb878" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#dfb878" stop-opacity="0.10"/>
    <stop offset="0.55" stop-color="#b08c50" stop-opacity="0.045"/>
    <stop offset="1" stop-color="#8a7448" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="mistEll">
    <stop offset="0" stop-color="#dfb878" stop-opacity="0.9"/>
    <stop offset="0.6" stop-color="#dfb878" stop-opacity="0.32"/>
    <stop offset="1" stop-color="#dfb878" stop-opacity="0"/>
  </radialGradient>
  <filter id="displace" x="-12%" y="-12%" width="124%" height="124%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="brush" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="2" seed="11" result="n1"/>
    <feDisplacementMap in="SourceGraphic" in2="n1" scale="14" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="2" seed="17" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.95 0" result="alpha"/>
    <feComponentTransfer in="alpha" result="alpha2">
      <feFuncA type="discrete" tableValues="0.35 1 1 0.6 1"/>
    </feComponentTransfer>
    <feComposite in="disp" in2="alpha2" operator="in"/>
  </filter>
  <filter id="blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur10" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="blur4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="blur16" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
</defs>`;
}

// one ink-wash mountain layer: soft wash fill + painted ridge + optional contour
function mountainLayer(o) {
  const r = ridge(o.x0, o.x1, o.baseY, o.amp, o.seed, o.freq, o.pow, 3, o.env, o.peaks);
  const parts = [];
  parts.push('<path d="' + silhouettePath(r, o.baseY) + '" fill="url(#' + o.fill + ')" filter="url(#' + o.blur + ')"/>');
  if (o.strokeW > 0) {
    // dry-brush ridge with a faint offset companion line (hand-inked feel)
    parts.push('<path d="' + poly(r) + '" fill="none" stroke="' + BRIGHT + '" stroke-width="' + o.strokeW + '" opacity="' + o.strokeOp + '" filter="url(#brush)"/>');
    parts.push('<path d="' + poly(r.map((p) => [p[0], p[1] - 1.6])) + '" fill="none" stroke="' + DEEP + '" stroke-width="' + r2(o.strokeW * 0.5) + '" opacity="' + r2(o.strokeOp * 0.55) + '" filter="url(#displace)"/>');
  }
  if (o.contour) {
    const inner = r.map((p) => [p[0], p[1] + (o.baseY - p[1]) * 0.3]);
    parts.push('<path d="' + poly(inner) + '" fill="none" stroke="' + GOLD + '" stroke-width="0.6" opacity="0.22" filter="url(#displace)"/>');
  }
  return parts.join('\n  ');
}

// variable-pressure ridge: short segments with changing width/opacity (笔锋提按)
function brushRidge(r, seed, baseW = 1.2, op = 0.7, segs = 300) {
  const rnd = mulberry32(seed);
  const inner = [];
  const m = r.length;
  const seg = Math.max(2, Math.floor(m / segs));
  for (let i = 0; i + seg < m; i += seg) {
    const a = r[i];
    const b = r[Math.min(i + seg, m - 1)];
    const w = baseW * (0.35 + rnd() * 1.0);
    const o = op * (0.45 + rnd() * 0.55);
    inner.push('<path d="M ' + esc(a[0]) + ' ' + esc(a[1]) + ' L ' + esc(b[0]) + ' ' + esc(b[1]) + '" fill="none" stroke="' + BRIGHT + '" stroke-width="' + r2(w) + '" opacity="' + r2(o) + '"/>');
  }
  return '<g filter="url(#brush)">\n  ' + inner.join('\n  ') + '\n  </g>';
}

// 皴: curved dry-brush texture strokes scattered along a slope (披麻皴)
function cunStrokes(ridgePts, baseY, seed, count = 320, color = DEEP, minOp = 0.08, maxOp = 0.42, wMin = 0.5, wMax = 1.3) {
  const rnd = mulberry32(seed);
  const inner = [];
  const n = ridgePts.length;
  for (let k = 0; k < count; k++) {
    const i = 8 + Math.floor(rnd() * (n - 16));
    const p = ridgePts[i];
    const depth = baseY - p[1];
    if (depth < 10) continue;
    const len = 8 + rnd() * Math.min(depth * 0.5, 48);
    const dir = rnd() < 0.5 ? 1 : -1;
    const lean = 0.25 + rnd() * 0.4;
    const x1 = p[0] + Math.sin(lean) * len * 0.3 * dir;
    const y1 = p[1] + Math.cos(lean) * len * 0.55;
    const x2 = x1 + Math.sin(lean * 1.4) * len * 0.42 * dir;
    const y2 = y1 + Math.cos(lean * 1.4) * len * 0.45;
    const c = rnd() < 0.25 ? GOLD : color;
    inner.push('<path d="M ' + esc(p[0]) + ' ' + esc(p[1]) + ' Q ' + esc(x1) + ' ' + esc(y1) + ' ' + esc(x2) + ' ' + esc(y2) + '" fill="none" stroke="' + c + '" stroke-width="' + r2(wMin + rnd() * (wMax - wMin)) + '" opacity="' + r2(minOp + rnd() * (maxOp - minOp)) + '"/>');
  }
  return '<g filter="url(#brush)">\n  ' + inner.join('\n  ') + '\n  </g>';
}

// drifting mist: soft radial-gradient puff (no blur filter = cheap)
function mist(cx, cy, rx, ry, op, blur = 'blur16') {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#mistEll)" opacity="' + op + '"/>';
}

// wide horizontal mist veil between layers (air perspective, no blur)
function mistBand(y, h, op, blur = 'blur16') {
  return '<rect x="0" y="' + y + '" width="1440" height="' + h + '" fill="url(#mistGrad)" opacity="' + op + '"/>';
}

// brush-pause dots on ridge summits (顿笔)
function peakDots(r, seed, count = 14) {
  const rnd = mulberry32(seed);
  const parts = [];
  const peaks = [];
  for (let i = 6; i < r.length - 6; i++) {
    if (r[i][1] < r[i - 1][1] && r[i][1] < r[i + 1][1]) peaks.push(i);
  }
  peaks.sort((a, b) => r[a][1] - r[b][1]);
  for (let k = 0; k < Math.min(count, peaks.length); k++) {
    const p = r[peaks[k]];
    parts.push('<circle cx="' + esc(p[0]) + '" cy="' + esc(p[1]) + '" r="' + r2(1 + rnd() * 1.4) + '" fill="' + BRIGHT + '" opacity="0.5"/>');
  }
  return '<g filter="url(#blur2)">\n  ' + parts.join('\n  ') + '\n  </g>';
}

// waterfall: three strands + splash mist
function waterfall(x, yTop, yBottom, s = 1) {
  const parts = [];
  const strands = [[0, 1.15, BRIGHT, 0.55], [9, 0.85, GOLD, 0.4], [18, 0.7, DEEP, 0.3]];
  const inner = [];
  for (const [dx, w, c, o] of strands) {
    inner.push('<path d="M ' + (x + dx * s) + ' ' + (yTop + dx * 0.5 * s) + ' C ' + (x + dx * s - 18 * s) + ' ' + (yTop + 80 * s) + ', ' + (x + dx * s + 15 * s) + ' ' + (yBottom - 90 * s) + ', ' + (x + dx * s + 8 * s) + ' ' + yBottom + '" fill="none" stroke="' + c + '" stroke-width="' + w * s + '" opacity="' + o + '"/>');
  }
  parts.push('<g filter="url(#brush)">\n  ' + inner.join('\n  ') + '\n  </g>');
  parts.push(mist(x + 10 * s, yBottom - 6, 74 * s, 24 * s, 0.2, 'blur8'));
  parts.push(mist(x + 12 * s, yBottom + 2, 40 * s, 12 * s, 0.14, 'blur4'));
  return parts.join('\n  ');
}

// expressive ink pine: tapered trunk + needle fans
function pine(x, y, s = 1, seed = 9) {
  const rnd = mulberry32(seed);
  const parts = [];
  parts.push('<path d="M ' + (x - 2 * s) + ' ' + (y + 26 * s) + ' Q ' + (x - 3 * s) + ' ' + (y + 12 * s) + ' ' + x + ' ' + y + '" fill="none" stroke="' + GOLD + '" stroke-width="1.2" opacity="0.8" filter="url(#brush)"/>');
  parts.push('<path d="M ' + (x + 2 * s) + ' ' + (y + 26 * s) + ' Q ' + (x + 3 * s) + ' ' + (y + 12 * s) + ' ' + x + ' ' + y + '" fill="none" stroke="' + DEEP + '" stroke-width="0.8" opacity="0.6" filter="url(#brush)"/>');
  const tiers = [[-12, 2], [-11, -6], [-9, -14]];
  for (const [dx, dy] of tiers) {
    for (let f = -1; f <= 1; f += 1) {
      const bx = x + dx * s * 0.6;
      const by = y + dy * s;
      const ex = bx + (dx * 1.9 + f * 7) * s;
      const ey = by + (6 + Math.abs(f) * 2) * s;
      parts.push('<path d="M ' + esc(bx) + ' ' + esc(by) + ' Q ' + esc(bx + (ex - bx) * 0.5) + ' ' + esc(by - 2 * s) + ' ' + esc(ex) + ' ' + esc(ey) + '" fill="none" stroke="' + GOLD + '" stroke-width="' + r2(0.7 + rnd() * 0.4) + '" opacity="' + r2(0.35 + rnd() * 0.3) + '" filter="url(#brush)"/>');
    }
  }
  return parts.join('\n  ');
}

// little skiff with fisherman and reflection
function boat(x, y, s = 1) {
  const parts = [];
  parts.push('<path d="M ' + (x - 26 * s) + ' ' + (y + 4 * s) + ' Q ' + (x - 8 * s) + ' ' + (y - 6 * s) + ' ' + (x + 26 * s) + ' ' + (y + 4 * s) + '" fill="none" stroke="' + BRIGHT + '" stroke-width="' + r2(1.15 * s) + '" opacity="0.85" filter="url(#displace)"/>');
  parts.push('<line x1="' + x + '" y1="' + (y + 4 * s) + '" x2="' + x + '" y2="' + (y - 14 * s) + '" stroke="' + GOLD + '" stroke-width="' + r2(0.9 * s) + '" opacity="0.75"/>');
  parts.push('<circle cx="' + (x + 12 * s) + '" cy="' + (y - 3 * s) + '" r="' + r2(1.7 * s) + '" fill="' + BRIGHT + '" opacity="0.9"/>');
  parts.push('<path d="M ' + (x - 18 * s) + ' ' + (y + 10 * s) + ' Q ' + x + ' ' + (y + 16 * s) + ' ' + (x + 18 * s) + ' ' + (y + 10 * s) + '" fill="none" stroke="' + DEEP + '" stroke-width="' + r2(0.7 * s) + '" opacity="0.5"/>');
  return parts.join('\n  ');
}

// sun/moon light path on the water: irregular shimmering dashes
function moonReflection(cx, y0, y1, seed = 2, count = 8, maxOp = 0.26) {
  const rnd = mulberry32(seed);
  const inner = [];
  const total = y1 - y0;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const y = y0 + total * (t + rnd() * 0.06);
    const w = 16 + rnd() * 54;
    const x = cx + (rnd() - 0.5) * 60;
    const op = maxOp * (1 - t) + 0.06;
    inner.push('<rect x="' + esc(x - w / 2) + '" y="' + esc(y) + '" width="' + esc(w) + '" height="' + r2(1.6 + rnd() * 1.6) + '" rx="1" fill="' + BRIGHT + '" opacity="' + r2(op) + '"/>');
  }
  return '<g filter="url(#blur4)">\n  ' + inner.join('\n  ') + '\n  </g>';
}

// 面皴: broader soft brush sweeps across the mountain mass
function mianCun(ridgePts, baseY, seed, count = 180, color = DEEP, minOp = 0.12, maxOp = 0.34, wMin = 1.1, wMax = 2.2) {
  const rnd = mulberry32(seed);
  const inner = [];
  const n = ridgePts.length;
  for (let k = 0; k < count; k++) {
    const i = 6 + Math.floor(rnd() * (n - 12));
    const p = ridgePts[i];
    const depth = baseY - p[1];
    if (depth < 20) continue;
    const len = 24 + rnd() * Math.min(depth * 0.6, 80);
    const x1 = p[0] + (rnd() - 0.5) * 30;
    const y1 = p[1] + len * 0.5;
    const x2 = x1 + (rnd() - 0.5) * 16;
    const y2 = p[1] + len;
    inner.push('<path d="M ' + esc(p[0]) + ' ' + esc(p[1]) + ' Q ' + esc(x1) + ' ' + esc(y1) + ' ' + esc(x2) + ' ' + esc(y2) + '" fill="none" stroke="' + color + '" stroke-width="' + r2(wMin + rnd() * (wMax - wMin)) + '" opacity="' + r2(minOp + rnd() * (maxOp - minOp)) + '"/>');
  }
  return '<g filter="url(#brush)">\n  ' + inner.join('\n  ') + '\n  </g>';
}

// scattered water strokes: irregular, dry-brush, denser near the shore
function waterStrokes(x0, x1, y0, y1, seed, count = 90, color = GOLD, minOp = 0.06, maxOp = 0.3) {
  const rnd = mulberry32(seed);
  const inner = [];
  for (let k = 0; k < count; k++) {
    const t = rnd();
    const y = y0 + (y1 - y0) * (t < 0.6 ? (t / 0.6) * 0.45 : 0.45 + ((t - 0.6) / 0.4) * 0.55);
    const x = x0 + rnd() * (x1 - x0);
    const len = 16 + rnd() * 90;
    const bow = (rnd() - 0.5) * 10;
    inner.push('<path d="M ' + esc(x) + ' ' + esc(y) + ' Q ' + esc(x + len / 2) + ' ' + esc(y + bow) + ' ' + esc(x + len) + ' ' + esc(y + bow * 0.6) + '" fill="none" stroke="' + color + '" stroke-width="' + r2(0.45 + rnd() * 0.6) + '" opacity="' + r2(minOp + rnd() * (maxOp - minOp)) + '"/>');
  }
  return '<g filter="url(#brush)">\n  ' + inner.join('\n  ') + '\n  </g>';
}

// quick ink-brush bird
function birdTick(x, y, s = 1) {
  return '<path d="M ' + (x - 9 * s) + ' ' + y + ' Q ' + (x - 4 * s) + ' ' + (y - 6 * s) + ' ' + x + ' ' + y + ' Q ' + (x + 4 * s) + ' ' + (y - 6 * s) + ' ' + (x + 9 * s) + ' ' + y + '" fill="none" stroke="' + BRIGHT + '" stroke-width="0.9" opacity="0.7" filter="url(#displace)"/>';
}

// ============================================================
// scene 1 — 秘闻: sun medallion + mountains + sea
// ============================================================
{
  const parts = [];
  parts.push(sunMedallion(500, 80, 44, 16, 5));

  // spiral ribbons wrapping the sun (single outline, tapered tips)
  parts.push(stroke(ribbonPath(spiral(500, 80, 64, 152, -2.35, 0.75, 1, 260), 5.5), GOLD, 0.95, 0.9));
  parts.push(stroke(ribbonPath(spiral(500, 80, 76, 164, -2.35, 0.75, 1, 260), 5.5, true, true, 0.9), GOLD, 0.8, 0.55));

  // far ridge
  parts.push(stroke(poly(peaks(-24, 668, 250, 42, 118, 0, 1.9)), GOLD, 0.9, 0.7));
  parts.push(stroke(poly(peaks(-24, 668, 250, 42, 118, 0, 1.9, 0.58)), DEEP, 0.6, 0.55));
  parts.push(stroke(poly(peaks(-24, 668, 250, 42, 118, 0, 1.9, 0.26)), DEEP, 0.5, 0.4));

  // near ridge
  parts.push(stroke(poly(peaks(-24, 668, 336, 70, 150, 70, 1.8)), GOLD, 1.05, 0.85));
  parts.push(stroke(poly(peaks(-24, 668, 336, 70, 150, 70, 1.8, 0.58)), DEEP, 0.65, 0.6));
  parts.push(stroke(poly(peaks(-24, 668, 336, 70, 150, 70, 1.8, 0.28)), DEEP, 0.5, 0.45));

  // sea rows with tangent curls
  const rows = [
    { y: 364, amp: 5, per: 150, phase: 27.5, amp2: 1.5, curlX: 310, r0: 6, r1: 1.6, turns: 1.8 },
    { y: 388, amp: 4.5, per: 170, phase: 92.5, amp2: 1.3, curlX: 120, r0: 5, r1: 1.5, turns: 1.7 },
    { y: 408, amp: 3.5, per: 190, phase: 137.5, amp2: 1, curlX: 480, r0: 4.5, r1: 1.4, turns: 1.6 },
  ];
  for (const row of rows) {
    const w = waveLine(-14, 656, row.y, row.amp, row.per, row.phase, row.amp2);
    parts.push(stroke(poly(w), GOLD, 0.95, 0.75));
    let ci = 0;
    for (let i = 0; i < w.length; i++) if (Math.abs(w[i][0] - row.curlX) < Math.abs(w[ci][0] - row.curlX)) ci = i;
    const ta = tangentAt(w, ci);
    parts.push(stroke(poly(curl(w[ci], ta, row.r0, row.r1, row.turns, 1, 130)), GOLD, 0.8, 0.7));
  }
  const w1 = waveLine(-14, 656, 364, 5, 150, 27.5, 1.5);
  parts.push(stroke(poly(w1.map((p, i) => offsetPoint(w1, i, 10))), DEEP, 0.6, 0.5));

  parts.push(stroke(bird(242, 62, 0.9), BRIGHT, 0.9, 0.85));
  parts.push(stroke(bird(288, 54, 0.8), BRIGHT, 0.9, 0.75));

  // faint star dust in the open middle area
  parts.push(stroke(star(336, 122, 3), BRIGHT, 0.7, 0.5));
  parts.push(stroke(star(396, 156, 2.2), BRIGHT, 0.7, 0.42));
  parts.push(stroke(star(452, 104, 2.6), BRIGHT, 0.7, 0.48));
  parts.push(stroke(star(548, 196, 2), BRIGHT, 0.7, 0.4));

  fs.writeFileSync(path.join(outDir, 'shanhai-scene.svg'), openSvg(640, 420, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// scene 2 — 常识: large spiral cloud + mountains + sea
// ============================================================
{
  const parts = [];

  const head = cloudHead(140, 96, 5, 1.4, 7, 1);
  parts.push(stroke(ribbonPath(head.pts, 6.5, true, false), GOLD, 1.05, 0.9));

  const E = head.tailPoint;
  const ta = head.tailTangent;
  const tail = cubic(
    E,
    [E[0] + Math.cos(ta) * 70, E[1] + Math.sin(ta) * 70],
    [330, 148],
    [370, 166]
  );
  parts.push(stroke(ribbonPath(tail, 5.5, false, true), GOLD, 1, 0.8));
  // wisp curl at tail end
  const tta = tangentAt(tail, tail.length - 1);
  parts.push(stroke(poly(curl(tail[tail.length - 1], tta, 4, 1.2, 1.6, 1, 100)), GOLD, 0.7, 0.55));

  const head2 = cloudHead(288, 72, 4, 1.4, 5, 1);
  parts.push(stroke(ribbonPath(head2.pts, 4.5, true, false), GOLD, 0.9, 0.7));
  const E2 = head2.tailPoint;
  const ta2 = head2.tailTangent;
  const tailS = cubic(E2, [E2[0] + Math.cos(ta2) * 44, E2[1] + Math.sin(ta2) * 44], [382, 94], [412, 106]);
  parts.push(stroke(ribbonPath(tailS, 4, false, true), GOLD, 0.8, 0.55));

  // ridges on the right side only
  parts.push(stroke(poly(peaks(300, 688, 252, 40, 120, 20, 1.9)), GOLD, 0.9, 0.7));
  parts.push(stroke(poly(peaks(300, 688, 252, 40, 120, 20, 1.9, 0.58)), DEEP, 0.6, 0.55));
  parts.push(stroke(poly(peaks(300, 688, 252, 40, 120, 20, 1.9, 0.26)), DEEP, 0.5, 0.4));
  parts.push(stroke(poly(peaks(330, 688, 340, 66, 140, 90, 1.8)), GOLD, 1.05, 0.85));
  parts.push(stroke(poly(peaks(330, 688, 340, 66, 140, 90, 1.8, 0.58)), DEEP, 0.65, 0.6));
  parts.push(stroke(poly(peaks(330, 688, 340, 66, 140, 90, 1.8, 0.28)), DEEP, 0.5, 0.45));

  const rows = [
    { y: 364, amp: 5, per: 150, phase: 27.5, amp2: 1.5, curlX: 420, r0: 6, r1: 1.6, turns: 1.8 },
    { y: 388, amp: 4.5, per: 170, phase: 92.5, amp2: 1.3, curlX: 190, r0: 5, r1: 1.5, turns: 1.7 },
    { y: 408, amp: 3.5, per: 190, phase: 137.5, amp2: 1, curlX: 540, r0: 4.5, r1: 1.4, turns: 1.6 },
  ];
  for (const row of rows) {
    const w = waveLine(-14, 656, row.y, row.amp, row.per, row.phase, row.amp2);
    parts.push(stroke(poly(w), GOLD, 0.95, 0.75));
    let ci = 0;
    for (let i = 0; i < w.length; i++) if (Math.abs(w[i][0] - row.curlX) < Math.abs(w[ci][0] - row.curlX)) ci = i;
    const ta = tangentAt(w, ci);
    parts.push(stroke(poly(curl(w[ci], ta, row.r0, row.r1, row.turns, 1, 130)), GOLD, 0.8, 0.7));
  }

  parts.push(stroke(bird(470, 132, 0.9), BRIGHT, 0.9, 0.85));
  parts.push(stroke(bird(522, 120, 0.8), BRIGHT, 0.9, 0.75));

  // faint star dust near the clouds
  parts.push(stroke(star(252, 122, 3), BRIGHT, 0.7, 0.5));
  parts.push(stroke(star(280, 176, 2.2), BRIGHT, 0.7, 0.42));
  parts.push(stroke(star(428, 150, 2.4), BRIGHT, 0.7, 0.45));

  fs.writeFileSync(path.join(outDir, 'shanhai-scene-2.svg'), openSvg(640, 420, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// mini vertical scene
// ============================================================
{
  const parts = [];
  parts.push(sunMedallion(150, 58, 22, 12, 3.5));

  parts.push(stroke(poly(peaks(-12, 312, 216, 30, 92, 0, 1.9)), GOLD, 0.85, 0.7));
  parts.push(stroke(poly(peaks(-12, 312, 216, 30, 92, 0, 1.9, 0.55)), DEEP, 0.55, 0.5));
  parts.push(stroke(poly(peaks(-12, 312, 292, 52, 118, 46, 1.8)), GOLD, 1, 0.85));
  parts.push(stroke(poly(peaks(-12, 312, 292, 52, 118, 46, 1.8, 0.58)), DEEP, 0.6, 0.6));
  parts.push(stroke(poly(peaks(-12, 312, 292, 52, 118, 46, 1.8, 0.3)), DEEP, 0.5, 0.45));

  const rows = [
    { y: 354, amp: 4, per: 110, phase: 37.5, amp2: 1.1, curlX: 90, r0: 5, r1: 1.4, turns: 1.7 },
    { y: 384, amp: 3.5, per: 130, phase: 52.5, amp2: 0.9, curlX: 210, r0: 4.5, r1: 1.3, turns: 1.6 },
    { y: 408, amp: 3, per: 150, phase: 67.5, amp2: 0.8, curlX: 60, r0: 4, r1: 1.2, turns: 1.5 },
  ];
  for (const row of rows) {
    const w = waveLine(-6, 306, row.y, row.amp, row.per, row.phase, row.amp2);
    parts.push(stroke(poly(w), GOLD, 0.85, 0.75));
    let ci = 0;
    for (let i = 0; i < w.length; i++) if (Math.abs(w[i][0] - row.curlX) < Math.abs(w[ci][0] - row.curlX)) ci = i;
    const ta = tangentAt(w, ci);
    parts.push(stroke(poly(curl(w[ci], ta, row.r0, row.r1, row.turns, 1, 110)), GOLD, 0.7, 0.7));
  }

  parts.push(stroke(bird(226, 92, 0.9), BRIGHT, 0.9, 0.85));

  fs.writeFileSync(path.join(outDir, 'shanhai-mini.svg'), openSvg(300, 420, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// single spiral cloud mark
// ============================================================
{
  const parts = [];
  const head = cloudHead(74, 84, 4, 1.4, 7, 1);
  parts.push(stroke(ribbonPath(head.pts, 7, true, false), GOLD, 1.3, 0.9));

  const E = head.tailPoint;
  const ta = head.tailTangent;
  const tail = cubic(
    E,
    [E[0] + Math.cos(ta) * 46, E[1] + Math.sin(ta) * 46],
    [166, 96],
    [188, 100]
  );
  parts.push(stroke(ribbonPath(tail, 5, false, true), GOLD, 1.1, 0.7));
  const tta = tangentAt(tail, tail.length - 1);
  parts.push(stroke(poly(curl(tail[tail.length - 1], tta, 3.6, 1.1, 1.5, 1, 90)), GOLD, 0.8, 0.5));

  fs.writeFileSync(path.join(outDir, 'shanhai-cloud.svg'), openSvg(200, 160, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// mountain-water seal — proper seal glyph
// ============================================================
{
  const parts = [];
  parts.push('<rect x="18" y="18" width="114" height="114" rx="8" stroke="' + GOLD + '" stroke-width="1.4"/>');
  parts.push('<rect x="31" y="31" width="88" height="88" rx="5" stroke="' + GOLD + '" stroke-width="0.7" opacity="0.75"/>');
  // 山: three verticals + rounded base
  parts.push(stroke('M 52 96 L 52 78', GOLD, 1.25));
  parts.push(stroke('M 75 96 L 75 66', GOLD, 1.25));
  parts.push(stroke('M 98 96 L 98 78', GOLD, 1.25));
  parts.push(stroke('M 52 96 Q 63.5 89 75 96', GOLD, 1.1));
  parts.push(stroke('M 75 96 Q 86.5 89 98 96', GOLD, 1.1));
  // 水: two quiet waves
  parts.push(stroke('M 48 110 Q 58 105 68 110 T 88 110', DEEP, 0.9, 0.8));
  parts.push(stroke('M 52 118 Q 62 113 72 118 T 92 118', DEEP, 0.8, 0.6));
  fs.writeFileSync(path.join(outDir, 'shanhai-seal.svg'), openSvg(150, 150, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// wave hem band — periodic frieze, seamless
// ============================================================
{
  const unit = (tx) => {
    const parts = [];
    const w = waveLine(0, 200, 30, 7, 200, 0, 2);
    const shifted = w.map((p) => [p[0] + tx, p[1]]);
    parts.push(stroke(poly(shifted), GOLD, 0.95, 0.85));
    const off = w.map((p, i) => offsetPoint(w, i, 8));
    const shifted2 = off.map((p) => [p[0] + tx, p[1]]);
    parts.push(stroke(poly(shifted2), DEEP, 0.7, 0.55));
    let ci = 0;
    for (let i = 0; i < w.length; i++) if (Math.abs(w[i][0] - 50) < Math.abs(w[ci][0] - 50)) ci = i;
    const ta = tangentAt(w, ci);
    const c = curl(w[ci], ta, 6, 1.5, 1.7, 1, 120).map((p) => [p[0] + tx, p[1]]);
    parts.push(stroke(poly(c), GOLD, 0.85, 0.8));
    return parts.join('\n  ');
  };
  const parts = ['<line x1="0" y1="52" x2="800" y2="52" stroke="' + GOLD + '" stroke-width="0.8" opacity="0.7"/>'];
  for (const tx of [0, 200, 400, 600]) parts.push(unit(tx));
  fs.writeFileSync(path.join(outDir, 'shanhai-wave-band.svg'), openSvg(800, 60, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// flow band — calm parallel-flow page texture, seamless
// ============================================================
{
  const unit = (tx) => {
    const parts = [];
    const lines = [
      { y: 34, color: GOLD, w: 0.8, op: 0.8 },
      { y: 52, color: DEEP, w: 0.7, op: 0.7 },
      { y: 70, color: GOLD, w: 0.8, op: 0.7 },
      { y: 88, color: DEEP, w: 0.7, op: 0.6 },
      { y: 106, color: GOLD, w: 0.8, op: 0.6 },
    ];
    // all lines share the same phase -> constant spacing, calm rhythm
    for (const L of lines) {
      const w = waveLine(0, 200, L.y, 5, 200, 0);
      parts.push(stroke(poly(w.map((p) => [p[0] + tx, p[1]])), L.color, L.w, L.op));
    }
    // one spiral curl per unit, riding line 3
    const w3 = waveLine(0, 200, 70, 5, 200, 0);
    let ci = 0;
    for (let i = 0; i < w3.length; i++) if (Math.abs(w3[i][0] - 150) < Math.abs(w3[ci][0] - 150)) ci = i;
    const ta = tangentAt(w3, ci);
    parts.push(stroke(poly(curl(w3[ci], ta, 5, 1.5, 1.6, 1, 110).map((p) => [p[0] + tx, p[1]])), GOLD, 0.7, 0.7));
    return parts.join('\n  ');
  };
  const parts = [];
  for (const tx of [0, 200, 400, 600]) parts.push(unit(tx));
  fs.writeFileSync(path.join(outDir, 'shanhai-flow-band.svg'), openSvg(800, 120, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// 山海简图 helpers — 平滑山脊 / 海波 / 祥云涡纹 / 飞鸟
// ============================================================
// Catmull-Rom → cubic Bézier：一条山脊只用一根平滑曲线
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = 'M ' + esc(pts[0][0]) + ' ' + esc(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C ' + esc(c1[0]) + ' ' + esc(c1[1]) + ', ' + esc(c2[0]) + ' ' + esc(c2[1]) + ', ' + esc(p2[0]) + ' ' + esc(p2[1]);
  }
  return d;
}

// 等距正弦海波，两端渐隐，只留四道细线
function seaWavePts(y, amp, cycles, phase, x0 = 40, x1 = 1400, n = 44, damp = true) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const edge = damp ? Math.min(1, t * 5, (1 - t) * 5) : 1;
    pts.push([x, y + Math.sin((t * cycles + phase) * Math.PI * 2) * amp * edge]);
  }
  return pts;
}

// 祥云涡纹：复用 spiral 采样，点数少而圆润
function spiralCloud(cx, cy, R, turns = 1.35, dir = 1) {
  return poly(spiral(cx, cy, R, 1.5, -Math.PI / 2, turns, dir, Math.round(turns * 26)));
}

// 写意飞鸟（两笔成「人」）
function birdV(x, y, s = 8, op = 0.65) {
  return stroke('M ' + esc(x - s) + ' ' + esc(y + s * 0.55) + ' Q ' + esc(x) + ' ' + esc(y - s) + ' ' + esc(x + s) + ' ' + esc(y + s * 0.55), BRIGHT, 1.1, op);
}

// ============================================================
// panorama 1 — 秘闻: 山海简图 (清爽开阔 · 日居右上) 1440x900
// ============================================================
{
  const parts = [];
  parts.push(inkDefs());
  parts.push('<rect width="1440" height="900" fill="url(#sky)"/>');

  // 日轮居右上：柔光 + 三圈
  parts.push('<circle cx="1040" cy="148" r="108" fill="url(#sunHalo)"/>');
  parts.push('<circle cx="1040" cy="148" r="72" fill="url(#sunDisc)"/>');
  parts.push('<circle cx="1040" cy="148" r="74" stroke="' + GOLD + '" stroke-width="0.9" opacity="0.3"/>');
  parts.push('<circle cx="1040" cy="148" r="46" stroke="' + GOLD + '" stroke-width="1.7" opacity="0.85"/>');
  parts.push('<circle cx="1040" cy="148" r="30" stroke="' + DEEP + '" stroke-width="0.7" opacity="0.45"/>');
  parts.push(stroke('M 856 64 Q 1040 -28 1224 64', GOLD, 0.9, 0.2));

  // 三朵祥云，各带一条尾
  parts.push(stroke(spiralCloud(200, 118, 15), GOLD, 1.2, 0.6));
  parts.push(stroke('M 202 133 Q 168 152 130 138 Q 104 128 78 141', GOLD, 1.2, 0.6));
  parts.push(stroke(spiralCloud(640, 84, 12), GOLD, 1.2, 0.6));
  parts.push(stroke('M 642 96 Q 676 107 710 95', GOLD, 1.2, 0.6));
  parts.push(stroke(spiralCloud(1152, 246, 14), GOLD, 1.2, 0.55));
  parts.push(stroke('M 1154 260 Q 1190 276 1226 262', GOLD, 1.2, 0.55));

  // 三只飞鸟
  parts.push(birdV(322, 322, 8));
  parts.push(birdV(368, 294, 9));
  parts.push(birdV(410, 324, 7, 0.55));

  // 雾带分层：远山与近山各一条平滑曲线
  parts.push(mistBand(430, 88, 0.12));
  parts.push(stroke(smoothPath([[40, 452], [150, 418], [270, 448], [390, 402], [510, 450], [630, 412], [750, 452], [870, 416], [990, 454], [1110, 428], [1230, 456], [1350, 430], [1400, 446]]), DEEP, 1.1, 0.5));
  parts.push(mistBand(520, 76, 0.13));
  parts.push(stroke(smoothPath([[40, 548], [200, 494], [360, 548], [520, 480], [660, 546], [800, 502], [960, 548], [1120, 492], [1260, 546], [1400, 516]]), GOLD, 1.5, 0.7));
  parts.push(mistBand(590, 74, 0.14));

  // 海：四道细波 + 三个水涡
  parts.push('<rect x="0" y="700" width="1440" height="200" fill="url(#water)"/>');
  for (const [y, amp, cycles, phase, op] of [[655, 7, 3.5, 0, 0.5], [704, 8, 4.5, 0.3, 0.42], [753, 9, 5.5, 0.15, 0.34], [802, 10, 6.5, 0.45, 0.26]]) {
    parts.push(stroke(smoothPath(seaWavePts(y, amp, cycles, phase)), GOLD, 1, op));
  }
  for (const [cx, cy, r] of [[250, 758, 7], [985, 712, 8], [1240, 786, 6]]) {
    parts.push(stroke(spiralCloud(cx, cy, r, 1.1), GOLD, 0.8, 0.42));
  }

  // 左下角山形印
  parts.push('<g transform="translate(84,700) scale(0.62) rotate(-4 75 75)" opacity="0.62">');
  parts.push(sealGlyph());
  parts.push('</g>');

  fs.writeFileSync(path.join(outDir, 'shanhai-panorama.svg'), openSvg(1440, 900, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// panorama 2 — 常识: 山海简图 · 晨读平远 (日出左上 · 长云横空)
// 与秘闻页同一套勾线语言，但构图不再镜像：日出左上角，
// 长云贴着天顶掠过、始终高过标题；山基线整体下移，天高地阔。
// ============================================================
{
  const parts = [];
  parts.push(inkDefs());
  parts.push('<rect width="1440" height="900" fill="url(#sky)"/>');

  // 日出左上角：比秘闻页的日轮小一圈，晨光不压正文
  parts.push('<circle cx="130" cy="120" r="72" fill="url(#sunHalo)"/>');
  parts.push('<circle cx="130" cy="120" r="48" fill="url(#sunDisc)"/>');
  parts.push('<circle cx="130" cy="120" r="50" stroke="' + GOLD + '" stroke-width="0.8" opacity="0.28"/>');
  parts.push('<circle cx="130" cy="120" r="30" stroke="' + GOLD + '" stroke-width="1.5" opacity="0.85"/>');
  parts.push('<circle cx="130" cy="120" r="19" stroke="' + DEEP + '" stroke-width="0.6" opacity="0.45"/>');

  // 长云横空：涡纹居上，长尾贴天顶向左掠过，全程高于眉题
  parts.push(stroke(spiralCloud(600, 108, 15), GOLD, 1.2, 0.6));
  parts.push(stroke('M 588 110 Q 500 116 420 100 Q 360 90 300 100', GOLD, 1.2, 0.6));
  parts.push(stroke(spiralCloud(890, 80, 11), GOLD, 1.2, 0.6));
  parts.push(stroke('M 892 91 Q 924 102 956 91', GOLD, 1.2, 0.6));
  parts.push(stroke(spiralCloud(1190, 230, 14), GOLD, 1.2, 0.55));
  parts.push(stroke('M 1192 244 Q 1226 260 1262 244', GOLD, 1.2, 0.55));

  // 三只飞鸟居右，避开标题与简介区
  parts.push(birdV(996, 296, 8));
  parts.push(birdV(1038, 270, 9));
  parts.push(birdV(1084, 298, 7, 0.55));

  // 平远式低丘：山基线整体比秘闻页低，天高地阔
  parts.push(mistBand(448, 80, 0.12));
  parts.push(stroke(smoothPath([[40, 478], [150, 452], [270, 474], [390, 436], [510, 476], [630, 450], [750, 478], [870, 452], [990, 478], [1110, 458], [1230, 478], [1350, 462], [1400, 472]]), DEEP, 1.1, 0.5));
  parts.push(mistBand(540, 70, 0.13));
  parts.push(stroke(smoothPath([[40, 574], [200, 528], [360, 572], [520, 518], [660, 572], [800, 536], [960, 572], [1120, 528], [1260, 570], [1400, 550]]), GOLD, 1.5, 0.7));
  parts.push(mistBand(606, 66, 0.14));

  // 海：四道细波 + 三个水涡
  parts.push('<rect x="0" y="700" width="1440" height="200" fill="url(#water)"/>');
  for (const [y, amp, cycles, phase, op] of [[655, 7, 3.5, 0.5, 0.5], [704, 8, 4.5, 0.75, 0.42], [753, 9, 5.5, 0.1, 0.34], [802, 10, 6.5, 0.4, 0.26]]) {
    parts.push(stroke(smoothPath(seaWavePts(y, amp, cycles, phase)), GOLD, 1, op));
  }
  for (const [cx, cy, r] of [[320, 748, 7], [840, 716, 8], [1150, 782, 6]]) {
    parts.push(stroke(spiralCloud(cx, cy, r, 1.1), GOLD, 0.8, 0.42));
  }

  // 右下角山形印
  parts.push('<g transform="translate(1284,700) scale(0.62) rotate(4 75 75)" opacity="0.62">');
  parts.push(sealGlyph());
  parts.push('</g>');

  fs.writeFileSync(path.join(outDir, 'shanhai-panorama-2.svg'), openSvg(1440, 900, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// side scroll — 左卷: 山 (祥云当空, 无日月) 480x1280
// ============================================================
function sideMountain() {
  const parts = [];
  parts.push(inkDefs());
  parts.push('<rect width="480" height="1280" fill="url(#sky)"/>');

  // 顶部两朵祥云
  parts.push(stroke(spiralCloud(150, 128, 17), GOLD, 1.4, 0.6));
  parts.push(stroke('M 152 145 Q 120 166 88 150', GOLD, 1.4, 0.6));
  parts.push(stroke(spiralCloud(310, 84, 12), GOLD, 1.2, 0.5));
  parts.push(stroke('M 312 96 Q 344 108 376 96', GOLD, 1.2, 0.5));

  // 两只飞鸟
  parts.push(birdV(90, 330, 7));
  parts.push(birdV(142, 300, 8));

  // 两带山脊，自左上向右下缓缓斜行
  parts.push(mistBand(360, 90, 0.12));
  parts.push(stroke(smoothPath([[-10, 380], [70, 350], [150, 410], [240, 360], [330, 430], [420, 395], [500, 445]]), DEEP, 1.2, 0.5));
  parts.push(mistBand(470, 90, 0.13));
  parts.push(stroke(smoothPath([[-10, 520], [80, 480], [170, 545], [260, 500], [350, 565], [440, 525], [500, 570]]), GOLD, 1.5, 0.7));
  parts.push(mistBand(580, 90, 0.14));

  // 山脚海面：四道细波 + 三个水涡
  parts.push('<rect x="0" y="640" width="480" height="640" fill="url(#water)"/>');
  for (const [y, amp, cycles, phase, op] of [[700, 6, 2.2, 0, 0.5], [790, 7, 2.6, 0.3, 0.42], [880, 8, 3, 0.1, 0.34], [970, 9, 3.4, 0.4, 0.26]]) {
    parts.push(stroke(smoothPath(seaWavePts(y, amp, cycles, phase, 20, 460)), GOLD, 1, op));
  }
  for (const [cx, cy, r] of [[300, 760, 6], [140, 900, 7], [360, 1000, 5]]) {
    parts.push(stroke(spiralCloud(cx, cy, r, 1.1), GOLD, 0.8, 0.4));
  }

  // 左下角山形印
  parts.push('<g transform="translate(28,1090) scale(0.5) rotate(-5 75 75)" opacity="0.6">');
  parts.push(sealGlyph());
  parts.push('</g>');

  fs.writeFileSync(path.join(outDir, 'shanhai-side-left.svg'), openSvg(480, 1280, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// side scroll — 右卷: 海 (一弯新月 + 四行长浪) 480x1280
// ============================================================
function sideSea() {
  const parts = [];
  parts.push(inkDefs());
  parts.push('<rect width="480" height="1280" fill="url(#sky)"/>');

  // 一弯新月居右上
  parts.push('<circle cx="424" cy="136" r="90" fill="url(#sunHalo)"/>');
  parts.push('<path d="M 424 96 A 56 56 0 1 0 424 184 A 46 46 0 1 1 424 96 Z" fill="url(#sunDisc)" stroke="' + BRIGHT + '" stroke-width="1.1" opacity="0.95"/>');

  // 两只飞鸟
  parts.push(birdV(300, 340, 7));
  parts.push(birdV(352, 310, 8));

  // 远处一痕低岸
  parts.push(mistBand(540, 70, 0.12));
  parts.push(stroke(smoothPath([[-10, 620], [90, 590], [190, 630], [290, 595], [390, 630], [500, 600]]), DEEP, 1.1, 0.45));

  // 万顷海面：四行长浪 + 三个大螺卷
  parts.push('<rect x="0" y="660" width="480" height="620" fill="url(#water)"/>');
  for (const [y, amp, cycles, phase, op] of [[720, 9, 2.6, 0.15, 0.5], [810, 8, 3, 0.45, 0.42], [900, 7, 3.4, 0.05, 0.34], [990, 6, 3.8, 0.35, 0.26]]) {
    parts.push(stroke(smoothPath(seaWavePts(y, amp, cycles, phase, 10, 470)), BRIGHT, 1.1, op));
  }
  for (const [cx, cy, r] of [[160, 800, 8], [380, 950, 7], [250, 1060, 6]]) {
    parts.push(stroke(spiralCloud(cx, cy, r, 1.2), GOLD, 0.8, 0.42));
  }

  // 一叶扁舟
  parts.push(stroke('M 292 1148 Q 310 1160 328 1148', GOLD, 1.2, 0.55));
  parts.push(stroke('M 310 1148 L 310 1124', GOLD, 1, 0.5));
  parts.push(stroke('M 311 1126 Q 321 1130 326 1138', GOLD, 1, 0.5));

  // 右下角山形印
  parts.push('<g transform="translate(392,1100) scale(0.5) rotate(5 75 75)" opacity="0.6">');
  parts.push(sealGlyph());
  parts.push('</g>');

  fs.writeFileSync(path.join(outDir, 'shanhai-side-right.svg'), openSvg(480, 1280, '  ' + parts.join('\n  ') + '\n'));
}

// ============================================================
// side scrolls — 文章页两侧固定长卷: 左山右海
// ============================================================
sideMountain();
sideSea();

// ============================================================
// water hem band — 文章页底部固定海水纹 (800x70, seamless)
// 只留两道细波，首尾相位对齐可无缝平铺
// ============================================================
{
  const parts = [];
  parts.push(inkDefs());
  parts.push('<rect x="0" y="0" width="800" height="70" fill="url(#water)"/>');
  parts.push(stroke(smoothPath(seaWavePts(24, 6, 3, 0, 0, 800, 60, false)), GOLD, 0.9, 0.34));
  parts.push(stroke(smoothPath(seaWavePts(46, 5, 4, 0.3, 0, 800, 60, false)), DEEP, 0.8, 0.24));
  fs.writeFileSync(path.join(outDir, 'shanhai-water-hem.svg'), openSvg(800, 70, '  ' + parts.join('\n  ') + '\n'));
}

console.log('generated svgs in public/shanhai');
