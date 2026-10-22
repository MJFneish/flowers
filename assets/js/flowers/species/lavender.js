import { TAU, clamp, easeOutBack, lerp } from '../../core/math.js';
import { clock } from '../../core/state.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * A spike of tiny florets that turn from green to violet, bottom first.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawSpike(c, f, s) {
  const R = s.R, h = f.hue;
  const spike = R * 1.7 * easeOutBack(s.budIn);
  if (spike <= 0) return;

  if (s.bloom > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, -spike * 0.55, 0, 0, -spike * 0.55, spike * 0.65);
    g.addColorStop(0, `hsla(${h}, 100%, 70%, ${0.3 * s.eBloom})`);
    g.addColorStop(1, `hsla(${h}, 100%, 60%, 0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, -spike * 0.55, spike * 0.65, 0, TAU);
    c.fill();
    c.restore();
  }

  c.strokeStyle = 'hsl(120, 25%, 28%)';
  c.lineWidth = Math.max(1, R * 0.04);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -spike);
  c.stroke();

  const n = 26;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0 = bottom, 1 = top
    const open = clamp((s.bloom * 1.4 - t * 0.6) / 0.4);
    const side = i % 2 ? 1 : -1;
    const x = side * R * 0.16 * (1 - t * 0.55) * (0.5 + 0.5 * open);
    const y = -spike * (0.08 + t * 0.9);
    const r = R * (0.075 - t * 0.03) * (0.7 + 0.5 * open);
    const light = lerp(30, 62 + 8 * Math.sin(clock.time * 3 + i), open);
    c.fillStyle = `hsla(${lerp(110, h, open)}, ${lerp(25, 75, open)}%, ${light}%, 0.95)`;
    c.beginPath();
    c.ellipse(x, y, r, r * 1.3, side * 0.5, 0, TAU);
    c.fill();
  }
}

/**
 * Lavender — a side-view spike of florets with narrow leaves near the ground.
 * @type {SpeciesDef}
 */
export const lavender = {
  name: 'Lavender',
  rarity: 'common',
  hues: [262, 270, 278],
  size: 0.75, front: false, centerY: 0.85, halo: 1.8, glint: false,
  bud: [[0, 0, 40, 50], [1, 0, 40, 35]],
  leaf: { min: 3, max: 5, tMin: 0.03, tMax: 0.45, lenMul: 1.3, wMul: 0.22, angMin: 0.25, angMax: 0.55 },

  build() {
    return { paints: [], rings: [] };
  },

  draw(c, f, s) {
    drawSpike(c, f, s);
  },
};
