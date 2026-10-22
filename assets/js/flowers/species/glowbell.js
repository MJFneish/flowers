import { TAU, clamp, easeOutBack, easeOutCubic, lerp } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { DEFAULT_LEAF } from './leaves.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * A bell seen from the side, hanging from (0,0) with its mouth at y = h.
 * @param {CanvasRenderingContext2D} c
 * @param {number} w      width
 * @param {number} h      height
 * @param {number} flare  0 = closed bud, 1 = mouth wide open
 */
function bellPath(c, w, h, flare) {
  const rim = w * lerp(0.32, 0.62, flare);
  c.beginPath();
  c.moveTo(-w * 0.16, 0);
  c.bezierCurveTo(-w * 0.52, h * 0.08, -w * 0.42, h * 0.7, -rim, h);
  c.quadraticCurveTo(-rim * 0.5, h * 0.9, 0, h * 0.96);
  c.quadraticCurveTo(rim * 0.5, h * 0.9, rim, h);
  c.bezierCurveTo(w * 0.42, h * 0.7, w * 0.52, h * 0.08, w * 0.16, 0);
  c.closePath();
}

/**
 * An arching stalk with three bells that light up like lanterns and swing in the breeze.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawBells(c, f, s) {
  const R = s.R, h = f.hue, time = clock.time;
  const grow = easeOutBack(s.budIn);
  const open = easeOutCubic(s.bloom);
  const dir = f.spin > Math.PI ? -1 : 1; // arches left or right
  const qx = dir * R * 0.15 * grow, qy = -R * 1.15 * grow; // arch control point
  const ex = dir * R * 0.95 * grow, ey = -R * 0.3 * grow;  // arch end
  const stalk = `hsl(140, 45%, ${18 + 10 * f.z}%)`;

  c.lineCap = 'round';
  c.strokeStyle = stalk;
  c.lineWidth = Math.max(1, R * 0.05);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(qx, qy, ex, ey);
  c.stroke();

  for (let j = 0; j < 3; j++) {
    const appear = easeOutBack(clamp((s.budIn - j * 0.2) / 0.6)); // one after another
    if (appear <= 0) continue;
    const t = 0.42 + j * 0.27, u = 1 - t;
    const ax = 2 * u * t * qx + t * t * ex, ay = 2 * u * t * qy + t * t * ey;
    const w = R * (0.46 - j * 0.07) * appear, bh = w * (0.95 + 0.1 * open);
    const thread = R * 0.1;
    const pulse = 0.75 + 0.25 * Math.sin(time * 2.5 + j * 1.3 + f.phase);

    c.save();
    c.translate(ax, ay);
    c.rotate(Math.sin(time * 1.6 + j * 0.9 + f.phase) * 0.14 + clock.wind * 0.12);
    c.strokeStyle = stalk;
    c.lineWidth = Math.max(0.8, R * 0.025);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, thread);
    c.stroke();
    c.translate(0, thread);

    // lantern glow from inside the bell
    if (open > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, bh * 0.75, 0, 0, bh * 0.75, w * 1.3);
      g.addColorStop(0, `hsla(${h + 10}, 100%, 75%, ${0.6 * open * pulse})`);
      g.addColorStop(1, `hsla(${h}, 100%, 60%, 0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, bh * 0.75, w * 1.3, 0, TAU);
      c.fill();
      c.restore();
    }

    bellPath(c, w, bh, open);
    const bg = c.createLinearGradient(0, 0, 0, bh);
    bg.addColorStop(0, `hsl(${h - 10}, 60%, ${22 + 20 * open}%)`);
    bg.addColorStop(1, `hsl(${h + 10}, 90%, ${45 + 30 * open * pulse}%)`);
    c.fillStyle = bg;
    c.fill();
    c.strokeStyle = `hsla(${h + 20}, 100%, 85%, ${0.3 + 0.4 * open})`;
    c.lineWidth = 1;
    c.stroke();

    // the clapper peeking out of the mouth
    if (open > 0) {
      c.fillStyle = `hsla(${h + 40}, 100%, 90%, ${open})`;
      c.beginPath();
      c.arc(0, bh * (0.98 + 0.08 * open), Math.max(1, w * 0.07), 0, TAU);
      c.fill();
    }
    c.restore();
  }
}

/**
 * Glowbell (rare) — a side-view arch of three glowing, swinging lantern bells.
 * @type {SpeciesDef}
 */
export const glowbell = {
  name: 'Glowbell',
  rarity: 'rare',
  hues: [172, 182],
  size: 1.1, front: false, centerY: 0.55, halo: 2.4, glint: false,
  bud: [[0, 0, 50, 40], [1, 0, 50, 30]],
  leaf: { ...DEFAULT_LEAF, wMul: 0.6 },

  build() {
    return { paints: [], rings: [] };
  },

  draw(c, f, s) {
    drawBells(c, f, s);
  },
};
