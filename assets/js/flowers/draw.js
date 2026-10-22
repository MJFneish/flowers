/** Draws a flower: leaves, stem, head (via its species), growing tip, name label, picked piece. */

import { CONFIG } from '../config.js';
import { TAU, bez, bezD, clamp, easeOutBack, easeOutCubic, lerp, progress } from '../core/math.js';
import { clock, reduceMotion, view } from '../core/state.js';
import { ctx } from '../render/canvas.js';
import { drawLeafShape, drawSparkle, pointedPetal } from '../render/shapes.js';
import { drawGlint, drawGodRays, drawHalo, drawRarityExtras, drawShimmer } from './effects.js';
import { FADE_OUT } from './flower.js';

/** @import { Flower } from './flower.js' */
/** @import { HeadState, LeafDef } from '../core/types.js' */

/** @param {Flower} f */
const stemWidth = (f) => (1.6 + 3.2 * f.z) * (view.unit / 800) + 1.2;

/**
 * Rough horizontal extent check, to skip flowers that are off-screen.
 * @param {Flower} f
 */
function isOnScreen(f) {
  const m = f.R * 3.2 + 80;
  return Math.max(f.P[0], f.hx) + m > view.left && Math.min(f.P[0], f.hx) - m < view.right;
}

/* ------------------------------------------------------------------ passes */

/**
 * Main pass: the flower in the ground (or just its fading stub once picked).
 * @param {Flower} f
 */
export function drawFlower(f) {
  if (f.age <= 0 || !isOnScreen(f)) return;
  // further flowers are dimmer; removed ones fade out
  let alpha = lerp(0.45, 1, clamp((f.z - 0.45) / 0.55));
  if (f.dying) alpha *= 1 - progress(clock.time, f.dying, FADE_OUT);
  if (alpha <= 0) return;

  if (f.cutAt) {
    drawStub(f, alpha);
    return;
  }
  f.alpha = alpha;
  ctx.globalAlpha = alpha;
  for (const lf of f.leaves) drawLeaf(f, lf);
  drawStem(f, f.g);
  drawHead(f);
  if (f.g > 0 && f.g < 1) drawTip(f);
  if (CONFIG.showNames && (f.planted || f.sp.rarity !== 'common')) drawLabel(f);
  ctx.globalAlpha = 1;
}

/**
 * Late pass: a picked flower, drawn in front of everything else.
 * @param {Flower} f
 */
export function drawPickedFlower(f) {
  if (!f.cutAt) return;
  const a = f.releasedAt ? 1 - progress(clock.time, f.releasedAt + 3.5, 2.5) : 1;
  if (a <= 0) return;
  f.alpha = a;
  ctx.globalAlpha = a;
  drawPiece(f);
  drawHead(f);
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------- stem + leaf */

/**
 * What's left in the ground after picking: a stub that fades away.
 * @param {Flower} f
 * @param {number} alpha
 */
function drawStub(f, alpha) {
  const a = alpha * (1 - progress(clock.time, f.cutAt + 0.8, 1.5));
  if (a <= 0) return;
  const end = Math.min(f.g, f.cutT);
  const P = f.P;
  ctx.globalAlpha = a;
  for (const lf of f.leaves) if (lf.t < end - 0.04) drawLeaf(f, lf);
  drawStem(f, end);
  // fresh cut end
  ctx.fillStyle = 'hsl(95, 70%, 75%)';
  ctx.beginPath();
  ctx.arc(bez(P[0], P[2], P[4], P[6], end), bez(P[1], P[3], P[5], P[7], end), Math.max(1.2, stemWidth(f) * 0.3), 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Tapered stem along the bezier, up to `tEnd` (0 – 1).
 * @param {Flower} f
 * @param {number} tEnd
 */
function drawStem(f, tEnd) {
  if (tEnd <= 0.001) return;
  const c = ctx, P = f.P, z = f.z;
  const steps = Math.max(2, Math.ceil(36 * tEnd));
  const w0 = stemWidth(f), w1 = w0 * 0.4;
  const cx = [], cy = [], nxs = [], nys = [], ws = [];

  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (tEnd * i) / steps;
    const x = bez(P[0], P[2], P[4], P[6], t);
    const y = bez(P[1], P[3], P[5], P[7], t);
    const dx = bezD(P[0], P[2], P[4], P[6], t);
    const dy = bezD(P[1], P[3], P[5], P[7], t);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const w = lerp(w0, w1, t) / 2;
    if (i === 0) c.moveTo(x + nx * w, y + ny * w);
    else c.lineTo(x + nx * w, y + ny * w);
    cx.push(x); cy.push(y); nxs.push(nx); nys.push(ny); ws.push(w);
  }
  for (let i = steps; i >= 0; i--) c.lineTo(cx[i] - nxs[i] * ws[i], cy[i] - nys[i] * ws[i]);
  c.closePath();

  const grad = c.createLinearGradient(0, P[1], 0, P[7]);
  grad.addColorStop(0, `hsl(160, 45%, ${6 + 6 * z}%)`);
  grad.addColorStop(1, `hsl(130, 55%, ${18 + 14 * z}%)`);
  c.fillStyle = grad;
  c.fill();

  // warm rim light along one edge (brighter while the stem is under strain)
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = cx[i] + nxs[i] * ws[i] * 0.45, y = cy[i] + nys[i] * ws[i] * 0.45;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = `hsla(${f.hue + 20}, 100%, ${70 + 20 * f.strain}%, ${0.35 * z + 0.5 * f.strain})`;
  c.lineWidth = Math.max(0.8, w0 * 0.18);
  c.stroke();
}

/**
 * @param {Flower} f
 * @param {LeafDef} lf
 */
function drawLeaf(f, lf) {
  const p = progress(f.g, lf.t, 0.22);
  if (p <= 0) return;
  const P = f.P, t = lf.t;
  const x = bez(P[0], P[2], P[4], P[6], t);
  const y = bez(P[1], P[3], P[5], P[7], t);
  const ang = Math.atan2(bezD(P[1], P[3], P[5], P[7], t), bezD(P[0], P[2], P[4], P[6], t));
  const a = ang + lf.side * (lf.ang + Math.sin(clock.time * 1.2 + lf.phase) * 0.06);
  const L = lf.lf * Math.min(view.unit * (0.6 + 0.4 * f.z), f.h * 1.1) * easeOutBack(p);
  drawLeafShape(ctx, x, y, a, L, L * lf.wm, lf.side, f.hue);
}

/**
 * The short piece of stem that came away with a picked flower.
 * @param {Flower} f
 */
function drawPiece(f) {
  const c = ctx, fr = f.free, len = f.pieceLen;
  const dirX = -Math.sin(fr.ang), dirY = Math.cos(fr.ang); // "down" from the head
  const swing = clamp(-fr.vx * 0.06, -len * 0.45, len * 0.45);
  const ex = f.hx + dirX * len + swing * 0.6, ey = f.hy + dirY * len;
  const mx = f.hx + dirX * len * 0.5 + swing, my = f.hy + dirY * len * 0.5;
  const w = stemWidth(f) * 0.75;

  // one leaf, about halfway down
  const t = 0.55, u = 1 - t;
  const lx = u * u * f.hx + 2 * u * t * mx + t * t * ex;
  const ly = u * u * f.hy + 2 * u * t * my + t * t * ey;
  const L = Math.min(f.R * 1.1, len * 0.6);
  drawLeafShape(c, lx, ly, Math.atan2(-dirY, -dirX) + 0.85, L, L * 0.8, 1, f.hue);

  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(f.hx, f.hy);
  c.quadraticCurveTo(mx, my, ex, ey);
  c.strokeStyle = `hsl(135, 50%, ${16 + 12 * f.z}%)`;
  c.lineWidth = w;
  c.stroke();
  c.strokeStyle = `hsla(${f.hue + 20}, 100%, 70%, 0.35)`;
  c.lineWidth = Math.max(0.8, w * 0.25);
  c.stroke();

  c.fillStyle = 'hsl(95, 70%, 75%)';
  c.beginPath();
  c.arc(ex, ey, w * 0.55, 0, TAU);
  c.fill();
}

/* -------------------------------------------------------------------- head */

/**
 * Build the petal gradients for the current radius (they're cached on the flower).
 * @param {Flower} f
 */
function ensurePaints(f) {
  const R = f.R;
  if (f.gradR === R) return;
  f.gradR = R;
  const h = f.hue;
  f.grads = f.paints.map((p) => {
    const gr = ctx.createLinearGradient(0, 0, 0, -R * p.len);
    for (const [o, dh, sat, l, a] of p.stops) gr.addColorStop(o, `hsla(${h + dh}, ${sat}%, ${l}%, ${a})`);
    return gr;
  });
  const bud = ctx.createLinearGradient(0, 0, 0, -R * 0.62);
  for (const [o, dh, sat, l] of f.sp.bud) bud.addColorStop(o, `hsl(${h + dh}, ${sat}%, ${l}%)`);
  f.budGrad = bud;
}

/** @param {Flower} f */
function drawHead(f) {
  const budIn = progress(f.age, f.growDur * 0.72, 0.6);
  if (budIn <= 0) return;
  if (f.mystery) {
    drawMysteryBud(f, budIn);
    return;
  }
  const bloom = progress(f.age, f.bloomStart, 2.0);
  /** @type {HeadState} */
  const s = {
    R: f.R,
    budIn,
    L0: f.bloomStart,
    bloom,
    eBloom: easeOutCubic(bloom),
    breathe: 1 + Math.sin(clock.time * 1.6 + f.phase) * 0.025 * bloom,
  };
  ensurePaints(f);
  const special = f.sp.rarity !== 'common';

  const c = ctx;
  c.save();
  c.translate(f.hx, f.hy);
  c.rotate(f.hAng);
  if (f.shakeAt) {
    // quick, fading wiggle after a tap
    const st = clock.time - f.shakeAt;
    c.rotate(Math.sin(st * 28) * 0.22 * Math.exp(-st * 3.5));
  }
  if (bloom > 0) {
    if (f.sp.rarity === 'legendary') drawGodRays(c, f, s);
    drawHalo(c, f, s);
  }
  if (f.sp.front) c.scale(1, f.tilt);
  f.sp.draw(c, f, s);
  if (special && bloom > 0.5) drawShimmer(c, f, s);
  c.restore();

  if (f.sp.glint && bloom > 0) drawGlint(c, f, s);
  if (special && bloom > 0) drawRarityExtras(c, f, s);
}

/**
 * A shimmering, color-shifting bud that charges up before revealing what it is.
 * @param {Flower} f
 * @param {number} budIn
 */
function drawMysteryBud(f, budIn) {
  const c = ctx, R = f.R, time = clock.time;
  const span = Math.max(0.1, f.bloomStart - 0.15 - f.growDur);
  const charge = progress(f.age, f.growDur, span);
  const k = easeOutBack(budIn);
  const hh = (time * 80 + f.phase * 57) % 360;
  const pulse = 0.6 + 0.4 * Math.sin(time * (4 + charge * 8));
  const tremble = charge > 0.55 && !reduceMotion ? Math.sin(time * 45) * (charge - 0.55) * 0.18 : 0;
  const by = -R * 0.38 * k;

  c.save();
  c.translate(f.hx, f.hy);
  c.rotate(f.hAng + tremble);

  // aura that grows as it charges
  c.save();
  c.globalCompositeOperation = 'lighter';
  const ar = R * (1.3 + charge * 1.6) * k + 1;
  const ag = c.createRadialGradient(0, by, 0, 0, by, ar);
  ag.addColorStop(0, `hsla(${hh}, 100%, 75%, ${(0.25 + 0.4 * charge) * pulse})`);
  ag.addColorStop(1, `hsla(${hh + 60}, 100%, 60%, 0)`);
  c.fillStyle = ag;
  c.beginPath();
  c.arc(0, by, ar, 0, TAU);
  c.fill();
  c.restore();

  // the bud itself
  c.scale(k, k);
  const g = c.createLinearGradient(0, 0, 0, -R * 0.8);
  g.addColorStop(0, `hsl(${hh}, 100%, ${70 + 15 * pulse}%)`);
  g.addColorStop(1, `hsl(${hh + 70}, 100%, 55%)`);
  c.fillStyle = g;
  pointedPetal(c, R * 0.8, R * 0.5);
  c.fill();
  c.fillStyle = 'hsl(145, 45%, 24%)';
  for (const side of [-1, 1]) {
    c.save();
    c.rotate(side * 0.35);
    pointedPetal(c, R * 0.5, R * 0.18);
    c.fill();
    c.restore();
  }
  c.restore();

  // sparkles circling it, faster and closer as it charges
  const d = R * 0.38 * k;
  const bx = f.hx + Math.sin(f.hAng) * d, bw = f.hy - Math.cos(f.hAng) * d;
  const n = 3 + Math.round(charge * 4);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = time * (1.6 + charge * 4) + (i * TAU) / n;
    const rr = R * (1 - charge * 0.35) * k;
    c.fillStyle = `hsla(${(hh + i * 50) % 360}, 100%, 85%, 0.9)`;
    drawSparkle(c, bx + Math.cos(a) * rr, bw + Math.sin(a) * rr * 0.6, R * 0.07 + 1, time * 3 + i);
  }
  c.restore();
}

/**
 * Glowing point of light that "draws" the stem as it grows.
 * @param {Flower} f
 */
function drawTip(f) {
  const c = ctx;
  const r = (7 + 7 * f.z) * (view.unit / 800 + 0.4);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(f.hx, f.hy, 0, f.hx, f.hy, r);
  g.addColorStop(0, `hsla(${f.hue + 35}, 100%, 85%, 0.95)`);
  g.addColorStop(0.35, `hsla(${f.hue + 15}, 100%, 60%, 0.45)`);
  g.addColorStop(1, `hsla(${f.hue}, 100%, 50%, 0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(f.hx, f.hy, r, 0, TAU);
  c.fill();
  c.restore();
}

/**
 * The flower's name floats above it for a few seconds after it opens.
 * @param {Flower} f
 */
function drawLabel(f) {
  const rarity = f.sp.rarity;
  const hold = rarity === 'legendary' ? 6 : rarity === 'rare' ? 4.5 : 3;
  const a = progress(f.age, f.bloomStart + 0.2, 0.6) * (1 - progress(f.age, f.bloomStart + hold, 1.2));
  if (a <= 0) return;
  const c = ctx;
  const size = Math.round(clamp(view.unit * 0.022, 12, 17) * (rarity === 'legendary' ? 1.3 : 1));
  const top = f.R * (f.sp.front ? 1.25 : 0.75) + 10;
  const name = f.sp.name;
  const text = rarity === 'legendary' ? `✦ ${name} ✦` : rarity === 'rare' ? `✧ ${name} ✧` : name;

  c.save();
  c.globalAlpha = f.alpha * a;
  c.font = `italic ${size}px Georgia, "Times New Roman", serif`;
  c.textAlign = 'center';
  c.textBaseline = 'bottom';
  c.shadowColor = rarity === 'legendary' ? 'hsl(42, 100%, 55%)' : `hsl(${f.hue}, 100%, 55%)`;
  c.shadowBlur = rarity === 'common' ? 10 : 16;
  c.fillStyle = rarity === 'legendary' ? 'hsl(45, 100%, 82%)' : `hsl(${f.hue + 20}, 100%, 86%)`;
  c.fillText(text, f.cx, f.cy - top + (1 - a) * 6);
  c.restore();
}
