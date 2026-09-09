#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""金线版横带（shanhai-engraving-band.svg）生成器。

参考风格：花亦山描金（米月 / 金线版）。
黑底之上只画"金线"——一切山、云、日、月、星辰都是描金
轮廓 + 极少的纹理短线，**没有实心填充**，因此无论是否平铺，
画面始终保留黑底透出，比实心剪影版更接近 描金线稿 的质感。

要点：
* 全部为 SVG <path stroke=...>，fill=none。
* 山脉依然是"周期函数轮廓"，因此 1600x460 一段可以横向无缝平铺。
* 日 / 月 / 星 / 云 / 鸟 都做成可重复的小图元，分布在天空区。
* 山脚下方一条 河波：水平波线 + 几处短线点缀。
"""
import math
import os

W, H = 1600, 460          # 画布
BASE = 432                # 山脚线
BOTTOM = 460              # 底边
SKY_TOP = 40              # 天空区上沿（仅给云/星/日月留位置）

# 鎏金调色
BRIGHT = '#f6d9a0'        # 极亮金（短高光）
GOLD   = '#dfb878'        # 主金
DEEP   = '#a88440'        # 暗金（远山/远河）
MID    = '#c19f66'        # 中金
GLOW   = '#f8dca0'        # 鎏金边缘
INK_LINE = 'rgba(248,220,160,0.18)'  # 仅在文档里说明（SVG 不用）


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
    for (cx, wl, wr, h, p) in peaks:
        if cx - wl < 6 or cx + wr > W - 6:
            raise SystemExit('%s 的峰 x=%s 离画布边缘太近（%s .. %s）' % (name, cx, cx - wl, cx + wr))


def profile(peaks, x):
    return sum(bump(x, *pk) for pk in peaks)


def ridge_top(peaks, step=4.0, base=BASE):
    """把山脊线采样成一条折线 path（不闭合）。"""
    pts = []
    x = 0.0
    while x <= W + 1e-6:
        pts.append((x, base - profile(peaks, x)))
        x += step
    if pts[-1][0] < W:
        pts.append((W, base - profile(peaks, W)))
    d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
    d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
    return ' '.join(d)


def ridge_outline(peaks, base=BASE, bottom=BOTTOM):
    """山脉闭合轮廓：山脊 + 底边，常用于填色 + 描线。"""
    pts = []
    x = 0.0
    while x <= W + 1e-6:
        pts.append((x, base - profile(peaks, x)))
        x += 4.0
    if pts[-1][0] < W:
        pts.append((W, base - profile(peaks, W)))
    d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
    d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
    d.append('L %s %s' % (esc(W), esc(bottom)))
    d.append('L 0 %s Z' % esc(bottom))
    return ' '.join(d)


def hatch_in_peak(peaks, base=BASE, length_frac=0.45):
    """在每座山的内部画几条短斜线（线稿刻线），用来模拟 描金/版画 的细密排线。

    返回一个 [(x1, y1, x2, y2), ...] 列表。每条刻线从山脊下
    h * 0.10 处的 (x, y0) 起，向左下画到 y_top + h * (0.10+length_frac)，
    长度为 h * length_frac，水平偏移 -h * 0.06（轻微左斜）。
    h 太小时（山谷）自动跳过，避免刻线跑到山外。
    """
    parts = []
    step = 8.0
    x = 0.0
    while x <= W + 1e-6:
        h = profile(peaks, x)
        if h > 22:
            y_top = base - h
            y0 = y_top + h * 0.10
            y1 = y_top + h * (0.10 + length_frac)
            dx = -h * 0.06
            parts.append((x, y0, x + dx, y1))
        x += step
    return parts


# ============================================================ 三层山
# (中心 x, 左半宽, 右半宽, 高度, 尖度)
far_peaks = [
    (130,  90,  80, 60,  1.6),
    (350,  80,  95, 78,  1.7),
    (600, 100,  90, 70,  1.8),
    (820,  85,  85, 86,  1.7),
    (1050, 95, 100, 72, 1.8),
    (1290, 100, 90, 84, 1.7),
    (1500,  90, 90, 66, 1.6),
]
mid_peaks = [
    (160,  90,  85, 110, 1.7),
    (340, 100,  90, 130, 1.8),
    (560,  85, 100, 150, 1.9),
    (780,  90,  90, 118, 1.7),
    (1000, 100, 100, 142, 1.8),
    (1240, 90,  90, 124, 1.7),
    (1480, 100, 95, 134, 1.8),
]
near_peaks = [
    (220, 130, 110, 170, 2.0),
    (470, 120, 130, 195, 2.0),
    (760, 140, 120, 175, 2.0),
    (1050, 130, 140, 200, 2.0),
    (1340, 140, 120, 180, 2.0),
    (1490, 80, 88, 165, 2.0),
]

for name, p in (('far', far_peaks), ('mid', mid_peaks), ('near', near_peaks)):
    check_periodic(p, name)


# ============================================================ 头部
def header():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
        'fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\n'
        '  <defs>\n'
        '    <linearGradient id="ebSky" x1="0" y1="0" x2="0" y2="%d" gradientUnits="userSpaceOnUse">\n'
        '      <stop offset="0" stop-color="%s" stop-opacity="0.06"/>\n'
        '      <stop offset="0.55" stop-color="%s" stop-opacity="0.04"/>\n'
        '      <stop offset="1" stop-color="%s" stop-opacity="0"/>\n'
        '    </linearGradient>\n'
        '  </defs>\n'
        '  <rect width="%d" height="%d" fill="url(#ebSky)"/>\n'
    ) % (W, H, W, H, BASE, BRIGHT, GOLD, GOLD, W, H)


# ============================================================ 天空区：日 / 月 / 星 / 云 / 鸟
def sun(cx, cy, r):
    """太阳：双圈 + 内层极淡环 + 12 道短光芒。"""
    parts = []
    parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="1.6"/>'
                 % (esc(cx), esc(cy), esc(r), BRIGHT))
    parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="0.95" opacity="0.9"/>'
                 % (esc(cx), esc(cy), esc(r * 0.74), GOLD))
    parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="0.7" opacity="0.7"/>'
                 % (esc(cx), esc(cy), esc(r * 0.5), GOLD))
    # 中心圆点（实心）
    parts.append('<circle cx="%s" cy="%s" r="1.5" fill="%s" stroke="none"/>'
                 % (esc(cx), esc(cy), BRIGHT))
    for i in range(16):
        a = (i / 16) * math.pi * 2
        x1 = cx + math.cos(a) * (r + 4)
        y1 = cy + math.sin(a) * (r + 4)
        x2 = cx + math.cos(a) * (r + 16)
        y2 = cy + math.sin(a) * (r + 16)
        parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.95" opacity="0.9"/>'
                     % (esc(x1), esc(y1), esc(x2), esc(y2), GOLD))
        # 长短交替
        if i % 4 == 0:
            x3 = cx + math.cos(a) * (r + 22)
            y3 = cy + math.sin(a) * (r + 22)
            parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.7" opacity="0.7"/>'
                         % (esc(x2), esc(y2), esc(x3), esc(y3), GOLD))
    return '\n  '.join(parts)


def moon(cx, cy, r):
    """月：单圆 + 内部弧线（阴影）。"""
    parts = []
    parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="1.5"/>'
                 % (esc(cx), esc(cy), esc(r), BRIGHT))
    parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="0.8" opacity="0.75"/>'
                 % (esc(cx), esc(cy), esc(r * 0.78), GOLD))
    # 阴影：略偏的同心圆弧
    parts.append('<path d="M %s %s A %s %s 0 0 1 %s %s" stroke="%s" stroke-width="0.7" opacity="0.6"/>'
                 % (esc(cx - r * 0.4), esc(cy - r * 0.55),
                    esc(r * 0.55), esc(r * 0.55),
                    esc(cx + r * 0.4), esc(cy - r * 0.55),
                    GOLD))
    parts.append('<path d="M %s %s A %s %s 0 0 0 %s %s" stroke="%s" stroke-width="0.7" opacity="0.6"/>'
                 % (esc(cx - r * 0.45), esc(cy + r * 0.4),
                    esc(r * 0.55), esc(r * 0.55),
                    esc(cx + r * 0.45), esc(cy + r * 0.4),
                    GOLD))
    # 几粒陨石坑点
    for dx, dy, sz in [(-0.2, -0.05, 0.08), (0.15, 0.2, 0.06), (-0.1, 0.25, 0.05)]:
        parts.append('<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="0.55" opacity="0.55"/>'
                     % (esc(cx + dx * r), esc(cy + dy * r), esc(sz * r), GOLD))
    return '\n  '.join(parts)


def star(cx, cy, s):
    """4 芒小星：金线十字 + 微小菱形 + 4 端点向外延伸的细短线。"""
    parts = []
    # 横竖两条短金线
    parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.1"/>'
                 % (esc(cx - s), esc(cy), esc(cx + s), esc(cy), GOLD))
    parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.1"/>'
                 % (esc(cx), esc(cy - s), esc(cx), esc(cy + s), GOLD))
    # 对角四条细短芒（更接近"星辉"）
    for ang in [math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4]:
        dx, dy = math.cos(ang) * s * 0.7, math.sin(ang) * s * 0.7
        parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.55" opacity="0.85"/>'
                     % (esc(cx), esc(cy), esc(cx + dx), esc(cy + dy), GOLD))
    # 中心菱形
    parts.append('<path d="M %s %s L %s %s L %s %s L %s %s Z" stroke="%s" stroke-width="0.7" opacity="0.95"/>'
                 % (esc(cx), esc(cy - s * 0.4),
                    esc(cx + s * 0.4), esc(cy),
                    esc(cx), esc(cy + s * 0.4),
                    esc(cx - s * 0.4), esc(cy),
                    GOLD))
    return '\n  '.join(parts)


def dot(cx, cy, r=0.9, color=GOLD, op=0.85):
    return '<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="%s" opacity="%s"/>' \
           % (esc(cx), esc(cy), esc(r), color, esc(r * 0.9), esc(op))


def cloud(cx, cy, scale=1.0):
    """勾云（卷云）：由两到三个弧形卷头 + 一条收尾细线组成。"""
    parts = []
    s = scale
    # 左侧卷头（大）
    parts.append('<path d="M %s %s a %s %s 0 0 1 %s %s a %s %s 0 0 1 %s %s" '
                 'stroke="%s" stroke-width="0.9" opacity="0.85"/>'
                 % (esc(cx), esc(cy),
                    esc(7 * s), esc(7 * s),
                    esc(7 * s), esc(-7 * s),
                    esc(7 * s), esc(7 * s),
                    esc(0), esc(14 * s),
                    GOLD))
    # 中段卷头
    parts.append('<path d="M %s %s a %s %s 0 0 1 %s %s a %s %s 0 0 1 %s %s" '
                 'stroke="%s" stroke-width="0.8" opacity="0.8"/>'
                 % (esc(cx + 12 * s), esc(cy - 4 * s),
                    esc(5 * s), esc(5 * s),
                    esc(5 * s), esc(-5 * s),
                    esc(5 * s), esc(5 * s),
                    esc(0), esc(10 * s),
                    GOLD))
    # 收尾细线
    parts.append('<path d="M %s %s q %s %s %s %s t %s %s" '
                 'stroke="%s" stroke-width="0.7" opacity="0.7"/>'
                 % (esc(cx + 20 * s), esc(cy + 5 * s),
                    esc(8 * s), esc(-2 * s),
                    esc(8 * s), esc(-2 * s),
                    esc(8 * s), esc(0),
                    GOLD))
    return '\n  '.join(parts)


def bird(x, y, s=1.0):
    """飞鸟：两段弧，构成 V 形翅膀。"""
    return ('<path d="M %s %s q %s %s %s %s m %s %s q %s %s %s %s" '
            'stroke="%s" stroke-width="0.9" opacity="0.85"/>'
            % (esc(x - 7 * s), esc(y),
               esc(3.5 * s), esc(-4.5 * s),
               esc(7 * s), esc(0),
               esc(0), esc(0),
               esc(3.5 * s), esc(-4.5 * s),
               esc(7 * s), esc(0),
               GOLD))


# ============================================================ 河波
def river():
    parts = []
    y0 = BASE + 8
    # 主波：双层错相位
    for amp, per, phase, op, sw in [(3.0, 56, 0, 0.55, 0.9),
                                     (2.0, 38, 18, 0.4, 0.6)]:
        pts = []
        x = 0.0
        step = 6.0
        while x <= W + 1e-6:
            pts.append((x, y0 + amp * math.sin((x + phase) / per * math.pi * 2)))
            x += step
        d = ['M %s %s' % (esc(pts[0][0]), esc(pts[0][1]))]
        d += ['L %s %s' % (esc(p[0]), esc(p[1])) for p in pts[1:]]
        parts.append('<path d="%s" stroke="%s" stroke-width="%s" opacity="%s"/>'
                     % (' '.join(d), GOLD, esc(sw), esc(op)))
    # 短点缀（横向短线表示波光）
    rng_seed = 1337
    for i in range(36):
        x = (i * 47 + 11) % W
        y = y0 + 4 + ((i * 13) % 9) - 4
        parts.append('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.6" opacity="0.6"/>'
                     % (esc(x), esc(y), esc(x + 10), esc(y), DEEP))
    return '\n  '.join(parts)


# ============================================================ 组装
def build():
    out = []
    out.append(header())

    # --- 天空区：星 ---
    # 大星 1 颗（在月旁），中星 2 颗，小星若干
    star_positions = [
        # (cx, cy, scale)
        (140, 70, 6.0),
        (260, 200, 4.0),
        (340, 60, 3.0),
        (640, 80, 5.0),
        (740, 50, 3.0),
        (820, 210, 3.0),
        (970, 80, 4.0),
        (1050, 220, 3.0),
        (1340, 70, 5.0),
        (1430, 200, 3.0),
        (1530, 90, 3.0),
    ]
    out.append('  <!-- 星辰 -->')
    for x, y, s in star_positions:
        out.append('  ' + star(x, y, s))

    # --- 月 ---
    out.append('  <!-- 月 -->')
    out.append('  ' + moon(440, 110, 42))

    # --- 日（落在山脊附近，模拟日出） ---
    out.append('  <!-- 日 -->')
    out.append('  ' + sun(1180, 140, 44))

    # --- 勾云 ---
    out.append('  <!-- 勾云 -->')
    cloud_positions = [
        (60, 230, 1.4),
        (700, 230, 1.2),
        (910, 245, 1.0),
        (1300, 235, 1.3),
        (1500, 245, 0.9),
    ]
    for x, y, s in cloud_positions:
        out.append('  ' + cloud(x, y, s))

    # --- 飞鸟 ---
    out.append('  <!-- 归鸟 -->')
    bird_positions = [(310, 170, 1.2), (1020, 175, 1.0), (1380, 110, 1.0), (580, 50, 0.9)]
    for x, y, s in bird_positions:
        out.append('  ' + bird(x, y, s))

    # --- 远山（描线 + 极淡内部刻线） ---
    out.append('  <!-- 远山 -->')
    out.append('  <path d="%s" stroke="%s" stroke-width="0.8" opacity="0.65"/>'
               % (ridge_outline(far_peaks), DEEP))
    for (x1, y1, x2, y2) in hatch_in_peak(far_peaks, length_frac=0.25):
        out.append('  <line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.55" opacity="0.32"/>'
                   % (esc(x1), esc(y1), esc(x2), esc(y2), DEEP))

    # --- 中山（描线 + 内部短斜刻线） ---
    out.append('  <!-- 中山 -->')
    out.append('  <path d="%s" stroke="%s" stroke-width="0.95" opacity="0.82"/>'
               % (ridge_outline(mid_peaks), MID))
    for (x1, y1, x2, y2) in hatch_in_peak(mid_peaks, length_frac=0.32):
        out.append('  <line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.65" opacity="0.42"/>'
                   % (esc(x1), esc(y1), esc(x2), esc(y2), MID))

    # --- 近山（描线 + 内部短斜刻线） ---
    out.append('  <!-- 近山 -->')
    out.append('  <path d="%s" stroke="%s" stroke-width="1.15" opacity="0.95"/>'
               % (ridge_outline(near_peaks), BRIGHT))
    for (x1, y1, x2, y2) in hatch_in_peak(near_peaks, length_frac=0.42):
        out.append('  <line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.7" opacity="0.5"/>'
                   % (esc(x1), esc(y1), esc(x2), esc(y2), GOLD))

    # --- 近山山脊上的小塔 / 亭 ---
    out.append('  <!-- 近山小塔/亭 -->')
    # 在近山几个峰顶附近挑位置放小亭/塔
    pavilion_positions = [(760, 175), (1050, 152), (1340, 176), (1490, 220)]
    for (cx, cy) in pavilion_positions:
        # 屋檐
        out.append('  <path d="M %s %s L %s %s L %s %s" stroke="%s" stroke-width="0.9" opacity="0.95"/>'
                   % (esc(cx - 8), esc(cy - 6),
                      esc(cx + 8), esc(cy - 6),
                      esc(cx), esc(cy - 12),
                      BRIGHT))
        # 屋身
        out.append('  <path d="M %s %s L %s %s L %s %s L %s %s Z" stroke="%s" stroke-width="0.8" opacity="0.9"/>'
                   % (esc(cx - 5), esc(cy - 6),
                      esc(cx - 5), esc(cy + 2),
                      esc(cx + 5), esc(cy + 2),
                      esc(cx + 5), esc(cy - 6),
                      BRIGHT))
        # 顶饰
        out.append('  <line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="0.7" opacity="0.9"/>'
                   % (esc(cx), esc(cy - 12), esc(cx), esc(cy - 16), GOLD))

    # --- 河波 ---
    out.append('  <!-- 河 -->')
    out.append('  ' + river())

    out.append('</svg>\n')
    return '\n'.join(out)


if __name__ == '__main__':
    svg = build()
    out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'shanhai', 'shanhai-engraving-band.svg')
    out_path = os.path.normpath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print('Wrote', out_path, '(%d bytes)' % len(svg))
