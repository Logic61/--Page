#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""金线远山横带（shanhai-ridge-band.svg）生成器。

参考图：399x116 的横条 —— 黑底上一列实心填色的层叠山峦，
由远及近分 3 个明度层次，山脚连成一条实心底边；天空里一枚
实心圆日、几缕横向平云、两三只归鸟。

要点：
* 每一层山都是一条"周期函数"轮廓（所有山峰在 x=0 与 x=W 处
  高度与斜率都为 0），因此整条带子可以横向无缝平铺。
* 峰形用不对称的升余弦：cos(pi*t/2)**p，t 在峰左右取不同的
  半宽，得到圆润而有主次的山头。
"""
import math
import os

W, H = 1600, 460          # 画布
BASE = 430                # 山脚线
BOTTOM = 460              # 底边带下沿

BRIGHT = '#f2d9a4'
GOLD = '#dfb878'
MID = '#c19f66'
DEEP = '#8a7448'
FAR = '#6b5a3c'


def r2(v):
    return round(v, 2)


def esc(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return s if s else '0'


def bump(x, cx, wl, wr, h, p):
    """不对称升余弦峰：在 [cx-wl, cx+wr] 之外为 0。"""
    if x <= cx:
        if wl <= 0 or x <= cx - wl:
            return 0.0
        t = (x - cx) / wl
    else:
        if wr <= 0 or x >= cx + wr:
            return 0.0
        t = (x - cx) / wr
    return h * (math.cos(math.pi * t / 2.0) ** p)


def check_periodic(peaks, name):
    """横向无缝的前提：每座峰都必须完全落在 (0, W) 之内。"""
    for (cx, wl, wr, h, p) in peaks:
        if cx - wl < 6 or cx + wr > W - 6:
            raise SystemExit('%s 的峰 x=%s 离画布边缘太近（%s .. %s），接缝会断开' % (name, cx, cx - wl, cx + wr))


def profile(peaks, x):
    return sum(bump(x, *pk) for pk in peaks)


def ridge_path(peaks, step=4.0, base=BASE):
    """把轮廓采样成一条闭合路径：山脊线 + 底边。"""
    pts = []
    x = 0.0
    while x <= W + 1e-6:
        pts.append((x, base - profile(peaks, x)))
        x += step
    if pts[-1][0] < W:
        pts.append((W, base - profile(peaks, W)))
    d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
    d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
    d.append('L %s %s' % (esc(W), esc(BOTTOM)))
    d.append('L 0 %s Z' % esc(BOTTOM))
    return ' '.join(d)


# ------------------------------------------------------------------ 三层山
# 山峰：(中心 x, 左半宽, 右半宽, 高度, 尖度)
# 三层各自错开，山谷处能看见后一层，山脊互不粘连。
# 参考图的山脊是"沙丘式"的：峰顶圆缓、峰与峰之间只有浅浅的鞍部，
# 所以半宽取得大、尖度指数接近 1，让相邻山峰彼此叠加。
FAR_PEAKS = [
    (420, 200, 220, 118, 1.15),
    (980, 220, 230, 146, 1.1),
    (1400, 180, 170, 108, 1.15),
]

MID_PEAKS = [
    (196, 186, 210, 188, 1.1),
    (620, 230, 250, 262, 1.05),
    (1120, 230, 240, 248, 1.05),
    (1496, 110, 70, 138, 1.1),
]

NEAR_PEAKS = [
    (300, 250, 290, 248, 1.05),
    (860, 290, 310, 300, 1.0),
    (1380, 240, 190, 234, 1.05),
]

CLOUDS = [
    # (x, y, 长, 厚)
    (250, 150, 120, 13),
    (640, 112, 176, 15),
    (1080, 168, 196, 16),
    (1400, 132, 130, 13),
    (860, 246, 110, 11),
]

BIRDS = [
    # (x, y, 尺寸) —— 留在山脊之上的天空里
    (700, 138, 1.7),
    (868, 94, 1.35),
    (1180, 150, 1.5),
]

# 山体内侧的横向"皴纹"：用蒙版把实心色块压出几道浅痕
# 波长必须能整除画布宽度（1600），否则皴纹在接缝处会断开。
TEXTURE = [
    # (基准 y, 振幅, 波长, 相位)
    (232, 9, 400, 0.4),
    (292, 10, 320, 2.1),
    (352, 9, 800, 4.0),
    (404, 8, 400, 1.2),
]

SUN = (500, 82, 56)


def cloud_shape(x, y, length, thick):
    """一枚横向的胶囊形平云。"""
    h = thick / 2.0
    return ('M %s %s L %s %s A %s %s 0 0 1 %s %s L %s %s A %s %s 0 0 1 %s %s Z' % (
        esc(x), esc(y - h),
        esc(x + length - h), esc(y - h),
        esc(h), esc(h), esc(x + length - h), esc(y + h),
        esc(x), esc(y + h),
        esc(h), esc(h), esc(x), esc(y - h)))


def bird(x, y, s):
    return 'M %s %s C %s %s, %s %s, %s %s' % (
        esc(x - 13 * s), esc(y + 5 * s),
        esc(x - 5 * s), esc(y - 7 * s),
        esc(x + 5 * s), esc(y - 7 * s),
        esc(x + 13 * s), esc(y + 5 * s))


def texture_line(y, amp, wavelen, phase):
    pts = []
    x = 0.0
    while x <= W:
        pts.append((x, y + amp * math.sin(2 * math.pi * x / wavelen + phase)))
        x += 8.0
    d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
    d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
    return ' '.join(d)


def build():
    for _peaks, _name in ((FAR_PEAKS, '远山'), (MID_PEAKS, '中山'), (NEAR_PEAKS, '近山')):
        check_periodic(_peaks, _name)
    out = []
    a = out.append
    a('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" fill="none" aria-hidden="true">'
      % (W, H, W, H))
    a('  <defs>')
    a('    <radialGradient id="rbSunHalo">')
    a('      <stop offset="0" stop-color="%s" stop-opacity="0.26"/>' % BRIGHT)
    a('      <stop offset="0.45" stop-color="%s" stop-opacity="0.1"/>' % GOLD)
    a('      <stop offset="1" stop-color="%s" stop-opacity="0"/>' % GOLD)
    a('    </radialGradient>')
    a('    <radialGradient id="rbSun" cx="0.44" cy="0.36" r="0.74">')
    a('      <stop offset="0" stop-color="#fff1d6" stop-opacity="1"/>')
    a('      <stop offset="0.4" stop-color="#f8cd8c" stop-opacity="1"/>')
    a('      <stop offset="0.72" stop-color="#ec9a52" stop-opacity="1"/>')
    a('      <stop offset="1" stop-color="#d96b28" stop-opacity="1"/>')
    a('    </radialGradient>')
    # 参考图是"实心色块"的层次：近山最亮、中山次之、远山最暗，
    # 每层内部近乎平涂，只留一点点自上而下的光感。
    a('    <linearGradient id="rbNear" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
      % (BASE - 320, BOTTOM))
    a('      <stop offset="0" stop-color="#fbe8bd" stop-opacity="0.98"/>')
    a('      <stop offset="0.55" stop-color="%s" stop-opacity="0.95"/>' % BRIGHT)
    a('      <stop offset="1" stop-color="%s" stop-opacity="0.9"/>' % GOLD)
    a('    </linearGradient>')
    a('    <linearGradient id="rbMid" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
      % (BASE - 260, BOTTOM))
    a('      <stop offset="0" stop-color="%s" stop-opacity="0.68"/>' % GOLD)
    a('      <stop offset="1" stop-color="%s" stop-opacity="0.56"/>' % MID)
    a('    </linearGradient>')
    a('    <linearGradient id="rbFar" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
      % (BASE - 140, BOTTOM))
    a('      <stop offset="0" stop-color="%s" stop-opacity="0.42"/>' % MID)
    a('      <stop offset="1" stop-color="%s" stop-opacity="0.3"/>' % FAR)
    a('    </linearGradient>')
    a('    <linearGradient id="rbBase" x1="0" y1="%d" x2="0" y2="%d" gradientUnits="userSpaceOnUse">'
      % (BASE - 6, BOTTOM))
    a('      <stop offset="0" stop-color="%s" stop-opacity="0.94"/>' % BRIGHT)
    a('      <stop offset="0.55" stop-color="%s" stop-opacity="0.82"/>' % GOLD)
    a('      <stop offset="1" stop-color="%s" stop-opacity="0.22"/>' % DEEP)
    a('    </linearGradient>')
    # 近山/中山各挂一层"皴纹"蒙版：白底 + 几道降透明度横痕
    for name, tint in (('Near', '0.72'), ('Mid', '0.8')):
        a('    <mask id="rbTex%s">' % name)
        a('      <rect width="%d" height="%d" fill="#ffffff"/>' % (W, H))
        for (ty, amp, wl, ph) in TEXTURE:
            a('      <path d="%s" stroke="#ffffff" stroke-opacity="%s" stroke-width="9" fill="none" stroke-linecap="round"/>'
              % (texture_line(ty, amp, wl, ph), tint))
        a('    </mask>')
    a('  </defs>')
    a('')
    a('  <!-- 日轮 -->')
    a('  <circle cx="%d" cy="%d" r="%d" fill="url(#rbSunHalo)"/>' % (SUN[0], SUN[1], SUN[2] * 3.4))
    a('  <circle cx="%d" cy="%d" r="%d" fill="url(#rbSun)"/>' % SUN)
    a('')
    a('  <!-- 平云 -->')
    for (x, y, ln, th) in CLOUDS:
        a('  <path d="%s" fill="%s" fill-opacity="0.3"/>' % (cloud_shape(x, y, ln, th), BRIGHT))
    a('')
    a('  <!-- 归鸟 -->')
    for (x, y, s) in BIRDS:
        a('  <path d="%s" stroke="%s" stroke-width="%s" stroke-opacity="0.72" stroke-linecap="round"/>'
          % (bird(x, y, s), BRIGHT, esc(1.5 * s)))
    a('')
    a('  <!-- 远山 -->')
    a('  <path d="%s" fill="url(#rbFar)"/>' % ridge_path(FAR_PEAKS))
    a('  <!-- 中山 -->')
    a('  <path d="%s" fill="url(#rbMid)" mask="url(#rbTexMid)"/>' % ridge_path(MID_PEAKS))
    a('  <!-- 近山 -->')
    a('  <path d="%s" fill="url(#rbNear)" mask="url(#rbTexNear)"/>' % ridge_path(NEAR_PEAKS))
    a('  <!-- 山脚实心底边 -->')
    a('  <rect x="0" y="%d" width="%d" height="%d" fill="url(#rbBase)"/>' % (BASE, W, BOTTOM - BASE))
    a('</svg>')
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dest = os.path.join(root, 'public', 'shanhai', 'shanhai-ridge-band.svg')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    svg = build()
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(svg)
    print('wrote', dest, len(svg), 'chars')
