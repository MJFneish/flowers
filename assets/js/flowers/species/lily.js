import { TAU, easeOutCubic, progress } from '../../core/math.js';
import { lilyPetal } from '../../render/shapes.js';
import { drawBud, drawRings, ringSet } from '../parts.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * Pale glowing throat, then six long stamens with orange anthers and a pistil.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawLilyHeart(c, f, s) {
  const R = s.R, h = f.hue;

  c.save();
  c.globalCompositeOperation = 'lighter';
  const tr = R * 0.4;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, tr);
  g.addColorStop(0, `hsla(75, 100%, 85%, ${0.75 * s.eBloom})`);
  g.addColorStop(0.5, `hsla(${h + 30}, 100%, 72%, ${0.25 * s.eBloom})`);
  g.addColorStop(1, `hsla(${h}, 100%, 60%, 0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, tr, 0, TAU);
  c.fill();
  c.restore();

  // the stamens grow out after the petals open
  const sp = easeOutCubic(progress(f.age, s.L0 + 0.7, 1.3));
  if (sp <= 0) return;
  const reach = R * 0.7 * sp;
  /** @type {(i: number) => number} */
  const angle = (i) => f.spin + (i * TAU) / 6 + Math.PI / 6;

  c.lineWidth = Math.max(0.8, R * 0.012);
  c.strokeStyle = `hsla(${h + 60}, 60%, 88%, 0.85)`;
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = angle(i);
    c.moveTo(0, 0);
    c.quadraticCurveTo(
      Math.cos(a + 0.3) * reach * 0.5, Math.sin(a + 0.3) * reach * 0.5,
      Math.cos(a) * reach, Math.sin(a) * reach
    );
  }
  c.stroke();

  c.fillStyle = 'hsl(28, 100%, 58%)';
  for (let i = 0; i < 6; i++) {
    const a = angle(i);
    c.beginPath();
    c.ellipse(Math.cos(a) * reach, Math.sin(a) * reach, R * 0.055 * sp, R * 0.02 * sp, a + Math.PI / 2, 0, TAU);
    c.fill();
  }

  const px = Math.cos(f.spin) * R * 0.56 * sp, py = Math.sin(f.spin) * R * 0.56 * sp;
  c.strokeStyle = 'hsla(95, 70%, 80%, 0.9)';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(px, py);
  c.stroke();
  c.fillStyle = 'hsl(95, 80%, 85%)';
  c.beginPath();
  c.arc(px, py, Math.max(1.2, R * 0.03), 0, TAU);
  c.fill();
}

/**
 * Moon Lily — six curled, freckled petals with long stamens.
 * @type {SpeciesDef}
 */
export const lily = {
  name: 'Moon Lily',
  rarity: 'common',
  hues: [258, 268, 278],
  size: 1.1, front: true, centerY: 0, halo: 2.6, glint: true,
  bud: [[0, 40, 90, 85], [1, 0, 70, 55]],
  leaf: { min: 3, max: 5, tMin: 0.12, tMax: 0.78, lenMul: 0.95, wMul: 0.55, angMin: 0.5, angMax: 0.85 },

  build() {
    return ringSet([
      { n: 3, len: 1, wr: 0.34, twist: 0.9, stagger: 0.06, dur: 1.7, shape: lilyPetal,
        edge: [30, 88, 0.45], vein: 0.85, spots: 6,
        stops: [[0, 40, 100, 92, 0.97], [0.35, 10, 90, 72, 0.95], [1, -8, 80, 52, 0.92]] },
      { n: 3, len: 0.95, wr: 0.4, off: Math.PI / 3, delay: 0.2, twist: 0.9, stagger: 0.06, dur: 1.7,
        shape: lilyPetal, edge: [30, 90, 0.45], vein: 0.85, spots: 7,
        stops: [[0, 45, 100, 95, 0.97], [0.4, 15, 95, 76, 0.95], [1, -4, 85, 58, 0.92]] },
    ]);
  },

  draw(c, f, s) {
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) drawLilyHeart(c, f, s);
  },
};
