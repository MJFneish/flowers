/**
 * Glowing Flowers — entry point. Wires the systems together and runs the frame loop.
 *
 *   core/     shared helpers, state, types, page elements
 *   render/   canvas, viewport, camera, reusable shapes
 *   flowers/  the Flower, how it's drawn, and one file per species
 *   world/    garden, background, particles, scent, bees, bloom moments
 *   input/    pointer, flower press, wheel, keyboard, phone shake
 *   ui/       hint and buttons
 */

import { clock, input } from './core/state.js';
import { wind } from './core/math.js';
import { clearScreen, copyGlow, initGlow, resizeCanvases, screenSpace } from './render/canvas.js';
import { measureViewport } from './render/viewport.js';
import { focusOf, refocus, updateCamera, worldSpace } from './render/camera.js';
import { drawBackGrass, drawFrontGrass, drawStars, makeStars, regrowGrass, resizeBackground } from './world/background.js';
import { createScene, drawGarden, drawPickedFlowers, updateGarden } from './world/garden.js';
import { clearParticles, seedEmbers, updateEmbers, updateWorldParticles } from './world/particles.js';
import { clearScents, updateScents } from './world/scent.js';
import { clearTexts, updateTexts } from './world/texts.js';
import { resetBees, updateBees } from './world/bees.js';
import { updatePress } from './input/press.js';
import { attachPointerInput } from './input/pointer.js';
import { attachWheel } from './input/wheel.js';
import { attachKeyboard, updateKeyboard } from './input/keyboard.js';
import { applyPhoneShake, setupMotion } from './input/motion.js';
import { dismissHint, initHint } from './ui/hint.js';
import { attachControls } from './ui/controls.js';

/** Re-measure everything, keeping the same part of the garden in view. */
function resize() {
  const focus = focusOf();
  measureViewport();
  resizeCanvases();
  resizeBackground();
  refocus(focus);
}

/**
 * Start the garden over from seed. The clock keeps running — rewinding it made anything
 * timed against it (like the legendary camera shake) misbehave.
 */
function replay() {
  input.press = null;
  regrowGrass();
  clearParticles();
  clearScents();
  clearTexts();
  resetBees();
  seedEmbers();
  createScene();
}

let last = performance.now();

/** @param {number} now */
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  clock.time += dt;
  clock.wind = wind(clock.time);

  updateKeyboard(dt);
  updateCamera(dt);

  // sky (screen space)
  clearScreen();
  drawStars();

  // garden (world space), back to front
  worldSpace();
  drawBackGrass();
  updatePress();
  applyPhoneShake(dt);
  updateGarden(dt);
  drawGarden();
  drawFrontGrass();
  updateBees(dt);
  drawPickedFlowers();
  updateScents(dt);
  updateWorldParticles(dt);
  updateTexts(dt);

  // embers drift over everything (screen space)
  screenSpace();
  updateEmbers(dt);

  copyGlow();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------- boot */

initGlow();
resize();
regrowGrass();
makeStars();
seedEmbers();
createScene();
initHint();

attachPointerInput(dismissHint);
attachWheel();
attachKeyboard();
attachControls({ onReplay: replay });
setupMotion();
window.addEventListener('resize', resize);

requestAnimationFrame((now) => {
  last = now;
  frame(now);
});
