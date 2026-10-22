/** Math, easing and curve helpers shared by every module. */

export const TAU = Math.PI * 2;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** @type {(a: number, b: number) => number} */
export const rand = (a, b) => a + Math.random() * (b - a);

/** @type {(a: number, b: number) => number} */
export const randInt = (a, b) => Math.floor(rand(a, b + 1));

/**
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** @type {(a: number, b: number, t: number) => number} */
export const lerp = (a, b, t) => a + (b - a) * t;

/** @type {(v: number, a?: number, b?: number) => number} */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * 0 → 1 as `t` goes from `start` to `start + dur`.
 * @type {(t: number, start: number, dur: number) => number}
 */
export const progress = (t, start, dur) => clamp((t - start) / dur);

/** @type {(t: number) => number} */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** @type {(t: number) => number} */
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Ease out with a small overshoot.
 * @type {(t: number) => number}
 */
export const easeOutBack = (t) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Cubic bezier value on one axis.
 * @type {(a: number, b: number, c: number, d: number, t: number) => number}
 */
export const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/**
 * Cubic bezier derivative on one axis.
 * @type {(a: number, b: number, c: number, d: number, t: number) => number}
 */
export const bezD = (a, b, c, d, t) => {
  const u = 1 - t;
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
};

/**
 * Layered sines: a gentle, non-repeating breeze in roughly [-1, 1].
 * @type {(t: number) => number}
 */
export const wind = (t) =>
  Math.sin(t * 0.55) * 0.5 + Math.sin(t * 1.35 + 1.3) * 0.2 + Math.sin(t * 0.21 + 0.7) * 0.3;
