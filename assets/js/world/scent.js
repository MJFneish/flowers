/** Scent: wavy ribbons of light rising from a picked flower. */

import { TAU, rand } from '../core/math.js';
import { clock, view } from '../core/state.js';
import { ctx } from '../render/canvas.js';

/** @import { ScentDef } from '../core/types.js' */

const MAX_SCENTS = 60;

/** @type {ScentDef[]} */
let scents = [];

/**
 * @param {number} x
 * @param {number} y
 * @param {number} hue
 * @param {number} R   flower radius — the ribbons start anywhere across the head
 */
export function spawnScent(x, y, hue, R) {
  if (scents.length > MAX_SCENTS) return;
  const k = view.unit / 800 + 0.4;
  scents.push({
    x: x + rand(-R * 0.35, R * 0.35), y,
    vx: rand(-6, 6), vy: -rand(22, 38),
    age: 0, life: rand(2.2, 3.2),
    hue: hue + rand(-10, 30),
    amp: rand(4, 8) * k, len: rand(26, 44) * k,
    phase: rand(0, TAU), w: rand(1.2, 2.2),
  });
}

export function clearScents() {
  scents = [];
}

/**
 * Move and draw the ribbons. Call in world space.
 * @param {number} dt
 */
export function updateScents(dt) {
  if (!scents.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = scents.length - 1; i >= 0; i--) {
    const s = scents[i];
    s.age += dt;
    if (s.age >= s.life) {
      scents[i] = scents[scents.length - 1];
      scents.pop();
      continue;
    }
    s.x += (s.vx + clock.wind * 8) * dt;
    s.y += s.vy * dt;
    const t = s.age / s.life;
    const a = Math.min(1, t * 4) * (1 - t);
    const amp = s.amp * (0.6 + t * 1.2), len = s.len * (0.7 + t * 0.6);

    ctx.beginPath();
    for (let j = 0; j <= 14; j++) {
      const k = j / 14;
      const x = s.x + Math.sin(k * TAU * 1.2 + s.phase + clock.time * 4) * amp * (0.4 + k * 0.6);
      const y = s.y - k * len;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // a wide faint stroke for the glow, then a thin bright one
    ctx.strokeStyle = `hsla(${s.hue}, 100%, 85%, ${a * 0.18})`;
    ctx.lineWidth = s.w * 4;
    ctx.stroke();
    ctx.strokeStyle = `hsla(${s.hue}, 100%, 82%, ${a * 0.75})`;
    ctx.lineWidth = s.w;
    ctx.stroke();
  }
  ctx.restore();
}
