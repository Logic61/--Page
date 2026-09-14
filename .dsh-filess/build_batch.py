# -*- coding: utf-8 -*-
import json, os

UPLOADS = r"C:\Users\32372\hermes-workspace\巫祝page\.dsh-filess\uploads.json"
OUT = r"C:\Users\32372\hermes-workspace\巫祝page\.dsh-filess\batch-9.json"

with open(UPLOADS, "r", encoding="utf-8-sig") as f:
    urls = json.load(f)

STYLE = (
    "Hyperrealistic dark fantasy cinematic 3D render in Baroque tenebrism style. "
    "Pitch-black void background, only localized golden light sources illuminate the scene. "
    "Realistic physical materials: real gold-leaf texture, atmospheric smoke visible only where backlit. "
    "Volumetric god rays, real depth of field, cinematic color grading with crushed blacks, 8K. "
    "NO palace, NO temple, NO architecture on top of altars. "
)

# Each entry: (original_bg_filename, slug, scene-description, output_filename)
art = [
    ("fa-jie-zhenxiang.webp", "fa-jie",
     "Multiple concentric floating golden rings or portals layered like an interdimensional gateway, "
     "a massive blazing golden sun at the center of the innermost ring, violent golden lightning bolts "
     "piercing through all the rings, fierce flames licking the bottom. "
     "Ancient Chinese leiwen thunder pattern spirals (rectilinear and curling spirals like the project's "
     "巫/雷纹/ collection) trace the outer edges of the rings as glowing ritual sigils. "
     "The whole scene feels like portals to other realms.", "bg-fa-jie-zhenxiang.webp"),

    ("shen-dao-zhenxiang.webp", "shen-dao",
     "A massive elevated stone altar (BARE base only, NO temple or palace on top) at the lower center, "
     "with a giant blazing golden sun directly above pressing down on it, violent golden lightning bolts "
     "radiating outward from the sun, fierce flames licking the altar base. "
     "Ancient Chinese leiwen thunder pattern spirals (rectilinear and curling spirals) carved into the "
     "stone altar edges glowing with golden energy. The altar sits in pure dark void.", "bg-shen-dao-zhenxiang.webp"),

    ("fu-ti-zhenxiang.webp", "fu-ti",
     "A dark silhouette of a human figure standing at the center, a ghostly golden light orb descending "
     "from above about to merge into the figure's chest, violent golden lightning bolts surrounding and "
     "binding the figure in a cage of energy, fierce flames at the base. "
     "Ancient Chinese leiwen thunder pattern spirals (rectilinear and curling spirals) orbiting around the "
     "figure as binding sigils. The whole scene reads as spirit possession.", "bg-fu-ti-zhenxiang.webp"),

    ("xia-zhong-zhenxiang.webp", "xia-zhong",
     "A vertical shaft of intense golden light pouring down from a massive blazing sun above into a "
     "womb-like glowing oval form at the bottom, a fire pit glowing beneath the oval, violent golden "
     "lightning striking the sides, a clear path of light between sun and oval. "
     "Ancient Chinese leiwen thunder pattern spirals lining both sides of the light shaft as ritual "
     "markings. Pure dark void background.", "bg-xia-zhong-zhenxiang.webp"),

    ("quan-shan-zhenxiang.webp", "quan-shan",
     "A blazing golden sun in the upper right corner with a beam of intense golden light extending down-left, "
     "a small ghostly soul light being lifted and guided upward along the beam, lightning bolts illuminating "
     "the path, fierce fire at the bottom. "
     "Ancient Chinese leiwen thunder pattern spirals forming the path markings along which the soul rises. "
     "Pure dark void background.", "bg-quan-shan-zhenxiang.webp"),

    ("tao-ming-mimi.webp", "tao-ming",
     "A small dim golden orb at the center (almost extinguished, like a hidden spirit), surrounded by an "
     "explosion of dissipating light, violent golden lightning, and fierce flames radiating outward and "
     "breaking apart, scattered ancient Chinese leiwen thunder pattern spiral fragments dissolving into "
     "golden sparks and embers. The center is dim and quiet, the periphery is violent energy. "
     "Pure dark void background.", "bg-tao-ming-mimi.webp"),

    ("fa-shu-mimi.webp", "fa-shu",
     "A massive glowing golden ritual seal or sigil floating in the center, made of densely packed "
     "ancient Chinese leiwen thunder pattern spirals and rectilinear sigils, with violent golden lightning "
     "bolts erupting outward from the seal in all directions, fierce flames at the bottom edges. "
     "The seal radiates raw arcane power. Pure dark void background.", "bg-fa-shu-mimi.webp"),

    ("fu-lu-mimi.webp", "fu-lu",
     "A massive glowing golden talisman array centered, composed of interlocking ancient Chinese leiwen "
     "thunder pattern spirals and rectilinear sigils forming a ritual magic circle, with a brilliant "
     "golden core glowing in the middle, violent golden lightning bolts striking the array from outside, "
     "fierce flames licking the edges. The array looks like an active protective talisman. "
     "Pure dark void background.", "bg-fu-lu-mimi.webp"),

    ("fa-qi-mimi.webp", "fa-qi",
     "A floating golden ritual artifact in the center (a stylized ancient Chinese bronze sword or "
     "ritual seal or bronze mirror), with ancient Chinese leiwen thunder pattern spirals engraved across "
     "its body glowing with golden energy, violent golden lightning bolts and fierce flames erupting around "
     "it. The artifact radiates sacred, dangerous power. Pure dark void background.", "bg-fa-qi-mimi.webp"),
]

requests = []
for bg, slug, scene, out_name in art:
    prompt = STYLE + " " + scene + " 16:9, no text or watermark"
    requests.append({
        "prompt": prompt,
        "input_urls": [urls[bg]],
        "aspect_ratio": "16:9",
        "resolution": "2K",
        "output_file": out_name,
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"requests": requests}, f, ensure_ascii=False, indent=2)

print("wrote", OUT, "with", len(requests), "requests")
