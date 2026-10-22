/**
 * Mouse / touch / pen on the garden:
 * one pointer on a flower → press (see press.js); on empty ground → tap to plant or drag to pan;
 * two fingers → pinch to zoom.
 */

import { lerp } from '../core/math.js';
import { input } from '../core/state.js';
import { canvas, setCursor } from '../render/canvas.js';
import { cam, moveCameraTo, placeAt, stopCamera, toWorldX, toWorldY } from '../render/camera.js';
import { flowerAt, plantAt } from '../world/garden.js';
import { endPress, movePress, pressFlower } from './press.js';

/** @import { PanState, PinchState } from '../core/types.js' */

/** A drag shorter than this (px) still counts as a tap. */
const TAP_SLOP = 8;

/**
 * Screen position of every pointer that is currently down.
 * @type {Map<number, { x: number, y: number }>}
 */
const pointers = new Map();
/** @type {PanState | null} */
let pan = null;
/** @type {PinchState | null} */
let pinch = null;

/* --------------------------------------------------------------------- pan */

/**
 * @param {number} id
 * @param {number} sx
 * @param {number} sy
 * @param {boolean} moved  already dragging (so letting go won't plant)
 */
function startPan(id, sx, sy, moved) {
  pan = {
    id, sx0: sx, sy0: sy, camX0: cam.x, camY0: cam.y, moved,
    lastX: sx, lastY: sy, lastT: performance.now(), vx: 0, vy: 0,
  };
  cam.held = true;
}

/**
 * @param {PanState} p
 * @param {PointerEvent} e
 */
function movePan(p, e) {
  const dx = e.clientX - p.sx0, dy = e.clientY - p.sy0;
  if (!p.moved && Math.hypot(dx, dy) > TAP_SLOP) p.moved = true;
  if (!p.moved) return;
  moveCameraTo(p.camX0 - dx / cam.zoom, p.camY0 - dy / cam.zoom);

  // track the finger's speed for the fling
  const now = performance.now(), dt = (now - p.lastT) / 1000;
  if (dt > 0) {
    p.vx = lerp(p.vx, (e.clientX - p.lastX) / dt, 0.5);
    p.vy = lerp(p.vy, (e.clientY - p.lastY) / dt, 0.5);
  }
  p.lastX = e.clientX;
  p.lastY = e.clientY;
  p.lastT = now;
  setCursor('grabbing');
}

/**
 * @param {PanState} p
 * @param {PointerEvent} e
 */
function endPan(p, e) {
  if (!p.moved && e.type === 'pointerup') {
    plantAt(e.clientX, e.clientY);
  } else if (p.moved && performance.now() - p.lastT < 80) {
    cam.vx = p.vx; // fling
    cam.vy = p.vy;
  }
  pan = null;
  cam.held = false;
  setCursor('pointer');
}

/* ------------------------------------------------------------------- pinch */

function startPinch() {
  if (input.press) endPress(true);
  pan = null;
  cam.held = true;
  const [a, b] = [...pointers.values()];
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom0: cam.zoom, wx: toWorldX(mx), wy: toWorldY(my) };
}

/** @param {PinchState} p */
function movePinch(p) {
  const [a, b] = [...pointers.values()];
  const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  placeAt(p.wx, p.wy, (a.x + b.x) / 2, (a.y + b.y) / 2, (p.zoom0 * d) / p.d0);
}

function endPinch() {
  pinch = null;
  cam.held = false;
  // keep panning with the finger that's still down
  for (const [id, p] of pointers) {
    startPan(id, p.x, p.y, true);
    break;
  }
}

/* ------------------------------------------------------------------ events */

/**
 * @param {() => void} onPointerDown  called for every press (used to dismiss the hint)
 */
export function attachPointerInput(onPointerDown) {
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopCamera();
    onPointerDown();

    if (pointers.size >= 2) {
      startPinch();
      return;
    }
    const wx = toWorldX(e.clientX), wy = toWorldY(e.clientY);
    const f = flowerAt(wx, wy);
    if (f) pressFlower(f, e.pointerId, wx, wy);
    else startPan(e.pointerId, e.clientX, e.clientY, false);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      // plain mouse hover: show that flowers can be grabbed
      if (e.pointerType === 'mouse') setCursor(flowerAt(toWorldX(e.clientX), toWorldY(e.clientY)) ? 'grab' : 'pointer');
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinch) movePinch(pinch);
    else if (input.press?.id === e.pointerId) movePress(toWorldX(e.clientX), toWorldY(e.clientY));
    else if (pan?.id === e.pointerId) movePan(pan, e);
  });

  /** @param {PointerEvent} e */
  const onEnd = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pinch) {
      if (pointers.size < 2) endPinch();
    } else if (input.press?.id === e.pointerId) {
      endPress(e.type === 'pointercancel');
    } else if (pan?.id === e.pointerId) {
      endPan(pan, e);
    }
  };
  canvas.addEventListener('pointerup', onEnd);
  canvas.addEventListener('pointercancel', onEnd);
}
