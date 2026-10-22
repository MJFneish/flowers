/** Reusable outlines: stars, sparkles, petals and leaves. */

/** @import { PetalShape } from '../core/types.js' */

/**
 * Star outline with `n` points.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} ro   outer radius
 * @param {number} ri   inner radius
 * @param {number} n
 * @param {number} rot
 */
export function starPath(c, x, y, ro, ri, n, rot) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

/**
 * Small four-point twinkle, filled with the current fill style.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} rot
 */
export function drawSparkle(c, x, y, r, rot) {
  starPath(c, x, y, r, r * 0.28, 4, rot);
  c.fill();
}

/* ------------------------------------------------------------------ petals */
/* Every petal: base at (0,0), tip at (0,-len), `wid` ≈ half its width.     */

/**
 * Lance-shaped with a sharp tip (lotus, star, phoenix).
 * @type {PetalShape}
 */
export const pointedPetal = (c, len, wid) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(wid, -len * 0.22, wid * 0.85, -len * 0.7, 0, -len);
  c.bezierCurveTo(-wid * 0.85, -len * 0.7, -wid, -len * 0.22, 0, 0);
  c.closePath();
};

/**
 * Round tip — narrow for the daisy, wide for the rose and poppy.
 * @type {PetalShape}
 */
export const roundPetal = (c, len, wid) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(wid * 0.9, -len * 0.08, wid * 1.15, -len * 0.62, wid * 0.62, -len * 0.92);
  c.quadraticCurveTo(0, -len * 1.06, -wid * 0.62, -len * 0.92);
  c.bezierCurveTo(-wid * 1.15, -len * 0.62, -wid * 0.9, -len * 0.08, 0, 0);
  c.closePath();
};

/**
 * Round with a little notch at the tip (cherry blossom).
 * @type {PetalShape}
 */
export const notchedPetal = (c, len, wid) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(wid * 0.9, -len * 0.12, wid * 1.15, -len * 0.7, wid * 0.6, -len * 0.97);
  c.quadraticCurveTo(wid * 0.25, -len * 1.02, 0, -len * 0.86);
  c.quadraticCurveTo(-wid * 0.25, -len * 1.02, -wid * 0.6, -len * 0.97);
  c.bezierCurveTo(-wid * 1.15, -len * 0.7, -wid * 0.9, -len * 0.12, 0, 0);
  c.closePath();
};

/**
 * Pointed, with a tip that curls to one side (lily).
 * @type {PetalShape}
 */
export const lilyPetal = (c, len, wid) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(wid * 1.05, -len * 0.25, wid * 0.95, -len * 0.72, wid * 0.32, -len);
  c.bezierCurveTo(-wid * 0.35, -len * 0.82, -wid * 0.95, -len * 0.32, 0, 0);
  c.closePath();
};

/**
 * Wide cup petal, seen from the side (tulip).
 * @type {PetalShape}
 */
export const tulipPetal = (c, len, wid) => {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(wid * 1.3, -len * 0.02, wid * 1.2, -len * 0.74, 0, -len);
  c.bezierCurveTo(-wid * 1.2, -len * 0.74, -wid * 1.3, -len * 0.02, 0, 0);
  c.closePath();
};

/* ------------------------------------------------------------------ leaves */

/**
 * Curved leaf whose tip droops slightly, base at (x, y).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} angle  direction the leaf points
 * @param {number} L      length
 * @param {number} B      breadth
 * @param {number} d      side (+1 / -1), decides which way it droops
 * @param {number} hue    rim-light hue
 */
export function drawLeafShape(c, x, y, angle, L, B, d, hue) {
  if (L <= 0) return;
  c.save();
  c.translate(x, y);
  c.rotate(angle);

  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(L * 0.25, -B * 0.3 * d, L * 0.7, -B * 0.22 * d, L, L * 0.18 * d);
  c.bezierCurveTo(L * 0.72, B * 0.25 * d, L * 0.3, B * 0.22 * d, 0, 0);
  c.closePath();
  const lg = c.createLinearGradient(0, 0, L, 0);
  lg.addColorStop(0, 'hsl(155, 50%, 10%)');
  lg.addColorStop(0.6, 'hsl(135, 55%, 24%)');
  lg.addColorStop(1, 'hsl(110, 60%, 34%)');
  c.fillStyle = lg;
  c.fill();
  c.strokeStyle = `hsla(${hue + 20}, 100%, 65%, 0.25)`;
  c.lineWidth = 0.8;
  c.stroke();

  // midrib
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(L * 0.5, -B * 0.03 * d, L * 0.92, L * 0.15 * d);
  c.strokeStyle = 'hsla(90, 80%, 70%, 0.3)';
  c.stroke();
  c.restore();
}
