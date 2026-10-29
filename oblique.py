"""Oblique 'Google-Earth style' location map from satellite mosaics.
usage: python3 oblique.py cfg.json out.jpg
cfg: {house:[lat,lng], addr, bearing, back, alt, fov, places:[{name,lat,lng}], cbd:{lat,lng}, mos:[keys hi->lo]}
"""
import json, math, sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = math.pi/180
C = json.load(open(sys.argv[1])); OUT = sys.argv[2]
W, H = C.get('size', [3000, 2000]); SS = 2
lat0, lng0 = C['house']; kx = 111320*math.cos(lat0*D); ky = 110574.0

def enu(lat, lng): return ((lng-lng0)*kx, (lat-lat0)*ky)

# camera
b = C['bearing']*D; fwd2 = np.array([math.sin(b), math.cos(b)])
cam = np.array([*(-fwd2*C['back']), C['alt']])
look = np.array([*(fwd2*C.get('aim', 0)), 0.0]) - cam   # aim at a point 'aim' metres past the house
f = look/np.linalg.norm(look); r = np.cross(f, [0, 0, 1.0]); r /= np.linalg.norm(r); u = np.cross(r, f)
fp = (W/2)/math.tan(C['fov']*D/2)

def project(e, n, z=0.0):
    v = np.array([e, n, z]) - cam; x, y, zz = v@r, v@u, v@f
    return (W/2 + fp*x/zz, H/2 - fp*y/zz, zz)

# mosaics
MOS = []
for k in C['mos']:
    m = json.load(open(f'sat/{k}.json')); im = cv2.imread(f'sat/{k}.jpg')
    MOS.append(dict(z=m['z'], x0=m['x0'], y0=m['y0'], im=im, blur=cv2.GaussianBlur(im, (0, 0), 1.6), Hh=im.shape[0], Ww=im.shape[1]))

def mpix(m, lat, lng):
    n = 2**m['z']; x = (lng+180)/360*n; la = lat*D
    y = (1-np.log(np.tan(la)+1/np.cos(la))/math.pi)/2*n
    return ((x-m['x0'])*256).astype(np.float32), ((y-m['y0'])*256).astype(np.float32)

# ray cast (supersampled, in strips to keep memory low)
Ws, Hs = W*SS, H*SS
def strip(r0, r1):
    xs = (np.arange(Ws)+.5)/SS; ys = (np.arange(r0, r1)+.5)/SS
    X, Y = np.meshgrid(xs, ys)
    dx = ((X-W/2)/fp).astype(np.float32); dy = (-(Y-H/2)/fp).astype(np.float32)
    V = r[None, None, :].astype(np.float32)*dx[..., None] + u[None, None, :].astype(np.float32)*dy[..., None] + f[None, None, :].astype(np.float32)
    vz = V[..., 2]; ground = vz < -1e-4
    t = np.where(ground, -cam[2]/np.where(ground, vz, -1), 0)
    E = cam[0]+V[..., 0]*t; N = cam[1]+V[..., 1]*t; dist = np.hypot(E-cam[0], N-cam[1])
    ground &= dist < C.get('farCut', 80000)
    LAT = (lat0 + N/ky).astype(np.float64); LNG = (lng0 + E/kx).astype(np.float64)
    LAT = np.where(ground, LAT, lat0); LNG = np.where(ground, LNG, lng0)
    out = np.zeros(ground.shape+(3,), np.float32); have = np.zeros(ground.shape, bool)
    for i, m in enumerate(MOS):
        px, py = mpix(m, LAT, LNG)
        ok = ground & ~have & (px >= 0) & (py >= 0) & (px < m['Ww']-1) & (py < m['Hh']-1)
        ok &= dist < C.get('maxDist', [3500, 7000, 14000, 1e9, 1e9])[i]
        if not ok.any(): continue
        src = m['im']
        s_ = cv2.remap(src, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        out[ok] = s_[ok]; have |= ok
    sea = np.array(C.get('sea', [150, 110, 40]), np.float32)
    out[ground & ~have] = sea
    Bc, Gc, Rc = out[..., 0], out[..., 1], out[..., 2]
    water = ground & (Bc > Rc+12) & (Bc >= Gc-4) & (Bc+Gc+Rc < 360) & (dist > 4000)
    wt = np.array(C.get('seaTint', [178, 118, 38]), np.float32)
    lum = (out[..., 0:1]+out[..., 1:2]+out[..., 2:3])/3
    out[water] = (wt*(0.75+lum/255.0*0.9))[water]*0.8 + out[water]*0.2
    g = out/255.0; g = np.clip((g-.5)*1.08+.5+.02, 0, 1)
    hsv = cv2.cvtColor((g*255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32); hsv[..., 1] *= 1.12
    out = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    haze = np.array([244, 226, 206], np.float32)
    elev_g = np.arctan2(-vz, np.hypot(V[..., 0], V[..., 1]))/D   # degrees below horizontal
    a = (np.clip(1-elev_g/C.get('fadeDeg', 3.5), 0, 1)**C.get('hazePow', 1.6)).astype(np.float32)
    a = np.maximum(a, (np.clip((dist-3000)/30000, 0, 1)*0.35).astype(np.float32))
    out = out*(1-a[..., None]) + haze*a[..., None]
    sky = ~ground
    elev = np.arctan2(vz, np.hypot(V[..., 0], V[..., 1]))
    s_t = np.clip(elev/(12*D), 0, 1)[..., None]
    top = np.array([214, 160, 104], np.float32); hor = np.array([244, 226, 206], np.float32)
    skyc = hor*(1-s_t) + top*s_t
    out[sky] = skyc[sky]
    return cv2.resize(np.clip(out, 0, 255).astype(np.uint8), (W, (r1-r0)//SS), interpolation=cv2.INTER_AREA)
step = 200*SS
img = np.vstack([strip(r0, min(Hs, r0+step)) for r0 in range(0, Hs, step)])
# soften the horizon seam
img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

if C.get('style') == 'elegant':
    exec(open('oblique_el.py').read()); sys.exit()
# ---------- overlays ----------
dr = ImageDraw.Draw(img)
FB = '/usr/share/fonts/opentype/inter/Inter-Black.otf'; FX = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
def font(sz, p=FB): return ImageFont.truetype(p, sz)
def outlined(xy, text, fnt, fill=(255, 255, 255), anchor='mm', sw=None, spacing=0):
    sw = sw or max(3, fnt.size//9)
    # soft shadow
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    sd.multiline_text((xy[0]+3, xy[1]+4), text, font=fnt, fill=(0, 0, 0, 170), anchor=anchor, align='center', stroke_width=sw, stroke_fill=(0, 0, 0, 170), spacing=spacing)
    sh = sh.filter(ImageFilter.GaussianBlur(4)); img.paste(sh, (0, 0), sh)
    ImageDraw.Draw(img).multiline_text(xy, text, font=fnt, fill=fill, anchor=anchor, align='center', stroke_width=sw, stroke_fill=(20, 20, 20), spacing=spacing)

placed = []
_hx, _hy, _ = project(0, 0); _ph = C.get('pinH', 150)
placed.append((_hx-_ph*0.45, _hy-_ph-10, _hx+_ph*0.45, _hy+10))
def overlaps(bb): return any(not (bb[2] < p[0] or bb[0] > p[2] or bb[3] < p[1] or bb[1] > p[3]) for p in placed)
report = []
dots = []
for p in C['places']:
    e, n = enu(p['lat'], p['lng']); x0_, y0_, zz = project(e, n)
    txt = p.get('label', p['name']).upper(); fs = int(p.get('size', C.get('labelSize', 50)))
    fnt = font(fs)
    ok = zz > 0 and 40 < x0_ < W-40 and 40 < y0_ < H-40
    if not ok: report.append((p['name'], 'off-frame')); continue
    gap = 22
    cands = [(x0_, y0_-gap, 'md'), (x0_, y0_+gap, 'ma'), (x0_-gap, y0_, 'rm'), (x0_+gap, y0_, 'lm')]
    pref = p.get('side')
    if pref: cands = [c for c in cands if c[2] == pref] + [c for c in cands if c[2] != pref]
    best = None
    for (x, y, anc) in cands:
        bb = dr.multiline_textbbox((x, y), txt, font=fnt, anchor=anc, align='center', stroke_width=8)
        bb = (bb[0]-10, bb[1]-6, bb[2]+10, bb[3]+6)
        inside = bb[0] > 10 and bb[2] < W-10 and bb[1] > 10 and bb[3] < H-180
        if inside and not overlaps(bb): best = (x, y, anc, bb); break
    if best is None: best = (cands[0][0], cands[0][1], cands[0][2], bb); clash = True
    else: clash = False
    x, y, anc, bb = best; placed.append(bb); dots.append((x0_, y0_))
    report.append((p['name'], round(x0_), round(y0_), anc, 'CLASH' if clash else ''))
    outlined((x, y), txt, fnt, anchor=anc, spacing=-4)
for (x, y) in dots:
    ImageDraw.Draw(img).ellipse([x-11, y-11, x+11, y+11], fill=(213, 30, 39), outline='white', width=5)

# house pin
he, hn = 0, 0; hx, hy, _ = project(he, hn)
pin_h = C.get('pinH', 150); pw = pin_h*0.72
pin = Image.new('RGBA', (int(pw)+20, int(pin_h)+20), (0, 0, 0, 0)); pd = ImageDraw.Draw(pin)
cx, R = pin.width/2, pw/2
pts = [(cx, pin_h+6)]
for k in range(0, 361, 5):
    a_ = (k-90)*D
    if 35 <= k <= 145: continue
pd.polygon([(cx-R*0.8, R*1.55), (cx+R*0.8, R*1.55), (cx, pin_h+4)], fill=(213, 30, 39, 255))
pd.ellipse([cx-R, 6, cx+R, 6+2*R], fill=(213, 30, 39, 255), outline=(255, 255, 255, 255), width=5)
# white house glyph
s = R*0.95; ox, oy = cx, 6+R
pd.polygon([(ox-s*0.55, oy-s*0.02), (ox, oy-s*0.5), (ox+s*0.55, oy-s*0.02)], fill='white')
pd.rectangle([ox-s*0.38, oy-s*0.05, ox+s*0.38, oy+s*0.42], fill='white')
pd.rectangle([ox-s*0.1, oy+s*0.12, ox+s*0.1, oy+s*0.42], fill=(213, 30, 39, 255))
shadow = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(shadow).ellipse([hx-28, hy-9, hx+28, hy+9], fill=(0, 0, 0, 120))
shadow = shadow.filter(ImageFilter.GaussianBlur(6)); img.paste(shadow, (0, 0), shadow)
img.paste(pin, (int(hx-pin.width/2), int(hy-pin_h-4)), pin)

# CBD arrow (top-left, pointing left)
if C.get('cbd'):
    ce, cn = enu(*C['cbd']); km = math.hypot(ce, cn)/1000
    ax, ay = C.get('cbdXY', [70, 230]); aw, ah = 520, 150
    poly = [(ax, ay), (ax+ah*0.62, ay-ah*0.62), (ax+ah*0.62, ay-ah*0.3), (ax+aw, ay-ah*0.42), (ax+aw-12, ay+ah*0.42), (ax+ah*0.62, ay+ah*0.3), (ax+ah*0.62, ay+ah*0.62)]
    rot = C.get('cbdRot', 12)
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    ld.polygon(poly, fill=(213, 30, 39, 255), outline=(255, 255, 255, 255), width=6)
    lay = lay.rotate(rot, center=(ax+aw/2, ay), resample=Image.BICUBIC)
    sh = lay.split()[3].filter(ImageFilter.GaussianBlur(6)); shl = Image.new('RGBA', img.size, (0, 0, 0, 0)); shl.putalpha(sh.point(lambda v: v*0.55))
    img.paste(shl, (6, 8), shl); img.paste(lay, (0, 0), lay)
    tl = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(tl).multiline_text((ax+aw*0.58, ay), f"PERTH CBD\n{km:.1f}KMS AWAY", font=font(44), fill='white', anchor='mm', align='center', spacing=2)
    tl = tl.rotate(rot, center=(ax+aw/2, ay), resample=Image.BICUBIC); img.paste(tl, (0, 0), tl)
    report.append(('CBD km', round(km, 2)))

# address banner
bh = C.get('bannerH', 120); bw = C.get('bannerW', int(W*0.62))
ban = Image.new('RGBA', (bw, bh), (196, 24, 32, 240)); bd = ImageDraw.Draw(ban)
bd.rectangle([0, 0, bw, 7], fill=(255, 255, 255, 230))
bd.text((44, bh/2+3), C['addr'].upper(), font=font(66), fill='white', anchor='lm')
img.paste(ban, (0, H-bh-C.get('bannerGap', 40)), ban)
img.convert('RGB').save(OUT, quality=93)
for x in report: print(x)
print('house px', round(hx), round(hy))
