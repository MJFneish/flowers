import { notchedPetal } from '../../render/shapes.js';
import { coreRadius, drawBud, drawCalyx, drawCore, drawRings, drawStamens, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Cherry Blossom — five notched, pale-pink petals.
 * @type {SpeciesDef}
 */
export const sakura = {
  name: 'Cherry Blossom',
  rarity: 'common',
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
      const cr = coreRadius(s, 0.12);
      drawStamens(c, f, s, 12, 0.42, cr);
      drawCore(c, f, cr);
    }
  },
};
