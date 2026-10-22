/** The scene canvas, its 2D context and the glow (bloom) layer. */

import { CONFIG } from '../config.js';
import { dom } from '../core/dom.js';
import { view } from '../core/state.js';

export const canvas = dom.garden;
export const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const glowCtx = /** @type {CanvasRenderingContext2D} */ (dom.glow.getContext('2d'));

/** Match both canvases to the measured screen size. */
export function resizeCanvases() {
  canvas.width = Math.round(view.W * view.DPR);
  canvas.height = Math.round(view.H * view.DPR);
  // the glow layer is a quarter-size copy — CSS stretches and blurs it
  dom.glow.width = Math.max(1, Math.round(view.W / 4));
  dom.glow.height = Math.max(1, Math.round(view.H / 4));
}

/** Draw in screen coordinates (CSS px) from here on. */
export function screenSpace() {
  ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
}

export function clearScreen() {
  screenSpace();
  ctx.clearRect(0, 0, view.W, view.H);
}

export function initGlow() {
  if (!CONFIG.glow) dom.glow.style.display = 'none';
}

/** Cheap bloom: copy the finished frame into the low-res glow canvas. */
export function copyGlow() {
  if (!CONFIG.glow) return;
  glowCtx.clearRect(0, 0, dom.glow.width, dom.glow.height);
  glowCtx.drawImage(canvas, 0, 0, dom.glow.width, dom.glow.height);
}

/** @param {string} cursor */
export function setCursor(cursor) {
  canvas.style.cursor = cursor;
}
