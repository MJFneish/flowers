/**
 * Shared runtime state. Modules import these objects and read / write their fields.
 */

/** @import { Flower } from '../flowers/flower.js' */
/** @import { PressState } from './types.js' */

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

/** With reduced motion the clock starts late, so the garden is already grown. */
export const START_TIME = reduceMotion ? 30 : 0;

/** Animation clock (seconds) and the current breeze (≈ -1 … 1). */
export const clock = { time: START_TIME, wind: 0 };

/**
 * Sizes in CSS px: the screen (W × H), the garden world (WW × WH, wider than the screen),
 * the flower sizing unit, and the part of the world currently on screen.
 */
export const view = { W: 0, H: 0, DPR: 1, WW: 0, WH: 0, unit: 1, left: 0, right: 0, top: 0, bottom: 0 };

/**
 * Every flower in the garden, sorted back to front.
 * @type {Flower[]}
 */
export const flowers = [];

/** Pointer state that other systems need to read. */
export const input = {
  /** The flower being pressed, dragged or carried, if any. */
  press: /** @type {PressState | null} */ (null),
};
