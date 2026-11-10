"""Automatic fence fit for top-down boundaries (Jason, 10 Nov 2026: "yes automatic fence thing").

The cadastre outline projected with the drone's camera lands 1-3 m (and up to a few degrees) off the real fences.
This moves the whole outline, then each side, onto the fences.

Evidence: gradient edges at ~12 px/m, each sample scored by how well the edge direction matches the side
(|cos| between the image gradient and the side's normal). A side's score is the 55th percentile along its length,
so a long continuous fence beats a short roof or wall edge, and a tree hiding part of a fence doesn't matter.

Stage 1 (whole outline): dx, dy +-4.5 m, turn +-4 deg, size +-3%, coarse to fine; small pull back toward the start.
Stage 2 (each side): slide +-0.9 m and tilt +-1.5 deg; corners re-made as intersections.
Returns new points plus a confidence; low confidence -> keep the original (and flag).

usage: python3 fencefit.py <job dir> [photo-substring ...]     edits <job>/src/project.json in place, prints a report
python: fit(img, pts, area_m2) -> (new_pts, info)
"""
import sys, os, json, math
import numpy as np, cv2
from PIL import Image
from scipy.ndimage import map_coordinates

TARGET_PPM = 12.0
MIN_SCORE = 0.42

MODE = {'ridge': 1.0, 'edge': 0.0}

def evidence(img, scale):
    a = np.asarray(img.convert('L'), np.float32)
    a = cv2.resize(a, (int(a.shape[1] * scale), int(a.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    a = cv2.GaussianBlur(a, (0, 0), 0.9) / 255.0
    gx = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)
    m = np.hypot(gx, gy); cap = np.percentile(m, 99) + 1e-6; k = np.minimum(m, cap) / cap / (m + 1e-6)
    return a, gx * k, gy * k   # intensity (for the thin-line test) and the capped gradient vector

def side_samples(P, step=1.5):
    S = []
    n = len(P)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]; L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-6: S.append(None); continue
        k = max(6, int(L / step)); t = np.linspace(0.1, 0.9, k)
        S.append((a, b, L, t))
    return S

def line_resp(ev, X, Y, nx, ny, m):
    """fences are THIN lines (post/colorbond + its shadow): darker or lighter than BOTH sides ~0.35 m away.
    A roof or wall edge is a one-sided step and scores ~0 here, which is what keeps the line off the house."""
    A, GX, GY = ev; w = 0.35 * m; f = lambda x, y: map_coordinates(A, [y, x], order=1, mode='nearest')
    c = f(X, Y); l = f(X - nx * w, Y - ny * w); r = f(X + nx * w, Y + ny * w)
    ridge = np.maximum(0, np.maximum(np.minimum(l, r) - c, c - np.maximum(l, r))) * 6.0
    v = MODE['ridge'] * np.minimum(ridge, 1.0)
    if MODE['edge']: v = v + MODE['edge'] * np.abs(map_coordinates(GX, [Y, X], order=1, mode='constant') * nx + map_coordinates(GY, [Y, X], order=1, mode='constant') * ny)
    return v

def score_poly(P, ev, wnorm=2, m=12.0):
    """mean over sides (weighted by sqrt length) of the 55th-pct thin-line strength along the side."""
    n = len(P); tot = 0.0; wt = 0.0; per_side = []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]; L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 4: per_side.append(None); continue
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
        t = np.linspace(0.1, 0.9, max(8, int(L / 1.5)))
        xs = a[0] + (b[0] - a[0]) * t; ys = a[1] + (b[1] - a[1]) * t
        best = None
        for o in range(-wnorm, wnorm + 1):
            v = line_resp(ev, xs + nx * o, ys + ny * o, nx, ny, m)
            best = v if best is None else np.maximum(best, v)
        s = float(np.percentile(best, 55)); per_side.append(s)
        w = math.sqrt(L); tot += s * w; wt += w
    return (tot / wt if wt else 0.0), per_side

def tf(P, c, dx, dy, sc, rt):
    cs, sn = math.cos(rt), math.sin(rt)
    return [(c[0] + dx + sc * ((x - c[0]) * cs - (y - c[1]) * sn), c[1] + dy + sc * ((x - c[0]) * sn + (y - c[1]) * cs)) for x, y in P]

def intersect(l1, l2):
    (p1, p2), (p3, p4) = l1, l2
    d1 = (p2[0] - p1[0], p2[1] - p1[1]); d2 = (p4[0] - p3[0], p4[1] - p3[1]); den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-9 * (math.hypot(*d1) * math.hypot(*d2) + 1e-9) or abs(den) / (math.hypot(*d1) * math.hypot(*d2)) < 0.05:
        return ((p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2)
    t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den
    return (p1[0] + d1[0] * t, p1[1] + d1[1] * t)

def fit(img, pts, area_m2=None, ppm=None):
    W, H = img.size
    P0 = [tuple(map(float, q)) for q in pts]
    if ppm is None:
        apx = abs(sum(P0[i][0] * P0[(i + 1) % len(P0)][1] - P0[(i + 1) % len(P0)][0] * P0[i][1] for i in range(len(P0)))) / 2
        ppm = math.sqrt(apx / area_m2) if area_m2 else 30.0
    s = min(1.0, TARGET_PPM / ppm); ev = evidence(img, s); m = ppm * s   # m = px per metre in evidence space
    Q0 = [(x * s, y * s) for x, y in P0]; c = (sum(q[0] for q in Q0) / len(Q0), sum(q[1] for q in Q0) / len(Q0))
    base, _ = score_poly(Q0, ev, m=m)
    pull = 0.012   # score lost per metre moved: the cadastre is roughly right, prefer small moves
    def obj(q): sc_, _ = score_poly(tf(Q0, c, q[0], q[1], q[2], q[3]), ev, m=m); return sc_ - pull * math.hypot(q[0], q[1]) / m - 0.15 * abs(q[2] - 1) - 0.02 * abs(math.degrees(q[3]))
    best = (obj((0, 0, 1, 0)), (0.0, 0.0, 1.0, 0.0)); allv = []
    R = 4.5 * m
    for rt in np.radians(np.arange(-2, 2.01, 1.0)):
        for sc in (0.97, 1.0, 1.03):
            for dx in np.arange(-R, R + 1e-6, 0.5 * m):
                for dy in np.arange(-R, R + 1e-6, 0.5 * m):
                    v = obj((dx, dy, sc, rt)); allv.append(v)
                    if v > best[0]: best = (v, (dx, dy, sc, rt))
    st = [0.25 * m, 0.25 * m, 0.01, math.radians(0.5)]
    for it in range(5):
        improved = True
        while improved:
            improved = False
            for k in range(4):
                for sgn in (-1, 1):
                    q = list(best[1]); q[k] += sgn * st[k]; v = obj(q)
                    if v > best[0] + 1e-6: best = (v, tuple(q)); improved = True
        st = [x / 2 for x in st]
    Q1 = tf(Q0, c, *best[1])
    whole_score, _ = score_poly(Q1, ev, m=m)
    # stage 2: each side on its own fence
    n = len(Q1); lines = []; moves = []
    for i in range(n):
        a, b = Q1[i], Q1[(i + 1) % n]; L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 2 * m: lines.append((a, b)); moves.append(0.0); continue
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        def side(d, r):
            cs, sn = math.cos(r), math.sin(r)
            f = lambda q: (mx + (q[0] - mx) * cs - (q[1] - my) * sn + nx * d, my + (q[0] - mx) * sn + (q[1] - my) * cs + ny * d)
            return f(a), f(b)
        def sscore(d, r):
            A, B = side(d, r); v, ps = score_poly([A, B, (B[0] + 1e3, B[1] + 1e3)], ev, m=m); return ps[0] - 0.03 * abs(d) / m
        s0 = sscore(0, 0); bs = (s0, 0.0, 0.0)
        for d in np.arange(-0.9 * m, 0.9 * m + 1e-6, 0.1 * m):
            for r in np.radians(np.arange(-1.5, 1.51, 0.5)):
                v = sscore(d, r)
                if v > bs[0]: bs = (v, d, r)
        ok = bs[0] > s0 * 1.12 + 0.01
        lines.append(side(bs[1], bs[2]) if ok else (a, b)); moves.append(round(bs[1] / m, 2) if ok else 0.0)
    Q2 = [intersect(lines[(i - 1) % n], lines[i]) for i in range(n)]
    Q2 = [q if math.hypot(q[0] - Q1[i][0], q[1] - Q1[i][1]) < 1.3 * m else Q1[i] for i, q in enumerate(Q2)]
    final, per = score_poly(Q2, ev, m=m)
    allv = np.array(allv); conf = (best[0] - np.median(allv)) / (np.std(allv) + 1e-6)
    info = {'moved_m': round(math.hypot(best[1][0], best[1][1]) / m, 2), 'dx_m': round(best[1][0] / m, 2), 'dy_m': round(best[1][1] / m, 2),
            'turn_deg': round(math.degrees(best[1][3]), 2), 'size': round(best[1][2], 3), 'side_moves_m': moves,
            'score_before': round(base, 3), 'score_after': round(final, 3), 'conf': round(float(conf), 2),
            'sides': [None if v is None else round(v, 3) for v in per]}
    good = final > base * 1.05 and conf > 2.5 and final >= MIN_SCORE   # MIN_SCORE: no clear fences (bush, twilight glare) -> leave it, flag
    info['applied'] = bool(good)
    out = [(x / s, y / s) for x, y in Q2] if good else P0
    return out, info

def run_job(job, only=()):
    pj = os.path.join(job, 'src', 'project.json'); p = json.load(open(pj)); rep = {}
    for ph in p['photos']:
        if not ph.get('shapes') or (ph.get('cam') or {}).get('pitch', 0) > -75: continue
        if only and not any(o in ph['name'] for o in only): continue
        sh = [s for s in ph['shapes'] if s.get('type') == 'poly'];
        if not sh: continue
        area = next((t.get('lot') for t in ph.get('texts', []) if t.get('lot')), None)
        img = Image.open(os.path.join(job, 'src', ph['name'])).convert('RGB')
        new, info = fit(img, sh[0]['pts'], area)
        if info['applied']: sh[0]['pts'] = [list(q) for q in new]
        rep[ph['name']] = info; print(ph['name'], json.dumps(info))
    json.dump(p, open(pj, 'w')); return rep

def fit_ll(img_path, cam, ll, area_m2=None):
    """cadastre [[lat,lng]..] + editor camera -> fence-fitted pixel polygon (original pixels) or None, info"""
    from clean_lot import project
    img = Image.open(img_path).convert('RGB'); W, H = img.size
    P = [project(cam, W, H, la, ln) for la, ln in ll]
    if any(q is None for q in P): return None, {'error': 'outline off the photo'}
    new, info = fit(img, P, area_m2)
    return ([list(map(float, q)) for q in new] if info['applied'] else None), info

if __name__ == '__main__':
    run_job(sys.argv[1], sys.argv[2:])
