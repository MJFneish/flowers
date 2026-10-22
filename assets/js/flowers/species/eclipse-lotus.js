import { TAU, clamp, easeOutBack, rand } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { drawSparkle } from '../../render/shapes.js';
import { drawBud, drawRings, ringSet } from '../parts.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * Near-black violet petal paint (hues are shifted from the flower's gold).
 * @param {number} light  lightness %
 * @returns {number[][]}
 */
const darkPetal = (light) => [[0, 230, 35, light + 6, 0.98], [0.6, 225, 40, light, 0.98], [1, 220, 45, light - 4, 0.98]];

/**
 * A total eclipse: black moon, blazing corona with flaring streamers, and a
 * "diamond ring" of light travelling round the rim.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawEclipse(c, f, s) {
  const R = s.R, h = f.hue, time = clock.time;
  const r = R * 0.3 * easeOutBack(clamp(s.bloom * 1.3));
  if (r <= 0) return;
  const pulse = 0.85 + 0.15 * Math.sin(time * 2.2 + f.phase);

  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.4);
  g.addColorStop(0, `hsla(${h + 15}, 100%, 85%, ${0.9 * pulse})`);
  g.addColorStop(0.3, `hsla(${h}, 100%, 60%, ${0.45 * pulse})`);
  g.addColorStop(1, `hsla(${h - 10}, 100%, 50%, 0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r * 2.4, 0, TAU);
  c.fill();

  c.strokeStyle = `hsla(${h + 10}, 100%, 80%, 0.5)`;
  c.lineWidth = Math.max(0.8, R * 0.012);
  c.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i * TAU) / 18 + time * 0.1;
    const l = r * (1.5 + 0.6 * Math.sin(time * 1.7 + i * 2.3) + 0.3 * Math.sin(time * 4.1 + i));
    c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    c.lineTo(Math.cos(a) * l, Math.sin(a) * l);
  }
  c.stroke();
  c.restore();

  // the moon
  c.fillStyle = '#06030a';
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.strokeStyle = `hsla(${h + 20}, 100%, 88%, 0.9)`;
  c.lineWidth = Math.max(1, R * 0.015);
  c.stroke();

  // diamond ring
  const da = time * 0.7 + f.phase;
  const dx = Math.cos(da) * r, dy = Math.sin(da) * r;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const dg = c.createRadialGradient(dx, dy, 0, dx, dy, R * 0.2);
  dg.addColorStop(0, 'rgba(255, 250, 230, 0.9)');
  dg.addColorStop(1, 'rgba(255, 220, 150, 0)');
  c.fillStyle = dg;
  c.beginPath();
  c.arc(dx, dy, R * 0.2, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(255, 252, 235, 0.95)';
  drawSparkle(c, dx, dy, R * 0.12, 0);
  c.restore();
}

/**
 * Eclipse Lotus (legendary) — near-black petals with blazing gold rims around a total eclipse.
 * @type {SpeciesDef}
 */
export const eclipseLotus = {
  name: 'Eclipse Lotus',
  rarity: 'legendary',
  hues: [40],
  size: 1.6, front: true, centerY: 0, halo: 3.2, glint: false,
  bud: [[0, 230, 30, 25], [1, 220, 40, 12]],
  leaf: { ...DEFAULT_LEAF, min: 3 },

  build() {
    const edge = [0, 68, 0.95]; // blazing gold rims and veins
    return ringSet([
      { n: 10, len: 1, wr: 0.32, twist: 1.6, stagger: 0.04, dur: 2, edge, edgeWidth: 1.8, vein: 0.7,
        stops: darkPetal(12) },
      { n: 10, len: 0.8, wr: 0.34, off: Math.PI / 10, delay: 0.3, twist: 1.6, stagger: 0.04, dur: 2,
        edge, edgeWidth: 1.6, vein: 0.7, stops: darkPetal(15) },
      { n: 8, len: 0.58, wr: 0.36, off: rand(0, TAU), delay: 0.6, twist: 1.4, stagger: 0.04, dur: 1.8,
        edge, edgeWidth: 1.4, stops: darkPetal(18) },
    ]);
  },

  draw(c, f, s) {
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) drawEclipse(c, f, s);
  },

  // golden sparks
  sparkHue: (_, k) => 35 + k * 20,
};
