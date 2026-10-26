"""Drone camera from the DJI XMP, and ground point -> photo pixel projection.
Restored 27 Oct 2026: nad.py / sreg.py import this but it was missing from the branch.
Camera dict keys match the editor's setCam(): lat, lng, h, yaw, pitch, roll, f35.
proj() is the exact inverse of sreg.ground()."""
import math, re
D = math.pi / 180

def _v(s, k, d=0.0):
    m = re.search(k + r'="([-+\d.]+)"', s)
    return float(m.group(1)) if m else d

def xmp(f):
    s = open(f, 'rb').read(400000).decode('latin1')
    return {'lat': _v(s, r'(?:drone-dji:)?GpsLatitude'), 'lng': _v(s, r'(?:drone-dji:)?GpsLongitude'),
            'h': _v(s, 'RelativeAltitude'), 'yaw': _v(s, 'GimbalYawDegree'), 'pitch': _v(s, 'GimbalPitchDegree'),
            'roll': _v(s, 'GimbalRollDegree'), 'f35': 24}

def proj(c, W, H, lat, lng, ground_h=0.0):
    """Pixel (x, y) in the original W x H photo of a ground point, or None if behind the camera."""
    yw, pt, rl = c['yaw'] * D, c['pitch'] * D, c.get('roll', 0) * D
    f = (math.sin(yw) * math.cos(pt), math.cos(yw) * math.cos(pt), math.sin(pt))
    r = (math.cos(yw), -math.sin(yw), 0.0)
    u = (r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0])
    ex = (lng - c['lng']) * 111320 * math.cos(c['lat'] * D)
    ny = (lat - c['lat']) * 111320
    v = (ex, ny, ground_h - c['h'])
    zf = sum(a * b for a, b in zip(v, f))
    if zf <= 1e-6: return None
    xc = sum(a * b for a, b in zip(v, r)) / zf; yc = sum(a * b for a, b in zip(v, u)) / zf
    fp = c.get('f35', 24) * math.hypot(W, H) / 43.27
    dx, dy = xc * fp, -yc * fp
    if rl:   # undo the roll rotation sreg.ground() applies (rotation by -roll)
        cr, sr = math.cos(rl), math.sin(rl); dx, dy = dx * cr - dy * sr, dx * sr + dy * cr
    return (W / 2 + dx, H / 2 + dy)
