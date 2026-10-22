/** Mouse wheel / trackpad: vertical scroll (or pinch) zooms at the cursor, sideways scroll pans. */

import { view } from '../core/state.js';
import { canvas } from '../render/canvas.js';
import { panBy, stopCamera, zoomAt } from '../render/camera.js';

export function attachWheel() {
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopCamera();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.H : 1; // lines / pages → px
    const dx = e.deltaX * scale, dy = e.deltaY * scale;
    if (e.ctrlKey || (!e.shiftKey && Math.abs(dy) >= Math.abs(dx))) {
      // ctrlKey is set for trackpad pinch gestures, which send much smaller deltas
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    } else {
      panBy(dx || dy, 0);
    }
  }, { passive: false });
}
