import { TAU } from '../../core/math.js';
import { roundPetal } from '../../render/shapes.js';
import { drawBud, drawRings, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

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
 * Scarlet Poppy — four big papery petals (two layers) around a dark heart.
 * @type {SpeciesDef}
 */
export const poppy = {
  name: 'Scarlet Poppy',
  rarity: 'common',
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
};
