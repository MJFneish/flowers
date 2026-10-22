/** The garden: the starting scene, planting on tap, finding the flower under a pointer. */

import { CONFIG } from '../config.js';
import { clamp, pick, rand } from '../core/math.js';
import { clock, flowers, reduceMotion, view } from '../core/state.js';
import { toWorldX, toWorldY, cam } from '../render/camera.js';
import { drawFlower, drawPickedFlower } from '../flowers/draw.js';
import { FADE_OUT, Flower, groundY } from '../flowers/flower.js';
import { LEGENDARY, RARE, SPECIES } from '../flowers/species/index.js';

/** Position in CONFIG.plantOrder for the next tap. */
let plantIndex = 0;

const sortFlowers = () => flowers.sort((a, b) => a.z - b.z || a.id - b.id);

/** Fresh garden: a big "hero" flower in the middle, others spread across, smaller ones behind. */
export function createScene() {
  flowers.length = 0;
  // reduced motion: pretend everything started 20s ago so the garden is already in bloom
  const t0 = reduceMotion ? clock.time - 20 : clock.time;
  const n = CONFIG.flowerCount || clamp(Math.round(view.WW / 240), 5, 16);

  const valid = CONFIG.gardenSpecies.filter((k) => k in SPECIES);
  const pool = valid.length ? valid : ['lotus'];
  // a shuffled "bag" so flowers next to each other are usually different kinds
  /** @type {string[]} */
  let bag = [];
  const nextKind = () => {
    if (RARE.length && Math.random() < CONFIG.gardenRareChance) return pick(RARE);
    if (!bag.length) bag = [...pool].sort(() => Math.random() - 0.5);
    return bag.pop() || pool[0];
  };
  // flowers near the middle of the screen bloom first, then outwards
  /** @param {number} xf */
  const delayFor = (xf) => Math.abs(xf - 0.5) * (view.WW / view.W) * 1.4;

  /** @type {number[]} */
  const slots = [];
  let heroIdx = 0, best = Infinity;
  for (let i = 0; i < n; i++) {
    const xf = clamp((i + 0.5 + rand(-0.28, 0.28)) / n, 0.03, 0.97);
    slots.push(xf);
    if (Math.abs(xf - 0.5) < best) {
      best = Math.abs(xf - 0.5);
      heroIdx = i;
    }
  }
  slots.forEach((xf, i) => {
    const hero = i === heroIdx;
    flowers.push(new Flower({
      xf: hero ? 0.5 + rand(-0.01, 0.01) : xf,
      kind: hero ? (pool.includes('lotus') ? 'lotus' : pool[0]) : nextKind(),
      z: hero ? 1 : rand(0.62, 0.95),
      start: t0 + (hero ? 0.3 : 0.9 + delayFor(xf) + rand(0, 0.6)),
      hero,
    }));
  });

  // smaller flowers further back
  for (let i = 0, nb = Math.round(n * 0.6); i < nb; i++) {
    const xf = rand(0.02, 0.98);
    flowers.push(new Flower({
      xf, kind: nextKind(), z: rand(0.45, 0.6), hf: rand(0.18, 0.32), start: t0 + 1.5 + delayFor(xf) + rand(0, 2),
    }));
  }
  sortFlowers();
}

/**
 * Plant a flower that grows up to where the user tapped (screen coordinates).
 * Tapping high in the sky plants a mysterious bud that might turn out legendary.
 * @param {number} sx
 * @param {number} sy
 */
export function plantAt(sx, sy) {
  const wx = toWorldX(sx), wy = toWorldY(sy);
  const sky = sy < view.H * CONFIG.legendaryZone && LEGENDARY.length > 0;
  const z = sky ? 1 : rand(0.8, 1);
  let hf = clamp((groundY(z) - wy) / view.WH, 0.12, 0.85);

  let kind;
  if (sky) {
    kind = pick(LEGENDARY);
    hf = Math.max(hf, 0.6);
  } else if (RARE.length && Math.random() < CONFIG.rareChance) {
    kind = pick(RARE);
  } else {
    const order = CONFIG.plantOrder.filter((k) => k in SPECIES);
    kind = order.length ? order[plantIndex++ % order.length] : 'lotus';
  }

  flowers.push(new Flower({
    xf: clamp(wx / view.WW, 0.01, 0.99), kind, z, hf, start: clock.time, planted: true, mystery: sky,
  }));
  sortFlowers();

  // too many? fade out the oldest
  const alive = flowers.filter((f) => !f.dying && !f.cutAt);
  if (alive.length > CONFIG.maxFlowers) {
    alive.reduce((a, b) => (a.id < b.id ? a : b)).dying = clock.time;
  }
}

/**
 * The front-most fully grown flower whose head is under world point (x, y).
 * @param {number} x
 * @param {number} y
 */
export function flowerAt(x, y) {
  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];
    if (f.cutAt || f.dying || f.g < 1) continue;
    const r = Math.max(22 / cam.zoom, f.R * (f.sp.front ? 1.05 : 0.8));
    if (Math.hypot(x - f.cx, y - f.cy) < r) return f;
  }
  return null;
}

/** @param {number} dt */
export function updateGarden(dt) {
  // drop flowers that have finished fading or floated away (in place — others hold the array)
  let kept = 0;
  for (const f of flowers) {
    const gone = f.dead || (f.dying && clock.time - f.dying >= FADE_OUT);
    if (!gone) flowers[kept++] = f;
  }
  flowers.length = kept;

  for (const f of flowers) f.update(dt);
}

export function drawGarden() {
  for (const f of flowers) drawFlower(f);
}

/** Picked flowers go on top of everything (call after the front grass and bees). */
export function drawPickedFlowers() {
  for (const f of flowers) drawPickedFlower(f);
}
