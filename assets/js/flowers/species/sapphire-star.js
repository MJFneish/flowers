import { drawBud, drawRings, drawStarCore, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Sapphire Star (rare) — a deep-blue five-pointed star with a shining center.
 * @type {SpeciesDef}
 */
export const sapphireStar = {
  name: 'Sapphire Star',
  rarity: 'rare',
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
};
