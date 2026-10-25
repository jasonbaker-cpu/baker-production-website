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
day = sys.argv[1]
D = json.load(open(f'days/{day}.json'))
REG = json.load(open('reg_all.json')) if os.path.exists('reg_all.json') else {}

def pitch(f):
    s = open(f, 'rb').read(400000).decode('latin1'); m = re.search(r'GimbalPitchDegree="([-+\d.]+)"', s)
    return float(m.group(1)) if m else 0.0

run, meta = [], {}
for j in D['jobs']:
    ph = sorted(f for f in glob.glob(j['photos'].rstrip('/') + '/*') if f.lower().endswith(('.jpg', '.jpeg')))
    if not ph: print('no photos for', j['slug']); continue
    cams = {}
    for f in ph:
        r = REG.get(f)
        if r and 'cam' in r and r.get('sc', 0) >= r.get('sc0', 0): cams[f] = r['cam']
    nad = [f for f in ph if pitch(f) < -75]
    base = {'map': j['map'], 'agency': j.get('agency', 'red')}
    if j.get('must'): base['must'] = j['must']
    if j.get('plain'): base['plain'] = 1
    if j.get('poly') and nad:
        obl = [f for f in ph if f not in nad]
        run.append(dict(base, slug=j['slug'], photos=obl, poly=j['poly'], cams={f: cams[f] for f in obl if f in cams}))
        n0 = nad[0]   # the first straight-down shot gets the boundary; extra low top-downs are dropped
        run.append(dict(base, slug=j['slug'] + '__nadir', photos=[n0], poly=j['poly'], full=1,
                        snap={'on': True, 'mode': 'ridge', 'sc': 0.0, 'R': 2.5, 'rot': 3},
                        edgeOff=j.get('edgeOff', {}), cams={n0: cams[n0]} if n0 in cams else {}))
        if j.get('pxpoly'): run[-1].update(pxpoly=j['pxpoly'], nosnap=1); run[-1].pop('snap', None)   # boundary hand-traced on the fences
    else:
        run.append(dict(base, slug=j['slug'], photos=ph, cams={f: cams[f] for f in ph if f in cams}))
    meta[j['slug']] = {'addr': j['addr'], 'who': j.get('who', '')}
os.makedirs('e2e', exist_ok=True)
json.dump(run, open(f'e2e/run_{day}.json', 'w')); json.dump(meta, open(f'e2e/meta_{day}.json', 'w'))
print(f'e2e/run_{day}.json', len(run), 'jobs;', sum(len(r['photos']) for r in run), 'photos')
