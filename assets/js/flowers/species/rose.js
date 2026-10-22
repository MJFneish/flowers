import { TAU, rand } from '../../core/math.js';
import { roundPetal } from '../../render/shapes.js';
import { drawBud, drawCalyx, drawRings, drawRoseHeart, ringSet } from '../parts.js';
import { ROSE_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Crimson Rose — five rings of round, overlapping petals around a glowing spiral.
 * @type {SpeciesDef}
 */
export const rose = {
  name: 'Crimson Rose',
  rarity: 'common',
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
};
