import json, math, sys, numpy as np, cv2
from nad import cam as camOf
D=math.pi/180
class Sat:
    def __init__(s, key):
        m=json.load(open(f'sat/{key}.json')); s.z=m['z']; s.x0=m['x0']; s.y0=m['y0']
        im=cv2.imread(f'sat/{key}.jpg', cv2.IMREAD_GRAYSCALE).astype(np.float32); s.img=im; s.n=2**s.z
    def pix(s, lat, lng):
        x=(lng+180)/360*s.n; la=lat*D; y=(1-np.log(np.tan(la)+1/np.cos(la))/math.pi)/2*s.n
        return (x-s.x0)*256, (y-s.y0)*256
def rays(W,H,c,gw):
    # pixel grid in original coords, sampled on gw x gh
    gh=int(round(gw*H/W)); xs=(np.arange(gw)+.5)*W/gw; ys=(np.arange(gh)+.5)*H/gh
    X,Y=np.meshgrid(xs,ys); return X,Y
def ground(c,W,H,X,Y):
    yw=c['yaw']*D; pt=c['pitch']*D; rl=c.get('roll',0)*D
    f=np.array([math.sin(yw)*math.cos(pt), math.cos(yw)*math.cos(pt), math.sin(pt)]); r=np.array([math.cos(yw),-math.sin(yw),0.])
    u=np.cross(r,f)
    fp=c['f35']*math.hypot(W,H)/43.27
    dx=X-W/2; dy=Y-H/2
    if rl: cr,sr=math.cos(-rl),math.sin(-rl); dx,dy=dx*cr-dy*sr, dx*sr+dy*cr
    xc=dx/fp; yc=-dy/fp
    v=r[:,None,None]*xc+u[:,None,None]*yc+f[:,None,None]
    vz=v[2]; ok=vz<-1e-3; t=np.where(ok,-c['h']/np.where(ok,vz,-1),0)
    ex=v[0]*t; ny=v[1]*t; dist=np.hypot(ex,ny)
    lat=c['lat']+ny/111320; lng=c['lng']+ex/(111320*math.cos(c['lat']*D))
    return lat,lng,dist,ok
def grad(im):
    gx=cv2.Sobel(im,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(im,cv2.CV_32F,0,1,ksize=3); return cv2.GaussianBlur(np.hypot(gx,gy),(0,0),1.0)
class Reg:
    def __init__(s, photo, sat, gw=640, maxd=450):
        s.c0=camOf(photo); s.c0['f35']=24
        im=cv2.imread(photo, cv2.IMREAD_GRAYSCALE); s.H,s.W=im.shape
        s.gw=gw; s.X,s.Y=rays(s.W,s.H,s.c0,gw); gh=s.X.shape[0]
        sm=cv2.resize(im,(gw,gh),interpolation=cv2.INTER_AREA).astype(np.float32)
        s.P=grad(sm); s.sat=sat; s.maxd=maxd
    def render(s,c):
        lat,lng,dist,ok=ground(c,s.W,s.H,s.X,s.Y); px,py=s.sat.pix(lat,lng)
        m=ok&(dist<s.maxd)&(px>2)&(py>2)&(px<s.sat.img.shape[1]-3)&(py<s.sat.img.shape[0]-3)
        R=cv2.remap(s.sat.img, px.astype(np.float32), py.astype(np.float32), cv2.INTER_LINEAR)
        return R,m,dist
    def score(s,c):
        R,m,dist=s.render(c)
        if m.sum()<2000: return -1
        G=grad(R); m2=cv2.erode(m.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)
        a=s.P[m2]; b=G[m2]; a=a-a.mean(); b=b-b.mean()
        return float((a*b).sum()/math.sqrt((a*a).sum()*(b*b).sum()+1e-9))
    def pose(s,p):
        c=dict(s.c0); c['yaw']+=p[0]; c['pitch']+=p[1]; c['roll']=c.get('roll',0)+p[2]; c['f35']=24*p[3]
        c['lat']+=p[5]/111320; c['lng']+=p[4]/(111320*math.cos(c['lat']*D)); c['h']+=p[6]; return c
    def solve(s, nadir=False):
        best=(-2,None)
        Y=np.arange(-8,8.01,0.5) if not nadir else np.arange(-16,16.01,1.0)
        Pt=np.arange(-4,4.01,0.5) if not nadir else [0]
        T=[(0,0)] if not nadir else [(x,y) for x in range(-6,7,2) for y in range(-6,7,2)]
        for a in Y:
            for b in Pt:
                for tx,ty in T:
                    p=[a,b,0,1,tx,ty,0]; sc=s.score(s.pose(p))
                    if sc>best[0]: best=(sc,p)
        p=list(best[1]); sc=best[0]
        steps=[0.25,0.25,0.25,0.01,1.0,1.0,2.0]
        for it in range(4):
            improved=True
            while improved:
                improved=False
                for i in range(7):
                    if nadir and i in (1,2): continue
                    for d in (-1,1):
                        q=list(p); q[i]+=d*steps[i]; v=s.score(s.pose(q))
                        if v>sc+1e-4: sc,p,improved=v,q,True
            steps=[x/2 for x in steps]
        return sc,p
if __name__=='__main__':
    sat=Sat(sys.argv[1]); r=Reg(sys.argv[2],sat)
    import time; t=time.time(); sc0=r.score(r.c0); sc,p=r.solve(); print('init',round(sc0,3),'best',round(sc,3),[round(x,3) for x in p], round(time.time()-t,1),'s')
