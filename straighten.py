"""Level the horizon on oblique drone JPGs (Jason, 26 Oct: "make sure all the drone images are straight").
usage: python3 straighten.py <out_dir> <jpg> [<jpg> ...]   (or --measure <jpg>... to just print angles)
For each oblique shot (gimbal pitch > -60) the sky/land boundary is found per column and a robust line is fitted.
If it tilts 0.15-5 deg, the photo is rotated about its centre and zoomed just enough to fill the frame, then saved
at the same size with its EXIF/XMP kept. XMP gets GimbalRollDegree=0 (the photo is now level) and baker:Zoom=<z>
so the editor scales its focal length to match. Straight-down shots and photos with no clear horizon are copied as-is."""
import sys, os, re, io, math, shutil
import numpy as np, cv2
from PIL import Image

def xmp_val(raw, k):
    m = re.search(rb'drone-dji:' + k.encode() + rb'\s*(?:=\s*"|>)\s*([+-]?[\d.]+)', raw[:2_000_000]); return float(m.group(1)) if m else None

def horizon_angle(img):
    """degrees the horizon rises to the right (positive = right side higher). None if no reliable horizon."""
    h0, w0 = img.shape[:2]; s = 1000 / w0; im = cv2.resize(img, (1000, int(h0 * s)), interpolation=cv2.INTER_AREA)
    h, w = im.shape[:2]; g = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32)
    b = im[..., 2].astype(np.float32); r = im[..., 0].astype(np.float32)
    gs = cv2.GaussianBlur(g, (0, 0), 1.2)
    ys = []; xs = []
    for x in range(int(w * 0.04), int(w * 0.96), 3):
        col = gs[:, x]
        if col[: int(h * 0.04)].mean() < 120: continue                 # column must start in (bright) sky
        dark = col < min(118, 0.72 * float(np.median(col[: int(h * 0.04)])))
        run = np.convolve(dark.astype(np.int32), np.ones(6, np.int32), 'valid') == 6   # 6 dark rows in a row = land
        idx = np.argmax(run) if run.any() else -1
        if idx <= h * 0.02 or idx > h * 0.75: continue
        ys.append(idx); xs.append(x)
    if len(xs) < 40: return None
    xs = np.array(xs, float); ys = np.array(ys, float)
    if xs.max() - xs.min() < w * 0.6: return None                        # needs a skyline across most of the frame
    m, c = np.polyfit(xs, ys, 1)                                         # overall skyline = what the eye reads as level
    for _ in range(3):
        res = ys - (m * xs + c); mad = np.median(np.abs(res)) + 0.5
        keep = np.abs(res) < 3 * mad
        if keep.sum() < 30: return None
        m, c = np.polyfit(xs[keep], ys[keep], 1)
    # cross-check: the sharpest dark/light transition near that line, column by column. Hazy or curved skylines
    # disagree with the brightness fit, and then we leave the photo alone rather than tilt it the wrong way.
    gy = cv2.Sobel(gs, cv2.CV_32F, 0, 1, ksize=3)
    xs2 = []; ys2 = []
    for x in range(int(w * 0.04), int(w * 0.96), 3):
        y0 = int(m * x + c); a = max(1, y0 - 25); b = min(h - 2, y0 + 25)
        if b - a < 10: continue
        col = gy[a:b, x]; k = int(np.argmin(col))        # sky (bright) above, land (dark) below -> negative gradient
        if col[k] < -25: xs2.append(x); ys2.append(a + k)
    if len(xs2) < 0.5 * len(xs): return -math.degrees(math.atan(m)) if globals().get('BRIGHT_ONLY') else None
    xs2 = np.array(xs2, float); ys2 = np.array(ys2, float); m2, c2 = np.polyfit(xs2, ys2, 1)
    for _ in range(3):
        r2 = ys2 - (m2 * xs2 + c2); keep = np.abs(r2) < 3 * (np.median(np.abs(r2)) + 0.5); m2, c2 = np.polyfit(xs2[keep], ys2[keep], 1)
    mad = float(np.median(np.abs(ys2[keep] - (m2 * xs2[keep] + c2))))
    a1, a2 = -math.degrees(math.atan(m)), -math.degrees(math.atan(m2))
    if globals().get('BRIGHT_ONLY'): return a1
    if abs(a1 - a2) > 0.6 or mad > 3.5: return None
    return (a1 + a2) / 2

def app1_segments(raw):
    segs, i = [], 2
    while i < len(raw) - 4 and raw[i] == 0xFF:
        mk = raw[i + 1]; L = int.from_bytes(raw[i + 2:i + 4], 'big')
        if mk == 0xDA: break
        if mk == 0xE1: segs.append(raw[i:i + 2 + L])
        i += 2 + L
    return segs

def fix_xmp(seg, zoom):
    body = seg[4:]
    if b'http://ns.adobe.com/xap/1.0/' not in body[:40]: return seg
    body = re.sub(rb'(drone-dji:GimbalRollDegree\s*=\s*")[+-]?[\d.]+(")', rb'\g<1>+0.00\2', body)
    body = re.sub(rb'\s*baker:Zoom="[\d.]+"', b'', body)
    body = body.replace(b'drone-dji:GimbalRollDegree=', b'baker:Zoom="%.5f" drone-dji:GimbalRollDegree=' % zoom, 1)
    if b'xmlns:baker' not in body: body = body.replace(b'xmlns:drone-dji=', b'xmlns:baker="https://bakerproduction.com/ns/1.0/" xmlns:drone-dji=', 1)
    return b'\xff\xe1' + (len(body) + 2).to_bytes(2, 'big') + body

def process(src, dst, measure=False, force=None):
    raw = open(src, 'rb').read(); pitch = xmp_val(raw, 'GimbalPitchDegree')
    if pitch is not None and pitch < -60: return ('top-down', None)
    pil = Image.open(io.BytesIO(raw)).convert('RGB'); a = np.asarray(pil)
    ang = force if force is not None else horizon_angle(a)
    if ang is None or abs(ang) < 0.15 or abs(ang) > 3.5:
        if not measure and src != dst: shutil.copy(src, dst)
        return ('no-change', ang)
    if measure: return ('tilt', ang)
    H, W = a.shape[:2]; t = math.radians(abs(ang))
    zoom = math.cos(t) + max(W / H, H / W) * math.sin(t)                  # smallest zoom that keeps the frame full
    M = cv2.getRotationMatrix2D((W / 2, H / 2), -ang, zoom)             # rotate content to level it
    out = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    b = io.BytesIO(); Image.fromarray(out).save(b, 'JPEG', quality=95); j = b.getvalue()
    segs = [fix_xmp(s, zoom) for s in app1_segments(raw)]
    open(dst, 'wb').write(j[:2] + b''.join(segs) + j[2:])
    return ('levelled', round(ang, 3), round(zoom, 5))

if __name__ == '__main__':
    if sys.argv[1] == '--measure':
        for f in sys.argv[2:]: print(os.path.basename(f), process(f, f, True))
    else:
        out = sys.argv[1]; os.makedirs(out, exist_ok=True)
        for f in sys.argv[2:]: print(os.path.basename(f), process(f, os.path.join(out, os.path.basename(f))))

def level_file(src, out_dir):
    """Level one photo into out_dir. Returns (path_to_use, ang_deg, zoom); ang=0/zoom=1 when untouched."""
    os.makedirs(out_dir, exist_ok=True); dst = os.path.join(out_dir, os.path.basename(src))
    r = process(src, dst)
    if r[0] == 'levelled': return dst, r[1], r[2]
    return src, 0.0, 1.0

def level_flight(files, out_dir, force=None):
    """Level a whole flight. A drone's gimbal tilt is the same on every photo of a flight, so the per-photo skyline
    angles are pooled: if they agree (median spread < 0.6 deg) the median is applied to every oblique photo. If they
    don't agree, a photo is only levelled when two independent horizon measurements match. Returns {src: (dst, ang, zoom)}."""
    global BRIGHT_ONLY
    obl = []
    for f in files:
        raw = open(f, 'rb').read(400000); p = xmp_val(raw, 'GimbalPitchDegree')
        if p is None or p >= -60: obl.append(f)
    BRIGHT_ONLY = True
    angs = {f: horizon_angle(np.asarray(Image.open(f).convert('RGB'))) for f in obl}
    BRIGHT_ONLY = False
    v = np.array([a for a in angs.values() if a is not None])
    med = float(np.median(v)) if len(v) >= 3 else None
    spread = float(np.median(np.abs(v - med))) if med is not None else 99
    if force is not None: med, spread = float(force), 0.0   # day json "level": flight-wide angle measured by hand (skyline finder failed, e.g. hazy DJI Fly exports)
    os.makedirs(out_dir, exist_ok=True); res = {}
    for f in files:
        if f not in obl: res[f] = (f, 0.0, 1.0); continue
        dst = os.path.join(out_dir, os.path.basename(f))
        r = process(f, dst, force=med) if (med is not None and spread < 0.6) else process(f, dst)
        res[f] = (dst, r[1], r[2]) if r[0] == 'levelled' else (f, 0.0, 1.0)
    return res
