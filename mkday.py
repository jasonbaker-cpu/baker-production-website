"""Publish one shoot day to bakerproduction.com/aerials/<day>/ : finals gallery + editable sources + index.json entry.
usage: python3 mkday.py <day-id> "<label>" <runjobs.json> <jobs-meta.json>
jobs-meta: {slug: {"addr":..., "who":...}}"""
import glob, os, sys, json, html, io, shutil
from PIL import Image
SP = os.environ.get('AERIAL_SP') or os.path.dirname(os.path.abspath(__file__)) + '/'   # run from any clone (was a fixed session scratchpad)
SITE = (os.environ['SITE'].rstrip('/') + '/aerials/') if os.environ.get('SITE') else '/home/claude/baker-production-website/aerials/'
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
jobs_idx, secs = [], []
by_slug = {j['slug']: j for j in RUN}
CHECK_HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Check · __ADDR__</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>html,body{margin:0;height:100%;font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;background:#111;color:#eee}
.w{display:grid;grid-template-columns:1fr 1.4fr;gap:6px;height:100%}@media(max-width:700px){.w{grid-template-columns:1fr;grid-auto-rows:300px}}
.p{position:relative}.m{position:absolute;inset:0}.h{position:absolute;z-index:500;left:8px;top:8px;background:rgba(0,0,0,.72);padding:4px 9px;border-radius:5px;font-weight:600}
.leaflet-tooltip.t{background:rgba(30,32,36,.9);color:#fff;border:0;font-weight:600;box-shadow:none;padding:2px 6px}.leaflet-tooltip.t:before{display:none}</style></head>
<body><div class="w"><div class="p"><div id="b" class="m"></div><div class="h">Boundary__AREA__</div></div><div class="p"><div id="a" class="m"></div><div class="h">Pinned places (__N__)</div></div></div>
<script>const D=__DATA__;
const T='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', O={maxZoom:21,maxNativeZoom:19,attribution:'Esri World Imagery'};
const H=[D.lat,D.lng];
const b=L.map('b',{zoomControl:false,attributionControl:false}); L.tileLayer(T,O).addTo(b);
if(D.poly&&D.poly.length){const pg=L.polygon(D.poly,{color:'#ffd400',weight:3,fill:false}).addTo(b); b.fitBounds(pg.getBounds(),{padding:[40,40],maxZoom:20});}
else{b.setView(H,19); L.marker(H).addTo(b).bindTooltip('No boundary (strata / pins only)',{permanent:true,className:'t'});}
L.circleMarker(H,{radius:5,color:'#fff',weight:2,fillColor:'#e33',fillOpacity:1}).addTo(b);
const a=L.map('a',{attributionControl:false}); L.tileLayer(T,O).addTo(a);
L.circleMarker(H,{radius:8,color:'#fff',weight:3,fillColor:'#e33',fillOpacity:1}).addTo(a).bindTooltip('House',{permanent:true,direction:'top',className:'t'});
const pts=[H]; D.places.forEach(q=>{pts.push([q.lat,q.lng]); L.polyline([H,[q.lat,q.lng]],{color:'#fff',weight:1.5,dashArray:'6 6',opacity:.7}).addTo(a);
 L.circleMarker([q.lat,q.lng],{radius:6,color:'#fff',weight:2,fillColor:'#1f5fbf',fillOpacity:1}).addTo(a).bindTooltip(q.name+' · '+q.d,{permanent:true,direction:'right',className:'t'});});
a.fitBounds(L.latLngBounds(pts),{paddingTopLeft:[40,50],paddingBottomRight:[230,40]});
</script></body></html>"""

def make_check(slug, m, proj, poly, area):
    jb = proj.get('job') or {}
    places = {q.get('key'): q for q in jb.get('places', [])}
    used, seen = [], set()
    for ph in proj['photos']:
        for pin in ph.get('pins', []):
            q = places.get(pin.get('key'))
            if pin.get('house') or not q or q['key'] in seen: continue
            seen.add(q['key']); d = q.get('dist') or 0
            used.append({'name': q['name'], 'lat': q['lat'], 'lng': q['lng'], 'd': f"{d/1000:.1f} km" if d >= 1000 else f"{round(d/10)*10:.0f} m"})
    data = {'lat': jb.get('lat'), 'lng': jb.get('lng'), 'poly': poly or [], 'places': used}
    h = (CHECK_HTML.replace('__ADDR__', html.escape(m['addr'])).replace('__AREA__', f' · {area} m²' if area else '')
         .replace('__N__', str(len(used))).replace('__DATA__', json.dumps(data)))
    open(f'{OUT}{slug}/check.html', 'w').write(h)
    return used

for slug, m in META.items():
    # 29 Oct (Jason): the top-down travels in the SAME set as the aerials (first photo) so nobody misses it
    oj = by_slug.get(slug)
    nads = [by_slug[k] for k in sorted((k for k in by_slug if k == slug + '__nadir' or (k.startswith(slug + '__nadir') and k[len(slug)+7:].isdigit())), key=lambda k: int(k[len(slug)+7:] or 1))]
    nj = nads[0] if nads else None
    variants = nads + ([oj] if oj else [])   # 29 Oct: every top-down (road-at-bottom + wide) first, then the aerials
    if not variants: continue
    for nv in nads:
        if os.environ.get('SKIP_FENCE'): break
        fp = f"{SP}e2e/fence_{nv['slug']}.json"
        if not os.path.exists(fp) or not json.load(open(fp)).get('pass'):
            sys.exit(f"STOP: {nv['slug']} has no passing fence check ({fp}). Run edgeruler + independent fence check + fencefix.py first.")
    os.makedirs(f'{OUT}{slug}', exist_ok=True)
    src_dir = f'{OUT}{slug}/src/'; shutil.rmtree(src_dir, ignore_errors=True); shutil.rmtree(f'{OUT}{slug}/src-top/', ignore_errors=True); os.makedirs(src_dir)
    proj, names, full_names = None, [], []
    for j in variants:
        full = bool(j.get('full')); variant = j['slug']
        pj = json.load(open(f'{SP}e2e/{variant}/{variant}.baker.json'))
        for ph in j['photos']:
            n = os.path.basename(ph); (ow, oh), (nw, nh) = save_with_meta(SP + ph, src_dir + n, None if full else 3000)
            k = nw / ow
            for q in pj['photos']:
                if q['name'] == n:
                    for a in q.get('anchors') or []: a['ox'] *= k; a['oy'] *= k
            names.append(n)
            if full: full_names.append(n)
        if proj is None: proj = pj
        else: proj['photos'] += [q for q in pj['photos'] if q['name'] not in {x['name'] for x in proj['photos']}]
    order = {n: i for i, n in enumerate(names)}; proj['photos'].sort(key=lambda q: order.get(q['name'], 999))
    open(src_dir + 'project.json', 'w').write(json.dumps(proj))
    base = oj or nj
    mp = SP + base['map']; shutil.copy(mp, src_dir + os.path.basename(mp))
    jobs_idx.append({'slug': slug, 'addr': m['addr'], 'who': m['who'], 'agency': base.get('agency'), 'full': False, 'fullPhotos': full_names,
                     'src': f'{day}/{slug}/src/', 'map': os.path.basename(mp), 'project': 'project.json', 'photos': names})
    # finals gallery: always refresh from this run's renders; top-down first
    fa = f'{SP}final_aerials/{slug}'; shutil.rmtree(fa, ignore_errors=True); os.makedirs(fa)
    ordered = [f for nv in nads for f in sorted(glob.glob(f"{SP}e2e/{nv['slug']}/*.jpg"))] + sorted(glob.glob(f'{SP}e2e/{slug}/*.jpg'))
    for src in ordered: shutil.copy(src, fa)
    d = f'{OUT}{slug}'; os.makedirs(d + '/t', exist_ok=True); items = []
    for f in [fa + '/' + os.path.basename(x) for x in ordered]:
        n = os.path.basename(f); im = Image.open(f).convert('RGB')
        big = im.copy(); big.thumbnail((2400, 2400)); big.save(f'{d}/{n}', quality=84, optimize=True, progressive=True)
        t = im.copy(); t.thumbnail((720, 720)); t.save(f'{d}/t/{n}', quality=78, optimize=True)
        v = int(os.path.getmtime(f)); items.append(f'<a href="{slug}/{n}?v={v}" target="_blank"><img loading="lazy" src="{slug}/t/{n}?v={v}" alt=""></a>')
    used = make_check(slug, m, proj, base.get('poly'), base.get('area'))
    edits = f'<a class="ed" href="/pins/?open={day}/{slug}">Edit</a><a class="ed" href="{slug}/check.html" target="_blank">Check map</a>'
    chk = f'<details class="chk" open><summary>Quick check — boundary + {len(used)} pinned places</summary><iframe loading="lazy" src="{slug}/check.html?v={int(__import__("time").time())}" title="Boundary and places check"></iframe></details>'
    secs.append(f'<section><h2>{html.escape(m["addr"])}</h2><p>{html.escape(m["who"])} · {len(items)} photos{(" (top-downs first)" if len(nads) > 1 else " (top-down first)") if nads else ""} {edits}</p><div class="g">{"".join(items)}</div>{chk}</section>')

# MERGE=1: add these jobs to a day that's already published (keeps the other jobs' gallery sections and index entries)
if os.environ.get('MERGE') and os.path.exists(OUT + 'index.html'):
    import re as _re
    mine = {html.escape(m['addr']) for m in META.values()}
    old_secs = [x for x in _re.findall(r'<section>.*?</section>', open(OUT + 'index.html').read(), _re.S) if _re.search(r'<h2>(.*?)</h2>', x).group(1) not in mine]
    secs = old_secs + secs
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Aerials {html.escape(label)} · Baker Production</title>
<style>:root{{--bg:#f6f5f2;--fg:#16181b;--mut:#666;--acc:#1f5fbf}}@media(prefers-color-scheme:dark){{:root{{--bg:#121315;--fg:#eee;--mut:#9a9a9a;--acc:#7fb0ff}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}}
header,section{{max-width:1400px;margin:auto;padding:18px 16px}}h1{{font-size:20px;margin:0}}h2{{font-size:17px;margin:0}}header p,section p{{color:var(--mut);margin:4px 0 0}}
.ed{{margin-left:10px;color:var(--acc);font-weight:600;text-decoration:none}}a{{color:var(--acc)}}
.chk{{margin-top:10px}}.chk summary{{cursor:pointer;color:var(--mut);font-weight:600}}.chk iframe{{width:100%;height:420px;border:0;border-radius:6px;margin-top:6px;background:#111}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;margin-top:10px}}.g img{{width:100%;display:block;border-radius:4px}}</style></head>
<body><header><h1>Drone edits — {html.escape(label)}</h1><p>Tap a photo for full size. <b>Edit</b> opens the job in the <a href="/pins/">editor</a> with all its pins and settings.</p></header>{"".join(secs)}<script src="../dl.js"></script></body></html>'''
open(OUT + 'index.html', 'w').write(page)

ip = SITE + 'index.json'
idx = json.load(open(ip)) if os.path.exists(ip) else {'days': []}
if os.environ.get('MERGE'):
    prev = next((x for x in idx['days'] if x['id'] == day), None)
    if prev: jobs_idx = [x for x in prev['jobs'] if x['slug'] not in {y['slug'] for y in jobs_idx} and x['slug'].replace('__nadir','') not in {y['slug'] for y in jobs_idx}] + jobs_idx
idx['days'] = [x for x in idx['days'] if x['id'] != day] + [{'id': day, 'label': label, 'gallery': f'{day}/', 'jobs': jobs_idx}]
idx['days'].sort(key=lambda x: x.get('sort', x['id']), reverse=True)
open(ip, 'w').write(json.dumps(idx, indent=1))
print(day, len(jobs_idx), 'jobs')
