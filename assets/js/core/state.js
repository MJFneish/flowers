/**
 * Shared runtime state. Modules import these objects and read / write their fields.
 */

/** @import { Flower } from '../flowers/flower.js' */
/** @import { PressState } from './types.js' */

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

/**
 * Animation clock (seconds since the page loaded) and the current breeze (≈ -1 … 1).
 * The clock never runs backwards — a replay starts things over from "now" instead.
 */
export const clock = { time: 0, wind: 0 };

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
