# Elegant overlay set for oblique.py (exec'd with its globals: img, project, enu, C, W, H, OUT, D)
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
FD = '/usr/share/fonts/opentype/inter/'
def F(w, s): return ImageFont.truetype(FD + {'l': 'Inter-Light.otf', 'r': 'Inter-Regular.otf', 'm': 'Inter-Medium.otf', 's': 'Inter-SemiBold.otf', 'b': 'Inter-Bold.otf', 'dl': 'InterDisplay-Light.otf', 'ds': 'InterDisplay-SemiBold.otf', 'dm': 'InterDisplay-Medium.otf'}[w], s)
INK = (24, 27, 31)

# ---- calmer grade + vignette + bottom fade
img = ImageEnhance.Color(img).enhance(C.get('sat', 0.9))
img = ImageEnhance.Contrast(img).enhance(0.97)
vg = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(vg)
vd.ellipse([-W*0.25, -H*0.35, W*1.25, H*1.3], fill=255); vg = vg.filter(ImageFilter.GaussianBlur(260))
dark = Image.new('RGB', (W, H), (10, 14, 20)); img = Image.composite(img, Image.blend(img, dark, 0.38), vg)
grad = Image.new('L', (1, 256)); [grad.putpixel((0, y), int(max(0, (y-120)/136)**1.6*215)) for y in range(256)]
grad = grad.resize((W, int(H*0.30))); fade = Image.new('RGB', (W, grad.height), (12, 16, 22))
img.paste(fade, (0, H-grad.height), grad)
img = img.convert('RGBA')

def spaced(d, xy, text, fnt, fill, track=0, anchor='l'):
    """draw text with letter-spacing; anchor l (left) or c (centre) on baseline-middle"""
    widths = [d.textlength(ch, font=fnt) for ch in text]; tw = sum(widths)+track*(len(text)-1)
    x = xy[0] - (tw/2 if anchor == 'c' else 0)
    for ch, w in zip(text, widths): d.text((x, xy[1]), ch, font=fnt, fill=fill, anchor='lm'); x += w+track
    return tw

def shadow_layer(draw_fn, blur=10, alpha=110, off=(0, 6)):
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); draw_fn(ImageDraw.Draw(sh), (0, 0, 0, alpha))
    return sh.filter(ImageFilter.GaussianBlur(blur)), off

placed = []
hx, hy, _ = project(0, 0)
PIN = C.get('pinR', 46)
placed.append((hx-PIN-20, hy-C.get("stem",175)-PIN-14, hx+PIN+20, hy+12))
def hits(bb): return any(not (bb[2] < p[0] or bb[0] > p[2] or bb[3] < p[1] or bb[1] > p[3]) for p in placed)

fN = F('s', C.get('nameSize', 38)); fK = F('m', C.get('kmSize', 27))
labels = []
for p in C['places']:
    e, n = enu(p['lat'], p['lng']); x, y, zz = project(e, n)
    if not (zz > 0 and 60 < x < W-60 and 60 < y < H*0.80): continue
    name = p.get('short', p['name']); km = math.hypot(e, n)/1000
    kt = f"{km:.1f} km" if km >= 1 else f"{round(km*1000/10)*10:.0f} m"
    d0 = ImageDraw.Draw(img)
    tw = max(d0.textlength(name, font=fN), d0.textlength(kt, font=fK)); bw, bh = tw+52, 104
    best = None
    for L in [70, 110, 150, 195, 240, 290, 340]:
        for up in (True, False):
            for sx in [0, -0.3, 0.3, -0.42, 0.42]:
                bx = x + sx*bw - bw/2; by = (y - L - bh) if up else (y + L)
                bb = (bx-8, by-8, bx+bw+8, y+6) if up else (bx-8, y-6, bx+bw+8, by+bh+8)
                if bx < 24 or bx+bw > W-24 or by < 24 or by+bh > H*0.78: continue
                if not hits(bb): best = (bx, by, L, up); break
            if best: break
        if best: break
    if not best: print('no room', name); continue
    bx, by, L, up = best; placed.append((bx-8, by-8, bx+bw+8, by+bh+8))
    placed.append((x-14, by+bh, x+14, y+14) if up else (x-14, y-14, x+14, by))
    labels.append((x, y, bx, by, bw, bh, name, kt))

# draw labels: soft shadow, frosted dark card, thin white leader, ring dot
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
for (x, y, bx, by, bw, bh, *_ ) in labels: sd.rounded_rectangle([bx, by+8, bx+bw, by+bh+8], 14, fill=(0, 0, 0, 120))
sh = sh.filter(ImageFilter.GaussianBlur(12)); img.alpha_composite(sh)
for (x, y, bx, by, bw, bh, name, kt) in labels:
    # frosted glass: blur what's behind the card
    box = tuple(int(v) for v in (bx, by, bx+bw, by+bh))
    crop = img.crop(box).filter(ImageFilter.GaussianBlur(14))
    m = Image.new('L', crop.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, crop.size[0]-1, crop.size[1]-1], 14, fill=255)
    img.paste(crop, box[:2], m)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
for (x, y, bx, by, bw, bh, name, kt) in labels:
    od.rounded_rectangle([bx, by, bx+bw, by+bh], 14, fill=(18, 22, 28, 168), outline=(255, 255, 255, 60), width=2)
    od.line([(x, by+bh) if by < y else (x, by), (x, y-9) if by < y else (x, y+9)], fill=(255, 255, 255, 235), width=3)
    od.ellipse([x-10, y-10, x+10, y+10], fill=(255, 255, 255, 255)); od.ellipse([x-4, y-4, x+4, y+4], fill=INK+(255,))
    od.text((bx+26, by+36), name, font=fN, fill=(255, 255, 255, 255), anchor='lm')
    od.text((bx+26, by+75), kt, font=fK, fill=(255, 255, 255, 185), anchor='lm')
img.alpha_composite(ov)

# house marker: white disc with house glyph, slim stem, ground ring
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
cy = hy - C.get("stem", 175); R = PIN
od.ellipse([hx-38, hy-12, hx+38, hy+12], fill=(0, 0, 0, 90))
ovs = ov.filter(ImageFilter.GaussianBlur(8)); img.alpha_composite(ovs)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
od.ellipse([hx-R*1.9, hy-R*0.55, hx+R*1.9, hy+R*0.55], outline=(255, 255, 255, 150), width=3)
od.line([(hx, cy+R), (hx, hy)], fill=(255, 255, 255, 255), width=4)
od.ellipse([hx-9, hy-9, hx+9, hy+9], fill=(255, 255, 255, 255))
img.alpha_composite(ov)
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([hx-R, cy-R+10, hx+R, cy+R+10], fill=(0, 0, 0, 140))
img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
od.ellipse([hx-R, cy-R, hx+R, cy+R], fill=(255, 255, 255, 255))
s = R*0.95
od.polygon([(hx-s*0.5, cy-s*0.02), (hx, cy-s*0.47), (hx+s*0.5, cy-s*0.02)], fill=INK)
od.rectangle([hx-s*0.34, cy-s*0.06, hx+s*0.34, cy+s*0.38], fill=INK)
od.rectangle([hx-s*0.09, cy+s*0.12, hx+s*0.09, cy+s*0.38], fill=(255, 255, 255))
img.alpha_composite(ov)

# Perth CBD: slim chip on the edge it lies toward
if C.get('cbd'):
    ce, cn = enu(*C['cbd']); km = math.hypot(ce, cn)/1000
    d = ImageDraw.Draw(img); f1 = F('s', 30); f2 = F('l', 30)
    t1, t2 = 'PERTH CBD', f'{km:.1f} km'
    w1 = spaced(ImageDraw.Draw(Image.new('RGBA', (10, 10))), (0, 0), t1, f1, (0, 0, 0), 4)
    w2 = d.textlength(t2, font=f2); cw = 90+w1+28+w2+40; chh = 76
    x0, y0 = C.get('cbdXY', [56, 64])
    box = (int(x0), int(y0), int(x0+cw), int(y0+chh))
    crop = img.crop(box).filter(ImageFilter.GaussianBlur(14)); m = Image.new('L', crop.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, crop.size[0]-1, crop.size[1]-1], 38, fill=255); img.paste(crop, box[:2], m)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    od.rounded_rectangle(box, 38, fill=(18, 22, 28, 170), outline=(255, 255, 255, 70), width=2)
    ax, ay = x0+46, y0+chh/2   # arrow (pointing left = behind/left of view)
    od.line([(ax-16, ay), (ax+18, ay)], fill='white', width=4); od.line([(ax-16, ay), (ax-4, ay-12)], fill='white', width=4); od.line([(ax-16, ay), (ax-4, ay+12)], fill='white', width=4)
    spaced(od, (x0+90, ay), t1, f1, (255, 255, 255, 255), 4)
    od.line([(x0+90+w1+14, ay-16), (x0+90+w1+14, ay+16)], fill=(255, 255, 255, 110), width=2)
    od.text((x0+90+w1+28, ay), t2, font=f2, fill=(255, 255, 255, 230), anchor='lm')
    img.alpha_composite(ov)
    print('CBD', round(km, 2))

# address block, bottom-left
od = ImageDraw.Draw(img)
street, suburb = C['addr'].split(',')[0].strip(), C['addr'].split(',')[1].strip()
lx, base = 84, H-96

od.text((lx, base-88), street, font=F('ds', 84), fill='white', anchor='lm')
spaced(od, (lx+2, base-12), suburb.upper() + C.get('state', '  WA'), F('m', 30), (255, 255, 255, 215), 9)
img.convert('RGB').save(OUT, quality=93)
print('house', round(hx), round(hy), 'labels', len(labels))
