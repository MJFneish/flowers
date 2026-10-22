/**
 * One flower: grows from the ground, blooms, sways, reacts to taps and drags and can be
 * picked. This file holds its state and behaviour; drawing lives in `draw.js`.
 */

import { CONFIG } from '../config.js';
import { TAU, bez, bezD, clamp, easeInOutCubic, lerp, pick, progress, rand, randInt } from '../core/math.js';
import { clock, input, reduceMotion, view } from '../core/state.js';
import { maybeSpawnBee } from '../world/bees.js';
import { legendaryBloom, rareBloom } from '../world/moments.js';
import { spawnBurst, spawnFountain, spawnPollen, spawnSeeds, spawnTipSpark } from '../world/particles.js';
import { spawnScent } from '../world/scent.js';
import { addText } from '../world/texts.js';
import { COMMON, RARE, SPECIES } from './species/index.js';

/** @import { LeafDef, LeafStyle, PaintDef, RingDef } from '../core/types.js' */

/** Seconds a removed flower takes to fade out. */
export const FADE_OUT = 1.2;

/** Physics step for the springs (seconds). */
const SUBSTEP = 1 / 120;
/** Spring pulling the head back to rest: stiff while held, bouncy once let go. */
const SPRING_HELD = { k: 260, damp: 22 };
const SPRING_FREE = { k: 140, damp: 7 };

let nextId = 0;

/**
 * Where a stem at depth `z` meets the ground (world y).
 * @type {(z: number) => number}
 */
export const groundY = (z) => view.WH + 12 - (1 - z) * view.WH * 0.06;

/**
 * Random leaves spread along the stem.
 * @param {LeafStyle} ls
 * @returns {LeafDef[]}
 */
function makeLeaves(ls) {
  const n = randInt(ls.min, ls.max);
  let side = Math.random() < 0.5 ? -1 : 1;
  /** @type {LeafDef[]} */
  const leaves = [];
  for (let i = 0; i < n; i++) {
    leaves.push({
      t: lerp(ls.tMin, ls.tMax, (i + rand(0.2, 0.8)) / n),
      side,
      lf: rand(0.1, 0.17) * ls.lenMul,
      wm: ls.wMul,
      ang: rand(ls.angMin, ls.angMax),
      phase: rand(0, TAU),
    });
    side = -side;
  }
  return leaves;
}

export class Flower {
  /**
   * @param {object} o
   * @param {number} o.xf               x position as a fraction of the garden width
   * @param {string} [o.kind]           key in SPECIES
   * @param {number} [o.z]              depth: ~0.45 (far) … 1 (near)
   * @param {number} [o.start]          clock time the flower starts growing
   * @param {number | null} [o.hf]      height as a fraction of the garden height
   * @param {boolean} [o.planted]       planted by a tap
   * @param {boolean} [o.hero]          the big center flower
   * @param {boolean} [o.mystery]       a legendary attempt — decided just before it opens
   */
  constructor({ xf, kind = 'lotus', z = rand(0.62, 1), start = 0, hf = null, planted = false, hero = false, mystery = false }) {
    this.id = nextId++;
    this.kind = SPECIES[kind] ? kind : 'lotus';
    this.sp = SPECIES[this.kind];
    this.xf = xf;
    this.z = z;
    this.start = start;
    this.planted = planted;
    this.mystery = mystery;
    this.age = 0;
    this.dying = 0;
    this.dead = false;

    // shape: height + petal radius (fractions of the garden height / sizing unit), stem bend
    this.hf = hf ?? (hero ? rand(0.56, 0.62) : rand(0.3, 0.55) * (0.85 + 0.15 * z));
    this.rf = rand(0.06, 0.085) * (0.35 + 0.65 * z) * (hero ? 1.3 : 1) * this.sp.size;
    this.bend = [rand(-0.2, 0.2), rand(-0.25, 0.25), planted ? rand(-0.04, 0.04) : rand(-0.15, 0.15)];
    this.swayAmp = rand(0.012, 0.025);
    this.swaySpeed = rand(0.7, 1.1);
    this.phase = rand(0, TAU);
    this.spin = rand(0, TAU);
    this.tilt = rand(0.75, 1);
    this.sepals = pick([5, 6]);
    /** @type {LeafDef[]} */
    this.leaves = makeLeaves(this.sp.leaf);

    // timeline: a mysterious bud grows slower and "charges" before revealing what it is
    this.growDur = mystery ? rand(3, 3.4) : rand(2.2, 3.0) * (planted ? 0.8 : 1);
    this.bloomStart = mystery ? this.growDur + 1.8 : this.growDur * 0.92 + 0.35;
    this.burst = false;
    this.announced = false;
    this.eventAt = 0;
    this.beeChecked = false;
    this.nextPollen = 0;

    // look: hue + petal rings, plus a gradient cache that the renderer fills in
    this.hue = 0;
    /** @type {PaintDef[]} */
    this.paints = [];
    /** @type {RingDef[]} */
    this.rings = [];
    /** @type {CanvasGradient[]} */
    this.grads = [];
    /** @type {CanvasGradient | null} */
    this.budGrad = null;
    this.gradR = -1;
    this.applySpecies();

    // geometry, recomputed every frame
    this.P = new Float64Array(8); // stem control points x0,y0 … x3,y3
    this.R = 0; this.h = 0; this.g = 0; this.alpha = 1;
    this.hx = 0; this.hy = 0; this.hAng = 0; // stem tip + head angle (0 = up)
    this.cx = 0; this.cy = 0;                // visual center of the head

    // interaction: a spring offsets the head after a tap or while it's dragged
    this.offX = 0; this.offY = 0; this.velX = 0; this.velY = 0;
    this.held = false; this.dragTx = 0; this.dragTy = 0; this.strain = 0;
    this.shakeAt = 0;

    // picking: once cut, the head floats free while the stub fades away
    this.cutAt = 0; this.cutT = 1; this.pieceLen = 0;
    this.carried = false; this.releasedAt = 0; this.nextScent = 0;
    this.free = { x: 0, y: 0, vx: 0, vy: 0, ang: 0, va: 0, ox: 0, oy: 0 };
  }

  /* --------------------------------------------------------------- species */

  /** Pick a hue and build the petal rings for the current species. */
  applySpecies() {
    this.hue = pick(this.sp.hues) + rand(-4, 4);
    const { paints, rings } = this.sp.build();
    this.paints = paints;
    this.rings = rings;
    this.gradR = -1; // rebuild gradients
  }

  /** @param {string} kind */
  setSpecies(kind) {
    const next = SPECIES[kind] || SPECIES.lotus;
    this.rf *= next.size / this.sp.size;
    this.kind = SPECIES[kind] ? kind : 'lotus';
    this.sp = next;
    this.applySpecies();
  }

  /* ---------------------------------------------------------------- update */

  /** @param {number} dt */
  update(dt) {
    this.age = clock.time - this.start;
    this.stepSpring(dt);
    if (!this.held) this.strain = 0;
    this.layoutStem();

    if (this.cutAt) {
      this.updatePicked(dt);
      return;
    }
    this.placeHead();
    if (this.mystery && this.age > this.bloomStart - 0.15) this.resolveMystery();
    if (!reduceMotion && !this.dying) this.updateEvents(dt);
  }

  /** @param {number} dt */
  stepSpring(dt) {
    const spring = this.held ? SPRING_HELD : SPRING_FREE;
    const tx = this.held ? this.dragTx : 0, ty = this.held ? this.dragTy : 0;
    const n = Math.ceil(dt / SUBSTEP);
    for (let i = 0; i < n; i++) {
      const st = dt / n;
      this.velX += ((tx - this.offX) * spring.k - this.velX * spring.damp) * st;
      this.velY += ((ty - this.offY) * spring.k - this.velY * spring.damp) * st;
      this.offX += this.velX * st;
      this.offY += this.velY * st;
    }
  }

  /** The stem's bezier control points, with the breeze and the spring offset applied. */
  layoutStem() {
    const { WW, WH, unit } = view;
    const R = this.rf * unit;
    const baseY = groundY(this.z);
    const baseX = this.xf * WW;
    const h = Math.max(40, Math.min(this.hf * WH, baseY - R * 1.3 - 12));
    const breeze = clock.wind * 0.6 + Math.sin(clock.time * this.swaySpeed + this.phase) * 0.4;
    const sway = breeze * this.swayAmp * h * (reduceMotion ? 0.3 : 1);
    const ox = this.offX, oy = this.offY;

    const P = this.P;
    P[0] = baseX;                                              P[1] = baseY;
    P[2] = baseX + this.bend[0] * h + sway * 0.2 + ox * 0.15;  P[3] = baseY - h * 0.33 + oy * 0.1;
    P[4] = baseX + this.bend[1] * h + sway * 0.6 + ox * 0.55;  P[5] = baseY - h * 0.66 + oy * 0.45;
    P[6] = baseX + this.bend[2] * h + sway + ox;               P[7] = baseY - h + oy;

    this.R = R;
    this.h = h;
    this.g = easeInOutCubic(progress(this.age, 0, this.growDur));
  }

  /** The head sits at the growing tip of the stem, leaning with it. */
  placeHead() {
    const P = this.P, g = this.g;
    this.hx = bez(P[0], P[2], P[4], P[6], g);
    this.hy = bez(P[1], P[3], P[5], P[7], g);
    const dx = bezD(P[0], P[2], P[4], P[6], g);
    const dy = bezD(P[1], P[3], P[5], P[7], g);
    // it also lags a little behind fast movement
    this.hAng = Math.atan2(dy, dx) + Math.PI / 2 + clamp(this.velX * 0.0007, -0.5, 0.5);
    this.placeCenter();
  }

  /** Visual center of the head (side-view flowers sit above the stem tip). */
  placeCenter() {
    const off = this.R * this.sp.centerY;
    this.cx = this.hx + Math.sin(this.hAng) * off;
    this.cy = this.hy - Math.cos(this.hAng) * off;
  }

  /**
   * Sparkles, bloom moments, bees and pollen over the flower's life.
   * @param {number} dt
   */
  updateEvents(dt) {
    const L0 = this.bloomStart, R = this.R;

    // sparkles trailing the growing tip (and swirling around a charging mystery bud)
    if (this.g > 0 && this.g < 1 && Math.random() < dt * 22 * this.z) spawnTipSpark(this.hx, this.hy, this.hue);
    if (this.mystery && this.age > this.growDur && Math.random() < dt * 14) {
      spawnTipSpark(this.cx, this.cy - R * 0.4, rand(0, 360));
    }

    // burst of sparks as it opens (only if we actually watched it open)
    if (!this.burst && this.age > L0 + 0.6) {
      this.burst = true;
      if (this.age < L0 + 1.5) spawnBurst(this.cx, this.cy, this.hue, R);
    }

    // rare / legendary bloom moment
    if (this.sp.rarity !== 'common' && !this.announced && this.age > L0 + 0.4) {
      this.announced = true;
      if (this.age < L0 + 1.5) {
        this.eventAt = clock.time;
        if (this.sp.rarity === 'legendary') legendaryBloom(this);
        else rareBloom(this);
      }
    }

    // a bee may come to visit once it's open
    if (!this.beeChecked && this.age > L0 + 1.8) {
      this.beeChecked = true;
      maybeSpawnBee(this);
    }

    // drifting pollen once fully open; legendaries also send up a fountain of sparks
    if (this.age > L0 + 2.4 && clock.time > this.nextPollen) {
      this.nextPollen = clock.time + rand(0.5, 1.6);
      if (this.kind === 'dandelion') spawnSeeds(this, 1);
      else spawnPollen(this.cx, this.cy, this.hue, R);
    }
    if (this.sp.rarity === 'legendary' && this.age > L0 + 1 && Math.random() < dt * 26) spawnFountain(this);
  }

  /** A legendary attempt: either it really is legendary, or it fizzles into something else. */
  resolveMystery() {
    this.mystery = false;
    if (Math.random() < CONFIG.legendaryChance) return;
    this.setSpecies(Math.random() < 0.45 ? pick(RARE) : pick(COMMON));
    if (!reduceMotion) spawnBurst(this.cx, this.cy - this.R * 0.3, 250, this.R, 24, 10);
    addText(this.cx, this.cy - this.R * 1.5, 'not this time…', 'hsla(260, 45%, 86%, 1)');
  }

  /* ----------------------------------------------------------- interaction */

  /** A quick tap: the flower wobbles on its spring and shakes loose some pollen. */
  shake() {
    const kick = 420 * (view.unit / 800 + 0.3);
    this.velX += (Math.random() < 0.5 ? -1 : 1) * kick;
    this.velY -= kick * 0.12;
    this.shakeAt = clock.time;
    if (this.kind === 'dandelion' && this.age > this.bloomStart + 1) spawnSeeds(this, 12);
    else for (let i = 0; i < 6; i++) spawnPollen(this.cx, this.cy, this.hue, this.R);
    spawnBurst(this.cx, this.cy, this.hue, this.R * 0.6, 10);
  }

  /** Pulled up far enough: the stem snaps and the flower comes away in your hand. */
  cut() {
    const P = this.P;
    this.cutAt = clock.time;
    this.cutT = rand(0.35, 0.5);
    this.held = false;
    this.strain = 0;
    this.carried = true;
    this.pieceLen = Math.min(this.h * (1 - this.cutT) * 0.5, this.R * 3.2);
    Object.assign(this.free, { x: this.hx, y: this.hy, vx: 0, vy: -80, ang: this.hAng, va: 0 });

    const sx = bez(P[0], P[2], P[4], P[6], this.cutT);
    const sy = bez(P[1], P[3], P[5], P[7], this.cutT);
    spawnBurst(sx, sy, 95, this.R * 0.5, 16); // green snap at the cut
    spawnBurst(this.cx, this.cy, this.hue, this.R, 20);
    for (let i = 0; i < 4; i++) spawnScent(this.cx, this.cy - this.R * 0.3, this.hue, this.R);
  }

  /** Let go of a picked flower: it drifts away and fades. */
  release() {
    this.carried = false;
    this.releasedAt = clock.time;
  }

  /**
   * A picked flower follows the finger, then floats off; it trails scent the whole time.
   * @param {number} dt
   */
  updatePicked(dt) {
    const fr = this.free;
    const press = input.press;
    const n = Math.ceil(dt / SUBSTEP);
    for (let i = 0; i < n; i++) {
      const st = dt / n;
      if (this.carried && press && press.f === this) {
        // follow the finger, keeping the spot where it was grabbed
        const tx = press.x - fr.ox, ty = press.y - fr.oy;
        fr.vx += ((tx - fr.x) * 160 - fr.vx * 16) * st;
        fr.vy += ((ty - fr.y) * 160 - fr.vy * 16) * st;
      } else {
        // let go: drift gently up and away on the breeze
        fr.vx += (clock.wind * 25 - fr.vx) * 1.2 * st;
        fr.vy += (-40 - fr.vy) * 1.2 * st;
      }
      fr.x += fr.vx * st;
      fr.y += fr.vy * st;
      // the head leans into the motion, then settles
      const lean = clamp(fr.vx * 0.0025, -0.7, 0.7);
      fr.va += ((lean - fr.ang) * 60 - fr.va * 8) * st;
      fr.ang += fr.va * st;
    }

    this.hx = fr.x;
    this.hy = fr.y;
    this.hAng = fr.ang;
    this.placeCenter();

    if (!reduceMotion && clock.time > this.nextScent) {
      this.nextScent = clock.time + rand(0.15, 0.3);
      spawnScent(this.cx, this.cy - this.R * 0.4, this.hue, this.R);
    }
    if ((this.releasedAt && clock.time - this.releasedAt > 6) || fr.y < -this.R * 4) this.dead = true;
  }
}
