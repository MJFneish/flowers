import { GOLDEN_ANGLE, TAU, rand } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { drawSparkle, roundPetal } from '../../render/shapes.js';
import { drawBud, drawCalyx, drawRings, ringSet } from '../parts.js';
import { ROSE_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, HueFn, SpeciesDef } from '../../core/types.js' */

/**
 * Deep indigo on the outside to magenta in the middle, drifting slowly.
 * @param {number} k  ring index (0 = outer)
 * @returns {HueFn}
 */
const nebula = (k) => (f, i) => 248 + k * 14 + Math.sin(clock.time * 0.6 + i * 1.3 + f.phase) * 16;

/**
 * Twinkling stars scattered over the petals.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawStarfield(c, f, s) {
  const R = s.R, n = 46, time = clock.time;
  const shown = Math.floor(n * s.eBloom);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < shown; i++) {
    const a = i * GOLDEN_ANGLE + f.spin + time * 0.05;
    const r = R * 0.92 * Math.sqrt((i + 0.5) / n);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 3 + i * 1.7));
    c.fillStyle = `hsla(${200 + (i % 5) * 25}, 80%, 92%, ${tw})`;
    if (i % 7 === 0) {
      drawSparkle(c, x, y, Math.max(1.5, R * 0.05) * tw, time + i);
    } else {
      c.beginPath();
      c.arc(x, y, Math.max(0.6, R * 0.012), 0, TAU);
      c.fill();
    }
  }
  c.restore();
}

/**
 * A tiny two-armed spiral galaxy turning at the heart.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawGalaxyCore(c, f, s) {
  const r = s.R * 0.24 * s.eBloom;
  if (r <= 0) return;
  c.save();
  c.rotate(clock.time * 0.8 + f.phase);
  c.globalCompositeOperation = 'lighter';

  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.35, 'hsla(310, 100%, 75%, 0.45)');
  g.addColorStop(1, 'hsla(270, 100%, 60%, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r * 1.3, 0, TAU);
  c.fill();

  for (let arm = 0; arm < 2; arm++) {
    for (let j = 0; j < 22; j++) {
      const t = j / 22, a = t * 3 * Math.PI + arm * Math.PI, d = t * r;
      c.fillStyle = `hsla(${300 - t * 80}, 100%, ${90 - t * 25}%, ${1 - t * 0.6})`;
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.6, r * 0.05 * (1 - t * 0.5)), 0, TAU);
      c.fill();
    }
  }
  c.restore();
}

/**
 * Nebula Rose (legendary) — a deep-space rose full of stars, with a galaxy at its heart.
 * @type {SpeciesDef}
 */
export const nebulaRose = {
  name: 'Nebula Rose',
  rarity: 'legendary',
  hues: [270],
  size: 1.6, front: true, centerY: 0, halo: 3.3, glint: true,
  bud: [[0, 30, 80, 60], [1, -20, 70, 30]],
  leaf: ROSE_LEAF,

  build() {
    const counts = [7, 6, 5, 4, 3];
    const lens = [1, 0.84, 0.68, 0.52, 0.36];
    let off = rand(0, TAU);
    return ringSet(counts.map((n, k) => {
      off += 2.4;
      return {
        n, len: lens[k], wr: 0.62, off, delay: k * 0.25, twist: 1.6, stagger: 0.05, dur: 1.9,
        shape: roundPetal, edge: [40, 85, 0.55], hueFn: nebula(k),
        stops: [[0, 30, 90, 70, 0.97], [0.45, 0, 85, 42, 0.96], [1, -20, 90, 26, 0.95]],
      };
    }));
  },

  draw(c, f, s) {
    drawCalyx(c, f, s, 5, 0.55, 0.15);
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) {
      drawStarfield(c, f, s);
      drawGalaxyCore(c, f, s);
    }
  },

  // violet → pink sparks
  sparkHue: (_, k) => 250 + k * 80,
};
