// 椭圆弧线路径 + 端点几何淡入淡出
//
// arcPath：把 cfg 上的椭圆圆心/角度区间转成 SVG path 椭圆弧线（cw, y-down）
//   · M x0 y0 A rx ry 0 largeArc 1 x1 y1
// geomFade：按角度距 enter/exit 端的距离算 0..1 透明度

const n2 = (v) => Math.round(v * 10) / 10;

export function arcPath(cfg, fromDeg, toDeg) {
  return arcAt(cfg, fromDeg, toDeg, 0);
}

// 画半径向外偏移 off 的同心椭圆弧。
// 与 ticks() 同约定：rx 加 off，ry 加 off·(ry/rx) → 偏移方向在椭圆法线上（视觉上是「垂直」通道）。
// 这才能让两条铁轨真的画在通道外侧，而不是和通道同路径叠加。
export function arcAt(cfg, fromDeg, toDeg, off = 0) {
  const rx = cfg.rx + off;
  const ry = cfg.ry + off * (cfg.ry / cfg.rx);
  const t0 = (fromDeg * Math.PI) / 180;
  const t1 = (toDeg * Math.PI) / 180;
  const x0 = n2(cfg.cx + rx * Math.cos(t0));
  const y0 = n2(cfg.cy + ry * Math.sin(t0));
  const x1 = n2(cfg.cx + rx * Math.cos(t1));
  const y1 = n2(cfg.cy + ry * Math.sin(t1));
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${rx} ${ry} 0 ${largeArc} 1 ${x1} ${y1}`;
}

export function geomFade(item, cfg) {
  const d = item.deg;
  const fadeIn = 5;
  const fadeOut = 5;
  const visibleEnd = cfg.genTo - fadeOut;
  const visibleStart = cfg.genFrom + fadeIn;
  if (d <= cfg.genFrom) return 0.30;
  if (d >= cfg.genTo)   return 0.30;
  if (d >= visibleStart && d <= visibleEnd) return 1.0;
  if (d < visibleStart) {
    const t = (d - cfg.genFrom) / fadeIn;
    return +(0.30 + (1 - 0.30) * t).toFixed(3);
  }
  const t = (cfg.genTo - d) / fadeOut;
  return +(0.30 + (1 - 0.30) * t).toFixed(3);
}