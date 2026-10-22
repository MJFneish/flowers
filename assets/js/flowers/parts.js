/**
 * Building blocks that species combine to draw a flower head.
 * Everything here draws in head-local coordinates: origin at the top of the stem, "up" = -y.
 */

import { TAU, clamp, easeOutBack, easeOutCubic, lerp, progress } from '../core/math.js';
import { clock } from '../core/state.js';
import { pointedPetal, starPath } from '../render/shapes.js';

/** @import { Flower } from './flower.js' */
/** @import { HeadState, PaintDef, RingDef, RingSpec } from '../core/types.js' */

/** Bright, glowing paint for rings whose hue comes from a `hueFn` (hue shifts are relative to it). */
export const HUE_STOPS = [[0, 0, 100, 93, 0.97], [0.4, 0, 100, 68, 0.95], [1, 40, 100, 52, 0.9]];

/**
 * Radius of a center that pops in with a little overshoot as the flower opens.
 * @type {(s: HeadState, size: number) => number}
 */
export const coreRadius = (s, size) => s.R * size * easeOutBack(clamp(s.bloom * 1.4));

/**
 * Builds paints + rings from a list of ring specs (one gradient per ring).
 * @param {RingSpec[]} specs
 * @returns {{ paints: PaintDef[], rings: RingDef[] }}
 */
export function ringSet(specs) {
  /** @type {PaintDef[]} */
  const paints = [];
  /** @type {RingDef[]} */
  const rings = [];
  specs.forEach((spec, i) => {
    paints.push({ len: spec.len, stops: spec.stops });
    rings.push({
      wr: 0.38, off: 0, delay: 0, twist: 1.2, stagger: 0.035, dur: 1.5,
      shape: pointedPetal, edge: null, edgeWidth: 1, vein: 0, spots: 0, flicker: 0, spin: 1, hueFn: null,
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
export function drawRings(c, f, s) {
  const time = clock.time;
  for (const r of f.rings) {
    const ringStart = s.L0 + r.delay;
    if (f.age <= ringStart) continue;
    const len = s.R * r.len, wid = len * r.wr;
    const fill = f.grads[r.paint];
    const stops = f.paints[r.paint].stops;
    c.lineWidth = r.edgeWidth;
    const edge = r.edge ? `hsla(${f.hue + r.edge[0]}, 100%, ${r.edge[1]}%, ${r.edge[2]})` : '';
    const spot = `hsla(${f.hue - 30}, 70%, 32%, 0.6)`;

    for (let i = 0; i < r.n; i++) {
      const p = progress(f.age, ringStart + i * r.stagger, r.dur);
      if (p <= 0) continue;
      const e = easeOutCubic(p);
      const flick = r.flicker ? 1 + Math.sin(time * 9 + i * 1.7 + f.phase) * r.flicker : 1;

      c.save();
      c.rotate(
        f.spin * r.spin + r.off + (i * TAU) / r.n - (1 - e) * r.twist +
        Math.sin(time * 0.9 + f.phase + i) * 0.015 * s.bloom
      );
      c.scale(lerp(0.3, 1, e) * s.breathe, easeOutBack(p) * s.breathe * flick);
      r.shape(c, len, wid);

      if (r.hueFn) {
        const hh = r.hueFn(f, i, r.n);
        const pg = c.createLinearGradient(0, 0, 0, -len);
        for (const [o, dh, sat, l, a] of stops) pg.addColorStop(o, `hsla(${hh + dh}, ${sat}%, ${l}%, ${a})`);
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
export function drawCalyx(c, f, s, n, len, wid) {
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
export function drawBud(c, f, s) {
  const out = progress(f.age, s.L0 - 0.1, 0.9);
  if (out >= 1 || !f.budGrad) return;
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
export function drawStamens(c, f, s, n, reach, cr) {
  const sr = s.R * reach * s.eBloom;
  const dot = Math.max(1, s.R * 0.028);
  const turn = clock.time * 0.12 + f.phase;
  /** @type {(i: number) => [number, number]} */
  const tip = (i) => {
    const a = (i * TAU) / n + turn;
    const rr = sr * (0.85 + 0.15 * Math.sin(i * 2.3 + f.phase));
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  };

  c.strokeStyle = `hsla(${f.hue + 40}, 100%, 80%, 0.6)`;
  c.lineWidth = 1;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n + turn;
    const [x, y] = tip(i);
    c.moveTo(Math.cos(a) * cr * 0.5, Math.sin(a) * cr * 0.5);
    c.lineTo(x, y);
  }
  c.stroke();

  c.fillStyle = `hsl(${f.hue + 48}, 100%, 88%)`;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y] = tip(i);
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
export function drawCore(c, f, cr) {
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
 * Rotating, glowing eight-point star at the center (rare + legendary flowers).
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 * @param {number} size  fraction of the radius
 */
export function drawStarCore(c, f, s, size) {
  const r = s.R * size * easeOutBack(clamp(s.bloom * 1.3));
  if (r <= 0) return;
  c.save();
  c.rotate(clock.time * 0.4 + f.phase);

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
 * Tight glowing spiral at the heart of a rose.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawRoseHeart(c, f, s) {
  const h = f.hue;
  const sr = s.R * 0.22 * s.eBloom;
  if (sr <= 0) return;
  c.save();
  c.rotate(f.spin + clock.time * 0.05);

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
