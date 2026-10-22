// cspell:words lerp

/**
 * Draws one petal outline, base at (0,0), tip at (0,-len).
 * @typedef {(c: CanvasRenderingContext2D, len: number, wid: number) => void} PetalShape
 */

/**
 * A petal gradient, from base to tip.
 * @typedef {object} PaintDef
 * @property {number} len        gradient length, as a fraction of the flower radius
 * @property {number[][]} stops  [offset, hue shift, saturation %, lightness %, alpha]
 */

/**
 * One ring of petals around the flower centre.
 * @typedef {object} RingDef
 * @property {number} n          petal count
 * @property {number} len        petal length, fraction of the flower radius
 * @property {number} wr         petal width / length
 * @property {number} off        angular offset (radians)
 * @property {number} delay      seconds after the bloom starts
 * @property {number} twist      how far petals spiral while unfurling (radians)
 * @property {number} stagger    seconds between neighboring petals
 * @property {number} dur        seconds for one petal to open
 * @property {PetalShape} shape
 * @property {number[] | null} edge  outline color [hue shift, lightness %, alpha]
 * @property {number} vein       midrib length (fraction of petal), 0 = none
 * @property {number} spots      freckles per petal
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
 * @property {number} R          petal radius in px
 * @property {number} budIn      0 → 1 while the bud appears
 * @property {number} L0         age at which the bloom starts
 * @property {number} bloom      0 → 1 over the bloom
 * @property {number} eBloom     eased bloom
 * @property {number} breathe    gentle scale pulse once open
 */

/**
 * @typedef {object} SpeciesDef
 * @property {string} name
 * @property {number[]} hues
 * @property {number} size       petal-radius multiplier
 * @property {boolean} front     front-facing (gets a perspective tilt) vs side view
 * @property {number} centerY    head centre along the head axis, fraction of the radius
 * @property {number} halo       halo radius, fraction of the radius
 * @property {boolean} glint     four-point light glint over the centre
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
 * @property {number} light
 * @property {number} drag
 * @property {number} gravity
 * @property {number} windK
 * @property {number} flick
 * @property {number} phase
 * @property {number} wobble
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

(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * Config — tweak freely
   * ------------------------------------------------------------------ */
  const CONFIG = {
    // flower kinds in the starting garden — use ['lotus'] for the all-orange original look
    gardenSpecies: ['lotus', 'rose', 'daisy', 'tulip', 'lily'],
    // each click grows the next kind in this list, then loops
    plantOrder: ['rose', 'tulip', 'lily', 'daisy', 'lotus'],
    showNames: true,  // show the flower's name when you plant one
    flowerCount: 0,   // 0 = auto (based on screen width)
    maxFlowers: 24,   // oldest flowers fade out past this when planting by click
    embers: 0,        // floating embers, 0 = auto (based on screen area)
    glow: true,       // bloom layer on/off
  };

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  const TAU = Math.PI * 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

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

  /* ------------------------------------------------------------------
   * Petal shapes — base at (0,0), tip at (0,-len)
   * ------------------------------------------------------------------ */
  // lance-shaped with a sharp tip (lotus)
  /** @type {PetalShape} */
  const pointedPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid, -len * 0.22, wid * 0.85, -len * 0.7, 0, -len);
    c.bezierCurveTo(-wid * 0.85, -len * 0.7, -wid, -len * 0.22, 0, 0);
    c.closePath();
  };

  // round tip — narrow for the daisy, wide for the rose
  /** @type {PetalShape} */
  const roundPetal = (c, len, wid) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(wid * 0.9, -len * 0.08, wid * 1.15, -len * 0.62, wid * 0.62, -len * 0.92);
    c.quadraticCurveTo(0, -len * 1.06, -wid * 0.62, -len * 0.92);
    c.bezierCurveTo(-wid * 1.15, -len * 0.62, -wid * 0.9, -len * 0.08, 0, 0);
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

  /* ------------------------------------------------------------------
   * Setup + state
   * ------------------------------------------------------------------ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const START_TIME = reduceMotion ? 30 : 0; // reduced motion: start fully grown

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('garden'));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const glowCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('glow'));
  const glowCtx = /** @type {CanvasRenderingContext2D} */ (glowCanvas.getContext('2d'));
  const hint = /** @type {HTMLElement} */ (document.getElementById('hint'));
  const replayBtn = /** @type {HTMLButtonElement} */ (document.getElementById('replay'));

  let W = 0, H = 0, DPR = 1, unit = 1;
  let time = START_TIME, last = performance.now(), windNow = 0;
  /** @type {Flower[]} */
  let flowers = [];
  /** @type {ParticleData[]} */
  let particles = [];
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
  let nextId = 0;
  let plantIndex = 0;
  let planted = false;
  let hintTimer = 0;

  /* ------------------------------------------------------------------
   * Shared head-drawing pieces (all in head-local coordinates)
   * ------------------------------------------------------------------ */

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
        shape: pointedPetal, edge: null, vein: 0, spots: 0,
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
        c.save();
        c.rotate(
          f.spin + r.off + (i * TAU) / r.n - (1 - e) * r.twist +
          Math.sin(time * 0.9 + f.phase + i) * 0.015 * s.bloom
        );
        c.scale(lerp(0.3, 1, e) * s.breathe, easeOutBack(p) * s.breathe);
        r.shape(c, len, wid);
        c.fillStyle = fill;
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
   * Bright glowing centre.
   * @param {CanvasRenderingContext2D} c
   * @param {Flower} f
   * @param {number} cr
   */
  function drawCore(c, f, cr) {
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
   * Four-point light glint, screen-aligned, at the head centre.
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

  /* ------------------------------------------------------------------
   * Species — the five flower designs
   * ------------------------------------------------------------------ */
  /** @type {LeafStyle} */
  const DEFAULT_LEAF = { min: 2, max: 4, tMin: 0.15, tMax: 0.68, lenMul: 1, wMul: 1, angMin: 0.55, angMax: 1.0 };

  /** @type {Record<string, SpeciesDef>} */
  const SPECIES = {
    // The original: three layers of pointed orange petals, glowing core
    lotus: {
      name: 'Fire Lotus',
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
      name: 'Golden Daisy',
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
      name: 'Crimson Rose',
      hues: [346, 350, 354, 358],
      size: 0.9, front: true, centerY: 0, halo: 2.3, glint: false,
      bud: [[0, 8, 90, 48], [1, -4, 85, 28]],
      leaf: { min: 2, max: 3, tMin: 0.2, tMax: 0.65, lenMul: 0.85, wMul: 1.15, angMin: 0.7, angMax: 1.1 },
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
      name: 'Pink Tulip',
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
      name: 'Moon Lily',
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
  };

  /* ------------------------------------------------------------------
   * Flower
   * ------------------------------------------------------------------ */
  class Flower {
    /**
     * @param {object} o
     * @param {number} o.xf               x position as a fraction of the width
     * @param {string} [o.kind]           key in SPECIES
     * @param {number} [o.z]              depth: ~0.45 (far) … 1 (near)
     * @param {number} [o.start]          absolute time the flower starts growing
     * @param {number | null} [o.hf]      height as a fraction of the screen height
     * @param {boolean} [o.planted]       planted by a click
     * @param {boolean} [o.hero]          the big centre flower
     */
    constructor({ xf, kind = 'lotus', z = rand(0.62, 1), start = 0, hf = null, planted = false, hero = false }) {
      this.id = nextId++;
      this.sp = SPECIES[kind] || SPECIES.lotus;
      this.xf = xf;
      this.z = z;
      this.start = start;
      this.planted = planted;
      this.age = 0;
      this.hf = hf ?? (hero ? rand(0.56, 0.62) : rand(0.3, 0.55) * (0.85 + 0.15 * z));
      this.rf = rand(0.06, 0.085) * (0.35 + 0.65 * z) * (hero ? 1.3 : 1) * this.sp.size; // petal radius / unit
      this.hue = pick(this.sp.hues) + rand(-4, 4);
      // horizontal offsets of the stem's bezier control points (fraction of height)
      this.bend = [rand(-0.2, 0.2), rand(-0.25, 0.25), planted ? rand(-0.04, 0.04) : rand(-0.15, 0.15)];
      this.swayAmp = rand(0.012, 0.025);
      this.swaySpeed = rand(0.7, 1.1);
      this.phase = rand(0, TAU);
      this.spin = rand(0, TAU);
      this.tilt = rand(0.75, 1);
      this.growDur = rand(2.2, 3.0) * (planted ? 0.8 : 1);
      this.bloomStart = this.growDur * 0.92 + 0.35;
      this.sepals = pick([5, 6]);
      this.dying = 0;

      const { paints, rings } = this.sp.build();
      this.paints = paints;
      this.rings = rings;

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
      this.nextPollen = 0;
      /** @type {CanvasGradient[]} */
      this.grads = [];
      this.budGrad = ctx.createLinearGradient(0, 0, 0, -1);
      this.gradR = 0;
      this.P = new Float64Array(8); // stem control points x0,y0 … x3,y3
      this.R = 0; this.h = 0; this.g = 0; this.alpha = 1;
      this.hx = 0; this.hy = 0; this.hAng = 0; // stem tip + head angle
      this.cx = 0; this.cy = 0;                // visual centre of the head
    }

    /** @param {number} dt */
    update(dt) {
      this.age = time - this.start;
      const z = this.z;
      const R = this.rf * unit;
      const baseY = H + 12 - (1 - z) * H * 0.06;
      const baseX = this.xf * W;
      const h = Math.max(40, Math.min(this.hf * H, baseY - R * 1.3 - 12));
      const g = easeInOutCubic(progress(this.age, 0, this.growDur));
      const sway =
        (windNow * 0.6 + Math.sin(time * this.swaySpeed + this.phase) * 0.4) *
        this.swayAmp * h * (reduceMotion ? 0.3 : 1);

      const P = this.P;
      P[0] = baseX;                                 P[1] = baseY;
      P[2] = baseX + this.bend[0] * h + sway * 0.2; P[3] = baseY - h * 0.33;
      P[4] = baseX + this.bend[1] * h + sway * 0.6; P[5] = baseY - h * 0.66;
      P[6] = baseX + this.bend[2] * h + sway;       P[7] = baseY - h;

      this.R = R;
      this.h = h;
      this.g = g;
      this.hx = bez(P[0], P[2], P[4], P[6], g);
      this.hy = bez(P[1], P[3], P[5], P[7], g);
      const dx = bezD(P[0], P[2], P[4], P[6], g);
      const dy = bezD(P[1], P[3], P[5], P[7], g);
      this.hAng = Math.atan2(dy, dx) + Math.PI / 2; // 0 = pointing straight up
      const off = R * this.sp.centerY;
      this.cx = this.hx + Math.sin(this.hAng) * off;
      this.cy = this.hy - Math.cos(this.hAng) * off;

      if (reduceMotion || this.dying) return;

      // sparkles trailing the growing tip
      if (g > 0 && g < 1 && Math.random() < dt * 22 * z) spawnTipSpark(this.hx, this.hy, this.hue);

      // burst of sparks as the flower opens (only if we actually watched it open)
      const L0 = this.bloomStart;
      if (!this.burst && this.age > L0 + 0.6) {
        this.burst = true;
        if (this.age < L0 + 1.5) spawnBurst(this.cx, this.cy, this.hue, R);
      }

      // drifting pollen once fully open
      if (this.age > L0 + 2.4 && time > this.nextPollen) {
        this.nextPollen = time + rand(0.5, 1.6);
        spawnPollen(this.cx, this.cy, this.hue, R);
      }
    }

    draw() {
      if (this.age <= 0) return;
      let alpha = lerp(0.45, 1, clamp((this.z - 0.45) / 0.55));
      if (this.dying) alpha *= 1 - progress(time, this.dying, 1.2);
      if (alpha <= 0) return;
      this.alpha = alpha;

      ctx.globalAlpha = alpha;
      for (const lf of this.leaves) this.drawLeaf(lf);
      this.drawStem();
      this.drawHead();
      if (this.g > 0 && this.g < 1) this.drawTip();
      if (this.planted && CONFIG.showNames) this.drawLabel();
      ctx.globalAlpha = 1;
    }

    drawStem() {
      const c = ctx, P = this.P, g = this.g, z = this.z;
      if (g <= 0.001) return;
      const steps = Math.max(2, Math.ceil(36 * g));
      const w0 = (1.6 + 3.2 * z) * (unit / 800) + 1.2;
      const w1 = w0 * 0.4;
      const cx = [], cy = [], nxs = [], nys = [], ws = [];

      c.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (g * i) / steps;
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

      // warm rim light along one edge, as if lit by the flower
      c.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = cx[i] + nxs[i] * ws[i] * 0.45, y = cy[i] + nys[i] * ws[i] * 0.45;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = `hsla(${this.hue + 20}, 100%, 70%, ${0.35 * z})`;
      c.lineWidth = Math.max(0.8, w0 * 0.18);
      c.stroke();
    }

    /** @param {LeafDef} lf */
    drawLeaf(lf) {
      const p = progress(this.g, lf.t, 0.22);
      if (p <= 0) return;
      const c = ctx, P = this.P, t = lf.t, d = lf.side;
      const s = easeOutBack(p);
      const x = bez(P[0], P[2], P[4], P[6], t);
      const y = bez(P[1], P[3], P[5], P[7], t);
      const ang = Math.atan2(bezD(P[1], P[3], P[5], P[7], t), bezD(P[0], P[2], P[4], P[6], t));
      const a = ang + d * (lf.ang + Math.sin(time * 1.2 + lf.phase) * 0.06);
      const L = lf.lf * Math.min(unit * (0.6 + 0.4 * this.z), this.h * 1.1);
      const B = L * lf.wm;

      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.scale(s, s);

      // curved leaf whose tip droops slightly
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
      c.strokeStyle = `hsla(${this.hue + 20}, 100%, 65%, 0.25)`;
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

    /** @param {number} R */
    ensureGrads(R) {
      if (this.grads.length && this.gradR === R) return;
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

      const c = ctx;
      c.save();
      c.translate(this.hx, this.hy);
      c.rotate(this.hAng);
      if (bloom > 0) drawHalo(c, this, s);
      if (this.sp.front) c.scale(1, this.tilt);
      this.sp.draw(c, this, s);
      c.restore();

      if (this.sp.glint && bloom > 0) drawGlint(c, this, s);
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
      const a = progress(this.age, this.bloomStart + 0.2, 0.6) * (1 - progress(this.age, this.bloomStart + 3, 1.2));
      if (a <= 0) return;
      const c = ctx;
      const size = Math.round(clamp(unit * 0.022, 12, 17));
      const top = this.R * (this.sp.front ? 1.25 : 0.75) + 10;
      c.save();
      c.globalAlpha = this.alpha * a;
      c.font = `italic ${size}px Georgia, "Times New Roman", serif`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.shadowColor = `hsl(${this.hue}, 100%, 55%)`;
      c.shadowBlur = 10;
      c.fillStyle = `hsl(${this.hue + 20}, 100%, 86%)`;
      c.fillText(this.sp.name, this.cx, this.cy - top + (1 - a) * 6);
      c.restore();
    }
  }

  /* ------------------------------------------------------------------
   * Particles (embers, sparks, pollen) — additive blending
   * ------------------------------------------------------------------ */
  const MAX_PARTICLES = 900;

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
      size: rand(0.6, 2), hue: rand(16, 42), light: rand(58, 78),
      drag: 0, gravity: 0, windK: 10, flick: rand(1.5, 5), phase: rand(0, TAU), wobble: rand(4, 12),
    };
  }

  function seedEmbers() {
    let n = CONFIG.embers || clamp(Math.round((W * H) / 16000), 30, 120);
    if (reduceMotion) n = Math.round(n / 2);
    for (let i = 0; i < n; i++) particles.push(makeEmber(true));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {number} R
   */
  function spawnBurst(x, y, hue, R) {
    const n = 28;
    for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
      const a = rand(0, TAU), sp = rand(40, 160) * clamp(R / 60, 0.5, 1.6);
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.9, 1.9), age: 0, size: rand(0.8, 2.2),
        hue: hue + rand(0, 30), light: rand(65, 85),
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
      hue: hue + rand(5, 30), light: rand(65, 85),
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
      hue: hue + rand(10, 30), light: rand(65, 85),
      drag: 0.2, gravity: -2, windK: 10, flick: 3, phase: rand(0, TAU), wobble: 14,
    });
  }

  /** @param {number} dt */
  function updateParticles(dt) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.age += dt;
      if (p.age >= p.life || p.y < -20) {
        if (p.ember) {
          p = particles[i] = makeEmber(false);
        } else {
          particles[i] = particles[particles.length - 1];
          particles.pop();
          continue;
        }
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += p.gravity * dt;
      p.x += (p.vx + windNow * p.windK + Math.sin(time * 2 + p.phase) * p.wobble) * dt;
      p.y += p.vy * dt;

      const life = p.age / p.life;
      let a = Math.min(1, life * 6) * (1 - life);
      a *= 0.55 + 0.45 * Math.sin(time * p.flick + p.phase);
      if (a <= 0.01) continue;

      ctx.fillStyle = `hsla(${p.hue}, 100%, ${p.light}%, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
      if (p.size > 1.2) {
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${a * 0.18})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------
   * Background: stars and grass
   * ------------------------------------------------------------------ */
  function makeStars() {
    const n = clamp(Math.round((W * H) / 9000), 60, 220);
    stars = Array.from({ length: n }, () => ({
      xf: Math.random(), yf: Math.random() * 0.75,
      r: rand(0.5, 1.6), base: rand(0.15, 0.6), sp: rand(0.5, 2.2), ph: rand(0, TAU),
    }));
  }

  function drawStars() {
    for (const s of stars) {
      const a = s.base * (0.55 + 0.45 * Math.sin(time * s.sp + s.ph));
      ctx.fillStyle = `rgba(255, 226, 200, ${a.toFixed(3)})`;
      ctx.fillRect(s.xf * W, s.yf * H, s.r, s.r);
    }
  }

  function makeGrass() {
    grassW = W;
    /** @type {(hMin: number, hMax: number, wMin: number, wMax: number, dMin: number, dMax: number) => BladeDef} */
    const blade = (hMin, hMax, wMin, wMax, dMin, dMax) => ({
      xf: Math.random(), hf: rand(hMin, hMax), w: rand(wMin, wMax),
      lean: rand(-0.38, 0.38), ph: rand(0, TAU), delay: rand(dMin, dMax),
    });
    backGrass = Array.from({ length: Math.round(W / 4.5) }, () => blade(0.04, 0.13, 2, 5, 0, 0.9));
    frontGrass = Array.from({ length: Math.round(W / 9) }, () => blade(0.025, 0.075, 2.5, 6, 0.2, 1.1));
  }

  function makeGrassFills() {
    backGrassFill = ctx.createLinearGradient(0, H, 0, H - H * 0.14);
    backGrassFill.addColorStop(0, 'hsl(160, 50%, 3%)');
    backGrassFill.addColorStop(1, 'hsl(125, 45%, 17%)');
    frontGrassFill = ctx.createLinearGradient(0, H, 0, H - H * 0.08);
    frontGrassFill.addColorStop(0, 'hsl(160, 40%, 2%)');
    frontGrassFill.addColorStop(1, 'hsl(130, 40%, 9%)');
  }

  /**
   * All blades of a layer go into one path → one fill call.
   * @param {BladeDef[]} blades
   * @param {CanvasGradient | null} fill
   */
  function drawGrass(blades, fill) {
    if (!fill) return;
    ctx.beginPath();
    for (const b of blades) {
      const gr = easeOutCubic(progress(time, b.delay, 1.6));
      if (gr <= 0) continue;
      const h = b.hf * H * gr, x = b.xf * W;
      const sway = (windNow * 0.6 + Math.sin(time * 1.6 + b.ph) * 0.4) * h * 0.18 * (reduceMotion ? 0.3 : 1);
      const tx = x + b.lean * h + sway, ty = H - h;
      const mx = x + b.lean * h * 0.35 + sway * 0.3, my = H - h * 0.5;
      ctx.moveTo(x - b.w / 2, H + 2);
      ctx.quadraticCurveTo(mx - b.w * 0.3, my, tx, ty);
      ctx.quadraticCurveTo(mx + b.w * 0.3, my, x + b.w / 2, H + 2);
      ctx.closePath();
    }
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /* ------------------------------------------------------------------
   * Scene
   * ------------------------------------------------------------------ */
  const sortFlowers = () => flowers.sort((a, b) => a.z - b.z || a.id - b.id);

  function createScene() {
    flowers = [];
    // reduced motion: pretend everything started 20s ago so the garden is already in bloom
    const t0 = reduceMotion ? time - 20 : time;
    const n = CONFIG.flowerCount || clamp(Math.round(W / 200), 4, 8);

    const valid = CONFIG.gardenSpecies.filter((k) => k in SPECIES);
    const pool = valid.length ? valid : ['lotus'];
    // shuffled "bag" so neighboring flowers are usually different kinds
    /** @type {string[]} */
    let bag = [];
    const nextKind = () => {
      if (!bag.length) bag = [...pool].sort(() => Math.random() - 0.5);
      return bag.pop() || pool[0];
    };

    // random bloom order, but the flower nearest the centre is the big "hero" and goes first
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    let heroIdx = 0, best = Infinity;
    /** @type {number[]} */
    const slots = [];
    for (let i = 0; i < n; i++) {
      const xf = clamp((i + 0.5 + rand(-0.28, 0.28)) / n, 0.06, 0.94);
      slots.push(xf);
      if (Math.abs(xf - 0.5) < best) { best = Math.abs(xf - 0.5); heroIdx = i; }
    }
    slots.forEach((xf, i) => {
      const hero = i === heroIdx;
      flowers.push(new Flower({
        xf: hero ? 0.5 + rand(-0.04, 0.04) : xf,
        kind: hero ? (pool.includes('lotus') ? 'lotus' : pool[0]) : nextKind(),
        z: hero ? 1 : rand(0.62, 0.95),
        start: t0 + (hero ? 0.3 : 0.9 + order[i] * 0.45 + rand(0, 0.3)),
        hero,
      }));
    });

    // smaller flowers further back
    const nb = Math.round(n * 0.6);
    for (let i = 0; i < nb; i++) {
      flowers.push(new Flower({
        xf: rand(0.04, 0.96), kind: nextKind(), z: rand(0.45, 0.6), hf: rand(0.18, 0.32), start: t0 + rand(1.5, 4),
      }));
    }
    sortFlowers();
  }

  /**
   * Grows the next kind of flower so that it blooms where the user clicked.
   * @param {number} clientX
   * @param {number} clientY
   */
  function plantFlower(clientX, clientY) {
    const order = CONFIG.plantOrder.filter((k) => k in SPECIES);
    const kind = order.length ? order[plantIndex++ % order.length] : 'lotus';
    const z = rand(0.8, 1);
    const baseY = H + 12 - (1 - z) * H * 0.06;
    const hf = clamp((baseY - clientY) / H, 0.12, 0.85);
    flowers.push(new Flower({ xf: clamp(clientX / W, 0.02, 0.98), kind, z, hf, start: time, planted: true }));
    sortFlowers();

    // too many? fade out the oldest
    const alive = flowers.filter((f) => !f.dying);
    if (alive.length > CONFIG.maxFlowers) {
      alive.reduce((a, b) => (a.id < b.id ? a : b)).dying = time;
    }
  }

  function scheduleHint() {
    clearTimeout(hintTimer);
    hint.classList.remove('show');
    if (!planted) hintTimer = setTimeout(() => hint.classList.add('show'), reduceMotion ? 1500 : 7000);
  }

  function replay() {
    time = START_TIME;
    particles = [];
    seedEmbers();
    createScene();
    scheduleHint();
    replayBtn.classList.remove('spin');
    void replayBtn.offsetWidth; // restart the CSS animation
    replayBtn.classList.add('spin');
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    unit = Math.min(W, H);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    glowCanvas.width = Math.max(1, Math.round(W / 4));
    glowCanvas.height = Math.max(1, Math.round(H / 4));
    makeGrassFills();
    if (!backGrass.length || Math.abs(W - grassW) > 100) makeGrass();
  }

  /* ------------------------------------------------------------------
   * Loop
   * ------------------------------------------------------------------ */
  /** @param {number} now */
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    windNow = wind(time);

    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawGrass(backGrass, backGrassFill);

    flowers = flowers.filter((f) => !f.dying || time - f.dying < 1.2);
    for (const f of flowers) {
      f.update(dt);
      f.draw();
    }

    drawGrass(frontGrass, frontGrassFill);
    updateParticles(dt);

    if (CONFIG.glow) {
      glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      glowCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
   * Events + start
   * ------------------------------------------------------------------ */
  canvas.addEventListener('pointerdown', (e) => {
    plantFlower(e.clientX, e.clientY);
    if (!planted) {
      planted = true;
      scheduleHint(); // hides it for good
    }
  });
  replayBtn.addEventListener('click', replay);
  window.addEventListener('resize', resize);

  if (!CONFIG.glow) glowCanvas.style.display = 'none';
  resize();
  makeStars();
  seedEmbers();
  createScene();
  scheduleHint();
  requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });
})();
