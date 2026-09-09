# -*- coding: utf-8 -*-
"""
线描山水背景生成器 (gilt line-art 山水)
依据「描金山水 / 国风线条山川」参考图重绘：
  · 层叠峰峦，山体内以密集平行「等高线 / 排线」嵌套勾勒（参考图标志语言）
  · 远 / 中 / 近三层山脊，主峰高耸以见磅礴
  · 如意祥云、金环日、卷浪水纹、归鸟、台阁点景
纯线条 (fill:none)，暖金描色，叠在页面近黑底上以 mix-blend-mode: screen 显形。

输出（保持原文件名 / viewBox，页面代码无需改动）：
  public/miwen-bg/hero-landscape.svg      3000x1000  秘闻 hero 横幅
  public/shanhai/shanhai-panorama-2.svg   1440x900   常识 fixed 全幅长卷
首次运行会把旧图备份为 *.prev.svg。
"""
import math, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- 描金色板（由亮到深）-------------------------------------------------
C_BRIGHT = "#f6d9a0"   # 最亮高光
C_LIGHT  = "#ecd09a"   # 近山
C_MID    = "#dfb878"   # 主金
C_WARM   = "#e8c47e"   # 中山
C_FAR    = "#b8945a"   # 远山
C_FAINT  = "#8a7448"   # 最深 / 水纹


# =========================================================================
# 几何工具
# =========================================================================
def _fmt(v):
    return f"{v:.1f}"


def polyline(pts):
    d = "M " + " L ".join(f"{_fmt(x)} {_fmt(y)}" for x, y in pts)
    return d


def ridge_d(x0, x1, base, peaks, kind="smooth", step=6):
    """生成一条山脊天际线路径。
    peaks: [(fx, topY), ...]  fx∈(0,1)；首尾自动落到基线 base。
    kind: smooth=余弦圆润山脊 / sharp=折线奇峭峰峦。
    """
    ctrl = [(x0, base)] + [(x0 + fx * (x1 - x0), y) for fx, y in peaks] + [(x1, base)]
    pts = []
    for i in range(len(ctrl) - 1):
        xa, ya = ctrl[i]
        xb, yb = ctrl[i + 1]
        n = max(2, int(round((xb - xa) / step)))
        for k in range(n):
            t = k / n
            tt = t if kind == "sharp" else (1 - math.cos(math.pi * t)) / 2
            pts.append((xa + (xb - xa) * t, ya + (yb - ya) * tt))
    pts.append(ctrl[-1])
    return polyline(pts)


def wave_d(x0, x1, base, amp, freq, phase, step=10):
    """平缓起伏的水纹 / 雾带折线。"""
    pts = []
    x = x0
    while x <= x1:
        y = base + amp * math.sin((x * freq) + phase)
        pts.append((x, y))
        x += step
    pts.append((x1, base + amp * math.sin(x1 * freq + phase)))
    return polyline(pts)


def spiral(cx, cy, r, turns=1.5, dir=1, start=-90, n=46):
    """阿基米德螺线，用于祥云 / 卷浪的涡心。"""
    pts = []
    for i in range(n + 1):
        t = i / n
        ang = math.radians(start) + dir * t * turns * 2 * math.pi
        rr = r * (1 - t)
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    return polyline(pts)


def cloud(cx, cy, s, color, op, sw=1.1):
    """如意祥云：三朵涡云 + 两条水平云带 + 两端内卷。"""
    p = []
    a = f'<g transform="translate({_fmt(cx)},{_fmt(cy)}) scale({s})" stroke="{color}" opacity="{op}" stroke-width="{sw}" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    # 三朵螺旋云头
    p.append(a)
    p.append(f'<path d="{spiral(0,-12,26,1.55,1)}"/>')
    p.append(f'<path d="{spiral(-44,4,17,1.5,1)}"/>')
    p.append(f'<path d="{spiral(44,4,17,1.5,-1)}"/>')
    # 水平云带（拖尾，显飘逸）
    p.append('<path d="M -80 16 H 80"/>')
    p.append('<path d="M -70 27 H 70" opacity="0.7"/>')
    # 带端内卷
    p.append(f'<path d="{spiral(-80,16,9,1.4,-1)}"/>')
    p.append(f'<path d="{spiral(80,16,9,1.4,1)}"/>')
    # 云心小珠点
    p.append('<circle cx="0" cy="-12" r="2.2" opacity="0.8"/>')
    p.append('</g>')
    return "\n    ".join(p)


def wave_band(x0, x1, y, color, op, sw=1.0, gap=118):
    """卷浪纹：一排浪花弧，每朵浪头带涡卷。"""
    out = [f'<g stroke="{color}" opacity="{op}" stroke-width="{sw}" fill="none" stroke-linecap="round" stroke-linejoin="round">']
    out.append(f'<path d="{wave_d(x0,x1,y,3,0.012,0)}" opacity="0.95"/>')
    x = x0 + 30
    while x < x1 - 40:
        out.append(f'<path d="M {x} {y} Q {x+gap/2} {y-42} {x+gap} {y}"/>')
        out.append(f'<path d="M {x+9} {y} Q {x+gap/2} {y-26} {x+gap-9} {y}" opacity="0.7"/>')
        out.append(f'<path d="{spiral(x+gap/2, y-36, 14, 1.5, 1, -70)}" opacity="1"/>')
        x += gap
    out.append('</g>')
    return "\n    ".join(out)


def birds(x, y, color, op=0.8, s=1.0):
    return (f'<g transform="translate({_fmt(x)},{_fmt(y)}) scale({s})" stroke="{color}" '
            f'opacity="{op}" stroke-width="1.1" fill="none" stroke-linecap="round">'
            '<path d="M 0 0 q 6 -8 12 0 q 6 -8 12 0"/>'
            '<path d="M 34 16 q 5 -6 10 0 q 5 -6 10 0" opacity="0.75"/>'
            '<path d="M -36 14 q 5 -6 10 0 q 5 -6 10 0" opacity="0.6"/>'
            '</g>')


def pavilion(px, py, s, color, op=0.92):
    """两层台阁（点景），原点为台基中心。"""
    return f'''<g transform="translate({_fmt(px)},{_fmt(py)}) scale({s})" stroke="{color}" opacity="{op}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3">
      <path d="M -42 0 H 42 M -34 -9 H 34"/>
      <path d="M -26 -9 V -31 M -9 -9 V -31 M 9 -9 V -31 M 26 -9 V -31"/>
      <path d="M -62 -31 C -42 -52, 42 -52, 62 -31"/>
      <path d="M -62 -31 q -11 -2 -15 -13 M 62 -31 q 11 -2 15 -13"/>
      <path d="M -20 -52 H 20 V -31 H -20 Z"/>
      <path d="M -11 -52 V -31 M 0 -52 V -31 M 11 -52 V -31" stroke-width="1"/>
      <path d="M -38 -52 C -25 -70, 25 -70, 38 -52"/>
      <path d="M -38 -52 q -8 -2 -11 -11 M 38 -52 q 8 -2 11 -11"/>
      <path d="M 0 -70 V -84"/>
      <circle cx="0" cy="-88" r="3"/>
    </g>'''


def sailboat(px, py, s, color, op=0.85):
    return f'''<g transform="translate({_fmt(px)},{_fmt(py)}) scale({s})" stroke="{color}" opacity="{op}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M -64 0 C -44 17, 44 17, 64 0" stroke-width="1.5"/>
      <line x1="0" y1="-2" x2="0" y2="-78" stroke-width="1.1"/>
      <path d="M 0 -78 C 32 -78, 46 -48, 46 -18 C 46 -4, 24 4, 0 4 Z" stroke-width="1.2"/>
      <path d="M 0 -60 C 16 -60, 30 -44, 30 -26" stroke-width="0.8" opacity="0.6"/>
      <path d="M 0 -42 C 12 -42, 22 -30, 22 -16" stroke-width="0.7" opacity="0.5"/>
    </g>'''


# =========================================================================
# 一层山脊：外轮廓 + 多层嵌套排线（<use> 复用同一脊线，向基线压缩）
# =========================================================================
_RIDGE_UID = [0]

def range_group(rid, d, base, color, outer_op, outer_sw,
                n_lines, line_color, line_op, line_sw, depth=0.9):
    """外轮廓 s=1；内部 n_lines 条排线 s 由 0.94→(1-depth)。"""
    out = [f'<g fill="none" stroke-linecap="round" stroke-linejoin="round">']
    # 内部排线（先画，压在轮廓下）
    for i in range(n_lines, 0, -1):
        t = i / (n_lines + 1)
        s = 0.94 - (0.94 - (1 - depth)) * t
        ty = (1 - s) * base
        op = line_op * (1 - 0.10 * t)
        out.append(
            f'<use href="#{rid}" transform="matrix(1 0 0 {s:.4f} 0 {ty:.1f})" '
            f'stroke="{line_color}" stroke-width="{line_sw:.2f}" opacity="{op:.3f}"/>')
    # 外轮廓
    out.append(f'<use href="#{rid}" stroke="{color}" stroke-width="{outer_sw:.2f}" opacity="{outer_op:.2f}"/>')
    out.append('</g>')
    return "\n      ".join(out)


def mist_wisps(y, x_step=300, width=150, color=C_MID, op=0.46):
    out = [f'<g stroke="{color}" stroke-width="0.9" opacity="{op}" fill="none" stroke-linecap="round">']
    x = 40
    k = 0
    while x < 3020:
        yy = y + (10 if k % 2 else -8)
        out.append(f'<path d="M {x} {yy} C {x+width*0.35} {yy-8}, {x+width*0.65} {yy+8}, {x+width} {yy}"/>')
        x += x_step
        k += 1
    out.append('</g>')
    return "\n      ".join(out)


def sun(cx, cy, r, ids=("sunHalo", "sunCore")):
    halo, core = ids
    return f'''<circle cx="{cx}" cy="{cy}" r="{r*1.78:.0f}" fill="url(#{halo})" stroke="none"/>
      <circle cx="{cx}" cy="{cy}" r="{r*1.16:.0f}" fill="url(#{core})" stroke="none"/>
      <circle cx="{cx}" cy="{cy}" r="{r:.0f}"      stroke="{C_MID}" stroke-width="0.8" opacity="0.18"/>
      <circle cx="{cx}" cy="{cy}" r="{r*0.72:.0f}" stroke="{C_MID}" stroke-width="1.0" opacity="0.45"/>
      <circle cx="{cx}" cy="{cy}" r="{r*0.48:.0f}" stroke="{C_BRIGHT}" stroke-width="1.4" opacity="0.85"/>'''


def defs_gradients(halo, core, sky):
    return f'''<radialGradient id="{halo}" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#f6d9a0" stop-opacity="0.30"/>
        <stop offset="0.55" stop-color="#dfb878" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#dfb878" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="{core}" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fff6d0" stop-opacity="0.5"/>
        <stop offset="0.6" stop-color="#f6d9a0" stop-opacity="0.2"/>
        <stop offset="1" stop-color="#f6d9a0" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="{sky}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dfb878" stop-opacity="0.05"/>
        <stop offset="0.55" stop-color="#dfb878" stop-opacity="0.02"/>
        <stop offset="1" stop-color="#dfb878" stop-opacity="0.08"/>
      </linearGradient>'''


def write_svg(path, W, H, body, defs_extra, view_note):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # 旧稿统一备份到项目根 bg-backup/，不随 public 发布
    bk_dir = os.path.join(ROOT, "bg-backup")
    bk_path = os.path.join(bk_dir, os.path.basename(path).replace(".svg", ".prev.svg"))
    if os.path.exists(path) and not os.path.exists(bk_path):
        os.makedirs(bk_dir, exist_ok=True)
        shutil.copy2(path, bk_path)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none" stroke="{C_MID}" stroke-linecap="round" stroke-linejoin="round">
  <!-- {view_note} -->
  <defs>
      {defs_extra}
      {{RIDGES}}
  </defs>
  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  {body}
</svg>
'''
    # RIDGES 占位由 body 收集后回填
    return svg


# =========================================================================
# 秘闻 hero  3000 x 1000（主景偏右，左侧留予标题遮罩）
# =========================================================================
def build_miwen():
    W, H = 3000, 1000
    ridge_defs = []
    groups = []

    # 远山（圆润、淡）
    d_far = ridge_d(-20, 3020, 470,
                    [(0.12, 418), (0.22, 446), (0.34, 356), (0.46, 430),
                     (0.58, 326), (0.70, 420), (0.82, 368), (0.92, 430)], "smooth")
    ridge_defs.append('<path id="r-far" d="' + d_far + '"/>')
    groups.append(("far", range_group("r-far", d_far, 470, C_WARM, 0.55, 1.05,
                                      8, C_FAR, 0.3, 0.9, 0.9)))

    # 中远山（柔缓，填山谷层次）
    d_midfar = ridge_d(-20, 3020, 650,
                       [(0.10, 602), (0.24, 566), (0.40, 598), (0.56, 556),
                        (0.72, 592), (0.88, 566)], "smooth")
    ridge_defs.append('<path id="r-midfar" d="' + d_midfar + '"/>')
    groups.append(("midfar", range_group("r-midfar", d_midfar, 650, C_FAR, 0.36, 1.0,
                                         6, C_FAR, 0.18, 0.85, 0.86)))

    # 中景主峰（奇峭折线、高耸，排线密集 —— 磅礴主体）
    d_mid = ridge_d(-20, 3020, 728,
                    [(0.10, 500), (0.155, 428), (0.20, 522), (0.255, 468),
                     (0.31, 542), (0.38, 478), (0.45, 356),
                     (0.50, 118), (0.545, 300), (0.60, 430),
                     (0.66, 328), (0.72, 470), (0.80, 388),
                     (0.86, 500), (0.915, 472), (0.965, 612), (0.995, 692)], "sharp", step=5)
    ridge_defs.append('<path id="r-mid" d="' + d_mid + '"/>')
    groups.append(("mid", range_group("r-mid", d_mid, 728, C_BRIGHT, 1.0, 2.1,
                                      19, C_BRIGHT, 0.62, 1.05, 0.93)))

    # 近山（圆润、亮、低横）
    d_near = ridge_d(-20, 3020, 898,
                     [(0.14, 812), (0.28, 844), (0.42, 798), (0.57, 840),
                      (0.72, 806), (0.86, 842)], "smooth")
    ridge_defs.append('<path id="r-near" d="' + d_near + '"/>')
    groups.append(("near", range_group("r-near", d_near, 898, C_BRIGHT, 0.96, 1.6,
                                       8, C_BRIGHT, 0.58, 0.95, 0.88)))

    # 按层级排序拼装
    gmap = dict(groups)
    body = []
    # 日（右上）
    body.append(sun(2430, 232, 118))
    # 归鸟（左上，淡）
    body.append(birds(470, 250, C_MID, 0.75, 1.15))
    # 祥云（中左 / 中日 / 右）
    body.append(cloud(770, 556, 1.25, C_LIGHT, 0.55, 1.0))
    body.append(cloud(1330, 452, 1.0, C_WARM, 0.5, 0.95))
    body.append(cloud(2110, 330, 0.95, C_LIGHT, 0.5, 0.95))
    # 远山
    body.append(gmap["far"])
    body.append(gmap["midfar"])
    # 中景主峰 + 台阁点景（立于次峰肩）
    body.append(gmap["mid"])
    body.append(pavilion(1982, 344, 1.15, C_LIGHT, 0.9))
    # 雾带
    body.append(mist_wisps(600))
    body.append(mist_wisps(648, 360, 170, C_MID, 0.34))
    # 近山
    body.append(gmap["near"])
    # 水（4 层渐淡）
    for i, (yy, amp, op) in enumerate([(915, 5, 0.6), (942, 4, 0.46), (966, 3.5, 0.34), (988, 3, 0.24)]):
        body.append(f'<path d="{wave_d(-20,3020,yy,amp,0.0042,i*1.3)}" stroke="{C_MID}" stroke-width="0.95" opacity="{op}"/>')
    # 孤帆
    body.append(sailboat(1150, 918, 1.0, C_LIGHT, 0.8))

    defs = defs_gradients("sunHalo", "sunCore", "sky")
    svg = write_svg(os.path.join(ROOT, "public/miwen-bg/hero-landscape.svg"), W, H,
                    "\n  ".join(body), defs,
                    "描金线描山水 · 秘闻 hero（层峦排线 / 主峰磅礴 / 祥云台阁孤帆）")
    svg = svg.replace("{RIDGES}", "\n      ".join(ridge_defs))
    with open(os.path.join(ROOT, "public/miwen-bg/hero-landscape.svg"), "w", encoding="utf-8") as f:
        f.write(svg)


# =========================================================================
# 修炼常识  1440 x 900（fixed 全幅长卷）
# =========================================================================
def build_changshi():
    W, H = 1440, 900
    ridge_defs = []
    groups = []

    d_far = ridge_d(-20, 1460, 442,
                    [(0.15, 390), (0.30, 420), (0.45, 356), (0.60, 414),
                     (0.78, 368), (0.90, 412)], "smooth")
    ridge_defs.append('<path id="c-far" d="' + d_far + '"/>')
    groups.append(("far", range_group("c-far", d_far, 442, C_WARM, 0.52, 1.05,
                                      7, C_FAR, 0.28, 0.9, 0.9)))

    d_midfar = ridge_d(-20, 1460, 656,
                       [(0.12, 612), (0.28, 572), (0.46, 606), (0.62, 566),
                        (0.80, 600), (0.92, 580)], "smooth")
    ridge_defs.append('<path id="c-midfar" d="' + d_midfar + '"/>')
    groups.append(("midfar", range_group("c-midfar", d_midfar, 656, C_FAR, 0.34, 1.0,
                                         6, C_FAR, 0.17, 0.85, 0.86)))

    d_mid = ridge_d(-20, 1460, 708,
                    [(0.12, 468), (0.18, 398), (0.24, 500), (0.33, 448),
                     (0.42, 510),
                     (0.52, 132), (0.58, 328), (0.64, 420),
                     (0.71, 298), (0.78, 440), (0.86, 358), (0.93, 468)],
                    "sharp", step=4)
    ridge_defs.append('<path id="c-mid" d="' + d_mid + '"/>')
    groups.append(("mid", range_group("c-mid", d_mid, 708, C_BRIGHT, 1.0, 1.9,
                                      18, C_BRIGHT, 0.6, 1.0, 0.93)))

    d_near = ridge_d(-20, 1460, 830,
                     [(0.16, 742), (0.32, 772), (0.50, 730), (0.68, 768), (0.84, 740)],
                     "smooth")
    ridge_defs.append('<path id="c-near" d="' + d_near + '"/>')
    groups.append(("near", range_group("c-near", d_near, 830, C_BRIGHT, 0.96, 1.5,
                                       8, C_BRIGHT, 0.56, 0.95, 0.88)))

    gmap = dict(groups)
    body = []
    # 日（右上）
    body.append(sun(1172, 150, 72, ("sunHalo2", "sunCore2")))
    body.append(birds(1006, 118, C_LIGHT, 0.72, 0.8))
    # 大朵祥云居左上（与秘闻镜像），再补一朵
    body.append(cloud(300, 156, 1.15, C_LIGHT, 0.5, 1.0))
    body.append(cloud(636, 118, 0.8, C_WARM, 0.44, 0.9))
    body.append(gmap["far"])
    body.append(gmap["midfar"])
    body.append(cloud(214, 522, 0.95, C_LIGHT, 0.46, 0.9))
    body.append(cloud(1196, 520, 0.95, C_LIGHT, 0.46, 0.9))
    body.append(gmap["mid"])
    # 雾带
    body.append(mist_wisps_changshi(556))
    body.append(mist_wisps_changshi(606, 320, 150, 0.32))
    body.append(gmap["near"])
    # 水纹
    for i, (yy, amp, op) in enumerate([(842, 4, 0.58), (858, 3, 0.42)]):
        body.append(f'<path d="{wave_d(-20,1460,yy,amp,0.009,i*1.4)}" stroke="{C_LIGHT}" stroke-width="0.9" opacity="{op}"/>')
    # 卷浪带
    body.append(wave_band(16, 1424, 874, C_LIGHT, 0.66, 1.1, 116))
    body.append(wave_band(64, 1396, 896, C_MID, 0.42, 0.9, 116))

    defs = defs_gradients("sunHalo2", "sunCore2", "sky")
    svg = write_svg(os.path.join(ROOT, "public/shanhai/shanhai-panorama-2.svg"), W, H,
                    "\n  ".join(body), defs,
                    "描金线描山水 · 修炼常识全幅长卷（层峦排线 / 主峰磅礴 / 祥云卷浪）")
    svg = svg.replace("{RIDGES}", "\n      ".join(ridge_defs))
    with open(os.path.join(ROOT, "public/shanhai/shanhai-panorama-2.svg"), "w", encoding="utf-8") as f:
        f.write(svg)


def mist_wisps_changshi(y, x_step=290, width=140, op=0.44):
    out = [f'<g stroke="{C_MID}" stroke-width="0.9" opacity="{op}" fill="none" stroke-linecap="round">']
    x = 30
    k = 0
    while x < 1440:
        yy = y + (9 if k % 2 else -7)
        out.append(f'<path d="M {x} {yy} C {x+width*0.35} {yy-7}, {x+width*0.65} {yy+7}, {x+width} {yy}"/>')
        x += x_step
        k += 1
    out.append('</g>')
    return "\n      ".join(out)


if __name__ == "__main__":
    build_miwen()
    build_changshi()
    # 校验 XML 合法
    import xml.etree.ElementTree as ET
    for p in ["public/miwen-bg/hero-landscape.svg",
              "public/shanhai/shanhai-panorama-2.svg"]:
        full = os.path.join(ROOT, p)
        ET.parse(full)
        print("OK", p, os.path.getsize(full), "bytes")
