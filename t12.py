import asyncio, json, base64, subprocess, sys, os, time
from playwright.async_api import async_playwright
SP = os.environ.get('AERIAL_SP') or os.path.dirname(os.path.abspath(__file__)) + '/'   # run from any clone (was a fixed session scratchpad)
OUT=SP+'e2e/'
F=SP+'fonts/' if os.path.exists(SP+'fonts/source-sans-3-latin-300-normal.woff2') else SP+'fontpkg/package/files/'
ff=''.join(f"@font-face{{font-family:'Source Sans 3';font-weight:{w};src:url(data:font/woff2;base64,{base64.b64encode(open(F+f'source-sans-3-latin-{w}-normal.woff2','rb').read()).decode()}) format('woff2');}}" for w in (300,400,700))+''.join(f"@font-face{{font-family:'Open Sans';font-weight:{w};src:url(data:font/woff2;base64,{base64.b64encode(open(F+f'open-sans-latin-{w}-normal.woff2','rb').read()).decode()}) format('woff2');}}" for w in (400,700))
srv=subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],cwd=SP,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
JOBS=json.loads(sys.argv[1]) if len(sys.argv)>1 else []
async def drag(pg, paths):
    # real drag-and-drop: build File objects, fire dragenter/dragover/drop on the stage
    await pg.evaluate("""async (paths)=>{
      const dt = new DataTransfer();
      for (const p of paths){ const r = await fetch('http://127.0.0.1:8765/'+p); const b = await r.blob(); const n=p.split('/').pop();
        dt.items.add(new File([b], n, { type: /\\.html?$/i.test(n) ? 'text/html' : 'image/jpeg' })); }
      const st = document.getElementById('stage'); const o = { bubbles:true, cancelable:true, dataTransfer:dt };
      st.dispatchEvent(new DragEvent('dragenter', o)); st.dispatchEvent(new DragEvent('dragover', o));
      await new Promise(r=>setTimeout(r,600));
      st.dispatchEvent(new DragEvent('drop', o));
    }""", paths)
async def clickImg(pg,x,y):
    sx,sy = await pg.evaluate(f"window.__bae.imgToScreen({x},{y})"); await pg.mouse.move(sx,sy,steps=8); await pg.mouse.click(sx,sy); await pg.wait_for_timeout(300)
async def export(pg,name):
    async with pg.expect_download() as d: await pg.click('#exportBtn')
    dl=await d.value; await dl.save_as(OUT+name)
async def busy(pg): await pg.wait_for_function("document.getElementById('busy').hidden===true", timeout=400000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':1500,'height':950}, accept_downloads=True, )
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        html=open(SP+'aerial-editor.html').read()
        open(SP+'e2e/page.html','w').write('<!doctype html><html><head><meta charset=utf-8><style>'+ff+'html,body{margin:0}[hidden]{display:none!important}</style></head><body>'+html+'</body></html>')
        await pg.goto('http://127.0.0.1:8765/e2e/page.html')
        await pg.evaluate("Promise.all([document.fonts.load('400 40px \"Source Sans 3\"'),document.fonts.load('400 40px \"Open Sans\"'),document.fonts.load('700 40px \"Open Sans\"')])"); await pg.wait_for_timeout(800)
        if JOBS and JOBS[0].get('tune'): await pg.evaluate('t=>{window.__TUNE=t}', JOBS[0]['tune'])
        report={}
        for job in JOBS:
            await pg.click('#tabBtnPins')
            await pg.evaluate("o=>{window.__edgeOff=o}", job.get('edgeOff',{}))
            if job.get('snap'): await pg.evaluate("c=>{window.__snapCfg=c}", job['snap'])
            if job.get('nosnap'): await pg.evaluate("window.__noSnap=true")
            await pg.evaluate("k=>window.__bae.setPref('skyPlate',k)", job.get('skyPlate','C')); await pg.wait_for_timeout(300)
            if job.get('full'): await pg.evaluate("window.__bae.setPref('outMode','full')")
            await pg.evaluate("p=>{window.__portrait=!!p}", bool(job.get('portrait')))   # 29 Oct: booking asked for vertical drone photos
            await drag(pg, [job['map']]+job['photos']); await pg.wait_for_timeout(1500); await busy(pg)
            if job.get('agency'): await pg.select_option('#agSel', job['agency']); await pg.wait_for_timeout(300)
            th = pg.locator('.thumb'); n = await th.count(); base = n-len(job['photos'])
            for k,ph in enumerate(job['photos']):
                await th.nth(base+k).click(); await busy(pg); await pg.wait_for_timeout(400)
                if job.get('cams',{}).get(ph): await pg.evaluate("o=>window.__bae.setCam(o)", job['cams'][ph]); await pg.wait_for_timeout(300)
                if job.get('adj'): await pg.evaluate("o=>window.__bae.setAdj(o)", job['adj']); await pg.wait_for_timeout(300)
                nadir = bool(job.get('poly')) and (job.get('cams',{}).get(ph,{}).get('pitch',0) < -75 or bool(job.get('full')))   # 27 Oct: top-down jobs with no registered camera (drone XMP only) lost their boundary
                if nadir:
                    import math
                    ll=job['poly']; la0=math.radians(ll[0][0])
                    MY=111132.92-559.82*math.cos(2*la0)+1.175*math.cos(4*la0); MX=111412.84*math.cos(la0)-93.5*math.cos(3*la0)
                    xy=lambda q:((q[1]-ll[0][1])*MX,(q[0]-ll[0][0])*MY)
                    # drop near-collinear vertices (cadastre kinks)
                    while len(ll)>3:
                        drop=None
                        for i in range(len(ll)):
                            qa,qb,qc=xy(ll[i-1]),xy(ll[i]),xy(ll[(i+1)%len(ll)])
                            v1=(qb[0]-qa[0],qb[1]-qa[1]); v2=(qc[0]-qb[0],qc[1]-qb[1])
                            ang=abs(math.degrees(math.atan2(v1[0]*v2[1]-v1[1]*v2[0], v1[0]*v2[0]+v1[1]*v2[1])))
                            if ang<12: drop=i; break
                        if drop is None: break
                        ll=ll[:drop]+ll[drop+1:]
                    P=[xy(q) for q in ll]
                    fmt=lambda v: f"{v:.2f}m"
                    lens=[(fmt(math.dist(P[i],P[(i+1)%len(P)])) if math.dist(P[i],P[(i+1)%len(P)])>=1.5 else '') for i in range(len(P))]
                    # curved frontages come as runs of short chords: label the arc once (total length, on its middle chord); drop slivers < 3 m
                    E=[math.dist(P[i],P[(i+1)%len(P)]) for i in range(len(P))]
                    hd=lambda i: math.atan2(P[(i+1)%len(P)][1]-P[i][1], P[(i+1)%len(P)][0]-P[i][0])
                    turn=lambda i: abs((hd((i+1)%len(P))-hd(i)+math.pi)%(2*math.pi)-math.pi)
                    i=0; n=len(P)
                    while i<n:
                        j=i
                        while j+1<n and E[j]<8 and E[j+1]<8 and turn(j)<math.radians(40): j+=1
                        if j-i>=2:
                            for k in range(i,j+1): lens[k]=''
                            lens[(i+j)//2]=fmt(sum(E[i:j+1]))
                        i=j+1
                    lens=[('' if E[k]<max(3,0.04*sum(E)) else v) for k,v in enumerate(lens)]
                    area=round(abs(sum(P[i][0]*P[(i+1)%len(P)][1]-P[(i+1)%len(P)][0]*P[i][1] for i in range(len(P))))/2)
                    if job.get('lens') and len(job['lens'])==len(P): lens=[(fmt(v) if v else '') for v in job['lens']]   # side lengths from the title/strata plan beat the cadastre
                    if job.get('area') and job.get('areaSource'): area=int(job['area'])   # lot size from the title/strata plan — only with a stated source
                    elif job.get('area'):   # 29 Oct (Jason): a hand-typed area with no source put 809 m2 on 47 Attra (cadastre 812). Cadastre wins; flag it.
                        print(f"  AREA CHECK {job.get('slug')}: typed {job['area']} m2 has no areaSource - using cadastre {area} m2"); open('AREA_FLAGS.txt','a').write(f"{job.get('slug')}: typed {job['area']} vs cadastre {area}\n")
                    wt=700   # Jason (25 Oct): bold Open Sans lot size with a real ² (like his 195m² example)
                    rg = job.get('reg',{}).get(ph,[0,0])
                    ok = await pg.evaluate("([ll,a,b,l,ar,w,px])=>window.__bae.addLot(ll,a,b,l,ar,w,px)", [ll, rg[0], rg[1], lens, area, wt, job.get('pxpoly')]); print('  lot', ph, ok, area, lens)
                    await pg.wait_for_timeout(500); report[ph]=await pg.evaluate("window.__bae.photo()")
                    os.makedirs(OUT+job.get('slug','x'),exist_ok=True); fn=OUT+job.get('slug','x')+'/'+os.path.basename(ph).rsplit('.',1)[0]+'.jpg'; await export(pg, job.get('slug','x')+'/'+os.path.basename(ph).rsplit('.',1)[0]+'.jpg')
                    if ok and ok.get('crop'): report[ph]['cropbox']=ok['crop']
                    if ok and ok.get('crop'):
                        from PIL import Image
                        im=Image.open(fn)
                        if abs(im.width/im.height-1.5)<0.01: continue   # editor already exported the 3:2 lot crop
                        kx=im.width/ok['w']; cx,cy,cw,ch=[v*kx for v in ok['crop']]
                        im.crop((round(cx),round(cy),round(cx+cw),round(cy+ch))).resize((3000,2000),Image.LANCZOS).save(fn,quality=93)
                        if job.get('portrait'):
                            im=Image.open(fn); w_,h_=im.size; c_=int(h_*0.8); x_=(w_-c_)//2; im.crop((x_,0,x_+c_,h_)).resize((1800,2250),Image.LANCZOS).save(fn,quality=93)
                    continue
                if job.get('noFinish'): await pg.evaluate("window.__bae.setFinish(false)"); await pg.wait_for_timeout(300)   # twilight: keep the drone's own colour and dusk mood
                if job.get('noSky'): await pg.evaluate("window.__bae.setSky(false)"); await pg.wait_for_timeout(300); await busy(pg)   # twilight/sunset shoots keep their real sky
                st = job.get('steps',{}).get(ph,{})
                if 'house' in st:
                    await pg.click('text=Click the house'); await clickImg(pg,*st['house'])
                    if 'lm' in st: await pg.select_option('#lmSel', st['lm'][0]); await pg.click('#lmGo'); await clickImg(pg,*st['lm'][1])
                elif not job.get('plain') and await pg.locator('#plHouse').count(): await pg.click('#plHouse'); await pg.wait_for_timeout(300)
                if 'housepin' in st:   # 29 Oct: move only the house pin (e.g. onto an apartment roof) without re-aiming the camera
                    await pg.evaluate(f"window.__bae.setHouse({st['housepin'][0]},{st['housepin'][1]})"); await pg.wait_for_timeout(200)
                if job.get('plain'): pass
                elif 'ticks' in st:
                    for t in st['ticks']:
                        import re as _r2   # exact name match first ("Lake Goollelal" must not hit "Lake Goollelal Boardwalk")
                        ex = pg.locator('.place').filter(has=pg.locator('.t', has_text=_r2.compile('^\\s*'+_r2.escape(t)+'\\s*$')))
                        await (ex.first if await ex.count() else pg.locator('.place', has_text=t).first).click(); await pg.wait_for_timeout(250)
                else:  # add places one at a time (landmarks first); keep each only if it doesn't clash; stop at 5
                    names = await pg.evaluate("""()=>[...document.querySelectorAll('.place:not(.off)')].map(b=>[b.querySelector('.t').textContent,b.querySelector('small').textContent+' · '+((b.querySelector('.d')||{}).textContent||'')])""")
                    if os.environ.get('DBG'): print('   NAMES', names)
                    PRI=['train','shopping','regional shopping','school','library','aquatic','sport','golf','hospital','regional park','lake','beach','park','reserve','transport','community','childcare','playground']
                    rank=lambda c: PRI.index(c) if c in PRI else 99
                    cands=sorted([(rank(cat.split('·')[0].strip()), i, nm, cat.split('·')[0].strip()) for i,(nm,cat) in enumerate(names)])
                    import re as _re   # never auto-pick childcare/kindy/driving/dance schools (Jason's amenity rules)
                    cands=[c for c in cands if not _re.search(r'child ?care|early learning|kindergarten|kindy|daycare|driving school|dance', c[2], _re.I) and c[3]!='childcare']
                    # 26 Oct: no far-off filler. Small parks/reserves/playgrounds only within 1.5 km; anything else beyond 6 km only if it is a big landmark.
                    def _km(cat):
                        m=_re.search(r'([\d.]+)\s*(km|m)', cat.split('·')[-1])
                        return None if not m else (float(m.group(1)) if m.group(2)=='km' else float(m.group(1))/1000)
                    _cat={nm:cat for nm,cat in names}
                    BIG=('train','regional shopping','hospital','beach','regional park','golf','lake')
                    SKIP=[x.lower() for x in job.get('skip',[])]   # 28 Oct: agent-excluded categories or names (e.g. Jenny: no library)
                    cands=[c for c in cands if not any(x==c[3].lower() or x in c[2].lower() for x in SKIP)]
                    MUST=[m.lower() for m in job.get('must',[])]   # places the agent asked for (e.g. the CBD) skip the distance rules
                    cands=[c for c in cands if any(m in c[2].lower() for m in MUST) or not ((_km(_cat[c[2]]) or 0)>1.5 and c[3] in ('park','reserve','playground')) and not ((_km(_cat[c[2]]) or 0)>6 and c[3] not in BIG)]
                    cands=sorted(cands, key=lambda c:(0 if any(m in c[2].lower() for m in MUST) else 1, c[0], c[1]))
                    cands=[(-1 if any(m in c[2].lower() for m in MUST) else c[0],)+tuple(c[1:]) for c in cands]
                    seen={}; kept=0; TARGET=int(job.get('perPhoto',3))   # 28 Oct (Jason): every location photo carries 3 pins
                    _all=[(rank(cat.split('·')[0].strip()), i, nm, cat.split('·')[0].strip()) for i,(nm,cat) in enumerate(names)]
                    _all=[c for c in _all if not _re.search(r'child ?care|early learning|kindergarten|kindy|daycare|driving school|dance', c[2], _re.I) and c[3]!='childcare' and not any(x==c[3].lower() or x in c[2].lower() for x in SKIP)]
                    _extra=[(c[0]+100,)+tuple(c[1:]) for c in sorted(_all) if c[2] not in {d[2] for d in cands}]   # fallback pool if the strict list can't reach 3
                    for r_,i,nm,c in cands+_extra:
                        if kept>=TARGET: break
                        if r_==99 or r_==199 or (0<=r_<100 and seen.get(c,0)>=2): continue
                        await pg.locator('.place', has_text=nm).first.click(); await pg.wait_for_timeout(250)
                        ph_ = await pg.evaluate("window.__bae.photo()")
                        if any(q['clash'] for q in ph_['pins'] if not q['house']) or any(q['clash'] for q in ph_['pins'] if q['house']):
                            await pg.locator('.place', has_text=nm).first.click(); await pg.wait_for_timeout(150)
                            await pg.evaluate("window.__bae.retidy()"); await pg.wait_for_timeout(150)
                        elif not any(q['name']==nm for q in ph_['pins']):   # 29 Oct: ticked but no pin drawn (e.g. Perth Station) - untick, don't count it
                            await pg.locator('.place', has_text=nm).first.click(); await pg.wait_for_timeout(150)
                        else:
                            kept+=1; seen[c]=seen.get(c,0)+1
                        if os.environ.get('DBG'): print('   try',nm,[(q['name'][:12],q['side'],q['clash']) for q in ph_['pins']])
                    # final pass: drop any place whose label still clashes (editors never overlap or contort labels)
                    for _ in range(6):
                        ph_ = await pg.evaluate("window.__bae.photo()")
                        bad=[q['name'] for q in ph_['pins'] if q['clash'] and not q['house']]
                        if not bad: break
                        await pg.locator('.place', has_text=bad[-1]).first.click(); await pg.wait_for_timeout(150); kept-=1
                        await pg.evaluate("window.__bae.retidy()"); await pg.wait_for_timeout(150)
                    if kept < TARGET:   # 29 Oct: greedy order can paint itself into a corner; try other 3-place combinations before giving up
                        import itertools as _it, re as _r3
                        async def _tog(nm):
                            ex = pg.locator('.place').filter(has=pg.locator('.t', has_text=_r3.compile('^\\s*'+_r3.escape(nm)+'\\s*$')))
                            await (ex.first if await ex.count() else pg.locator('.place', has_text=nm).first).click(); await pg.wait_for_timeout(120)
                        ph_ = await pg.evaluate("window.__bae.photo()"); cur=[q['name'] for q in ph_['pins'] if not q['house']]
                        pool=[]
                        for r_,i,nm,c in cands+_extra:
                            if r_ in (99,199) or nm in pool: continue
                            pool.append(nm)
                        pool=pool[:10]; done=False; tries=0
                        if len(pool) >= TARGET:
                            for nm in cur: await _tog(nm)
                            for combo in _it.combinations(pool, TARGET):
                                if tries > 120: break
                                tries+=1
                                for nm in combo: await _tog(nm)
                                await pg.evaluate("window.__bae.retidy()"); await pg.wait_for_timeout(150)
                                ph_ = await pg.evaluate("window.__bae.photo()")
                                if len([q for q in ph_['pins'] if not q['house']])==TARGET and not any(q['clash'] for q in ph_['pins']):
                                    done=True; kept=TARGET; print('  combo', combo); break
                                for nm in combo: await _tog(nm)
                            if not done:   # put the greedy result back
                                for nm in cur: await _tog(nm)
                                await pg.evaluate("window.__bae.retidy()"); await pg.wait_for_timeout(150)
                    print('  kept', kept)
                await pg.wait_for_timeout(300)
                if False and job.get('poly'):
                    rg = job.get('reg',{}).get(ph,[0,0])
                    ok = await pg.evaluate("([ll,a,b])=>window.__bae.addPolyLL(ll,a,b)", [job['poly'], rg[0], rg[1]]); print('  boundary', ph, ok)
                    await pg.wait_for_timeout(500)
                stt = await pg.evaluate("window.__bae.photo()")
                report[ph]=stt
                pass
                os.makedirs(OUT+job.get('slug','x'),exist_ok=True); await export(pg, job.get('slug','x')+'/'+os.path.basename(ph).rsplit('.',1)[0]+'.jpg')
        try:
            if os.environ.get("DBG"): print("SKY", await pg.evaluate("JSON.stringify(window.__ltDbg||[])"))
            pj = await pg.evaluate("window.__bae.project()"); s_=JOBS[0]['slug'] if JOBS else 'x'; os.makedirs(OUT+s_,exist_ok=True); open(OUT+s_+'/'+s_+'.baker.json','w').write(pj)
        except Exception as e: print('project save failed', e)
        json.dump(report, open(OUT+'report.json','w')); json.dump(report, open(OUT+'report_'+(JOBS[0]['slug'] if JOBS else 'x')+'.json','w'))
        for k,v in report.items(): print(k, v['cam'] and {kk:round(vv,1) for kk,vv in v['cam'].items() if isinstance(vv,(int,float))}, [(q['name'],q['ex'],q['ey'],q['side']) for q in v['pins']])
        print('errors', errs)
        await ctx.close(); await b.close()
asyncio.run(main()); srv.terminate()
