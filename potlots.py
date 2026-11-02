"""Potential-lots image for every drone job with room in the backyard (Jason, 2 Nov 2026: "every property that has space in the backyard do this potential thing").
usage: python3 potlots.py <day-id> [<day-id> ...]      needs the website served on :8766 (python3 -m http.server 8766 in the site dir)
Rule: a job qualifies when its top-down has a lot boundary, the lot is >= MIN_M2 (title/cadastre area) and it isn't a unit/strata/plain job.
Lots = floor(area / M2_PER_LOT), 2..4, front-to-back with a 4 m side driveway (battle-axe), like the Rodway Westfield Rd diagram.
Output: <slug>/<slug>_potential_lots.jpg (+ thumb) shown first in the job's gallery section. Skips jobs that already have one, and odd-shaped blocks (corner/cul-de-sac/battle-axe) - those are done by hand in /lots."""
import json, os, re, subprocess, sys, urllib.parse, math
import numpy as np, cv2
from PIL import Image
SITE = os.environ.get('SITE', '/home/claude/baker-production-website').rstrip('/'); A = SITE + '/aerials'
MIN_M2, M2_PER_LOT = 700, 350
AB = {'St':'Street','Rd':'Road','Hwy':'Highway','Ave':'Avenue','Dr':'Drive','Pl':'Place','Cres':'Crescent','Cir':'Circle','Ct':'Court','Tce':'Terrace','Wy':'Way','Lp':'Loop','Pde':'Parade','Bvd':'Boulevard','Cl':'Close','Gr':'Grove','Hts':'Heights'}
idx = json.load(open(A + '/index.json')); todo = []
def area_of(j):
    m = re.search(r'([\d,.]+)\s*m²', j.get('lot') or '');  return float(m.group(1).replace(',', '')) if m else None
for day in idx['days']:
    if day['id'] not in sys.argv[1:]: continue
    for j in day['jobs']:
        slug = j['slug']; d = f"{A}/{day['id']}/{slug}"; out = f"{d}/{slug}_potential_lots.jpg"
        if os.path.exists(out) or any('_lots' in x for x in os.listdir(d)) or j.get('agency') == 'plain' or '/' in j['addr'].split(',')[0]: continue
        top = (j.get('fullPhotos') or j.get('photos') or [None])[0]
        try: P = json.load(open(f"{d}/src/project.json"))
        except Exception: continue
        ph = next((q for q in P['photos'] if q['name'] == top), None)
        poly = next((s for s in (ph or {}).get('shapes', []) if s.get('type') == 'poly'), None)
        if not poly or not os.path.exists(f"{d}/src/{top}"): print(slug, 'skip: no boundary on top-down'); continue
        pts = np.array(poly['pts'], float); lens = [float(re.sub(r'[^\d.]', '', l) or 0) for l in poly.get('lens') or []]
        # metres per pixel from the labelled edges
        el = [np.linalg.norm(pts[(i+1) % len(pts)] - pts[i]) for i in range(len(pts))]
        mpp = np.median([lens[i] / el[i] for i in range(min(len(lens), len(el))) if lens[i] > 0]) if any(lens) else None
        area = area_of(j) or (cv2.contourArea(pts.astype(np.float32)) * mpp * mpp if mpp else None)
        if not area or area < MIN_M2: print(slug, 'skip: lot', area); continue
        # reduce to 4 corners
        q = pts.astype(np.float32)
        if len(q) != 4:
            hull = cv2.convexHull(q); peri = cv2.arcLength(hull, True); q4 = None
            for f in np.linspace(.005, .1, 40):
                a = cv2.approxPolyDP(hull, f * peri, True)
                if len(a) == 4: q4 = a.reshape(-1, 2); break
            q = q4 if q4 is not None else cv2.boxPoints(cv2.minAreaRect(hull))
        q = np.array(q, float)
        # only clean, roughly rectangular blocks (skip battle-axe, cul-de-sac wedges, odd shapes)
        ang = []
        for i in range(4):
            a, b, c = q[i-1], q[i], q[(i+1) % 4]; v1, v2 = a - b, c - b
            ang.append(math.degrees(math.acos(np.clip(v1 @ v2 / np.linalg.norm(v1) / np.linalg.norm(v2), -1, 1))))
        fill = cv2.contourArea(pts.astype(np.float32)) / max(1, cv2.contourArea(q.astype(np.float32)))
        if max(abs(x - 90) for x in ang) > 14 or not (0.93 < fill < 1.07): print(slug, 'skip: odd-shaped block', [round(x) for x in ang], round(fill, 2)); continue
        e = int(np.argmax([(q[i][1] + q[(i+1) % 4][1]) / 2 for i in range(4)]))     # street edge = lowest edge (street is always at the bottom of our top-downs)
        front = np.linalg.norm(q[(e+1) % 4] - q[e]) * mpp if mpp else 20
        n = int(max(2, min(4, area // M2_PER_LOT)))
        parts = re.sub(r'^[\d/A-Za-z-]*\d[A-Za-z]?\s+', '', j['addr'].split(',')[0]).strip().split(' ')
        if parts and parts[-1] in AB: parts[-1] = AB[parts[-1]]
        yaw = (ph.get('cam') or {}).get('yaw')
        prm = {'img': f"/aerials/{day['id']}/{slug}/src/{top}", 'street': ' '.join(parts), 'c': ','.join(f'{v:.1f}' for v in q.ravel()), 'e': e,
               'front': f'{front:.2f}', 'area': f'{area:.0f}', 'n': n}
        if yaw is not None: prm['yaw'] = f'{yaw:.2f}'
        todo.append({'url': '/lots/?' + urllib.parse.urlencode(prm), 'out': out, 'day': day['id'], 'slug': slug, 'n': n, 'area': area})
        print(slug, f'{area:.0f} m2 ->', n, 'lots')
if not todo: print('no qualifying jobs'); sys.exit()
json.dump(todo, open('e2e/potlots_jobs.json', 'w'))
subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'potlots.js'), 'e2e/potlots_jobs.json'])
for t in todo:
    if not os.path.exists(t['out']): continue
    n = os.path.basename(t['out']); d = os.path.dirname(t['out'])
    im = Image.open(t['out']); th = im.copy(); th.thumbnail((720, 720)); os.makedirs(d + '/t', exist_ok=True); th.save(f"{d}/t/{n}", quality=78, optimize=True)
    f = f"{A}/{t['day']}/index.html"; s = open(f).read()
    anchor = f'<a class="ed" href="/pins/?open={t["day"]}/{t["slug"]}">Edit</a>'
    if anchor not in s or f'{t["slug"]}/{n}' in s: continue
    g = s.index('<div class="g">', s.index(anchor)) + len('<div class="g">')
    s = s[:g] + f'<a href="{t["slug"]}/{n}" target="_blank"><img loading="lazy" src="{t["slug"]}/t/{n}" alt="Potential {t["n"]} lots"></a>' + s[g:]
    open(f, 'w').write(s); print('added', t['slug'])
