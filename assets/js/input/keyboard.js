/** Keyboard: arrows pan, + / − zoom, 0 toggles the whole-garden view. */

import { animateZoom, cam, panBy, toggleOverview } from '../render/camera.js';

/** Screen px per second when panning with the arrow keys. */
const PAN_SPEED = 700;
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/** Arrow keys currently held down. */
const held = new Set();

export function attachKeyboard() {
  window.addEventListener('keydown', (e) => {
    // let Enter / Space press a focused button
    if (e.target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return;

    if (ARROWS.includes(e.key)) {
      held.add(e.key);
      e.preventDefault();
    } else if (e.key === '+' || e.key === '=') {
      animateZoom(cam.zoom * 1.4);
    } else if (e.key === '-' || e.key === '_') {
      animateZoom(cam.zoom / 1.4);
    } else if (e.key === '0') {
      toggleOverview();
    }
  });
  window.addEventListener('keyup', (e) => held.delete(e.key));
  window.addEventListener('blur', () => held.clear());
}

/** @param {number} dt */
export function updateKeyboard(dt) {
  const x = (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0);
  const y = (held.has('ArrowDown') ? 1 : 0) - (held.has('ArrowUp') ? 1 : 0);
  if (x || y) panBy(x * PAN_SPEED * dt, y * PAN_SPEED * dt);
}
