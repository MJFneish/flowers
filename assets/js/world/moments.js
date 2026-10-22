/** Rare and legendary bloom moments: bursts, the screen flash, camera shake and the banner. */

import { dom } from '../core/dom.js';
import { view } from '../core/state.js';
import { sparkHue } from '../flowers/hue.js';
import { shakeCamera, toScreenX, toScreenY } from '../render/camera.js';
import { spawnBurst } from './particles.js';

/** @import { Flower } from '../flowers/flower.js' */

/**
 * @param {'rare' | 'legendary'} rarity
 * @param {string} name
 */
function showBanner(rarity, name) {
  dom.bannerTag.textContent = rarity === 'legendary' ? '✦ Legendary bloom ✦' : '✧ Rare bloom ✧';
  dom.bannerName.textContent = name;
  dom.banner.className = `banner ${rarity}`;
  void dom.banner.offsetWidth; // restart the CSS animation
  dom.banner.classList.add('show');
}

/**
 * White flash centered on the flower.
 * @param {Flower} f
 */
function flashAt(f) {
  const el = dom.flash;
  el.style.setProperty('--fx', `${((toScreenX(f.cx) / view.W) * 100).toFixed(1)}%`);
  el.style.setProperty('--fy', `${((toScreenY(f.cy) / view.H) * 100).toFixed(1)}%`);
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

/** @param {Flower} f */
export function rareBloom(f) {
  spawnBurst(f.cx, f.cy, f.hue, f.R, 40);
  if (f.planted) showBanner('rare', f.sp.name);
}

/** @param {Flower} f */
export function legendaryBloom(f) {
  for (let k = 0; k < 3; k++) spawnBurst(f.cx, f.cy, sparkHue(f, k / 3), f.R * 1.5, 40);
  shakeCamera();
  flashAt(f);
  showBanner('legendary', f.sp.name);
}
