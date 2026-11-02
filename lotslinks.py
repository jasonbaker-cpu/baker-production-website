"""Add a "Lots" button (opens bakerproduction.com/lots with the job's clean top-down) to every gallery job. Run after mkday (mkday calls it).
usage: python3 lotslinks.py [aerials_dir]   (Jason 2 Nov 2026: easy potential-lots diagrams)"""
import json, re, os, sys, urllib.parse
A = sys.argv[1] if len(sys.argv) > 1 else (os.environ.get('SITE', '/home/claude/baker-production-website').rstrip('/') + '/aerials')
AB = {'St':'Street','Rd':'Road','Hwy':'Highway','Ave':'Avenue','Dr':'Drive','Pl':'Place','Cres':'Crescent','Cir':'Circle','Ct':'Court','Tce':'Terrace','Wy':'Way','Lp':'Loop','Pde':'Parade','Bvd':'Boulevard','Cl':'Close','Gr':'Grove','Hts':'Heights'}
d = json.load(open(f'{A}/index.json')); n = 0
for day in d['days']:
    f = f"{A}/{day['id']}/index.html"
    if not os.path.exists(f): continue
    s = open(f).read()
    for j in day['jobs']:
        top = (j.get('fullPhotos') or j.get('photos') or [None])[0]
        if not top or not os.path.exists(f"{A}/{day['id']}/{j['slug']}/src/{top}"): continue
        parts = re.sub(r'^[\d/A-Za-z-]*\d[A-Za-z]?\s+', '', j['addr'].split(',')[0]).strip().split(' ')
        if parts and parts[-1] in AB: parts[-1] = AB[parts[-1]]
        url = f"/lots/?img=/aerials/{day['id']}/{j['slug']}/src/{top}&street=" + urllib.parse.quote(' '.join(parts))
        anchor = f'<a class="ed" href="/pins/?open={day["id"]}/{j["slug"]}">Edit</a>'
        if anchor in s and f'/aerials/{day["id"]}/{j["slug"]}/src/' not in s.split(anchor, 1)[1][:400]:
            s = s.replace(anchor, anchor + f'<a class="ed" href="{url}" target="_blank">Lots</a>', 1); n += 1
    open(f, 'w').write(s)
print('lots links added:', n)
