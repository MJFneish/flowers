/** A few bees: they fly in to open flowers, hover, hop to another flower, then leave. */

import { TAU, clamp, lerp, pick, rand } from '../core/math.js';
import { START_TIME, clock, flowers, reduceMotion, view } from '../core/state.js';
import { ctx } from '../render/canvas.js';
import { inView } from '../render/camera.js';

/** @import { Flower } from '../flowers/flower.js' */
/** @import { BeeDef } from '../core/types.js' */

/** @type {BeeDef[]} */
let bees = [];
let visitors = 0;
/** When a bee may next show up on its own if the garden is quiet. */
let nextVisitAt = START_TIME + 15;

const maxBees = () => (view.W < 700 ? 2 : 3);

export function resetBees() {
  bees = [];
  visitors = 0;
  nextVisitAt = clock.time + 15;
}

/**
 * A random open flower (not picked, not fading), preferring ones on screen.
 * @param {Flower | null} exclude
 * @returns {Flower | null}
 */
function pickBloomed(exclude) {
  const open = flowers.filter((f) => f !== exclude && !f.cutAt && !f.dying && f.age > f.bloomStart + 1.5);
  const seen = open.filter((f) => inView(f.cx, f.cy, 0));
  if (seen.length) return pick(seen);
  return open.length ? pick(open) : null;
}

/** @param {Flower} target */
function spawnBee(target) {
  visitors++;
  const fromLeft = Math.random() < 0.5;
  bees.push({
    x: fromLeft ? view.left - 30 : view.right + 30,
    y: clamp(rand(lerp(view.top, view.bottom, 0.15), lerp(view.top, view.bottom, 0.5)), 0, view.WH),
    vx: 0, vy: 0,
    target, mode: 'arrive', until: 0, phase: rand(0, TAU),
    face: fromLeft ? 1 : -1, size: clamp(view.unit * 0.011, 4.5, 8) * rand(0.9, 1.1),
    exitX: 0, exitY: 0,
  });
}

/**
 * Called when a flower opens: the first bloom always gets a visitor, later ones sometimes.
 * @param {Flower} f
 */
export function maybeSpawnBee(f) {
  if (bees.length >= maxBees()) return;
  if (visitors > 0 && Math.random() > 0.35) return;
  spawnBee(f);
}

/** @param {BeeDef} b */
function sendAway(b) {
  b.mode = 'leave';
  b.target = null;
  b.exitX = b.x < (view.left + view.right) / 2 ? view.left - 150 : view.right + 150;
  b.exitY = rand(view.top - 60, lerp(view.top, view.bottom, 0.3));
}

/** @param {BeeDef} b */
function drawBee(b) {
  const c = ctx, s = b.size;
  const flap = Math.sin(clock.time * 62 + b.phase);
  c.save();
  c.translate(b.x, b.y);

  // soft glow so the bee reads against the night sky
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 3.2);
  g.addColorStop(0, 'hsla(45, 100%, 60%, 0.28)');
  g.addColorStop(1, 'hsla(45, 100%, 50%, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, s * 3.2, 0, TAU);
  c.fill();
  c.globalCompositeOperation = 'source-over';

  c.scale(b.face, 1);
  c.rotate(clamp(b.vy * 0.004 * b.face, -0.5, 0.5));

  // striped body
  c.beginPath();
  c.ellipse(0, 0, s * 1.15, s * 0.78, 0, 0, TAU);
  const bg = c.createLinearGradient(0, -s, 0, s);
  bg.addColorStop(0, '#ffe066');
  bg.addColorStop(1, '#e09000');
  c.fillStyle = bg;
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = '#2b1a06';
  c.fillRect(-s * 0.55, -s, s * 0.28, s * 2);
  c.fillRect(-s * 0.05, -s, s * 0.28, s * 2);
  c.fillRect(-s * 1.2, -s, s * 0.22, s * 2);
  c.restore();

  // stinger, head, eye
  c.fillStyle = '#2b1a06';
  c.beginPath();
  c.moveTo(-s * 1.1, -s * 0.12);
  c.lineTo(-s * 1.5, 0);
  c.lineTo(-s * 1.1, s * 0.12);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(s * 1.1, -s * 0.05, s * 0.5, 0, TAU);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(s * 1.28, -s * 0.18, s * 0.13, 0, TAU);
  c.fill();

  // antennae
  c.strokeStyle = '#3a2508';
  c.lineWidth = Math.max(0.8, s * 0.12);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(s * 1.2, -s * 0.45);
  c.quadraticCurveTo(s * 1.4, -s * 1.0, s * 1.75, -s * 1.05);
  c.moveTo(s * 1.05, -s * 0.5);
  c.quadraticCurveTo(s * 1.1, -s * 1.05, s * 1.4, -s * 1.2);
  c.stroke();

  // wings, flapping fast
  c.fillStyle = 'rgba(225, 240, 255, 0.55)';
  c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  c.lineWidth = 0.8;
  for (const [wx, rot] of [[-s * 0.15, -0.5], [s * 0.25, -0.25]]) {
    c.save();
    c.translate(wx, -s * 0.55);
    c.rotate(rot + flap * 0.45);
    c.scale(1, 0.55 + 0.45 * Math.abs(flap));
    c.beginPath();
    c.ellipse(0, -s * 0.6, s * 0.45, s * 0.75, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.restore();
  }
  c.restore();
}

/**
 * Steer, then draw. Call in world space.
 * @param {number} dt
 */
export function updateBees(dt) {
  const time = clock.time;

  // keep a little life in the garden: an occasional visitor when it's quiet
  if (!reduceMotion && !bees.length && time > nextVisitAt) {
    nextVisitAt = time + rand(14, 22);
    const f = pickBloomed(null);
    if (f) spawnBee(f);
  }

  for (let i = bees.length - 1; i >= 0; i--) {
    const b = bees[i];

    // our flower was picked or removed: find another, or head home
    const cur = b.target;
    if (b.mode !== 'leave' && (!cur || cur.cutAt || cur.dying || !flowers.includes(cur))) {
      const next = pickBloomed(cur);
      if (next) {
        b.target = next;
        b.mode = 'arrive';
      } else {
        sendAway(b);
      }
    }

    // fly towards a point circling just above the flower's center
    let tx = b.exitX, ty = b.exitY;
    const t = b.target;
    if (b.mode !== 'leave' && t) {
      const orbit = time * 1.3 + b.phase;
      tx = t.cx + Math.cos(orbit) * t.R * 0.55;
      ty = t.cy - t.R * 0.35 + Math.sin(orbit * 1.7) * t.R * 0.25;
    }
    const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy) || 1;
    const maxSpeed = (b.mode === 'hover' ? 70 : 150) * (view.unit / 800 + 0.35);
    const speed = Math.min(maxSpeed, dist * 2.2);
    const k = Math.min(1, dt * 2.5);
    b.vx += ((dx / dist) * speed - b.vx) * k;
    b.vy += ((dy / dist) * speed - b.vy) * k;
    b.x += b.vx * dt;
    b.y += (b.vy + Math.sin(time * 9 + b.phase) * 18) * dt; // buzzy bobbing
    if (Math.abs(b.vx) > 12) b.face = b.vx > 0 ? 1 : -1;

    if (b.mode === 'arrive' && dist < 24) {
      b.mode = 'hover';
      b.until = time + rand(2.5, 5);
    } else if (b.mode === 'hover' && time > b.until) {
      const next = Math.random() < 0.6 ? pickBloomed(b.target) : null;
      if (next) {
        b.target = next;
        b.mode = 'arrive';
      } else {
        sendAway(b);
      }
    } else if (b.mode === 'leave' && dist < 40) {
      bees[i] = bees[bees.length - 1];
      bees.pop();
      continue;
    }
    if (inView(b.x, b.y, 40)) drawBee(b);
  }
}
