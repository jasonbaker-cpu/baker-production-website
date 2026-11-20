"""Assemble a satellite mosaic from 4 browser screenshots (768px quadrants of a 1536px z/N=6 mosaic).
usage: python3 satquad.py <slug> <z> <x0> <y0> <N> q00.jpg q10.jpg q01.jpg q11.jpg"""
import sys, json
from PIL import Image
slug, z, x0, y0, N = sys.argv[1], *map(int, sys.argv[2:6]); qs = sys.argv[6:10]
S = 256*N; h = S//2; out = Image.new('RGB', (S, S))
for f, (dx, dy) in zip(qs, [(0,0),(h,0),(0,h),(h,h)]):
    im = Image.open(f).convert('RGB'); assert im.size == (h, h), im.size; out.paste(im, (dx, dy))
out.save(f'sat/{slug}.jpg', quality=92); json.dump({'z': z, 'x0': x0, 'y0': y0, 'N': N}, open(f'sat/{slug}.json', 'w')); print(slug, 'ok')
