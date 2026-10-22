/**
 * Glowing particles: sparks, pollen and seeds (world space) and the ambient embers that
 * drift up the screen (screen space). All drawn with additive blending.
 */

import { CONFIG } from '../config.js';
import { TAU, clamp, rand } from '../core/math.js';
import { clock, reduceMotion, view } from '../core/state.js';
import { ctx } from '../render/canvas.js';
import { inView } from '../render/camera.js';

/** @import { Flower } from '../flowers/flower.js' */
/** @import { ParticleData } from '../core/types.js' */

const MAX_PARTICLES = 1000;

/** @type {ParticleData[]} */
let particles = [];
/** @type {ParticleData[]} */
let embers = [];

/**
 * Add a world-space particle (anything not given gets a default).
 * @param {Partial<ParticleData> & { x: number, y: number }} p
 */
function emit(p) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    vx: 0, vy: 0, life: 1, age: 0, size: 1, hue: 30, sat: 100, light: rand(65, 85),
    drag: 0, gravity: 0, windK: 4, flick: rand(8, 14), phase: rand(0, TAU), wobble: 0,
    ...p,
  });
}

/* ----------------------------------------------------------------- spawning */

/**
 * Sparks bursting out in every direction.
 * @param {number} x
 * @param {number} y
 * @param {number} hue
 * @param {number} R         flower radius — bigger flowers burst wider
 * @param {number} [count]
 * @param {number} [sat]     saturation (low = grey smoke)
 */
export function spawnBurst(x, y, hue, R, count = 28, sat = 100) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU), sp = rand(40, 160) * clamp(R / 60, 0.5, 1.6);
    emit({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.9, 1.9), size: rand(0.8, 2.2), hue: hue + rand(0, 30), sat, drag: 2.4, gravity: 18,
    });
  }
}

/**
 * A spark falling off the tip of a growing stem.
 * @param {number} x
 * @param {number} y
 * @param {number} hue
 */
export function spawnTipSpark(x, y, hue) {
  emit({
    x, y, vx: rand(-20, 20), vy: rand(-10, 25),
    life: rand(0.5, 1.1), size: rand(0.6, 1.6), hue: hue + rand(5, 30), drag: 1.5, gravity: 10,
  });
}

/**
 * A grain of pollen drifting up from an open flower.
 * @param {number} x
 * @param {number} y
 * @param {number} hue
 * @param {number} R
 */
export function spawnPollen(x, y, hue, R) {
  emit({
    x: x + rand(-R * 0.2, R * 0.2), y, vx: rand(-8, 8), vy: -rand(12, 30),
    life: rand(3, 5.5), size: rand(0.8, 1.8), hue: hue + rand(10, 30),
    drag: 0.2, gravity: -2, windK: 10, flick: 3, wobble: 14,
  });
}

/**
 * Dandelion seeds floating away on the breeze.
 * @param {Flower} f
 * @param {number} count
 */
export function spawnSeeds(f, count) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    emit({
      x: f.cx + Math.cos(a) * f.R * 0.6, y: f.cy + Math.sin(a) * f.R * 0.6,
      vx: Math.cos(a) * rand(20, 50) + rand(-10, 10), vy: -rand(15, 40),
      life: rand(4, 7), size: rand(1, 1.8), hue: 55, sat: 40, light: 94,
      drag: 0.5, gravity: -3, windK: 30, flick: 2, wobble: 20,
    });
  }
}

/**
 * The fountain of sparks above an open legendary flower.
 * @param {Flower} f
 */
export function spawnFountain(f) {
  emit({
    x: f.cx + rand(-f.R * 0.2, f.R * 0.2), y: f.cy, vx: rand(-30, 30), vy: -rand(60, 140),
    life: rand(1.2, 2.2), size: rand(0.8, 2),
    hue: f.kind === 'celestial' ? rand(0, 360) : f.hue + rand(0, 35),
    drag: 0.6, gravity: 30, windK: 6, flick: rand(6, 12),
  });
}

/* ------------------------------------------------------------------- embers */

/**
 * @param {boolean} scatter  spread over the screen instead of starting at the bottom
 * @returns {ParticleData}
 */
function makeEmber(scatter) {
  const life = rand(7, 15);
  return {
    ember: true,
    x: rand(0, view.W), y: scatter ? rand(view.H * 0.2, view.H) : view.H + rand(0, 20),
    vx: rand(-5, 5), vy: -rand(10, 30),
    life, age: scatter ? rand(0, life * 0.8) : 0,
    size: rand(0.6, 2), hue: rand(16, 42), sat: 100, light: rand(58, 78),
    drag: 0, gravity: 0, windK: 10, flick: rand(1.5, 5), phase: rand(0, TAU), wobble: rand(4, 12),
  };
}

export function seedEmbers() {
  let n = CONFIG.embers || clamp(Math.round((view.W * view.H) / 16000), 30, 120);
  if (reduceMotion) n = Math.round(n / 2);
  embers = Array.from({ length: n }, () => makeEmber(true));
}

export function clearParticles() {
  particles = [];
}

/* ------------------------------------------------------------------ update */

/**
 * Move and draw a particle list.
 * @param {ParticleData[]} list
 * @param {number} dt
 */
function step(list, dt) {
  const time = clock.time;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = list.length - 1; i >= 0; i--) {
    let p = list[i];
    p.age += dt;
    if (p.age >= p.life || (p.ember && p.y < -20)) {
      if (p.ember) {
        p = list[i] = makeEmber(false);
      } else {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
    }
    const damp = Math.exp(-p.drag * dt);
    p.vx *= damp;
    p.vy *= damp;
    p.vy += p.gravity * dt;
    p.x += (p.vx + clock.wind * p.windK + Math.sin(time * 2 + p.phase) * p.wobble) * dt;
    p.y += p.vy * dt;

    if (!p.ember && !inView(p.x, p.y, 20)) continue;
    const life = p.age / p.life;
    const a = Math.min(1, life * 6) * (1 - life) * (0.55 + 0.45 * Math.sin(time * p.flick + p.phase));
    if (a <= 0.01) continue;

    ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
    if (p.size > 1.2) {
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 60%, ${a * 0.18})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Call in world space.
 * @param {number} dt
 */
export const updateWorldParticles = (dt) => step(particles, dt);

/**
 * Call in screen space.
 * @param {number} dt
 */
export const updateEmbers = (dt) => step(embers, dt);
