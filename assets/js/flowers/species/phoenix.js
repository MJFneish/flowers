import { TAU, rand } from '../../core/math.js';
import { coreRadius, drawBud, drawCore, drawRings, drawStamens, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Phoenix Flame (legendary) — petals that flicker like flames, with a fountain of embers.
 * @type {SpeciesDef}
 */
export const phoenix = {
  name: 'Phoenix Flame',
  rarity: 'legendary',
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
      const cr = coreRadius(s, 0.2);
      drawStamens(c, f, s, 16, 0.34, cr);
      drawCore(c, f, cr);
    }
  },
};
