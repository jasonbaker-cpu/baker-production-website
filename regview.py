import sys, json, glob, cv2, numpy as np
sys.path.insert(0,'.')
from sreg import Sat, rays, ground
from nad import cam
slug=sys.argv[1]; fs=sys.argv[2:]; sat=Sat(slug); rows=[]
satc=cv2.imread(f'sat/{slug}.jpg')
for f in fs:
    c=cam(f); c['f35']=24; im=cv2.imread(f); H,W=im.shape[:2]; X,Y=rays(W,H,c,400)
    lat,lng,d,ok=ground(c,W,H,X,Y); px,py=sat.pix(lat,lng)
    R=cv2.remap(satc,px.astype(np.float32),py.astype(np.float32),cv2.INTER_LINEAR); R[~(ok&(d<600))]=0
    s=cv2.resize(im,(400,R.shape[0])); b=cv2.addWeighted(s,0.5,R,0.5,0)
    rows.append(np.hstack([s,R,b]))
cv2.imwrite(f'/root/scr/rv_{slug}.jpg',np.vstack(rows))
