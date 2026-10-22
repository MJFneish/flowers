/** Short floating messages in the garden (e.g. when a legendary bud fizzles). */

import { clamp } from '../core/math.js';
import { view } from '../core/state.js';
import { ctx } from '../render/canvas.js';

/** @import { FloatText } from '../core/types.js' */

/** @type {FloatText[]} */
let texts = [];

/**
 * @param {number} x      world position
 * @param {number} y
 * @param {string} text
 * @param {string} color  CSS color
 */
export function addText(x, y, text, color) {
  texts.push({ x, y, text, color, age: 0, life: 2.6 });
}

export function clearTexts() {
  texts = [];
}

/**
 * Rise, fade and draw. Call in world space.
 * @param {number} dt
 */
export function updateTexts(dt) {
  if (!texts.length) return;
  const size = Math.round(clamp(view.unit * 0.022, 12, 17));
  ctx.save();
  ctx.font = `italic ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(160, 120, 255, 0.8)';
  ctx.shadowBlur = 10;
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.age += dt;
    if (t.age >= t.life) {
      texts.splice(i, 1);
      continue;
    }
    t.y -= 14 * dt;
    const k = t.age / t.life;
    ctx.globalAlpha = Math.min(1, k * 5) * (1 - k);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}
