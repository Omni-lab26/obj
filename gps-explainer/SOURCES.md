# SOURCES

Every number and factual claim in the film, where it appears, and where it comes from.

| On screen | Value | Source |
|---|---|---|
| Satellite A range (S4) | 20,200 km | GPS satellites fly in medium Earth orbit at about 20,200 km — gps.gov, Space Segment: https://www.gps.gov/systems/gps/space/ |
| Speed of light (S4 caption and equation) | 299,792,458 m/s (exact) | BIPM, SI defining constants: https://www.bipm.org/measurement-units/si-defining-constants |
| Signal delay (S3) | 0.067 秒 | Derived: 20,200 km ÷ 299,792.458 km/s = 0.06738 s. tools/geometry.py |
| Delays of B, C (diagram only, not shown as text) | 0.0731 s, 0.0758 s | Derived from the satellite positions in tools/geometry.py (Earth radius 6,371 km, orbit radius 26,571 km) |
| Clock error (S8) | 0.000001 秒 = 1 µs | Chosen example value |
| Range error per 1 µs (S8) | 300 m | Derived: 299,792,458 m/s × 10⁻⁶ s = 299.8 m |
| Error triangle (S8, shape only, no number shown) | about 300–500 m below the phone | Computed at render time from the shifted circles (src/render.js, errorTriangle) |
| Satellites only send, receivers only listen; position computed on the phone (S2, S7, S9) | — | Penn State GEOG 862, Lesson 1 "The GPS Signal": https://www.e-education.psu.edu/geog862/book/export/html/1407 ; position computed on the device: MIT, https://engineering.mit.edu/?p=2863 |
| Satellites broadcast their time and position (S2) | — | Britannica, "How does GPS work?": https://www.britannica.com/story/how-does-gps-work |
| One distance = somewhere on a sphere (circle in 2D) (S4) | — | Britannica (same page) |
| Receiver compares send time with its own clock (S3); clock error makes all distances wrong by the same amount; four satellites solve x, y, z and the clock in 3D (S8) | 4 (3D), 3 (2D picture) | Scientific American, "How do GPS devices work?": https://www.scientificamerican.com/article/how-do-gps-devices-work/ |
| Map app circle = "you could be anywhere within the circle" (S9) | — | Google Maps Help, "Find & improve your location's accuracy": https://support.google.com/maps/answer/2839911 |
| Earth radius (diagram scale only, not shown as text) | 6,371 km | NASA Earth Fact Sheet, volumetric mean radius: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |

Removed for lack of an authoritative source: "GPS still works in airplane mode."
