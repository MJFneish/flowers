import { TAU, rand } from '../../core/math.js';
import { roundPetal } from '../../render/shapes.js';
import { drawBud, drawRings, drawRoseHeart, ringSet } from '../parts.js';
import { ROSE_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Crystal Rose (rare) — glassy, see-through icy petals.
 * @type {SpeciesDef}
 */
export const crystalRose = {
  name: 'Crystal Rose',
  rarity: 'rare',
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
};
