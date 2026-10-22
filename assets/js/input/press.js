/**
 * Pressing a flower: a quick tap shakes it, press-and-hold lets you bend it around,
 * and pulling it up far enough snaps the stem so you can carry the flower away.
 */

import { clamp, rand } from '../core/math.js';
import { clock, input, view } from '../core/state.js';
import { setCursor } from '../render/canvas.js';
import { cam } from '../render/camera.js';

/** @import { Flower } from '../flowers/flower.js' */
/** @import { PressState } from '../core/types.js' */

/** Holding still this long counts as "hold" rather than a tap. */
const HOLD_DELAY = 0.25;

/**
 * Start pressing flower `f` at world point (wx, wy).
 * @param {Flower} f
 * @param {number} id   pointer id
 * @param {number} wx
 * @param {number} wy
 */
export function pressFlower(f, id, wx, wy) {
  input.press = { f, id, x0: wx, y0: wy, x: wx, y: wy, t0: clock.time, dragging: false };
}

/** @param {PressState} p */
function startHold(p) {
  p.dragging = true;
  p.f.held = true;
  setCursor('grabbing');
}

/**
 * The pressing pointer moved (world coordinates).
 * @param {number} wx
 * @param {number} wy
 */
export function movePress(wx, wy) {
  const p = input.press;
  if (!p) return;
  p.x = wx;
  p.y = wy;
  if (!p.dragging && Math.hypot(wx - p.x0, wy - p.y0) * cam.zoom > 6) startHold(p);
}

/**
 * The pointer let go (or was cancelled).
 * @param {boolean} cancelled
 */
export function endPress(cancelled) {
  const p = input.press;
  if (!p) return;
  const f = p.f;
  if (f.cutAt) f.release();                         // a picked flower floats away
  else if (p.dragging || cancelled) f.held = false; // springs back with a wobble
  else f.shake();                                   // a simple tap
  input.press = null;
  setCursor('pointer');
}

/** Every frame: bend the held flower towards the pointer; pull up far enough and it snaps. */
export function updatePress() {
  const p = input.press;
  if (!p) return;
  const f = p.f;
  if (f.dying || f.dead) {
    f.held = false;
    input.press = null;
    return;
  }
  if (!p.dragging && clock.time - p.t0 > HOLD_DELAY) startHold(p);
  if (!p.dragging || f.cutAt) return;

  // rubber band: the further you pull, the harder the stem resists
  const dx = p.x - p.x0, dy = p.y - p.y0;
  const L = Math.max(60, f.h * 0.45);
  const k = L / (L + Math.hypot(dx, dy));
  const cutDist = clamp(f.h * 0.28, 50 / cam.zoom, (view.H * 0.35) / cam.zoom);
  const strain = clamp(-dy / cutDist);
  const jitter = strain ** 3 * 3; // trembles just before it snaps
  f.strain = strain;
  f.dragTx = dx * k + rand(-jitter, jitter);
  f.dragTy = dy * k + rand(-jitter, jitter);

  if (-dy > cutDist) {
    f.cut();
    // keep the flower under the same spot of the finger
    f.free.ox = p.x - f.hx;
    f.free.oy = p.y - f.hy;
  }
}
