#!/usr/bin/env python3
"""True-scale geometry for the diagram (km, origin = Earth's centre, phone on top of the Earth).
Prints satellite positions, ranges, signal delays and the second intersection of circles A and B."""
import math, json, sys
R = 6371.0                 # Earth mean radius, km
H = 20200.0                # GPS altitude, km (gps.gov)
r = R + H
c = 299792.458             # km/s (SI defining constant)
P = (0.0, R)
def sat(deg):
    a = math.radians(deg)
    return (r * math.sin(a), r * math.cos(a))
def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])
def reflect(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx-ax, by-ay
    t = ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)
    fx, fy = ax + t*dx, ay + t*dy
    return (2*fx - px, 2*fy - py)
angles = {k: float(v) for k, v in (x.split('=') for x in sys.argv[1:])} or {"A": 0, "B": -38, "C": 47, "D": -64}
out = {"R": R, "H": H, "r": r, "c": c, "phone": P, "sats": {}}
for k, a in angles.items():
    s = sat(a); d = dist(s, P)
    elev = math.degrees(math.atan2(s[1]-P[1], abs(s[0]-P[0]))) if s[0] else 90.0
    out["sats"][k] = {"angle": a, "pos": [round(s[0], 1), round(s[1], 1)], "range_km": round(d, 1),
                      "delay_s": round(d / c, 5), "elevation_deg": round(elev, 1)}
m = reflect(P, sat(angles["A"]), sat(angles["B"]))
out["second_AB"] = [round(m[0], 1), round(m[1], 1)]
print(json.dumps(out, indent=1))
