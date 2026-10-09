/*
 * TIMELINE — every beat, move, cue, caption and label of the film.
 * Times are in beats (90 BPM → 1 beat = 2/3 s). The renderer, the audio engine,
 * the caption exporter and the checks all read this one object.
 * World units are kilometres; origin is the Earth's centre, y points up, the phone sits on top of the Earth.
 */
(function (root) {
  const BPM = 72;
  const SPB = 60 / BPM;

  // ---- true-scale geometry (tools/geometry.py; sources in SOURCES.md)
  const R = 6371.0;
  const C_KMS = 299792.458;
  const ORBIT = R + 20200.0; // gps.gov: ~20,200 km altitude
  const PHONE = [0, R];
  // satellites placed by angle from the phone's zenith (geocentric); positions and ranges are computed, not rounded,
  // so the true circles meet exactly at the phone even at street scale.
  const ANG = {A: 0, B: -38, C: 47, D: -64};
  const sats = {};
  for (const [k, deg] of Object.entries(ANG)) {
    const a = (deg * Math.PI) / 180;
    const pos = [ORBIT * Math.sin(a), ORBIT * Math.cos(a)];
    const range = Math.hypot(pos[0] - PHONE[0], pos[1] - PHONE[1]);
    sats[k] = {angle: deg, pos, range, delay: range / C_KMS};
  }
  // second intersection of circles A and B: the phone reflected across line AB
  const secondAB = (() => {
    const [ax, ay] = sats.A.pos, [bx, by] = sats.B.pos, [px, py] = PHONE;
    const dx = bx - ax, dy = by - ay;
    const u = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const fx = ax + u * dx, fy = ay + u * dy;
    return [2 * fx - px, 2 * fy - py];
  })();
  const KM_PER_BEAT = 10100; // drawn wavefront speed: A's signal reaches the phone in exactly 2 beats (~20x slower than light)
  const ERROR_KM = C_KMS * 1e-6; // 1 µs of clock error = 0.2998 km

  // world regions each camera must keep in view: [x0, y0, x1, y1]
  const cameras = {
    close: [-25000, 2600, 25000, 28600],
    planet: [-22000, -7000, 22000, 47200],
    // tall formats (9:16, 1:1): same framing with headroom above circle A for the equation
    planet_tall: [-22000, -7000, 22000, 61500],
    planet2: [-27500, -7000, 27500, 45500],
    street: [-0.75, R - 0.78, 0.75, R + 0.36],
  };

  // camera track: holds and moves. A move keeps `pin` on a straight screen path while zoom changes on a log scale.
  const cameraTrack = [
    {from: 0, cam: "close"},
    {move: [26, 27.5], to: "planet", pin: "phone"},
    {move: [38, 39.5], to: "planet2", pin: "phone"},
    {move: [58, 59.5], to: "close", pin: "phone"},
    {move: [68, 70.5], to: "street", pin: "phone"},
    {move: [85.5, 87], to: "close", pin: "phone"},
  ];

  // named moves: [from, to, easing]
  const moves = {
    earth_in: [0.75, 2, "settle"],
    mapdot_open: [1, 2, "move"],  // the map dot's accuracy circle collapses into the phone point
    phone_in: [0, 0.5, "settle"],
    A_in: [1.5, 3, "settle"],
    cone_in: [3, 5, "settle"],
    cone_out: [10, 11.5, "exit"],
    delay_line: [18, 19.5, "settle"],
    label_math: [29, 29.6, "settle"],     // 0.067秒 → 0.067秒 × 光の速さ
    label_result: [30.5, 31.1, "settle"], // → 20,200 km
    sweep_A: [31.5, 33.5, "move"],
    radius_out: [38, 39, "exit"],
    circleA_settle: [38, 39, "settle"],
    B_in: [39.5, 40.5, "settle"],
    markers_in: [43, 43.75, "settle"],
    C_in: [48.5, 49.5, "settle"],
    wrong_out: [53, 54, "exit"],
    lock_in: [54, 54.75, "settle"],
    circles_dim: [58, 59, "move"],
    signals_in: [60, 61, "settle"],
    up_in: [61.5, 62.5, "settle"],
    strike_in: [63, 63.5, "settle"],
    signals_out: [67.25, 68, "exit"],
    street_A_in: [70.5, 71, "settle"],
    street_B_in: [71, 71.5, "settle"],
    street_C_in: [71.5, 72, "settle"],
    clock_error: [74, 75.5, "move"],
    bracket_in: [75.75, 76.5, "settle"],
    solve: [80, 82, "move"],
    lock2_in: [82, 82.75, "settle"],
    arcs_out: [85.5, 86.5, "exit"],
    D_in: [87, 88, "settle"],
    focus_dot: [92, 93, "move"],
    mapdot: [92.5, 94, "move"],
  };

  // wavefronts: a ring leaves `sat` at beat b and grows at KM_PER_BEAT.
  // `freeze` = the ring stops when it reaches the phone and becomes that satellite's circle.
  const emissions = [
    {sat: "A", b: 12},
    {sat: "A", b: 16},
    {sat: "B", b: 40.5, freeze: true},
    {sat: "C", b: 50, freeze: true},
    {sat: "A", b: 87.5},
    {sat: "B", b: 88},
    {sat: "C", b: 88.5},
    {sat: "D", b: 89},
  ];
  for (const e of emissions) e.arrive = e.b + sats[e.sat].range / KM_PER_BEAT;

  // sound cues (beats). `motif` is the three-note figure that marks the key idea.
  const cues = [
    {b: 5, type: "lock"},
    {b: 12, type: "emit"}, {b: 14, type: "arrive"},
    {b: 16, type: "emit"}, {b: 18, type: "arrive"},
    {b: 19.5, type: "measure"},
    {b: 33.5, type: "motif"},
    {b: 40.5, type: "emit"}, {b: emissions[2].arrive, type: "arrive"},
    {b: 43, type: "marker"},
    {b: 50, type: "emit"}, {b: emissions[3].arrive, type: "arrive"},
    {b: 53, type: "drop"},
    {b: 54, type: "lock"},
    {b: 60, type: "arrive"}, {b: 60.5, type: "arrive"}, {b: 61, type: "arrive"},
    {b: 63, type: "strike"},
    {b: 68, type: "whoosh_in"},
    {b: 70.5, type: "arrive"}, {b: 71, type: "arrive"}, {b: 71.5, type: "arrive"},
    {b: 74, type: "error"},
    {b: 82, type: "motif"}, {b: 82, type: "lock"},
    {b: 85.5, type: "whoosh_out"},
    {b: 87.5, type: "emit"}, {b: 88, type: "emit"}, {b: 88.5, type: "emit"}, {b: 89, type: "emit"},
    {b: 94, type: "motif"},
  ];

  // narration, burned in and exported as captions.srt. Japanese, ≤ ~6.5 characters per second.
  // "|" marks where a line may break (phrase boundaries); it is never drawn.
  const captions = [
    {from: 2, to: 10, text: "地図の現在地。|衛星に見られている？"},
    {from: 11, to: 18, text: "実は逆。衛星は|時刻と位置を流すだけ。"},
    {from: 18.5, to: 26, text: "届いた送信時刻を|自分の時計と比べる。"},
    {from: 27.5, to: 33.25, text: "遅れ×光の速さ＝|衛星までの距離。"},
    {from: 33.25, to: 38, text: "分かるのは、|円のどこかまで。"},
    {from: 41, to: 48, text: "2つ目の衛星の円を|重ねると、候補は2点。"},
    {from: 52.5, to: 58, text: "3つ目の円で、|1点に決まる。"},
    {from: 60, to: 67.75, text: "位置を計算するのは、|スマホ自身。"},
    {from: 70.5, to: 76, text: "時計が100万分の1秒|ずれると、"},
    {from: 76, to: 80.25, text: "距離が全部|300m狂う。"},
    {from: 80.25, to: 85.5, text: "ずれも解く。|立体なら衛星4つ。"},
    {from: 87, to: 91.25, text: "衛星は、|あなたを知らない。"},
    {from: 92.5, to: 100, text: "次に地図を開いたら、|点のまわりの円を見てみて。"},
  ];

  // on-screen anchors: short labels that sit on objects. `at` names the object; `side` the preferred placement.
  // `at`/`side` may be per-format objects ({"16x9": ..., default: ...}).
  const anchors = [
    {id: "you", from: 2, to: 9.5, text: "あなた", at: "phone", side: "below", style: "label"},
    {id: "delay", from: 19.5, to: 29, text: "遅れ 0.067秒", at: "delay_mid", side: "right", style: "mono"},
    {id: "eq1", from: 29, to: 38, text: "0.067秒 × 光の速さ", at: "eq", side: "topleft", style: "mono"},
    {id: "eq2", from: 30.5, to: 38, text: "＝ 20,200 km", at: "eq2", side: "topleft", style: "mono"},
    {id: "flat", from: 45, to: 50, text: "※図は平面。|実際は球で考える", at: "corner", side: "corner", style: "small"},
    {id: "here", from: 54, to: 58, text: "現在地", at: "phone", side: "below", style: "anchor"},
    {id: "nosend", from: 63, to: 67.75, text: "送信なし", at: "up", side: "right", style: "anchor"},
    {id: "m300", from: 76, to: 79.75, text: "300m", at: "bracket", side: "right", style: "mono"},
    {id: "nomeet", from: 76.5, to: 79.75, text: "1点で交わらない", at: "triangle_low", side: "below", style: "anchor"},
    {id: "somewhere", from: 94, to: 100, text: "この中のどこか", at: {"16x9": "mapdot_right", default: "mapdot_below"}, side: {"16x9": "right", default: "below"}, style: "anchor"},
  ];

  const scenes = [
    {id: "S1", from: 0, to: 10, part: "Question"},
    {id: "S2", from: 10, to: 18, part: "Model"},
    {id: "S3", from: 18, to: 26, part: "Model"},
    {id: "S4", from: 26, to: 38, part: "Model"},
    {id: "S5", from: 38, to: 48, part: "Proof"},
    {id: "S6", from: 48, to: 58, part: "Proof"},
    {id: "S7", from: 58, to: 68, part: "Proof"},
    {id: "S8", from: 68, to: 85.5, part: "Turn"},
    {id: "S9", from: 85.5, to: 100, part: "Payoff"},
  ];

  // key beats for stills / contact sheet: one per important state
  const keyBeats = [0.5, 5.5, 13.5, 21, 30, 35, 45, 51.5, 55, 64.5, 72, 77, 83.5, 89.5, 96, 99];

  const TIMELINE = {
    title: "青い点は、見られていない — GPSのしくみ",
    fps: 60, bpm: BPM, spb: SPB, beats: 100, duration: 100 * SPB, seed: 20261009,
    world: {R, C_KMS, sats, KM_PER_BEAT, ERROR_KM, phone: PHONE, secondAB},
    cameras, cameraTrack, moves, emissions, cues, captions, anchors, scenes, keyBeats,
    toSec: (b) => b * SPB,
    toBeat: (t) => t / SPB,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = TIMELINE;
  else root.TIMELINE = TIMELINE;
})(typeof window !== "undefined" ? window : globalThis);
