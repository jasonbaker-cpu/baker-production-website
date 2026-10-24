import json,sys,math,numpy as np,cv2
def run(slug, out, band_m=1.25):
    rep=json.load(open(f'e2e/report_{slug}.json')); raw=list(rep.keys())[0]; r=rep[raw]
    J={j['slug']:j for f in [x for x in __import__('glob').glob('e2e/run_*.json')] for j in json.load(open(f))}; ll=J[slug]['poly']
    la0=math.radians(ll[0][0]); MY=111132.92-559.82*math.cos(2*la0); MX=111412.84*math.cos(la0)
    per_m=sum(math.hypot((ll[i][0]-ll[i-1][0])*MY,(ll[i][1]-ll[i-1][1])*MX) for i in range(len(ll)))
    P=np.array(r['shapes'][0],float); n=len(P); W,H=r['w'],r['h']
    per_px=sum(np.hypot(*(P[i]-P[i-1])) for i in range(n)); ppm=per_px/per_m
    im=cv2.imread(raw); im=cv2.resize(im,(W,H),interpolation=cv2.INTER_AREA); ct=P.mean(0)
    rows=[]
    for i in range(n):
        a,b=P[i],P[(i+1)%n]; L=np.hypot(*(b-a)); u=(b-a)/L; nrm=np.array([-u[1],u[0]])
        mid=(a+b)/2
        if np.dot(mid+nrm-ct, mid+nrm-ct) < np.dot(mid-nrm-ct, mid-nrm-ct): nrm=-nrm   # nrm points outward
        ang=math.degrees(math.atan2(u[1],u[0])); segm=10.0*ppm; nseg=max(1,int(math.ceil(L/segm)))
        for k in range(nseg):
            t0,t1=k/nseg,(k+1)/nseg; ca=a+(b-a)*t0; cb=a+(b-a)*t1; c=(ca+cb)/2; half=int(np.hypot(*(cb-ca))/2*1.06); band=int(band_m*ppm)+5
            M=cv2.getRotationMatrix2D((float(c[0]),float(c[1])),ang,1.0); T=np.float32([[1,0,half-c[0]],[0,1,band-c[1]]])
            A=(np.vstack([T,[0,0,1]])@np.vstack([M,[0,0,1]]))[:2]
            s=cv2.warpAffine(im,A,(2*half,2*band),flags=cv2.INTER_LINEAR,borderValue=(40,40,40))
            po=A@np.array([*(c+nrm*ppm),1.0])
            if po[1] > band: s=s[::-1].copy()
            kk=1100/s.shape[1]; s=cv2.resize(s,(1100,int(s.shape[0]*kk))); cy=s.shape[0]//2
            for o in np.arange(-1.25,1.26,0.25):
                y=int(round(cy - o*ppm*kk)); col=(0,0,255) if abs(o)<1e-6 else ((0,255,255) if abs(o*4)%2==0 else (255,255,0))
                for x in range(60,1100,30): cv2.line(s,(x,y),(x+8,y),col,1)
                cv2.putText(s,f'{o:+.2f}',(2,y+4),cv2.FONT_HERSHEY_SIMPLEX,0.4,col,1)
            cv2.putText(s,f'{slug.replace('__nadir','')}  edge {i}  part {k+1}/{nseg}  ({L/ppm:.1f} m)   UP = OUTSIDE lot',(70,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(255,255,255),1)
            rows.append(s)

    # split into pages of max ~2400 px tall
    pages=[]; cur=[]; hh=0
    for x in rows:
        if hh+x.shape[0]>3000 and cur: pages.append(cur); cur=[]; hh=0
        cur.append(x); hh+=x.shape[0]+8
    if cur: pages.append(cur)
    for pi,pg in enumerate(pages):
        S=np.vstack([np.pad(x,((0,8),(0,0),(0,0)),constant_values=255) for x in pg]); cv2.imwrite(out.replace('.jpg',f'_{pi}.jpg'),S,[cv2.IMWRITE_JPEG_QUALITY,88])
    return n,round(ppm,1),len(pages)
if __name__=='__main__':
    for s in sys.argv[1:]: print(s, run(s, f'qc/er_{s}.jpg'))
