/** Measures the screen and sizes the garden world from it. */

import { view } from '../core/state.js';

export function measureViewport() {
  view.DPR = Math.min(window.devicePixelRatio || 1, 2);
  view.W = window.innerWidth;
  view.H = window.innerHeight;
  // the garden is wider than the screen so there is something to pan to
  view.WW = Math.round(view.W * (view.W < 700 ? 2.4 : 2));
  view.WH = view.H;
  // flower sizes scale with this (a bit larger on tall, narrow phones)
  view.unit = Math.min(view.W * 1.25, view.H);
}
