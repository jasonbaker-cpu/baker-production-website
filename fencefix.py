"""Record a fence check and apply it.
usage: python3 fencefix.py <day-id> <checks.json>
checks.json = {"<slug>": [{"edge":0,"offset_m":0.4,"confidence":"high"}, ...], ...}   (slug without __nadir; from the independent subagent)
Edges more than 0.3 m off with med/high confidence go into edgeOff in days/<day-id>.json (added to any existing offset).
Writes e2e/fence_<slug>__nadir.json = {"pass": bool, "max_off": m, "checks": [...]}. pass = every med/high edge within 0.3 m.
mkday.py will not publish a top-down without a passing fence file."""
import json, sys
day, cf = sys.argv[1:3]
C = json.load(open(cf)); D = json.load(open(f'days/{day}.json')); changed = []
for j in D['jobs']:
    s = j['slug']
    if s not in C: continue
    eo = {int(k): v for k, v in (j.get('edgeOff') or {}).items()}
    bad = [c for c in C[s] if c.get('confidence') in ('high', 'med', 'medium') and abs(c['offset_m']) > 0.3]
    for c in bad: eo[c['edge']] = round(eo.get(c['edge'], 0) + c['offset_m'], 2)
    if bad: j['edgeOff'] = {str(k): v for k, v in eo.items()}; changed.append(s)
    mx = max([abs(c['offset_m']) for c in C[s] if c.get('confidence') in ('high', 'med', 'medium')] or [0])
    json.dump({'pass': not bad, 'max_off': mx, 'checks': C[s]}, open(f'e2e/fence_{s}__nadir.json', 'w'))
    print(s, 'PASS' if not bad else f'FIX edges {[c["edge"] for c in bad]} -> edgeOff {j.get("edgeOff")}', f'max {mx} m')
json.dump(D, open(f'days/{day}.json', 'w'), indent=1)
if changed: print('re-run: python3 prep_day.py', day, '&& runjobs for', [s + '__nadir' for s in changed], '-> then edgeruler + a NEW independent check, then fencefix again')
