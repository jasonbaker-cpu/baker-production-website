import json, math, urllib.parse, urllib.request, re, sys
URL='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
def q(text, lat, lng):
    p=dict(f='json',sourceCountry='AUS',outFields='PlaceName,Place_addr,Type,Addr_type,Score',SingleLine=text,location=f'{lng},{lat}',distance=15000,maxLocations=6)
    with urllib.request.urlopen(URL+'?'+urllib.parse.urlencode(p),timeout=30) as r: return json.load(r).get('candidates',[])
def d(a,b,c,e): return math.hypot((c-a)*111320,(e-b)*111320*math.cos(math.radians(a)))
norm=lambda s: re.sub(r'[^a-z0-9 ]','',s.lower().replace('&','and'))
pins=json.load(open(sys.argv[1])); seen={}; res=[]
for p in pins:
    k=(p['name'],round(p['lat'],4),round(p['lng'],4))
    if k in seen: r=dict(seen[k]); r['job']=p['job']; res.append(r); continue
    try: c=q(p['name']+', WA',p['lat'],p['lng'])
    except Exception as ex: c=[]; print('ERR',p['name'],ex)
    best=None
    for x in c:
        nm=x['attributes'].get('PlaceName') or ''
        n1,n2=norm(nm),norm(p['name'])
        if not nm or not (n1 in n2 or n2 in n1 or len(set(n1.split())&set(n2.split()))>=max(2,len(n2.split())-1)): continue
        dd=d(p['lat'],p['lng'],x['location']['y'],x['location']['x'])
        if best is None or dd<best[0]: best=(round(dd),nm,x['attributes'].get('Type'),x['location']['y'],x['location']['x'])
    r={'job':p['job'],'name':p['name'],'lat':p['lat'],'lng':p['lng'],'arc':best}
    seen[k]=r; res.append(r)
json.dump(res,open('qc/pinverify.json','w'),indent=0)
for r in res:
    b=r['arc']; tag='NOMATCH' if not b else ('FAR' if b[0]>250 else 'ok')
    if tag!='ok': print(tag, r['job'], '|', r['name'], '|', b)
print('checked',len(res),'unique',len(seen))
