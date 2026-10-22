import { TAU, easeInOutCubic, easeOutBack, progress } from '../../core/math.js';
import { tulipPetal } from '../../render/shapes.js';

/** @import { SpeciesDef } from '../../core/types.js' */

/**
 * Pink Tulip — a side-view cup that opens up and glows from inside like a lantern.
 * @type {SpeciesDef}
 */
export const tulip = {
  name: 'Pink Tulip',
  rarity: 'common',
  hues: [318, 326, 334],
  size: 0.85, front: false, centerY: 0.5, halo: 2.1, glint: false,
  bud: [[0, 0, 100, 60], [1, 0, 90, 40]],
  leaf: { min: 2, max: 2, tMin: 0.02, tMax: 0.22, lenMul: 2.2, wMul: 0.42, angMin: 0.14, angMax: 0.34 },

  build() {
    return {
      paints: [
        { len: 1.05, stops: [[0, -10, 80, 28, 0.97], [0.6, 0, 90, 44, 0.97], [1, 8, 100, 60, 0.97]] }, // back
        { len: 1.05, stops: [[0, -6, 85, 36, 0.97], [0.55, 4, 95, 55, 0.97], [1, 12, 100, 72, 0.97]] }, // front sides
        { len: 1.05, stops: [[0, -4, 90, 42, 0.98], [0.5, 6, 100, 62, 0.98], [1, 14, 100, 80, 0.98]] }, // front middle
      ],
      rings: [],
    };
  },

  draw(c, f, s) {
    const h = f.hue;
    const len = s.R * 1.05, wid = len * 0.36;
    const k = easeOutBack(s.budIn) * s.breathe;
    const open = easeInOutCubic(progress(f.age, s.L0, 1.8));

    c.save();
    c.scale(k, k);
    c.lineWidth = 1;

    // back petals
    c.fillStyle = f.grads[0];
    tulipPetal(c, len * 0.98, wid);
    c.fill();
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * wid * 0.3, 0);
      c.rotate(side * (0.1 + 0.32 * open));
      tulipPetal(c, len * 0.95, wid * 0.95);
      c.fill();
      c.restore();
    }

    // glowing heart + stamens, seen between the petals as the cup opens
    if (open > 0) {
      const gy = -len * 0.5, gr = len * 0.6;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, gy, 0, 0, gy, gr);
      g.addColorStop(0, `hsla(${h + 35}, 100%, 78%, ${0.8 * open})`);
      g.addColorStop(0.4, `hsla(${h + 15}, 100%, 62%, ${0.3 * open})`);
      g.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, gy, gr, 0, TAU);
      c.fill();
      c.restore();

      const rad = Math.max(1, s.R * 0.03);
      c.strokeStyle = `hsla(${h + 50}, 80%, 85%, ${0.8 * open})`;
      c.fillStyle = `hsla(${h + 55}, 100%, 88%, ${open})`;
      for (const x of [-0.3, 0, 0.3]) {
        const tx = wid * x, ty = -len * (x ? 0.62 : 0.68);
        c.beginPath();
        c.moveTo(0, -len * 0.15);
        c.lineTo(tx, ty);
        c.stroke();
        c.beginPath();
        c.arc(tx, ty, rad, 0, TAU);
        c.fill();
      }
    }

    // front petals
    c.strokeStyle = `hsla(${h + 20}, 100%, 85%, 0.45)`;
    c.fillStyle = f.grads[1];
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * wid * 0.42, len * 0.02);
      c.rotate(side * (0.05 + 0.24 * open));
      tulipPetal(c, len * 0.96, wid * 0.92);
      c.fill();
      c.stroke();
      c.restore();
    }
    c.fillStyle = f.grads[2];
    tulipPetal(c, len * 0.92, wid * 1.02);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(0, -len * 0.1);
    c.lineTo(0, -len * 0.78);
    c.strokeStyle = `hsla(${h + 20}, 100%, 88%, 0.3)`;
    c.stroke();
    c.restore();
  },
};
