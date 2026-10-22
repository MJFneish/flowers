import { TAU, hash, lerp, rand } from '../../core/math.js';
import { clock } from '../../core/state.js';
import { lilyPetal } from '../../render/shapes.js';
import { spawnParticle } from '../../world/particles.js';
import { coreRadius, drawBud, drawCore, drawRings, ringSet } from '../parts.js';

/** @import { Flower } from '../flower.js' */
/** @import { HeadState, SpeciesDef } from '../../core/types.js' */

/**
 * Lightning flickering between the core and the petal tips. The bolts are re-rolled about
 * 14 times a second from a repeatable hash, so each one holds still for a moment.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
function drawLightning(c, f, s) {
  const R = s.R, reach = R * 0.92;
  const seed = Math.floor(clock.time * 14) * 7.13 + f.phase * 100;
  /**
   * Tip of petal `i` (the six petals sit 60° apart).
   * @type {(i: number) => [number, number]}
   */
  const tip = (i) => {
    const a = f.spin + (i * TAU) / 6;
    return [Math.sin(a) * reach, -Math.cos(a) * reach];
  };

  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let b = 0; b < 3; b++) {
    if (hash(seed + b * 3.7) > 0.55 * s.eBloom) continue; // flicker on and off
    const i = Math.floor(hash(seed + b * 1.3) * 6);
    const [tx, ty] = tip(i);
    // from the core to a tip, or arcing across to the next tip
    const [sx, sy] = hash(seed + b * 5.1) < 0.5 ? [0, 0] : tip(i + 1);

    c.beginPath();
    c.moveTo(sx, sy);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      c.lineTo(
        lerp(sx, tx, t) + (hash(seed + b * 11 + k) - 0.5) * R * 0.22,
        lerp(sy, ty, t) + (hash(seed + b * 13 + k * 1.7) - 0.5) * R * 0.22
      );
    }
    c.lineTo(tx, ty);
    c.strokeStyle = `hsla(${f.hue - 10}, 100%, 70%, 0.35)`;
    c.lineWidth = Math.max(2, R * 0.05);
    c.stroke();
    c.strokeStyle = 'rgba(235, 245, 255, 0.95)';
    c.lineWidth = Math.max(0.8, R * 0.012);
    c.stroke();
  }
  c.restore();
}

/**
 * Storm Lily (legendary) — electric-blue petals with lightning crackling between them.
 * @type {SpeciesDef}
 */
export const stormLily = {
  name: 'Storm Lily',
  rarity: 'legendary',
  hues: [222],
  size: 1.55, front: true, centerY: 0, halo: 3.2, glint: true,
  bud: [[0, 20, 90, 70], [1, 0, 80, 35]],
  leaf: { min: 3, max: 5, tMin: 0.12, tMax: 0.78, lenMul: 1, wMul: 0.55, angMin: 0.5, angMax: 0.85 },

  build() {
    const edge = [30, 92, 0.75];
    return ringSet([
      { n: 3, len: 1, wr: 0.34, twist: 1.4, stagger: 0.06, dur: 1.8, shape: lilyPetal, edge, vein: 0.85,
        stops: [[0, 40, 100, 88, 0.97], [0.4, 10, 95, 60, 0.95], [1, -10, 90, 40, 0.92]] },
      { n: 3, len: 0.95, wr: 0.4, off: Math.PI / 3, delay: 0.25, twist: 1.4, stagger: 0.06, dur: 1.8,
        shape: lilyPetal, edge, vein: 0.85,
        stops: [[0, 45, 100, 92, 0.97], [0.45, 15, 100, 66, 0.95], [1, -5, 95, 46, 0.92]] },
    ]);
  },

  draw(c, f, s) {
    drawRings(c, f, s);
    drawBud(c, f, s);
    if (s.bloom > 0) {
      drawCore(c, f, coreRadius(s, 0.2));
      drawLightning(c, f, s);
    }
  },

  // cyan → violet sparks
  sparkHue: (_, k) => 195 + k * 60,

  // crackling sparks jumping off the petals
  ambient(f, dt) {
    if (Math.random() > dt * 10) return;
    const a = rand(0, TAU), r = f.R * rand(0.4, 1);
    spawnParticle({
      x: f.cx + Math.cos(a) * r, y: f.cy + Math.sin(a) * r * f.tilt,
      vx: rand(-90, 90), vy: rand(-90, 90), life: rand(0.25, 0.6), size: rand(0.6, 1.4),
      hue: rand(190, 230), light: 85, drag: 4, flick: 20,
    });
  },
};
