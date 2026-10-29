"""(Re)build <day>/<slug>/check.html for every published job from its src/project.json.
Boundary = the published top-down polygon (fence-checked), back-projected to lat/lng through that photo's camera."""
import json, os, re, html, sys, numpy as np, cv2
from sreg import ground
SITE = '/home/claude/baker-production-website/aerials/'
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mkday.py')).read()
CHECK_HTML = eval(re.search(r'^CHECK_HTML\s*=\s*(r?""".*?""")', src, re.S | re.M).group(1))
I = json.load(open(SITE+'index.json')); n = 0
for d in I['days']:
    for j in d['jobs']:
        slug = j['slug']; base = f"{SITE}{d['id']}/{slug}"
        pj = f"{base}/src/project.json"
        if '__' in slug or not os.path.exists(pj): continue
        P = json.load(open(pj)); jb = P.get('job') or {}
        poly, area = [], None
        for ph in P['photos']:
            sh = [s for s in ph.get('shapes', []) if s.get('type') == 'poly' and len(s.get('pts', [])) >= 3]
            c = ph.get('cam') or {}
            if sh and c.get('pitch', 0) < -75 and os.path.exists(f"{base}/src/{ph['name']}"):
                im = cv2.imread(f"{base}/src/{ph['name']}"); H, W = im.shape[:2]
                pts = np.array(sh[0]['pts'], float)
                la, lo, _, _ = ground({k: c[k] for k in ('lat', 'lng', 'h', 'yaw', 'pitch', 'roll', 'f35')}, W, H, pts[:, 0][None], pts[:, 1][None])
                poly = [[float(a), float(b)] for a, b in zip(la.ravel(), lo.ravel())]
                t = [x for x in ph.get('texts', []) if x.get('style') == 'area']; area = t[0].get('lot') if t else None
                break
        places = {q.get('key'): q for q in jb.get('places', [])}; used, seen = [], set()
        for ph in P['photos']:
            for pin in ph.get('pins', []):
                q = places.get(pin.get('key'))
                if pin.get('house') or not q or q['key'] in seen: continue
                seen.add(q['key']); dd = q.get('dist') or 0
                used.append({'name': q['name'], 'lat': q['lat'], 'lng': q['lng'], 'd': f"{dd/1000:.1f} km" if dd >= 1000 else f"{round(dd/10)*10:.0f} m"})
        data = {'lat': jb.get('lat'), 'lng': jb.get('lng'), 'poly': poly, 'places': used}
        h = (CHECK_HTML.replace('__ADDR__', html.escape(j.get('addr', slug))).replace('__AREA__', f' · {area} m²' if area else '')
             .replace('__N__', str(len(used))).replace('__DATA__', json.dumps(data)))
        open(f"{base}/check.html", 'w').write(h); n += 1
        print(d['id'], slug, 'boundary' if poly else 'NO boundary', len(used), 'places')
print(n, 'check maps')
