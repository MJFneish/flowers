/** The backdrop: twinkling stars (screen space) and two layers of swaying grass (world space). */

import { TAU, clamp, easeOutCubic, progress, rand } from '../core/math.js';
import { clock, reduceMotion, view } from '../core/state.js';
import { ctx } from '../render/canvas.js';
import { cam } from '../render/camera.js';

/** @import { BladeDef, StarDef } from '../core/types.js' */

/** @type {StarDef[]} */
let stars = [];
/** @type {BladeDef[]} */
let backGrass = [];
/** @type {BladeDef[]} */
let frontGrass = [];
/** @type {CanvasGradient | null} */
let backFill = null;
/** @type {CanvasGradient | null} */
let frontFill = null;
/** Garden width the grass was generated for. */
let grassWidth = 0;

/* ------------------------------------------------------------------- stars */

export function makeStars() {
  const n = clamp(Math.round((view.W * view.H) / 9000), 60, 220);
  stars = Array.from({ length: n }, () => ({
    xf: Math.random(), yf: Math.random() * 0.75,
    r: rand(0.5, 1.6), base: rand(0.15, 0.6), sp: rand(0.5, 2.2), ph: rand(0, TAU),
  }));
}

/** Call in screen space. The stars drift a little as you pan, for depth. */
export function drawStars() {
  const span = view.W * 1.3;
  const shift = cam.x * cam.zoom * 0.05;
  for (const s of stars) {
    const a = s.base * (0.55 + 0.45 * Math.sin(clock.time * s.sp + s.ph));
    const x = (((s.xf * span - shift) % span) + span) % span;
    ctx.fillStyle = `rgba(255, 226, 200, ${a.toFixed(3)})`;
    ctx.fillRect(x, s.yf * view.H, s.r, s.r);
  }
}

/* ------------------------------------------------------------------- grass */

function makeGrass() {
  grassWidth = view.WW;
  /** @type {(hMin: number, hMax: number, wMin: number, wMax: number, dMin: number, dMax: number) => BladeDef} */
  const blade = (hMin, hMax, wMin, wMax, dMin, dMax) => ({
    xf: Math.random(), hf: rand(hMin, hMax), w: rand(wMin, wMax),
    lean: rand(-0.38, 0.38), ph: rand(0, TAU), delay: rand(dMin, dMax),
  });
  backGrass = Array.from({ length: Math.round(view.WW / 4.5) }, () => blade(0.04, 0.13, 2, 5, 0, 0.9));
  frontGrass = Array.from({ length: Math.round(view.WW / 9) }, () => blade(0.025, 0.075, 2.5, 6, 0.2, 1.1));
}

function makeGrassFills() {
  const WH = view.WH;
  backFill = ctx.createLinearGradient(0, WH, 0, WH - WH * 0.14);
  backFill.addColorStop(0, 'hsl(160, 50%, 3%)');
  backFill.addColorStop(1, 'hsl(125, 45%, 17%)');
  frontFill = ctx.createLinearGradient(0, WH, 0, WH - WH * 0.08);
  frontFill.addColorStop(0, 'hsl(160, 40%, 2%)');
  frontFill.addColorStop(1, 'hsl(130, 40%, 9%)');
}

/** Rebuild after the garden size changes (new grass only if the width changed a lot). */
export function resizeBackground() {
  makeGrassFills();
  if (!backGrass.length || Math.abs(view.WW - grassWidth) > 100) makeGrass();
}

/**
 * All visible blades of a layer go into one path → one fill call. Call in world space.
 * @param {BladeDef[]} blades
 * @param {CanvasGradient | null} fill
 */
function drawGrass(blades, fill) {
  if (!fill) return;
  const { WW, WH } = view;
  ctx.beginPath();
  for (const b of blades) {
    const x = b.xf * WW;
    if (x < view.left - 30 || x > view.right + 30) continue;
    const grown = easeOutCubic(progress(clock.time, b.delay, 1.6));
    if (grown <= 0) continue;
    const h = b.hf * WH * grown;
    const sway = (clock.wind * 0.6 + Math.sin(clock.time * 1.6 + b.ph) * 0.4) * h * 0.18 * (reduceMotion ? 0.3 : 1);
    const tx = x + b.lean * h + sway, ty = WH - h;
    const mx = x + b.lean * h * 0.35 + sway * 0.3, my = WH - h * 0.5;
    ctx.moveTo(x - b.w / 2, WH + 2);
    ctx.quadraticCurveTo(mx - b.w * 0.3, my, tx, ty);
    ctx.quadraticCurveTo(mx + b.w * 0.3, my, x + b.w / 2, WH + 2);
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

export const drawBackGrass = () => drawGrass(backGrass, backFill);
export const drawFrontGrass = () => drawGrass(frontGrass, frontFill);
