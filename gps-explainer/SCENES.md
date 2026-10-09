# SCENES

The film answers one question, in the viewer's own words: **「スマホの青い点って、衛星が私を見つけてるの？」**
One sentence idea: **スマホは衛星に何も送らない。届いた時刻の「遅れ」を距離に変え、円が交わる一点を自分で計算している。**

Times: beats at 72 BPM (1 beat = 0.833 s), 100 beats = 83.3 s. Source of truth is `src/timeline.js`; this file is the human-readable spec.

| Part | Beats | Seconds | Share |
|---|---|---|---|
| Question | 0–10 | 0.0–8.3 | 10% |
| Model | 10–38 | 8.3–31.7 | 28% |
| Proof | 38–68 | 31.7–56.7 | 30% |
| Turn | 68–85.5 | 56.7–71.3 | 17.5% |
| Payoff | 85.5–100 | 71.3–83.3 | 14.5% |

---

## S1 · Question · b0–10 (0.0–8.3 s)
- **Teaches**: the belief most people hold — a satellite watches you.
- **Frame**: 1) satellite A straight above; 2) a dashed beam from A onto the phone; 3) the Earth's curve; 4) the phone point labelled あなた.
- **Motion**: opens on a map-app location dot with its accuracy circle (b0) → the circle collapses into the phone point as the Earth settles in (b1–2) → A drops in (b1.5–3) → a grey dashed beam extends down and locks on the phone (b3–5) → hold.
- **Words**: on screen「あなた」 / caption「地図の現在地。衛星に見られている？」
- **Sound**: bed opens on a soft bass; a gentle two-blip *lock* when the beam lands (b5).
- **Check**: the viewer recognises their own assumption.

## S2 · Model · b10–18 (8.3–15.0 s)
- **Teaches**: it is the other way round — the satellite only broadcasts its time and position, to everyone.
- **Frame**: 1) A; 2) a wavefront ring expanding from A; 3) the phone the ring passes.
- **Motion**: the beam retracts into A (b10–11.5, the belief is withdrawn) → a ring leaves A (b12) and passes the phone (b14) → a second ring (b16 → b18).
- **Words**: caption「実は逆。衛星は時刻と位置を流すだけ。」
- **Sound**: soft *ping* on each emission, a tiny *tick* when a ring reaches the phone.
- **Check**: "The satellite talks; my phone only listens."

## S3 · Model · b18–26 (15.0–21.7 s)
- **Teaches**: the phone measures how late the signal arrives.
- **Frame**: 1) the straight path from A to the phone, drawn in the accent colour; 2) its label.
- **Motion**: at the second ring's arrival (b18) the path draws from A down to the phone (b18–19.5), end ticks settle.
- **Words**: on screen「遅れ 0.067秒」 / caption「届いた送信時刻を自分の時計と比べる。」 (the label carries the result, the caption the action)
- **Sound**: arrival *tick* (b18), a two-tone *measure* (b19.5).
- **Check**: "My phone measures the delay."

## S4 · Model · b26–38 (21.7–31.7 s)
- **Teaches**: delay × speed of light = distance — and one distance only puts you somewhere on a circle.
- **Frame**: 1) the measured line; 2) its label turning into the distance; 3) the circle it sweeps; 4) the whole Earth for scale.
- **Motion**: camera pulls back to true scale (b26–27.5, pinned on the phone) → the equation builds at top left:「0.067秒 × 光の速さ」(b29), then「＝ 20,200 km」beneath it (b30.5); both hold to b38 → the measured line becomes the radius and sweeps one full turn around A (b31.5–33.5), leaving circle A; the radius stays drawn until b38.
- **Words**: on screen「0.067秒 × 光の速さ」「＝ 20,200 km」 / captions「遅れ×光の速さ＝衛星までの距離。」「分かるのは、円のどこかまで。」
- **Sound**: the **motif** (three rising bell notes) as the circle closes (b33.5). It returns on every key idea.
- **Check**: "One satellite gives one distance → a circle of possible places."

## S5 · Proof · b38–48 (31.7–40.0 s)
- **Teaches**: a second satellite's circle cuts the candidates to two points.
- **Frame**: 1) satellite B and its ring; 2) circle B; 3) the two crossing points; 4) footnote on the 2D simplification.
- **Motion**: camera widens to include B and the far crossing (b38–39.5) → B drops in (b39.5) → its ring grows until it touches the phone and freezes as circle B (b40.5 → b42.7) → two candidate markers (b43).
- **Words**: on screen「?」×2, then「※図は平面。実際は球で考える」(b45) / caption「2つ目の衛星の円を重ねると、候補は2点。」(b41–48; reading reaches 候補は2点 as the markers appear at b43)
- **Sound**: emit *ping*, arrival *tick*, two soft *marker* pops.
- **Check**: "Two circles leave two candidates."

## S6 · Proof · b48–58 (40.0–48.3 s)
- **Teaches**: the third circle leaves exactly one point — that is where you are.
- **Frame**: 1) satellite C and circle C; 2) the far candidate crossed out; 3) the phone point locked.
- **Motion**: C drops in (b48.5) → ring → circle C (b50 → b52.2) → far candidate gets an × and fades (b53) → the phone point locks with an accent ring (b54).
- **Words**: on screen「現在地」(b54, the only place it is said) / caption「3つ目の円で、1点に決まる。」(b52.5)
- **Sound**: soft *drop* on the rejected point, *lock* chord on the phone.
- **Check**: "Three circles meet at one point: me."

## S7 · Proof · b58–68 (48.3–56.7 s)
- **Teaches**: the phone does the computing and sends nothing; the satellites never learn the answer.
- **Frame**: 1) dashed signal lines from A, B, C flowing down into the phone; 2) an upward arrow from the phone, tilted 25° into the empty space between the A and C lines, struck through; 3) faint circles for context.
- **Motion**: camera returns to the sky framing (b58–59.5) while circles dim → signals flow downward (b60–61, one arrival tick each) → the up arrow rises (b61.5) and is struck (b63).
- **Words**: on screen「送信なし」 / caption「位置を計算するのは、スマホ自身。」
- **Sound**: three arrival *ticks*, a soft *strike*.
- **Check**: "My phone figures it out alone."

## S8 · Turn · b68–85.5 (56.7–71.2 s)
- **Teaches**: change one variable — the phone's clock is off by one millionth of a second — and every distance is 300 m wrong; the circles stop meeting. Solving for that clock error is why GPS needs one more satellite (four in 3D).
- **Frame**: 1) street-scale cross-section: the three circles now look like straight lines crossing at the phone; 2) the shifted (dashed) circles; 3) the 300 m bracket; 4) the gap they leave.
- **Motion**: log-scale zoom from 20,000 km to 1 km, pinned on the phone (b68–70.5); the Earth outline fades out at street scale → the three circles return one at a time, each with a tick (b70.5, 71, 71.5) → every circle grows by 300 m (b74–75.5) → bracket, light accent fill on the gap triangle and「1点で交わらない」(b76) → all circles shrink together by the same amount until they meet again (b80–82) → lock.
- **Words**: on screen「300m」「1点で交わらない」(below the triangle) / captions「時計が100万分の1秒ずれると、」「距離が全部300m狂う。」「ずれも解く。立体なら衛星4つ。」
- **Sound**: soft *whoosh* into the zoom; bed thins and a detuned dyad marks the error (b74); the **motif** returns with the lock when the circles meet (b82.5).
- **Check**: "The extra satellite is there to fix the clock."

## S9 · Payoff · b85.5–100 (71.3–83.3 s)
- **Teaches**: the opening image, read correctly — satellites broadcast to everyone, the phone only receives. Next step: look at the circle around your location dot.
- **Frame**: 1) the opening composition (A above the phone, Earth's curve) now with B, C, D; 2) rings flowing outward from all four; 3) the phone point becoming a map-app location dot with its accuracy circle.
- **Motion**: zoom back out to the opening framing (b85.5–87) → D drops in → four rings (b87.5–89) pass the phone → once the last ring has arrived, everything but the phone dims to 15% (b92–93) → the point grows into the same location dot with its accuracy circle that opened the film (b92.5–94) → hold to the end.
- **Words**: on screen「この中のどこか」 / captions「衛星は、あなたを知らない。」「次に地図を開いたら、点のまわりの円を見てみて。」
- **Sound**: four soft *pings*; the **motif** one last time as the circle appears (b94); the bed resolves and fades over the last 3 s.
- **Check**: "Next time I open a map, that circle means 'somewhere in here'."
