/** Leaf layouts shared by several species. */

/** @import { LeafStyle } from '../../core/types.js' */

/** @type {LeafStyle} */
export const DEFAULT_LEAF = { min: 2, max: 4, tMin: 0.15, tMax: 0.68, lenMul: 1, wMul: 1, angMin: 0.55, angMax: 1.0 };

/**
 * Fewer, broader leaves held out wide.
 * @type {LeafStyle}
 */
export const ROSE_LEAF = { min: 2, max: 3, tMin: 0.2, tMax: 0.65, lenMul: 0.85, wMul: 1.15, angMin: 0.7, angMax: 1.1 };
