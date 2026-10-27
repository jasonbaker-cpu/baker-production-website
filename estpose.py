"""Estimate camera pose for DJI Fly exports that lost their drone-dji XMP, and write an XMP packet so the pipeline can run.
usage: python3 estpose.py <slug> <house_lat> <house_lng> <photo>...   (run from ~/aerial)"""
import sys, re, math, json, numpy as np, cv2
from PIL import Image
sys.path.insert(0, '.')
D = math.pi/180
slug, hl, hg = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); photos = sys.argv[4:]
from sreg import Sat, rays, ground, grad
sat = Sat(slug)
def exif(f):
    g = Image.open(f)._getexif()[34853]
    d = lambda v, r: (-1 if r in ('S', 'W') else 1) * (float(v[0]) + float(v[1])/60 + float(v[2])/3600)
    return d(g[2], g[1]), d(g[4], g[3]), float(g[6])
def horizon_row(img):
    h0, w0 = img.shape[:2]; s = 1000/w0; im = cv2.resize(img, (1000, int(h0*s)), interpolation=cv2.INTER_AREA)
    h, w = im.shape[:2]; g = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.2); ys = []
    for x in range(40, 960, 3):
        col = g[:, x]
        if col[:int(h*.04)].mean() < 120: continue
        dark = col < min(118, .72*float(np.median(col[:int(h*.04)])))
        run = np.convolve(dark.astype(np.int32), np.ones(6, np.int32), 'valid') == 6
        i = np.argmax(run) if run.any() else -1
        if h*.02 < i < h*.75: ys.append(i)
    return (np.median(ys)/s) if len(ys) > 40 else None
class R:
    def __init__(s, f, gw=320):
        im = cv2.imread(f, cv2.IMREAD_GRAYSCALE); s.H, s.W = im.shape; s.X, s.Y = rays(s.W, s.H, None, gw)
        s.P = grad(cv2.resize(im, (gw, s.X.shape[0]), interpolation=cv2.INTER_AREA).astype(np.float32))
    def score(s, c):
        lat, lng, dist, ok = ground(c, s.W, s.H, s.X, s.Y); px, py = sat.pix(lat, lng)
        m = ok & (dist < 450) & (px > 2) & (py > 2) & (px < sat.img.shape[1]-3) & (py < sat.img.shape[0]-3)
        if m.sum() < 2000: return -1
        G = grad(cv2.remap(sat.img, px.astype(np.float32), py.astype(np.float32), cv2.INTER_LINEAR))
        m2 = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool); a = s.P[m2]; b = G[m2]; a = a-a.mean(); b = b-b.mean()
        return float((a*b).sum()/math.sqrt((a*a).sum()*(b*b).sum()+1e-9))
out = {}
for f in photos:
    lat, lng, galt = exif(f); img = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2RGB)
    hr = None if __import__("os").environ.get("NADIR") else horizon_row(img); H, W = img.shape[:2]; fp = 24*math.hypot(W, H)/43.27
    ex = (hg-lng)*111320*math.cos(lat*D); ny = (hl-lat)*111320; brg = math.degrees(math.atan2(ex, ny))
    r = R(f); best = (-2, None)
    if hr is None:   # top-down
        for h in range(55, 100, 5):
            for y in range(0, 360, 4):
                c = dict(lat=lat, lng=lng, h=h, yaw=y, pitch=-90, roll=0, f35=24); v = r.score(c)
                if v > best[0]: best = (v, c)
    else:
        pitch = -math.degrees(math.atan((H/2-hr)/fp)) - 0.3
        for h in (100, 110, 120):
            for dy in range(-60, 61, 3):
                for dp in (-2, 0, 2):
                    c = dict(lat=lat, lng=lng, h=h, yaw=brg+dy, pitch=pitch+dp, roll=0, f35=24); v = r.score(c)
                    if v > best[0]: best = (v, c)
    c = best[1]; out[f] = dict(cam=c, sc=best[0], galt=galt, hr=hr, brg=brg)
    print(f[-30:-26], 'hz', hr and round(hr), 'brg', round(brg), '->', round(c['yaw'], 1), round(c['pitch'], 1), c['h'], 'sc', round(best[0], 3), flush=True)
    raw = open(f, 'rb').read(); yaw = ((c['yaw']+180) % 360)-180
    x = f'''<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="DJI Meta Data" xmlns:drone-dji="http://www.dji.com/drone-dji/1.0/" xmlns:baker="https://bakerproduction.com/ns/1.0/" baker:EstimatedPose="satellite" drone-dji:GpsLatitude="{lat:.9f}" drone-dji:GpsLongitude="{lng:+.9f}" drone-dji:AbsoluteAltitude="{galt:+.3f}" drone-dji:RelativeAltitude="{c['h']:+.3f}" drone-dji:GimbalRollDegree="+0.00" drone-dji:GimbalYawDegree="{yaw:+.2f}" drone-dji:GimbalPitchDegree="{c['pitch']:+.2f}" drone-dji:FlightYawDegree="{yaw:+.2f}" drone-dji:ProductName="Mini4 Pro"></rdf:Description></rdf:RDF></x:xmpmeta>'''.encode()
    body = b'http://ns.adobe.com/xap/1.0/\x00' + x
    seg = b'\xff\xe1' + (len(body)+2).to_bytes(2, 'big') + body
    open(f, 'wb').write(raw[:2] + seg + raw[2:])
json.dump(out, open(f'e2e/estpose_{slug}_{len(out)}.json', 'w'), indent=1)
