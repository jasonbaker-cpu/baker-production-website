"""Build re-render jobs for published top-downs from fence-check results.
usage: python3 fence_apply.py result_X.json [...]  -> e2e/run_fx.json, e2e/fx_meta.json
Offsets: + = move edge outward (metres). Per-part offsets refit the edge line through the shifted part midpoints."""
import json, sys, os, shutil, math, numpy as np
from sreg import ground
SITE = '/home/claude/baker-production-website/aerials/'
I = json.load(open(SITE+'index.json'))
L = json.load(open('qc/fence_list.json'))
R = {}
for f in sys.argv[1:]: R.update(json.load(open(f)))

def line_intersect(p1, d1, p2, d2):
    A = np.array([d1, -d2]).T
    if abs(np.linalg.det(A)) < 1e-9: return None
    t = np.linalg.solve(A, p2-p1); return p1+d1*t[0]

run, meta = [], {}
for day, slug, name in L:
    stem = os.path.splitext(name)[0]; key = f'{slug}__{stem}'
    if key not in R: continue
    res = {e['edge']: e for e in R[key]}
    if all(abs(x) < 0.075 for e in res.values() for x in (e.get('parts') or [e['offset_m']])): print('no change', key); continue
    P = json.load(open(f'{SITE}{day}/{slug}/src/project.json'))
    ph = [p for p in P['photos'] if p['name'] == name][0]
    sh = [s for s in ph['shapes'] if s.get('type') == 'poly'][0]
    pts = np.array(sh['pts'], float); n = len(pts)
    raw = [str(x).rstrip('m') for x in sh['lens']]
    pxl = [np.hypot(*(pts[(i+1) % n]-pts[i])) for i in range(n)]
    ppm = sum(p for p, l in zip(pxl, raw) if l)/sum(float(l) for l in raw if l)
    ct = pts.mean(0); lines = []
    for i in range(n):
        a, b = pts[i], pts[(i+1) % n]; L_ = np.hypot(*(b-a)); u = (b-a)/L_; nrm = np.array([-u[1], u[0]])
        mid = (a+b)/2
        if np.dot(mid+nrm-ct, mid+nrm-ct) < np.dot(mid-nrm-ct, mid-nrm-ct): nrm = -nrm
        e = res.get(i, {'offset_m': 0}); parts = e.get('parts') or [e['offset_m']]
        if e.get('confidence') == 'low': parts = [0.0]*len(parts)        # don't move on a guess
        k = len(parts)
        if k == 1 or max(parts)-min(parts) < 0.05:
            off = float(np.mean(parts)); lines.append((a+nrm*off*ppm, u))
        else:
            ms = [a+(b-a)*(j+0.5)/k + nrm*parts[j]*ppm for j in range(k)]
            X = np.array(ms); c0 = X.mean(0); _, _, vt = np.linalg.svd(X-c0); d = vt[0]
            if np.dot(d, u) < 0: d = -d
            lines.append((c0, d))
    new = []
    for i in range(n):
        p_prev, d_prev = lines[i-1]; p_cur, d_cur = lines[i]
        q = line_intersect(p_prev, d_prev, p_cur, d_cur)
        new.append(q if q is not None else pts[i])
    new = np.array(new)
    moved = [round(float(np.hypot(*(new[i]-pts[i]))/ppm), 2) for i in range(n)]
    cam = {k: ph['cam'][k] for k in ('lat', 'lng', 'h', 'yaw', 'pitch', 'roll', 'f35')}
    import cv2
    img = cv2.imread(f'{SITE}{day}/{slug}/src/{name}'); H_, W_ = img.shape[:2]
    lat, lng, _, _ = ground(cam, W_, H_, new[:, 0][None], new[:, 1][None])
    poly = [[float(a), float(b)] for a, b in zip(lat.ravel(), lng.ravel())]
    job = [j for d in I['days'] if d['id'] == day for j in d['jobs'] if j['slug'] == slug][0]
    os.makedirs(f'batch/fx/{slug}', exist_ok=True)
    loc = f'batch/fx/{slug}/{name}'; shutil.copy(f'{SITE}{day}/{slug}/src/{name}', loc)
    mp = f'batch/fx/{slug}/{job["map"]}'; shutil.copy(f'{SITE}{day}/{slug}/src/{job["map"]}', mp)
    area = [t for t in ph.get('texts', []) if t.get('style') == 'area']
    lens = [float(x) if x else 0 for x in raw]
    v = f'{slug}__fx_{stem[-12:]}'
    run.append(dict(map=mp, agency=job['agency'], slug=v, photos=[loc], poly=poly, full=1, nosnap=True, edgeOff={},
                    lens=lens, area=(area[0].get('lot') if area else None), pxpoly=new.round(1).tolist(),
                    skyPlate=P.get('skyPlate', 'C'), cams={loc: cam}))
    meta[v] = dict(day=day, slug=slug, name=name, moved=moved)
    print(key, 'moved corners (m):', moved)
json.dump(run, open('e2e/run_fx.json', 'w')); json.dump(meta, open('e2e/fx_meta.json', 'w'))
print(len(run), 'jobs')
