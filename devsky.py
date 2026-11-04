# develop a DJI DNG like dng2jpg.py, but pull the sky/haze back (graduated, luminance-masked) so a bright hazy sky keeps its clouds
import sys,re,numpy as np,cv2
sys.path.insert(0,'/tmp/claude-0/-home-claude/123b6bc4-adfa-5095-9578-7622ec75f692/scratchpad/pipe-git')
import dng2jpg, rawpy
from PIL import Image
def dev(src,dst,sky_ev=-1.3,dehaze=0.35):
    r=rawpy.imread(src)
    lin=r.postprocess(use_camera_wb=True,no_auto_bright=True,output_bps=16,gamma=(1,1),highlight_mode=rawpy.HighlightMode.Blend,output_color=rawpy.ColorSpace.sRGB).astype(np.float32)/65535
    H,W=lin.shape[:2]
    for kind,o in dng2jpg.opcodes(src):
        if kind=='gain':
            gm=cv2.resize(o['g'],(W,H),interpolation=cv2.INTER_LINEAR); lin=lin*gm[:,:,:3]
        else:
            cx,cy=o['c']; X,Y=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
            ccx,ccy=cx*(W-1),cy*(H-1); m=max(np.hypot(ccx,ccy),np.hypot(W-1-ccx,ccy),np.hypot(ccx,H-1-ccy),np.hypot(W-1-ccx,H-1-ccy))
            out=np.empty_like(lin)
            for p in range(3):
                k0,k1,k2,k3,t0,t1=o['coef'][min(p,o['planes']-1)]
                dx=(X-ccx)/m; dy=(Y-ccy)/m; r2=dx*dx+dy*dy; f=k0+k1*r2+k2*r2*r2+k3*r2**3
                sx=ccx+m*(dx*f+2*t0*dx*dy+t1*(r2+2*dx*dx)); sy=ccy+m*(dy*f+2*t1*dx*dy+t0*(r2+2*dy*dy))
                out[:,:,p]=cv2.remap(lin[:,:,p],sx.astype(np.float32),sy.astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
            lin=out
    Yl=0.2126*lin[...,0]+0.7152*lin[...,1]+0.0722*lin[...,2]; med=np.median(Yl[H//3:]); lin=lin*(0.18/max(med,1e-4)); Yl=Yl*(0.18/max(med,1e-4))
    # horizon row: strongest downward luminance drop in the column-median profile (upper 60% of frame)
    prof=cv2.GaussianBlur(np.median(np.log(Yl+1e-4),axis=1).reshape(-1,1),(1,41),0).ravel()
    d=np.diff(prof); hz=int(np.argmin(d[int(H*.08):int(H*.6)]))+int(H*.08)
    # sky mask: above the horizon (feathered), only bright pixels (so roofs/towers that poke up are kept)
    rows=np.arange(H,dtype=np.float32)[:,None]
    vert=np.clip((hz+H*0.02-rows)/(H*0.05),0,1)
    br=np.clip((np.log(Yl+1e-4)-np.log(0.35))/0.6,0,1)
    mask=cv2.GaussianBlur((vert*br).astype(np.float32),(0,0),W/300)
    # sea/haze band just below the horizon gets a lighter pull
    sea=np.clip(1-np.abs(rows-hz-H*0.04)/(H*0.06),0,1)*np.clip((np.log(Yl+1e-4)-np.log(0.25))/0.6,0,1)
    sea=cv2.GaussianBlur(sea.astype(np.float32),(0,0),W/300)
    g=np.power(2.0,sky_ev*mask+sky_ev*0.45*sea)[...,None]
    lin=lin*g
    # dehaze in the sky: subtract a little airlight and stretch so cloud edges show
    air=np.percentile(lin[:hz].reshape(-1,3),2,axis=0) if hz>10 else np.zeros(3)
    k=(dehaze*mask)[...,None]; lin=lin-(air*k); lin=lin/(1-k*0.25)
    # a touch more blue saturation in the sky only (natural, not punchy)
    Yn=(0.2126*lin[...,0]+0.7152*lin[...,1]+0.0722*lin[...,2])[...,None]; lin=Yn+(lin-Yn)*(1+0.25*mask[...,None])
    x=np.clip(lin,0,None); tm=x*(1+x/4.0)/(1+x)
    srgb=np.where(tm<=0.0031308,12.92*tm,1.055*np.power(tm,1/2.4)-0.055)
    im=Image.fromarray((np.clip(srgb,0,1)*255+0.5).astype(np.uint8))
    xmp=re.search(rb'<x:xmpmeta.*?</x:xmpmeta>',open(src,'rb').read(),re.S)
    im.save(dst,quality=95,xmp=xmp.group(0) if xmp else None); print(dst,'horizon',hz,H)
if __name__=='__main__':
    for s in sys.argv[2:]: dev(s,sys.argv[1]+'/'+s.rsplit('/',1)[1].rsplit('.',1)[0]+'.jpg')
