# Premium aerial grade (Jason 5 Nov: "make it look premium every time").
# Input: a flat, unclipped development from the DNG (devsky.py). Output: rich, crisp, clean-white real-estate aerial.
import sys, re, numpy as np, cv2
from PIL import Image
def grade(src, dst):
    im = Image.open(src); xmp = im.info.get('xmp'); exif = im.info.get('exif')
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)/255; H, W = rgb.shape[:2]
    # horizon (strongest bright->dark step, 6-65% height)
    Y = 0.2126*rgb[...,0]+0.7152*rgb[...,1]+0.0722*rgb[...,2]
    prof = cv2.GaussianBlur(np.median(np.log(Y+1e-3),axis=1).reshape(-1,1),(1,41),0).ravel(); d=np.diff(prof)
    hz = int(np.argmin(d[int(H*.06):int(H*.45)]))+int(H*.06)
    rows = np.arange(H,dtype=np.float32)[:,None]
    land = np.clip((rows-hz)/(H*0.03),0,1)*np.ones((1,W),np.float32)
    blue = np.clip(((rgb[...,2]-rgb[...,0])-0.04)/0.10,0,1)          # sky + water
    sea = cv2.GaussianBlur(blue*land,(0,0),W/400)
    # 1) exposure: land midtones to a bright-but-not-hot level
    lm = np.median(Y[hz+int(H*.05):]); fe = float(np.clip(0.35/max(lm,1e-3),0.8,1.4)); ls = cv2.GaussianBlur(land,(0,0),W/200)[...,None]; rgb = rgb*(fe*ls + max(fe,1.0)*1.08*(1-ls))   # land to target; sky never darkened
    # dehaze: subtract airlight, stronger toward the horizon (distance haze)
    far = np.clip(1-(rows-hz)/(H*0.45),0,1)*land; air = np.percentile(rgb[hz:hz+int(H*.08)].reshape(-1,3),3,axis=0)
    kh = (0.55*far+0.15*land)[...,None]; rgb = (rgb-air*kh)/(1-kh*0.5)
    # 2) local contrast (clarity) on lightness, land only, via Lab CLAHE blended
    lab = cv2.cvtColor(np.clip(rgb,0,1), cv2.COLOR_RGB2LAB); L = lab[...,0]/100
    cl = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8,8)).apply((np.clip(L,0,1)*65535).astype(np.uint16)).astype(np.float32)/65535
    k = (0.7*land*(1-sea))
    L2 = L*(1-k)+cl*k
    # 3) tone curve: gentle S, then soft shoulder so whites roll off at ~0.95 (roofs keep detail)
    L2 = 0.48+(L2-0.48)*1.2
    L2 = np.where(L2>0.74, 0.74+(1-np.exp(-(L2-0.74)/0.2))*0.21, L2)
    L2 = np.where(L2<0.06, 0.06*np.power(np.clip(L2,0,None)/0.06,1.25), L2)
    lab[...,0] = np.clip(L2,0,1)*100
    # 4) colour: vibrance (more on dull colours), deeper sky/sea blue, touch of warmth on land
    C = np.hypot(lab[...,1],lab[...,2]); vib = 1+0.32*np.clip(1-C/45,0,1)+0.10
    vib = vib*(1+0.18*sea)+0.15*(1-land)*blue
    lab[...,1]*=vib; lab[...,2]*=vib
    lab[...,2] += 2.0*land*(1-sea) - 3.0*sea - 2.0*(1-land)*blue   # warm land, bluer water/sky
    out = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    # 5) sharpen (unsharp, land stronger)
    bl = cv2.GaussianBlur(out,(0,0),1.4); amt = (0.45*land+0.15)[...,None]
    out = np.clip(out+(out-bl)*amt,0,1)
    o = Image.fromarray((out*255+0.5).astype(np.uint8))
    kw = dict(quality=95)
    if exif: kw['exif'] = exif
    if xmp: kw['xmp'] = xmp if isinstance(xmp,bytes) else xmp.encode()
    o.save(dst, **kw); print(dst, 'hz', hz)
if __name__ == '__main__':
    for s in sys.argv[2:]: grade(s, sys.argv[1]+'/'+s.rsplit('/',1)[1])
