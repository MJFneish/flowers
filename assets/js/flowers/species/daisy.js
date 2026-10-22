import { GOLDEN_ANGLE, TAU, clamp, easeOutBack, randInt } from '../../core/math.js';
import { roundPetal } from '../../render/shapes.js';
import { drawBud, drawCalyx, drawRings, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * Sunflower-style seed disk with seeds in a golden-angle spiral.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawSeedDisk(c, f, s) {
  const h = f.hue;
  const dr = s.R * 0.32 * easeOutBack(clamp(s.bloom * 1.3));
  if (dr <= 0) return;

  c.save();
  c.shadowBlur = 16;
  c.shadowColor = `hsl(${h - 10}, 100%, 50%)`;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, dr);
  g.addColorStop(0, `hsl(${h - 20}, 85%, 24%)`);
  g.addColorStop(0.75, `hsl(${h - 25}, 90%, 15%)`);
  g.addColorStop(1, `hsl(${h - 12}, 100%, 38%)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, dr, 0, TAU);
  c.fill();
  c.restore();

  // seeds light up from the middle outwards
  const total = 64, shown = Math.floor(total * s.eBloom);
  const sz = Math.max(0.7, dr * 0.05);
  c.fillStyle = `hsla(${h + 5}, 100%, 70%, 0.9)`;
  c.beginPath();
  for (let i = 0; i < shown; i++) {
    const r = dr * 0.9 * Math.sqrt((i + 0.5) / total);
    const a = i * GOLDEN_ANGLE + f.spin;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    c.moveTo(x + sz, y);
    c.arc(x, y, sz, 0, TAU);
  }
  c.fill();

  c.strokeStyle = `hsla(${h}, 100%, 65%, 0.55)`;
  c.lineWidth = Math.max(1, dr * 0.07);
  c.beginPath();
  c.arc(0, 0, dr, 0, TAU);
  c.stroke();
}

/**
 * Golden Daisy — two rings of slim golden petals around a glowing seed disk.
 * @type {SpeciesDef}
 */
export const daisy = {
  name: 'Golden Daisy',
  rarity: 'common',
  hues: [42, 46, 50],
  size: 1, front: true, centerY: 0, halo: 2.4, glint: false,
  bud: [[0, 0, 100, 60], [1, -12, 95, 38]],
  leaf: DEFAULT_LEAF,

  build() {
    const n = randInt(18, 22);
    return ringSet([
      { n, len: 1, wr: 0.12, twist: 0.6, stagger: 0.02, dur: 1.4, shape: roundPetal,
        edge: [10, 85, 0.35], vein: 0.85,
        stops: [[0, -18, 100, 40, 0.95], [0.35, -6, 100, 55, 0.95], [1, 6, 100, 72, 0.95]] },
      { n, len: 0.84, wr: 0.13, off: Math.PI / n, delay: 0.2, twist: 0.6, stagger: 0.02, dur: 1.4,
        shape: roundPetal, edge: [12, 88, 0.35], vein: 0.8,
        stops: [[0, -14, 100, 46, 0.95], [0.4, 0, 100, 62, 0.95], [1, 10, 100, 80, 0.95]] },
    ]);
  },

  draw(c, f, s) {
    drawCalyx(c, f, s, 12, 0.42, 0.09);
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) drawSeedDisk(c, f, s);
  },
};
