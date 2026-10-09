# DECISIONS

One line per call made when the brief was open. Newest at the bottom.

- Topic: how a phone's GPS finds its position. Chosen because almost everyone believes the opposite of the truth (that satellites locate the phone) and the correct model fits in one picture.
- Audience: Japanese-speaking smartphone users who open a map app every day and assume "the satellite finds me." Film language: Japanese.
- Outcome: after watching, the viewer can say "GPS is one-way: satellites broadcast time; my phone turns each signal's delay into a distance, finds where the circles meet, and needs one extra satellite to fix its own clock."
- Length: 64.0 s = 96 beats at 90 BPM, so every beat, move and cue sits on the music grid.
- No ./brand, ./refs or ./screens exist. Created brand/tokens.json as the source of truth instead of inventing a look per scene; anchored type to an existing system (IBM Plex Sans JP + IBM Plex Mono, both OFL) and geometry to real values (gps.gov altitude, SI speed of light).
- Palette: warm paper ground #F3EFE6, ink #1C1A17, one accent #A8380F used only for the signal/time thread. All text pairs ≥ 4.5:1 (tools/contrast.py).
- Diagram is a true-scale 2D cross-section (km), not an illustration. The 2D simplification is disclosed on screen in the proof scene ("図は平面。実際は球で考える").
- In 2D the unknowns are x, y and the clock, so three satellites solve it; the turn says plainly that in 3D (x, y, z + clock) it takes four. This keeps the picture and the claim both correct.
- Satellite A is placed straight overhead so its range equals the gps.gov altitude exactly (20,200 km → 0.0674 s). B, C, D sit at 38°, 47°, 64° from zenith; their ranges and delays are computed by tools/geometry.py, not chosen.
- Signal wavefronts are drawn about 20× slower than light so the eye can follow them; the on-screen number shows the real delay (0.067 秒). No "slow motion" label: it would add a third text line for little gain.
- No voiceover: no licensed Japanese TTS voice is available offline in this environment, and a robotic voice would undercut the film. The narration is delivered as burned-in captions (also shipped as captions.srt). "Duck the bed under voice" therefore does not apply.
- Text rule as applied: captions carry the narration (≤ 2 lines); on-screen anchors are short labels on objects, at most two anchor lines at once, never the full caption.
- Caption pace: ≤ ~6.5 Japanese characters per second; tools/check_timing.mjs enforces it.
- Camera moves only between ideas; captions start after a move settles (enforced by tools/check_timing.mjs).
- Dropped claim: "GPS keeps working in airplane mode." The only sources found were forum posts and an outdated Apple quote, so it fails the source rule.
- Next step at the payoff uses a sourced UI fact instead: the circle around the location dot in Google Maps means "you could be anywhere within this circle" (Google Maps Help).
- No street map at street scale: the diagram is a vertical cross-section, where a top-down street grid would be wrong. A 300 m bracket gives the scale instead.
- Reduced-motion cut: same sequence and timing; every spatial move becomes a short cross-fade or a held state, wavefronts become a single fade-in.
