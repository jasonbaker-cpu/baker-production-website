"""Object removal with LaMa (ONNX, opencv_zoo inpainting_lama_2025jan, 512x512). Mask white = remove.
usage: python3 lama.py in.jpg mask.png out.jpg [models/lama.onnx]
Inpaints a square crop around the mask (context ~2.2x), pastes back with a feathered edge."""
import sys, os, numpy as np
os.environ.setdefault('ORT_LOG_LEVEL', '3')
import onnxruntime as ort
from PIL import Image, ImageFilter
src, mk, out = sys.argv[1:4]; mp = sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(__file__), '..', 'models', 'lama.onnx')
so = ort.SessionOptions(); so.log_severity_level = 3; sess = ort.InferenceSession(mp, so)
im = Image.open(src).convert('RGB'); m = Image.open(mk).convert('L').resize(im.size).filter(ImageFilter.MaxFilter(9))
bb = m.getbbox(); cx, cy = (bb[0]+bb[2])/2, (bb[1]+bb[3])/2; side = int(max(bb[2]-bb[0], bb[3]-bb[1])*2.2)
side = min(side, im.width, im.height); x0 = int(min(max(cx-side/2, 0), im.width-side)); y0 = int(min(max(cy-side/2, 0), im.height-side))
ci, cm = im.crop((x0, y0, x0+side, y0+side)), m.crop((x0, y0, x0+side, y0+side))
a = np.asarray(ci.resize((512, 512), Image.LANCZOS), np.float32).transpose(2, 0, 1)[None]/255
b = (np.asarray(cm.resize((512, 512), Image.NEAREST), np.float32)[None, None] > 127).astype(np.float32)
r = sess.run(None, {'image': a, 'mask': b})[0][0].transpose(1, 2, 0)
if r.max() <= 1.5: r = r*255
res = Image.fromarray(np.clip(r, 0, 255).astype('uint8')).resize((side, side), Image.LANCZOS)
ci.paste(res, (0, 0), cm.filter(ImageFilter.GaussianBlur(3))); im.paste(ci, (x0, y0)); im.save(out, quality=95); print('ok', out)
