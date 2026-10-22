import { TAU, rand } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { HUE_STOPS, drawBud, drawCalyx, drawRings, drawStarCore, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { HueFn, SpeciesDef } from '../../core/types.js' */

/**
 * A full rainbow around each ring that keeps turning.
 * @type {HueFn}
 */
const rainbow = (f, i, n) => (i / n) * 360 + clock.time * 40 + f.phase * 57;

/**
 * Celestial Bloom (legendary) — huge, with four rings of ever-shifting rainbow petals.
 * @type {SpeciesDef}
 */
export const celestial = {
  name: 'Celestial Bloom',
  rarity: 'legendary',
  hues: [45],
  size: 1.7, front: true, centerY: 0, halo: 3.4, glint: true,
  bud: [[0, 0, 100, 85], [1, 0, 90, 55]],
  leaf: { ...DEFAULT_LEAF, min: 3, max: 5, lenMul: 1.15 },

  build() {
    const edge = [0, 95, 0.55];
    const ring = { twist: 2.2, stagger: 0.04, dur: 2.2, edge, hueFn: rainbow, stops: HUE_STOPS };
    return ringSet([
      { ...ring, n: 12, len: 1, wr: 0.3, vein: 0.85 },
      { ...ring, n: 12, len: 0.84, wr: 0.32, off: Math.PI / 12, delay: 0.3, vein: 0.85 },
      { ...ring, n: 10, len: 0.64, wr: 0.36, off: rand(0, TAU), delay: 0.6, twist: 2, dur: 2, vein: 0.8 },
      { ...ring, n: 8, len: 0.44, wr: 0.42, off: rand(0, TAU), delay: 0.9, twist: 2, dur: 2 },
    ]);
  },

  draw(c, f, s) {
    drawCalyx(c, f, s, 8, 0.5, 0.14);
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) drawStarCore(c, f, s, 0.26);
  },

  // sparks and comets in every color of the rainbow
  sparkHue: (_, k) => k * 360 + clock.time * 60,
};
