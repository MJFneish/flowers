/** The round buttons: replay, zoom in / out and whole-garden view. */

import { dom } from '../core/dom.js';
import { animateZoom, cam, toggleOverview } from '../render/camera.js';

/** Restart the replay icon's spin animation. */
function spinReplay() {
  dom.replay.classList.remove('spin');
  void dom.replay.offsetWidth;
  dom.replay.classList.add('spin');
}

/**
 * @param {{ onReplay: () => void }} actions
 */
export function attachControls({ onReplay }) {
  dom.zoomIn.addEventListener('click', () => animateZoom(cam.zoom * 1.5));
  dom.zoomOut.addEventListener('click', () => animateZoom(cam.zoom / 1.5));
  dom.zoomFit.addEventListener('click', toggleOverview);
  dom.replay.addEventListener('click', () => {
    onReplay();
    spinReplay();
  });
}
