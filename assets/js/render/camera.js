/** The camera: pan, zoom, fling, glide and the world ↔ screen transforms. */

import { clamp, rand } from '../core/math.js';
import { clock, reduceMotion, view } from '../core/state.js';
import { ctx } from './canvas.js';

export const MAX_ZOOM = 3.5;

/**
 * World coordinates of the screen's top-left corner, the zoom, a fling velocity
 * (screen px/s), whether a finger is holding the view, and when it last shook.
 */
export const cam = { x: 0, y: 0, zoom: 1, vx: 0, vy: 0, held: false, shakeAt: -10 };

/** @type {{ target: number, sx: number, sy: number } | null} */
let zoomAnim = null;
/** @type {number | null} */
let glideX = null;

/* ------------------------------------------------------------- coordinates */

/** Zoomed out far enough to see the whole garden width. */
export const minZoom = () => clamp(view.W / view.WW, 0.25, 1);

/** @type {(sx: number) => number} */
export const toWorldX = (sx) => cam.x + sx / cam.zoom;
/** @type {(sy: number) => number} */
export const toWorldY = (sy) => cam.y + sy / cam.zoom;
/** @type {(wx: number) => number} */
export const toScreenX = (wx) => (wx - cam.x) * cam.zoom;
/** @type {(wy: number) => number} */
export const toScreenY = (wy) => (wy - cam.y) * cam.zoom;

/**
 * Whether a world point is on screen, give or take a margin.
 * @type {(x: number, y: number, margin: number) => boolean}
 */
export const inView = (x, y, margin) =>
  x > view.left - margin && x < view.right + margin && y > view.top - margin && y < view.bottom + margin;

/* ---------------------------------------------------------------- movement */

/** Keep the view inside the garden; the ground always sits at the bottom of the screen. */
export function clampCam() {
  cam.zoom = clamp(cam.zoom, minZoom(), MAX_ZOOM);
  const vw = view.W / cam.zoom, vh = view.H / cam.zoom;
  cam.x = vw >= view.WW ? (view.WW - vw) / 2 : clamp(cam.x, 0, view.WW - vw);
  cam.y = vh >= view.WH ? view.WH - vh : clamp(cam.y, 0, view.WH - vh);
}

/**
 * @param {number} x  world x of the screen's left edge
 * @param {number} y  world y of the screen's top edge
 */
export function moveCameraTo(x, y) {
  cam.x = x;
  cam.y = y;
  clampCam();
}

/**
 * Move the view by a distance in screen px.
 * @param {number} dx
 * @param {number} dy
 */
export function panBy(dx, dy) {
  glideX = null;
  moveCameraTo(cam.x + dx / cam.zoom, cam.y + dy / cam.zoom);
}

/**
 * Set the zoom and put world point (wx, wy) under screen point (sx, sy).
 * @param {number} wx
 * @param {number} wy
 * @param {number} sx
 * @param {number} sy
 * @param {number} zoom
 */
export function placeAt(wx, wy, sx, sy, zoom) {
  cam.zoom = clamp(zoom, minZoom(), MAX_ZOOM);
  moveCameraTo(wx - sx / cam.zoom, wy - sy / cam.zoom);
}

/**
 * Zoom by `factor`, keeping the world point under screen point (sx, sy) in place.
 * @param {number} sx
 * @param {number} sy
 * @param {number} factor
 */
export function zoomAt(sx, sy, factor) {
  placeAt(toWorldX(sx), toWorldY(sy), sx, sy, cam.zoom * factor);
}

/**
 * Smoothly zoom towards `target`, around the lower middle of the screen.
 * @param {number} target
 */
export function animateZoom(target) {
  zoomAnim = { target: clamp(target, minZoom(), MAX_ZOOM), sx: view.W / 2, sy: view.H * 0.6 };
}

/** Whole garden ↔ normal view. */
export function toggleOverview() {
  const target = cam.zoom > minZoom() + 0.01 ? minZoom() : 1;
  animateZoom(target);
  glideX = (view.WW - view.W / clamp(target, minZoom(), MAX_ZOOM)) / 2;
}

/** Cancel any fling, zoom animation or glide (e.g. when the user grabs the view). */
export function stopCamera() {
  cam.vx = cam.vy = 0;
  zoomAnim = null;
  glideX = null;
}

/** Which part of the garden is in the middle of the screen (0 – 1). */
export const focusOf = () => (view.WW ? (cam.x + view.W / cam.zoom / 2) / view.WW : 0.5);

/**
 * Put garden position `focus` (0 – 1) back in the middle of the screen, e.g. after a resize.
 * @param {number} focus
 */
export function refocus(focus) {
  moveCameraTo(focus * view.WW - view.W / cam.zoom / 2, cam.y);
}

export function shakeCamera() {
  cam.shakeAt = clock.time;
}

/** @param {number} dt */
export function updateCamera(dt) {
  if (zoomAnim) {
    zoomAt(zoomAnim.sx, zoomAnim.sy, Math.pow(zoomAnim.target / cam.zoom, Math.min(1, dt * 9)));
    if (Math.abs(cam.zoom - zoomAnim.target) < 0.002) zoomAnim = null;
  }
  if (glideX !== null) {
    moveCameraTo(cam.x + (glideX - cam.x) * Math.min(1, dt * 6), cam.y);
    if (Math.abs(glideX - cam.x) < 0.5) glideX = null;
  }
  // fling: keep gliding for a moment after a quick drag
  if (!cam.held && (Math.abs(cam.vx) > 2 || Math.abs(cam.vy) > 2)) {
    moveCameraTo(cam.x - (cam.vx * dt) / cam.zoom, cam.y - (cam.vy * dt) / cam.zoom);
    const decay = Math.exp(-dt * 4);
    cam.vx *= decay;
    cam.vy *= decay;
  }

  view.left = cam.x;
  view.top = cam.y;
  view.right = cam.x + view.W / cam.zoom;
  view.bottom = cam.y + view.H / cam.zoom;
}

/* ----------------------------------------------------------------- drawing */

/** Draw in world coordinates from here on (with a little shake after a legendary bloom). */
export function worldSpace() {
  const z = cam.zoom, dpr = view.DPR;
  const since = clock.time - cam.shakeAt;
  const shake = since < 0.8 && !reduceMotion ? (1 - since / 0.8) * 7 : 0;
  const sx = shake ? rand(-shake, shake) : 0;
  const sy = shake ? rand(-shake, shake) : 0;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, (-cam.x * z + sx) * dpr, (-cam.y * z + sy) * dpr);
}
