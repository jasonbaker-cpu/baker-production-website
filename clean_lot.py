"""Remove cars, people and washing lines ON THE PROPERTY (Jason, 7 Nov 2026: "delete cars, washing lines and people on the property").
usage (CLI):  python3 clean_lot.py in.jpg out.jpg cam.json lot.json [fix.json]
  cam.json  = editor camera {lat,lng,h,yaw,pitch,roll,f35} for in.jpg (original pixels)
  lot.json  = {"poly": [[lat,lng],...]}  or  {"lat":..,"lng":..,"r": 10}  (no cadastre: circle round the house)
  fix.json = {"remove": ["c3", {"sheet": [x0,y0,x1,y1]}, [x0,y0,x1,y1]], "keep": ["c1"]}
             ids from the review sheet; {"sheet": box} = pixels read straight off the review sheet; plain box = original px
from python: clean(src, dst, cam, lot, remove, keep, review) -> candidates [{id, cls, box, conf, inLot, auto, remove}]

How it works
  1. The lot outline is projected into the photo with the same camera maths as the editor (projectOrig), grown by 1 m.
  2. YOLOX-S (COCO, models/yolox.onnx = opencv_zoo object_detection_yolox_2022nov.onnx) runs on 640 px tiles over the
     lot at full resolution, plus one whole-lot pass for big close-up cars. Kept: person, car, motorcycle, truck —
     each with a size cap in metres (a 'truck' as wide as a house is a roof) and a confidence floor.
  3. A detection counts only if at least 60% of its box is inside the grown lot — cars on the street/neighbours stay.
  4. Each object is erased with LaMa (models/lama.onnx), one object at a time so every patch keeps full detail.
  5. review= writes a contact image of the lot (boxes drawn) so the run can LOOK for what COCO can't see —
     washing lines / rotary hoists especially — and add them as extra boxes (day file "remove": {photo: [[x0,y0,x1,y1]]}).
"""
import sys, os, json, math
import numpy as np
os.environ.setdefault('ORT_LOG_LEVEL', '3')
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get('BAKER_MODELS') or os.path.join(HERE, '..', 'models')
KEEP = {0: 'person', 2: 'car', 3: 'motorcycle', 7: 'truck'}
# biggest believable box width in metres, and min confidence, per class (a 'truck' box the size of a house is a roof)
MAXW = {0: 2.0, 2: 7.0, 3: 3.0, 7: 8.0}
MINC = {0: 0.40, 2: 0.40, 3: 0.45, 7: 0.60}
D = math.pi / 180
_S = {}

URLS = {'yolox.onnx': 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/object_detection_yolox/object_detection_yolox_2022nov.onnx',
        'lama.onnx': 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/inpainting_lama/inpainting_lama_2025jan.onnx'}

def sess(name):
    p = os.path.join(MODELS, name)
    if not os.path.exists(p):   # first run on a new machine: fetch the model
        import urllib.request; os.makedirs(MODELS, exist_ok=True); urllib.request.urlretrieve(URLS[name], p + '.part'); os.replace(p + '.part', p)
    if name not in _S:
        so = ort.SessionOptions(); so.log_severity_level = 3
        _S[name] = ort.InferenceSession(os.path.join(MODELS, name), so)
    return _S[name]

def project(cam, W, H, lat, lng):
    c0 = math.cos(cam['lat'] * D)
    vx, vy, vz = (lng - cam['lng']) * 111320 * c0, (lat - cam['lat']) * 111320, -cam['h']
    yw, pt = cam['yaw'] * D, cam['pitch'] * D
    f = [math.sin(yw) * math.cos(pt), math.cos(yw) * math.cos(pt), math.sin(pt)]
    r = [math.cos(yw), -math.sin(yw), 0]
    u = [r[1]*f[2]-r[2]*f[1], r[2]*f[0]-r[0]*f[2], r[0]*f[1]-r[1]*f[0]]
    xc = vx*r[0]+vy*r[1]+vz*r[2]; yc = vx*u[0]+vy*u[1]+vz*u[2]; zc = vx*f[0]+vy*f[1]+vz*f[2]
    if zc <= 0.5: return None
    fp = cam.get('f35', 24) * math.hypot(W, H) / 43.27
    dx, dy = fp * xc / zc, -fp * yc / zc
    rl = (cam.get('roll') or 0) * D
    if rl: dx, dy = dx*math.cos(rl) - dy*math.sin(rl), dx*math.sin(rl) + dy*math.cos(rl)
    return (W/2 + dx, H/2 + dy)

def lot_ring(lot, grow=1.0):
    """lat/lng ring of the lot, grown outward by `grow` metres (projection/registration slack)."""
    if lot.get('poly'):
        P = [tuple(p) for p in lot['poly']]
        clat = sum(p[0] for p in P) / len(P); clng = sum(p[1] for p in P) / len(P); k = math.cos(clat * D)
        out = []
        for la, ln in P:
            dn, de = (la - clat) * 111320, (ln - clng) * 111320 * k; d = math.hypot(dn, de) or 1
            s = (d + grow) / d; out.append((clat + dn * s / 111320, clng + de * s / 111320 / k))
        # densify so long edges bend correctly under perspective
        dense = []
        for i in range(len(out)):
            a, b = out[i], out[(i+1) % len(out)]
            for t in np.linspace(0, 1, 12, endpoint=False): dense.append((a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t))
        return dense
    r = lot.get('r', 10) + grow; k = math.cos(lot['lat'] * D)
    return [(lot['lat'] + r*math.sin(a)/111320, lot['lng'] + r*math.cos(a)/111320/k) for a in np.linspace(0, 2*math.pi, 48, endpoint=False)]

def lot_mask(cam, W, H, lot):
    pts = [project(cam, W, H, la, ln) for la, ln in lot_ring(lot)]
    pts = [p for p in pts if p]
    if len(pts) < 3: return None
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    return m if m.getbbox() else None

def _yolox(tile):
    """tile: PIL RGB, any size <= 640 after letterbox. returns [(x0,y0,x1,y1,conf,cls)] in tile px."""
    w, h = tile.size; s = min(640 / w, 640 / h)
    im = tile.resize((max(1, int(w*s)), max(1, int(h*s))), Image.BILINEAR)
    pad = np.full((640, 640, 3), 114, np.uint8); a = np.asarray(im)[:, :, ::-1]; pad[:a.shape[0], :a.shape[1]] = a
    out = sess('yolox.onnx').run(None, {'images': pad.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    grids, strides = [], []
    for st in (8, 16, 32):
        n = 640 // st; yv, xv = np.meshgrid(np.arange(n), np.arange(n), indexing='ij')
        grids.append(np.stack((xv, yv), 2).reshape(-1, 2)); strides.append(np.full((n*n, 1), st))
    g = np.concatenate(grids); st = np.concatenate(strides)
    xy = (out[:, :2] + g) * st; wh = np.exp(out[:, 2:4]) * st
    sc = out[:, 4:5] * out[:, 5:]; cls = sc.argmax(1); conf = sc.max(1)
    res = []
    for i in np.where(conf > 0.3)[0]:
        c = int(cls[i])
        if c not in KEEP: continue
        cx, cy = xy[i]; bw, bh = wh[i]
        res.append(((cx-bw/2)/s, (cy-bh/2)/s, (cx+bw/2)/s, (cy+bh/2)/s, float(conf[i]), c))
    return res

def _nms(b, thr=0.45):
    b = sorted(b, key=lambda x: -x[4]); keep = []
    for x in b:
        ok = True
        for y in keep:
            ix = max(0, min(x[2], y[2]) - max(x[0], y[0])); iy = max(0, min(x[3], y[3]) - max(x[1], y[1])); inter = ix*iy
            small = min((x[2]-x[0])*(x[3]-x[1]), (y[2]-y[0])*(y[3]-y[1]))
            if inter / max(1e-6, small) > thr: ok = False; break   # overlap vs the smaller box: kills tile-edge halves
        if ok: keep.append(x)
    return keep

def detect(im, region):
    x0, y0, x1, y1 = region; T, O = 640, 120; found = []
    xs = list(range(x0, max(x0+1, x1 - T + O), T - O)) or [x0]; ys = list(range(y0, max(y0+1, y1 - T + O), T - O)) or [y0]
    for ty in ys:
        for tx in xs:
            t = im.crop((tx, ty, min(tx+T, im.width), min(ty+T, im.height)))
            found += [(a+tx, b+ty, c+tx, d+ty, cf, k) for a, b, c, d, cf, k in _yolox(t)]
    if (x1-x0) > T or (y1-y0) > T:   # whole-lot pass for big, close cars
        found += [(a+x0, b+y0, c+x0, d+y0, cf, k) for a, b, c, d, cf, k in _yolox(im.crop(region))]
    return _nms([f for f in found if f[4] > 0.35])

def lama_box(im, box, grow=0.08):
    """erase one box (original px) with LaMa; box grown a little so shadows/edges go too."""
    x0, y0, x1, y1 = box; gw, gh = (x1-x0)*grow + 6, (y1-y0)*grow + 6
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rectangle((x0-gw, y0-gh, x1+gw, y1+gh), fill=255)
    bb = m.getbbox(); cx, cy = (bb[0]+bb[2])/2, (bb[1]+bb[3])/2
    side = int(min(max(bb[2]-bb[0], bb[3]-bb[1]) * 2.4, im.width, im.height)); side = max(side, min(256, im.width, im.height))
    sx = int(min(max(cx-side/2, 0), im.width-side)); sy = int(min(max(cy-side/2, 0), im.height-side))
    ci, cm = im.crop((sx, sy, sx+side, sy+side)), m.crop((sx, sy, sx+side, sy+side))
    a = np.asarray(ci.resize((512, 512), Image.LANCZOS), np.float32).transpose(2, 0, 1)[None] / 255
    b = (np.asarray(cm.resize((512, 512), Image.NEAREST), np.float32)[None, None] > 127).astype(np.float32)
    r = sess('lama.onnx').run(None, {'image': a, 'mask': b})[0][0].transpose(1, 2, 0)
    if r.max() <= 1.5: r = r * 255
    res = Image.fromarray(np.clip(r, 0, 255).astype('uint8')).resize((side, side), Image.LANCZOS)
    ci.paste(res, (0, 0), cm.filter(ImageFilter.GaussianBlur(4))); im.paste(ci, (sx, sy))

def ppm(cam, W, H, lot):
    """pixels per metre (horizontal) at the middle of the lot."""
    R = lot_ring(lot, 0); la = sum(p[0] for p in R)/len(R); ln = sum(p[1] for p in R)/len(R); k = math.cos(la*D)
    a = project(cam, W, H, la, ln); b = project(cam, W, H, la, ln + 1/111320/k); c = project(cam, W, H, la + 1/111320, ln)
    if not (a and b and c): return None
    return max(math.hypot(b[0]-a[0], b[1]-a[1]), math.hypot(c[0]-a[0], c[1]-a[1]))

def xmp_cam(path):
    """camera from the DJI XMP, same rules as the editor's readDroneMeta/makeCam (Mini 4 Pro yaw fix, Mavic 3 average)."""
    import re
    t = open(path, 'rb').read(2 * 1024 * 1024).decode('latin1')
    def g(k):
        m = re.search(r'drone-dji:' + k + r'\s*(?:=\s*"|>)\s*([+-]?[\d.]+)', t); return float(m.group(1)) if m else None
    try:
        from PIL import Image as _I
        ex = _I.open(path).getexif().get_ifd(0x8769); f35 = float(ex.get(0xA405) or 24)
    except Exception: f35 = 24.0
    zm = re.search(r'baker:Zoom\s*=\s*"([\d.]+)"', t); f35 *= float(zm.group(1)) if zm else 1
    lat, lng = g('GpsLatitude'), g('GpsLongitude') if g('GpsLongitude') is not None else g('GpsLongtitude')
    gy, fy, pitch, h = g('GimbalYawDegree'), g('FlightYawDegree'), g('GimbalPitchDegree'), g('RelativeAltitude')
    if None in (lat, lng, pitch, h) or h <= 2 or (gy is None and fy is None): return None
    if gy is None: yaw = fy
    elif fy is None: yaw = gy
    else:
        d = abs(((gy - fy) % 360 + 540) % 360 - 180)
        yaw = gy + ((((fy - gy) % 360) + 540) % 360 - 180) / 2 if d < 6 else fy
    return {'lat': lat, 'lng': lng, 'f35': f35, 'h': h, 'yaw': yaw, 'pitch': pitch, 'roll': g('GimbalRollDegree') or 0}

def clean(src, dst, cam, lot, remove=(), keep=(), review=None, dry=False):
    """lot = {"poly": [[lat,lng],..]} (cadastre) or {"lat","lng"} (no cadastre).
    Candidates c1, c2.. = every car/person/ute/motorbike near the house (within the lot grown 8 m, or 25 m of the house).
    AUTO-removed only with a cadastre outline and >= 60% of the box inside it (grown 1 m).
    remove = ids ("c3") or [x0,y0,x1,y1] boxes to remove as well (washing lines, misses); keep = ids NOT to remove."""
    im = Image.open(src); exif = im.info.get('exif'); xmp = im.info.get('xmp'); im = im.convert('RGB')
    W, H = im.size; cands = []
    has_poly = bool(lot and lot.get('poly'))
    lm = lot_mask(cam, W, H, lot) if cam and has_poly else None
    near = None
    if cam and lot:
        near_lot = dict(lot, r=25) if not has_poly else lot
        R = lot_ring(near_lot, 8.0 if has_poly else 0.0)
        pts = [q for q in (project(cam, W, H, la, ln) for la, ln in R) if q]
        if len(pts) >= 3: near = Image.new('L', (W, H), 0); ImageDraw.Draw(near).polygon(pts, fill=255); near = near if near.getbbox() else None
    if near is not None:
        bx = near.getbbox(); pad = 40
        reg = (max(0, bx[0]-pad), max(0, bx[1]-pad), min(W, bx[2]+pad), min(H, bx[3]+pad))
        na = np.asarray(near) > 0; la = np.asarray(lm) > 0 if lm is not None else None; pm = ppm(cam, W, H, lot) or 1e9
        for x0, y0, x1, y1, cf, k in sorted(detect(im, reg), key=lambda t: (t[1], t[0])):
            if cf < MINC[k] or (x1 - x0) / pm > MAXW[k]: continue
            X0, Y0, X1, Y1 = [int(round(v)) for v in (max(0, x0), max(0, y0), min(W, x1), min(H, y1))]
            if X1 <= X0 or Y1 <= Y0 or na[Y0:Y1, X0:X1].mean() < 0.3: continue
            inside = float(la[Y0:Y1, X0:X1].mean()) if la is not None else None
            cands.append({'id': f'c{len(cands)+1}', 'cls': KEEP[k], 'box': [X0, Y0, X1, Y1], 'conf': round(cf, 2),
                          'inLot': None if inside is None else round(inside, 2), 'auto': inside is not None and inside >= 0.6})
    crop = near.getbbox() if near is not None else (0, 0, W, H); g = 250
    crop = (max(0, crop[0]-g), max(0, crop[1]-g), min(W, crop[2]+g), min(H, crop[3]+g))
    sc = min(1.0, 1600 / max(crop[2]-crop[0], crop[3]-crop[1]))   # review sheet px = (orig - crop corner) * sc
    keep = set(keep or []); ids = {c['id']: c for c in cands}
    for c in cands: c['remove'] = c['auto'] and c['id'] not in keep
    for r in remove or []:
        if isinstance(r, str) and r in ids: ids[r]['remove'] = True
        elif isinstance(r, dict) and len(r.get('sheet', [])) == 4:   # box read off the review sheet
            x0, y0, x1, y1 = r['sheet']
            cands.append({'id': f'e{len(cands)+1}', 'cls': 'by-eye', 'box': [int(crop[0] + x0/sc), int(crop[1] + y0/sc), int(crop[0] + x1/sc), int(crop[1] + y1/sc)], 'conf': 1, 'inLot': None, 'auto': False, 'remove': True})
        elif isinstance(r, (list, tuple)) and len(r) == 4:
            cands.append({'id': f'e{len(cands)+1}', 'cls': 'by-eye', 'box': [int(v) for v in r], 'conf': 1, 'inLot': None, 'auto': False, 'remove': True})
    if review:
        rv = im.copy(); d = ImageDraw.Draw(rv)
        from PIL import ImageFont
        ft = None
        for fn in ('DejaVuSans-Bold.ttf', 'Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'):
            try: ft = ImageFont.truetype(fn, 44); break
            except Exception: pass
        if ft is None:
            try: ft = ImageFont.load_default(size=44)
            except Exception: ft = ImageFont.load_default()
        for m, col in ((near, (120, 200, 255)), (lm, (255, 220, 0))):
            if m is not None: rv.paste(col, (0, 0), m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(7)))
        for c in cands:
            col = (255, 0, 60) if c['remove'] else (0, 230, 120)
            d.rectangle(c['box'], outline=col, width=6); d.text((c['box'][0], c['box'][1]-50), c['id'], fill=col, font=ft)
        rv = rv.crop(crop); rv = rv.resize((max(1, round(rv.width*sc)), max(1, round(rv.height*sc))), Image.LANCZOS); rv.save(review, quality=82)
    if not dry:
        for c in cands:
            if c['remove']: lama_box(im, c['box'])
        kw = {'quality': 95}
        if exif: kw['exif'] = exif
        if xmp: kw['xmp'] = xmp
        im.save(dst, **kw)
    return cands

if __name__ == '__main__':
    a = sys.argv[1:]
    cam = json.load(open(a[2])); lot = json.load(open(a[3])); extra = json.load(open(a[4])) if len(a) > 4 else {}
    out = clean(a[0], a[1], cam, lot, extra.get('remove', []), extra.get('keep', []), review=os.path.splitext(a[1])[0] + '_review.jpg')
    print(json.dumps(out))
