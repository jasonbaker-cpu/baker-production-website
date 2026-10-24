"""DJI DNG -> corrected JPG: demosaic (camera WB), DNG OpcodeList3 GainMap (vignette) + WarpRectilinear (lens), gentle tone curve,
keeps the drone XMP/EXIF by copying the DNG's XMP packet into the JPG."""
import sys, struct, numpy as np, rawpy, tifffile, cv2, re
from PIL import Image
def opcodes(path):
    t=tifffile.TiffFile(path); ops=[]
    for pg in [t.pages[0]]+list(t.pages[0].pages or []):
        tg=pg.tags.get(51022)
        if not tg: continue
        b=bytes(tg.value); n=struct.unpack('>I',b[:4])[0]; off=4
        for _ in range(n):
            oid,ver,flags,sz=struct.unpack('>IIII',b[off:off+16]); d=b[off+16:off+16+sz]; off+=16+sz
            if oid==9:
                top,left,bot,right,plane,planes,rp,cp,mpv,mph=struct.unpack('>10I',d[:40])
                sv,sh,ov,oh=struct.unpack('>4d',d[40:72]); mplanes=struct.unpack('>I',d[72:76])[0]
                g=np.frombuffer(d[76:76+4*mpv*mph*mplanes],dtype='>f4').reshape(mpv,mph,mplanes).astype(np.float32)
                ops.append(('gain',dict(rect=(top,left,bot,right),sv=sv,sh=sh,ov=ov,oh=oh,g=g)))
            elif oid==1:
                planes=struct.unpack('>I',d[:4])[0]; v=struct.unpack('>'+'d'*(6*planes+2),d[4:4+8*(6*planes+2)])
                ops.append(('warp',dict(planes=planes,coef=[v[6*i:6*i+6] for i in range(planes)],c=v[-2:])))
    return ops
def convert(src,dst,width=None):
    r=rawpy.imread(src)
    lin=r.postprocess(use_camera_wb=True,no_auto_bright=True,output_bps=16,gamma=(1,1),highlight_mode=rawpy.HighlightMode.Blend,output_color=rawpy.ColorSpace.sRGB).astype(np.float32)/65535
    H,W=lin.shape[:2]
    for kind,o in opcodes(src):
        if kind=='gain':
            g=o['g']; mpv,mph=g.shape[:2]
            ys=(np.arange(H)/H-o['ov'])/o['sv']; xs=(np.arange(W)/W-o['oh'])/o['sh']
            gm=cv2.resize(g,(W,H),interpolation=cv2.INTER_LINEAR) if g.shape[2]>1 else None
            # resize assumes the map spans the frame (origin 0, spacing 1/(n-1)) which is DJI's layout
            lin=lin*gm[:,:,:3]
        else:
            cx,cy=o['c']; X,Y=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
            ccx,ccy=cx*(W-1),cy*(H-1); m=max(np.hypot(ccx,ccy),np.hypot(W-1-ccx,ccy),np.hypot(ccx,H-1-ccy),np.hypot(W-1-ccx,H-1-ccy))
            out=np.empty_like(lin)
            for p in range(3):
                k0,k1,k2,k3,t0,t1=o['coef'][min(p,o['planes']-1)]
                dx=(X-ccx)/m; dy=(Y-ccy)/m; r2=dx*dx+dy*dy
                f=k0+k1*r2+k2*r2*r2+k3*r2**3
                sx=ccx+m*(dx*f+2*t0*dx*dy+t1*(r2+2*dx*dx)); sy=ccy+m*(dy*f+2*t1*dx*dy+t0*(r2+2*dy*dy))
                out[:,:,p]=cv2.remap(lin[:,:,p],sx.astype(np.float32),sy.astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
            lin=out
    # exposure to a mid-grey target, then filmic-ish curve + sRGB gamma
    Y=0.2126*lin[...,0]+0.7152*lin[...,1]+0.0722*lin[...,2]; med=np.median(Y[Y.shape[0]//3:])
    lin=lin*(0.18/max(med,1e-4))
    x=lin; tm=x*(1+x/4.0)/(1+x)   # Reinhard with white point 2
    srgb=np.where(tm<=0.0031308,12.92*tm,1.055*np.power(np.clip(tm,0,None),1/2.4)-0.055)
    out=(np.clip(srgb,0,1)*255+0.5).astype(np.uint8)
    im=Image.fromarray(out)
    if width: im=im.resize((width,round(width*im.height/im.width)),Image.LANCZOS)
    xmp=re.search(rb'<x:xmpmeta.*?</x:xmpmeta>',open(src,'rb').read(),re.S)
    exif=Image.open(src).getexif() if False else None
    im.save(dst,quality=95,xmp=xmp.group(0) if xmp else None)
if __name__=='__main__':
    for s in sys.argv[1:]: convert(s,s.rsplit('.',1)[0]+'.jpg'); print('ok',s)
