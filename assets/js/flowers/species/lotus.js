import { TAU, pick, rand } from '../../core/math.js';
import { coreRadius, drawBud, drawCalyx, drawCore, drawRings, drawStamens, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Fire Lotus — the original: three layers of pointed orange petals around a glowing core.
 * @type {SpeciesDef}
 */
export const lotus = {
  name: 'Fire Lotus',
  rarity: 'common',
  hues: [14, 20, 26, 32, 38],
  size: 1, front: true, centerY: 0, halo: 2.6, glint: true,
  bud: [[0, 22, 100, 62], [1, -5, 95, 40]],
  leaf: DEFAULT_LEAF,

  build() {
    const n = pick([7, 8, 9, 10]);
    const wr = rand(0.32, 0.42);
    const edge = [30, 82, 0.4];
    return ringSet([
      { n, len: 1.0, wr, edge, vein: 0.78,
        stops: [[0, 25, 100, 78, 0.95], [0.3, 10, 100, 60, 0.95], [1, -6, 95, 42, 0.9]] },
      { n, len: 0.78, wr: wr * 0.95, off: Math.PI / n, delay: 0.28, edge, vein: 0.78,
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
      const cr = coreRadius(s, 0.24);
      drawStamens(c, f, s, 14, 0.36, cr);
      drawCore(c, f, cr);
    }
  },
};
