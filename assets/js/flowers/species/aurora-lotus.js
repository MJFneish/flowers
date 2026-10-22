import { TAU, rand } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { HUE_STOPS, coreRadius, drawBud, drawCalyx, drawCore, drawRings, drawStamens, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { HueFn, SpeciesDef } from '../../core/types.js' */

/**
 * Petal colors ripple through northern-lights greens, teals and violets.
 * @type {HueFn}
 */
const aurora = (f, i, n) => f.hue + 40 + Math.sin(clock.time * 0.8 + (i / n) * TAU + f.phase) * 55;

/**
 * Aurora Lotus (rare) — four rings of petals that keep shifting color.
 * @type {SpeciesDef}
 */
export const auroraLotus = {
  name: 'Aurora Lotus',
  rarity: 'rare',
  hues: [150, 165],
  size: 1.1, front: true, centerY: 0, halo: 2.8, glint: true,
  bud: [[0, 30, 90, 75], [1, 0, 80, 45]],
  leaf: DEFAULT_LEAF,

  build() {
    const edge = [60, 92, 0.5];
    return ringSet([
      { n: 10, len: 1, wr: 0.36, edge, vein: 0.8, hueFn: aurora, stops: HUE_STOPS },
      { n: 10, len: 0.8, wr: 0.36, off: Math.PI / 10, delay: 0.25, edge, vein: 0.8, hueFn: aurora, stops: HUE_STOPS },
      { n: 8, len: 0.58, wr: 0.4, off: rand(0, TAU), delay: 0.5, edge, vein: 0.75, hueFn: aurora, stops: HUE_STOPS },
      { n: 6, len: 0.36, wr: 0.45, off: rand(0, TAU), delay: 0.75, edge, hueFn: aurora, stops: HUE_STOPS },
    ]);
  },

  draw(c, f, s) {
    drawCalyx(c, f, s, f.sepals, 0.5, 0.16);
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) {
      const cr = coreRadius(s, 0.18);
      drawStamens(c, f, s, 16, 0.3, cr);
      drawCore(c, f, cr);
    }
  },
};
