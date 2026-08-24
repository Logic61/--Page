
import cv2
import numpy as np
buf = np.fromfile('巫/分支图-10.png', dtype=np.uint8)
img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
H, W = img.shape[:2]
L = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
t = np.clip((L - 10) / 42.0, 0, 1)
key = (t * t * (3 - 2 * t) * 255).astype(np.uint8)
base_rgb = (228, 192, 92)
dark_rgb = (88, 60, 24)
base_f = np.array([base_rgb[2], base_rgb[1], base_rgb[0]], dtype=np.float32)
dark_f = np.array([dark_rgb[2], dark_rgb[1], dark_rgb[0]], dtype=np.float32)
tn = (key.astype(np.float32)/255.0)[..., None]
wells = [(120,570,290,700),(690,570,960,700),(105,1035,295,1170),(745,1035,930,1170)]
well_mask = np.zeros((H,W), dtype=np.uint8)
for (x1,y1,x2,y2) in wells: well_mask[y1:y2,x1:x2] = 1
wm = well_mask[..., None].astype(np.float32)
discs = [(512,190,150),(204,596,135),(824,596,135),(198,1066,135),(836,1066,135)]
yy, xx = np.mgrid[0:H, 0:W]
exclude = np.zeros((H,W), dtype=np.uint8)
for (cx,cy,r) in discs: exclude[(xx-cx)**2+(yy-cy)**2 <= r*r] = 1
trunk_mask = ((key > 60) & (L > 90) & (exclude == 0)).astype(np.uint8)*255
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
solid = np.maximum(cv2.dilate(trunk_mask, k, iterations=3), key)
body = base_f*(1-tn) + img.astype(np.float32)*tn
well = dark_f*(1-tn) + img.astype(np.float32)*tn
rgb_out = np.clip(body*(1-wm) + well*wm, 0, 255).astype(np.uint8)
a = np.maximum(key, (solid > 60).astype(np.uint8)*255)
out = np.dstack([rgb_out, a])
ok, enc = cv2.imencode('.png', out)
enc.tofile('public/巫/分支图-10-solid.png')
print('production texture written, solid share', round((a>60).mean()*100,1))
