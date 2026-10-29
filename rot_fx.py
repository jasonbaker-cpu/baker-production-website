"""Turn published top-downs so the street is at the bottom. usage: python3 rot_fx.py rot.json  ({fx_slug: degrees clockwise})
A 90/270 turn makes the frame portrait, which can't hold a long lot in a 3:2 landscape export, so the turned photo is
halved and padded left/right with a blurred mirror (the editor blurs everything outside the lot anyway). The camera
keeps its focal length in pixels, so f35 is rescaled to the new diagonal and the traced boundary shifts with the pad."""
import json, sys, math
import numpy as np, cv2
from PIL import Image
ROT = json.load(open(sys.argv[1])); R = {j['slug']: j for j in json.load(open('e2e/run_fx2.json'))}; out = []
TR = {90: Image.Transpose.ROTATE_270, 180: Image.Transpose.ROTATE_180, 270: Image.Transpose.ROTATE_90}
for fs, rot in ROT.items():
    j = dict(R[fs]); src = j['photos'][0]; im = Image.open(src); W, H = im.size
    f = {90: lambda x, y: [H-1-y, x], 180: lambda x, y: [W-1-x, H-1-y], 270: lambda x, y: [y, W-1-x]}[rot]
    px = [f(x, y) for x, y in j['pxpoly']]
    r = im.transpose(TR[rot]); rw, rh = r.size
    cam = dict(j['cams'][src]); cam['yaw'] = cam['yaw'] - rot
    fp = cam['f35'] * math.hypot(rw, rh) / 43.27
    if rh > rw:   # portrait after turning: halve and pad to 3:2
        k = 0.5; r = r.resize((int(rw*k), int(rh*k)), Image.LANCZOS); rw2, rh2 = r.size; fp *= k
        tw = int(rh2 * 2.2); pad = (tw - rw2) // 2
        a = np.array(r); big = cv2.copyMakeBorder(a, 0, 0, pad, tw - rw2 - pad, cv2.BORDER_REFLECT)
        blur = cv2.GaussianBlur(cv2.GaussianBlur(big, (0, 0), 40), (0, 0), 40); m = np.zeros(big.shape[:2], np.float32); m[:, pad:pad+rw2] = 1
        m = cv2.GaussianBlur(m, (0, 0), 60)[..., None]; big = (big*m + blur*(1-m)).astype(np.uint8)
        r = Image.fromarray(big); px = [[x*k + pad, y*k] for x, y in px]
    cam['f35'] = fp * 43.27 / math.hypot(*r.size)
    ex = im.getexif(); ex[274] = 1; n1 = src.rsplit('.', 1)[0] + f'_r{rot}.' + src.rsplit('.', 1)[1]
    r.save(n1, quality=95, exif=ex.tobytes(), xmp=im.info.get('xmp'))
    j.update(slug=fs + f'__r{rot}', photos=[n1], cams={n1: cam}, pxpoly=px); out.append(j)
json.dump(out, open('e2e/run_rot.json', 'w')); print([j['slug'] for j in out])
