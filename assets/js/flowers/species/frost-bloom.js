import { TAU, rand } from '../../core/math.js';
import { spawnParticle } from '../../world/particles.js';
import { drawBud, drawRings, drawStarCore, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/** Side branches on each snowflake arm: [position along the arm, length] (fractions). */
const BRANCHES = [[0.38, 0.22], [0.58, 0.17], [0.78, 0.11]];

/**
 * Six snowflake arms that grow out along the petals.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawFrostArms(c, f, s) {
  const reach = s.R * 0.92 * s.eBloom;
  if (reach <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = `hsla(${f.hue}, 100%, 92%, ${0.7 * s.eBloom})`;
  c.lineWidth = Math.max(0.8, s.R * 0.018);
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = f.spin + (i * TAU) / 6;
    const ux = Math.sin(a), uy = -Math.cos(a); // along petal i
    c.moveTo(0, 0);
    c.lineTo(ux * reach, uy * reach);
    for (const [t, l] of BRANCHES) {
      const bx = ux * reach * t, by = uy * reach * t, bl = reach * l;
      for (const side of [-1, 1]) {
        const b = a + side * 0.65;
        c.moveTo(bx, by);
        c.lineTo(bx + Math.sin(b) * bl, by - Math.cos(b) * bl);
      }
    }
  }
  c.stroke();
  c.restore();
}

/**
 * Frost Bloom (rare) — six see-through ice petals etched with a snowflake, in a gentle snowfall.
 * @type {SpeciesDef}
 */
export const frostBloom = {
  name: 'Frost Bloom',
  rarity: 'rare',
  hues: [192, 200],
  size: 1, front: true, centerY: 0, halo: 2.8, glint: true,
  bud: [[0, 10, 60, 88], [1, 0, 70, 60]],
  leaf: DEFAULT_LEAF,

  build() {
    const edge = [0, 97, 0.85];
    return ringSet([
      { n: 6, len: 1, wr: 0.26, twist: 1.0, stagger: 0.05, dur: 1.6, edge,
        stops: [[0, 10, 70, 92, 0.75], [0.5, 0, 80, 80, 0.5], [1, -10, 90, 70, 0.6]] },
      { n: 6, len: 0.55, wr: 0.3, off: Math.PI / 6, delay: 0.25, twist: 1.0, stagger: 0.05, dur: 1.5, edge,
        stops: [[0, 0, 60, 96, 0.8], [1, -5, 85, 78, 0.6]] },
    ]);
  },

  draw(c, f, s) {
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) {
      drawFrostArms(c, f, s);
      drawStarCore(c, f, s, 0.14);
    }
  },

  // a light snowfall around it
  ambient(f, dt) {
    if (Math.random() > dt * 6) return;
    spawnParticle({
      x: f.cx + rand(-f.R * 1.4, f.R * 1.4), y: f.cy - f.R * rand(0.8, 1.6),
      vx: rand(-6, 6), vy: rand(10, 22), life: rand(3, 5), size: rand(0.9, 1.8),
      hue: 195, sat: 40, light: 95, drag: 0.3, windK: 12, flick: 3, wobble: 10,
    });
  },
};
