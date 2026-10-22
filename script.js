// cspell:words lerp sakura substep legendaries buzzy trackpad

(() => {
  'use strict';

  /* ==================================================================
   * Types (JSDoc — lets VS Code type-check this file)
   * ================================================================== */

  /**
   * Draws one petal outline, base at (0,0), tip at (0,-len).
   * @typedef {(c: CanvasRenderingContext2D, len: number, wid: number) => void} PetalShape
   */

  /**
   * Hue of petal `i` of `n` in a ring, for petals whose color changes over time.
   * @typedef {(f: Flower, i: number, n: number) => number} HueFn
   */

  /**
   * A petal gradient, from base to tip.
   * @typedef {object} PaintDef
   * @property {number} len        gradient length, as a fraction of the flower radius
   * @property {number[][]} stops  [offset, hue shift, saturation %, lightness %, alpha]
   */

  /**
   * One ring of petals around the flower center.
   * @typedef {object} RingDef
   * @property {number} n          petal count
   * @property {number} len        petal length, fraction of the flower radius
   * @property {number} wr         petal width / length
   * @property {number} off        angular offset (radians)
   * @property {number} delay      seconds after the bloom starts
   * @property {number} twist      how far petals spiral while unfurling (radians)
   * @property {number} stagger    seconds between adjacent petals
   * @property {number} dur        seconds for one petal to open
   * @property {PetalShape} shape
   * @property {number[] | null} edge  outline color [hue shift, lightness %, alpha]
   * @property {number} vein       midrib length (fraction of petal), 0 = none
   * @property {number} spots      freckles per petal
   * @property {number} flicker    flame-like length flicker (0 = none)
   * @property {HueFn | null} hueFn  animated per-petal hue (overrides the paint)
   * @property {number} paint      index into the flower's paints
   */

  /**
   * @typedef {Partial<RingDef> & { n: number, len: number, stops: number[][] }} RingSpec
   */

  /**
   * @typedef {object} LeafStyle
   * @property {number} min
   * @property {number} max
   * @property {number} tMin       lowest position along the stem (0 = base, 1 = head)
   * @property {number} tMax
   * @property {number} lenMul
   * @property {number} wMul
   * @property {number} angMin     angle away from the stem (radians)
   * @property {number} angMax
   */

  /**
   * @typedef {object} LeafDef
   * @property {number} t
   * @property {number} side
   * @property {number} lf
   * @property {number} wm
   * @property {number} ang
   * @property {number} phase
   */

  /**
   * Per-frame values shared by all head-drawing code.
   * @typedef {object} HeadState
   * @property {number} R          petal radius in world px
   * @property {number} budIn      0 → 1 while the bud appears
   * @property {number} L0         age at which the bloom starts
   * @property {number} bloom      0 → 1 over the bloom
   * @property {number} eBloom     eased bloom
   * @property {number} breathe    gentle scale pulse once open
   */

  /** @typedef {'common' | 'rare' | 'legendary'} Rarity */

  /**
   * @typedef {object} SpeciesDef
   * @property {string} name
   * @property {Rarity} rarity
   * @property {number[]} hues
   * @property {number} size       petal-radius multiplier
   * @property {boolean} front     front-facing (gets a perspective tilt) vs side view
   * @property {number} centerY    head center along the head axis, fraction of the radius
   * @property {number} halo       halo radius, fraction of the radius
   * @property {boolean} glint     four-point light glint over the center
   * @property {number[][]} bud    bud gradient [offset, hue shift, saturation %, lightness %]
   * @property {LeafStyle} leaf
   * @property {() => { paints: PaintDef[], rings: RingDef[] }} build
   * @property {(c: CanvasRenderingContext2D, f: Flower, s: HeadState) => void} draw
   */

  /**
   * @typedef {object} ParticleData
   * @property {boolean} [ember]
   * @property {number} x
   * @property {number} y
   * @property {number} vx
   * @property {number} vy
   * @property {number} life
   * @property {number} age
   * @property {number} size
   * @property {number} hue
   * @property {number} sat
   * @property {number} light
   * @property {number} drag
   * @property {number} gravity
   * @property {number} windK
   * @property {number} flick
   * @property {number} phase
   * @property {number} wobble
   */

  /**
   * A wavy ribbon of scent rising from a picked flower.
   * @typedef {object} ScentDef
   * @property {number} x
   * @property {number} y
   * @property {number} vx
   * @property {number} vy
   * @property {number} age
   * @property {number} life
   * @property {number} hue
   * @property {number} amp
   * @property {number} len
   * @property {number} phase
   * @property {number} w
   */

  /**
   * Floating words in the garden (e.g. when a legendary bud fizzles).
   * @typedef {object} FloatText
   * @property {number} x
   * @property {number} y
   * @property {string} text
   * @property {string} color
   * @property {number} age
   * @property {number} life
   */

  /**
   * @typedef {object} BeeDef
   * @property {number} x
   * @property {number} y
   * @property {number} vx
   * @property {number} vy
   * @property {Flower | null} target
   * @property {'arrive' | 'hover' | 'leave'} mode
   * @property {number} until      time the current hover ends
   * @property {number} phase
   * @property {number} face       1 = facing right, -1 = left
   * @property {number} size
   * @property {number} exitX
   * @property {number} exitY
   */

  /**
   * @typedef {object} StarDef
   * @property {number} xf
   * @property {number} yf
   * @property {number} r
   * @property {number} base
   * @property {number} sp
   * @property {number} ph
   */

  /**
   * @typedef {object} BladeDef
   * @property {number} xf
   * @property {number} hf
   * @property {number} w
   * @property {number} lean
   * @property {number} ph
   * @property {number} delay
   */

  /**
   * A pointer pressing on a flower (positions in world coordinates).
   * @typedef {object} PressState
   * @property {Flower} f
   * @property {number} id
   * @property {number} x0
   * @property {number} y0
   * @property {number} x
   * @property {number} y
   * @property {number} t0
   * @property {boolean} dragging
   */

  /**
   * A pointer dragging the empty garden (positions in screen coordinates).
   * @typedef {object} PanState
   * @property {number} id
   * @property {number} sx0
   * @property {number} sy0
   * @property {number} camX0
   * @property {number} camY0
   * @property {boolean} moved
   * @property {number} lastX
   * @property {number} lastY
   * @property {number} lastT
   * @property {number} vx
   * @property {number} vy
   */

  /**
   * Two fingers zooming.
   * @typedef {object} PinchState
   * @property {number} d0         finger distance when the pinch started
   * @property {number} zoom0
   * @property {number} wx         world point that stays under the fingers
   * @property {number} wy
   */

  /* ==================================================================
   * Config — tweak freely
   * ================================================================== */
  const CONFIG = {
    // flower kinds in the starting garden — use ['lotus'] for the all-orange original look
    gardenSpecies: ['lotus', 'rose', 'daisy', 'tulip', 'lily', 'sakura', 'poppy', 'lavender', 'dandelion'],
    // each tap on empty ground grows the next kind in this list, then loops
    plantOrder: ['rose', 'tulip', 'lily', 'sakura', 'daisy', 'poppy', 'lavender', 'dandelion', 'lotus'],
    rareChance: 0.1,         // chance a planted flower turns out rare
    gardenRareChance: 0.06,  // chance each flower of the starting garden is rare
    legendaryZone: 0.16,     // tapping the top 16% of the screen plants a mysterious bud…
    legendaryChance: 0.35,   // …which becomes legendary with this chance
    showNames: true,         // show names of planted / rare flowers when they open
    flowerCount: 0,          // 0 = auto (based on garden width)
    maxFlowers: 40,          // oldest flowers fade out past this when planting
    embers: 0,               // floating embers, 0 = auto (based on screen area)
    glow: true,              // bloom layer on/off
  };

  /* ==================================================================
   * Helpers
   * ================================================================== */
  const TAU = Math.PI * 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const SUBSTEP = 1 / 120; // physics step for the springs
  const MAX_ZOOM = 3.5;

  /** @type {(a: number, b: number) => number} */
  const rand = (a, b) => a + Math.random() * (b - a);
  /** @type {(a: number, b: number) => number} */
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  /**
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  /** @type {(a: number, b: number, t: number) => number} */
  const lerp = (a, b, t) => a + (b - a) * t;
  /** @type {(v: number, a?: number, b?: number) => number} */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  /** @type {(t: number, start: number, dur: number) => number} */
  const progress = (t, start, dur) => clamp((t - start) / dur);
  /** @type {(t: number) => number} */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  /** @type {(t: number) => number} */
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  /** @type {(t: number) => number} */
  const easeOutBack = (t) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  // Cubic bezier value / derivative on one axis
  /** @type {(a: number, b: number, c: number, d: number, t: number) => number} */
  const bez = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  /** @type {(a: number, b: number, c: number, d: number, t: number) => number} */
  const bezD = (a, b, c, d, t) => {
    const u = 1 - t;
    return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
  };
  // Layered sines = a gentle, non-repeating breeze in roughly [-1, 1]
  /** @type {(t: number) => number} */
  const wind = (t) =>
    Math.sin(t * 0.55) * 0.5 + Math.sin(t * 1.35 + 1.3) * 0.2 + Math.sin(t * 0.21 + 0.7) * 0.3;

  /**
   * Star outline with `n` points.
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} y
   * @param {number} ro   outer radius
   * @param {number} ri   inner radius
   * @param {number} n
   * @param {number} rot
   */
  function starPath(c, x, y, ro, ri, n, rot) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro;
      const a = rot + (i * Math.PI) / n;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  }

  /**
   * Small four-point twinkle, filled with the current fillStyle.
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} y
   * @param {number} r
   * @param {number} rot
   */
  function drawSparkle(c, x, y, r, rot) {
    starPath(c, x, y, r, r * 0.28, 4, rot);
    c.fill();
  }

  /* ==================================================================
   * Petal shapes — base at (0,0), tip at (0,-len)
   * ================================================================== */
  // lance-shaped with a sharp tip (lotus, star, phoenix)
  /** @type {PetalShape} */
  const pointedPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid, -len * 0.22, wid * 0.85, -len * 0.7, 0, -len);
    c.bezierCurveTo(-wid * 0.85, -len * 0.7, -wid, -len * 0.22, 0, 0);
    c.closePath();
  };

  // round tip — narrow for the daisy, wide for the rose and poppy
  /** @type {PetalShape} */
  const roundPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid * 0.9, -len * 0.08, wid * 1.15, -len * 0.62, wid * 0.62, -len * 0.92);
    c.quadraticCurveTo(0, -len * 1.06, -wid * 0.62, -len * 0.92);
    c.bezierCurveTo(-wid * 1.15, -len * 0.62, -wid * 0.9, -len * 0.08, 0, 0);
    c.closePath();
  };

  // round with a little notch at the tip (cherry blossom)
  /** @type {PetalShape} */
  const notchedPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid * 0.9, -len * 0.12, wid * 1.15, -len * 0.7, wid * 0.6, -len * 0.97);
    c.quadraticCurveTo(wid * 0.25, -len * 1.02, 0, -len * 0.86);
    c.quadraticCurveTo(-wid * 0.25, -len * 1.02, -wid * 0.6, -len * 0.97);
    c.bezierCurveTo(-wid * 1.15, -len * 0.7, -wid * 0.9, -len * 0.12, 0, 0);
    c.closePath();
  };

  // pointed with a tip that curls to one side (lily)
  /** @type {PetalShape} */
  const lilyPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid * 1.05, -len * 0.25, wid * 0.95, -len * 0.72, wid * 0.32, -len);
    c.bezierCurveTo(-wid * 0.35, -len * 0.82, -wid * 0.95, -len * 0.32, 0, 0);
    c.closePath();
  };

  // wide cup petal, seen from the side (tulip)
  /** @type {PetalShape} */
  const tulipPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid * 1.3, -len * 0.02, wid * 1.2, -len * 0.74, 0, -len);
    c.bezierCurveTo(-wid * 1.2, -len * 0.74, -wid * 1.3, -len * 0.02, 0, 0);
    c.closePath();
  };

  /* ==================================================================
   * Setup + state
   * ================================================================== */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const START_TIME = reduceMotion ? 30 : 0; // reduced motion: start fully grown

  /** @type {<T extends HTMLElement>(id: string) => T} */
  const $ = (id) => /** @type {any} */ (document.getElementById(id));
  /** @type {HTMLCanvasElement} */
  const canvas = $('garden');
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  /** @type {HTMLCanvasElement} */
  const glowCanvas = $('glow');
  const glowCtx = /** @type {CanvasRenderingContext2D} */ (glowCanvas.getContext('2d'));
  /** @type {HTMLElement} */
  const hint = $('hint');
  /** @type {HTMLElement} */
  const flashEl = $('flash');
  /** @type {HTMLElement} */
  const banner = $('banner');
  /** @type {HTMLElement} */
  const bannerTag = $('bannerTag');
  /** @type {HTMLElement} */
  const bannerName = $('bannerName');
  /** @type {HTMLButtonElement} */
  const replayBtn = $('replay');
  /** @type {HTMLButtonElement} */
  const zoomInBtn = $('zoomIn');
  /** @type {HTMLButtonElement} */
  const zoomOutBtn = $('zoomOut');
  /** @type {HTMLButtonElement} */
  const zoomFitBtn = $('zoomFit');
  /** @type {HTMLButtonElement} */
  const motionBtn = $('motion');

  // screen size (CSS px), world size (the garden is wider than the screen), sizing unit
  let W = 0, H = 0, DPR = 1, WW = 0, WH = 0, unit = 1;
  // camera: world coordinates of the screen's top-left corner, plus zoom
  const cam = { x: 0, y: 0, zoom: 1, vx: 0, vy: 0, shakeAt: -10 };
  // visible world rectangle, refreshed every frame
  let viewL = 0, viewR = 0, viewT = 0, viewB = 0;
  /** @type {{ target: number, sx: number, sy: number } | null} */
  let zoomAnim = null;
  /** @type {number | null} */
  let panTargetX = null;

  let time = START_TIME, last = performance.now(), windNow = 0;
  /** @type {Flower[]} */
  let flowers = [];
  /** @type {ParticleData[]} */
  let particles = [];  // world space
  /** @type {ParticleData[]} */
  let embers = [];     // screen space
  /** @type {ScentDef[]} */
  let scents = [];
  /** @type {FloatText[]} */
  let texts = [];
  /** @type {BeeDef[]} */
  let bees = [];
  /** @type {StarDef[]} */
  let stars = [];
  /** @type {BladeDef[]} */
  let backGrass = [];
  /** @type {BladeDef[]} */
  let frontGrass = [];
  /** @type {CanvasGradient | null} */
  let backGrassFill = null;
  /** @type {CanvasGradient | null} */
  let frontGrassFill = null;
  let grassW = 0;

  /** @type {Map<number, { x: number, y: number }>} */
  const pointers = new Map();
  /** @type {PressState | null} */
  let press = null;
  /** @type {PanState | null} */
  let pan = null;
  /** @type {PinchState | null} */
  let pinch = null;
  /** @type {Set<string>} */
  const keys = new Set();

  let nextId = 0;
  let plantIndex = 0;
  let beesSpawned = 0;
  let nextBeeAt = START_TIME + 15;
  let interacted = false;
  let hintTimer = 0;
  let motionOn = false, motionX = 0, motionAt = -10, nextShakePuff = 0;
  let gravityX = 0, gravityY = 0;

  /* ==================================================================
   * Camera
   * ================================================================== */
  const minZoom = () => clamp(W / WW, 0.25, 1);
  /** @type {(sx: number) => number} */
  const toWorldX = (sx) => cam.x + sx / cam.zoom;
  /** @type {(sy: number) => number} */
  const toWorldY = (sy) => cam.y + sy / cam.zoom;
  /** @type {(x: number, y: number, m: number) => boolean} */
  const inView = (x, y, m) => x > viewL - m && x < viewR + m && y > viewT - m && y < viewB + m;

  // keep the view inside the garden; the ground always sits at the bottom of the screen
  function clampCam() {
    cam.zoom = clamp(cam.zoom, minZoom(), MAX_ZOOM);
    const vw = W / cam.zoom, vh = H / cam.zoom;
    cam.x = vw >= WW ? (WW - vw) / 2 : clamp(cam.x, 0, WW - vw);
    cam.y = vh >= WH ? WH - vh : clamp(cam.y, 0, WH - vh);
  }

  /**
   * Zoom by `factor`, keeping the world point under screen point (sx, sy) in place.
   * @param {number} sx
   * @param {number} sy
   * @param {number} factor
   */
  function zoomAt(sx, sy, factor) {
    const wx = toWorldX(sx), wy = toWorldY(sy);
    cam.zoom = clamp(cam.zoom * factor, minZoom(), MAX_ZOOM);
    cam.x = wx - sx / cam.zoom;
    cam.y = wy - sy / cam.zoom;
    clampCam();
  }

  /** @param {number} target */
  function animateZoom(target) {
    zoomAnim = { target: clamp(target, minZoom(), MAX_ZOOM), sx: W / 2, sy: H * 0.6 };
  }

  /** @param {number} dt */
  function updateCamera(dt) {
    if (zoomAnim) {
      zoomAt(zoomAnim.sx, zoomAnim.sy, Math.pow(zoomAnim.target / cam.zoom, Math.min(1, dt * 9)));
      if (Math.abs(cam.zoom - zoomAnim.target) < 0.002) zoomAnim = null;
    }
    if (panTargetX !== null) {
      cam.x += (panTargetX - cam.x) * Math.min(1, dt * 6);
      clampCam();
      if (Math.abs(panTargetX - cam.x) < 0.5) panTargetX = null;
    }
    // keyboard panning
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    if (kx || ky) {
      cam.x += (kx * 700 * dt) / cam.zoom;
      cam.y += (ky * 700 * dt) / cam.zoom;
      panTargetX = null;
      clampCam();
    }
    // fling: keep gliding after a quick drag
    if (!pan && (Math.abs(cam.vx) > 2 || Math.abs(cam.vy) > 2)) {
      cam.x -= (cam.vx * dt) / cam.zoom;
      cam.y -= (cam.vy * dt) / cam.zoom;
      const decay = Math.exp(-dt * 4);
      cam.vx *= decay;
      cam.vy *= decay;
      clampCam();
    }
    viewL = cam.x;
    viewT = cam.y;
    viewR = cam.x + W / cam.zoom;
    viewB = cam.y + H / cam.zoom;
  }

  function applyWorldTransform() {
    const z = cam.zoom;
    const st = time - cam.shakeAt;
    const shake = st < 0.8 && !reduceMotion ? (1 - st / 0.8) * 7 : 0;
    const sx = shake ? rand(-shake, shake) : 0, sy = shake ? rand(-shake, shake) : 0;
    ctx.setTransform(DPR * z, 0, 0, DPR * z, (-cam.x * z + sx) * DPR, (-cam.y * z + sy) * DPR);
  }

  function applyScreenTransform() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ==================================================================
   * Shared head-drawing pieces (all in head-local coordinates)
   * ================================================================== */

  /**
   * Builds paints + rings from a list of ring specs (one gradient per ring).
   * @param {RingSpec[]} specs
   * @returns {{ paints: PaintDef[], rings: RingDef[] }}
   */
  function ringSet(specs) {
    /** @type {PaintDef[]} */
    const paints = [];
    /** @type {RingDef[]} */
    const rings = [];
    specs.forEach((spec, i) => {
      paints.push({ len: spec.len, stops: spec.stops });
      rings.push({
        wr: 0.38, off: 0, delay: 0, twist: 1.2, stagger: 0.035, dur: 1.5,
        shape: pointedPetal, edge: null, vein: 0, spots: 0, flicker: 0, hueFn: null,
        ...spec,
        paint: i,
      });
    });
    return { paints, rings };
  }

  /**
   * Rings of petals unfurling in a spiral, back to front.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawRings(c, f, s) {
    c.lineWidth = 1;
    for (const r of f.rings) {
      const ringStart = s.L0 + r.delay;
      if (f.age <= ringStart) continue;
      const len = s.R * r.len, wid = len * r.wr;
      const fill = f.grads[r.paint];
      const edge = r.edge ? `hsla(${f.hue + r.edge[0]}, 100%, ${r.edge[1]}%, ${r.edge[2]})` : '';
      const spot = `hsla(${f.hue - 30}, 70%, 32%, 0.6)`;
      for (let i = 0; i < r.n; i++) {
        const p = progress(f.age, ringStart + i * r.stagger, r.dur);
        if (p <= 0) continue;
        const e = easeOutCubic(p);
        const flick = r.flicker ? 1 + Math.sin(time * 9 + i * 1.7 + f.phase) * r.flicker : 1;
        c.save();
        c.rotate(
          f.spin + r.off + (i * TAU) / r.n - (1 - e) * r.twist +
          Math.sin(time * 0.9 + f.phase + i) * 0.015 * s.bloom
        );
        c.scale(lerp(0.3, 1, e) * s.breathe, easeOutBack(p) * s.breathe * flick);
        r.shape(c, len, wid);
        if (r.hueFn) {
          const hh = r.hueFn(f, i, r.n);
          const pg = c.createLinearGradient(0, 0, 0, -len);
          pg.addColorStop(0, `hsla(${hh}, 100%, 93%, 0.97)`);
          pg.addColorStop(0.4, `hsla(${hh}, 100%, 68%, 0.95)`);
          pg.addColorStop(1, `hsla(${hh + 40}, 100%, 52%, 0.9)`);
          c.fillStyle = pg;
        } else {
          c.fillStyle = fill;
        }
        c.fill();
        if (edge) {
          c.strokeStyle = edge;
          c.stroke();
          if (r.vein) {
            c.beginPath();
            c.moveTo(0, -len * 0.08);
            c.lineTo(0, -len * r.vein);
            c.stroke();
          }
        }
        if (r.spots) {
          const rad = Math.max(0.7, len * 0.016);
          c.fillStyle = spot;
          c.beginPath();
          for (let j = 0; j < r.spots; j++) {
            const x = (j % 2 ? 1 : -1) * wid * (0.1 + 0.08 * (j % 3));
            const y = -len * (0.16 + 0.065 * j);
            c.moveTo(x + rad, y);
            c.arc(x, y, rad, 0, TAU);
          }
          c.fill();
        }
        c.restore();
      }
    }
  }

  /**
   * Green star of sepals behind the petals.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   * @param {number} n
   * @param {number} len
   * @param {number} wid
   */
  function drawCalyx(c, f, s, n, len, wid) {
    const k = easeOutCubic(progress(f.age, s.L0 - 0.1, 0.8));
    if (k <= 0) return;
    c.fillStyle = `hsl(145, 45%, ${14 + 10 * f.z}%)`;
    for (let i = 0; i < n; i++) {
      c.save();
      c.rotate((i * TAU) / n + f.spin);
      c.scale(k, k);
      pointedPetal(c, s.R * len, s.R * wid);
      c.fill();
      c.restore();
    }
  }

  /**
   * Closed bud that fades as the petals take over.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawBud(c, f, s) {
    const out = progress(f.age, s.L0 - 0.1, 0.9);
    if (out >= 1) return;
    const R = s.R;
    c.save();
    c.globalAlpha = f.alpha * (1 - out);
    const k = easeOutBack(s.budIn) * (1 + out * 0.4);
    c.scale(k, k);
    c.fillStyle = f.budGrad;
    pointedPetal(c, R * 0.62, R * 0.42);
    c.fill();
    c.fillStyle = `hsl(145, 45%, ${16 + 10 * f.z}%)`;
    for (const side of [-1, 1]) {
      c.save();
      c.rotate(side * 0.32);
      pointedPetal(c, R * 0.42, R * 0.16);
      c.fill();
      c.restore();
    }
    c.restore();
  }

  /**
   * Ring of filaments with glowing tips.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   * @param {number} n
   * @param {number} reach  fraction of the radius
   * @param {number} cr     core radius in px
   */
  function drawStamens(c, f, s, n, reach, cr) {
    const sr = s.R * reach * s.eBloom;
    const dot = Math.max(1, s.R * 0.028);
    const turn = time * 0.12 + f.phase;

    c.strokeStyle = `hsla(${f.hue + 40}, 100%, 80%, 0.6)`;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + turn;
      const rr = sr * (0.85 + 0.15 * Math.sin(i * 2.3 + f.phase));
      c.moveTo(Math.cos(a) * cr * 0.5, Math.sin(a) * cr * 0.5);
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.stroke();

    c.fillStyle = `hsl(${f.hue + 48}, 100%, 88%)`;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + turn;
      const rr = sr * (0.85 + 0.15 * Math.sin(i * 2.3 + f.phase));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      c.moveTo(x + dot, y);
      c.arc(x, y, dot, 0, TAU);
    }
    c.fill();
  }

  /**
   * Bright glowing center.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {number} cr
   */
  function drawCore(c, f, cr) {
    if (cr <= 0) return;
    c.save();
    c.shadowBlur = 18;
    c.shadowColor = `hsl(${f.hue + 25}, 100%, 60%)`;
    const g = c.createRadialGradient(0, 0, 0, 0, 0, cr);
    g.addColorStop(0, '#fff8e8');
    g.addColorStop(0.45, `hsl(${f.hue + 40}, 100%, 78%)`);
    g.addColorStop(1, `hsla(${f.hue + 20}, 100%, 55%, 0.9)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, cr, 0, TAU);
    c.fill();
    c.restore();
  }

  /**
   * Rotating glowing star at the center (rare + legendary flowers).
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   * @param {number} size  fraction of the radius
   */
  function drawStarCore(c, f, s, size) {
    const r = s.R * size * easeOutBack(clamp(s.bloom * 1.3));
    if (r <= 0) return;
    c.save();
    c.rotate(time * 0.4 + f.phase);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.7);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    g.addColorStop(0.3, `hsla(${f.hue + 30}, 100%, 80%, 0.5)`);
    g.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r * 1.7, 0, TAU);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.shadowBlur = 14;
    c.shadowColor = `hsl(${f.hue + 20}, 100%, 65%)`;
    c.fillStyle = `hsl(${f.hue + 40}, 100%, 92%)`;
    starPath(c, 0, 0, r, r * 0.38, 8, 0);
    c.fill();
    c.restore();
  }

  /**
   * Soft halo behind the head.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawHalo(c, f, s) {
    const h = f.hue, y = -s.R * f.sp.centerY;
    const hr = s.R * f.sp.halo * (1 + Math.sin(time * 2 + f.phase) * 0.06);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, y, 0, 0, y, hr);
    g.addColorStop(0, `hsla(${h + 15}, 100%, 60%, ${0.32 * s.eBloom})`);
    g.addColorStop(0.35, `hsla(${h}, 100%, 50%, ${0.12 * s.eBloom})`);
    g.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, y, hr, 0, TAU);
    c.fill();
    c.restore();
  }

  /**
   * Slowly turning rays of light behind legendary flowers.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawGodRays(c, f, s) {
    const R = s.R, n = 14, len = R * 3.6 * s.eBloom;
    if (len <= R * 0.2) return;
    c.save();
    c.translate(0, -R * f.sp.centerY);
    c.rotate(time * 0.15 + f.phase);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, len);
    g.addColorStop(0, `hsla(${f.hue + 20}, 100%, 75%, ${0.24 * s.eBloom})`);
    g.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n, w = 0.07 + 0.05 * Math.sin(time * 1.3 + i * 2.1);
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
      c.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
      c.closePath();
    }
    c.fill();
    c.restore();
  }

  /**
   * A band of light that sweeps across rare and legendary petals every few seconds.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawShimmer(c, f, s) {
    const R = s.R, cy = -R * f.sp.centerY;
    const period = f.sp.rarity === 'legendary' ? 2.2 : 3.4;
    const ph = ((time + f.phase) % period) / period;
    if (ph > 0.4) return;
    const x = lerp(-R * 1.3, R * 1.3, ph / 0.4);
    c.save();
    c.beginPath();
    c.arc(0, cy, R * 1.05, 0, TAU);
    c.clip();
    c.globalCompositeOperation = 'source-atop'; // only light up what's already drawn (the petals)
    const g = c.createLinearGradient(x - R * 0.4, cy - R * 0.2, x + R * 0.4, cy + R * 0.2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.fillRect(-R * 1.1, cy - R * 1.1, R * 2.2, R * 2.2);
    c.restore();
  }

  /**
   * Four-point light glint, screen-aligned, at the head center.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawGlint(c, f, s) {
    c.save();
    c.translate(f.cx, f.cy);
    c.globalCompositeOperation = 'lighter';
    const gl = s.R * (1.05 + 0.2 * Math.sin(time * 2.2 + f.phase)) * s.eBloom;
    const g = c.createRadialGradient(0, 0, 0, 0, 0, gl);
    g.addColorStop(0, `hsla(${f.hue + 40}, 100%, 92%, 0.7)`);
    g.addColorStop(0.25, `hsla(${f.hue + 25}, 100%, 70%, 0.22)`);
    g.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
    c.fillStyle = g;
    for (let k = 0; k < 2; k++) {
      c.save();
      c.rotate((k * Math.PI) / 2);
      c.scale(1, 0.04);
      c.beginPath();
      c.arc(0, 0, gl, 0, TAU);
      c.fill();
      c.restore();
    }
    c.restore();
  }

  /**
   * World-space extras for rare / legendary flowers: orbiting sparkles, and on the
   * bloom moment expanding rings (plus a beam of light from the sky for legendaries).
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawRarityExtras(c, f, s) {
    const R = s.R, legendary = f.sp.rarity === 'legendary';
    c.save();
    c.globalCompositeOperation = 'lighter';

    const n = legendary ? 5 : 3;
    const rx = R * (legendary ? 1.45 : 1.25), ry = rx * 0.45;
    const speed = legendary ? 1.1 : 0.8;
    for (let i = 0; i < n; i++) {
      const a = time * speed + (i * TAU) / n + f.phase;
      const hue = f.kind === 'celestial' ? (i * 72 + time * 60) % 360 : f.hue + 30;
      const tw = 0.6 + 0.4 * Math.sin(time * 5 + i * 1.7);
      if (legendary) {
        // comet tail
        for (let j = 1; j <= 6; j++) {
          const aj = a - j * 0.08;
          c.fillStyle = `hsla(${hue}, 100%, 75%, ${(1 - j / 7) * 0.45 * s.eBloom})`;
          c.beginPath();
          c.arc(f.cx + Math.cos(aj) * rx, f.cy + Math.sin(aj) * ry, R * 0.035 * (1 - j / 8) + 0.6, 0, TAU);
          c.fill();
        }
      }
      c.fillStyle = `hsla(${hue}, 100%, 85%, ${0.9 * s.eBloom * tw})`;
      drawSparkle(c, f.cx + Math.cos(a) * rx, f.cy + Math.sin(a) * ry, R * 0.09 * tw * s.eBloom + 1, time * 2 + i);
    }

    if (f.eventAt) {
      const t = time - f.eventAt;
      if (legendary && t < 3) {
        const a = (1 - t / 3) * Math.min(1, t * 4);
        const top = viewT - 50, bw = R * 1.3;
        const g = c.createLinearGradient(f.cx - bw, 0, f.cx + bw, 0);
        g.addColorStop(0, 'rgba(255, 240, 200, 0)');
        g.addColorStop(0.5, `rgba(255, 245, 220, ${0.55 * a})`);
        g.addColorStop(1, 'rgba(255, 240, 200, 0)');
        c.fillStyle = g;
        c.fillRect(f.cx - bw, top, bw * 2, f.cy - top);
      }
      const waves = legendary ? 3 : 1, dur = legendary ? 1.8 : 1.3, grow = legendary ? 6 : 3;
      for (let k = 0; k < waves; k++) {
        const tk = t - k * 0.25;
        if (tk < 0 || tk > dur) continue;
        const p = tk / dur, rr = R * (1 + p * grow);
        c.strokeStyle = `hsla(${f.hue + 20}, 100%, 80%, ${(1 - p) * 0.8})`;
        c.lineWidth = (legendary ? 4 : 2.5) * (1 - p) + 0.5;
        c.beginPath();
        c.ellipse(f.cx, f.cy, rr, rr * 0.55, 0, 0, TAU);
        c.stroke();
      }
    }
    c.restore();
  }

  /**
   * Sunflower-style seed disk with seeds in a golden-angle spiral.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawSeedDisk(c, f, s) {
    const h = f.hue;
    const dr = s.R * 0.32 * easeOutBack(clamp(s.bloom * 1.3));
    if (dr <= 0) return;

    c.save();
    c.shadowBlur = 16;
    c.shadowColor = `hsl(${h - 10}, 100%, 50%)`;
    const g = c.createRadialGradient(0, 0, 0, 0, 0, dr);
    g.addColorStop(0, `hsl(${h - 20}, 85%, 24%)`);
    g.addColorStop(0.75, `hsl(${h - 25}, 90%, 15%)`);
    g.addColorStop(1, `hsl(${h - 12}, 100%, 38%)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, dr, 0, TAU);
    c.fill();
    c.restore();

    // seeds light up from the middle outwards
    const total = 64, shown = Math.floor(total * s.eBloom);
    const sz = Math.max(0.7, dr * 0.05);
    c.fillStyle = `hsla(${h + 5}, 100%, 70%, 0.9)`;
    c.beginPath();
    for (let i = 0; i < shown; i++) {
      const r = dr * 0.9 * Math.sqrt((i + 0.5) / total);
      const a = i * GOLDEN_ANGLE + f.spin;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      c.moveTo(x + sz, y);
      c.arc(x, y, sz, 0, TAU);
    }
    c.fill();

    c.strokeStyle = `hsla(${h}, 100%, 65%, 0.55)`;
    c.lineWidth = Math.max(1, dr * 0.07);
    c.beginPath();
    c.arc(0, 0, dr, 0, TAU);
    c.stroke();
  }

  /**
   * Tight glowing spiral at the heart of the rose.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawRoseHeart(c, f, s) {
    const h = f.hue;
    const sr = s.R * 0.22 * s.eBloom;
    if (sr <= 0) return;
    c.save();
    c.rotate(f.spin + time * 0.05);

    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, sr * 1.6);
    g.addColorStop(0, `hsla(${h + 20}, 100%, 70%, 0.55)`);
    g.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, sr * 1.6, 0, TAU);
    c.fill();
    c.globalCompositeOperation = 'source-over';

    const turns = 2.6, steps = 48;
    c.beginPath();
    c.moveTo(0, 0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, a = t * turns * TAU, r = sr * t;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.strokeStyle = `hsla(${h + 15}, 100%, 78%, 0.85)`;
    c.lineWidth = Math.max(1, s.R * 0.03);
    c.lineCap = 'round';
    c.stroke();
    c.restore();
  }

  /**
   * Dark poppy heart: a ring of black stamens around a ridged seed pod.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawPoppyHeart(c, f, s) {
    const R = s.R, e = s.eBloom;
    const rr = R * 0.3 * e, n = 22;
    if (rr <= 0) return;

    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.45);
    g.addColorStop(0, `hsla(${f.hue + 25}, 100%, 60%, ${0.35 * e})`);
    g.addColorStop(1, `hsla(${f.hue}, 100%, 50%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, R * 0.45, 0, TAU);
    c.fill();
    c.restore();

    c.strokeStyle = 'hsla(270, 30%, 10%, 0.7)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + f.spin;
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9);
    }
    c.stroke();

    const dot = Math.max(0.8, R * 0.022);
    c.fillStyle = 'hsla(270, 30%, 8%, 0.9)';
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + f.spin;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      c.moveTo(x + dot, y);
      c.arc(x, y, dot, 0, TAU);
    }
    c.fill();

    const pr = R * 0.14 * e;
    c.fillStyle = 'hsl(95, 35%, 22%)';
    c.beginPath();
    c.arc(0, 0, pr, 0, TAU);
    c.fill();
    c.strokeStyle = 'hsla(60, 60%, 72%, 0.85)';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + f.spin;
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * pr * 0.95, Math.sin(a) * pr * 0.95);
    }
    c.stroke();
  }

  /**
   * Lavender: a spike of tiny florets that turn violet from the bottom up.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawLavenderSpike(c, f, s) {
    const R = s.R, h = f.hue;
    const spike = R * 1.7 * easeOutBack(s.budIn);
    if (spike <= 0) return;

    if (s.bloom > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, -spike * 0.55, 0, 0, -spike * 0.55, spike * 0.65);
      g.addColorStop(0, `hsla(${h}, 100%, 70%, ${0.3 * s.eBloom})`);
      g.addColorStop(1, `hsla(${h}, 100%, 60%, 0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, -spike * 0.55, spike * 0.65, 0, TAU);
      c.fill();
      c.restore();
    }

    c.strokeStyle = 'hsl(120, 25%, 28%)';
    c.lineWidth = Math.max(1, R * 0.04);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -spike);
    c.stroke();

    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0 = bottom, 1 = top
      const open = clamp((s.bloom * 1.4 - t * 0.6) / 0.4);
      const side = i % 2 ? 1 : -1;
      const x = side * R * 0.16 * (1 - t * 0.55) * (0.5 + 0.5 * open);
      const y = -spike * (0.08 + t * 0.9);
      const r = R * (0.075 - t * 0.03) * (0.7 + 0.5 * open);
      const light = lerp(30, 62 + 8 * Math.sin(time * 3 + i), open);
      c.fillStyle = `hsla(${lerp(110, h, open)}, ${lerp(25, 75, open)}%, ${light}%, 0.95)`;
      c.beginPath();
      c.ellipse(x, y, r, r * 1.3, side * 0.5, 0, TAU);
      c.fill();
    }
  }

  /**
   * Dandelion seed head: a glowing puff of radiating seeds.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {HeadState} s
   */
  function drawPuff(c, f, s) {
    const R = s.R, e = s.eBloom, n = 44;
    const rr = R * 0.92 * e;
    if (rr <= 0) return;

    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rr * 1.15);
    g.addColorStop(0, `hsla(55, 60%, 90%, ${0.3 * e})`);
    g.addColorStop(1, 'hsla(55, 60%, 80%, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rr * 1.15, 0, TAU);
    c.fill();
    c.restore();

    c.strokeStyle = `hsla(${f.hue}, 40%, 92%, 0.55)`;
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN_ANGLE + f.spin;
      const l = rr * (0.82 + 0.18 * Math.sin(i * 7.3));
      c.moveTo(Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08);
      c.lineTo(Math.cos(a) * l, Math.sin(a) * l);
    }
    c.stroke();

    const d = Math.max(0.8, R * 0.03);
    c.fillStyle = 'hsla(55, 50%, 96%, 0.85)';
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN_ANGLE + f.spin;
      const l = rr * (0.82 + 0.18 * Math.sin(i * 7.3));
      const x = Math.cos(a) * l, y = Math.sin(a) * l;
      c.moveTo(x + d, y);
      c.arc(x, y, d, 0, TAU);
    }
    c.fill();

    c.fillStyle = 'hsl(70, 40%, 60%)';
    c.beginPath();
    c.arc(0, 0, R * 0.08, 0, TAU);
    c.fill();
  }

  /**
   * Curved leaf whose tip droops slightly, base at (x, y).
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} y
   * @param {number} angle  direction the leaf points
   * @param {number} L      length
   * @param {number} B      breadth
   * @param {number} d      side (+1 / -1), decides which way it droops
   * @param {number} hue    rim-light hue
   */
  function drawLeafShape(c, x, y, angle, L, B, d, hue) {
    if (L <= 0) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);

    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(L * 0.25, -B * 0.3 * d, L * 0.7, -B * 0.22 * d, L, L * 0.18 * d);
    c.bezierCurveTo(L * 0.72, B * 0.25 * d, L * 0.3, B * 0.22 * d, 0, 0);
    c.closePath();
    const lg = c.createLinearGradient(0, 0, L, 0);
    lg.addColorStop(0, 'hsl(155, 50%, 10%)');
    lg.addColorStop(0.6, 'hsl(135, 55%, 24%)');
    lg.addColorStop(1, 'hsl(110, 60%, 34%)');
    c.fillStyle = lg;
    c.fill();
    c.strokeStyle = `hsla(${hue + 20}, 100%, 65%, 0.25)`;
    c.lineWidth = 0.8;
    c.stroke();

    // midrib
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(L * 0.5, -B * 0.03 * d, L * 0.92, L * 0.15 * d);
    c.strokeStyle = 'hsla(90, 80%, 70%, 0.3)';
    c.stroke();
    c.restore();
  }

  /* ==================================================================
   * Species — 9 common, 3 rare and 2 legendary flower designs
   * ================================================================== */
  /** @type {LeafStyle} */
  const DEFAULT_LEAF = { min: 2, max: 4, tMin: 0.15, tMax: 0.68, lenMul: 1, wMul: 1, angMin: 0.55, angMax: 1.0 };
  /** @type {LeafStyle} */
  const ROSE_LEAF = { min: 2, max: 3, tMin: 0.2, tMax: 0.65, lenMul: 0.85, wMul: 1.15, angMin: 0.7, angMax: 1.1 };
  const PLAIN = [[0, 0, 100, 80, 1], [1, 0, 100, 50, 1]]; // placeholder paint for animated-hue rings

  /** @type {Record<string, SpeciesDef>} */
  const SPECIES = {
    /* ---------------------------- common ---------------------------- */

    // The original: three layers of pointed orange petals, glowing core
    lotus: {
      name: 'Fire Lotus', rarity: 'common',
      hues: [14, 20, 26, 32, 38],
      size: 1, front: true, centerY: 0, halo: 2.6, glint: true,
      bud: [[0, 22, 100, 62], [1, -5, 95, 40]],
      leaf: DEFAULT_LEAF,
      build() {
        const n0 = pick([7, 8, 9, 10]);
        const wr = rand(0.32, 0.42);
        const edge = [30, 82, 0.4];
        return ringSet([
          { n: n0, len: 1.0, wr, edge, vein: 0.78,
            stops: [[0, 25, 100, 78, 0.95], [0.3, 10, 100, 60, 0.95], [1, -6, 95, 42, 0.9]] },
          { n: n0, len: 0.78, wr: wr * 0.95, off: Math.PI / n0, delay: 0.28, edge, vein: 0.78,
            stops: [[0, 32, 100, 84, 0.95], [0.35, 16, 100, 64, 0.95], [1, 2, 100, 50, 0.92]] },
          { n: pick([5, 6, 7]), len: 0.5, wr: wr * 1.05, off: rand(0, TAU), delay: 0.56, edge, vein: 0.78,
            stops: [[0, 42, 100, 92, 0.97], [0.4, 26, 100, 72, 0.95], [1, 12, 100, 58, 0.92]] },
        ]);
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, f.sepals, 0.5, 0.16);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) {
          const cr = s.R * 0.24 * easeOutBack(clamp(s.bloom * 1.4));
          drawStamens(c, f, s, 14, 0.36, cr);
          drawCore(c, f, cr);
        }
      },
    },

    // Two rings of slim golden petals around a glowing seed disk
    daisy: {
      name: 'Golden Daisy', rarity: 'common',
      hues: [42, 46, 50],
      size: 1, front: true, centerY: 0, halo: 2.4, glint: false,
      bud: [[0, 0, 100, 60], [1, -12, 95, 38]],
      leaf: DEFAULT_LEAF,
      build() {
        const n = randInt(18, 22);
        return ringSet([
          { n, len: 1, wr: 0.12, twist: 0.6, stagger: 0.02, dur: 1.4, shape: roundPetal,
            edge: [10, 85, 0.35], vein: 0.85,
            stops: [[0, -18, 100, 40, 0.95], [0.35, -6, 100, 55, 0.95], [1, 6, 100, 72, 0.95]] },
          { n, len: 0.84, wr: 0.13, off: Math.PI / n, delay: 0.2, twist: 0.6, stagger: 0.02, dur: 1.4,
            shape: roundPetal, edge: [12, 88, 0.35], vein: 0.8,
            stops: [[0, -14, 100, 46, 0.95], [0.4, 0, 100, 62, 0.95], [1, 10, 100, 80, 0.95]] },
        ]);
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, 12, 0.42, 0.09);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawSeedDisk(c, f, s);
      },
    },

    // Five rings of round, overlapping petals around a glowing spiral
    rose: {
      name: 'Crimson Rose', rarity: 'common',
      hues: [346, 350, 354, 358],
      size: 0.9, front: true, centerY: 0, halo: 2.3, glint: false,
      bud: [[0, 8, 90, 48], [1, -4, 85, 28]],
      leaf: ROSE_LEAF,
      build() {
        const counts = [6, 5, 5, 4, 3];
        const lens = [1, 0.84, 0.68, 0.52, 0.36];
        let off = rand(0, TAU);
        return ringSet(counts.map((n, k) => {
          off += 2.4;
          return {
            n, len: lens[k], wr: 0.62, off, delay: k * 0.22, twist: 0.9, stagger: 0.05, dur: 1.6,
            shape: roundPetal, edge: [18, 78, 0.5],
            stops: [[0, -4, 85, 22 + k * 3, 0.97], [0.55, 0, 92, 40 + k * 4, 0.97], [1, 10, 100, 62 + k * 3, 0.97]],
          };
        }));
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, 5, 0.55, 0.15);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawRoseHeart(c, f, s);
      },
    },

    // Side-view cup that opens up and glows from inside like a lantern
    tulip: {
      name: 'Pink Tulip', rarity: 'common',
      hues: [318, 326, 334],
      size: 0.85, front: false, centerY: 0.5, halo: 2.1, glint: false,
      bud: [[0, 0, 100, 60], [1, 0, 90, 40]],
      leaf: { min: 2, max: 2, tMin: 0.02, tMax: 0.22, lenMul: 2.2, wMul: 0.42, angMin: 0.14, angMax: 0.34 },
      build() {
        return {
          paints: [
            { len: 1.05, stops: [[0, -10, 80, 28, 0.97], [0.6, 0, 90, 44, 0.97], [1, 8, 100, 60, 0.97]] },
            { len: 1.05, stops: [[0, -6, 85, 36, 0.97], [0.55, 4, 95, 55, 0.97], [1, 12, 100, 72, 0.97]] },
            { len: 1.05, stops: [[0, -4, 90, 42, 0.98], [0.5, 6, 100, 62, 0.98], [1, 14, 100, 80, 0.98]] },
          ],
          rings: [],
        };
      },
      draw(c, f, s) {
        const h = f.hue;
        const len = s.R * 1.05, wid = len * 0.36;
        const k = easeOutBack(s.budIn) * s.breathe;
        const open = easeInOutCubic(progress(f.age, s.L0, 1.8));

        c.save();
        c.scale(k, k);
        c.lineWidth = 1;

        // back petals
        c.fillStyle = f.grads[0];
        tulipPetal(c, len * 0.98, wid);
        c.fill();
        for (const side of [-1, 1]) {
          c.save();
          c.translate(side * wid * 0.3, 0);
          c.rotate(side * (0.1 + 0.32 * open));
          tulipPetal(c, len * 0.95, wid * 0.95);
          c.fill();
          c.restore();
        }

        // glowing heart + stamens, seen between the petals as the cup opens
        if (open > 0) {
          const gy = -len * 0.5, gr = len * 0.6;
          c.save();
          c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(0, gy, 0, 0, gy, gr);
          g.addColorStop(0, `hsla(${h + 35}, 100%, 78%, ${0.8 * open})`);
          g.addColorStop(0.4, `hsla(${h + 15}, 100%, 62%, ${0.3 * open})`);
          g.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
          c.fillStyle = g;
          c.beginPath();
          c.arc(0, gy, gr, 0, TAU);
          c.fill();
          c.restore();

          const rad = Math.max(1, s.R * 0.03);
          c.strokeStyle = `hsla(${h + 50}, 80%, 85%, ${0.8 * open})`;
          c.fillStyle = `hsla(${h + 55}, 100%, 88%, ${open})`;
          for (const x of [-0.3, 0, 0.3]) {
            const tx = wid * x, ty = -len * (x ? 0.62 : 0.68);
            c.beginPath();
            c.moveTo(0, -len * 0.15);
            c.lineTo(tx, ty);
            c.stroke();
            c.beginPath();
            c.arc(tx, ty, rad, 0, TAU);
            c.fill();
          }
        }

        // front petals
        c.strokeStyle = `hsla(${h + 20}, 100%, 85%, 0.45)`;
        c.fillStyle = f.grads[1];
        for (const side of [-1, 1]) {
          c.save();
          c.translate(side * wid * 0.42, len * 0.02);
          c.rotate(side * (0.05 + 0.24 * open));
          tulipPetal(c, len * 0.96, wid * 0.92);
          c.fill();
          c.stroke();
          c.restore();
        }
        c.fillStyle = f.grads[2];
        tulipPetal(c, len * 0.92, wid * 1.02);
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(0, -len * 0.1);
        c.lineTo(0, -len * 0.78);
        c.strokeStyle = `hsla(${h + 20}, 100%, 88%, 0.3)`;
        c.stroke();
        c.restore();
      },
    },

    // Six curled, freckled petals with long stamens
    lily: {
      name: 'Moon Lily', rarity: 'common',
      hues: [258, 268, 278],
      size: 1.1, front: true, centerY: 0, halo: 2.6, glint: true,
      bud: [[0, 40, 90, 85], [1, 0, 70, 55]],
      leaf: { min: 3, max: 5, tMin: 0.12, tMax: 0.78, lenMul: 0.95, wMul: 0.55, angMin: 0.5, angMax: 0.85 },
      build() {
        return ringSet([
          { n: 3, len: 1, wr: 0.34, twist: 0.9, stagger: 0.06, dur: 1.7, shape: lilyPetal,
            edge: [30, 88, 0.45], vein: 0.85, spots: 6,
            stops: [[0, 40, 100, 92, 0.97], [0.35, 10, 90, 72, 0.95], [1, -8, 80, 52, 0.92]] },
          { n: 3, len: 0.95, wr: 0.4, off: Math.PI / 3, delay: 0.2, twist: 0.9, stagger: 0.06, dur: 1.7,
            shape: lilyPetal, edge: [30, 90, 0.45], vein: 0.85, spots: 7,
            stops: [[0, 45, 100, 95, 0.97], [0.4, 15, 95, 76, 0.95], [1, -4, 85, 58, 0.92]] },
        ]);
      },
      draw(c, f, s) {
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom <= 0) return;
        const R = s.R, h = f.hue;

        // pale glowing throat
        c.save();
        c.globalCompositeOperation = 'lighter';
        const tr = R * 0.4;
        const g = c.createRadialGradient(0, 0, 0, 0, 0, tr);
        g.addColorStop(0, `hsla(75, 100%, 85%, ${0.75 * s.eBloom})`);
        g.addColorStop(0.5, `hsla(${h + 30}, 100%, 72%, ${0.25 * s.eBloom})`);
        g.addColorStop(1, `hsla(${h}, 100%, 60%, 0)`);
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, tr, 0, TAU);
        c.fill();
        c.restore();

        // long stamens grow out after the petals open
        const sp = easeOutCubic(progress(f.age, s.L0 + 0.7, 1.3));
        if (sp <= 0) return;
        const reach = R * 0.7 * sp;
        c.lineWidth = Math.max(0.8, R * 0.012);
        c.strokeStyle = `hsla(${h + 60}, 60%, 88%, 0.85)`;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = f.spin + (i * TAU) / 6 + Math.PI / 6;
          c.moveTo(0, 0);
          c.quadraticCurveTo(
            Math.cos(a + 0.3) * reach * 0.5, Math.sin(a + 0.3) * reach * 0.5,
            Math.cos(a) * reach, Math.sin(a) * reach
          );
        }
        c.stroke();

        c.fillStyle = 'hsl(28, 100%, 58%)';
        for (let i = 0; i < 6; i++) {
          const a = f.spin + (i * TAU) / 6 + Math.PI / 6;
          c.beginPath();
          c.ellipse(Math.cos(a) * reach, Math.sin(a) * reach, R * 0.055 * sp, R * 0.02 * sp, a + Math.PI / 2, 0, TAU);
          c.fill();
        }

        // pistil
        const px = Math.cos(f.spin) * R * 0.56 * sp, py = Math.sin(f.spin) * R * 0.56 * sp;
        c.strokeStyle = 'hsla(95, 70%, 80%, 0.9)';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(px, py);
        c.stroke();
        c.fillStyle = 'hsl(95, 80%, 85%)';
        c.beginPath();
        c.arc(px, py, Math.max(1.2, R * 0.03), 0, TAU);
        c.fill();
      },
    },

    // Five notched pale-pink petals
    sakura: {
      name: 'Cherry Blossom', rarity: 'common',
      hues: [338, 344, 350],
      size: 0.8, front: true, centerY: 0, halo: 2.3, glint: false,
      bud: [[0, 10, 80, 80], [1, 0, 70, 55]],
      leaf: DEFAULT_LEAF,
      build() {
        return ringSet([
          { n: 5, len: 1, wr: 0.48, twist: 1.0, stagger: 0.07, dur: 1.5, shape: notchedPetal,
            edge: [10, 92, 0.5], vein: 0.55,
            stops: [[0, 0, 90, 70, 0.96], [0.5, 4, 85, 84, 0.96], [1, 8, 80, 93, 0.96]] },
        ]);
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, 5, 0.4, 0.13);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) {
          const cr = s.R * 0.12 * easeOutBack(clamp(s.bloom * 1.4));
          drawStamens(c, f, s, 12, 0.42, cr);
          drawCore(c, f, cr);
        }
      },
    },

    // Four big papery scarlet petals around a dark heart
    poppy: {
      name: 'Scarlet Poppy', rarity: 'common',
      hues: [2, 6, 10],
      size: 1, front: true, centerY: 0, halo: 2.3, glint: false,
      bud: [[0, 90, 40, 35], [1, 100, 45, 22]],
      leaf: { ...DEFAULT_LEAF, wMul: 0.7 },
      build() {
        return ringSet([
          { n: 4, len: 1, wr: 0.82, twist: 0.8, stagger: 0.08, dur: 1.7, shape: roundPetal, edge: [15, 70, 0.45],
            stops: [[0, -6, 90, 30, 0.97], [0.5, 0, 95, 48, 0.96], [1, 6, 100, 58, 0.95]] },
          { n: 4, len: 0.84, wr: 0.8, off: Math.PI / 4, delay: 0.25, twist: 0.8, stagger: 0.08, dur: 1.7,
            shape: roundPetal, edge: [15, 75, 0.45],
            stops: [[0, -4, 90, 34, 0.97], [0.5, 2, 100, 52, 0.96], [1, 8, 100, 64, 0.95]] },
        ]);
      },
      draw(c, f, s) {
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawPoppyHeart(c, f, s);
      },
    },

    // A spike of florets that turn violet from the bottom up
    lavender: {
      name: 'Lavender', rarity: 'common',
      hues: [262, 270, 278],
      size: 0.75, front: false, centerY: 0.85, halo: 1.8, glint: false,
      bud: [[0, 0, 40, 50], [1, 0, 40, 35]],
      leaf: { min: 3, max: 5, tMin: 0.03, tMax: 0.45, lenMul: 1.3, wMul: 0.22, angMin: 0.25, angMax: 0.55 },
      build() {
        return { paints: [], rings: [] };
      },
      draw(c, f, s) {
        drawLavenderSpike(c, f, s);
      },
    },

    // Yellow bud that opens into a glowing seed puff
    dandelion: {
      name: 'Dandelion', rarity: 'common',
      hues: [48, 52],
      size: 0.85, front: true, centerY: 0, halo: 2.0, glint: false,
      bud: [[0, 0, 100, 55], [1, -5, 95, 45]],
      leaf: { min: 2, max: 3, tMin: 0.03, tMax: 0.2, lenMul: 1.5, wMul: 0.45, angMin: 0.5, angMax: 0.9 },
      build() {
        return { paints: [], rings: [] };
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, 10, 0.3, 0.06);
        if (s.bloom > 0) drawPuff(c, f, s);
        drawBud(c, f, s);
      },
    },

    /* ----------------------------- rare ----------------------------- */

    // Glassy, see-through icy petals
    crystalRose: {
      name: 'Crystal Rose', rarity: 'rare',
      hues: [188, 194, 200],
      size: 1, front: true, centerY: 0, halo: 2.8, glint: true,
      bud: [[0, 10, 80, 85], [1, 0, 70, 50]],
      leaf: ROSE_LEAF,
      build() {
        const counts = [7, 6, 5, 4, 3];
        const lens = [1, 0.84, 0.68, 0.52, 0.36];
        let off = rand(0, TAU);
        return ringSet(counts.map((n, k) => {
          off += 2.4;
          return {
            n, len: lens[k], wr: 0.6, off, delay: k * 0.22, twist: 1.0, stagger: 0.05, dur: 1.6,
            shape: roundPetal, edge: [10, 95, 0.75],
            stops: [[0, 20, 80, 55 + k * 4, 0.55], [0.6, 0, 90, 72 + k * 3, 0.6], [1, -10, 100, 90, 0.75]],
          };
        }));
      },
      draw(c, f, s) {
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawRoseHeart(c, f, s);
      },
    },

    // Petals ripple through northern-lights colors
    auroraLotus: {
      name: 'Aurora Lotus', rarity: 'rare',
      hues: [150, 165],
      size: 1.1, front: true, centerY: 0, halo: 2.8, glint: true,
      bud: [[0, 30, 90, 75], [1, 0, 80, 45]],
      leaf: DEFAULT_LEAF,
      build() {
        /** @type {HueFn} */
        const aurora = (f, i, n) => f.hue + 40 + Math.sin(time * 0.8 + (i / n) * TAU + f.phase) * 55;
        const edge = [60, 92, 0.5];
        return ringSet([
          { n: 10, len: 1, wr: 0.36, edge, vein: 0.8, hueFn: aurora, stops: PLAIN },
          { n: 10, len: 0.8, wr: 0.36, off: Math.PI / 10, delay: 0.25, edge, vein: 0.8, hueFn: aurora, stops: PLAIN },
          { n: 8, len: 0.58, wr: 0.4, off: rand(0, TAU), delay: 0.5, edge, vein: 0.75, hueFn: aurora, stops: PLAIN },
          { n: 6, len: 0.36, wr: 0.45, off: rand(0, TAU), delay: 0.75, edge, hueFn: aurora, stops: PLAIN },
        ]);
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, f.sepals, 0.5, 0.16);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) {
          const cr = s.R * 0.18 * easeOutBack(clamp(s.bloom * 1.4));
          drawStamens(c, f, s, 16, 0.3, cr);
          drawCore(c, f, cr);
        }
      },
    },

    // Deep-blue five-pointed star with a shining center
    sapphireStar: {
      name: 'Sapphire Star', rarity: 'rare',
      hues: [222, 230],
      size: 1.05, front: true, centerY: 0, halo: 2.8, glint: true,
      bud: [[0, 20, 90, 70], [1, 0, 80, 35]],
      leaf: DEFAULT_LEAF,
      build() {
        return ringSet([
          { n: 5, len: 1, wr: 0.5, twist: 1.4, stagger: 0.06, dur: 1.6, edge: [20, 92, 0.7], vein: 0.85,
            stops: [[0, 20, 100, 85, 0.97], [0.35, 0, 95, 58, 0.96], [1, -10, 90, 38, 0.94]] },
          { n: 5, len: 0.62, wr: 0.45, off: Math.PI / 5, delay: 0.3, twist: 1.4, stagger: 0.06, dur: 1.6,
            edge: [30, 95, 0.6], vein: 0.8,
            stops: [[0, 30, 100, 92, 0.97], [0.4, 10, 100, 72, 0.96], [1, 0, 95, 55, 0.94]] },
        ]);
      },
      draw(c, f, s) {
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawStarCore(c, f, s, 0.3);
      },
    },

    /* --------------------------- legendary --------------------------- */

    // Huge, four rings of rainbow petals that keep shifting color
    celestial: {
      name: 'Celestial Bloom', rarity: 'legendary',
      hues: [45],
      size: 1.7, front: true, centerY: 0, halo: 3.4, glint: true,
      bud: [[0, 0, 100, 85], [1, 0, 90, 55]],
      leaf: { ...DEFAULT_LEAF, min: 3, max: 5, lenMul: 1.15 },
      build() {
        /** @type {HueFn} */
        const rainbow = (f, i, n) => (i / n) * 360 + time * 40 + f.phase * 57;
        const edge = [0, 95, 0.55];
        return ringSet([
          { n: 12, len: 1, wr: 0.3, twist: 2.2, stagger: 0.04, dur: 2.2, edge, vein: 0.85, hueFn: rainbow, stops: PLAIN },
          { n: 12, len: 0.84, wr: 0.32, off: Math.PI / 12, delay: 0.3, twist: 2.2, stagger: 0.04, dur: 2.2,
            edge, vein: 0.85, hueFn: rainbow, stops: PLAIN },
          { n: 10, len: 0.64, wr: 0.36, off: rand(0, TAU), delay: 0.6, twist: 2, stagger: 0.04, dur: 2,
            edge, vein: 0.8, hueFn: rainbow, stops: PLAIN },
          { n: 8, len: 0.44, wr: 0.42, off: rand(0, TAU), delay: 0.9, twist: 2, stagger: 0.04, dur: 2,
            edge, hueFn: rainbow, stops: PLAIN },
        ]);
      },
      draw(c, f, s) {
        drawCalyx(c, f, s, 8, 0.5, 0.14);
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) drawStarCore(c, f, s, 0.26);
      },
    },

    // Petals that flicker like flames, with an ember fountain
    phoenix: {
      name: 'Phoenix Flame', rarity: 'legendary',
      hues: [16],
      size: 1.6, front: true, centerY: 0, halo: 3.2, glint: true,
      bud: [[0, 30, 100, 70], [1, -10, 100, 40]],
      leaf: { ...DEFAULT_LEAF, min: 3, max: 4 },
      build() {
        const edge = [30, 85, 0.45];
        return ringSet([
          { n: 11, len: 1, wr: 0.28, twist: 1.8, stagger: 0.04, dur: 2, flicker: 0.1, edge, vein: 0.7,
            stops: [[0, 40, 100, 90, 0.97], [0.35, 18, 100, 58, 0.95], [1, -16, 100, 40, 0.85]] },
          { n: 11, len: 0.8, wr: 0.3, off: Math.PI / 11, delay: 0.3, twist: 1.8, stagger: 0.04, dur: 2,
            flicker: 0.12, edge, vein: 0.7,
            stops: [[0, 45, 100, 92, 0.97], [0.4, 25, 100, 62, 0.95], [1, -8, 100, 46, 0.88]] },
          { n: 8, len: 0.56, wr: 0.34, off: rand(0, TAU), delay: 0.6, twist: 1.6, stagger: 0.04, dur: 1.8,
            flicker: 0.15, edge,
            stops: [[0, 50, 100, 96, 0.98], [0.4, 35, 100, 70, 0.95], [1, 5, 100, 55, 0.9]] },
        ]);
      },
      draw(c, f, s) {
        drawRings(c, f, s);
        drawBud(c, f, s);
        if (s.bloom > 0) {
          const cr = s.R * 0.2 * easeOutBack(clamp(s.bloom * 1.4));
          drawStamens(c, f, s, 16, 0.34, cr);
          drawCore(c, f, cr);
        }
      },
    },
  };

  const byRarity = (/** @type {Rarity} */ r) => Object.keys(SPECIES).filter((k) => SPECIES[k].rarity === r);
  const COMMON = byRarity('common');
  const RARE = byRarity('rare');
  const LEGENDARY = byRarity('legendary');

  /* ==================================================================
   * Flower
   * ================================================================== */
  class Flower {
    /**
     * @param {object} o
     * @param {number} o.xf               x position as a fraction of the garden width
     * @param {string} [o.kind]           key in SPECIES
     * @param {number} [o.z]              depth: ~0.45 (far) … 1 (near)
     * @param {number} [o.start]          absolute time the flower starts growing
     * @param {number | null} [o.hf]      height as a fraction of the garden height
     * @param {boolean} [o.planted]       planted by a tap
     * @param {boolean} [o.hero]          the big center flower
     * @param {boolean} [o.mystery]       a legendary attempt — decided just before it opens
     */
    constructor({ xf, kind = 'lotus', z = rand(0.62, 1), start = 0, hf = null, planted = false, hero = false, mystery = false }) {
      this.id = nextId++;
      this.kind = SPECIES[kind] ? kind : 'lotus';
      this.sp = SPECIES[this.kind];
      this.xf = xf;
      this.z = z;
      this.start = start;
      this.planted = planted;
      this.mystery = mystery;
      this.age = 0;
      this.hf = hf ?? (hero ? rand(0.56, 0.62) : rand(0.3, 0.55) * (0.85 + 0.15 * z));
      this.rf = rand(0.06, 0.085) * (0.35 + 0.65 * z) * (hero ? 1.3 : 1) * this.sp.size; // petal radius / unit
      // horizontal offsets of the stem's bezier control points (fraction of height)
      this.bend = [rand(-0.2, 0.2), rand(-0.25, 0.25), planted ? rand(-0.04, 0.04) : rand(-0.15, 0.15)];
      this.swayAmp = rand(0.012, 0.025);
      this.swaySpeed = rand(0.7, 1.1);
      this.phase = rand(0, TAU);
      this.spin = rand(0, TAU);
      this.tilt = rand(0.75, 1);
      // a mysterious bud grows slower and "charges" before it reveals what it is
      this.growDur = mystery ? rand(3, 3.4) : rand(2.2, 3.0) * (planted ? 0.8 : 1);
      this.bloomStart = mystery ? this.growDur + 1.8 : this.growDur * 0.92 + 0.35;
      this.sepals = pick([5, 6]);
      this.dying = 0;
      this.dead = false;

      this.hue = 0;
      /** @type {PaintDef[]} */
      this.paints = [];
      /** @type {RingDef[]} */
      this.rings = [];
      /** @type {CanvasGradient[]} */
      this.grads = [];
      this.budGrad = ctx.createLinearGradient(0, 0, 0, -1);
      this.gradR = -1;
      this.applySpecies();

      const ls = this.sp.leaf;
      const nl = randInt(ls.min, ls.max);
      let side = Math.random() < 0.5 ? -1 : 1;
      /** @type {LeafDef[]} */
      this.leaves = [];
      for (let i = 0; i < nl; i++) {
        this.leaves.push({
          t: lerp(ls.tMin, ls.tMax, (i + rand(0.2, 0.8)) / nl), // position along the stem
          side,
          lf: rand(0.1, 0.17) * ls.lenMul,
          wm: ls.wMul,
          ang: rand(ls.angMin, ls.angMax),
          phase: rand(0, TAU),
        });
        side = -side;
      }

      this.burst = false;
      this.announced = false;
      this.eventAt = 0;
      this.nextPollen = 0;
      this.beeChecked = false;
      this.P = new Float64Array(8); // stem control points x0,y0 … x3,y3
      this.R = 0; this.h = 0; this.g = 0; this.alpha = 1;
      this.hx = 0; this.hy = 0; this.hAng = 0; // stem tip + head angle
      this.cx = 0; this.cy = 0;                // visual center of the head

      // interaction: a spring pulls the head back to rest after a shake or drag
      this.offX = 0; this.offY = 0; this.velX = 0; this.velY = 0;
      this.held = false; this.dragTx = 0; this.dragTy = 0; this.strain = 0;
      this.shakeAt = 0;
      // picking: once cut, the head floats free while the stub fades away
      this.cutAt = 0; this.cutT = 1; this.pieceLen = 0;
      this.carried = false; this.releasedAt = 0; this.nextScent = 0;
      this.free = { x: 0, y: 0, vx: 0, vy: 0, ang: 0, va: 0, ox: 0, oy: 0 };
    }

    applySpecies() {
      this.hue = pick(this.sp.hues) + rand(-4, 4);
      const { paints, rings } = this.sp.build();
      this.paints = paints;
      this.rings = rings;
      this.gradR = -1;
    }

    /** @param {string} kind */
    setSpecies(kind) {
      const next = SPECIES[kind] || SPECIES.lotus;
      this.rf *= next.size / this.sp.size;
      this.kind = SPECIES[kind] ? kind : 'lotus';
      this.sp = next;
      this.applySpecies();
    }

    stemWidth() {
      return (1.6 + 3.2 * this.z) * (unit / 800) + 1.2;
    }

    /** @param {number} dt */
    stepSpring(dt) {
      const tx = this.held ? this.dragTx : 0, ty = this.held ? this.dragTy : 0;
      const k = this.held ? 260 : 140, damp = this.held ? 22 : 7;
      const n = Math.ceil(dt / SUBSTEP);
      for (let i = 0; i < n; i++) {
        const st = dt / n;
        this.velX += ((tx - this.offX) * k - this.velX * damp) * st;
        this.velY += ((ty - this.offY) * k - this.velY * damp) * st;
        this.offX += this.velX * st;
        this.offY += this.velY * st;
      }
    }

    /** @param {number} dt */
    update(dt) {
      this.age = time - this.start;
      const z = this.z;
      const R = this.rf * unit;
      const baseY = WH + 12 - (1 - z) * WH * 0.06;
      const baseX = this.xf * WW;
      const h = Math.max(40, Math.min(this.hf * WH, baseY - R * 1.3 - 12));
      const g = easeInOutCubic(progress(this.age, 0, this.growDur));
      const sway =
        (windNow * 0.6 + Math.sin(time * this.swaySpeed + this.phase) * 0.4) *
        this.swayAmp * h * (reduceMotion ? 0.3 : 1);

      this.stepSpring(dt);
      if (!this.held) this.strain = 0;
      const ox = this.offX, oy = this.offY;

      const P = this.P;
      P[0] = baseX;                                              P[1] = baseY;
      P[2] = baseX + this.bend[0] * h + sway * 0.2 + ox * 0.15;  P[3] = baseY - h * 0.33 + oy * 0.1;
      P[4] = baseX + this.bend[1] * h + sway * 0.6 + ox * 0.55;  P[5] = baseY - h * 0.66 + oy * 0.45;
      P[6] = baseX + this.bend[2] * h + sway + ox;               P[7] = baseY - h + oy;

      this.R = R;
      this.h = h;
      this.g = g;

      if (this.cutAt) {
        this.updatePicked(dt);
        return;
      }

      this.hx = bez(P[0], P[2], P[4], P[6], g);
      this.hy = bez(P[1], P[3], P[5], P[7], g);
      const dx = bezD(P[0], P[2], P[4], P[6], g);
      const dy = bezD(P[1], P[3], P[5], P[7], g);
      // 0 = pointing straight up; the head also lags a little behind fast movement
      this.hAng = Math.atan2(dy, dx) + Math.PI / 2 + clamp(this.velX * 0.0007, -0.5, 0.5);
      const off = R * this.sp.centerY;
      this.cx = this.hx + Math.sin(this.hAng) * off;
      this.cy = this.hy - Math.cos(this.hAng) * off;

      const L0 = this.bloomStart;
      if (this.mystery && this.age > L0 - 0.15) this.resolveMystery();
      if (reduceMotion || this.dying) return;

      // sparkles trailing the growing tip (and swirling around a charging mystery bud)
      if (g > 0 && g < 1 && Math.random() < dt * 22 * z) spawnTipSpark(this.hx, this.hy, this.hue);
      if (this.mystery && this.age > this.growDur && Math.random() < dt * 14) {
        spawnTipSpark(this.cx, this.cy - R * 0.4, rand(0, 360));
      }

      // burst of sparks as the flower opens (only if we actually watched it open)
      if (!this.burst && this.age > L0 + 0.6) {
        this.burst = true;
        if (this.age < L0 + 1.5) spawnBurst(this.cx, this.cy, this.hue, R);
      }

      // rare / legendary bloom moment
      if (this.sp.rarity !== 'common' && !this.announced && this.age > L0 + 0.4) {
        this.announced = true;
        if (this.age < L0 + 1.5) {
          this.eventAt = time;
          if (this.sp.rarity === 'legendary') legendaryBloom(this);
          else rareBloom(this);
        }
      }

      // a bee may come to visit once it is open
      if (!this.beeChecked && this.age > L0 + 1.8) {
        this.beeChecked = true;
        maybeSpawnBee(this);
      }

      // drifting pollen once fully open; legendaries also send up a fountain of sparks
      if (this.age > L0 + 2.4 && time > this.nextPollen) {
        this.nextPollen = time + rand(0.5, 1.6);
        if (this.kind === 'dandelion') spawnSeeds(this, 1);
        else spawnPollen(this.cx, this.cy, this.hue, R);
      }
      if (this.sp.rarity === 'legendary' && this.age > L0 + 1 && Math.random() < dt * 26) spawnFountain(this);
    }

    // a legendary attempt: either it really is legendary, or it fizzles into something else
    resolveMystery() {
      this.mystery = false;
      if (Math.random() < CONFIG.legendaryChance) return;
      this.setSpecies(Math.random() < 0.45 ? pick(RARE) : pick(COMMON));
      if (!reduceMotion) spawnBurst(this.cx, this.cy - this.R * 0.3, 250, this.R, 24, 10);
      addText(this.cx, this.cy - this.R * 1.5, 'not this time…', 'hsla(260, 45%, 86%, 1)');
    }

    /** @param {number} dt */
    updatePicked(dt) {
      const fr = this.free;
      const n = Math.ceil(dt / SUBSTEP);
      for (let i = 0; i < n; i++) {
        const st = dt / n;
        if (this.carried && press && press.f === this) {
          // follow the finger, keeping the spot where it was grabbed
          const tx = press.x - fr.ox, ty = press.y - fr.oy;
          fr.vx += ((tx - fr.x) * 160 - fr.vx * 16) * st;
          fr.vy += ((ty - fr.y) * 160 - fr.vy * 16) * st;
        } else {
          // let go: drift gently up and away on the breeze
          fr.vx += (windNow * 25 - fr.vx) * 1.2 * st;
          fr.vy += (-40 - fr.vy) * 1.2 * st;
        }
        fr.x += fr.vx * st;
        fr.y += fr.vy * st;
        // the head leans into the motion, then settles
        const lean = clamp(fr.vx * 0.0025, -0.7, 0.7);
        fr.va += ((lean - fr.ang) * 60 - fr.va * 8) * st;
        fr.ang += fr.va * st;
      }

      this.hx = fr.x;
      this.hy = fr.y;
      this.hAng = fr.ang;
      const off = this.R * this.sp.centerY;
      this.cx = this.hx + Math.sin(this.hAng) * off;
      this.cy = this.hy - Math.cos(this.hAng) * off;

      if (!reduceMotion && time > this.nextScent) {
        this.nextScent = time + rand(0.15, 0.3);
        spawnScent(this.cx, this.cy - this.R * 0.4, this.hue, this.R);
      }
      if ((this.releasedAt && time - this.releasedAt > 6) || fr.y < -this.R * 4) this.dead = true;
    }

    // a quick tap: the flower wobbles on its spring and shakes loose some pollen
    shake() {
      const kick = 420 * (unit / 800 + 0.3);
      this.velX += (Math.random() < 0.5 ? -1 : 1) * kick;
      this.velY -= kick * 0.12;
      this.shakeAt = time;
      if (this.kind === 'dandelion' && this.age > this.bloomStart + 1) spawnSeeds(this, 12);
      else for (let i = 0; i < 6; i++) spawnPollen(this.cx, this.cy, this.hue, this.R);
      spawnBurst(this.cx, this.cy, this.hue, this.R * 0.6, 10);
    }

    // pulled up far enough: the stem snaps and the flower comes away in your hand
    cut() {
      const P = this.P;
      this.cutAt = time;
      this.cutT = rand(0.35, 0.5);
      this.held = false;
      this.strain = 0;
      this.carried = true;
      this.pieceLen = Math.min(this.h * (1 - this.cutT) * 0.5, this.R * 3.2);
      const fr = this.free;
      fr.x = this.hx;
      fr.y = this.hy;
      fr.vx = 0;
      fr.vy = -80;
      fr.ang = this.hAng;
      fr.va = 0;

      const sx = bez(P[0], P[2], P[4], P[6], this.cutT);
      const sy = bez(P[1], P[3], P[5], P[7], this.cutT);
      spawnBurst(sx, sy, 95, this.R * 0.5, 16); // green snap at the cut
      spawnBurst(this.cx, this.cy, this.hue, this.R, 20);
      for (let i = 0; i < 4; i++) spawnScent(this.cx, this.cy - this.R * 0.3, this.hue, this.R);
    }

    release() {
      this.carried = false;
      this.releasedAt = time;
    }

    // rough horizontal extent, for skipping flowers that are off-screen
    /** @returns {boolean} */
    visible() {
      const m = this.R * 3.2 + 80;
      const minX = Math.min(this.P[0], this.hx) - m, maxX = Math.max(this.P[0], this.hx) + m;
      return maxX > viewL && minX < viewR;
    }

    draw() {
      if (this.age <= 0 || !this.visible()) return;
      let alpha = lerp(0.45, 1, clamp((this.z - 0.45) / 0.55));
      if (this.dying) alpha *= 1 - progress(time, this.dying, 1.2);
      if (alpha <= 0) return;

      if (this.cutAt) {
        // what's left in the ground: a stub that fades away
        const stub = alpha * (1 - progress(time, this.cutAt + 0.8, 1.5));
        if (stub <= 0) return;
        const end = Math.min(this.g, this.cutT);
        const P = this.P;
        ctx.globalAlpha = stub;
        for (const lf of this.leaves) if (lf.t < end - 0.04) this.drawLeaf(lf);
        this.drawStem(end);
        ctx.fillStyle = 'hsl(95, 70%, 75%)';
        ctx.beginPath();
        ctx.arc(bez(P[0], P[2], P[4], P[6], end), bez(P[1], P[3], P[5], P[7], end),
          Math.max(1.2, this.stemWidth() * 0.3), 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      this.alpha = alpha;
      ctx.globalAlpha = alpha;
      for (const lf of this.leaves) this.drawLeaf(lf);
      this.drawStem(this.g);
      this.drawHead();
      if (this.g > 0 && this.g < 1) this.drawTip();
      if (CONFIG.showNames && (this.planted || this.sp.rarity !== 'common')) this.drawLabel();
      ctx.globalAlpha = 1;
    }

    // drawn in a later pass so the picked flower sits in front of everything
    drawPicked() {
      if (!this.cutAt) return;
      const a = this.releasedAt ? 1 - progress(time, this.releasedAt + 3.5, 2.5) : 1;
      if (a <= 0) return;
      this.alpha = a;
      ctx.globalAlpha = a;
      this.drawPiece();
      this.drawHead();
      ctx.globalAlpha = 1;
    }

    // the short piece of stem that came away with the picked flower
    drawPiece() {
      const c = ctx, fr = this.free, len = this.pieceLen;
      const dirX = -Math.sin(fr.ang), dirY = Math.cos(fr.ang); // "down" from the head
      const swing = clamp(-fr.vx * 0.06, -len * 0.45, len * 0.45);
      const ex = this.hx + dirX * len + swing * 0.6, ey = this.hy + dirY * len;
      const mx = this.hx + dirX * len * 0.5 + swing, my = this.hy + dirY * len * 0.5;
      const w = this.stemWidth() * 0.75;

      // one leaf, about halfway down
      const t = 0.55, u = 1 - t;
      const lx = u * u * this.hx + 2 * u * t * mx + t * t * ex;
      const ly = u * u * this.hy + 2 * u * t * my + t * t * ey;
      const up = Math.atan2(-dirY, -dirX);
      const L = Math.min(this.R * 1.1, len * 0.6);
      drawLeafShape(c, lx, ly, up + 0.85, L, L * 0.8, 1, this.hue);

      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(this.hx, this.hy);
      c.quadraticCurveTo(mx, my, ex, ey);
      c.strokeStyle = `hsl(135, 50%, ${16 + 12 * this.z}%)`;
      c.lineWidth = w;
      c.stroke();
      c.strokeStyle = `hsla(${this.hue + 20}, 100%, 70%, 0.35)`;
      c.lineWidth = Math.max(0.8, w * 0.25);
      c.stroke();

      // fresh cut end
      c.fillStyle = 'hsl(95, 70%, 75%)';
      c.beginPath();
      c.arc(ex, ey, w * 0.55, 0, TAU);
      c.fill();
    }

    /** @param {number} tEnd  how far along the stem to draw (0–1) */
    drawStem(tEnd) {
      const c = ctx, P = this.P, z = this.z;
      if (tEnd <= 0.001) return;
      const steps = Math.max(2, Math.ceil(36 * tEnd));
      const w0 = this.stemWidth();
      const w1 = w0 * 0.4;
      const cx = [], cy = [], nxs = [], nys = [], ws = [];

      c.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (tEnd * i) / steps;
        const x = bez(P[0], P[2], P[4], P[6], t);
        const y = bez(P[1], P[3], P[5], P[7], t);
        const dx = bezD(P[0], P[2], P[4], P[6], t);
        const dy = bezD(P[1], P[3], P[5], P[7], t);
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const w = lerp(w0, w1, t) / 2;
        if (i === 0) c.moveTo(x + nx * w, y + ny * w);
        else c.lineTo(x + nx * w, y + ny * w);
        cx.push(x); cy.push(y); nxs.push(nx); nys.push(ny); ws.push(w);
      }
      for (let i = steps; i >= 0; i--) c.lineTo(cx[i] - nxs[i] * ws[i], cy[i] - nys[i] * ws[i]);
      c.closePath();

      const grad = c.createLinearGradient(0, P[1], 0, P[7]);
      grad.addColorStop(0, `hsl(160, 45%, ${6 + 6 * z}%)`);
      grad.addColorStop(1, `hsl(130, 55%, ${18 + 14 * z}%)`);
      c.fillStyle = grad;
      c.fill();

      // warm rim light along one edge (brighter while the stem is under strain)
      c.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = cx[i] + nxs[i] * ws[i] * 0.45, y = cy[i] + nys[i] * ws[i] * 0.45;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = `hsla(${this.hue + 20}, 100%, ${70 + 20 * this.strain}%, ${0.35 * z + 0.5 * this.strain})`;
      c.lineWidth = Math.max(0.8, w0 * 0.18);
      c.stroke();
    }

    /** @param {LeafDef} lf */
    drawLeaf(lf) {
      const p = progress(this.g, lf.t, 0.22);
      if (p <= 0) return;
      const P = this.P, t = lf.t;
      const x = bez(P[0], P[2], P[4], P[6], t);
      const y = bez(P[1], P[3], P[5], P[7], t);
      const ang = Math.atan2(bezD(P[1], P[3], P[5], P[7], t), bezD(P[0], P[2], P[4], P[6], t));
      const a = ang + lf.side * (lf.ang + Math.sin(time * 1.2 + lf.phase) * 0.06);
      const L = lf.lf * Math.min(unit * (0.6 + 0.4 * this.z), this.h * 1.1) * easeOutBack(p);
      drawLeafShape(ctx, x, y, a, L, L * lf.wm, lf.side, this.hue);
    }

    /** @param {number} R */
    ensureGrads(R) {
      if (this.gradR === R) return;
      this.gradR = R;
      const h = this.hue;
      this.grads = this.paints.map((p) => {
        const gr = ctx.createLinearGradient(0, 0, 0, -R * p.len);
        for (const [o, dh, sat, l, a] of p.stops) gr.addColorStop(o, `hsla(${h + dh}, ${sat}%, ${l}%, ${a})`);
        return gr;
      });
      this.budGrad = ctx.createLinearGradient(0, 0, 0, -R * 0.62);
      for (const [o, dh, sat, l] of this.sp.bud) this.budGrad.addColorStop(o, `hsl(${h + dh}, ${sat}%, ${l}%)`);
    }

    drawHead() {
      const age = this.age;
      const budIn = progress(age, this.growDur * 0.72, 0.6);
      if (budIn <= 0) return;
      if (this.mystery) {
        this.drawMysteryBud(budIn);
        return;
      }
      const bloom = progress(age, this.bloomStart, 2.0);
      /** @type {HeadState} */
      const s = {
        R: this.R,
        budIn,
        L0: this.bloomStart,
        bloom,
        eBloom: easeOutCubic(bloom),
        breathe: 1 + Math.sin(time * 1.6 + this.phase) * 0.025 * bloom,
      };
      this.ensureGrads(this.R);
      const special = this.sp.rarity !== 'common';

      const c = ctx;
      c.save();
      c.translate(this.hx, this.hy);
      c.rotate(this.hAng);
      if (this.shakeAt) {
        // quick, fading wiggle after a tap
        const st = time - this.shakeAt;
        c.rotate(Math.sin(st * 28) * 0.22 * Math.exp(-st * 3.5));
      }
      if (bloom > 0) {
        if (this.sp.rarity === 'legendary') drawGodRays(c, this, s);
        drawHalo(c, this, s);
      }
      if (this.sp.front) c.scale(1, this.tilt);
      this.sp.draw(c, this, s);
      if (special && bloom > 0.5) drawShimmer(c, this, s);
      c.restore();

      if (this.sp.glint && bloom > 0) drawGlint(c, this, s);
      if (special && bloom > 0) drawRarityExtras(c, this, s);
    }

    // shimmering, color-shifting bud that charges up before revealing what it is
    /** @param {number} budIn */
    drawMysteryBud(budIn) {
      const c = ctx, R = this.R;
      const span = Math.max(0.1, this.bloomStart - 0.15 - this.growDur);
      const charge = progress(this.age, this.growDur, span);
      const k = easeOutBack(budIn);
      const hh = (time * 80 + this.phase * 57) % 360;
      const pulse = 0.6 + 0.4 * Math.sin(time * (4 + charge * 8));
      const tremble = charge > 0.55 && !reduceMotion ? Math.sin(time * 45) * (charge - 0.55) * 0.18 : 0;
      const by = -R * 0.38 * k;

      c.save();
      c.translate(this.hx, this.hy);
      c.rotate(this.hAng + tremble);

      c.save();
      c.globalCompositeOperation = 'lighter';
      const ar = R * (1.3 + charge * 1.6) * k + 1;
      const ag = c.createRadialGradient(0, by, 0, 0, by, ar);
      ag.addColorStop(0, `hsla(${hh}, 100%, 75%, ${(0.25 + 0.4 * charge) * pulse})`);
      ag.addColorStop(1, `hsla(${hh + 60}, 100%, 60%, 0)`);
      c.fillStyle = ag;
      c.beginPath();
      c.arc(0, by, ar, 0, TAU);
      c.fill();
      c.restore();

      c.scale(k, k);
      const g = c.createLinearGradient(0, 0, 0, -R * 0.8);
      g.addColorStop(0, `hsl(${hh}, 100%, ${70 + 15 * pulse}%)`);
      g.addColorStop(1, `hsl(${hh + 70}, 100%, 55%)`);
      c.fillStyle = g;
      pointedPetal(c, R * 0.8, R * 0.5);
      c.fill();
      c.fillStyle = 'hsl(145, 45%, 24%)';
      for (const side of [-1, 1]) {
        c.save();
        c.rotate(side * 0.35);
        pointedPetal(c, R * 0.5, R * 0.18);
        c.fill();
        c.restore();
      }
      c.restore();

      // sparkles circling the bud, faster and closer as it charges
      const d = R * 0.38 * k;
      const bx = this.hx + Math.sin(this.hAng) * d, bw = this.hy - Math.cos(this.hAng) * d;
      const n = 3 + Math.round(charge * 4);
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const a = time * (1.6 + charge * 4) + (i * TAU) / n;
        const rr = R * (1 - charge * 0.35) * k;
        c.fillStyle = `hsla(${(hh + i * 50) % 360}, 100%, 85%, 0.9)`;
        drawSparkle(c, bx + Math.cos(a) * rr, bw + Math.sin(a) * rr * 0.6, R * 0.07 + 1, time * 3 + i);
      }
      c.restore();
    }

    // glowing point of light that "draws" the stem as it grows
    drawTip() {
      const c = ctx;
      const r = (7 + 7 * this.z) * (unit / 800 + 0.4);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const tg = c.createRadialGradient(this.hx, this.hy, 0, this.hx, this.hy, r);
      tg.addColorStop(0, `hsla(${this.hue + 35}, 100%, 85%, 0.95)`);
      tg.addColorStop(0.35, `hsla(${this.hue + 15}, 100%, 60%, 0.45)`);
      tg.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);
      c.fillStyle = tg;
      c.beginPath();
      c.arc(this.hx, this.hy, r, 0, TAU);
      c.fill();
      c.restore();
    }

    // the flower's name floats above it for a few seconds after it opens
    drawLabel() {
      const rarity = this.sp.rarity;
      const hold = rarity === 'legendary' ? 6 : rarity === 'rare' ? 4.5 : 3;
      const a = progress(this.age, this.bloomStart + 0.2, 0.6) * (1 - progress(this.age, this.bloomStart + hold, 1.2));
      if (a <= 0) return;
      const c = ctx;
      const size = Math.round(clamp(unit * 0.022, 12, 17) * (rarity === 'legendary' ? 1.3 : 1));
      const top = this.R * (this.sp.front ? 1.25 : 0.75) + 10;
      const name = this.sp.name;
      c.save();
      c.globalAlpha = this.alpha * a;
      c.font = `italic ${size}px Georgia, "Times New Roman", serif`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.shadowColor = rarity === 'legendary' ? 'hsl(42, 100%, 55%)' : `hsl(${this.hue}, 100%, 55%)`;
      c.shadowBlur = rarity === 'common' ? 10 : 16;
      c.fillStyle = rarity === 'legendary' ? 'hsl(45, 100%, 82%)' : `hsl(${this.hue + 20}, 100%, 86%)`;
      const text = rarity === 'legendary' ? `✦ ${name} ✦` : rarity === 'rare' ? `✧ ${name} ✧` : name;
      c.fillText(text, this.cx, this.cy - top + (1 - a) * 6);
      c.restore();
    }
  }

  /* ==================================================================
   * Particles (sparks, pollen, seeds — world space; embers — screen space)
   * ================================================================== */
  const MAX_PARTICLES = 1000;

  /**
   * @param {boolean} initial  scatter over the screen instead of starting at the bottom
   * @returns {ParticleData}
   */
  function makeEmber(initial) {
    const life = rand(7, 15);
    return {
      ember: true,
      x: rand(0, W),
      y: initial ? rand(H * 0.2, H) : H + rand(0, 20),
      vx: rand(-5, 5), vy: -rand(10, 30),
      life, age: initial ? rand(0, life * 0.8) : 0,
      size: rand(0.6, 2), hue: rand(16, 42), sat: 100, light: rand(58, 78),
      drag: 0, gravity: 0, windK: 10, flick: rand(1.5, 5), phase: rand(0, TAU), wobble: rand(4, 12),
    };
  }

  function seedEmbers() {
    let n = CONFIG.embers || clamp(Math.round((W * H) / 16000), 30, 120);
    if (reduceMotion) n = Math.round(n / 2);
    embers = [];
    for (let i = 0; i < n; i++) embers.push(makeEmber(true));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {number} R
   * @param {number} [count]
   * @param {number} [sat]
   */
  function spawnBurst(x, y, hue, R, count = 28, sat = 100) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const a = rand(0, TAU), sp = rand(40, 160) * clamp(R / 60, 0.5, 1.6);
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.9, 1.9), age: 0, size: rand(0.8, 2.2),
        hue: hue + rand(0, 30), sat, light: rand(65, 85),
        drag: 2.4, gravity: 18, windK: 4, flick: rand(8, 14), phase: rand(0, TAU), wobble: 0,
      });
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   */
  function spawnTipSpark(x, y, hue) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x, y, vx: rand(-20, 20), vy: rand(-10, 25),
      life: rand(0.5, 1.1), age: 0, size: rand(0.6, 1.6),
      hue: hue + rand(5, 30), sat: 100, light: rand(65, 85),
      drag: 1.5, gravity: 10, windK: 4, flick: rand(8, 14), phase: rand(0, TAU), wobble: 0,
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {number} R
   */
  function spawnPollen(x, y, hue, R) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x: x + rand(-R * 0.2, R * 0.2), y,
      vx: rand(-8, 8), vy: -rand(12, 30),
      life: rand(3, 5.5), age: 0, size: rand(0.8, 1.8),
      hue: hue + rand(10, 30), sat: 100, light: rand(65, 85),
      drag: 0.2, gravity: -2, windK: 10, flick: 3, phase: rand(0, TAU), wobble: 14,
    });
  }

  /**
   * Dandelion seeds drifting away on the breeze.
   * @param {Flower} f
   * @param {number} count
   */
  function spawnSeeds(f, count) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const a = rand(0, TAU);
      particles.push({
        x: f.cx + Math.cos(a) * f.R * 0.6, y: f.cy + Math.sin(a) * f.R * 0.6,
        vx: Math.cos(a) * rand(20, 50) + rand(-10, 10), vy: -rand(15, 40),
        life: rand(4, 7), age: 0, size: rand(1, 1.8),
        hue: 55, sat: 40, light: 94,
        drag: 0.5, gravity: -3, windK: 30, flick: 2, phase: rand(0, TAU), wobble: 20,
      });
    }
  }

  /** @param {Flower} f */
  function spawnFountain(f) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x: f.cx + rand(-f.R * 0.2, f.R * 0.2), y: f.cy,
      vx: rand(-30, 30), vy: -rand(60, 140),
      life: rand(1.2, 2.2), age: 0, size: rand(0.8, 2),
      hue: f.kind === 'celestial' ? rand(0, 360) : f.hue + rand(0, 35), sat: 100, light: rand(65, 85),
      drag: 0.6, gravity: 30, windK: 6, flick: rand(6, 12), phase: rand(0, TAU), wobble: 0,
    });
  }

  /**
   * Moves and draws a particle list with additive blending.
   * @param {ParticleData[]} list
   * @param {number} dt
   */
  function stepParticles(list, dt) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = list.length - 1; i >= 0; i--) {
      let p = list[i];
      p.age += dt;
      if (p.age >= p.life || (p.ember && p.y < -20)) {
        if (p.ember) {
          p = list[i] = makeEmber(false);
        } else {
          list[i] = list[list.length - 1];
          list.pop();
          continue;
        }
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += p.gravity * dt;
      p.x += (p.vx + windNow * p.windK + Math.sin(time * 2 + p.phase) * p.wobble) * dt;
      p.y += p.vy * dt;

      if (!p.ember && !inView(p.x, p.y, 20)) continue;
      const life = p.age / p.life;
      let a = Math.min(1, life * 6) * (1 - life);
      a *= 0.55 + 0.45 * Math.sin(time * p.flick + p.phase);
      if (a <= 0.01) continue;

      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
      if (p.size > 1.2) {
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 60%, ${a * 0.18})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ==================================================================
   * Scent — wavy ribbons rising from a picked flower
   * ================================================================== */
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {number} R
   */
  function spawnScent(x, y, hue, R) {
    if (scents.length > 60) return;
    const k = unit / 800 + 0.4;
    scents.push({
      x: x + rand(-R * 0.35, R * 0.35), y,
      vx: rand(-6, 6), vy: -rand(22, 38),
      age: 0, life: rand(2.2, 3.2),
      hue: hue + rand(-10, 30),
      amp: rand(4, 8) * k, len: rand(26, 44) * k,
      phase: rand(0, TAU), w: rand(1.2, 2.2),
    });
  }

  /** @param {number} dt */
  function updateScents(dt) {
    if (!scents.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = scents.length - 1; i >= 0; i--) {
      const s = scents[i];
      s.age += dt;
      if (s.age >= s.life) {
        scents[i] = scents[scents.length - 1];
        scents.pop();
        continue;
      }
      s.x += (s.vx + windNow * 8) * dt;
      s.y += s.vy * dt;
      const t = s.age / s.life;
      const a = Math.min(1, t * 4) * (1 - t);
      const amp = s.amp * (0.6 + t * 1.2), len = s.len * (0.7 + t * 0.6);

      ctx.beginPath();
      for (let j = 0; j <= 14; j++) {
        const k = j / 14;
        const x = s.x + Math.sin(k * TAU * 1.2 + s.phase + time * 4) * amp * (0.4 + k * 0.6);
        const y = s.y - k * len;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${s.hue}, 100%, 85%, ${a * 0.18})`;
      ctx.lineWidth = s.w * 4;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${s.hue}, 100%, 82%, ${a * 0.75})`;
      ctx.lineWidth = s.w;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ==================================================================
   * Floating text
   * ================================================================== */
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {string} color
   */
  function addText(x, y, text, color) {
    texts.push({ x, y, text, color, age: 0, life: 2.6 });
  }

  /** @param {number} dt */
  function updateTexts(dt) {
    if (!texts.length) return;
    const size = Math.round(clamp(unit * 0.022, 12, 17));
    ctx.save();
    ctx.font = `italic ${size}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.age += dt;
      if (t.age >= t.life) {
        texts.splice(i, 1);
        continue;
      }
      t.y -= 14 * dt;
      const k = t.age / t.life;
      ctx.globalAlpha = Math.min(1, k * 5) * (1 - k);
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(160, 120, 255, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  /* ==================================================================
   * Rare / legendary moments
   * ================================================================== */
  /**
   * @param {'rare' | 'legendary'} rarity
   * @param {string} name
   */
  function showBanner(rarity, name) {
    bannerTag.textContent = rarity === 'legendary' ? '✦ Legendary bloom ✦' : '✧ Rare bloom ✧';
    bannerName.textContent = name;
    banner.className = `banner ${rarity}`;
    void banner.offsetWidth; // restart the CSS animation
    banner.classList.add('show');
  }

  /** @param {Flower} f */
  function flashAt(f) {
    const sx = (f.cx - cam.x) * cam.zoom, sy = (f.cy - cam.y) * cam.zoom;
    flashEl.style.setProperty('--fx', `${((sx / W) * 100).toFixed(1)}%`);
    flashEl.style.setProperty('--fy', `${((sy / H) * 100).toFixed(1)}%`);
    flashEl.classList.remove('go');
    void flashEl.offsetWidth;
    flashEl.classList.add('go');
  }

  /** @param {Flower} f */
  function rareBloom(f) {
    spawnBurst(f.cx, f.cy, f.hue, f.R, 40);
    if (f.planted) showBanner('rare', f.sp.name);
  }

  /** @param {Flower} f */
  function legendaryBloom(f) {
    for (let k = 0; k < 3; k++) {
      spawnBurst(f.cx, f.cy, f.kind === 'celestial' ? rand(0, 360) : f.hue + k * 12, f.R * 1.5, 40);
    }
    cam.shakeAt = time;
    flashAt(f);
    showBanner('legendary', f.sp.name);
  }

  /* ==================================================================
   * Bees — a few visit open flowers, hover, hop to another, then leave
   * ================================================================== */
  const maxBees = () => (W < 700 ? 2 : 3);

  /**
   * A random open flower (not picked, not fading), preferring ones on screen.
   * @param {Flower | null} exclude
   * @returns {Flower | null}
   */
  function pickBloomed(exclude) {
    const open = flowers.filter((f) => f !== exclude && !f.cutAt && !f.dying && f.age > f.bloomStart + 1.5);
    const seen = open.filter((f) => inView(f.cx, f.cy, 0));
    if (seen.length) return pick(seen);
    return open.length ? pick(open) : null;
  }

  /** @param {Flower} f */
  function spawnBee(f) {
    beesSpawned++;
    const fromLeft = Math.random() < 0.5;
    bees.push({
      x: fromLeft ? viewL - 30 : viewR + 30,
      y: clamp(rand(lerp(viewT, viewB, 0.15), lerp(viewT, viewB, 0.5)), 0, WH),
      vx: 0, vy: 0,
      target: f, mode: 'arrive', until: 0, phase: rand(0, TAU),
      face: fromLeft ? 1 : -1, size: clamp(unit * 0.011, 4.5, 8) * rand(0.9, 1.1),
      exitX: 0, exitY: 0,
    });
  }

  // the first bloom always gets a visitor; after that, only sometimes
  /** @param {Flower} f */
  function maybeSpawnBee(f) {
    if (bees.length >= maxBees()) return;
    if (beesSpawned > 0 && Math.random() > 0.35) return;
    spawnBee(f);
  }

  /** @param {BeeDef} b */
  function sendAway(b) {
    b.mode = 'leave';
    b.target = null;
    b.exitX = b.x < (viewL + viewR) / 2 ? viewL - 150 : viewR + 150;
    b.exitY = rand(viewT - 60, lerp(viewT, viewB, 0.3));
  }

  /** @param {BeeDef} b */
  function drawBee(b) {
    const c = ctx, s = b.size;
    const flap = Math.sin(time * 62 + b.phase);
    c.save();
    c.translate(b.x, b.y);

    // soft glow so the bee reads against the night sky
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 3.2);
    g.addColorStop(0, 'hsla(45, 100%, 60%, 0.28)');
    g.addColorStop(1, 'hsla(45, 100%, 50%, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, s * 3.2, 0, TAU);
    c.fill();
    c.globalCompositeOperation = 'source-over';

    c.scale(b.face, 1);
    c.rotate(clamp(b.vy * 0.004 * b.face, -0.5, 0.5));

    // body with stripes
    c.beginPath();
    c.ellipse(0, 0, s * 1.15, s * 0.78, 0, 0, TAU);
    const bg = c.createLinearGradient(0, -s, 0, s);
    bg.addColorStop(0, '#ffe066');
    bg.addColorStop(1, '#e09000');
    c.fillStyle = bg;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#2b1a06';
    c.fillRect(-s * 0.55, -s, s * 0.28, s * 2);
    c.fillRect(-s * 0.05, -s, s * 0.28, s * 2);
    c.fillRect(-s * 1.2, -s, s * 0.22, s * 2);
    c.restore();

    // stinger, head, eye
    c.fillStyle = '#2b1a06';
    c.beginPath();
    c.moveTo(-s * 1.1, -s * 0.12);
    c.lineTo(-s * 1.5, 0);
    c.lineTo(-s * 1.1, s * 0.12);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(s * 1.1, -s * 0.05, s * 0.5, 0, TAU);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(s * 1.28, -s * 0.18, s * 0.13, 0, TAU);
    c.fill();

    // antennae
    c.strokeStyle = '#3a2508';
    c.lineWidth = Math.max(0.8, s * 0.12);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(s * 1.2, -s * 0.45);
    c.quadraticCurveTo(s * 1.4, -s * 1.0, s * 1.75, -s * 1.05);
    c.moveTo(s * 1.05, -s * 0.5);
    c.quadraticCurveTo(s * 1.1, -s * 1.05, s * 1.4, -s * 1.2);
    c.stroke();

    // wings, flapping fast
    c.fillStyle = 'rgba(225, 240, 255, 0.55)';
    c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    c.lineWidth = 0.8;
    for (const [wx, rot] of [[-s * 0.15, -0.5], [s * 0.25, -0.25]]) {
      c.save();
      c.translate(wx, -s * 0.55);
      c.rotate(rot + flap * 0.45);
      c.scale(1, 0.55 + 0.45 * Math.abs(flap));
      c.beginPath();
      c.ellipse(0, -s * 0.6, s * 0.45, s * 0.75, 0, 0, TAU);
      c.fill();
      c.stroke();
      c.restore();
    }
    c.restore();
  }

  /** @param {number} dt */
  function updateBees(dt) {
    // keep a little life in the garden: an occasional visitor when it's quiet
    if (!reduceMotion && !bees.length && time > nextBeeAt) {
      nextBeeAt = time + rand(14, 22);
      const f = pickBloomed(null);
      if (f) spawnBee(f);
    }

    for (let i = bees.length - 1; i >= 0; i--) {
      const b = bees[i];
      const cur = b.target;
      if (b.mode !== 'leave' && (!cur || cur.cutAt || cur.dying || !flowers.includes(cur))) {
        const next = pickBloomed(cur);
        if (next) {
          b.target = next;
          b.mode = 'arrive';
        } else {
          sendAway(b);
        }
      }

      // fly towards a point circling just above the flower's center
      let tx = b.exitX, ty = b.exitY;
      const t = b.target;
      if (b.mode !== 'leave' && t) {
        const orbit = time * 1.3 + b.phase;
        tx = t.cx + Math.cos(orbit) * t.R * 0.55;
        ty = t.cy - t.R * 0.35 + Math.sin(orbit * 1.7) * t.R * 0.25;
      }
      const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy) || 1;
      const maxSp = (b.mode === 'hover' ? 70 : 150) * (unit / 800 + 0.35);
      const sp = Math.min(maxSp, dist * 2.2);
      const k = Math.min(1, dt * 2.5);
      b.vx += ((dx / dist) * sp - b.vx) * k;
      b.vy += ((dy / dist) * sp - b.vy) * k;
      b.x += b.vx * dt;
      b.y += (b.vy + Math.sin(time * 9 + b.phase) * 18) * dt; // buzzy bobbing
      if (Math.abs(b.vx) > 12) b.face = b.vx > 0 ? 1 : -1;

      if (b.mode === 'arrive' && dist < 24) {
        b.mode = 'hover';
        b.until = time + rand(2.5, 5);
      } else if (b.mode === 'hover' && time > b.until) {
        const next = Math.random() < 0.6 ? pickBloomed(b.target) : null;
        if (next) {
          b.target = next;
          b.mode = 'arrive';
        } else {
          sendAway(b);
        }
      } else if (b.mode === 'leave' && dist < 40) {
        bees[i] = bees[bees.length - 1];
        bees.pop();
        continue;
      }
      if (inView(b.x, b.y, 40)) drawBee(b);
    }
  }

  /* ==================================================================
   * Background: stars (screen space) and grass (world space)
   * ================================================================== */
  function makeStars() {
    const n = clamp(Math.round((W * H) / 9000), 60, 220);
    stars = Array.from({ length: n }, () => ({
      xf: Math.random(), yf: Math.random() * 0.75,
      r: rand(0.5, 1.6), base: rand(0.15, 0.6), sp: rand(0.5, 2.2), ph: rand(0, TAU),
    }));
  }

  // stars drift a little as you pan, for depth
  function drawStars() {
    const span = W * 1.3;
    const shift = cam.x * cam.zoom * 0.05;
    for (const s of stars) {
      const a = s.base * (0.55 + 0.45 * Math.sin(time * s.sp + s.ph));
      const x = (((s.xf * span - shift) % span) + span) % span;
      ctx.fillStyle = `rgba(255, 226, 200, ${a.toFixed(3)})`;
      ctx.fillRect(x, s.yf * H, s.r, s.r);
    }
  }

  function makeGrass() {
    grassW = WW;
    /** @type {(hMin: number, hMax: number, wMin: number, wMax: number, dMin: number, dMax: number) => BladeDef} */
    const blade = (hMin, hMax, wMin, wMax, dMin, dMax) => ({
      xf: Math.random(), hf: rand(hMin, hMax), w: rand(wMin, wMax),
      lean: rand(-0.38, 0.38), ph: rand(0, TAU), delay: rand(dMin, dMax),
    });
    backGrass = Array.from({ length: Math.round(WW / 4.5) }, () => blade(0.04, 0.13, 2, 5, 0, 0.9));
    frontGrass = Array.from({ length: Math.round(WW / 9) }, () => blade(0.025, 0.075, 2.5, 6, 0.2, 1.1));
  }

  function makeGrassFills() {
    backGrassFill = ctx.createLinearGradient(0, WH, 0, WH - WH * 0.14);
    backGrassFill.addColorStop(0, 'hsl(160, 50%, 3%)');
    backGrassFill.addColorStop(1, 'hsl(125, 45%, 17%)');
    frontGrassFill = ctx.createLinearGradient(0, WH, 0, WH - WH * 0.08);
    frontGrassFill.addColorStop(0, 'hsl(160, 40%, 2%)');
    frontGrassFill.addColorStop(1, 'hsl(130, 40%, 9%)');
  }

  /**
   * All visible blades of a layer go into one path → one fill call.
   * @param {BladeDef[]} blades
   * @param {CanvasGradient | null} fill
   */
  function drawGrass(blades, fill) {
    if (!fill) return;
    ctx.beginPath();
    for (const b of blades) {
      const x = b.xf * WW;
      if (x < viewL - 30 || x > viewR + 30) continue;
      const gr = easeOutCubic(progress(time, b.delay, 1.6));
      if (gr <= 0) continue;
      const h = b.hf * WH * gr;
      const sway = (windNow * 0.6 + Math.sin(time * 1.6 + b.ph) * 0.4) * h * 0.18 * (reduceMotion ? 0.3 : 1);
      const tx = x + b.lean * h + sway, ty = WH - h;
      const mx = x + b.lean * h * 0.35 + sway * 0.3, my = WH - h * 0.5;
      ctx.moveTo(x - b.w / 2, WH + 2);
      ctx.quadraticCurveTo(mx - b.w * 0.3, my, tx, ty);
      ctx.quadraticCurveTo(mx + b.w * 0.3, my, x + b.w / 2, WH + 2);
      ctx.closePath();
    }
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /* ==================================================================
   * Scene
   * ================================================================== */
  const sortFlowers = () => flowers.sort((a, b) => a.z - b.z || a.id - b.id);

  function createScene() {
    flowers = [];
    // reduced motion: pretend everything started 20s ago so the garden is already in bloom
    const t0 = reduceMotion ? time - 20 : time;
    const n = CONFIG.flowerCount || clamp(Math.round(WW / 240), 5, 16);

    const valid = CONFIG.gardenSpecies.filter((k) => k in SPECIES);
    const pool = valid.length ? valid : ['lotus'];
    // shuffled "bag" so flowers next to each other are usually different kinds
    /** @type {string[]} */
    let bag = [];
    const nextKind = () => {
      if (RARE.length && Math.random() < CONFIG.gardenRareChance) return pick(RARE);
      if (!bag.length) bag = [...pool].sort(() => Math.random() - 0.5);
      return bag.pop() || pool[0];
    };
    // flowers near the middle of the screen bloom first, then outwards
    const delayFor = (/** @type {number} */ xf) => Math.abs(xf - 0.5) * (WW / W) * 1.4;

    let heroIdx = 0, best = Infinity;
    /** @type {number[]} */
    const slots = [];
    for (let i = 0; i < n; i++) {
      const xf = clamp((i + 0.5 + rand(-0.28, 0.28)) / n, 0.03, 0.97);
      slots.push(xf);
      if (Math.abs(xf - 0.5) < best) { best = Math.abs(xf - 0.5); heroIdx = i; }
    }
    slots.forEach((xf, i) => {
      const hero = i === heroIdx;
      flowers.push(new Flower({
        xf: hero ? 0.5 + rand(-0.01, 0.01) : xf,
        kind: hero ? (pool.includes('lotus') ? 'lotus' : pool[0]) : nextKind(),
        z: hero ? 1 : rand(0.62, 0.95),
        start: t0 + (hero ? 0.3 : 0.9 + delayFor(xf) + rand(0, 0.6)),
        hero,
      }));
    });

    // smaller flowers further back
    const nb = Math.round(n * 0.6);
    for (let i = 0; i < nb; i++) {
      const xf = rand(0.02, 0.98);
      flowers.push(new Flower({
        xf, kind: nextKind(), z: rand(0.45, 0.6), hf: rand(0.18, 0.32), start: t0 + 1.5 + delayFor(xf) + rand(0, 2),
      }));
    }
    sortFlowers();
  }

  /**
   * Plants a flower that grows to where the user tapped (screen coordinates).
   * Tapping high in the sky plants a mysterious bud that might be legendary.
   * @param {number} sx
   * @param {number} sy
   */
  function plantAt(sx, sy) {
    const wx = toWorldX(sx), wy = toWorldY(sy);
    const sky = sy < H * CONFIG.legendaryZone && LEGENDARY.length > 0;
    const z = sky ? 1 : rand(0.8, 1);
    const baseY = WH + 12 - (1 - z) * WH * 0.06;
    let hf = clamp((baseY - wy) / WH, 0.12, 0.85);

    let kind;
    if (sky) {
      kind = pick(LEGENDARY);
      hf = Math.max(hf, 0.6);
    } else if (RARE.length && Math.random() < CONFIG.rareChance) {
      kind = pick(RARE);
    } else {
      const order = CONFIG.plantOrder.filter((k) => k in SPECIES);
      kind = order.length ? order[plantIndex++ % order.length] : 'lotus';
    }

    flowers.push(new Flower({
      xf: clamp(wx / WW, 0.01, 0.99), kind, z, hf, start: time, planted: true, mystery: sky,
    }));
    sortFlowers();

    // too many? fade out the oldest
    const alive = flowers.filter((f) => !f.dying && !f.cutAt);
    if (alive.length > CONFIG.maxFlowers) {
      alive.reduce((a, b) => (a.id < b.id ? a : b)).dying = time;
    }
  }

  /**
   * Front-most fully grown flower whose head is under world point (x, y).
   * @param {number} x
   * @param {number} y
   * @returns {Flower | null}
   */
  function flowerAt(x, y) {
    for (let i = flowers.length - 1; i >= 0; i--) {
      const f = flowers[i];
      if (f.cutAt || f.dying || f.g < 1) continue;
      const r = Math.max(22 / cam.zoom, f.R * (f.sp.front ? 1.05 : 0.8));
      if (Math.hypot(x - f.cx, y - f.cy) < r) return f;
    }
    return null;
  }

  /* ==================================================================
   * Flower interaction: tap = shake, hold + drag = bend, pull up = pick
   * ================================================================== */
  function startHold() {
    if (!press) return;
    press.dragging = true;
    press.f.held = true;
    canvas.style.cursor = 'grabbing';
  }

  /** @param {boolean} cancelled */
  function endPress(cancelled) {
    if (!press) return;
    const f = press.f;
    if (f.cutAt) f.release();                       // let the picked flower float away
    else if (press.dragging || cancelled) f.held = false; // spring back with a wobble
    else f.shake();                                 // a simple tap
    press = null;
    canvas.style.cursor = 'pointer';
  }

  // while a flower is held: bend it towards the pointer; pull up far enough and it snaps off
  function updateDrag() {
    if (!press) return;
    const f = press.f;
    if (f.dying || f.dead) {
      f.held = false;
      press = null;
      return;
    }
    if (!press.dragging && time - press.t0 > 0.25) startHold();
    if (!press.dragging || f.cutAt) return;

    // rubber band: the further you pull, the harder the stem resists
    const dx = press.x - press.x0, dy = press.y - press.y0;
    const L = Math.max(60, f.h * 0.45);
    const k = L / (L + Math.hypot(dx, dy));
    const cutDist = clamp(f.h * 0.28, 50 / cam.zoom, (H * 0.35) / cam.zoom);
    const strain = clamp(-dy / cutDist);
    const jitter = strain * strain * strain * 3; // trembles just before it snaps
    f.strain = strain;
    f.dragTx = dx * k + rand(-jitter, jitter);
    f.dragTy = dy * k + rand(-jitter, jitter);

    if (-dy > cutDist) {
      f.cut();
      f.free.ox = press.x - f.hx;
      f.free.oy = press.y - f.hy;
    }
  }

  /* ==================================================================
   * Phone shake → flowers bend left / right
   * ================================================================== */
  /** @param {DeviceMotionEvent} e */
  function onMotion(e) {
    const a = e.acceleration, g = e.accelerationIncludingGravity;
    let ax = 0, ay = 0;
    if (a && a.x !== null && a.y !== null) {
      ax = a.x;
      ay = a.y;
    } else if (g && g.x !== null && g.y !== null) {
      // no gravity-free reading: strip gravity with a slow low-pass filter
      gravityX = lerp(gravityX, g.x, 0.1);
      gravityY = lerp(gravityY, g.y, 0.1);
      ax = g.x - gravityX;
      ay = g.y - gravityY;
    } else {
      return;
    }
    // device axes → screen x, depending on how the phone is held
    const angle = screen.orientation?.angle ?? 0;
    motionX = angle === 90 ? -ay : angle === 270 ? ay : angle === 180 ? -ax : ax;
    motionAt = time;
  }

  function enableMotion() {
    if (motionOn) return;
    motionOn = true;
    window.addEventListener('devicemotion', onMotion);
  }

  /** @param {number} dt */
  function applyPhoneShake(dt) {
    if (!motionOn || time - motionAt > 0.15 || Math.abs(motionX) < 1.2) return;
    for (const f of flowers) {
      if (f.cutAt) continue;
      const k = clamp(f.h / (WH * 0.45), 0.5, 1.5);
      f.velX = clamp(f.velX - motionX * 320 * k * dt, -900, 900);
    }
    // a hard shake knocks loose some pollen (and dandelion seeds)
    if (Math.abs(motionX) > 12 && time > nextShakePuff) {
      nextShakePuff = time + 0.3;
      const open = flowers.filter((f) => !f.cutAt && f.age > f.bloomStart + 1 && inView(f.cx, f.cy, 0));
      for (let i = 0; i < Math.min(3, open.length); i++) {
        const f = pick(open);
        if (f.kind === 'dandelion') spawnSeeds(f, 4);
        else spawnPollen(f.cx, f.cy, f.hue, f.R);
      }
    }
  }

  /* ==================================================================
   * Hint, replay, resize
   * ================================================================== */
  hint.textContent = coarsePointer
    ? 'Tap to plant · Drag to explore · Pinch to zoom'
    : 'Click to plant · Drag to explore · Scroll to zoom';

  /**
   * @param {string} [text]
   * @param {number} [delay]
   */
  function scheduleHint(text, delay) {
    clearTimeout(hintTimer);
    if (text) {
      hint.textContent = text;
      hint.classList.add('show');
      hintTimer = setTimeout(() => hint.classList.remove('show'), 3500);
      return;
    }
    hint.classList.remove('show');
    if (!interacted) hintTimer = setTimeout(() => hint.classList.add('show'), delay ?? (reduceMotion ? 1500 : 6500));
  }

  function replay() {
    time = START_TIME;
    particles = [];
    scents = [];
    texts = [];
    bees = [];
    beesSpawned = 0;
    nextBeeAt = time + 15;
    press = null;
    seedEmbers();
    createScene();
    replayBtn.classList.remove('spin');
    void replayBtn.offsetWidth; // restart the CSS animation
    replayBtn.classList.add('spin');
  }

  function resize() {
    // remember what the user was looking at
    const focus = WW ? (cam.x + W / cam.zoom / 2) / WW : 0.5;

    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    WW = Math.round(W * (W < 700 ? 2.4 : 2));
    WH = H;
    unit = Math.min(W * 1.25, H);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    glowCanvas.width = Math.max(1, Math.round(W / 4));
    glowCanvas.height = Math.max(1, Math.round(H / 4));
    makeGrassFills();
    if (!backGrass.length || Math.abs(WW - grassW) > 100) makeGrass();

    cam.x = focus * WW - W / cam.zoom / 2;
    clampCam();
  }

  /* ==================================================================
   * Loop
   * ================================================================== */
  /** @param {number} now */
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    windNow = wind(time);
    updateCamera(dt);

    applyScreenTransform();
    ctx.clearRect(0, 0, W, H);
    drawStars();

    applyWorldTransform();
    drawGrass(backGrass, backGrassFill);
    updateDrag();
    applyPhoneShake(dt);
    flowers = flowers.filter((f) => !f.dead && (!f.dying || time - f.dying < 1.2));
    for (const f of flowers) {
      f.update(dt);
      f.draw();
    }
    drawGrass(frontGrass, frontGrassFill);
    updateBees(dt);
    for (const f of flowers) f.drawPicked();
    updateScents(dt);
    stepParticles(particles, dt);
    updateTexts(dt);

    applyScreenTransform();
    stepParticles(embers, dt);

    if (CONFIG.glow) {
      glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      glowCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
    }

    requestAnimationFrame(frame);
  }

  /* ==================================================================
   * Input: pointers (mouse, touch, pen), wheel, keyboard, buttons
   * ================================================================== */
  /**
   * @param {number} id
   * @param {number} sx
   * @param {number} sy
   * @param {boolean} moved
   */
  function startPan(id, sx, sy, moved) {
    const now = performance.now();
    pan = { id, sx0: sx, sy0: sy, camX0: cam.x, camY0: cam.y, moved, lastX: sx, lastY: sy, lastT: now, vx: 0, vy: 0 };
  }

  function startPinch() {
    if (press) endPress(true);
    pan = null;
    const [a, b] = [...pointers.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom0: cam.zoom, wx: toWorldX(mx), wy: toWorldY(my) };
  }

  function updatePinch() {
    if (!pinch || pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.zoom = clamp((pinch.zoom0 * d) / pinch.d0, minZoom(), MAX_ZOOM);
    cam.x = pinch.wx - mx / cam.zoom;
    cam.y = pinch.wy - my / cam.zoom;
    clampCam();
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.vx = cam.vy = 0;
    zoomAnim = null;
    panTargetX = null;
    if (!interacted) {
      interacted = true;
      scheduleHint(); // hides it for good
    }

    if (pointers.size >= 2) {
      startPinch();
      return;
    }
    const wx = toWorldX(e.clientX), wy = toWorldY(e.clientY);
    const f = flowerAt(wx, wy);
    if (f) {
      press = { f, id: e.pointerId, x0: wx, y0: wy, x: wx, y: wy, t0: time, dragging: false };
      return;
    }
    startPan(e.pointerId, e.clientX, e.clientY, false);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      // plain hover with a mouse
      if (e.pointerType === 'mouse') {
        canvas.style.cursor = flowerAt(toWorldX(e.clientX), toWorldY(e.clientY)) ? 'grab' : 'pointer';
      }
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinch) {
      updatePinch();
      return;
    }
    if (press && e.pointerId === press.id) {
      press.x = toWorldX(e.clientX);
      press.y = toWorldY(e.clientY);
      if (!press.dragging && Math.hypot(press.x - press.x0, press.y - press.y0) * cam.zoom > 6) startHold();
      return;
    }
    if (pan && e.pointerId === pan.id) {
      const dx = e.clientX - pan.sx0, dy = e.clientY - pan.sy0;
      if (!pan.moved && Math.hypot(dx, dy) > 8) pan.moved = true;
      if (!pan.moved) return;
      cam.x = pan.camX0 - dx / cam.zoom;
      cam.y = pan.camY0 - dy / cam.zoom;
      clampCam();
      const now = performance.now(), dtm = (now - pan.lastT) / 1000;
      if (dtm > 0) {
        pan.vx = lerp(pan.vx, (e.clientX - pan.lastX) / dtm, 0.5);
        pan.vy = lerp(pan.vy, (e.clientY - pan.lastY) / dtm, 0.5);
      }
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
      pan.lastT = now;
      canvas.style.cursor = 'grabbing';
    }
  });

  /** @param {PointerEvent} e */
  function onPointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pinch) {
      if (pointers.size < 2) {
        pinch = null;
        // keep panning with the finger that's still down
        for (const [id, p] of pointers) {
          startPan(id, p.x, p.y, true);
          break;
        }
      }
      return;
    }
    if (press && e.pointerId === press.id) {
      endPress(e.type === 'pointercancel');
      return;
    }
    if (pan && e.pointerId === pan.id) {
      if (!pan.moved && e.type === 'pointerup') {
        plantAt(e.clientX, e.clientY);
      } else if (pan.moved && performance.now() - pan.lastT < 80) {
        cam.vx = pan.vx; // fling
        cam.vy = pan.vy;
      }
      pan = null;
      canvas.style.cursor = 'pointer';
    }
  }
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);

  // wheel / trackpad: vertical scroll (or pinch) zooms at the cursor, horizontal scroll pans
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAnim = null;
    panTargetX = null;
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
    const dx = e.deltaX * scale, dy = e.deltaY * scale;
    if (e.ctrlKey || (!e.shiftKey && Math.abs(dy) >= Math.abs(dx))) {
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    } else {
      cam.x += (dx || dy) / cam.zoom;
      clampCam();
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return;
    switch (e.key) {
      case '+':
      case '=':
        animateZoom(cam.zoom * 1.4);
        break;
      case '-':
      case '_':
        animateZoom(cam.zoom / 1.4);
        break;
      case '0':
        toggleOverview();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        keys.add(e.key);
        e.preventDefault();
        break;
      default:
        return;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));
  window.addEventListener('blur', () => keys.clear());

  // whole garden ↔ normal view
  function toggleOverview() {
    const overview = cam.zoom > minZoom() + 0.01;
    const target = overview ? minZoom() : 1;
    animateZoom(target);
    panTargetX = (WW - W / clamp(target, minZoom(), MAX_ZOOM)) / 2;
  }

  zoomInBtn.addEventListener('click', () => animateZoom(cam.zoom * 1.5));
  zoomOutBtn.addEventListener('click', () => animateZoom(cam.zoom / 1.5));
  zoomFitBtn.addEventListener('click', toggleOverview);
  replayBtn.addEventListener('click', replay);
  window.addEventListener('resize', resize);

  // iOS needs a tap on a button before it shares motion data; elsewhere it just works
  const motionApi = /** @type {{ requestPermission?: () => Promise<string> } | undefined} */ (
    /** @type {unknown} */ (window.DeviceMotionEvent)
  );
  if (motionApi) {
    const ask = motionApi.requestPermission;
    if (typeof ask === 'function') {
      motionBtn.hidden = !coarsePointer;
      motionBtn.addEventListener('click', () => {
        ask.call(motionApi)
          .then((state) => {
            if (state !== 'granted') return;
            enableMotion();
            motionBtn.hidden = true;
            scheduleHint('Shake your phone to sway the flowers');
          })
          .catch(() => { motionBtn.hidden = true; });
      });
    } else {
      enableMotion();
    }
  }

  /* ==================================================================
   * Start
   * ================================================================== */
  if (!CONFIG.glow) glowCanvas.style.display = 'none';
  resize();
  cam.x = (WW - W) / 2;
  clampCam();
  makeStars();
  seedEmbers();
  createScene();
  scheduleHint();
  requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });
})();
