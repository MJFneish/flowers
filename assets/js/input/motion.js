/**
 * Phone shake: sideways acceleration pushes every flower the other way, and a hard shake
 * knocks some pollen loose. iOS only shares motion data after a tap on the motion button.
 */

import { dom } from '../core/dom.js';
import { clamp, lerp, pick } from '../core/math.js';
import { clock, coarsePointer, flowers, view } from '../core/state.js';
import { inView } from '../render/camera.js';
import { spawnPollen, spawnSeeds } from '../world/particles.js';
import { flashHint } from '../ui/hint.js';

let enabled = false;
/** Latest sideways acceleration in screen terms (m/s²) and when it was read. */
let accelX = 0, readAt = -10;
/** Slow running average of gravity, for devices that only report it mixed in. */
let gravityX = 0, gravityY = 0;
let nextPuff = 0;

/** @param {DeviceMotionEvent} e */
function onMotion(e) {
  const a = e.acceleration, g = e.accelerationIncludingGravity;
  let ax = 0, ay = 0;
  if (a && a.x !== null && a.y !== null) {
    ax = a.x;
    ay = a.y;
  } else if (g && g.x !== null && g.y !== null) {
    gravityX = lerp(gravityX, g.x, 0.1);
    gravityY = lerp(gravityY, g.y, 0.1);
    ax = g.x - gravityX;
    ay = g.y - gravityY;
  } else {
    return;
  }
  // device axes → screen x, depending on how the phone is held
  const angle = screen.orientation?.angle ?? 0;
  accelX = angle === 90 ? -ay : angle === 270 ? ay : angle === 180 ? -ax : ax;
  readAt = clock.time;
}

function enable() {
  if (enabled) return;
  enabled = true;
  window.addEventListener('devicemotion', onMotion);
}

export function setupMotion() {
  const api = /** @type {{ requestPermission?: () => Promise<string> } | undefined} */ (
    /** @type {unknown} */ (window.DeviceMotionEvent)
  );
  if (!api) return;
  const ask = api.requestPermission;
  if (typeof ask !== 'function') {
    enable(); // Android & co: no permission needed
    return;
  }
  // iOS: show the button on touch devices; it asks for permission when tapped
  dom.motion.hidden = !coarsePointer;
  dom.motion.addEventListener('click', () => {
    ask.call(api)
      .then((state) => {
        if (state !== 'granted') return;
        enable();
        dom.motion.hidden = true;
        flashHint('Shake your phone to sway the flowers');
      })
      .catch(() => {
        dom.motion.hidden = true;
      });
  });
}

/** @param {number} dt */
export function applyPhoneShake(dt) {
  if (!enabled || clock.time - readAt > 0.15 || Math.abs(accelX) < 1.2) return;

  for (const f of flowers) {
    if (f.cutAt) continue;
    const k = clamp(f.h / (view.WH * 0.45), 0.5, 1.5); // taller flowers swing further
    f.velX = clamp(f.velX - accelX * 320 * k * dt, -900, 900);
  }

  // a hard shake knocks loose some pollen (and dandelion seeds)
  if (Math.abs(accelX) > 12 && clock.time > nextPuff) {
    nextPuff = clock.time + 0.3;
    const open = flowers.filter((f) => !f.cutAt && f.age > f.bloomStart + 1 && inView(f.cx, f.cy, 0));
    for (let i = 0; i < Math.min(3, open.length); i++) {
      const f = pick(open);
      if (f.kind === 'dandelion') spawnSeeds(f, 4);
      else spawnPollen(f.cx, f.cy, f.hue, f.R);
    }
  }
}
