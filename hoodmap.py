"""DEFAULT satellite location map ("hood map", Jason 29 Oct 2026, ref: Crib Creative 36A Cobham Way).
Natural satellite, black teardrop pins with white icons, white rectangular labels in thin caps "NAME - 1.4km",
house pin with no label, house photo inset in a white frame.
usage: python3 hoodmap.py cfg.json out.jpg
cfg: {sat:"sat/<slug>", house:[lat,lng], photo:"x.jpg", places:[{name,lat,lng,icon}], W:3000, aspect:1.6,
      houseX:0.5, houseY:0.5, photoCorner:"auto"|"tl"|"tr"|"bl"|"br"}"""
import json, sys, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(sys.argv[1])); OUT = sys.argv[2]
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-'+C.get('fontW','Regular')+'.ttf'
if not os.path.exists(FONT): FONT = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
S = json.load(open(C['sat']+'.json')); base = Image.open(C['sat']+'.jpg').convert('RGB')
def gpx(lat, lng):
    n = 2**S['z']; x = (lng+180)/360*n; la = math.radians(lat); y = (1-math.log(math.tan(la)+1/math.cos(la))/math.pi)/2*n
    return (x-S['x0'])*256, (y-S['y0'])*256
hlat, hlng = C['house']; HX, HY = gpx(hlat, hlng)
AR = C.get('aspect', 1.72); cw = min(base.width, int(base.height*AR), int(C.get('cropW', 1e9))); ch = int(cw/AR)   # cropW: source px across (Crib zoom ≈ 11 km wide)
ox = int(min(max(HX-cw*C.get('houseX', 0.5), 0), base.width-cw)); oy = int(min(max(HY-ch*C.get('houseY', 0.5), 0), base.height-ch))
W = C.get('W', 3000); H = int(W/AR); k = W/cw
img = base.crop((ox, oy, ox+cw, oy+ch)).resize((W, H), Image.LANCZOS)
img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(C.get('sat_', 1.0))).enhance(1.04)
def P(lat, lng): x, y = gpx(lat, lng); return (x-ox)*k, (y-oy)*k
def dist(lat, lng):
    dy = (lat-hlat)*111320; dx = (lng-hlng)*111320*math.cos(math.radians(hlat)); return math.hypot(dx, dy)
def dtxt(m):
    if m < 1000: return f"{int(round(m/50)*50)}m"
    v = round(m/1000, 1); return f"{v:g}km"
U = W/3000; R = int(C.get('pinR', 63)*U); TIP = int(C.get('pinTip', 92)*U)   # 31 Oct: measured from the Crib Creative map (bigger pins, shorter tip)
LH = int(68*U); FS = int(C.get('fs',40)*U); TRACK = C.get('track',0.5)*U; GAP = int(8*U)
font = ImageFont.truetype(FONT, FS)
def tw(t): d = ImageDraw.Draw(Image.new('L', (1, 1))); return sum(d.textlength(c, font=font) for c in t)+TRACK*(len(t)-1)
def icon(name, size):
    p = os.path.join(HERE, 'icons', name+'.png')
    if name in ('lake', 'river', 'waves'):
        im = Image.new('LA', (112, 112), (0, 0)); d = ImageDraw.Draw(im)
        for yy in (34, 56, 78):
            pts_ = [(x, yy + 7*math.sin((x-14)/84*2*math.pi*1.5)) for x in range(14, 99, 2)]
            d.line(pts_, fill=(255, 255), width=9, joint='curve')
    elif name == 'house' or not os.path.exists(p):
        im = Image.new('LA', (112, 112), (0, 0)); d = ImageDraw.Draw(im)
        d.polygon([(56, 18), (98, 56), (86, 56), (86, 94), (26, 94), (26, 56), (14, 56)], fill=(255, 255)); d.rectangle([48, 66, 64, 94], fill=(0, 0))
    else: im = Image.open(p).convert('LA')
    a = im.split()[-1].resize((size, size), Image.LANCZOS); w = Image.new('RGBA', (size, size), (255, 255, 255, 0)); w.putalpha(a); return w
def pin(x, y, ic):
    """teardrop with its tip at (x,y); returns head centre"""
    cx, cy = x, y-TIP
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    sd.ellipse([cx-R+4, cy-R+8, cx+R+4, cy+R+8], fill=(0, 0, 0, 110)); sd.polygon([(cx-R*0.72+4, cy+R*0.62+8), (cx+R*0.72+4, cy+R*0.62+8), (x+4, y+6)], fill=(0, 0, 0, 110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7*U)))
    d = ImageDraw.Draw(img)
    d.polygon([(cx-R*0.74, cy+R*0.62), (cx+R*0.74, cy+R*0.62), (x, y)], fill=(16, 16, 16, 255)); d.ellipse([cx-R, cy-R, cx+R, cy+R], fill=(16, 16, 16, 255))
    s = int(R*1.12); img.alpha_composite(icon(ic, s), (int(cx-s/2), int(cy-s/2)))
    return cx, cy
img = img.convert('RGBA')
# photo inset (white frame), in the corner with fewest places, away from the house
placed = []
def hits(bb): return any(not (bb[2] < p[0] or bb[0] > p[2] or bb[3] < p[1] or bb[1] > p[3]) for p in placed)
hx, hy = P(hlat, hlng)
pts = [P(p['lat'], p['lng']) for p in C['places']]
PWf = C.get('photoW', 0.33); PW = int(W*PWf); FR = int(9*U); M = int(36*U)
if C.get('photo'):
    ph = Image.open(C['photo']).convert('RGB'); PH = int(PW*ph.height/ph.width)
    corners = {'tl': (M, M), 'tr': (W-M-PW-2*FR, M), 'bl': (M, H-M-PH-2*FR), 'br': (W-M-PW-2*FR, H-M-PH-2*FR)}
    def cost(c):
        x0, y0 = corners[c]; bb = (x0-60*U, y0-60*U, x0+PW+2*FR+60*U, y0+PH+2*FR+60*U)
        inside = sum(1 for (x, y) in pts if bb[0]-R < x < bb[2]+R and bb[1] < y < bb[3]+TIP+R) + 99*(bb[0]-R < hx < bb[2]+R and bb[1] < hy < bb[3]+TIP+R)
        return inside*10 + math.hypot(x0+PW/2-hx, y0+PH/2-hy)/W
    c = C.get('photoCorner', 'auto'); c = min(corners, key=cost) if c == 'auto' else c
    x0, y0 = corners[c]; fb = (x0, y0, x0+PW+2*FR, y0+PH+2*FR)
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle([fb[0]+6, fb[1]+10, fb[2]+6, fb[3]+10], fill=(0, 0, 0, 120))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14*U)))
    ImageDraw.Draw(img).rectangle(fb, fill='white'); img.paste(ph.resize((PW, PH), Image.LANCZOS), (x0+FR, y0+FR))
    placed.append((fb[0]-10, fb[1]-10, fb[2]+10, fb[3]+10))
    keep = [i for i, (x, y) in enumerate(pts) if not (fb[0]-R < x < fb[2]+R and fb[1] < y < fb[3]+TIP+R)]
    for i in range(len(pts)):
        if i not in keep: print('under photo, dropped', C['places'][i]['name'])
    C['places'] = [C['places'][i] for i in keep]; pts = [pts[i] for i in keep]
# reserve every pin (heads + stems) first so labels never cover a pin
placed.append((hx-R-6, hy-TIP-R-6, hx+R+6, hy+4))
for (x, y) in pts: placed.append((x-R-6, y-TIP-R-6, x+R+6, y+4))
order = sorted(range(len(C['places'])), key=lambda i: dist(C['places'][i]['lat'], C['places'][i]['lng']))
labels, pins_ = [], []
for i in order:
    p = C['places'][i]; x, y = pts[i]
    if not (R < x < W-R and TIP+R < y < H): print('off map', p['name']); continue
    nm = p.get('label', p['name']); nm = nm.upper() if C.get('labelCase', 'upper') == 'upper' else nm
    t = f"{nm} - {dtxt(dist(p['lat'], p['lng']))}"
    bw = tw(t)+2*int(18*U); cy = y-TIP; done = None
    for side in ([1, -1] if p.get('side', 'r') == 'r' else [-1, 1]):
        for dy in (0, -LH*0.9, LH*0.9, -LH*1.8, LH*1.8):
            bx = x+R+GAP if side > 0 else x-R-GAP-bw; by = cy-LH/2+dy
            bb = (bx, by, bx+bw, by+LH)
            if bx < 12 or bx+bw > W-12 or by < 12 or by+LH > H-12: continue
            if not hits(bb): done = bb; break
        if done: break
    if not done: print('no room', p['name']); pins_.append((x, y, p.get('icon', 'park'))); continue
    placed.append(done); labels.append((done, t)); pins_.append((x, y, p.get('icon', 'park')))
# draw labels then pins (pins always on top)
for (bb, t) in labels:
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle([bb[0]+3, bb[1]+6, bb[2]+3, bb[3]+6], fill=(0, 0, 0, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6*U)))
    d = ImageDraw.Draw(img); d.rectangle(bb, fill=(255, 255, 255, 255))
    xx = bb[0]+int(18*U); yy = (bb[1]+bb[3])/2+1
    for c in t: d.text((xx, yy), c, font=font, fill=(20, 20, 20), anchor='lm'); xx += d.textlength(c, font=font)+TRACK
for (x, y, ic) in pins_: pin(x, y, ic)
pin(hx, hy, 'house')
img.convert('RGB').save(OUT, quality=93)
print('labels', [t for _, t in labels])
