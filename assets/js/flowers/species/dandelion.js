import { GOLDEN_ANGLE, TAU } from '../../core/math.js';
import { drawBud, drawCalyx } from '../parts.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * A glowing puff of radiating seeds.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawPuff(c, f, s) {
  const R = s.R, e = s.eBloom, n = 44;
  const rr = R * 0.92 * e;
  if (rr <= 0) return;
  /** @type {(i: number) => [number, number, number]} */
  const seed = (i) => {
    const a = i * GOLDEN_ANGLE + f.spin;
    const l = rr * (0.82 + 0.18 * Math.sin(i * 7.3));
    return [a, Math.cos(a) * l, Math.sin(a) * l];
  };

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
    const [a, x, y] = seed(i);
    c.moveTo(Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08);
    c.lineTo(x, y);
  }
  c.stroke();

  const d = Math.max(0.8, R * 0.03);
  c.fillStyle = 'hsla(55, 50%, 96%, 0.85)';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const [, x, y] = seed(i);
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
 * Dandelion — a yellow bud that opens into a seed puff. Tap or shake it to blow seeds away.
 * @type {SpeciesDef}
 */
export const dandelion = {
  name: 'Dandelion',
  rarity: 'common',
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
};
