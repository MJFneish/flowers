/** The hint line at the bottom: shown once after a while, gone after the first touch. */

import { dom } from '../core/dom.js';
import { coarsePointer, reduceMotion } from '../core/state.js';

const HOW_TO = coarsePointer
  ? 'Tap to plant · Drag to explore · Pinch to zoom'
  : 'Click to plant · Drag to explore · Scroll to zoom';

let timer = 0;
let dismissed = false;

/** Show the how-to hint after a few seconds, unless the user has already touched the garden. */
export function initHint() {
  dom.hint.textContent = HOW_TO;
  timer = setTimeout(() => {
    if (!dismissed) dom.hint.classList.add('show');
  }, reduceMotion ? 1500 : 6500);
}

/** Hide the how-to hint for good. */
export function dismissHint() {
  if (dismissed) return;
  dismissed = true;
  clearTimeout(timer);
  dom.hint.classList.remove('show');
}

/**
 * Briefly show a one-off message in the hint spot.
 * @param {string} text
 */
export function flashHint(text) {
  clearTimeout(timer);
  dom.hint.textContent = text;
  dom.hint.classList.add('show');
  timer = setTimeout(() => dom.hint.classList.remove('show'), 3500);
}
