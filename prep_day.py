"""Build the run file for one shoot day.
usage: python3 prep_day.py <day-id>        reads  days/<day-id>.json   writes e2e/run_<day-id>.json and e2e/meta_<day-id>.json

days/<day-id>.json = {"label": "Thu 22 Oct 2026", "jobs": [
  {"slug": "55_wright_st", "addr": "55 Wright St, Kewdale", "who": "Devon Kelly · Laurie Kelly",
   "agency": "red",                      # pin style key (see agency_map.json / editor AGENCIES)
   "photos": "batch/55_wright_st/raw",   # folder of the DJI JPGs
   "map": "batch/55_wright_st/raw/55_wright_st_kewdale_map.html",   # amenity map html, or a places .json
   "poly": [[lat,lng],...],              # optional: lot boundary (cadastre). None = strata / no boundary
   "must": ["Kelmscott Station"]          # optional: places the agent asked for
  }]}
Cameras: uses reg_all.json (satellite registration) where it beat the drone's own numbers; otherwise the drone data."""
import json, sys, glob, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, 'pipeline')
from straighten import level_file, level_flight   # 26 Oct: every drone photo is levelled before editing
day = sys.argv[1]
D = json.load(open(f'days/{day}.json'))
REG = json.load(open('reg_all.json')) if os.path.exists('reg_all.json') else {}

def pitch(f):
    s = open(f, 'rb').read(400000).decode('latin1'); m = re.search(r'GimbalPitchDegree="([-+\d.]+)"', s)
    return float(m.group(1)) if m else 0.0

run, meta = [], {}
for j in D['jobs']:
    ph = sorted(f for f in glob.glob(j['photos'].rstrip('/') + '/*') if f.lower().endswith(('.jpg', '.jpeg')))
    if j.get('pick'): ph = [f for f in ph if pitch(f) < -75 or any(p in os.path.basename(f) for p in j['pick'])]   # pick only narrows the aerials; top-downs always stay   # 28 Oct: agent wants only these frames
    if not ph: print('no photos for', j['slug']); continue
    cams = {}
    for f in ph:
        r = REG.get(f)
        if r and 'cam' in r and r.get('sc', 0) >= r.get('sc0', 0): cams[f] = r['cam']
    # level the horizon on every oblique shot; the satellite-registered camera gets the same roll/zoom
    lv = {}
    LF = level_flight(ph, os.path.join(os.path.dirname(os.path.dirname(ph[0])), 'lvl'), force=j.get('level'))
    for f in ph:
        nf, ang, zm = LF[f]
        if nf != f:
            lv[nf] = f
            if f in cams: c = dict(cams.pop(f)); c['roll'] = c.get('roll', 0) + ang; c['f35'] = c.get('f35', 24) * zm; cams[nf] = c
    ph = [next((n for n, o in lv.items() if o == f), f) for f in ph]
    nad = [f for f in ph if pitch(f) < -75]
    base = {'map': j['map'], 'agency': j.get('agency', 'grey')}
    if j.get('must'): base['must'] = j['must']
    for k in ('skip', 'perPhoto'):
        if j.get(k): base[k] = j[k]
    if base['agency'] == 'green-belle':   # 29 Oct (Jason): every Belle Property office matches their listing look
        base.setdefault('skyPlate', 'D'); base.setdefault('perPhoto', 2)
    if j.get('skyPlate'): base['skyPlate'] = j['skyPlate']   # e.g. 'S' = editors' sunset sky for twilight shoots
    if j.get('noSky'): base['noSky'] = 1   # twilight / sunset shoot: keep the real sky
    if j.get('noFinish'): base['noFinish'] = 1   # twilight: no brightening grade either
    if j.get('plain'): base['plain'] = 1
    for k in ('area', 'areaSource', 'lens'):   # from the title / strata plan / agent's sketch in Dropbox
        if j.get(k): base[k] = j[k]
    if j.get('poly') and nad:
        obl = [f for f in ph if f not in nad]
        run.append(dict(base, slug=j['slug'], photos=obl, poly=j['poly'], cams={f: cams[f] for f in obl if f in cams}))
        alt = lambda f: float((re.search(r'RelativeAltitude="([-+\d.]+)"', open(f,'rb').read(400000).decode('latin1')) or [0,'0'])[1])
        # 29 Oct (Jason): shooters often take TWO top-downs — one turned so the road is at the bottom, one higher/wider.
        # Edit both. Highest first (whole lot in frame); then the best different one (yaw differs >25 deg or >8 m higher/lower). Max 2.
        def yaw(f): return float((re.search(r'GimbalYawDegree="([-+\d.]+)"', open(f,'rb').read(400000).decode('latin1')) or [0,'0'])[1])
        nads = sorted(nad, key=alt, reverse=True); pick = [nads[0]]
        for f in nads[1:]:
            dy = abs((yaw(f) - yaw(pick[0]) + 180) % 360 - 180)
            if dy > 25 or abs(alt(f) - alt(pick[0])) > 8: pick.append(f); break
        if j.get('nadirPick'): pick = [f for f in nads if any(p in os.path.basename(f) for p in j['nadirPick'])][:2] or pick
        for i, n0 in enumerate(pick):
            v = j['slug'] + ('__nadir' if i == 0 else f'__nadir{i+1}')
            run.append(dict(base, slug=v, photos=[n0], poly=j['poly'], full=1,
                            snap={'on': True, 'mode': 'ridge', 'sc': 0.0, 'R': 2.5, 'rot': 3},
                            edgeOff=(j.get('edgeOff', {}) if i == 0 else (j.get('edgeOffs') or {}).get(v, {})), cams={n0: cams[n0]} if n0 in cams else {}))
            if j.get('pxpoly') and i == 0: run[-1].update(pxpoly=j['pxpoly'], nosnap=1); run[-1].pop('snap', None)   # boundary hand-traced on the fences
    else:
        run.append(dict(base, slug=j['slug'], photos=ph, cams={f: cams[f] for f in ph if f in cams}))
    meta[j['slug']] = {'addr': j['addr'], 'who': j.get('who', '')}
os.makedirs('e2e', exist_ok=True)
json.dump(run, open(f'e2e/run_{day}.json', 'w')); json.dump(meta, open(f'e2e/meta_{day}.json', 'w'))
print(f'e2e/run_{day}.json', len(run), 'jobs;', sum(len(r['photos']) for r in run), 'photos')
