"""Edge-ruler crops for PUBLISHED top-downs, straight from the website's src/project.json.
usage: python3 ruler_pub.py <day> <slug> <photoName> [band_m]
writes qc/fence/<slug>__<stem>_<page>.jpg and prints edge lengths"""
import json, sys, os, math, numpy as np, cv2
SITE = '/home/claude/baker-production-website/aerials/'
day, slug, name = sys.argv[1:4]; band_m = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
P = json.load(open(f'{SITE}{day}/{slug}/src/project.json'))
ph = [p for p in P['photos'] if p['name'] == name][0]
sh = [s for s in ph['shapes'] if s.get('type') == 'poly'][0]
pts = np.array(sh['pts'], float); n = len(pts)
lens = [float(str(x).rstrip('m')) if str(x).rstrip('m') else None for x in sh['lens']]
im = cv2.imread(f'{SITE}{day}/{slug}/src/{name}', cv2.IMREAD_COLOR)
os.makedirs('qc/fence', exist_ok=True)
pxl = [np.hypot(*(pts[(i+1) % n]-pts[i])) for i in range(n)]
ppm = sum(p for p, l in zip(pxl, lens) if l)/sum(l for l in lens if l)
lens = [l if l else p/ppm for p, l in zip(pxl, lens)]
ct = pts.mean(0); rows = []
for i in range(n):
    a, b = pts[i], pts[(i+1) % n]; L = np.hypot(*(b-a)); u = (b-a)/L; nrm = np.array([-u[1], u[0]])
    mid = (a+b)/2
    if np.dot(mid+nrm-ct, mid+nrm-ct) < np.dot(mid-nrm-ct, mid-nrm-ct): nrm = -nrm
    ang = math.degrees(math.atan2(u[1], u[0])); nseg = max(1, int(math.ceil(L/(9.0*ppm))))
    for k in range(nseg):
        ca = a+(b-a)*k/nseg; cb = a+(b-a)*(k+1)/nseg; c = (ca+cb)/2
        half = int(np.hypot(*(cb-ca))/2*1.08); band = int(band_m*ppm)+6
        M = cv2.getRotationMatrix2D((float(c[0]), float(c[1])), ang, 1.0); T = np.float32([[1, 0, half-c[0]], [0, 1, band-c[1]]])
        A = (np.vstack([T, [0, 0, 1]])@np.vstack([M, [0, 0, 1]]))[:2]
        s = cv2.warpAffine(im, A, (2*half, 2*band), flags=cv2.INTER_AREA, borderValue=(40, 40, 40))
        po = A@np.array([*(c+nrm*ppm), 1.0])
        if po[1] > band: s = s[::-1].copy()
        kk = 1200/s.shape[1]; s = cv2.resize(s, (1200, int(s.shape[0]*kk)), interpolation=cv2.INTER_AREA); cy = s.shape[0]//2
        s = np.vstack([np.full((26, 1200, 3), 30, np.uint8), s])
        cy += 26
        for o in np.arange(-band_m, band_m+0.01, 0.25):
            y = int(round(cy - o*ppm*kk)); col = (0, 0, 255) if abs(o) < 1e-6 else ((0, 255, 255) if abs(o*4) % 2 == 0 else (255, 255, 0))
            for x in range(70, 1200, 34): cv2.line(s, (x, y), (x+9, y), col, 1)
            cv2.putText(s, f'{o:+.2f}', (2, y+4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1)
        cv2.putText(s, f'{slug} edge {i}  part {k+1}/{nseg}  ({lens[i]:.1f} m)   UP = OUTSIDE the lot, red dashes = current line', (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)
        rows.append(s)
pages, cur, hh = [], [], 0
for x in rows:
    if hh+x.shape[0] > 3000 and cur: pages.append(cur); cur, hh = [], 0
    cur.append(x); hh += x.shape[0]+8
if cur: pages.append(cur)
stem = os.path.splitext(name)[0]
for pi, pg in enumerate(pages):
    S = np.vstack([np.pad(x, ((0, 8), (0, 0), (0, 0)), constant_values=255) for x in pg])
    cv2.imwrite(f'qc/fence/{slug}__{stem}_{pi}.jpg', S, [cv2.IMWRITE_JPEG_QUALITY, 88])
# overview with edge numbers
ov = im.copy(); x0, y0 = pts.min(0)-6*ppm; x1, y1 = pts.max(0)+6*ppm
for i in range(n):
    a, b = pts[i].astype(int), pts[(i+1) % n].astype(int); cv2.line(ov, tuple(a), tuple(b), (0, 0, 255), max(2, int(ppm*0.08)))
    m = ((a+b)/2).astype(int); cv2.putText(ov, str(i), tuple(m), cv2.FONT_HERSHEY_SIMPLEX, ppm*0.12, (0, 255, 255), max(2, int(ppm*0.05)))
ov = ov[max(0, int(y0)):int(y1), max(0, int(x0)):int(x1)]; k = 1200/max(ov.shape[:2]); ov = cv2.resize(ov, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
cv2.imwrite(f'qc/fence/{slug}__{stem}_overview.jpg', ov, [cv2.IMWRITE_JPEG_QUALITY, 88])
print(slug, name, 'edges', n, 'ppm', round(ppm, 1), 'pages', len(pages), [round(x, 2) for x in lens])
