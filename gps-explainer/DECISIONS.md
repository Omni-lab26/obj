# DECISIONS

One line per call made when the brief was open. Newest at the bottom.

- Topic: how a phone's GPS finds its position. Chosen because almost everyone believes the opposite of the truth (that satellites locate the phone) and the correct model fits in one picture.
- Audience: Japanese-speaking smartphone users who open a map app every day and assume "the satellite finds me." Film language: Japanese.
- Outcome: after watching, the viewer can say "GPS is one-way: satellites broadcast time; my phone turns each signal's delay into a distance, finds where the circles meet, and needs one extra satellite to fix its own clock."
- Length: 83.3 s = 100 beats at 72 BPM, so every beat, move and cue sits on the music grid. (First cut was 64 s at 90 BPM; slowed after the accessibility review, see below.)
- No ./brand, ./refs or ./screens exist. Created brand/tokens.json as the source of truth instead of inventing a look per scene; anchored type to an existing system (IBM Plex Sans JP + IBM Plex Mono, both OFL) and geometry to real values (gps.gov altitude, SI speed of light).
- Palette: warm paper ground #F3EFE6, ink #1C1A17, one accent #A8380F used only for the signal/time thread. All text pairs ≥ 4.5:1 (tools/contrast.py).
- Diagram is a true-scale 2D cross-section (km), not an illustration. The 2D simplification is disclosed on screen in the proof scene ("図は平面。実際は球で考える").
- In 2D the unknowns are x, y and the clock, so three satellites solve it; the turn says plainly that in 3D (x, y, z + clock) it takes four. This keeps the picture and the claim both correct.
- Satellite A is placed straight overhead so its range equals the gps.gov altitude exactly (20,200 km → 0.0674 s). B, C, D sit at 38°, 47°, 64° from zenith; their ranges and delays are computed by tools/geometry.py, not chosen.
- Signal wavefronts are drawn about 20× slower than light so the eye can follow them; the on-screen number shows the real delay (0.067 秒). No "slow motion" label: it would add a third text line for little gain.
- No voiceover: no licensed Japanese TTS voice is available offline in this environment, and a robotic voice would undercut the film. The narration is delivered as burned-in captions (also shipped as captions.srt). "Duck the bed under voice" therefore does not apply.
- Text rule as applied: captions carry the narration (≤ 2 lines); on-screen anchors are short labels on objects, at most two anchor lines at once, never the full caption.
- Caption pace: ≤ 4.0 Japanese characters per second (Netflix Japanese timed-text guideline), counted after the fade-in; ≤ 13 characters per SRT line. tools/check_timing.mjs and tools/srt.mjs enforce it.
- Camera moves only between ideas; captions start after a move settles (enforced by tools/check_timing.mjs).
- Dropped claim: "GPS keeps working in airplane mode." The only sources found were forum posts and an outdated Apple quote, so it fails the source rule.
- Next step at the payoff uses a sourced UI fact instead: the circle around the location dot in Google Maps means "you could be anywhere within this circle" (Google Maps Help).
- No street map at street scale: the diagram is a vertical cross-section, where a top-down street grid would be wrong. A 300 m bracket gives the scale instead.
- Reduced-motion cut: same sequence and timing; every spatial move becomes a short cross-fade or a held state, wavefronts become a single fade-in.
- Design review (Meaghan Choi's three questions, run by a review subagent) changed the film:
  - The turn now says 「平面なら3つ／立体なら4つ」. The old line 「位置3つ＋時計のずれ1つ＝衛星4つ」 contradicted the picture, where three circles also absorb the clock in 2D.
  - S3 sets up the phone's own clock (「送信時刻と自分の時計を比べて」), so the turn breaks something the viewer already knows about.
  - Captions no longer announce a result before the picture shows it: 「そこが現在地」 and 「衛星は答えを知らない」 were cut, and the S5 caption moved to the markers.
  - Labels that only repeated the caption were cut (見られている？, 時刻と位置を発信, the clock label, 受信だけ). Satellite letters were dropped: nothing refers to them.
  - The equation stays whole on screen (two stacked lines) with the radius drawn until b38. Tall formats use a camera framing with headroom for it.
  - The false-belief beam is grey ink, never the accent, which is reserved for real signals.
  - The no-send arrow tilts 25° so it is not read as blocking satellite A's signal.
  - At street scale the circles return one at a time with a tick each, the Earth outline drops so circle A is not mistaken for the ground, and the error triangle gets a light accent fill under 「1点で交わらない」.
  - The film opens and closes on the map app's location dot with its accuracy circle. The payoff dims everything else to 15% and draws the dot circle in screen space, so the 5,700 km true-scale circle never reads as a second globe.
- Accessibility review (subagent) changed the film:
  - Reading speed was up to 6.5 characters per second. The tempo went from 90 to 72 BPM (64 s → 83 s, inside the 30–90 s brief), the end gained 4 beats, and every caption was tightened to ≤ 4.0 characters per second.
  - The label 「平面なら3つ／立体なら4つ」 was cut: the caption already says it, and both together read at about 10 characters per second.
  - 16:9 type went up (caption 72 px, labels 60–68 px ≈ 13–15 px when the frame is 390 px wide), and the diagram area shrank to keep two-line captions clear.
  - captions.srt is regenerated on every build, with ≤ 13 characters per line.
  - Reduced-motion ending: the dimming now starts after the last ring reaches the phone, so all four signals are visible in both cuts.
  - 「1点で交わらない」 moved below the error triangle so its halo no longer hides the triangle's edge.
