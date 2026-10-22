/**
 * Light effects around a flower head: halo, glint, and the extra show that rare and
 * legendary flowers put on (rays, shimmer, orbiting sparkles, bloom rings, sky beam).
 */

import { TAU, lerp } from '../core/math.js';
import { clock, view } from '../core/state.js';
import { drawSparkle } from '../render/shapes.js';
import { sparkHue } from './hue.js';

/** @import { Flower } from './flower.js' */
/** @import { HeadState } from '../core/types.js' */

/**
 * Soft halo behind the head (head-local coordinates).
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawHalo(c, f, s) {
  const h = f.hue, y = -s.R * f.sp.centerY;
  const hr = s.R * f.sp.halo * (1 + Math.sin(clock.time * 2 + f.phase) * 0.06);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, y, 0, 0, y, hr);
  g.addColorStop(0, `hsla(${h + 15}, 100%, 60%, ${0.32 * s.eBloom})`);
  g.addColorStop(0.35, `hsla(${h}, 100%, 50%, ${0.12 * s.eBloom})`);
  g.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, y, hr, 0, TAU);
  c.fill();
  c.restore();
}

/**
 * Slowly turning rays of light behind legendary flowers (head-local coordinates).
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawGodRays(c, f, s) {
  const time = clock.time;
  const R = s.R, n = 14, len = R * 3.6 * s.eBloom;
  if (len <= R * 0.2) return;
  c.save();
  c.translate(0, -R * f.sp.centerY);
  c.rotate(time * 0.15 + f.phase);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, len);
  g.addColorStop(0, `hsla(${f.hue + 20}, 100%, 75%, ${0.24 * s.eBloom})`);
  g.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
  c.fillStyle = g;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n, w = 0.07 + 0.05 * Math.sin(time * 1.3 + i * 2.1);
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
    c.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
    c.closePath();
  }
  c.fill();
  c.restore();
}

/**
 * A band of light that sweeps across rare / legendary petals every few seconds
 * (head-local coordinates, drawn after the petals).
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawShimmer(c, f, s) {
  const R = s.R, cy = -R * f.sp.centerY;
  const period = f.sp.rarity === 'legendary' ? 2.2 : 3.4;
  const ph = ((clock.time + f.phase) % period) / period;
  if (ph > 0.4) return;
  const x = lerp(-R * 1.3, R * 1.3, ph / 0.4);
  c.save();
  c.beginPath();
  c.arc(0, cy, R * 1.05, 0, TAU);
  c.clip();
  c.globalCompositeOperation = 'source-atop'; // only light up what's already drawn (the petals)
  const g = c.createLinearGradient(x - R * 0.4, cy - R * 0.2, x + R * 0.4, cy + R * 0.2);
  g.addColorStop(0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  c.fillStyle = g;
  c.fillRect(-R * 1.1, cy - R * 1.1, R * 2.2, R * 2.2);
  c.restore();
}

/**
 * Four-point light glint, screen-aligned, at the head center (world coordinates).
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawGlint(c, f, s) {
  c.save();
  c.translate(f.cx, f.cy);
  c.globalCompositeOperation = 'lighter';
  const gl = s.R * (1.05 + 0.2 * Math.sin(clock.time * 2.2 + f.phase)) * s.eBloom;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, gl);
  g.addColorStop(0, `hsla(${f.hue + 40}, 100%, 92%, 0.7)`);
  g.addColorStop(0.25, `hsla(${f.hue + 25}, 100%, 70%, 0.22)`);
  g.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
  c.fillStyle = g;
  for (let k = 0; k < 2; k++) {
    c.save();
    c.rotate((k * Math.PI) / 2);
    c.scale(1, 0.04);
    c.beginPath();
    c.arc(0, 0, gl, 0, TAU);
    c.fill();
    c.restore();
  }
  c.restore();
}

/**
 * Rare / legendary extras in world coordinates: orbiting sparkles (comets for legendaries)
 * and, on the bloom moment, expanding rings plus a beam of light from the sky.
 * @param {CanvasRenderingContext2D} c
 * @param {Flower} f
 * @param {HeadState} s
 */
export function drawRarityExtras(c, f, s) {
  const time = clock.time;
  const R = s.R, legendary = f.sp.rarity === 'legendary';
  c.save();
  c.globalCompositeOperation = 'lighter';

  // orbiting sparkles
  const n = legendary ? 5 : 3;
  const rx = R * (legendary ? 1.45 : 1.25), ry = rx * 0.45;
  const speed = legendary ? 1.1 : 0.8;
  for (let i = 0; i < n; i++) {
    const a = time * speed + (i * TAU) / n + f.phase;
    const hue = sparkHue(f, i / n);
    const tw = 0.6 + 0.4 * Math.sin(time * 5 + i * 1.7);
    if (legendary) {
      for (let j = 1; j <= 6; j++) {
        const aj = a - j * 0.08;
        c.fillStyle = `hsla(${hue}, 100%, 75%, ${(1 - j / 7) * 0.45 * s.eBloom})`;
        c.beginPath();
        c.arc(f.cx + Math.cos(aj) * rx, f.cy + Math.sin(aj) * ry, R * 0.035 * (1 - j / 8) + 0.6, 0, TAU);
        c.fill();
      }
    }
    c.fillStyle = `hsla(${hue}, 100%, 85%, ${0.9 * s.eBloom * tw})`;
    drawSparkle(c, f.cx + Math.cos(a) * rx, f.cy + Math.sin(a) * ry, R * 0.09 * tw * s.eBloom + 1, time * 2 + i);
  }

  // the bloom moment
  if (f.eventAt) {
    const t = time - f.eventAt;
    if (legendary && t < 3) {
      const a = (1 - t / 3) * Math.min(1, t * 4);
      const top = view.top - 50, bw = R * 1.3;
      const g = c.createLinearGradient(f.cx - bw, 0, f.cx + bw, 0);
      g.addColorStop(0, 'rgba(255, 240, 200, 0)');
      g.addColorStop(0.5, `rgba(255, 245, 220, ${0.55 * a})`);
      g.addColorStop(1, 'rgba(255, 240, 200, 0)');
      c.fillStyle = g;
      c.fillRect(f.cx - bw, top, bw * 2, f.cy - top);
    }
    const waves = legendary ? 3 : 1, dur = legendary ? 1.8 : 1.3, grow = legendary ? 6 : 3;
    for (let k = 0; k < waves; k++) {
      const tk = t - k * 0.25;
      if (tk < 0 || tk > dur) continue;
      const p = tk / dur, rr = R * (1 + p * grow);
      c.strokeStyle = `hsla(${f.hue + 20}, 100%, 80%, ${(1 - p) * 0.8})`;
      c.lineWidth = (legendary ? 4 : 2.5) * (1 - p) + 0.5;
      c.beginPath();
      c.ellipse(f.cx, f.cy, rr, rr * 0.55, 0, 0, TAU);
      c.stroke();
    }
  }
  c.restore();
}
