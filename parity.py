# Portal parity check: render the 3000px files the portal loads, through the same editor, and compare
# with the batch output. Any sky/haze tile that differs a lot is flagged (this is what bit us on 26 Oct).
# usage: python3 parity.py <day-id> <run.json>   -> prints PASS/FAIL per photo, writes qc/parity_<day>.jpg
import sys, json, os, glob, shutil, subprocess, numpy as np
from PIL import Image, ImageDraw
day, rf = sys.argv[1], sys.argv[2]
SITE = ((os.environ['SITE'].rstrip('/') + '/aerials/') if os.environ.get('SITE') else '/home/claude/baker-production-website/aerials/') + day + '/'
os.makedirs('par3k', exist_ok=True); jobs = []
for j in json.load(open(rf)):
    if j['slug'].endswith('__nadir'): continue
    srcdir = SITE + j['slug'] + '/src/'
    if not os.path.isdir(srcdir): continue
    j = dict(j); newp = []; cams = {}
    for p in j['photos']:
        b = os.path.basename(p); s = [x for x in glob.glob(srcdir + '*') if os.path.basename(x).lower() == b.lower()]
        if not s: continue
        d = 'par3k/' + b; shutil.copy(s[0], d); newp.append(d)
        if p in j.get('cams', {}): cams[d] = j['cams'][p]
    j['photos'] = newp; j['cams'] = cams; j['_orig'] = j['slug']; j['slug'] = 'par_' + j['slug']; jobs.append(j)
json.dump(jobs, open('e2e/par_' + day + '.json', 'w'))
if '--score' not in sys.argv: subprocess.run(['python3', 'runjobs.py', 'e2e/par_' + day + '.json'], check=False, stdout=subprocess.DEVNULL)
bad = 0; rows = []
for j in jobs:
    for p in j['photos']:
        b = os.path.basename(p); fa = lambda d: [x for x in glob.glob(d + '/*') if os.path.basename(x).lower() == b.lower()]; A = fa('e2e/' + j['_orig']); B = fa('e2e/' + j['slug'])
        if not A or not B: print('MISSING', j['_orig'], b); bad += 1; continue
        ra = np.asarray(Image.open(A[0]).convert('RGB').resize((600, 400)), float)[:200]; rc = np.asarray(Image.open(B[0]).convert('RGB').resize((600, 400)), float)[:200]
        x = ra.mean(2); y = rc.mean(2)   # top half: sky + horizon
        # ignore pins/labels: white label boxes and strongly coloured or near-black pin pixels in either render (labels can shift a few px)
        def pinmask(r):
            mx = r.max(2); mn = r.min(2); return (mn > 238) | ((mx - mn) > 90) | (mx < 45)
        from scipy import ndimage as nd
        m = nd.binary_dilation(pinmask(ra) | pinmask(rc), iterations=4)
        d = np.abs(x - y); d[m] = 0; cnt = (~m).reshape(10, 20, 30, 20).sum(axis=(1, 3))
        t = d.reshape(10, 20, 30, 20).sum(axis=(1, 3)) / np.maximum(cnt, 1); t[cnt < 150] = 0      # 20x30 px tiles, label-free pixels only
        worst = t.max(); ok = worst < 14
        print(('PASS ' if ok else 'FAIL ') + j['_orig'] + ' ' + b + ' worst tile diff %.1f' % worst)
        if not ok: bad += 1; rows.append((A[0], B[0]))
if rows:
    S = Image.new('RGB', (1200, 260 * len(rows)), 'white')
    for i, (a, c) in enumerate(rows):
        S.paste(Image.open(a).resize((600, 400)).crop((0, 0, 600, 260)), (0, 260 * i)); S.paste(Image.open(c).resize((600, 400)).crop((0, 0, 600, 260)), (600, 260 * i))
    S.save('qc/parity_' + day + '.jpg', quality=80)
print('PARITY', 'PASS' if bad == 0 else 'FAIL (%d)' % bad)
