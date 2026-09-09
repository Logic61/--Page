#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""版画（木刻）风格背景横带：日月星辰山川。

参考图（用户提供）风格要点：深褐近黑的墨地 + 明亮金线（#d4a017 系），
纹样语言是祥云卷头、水波纹、同心圆光轮、星点、飞檐线。

本次按"版画 / 木刻"重做，刻意避开"细线插画 / 矢量插画"：
    1) 三块实心平面：远山=实心暗金面，中山=实心金面，近山=实心墨面；
       刻掉的线（黑）与留金的面（金）互为阴阳，是木刻的基本语言。
    2) 山脊为手工设计的控制点 + 周期性 Catmull-Rom 插值 + 岩体噪声，
       峰形有主次、有陡缓、有侧肩，不做周期函数（避免"正弦波"）。
    3) 粗轮廓 + 崩刀断笔：主轮廓分段绘制，段间留缺口。
    4) 有序排线（山体阴影、浪面）与点刻（星空、水面、岩面）。
    5) 层岩线（等高线）：山体内与山脊平行的刻线，同样随机崩断。
    6) 二方连续：全部元素按 1600 周期，横向无缝平铺。
    7) 套色错版：近山轮廓重描一层偏移 2.6px 的暗金（印痕感）。

输出：
    public/banhua/banhua-riyue-chuanshan.svg   主背景
    public/banhua/banhua-paper.svg             纸纹/点刻底纹（可平铺）
"""
import math
import os

W, H = 1600, 700          # 画布（1600 为一个横向平铺周期）
BASE_FAR = 400            # 远山脚线
BASE_MID = 486            # 中山脚线
BASE_NEAR = 596           # 近山脚线
WATER_TOP = 592           # 水面
BORDER_Y = 652            # 底部边饰带

# ---- 墨地（刻掉处）与金 ----
INK       = '#0a0705'
INK_2     = '#0f0a06'
GOLD      = '#d7a94e'
GOLD_BR   = '#f6e2ae'
GOLD_MID  = '#c2913c'
GOLD_DEEP = '#8a6524'
GOLD_PALE = '#e9cf9a'


# ============================================================ 基础工具
def esc(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return s if s else '0'


def h1(i, s=0.0):
    """确定性伪随机 [0,1)。"""
    x = math.sin(i * 12.9898 + s * 78.233) * 43758.5453
    return x - math.floor(x)


def carve(pts, amp, seed):
    """手刻抖动：端点不动，中间点按 sin 包络抖动。"""
    if amp <= 0 or len(pts) < 3:
        return pts
    out = [pts[0]]
    n = len(pts)
    for k in range(1, n - 1):
        t = k / (n - 1.0)
        w = math.sin(math.pi * t) ** 0.6
        out.append((pts[k][0] + (h1(k, seed) - 0.5) * 2 * amp * w,
                    pts[k][1] + (h1(k, seed + 11) - 0.5) * 2 * amp * w))
    out.append(pts[-1])
    return out


def vnoise(x, period, seed):
    """周期性值噪声（周期整除 W，保证平铺无缝），三次平滑插值。"""
    n = max(1, int(round(W / period)))
    u = (x / period) % n
    i0 = int(math.floor(u)) % n
    i1 = (i0 + 1) % n
    t = u - math.floor(u)
    t = t * t * (3 - 2 * t)
    a = h1(i0, seed)
    b = h1(i1, seed)
    return a + (b - a) * t


def ridge_noise(x, seed, amp):
    """岩体抖动：三个倍频值噪声叠加。"""
    return amp * (0.55 * (vnoise(x, W / 32.0, seed) - 0.5) * 2.0
                  + 0.30 * (vnoise(x, W / 64.0, seed + 1.0) - 0.5) * 2.0
                  + 0.15 * (vnoise(x, W / 128.0, seed + 2.0) - 0.5) * 2.0)


def break_segs(pts, seed, gap_prob=0.16, min_len=3):
    """把折线随机断开成若干段，模拟木刻崩刀/飞白。"""
    segs, cur = [], []
    for i, p in enumerate(pts):
        cur.append(p)
        if len(cur) >= min_len and h1(i, seed) < gap_prob:
            segs.append(cur)
            cur = []
    if len(cur) >= 2:
        segs.append(cur)
    return segs


def poly(pts, close=False):
    d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
    d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
    if close:
        d.append('Z')
    return ' '.join(d)


def line(x1, y1, x2, y2, stroke=GOLD, sw=1.0, op=1.0):
    return ('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" opacity="%s"/>'
            % (esc(x1), esc(y1), esc(x2), esc(y2), stroke, esc(sw), esc(op)))


def path(d, stroke=GOLD, sw=1.0, op=1.0, fill='none', cap='square'):
    return ('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" opacity="%s" stroke-linecap="%s"/>'
            % (d, fill, stroke, esc(sw), esc(op), cap))


def circle(cx, cy, r, stroke=GOLD, sw=1.0, op=1.0, fill='none'):
    return ('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s" opacity="%s"/>'
            % (esc(cx), esc(cy), esc(r), fill, stroke, esc(sw), esc(op)))


def dot(cx, cy, r, color=GOLD, op=0.8):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (
        esc(cx), esc(cy), esc(r), color, esc(op))


def spiral(cx, cy, r0, r1, a0, a1, steps=34):
    pts = []
    for k in range(steps + 1):
        t = k / float(steps)
        a = a0 + (a1 - a0) * t
        r = r0 + (r1 - r0) * t
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def curl_head(cx, cy, r, a0, a1, steps=22):
    """实心卷头（浪头）：外弧 + 内弧夹出的实心月牙形。"""
    outer = spiral(cx, cy, r * 1.30, r * 0.30, a0, a1, steps)
    inner = spiral(cx, cy, r * 0.92, r * 0.16, a1, a0, steps)
    return outer + inner


# ============================================================ 山脊（Catmull-Rom）
def catmull_point(p0, p1, p2, p3, t):
    t2 = t * t
    t3 = t2 * t
    return (0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t
                   + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                   + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
                   + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                   + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3))


class Ridge(object):
    """手工设计的山脊：控制点 → Catmull-Rom 密采样 → 岩体抖动 → 可查询。"""

    def __init__(self, ctrl, base, jag=0.0, seed=0.0, wobble=0.0, per_seg=10):
        self.base = base
        self.hmax = max([base - p[1] for p in ctrl] + [1.0])
        n = len(ctrl)
        dense = []
        for i in range(n - 1):
            # 首尾同点（x=0 与 x=W），切线按周期取邻居，保证平铺接缝光滑
            p0 = (ctrl[n - 2][0] - W, ctrl[n - 2][1]) if i == 0 else ctrl[i - 1]
            p1, p2 = ctrl[i], ctrl[i + 1]
            p3 = (ctrl[1][0] + W, ctrl[1][1]) if i == n - 2 else ctrl[i + 2]
            for k in range(per_seg):
                dense.append(catmull_point(p0, p1, p2, p3, k / float(per_seg)))
        dense.append(ctrl[-1])
        out = []
        for (x, y) in dense:
            h = base - y
            if jag > 0:
                y = y + ridge_noise(x, seed + 3.0, jag * (0.18 + 0.82 * h / self.hmax))
            out.append((x, y))
        self.pts = carve(out, wobble, seed)

    def h(self, x):
        """x 处的高度（base - y），线性插值。"""
        pts = self.pts
        if x <= pts[0][0]:
            return self.base - pts[0][1]
        if x >= pts[-1][0]:
            return self.base - pts[-1][1]
        lo, hi = 0, len(pts) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if pts[mid][0] <= x:
                lo = mid
            else:
                hi = mid
        x0, y0 = pts[lo]
        x1, y1 = pts[hi]
        t = 0.0 if x1 == x0 else (x - x0) / (x1 - x0)
        return self.base - (y0 + (y1 - y0) * t)

    def body(self):
        return self.pts + [(W, self.base), (0, self.base)]

    def contour_segs(self, f, thresh, step=4.0):
        """层岩线：y = base - h*f，仅在山体够高处出现。"""
        segs, cur = [], []
        x = 0.0
        while x <= W + 1e-6:
            h = self.h(x)
            if h * f > thresh:
                cur.append((x, self.base - h * f))
            else:
                if len(cur) > 3:
                    segs.append(cur)
                cur = []
            x += step
        if len(cur) > 3:
            segs.append(cur)
        return segs

    def hatch(self, f, length, angle, spacing, thresh, seed=0.0, skip=0.22):
        """阴影排线：角度/长度/疏密都带手刻随机性，返回 (x1,y1,x2,y2,权重)。"""
        out = []
        x = 0.0
        i = 0
        while x <= W + 1e-6:
            h = self.h(x)
            u = h1(i, seed + 4.0)
            if h > thresh and u > skip:
                y0 = self.base - h * f
                L = min(length, h * 0.45) * (0.50 + 0.62 * h1(i, seed + 8.0))
                ang = angle + (h1(i, seed + 12.0) - 0.5) * 0.30
                w = 0.45 + 0.55 * h1(i, seed + 16.0)
                out.append((x, y0, x + math.cos(ang) * L, y0 + math.sin(ang) * L, w))
            x += spacing
            i += 1
        return out


# ---- 三层山脊控制点（x, y）：手工设计，峰有主次、有陡缓、有侧肩 ----
near_ctrl = [
    (0, 566), (55, 518), (105, 446), (145, 400), (185, 446), (235, 492), (285, 508),
    (330, 468), (370, 406), (408, 348), (438, 400), (475, 456), (520, 492),
    (570, 514), (620, 524), (665, 500), (705, 522), (750, 536), (800, 512),
    (845, 458), (880, 410), (915, 370), (952, 334), (985, 396), (1020, 448),
    (1060, 484), (1105, 508), (1150, 522), (1200, 534), (1245, 504), (1285, 438),
    (1318, 372), (1348, 424), (1385, 476), (1425, 510), (1465, 480), (1505, 418),
    (1535, 396), (1565, 466), (1590, 526), (1600, 566),
]
mid_ctrl = [
    (0, 446), (60, 394), (110, 338), (160, 300), (210, 346), (265, 390), (320, 412),
    (370, 378), (415, 328), (455, 286), (500, 334), (545, 382), (595, 410),
    (645, 426), (695, 398), (740, 424), (790, 442), (840, 412), (885, 360),
    (925, 314), (965, 288), (1005, 340), (1045, 386), (1090, 412), (1135, 428),
    (1180, 438), (1225, 408), (1268, 350), (1305, 308), (1340, 346), (1378, 390),
    (1420, 420), (1460, 396), (1500, 348), (1535, 326), (1568, 366), (1592, 420),
    (1600, 446),
]
far_ctrl = [
    (0, 376), (70, 344), (130, 312), (190, 288), (250, 316), (310, 344), (370, 360),
    (430, 336), (490, 304), (545, 282), (600, 312), (655, 342), (710, 360),
    (765, 346), (820, 320), (875, 296), (930, 280), (985, 314), (1040, 344),
    (1095, 362), (1150, 348), (1205, 316), (1258, 292), (1310, 316), (1360, 342),
    (1415, 358), (1470, 338), (1520, 308), (1560, 300), (1590, 338), (1600, 376),
]

RIDGE_NEAR = Ridge(near_ctrl, BASE_NEAR, jag=13.0, seed=8.0, wobble=0.0)
RIDGE_MID = Ridge(mid_ctrl, BASE_MID, jag=10.0, seed=5.0, wobble=0.0)
RIDGE_FAR = Ridge(far_ctrl, BASE_FAR, jag=7.0, seed=2.0, wobble=0.0)


def mountain_gold(ridge, fill, fill_op, carve_col, sw, contours, hatch_f,
                  hatch_len, hatch_ang, hatch_sp, hatch_op, seed):
    """金面山：实心金块 + 刻掉的黑色线（阴阳刻）。"""
    p = []
    p.append(path(poly(ridge.body(), close=True), fill=fill, stroke='none', sw=0, op=fill_op))
    for f, cop in contours:
        for seg in ridge.contour_segs(f, 9.0):
            for piece in break_segs(carve(seg, 0.8, seed + f * 10), seed + f * 3, 0.14, 4):
                p.append(path(poly(piece), stroke=carve_col, sw=1.6, op=cop))
    for (x1, y1, x2, y2, w) in ridge.hatch(hatch_f, hatch_len, hatch_ang, hatch_sp, 22.0,
                                           seed, 0.18):
        p.append(line(x1, y1, x2, y2, carve_col, 0.7 + 1.0 * w, hatch_op * (0.55 + 0.6 * w)))
    p.append(path(poly(ridge.pts), stroke=GOLD_BR, sw=sw, op=0.85))
    return p


def mountain_ink(ridge, contours, hatch_f, hatch_len, hatch_ang, hatch_sp,
                 hatch_op, seed, stipple=True):
    """墨面山：实心墨块 + 粗金轮廓（崩刀）+ 金色层岩线/排线/点刻。"""
    p = []
    p.append(path(poly(ridge.body(), close=True), fill=INK, stroke='none', sw=0))
    p.append(path(poly(ridge.body(), close=True), fill='url(#bhRidgeGlow)', stroke='none', sw=0))
    for piece in break_segs(ridge.pts, seed + 1, 0.10, 5):
        p.append(path(poly(piece), stroke=GOLD_BR, sw=4.6, op=1.0))
    p.append(path(poly(carve(ridge.pts, 0.9, seed + 3)), stroke=GOLD, sw=1.4, op=0.42))
    for f, cop in contours:
        for seg in ridge.contour_segs(f, 9.0):
            for piece in break_segs(carve(seg, 0.8, seed + f * 10), seed + f * 3, 0.16, 4):
                p.append(path(poly(piece), stroke=GOLD, sw=1.5, op=cop))
    for (x1, y1, x2, y2, w) in ridge.hatch(hatch_f, hatch_len, hatch_ang, hatch_sp, 26.0,
                                           seed, 0.30):
        p.append(line(x1, y1, x2, y2, GOLD, 0.7 + 0.9 * w, hatch_op * (0.5 + 0.7 * w)))
    if stipple:
        i = 0
        x = 20.0
        while x < W:
            h = ridge.h(x)
            if h > 40:
                for k in range(3):
                    u = h1(i, 4.4)
                    v = h1(i, 8.8)
                    p.append(dot(x + (u - 0.5) * 30.0,
                                 ridge.base - h * (0.30 + 0.42 * v),
                                 0.9 + h1(i, 2.2) * 0.8, GOLD_PALE,
                                 0.18 + h1(i, 6.6) * 0.26))
                    i += 1
            x += 34.0
    return p


# ============================================================ 日
def sun(cx, cy, r):
    """版画太阳：实心金轮 + 火焰光芒（长短交替）+ 内层刻环。"""
    p = []
    for i in range(14):
        a = i * math.pi / 7.0
        k = i % 3
        r1 = r * (1.54 if k == 0 else (1.40 if k == 1 else 1.26))
        w = 0.15 if k == 0 else (0.12 if k == 1 else 0.09)
        p.append(path(poly([
            (cx + math.cos(a - w) * r * 0.99, cy + math.sin(a - w) * r * 0.99),
            (cx + math.cos(a - w * 0.38) * r1, cy + math.sin(a - w * 0.38) * r1),
            (cx + math.cos(a) * r1 * 1.07, cy + math.sin(a) * r1 * 1.07),
            (cx + math.cos(a + w * 0.38) * r1, cy + math.sin(a + w * 0.38) * r1),
            (cx + math.cos(a + w) * r * 0.99, cy + math.sin(a + w) * r * 0.99),
        ], close=True), fill=GOLD, stroke='none', sw=0, op=0.95))
    p.append(circle(cx, cy, r, 'none', 0, 1, fill=GOLD))
    p.append(circle(cx, cy, r * 0.62, INK, 1.8, 0.45))
    p.append(circle(cx, cy, r * 0.32, INK, 1.6, 0.4))
    return p


# ============================================================ 月
def crescent_pts(cx, cy, r, r1, dx, steps=150):
    d = dx
    if r1 + d <= r:
        r1 = r - d + 0.5
    x = (d * d + r * r - r1 * r1) / (2.0 * d)
    y = math.sqrt(max(1.0, r * r - x * x))
    th = math.atan2(y, x)
    pts = []
    for k in range(steps + 1):
        a = th + (2 * math.pi - 2 * th) * k / float(steps)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    thb = math.atan2(y, x - d)
    for k in range(steps + 1):
        a = (2 * math.pi - thb) * (1.0 - k / float(steps)) + thb * (k / float(steps))
        pts.append((cx + d + math.cos(a) * r1, cy + d * 0 + math.sin(a) * r1))
    return pts


def moon(cx, cy, r):
    p = []
    p.append(circle(cx, cy, r * 1.04, GOLD_DEEP, 1.2, 0.3))
    p.append(path(poly(crescent_pts(cx, cy, r, r * 0.96, r * 0.52), close=True),
                  fill=GOLD, stroke=GOLD_BR, sw=2.0, op=1.0))
    for f, op in ((0.72, 0.55), (0.44, 0.38)):
        p.append(path(poly(crescent_pts(cx, cy, r * f, r * f * 0.96, r * f * 0.52), close=True),
                      fill='none', stroke=GOLD_PALE, sw=1.0, op=op))
    return p


# ============================================================ 星
def star4(cx, cy, s, color=GOLD):
    k = s * 0.16
    d = ('M %s %s Q %s %s %s %s Q %s %s %s %s Q %s %s %s %s Q %s %s %s %s Z'
         % (esc(cx), esc(cy - s), esc(cx + k), esc(cy - k), esc(cx + s), esc(cy),
            esc(cx + k), esc(cy + k), esc(cx), esc(cy + s),
            esc(cx - k), esc(cy + k), esc(cx - s), esc(cy),
            esc(cx - k), esc(cy - k), esc(cx), esc(cy - s)))
    out = ['<path d="%s" fill="%s" opacity="0.95"/>' % (d, color)]
    for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        out.append(line(cx + math.cos(a) * s * 1.12, cy + math.sin(a) * s * 1.12,
                        cx + math.cos(a) * s * 1.9, cy + math.sin(a) * s * 1.9,
                        color, 0.9, 0.7))
    return out


# ============================================================ 祥云
def cloud(cx, cy, s):
    """祥云：不对称云瓣轮廓 + 瓣内螺旋云头 + 卷尾。"""
    p = []
    lobes = [(-1.95, -0.82, 0.66), (-0.82, 0.46, 1.02), (0.46, 1.48, 0.74), (1.48, 2.06, 0.44)]
    sw = 2.0 + 0.026 * s
    d = ['M %s %s' % (esc(cx + lobes[0][0] * s), esc(cy))]
    for (x0, x1, hh) in lobes:
        w = x1 - x0
        d.append('C %s %s %s %s %s %s'
                 % (esc(cx + (x0 + w * 0.16) * s), esc(cy - hh * 1.42 * s),
                    esc(cx + (x1 - w * 0.10) * s), esc(cy - hh * 1.06 * s),
                    esc(cx + x1 * s), esc(cy)))
    p.append(path(' '.join(d), stroke=GOLD, sw=sw, op=0.95, cap='round'))
    d2 = ['M %s %s' % (esc(cx + lobes[-1][1] * s), esc(cy))]
    for (x0, x1, hh) in reversed(lobes):
        d2.append('Q %s %s %s %s' % (esc(cx + (x0 + x1) * 0.5 * s),
                                     esc(cy + hh * 0.24 * s), esc(cx + x0 * s), esc(cy)))
    p.append(path(' '.join(d2), stroke=GOLD_DEEP, sw=sw * 0.7, op=0.6, cap='round'))
    for (x0, x1, hh) in lobes:
        mx = cx + (x0 + x1) * 0.5 * s
        my = cy - hh * 0.34 * s
        r0 = hh * 0.44 * s
        p.append(path(poly(spiral(mx, my, r0, r0 * 0.11,
                                  math.pi * 0.72, math.pi * 0.72 + math.pi * 2.05, 36)),
                      stroke=GOLD, sw=sw * 0.85, op=0.92, cap='round'))
        p.append(path(poly(spiral(mx, my, r0 * 0.55, r0 * 0.09,
                                  math.pi * 1.05, math.pi * 1.05 + math.pi * 1.7, 28)),
                      stroke=GOLD_PALE, sw=sw * 0.5, op=0.55, cap='round'))
    tail = spiral(cx + (lobes[-1][1] + 0.10) * s, cy - 0.12 * s,
                  0.10 * s, 0.62 * s, math.pi * 0.9, math.pi * 2.25, 26)
    p.append(path(poly(tail), stroke=GOLD, sw=sw * 0.9, op=0.9, cap='round'))
    return p


# ============================================================ 飞鸟
def bird(x, y, s, op=0.9):
    return ('<path d="M %s %s Q %s %s %s %s Q %s %s %s %s" fill="none" stroke="%s" '
            'stroke-width="%s" opacity="%s" stroke-linecap="square"/>'
            % (esc(x - 8 * s), esc(y), esc(x - 4 * s), esc(y - 5 * s), esc(x), esc(y),
               esc(x + 4 * s), esc(y - 5 * s), esc(x + 8 * s), esc(y),
               GOLD, esc(2.3 * s), esc(op)))


# ============================================================ 松
def pine(x, y, h, s=1.0, seed=0.0):
    """木刻松：四层锯齿冠 + 主干，层宽逐层变化。"""
    p = []
    p.append(line(x, y, x, y - h * 0.98, GOLD, 2.4 * s, 0.9))
    p.append(line(x - h * 0.05 * s, y, x + h * 0.05 * s, y, GOLD, 2.0 * s, 0.6))
    tiers = [(0.30, 0.30), (0.52, 0.48), (0.74, 0.66), (0.96, 0.84)]
    for i, (ty, tw) in enumerate(tiers):
        cy = y - h * ty
        w = h * tw * s * (0.92 + 0.16 * h1(i, seed))
        n = 4
        d = ['M %s %s' % (esc(x), esc(cy - h * 0.15))]
        for k in range(n):
            t0 = k / float(n)
            t1 = (k + 1) / float(n)
            d.append('L %s %s' % (esc(x - w * (1 - t0)), esc(cy - h * 0.02)))
            d.append('L %s %s' % (esc(x - w * (1 - (t0 + t1) * 0.5)), esc(cy + h * 0.065)))
        d.append('L %s %s' % (esc(x - w), esc(cy - h * 0.02)))
        for k in range(n - 1, -1, -1):
            t0 = k / float(n)
            t1 = (k + 1) / float(n)
            d.append('L %s %s' % (esc(x + w * (1 - t0)), esc(cy - h * 0.02)))
            d.append('L %s %s' % (esc(x + w * (1 - (t0 + t1) * 0.5)), esc(cy + h * 0.065)))
        d.append('Z')
        p.append(path(' '.join(d), fill=GOLD, stroke='none', sw=0, op=0.82 + 0.04 * i))
    return p


# ============================================================ 水
def scale_row(y, r, period, rows, sw, op, seed):
    """鱼鳞水纹：交叠半圆鳞片 + 鳞心小卷。"""
    p = []
    for row in range(rows):
        yy = y + row * r * 0.58
        off = (row % 2) * period * 0.5
        x = -period + off
        idx = 0
        while x < W + period:
            rr = r * (0.86 + 0.28 * h1(row * 31 + idx, seed))
            p.append(path('M %s %s A %s %s 0 0 1 %s %s' % (esc(x), esc(yy), esc(rr), esc(rr),
                                                            esc(x + rr * 2), esc(yy)),
                          stroke=GOLD, sw=sw, op=op, cap='round'))
            p.append(path(poly(spiral(x + rr, yy - rr * 0.30, rr * 0.30, rr * 0.07,
                                      math.pi * 0.85, math.pi * 2.35, 20)),
                          stroke=GOLD_PALE, sw=sw * 0.6, op=op * 0.7, cap='round'))
            x += period
            idx += 1
    return p


def wave_row(y, amp, period, phase, curl_r, solid, hatching, sw, op, seed):
    p = []
    x = -period + phase
    idx = 0
    while x < W + period:
        cx = x + period * 0.5
        amp_u = amp * (0.58 + 0.86 * h1(idx, seed + 2))
        curl_u = curl_r * (0.66 + 0.72 * h1(idx, seed + 6))
        pts = []
        for k in range(15):
            t = k / 14.0
            pts.append((x + period * t, y - amp_u * math.sin(math.pi * t) ** 1.35))
        pts = carve(pts, 0.5, seed + idx)
        p.append(path(poly(pts), stroke=GOLD, sw=sw, op=op, cap='round'))
        for k in range(4):
            u = h1(idx * 7 + k, seed)
            p.append(dot(x + period * (0.36 + 0.28 * u), y - amp_u * (0.7 + 0.35 * u),
                         0.7 + h1(idx * 3 + k, seed + 5) * 0.9, GOLD_PALE, op * 0.5))
        if solid:
            p.append(path(poly(curl_head(cx + period * 0.06, y - amp_u + curl_u * 0.72,
                                         curl_u, math.pi * 1.05, math.pi * 3.35, 22), close=True),
                          fill=GOLD, stroke=GOLD_BR, sw=1.0, op=op * 0.95))
            p.append(dot(cx + period * 0.06, y - amp_u + curl_u * 0.72, curl_u * 0.16,
                         INK, op * 0.9))
        else:
            p.append(path(poly(spiral(cx + period * 0.06, y - amp_u + curl_u * 0.72,
                                      curl_u * 0.26, curl_u, math.pi * 1.15,
                                      math.pi * 3.5, 24)),
                          stroke=GOLD, sw=sw * 0.9, op=op * 0.9, cap='round'))
        if hatching:
            for j in range(5):
                t = 0.28 + 0.13 * j
                xx = x + period * t
                yy = y - amp_u * math.sin(math.pi * t) ** 1.35 + 3.5
                L = amp_u * (0.46 - 0.06 * j)
                p.append(line(xx, yy, xx + L * 0.40, yy + L, GOLD, 0.9, op * 0.5))
        x += period
        idx += 1
    return p


# ============================================================ 岸线
def shoreline():
    """水际线：近山脚一条粗金线（崩刀）+ 几处岸石。"""
    p = []
    pts = [(float(x), BASE_NEAR + 3 + (h1(i, 91.0) - 0.5) * 4)
           for i, x in enumerate(range(0, W + 1, 20))]
    for piece in break_segs(pts, 91.0, 0.13, 4):
        p.append(path(poly(piece), stroke=GOLD_BR, sw=3.2, op=0.9))
    for (x, s) in [(180, 1.0), (560, 0.8), (900, 1.1), (1240, 0.9), (1460, 0.75)]:
        y0 = BASE_NEAR + 4
        p.append(path(poly([(x - 16 * s, y0), (x - 8 * s, y0 - 12 * s),
                            (x + 2 * s, y0 - 16 * s), (x + 12 * s, y0 - 6 * s),
                            (x + 18 * s, y0)], close=True),
                      fill=GOLD, stroke='none', sw=0, op=0.55))
        p.append(line(x - 10 * s, y0 - 4 * s, x + 2 * s, y0 - 12 * s, INK, 1.2, 0.6))
        p.append(line(x + 2 * s, y0 - 12 * s, x + 12 * s, y0 - 4 * s, INK, 1.2, 0.6))
    return p


# ============================================================ 底部边饰
def border():
    """底部收边：两条细金线 + 稀疏回纹刻点（不抢主体）。"""
    p = []
    p.append(line(0, BORDER_Y + 2, W, BORDER_Y + 2, GOLD, 2.0, 0.55))
    p.append(line(0, BORDER_Y + 14, W, BORDER_Y + 14, GOLD, 1.0, 0.3))
    unit = 100
    for i in range(W // unit + 2):
        x0 = i * unit
        y0 = BORDER_Y + 7
        hh = 7.0
        d = ('M %s %s L %s %s L %s %s L %s %s'
             % (esc(x0 + 8), esc(y0 + hh), esc(x0 + 8), esc(y0),
                esc(x0 + 40), esc(y0), esc(x0 + 40), esc(y0 + hh * 0.6)))
        p.append(path(d, stroke=GOLD, sw=1.1, op=0.32))
    return p


# ============================================================ 组装
def build():
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
               'fill="none" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">'
               % (W, H, W, H))
    out.append('  <defs>')
    out.append('    <linearGradient id="bhGround" x1="0" y1="0" x2="0" y2="%d" gradientUnits="userSpaceOnUse">' % H)
    out.append('      <stop offset="0" stop-color="#3a2b1e" stop-opacity="0"/>')
    out.append('      <stop offset="0.45" stop-color="#3a2b1e" stop-opacity="0.10"/>')
    out.append('      <stop offset="1" stop-color="#4a3524" stop-opacity="0.30"/>')
    out.append('    </linearGradient>')
    out.append('    <radialGradient id="bhLum">')
    out.append('      <stop offset="0" stop-color="#f6e2ae" stop-opacity="0.26"/>')
    out.append('      <stop offset="0.42" stop-color="#d7a94e" stop-opacity="0.10"/>')
    out.append('      <stop offset="1" stop-color="#d7a94e" stop-opacity="0"/>')
    out.append('    </radialGradient>')
    out.append('    <linearGradient id="bhRidgeGlow" x1="0" y1="0" x2="0" y2="1">')
    out.append('      <stop offset="0" stop-color="#f6e2ae" stop-opacity="0.20"/>')
    out.append('      <stop offset="0.16" stop-color="#d7a94e" stop-opacity="0.07"/>')
    out.append('      <stop offset="0.42" stop-color="#d7a94e" stop-opacity="0"/>')
    out.append('    </linearGradient>')
    out.append('    <linearGradient id="bhMist" x1="0" y1="0" x2="0" y2="1">')
    out.append('      <stop offset="0" stop-color="#d7a94e" stop-opacity="0"/>')
    out.append('      <stop offset="0.5" stop-color="#d7a94e" stop-opacity="0.10"/>')
    out.append('      <stop offset="1" stop-color="#d7a94e" stop-opacity="0"/>')
    out.append('    </linearGradient>')
    out.append('  </defs>')
    out.append('  <rect width="%d" height="%d" fill="url(#bhGround)"/>' % (W, H))

    # ---- 点刻星空 ----
    out.append('  <!-- 点刻星空 -->')
    for i in range(300):
        x = h1(i, 3.1) * W
        y = 16 + (h1(i, 7.7) ** 1.6) * 340
        if (x - 268) ** 2 + (y - 148) ** 2 < 142 ** 2:
            continue
        if (x - 1318) ** 2 + (y - 214) ** 2 < 104 ** 2:
            continue
        out.append('  ' + dot(x, y, 0.5 + h1(i, 5.5) * 0.9, GOLD_PALE,
                              0.16 + h1(i, 9.9) * 0.34))

    # ---- 星辰 ----
    out.append('  <!-- 星辰 -->')
    for (x, y, s) in [(150, 96, 9.0), (232, 250, 4.6), (416, 80, 5.4), (556, 178, 3.6),
                      (700, 100, 4.8), (836, 226, 3.4), (960, 66, 6.4), (1084, 158, 3.8),
                      (1180, 246, 4.4), (1432, 88, 5.8), (1524, 208, 3.6), (666, 258, 3.0),
                      (78, 214, 3.4), (1244, 84, 3.2)]:
        out += ['  ' + s for s in star4(x, y, s)]

    # ---- 星宿连线 ----
    out.append('  <!-- 星宿连线 -->')
    for pts in [[(150, 96), (232, 250), (78, 214)],
                [(960, 66), (1084, 158), (1244, 84)],
                [(416, 80), (556, 178), (666, 258)]]:
        for k in range(len(pts) - 1):
            out.append('  ' + line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1],
                                   GOLD_PALE, 0.8, 0.22))

    # ---- 日 / 月 ----
    out.append('  <!-- 日 / 月 的光晕 -->')
    out.append('  <circle cx="268" cy="148" r="186" fill="url(#bhLum)"/>')
    out.append('  <circle cx="1318" cy="214" r="128" fill="url(#bhLum)"/>')
    out.append('  <!-- 日 -->')
    out += ['  ' + s for s in sun(268, 148, 78)]
    out.append('  <!-- 月 -->')
    out += ['  ' + s for s in moon(1318, 214, 44)]

    # ---- 祥云 ----
    out.append('  <!-- 祥云 -->')
    for (x, y, s) in [(170, 250, 34), (520, 196, 26), (720, 284, 42),
                      (980, 178, 28), (1180, 244, 24), (1420, 206, 38),
                      (1500, 268, 22)]:
        out += ['  ' + s for s in cloud(x, y, s)]

    # ---- 飞鸟（雁阵）----
    out.append('  <!-- 飞鸟 -->')
    for (x, y, s) in [(560, 128, 1.2), (604, 146, 0.9), (648, 122, 1.0),
                      (980, 210, 1.1), (1024, 196, 0.85), (1188, 118, 1.0),
                      (470, 92, 1.0), (516, 106, 0.85), (562, 92, 0.95)]:
        out.append('  ' + bird(x, y, s))

    # ---- 雾带（拉开纵深）----
    out.append('  <!-- 雾带 -->')
    out.append('  <rect x="0" y="330" width="%d" height="110" fill="url(#bhMist)"/>' % W)
    out.append('  <rect x="0" y="432" width="%d" height="110" fill="url(#bhMist)"/>' % W)

    # ---- 远山 ----
    out.append('  <!-- 远山 -->')
    out += ['  ' + s for s in mountain_gold(RIDGE_FAR, GOLD_DEEP, 0.55, INK, 1.8,
                                            [(0.66, 0.5)], 0.64, 30,
                                            math.radians(64), 12, 0.5, 2.0)]
    # ---- 中山 ----
    out.append('  <!-- 中山 -->')
    out += ['  ' + s for s in mountain_gold(RIDGE_MID, GOLD, 0.72, INK, 2.6,
                                            [(0.70, 0.6), (0.40, 0.45)], 0.58, 44,
                                            math.radians(60), 10, 0.7, 5.0)]

    # ---- 谷中云雾 ----
    out.append('  <!-- 谷中云雾 -->')
    for (x, y, s) in [(350, 528, 30), (620, 498, 36), (1180, 538, 26)]:
        out += ['  ' + s for s in cloud(x, y, s)]

    # ---- 近山 ----
    out.append('  <!-- 近山 -->')
    out += ['  ' + s for s in mountain_ink(RIDGE_NEAR,
                                           [(0.74, 0.55), (0.46, 0.42), (0.22, 0.28)],
                                           0.52, 66, math.radians(56), 9, 0.5, 8.0)]

    # ---- 山脊松 ----
    out.append('  <!-- 山脊松 -->')
    for (x, h, sc) in [(145, 42, 1.0), (408, 50, 1.05), (705, 38, 0.95),
                       (952, 54, 1.1), (1318, 46, 1.0), (1535, 40, 0.9),
                       (620, 30, 0.85), (1105, 32, 0.9), (185, 34, 0.9)]:
        y = RIDGE_NEAR.base - RIDGE_NEAR.h(x) + 2
        out += ['  ' + s for s in pine(x, y, h, sc, seed=x * 0.01)]

    # ---- 岸线 ----
    out.append('  <!-- 岸线 -->')
    out += ['  ' + s for s in shoreline()]

    # ---- 河波 ----
    out.append('  <!-- 河波 -->')
    out += ['  ' + s for s in wave_row(WATER_TOP + 8, 17, 160, 0, 12, True, True, 1.6, 0.8, 21)]
    out += ['  ' + s for s in scale_row(WATER_TOP + 30, 25, 50, 1, 1.1, 0.4, 71)]
    out += ['  ' + s for s in wave_row(WATER_TOP + 62, 7, 80, 0, 5, False, False, 0.85, 0.28, 47)]

    # ---- 套色错版 ----
    out.append('  <!-- 套色错版 -->')
    out.append('  ' + path(poly(RIDGE_NEAR.pts), stroke=GOLD_DEEP, sw=3.4, op=0.16))
    out.append('  ' + circle(300 + 2.6, 168 + 2.2, 66, GOLD_DEEP, 1.8, 0.18))

    # ---- 底部边饰 ----
    out.append('  <!-- 底部边饰 -->')
    out += ['  ' + s for s in border()]

    out.append('</svg>')
    return '\n'.join(out) + '\n'


# ============================================================ 纸纹点刻底纹（可平铺）
def build_paper():
    size = 200
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
           'aria-hidden="true">' % (size, size, size, size)]
    for i in range(170):
        x = h1(i, 1.3) * size
        y = h1(i, 4.7) * size
        r = 0.3 + h1(i, 6.1) * 0.6
        op = 0.07 + h1(i, 8.3) * 0.16
        out.append('  <circle cx="%s" cy="%s" r="%s" fill="#e9cf9a" opacity="%s"/>'
                   % (esc(x), esc(y), esc(r), esc(op)))
    for i in range(16):
        x = h1(i, 2.9) * size
        y = h1(i, 5.3) * size
        L = 6 + h1(i, 7.1) * 18
        a = h1(i, 9.7) * math.pi
        out.append('  <line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#e9cf9a" '
                   'stroke-width="0.5" opacity="0.10"/>'
                   % (esc(x), esc(y), esc(x + math.cos(a) * L), esc(y + math.sin(a) * L)))
    out.append('</svg>')
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    d = os.path.join(root, 'public', 'banhua')
    os.makedirs(d, exist_ok=True)
    band = build()
    with open(os.path.join(d, 'banhua-riyue-chuanshan.svg'), 'w', encoding='utf-8') as f:
        f.write(band)
    paper = build_paper()
    with open(os.path.join(d, 'banhua-paper.svg'), 'w', encoding='utf-8') as f:
        f.write(paper)
    print('banhua-riyue-chuanshan.svg  %d bytes' % len(band))
    print('banhua-paper.svg            %d bytes' % len(paper))
