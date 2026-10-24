import sys,re,json,math,glob
from PIL import Image, ImageDraw, ImageFont
from pinchk import xmp, proj
D=math.pi/180
def cam(f):
    c=xmp(f); s=open(f,'rb').read(300000).decode('latin1')
    gy=float(re.search(r'GimbalYawDegree="([-+\d.]+)"',s).group(1)); fy=float(re.search(r'FlightYawDegree="([-+\d.]+)"',s).group(1))
    dd=abs(((gy-fy)%360+540)%360-180)
    c['yaw']= gy+(((fy-gy)%360+540)%360-180)/2 if dd<6 else fy
    return c
def mapP(slug):
    s=open(glob.glob(f'batch/{slug}/raw/*map.html')[0]).read()
    m=re.search(r'(?:const|var)\s+P\s*=\s*\{[^}]*"?lat"?\s*:\s*(-?[\d.]+)\s*,\s*"?lng"?\s*:\s*(-?[\d.]+)',s) or re.search(r'(?:const|var)\s+(?:PROP|P|H)\s*=\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)',s)
    return float(m.group(1)),float(m.group(2))
def nadir(slug,f,S=1320):
    im=Image.open(f).convert('RGB'); W,H=im.size; c=cam(f); c['pitch']=-89.9
    k=S/W; im=im.resize((S,int(H*k))); d=ImageDraw.Draw(im); fn=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
    for x in range(0,S,100): d.line([(x,0),(x,im.height)],fill=(255,255,0),width=1); d.text((x+2,2),str(x),fill='yellow',font=fn)
    for y in range(0,im.height,100): d.line([(0,y),(S,y)],fill=(255,255,0),width=1); d.text((2,y+2),str(y),fill='yellow',font=fn)
    la,lo=mapP(slug); q=proj(c,W,H,la,lo)
    if q: d.ellipse((q[0]*k-12,q[1]*k-12,q[0]*k+12,q[1]*k+12),outline='red',width=5)
    n=proj(c,W,H,c['lat']+0.0002,c['lng']); 
    if n: d.line([(S/2,im.height/2),(n[0]*k,n[1]*k)],fill='cyan',width=4)
    im.save(f'nv_{slug}.jpg',quality=80); return q
if __name__=='__main__':
    print(nadir(sys.argv[1],sys.argv[2]))
