import json, sys, os, time, math
from multiprocessing import Pool
from sreg import Sat, Reg

SATS={}
def work(a):
    slug,ph=a; k=slug
    if k not in SATS: SATS[k]=Sat(k)
    t=time.time()
    try:
        r=Reg(ph,SATS[k],gw=320); nad=r.c0['pitch']<-75
        sc0=r.score(r.c0); sc,p=r.solve(nadir=nad)
        r2=Reg(ph,SATS[k],gw=640)
        # refine at full res from coarse result
        best=(r2.score(r2.pose(p)),p); steps=[0.12,0.12,0.12,0.005,0.5,0.5,1.0]
        for it in range(3):
            imp=True
            while imp:
                imp=False
                for i in range(7):
                    for d in (-1,1):
                        q=list(best[1]); q[i]+=d*steps[i]; v=r2.score(r2.pose(q))
                        if v>best[0]+1e-4: best=(v,q); imp=True
            steps=[x/2 for x in steps]
        c=r2.pose(best[1]); c={k_:(float(v) if isinstance(v,(int,float)) else v) for k_,v in c.items()}
        return dict(slug=slug,ph=ph,sc0=sc0,sc=best[0],p=[float(x) for x in best[1]],cam=c,nadir=nad,t=time.time()-t)
    except Exception as e:
        return dict(slug=slug,ph=ph,err=str(e))
if __name__=='__main__':
    J=json.load(open(sys.argv[1])); out='reg_all.json'
    done=json.load(open(out)) if os.path.exists(out) else {}
    tasks=[(j['slug'],ph) for j in J if os.path.exists(f"sat/{j['slug']}.jpg") for ph in j['photos'] if ph not in done]
    
    with Pool(2) as pool:
        for r in pool.imap_unordered(work,tasks):
            done[r['ph']]=r; json.dump(done,open(out,'w'))
            print(r['slug'], r['ph'][-12:], 'ERR '+r['err'] if 'err' in r else f"{r['sc0']:.3f}->{r['sc']:.3f} {[round(x,2) for x in r['p']]} {r['t']:.0f}s", flush=True)
