import os
"""Publish one shoot day to bakerproduction.com/aerials/<day>/ : finals gallery + editable sources + index.json entry.
usage: python3 mkday.py <day-id> "<label>" e2e/run_<day>.json e2e/meta_<day>.json
jobs-meta: {slug: {"addr":..., "who":...}}"""
import glob, os, sys, json, html, io, shutil
from PIL import Image
SP = os.path.dirname(os.path.abspath(__file__))+'/'
SITE = os.environ.get('SITE', '/home/claude/baker-production-website') + '/aerials/'
day, label, runf, metaf = sys.argv[1:5]
RUN = json.load(open(SP + runf)); META = json.load(open(SP + metaf))
OUT = SITE + day + '/'

def app1_segments(raw):
    """EXIF + XMP APP1 segments from a JPEG (keeps the drone gimbal data the editor reads)."""
    segs, i = [], 2
    while i < len(raw) - 4 and raw[i] == 0xFF:
        m = raw[i+1]; L = int.from_bytes(raw[i+2:i+4], 'big')
        if m == 0xDA: break
        if m == 0xE1: segs.append(raw[i:i+2+L])
        i += 2 + L
    return segs

def save_with_meta(src, dst, width):
    raw = open(src, 'rb').read(); im = Image.open(io.BytesIO(raw)).convert('RGB')
    if width and im.width > width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=85, optimize=True); j = b.getvalue()
    segs = app1_segments(raw); j = j[:2] + b''.join(segs) + j[2:]
    open(dst, 'wb').write(j); return Image.open(src).size, im.size

os.makedirs(OUT, exist_ok=True)
# collect finals: each job's photos plus its top-down
for slug in META:
    fd = f'{SP}final_aerials/{slug}'; shutil.rmtree(fd, ignore_errors=True); os.makedirs(fd)
    for f in glob.glob(f'{SP}e2e/{slug}/*.jpg') + glob.glob(f'{SP}e2e/{slug}__nadir/*.jpg'): shutil.copy(f, fd)
jobs_idx, secs = [], []
by_slug = {j['slug']: j for j in RUN}
for slug, m in META.items():
    for variant in (slug, slug + '__nadir'):
        j = by_slug.get(variant)
        if not j: continue
        full = bool(j.get('full'))
        if full and not os.environ.get('SKIP_FENCE'):
            fp = f'{SP}e2e/fence_{variant}.json'
            if not os.path.exists(fp) or not json.load(open(fp)).get('pass'):
                sys.exit(f'STOP: {variant} has no passing fence check ({fp}). Run edgeruler + independent fence check + fencefix.py first.')
        src_dir = f'{OUT}{slug}/src{"-top" if full else ""}/'; shutil.rmtree(src_dir, ignore_errors=True); os.makedirs(src_dir)
        proj = json.load(open(f'{SP}e2e/{variant}/{variant}.baker.json'))
        names = []
        for ph in j['photos']:
            n = os.path.basename(ph); (ow, oh), (nw, nh) = save_with_meta(SP + ph, src_dir + n, None if full else 3000)
            k = nw / ow
            for q in proj['photos']:
                if q['name'] == n:
                    for a in q.get('anchors') or []: a['ox'] *= k; a['oy'] *= k
            names.append(n)
        open(src_dir + 'project.json', 'w').write(json.dumps(proj))
        mp = SP + j['map']; shutil.copy(mp, src_dir + os.path.basename(mp))
        jobs_idx.append({'slug': variant, 'addr': m['addr'] + (' — top-down' if full else ''), 'who': m['who'], 'agency': j.get('agency'),
                         'full': full, 'src': f'{day}/{slug}/src{"-top" if full else ""}/', 'map': os.path.basename(mp), 'project': 'project.json', 'photos': names})
    # finals gallery
    d = f'{OUT}{slug}'; os.makedirs(d + '/t', exist_ok=True); items = []
    for f in sorted(glob.glob(f'{SP}final_aerials/{slug}/*.jpg')):
        n = os.path.basename(f); im = Image.open(f).convert('RGB')
        big = im.copy(); big.thumbnail((2400, 2400)); big.save(f'{d}/{n}', quality=84, optimize=True, progressive=True)
        t = im.copy(); t.thumbnail((720, 720)); t.save(f'{d}/t/{n}', quality=78, optimize=True)
        items.append(f'<a href="{slug}/{n}" target="_blank"><img loading="lazy" src="{slug}/t/{n}" alt=""></a>')
    edits = ''.join(f'<a class="ed" href="/pins/?open={day}/{x["slug"]}">Edit{" top-down" if x["full"] else ""}</a>' for x in jobs_idx if x['slug'] in (slug, slug + '__nadir'))
    secs.append(f'<section><h2>{html.escape(m["addr"])}</h2><p>{html.escape(m["who"])} · {len(items)} photos {edits}</p><div class="g">{"".join(items)}</div></section>')

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Aerials {html.escape(label)} · Baker Production</title>
<style>:root{{--bg:#f6f5f2;--fg:#16181b;--mut:#666;--acc:#1f5fbf}}@media(prefers-color-scheme:dark){{:root{{--bg:#121315;--fg:#eee;--mut:#9a9a9a;--acc:#7fb0ff}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}}
header,section{{max-width:1400px;margin:auto;padding:18px 16px}}h1{{font-size:20px;margin:0}}h2{{font-size:17px;margin:0}}header p,section p{{color:var(--mut);margin:4px 0 0}}
.ed{{margin-left:10px;color:var(--acc);font-weight:600;text-decoration:none}}a{{color:var(--acc)}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;margin-top:10px}}.g img{{width:100%;display:block;border-radius:4px}}</style></head>
<body><header><h1>Drone edits — {html.escape(label)}</h1><p>Tap a photo for full size. <b>Edit</b> opens the job in the <a href="/pins/">editor</a> with all its pins and settings.</p></header>{"".join(secs)}</body></html>'''
open(OUT + 'index.html', 'w').write(page)

ip = SITE + 'index.json'
idx = json.load(open(ip)) if os.path.exists(ip) else {'days': []}
idx['days'] = [x for x in idx['days'] if x['id'] != day] + [{'id': day, 'label': label, 'gallery': f'{day}/', 'jobs': jobs_idx}]
idx['days'].sort(key=lambda x: x.get('sort', x['id']), reverse=True)
open(ip, 'w').write(json.dumps(idx, indent=1))
print(day, len(jobs_idx), 'jobs')
