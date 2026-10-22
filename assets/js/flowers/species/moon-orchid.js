import { TAU, easeOutBack, progress } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { pointedPetal, roundPetal } from '../../render/shapes.js';
import { drawBud, drawRings, ringSet } from '../parts.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * The orchid's lip: a freckled, frilled pouch hanging down, with a glowing yellow throat.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawLip(c, f, s) {
  const k = easeOutBack(progress(f.age, s.L0 + 0.5, 1.2));
  if (k <= 0) return;
  const R = s.R * k, h = f.hue;
  const pulse = 0.75 + 0.25 * Math.sin(clock.time * 2.4 + f.phase);

  // the pouch
  c.beginPath();
  c.moveTo(-R * 0.12, R * 0.05);
  c.bezierCurveTo(-R * 0.42, R * 0.12, -R * 0.38, R * 0.5, -R * 0.16, R * 0.56);
  c.quadraticCurveTo(0, R * 0.66, R * 0.16, R * 0.56);
  c.bezierCurveTo(R * 0.38, R * 0.5, R * 0.42, R * 0.12, R * 0.12, R * 0.05);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, R * 0.62);
  g.addColorStop(0, `hsl(${h - 10}, 80%, 42%)`);
  g.addColorStop(1, `hsl(${h + 10}, 85%, 66%)`);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = `hsla(${h + 20}, 100%, 88%, 0.6)`;
  c.lineWidth = 1;
  c.stroke();

  // freckles
  const dot = Math.max(0.7, R * 0.018);
  c.fillStyle = `hsla(${h - 20}, 70%, 22%, 0.75)`;
  c.beginPath();
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const x = ((i % 3) - 1) * R * 0.1 * (1 - row * 0.2), y = R * (0.24 + row * 0.1);
    c.moveTo(x + dot, y);
    c.arc(x, y, dot, 0, TAU);
  }
  c.fill();

  // two little curled tendrils at the tip
  c.strokeStyle = `hsla(${h + 10}, 80%, 72%, 0.8)`;
  c.beginPath();
  for (const side of [-1, 1]) {
    c.moveTo(side * R * 0.06, R * 0.6);
    c.quadraticCurveTo(side * R * 0.22, R * 0.74, side * R * 0.1, R * 0.8);
  }
  c.stroke();

  // glowing throat, yellow callus and the pale column at the center
  c.save();
  c.globalCompositeOperation = 'lighter';
  const tg = c.createRadialGradient(0, R * 0.14, 0, 0, R * 0.14, R * 0.24);
  tg.addColorStop(0, `hsla(52, 100%, 72%, ${0.7 * pulse})`);
  tg.addColorStop(1, 'hsla(45, 100%, 60%, 0)');
  c.fillStyle = tg;
  c.beginPath();
  c.arc(0, R * 0.14, R * 0.24, 0, TAU);
  c.fill();
  c.restore();

  c.fillStyle = 'hsl(55, 90%, 62%)';
  c.beginPath();
  c.ellipse(0, R * 0.13, R * 0.06, R * 0.04, 0, 0, TAU);
  c.fill();
  c.fillStyle = `hsl(${h}, 30%, 94%)`;
  c.beginPath();
  c.ellipse(0, -R * 0.02, R * 0.07, R * 0.1, 0, 0, TAU);
  c.fill();
}

/**
 * Moon Orchid (rare) — three pale sepals, two broad freckled petals and a glowing lip.
 * It always stands upright, so the lip hangs at the bottom.
 * @type {SpeciesDef}
 */
export const moonOrchid = {
  name: 'Moon Orchid',
  rarity: 'rare',
  hues: [285, 300],
  size: 1.05, front: true, centerY: 0, halo: 2.6, glint: true,
  bud: [[0, 0, 60, 82], [1, 0, 50, 62]],
  leaf: { min: 2, max: 3, tMin: 0.02, tMax: 0.12, lenMul: 1.7, wMul: 0.9, angMin: 1.0, angMax: 1.35 },

  build() {
    const edge = [20, 95, 0.55];
    const sepals = {
      spin: 0, twist: 0.7, stagger: 0.08, dur: 1.6, shape: pointedPetal, edge, vein: 0.8,
      stops: [[0, -5, 70, 66, 0.97], [0.5, 0, 50, 86, 0.97], [1, 5, 55, 93, 0.96]],
    };
    const petal = {
      n: 1, len: 0.82, wr: 0.85, spin: 0, delay: 0.25, twist: 0.5, dur: 1.6, shape: roundPetal, edge, spots: 5,
      stops: [[0, 0, 70, 72, 0.97], [0.45, 0, 45, 90, 0.97], [1, 10, 60, 95, 0.96]],
    };
    return ringSet([
      { ...sepals, n: 3, len: 1, wr: 0.3 }, // top + two lower ones
      { ...petal, off: 1.3 },               // broad petal, right
      { ...petal, off: -1.3 },              // broad petal, left
    ]);
  },

  draw(c, f, s) {
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) drawLip(c, f, s);
  },
};
