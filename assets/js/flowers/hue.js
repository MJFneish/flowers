/** The hue a flower's sparks, orbiting comets and fountain use. */

/** @import { Flower } from './flower.js' */

/**
 * @param {Flower} f
 * @param {number} k  0 – 1: which spark (a steady fraction for comets, random for particles)
 * @returns {number}
 */
export const sparkHue = (f, k) => (f.sp.sparkHue ? f.sp.sparkHue(f, k) : f.hue + 10 + k * 30);
