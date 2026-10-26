"""Apply horizon levelling to an existing run file (for re-editing older days). usage: level_run.py in.json out.json"""
import json, sys, os, re
sys.path.insert(0, 'pipeline'); from straighten import level_flight
def pitch(f):
    m = re.search(r'GimbalPitchDegree="([-+\d.]+)"', open(f,'rb').read(400000).decode('latin1')); return float(m.group(1)) if m else 0
run = json.load(open(sys.argv[1]))
for j in run:
    if j.get('full'): continue
    new = []; cams = j.get('cams', {})
    LF = level_flight(j['photos'], os.path.join(os.path.dirname(os.path.dirname(j['photos'][0])), 'lvl'))
    for f in j['photos']:
        nf, ang, zm = LF[f]
        if nf != f and f in cams: c = dict(cams.pop(f)); c['roll'] = c.get('roll', 0) + ang; c['f35'] = c.get('f35', 24) * zm; cams[nf] = c
        new.append(nf); print(os.path.basename(f), round(ang, 2))
    j['photos'] = new; j['cams'] = cams
json.dump(run, open(sys.argv[2], 'w'))
