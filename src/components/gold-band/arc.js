// 弧线路径 + 端点几何淡入淡出
//
// arcPath：把 cfg 上的圆心/角度区间转成 SVG path 弧线（cw, y-down）
// geomFade：按角度距 enter/exit 端的距离算 0..1 透明度
//   - 内部区间（slotFrom..slotFrom+slotStep*N）返回 1
//   - 端点外扩 6° 之内线性 0.30→1.0，端点处 0.30（与原 mask 方案等价）

const n2 = (v) => Math.round(v * 10) / 10;

export function arcPath(cfg, fromDeg, toDeg) {
  const t0 = (fromDeg * Math.PI) / 180;
  const t1 = (toDeg * Math.PI) / 180;
  const x0 = n2(cfg.cx + cfg.r * Math.cos(t0));
  const y0 = n2(cfg.cy + cfg.r * Math.sin(t0));
  const x1 = n2(cfg.cx + cfg.r * Math.cos(t1));
  const y1 = n2(cfg.cy + cfg.r * Math.sin(t1));
  // 弧度差 < 180° → largeArc=0
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  // SVG y-down，θ 递增 = 顺时针屏幕；sweep=1
  return `M ${x0} ${y0} A ${cfg.r} ${cfg.r} 0 ${largeArc} 1 ${x1} ${y1}`;
}

// genFrom / genTo 是 cfg 上生成弧的角度区间（确保 fade 在端点外就已经为 0.30）
export function geomFade(item, cfg) {
  // item 必须带 deg 字段（圆心角，度）
  const d = item.deg;
  const fadeIn = 5;   // 进入区间端点附近 fadeIn° 内从 0.30 涨到 1
  const fadeOut = 5;  // 离开区间端点附近 fadeOut° 内从 1 跌到 0.30
  const visibleEnd = cfg.genTo - fadeOut;
  const visibleStart = cfg.genFrom + fadeIn;
  if (d <= cfg.genFrom) return 0.30;
  if (d >= cfg.genTo)   return 0.30;
  if (d >= visibleStart && d <= visibleEnd) return 1.0;
  if (d < visibleStart) {
    const t = (d - cfg.genFrom) / fadeIn;        // 0..1
    return +(0.30 + (1 - 0.30) * t).toFixed(3);
  }
  const t = (cfg.genTo - d) / fadeOut;          // 0..1
  return +(0.30 + (1 - 0.30) * t).toFixed(3);
}