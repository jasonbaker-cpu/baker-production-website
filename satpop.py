"""Top-down satellite location map with frosted labels + a house photo pop-up.
usage: python3 satpop.py cfg.json out.jpg"""
import json, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
C = json.load(open(sys.argv[1])); OUT = sys.argv[2]
FD = '/usr/share/fonts/opentype/inter/'
def F(w, s): return ImageFont.truetype(FD + {'r':'Inter-Regular.otf','m':'Inter-Medium.otf','s':'Inter-SemiBold.otf','ds':'InterDisplay-SemiBold.otf','l':'Inter-Light.otf'}[w], s)
S = json.load(open(C['sat']+'.json')); base = Image.open(C['sat']+'.jpg').convert('RGB')
def px(lat, lng):
    n = 2**S['z']; x = (lng+180)/360*n; la = math.radians(lat); y = (1-math.log(math.tan(la)+1/math.cos(la))/math.pi)/2*n
    return (x-S['x0'])*256, (y-S['y0'])*256
hlat, hlng = C['house']; HX, HY = px(hlat, hlng)
cw = base.width; ch = int(cw/1.5); oy = int(min(max(HY - ch*C.get('houseY', 0.5), 0), base.height-ch)); ox = 0
img = base.crop((ox, oy, ox+cw, oy+ch)).resize((3000, 2000), Image.LANCZOS); k = 3000/cw
W, H = img.size
def P(lat, lng): x, y = px(lat, lng); return (x-ox)*k, (y-oy)*k
def dist(lat, lng):
    dy = (lat-hlat)*111320; dx = (lng-hlng)*111320*math.cos(math.radians(hlat)); return math.hypot(dx, dy)
# grade + vignette
img = ImageEnhance.Color(img).enhance(0.92); img = ImageEnhance.Contrast(img).enhance(1.03)
vg = Image.new('L', (W, H), 0); ImageDraw.Draw(vg).ellipse([-W*0.2, -H*0.25, W*1.2, H*1.25], fill=255); vg = vg.filter(ImageFilter.GaussianBlur(220))
img = Image.composite(img, Image.blend(img, Image.new('RGB', (W, H), (10, 14, 20)), 0.42), vg)
g = Image.new('L', (1, 256)); [g.putpixel((0, y), int(max(0, (y-110)/146)**1.6*210)) for y in range(256)]
g = g.resize((W, int(H*0.26))); img.paste(Image.new('RGB', (W, g.height), (12, 16, 22)), (0, H-g.height), g)
img = img.convert('RGBA')
hx, hy = P(hlat, hlng); STEM = C.get('stem', 120); R = 44
placed = [(hx-R-16, hy-STEM-R-14, hx+R+16, hy+14)]
# photo pop-up card
ph = Image.open(C['photo']).convert('RGB'); PW = C.get('photoW', 760); PH = int(PW*ph.height/ph.width)
pad = 14; capH = 92; cardW, cardH = PW+2*pad, PH+pad+capH
cx0, cy0 = hx + C.get('cardDX', 120), hy - STEM - C.get('cardUp', 40) - cardH
cx0 = min(max(cx0, 40), W-cardW-40); cy0 = max(cy0, 40)
card = (cx0, cy0, cx0+cardW, cy0+cardH); placed.append((card[0]-16, card[1]-16, card[2]+16, card[3]+40))
def hits(bb): return any(not (bb[2] < p[0] or bb[0] > p[2] or bb[3] < p[1] or bb[1] > p[3]) for p in placed)
# labels
fN, fK = F('s', 36), F('m', 26); labels = []
pl = sorted(C['places'], key=lambda p: dist(p['lat'], p['lng']))
for p in pl:
    x, y = P(p['lat'], p['lng'])
    if not (40 < x < W-40 and 40 < y < H-40): print('off map', p['name']); continue
    m = dist(p['lat'], p['lng']); kt = f"{m/1000:.1f} km" if m >= 1000 else f"{round(m/10)*10:.0f} m"
    d0 = ImageDraw.Draw(img); tw = max(d0.textlength(p['name'], font=fN), d0.textlength(kt, font=fK)); bw, bh = tw+48, 96
    best = None
    for L in [60, 95, 130, 170, 215, 260, 310]:
        for up in (True, False):
            for sx in [0, -0.32, 0.32, -0.45, 0.45]:
                bx = x+sx*bw-bw/2; by = (y-L-bh) if up else (y+L)
                bb = (bx-8, by-8, bx+bw+8, y+6) if up else (bx-8, y-6, bx+bw+8, by+bh+8)
                if bx < 24 or bx+bw > W-24 or by < 24 or by+bh > H-170: continue
                if not hits(bb): best = (bx, by); break
            if best: break
        if best: break
    if not best: print('no room', p['name']); continue
    bx, by = best; placed.append((bx-8, by-8, bx+bw+8, by+bh+8)); placed.append((x-14, min(by+bh, y)-2, x+14, max(by, y)+2))
    labels.append((x, y, bx, by, bw, bh, p['name'], kt))
def frost(box, r):
    box = tuple(int(v) for v in box); cr = img.crop(box).filter(ImageFilter.GaussianBlur(14))
    m = Image.new('L', cr.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, cr.size[0]-1, cr.size[1]-1], r, fill=255); img.paste(cr, box[:2], m)
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
for (x, y, bx, by, bw, bh, *_) in labels: sd.rounded_rectangle([bx, by+8, bx+bw, by+bh+8], 14, fill=(0, 0, 0, 120))
sd.rounded_rectangle([card[0], card[1]+12, card[2], card[3]+12], 18, fill=(0, 0, 0, 150))
img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
for (x, y, bx, by, bw, bh, *_) in labels: frost((bx, by, bx+bw, by+bh), 14)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
for (x, y, bx, by, bw, bh, name, kt) in labels:
    od.rounded_rectangle([bx, by, bx+bw, by+bh], 14, fill=(18, 22, 28, 170), outline=(255, 255, 255, 60), width=2)
    od.line([(x, by+bh) if by < y else (x, by), (x, y-9) if by < y else (x, y+9)], fill=(255, 255, 255, 235), width=3)
    od.ellipse([x-10, y-10, x+10, y+10], fill=(255, 255, 255, 255)); od.ellipse([x-4, y-4, x+4, y+4], fill=(24, 27, 31, 255))
    od.text((bx+24, by+33), name, font=fN, fill=(255, 255, 255, 255), anchor='lm'); od.text((bx+24, by+70), kt, font=fK, fill=(255, 255, 255, 185), anchor='lm')
img.alpha_composite(ov)
# house marker
INK = (24, 27, 31); cy = hy-STEM
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
od.ellipse([hx-R*1.9, hy-R*0.55, hx+R*1.9, hy+R*0.55], outline=(255, 255, 255, 160), width=3)
od.line([(hx, cy+R), (hx, hy)], fill='white', width=4); od.ellipse([hx-9, hy-9, hx+9, hy+9], fill='white'); img.alpha_composite(ov)
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([hx-R, cy-R+10, hx+R, cy+R+10], fill=(0, 0, 0, 140)); img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov); od.ellipse([hx-R, cy-R, hx+R, cy+R], fill='white'); s = R*0.95
od.polygon([(hx-s*0.5, cy-s*0.02), (hx, cy-s*0.47), (hx+s*0.5, cy-s*0.02)], fill=INK); od.rectangle([hx-s*0.34, cy-s*0.06, hx+s*0.34, cy+s*0.38], fill=INK)
od.rectangle([hx-s*0.09, cy+s*0.12, hx+s*0.09, cy+s*0.38], fill='white'); img.alpha_composite(ov)
# pop-up card: white frame, photo, caption, tail to the pin head
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
tx = min(max(hx, card[0]+60), card[2]-60); tail_y = card[3]
if cy - R > card[3]:
    od.polygon([(tx-26, card[3]-2), (tx+26, card[3]-2), (hx + (tx-hx)*0.25, cy-R-10)], fill=(255, 255, 255, 255))
else:  # card beside the pin: tail from the card's left edge
    ty = min(max(cy, card[1]+60), card[3]-60); od.polygon([(card[0]+2, ty-26), (card[0]+2, ty+26), (hx+R+10, cy)], fill='white')
od.rounded_rectangle(card, 18, fill=(255, 255, 255, 255)); img.alpha_composite(ov)
phr = ph.resize((PW, PH), Image.LANCZOS); m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, PW-1, PH-1], 10, fill=255)
img.paste(phr, (int(card[0]+pad), int(card[1]+pad)), m)
d = ImageDraw.Draw(img); street, suburb = [s.strip() for s in C['addr'].split(',')[:2]]
d.text((card[0]+pad+6, card[3]-capH/2-14), street, font=F('ds', 40), fill=INK, anchor='lm')
d.text((card[0]+pad+6, card[3]-capH/2+22), C.get('caption', suburb.upper()), font=F('m', 24), fill=(110, 114, 120), anchor='lm')
# CBD chip
if C.get('cbd'):
    m_ = dist(*C['cbd']); bear = math.atan2((C['cbd'][1]-hlng)*math.cos(math.radians(hlat)), C['cbd'][0]-hlat)
    f1, f2 = F('s', 28), F('l', 28); t1, t2 = 'PERTH CBD', f'{m_/1000:.1f} km'
    w1 = sum(d.textlength(c, font=f1) for c in t1)+4*(len(t1)-1); w2 = d.textlength(t2, font=f2); cwid = 92+w1+28+w2+40; chh = 72
    x0, y0 = C.get('cbdXY', [W-cwid-56, H-chh-70]); box = (int(x0), int(y0), int(x0+cwid), int(y0+chh)); frost(box, 36)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    od.rounded_rectangle(box, 36, fill=(18, 22, 28, 175), outline=(255, 255, 255, 70), width=2)
    ax, ay = x0+46, y0+chh/2; dx, dy = math.sin(bear), -math.cos(bear)   # arrow points toward the CBD
    od.line([(ax-dx*17, ay-dy*17), (ax+dx*17, ay+dy*17)], fill='white', width=4)
    for a in (2.5, -2.5):
        ca, sa = math.cos(a), math.sin(a); od.line([(ax+dx*17, ay+dy*17), (ax+dx*17+(dx*ca-dy*sa)*13, ay+dy*17+(dx*sa+dy*ca)*13)], fill='white', width=4)
    xx = x0+92
    for c in t1: od.text((xx, ay), c, font=f1, fill='white', anchor='lm'); xx += od.textlength(c, font=f1)+4
    od.line([(xx+10, ay-15), (xx+10, ay+15)], fill=(255, 255, 255, 110), width=2); od.text((xx+24, ay), t2, font=f2, fill=(255, 255, 255, 230), anchor='lm')
    img.alpha_composite(ov)
# address bottom-left + north arrow
d = ImageDraw.Draw(img); d.text((80, H-150), street, font=F('ds', 80), fill='white', anchor='lm')
xx = 82
for c in (suburb.upper()+'  WA'): d.text((xx, H-82), c, font=F('m', 30), fill=(255, 255, 255, 215), anchor='lm'); xx += d.textlength(c, font=F('m', 30))+9
nx, ny = W-90, 100; d.polygon([(nx, ny-36), (nx+18, ny+14), (nx, ny+4), (nx-18, ny+14)], fill='white'); d.text((nx, ny+40), 'N', font=F('s', 28), fill='white', anchor='mm')
img.convert('RGB').save(OUT, quality=93); print('house', round(hx), round(hy), 'labels', [l[6] for l in labels])
