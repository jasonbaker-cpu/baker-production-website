"""Give a non-drone image (satellite / rendered map) a DJI-style camera so the aerial editor can place pins on it.
usage: python3 tagcam.py in.jpg cam.json out.jpg"""
import sys, json
from PIL import Image
src, camf, out = sys.argv[1:4]; c = json.load(open(camf)); im = Image.open(src).convert('RGB')
ex = Image.Exif(); ex.get_ifd(0x8769)[41989] = 24
xmp = f'''<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""
 xmlns:drone-dji="http://www.dji.com/drone-dji/1.0/" xmlns:baker="http://bakerproduction.com/ns/1.0/"
 drone-dji:GpsLatitude="{c['lat']:.9f}" drone-dji:GpsLongitude="{c['lng']:.9f}" drone-dji:RelativeAltitude="+{c['h']:.3f}"
 drone-dji:GimbalYawDegree="{c['yaw']:+.3f}" drone-dji:FlightYawDegree="{c['yaw']:+.3f}" drone-dji:GimbalPitchDegree="{c['pitch']:+.3f}"
 drone-dji:GimbalRollDegree="{c.get('roll',0):+.3f}" baker:Zoom="{c['f35']/24:.6f}" baker:Virtual="1"/></rdf:RDF></x:xmpmeta>'''
im.save(out, quality=95, exif=ex, xmp=xmp.encode())
print('tagged', out)
